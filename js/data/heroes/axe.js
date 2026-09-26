// Axe (Fuerza) — tanque de contraataque
registerHero({
    key: 'AXE', name: 'Axe', symbol: '@', primaryAttr: 'STR', role: 'Tanque de contraataque',
    attributes: { str: [24, 2.8], agi: [12, 1.6], int: [14, 1.6] },
    baseHp: 100, baseAtk: 13, baseAtkSpeed: 0.9, baseAttackRange: 1.5,
    baseArmor: 2, baseMagicResist: 15, baseHpRegen: 1.5,
    baseMaxMana: 100, baseManaRegen: 1.2, baseMoveSpeed: 2.8, baseProjectileSpeed: 0,
    baseCritChance: 5, baseEvasion: 4, baseSpellAmp: 0, baseLifesteal: 0,
    description: 'Fuerza: tanque de primera línea. Provoca enemigos y castiga a quien lo golpea. Escala armadura.',
    scaling: { stat: 'armor', perKills: 10, perKillsAmount: 0.5, perHeroKill: 1.5 },
    innate: {
        id: 'COUNTERATTACK', name: 'Contraataque', chance: 20, tauntBonusChance: 20,
        tags: ['FÍSICO', 'AL_RECIBIR_DAÑO'],
        description: 'Innato: 20% de probabilidad de responder automáticamente con un golpe físico (100% de tu daño) contra quien te golpeó. +20% de probabilidad mientras estás provocando enemigos.',
        hooks: {
            onDamaged(owner, { source, dealt }, innate) {
                if (dealt <= 0 || !source || !source.isAlive()) return;
                let chance = innate.chance / 100;
                if (hasFlag(owner, 'taunt')) chance += innate.tauntBonusChance / 100;
                if (Math.random() >= chance) return;
                dealDamage(owner, source, owner.atk, 'physical');
                log(`🪓 ¡Contraataque! Golpeaste de vuelta a ${source.label}.`);
            }
        }
    }
}, {
    AXE_HACHAZO: {
        id: 'AXE_HACHAZO', name: 'Golpe de Hacha', kind: 'active',
        tags: ['FÍSICO', 'CONTROL'],
        values: { cooldown: [6, 5.5, 5, 4.5], manaCost: [30, 30, 35, 35], dmgMult: [1.0, 1.2, 1.4, 1.6], stunChance: [0.2, 0.25, 0.3, 0.35], stunDuration: 1 },
        description: 'Golpe frontal: {dmgMult%} de tu daño físico al enemigo más cercano. {stunChance%} de probabilidad de aturdirlo {stunDuration}s.',
        cast(caster) {
            const target = nearestEnemy(caster, caster.attackRange + 0.5);
            if (!target) { log('Golpe de Hacha: sin objetivo en rango.'); return false; }
            const dmg = Math.round(caster.atk * val(this, caster, 'dmgMult'));
            const { dealt } = dealDamage(caster, target, dmg, 'physical');
            if (target.isAlive() && Math.random() < val(this, caster, 'stunChance')) {
                addEffect(target, { id: 'STUN', name: 'Aturdido', duration: val(this, caster, 'stunDuration'), flags: ['stun'] });
            }
            log(`🪓 ¡Golpe de Hacha a ${target.label}! (-${dealt} HP)`);
            return true;
        }
    },
    AXE_PROVOCACION: {
        id: 'AXE_PROVOCACION', name: 'Llamado Provocador', kind: 'active',
        tags: ['CONTROL', 'MEJORA'],
        values: { cooldown: [15, 14, 13, 12], manaCost: 45, duration: [2, 2.5, 3, 3.5], dmgReduction: [0.2, 0.25, 0.3, 0.35], radius: 5 },
        description: 'Provoca a los enemigos en radio {radius} por {duration}s y te da {dmgReduction%} de reducción de daño mientras dura.',
        cast(caster) {
            addEffect(caster, {
                id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: this.tags,
                mods: { dmgReduction: val(this, caster, 'dmgReduction') }, flags: ['taunt']
            });
            const radius = val(this, caster, 'radius');
            const count = enemiesOf(caster).filter(c => c.isAlive() && Math.hypot(c.x - caster.x, c.y - caster.y) <= radius).length;
            log(`🛡️ ¡Llamado Provocador! ${count} enemigos provocados.`);
            return true;
        }
    },
    AXE_GIRO: {
        id: 'AXE_GIRO', name: 'Giro de Combate', kind: 'active',
        tags: ['FÍSICO', 'ÁREA'],
        values: { cooldown: [11, 10, 9, 8], manaCost: 40, dmgMult: [0.5, 0.7, 0.9, 1.1], radius: 2 },
        description: 'Gira con su arma: {dmgMult%} de tu daño físico a todos los enemigos en radio {radius}.',
        cast(caster) {
            const dmg = Math.round(caster.atk * val(this, caster, 'dmgMult'));
            const radius = val(this, caster, 'radius');
            let hits = 0;
            enemiesOf(caster).forEach(c => {
                if (c.isAlive() && Math.hypot(c.x - caster.x, c.y - caster.y) <= radius) { dealDamage(caster, c, dmg, 'physical'); hits++; }
            });
            log(`🌀 ¡Giro de Combate! Golpeaste a ${hits} enemigo(s) por ${dmg} c/u.`);
            return true;
        }
    },
    AXE_FURIA: {
        id: 'AXE_FURIA', name: 'Furia del Guerrero', kind: 'active', isUltimate: true,
        tags: ['MEJORA', 'AL_RECIBIR_DAÑO', 'AL_MATAR'],
        values: { cooldown: [50, 45, 40], manaCost: [80, 100, 120], duration: [6, 8, 10], atkPct: [0.3, 0.4, 0.5], atkSpeedPct: 0.3, dmgReduction: 0.2, stackAtk: 2, stackCap: [20, 30, 40], armorPerKill: [0.5, 0.75, 1] },
        description: 'DEFINITIVA. {duration}s: +{atkPct%} daño físico, +{atkSpeedPct%} vel. ataque, +{dmgReduction%} reducción de daño. Cada golpe recibido suma +{stackAtk} de daño (hasta +{stackCap}). ESCALADO: cada baja durante la Furia te da +{armorPerKill} de armadura permanente.',
        cast(caster) {
            const skill = this;
            addEffect(caster, {
                id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: this.tags,
                mods: { atkPct: val(this, caster, 'atkPct'), atkSpeedPct: val(this, caster, 'atkSpeedPct'), dmgReduction: val(this, caster, 'dmgReduction'), flatAtk: 0 },
                hooks: {
                    onDamaged(owner, { dealt }, effect) {
                        if (dealt > 0) effect.mods.flatAtk = Math.min(val(skill, owner, 'stackCap'), effect.mods.flatAtk + val(skill, owner, 'stackAtk'));
                    },
                    onKill(owner) { grantPermanent(owner, 'armor', val(skill, owner, 'armorPerKill'), skill.name); }
                }
            });
            log('🔥 ¡FURIA DEL GUERRERO!');
            return true;
        }
    }
});
