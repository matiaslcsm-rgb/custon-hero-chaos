// Jefes de ronda (DISEÑO.md §9 bis): cada 5 rondas, después de los duelos, cada héroe pelea contra un jefe en su propia arena.
// En cada ronda de jefe se sortea UNO de esta lista (el mismo para todos, sin repetir el anterior).
// Mismo formato que un tipo de creep (ver data/creeps.js), más:
//   hp, atk             valores base; se multiplican por el crecimiento de los creeps de la ronda (creepStatMult)
//   mechanic            qué hace (se muestra en el aviso y en el códice)
//   escalation          cómo se vuelve más difícil DURANTE la pelea (cada jefe tiene su forma)
//   update(c, dt)       su mecánica; devuelve false para que además ataque normalmente
//   onAttack(c, t, r)   después de cada ataque suyo
// Además, como las oleadas, pasado BOSS_FIGHT.enrageAfter se enfurece cada segundo más (ver bosses.js).
// Las cuentas por instancia (fases, cabezas, barreras...) se guardan en el propio jefe (c).

function bossTarget(c) { return c.arena.heroes.find(h => !h.eliminated && h.isAlive()) || null; }
function bossDist(c, h) { return Math.hypot(h.x - c.x, h.y - c.y); }

const ROUND_BOSSES = [
    {
        key: 'GOLEM', label: 'Gólem Ancestral', symbol: 'Ω', color: '#adb5bd',
        hp: 1400, atk: 36, atkSpeed: 0.8, moveInterval: 420, range: 1.8, gold: 0, xp: 0, armor: 5, magicResist: 20,
        mechanic: 'Golpe Sísmico: cada pocos segundos, daño mágico a 3 casillas o menos y aturde 1s.',
        escalation: 'Fases: al 66% y al 33% de vida gana +3 de armadura y el Golpe Sísmico sale más seguido (6s → 4,5s → 3s).',
        update(c, dt) {
            c.phase = c.phase || 0;
            const next = c.hp / c.maxHp < 0.33 ? 2 : c.hp / c.maxHp < 0.66 ? 1 : 0;
            if (next > c.phase) { c.phase = next; c.armor += 3; fxRing(c, '#adb5bd', 2.5, 0.8); log(`🪨 ¡El ${c.label} entra en la fase ${next + 1}! Más armadura y golpes más seguidos.`); }
            if (!everyInterval(c, 'slam', dt, 6 - c.phase * 1.5)) return false;
            const h = bossTarget(c);
            fxRing(c, '#adb5bd', 3, 0.6); fxShake(4);
            if (h && bossDist(c, h) <= 3) {
                dealDamage(c, h, Math.round(c.atk * 1.2 * enrageMult(c.arena)), 'magical');
                if (h.isAlive()) addEffect(h, { id: 'STUN', name: 'Aturdido', duration: 1, flags: ['stun'] });
            }
            return false;
        }
    },
    {
        key: 'HIVE_QUEEN', label: 'Reina de la Colmena', symbol: 'Ω', color: '#b5e48c',
        hp: 1700, atk: 34, atkSpeed: 0.9, moveInterval: 380, range: 3, gold: 0, xp: 0, armor: 3, magicResist: 25, attackType: 'magical',
        mechanic: 'Ataca a distancia con daño mágico. Cada 8s invoca Enjambres.',
        escalation: 'Cada invocación trae un Enjambre más que la anterior (4, 5, 6… hasta 10; como mucho 16 a la vez).',
        update(c, dt) {
            if (!everyInterval(c, 'summon', dt, 8)) return false;
            c.summons = (c.summons || 0) + 1;
            const alive = c.arena.creeps.filter(o => o.isAlive() && o !== c).length;
            const count = Math.min(3 + c.summons, 10, 16 - alive);
            for (let i = 0; i < count; i++) {
                const x = Math.max(0, Math.min(COLS - 1, c.x + (i % 3) - 1)), y = Math.max(0, Math.min(ROWS - 1, c.y + Math.floor(i / 3) - 1));
                const s = makeCreep(CREEP_TYPES.SWARM, x, y, c.statMult * 2, false, 0);
                s.arena = c.arena; s.gold = 1;
                c.arena.creeps.push(s);
            }
            if (count > 0) { fxRing(c, '#b5e48c', 2, 0.6); log(`🐝 La ${c.label} invoca ${count} Enjambres.`); }
            return false;
        }
    },
    {
        key: 'FROST_DRAGON', label: 'Dragón de Escarcha', symbol: 'Ω', color: '#90e0ef',
        hp: 1600, atk: 40, atkSpeed: 0.7, moveInterval: 400, range: 3.5, gold: 0, xp: 0, armor: 4, magicResist: 30, attackType: 'magical',
        mechanic: 'Ataca a distancia con daño mágico. Aliento Helado: mucho daño mágico y te ralentiza 40% por 3s.',
        escalation: 'Cada Aliento sale 1s antes que el anterior (de cada 7s hasta cada 3s).',
        update(c, dt) {
            c.breathEvery = c.breathEvery || 7;
            if (!everyInterval(c, 'breath', dt, c.breathEvery)) return false;
            c.breathEvery = Math.max(3, c.breathEvery - 1);
            const h = bossTarget(c);
            if (!h || bossDist(c, h) > 5) return false;
            fxBurst(h, '#90e0ef', 12, 3);
            dealDamage(c, h, Math.round(c.atk * 2 * enrageMult(c.arena)), 'magical');
            if (h.isAlive()) addEffect(h, { id: 'FROST_BREATH', name: 'Aliento Helado', duration: 3, mods: { moveSpeedPct: -0.4 } });
            log(`❄️ ¡Aliento Helado del ${c.label}!`);
            return false;
        }
    },
    {
        key: 'ABYSS_LORD', label: 'Señor del Abismo', symbol: 'Ω', color: '#9d0208',
        hp: 2000, atk: 44, atkSpeed: 0.8, moveInterval: 400, range: 1.8, gold: 0, xp: 0, armor: 6, magicResist: 30,
        mechanic: 'Cada 5s, Llamarada: daño puro según tu vida máxima, estés donde estés.',
        escalation: 'Cada Llamarada quema un poco más (6% de tu vida máxima, +1% por vez, hasta 15%). Con menos de la mitad de vida entra en Furia: +60% de velocidad de ataque.',
        update(c, dt) {
            if (!c.furious && c.hp / c.maxHp < 0.5) {
                c.furious = true;
                addEffect(c, { id: 'ABYSS_FURY', name: 'Furia', duration: Infinity, mods: { atkSpeedPct: 0.6 } });
                log(`🔥 ¡El ${c.label} entra en Furia!`);
            }
            if (!everyInterval(c, 'flame', dt, 5)) return false;
            c.flamePct = Math.min(0.15, (c.flamePct || 0.05) + 0.01);
            const h = bossTarget(c);
            if (!h) return false;
            fxRing(c, '#ff5400', 12, 0.8); fxShake(4);
            dealDamage(c, h, Math.round(h.maxHp * c.flamePct), 'pure');
            log(`🔥 ¡Llamarada del ${c.label}! (${Math.round(c.flamePct * 100)}% de tu vida máxima)`);
            return false;
        }
    },
    {
        key: 'HYDRA', label: 'Hidra de las Ciénagas', symbol: 'Ω', color: '#52b788',
        hp: 1800, atk: 30, atkSpeed: 1.0, moveInterval: 360, range: 1.8, gold: 0, xp: 0, armor: 4, magicResist: 15,
        mechanic: 'Cuerpo a cuerpo, pega rápido.',
        escalation: 'Cada 25% de vida que le sacás le crece una cabeza: +25% de velocidad de ataque y +15% de daño (hasta 3 cabezas nuevas).',
        update(c) {
            const heads = Math.min(3, Math.floor((1 - c.hp / c.maxHp) / 0.25));
            if (heads > (c.heads || 0)) {
                c.heads = heads;
                addEffect(c, { id: 'HYDRA_HEADS', name: `${heads + 1} cabezas`, duration: Infinity, mods: { atkSpeedPct: 0.25 * heads, atkPct: 0.15 * heads } });
                fxBurst(c, '#52b788', 16, 4);
                log(`🐍 ¡A la ${c.label} le crece otra cabeza! (${heads + 1} cabezas)`);
            }
            return false;
        }
    },
    {
        key: 'LICH', label: 'Liche Eterno', symbol: 'Ω', color: '#c77dff',
        hp: 1700, atk: 36, atkSpeed: 0.8, moveInterval: 420, range: 4, gold: 0, xp: 0, armor: 2, magicResist: 40, attackType: 'magical',
        mechanic: 'Ataca a distancia con daño mágico. Cada 12s se cubre con una Barrera que reduce 70% el daño que recibe.',
        escalation: 'Cada Barrera dura 1s más que la anterior (4s, 5s, 6s…). Conviene guardar las habilidades fuertes para cuando se cae.',
        update(c, dt) {
            if (!everyInterval(c, 'barrier', dt, 12)) return false;
            c.barriers = (c.barriers || 0) + 1;
            const duration = 3 + c.barriers;
            addEffect(c, { id: 'LICH_BARRIER', name: 'Barrera', duration, mods: { dmgReduction: 0.7 } });
            fxRing(c, '#c77dff', 1.5, 0.8);
            log(`🛡️ ¡El ${c.label} se cubre con una Barrera (${duration}s, −70% de daño)!`);
            return false;
        }
    },
    {
        key: 'BLOOD_TITAN', label: 'Titán de Sangre', symbol: 'Ω', color: '#e63946',
        hp: 1900, atk: 38, atkSpeed: 0.85, moveInterval: 400, range: 1.8, gold: 0, xp: 0, armor: 5, magicResist: 20,
        mechanic: 'Cuerpo a cuerpo. Se cura con cada golpe que te da (robo de vida).',
        escalation: 'Su robo de vida arranca en 20% y sube +10% cada 8s de pelea. La anticuración (Daga Serrada, Lanza Cortacuras) lo frena.',
        update(c, dt) {
            if (everyInterval(c, 'thirst', dt, 8)) { c.thirst = (c.thirst || 0.2) + 0.1; fxText(c, `robo ${Math.round(c.thirst * 100)}%`, '#e63946', 11); }
            return false;
        },
        onAttack(c, target, result) { if (result.dealt > 0) healUnit(c, result.dealt * (c.thirst || 0.2)); }
    },
    {
        key: 'PHANTOM', label: 'Espectro Errante', symbol: 'Ω', color: '#e0e1dd',
        hp: 1700, atk: 36, atkSpeed: 0.95, moveInterval: 380, range: 1.6, gold: 0, xp: 0, armor: 3, magicResist: 25, evasion: 10,
        mechanic: 'Cada 6s se teletransporta al lado tuyo. Esquiva ataques básicos.',
        escalation: 'Cada teletransporte le suma +6% de evasión (de 10% hasta 55%). Los ataques que no fallan (Hoja Certera) y las habilidades lo contrarrestan.',
        update(c, dt) {
            if (!everyInterval(c, 'blink', dt, 6)) return false;
            const h = bossTarget(c);
            if (!h) return false;
            fxBurst(c, '#e0e1dd', 10, 3);
            blinkNextTo(c, h);
            c.evasion = Math.min(55, c.evasion + 6);
            fxBurst(c, '#e0e1dd', 10, 3);
            log(`👻 ¡El ${c.label} aparece a tu lado! (${c.evasion}% de evasión)`);
            return false;
        }
    }
];
