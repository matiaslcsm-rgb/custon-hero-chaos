// Guerrero Vampiro (Fuerza) — robo de vida
registerHero({
    key: 'VAMPIRE', name: 'Guerrero Vampiro', symbol: 'V', primaryAttr: 'STR', role: 'Guerrero vampiro cuerpo a cuerpo',
    attributes: { str: [24, 3.0], agi: [14, 1.8], int: [14, 1.4] },
    baseHp: 120, baseAtk: 12, baseAtkSpeed: 0.85, baseAttackRange: 1.4,
    baseArmor: 3, baseMagicResist: 12, baseHpRegen: 1.0,
    baseMaxMana: 100, baseManaRegen: 1.0, baseMoveSpeed: 2.9, baseProjectileSpeed: 0,
    baseCritChance: 6, baseEvasion: 5, baseSpellAmp: 0, baseLifesteal: 15,
    description: 'Fuerza: guerrero resistente que se cura con el daño que hace. Dominante en peleas largas.',
    scaling: { stat: 'lifesteal', perKills: 9, perKillsAmount: 1, perHeroKill: 3 },
    innate: {
        id: 'BLOODLUST', name: 'Hambre',
        tags: ['ROBO_VIDA'],
        description: 'Innato: convierte una parte de tu daño físico en vida (Robo de Vida base 15%). La curación se duplica contra enemigos con menos de 30% HP.',
        hooks: {
            beforeLifesteal(owner, ctx) {
                if (ctx.target && ctx.target.maxHp && ctx.target.hp / ctx.target.maxHp < 0.3) ctx.mult *= 2;
            }
        }
    }
}, {
    VAMP_DARKBLOOD: {
        id: 'VAMP_DARKBLOOD', name: 'Sangre Oscura', kind: 'active',
        tags: ['MEJORA', 'ROBO_VIDA'],
        values: { cooldown: 12, manaCost: 25, hpCost: 0.08, duration: 5, atkPct: [0.2, 0.3, 0.4, 0.5], lifestealBonus: [0.3, 0.5, 0.7, 0.9] },
        description: 'Consumís {hpCost%} de tu vida actual y ganás +{atkPct%} daño físico por {duration}s; tu robo de vida cura +{lifestealBonus%} mientras dura.',
        cast(caster) {
            const cost = Math.round(caster.hp * val(this, caster, 'hpCost'));
            caster.hp = Math.max(1, caster.hp - cost);
            const bonus = val(this, caster, 'lifestealBonus');
            addEffect(caster, {
                id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: this.tags,
                mods: { atkPct: val(this, caster, 'atkPct') },
                hooks: { beforeLifesteal(owner, ctx) { ctx.mult += bonus; } }
            });
            log(`🩸 ¡Sangre Oscura! -${cost} HP propia.`);
            return true;
        }
    },
    VAMP_CLAW: {
        id: 'VAMP_CLAW', name: 'Garra Vampírica', kind: 'active',
        tags: ['FÍSICO', 'ROBO_VIDA'],
        values: { cooldown: [7, 6, 5, 4], manaCost: 30, dmgMult: [1.0, 1.3, 1.6, 1.9], healPct: 0.2 },
        description: '{dmgMult%} de tu daño físico al enemigo más cercano; recuperás {healPct%} del daño como vida (el doble si tiene <30% HP).',
        cast(caster) {
            const target = nearestEnemy(caster, caster.attackRange + 1);
            if (!target) { log('Garra Vampírica: sin objetivo en rango.'); return false; }
            const dmg = Math.round(caster.atk * val(this, caster, 'dmgMult'));
            const lowHp = target.maxHp && target.hp / target.maxHp < 0.3;
            const { dealt } = dealDamage(caster, target, dmg, 'physical');
            const heal = healUnit(caster, Math.round(dealt * val(this, caster, 'healPct') * (lowHp ? 2 : 1)));
            log(`🐾 ¡Garra Vampírica a ${target.label}! (-${dealt} HP, +${heal} HP propia)`);
            return true;
        }
    },
    VAMP_LEAP: {
        id: 'VAMP_LEAP', name: 'Salto Sangriento', kind: 'active',
        tags: ['MOVILIDAD', 'FÍSICO', 'CONTROL'],
        values: { cooldown: [12, 11, 10, 9], manaCost: 35, range: 6, dmgMult: [0.8, 1.0, 1.2, 1.4], slow: 0.4, slowDuration: [1.5, 2, 2.5, 3] },
        description: 'Saltás hasta {range} casillas hacia el enemigo más cercano: {dmgMult%} de daño físico de impacto y -{slow%} velocidad por {slowDuration}s.',
        cast(caster) {
            const target = nearestEnemy(caster, val(this, caster, 'range'));
            if (!target) { log('Salto Sangriento: sin objetivo en rango.'); return false; }
            blinkNextTo(caster, target);
            const dmg = Math.round(caster.atk * val(this, caster, 'dmgMult'));
            const { dealt } = dealDamage(caster, target, dmg, 'physical');
            if (target.isAlive()) addEffect(target, { id: 'SLOW_' + this.id, name: 'Desgarrado', duration: val(this, caster, 'slowDuration'), mods: { moveSpeedPct: -val(this, caster, 'slow') } });
            log(`🦇 ¡Salto Sangriento sobre ${target.label}! (-${dealt} HP)`);
            return true;
        }
    },
    VAMP_IMMORTAL: {
        id: 'VAMP_IMMORTAL', name: 'Forma Inmortal', kind: 'active', isUltimate: true,
        tags: ['MEJORA', 'ROBO_VIDA', 'AL_RECIBIR_DAÑO'],
        values: { cooldown: [70, 60, 50], manaCost: 100, duration: [5, 6, 7], atkPct: 0.3, atkSpeedPct: 0.3, lifesteal: [20, 25, 30], payback: [0.4, 0.3, 0.2], healStep: 50, hpPerStep: [5, 7, 10] },
        description: 'DEFINITIVA. {duration}s: +{atkPct%} daño físico, +{atkSpeedPct%} vel. ataque, +{lifesteal}% robo de vida, y tu vida no puede bajar de 1. Al terminar recibís {payback%} del daño acumulado. ESCALADO: cada {healStep} de vida curada durante la forma te da +{hpPerStep} de HP máximo permanente.',
        cast(caster) {
            const skill = this;
            addEffect(caster, {
                id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: this.tags,
                mods: { atkPct: val(this, caster, 'atkPct'), atkSpeedPct: val(this, caster, 'atkSpeedPct'), lifesteal: val(this, caster, 'lifesteal') },
                flags: ['preventDeath'], data: { accumulated: 0, healed: 0 },
                hooks: {
                    onDamaged(owner, { dealt }, effect) { effect.data.accumulated += dealt; },
                    onHeal(owner, { amount }, effect) {
                        const step = val(skill, owner, 'healStep');
                        effect.data.healed += amount;
                        while (effect.data.healed >= step) {
                            effect.data.healed -= step;
                            grantPermanent(owner, 'maxHp', val(skill, owner, 'hpPerStep'), skill.name);
                        }
                    },
                    onExpire(owner, effect) {
                        const payback = Math.round(effect.data.accumulated * val(skill, owner, 'payback'));
                        if (payback <= 0) return;
                        owner.hp = Math.max(0, owner.hp - payback);
                        log(`⚠️ Forma Inmortal termina: recibís ${payback} de daño acumulado.`);
                        if (!owner.isAlive()) onHeroDeath(owner);
                    }
                }
            });
            log('🧛 ¡FORMA INMORTAL! No podés morir mientras dure.');
            return true;
        }
    }
});
