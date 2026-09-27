// Duelos 1v1 después de las oleadas de cada ronda. Reglas: DISEÑO.md §9.
//
//   Parejas al azar entre los héroes en juego, evitando repetir el rival de la ronda anterior; si son impares,
//   uno descansa. Cada pareja pelea en su propia arena ('duel'), todas en paralelo.
//   Al empezar: vida y maná llenos, sin mejoras temporales y con los enfriamientos reiniciados.
//   En duelo los héroes se hacen DUEL_DAMAGE_REDUCTION menos daño entre sí (peleas más largas y tácticas).
//   Gana quien mata al otro; si se acaba el tiempo, quien tenga más % de vida.
//   Ganador: +3 puntos y el escalado por duelo de su héroe. Los dos van al Área de Descanso.
//   Perdedor (las vidas NO se pierden en duelos, solo contra creeps):
//     - quedan más de la mitad de los héroes → sin castigo (solo se queda sin los puntos);
//     - quedan la mitad o menos (DUEL_CURSE_ALIVE) → queda Condenado (maldito); si ya lo estaba, +10% de castigo;
//     - quedan DUEL_DEATH_ALIVE o menos → duelo a muerte: si ya estaba Condenado, queda eliminado.
//   Es para que la partida no se estanque cuando todos tienen builds que los creeps no pueden derrotar.

const DUEL_TIME = 45;
const DUEL_DAMAGE_REDUCTION = 0.6; // en duelo, los héroes se hacen 60% menos daño entre sí (sin esto duraban ~3 s)
const DUEL_CURSE_ALIVE = MAX_HEROES / 2; // con esta cantidad de héroes en juego o menos, perder un duelo maldice
const DUEL_DEATH_ALIVE = 3;              // con esta cantidad o menos, perder un duelo estando maldito elimina
const DUEL_STARTS = [{ x: 3, y: 6 }, { x: 16, y: 6 }];

function inCombat() { return gameState === 'WAVE' || gameState === 'DUEL' || gameState === 'BOSS'; }

// Parejas al azar evitando repetir el rival de la ronda anterior. Arma parejas de a una sobre un orden al azar;
// como eso puede dejar al final justo a dos que ya pelearon, prueba varios órdenes y se queda con el que menos repite.
function makeDuelPairs(list) {
    const repeats = pairs => pairs.filter(([a, b]) => a.lastOpponent === b || b.lastOpponent === a).length;
    let best = null;
    for (let attempt = 0; attempt < 40; attempt++) {
        const pool = shuffle(list.slice());
        const pairs = [];
        while (pool.length > 1) {
            const a = pool.shift();
            let idx = pool.findIndex(b => b !== a.lastOpponent && b.lastOpponent !== a);
            if (idx < 0) idx = 0;
            pairs.push([a, pool.splice(idx, 1)[0]]);
        }
        const result = { pairs, bye: pool[0] || null, repeats: repeats(pairs) };
        if (!best || result.repeats < best.repeats) best = result;
        if (best.repeats === 0) break;
    }
    return { pairs: best.pairs, bye: best.bye };
}

// plan: parejas ya sorteadas en la previa de apuestas (ver bets.js).
function startDuels(plan = makeDuelPairs(aliveHeroes())) {
    gameState = 'DUEL';
    const { pairs, bye } = plan;
    arenas = pairs.map(([a, b]) => {
        const arena = makeArena('duel', [a, b]);
        [a, b].forEach((h, i) => {
            restoreHero(h);
            h.inRest = false;
            h.cooldowns = Object.fromEntries(Object.keys(h.cooldowns).map(k => [k, 0]));
            h.respawnAt = 0; h.attackTimer = 0;
            h.x = DUEL_STARTS[i].x; h.y = DUEL_STARTS[i].y;
            h.lastOpponent = i === 0 ? b : a;
        });
        return arena;
    });
    if (bye) bye.arena = null;
    const mine = arenas.find(a => a.heroes.includes(player));
    if (mine) viewedHero = player;
    else if (!viewedHero || !viewedHero.arena) viewedHero = arenas.length ? arenas[0].heroes[0] : player;
    setStateText(`DUELOS · RONDA ${waveNumber}`);
    const rival = mine ? mine.heroes.find(h => h !== player) : null;
    log(`⚔️ ¡Duelos! ${rival ? `Te toca contra ${rival.displayName}.` : player.eliminated ? 'Mirás los duelos.' : 'Esta ronda descansás.'} ` +
        pairs.map(([a, b]) => `${a.name} vs ${b.name}`).join(' · ') + (bye ? ` · descansa ${bye.name}` : ''));
    if (!arenas.length) onDuelsDone();
}

// Resuelve un duelo. Los mensajes de resultado se anuncian siempre.
function resolveDuel(arena, winner, loser, reason) {
    if (arena.done) return;
    arena.done = true;
    const wasMuted = logMuted;
    const involvesPlayer = winner === player || loser === player;
    logMuted = false; // el resultado se anuncia siempre
    const you = loser === player ? 'Perdiste tu duelo' : winner === player ? 'Ganaste tu duelo' : null;
    log(`⚔️ ${winner.displayName} venció a ${loser.displayName}${reason ? ` (${reason})` : ''}.${you ? ` ${you}${winner === player ? ' (+3 puntos)' : ''}.` : ''}`);
    logMuted = !involvesPlayer; // los detalles, solo si es tu duelo
    settleBet(winner, loser);
    winner.points += POINTS.duelWin;
    winner.duelWins++; loser.duelLosses++;
    awardHeroKillScaling(winner);
    emit(winner, 'onKill', { victim: loser });
    [winner, loser].forEach(h => { h.respawnAt = 0; sendToRestArea(h); h.arena = null; });
    penalizeDuelLoser(loser);
    logMuted = wasMuted;
}

// Castigo al perdedor según cuántos héroes siguen en juego (ver arriba).
function penalizeDuelLoser(loser) {
    const alive = aliveHeroes().length;
    if (alive > DUEL_CURSE_ALIVE) return;
    if (alive <= DUEL_DEATH_ALIVE && isCondemned(loser)) {
        eliminateHero(loser, loser === player ? 'Perdiste un duelo a muerte' : `${loser.displayName} perdió un duelo a muerte`);
        return;
    }
    if (isCondemned(loser)) registerDuelLoss(loser);
    else curseHero(loser);
}

// Llamado desde updateArena para las arenas de duelo: vence el tiempo o alguien murió.
function updateDuelArena(arena, dt) {
    arena.elapsed += dt;
    const [a, b] = arena.heroes;
    if (!a.isAlive() || !b.isAlive()) return; // lo resuelve onHeroDeath
    if (arena.elapsed < DUEL_TIME) return;
    const pa = a.hp / a.maxHp, pb = b.hp / b.maxHp;
    const aWins = pa === pb ? Math.random() < 0.5 : pa > pb;
    resolveDuel(arena, aWins ? a : b, aWins ? b : a, 'se acabó el tiempo');
}

// Todos los duelos terminaron: jefe de ronda (cada 5 rondas) o ranking y siguiente ronda.
function onDuelsDone() {
    arenas = [];
    heroes.forEach(h => { if (!h.eliminated) { h.arena = null; if (!h.inRest) sendToRestArea(h); } });
    if (isRoundBossRound() && aliveHeroes().length > 1) startBossFight();
    else endRound();
}
