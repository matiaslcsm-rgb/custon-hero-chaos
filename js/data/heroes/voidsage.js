// Sabio del Vacío (Inteligencia) — movilidad y ráfaga en área. Diseño base: Gemini.
registerHero({
    key: 'VOIDSAGE', name: 'Sabio del Vacío', symbol: 'Ø', primaryAttr: 'INT', role: 'Movilidad y ráfaga en área',
    attributes: { str: [15, 1.5], agi: [15, 1.5], int: [24, 3.3] },
    // +40 de vida y +2 de armadura (2026-09-28): los magos morían en las oleadas (sobre todo a Arqueros) y quedaban eliminados en el primer jefe.
    baseHp: 180, baseAtk: 8, baseAtkSpeed: 0.95, baseAttackRange: 4,
    baseArmor: 2, baseMagicResist: 15, baseHpRegen: 0.5,
    baseMaxMana: 150, baseManaRegen: 2.3, baseMoveSpeed: 2.8, baseProjectileSpeed: 11,
    baseCritChance: 5, baseEvasion: 5, baseSpellAmp: 0, baseLifesteal: 0,
    description: 'Inteligencia: manipula el espacio para desorientar enemigos y teletransportarse en combate.',
    scaling: { stat: 'critChance', perKills: 10, perKillsAmount: 2, perHeroKill: 6 },
    innate: {
        id: 'VOIDSAGE_INNATE', name: 'Paso Etéreo', tags: ['AL_LANZAR'],
        description: 'Innato: cada habilidad que lanzás te da +20% de evasión durante 3s.',
        hooks: {
            onCast(owner) {
                addEffect(owner, { id: 'VOIDSAGE_ETHEREAL', name: 'Paso Etéreo', duration: 3, tags: ['MEJORA'], mods: { evasion: 20 } });
            }
        }
    }
}, {
    VOIDSAGE_BLINK: {
        id: 'VOIDSAGE_BLINK', name: 'Distorsión Espacial', kind: 'active',
        tags: ['MOVILIDAD', 'MÁGICO', 'ÁREA'],
        values: { cooldown: [12, 10, 8, 6], manaCost: [40, 45, 50, 55], range: 6, baseDmg: [45, 80, 115, 150], intRatio: 0.45, radius: 2 },
        description: 'Te teletransportás junto al enemigo más cercano (rango {range}): {baseDmg} + {intRatio%} de tu Inteligencia como daño mágico a los enemigos en radio {radius} al llegar.',
        cast(caster) {
            const target = nearestEnemy(caster, val(this, caster, 'range'));
            if (!target) { log('Distorsión Espacial: sin enemigo en rango.'); return false; }
            blinkNextTo(caster, target);
            const radius = val(this, caster, 'radius');
            const dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio');
            let hits = 0;
            enemiesOf(caster).forEach(c => {
                if (c.isAlive() && Math.hypot(c.x - caster.x, c.y - caster.y) <= radius) { dealDamage(caster, c, dmg, 'magical'); hits++; }
            });
            log(`🌀 ¡Distorsión Espacial! ${hits} enemigo(s) alcanzados.`);
            return true;
        }
    },
    VOIDSAGE_PULSE: {
        id: 'VOIDSAGE_PULSE', name: 'Singularidad Mágica', kind: 'active',
        tags: ['MÁGICO', 'CONTROL', 'ÁREA'],
        values: { cooldown: [11, 10, 9, 8], manaCost: [45, 50, 55, 60], baseDmg: [50, 90, 130, 170], intRatio: 0.5, radius: 3, slow: [0.3, 0.4, 0.5, 0.6], slowDuration: 3 },
        description: 'Colapso en radio {radius}: {baseDmg} + {intRatio%} de tu Inteligencia como daño mágico y ralentiza {slow%} por {slowDuration}s.',
        cast(caster) {
            const radius = val(this, caster, 'radius');
            const targets = enemiesOf(caster).filter(c => c.isAlive() && Math.hypot(c.x - caster.x, c.y - caster.y) <= radius);
            if (!targets.length) { log('Singularidad Mágica: sin enemigos en el radio.'); return false; }
            const dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio');
            targets.forEach(c => {
                dealDamage(caster, c, dmg, 'magical');
                if (c.isAlive()) addEffect(c, { id: 'SLOW_' + this.id, name: 'Gravedad alterada', duration: val(this, caster, 'slowDuration'), mods: { moveSpeedPct: -val(this, caster, 'slow') } });
            });
            log(`🌌 ¡Singularidad Mágica! ${targets.length} enemigo(s) alcanzados.`);
            return true;
        }
    },
    VOIDSAGE_FIELD: {
        id: 'VOIDSAGE_FIELD', name: 'Escudo de Fases', kind: 'passive',
        tags: ['MEJORA', 'AL_RECIBIR_DAÑO'],
        values: { hpThreshold: 0.4, dmgReduction: [0.3, 0.4, 0.5, 0.6], duration: 3, internalCooldown: 15 },
        description: 'Pasiva: si un golpe te deja por debajo del {hpThreshold%} de vida, ganás {dmgReduction%} de reducción de daño por {duration}s (una vez cada {internalCooldown}s).',
        hooks: {
            onDamaged(owner) {
                if (!owner.isAlive() || owner.hp / owner.maxHp > val(this, owner, 'hpThreshold') || getEffect(owner, 'VOIDSAGE_FIELD_CD')) return;
                const reduction = val(this, owner, 'dmgReduction');
                addEffect(owner, { id: this.id, name: this.name, duration: val(this, owner, 'duration'), tags: ['MEJORA'], mods: { dmgReduction: reduction } });
                addEffect(owner, { id: 'VOIDSAGE_FIELD_CD', name: 'Escudo de Fases (recargando)', duration: val(this, owner, 'internalCooldown') });
                log(`🛡️ ¡Escudo de Fases! ${Math.round(reduction * 100)}% de reducción de daño.`);
            }
        }
    },
    VOIDSAGE_RIFT: {
        id: 'VOIDSAGE_RIFT', name: 'Grieta del Vacío', kind: 'active', isUltimate: true,
        tags: ['PURO', 'ÁREA', 'AL_MATAR'],
        values: { cooldown: [60, 50, 40], manaCost: [100, 125, 150], baseDmg: [180, 260, 340], intRatio: 0.9, radius: 3, atkPerKill: [2, 3, 4] },
        // Rebalanceo para la Torre (REWORK.md §2, fase 3): números más chicos para andar como activa común.
        towerValues: { cooldown: [15, 13, 11], manaCost: [55, 65, 75], baseDmg: [75, 115, 155], intRatio: 0.45, radius: 2.5, atkPerKill: [1, 1.5, 2] },
        description: 'DEFINITIVA. Abre una grieta en radio {radius}: {baseDmg} + {intRatio%} de tu Inteligencia como daño puro. ASCENSO: cada enemigo que mata te da +{atkPerKill} de daño de ataque permanente.',
        cast(caster) {
            const radius = val(this, caster, 'radius');
            const targets = enemiesOf(caster).filter(c => c.isAlive() && Math.hypot(c.x - caster.x, c.y - caster.y) <= radius);
            if (!targets.length) { log('Grieta del Vacío: sin enemigos en el radio.'); return false; }
            const dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio');
            targets.forEach(c => {
                dealDamage(caster, c, dmg, 'pure');
                if (!c.isAlive()) grantPermanent(caster, 'atk', val(this, caster, 'atkPerKill'), this.name);
            });
            log(`🪐 ¡Grieta del Vacío! ${targets.length} enemigo(s) alcanzados.`);
            return true;
        }
    }
});
