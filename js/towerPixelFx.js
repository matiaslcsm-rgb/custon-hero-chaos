// Tower Chaos: efectos de combate en pixel art (2026-10-13, estilo principal de la Torre; va con el suelo en pixel art, towerPixel.js).
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
const PX_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16); // tramado ordenado 4×4
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
    // Bordes duros: lo casi opaco queda lleno; lo transparente pasa a tramado (píxeles salteados con la misma cobertura),
    // así un relleno tenue (el área de un aviso) se sigue viendo entero, como en los juegos de 16 bits
    const img = g.getImageData(0, 0, w, h), d = img.data;
    let any = false;
    for (let i = 3, p = 0; i < d.length; i += 4, p++) {
        const a = d[i]; if (!a) continue; any = true;
        d[i] = a >= PXF.cut[2] ? 255 : a / PXF.cut[2] > PX_BAYER[(Math.floor(p / w) & 3) * 4 + ((p % w) & 3)] ? PXF.cut[2] : 0;
    }
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

// --- NIEBLA SIN CUADRADITOS ---
// Lo no descubierto (negro) y lo descubierto fuera de la vista (oscurecido), con el borde suavizado entre casillas y
// tramado: 8 píxeles por casilla, así el borde se ve de píxeles y no de baldosas.
const PXFOG = { sub: 8, dark: [14, 11, 10], seen: 0.55 };
let pxFogCanvas = null, pxFogCtx = null;
function pxDrawFog(level) {
    const S = PXFOG.sub, x0 = Math.max(0, Math.floor(camera.x) - 1), y0 = Math.max(0, Math.floor(camera.y) - 1);
    const x1 = Math.min(COLS - 1, Math.floor(camera.x + viewCols()) + 1), y1 = Math.min(ROWS - 1, Math.floor(camera.y + viewRows()) + 1);
    const nx = x1 - x0 + 1, ny = y1 - y0 + 1, W = nx * S, H = ny * S;
    const v = new Float32Array(nx * ny); // 1 = sin descubrir, 0,55 = fuera de la vista, 0 = a la vista
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) { const tx = x0 + x, ty = y0 + y; v[y * nx + x] = !level.explored[ty][tx] ? 1 : !canSee(level, tx, ty) ? PXFOG.seen : 0; }
    if (!pxFogCanvas) { pxFogCanvas = document.createElement('canvas'); pxFogCtx = pxFogCanvas.getContext('2d'); }
    if (pxFogCanvas.width !== W || pxFogCanvas.height !== H) { pxFogCanvas.width = W; pxFogCanvas.height = H; }
    const img = pxFogCtx.createImageData(W, H), d = img.data, [r, g, b] = PXFOG.dark;
    const at = (x, y) => v[Math.max(0, Math.min(ny - 1, y)) * nx + Math.max(0, Math.min(nx - 1, x))];
    for (let py = 0; py < H; py++) {
        const fy = (py + 0.5) / S - 0.5, iy = Math.floor(fy), ky = fy - iy;
        for (let px = 0; px < W; px++) {
            const fx = (px + 0.5) / S - 0.5, ix = Math.floor(fx), kx = fx - ix;
            const a = at(ix, iy) * (1 - kx) * (1 - ky) + at(ix + 1, iy) * kx * (1 - ky) + at(ix, iy + 1) * (1 - kx) * ky + at(ix + 1, iy + 1) * kx * ky;
            if (a <= 0.01) continue;
            const t = PX_BAYER[(py & 3) * 4 + (px & 3)];
            const alpha = a <= PXFOG.seen ? (a / PXFOG.seen > t ? PXFOG.seen : 0) : ((a - PXFOG.seen) / (1 - PXFOG.seen) > t ? 1 : PXFOG.seen);
            if (!alpha) continue;
            const o = (py * W + px) * 4; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = Math.round(alpha * 255);
        }
    }
    pxFogCtx.putImageData(img, 0, 0);
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pxFogCanvas, x0 * TILE, y0 * TILE, nx * TILE, ny * TILE);
    ctx.imageSmoothingEnabled = sm;
}

// --- NOCHE CON TRAMADO ---
// La capa de oscuridad (con los huecos de luz) se baja al tamaño del píxel de los sprites y su transparencia pasa a
// escalones con tramado: los círculos de luz quedan con borde de píxeles en vez de un degradé liso.
let pxNightLow = null, pxNightCtx = null;
function pxDitherDraw(src) {
    const q = PXG.scale * viewScale(), w = Math.ceil(src.width / q), h = Math.ceil(src.height / q);
    if (!pxNightLow) { pxNightLow = document.createElement('canvas'); pxNightCtx = pxNightLow.getContext('2d', { willReadFrequently: true }); }
    if (pxNightLow.width !== w || pxNightLow.height !== h) { pxNightLow.width = w; pxNightLow.height = h; }
    pxNightCtx.clearRect(0, 0, w, h); pxNightCtx.imageSmoothingEnabled = true;
    pxNightCtx.drawImage(src, 0, 0, w, h);
    const img = pxNightCtx.getImageData(0, 0, w, h), d = img.data, steps = 4;
    for (let i = 3, p = 0; i < d.length; i += 4, p++) {
        const a = d[i] / 255 * steps, lo = Math.floor(a);
        d[i] = Math.round(Math.min(steps, lo + (a - lo > PX_BAYER[(Math.floor(p / w) & 3) * 4 + ((p % w) & 3)] ? 1 : 0)) / steps * 255);
    }
    pxNightCtx.putImageData(img, 0, 0);
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pxNightLow, 0, 0, w * q, h * q);
    ctx.imageSmoothingEnabled = sm;
}

// --- CLIMA EN PÍXELES ---
// Mismas partículas de siempre (towerAtmos.js), dibujadas como píxeles del tamaño de los de los sprites.
function pxWeatherPart(p, i) {
    const q = PXG.scale * viewScale(), X = Math.round(p.x / q) * q, Y = Math.round(p.y / q) * q;
    if (p.kind === 'rain') { ctx.fillRect(X, Y, q, q * 3); return; }
    if (p.kind === 'sand') { ctx.fillRect(X, Y, q * 3, q); return; }
    if (p.kind === 'leaf') { const up = Math.sin(p.t * 3 + i) > 0; ctx.fillRect(X, Y, up ? q * 2 : q, up ? q : q * 2); return; }
    if (p.glow) { // luciérnagas y brasas: un píxel que brilla con un halo tenue
        ctx.globalCompositeOperation = 'lighter';
        const a = ctx.globalAlpha; ctx.globalAlpha = a * 0.25; ctx.fillRect(X - q, Y - q, q * 3, q * 3);
        ctx.globalAlpha = a; ctx.fillRect(X, Y, q, q);
        ctx.globalCompositeOperation = 'source-over'; return;
    }
    const s = p.kind === 'snow' && p.size > 2.6 ? 2 : 1;
    ctx.fillRect(X, Y, q * s, q * s);
}
