// Sniper (Agilidad) — francotirador de largo alcance
registerHero({
    key: 'SNIPER', name: 'Sniper', symbol: 'S', primaryAttr: 'AGI', role: 'Francotirador de largo alcance',
    attributes: { str: [16, 1.8], agi: [22, 3.0], int: [15, 1.4] },
    baseHp: 85, baseAtk: 8, baseAtkSpeed: 0.85, baseAttackRange: 5,
    baseArmor: 0, baseMagicResist: 10, baseHpRegen: 0.5,
    baseMaxMana: 150, baseManaRegen: 1.5, baseMoveSpeed: 2.3, baseProjectileSpeed: 11,
    baseCritChance: 12, baseEvasion: 8, baseSpellAmp: 8, baseLifesteal: 0,
    description: 'Agilidad: DPS físico de largo alcance. Cuanto más lejos dispara, más daño hace. Frágil de cerca.',
    // Escalado a la mitad tras medir: con +3/+8 ganaba el 93% de sus duelos y todas las partidas.
    scaling: { stat: 'atk', perKills: 8, perKillsAmount: 1.5, perHeroKill: 4 },
    innate: {
        id: 'PERFECT_AIM', name: 'Puntería Perfecta',
        tags: ['FÍSICO', 'AL_GOLPEAR'],
        description: 'Innato: el daño de tus ataques básicos crece con la distancia al objetivo (+15% a media distancia, +35% a distancia máxima).',
        hooks: {
            beforeAttack(owner, ctx) {
                if (!ctx.target || owner.attackRange <= 0) return;
                const distPct = Math.hypot(owner.x - ctx.target.x, owner.y - ctx.target.y) / owner.attackRange;
                if (distPct > 0.8) ctx.dmg *= 1.35; else if (distPct > 0.45) ctx.dmg *= 1.15;
            }
        }
    }
}, {
    SNIPER_POTENTE: {
        id: 'SNIPER_POTENTE', name: 'Disparo Potente', kind: 'active',
        tags: ['FÍSICO'],
        values: { cooldown: [8, 7, 6, 5], manaCost: 35, dmgMult: [1.4, 1.8, 2.2, 2.6] },
        description: 'Disparo preciso: {dmgMult%} de tu daño físico al enemigo más cercano.',
        cast(caster) {
            const target = nearestEnemy(caster, caster.attackRange + 2);
            if (!target) { log('Disparo Potente: sin objetivo en rango.'); return false; }
            const dmg = Math.round(caster.atk * val(this, caster, 'dmgMult'));
            const { dealt } = dealDamage(caster, target, dmg, 'physical');
            log(`🎯 ¡Disparo Potente a ${target.label}! (-${dealt} HP)`);
            return true;
        }
    },
    SNIPER_CONGELANTE: {
        id: 'SNIPER_CONGELANTE', name: 'Disparo Congelante', kind: 'active',
        tags: ['FÍSICO', 'CONTROL'],
        values: { cooldown: 9, manaCost: 30, dmgMult: [0.8, 1.0, 1.2, 1.4], slow: [0.4, 0.5, 0.6, 0.7], farSlowBonus: 0.2, duration: 3 },
        description: '{dmgMult%} de tu daño físico y ralentiza {slow%} por {duration}s (+{farSlowBonus%} si el objetivo está a más de 80% de tu rango).',
        cast(caster) {
            const target = nearestEnemy(caster, caster.attackRange + 2);
            if (!target) { log('Disparo Congelante: sin objetivo en rango.'); return false; }
            const dmg = Math.round(caster.atk * val(this, caster, 'dmgMult'));
            dealDamage(caster, target, dmg, 'physical');
            const farAway = Math.hypot(caster.x - target.x, caster.y - target.y) > caster.attackRange * 0.8;
            const slow = Math.min(0.9, val(this, caster, 'slow') + (farAway ? val(this, caster, 'farSlowBonus') : 0));
            if (target.isAlive()) addEffect(target, { id: 'SLOW_' + this.id, name: 'Congelado', duration: val(this, caster, 'duration'), mods: { moveSpeedPct: -slow } });
            log(`❄️ ¡Disparo Congelante a ${target.label}! -${Math.round(slow * 100)}% velocidad.`);
            return true;
        }
    },
    // Era activa (+30-60% rango y +15-45% daño por 4-7s, con -50% de movimiento); pasó a pasiva con valores más bajos
    // y sin la penalización (regla: cada héroe tiene al menos 1 pasiva entre sus 3 nativas).
    SNIPER_VISION: {
        id: 'SNIPER_VISION', name: 'Visión de Cazador', kind: 'passive',
        tags: ['MEJORA'],
        values: { rangePct: [0.1, 0.15, 0.2, 0.25], atkPct: [0.05, 0.08, 0.11, 0.14] },
        description: 'Pasiva: +{rangePct%} de rango de ataque y +{atkPct%} de daño físico.',
        hooks: {
            onTick(owner) { keepPassiveEffect(owner, this, { rangePct: val(this, owner, 'rangePct'), atkPct: val(this, owner, 'atkPct') }); }
        }
    },
    SNIPER_MORTAL: {
        id: 'SNIPER_MORTAL', name: 'Disparo Mortal', kind: 'active', isUltimate: true,
        tags: ['FÍSICO', 'CRÍTICO', 'AL_MATAR'],
        values: { cooldown: [60, 50, 40], manaCost: [90, 110, 130], dmgMult: [3.0, 3.5, 4.0], farBonus: 0.5, critChance: 0.6, atkPerKill: [3, 4, 5] },
        description: 'DEFINITIVA. Proyectil devastador: {dmgMult%} de tu daño físico (+{farBonus%} a distancia máxima), con {critChance%} de probabilidad de crítico. Alcance: 3 veces tu rango. ESCALADO: si mata al objetivo, +{atkPerKill} de daño de ataque permanente.',
        cast(caster) {
            const target = nearestEnemy(caster, caster.attackRange * 3);
            if (!target) { log('Disparo Mortal: sin objetivo en rango.'); return false; }
            const distPct = Math.hypot(caster.x - target.x, caster.y - target.y) / caster.attackRange;
            const farMult = distPct > 0.8 ? 1 + val(this, caster, 'farBonus') : distPct > 0.45 ? 1 + val(this, caster, 'farBonus') / 2 : 1;
            let dmg = Math.round(caster.atk * val(this, caster, 'dmgMult') * farMult);
            const isCrit = Math.random() < val(this, caster, 'critChance');
            if (isCrit) dmg = Math.round(dmg * 2);
            const { dealt } = dealDamage(caster, target, dmg, 'physical');
            log(`💀 ¡DISPARO MORTAL a ${target.label}!${isCrit ? ' ¡CRÍTICO!' : ''} (-${dealt} HP)`);
            if (!target.isAlive()) grantPermanent(caster, 'atk', val(this, caster, 'atkPerKill'), this.name);
            return true;
        }
    }
});
