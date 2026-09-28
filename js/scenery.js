// Escenarios en pixel art, dibujados en código (sin imágenes).
//
//   arenaBackground(kind) arma una sola vez el fondo fijo de cada tipo de arena en un canvas aparte (con semilla fija):
//     wave  pradera: pasto con matices, matas, flores y piedras
//     duel  coliseo: losas de piedra, círculo de arena en el centro y antorchas en las esquinas
//     boss  volcánico: basalto con grietas y charcos de lava, y huesos
//     rest  claro de descanso: pasto, caminos de tierra, estanque con fuente, árboles y fogatas
//   drawSceneryOverlay(kind) dibuja en cada cuadro lo animado: llamas de antorchas y fogatas, brillo de la lava,
//   reflejos del agua, luciérnagas y polen. Todo es decorativo: no cambia por dónde se puede caminar.

const SCENE_PX = 2;             // tamaño de un "píxel" del escenario (en unidades del mapa)
const SCENE_SCALE = 2;          // el fondo se dibuja al doble para que se vea nítido con el mapa agrandado
const sceneCache = {}, sceneData = {};

function seededRandom(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];

function scenePixel(g, x, y, color, w = SCENE_PX, h = SCENE_PX) { g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), w, h); }

// Piso de "píxeles" con 3-4 tonos y manchas más grandes (para que no se vea como ruido parejo).
function sceneFloor(g, rnd, tones, blobTones, blobs = 30) {
    for (let y = 0; y < MAP_H; y += SCENE_PX) for (let x = 0; x < MAP_W; x += SCENE_PX) {
        const r = rnd();
        scenePixel(g, x, y, r < 0.6 ? tones[0] : r < 0.85 ? tones[1] : r < 0.97 ? tones[2] : tones[3] || tones[2]);
    }
    for (let i = 0; i < blobs; i++) {
        const cx = rnd() * MAP_W, cy = rnd() * MAP_H, rad = 8 + rnd() * 26, color = pick(rnd, blobTones);
        for (let y = -rad; y < rad; y += SCENE_PX) for (let x = -rad; x < rad; x += SCENE_PX) {
            if (x * x + y * y < rad * rad * (0.6 + rnd() * 0.4) && rnd() < 0.8) scenePixel(g, cx + x - (cx + x) % SCENE_PX, cy + y - (cy + y) % SCENE_PX, color);
        }
    }
}

function sceneVignette(g, strength = 0.55) {
    const grad = g.createRadialGradient(MAP_W / 2, MAP_H / 2, MAP_H * 0.3, MAP_W / 2, MAP_H / 2, MAP_W * 0.68);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, `rgba(0,0,0,${strength})`);
    g.fillStyle = grad; g.fillRect(0, 0, MAP_W, MAP_H);
}

// Mata de pasto, flor, piedra y árbol en pixel art
function sceneTuft(g, x, y, c1, c2) {
    [[0, 0], [2, -2], [4, 0], [2, 2]].forEach(([dx, dy], i) => scenePixel(g, x + dx, y + dy - 4, i % 2 ? c2 : c1, SCENE_PX, SCENE_PX * 2));
}
function sceneFlower(g, x, y, petal) {
    [[-2, 0], [2, 0], [0, -2], [0, 2]].forEach(([dx, dy]) => scenePixel(g, x + dx, y + dy, petal));
    scenePixel(g, x, y, '#ffd166');
}
function sceneStone(g, x, y, rnd) {
    const w = 4 + Math.floor(rnd() * 3) * 2;
    scenePixel(g, x, y, '#4a4e57', w, 4); scenePixel(g, x + 2, y - 2, '#6c717c', w - 4, 2); scenePixel(g, x, y + 4, '#2b2e35', w, 2);
}
function sceneTree(g, cx, cy) {
    scenePixel(g, cx - 3, cy + 6, '#4a2f1b', 6, 12);                       // tronco
    [[0, 0, 14, '#1b4332'], [-6, 4, 9, '#1b4332'], [6, 4, 9, '#1b4332'], [-2, -4, 9, '#2d6a4f'], [3, -2, 7, '#40916c'], [-4, -6, 4, '#52b788']]
        .forEach(([dx, dy, r, c]) => { g.fillStyle = c; g.beginPath(); g.arc(cx + dx, cy + dy, r, 0, Math.PI * 2); g.fill(); });
}
const tileCenter = t => t * TILE + TILE / 2;

// --- FONDOS FIJOS ---
const SCENES = {
    wave(g, rnd) {
        sceneFloor(g, rnd, ['#1b3a24', '#1f4229', '#183420', '#24502f'], ['#16301d', '#23472c', '#2a5233'], 35);
        // Sendero de tierra que cruza la pradera
        for (let x = 0; x < MAP_W; x += SCENE_PX) {
            const y = MAP_H * 0.58 + Math.sin(x / 70) * 22 + Math.sin(x / 23) * 5;
            for (let w = -9; w < 9; w += SCENE_PX) if (rnd() < 0.9 - Math.abs(w) / 14) scenePixel(g, x, y + w - (y + w) % SCENE_PX, rnd() < 0.7 ? '#3d3322' : '#4a3f2a');
        }
        for (let i = 0; i < 160; i++) sceneTuft(g, rnd() * MAP_W, rnd() * MAP_H, '#2d6a4f', '#40916c');
        for (let i = 0; i < 45; i++) sceneFlower(g, rnd() * MAP_W, rnd() * MAP_H, pick(rnd, ['#ff8fab', '#e0e1dd', '#c77dff', '#ffd166']));
        for (let i = 0; i < 22; i++) sceneStone(g, rnd() * MAP_W, rnd() * MAP_H, rnd);
        sceneVignette(g, 0.5);
        g.strokeStyle = '#14281a'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, MAP_W - 3, MAP_H - 3);
    },
    duel(g, rnd) {
        // Losas de piedra con juntas y grietas
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const base = pick(rnd, ['#3a3530', '#35302b', '#403a33', '#2f2b27']);
            scenePixel(g, c * TILE, r * TILE, base, TILE, TILE);
            for (let i = 0; i < 18; i++) scenePixel(g, c * TILE + Math.floor(rnd() * 16) * 2, r * TILE + Math.floor(rnd() * 16) * 2, rnd() < 0.5 ? '#4a443c' : '#2a2622');
            scenePixel(g, c * TILE, r * TILE, '#1f1c19', TILE, 2); scenePixel(g, c * TILE, r * TILE, '#1f1c19', 2, TILE);
            if (rnd() < 0.18) { let x = c * TILE + 6 + rnd() * 20, y = r * TILE + 6; for (let k = 0; k < 8; k++) { scenePixel(g, x, y, '#1a1714'); x += (rnd() - 0.5) * 6; y += 2; } }
            if (rnd() < 0.08) scenePixel(g, c * TILE + 4, r * TILE + TILE - 8, '#3a5a40', 8, 4); // musgo
        }
        // Círculo de arena en el centro
        const cx = MAP_W / 2, cy = MAP_H / 2, R = TILE * 4.2;
        for (let y = -R; y < R; y += SCENE_PX) for (let x = -R; x < R; x += SCENE_PX) {
            const d = Math.hypot(x, y);
            if (d < R) scenePixel(g, cx + x, cy + y, d > R - 5 ? '#4f3a24' : pick(rnd, ['#6e5840', '#655139', '#77603f']));
        }
        g.strokeStyle = '#5a4128'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R - 1, 0, Math.PI * 2); g.stroke();
        // Antorchas en las esquinas (el pie; la llama se anima)
        sceneData.duel = { torches: [[1, 1], [COLS - 2, 1], [1, ROWS - 2], [COLS - 2, ROWS - 2]].map(([x, y]) => ({ x: tileCenter(x), y: tileCenter(y) })) };
        sceneData.duel.torches.forEach(t => { scenePixel(g, t.x - 2, t.y - 2, '#5c3d24', 4, 14); scenePixel(g, t.x - 5, t.y - 4, '#2b2b2b', 10, 4); });
        sceneVignette(g, 0.6);
        g.strokeStyle = '#6a3b1f'; g.lineWidth = 4; g.strokeRect(2, 2, MAP_W - 4, MAP_H - 4);
    },
    boss(g, rnd) {
        sceneFloor(g, rnd, ['#1a1214', '#221719', '#140e10', '#2a1c1e'], ['#100a0b', '#2d1a1c'], 30);
        // Grietas de lava (el camino se guarda para que el brillo se anime)
        const cracks = [];
        for (let i = 0; i < 9; i++) {
            let x = rnd() * MAP_W, y = rnd() * MAP_H, ang = rnd() * Math.PI * 2;
            const pts = [];
            for (let k = 0; k < 26; k++) { pts.push([x, y]); ang += (rnd() - 0.5) * 0.9; x += Math.cos(ang) * 5; y += Math.sin(ang) * 5; }
            cracks.push(pts);
            pts.forEach(([px, py]) => { scenePixel(g, px - 1, py - 1, '#050304', 4, 4); scenePixel(g, px, py, '#7a1d0c'); });
        }
        const pools = Array.from({ length: 3 }, () => ({ x: 60 + rnd() * (MAP_W - 120), y: 40 + rnd() * (MAP_H - 80), r: 10 + rnd() * 8 }));
        pools.forEach(p => { for (let y = -p.r; y < p.r; y += SCENE_PX) for (let x = -p.r * 1.4; x < p.r * 1.4; x += SCENE_PX)
            if ((x / 1.4) ** 2 + y * y < p.r * p.r) scenePixel(g, p.x + x, p.y + y, (x / 1.4) ** 2 + y * y > (p.r - 3) ** 2 ? '#3a0f08' : '#c1440e'); });
        for (let i = 0; i < 10; i++) { // huesos
            const x = rnd() * MAP_W, y = rnd() * MAP_H;
            scenePixel(g, x, y, '#cfc6b8', 8, 2); scenePixel(g, x - 2, y - 2, '#cfc6b8', 2, 2); scenePixel(g, x + 8, y + 2, '#cfc6b8', 2, 2);
        }
        sceneData.boss = { cracks, pools };
        sceneVignette(g, 0.65);
        g.strokeStyle = '#8a0f24'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, MAP_W - 3, MAP_H - 3);
    },
    rest(g, rnd) {
        sceneFloor(g, rnd, ['#2d5a3a', '#326440', '#285234', '#3a7049'], ['#24492f', '#3f7a50'], 30);
        const fountain = { x: tileCenter(REST_SPOT.x), y: tileCenter(REST_SPOT.y - 3) };
        const fires = [[REST_SPOT.x - 5, REST_SPOT.y], [REST_SPOT.x + 5, REST_SPOT.y]].map(([x, y]) => ({ x: tileCenter(x), y: tileCenter(y) }));
        // Caminos de tierra desde la fuente hacia las fogatas y hacia abajo
        const path = (x0, y0, x1, y1) => { const n = Math.hypot(x1 - x0, y1 - y0) / 2;
            for (let i = 0; i < n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
                for (let w = -8; w < 8; w += SCENE_PX) scenePixel(g, x + (y1 !== y0 ? w : 0), y + (y1 === y0 ? w : 0), rnd() < 0.7 ? '#6b5537' : '#7d6442'); } };
        path(fires[0].x, fires[0].y, fires[1].x, fires[1].y);
        path(fountain.x, fountain.y, fountain.x, MAP_H);
        // Estanque con la fuente
        const R = TILE * 1.6;
        for (let y = -R; y < R; y += SCENE_PX) for (let x = -R * 1.5; x < R * 1.5; x += SCENE_PX) {
            const d = (x / 1.5) ** 2 + y * y;
            if (d < R * R) scenePixel(g, fountain.x + x, fountain.y + y, d > (R - 4) ** 2 ? '#8d8d8d' : pick(rnd, ['#1d6fa5', '#2178b5', '#1a639a']));
        }
        scenePixel(g, fountain.x - 6, fountain.y - 10, '#adb5bd', 12, 16); scenePixel(g, fountain.x - 10, fountain.y + 4, '#8d8d8d', 20, 4);
        // Fogatas: piedras alrededor (la llama se anima)
        fires.forEach(f => { for (let a = 0; a < 8; a++) sceneStone(g, f.x + Math.cos(a / 8 * Math.PI * 2) * 11 - 3, f.y + Math.sin(a / 8 * Math.PI * 2) * 7, rnd);
            scenePixel(g, f.x - 8, f.y + 2, '#4a2f1b', 16, 3); });
        for (let i = 0; i < 120; i++) sceneTuft(g, rnd() * MAP_W, rnd() * MAP_H, '#40916c', '#52b788');
        for (let i = 0; i < 50; i++) sceneFlower(g, rnd() * MAP_W, rnd() * MAP_H, pick(rnd, ['#ff8fab', '#ffffff', '#ffd166', '#c77dff']));
        [[1.5, 1.2], [18.5, 1.2], [1.2, 10.5], [18.7, 10.3], [4.8, 3.6], [15.4, 9], [7, 10.6], [13.5, 2]].forEach(([x, y]) => sceneTree(g, x * TILE, y * TILE));
        sceneData.rest = { fountain, fires };
        sceneVignette(g, 0.35);
    }
};

function arenaBackground(kind) {
    if (sceneCache[kind]) return sceneCache[kind];
    const bg = document.createElement('canvas');
    bg.width = MAP_W * SCENE_SCALE; bg.height = MAP_H * SCENE_SCALE;
    const g = bg.getContext('2d');
    g.scale(SCENE_SCALE, SCENE_SCALE);
    g.imageSmoothingEnabled = false;
    (SCENES[kind] || SCENES.wave)(g, seededRandom(kind.length * 7919 + 17));
    sceneCache[kind] = bg;
    return bg;
}

// --- LO ANIMADO (cada cuadro) ---
function drawFlame(x, y, size, t, seed) {
    const glow = ctx.createRadialGradient(x, y, 2, x, y, size * 4);
    glow.addColorStop(0, 'rgba(255,160,40,0.35)'); glow.addColorStop(1, 'rgba(255,120,20,0)');
    ctx.fillStyle = glow; ctx.fillRect(x - size * 4, y - size * 4, size * 8, size * 8);
    for (let i = 0; i < 6; i++) {
        const h = size * (1 + Math.sin(t * 9 + seed + i * 1.7) * 0.35), w = size * 0.6;
        ctx.fillStyle = i < 2 ? '#ff5400' : i < 4 ? '#ff9f1c' : '#ffd166';
        ctx.fillRect(x - w / 2 + (i % 3 - 1) * 2, y - h + i * 0.6, w * (1 - i * 0.12), h - i * 1.2);
    }
}

function drawDriftingDots(count, color, seed, t, speed, size) {
    const rnd = seededRandom(seed);
    for (let i = 0; i < count; i++) {
        const bx = rnd() * MAP_W, by = rnd() * MAP_H, ph = rnd() * 10, sp = speed * (0.5 + rnd());
        const x = (bx + Math.sin(t * sp + ph) * 20 + t * sp * 6) % MAP_W, y = (by + Math.cos(t * sp * 0.8 + ph) * 14) % MAP_H;
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 3 + ph);
        ctx.fillStyle = color; ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1;
}

function drawSceneryOverlay(kind) {
    arenaBackground(kind); // asegura que sceneData esté listo
    const t = fxClock;
    if (kind === 'duel' && sceneData.duel) sceneData.duel.torches.forEach((tc, i) => drawFlame(tc.x, tc.y - 4, 5, t, i * 2));
    if (kind === 'boss' && sceneData.boss) {
        sceneData.boss.cracks.forEach((pts, i) => {
            ctx.globalAlpha = 0.45 + 0.35 * Math.sin(t * 2 + i);
            ctx.fillStyle = '#ff6a00';
            pts.forEach(([x, y], k) => { if ((k + Math.floor(t * 8)) % 3) ctx.fillRect(x, y, 2, 2); });
        });
        sceneData.boss.pools.forEach((p, i) => {
            ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 3 + i);
            const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.r * 2.2);
            glow.addColorStop(0, '#ffb703'); glow.addColorStop(1, 'rgba(255,80,0,0)');
            ctx.fillStyle = glow; ctx.fillRect(p.x - p.r * 2.2, p.y - p.r * 2.2, p.r * 4.4, p.r * 4.4);
        });
        ctx.globalAlpha = 1;
        drawDriftingDots(18, '#ff8c42', 91, t, 0.6, 2); // brasas
    }
    if (kind === 'rest' && sceneData.rest) {
        const f = sceneData.rest.fountain;
        for (let i = 0; i < 10; i++) { // reflejos en el agua
            const a = (t * 0.7 + i * 0.63) % (Math.PI * 2);
            ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 4 + i);
            ctx.fillStyle = '#caf0f8'; ctx.fillRect(f.x + Math.cos(a) * TILE * 1.8, f.y + Math.sin(a) * TILE * 1.0, 4, 2);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#90e0ef'; ctx.fillRect(f.x - 1, f.y - 16 - Math.abs(Math.sin(t * 5)) * 4, 2, 6); // chorro de la fuente
        sceneData.rest.fires.forEach((fire, i) => drawFlame(fire.x, fire.y, 6, t, i * 3));
        drawDriftingDots(14, '#fff3b0', 57, t, 0.4, 2); // luciérnagas
    }
    if (kind === 'wave') drawDriftingDots(10, '#e9f5db', 33, t, 0.25, 2); // polen
}
