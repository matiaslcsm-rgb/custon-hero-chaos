// Zeus (Inteligencia) — dios del rayo. Mago de daño mágico puro a distancia: nada de robo de vida ni control
// prolongado, todo el kit es apretar botones y hacer daño. Fiel al Zeus de Dota 2 (Rayo Arco, Rayo Relámpago,
// Campo Estático como innato y Thundergod's Wrath como definitiva, que golpea a TODOS los enemigos vivos de
// su arena sin importar la distancia). Escala por ítems: amplificación de hechizo, reducción de enfriamiento
// y objetos que agreguen efectos a sus habilidades (ver DISEÑO.md §7, "Candidatos a nuevos ítems").
registerHero({
    key: 'ZEUS', name: 'Zeus', symbol: 'Z', primaryAttr: 'INT', role: 'Mago de daño mágico a distancia',
    attributes: { str: [14, 1.4], agi: [14, 1.4], int: [26, 3.6] },
    baseHp: 118, baseAtk: 7, baseAtkSpeed: 0.85, baseAttackRange: 5,
    baseArmor: 0, baseMagicResist: 15, baseHpRegen: 0.4,
    baseMaxMana: 165, baseManaRegen: 2.6, baseMoveSpeed: 2.6, baseProjectileSpeed: 11,
    baseCritChance: 5, baseEvasion: 5, baseSpellAmp: 0, baseLifesteal: 0,
    description: 'Inteligencia: dios del rayo. Hechizos de daño mágico masivo desde lejos; frágil si lo alcanzan cuerpo a cuerpo.',
    // Sin amplificación de hechizo en el escalado (esa la dan los ítems, ver Báculo Arcano y los candidatos nuevos):
    // acá escala Inteligencia, que ya empuja maná, resistencia mágica y el daño de sus hechizos (intRatio).
    scaling: { stat: 'int', perKills: 8, perKillsAmount: 3, perHeroKill: 9 },
    innate: {
        id: 'ZEUS_INNATE', name: 'Campo Estático', tags: ['MÁGICO', 'AL_LANZAR', 'ÁREA'],
        description: 'Innato: cada habilidad que lanzás descarga electricidad en radio 4 a tu alrededor, dañando a los enemigos por el 3,5% de su vida actual (mínimo 20 de daño mágico).',
        pct: 0.035, minDmg: 20, radius: 4,
        hooks: {
            onCast(owner) {
                const skill = this;
                let hits = 0;
                enemiesOf(owner).forEach(c => {
                    if (c.isAlive() && Math.hypot(c.x - owner.x, c.y - owner.y) <= skill.radius) {
                        dealDamage(owner, c, Math.max(skill.minDmg, c.hp * skill.pct), 'magical');
                        hits++;
                    }
                });
                if (hits) fxText(owner, '⚡ Campo Estático', '#ffd60a', 10);
            }
        }
    }
}, {
    ZEUS_ARC: {
        id: 'ZEUS_ARC', name: 'Rayo Arco', kind: 'active',
        tags: ['MÁGICO', 'ÁREA'],
        values: { cooldown: [9, 8, 7, 6], manaCost: [70, 80, 90, 100], baseDmg: [70, 110, 150, 190], intRatio: 0.4, jumps: [3, 4, 5, 6], jumpRange: 4, range: 6 },
        // Rebalanceo para la Torre ("armar y balancear lo que tenemos"): Zeus pagaba 70-115 de maná por
        // activa contra 30-50 del resto del roster; en Caos de Héroes lo compensa el maná que crece por nivel,
        // en la Torre depende solo del equipo. Se recorta a la par de sus pares.
        towerValues: { manaCost: [45, 50, 55] },
        description: 'Lanza un rayo al enemigo más cercano (rango {range}) que salta a otros {jumps} enemigos cercanos (hasta {jumpRange} de un salto al siguiente): {baseDmg} + {intRatio%} de tu Inteligencia como daño mágico por salto.',
        cast(caster) {
            const first = nearestEnemy(caster, val(this, caster, 'range'));
            if (!first) { log('Rayo Arco: sin enemigo en rango.'); return false; }
            const dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio');
            const jumpRange = val(this, caster, 'jumpRange'), maxJumps = val(this, caster, 'jumps');
            const hit = [first];
            let current = first;
            dealDamage(caster, current, dmg, 'magical');
            while (hit.length < maxJumps) {
                let next = null, bestDist = Infinity;
                enemiesOf(caster).forEach(c => {
                    if (!c.isAlive() || hit.includes(c)) return;
                    const d = Math.hypot(c.x - current.x, c.y - current.y);
                    if (d <= jumpRange && d < bestDist) { bestDist = d; next = c; }
                });
                if (!next) break;
                dealDamage(caster, next, dmg, 'magical');
                hit.push(next); current = next;
            }
            log(`⚡ ¡Rayo Arco! Saltó entre ${hit.length} enemigo(s).`);
            return true;
        }
    },
    ZEUS_BOLT: {
        id: 'ZEUS_BOLT', name: 'Rayo Relámpago', kind: 'active', pointTarget: true,
        tags: ['MÁGICO', 'CONTROL'],
        values: { cooldown: [7, 6, 5, 4], manaCost: [85, 95, 105, 115], baseDmg: [100, 165, 230, 295], intRatio: 0.7, stun: [0.3, 0.4, 0.5, 0.6], range: 6, speed: 14, radius: 0.8 },
        towerValues: { manaCost: [50, 55, 60] },
        description: 'Dispara un rayo hacia donde apuntes (rango {range}, radio {radius}): {baseDmg} + {intRatio%} de tu Inteligencia como daño mágico y aturde {stun}s a quien toque. Proyectil real: si apuntás mal y no hay nadie en el área, no le pega a nadie.',
        vfx: { color: '#ffe066' },
        // pointTarget: a diferencia de las demás (que usan nearestEnemy y siempre le "enganchan" al más cercano
        // al cursor), esta viaja de verdad hacia el punto exacto donde clickeaste — con su propia velocidad y
        // radio — y puede fallar. Sin mouse de por medio (teclado o la IA) apunta al enemigo más cercano.
        cast(caster) {
            const range = val(this, caster, 'range');
            const aim = caster.aimPoint || nearestEnemy(caster, range);
            if (!aim || Math.hypot(aim.x - caster.x, aim.y - caster.y) > range) { log('Rayo Relámpago: sin objetivo en rango.'); return false; }
            const dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio');
            const stun = val(this, caster, 'stun');
            fireSkillProjectile(caster, {
                tx: aim.x, ty: aim.y, speed: val(this, caster, 'speed'), radius: val(this, caster, 'radius'),
                dmg, dmgType: 'magical', vfx: this.vfx, skillName: this.name,
                onHit: (target, dealt) => {
                    if (target.isAlive()) addEffect(target, { id: 'STUN', name: 'Aturdido', duration: stun, flags: ['stun'] });
                    log(`🌩️ ¡Rayo Relámpago a ${target.label}! (-${dealt} HP)`);
                }
            });
            return true;
        }
    },
    ZEUS_NIMBUS: {
        id: 'ZEUS_NIMBUS', name: 'Nimbo de Tormenta', kind: 'active',
        tags: ['MÁGICO', 'ÁREA'],
        values: { cooldown: [11, 10, 9, 8], manaCost: [75, 85, 95, 105], baseDmg: [55, 90, 125, 160], intRatio: 0.35, radius: [3, 3.5, 4, 4.5] },
        towerValues: { manaCost: [45, 50, 55] },
        description: 'Hace estallar un nimbo de tormenta a tu alrededor (radio {radius}): {baseDmg} + {intRatio%} de tu Inteligencia como daño mágico a todos los enemigos alcanzados.',
        cast(caster) {
            const dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio');
            const radius = val(this, caster, 'radius');
            let hits = 0;
            enemiesOf(caster).forEach(c => { if (c.isAlive() && Math.hypot(c.x - caster.x, c.y - caster.y) <= radius) { dealDamage(caster, c, dmg, 'magical'); hits++; } });
            if (!hits) { log('Nimbo de Tormenta: sin enemigos en el radio.'); return false; }
            log(`⛈️ ¡Nimbo de Tormenta! ${hits} enemigo(s) alcanzados.`);
            return true;
        }
    },
    ZEUS_WRATH: {
        id: 'ZEUS_WRATH', name: 'Ira del Dios del Trueno', kind: 'active', isUltimate: true,
        tags: ['MÁGICO', 'ÁREA'],
        values: { cooldown: [90, 75, 60], manaCost: [150, 175, 200], baseDmg: [120, 190, 260], intRatio: 0.5 },
        // En la Torre ya no es "la definitiva" (botón de una vez cada rato largo): es una activa más de la
        // armadura, con números propios más chicos para que ande a ese ritmo (REWORK.md §2, fase 3).
        towerValues: { cooldown: [16, 14, 12], manaCost: [70, 80, 90], baseDmg: [55, 90, 125], intRatio: 0.3 },
        description: 'DEFINITIVA. Descarga toda su ira sobre TODOS los enemigos vivos, sin importar dónde estén: {baseDmg} + {intRatio%} de tu Inteligencia como daño mágico a cada uno.',
        cast(caster) {
            const targets = enemiesOf(caster).filter(c => c.isAlive());
            if (!targets.length) { log('Ira del Dios del Trueno: no hay enemigos vivos.'); return false; }
            const dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio');
            targets.forEach(c => dealDamage(caster, c, dmg, 'magical'));
            fxShake(6);
            log(`💥⚡ ¡IRA DEL DIOS DEL TRUENO! ${targets.length} enemigo(s) golpeados en toda la arena.`);
            return true;
        }
    }
});
