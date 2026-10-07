// Estética "tinta y pergamino" (Tower Chaos): dirección de arte inspirada en ilustraciones de caballeros en tinta.
//
//   Paso 1 — dirección de arte: piso de pergamino con textura de papel, paredes de piedra dibujadas en tinta con rayado,
//   niebla color sepia, colores apagados y contorno de tinta en todo.
//   Paso 2 — personajes vectoriales: figuras dibujadas con trazos (capucha, capa, armadura, arma) y línea de tinta
//   un poco temblorosa, como dibujada a mano. Se dibujan una vez por tipo en un canvas aparte (con su versión blanca
//   para el destello al recibir daño) y después se copian con el giro y el estiramiento de la animación.
//   Es un prototipo: el aventurero (caballero encapuchado), los creeps por "silueta" y los guardianes.

const INK = {
    line: '#1d1712', paper: '#e9dcc0', paperDark: '#d8c7a3', shadow: '#2b2118',
    stone: '#b7a888', stoneDark: '#8f8166', stoneTop: '#5e5444', metal: '#8d8a86', metalDark: '#55524f', cloth: '#d9c6a0', boot: '#3f3a36'
};

// Color "apagado": se acerca al tono del pergamino y baja un poco el brillo (como tinta aguada).
function inkMute(hex, k = 0.32) {
    const n = parseInt(hex.slice(1), 16), base = [0xb8, 0xa8, 0x88];
    const c = [n >> 16, (n >> 8) & 255, n & 255].map((v, i) => Math.round((v * (1 - k) + base[i] * k) * 0.92));
    return '#' + c.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

// --- PASO 1: BALDOSAS ---
let inkTileCache = null;
function inkTiles() {
    if (inkTileCache) return inkTileCache;
    let seed = 777;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const tile = draw => { const c = document.createElement('canvas'); c.width = c.height = TILE; draw(c.getContext('2d')); return c; };
    // Piso: pergamino con grano de papel y alguna marca de tinta
    const floor = v => tile(g => {
        g.fillStyle = v % 2 ? INK.paper : '#e4d6b9'; g.fillRect(0, 0, TILE, TILE);
        for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(90,70,40,${0.04 + rnd() * 0.06})`; g.fillRect(rnd() * TILE, rnd() * TILE, 1 + rnd() * 2, 1); }
        if (rnd() < 0.5) { g.strokeStyle = 'rgba(29,23,18,0.25)'; g.lineWidth = 1; g.beginPath(); const x = rnd() * TILE, y = rnd() * TILE; g.moveTo(x, y); g.lineTo(x + 4 + rnd() * 5, y + (rnd() - 0.5) * 3); g.stroke(); }
    });
    // Pared vista de frente: bloques de piedra con contorno de tinta y rayado en la sombra
    const face = tile(g => {
        g.fillStyle = INK.stone; g.fillRect(0, 0, TILE, TILE);
        g.strokeStyle = INK.line; g.lineWidth = 1.6;
        const rows = [[0, 11], [11, 22], [22, 34]];
        rows.forEach(([y0, y1], r) => {
            const off = r % 2 ? 0 : 9;
            for (let x = -off; x < TILE; x += 18) {
                g.fillStyle = r === 2 ? INK.stoneDark : INK.stone;
                g.fillRect(x + 1, y0 + 1, 16, y1 - y0 - 1);
                g.strokeRect(x + 1 + (rnd() - 0.5), y0 + 1, 16, y1 - y0 - 1);
            }
        });
        g.strokeStyle = 'rgba(29,23,18,0.45)'; g.lineWidth = 1; // rayado de sombra abajo
        for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(i * 4, TILE); g.lineTo(i * 4 + 6, TILE - 8); g.stroke(); }
    });
    // Pared vista desde arriba: oscura, con trama cruzada de tinta
    const top = tile(g => {
        g.fillStyle = INK.stoneTop; g.fillRect(0, 0, TILE, TILE);
        g.strokeStyle = 'rgba(20,15,10,0.5)'; g.lineWidth = 1;
        for (let i = -TILE; i < TILE; i += 5) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + TILE, TILE); g.stroke(); }
        for (let i = -TILE; i < TILE; i += 9) { g.beginPath(); g.moveTo(i + TILE, 0); g.lineTo(i, TILE); g.stroke(); }
    });
    return (inkTileCache = { floors: [0, 1, 2, 3].map(floor), face, top });
}

// Papel viejo encima de todo: viñeta sepia en los bordes de la pantalla
let inkVignette = null;
function drawInkVignette() {
    const W = screenW(), H = screenH();
    if (!inkVignette || inkVignette.width !== W || inkVignette.height !== H) {
        inkVignette = document.createElement('canvas'); inkVignette.width = W; inkVignette.height = H;
        const g = inkVignette.getContext('2d');
        const grd = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
        grd.addColorStop(0, 'rgba(43,33,24,0)'); grd.addColorStop(1, 'rgba(43,33,24,0.55)');
        g.fillStyle = grd; g.fillRect(0, 0, W, H);
    }
    ctx.drawImage(inkVignette, 0, 0);
}

// --- PASO 2: PERSONAJES VECTORIALES ---
// Lienzo de cada figura: 64×96, mirando a la derecha, con los pies en y≈92. Proporciones altas y esbeltas
// (cabeza chica, túnicas largas), como las referencias.
const INK_W = 64, INK_H = 96;
const FOOT = 92;

// Dibuja un polígono con relleno y contorno de tinta "temblorosa" (cada vértice se corre un poco, con semilla fija).
function inkShape(g, pts, fill, rnd, opts = {}) {
    const j = opts.jitter ?? 0.7;
    const p = pts.map(([x, y]) => [x + (rnd() - 0.5) * j, y + (rnd() - 0.5) * j]);
    g.beginPath(); g.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]);
    if (opts.open) { g.strokeStyle = fill || INK.line; g.lineWidth = opts.width || 2.4; g.stroke(); return p; }
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (opts.pattern) { g.save(); g.clip(); opts.pattern(g); g.restore(); }
    g.strokeStyle = INK.line; g.lineWidth = opts.width || 2.2; g.lineJoin = 'round'; g.stroke();
    return p;
}
function inkCircle(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } g.strokeStyle = INK.line; g.lineWidth = 2; g.stroke(); }
// Rayado de sombra dentro de una zona (líneas diagonales finas)
function inkHatch(g, x0, y0, x1, y1, step = 3.5) {
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    g.strokeStyle = 'rgba(29,23,18,0.45)'; g.lineWidth = 1;
    for (let x = x0 - (y1 - y0); x < x1; x += step) { g.beginPath(); g.moveTo(x, y1); g.lineTo(x + (y1 - y0), y0); g.stroke(); }
    g.restore();
}

// --- Dibujos de tela (se aplican recortados dentro de una forma) ---
const INK_PATTERNS = {
    // Rombos tipo arlequín
    diamonds: (a, b) => g => { for (let y = 0; y < INK_H; y += 8) for (let x = (y / 8) % 2 ? 0 : 6; x < INK_W; x += 12) { g.fillStyle = b; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y + 4); g.lineTo(x, y + 8); g.lineTo(x - 6, y + 4); g.closePath(); g.fill(); } },
    // Guardas en zigzag (bandas horizontales)
    zigzag: (a, b) => g => { g.strokeStyle = b; g.lineWidth = 2; for (let y = 54; y < INK_H; y += 9) { g.beginPath(); for (let x = 0; x <= INK_W; x += 4) g.lineTo(x, y + (x / 4 % 2 ? 3 : 0)); g.stroke(); } },
    // Rayas verticales
    stripes: (a, b) => g => { g.fillStyle = b; for (let x = 0; x < INK_W; x += 6) g.fillRect(x, 0, 2, INK_H); },
    // Puntitos
    dots: (a, b) => g => { g.fillStyle = b; for (let y = 2; y < INK_H; y += 5) for (let x = (y % 2) * 2; x < INK_W; x += 5) g.fillRect(x, y, 1.2, 1.2); }
};
// Guarda decorada en el dobladillo (triángulos)
function inkBorder(g, x0, x1, y, color) {
    g.fillStyle = color;
    for (let x = x0; x < x1 - 3; x += 5) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2.5, y - 4); g.lineTo(x + 5, y); g.closePath(); g.fill(); }
    g.strokeStyle = INK.line; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
}
// Cinta que flota (bufanda, listón)
function inkRibbon(g, x, y, color, rnd, dir = 1) {
    g.strokeStyle = INK.line; g.lineWidth = 6; g.lineCap = 'round';
    const w = INK_A.sway * 4; // la cinta flamea
    const pts = [[x, y], [x - 10 * dir, y + 4 + rnd() * 4 + w], [x - 18 * dir, y - 2 + rnd() * 6 - w], [x - 26 * dir, y + 6 + w * 1.5]];
    const path = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]); };
    path(); g.stroke(); g.strokeStyle = color; g.lineWidth = 3.6; path(); g.stroke();
}

// --- Animación ---
// Cada figura se dibuja en varios cuadros: 8 de caminata y 4 de respiración (quieta). INK_A es la pose del cuadro que
// se está dibujando: step (−1…1) adelanta una pierna y atrasa la otra, sway mueve la capa y las cintas (con retraso),
// arm balancea los brazos.
let INK_A = { step: 0, sway: 0, arm: 0 };
const INK_WALK_FRAMES = 8, INK_IDLE_FRAMES = 4;
function inkFramePose(kind, k) {
    if (kind === 'walk') { const t = k / INK_WALK_FRAMES * Math.PI * 2; return { step: Math.sin(t), sway: Math.sin(t - 1.2) * 0.9, arm: -Math.sin(t) * 0.9 }; }
    const t = k / INK_IDLE_FRAMES * Math.PI * 2; return { step: 0, sway: Math.sin(t) * 0.35, arm: Math.sin(t) * 0.15 };
}
// Corre un dibujo desplazado (brazos y armas siguen el balanceo)
function inkArm(g, fn, k = 1) { g.save(); g.translate(INK_A.arm * 1.6 * k, -Math.abs(INK_A.arm) * 0.6); fn(); g.restore(); }
// Desplazamiento de la tela según la altura (abajo se mueve más)
const inkSwayX = y => INK_A.sway * Math.max(0, (y - 40) / 52) * 7;

// --- Partes ---
function inkLegs(g, rnd, color = INK.metalDark, top = 66) {
    const s = INK_A.step, L = s * 4, R = -s * 4, upL = Math.max(0, s) * 3, upR = Math.max(0, -s) * 3;
    inkShape(g, [[27, top], [32, top], [31 + L, FOOT - 2 - upL], [26 + L, FOOT - 2 - upL]], color, rnd);
    inkShape(g, [[34, top], [39, top], [40 + R, FOOT - 2 - upR], [35 + R, FOOT - 2 - upR]], color, rnd);
    inkShape(g, [[24 + L, FOOT - 4 - upL], [32 + L, FOOT - 4 - upL], [32 + L, FOOT + 1 - upL], [22 + L, FOOT + 1 - upL]], INK.boot, rnd);
    inkShape(g, [[34 + R, FOOT - 4 - upR], [42 + R, FOOT - 4 - upR], [44 + R, FOOT + 1 - upR], [34 + R, FOOT + 1 - upR]], INK.boot, rnd);
}
// Armas: el aventurero lleva la de su equipo (forma del arma del héroe de origen)
function inkWeapon(g, rnd, kind = 'sword') {
    const blade = '#d8d4cc', wood = '#7a5c3c';
    if (kind === 'sword') { inkShape(g, [[43, 52], [62, 90]], blade, rnd, { open: true, width: 4.2 }); inkShape(g, [[43, 52], [62, 90]], INK.line, rnd, { open: true, width: 1 }); inkShape(g, [[39, 55], [47, 49]], INK.line, rnd, { open: true, width: 3 }); }
    else if (kind === 'hammer') { inkShape(g, [[44, 46], [58, 88]], wood, rnd, { open: true, width: 3.2 }); inkShape(g, [[38, 40], [52, 36], [55, 46], [42, 50]], INK.metal, rnd); }
    else if (kind === 'spear') { inkShape(g, [[54, 14], [46, 92]], wood, rnd, { open: true, width: 3 }); inkShape(g, [[54, 8], [57, 18], [51, 18]], blade, rnd); }
    else if (kind === 'staff' || kind === 'crystal' || kind === 'orb') { inkShape(g, [[50, 18], [47, 92]], wood, rnd, { open: true, width: 3 }); inkCircle(g, 50, 15, 5, kind === 'crystal' ? '#9fd3e6' : '#c9a3e6'); }
    else if (kind === 'dagger') { inkShape(g, [[43, 54], [53, 68]], blade, rnd, { open: true, width: 3.4 }); inkShape(g, [[14, 52], [8, 64]], blade, rnd, { open: true, width: 3.4 }); }
    else inkShape(g, [[43, 52], [62, 90]], blade, rnd, { open: true, width: 4 });
}
function inkHood(g, rnd, color, faceColor = INK.metal, cross = true) {
    inkShape(g, [[24, 36], [24, 22], [29, 13], [35, 11], [41, 16], [43, 27], [42, 37], [37, 39], [29, 39]], color, rnd);
    inkShape(g, [[28, 20], [38, 19], [39, 34], [27, 34]], faceColor, rnd);
    inkHatch(g, 27, 27, 31, 34, 2.5);
    if (cross) { inkShape(g, [[29, 26], [37, 25.5]], INK.line, rnd, { open: true, width: 2.6 }); inkShape(g, [[33, 20.5], [33, 33]], INK.line, rnd, { open: true, width: 2.6 }); }
}
// Capa larga y ondulante con forro y dobladillo dentado
function inkCape(g, c, rnd, pattern) {
    const sw = inkSwayX, hem = []; for (let x = 58; x >= 6; x -= 4) hem.push([x + sw(FOOT), FOOT + (Math.round(x / 4) % 2 ? 1.5 : -1.5)]);
    inkShape(g, [[23, 30], [43, 28], [52 + sw(48), 48], [58 + sw(80), 80], ...hem, [8 + sw(76), 76], [14 + sw(48), 48]], c.main, rnd, { pattern });
    inkShape(g, [[43, 32], [52 + sw(50), 50], [57 + sw(80), 80], [58 + sw(FOOT), FOOT], [46 + sw(FOOT), FOOT], [44 + sw(60), 60]], c.dark, rnd, { width: 1.6 });
    inkHatch(g, 6, 70, 18, FOOT + 1, 3);
    g.strokeStyle = 'rgba(29,23,18,0.4)'; g.lineWidth = 1;
    [[18, 48, 14, 90], [24, 52, 22, 91], [30, 60, 31, 91]].forEach(([x0, y0, x1, y1]) => { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 - 3, (y0 + y1) / 2, x1, y1); g.stroke(); });
}

// Planos de figura: cada uno dibuja una silueta distinta con los colores que recibe (c.main, c.dark, c.accent…).
const INK_PLANS = {
    // Caballero encapuchado con capa (el aventurero): capa del color de la armadura, capucha del casco, arma de su equipo
    hoodedKnight(g, c, rnd) {
        inkCape(g, c, rnd, INK_PATTERNS.dots(c.main, 'rgba(29,23,18,0.35)'));
        inkLegs(g, rnd);
        inkShape(g, [[27, 36], [39, 36], [41, 74], [36, 79], [30, 79], [25, 74]], c.cloth, rnd); // tabardo
        inkBorder(g, 26, 40, 74, c.accent);
        inkShape(g, [[27, 52], [40, 52], [40, 55], [27, 55]], INK.boot, rnd, { width: 1.3 });
        inkArm(g, () => { // guantelete con garras
            inkShape(g, [[24, 38], [18, 47], [14, 54], [17, 56], [22, 49], [27, 42]], INK.metalDark, rnd);
            [[13, 54, 9, 52], [14, 56, 10, 58], [16, 57, 14, 61]].forEach(([x0, y0, x1, y1]) => inkShape(g, [[x0, y0], [x1, y1]], INK.line, rnd, { open: true, width: 1.8 }));
        }, -1);
        inkArm(g, () => { inkShape(g, [[38, 39], [45, 51], [42, 54], [36, 44]], INK.metalDark, rnd); inkWeapon(g, rnd, c.weapon); });
        inkHood(g, rnd, c.hood || c.main);
    },
    // Soldado: casco con visera, tabardo de rombos y lanza
    footman(g, c, rnd) {
        inkLegs(g, rnd);
        inkShape(g, [[25, 36], [41, 36], [43, 72], [23, 72]], c.main, rnd, { pattern: INK_PATTERNS.diamonds(c.main, c.dark) });
        inkShape(g, [[24, 58], [42, 58], [42, 61], [24, 61]], INK.boot, rnd, { width: 1.4 });
        inkCircle(g, 33, 26, 8, INK.metal);
        inkShape(g, [[27, 27], [39, 27]], INK.line, rnd, { open: true, width: 2.6 });
        inkArm(g, () => { inkShape(g, [[40, 42], [48, 46], [46, 50], [39, 47]], INK.metalDark, rnd); inkWeapon(g, rnd, 'spear'); });
    },
    // Arquero encapuchado con bufanda al viento y arco
    archer(g, c, rnd) {
        inkCape(g, c, rnd);
        inkLegs(g, rnd, '#5b4a3a');
        inkShape(g, [[28, 36], [38, 36], [39, 70], [27, 70]], c.cloth, rnd, { pattern: INK_PATTERNS.stripes(c.cloth, 'rgba(29,23,18,0.18)') });
        inkRibbon(g, 26, 38, c.accent, rnd);
        inkHood(g, rnd, c.main, INK.shadow, false);
        inkArm(g, () => {
            g.beginPath(); g.arc(44, 54, 18, -1.2, 1.2); g.strokeStyle = '#6b4f33'; g.lineWidth = 3.2; g.stroke();
            g.strokeStyle = INK.line; g.lineWidth = 1; g.beginPath(); g.moveTo(50.5, 37); g.lineTo(50.5, 71); g.stroke();
        });
    },
    // Mago: sombrero de ala ancha en punta y túnica larga con guardas en zigzag
    mage(g, c, rnd) {
        inkShape(g, [[25, 36], [41, 36], [52 + inkSwayX(FOOT), FOOT], [14 + inkSwayX(FOOT), FOOT]], c.main, rnd, { pattern: INK_PATTERNS.zigzag(c.main, c.accent) });
        inkHatch(g, 14, 72, 24, FOOT, 3);
        inkBorder(g, 15, 51, FOOT - 2, c.accent);
        inkArm(g, () => inkShape(g, [[24, 38], [16, 56], [20, 58], [27, 44]], c.dark, rnd), -1); // manga
        inkShape(g, [[28, 26], [38, 26], [38, 36], [28, 36]], INK.shadow, rnd); // cara en sombra
        g.fillStyle = '#f3e7c9'; g.fillRect(30, 30, 2, 2); g.fillRect(35, 30, 2, 2);
        inkShape(g, [[14, 26], [52, 26], [46, 22], [20, 22]], c.dark, rnd); // ala del sombrero
        inkShape(g, [[22, 23], [44, 23], [36 + INK_A.sway, 4]], c.dark, rnd);
        inkArm(g, () => inkWeapon(g, rnd, 'staff'));
    },
    // Bruto: ancho, hombreras, falda de rombos y garrote
    brute(g, c, rnd) {
        const s = INK_A.step * 3;
        inkShape(g, [[24, 74], [31, 74], [30 + s, FOOT - Math.max(0, INK_A.step) * 2], [22 + s, FOOT - Math.max(0, INK_A.step) * 2]], INK.boot, rnd);
        inkShape(g, [[35, 74], [42, 74], [44 - s, FOOT - Math.max(0, -INK_A.step) * 2], [36 - s, FOOT - Math.max(0, -INK_A.step) * 2]], INK.boot, rnd);
        inkShape(g, [[18, 58], [48, 58], [52, 80], [14, 80]], c.accent, rnd, { pattern: INK_PATTERNS.diamonds(c.accent, c.dark) });
        inkShape(g, [[17, 32], [49, 32], [46, 62], [20, 62]], c.main, rnd);
        inkHatch(g, 20, 48, 30, 62);
        inkCircle(g, 18, 34, 8, INK.metal); inkCircle(g, 48, 34, 8, INK.metal);
        inkCircle(g, 33, 22, 9, INK.metalDark);
        inkShape(g, [[28, 23], [38, 23]], INK.line, rnd, { open: true, width: 2.6 });
        inkArm(g, () => inkShape(g, [[50, 46], [60, 86]], '#6b4f33', rnd, { open: true, width: 6 }));
    },
    // Espectro: túnica que flota, cintas al viento y dos espadas flotando
    wraith(g, c, rnd) {
        const hem = []; for (let x = 50; x >= 16; x -= 5) hem.push([x + INK_A.sway * 3, 82 + ((x / 5) % 2 ? 6 : 0)]);
        inkShape(g, [[24, 30], [42, 30], [52, 54], ...hem, [14, 54]], c.main, rnd, { pattern: INK_PATTERNS.stripes(c.main, 'rgba(29,23,18,0.15)') });
        inkRibbon(g, 24, 40, c.accent, rnd); inkRibbon(g, 42, 44, c.accent, rnd, -1);
        inkHood(g, rnd, c.main, INK.shadow, false);
        g.fillStyle = '#e9f5ff'; g.fillRect(30, 27, 2, 2); g.fillRect(35, 27, 2, 2);
        inkShape(g, [[6, 20], [14, 34]], '#d8d4cc', rnd, { open: true, width: 3 }); // espadas flotando
        inkShape(g, [[58, 60], [52, 74]], '#d8d4cc', rnd, { open: true, width: 3 });
    },
    // Médico de la peste: máscara con pico y capa ocre (Sanador)
    plague(g, c, rnd) {
        inkCape(g, c, rnd);
        inkLegs(g, rnd, '#4b4038');
        inkShape(g, [[28, 36], [38, 36], [39, 72], [27, 72]], INK.metalDark, rnd);
        inkShape(g, [[26, 22], [40, 22], [40, 36], [26, 36]], INK.metal, rnd);
        inkShape(g, [[39, 28], [56, 34], [39, 34]], INK.cloth, rnd); // pico
        inkCircle(g, 33, 27, 2.4, '#9fd3e6');
        inkShape(g, [[22, 22], [44, 22], [42, 14], [24, 14]], INK.shadow, rnd); // sombrero
        inkArm(g, () => inkShape(g, [[18, 54], [10, 58]], '#9fd3e6', rnd, { open: true, width: 4 }), -1); // frasco
    }
};

// --- PASO 4: JEFES, CREEPS CHICOS Y BESTIAS DE LOS BIOMAS ---
// Más moldes para INK_PLANS (mismo lienzo de 64×96 con los pies en FOOT). Las bestias se dibujan de costado mirando a
// la derecha (drawInkUnit las da vuelta según hacia dónde caminan).
function inkPaw(g, rnd, x, top, color, phase) { // pata de cuadrúpedo que se mueve con el paso
    const dx = INK_A.step * 3 * phase, up = Math.max(0, INK_A.step * phase) * 2;
    inkShape(g, [[x, top], [x + 5, top], [x + 5 + dx, FOOT - 1 - up], [x + dx, FOOT - 1 - up]], color, rnd, { width: 1.8 });
}
function inkEye(g, x, y, color = '#f3e7c9', r = 1.6) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
Object.assign(INK_PLANS, {
    // Gólem: bloques de piedra, hombros de roca, runas que brillan
    golem(g, c, rnd) {
        const s = INK_A.step * 2.5;
        inkShape(g, [[19, 70], [30, 70], [30 + s, FOOT], [17 + s, FOOT]], c.dark, rnd);
        inkShape(g, [[36, 70], [47, 70], [49 - s, FOOT], [36 - s, FOOT]], c.dark, rnd);
        inkShape(g, [[14, 34], [52, 34], [56, 56], [48, 76], [18, 76], [10, 56]], c.main, rnd);
        inkHatch(g, 12, 60, 54, 76, 3);
        [[20, 40, 26, 50, 22, 58], [44, 42, 40, 52, 46, 60]].forEach(([a, b, d, e, f, h]) => inkShape(g, [[a, b], [d, e], [f, h]], INK.line, rnd, { open: true, width: 1.2 }));
        inkCircle(g, 33, 50, 4.5, '#7fd6e6'); // runa del pecho
        inkShape(g, [[25, 17], [41, 17], [43, 33], [23, 33]], c.dark, rnd);
        g.fillStyle = '#7fd6e6'; g.fillRect(27, 23, 4, 2.5); g.fillRect(35, 23, 4, 2.5);
        inkArm(g, () => { inkShape(g, [[4, 30], [17, 26], [20, 38], [7, 44]], c.main, rnd); inkShape(g, [[5, 44], [15, 44], [16, 66], [2, 70]], c.dark, rnd); }, -1);
        inkArm(g, () => { inkShape(g, [[49, 26], [62, 30], [59, 44], [46, 38]], c.main, rnd); inkShape(g, [[51, 44], [61, 44], [64, 70], [50, 66]], c.dark, rnd); });
    },
    // Reina de la colmena: abdomen rayado, alas que vibran, corona y antenas
    hiveQueen(g, c, rnd) {
        const w = INK_A.sway * 4;
        g.save(); g.globalAlpha = 0.55;
        inkShape(g, [[30, 40], [6, 18 - w], [2, 32], [24, 48]], '#e3eef0', rnd, { width: 1.4 });
        inkShape(g, [[36, 40], [60, 18 + w], [63, 32], [42, 48]], '#e3eef0', rnd, { width: 1.4 });
        g.restore();
        for (let i = 0; i < 3; i++) { const y = 46 + i * 6, d = (i % 2 ? 1 : -1) * INK_A.step * 2; inkShape(g, [[26, y], [14, y + 10 + d], [12, FOOT - 2 + d]], INK.line, rnd, { open: true, width: 1.8 }); inkShape(g, [[40, y], [52, y + 10 - d], [54, FOOT - 2 - d]], INK.line, rnd, { open: true, width: 1.8 }); }
        const ab = []; for (let a = 0; a <= Math.PI * 2; a += Math.PI / 9) ab.push([32 + Math.cos(a) * 17, 72 + Math.sin(a) * 17]);
        inkShape(g, ab, c.main, rnd, { pattern: g2 => { g2.fillStyle = c.dark; for (let y = 60; y < 92; y += 8) g2.fillRect(0, y, INK_W, 4); } });
        inkShape(g, [[24, 38], [40, 38], [42, 52], [22, 52]], c.dark, rnd);
        inkCircle(g, 32, 30, 8, c.main);
        inkEye(g, 28, 29, '#c0392b', 2.4); inkEye(g, 36, 29, '#c0392b', 2.4);
        inkShape(g, [[28, 23], [22, 12], [18, 10]], INK.line, rnd, { open: true, width: 1.5 }); inkShape(g, [[36, 23], [42, 12], [46, 10]], INK.line, rnd, { open: true, width: 1.5 });
        inkShape(g, [[26, 23], [28, 17], [31, 22], [33, 16], [35, 22], [38, 17], [39, 23]], '#c9a227', rnd, { width: 1.4 });
    },
    // Dragón de escarcha: alas abiertas, cuello largo con cuernos, púas de hielo en el lomo
    frostDragon(g, c, rnd) {
        const w = INK_A.sway * 3;
        inkShape(g, [[24, 50], [2, 22 - w], [6, 40], [0, 48], [10, 56], [22, 60]], c.dark, rnd, { width: 1.8 });
        inkShape(g, [[40, 50], [62, 22 + w], [58, 40], [64, 48], [54, 56], [42, 60]], c.dark, rnd, { width: 1.8 });
        inkShape(g, [[18, 74], [8, 80], [2, 90], [10, 86], [20, 82]], c.main, rnd); // cola
        const s = INK_A.step * 3;
        inkShape(g, [[22, 72], [30, 72], [29 + s, FOOT], [20 + s, FOOT]], c.dark, rnd);
        inkShape(g, [[36, 72], [44, 72], [46 - s, FOOT], [37 - s, FOOT]], c.dark, rnd);
        inkShape(g, [[18, 52], [46, 52], [48, 76], [16, 76]], c.main, rnd);
        for (let y = 58; y < 76; y += 5) inkShape(g, [[24, y], [40, y]], 'rgba(29,23,18,0.5)', rnd, { open: true, width: 1 });
        inkShape(g, [[28, 52], [32, 30], [38, 24], [42, 30], [38, 52]], c.main, rnd); // cuello
        inkShape(g, [[32, 26], [36, 14], [48, 16], [52, 22], [40, 26]], c.main, rnd); // cabeza
        inkShape(g, [[36, 15], [32, 6], [38, 13]], '#e9f5ff', rnd, { width: 1.4 }); inkShape(g, [[41, 15], [42, 5], [45, 14]], '#e9f5ff', rnd, { width: 1.4 });
        inkEye(g, 43, 19, '#9fd3e6', 1.8);
        [[20, 52], [26, 50], [34, 48]].forEach(([x, y]) => inkShape(g, [[x, y], [x + 3, y - 7], [x + 6, y]], '#cfe9f5', rnd, { width: 1.2 }));
    },
    // Señor del abismo: demonio con cuernos, alas de murciélago, ojos que arden y tridente
    abyssLord(g, c, rnd) {
        const w = INK_A.sway * 3;
        inkShape(g, [[22, 36], [2, 14 - w], [8, 30], [0, 40], [12, 44], [20, 52]], INK.shadow, rnd, { width: 1.6 });
        inkShape(g, [[44, 36], [62, 14 + w], [56, 30], [64, 40], [52, 44], [46, 52]], INK.shadow, rnd, { width: 1.6 });
        inkLegs(g, rnd, c.dark, 64);
        inkShape(g, [[20, 32], [46, 32], [44, 66], [22, 66]], c.main, rnd);
        inkHatch(g, 22, 50, 32, 66);
        inkShape(g, [[22, 60], [44, 60], [48, 74], [18, 74]], INK.shadow, rnd, { pattern: INK_PATTERNS.zigzag(INK.shadow, c.accent) });
        inkCircle(g, 33, 22, 9, c.dark);
        inkShape(g, [[26, 17], [18, 6], [24, 8], [29, 15]], '#d9c6a0', rnd, { width: 1.4 }); inkShape(g, [[40, 17], [48, 6], [42, 8], [37, 15]], '#d9c6a0', rnd, { width: 1.4 });
        inkEye(g, 29, 22, '#ffb703', 1.9); inkEye(g, 37, 22, '#ffb703', 1.9);
        inkArm(g, () => { inkShape(g, [[52, 6], [50, 92]], '#3f3a36', rnd, { open: true, width: 3 }); inkShape(g, [[45, 12], [45, 4], [52, 9], [59, 4], [59, 12], [52, 15]], INK.metal, rnd, { width: 1.4 }); });
    },
    // Hidra: tres cuellos de serpiente que se mecen a destiempo sobre un cuerpo bajo
    hydra(g, c, rnd) {
        inkShape(g, [[8, 92], [10, 74], [22, 66], [42, 66], [54, 74], [56, 92]], c.main, rnd);
        inkHatch(g, 8, 80, 56, 92, 3);
        [[14, 30, -1], [32, 16, 0], [50, 30, 1]].forEach(([hx, hy, k], i) => {
            const sw = Math.sin(INK_A.sway * 2 + i * 2.1) * 3, x = hx + sw;
            g.strokeStyle = INK.line; g.lineWidth = 9; g.lineCap = 'round';
            g.beginPath(); g.moveTo(32 + k * 10, 70); g.quadraticCurveTo(32 + k * 4 + sw, 46, x, hy + 6); g.stroke();
            g.strokeStyle = c.main; g.lineWidth = 6.5; g.beginPath(); g.moveTo(32 + k * 10, 70); g.quadraticCurveTo(32 + k * 4 + sw, 46, x, hy + 6); g.stroke();
            inkShape(g, [[x - 8, hy + 3], [x + 2, hy - 6], [x + 12, hy], [x + 11, hy + 9], [x - 5, hy + 11]], c.dark, rnd);
            inkEye(g, x + 3, hy + 1, '#ffd166', 2);
            inkShape(g, [[x + 2, hy + 8], [x + 11, hy + 5]], '#f3e7c9', rnd, { open: true, width: 1.4 });
        });
    },
    // Liche: túnica que flota, calavera con corona y báculo con un alma
    lich(g, c, rnd) {
        const hem = []; for (let x = 50; x >= 14; x -= 6) hem.push([x + INK_A.sway * 3, 84 + ((x / 6) % 2 ? 6 : 0)]);
        inkShape(g, [[22, 32], [42, 32], [52, 56], ...hem, [12, 56]], c.main, rnd, { pattern: INK_PATTERNS.zigzag(c.main, c.dark) });
        for (let y = 40; y < 56; y += 4) inkShape(g, [[27, y], [37, y]], 'rgba(233,226,208,0.7)', rnd, { open: true, width: 1.4 }); // costillas
        inkCircle(g, 32, 23, 8, '#e9e2d0');
        g.fillStyle = INK.shadow; g.fillRect(27.5, 21, 3.5, 3.5); g.fillRect(33.5, 21, 3.5, 3.5);
        inkEye(g, 29.2, 22.8, '#b8f2e6', 1); inkEye(g, 35.2, 22.8, '#b8f2e6', 1);
        inkShape(g, [[25, 16], [26, 9], [29, 14], [32, 7], [35, 14], [38, 9], [39, 16]], '#c9a227', rnd, { width: 1.4 });
        inkArm(g, () => { inkShape(g, [[52, 14], [49, 90]], '#4a3f52', rnd, { open: true, width: 3 }); inkCircle(g, 52, 12, 5.5, '#b8f2e6'); });
        inkArm(g, () => inkShape(g, [[22, 36], [12, 52], [16, 54], [25, 42]], c.dark, rnd), -1);
    },
    // Titán de sangre: gigante con cuernos, cicatrices, cadenas y un cuchillo enorme
    bloodTitan(g, c, rnd) {
        const s = INK_A.step * 3;
        inkShape(g, [[18, 70], [30, 70], [30 + s, FOOT], [16 + s, FOOT]], INK.boot, rnd);
        inkShape(g, [[36, 70], [48, 70], [50 - s, FOOT], [36 - s, FOOT]], INK.boot, rnd);
        inkShape(g, [[16, 62], [50, 62], [52, 76], [14, 76]], INK.shadow, rnd);
        inkShape(g, [[12, 28], [54, 28], [50, 64], [16, 64]], c.main, rnd);
        inkShape(g, [[22, 36], [30, 50]], INK.line, rnd, { open: true, width: 1.4 }); inkShape(g, [[38, 34], [46, 44]], INK.line, rnd, { open: true, width: 1.4 });
        inkCircle(g, 33, 19, 9, c.dark);
        inkShape(g, [[26, 14], [16, 2], [20, 12]], '#d9c6a0', rnd, { width: 1.4 }); inkShape(g, [[40, 14], [50, 2], [46, 12]], '#d9c6a0', rnd, { width: 1.4 });
        inkEye(g, 29, 19, '#ffd166'); inkEye(g, 37, 19, '#ffd166');
        inkArm(g, () => { inkShape(g, [[6, 30], [14, 30], [12, 62], [2, 60]], c.dark, rnd); g.strokeStyle = INK.metal; g.lineWidth = 2; for (let y = 54; y < 70; y += 4) { g.beginPath(); g.arc(5, y, 2, 0, Math.PI * 2); g.stroke(); } }, -1);
        inkArm(g, () => { inkShape(g, [[52, 30], [60, 30], [62, 56], [52, 58]], c.dark, rnd); inkShape(g, [[54, 40], [64, 36], [64, 84], [56, 80]], INK.metal, rnd); });
    },
    // Espectro errante: fantasma sin piernas que se deshace en jirones, con cadenas
    phantom(g, c, rnd) {
        const sw = INK_A.sway * 4;
        inkShape(g, [[22, 28], [42, 28], [50, 50], [46 + sw, 70], [40 + sw * 1.5, 92], [34 + sw, 78], [28 + sw * 1.5, 90], [22 + sw, 74], [14, 50]], c.main, rnd, { pattern: INK_PATTERNS.stripes(c.main, 'rgba(29,23,18,0.12)') });
        inkShape(g, [[18, 42], [2, 50 + sw], [6, 54], [20, 50]], c.main, rnd, { width: 1.6 }); inkShape(g, [[46, 42], [62, 50 - sw], [58, 54], [44, 50]], c.main, rnd, { width: 1.6 });
        inkCircle(g, 32, 22, 9, c.main);
        g.fillStyle = INK.shadow; g.beginPath(); g.ellipse(28.5, 22, 2.2, 3.4, 0, 0, Math.PI * 2); g.ellipse(35.5, 22, 2.2, 3.4, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = INK.shadow; g.beginPath(); g.ellipse(32, 29, 2.5, 3, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = INK.metalDark; g.lineWidth = 1.6; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(6 + i * 1.5, 56 + i * 5, 2, 0, Math.PI * 2); g.stroke(); }
    },
    // Enjambre: una nube de bichos que zumban
    swarm(g, c, rnd) {
        for (let i = 0; i < 7; i++) {
            const a = i / 7 * Math.PI * 2 + INK_A.sway, r = 9 + (i % 3) * 6, x = 32 + Math.cos(a) * r, y = 66 + Math.sin(a) * r * 0.75;
            g.save(); g.globalAlpha = 0.7; g.fillStyle = '#e3eef0'; g.strokeStyle = INK.line; g.lineWidth = 0.8;
            g.beginPath(); g.ellipse(x - 3, y - 4, 4, 2.2, -0.5, 0, Math.PI * 2); g.fill(); g.stroke();
            g.beginPath(); g.ellipse(x + 3, y - 4, 4, 2.2, 0.5, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
            g.fillStyle = c.main; g.strokeStyle = INK.line; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, 5, 3.2, 0, 0, Math.PI * 2); g.fill(); g.stroke();
            g.fillStyle = c.dark; g.fillRect(x - 1, y - 3, 2, 6);
        }
    },
    // Kamikaze: bicho redondo con mecha encendida
    kamikaze(g, c, rnd) {
        const up = Math.abs(INK_A.step) * 2;
        inkShape(g, [[24, 84], [22, FOOT - (INK_A.step > 0 ? 2 : 0)], [28, FOOT]], INK.boot, rnd, { width: 1.4 });
        inkShape(g, [[38, 84], [42, FOOT - (INK_A.step < 0 ? 2 : 0)], [36, FOOT]], INK.boot, rnd, { width: 1.4 });
        const body = []; for (let a = 0; a <= Math.PI * 2; a += Math.PI / 8) body.push([32 + Math.cos(a) * 14, 72 - up + Math.sin(a) * 13]);
        inkShape(g, body, c.main, rnd);
        inkHatch(g, 20, 76 - up, 44, 86 - up);
        inkShape(g, [[26, 66 - up], [30, 68 - up]], INK.line, rnd, { open: true, width: 2 }); inkShape(g, [[38, 66 - up], [34, 68 - up]], INK.line, rnd, { open: true, width: 2 });
        inkEye(g, 28, 70 - up, '#fff3b0', 1.4); inkEye(g, 36, 70 - up, '#fff3b0', 1.4);
        inkShape(g, [[32, 59 - up], [36, 50 - up], [40, 46 - up]], '#5a4030', rnd, { open: true, width: 2 });
        inkCircle(g, 41, 45 - up, 2.6 + Math.abs(INK_A.sway), '#ffb703');
    },
    // Chusma: duendecito con orejas puntiagudas y un cuchillo
    chusma(g, c, rnd) {
        const s = INK_A.step * 2;
        inkShape(g, [[28, 80], [31, 80], [30 + s, FOOT], [26 + s, FOOT]], INK.boot, rnd, { width: 1.4 });
        inkShape(g, [[34, 80], [37, 80], [39 - s, FOOT], [35 - s, FOOT]], INK.boot, rnd, { width: 1.4 });
        inkShape(g, [[25, 64], [40, 64], [42, 82], [23, 82]], c.main, rnd);
        inkCircle(g, 32, 57, 7, '#9fae7a');
        inkShape(g, [[26, 56], [17, 50], [25, 60]], '#9fae7a', rnd, { width: 1.3 }); inkShape(g, [[38, 56], [47, 50], [39, 60]], '#9fae7a', rnd, { width: 1.3 });
        inkEye(g, 29.5, 56, '#ffd166', 1.3); inkEye(g, 34.5, 56, '#ffd166', 1.3);
        inkArm(g, () => inkShape(g, [[40, 70], [48, 64]], '#d8d4cc', rnd, { open: true, width: 2.6 }));
    },
    // Lobo: de costado, cola alta y hocico largo
    wolf(g, c, rnd) {
        inkPaw(g, rnd, 16, 70, c.dark, -1); inkPaw(g, rnd, 40, 70, c.dark, 1);
        inkShape(g, [[13, 64], [6, 56], [4, 48], [9, 54], [15, 60]], c.main, rnd, { width: 1.6 }); // cola
        inkShape(g, [[12, 66], [18, 60], [40, 58], [48, 62], [50, 72], [44, 76], [18, 76], [12, 72]], c.main, rnd);
        inkHatch(g, 14, 70, 48, 77, 3);
        inkPaw(g, rnd, 20, 72, c.main, 1); inkPaw(g, rnd, 44, 72, c.main, -1);
        inkShape(g, [[44, 62], [49, 52], [53, 56], [62, 61], [60, 66], [50, 68]], c.main, rnd);
        inkShape(g, [[47, 55], [49, 46], [53, 54]], c.dark, rnd, { width: 1.4 });
        inkEye(g, 53, 58, '#ffd166', 1.3);
        inkShape(g, [[55, 65], [60, 64]], '#f3e7c9', rnd, { open: true, width: 1 });
    },
    // Jabalí: cuerpo bajo y ancho, cerdas en el lomo y colmillos
    boar(g, c, rnd) {
        inkPaw(g, rnd, 16, 72, c.dark, -1); inkPaw(g, rnd, 40, 72, c.dark, 1);
        inkShape(g, [[10, 70], [14, 58], [40, 54], [52, 62], [52, 76], [44, 80], [16, 80], [10, 76]], c.main, rnd);
        for (let x = 16; x < 44; x += 4) inkShape(g, [[x, 58 - (x - 16) * 0.12], [x + 2, 52 - (x - 16) * 0.12], [x + 4, 57 - (x - 16) * 0.12]], c.dark, rnd, { width: 1 });
        inkHatch(g, 12, 72, 50, 80, 3);
        inkPaw(g, rnd, 20, 74, c.main, 1); inkPaw(g, rnd, 44, 74, c.main, -1);
        inkShape(g, [[46, 60], [60, 64], [61, 72], [48, 74]], c.main, rnd);
        inkShape(g, [[57, 72], [62, 66], [60, 64]], '#f3e7c9', rnd, { width: 1.2 });
        inkEye(g, 52, 64, '#1d1712', 1.3);
    },
    // Sapo: agazapado, con verrugas, ojos saltones y un salto en cada paso
    toad(g, c, rnd) {
        const up = Math.abs(INK_A.step) * 5;
        inkShape(g, [[12, FOOT], [18, 82 - up], [24, FOOT]], c.dark, rnd, { width: 1.6 }); inkShape(g, [[40, FOOT], [46, 82 - up], [52, FOOT]], c.dark, rnd, { width: 1.6 });
        const body = []; for (let a = Math.PI; a <= Math.PI * 2.001; a += Math.PI / 10) body.push([32 + Math.cos(a) * 21, 86 - up + Math.sin(a) * 18]);
        inkShape(g, body, c.main, rnd);
        g.fillStyle = c.accent; [[22, 78], [30, 72], [40, 76], [26, 82], [44, 82]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y - up, 1.8, 0, Math.PI * 2); g.fill(); });
        inkCircle(g, 24, 70 - up, 5, c.main); inkCircle(g, 40, 70 - up, 5, c.main);
        inkEye(g, 24, 69 - up, '#1d1712', 2); inkEye(g, 40, 69 - up, '#1d1712', 2);
        inkShape(g, [[18, 80 - up], [32, 83 - up], [46, 80 - up]], INK.line, rnd, { open: true, width: 1.6 });
    },
    // Escorpión: tenazas adelante y la cola con aguijón por encima del lomo
    scorpion(g, c, rnd) {
        for (let i = 0; i < 3; i++) { const x = 22 + i * 7, d = (i % 2 ? 1 : -1) * INK_A.step * 2; inkShape(g, [[x, 80], [x - 4 + d, 86], [x - 6 + d, FOOT]], INK.line, rnd, { open: true, width: 1.6 }); }
        inkShape(g, [[16, 82], [20, 74], [46, 74], [50, 82], [44, 86], [20, 86]], c.main, rnd);
        const t = INK_A.sway * 2;
        g.strokeStyle = INK.line; g.lineWidth = 7; g.beginPath(); g.moveTo(18, 78); g.quadraticCurveTo(4, 56 + t, 22, 46 + t); g.stroke();
        g.strokeStyle = c.main; g.lineWidth = 4.5; g.beginPath(); g.moveTo(18, 78); g.quadraticCurveTo(4, 56 + t, 22, 46 + t); g.stroke();
        inkShape(g, [[21, 44 + t], [30, 48 + t], [22, 50 + t]], c.accent, rnd, { width: 1.4 });
        inkShape(g, [[46, 78], [56, 70], [62, 72], [56, 76], [62, 80], [54, 82]], c.dark, rnd, { width: 1.6 });
        inkEye(g, 44, 78, '#1d1712', 1.2);
    },
    // Salamandra: lagarto largo y bajo con manchas de fuego
    lizard(g, c, rnd) {
        inkPaw(g, rnd, 18, 80, c.dark, -1); inkPaw(g, rnd, 40, 80, c.dark, 1);
        const t = INK_A.sway * 3;
        inkShape(g, [[14, 80], [6, 76 + t], [0, 82 + t], [8, 82], [16, 84]], c.main, rnd, { width: 1.6 });
        inkShape(g, [[12, 80], [20, 74], [44, 74], [52, 80], [44, 86], [18, 86]], c.main, rnd);
        g.fillStyle = c.accent; [[24, 78], [32, 77], [40, 79]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill(); });
        inkPaw(g, rnd, 22, 82, c.main, 1); inkPaw(g, rnd, 44, 82, c.main, -1);
        inkShape(g, [[46, 76], [60, 76], [62, 80], [50, 84]], c.main, rnd);
        inkEye(g, 55, 78, '#ffd166', 1.3);
    }
});
const INK_BOSS_PLANS = { GOLEM: 'golem', HIVE_QUEEN: 'hiveQueen', FROST_DRAGON: 'frostDragon', ABYSS_LORD: 'abyssLord', HYDRA: 'hydra', LICH: 'lich', BLOOD_TITAN: 'bloodTitan', PHANTOM: 'phantom' };

// Qué silueta usa cada unidad en Tower Chaos (null = se queda con el pixel art con contorno)
function inkPlanFor(u) {
    if (u.isHero) return 'hoodedKnight';
    const t = u.type;
    if ((u.isGuardian || u.isBoss) && t && INK_BOSS_PLANS[t.key]) return INK_BOSS_PLANS[t.key]; // cada jefe, su figura
    if (u.isGuardian) return 'brute';
    if (!t) return null;
    if (t.plan) return t.plan; // bestias de los biomas (towerWorld.js)
    if (t.key === 'SWARM') return 'swarm';
    if (t.key === 'KAMIKAZE') return 'kamikaze';
    if (t.key === 'CHUSMA') return 'chusma';
    if (t.key === 'SPECTER') return 'wraith';
    if (t.key === 'HEALER') return 'plague';
    if (['BRUTE', 'ARMORED', 'STUNNER'].includes(t.key)) return 'brute';
    if (t.attackType === 'magical' || ['SHAMAN', 'WARLOCK', 'FROSTCASTER', 'DRUMMER'].includes(t.key)) return 'mage';
    if (t.range >= 2.5) return 'archer';
    return 'footman';
}

// Colores y opciones de la figura de una unidad. El aventurero se ve según su equipo: capa del color del héroe de
// su armadura, capucha del de su casco, arma con la forma de la suya (paper doll).
function inkLookFor(u) {
    const muted = h => inkMute(h, 0.25);
    if (u.isHero) {
        const gear = u.gear || {}, col = item => item && item.heroKey ? ATTR_INFO[HERO_TEMPLATES[item.heroKey].primaryAttr].color : null;
        const main = muted(col(gear.armor) || col(gear.weapon) || '#a33a3a');
        const w = gear.weapon ? HERO_WEAPONS[gear.weapon.heroKey].shape : 'sword';
        return { main, hood: gear.helm ? muted(col(gear.helm)) : main, accent: muted(col(gear.boots) || '#c9a227'), weapon: w };
    }
    const main = inkMute(u.color || '#888888');
    const look = { main, accent: inkMute(shade(u.color || '#888888', 0.35), 0.4) };
    if (u.type && u.type.parts && u.type.parts.length) look.parts = u.type.parts; // criaturas generadas
    return look;
}

const inkCache = {};
// Un cuadro de la figura (kind 'walk' o 'idle', k = número de cuadro). La versión blanca (destello al recibir daño) se
// dibuja recién cuando hace falta.
function inkFigure(plan, look, kind = 'idle', k = 0) {
    const key = plan + JSON.stringify(look) + kind + k;
    if (inkCache[key]) return inkCache[key];
    const make = white => {
        const c = document.createElement('canvas'); c.width = INK_W; c.height = INK_H;
        const g = c.getContext('2d');
        let seed = [...plan].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) % 2147483647, 7); // mismo temblor en todos los cuadros
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        g.lineCap = 'round'; g.lineJoin = 'round';
        INK_A = inkFramePose(kind, k);
        const colors = { dark: shade(look.main, -0.35), cloth: INK.cloth, accent: look.accent || '#c9a227', ...look };
        if (look.parts && typeof inkPartsBehind === 'function') inkPartsBehind(g, plan, colors, rnd); // alas (towerBestiary.js)
        INK_PLANS[plan](g, colors, rnd);
        if (look.parts && typeof inkPartsFront === 'function') inkPartsFront(g, plan, colors, rnd);  // cuernos, púas, ojos, manchas
        INK_A = { step: 0, sway: 0, arm: 0 };
        if (white) { g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, INK_W, INK_H); }
        return c;
    };
    const fig = { img: make(false), _white: null };
    Object.defineProperty(fig, 'white', { get() { return this._white || (this._white = make(true)); } });
    return (inkCache[key] = fig);
}

function inkScale(u) { return (u.isGuardian ? 2.0 : u.isCaveBoss ? 1.7 : u.isBoss ? 1.45 : 1.1) * ((!u.isCaveBoss && u.type && u.type.scale) || 1) * TILE / INK_W * 1.3; }
// Altura de la figura por encima del centro de la casilla (para ubicar la barra de vida arriba de la cabeza)
function inkHalfHeight(u) { return INK_H * inkScale(u) * 0.86 - TILE * 0.45 - 4; }

// Dibuja una unidad en estilo tinta. Devuelve false si no tiene figura (y se usa el pixel art).
function drawInkUnit(u, cx, cy, size, facing, flash, pose) {
    const plan = inkPlanFor(u);
    if (!plan) return false;
    // Caminando (se desliza hacia su casilla): cuadros de caminata al ritmo de su paso; quieto: respira.
    const moving = Math.hypot(u.x - (u.rx ?? u.x), u.y - (u.ry ?? u.y)) > 0.04 || plan === 'wraith';
    let kind = 'idle', k, bob = 0;
    if (moving) {
        const phase = (fxClock / (2 * Math.max(0.12, unitStepTime(u))) + (u.bobSeed || 0)) % 1;
        kind = 'walk'; k = Math.floor(phase * INK_WALK_FRAMES); bob = -Math.abs(Math.sin(phase * Math.PI * 2)) * 1.8;
    } else k = Math.floor(((fxClock * 0.8 + (u.bobSeed || 0)) % 1) * INK_IDLE_FRAMES);
    const fig = inkFigure(plan, inkLookFor(u), kind, k);
    const scale = inkScale(u);
    const w = INK_W * scale, h = INK_H * scale;
    ctx.save();
    ctx.translate(cx, cy + TILE * 0.45 + bob * scale); // pies en la parte de abajo de la casilla (y el rebote del paso)
    if (pose) { ctx.rotate(pose.rot * (facing < 0 ? -1 : 1)); ctx.scale(pose.sx, pose.sy); }
    if (facing < 0) ctx.scale(-1, 1);
    ctx.fillStyle = 'rgba(29,23,18,0.28)'; // sombra en el piso
    ctx.beginPath(); ctx.ellipse(0, -2, w * 0.3, h * 0.04, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(flash ? fig.white : fig.img, -w / 2, -h * (FOOT + 2) / INK_H, w, h);
    ctx.restore();
    return true;
}

// Pixel art con contorno de tinta y colores apagados (para los que no tienen figura todavía)
function drawInkedSprite(sprite, cx, cy, size, facing, flash, pose) {
    ctx.save();
    ctx.filter = 'saturate(0.65) sepia(0.2)';
    if (!flash) { // contorno: la silueta en negro corrida en 4 direcciones
        ctx.filter = 'brightness(0) saturate(0)';
        [[-2, 0], [2, 0], [0, -2], [0, 2]].forEach(([dx, dy]) => drawSprite(sprite, cx + dx, cy + dy, size, facing, false, pose));
        ctx.filter = 'saturate(0.65) sepia(0.2)';
    }
    drawSprite(sprite, cx, cy, size, facing, flash, pose);
    ctx.restore();
}

// --- ÍCONOS EN TINTA (piezas de equipo, habilidades y retrato) ---
// Cada ícono es un dibujo vectorial de 48×48 con contorno de tinta, sobre un disco de pergamino. Se dibujan una vez.
const inkIconCache = {};
const INK_ICON_DRAW = {
    sword(g, c, r) { inkShape(g, [[12, 38], [36, 12], [40, 10], [38, 14], [14, 40]], '#d8d4cc', r); inkShape(g, [[10, 30], [20, 40]], INK.line, r, { open: true, width: 3.4 }); inkShape(g, [[8, 42], [13, 37]], c.main, r, { open: true, width: 4 }); },
    hammer(g, c, r) { inkShape(g, [[12, 40], [32, 14]], '#7a5c3c', r, { open: true, width: 4 }); inkShape(g, [[24, 8], [40, 16], [36, 26], [22, 18]], c.main, r); },
    spear(g, c, r) { inkShape(g, [[8, 42], [36, 12]], '#7a5c3c', r, { open: true, width: 3.4 }); inkShape(g, [[34, 8], [42, 6], [40, 14], [34, 16]], '#d8d4cc', r); inkShape(g, [[28, 18], [32, 22]], c.main, r, { open: true, width: 4 }); },
    staff(g, c, r) { inkShape(g, [[14, 42], [30, 14]], '#7a5c3c', r, { open: true, width: 3.4 }); inkCircle(g, 32, 11, 7, c.main); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(29, 8, 3, 3); },
    crystal(g, c, r) { inkShape(g, [[24, 6], [34, 18], [30, 40], [18, 40], [14, 18]], c.main, r); inkShape(g, [[24, 6], [24, 40]], 'rgba(29,23,18,0.5)', r, { open: true, width: 1 }); },
    orb(g, c, r) { inkCircle(g, 24, 22, 13, c.main); g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(19, 17, 4, 0, 7); g.fill(); inkShape(g, [[14, 36], [34, 36], [30, 42], [18, 42]], '#7a5c3c', r); },
    dagger(g, c, r) { inkShape(g, [[10, 36], [30, 14], [34, 12], [32, 16], [12, 38]], '#d8d4cc', r); inkShape(g, [[38, 36], [18, 14], [14, 12], [16, 16], [36, 38]], '#d8d4cc', r); inkShape(g, [[22, 30], [26, 30]], c.main, r, { open: true, width: 5 }); },
    helm(g, c, r) { inkShape(g, [[12, 30], [12, 18], [18, 9], [30, 9], [36, 18], [36, 30], [30, 38], [18, 38]], c.main, r); inkShape(g, [[16, 22], [32, 22]], INK.line, r, { open: true, width: 3 }); inkShape(g, [[24, 13], [24, 34]], INK.line, r, { open: true, width: 3 }); },
    armor(g, c, r) { inkShape(g, [[10, 12], [18, 8], [24, 12], [30, 8], [38, 12], [36, 24], [34, 40], [14, 40], [12, 24]], c.main, r); inkHatch(g, 12, 26, 20, 40, 3); inkShape(g, [[24, 12], [24, 38]], 'rgba(29,23,18,0.5)', r, { open: true, width: 1.2 }); },
    glove(g, c, r) { inkShape(g, [[14, 40], [12, 24], [16, 10], [20, 10], [21, 20], [24, 8], [28, 8], [28, 20], [32, 12], [36, 14], [34, 30], [30, 40]], c.main, r); },
    boot(g, c, r) { inkShape(g, [[16, 8], [28, 8], [28, 30], [40, 34], [40, 40], [14, 40]], c.main, r); inkShape(g, [[16, 16], [28, 16]], INK.line, r, { open: true, width: 1.4 }); },
    amulet(g, c, r) { g.strokeStyle = INK.line; g.lineWidth = 1.6; g.beginPath(); g.arc(24, 14, 12, 0.2, Math.PI - 0.2); g.stroke(); inkShape(g, [[24, 22], [32, 30], [24, 42], [16, 30]], c.main, r); },
    ring(g, c, r) { g.strokeStyle = INK.line; g.lineWidth = 7; g.beginPath(); g.arc(24, 28, 11, 0, 7); g.stroke(); g.strokeStyle = '#c9a227'; g.lineWidth = 4; g.beginPath(); g.arc(24, 28, 11, 0, 7); g.stroke(); inkShape(g, [[19, 12], [29, 12], [27, 18], [21, 18]], c.main, r); },
    // Habilidades (por lo que hacen)
    physical(g, c, r) { INK_ICON_DRAW.dagger(g, c, r); },
    magic(g, c, r) { const p = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rad = i % 2 ? 7 : 17; p.push([24 + Math.cos(a) * rad, 24 + Math.sin(a) * rad]); } inkShape(g, p, c.main, r); },
    control(g, c, r) { for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; inkShape(g, [[24 - Math.cos(a) * 16, 24 - Math.sin(a) * 16], [24 + Math.cos(a) * 16, 24 + Math.sin(a) * 16]], c.main, r, { open: true, width: 4 }); } inkCircle(g, 24, 24, 4, '#e9f5ff'); },
    heal(g, c, r) { inkShape(g, [[24, 40], [8, 22], [10, 12], [18, 10], [24, 16], [30, 10], [38, 12], [40, 22]], c.main, r); inkShape(g, [[20, 24], [28, 24]], '#f3e7c9', r, { open: true, width: 3 }); inkShape(g, [[24, 20], [24, 28]], '#f3e7c9', r, { open: true, width: 3 }); },
    mobility(g, c, r) { inkShape(g, [[10, 34], [20, 14], [26, 22], [34, 8], [38, 26], [28, 36]], c.main, r); for (let i = 0; i < 3; i++) inkShape(g, [[6, 40 - i * 6], [14, 40 - i * 6]], INK.line, r, { open: true, width: 1.6 }); },
    area(g, c, r) { [16, 10, 4].forEach((rad, i) => { g.strokeStyle = i ? c.main : INK.line; g.lineWidth = i ? 3 : 2; g.beginPath(); g.arc(24, 24, rad, 0, 7); g.stroke(); }); },
    lifesteal(g, c, r) { inkShape(g, [[24, 6], [34, 24], [32, 36], [24, 40], [16, 36], [14, 24]], '#9b2226', r); },
    buff(g, c, r) { inkShape(g, [[24, 6], [38, 22], [30, 22], [30, 40], [18, 40], [18, 22], [10, 22]], c.main, r); },
    eye(g, c, r) { inkShape(g, [[6, 24], [16, 14], [32, 14], [42, 24], [32, 34], [16, 34]], '#f3e7c9', r); inkCircle(g, 24, 24, 6, c.main); }
};
function inkIcon(kind, color = '#a33a3a') {
    const key = kind + color;
    if (inkIconCache[key]) return inkIconCache[key];
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const g = c.getContext('2d');
    let seed = [...key].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) % 2147483647, 11);
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.lineCap = 'round'; g.lineJoin = 'round';
    (INK_ICON_DRAW[kind] || INK_ICON_DRAW.eye)(g, { main: color }, rnd);
    return (inkIconCache[key] = c.toDataURL());
}
// Ícono de game-icons.net (js/data/gameIcons.js) repintado en tinta: sombra corrida, relleno del color y contorno.
// badge: otro ícono chico en la esquina (en las piezas, la habilidad que traen).
function inkGameGlyph(g, name, color, x, y, size) {
    const ps = (GAME_ICON_PATHS[name] || []).map(d => new Path2D(d)), k = size / 512;
    g.save(); g.translate(x + size * 0.03, y + size * 0.035); g.scale(k, k);
    g.fillStyle = 'rgba(29,23,18,0.5)'; ps.forEach(p => g.fill(p));
    g.restore();
    g.save(); g.translate(x, y); g.scale(k, k);
    g.fillStyle = color; ps.forEach(p => g.fill(p));
    g.strokeStyle = INK.line; g.lineWidth = 0.9 / k; g.lineJoin = 'round'; ps.forEach(p => g.stroke(p));
    g.restore();
}
function hasGameIcon(name) { return typeof GAME_ICON_PATHS !== 'undefined' && !!GAME_ICON_PATHS[name]; }
function inkGameIcon(name, color = '#a33a3a', badge = null, badgeColor = color) {
    const key = ['gi', name, color, badge, badgeColor].join('|');
    if (inkIconCache[key]) return inkIconCache[key];
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const g = c.getContext('2d');
    inkGameGlyph(g, name, color, 3, 3, 42);
    if (badge && hasGameIcon(badge)) {
        g.fillStyle = INK.paper; g.strokeStyle = INK.line; g.lineWidth = 1.6;
        g.beginPath(); g.arc(36, 36, 11.5, 0, Math.PI * 2); g.fill(); g.stroke();
        inkGameGlyph(g, badge, badgeColor, 27.5, 27.5, 17);
    }
    return (inkIconCache[key] = c.toDataURL());
}
// Ícono de una habilidad según lo que hace (su primera etiqueta reconocible)
const INK_SKILL_KINDS = [['CURACIÓN', 'heal'], ['ROBO_VIDA', 'lifesteal'], ['MOVILIDAD', 'mobility'], ['CONTROL', 'control'], ['ÁREA', 'area'], ['MÁGICO', 'magic'], ['PURO', 'magic'], ['FÍSICO', 'physical'], ['MEJORA', 'buff']];
function inkSkillIcon(skill) {
    const kind = (INK_SKILL_KINDS.find(([t]) => (skill.tags || []).includes(t)) || [null, 'eye'])[1];
    const hero = skill.heroKey && HERO_TEMPLATES[skill.heroKey];
    const color = inkMute(hero ? ATTR_INFO[hero.primaryAttr].color : '#a33a3a', 0.2);
    const name = typeof GAME_ICON_FOR !== 'undefined' && GAME_ICON_FOR.skills[skill.id];
    return hasGameIcon(name) ? inkGameIcon(name, color) : inkIcon(kind, color);
}
// Retrato: busto de la figura del héroe (según su equipo)
const inkPortraitCache = {};
function inkPortrait(u) {
    const look = inkLookFor(u), key = JSON.stringify(look);
    if (inkPortraitCache[key]) return inkPortraitCache[key];
    const fig = inkFigure('hoodedKnight', look);
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = INK.paper; g.fillRect(0, 0, 64, 64);
    g.drawImage(fig.img, 8, 6, 52, 52, -6, -2, 76, 76);
    g.strokeStyle = INK.line; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 61, 61);
    return (inkPortraitCache[key] = c.toDataURL());
}
