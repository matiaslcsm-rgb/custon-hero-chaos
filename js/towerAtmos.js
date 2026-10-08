// Tower Chaos: luz y clima (REWORK.md, "luz y clima", 2026-10-08).
//
//   Para que el mundo se sienta vivo (referencias: las fogatas de Don't Starve y Valheim, que son a la vez luz y refugio;
//   el clima de Hyper Light Drifter, que es pura atmósfera y no tapa la pelea).
//   LUCES: el pueblo tiene antorchas y una fogata en la plaza, la puerta del laberinto dos antorchas, el herrero su fragua
//   y en el campo hay campamentos abandonados con una fogata. De noche abren un hueco en la oscuridad y tiñen de naranja
//   (con parpadeo). Las cuevas tienen antorchas en las paredes. Las balas enemigas también brillan de noche: se leen.
//   FOGATA: de noche, al lado de una (y sin nadie persiguiéndote) recuperás vida — un respiro en la noche, que es la parte
//   más peligrosa (más bichos y más fuertes, ver DAYNIGHT). De día solo es un campamento.
//   CLIMA por bioma, solo visual (los efectos del clima ya existen en BIOMES): bosque, hojas que caen y luciérnagas de
//   noche · ciénaga, llovizna y bancos de niebla · desierto, ráfagas de arena · nieve, nevada · volcán, ceniza y brasas
//   que suben. Va y viene en intensidad. Se puede apagar en la pausa (Opciones).

const ATMOS = { townTorches: 8, fieldCamps: 4, caveTorches: 6, campHeal: 0.012, campReach: 1.6, particles: 140 };
const LIGHT_KIND = { torch: { r: 3.2, glow: 1.4 }, fire: { r: 5, glow: 2.2 }, forge: { r: 3.6, glow: 1.6 } };
let weatherOn = true;
try { weatherOn = localStorage.getItem('chc-weather') !== '0'; } catch (e) { /* por defecto, sí */ }
function setWeather(on) { weatherOn = on; try { localStorage.setItem('chc-weather', on ? '1' : '0'); } catch (e) { /* no se guarda */ } }

// --- DÓNDE HAY LUZ (se arma una vez por nivel) ---
function towerLights(level) {
    if (level.lights) return level.lights;
    const L = level.lights = [], taken = (x, y, d) => L.some(o => Math.hypot(o.x - x, o.y - y) < d);
    const freeTile = (x, y) => x > 0 && y > 0 && x < COLS - 1 && y < ROWS - 1 && walkable(level, x, y);
    const scatter = (n, test, minGap, kind, tries = 4000) => {
        for (let t = 0, made = 0; t < tries && made < n; t++) {
            const x = 2 + Math.floor(Math.random() * (COLS - 4)), y = 2 + Math.floor(Math.random() * (ROWS - 4));
            if (!test(x, y) || taken(x, y, minGap)) continue;
            L.push({ x, y, kind }); made++;
        }
    };
    if (level.isCave) { scatter(ATMOS.caveTorches, freeTile, 9, 'torch'); return L; }
    const tw = level.town;
    if (tw) {
        const fx = tw.merchant.x, fy = tw.merchant.y + 3; // la fogata de la plaza
        if (freeTile(fx, fy)) L.push({ x: fx, y: fy, kind: 'fire', town: true });
        scatter(ATMOS.townTorches, (x, y) => freeTile(x, y) && towerZoneAt(level, x, y) === ZONE.town && Math.hypot(x - tw.merchant.x, y - tw.merchant.y) > 2.5, 5, 'torch');
        if (tw.smith) L.push({ x: tw.smith.x, y: tw.smith.y, kind: 'forge', noDraw: true });
    }
    if (level.gate) [-1, 1].forEach(d => { const x = level.gate.x + d, y = level.gate.y; if (freeTile(x, y)) L.push({ x, y, kind: 'torch' }); });
    // Campamentos abandonados en el campo: lejos del inicio, del pueblo y del camino
    if (level.zone) scatter(ATMOS.fieldCamps, (x, y) => freeTile(x, y) && towerZoneAt(level, x, y) === ZONE.field && level.ground[y * COLS + x] !== GROUND.road &&
        Math.hypot(x - level.start.x, y - level.start.y) > 25 && (!tw || Math.hypot(x - tw.merchant.x, y - tw.merchant.y) > 20), 30, 'fire');
    L.forEach(o => { if (o.kind === 'fire' && !o.town) o.camp = true; });
    return L;
}
const flicker = (o, k = 1) => 1 + 0.08 * k * Math.sin(fxClock * 9 + o.x * 3.1) + 0.05 * k * Math.sin(fxClock * 23 + o.y * 1.7);

// Huecos en la oscuridad (lo llama drawTowerNight) y el brillo naranja encima
function towerNightLights(level, light) {
    towerLights(level).forEach(o => { if (canSeeOrExplored(level, o)) light(o.x, o.y, LIGHT_KIND[o.kind].r * TILE * flicker(o)); });
    (level.bullets || []).forEach(b => light(b.x, b.y, 0.9 * TILE)); // las balas se ven de noche
    if (level.biome === 'volcano') (level.zones || []).forEach(z => { if (z.kind === 'lava') light(z.x, z.y, 3 * TILE); });
}
function canSeeOrExplored(level, o) { return level.explored[o.y] && level.explored[o.y][o.x]; }
function drawFireGlow(level, dark) {
    if (dark <= 0.05) return;
    const z = viewScale();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    towerLights(level).forEach(o => {
        if (!canSeeOrExplored(level, o)) return;
        const sx = (o.x - camera.x + 0.5) * TILE * z, sy = (o.y - camera.y + 0.5) * TILE * z, r = LIGHT_KIND[o.kind].glow * TILE * z * flicker(o, 1.5);
        if (sx < -r || sy < -r || sx > screenW() + r || sy > screenH() + r) return;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        g.addColorStop(0, `rgba(255,150,60,${0.32 * dark})`); g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    });
    ctx.restore();
}

// --- LOS OBJETOS (en el mundo, de día y de noche) ---
function drawTowerLights(level) {
    towerLights(level).forEach(o => {
        if (o.noDraw || !canSeeOrExplored(level, o)) return;
        const cx = o.x * TILE + TILE / 2, cy = o.y * TILE + TILE / 2, f = flicker(o, 2);
        ctx.save();
        if (o.kind === 'torch') {
            ctx.strokeStyle = INK.line; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy + TILE * 0.35); ctx.lineTo(cx, cy - TILE * 0.15); ctx.stroke(); // el palo
            drawFlame(cx, cy - TILE * 0.22, 6 * f);
        } else { // fogata: piedras, troncos cruzados y llama
            ctx.fillStyle = '#8f8166'; ctx.strokeStyle = INK.line; ctx.lineWidth = 1.2;
            for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 11, cy + 6 + Math.sin(a) * 5, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
            ctx.strokeStyle = '#5a4632'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(cx - 8, cy + 9); ctx.lineTo(cx + 8, cy + 3); ctx.moveTo(cx - 8, cy + 3); ctx.lineTo(cx + 8, cy + 9); ctx.stroke();
            drawFlame(cx, cy + 2, 10 * f);
            if (o.camp && level.explored[o.y][o.x] && towerDarkness() >= 0.5 && Math.hypot(player.x - o.x, player.y - o.y) <= ATMOS.campReach + 2) { // cartel de la fogata
                ctx.font = 'bold 10px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#8a5a00'; ctx.fillText('fogata: descansá', cx, cy - TILE * 0.7);
            }
        }
        ctx.restore();
    });
}
function drawFlame(x, y, s) {
    ctx.fillStyle = '#e85d04'; ctx.beginPath(); ctx.moveTo(x, y - s * 1.6); ctx.quadraticCurveTo(x + s, y - s * 0.2, x, y + s * 0.4); ctx.quadraticCurveTo(x - s, y - s * 0.2, x, y - s * 1.6); ctx.fill();
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.moveTo(x, y - s * 0.9); ctx.quadraticCurveTo(x + s * 0.5, y, x, y + s * 0.3); ctx.quadraticCurveTo(x - s * 0.5, y, x, y - s * 0.9); ctx.fill();
}

// --- FOGATA: descanso de noche ---
function towerCampTick(level, dt) {
    if (level.isCave || !player.isAlive() || player.hp >= player.maxHp || towerDarkness() < 0.5) return;
    const near = towerLights(level).find(o => o.camp && Math.hypot(player.x - o.x, player.y - o.y) <= ATMOS.campReach);
    if (!near || towerInFight(level)) return;
    if (everyInterval(player, 'CAMPFIRE', dt, 1)) { healUnit(player, player.maxHp * ATMOS.campHeal); if (fxArena(player)) fxParticles(level, player.x, player.y, 'fire', 3, 1, { style: 'ember', life: 0.7 }); }
    writeNotebookPage('CAMPFIRE');
}

// --- CLIMA (partículas en pantalla) ---
const WEATHER = {
    forest: { kind: 'leaf', rate: 0.25, color: ['#7d8f4e', '#a68a64', '#9c6644'], night: 'firefly' },
    swamp: { kind: 'rain', rate: 1, color: ['rgba(120,140,150,0.55)'], fog: true },
    desert: { kind: 'sand', rate: 0.8, color: ['rgba(212,163,115,0.6)', 'rgba(224,192,128,0.5)'] },
    snow: { kind: 'snow', rate: 1, color: ['#ffffff', '#e0e1dd'] },
    volcano: { kind: 'ash', rate: 0.7, color: ['rgba(80,70,70,0.7)', 'rgba(120,110,105,0.6)'], embers: true }
};
let weatherParts = [], weatherBiome = null;
// Intensidad que va y viene (0,3-1), distinta por piso
function weatherIntensity(level) { const t = gameClock / 40 + (level.floor || 0) * 1.7; return 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t) * Math.sin(t * 0.37 + 1)); }
function drawTowerWeather(level, dt) {
    if (!weatherOn || level.isCave || !level.biome || towerZoneAt(level, player.x, player.y) === ZONE.lab) { weatherParts = []; return; }
    const W = WEATHER[level.biome];
    if (weatherBiome !== level.biome) { weatherParts = []; weatherBiome = level.biome; }
    const sw = screenW(), sh = screenH(), dark = towerDarkness(), k = weatherIntensity(level);
    const want = Math.round(ATMOS.particles * W.rate * k);
    while (weatherParts.length < want) weatherParts.push(newWeatherPart(W, sw, sh, dark, weatherParts.length > want * 0.5));
    if (weatherParts.length > want + 10) weatherParts.length = want;
    ctx.save();
    weatherParts.forEach((p, i) => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.t += dt;
        if (p.kind === 'leaf') p.x += Math.sin(p.t * 2 + i) * 18 * dt;
        if (p.kind === 'firefly') { p.x += Math.sin(p.t * 1.3 + i) * 14 * dt; p.y += Math.cos(p.t * 1.1 + i) * 10 * dt; }
        if (p.x < -20 || p.x > sw + 20 || p.y < -20 || p.y > sh + 20 || p.t > p.life) Object.assign(p, newWeatherPart(W, sw, sh, dark, false));
        const fade = Math.min(1, p.t * 2, (p.life - p.t) * 2);
        ctx.globalAlpha = Math.max(0, fade) * (p.glow ? 1 : 1 - 0.55 * dark); // de noche se ve menos (salvo lo que brilla)
        ctx.fillStyle = ctx.strokeStyle = p.color;
        if (p.kind === 'rain') { ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke(); }
        else if (p.kind === 'sand') { ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 14, p.y + 1); ctx.stroke(); }
        else if (p.kind === 'leaf') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 3 + i); ctx.beginPath(); ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
        else if (p.glow) { ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + 0.3 * Math.sin(p.t * 8 + i)), 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
    });
    ctx.restore();
    if (W.fog) drawFogBanks(level, sw, sh);
}
function newWeatherPart(W, sw, sh, dark, anywhere) {
    const pick = a => a[Math.floor(Math.random() * a.length)], r = Math.random;
    let kind = W.kind;
    if (W.night && dark > 0.5 && r() < 0.6) kind = W.night;              // luciérnagas en el bosque de noche
    if (W.embers && r() < 0.25) kind = 'ember';                          // brasas que suben en el volcán
    const p = { kind, t: 0, life: 6 + r() * 6, color: pick(W.color), size: 1.5 + r() * 2, x: r() * sw, y: anywhere ? r() * sh : -10, vx: 0, vy: 0 };
    if (kind === 'rain') Object.assign(p, { vx: -120, vy: 620, life: 2, x: r() * (sw + 200) });
    if (kind === 'snow') Object.assign(p, { vx: -15 + r() * 10, vy: 30 + r() * 30, size: 1.5 + r() * 2.2 });
    if (kind === 'leaf') Object.assign(p, { vx: 10 + r() * 20, vy: 25 + r() * 20 });
    if (kind === 'ash') Object.assign(p, { vx: 8 - r() * 16, vy: 18 + r() * 15, size: 1.2 + r() * 1.5 });
    if (kind === 'sand') Object.assign(p, { vx: 380 + r() * 200, vy: 10 - r() * 20, x: anywhere ? r() * sw : -20, y: r() * sh, life: 3 });
    if (kind === 'firefly') Object.assign(p, { color: '#d9f99d', glow: true, size: 1.8, y: r() * sh, life: 4 + r() * 4 });
    if (kind === 'ember') Object.assign(p, { color: pick(['#ffb703', '#e85d04']), glow: true, vx: 5 - r() * 10, vy: -(25 + r() * 30), y: anywhere ? r() * sh : sh + 10, size: 1.4 + r() * 1.2 });
    return p;
}
// Bancos de niebla que pasan despacio (ciénaga)
function drawFogBanks(level, sw, sh) {
    ctx.save();
    for (let i = 0; i < 4; i++) {
        const x = ((gameClock * (8 + i * 3) + i * 400) % (sw + 600)) - 300, y = sh * (0.2 + 0.2 * i) + Math.sin(gameClock * 0.2 + i) * 30;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 260);
        g.addColorStop(0, 'rgba(220,225,215,0.22)'); g.addColorStop(1, 'rgba(220,225,215,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 260, y - 260, 520, 520);
    }
    ctx.restore();
}
