// Infinite Tower: modo roguelike (fase 1 de docs/ROGUELIKE.md). Se elige en el menú, al lado de Custom Hero.
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
    floors: 10, cols: 220, rows: 150, // cada piso: campo del bioma + pueblo + laberinto (towerWorld.js); antes 160×110
    heroSpeed: 1.75,      // el héroe camina 75% más rápido que en una arena (1,4 antes de los controles estilo Hades)
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
    creepMult: level => 1 + 0.78 * (level - 1), // con el mapa de 220×150 y el bestiario generado, 0,7 quedaba fácil (0-6 muertes) // 0,4 → 0,7 en la revisión de diseño (medido: 0,4-0,55 ganaba en ~60 min con 0-2 muertes; 0,8 llegaba a 15-24 muertes)
    xpMult: level => 1 + 0.3 * (level - 1),
    guardianMult: floor => 0.35 * (1 + 0.75 * (floor - 1)),
    // Daño extra de los enemigos (no jefes) desde el piso 4 (2026-10-08): con los avisos, los campeones más justos y los
    // restos que se suman, el piloto con reflejos humanos terminaba en 82-117 min con 1 muerte cada 6 partidas.
    // Medido: +12% de daño desde el piso 4 no alcanzaba (106 min, 0 muertes), ni +22% daño/+15% vida (73-81 min): el héroe
    // crece mucho más rápido que los enemigos (del piso 1 al 5, su ataque ×14 y su vida ×9; la vida de un creep, ×5).
    // Ahora crece parejo con cada piso: piso 10, +54% de vida y el doble de daño (con +90% de vida: 209 min, 5 muertes; con +36% o +63% de daño: 80-160 min pero 0 muertes y la vida del héroe casi nunca bajaba del 50%). El piso 1 no cambia.
    danger: floor => 1 + 0.12 * (floor - 1),
    dangerHp: floor => 1 + 0.06 * (floor - 1)
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
    applyMetaUpgrades(player); // mejoras permanentes compradas con Esencia (towerCraft.js)
    applyGear(player);
    player.ownerName = playerName();
    player.displayName = `${player.name} (${player.ownerName})`;
    player.inRest = false;
    player.towerStats = { str: 0, agi: 0, int: 0, vit: 0, vis: 0 }; // puntos puestos en cada stat
    player.statPoints = 0;
    player.relics = {}; player.relicShield = 0; renderRelicBar(); // reliquias de la run (towerRelics.js)
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
    setTowerLayout(true); // mapa a toda la ventana, zoom (towerView.js)
    log(`🪨 Despertaste en el círculo de piedra de la base, sin nada. No recordás nada, salvo escribir. Hay tres armas clavadas en el piso del círculo: acercate a una y apretá ${keyName(KEYMAP.interact)} (o hacé clic) para agarrarla. Cada pieza de equipo que encuentres después trae la habilidad de un héroe (I: inventario, C: stats). Hay ${TOWER.floors} pisos, cada uno con su bioma, su pueblo y su laberinto.`);
    writeNotebookPage('WAKE'); // el cuaderno (REWORK.md §1, towerNotebook.js)
    enterTowerFloor(1, 'start');
    placeStarterWeapons(player.arena); towerRun.starterPending = true; // las 3 armas clavadas en el círculo (towerAwaken.js)
}

// Elegís una de las 3 armas iniciales al despertar (pedestal); la partida esperaba hasta este momento.
function chooseStarterWeapon(weaponKey) {
    const w = STARTER_WEAPONS[weaponKey];
    if (!w || !player) return;
    giveStarterWeapon(player, weaponKey);
    noteTowerRecord(r => { r.runs++; }); // una run nueva (continuar no pasa por acá; towerSave.js)
    player.heroClass = w.heroClass; // la clase (fase T00: Guerrero, Arquero, Mago)
    if (towerRun) towerRun.starterPending = false; // las otras dos se hunden (towerAwaken.js)
    log(w.passive ? `🗡️ Sos ${w.className}. ${w.why} Pasiva: ${w.passive}` : w.skillId ? `🗡️ Elegiste ${w.noun}: tenés ${SKILL_INDEX[w.skillId].name} en la ${player.keyBindings[w.skillId].toUpperCase()}.` : `🗡️ Elegiste ${w.noun}: ${w.why}`);
}

function towerLevel(floor) {
    if (!towerRun.levels[floor]) { towerRun.levels[floor] = generateTowerLevel(floor); applySaveToLevel(towerRun.levels[floor]); } // run continuada: guardián vencido, restos (towerSave.js)
    return towerRun.levels[floor];
}

// Entra a un nivel (lo genera si es la primera vez). where: 'start' = entrada del nivel (o el círculo de piedra en el 1).
function enterTowerFloor(floor, where = 'start') {
    COLS = TOWER.cols; ROWS = TOWER.rows; // (al volver de una cueva el mundo era más chico)
    const level = towerLevel(floor);
    towerRun.floor = floor;
    towerRun.stats.bestFloor = Math.max(towerRun.stats.bestFloor, floor);
    const rec = towerRecords().bestFloor; // récord de piso (towerSave.js)
    if (floor > rec) { noteTowerRecord(r => { r.bestFloor = floor; }); if (rec > 0 && where === 'start') log(`🏅 ¡Nuevo récord! Nunca habías llegado al piso ${floor}.`); }
    enterTowerLevel(level, level.start); // towerWorld.js
    level.titleAt = gameClock;
    const B = BIOMES[level.biome];
    const lore = floorLore(floor); // el lugar y su gente (towerLore.js)
    setStateText(`INFINITE TOWER · PISO ${floor} DE ${TOWER.floors} · ${lore.place.toUpperCase()}`);
    sfx('wave');
    saveTowerRun(); // guardado automático al entrar a cada piso (towerSave.js)
    if (where === 'start') log(`${floor === 1 ? '🪨 Estás en el círculo de piedra, al pie de la torre.' : `🗼 Piso ${floor}: ${lore.place}.`} ${lore.intro} ${B.icon} ${B.name}${lore.people ? ` · su gente: ${lore.people}` : ''}. ${roadHint(floor)} ${B.hazard.name}: ${B.hazard.desc}.${B.climate ? ` ${B.climate.name}: ${B.climate.desc}.` : ''}`);
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
function heroSight(hero) { return Math.max(2, TOWER.baseSight + ((hero.towerStats && hero.towerStats.vis) || 0) * TOWER.visionPerPoint + climateSight(hero) + nightSight(hero) + (heightAt(hero.arena, hero.x, hero.y) ? HEIGHT_RULES.sight : 0)); }

// ¿Hay pared entre (x0, y0) y (x1, y1)? Recorre la línea casilla por casilla (sin contar las puntas).
function lineClear(level, x0, y0, x1, y1) {
    let x = x0, y = y0;
    const high = level.height && level.height[y0 * COLS + x0]; // desde una meseta, los acantilados no tapan
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (true) {
        if (x === x1 && y === y1) return true;
        if ((x !== x0 || y !== y0) && level.walls[y][x] && !(high && level.walls[y][x] === WALL.cliff)) return false;
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

// ¿Te persigue algo cerca? (la forja no interrumpe una pelea: espera a que termine)
function towerInFight(level) { return player.isAlive() && level.creeps.some(c => c.isAlive() && c.aggro && Math.hypot(c.x - player.x, c.y - player.y) <= 10); }

// --- CADA FRAME ---
function updateTower(dt) {
    const level = player.arena;
    if (!level) return;
    tickEffects(player, dt);
    level.creeps.forEach(c => { if (c.isAlive()) tickEffects(c, dt); });
    // Renacer en el círculo de piedra (nivel 1)
    if (!player.isAlive() && player.respawnAt && gameClock >= player.respawnAt) { towerRespawn(); return; }
    if (towerModalOpen()) return; // con stats, inventario, forja o la elección de arma abiertos, la partida espera
    aiWaystone(); // el piloto, al renacer, vuelve con la piedra (towerWaystone.js)
    if (autopilot) { if (player.statPoints) aiSpendStatPoints(player); aiManageGear(player); aiTowerShop(player); if (player.isAlive()) { aiTelegraphDash(player); aiClassSpecial(player); } }
    else if (pendingForge(player) && !towerInFight(level)) { openForge(pendingForge(player)); return; } // en plena pelea, solo el aviso (towerView.js)
    const from = { x: player.x, y: player.y };
    updateHero(player, level, dt);
    towerAwakenTick(level, from); // sin arma no salís del círculo; el piloto agarra la espada (towerAwaken.js)
    towerFeelTick(player); // tensar el arco (towerFeel.js)
    parryTick(player); // la parada de la espada (towerParry.js)
    mageTick(player); // la Carga del Mago (towerMage.js)
    specialTick(player); // lo que sigue de la especial: lluvia, meteoro, suelo ardiendo (towerSpecials.js)
    folkTick(level, dt); // la gente del pueblo pasea (towerFolk.js)
    sandClockTick(level, dt); // los relojes del piso 5 (towerMysteries.js)
    bossArenaTick(level); // la sala del guardián se cierra al entrar (towerBosses.js)
    hiddenArenaTick(level); // y la del jefe escondido (towerSecrets.js)
    towerAutosave(); // cada 15 s (towerSave.js)
    unstickFromWall(player);
    // Cuaderno (REWORK.md §1): moverse y esquivar se detectan leyendo el estado, sin tocar el código compartido.
    if (keys[KEYMAP.up] || keys[KEYMAP.left] || keys[KEYMAP.down] || keys[KEYMAP.right]) writeNotebookPage('MOVE');
    if (player.dashReadyAt > gameClock) writeNotebookPage('DODGE');
    towerTerrainTick(level, player, dt); // terreno, clima, pueblo y mercader (towerWorld.js)
    towerCampTick(level, dt); // descansar junto a una fogata de noche (towerAtmos.js)
    const safe = heroInTown(player);     // en el pueblo los creeps no te persiguen
    if (safe) writeNotebookPage('TOWN');
    if (player.isAlive()) { computeFov(level, player); towerPickup(player); recoverCorpse(level, player); }
    updateProjectiles(level, dt);
    towerBulletsTick(level, dt); // lluvias de proyectiles de los tiradores (towerBullets.js)
    // Creeps: solo se mueven los que te vieron (radio de alerta); te sueltan si te alejás mucho de su lugar
    level.creeps.forEach(c => {
        if (!c.isAlive()) return;
        if (c.dangerMult === undefined) { // daño (effAttack, effects.js) y vida extra por piso, una sola vez
            const boss = c.isGuardian || c.isCaveBoss || c.isRoot;
            c.dangerMult = boss ? 1 : TOWER.danger(level.floor);
            if (!boss) { const k = TOWER.dangerHp(level.floor); c.maxHp = Math.round(c.maxHp * k); c.hp = Math.round(c.hp * k); }
        }
        unstickFromWall(c);
        const d = Math.hypot(c.x - player.x, c.y - player.y);
        if (!c.aggro && !safe && player.isAlive() && d <= TOWER.aggroRadius && canSee(level, c.x, c.y)) { c.aggro = true; alertPack(level, c); noteBeastSeen(c.type); } // te tienen que ver
        if (c.aggro && (!player.isAlive() || safe || Math.hypot(player.x - c.spawnX, player.y - c.spawnY) > TOWER.leash)) {
            c.aggro = false;
        }
        if (c.regenPct && championCanRegen(c)) c.hp = Math.min(c.maxHp, c.hp + c.maxHp * c.regenPct * dt); // campeón Regenerador (se corta un rato con cada golpe)
        if (c.isCarrier) carrierRoam(c); // el portador deambula (towerWorld.js)
        if (c.aggro) { if (!(player.isAlive() && (towerCreepTelegraph(c) || towerCreepBrain(c, dt)))) updateCreep(c, dt); } // ataques anunciados (towerTelegraph.js)
        else if (c.x !== c.spawnX || c.y !== c.spawnY) stepCreepToward(c, c.spawnX, c.spawnY, dt); // vuelve a su lugar
    });
    towerTelegraphTick(level); // los ataques anunciados que se completaron pegan (towerTelegraph.js)
    towerZonesTick(level, dt); // veneno, hielo y lava que dejan los jefes (towerBosses.js)
    if (towerPortals(level, player)) return; // entradas, bajadas y salidas de cueva (towerWorld.js)
    if (!level.stairs) return;               // en una cueva no hay escalera de la torre
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
// La IA (piloto automático) elige entre las 3 cartas como un jugador: su atributo principal, si no Vitalidad, si no la primera.
function aiSpendStatPoints(hero) {
    const main = { STR: 'str', AGI: 'agi', INT: 'int' }[hero.primaryAttr];
    for (let guard = 0; hero.statPoints > 0 && guard < 50; guard++) {
        const offer = levelOffer(hero);
        if (!chooseLevelPick(hero, offer.includes(main) ? main : offer.includes('vit') ? 'vit' : offer[0])) break;
    }
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
    document.getElementById('stats-points').textContent = player.statPoints ? `¡Subiste de nivel! Elegí una mejora${player.statPoints > LEVEL_PICK.points ? ` (${Math.ceil(player.statPoints / LEVEL_PICK.points)} pendientes)` : ''}` : 'Al subir de nivel elegís 1 de 3 mejoras';
    renderLevelCards(document.getElementById('level-cards')); // 1 de 3 (towerLevelUp.js)
    const rows = document.getElementById('stats-rows'); rows.innerHTML = '';
    Object.entries(TOWER_STATS).forEach(([k, st]) => {
        const row = document.createElement('div');
        row.className = 'stat-row';
        row.innerHTML = `<span class="stat-icon">${st.icon}</span><span class="stat-name" style="color:${st.color}">${st.name}</span>` +
            `<span class="stat-value">${k === 'vis' ? towerStatValue(player, k).toFixed(1) : towerStatValue(player, k)}</span>` +
            `<span class="stat-spent">${levelPicks(player, k) ? `elegido ${levelPicks(player, k)} ${levelPicks(player, k) === 1 ? 'vez' : 'veces'}` : ''}</span>` +
            `<span class="stat-gives">${st.gives()}${LEVEL_PERKS[k].filter(p => perkFits(player, p)).map(p => `<br><span class="perk ${levelPicks(player, k) >= p.at ? 'on' : ''}">${p.at}: ${p.name} — ${p.desc}</span>`).join('')}</span>`;
        rows.appendChild(row);
    });
}

// --- MUERTE ---
// lose: parte de los puntos de stats que quedan en tus restos · stack: si morís otra vez antes de buscarlos, los restos
// viejos se suman a los nuevos (en vez de perderse). Medido con el piloto de reflejos humanos (2026-10-08): con 0,5 y
// sin sumar, cada muerte te deja más débil para el mismo piso y se arma una espiral (30 muertes en el piso 6).
const DEATH = { lose: 0.5, stack: true }; // decisión del usuario (2026-10-08): los restos se suman, nunca se pierde nada para siempre
function towerHeroDeath(hero, killer) {
    const level = hero.arena;
    hero.hp = 0; hero.diedAt = gameClock; // diedAt: la caída en pixel art (towerPixelHero.js)
    hero.effects = hero.effects.filter(e => e.flags.includes('persistent'));
    hero.respawnAt = gameClock + TOWER.respawnDelay;
    towerRun.deaths++;
    level.telegraphs = []; level.zones = []; level.bullets = []; // lo que estaba cargando no le pega al que renace
    // Perdés la mitad de los puntos puestos en cada stat (lo de base nunca se pierde), pero quedan en tus restos:
    // si volvés hasta ellos los recuperás (como en Dark Souls). Si morís otra vez antes, los anteriores se pierden.
    const lost = {}, lostText = [];
    Object.keys(hero.towerStats).forEach(k => {
        const n = Math.ceil(hero.towerStats[k] * DEATH.lose);
        if (n > 0) { changeTowerStat(hero, k, -n); lost[k] = n; lostText.push(`${n} de ${TOWER_STATS[k].name}`); }
    });
    const old = towerRun.corpse;
    if (old && !old.recovered && DEATH.stack) { // los restos viejos viajan con los nuevos: no se pierde nada para siempre
        Object.entries(old.lost).forEach(([k, n]) => { lost[k] = (lost[k] || 0) + n; });
        old.recovered = true; old.merged = true;
    } else if (old && !old.recovered) { old.recovered = true; old.faded = true; }
    const corpse = { x: hero.x, y: hero.y, killer: killer ? killer.label : null, at: gameClock, floor: level.floor, level, lost, points: Object.values(lost).reduce((a, b) => a + b, 0) };
    level.corpses.push(corpse);
    towerRun.corpse = corpse.points ? corpse : null;
    const carrier = spawnItemCarrier(level, hero); // towerWorld.js
    const carried = carrier ? `${carrier.label.replace(' (portador)', '')} se llevó ${carrier.carrier.map(i => i.name).join(' y ')}: cazalo para recuperarlo. ` : '';
    sfx('lose');
    saveTowerRun(); // tus restos quedan guardados (towerSave.js)
    log(`💀 ${killer ? killer.label + ' te mató' : 'Moriste'} en el piso ${level.floor}. ${lostText.length ? 'Perdés ' + lostText.join(', ') + ': quedan en tus restos, volvé a buscarlos. ' : ''}${carried}` +
        `${old && old.faded && old.points ? `Tus restos anteriores (${old.points} puntos) se perdieron. ` : ''}${old && old.merged ? 'Tus restos anteriores se juntaron con estos. ' : ''}Renacés en el círculo de piedra de la base en ${TOWER.respawnDelay}s.`);
}

// Pisar tus restos (los de la última muerte) te devuelve los puntos de stats que perdiste.
function recoverCorpse(level, hero) {
    const c = towerRun.corpse;
    if (!c || c.recovered || c.level !== level || Math.max(Math.abs(hero.x - c.x), Math.abs(hero.y - c.y)) > 1) return;
    c.recovered = true; towerRun.corpse = null;
    Object.entries(c.lost).forEach(([k, n]) => changeTowerStat(hero, k, n));
    if (fxArena(hero)) { fxRing(hero, '#c9a227', 2, 0.8); fxText(hero, `+${c.points} puntos recuperados`, '#c9a227', 13, 1.6); }
    log(`🕯️ Recuperaste tus restos: vuelven ${c.points} puntos de stats.`); sfx('levelup');
}

function towerRespawn() {
    player.respawnAt = 0;
    player.hp = player.maxHp; player.mana = player.maxMana;
    enterTowerFloor(1, 'respawn');
    log(waystoneFloors().length ? `🪨 Renacés en el círculo de piedra. Tocá la piedra de regreso (${keyName(KEYMAP.interact)}) para volver a la entrada de un piso al que ya llegaste.` : '🪨 Renacés en el círculo de piedra. Los pisos siguen como los dejaste.');
}

function towerVictory() {
    gameState = 'ENDED';
    clearTowerSave(); // la run terminó: no hay nada que continuar (towerSave.js)
    const runTime = gameClock - towerRun.startedAt, prevBest = towerRecords().bestTime;
    noteTowerRecord(r => { r.summits++; if (r.bestTime == null || runTime < r.bestTime) r.bestTime = runTime; });
    if (prevBest != null && runTime < prevBest) log('🏅 ¡Tu cumbre más rápida!');
    setStateText('¡CONQUISTASTE LA TORRE!');
    const s = towerRun.stats;
    showRunSummary({ won: true, runTime, record: prevBest == null || runTime < prevBest }); // la pantalla de fin de run (towerView.js)
    log(`🏆 ¡Venciste al guardián del último piso! ${player.displayName} conquistó la Torre: nivel ${player.level}, ${Math.floor((gameClock - towerRun.startedAt) / 60)} minutos, ${towerRun.deaths} muerte${towerRun.deaths === 1 ? '' : 's'}, ${s.kills} bajas (${s.champions} campeones), ${s.shrines} santuarios.`);
    showPanel('restart-btn', true);
}

// --- INTERFAZ ---
function towerStatusText() {
    if (!player.isAlive() && player.respawnAt) return `☠ Renacés en ${Math.max(0, player.respawnAt - gameClock).toFixed(1)}s`;
    const level = player.arena;
    if (level.isCave) return `🕳️ Piso ${level.floor} · cueva −${level.depth}/−${level.cave.max} · ${towerObjective(level).text}`;
    return `${BIOMES[level.biome].icon} Piso ${level.floor}/${TOWER.floors} · ${towerDayLabel()} · ${towerObjective(level).text}`;
}
function towerInfoHtml() {
    const level = player.arena;
    const alive = level.creeps.filter(c => c.isAlive() && !c.isGuardian).length;
    if (level.isCave) return `<h3>🕳️ Cueva · nivel −${level.depth} de −${level.cave.max}</h3>` +
        `<p class="subtitle">Bajo el piso ${level.floor} (${BIOMES[level.biome].name}). Está oscuro: ves menos. Cada nivel más hondo tiene creeps más fuertes, más campeones y mejor botín; en el fondo, el señor de la cueva cuida un tesoro. La soga te sube.</p>` +
        `<button class="secondary-btn" onclick="toggleStatsWindow(true)">📊 Stats del héroe (C)</button><button class="secondary-btn" onclick="toggleInventory(true)">🎒 Equipo e inventario (I)</button>` +
        `<p class="subtitle">Creeps en este nivel: ${alive}.</p>` + towerChronicleHtml();
    return `<h3>🗼 Infinite Tower · piso ${level.floor} de ${TOWER.floors}</h3>` +
        `<p class="subtitle">${biomeSummary(level)}</p>` +
        (towerIsNight() ? `<p class="subtitle">🌙 <b>Es de noche</b>: en el campo ves menos y andan criaturas nocturnas; todo da +50% de experiencia y botín.</p>` : '') +
        `<p class="subtitle">Cruzá el campo, descansá en el <b>pueblo</b> (zona segura, mercader con B) y entrá al <b>laberinto</b>: el guardián (${level.guardian.label}) cuida la escalera.</p>` +
        (player.statPoints ? `<button class="primary-btn" onclick="toggleStatsWindow(true)">✨ Elegir mejora de nivel (C)</button>` : `<button class="secondary-btn" onclick="toggleStatsWindow(true)">📊 Stats del héroe (C)</button>`) +
        `<button class="secondary-btn" onclick="toggleInventory(true)">🎒 Equipo e inventario (I) · ${player.bag.length} en la bolsa</button>` +
        `<button class="secondary-btn" onclick="toggleBestiary(true)">📖 Bestiario (K) · ${Object.keys(towerRun.seen || {}).length} criaturas</button>` +
        `<p class="subtitle">Creeps en este piso: ${alive}. Al morir renacés en la base y perdés la mitad de los atributos ganados.</p>` +
        towerChronicleHtml();
}
// Crónica de la run (como el resumen de Hades): lo que llevás hecho, aunque mueras.
function towerChronicleHtml() {
    const s = towerRun.stats, min = Math.floor((gameClock - towerRun.startedAt) / 60);
    return `<p class="subtitle tower-chronicle">📜 <b>Crónica</b> · ${min} min · mejor piso ${s.bestFloor} · ${towerRun.deaths} muerte${towerRun.deaths === 1 ? '' : 's'} · ` +
        `${s.kills} bajas (${s.champions} campeones, ${s.guardians} guardianes) · ${s.shrines} santuarios${s.events ? ` · ${s.events} eventos` : ''}${s.essence ? ` · ✦ ${s.essence} de Esencia` : ''}${s.crafted ? ` · ${s.crafted} piezas fundidas` : ''}${s.codex ? ` · 📜 ${s.codex} poderes dominados` : ''}${towerRun.reactions ? ` · ${Object.values(towerRun.reactions).reduce((a, b) => a + b, 0)} reacciones` : ''}${s.deepest ? ` · cueva más honda −${s.deepest}` : ''} · ${s.gold}g ganados</p>`;
}

function drawTowerTiles(level) {
    const t = inkTiles(); // estética tinta y pergamino (inkart.js)
    const px = pixelOn() && drawPixelGround(level); // o el suelo en pixel art (towerPixel.js)
    const x0 = Math.floor(camera.x), y0 = Math.floor(camera.y);
    for (let y = y0; y <= Math.min(ROWS - 1, y0 + viewRows()); y++) for (let x = x0; x <= Math.min(COLS - 1, x0 + viewCols()); x++) {
        if (!level.explored[y][x]) continue;
        const w = level.walls[y][x], labTile = !level.zone || (level.zone[y * COLS + x] === ZONE.lab && (!w || w === WALL.stone));
        if (px) drawPixelWall(level, x, y); // árboles, rocas, paredes y acantilados encima del suelo
        else ctx.drawImage(level.isCave ? caveTileFor(level, x, y) : !labTile ? biomeTileFor(level, x, y) // cueva, o campo y pueblo del bioma (towerWorld.js)
            : w ? (y + 1 < ROWS && !level.walls[y + 1][x] ? t.face : t.top) : t.floors[((x * 73856093) ^ (y * 19349663)) & 3], x * TILE, y * TILE);
        if (level.height) { // relieve: arriba más claro; al pie del acantilado, sombra
            const i = y * COLS + x;
            if (level.height[i] && w !== WALL.cliff) { ctx.fillStyle = 'rgba(255,250,235,0.16)'; ctx.fillRect(x * TILE, y * TILE, TILE, TILE); }
            else if (!level.height[i] && y > 0 && level.walls[y - 1][x] === WALL.cliff) { ctx.fillStyle = 'rgba(29,23,18,0.2)'; ctx.fillRect(x * TILE, y * TILE, TILE, TILE / 2); }
        }
    }
    // Círculo de piedra en la entrada del nivel 1
    if (px) pxDrawMenhirs(level); // en pixel art (towerPixelProps.js)
    else if (level.floor === 1 && !level.isCave && level.explored[level.start.y][level.start.x]) {
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
    camera.x = Math.max(0, Math.min(COLS - viewCols(), pos.x - viewCols() / 2 + 0.5));
    camera.y = Math.max(0, Math.min(ROWS - viewRows(), pos.y - viewRows() / 2 + 0.5));
    const g = PXG.scale / TILE; camera.x = Math.round(camera.x / g) * g; camera.y = Math.round(camera.y / g) * g; // a la grilla de píxeles del dibujo
}

function renderTower(level, dt) {
    towerMusicTick(level, dt); // música por capas (towerMusic.js)
    updateArenaFx(level, dt);
    updateCamera(level, player, dt);
    const px = pixelOn(); // objetos en pixel art (towerPixelProps.js)
    ctx.save();
    if (shakeAmount) ctx.translate((Math.random() - 0.5) * shakeAmount * 2, (Math.random() - 0.5) * shakeAmount * 2);
    ctx.scale(viewScale(), viewScale()); // zoom (towerView.js)
    ctx.translate(-camera.x * TILE, -camera.y * TILE);
    drawTowerTiles(level);
    drawCracks(level); // paredes agrietadas (towerSecrets.js)
    drawQuestDoors(level); // rejas de los pedidos (towerQuests.js)
    drawSandGates(level); // compuertas de arena del piso 5 (towerMysteries.js)
    drawBossArena(level); // las rejas de la sala del guardián (towerBosses.js)
    drawHiddenArena(level); // y las de la grieta del jefe escondido (towerSecrets.js)
    drawLanterns(level); // faroles del piso 7
    drawSigns(level); // carteles de los caminos (towerLore.js)
    drawTowerGate(level); // el portón de la torre en el piso 1 (towerPixel.js)
    pxDrawLoot(level); // cofres y botín (towerPixelProps.js)
    const underFx = () => {
        drawTowerZones(level); // lo que dejan los jefes en el piso (towerBosses.js)
        drawTowerTelegraphs(level); // zonas de los ataques anunciados, debajo de las unidades
        drawCreepWindups(level); // los golpes comunes que se están preparando (towerWindup.js)
        drawBossExtras(level); // lazos de las raíces
    };
    if (px) { // efectos en pixel art (towerPixelFx.js); la capa de abajo solo se procesa si hay avisos, zonas o raíces
        pxDrawDebris(level, 'ground');
        if ((level.zones && level.zones.length) || (level.telegraphs && level.telegraphs.length) || level.creeps.some(c => c.isAlive() && (c.windup || c.isRoot))) pxFxLayer('under', underFx);
        pxRangeRing(); // ya es de píxeles: va directo
    }
    else underFx();
    pxDrawMerchant(level); // mercader, herrero, santuarios, eventos, armas del despertar, piedra de regreso y fuegos (towerPixelProps.js)
    pxDrawSmith(level);
    pxDrawFolk(level); // la gente del pueblo (towerFolk.js)
    pxDrawShrines(level);
    pxDrawArenPage(level);
    pxDrawEvents(level);
    pxDrawStarterWeapons(level);
    pxDrawWaystone(level);
    pxDrawLights(level);
    // Escalera (cerrada hasta vencer al guardián)
    pxDrawPortals(level);
    const st = level.stairs || { x: 0, y: 0 }, sx = st.x * TILE, sy = st.y * TILE;
    if (px) { pxDrawStairs(level); pxDrawCorpses(level); } // en pixel art (towerPixelProps.js)
    else if (level.stairs && level.explored[st.y][st.x]) {
        ctx.fillStyle = level.stairsOpen ? '#2dc653' : '#6c757d';
        for (let i = 0; i < 4; i++) ctx.fillRect(sx + 4 + i * 3, sy + TILE - 8 - i * 7, TILE - 8 - i * 6, 5);
        if (!level.stairsOpen) { ctx.font = '14px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🔒', sx + TILE / 2, sy + TILE / 2); }
    }
    // Cadáveres
    ctx.font = '16px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (!px) level.corpses.forEach(c => {
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
        if (c.isCarrier) { // portador: aro dorado y la bolsa con tu equipo
            ctx.save(); ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 3; ctx.setLineDash([5, 3]);
            ctx.beginPath(); ctx.ellipse(p.x * TILE + TILE / 2, p.y * TILE + TILE - 4, 15, 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
            ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.fillText('🎒', p.x * TILE + TILE / 2 + 14, p.y * TILE - 2);
        }
        if (c.champion) { // campeón: aro azul de tinta a sus pies
            ctx.save(); ctx.strokeStyle = '#1d4e89'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.8;
            ctx.beginPath(); ctx.ellipse(p.x * TILE + TILE / 2, p.y * TILE + TILE - 4, 13, 5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
        const a = c.isGuardian ? bossAlpha(c) : 1; if (a < 1) { ctx.save(); ctx.globalAlpha = a; } // escondido o enterrado
        drawUnit(c, c.color, c.symbol, p, { glow: c.isGuardian, big: c.isGuardian });
        if (a < 1) ctx.restore();
        drawGunnerTell(c, p); // el tirador avisa antes de disparar (towerBullets.js)
        drawChampionBadges(c, p, level); // íconos de sus afijos (towerChampions.js)
    });
    const drawProjectiles = () => level.projectiles.forEach(p => {
        const lk = projectileLook(p), x = p.x * TILE + TILE / 2, y = p.y * TILE + TILE / 2;
        if (p.arrow) { drawArrowProjectile(p, x, y); return; } // flechas del arco (towerFeel.js)
        if (lk) { // orbe con halo del elemento (fxSkills.js)
            ctx.globalAlpha = 0.45; ctx.fillStyle = lk.c2; ctx.beginPath(); ctx.arc(x, y, p.kind === 'skill' ? 9 : 6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
            ctx.fillStyle = p.isCrit ? '#ffd166' : lk.c1; ctx.beginPath(); ctx.arc(x, y, p.kind === 'skill' ? 5 : 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = INK.line; ctx.lineWidth = 1; ctx.stroke();
            return;
        }
        ctx.fillStyle = p.isCrit ? '#ffd166' : (p.attacker.isHero ? heroColor(p.attacker) : p.attacker.color || '#fefae0');
        ctx.beginPath(); ctx.arc(x, y, p.isCrit ? 4 : 3, 0, Math.PI * 2); ctx.fill();
    });
    if (!px) drawProjectiles();
    if (!player.isAlive() && px && player.arena === level && player.diedAt !== undefined && gameClock - player.diedAt < TOWER.respawnDelay) drawUnit(player, heroColor(player), player.symbol, { x: player.x, y: player.y }, {}); // cae y queda tendido hasta renacer
    if (player.isAlive()) {
        const pos = drawPos(player, dt);
        if (!px) { // (en pixel art, el aro de puntos va en la capa de efectos)
            ctx.save(); ctx.strokeStyle = '#6b2a1f'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.arc(pos.x * TILE + TILE / 2, pos.y * TILE + TILE / 2, effRange(player) * TILE, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
        drawUnit(player, heroColor(player), player.symbol, pos, { glow: true });
    }
    if (px) { // efectos en pixel art (towerPixelFx.js): proyectiles, balas, tajos y hechizos en la capa de arriba; sangre y números aparte
        pxFxLayer('over', () => { drawProjectiles(); drawTowerBullets(level); drawTowerFeel(level); fxTextPass = 'skip'; drawArenaFx(level); fxTextPass = null; });
        pxDrawDebris(level, 'air');
        drawCreepWindupMarks(level);
        fxTextPass = 'only'; drawArenaFx(level); fxTextPass = null;
    } else {
    drawTowerBullets(level); // proyectiles enemigos, encima de todo lo del piso (towerBullets.js)
    drawCreepWindupMarks(level); // "!" sobre los que preparan un golpe (towerWindup.js)
    drawTowerFeel(level); // línea de tiro del arco y el combo de la espada (towerFeel.js)
    drawArenaFx(level);
    }
    drawMouseOverlay(level);
    // Niebla: lo no descubierto, negro; lo descubierto fuera de la vista, oscurecido
    const x0 = Math.floor(camera.x), y0 = Math.floor(camera.y);
    if (px) pxDrawFog(level); // niebla sin cuadraditos (towerPixelFx.js)
    else for (let y = y0; y <= Math.min(ROWS - 1, y0 + viewRows()); y++) for (let x = x0; x <= Math.min(COLS - 1, x0 + viewCols()); x++) {
        if (!level.explored[y][x]) { ctx.fillStyle = INK.shadow; ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1); }
        else if (!canSee(level, x, y)) { ctx.fillStyle = 'rgba(43,33,24,0.5)'; ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1); }
    }
    ctx.restore();
    drawTowerNight(level); // día y noche (towerWorld.js)
    drawTowerWeather(level, dt); // lluvia, nieve, ceniza, hojas… por bioma (towerAtmos.js)
    pxUiPass = px; // de acá en adelante, la interfaz: en pixel art, con colores de panel oscuro (towerPixelUi.js)
    drawUltBanner(screenW() / 2, screenH() * 0.72); // cartel de la definitiva, encima de la niebla (fxSkills.js)
    if (!px) drawInkVignette(); // (en pixel art, sin la viñeta de papel)
    drawHurtVignette(); // te pegaron: borde rojo (fx.js)
    drawObjectiveArrow(level);
    drawOffscreenThreats(level); // balas y tiradores fuera de la vista (towerBullets.js)
    drawChampionCard(level); // qué hace cada afijo del campeón bajo el mouse (towerChampions.js)
    renderTowerMinimap(level);
    drawFloorTitle(level);
    // Barra del jefe abajo al centro, con sus fases (towerTelegraph.js)
    const g = level.guardian || level.caveBoss;
    if (g && g.isAlive() && visible(g)) drawBossBar(g);
    drawTowerBigMap(level); // mapa del piso a pantalla completa (M, towerMap.js)
    if (paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, screenW(), screenH());
        ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffb703';
        ctx.fillText('PAUSA', screenW() / 2, screenH() / 2);
    }
}

// Minimapa (arriba a la derecha): lo descubierto, la escalera, el guardián si lo viste y vos.
function renderTowerMinimap(level) {
    pxMinimapSync(level); // si cambió el estilo, se repinta con la paleta que toca (towerPixel.js)
    const s = Math.min(1.7, Math.max(150, screenW() * 0.14) / COLS), w = COLS * s, h = ROWS * s, ox = screenW() - w - 8, oy = 8;
    ctx.fillStyle = 'rgba(43,33,24,0.85)'; ctx.fillRect(ox - 3, oy - 3, w + 6, h + 6);
    ctx.strokeStyle = INK.paperDark; ctx.lineWidth = 1; ctx.strokeRect(ox - 3, oy - 3, w + 6, h + 6);
    if (level.minimap) ctx.drawImage(level.minimap, ox, oy, w, h);
    const dot = (x, y, color, r = 2.2) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(ox + (x + 0.5) * s, oy + (y + 0.5) * s, r, 0, Math.PI * 2); ctx.fill(); };
    const tw = level.town;
    if (tw && level.explored[tw.merchant.y][tw.merchant.x]) { ctx.strokeStyle = '#6b2a1f'; ctx.lineWidth = 1.2; ctx.strokeRect(ox + tw.x * s, oy + tw.y * s, tw.w * s, tw.h * s); }
    (level.caves || []).forEach(c => { if (level.explored[c.y][c.x]) dot(c.x, c.y, '#1d1712', 2.6); });
    if (level.down && level.explored[level.down.y][level.down.x]) dot(level.down.x, level.down.y, '#1d1712', 2.8);
    if (level.exitUp) dot(level.exitUp.x, level.exitUp.y, '#c9a227', 2.6);
    if (level.stairs && level.explored[level.stairs.y][level.stairs.x]) dot(level.stairs.x, level.stairs.y, level.stairsOpen ? '#2dc653' : '#adb5bd', 2.6);
    const g = level.guardian;
    if (g && g.isAlive() && level.explored[g.y][g.x]) dot(g.x, g.y, '#ff0055', 2.6);
    level.corpses.forEach(c => dot(c.x, c.y, c === towerRun.corpse ? '#c9a227' : '#8f8166', c === towerRun.corpse ? 3 : 1.4));
    carriersOn(level).forEach(c => dot(c.x, c.y, '#c9a227', 3.2)); // portadores (sabés dónde anda tu equipo)
    (level.shrines || []).forEach(sh => { if (!sh.used && level.explored[sh.y][sh.x]) dot(sh.x, sh.y, SHRINES[sh.kind].color, 2.2); });
    (level.events || []).forEach(e => { if (e.kind !== 'ambush' && e.seen && !['saved', 'lost', 'open', 'freed'].includes(e.state)) dot(e.x, e.y, EVENT_INFO[e.kind].color, 2.6); });
    if (player.isAlive()) dot(player.x, player.y, '#00f5d4', 2.4);
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
    ctx.strokeRect(ox + camera.x * s, oy + camera.y * s, viewCols() * s, viewRows() * s);
}

// --- PILOTO AUTOMÁTICO EN LA TORRE (también lo usan las pruebas y las mediciones) ---
// Pelea con lo que lo persigue; si no hay nada, va al creep más cercano (por el camino); sin creeps, al guardián; con la
// escalera abierta, a la escalera.
function towerAutoDir(hero) {
    const level = hero.arena;
    const dodge = towerDodgeDir(hero); // primero, salir de las zonas marcadas (towerTelegraph.js)
    if (dodge) return dodge;
    const range = effRange(hero);
    const chasing = level.creeps.filter(c => c.isAlive() && c.aggro && !(c.autoSkipUntil > gameClock));
    const inRange = chasing.find(c => Math.hypot(c.x - hero.x, c.y - hero.y) <= range);
    if (inRange) {
        // Pelea que no avanza (se cura más rápido de lo que le pega): la deja un rato, como haría una persona
        if (hero.autoFight !== inRange) { hero.autoFight = inRange; hero.autoFightHp = inRange.hp; hero.autoFightAt = gameClock; }
        else if (gameClock - hero.autoFightAt > 25) { if (inRange.hp >= hero.autoFightHp && !inRange.isGuardian) inRange.autoSkipUntil = gameClock + 30; hero.autoFightHp = inRange.hp; hero.autoFightAt = gameClock; } // al guardián no se lo abandona (escondido o curándose, igual hay que matarlo)
        hero.autoGoal = 'pelea: ' + inRange.label;
        return movesToFight(hero) ? circleStep(hero, inRange) : { dx: 0, dy: 0 };
    }
    // Sin pelea y sin moverse hace 15 s: camina un poco al azar (salida genérica para casos raros de trabón)
    const posKey = hero.x + ',' + hero.y;
    if (hero.autoPos !== posKey) { hero.autoPos = posKey; hero.autoPosAt = gameClock; }
    else if (gameClock - hero.autoPosAt > 15) { hero.autoWanderUntil = gameClock + 2; hero.autoWanderDir = pickRandom(STEPS_8); hero.autoPosAt = gameClock; }
    // Va y viene sin avanzar (en 20 s se movió menos de 3 casillas y no mató nada): abandona ese objetivo un rato
    if (!hero.autoCheck || gameClock - hero.autoCheck.at > 20) {
        const ck = hero.autoCheck;
        if (ck && Math.hypot(hero.x - ck.x, hero.y - ck.y) < 3 && towerRun.stats.kills === ck.kills && ck.target && ck.target === hero.autoTarget) {
            ck.target.autoSkipUntil = gameClock + 30; hero.autoWanderUntil = gameClock + 2; hero.autoWanderDir = pickRandom(STEPS_8);
        }
        hero.autoCheck = { at: gameClock, x: hero.x, y: hero.y, kills: towerRun.stats.kills, target: hero.autoTarget };
    }
    if (gameClock < (hero.autoWanderUntil || 0)) { hero.autoGoal = 'paseo'; return { dx: hero.autoWanderDir[0], dy: hero.autoWanderDir[1] }; }
    let target = null;
    const corpse = towerRun.corpse;
    const carrier = carriersOn(level).find(c => !(c.autoSkipUntil > gameClock));
    if (carrier) { const dir = towerPathDir(hero, carrier); hero.autoGoal = 'portador'; if (dir) return dir; carrier.autoSkipUntil = gameClock + 10; }
    if (corpse && corpse.level === level && !corpse.unreachable) { const dir = towerPathDir(hero, corpse); hero.autoGoal = 'restos'; if (dir) return dir; corpse.unreachable = true; }
    // Botín a la vista (si hay lugar) y cofres sin custodios
    const loot = (level.drops || []).filter(d => !d.unreachable && canSee(level, d.x, d.y) && bagSpotFor(hero, d.item))
        .concat((level.chests || []).filter(ch => !ch.open && !ch.unreachable && !chestUnderWater(level, ch) && level.explored[ch.y][ch.x] && ch.guards.every(g => !g.isAlive())))
        .concat((level.shrines || []).filter(sh => !sh.used && !sh.unreachable && canSee(level, sh.x, sh.y)))
        .concat((level.events || []).filter(e => e.kind === 'prisoner' && e.state === 'idle' && !e.unreachable && canSee(level, e.x, e.y) && e.guards.every(c => !c.isAlive())));
    if (loot.length) target = loot.reduce((a, b) => (Math.hypot(a.x - hero.x, a.y - hero.y) <= Math.hypot(b.x - hero.x, b.y - hero.y) ? a : b));
    if (target) { const dir = towerPathDir(hero, target); hero.autoGoal = `botín ${target.x},${target.y}`; if (dir) return dir; target.unreachable = true; target = null; } // si no se llega, se saltea
    // Primero pasa por el pueblo (a comprar, como pide el objetivo del piso)
    if (level.town && !level.visitedTown) { const dir = towerPathDir(hero, { x: level.town.merchant.x, y: level.town.merchant.y + 2 }); hero.autoGoal = 'pueblo'; if (dir) return dir; }
    if (level.stairsOpen) target = level.stairs;
    else {
        const dist = bfsFrom(level, hero.x, hero.y);
        const others = level.creeps.filter(c => c.isAlive() && !(c.autoSkipUntil > gameClock) && (!c.isGuardian || level.creeps.every(o => !o.isAlive() || o.isGuardian || dist[o.y * COLS + o.x] < 0)));
        let best = Infinity;
        others.forEach(c => { const d = dist[c.y * COLS + c.x]; if (d >= 0 && d < best) { best = d; target = c; } });
        if (!target) target = level.guardian;
    }
    const dir = target && towerPathDir(hero, target);
    hero.autoGoal = target ? `${target.label || 'escalera'} ${target.x},${target.y}` : 'nada'; // para depurar el piloto
    hero.autoTarget = target;
    if (!dir && target && !target.isGuardian && target !== level.stairs) target.autoSkipUntil = gameClock + 10; // no lleva a ningún lado: probar con otro
    return dir || { dx: 0, dy: 0 };
}
