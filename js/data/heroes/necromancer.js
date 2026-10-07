// Nigromante (Inteligencia) — rework fiel a Necrophos de Dota 2 (pedido del usuario 2026-09-28, ver
// https://dota2.fandom.com/wiki/Necrophos), adaptado a nuestro motor. Identidad: desgasta con un aura que
// quita % de vida máxima, se vuelve espectral para sobrevivir ráfagas físicas, y remata con una definitiva
// que ejecuta a quien le queda poca vida. Los números de Dota son para partidas de 40+ min; acá se reescalan
// al resto del roster (ver DISEÑO.md §6).
registerHero({
    key: 'NECROMANCER', name: 'Nigromante', symbol: 'N', primaryAttr: 'INT', role: 'Desgaste y ejecución a distancia',
    attributes: { str: [18, 1.8], agi: [11, 1.1], int: [22, 3.1] },
    baseHp: 160, baseAtk: 12, baseAtkSpeed: 0.95, baseAttackRange: 3,
    baseArmor: 1, baseMagicResist: 15, baseHpRegen: 0.5,
    baseMaxMana: 130, baseManaRegen: 1.8, baseMoveSpeed: 2.6, baseProjectileSpeed: 8,
    baseCritChance: 5, baseEvasion: 5, baseSpellAmp: 0, baseLifesteal: 0,
    description: 'Inteligencia: desgasta con un aura que quita vida máxima, se vuelve espectral para sobrevivir y remata con una guadaña que ejecuta a los heridos.',
    scaling: { stat: 'lifesteal', perKills: 10, perKillsAmount: 2, perHeroKill: 5 },
    innate: {
        // "Sadist" de Dota: regeneración por baja, en cargas que se renuevan y se acumulan (hasta un tope);
        // una baja de héroe da varias cargas de una, como en el original.
        id: 'NECROMANCER_INNATE', name: 'Sadista', tags: ['CURACIÓN', 'AL_MATAR'],
        description: 'Innato: cada baja te da una carga de regeneración de vida y maná (+3/s cada una) por 7s, hasta 6 cargas. Si es un héroe, suma 6 cargas de una.',
        regenPerStack: 3, maxStacks: 6, duration: 7, heroKillStacks: 6,
        hooks: {
            onKill(owner, { victim }) {
                const current = getEffect(owner, 'NECROMANCER_SADIST');
                const gained = (victim && victim.isHero) ? this.heroKillStacks : 1;
                const stacks = Math.min(this.maxStacks, (current ? current.data.stacks : 0) + gained);
                addEffect(owner, {
                    id: 'NECROMANCER_SADIST', name: `Sadista x${stacks}`, duration: this.duration, tags: ['MEJORA'],
                    mods: { hpRegen: this.regenPerStack * stacks, manaRegen: this.regenPerStack * stacks }, data: { stacks }
                });
            }
        }
    }
}, {
    NECROMANCER_PULSE: {
        // Death Pulse: pulso centrado en el propio Nigromante (no se apunta), daña a los enemigos alrededor
        // y lo cura a él (en Dota cura también a aliados; acá cada héroe pelea solo, así que cura al propio).
        id: 'NECROMANCER_PULSE', name: 'Pulso de Muerte', kind: 'active',
        tags: ['MÁGICO', 'ÁREA', 'ROBO_VIDA'],
        values: { cooldown: [8, 7, 6, 5], manaCost: [70, 85, 100, 115], baseDmg: [60, 100, 140, 180], intRatio: 0.5, radius: [2.5, 3, 3.5, 4], healPct: [0.3, 0.35, 0.4, 0.45] },
        description: 'Libera un pulso de muerte a tu alrededor (radio {radius}): {baseDmg} + {intRatio%} de tu Inteligencia como daño mágico a los enemigos alcanzados, y te curás {healPct%} de todo lo que dañaste.',
        cast(caster) {
            const radius = val(this, caster, 'radius');
            const dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio');
            const targets = enemiesOf(caster).filter(c => c.isAlive() && Math.hypot(c.x - caster.x, c.y - caster.y) <= radius);
            if (!targets.length) { log('Pulso de Muerte: sin enemigos en el radio.'); return false; }
            let total = 0;
            targets.forEach(c => { total += dealDamage(caster, c, dmg, 'magical').dealt; });
            const healed = healUnit(caster, total * val(this, caster, 'healPct'), { fromDamage: true });
            log(`💀 ¡Pulso de Muerte! ${targets.length} enemigo(s) alcanzados, +${healed} HP.`);
            return true;
        }
    },
    NECROMANCER_AURA: {
        // Heartstopper Aura: quita % de la vida MÁXIMA por segundo a todo el que esté cerca, como daño puro
        // (en Dota ignora reducción de daño). El desgaste constante contra oleadas largas o tanques.
        id: 'NECROMANCER_AURA', name: 'Aura que Detiene el Corazón', kind: 'passive',
        tags: ['PURO', 'DAÑO_EN_EL_TIEMPO', 'ÁREA'],
        values: { radius: 4, hpDmgPct: [0.015, 0.02, 0.025, 0.03] },
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
    NECROMANCER_SHROUD: {
        // Ghost Shroud: se vuelve espectral. Inmune a daño físico y desarmado (sigue moviéndose, a diferencia
        // de un aturdimiento), pero pierde resistencia mágica y cura más mientras dura. Al activarse, ralentiza
        // a quien tenga cerca (el "aura de frío" del original).
        id: 'NECROMANCER_SHROUD', name: 'Manto Fantasma', kind: 'active',
        tags: ['MEJORA', 'CONTROL'],
        values: { cooldown: [26, 22, 18, 14], manaCost: [60, 65, 70, 75], duration: [3, 3.5, 4, 4.5], slowRadius: 4, slowPct: 0.3, magicResistPenalty: 40, healingBonusPct: 0.5 },
        // Rebalanceo para la Torre (fase 3, "armar y balancear lo que tenemos"): el enfriamiento/maná quedaban
        // el doble que cualquier otra activa de guantes (la siguiente más cara: 15s/45 maná); la bajamos a la par.
        towerValues: { cooldown: [16, 14, 12], manaCost: [45, 50, 55] },
        description: 'Te volvés espectral por {duration}s: inmune a daño físico (pero no podés atacar), con {magicResistPenalty} puntos menos de resistencia mágica y {healingBonusPct%} más de curación recibida. Al activarse, ralentiza {slowPct%} a los enemigos en radio {slowRadius}.',
        cast(caster) {
            const duration = val(this, caster, 'duration');
            addEffect(caster, {
                id: this.id, name: this.name, duration, tags: ['MEJORA'], flags: ['physicalImmune', 'disarm'],
                mods: { magicResist: -val(this, caster, 'magicResistPenalty'), healingTakenPct: val(this, caster, 'healingBonusPct') }
            });
            const radius = val(this, caster, 'slowRadius'), slow = val(this, caster, 'slowPct');
            let hits = 0;
            enemiesOf(caster).forEach(c => {
                if (c.isAlive() && Math.hypot(c.x - caster.x, c.y - caster.y) <= radius) {
                    addEffect(c, { id: 'NECROMANCER_SHROUD_SLOW', name: 'Escarcha espectral', duration, mods: { moveSpeedPct: -slow } });
                    hits++;
                }
            });
            log(`👻 ¡Manto Fantasma! Espectral por ${duration}s${hits ? `, ralentizó a ${hits}` : ''}.`);
            return true;
        }
    },
    NECROMANCER_REAP: {
        // Reaper's Scythe: aturde y, al terminar el aturdimiento, hace daño puro según cuánta vida le falta al
        // objetivo — si alcanza, muere ahí mismo (ejecución). Si lo mata, gana regeneración de vida y maná
        // permanente, como el original.
        id: 'NECROMANCER_REAP', name: 'Guadaña del Segador', kind: 'active', isUltimate: true,
        tags: ['PURO', 'CONTROL', 'AL_MATAR'],
        values: { cooldown: [75, 65, 55], manaCost: [130, 150, 170], range: 6, stunDuration: 1.5, missingHpRatio: [0.7, 0.8, 0.9], hpRegenPerKill: [2, 4, 6], manaRegenPerKill: [1, 2, 3] },
        // Rebalanceo para la Torre (REWORK.md §2, fase 3): el umbral de ejecución baja (si no, con este
        // enfriamiento sería un botón de "matalo" casi siempre disponible) y números más chicos en general.
        towerValues: { cooldown: [13, 11, 9], manaCost: [55, 65, 75], stunDuration: 1.0, missingHpRatio: [0.45, 0.55, 0.65], hpRegenPerKill: [1, 2, 3], manaRegenPerKill: [0.5, 1, 1.5] },
        description: 'DEFINITIVA. Aturde al enemigo objetivo (rango {range}) por {stunDuration}s; al terminar, le hace daño puro igual al {missingHpRatio%} de la vida que le falta — si alcanza, muere. Si lo mata, ganás para siempre +{hpRegenPerKill} de regen. de vida/s y +{manaRegenPerKill} de regen. de maná/s.',
        cast(caster) {
            const target = nearestEnemy(caster, val(this, caster, 'range'));
            if (!target) { log('Guadaña del Segador: sin objetivo en rango.'); return false; }
            const ratio = val(this, caster, 'missingHpRatio');
            const stunDuration = val(this, caster, 'stunDuration');
            const hpRegenPerKill = val(this, caster, 'hpRegenPerKill'), manaRegenPerKill = val(this, caster, 'manaRegenPerKill');
            const skillName = this.name;
            const resolve = () => {
                if (!target.isAlive()) return;
                const dmg = Math.max(0, target.maxHp - target.hp) * ratio;
                dealDamage(caster, target, dmg, 'pure');
                if (!target.isAlive()) {
                    grantPermanent(caster, 'hpRegen', hpRegenPerKill, skillName);
                    grantPermanent(caster, 'manaRegen', manaRegenPerKill, skillName);
                }
            };
            // El daño se calcula al TERMINAR el aturdimiento (como en Dota): si es inmune y no lo pudo
            // aturdir, igual se aplica de una para que la definitiva no quede en la nada.
            const stunned = addEffect(target, { id: 'STUN', name: 'Aturdido', duration: stunDuration, flags: ['stun'], hooks: { onExpire: resolve } });
            if (!stunned) resolve();
            log(`💀 ¡Guadaña del Segador a ${target.label}!`);
            return true;
        }
    }
});
