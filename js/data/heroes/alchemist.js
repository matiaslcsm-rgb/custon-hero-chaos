// Alquimista (Inteligencia) — ácido, reducción de armadura y frenesí. Diseño base: Gemini.
registerHero({
    key: 'ALCHEMIST', name: 'Alquimista', symbol: 'L', primaryAttr: 'INT', role: 'Ácido y reducción de armadura',
    attributes: { str: [19, 2.0], agi: [11, 1.1], int: [21, 2.8] },
    // +40 de vida y +2 de armadura (2026-09-28): los magos morían en las oleadas (sobre todo a Arqueros) y quedaban eliminados en el primer jefe.
    baseHp: 135, baseAtk: 7, baseAtkSpeed: 0.65, baseAttackRange: 3,
    baseArmor: 4, baseMagicResist: 5, baseHpRegen: 0.8,
    baseMaxMana: 120, baseManaRegen: 1.9, baseMoveSpeed: 2.4, baseProjectileSpeed: 9,
    baseCritChance: 5, baseEvasion: 5, baseSpellAmp: 0, baseLifesteal: 0,
    description: 'Inteligencia: usa mezclas de ácido corrosivo para disolver las defensas enemigas.',
    scaling: { stat: 'armor', perKills: 10, perKillsAmount: 1, perHeroKill: 3 },
    innate: {
        id: 'ALCHEMIST_INNATE', name: 'Gredas Transmutadoras', tags: ['AL_MATAR'],
        description: 'Innato: cada enemigo que eliminás te devuelve 10 de maná y te da +10% de velocidad de movimiento por 4s.',
        hooks: {
            onKill(owner) {
                owner.mana = Math.min(owner.maxMana, owner.mana + 10);
                addEffect(owner, { id: 'ALCHEMIST_TRANSMUTE', name: 'Transmutación', duration: 4, tags: ['MEJORA'], mods: { moveSpeedPct: 0.1 } });
            }
        }
    }
}, {
    ALCHEMIST_ACID: {
        id: 'ALCHEMIST_ACID', name: 'Pulverización Ácida', kind: 'active',
        tags: ['FÍSICO', 'ÁREA', 'DAÑO_EN_EL_TIEMPO', 'PERJUICIO'],
        // Daño −30% y menos reducción de armadura tras medir: el ácido era lo que más le daba al Alquimista (ganaba 88% de duelos).
        values: { cooldown: [13, 12, 11, 10], manaCost: [45, 50, 55, 60], radius: 3, duration: 5, dmgPerSecond: [14, 24, 34, 44], intRatio: 0.2, armorReduction: [1.5, 2, 2.5, 3] },
        description: 'Rocía ácido en radio {radius}: los enemigos alcanzados pierden {armorReduction} de armadura y sufren {dmgPerSecond} + {intRatio%} de tu Inteligencia como daño físico por segundo durante {duration}s.',
        cast(caster) {
            const radius = val(this, caster, 'radius');
            const targets = enemiesOf(caster).filter(c => c.isAlive() && Math.hypot(c.x - caster.x, c.y - caster.y) <= radius);
            if (!targets.length) { log('Pulverización Ácida: sin enemigos en el radio.'); return false; }
            const dps = val(this, caster, 'dmgPerSecond') + caster.int * val(this, caster, 'intRatio');
            targets.forEach(c => addEffect(c, {
                id: this.id, name: 'Corrosión ácida', duration: val(this, caster, 'duration'), tags: ['PERJUICIO'],
                mods: { armor: -val(this, caster, 'armorReduction') },
                hooks: {
                    onTick(unit, { dt }) { if (everyInterval(unit, 'ALCHEMIST_ACID', dt)) dealDamage(caster, unit, dps, 'physical'); }
                }
            }));
            log(`🧪 ¡Pulverización Ácida! ${targets.length} enemigo(s) corroídos.`);
            return true;
        }
    },
    ALCHEMIST_BREW: {
        id: 'ALCHEMIST_BREW', name: 'Mezcla Inestable', kind: 'active', pointTarget: true,
        tags: ['MÁGICO', 'CONTROL'],
        values: { cooldown: [12, 11, 10, 9], manaCost: [40, 45, 50, 55], range: 5, baseDmg: [60, 110, 160, 210], intRatio: 0.6, stunDuration: [0.8, 1.0, 1.2, 1.4], radius: 0.6, speed: 12 }, // aturdimiento más corto tras medir
        description: 'Lanza un frasco hacia donde apuntes (rango {range}): {baseDmg} + {intRatio%} de tu Inteligencia como daño mágico y aturde {stunDuration}s a quien toque. Proyectil real: si apuntás mal, no le pega a nadie.',
        vfx: { color: '#80ed99' },
        cast(caster) {
            const range = val(this, caster, 'range');
            const aim = caster.aimPoint || nearestEnemy(caster, range);
            if (!aim || Math.hypot(aim.x - caster.x, aim.y - caster.y) > range) { log('Mezcla Inestable: sin objetivo en rango.'); return false; }
            const dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio');
            const stunDuration = val(this, caster, 'stunDuration');
            fireSkillProjectile(caster, {
                tx: aim.x, ty: aim.y, speed: val(this, caster, 'speed'), radius: val(this, caster, 'radius'),
                dmg, dmgType: 'magical', vfx: this.vfx, skillName: this.name,
                onHit: (target, dealt) => {
                    if (target.isAlive()) addEffect(target, { id: 'STUN', name: 'Aturdido', duration: stunDuration, flags: ['stun'] });
                    log(`💥 ¡Mezcla Inestable a ${target.label}! (-${dealt} HP)`);
                }
            });
            return true;
        }
    },
    ALCHEMIST_POTION: {
        id: 'ALCHEMIST_POTION', name: 'Elixir Restaurador', kind: 'passive',
        tags: ['CURACIÓN'],
        values: { hpPerSecond: [4, 8, 12, 16], intRatio: 0.1 },
        description: 'Pasiva: regenerás {hpPerSecond} + {intRatio%} de tu Inteligencia de vida por segundo.',
        hooks: {
            onTick(owner, { dt }) {
                if (!owner.isAlive() || !everyInterval(owner, this.id, dt)) return;
                healUnit(owner, val(this, owner, 'hpPerSecond') + owner.int * val(this, owner, 'intRatio'));
            }
        }
    },
    ALCHEMIST_CHEMICAL: {
        id: 'ALCHEMIST_CHEMICAL', name: 'Furia Química', kind: 'active', isUltimate: true,
        tags: ['MEJORA', 'AL_MATAR'],
        values: { cooldown: [50, 45, 40], manaCost: [80, 100, 120], duration: 8, atkSpeedPct: [0.4, 0.6, 0.8], moveSpeedPct: [0.2, 0.3, 0.4], intPerKill: [1, 1.5, 2] },
        // Rebalanceo para la Torre (REWORK.md §2, fase 3): números más chicos para andar como activa común.
        towerValues: { cooldown: [14, 12, 10], manaCost: [45, 55, 65], duration: 5, atkSpeedPct: [0.22, 0.32, 0.42], moveSpeedPct: [0.1, 0.15, 0.2], intPerKill: [0.5, 0.75, 1] },
        description: 'DEFINITIVA. Frenesí químico por {duration}s: +{atkSpeedPct%} de velocidad de ataque y +{moveSpeedPct%} de velocidad de movimiento. ASCENSO: cada baja durante la Furia te da +{intPerKill} de Inteligencia permanente.',
        cast(caster) {
            const skill = this;
            addEffect(caster, {
                id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: ['MEJORA'],
                mods: { atkSpeedPct: val(this, caster, 'atkSpeedPct'), moveSpeedPct: val(this, caster, 'moveSpeedPct') },
                hooks: { onKill(owner) { grantPermanent(owner, 'int', val(skill, owner, 'intPerKill'), skill.name); } }
            });
            log('🧪 ¡Furia Química!');
            return true;
        }
    }
});
