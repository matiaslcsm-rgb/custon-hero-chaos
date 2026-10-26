// Infinite Tower 2D: el mundo de píxeles, estilo Noita liviano (decidido por el usuario 2026-10-25).
//
//   Cada píxel del dibujo es un material. Lo que ves es exactamente con lo que chocás.
//   · roca: no se rompe nunca (el armazón de la torre) · piedra: la rompe el golpe cargado · tierra: la rompe cualquier tajo
//   · arena: cae y se amontona · agua: corre y llena huecos (te frena y podés nadar) · madera: sólida, se quema
//   · fuego: quema la madera y se apaga solo · lava: corre lenta, quema, vuelve piedra al agua · humo: sube y se va
//   · espinas: sólidas y lastiman
//   · ácido: líquido que disuelve lo que toca (menos la roca) y se gasta · vapor: sube y se condensa en gotas de agua
//   · ceniza: lo que queda de la madera quemada; es liviana y flota en el agua
//   Cada material tiene su densidad (MAT_DENS): lo más pesado se hunde debajo de lo más liviano (el aceite flota en el
//   agua, la arena se hunde, la ceniza flota).
//   Solo se simulan los trozos (16×16) donde algo se movió: así anda liviano en el navegador.
//   Las salas fijas son imágenes (torre2d/salas/*.png): cada color es un material (guía en docs/TORRE2D-SALAS.md).

const MAT = { AIR: 0, ROCK: 1, STONE: 2, DIRT: 3, SAND: 4, WATER: 5, WOOD: 6, FIRE: 7, LAVA: 8, SMOKE: 9, SPIKE: 10, GRAVEL: 11, OIL: 12, STEAM: 13, ACID: 14, ASH: 15 };
// Colores de la imagen de cada sala → material (y marcas: entrada, enemigos, la pluma)
const T2D_COLORS = [
    [MAT.ROCK, 0x505050], [MAT.STONE, 0x7a7a7a], [MAT.DIRT, 0x7d5a3a], [MAT.SAND, 0xe6c35c], [MAT.WATER, 0x2f6fd6],
    [MAT.WOOD, 0xc08040], [MAT.LAVA, 0xff4000], [MAT.SPIKE, 0xd0d0e0], [MAT.GRAVEL, 0x9a9488], [MAT.OIL, 0x3a2a1a], [MAT.ACID, 0x80e020],
    ['P', 0xff00ff], ['E', 0x00ff00], ['C', 0xff8800], ['F', 0xffff00], ['T', 0xaa00ff]
];
// Cómo se dibuja cada material (dos tonos: el píxel elige uno según su "veta")
const MAT_LOOK = {
    [MAT.ROCK]: [0x34303c, 0x3e3846, 0x4a4352, 0x554e5e], [MAT.STONE]: [0x625a6e, 0x6c6478, 0x7a7286, 0x877f92],
    [MAT.DIRT]: [0x5e4330, 0x6e4f35, 0x7d5a3a, 0x8a6442], [MAT.SAND]: [0xcfa64e, 0xd9b45a, 0xe6c35c, 0xefd27a],
    [MAT.WATER]: [0x2a63c4, 0x2f6fd6, 0x3a7fe6, 0x4a8ef0], [MAT.WOOD]: [0x8a5a2e, 0x9a6534, 0xb07440, 0xbf8150],
    [MAT.FIRE]: [0xff5a10, 0xff7a1a, 0xffb02a, 0xffd23f], [MAT.LAVA]: [0xe03000, 0xff4000, 0xff6010, 0xff7a1a],
    [MAT.SMOKE]: [0x5e5864, 0x6a6470, 0x75707b, 0x7d7783], [MAT.SPIKE]: [0xb8bbc1, 0xc9ccd1, 0xdadde2, 0xe6e8ec],
    [MAT.GRAVEL]: [0x7a7468, 0x8a8478, 0x9a9488, 0xa29c90], [MAT.OIL]: [0x261a10, 0x2e2016, 0x352619, 0x3d2c1e],
    [MAT.STEAM]: [0xc8ced8, 0xd2d8e0, 0xdce1e8, 0xe6eaef], [MAT.ACID]: [0x5cc21e, 0x6ad12a, 0x80e020, 0x9cf04a],
    [MAT.ASH]: [0x45404a, 0x504a55, 0x5a545f, 0x655f6a]
};
const MAT_SOLID = new Uint8Array(16), MAT_LIQUID = new Uint8Array(16);
[MAT.ROCK, MAT.STONE, MAT.DIRT, MAT.SAND, MAT.WOOD, MAT.SPIKE, MAT.GRAVEL].forEach(m => { MAT_SOLID[m] = 1; });
[MAT.WATER, MAT.LAVA, MAT.OIL, MAT.ACID].forEach(m => { MAT_LIQUID[m] = 1; });
// Densidad: decide quién se hunde debajo de quién (líquidos y polvos). Los gases (humo, vapor, fuego) no pesan nada.
const MAT_DENS = new Float32Array(16);
Object.entries({ OIL: 0.8, WATER: 1, ACID: 1.05, ASH: 0.6, SAND: 1.6, GRAVEL: 2, LAVA: 2.5 }).forEach(([k, d]) => { MAT_DENS[MAT[k]] = d; });
const W2D = { chunk: 16, waterSpread: 5, oilSpread: 4, acidSpread: 4, acidEat: 0.06, fireLife: [40, 90], burnChance: 0.04, oilBurn: 0.35, smokeLife: [40, 80], maxFly: 700, gravity: 320 };

function w2dMake(W, H) {
    const n = W * H, C = W2D.chunk;
    const cw = Math.ceil(W / C), ch = Math.ceil(H / C);
    const w = { W, H, mat: new Uint8Array(n), life: new Uint8Array(n), shade: new Uint8Array(n),
        tick: new Uint8Array(n), frame: 0, cw, ch, active: new Uint8Array(cw * ch).fill(1), next: new Uint8Array(cw * ch), dirty: new Uint8Array(cw * ch).fill(1),
        markers: { P: [], E: [], C: [], F: [], T: [] }, fly: [], waves: false, glow: new Uint16Array(cw * ch) };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) w.shade[y * W + x] = Math.min(3, (w2dNoise(x, y) * 4) | 0);
    return w;
}
// Ruido suave (valor en una grilla de 5 px, interpolado): de ahí salen las vetas y manchas de cada material
function w2dHash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function w2dNoise(x, y) {
    const gx = x / 5, gy = y / 5, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
    const a = w2dHash(ix, iy) * (1 - fx) + w2dHash(ix + 1, iy) * fx, b = w2dHash(ix, iy + 1) * (1 - fx) + w2dHash(ix + 1, iy + 1) * fx;
    return a * (1 - fy) + b * fy;
}
const w2dIn = (w, x, y) => x >= 0 && y >= 0 && x < w.W && y < w.H;
function w2dGet(w, x, y) { return w2dIn(w, x, y) ? w.mat[y * w.W + x] : (y >= w.H ? MAT.ROCK : MAT.AIR); } // abajo del mundo es piso; los costados y arriba, aire (salidas)
function w2dWake(w, x, y) { // algo cambió acá: el trozo y sus vecinos se simulan y se redibujan
    const C = W2D.chunk, cx = (x / C) | 0, cy = (y / C) | 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const nx = cx + ox, ny = cy + oy;
        if (nx >= 0 && ny >= 0 && nx < w.cw && ny < w.ch) { w.next[ny * w.cw + nx] = 1; w.dirty[ny * w.cw + nx] = 1; }
    }
}
function w2dSet(w, x, y, m, life = 0) {
    if (!w2dIn(w, x, y)) return;
    const i = y * w.W + x;
    w.mat[i] = m; w.life[i] = life; w.tick[i] = w.frame; w2dWake(w, x, y);
}
function w2dSwap(w, i, j) {
    const m = w.mat[i], l = w.life[i]; w.mat[i] = w.mat[j]; w.life[i] = w.life[j]; w.mat[j] = m; w.life[j] = l;
    w.tick[i] = w.tick[j] = w.frame;
    w2dWake(w, i % w.W, (i / w.W) | 0); w2dWake(w, j % w.W, (j / w.W) | 0);
}
const w2dRand = (a, b) => a + ((Math.random() * (b - a + 1)) | 0);

// --- ARMAR UN MUNDO ---
// Desde una imagen (ImageData de la sala): el color más cercano de T2D_COLORS; transparente o blanco = aire
function w2dFromImage(img) {
    const w = w2dMake(img.width, img.height), d = img.data;
    for (let i = 0; i < img.width * img.height; i++) {
        const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], a = d[i * 4 + 3];
        if (a < 128 || (r > 245 && g > 245 && b > 245)) continue;
        let best = null, bd = 1e9;
        for (const [m, c] of T2D_COLORS) { const dd = (r - (c >> 16)) ** 2 + (g - ((c >> 8) & 255)) ** 2 + (b - (c & 255)) ** 2; if (dd < bd) { bd = dd; best = m; } }
        if (bd > 3000) continue; // un color que no es de la guía: aire
        const x = i % img.width, y = (i / img.width) | 0;
        if (typeof best === 'string') { w.markers[best].push({ x, y }); continue; }
        w.mat[i] = best;
    }
    return w;
}
// Desde filas de texto (bloques de 16 px; para las pruebas y por si la imagen no carga):
// # roca · p piedra · t tierra · s arena · g grava · ~ agua · o aceite · = madera (tabla de 4 px) · w madera · L lava · ^ espinas · h hueco angosto · P E C F marcas
function w2dFromRows(rows, T = 16) {
    const w = w2dMake(rows[0].length * T, rows.length * T);
    const fill = { '#': MAT.ROCK, p: MAT.STONE, t: MAT.DIRT, s: MAT.SAND, '~': MAT.WATER, w: MAT.WOOD, L: MAT.LAVA, g: MAT.GRAVEL, o: MAT.OIL, a: MAT.ACID };
    rows.forEach((r, ty) => [...r].forEach((c, tx) => {
        const x0 = tx * T, y0 = ty * T;
        if (fill[c] !== undefined) { for (let y = y0; y < y0 + T; y++) w.mat.fill(fill[c], y * w.W + x0, y * w.W + x0 + T); }
        else if (c === '=') { for (let y = y0; y < y0 + 4; y++) w.mat.fill(MAT.WOOD, y * w.W + x0, y * w.W + x0 + T); }
        else if (c === 'h') { for (let y = y0; y < y0 + T; y++) w.mat.fill(MAT.ROCK, y * w.W + x0 + 6, y * w.W + x0 + T); } // hueco angosto
        else if (c === '^') { for (let k = 0; k < T; k++) { const hh = 7 - Math.abs((k % 4) - 2) * 3; for (let y = y0 + T - hh; y < y0 + T; y++) w.mat[y * w.W + x0 + k] = MAT.SPIKE; } } // dientes de 1-7 px
        else if (w.markers[c]) w.markers[c].push({ x: x0 + T / 2, y: y0 + T - 1 });
    }));
    return w;
}

// --- SIMULACIÓN (una vez por cuadro) ---
function w2dStep(w) {
    w.frame = (w.frame + 1) & 255;
    const C = W2D.chunk, W = w.W, flip = w.frame & 1;
    w.next.fill(0);
    for (let cy = w.ch - 1; cy >= 0; cy--) for (let k = 0; k < w.cw; k++) {
        const cx = flip ? k : w.cw - 1 - k;
        if (!w.active[cy * w.cw + cx]) continue;
        const x0 = cx * C, y0 = cy * C, x1 = Math.min(W, x0 + C), y1 = Math.min(w.H, y0 + C);
        for (let y = y1 - 1; y >= y0; y--) for (let j = 0; j < x1 - x0; j++) {
            const x = flip ? x0 + j : x1 - 1 - j, i = y * W + x, m = w.mat[i];
            if (m === MAT.AIR || w.tick[i] === w.frame) continue;
            if (m === MAT.SAND || m === MAT.GRAVEL || m === MAT.ASH) w2dPowder(w, x, y, i);
            else if (m === MAT.WATER) w2dLiquid(w, x, y, i, W2D.waterSpread);
            else if (m === MAT.OIL) w2dLiquid(w, x, y, i, W2D.oilSpread);
            else if (m === MAT.ACID) { if (!w2dAcid(w, x, y, i)) w2dLiquid(w, x, y, i, W2D.acidSpread); }
            else if (m === MAT.LAVA) { if ((w.frame + x) % 3 === 0) w2dLiquid(w, x, y, i, 1); w2dLava(w, x, y); }
            else if (m === MAT.FIRE) w2dFire(w, x, y, i);
            else if (m === MAT.SMOKE || m === MAT.STEAM) w2dSmoke(w, x, y, i);
            else if (m === MAT.DIRT && y + 1 < w.H && w.mat[i + w.W] === MAT.AIR) w2dCrumble(w, x, y, i);
        }
    }
    w2dFlyStep(w, 1 / 60);
    if (w.waves && w.frame % 3 === 0) for (let k = 0; k < 6; k++) { // olas: el mar salpica de a poco
        const i = (Math.random() * w.mat.length) | 0;
        if (w.mat[i] === MAT.WATER && w.mat[i - w.W] === MAT.AIR && Math.random() < 0.5) { const x = i % w.W, y = (i / w.W) | 0; w.mat[i] = MAT.AIR; w2dWake(w, x, y); w2dFling(w, x, y - 1, (Math.random() - 0.5) * 30, -30 - Math.random() * 40, MAT.WATER); }
    }
    const t = w.active; w.active = w.next; w.next = t;
}
// --- PÍXELES QUE VUELAN (como en Noita): salen despedidos y, cuando tocan algo, vuelven a ser material ---
function w2dFling(w, x, y, vx, vy, m) {
    if (w.fly.length >= W2D.maxFly) return false;
    w.fly.push({ x: x + 0.5, y: y + 0.5, vx, vy, m }); return true;
}
function w2dFlyStep(w, dt) {
    w.fly = w.fly.filter(f => {
        f.vy += W2D.gravity * dt;
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(f.vx), Math.abs(f.vy)) * dt));
        for (let k = 0; k < steps; k++) {
            const nx = f.x + f.vx * dt / steps, ny = f.y + f.vy * dt / steps;
            if (!w2dIn(w, nx | 0, ny | 0)) return false; // se fue del mundo
            const hit = w.mat[(ny | 0) * w.W + (nx | 0)];
            if (hit !== MAT.AIR && hit !== MAT.SMOKE) { // tocó algo: se asienta donde estaba
                const x = f.x | 0, y = f.y | 0;
                if (w2dIn(w, x, y) && w.mat[y * w.W + x] === MAT.AIR) w2dSet(w, x, y, f.m);
                return false;
            }
            f.x = nx; f.y = ny;
        }
        return true;
    });
}
// La tierra sin apoyo (cavaste abajo) se desmorona de a poco: cae como arena. Solo donde algo se movió hace poco
// (los trozos quietos no se simulan), así las salas no se deshacen solas.
function w2dCrumble(w, x, y, i) {
    const held = (dx) => MAT_SOLID[w2dGet(w, x + dx, y + 1)] === 1;
    if (held(-1) || held(1)) return; // apoyada en diagonal: aguanta
    w2dWake(w, x, y);
    if (Math.random() < 0.06) w2dSet(w, x, y, MAT.SAND);
}
function w2dCanFall(m) { return m === MAT.AIR || m === MAT.SMOKE || m === MAT.FIRE || m === MAT.STEAM; }
// lo más pesado se hunde debajo de un líquido más liviano (el agua bajo el aceite, la arena en el agua)
const w2dSinks = (m, under) => MAT_LIQUID[under] === 1 && MAT_DENS[m] > MAT_DENS[under];
function w2dPowder(w, x, y, i) {
    const below = w2dGet(w, x, y + 1);
    if (y + 1 < w.H && (w2dCanFall(below) || w2dSinks(w.mat[i], below))) return w2dSwap(w, i, i + w.W);
    const d = Math.random() < 0.5 ? 1 : -1;
    for (const dx of [d, -d]) if (y + 1 < w.H && w2dIn(w, x + dx, y + 1) && w2dCanFall(w2dGet(w, x + dx, y + 1)) && w2dCanFall(w2dGet(w, x + dx, y))) return w2dSwap(w, i, i + w.W + dx);
}
function w2dLiquid(w, x, y, i, spread) {
    const under = w2dGet(w, x, y + 1);
    if (y + 1 < w.H && (w2dCanFall(under) || w2dSinks(w.mat[i], under))) return w2dSwap(w, i, i + w.W);
    const d = Math.random() < 0.5 ? 1 : -1;
    for (const dx of [d, -d]) if (y + 1 < w.H && w2dIn(w, x + dx, y + 1) && w2dCanFall(w2dGet(w, x + dx, y + 1)) && w2dCanFall(w2dGet(w, x + dx, y))) return w2dSwap(w, i, i + w.W + dx);
    for (const dx of [d, -d]) { // de costado: hasta `spread` píxeles
        let to = 0;
        for (let k = 1; k <= spread && w2dIn(w, x + dx * k, y) && w2dCanFall(w2dGet(w, x + dx * k, y)); k++) to = k;
        if (to) return w2dSwap(w, i, i + dx * to);
    }
}
function w2dLava(w, x, y) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = w2dGet(w, x + dx, y + dy);
        if (n === MAT.WATER) { w2dSet(w, x, y, MAT.STONE); w2dSet(w, x + dx, y + dy, MAT.STEAM, w2dRand(...W2D.smokeLife)); return; } // lava + agua = piedra y vapor
        if ((n === MAT.WOOD && Math.random() < W2D.burnChance) || (n === MAT.OIL && Math.random() < W2D.oilBurn)) w2dSet(w, x + dx, y + dy, MAT.FIRE, w2dRand(...W2D.fireLife));
        if (n === MAT.AIR && dy === -1 && Math.random() < 0.002) w2dSet(w, x, y - 1, MAT.SMOKE, w2dRand(...W2D.smokeLife));
    }
}
function w2dFire(w, x, y, i) {
    w2dWake(w, x, y);
    if (--w.life[i] <= 0) { const r = Math.random(); w.mat[i] = r < 0.15 ? MAT.ASH : r < 0.45 ? MAT.SMOKE : MAT.AIR; w.life[i] = w2dRand(...W2D.smokeLife); return; } // se apaga: ceniza, humo o nada
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, -1]]) {
        const n = w2dGet(w, x + dx, y + dy);
        if (n === MAT.WOOD && Math.random() < W2D.burnChance) w2dSet(w, x + dx, y + dy, MAT.FIRE, w2dRand(...W2D.fireLife));
        if (n === MAT.OIL && Math.random() < W2D.oilBurn) w2dSet(w, x + dx, y + dy, MAT.FIRE, w2dRand(20, 50)); // el aceite prende enseguida
        if (n === MAT.WATER) { w.mat[i] = MAT.STEAM; w.life[i] = w2dRand(...W2D.smokeLife); return; } // el agua lo apaga (y sale vapor)
    }
    if (Math.random() < 0.05 && w2dGet(w, x, y - 1) === MAT.AIR) w2dSet(w, x, y - 1, MAT.SMOKE, w2dRand(10, 30));
}
// El ácido: carcome lo que toca (no la roca de la torre ni las espinas) y en cada mordida puede gastarse. true si mordió.
function w2dAcid(w, x, y, i) {
    let food = false;
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
        const n = w2dGet(w, x + dx, y + dy);
        if (n === MAT.AIR || n === MAT.ACID || n === MAT.ROCK || n === MAT.SPIKE || w2dCanFall(n) || MAT_LIQUID[n] || !w2dIn(w, x + dx, y + dy)) continue;
        food = true; if (Math.random() > W2D.acidEat) continue;
        w2dSet(w, x + dx, y + dy, Math.random() < 0.3 ? MAT.SMOKE : MAT.AIR, w2dRand(10, 30));
        if (Math.random() < 0.5) w2dSet(w, x, y, MAT.AIR);
        return true;
    }
    if (food) w2dWake(w, x, y); // mientras tenga algo para comer, sigue despierto
    return false;
}
function w2dSmoke(w, x, y, i) {
    w2dWake(w, x, y);
    if (--w.life[i] <= 0) { w.mat[i] = w.mat[i] === MAT.STEAM && Math.random() < 0.35 ? MAT.WATER : MAT.AIR; return; } // el vapor se condensa: vuelve a caer agua
    const dx = w2dRand(-1, 1);
    if (y > 0 && w2dIn(w, x + dx, y - 1) && w2dGet(w, x + dx, y - 1) === MAT.AIR) w2dSwap(w, i, i - w.W + dx);
}

// --- CHOQUES (contra los píxeles reales) ---
function w2dSolid(w, x, y) { return MAT_SOLID[w2dGet(w, x | 0, y | 0)] === 1; }
function w2dBoxHits(w, b) {
    const x0 = Math.floor(b.x), y0 = Math.floor(b.y), x1 = Math.ceil(b.x + b.w) - 1, y1 = Math.ceil(b.y + b.h) - 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (MAT_SOLID[w2dGet(w, x, y)]) return true;
    return false;
}
// Cuánto de la caja está en un material (0 a 1): agua para nadar, lava/fuego para quemarse
function w2dBoxFraction(w, b, m1, m2 = -1) {
    let n = 0, t = 0;
    for (let y = Math.floor(b.y); y < b.y + b.h; y += 2) for (let x = Math.floor(b.x); x < b.x + b.w; x += 2) { t++; const m = w2dGet(w, x, y); if (m === m1 || m === m2) n++; }
    return t ? n / t : 0;
}
// Rompe los materiales que se pueden romper dentro de una caja (el tajo cava). Devuelve cuántos píxeles rompió.
function w2dDig(w, b, strong, dirX = 0) {
    let n = 0;
    for (let y = Math.max(0, Math.floor(b.y)); y < Math.min(w.H, b.y + b.h); y++) for (let x = Math.max(0, Math.floor(b.x)); x < Math.min(w.W, b.x + b.w); x++) {
        const m = w.mat[y * w.W + x];
        if (!(m === MAT.DIRT || m === MAT.SAND || m === MAT.GRAVEL || (strong && (m === MAT.STONE || m === MAT.WOOD)))) continue;
        w2dSet(w, x, y, MAT.AIR); n++;
        if (Math.random() < 0.3) { // un pedazo sale volando para el lado del golpe y vuelve a caer (la tierra suelta es arena; la piedra rota, grava)
            const piece = m === MAT.STONE ? MAT.GRAVEL : m === MAT.WOOD ? MAT.WOOD : m === MAT.GRAVEL ? MAT.GRAVEL : MAT.SAND;
            w2dFling(w, x, y, dirX * (40 + Math.random() * 110) + (Math.random() - 0.5) * 50, -30 - Math.random() * 110, piece);
        }
    }
    return n;
}
// Patea el material suelto (arena, grava, agua, aceite) de una franja: sale volando (pisadas, aterrizajes, chapuzones)
function w2dKick(w, x0, y0, x1, y1, vx, vy, max) {
    let n = 0;
    for (let y = Math.max(0, y0 | 0); y <= Math.min(w.H - 1, y1 | 0) && n < max; y++) for (let x = Math.max(0, x0 | 0); x <= Math.min(w.W - 1, x1 | 0) && n < max; x++) {
        const i = y * w.W + x, m = w.mat[i];
        if (m !== MAT.SAND && m !== MAT.GRAVEL && m !== MAT.WATER && m !== MAT.OIL) continue;
        if (w.mat[i - w.W] !== MAT.AIR && !(m === MAT.WATER || m === MAT.OIL)) continue; // de la arena, solo la de arriba
        if (Math.random() > 0.5) continue;
        w2dSet(w, x, y, MAT.AIR); w2dFling(w, x, y - 1, vx * (0.5 + Math.random()), vy * (0.5 + Math.random()), m); n++;
    }
    return n;
}
// Prende fuego en un punto (para golpes de fuego, lava…)
function w2dIgnite(w, x, y, r) {
    for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) if (ox * ox + oy * oy <= r * r) {
        const m = w2dGet(w, x + ox, y + oy);
        if (m === MAT.AIR || m === MAT.WOOD) w2dSet(w, x + ox, y + oy, MAT.FIRE, w2dRand(...W2D.fireLife));
    }
}

// --- DIBUJO: una imagen del tamaño de la sala; solo se rehacen los trozos que cambiaron ---
function w2dRender(w) {
    if (!w.canvas) { w.canvas = document.createElement('canvas'); w.canvas.width = w.W; w.canvas.height = w.H; w.ctx = w.canvas.getContext('2d'); w.img = w.ctx.createImageData(w.W, w.H); w.px = new Uint32Array(w.img.data.buffer); w.dirty.fill(1); }
    const C = W2D.chunk; let any = false;
    for (let cy = 0; cy < w.ch; cy++) for (let cx = 0; cx < w.cw; cx++) {
        if (!w.dirty[cy * w.cw + cx]) continue;
        w.dirty[cy * w.cw + cx] = 0; any = true; let glow = 0;
        for (let y = cy * C; y < Math.min(w.H, cy * C + C); y++) for (let x = cx * C; x < Math.min(w.W, cx * C + C); x++) {
            const i = y * w.W + x, m = w.mat[i];
            if (m === MAT.AIR) { w.px[i] = 0; continue; }
            const L = MAT_LOOK[m]; let t = w.shade[i];
            if (m === MAT.FIRE || m === MAT.LAVA) { t = (Math.random() * 4) | 0; glow++; }
            else if (m === MAT.SAND) t = ((x + y * 3 + w.shade[i] * 2) % 9 < 2) ? 3 : Math.min(2, t + 1); // ondas
            else if ((m === MAT.DIRT || m === MAT.ROCK || m === MAT.STONE) && w2dHash(x, y) < 0.04) t = 0; // piedritas y grietas
            else if (m === MAT.WATER && !MAT_LIQUID[w2dGet(w, x, y - 1)]) t = 3; // el borde del agua brilla
            let c = L[t];
            // borde: el píxel de arriba es aire → un tono más claro (se lee la superficie); abajo aire → más oscuro
            if (MAT_SOLID[m]) { const up = w2dGet(w, x, y - 1), dn = w2dGet(w, x, y + 1); if (!MAT_SOLID[up] && !MAT_LIQUID[up]) c = w2dTint(c, 34); else if (!MAT_SOLID[dn] && !MAT_LIQUID[dn]) c = w2dTint(c, -26); }
            const a = m === MAT.WATER ? 0xc0 : m === MAT.SMOKE ? 0x90 : m === MAT.STEAM ? 0x70 : m === MAT.ACID ? 0xd8 : 0xff;
            w.px[i] = (a << 24) | ((c & 255) << 16) | (c & 0xff00) | ((c >> 16) & 255); // ABGR
        }
        w.glow[cy * w.cw + cx] = glow; // cuánto fuego y lava hay en el trozo: alumbra (t2dDrawLight)
    }
    if (any) w.ctx.putImageData(w.img, 0, 0);
    return w.canvas;
}
function w2dDrawFly(ctx, w) {
    w.fly.forEach(f => { const c = MAT_LOOK[f.m][1]; ctx.fillStyle = '#' + c.toString(16).padStart(6, '0'); ctx.fillRect(f.x | 0, f.y | 0, 1, 1); });
}
function w2dTint(c, k) { const f = v => Math.max(0, Math.min(255, v + k)); return (f(c >> 16) << 16) | (f((c >> 8) & 255) << 8) | f(c & 255); }
// Lava y fuego titilan: sus trozos se redibujan siempre
function w2dFlicker(w) { const C = W2D.chunk; for (let i = 0; i < w.mat.length; i += 7) { const m = w.mat[i]; if (m === MAT.FIRE || m === MAT.LAVA) w.dirty[(((i / w.W) | 0) / C | 0) * w.cw + ((i % w.W) / C | 0)] = 1; } }
