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
    floors: 10, cols: 160, rows: 110, // cada piso: campo del bioma + pueblo + laberinto (towerWorld.js)
    heroSpeed: 1.4,       // el héroe camina 40% más rápido que en una arena (el mapa es mucho más grande)
    rooms: { tries: 900, want: 24, minW: 6, maxW: 13, minH: 5, maxH: 10 },
    baseSight: 6,         // distancia de visión base del héroe (las paredes tapan la vista)
    visionPerPoint: 0.5,  // cada punto de Visión suma media casilla
    pointsPerLevel: 5,    // puntos de stats por nivel del héroe (se reparten en la ventana de stats, tecla C)
    vitHp: 15, vitRegen: 0.1,   // lo que da cada punto de Vitalidad
    aggroRadius: 6,       // los creeps te persiguen si estás a esta distancia o menos
    leash: 16,            // y te sueltan si te alejás más que esto de su lugar
    respawnDelay: 3,
    goldMult: 0.5,        // oro de los creeps (con el mercader, el oro del modo normal alcanzaba para todo)
    packSize: [2, 4],     // creeps por sala
    // Stats fijos por nivel de creep (vida y daño ×) y experiencia (×)
    creepMult: level => 1 + 0.8 * (level - 1), // 0,4 → 0,8 en la revisión de diseño (con 0,4 y 0,55 el piloto automático ganaba en ~60 min con 0-2 muertes)
    xpMult: level => 1 + 0.3 * (level - 1),
    guardianMult: floor => 0.35 * (1 + 0.85 * (floor - 1))
};

let gameMode = 'normal'; // 'normal' | 'tower'
let towerRun = null;     // { floor, levels: [], base: { str, agi, int }, deaths, startedAt }
const camera = { x: 0, y: 0 };

// --- RUN ---
// Sin elección de héroe: arrancás como aventurero sin clase (towerItems.js); tu clase sale del equipo.
function startTowerRun() {
    resetGame();
    gameMode = 'tower';
    player = new Hero(ADVENTURER);
    giveTowerGear(player);
    player.addSkill(ADVENTURER_STRIKE); syncAdventurerStrike(player); // Golpe Certero en la E (towerItems.js)
    applyGear(player);
    const starter = giveStarterSpell(player); // hechizo inicial al azar (towerItems.js)
    player.ownerName = playerName();
    player.displayName = `${player.name} (${player.ownerName})`;
    player.inRest = false;
    player.towerStats = { str: 0, agi: 0, int: 0, vit: 0, vis: 0 }; // puntos puestos en cada stat
    player.statPoints = 0;
    heroes = [player];
    viewedHero = player;
    heroOffers = null;
    towerRun = { floor: 1, levels: [], base: { str: player.str, agi: player.agi, int: player.int }, deaths: 0, startedAt: gameClock,
        stats: { kills: 0, champions: 0, guardians: 0, shrines: 0, gold: 0, bestFloor: 1 } }; // crónica de la run
    COLS = TOWER.cols; ROWS = TOWER.rows;
    showPanel('menu-panel', false);
    showPanel('hero-select-panel', false);
    gameState = 'TOWER';
    document.body.classList.add('ink-theme');
    log(`🗼 Tower Chaos: entrás a la torre como aventurero sin clase. Tenés Golpe Certero en la E; cada pieza de equipo trae la habilidad de un héroe: buscala en cofres y en lo que sueltan los creeps (I: inventario, C: stats). Hay ${TOWER.floors} pisos, cada uno con su bioma, su pueblo y su laberinto.`);
    log(`✨ Hechizo inicial: ${itemSkill(starter).name} (${starter.name}, ya equipada en la ${player.keyBindings[itemSkill(starter).id].toUpperCase()}).`);
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
    towerRun.stats.bestFloor = Math.max(towerRun.stats.bestFloor, floor);
    arenas = [level];
    level.heroes = [player];
    player.arena = level;
    player.x = level.start.x; player.y = level.start.y;
    player.moveTarget = null; player.focus = null;
    level.creeps.forEach(c => { c.aggro = false; });
    player.towerZone = undefined;
    level.titleAt = gameClock;
    level.fovKey = null; computeFov(level, player);
    const B = BIOMES[level.biome];
    setStateText(`TOWER CHAOS · PISO ${floor} DE ${TOWER.floors} · ${B.name.toUpperCase()}`);
    sfx('wave');
    if (where === 'start') log(`${floor === 1 ? '🪨 Estás en el círculo de piedra, en la base de la torre.' : `🗼 Subiste al piso ${floor}.`} ${B.icon} ${B.name}: seguí el camino al pueblo y, más allá, al laberinto donde el guardián cuida la escalera. ${B.hazard.name}: ${B.hazard.desc}.${B.climate ? ` ${B.climate.name}: ${B.climate.desc}.` : ''}`);
}

// --- GENERACIÓN ---
// Cada piso (campo del bioma, pueblo y laberinto) lo arma generateTowerLevel en towerWorld.js.

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
    // Los de cuerpo a cuerpo te rodean: van a una casilla libre a tu lado en vez de hacer fila detrás del primero
    if (player && tx === player.x && ty === player.y && c.range < 2.5) { const slot = surroundSlot(c); if (slot) { tx = slot.x; ty = slot.y; } }
    const dir = towerPathDir(c, { x: tx, y: ty });
    if (!dir) return;
    if (c.moveTimer < stepTime * (1 + bodyPenalty(c, c.x + dir.dx, c.y + dir.dy))) return;
    c.moveTimer = 0;
    c.x += dir.dx; c.y += dir.dy;
}

// --- IA DE LOS CREEPS (Torre) ---
// Comportamientos: avisan a los compañeros, te rodean, los de lejos mantienen distancia, el apoyo se queda atrás y
// huyen con poca vida. Los mueve towerCreepBrain antes de su ataque normal (updateCreep).
const CREEP_AI = { alertRadius: 5, kiteBelow: 2.5, supportKeep: 3.5, fleeBelow: 0.25, fleeFor: 3 };
const SUPPORT_CREEPS = ['HEALER', 'DRUMMER', 'SHAMAN'];

// Casilla libre al lado del héroe, la más cercana al creep (o null si no hay).
function surroundSlot(c) {
    const level = c.arena;
    let best = null, bestD = Infinity;
    for (const [dx, dy] of STEPS_4) {
        const x = player.x + dx, y = player.y + dy;
        if (!walkable(level, x, y)) continue;
        const taken = level.creeps.some(o => o !== c && o.isAlive() && o.x === x && o.y === y);
        if (taken && !(c.x === x && c.y === y)) continue;
        const d = Math.hypot(x - c.x, y - c.y);
        if (d < bestD) { bestD = d; best = { x, y }; }
    }
    return best;
}

// Un paso alejándose de `from` (por el piso, sin cortar esquinas). Devuelve false si está acorralado.
function towerStepAway(c, from, dt) {
    c.moveTimer += dt * 1000;
    const stepTime = c.moveInterval / (effMoveMult(c) * MOVE_SPEED_MULT);
    if (c.moveTimer < stepTime) return true;
    const here = Math.hypot(c.x - from.x, c.y - from.y);
    let best = null, bestD = here;
    for (const [dx, dy] of STEPS_4) {
        if (!canStep(c.arena, c.x, c.y, dx, dy) || bodyPenalty(c, c.x + dx, c.y + dy) > 0) continue;
        const d = Math.hypot(c.x + dx - from.x, c.y + dy - from.y);
        if (d > bestD) { bestD = d; best = { dx, dy }; }
    }
    if (!best) return false;
    c.moveTimer = 0;
    c.x += best.dx; c.y += best.dy;
    return true;
}

// Decide qué hace un creep que te persigue. Devuelve true si ya se movió (no ataca este frame).
function towerCreepBrain(c, dt) {
    const d = Math.hypot(c.x - player.x, c.y - player.y);
    if (!c.isGuardian && c.hp / c.maxHp < CREEP_AI.fleeBelow && !c.fledOnce) { c.fledOnce = true; c.scaredUntil = gameClock + CREEP_AI.fleeFor; }
    if (gameClock < (c.scaredUntil || 0)) return towerStepAway(c, player, dt);               // huye con poca vida
    if (SUPPORT_CREEPS.includes(c.type.key) && d < CREEP_AI.supportKeep) return towerStepAway(c, player, dt); // apoyo: atrás
    if (c.range >= 3 && d < CREEP_AI.kiteBelow) return towerStepAway(c, player, dt);         // a distancia: no te deja pegarle
    return false;
}

// Cuando uno te ve, avisa a los que están cerca y lo pueden ver a él.
function alertPack(level, c) {
    level.creeps.forEach(o => {
        if (o.aggro || !o.isAlive() || o.isGuardian) return;
        if (Math.hypot(o.x - c.x, o.y - c.y) <= CREEP_AI.alertRadius && lineClear(level, o.x, o.y, c.x, c.y)) { o.aggro = true; o.alertedAt = gameClock; }
    });
}

// --- VISIÓN ---
// Distancia de visión del héroe: base + puntos de Visión (ver la ventana de stats).
function heroSight(hero) { return Math.max(2, TOWER.baseSight + ((hero.towerStats && hero.towerStats.vis) || 0) * TOWER.visionPerPoint + climateSight(hero)); }

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
    if (towerModalOpen()) return; // con stats, inventario o forja abiertos, la partida espera
    if (autopilot) { if (player.statPoints) aiSpendStatPoints(player); aiManageGear(player); aiTowerShop(player); }
    else if (pendingForge(player)) { openForge(pendingForge(player)); return; }
    updateHero(player, level, dt);
    unstickFromWall(player);
    towerTerrainTick(level, player, dt); // terreno, clima, pueblo y mercader (towerWorld.js)
    const safe = heroInTown(player);     // en el pueblo los creeps no te persiguen
    if (player.isAlive()) { computeFov(level, player); towerPickup(player); recoverCorpse(level, player); }
    updateProjectiles(level, dt);
    // Creeps: solo se mueven los que te vieron (radio de alerta); te sueltan si te alejás mucho de su lugar
    level.creeps.forEach(c => {
        if (!c.isAlive()) return;
        unstickFromWall(c);
        const d = Math.hypot(c.x - player.x, c.y - player.y);
        if (!c.aggro && !safe && player.isAlive() && d <= TOWER.aggroRadius && canSee(level, c.x, c.y)) { c.aggro = true; alertPack(level, c); } // te tienen que ver
        if (c.aggro && (!player.isAlive() || safe || Math.hypot(player.x - c.spawnX, player.y - c.spawnY) > TOWER.leash)) {
            c.aggro = false;
        }
        if (c.regenPct) c.hp = Math.min(c.maxHp, c.hp + c.maxHp * c.regenPct * dt); // campeón Regenerador
        if (c.aggro) { if (!(player.isAlive() && towerCreepBrain(c, dt))) updateCreep(c, dt); }
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

// --- STATS DEL HÉROE (puntos para repartir, como Diablo) ---
const TOWER_STATS = {
    str: { name: 'Fuerza', icon: '💪', color: '#ff6b6b', gives: () => `+${ATTRIBUTE_RULES.str.hp} vida y +${ATTRIBUTE_RULES.str.hpRegen} regeneración por punto (daño si es tu atributo principal)` },
    agi: { name: 'Agilidad', icon: '🏹', color: '#69db7c', gives: () => `+1% vel. de ataque, +${ATTRIBUTE_RULES.agi.armor} armadura y +${ATTRIBUTE_RULES.agi.critChance}% crítico por punto (daño si es tu principal)` },
    int: { name: 'Inteligencia', icon: '🔮', color: '#74c0fc', gives: () => `+${ATTRIBUTE_RULES.int.mana} maná y +${ATTRIBUTE_RULES.int.spellAmp}% amplificación por punto (daño si es tu principal)` },
    vit: { name: 'Vitalidad', icon: '❤', color: '#ff477e', gives: () => `+${TOWER.vitHp} vida y +${TOWER.vitRegen} regeneración por punto` },
    vis: { name: 'Visión', icon: '👁', color: '#ffd166', gives: () => `+${TOWER.visionPerPoint} casilla de distancia de visión por punto` }
};
function towerStatValue(hero, k) {
    if (k === 'vit') return hero.towerStats.vit;
    if (k === 'vis') return heroSight(hero);
    return Math.floor(hero[k]);
}
// Suma (o resta, n < 0) puntos a un stat y aplica lo que da.
function changeTowerStat(hero, k, n) {
    hero.towerStats[k] += n;
    if (k === 'str' || k === 'agi' || k === 'int') hero[k] += n;
    else if (k === 'vit') { hero.bonus.maxHp += n * TOWER.vitHp; hero.bonus.hpRegen = (hero.bonus.hpRegen || 0) + n * TOWER.vitRegen; if (n > 0) hero.hp += n * TOWER.vitHp; }
    hero.recalculateStats();
}
function spendStatPoint(hero, k) {
    if (!hero.statPoints || !TOWER_STATS[k]) return false;
    hero.statPoints--;
    changeTowerStat(hero, k, 1);
    if (hero === player) renderStatsWindow();
    return true;
}
// La IA (piloto automático) reparte: 3 al atributo principal y 2 a Vitalidad por nivel.
function aiSpendStatPoints(hero) {
    const main = { STR: 'str', AGI: 'agi', INT: 'int' }[hero.primaryAttr];
    while (hero.statPoints > 0) spendStatPoint(hero, (hero.towerStats[main] + hero.towerStats.vit) % 5 < 3 ? main : 'vit');
}

// Ventana de stats (tecla C): la partida se pausa mientras está abierta.
let statsOpen = false;
function toggleStatsWindow(open = !statsOpen) {
    if (gameMode !== 'tower' || !player || !player.towerStats) return;
    statsOpen = open;
    showPanel('stats-container', open);
    if (open) renderStatsWindow();
}
function renderStatsWindow() {
    if (!statsOpen) return;
    document.getElementById('stats-points').textContent = player.statPoints ? `${player.statPoints} punto${player.statPoints === 1 ? '' : 's'} para repartir` : 'Sin puntos (subí de nivel)';
    const rows = document.getElementById('stats-rows'); rows.innerHTML = '';
    Object.entries(TOWER_STATS).forEach(([k, st]) => {
        const row = document.createElement('div');
        row.className = 'stat-row';
        row.innerHTML = `<span class="stat-icon">${st.icon}</span><span class="stat-name" style="color:${st.color}">${st.name}</span>` +
            `<span class="stat-value">${k === 'vis' ? towerStatValue(player, k).toFixed(1) : towerStatValue(player, k)}</span>` +
            `<span class="stat-spent">${player.towerStats[k] ? `+${player.towerStats[k]} puestos` : ''}</span>` +
            `<button class="stat-plus" ${player.statPoints ? '' : 'disabled'}>+</button><span class="stat-gives">${st.gives()}</span>`;
        row.querySelector('.stat-plus').onclick = () => spendStatPoint(player, k);
        rows.appendChild(row);
    });
}

// --- MUERTE ---
function towerHeroDeath(hero, killer) {
    const level = hero.arena;
    hero.hp = 0;
    hero.effects = hero.effects.filter(e => e.flags.includes('persistent'));
    hero.respawnAt = gameClock + TOWER.respawnDelay;
    towerRun.deaths++;
    // Perdés la mitad de los puntos puestos en cada stat (lo de base nunca se pierde), pero quedan en tus restos:
    // si volvés hasta ellos los recuperás (como en Dark Souls). Si morís otra vez antes, los anteriores se pierden.
    const lost = {}, lostText = [];
    Object.keys(hero.towerStats).forEach(k => {
        const n = Math.ceil(hero.towerStats[k] / 2);
        if (n > 0) { changeTowerStat(hero, k, -n); lost[k] = n; lostText.push(`${n} de ${TOWER_STATS[k].name}`); }
    });
    const old = towerRun.corpse;
    if (old && !old.recovered) { old.recovered = true; old.faded = true; }
    const corpse = { x: hero.x, y: hero.y, killer: killer ? killer.label : null, at: gameClock, floor: level.floor, lost, points: Object.values(lost).reduce((a, b) => a + b, 0) };
    level.corpses.push(corpse);
    towerRun.corpse = corpse.points ? corpse : null;
    sfx('lose');
    log(`💀 ${killer ? killer.label + ' te mató' : 'Moriste'} en el piso ${level.floor}. ${lostText.length ? 'Perdés ' + lostText.join(', ') + ': quedan en tus restos, volvé a buscarlos. ' : ''}` +
        `${old && old.faded && old.points ? `Tus restos anteriores (${old.points} puntos) se perdieron. ` : ''}Renacés en el círculo de piedra de la base en ${TOWER.respawnDelay}s.`);
}

// Pisar tus restos (los de la última muerte) te devuelve los puntos de stats que perdiste.
function recoverCorpse(level, hero) {
    const c = towerRun.corpse;
    if (!c || c.recovered || c.floor !== level.floor || Math.max(Math.abs(hero.x - c.x), Math.abs(hero.y - c.y)) > 1) return;
    c.recovered = true; towerRun.corpse = null;
    Object.entries(c.lost).forEach(([k, n]) => changeTowerStat(hero, k, n));
    if (fxArena(hero)) { fxRing(hero, '#c9a227', 2, 0.8); fxText(hero, `+${c.points} puntos recuperados`, '#c9a227', 13, 1.6); }
    log(`🕯️ Recuperaste tus restos: vuelven ${c.points} puntos de stats.`); sfx('levelup');
}

function towerRespawn() {
    player.respawnAt = 0;
    player.hp = player.maxHp; player.mana = player.maxMana;
    enterTowerFloor(1, 'respawn');
    log('🪨 Renacés en el círculo de piedra. Los pisos siguen como los dejaste: hay que subir de nuevo.');
}

function towerVictory() {
    gameState = 'ENDED';
    setStateText('¡CONQUISTASTE LA TORRE!');
    const s = towerRun.stats;
    log(`🏆 ¡Venciste al guardián del último piso! ${player.displayName} conquistó la Torre: nivel ${player.level}, ${Math.floor((gameClock - towerRun.startedAt) / 60)} minutos, ${towerRun.deaths} muerte${towerRun.deaths === 1 ? '' : 's'}, ${s.kills} bajas (${s.champions} campeones), ${s.shrines} santuarios.`);
    showPanel('restart-btn', true);
}

// --- INTERFAZ ---
function towerStatusText() {
    if (!player.isAlive() && player.respawnAt) return `☠ Renacés en ${Math.max(0, player.respawnAt - gameClock).toFixed(1)}s`;
    const level = player.arena;
    return `${BIOMES[level.biome].icon} Piso ${level.floor}/${TOWER.floors} · ${towerObjective(level).text}`;
}
function towerInfoHtml() {
    const level = player.arena;
    const alive = level.creeps.filter(c => c.isAlive() && !c.isGuardian).length;
    return `<h3>🗼 Tower Chaos · piso ${level.floor} de ${TOWER.floors}</h3>` +
        `<p class="subtitle">${biomeSummary(level)}</p>` +
        `<p class="subtitle">Cruzá el campo, descansá en el <b>pueblo</b> (zona segura, mercader con B) y entrá al <b>laberinto</b>: el guardián (${level.guardian.label}) cuida la escalera.</p>` +
        (player.statPoints ? `<button class="primary-btn" onclick="toggleStatsWindow(true)">📊 Repartir ${player.statPoints} punto${player.statPoints === 1 ? '' : 's'} de stats (C)</button>` : `<button class="secondary-btn" onclick="toggleStatsWindow(true)">📊 Stats del héroe (C)</button>`) +
        `<button class="secondary-btn" onclick="toggleInventory(true)">🎒 Equipo e inventario (I) · ${player.bag.length} en la bolsa</button>` +
        `<p class="subtitle">Creeps en este piso: ${alive}. Al morir renacés en la base y perdés la mitad de los atributos ganados.</p>` +
        towerChronicleHtml();
}
// Crónica de la run (como el resumen de Hades): lo que llevás hecho, aunque mueras.
function towerChronicleHtml() {
    const s = towerRun.stats, min = Math.floor((gameClock - towerRun.startedAt) / 60);
    return `<p class="subtitle tower-chronicle">📜 <b>Crónica</b> · ${min} min · mejor piso ${s.bestFloor} · ${towerRun.deaths} muerte${towerRun.deaths === 1 ? '' : 's'} · ` +
        `${s.kills} bajas (${s.champions} campeones, ${s.guardians} guardianes) · ${s.shrines} santuarios · ${s.gold}g ganados</p>`;
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
    const t = inkTiles(); // estética tinta y pergamino (inkart.js)
    const x0 = Math.floor(camera.x), y0 = Math.floor(camera.y);
    for (let y = y0; y <= Math.min(ROWS - 1, y0 + VIEW_ROWS); y++) for (let x = x0; x <= Math.min(COLS - 1, x0 + VIEW_COLS); x++) {
        if (!level.explored[y][x]) continue;
        const w = level.walls[y][x], labTile = !level.zone || (level.zone[y * COLS + x] === ZONE.lab && (!w || w === WALL.stone));
        const img = !labTile ? biomeTileFor(level, x, y) // campo y pueblo del bioma (towerWorld.js)
            : w ? (y + 1 < ROWS && !level.walls[y + 1][x] ? t.face : t.top) : t.floors[((x * 73856093) ^ (y * 19349663)) & 3];
        ctx.drawImage(img, x * TILE, y * TILE);
    }
    // Círculo de piedra en la entrada del nivel 1
    if (level.floor === 1 && level.explored[level.start.y][level.start.x]) {
        const cx = level.start.x * TILE + TILE / 2, cy = level.start.y * TILE + TILE / 2;
        for (let i = 0; i < 8; i++) {
            const a = i / 8 * Math.PI * 2, sx = cx + Math.cos(a) * TILE * 1.6, sy = cy + Math.sin(a) * TILE * 1.6;
            ctx.fillStyle = INK.stone; ctx.strokeStyle = INK.line; ctx.lineWidth = 2; // menhir dibujado en tinta
            ctx.beginPath(); ctx.moveTo(sx - 5, sy + 6); ctx.lineTo(sx - 6, sy - 6); ctx.lineTo(sx - 1, sy - 11); ctx.lineTo(sx + 5, sy - 7); ctx.lineTo(sx + 5, sy + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = 'rgba(29,23,18,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx - 4, sy + 4); ctx.lineTo(sx - 1, sy - 2); ctx.moveTo(sx - 4, sy); ctx.lineTo(sx - 2, sy - 4); ctx.stroke();
        }
    }
}

// Minimapa guardado en una imagen chica (2 px por casilla) que se va pintando a medida que descubrís.
function markMinimap(level, x, y) {
    if (typeof document === 'undefined') return;
    if (!level.minimap) { level.minimap = document.createElement('canvas'); level.minimap.width = COLS * 2; level.minimap.height = ROWS * 2; }
    const g = level.minimap.getContext('2d');
    g.fillStyle = towerMiniColor(level, x, y);
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
    drawTowerLoot(level);
    drawTowerMerchant(level);
    drawTowerShrines(level);
    // Escalera (cerrada hasta vencer al guardián)
    const st = level.stairs, sx = st.x * TILE, sy = st.y * TILE;
    if (level.explored[st.y][st.x]) {
        ctx.fillStyle = level.stairsOpen ? '#2dc653' : '#6c757d';
        for (let i = 0; i < 4; i++) ctx.fillRect(sx + 4 + i * 3, sy + TILE - 8 - i * 7, TILE - 8 - i * 6, 5);
        if (!level.stairsOpen) { ctx.font = '14px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🔒', sx + TILE / 2, sy + TILE / 2); }
    }
    // Cadáveres
    ctx.font = '16px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    level.corpses.forEach(c => {
        if (!level.explored[c.y][c.x]) return;
        const active = c === towerRun.corpse, cx = c.x * TILE + TILE / 2, cy = c.y * TILE + TILE / 2;
        if (active) { ctx.save(); ctx.globalAlpha = 0.4 + 0.25 * Math.sin(fxClock * 4); ctx.fillStyle = '#c9a227'; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
        ctx.fillStyle = active ? INK.line : '#8f8166'; ctx.fillText('☠', cx, cy);
        if (active) { ctx.font = 'bold 10px Georgia, serif'; ctx.fillText(`tus restos (+${c.points})`, cx, cy - 18); ctx.font = '16px monospace'; }
    });
    // Creeps visibles (dentro de tu radio de visión) y proyectiles
    const visible = c => canSee(level, c.x, c.y);
    level.creeps.forEach(c => {
        if (!c.isAlive() || !visible(c)) return;
        const p = drawPos(c, dt);
        if (c.champion) { // campeón: aro azul de tinta a sus pies
            ctx.save(); ctx.strokeStyle = '#1d4e89'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.8;
            ctx.beginPath(); ctx.ellipse(p.x * TILE + TILE / 2, p.y * TILE + TILE - 4, 13, 5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
        drawUnit(c, c.color, c.symbol, p, { glow: c.isGuardian, big: c.isGuardian });
    });
    level.projectiles.forEach(p => {
        ctx.fillStyle = p.isCrit ? '#ffd166' : (p.attacker.isHero ? heroColor(p.attacker) : p.attacker.color || '#fefae0');
        ctx.beginPath(); ctx.arc(p.x * TILE + TILE / 2, p.y * TILE + TILE / 2, p.isCrit ? 4 : 3, 0, Math.PI * 2); ctx.fill();
    });
    if (player.isAlive()) {
        const pos = drawPos(player, dt);
        ctx.save(); ctx.strokeStyle = '#6b2a1f'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(pos.x * TILE + TILE / 2, pos.y * TILE + TILE / 2, effRange(player) * TILE, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        drawUnit(player, heroColor(player), player.symbol, pos, { glow: true });
    }
    drawArenaFx(level);
    drawMouseOverlay(level);
    // Niebla: lo no descubierto, negro; lo descubierto fuera de la vista, oscurecido
    const x0 = Math.floor(camera.x), y0 = Math.floor(camera.y);
    for (let y = y0; y <= Math.min(ROWS - 1, y0 + VIEW_ROWS); y++) for (let x = x0; x <= Math.min(COLS - 1, x0 + VIEW_COLS); x++) {
        if (!level.explored[y][x]) { ctx.fillStyle = INK.shadow; ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1); }
        else if (!canSee(level, x, y)) { ctx.fillStyle = 'rgba(43,33,24,0.5)'; ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1); }
    }
    ctx.restore();
    drawInkVignette();
    drawObjectiveArrow(level);
    renderTowerMinimap(level);
    drawFloorTitle(level);
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
    const s = Math.min(1.7, 150 / COLS), w = COLS * s, h = ROWS * s, ox = MAP_W - w - 8, oy = 8;
    ctx.fillStyle = 'rgba(43,33,24,0.85)'; ctx.fillRect(ox - 3, oy - 3, w + 6, h + 6);
    ctx.strokeStyle = INK.paperDark; ctx.lineWidth = 1; ctx.strokeRect(ox - 3, oy - 3, w + 6, h + 6);
    if (level.minimap) ctx.drawImage(level.minimap, ox, oy, w, h);
    const dot = (x, y, color, r = 2.2) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(ox + (x + 0.5) * s, oy + (y + 0.5) * s, r, 0, Math.PI * 2); ctx.fill(); };
    const tw = level.town;
    if (tw && level.explored[tw.merchant.y][tw.merchant.x]) { ctx.strokeStyle = '#6b2a1f'; ctx.lineWidth = 1.2; ctx.strokeRect(ox + tw.x * s, oy + tw.y * s, tw.w * s, tw.h * s); }
    if (level.explored[level.stairs.y][level.stairs.x]) dot(level.stairs.x, level.stairs.y, level.stairsOpen ? '#2dc653' : '#adb5bd', 2.6);
    const g = level.guardian;
    if (g && g.isAlive() && level.explored[g.y][g.x]) dot(g.x, g.y, '#ff0055', 2.6);
    level.corpses.forEach(c => dot(c.x, c.y, c === towerRun.corpse ? '#c9a227' : '#8f8166', c === towerRun.corpse ? 3 : 1.4));
    (level.shrines || []).forEach(sh => { if (!sh.used && level.explored[sh.y][sh.x]) dot(sh.x, sh.y, SHRINES[sh.kind].color, 2.2); });
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
    const corpse = towerRun.corpse;
    if (corpse && corpse.floor === level.floor && !corpse.unreachable) { const dir = towerPathDir(hero, corpse); if (dir) return dir; corpse.unreachable = true; }
    // Botín a la vista (si hay lugar) y cofres sin custodios
    const loot = (level.drops || []).filter(d => !d.unreachable && canSee(level, d.x, d.y) && bagSpotFor(hero, d.item))
        .concat((level.chests || []).filter(ch => !ch.open && !ch.unreachable && level.explored[ch.y][ch.x] && ch.guards.every(g => !g.isAlive())))
        .concat((level.shrines || []).filter(sh => !sh.used && !sh.unreachable && canSee(level, sh.x, sh.y)));
    if (loot.length) target = loot.reduce((a, b) => (Math.hypot(a.x - hero.x, a.y - hero.y) <= Math.hypot(b.x - hero.x, b.y - hero.y) ? a : b));
    if (target) { const dir = towerPathDir(hero, target); if (dir) return dir; target.unreachable = true; target = null; } // si no se llega, se saltea
    // Primero pasa por el pueblo (a comprar, como pide el objetivo del piso)
    if (level.town && !level.visitedTown) { const dir = towerPathDir(hero, { x: level.town.merchant.x, y: level.town.merchant.y + 2 }); if (dir) return dir; }
    if (level.stairsOpen) target = level.stairs;
    else {
        const dist = bfsFrom(level, hero.x, hero.y);
        const others = level.creeps.filter(c => c.isAlive() && !(c.autoSkipUntil > gameClock) && (!c.isGuardian || level.creeps.every(o => !o.isAlive() || o.isGuardian || dist[o.y * COLS + o.x] < 0)));
        let best = Infinity;
        others.forEach(c => { const d = dist[c.y * COLS + c.x]; if (d >= 0 && d < best) { best = d; target = c; } });
        if (!target) target = level.guardian;
    }
    const dir = target && towerPathDir(hero, target);
    if (!dir && target && !target.isGuardian && target !== level.stairs) target.autoSkipUntil = gameClock + 10; // no lleva a ningún lado: probar con otro
    return dir || { dx: 0, dy: 0 };
}
