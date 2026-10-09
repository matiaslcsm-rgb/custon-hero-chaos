// Tower Chaos 3D — prototipo en tercera persona con estética PS1 (referencias: Lunacid, King's Field). 2026-10-08.
//
//   Qué prueba este prototipo: si Tower Chaos se siente bien en 3D low poly antes de decidir nada sobre el juego entero.
//   · Arrancás en una isla (island.js): la playa del naufragio, un bosque frondoso y, al norte, una torre que se pierde en las
//     nubes. Entre la playa y la torre hay animales: cangrejos, lobos (en manada, muerden y se alejan) y jabalíes (embisten).
//   · Empezás con un PALO. La espada está en la puerta de la torre; el bastón, en un claro con ruinas fuera del sendero.
//   · Adentro de la torre: pisos generados al azar (salas + pasillos), cada uno más oscuro y con más bichos.
//   · Cámara en tercera persona sobre el hombro; los golpes van hacia donde mirás y se pegan al enemigo más cercano.
//   · Look PS1: se dibuja a 320 px de ancho, texturas pixeladas hechas con código, vértices que tiemblan, colores a 15 bits.

import * as THREE from 'three';
import { lambert, makeTex, shade, noise, rint, pick, setupPost } from './ps1.js';
import { buildEnemy, animateEnemy, buildWeapon, animateHero } from './models.js';
import { ISLE, buildIsland, animalSpots, zoneAt } from './island.js';

const CFG = { cell: 2, wallH: 3.2, grid: 41, renderW: 320, radius: 0.3, maxLights: 6, camDist: 3.6, camH: 1.45, shoulder: 0.7 };
const Q = new URLSearchParams(location.search);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// --- RENDER (baja resolución, sin suavizar) ---
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.1, 60);
scene.add(camera);
const post = setupPost(renderer); // colores a 15 bits con tramado (ps1.js)
function resize() {
    const w = CFG.renderW, h = Math.round(w * innerHeight / innerWidth);
    renderer.setSize(w, h, false); post.resize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

const PALETTES = [ // pisos de la torre: piedra, piso, musgo/acento, niebla
    { wall: '#5b544c', floor: '#47423c', accent: '#4f6b3a', fog: 0x0c0f0c, name: 'LAS RAÍCES' },
    { wall: '#4e5458', floor: '#3c4246', accent: '#3d5d6e', fog: 0x0a0d12, name: 'LOS POZOS' },
    { wall: '#5a4a44', floor: '#45372f', accent: '#7a3b2a', fog: 0x110908, name: 'LA FRAGUA HUNDIDA' },
    { wall: '#4a4458', floor: '#363044', accent: '#5e4a8a', fog: 0x0b0812, name: 'EL OSARIO' }
];
function wallTex(p) {
    return makeTex((g, s) => {
        g.fillStyle = shade(p.wall, 0.55); g.fillRect(0, 0, s, s);
        for (let row = 0; row < 4; row++) for (let col = -1; col < 3; col++) { const x = col * 12 + (row % 2 ? 6 : 0), y = row * 8; g.fillStyle = shade(p.wall, 0.85 + Math.random() * 0.3); g.fillRect(x + 1, y + 1, 10, 6); }
        noise(g, s, p.wall, 0.5, 90);
        for (let i = 0; i < 14; i++) { g.fillStyle = shade(p.accent, 0.8 + Math.random() * 0.4); g.fillRect(rint(0, s - 1), rint(22, s - 1), 1, rint(1, 3)); }
    });
}
function floorTex(p) {
    return makeTex((g, s) => {
        g.fillStyle = shade(p.floor, 0.6); g.fillRect(0, 0, s, s);
        [[0, 0], [16, 0], [0, 16], [16, 16]].forEach(([x, y]) => { g.fillStyle = shade(p.floor, 0.85 + Math.random() * 0.3); g.fillRect(x + 1, y + 1, 14, 14); });
        noise(g, s, p.floor, 0.6, 120);
        g.fillStyle = shade(p.floor, 0.45); for (let i = 0; i < 6; i++) g.fillRect(rint(2, 29), rint(2, 29), rint(1, 4), 1);
    });
}
function ceilTex(p) { return makeTex((g, s) => { g.fillStyle = shade(p.wall, 0.4); g.fillRect(0, 0, s, s); noise(g, s, p.wall, 0.5, 160); }); }

// --- SONIDO (sintetizado, como en el juego en 2D) ---
let ac = null, music = null, musicSrc = '', surf = null;
function audio() { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); return ac; }
function tone(f0, f1, dur, type = 'square', vol = 0.08) {
    if (!ac) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur);
}
function noiseBuf(dur) { const len = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; return b; }
function hiss(dur, freq, vol = 0.12) {
    if (!ac) return; const t = ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf(dur); f.type = 'bandpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f).connect(g).connect(ac.destination); s.start(t);
}
const SFX = {
    swing: () => hiss(0.12, 2400, 0.1), hit: () => { hiss(0.08, 900, 0.18); tone(160, 70, 0.1, 'square', 0.06); }, big: () => { hiss(0.2, 500, 0.25); tone(110, 40, 0.25, 'sawtooth', 0.1); },
    thud: () => { hiss(0.08, 400, 0.16); tone(120, 60, 0.08, 'triangle', 0.08); }, // el palo: golpe sordo de madera
    orb: () => tone(400, 1300, 0.2, 'sine', 0.08), boom: () => { hiss(0.3, 400, 0.22); tone(90, 40, 0.3, 'sine', 0.15); },
    warn: () => tone(220, 330, 0.18, 'triangle', 0.04), hurt: () => { tone(200, 80, 0.25, 'sawtooth', 0.1); hiss(0.15, 700, 0.12); },
    potion: () => [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, f, 0.12, 'triangle', 0.06), i * 70)), dash: () => hiss(0.15, 1500, 0.1),
    stairs: () => [196, 262, 330, 392].forEach((f, i) => setTimeout(() => tone(f, f * 1.02, 0.25, 'triangle', 0.08), i * 120)),
    pickup: () => [392, 523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, f, 0.18, 'triangle', 0.07), i * 90)),
    snort: () => { hiss(0.35, 300, 0.2); tone(90, 70, 0.3, 'sawtooth', 0.05); }, howl: () => tone(380, 520, 0.6, 'sine', 0.05), crash: () => { hiss(0.3, 250, 0.3); tone(70, 35, 0.3, 'square', 0.1); }
};
function playMusic(src) {
    if (musicSrc === src) return; musicSrc = src;
    if (music) music.pause();
    music = new Audio(src); music.loop = true; music.volume = 0.32; music.play().catch(() => { /* sin permiso todavía */ });
}
function surfLoop() { // el mar: ruido filtrado que sube y baja como olas (más fuerte cerca de la playa)
    if (!ac || surf) return;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(), master = ac.createGain();
    s.buffer = noiseBuf(3); s.loop = true; f.type = 'lowpass'; f.frequency.value = 520; g.gain.value = 0.5; lfo.frequency.value = 0.11; lg.gain.value = 0.45;
    lfo.connect(lg).connect(g.gain); s.connect(f).connect(g).connect(master).connect(ac.destination); master.gain.value = 0; s.start(); lfo.start();
    surf = master;
}

// --- EL MUNDO ACTUAL: la isla o un piso de la torre. Todo lo que camina le pregunta a "world". ---
let world = null, level = null, depth = 0, island = null;
let grid = null, rooms = [];
function gridSolid(x, z) { const cx = Math.floor(x / CFG.cell), cz = Math.floor(z / CFG.cell); return cx < 0 || cz < 0 || cx >= CFG.grid || cz >= CFG.grid || grid[cz][cx] === 0; }
const DUNGEON_WORLD = {
    kind: 'tower', ground: () => 0,
    solid: (x, z, r = 0) => r ? gridSolid(x - r, z - r) || gridSolid(x + r, z - r) || gridSolid(x - r, z + r) || gridSolid(x + r, z + r) : gridSolid(x, z),
    canSee(ax, az, bx, bz) { const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5); for (let i = 1; i < steps; i++) { const t = i / steps; if (gridSolid(ax + (bx - ax) * t, az + (bz - az) * t)) return false; } return true; },
    shotBlocked: (x, z, y) => gridSolid(x, z) || y < 0.05 || y > CFG.wallH - 0.05
};

function genDungeon() {
    const N = CFG.grid; grid = Array.from({ length: N }, () => new Uint8Array(N)); rooms = [];
    for (let t = 0; t < 400 && rooms.length < 9 + Math.min(depth, 4); t++) {
        const w = rint(3, 7), h = rint(3, 7), x = rint(1, N - w - 2), y = rint(1, N - h - 2);
        if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
        rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
        for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j][i] = 1;
    }
    const carve = (a, b) => {
        let x = a.cx, y = a.cy; const hFirst = Math.random() < 0.5;
        const stepX = () => { while (x !== b.cx) { grid[y][x] = 1; x += Math.sign(b.cx - x); } };
        const stepY = () => { while (y !== b.cy) { grid[y][x] = 1; y += Math.sign(b.cy - y); } };
        if (hFirst) { stepX(); stepY(); } else { stepY(); stepX(); } grid[y][x] = 1;
    };
    rooms.sort((a, b) => a.cx - b.cx);
    for (let i = 1; i < rooms.length; i++) carve(rooms[i - 1], rooms[i]);
    for (let k = 0; k < 3; k++) carve(pick(rooms), pick(rooms));
    const start = rooms[0], dist = Array.from({ length: N }, () => new Int32Array(N).fill(-1)), q = [[start.cx, start.cy]];
    dist[start.cy][start.cx] = 0;
    while (q.length) { const [x, y] = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (grid[ny] && grid[ny][nx] && dist[ny][nx] < 0) { dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]); } }); }
    const exit = rooms.reduce((a, r) => (dist[r.cy][r.cx] > dist[a.cy][a.cx] ? r : a), rooms[1] || start);
    return { start, exit };
}
const cellCenter = (cx, cz) => ({ x: (cx + 0.5) * CFG.cell, z: (cz + 0.5) * CFG.cell });

function buildDungeonLevel() {
    const pal = PALETTES[(depth - 1) % PALETTES.length], N = CFG.grid, C = CFG.cell, group = new THREE.Group();
    const walls = [];
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
        if (grid[z][x]) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => grid[z + dz] && grid[z + dz][x + dx])) walls.push([x, z]);
    }
    const wallMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(C, CFG.wallH, C, 2, 3, 2), lambert({ map: wallTex(pal) }), walls.length);
    const m = new THREE.Matrix4();
    walls.forEach(([x, z], i) => { m.makeTranslation((x + 0.5) * C, CFG.wallH / 2, (z + 0.5) * C); wallMesh.setMatrixAt(i, m); });
    group.add(wallMesh);
    const ft = floorTex(pal); ft.repeat.set(N, N);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(N * C, N * C, N * 2, N * 2), lambert({ map: ft }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(N * C / 2, 0, N * C / 2); group.add(floor);
    const ct = ceilTex(pal); ct.repeat.set(N, N);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(N * C, N * C, N * 2, N * 2), lambert({ map: ct }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(N * C / 2, CFG.wallH, N * C / 2); group.add(ceil);
    const torches = [];
    rooms.forEach(r => {
        for (let k = 0; k < 2; k++) for (let t = 0; t < 20; t++) {
            const side = rint(0, 3), x = side < 2 ? rint(r.x, r.x + r.w - 1) : side === 2 ? r.x - 1 : r.x + r.w, z = side >= 2 ? rint(r.y, r.y + r.h - 1) : side === 0 ? r.y - 1 : r.y + r.h;
            if (!grid[z] || grid[z][x] !== 0) continue;
            const nx = side === 2 ? 1 : side === 3 ? -1 : 0, nz = side === 0 ? 1 : side === 1 ? -1 : 0;
            const p = cellCenter(x, z), pos = V(p.x + nx * C * 0.5, 1.9, p.z + nz * C * 0.5);
            if (torches.some(o => o.pos.distanceTo(pos) < 3)) continue;
            const stick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), lambert({ color: 0x3a2a1a }));
            stick.position.copy(pos).add(V(nx * 0.12, -0.15, nz * 0.12)); stick.rotation.set(nz * 0.5, 0, -nx * 0.5);
            const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 5), new THREE.MeshBasicMaterial({ color: 0xffb04a, fog: false }));
            flame.position.copy(pos).add(V(nx * 0.2, 0.15, nz * 0.2));
            group.add(stick, flame);
            torches.push({ pos: flame.position.clone(), flame, seed: Math.random() * 10 });
            break;
        }
    });
    return { group, torches, fog: new THREE.FogExp2(pal.fog, 0.075 + 0.01 * depth), bg: pal.fog, far: 60, name: pal.name };
}

// --- LUCES: afuera, cielo cubierto (luz pareja y fría); adentro, antorchas y el farol del héroe ---
const torchLights = Array.from({ length: CFG.maxLights }, () => { const l = new THREE.PointLight(0xff9a4a, 0, 9, 1.4); scene.add(l); return l; });
const heroLight = new THREE.PointLight(0xffd9a0, 0, 7.5, 1.5); scene.add(heroLight);
const ambient = new THREE.AmbientLight(0x3a3a46, 0.55); scene.add(ambient);
const sky = new THREE.HemisphereLight(0xc4ccd4, 0x4a5a3a, 0); scene.add(sky);
const sun = new THREE.DirectionalLight(0xe4e8ee, 0); sun.position.set(-30, 80, 40); scene.add(sun);
function setOutdoorLight(out) {
    ambient.intensity = out ? 0.35 : 0.55; sky.intensity = out ? 1.25 : 0; sun.intensity = out ? 0.7 : 0; heroLight.intensity = out ? 0 : 1.6;
}
function updateLights(t) {
    const near = level.torches.map(o => ({ o, d: o.pos.distanceToSquared(heroMesh.position) })).sort((a, b) => a.d - b.d).slice(0, CFG.maxLights);
    torchLights.forEach((l, i) => {
        const n = near[i];
        if (!n) { l.intensity = 0; return; }
        const f = 1 + 0.15 * Math.sin(t * 9 + n.o.seed) + 0.08 * Math.sin(t * 23 + n.o.seed * 2);
        l.position.copy(n.o.pos); l.intensity = 2.4 * f; n.o.flame.scale.set(1, f, 1);
    });
    heroLight.position.set(P.x, P.y + 2.2, P.z);
}

// --- EL JUGADOR ---
const P = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0.25, face: 0, hp: 100, maxHp: 100, mp: 60, maxMp: 60, weapon: 'stick', owned: ['stick'], atkCd: 0, swing: null, combo: 0, comboAt: -9, dashCd: 0, dashUntil: 0, invuln: 0, alive: true, walk: 0, moveAmt: 0, kx: 0, kz: 0, flash: 0 };
const heroMesh = buildEnemy('hero'); scene.add(heroMesh);
const keys = {};
let locked = false, paused = true, clock = 0, camDistNow = CFG.camDist;
addEventListener('keydown', e => {
    const k = e.key.toLowerCase(); keys[k] = true;
    if (paused) return;
    const order = ['stick', 'sword', 'staff'], n = +k;
    if (n >= 1 && n <= 3 && P.owned.includes(order[n - 1])) setWeapon(order[n - 1]);
    if (k === ' ') { e.preventDefault(); dash(); }
    if (k === 'e') interact();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('mousemove', e => {
    if (!locked) return;
    P.yaw -= e.movementX * 0.0022; P.pitch = Math.max(-0.35, Math.min(1.1, P.pitch + e.movementY * 0.0022));
});
addEventListener('mousedown', e => { if (!paused && locked && e.button === 0) attack(); });
addEventListener('wheel', e => { // la ruedita cambia de arma (entre las que tenés)
    if (paused || P.owned.length < 2) return;
    const i = P.owned.indexOf(P.weapon); setWeapon(P.owned[(i + (e.deltaY > 0 ? 1 : P.owned.length - 1)) % P.owned.length]);
});
document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    if (!locked && P.alive && !Q.get('demo')) showOverlay('PAUSA', 'La torre espera.', 'Seguir');
});
const camFwd = () => V(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
const faceDir = () => V(-Math.sin(P.face), 0, -Math.cos(P.face));
const angleTo = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * Math.min(1, k); };

function moveP(dx, dz) {
    if (!world.solid(P.x + dx, P.z, CFG.radius)) P.x += dx;
    if (!world.solid(P.x, P.z + dz, CFG.radius)) P.z += dz;
}
function inputDir() {
    const f = camFwd(), r = V(-f.z, 0, f.x);
    let mx = 0, mz = 0;
    if (keys.w) { mx += f.x; mz += f.z; } if (keys.s) { mx -= f.x; mz -= f.z; }
    if (keys.d) { mx += r.x; mz += r.z; } if (keys.a) { mx -= r.x; mz -= r.z; }
    const l = Math.hypot(mx, mz); return l ? { x: mx / l, z: mz / l } : null;
}
function updatePlayer(dt) {
    if (!P.alive) return;
    const dir = inputDir(), dashing = clock < P.dashUntil, swinging = !!P.swing;
    if (dashing) moveP(P.dashDx * 11 * dt, P.dashDz * 11 * dt);
    else if (dir) {
        const sp = (keys.shift && !swinging ? 5 : 3.3) * (swinging ? 0.3 : 1) * dt; // al pegar casi no te movés: el golpe compromete
        moveP(dir.x * sp, dir.z * sp);
        if (!swinging) P.face = angleTo(P.face, Math.atan2(-dir.x, -dir.z), dt * 12);
    }
    if (P.kx || P.kz) { moveP(P.kx * dt, P.kz * dt); P.kx *= Math.pow(0.01, dt); P.kz *= Math.pow(0.01, dt); if (Math.abs(P.kx) + Math.abs(P.kz) < 0.1) P.kx = P.kz = 0; }
    const target = dir && !dashing ? (keys.shift && !swinging ? 1.4 : 1) : 0;
    P.moveAmt += (target - P.moveAmt) * Math.min(1, dt * 10);
    P.walk += dt * (keys.shift ? 11 : 8) * (dir ? 1 : 0);
    P.y = world.ground(P.x, P.z);
    P.mp = Math.min(P.maxMp, P.mp + 3 * dt);
    P.atkCd -= dt; P.dashCd -= dt; P.flash -= dt;
}
function dash() {
    if (P.dashCd > 0 || !P.alive) return;
    const d = inputDir() || (() => { const f = faceDir(); return { x: -f.x, z: -f.z }; })(); // sin dirección: para atrás
    P.dashDx = d.x; P.dashDz = d.z; if (inputDir()) P.face = Math.atan2(-d.x, -d.z);
    P.dashUntil = clock + 0.2; P.invuln = clock + 0.32; P.dashCd = 0.9; P.swing = null; SFX.dash();
}
// La cámara: atrás y arriba del hombro derecho; se acorta si hay una pared o el piso en el medio
function updateCamera(dt) {
    const f = camFwd(), right = V(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
    const pivot = V(P.x, P.y + CFG.camH, P.z).addScaledVector(right, CFG.shoulder);
    const back = V(Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), Math.cos(P.yaw) * Math.cos(P.pitch));
    let want = CFG.camDist;
    for (let s = 0.3; s <= CFG.camDist; s += 0.15) {
        const p = pivot.clone().addScaledVector(back, s);
        const blocked = world.kind === 'tower' ? (gridSolid(p.x, p.z) || p.y > CFG.wallH - 0.2) : island.camBlocked(p.x, p.y, p.z); // afuera: troncos, copas y columnas
        if (blocked) { want = Math.max(0.4, s - 0.3); break; }
    }
    camDistNow = want < camDistNow ? want : camDistNow + (want - camDistNow) * Math.min(1, dt * 3); // se acerca de golpe, se aleja suave
    const cp = pivot.clone().addScaledVector(back, camDistNow);
    cp.y = Math.max(cp.y, world.ground(cp.x, cp.z) + 0.35);
    camera.position.copy(cp); camera.lookAt(pivot.clone().addScaledVector(f, 2));
    heroMesh.visible = camDistNow > 0.7;
}

// --- LAS ARMAS ---
const WEAPONS = {
    stick: { name: 'Palo', dmg: [8, 11], reach: 2.1, hint: 'combo de 3 · el tercero empuja' },
    sword: { name: 'Espada', dmg: [16, 22], reach: 2.5, hint: 'combo de 3 · el tercero pega doble' },
    staff: { name: 'Bastón', mana: 12, hint: 'orbe que explota · 12 maná' }
};
function setWeapon(w) {
    P.weapon = w; heroMesh.userData.U.grip.clear(); heroMesh.userData.U.grip.add(buildWeapon(w));
    document.getElementById('weapon-name').innerHTML = `${WEAPONS[w].name}<small>${WEAPONS[w].hint}</small>` + (P.owned.length > 1 ? `<small>${P.owned.map((o, i) => `${['1', '2', '3'][['stick', 'sword', 'staff'].indexOf(o)]} ${WEAPONS[o].name}`).join(' · ')}</small>` : '');
    document.getElementById('crosshair').style.display = w === 'staff' ? '' : 'none';
}
// Apuntado suave: mirás hacia la cámara, pero si hay un enemigo cerca y más o menos adelante, te girás hacia él
function aimFace(range) {
    const f = camFwd(); let best = null, bd = 1e9;
    enemies.forEach(e => { if (!e.alive) return; const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz); if (d < range && (dx * f.x + dz * f.z) / (d || 1) > 0.35 && d < bd) { bd = d; best = e; } });
    P.face = best ? Math.atan2(-(best.x - P.x), -(best.z - P.z)) : P.yaw;
}
function attack() {
    if (P.atkCd > 0 || !P.alive || clock < P.dashUntil) return;
    if (P.weapon !== 'staff') {
        aimFace(WEAPONS[P.weapon].reach + 1.5);
        if (clock - P.comboAt > 0.9) P.combo = 0;
        const step = P.combo; P.combo = (P.combo + 1) % 3; P.comboAt = clock;
        P.swing = { at: clock, dur: step === 2 ? 0.5 : 0.34, step, done: false };
        P.atkCd = step === 2 ? 0.62 : 0.3; SFX.swing();
    } else {
        if (P.mp < 12) { say('No te alcanza el maná.'); return; }
        aimFace(12);
        P.mp -= 12; P.atkCd = 0.55; P.swing = { at: clock, dur: 0.35, step: -1, done: false };
    }
}
function updateSwing() {
    const s = P.swing; if (!s) return;
    s.k = (clock - s.at) / s.dur;
    if (!s.done && s.k > 0.4) { s.done = true; if (s.step < 0) { castOrb(); SFX.orb(); } else meleeHit(s.step); }
    if (s.k >= 1) P.swing = null;
}
function meleeHit(step) {
    const W = WEAPONS[P.weapon], f = faceDir(), mult = step === 2 ? (P.weapon === 'stick' ? 1.6 : 2) : 1;
    let any = false;
    enemies.forEach(e => {
        if (!e.alive) return;
        const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
        if (d > W.reach + e.T.size || (dx * f.x + dz * f.z) / (d || 1) < 0.4) return;
        const crit = Math.random() < 0.1;
        hurtEnemy(e, Math.round(rint(W.dmg[0], W.dmg[1]) * mult * (crit ? 2 : 1)), dx / d, dz / d, step === 2 ? 1.6 : 0.5);
        any = true;
    });
    if (any) (step === 2 ? SFX.big : P.weapon === 'stick' ? SFX.thud : SFX.hit)();
}

// --- ORBES DEL BASTÓN (salen del pecho hacia donde apunta la mira) ---
const orbs = [];
function castOrb() {
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    const from = V(P.x, P.y + 1.3, P.z).addScaledVector(faceDir(), 0.5), target = camera.position.clone().addScaledVector(dir, 25);
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), new THREE.MeshBasicMaterial({ color: 0xc8a8ff }));
    m.position.copy(from); scene.add(m); orbs.push({ m, v: target.sub(from).normalize().multiplyScalar(14), life: 2.5 });
}
function updateOrbs(dt) {
    for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i]; o.life -= dt; o.m.position.addScaledVector(o.v, dt); o.m.rotation.x += dt * 8;
        const p = o.m.position, hitWall = world.shotBlocked(p.x, p.z, p.y);
        const hitE = enemies.find(e => e.alive && Math.hypot(e.x - p.x, e.z - p.z) < 0.5 + e.T.size && p.y < e.y + e.T.h + 0.3 && p.y > e.y - 0.3);
        if (hitWall || hitE || o.life <= 0) {
            enemies.forEach(e => { const d = Math.hypot(e.x - p.x, e.z - p.z); if (e.alive && d < 1.8) hurtEnemy(e, e === hitE ? 30 : 16, (e.x - p.x) / (d || 1), (e.z - p.z) / (d || 1), 0.8); });
            burst(p, 0xb48cff, 14); SFX.boom();
            scene.remove(o.m); orbs.splice(i, 1);
        }
    }
}

// --- PARTÍCULAS (cubitos que saltan: golpes, muertes, orbes) ---
const parts = [];
function burst(pos, color, n) {
    for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), new THREE.MeshBasicMaterial({ color }));
        m.position.copy(pos); scene.add(m);
        parts.push({ m, v: V((Math.random() - 0.5) * 4, Math.random() * 4, (Math.random() - 0.5) * 4), life: 0.6 + Math.random() * 0.5 });
    }
}
function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life -= dt; p.v.y -= 9 * dt; p.m.position.addScaledVector(p.v, dt);
        const gy = world.ground(p.m.position.x, p.m.position.z) + 0.04;
        if (p.m.position.y < gy) { p.m.position.y = gy; p.v.multiplyScalar(0.4); }
        if (p.life <= 0) { scene.remove(p.m); parts.splice(i, 1); }
    }
}

// --- ENEMIGOS (todos avisan antes de pegar) ---
//   size: radio para recibir golpes · aggro: a qué distancia te ven · anim: velocidad de las patas
const ENEMY_TYPES = {
    crab: { name: 'Cangrejo', hp: 26, speed: 1.6, dmg: 7, reach: 1.3, windup: 0.5, h: 0.6, size: 0.3, aggro: 6, anim: 14, eye: [0x101010, 0x101010], blood: 0xe0a070 },
    wolf: { name: 'Lobo', hp: 34, speed: 3.6, dmg: 9, reach: 1.7, windup: 0.42, h: 1.0, size: 0.35, aggro: 12, anim: 12, eye: [0x8a7010, 0xffd040], blood: 0x8a1a12, pack: true, hitRun: 0.9 },
    boar: { name: 'Jabalí', hp: 62, speed: 2.3, dmg: 14, reach: 1.6, windup: 0.6, h: 1.0, size: 0.45, aggro: 9, anim: 10, eye: [0x200a04, 0xa01808], blood: 0x8a1a12, charge: { min: 4, max: 11, windup: 0.85, speed: 12, time: 0.75, dmg: 22, cd: 4.5 } },
    skeleton: { name: 'Esqueleto', hp: 42, speed: 1.9, dmg: 12, reach: 1.7, windup: 0.55, h: 1.6, size: 0.3, aggro: 11, anim: 7, eye: [0x440000, 0xa01810], blood: 0xd8d0b8 },
    slime: { name: 'Limo', hp: 30, speed: 1.4, dmg: 8, reach: 1.3, windup: 0.45, h: 0.7, size: 0.35, aggro: 11, anim: 7, eye: [0x102008, 0x102008], blood: 0x6fb04a },
    knight: { name: 'Caballero hueco', hp: 75, speed: 1.6, dmg: 17, reach: 2.0, windup: 0.7, h: 2.0, size: 0.4, aggro: 11, anim: 7, eye: [0x000000, 0x000000], blood: 0xb8bcc4 },
    automaton: { name: 'Autómata', hp: 110, speed: 1.15, dmg: 24, reach: 2.2, windup: 0.9, h: 2.4, size: 0.5, aggro: 11, anim: 7, eye: [0xff4f9a, 0xff4f9a], blood: 0xc8b88a }
};
let enemies = [];
const DEBUG = { passive: !!Q.get('calm') }; // &calm=1: los bichos no te ven (capturas)
const barBg = new THREE.MeshBasicMaterial({ color: 0x1a0a08, depthTest: false }), barFg = new THREE.MeshBasicMaterial({ color: 0xc8302a, depthTest: false });
function makeEnemy(type, x, z, mult = 1, extra = {}) {
    const T = ENEMY_TYPES[type], mesh = buildEnemy(type), hp = Math.round(T.hp * mult);
    scene.add(mesh);
    const bar = new THREE.Group(), bg = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.09), barBg), fg = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.06), barFg);
    bg.renderOrder = fg.renderOrder = 10; bar.add(bg, fg); bar.visible = false; scene.add(bar);
    const e = { type, T, x, z, y: world.ground(x, z), hx: x, hz: z, hp, maxHp: hp, mult, alive: true, mesh, bar, fg, state: 'idle', wind: 0, cd: 0, flash: 0, kx: 0, kz: 0, hop: Math.random() * 6, wanderT: Math.random() * 3, chargeCd: 1, barUntil: 0, ...extra };
    enemies.push(e); return e;
}
function clearEnemies() { enemies.forEach(e => { scene.remove(e.mesh); scene.remove(e.bar); if (e.line) scene.remove(e.line); }); enemies = []; }
function moveEnemy(e, vx, vz, dt) {
    let nx = e.x + vx * dt, nz = e.z + vz * dt;
    enemies.forEach(o => { if (o !== e && o.alive) { const ox = e.x - o.x, oz = e.z - o.z, od = Math.hypot(ox, oz); if (od < e.T.size + o.T.size + 0.2 && od > 0) { nx += ox / od * dt; nz += oz / od * dt; } } }); // no se apilan
    let blocked = false;
    if (!world.solid(nx, e.z, e.T.size)) e.x = nx; else blocked = true;
    if (!world.solid(e.x, nz, e.T.size)) e.z = nz; else blocked = true;
    return blocked;
}
function wake(e) {
    if (e.state !== 'idle') return;
    e.state = 'chase';
    if (e.T.pack) { enemies.forEach(o => { if (o.pack === e.pack && o.state === 'idle') o.state = 'chase'; }); if (!wake.howled || clock - wake.howled > 6) { SFX.howl(); say('Aúllan los lobos.'); wake.howled = clock; } }
    else if (Math.random() < 0.4) say(`${e.T.name} te vio.`);
}
function chargeLine(e, show) { // la franja roja en el piso: por dónde va a pasar el jabalí
    if (!show) { if (e.line) e.line.visible = false; return; }
    const C = e.T.charge, len = C.speed * C.time;
    if (!e.line) { e.line = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1), new THREE.MeshBasicMaterial({ color: 0xc1121f, transparent: true, opacity: 0.35, depthTest: false })); e.line.rotation.order = 'YXZ'; scene.add(e.line); }
    const w = 1 - e.wind / C.windup;
    e.line.visible = true; e.line.scale.y = len * Math.min(1, w * 1.6);
    const mid = e.line.scale.y / 2;
    e.line.position.set(e.x + e.cdx * mid, Math.max(e.y, world.ground(e.x + e.cdx * mid, e.z + e.cdz * mid)) + 0.08, e.z + e.cdz * mid);
    e.line.rotation.set(-Math.PI / 2, Math.atan2(-e.cdx, -e.cdz), 0, 'YXZ');
    e.line.material.opacity = 0.2 + 0.3 * w;
}
function updateEnemies(dt) {
    enemies.forEach(e => {
        if (!e.alive) return;
        const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz) || 0.001, T = e.T;
        e.cd -= dt; e.flash -= dt; e.chargeCd -= dt; e.hop += dt;
        let moving = false, faceX = dx, faceZ = dz;
        if (e.kx || e.kz) { moveEnemy(e, e.kx * 6, e.kz * 6, dt); e.kx *= Math.pow(0.02, dt); e.kz *= Math.pow(0.02, dt); if (Math.abs(e.kx) + Math.abs(e.kz) < 0.05) e.kx = e.kz = 0; }
        if (e.state === 'idle') {
            if (!DEBUG.passive && P.alive && d < T.aggro && world.canSee(e.x, e.z, P.x, P.z)) wake(e);
            else if (world.kind === 'island') { // los animales pasean cerca de su lugar
                e.wanderT -= dt;
                if (e.wanderT <= 0) { e.wanderT = 2 + Math.random() * 4; e.wx = e.hx + (Math.random() - 0.5) * 10; e.wz = e.hz + (Math.random() - 0.5) * 10; if (Math.random() < 0.4) e.wx = undefined; }
                if (e.wx !== undefined) { const wx = e.wx - e.x, wz = e.wz - e.z, wd = Math.hypot(wx, wz); if (wd > 0.4) { if (moveEnemy(e, wx / wd * T.speed * 0.3, wz / wd * T.speed * 0.3, dt)) e.wx = undefined; moving = true; faceX = wx; faceZ = wz; } }
                else { faceX = -Math.sin(e.mesh.rotation.y); faceZ = -Math.cos(e.mesh.rotation.y); }
            } else { faceX = -Math.sin(e.mesh.rotation.y); faceZ = -Math.cos(e.mesh.rotation.y); }
        }
        if (e.state === 'chase' && P.alive) {
            if (T.charge && e.chargeCd <= 0 && d > T.charge.min && d < T.charge.max && world.canSee(e.x, e.z, P.x, P.z)) { // embestida: fija la dirección al empezar el aviso
                e.state = 'wind'; e.charging = true; e.wind = T.charge.windup; e.cdx = dx / d; e.cdz = dz / d; SFX.snort();
            } else if (d < T.reach && e.cd <= 0) { e.state = 'wind'; e.charging = false; e.wind = T.windup; SFX.warn(); }
            else if (d > T.reach * 0.8) {
                let vx = dx / d * T.speed, vz = dz / d * T.speed;
                if (e.type === 'crab') { const side = Math.sin(e.hop * 2.5) * 1.2; vx += -dz / d * side; vz += dx / d * side; } // de costado, como cangrejo
                moveEnemy(e, vx, vz, dt); moving = true;
            }
        } else if (e.state === 'back') { // el lobo muerde y se aleja
            e.backT -= dt; moveEnemy(e, -dx / d * T.speed * 0.75, -dz / d * T.speed * 0.75, dt); moving = true; faceX = dx; faceZ = dz;
            if (e.backT <= 0) e.state = 'chase';
        } else if (e.state === 'wind') {
            e.wind -= dt;
            if (e.charging) { faceX = e.cdx; faceZ = e.cdz; chargeLine(e, true); }
            if (e.wind <= 0) {
                if (e.charging) { e.state = 'charge'; e.ctime = T.charge.time; e.chit = false; chargeLine(e, false); SFX.dash(); }
                else { // ¡pega! si seguís en su alcance y no esquivaste
                    e.state = T.hitRun ? 'back' : 'chase'; e.backT = T.hitRun || 0; e.cd = 1.1;
                    if (T.hitRun) { e.kx = dx / d * 0.5; e.kz = dz / d * 0.5; } // el salto de la mordida
                    if (P.alive && d < T.reach + 0.45 && clock > P.invuln) hurtPlayer(Math.round(T.dmg * e.mult), e);
                    else if (P.alive && d < T.reach + 1.2) burst(V(e.x + dx / d * 0.8, e.y + 0.6, e.z + dz / d * 0.8), 0x8a8070, 5);
                }
            }
        } else if (e.state === 'charge') {
            const C = T.charge; e.ctime -= dt; faceX = e.cdx; faceZ = e.cdz; moving = true;
            if (moveEnemy(e, e.cdx * C.speed, e.cdz * C.speed, dt)) { // se la dio contra algo: queda atontado (y recibe más daño)
                e.state = 'stun'; e.stunT = 1.6; e.chargeCd = C.cd; SFX.crash(); burst(V(e.x + e.cdx * 0.6, e.y + 0.6, e.z + e.cdz * 0.6), 0x8a7a5a, 12); say(`¡El ${T.name.toLowerCase()} se la dio de lleno! Pegale ahora.`);
            } else {
                if (!e.chit && d < 1.1 && P.alive && clock > P.invuln) { e.chit = true; hurtPlayer(Math.round(C.dmg * e.mult), e); P.kx = e.cdx * 9; P.kz = e.cdz * 9; }
                if (e.ctime <= 0) { e.state = 'chase'; e.cd = 1.2; e.chargeCd = C.cd; }
            }
        } else if (e.state === 'stun') { e.stunT -= dt; if (e.stunT <= 0) e.state = 'chase'; }
        // Dibujo: mira a donde va (o al jugador); el aviso lo pone rojo y lo agranda
        e.y = world.ground(e.x, e.z);
        const m = e.mesh; m.position.set(e.x, e.y, e.z); m.rotation.y = angleTo(m.rotation.y, Math.atan2(-faceX, -faceZ), dt * (e.state === 'charge' ? 20 : 8));
        const winding = e.state === 'wind', w = winding ? 1 - e.wind / (e.charging ? T.charge.windup : T.windup) : 0;
        animateEnemy(m, e.hop, moving, w, winding ? 0xff2a1a : T.eye[e.state === 'idle' ? 0 : 1], e.state === 'charge' ? T.anim * 2 : T.anim);
        if (e.state === 'stun') { m.rotation.z = Math.sin(clock * 18) * 0.15; } else m.rotation.z = 0;
        const glow = w * w * 0.28 * (0.75 + 0.25 * Math.sin(clock * 30));
        m.userData.mats.forEach(mat => mat.emissive.setRGB(e.flash > 0 ? 0.9 : glow, e.flash > 0 ? 0.9 : 0, e.flash > 0 ? 0.9 : 0));
        m.scale.setScalar(1 + w * 0.08);
        // barra de vida: aparece unos segundos cuando le pegás
        e.bar.visible = clock < e.barUntil;
        if (e.bar.visible) { e.bar.position.set(e.x, e.y + T.h + 0.35, e.z); e.bar.quaternion.copy(camera.quaternion); const r = Math.max(0, e.hp / e.maxHp); e.fg.scale.x = r; e.fg.position.x = -(1 - r) * 0.38; }
    });
}
function hurtEnemy(e, dmg, ux, uz, push) {
    if (e.state === 'stun') dmg = Math.round(dmg * 1.5); // atontado: golpe de gracia
    e.hp -= dmg; e.flash = 0.1; e.kx = ux * push * 3; e.kz = uz * push * 3; e.barUntil = clock + 3;
    wake(e);
    if (e.state === 'wind' && push >= 1.5) { e.state = 'chase'; e.cd = 0.8; chargeLine(e, false); say('¡Lo interrumpiste!'); } // el remate corta su golpe (y la embestida)
    burst(V(e.x, e.y + e.T.h * 0.6, e.z), e.T.blood, 4);
    if (e.hp <= 0) {
        e.alive = false; scene.remove(e.mesh); scene.remove(e.bar); if (e.line) scene.remove(e.line);
        burst(V(e.x, e.y + e.T.h * 0.5, e.z), e.T.blood, 18);
        if (Math.random() < 0.35) spawnPotion(e.x, e.z);
        if (world.kind === 'tower' && enemies.every(o => !o.alive)) say('El piso quedó en silencio.');
    }
}
function hurtPlayer(dmg, src) {
    P.hp -= dmg; P.flash = 0.12; SFX.hurt();
    const el = document.getElementById('hurt'); el.style.transition = 'none'; el.style.opacity = 0.9; requestAnimationFrame(() => { el.style.transition = 'opacity 0.6s'; el.style.opacity = 0; });
    if (P.hp <= 0) { P.hp = 0; P.alive = false; document.exitPointerLock(); showOverlay('MORISTE', `${src.T.name} te mató ${world.kind === 'island' ? 'en la isla' : `en el piso ${depth}`}. Despertás otra vez en la playa (las armas que juntaste las conservás).`, 'Despertar'); }
}

// --- COSAS PARA AGARRAR: pociones, armas tiradas, la puerta, la escalera ---
let potions = [], pickups = [], stairs = null;
function spawnPotion(x, z) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xd8203a }));
    const y = world.ground(x, z); m.position.set(x, y + 0.5, z); scene.add(m); potions.push({ m, x, z, y });
}
function spawnWeaponPickup(kind, x, y, z, how) {
    if (P.owned.includes(kind)) return;
    const g = new THREE.Group(), w = buildWeapon(kind); g.add(w); g.position.set(x, y, z);
    if (how === 'stuck') { g.position.y += kind === 'sword' ? 1.0 : 1.2; g.rotation.set(0.15, 0.4, 0.1); } // clavada en el piso
    else { w.rotation.z = Math.PI / 2; w.position.x = 0.5; g.position.y += 1.6; } // flota sobre el altar
    scene.add(g); pickups.push({ kind, g, x, z, how });
}
function buildStairs(room) {
    if (stairs) scene.remove(stairs.group);
    const g = new THREE.Group(), p = cellCenter(room.cx, room.cy);
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25 * (i + 1), 0.35), lambert({ color: 0x6a645a })); s.position.set(0, 0.125 * (i + 1), 0.6 - i * 0.35); g.add(s); } // escalones que suben
    const rune = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.2, 8), new THREE.MeshBasicMaterial({ color: 0x7b6cf6, side: THREE.DoubleSide })); rune.rotation.x = -Math.PI / 2; rune.position.y = 0.02; g.add(rune);
    g.position.set(p.x, 0, p.z); scene.add(g);
    stairs = { group: g, rune, x: p.x, z: p.z };
}
function nearThing() {
    const pIdx = potions.findIndex(o => Math.hypot(o.x - P.x, o.z - P.z) < 1.3);
    if (pIdx >= 0) return { text: 'E · tomar la poción', act: () => drink(pIdx) };
    const w = pickups.find(o => Math.hypot(o.x - P.x, o.z - P.z) < (o.how === 'altar' ? 1.9 : 1.5));
    if (w) return { text: `E · agarrar ${w.kind === 'sword' ? 'la espada' : 'el bastón'}`, act: () => takeWeapon(w) };
    if (world.kind === 'island' && Math.hypot(ISLE.door.x - P.x, ISLE.door.z - P.z) < 2.6) return { text: 'E · entrar a la torre', act: () => { SFX.stairs(); depth = 1; enterTower(); } };
    if (stairs && Math.hypot(stairs.x - P.x, stairs.z - P.z) < 1.5) return { text: 'E · subir la escalera', act: () => { SFX.stairs(); depth++; enterTower(); } };
    return null;
}
function interact() { const n = nearThing(); if (n) n.act(); }
function takeWeapon(w) {
    scene.remove(w.g); pickups.splice(pickups.indexOf(w), 1);
    P.owned.push(w.kind); P.owned.sort((a, b) => ['stick', 'sword', 'staff'].indexOf(a) - ['stick', 'sword', 'staff'].indexOf(b));
    setWeapon(w.kind); SFX.pickup(); burst(V(w.x, P.y + 1, w.z), 0xe8d8a0, 16);
    say(w.kind === 'sword' ? 'Una espada de alguien que no llegó a entrar. Ahora es tuya (tecla 2).' : 'El bastón zumba en tu mano: lanza orbes que explotan (tecla 3, gasta maná).');
}
function drink(i) { const o = potions[i]; scene.remove(o.m); potions.splice(i, 1); P.hp = Math.min(P.maxHp, P.hp + 35); SFX.potion(); say('Tomaste una poción (+35 vida).'); }
function updatePickups(dt) {
    potions.forEach(o => { o.m.rotation.y += dt * 2; o.m.position.y = o.y + 0.5 + Math.sin(clock * 3 + o.x) * 0.06; });
    for (let i = potions.length - 1; i >= 0; i--) if (Math.hypot(potions[i].x - P.x, potions[i].z - P.z) < 0.6 && P.hp < P.maxHp) drink(i);
    pickups.forEach(o => { if (o.how === 'altar') { o.g.rotation.y += dt * 0.8; o.g.position.y = island.altar.y + 1.6 + Math.sin(clock * 2) * 0.1; } });
    if (stairs) { stairs.rune.rotation.z += dt * 0.6; stairs.rune.material.color.setHSL(0.7, 0.8, 0.55 + 0.15 * Math.sin(clock * 3)); }
}

// --- INTERFAZ ---
const logBox = document.getElementById('log');
function say(text) {
    const d = document.createElement('div'); d.textContent = text; logBox.appendChild(d);
    while (logBox.children.length > 5) logBox.firstChild.remove();
    setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 1000); }, 4500);
}
let zoneNow = '', zoneCheck = 0;
function updateHud(dt) {
    document.getElementById('hp-fill').style.width = `${100 * P.hp / P.maxHp}%`;
    document.getElementById('hp-text').textContent = `${Math.ceil(P.hp)} / ${P.maxHp}`;
    document.getElementById('mp-fill').style.width = `${100 * P.mp / P.maxMp}%`;
    document.getElementById('mp-text').textContent = `${Math.floor(P.mp)} / ${P.maxMp}`;
    const n = nearThing(), pr = document.getElementById('prompt');
    pr.textContent = n ? n.text : ''; pr.style.opacity = n ? 1 : 0;
    if (world.kind === 'island' && (zoneCheck -= dt) <= 0) { // el nombre del lugar aparece al entrar (como en los souls)
        zoneCheck = 0.5; const z = zoneAt(P.x, P.z);
        if (z !== zoneNow) { if (zoneNow) showTitle(z, ''); zoneNow = z; }
    }
    if (surf) surf.gain.value = world.kind === 'island' ? 0.03 + 0.12 * Math.max(0, Math.min(1, (P.z - 20) / 60)) : 0;
}
const overlay = document.getElementById('overlay');
function showOverlay(title, text, btn) {
    paused = true; overlay.style.display = 'flex';
    overlay.querySelector('h1').textContent = title; document.getElementById('ov-sub').textContent = title === 'TOWER CHAOS' ? 'prototipo en 3D · estética PS1' : world.kind === 'island' ? 'la isla' : `piso ${depth}`;
    document.getElementById('ov-text').textContent = text; document.getElementById('ov-btn').textContent = btn;
}
document.getElementById('ov-btn').onclick = () => {
    audio(); surfLoop(); playMusic(world.kind === 'island' ? '../music/forest.mp3' : '../music/cave.ogg');
    if (!P.alive) { Object.assign(P, { hp: P.maxHp, mp: P.maxMp, alive: true }); depth = 0; enterIsland(); }
    overlay.style.display = 'none'; paused = false;
    canvas.requestPointerLock();
};
function showTitle(big, small) {
    const el = document.getElementById('floor-name');
    el.innerHTML = `${big}${small ? `<br><small style="font-size:16px;letter-spacing:4px">${small}</small>` : ''}`; el.style.opacity = 1;
    clearTimeout(showTitle.t); showTitle.t = setTimeout(() => { el.style.opacity = 0; }, 2600);
}

// --- CAMBIAR DE LUGAR ---
function setLevel(l) {
    if (level) scene.remove(level.group);
    level = l; scene.add(l.group);
    scene.fog = l.fog; scene.background = new THREE.Color(l.bg); camera.far = l.far; camera.updateProjectionMatrix();
    clearEnemies(); potions.forEach(o => scene.remove(o.m)); potions = []; pickups.forEach(o => scene.remove(o.g)); pickups = [];
    orbs.forEach(o => scene.remove(o.m)); orbs.length = 0;
    if (stairs) { scene.remove(stairs.group); stairs = null; }
}
function enterIsland() {
    if (!island) island = buildIsland();
    world = { kind: 'island', ground: island.ground, solid: island.solid, canSee: () => true, shotBlocked: (x, z, y) => y < island.ground(x, z) + 0.05 || (y < 5 && island.solid(x, z, 0, false)) };
    setLevel({ group: island.group, torches: island.torches, fog: new THREE.Fog(0x8c939b, 15, 270), bg: 0x8c939b, far: 420 });
    setOutdoorLight(true);
    const spots = animalSpots(island.start);
    spots.crab.forEach(p => makeEnemy('crab', p.x, p.z));
    spots.boar.forEach(p => makeEnemy('boar', p.x, p.z));
    spots.wolf.forEach((p, i) => { for (let k = 0; k < 3; k++) makeEnemy('wolf', p.x + (k - 1) * 1.4, p.z + (k % 2) * 1.2, 1, { pack: i }); });
    spawnWeaponPickup('sword', ISLE.door.x + 3.2, island.ground(ISLE.door.x + 3.2, ISLE.door.z + 3), ISLE.door.z + 3, 'stuck');
    spawnWeaponPickup('staff', island.altar.x, island.altar.y, island.altar.z + 0.01, 'altar');
    P.x = island.start.x; P.z = island.start.z; P.y = island.ground(P.x, P.z); P.yaw = Math.atan2(-(ISLE.door.x - P.x), -(ISLE.door.z - P.z)); P.face = P.yaw; P.pitch = -0.12; // mirando a la torre, un poco hacia arriba
    zoneNow = 'LA PLAYA DEL NAUFRAGIO';
    showTitle('LA ISLA', 'la playa del naufragio');
    playMusic('../music/forest.mp3');
    if (!Q.get('demo')) setTimeout(() => say('Allá, entre las nubes: la torre. El sendero sube hacia el norte.'), 1200);
}
function enterTower() {
    world = DUNGEON_WORLD;
    const { start, exit } = genDungeon();
    setLevel(buildDungeonLevel()); setOutdoorLight(false);
    const n = 6 + depth * 3, pool = depth >= 2 ? ['skeleton', 'knight', 'slime', 'automaton'] : ['skeleton', 'skeleton', 'slime', 'knight'];
    for (let i = 0; i < n; i++) {
        const r = pick(rooms.slice(1)); if (!r) break;
        const p = cellCenter(rint(r.x, r.x + r.w - 1), rint(r.y, r.y + r.h - 1));
        makeEnemy(pick(pool), p.x, p.z, 1 + 0.25 * (depth - 1));
    }
    buildStairs(exit);
    const p = cellCenter(start.cx, start.cy); P.x = p.x; P.z = p.z; P.y = 0; P.yaw = Math.random() * Math.PI * 2; P.face = P.yaw; P.pitch = 0.2;
    showTitle(`PISO ${depth}`, level.name);
    playMusic('../music/cave.ogg');
    say(depth === 1 ? 'Adentro de la torre. Buscá la escalera: la marca una runa violeta.' : `Subiste al piso ${depth}. Más oscuro, más bichos.`);
}

// --- BUCLE ---
let last = performance.now();
function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!paused) {
        clock += dt;
        updatePlayer(dt); updateSwing(); updateEnemies(dt); updateOrbs(dt); updatePickups(dt); updateHud(dt);
    } else if (Q.get('demo')) { // la demo (capturas): gira despacio la cámara alrededor del héroe
        clock += dt; if (Q.get('spin') !== '0') P.yaw += dt * 0.12; updatePlayer(0); updateEnemies(dt); updatePickups(dt);
    }
    if (island && world.kind === 'island') island.update(clock, camera.position);
    heroMesh.position.set(P.x, P.y, P.z); heroMesh.rotation.y = P.face;
    animateHero(heroMesh, P.walk, P.moveAmt, P.swing, clock < P.dashUntil);
    heroMesh.userData.mats.forEach(m => m.emissive.setRGB(P.flash > 0 ? 0.8 : 0, P.flash > 0 ? 0.1 : 0, P.flash > 0 ? 0.1 : 0));
    updateCamera(dt); updateParts(dt); updateLights(clock);
    post.render(scene, camera);
    requestAnimationFrame(loop);
}

setWeapon('stick');
if (Q.get('depth')) { depth = Math.max(1, +Q.get('depth')); enterTower(); } // &depth=N: arrancar adentro de la torre (pruebas)
else enterIsland();
showOverlay('TOWER CHAOS', 'Despertás en la arena, entre los restos de un barco. Tenés un palo. Al norte, más allá del bosque, una torre se pierde en las nubes.', 'Levantarse');
if (Q.get('demo')) {
    overlay.style.display = 'none';
    const at = Q.get('at'); // &at=forest|tower|altar: mover al héroe para las capturas
    if (at === 'tower') { P.x = ISLE.door.x + 2; P.z = ISLE.door.z + 5; }
    if (at === 'forest') { P.x = 2; P.z = 30; }
    if (at === 'altar') { P.x = island.altar.x + 4; P.z = island.altar.z + 5; }
    if (Q.get('weapon')) { P.owned = ['stick', 'sword', 'staff']; setWeapon(Q.get('weapon')); }
}
function spawnAt(type, x, z) { return makeEnemy(type, x, z); } // para pruebas y capturas
window.__game = { frameMs() { const t = performance.now(); post.render(scene, camera); renderer.getContext().finish(); return performance.now() - t; }, DEBUG, P, enemies: () => enemies, attack, setWeapon, castOrb, enterIsland, enterTower, spawnAt, scene, camera, island: () => island, world: () => world, get depth() { return depth; }, set depth(v) { depth = v; } };
requestAnimationFrame(loop);
