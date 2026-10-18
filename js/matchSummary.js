// Custom Hero: pantalla de fin de partida (ROADMAP C1, 2026-10-18). Al terminar la partida, o al quedar eliminado, un
// resumen claro: puesto, rondas, duelos, oro ganado, nivel, la build final (habilidades e ítems) y "▶ Otra partida".
// Usa la misma ventana que el fin de run de la Torre (.run-summary en style.css).

let matchSummaryOff = false; // el banco de balance juega partidas enteras sin mirar (tests.js)

// Al terminar cada ronda (endRound): suma lo que ganó cada uno en la ronda (bajas, interés, racha, apuestas, jefes)
function noteRoundGold() {
    aliveHeroes().forEach(h => { const g = roundIncome(h); if (g && g.total > 0) h.goldEarned = (h.goldEarned || 0) + g.total; });
}

function matchSummaryHtml(h) {
    const rank = heroRank(h), ended = gameState === 'ENDED', won = ended && rank === 1;
    const row = (k, v) => `<div class="rs-row"><span>${k}</span><b>${v}</b></div>`;
    const chip = (txt, color) => `<span class="ms-chip"${color ? ` style="border-color:${color}"` : ''}>${txt}</span>`;
    const skills = h.skills.map(s => {
        const o = HERO_TEMPLATES[s.heroKey];
        return chip(`${abilityLabel(s.name, s.isUltimate ? 'ult' : '')} <small>nv ${skillLevel(h, s)}</small>`, o && ATTR_INFO[o.primaryAttr].color);
    }).join('') || '<span class="subtitle">ninguna</span>';
    const items = h.inventory.filter(i => ITEMS[i.key]).map(i => chip(ITEMS[i.key].name))
        .concat(h.neutral && NEUTRAL_ITEMS[h.neutral] ? [chip(`✨ ${NEUTRAL_ITEMS[h.neutral].name}`)] : []).join('') || '<span class="subtitle">ninguno</span>';
    const title = won ? '🏆 ¡Ganaste la partida!' : h.eliminated && !ended ? '💀 Quedaste eliminado' : `🏁 Fin de la partida: quedaste ${rank}º`;
    return `<h2>${title}</h2>` +
        `<p class="subtitle">${h.displayName}${ended ? ` · ganó ${rankedHeroes()[0].displayName}` : ` · siguen ${aliveHeroes().length} en pie`}</p>` +
        `<div class="rs-grid">${row('Puesto', `${rank}º de ${heroes.length}`)}${h.outRound ? row('Eliminado en la ronda', h.outRound) : row('Rondas', waveNumber)}` +
        `${row('Duelos', `${h.duelWins} ganados · ${h.duelLosses} perdidos`)}${row('Oro ganado', `${h.goldEarned || 0}g`)}` +
        `${row('Nivel', h.level)}${row('Puntos', h.points)}</div>` +
        `<div class="pause-section">🧩 Tu build</div><div class="ms-chips">${skills}</div><div class="ms-chips">${items}</div>` +
        `<button id="ms-again" class="primary-btn rs-again">▶ Otra partida</button>` +
        (h.eliminated && !ended ? `<button id="ms-watch" class="secondary-btn">👁 Seguir mirando</button>` : '') +
        `<button id="ms-menu" class="secondary-btn">🏠 Menú</button>`;
}

function showMatchSummary(h = player) {
    if (typeof document === 'undefined' || !h || gameMode !== 'normal' || matchSummaryOff) return;
    let box = document.getElementById('match-summary');
    if (!box) { box = document.createElement('div'); box.id = 'match-summary'; box.className = 'modal'; document.body.appendChild(box); }
    box.innerHTML = `<div class="modal-box pause-box run-summary">${matchSummaryHtml(h)}</div>`;
    box.style.display = 'block';
    box.querySelector('#ms-again').onclick = () => { hideMatchSummary(); resetGame(); gameMode = 'normal'; startHeroPick(); };
    box.querySelector('#ms-menu').onclick = () => { hideMatchSummary(); resetGame(); };
    const watch = box.querySelector('#ms-watch'); if (watch) watch.onclick = hideMatchSummary;
}
function hideMatchSummary() { const b = typeof document !== 'undefined' && document.getElementById('match-summary'); if (b) b.style.display = 'none'; }
