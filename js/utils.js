// Utilidades generales usadas por todo el juego.

// Agrega una línea al registro de combate y lo scrollea al final.
function log(msg) {
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
