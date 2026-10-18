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

// --- HISTORIAL Y PERFIL (ROADMAP C1, 2026-10-18): partidas, victorias, top 3 y el mejor puesto con cada héroe ---
// Clave propia, aparte de todo lo demás (como los récords de la Torre); en pruebas y demos queda en memoria.
const CH_PROFILE_KEY = 'chc-perfil-ch';
let chProfilePersist = !/[?&](test|demo|banco)/.test(location.search), chProfileMemory = null;
const chProfileEmpty = () => ({ games: 0, wins: 0, top3: 0, heroes: {} });
function chProfile() {
    try { return Object.assign(chProfileEmpty(), JSON.parse((chProfilePersist ? localStorage.getItem(CH_PROFILE_KEY) : chProfileMemory) || '{}')); }
    catch (e) { return chProfileEmpty(); }
}
// Una vez por partida: al terminar o al quedar eliminado (con el puesto de ese momento)
function noteMatchProfile(h = player) {
    if (!h || h.profileNoted || gameMode !== 'normal' || matchSummaryOff || !(gameState === 'ENDED' || h.eliminated)) return null;
    h.profileNoted = true;
    const p = chProfile(), rank = heroRank(h), hp = p.heroes[h.key] || (p.heroes[h.key] = { games: 0, wins: 0, best: 99 });
    p.games++; hp.games++; hp.best = Math.min(hp.best, rank);
    if (rank === 1) { p.wins++; hp.wins++; }
    if (rank <= 3) p.top3++;
    try { const s = JSON.stringify(p); if (chProfilePersist) localStorage.setItem(CH_PROFILE_KEY, s); else chProfileMemory = s; } catch (e) { /* sin lugar: no pasa nada */ }
    return p;
}
const chHeroName = k => (HERO_TEMPLATES[k] || {}).name || k;
function chProfileSummary(p = chProfile()) {
    if (!p.games) return null;
    const [favKey, fav] = Object.entries(p.heroes).sort((a, b) => b[1].games - a[1].games)[0];
    const s = n => n === 1 ? '' : 's';
    return `🏅 ${p.games} partida${s(p.games)} · ${p.wins} victoria${s(p.wins)} · ${p.top3} en el top 3 · favorito: ${chHeroName(favKey)} (${fav.games})`;
}
// el mejor puesto con cada héroe jugado, del mejor al peor
function chProfileHeroesHtml(p = chProfile()) {
    return Object.entries(p.heroes).sort((a, b) => a[1].best - b[1].best || b[1].games - a[1].games)
        .map(([k, v]) => `<span title="${v.games} partida${v.games === 1 ? '' : 's'}, ${v.wins} ganada${v.wins === 1 ? '' : 's'}">${chHeroName(k)} ${v.best === 1 ? '🏆' : v.best + 'º'}</span>`).join(' · ');
}

function showMatchSummary(h = player) {
    if (typeof document === 'undefined' || !h || gameMode !== 'normal' || matchSummaryOff) return;
    noteMatchProfile(h);
    let box = document.getElementById('match-summary');
    if (!box) { box = document.createElement('div'); box.id = 'match-summary'; box.className = 'modal'; document.body.appendChild(box); }
    box.innerHTML = `<div class="modal-box pause-box run-summary">${matchSummaryHtml(h)}</div>`;
    box.style.display = 'block';
    box.querySelector('#ms-again').onclick = () => { hideMatchSummary(); resetGame(); gameMode = 'normal'; startHeroPick(); };
    box.querySelector('#ms-menu').onclick = () => { hideMatchSummary(); resetGame(); };
    const watch = box.querySelector('#ms-watch'); if (watch) watch.onclick = hideMatchSummary;
}
function hideMatchSummary() { const b = typeof document !== 'undefined' && document.getElementById('match-summary'); if (b) b.style.display = 'none'; }
