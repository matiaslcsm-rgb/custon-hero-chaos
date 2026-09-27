// Previa de duelos y apuestas (DISEÑO.md §9).
//
//   Al terminar las oleadas se sortean las parejas y hay una previa de PHASE_TIMES.betting segundos: se muestran los duelos
//   y el jugador puede apostar oro a quién gana UN duelo en el que no pelea. Si acierta, cobra el doble (BET_PAYOUT).
//   Tope: BET_MAX_PCT de su oro. Medido en 207 duelos: el que va arriba en puntos gana el 73%, así que sin tope apostar
//   todo al favorito dejaba +46% de ganancia por apuesta y rendía más que farmear.
//   Los rivales de la IA no apuestan.

const BET_MAX_PCT = 0.25;
const BET_PAYOUT = 2;

let duelPlan = null;   // { pairs, bye } sorteados en la previa (los usa startDuels)
let currentBet = null; // { on, against, amount }: la apuesta del jugador en esta ronda

function betLimit(hero = player) { return Math.floor(hero.gold * BET_MAX_PCT); }

// Duelos en los que el jugador puede apostar (no el suyo).
function bettablePairs() { return duelPlan ? duelPlan.pairs.filter(p => !p.includes(player)) : []; }

function startBetting() {
    duelPlan = makeDuelPairs(aliveHeroes());
    currentBet = null;
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
    log(`🎲 Apostaste ${amount}g a que ${on.displayName} le gana a ${currentBet.against.displayName}.`);
    renderBetting();
    return true;
}

function endBetting() {
    if (gameState !== 'BETTING') return;
    showPanel('bet-container', false);
    startDuels(duelPlan);
}

// Se llama al resolver cada duelo: si era el de la apuesta, paga o avisa que se perdió.
function settleBet(winner, loser) {
    if (!currentBet || ![winner, loser].includes(currentBet.on)) return;
    const bet = currentBet;
    currentBet = null;
    if (bet.on === winner) {
        const prize = bet.amount * BET_PAYOUT;
        player.gold += prize;
        log(`🎲 ¡Ganaste la apuesta! ${winner.displayName} ganó: cobrás ${prize}g.`);
    } else {
        log(`🎲 Perdiste la apuesta (${bet.amount}g): ${winner.displayName} le ganó a ${loser.displayName}.`);
    }
}
