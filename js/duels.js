// Duelos 1v1: UNO por ronda (desde la ronda 5), después de las oleadas; los demás miran y apuestan. Reglas: DISEÑO.md §9.
//
//   Parejas al azar entre los héroes en juego, evitando repetir el rival de la ronda anterior; si son impares,
//   uno descansa. Cada pareja pelea en su propia arena ('duel'), todas en paralelo.
//   Al empezar: vida y maná llenos, sin mejoras temporales y con los enfriamientos reiniciados.
//   En duelo los héroes se hacen DUEL_DAMAGE_REDUCTION menos daño entre sí (peleas más largas y tácticas).
//   Gana quien mata al otro; si se acaba el tiempo, quien tenga más % de vida.
//   Ganador: +3 puntos y el escalado por duelo de su héroe. Los dos van al Área de Descanso.
//   Perdedor (las vidas NO se pierden en duelos, solo contra creeps):
//     - quedan más de la mitad de los héroes → sin castigo (solo se queda sin los puntos);
//     - quedan 3 (DUEL_CURSE_ALIVE) → suma una instancia de maldición (Condenado; cada instancia, +10% de castigo);
//     - quedan 2 (DUEL_DEATH_ALIVE) → pierde una vida y suma una instancia; si era la última vida, queda eliminado.
//   Los creeps nunca maldicen: solo perder un duelo.
//   Es para que la partida no se estanque cuando todos tienen builds que los creeps no pueden derrotar.

const DUEL_TIME = 45;
const DUEL_START_ROUND = 5; // rondas 1-4: solo draft y creeps (armás el kit); los duelos y las apuestas arrancan acá
const DUEL_DAMAGE_REDUCTION = 0.6; // en duelo, los héroes se hacen 60% menos daño entre sí (sin esto duraban ~3 s)
const DUEL_CURSE_ALIVE = 3; // con 3 héroes en juego o menos, perder un duelo suma una instancia de maldición
const DUEL_DEATH_ALIVE = 2; // con 2, perder el duelo además cuesta una vida
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
// Un duelo por ronda: pelean los que menos duelos pelearon (al azar entre ellos), sin repetir la pareja anterior.
let lastDuelPair = [];
function pickDuelPair(list = aliveHeroes()) {
    if (list.length < 2) return null;
    const fought = h => h.duelWins + h.duelLosses;
    const order = shuffle(list.slice()).sort((a, b) => fought(a) - fought(b));
    const sameAsLast = (a, b) => lastDuelPair.includes(a) && lastDuelPair.includes(b);
    for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) {
        if (!sameAsLast(order[i], order[j])) return [order[i], order[j]];
    }
    return [order[0], order[1]];
}
function duelPlanOfRound() { const pair = pickDuelPair(); return { pairs: pair ? [pair] : [], bye: null }; }

function startDuels(plan = duelPlanOfRound()) {
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
    if (pairs.length) lastDuelPair = pairs[0].slice();
    // La cámara sigue a tu héroe aunque no pelees (el 🔥 del ranking marca a los duelistas; con un clic mirás el duelo)
    followPlayer();
    setStateText(`DUELO · RONDA ${waveNumber}`);
    sfx('duel');
    const mine = arenas.find(a => a.heroes.includes(player));
    const rival = mine ? mine.heroes.find(h => h !== player) : null;
    log(`⚔️ ¡Duelo de la ronda! ${pairs.map(([a, b]) => `${a.displayName} vs ${b.displayName}`).join(' · ')}. ` +
        (rival ? `Te toca a vos contra ${rival.displayName}.` : 'Mirás el duelo desde la sala.'));
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
    if (winner === player) sfx('win'); else if (loser === player) sfx('lose');
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
    if (isCondemned(loser)) registerDuelLoss(loser); else curseHero(loser); // una instancia más de maldición
    if (alive <= DUEL_DEATH_ALIVE) { // mano a mano final: además cuesta una vida
        loser.lives--;
        log(loser === player ? `💔 Perdiste el duelo con 2 héroes en juego: perdés una vida (te queda${loser.lives === 1 ? '' : 'n'} ${Math.max(0, loser.lives)}).`
            : `💔 ${loser.displayName} pierde una vida.`);
        if (loser.lives <= 0) eliminateHero(loser, loser === player ? 'Perdiste el duelo final sin vidas' : `${loser.displayName} perdió el duelo final sin vidas`);
    }
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
