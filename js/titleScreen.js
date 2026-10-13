// Portada (2026-10-13): escena en pixel art animada detrás del nombre del juego y la elección de modo.
//
//   Atardecer violeta con estrellas y luna, montañas lejanas, la torre de Tower Chaos que se pierde entre las nubes (con
//   ventanas que titilan), colinas con pinos y un camino de tierra hacia la torre. Adelante, el aventurero junto a una
//   fogata, y cada tanto cruza una criatura del bestiario. Todo con los sprites de la Torre (towerPixel*.js).
//   La escena se dibuja en una imagen chica (1 píxel = 2 a 5 píxeles de la pantalla, según el alto) que el CSS agranda
//   sin suavizar. Lo fijo se arma una vez por tamaño; lo animado, en cada cuadro. Solo corre en el menú (body.on-title).

const TS = { sky: ['#140a24', '#24123a', '#3a1a46', '#5a2448', '#8a3448', '#d0704a'], stone: ['#1a1426', '#2a2238', '#3a3048', '#4a3e5a', '#5e5272'] };
const tsCanvas = document.getElementById('title-canvas'), tsg = tsCanvas.getContext('2d');
let tsStatic = null, tsW = 0, tsH = 0, tsLast = 0, tsT = 0, tsWalkers = [], tsNextWalker = 2, tsParts = [], tsStars = [], tsClouds = [], tsWindows = [];
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
    // La torre (se angosta hacia arriba; luz de la luna a la izquierda)
    const tx = Math.round(w * 0.66), base = hy + 8, top = -10;
    tsWindows = [];
    for (let y = top; y < base; y++) {
        const k = (y - top) / (base - top), half = Math.round(7 + k * 6), band = (y - top) % 38 < 3;
        for (let x = -half - (band ? 1 : 0); x <= half + (band ? 1 : 0); x++) {
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
    tsClouds.push({ img: tsCloud(Math.round(w * 0.36), 16, 9), x: tx - w * 0.18, y: Math.round(h * 0.07), v: 0.35, bank: true }); // el banco que tapa la punta de la torre
    return c;
}
function tsCloud(cw, ch, seed) {
    return pxSprite(cw, ch, S => {
        const r = pxSeeded(77 + seed * 31), n = Math.max(3, Math.round(cw / 8));
        for (let i = 0; i < n; i++) { const x = cw * (0.12 + 0.76 * i / (n - 1)), y = ch * (0.55 - 0.25 * Math.sin(i / (n - 1) * Math.PI)); S.ball(x, y, cw / n * 0.9 + r() * 2, ch * 0.42, ['#3a2a4a', '#4a3a5e', '#5a4870', '#6e5a80', '#a0607a'], () => 0.5); }
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
    tsWindows.forEach(wn => { const f = Math.sin(tsT * 3 + wn.ph) > -0.6; g.fillStyle = f ? '#ffd166' : '#a8602a'; g.fillRect(wn.x, wn.y, 1, 2); });
    tsClouds.forEach(cl => { cl.x += cl.v * dt; if (!cl.bank && cl.x > w + 10) cl.x = -cl.img.width - 10; if (cl.bank && cl.x > w * 0.66 - w * 0.12) cl.v = -Math.abs(cl.v); if (cl.bank && cl.x < w * 0.66 - w * 0.24) cl.v = Math.abs(cl.v); g.drawImage(cl.img, Math.round(cl.x), cl.y); });
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
// Los dibujitos de las tarjetas de modo
function tsCardArt() {
    const img = (src, scale) => `<img src="${src.toDataURL()}" style="width:${src.width * scale}px;height:${src.height * scale}px">`;
    const heroes = ['AXE', 'ASSASSIN', 'ZEUS', 'FROSTWITCH'].map(k => spriteFor({ isHero: true, key: k })).filter(Boolean);
    document.getElementById('ts-art-normal').innerHTML = heroes.map(s => img(s.img, 1.6)).join('');
    document.getElementById('ts-art-tower').innerHTML = img(pxbHeroFrame(tsHero, 'idle', 0).img, 2.2) + img(pxbFrame('wolf', '#8d8d8d', [], 'idle', 0).img, 2) + img(pxbFrame('boss:volcano', '#d00000', [], 'idle', 0).img, 1.4);
}
tsCardArt();
requestAnimationFrame(tsFrame);
