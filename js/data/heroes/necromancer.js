// Nigromante (Inteligencia) — drenaje de vida y desgaste. Diseño base: Gemini.
registerHero({
    key: 'NECROMANCER', name: 'Nigromante', symbol: 'N', primaryAttr: 'INT', role: 'Drenaje de vida y desgaste',
    attributes: { str: [18, 1.8], agi: [11, 1.1], int: [22, 3.1] },
    baseHp: 160, baseAtk: 12, baseAtkSpeed: 0.95, baseAttackRange: 3,
    baseArmor: 1, baseMagicResist: 15, baseHpRegen: 0.5,
    baseMaxMana: 130, baseManaRegen: 1.8, baseMoveSpeed: 2.6, baseProjectileSpeed: 8,
    baseCritChance: 5, baseEvasion: 5, baseSpellAmp: 0, baseLifesteal: 0,
    description: 'Inteligencia: absorbe la esencia vital de sus enemigos para curarse y desgastar ejércitos enteros.',
    scaling: { stat: 'lifesteal', perKills: 10, perKillsAmount: 2, perHeroKill: 5 },
    innate: {
        id: 'NECROMANCER_INNATE', name: 'Cosecha de Almas', tags: ['CURACIÓN', 'AL_MATAR'],
        description: 'Innato: cada enemigo que eliminás te cura 5% de tu HP máximo y te devuelve 15 de maná.',
        hooks: {
            onKill(owner) {
                healUnit(owner, owner.maxHp * 0.05);
                owner.mana = Math.min(owner.maxMana, owner.mana + 15);
            }
        }
    }
}, {
    NECROMANCER_DRAIN: {
        id: 'NECROMANCER_DRAIN', name: 'Drenaje de Esencia', kind: 'active',
        tags: ['MÁGICO', 'ROBO_VIDA'],
        values: { cooldown: [10, 9, 8, 7], manaCost: [40, 45, 50, 55], range: 4, baseDmg: [50, 85, 120, 155], intRatio: 0.5, healPct: [0.6, 0.7, 0.8, 0.9] },
        description: 'Drena al enemigo más cercano (rango {range}): {baseDmg} + {intRatio%} de tu Inteligencia como daño mágico y te curás {healPct%} del daño hecho.',
        cast(caster) {
            const target = nearestEnemy(caster, val(this, caster, 'range'));
            if (!target) { log('Drenaje de Esencia: sin enemigos en rango.'); return false; }
            const dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio');
            const { dealt } = dealDamage(caster, target, dmg, 'magical');
            const healed = healUnit(caster, dealt * val(this, caster, 'healPct'));
            log(`🩸 ¡Drenaje de Esencia! -${dealt} HP al enemigo, +${healed} HP propia.`);
            return true;
        }
    },
    NECROMANCER_DECAY: {
        id: 'NECROMANCER_DECAY', name: 'Aura de Podredumbre', kind: 'passive',
        tags: ['PURO', 'DAÑO_EN_EL_TIEMPO', 'ÁREA'],
        values: { radius: 3, hpDmgPct: [0.015, 0.02, 0.025, 0.03] },
        description: 'Pasiva: los enemigos en radio {radius} pierden {hpDmgPct%} de su HP máximo por segundo como daño puro.',
        hooks: {
            onTick(owner, { dt }) {
                if (!owner.isAlive() || !everyInterval(owner, this.id, dt)) return;
                const radius = val(this, owner, 'radius'), pct = val(this, owner, 'hpDmgPct');
                enemiesOf(owner).forEach(c => {
                    if (c.isAlive() && Math.hypot(c.x - owner.x, c.y - owner.y) <= radius) dealDamage(owner, c, Math.max(1, c.maxHp * pct), 'pure');
                });
            }
        }
    },
    NECROMANCER_CURSE: {
        id: 'NECROMANCER_CURSE', name: 'Maldición de Marchitamiento', kind: 'active',
        tags: ['PERJUICIO'],
        values: { cooldown: [12, 11, 10, 9], manaCost: [35, 40, 45, 50], range: 5, duration: 4, dmgTakenPct: [0.15, 0.2, 0.25, 0.3] },
        description: 'Maldice al enemigo más cercano (rango {range}) por {duration}s: recibe +{dmgTakenPct%} de daño de todas las fuentes.',
        cast(caster) {
            const target = nearestEnemy(caster, val(this, caster, 'range'));
            if (!target) { log('Maldición de Marchitamiento: sin objetivos.'); return false; }
            addEffect(target, {
                id: this.id, name: 'Marchito', duration: val(this, caster, 'duration'), tags: ['PERJUICIO'],
                mods: { dmgTakenPct: val(this, caster, 'dmgTakenPct') }
            });
            log(`☠️ ¡Maldición! ${target.label} recibe +${Math.round(val(this, caster, 'dmgTakenPct') * 100)}% de daño.`);
            return true;
        }
    },
    NECROMANCER_REAP: {
        id: 'NECROMANCER_REAP', name: 'Pacto de la Muerte', kind: 'active', isUltimate: true,
        tags: ['PURO', 'ÁREA', 'ROBO_VIDA', 'AL_MATAR'],
        values: { cooldown: [55, 50, 45], manaCost: [90, 110, 130], baseDmg: [120, 190, 260], intRatio: 0.7, radius: 3, lifestealPerKill: [2, 3, 4] },
        description: 'DEFINITIVA. Roba la vida de todos los enemigos en radio {radius}: {baseDmg} + {intRatio%} de tu Inteligencia como daño puro, y te curás el 100% del daño hecho. ASCENSO: cada enemigo que mata te da +{lifestealPerKill}% de robo de vida permanente.',
        cast(caster) {
            const radius = val(this, caster, 'radius');
            const targets = enemiesOf(caster).filter(c => c.isAlive() && Math.hypot(c.x - caster.x, c.y - caster.y) <= radius);
            if (!targets.length) { log('Pacto de la Muerte: sin enemigos cerca.'); return false; }
            const dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio');
            let total = 0;
            targets.forEach(c => {
                total += dealDamage(caster, c, dmg, 'pure').dealt;
                if (!c.isAlive()) grantPermanent(caster, 'lifesteal', val(this, caster, 'lifestealPerKill'), this.name);
            });
            const healed = healUnit(caster, total);
            log(`💀 ¡Pacto de la Muerte! ${targets.length} enemigo(s) drenados, +${healed} HP.`);
            return true;
        }
    }
});
