// Custom Hero: la economía de cada ronda, a la vista (ROADMAP C1, 2026-10-14).
//
//   CUENTA DE LA RONDA: al empezar cada ronda se anota el oro de cada héroe; durante la ronda se anota de dónde viene
//   (interés, racha, apuestas, jefes, ventas). Lo que falta para llegar al oro del final son las bajas.
//   INTERÉS: +1 de oro por cada 10 que tengas al terminar la ronda (tope 5). Antes se cobraba al limpiar la oleada, así
//   que los duelistas no lo cobraban esa ronda; ahora lo cobran todos al terminar la ronda.
//   RACHA: ganar la ronda (limpiar tu oleada sin morir, o ganar tu duelo) o perderla seguido da oro extra, como en los
//   auto battlers: también perder seguido ayuda a volver.
//   RESUMEN: al terminar la ronda, una tarjeta arriba con el oro y de dónde salió, la vida perdida y tu puesto. Enseña la
//   economía sin texto largo. Se cierra sola o con clic.

const ECON = { interestPer: 10, interestMax: 25, streakGold: [0, 0, 5, 10, 15], summaryTime: 9 }; // medido: con tope 5 y racha 1-3, interés y racha eran el 3% y el 1% del oro (131g por ronda): no se notaban // streakGold[n]: con n seguidas (4+: el último)
const streakGold = s => ECON.streakGold[Math.min(Math.abs(s || 0), ECON.streakGold.length - 1)];
const interestFor = h => Math.min(ECON.interestMax, Math.floor(Math.max(0, h.gold) / ECON.interestPer));
function ledgerAdd(h, k, v) { if (h && h.ledger) h.ledger[k] = (h.ledger[k] || 0) + v; }

// Al empezar la ronda (startWave, antes de las apuestas)
function ledgerStart() {
    aliveHeroes().forEach(h => {
        h.ledger = { round: waveNumber, gold: h.gold, lives: h.lives, rank: heroRank(h), wins: h.duelWins, losses: h.duelLosses, interest: 0, streak: 0, bet: 0, boss: 0, sell: 0 };
    });
}
// ¿Ganó la ronda? Si peleó un duelo, el duelo; si no, limpiar su oleada sin morir
function wonRound(h) {
    const L = h.ledger;
    if (L && h.duelWins > L.wins) return true;
    if (L && h.duelLosses > L.losses) return false;
    return !h.diedThisRound;
}
// Al terminar la ronda (endRound): interés sobre lo ahorrado y después la racha
function endRoundEconomy() {
    aliveHeroes().forEach(h => {
        const i = interestFor(h);
        h.gold += i; ledgerAdd(h, 'interest', i);
        const won = wonRound(h), s = h.streak || 0;
        h.streak = won ? (s > 0 ? s + 1 : 1) : (s < 0 ? s - 1 : -1);
        const b = streakGold(h.streak);
        h.gold += b; ledgerAdd(h, 'streak', b);
    });
}
// De dónde salió el oro de la ronda
function roundIncome(h) {
    const L = h.ledger;
    if (!L) return null;
    const total = h.gold - L.gold, known = L.interest + L.streak + L.bet + L.boss + L.sell;
    return { total, kills: total - known, interest: L.interest, streak: L.streak, bet: L.bet, boss: L.boss, sell: L.sell };
}

// --- LA TARJETA DEL RESUMEN ---
function roundSummaryHtml(h) {
    const L = h.ledger, g = roundIncome(h);
    if (!L || !g) return '';
    const sgn = v => (v >= 0 ? '+' : '−') + Math.abs(v);
    const parts = [['⚔️ bajas', g.kills], ['🏦 interés', g.interest], ['🔥 racha', g.streak], ['🎲 apuesta', g.bet], ['👹 jefe', g.boss], ['🧾 ventas', g.sell]]
        .filter(([, v]) => v).map(([k, v]) => `<span>${k} <b>${sgn(v)}</b></span>`).join('');
    const rank = heroRank(h), moved = L.round > 1 ? L.rank - rank : 0; // en la ronda 1 están todos empatados en 0: no hay subida
    const st = h.streak || 0, streakTxt = Math.abs(st) >= 2 ? (st > 0 ? `🔥 ${st} rondas ganadas seguidas` : `🧊 ${-st} rondas perdidas seguidas (la racha también paga)`) : '';
    const lost = L.lives - h.lives, next = interestFor(h), toNext = next < ECON.interestMax ? ECON.interestPer - (h.gold % ECON.interestPer) : 0;
    return `<div class="rsum-head">📊 Ronda ${L.round} · vas <b>${rank}º</b>${moved ? ` <span class="${moved > 0 ? 'up' : 'down'}">${moved > 0 ? '▲' : '▼'}${Math.abs(moved)}</span>` : ''}</div>` +
        `<div class="rsum-gold">💰 <b>${sgn(g.total)}g</b> ${parts}</div>` +
        (streakTxt ? `<div class="rsum-line">${streakTxt}</div>` : '') +
        (lost > 0 ? `<div class="rsum-line down">💔 Perdiste ${lost} vida${lost > 1 ? 's' : ''} (te queda${h.lives === 1 ? '' : 'n'} ${Math.max(0, h.lives)})</div>` : '') +
        `<div class="rsum-tip">Con ${h.gold}g, la próxima ronda cobrás <b>+${next}</b> de interés${toNext ? ` (con ${toNext}g más, +${next + 1})` : ' (el tope)'}.</div>`;
}
let roundSummaryTimer = null;
function showRoundSummary(h = player) {
    if (typeof document === 'undefined' || !h || h.eliminated) return;
    let box = document.getElementById('round-summary');
    if (!box) { box = document.createElement('div'); box.id = 'round-summary'; document.body.appendChild(box); box.onclick = () => { box.style.display = 'none'; }; }
    box.innerHTML = roundSummaryHtml(h);
    box.style.display = box.innerHTML ? 'block' : 'none';
    clearTimeout(roundSummaryTimer);
    roundSummaryTimer = setTimeout(() => { box.style.display = 'none'; }, ECON.summaryTime * 1000);
}
// En la barra de oro: lo que vas a cobrar al terminar la ronda (interés + racha si la seguís)
function incomeHint(h) {
    if (!h || gameMode === 'tower') return '';
    const s = h.streak || 0, i = interestFor(h);
    return `+${i}${Math.abs(s) >= 1 ? ` ${s > 0 ? '🔥' : '🧊'}${Math.abs(s)}` : ''}`;
}

// --- MUERTE SÚBITA (ROADMAP C1, 2026-10-15) ---
// Para que la partida siempre termine en 15-25 minutos: desde la ronda SUDDEN.from los héroes reciben cada ronda más daño
// (de creeps, duelos y jefes) hasta que quede uno. Se anuncia al empezar cada ronda y se ve en la barra de arriba.
// Medido con el piloto (8 partidas cada uno): sin muerte súbita 33-46 rondas y 33-39 min; desde la 15 con +50% por
// ronda, 20-26 rondas y 16-21 min, con 6 ganadores distintos (con +20% eran 23-32 rondas y el Sniper ganaba 5 de 8).
const SUDDEN = { from: 15, perRound: 0.5 };
function suddenDeathBonus() { return gameMode !== 'tower' && waveNumber >= SUDDEN.from ? SUDDEN.perRound * (waveNumber - SUDDEN.from + 1) : 0; }
function announceSuddenDeath() {
    const b = suddenDeathBonus();
    if (!b) return;
    log(waveNumber === SUDDEN.from ? `☠️ ¡MUERTE SÚBITA! Desde ahora cada ronda los héroes reciben más daño: +${Math.round(b * 100)}% y subiendo hasta que quede uno.`
        : `☠️ Muerte súbita: los héroes reciben +${Math.round(b * 100)}% de daño esta ronda.`);
}
