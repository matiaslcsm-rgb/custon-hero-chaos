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
const rangeRing = ringMesh(0.97, 1, '#e8b4a0', 0.55); scene.add(rangeRing);
const moveMark = ringMesh(0.12, 0.26, '#2dc653', 0.9); scene.add(moveMark);

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
    // Jefe: luz más roja
    const boss = arena.kind === 'boss';
    hemi.color.set(boss ? '#f0b8b0' : '#dfe6f2'); scene.fog.color.set(boss ? '#1a0b0c' : '#0c0d10');
    const rec = arenaGroup.getObjectByName('rec'); rec.visible = Math.floor(performance.now() / 600) % 2 === 0;

    const list = arena.creeps.filter(c => c.isAlive()).concat(arena.heroes.filter(h => !h.eliminated && h.isAlive()));
    for (const u of list) {
        const o = unitObj(u), p = drawPos(u, dt);
        o.seen = frameNo;
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
    // Los que ya no están (muertos o de otra arena): se esconden; si hace rato que no se ven, se liberan
    for (const [u, o] of units) if (o.seen !== frameNo) { o.g.visible = false; if (frameNo - o.seen > 600) { scene.remove(o.g); units.delete(u); } }

    // Proyectiles
    let n = 0;
    for (const pr of arena.projectiles) {
        const color = (pr.vfx && pr.vfx.color) || (pr.attacker.isHero ? heroColor(pr.attacker) : pr.attacker.color || '#fefae0');
        shotMesh(n++, pr.isCrit ? '#ffd166' : color, !!pr.radius).position.set((pr.x + 0.5) * U, 0.8, (pr.y + 0.5) * U);
    }
    for (let i = n; i < shots.length; i++) shots[i].visible = false;

    // El aro de rango y la marca de a dónde caminás
    const me = typeof player !== 'undefined' ? player : null;
    rangeRing.visible = !!(me && me.isAlive() && me.arena === arena);
    if (rangeRing.visible) { const o = units.get(me); if (o) { rangeRing.position.set(o.g.position.x, 0.03, o.g.position.z); rangeRing.scale.setScalar(effRange(me)); } }
    moveMark.visible = !!(me && me.moveTarget && me.arena === arena);
    if (moveMark.visible) moveMark.position.set((me.moveTarget.x + 0.5) * U, 0.04, (me.moveTarget.y + 0.5) * U);

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
