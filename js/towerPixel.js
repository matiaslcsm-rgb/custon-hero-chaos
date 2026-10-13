// Tower Chaos: suelo en pixel art (PRUEBA, 2026-10-13). Referencias del usuario: Noita y Risk of Rain 1.
//
//   Sin filtros: el suelo se dibuja de verdad en pixel art, a 17 píxeles por casilla (cada píxel ocupa 2×2 unidades).
//   - SUELO CONTINUO: en vez de baldosas repetidas, el suelo se pinta píxel por píxel con ruido (manchas grandes de
//     pasto, tierra, barro…), así no se nota la grilla. Los bordes entre tipos de suelo (pasto y camino, agua y orilla)
//     son irregulares. Se arma por trozos de 16×16 casillas, solo los que se ven, y se guardan.
//   - DETALLES por bioma: matas de pasto y flores en el bosque, burbujas en el fango, ondas en la arena, brillos en la
//     nieve, grietas encendidas en el volcán; piedritas en los caminos, adoquines en el pueblo, losas en el laberinto.
//   - ENCIMA: árboles, pinos, árboles secos, rocas, cactus y basalto como sprites con luz de arriba a la izquierda y
//     contorno oscuro (los árboles asoman sobre la casilla de arriba); paredes de piedra, acantilados, empalizada,
//     fuente y rampas.
//   Se prende en la pausa (🟫 Suelo en pixel art) o con ?pixel=1 en la dirección. Apagado, todo queda en tinta.

const PXG = { per: 17, scale: 2, chunk: 16, maxChunks: 90 };
let pixelEnabled = /[?&]pixel=1/.test(location.search);
try { if (!/[?&]pixel=/.test(location.search)) pixelEnabled = localStorage.getItem('chc-pixel') === 'on'; } catch (e) { /* sin almacenamiento */ }
function pixelOn() { return pixelEnabled && gameMode === 'tower'; }
function setPixelStyle(on) {
    pixelEnabled = on;
    try { localStorage.setItem('chc-pixel', on ? 'on' : 'off'); } catch (e) { /* no se guarda */ }
}

// --- RUIDO (siempre el mismo para la misma posición) ---
function pxHash(x, y, s = 0) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function pxNoise(x, y, s = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = pxHash(ix, iy, s), b = pxHash(ix + 1, iy, s), c = pxHash(ix, iy + 1, s), d = pxHash(ix + 1, iy + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

// --- PALETAS (de oscuro a claro) ---
const PX_TOWN = ['#4d4741', '#5b544d', '#686058', '#776e65'];
const PX_LAB = ['#35313b', '#3e3945', '#47424f', '#524c5a'];
const PX_BIOME = {
    forest: { ground: ['#2b4528', '#33522d', '#3d6133', '#4a723a'], road: ['#574330', '#654e37', '#735a3f', '#826648'],
        hazard: ['#35501f', '#3f5f24', '#4b6f2a', '#577f30'], deep: ['#1b3d50', '#224b63', '#2a5a76', '#356c8a'],
        tuft: '#6a9a44', tuftDark: '#24401f', flowers: ['#e0cf5a', '#d77a9a', '#e8e8e0'], foam: '#8fc7dc' },
    swamp: { ground: ['#2c3626', '#34402c', '#3d4a32', '#475538'], road: ['#463b2b', '#514533', '#5c4f3a', '#675942'],
        hazard: ['#38371d', '#424122', '#4c4b27', '#57562d'], deep: ['#1c322f', '#223d39', '#294843', '#30544e'],
        tuft: '#5c6e3a', tuftDark: '#20291b', flowers: ['#a8b84a', '#8a9a7a'], bubble: '#95a83c', foam: '#5f8a7a' },
    desert: { ground: ['#9a7443', '#a8804b', '#b68d55', '#c39b61'], road: ['#80603a', '#8c6a41', '#987549', '#a48052'],
        hazard: ['#8a6538', '#967040', '#a27b48', '#ad8651'], deep: ['#235a6e', '#2b6a80', '#357b92', '#438ea6'],
        tuft: '#7f8a4a', tuftDark: '#6b5230', flowers: ['#c94f3a', '#e0b060'], ripple: '#d4ae72', foam: '#a8dbe0' },
    snow: { ground: ['#a7b6c6', '#b5c3d1', '#c3d0dc', '#d2dde7'], road: ['#78736c', '#857f77', '#918b82', '#9d978d'],
        hazard: ['#bccbd9', '#c8d6e2', '#d4e0ea', '#e2ebf3'], deep: ['#3a6b91', '#4479a1', '#5088b1', '#5e99c3'],
        tuft: '#7f8f86', tuftDark: '#8797a8', flowers: ['#ffffff'], sparkle: '#ffffff', foam: '#e8f4fb' },
    volcano: { ground: ['#2d2523', '#372e2b', '#423733', '#4d413c'], road: ['#463b34', '#51443c', '#5c4e45', '#67584e'],
        hazard: ['#3a1e16', '#46241a', '#522b1e', '#5e3222'], deep: ['#b5350f', '#d34914', '#ec681b', '#ff9838'],
        tuft: '#5a4a42', tuftDark: '#1c1615', flowers: ['#6b5a50'], ember: ['#ff7a1a', '#ffb347'], foam: '#ffd27a' }
};
function pxBiome(level) { return PX_BIOME[level.biome] || PX_BIOME.forest; }

// --- QUÉ SUELO HAY EN CADA CASILLA ---
// ground, road, hazard, deep, town (adoquines), lab (losas del laberinto), cave (tierra de cueva)
function pxKind(level, x, y) {
    x = Math.max(0, Math.min(COLS - 1, x)); y = Math.max(0, Math.min(ROWS - 1, y));
    if (level.isCave) return 'cave';
    const i = y * COLS + x, w = level.walls[y][x];
    if (!level.zone) return 'lab';
    if (level.zone[i] === ZONE.lab && (!w || w === WALL.stone)) return 'lab';
    if (w === WALL.palisade || w === WALL.fountain) return 'town';
    if (level.deep && level.deep[i]) return 'deep';
    if (level.ramp && level.ramp[i]) return 'road';
    const gr = level.ground ? level.ground[i] : GROUND.plain;
    return gr === GROUND.hazard ? 'hazard' : gr === GROUND.road ? 'road' : gr === GROUND.town ? 'town' : gr === GROUND.lab ? 'lab' : 'ground';
}
function pxPalette(level, kind) {
    const B = pxBiome(level);
    if (kind === 'town') return PX_TOWN;
    if (kind === 'lab') return PX_LAB;
    if (kind === 'cave') return B.ground.map(c => shade(c, -0.45));
    return B[kind] || B.ground;
}

// --- UN TROZO DE SUELO (16×16 casillas), píxel por píxel ---
function pxGroundChunk(level, cx, cy) {
    const P = PXG.per, N = PXG.chunk, W = N * P;
    const c = document.createElement('canvas'); c.width = c.height = W;
    const g = c.getContext('2d'), img = g.createImageData(W, W), d = img.data;
    const B = pxBiome(level), ox = cx * N * P, oy = cy * N * P;
    const pal = {}, palOf = k => pal[k] || (pal[k] = pxPalette(level, k).map(hexRgb));
    // Tipo de suelo con el borde corrido (bordes irregulares entre tipos)
    const kindCache = new Map();
    const kindAtTile = (tx, ty) => { const key = tx * 4096 + ty; let k = kindCache.get(key); if (!k) { k = pxKind(level, tx, ty); kindCache.set(key, k); } return k; };
    const kindAtPx = (wx, wy) => {
        const jx = (pxNoise(wx / 5, wy / 5, 7) - 0.5) * 8, jy = (pxNoise(wx / 5, wy / 5, 8) - 0.5) * 8;
        return kindAtTile(Math.floor((wx + jx) / P), Math.floor((wy + jy) / P));
    };
    const put = (x, y, rgb) => { if (x < 0 || y < 0 || x >= W || y >= W) return; const o = (y * W + x) * 4; d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255; };
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const wx = ox + x, wy = oy + y, kind = kindAtPx(wx, wy), p = palOf(kind);
        let v;
        if (kind === 'town') { // adoquines: celdas de 6×4 corridas por fila, junta oscura
            const row = Math.floor(wy / 4), col = Math.floor((wx + (row % 2) * 3) / 6);
            const edge = wy % 4 === 0 || (wx + (row % 2) * 3) % 6 === 0;
            v = edge ? 0 : 1 + Math.floor(pxHash(col, row, 3) * 2.6);
        } else if (kind === 'lab') { // losas grandes (una por casilla, corridas) con junta y desgaste
            const lx = (wx + (Math.floor(wy / P) % 2) * 8) % P, ly = wy % P;
            v = lx === 0 || ly === 0 ? 0 : 1 + Math.floor(pxHash(Math.floor((wx + (Math.floor(wy / P) % 2) * 8) / P), Math.floor(wy / P), 5) * 2.2 + pxNoise(wx / 3, wy / 3, 6) * 0.8);
        } else {
            const big = pxNoise(wx / 30, wy / 30, 1), mid = pxNoise(wx / 9, wy / 9, 2), fine = pxHash(wx, wy, 4);
            v = Math.floor((big * 0.55 + mid * 0.45) * 3.3 + (fine - 0.5) * 0.9 + 0.35);
            if (kind === 'deep') { // agua (o lava): ondas horizontales claras
                const wave = Math.sin(wx / 4 + pxNoise(wx / 12, wy / 6, 9) * 6) > 0.92 && wy % 5 === 0;
                if (wave) v = 3;
            }
        }
        v = Math.max(0, Math.min(3, v));
        let rgb = p[v];
        // Orilla: espuma clara donde el agua toca tierra
        if (kind === 'deep' && kindAtPx(wx, wy - 2) !== 'deep') rgb = hexRgb(B.foam);
        // Sombra al pie de las paredes, acantilados y empalizadas (la pared "está arriba")
        const ty = Math.floor(wy / P), tx = Math.floor(wx / P);
        if (wy % P < 3 && ty > 0) { const wa = level.walls[ty - 1] && level.walls[ty - 1][tx]; if (wa && wa !== WALL.obstacle && wa !== WALL.edge && wa !== WALL.fountain) rgb = rgb.map(ch => ch * (wy % P === 0 ? 0.55 : wy % P === 1 ? 0.7 : 0.85)); }
        put(x, y, rgb);
    }
    // Detalles por casilla (siempre los mismos para la misma casilla)
    const tuft = hexRgb(B.tuft), tuftDark = hexRgb(B.tuftDark);
    for (let ty = 0; ty < N; ty++) for (let tx = 0; tx < N; tx++) {
        const gx = cx * N + tx, gy = cy * N + ty;
        if (gx >= COLS || gy >= ROWS) continue;
        const kind = pxKind(level, gx, gy), n = Math.floor(pxHash(gx, gy, 11) * 4);
        for (let k = 0; k < n; k++) {
            const r1 = pxHash(gx, gy, 20 + k), r2 = pxHash(gx, gy, 40 + k), r3 = pxHash(gx, gy, 60 + k);
            const x = tx * P + 2 + Math.floor(r1 * (P - 4)), y = ty * P + 3 + Math.floor(r2 * (P - 5));
            if (kind === 'ground' || kind === 'hazard') {
                if (level.biome === 'desert' && r3 < 0.6) { const rp = hexRgb(B.ripple); for (let i = -2; i <= 2; i++) put(x + i, y + (i === -2 || i === 2 ? 1 : 0), rp); continue; }
                if (level.biome === 'snow' && r3 < 0.5) { put(x, y, hexRgb(B.sparkle)); continue; }
                if (level.biome === 'volcano' && kind === 'hazard') { const e = B.ember.map(hexRgb); let px = x, py = y; for (let i = 0; i < 6; i++) { put(px, py, e[i % 2]); px += pxHash(gx, gy, 80 + i) < 0.5 ? 1 : 0; py += 1; px += pxHash(gx, gy, 90 + i) < 0.3 ? -1 : 1; } continue; }
                if (level.biome === 'swamp' && kind === 'hazard' && r3 < 0.6) { const b = hexRgb(B.bubble); put(x, y - 1, b); put(x - 1, y, b); put(x + 1, y, b); put(x, y + 1, b); continue; }
                if (r3 < 0.72) { put(x, y, tuftDark); put(x - 1, y - 1, tuft); put(x + 1, y - 1, tuft); put(x, y - 2, tuft); put(x, y - 1, tuftDark); } // mata
                else { const f = hexRgb(B.flowers[Math.floor(r1 * 97) % B.flowers.length]); put(x, y, f); put(x + 1, y, f); put(x, y + 1, f); put(x + 1, y + 1, tuftDark); } // flor o piedrita
            } else if (kind === 'road' || kind === 'cave') { // piedritas
                const s = palOf(kind); put(x, y, s[3]); put(x + 1, y, s[3]); put(x, y + 1, s[0]); put(x + 1, y + 1, s[0]);
            }
        }
    }
    g.putImageData(img, 0, 0);
    return c;
}
// Dibuja los trozos de suelo que se ven (y arma los que faltan). Devuelve true.
function drawPixelGround(level) {
    if (!level.pxGround || level.pxGround.biome !== level.biome) level.pxGround = { biome: level.biome, chunks: new Map() };
    const G = level.pxGround, N = PXG.chunk, size = N * TILE;
    const cx0 = Math.floor(camera.x / N), cy0 = Math.floor(camera.y / N), cx1 = Math.floor((camera.x + viewCols()) / N), cy1 = Math.floor((camera.y + viewRows()) / N);
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        const key = cx * 1000 + cy;
        let ch = G.chunks.get(key);
        if (!ch) {
            if (G.chunks.size >= PXG.maxChunks) G.chunks.delete(G.chunks.keys().next().value); // se olvida el más viejo
            ch = pxGroundChunk(level, cx, cy); G.chunks.set(key, ch);
        }
        ctx.drawImage(ch, cx * size, cy * size, size, size);
    }
    ctx.imageSmoothingEnabled = smooth;
    return true;
}

// --- SPRITES (árboles, rocas, paredes) ---
// Grilla de píxeles con ayudas para pintar formas con luz de arriba a la izquierda y contorno oscuro.
function pxSprite(w, h, paint) {
    const grid = new Array(w * h).fill(null);
    const raw = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? grid[y * w + x] : null);
    const S = {
        w, h, tx: 0, ty: 0, // tx/ty: corrimiento (margen para cuernos y alas)
        set(x, y, col) { x = Math.round(x) + S.tx; y = Math.round(y) + S.ty; if (x >= 0 && y >= 0 && x < w && y < h) grid[y * w + x] = col; },
        get(x, y) { return raw(Math.round(x) + S.tx, Math.round(y) + S.ty); },
        // Triángulo relleno
        tri(a, b, c, col) {
            const x0 = Math.floor(Math.min(a[0], b[0], c[0])), x1 = Math.ceil(Math.max(a[0], b[0], c[0])), y0 = Math.floor(Math.min(a[1], b[1], c[1])), y1 = Math.ceil(Math.max(a[1], b[1], c[1]));
            const side = (p, q, x, y) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
            for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
                const px = x + 0.5, py = y + 0.5, d1 = side(a, b, px, py), d2 = side(b, c, px, py), d3 = side(c, a, px, py);
                if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) S.set(x, y, col);
            }
        },
        // Bola con sombreado (pal: de oscuro a claro)
        ball(cx, cy, rx, ry, pal, rnd = Math.random) {
            for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
                const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, r2 = nx * nx + ny * ny;
                if (r2 > 1) continue;
                const lit = -nx * 0.55 - ny * 0.75 + (1 - r2) * 0.35 + (rnd() - 0.5) * 0.35;
                S.set(x, y, pal[Math.max(0, Math.min(pal.length - 1, Math.floor((lit + 0.75) * pal.length / 1.6)))]);
            }
        },
        rect(x0, y0, ww, hh, col) { for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + ww; x++) S.set(x, y, col); },
        line(x0, y0, x1, y1, col, wdt = 1) {
            const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
            for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; for (let k = 0; k < wdt; k++) S.set(x + k, y, col); }
        },
        // Contorno: los vacíos que tocan algo pintado se vuelven del color oscuro
        outline(col) {
            const add = [];
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((!grid[y * w + x] || grid[y * w + x] === 'shadow') && [raw(x - 1, y), raw(x + 1, y), raw(x, y - 1), raw(x, y + 1)].some(c => c && c !== 'shadow')) add.push([x, y]);
            add.forEach(([x, y]) => { grid[y * w + x] = col; });
        }
    };
    paint(S);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    grid.forEach((col, i) => { if (!col) return; g.fillStyle = col === 'shadow' ? 'rgba(10,8,6,0.35)' : col; g.fillRect(i % w, Math.floor(i / w), 1, 1); });
    return c;
}
const pxSeeded = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// Sombra en el piso (antes de pintar lo demás, para que quede debajo)
function pxShadow(S, cx, cy, rx, ry) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry; if (nx * nx + ny * ny <= 1) S.set(x, y, 'shadow'); } }

const PX_OBST = {
    tree(v, B, rnd) { // árbol frondoso: tronco y copa de tres bolas
        const leaf = v % 2 ? ['#1d3a1c', '#285024', '#33662c', '#448038', '#5c9c46'] : ['#1f3d20', '#2a5428', '#376b31', '#4a873c', '#66a64c'];
        return pxSprite(17, 25, S => {
            pxShadow(S, 8.5, 22.5, 7, 2.2);
            S.rect(7, 15, 3, 8, '#5a3d26'); S.rect(7, 15, 1, 8, '#3f2a1a'); S.set(9, 18, '#6e4c30');
            S.ball(5.5, 12, 4.6, 4.2, leaf, rnd); S.ball(11.5, 12, 4.6, 4.2, leaf, rnd); S.ball(8.5, 7.5, 5.6, 5.2, leaf, rnd);
            S.outline('#10200f');
        });
    },
    pine(v, B, rnd, biome) { // pino en tres pisos; con nieve en las puntas en el bioma de nieve
        const pal = ['#14301f', '#1d4229', '#285634', '#346a40'], snow = biome === 'snow';
        return pxSprite(17, 25, S => {
            pxShadow(S, 8.5, 22.5, 6, 2);
            S.rect(7, 19, 3, 4, '#4a3324');
            [[2, 9, 6], [7, 14, 7], [12, 20, 8]].forEach(([top, bot, hw]) => {
                for (let y = top; y <= bot; y++) { const k = (y - top) / (bot - top), half = Math.round(1 + k * hw); for (let x = 8 - half; x <= 8 + half; x++) S.set(x, y, pal[Math.min(3, Math.max(0, Math.floor((x < 8 ? 1 : 2.4) + k - (rnd() < 0.15 ? 1 : 0))))]); }
                if (snow) for (let x = 8 - Math.round(hw * 0.6); x <= 8 + Math.round(hw * 0.6); x++) if (rnd() < 0.7) S.set(x, bot - 1 - (x % 2), '#eef4f8');
            });
            S.set(8, 1, pal[3]);
            S.outline('#0b1a12');
        });
    },
    deadTree(v, B, rnd) { // árbol seco: ramas finas
        const bark = ['#3a3028', '#4a3d32', '#5b4b3d'];
        return pxSprite(17, 25, S => {
            pxShadow(S, 8.5, 22.5, 5, 1.8);
            S.line(8, 22, 8, 12, bark[1], 2); S.line(8, 13, 4, 6, bark[1], 1); S.line(8, 14, 13, 7, bark[2], 1);
            S.line(5, 8, 2, 6, bark[0], 1); S.line(12, 8, 15, 7, bark[0], 1); S.line(4, 6, 4, 3, bark[2], 1); S.line(13, 7, 13, 4, bark[1], 1);
            if (v === 1) S.line(8, 16, 11, 14, bark[0], 1);
            S.outline('#14100c');
        });
    },
    rock(v, B, rnd, biome) { // roca (o cactus en el desierto)
        if (biome === 'desert' && v === 2) return pxSprite(17, 21, S => {
            const pal = ['#3d5a2a', '#4f7134', '#63883f', '#7a9e4c'];
            pxShadow(S, 8.5, 18.5, 5, 1.6);
            S.rect(7, 5, 3, 14, pal[2]); S.rect(7, 5, 1, 14, pal[1]); S.rect(9, 5, 1, 14, pal[3]);
            S.rect(3, 9, 2, 5, pal[2]); S.rect(3, 13, 4, 2, pal[1]); S.rect(12, 7, 2, 5, pal[2]); S.rect(10, 11, 3, 2, pal[1]);
            for (let y = 6; y < 18; y += 3) S.set(8, y, '#d8e0a0');
            S.set(4, 8, '#e06a8a'); S.outline('#18240f');
        });
        const pal = biome === 'snow' ? ['#4c5560', '#5f6a76', '#76828e', '#909ba6', '#c9d3dc'] : biome === 'desert' ? ['#5e4630', '#76593d', '#8e6d4b', '#a6825b', '#bf9a70'] : ['#3a3734', '#4b4743', '#5e5954', '#736d67', '#8c857e'];
        return pxSprite(17, 19, S => {
            pxShadow(S, 8.5, 16, 7.5, 2.2);
            S.ball(8.5, 11, 7 - v * 0.6, 5.5, pal, rnd); if (v !== 1) S.ball(4.5, 13, 3.4, 2.8, pal, rnd);
            if (biome === 'snow') for (let x = 4; x < 14; x++) if (rnd() < 0.8) { for (let y = 0; y < 19; y++) if (S.get(x, y) && S.get(x, y) !== 'shadow') { S.set(x, y, '#eef4f8'); break; } }
            S.outline('#16130f');
        });
    },
    basalt(v, B, rnd) { // basalto con grietas encendidas
        const pal = ['#1a1615', '#252020', '#322b29', '#403735'];
        return pxSprite(17, 19, S => {
            pxShadow(S, 8.5, 16, 7.5, 2.2);
            S.ball(8.5, 10.5, 6.6, 6, pal, rnd);
            let x = 6 + v, y = 6; for (let i = 0; i < 7; i++) { S.set(x, y, i % 2 ? '#ff7a1a' : '#ffb347'); y++; x += rnd() < 0.5 ? 1 : -1; }
            S.outline('#0c0a09');
        });
    }
};
// Paredes y construcciones (17×17, una casilla entera)
const PX_WALLS = {
    labFace: rnd => pxSprite(17, 17, S => { // pared del laberinto vista de frente: ladrillos con luz arriba
        S.rect(0, 0, 17, 17, '#3b3542');
        for (let r = 0; r < 4; r++) for (let k = -1; k < 3; k++) {
            const x0 = k * 8 + (r % 2) * 4 + 1, y0 = r * 4 + 1, base = ['#5a5266', '#635a70', '#6c6379'][Math.floor(rnd() * 3)];
            S.rect(x0, y0, 7, 3, base); S.rect(x0, y0, 7, 1, shade(base, 0.18)); S.set(x0 + 6, y0 + 2, shade(base, -0.25));
        }
        S.rect(0, 16, 17, 1, '#1e1a22');
    }),
    labTop: rnd => pxSprite(17, 17, S => { // pared vista desde arriba: piedra oscura con textura
        S.rect(0, 0, 17, 17, '#26222b');
        for (let i = 0; i < 14; i++) S.set(Math.floor(rnd() * 17), Math.floor(rnd() * 17), rnd() < 0.5 ? '#2f2a35' : '#1d1a21');
    }),
    caveFace: (rnd, pal) => pxSprite(17, 17, S => {
        for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) S.set(x, y, pal[Math.min(3, Math.floor(pxNoise(x / 3, y / 2, 5 + Math.floor(rnd() * 9)) * 3 + (y < 3 ? 1 : 0)))]);
        for (let x = 0; x < 17; x++) { S.set(x, 0, pal[3]); S.set(x, 16, '#0d0b0a'); }
    }),
    caveTop: (rnd, pal) => pxSprite(17, 17, S => {
        S.rect(0, 0, 17, 17, pal[0]);
        for (let i = 0; i < 10; i++) S.set(Math.floor(rnd() * 17), Math.floor(rnd() * 17), pal[1]);
    }),
    cliff: (rnd, top, face) => pxSprite(17, 17, S => { // acantilado: el borde de arriba con pasto y la pared de roca en capas
        for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) S.set(x, y, y < 4 ? top[y < 1 ? 3 : 2] : face[Math.max(0, Math.min(3, Math.floor(3 - (y - 4) / 4 + (rnd() - 0.5) * 0.9)))]);
        for (let x = 0; x < 17; x++) { S.set(x, 4, '#14110e'); if (rnd() < 0.35) S.set(x, 5, top[1]); }
        for (let y = 8; y < 17; y += 4) for (let x = 0; x < 17; x++) if (rnd() < 0.6) S.set(x, y, shade(face[0], -0.2));
    }),
    palisade: rnd => pxSprite(17, 17, S => { // empalizada: troncos con punta y dos sogas
        for (let i = 0; i < 4; i++) {
            const x0 = i * 4 + 1, pal = ['#4f3725', '#634631', '#77573d', '#8b6849'];
            S.rect(x0, 3, 3, 14, pal[1 + (i % 2)]); S.rect(x0, 3, 1, 14, pal[0]); S.set(x0 + 2, 6, pal[3]); S.set(x0 + 1, 2, pal[2]); S.set(x0 + 1, 1, pal[3]);
        }
        S.rect(0, 7, 17, 1, '#2f2218'); S.rect(0, 12, 17, 1, '#2f2218');
        S.outline('#1a120c');
    }),
    fountain: rnd => pxSprite(17, 17, S => {
        S.ball(8.5, 9, 7.5, 6.5, ['#4d4741', '#5b544d', '#6b635b', '#7b726a', '#8f867d'], rnd);
        S.ball(8.5, 9, 5.5, 4.6, ['#24506a', '#2c6080', '#3a7396', '#5a92b3'], rnd);
        S.rect(8, 3, 2, 6, '#7b726a'); S.set(8, 2, '#bfe3f2'); S.set(9, 1, '#bfe3f2'); S.set(7, 2, '#bfe3f2');
        S.outline('#1a1614');
    }),
    ramp: rnd => pxSprite(17, 17, S => { for (let y = 2; y < 17; y += 4) { S.rect(1, y, 15, 1, 'rgba(20,16,12,0.55)'); S.rect(1, y + 1, 15, 1, 'rgba(255,240,210,0.18)'); } })
};

// Caché de sprites por bioma (3 variantes de cada uno)
const pxSpriteCache = {};
function pxObstacle(level, v) {
    const B = BIOMES[level.biome], key = level.biome + ':' + B.obstacle + ':' + v;
    if (!pxSpriteCache[key]) {
        const draw = PX_OBST[B.obstacle] || PX_OBST.rock, rnd = pxSeeded(1000 + v * 77 + key.length * 13);
        pxSpriteCache[key] = draw(v, pxBiome(level), rnd, level.biome);
    }
    return pxSpriteCache[key];
}
function pxWall(name, v, ...args) {
    const key = name + ':' + v + ':' + args.map(a => Array.isArray(a) ? a.join() : a).join('|');
    return pxSpriteCache[key] || (pxSpriteCache[key] = PX_WALLS[name](pxSeeded(500 + v * 101 + name.length * 7), ...args));
}

// Lo que va encima del suelo en una casilla (lo llama drawTowerTiles)
function drawPixelWall(level, x, y) {
    const w = level.walls[y][x], h = ((x * 73856093) ^ (y * 19349663)) >>> 0, S = PXG.scale;
    const put = (img, dy = 0) => { const s = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(img, x * TILE, y * TILE + TILE - img.height * S + dy, img.width * S, img.height * S); ctx.imageSmoothingEnabled = s; };
    const below = y + 1 < ROWS && !level.walls[y + 1][x];
    if (level.isCave) {
        if (!w) return;
        const pal = pxBiome(level).ground.map(c => shade(c, -0.3));
        put(below ? pxWall('caveFace', h & 1, pal) : pxWall('caveTop', h & 1, pal.map(c => shade(c, -0.35))));
        return;
    }
    if (level.ramp && level.ramp[y * COLS + x]) { put(pxWall('ramp', 0)); return; }
    if (!w) return;
    if (pxKind(level, x, y) === 'lab' && w === WALL.stone) { put(below ? pxWall('labFace', h & 1) : pxWall('labTop', h & 1)); return; }
    if (w === WALL.obstacle || w === WALL.edge) { put(pxObstacle(level, h % 3), 0); return; }
    if (w === WALL.cliff) { const B = pxBiome(level); put(pxWall('cliff', h & 1, B.ground, B.ground.map(c => shade(c, -0.4)))); return; }
    if (w === WALL.palisade) { put(pxWall('palisade', 0)); return; }
    if (w === WALL.fountain) { put(pxWall('fountain', 0)); return; }
    if (w === WALL.stone) put(below ? pxWall('labFace', h & 1) : pxWall('labTop', h & 1));
}
