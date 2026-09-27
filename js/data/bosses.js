// Jefes de ronda (DISEÑO.md §9 bis): cada 5 rondas, después de los duelos, todos los héroes en juego pelean juntos contra uno.
// Uno por escalón (ronda 5, 10, 15 y 20). Mismo formato que un tipo de creep (ver data/creeps.js), más:
//   hpPerHero: vida por cada héroe que pelea (se multiplica además por el crecimiento de los creeps de la ronda).
//   update(c, dt): su mecánica; devuelve false para que además ataque normalmente.
// Vida y daño medidos con partidas simuladas: con ~5 héroes, el jefe cae en ~30-45s y a veces mata a alguno (DISEÑO.md §9 bis).

const ROUND_BOSSES = [
    {
        key: 'GOLEM', label: 'Gólem Ancestral', symbol: 'Ω', color: '#adb5bd',
        hp: 2700, hpPerHero: 2700, atk: 54, atkSpeed: 0.8, moveInterval: 420, range: 1.8, gold: 0, xp: 0, armor: 5, magicResist: 20,
        slamEvery: 6, slamRadius: 3, slamStun: 1,
        mechanic: 'Cada 6s, Golpe Sísmico: daño mágico a los héroes a 3 casillas o menos y los aturde 1s.',
        update(c, dt) {
            if (!everyInterval(c, 'slam', dt, this.slamEvery)) return false;
            const hit = bossTargets(c).filter(h => Math.hypot(h.x - c.x, h.y - c.y) <= this.slamRadius);
            hit.forEach(h => {
                dealDamage(c, h, Math.round(c.atk * 1.5), 'magical');
                if (h.isAlive()) addEffect(h, { id: 'STUN', name: 'Aturdido', duration: this.slamStun, flags: ['stun'] });
            });
            if (hit.length) log(`🪨 ¡Golpe Sísmico del ${c.label}! (${hit.length} héroe${hit.length > 1 ? 's' : ''})`);
            return false;
        }
    },
    {
        key: 'HIVE_QUEEN', label: 'Reina de la Colmena', symbol: 'Ω', color: '#b5e48c',
        hp: 2800, hpPerHero: 2800, atk: 54, atkSpeed: 0.9, moveInterval: 380, range: 3, gold: 0, xp: 0, armor: 3, magicResist: 25,
        attackType: 'magical', summonEvery: 8, summonCount: 4, maxSummons: 12,
        mechanic: 'Ataca a distancia con daño mágico. Cada 8s invoca 4 Enjambres (hasta 12 a la vez).',
        update(c, dt) {
            if (!everyInterval(c, 'summon', dt, this.summonEvery)) return false;
            const alive = c.arena.creeps.filter(o => o.isAlive() && o !== c).length;
            const count = Math.min(this.summonCount, this.maxSummons - alive);
            for (let i = 0; i < count; i++) {
                const x = Math.max(0, Math.min(COLS - 1, c.x + (i % 2 ? 1 : -1)));
                const y = Math.max(0, Math.min(ROWS - 1, c.y + (i < 2 ? -1 : 1)));
                const s = makeCreep(CREEP_TYPES.SWARM, x, y, c.statMult * 2, false, 0);
                s.arena = c.arena; s.gold = 1;
                c.arena.creeps.push(s);
            }
            if (count > 0) log(`🐝 La ${c.label} invoca ${count} Enjambres.`);
            return false;
        }
    },
    {
        key: 'FROST_DRAGON', label: 'Dragón de Escarcha', symbol: 'Ω', color: '#90e0ef',
        hp: 2000, hpPerHero: 2000, atk: 56, atkSpeed: 0.7, moveInterval: 400, range: 3.5, gold: 0, xp: 0, armor: 4, magicResist: 30,
        attackType: 'magical', breathEvery: 7, breathTargets: 3, breathSlow: 0.4, breathSlowFor: 3,
        mechanic: 'Ataca a distancia con daño mágico. Cada 7s, Aliento Helado: mucho daño mágico a los 3 héroes más cercanos y los ralentiza 40% por 3s.',
        update(c, dt) {
            if (!everyInterval(c, 'breath', dt, this.breathEvery)) return false;
            const hit = bossTargets(c).sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y)).slice(0, this.breathTargets);
            hit.forEach(h => {
                dealDamage(c, h, Math.round(c.atk * 2), 'magical');
                if (h.isAlive()) addEffect(h, { id: 'FROST_BREATH', name: 'Aliento Helado', duration: this.breathSlowFor, mods: { moveSpeedPct: -this.breathSlow } });
            });
            if (hit.length) log(`❄️ ¡Aliento Helado del ${c.label}!`);
            return false;
        }
    },
    {
        key: 'ABYSS_LORD', label: 'Señor del Abismo', symbol: 'Ω', color: '#9d0208',
        hp: 3000, hpPerHero: 3000, atk: 72, atkSpeed: 0.8, moveInterval: 400, range: 1.8, gold: 0, xp: 0, armor: 6, magicResist: 30,
        flameEvery: 5, flamePct: 0.06, furyAt: 0.5, furyAtkSpeed: 0.6,
        mechanic: 'Cada 5s, Llamarada: daño puro del 6% de la vida máxima a todos los héroes. Con menos de la mitad de vida entra en Furia: +60% de velocidad de ataque.',
        update(c, dt) {
            if (!c.furious && c.hp / c.maxHp < this.furyAt) {
                c.furious = true;
                addEffect(c, { id: 'ABYSS_FURY', name: 'Furia', duration: Infinity, mods: { atkSpeedPct: this.furyAtkSpeed } });
                log(`🔥 ¡El ${c.label} entra en Furia!`);
            }
            if (!everyInterval(c, 'flame', dt, this.flameEvery)) return false;
            bossTargets(c).forEach(h => dealDamage(c, h, Math.round(h.maxHp * this.flamePct), 'pure'));
            log(`🔥 ¡Llamarada del ${c.label}!`);
            return false;
        }
    }
];
