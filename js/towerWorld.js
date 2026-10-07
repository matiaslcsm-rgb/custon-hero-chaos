// Tower Chaos: pisos al estilo Aincrad (Sword Art Online). Cada piso es un bioma abierto con un pueblo seguro y, en el
// otro extremo, la torre-laberinto (salas y pasillos de piedra) con el guardián y la escalera al piso siguiente.
// Diseño: docs/ROGUELIKE.md (Fase 4: biomas).
//
//   level.walls[y][x]  0 = se pisa; si no, qué la tapa (WALL): piedra del laberinto, árbol o roca del bioma, empalizada
//                      o fuente del pueblo, borde del mapa. Tapa el paso y la vista.
//   level.deep[i]      agua o lava profunda: no se pisa pero se ve a través (i = y * COLS + x)
//   level.ground[i]    suelo (GROUND): llano, terreno del bioma (con efecto), camino, pueblo o laberinto
//   level.zone[i]      ZONE: campo, pueblo (zona segura) o laberinto
//   level.height[i]    1 = arriba de una meseta (se sube por rampas: level.ramp[i]); su borde es acantilado (WALL.cliff).
//                      Desde arriba se ve por encima de los acantilados y se pega más fuerte a los de abajo.

const WALL = { stone: 1, obstacle: 2, palisade: 3, edge: 4, fountain: 5, cliff: 6, rock: 7 };
const GROUND = { plain: 0, hazard: 1, road: 2, town: 3, lab: 4 };
const ZONE = { field: 0, town: 1, lab: 2, cave: 3 };

const WORLD = {
    lab: { w: 64, h: 72, rooms: 22 },
    town: { w: 20, h: 15 },
    fieldPacks: 46,       // grupos de creeps sueltos en el campo (26 con el mapa de 160×110)
    plateaus: 12,         // mesetas por piso (lugares altos con rampas)
    packSpacing: 10,      // distancia mínima entre grupos
    safeFromStart: 18,    // sin creeps a menos de esto (caminando) de la entrada del piso
    fieldXp: 0.45,        // experiencia de los creeps del campo (hay muchos más que en el laberinto; 0,6 con el mapa de 160×110)
    townRegenPct: 0.04    // en el pueblo recuperás 4% de vida y maná por segundo
};

// --- BIOMAS ---
// Dos pisos por bioma (el segundo suma creeps más difíciles). hazard: manchas de terreno con efecto mientras las pisás.
// climate: efecto de todo el campo (no en el pueblo ni en el laberinto). deepBlobs: lagos o pozos que no se pisan.
const BIOME_ORDER = ['forest', 'swamp', 'desert', 'snow', 'volcano'];
const BIOMES = {
    forest: {
        name: 'Bosque de Musgo', icon: '🌲', obstacle: 'tree', density: 0.45, hazardBlobs: 16, deepBlobs: 0,
        hazard: { name: 'Maleza', desc: 'te frena un 15%', look: 'brush', mods: { moveSpeedPct: -0.15 } },
        climate: null,
        colors: { ground: '#dcdcb4', ground2: '#d3d6aa', speck: '#7d8f4e', hazard: '#bfc48e', hazardInk: '#5f7a3a', obstacle: '#7d9a52', road: '#d9c9a0', deep: '#7f9fae' },
        creeps: [['SCOUT', 'Lobo Gris', '#8d8d8d'], ['BRUTE', 'Jabalí', '#8b5e3c'], ['ARCHER', 'Arquero Silvano', '#6a994e'], ['GRUNT', 'Bandido', '#a68a64'],
            ['SHAMAN', 'Druida', '#588157', null, 1], ['HEALER', 'Hada Sanadora', '#b5e48c', null, 1]]
    },
    swamp: {
        name: 'Ciénaga Turbia', icon: '🐸', obstacle: 'deadTree', density: 0.4, hazardBlobs: 18, deepBlobs: 9,
        hazard: { name: 'Fango venenoso', desc: 'te frena un 25% y envenena (1,5% de tu vida por segundo)', look: 'mud', mods: { moveSpeedPct: -0.25 }, dps: 0.015 },
        climate: { name: 'Niebla', desc: '−1,5 de visión en el campo', sight: -1.5 },
        colors: { ground: '#cbc8a0', ground2: '#c2c096', speck: '#6b705c', hazard: '#9c9866', hazardInk: '#4f5a2f', obstacle: '#5a4a3a', road: '#bfb38a', deep: '#6f8a7a' },
        creeps: [['GRUNT', 'Sapo Venenoso', '#7a9a3a', 'poison'], ['SWARM', 'Mosquitos', '#a3b18a'], ['SHAMAN', 'Bruja del Pantano', '#6b705c', 'poison'], ['SPECTER', 'Fuego Fatuo', '#9fb8a0'],
            ['ARMORED', 'Hombre de Lodo', '#6f5e4a', null, 1], ['DRUMMER', 'Tamborilero Lagarto', '#7f8f5a', null, 1]]
    },
    desert: {
        name: 'Desierto Rojo', icon: '🏜️', obstacle: 'rock', density: 0.36, hazardBlobs: 18, deepBlobs: 0,
        hazard: { name: 'Arena movediza', desc: 'te frena un 40%', look: 'quicksand', mods: { moveSpeedPct: -0.4 } },
        climate: { name: 'Calor', desc: '−50% de regeneración de maná en el campo', mods: h => ({ manaRegen: -(h.manaRegen || 0) * 0.5 }) },
        colors: { ground: '#ecd9a8', ground2: '#e5cf9a', speck: '#b08850', hazard: '#d7b57a', hazardInk: '#8a6a3a', obstacle: '#b59a72', road: '#dcc79a', deep: '#7f9fae' },
        creeps: [['STUNNER', 'Escorpión', '#c08552', 'poison'], ['CROSSBOW', 'Nómada Ballestero', '#d4a373'], ['KAMIKAZE', 'Escarabajo Explosivo', '#b5651d'], ['THIEF', 'Ladrón de Arena', '#e0c080'],
            ['ARMORED', 'Momia', '#cbbf9e', null, 1], ['WARLOCK', 'Hechicero de Arena', '#d9a441', null, 1]]
    },
    snow: {
        name: 'Picos Nevados', icon: '❄️', obstacle: 'pine', density: 0.42, hazardBlobs: 20, deepBlobs: 0,
        hazard: { name: 'Nieve profunda', desc: 'te frena un 30%', look: 'drift', mods: { moveSpeedPct: -0.3 } },
        climate: { name: 'Frío', desc: '−15% de velocidad de ataque en el campo', mods: () => ({ atkSpeedPct: -0.15 }) },
        colors: { ground: '#eceee9', ground2: '#e3e7e4', speck: '#9fb0bc', hazard: '#dde4ea', hazardInk: '#8fa3b3', obstacle: '#4f6f5f', road: '#d6d2c8', deep: '#9cc0d6' },
        creeps: [['SCOUT', 'Lobo Blanco', '#cfd8dc', 'chill'], ['BRUTE', 'Yeti', '#b0bec5', 'chill'], ['FROSTCASTER', 'Escarchador', '#90caf9'], ['SPECTER', 'Espíritu Helado', '#b3e5fc', 'chill'],
            ['ARMORED', 'Gólem de Hielo', '#a7c4d6', null, 1], ['ANCHOR', 'Ancla Glaciar', '#7fa7c9', null, 1]]
    },
    volcano: {
        name: 'Volcán de Ceniza', icon: '🌋', obstacle: 'basalt', density: 0.38, hazardBlobs: 16, deepBlobs: 8,
        hazard: { name: 'Roca ardiente', desc: 'quema (3% de tu vida por segundo)', look: 'embers', mods: {}, dps: 0.03 },
        climate: { name: 'Aire sofocante', desc: 'recibís 10% más de daño en el campo', mods: () => ({ dmgTakenPct: 0.1 }) },
        colors: { ground: '#aaa196', ground2: '#a0978c', speck: '#5a524a', hazard: '#6a4a3c', hazardInk: '#e0702a', obstacle: '#4a4440', road: '#8f857a', deep: '#d0602a' },
        creeps: [['KAMIKAZE', 'Diablillo', '#e85d04'], ['BRUTE', 'Bruto de Magma', '#9d0208', 'burn'], ['WARLOCK', 'Piromante', '#f48c06', 'burn'], ['SCOUT', 'Salamandra', '#dc2f02', 'burn'],
            ['ARMORED', 'Acorazado de Obsidiana', '#3d3b40', null, 1], ['DRUMMER', 'Tamborilero de Guerra', '#9b2226', null, 1]]
    }
};
function biomeFor(floor) { return BIOME_ORDER[Math.min(BIOME_ORDER.length - 1, Math.floor((floor - 1) / 2))]; }

// Rasgos de los creeps de bioma: se aplican cuando su ataque pega.
const CREEP_TRAITS = {
    poison: { label: 'envenena', apply(c, t) { creepDot(c, t, 'POISON', 'Envenenado', 0.25); } },
    burn: { label: 'quema', apply(c, t) { creepDot(c, t, 'BURN', 'Quemado', 0.3); } },
    chill: { label: 'congela (te frena)', apply(c, t) { addEffect(t, { id: 'CHILL', name: 'Helado', duration: 2, tags: ['PERJUICIO'], mods: { moveSpeedPct: -0.25, atkSpeedPct: -0.1 } }); } }
};
// Daño en el tiempo (3 s): una parte del ataque del creep por segundo.
function creepDot(c, t, id, name, pct) {
    addEffect(t, { id, name, duration: 3, tags: ['PERJUICIO'], hooks: { onTick(u, { dt }) { if (everyInterval(u, id, dt, 1)) dealDamage(c, u, Math.max(1, Math.round(c.atk * pct)), 'pure'); } } });
}

// Figura de tinta propia para las bestias de los biomas (inkart.js); el resto usa la de su tipo base.
const BIOME_CREEP_PLANS = { 'Lobo Gris': 'wolf', 'Lobo Blanco': 'wolf', 'Jabalí': 'boar', 'Sapo Venenoso': 'toad', 'Escorpión': 'scorpion',
    'Salamandra': 'lizard', 'Gólem de Hielo': 'golem', 'Hombre de Lodo': 'golem', 'Acorazado de Obsidiana': 'golem' };
// Tipos de creep de un bioma: variantes de los de siempre (misma mecánica, otro nombre y color, y su rasgo).
const biomeCreepCache = {};
function biomeCreepTypes(key) {
    if (biomeCreepCache[key]) return biomeCreepCache[key];
    return (biomeCreepCache[key] = BIOMES[key].creeps.map(([base, label, color, trait, from]) => {
        const t = CREEP_TYPES[base], tr = trait && CREEP_TRAITS[trait];
        const onAttack = tr ? (c, target, result) => { if (t.onAttack) t.onAttack(c, target, result); if (result && result.dealt > 0 && target.isAlive()) tr.apply(c, target); } : t.onAttack;
        return { ...t, label, color, biome: key, trait: trait || null, from: from || 0, onAttack, plan: BIOME_CREEP_PLANS[label],
            mechanic: (t.mechanic || '') + (tr ? ` Su golpe ${tr.label}.` : '') };
    }));
}
// Creeps de un piso: los del bioma (el segundo piso del bioma suma los más difíciles).
function towerCreepPool(floor) {
    const stage = (floor - 1) % 2;
    const list = towerBestiary(biomeFor(floor)) || biomeCreepTypes(biomeFor(floor)); // bestiario generado de la run (towerBestiary.js)
    return list.filter(t => t.from <= stage);
}

// --- GENERACIÓN ---
function generateTowerLevel(floor) {
    const W = TOWER.cols, H = TOWER.rows, N = W * H;
    const biomeKey = biomeFor(floor), B = BIOMES[biomeKey];
    const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const walls = Array.from({ length: H }, () => new Uint8Array(W));
    const deep = new Uint8Array(N), ground = new Uint8Array(N), zone = new Uint8Array(N), height = new Uint8Array(N), ramp = new Uint8Array(N);
    const at = (x, y) => y * W + x;
    const inRect = (r, x, y, m = 0) => x >= r.x - m && x < r.x + r.w + m && y >= r.y - m && y < r.y + r.h + m;
    const inside = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1;

    // 1. Laberinto (del lado derecho): bloque de piedra con salas y pasillos
    const L = WORLD.lab;
    const lab = { x: W - L.w - 2, y: Math.max(2, Math.min(H - L.h - 2, Math.floor((H - L.h) / 2) + rint(-12, 12))), w: L.w, h: L.h };
    for (let y = lab.y; y < lab.y + lab.h; y++) for (let x = lab.x; x < lab.x + lab.w; x++) { walls[y][x] = WALL.stone; zone[at(x, y)] = ZONE.lab; ground[at(x, y)] = GROUND.lab; }
    const rooms = carveRooms(walls, lab, L.rooms, rint);
    const first = rooms.reduce((a, b) => (b.cx < a.cx ? b : a)); // la sala de la entrada: la de más a la izquierda
    for (let x = lab.x; x <= first.cx; x++) { walls[first.cy][x] = 0; walls[first.cy + 1][x] = 0; }
    const gate = { x: lab.x - 1, y: first.cy };

    // 2. Entrada del piso (lado izquierdo) y 3. pueblo con empalizada, portones a los cuatro lados, mercader y fuente
    const start = { x: 6, y: rint(15, H - 16) };
    const T = WORLD.town;
    const town = { x: rint(Math.floor(W * 0.24), Math.floor(W * 0.36)), y: rint(8, H - T.h - 8), w: T.w, h: T.h };
    const midX = town.x + Math.floor(T.w / 2), midY = town.y + Math.floor(T.h / 2);
    for (let y = town.y; y < town.y + T.h; y++) for (let x = town.x; x < town.x + T.w; x++) {
        zone[at(x, y)] = ZONE.town; ground[at(x, y)] = GROUND.town;
        const border = x === town.x || y === town.y || x === town.x + T.w - 1 || y === town.y + T.h - 1;
        const isGate = (Math.abs(y - midY) <= 1 && (x === town.x || x === town.x + T.w - 1)) || (Math.abs(x - midX) <= 1 && (y === town.y || y === town.y + T.h - 1));
        if (border && !isGate) walls[y][x] = WALL.palisade;
    }
    town.merchant = { x: midX, y: town.y + 3 };
    town.fountain = { x: midX, y: midY + 2 };
    walls[town.fountain.y][town.fountain.x] = WALL.fountain;

    // 4. Obstáculos del bioma (autómata celular: bosquecitos, roquedales…), fuera de las zonas protegidas
    const guarded = (x, y) => Math.hypot(x - start.x, y - start.y) < 6 || inRect(town, x, y, 3) || inRect(lab, x, y, 3);
    let obs = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) obs[at(x, y)] = !inside(x, y) ? 1 : guarded(x, y) ? 0 : (Math.random() < B.density ? 1 : 0);
    for (let step = 0; step < 4; step++) {
        const next = obs.slice();
        for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
            if (guarded(x, y)) continue;
            let n = 0;
            for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if ((ox || oy) && obs[at(x + ox, y + oy)]) n++;
            next[at(x, y)] = n >= 5 ? 1 : n <= 3 ? 0 : obs[at(x, y)];
        }
        obs = next;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!inside(x, y)) walls[y][x] = WALL.edge;
        else if (zone[at(x, y)] === ZONE.field && obs[at(x, y)]) walls[y][x] = WALL.obstacle;
    }

    // 5. Terreno del bioma: manchas con efecto y pozos profundos (agua, lava) rodeados de ese terreno
    const blob = (cx, cy, r, fn) => {
        for (let y = cy - r - 1; y <= cy + r + 1; y++) for (let x = cx - r - 1; x <= cx + r + 1; x++) {
            if (!inside(x, y) || zone[at(x, y)] !== ZONE.field || guarded(x, y)) continue;
            const d = Math.hypot(x - cx, y - cy) + (Math.random() - 0.5) * 1.2;
            if (d <= r) fn(x, y, d);
        }
    };
    for (let i = 0; i < B.hazardBlobs; i++) blob(rint(2, W - 3), rint(2, H - 3), rint(3, 7), (x, y) => { if (!walls[y][x]) ground[at(x, y)] = GROUND.hazard; });
    for (let i = 0; i < B.deepBlobs; i++) {
        const r = rint(2, 4);
        blob(rint(8, W - 9), rint(6, H - 7), r + 2, (x, y, d) => {
            if (d <= r) { deep[at(x, y)] = 1; walls[y][x] = 0; ground[at(x, y)] = GROUND.hazard; }
            else if (!walls[y][x]) ground[at(x, y)] = GROUND.hazard;
        });
    }

    // 5 bis. Mesetas: manchas altas cuyo borde es acantilado; dos rampas por meseta para subir
    for (let p = 0; p < WORLD.plateaus; p++) {
        const cx = rint(14, W - 14), cy = rint(10, H - 11), r = rint(5, 10), cells = [];
        blob(cx, cy, r, (x, y) => { if (!deep[at(x, y)]) { height[at(x, y)] = 1; cells.push([x, y]); } });
        const edges = cells.filter(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !height[at(x + dx, y + dy)]));
        edges.forEach(([x, y]) => { walls[y][x] = WALL.cliff; });
        // Rampas: un borde con piso libre afuera y adentro
        shuffle(edges.slice()).filter(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
            const ox = x + dx, oy = y + dy, ix = x - dx, iy = y - dy;
            return inside(ox, oy) && !height[at(ox, oy)] && !walls[oy][ox] && height[at(ix, iy)] && !walls[iy][ix];
        })).slice(0, 2).forEach(([x, y]) => { walls[y][x] = 0; ramp[at(x, y)] = 1; });
    }

    // 6. Caminos de 3 casillas: entrada → portón oeste del pueblo, y portón este → laberinto (garantizan el paso)
    const pave = (x, y) => {
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
            const px = x + ox, py = y + oy;
            if (!inside(px, py) || zone[at(px, py)] !== ZONE.field) continue;
            if (walls[py][px] === WALL.cliff) ramp[at(px, py)] = 1; // el camino corta el acantilado: rampa
            walls[py][px] = 0; deep[at(px, py)] = 0; ground[at(px, py)] = GROUND.road;
        }
    };
    const road = (a, b) => {
        let x = a.x, y = a.y;
        for (let guard = 0; (x !== b.x || y !== b.y) && guard < 6000; guard++) {
            pave(x, y);
            const ax = Math.abs(b.x - x), ay = Math.abs(b.y - y);
            if (ax && (!ay || Math.random() < ax / (ax + ay))) { x += Math.sign(b.x - x); if (Math.random() < 0.2) y += Math.random() < 0.5 ? 1 : -1; }
            else { y += Math.sign(b.y - y); if (Math.random() < 0.2) x += Math.random() < 0.5 ? 1 : -1; }
            x = Math.max(1, Math.min(W - 2, x)); y = Math.max(1, Math.min(H - 2, y));
        }
        pave(b.x, b.y);
    };
    road(start, { x: town.x - 2, y: midY });
    road({ x: town.x + T.w + 1, y: midY }, gate);

    const level = makeArena('tower', []);
    Object.assign(level, { floor, biome: biomeKey, W, H, walls, deep, ground, zone, height, ramp, rooms, lab, town, gate, start,
        explored: Array.from({ length: H }, () => new Uint8Array(W)), corpses: [] });

    // 7. Lo que no se alcanza desde la entrada se tapa (sin bolsones aislados)
    const dist = bfsFrom(level, start.x, start.y);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = at(x, y);
        if (walls[y][x] || deep[i] || dist[i] >= 0) continue;
        walls[y][x] = zone[i] === ZONE.lab ? WALL.stone : zone[i] === ZONE.town ? WALL.palisade : WALL.obstacle;
    }

    // 8. Guardián y escalera: en la sala del laberinto más lejana caminando
    const guardRoom = rooms.filter(r => r !== first).reduce((best, r) => (dist[at(r.cx, r.cy)] > dist[at(best.cx, best.cy)] ? r : best), rooms.find(r => r !== first) || first);
    level.stairs = { x: guardRoom.cx + Math.min(2, Math.floor(guardRoom.w / 2) - 1), y: guardRoom.cy };
    const g = makeCreep(pickRandom(ROUND_BOSSES), guardRoom.cx - 1, guardRoom.cy, TOWER.guardianMult(floor), false, 0);
    Object.assign(g, { isRoundBoss: true, isGuardian: true, arena: level, level: floor + 1, xp: Math.round(120 * TOWER.xpMult(floor + 1)), gold: 50 * floor });
    level.creeps.push(g);
    level.boss = g; level.guardian = g;

    // 9. Creeps: grupos sueltos por el campo y uno por sala del laberinto (estos, un nivel más)
    const pool = towerCreepPool(floor);
    const spawnPack = (cx, cy, n, lvlBonus, xpMult, champion = null) => {
        for (let i = 0; i < n; i++) {
            const type = pickRandom(pool);
            const lvl = floor + lvlBonus + (Math.random() < 0.3 ? 1 : 0);
            for (let k = 0; k < (type.groupSize || 1); k++) {
                let x = cx, y = cy;
                for (let t = 0; t < 12; t++) {
                    const px = cx + rint(-2, 2), py = cy + rint(-2, 2);
                    if (walkable(level, px, py) && zone[at(px, py)] === zone[at(cx, cy)] && dist[at(px, py)] >= 0) { x = px; y = py; break; }
                }
                const c = makeCreep(type, x, y, TOWER.creepMult(lvl), false, 0);
                Object.assign(c, { arena: level, level: lvl, xp: Math.round(type.xp * TOWER.xpMult(lvl) * xpMult) });
                if (champion) makeChampion(c, champion);
                level.creeps.push(c);
            }
        }
    };
    const packs = [];
    for (let t = 0; t < 6000 && packs.length < WORLD.fieldPacks; t++) {
        const x = rint(2, W - 3), y = rint(2, H - 3), i = at(x, y);
        if (zone[i] !== ZONE.field || !walkable(level, x, y) || dist[i] < WORLD.safeFromStart || inRect(town, x, y, 6)) continue;
        if (packs.some(p => Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) < WORLD.packSpacing)) continue;
        packs.push({ x, y });
        // Grupo campeón: 1 a 3 afijos según el piso (más chance en los pisos altos)
        const champ = Math.random() < CHAMPION.baseChance + CHAMPION.perFloor * floor ? shuffle(Object.keys(CHAMPION_AFFIXES)).slice(0, championAffixCount(floor)) : null;
        spawnPack(x, y, rint(TOWER.packSize[0], TOWER.packSize[1]), 0, WORLD.fieldXp, champ);
    }
    rooms.filter(r => r !== first && r !== guardRoom).forEach(r => spawnPack(r.cx, r.cy, rint(TOWER.packSize[0], TOWER.packSize[1]), 1, 1));

    // 10. Cofres: dos en claros del campo y dos en salas del laberinto
    const clearings = [];
    for (let t = 0; t < 3000 && clearings.length < 3; t++) {
        const x = rint(2, W - 7), y = rint(2, H - 6);
        if (dist[at(x, y)] < 20 || inRect(town, x, y, 6)) continue;
        let ok = true;
        for (let oy = 0; oy < 3 && ok; oy++) for (let ox = 0; ox < 4 && ok; ox++) ok = walkable(level, x + ox, y + oy) && zone[at(x + ox, y + oy)] === ZONE.field && dist[at(x + ox, y + oy)] >= 0;
        if (ok && clearings.every(c => Math.hypot(c.x - x, c.y - y) > 30)) clearings.push({ x, y, w: 4, h: 3 });
    }
    placeShrines(level, dist);
    placeCaveMouths(level, dist);
    level.drops = [];
    placeChests(level, clearings.concat(shuffle(rooms.filter(r => r !== first && r !== guardRoom)).slice(0, 5 - clearings.length)));
    level.creeps.forEach(c => { c.spawnTime = -1e9; }); // sin el oro extra por velocidad de las oleadas (no aplica en la Torre)
    return level;
}

// Salas rectangulares dentro de `rect`, unidas por pasillos de 2 casillas (árbol + un par de vueltas).
function carveRooms(walls, rect, want, rint) {
    const R = TOWER.rooms, rooms = [];
    const carve = (x, y) => { if (x > rect.x && y > rect.y && x < rect.x + rect.w - 1 && y < rect.y + rect.h - 2) walls[y][x] = 0; };
    const fits = (x, y, w, h) => !rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y);
    const add = (x, y, w, h) => {
        rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });
        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) carve(xx, yy);
    };
    for (let t = 0; t < R.tries && rooms.length < want; t++) {
        const w = rint(R.minW, R.maxW), h = rint(R.minH, R.maxH);
        const x = rint(rect.x + 2, rect.x + rect.w - w - 3), y = rint(rect.y + 2, rect.y + rect.h - h - 3);
        if (fits(x, y, w, h)) add(x, y, w, h);
    }
    // Respaldo (si el azar dejó pocas salas): una grilla de salas chicas que no se pisen
    for (let gy = 0; gy < 3 && rooms.length < 4; gy++) for (let gx = 0; gx < 3 && rooms.length < 4; gx++) {
        const x = rect.x + 3 + gx * Math.floor((rect.w - 12) / 2), y = rect.y + 3 + gy * Math.floor((rect.h - 10) / 2);
        if (fits(x, y, 8, 6)) add(x, y, 8, 6);
    }
    const corridor = (a, b) => {
        const hLine = (x1, x2, y) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) { carve(x, y); carve(x, y + 1); } };
        const vLine = (y1, y2, x) => { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) { carve(x, y); carve(x + 1, y); } };
        if (Math.random() < 0.5) { hLine(a.cx, b.cx, a.cy); vLine(a.cy, b.cy, b.cx); } else { vLine(a.cy, b.cy, a.cx); hLine(a.cx, b.cx, b.cy); }
    };
    const joined = [rooms[0]];
    rooms.slice(1).forEach(r => {
        const near = joined.reduce((best, o) => (Math.hypot(o.cx - r.cx, o.cy - r.cy) < Math.hypot(best.cx - r.cx, best.cy - r.cy) ? o : best));
        corridor(near, r); joined.push(r);
    });
    for (let i = 0; i < 2 && rooms.length > 3; i++) corridor(pickRandom(rooms), pickRandom(rooms));
    return rooms;
}

// --- ALTURA ---
function heightAt(level, x, y) { return level && level.height ? level.height[y * COLS + x] : 0; }
const HEIGHT_RULES = { sight: 2, dmgUp: 1.2, dmgDown: 0.8 };
// Daño según la altura: de arriba hacia abajo pega más; de abajo hacia arriba, menos (solo en la Torre).
function heightDamageMult(source, target) {
    const level = source && source.arena;
    if (!level || !level.height || target.arena !== level) return 1;
    const hs = heightAt(level, source.x, source.y), ht = heightAt(level, target.x, target.y);
    return hs > ht ? HEIGHT_RULES.dmgUp : hs < ht ? HEIGHT_RULES.dmgDown : 1;
}

// --- EN JUEGO ---
function towerZoneAt(level, x, y) { return level.zone ? level.zone[y * COLS + x] : ZONE.lab; }
function heroInTown(hero) { return !!(hero.arena && hero.arena.zone && towerZoneAt(hero.arena, hero.x, hero.y) === ZONE.town); }
// Visión que quita el clima del bioma (Niebla) mientras estás en el campo.
function climateSight(hero) {
    const level = hero.arena, B = level && level.biome && BIOMES[level.biome];
    return B && B.climate && B.climate.sight && towerZoneAt(level, hero.x, hero.y) === ZONE.field ? B.climate.sight : 0;
}

// Cada frame: terreno bajo tus pies, clima del campo, descanso en el pueblo, el mercader y los avisos al cambiar de zona.
function towerTerrainTick(level, hero, dt) {
    if (!level.ground) return;
    towerDayNightTick(level);
    if (!hero.isAlive()) return;
    const i = hero.y * COLS + hero.x, B = BIOMES[level.biome], z = level.zone[i];
    if (z === ZONE.field && level.ground[i] === GROUND.hazard) {
        addEffect(hero, { id: 'TERRAIN', name: B.hazard.name, duration: 0.4, tags: ['PERJUICIO'], mods: B.hazard.mods || {} });
        if (B.hazard.dps && everyInterval(hero, 'TERRAIN_DMG', dt, 1)) { dealDamage(null, hero, Math.max(1, Math.round(hero.maxHp * B.hazard.dps)), 'pure'); if (!hero.isAlive()) return; }
    }
    if (z === ZONE.field && B.climate && B.climate.mods && everyInterval(hero, 'CLIMATE', dt, 0.5))
        addEffect(hero, { id: 'CLIMATE', name: B.climate.name, duration: 0.8, tags: ['PERJUICIO'], mods: B.climate.mods(hero) });
    if (z === ZONE.town && everyInterval(hero, 'TOWN_REST', dt, 0.5))
        addEffect(hero, { id: 'TOWN_REST', name: 'Descanso en el pueblo', duration: 0.8, tags: ['MEJORA'], mods: { hpRegen: hero.maxHp * WORLD.townRegenPct, manaRegen: hero.maxMana * WORLD.townRegenPct } });
    if (z === ZONE.town) level.visitedTown = true;
    if (z === ZONE.lab) level.enteredLab = true;
    useShrines(level, hero);
    if (z !== hero.towerZone && level.town && z !== ZONE.town) level.town.aiShopped = false; // la IA vuelve a comprar en la próxima visita
    if (z !== hero.towerZone) {
        if (hero.towerZone !== undefined && hero === player) {
            if (z === ZONE.town) log(`🏘️ Entraste al pueblo: zona segura (los creeps no te siguen y recuperás vida y maná). El mercader vende y compra piezas (B).`);
            else if (z === ZONE.lab) log(`🗼 Entraste al laberinto de la torre: el guardián cuida la escalera al piso ${level.floor + 1}.`);
        }
        hero.towerZone = z;
    }
    // El mercader: al acercarte abre la tienda (una vez por visita)
    const m = level.town && level.town.merchant;
    if (m && hero === player && !autopilot) {
        const near = Math.max(Math.abs(hero.x - m.x), Math.abs(hero.y - m.y)) <= 1;
        if (near && !level.town.greeted) { level.town.greeted = true; toggleTowerShop(true); }
        else if (!near) level.town.greeted = false;
    }
}

// Texto del bioma para el panel y el aviso al llegar
function biomeSummary(level) {
    const B = BIOMES[level.biome];
    if (!B) return '';
    return `${B.icon} <b>${B.name}</b> · ${B.hazard.name}: ${B.hazard.desc}` + (B.climate ? ` · ${B.climate.name}: ${B.climate.desc}` : '');
}

// --- DIBUJO ---
// Baldosas de cada bioma en estilo tinta (se dibujan una vez por bioma).
const biomeTileCache = {};
function biomeTiles(key) {
    if (biomeTileCache[key]) return biomeTileCache[key];
    const B = BIOMES[key], C = B.colors;
    let seed = [...key].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) % 2147483647, 99);
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const tile = draw => { const c = document.createElement('canvas'); c.width = c.height = TILE; const g = c.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round'; draw(g); return c; };
    const speckle = (g, color, n, a = 0.35) => { g.globalAlpha = a; g.fillStyle = color; for (let i = 0; i < n; i++) g.fillRect(rnd() * TILE, rnd() * TILE, 1 + rnd() * 2, 1 + rnd()); g.globalAlpha = 1; };
    const base = (g, color) => { g.fillStyle = color; g.fillRect(0, 0, TILE, TILE); speckle(g, C.speck, 18, 0.25); };
    const line = (g, pts, color = INK.line, w = 1.4) => { g.strokeStyle = color; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => g.lineTo(p[0] + (rnd() - 0.5) * 0.6, p[1] + (rnd() - 0.5) * 0.6)); g.stroke(); };
    const blobShape = (g, cx, cy, r, fill, n = 9) => {
        g.beginPath();
        for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, rr = r * (0.85 + rnd() * 0.3); g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
        g.closePath(); g.fillStyle = fill; g.fill(); g.strokeStyle = INK.line; g.lineWidth = 1.5; g.stroke();
    };
    const groundTile = v => tile(g => {
        base(g, v % 2 ? C.ground2 : C.ground);
        for (let i = 0; i < 2; i++) { const x = rnd() * TILE, y = rnd() * TILE; line(g, [[x, y], [x + 2 + rnd() * 3, y - 2 - rnd() * 2]], C.speck, 1); }
    });
    const hazardTile = () => tile(g => {
        base(g, C.hazard);
        const look = B.hazard.look;
        if (look === 'brush') for (let i = 0; i < 5; i++) { const x = 3 + rnd() * 28, y = 8 + rnd() * 24; line(g, [[x, y], [x - 2, y - 7]], C.hazardInk, 1.3); line(g, [[x, y], [x + 1, y - 8]], C.hazardInk, 1.3); line(g, [[x, y], [x + 3, y - 6]], C.hazardInk, 1.3); }
        if (look === 'mud') for (let i = 0; i < 4; i++) { g.strokeStyle = C.hazardInk; g.lineWidth = 1.2; g.beginPath(); g.arc(4 + rnd() * 26, 4 + rnd() * 26, 1.5 + rnd() * 2.5, 0, Math.PI * 2); g.stroke(); }
        if (look === 'quicksand') { g.strokeStyle = C.hazardInk; g.lineWidth = 1.2; g.beginPath(); for (let a = 0; a < 12; a += 0.3) { const r = a * 1.3; g.lineTo(17 + Math.cos(a) * r, 17 + Math.sin(a) * r); } g.stroke(); }
        if (look === 'drift') for (let i = 0; i < 3; i++) { const y = 8 + i * 9 + rnd() * 3; line(g, [[2, y], [10, y - 2], [18, y], [26, y - 2], [33, y]], C.hazardInk, 1.2); }
        if (look === 'embers') for (let i = 0; i < 4; i++) { const x = rnd() * 30, y = rnd() * 30; line(g, [[x, y], [x + 4, y + 3], [x + 7, y + 1], [x + 10, y + 5]], C.hazardInk, 1.6); }
    });
    const deepTile = () => tile(g => {
        g.fillStyle = C.deep; g.fillRect(0, 0, TILE, TILE);
        for (let i = 0; i < 3; i++) { const x = rnd() * 22, y = 6 + rnd() * 24; line(g, [[x, y], [x + 4, y - 2], [x + 8, y], [x + 12, y - 2]], key === 'volcano' ? '#7a2a10' : 'rgba(29,23,18,0.55)', 1.2); }
    });
    const roadTile = () => tile(g => {
        base(g, C.road);
        for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(29,23,18,0.3)'; g.beginPath(); g.arc(rnd() * TILE, rnd() * TILE, 1 + rnd() * 1.5, 0, Math.PI * 2); g.fill(); }
    });
    const townTile = () => tile(g => {
        g.fillStyle = '#d8cfc0'; g.fillRect(0, 0, TILE, TILE);
        g.strokeStyle = 'rgba(29,23,18,0.45)'; g.lineWidth = 1;
        for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(6 + k * 11 + (r % 2) * 5 + (rnd() - 0.5), 6 + r * 11 + (rnd() - 0.5), 4.6, 4, 0, 0, Math.PI * 2); g.stroke(); }
    });
    const obstacleTile = v => tile(g => {
        base(g, v % 2 ? C.ground2 : C.ground);
        const o = B.obstacle, col = C.obstacle;
        if (o === 'tree') {
            g.fillStyle = '#6b4f33'; g.fillRect(15, 20, 5, 12); g.strokeStyle = INK.line; g.lineWidth = 1.4; g.strokeRect(15, 20, 5, 12);
            blobShape(g, 11, 15, 8, col); blobShape(g, 22, 13, 8.5, shade(col, 0.08)); blobShape(g, 17, 8, 7.5, shade(col, 0.15));
            g.strokeStyle = 'rgba(29,23,18,0.35)'; g.lineWidth = 1; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(20 + i * 2, 18); g.lineTo(24 + i * 2, 12); g.stroke(); }
        } else if (o === 'pine') {
            [[17, 2, 11, 14], [17, 9, 13, 21], [17, 16, 15, 28]].forEach(([cx, top, hw, bot]) => {
                g.beginPath(); g.moveTo(cx, top); g.lineTo(cx + hw, bot); g.lineTo(cx - hw, bot); g.closePath(); g.fillStyle = col; g.fill(); g.strokeStyle = INK.line; g.lineWidth = 1.4; g.stroke();
                line(g, [[cx - hw * 0.5, bot - 3], [cx, bot - 5], [cx + hw * 0.5, bot - 3]], '#f4f6f4', 2);
            });
            g.fillStyle = '#5a4030'; g.fillRect(15, 28, 4, 5);
        } else if (o === 'deadTree') {
            line(g, [[17, 33], [17, 18], [12, 8], [10, 3]], col, 3); line(g, [[17, 20], [24, 10], [27, 6]], col, 2.4); line(g, [[13, 11], [7, 9]], col, 1.8); line(g, [[23, 12], [28, 13]], col, 1.6);
            line(g, [[17, 33], [17, 18], [12, 8]], INK.line, 0.8);
        } else if (o === 'rock' || o === 'basalt') {
            if (o === 'rock' && v === 2) { // cactus
                g.fillStyle = '#7f9a5a'; g.strokeStyle = INK.line; g.lineWidth = 1.4;
                [[14, 6, 7, 26], [6, 12, 5, 9], [23, 10, 5, 9]].forEach(([x, y, w, h]) => { g.beginPath(); g.roundRect(x, y, w, h, 2.5); g.fill(); g.stroke(); });
                g.fillRect(9, 19, 6, 3); g.fillRect(20, 17, 4, 3);
            } else {
                const pts = [[5, 30], [3, 18], [9, 8], [19, 4], [29, 10], [31, 24], [26, 31]].map(([x, y]) => [x + (rnd() - 0.5) * 3, y + (rnd() - 0.5) * 3]);
                g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0], p[1])); g.closePath(); g.fillStyle = col; g.fill(); g.strokeStyle = INK.line; g.lineWidth = 1.6; g.stroke();
                line(g, [[12, 12], [16, 18], [14, 24]], o === 'basalt' ? '#7a706a' : 'rgba(29,23,18,0.5)', 1);
                line(g, [[21, 9], [24, 16]], o === 'basalt' ? '#e0702a' : 'rgba(29,23,18,0.4)', 1);
            }
        }
    });
    const palisade = tile(g => {
        g.fillStyle = '#d8cfc0'; g.fillRect(0, 0, TILE, TILE);
        for (let i = 0; i < 4; i++) {
            const x = 1 + i * 8.5;
            g.beginPath(); g.moveTo(x, 33); g.lineTo(x, 8); g.lineTo(x + 3.5, 2); g.lineTo(x + 7, 8); g.lineTo(x + 7, 33); g.closePath();
            g.fillStyle = i % 2 ? '#8a6a46' : '#9a7a52'; g.fill(); g.strokeStyle = INK.line; g.lineWidth = 1.3; g.stroke();
        }
        line(g, [[0, 14], [34, 14]], '#5a4030', 2); line(g, [[0, 25], [34, 25]], '#5a4030', 2);
    });
    const fountain = tile(g => {
        g.drawImage(townTile(), 0, 0);
        g.beginPath(); g.arc(17, 18, 14, 0, Math.PI * 2); g.fillStyle = INK.stone; g.fill(); g.strokeStyle = INK.line; g.lineWidth = 1.6; g.stroke();
        g.beginPath(); g.arc(17, 18, 10, 0, Math.PI * 2); g.fillStyle = '#7fa7c9'; g.fill(); g.stroke();
        line(g, [[11, 18], [14, 16], [17, 18], [20, 16], [23, 18]], 'rgba(255,255,255,0.7)', 1.2);
        g.fillStyle = INK.stone; g.fillRect(15, 9, 4, 9); g.strokeRect(15, 9, 4, 9);
    });
    const cliff = v => tile(g => {
        g.fillStyle = shade(C.obstacle, -0.1); g.fillRect(0, 0, TILE, TILE);
        g.fillStyle = shade(C.ground, -0.18); g.fillRect(0, 0, TILE, 9);
        g.strokeStyle = INK.line; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 9); g.lineTo(TILE, 9); g.stroke();
        g.strokeStyle = 'rgba(29,23,18,0.55)'; g.lineWidth = 1;
        for (let y = 15; y < TILE; y += 7) { g.beginPath(); g.moveTo(0, y + (rnd() - 0.5) * 2); g.lineTo(TILE, y + (rnd() - 0.5) * 2); g.stroke(); }
        for (let i = 0; i < 3; i++) { const x = 4 + rnd() * 26; g.beginPath(); g.moveTo(x, 10); g.lineTo(x + (rnd() - 0.5) * 4, TILE); g.stroke(); }
        if (v) inkHatch(g, 0, 20, TILE, TILE, 3);
    });
    const rampTile = tile(g => {
        base(g, C.road);
        g.strokeStyle = 'rgba(29,23,18,0.5)'; g.lineWidth = 1.4;
        for (let y = 5; y < TILE; y += 7) { g.beginPath(); g.moveTo(3, y); g.lineTo(TILE - 3, y); g.stroke(); }
    });
    return (biomeTileCache[key] = { cliff: [cliff(0), cliff(1)], ramp: rampTile,
        ground: [0, 1, 2, 3].map(groundTile), hazard: [hazardTile(), hazardTile()], deep: [deepTile(), deepTile()],
        road: [roadTile(), roadTile()], town: [townTile(), townTile()], obstacle: [0, 1, 2].map(obstacleTile), palisade, fountain
    });
}

// Imagen de una casilla del campo o del pueblo (las del laberinto las dibuja drawTowerTiles con inkTiles).
function biomeTileFor(level, x, y) {
    const bt = biomeTiles(level.biome), i = y * COLS + x, w = level.walls[y][x], h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
    if (w === WALL.obstacle || w === WALL.edge) return bt.obstacle[h % 3];
    if (w === WALL.cliff) return bt.cliff[h & 1];
    if (level.ramp && level.ramp[i]) return bt.ramp;
    if (w === WALL.palisade) return bt.palisade;
    if (w === WALL.fountain) return bt.fountain;
    if (level.deep[i]) return bt.deep[h & 1];
    const gr = level.ground[i];
    return gr === GROUND.hazard ? bt.hazard[h & 1] : gr === GROUND.road ? bt.road[h & 1] : gr === GROUND.town ? bt.town[h & 1] : bt.ground[h & 3];
}

// Color de una casilla en el minimapa
function towerMiniColor(level, x, y) {
    const w = level.walls[y][x];
    if (!level.ground) return w ? '#5e5444' : '#e9dcc0';
    const C = BIOMES[level.biome].colors, i = y * COLS + x;
    if (w === WALL.stone) return '#5e5444';
    if (w === WALL.obstacle || w === WALL.edge) return shade(C.obstacle, -0.15);
    if (w === WALL.cliff) return '#5a4a38';
    if (level.height && level.height[i] && !level.ramp[i]) return shade(C.ground, 0.12);
    if (w === WALL.palisade) return '#8a6a46';
    if (w === WALL.fountain) return '#7fa7c9';
    if (level.deep[i]) return C.deep;
    const gr = level.ground[i];
    return gr === GROUND.hazard ? C.hazard : gr === GROUND.road ? C.road : gr === GROUND.town ? '#d8cfc0' : gr === GROUND.lab ? '#e9dcc0' : C.ground;
}

// El mercader del pueblo (figura en tinta que respira) con su cartel
function drawTowerMerchant(level) {
    const m = level.town && level.town.merchant;
    if (!m || !level.explored[m.y][m.x]) return;
    const k = Math.floor(((fxClock * 0.8) % 1) * INK_IDLE_FRAMES);
    const fig = inkFigure('mage', { main: '#8a6a46', accent: '#c9a227' }, 'idle', k);
    const s = 1.1 * TILE / INK_W * 1.3, w = INK_W * s, h = INK_H * s;
    const cx = m.x * TILE + TILE / 2, cy = m.y * TILE + TILE / 2 + TILE * 0.45;
    ctx.fillStyle = 'rgba(29,23,18,0.28)'; ctx.beginPath(); ctx.ellipse(cx, cy - 2, w * 0.3, h * 0.04, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(fig.img, cx - w / 2, cy - h * (FOOT + 2) / INK_H, w, h);
    ctx.font = 'bold 11px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = INK.line;
    ctx.fillText('Mercader (B)', cx, m.y * TILE - TILE * 0.9);
}

// --- RITMO DE LA RUN (revisión de diseño 2026-10-05, ver docs/ROGUELIKE.md §5) ---
// Experiencia al estilo Diablo II: cada piso tiene un "nivel de zona" (el nivel esperado del héroe ahí). Si lo pasás,
// los creeps dan cada vez menos (−18% por nivel de más, mínimo 5%); si venís atrasado, un poco más (hasta +50%).
// Meta: ~3 niveles por piso (nivel 30 al llegar al último).
const PACE = { levelsPerFloor: 3, overPenalty: 0.18, overFloor: 0.05, catchUp: 0.1, catchUpMax: 1.5 };
function towerZoneLevel(floor) { return PACE.levelsPerFloor * floor; }
function towerXpFactor(hero, floor) {
    const diff = hero.level - towerZoneLevel(floor);
    let f = diff <= 0 ? Math.min(PACE.catchUpMax, 1 + PACE.catchUp * Math.max(0, -diff - 2)) : Math.max(PACE.overFloor, 1 - PACE.overPenalty * diff);
    if (getEffect(hero, 'SHRINE_XP')) f *= 1.5;
    if (towerIsNight()) f *= DAYNIGHT.nightXp; // de noche, +50%
    return f;
}

// --- GRUPOS CAMPEONES (como los campeones azules de Diablo III) ---
// Algunos grupos del campo vienen con 1 a 3 afijos (más en los pisos altos): más vida y daño, y mejor botín y experiencia.
const CHAMPION = { baseChance: 0.03, perFloor: 0.025, hpMult: 1.5, atkMult: 1.25, xpMult: 2.5, goldMult: 2, dropChance: 0.35 };
const CHAMPION_AFFIXES = {
    fast: { name: 'Veloz', apply(c) { c.moveInterval *= 0.7; c.atkSpeed *= 1.3; } },
    strong: { name: 'Feroz', apply(c) { c.atk = Math.round(c.atk * 1.4); } },
    armored: { name: 'Blindado', apply(c) { c.armor += 6; c.magicResist += 25; } },
    vampiric: { name: 'Vampírico', onAttack(c, t, r) { if (r.dealt > 0) c.hp = Math.min(c.maxHp, c.hp + r.dealt * 0.5); } },
    burning: { name: 'Ardiente', onAttack(c, t, r) { if (r.dealt > 0 && t.isAlive()) CREEP_TRAITS.burn.apply(c, t); } },
    frozen: { name: 'Gélido', onAttack(c, t, r) { if (r.dealt > 0 && t.isAlive()) CREEP_TRAITS.chill.apply(c, t); } },
    regen: { name: 'Regenerador', regenPct: 0.012 }, // 3% se curaba más rápido de lo que pegaba un héroe recién muerto
    explosive: { name: 'Explosivo', onDeath(c) {
        if (!player || !player.isAlive() || player.arena !== c.arena || Math.hypot(player.x - c.x, player.y - c.y) > 2) return;
        dealDamage(null, player, Math.round(c.atk * 2), 'magical');
        if (fxArena(c)) fxRing(c, '#e0702a', 2, 0.5);
        log(`💥 ¡${c.label} explotó al morir!`);
    } }
};
function championAffixCount(floor) { return floor <= 4 ? 1 : floor <= 8 ? 2 : 3; }
// Convierte un creep recién creado en campeón (mismos afijos para todo el grupo).
function makeChampion(c, affixes) {
    c.champion = affixes;
    c.hp = c.maxHp = Math.round(c.maxHp * CHAMPION.hpMult);
    c.atk = Math.round(c.atk * CHAMPION.atkMult);
    c.xp = Math.round(c.xp * CHAMPION.xpMult); c.gold = Math.round(c.gold * CHAMPION.goldMult);
    affixes.forEach(k => { const a = CHAMPION_AFFIXES[k]; if (a.apply) a.apply(c); if (a.regenPct) c.regenPct = a.regenPct; });
    c.label = `${c.label} Campeón (${affixes.map(k => CHAMPION_AFFIXES[k].name).join(', ')})`;
}
function championOnAttack(c, target, result) { (c.champion || []).forEach(k => { const a = CHAMPION_AFFIXES[k]; if (a.onAttack) a.onAttack(c, target, result); }); }
function championOnDeath(c) { (c.champion || []).forEach(k => { const a = CHAMPION_AFFIXES[k]; if (a.onDeath) a.onDeath(c); }); }

// --- SANTUARIOS (como los de Diablo): premian explorar el campo ---
// Tres por piso, en lugares apartados del camino. Se activan al pisarlos, una sola vez.
const SHRINES = {
    fury: { name: 'Santuario de la Furia', color: '#9b2226', desc: '+35% de daño por 60 s', effect: { mods: { atkPct: 0.35 } } },
    haste: { name: 'Santuario de la Celeridad', color: '#2d6a4f', desc: '+30% de velocidad y +25% de vel. de ataque por 60 s', effect: { mods: { moveSpeedPct: 0.3, atkSpeedPct: 0.25 } } },
    ward: { name: 'Santuario de la Guardia', color: '#1d4e89', desc: '−30% de daño recibido por 60 s', effect: { mods: { dmgReduction: 0.3 } } },
    wisdom: { name: 'Santuario de la Sabiduría', color: '#c9a227', desc: '+50% de experiencia por 90 s', effect: { id: 'SHRINE_XP', duration: 90 } },
    life: { name: 'Santuario de la Vida', color: '#ff477e', desc: 'te cura del todo (vida y maná)', instant: h => { h.hp = h.maxHp; h.mana = h.maxMana; } }
};
const SHRINES_PER_FLOOR = 5;
function placeShrines(level, dist) {
    const W = COLS, H = ROWS, at = (x, y) => y * W + x;
    level.shrines = [];
    for (let t = 0; t < 8000 && level.shrines.length < SHRINES_PER_FLOOR; t++) {
        const x = 2 + Math.floor(Math.random() * (W - 4)), y = 2 + Math.floor(Math.random() * (H - 4)), i = at(x, y);
        if (level.zone[i] !== ZONE.field || level.ground[i] === GROUND.road || !walkable(level, x, y) || dist[i] < 25) continue;
        if (level.shrines.some(s => Math.hypot(s.x - x, s.y - y) < (t < 4000 ? 35 : 15))) continue; // separados (si no entran, más juntos)
        level.shrines.push({ x, y, kind: pickRandom(Object.keys(SHRINES)), used: false });
    }
}
function useShrines(level, hero) {
    (level.shrines || []).forEach(s => {
        if (s.used || s.x !== hero.x || s.y !== hero.y) return;
        s.used = true;
        if (towerRun && hero === player) towerRun.stats.shrines++;
        const S = SHRINES[s.kind];
        if (S.instant) S.instant(hero);
        else addEffect(hero, { id: S.effect.id || 'SHRINE_' + s.kind.toUpperCase(), name: S.name, duration: S.effect.duration || 60, tags: ['MEJORA'], mods: S.effect.mods || {} });
        if (fxArena(hero)) { fxRing(hero, S.color, 2.2, 0.8); fxText(hero, S.name, S.color, 12, 1.6); }
        log(`✨ ${S.name}: ${S.desc}.`); sfx('levelup');
    });
}
function drawTowerShrines(level) {
    (level.shrines || []).forEach(s => {
        if (!level.explored[s.y][s.x]) return;
        const S = SHRINES[s.kind], cx = s.x * TILE + TILE / 2, by = s.y * TILE + TILE - 3;
        ctx.save();
        if (!s.used) { ctx.globalAlpha = 0.35 + 0.2 * Math.sin(fxClock * 3); ctx.fillStyle = S.color; ctx.beginPath(); ctx.ellipse(cx, by - 2, 14, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
        ctx.fillStyle = s.used ? INK.stoneDark : INK.stone; ctx.strokeStyle = INK.line; ctx.lineWidth = 1.8; // obelisco en tinta
        ctx.beginPath(); ctx.moveTo(cx - 7, by); ctx.lineTo(cx - 5, by - 22); ctx.lineTo(cx, by - 28); ctx.lineTo(cx + 5, by - 22); ctx.lineTo(cx + 7, by); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = s.used ? '#6b6155' : S.color; ctx.beginPath(); ctx.arc(cx, by - 15, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
    });
}

// --- OBJETIVO DEL PISO Y TÍTULO AL LLEGAR ---
// Qué toca hacer ahora y hacia dónde (la flecha en el borde de la pantalla apunta ahí).
function towerObjective(level) {
    const c = towerRun && towerRun.corpse;
    if (c && c.level === level) return { text: `Recuperá tus restos (+${c.points} puntos de stats)`, x: c.x, y: c.y };
    if (c && c.level && c.level.isCave && c.level.cave.surface === level) return { text: `Tus restos quedaron en una cueva (−${c.level.depth})`, x: c.level.cave.x, y: c.level.cave.y };
    const carrier = carriersOn(level)[0];
    if (carrier) return { text: `Cazá al portador: tiene ${carrier.carrier.length === 1 ? 'una pieza tuya' : carrier.carrier.length + ' piezas tuyas'}`, x: carrier.x, y: carrier.y };
    const caveCarrier = (towerRun && towerRun.carriers || []).find(o => o.isAlive() && o.arena.isCave && o.arena.cave.surface === level);
    if (caveCarrier) return { text: `Un portador con tu equipo está en una cueva (−${caveCarrier.arena.depth})`, x: caveCarrier.arena.cave.x, y: caveCarrier.arena.cave.y };
    if (level.isCave) {
        if (level.down) return { text: `Bajá más hondo (cueva −${level.depth} de −${level.cave.max}) o volvé por la soga`, x: level.down.x, y: level.down.y };
        if (level.caveBoss && level.caveBoss.isAlive()) return { text: `Vencé al señor de la cueva y abrí el tesoro`, x: level.caveBoss.x, y: level.caveBoss.y };
        return { text: 'Volvé a la superficie por la soga', x: level.exitUp.x, y: level.exitUp.y };
    }
    if (level.stairsOpen) return { text: 'Subí la escalera al piso siguiente', x: level.stairs.x, y: level.stairs.y };
    if (level.enteredLab) return { text: `Vencé al guardián (${level.guardian.label})`, x: level.guardian.x, y: level.guardian.y, inLab: true };
    if (!level.visitedTown) return { text: 'Seguí el camino hasta el pueblo', x: level.town.merchant.x, y: level.town.merchant.y };
    return { text: 'Entrá al laberinto de la torre', x: level.gate.x, y: level.gate.y };
}
// Flecha de tinta en el borde de la pantalla hacia el objetivo (si está fuera de la vista; en el laberinto no: hay que explorarlo).
function drawObjectiveArrow(level) {
    if (!level.town || !player.isAlive()) return;
    const o = towerObjective(level);
    if (o.inLab) return;
    const px = (o.x - camera.x + 0.5) * TILE, py = (o.y - camera.y + 0.5) * TILE;
    if (px > 0 && py > 0 && px < MAP_W && py < MAP_H) return;
    const cx = MAP_W / 2, cy = MAP_H / 2, a = Math.atan2(py - cy, px - cx);
    const r = Math.min((MAP_W / 2 - 26) / Math.max(1e-6, Math.abs(Math.cos(a))), (MAP_H / 2 - 26) / Math.max(1e-6, Math.abs(Math.sin(a))));
    ctx.save(); ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.rotate(a);
    ctx.fillStyle = '#6b2a1f'; ctx.strokeStyle = '#f3e7c9'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-3, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
}
// Título grande al llegar a un piso (como el nombre de cada piso de Aincrad), 3,5 s con fundido.
function drawFloorTitle(level) {
    const t = gameClock - (level.titleAt ?? -99);
    if (t > 3.5 || t < 0) return;
    const B = BIOMES[level.biome], alpha = Math.max(0, Math.min(1, t * 2, (3.5 - t) * 1.5));
    ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(233,220,192,0.9)'; ctx.fillRect(MAP_W / 2 - 220, MAP_H * 0.28, 440, 74);
    ctx.strokeStyle = INK.line; ctx.lineWidth = 2; ctx.strokeRect(MAP_W / 2 - 220, MAP_H * 0.28, 440, 74);
    ctx.fillStyle = '#6b2a1f'; ctx.font = 'bold 15px Georgia, serif'; ctx.fillText(level.isCave ? `PISO ${level.floor} · BAJO TIERRA` : `PISO ${level.floor} DE ${TOWER.floors} · ${B.icon}`, MAP_W / 2, MAP_H * 0.28 + 24);
    ctx.fillStyle = INK.line; ctx.font = 'bold 26px Georgia, serif'; ctx.fillText(level.isCave ? `Cueva · nivel −${level.depth}` : B.name, MAP_W / 2, MAP_H * 0.28 + 56);
    ctx.restore();
}

// --- DÍA Y NOCHE ---
// Ciclo de 8 minutos: 5 de día, 30 s de atardecer, 2 de noche y 30 s de amanecer. De noche, en el campo: menos visión,
// salen criaturas nocturnas (más fuertes) y todo da más experiencia y botín. El pueblo y el laberinto (con antorchas)
// quedan iluminados.
const DAYNIGHT = { day: 300, dusk: 30, night: 120, dawn: 30, nightSight: -2.5, nightXp: 1.5, nightLoot: 1.5, nightPacks: 10, nightAtk: 1.25 };
const DAY_CYCLE = DAYNIGHT.day + DAYNIGHT.dusk + DAYNIGHT.night + DAYNIGHT.dawn;
function towerTimeOfDay() { return towerRun ? (gameClock - towerRun.startedAt) % DAY_CYCLE : 0; }
// 0 = pleno día, 1 = noche cerrada
function towerDarkness(t = towerTimeOfDay()) {
    const D = DAYNIGHT;
    if (t < D.day) return 0;
    if (t < D.day + D.dusk) return (t - D.day) / D.dusk;
    if (t < D.day + D.dusk + D.night) return 1;
    return 1 - (t - D.day - D.dusk - D.night) / D.dawn;
}
function towerIsNight() { return towerDarkness() >= 0.5; }
// Lo que falta para el próximo cambio (para el panel)
function towerDayLabel() {
    const t = towerTimeOfDay(), D = DAYNIGHT, night = towerIsNight();
    const next = night ? D.day + D.dusk + D.night + D.dawn / 2 : D.day + D.dusk / 2;
    const left = Math.max(0, Math.round((next - t + DAY_CYCLE) % DAY_CYCLE));
    return `${night ? '🌙 Noche' : '☀️ Día'} (${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')})`;
}
// Visión que quita la noche en el campo
function nightSight(hero) {
    const level = hero.arena;
    if (level && level.isCave) return CAVE.sight; // la cueva es oscura siempre
    if (!level || !level.zone || towerZoneAt(level, hero.x, hero.y) !== ZONE.field) return 0;
    return DAYNIGHT.nightSight * towerDarkness();
}
// Al caer la noche aparecen criaturas nocturnas en el campo del piso donde estás; al amanecer, las que no te vieron se van.
function towerDayNightTick(level) {
    if (!level.town) return;
    const night = towerIsNight();
    if (night === !!level.isNight) return;
    level.isNight = night;
    if (night) {
        const pool = towerCreepPool(level.floor), at = (x, y) => y * COLS + x;
        let packs = 0;
        for (let t = 0; t < 3000 && packs < DAYNIGHT.nightPacks; t++) {
            const x = 2 + Math.floor(Math.random() * (COLS - 4)), y = 2 + Math.floor(Math.random() * (ROWS - 4));
            if (level.zone[at(x, y)] !== ZONE.field || !walkable(level, x, y) || Math.hypot(x - player.x, y - player.y) < 14) continue;
            if (Math.abs(x - level.town.merchant.x) < 18 && Math.abs(y - level.town.merchant.y) < 14) continue;
            packs++;
            for (let n = 2 + Math.floor(Math.random() * 2); n > 0; n--) {
                const type = pickRandom(pool), lvl = level.floor + 1;
                const c = makeCreep(type, x, y, TOWER.creepMult(lvl), false, 0);
                Object.assign(c, { arena: level, level: lvl, xp: Math.round(type.xp * TOWER.xpMult(lvl) * WORLD.fieldXp * 1.5), nocturnal: true, spawnTime: -1e9 });
                c.atk = Math.round(c.atk * DAYNIGHT.nightAtk);
                c.label = `${type.label} (nocturno)`; c.color = shade(type.color, -0.35);
                level.creeps.push(c);
            }
        }
        log('🌙 Cae la noche: ves menos en el campo y salen criaturas nocturnas. Todo da +50% de experiencia y botín.');
    } else {
        level.creeps = level.creeps.filter(c => !(c.nocturnal && c.isAlive() && !c.aggro));
        log('☀️ Amanece: las criaturas nocturnas que no te vieron se esconden.');
    }
}
// Capa de oscuridad (en pantalla): se recorta donde hay luz (vos, el pueblo, los santuarios). El laberinto tiene antorchas.
let nightLayer = null;
function drawTowerNight(level) {
    const dark = level.isCave ? 0.82 : level.town ? towerDarkness() : 0;
    if (dark <= 0.01 || towerZoneAt(level, player.x, player.y) === ZONE.lab) return;
    if (!nightLayer) { nightLayer = document.createElement('canvas'); nightLayer.width = MAP_W; nightLayer.height = MAP_H; }
    const g = nightLayer.getContext('2d');
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, MAP_W, MAP_H);
    g.fillStyle = `rgba(14,18,42,${0.62 * dark})`; g.fillRect(0, 0, MAP_W, MAP_H);
    g.globalCompositeOperation = 'destination-out';
    const light = (x, y, r) => {
        const sx = (x - camera.x + 0.5) * TILE, sy = (y - camera.y + 0.5) * TILE;
        const grd = g.createRadialGradient(sx, sy, r * 0.3, sx, sy, r);
        grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd; g.fillRect(sx - r, sy - r, r * 2, r * 2);
    };
    if (player.isAlive()) light(player.x, player.y, heroSight(player) * TILE);
    const tw = level.town; if (tw) light(tw.merchant.x, tw.merchant.y + 4, 11 * TILE);
    if (level.exitUp) light(level.exitUp.x, level.exitUp.y, 3 * TILE);
    (level.shrines || []).forEach(s => { if (!s.used) light(s.x, s.y, 2.2 * TILE); });
    ctx.drawImage(nightLayer, 0, 0);
    const dusk = level.isCave ? 0 : 1 - Math.abs(dark - 0.5) * 2; // tono naranja en el atardecer y el amanecer
    if (dusk > 0) { ctx.fillStyle = `rgba(255,140,60,${0.12 * dusk})`; ctx.fillRect(0, 0, MAP_W, MAP_H); }
}

// --- CUEVAS (mazmorras opcionales) ---
// Cada piso tiene 2 entradas en el campo. Una cueva es un mapa aparte (90×70, autómata celular) que baja de nivel en
// nivel: −1, −2… hasta −2 en los pisos 1-3, −3 en los 4-7 y −4 en los 8-10. Más hondo: más oscuro, creeps más fuertes,
// más campeones, más experiencia y mejor botín. En el fondo, un jefe cuida un tesoro (2 piezas raras). No hace falta
// entrar para subir la torre. El piloto automático no entra.
const CAVE = { w: 90, h: 70, mouths: 2, packs: 12, packsPerDepth: 3, statPerDepth: 0.12, xpPerDepth: 0.25, lootPerDepth: 0.5, champPerDepth: 0.08, sight: -1.5 };
function caveMaxDepth(floor) { return 2 + Math.floor((floor - 1) / 3.5); }
// Entradas de cueva en el campo de un piso (de preferencia al pie de un acantilado o de una roca)
function placeCaveMouths(level, dist) {
    const W = COLS, H = ROWS, at = (x, y) => y * W + x;
    level.caves = [];
    const nextToRock = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => level.walls[y + dy] && level.walls[y + dy][x + dx] && level.walls[y + dy][x + dx] !== WALL.edge);
    for (let t = 0; t < 8000 && level.caves.length < CAVE.mouths; t++) {
        const x = 3 + Math.floor(Math.random() * (W - 6)), y = 3 + Math.floor(Math.random() * (H - 6)), i = at(x, y);
        if (level.zone[i] !== ZONE.field || level.ground[i] === GROUND.road || level.height[i] || !walkable(level, x, y) || dist[i] < 30) continue;
        if (t < 5000 && !nextToRock(x, y)) continue;
        if (Math.abs(x - level.town.merchant.x) < 16 && Math.abs(y - level.town.merchant.y) < 12) continue;
        if (level.caves.some(c => Math.hypot(c.x - x, c.y - y) < 40) || (level.shrines || []).some(s => s.x === x && s.y === y)) continue;
        level.caves.push({ x, y, max: caveMaxDepth(level.floor), levels: [], surface: level });
    }
}
function caveLevel(cave, depth) {
    if (!cave.levels[depth]) cave.levels[depth] = generateCaveLevel(cave, depth);
    return cave.levels[depth];
}
function generateCaveLevel(cave, depth) {
    const W = CAVE.w, H = CAVE.h, N = W * H, floor = cave.surface.floor, at = (x, y) => y * W + x;
    const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    let rock = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) rock[at(x, y)] = (x < 2 || y < 2 || x > W - 3 || y > H - 3 || Math.random() < 0.45) ? 1 : 0;
    for (let s = 0; s < 5; s++) {
        const next = rock.slice();
        for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
            let n = 0;
            for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if ((ox || oy) && rock[at(x + ox, y + oy)]) n++;
            next[at(x, y)] = n >= 5 ? 1 : n <= 3 ? 0 : rock[at(x, y)];
        }
        rock = next;
    }
    // Se queda con la zona abierta más grande (lo demás se tapa)
    const region = new Int32Array(N).fill(-1), sizes = [];
    for (let i = 0; i < N; i++) {
        if (rock[i] || region[i] >= 0) continue;
        const id = sizes.length, q = [i]; region[i] = id;
        for (let k = 0; k < q.length; k++) { const p = q[k], px = p % W, py = (p - px) / W; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const j = at(px + dx, py + dy); if (!rock[j] && region[j] < 0) { region[j] = id; q.push(j); } }); }
        sizes.push(q.length);
    }
    const best = sizes.indexOf(Math.max(...sizes));
    const walls = Array.from({ length: H }, (_, y) => Uint8Array.from({ length: W }, (_, x) => (rock[at(x, y)] || region[at(x, y)] !== best) ? WALL.rock : 0));
    const level = makeArena('tower', []);
    Object.assign(level, { floor, biome: cave.surface.biome, isCave: true, cave, depth, W, H, walls, deep: new Uint8Array(N), ground: new Uint8Array(N),
        zone: new Uint8Array(N).fill(ZONE.cave), height: null, ramp: null, rooms: [], explored: Array.from({ length: H }, () => new Uint8Array(W)),
        corpses: [], drops: [], shrines: [], town: null, guardian: null, stairs: null });
    // Salida hacia arriba (la casilla abierta más a la izquierda) y, lejos, la bajada o la sala del jefe
    let up = null;
    for (let x = 2; x < W - 2 && !up; x++) for (let y = 2; y < H - 2 && !up; y++) if (!walls[y][x]) up = { x, y };
    level.exitUp = up;
    const prevCols = COLS, prevRows = ROWS; COLS = W; ROWS = H; // bfsFrom usa el tamaño del mundo
    const dist = bfsFrom(level, up.x, up.y);
    let far = up;
    for (let i = 0; i < N; i++) if (dist[i] > dist[at(far.x, far.y)]) far = { x: i % W, y: Math.floor(i / W) };
    level.start = arrivalNear(level, up);
    const pool = towerCreepPool(floor), bonus = 1 + CAVE.statPerDepth * depth;
    const spawn = (x, y, lvl, mult, xpMult, champ) => {
        const type = pickRandom(pool);
        for (let k = 0; k < (type.groupSize || 1); k++) {
            let px = x, py = y;
            for (let t = 0; t < 12; t++) { const ax = x + rint(-2, 2), ay = y + rint(-2, 2); if (walkable(level, ax, ay) && dist[at(ax, ay)] >= 0) { px = ax; py = ay; break; } }
            const c = makeCreep(type, px, py, mult, false, 0);
            Object.assign(c, { arena: level, level: lvl, xp: Math.round(type.xp * TOWER.xpMult(lvl) * xpMult), spawnTime: -1e9 });
            if (champ) makeChampion(c, champ);
            level.creeps.push(c);
        }
    };
    if (depth < cave.max) level.down = far;
    else { // fondo: jefe de la cueva y su tesoro
        const lvl = floor + depth + 1, type = pickRandom(pool);
        const boss = makeCreep(type, far.x, far.y, TOWER.creepMult(lvl) * bonus * 2.4, false, 0);
        Object.assign(boss, { arena: level, level: lvl, xp: Math.round(type.xp * TOWER.xpMult(lvl) * 6), spawnTime: -1e9, isCaveBoss: true });
        makeChampion(boss, shuffle(Object.keys(CHAMPION_AFFIXES)).slice(0, Math.min(3, 1 + Math.floor(depth / 2))));
        boss.label = `${type.label} Ancestral (señor de la cueva)`;
        level.creeps.push(boss); level.caveBoss = boss;
        const spot = arrivalNear(level, far);
        level.chests = [{ x: spot.x, y: spot.y, open: false, guards: [boss], treasure: true }];
    }
    // Grupos (más y más fuertes cuanto más hondo) y cofres custodiados en claros
    const packs = [];
    for (let t = 0; t < 4000 && packs.length < CAVE.packs + CAVE.packsPerDepth * depth; t++) {
        const x = rint(3, W - 4), y = rint(3, H - 4), i = at(x, y);
        if (walls[y][x] || dist[i] < 12 || packs.some(p => Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) < 7)) continue;
        packs.push({ x, y });
        const champ = Math.random() < CHAMPION.baseChance + CHAMPION.perFloor * floor + CAVE.champPerDepth * depth ? shuffle(Object.keys(CHAMPION_AFFIXES)).slice(0, championAffixCount(floor)) : null;
        for (let n = rint(2, 3); n > 0; n--) { const lvl = floor + depth + (Math.random() < 0.3 ? 1 : 0); spawn(x, y, lvl, TOWER.creepMult(lvl) * bonus, 1 + CAVE.xpPerDepth * depth, champ); }
    }
    const spots = [];
    for (let t = 0; t < 3000 && spots.length < 2; t++) {
        const x = rint(3, W - 7), y = rint(3, H - 6);
        let ok = dist[at(x, y)] >= 15;
        for (let oy = 0; oy < 3 && ok; oy++) for (let ox = 0; ox < 4 && ok; ox++) ok = walkable(level, x + ox, y + oy) && dist[at(x + ox, y + oy)] >= 0;
        if (ok) spots.push({ x, y, w: 4, h: 3 });
    }
    const treasure = level.chests || [];
    placeChests(level, spots);
    level.chests = level.chests.concat(treasure);
    COLS = prevCols; ROWS = prevRows;
    return level;
}
// Una casilla libre al lado de (x, y) (para llegar sin quedar parado arriba de una salida)
function arrivalNear(level, p) {
    for (const [dx, dy] of [[1, 0], [0, 1], [0, -1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [0, 2]]) {
        const x = p.x + dx, y = p.y + dy;
        if (y >= 0 && x >= 0 && y < level.walls.length && x < level.walls[0].length && !level.walls[y][x] && !(level.deep && level.deep[y * level.walls[0].length + x])) return { x, y };
    }
    return { x: p.x, y: p.y };
}
// Entrar a un nivel cualquiera (piso o cueva): cambia el tamaño del mundo, la arena y la posición del héroe
function enterTowerLevel(level, pos) {
    COLS = level.W || TOWER.cols; ROWS = level.H || TOWER.rows;
    arenas = [level];
    level.heroes = [player];
    player.arena = level;
    player.x = pos.x; player.y = pos.y; player.rx = player.x; player.ry = player.y;
    player.moveTarget = null; player.focus = null;
    level.creeps.forEach(c => { c.aggro = false; });
    player.towerZone = undefined;
    level.fovKey = null; computeFov(level, player);
}
function enterCave(cave, depth, fromBelow = false) {
    const level = caveLevel(cave, depth);
    enterTowerLevel(level, fromBelow ? arrivalNear(level, level.down) : level.start);
    level.titleAt = gameClock;
    towerRun.stats.deepest = Math.max(towerRun.stats.deepest || 0, depth);
    setStateText(`TOWER CHAOS · PISO ${cave.surface.floor} · CUEVA −${depth} DE −${cave.max}`);
    sfx('wave');
    if (!fromBelow) log(depth === 1 ? `🕳️ Entraste a una cueva (baja hasta −${cave.max}). Más hondo: más oscuro, más difícil y mejor botín; en el fondo, un tesoro.` : `🕳️ Bajaste al nivel −${depth} de la cueva.`);
}
function leaveCave(level) {
    const cave = level.cave;
    if (level.depth > 1) { enterCave(cave, level.depth - 1, true); return; }
    enterTowerLevel(cave.surface, arrivalNear(cave.surface, cave));
    setStateText(`TOWER CHAOS · PISO ${cave.surface.floor} DE ${TOWER.floors} · ${BIOMES[cave.surface.biome].name.toUpperCase()}`);
    log('☀️ Saliste de la cueva.');
}
// Pisar una entrada, una bajada o una salida (al final del frame, ver updateTower)
function towerPortals(level, hero) {
    if (!hero.isAlive() || hero !== player) return false;
    if (level.caves && !autopilot) {
        const cave = level.caves.find(c => c.x === hero.x && c.y === hero.y);
        if (cave) { enterCave(cave, 1); return true; }
    }
    if (!level.isCave) return false;
    if (level.exitUp && hero.x === level.exitUp.x && hero.y === level.exitUp.y) { leaveCave(level); return true; }
    if (level.down && hero.x === level.down.x && hero.y === level.down.y) { enterCave(level.cave, level.depth + 1); return true; }
    return false;
}
// Dibujo: bocas de cueva en el campo; en la cueva, la salida (soga) y la bajada (pozo)
function drawCavePortals(level) {
    const hole = (x, y, deep) => {
        if (!level.explored[y][x]) return;
        const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2;
        ctx.fillStyle = deep ? '#0d0a08' : '#1d1712'; ctx.strokeStyle = INK.line; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, cy + 4, 13, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (!deep) { ctx.fillStyle = INK.stoneDark; ctx.beginPath(); ctx.moveTo(cx - 15, cy + 6); ctx.quadraticCurveTo(cx, cy - 20, cx + 15, cy + 6); ctx.lineTo(cx + 11, cy + 6); ctx.quadraticCurveTo(cx, cy - 12, cx - 11, cy + 6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    };
    (level.caves || []).forEach(c => hole(c.x, c.y, false));
    if (level.down) hole(level.down.x, level.down.y, true);
    if (level.exitUp && level.explored[level.exitUp.y][level.exitUp.x]) {
        const cx = level.exitUp.x * TILE + TILE / 2, cy = level.exitUp.y * TILE + TILE / 2;
        ctx.strokeStyle = '#7a5c3c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 5, cy - 16); ctx.lineTo(cx - 5, cy + 12); ctx.moveTo(cx + 5, cy - 16); ctx.lineTo(cx + 5, cy + 12); ctx.stroke();
        ctx.lineWidth = 2; for (let y = -12; y < 12; y += 6) { ctx.beginPath(); ctx.moveTo(cx - 5, cy + y); ctx.lineTo(cx + 5, cy + y); ctx.stroke(); }
        ctx.fillStyle = 'rgba(255,230,160,0.25)'; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill();
    }
}
// Baldosas de cueva: roca oscura con grietas y piso de tierra, con el color del bioma apagado
const caveTileCache = {};
function caveTiles(key) {
    if (caveTileCache[key]) return caveTileCache[key];
    const C = BIOMES[key].colors;
    let seed = 4711 + key.length; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const tile = draw => { const c = document.createElement('canvas'); c.width = c.height = TILE; draw(c.getContext('2d')); return c; };
    const floorT = v => tile(g => {
        g.fillStyle = shade(C.ground, v ? -0.56 : -0.5); g.fillRect(0, 0, TILE, TILE);
        for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(29,23,18,0.35)'; g.beginPath(); g.arc(rnd() * TILE, rnd() * TILE, 0.8 + rnd() * 1.6, 0, Math.PI * 2); g.fill(); }
    });
    const rockT = (v, face) => tile(g => {
        g.fillStyle = shade(C.obstacle, face ? -0.35 : -0.55); g.fillRect(0, 0, TILE, TILE);
        g.strokeStyle = 'rgba(10,8,6,0.6)'; g.lineWidth = 1.2;
        for (let i = 0; i < 3; i++) { const x = rnd() * TILE, y = rnd() * TILE; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 14, y + 6 + rnd() * 8); g.stroke(); }
        if (face) { g.strokeStyle = INK.line; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, TILE - 2); g.lineTo(TILE, TILE - 2); g.stroke(); inkHatch(g, 0, TILE - 12, TILE, TILE, 3); }
    });
    return (caveTileCache[key] = { floor: [floorT(0), floorT(1)], rock: [rockT(0, false), rockT(1, false)], face: [rockT(0, true), rockT(1, true)] });
}
function caveTileFor(level, x, y) {
    const t = caveTiles(level.biome), h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
    if (!level.walls[y][x]) return t.floor[h & 1];
    return y + 1 < ROWS && !level.walls[y + 1][x] ? t.face[h & 1] : t.rock[h & 1];
}

// --- EL PORTADOR (fase 5: muerte con consecuencias) ---
// Al morir, una criatura del bestiario del piso se lleva 1 pieza de tu equipo (2 desde el piso 5; nunca el arma) y
// deambula por el nivel donde caíste. Con cada pieza tiene más vida y daño. Si la matás, suelta tus piezas. Si morís
// otra vez antes, no se pierde nada: aparece otro portador (cada uno con lo suyo).
const CARRIER = { items: floor => (floor >= 5 ? 2 : 1), hpPerItem: 0.3, atkPerItem: 0.15, statMult: 1.3, roam: 14, xpMult: 3 };
function spawnItemCarrier(level, hero) {
    const slots = EQUIP_SLOTS.filter(s => s !== 'weapon' && hero.gear[s]);
    if (!slots.length) return null;
    const taken = shuffle(slots.slice()).slice(0, CARRIER.items(level.floor)).map(s => unequipSlot(hero, s, false)).filter(Boolean);
    const type = pickRandom(towerCreepPool(level.floor)), n = taken.length;
    const p = arrivalNear(level, { x: hero.x, y: hero.y }), lvl = level.floor + (level.depth || 0) + 1;
    const c = makeCreep(type, p.x, p.y, TOWER.creepMult(lvl) * CARRIER.statMult, false, 0);
    c.hp = c.maxHp = Math.round(c.maxHp * (1 + CARRIER.hpPerItem * n));
    c.atk = Math.round(c.atk * (1 + CARRIER.atkPerItem * n));
    Object.assign(c, { arena: level, level: lvl, xp: Math.round(type.xp * TOWER.xpMult(lvl) * CARRIER.xpMult), spawnTime: -1e9, isCarrier: true, carrier: taken });
    c.label = `${type.label} (portador)`;
    level.creeps.push(c);
    towerRun.carriers = (towerRun.carriers || []).concat(c);
    return c;
}
// Sin agro, el portador no vuelve a un lugar fijo: elige otro punto cercano y camina hasta ahí
function carrierRoam(c) {
    if (c.aggro || c.x !== c.spawnX || c.y !== c.spawnY || gameClock < (c.roamAt || 0)) return;
    c.roamAt = gameClock + 2 + Math.random() * 3;
    for (let t = 0; t < 20; t++) {
        const x = c.x + Math.round((Math.random() - 0.5) * 2 * CARRIER.roam), y = c.y + Math.round((Math.random() - 0.5) * 2 * CARRIER.roam);
        if (walkable(c.arena, x, y) && towerZoneAt(c.arena, x, y) !== ZONE.town) { c.spawnX = x; c.spawnY = y; return; }
    }
}
// Al morir suelta lo que llevaba
function carrierDrops(level, c) {
    if (!c.carrier) return;
    c.carrier.forEach(item => level.drops.push({ x: c.x, y: c.y, item }));
    towerRun.carriers = (towerRun.carriers || []).filter(o => o !== c);
    if (fxArena(c)) { fxRing(c, '#c9a227', 2, 0.8); fxText(c, '¡Tu equipo!', '#c9a227', 13, 1.6); }
    log(`🎒 ¡Cazaste al portador! Soltó ${c.carrier.map(i => i.name).join(' y ')}.`); sfx('levelup');
    c.carrier = null;
}
function carriersOn(level) { return (towerRun && towerRun.carriers || []).filter(c => c.isAlive() && c.arena === level); }
