// Guerrero Vampiro (Fuerza) — robo de vida
registerHero({
    key: 'VAMPIRE', name: 'Guerrero Vampiro', symbol: 'V', primaryAttr: 'STR', role: 'Guerrero vampiro cuerpo a cuerpo',
    attributes: { str: [24, 3.0], agi: [14, 1.8], int: [14, 1.4] },
    baseHp: 170, baseAtk: 17, baseAtkSpeed: 1.0, baseAttackRange: 1.4,
    baseArmor: 5, baseMagicResist: 12, baseHpRegen: 1.0,
    baseMaxMana: 100, baseManaRegen: 1.0, baseMoveSpeed: 3.3, baseProjectileSpeed: 0,
    baseCritChance: 6, baseEvasion: 5, baseSpellAmp: 0, baseLifesteal: 20,
    description: 'Fuerza: guerrero resistente que se cura con el daño que hace. Dominante en peleas largas.',
    scaling: { stat: 'lifesteal', perKills: 9, perKillsAmount: 1, perHeroKill: 3 },
    innate: {
        id: 'BLOODLUST', name: 'Hambre',
        tags: ['ROBO_VIDA', 'CURACIÓN', 'AL_MATAR'],
        // Cura por baja agregada tras medir: sin ella ganaba 1 de 12 partidas (sin área, no aguantaba multitudes).
        healPerKill: 0.05,
        description: 'Innato: convierte una parte de tu daño físico en vida (Robo de Vida base 20%). La curación se duplica contra enemigos con menos de 30% HP. Cada enemigo que eliminás te cura 5% de tu vida máxima.',
        hooks: {
            beforeLifesteal(owner, ctx) {
                if (ctx.target && ctx.target.maxHp && ctx.target.hp / ctx.target.maxHp < 0.3) ctx.mult *= 2;
            },
            onKill(owner) { healUnit(owner, owner.maxHp * this.healPerKill); }
        }
    }
}, {
    // Era activa (consumía vida por +daño y +robo de vida por 5s); pasó a pasiva (regla: al menos 1 pasiva entre las 3
    // nativas): cuanta menos vida tenés, más pegás y más cura tu robo de vida.
    VAMP_DARKBLOOD: {
        id: 'VAMP_DARKBLOOD', name: 'Sangre Oscura', kind: 'passive',
        tags: ['MEJORA', 'ROBO_VIDA'],
        values: { atkPerStep: [0.02, 0.03, 0.04, 0.05], lifestealPerStep: [0.03, 0.05, 0.07, 0.09] },
        description: 'Pasiva: por cada 10% de vida que te falta, +{atkPerStep%} de daño físico y tu robo de vida cura +{lifestealPerStep%}.',
        hooks: {
            onTick(owner) { keepPassiveEffect(owner, this, { atkPct: darkBloodSteps(owner) * val(this, owner, 'atkPerStep') }); },
            beforeLifesteal(owner, ctx) { ctx.mult += darkBloodSteps(owner) * val(this, owner, 'lifestealPerStep'); }
        }
    },
    VAMP_CLAW: {
        id: 'VAMP_CLAW', name: 'Garra Vampírica', kind: 'active',
        tags: ['FÍSICO', 'ROBO_VIDA'],
        values: { cooldown: [7, 6, 5, 4], manaCost: 30, dmgMult: [1.0, 1.3, 1.6, 1.9], healPct: 0.35 },
        description: '{dmgMult%} de tu daño físico al enemigo más cercano; recuperás {healPct%} del daño como vida (el doble si tiene <30% HP).',
        cast(caster) {
            const target = nearestEnemy(caster, caster.attackRange + 1);
            if (!target) { log('Garra Vampírica: sin objetivo en rango.'); return false; }
            const dmg = Math.round(caster.atk * val(this, caster, 'dmgMult'));
            const lowHp = target.maxHp && target.hp / target.maxHp < 0.3;
            const { dealt } = dealDamage(caster, target, dmg, 'physical');
            const heal = healUnit(caster, Math.round(dealt * val(this, caster, 'healPct') * (lowHp ? 2 : 1)), { fromDamage: true });
            log(`🐾 ¡Garra Vampírica a ${target.label}! (-${dealt} HP, +${heal} HP propia)`);
            return true;
        }
    },
    VAMP_LEAP: {
        id: 'VAMP_LEAP', name: 'Salto Sangriento', kind: 'active',
        tags: ['MOVILIDAD', 'FÍSICO', 'CONTROL'],
        // Alcance 6 → 7 y ralentización 40% → 50%: tiene que poder alcanzar a los de distancia.
        // Inmoviliza al caer (agregado tras medir): sin algo que frene a los de distancia, el Vampiro ganaba ~12% de duelos.
        values: { cooldown: [12, 11, 10, 9], manaCost: 35, range: 7, dmgMult: [0.8, 1.0, 1.2, 1.4], rootDuration: 0.6, slow: 0.5, slowDuration: [1.5, 2, 2.5, 3] },
        description: 'Saltás hasta {range} casillas hacia el enemigo más cercano: {dmgMult%} de daño físico de impacto, lo inmovilizás {rootDuration}s y queda con -{slow%} velocidad por {slowDuration}s.',
        cast(caster) {
            const target = nearestEnemy(caster, val(this, caster, 'range'));
            if (!target) { log('Salto Sangriento: sin objetivo en rango.'); return false; }
            blinkNextTo(caster, target);
            const dmg = Math.round(caster.atk * val(this, caster, 'dmgMult'));
            const { dealt } = dealDamage(caster, target, dmg, 'physical');
            if (target.isAlive()) addEffect(target, { id: 'STUN', name: 'Inmovilizado', duration: val(this, caster, 'rootDuration'), flags: ['stun'] });
            if (target.isAlive()) addEffect(target, { id: 'SLOW_' + this.id, name: 'Desgarrado', duration: val(this, caster, 'slowDuration'), mods: { moveSpeedPct: -val(this, caster, 'slow') } });
            log(`🦇 ¡Salto Sangriento sobre ${target.label}! (-${dealt} HP)`);
            return true;
        }
    },
    VAMP_IMMORTAL: {
        id: 'VAMP_IMMORTAL', name: 'Forma Inmortal', kind: 'active', isUltimate: true,
        tags: ['MEJORA', 'ROBO_VIDA', 'AL_RECIBIR_DAÑO'],
        values: { cooldown: [70, 60, 50], manaCost: 100, duration: [5, 6, 7], atkPct: 0.3, atkSpeedPct: 0.3, lifesteal: [20, 25, 30], payback: [0.4, 0.3, 0.2], healStep: 50, hpPerStep: [5, 7, 10] },
        // Rebalanceo para la Torre (REWORK.md §2, fase 3): más corta y con enfriamiento más alto que el resto
        // (sigue siendo una activa común, pero "no podés morir" spameable cada 10s sería demasiado).
        towerValues: { cooldown: [22, 19, 16], manaCost: 55, duration: [3, 4, 5], atkPct: 0.16, atkSpeedPct: 0.16, lifesteal: [12, 16, 20], payback: [0.5, 0.4, 0.3], hpPerStep: [3, 4, 6] },
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

// Sangre Oscura: tramos de 10% de vida faltante (0 a 9).
function darkBloodSteps(owner) { return Math.min(9, Math.floor((1 - owner.hp / owner.maxHp) * 10)); }
