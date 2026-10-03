// Tower Chaos: modo roguelike (fase 1 de docs/ROGUELIKE.md). Se elige en el menú, al lado de Custom Hero Chaos.
//
//   Una torre de TOWER.floors niveles que se sube. Cada nivel se genera al azar la primera vez que llegás y queda igual
//   el resto de la run. En cada nivel hay creeps sueltos con NIVEL (stats fijos por nivel, no por ronda) y un GUARDIÁN
//   (uno de los jefes de ronda) que cuida la escalera: hasta que no lo matás, la escalera no se abre.
//   El héroe arranca solo con su innato (sin draft de habilidades) y sube de nivel con la experiencia.
//   Al morir: perdés la mitad de los atributos ganados por encima de la base y renacés en el CÍRCULO DE PIEDRA de la
//   base de la torre (nivel 1). Tu cadáver queda marcado donde moriste.
//
//   Mundo: el nivel mide TOWER.cols × TOWER.rows casillas (COLS/ROWS cambian al entrar a la Torre); la pantalla sigue
//   mostrando 20×12 y la cámara sigue al héroe. Los creeps esperan quietos hasta que te ven (radio de alerta) y te
//   persiguen rodeando paredes (mapa de distancias, ver flowField).

const TOWER = {
    floors: 10, cols: 90, rows: 60,
    heroSpeed: 1.4,       // el héroe camina 40% más rápido que en una arena (el mapa es mucho más grande)
    rooms: { tries: 900, want: 24, minW: 6, maxW: 13, minH: 5, maxH: 10 },
    baseSight: 6,         // distancia de visión base del héroe (las paredes tapan la vista)
    visionPerPoint: 0.5,  // cada punto de Visión suma media casilla
    aggroRadius: 6,       // los creeps te persiguen si estás a esta distancia o menos
    leash: 16,            // y te sueltan si te alejás más que esto de su lugar
    respawnDelay: 3,
    packSize: [2, 4],     // creeps por sala
    // Stats fijos por nivel de creep (vida y daño ×) y experiencia (×)
    creepMult: level => 1 + 0.4 * (level - 1),
    xpMult: level => 1 + 0.3 * (level - 1),
    guardianMult: floor => 0.35 * (1 + 0.45 * (floor - 1))
};

// Creeps que aparecen según el nivel de la torre (primero los básicos; desde el 5, todos)
function towerCreepPool(floor) {
    const all = Object.values(CREEP_TYPES).filter(t => !t.oneHit);
    if (floor <= 2) return all.filter(t => t.basic);
    if (floor <= 4) return all.filter(t => t.basic || ['SHAMAN', 'HEALER', 'SPECTER', 'SWARM', 'KAMIKAZE'].includes(t.key));
    return all;
}

let gameMode = 'normal'; // 'normal' | 'tower'
let towerRun = null;     // { floor, levels: [], base: { str, agi, int }, deaths, startedAt }
const camera = { x: 0, y: 0 };

// --- RUN ---
function startTowerRun(template) {
    player = new Hero(template);
    player.ownerName = playerName();
    player.displayName = `${player.name} (${player.ownerName})`;
    player.inRest = false;
    heroes = [player];
    viewedHero = player;
    heroOffers = null;
    towerRun = { floor: 1, levels: [], base: { str: player.str, agi: player.agi, int: player.int }, deaths: 0, startedAt: gameClock };
    COLS = TOWER.cols; ROWS = TOWER.rows;
    showPanel('menu-panel', false);
    showPanel('hero-select-panel', false);
    gameState = 'TOWER';
    log(`🗼 Tower Chaos: entrás a la torre con ${player.name}. Arrancás solo con tu innato: subí de nivel, encontrá al guardián de cada piso y subí la escalera. Hay ${TOWER.floors} niveles.`);
    enterTowerFloor(1, 'start');
}

function towerLevel(floor) {
    if (!towerRun.levels[floor]) towerRun.levels[floor] = generateTowerLevel(floor);
    return towerRun.levels[floor];
}

// Entra a un nivel (lo genera si es la primera vez). where: 'start' = entrada del nivel (o el círculo de piedra en el 1).
function enterTowerFloor(floor, where = 'start') {
    const level = towerLevel(floor);
    towerRun.floor = floor;
    arenas = [level];
    level.heroes = [player];
    player.arena = level;
    player.x = level.start.x; player.y = level.start.y;
    player.moveTarget = null; player.focus = null;
    level.creeps.forEach(c => { c.aggro = false; });
    level.fovKey = null; computeFov(level, player);
    setStateText(`TOWER CHAOS · NIVEL ${floor} DE ${TOWER.floors}`);
    sfx('wave');
    if (where === 'start') log(floor === 1 ? '🪨 Estás en el círculo de piedra, en la base de la torre.' : `🗼 Subiste al nivel ${floor}. El guardián cuida la escalera al siguiente.`);
}

// --- GENERACIÓN ---
// Salas rectangulares unidas por pasillos de 2 casillas de ancho. La sala más lejana de la entrada es la del guardián.
function generateTowerLevel(floor) {
    const W = TOWER.cols, H = TOWER.rows, R = TOWER.rooms;
    const walls = Array.from({ length: H }, () => new Uint8Array(W).fill(1));
    const carve = (x, y) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) walls[y][x] = 0; };
    const rooms = [];
    const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    for (let t = 0; t < R.tries && rooms.length < R.want; t++) {
        const w = rint(R.minW, R.maxW), h = rint(R.minH, R.maxH);
        const x = rint(1, W - w - 2), y = rint(1, H - h - 2);
        if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
        rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });
        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) carve(xx, yy);
    }
    // Respaldo: si el azar dejó menos de 3 salas, se agregan salas fijas (esquinas y centro) que no se pisen
    [[2, 2], [W - 12, H - 10], [Math.floor(W / 2) - 4, Math.floor(H / 2) - 3], [W - 12, 2], [2, H - 10]].forEach(([x, y]) => {
        if (rooms.length >= 3) return;
        const w = 8, h = 6;
        if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) return;
        rooms.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) carve(xx, yy);
    });
    // Pasillos: cada sala con la más cercana de las ya unidas (árbol) y un par de pasillos extra (vueltas)
    const corridor = (a, b) => {
        const horizontalFirst = Math.random() < 0.5;
        const hLine = (x1, x2, y) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) { carve(x, y); carve(x, y + 1); } };
        const vLine = (y1, y2, x) => { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) { carve(x, y); carve(x + 1, y); } };
        if (horizontalFirst) { hLine(a.cx, b.cx, a.cy); vLine(a.cy, b.cy, b.cx); } else { vLine(a.cy, b.cy, a.cx); hLine(a.cx, b.cx, b.cy); }
    };
    const joined = [rooms[0]];
    rooms.slice(1).forEach(r => {
        const near = joined.reduce((best, o) => (Math.hypot(o.cx - r.cx, o.cy - r.cy) < Math.hypot(best.cx - r.cx, best.cy - r.cy) ? o : best));
        corridor(near, r); joined.push(r);
    });
    for (let i = 0; i < 2 && rooms.length > 3; i++) corridor(pickRandom(rooms), pickRandom(rooms));

    const level = makeArena('tower', []);
    Object.assign(level, { floor, walls, rooms, explored: Array.from({ length: H }, () => new Uint8Array(W)), corpses: [] });
    const startRoom = rooms[0];
    level.start = { x: startRoom.cx, y: startRoom.cy };
    // Sala del guardián: la más lejana caminando desde la entrada
    const dist = bfsFrom(level, level.start.x, level.start.y);
    const guardRoom = rooms.slice(1).reduce((best, r) => (dist[r.cy * W + r.cx] > dist[best.cy * W + best.cx] ? r : best), rooms[1]);
    level.stairs = { x: guardRoom.cx + Math.min(2, Math.floor(guardRoom.w / 2) - 1), y: guardRoom.cy };
    const t = pickRandom(ROUND_BOSSES);
    const g = makeCreep(t, guardRoom.cx - 1, guardRoom.cy, TOWER.guardianMult(floor), false, 0);
    Object.assign(g, { isRoundBoss: true, isGuardian: true, arena: level, level: floor + 1, xp: Math.round(120 * TOWER.xpMult(floor + 1)), gold: 50 * floor });
    level.creeps.push(g);
    level.boss = g;
    level.guardian = g;
    // Creeps sueltos: un grupo por sala (menos la de entrada y la del guardián)
    const pool = towerCreepPool(floor);
    rooms.filter(r => r !== startRoom && r !== guardRoom).forEach(r => {
        const n = rint(TOWER.packSize[0], TOWER.packSize[1]);
        for (let i = 0; i < n; i++) {
            const type = pickRandom(pool);
            const lvl = floor + (Math.random() < 0.3 ? 1 : 0);
            for (let k = 0; k < (type.groupSize || 1); k++) {
                const c = makeCreep(type, rint(r.x, r.x + r.w - 1), rint(r.y, r.y + r.h - 1), TOWER.creepMult(lvl), false, 0);
                Object.assign(c, { arena: level, level: lvl, xp: Math.round(type.xp * TOWER.xpMult(lvl)) });
                level.creeps.push(c);
            }
        }
    });
    level.creeps.forEach(c => { c.spawnTime = -1e9; }); // sin el oro extra por velocidad de las oleadas (no aplica en la Torre)
    return level;
}

// Pasos posibles: en cruz (los creeps caminan así, como en el modo normal) y, para los héroes, también en diagonal.
const STEPS_4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const STEPS_8 = [...STEPS_4, [1, 1], [1, -1], [-1, 1], [-1, -1]];
// Un paso en diagonal no puede cortar la esquina de una pared: las dos casillas en cruz tienen que estar libres.
function canStep(level, x, y, dx, dy) {
    if (!walkable(level, x + dx, y + dy)) return false;
    return !(dx && dy) || (walkable(level, x + dx, y) && walkable(level, x, y + dy));
}

// Distancias caminando desde (x, y) a todo el nivel (Int32Array; -1 = no se llega). diagonal: contando pasos en diagonal.
function bfsFrom(level, x, y, diagonal = false) {
    const W = COLS, H = ROWS, dist = new Int32Array(W * H).fill(-1);
    if (!walkable(level, x, y)) return dist;
    const queue = [y * W + x]; dist[y * W + x] = 0;
    for (let qi = 0; qi < queue.length; qi++) {
        const i = queue[qi], cx = i % W, cy = (i - cx) / W;
        for (const [dx, dy] of diagonal ? STEPS_8 : STEPS_4) {
            const nx = cx + dx, ny = cy + dy;
            if (!canStep(level, cx, cy, dx, dy) || dist[ny * W + nx] >= 0) continue;
            dist[ny * W + nx] = dist[i] + 1; queue.push(ny * W + nx);
        }
    }
    return dist;
}

// Mapa de distancias hacia un destino, con caché por nivel (muchos creeps comparten el mismo destino: el héroe).
function flowField(level, tx, ty, diagonal = false) {
    const key = tx + ',' + ty + (diagonal ? 'd' : '');
    level.flowCache = level.flowCache || new Map();
    let f = level.flowCache.get(key);
    if (!f) {
        f = bfsFrom(level, tx, ty, diagonal);
        if (level.flowCache.size > 24) level.flowCache.clear();
        level.flowCache.set(key, f);
    }
    return f;
}

// Paso siguiente (dx, dy) para ir de `unit` a `target` rodeando paredes, o null si ya llegó o no hay camino.
// Los héroes caminan también en diagonal; entre pasos igual de buenos, el que apunta más derecho al destino.
function towerPathDir(unit, target) {
    const diagonal = !!unit.isHero, tx = Math.round(target.x), ty = Math.round(target.y);
    const level = unit.arena, f = flowField(level, tx, ty, diagonal);
    const here = f[unit.y * COLS + unit.x];
    if (here <= 0) return null;
    let best = null, bestD = here, bestAim = Infinity;
    for (const [dx, dy] of diagonal ? STEPS_8 : STEPS_4) {
        if (!canStep(level, unit.x, unit.y, dx, dy)) continue;
        const d = f[(unit.y + dy) * COLS + unit.x + dx];
        if (d < 0) continue;
        const aim = Math.hypot(tx - unit.x - dx, ty - unit.y - dy);
        if (d < bestD || (d === bestD && best && aim < bestAim)) { bestD = d; bestAim = aim; best = { dx, dy }; }
    }
    return best;
}

// Movimiento de un creep en la Torre (lo llama stepCreepToward): por el camino, con cuerpos físicos.
function towerStepCreep(c, tx, ty, dt) {
    c.moveTimer += dt * 1000;
    const stepTime = c.moveInterval / (effMoveMult(c) * MOVE_SPEED_MULT);
    if (c.moveTimer < stepTime) return;
    const dir = towerPathDir(c, { x: tx, y: ty });
    if (!dir) return;
    if (c.moveTimer < stepTime * (1 + bodyPenalty(c, c.x + dir.dx, c.y + dir.dy))) return;
    c.moveTimer = 0;
    c.x += dir.dx; c.y += dir.dy;
}

// --- VISIÓN ---
// Distancia de visión del héroe: base + puntos de Visión (ver la ventana de stats).
function heroSight(hero) { return TOWER.baseSight + ((hero.towerStats && hero.towerStats.vis) || 0) * TOWER.visionPerPoint; }

// ¿Hay pared entre (x0, y0) y (x1, y1)? Recorre la línea casilla por casilla (sin contar las puntas).
function lineClear(level, x0, y0, x1, y1) {
    let x = x0, y = y0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (true) {
        if (x === x1 && y === y1) return true;
        if ((x !== x0 || y !== y0) && level.walls[y][x]) return false;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x += sx; }
        if (e2 <= dx) { err += dx; y += sy; }
    }
}

// Campo de visión: lo que el héroe ve ahora (las paredes tapan) y lo que ya descubrió. Se recalcula solo si se movió.
function computeFov(level, hero) {
    const r = heroSight(hero), key = hero.x + ',' + hero.y + ',' + r;
    if (level.fovKey === key && level.visible) return;
    level.fovKey = key;
    const W = COLS, vis = level.visible = new Uint8Array(W * ROWS), R = Math.ceil(r);
    for (let y = Math.max(0, hero.y - R); y <= Math.min(ROWS - 1, hero.y + R); y++)
        for (let x = Math.max(0, hero.x - R); x <= Math.min(COLS - 1, hero.x + R); x++) {
            if (Math.hypot(x - hero.x, y - hero.y) > r || !lineClear(level, hero.x, hero.y, x, y)) continue;
            vis[y * W + x] = 1;
            if (!level.explored[y][x]) { level.explored[y][x] = 1; markMinimap(level, x, y); }
        }
}
function canSee(level, x, y) { return !!(level.visible && level.visible[y * COLS + x]); }

// --- CADA FRAME ---
function updateTower(dt) {
    const level = player.arena;
    if (!level) return;
    tickEffects(player, dt);
    level.creeps.forEach(c => { if (c.isAlive()) tickEffects(c, dt); });
    // Renacer en el círculo de piedra (nivel 1)
    if (!player.isAlive() && player.respawnAt && gameClock >= player.respawnAt) { towerRespawn(); return; }
    updateHero(player, level, dt);
    if (player.isAlive()) computeFov(level, player);
    updateProjectiles(level, dt);
    // Creeps: solo se mueven los que te vieron (radio de alerta); te sueltan si te alejás mucho de su lugar
    level.creeps.forEach(c => {
        if (!c.isAlive()) return;
        const d = Math.hypot(c.x - player.x, c.y - player.y);
        if (!c.aggro && player.isAlive() && d <= TOWER.aggroRadius && canSee(level, c.x, c.y)) c.aggro = true; // te tienen que ver
        if (c.aggro && (!player.isAlive() || Math.hypot(player.x - c.spawnX, player.y - c.spawnY) > TOWER.leash)) {
            c.aggro = false;
        }
        if (c.aggro) updateCreep(c, dt);
        else if (c.x !== c.spawnX || c.y !== c.spawnY) stepCreepToward(c, c.spawnX, c.spawnY, dt); // vuelve a su lugar
    });
    // El guardián muerto abre la escalera; pisarla te sube
    const g = level.guardian;
    if (g && !g.isAlive() && !level.stairsOpen) {
        level.stairsOpen = true;
        log(`🗝️ ¡Venciste al guardián del nivel ${level.floor}! La escalera está abierta.`);
        sfx('win');
        if (level.floor >= TOWER.floors) { towerVictory(); return; }
    }
    if (player.isAlive() && player.x === level.stairs.x && player.y === level.stairs.y) {
        if (level.stairsOpen) enterTowerFloor(level.floor + 1);
        else if (!level.stairsWarned) { level.stairsWarned = true; log('🔒 La escalera está cerrada: primero vencé al guardián.'); }
    } else level.stairsWarned = false;
}

// --- MUERTE ---
function towerHeroDeath(hero, killer) {
    const level = hero.arena;
    hero.hp = 0;
    hero.effects = hero.effects.filter(e => e.flags.includes('persistent'));
    hero.respawnAt = gameClock + TOWER.respawnDelay;
    towerRun.deaths++;
    level.corpses.push({ x: hero.x, y: hero.y, killer: killer ? killer.label : null, at: gameClock });
    // Perdés la mitad de lo ganado por encima de la base (nunca bajás de la base)
    const lost = [];
    ['str', 'agi', 'int'].forEach(k => {
        const base = towerRun.base[k], gained = hero[k] - base;
        if (gained > 0) { hero[k] = base + gained / 2; lost.push(`${Math.floor(gained / 2)} de ${{ str: 'Fuerza', agi: 'Agilidad', int: 'Inteligencia' }[k]}`); }
    });
    hero.recalculateStats();
    sfx('lose');
    log(`💀 ${killer ? killer.label + ' te mató' : 'Moriste'} en el nivel ${level.floor}. ${lost.length ? 'Perdés ' + lost.join(', ') + '. ' : ''}Renacés en el círculo de piedra de la base en ${TOWER.respawnDelay}s.`);
}

function towerRespawn() {
    player.respawnAt = 0;
    player.hp = player.maxHp; player.mana = player.maxMana;
    enterTowerFloor(1, 'respawn');
    log('🪨 Renacés en el círculo de piedra. Los niveles siguen como los dejaste: hay que subir de nuevo.');
}

function towerVictory() {
    gameState = 'ENDED';
    setStateText('¡CONQUISTASTE LA TORRE!');
    log(`🏆 ¡Venciste al guardián del último nivel! ${player.displayName} conquistó la Torre (nivel ${player.level}, ${towerRun.deaths} muerte${towerRun.deaths === 1 ? '' : 's'}).`);
    showPanel('restart-btn', true);
}

// --- INTERFAZ ---
function towerStatusText() {
    if (!player.isAlive() && player.respawnAt) return `☠ Renacés en ${Math.max(0, player.respawnAt - gameClock).toFixed(1)}s`;
    const level = player.arena;
    return `🗼 Nivel ${level.floor}/${TOWER.floors} · ${level.stairsOpen ? 'escalera abierta' : 'guardián vivo'}`;
}
function towerInfoHtml() {
    const level = player.arena;
    const alive = level.creeps.filter(c => c.isAlive() && !c.isGuardian).length;
    return `<h3>🗼 Tower Chaos · nivel ${level.floor} de ${TOWER.floors}</h3>` +
        `<p class="subtitle">Explorá, subí de nivel y vencé al <b>guardián</b> (${level.guardian.label}) para abrir la escalera.</p>` +
        `<p class="subtitle">Creeps en este nivel: ${alive}. Muertes en la run: ${towerRun.deaths}. Al morir renacés en la base y perdés la mitad de los atributos ganados.</p>` +
        `<p class="subtitle" style="color:#888">En construcción: ítems, cofres, biomas y más (ver docs/ROGUELIKE.md).</p>`;
}

// Baldosas del nivel (se dibujan una vez y se reutilizan): 4 pisos de piedra, pared de frente y pared de arriba.
// Se dibujan solo las casillas de la pantalla (un nivel de 90×60 entero serían ~25 MB de imagen).
let towerTileCache = null;
function towerTiles() {
    if (towerTileCache) return towerTileCache;
    let seed = 4242;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const tile = draw => { const c = document.createElement('canvas'); c.width = c.height = TILE; draw(c.getContext('2d')); return c; };
    const floor = shade => tile(g => {
        g.fillStyle = shade; g.fillRect(0, 0, TILE, TILE);
        g.fillStyle = '#24212a'; g.fillRect(0, 0, TILE, 1); g.fillRect(0, 0, 1, TILE);
        for (let i = 0; i < 6; i++) { g.fillStyle = rnd() < 0.5 ? '#38343e' : '#232028'; g.fillRect(Math.floor(rnd() * 15) * 2, Math.floor(rnd() * 15) * 2, 2, 2); }
    });
    const wall = face => tile(g => {
        g.fillStyle = '#1b1820'; g.fillRect(0, 0, TILE, TILE);
        g.fillStyle = face ? '#4a3f52' : '#2a2430';
        for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) g.fillRect(((r % 2) * 8) + k * 17, r * 11 + 1, 15, 9);
    });
    return (towerTileCache = { floors: ['#2e2b33', '#2a2730', '#322e37', '#29262d'].map(floor), face: wall(true), top: wall(false) });
}
function drawTowerTiles(level) {
    const t = towerTiles();
    const x0 = Math.floor(camera.x), y0 = Math.floor(camera.y);
    for (let y = y0; y <= Math.min(ROWS - 1, y0 + VIEW_ROWS); y++) for (let x = x0; x <= Math.min(COLS - 1, x0 + VIEW_COLS); x++) {
        if (!level.explored[y][x]) continue;
        const img = level.walls[y][x] ? (y + 1 < ROWS && !level.walls[y + 1][x] ? t.face : t.top) : t.floors[((x * 73856093) ^ (y * 19349663)) & 3];
        ctx.drawImage(img, x * TILE, y * TILE);
    }
    // Círculo de piedra en la entrada del nivel 1
    if (level.floor === 1 && level.explored[level.start.y][level.start.x]) {
        const cx = level.start.x * TILE + TILE / 2, cy = level.start.y * TILE + TILE / 2;
        for (let i = 0; i < 8; i++) {
            const a = i / 8 * Math.PI * 2, sx = cx + Math.cos(a) * TILE * 1.6, sy = cy + Math.sin(a) * TILE * 1.6;
            ctx.fillStyle = '#8d99ae'; ctx.fillRect(sx - 5, sy - 8, 10, 14); ctx.fillStyle = '#5c677d'; ctx.fillRect(sx - 5, sy + 3, 10, 3);
        }
    }
}

// Minimapa guardado en una imagen chica (2 px por casilla) que se va pintando a medida que descubrís.
function markMinimap(level, x, y) {
    if (typeof document === 'undefined') return;
    if (!level.minimap) { level.minimap = document.createElement('canvas'); level.minimap.width = COLS * 2; level.minimap.height = ROWS * 2; }
    const g = level.minimap.getContext('2d');
    g.fillStyle = level.walls[y][x] ? '#4a3f52' : '#8d8a94';
    g.fillRect(x * 2, y * 2, 2, 2);
}

function updateCamera(level, hero, dt) {
    const pos = drawPos(hero, 0);
    camera.x = Math.max(0, Math.min(COLS - VIEW_COLS, pos.x - VIEW_COLS / 2 + 0.5));
    camera.y = Math.max(0, Math.min(ROWS - VIEW_ROWS, pos.y - VIEW_ROWS / 2 + 0.5));
}

function renderTower(level, dt) {
    updateArenaFx(level, dt);
    updateCamera(level, player, dt);
    ctx.save();
    if (shakeAmount) ctx.translate((Math.random() - 0.5) * shakeAmount * 2, (Math.random() - 0.5) * shakeAmount * 2);
    ctx.translate(-camera.x * TILE, -camera.y * TILE);
    drawTowerTiles(level);
    // Escalera (cerrada hasta vencer al guardián)
    const st = level.stairs, sx = st.x * TILE, sy = st.y * TILE;
    if (level.explored[st.y][st.x]) {
        ctx.fillStyle = level.stairsOpen ? '#2dc653' : '#6c757d';
        for (let i = 0; i < 4; i++) ctx.fillRect(sx + 4 + i * 3, sy + TILE - 8 - i * 7, TILE - 8 - i * 6, 5);
        if (!level.stairsOpen) { ctx.font = '14px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🔒', sx + TILE / 2, sy + TILE / 2); }
    }
    // Cadáveres
    ctx.font = '16px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#adb5bd';
    level.corpses.forEach(c => ctx.fillText('☠', c.x * TILE + TILE / 2, c.y * TILE + TILE / 2));
    // Creeps visibles (dentro de tu radio de visión) y proyectiles
    const visible = c => canSee(level, c.x, c.y);
    level.creeps.forEach(c => { if (c.isAlive() && visible(c)) drawUnit(c, c.color, c.symbol, drawPos(c, dt), { glow: c.isGuardian, big: c.isGuardian }); });
    level.projectiles.forEach(p => {
        ctx.fillStyle = p.isCrit ? '#ffd166' : (p.attacker.isHero ? heroColor(p.attacker) : p.attacker.color || '#fefae0');
        ctx.beginPath(); ctx.arc(p.x * TILE + TILE / 2, p.y * TILE + TILE / 2, p.isCrit ? 4 : 3, 0, Math.PI * 2); ctx.fill();
    });
    if (player.isAlive()) {
        const pos = drawPos(player, dt);
        ctx.save(); ctx.strokeStyle = heroColor(player); ctx.globalAlpha = 0.45; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(pos.x * TILE + TILE / 2, pos.y * TILE + TILE / 2, effRange(player) * TILE, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        drawUnit(player, heroColor(player), player.symbol, pos, { glow: true });
    }
    drawArenaFx(level);
    drawMouseOverlay(level);
    // Niebla: lo no descubierto, negro; lo descubierto fuera de la vista, oscurecido
    const x0 = Math.floor(camera.x), y0 = Math.floor(camera.y);
    for (let y = y0; y <= Math.min(ROWS - 1, y0 + VIEW_ROWS); y++) for (let x = x0; x <= Math.min(COLS - 1, x0 + VIEW_COLS); x++) {
        if (!level.explored[y][x]) { ctx.fillStyle = '#000'; ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1); }
        else if (!canSee(level, x, y)) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1); }
    }
    ctx.restore();
    renderTowerMinimap(level);
    // Barra del guardián cuando lo tenés a la vista
    const g = level.guardian;
    if (g && g.isAlive() && visible(g)) {
        ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = g.color;
        ctx.fillText(`👹 Guardián: ${g.label} · ${Math.max(0, Math.round(g.hp))} / ${g.maxHp}`, MAP_W / 2, TILE * 0.5);
        ctx.fillStyle = '#330010'; ctx.fillRect(TILE * 3, TILE * 0.8, MAP_W - TILE * 6, 5);
        ctx.fillStyle = '#ff0055'; ctx.fillRect(TILE * 3, TILE * 0.8, (MAP_W - TILE * 6) * Math.max(0, g.hp) / g.maxHp, 5);
    }
    if (paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, MAP_W, MAP_H);
        ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffb703';
        ctx.fillText('PAUSA', MAP_W / 2, MAP_H / 2);
    }
}

// Minimapa (arriba a la derecha): lo descubierto, la escalera, el guardián si lo viste y vos.
function renderTowerMinimap(level) {
    const s = 1.7, w = COLS * s, h = ROWS * s, ox = MAP_W - w - 8, oy = 8;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(ox - 3, oy - 3, w + 6, h + 6);
    if (level.minimap) ctx.drawImage(level.minimap, ox, oy, w, h);
    const dot = (x, y, color, r = 2.2) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(ox + (x + 0.5) * s, oy + (y + 0.5) * s, r, 0, Math.PI * 2); ctx.fill(); };
    if (level.explored[level.stairs.y][level.stairs.x]) dot(level.stairs.x, level.stairs.y, level.stairsOpen ? '#2dc653' : '#adb5bd', 2.6);
    const g = level.guardian;
    if (g && g.isAlive() && level.explored[g.y][g.x]) dot(g.x, g.y, '#ff0055', 2.6);
    level.corpses.forEach(c => dot(c.x, c.y, '#adb5bd', 1.6));
    if (player.isAlive()) dot(player.x, player.y, '#00f5d4', 2.4);
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
    ctx.strokeRect(ox + camera.x * s, oy + camera.y * s, VIEW_COLS * s, VIEW_ROWS * s);
}

// --- PILOTO AUTOMÁTICO EN LA TORRE (también lo usan las pruebas y las mediciones) ---
// Pelea con lo que lo persigue; si no hay nada, va al creep más cercano (por el camino); sin creeps, al guardián; con la
// escalera abierta, a la escalera.
function towerAutoDir(hero) {
    const level = hero.arena;
    const range = effRange(hero);
    const chasing = level.creeps.filter(c => c.isAlive() && c.aggro);
    const inRange = chasing.find(c => Math.hypot(c.x - hero.x, c.y - hero.y) <= range);
    if (inRange) return movesToFight(hero) ? circleStep(hero, inRange) : { dx: 0, dy: 0 };
    let target = null;
    if (level.stairsOpen) target = level.stairs;
    else {
        const dist = bfsFrom(level, hero.x, hero.y);
        const others = level.creeps.filter(c => c.isAlive() && (!c.isGuardian || level.creeps.every(o => !o.isAlive() || o.isGuardian || dist[o.y * COLS + o.x] < 0)));
        let best = Infinity;
        others.forEach(c => { const d = dist[c.y * COLS + c.x]; if (d >= 0 && d < best) { best = d; target = c; } });
        if (!target) target = level.guardian;
    }
    return (target && towerPathDir(hero, target)) || { dx: 0, dy: 0 };
}
