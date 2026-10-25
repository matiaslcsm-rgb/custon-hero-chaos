// Portada (2026-10-13): escena en pixel art animada detrás del nombre del juego y la elección de modo.
//
//   Atardecer violeta con estrellas y luna, montañas lejanas, el coliseo de Custom Hero (público, antorchas y
//   estandartes) y la torre de Infinite Tower, siniestra (ojo rojo que late, murciélagos, relámpagos), que se pierde entre las nubes (con
//   ventanas que titilan), colinas con pinos y un camino de tierra hacia la torre. Adelante, el aventurero junto a una
//   fogata, y cada tanto cruza una criatura del bestiario. Todo con los sprites de la Torre (towerPixel*.js).
//   La escena se dibuja en una imagen chica (1 píxel = 2 a 5 píxeles de la pantalla, según el alto) que el CSS agranda
//   sin suavizar. Lo fijo se arma una vez por tamaño; lo animado, en cada cuadro. Solo corre en el menú (body.on-title).

const TS = { sky: ['#140a24', '#24123a', '#3a1a46', '#5a2448', '#8a3448', '#d0704a'], stone: ['#0c0912', '#16101e', '#20182a', '#2a2036', '#3a2e48'],
    colo: ['#24181a', '#3a2826', '#54382e', '#6e4a3a', '#8c6048'] };
const tsCanvas = document.getElementById('title-canvas'), tsg = tsCanvas.getContext('2d');
let tsStatic = null, tsW = 0, tsH = 0, tsLast = 0, tsT = 0, tsWalkers = [], tsNextWalker = 2, tsParts = [], tsStars = [], tsClouds = [], tsWindows = [];
let tsColo = null, tsTower = null, tsBolt = null, tsNextBolt = 4;
const tsHero = { cape: '#a33a3a', hood: '#7a2a2a', trim: '#c9a227', glow: '#9ad1ff', weapon: 'sword' };

function tsBayer(x, y) { return PX_BAYER[(y & 3) * 4 + (x & 3)]; }
function tsRgb(h) { return hexRgb(h); }
// Lo fijo: cielo con tramado, luna, montañas, torre, colinas, camino y pasto
function tsBuild(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
    const hy = Math.round(h * 0.68), gy = Math.round(h * 0.8), sky = TS.sky.map(tsRgb);
    const put = (x, y, rgb) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const o = (y * w + x) * 4; d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { // cielo
        const f = Math.min(1, y / hy) * (sky.length - 1), lo = Math.floor(f);
        put(x, y, sky[Math.min(sky.length - 1, lo + (f - lo > tsBayer(x, y) ? 1 : 0))]);
    }
    // Luna
    const mx = Math.round(w * 0.18), my = Math.round(h * 0.2), mr = Math.max(7, Math.round(h * 0.05));
    for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) { const r2 = x * x + y * y; if (r2 <= mr * mr) put(mx + x, my + y, tsRgb(r2 > (mr - 1) * (mr - 1) ? '#d8c8b0' : (pxHash(x, y, 9) < 0.08 || (x + 3) * (x + 3) + (y + 2) * (y + 2) < 6) ? '#d0c0a8' : '#f2e6c8')); }
    // Montañas lejanas
    for (let x = 0; x < w; x++) { const top = hy - Math.round(10 + pxNoise(x / 40, 0, 3) * h * 0.14 + pxNoise(x / 12, 0, 4) * 5); for (let y = top; y < hy + 4; y++) put(x, y, tsRgb(y === top ? '#4a2a52' : '#2a1838')); }
    // El coliseo (Custom Hero): tres pisos de arcos, la punta derecha en ruinas, antorchas en los arcos de abajo
    const ccx = Math.round(w * 0.2), ccw = Math.round(w * 0.25), cch = Math.round(h * 0.17), ccb = hy + 9, tierH = Math.max(6, Math.round(cch / 3));
    const colo = TS.colo.map(tsRgb), crowd = [];
    const coloTop = x => { const nx = x / (ccw / 2); let t = ccb - Math.round(cch * Math.min(1, Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(nx), 5))) * 1.04)); if (nx > 0.35) t += Math.round(tierH * 1.4 * pxNoise(x / 3, 1, 12) * Math.min(1, (nx - 0.35) * 3)); return t; };
    for (let x = -Math.floor(ccw / 2); x <= Math.floor(ccw / 2); x++) {
        const nx = x / (ccw / 2), top = coloTop(x);
        for (let y = top; y < ccb; y++) {
            const ty = ccb - 1 - y, tier = Math.floor(ty / tierH), local = ty % tierH, col = ((x % 5) + 5) % 5;
            let c = colo[nx < -0.45 ? 3 : nx > 0.6 ? 1 : 2];
            if (y === top) c = colo[4];
            else if (local === tierH - 1) c = colo[4]; // cornisa de cada piso
            else if (local === tierH - 2) c = colo[0];
            else if (col >= 1 && col <= 3 && local >= 1 && local <= tierH - 3 && !(local === tierH - 3 && col !== 2) && Math.abs(nx) < 0.93) { // arco
                const lit = tier === 0 && pxHash(Math.floor((x + 1000) / 5), 0, 21) < 0.45;
                c = tsRgb(lit ? (local < 2 ? '#e0803a' : '#a04a26') : '#120a0c');
                if (tier === 2 && local >= 1 && local <= 2) crowd.push([ccx + x, y]);
            }
            put(ccx + x, y, c);
        }
    }
    tsColo = { cx: ccx, w: ccw, h: cch, base: ccb, top: coloTop, crowd };
    // La torre (se angosta hacia arriba; luz de la luna a la izquierda)
    const tx = Math.round(w * 0.66), base = hy + 8, top = -10;
    tsWindows = []; tsTower = { x: tx, base, eyeY: Math.round(h * 0.17) };
    for (let y = top; y < base; y++) {
        const k = (y - top) / (base - top), half = Math.round(7 + k * 6), band = (y - top) % 38 < 3;
        if ((y - top) % 38 === 0) for (let s = -half - 3; s <= half + 3; s += 3) { put(tx + s, y - 1, tsRgb(TS.stone[1])); put(tx + s, y - 2, tsRgb(TS.stone[0])); } // púas en cada anillo
        for (let x = -half - (band ? 2 : 0); x <= half + (band ? 2 : 0); x++) {
            const row = Math.floor((y - top) / 3), brick = (x + half + (row % 2) * 2) % 5 === 0 || (y - top) % 3 === 0;
            const shadeI = x < -half + 2 ? 4 : x > half - 3 ? 0 : x < 0 ? 3 : 2;
            put(tx + x, y, tsRgb(TS.stone[Math.max(0, shadeI - (brick ? 1 : 0))]));
        }
        if ((y - top) % 16 === 8 && y > 0) tsWindows.push({ x: tx + ((y >> 4) % 2 ? -3 : 2), y, ph: pxHash(y, 1, 5) * 6 });
    }
    // Colinas cercanas con pinos y el camino a la torre
    const hill = x => hy + Math.round(h * 0.05 + pxNoise(x / 30, 2, 6) * h * 0.06);
    for (let x = 0; x < w; x++) for (let y = hill(x); y < gy; y++) put(x, y, tsRgb(y === hill(x) ? '#2e3a2c' : '#1c2620'));
    for (let i = 0; i < w / 7; i++) { const px = Math.round(pxHash(i, 3, 7) * w), py = hill(px) + 2, ph = 6 + Math.round(pxHash(i, 4, 7) * 8);
        if (Math.abs(px - tx) < 16) continue;
        for (let y = 0; y < ph; y++) { const hw = Math.round(y * 0.45); for (let x = -hw; x <= hw; x++) put(px + x, py - ph + y, tsRgb(x < 0 ? '#16201a' : '#101814')); } }
    const grass = PX_BIOME.forest.ground.map(c2 => tsRgb(shade(c2, -0.42)));
    const pathX = y => tx + (Math.round(w * 0.47) - tx) * Math.pow((y - hy) / (h - hy), 1.2), pathW = y => 2 + (y - hy) / (h - hy) * 18;
    for (let y = hy + 4; y < h; y++) for (let x = 0; x < w; x++) {
        const onPath = Math.abs(x - pathX(y)) < pathW(y) + (pxNoise(x / 3, y / 3, 8) - 0.5) * 3;
        if (y < gy && !onPath) continue;
        if (onPath) { put(x, y, tsRgb(pxNoise(x / 4, y / 4, 2) > 0.55 ? '#3e3024' : '#33281e')); continue; }
        const v = Math.floor(pxNoise(x / 18, y / 9, 1) * 3 + (pxHash(x, y, 4) - 0.5) * 0.9);
        put(x, y, grass[Math.max(0, Math.min(3, v))]);
        if (pxHash(x, y, 11) < 0.02) { put(x, y - 1, tsRgb('#3c5a2a')); put(x - 1, y - 2, tsRgb('#4a6a32')); }
    }
    g.putImageData(img, 0, 0);
    // Estrellas, nubes
    tsStars = []; for (let i = 0; i < w * h / 220; i++) { const x = Math.round(pxHash(i, 1, 13) * w), y = Math.round(pxHash(i, 2, 13) * hy * 0.75); if (Math.hypot(x - mx, y - my) > mr + 3) tsStars.push({ x, y, ph: pxHash(i, 3, 13) * 6 }); }
    tsClouds = [0, 1, 2, 3, 4, 5].map(i => ({ img: tsCloud(28 + i * 7, 7 + (i % 3) * 3, i), x: pxHash(i, 5, 2) * w, y: Math.round(h * (0.04 + (i % 3) * 0.06)), v: 1.2 + (i % 3) * 0.9 }));
    tsClouds.push({ img: tsCloud(Math.round(w * 0.36), 16, 9, ['#1a1020', '#2a1830', '#3a2040', '#4a2848', '#8a2a3a']), x: tx - w * 0.18, y: Math.round(h * 0.07), v: 0.35, bank: true }); // el banco que tapa la punta de la torre (con el rojo del ojo abajo)
    return c;
}
function tsCloud(cw, ch, seed, pal = ['#3a2a4a', '#4a3a5e', '#5a4870', '#6e5a80', '#a0607a']) {
    return pxSprite(cw, ch, S => {
        const r = pxSeeded(77 + seed * 31), n = Math.max(3, Math.round(cw / 8));
        for (let i = 0; i < n; i++) { const x = cw * (0.12 + 0.76 * i / (n - 1)), y = ch * (0.55 - 0.25 * Math.sin(i / (n - 1) * Math.PI)); S.ball(x, y, cw / n * 0.9 + r() * 2, ch * 0.42, pal, () => 0.5); }
    });
}
// Lo animado
function tsFrame(now) {
    requestAnimationFrame(tsFrame);
    if (!document.body.classList.contains('on-title')) { tsLast = now; return; }
    const dt = Math.min(0.1, (now - tsLast) / 1000 || 0); tsLast = now; tsT += dt;
    const s = Math.max(2, Math.round(window.innerHeight / 210)), w = Math.ceil(window.innerWidth / s), h = Math.ceil(window.innerHeight / s);
    if (w !== tsW || h !== tsH || !tsStatic) { tsW = w; tsH = h; tsCanvas.width = w; tsCanvas.height = h; tsStatic = tsBuild(w, h); }
    const g = tsg; g.imageSmoothingEnabled = false;
    g.drawImage(tsStatic, 0, 0);
    tsStars.forEach(st => { const a = 0.5 + 0.5 * Math.sin(tsT * 2 + st.ph); if (a > 0.35) { g.fillStyle = a > 0.85 ? '#ffffff' : '#c8b8e0'; g.fillRect(st.x, st.y, 1, 1); } });
    tsWindows.forEach(wn => { const f = Math.sin(tsT * 2.3 + wn.ph) + Math.sin(tsT * 7.1 + wn.ph * 3) * 0.4 > -0.5; g.fillStyle = f ? '#ff3a2a' : '#6a1010'; g.fillRect(wn.x, wn.y, 1, 2); if (f) { g.fillStyle = 'rgba(255,40,30,0.25)'; g.fillRect(wn.x - 1, wn.y - 1, 3, 4); } });
    tsDrawColoseum(g);
    tsClouds.forEach(cl => { cl.x += cl.v * dt; if (!cl.bank && cl.x > w + 10) cl.x = -cl.img.width - 10; if (cl.bank && cl.x > w * 0.66 - w * 0.12) cl.v = -Math.abs(cl.v); if (cl.bank && cl.x < w * 0.66 - w * 0.24) cl.v = Math.abs(cl.v); g.drawImage(cl.img, Math.round(cl.x), cl.y); });
    tsDrawSinister(g, w, h, dt);
    // Fogata, su luz con tramado y el héroe
    const gy = Math.round(h * 0.8) + 16, fx = Math.round(w * 0.17), hx = Math.round(w * 0.22);
    for (let y = -14; y <= 8; y++) for (let x = -22; x <= 22; x++) { const d = Math.hypot(x, y * 1.8) / 22; if (d < 1 && (1 - d) * 0.55 > tsBayer(fx + x, gy + y)) { g.fillStyle = 'rgba(255,150,70,0.22)'; g.fillRect(fx + x, gy + y - 2, 1, 1); } }
    const camp = pxCampfire(), flame = pxFlame(Math.floor(tsT * 9) % 3, true);
    g.drawImage(camp, fx - 9, gy - 9); g.drawImage(flame, fx - 5, gy - 18);
    const hero = pxbHeroFrame(tsHero, 'idle', Math.floor(tsT / 0.7) % 2).img;
    g.drawImage(hero, hx - hero.width / 2, gy - hero.height + 1);
    // Brasas
    if (Math.random() < dt * 8) tsParts.push({ x: fx + (Math.random() - 0.5) * 4, y: gy - 14, vx: (Math.random() - 0.5) * 4, vy: -8 - Math.random() * 8, life: 1.5 + Math.random() });
    tsParts = tsParts.filter(p => (p.life -= dt) > 0);
    tsParts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; g.fillStyle = p.life > 1 ? '#ffd166' : '#ff7a1a'; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); });
    // Criaturas que cruzan
    if ((tsNextWalker -= dt) <= 0) {
        tsNextWalker = 7 + Math.random() * 7;
        const body = pickRandom(['wolf', 'boar', 'lizard', 'toad', 'chusma', 'footman', 'golem', 'wraith', 'scorpion']), biome = pickRandom(Object.keys(BEAST_PALETTES));
        tsWalkers.push({ body, color: pickRandom(BEAST_PALETTES[biome]), x: w + 20, y: gy + 8 + Math.round(Math.random() * 6), v: 14 + Math.random() * 10 });
    }
    tsWalkers = tsWalkers.filter(c => c.x > -40);
    tsWalkers.forEach(c => {
        c.x -= c.v * dt;
        const fr = pxbFrame(c.body, c.color, [], 'walk', Math.floor(tsT * 7) % 4).img;
        g.save(); g.translate(Math.round(c.x), 0); g.scale(-1, 1); g.drawImage(fr, -fr.width / 2, c.y - fr.height); g.restore();
    });
}
// El coliseo vivo: resplandor de la arena por encima, el público que titila en el piso de arriba y estandartes al viento
function tsDrawColoseum(g) {
    const C = tsColo; if (!C) return;
    const topY = C.top(0), fl = 0.8 + 0.2 * Math.sin(tsT * 5) * Math.sin(tsT * 1.7);
    for (let y = -Math.round(C.h * 0.55); y <= 2; y++) for (let x = -Math.round(C.w * 0.42); x <= Math.round(C.w * 0.42); x++) {
        const d = Math.hypot(x / (C.w * 0.42), y / (C.h * 0.55));
        if (d < 1 && (1 - d) * 0.6 * fl > tsBayer(C.cx + x, topY + y)) { g.fillStyle = 'rgba(255,150,60,0.16)'; g.fillRect(C.cx + x, topY + y, 1, 1); }
    }
    C.crowd.forEach(([x, y], i) => { const k = pxHash(i, Math.floor(tsT * 4), 3); if (k < 0.35) { g.fillStyle = ['#e8c8a0', '#c8402e', '#e8c060', '#7fb0ff'][Math.floor(k * 11) % 4]; g.fillRect(x, y, 1, 1); } });
    [-0.36, -0.12, 0.12].forEach((fx, i) => {
        const x = C.cx + Math.round(fx * C.w), y = C.top(x - C.cx), wave = Math.floor(tsT * 4 + i) % 2;
        g.fillStyle = '#2a1c18'; g.fillRect(x, y - 8, 1, 8);
        g.fillStyle = i % 2 ? '#e8c060' : '#c8402e'; g.fillRect(x + 1, y - 8, 3, 3); g.fillRect(x + 1, y - 5, 2 + wave, 1);
    });
}
// La torre siniestra: el ojo rojo que late y parpadea, murciélagos, la puerta encendida y relámpagos
function tsDrawSinister(g, w, h, dt) {
    const T = tsTower; if (!T) return;
    // Puerta con luz roja
    g.fillStyle = '#1a0606'; g.fillRect(T.x - 3, T.base - 9, 6, 9);
    for (let y = -10; y <= 2; y++) for (let x = -10; x <= 10; x++) { const d = Math.hypot(x / 10, y / 10); if (d < 1 && (1 - d) * (0.6 + 0.2 * Math.sin(tsT * 3)) > tsBayer(T.x + x, T.base + y)) { g.fillStyle = 'rgba(255,40,30,0.3)'; g.fillRect(T.x + x, T.base - 4 + y, 1, 1); } }
    g.fillStyle = '#ff3a2a'; g.fillRect(T.x - 1, T.base - 6, 2, 3);
    // El ojo
    const pulse = 0.5 + 0.5 * Math.sin(tsT * 2), blink = (tsT % 7) < 0.18, ey = T.eyeY;
    for (let y = -9; y <= 9; y++) for (let x = -14; x <= 14; x++) { const d = Math.hypot(x / 14, y / 9); if (d < 1 && (1 - d) * (0.35 + 0.35 * pulse) > tsBayer(T.x + x, ey + y)) { g.fillStyle = 'rgba(255,30,30,0.35)'; g.fillRect(T.x + x, ey + y, 1, 1); } }
    if (blink) { g.fillStyle = '#5a0a0a'; g.fillRect(T.x - 5, ey, 11, 1); }
    else {
        for (let y = -3; y <= 3; y++) for (let x = -6; x <= 6; x++) { const d = (x * x) / 36 + (y * y) / 9; if (d <= 1) { g.fillStyle = d > 0.6 ? '#7a0c0c' : d > 0.25 ? '#e0281e' : '#ff7a3a'; g.fillRect(T.x + x, ey + y, 1, 1); } }
        const look = Math.round(Math.sin(tsT * 0.5) * 2);
        g.fillStyle = '#100000'; g.fillRect(T.x + look, ey - 2, 1, 5); g.fillStyle = '#fff0c0'; g.fillRect(T.x + look - 2, ey - 2, 1, 1);
    }
    // Murciélagos dando vueltas
    for (let i = 0; i < 7; i++) {
        const a = tsT * (0.5 + i * 0.07) + i * 0.9, R = 14 + i * 3, bx = Math.round(T.x + Math.cos(a) * R), by = Math.round(T.eyeY + 12 + i * 5 + Math.sin(a) * R * 0.3), up = Math.floor(tsT * 9 + i) % 2;
        g.fillStyle = '#07040a'; g.fillRect(bx, by, 1, 1); g.fillRect(bx - 1, by - 1 + up * 2, 1, 1); g.fillRect(bx + 1, by - 1 + up * 2, 1, 1); g.fillRect(bx - 2, by - 1, 1, 1); g.fillRect(bx + 2, by - 1, 1, 1);
    }
    // Relámpagos
    if ((tsNextBolt -= dt) <= 0) {
        tsNextBolt = 5 + Math.random() * 7;
        const pts = [[T.x + Math.round((Math.random() - 0.5) * w * 0.2), 0]];
        while (pts[pts.length - 1][1] < T.eyeY - 6) { const [px, py] = pts[pts.length - 1]; pts.push([px + Math.round((Math.random() - 0.5) * 8 + (T.x - px) * 0.25), py + 3 + Math.round(Math.random() * 4)]); }
        tsBolt = { pts, until: tsT + 0.35 };
    }
    if (tsBolt && tsT < tsBolt.until) {
        const k = tsBolt.until - tsT, on = k > 0.22 || (k > 0.08 && k < 0.14);
        if (on) {
            g.fillStyle = 'rgba(200,180,255,0.16)'; g.fillRect(0, 0, w, h);
            g.fillStyle = '#efe8ff';
            for (let i = 1; i < tsBolt.pts.length; i++) { const [x0, y0] = tsBolt.pts[i - 1], [x1, y1] = tsBolt.pts[i], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let s = 0; s <= n; s++) g.fillRect(Math.round(x0 + (x1 - x0) * s / n), Math.round(y0 + (y1 - y0) * s / n), 1, 1); }
        }
    }
}
// Los dibujitos de las tarjetas de modo
function tsCardArt() {
    const img = (src, scale) => `<img src="${src.toDataURL()}" style="width:${src.width * scale}px;height:${src.height * scale}px">`;
    const heroes = ['AXE', 'ASSASSIN', 'ZEUS', 'FROSTWITCH'].map(k => spriteFor({ isHero: true, key: k })).filter(Boolean);
    document.getElementById('ts-art-normal').innerHTML = heroes.map(s => img(s.img, 1.6)).join('');
    document.getElementById('ts-art-tower').innerHTML = img(pxbHeroFrame(tsHero, 'idle', 0).img, 2.2) + img(pxbFrame('wolf', '#8d8d8d', [], 'idle', 0).img, 2) + img(pxbFrame('boss:volcano', '#d00000', [], 'idle', 0).img, 1.4);
}
tsCardArt();
requestAnimationFrame(tsFrame);

// --- MENÚ PREVIO DE CADA MODO (2026-10-13) ---
// Tocar una tarjeta abre su menú: de qué se trata, cómo es una partida, Jugar, su Tutorial y lo propio del modo
// (glosario en Custom Hero; estilo visual y bestiario guardado en Infinite Tower). La primera vez viene marcado
// "ver el tutorial antes de jugar": al terminarlo con "¡A jugar!", arranca la partida.
const tsImg = (c, s) => `<img src="${c.toDataURL()}" style="width:${c.width * s}px;height:${c.height * s}px">`;
const TS_LOBBY = {
    normal: { title: '⚔ Custom Hero', tag: 'arena · 8 héroes', cls: '',
        desc: 'Sos uno de 8 héroes en un coliseo. Armás tu kit mezclando habilidades de cualquier héroe, peleás oleadas, duelos y jefes, y gana el último en pie.',
        facts: () => ['🎲 Elegís entre 3 héroes (o cualquiera, arrancando sin oro)', '🃏 Rondas 1 a 4: draft de habilidad, tienda y oleada', '⚔ Desde la ronda 5: un duelo por ronda, con apuestas', '👑 Rondas 5, 10, 15 y 20: un jefe para cada uno', '♥ 2 vidas: se pierden contra creeps y jefes'],
        art: () => ['AXE', 'VAMPIRE', 'SNIPER', 'ZEUS', 'NECROMANCER'].map(k => spriteFor({ isHero: true, key: k })).filter(Boolean).map(s => tsImg(s.img, 2.2)).join(''),
        extra: () => [['🦸 Héroes', () => openGlossary('heroes')], ['👹 Creeps y jefes', () => openGlossary('creeps')], ['🎒 Ítems', () => openGlossary('items')]] },
    tower: { title: '🗼 Infinite Tower', tag: 'roguelike · 10 pisos', cls: 'tower',
        desc: 'Despertás al pie de una torre sin nada. Cada piso es un bioma con su pueblo, su laberinto y su guardián. Tu clase la arma el equipo que encontrás.',
        facts: () => ['🗡 Arrancás eligiendo espada, arco o bastón', '🌲 5 biomas, dos pisos cada uno, con día y noche', '🎒 Cada pieza de equipo trae una habilidad', '🦴 Morir no es el final: tus restos te esperan', `📖 Bestiario guardado: ${typeof bestiaryStore !== 'undefined' ? Object.keys(bestiaryStore.beasts || {}).length : 0} criaturas vistas`],
        art: () => tsImg(pxbHeroFrame(tsHero, 'idle', 0).img, 3) + tsImg(pxbFrame('wolf', '#8d8d8d', ['horns'], 'idle', 0).img, 3) + tsImg(pxbFrame('boss:volcano', '#d00000', [], 'idle', 0).img, 2),
        extra: () => [['🧗 Torre 2D (prototipo)', () => { location.href = 'torre2d.html'; }]] } // la Torre de costado (js/tower2d.js)
};
let tsLobbyMode = null;
function openLobby(mode) {
    const L = TS_LOBBY[mode], box = document.getElementById('ts-lobby'), first = !tutorialSeen(mode);
    tsLobbyMode = mode;
    box.className = 'ts-lobby ' + L.cls;
    box.innerHTML = `<div class="ts-lobby-art">${L.art()}</div>
        <h2>${L.title}</h2><em>${L.tag}</em><p class="ts-lobby-desc">${L.desc}</p>
        <ul class="ts-facts">${L.facts().map(f => `<li>${f}</li>`).join('')}</ul>
        ${mode === 'tower' && towerRecordsSummary() ? `<div class="ts-records">${towerRecordsSummary()}</div>` : ''}
        ${mode !== 'tower' && chProfileSummary() ? `<div class="ts-records">${chProfileSummary()}<br><small>Mejor puesto: ${chProfileHeroesHtml()}</small></div>` : ''}
        ${mode === 'tower' && towerSaveSummary() ? `<div class="ts-continue"><button class="ts-cont">▶ Continuar</button><small>${towerSaveSummary()}</small></div>` : ''}
        <div class="ts-lobby-actions"><button class="ts-play">${mode === 'tower' && towerSaveSummary() ? '✦ Nueva run' : '▶ Jugar'}</button><button class="ts-tut secondary-btn">📖 Tutorial</button>
            ${L.extra().map((x, i) => `<button class="secondary-btn" data-extra="${i}">${x[0]}</button>`).join('')}</div>
        <label class="ts-first"><input type="checkbox" id="ts-tut-first"${first ? ' checked' : ''}> Ver el tutorial antes de jugar</label>
        <button class="ts-back secondary-btn">← Volver</button>`;
    box.querySelector('.ts-play').onclick = () => lobbyPlay(mode);
    const cont = box.querySelector('.ts-cont');
    if (cont) cont.onclick = () => { closeLobby(); gameMode = 'tower'; continueTowerRun(); }; // towerSave.js
    box.querySelector('.ts-tut').onclick = () => openTutorial(0, mode);
    box.querySelector('.ts-back').onclick = closeLobby;
    const extras = L.extra();
    box.querySelectorAll('[data-extra]').forEach(b => { b.onclick = () => extras[Number(b.dataset.extra)][1](); });
    document.getElementById('title-screen').classList.add('lobby-open');
}
function closeLobby() { tsLobbyMode = null; document.getElementById('title-screen').classList.remove('lobby-open'); }
function lobbyPlay(mode) {
    if (mode === 'tower' && towerSaveSummary() && !confirm('Hay una run guardada. ¿Empezar una nueva? La guardada se pierde.')) return;
    if (mode === 'tower') clearTowerSave();
    const start = () => { closeLobby(); gameMode = mode; if (mode === 'tower') startTowerRun(); else startHeroPick(); };
    const cb = document.getElementById('ts-tut-first');
    if (cb && cb.checked) openTutorial(0, mode, start); else start();
}
document.querySelectorAll('[data-lobby]').forEach(card => { card.onclick = () => openLobby(card.dataset.lobby); });
window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && tsLobbyMode && document.body.classList.contains('on-title') && document.getElementById('tutorial').style.display !== 'flex') closeLobby();
});
