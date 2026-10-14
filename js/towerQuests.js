// Infinite Tower: pedidos que cruzan pisos (ROADMAP T0, TORRE-MUNDO.md; 2026-10-14).
//
//   Algo que conseguís arriba abre algo de abajo, y la piedra de regreso (towerWaystone.js) te deja volver.
//   El primero: la LLAVE DE LAS COMPUERTAS. La suelta el Guardián de Arena (jefe escondido del piso 5, towerSecrets.js);
//   abre las compuertas del piso 3, una sala sellada con una reja de hierro (no se rompe a golpes) y un cofre adentro.
//   Las llaves de la run se guardan con la run (towerSave.js).
//   EL MISTERIO DEL PISO 3 (jugable): al abrir las compuertas baja el agua de todo el piso. Los pozos hondos se secan y se
//   cruzan (atajos), y en el fondo de los dos más grandes asoman cofres hundidos que antes no se veían.

const QUESTS = {
    compuertas: { keyFloor: 5, doorFloor: 3, key: 'Llave de las Compuertas', inner: [7, 5],
        locked: '🔒 Una reja de hierro con candado: las compuertas de los barqueros. Madre Junco dice que la llave se la llevó la arena de arriba.',
        got: '🗝️ Entre la arena del reloj, una llave oxidada: la Llave de las Compuertas. Las compuertas están en el piso 3 (la piedra de regreso te lleva).',
        open: '🗝️ La llave gira. Las compuertas se abren y el agua baja: detrás hay una sala que nadie pisó desde la expedición.', drains: true }
};
const SUNKEN = { chests: 2, minPool: 5 };
const chestUnderWater = (level, ch) => !!(ch.sunken && level.deep && level.deep[ch.y * COLS + ch.x]);
const hasQuestKey = id => !!(towerRun && towerRun.keys && towerRun.keys[id]);

// Al armar el piso: la sala con reja de cada pedido que se abre acá
function placeQuestDoors(level, dist) {
    Object.entries(QUESTS).forEach(([id, Q]) => {
        if (level.floor !== Q.doorFloor || level.isCave) return;
        const p = findFieldRect(level, dist, Q.inner, true);
        if (!p) return;
        const crack = buildChamber(level, p.x, p.y, p.side, Q.inner);
        crack.lock = id;
        level.chests[level.chests.length - 1].quest = id;
        if (Q.drains) placeSunkenChests(level);
    });
}
// Cofres en el fondo de los pozos más grandes (en la casilla más rodeada de agua de cada uno)
function placeSunkenChests(level) {
    const deep = level.deep, seen = new Uint8Array(COLS * ROWS), pools = [];
    if (!deep) return;
    for (let s = 0; s < deep.length; s++) {
        if (!deep[s] || seen[s]) continue;
        const cells = [], stack = [s]; seen[s] = 1;
        while (stack.length) {
            const i = stack.pop(), x = i % COLS, y = (i - x) / COLS; cells.push(i);
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const j = (y + dy) * COLS + x + dx; if (x + dx >= 0 && x + dx < COLS && y + dy >= 0 && y + dy < ROWS && deep[j] && !seen[j]) { seen[j] = 1; stack.push(j); } });
        }
        if (cells.length >= SUNKEN.minPool) pools.push(cells);
    }
    const wet = i => { const x = i % COLS, y = (i - x) / COLS; let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (deep[(y + dy) * COLS + x + dx]) n++; return n; };
    pools.sort((a, b) => b.length - a.length).slice(0, SUNKEN.chests).forEach(cells => {
        const i = cells.reduce((a, b) => (wet(b) > wet(a) ? b : a)), x = i % COLS;
        level.chests.push({ x, y: (i - x) / COLS, open: false, guards: [], secret: true, sunken: true });
    });
}
// Baja el agua: los pozos hondos quedan en fondo seco (se pisan) y asoman los cofres hundidos
function drainFloor(level) {
    if (level.drained || !level.deep) return;
    level.drained = true;
    for (let i = 0; i < level.deep.length; i++) {
        if (!level.deep[i]) continue;
        level.deep[i] = 0; level.ground[i] = GROUND.plain;
        const x = i % COLS, y = (i - x) / COLS;
        if (typeof markMinimap === 'function' && level.explored[y][x]) markMinimap(level, x, y);
    }
    level.pxGround = null; // el suelo en pixel art se vuelve a pintar (towerPixel.js)
    const sunk = level.chests.filter(c => c.sunken);
    sunk.forEach(c => { c.unreachable = false; });
    fxShake(5);
    log(`🌊 Un rugido de agua por todo el piso: las cisternas se vacían. Donde había pozos hondos queda fondo seco${sunk.length ? `, y en el fondo asoman ${sunk.length} cofres hundidos` : ''}.`);
}
// Al vencer a un jefe escondido que guarda una llave
function questBossDown(level, floor) {
    Object.entries(QUESTS).forEach(([id, Q]) => {
        if (floor !== Q.keyFloor || hasQuestKey(id)) return;
        (towerRun.keys || (towerRun.keys = {}))[id] = true;
        log(Q.got); sfx('levelup');
    });
}
// Un golpe (o F) a la reja: sin la llave avisa; con la llave se abre de una
function hitQuestDoor(level, c) {
    const Q = QUESTS[c.lock];
    if (!hasQuestKey(c.lock)) { if (!c.warned || gameClock - c.warned > 4) { c.warned = gameClock; log(Q.locked); } return true; }
    c.hp = 0; level.walls[c.y][c.x] = 0;
    if (typeof markMinimap === 'function' && level.explored[c.y][c.x]) markMinimap(level, c.x, c.y);
    log(Q.open); sfx('levelup');
    if (Q.drains) drainFloor(level); // el misterio del piso 3
    return true;
}
function questDoorNear(hero = player) {
    const level = hero && hero.arena;
    return (level && level.cracks || []).find(c => c.lock && c.hp > 0 && Math.hypot(c.x - hero.x, c.y - hero.y) <= 1.6);
}
function questInteract() { const c = questDoorNear(); return !!c && hitQuestDoor(player.arena, c); }

// La reja: barrotes de hierro sobre la piedra (con la llave en la mano, brilla)
function drawQuestDoors(level) {
    (level.cracks || []).forEach(c => {
        if (!c.lock || c.hp <= 0 || !level.explored[c.y][c.x]) return;
        const x = c.x * TILE, y = c.y * TILE, key = hasQuestKey(c.lock);
        ctx.save();
        ctx.fillStyle = 'rgba(12,10,9,0.85)'; ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.fillStyle = key ? '#c9a227' : '#7a828c';
        for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(x + 5 + i * (TILE - 12) / 3), y + 3, 2, TILE - 6);
        ctx.fillRect(x + 3, Math.round(y + TILE * 0.45), TILE - 6, 2);
        ctx.fillStyle = '#c9a227'; ctx.fillRect(Math.round(x + TILE / 2 - 2), Math.round(y + TILE * 0.55), 4, 4);
        ctx.restore();
        if (questDoorNear() === c) pxLabel(`${keyName(KEYMAP.interact)}: ${key ? 'abrir las compuertas' : 'reja cerrada'}`, x + TILE / 2, y - TILE * 0.3, key ? '#ffe08a' : '#f2e6c8');
    });
}
