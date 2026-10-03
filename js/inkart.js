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
    if (!inkVignette) {
        inkVignette = document.createElement('canvas'); inkVignette.width = MAP_W; inkVignette.height = MAP_H;
        const g = inkVignette.getContext('2d');
        const grd = g.createRadialGradient(MAP_W / 2, MAP_H / 2, MAP_H * 0.35, MAP_W / 2, MAP_H / 2, MAP_W * 0.62);
        grd.addColorStop(0, 'rgba(43,33,24,0)'); grd.addColorStop(1, 'rgba(43,33,24,0.55)');
        g.fillStyle = grd; g.fillRect(0, 0, MAP_W, MAP_H);
    }
    ctx.drawImage(inkVignette, 0, 0);
}

// --- PASO 2: PERSONAJES VECTORIALES ---
// Lienzo de cada figura: 64×80, mirando a la derecha, con los pies en y≈76.
const INK_W = 64, INK_H = 80;

// Dibuja un polígono con relleno y contorno de tinta "temblorosa" (cada vértice se corre un poco, con semilla fija).
function inkShape(g, pts, fill, rnd, opts = {}) {
    const j = opts.jitter ?? 0.7;
    const p = pts.map(([x, y]) => [x + (rnd() - 0.5) * j, y + (rnd() - 0.5) * j]);
    g.beginPath(); g.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]);
    if (opts.open) { g.strokeStyle = fill || INK.line; g.lineWidth = opts.width || 2.4; g.stroke(); return; }
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    g.strokeStyle = INK.line; g.lineWidth = opts.width || 2.2; g.lineJoin = 'round'; g.stroke();
}
function inkCircle(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } g.strokeStyle = INK.line; g.lineWidth = 2; g.stroke(); }
// Rayado de sombra dentro de una zona (líneas diagonales finas)
function inkHatch(g, x0, y0, x1, y1, step = 3.5) {
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    g.strokeStyle = 'rgba(29,23,18,0.45)'; g.lineWidth = 1;
    for (let x = x0 - (y1 - y0); x < x1; x += step) { g.beginPath(); g.moveTo(x, y1); g.lineTo(x + (y1 - y0), y0); g.stroke(); }
    g.restore();
}
// Capa con dobladillo dentado
function inkCape(g, color, rnd, wide = 1) {
    const hem = [];
    const left = 32 - 22 * wide, right = 32 + 22 * wide;
    for (let x = right; x >= left; x -= 4) hem.push([x, 74 + (Math.round((x - left) / 4) % 2 ? 2 : -1)]);
    inkShape(g, [[26, 28], [40, 28], [44, 40], ...hem, [20, 40]], color, rnd);
    inkHatch(g, left, 50, left + 10 * wide, 75, 3);
    g.strokeStyle = 'rgba(29,23,18,0.35)'; g.lineWidth = 1; // pliegues
    for (let i = 0; i < 4; i++) { const x = 24 + i * 6 * wide; g.beginPath(); g.moveTo(x, 44); g.lineTo(x - 2 + i, 72); g.stroke(); }
}
function inkLegs(g, rnd, color = INK.metalDark) {
    inkShape(g, [[27, 58], [32, 58], [31, 74], [26, 74]], color, rnd);
    inkShape(g, [[34, 58], [39, 58], [40, 74], [35, 74]], color, rnd);
    inkShape(g, [[24, 72], [32, 72], [32, 77], [23, 77]], INK.boot, rnd);
    inkShape(g, [[34, 72], [42, 72], [43, 77], [34, 77]], INK.boot, rnd);
}
function inkSword(g, rnd, x0 = 44, y0 = 44, x1 = 61, y1 = 70) {
    inkShape(g, [[x0, y0], [x1, y1]], '#d8d4cc', rnd, { open: true, width: 4.2 });
    inkShape(g, [[x0, y0], [x1, y1]], INK.line, rnd, { open: true, width: 1 });
    inkShape(g, [[x0 - 4, y0 + 3], [x0 + 4, y0 - 3]], INK.line, rnd, { open: true, width: 3 });
}

// Planos de figura: cada uno dibuja una silueta distinta con los colores que recibe.
const INK_PLANS = {
    // Caballero encapuchado con capa (el aventurero, como las referencias)
    hoodedKnight(g, c, rnd) {
        // Capa de atrás: larga y ondulante, con el forro oscuro a la derecha y dobladillo dentado
        const hem = []; for (let x = 58; x >= 6; x -= 4) hem.push([x, 76 + (Math.round(x / 4) % 2 ? 1.5 : -1.5)]);
        inkShape(g, [[23, 24], [43, 22], [52, 40], [58, 66], ...hem, [8, 62], [14, 40]], c.main, rnd);
        inkShape(g, [[43, 26], [52, 42], [57, 66], [58, 76], [46, 76], [44, 50]], c.dark, rnd, { width: 1.6 }); // forro
        inkHatch(g, 6, 56, 18, 77, 3);
        for (let i = 0; i < 26; i++) { // puntitos de la tela (como la capa de la referencia)
            const x = 10 + rnd() * 34, y = 34 + rnd() * 40;
            g.fillStyle = 'rgba(29,23,18,0.35)'; g.beginPath(); g.arc(x, y, 0.9, 0, Math.PI * 2); g.fill();
        }
        g.strokeStyle = 'rgba(29,23,18,0.4)'; g.lineWidth = 1; // pliegues largos
        [[18, 40, 14, 74], [24, 44, 22, 75], [30, 50, 31, 75]].forEach(([x0, y0, x1, y1]) => { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 - 3, (y0 + y1) / 2, x1, y1); g.stroke(); });
        // Piernas con rodilleras
        inkShape(g, [[27, 56], [32, 56], [31, 74], [26, 74]], INK.metalDark, rnd);
        inkShape(g, [[34, 56], [39, 56], [40, 74], [35, 74]], INK.metalDark, rnd);
        inkCircle(g, 29, 63, 2.2, INK.metal); inkCircle(g, 37, 63, 2.2, INK.metal);
        inkShape(g, [[24, 72], [32, 72], [32, 77], [22, 77]], INK.boot, rnd);
        inkShape(g, [[34, 72], [42, 72], [44, 77], [34, 77]], INK.boot, rnd);
        // Tabardo largo de tela y cinturón
        inkShape(g, [[27, 30], [39, 30], [41, 62], [36, 66], [30, 66], [25, 62]], c.cloth, rnd);
        inkHatch(g, 25, 52, 30, 66, 3);
        inkShape(g, [[27, 44], [40, 44], [40, 47], [27, 47]], INK.boot, rnd, { width: 1.3 });
        inkShape(g, [[32, 47], [34, 47], [33.5, 58], [32.5, 58]], c.dark, rnd, { width: 1 }); // colgante
        // Brazo izquierdo: guantelete con garras levantado
        inkShape(g, [[24, 32], [18, 40], [14, 46], [17, 48], [22, 42], [27, 36]], INK.metalDark, rnd);
        [[13, 46, 9, 44], [14, 48, 10, 50], [16, 49, 14, 53]].forEach(([x0, y0, x1, y1]) => inkShape(g, [[x0, y0], [x1, y1]], INK.line, rnd, { open: true, width: 1.8 }));
        // Brazo derecho con la espada larga, baja y en diagonal
        inkShape(g, [[38, 33], [45, 44], [42, 47], [36, 38]], INK.metalDark, rnd);
        inkSword(g, rnd, 43, 46, 62, 76);
        // Capucha que envuelve el yelmo, con punta caída
        inkShape(g, [[24, 30], [24, 17], [29, 9], [35, 7], [41, 12], [43, 22], [42, 31], [37, 33], [29, 33]], c.main, rnd);
        inkShape(g, [[28, 15], [38, 14], [39, 29], [27, 29]], INK.metal, rnd); // yelmo
        inkHatch(g, 27, 22, 31, 29, 2.5);
        inkShape(g, [[29, 21], [37, 20.5]], INK.line, rnd, { open: true, width: 2.6 }); // visera en cruz
        inkShape(g, [[33, 15.5], [33, 28]], INK.line, rnd, { open: true, width: 2.6 });
    },
    // Soldado: casco redondo, tabardo del color del creep, lanza
    footman(g, c, rnd) {
        inkLegs(g, rnd);
        inkShape(g, [[25, 30], [41, 30], [43, 60], [23, 60]], c.main, rnd);
        inkHatch(g, 23, 44, 30, 60);
        inkShape(g, [[24, 50], [42, 50], [42, 53], [24, 53]], c.dark, rnd, { width: 1.4 });
        inkCircle(g, 33, 21, 9, INK.metal);
        inkShape(g, [[27, 22], [39, 22]], INK.line, rnd, { open: true, width: 2.6 });
        inkShape(g, [[50, 6], [46, 76]], '#7a5c3c', rnd, { open: true, width: 3 }); // lanza
        inkShape(g, [[50, 2], [53, 10], [47, 10]], '#d8d4cc', rnd);
        inkShape(g, [[40, 36], [48, 40], [46, 44], [39, 41]], INK.metalDark, rnd);
    },
    // Arquero encapuchado con capa corta y arco
    archer(g, c, rnd) {
        inkCape(g, c.main, rnd, 0.7);
        inkLegs(g, rnd, '#5b4a3a');
        inkShape(g, [[28, 32], [38, 32], [39, 58], [27, 58]], c.cloth, rnd);
        inkCircle(g, 33, 21, 9, c.main);
        inkShape(g, [[29, 18], [37, 18], [37, 27], [29, 27]], INK.shadow, rnd);
        g.beginPath(); g.arc(44, 42, 16, -1.2, 1.2); g.strokeStyle = '#6b4f33'; g.lineWidth = 3.2; g.stroke(); // arco
        g.strokeStyle = INK.line; g.lineWidth = 1; g.beginPath(); g.moveTo(50.5, 27); g.lineTo(50.5, 57); g.stroke();
    },
    // Mago: sombrero en punta, túnica larga y bastón con orbe
    mage(g, c, rnd) {
        inkShape(g, [[26, 30], [40, 30], [48, 76], [18, 76]], c.main, rnd); // túnica
        inkHatch(g, 18, 56, 28, 76);
        inkShape(g, [[22, 66], [44, 66], [46, 72], [20, 72]], c.dark, rnd, { width: 1.4 });
        inkCircle(g, 33, 24, 7, '#d9b99b');
        inkShape(g, [[22, 20], [44, 20], [36, 2]], c.dark, rnd); // sombrero
        inkShape(g, [[49, 10], [47, 76]], '#6b4f33', rnd, { open: true, width: 3 });
        inkCircle(g, 49, 9, 5, c.glow);
    },
    // Bruto: ancho, hombreras grandes y garrote
    brute(g, c, rnd) {
        inkShape(g, [[24, 60], [31, 60], [30, 76], [22, 76]], INK.boot, rnd);
        inkShape(g, [[35, 60], [42, 60], [44, 76], [36, 76]], INK.boot, rnd);
        inkShape(g, [[17, 28], [49, 28], [46, 62], [20, 62]], c.main, rnd);
        inkHatch(g, 20, 44, 30, 62);
        inkCircle(g, 18, 30, 8, INK.metal); inkCircle(g, 48, 30, 8, INK.metal); // hombreras
        inkCircle(g, 33, 18, 9, INK.metalDark);
        inkShape(g, [[28, 19], [38, 19]], INK.line, rnd, { open: true, width: 2.6 });
        inkShape(g, [[50, 40], [60, 70]], '#6b4f33', rnd, { open: true, width: 6 }); // garrote
    },
    // Espectro: figura que flota, sin piernas
    wraith(g, c, rnd) {
        const hem = []; for (let x = 50; x >= 16; x -= 5) hem.push([x, 70 + ((x / 5) % 2 ? 5 : 0)]);
        inkShape(g, [[24, 24], [42, 24], [52, 44], ...hem, [14, 44]], c.main, rnd);
        inkCircle(g, 33, 22, 10, c.main);
        inkShape(g, [[28, 18], [38, 18], [38, 28], [28, 28]], INK.shadow, rnd);
        g.fillStyle = '#e9f5ff'; g.fillRect(29, 21, 2, 2); g.fillRect(35, 21, 2, 2);
    }
};

// Qué silueta usa cada unidad en Tower Chaos (null = se queda con el pixel art con contorno)
function inkPlanFor(u) {
    if (u.isHero) return 'hoodedKnight';
    if (u.isGuardian) return u.type && (u.type.key === 'LICH' || u.type.key === 'PHANTOM') ? 'wraith' : 'brute';
    const t = u.type;
    if (!t) return null;
    if (['SWARM', 'KAMIKAZE', 'CHUSMA'].includes(t.key)) return null;
    if (t.key === 'SPECTER') return 'wraith';
    if (['BRUTE', 'ARMORED', 'STUNNER'].includes(t.key)) return 'brute';
    if (t.attackType === 'magical' || ['SHAMAN', 'HEALER', 'WARLOCK', 'FROSTCASTER', 'DRUMMER'].includes(t.key)) return 'mage';
    if (t.range >= 2.5) return 'archer';
    return 'footman';
}

const inkCache = {};
function inkFigure(plan, color, glow) {
    const key = plan + color;
    if (inkCache[key]) return inkCache[key];
    const make = white => {
        const c = document.createElement('canvas'); c.width = INK_W; c.height = INK_H;
        const g = c.getContext('2d');
        let seed = [...key].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) % 2147483647, 7);
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        g.lineCap = 'round'; g.lineJoin = 'round';
        INK_PLANS[plan](g, { main: color, dark: shade(color, -0.35), cloth: INK.cloth, glow: glow || '#c77dff' }, rnd);
        if (white) { g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, INK_W, INK_H); }
        return c;
    };
    return (inkCache[key] = { img: make(false), white: make(true) });
}

// Color de la capa del aventurero: el del atributo de su arma (o gris sin arma), apagado.
function inkColorFor(u) {
    if (u.isHero) {
        const w = u.gear && u.gear.weapon;
        return inkMute(w ? ATTR_INFO[HERO_TEMPLATES[w.heroKey].primaryAttr].color : '#a33a3a', 0.25);
    }
    return inkMute(u.color || '#888888');
}

function inkScale(u) { return (u.isGuardian ? 2.1 : u.isBoss ? 1.5 : 1.15) * TILE / INK_W * 1.25; }
// Altura de la figura por encima del centro de la casilla (para ubicar la barra de vida arriba de la cabeza)
function inkHalfHeight(u) { return INK_H * inkScale(u) * 0.95 - TILE * 0.45 - 6; }

// Dibuja una unidad en estilo tinta. Devuelve false si no tiene figura (y se usa el pixel art).
function drawInkUnit(u, cx, cy, size, facing, flash, pose) {
    const plan = inkPlanFor(u);
    if (!plan) return false;
    const fig = inkFigure(plan, inkColorFor(u), u.color);
    const scale = inkScale(u);
    const w = INK_W * scale, h = INK_H * scale;
    ctx.save();
    ctx.translate(cx, cy + TILE * 0.45); // pies en la parte de abajo de la casilla
    if (pose) { ctx.rotate(pose.rot * (facing < 0 ? -1 : 1)); ctx.scale(pose.sx, pose.sy); }
    if (facing < 0) ctx.scale(-1, 1);
    ctx.fillStyle = 'rgba(29,23,18,0.28)'; // sombra en el piso
    ctx.beginPath(); ctx.ellipse(0, -2, w * 0.3, h * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(flash ? fig.white : fig.img, -w / 2, -h * 0.95, w, h);
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
