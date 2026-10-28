// MATCH 3D (2026-10-28, decisión del usuario: "pasemos Custom Hero a 3D y fusionémoslo con MATCH", todo opción A):
//   · El juego es el mismo: reglas, IA, tienda, draft y pruebas no se tocan. Esto es solo otra forma de DIBUJAR las arenas
//     de combate (oleada, duelo y jefe): lee el mismo estado (arena.heroes, arena.creeps, arena.projectiles) y lo muestra
//     en 3D. La interfaz (tienda, ranking, barra del héroe) sigue igual, encima.
//   · Cámara desde arriba en diagonal, como Dota; se juega igual que siempre (clic derecho caminar, clic izquierdo
//     objetivo, habilidades hacia el cursor): el mouse se traduce a casillas tirando un rayo contra el piso.
//   · Competidores y creeps son robots armados por piezas con el motor de arena-robots (robot.js, parts.js,
//     skeleton.js, ps1.js), con el look de PS1 y la estética industrial de MATCH.
//   · Las barras de vida y los números de daño se dibujan en el canvas 2D de siempre, que queda transparente encima.
//   El descanso, el menú y la Torre siguen en 2D. Se apaga en la pausa (🧊 Vista 3D).
// Expone window.M3D para el código clásico (ui.js, mouse.js, fxSkills.js).
import * as THREE from 'three';
import { buildRobot, animateRobot } from './robot.js';
import { RES, setRes, makeRenderer, floorTex, wallTex, mat, ps1Material } from './ps1.js';

const U = 1;                  // una casilla = 1 metro
const PIXEL = 2;              // cada píxel del 3D ocupa 2 píxeles de la pantalla (look PS1, pero legible desde arriba)
const COLS = 20, ROWS = 12;   // = VIEW_COLS, VIEW_ROWS (game.js)

// --- QUÉ ROBOT ES CADA UNO ---
// Competidores: piernas, núcleo, cabeza y los dos brazos según su forma de pelear. Rec (el Sniper de hoy, a reemplazar)
// ya va con su cabeza de cámara y las ruedas.
const HERO_BUILDS = {
    AXE: { legs: 'oruga', core: 'pesado', head: 'domo', armL: 'pinza', armR: 'pinza' },
    VAMPIRE: { legs: 'bipedo', core: 'pesado', head: 'sensor', armL: 'pinza', armR: 'pinza' },
    SNIPER: { legs: 'ruedas', core: 'liviano', head: 'camara', armL: 'pinza', armR: 'canon' },
    ASSASSIN: { legs: 'bipedo', core: 'liviano', head: 'domo', armL: 'pinza', armR: 'ametralladora' },
    DANCER: { legs: 'ruedas', core: 'liviano', head: 'sensor', armL: 'pinza', armR: 'pinza' },
    ARCANIST: { legs: 'bipedo', core: 'estandar', head: 'camara', armL: 'canon', armR: 'canon' },
    FROSTWITCH: { legs: 'ruedas', core: 'estandar', head: 'domo', armL: 'ametralladora', armR: 'ametralladora' },
    NECROMANCER: { legs: 'oruga', core: 'liviano', head: 'camara', armL: 'canon', armR: 'pinza' },
    VOIDSAGE: { legs: 'ruedas', core: 'pesado', head: 'sensor', armL: 'canon', armR: 'ametralladora' },
    ALCHEMIST: { legs: 'oruga', core: 'estandar', head: 'sensor', armL: 'ametralladora', armR: 'pinza' },
    ZEUS: { legs: 'bipedo', core: 'pesado', head: 'camara', armL: 'canon', armR: 'ametralladora' }
};
// Creeps: por su forma de pelear (la misma que usa la Torre para elegir figura)
const CREEP_BUILDS = {
    footman: { legs: 'bipedo', core: 'liviano', head: 'sensor', armL: 'pinza', armR: 'pinza' },
    archer: { legs: 'bipedo', core: 'liviano', head: 'sensor', armL: 'pinza', armR: 'ametralladora' },
    mage: { legs: 'ruedas', core: 'liviano', head: 'domo', armL: 'pinza', armR: 'canon' },
    brute: { legs: 'oruga', core: 'pesado', head: 'domo', armL: 'pinza', armR: 'pinza' },
    golem: { legs: 'oruga', core: 'pesado', head: 'sensor', armL: 'canon', armR: 'canon' },
    wraith: { legs: 'ruedas', core: 'liviano', head: 'domo', armL: 'pinza', armR: 'pinza' },
    plague: { legs: 'ruedas', core: 'estandar', head: 'camara', armL: 'pinza', armR: 'pinza' },
    swarm: { legs: 'ruedas', core: 'liviano', head: 'sensor', armL: 'ametralladora', armR: 'ametralladora' },
    kamikaze: { legs: 'ruedas', core: 'liviano', head: 'sensor', armL: 'pinza', armR: 'pinza' },
    chusma: { legs: 'bipedo', core: 'liviano', head: 'sensor', armL: 'pinza', armR: 'pinza' }
};
const BOSS_BUILD = { legs: 'oruga', core: 'pesado', head: 'domo', armL: 'canon', armR: 'canon' };
// Altura (en casillas) de cada uno
const sizeOf = u => u.isRoundBoss ? 3.4 : u.isBoss ? 2.6 : u.isHero ? 2.2 : u.type && u.type.key === 'SWARM' ? 1.1 : u.type && ['BRUTE', 'ARMORED', 'STUNNER'].includes(u.type.key) ? 2.0 : 1.6;

// --- PINTURA: cada robot con el color de su competidor o de su tipo de creep ---
const PAINT = ['gris', 'oliva', 'hueso'];
const tinted = {};
function paintRobot(robot, color) {
    robot.traverse(o => {
        if (!o.isMesh) return;
        const name = Object.keys(MAT_NAMES).find(n => MAT_NAMES[n] === o.material);
        if (!PAINT.includes(name)) return;
        const key = name + color;
        if (!tinted[key]) { const m = o.material.clone(); m.color.set(color); tinted[key] = ps1Material(m); }
        o.material = tinted[key];
    });
}
const MAT_NAMES = Object.fromEntries(PAINT.map(n => [n, mat(n)]));
const lighten = (hex, k) => { const c = new THREE.Color(hex); c.lerp(new THREE.Color('#ffffff'), k); return '#' + c.getHexString(); };

// --- ESCENA ---
const wrap = document.getElementById('map-wrap'), canvas2d = document.getElementById('ascii-canvas');
const cv = document.createElement('canvas');
cv.id = 'match3d-canvas';
cv.style.cssText = 'position:absolute;left:0;top:0;z-index:0;pointer-events:none;image-rendering:pixelated;display:none;';
wrap.insertBefore(cv, canvas2d);
canvas2d.style.position = 'relative'; canvas2d.style.zIndex = '1'; // el 2D (barras, números, mouse) queda encima del 3D
const renderer = makeRenderer(cv);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#0c0d10', 26, 48);
const camera = new THREE.PerspectiveCamera(36, COLS / ROWS, 0.5, 120);
const hemi = new THREE.HemisphereLight('#dfe6f2', '#4a443a', 2.8);
const sun = new THREE.DirectionalLight('#fff1d6', 3.2); sun.position.set(-8, 20, 12);
scene.add(hemi, sun);

// Arena: piso de hormigón, la franja de afuera más oscura, vallas con franjas de peligro y 4 torres de luz del show
const arenaGroup = new THREE.Group(); scene.add(arenaGroup);
{
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(COLS, ROWS), ps1Material(new THREE.MeshLambertMaterial({ map: floorTex(1) })));
    floor.material.map.repeat.set(COLS / 2, ROWS / 2);
    floor.rotation.x = -Math.PI / 2; floor.position.set(COLS / 2, 0, ROWS / 2); arenaGroup.add(floor);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(COLS + 30, ROWS + 30), new THREE.MeshLambertMaterial({ color: '#2a2b2e' }));
    outer.rotation.x = -Math.PI / 2; outer.position.set(COLS / 2, -0.02, ROWS / 2); arenaGroup.add(outer);
    const fence = mat('peligro'), wall = ps1Material(new THREE.MeshLambertMaterial({ map: wallTex() }));
    const seg = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), fence); m.position.set(x, 0.175, z); arenaGroup.add(m); };
    seg(COLS / 2, -0.15, COLS + 0.6, 0.3); seg(COLS / 2, ROWS + 0.15, COLS + 0.6, 0.3); seg(-0.15, ROWS / 2, 0.3, ROWS); seg(COLS + 0.15, ROWS / 2, 0.3, ROWS);
    for (const [x, z] of [[-1.2, -1.2], [COLS + 1.2, -1.2], [-1.2, ROWS + 1.2], [COLS + 1.2, ROWS + 1.2]]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 0.5), wall); post.position.set(x, 3, z); arenaGroup.add(post);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.6), new THREE.MeshBasicMaterial({ color: '#fff4c8' }));
        lamp.position.set(x, 6.1, z); lamp.lookAt(COLS / 2, 0, ROWS / 2); arenaGroup.add(lamp);
        const spot = new THREE.PointLight('#ffe9b8', 18, 26, 1.6); spot.position.set(x, 5.8, z); arenaGroup.add(spot);
    }
    // "EN VIVO": la luz roja de grabación arriba de la valla del fondo
    const rec = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff2a2a' }));
    rec.position.set(COLS / 2, 0.75, -0.25); rec.name = 'rec'; arenaGroup.add(rec);
}
// Marca en el piso: el aro de los competidores (celeste vos, naranja los rivales) y el aro de rango del jugador
function ringMesh(r0, r1, color, opacity) {
    const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.03; return m;
}
const rangeRing = ringMesh(0.97, 1, '#e8b4a0', 0.55); scene.add(rangeRing); // (la cruz de a dónde caminás va con los efectos del piso)

// Cámara: arriba y atrás, mirando el centro de la arena con unos 55° de inclinación (como Dota)
function placeCamera(aspect) {
    camera.aspect = aspect;
    const pitch = 55 * Math.PI / 180, dist = 18.8 + Math.max(0, 1.75 - aspect) * 8;
    camera.position.set(COLS / 2, Math.sin(pitch) * dist, ROWS / 2 + Math.cos(pitch) * dist + 1.2);
    camera.lookAt(COLS / 2, 0, ROWS / 2 + 0.9);
    camera.updateProjectionMatrix();
}

// --- LAS UNIDADES ---
const units = new Map(); // unidad del juego → { robot, scale, yaw, last }
function buildFor(u) {
    if (u.isHero) return HERO_BUILDS[u.key] || HERO_BUILDS.AXE;
    if (u.isRoundBoss || u.isBoss) return BOSS_BUILD;
    const plan = typeof inkPlanFor === 'function' ? inkPlanFor(u) : 'footman';
    return CREEP_BUILDS[plan] || CREEP_BUILDS.footman;
}
const heroPaint = u => {
    const attr = u.isHero && typeof HERO_TEMPLATES !== 'undefined' && HERO_TEMPLATES[u.key] ? ATTR_INFO[HERO_TEMPLATES[u.key].primaryAttr].color : null;
    return attr ? lighten(attr, 0.25) : lighten(u.color || '#9aa0a6', 0.15);
};
function unitObj(u) {
    let o = units.get(u);
    if (o) return o;
    const robot = buildRobot(buildFor(u));
    paintRobot(robot, heroPaint(u));
    const box = new THREE.Box3().setFromObject(robot), h = Math.max(0.1, box.max.y - box.min.y);
    const scale = sizeOf(u) / h;
    robot.scale.setScalar(scale);
    const g = new THREE.Group(); g.add(robot);
    if (u.isHero) { const ring = ringMesh(0.36, 0.46, u === (typeof player !== 'undefined' ? player : null) ? '#00f5d4' : '#ffb703', 0.9); g.add(ring); g.userData.ring = ring; }
    scene.add(g);
    o = { g, robot, scale, yaw: u.isHero ? 0 : Math.PI, last: null, seen: 0 };
    units.set(u, o);
    return o;
}

// Proyectiles: esferitas que brillan, del color de quien dispara
const shots = [];
const shotGeo = new THREE.SphereGeometry(0.12, 8, 6);
function shotMesh(i, color, big) {
    if (!shots[i]) { shots[i] = new THREE.Mesh(shotGeo, new THREE.MeshBasicMaterial({ color })); scene.add(shots[i]); }
    shots[i].material.color.set(color); shots[i].scale.setScalar(big ? 1.6 : 1); shots[i].visible = true;
    return shots[i];
}

// --- EFECTOS DE HABILIDADES (2026-10-28) ---
// Lo que pasa en el PISO (tajos, áreas, aros, zonas, auras, la mira y el área de la habilidad que estás apuntando, el
// aura del jefe) se dibuja con el mismo código 2D de siempre (fx.js, fxSkills.js, mouse.js) en un canvas aparte que
// se apoya sobre el piso 3D como una calcomanía: así cada efecto nuevo del 2D aparece solo en el 3D. Lo que va en el
// AIRE es 3D de verdad: rayos que caen del cielo, rayos en cadena, disparos trazadores, meteoros, chispas y burbujas.
const AIR = new Set(['text', 'particle', 'skybolt', 'zigzag', 'tracer', 'streak', 'bolt', 'bubble', 'corpse']); // corpse: en 3D el robot se cae (ver frame)
const decalCv = document.createElement('canvas');
decalCv.width = MAP_W; decalCv.height = MAP_H;
const dctx = decalCv.getContext('2d');
const decalTex = new THREE.CanvasTexture(decalCv); decalTex.colorSpace = THREE.SRGBColorSpace;
const decal = new THREE.Mesh(new THREE.PlaneGeometry(COLS, ROWS), new THREE.MeshBasicMaterial({ map: decalTex, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
decal.rotation.x = -Math.PI / 2; decal.position.set(COLS / 2, 0.025, ROWS / 2); decal.renderOrder = 1; scene.add(decal);
function drawDecal(arena) {
    withCtx(dctx, () => {
        dctx.setTransform(1, 0, 0, 1, 0, 0); dctx.clearRect(0, 0, MAP_W, MAP_H);
        dctx.textAlign = 'center'; dctx.textBaseline = 'middle';
        if (arena.boss && arena.boss.isAlive()) { // el aura del jefe
            const b = arena.boss;
            dctx.strokeStyle = 'rgba(255,0,85,0.55)'; dctx.lineWidth = 2;
            dctx.beginPath(); dctx.arc((b.rx ?? b.x) * TILE + TILE / 2, (b.ry ?? b.y) * TILE + TILE / 2, b.auraRadius * TILE, 0, Math.PI * 2); dctx.stroke();
        }
        const all = arena.fx || [], pass = fxTextPass;
        arena.fx = all.filter(f => !AIR.has(f.kind)); fxTextPass = 'skip'; // sin textos ni el cartel de la definitiva (van encima, en ui.js)
        try { drawArenaFx(arena); } finally { arena.fx = all; fxTextPass = pass; }
        drawMouseOverlay(arena, true);
    });
    decalTex.needsUpdate = true;
}
// Colores (los efectos usan hex y a veces rgba: el alfa se ignora)
const colors = new Map();
const col = c => { let v = colors.get(c); if (!v) { v = new THREE.Color(); try { v.setStyle(String(c)); } catch (e) { v.set('#ffffff'); } colors.set(c, v); } return v; };
// Haces de luz: cajas finas estiradas entre dos puntos, que suman luz (brillan sobre lo oscuro)
const beamGeo = new THREE.BoxGeometry(1, 1, 1); beamGeo.translate(0, 0, 0.5);
const beams = []; let nBeam = 0;
const glowMat = () => new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
function beam(a, b, w, color, op = 1) {
    const len = a.distanceTo(b); if (len < 1e-3 || w <= 0) return;
    let m = beams[nBeam]; if (!m) { m = beams[nBeam] = new THREE.Mesh(beamGeo, glowMat()); scene.add(m); }
    nBeam++;
    m.material.color.copy(col(color)); m.material.opacity = op; m.visible = true;
    m.position.copy(a); m.lookAt(b); m.scale.set(w, w, len);
}
// Rayo quebrado de a hacia b (se vuelve a quebrar cada cuadro: titila)
const jit3 = new THREE.Vector3();
function jagged(a, b, jit, w, outer, inner, op) {
    const seg = 7; let prev = a.clone();
    for (let i = 1; i <= seg; i++) {
        const p = a.clone().lerp(b, i / seg);
        if (i < seg) p.add(jit3.set((Math.random() - 0.5) * jit, (Math.random() - 0.5) * jit, (Math.random() - 0.5) * jit));
        beam(prev, p, w, outer, op * 0.7); beam(prev, p, w * 0.4, inner, op); prev = p;
    }
}
// Esferas que brillan: cabeza del meteoro, destellos, burbujas de escudo
const orbGeo = new THREE.SphereGeometry(1, 12, 8);
const orbs = []; let nOrb = 0;
function orb(p, r, color, op = 1) {
    let m = orbs[nOrb]; if (!m) { m = orbs[nOrb] = new THREE.Mesh(orbGeo, glowMat()); scene.add(m); }
    nOrb++;
    m.material.color.copy(col(color)); m.material.opacity = op; m.visible = true; m.position.copy(p); m.scale.setScalar(r);
}
// Chispas: puntos que suman luz y se apagan (el color va hacia negro = transparente)
const PMAX = 600, pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3), pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const sparks = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
sparks.frustumCulled = false; scene.add(sparks);
// El destello de los rayos que caen: una luz que ilumina a los robots de alrededor
const flash = new THREE.PointLight('#fffbe0', 0, 7, 1.5); scene.add(flash);
const W = (x, y, h) => new THREE.Vector3((x + 0.5) * U, h * U, (y + 0.5) * U);
const CHEST = 0.9;
function drawAirFx(arena) {
    nBeam = 0; nOrb = 0;
    let np = 0, flashK = 0;
    const lightAt = (k, x, y, color) => { if (k > flashK) { flashK = k; flash.position.copy(W(x, y, 1.4)); flash.color.copy(col(color)); } };
    for (const f of arena.fx || []) {
        const t = (fxClock - f.born) / f.life;
        if (t < 0 || t > 1 || !AIR.has(f.kind)) continue;
        const fade = Math.max(0, 1 - t * t);
        if (f.kind === 'particle') {
            if (np >= PMAX) continue;
            const h = f.style === 'drop' ? 1.1 - t : ['smoke', 'ember', 'rune', 'bubble'].includes(f.style) ? 0.4 + t * 1.1 : 0.5 + Math.sin(t * Math.PI) * 0.6;
            pPos[np * 3] = (f.x + 0.5) * U; pPos[np * 3 + 1] = Math.max(0.05, h); pPos[np * 3 + 2] = (f.y + 0.5) * U;
            const c = col(f.color); pCol[np * 3] = c.r * fade; pCol[np * 3 + 1] = c.g * fade; pCol[np * 3 + 2] = c.b * fade; np++;
        } else if (f.kind === 'tracer') {
            const a = W(f.x, f.y, CHEST), b = W(f.tx, f.ty, CHEST), w = (f.wide ? 0.2 : 0.11) * (1 - t);
            beam(a, b, w, f.color2, 0.8); beam(a, b, w * 0.4, f.color, 1);
        } else if (f.kind === 'zigzag') {
            jagged(W(f.x, f.y, CHEST), W(f.tx, f.ty, CHEST), 0.45, 0.13, f.color2, f.color, fade);
        } else if (f.kind === 'skybolt') {
            jagged(W(f.x + (Math.random() - 0.5) * 0.3, f.y, 9), W(f.x, f.y, 0), 0.7, 0.16, f.color2, f.color, fade);
            if (t < 0.3) { orb(W(f.x, f.y, 0.1), 0.8 * (1 - t / 0.3), '#ffffff', 0.5); lightAt(1 - t / 0.3, f.x, f.y, f.color); }
        } else if (f.kind === 'streak') { // meteoro: baja en diagonal desde el cielo
            const a = W(f.tx - 2, f.ty - 1, 8), b = W(f.tx, f.ty, 0), k = Math.min(1, t * 1.2);
            const head = a.clone().lerp(b, k);
            beam(a.clone().lerp(b, Math.max(0, k - 0.4)), head, 0.22, f.color, 0.9); orb(head, 0.25, '#ffffff');
            if (k >= 1) lightAt(Math.max(0, 1 - (t - 0.83) * 6), f.tx, f.ty, f.color);
        } else if (f.kind === 'bolt') {
            const a = W(f.x, f.y, CHEST), b = W(f.tx, f.ty, CHEST), head = Math.min(1, t * 2.5);
            beam(a.clone().lerp(b, Math.max(0, head - 0.35)), a.clone().lerp(b, head), f.cast ? 0.1 : 0.06, f.color, fade);
            orb(a.clone().lerp(b, head), f.cast ? 0.12 : 0.08, '#ffffff', fade);
        } else if (f.kind === 'bubble') { // escudo: una burbuja alrededor del robot
            const ux = f.unit ? (f.unit.rx ?? f.unit.x) : f.x, uy = f.unit ? (f.unit.ry ?? f.unit.y) : f.y, r = (f.unit ? sizeOf(f.unit) : 2) * 0.5;
            orb(W(ux, uy, r), r * (1 + 0.04 * Math.sin(t * 20)), f.color2, 0.22 * fade); orb(W(ux, uy, r), r * 1.06, f.color, 0.1 * fade);
        }
    }
    pGeo.setDrawRange(0, np); pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
    flash.intensity = flashK * 40;
}
// Lo que sobró de los haces y esferas de cuadros anteriores se esconde
function hideUnused() {
    for (let i = nBeam; i < beams.length; i++) beams[i].visible = false;
    for (let i = nOrb; i < orbs.length; i++) orbs[i].visible = false;
}
// Proyectiles: estela de luz detrás de cada uno
const trailOf = new WeakMap();
function projectileTrail(pr, pos, color) {
    let tr = trailOf.get(pr); if (!tr) trailOf.set(pr, tr = []);
    tr.push(pos.clone()); if (tr.length > 6) tr.shift();
    if (tr.length > 1) beam(tr[0], pos, pr.radius ? 0.12 : 0.06, color, 0.45);
}

// --- CADA CUADRO ---
let frameNo = 0;
const tmp = new THREE.Vector3();
function frame(arena, dt) {
    frameNo++;
    // Tamaño: el canvas 3D tapa justo el área del mapa (adentro del borde del canvas 2D)
    const w = canvas2d.clientWidth, h = canvas2d.clientHeight;
    cv.style.display = 'block';
    cv.style.left = canvas2d.offsetLeft + canvas2d.clientLeft + 'px'; cv.style.top = canvas2d.offsetTop + canvas2d.clientTop + 'px';
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    const rw = Math.max(64, Math.round(w / PIXEL)), rh = Math.max(48, Math.round(h / PIXEL));
    if (rw !== RES.w || rh !== RES.h) { setRes(rw, rh); renderer.setSize(rw, rh, false); }
    placeCamera(w / Math.max(1, h));
    if (shakeAmount) { camera.position.x += (Math.random() - 0.5) * shakeAmount * 0.03; camera.position.z += (Math.random() - 0.5) * shakeAmount * 0.03; } // temblor de los golpes fuertes
    // Jefe: luz más roja
    const boss = arena.kind === 'boss';
    hemi.color.set(boss ? '#f0b8b0' : '#dfe6f2'); scene.fog.color.set(boss ? '#1a0b0c' : '#0c0d10');
    const rec = arenaGroup.getObjectByName('rec'); rec.visible = Math.floor(performance.now() / 600) % 2 === 0;

    const list = arena.creeps.filter(c => c.isAlive()).concat(arena.heroes.filter(h => !h.eliminated && h.isAlive()));
    for (const u of list) {
        const o = unitObj(u), p = drawPos(u, dt);
        o.seen = frameNo;
        if (o.dieT !== undefined) { o.dieT = undefined; o.robot.rotation.x = 0; o.g.position.y = 0; } // revivió
        const x = (p.x + 0.5) * U, z = (p.y + 0.5) * U;
        let speed = 0;
        if (o.last && dt > 0) { const dx = x - o.last.x, dz = z - o.last.z; speed = Math.hypot(dx, dz) / dt; if (Math.hypot(dx, dz) > 0.004) o.yaw = Math.atan2(dx, dz); }
        if (u.fxAttack) o.yaw = Math.atan2(u.fxAttack.dx, u.fxAttack.dy);
        o.last = { x, z };
        o.g.position.set(x, 0, z);
        let d = o.yaw - o.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
        o.g.rotation.y += d * Math.min(1, dt * 12);
        animateRobot(o.robot, dt, speed / o.scale * 0.6, false);
        const hit = u.fxHitAt !== undefined && fxClock - u.fxHitAt < 0.12;
        o.robot.scale.setScalar(o.scale * (hit ? 1.07 : 1));
        o.g.visible = true;
    }
    // Los que ya no están: si se murieron recién, el robot se cae de espaldas, se hunde y larga chispas; los demás
    // (de otra arena) se esconden. Si hace rato que no se ven, se liberan.
    for (const [u, o] of units) {
        if (o.seen === frameNo) continue;
        if (o.dieT === undefined && o.seen === frameNo - 1 && !u.isAlive()) {
            o.dieT = 0;
            fxParticles(arena, o.g.position.x / U - 0.5, o.g.position.z / U - 0.5, 'lightning', 10, 3, { style: 'spark' });
            fxParticles(arena, o.g.position.x / U - 0.5, o.g.position.z / U - 0.5, 'steel', 6, 1.5, { style: 'smoke', size: 5, life: 0.8 });
        }
        if (o.dieT !== undefined && o.dieT < 1) {
            o.dieT += dt;
            o.robot.rotation.x = -Math.min(1, o.dieT * 3.5) * Math.PI * 0.45;
            o.g.position.y = -Math.max(0, o.dieT - 0.45) * sizeOf(u) * 0.6;
            o.g.visible = true;
        } else o.g.visible = false;
        if (frameNo - o.seen > 600) { scene.remove(o.g); units.delete(u); }
    }
    drawAirFx(arena);

    // Proyectiles
    let n = 0;
    for (const pr of arena.projectiles) {
        const color = (pr.vfx && pr.vfx.color) || (pr.attacker.isHero ? heroColor(pr.attacker) : pr.attacker.color || '#fefae0');
        const s = shotMesh(n++, pr.isCrit ? '#ffd166' : color, !!pr.radius);
        s.position.set((pr.x + 0.5) * U, 0.8, (pr.y + 0.5) * U);
        projectileTrail(pr, s.position, color);
    }
    for (let i = n; i < shots.length; i++) shots[i].visible = false;

    // El aro de rango; la cruz de a dónde caminás, el objetivo marcado y la mira van en el piso (drawDecal)
    const me = typeof player !== 'undefined' ? player : null;
    rangeRing.visible = !!(me && me.isAlive() && me.arena === arena);
    if (rangeRing.visible) { const o = units.get(me); if (o) { rangeRing.position.set(o.g.position.x, 0.03, o.g.position.z); rangeRing.scale.setScalar(effRange(me)); } }
    drawDecal(arena);
    hideUnused();

    renderer.render(scene, camera);
}
function hide() { cv.style.display = 'none'; }

// De un punto del mundo (casillas, altura en casillas) a coordenadas del mapa 2D (MAP_W × MAP_H)
function project(x, y, h = 0) {
    tmp.set((x + 0.5) * U, h * U, (y + 0.5) * U).project(camera);
    return { x: (tmp.x + 1) / 2 * MAP_W, y: (1 - tmp.y) / 2 * MAP_H, behind: tmp.z > 1 };
}
// Altura de la cabeza de una unidad (para la barra de vida)
function headHeight(u) { return sizeOf(u) + 0.15; }
// Del mouse a la casilla: rayo desde la cámara hasta el piso
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
function screenToTile(clientX, clientY) {
    const r = canvas2d.getBoundingClientRect();
    const nx = ((clientX - r.left - canvas2d.clientLeft) / canvas2d.clientWidth) * 2 - 1, ny = -(((clientY - r.top - canvas2d.clientTop) / canvas2d.clientHeight) * 2 - 1);
    camera.updateMatrixWorld(); ray.setFromCamera({ x: nx, y: ny }, camera);
    if (!ray.ray.intersectPlane(plane, hitP)) return null;
    return { x: hitP.x / U - 0.5, y: hitP.z / U - 0.5 };
}

// --- PRENDER Y APAGAR ---
let enabled = true;
try { enabled = localStorage.getItem('chc-view3d') !== 'off'; } catch (e) { /* por defecto, prendida */ }
if (/[?&]test/.test(location.search) || /[?&]view3d=0/.test(location.search)) enabled = false;
window.M3D = {
    // ¿Se dibuja esta arena en 3D? (combate de MATCH: oleada, duelo o jefe; no la Torre)
    wants: arena => enabled && arena && ['wave', 'duel', 'boss'].includes(arena.kind) && gameMode !== 'tower',
    enabled: () => enabled,
    set(on) { enabled = on; try { localStorage.setItem('chc-view3d', on ? 'on' : 'off'); } catch (e) { /* no se guarda */ } if (!on) hide(); },
    frame, hide, project, headHeight, screenToTile, active: false
};
