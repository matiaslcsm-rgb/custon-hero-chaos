// Tower Chaos: pantalla grande, zoom, registro flotante y pausa de la Torre (REWORK.md §5, fase 1, 2026-10-07).
//
//   En la Torre el mapa ocupa toda la ventana (sin ranking ni panel derecho: en este modo no hay rivales). El zoom se
//   maneja con la rueda del mouse o + / −, y se guarda como "casillas a lo ancho", así se ve igual en cualquier pantalla.
//   Los mensajes aparecen unos segundos abajo a la izquierda del mapa; la L abre el diario del piso con el registro
//   completo. El HUD del héroe queda debajo del mapa.

const VIEW = { w: MAP_W, h: MAP_H, across: 30, min: 14, max: 64, step: 1.12 };
let towerLayout = false, towerLogOpen = false;
try { const a = +localStorage.getItem('chc-zoom'); if (a >= VIEW.min && a <= VIEW.max) VIEW.across = a; } catch (e) { /* sin almacenamiento */ }

// Lo que se ve de la Torre (en el modo normal, la arena fija de siempre)
function viewScale() { return towerLayout ? VIEW.w / (VIEW.across * TILE) : 1; }
function viewCols() { return towerLayout ? VIEW.across : VIEW_COLS; }
function viewRows() { return towerLayout ? VIEW.h / (TILE * viewScale()) : VIEW_ROWS; }
function screenW() { return towerLayout ? VIEW.w : MAP_W; }
function screenH() { return towerLayout ? VIEW.h : MAP_H; }

function setTowerLayout(on) {
    towerLayout = on;
    document.body.classList.toggle('tower-layout', on);
    if (!on) { towerLogOpen = false; document.body.classList.remove('log-open'); stopMusic(); }
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
    try { localStorage.setItem('chc-zoom', String(Math.round(VIEW.across * 10) / 10)); } catch (e) { /* no se guarda */ }
}
function towerZoom(dir) { setTowerZoom(VIEW.across * (dir > 0 ? 1 / VIEW.step : VIEW.step)); } // dir > 0: acercar
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
        `Objetivo: clic izquierdo · Zoom: rueda o + − · Equipo: ${K('inventory')} · Stats: ${K('stats')} · Códice: ${K('codex')} · Bestiario: ${K('bestiary')} · ` +
        `Diario del piso: ${K('log')} · Cuaderno: ${K('notebook')} · Tienda o Herrero: ${K('shop')} · Mapa del piso: ${K('map')} · Automáticas: ${K('autocast')} · Piloto: ${K('autopilot')}`;
}
function towerPauseHtml() {
    const b = (fn, label) => `<button class="secondary-btn" onclick="setPaused(false); ${fn}">${label}</button>`;
    return `<div class="pause-section">🗼 Torre</div><div class="pause-row tower-pause">` +
        b('toggleInventory(true)', '🎒 Equipo (I)') + b('toggleStatsWindow(true)', '📊 Stats (C)') + b('toggleCodex(true)', '📜 Códice (J)') +
        b('toggleBestiary(true)', '📖 Bestiario (K)') + b('toggleTowerLog(true)', '📓 Diario del piso (L)') + b('toggleTowerMap(true)', '🗺️ Mapa del piso (M)') + b('toggleNotebook(true)', '✏️ Cuaderno (N)') + `</div>` +
        `<div class="pause-zoom">🔍 Zoom <button class="secondary-btn" onclick="towerZoom(-1); renderPauseMenu()">−</button>` +
        `<span>${Math.round(VIEW.across)} casillas a lo ancho</span><button class="secondary-btn" onclick="towerZoom(1); renderPauseMenu()">+</button></div>` +
        `<p class="subtitle pause-controls">${towerControlsText()}</p>`;
}
