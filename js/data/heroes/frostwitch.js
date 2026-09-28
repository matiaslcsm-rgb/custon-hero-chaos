// Bruja del Hielo (Inteligencia) — control de masas y ralentización. Diseño base: Gemini.
registerHero({
    key: 'FROSTWITCH', name: 'Bruja del Hielo', symbol: 'F', primaryAttr: 'INT', role: 'Control de masas y ralentización',
    attributes: { str: [17, 1.7], agi: [12, 1.2], int: [23, 3.0] },
    baseHp: 95, baseAtk: 7, baseAtkSpeed: 0.65, baseAttackRange: 4,
    baseArmor: 1, baseMagicResist: 15, baseHpRegen: 0.5,
    baseMaxMana: 130, baseManaRegen: 2.1, baseMoveSpeed: 2.4, baseProjectileSpeed: 9,
    baseCritChance: 5, baseEvasion: 5, baseSpellAmp: 0, baseLifesteal: 0,
    description: 'Inteligencia: congela a sus enemigos, les quita movilidad y los desgasta con frío extremo.',
    scaling: { stat: 'maxHp', perKills: 10, perKillsAmount: 12, perHeroKill: 35 },
    innate: {
        id: 'FROSTWITCH_INNATE', name: 'Escarcha Profunda', tags: ['MÁGICO', 'CONTROL'],
        description: 'Innato: todo tu daño mágico ralentiza al objetivo 15% durante 3s (no se acumula consigo mismo).',
        hooks: {
            onDealDamage(owner, { target, type }) {
                if (type !== 'magical' || !target.isAlive()) return;
                addEffect(target, { id: 'FROSTWITCH_DEEP_FROST', name: 'Escarcha Profunda', duration: 3, mods: { moveSpeedPct: -0.15 } });
            }
        }
    }
}, {
    FROSTWITCH_BLAST: {
        id: 'FROSTWITCH_BLAST', name: 'Explosión Helada', kind: 'active', pointTarget: true,
        tags: ['MÁGICO', 'ÁREA', 'CONTROL'],
        values: { cooldown: [11, 10, 9, 8], manaCost: [40, 45, 50, 55], baseDmg: [60, 100, 140, 180], intRatio: 0.5, range: 5, radius: 2.5, stunDuration: [0.6, 0.8, 1.0, 1.2], speed: 11 }, // más corto tras medir
        description: 'Rompe el suelo donde apuntes (rango {range}): {baseDmg} + {intRatio%} de tu Inteligencia como daño mágico y aturde {stunDuration}s a los enemigos en radio {radius}. Proyectil real: si apuntás mal, no le pega a nadie.',
        vfx: { color: '#48cae4' },
        cast(caster) {
            const range = val(this, caster, 'range');
            const aim = caster.aimPoint || nearestEnemy(caster, range);
            if (!aim || Math.hypot(aim.x - caster.x, aim.y - caster.y) > range) { log('Explosión Helada: sin objetivo en rango.'); return false; }
            const radius = val(this, caster, 'radius'), stun = val(this, caster, 'stunDuration');
            const dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio');
            fireSkillProjectile(caster, {
                tx: aim.x, ty: aim.y, speed: val(this, caster, 'speed'), radius,
                dmg, dmgType: 'magical', vfx: this.vfx, skillName: this.name,
                onHit: (target, dealt) => {
                    if (target.isAlive()) addEffect(target, { id: 'STUN', name: 'Aturdido', duration: stun, flags: ['stun'] });
                    log(`❄️ ¡Explosión Helada a ${target.label}! (-${dealt} HP)`);
                }
            });
            return true;
        }
    },
    FROSTWITCH_ARMOR: {
        id: 'FROSTWITCH_ARMOR', name: 'Armadura de Escarcha', kind: 'active',
        tags: ['MEJORA', 'AL_RECIBIR_DAÑO', 'CONTROL'],
        values: { cooldown: [15, 14, 13, 12], manaCost: [45, 50, 55, 60], duration: 5, armorBonus: [3, 4, 5, 6], attackerSlow: [0.15, 0.2, 0.25, 0.3], slowDuration: 3 }, // bajado tras medir (ganaba 76% de duelos)
        description: 'Te cubre con hielo por {duration}s: +{armorBonus} de armadura, y quien te golpee pierde {attackerSlow%} de velocidad de ataque por {slowDuration}s.',
        cast(caster) {
            const skill = this;
            addEffect(caster, {
                id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: ['MEJORA'],
                mods: { armor: val(this, caster, 'armorBonus') },
                hooks: {
                    onDamaged(owner, { source }) {
                        if (!source || !source.isAlive()) return;
                        addEffect(source, {
                            id: 'FROSTWITCH_CHILLED', name: 'Ataque congelado', duration: val(skill, owner, 'slowDuration'),
                            mods: { atkSpeedPct: -val(skill, owner, 'attackerSlow') }
                        });
                    }
                }
            });
            log(`🛡️ ¡Armadura de Escarcha! +${val(this, caster, 'armorBonus')} de armadura.`);
            return true;
        }
    },
    FROSTWITCH_AURA: {
        id: 'FROSTWITCH_AURA', name: 'Presencia Glacial', kind: 'passive',
        tags: ['MÁGICO', 'DAÑO_EN_EL_TIEMPO', 'ÁREA'],
        values: { radius: 3, dmgPerSecond: [10, 17, 24, 31], intRatio: 0.15 }, // −30% tras medir
        description: 'Pasiva: los enemigos en radio {radius} sufren {dmgPerSecond} + {intRatio%} de tu Inteligencia como daño mágico por segundo.',
        hooks: {
            onTick(owner, { dt }) {
                if (!owner.isAlive() || !everyInterval(owner, this.id, dt)) return;
                const radius = val(this, owner, 'radius');
                const dmg = val(this, owner, 'dmgPerSecond') + owner.int * val(this, owner, 'intRatio');
                enemiesOf(owner).forEach(c => {
                    if (c.isAlive() && Math.hypot(c.x - owner.x, c.y - owner.y) <= radius) dealDamage(owner, c, dmg, 'magical');
                });
            }
        }
    },
    FROSTWITCH_ZERO: {
        id: 'FROSTWITCH_ZERO', name: 'Cero Absoluto', kind: 'active', isUltimate: true,
        tags: ['MÁGICO', 'ÁREA', 'CONTROL', 'AL_MATAR'],
        values: { cooldown: [65, 55, 45], manaCost: [110, 130, 150], baseDmg: [150, 230, 310], intRatio: 0.8, radius: 4, freeze: 1.5, armorPerKill: [1, 1.5, 2] },
        description: 'DEFINITIVA. Ventisca en radio {radius}: {baseDmg} + {intRatio%} de tu Inteligencia como daño mágico y congela (aturde) {freeze}s. ASCENSO: cada enemigo que mata te da +{armorPerKill} de armadura permanente.',
        cast(caster) {
            const radius = val(this, caster, 'radius');
            const targets = enemiesOf(caster).filter(c => c.isAlive() && Math.hypot(c.x - caster.x, c.y - caster.y) <= radius);
            if (!targets.length) { log('Cero Absoluto: sin enemigos en el radio.'); return false; }
            const dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio');
            targets.forEach(c => {
                addEffect(c, { id: 'STUN', name: 'Congelado', duration: val(this, caster, 'freeze'), flags: ['stun'] });
                dealDamage(caster, c, dmg, 'magical');
                if (!c.isAlive()) grantPermanent(caster, 'armor', val(this, caster, 'armorPerKill'), this.name);
            });
            log(`🥶 ¡Cero Absoluto! ${targets.length} enemigo(s) congelados.`);
            return true;
        }
    }
});
