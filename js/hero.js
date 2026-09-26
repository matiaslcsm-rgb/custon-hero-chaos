// Entidad de un héroe (el jugador y, en el futuro, los rivales): stats derivados de atributos, regeneración y daño recibido.

// Teclas de habilidades activas, asignadas por orden de aprendizaje.
const SKILL_KEYS = ['e', 'r', 't', 'f'];

class Hero {
    constructor(template) {
        this.key = template.key; this.name = template.name; this.symbol = template.symbol; this.primaryAttr = template.primaryAttr;
        this.str = 20; this.agi = 15; this.int = 15;
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
        this.bonusArmor = 0; this.bonusAtk = 0; this.bonusCritChance = 0; this.bonusLifesteal = 0;
        this.x = 3; this.y = 6; this.gold = 100; this.lives = 2;
        this.skills = []; this.cooldowns = {}; this.keyBindings = {}; this.attackTimer = 0;
        this.effects = []; // efectos temporales activos (mejoras/perjuicios), ver effects.js
        this.recalculateStats(); this.hp = this.maxHp; this.mana = this.maxMana;
    }
    hasSkill(id) { return this.skills.some(s => s.id === id); }
    recalculateStats() {
        const primaryVal = this.primaryAttr === 'STR' ? this.str : this.primaryAttr === 'AGI' ? this.agi : this.int;
        this.maxHp = Math.round(this.baseHp + (this.str * 5));
        this.maxMana = Math.round(this.baseMaxMana + (this.int * 4));
        this.atk = Math.round(this.baseAtk + (primaryVal * 0.8)) + Math.round(this.bonusAtk || 0);
        this.atkSpeed = this.baseAtkSpeed * (1 + (this.agi * 0.01));
        this.moveSpeed = this.baseMoveSpeed * (1 + Math.min(this.agi, 40) * 0.01);
        this.moveInterval = Math.max(0.05, 1 / this.moveSpeed);
        this.attackRange = this.baseAttackRange;
        this.armor = (this.baseArmor || 0) + (this.bonusArmor || 0);
        this.magicResist = this.baseMagicResist;
        this.hpRegen = this.baseHpRegen + this.str * 0.05;
        this.manaRegen = this.baseManaRegen + this.int * 0.05;
        this.projectileSpeed = this.baseProjectileSpeed;
        this.critChance = this.baseCritChance + this.agi * 0.1 + (this.bonusCritChance || 0);
        this.evasion = this.baseEvasion;
        this.spellAmp = this.baseSpellAmp + this.int * 0.1;
        this.lifesteal = (this.baseLifesteal || 0) + (this.bonusLifesteal || 0);
    }
    // Las activas toman la primera tecla libre de SKILL_KEYS (por orden de aprendizaje); las pasivas no usan tecla.
    addSkill(skill) {
        this.skills.push(skill);
        if (skill.cooldown) this.cooldowns[skill.id] = 0;
        if (skill.kind !== 'passive') {
            const used = Object.values(this.keyBindings);
            const key = SKILL_KEYS.find(k => !used.includes(k));
            if (key) this.keyBindings[skill.id] = key;
        }
        this.recalculateStats();
    }
    skillForKey(k) { return this.skills.find(s => this.keyBindings[s.id] === k) || null; }
    regenTick(dt) {
        this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
        this.mana = Math.min(this.maxMana, this.mana + this.manaRegen * dt);
    }
    // type: 'physical' | 'magical' | 'pure' (el daño puro ignora armadura y resistencia mágica).
    // source: quién hizo el daño (para Contraataque y otros efectos que responden al atacante).
    // Devuelve { dealt, evaded } para que el llamador sepa si hubo esquive.
    takeDamage(amt, type, source) {
        if (hasFlag(this, 'invulnerable')) return { dealt: 0, evaded: false };
        if (Math.random() < (this.evasion || 0) / 100) return { dealt: 0, evaded: true };
        let final = amt * (1 - effDmgReduction(this));
        if (type === 'magical') final *= Math.max(0.25, 1 - (this.magicResist || 0) / 100);
        else if (type === 'physical') final *= Math.max(0.2, 1 - (this.armor || 0) * 0.04);
        // type === 'pure': sin mitigación.
        final = Math.round(final);
        const floor = hasFlag(this, 'preventDeath') ? 1 : 0;
        this.hp = Math.max(floor, this.hp - final);
        emit(this, 'onDamaged', { source, dealt: final, type });
        return { dealt: final, evaded: false };
    }
    isAlive() { return this.hp > 0; }
}
