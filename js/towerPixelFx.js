// Tower Chaos: efectos de combate en pixel art (PRUEBA, 2026-10-13; va con el suelo en pixel art, towerPixel.js).
//
//   - CAPAS DE EFECTOS: los tajos, aros, avisos de golpe, zonas, proyectiles y balas se dibujan como siempre, pero en una
//     imagen chica con el mismo tamaño de píxel que los sprites (1 píxel = 2 unidades) y con bordes duros (sin el borde
//     suave del dibujo vectorial). Después se agranda sin suavizar. Solo los efectos: el suelo, las criaturas y la
//     interfaz no pasan por acá. Dos capas: la de abajo (avisos y zonas, debajo de las unidades) y la de arriba.
//   - SANGRE Y RESTOS (lo de Noita): cada golpe salpica unas gotas y cada muerte revienta en pedacitos que vuelan, caen y
//     quedan en el piso un rato. El color depende del cuerpo: sangre roja, polvo de piedra en los gólems, ectoplasma en los
//     espectros, icor verde en los enjambres. Chispas claras en cada golpe.
//   - NÚMEROS DE DAÑO con una fuente de píxeles de 3×5 (las palabras siguen en letra común).

const PXF = { cut: [50, 120, 200], debrisMax: 500, gravity: 320 };
const pxfLayers = {};
// El canvas principal pasa a ser otro por un momento (todo lo que se dibuja usa la variable ctx)
function withCtx(c, fn) { const old = ctx; ctx = c; try { fn(); } finally { ctx = old; } }

// Dibuja `draw` (en coordenadas del mundo) en una capa de píxeles grandes y la pega en la pantalla
function pxFxLayer(name, draw) {
    const P = PXG.scale * viewScale() * (window.devicePixelRatio || 1); // píxeles reales por píxel de sprite
    const w = Math.ceil(canvas.width / P) + 1, h = Math.ceil(canvas.height / P) + 1;
    let L = pxfLayers[name];
    if (!L) { const c = document.createElement('canvas'); L = pxfLayers[name] = { c, g: c.getContext('2d', { willReadFrequently: true }) }; }
    if (L.c.width !== w || L.c.height !== h) { L.c.width = w; L.c.height = h; }
    const g = L.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    g.setTransform(1 / PXG.scale, 0, 0, 1 / PXG.scale, -camera.x * TILE / PXG.scale, -camera.y * TILE / PXG.scale);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    withCtx(g, draw);
    // Bordes duros: la transparencia queda en 3 escalones (nada, media, llena)
    const img = g.getImageData(0, 0, w, h), d = img.data, [c0, c1, c2] = PXF.cut;
    let any = false;
    for (let i = 3; i < d.length; i += 4) { const a = d[i]; if (!a) continue; any = true; d[i] = a < c0 ? 0 : a < c1 ? 110 : a < c2 ? 180 : 255; }
    if (!any) return;
    g.putImageData(img, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(L.c, 0, 0, w * P, h * P);
    ctx.restore();
}

// Rango de ataque del héroe: aro de puntos (el punteado fino se perdía en la capa de píxeles)
function pxRangeRing() {
    if (!player.isAlive()) return;
    const p = drawPos(player, 0), cx = p.x * TILE + TILE / 2, cy = p.y * TILE + TILE / 2, r = effRange(player) * TILE;
    const n = Math.max(20, Math.round(r / 3.5)); ctx.fillStyle = '#e8b4a0';
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + fxClock * 0.15; ctx.fillRect(Math.round((cx + Math.cos(a) * r) / 2) * 2 - 1, Math.round((cy + Math.sin(a) * r) / 2) * 2 - 1, 2, 2); }
}

// --- SANGRE, RESTOS Y CHISPAS ---
function pxBloodOf(u) {
    const body = typeof pixelBodyFor === 'function' ? pixelBodyFor(u) : null;
    if (body === 'golem' || body === 'boss:forest') return ['#6e6862', '#8a837b', '#4e4842'];
    if (body === 'wraith' || body === 'phantom') return ['#9df2ff', '#c8f8ff', '#6ad0e8'];
    if (body === 'swarm' || body === 'toad' || body === 'boss:swamp') return ['#7a9a3a', '#5a7a2a', '#a4c23a'];
    if (body === 'kamikaze' || body === 'boss:volcano') return ['#ff7a1a', '#ffb347', '#3a3035'];
    if (body === 'boss:snow') return ['#bfe8f8', '#e8f8ff', '#7fc8e8'];
    return ['#7a1212', '#5a0c0c', '#9a1a1a'];
}
function pxBleed(u, n, kind) {
    if (!pixelOn() || gameMode !== 'tower' || !u || !u.arena || u.arena !== viewArena()) return;
    const L = u.arena, list = L.pxDebris || (L.pxDebris = []);
    const x = (u.rx ?? u.x) * TILE + TILE / 2, y = (u.ry ?? u.y) * TILE + TILE * 0.85, blood = pxBloodOf(u);
    const gib = kind === 'death' && u.color ? [shade(u.color, -0.2), shade(u.color, -0.45)] : null;
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = (kind === 'death' ? 25 + Math.random() * 55 : 12 + Math.random() * 30);
        list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, z: 10 + Math.random() * 14, vz: 40 + Math.random() * 70,
            c: gib && i % 3 === 0 ? gib[i % 2] : blood[i % blood.length], big: kind === 'death' && i % 4 === 0, born: fxClock, life: 9 + Math.random() * 7 });
    }
    // Chispas claras (no quedan en el piso)
    const sparks = kind === 'death' ? 6 : 3;
    for (let i = 0; i < sparks; i++) { const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 60; list.push({ x, y: y - 12, vx: Math.cos(a) * v, vy: Math.sin(a) * v, z: 0, vz: 0, c: i % 2 ? '#fff6d0' : '#ffd166', spark: true, born: fxClock, life: 0.22 + Math.random() * 0.15 }); }
    if (list.length > PXF.debrisMax) list.splice(0, list.length - PXF.debrisMax);
}
let pxfLastClock = 0;
// phase 'ground': lo que ya cayó (debajo de las unidades) · 'air': lo que vuela (y avanza la física)
function pxDrawDebris(level, phase) {
    const list = level.pxDebris;
    if (!list || !list.length) return;
    if (phase === 'air') {
        const dt = Math.min(0.1, Math.max(0, fxClock - pxfLastClock)); pxfLastClock = fxClock;
        level.pxDebris = list.filter(p => fxClock - p.born < p.life);
        level.pxDebris.forEach(p => {
            if (p.landed) return;
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.spark) { p.vx *= Math.pow(0.02, dt); p.vy *= Math.pow(0.02, dt); return; }
            p.vz -= PXF.gravity * dt; p.z += p.vz * dt;
            if (p.z <= 0) { p.z = 0; p.landed = true; }
        });
    }
    ctx.save();
    level.pxDebris.forEach(p => {
        if ((phase === 'ground') !== !!p.landed) return;
        const left = p.life - (fxClock - p.born);
        ctx.globalAlpha = p.spark ? 1 : Math.max(0, Math.min(1, left / 2));
        ctx.fillStyle = p.c;
        const s = p.big ? 4 : 2;
        ctx.fillRect(Math.round(p.x / 2) * 2, Math.round((p.y - p.z) / 2) * 2, s, p.spark ? 2 : s);
    });
    ctx.restore();
}

// --- NÚMEROS DE DAÑO (fuente de 3×5) ---
const PX_DIGITS = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111',
    6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111', '+': '000010111010000', '-': '000000111000000', '!': '010010010000010' };
function pxNumberText(text) { return /^[+-]?\d+!?$/.test(text); }
function pxDrawNumber(text, x, y, color, s) {
    const chars = [...text], width = chars.length * 4 - 1, x0 = Math.round(x - width * s / 2), y0 = Math.round(y - 2.5 * s);
    const each = fn => chars.forEach((ch, i) => { const g = PX_DIGITS[ch]; if (g) for (let k = 0; k < 15; k++) if (g[k] === '1') fn(x0 + (i * 4 + k % 3) * s, y0 + Math.floor(k / 3) * s); });
    ctx.fillStyle = '#120c0a'; each((px, py) => ctx.fillRect(px - s, py - s, s * 3, s * 3)); // contorno
    ctx.fillStyle = color; each((px, py) => ctx.fillRect(px, py, s, s));
}
