// Infinite Tower: pantalla grande, zoom, registro flotante y pausa de la Torre (REWORK.md §5, fase 1, 2026-10-07).
//
//   En la Torre el mapa ocupa toda la ventana (sin ranking ni panel derecho: en este modo no hay rivales). El zoom se
//   maneja con la rueda del mouse o + / −, y se guarda como "casillas a lo ancho", así se ve igual en cualquier pantalla.
//   Los mensajes aparecen unos segundos abajo a la izquierda del mapa; la L abre el diario del piso con el registro
//   completo. El HUD del héroe queda debajo del mapa.

// across: 24 casillas a lo ancho de entrada (2026-10-14, antes 30: el héroe se veía chico para leer los tajos del combo).
// La preferencia se guarda con otra clave (chc-zoom2) para que todos arranquen una vez con la cámara nueva.
const VIEW = { w: MAP_W, h: MAP_H, across: 24, min: 14, max: 64, step: 1.12 };
let towerLayout = false, towerLogOpen = false;
try { const a = +localStorage.getItem('chc-zoom2'); if (a >= VIEW.min && a <= VIEW.max) VIEW.across = a; } catch (e) { /* sin almacenamiento */ }

// Lo que se ve de la Torre (en el modo normal, la arena fija de siempre)
// Pixel art nítido (2026-10-14): el zoom se ajusta para que cada píxel del dibujo ocupe un número ENTERO de píxeles de
// pantalla (2, 3, 4…). Con escalas como 2,86, unas columnas salían más gruesas que otras y el dibujo se veía sucio.
function pxPerArt() { const dpr = window.devicePixelRatio || 1; return Math.max(1, Math.round(PXG.scale * VIEW.w / (VIEW.across * TILE) * dpr)); }
function viewScale() { return towerLayout ? pxPerArt() / (PXG.scale * (window.devicePixelRatio || 1)) : 1; }
function viewCols() { return towerLayout ? VIEW.w / (TILE * viewScale()) : VIEW_COLS; }
function viewRows() { return towerLayout ? VIEW.h / (TILE * viewScale()) : VIEW_ROWS; }
function screenW() { return towerLayout ? VIEW.w : MAP_W; }
function screenH() { return towerLayout ? VIEW.h : MAP_H; }

function setTowerLayout(on) {
    towerLayout = on;
    document.body.classList.toggle('tower-layout', on);
    if (!on) { towerLogOpen = false; document.body.classList.remove('log-open'); }
    mapScale = 1;
    fitTowerCanvas();
}
// Canvas del tamaño de la ventana (menos la franja de arriba y la barra del héroe)
function fitTowerCanvas() {
    if (!towerLayout) { applyMapSize(); return; }
    const col = document.getElementById('center-col'), hud = document.getElementById('map-hud'), bar = document.getElementById('hero-bar');
    const w = Math.max(480, Math.floor(col.clientWidth - 6));
    const overlay = getComputedStyle(bar).position === 'absolute'; // la barra compacta va encima del mapa (style.css)
    const h = Math.max(320, Math.floor(window.innerHeight - hud.offsetHeight - (bar.style.display === 'none' || overlay ? 0 : bar.offsetHeight) - 46));
    VIEW.w = w; VIEW.h = h;
    const k = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * k); canvas.height = Math.round(h * k);
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
}
window.addEventListener('resize', () => { if (towerLayout) fitTowerCanvas(); });

// --- ZOOM ---
function setTowerZoom(across) {
    VIEW.across = Math.max(VIEW.min, Math.min(VIEW.max, across));
    try { localStorage.setItem('chc-zoom2', String(Math.round(VIEW.across * 10) / 10)); } catch (e) { /* no se guarda */ }
}
// dir > 0: acercar. Salta de a un tamaño de píxel entero (así cada paso de la rueda se nota y el dibujo sigue nítido)
function towerZoom(dir) {
    const dpr = window.devicePixelRatio || 1, p = Math.max(1, pxPerArt() + (dir > 0 ? 1 : -1));
    setTowerZoom(PXG.scale * VIEW.w * dpr / (p * TILE));
}
canvas.addEventListener('wheel', e => {
    if (!towerLayout) return;
    e.preventDefault();
    towerZoom(e.deltaY < 0 ? 1 : -1);
}, { passive: false });

// --- REGISTRO FLOTANTE (últimos mensajes sobre el mapa) ---
const FLOAT_LOG = { lines: 5, life: 7 };
function floatLog(msg) {
    const box = document.getElementById('float-log');
    if (!box) return;
    const p = document.createElement('p'); p.textContent = msg;
    box.appendChild(p);
    while (box.children.length > FLOAT_LOG.lines) box.firstChild.remove();
    setTimeout(() => p.classList.add('fade'), FLOAT_LOG.life * 1000);
    setTimeout(() => p.remove(), FLOAT_LOG.life * 1000 + 800);
}
// L: diario del piso (información del piso + registro completo), como panel que se despliega a la derecha
function toggleTowerLog(open = !towerLogOpen) {
    if (!towerLayout) return;
    towerLogOpen = open;
    document.body.classList.toggle('log-open', open);
    if (open) { const box = document.getElementById('combat-log'); box.scrollTop = box.scrollHeight; }
}
// Avisos fijos arriba a la izquierda del mapa (puntos para repartir, piezas para forjar)
let towerFitKey = '';
function renderTowerBadges() {
    if (towerLayout) { // si cambió la ventana o apareció la barra del héroe, se reacomoda el mapa
        const key = `${document.getElementById('center-col').clientWidth}:${document.getElementById('hero-bar').offsetHeight}:${window.innerHeight}`;
        if (key !== towerFitKey) { towerFitKey = key; fitTowerCanvas(); }
    }
    const box = document.getElementById('tower-badges');
    if (!box) return;
    let html = '';
    if (towerLayout && player && player.gear) {
        if (player.statPoints) html += `<button onclick="toggleStatsWindow(true)">📊 ${player.statPoints} punto${player.statPoints === 1 ? '' : 's'} para repartir (C)</button>`;
        const f = pendingForge(player);
        if (f) html += `<button onclick="openForge(pendingForge(player))">⚒ ${f.name} subió de nivel: elegí cómo crece</button>`; // la ventana se abre sola al terminar la pelea
    }
    if (box.dataset.html !== html) { box.dataset.html = html; box.innerHTML = html; }
}

// --- PAUSA DE LA TORRE: accesos a las ventanas, zoom y controles ---
// Ayuda de controles con las teclas elegidas (keymap.js)
function towerControlsText() {
    const K = a => keyName(KEYMAP[a]);
    return `Mover: ${K('up')} ${K('left')} ${K('down')} ${K('right')} (o clic derecho) · Esquive: ${K('dash')} · Habilidades: ${K('skill1')} ${K('skill2')} ${K('skill3')} (salen hacia el cursor) · ` +
        `${clickAttack ? 'Atacar: clic izquierdo (mantenelo para seguir)' : 'Objetivo: clic izquierdo'} · Zoom: rueda o + − · Equipo: ${K('inventory')} · Stats: ${K('stats')} · Códice: ${K('codex')} · Bestiario: ${K('bestiary')} · ` +
        `Diario del piso: ${K('log')} · Cuaderno: ${K('notebook')} · Agarrar: ${K('interact')} · Tienda o Herrero: ${K('shop')} · Mapa del piso: ${K('map')} · Automáticas: ${K('autocast')} · Piloto: ${K('autopilot')} · Sin mouse: ${K('attack')} ataca y ${K('attack2')} es el secundario (apuntan solos) · Joystick: ver Cómo funciona`;
}
function towerPauseHtml() {
    const b = (fn, label) => `<button class="secondary-btn" onclick="setPaused(false); ${fn}">${label}</button>`;
    return `<div class="pause-section">🗼 Torre</div><div class="pause-row tower-pause">` +
        b('toggleInventory(true)', '🎒 Equipo (I)') + b('toggleStatsWindow(true)', '📊 Stats (C)') + b('toggleCodex(true)', '📜 Códice (J)') +
        b('toggleBestiary(true)', '📖 Bestiario (K)') + b('toggleTowerLog(true)', '📓 Diario del piso (L)') + b('toggleTowerMap(true)', '🗺️ Mapa del piso (M)') + b('toggleNotebook(true)', '✏️ Cuaderno (N)') + `</div>` +
        `<div class="pause-zoom">🔍 Zoom <button class="secondary-btn" onclick="towerZoom(-1); renderPauseMenu()">−</button>` +
        `<span>${Math.round(VIEW.across)} casillas a lo ancho</span><button class="secondary-btn" onclick="towerZoom(1); renderPauseMenu()">+</button></div>` +
        `<p class="subtitle pause-controls">${towerControlsText()}</p>` + towerGuideHtml(); // cómo funciona cada sistema (towerGuide.js)
}

// --- PANTALLA DE FIN DE RUN (ROADMAP T1, 2026-10-14) ---
// Al conquistar la torre: un resumen claro (piso, tiempo, muertes, bajas, nivel, tus reliquias y lo que quedó para siempre)
// y un botón grande "▶ Otra run". Es el puente entre la run y la metaprogresión.
function runSummaryHtml(o) {
    const s = towerRun.stats || {}, min = Math.floor(o.runTime / 60), sec = Math.floor(o.runTime % 60);
    const relics = Object.entries(player.relics || {}).map(([id, n]) => `<span class="relic" title="${RELICS[id].name}">${RELICS[id].icon}${n > 1 ? `<b>${n}</b>` : ''}</span>`).join('') || '<span class="subtitle">ninguna</span>';
    const row = (k, v) => `<div class="rs-row"><span>${k}</span><b>${v}</b></div>`;
    return `<h2>${o.won ? '🏆 ¡Conquistaste la Torre!' : '🗼 Fin de la run'}</h2>` +
        (o.record ? '<p class="rs-record">🏅 ¡Nuevo récord: tu cumbre más rápida!</p>' : '') +
        `<div class="rs-grid">${row('Piso', `${Math.max(towerRun.floor, s.bestFloor || 1)} de ${TOWER.floors}`)}${row('Tiempo', `${min} min ${String(sec).padStart(2, '0')} s`)}` +
        `${row('Nivel', player.level)}${row('Muertes', towerRun.deaths)}${row('Bajas', s.kills || 0)}${row('Campeones', s.champions || 0)}${row('Guardianes', s.guardians || 0)}${row('Oro juntado', (s.gold || 0) + 'g')}</div>` +
        `<div class="pause-section">💠 Tus reliquias</div><div class="rs-relics">${relics}</div>` +
        `<div class="pause-section">📜 Para siempre</div><p class="subtitle">${s.codex ? `${s.codex} poder${s.codex === 1 ? '' : 'es'} nuevo${s.codex === 1 ? '' : 's'} en el Códice · ` : ''}Esencia: ${(typeof codex !== 'undefined' && codex.essence) || 0} · el Bestiario y las páginas de Arén quedan guardados.</p>` +
        (o.won && !towerRun.ascent ? `<button id="rs-ascend" class="primary-btn rs-again">⬆ Seguir subiendo (Lo No Escrito)</button>` : '') +
        `<button id="rs-again" class="${o.won && !towerRun.ascent ? 'secondary-btn' : 'primary-btn rs-again'}">▶ Otra run</button><button id="rs-menu" class="secondary-btn">🏠 Menú</button>`;
}
function showRunSummary(o) {
    let box = document.getElementById('run-summary');
    if (!box) { box = document.createElement('div'); box.id = 'run-summary'; box.className = 'modal'; document.body.appendChild(box); }
    box.innerHTML = `<div class="modal-box pause-box run-summary">${runSummaryHtml(o)}</div>`;
    box.style.display = 'block';
    document.getElementById('rs-again').onclick = () => { box.style.display = 'none'; startTowerRun(); };
    const up = document.getElementById('rs-ascend'); if (up) up.onclick = () => { box.style.display = 'none'; continueAscent(); };
    document.getElementById('rs-menu').onclick = () => { box.style.display = 'none'; const b = document.getElementById('restart-btn'); if (b) b.click(); };
}

// --- LA CUMBRE COMO FINAL (ROADMAP T1, 2026-10-14) ---
// Al vencer al guardián del piso 10: pantalla oscura, cuatro líneas que aparecen de a una (la torre se abre, el cuaderno
// escribe su última página) y "Continuar" lleva al resumen (donde se puede seguir subiendo).
const SUMMIT_LINES = ['El guardián cae. Las paredes del Corazón dejan de latir.', 'Arriba, la piedra se abre: se ve el cielo. Y más arriba, la torre sigue, sin escribir.',
    'El cuaderno se abre solo en la última página. Tu letra escribe:', '«Llegué. Esta vez me acuerdo. Esta vez la firma es mía.»'];
function showSummitScene(next) {
    let box = document.getElementById('summit-scene');
    if (!box) { box = document.createElement('div'); box.id = 'summit-scene'; box.className = 'modal summit-scene'; document.body.appendChild(box); }
    box.innerHTML = `<div class="summit-box">${SUMMIT_LINES.map((l, i) => `<p style="animation-delay:${i * 1.6}s">${l}</p>`).join('')}<button id="summit-next" class="primary-btn">Continuar</button></div>`;
    box.style.display = 'block';
    writeNotebookPage('SUMMIT');
    document.getElementById('summit-next').onclick = () => { box.style.display = 'none'; next(); };
}
