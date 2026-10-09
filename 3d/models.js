// Tower Chaos 3D — enemigos low poly con texturas pintadas en pixel art (2026-10-08).
//   Referencias del usuario: un caballero con armadura y mosquete (textura pintada), armaduras low poly en Blender con
//   texturas de píxeles, un mecha y un robot de bloques con ojos rosas. De ahí: piezas en cuña (no solo cajas), hombreras
//   grandes, casco con visor, placas con brillo arriba y sombra abajo, remaches, cota de malla, tela rota, paneles de robot.
//   Cada modelo tiene "pivotes" (cadera, hombro) para animarlo: caminar, respirar y levantar el arma en el aviso.

import * as THREE from 'three';
import { lambert, makeTex, shade, noise, rint } from './ps1.js';

// --- TEXTURAS (32×32, pintadas con código; se cachean por color) ---
const texCache = {};
function tex(kind, base, accent = '#000000') {
    const key = kind + base + accent;
    if (texCache[key]) return texCache[key];
    const t = makeTex((g, s) => PAINT[kind](g, s, base, accent));
    return (texCache[key] = t);
}
const PAINT = {
    plate(g, s, b) { // placa de metal: brillo arriba, sombra abajo, biseles, remaches, rayones
        g.fillStyle = shade(b, 1); g.fillRect(0, 0, s, s);
        for (let y = 0; y < s; y++) { g.fillStyle = shade(b, 1.35 - 0.7 * (y / s)); g.fillRect(0, y, s, 1); }
        noise(g, s, b, 0.35, 140);
        g.fillStyle = shade(b, 1.7); g.fillRect(0, 0, s, 2); g.fillRect(0, 0, 1, s);
        g.fillStyle = shade(b, 0.4); g.fillRect(0, s - 2, s, 2); g.fillRect(s - 1, 0, 1, s);
        [[3, 4], [s - 5, 4], [3, s - 6], [s - 5, s - 6]].forEach(([x, y]) => { g.fillStyle = shade(b, 0.35); g.fillRect(x, y, 2, 2); g.fillStyle = shade(b, 1.8); g.fillRect(x, y, 1, 1); });
        g.fillStyle = shade(b, 0.55); for (let i = 0; i < 3; i++) { const x = rint(4, 26), y = rint(6, 24); g.fillRect(x, y, rint(2, 5), 1); }
    },
    visor(g, s, b) { // frente del yelmo: placa con la ranura y agujeros de respiración
        PAINT.plate(g, s, b);
        g.fillStyle = '#0a0808'; g.fillRect(4, 11, s - 8, 3); g.fillRect(s / 2 - 1, 11, 2, 9);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) g.fillRect(8 + i * 3 + j * 11, 20 + (i % 2) * 2, 1, 1);
        g.fillStyle = shade(b, 1.9); g.fillRect(4, 10, s - 8, 1);
    },
    chain(g, s, b) { // cota de malla
        g.fillStyle = shade(b, 0.45); g.fillRect(0, 0, s, s);
        for (let y = 0; y < s; y += 2) for (let x = (y / 2) % 2; x < s; x += 2) { g.fillStyle = shade(b, 0.9 + Math.random() * 0.5); g.fillRect(x, y, 1, 1); }
    },
    cloth(g, s, b) { // tela con pliegues y el borde roto
        g.fillStyle = shade(b, 1); g.fillRect(0, 0, s, s); noise(g, s, b, 0.3, 120);
        for (let x = 3; x < s; x += 6) { g.fillStyle = shade(b, 0.7); g.fillRect(x, 0, 1, s); g.fillStyle = shade(b, 1.25); g.fillRect(x + 1, 0, 1, s); }
        g.fillStyle = shade(b, 0.4); for (let x = 0; x < s; x += 2) g.fillRect(x, s - rint(1, 4), 2, 4);
    },
    leather(g, s, b, a) { // cuero: costuras, una hebilla
        g.fillStyle = shade(b, 1); g.fillRect(0, 0, s, s); noise(g, s, b, 0.4, 160);
        g.fillStyle = shade(b, 1.4); for (let x = 2; x < s; x += 3) { g.fillRect(x, 3, 1, 1); g.fillRect(x, s - 4, 1, 1); }
        g.fillStyle = a; g.fillRect(12, 10, 8, 10); g.fillStyle = shade(b, 0.3); g.fillRect(14, 12, 4, 6);
    },
    bone(g, s, b) {
        g.fillStyle = shade(b, 1); g.fillRect(0, 0, s, s); noise(g, s, b, 0.25, 160);
        g.fillStyle = shade(b, 0.55); for (let i = 0; i < 4; i++) { let x = rint(2, 28), y = rint(2, 28); for (let k = 0; k < 5; k++) { g.fillRect(x, y, 1, 1); x += rint(-1, 1); y += 1; } }
        for (let y = 0; y < s; y++) { g.fillStyle = `rgba(0,0,0,${0.25 * y / s})`; g.fillRect(0, y, s, 1); }
    },
    mech(g, s, b, a) { // panel de robot: líneas de panel, marcas en X, luces
        PAINT.plate(g, s, b);
        g.fillStyle = shade(b, 0.35); g.fillRect(0, 15, s, 1); g.fillRect(15, 0, 1, s);
        g.strokeStyle = shade(b, 0.3); g.lineWidth = 1.5; g.beginPath(); g.moveTo(5, 19); g.lineTo(11, 27); g.moveTo(11, 19); g.lineTo(5, 27); g.stroke();
        for (let i = 0; i < 3; i++) { g.fillStyle = shade(b, 0.3); g.fillRect(20 + i * 3, 5, 2, 6); }
        g.fillStyle = a; g.fillRect(22, 22, 2, 2);
    },
    dark(g, s) { g.fillStyle = '#0a0808'; g.fillRect(0, 0, s, s); }
};
// Material con su textura (repeat para las cuñas, que reparten la textura en 4 caras)
function mat(kind, base, accent, rep = null) {
    let t = tex(kind, base, accent);
    if (rep) { t = t.clone(); t.repeat.set(rep[0], rep[1]); t.needsUpdate = true; }
    return lambert({ map: t });
}

// --- FORMAS ---
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
// Cuña: prisma de 4 lados más ancho arriba o abajo (pecho, muslos, antebrazos)
function wedge(top, bottom, h, m) { const g = new THREE.CylinderGeometry(top, bottom, h, 4, 1); g.rotateY(Math.PI / 4); return new THREE.Mesh(g, m); }
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
function pivot(parent, x, y, z) { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; }

// --- LOS MODELOS ---
const BUILD = {
    // Caballero hueco: yelmo con visor, hombreras grandes, pecho en cuña, tabardo roto, espadón
    knight(g, U) {
        const steel = '#8f949a', plate = mat('plate', steel), plateW = mat('plate', steel, null, [4, 1]), chain = mat('chain', '#9aa0a6', null, [4, 2]);
        const tabard = mat('cloth', '#5a2a24'), belt = mat('leather', '#5a3a22', '#c9a227');
        U.hips = pivot(g, 0, 0.98, 0);
        const chest = at(wedge(0.3, 0.24, 0.5, plateW), 0, 0.42, 0); U.hips.add(chest); // pecho en cuña
        U.hips.add(at(wedge(0.24, 0.22, 0.2, chain), 0, 0.1, 0)); // cintura de cota de malla
        const b = box(0.46, 0.08, 0.32, belt); at(b, 0, 0.0, 0); U.hips.add(b);
        const tab = box(0.3, 0.5, 0.02, tabard); at(tab, 0, -0.25, -0.17); U.hips.add(tab); // tabardo adelante
        const tab2 = box(0.3, 0.45, 0.02, tabard); at(tab2, 0, -0.22, 0.17); U.hips.add(tab2);
        // cabeza
        U.head = pivot(U.hips, 0, 0.72, 0);
        const helm = box(0.26, 0.3, 0.28, [plate, plate, plate, plate, plate, mat('visor', steel)]); at(helm, 0, 0.12, 0); U.head.add(helm);
        const crest = box(0.04, 0.08, 0.26, plate); at(crest, 0, 0.3, 0); U.head.add(crest);
        // hombreras y brazos
        U.arms = [-1, 1].map(side => {
            const sh = pivot(U.hips, side * 0.34, 0.56, 0);
            const pad = box(0.28, 0.16, 0.32, plate); at(pad, side * 0.04, 0.08, 0); pad.rotation.z = side * -0.35; sh.add(pad);
            const pad2 = box(0.24, 0.1, 0.28, plate); at(pad2, side * 0.08, -0.04, 0); pad2.rotation.z = side * -0.5; sh.add(pad2);
            const up = wedge(0.08, 0.07, 0.34, plateW); at(up, 0, -0.22, 0); sh.add(up);
            const fore = wedge(0.09, 0.07, 0.3, plateW); at(fore, 0, -0.52, 0); sh.add(fore);
            const hand = box(0.12, 0.11, 0.14, mat('plate', '#6a6e74')); at(hand, 0, -0.72, 0); sh.add(hand);
            return sh;
        });
        // espadón en la mano derecha (con la punta para arriba)
        const blade = box(0.06, 0.95, 0.025, mat('plate', '#b0b4ba')); at(blade, 0, -0.35, -0.12); blade.rotation.x = -1.4; U.arms[1].add(blade);
        const guard = box(0.24, 0.04, 0.05, mat('plate', '#8a6a2a')); at(guard, 0, -0.72, -0.1); U.arms[1].add(guard);
        // piernas
        U.legs = [-1, 1].map(side => {
            const hp = pivot(U.hips, side * 0.13, -0.02, 0);
            const thigh = wedge(0.1, 0.085, 0.42, plateW); at(thigh, 0, -0.22, 0); hp.add(thigh);
            const knee = box(0.13, 0.1, 0.14, plate); at(knee, 0, -0.45, -0.02); hp.add(knee);
            const shin = wedge(0.085, 0.1, 0.4, plateW); at(shin, 0, -0.66, 0); hp.add(shin);
            const boot = box(0.15, 0.1, 0.26, mat('plate', '#5a5e64')); at(boot, 0, -0.9, -0.04); hp.add(boot);
            return hp;
        });
        U.eyes = []; U.chest = chest;
    },
    // Autómata: torso de caja grande, cabeza chica con ojos rosas, brazos largos con garras, patas finas y pies grandes
    automaton(g, U) {
        const body = '#7f9a96', m = mat('mech', body, '#ff4f9a'), mW = mat('mech', body, '#ff4f9a', [4, 1]), joint = mat('chain', '#3a3a40', null, [2, 2]), bone = mat('plate', '#d8cfa0');
        U.hips = pivot(g, 0, 1.25, 0);
        const torso = box(0.8, 0.62, 0.55, m); at(torso, 0, 0.42, 0); U.hips.add(torso);
        const pelvis = box(0.4, 0.2, 0.35, joint); at(pelvis, 0, 0.0, 0); U.hips.add(pelvis);
        U.head = pivot(U.hips, 0, 0.8, -0.05);
        const head = box(0.32, 0.22, 0.3, m); at(head, 0, 0.08, 0); U.head.add(head);
        const antenna = box(0.02, 0.5, 0.02, mat('dark', '#000')); at(antenna, 0.1, 0.4, 0.05); antenna.rotation.z = -0.3; U.head.add(antenna);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff4f9a });
        U.eyes = [-0.07, 0.07].map(x => { const e = box(0.05, 0.05, 0.02, eyeMat); at(e, x, 0.1, -0.16); U.head.add(e); return e; });
        const core = box(0.1, 0.1, 0.02, eyeMat); at(core, 0, 0.45, -0.28); U.hips.add(core); U.eyes.push(core);
        U.arms = [-1, 1].map(side => {
            const sh = pivot(U.hips, side * 0.5, 0.6, 0);
            const shoulder = box(0.28, 0.28, 0.3, m); at(shoulder, side * 0.06, 0, 0); sh.add(shoulder);
            const up = wedge(0.07, 0.06, 0.5, mW); at(up, side * 0.04, -0.4, 0); sh.add(up);
            const fore = wedge(0.08, 0.06, 0.55, mat('plate', '#c8b88a', null, [4, 1])); at(fore, side * 0.04, -0.9, 0); sh.add(fore);
            [-0.05, 0.05].forEach(dz => { const c = box(0.05, 0.16, 0.04, mat('leather', '#7a3424', '#7a3424')); at(c, side * 0.04, -1.22, dz); sh.add(c); }); // garra
            return sh;
        });
        U.legs = [-1, 1].map(side => {
            const hp = pivot(U.hips, side * 0.18, -0.05, 0);
            const thigh = wedge(0.07, 0.06, 0.55, mW); at(thigh, 0, -0.3, 0); hp.add(thigh);
            const knee = box(0.14, 0.12, 0.14, joint); at(knee, 0, -0.6, 0); hp.add(knee);
            const shin = wedge(0.06, 0.08, 0.5, mat('plate', '#c8b88a', null, [4, 1])); at(shin, 0, -0.88, 0); hp.add(shin);
            const foot = box(0.2, 0.08, 0.32, mat('leather', '#7a3424', '#7a3424')); at(foot, 0, -1.18, -0.06); hp.add(foot);
            return hp;
        });
        U.chest = torso;
    },
    // Esqueleto: huesos con textura, costillas, mandíbula
    skeleton(g, U) {
        const b = mat('bone', '#d8d0b8'), bW = mat('bone', '#d0c8b0', null, [4, 1]);
        U.hips = pivot(g, 0, 0.82, 0);
        const spine = box(0.06, 0.5, 0.06, b); at(spine, 0, 0.3, 0.02); U.hips.add(spine);
        [0.42, 0.3, 0.18].forEach((y, i) => { const r = wedge(0.18 - i * 0.02, 0.16 - i * 0.02, 0.06, bW); at(r, 0, y, 0); U.hips.add(r); }); // costillas
        const pelvis = wedge(0.13, 0.1, 0.1, bW); at(pelvis, 0, 0, 0); U.hips.add(pelvis);
        U.head = pivot(U.hips, 0, 0.62, 0);
        const skull = box(0.22, 0.22, 0.22, [b, b, b, b, b, mat('visor', '#d8d0b8')]); at(skull, 0, 0.1, 0); U.head.add(skull);
        const jaw = box(0.16, 0.05, 0.18, b); at(jaw, 0, -0.04, -0.01); U.head.add(jaw);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x440000 });
        U.eyes = [-0.05, 0.05].map(x => { const e = box(0.04, 0.03, 0.02, eyeMat); at(e, x, 0.13, -0.115); U.head.add(e); return e; });
        U.arms = [-1, 1].map(side => {
            const sh = pivot(U.hips, side * 0.2, 0.45, 0);
            const up = box(0.05, 0.3, 0.05, b); at(up, 0, -0.16, 0); sh.add(up);
            const fore = box(0.045, 0.28, 0.045, b); at(fore, 0, -0.44, 0); sh.add(fore);
            return sh;
        });
        const rusty = box(0.05, 0.6, 0.02, mat('plate', '#7a6a5a')); at(rusty, 0, -0.6, -0.25); rusty.rotation.x = -1.3; U.arms[1].add(rusty); // espada oxidada
        U.legs = [-1, 1].map(side => {
            const hp = pivot(U.hips, side * 0.09, -0.02, 0);
            const th = box(0.055, 0.38, 0.055, b); at(th, 0, -0.2, 0); hp.add(th);
            const sh2 = box(0.05, 0.36, 0.05, b); at(sh2, 0, -0.58, 0); hp.add(sh2);
            const ft = box(0.08, 0.04, 0.14, b); at(ft, 0, -0.78, -0.03); hp.add(ft);
            return hp;
        });
    },
    // Limo: una gota translúcida que salta
    slime(g, U) {
        const m = lambert({ map: tex('cloth', '#5f9a3a'), transparent: true, opacity: 0.88 });
        U.body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), m); U.body.position.y = 0.35; U.body.scale.y = 0.75; g.add(U.body);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x102008 });
        U.eyes = [-0.1, 0.1].map(x => { const e = box(0.07, 0.07, 0.02, eyeMat); at(e, x, 0.45, -0.36); g.add(e); return e; });
    }
};
// Un enemigo: grupo con sus pivotes en userData.U y todos sus materiales (para el destello del aviso)
export function buildEnemy(type) {
    const g = new THREE.Group(), U = {};
    BUILD[type](g, U);
    const mats = new Set(); g.traverse(o => { if (o.isMesh && o.material && o.material.emissive) [].concat(o.material).forEach(mm => mats.add(mm)); });
    g.userData = { U, mats: [...mats] };
    return g;
}
// Animación: caminar (piernas y brazos), respirar, levantar el arma mientras avisa (w: 0→1)
export function animateEnemy(mesh, t, moving, w, eyeColor) {
    const U = mesh.userData.U, sw = moving ? Math.sin(t * 7) : 0;
    if (U.legs) { U.legs[0].rotation.x = sw * 0.5; U.legs[1].rotation.x = -sw * 0.5; }
    if (U.hips) { U.hips.position.y = (U.hips.userData.y0 ??= U.hips.position.y) + (moving ? Math.abs(Math.sin(t * 7)) * 0.04 : Math.sin(t * 2) * 0.01); }
    if (U.arms) { U.arms[0].rotation.x = -sw * 0.4; U.arms[1].rotation.x = sw * 0.4 - 2.6 * w; U.arms[1].rotation.z = -0.3 * w; }
    if (U.head) U.head.rotation.x = -0.15 * w;
    if (U.body) { U.body.position.y = 0.35 + (moving ? Math.abs(Math.sin(t * 7)) * 0.12 : 0); U.body.scale.set(1 + w * 0.3, 0.75 + w * 0.35, 1 + w * 0.3); }
    (U.eyes || []).forEach(e => e.material.color.setHex(eyeColor));
}
