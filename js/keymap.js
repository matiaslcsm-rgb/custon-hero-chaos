// Teclas configurables (REWORK.md, lista de interfaz, 2026-10-07). En la pausa → "⌨️ Teclas": clic en una acción y apretás la
// tecla nueva; si otra acción la usaba, se intercambian (nunca quedan dos con la misma). Se guarda en el navegador.
// Las flechas siempre mueven y Esc siempre pausa (no se cambian).

const KEY_DEFAULTS = {
    up: 'w', left: 'a', down: 's', right: 'd', dash: ' ',
    skill1: 'q', skill2: 'e', skill3: 'r',
    inventory: 'i', stats: 'c', codex: 'j', bestiary: 'k', log: 'l', map: 'm', notebook: 'n', shop: 'b', autocast: 'h', autopilot: 'p', interact: 'f'
};
const KEY_LABELS = {
    up: 'Mover arriba', left: 'Mover a la izquierda', down: 'Mover abajo', right: 'Mover a la derecha', dash: 'Esquive',
    skill1: 'Habilidad del arma', skill2: 'Habilidad de los guantes', skill3: 'Habilidad de la armadura',
    inventory: 'Equipo e inventario', stats: 'Stats', codex: 'Códice', bestiary: 'Bestiario', log: 'Diario del piso', map: 'Mapa',
    notebook: 'Cuaderno', shop: 'Tienda / Herrero', autocast: 'Habilidades automáticas', autopilot: 'Piloto automático', interact: 'Agarrar (Torre)'
};
const KEY_FIXED = ['escape', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', '+', '=', '-', '_', 'g'];
const KEYMAP = Object.assign({}, KEY_DEFAULTS);
try { Object.assign(KEYMAP, JSON.parse(localStorage.getItem('chc-keys') || '{}')); } catch (e) { /* las de fábrica */ }

function keyName(k) { return k === ' ' ? 'ESP' : k === undefined ? '—' : k.length === 1 ? k.toUpperCase() : k.replace('arrow', '↑').toUpperCase(); }
function actionForKey(k) { return Object.keys(KEYMAP).find(a => KEYMAP[a] === k) || null; }
// Ranura de la Torre → tecla de su habilidad (towerItems.js)
function towerSlotKey(slot) { return KEYMAP[{ weapon: 'skill1', gloves: 'skill2', armor: 'skill3' }[slot]]; }

// Cambia la tecla de una acción (intercambiando si hace falta) y actualiza las habilidades que la usaban
function setKey(action, key) {
    if (KEY_FIXED.includes(key) || !KEY_DEFAULTS.hasOwnProperty(action)) return false;
    const old = KEYMAP[action], other = actionForKey(key);
    if (old === key) return true;
    KEYMAP[action] = key;
    if (other) KEYMAP[other] = old;
    // las habilidades del héroe atadas a esas teclas siguen a su acción
    if (player && player.keyBindings) Object.keys(player.keyBindings).forEach(id => {
        const b = player.keyBindings[id];
        if (b === old) player.keyBindings[id] = key; else if (other && b === key) player.keyBindings[id] = old;
    });
    saveKeymap();
    return true;
}
function resetKeymap() { Object.keys(KEY_DEFAULTS).forEach(a => { if (KEYMAP[a] !== KEY_DEFAULTS[a]) setKey(a, KEY_DEFAULTS[a]); }); saveKeymap(); }
function saveKeymap() { try { localStorage.setItem('chc-keys', JSON.stringify(KEYMAP)); } catch (e) { /* no se guarda */ } }

// --- VENTANA ---
let keysOpen = false, keyWaiting = null;
function toggleKeys(open = !keysOpen) {
    keysOpen = open; keyWaiting = null;
    showPanel('keys-container', open);
    if (typeof paused !== 'undefined' && paused) { showPanel('pause-menu', !open); if (!open) renderPauseMenu(); } // se abre en lugar de la pausa y vuelve a ella
    if (open) renderKeys();
}
function renderKeys() {
    const box = document.getElementById('keys-list');
    box.innerHTML = '';
    Object.keys(KEY_DEFAULTS).forEach(a => {
        const row = document.createElement('div'); row.className = 'key-row' + (keyWaiting === a ? ' waiting' : '');
        row.innerHTML = `<span>${KEY_LABELS[a]}</span><button class="key-cap">${keyWaiting === a ? 'Apretá una tecla…' : keyName(KEYMAP[a])}</button>`;
        row.querySelector('button').onclick = () => { keyWaiting = keyWaiting === a ? null : a; renderKeys(); };
        box.appendChild(row);
    });
}
// Mientras espera una tecla, la toma antes que el juego
window.addEventListener('keydown', e => {
    if (!keysOpen || !keyWaiting) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const k = e.key.toLowerCase();
    if (k !== 'escape') { if (!setKey(keyWaiting, k)) log(`⌨️ La tecla ${keyName(k)} está reservada.`); }
    keyWaiting = null; renderKeys();
}, true);
