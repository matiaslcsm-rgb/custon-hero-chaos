// Utilidades generales usadas por todo el juego.

// Si logBuffer es un array, los mensajes se guardan ahí en vez de mostrarse (ver tryCastSkill).
let logBuffer = null;

// Agrega una línea al registro de combate y lo scrollea al final.
function log(msg) {
    if (logBuffer) { logBuffer.push(msg); return; }
    const box = document.getElementById('combat-log');
    const p = document.createElement('p'); p.textContent = msg;
    box.appendChild(p); box.scrollTop = box.scrollHeight;
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
