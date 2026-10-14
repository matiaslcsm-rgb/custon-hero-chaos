// Infinite Tower: paredes agrietadas y salas secretas (docs/TORRE-MUNDO.md, sistema 4; 2026-10-14).
//
//   Del piso 2 en adelante (adentro de la torre) hay cámaras de piedra selladas en el campo: una sala chica sin puerta,
//   con un tramo de pared agrietado. Las grietas se ven si mirás bien (líneas finas sobre la piedra). Se rompen a golpes
//   (tajos de la espada, flechas, orbes: cualquier ataque tuyo que la toque) y adentro hay un cofre con un tesoro.
//   Paso 1: las cámaras con cofre. Después: grietas en el laberinto y salas con una página o el camino al jefe escondido.

const SECRET = { perFloor: 2, inner: [5, 4], hp: 3, minDist: 30 };

// Busca lugar para las cámaras: un rectángulo libre de campo (con margen), lejos de la entrada y del pueblo
function placeSecretRooms(level, dist) {
    level.cracks = [];
    if (level.floor < 2) return; // el piso 1 es afuera
    const at = (x, y) => y * COLS + x, [iw, ih] = SECRET.inner, ow = iw + 2, oh = ih + 2;
    const taken = (level.shrines || []).concat(level.caves || [], level.events || [], level.chests || [], level.creeps, level.arenPage ? [level.arenPage] : []);
    const town = level.town && level.town.merchant;
    for (let t = 0, made = 0; t < 3000 && made < SECRET.perFloor; t++) {
        const x0 = 3 + Math.floor(Math.random() * (COLS - ow - 6)), y0 = 3 + Math.floor(Math.random() * (ROWS - oh - 6));
        if (town && Math.abs(x0 - town.x) < 24 && Math.abs(y0 - town.y) < 18) continue;
        let ok = true;
        for (let y = y0 - 1; y <= y0 + oh && ok; y++) for (let x = x0 - 1; x <= x0 + ow && ok; x++) {
            const i = at(x, y);
            ok = level.zone[i] === ZONE.field && walkable(level, x, y) && level.ground[i] !== GROUND.road && !(level.height && level.height[i]) && !(level.ramp && level.ramp[i]) && dist[i] >= SECRET.minDist;
        }
        if (!ok || taken.some(s => s.x >= x0 - 2 && s.x <= x0 + ow + 1 && s.y >= y0 - 2 && s.y <= y0 + oh + 1)) continue;
        if (level.cracks.some(c => Math.hypot(c.x - x0, c.y - y0) < 40)) continue;
        for (let y = y0; y < y0 + oh; y++) for (let x = x0; x < x0 + ow; x++)
            level.walls[y][x] = (x === x0 || y === y0 || x === x0 + ow - 1 || y === y0 + oh - 1) ? WALL.stone : 0;
        // La grieta: en el medio de un lado al azar (afuera queda libre: el margen se revisó)
        const side = Math.floor(Math.random() * 4), mx = x0 + (ow >> 1), my = y0 + (oh >> 1);
        const crack = [{ x: mx, y: y0 }, { x: mx, y: y0 + oh - 1 }, { x: x0, y: my }, { x: x0 + ow - 1, y: my }][side];
        level.cracks.push(Object.assign(crack, { hp: SECRET.hp }));
        level.chests.push({ x: x0 + 1 + (iw >> 1), y: y0 + 1 + (ih >> 1), open: false, guards: [], secret: true });
        taken.push(crack);
        made++;
    }
}
function crackAt(level, x, y) { return (level.cracks || []).find(c => c.hp > 0 && c.x === x && c.y === y); }
// Un golpe tuyo a una casilla: si es una grieta, la rompe de a poco
function hitCrack(level, x, y, hero) {
    const c = level && hero === player && crackAt(level, x, y);
    if (!c) return false;
    c.hp--;
    const arena = fxArena(hero);
    if (arena) fxParticles(arena, x, y, 'steel', c.hp > 0 ? 4 : 14, 3, { life: 0.35 });
    if (c.hp > 0) { sfx('hit'); if (c.hp === SECRET.hp - 1) log('🧱 La pared cruje: está agrietada. Unos golpes más...'); return true; }
    level.walls[y][x] = 0;
    if (typeof markMinimap === 'function' && level.explored[y][x]) markMinimap(level, x, y);
    fxShake(4); sfx('crit');
    log('🧱 ¡La pared se derrumbó! Detrás hay una sala secreta.');
    return true;
}
// Tajo de la espada: rompe las grietas dentro del arco (towerFeel.js)
function swingCracks(c, dir, reach, halfArc) {
    const level = c.arena;
    (level && level.cracks || []).forEach(k => { if (k.hp > 0 && inArc(c, k, dir, reach, halfArc)) hitCrack(level, k.x, k.y, c); });
}

// Las grietas: líneas finas oscuras sobre la piedra (se notan si mirás bien) y más abiertas con cada golpe
function drawCracks(level) {
    (level.cracks || []).forEach(c => {
        if (c.hp <= 0 || !level.explored[c.y][c.x]) return;
        const x = c.x * TILE, y = c.y * TILE, dmg = SECRET.hp - c.hp;
        const path = (ox, oy) => {
            ctx.beginPath();
            ctx.moveTo(x + ox + TILE * 0.5, y + oy + TILE * 0.1); ctx.lineTo(x + ox + TILE * 0.38, y + oy + TILE * 0.42); ctx.lineTo(x + ox + TILE * 0.58, y + oy + TILE * 0.6); ctx.lineTo(x + ox + TILE * 0.45, y + oy + TILE * 0.92);
            ctx.moveTo(x + ox + TILE * 0.38, y + oy + TILE * 0.42); ctx.lineTo(x + ox + TILE * 0.18, y + oy + TILE * 0.5);
            if (dmg) { ctx.moveTo(x + ox + TILE * 0.58, y + oy + TILE * 0.6); ctx.lineTo(x + ox + TILE * 0.82, y + oy + TILE * 0.52); }
            ctx.stroke();
        };
        ctx.save(); ctx.lineWidth = 1 + dmg * 0.5;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; path(1, 1); // la piedra es oscura: la grieta es un filo claro con su sombra
        ctx.strokeStyle = `rgba(200,186,160,${0.35 + dmg * 0.2})`; path(0, 0);
        ctx.restore();
    });
}
