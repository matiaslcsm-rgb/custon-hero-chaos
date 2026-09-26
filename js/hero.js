// Entidad del héroe del jugador: stats derivados de atributos, regeneración y daño recibido.

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
        this.archetypePassive = template.archetypePassive || null;
        this.creepKillCount = 0; this.heroKillCount = 0;
        this.bonusArmor = 0; this.bonusAtk = 0; this.bonusCritChance = 0; this.bonusLifesteal = 0;
        this.x = 3; this.y = 6; this.gold = 100; this.lives = 2;
        this.skills = []; this.cooldowns = {}; this.attackTimer = 0;
        // Ventanas temporales ("Until") de las distintas habilidades activas y definitivas.
        // Se consultan en el punto de uso (ataque, movimiento, daño recibido) en vez de recalcularse en recalculateStats().
        this.dmgReductionUntil = 0; this.dmgReductionPct = 0.3; this.tauntActiveUntil = 0;
        this.invulnerableUntil = 0;
        this.atkSpeedBuffUntil = 0; this.visionUntil = 0; this.darkBloodUntil = 0;
        this.furiaUntil = 0; this.furiaBonusAtk = 0;
        this.masacreUntil = 0; this.lethalSpeedUntil = 0; this.lethalSpeedComboUntil = 0;
        this.comboTarget = null; this.comboStacks = 0;
        this.immortalUntil = 0; this.immortalAccumulatedDmg = 0;
        this.recalculateStats(); this.hp = this.maxHp; this.mana = this.maxMana;
    }
    hasSkill(id) { return this.skills.some(s => s.id === id); }
    hasArchetypePassive(id) { return !!this.archetypePassive && this.archetypePassive.id === id; }
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
    addSkill(skill) { this.skills.push(skill); if (skill.cooldown) this.cooldowns[skill.id] = 0; this.recalculateStats(); }
    regenTick(dt) {
        this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
        this.mana = Math.min(this.maxMana, this.mana + this.manaRegen * dt);
    }
    // type: 'physical' | 'magical' | 'pure' (el daño puro ignora armadura y resistencia mágica).
    // Devuelve { dealt, evaded } para que el llamador sepa si hubo esquive.
    takeDamage(amt, type) {
        if (this.invulnerableUntil > gameClock) return { dealt: 0, evaded: false };
        if (Math.random() < (this.evasion || 0) / 100) return { dealt: 0, evaded: true };
        let final = amt;
        let reductionPct = 0;
        if (this.dmgReductionUntil > gameClock) reductionPct = Math.max(reductionPct, this.dmgReductionPct);
        if (this.furiaUntil > gameClock) reductionPct = Math.max(reductionPct, 0.20);
        final *= (1 - reductionPct);
        if (type === 'magical') final *= Math.max(0.25, 1 - (this.magicResist || 0) / 100);
        else if (type === 'physical') final *= Math.max(0.2, 1 - (this.armor || 0) * 0.04);
        // type === 'pure': sin mitigación.
        final = Math.round(final);
        if (this.immortalUntil > gameClock) {
            this.immortalAccumulatedDmg += final;
            this.hp = Math.max(1, this.hp - final);
        } else {
            this.hp = Math.max(0, this.hp - final);
        }
        return { dealt: final, evaded: false };
    }
    isAlive() { return this.hp > 0; }
}
