// Infinite Tower: el misterio de cada piso, jugable (ROADMAP T0, TORRE-MUNDO.md; 2026-10-14).
//   (El del piso 3, las compuertas que bajan el agua, está con su llave en towerQuests.js.)
//
//   PISO 5 — LOS RELOJES QUE CAMBIAN EL LABERINTO. En los pasillos del laberinto hay compuertas de arena en dos tandas.
//   Cada SANDCLOCK.period segundos los relojes se dan vuelta: una tanda se cierra (pared) y la otra se abre. Unos
//   segundos antes, las que se van a cerrar largan arena (aviso). En las dos posiciones siempre hay camino de la entrada
//   a la escalera (se comprueba al armar el piso); lo que cambia es POR DÓNDE: un atajo abierto ahora puede cerrarse
//   en medio de una pelea. Nunca se cierra una compuerta con alguien parado encima (espera a que se corra).

const SANDCLOCK = { floor: 5, period: 30, warn: 4, perGroup: 4, minGap: 6 };

// Al armar el piso: elige las compuertas (de lado a lado de un pasillo, que en el laberinto tiene 2 casillas de ancho) y
// comprueba que las dos posiciones dejen camino
function placeSandGates(level) {
    level.sandGates = null;
    if (level.floor !== SANDCLOCK.floor || level.isCave || !level.lab || !level.stairs) return;
    const L = level.lab, wall = (x, y) => !walkable(level, x, y);
    const avoid = [level.stairs, level.guardian, ...(level.chests || [])].filter(Boolean);
    const cands = [];
    for (let y = L.y + 1; y < L.y + L.h - 1; y++) for (let x = L.x + 1; x < L.x + L.w - 1; x++) {
        if (level.zone[y * COLS + x] !== ZONE.lab || wall(x, y)) continue;
        if (x <= L.x + 3 || avoid.some(o => Math.hypot(o.x - x, o.y - y) < 5)) continue;
        // pasillo horizontal (corta de arriba a abajo: 2 casillas) o vertical (corta de izquierda a derecha)
        if (!wall(x, y + 1) && wall(x, y - 1) && wall(x, y + 2) && !wall(x - 1, y) && !wall(x + 1, y) && !wall(x - 1, y + 1) && !wall(x + 1, y + 1)) cands.push({ x, y, cells: [[x, y], [x, y + 1]] });
        if (!wall(x + 1, y) && wall(x - 1, y) && wall(x + 2, y) && !wall(x, y - 1) && !wall(x, y + 1) && !wall(x + 1, y - 1) && !wall(x + 1, y + 1)) cands.push({ x, y, cells: [[x, y], [x + 1, y]] });
    }
    const reach = () => bfsFrom(level, level.start.x, level.start.y)[level.stairs.y * COLS + level.stairs.x] >= 0;
    // Primero las del camino más corto a la escalera (así el reloj de verdad cambia por dónde se va)
    const dS = bfsFrom(level, level.start.x, level.start.y), dT = bfsFrom(level, level.stairs.x, level.stairs.y), total = dS[level.stairs.y * COLS + level.stairs.x];
    const onPath = c => dS[c.y * COLS + c.x] + dT[c.y * COLS + c.x] === total;
    // De a una: cada compuerta va a la tanda más corta si, cerrada con el resto de su tanda, todavía hay camino
    const groups = [[], []], shut = (list, on) => list.forEach(g => setSandGate(level, g, on));
    shuffle(cands.filter(onPath)).concat(shuffle(cands.filter(c => !onPath(c)))).forEach(c => {
        if (groups[0].length + groups[1].length >= SANDCLOCK.perGroup * 2 || groups.flat().some(p => Math.hypot(p.x - c.x, p.y - c.y) < SANDCLOCK.minGap)) return;
        const order = groups[0].length <= groups[1].length ? [0, 1] : [1, 0];
        for (const gi of order) {
            if (groups[gi].length >= SANDCLOCK.perGroup) continue;
            const g = { x: c.x, y: c.y, cells: c.cells, group: gi, closed: false };
            shut(groups[gi].concat(g), true); const ok = reach(); shut(groups[gi].concat(g), false);
            if (ok) { groups[gi].push(g); break; }
        }
    });
    if (groups[0].length < 2 || groups[1].length < 2) return;
    const gates = groups.flat();
    level.sandGates = { gates, state: 0, flipAt: SANDCLOCK.period, t: 0, hinted: false };
    gates.forEach(g => { if (g.group === 0) { g.closed = true; setSandGate(level, g, true); } });
}
function setSandGate(level, g, shut) { g.cells.forEach(([x, y]) => { level.walls[y][x] = shut ? WALL.stone : 0; }); }
const sandOccupied = (level, g) => g.cells.some(([x, y]) => (player && player.arena === level && Math.round(player.x) === x && Math.round(player.y) === y)
    || level.creeps.some(c => c.isAlive() && c.x === x && c.y === y));
// Cada cuadro: corre el reloj del piso; al darse vuelta abre una tanda y cierra la otra (si nadie está encima)
function sandClockTick(level, dt) {
    const S = level.sandGates;
    if (!S) return;
    S.t += dt;
    if (!S.hinted && player && player.arena === level && towerZoneAt(level, Math.round(player.x), Math.round(player.y)) === ZONE.lab) {
        S.hinted = true;
        log(`⏳ Los relojes del laberinto se dan vuelta cada ${SANDCLOCK.period} s: unas compuertas de arena se cierran y otras se abren. Cuando cae arena, esa se va a cerrar.`);
    }
    if (S.t >= S.flipAt) { S.state = 1 - S.state; S.flipAt += SANDCLOCK.period; if (fxArena(player) === level) sfx('hit'); }
    S.gates.forEach(g => {
        const shut = g.group === S.state;
        if (shut === g.closed) return;
        if (!shut) { g.closed = false; setSandGate(level, g, false); }
        else if (!sandOccupied(level, g)) { g.closed = true; setSandGate(level, g, true); }
        if (typeof markMinimap === 'function') g.cells.forEach(([x, y]) => { if (level.explored[y][x]) markMinimap(level, x, y); });
    });
}
const sandGateWarning = (S, g) => !g.closed && g.group !== S.state && S.flipAt - S.t <= SANDCLOCK.warn;

// Dibujo: cerrada, una pared de arena apelmazada con un reloj; abierta, una línea de arena en el piso (y si se va a
// cerrar, arena que cae)
function drawSandGates(level) {
    const S = level.sandGates;
    if (!S) return;
    S.gates.forEach(g => g.cells.forEach(([cx0, cy0]) => {
        if (!level.explored[cy0][cx0]) return;
        const x = cx0 * TILE, y = cy0 * TILE;
        ctx.save();
        if (g.closed) {
            ctx.fillStyle = '#b08a52'; ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
            ctx.fillStyle = '#d4b07a'; ctx.fillRect(x + 2, y + 2, TILE - 4, 3);
            ctx.fillStyle = '#5a4128'; const cx = x + TILE / 2, cy = y + TILE / 2;
            ctx.beginPath(); ctx.moveTo(cx - 5, cy - 7); ctx.lineTo(cx + 5, cy - 7); ctx.lineTo(cx - 5, cy + 7); ctx.lineTo(cx + 5, cy + 7); ctx.closePath(); ctx.fill();
        } else {
            ctx.fillStyle = 'rgba(212,176,122,0.45)'; ctx.fillRect(x + 3, y + TILE - 6, TILE - 6, 3);
            if (sandGateWarning(S, g)) {
                ctx.fillStyle = '#e8c890';
                for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(x + 4 + Math.random() * (TILE - 8)), Math.round(y + Math.random() * (TILE - 6)), 2, 2);
            }
        }
        ctx.restore();
    }));
}
