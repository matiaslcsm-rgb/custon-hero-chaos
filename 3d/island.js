// Tower Chaos 3D — la isla del comienzo (2026-10-08).
//   Pedido: "que el jugador arranque en el exterior, en una isla con océano y playa; de la playa un bosque frondoso y a la
//   distancia una torre; el cielo nublado y la torre se pierde en las nubes".
//   · Terreno con una función de altura (ruido) que vale para el dibujo Y para caminar: lo que ves es lo que pisás.
//   · Sur: la playa del naufragio (donde despertás). Centro: el bosque, con un sendero que serpentea hacia el norte.
//     Norte: la explanada de la torre. Al oeste, fuera del sendero, un claro con ruinas (premio por explorar).
//   · La torre mide 300 m: tres capas de nubes la tapan a partir de los 55 m.
//   · Todo instanciado (árboles, arbustos, pasto, rocas) para que entren miles sin trabar.

import * as THREE from 'three';
import { lambert, makeTex, shade, noise, rint } from './ps1.js';

// --- RUIDO (determinista: la misma isla siempre, así se aprende el camino) ---
function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z) { return vnoise(x, z) * 0.55 + vnoise(x * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, z * 4.3) * 0.15; }
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// --- LA FORMA DE LA ISLA ---
export const ISLE = {
    rx: 62, rz: 100, cz: -5,          // elipse (más larga de sur a norte)
    tower: { x: 0, z: -58, r: 7, h: 300 },
    altar: { x: -30, z: 8, r: 8 },    // el claro con ruinas (bastón)
    sea: -0.6,                        // más hondo que esto no se puede caminar
    clouds: [55, 63, 72]
};
ISLE.door = { x: ISLE.tower.x, z: ISLE.tower.z + ISLE.tower.r + 0.6 };
const pathX = z => 8 * Math.sin(z * 0.045) + 4 * Math.sin(z * 0.11 + 1);  // el sendero serpentea
function shoreDist(x, z) { const nx = x / ISLE.rx, nz = (z - ISLE.cz) / ISLE.rz; return Math.sqrt(nx * nx + nz * nz) + (fbm(x * 0.03 + 5, z * 0.03) - 0.5) * 0.14; }
const plazaH = 9;
export function ground(x, z) {
    const d = shoreDist(x, z);
    const land = 1.8 + fbm(x * 0.035, z * 0.035) * 4 + sstep(30, -60, z) * 4;
    let h = lerp(lerp(-2.5, 1.1, sstep(1.05, 0.86, d)), land, sstep(0.86, 0.7, d));
    if (d > 1.05) h = Math.max(-8, -2.5 - (d - 1.05) * 30);
    const pd = Math.abs(x - pathX(z)); if (z < 70) h = lerp(h, h * 0.85 + 0.3, sstep(3, 1, pd)); // el sendero, un poco hundido
    const td = Math.hypot(x - ISLE.tower.x, z - ISLE.tower.z); h = lerp(h, plazaH, sstep(20, 13, td)); // explanada plana
    const ad = Math.hypot(x - ISLE.altar.x, z - ISLE.altar.z); h = lerp(h, ground.altarH ??= 1.8 + fbm(ISLE.altar.x * 0.035, ISLE.altar.z * 0.035) * 4 + sstep(30, -60, ISLE.altar.z) * 4, sstep(ISLE.altar.r + 3, ISLE.altar.r - 1, ad));
    return h;
}
export function zoneAt(x, z) {
    if (Math.hypot(x - ISLE.tower.x, z - ISLE.tower.z) < 24) return 'LA TORRE';
    if (Math.hypot(x - ISLE.altar.x, z - ISLE.altar.z) < ISLE.altar.r + 2) return 'EL CLARO EN RUINAS';
    return shoreDist(x, z) > 0.8 ? 'LA PLAYA DEL NAUFRAGIO' : 'EL BOSQUE';
}
export function startSpot() { // primer punto con arena firme viniendo del mar, por el sur
    let z = 120; while (ground(pathX(z) * 0.3, z) < 0.35 && z > 0) z -= 0.5;
    return { x: pathX(z) * 0.3, z: z - 4 };
}

// --- TEXTURAS ---
const T = {
    detail: () => makeTex((g, s) => { g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, s, s); for (let i = 0; i < 260; i++) { const k = 0.72 + Math.random() * 0.38; g.fillStyle = `rgb(${255 * k | 0},${255 * k | 0},${255 * k | 0})`; g.fillRect(rint(0, s - 1), rint(0, s - 1), rint(1, 2), 1); } }),
    leaves: base => makeTex((g, s) => { g.fillStyle = shade(base, 0.8); g.fillRect(0, 0, s, s); for (let i = 0; i < 70; i++) { const x = rint(0, s - 3), y = rint(0, s - 3); g.fillStyle = shade(base, 0.7 + Math.random() * 0.7); g.fillRect(x, y, 3, 2); g.fillStyle = shade(base, 0.45); g.fillRect(x, y + 2, 3, 1); } }),
    bark: () => makeTex((g, s) => { g.fillStyle = '#4a3624'; g.fillRect(0, 0, s, s); for (let x = 0; x < s; x += 3) { g.fillStyle = shade('#4a3624', 0.6 + Math.random() * 0.6); g.fillRect(x, 0, 1, s); } noise(g, s, '#4a3624', 0.6, 80); }),
    stone: () => makeTex((g, s) => {
        g.fillStyle = '#3e3b37'; g.fillRect(0, 0, s, s);
        for (let row = 0; row < 4; row++) for (let col = -1; col < 3; col++) { const x = col * 14 + (row % 2 ? 7 : 0), y = row * 8; g.fillStyle = shade('#77726a', 0.8 + Math.random() * 0.35); g.fillRect(x + 1, y + 1, 12, 6); g.fillStyle = shade('#77726a', 1.25); g.fillRect(x + 1, y + 1, 12, 1); }
        noise(g, s, '#77726a', 0.5, 90); for (let i = 0; i < 18; i++) { g.fillStyle = shade('#4f6b3a', 0.8 + Math.random() * 0.4); g.fillRect(rint(0, s - 1), rint(18, s - 1), 1, rint(1, 3)); }
    }),
    water: () => makeTex((g, s) => { g.fillStyle = '#2f5a6e'; g.fillRect(0, 0, s, s); noise(g, s, '#2f5a6e', 0.3, 120); for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(220,235,240,0.75)'; g.fillRect(rint(0, s - 5), rint(0, s - 1), rint(2, 5), 1); } }),
    cloud: () => makeTex((g, s) => {
        g.clearRect(0, 0, s, s);
        for (let i = 0; i < 26; i++) { const x = rint(0, s), y = rint(0, s), r = rint(8, 16); for (let k = 0; k < 4; k++) { g.fillStyle = `rgba(${150 + k * 14},${156 + k * 14},${164 + k * 14},${0.22})`; g.beginPath(); g.arc(x - k, y - k, r - k * 2, 0, 7); g.fill(); g.beginPath(); g.arc(x - k - s, y - k, r - k * 2, 0, 7); g.fill(); g.beginPath(); g.arc(x - k, y - k - s, r - k * 2, 0, 7); g.fill(); } }
    }, 64),
    grass: () => makeTex((g, s) => { g.clearRect(0, 0, s, s); for (let i = 0; i < 16; i++) { const x = rint(1, s - 2); let y = s - 1; const lean = Math.random() - 0.5; const hh = rint(s * 0.4, s - 2); for (let k = 0; k < hh; k++) { g.fillStyle = shade('#5d8a3e', 0.6 + 0.7 * k / hh); g.fillRect(Math.round(x + lean * k * 0.5), y - k, 1, 1); } } }),
    sand: () => makeTex((g, s) => { g.fillStyle = '#8a6a44'; g.fillRect(0, 0, s, s); for (let y = 0; y < s; y += 4) { g.fillStyle = shade('#8a6a44', 0.7 + Math.random() * 0.5); g.fillRect(0, y, s, 2); } g.fillStyle = '#2a1d12'; g.fillRect(0, 0, 1, s); })
};

// Junta varias geometrías en una (para los árboles: tronco + copa en una sola pieza por material)
function merge(list) {
    const parts = list.map(g => g.index ? g.toNonIndexed() : g), out = new THREE.BufferGeometry();
    ['position', 'normal', 'uv'].forEach(n => {
        const size = parts[0].attributes[n].itemSize, total = parts.reduce((a, p) => a + p.attributes[n].array.length, 0), arr = new Float32Array(total);
        let o = 0; parts.forEach(p => { arr.set(p.attributes[n].array, o); o += p.attributes[n].array.length; });
        out.setAttribute(n, new THREE.BufferAttribute(arr, size));
    });
    return out;
}
const tr = (geo, x, y, z, ry = 0) => { geo.rotateY(ry); geo.translate(x, y, z); return geo; };

// --- ARMAR LA ISLA ---
export function buildIsland() {
    const group = new THREE.Group(), colliders = [], CELL = 4, hashC = new Map();
    const addCollider = (x, z, r, crown = 0, top = 0) => { const c = { x, z, r, crown, top }; colliders.push(c); const k = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`; (hashC.get(k) || hashC.set(k, []).get(k)).push(c); };

    // Terreno: colores por vértice (arena, pasto, tierra del sendero, roca, piedra) × una textura de detalle pixelada
    const W = 170, D = 250, SX = 128, SZ = 188;
    const tg = new THREE.PlaneGeometry(W, D, SX, SZ); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, ISLE.cz);
    const pos = tg.attributes.position, cols = new Float32Array(pos.count * 3), c = new THREE.Color(), c2 = new THREE.Color();
    const SAND = new THREE.Color('#d6c08a'), WET = new THREE.Color('#9c875c'), GRASS = new THREE.Color('#567d38'), FOREST = new THREE.Color('#3a5528'), DIRT = new THREE.Color('#77603e'), ROCK = new THREE.Color('#6d6a62'), PLAZA = new THREE.Color('#8a857a'), DEEP = new THREE.Color('#5a5440');
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), h = ground(x, z); pos.setY(i, h);
        const slope = Math.abs(ground(x + 1, z) - h) + Math.abs(ground(x, z + 1) - h), n = fbm(x * 0.2, z * 0.2);
        if (h < -0.3) c.copy(DEEP).lerp(WET, sstep(-2.5, -0.3, h));
        else if (h < 1.5) c.copy(WET).lerp(SAND, sstep(-0.3, 0.4, h));
        else c.copy(SAND).lerp(GRASS, sstep(1.5, 2.2, h));
        if (h > 2) { c2.copy(GRASS).lerp(FOREST, sstep(0.35, 0.6, n)); c.lerp(c2, sstep(2, 2.6, h)); }
        if (z < 70 && h > 1.2) c.lerp(DIRT, sstep(2.2, 0.9, Math.abs(x - pathX(z))) * 0.9);
        c.lerp(ROCK, sstep(1.2, 2.4, slope) * 0.8);
        if (Math.hypot(x - ISLE.tower.x, z - ISLE.tower.z) < 17) c.lerp(PLAZA, sstep(17, 14, Math.hypot(x - ISLE.tower.x, z - ISLE.tower.z)) * (0.6 + 0.4 * (vnoise(x * 1.3, z * 1.3) > 0.4)));
        if (Math.hypot(x - ISLE.altar.x, z - ISLE.altar.z) < ISLE.altar.r) c.lerp(PLAZA, 0.35 * (vnoise(x * 1.5, z * 1.5) > 0.5));
        c.multiplyScalar(0.92 + n * 0.16);
        cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    tg.setAttribute('color', new THREE.BufferAttribute(cols, 3)); tg.computeVertexNormals();
    const det = T.detail(); det.repeat.set(W / 2, D / 2);
    const uv = tg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * W / 2, uv.getY(i) * D / 2);
    det.repeat.set(1, 1);
    group.add(new THREE.Mesh(tg, lambert({ map: det, vertexColors: true })));

    // Océano: un plano grande con olas (se mueve en update) y la textura que corre
    const og = new THREE.PlaneGeometry(900, 900, 90, 90); og.rotateX(-Math.PI / 2);
    const wt = T.water(); wt.repeat.set(120, 120);
    const ocean = new THREE.Mesh(og, lambert({ map: wt, transparent: true, opacity: 0.82, color: 0xc8d8dc }));
    group.add(ocean);
    const oceanBase = Float32Array.from(og.attributes.position.array);

    // Nubes: tres capas que tapan la torre (se ven desde abajo, se mueven despacio)
    const cloudTex = T.cloud(), clouds = ISLE.clouds.map((y, i) => {
        const t = cloudTex.clone(); t.needsUpdate = true; t.repeat.set(5 + i, 5 + i);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, color: [0x9aa0a8, 0xb4b9c0, 0xc8ccd2][i] }));
        m.rotation.x = Math.PI / 2; m.position.y = y; group.add(m); return m;
    });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshBasicMaterial({ color: 0x8c939b, side: THREE.DoubleSide })); // el techo gris del cielo cubierto
    ceiling.rotation.x = Math.PI / 2; ceiling.position.y = 80; group.add(ceiling);

    // La torre: piedra, contrafuertes, ventanas en espiral, la puerta al sur
    const TW = ISLE.tower, stone = T.stone(); stone.repeat.set(10, 60);
    const towerMat = lambert({ map: stone, color: 0x8a8a94 }); // más oscura que la niebla: se recorta contra el cielo
    const body = new THREE.Mesh(new THREE.CylinderGeometry(TW.r * 0.82, TW.r, TW.h, 12, 40), towerMat); body.position.set(TW.x, plazaH + TW.h / 2 - 1, TW.z); group.add(body);
    const st2 = stone.clone(); st2.needsUpdate = true; st2.repeat.set(1, 6); const buttMat = lambert({ map: st2 });
    for (let k = 0; k < 6; k++) {
        const a = k / 6 * Math.PI * 2 + Math.PI / 6, bh = 26 + (k % 2) * 18;
        const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, bh, 3.2, 1, 8, 1), buttMat); b.position.set(TW.x + Math.sin(a) * (TW.r + 0.8), plazaH + bh / 2 - 1, TW.z + Math.cos(a) * (TW.r + 0.8)); b.rotation.y = a; group.add(b);
    }
    const dark = new THREE.MeshBasicMaterial({ color: 0x060507 });
    for (let k = 0; k < 40; k++) { const a = k * 1.1, y = 14 + k * 6.5, r = TW.r - (y / TW.h) * TW.r * 0.18 + 0.05; const w = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.2), dark); w.position.set(TW.x + Math.sin(a) * r, plazaH + y, TW.z + Math.cos(a) * r); w.rotation.y = a; group.add(w); }
    for (let k = 0; k < 3; k++) { const ring = new THREE.Mesh(new THREE.CylinderGeometry(TW.r + 0.5, TW.r + 0.5, 0.6, 12), towerMat); ring.position.set(TW.x, plazaH + 20 + k * 14, TW.z); group.add(ring); }
    const door = new THREE.Group(); door.position.set(TW.x, plazaH, TW.z + TW.r - 0.15);
    const hole = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.4, 0.5), dark); hole.position.y = 1.7; door.add(hole);
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.5, 8, 1, false, 0, Math.PI), dark); arch.rotation.set(Math.PI / 2, 0, Math.PI / 2); arch.position.y = 3.4; door.add(arch);
    const frame = lambert({ map: st2 });
    [-1.5, 1.5].forEach(x => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.6, 0.8), frame); p.position.set(x, 2.3, 0.2); door.add(p); });
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.6, 0.8), frame); lintel.position.set(0, 4.9, 0.2); door.add(lintel);
    for (let s = 0; s < 3; s++) { const step = new THREE.Mesh(new THREE.BoxGeometry(4 - s * 0.3, 0.25, 0.8), frame); step.position.set(0, 0.12 - s * 0.25 + 0.25 * 0, 0.8 + s * 0.8); step.position.y = -s * 0.22 + 0.1; door.add(step); }
    group.add(door);
    // Antorchas a los lados de la puerta (lo único con luz cálida afuera: te llaman)
    const torches = [-2.2, 2.2].map(x => {
        const pos3 = new THREE.Vector3(TW.x + x, plazaH + 3, TW.z + TW.r + 0.7);
        const stick = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), lambert({ color: 0x3a2a1a })); stick.position.copy(pos3).add(new THREE.Vector3(0, -0.3, 0)); group.add(stick);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 5), new THREE.MeshBasicMaterial({ color: 0xffb04a })); flame.position.copy(pos3); group.add(flame);
        return { pos: pos3, flame, seed: Math.random() * 10 };
    });
    addCollider(TW.x, TW.z, TW.r + 0.4);
    // Pilares rotos alrededor de la explanada
    for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2 + 0.2, r = 15.5, x = TW.x + Math.sin(a) * r, z = TW.z + Math.cos(a) * r; if (Math.abs(a - Math.PI * 2) < 0.5 || a < 0.5) continue; // no tapar el sendero
        const ph = 2 + (k * 37 % 5); const p = new THREE.Mesh(new THREE.BoxGeometry(1.1, ph, 1.1, 1, 3, 1), buttMat); p.position.set(x, ground(x, z) + ph / 2 - 0.2, z); p.rotation.set((k % 3 - 1) * 0.08, a, 0.05); group.add(p); addCollider(x, z, 0.75);
    }

    // El claro en ruinas: un anillo de columnas y un altar (ahí está el bastón)
    const AL = ISLE.altar, altarY = ground(AL.x, AL.z);
    for (let k = 0; k < 7; k++) {
        const a = k / 7 * Math.PI * 2, x = AL.x + Math.sin(a) * (AL.r - 2), z = AL.z + Math.cos(a) * (AL.r - 2), ph = [3.4, 1.4, 2.6, 0.8, 3.0, 2.0, 1.1][k];
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, ph, 6, 2), buttMat); p.position.set(x, altarY + ph / 2, z); group.add(p); addCollider(x, z, 0.55);
    }
    const altar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1, 2, 1, 2), frame); altar.position.set(AL.x, altarY + 0.45, AL.z); group.add(altar); addCollider(AL.x, AL.z, 0.8);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 40, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xb48cff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.set(AL.x, altarY + 20, AL.z); group.add(beam); // se ve por encima de los árboles: "algo hay ahí"

    // El naufragio en la playa: casco roto, tablas, un barril
    const S = startSpot(), wood = lambert({ map: T.sand() });
    const wreck = new THREE.Group(); wreck.position.set(S.x + 5, ground(S.x + 5, S.z + 3) - 0.3, S.z + 3); wreck.rotation.set(0.15, 0.6, 0.35);
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 0.5, 5.5, 6, 3, true, 0, Math.PI), wood); hull.rotation.set(Math.PI / 2, 0, Math.PI); wreck.add(hull);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2), wood); mast.position.set(0.4, 1.2, 0.5); mast.rotation.z = 1.1; wreck.add(mast);
    group.add(wreck); addCollider(wreck.position.x, wreck.position.z, 1.6);
    for (let k = 0; k < 6; k++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, rint(10, 18) / 10), wood); const x = S.x + rint(-6, 8), z = S.z + rint(-3, 5); pl.position.set(x, ground(x, z) + 0.04, z); pl.rotation.y = Math.random() * 3; group.add(pl); }
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 7), wood); barrel.position.set(S.x - 3, ground(S.x - 3, S.z - 1) + 0.2, S.z - 1); barrel.rotation.z = 1.5; group.add(barrel);

    // --- VEGETACIÓN (instanciada) ---
    const leafA = lambert({ map: T.leaves('#3f6e2c') }), leafB = lambert({ map: T.leaves('#2f5a2a') }), barkM = lambert({ map: T.bark() });
    const pineTrunk = new THREE.CylinderGeometry(0.14, 0.22, 1.6, 5); pineTrunk.translate(0, 0.8, 0);
    const pineCrown = merge([tr(new THREE.ConeGeometry(1.6, 2.4, 6), 0, 2.4, 0), tr(new THREE.ConeGeometry(1.2, 2, 6), 0, 3.6, 0, 0.5), tr(new THREE.ConeGeometry(0.75, 1.6, 6), 0, 4.7, 0)]);
    const oakTrunk = merge([tr(new THREE.CylinderGeometry(0.2, 0.3, 2.6, 5), 0, 1.3, 0), tr(new THREE.CylinderGeometry(0.07, 0.1, 1.2, 4), 0.4, 2.4, 0).rotateZ(0)]);
    const oakCrown = merge([tr(new THREE.IcosahedronGeometry(1.7, 0), 0, 3.6, 0), tr(new THREE.IcosahedronGeometry(1.3, 0), 1.1, 3.1, 0.4), tr(new THREE.IcosahedronGeometry(1.2, 0), -0.9, 3.3, -0.5), tr(new THREE.IcosahedronGeometry(1.1, 0), 0.1, 4.7, 0.2)]);
    const bushGeo = merge([new THREE.IcosahedronGeometry(0.7, 0), tr(new THREE.IcosahedronGeometry(0.5, 0), 0.5, 0.1, 0.2)]); bushGeo.translate(0, 0.35, 0);
    const pines = [], oaks = [], bushes = [], grass = [], rocks = [], palms = [];
    const inForest = (x, z) => { const d = shoreDist(x, z), h = ground(x, z); return d < 0.77 && h > 2; };
    const edge = (x, z) => 0.55 + 0.45 * sstep(0.77, 0.66, shoreDist(x, z)); // en el borde del bosque los árboles son más bajos: desde la playa se ve la torre
    const clearOf = (x, z, gap) => Math.abs(x - pathX(z)) > gap && Math.hypot(x - TW.x, z - TW.z) > 19 && Math.hypot(x - AL.x, z - AL.z) > AL.r + 0.5 && Math.hypot(x - S.x, z - S.z) > 10;
    for (let gz = -110; gz < 100; gz += 2.3) for (let gx = -70; gx < 70; gx += 2.3) {
        const x = gx + (hash(gx, gz) - 0.5) * 2, z = gz + (hash(gz, gx) - 0.5) * 2, h = ground(x, z);
        const dens = fbm(x * 0.05 + 10, z * 0.05), r = hash(x * 3.1, z * 1.7);
        if (inForest(x, z) && clearOf(x, z, 3.2) && dens > 0.3 && r < 0.75) {
            const s = (0.8 + hash(x, z * 2) * 0.8) * edge(x, z), rot = hash(z, x) * 6.28;
            (r < 0.35 + (z < -20 ? 0.25 : 0) ? pines : oaks).push({ x, y: h - 0.1, z, s, rot });
            addCollider(x, z, 0.32 * s, 1.5 * s, h + 5.4 * s);
        } else if (inForest(x, z) && clearOf(x, z, 2) && r < 0.9) bushes.push({ x, y: h - 0.15, z, s: 0.7 + hash(x * 2, z) * 0.9, rot: r * 9 });
        if (h > 0.9 && clearOf(x, z, 1.4) && hash(x * 7, z * 3) < (h > 2 ? 0.9 : 0.25)) for (let k = 0; k < 2; k++) grass.push({ x: x + (hash(x + k, z) - 0.5) * 2, y: h, z: z + (hash(z + k, x) - 0.5) * 2, s: 0.6 + hash(x * k, z) * 0.6, rot: hash(z * k, x) * 3 });
        if (h > -0.5 && h < 1.6 && hash(x * 5, z * 5) < 0.07) rocks.push({ x, y: h - 0.1, z, s: 0.3 + hash(x * 9, z) * 0.9, rot: r * 6 });
        const d = shoreDist(x, z); if (d > 0.79 && d < 0.84 && h > 1.3 && hash(x * 11, z * 13) < 0.25 && Math.hypot(x - S.x, z - S.z) > 6) palms.push({ x, y: h, z, s: 0.9 + r * 0.4, rot: r * 6.28 });
    }
    const inst = (geo, mat, list, colorize) => {
        const m = new THREE.InstancedMesh(geo, mat, list.length), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
        list.forEach((o, i) => { e.set(0, o.rot, 0); q.setFromEuler(e); M.compose(new THREE.Vector3(o.x, o.y, o.z), q, new THREE.Vector3(o.s, o.s * (o.sy || 1), o.s)); m.setMatrixAt(i, M); if (colorize) m.setColorAt(i, col.setHSL(0.27 + (hash(o.x, o.z) - 0.5) * 0.06, 0.35, 0.42 + hash(o.z, o.x) * 0.2).multiplyScalar(2)); });
        group.add(m); return m;
    };
    inst(pineTrunk, barkM, pines); inst(pineCrown, leafB, pines, true);
    inst(oakTrunk, barkM, oaks); inst(oakCrown, leafA, oaks, true);
    inst(bushGeo, leafA, bushes, true);
    const tuft = merge([new THREE.PlaneGeometry(0.9, 0.7), tr(new THREE.PlaneGeometry(0.9, 0.7), 0, 0, 0, Math.PI / 2)]); tuft.translate(0, 0.33, 0);
    inst(tuft, lambert({ map: T.grass(), alphaTest: 0.5, side: THREE.DoubleSide }), grass);
    inst(new THREE.DodecahedronGeometry(0.7, 0), lambert({ map: stone, color: 0xf0e8d8 }), rocks.map(o => (o.sy = 0.6, o)));
    rocks.forEach(o => o.s > 0.8 && addCollider(o.x, o.z, 0.5 * o.s));
    // Palmeras en el borde de la playa: tronco curvo en tramos + hojas en cuña
    const palmGeoT = merge([0, 1, 2, 3, 4].map(k => tr(new THREE.CylinderGeometry(0.16 - k * 0.015, 0.2 - k * 0.015, 1.3, 5), k * k * 0.07, 0.65 + k * 1.2, 0)));
    const palmGeoL = merge([0, 1, 2, 3, 4, 5].map(k => { const g = new THREE.BoxGeometry(0.5, 0.05, 2.4); g.translate(0, 0, 1.2); g.rotateX(0.35); g.rotateY(k / 6 * Math.PI * 2); g.translate(1.1, 6.1, 0); return g; }));
    inst(palmGeoT, barkM, palms); inst(palmGeoL, leafA, palms, true); palms.forEach(o => addCollider(o.x, o.z, 0.3));

    // Gaviotas (una V que da vueltas sobre la playa)
    const gullGeo = merge([tr(new THREE.BoxGeometry(0.5, 0.03, 0.12), 0.24, 0, 0).rotateZ(0.25), tr(new THREE.BoxGeometry(0.5, 0.03, 0.12), -0.24, 0, 0).rotateZ(-0.25)]);
    const gulls = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(gullGeo, new THREE.MeshBasicMaterial({ color: 0xe8e8e0 })); group.add(m); return { m, r: 8 + i * 3, h: 9 + (i % 3) * 3, sp: 0.25 + (i % 4) * 0.06, ph: i * 1.3, cx: S.x + (i % 2 ? 10 : -12), cz: S.z - 6 - i * 2 }; });

    // --- LO QUE EXPONE ---
    function solid(x, z, r = 0.3, sea = true) {
        if (sea && ground(x, z) < ISLE.sea) return true; // el mar (hasta las rodillas, no más)
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = hashC.get(`${Math.floor(x / CELL) + i},${Math.floor(z / CELL) + j}`); if (l) for (const o of l) if ((x - o.x) ** 2 + (z - o.z) ** 2 < (o.r + r) ** 2) return true; }
        return false;
    }
    // La cámara no se mete en los troncos ni en las copas (la copa empieza a 1.3 m del piso)
    function camBlocked(x, y, z) {
        const gy = ground(x, z);
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = hashC.get(`${Math.floor(x / CELL) + i},${Math.floor(z / CELL) + j}`); if (l) for (const o of l) {
            const d2 = (x - o.x) ** 2 + (z - o.z) ** 2;
            if (y < gy + 5 && d2 < (o.r + 0.2) ** 2) return true;
            if (o.crown && y > gy + 1.3 && y < o.top && d2 < o.crown ** 2) return true;
        } }
        return false;
    }
    function update(t, camPos) {
        const p = og.attributes.position;
        for (let i = 0; i < p.count; i++) { const x = oceanBase[i * 3], z = oceanBase[i * 3 + 2]; p.setY(i, Math.sin(x * 0.18 + t * 1.3) * 0.12 + Math.sin(z * 0.23 + t * 0.9) * 0.1); }
        p.needsUpdate = true; ocean.position.set(Math.round(camPos.x / 10) * 10, 0, Math.round(camPos.z / 10) * 10);
        wt.offset.set(t * 0.012, t * 0.02);
        clouds.forEach((m, i) => { m.material.map.offset.set(t * 0.002 * (i + 1), t * 0.001); });
        gulls.forEach(g => { const a = t * g.sp + g.ph; g.m.position.set(g.cx + Math.sin(a) * g.r, g.h + Math.sin(a * 3) * 0.6, g.cz + Math.cos(a) * g.r); g.m.rotation.set(0, a + Math.PI, Math.sin(t * 6 + g.ph) * 0.3); g.m.scale.y = 1 + Math.sin(t * 7 + g.ph) * 0.6; });
        beam.material.opacity = 0.12 + 0.05 * Math.sin(t * 1.5);
    }
    return { group, ground, solid, camBlocked, update, torches, start: S, door: ISLE.door, altar: { x: AL.x, y: altarY, z: AL.z }, tower: TW, counts: { pines: pines.length, oaks: oaks.length, bushes: bushes.length, grass: grass.length, palms: palms.length } };
}

// Lugares para los animales: cangrejos en la arena, lobos y jabalíes en el bosque
export function animalSpots(start) {
    const out = { crab: [], wolf: [], boar: [] };
    for (let k = 0; k < 4000 && (out.crab.length < 8 || out.boar.length < 8 || out.wolf.length < 3); k++) {
        const x = (Math.random() - 0.5) * 120, z = (Math.random() - 0.5) * 190 + ISLE.cz, h = ground(x, z), d = shoreDist(x, z), fromStart = Math.hypot(x - start.x, z - start.z);
        if (h > 0.1 && h < 1.3 && d > 0.8 && fromStart > 9 && fromStart < 60 && out.crab.length < 8) out.crab.push({ x, z });
        else if (h > 2.4 && d < 0.75 && z < start.z - 25 && Math.hypot(x - ISLE.tower.x, z - ISLE.tower.z) > 14 && Math.abs(x - pathX(z)) < 22) {
            if (out.boar.length < 8 && Math.random() < 0.6) out.boar.push({ x, z });
            else if (out.wolf.length < 3 && out.wolf.every(w => Math.hypot(w.x - x, w.z - z) > 25)) out.wolf.push({ x, z }); // cada uno es una manada
        }
    }
    return out;
}
