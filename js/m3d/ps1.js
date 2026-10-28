// Copiado de arena-robots (https://github.com/matiaslcsm-rgb/arena-robots, src/ps1.js) el 2026-10-28 para MATCH 3D.
// El look de PlayStation 1:
//   · se dibuja a 320x240 y se agranda sin suavizar (píxeles gordos)
//   · los vértices se "pegan" a la grilla de la pantalla (el temblor típico de la PS1)
//   · texturas chicas sin filtro, colores planos y niebla que tapa lo lejano
import * as THREE from 'three';

// MATCH 3D: la resolución no es fija (se ajusta al tamaño del mapa con setRes); el temblor de los vértices usa la misma.
export const RES = { w: 320, h: 240 };
const SNAP = { value: new THREE.Vector2(RES.w / 2, RES.h / 2) };
export function setRes(w, h) { RES.w = w; RES.h = h; SNAP.value.set(w / 2, h / 2); }

export function makeRenderer(canvas) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(1);
    r.setSize(RES.w, RES.h, false);
    return r;
}

// Material con vértices pegados a la grilla de 320x240
function ps1(mat) {
    mat.onBeforeCompile = sh => {
        sh.uniforms.uSnap = SNAP; // compartido: setRes lo actualiza para todos
        sh.vertexShader = 'uniform vec2 uSnap;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
            vec4 sp = gl_Position; sp.xyz /= sp.w; sp.xy = floor(sp.xy * uSnap + 0.5) / uSnap; sp.xyz *= sp.w; gl_Position = sp;`);
    };
    return mat;
}

// --- TEXTURAS hechas en código (chicas, sin filtro) ---
function canvasTex(size, paint, repeat = 1) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    paint(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
    return t;
}
// azar repetible (las texturas salen iguales siempre)
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };

// Chapa blindada: el color con manchas de mugre, raspones, líneas de panel y tornillos en las esquinas
function plate(hex, seed) {
    return canvasTex(32, (g, n) => {
        const r = rng(seed);
        g.fillStyle = hex; g.fillRect(0, 0, n, n);
        for (let i = 0; i < 40; i++) { g.fillStyle = shade(hex, 0.8 + r() * 0.12); g.fillRect(r() * n | 0, r() * n | 0, 1 + r() * 4 | 0, 1 + r() * 3 | 0); } // mugre
        for (let i = 0; i < 10; i++) { g.fillStyle = shade(hex, 1.25); g.fillRect(r() * n | 0, r() * n | 0, 1 + r() * 3 | 0, 1); }          // raspones
        g.fillStyle = shade(hex, 0.62); g.fillRect(0, 0, n, 1); g.fillRect(0, 0, 1, n); g.fillRect(0, n / 2, n, 1);                    // líneas de panel
        g.fillStyle = shade(hex, 1.35);
        for (const [x, y] of [[2, 2], [n - 3, 2], [2, n / 2 + 2], [n - 3, n / 2 + 2]]) g.fillRect(x, y, 1, 1);                         // tornillos
    });
}
function hazard() {
    return canvasTex(16, (g, n) => {
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = ((x + y) >> 2) % 2 ? '#1a1b1d' : '#f2c21a'; g.fillRect(x, y, 1, 1); }
    }, 2);
}
function tread() {
    return canvasTex(16, (g, n) => {
        g.fillStyle = '#2a2c2f'; g.fillRect(0, 0, n, n);
        g.fillStyle = '#4a4e53'; for (let y = 0; y < n; y += 4) g.fillRect(0, y, n, 2);
        g.fillStyle = '#5a4b38'; g.fillRect(3, 5, 2, 1); g.fillRect(10, 13, 3, 1);                                                      // barro
    });
}
// El piso de la arena: hormigón con juntas, manchas de aceite y marcas de pintura
export function floorTex(repeat) {
    return canvasTex(64, (g, n) => {
        const r = rng(7);
        g.fillStyle = '#8b8d8a'; g.fillRect(0, 0, n, n);
        for (let i = 0; i < 220; i++) { g.fillStyle = shade('#8b8d8a', 0.85 + r() * 0.25); g.fillRect(r() * n | 0, r() * n | 0, 1, 1); }
        for (let i = 0; i < 2; i++) { g.fillStyle = 'rgba(40,36,30,0.18)'; g.beginPath(); g.ellipse(r() * n, r() * n, 2 + r() * 3, 1 + r() * 2, 0, 0, 7); g.fill(); } // manchas de aceite
        g.fillStyle = '#6a6c69'; g.fillRect(0, 0, n, 1); g.fillRect(0, 0, 1, n);
        g.fillStyle = '#c9a628'; g.fillRect(n - 6, 4, 2, 10);
    }, repeat);
}
export function wallTex() { return plate('#7d8386', 31); }

// Los materiales de las piezas (uno por nombre, compartidos)
const MATS = {};
export function mat(name) {
    if (MATS[name]) return MATS[name];
    const P = { gris: '#7d8386', oliva: '#6c7448', hueso: '#d2cdbb', nar: '#f27a1a', ama: '#f2c21a', carbon: '#3a3e43', metal: '#a2a8ad',
        hierro: '#4a4e54', junta: '#2c2f33', cobre: '#a8643a' }; // hierro, junta y cobre: el esqueleto
    const WIRES = { cableR: '#b8352c', cableV: '#3f8a3a', cableA: '#2f56a8' };
    let m;
    if (WIRES[name]) m = new THREE.MeshLambertMaterial({ color: WIRES[name] });
    else if (name === 'peligro') m = new THREE.MeshLambertMaterial({ map: hazard() });
    else if (name === 'oruga') m = new THREE.MeshLambertMaterial({ map: tread() });
    else if (name === 'lente') m = new THREE.MeshBasicMaterial({ color: '#3cd8f0' });            // brilla: no le afecta la luz
    else m = new THREE.MeshLambertMaterial({ map: plate(P[name], name.length * 97 + 13) });
    m.flatShading = true;
    return (MATS[name] = ps1(m));
}
export const ps1Material = ps1;
