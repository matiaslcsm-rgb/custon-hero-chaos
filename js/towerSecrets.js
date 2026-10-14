// Infinite Tower: paredes agrietadas y salas secretas (docs/TORRE-MUNDO.md, sistema 4; 2026-10-14).
//
//   Del piso 2 en adelante (adentro de la torre) hay cámaras de piedra selladas en el campo: una sala chica sin puerta,
//   con un tramo de pared agrietado. Las grietas se ven si mirás bien (líneas finas sobre la piedra). Se rompen a golpes
//   (tajos de la espada, flechas, orbes: cualquier ataque tuyo que la toque) y adentro hay un cofre con un tesoro.
//   En el laberinto (todos los pisos, también el 1) hay además una sala escondida en la piedra maciza, con la grieta
//   hacia un pasillo. Después: salas con una página o el camino al jefe escondido.

const SECRET = { perFloor: 2, inner: [5, 4], hp: 3, minDist: 30 };

// Busca lugar para las cámaras: un rectángulo libre de campo (con margen), lejos de la entrada y del pueblo
function placeSecretRooms(level, dist) {
    level.cracks = [];
    if (level.floor < 2) return placeLabSecret(level, dist); // el piso 1 es afuera: solo la del laberinto
    for (let made = 0; made < SECRET.perFloor; made++) {
        const p = findFieldRect(level, dist, SECRET.inner);
        if (!p) break;
        buildChamber(level, p.x, p.y, p.side);
    }
    // La Página de Arén del piso va adentro de la cámara más lejana (en vez del rincón apartado: towerLore.js)
    const far = level.chests.filter(c => c.secret).sort((a, b) => dist[b.y * COLS + b.x] - dist[a.y * COLS + a.x])[0]; // (dist es de antes de levantar los muros)
    if (level.arenPage && far) Object.assign(level.arenPage, { x: far.x - 1, y: far.y });
    placeLabSecret(level, dist);
}
// Un lugar libre de campo para una cámara de `inner` por dentro (con margen), lejos de la entrada, del pueblo y de las otras.
// trees: puede pisar árboles y rocas del bioma (se despejan); la casilla de afuera de la grieta tiene que ser alcanzable.
function findFieldRect(level, dist, inner, trees = false) {
    const at = (x, y) => y * COLS + x, ow = inner[0] + 2, oh = inner[1] + 2;
    const taken = (level.shrines || []).concat(level.caves || [], level.events || [], level.chests || [], level.creeps, level.arenPage ? [level.arenPage] : []);
    const town = level.town && level.town.merchant;
    for (let t = 0; t < 3000; t++) {
        const x0 = 3 + Math.floor(Math.random() * (COLS - ow - 6)), y0 = 3 + Math.floor(Math.random() * (ROWS - oh - 6));
        if (town && Math.abs(x0 - town.x) < 24 && Math.abs(y0 - town.y) < 18) continue;
        if (level.cracks.some(c => Math.hypot(c.x - x0, c.y - y0) < 40)) continue;
        let ok = true;
        for (let y = y0 - 1; y <= y0 + oh && ok; y++) for (let x = x0 - 1; x <= x0 + ow && ok; x++) {
            const i = at(x, y);
            const free = walkable(level, x, y) && dist[i] >= SECRET.minDist, tree = trees && level.walls[y][x] === WALL.obstacle && !(level.deep && level.deep[i]);
            ok = level.zone[i] === ZONE.field && (free || tree) && level.ground[i] !== GROUND.road && !(level.height && level.height[i]) && !(level.ramp && level.ramp[i]);
        }
        if (!ok || taken.some(s => s.x >= x0 - 2 && s.x <= x0 + ow + 1 && s.y >= y0 - 2 && s.y <= y0 + oh + 1)) continue;
        const sides = chamberSides(x0, y0, inner).filter(s => dist[s.oy * COLS + s.ox] >= SECRET.minDist);
        if (!sides.length) continue;
        if (trees) for (let y = y0 - 1; y <= y0 + oh; y++) for (let x = x0 - 1; x <= x0 + ow; x++) if (level.walls[y][x] === WALL.obstacle) level.walls[y][x] = 0; // despeja el margen
        return { x: x0, y: y0, side: sides[Math.floor(Math.random() * sides.length)] };
    }
    return null;
}
// Los 4 lugares posibles de la grieta (el medio de cada lado) y la casilla de afuera que le corresponde
function chamberSides(x0, y0, inner = SECRET.inner) {
    const ow = inner[0] + 2, oh = inner[1] + 2, mx = x0 + (ow >> 1), my = y0 + (oh >> 1);
    return [{ x: mx, y: y0, ox: mx, oy: y0 - 1 }, { x: mx, y: y0 + oh - 1, ox: mx, oy: y0 + oh }, { x: x0, y: my, ox: x0 - 1, oy: my }, { x: x0 + ow - 1, y: my, ox: x0 + ow, oy: my }];
}
// Levanta la cámara (pared de piedra, adentro vacío), pone la grieta y el cofre (sin cofre: la sala de un jefe)
function buildChamber(level, x0, y0, side, inner = SECRET.inner, chest = true) {
    const [iw, ih] = inner, ow = iw + 2, oh = ih + 2;
    for (let y = y0; y < y0 + oh; y++) for (let x = x0; x < x0 + ow; x++)
        level.walls[y][x] = (x === x0 || y === y0 || x === x0 + ow - 1 || y === y0 + oh - 1) ? WALL.stone : 0;
    const crack = { x: side.x, y: side.y, hp: SECRET.hp };
    level.cracks.push(crack);
    if (chest) level.chests.push({ x: x0 + 1 + (iw >> 1), y: y0 + 1 + (ih >> 1), open: false, guards: [], secret: true });
    return crack;
}
// En el laberinto (todos los pisos): una sala escondida en la piedra maciza, con la grieta hacia un pasillo o una sala
function placeLabSecret(level, dist) {
    const lab = level.lab;
    if (!lab) return;
    const ow = SECRET.inner[0] + 2, oh = SECRET.inner[1] + 2, solid = (x, y) => level.walls[y][x] === WALL.stone && level.zone[y * COLS + x] === ZONE.lab;
    for (let t = 0; t < 4000; t++) {
        const x0 = lab.x + 1 + Math.floor(Math.random() * (lab.w - ow - 2)), y0 = lab.y + 1 + Math.floor(Math.random() * (lab.h - oh - 2));
        let ok = true;
        for (let y = y0; y < y0 + oh && ok; y++) for (let x = x0; x < x0 + ow && ok; x++) ok = solid(x, y);
        if (!ok) continue;
        const sides = chamberSides(x0, y0).filter(s => walkable(level, s.ox, s.oy) && dist[s.oy * COLS + s.ox] >= 0 && level.zone[s.oy * COLS + s.ox] === ZONE.lab);
        if (!sides.length) continue;
        buildChamber(level, x0, y0, sides[Math.floor(Math.random() * sides.length)]);
        return;
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

// --- JEFES ESCONDIDOS (TORRE-MUNDO.md, uno por piso) ---
// Opcionales, más difíciles que un señor de cueva, con su entrada propia en el Bestiario y una pieza única.
// · El Ciervo Blanco (piso 1) pasta solo de NOCHE en un claro apartado del bosque; al amanecer, si no lo despertaste, se va.
// · La Flor Carnívora (piso 2) está encerrada en el invernadero tapiado: una sala grande sellada con una pared agrietada.
// · El Leviatán del Fango (piso 3), igual, en la sala de bombas de las cisternas; la Semilla Primera (piso 4), en el
//   hueco de la raíz; el Guardián de Arena (piso 5), en la sala del reloj detenido.
const HIDDEN_BOSSES = {
    1: { label: 'Ciervo Blanco', role: 'skirmisher', body: 'wolf', color: '#eee6d2', parts: ['horns', 'eyes'], scale: 1.35, mult: 2.6, hp: 3.8, lvl: 3, night: true, // hp: vida extra (más que un señor de cueva sin pegar de un golpe)
        mechanic: 'Jefe escondido del piso 1: pasta de noche en un claro apartado del bosque y se va al amanecer. Rápido y escurridizo.',
        hint: '🦌 Brena dice que algunas noches un ciervo blanco pasta en un claro, lejos del camino. Nadie lo pudo alcanzar.',
        icon: '🦌', unique: { slot: 'helm', name: 'Astas del Ciervo Blanco', extra: ['moveSpeedPct', 'maxHp'] } },
    2: { label: 'Flor Carnívora', role: 'archer', body: 'toad', color: '#b5179e', parts: ['spikes', 'eyes'], scale: 1.5, mult: 2.4, hp: 3.6, lvl: 3, sealed: [11, 8], rooted: true,
        mechanic: 'Jefe escondido del piso 2: echó raíces en el invernadero tapiado. No se mueve; escupe espinas a distancia.',
        hint: '🌺 Hermano Musgo: «Tapiamos el invernadero viejo. Si escuchás algo que mastica detrás de una pared rajada, no la rompas.»',
        icon: '🌺', unique: { slot: 'gloves', name: 'Guantes de la Flor Carnívora', extra: ['lifesteal', 'hpRegen'] } },
    3: { label: 'Leviatán del Fango', role: 'bruiser', body: 'lizard', color: '#4a5d23', parts: ['spikes', 'eyes'], scale: 1.6, mult: 2, hp: 1.7, lvl: 3, sealed: [11, 8], // el bruto ya trae mucha vida de base
        mechanic: 'Jefe escondido del piso 3: quedó encerrado en la sala de bombas cuando se cerraron las compuertas. Pega muy fuerte.',
        hint: '🛶 Madre Junco: «La sala de bombas quedó cerrada con algo adentro. Los botes que se acercan a la pared rajada no vuelven.»',
        icon: '🐊', unique: { slot: 'armor', name: 'Coraza del Leviatán', extra: ['armor', 'hpRegen'] } },
    4: { label: 'Semilla Primera', role: 'hexer', body: 'golem', color: '#6a994e', parts: ['spikes', 'spots'], scale: 1.5, mult: 2.2, hp: 3, lvl: 3, sealed: [11, 8], rooted: true,
        mechanic: 'Jefe escondido del piso 4: la semilla de la que nació la raíz gigante, en el hueco de la raíz. No se mueve; maldice a distancia.',
        hint: '🌱 El viejo Tallo: «En el hueco de la raíz hay una semilla que late. Arén la tocó y se le secó la mano.»',
        icon: '🌱', unique: { slot: 'amulet', name: 'Semilla Primera', extra: ['hpRegen', 'maxHp'] } },
    5: { label: 'Guardián de Arena', role: 'tank', body: 'golem', color: '#d4a373', parts: ['horns', 'eyes'], scale: 1.6, mult: 2.2, hp: 0.85, lvl: 3, sealed: [11, 8], // el blindado ya trae mucha vida y armadura
        mechanic: 'Jefe escondido del piso 5: cuida el único reloj que no se rompió, en una sala tapiada. Muy resistente.',
        hint: '⏳ El Contador: «Hay un reloj que no cae. Lo tapiamos con su guardián adentro. Si lo despertás, que sea con tiempo.»',
        icon: '⏳', unique: { slot: 'weapon', name: 'Aguja del Reloj Detenido', extra: ['atkSpeedPct', 'moveSpeedPct'] } } // (no hay botas en el catálogo)
};
// Un claro abierto (7×7 sin muros) lo más lejos posible de la entrada y de la página
function placeHiddenBoss(level, dist) {
    const H = HIDDEN_BOSSES[level.floor];
    level.hiddenBoss = null;
    if (!H) return;
    if (H.sealed) { // la sala sellada: una cámara grande sin cofre, con su grieta; el jefe espera en el medio
        const p = findFieldRect(level, dist, H.sealed, true);
        if (!p) return;
        buildChamber(level, p.x, p.y, p.side, H.sealed, false);
        level.hiddenBoss = { x: p.x + 1 + (H.sealed[0] >> 1), y: p.y + 1 + (H.sealed[1] >> 1), floor: level.floor, unit: null, dead: false };
        return;
    }
    let best = null, bestD = -1;
    for (let t = 0; t < 6000; t++) {
        const x = 5 + Math.floor(Math.random() * (COLS - 10)), y = 5 + Math.floor(Math.random() * (ROWS - 10)), i = y * COLS + x;
        if (level.zone[i] !== ZONE.field || dist[i] <= bestD || level.ground[i] === GROUND.road) continue;
        let open = true;
        for (let dy = -3; dy <= 3 && open; dy++) for (let dx = -3; dx <= 3 && open; dx++) open = walkable(level, x + dx, y + dy) && level.zone[(y + dy) * COLS + x + dx] === ZONE.field;
        if (!open || (level.arenPage && Math.hypot(level.arenPage.x - x, level.arenPage.y - y) < 20)) continue;
        best = { x, y }; bestD = dist[i];
    }
    if (best) level.hiddenBoss = Object.assign(best, { floor: level.floor, unit: null, dead: false });
}
// Sale del generador de criaturas (cuerpo, dibujo, IA), pero con tamaño fijo y sin rasgos sorteados
function hiddenBossType(H, biome) {
    const t = generateBeast(biome, H.role, 1), base = CREEP_TYPES[BEAST_ROLES[H.role].base];
    return Object.assign(t, { hp: base.hp, atk: base.atk, armor: base.armor || 0, magicResist: base.magicResist || 0, atkSpeed: base.atkSpeed, moveInterval: base.moveInterval,
        thorns: 0, onAttack: base.onAttack, label: H.label, color: H.color, plan: H.body, parts: H.parts, scale: H.scale, traits: [], trait: null, mechanic: H.mechanic,
        genome: Object.assign({}, t.genome, { body: H.body, size: 'normal', hidden: true }) });
}
// Cada cuadro del piso: aparece de noche (con un aviso la primera vez) y se va de día si nadie lo despertó
function hiddenBossTick(level) {
    const hb = level.hiddenBoss, H = hb && HIDDEN_BOSSES[hb.floor];
    if (!H || hb.dead) return;
    const u = hb.unit, out = !H.night || towerIsNight();
    if (u && !u.isAlive()) { hb.dead = true; hb.unit = null; return; }
    if (out && !u) {
        const type = hiddenBossType(H, level.biome), lvl = level.floor + H.lvl;
        const c = makeCreep(type, hb.x, hb.y, TOWER.creepMult(lvl) * H.mult, false, 0);
        c.hp = c.maxHp = Math.round(c.maxHp * H.hp);
        if (H.rooted) c.moveInterval = 1e9; // echó raíces: no camina
        Object.assign(c, { arena: level, level: lvl, xp: Math.round(type.xp * TOWER.xpMult(lvl) * 8), spawnTime: -1e9, isCaveBoss: true, isHiddenBoss: true, hiddenFloor: level.floor });
        level.creeps.push(c); hb.unit = c;
        if (!hb.hinted) { hb.hinted = true; log(H.hint); }
    } else if (!out && u && !u.aggro) { level.creeps = level.creeps.filter(o => o !== u); hb.unit = null; } // amanece: se va
}
// La pieza única que suelta (una rara de su ranura, con nombre propio y un afijo extra)
function hiddenBossLoot(level, c) {
    const U = HIDDEN_BOSSES[c.hiddenFloor].unique, floor = level.floor + 2;
    const item = makeTowerItem(floor, pickRandom(towerCatalog().filter(e => e.slot === U.slot)), 'rare');
    U.extra.forEach(k => { const a = AFFIXES.find(x => x.key === k); if (a && !item.affixes.some(x => x.key === k)) item.affixes.push({ key: a.key, name: a.name, value: round1(a.roll(floor)) }); });
    Object.assign(item, { name: U.name, unique: true });
    level.drops.push({ x: c.x, y: c.y, item });
    log(`${HIDDEN_BOSSES[c.hiddenFloor].icon} ${c.type.label} cae. Deja algo que nadie había visto: ${U.name}.`);
}
