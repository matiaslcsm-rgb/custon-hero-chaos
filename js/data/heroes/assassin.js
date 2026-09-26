// Asesino (Agilidad) — asesino de críticos
registerHero({
    key: 'ASSASSIN', name: 'Asesino', symbol: 'K', primaryAttr: 'AGI', role: 'Asesino de críticos',
    attributes: { str: [18, 2.0], agi: [22, 3.2], int: [14, 1.4] },
    baseHp: 100, baseAtk: 9, baseAtkSpeed: 1.1, baseAttackRange: 1.3,
    baseArmor: 1, baseMagicResist: 8, baseHpRegen: 0.8,
    baseMaxMana: 90, baseManaRegen: 1.3, baseMoveSpeed: 3.4, baseProjectileSpeed: 0,
    baseCritChance: 20, baseEvasion: 10, baseSpellAmp: 0, baseLifesteal: 0,
    description: 'Agilidad: asesino explosivo de altísimo daño crítico. Entra, elimina un objetivo y sale antes de que lo rodeen.',
    scaling: { stat: 'critChance', perKills: 8, perKillsAmount: 2, perHeroKill: 5 },
    // Golpe Mortal no necesita hooks: su efecto es la probabilidad de crítico base alta (baseCritChance: 20).
    innate: {
        id: 'DEADLY_STRIKE', name: 'Golpe Mortal',
        tags: ['CRÍTICO'],
        description: 'Innato: alta probabilidad base de golpe crítico (x2 daño) en cada ataque básico.'
    }
}, {
    ASSASSIN_BLINK: {
        id: 'ASSASSIN_BLINK', name: 'Parpadeo', kind: 'active',
        tags: ['MOVILIDAD', 'FÍSICO'],
        values: { cooldown: [14, 12, 10, 8], manaCost: 35, range: 8, atkSpeedPct: [0.2, 0.3, 0.4, 0.5], buffDuration: 2 },
        description: 'Teletransporte de hasta {range} casillas junto al enemigo más cercano: ataca de inmediato y gana +{atkSpeedPct%} vel. ataque por {buffDuration}s.',
        cast(caster) {
            const target = nearestEnemy(caster, val(this, caster, 'range'));
            if (!target) { log('Parpadeo: sin objetivo en rango.'); return false; }
            blinkNextTo(caster, target);
            addEffect(caster, { id: this.id, name: this.name, duration: val(this, caster, 'buffDuration'), tags: ['MEJORA'], mods: { atkSpeedPct: val(this, caster, 'atkSpeedPct') } });
            const { dmg, isCrit } = rollAttackDamage(caster, target);
            resolveBasicHit(caster, target, dmg, isCrit);
            log(`💨 ¡Parpadeo junto a ${target.label}!`);
            return true;
        }
    },
    ASSASSIN_CRITSTRIKE: {
        id: 'ASSASSIN_CRITSTRIKE', name: 'Golpe Crítico', kind: 'active',
        tags: ['FÍSICO', 'CRÍTICO'],
        values: { cooldown: 8, manaCost: 40, dmgMult: [1.2, 1.5, 1.8, 2.1], extraCrit: 25 },
        description: '{dmgMult%} de tu daño físico al enemigo más cercano, con +{extraCrit}% de probabilidad extra de crítico.',
        cast(caster) {
            const target = nearestEnemy(caster, caster.attackRange + 1);
            if (!target) { log('Golpe Crítico: sin objetivo en rango.'); return false; }
            let dmg = Math.round(caster.atk * val(this, caster, 'dmgMult'));
            const isCrit = Math.random() < (effCritChance(caster) + val(this, caster, 'extraCrit')) / 100;
            if (isCrit) dmg = Math.round(dmg * 2);
            const { dealt } = dealDamage(caster, target, dmg, 'physical');
            log(`⚔️ ¡Golpe Crítico a ${target.label}!${isCrit ? ' ¡CRÍTICO!' : ''} (-${dealt} HP)`);
            return true;
        }
    },
    ASSASSIN_LETHALSPEED: {
        id: 'ASSASSIN_LETHALSPEED', name: 'Velocidad Letal', kind: 'active',
        tags: ['MEJORA', 'AL_GOLPEAR'],
        values: { cooldown: 14, manaCost: 35, duration: 4, atkSpeedPct: [0.4, 0.6, 0.8, 1.0], comboStep: 0.05, comboCap: [0.3, 0.4, 0.5, 0.6] },
        description: '{duration}s: +{atkSpeedPct%} velocidad de ataque. Cada golpe consecutivo al mismo enemigo suma +{comboStep%} de daño (hasta +{comboCap%}; se reinicia si cambiás de objetivo).',
        cast(caster) {
            const step = val(this, caster, 'comboStep'), cap = val(this, caster, 'comboCap');
            addEffect(caster, {
                id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: this.tags,
                mods: { atkSpeedPct: val(this, caster, 'atkSpeedPct') }, data: { comboTarget: null, stacks: 0 },
                hooks: {
                    beforeAttack(owner, ctx, effect) {
                        if (effect.data.comboTarget !== ctx.target) { effect.data.comboTarget = ctx.target; effect.data.stacks = 0; }
                        ctx.dmg *= 1 + Math.min(cap, effect.data.stacks * step);
                        effect.data.stacks++;
                    }
                }
            });
            log('⚡ ¡Velocidad Letal! Combo activo.');
            return true;
        }
    },
    ASSASSIN_MASACRE: {
        id: 'ASSASSIN_MASACRE', name: 'Masacre', kind: 'active', isUltimate: true,
        tags: ['MEJORA', 'CRÍTICO', 'AL_MATAR'],
        values: { cooldown: [55, 50, 45], manaCost: 90, duration: 6, critChance: [40, 50, 60], atkSpeedPct: 0.4, moveSpeedPct: 0.25, extendPerKill: 1.5, critPerKill: [1, 1.5, 2] },
        description: 'DEFINITIVA. {duration}s: +{critChance}% prob. crítico, +{atkSpeedPct%} vel. ataque, +{moveSpeedPct%} vel. movimiento. Cada baja extiende la duración +{extendPerKill}s. ESCALADO: cada baja durante la Masacre te da +{critPerKill}% de crítico permanente.',
        cast(caster) {
            const skill = this;
            addEffect(caster, {
                id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: this.tags,
                mods: { critChance: val(this, caster, 'critChance'), atkSpeedPct: val(this, caster, 'atkSpeedPct'), moveSpeedPct: val(this, caster, 'moveSpeedPct') },
                hooks: {
                    onKill(owner, payload, effect) {
                        effect.until += val(skill, owner, 'extendPerKill');
                        grantPermanent(owner, 'critChance', val(skill, owner, 'critPerKill'), skill.name);
                    }
                }
            });
            log('🔪 ¡MASACRE!');
            return true;
        }
    }
});
