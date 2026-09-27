// Previa de duelos y apuestas (DISEÑO.md §9).
//
//   Al terminar las oleadas se sortean las parejas y hay una previa de PHASE_TIMES.betting segundos: se muestran los duelos
//   y el jugador puede apostar oro a quién gana UN duelo en el que no pelea. Si acierta, cobra el doble (BET_PAYOUT).
//   El monto lo elige el jugador (arranca en 0). Tope: BET_MAX_PCT de su oro. Medido en 207 duelos: el que va arriba en puntos gana el 73%, así que sin tope apostar
//   todo al favorito dejaba +46% de ganancia por apuesta y rendía más que farmear.
//   La IA también apuesta (ver aiPlaceBets), nunca a su propio duelo. Nadie puede apostarse a sí mismo.
//   Respaldo: el que gana un duelo cobra BACKING_BONUS de todo lo que le apostaron los demás (si te apostaron y ganás, cobrás).
//   Las apuestas de la IA se hacen al abrir la previa y se ven en la ventana.

const BET_MAX_PCT = 0.5;  // subido de 25% a 50% a pedido: cada uno elige cuánto arriesgar (el monto arranca en 0)
const BET_PAYOUT = 2;
const BACKING_BONUS = 0.25; // el ganador cobra el 25% de lo que le apostaron
const AI_BET = { chance: 0.6, favoriteChance: 0.7, minPct: 0.1, maxPct: 0.35 };

let duelPlan = null;   // { pairs, bye } sorteados en la previa (los usa startDuels)
let currentBet = null; // { on, against, amount }: la apuesta del jugador en esta ronda
let duelBets = [];     // todas las apuestas de la ronda: { bettor, on, against, amount } (IA y jugador)

function betLimit(hero = player) { return Math.floor(hero.gold * BET_MAX_PCT); }

// Duelos en los que el jugador puede apostar (no el suyo).
function bettablePairs() { return duelPlan ? duelPlan.pairs.filter(p => !p.includes(player)) : []; }

function startBetting() {
    duelPlan = makeDuelPairs(aliveHeroes());
    currentBet = null; duelBets = [];
    betAmount = 0;
    quietly(aiPlaceBets);
    // Sin nada para apostar (eliminado, sin oro o sin duelos ajenos) se va directo a los duelos
    if (player.eliminated || !bettablePairs().length || betLimit() < 1) { startDuels(duelPlan); return; }
    gameState = 'BETTING';
    setStateText(`PREVIA DE DUELOS · RONDA ${waveNumber}`);
    setPhaseTimer(PHASE_TIMES.betting);
    showPanel('bet-container', true);
    renderBetting();
    log(`🎲 Previa de duelos: podés apostar hasta ${betLimit()}g a quién gana un duelo ajeno. Si acertás, cobrás el doble.`);
}

// Apuesta amount de oro a que `on` gana su duelo. Una apuesta por ronda. Devuelve true si se hizo.
function placeBet(on, amount) {
    if (gameState !== 'BETTING' || currentBet) return false;
    const pair = bettablePairs().find(p => p.includes(on));
    amount = Math.floor(amount);
    if (!pair || !(amount >= 1) || amount > betLimit()) return false;
    player.gold -= amount;
    currentBet = { on, against: pair.find(h => h !== on), amount };
    duelBets.push({ bettor: player, ...currentBet });
    log(`🎲 Apostaste ${amount}g a que ${on.displayName} le gana a ${currentBet.against.displayName}.`);
    renderBetting();
    return true;
}

function endBetting() {
    if (gameState !== 'BETTING') return;
    showPanel('bet-container', false);
    startDuels(duelPlan);
}

// La IA apuesta: cada rival en juego, con cierta probabilidad, elige un duelo ajeno; casi siempre al favorito (más puntos,
// y a igual puntos más nivel), a veces a la sorpresa. Arriesga entre el 10% y el 35% de su oro.
function aiPlaceBets() {
    aliveHeroes().filter(h => h.isAI).forEach(h => {
        const pairs = duelPlan.pairs.filter(p => !p.includes(h));
        if (!pairs.length || Math.random() > AI_BET.chance) return;
        const pair = pickRandom(pairs);
        const [fav, dog] = pair.slice().sort((a, b) => (b.points - a.points) || (b.level - a.level) || (Math.random() - 0.5));
        const on = Math.random() < AI_BET.favoriteChance ? fav : dog;
        const amount = Math.min(betLimit(h), Math.floor(h.gold * (AI_BET.minPct + Math.random() * (AI_BET.maxPct - AI_BET.minPct))));
        if (amount < 1) return;
        h.gold -= amount;
        duelBets.push({ bettor: h, on, against: pair.find(x => x !== on), amount });
    });
}

// Total apostado a un héroe en esta ronda (por los demás).
function betsOn(hero) { return duelBets.filter(b => b.on === hero).reduce((s, b) => s + b.amount, 0); }

// Se llama al resolver cada duelo: paga las apuestas de ese duelo y el respaldo al ganador.
function settleBet(winner, loser) {
    const bets = duelBets.filter(b => b.on === winner || b.on === loser);
    if (!bets.length) return;
    duelBets = duelBets.filter(b => !bets.includes(b));
    bets.forEach(b => {
        if (b.on === winner) b.bettor.gold += b.amount * BET_PAYOUT;
        if (b.bettor !== player) return;
        currentBet = null;
        log(b.on === winner ? `🎲 ¡Ganaste la apuesta! ${winner.displayName} ganó: cobrás ${b.amount * BET_PAYOUT}g.`
            : `🎲 Perdiste la apuesta (${b.amount}g): ${winner.displayName} le ganó a ${loser.displayName}.`);
    });
    const backing = bets.filter(b => b.on === winner).reduce((s, b) => s + b.amount, 0);
    const bonus = Math.round(backing * BACKING_BONUS);
    if (bonus > 0) {
        winner.gold += bonus;
        if (winner === player) log(`🎲 Te habían apostado ${backing}g y ganaste: cobrás +${bonus}g de respaldo.`);
    }
}
