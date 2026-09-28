// Entidad de un héroe (el jugador y, en el futuro, los rivales): stats derivados de atributos, regeneración y daño recibido.

// Qué da cada punto de atributo (estilo Dota 2). Documentado en DISEÑO.md §2.
const ATTRIBUTE_RULES = {
    str: { hp: 5, hpRegen: 0.05 },
    agi: { atkSpeedPct: 0.01, moveSpeedPct: 0.01, moveSpeedCap: 40, critChance: 0.1, armor: 0.08 },
    int: { mana: 4, manaRegen: 0.05, spellAmp: 0.1, magicResist: 0.1 },
    primaryAtk: 0.8,     // daño de ataque por punto del atributo principal
    mageSpellAmp: 100    // los héroes de Inteligencia (magos) tienen +100% de amplificación de hechizo
};

// Teclas de habilidades activas, asignadas por orden de aprendizaje.
const SKILL_KEYS = ['e', 'r', 't', 'f'];

class Hero {
    constructor(template) {
        this.isHero = true;
        this.key = template.key; this.name = template.name; this.symbol = template.symbol; this.primaryAttr = template.primaryAttr;
        // Atributos con decimales (crecen por nivel); en pantalla se muestran redondeados hacia abajo.
        const attrs = template.attributes;
        this.str = attrs.str[0]; this.agi = attrs.agi[0]; this.int = attrs.int[0];
        this.attrGain = { str: attrs.str[1], agi: attrs.agi[1], int: attrs.int[1] };
        this.baseHp = template.baseHp; this.baseAtk = template.baseAtk; this.baseAtkSpeed = template.baseAtkSpeed;
        this.baseAttackRange = template.baseAttackRange; this.baseArmor = template.baseArmor || 0;
        this.baseMagicResist = template.baseMagicResist || 0; this.baseHpRegen = template.baseHpRegen || 0;
        this.baseMaxMana = template.baseMaxMana || 0; this.baseManaRegen = template.baseManaRegen || 0;
        this.baseMoveSpeed = template.baseMoveSpeed || 3; this.baseProjectileSpeed = template.baseProjectileSpeed || 0;
        this.baseCritChance = template.baseCritChance || 0; this.baseEvasion = template.baseEvasion || 0;
        this.baseSpellAmp = template.baseSpellAmp || 0; this.baseLifesteal = template.baseLifesteal || 0;
        this.scaling = template.scaling || null;
        this.innate = template.innate || null;
        this.creepKillCount = 0; this.heroKillCount = 0;
        // Bonus permanentes acumulados (escalado del héroe y de las definitivas), ver grantPermanent().
        this.bonus = { armor: 0, atk: 0, critChance: 0, lifesteal: 0, maxHp: 0, atkSpeed: 0 };
        this.level = 1; this.xp = 0; this.skillPoints = 1;
        this.skillLevels = {}; // id de habilidad -> nivel (0 = drafteada pero sin aprender)
        this.talentBooks = 0; // libros de talento comprados (suben el precio del siguiente)
        this.destiny = { fragments: 0, books: 0 }; // Fragmentos y Libros del Destino sin usar
        this.inventory = []; // ítems equipados: { key, level, spent } (ver items.js)
        this.x = 3; this.y = 6; this.gold = 100; this.lives = 2;
        this.respawnAt = 0;       // > 0 mientras está muerto esperando revivir (ver death.js)
        this.inRest = false;      // en el Área de Descanso entre combates (ver game.js)
        this.arena = null;        // arena donde pelea ahora (ver world.js)
        this.isAI = false; this.displayName = template.name;
        this.points = 0;          // puntos del ranking (ver world.js)
        this.duelWins = 0; this.duelLosses = 0;
        this.neutral = null;      // objeto neutral equipado (key de NEUTRAL_ITEMS), ver bosses.js
        this.neutralOffer = null; // neutrales para elegir después de un jefe de ronda
        this.eliminated = false; this.diedThisRound = false;
        this.condemnPct = 0;      // % de daño recibido extra acumulado como Condenado (se guarda aunque compre una vida)
        this.greedPurchases = 0;  // compras de Injusticia de los Codiciosos (cada una cuesta el doble)
        this.skills = []; this.cooldowns = {}; this.keyBindings = {}; this.attackTimer = 0;
        this.effects = []; // efectos temporales activos (mejoras/perjuicios), ver effects.js
        this.recalculateStats(); this.hp = this.maxHp; this.mana = this.maxMana;
    }
    hasSkill(id) { return this.skills.some(s => s.id === id); }
    // Atributo total: el propio (base, niveles, Ascensos) + el de los ítems (efectos con mods str/agi/int).
    attr(name) { return this[name] + sumMod(this, name); }
    recalculateStats() {
        const R = ATTRIBUTE_RULES;
        const str = this.attr('str'), agi = this.attr('agi'), int = this.attr('int');
        const primaryVal = this.primaryAttr === 'STR' ? str : this.primaryAttr === 'AGI' ? agi : int;
        this.maxHp = Math.round(this.baseHp + str * R.str.hp + this.bonus.maxHp + sumMod(this, 'maxHp'));
        this.maxMana = Math.round(this.baseMaxMana + int * R.int.mana + sumMod(this, 'maxMana'));
        this.atk = Math.round(this.baseAtk + primaryVal * R.primaryAtk + this.bonus.atk);
        this.atkSpeed = this.baseAtkSpeed * (1 + agi * R.agi.atkSpeedPct + this.bonus.atkSpeed / 100);
        this.moveSpeed = this.baseMoveSpeed * (1 + Math.min(agi, R.agi.moveSpeedCap) * R.agi.moveSpeedPct);
        this.moveInterval = Math.max(0.05, 1 / this.moveSpeed);
        this.attackRange = this.baseAttackRange;
        this.armor = this.baseArmor + agi * R.agi.armor + this.bonus.armor;
        this.magicResist = this.baseMagicResist + int * R.int.magicResist;
        this.hpRegen = this.baseHpRegen + str * R.str.hpRegen + sumMod(this, 'hpRegen');
        this.manaRegen = this.baseManaRegen + int * R.int.manaRegen + sumMod(this, 'manaRegen');
        this.projectileSpeed = this.baseProjectileSpeed;
        this.critChance = this.baseCritChance + agi * R.agi.critChance + this.bonus.critChance;
        this.evasion = this.baseEvasion;
        this.spellAmp = this.baseSpellAmp + int * R.int.spellAmp + (this.primaryAttr === 'INT' ? R.mageSpellAmp : 0);
        this.lifesteal = this.baseLifesteal + this.bonus.lifesteal;
        this.hp = Math.min(this.hp, this.maxHp); this.mana = Math.min(this.mana, this.maxMana); // si bajó el máximo (ej: vender un ítem)
    }
    // Al subir de nivel: suma la ganancia de atributos del héroe (más en el principal).
    gainLevelAttributes() {
        this.str += this.attrGain.str; this.agi += this.attrGain.agi; this.int += this.attrGain.int;
        this.recalculateStats();
    }
    // Una habilidad drafteada llega en nivel 0: hay que invertir un punto para poder usarla.
    addSkill(skill) {
        this.skills.push(skill);
        this.skillLevels[skill.id] = 0;
        if (skill.kind === 'active') this.cooldowns[skill.id] = 0;
        if (skill.kind !== 'passive') {
            const used = Object.values(this.keyBindings);
            const key = SKILL_KEYS.find(k => !used.includes(k));
            if (key) this.keyBindings[skill.id] = key;
        }
        this.recalculateStats();
    }
    // Quita una habilidad del kit (Fragmento/Libro del Destino) y devuelve los puntos invertidos en ella.
    // Su tecla queda libre para la próxima habilidad que se aprenda.
    removeSkill(skill) {
        const refund = this.skillLevels[skill.id] || 0;
        this.skills = this.skills.filter(s => s !== skill);
        delete this.skillLevels[skill.id]; delete this.keyBindings[skill.id]; delete this.cooldowns[skill.id];
        this.skillPoints += refund;
        return refund;
    }
    skillForKey(k) { return (k && this.skills.find(s => this.keyBindings[s.id] === k)) || null; }
    regenTick(dt) {
        this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
        this.mana = Math.min(this.maxMana, this.mana + this.manaRegen * dt);
    }
    isAlive() { return this.hp > 0; }
}
