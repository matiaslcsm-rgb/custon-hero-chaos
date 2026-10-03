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
    const pts = [[x, y], [x - 10 * dir, y + 4 + rnd() * 4], [x - 18 * dir, y - 2 + rnd() * 6], [x - 26 * dir, y + 6]];
    const path = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]); };
    path(); g.stroke(); g.strokeStyle = color; g.lineWidth = 3.6; path(); g.stroke();
}

// --- Partes ---
function inkLegs(g, rnd, color = INK.metalDark, top = 66) {
    inkShape(g, [[27, top], [32, top], [31, FOOT - 2], [26, FOOT - 2]], color, rnd);
    inkShape(g, [[34, top], [39, top], [40, FOOT - 2], [35, FOOT - 2]], color, rnd);
    inkShape(g, [[24, FOOT - 4], [32, FOOT - 4], [32, FOOT + 1], [22, FOOT + 1]], INK.boot, rnd);
    inkShape(g, [[34, FOOT - 4], [42, FOOT - 4], [44, FOOT + 1], [34, FOOT + 1]], INK.boot, rnd);
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
    const hem = []; for (let x = 58; x >= 6; x -= 4) hem.push([x, FOOT + (Math.round(x / 4) % 2 ? 1.5 : -1.5)]);
    inkShape(g, [[23, 30], [43, 28], [52, 48], [58, 80], ...hem, [8, 76], [14, 48]], c.main, rnd, { pattern });
    inkShape(g, [[43, 32], [52, 50], [57, 80], [58, FOOT], [46, FOOT], [44, 60]], c.dark, rnd, { width: 1.6 });
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
        inkShape(g, [[24, 38], [18, 47], [14, 54], [17, 56], [22, 49], [27, 42]], INK.metalDark, rnd); // guantelete con garras
        [[13, 54, 9, 52], [14, 56, 10, 58], [16, 57, 14, 61]].forEach(([x0, y0, x1, y1]) => inkShape(g, [[x0, y0], [x1, y1]], INK.line, rnd, { open: true, width: 1.8 }));
        inkShape(g, [[38, 39], [45, 51], [42, 54], [36, 44]], INK.metalDark, rnd);
        inkWeapon(g, rnd, c.weapon);
        inkHood(g, rnd, c.hood || c.main);
    },
    // Soldado: casco con visera, tabardo de rombos y lanza
    footman(g, c, rnd) {
        inkLegs(g, rnd);
        inkShape(g, [[25, 36], [41, 36], [43, 72], [23, 72]], c.main, rnd, { pattern: INK_PATTERNS.diamonds(c.main, c.dark) });
        inkShape(g, [[24, 58], [42, 58], [42, 61], [24, 61]], INK.boot, rnd, { width: 1.4 });
        inkCircle(g, 33, 26, 8, INK.metal);
        inkShape(g, [[27, 27], [39, 27]], INK.line, rnd, { open: true, width: 2.6 });
        inkShape(g, [[40, 42], [48, 46], [46, 50], [39, 47]], INK.metalDark, rnd);
        inkWeapon(g, rnd, 'spear');
    },
    // Arquero encapuchado con bufanda al viento y arco
    archer(g, c, rnd) {
        inkCape(g, c, rnd);
        inkLegs(g, rnd, '#5b4a3a');
        inkShape(g, [[28, 36], [38, 36], [39, 70], [27, 70]], c.cloth, rnd, { pattern: INK_PATTERNS.stripes(c.cloth, 'rgba(29,23,18,0.18)') });
        inkRibbon(g, 26, 38, c.accent, rnd);
        inkHood(g, rnd, c.main, INK.shadow, false);
        g.beginPath(); g.arc(44, 54, 18, -1.2, 1.2); g.strokeStyle = '#6b4f33'; g.lineWidth = 3.2; g.stroke();
        g.strokeStyle = INK.line; g.lineWidth = 1; g.beginPath(); g.moveTo(50.5, 37); g.lineTo(50.5, 71); g.stroke();
    },
    // Mago: sombrero de ala ancha en punta y túnica larga con guardas en zigzag
    mage(g, c, rnd) {
        inkShape(g, [[25, 36], [41, 36], [52, FOOT], [14, FOOT]], c.main, rnd, { pattern: INK_PATTERNS.zigzag(c.main, c.accent) });
        inkHatch(g, 14, 72, 24, FOOT, 3);
        inkBorder(g, 15, 51, FOOT - 2, c.accent);
        inkShape(g, [[24, 38], [16, 56], [20, 58], [27, 44]], c.dark, rnd); // manga
        inkShape(g, [[28, 26], [38, 26], [38, 36], [28, 36]], INK.shadow, rnd); // cara en sombra
        g.fillStyle = '#f3e7c9'; g.fillRect(30, 30, 2, 2); g.fillRect(35, 30, 2, 2);
        inkShape(g, [[14, 26], [52, 26], [46, 22], [20, 22]], c.dark, rnd); // ala del sombrero
        inkShape(g, [[22, 23], [44, 23], [36, 4]], c.dark, rnd);
        inkWeapon(g, rnd, 'staff');
    },
    // Bruto: ancho, hombreras, falda de rombos y garrote
    brute(g, c, rnd) {
        inkShape(g, [[24, 74], [31, 74], [30, FOOT], [22, FOOT]], INK.boot, rnd);
        inkShape(g, [[35, 74], [42, 74], [44, FOOT], [36, FOOT]], INK.boot, rnd);
        inkShape(g, [[18, 58], [48, 58], [52, 80], [14, 80]], c.accent, rnd, { pattern: INK_PATTERNS.diamonds(c.accent, c.dark) });
        inkShape(g, [[17, 32], [49, 32], [46, 62], [20, 62]], c.main, rnd);
        inkHatch(g, 20, 48, 30, 62);
        inkCircle(g, 18, 34, 8, INK.metal); inkCircle(g, 48, 34, 8, INK.metal);
        inkCircle(g, 33, 22, 9, INK.metalDark);
        inkShape(g, [[28, 23], [38, 23]], INK.line, rnd, { open: true, width: 2.6 });
        inkShape(g, [[50, 46], [60, 86]], '#6b4f33', rnd, { open: true, width: 6 });
    },
    // Espectro: túnica que flota, cintas al viento y dos espadas flotando
    wraith(g, c, rnd) {
        const hem = []; for (let x = 50; x >= 16; x -= 5) hem.push([x, 82 + ((x / 5) % 2 ? 6 : 0)]);
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
        inkShape(g, [[18, 54], [10, 58]], '#9fd3e6', rnd, { open: true, width: 4 }); // frasco
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
        const gear = u.gear || {}, col = item => item ? ATTR_INFO[HERO_TEMPLATES[item.heroKey].primaryAttr].color : null;
        const main = muted(col(gear.armor) || col(gear.weapon) || '#a33a3a');
        const w = gear.weapon ? HERO_WEAPONS[gear.weapon.heroKey].shape : 'sword';
        return { main, hood: gear.helm ? muted(col(gear.helm)) : main, accent: muted(col(gear.boots) || '#c9a227'), weapon: w };
    }
    const main = inkMute(u.color || '#888888');
    return { main, accent: inkMute(shade(u.color || '#888888', 0.35), 0.4) };
}

const inkCache = {};
function inkFigure(plan, look) {
    const key = plan + JSON.stringify(look);
    if (inkCache[key]) return inkCache[key];
    const make = white => {
        const c = document.createElement('canvas'); c.width = INK_W; c.height = INK_H;
        const g = c.getContext('2d');
        let seed = [...plan].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) % 2147483647, 7);
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        g.lineCap = 'round'; g.lineJoin = 'round';
        INK_PLANS[plan](g, { dark: shade(look.main, -0.35), cloth: INK.cloth, accent: look.accent || '#c9a227', ...look }, rnd);
        if (white) { g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, INK_W, INK_H); }
        return c;
    };
    return (inkCache[key] = { img: make(false), white: make(true) });
}

function inkScale(u) { return (u.isGuardian ? 2.0 : u.isBoss ? 1.45 : 1.1) * TILE / INK_W * 1.3; }
// Altura de la figura por encima del centro de la casilla (para ubicar la barra de vida arriba de la cabeza)
function inkHalfHeight(u) { return INK_H * inkScale(u) * 0.86 - TILE * 0.45 - 4; }

// Dibuja una unidad en estilo tinta. Devuelve false si no tiene figura (y se usa el pixel art).
function drawInkUnit(u, cx, cy, size, facing, flash, pose) {
    const plan = inkPlanFor(u);
    if (!plan) return false;
    const fig = inkFigure(plan, inkLookFor(u));
    const scale = inkScale(u);
    const w = INK_W * scale, h = INK_H * scale;
    ctx.save();
    ctx.translate(cx, cy + TILE * 0.45); // pies en la parte de abajo de la casilla
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
