// Tower Chaos 3D — prototipo en primera persona con estética PS1 (referencia: Lunacid, King's Field). 2026-10-08.
//
//   Qué prueba este prototipo: si Tower Chaos se siente bien en 3D low poly antes de decidir nada sobre el juego entero.
//   · Look PS1: se dibuja a 320 px de ancho y se agranda sin suavizar; texturas pixeladas hechas con código; los vértices
//     se "pegan" a una grilla de pantalla (el temblor típico de PS1); niebla espesa; antorchas que parpadean.
//   · Mazmorra generada al azar (salas + pasillos) en una grilla; cada piso más oscuro y con más bichos.
//   · Espada: combo de 3 tajos, el tercero pega doble y empuja (como en la Torre). Bastón: orbe que explota, gasta maná.
//   · Enemigos que AVISAN antes de pegar (se ponen rojos y se agrandan): si te corrés o esquivás, fallan.
//   · Esquive con Espacio (invulnerable un instante), pociones, escalera al piso siguiente.

import * as THREE from 'three';

const CFG = { cell: 2, wallH: 3.2, grid: 41, renderW: 320, snap: 110, eye: 1.55, radius: 0.3, maxLights: 6 };
const Q = new URLSearchParams(location.search);
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];

// --- RENDER (baja resolución, sin suavizar) ---
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.05, 60);
camera.rotation.order = 'YXZ';
scene.add(camera);
function resize() {
    const w = CFG.renderW, h = Math.round(w * innerHeight / innerWidth);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// El temblor de PS1: los vértices se redondean a una grilla de pantalla
function ps1(mat) {
    mat.onBeforeCompile = sh => {
        sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
            vec4 ps1p = gl_Position; ps1p.xyz /= ps1p.w;
            ps1p.xy = floor(ps1p.xy * ${CFG.snap.toFixed(1)}) / ${CFG.snap.toFixed(1)};
            ps1p.xyz *= ps1p.w; gl_Position = ps1p;`);
    };
    return mat;
}
const lambert = (opts) => ps1(new THREE.MeshLambertMaterial(opts));

// --- TEXTURAS PIXELADAS HECHAS CON CÓDIGO ---
function makeTex(draw, size = 32) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); draw(g, size);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    return t;
}
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
function noise(g, s, base, amt, n) { for (let i = 0; i < n; i++) { g.fillStyle = shade(base, 1 + (Math.random() - 0.5) * amt); g.fillRect(rint(0, s - 1), rint(0, s - 1), 1, 1); } }
const PALETTES = [ // por piso: piedra, piso, musgo/acento, niebla
    { wall: '#5b544c', floor: '#47423c', accent: '#4f6b3a', fog: 0x0c0f0c, name: 'LAS RAÍCES' },
    { wall: '#4e5458', floor: '#3c4246', accent: '#3d5d6e', fog: 0x0a0d12, name: 'LOS POZOS' },
    { wall: '#5a4a44', floor: '#45372f', accent: '#7a3b2a', fog: 0x110908, name: 'LA FRAGUA HUNDIDA' },
    { wall: '#4a4458', floor: '#363044', accent: '#5e4a8a', fog: 0x0b0812, name: 'EL OSARIO' }
];
function wallTex(p) {
    return makeTex((g, s) => {
        g.fillStyle = shade(p.wall, 0.55); g.fillRect(0, 0, s, s); // la junta
        for (let row = 0; row < 4; row++) for (let col = -1; col < 3; col++) {
            const x = col * 12 + (row % 2 ? 6 : 0), y = row * 8;
            g.fillStyle = shade(p.wall, 0.85 + Math.random() * 0.3); g.fillRect(x + 1, y + 1, 10, 6);
        }
        noise(g, s, p.wall, 0.5, 90);
        for (let i = 0; i < 14; i++) { g.fillStyle = shade(p.accent, 0.8 + Math.random() * 0.4); g.fillRect(rint(0, s - 1), rint(22, s - 1), 1, rint(1, 3)); } // musgo abajo
    });
}
function floorTex(p) {
    return makeTex((g, s) => {
        g.fillStyle = shade(p.floor, 0.6); g.fillRect(0, 0, s, s);
        [[0, 0], [16, 0], [0, 16], [16, 16]].forEach(([x, y]) => { g.fillStyle = shade(p.floor, 0.85 + Math.random() * 0.3); g.fillRect(x + 1, y + 1, 14, 14); });
        noise(g, s, p.floor, 0.6, 120);
        g.fillStyle = shade(p.floor, 0.45); for (let i = 0; i < 6; i++) g.fillRect(rint(2, 29), rint(2, 29), rint(1, 4), 1); // grietas
    });
}
function ceilTex(p) { return makeTex((g, s) => { g.fillStyle = shade(p.wall, 0.4); g.fillRect(0, 0, s, s); noise(g, s, p.wall, 0.5, 160); }); }

// --- SONIDO (sintetizado, como en el juego en 2D) ---
let ac = null, music = null;
function audio() { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); return ac; }
function tone(f0, f1, dur, type = 'square', vol = 0.08) {
    if (!ac) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur);
}
function hiss(dur, freq, vol = 0.12) {
    if (!ac) return; const t = ac.currentTime, len = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f).connect(g).connect(ac.destination); s.start(t);
}
const SFX = {
    swing: () => hiss(0.12, 2400, 0.1), hit: () => { hiss(0.08, 900, 0.18); tone(160, 70, 0.1, 'square', 0.06); }, big: () => { hiss(0.2, 500, 0.25); tone(110, 40, 0.25, 'sawtooth', 0.1); },
    orb: () => tone(400, 1300, 0.2, 'sine', 0.08), boom: () => { hiss(0.3, 400, 0.22); tone(90, 40, 0.3, 'sine', 0.15); },
    warn: () => tone(220, 330, 0.18, 'triangle', 0.04), hurt: () => { tone(200, 80, 0.25, 'sawtooth', 0.1); hiss(0.15, 700, 0.12); },
    potion: () => [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, f, 0.12, 'triangle', 0.06), i * 70)), dash: () => hiss(0.15, 1500, 0.1),
    stairs: () => [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, f * 0.98, 0.25, 'triangle', 0.08), i * 120))
};
function startMusic() {
    if (music) return;
    music = new Audio('../music/cave.ogg'); music.loop = true; music.volume = 0.35; music.play().catch(() => { /* sin permiso todavía */ });
}

// --- MAZMORRA ---
let grid = null, rooms = [], depth = 1, level = null;
function solid(x, z) {
    const cx = Math.floor(x / CFG.cell), cz = Math.floor(z / CFG.cell);
    return cx < 0 || cz < 0 || cx >= CFG.grid || cz >= CFG.grid || grid[cz][cx] === 0;
}
function genDungeon() {
    const N = CFG.grid; grid = Array.from({ length: N }, () => new Uint8Array(N)); rooms = [];
    for (let t = 0; t < 400 && rooms.length < 9 + Math.min(depth, 4); t++) {
        const w = rint(3, 7), h = rint(3, 7), x = rint(1, N - w - 2), y = rint(1, N - h - 2);
        if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
        rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
        for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j][i] = 1;
    }
    const carve = (a, b) => { // pasillo en L
        let x = a.cx, y = a.cy; const hFirst = Math.random() < 0.5;
        const stepX = () => { while (x !== b.cx) { grid[y][x] = 1; x += Math.sign(b.cx - x); } };
        const stepY = () => { while (y !== b.cy) { grid[y][x] = 1; y += Math.sign(b.cy - y); } };
        if (hFirst) { stepX(); stepY(); } else { stepY(); stepX(); } grid[y][x] = 1;
    };
    rooms.sort((a, b) => a.cx - b.cx);
    for (let i = 1; i < rooms.length; i++) carve(rooms[i - 1], rooms[i]);
    for (let k = 0; k < 3; k++) carve(pick(rooms), pick(rooms)); // algunos lazos
    // Distancias desde la sala de inicio: la salida va en la más lejana
    const start = rooms[0], dist = Array.from({ length: N }, () => new Int32Array(N).fill(-1)), q = [[start.cx, start.cy]];
    dist[start.cy][start.cx] = 0;
    while (q.length) { const [x, y] = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (grid[ny] && grid[ny][nx] && dist[ny][nx] < 0) { dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]); } }); }
    const exit = rooms.reduce((a, r) => (dist[r.cy][r.cx] > dist[a.cy][a.cx] ? r : a), rooms[1] || start);
    return { start, exit };
}
const cellCenter = (cx, cz) => ({ x: (cx + 0.5) * CFG.cell, z: (cz + 0.5) * CFG.cell });

// Construye las paredes (instanciadas), el piso, el techo y las antorchas
function buildLevel() {
    if (level) { scene.remove(level.group); level.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    const pal = PALETTES[(depth - 1) % PALETTES.length], N = CFG.grid, C = CFG.cell, group = new THREE.Group();
    scene.fog = new THREE.FogExp2(pal.fog, 0.09 + 0.012 * depth);
    scene.background = new THREE.Color(pal.fog);
    const walls = [];
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
        if (grid[z][x]) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => grid[z + dz] && grid[z + dz][x + dx])) walls.push([x, z]);
    }
    const wallGeo = new THREE.BoxGeometry(C, CFG.wallH, C);
    const wallMesh = new THREE.InstancedMesh(wallGeo, lambert({ map: wallTex(pal) }), walls.length);
    const m = new THREE.Matrix4();
    walls.forEach(([x, z], i) => { m.makeTranslation((x + 0.5) * C, CFG.wallH / 2, (z + 0.5) * C); wallMesh.setMatrixAt(i, m); });
    group.add(wallMesh);
    const ft = floorTex(pal); ft.repeat.set(N, N);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(N * C, N * C, N, N), lambert({ map: ft }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(N * C / 2, 0, N * C / 2); group.add(floor);
    const ct = ceilTex(pal); ct.repeat.set(N, N);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(N * C, N * C, N, N), lambert({ map: ct }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(N * C / 2, CFG.wallH, N * C / 2); group.add(ceil);
    // Antorchas en las paredes de cada sala
    const torches = [];
    rooms.forEach(r => {
        for (let k = 0; k < 2; k++) {
            for (let t = 0; t < 20; t++) {
                const side = rint(0, 3), x = side < 2 ? rint(r.x, r.x + r.w - 1) : side === 2 ? r.x - 1 : r.x + r.w, z = side >= 2 ? rint(r.y, r.y + r.h - 1) : side === 0 ? r.y - 1 : r.y + r.h;
                if (!grid[z] || grid[z][x] !== 0) continue;
                const nx = side === 2 ? 1 : side === 3 ? -1 : 0, nz = side === 0 ? 1 : side === 1 ? -1 : 0; // hacia la sala
                const p = cellCenter(x, z), pos = new THREE.Vector3(p.x + nx * C * 0.5, 1.9, p.z + nz * C * 0.5);
                if (torches.some(o => o.pos.distanceTo(pos) < 3)) continue;
                const stick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), lambert({ color: 0x3a2a1a }));
                stick.position.copy(pos).add(new THREE.Vector3(nx * 0.12, -0.15, nz * 0.12)); stick.rotation.set(nz * 0.5, 0, -nx * 0.5);
                const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 5), new THREE.MeshBasicMaterial({ color: 0xffb04a, fog: false }));
                flame.position.copy(pos).add(new THREE.Vector3(nx * 0.2, 0.15, nz * 0.2));
                group.add(stick, flame);
                torches.push({ pos: flame.position.clone(), flame, seed: Math.random() * 10 });
                break;
            }
        }
    });
    scene.add(group);
    level = { group, torches };
}

// Luces: unas pocas reales que se asignan a las antorchas más cercanas (muchas luces matan el rendimiento)
const torchLights = Array.from({ length: CFG.maxLights }, () => { const l = new THREE.PointLight(0xff9a4a, 0, 9, 1.4); scene.add(l); return l; });
const playerLight = new THREE.PointLight(0xffd9a0, 1.5, 7.5, 1.5); camera.add(playerLight);
scene.add(new THREE.AmbientLight(0x3a3a46, 0.55));
function updateLights(t) {
    const near = level.torches.map(o => ({ o, d: o.pos.distanceToSquared(camera.position) })).sort((a, b) => a.d - b.d).slice(0, CFG.maxLights);
    torchLights.forEach((l, i) => {
        const n = near[i];
        if (!n) { l.intensity = 0; return; }
        const f = 1 + 0.15 * Math.sin(t * 9 + n.o.seed) + 0.08 * Math.sin(t * 23 + n.o.seed * 2);
        l.position.copy(n.o.pos); l.intensity = 2.4 * f;
        n.o.flame.scale.set(1, f, 1);
    });
}

// --- EL JUGADOR ---
const P = { x: 0, z: 0, yaw: 0, pitch: 0, hp: 100, maxHp: 100, mp: 60, maxMp: 60, weapon: 'sword', atkCd: 0, swing: null, combo: 0, comboAt: -9, dashCd: 0, dashUntil: 0, invuln: 0, alive: true, bob: 0 };
const keys = {};
let locked = false, paused = true, clock = 0;
addEventListener('keydown', e => {
    const k = e.key.toLowerCase(); keys[k] = true;
    if (paused) return;
    if (k === '1') setWeapon('sword');
    if (k === '2') setWeapon('staff');
    if (k === ' ') { e.preventDefault(); dash(); }
    if (k === 'e') interact();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('mousemove', e => {
    if (!locked) return;
    P.yaw -= e.movementX * 0.0022; P.pitch = Math.max(-1.2, Math.min(1.2, P.pitch - e.movementY * 0.0022));
});
addEventListener('mousedown', e => { if (!paused && locked && e.button === 0) attack(); });
document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    if (!locked && P.alive && !Q.get('demo')) showOverlay('PAUSA', 'La torre espera.', 'Seguir');
});
function forward() { return new THREE.Vector3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); }

function moveP(dx, dz) {
    const r = CFG.radius, hit = (x, z) => solid(x - r, z - r) || solid(x + r, z - r) || solid(x - r, z + r) || solid(x + r, z + r);
    if (!hit(P.x + dx, P.z)) P.x += dx;
    if (!hit(P.x, P.z + dz)) P.z += dz;
}
function updatePlayer(dt) {
    if (!P.alive) return;
    const f = forward(), r = new THREE.Vector3(-f.z, 0, f.x);
    let mx = 0, mz = 0;
    if (keys.w) { mx += f.x; mz += f.z; } if (keys.s) { mx -= f.x; mz -= f.z; }
    if (keys.d) { mx += r.x; mz += r.z; } if (keys.a) { mx -= r.x; mz -= r.z; }
    const len = Math.hypot(mx, mz), dashing = clock < P.dashUntil;
    if (dashing) { moveP(P.dashDx * 11 * dt, P.dashDz * 11 * dt); }
    else if (len > 0) {
        const sp = (keys.shift ? 5 : 3.3) * dt / len;
        moveP(mx * sp, mz * sp); P.bob += dt * (keys.shift ? 12 : 8);
    }
    P.mp = Math.min(P.maxMp, P.mp + 3 * dt);
    P.atkCd -= dt; P.dashCd -= dt;
    camera.position.set(P.x, CFG.eye + Math.sin(P.bob) * 0.045, P.z);
    camera.rotation.set(P.pitch, P.yaw, 0);
}
function dash() {
    if (P.dashCd > 0 || !P.alive) return;
    const f = forward(), r = new THREE.Vector3(-f.z, 0, f.x);
    let dx = 0, dz = 0; if (keys.w) { dx += f.x; dz += f.z; } if (keys.s) { dx -= f.x; dz -= f.z; } if (keys.d) { dx += r.x; dz += r.z; } if (keys.a) { dx -= r.x; dz -= r.z; }
    if (!dx && !dz) { dx = -f.x; dz = -f.z; } // sin dirección: para atrás
    const l = Math.hypot(dx, dz); P.dashDx = dx / l; P.dashDz = dz / l;
    P.dashUntil = clock + 0.18; P.invuln = clock + 0.3; P.dashCd = 0.9; SFX.dash();
}

// --- LAS ARMAS (el modelo en la mano) ---
const hand = new THREE.Group(); camera.add(hand); hand.scale.setScalar(0.62); // chica, en la esquina (como en Lunacid)
function buildSword() {
    const g = new THREE.Group(), steel = new THREE.MeshLambertMaterial({ color: 0xb8b8c0, emissive: 0x111118 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, 0.02), steel); blade.position.y = 0.36;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 4), steel); tip.position.y = 0.72;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.05), new THREE.MeshLambertMaterial({ color: 0x8a6a2a }));
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.04), new THREE.MeshLambertMaterial({ color: 0x3a2214 })); grip.position.y = -0.09;
    g.add(blade, tip, guard, grip); g.rotation.set(-0.55, 0.2, -0.45);
    return g;
}
function buildStaff() {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.95, 5), new THREE.MeshLambertMaterial({ color: 0x4a3220 })); pole.position.y = 0.2;
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: 0xb48cff })); orb.position.y = 0.72;
    const claw = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 3, 6), new THREE.MeshLambertMaterial({ color: 0x6a5a3a })); claw.position.y = 0.7; claw.rotation.x = Math.PI / 2;
    g.add(pole, orb, claw); g.rotation.set(-0.25, 0, -0.15); g.userData.orb = orb;
    return g;
}
const WEAPONS = { sword: { name: 'Espada', model: buildSword() }, staff: { name: 'Bastón', model: buildStaff() } };
function setWeapon(w) {
    P.weapon = w; hand.clear(); hand.add(WEAPONS[w].model);
    document.getElementById('weapon-name').textContent = WEAPONS[w].name + (w === 'staff' ? ' · 12 maná' : ' · combo');
}
function attack() {
    if (P.atkCd > 0 || !P.alive) return;
    if (P.weapon === 'sword') {
        if (clock - P.comboAt > 0.9) P.combo = 0;
        const step = P.combo; P.combo = (P.combo + 1) % 3; P.comboAt = clock;
        P.swing = { at: clock, dur: step === 2 ? 0.42 : 0.3, step, done: false };
        P.atkCd = step === 2 ? 0.6 : 0.28; SFX.swing();
    } else {
        if (P.mp < 12) { say('No te alcanza el maná.'); return; }
        P.mp -= 12; P.atkCd = 0.55; P.swing = { at: clock, dur: 0.25, step: -1, done: true }; castOrb(); SFX.orb();
    }
}
function updateHand() {
    const s = P.swing, model = hand.children[0];
    if (!model) return;
    hand.position.set(0.34 + Math.cos(P.bob * 0.5) * 0.01, -0.36 + Math.abs(Math.sin(P.bob * 0.5)) * 0.012, -0.62);
    hand.rotation.set(0, 0, 0);
    if (!s) return;
    const t = (clock - s.at) / s.dur;
    if (t >= 1) { P.swing = null; return; }
    if (s.step < 0) { hand.position.z += Math.sin(t * Math.PI) * 0.12; hand.rotation.x = -Math.sin(t * Math.PI) * 0.4; return; } // empuje del bastón
    const dir = s.step === 1 ? -1 : 1, k = Math.sin(t * Math.PI);
    hand.rotation.z = dir * (1.2 - 2.4 * t) * (s.step === 2 ? 1.2 : 1); hand.rotation.x = -0.6 * k; hand.position.x -= 0.15 * k * dir;
    if (!s.done && t > 0.35) { s.done = true; swordHit(s.step); }
}
function swordHit(step) {
    const f = forward(), mult = step === 2 ? 2 : 1;
    let any = false;
    enemies.forEach(e => {
        if (!e.alive) return;
        const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
        if (d > 2.4 || (dx * f.x + dz * f.z) / (d || 1) < 0.55) return;
        const crit = Math.random() < 0.1;
        hurtEnemy(e, Math.round((16 + rint(0, 6)) * mult * (crit ? 2 : 1)), dx / d, dz / d, step === 2 ? 1.6 : 0.5);
        any = true;
    });
    if (any) (step === 2 ? SFX.big : SFX.hit)();
}

// --- ORBES DEL BASTÓN ---
const orbs = [];
function castOrb() {
    const f = new THREE.Vector3(); camera.getWorldDirection(f);
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), new THREE.MeshBasicMaterial({ color: 0xc8a8ff }));
    m.position.copy(camera.position).add(f.clone().multiplyScalar(0.6)).add(new THREE.Vector3(0, -0.15, 0));
    scene.add(m); orbs.push({ m, v: f.multiplyScalar(13), life: 2.5 });
}
function updateOrbs(dt) {
    for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i]; o.life -= dt; o.m.position.addScaledVector(o.v, dt); o.m.rotation.x += dt * 8;
        const p = o.m.position, hitWall = solid(p.x, p.z) || p.y < 0.05 || p.y > CFG.wallH - 0.05;
        const hitE = enemies.find(e => e.alive && Math.hypot(e.x - p.x, e.z - p.z) < 0.6 && p.y < e.h + 0.2);
        if (hitWall || hitE || o.life <= 0) {
            enemies.forEach(e => { const d = Math.hypot(e.x - p.x, e.z - p.z); if (e.alive && d < 1.8) hurtEnemy(e, Math.round(e === hitE ? 30 : 16), (e.x - p.x) / (d || 1), (e.z - p.z) / (d || 1), 0.8); });
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
        parts.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 4, (Math.random() - 0.5) * 4), life: 0.6 + Math.random() * 0.5 });
    }
}
function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life -= dt; p.v.y -= 9 * dt; p.m.position.addScaledVector(p.v, dt);
        if (p.m.position.y < 0.04) { p.m.position.y = 0.04; p.v.multiplyScalar(0.4); }
        if (p.life <= 0) { scene.remove(p.m); parts.splice(i, 1); }
    }
}

// --- ENEMIGOS (avisan antes de pegar) ---
const ENEMY_TYPES = {
    skeleton: { name: 'Esqueleto', hp: 42, speed: 1.9, dmg: 12, reach: 1.7, windup: 0.55, h: 1.7 },
    slime: { name: 'Limo', hp: 30, speed: 1.4, dmg: 8, reach: 1.3, windup: 0.45, h: 0.7 },
    brute: { name: 'Bruto de piedra', hp: 90, speed: 1.3, dmg: 22, reach: 2.0, windup: 0.85, h: 2.2 }
};
let enemies = [];
function buildEnemyMesh(type) {
    const g = new THREE.Group(), mats = [];
    const box = (w, h, d, color, x, y, z) => { const mat = lambert({ color }); mats.push(mat); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; };
    if (type === 'skeleton') {
        box(0.32, 0.55, 0.2, 0xd8d0b8, 0, 1.05, 0); box(0.26, 0.26, 0.26, 0xe8e0c8, 0, 1.5, 0);
        box(0.1, 0.65, 0.1, 0xd0c8b0, -0.1, 0.4, 0); box(0.1, 0.65, 0.1, 0xd0c8b0, 0.1, 0.4, 0);
        const arm = box(0.09, 0.55, 0.09, 0xd0c8b0, 0.24, 1.0, 0); g.userData.arm = arm;
        box(0.09, 0.5, 0.09, 0xc8c0a8, -0.24, 1.02, 0); // el otro brazo
        [1.18, 1.04, 0.9].forEach(y => box(0.36, 0.04, 0.22, 0x8a8270, 0, y, 0)); // costillas
        box(0.2, 0.06, 0.22, 0xc8c0a8, 0, 1.36, -0.02); // mandíbula
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0x440000 })); eye.position.set(0, 1.52, -0.14); g.add(eye); g.userData.eye = eye;
    } else if (type === 'slime') {
        const mat = lambert({ color: 0x5f9a3a, transparent: true, opacity: 0.9 }); mats.push(mat);
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), mat); m.position.y = 0.35; m.scale.y = 0.75; g.add(m); g.userData.body = m;
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0x102008 })); eye.position.set(0, 0.45, -0.38); g.add(eye); g.userData.eye = eye;
    } else {
        box(0.7, 0.8, 0.45, 0x6a6460, 0, 1.3, 0); box(0.4, 0.35, 0.35, 0x5a5450, 0, 1.9, 0);
        box(0.22, 0.85, 0.22, 0x5e5854, -0.22, 0.45, 0); box(0.22, 0.85, 0.22, 0x5e5854, 0.22, 0.45, 0);
        const arm = box(0.24, 0.8, 0.24, 0x6e6864, 0.5, 1.25, 0); g.userData.arm = arm;
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: 0x441800 })); eye.position.set(0, 1.93, -0.18); g.add(eye); g.userData.eye = eye;
    }
    g.userData.mats = mats;
    return g;
}
function spawnEnemies(exitRoom) {
    enemies.forEach(e => scene.remove(e.mesh)); enemies = [];
    const n = 6 + depth * 3, pool = depth >= 2 ? ['skeleton', 'skeleton', 'slime', 'brute'] : ['skeleton', 'slime', 'slime'];
    for (let i = 0; i < n; i++) {
        const r = pick(rooms.slice(1)); if (!r) break;
        const t = pick(pool), T = ENEMY_TYPES[t], p = cellCenter(rint(r.x, r.x + r.w - 1), rint(r.y, r.y + r.h - 1));
        const hpMult = 1 + 0.25 * (depth - 1), mesh = buildEnemyMesh(t);
        mesh.position.set(p.x, 0, p.z); scene.add(mesh);
        enemies.push({ type: t, T, x: p.x, z: p.z, hp: Math.round(T.hp * hpMult), maxHp: Math.round(T.hp * hpMult), alive: true, mesh, h: T.h, state: 'idle', wind: 0, cd: 0, flash: 0, kx: 0, kz: 0, hop: Math.random() * 6 });
    }
}
function canSeeP(e) { // línea de vista por la grilla
    const steps = Math.ceil(Math.hypot(P.x - e.x, P.z - e.z) / 0.5);
    for (let i = 1; i < steps; i++) { const t = i / steps; if (solid(e.x + (P.x - e.x) * t, e.z + (P.z - e.z) * t)) return false; }
    return true;
}
function updateEnemies(dt) {
    enemies.forEach(e => {
        if (!e.alive) return;
        const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz), T = e.T;
        e.cd -= dt; e.flash -= dt;
        // empujón recibido
        if (e.kx || e.kz) { const r = 0.35; const nx = e.x + e.kx * dt * 6, nz = e.z + e.kz * dt * 6; if (!solid(nx, e.z) && !solid(nx + Math.sign(e.kx) * r, e.z)) e.x = nx; if (!solid(e.x, nz) && !solid(e.x, nz + Math.sign(e.kz) * r)) e.z = nz; e.kx *= Math.pow(0.02, dt); e.kz *= Math.pow(0.02, dt); if (Math.abs(e.kx) + Math.abs(e.kz) < 0.05) e.kx = e.kz = 0; }
        if (e.state === 'idle' && P.alive && d < 11 && canSeeP(e)) { e.state = 'chase'; if (Math.random() < 0.4) say(`${T.name} te vio.`); }
        if (e.state === 'chase' && P.alive) {
            if (d < T.reach && e.cd <= 0) { e.state = 'wind'; e.wind = T.windup; SFX.warn(); }
            else if (d > T.reach * 0.8) {
                const sp = T.speed * dt / d, r = 0.35; let nx = e.x + dx * sp, nz = e.z + dz * sp;
                enemies.forEach(o => { if (o !== e && o.alive) { const ox = e.x - o.x, oz = e.z - o.z, od = Math.hypot(ox, oz); if (od < 0.8 && od > 0) { nx += ox / od * dt; nz += oz / od * dt; } } }); // no se apilan
                if (!solid(nx + Math.sign(dx) * r, e.z)) e.x = nx;
                if (!solid(e.x, nz + Math.sign(dz) * r)) e.z = nz;
            }
        } else if (e.state === 'wind') {
            e.wind -= dt;
            if (e.wind <= 0) { // ¡pega! si seguís en su alcance y no esquivaste
                e.state = 'chase'; e.cd = 1.1;
                if (P.alive && d < T.reach + 0.45 && clock > P.invuln) hurtPlayer(Math.round(T.dmg * (1 + 0.2 * (depth - 1))), e);
                else if (P.alive && d < T.reach + 1.2) burst(new THREE.Vector3(e.x + dx / d * 0.8, 1, e.z + dz / d * 0.8), 0x8a8070, 5); // al aire
            }
        }
        // Dibujo: mira al jugador; el aviso lo pone rojo, lo agranda y le prende los ojos
        const m = e.mesh; m.position.set(e.x, 0, e.z); m.rotation.y = Math.atan2(-dx, -dz);
        const w = e.state === 'wind' ? 1 - e.wind / T.windup : 0;
        if (e.type === 'slime') { e.hop += dt * (e.state === 'chase' ? 7 : 2); m.userData.body.position.y = 0.35 + Math.abs(Math.sin(e.hop)) * 0.12; m.userData.body.scale.set(1 + w * 0.3, 0.75 + w * 0.35, 1 + w * 0.3); }
        if (m.userData.arm) m.userData.arm.rotation.x = -2.4 * w;
        m.userData.eye.material.color.setHex(w > 0 ? 0xff2a1a : (e.state === 'chase' ? 0xa01810 : 0x440000));
        const glow = w * w * 0.45; // el aviso se enciende de a poco: rojo fuerte recién al final
        m.userData.mats.forEach(mat => mat.emissive.setRGB(e.flash > 0 ? 0.9 : glow, e.flash > 0 ? 0.9 : 0, e.flash > 0 ? 0.9 : 0));
        m.scale.setScalar(1 + w * 0.08);
    });
}
function hurtEnemy(e, dmg, ux, uz, push) {
    e.hp -= dmg; e.flash = 0.1; e.kx = ux * push * 3; e.kz = uz * push * 3;
    if (e.state === 'idle') e.state = 'chase';
    if (e.state === 'wind' && push >= 1.5) { e.state = 'chase'; e.cd = 0.8; say('¡Lo interrumpiste!'); } // el remate corta su golpe
    burst(new THREE.Vector3(e.x, e.h * 0.6, e.z), e.type === 'slime' ? 0x6fb04a : 0xd8d0b8, 4);
    if (e.hp <= 0) {
        e.alive = false; scene.remove(e.mesh); burst(new THREE.Vector3(e.x, e.h * 0.5, e.z), e.type === 'slime' ? 0x5f9a3a : 0xc8c0a8, 18);
        if (Math.random() < 0.35) spawnPotion(e.x, e.z);
        if (enemies.every(o => !o.alive)) say('El piso quedó en silencio.');
    }
}
function hurtPlayer(dmg, src) {
    P.hp -= dmg; SFX.hurt();
    const el = document.getElementById('hurt'); el.style.transition = 'none'; el.style.opacity = 0.9; requestAnimationFrame(() => { el.style.transition = 'opacity 0.6s'; el.style.opacity = 0; });
    if (P.hp <= 0) { P.hp = 0; P.alive = false; document.exitPointerLock(); showOverlay('MORISTE', `${src.T.name} te mató en el piso −${depth}. La torre te devuelve al fondo.`, 'Renacer'); }
}

// --- POCIONES Y ESCALERA ---
let potions = [], stairs = null;
function spawnPotion(x, z) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xd8203a }));
    m.position.set(x, 0.5, z); scene.add(m); potions.push({ m, x, z });
}
function buildStairs(room) {
    if (stairs) scene.remove(stairs.group);
    const g = new THREE.Group(), p = cellCenter(room.cx, room.cy);
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ color: 0x020203 })); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.01; g.add(hole);
    for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.6 - i * 0.3, 0.06, 0.3), lambert({ color: 0x55504a })); s.position.set(0, 0.03 - i * 0.02, -0.6 + i * 0.32); g.add(s); }
    const rune = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 8), new THREE.MeshBasicMaterial({ color: 0x7b6cf6, side: THREE.DoubleSide })); rune.rotation.x = -Math.PI / 2; rune.position.y = 0.02; g.add(rune);
    g.position.set(p.x, 0, p.z); scene.add(g);
    stairs = { group: g, rune, x: p.x, z: p.z };
}
function interact() {
    const pIdx = potions.findIndex(o => Math.hypot(o.x - P.x, o.z - P.z) < 1.3);
    if (pIdx >= 0) { drink(pIdx); return; }
    if (stairs && Math.hypot(stairs.x - P.x, stairs.z - P.z) < 1.4) { SFX.stairs(); depth++; newFloor(); }
}
function drink(i) { const o = potions[i]; scene.remove(o.m); potions.splice(i, 1); P.hp = Math.min(P.maxHp, P.hp + 35); SFX.potion(); say('Tomaste una poción (+35 vida).'); }
function updatePickups(dt) {
    potions.forEach(o => { o.m.rotation.y += dt * 2; o.m.position.y = 0.5 + Math.sin(clock * 3 + o.x) * 0.06; });
    for (let i = potions.length - 1; i >= 0; i--) if (Math.hypot(potions[i].x - P.x, potions[i].z - P.z) < 0.6 && P.hp < P.maxHp) drink(i); // pasando por encima
    if (stairs) { stairs.rune.rotation.z += dt * 0.6; stairs.rune.material.color.setHSL(0.7, 0.8, 0.55 + 0.15 * Math.sin(clock * 3)); }
}

// --- INTERFAZ ---
const logBox = document.getElementById('log');
function say(text) {
    const d = document.createElement('div'); d.textContent = text; logBox.appendChild(d);
    while (logBox.children.length > 5) logBox.firstChild.remove();
    setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 1000); }, 4500);
}
function updateHud() {
    document.getElementById('hp-fill').style.width = `${100 * P.hp / P.maxHp}%`;
    document.getElementById('hp-text').textContent = `${Math.ceil(P.hp)} / ${P.maxHp}`;
    document.getElementById('mp-fill').style.width = `${100 * P.mp / P.maxMp}%`;
    document.getElementById('mp-text').textContent = `${Math.floor(P.mp)} / ${P.maxMp}`;
    const near = (potions.some(o => Math.hypot(o.x - P.x, o.z - P.z) < 1.3) && 'E: tomar la poción') || (stairs && Math.hypot(stairs.x - P.x, stairs.z - P.z) < 1.4 && 'E: bajar la escalera');
    document.getElementById('crosshair').textContent = near ? '◇' : '·';
    document.getElementById('crosshair').title = near || '';
    if (near && near !== updateHud.last) say(near); updateHud.last = near;
}
const overlay = document.getElementById('overlay');
function showOverlay(title, text, btn) {
    paused = true; overlay.style.display = 'flex';
    overlay.querySelector('h1').textContent = title; document.getElementById('ov-sub').textContent = title === 'TOWER CHAOS' ? 'prototipo en 3D · estética PS1' : `piso −${depth}`;
    document.getElementById('ov-text').textContent = text; document.getElementById('ov-btn').textContent = btn;
}
document.getElementById('ov-btn').onclick = () => {
    audio(); startMusic();
    if (!P.alive) { depth = 1; Object.assign(P, { hp: P.maxHp, mp: P.maxMp, alive: true }); newFloor(); }
    overlay.style.display = 'none'; paused = false;
    canvas.requestPointerLock();
};
function showFloorName() {
    const el = document.getElementById('floor-name'), pal = PALETTES[(depth - 1) % PALETTES.length];
    el.innerHTML = `PISO −${depth}<br><small style="font-size:16px;letter-spacing:4px">${pal.name}</small>`; el.style.opacity = 1;
    setTimeout(() => { el.style.opacity = 0; }, 2600);
}

// --- UN PISO NUEVO ---
function newFloor() {
    const { start, exit } = genDungeon();
    buildLevel(); spawnEnemies(exit); buildStairs(exit);
    potions.forEach(o => scene.remove(o.m)); potions = [];
    const p = cellCenter(start.cx, start.cy); P.x = p.x; P.z = p.z; P.yaw = Math.random() * Math.PI * 2; P.pitch = 0;
    showFloorName();
    say(depth === 1 ? 'Buscá la escalera: la marca una runa violeta en el suelo.' : `Bajaste al piso −${depth}. Más oscuro, más bichos.`);
}

// --- BUCLE ---
let last = performance.now();
function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!paused) {
        clock += dt;
        updatePlayer(dt); updateEnemies(dt); updateOrbs(dt); updatePickups(dt); updateHud();
    } else if (Q.get('demo')) { // la demo (capturas): gira despacio la cámara
        clock += dt; P.yaw += dt * 0.15; updatePlayer(0); updateEnemies(dt);
    }
    updateHand(); updateParts(dt); updateLights(clock);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
}

setWeapon('sword');
newFloor();
showOverlay('TOWER CHAOS', 'Despertás en el fondo de la torre. Solo tenés una espada, un bastón y la oscuridad.', 'Entrar');
if (Q.get('demo')) { overlay.style.display = 'none'; if (Q.get('weapon') === 'staff') setWeapon('staff'); }
window.__game = { P, enemies: () => enemies, attack, setWeapon, castOrb, newFloor, scene, camera, get depth() { return depth; } }; // para depurar
requestAnimationFrame(loop);
