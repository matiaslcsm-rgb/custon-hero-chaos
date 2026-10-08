// Tower Chaos: música por capas (REWORK.md §7, fase 7, 2026-10-07). Pistas libres de opengameart.org (docs/CREDITOS.md).
//
//   Capa BASE: una pista por lugar (el bioma en el campo, el pueblo, el laberinto, la cueva). Capa de COMBATE: entra
//   con fundido cuando te persigue algo cerca y la base baja; contra un jefe, en vez del combate suena su tema. De noche
//   la base suena más baja y filtrada (más oscura), sin pista aparte. Las pistas se bajan recién cuando hacen falta.

const MUSIC_TRACKS = {
    forest: 'music/forest.mp3', swamp: 'music/swamp.ogg', desert: 'music/desert.ogg', snow: 'music/snow.ogg', volcano: 'music/volcano.ogg',
    town: 'music/town.mp3', lab: 'music/lab.ogg', cave: 'music/cave.ogg', combat: 'music/combat.ogg', boss: 'music/boss.ogg', wind: 'music/snow-wind.ogg'
};
// Volumen propio de cada pista (las grabaciones vienen a niveles distintos)
const MUSIC_GAIN = { forest: 0.55, swamp: 0.8, desert: 0.6, snow: 0.6, volcano: 0.55, town: 0.5, lab: 0.75, cave: 0.9, combat: 0.5, boss: 0.55, wind: 0.45 };
const MUSIC = { volume: 0.6, fade: 1.6, combatRadius: 10, baseInCombat: 0.3, nightVolume: 0.75, nightCutoff: 900, idlePause: 6 };
let musicOn = true;
try { musicOn = localStorage.getItem('chc-music') !== 'off'; } catch (e) { /* sin almacenamiento: prendida */ }
const musicLayers = {}; // key → { el, vol, target, idle, filter }

function setMusic(on) {
    musicOn = on;
    try { localStorage.setItem('chc-music', on ? 'on' : 'off'); } catch (e) { /* no se guarda */ }
    if (!on) stopMusic();
}
// Cada pista, como un <audio> en bucle; si se puede, pasa por un filtro de Web Audio (para la noche)
function musicLayer(key) {
    if (musicLayers[key]) return musicLayers[key];
    const el = new Audio(MUSIC_TRACKS[key]);
    el.loop = true; el.preload = 'auto'; el.volume = 0;
    const layer = { el, vol: 0, target: 0, idle: 0, filter: null };
    // Abriendo el juego con doble clic (file://) el filtro silenciaría la pista: ahí solo se usa el volumen
    if (audioCtx && location.protocol !== 'file:') {
        try {
            const src = audioCtx.createMediaElementSource(el), f = audioCtx.createBiquadFilter();
            f.type = 'lowpass'; f.frequency.value = 20000;
            src.connect(f); f.connect(audioCtx.destination); layer.filter = f;
        } catch (e) { /* sin filtro */ }
    }
    return (musicLayers[key] = layer);
}
function stopMusic() { Object.values(musicLayers).forEach(l => { l.target = 0; l.vol = 0; l.el.volume = 0; l.el.pause(); }); }

// Qué tiene que sonar ahora: { key: volumen objetivo }
function musicTargets(level) {
    const out = {};
    if (!level || !player) return out;
    const zone = level.isCave ? ZONE.cave : towerZoneAt(level, player.x, player.y);
    const base = level.isCave ? 'cave' : zone === ZONE.town ? 'town' : zone === ZONE.lab ? 'lab' : level.biome;
    const near = player.isAlive() && level.creeps.filter(c => c.isAlive() && c.aggro && Math.hypot(c.x - player.x, c.y - player.y) <= MUSIC.combatRadius);
    const boss = near && near.find(c => c.isGuardian || c.isCaveBoss);
    const fight = near && near.length && zone !== ZONE.town;
    const night = !level.isCave && level.town && towerIsNight();
    out[base] = (fight ? MUSIC.baseInCombat : 1) * (night ? MUSIC.nightVolume : 1);
    if (base === 'snow') out.wind = out.snow;
    if (fight) out[boss ? 'boss' : 'combat'] = 1;
    return out;
}
// Cada frame (renderTower): fundidos hacia el volumen objetivo; lo que queda en silencio un rato se pausa
function towerMusicTick(level, dt) {
    if (!musicOn || !soundOn || !audioCtx || gameMode !== 'tower') { if (Object.keys(musicLayers).length) stopMusic(); return; }
    const targets = musicTargets(level), night = level && !level.isCave && level.town && towerIsNight();
    Object.keys(MUSIC_TRACKS).forEach(k => { if (targets[k] || musicLayers[k]) musicLayer(k).target = targets[k] || 0; });
    const step = dt / MUSIC.fade;
    Object.entries(musicLayers).forEach(([k, l]) => {
        l.vol += Math.max(-step, Math.min(step, l.target - l.vol));
        const v = Math.max(0, Math.min(1, l.vol * MUSIC_GAIN[k] * MUSIC.volume * (paused ? 0.4 : 1)));
        l.el.volume = v;
        if (l.filter) l.filter.frequency.value = night && k !== 'combat' && k !== 'boss' ? MUSIC.nightCutoff : 20000;
        if (l.target > 0 && l.el.paused) { const p = l.el.play(); if (p && p.catch) p.catch(() => { /* el navegador espera una interacción */ }); }
        l.idle = l.vol <= 0.001 ? l.idle + dt : 0;
        if (l.idle > MUSIC.idlePause && !l.el.paused) l.el.pause();
    });
}
