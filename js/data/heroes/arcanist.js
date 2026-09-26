// Arcanista (Inteligencia) — mago de ráfaga que acumula cargas lanzando hechizos. Diseño base: Gemini.
registerHero({
    key: 'ARCANIST', name: 'Arcanista', symbol: 'A', primaryAttr: 'INT', role: 'Mago de ráfaga y escalado',
    attributes: { str: [15, 1.5], agi: [13, 1.3], int: [25, 3.4] },
    baseHp: 110, baseAtk: 8, baseAtkSpeed: 0.9, baseAttackRange: 4,
    baseArmor: 0, baseMagicResist: 15, baseHpRegen: 0.5,
    baseMaxMana: 140, baseManaRegen: 2.2, baseMoveSpeed: 2.7, baseProjectileSpeed: 10,
    baseCritChance: 5, baseEvasion: 5, baseSpellAmp: 0, baseLifesteal: 0,
    description: 'Inteligencia: acumula cargas arcanas lanzando hechizos para desatar ráfagas de daño devastadoras.',
    scaling: { stat: 'atk', perKills: 8, perKillsAmount: 4, perHeroKill: 12 },
    innate: {
        id: 'ARCANIST_INNATE', name: 'Resonancia Arcana', tags: ['MÁGICO', 'AL_LANZAR'],
        description: 'Innato: cada habilidad que lanzás da 1 carga de Resonancia Arcana por 6s (máx. 5). Cada carga da +8% de amplificación de hechizo.',
        hooks: {
            onCast(owner) {
                const current = getEffect(owner, 'ARCANIST_RESONANCE');
                const stacks = current ? Math.min(current.data.stacks + 1, 5) : 1;
                addEffect(owner, {
                    id: 'ARCANIST_RESONANCE', name: `Resonancia Arcana x${stacks}`, duration: 6, tags: ['MEJORA'],
                    mods: { spellAmp: 8 * stacks }, data: { stacks }
                });
            }
        }
    }
}, {
    ARCANIST_BOLT: {
        id: 'ARCANIST_BOLT', name: 'Proyectil Arcano', kind: 'active',
        tags: ['MÁGICO', 'ÁREA'],
        values: { cooldown: [8, 7, 6, 5], manaCost: [35, 40, 45, 50], baseDmg: [55, 95, 135, 175], intRatio: 0.6, range: 6, radius: 2 },
        description: 'Lanza una esfera arcana al enemigo más cercano (rango {range}): {baseDmg} + {intRatio%} de tu Inteligencia como daño mágico a él y a los enemigos en radio {radius}.',
        cast(caster) {
            const target = nearestEnemy(caster, val(this, caster, 'range'));
            if (!target) { log('Proyectil Arcano: sin enemigo en rango.'); return false; }
            const dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio');
            const radius = val(this, caster, 'radius');
            let hits = 0;
            enemiesOf(caster).forEach(c => {
                if (c.isAlive() && Math.hypot(c.x - target.x, c.y - target.y) <= radius) { dealDamage(caster, c, dmg, 'magical'); hits++; }
            });
            log(`✨ ¡Proyectil Arcano! ${hits} enemigo(s) alcanzados.`);
            return true;
        }
    },
    ARCANIST_SHIELD: {
        id: 'ARCANIST_SHIELD', name: 'Barrera de Maná', kind: 'active',
        tags: ['MEJORA', 'CONTROL'],
        values: { cooldown: [14, 13, 12, 11], manaCost: [50, 55, 60, 65], duration: [3, 3.5, 4, 4.5], dmgReduction: 0.25, slow: [0.3, 0.4, 0.5, 0.6], radius: 3 },
        description: 'Te cubre con una barrera por {duration}s que reduce el daño recibido {dmgReduction%} y ralentiza {slow%} a los enemigos en radio {radius} durante el mismo tiempo.',
        cast(caster) {
            const duration = val(this, caster, 'duration'), slow = val(this, caster, 'slow'), radius = val(this, caster, 'radius');
            let hits = 0;
            enemiesOf(caster).forEach(c => {
                if (c.isAlive() && Math.hypot(c.x - caster.x, c.y - caster.y) <= radius) {
                    addEffect(c, { id: 'ARCANIST_SHIELD_SLOW', name: 'Atadura Arcana', duration, mods: { moveSpeedPct: -slow } });
                    hits++;
                }
            });
            addEffect(caster, { id: this.id, name: this.name, duration, tags: ['MEJORA'], mods: { dmgReduction: val(this, caster, 'dmgReduction') } });
            log(`🛡️ ¡Barrera de Maná! Ralentizó a ${hits} enemigo(s).`);
            return true;
        }
    },
    ARCANIST_SURGE: {
        id: 'ARCANIST_SURGE', name: 'Sobrecarga Mágica', kind: 'passive',
        tags: ['MÁGICO', 'AL_LANZAR', 'AL_GOLPEAR'],
        values: { bonusDmg: [20, 40, 60, 80], intRatio: [0.25, 0.35, 0.45, 0.55], window: 4 },
        description: 'Pasiva: cada vez que lanzás una habilidad, tu siguiente ataque básico (dentro de {window}s) suma {bonusDmg} + {intRatio%} de tu Inteligencia como daño mágico.',
        hooks: {
            onCast(owner) {
                const skill = this;
                addEffect(owner, {
                    id: 'ARCANIST_SURGE_READY', name: 'Sobrecarga lista', duration: val(skill, owner, 'window'), tags: ['MEJORA'],
                    hooks: {
                        onHit(attacker, { target }) {
                            removeEffect(attacker, 'ARCANIST_SURGE_READY');
                            if (!target.isAlive()) return;
                            const extra = val(skill, attacker, 'bonusDmg') + attacker.int * val(skill, attacker, 'intRatio');
                            const { dealt } = dealDamage(attacker, target, extra, 'magical');
                            log(`⚡ ¡Sobrecarga Mágica! +${dealt} de daño mágico.`);
                        }
                    }
                });
            }
        }
    },
    ARCANIST_OVERLOAD: {
        id: 'ARCANIST_OVERLOAD', name: 'Cataclismo Arcano', kind: 'active', isUltimate: true,
        tags: ['MÁGICO', 'ÁREA', 'AL_MATAR'],
        values: { cooldown: [60, 50, 40], manaCost: [100, 125, 150], baseDmg: [160, 240, 320], intRatio: 1.0, radius: 4, maxHpPerKill: [15, 25, 35] },
        description: 'DEFINITIVA. Explosión en radio {radius}: {baseDmg} + {intRatio%} de tu Inteligencia como daño mágico. ASCENSO: cada enemigo que mata te da +{maxHpPerKill} de HP máximo permanente.',
        cast(caster) {
            const radius = val(this, caster, 'radius');
            const targets = enemiesOf(caster).filter(c => c.isAlive() && Math.hypot(c.x - caster.x, c.y - caster.y) <= radius);
            if (!targets.length) { log('Cataclismo Arcano: sin enemigos en el radio.'); return false; }
            const dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio');
            targets.forEach(c => {
                dealDamage(caster, c, dmg, 'magical');
                if (!c.isAlive()) grantPermanent(caster, 'maxHp', val(this, caster, 'maxHpPerKill'), this.name);
            });
            log(`💥 ¡Cataclismo Arcano! ${targets.length} enemigo(s) alcanzados.`);
            return true;
        }
    }
});
