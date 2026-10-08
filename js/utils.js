// Utilidades generales usadas por todo el juego.

// Si logBuffer es un array, los mensajes se guardan ahí en vez de mostrarse (ver tryCastSkill).
let logBuffer = null;
// Con logMuted los mensajes no se muestran (ej: lo que pasa en las arenas de los rivales que no estás mirando).
let logMuted = false;

// Agrega una línea al registro de combate y lo scrollea al final.
function log(msg) {
    if (logBuffer) { logBuffer.push(msg); return; }
    if (logMuted) return;
    const box = document.getElementById('combat-log');
    const p = document.createElement('p'); p.textContent = msg;
    box.appendChild(p); box.scrollTop = box.scrollHeight;
    if (typeof towerLayout !== 'undefined' && towerLayout) floatLog(msg); // towerView.js
}

// Mezcla un array en el lugar (Fisher-Yates) y lo devuelve.
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// --- ACCESIBILIDAD (pausa → Opciones; REWORK.md, lista de interfaz, 2026-10-07) ---
// colorblind: zonas de ataque en azul y naranja en vez de rojo y dorado · combatText: tamaño de los números de daño y
// carteles · uiScale: escala de la barra del héroe, las ventanas, los mensajes y la franja de arriba.
const A11Y = { colorblind: false, combatText: 1, uiScale: 1 };
try { Object.assign(A11Y, JSON.parse(localStorage.getItem('chc-a11y') || '{}')); } catch (e) { /* por defecto */ }
function setA11y(key, v) {
    A11Y[key] = key === 'colorblind' ? !!v : Math.max(key === 'uiScale' ? 0.8 : 0.8, Math.min(key === 'uiScale' ? 1.4 : 1.6, v));
    try { localStorage.setItem('chc-a11y', JSON.stringify(A11Y)); } catch (e) { /* no se guarda */ }
    applyA11y();
}
function applyA11y() { document.documentElement.style.setProperty('--ui-scale', A11Y.uiScale); }
applyA11y();
