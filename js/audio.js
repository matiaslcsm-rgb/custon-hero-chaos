// Sonidos del juego, sintetizados con Web Audio (sin archivos: el juego sigue abriéndose con doble clic).
//
//   sfx(nombre) toca un efecto corto. Se llaman desde los efectos visuales (fx.js), así que solo suenan los de la arena que
//   estás mirando. Cada sonido tiene un mínimo de tiempo entre repeticiones para que 20 golpes juntos no saturen.
//   El navegador solo deja arrancar el audio después de un clic o una tecla: se activa solo en la primera interacción.
//   Se silencia con el botón 🔊 de la barra superior (queda guardado).

const AUDIO = { volume: 0.35, minGap: { hit: 0.05, heroHit: 0.08, coin: 0.08, swing: 0.06, pop: 0.05, shoot: 0.06, heal: 0.2, boom: 0.25 } };
let audioCtx = null, masterGain = null, soundOn = true;
const lastSfx = {};
try { soundOn = localStorage.getItem('chc-sound') !== 'off'; } catch (e) { /* sin almacenamiento: queda prendido */ }

function initAudio() {
    if (audioCtx || !window.AudioContext) return;
    try {
        audioCtx = new AudioContext();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = soundOn ? AUDIO.volume : 0;
        masterGain.connect(audioCtx.destination);
    } catch (e) { audioCtx = null; }
}
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { initAudio(); if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); }, { passive: true }));

function setSound(on) {
    soundOn = on;
    try { localStorage.setItem('chc-sound', on ? 'on' : 'off'); } catch (e) { /* no se guarda */ }
    if (masterGain) masterGain.gain.value = on ? AUDIO.volume : 0;
    const btn = document.getElementById('sound-btn');
    if (btn) btn.textContent = on ? '🔊' : '🔇';
}

// Un tono con envolvente: frecuencia inicial → final, forma de onda y duración.
function tone(freq, freqEnd, dur, type = 'square', vol = 0.3, delay = 0) {
    const t = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(t); osc.stop(t + dur + 0.02);
}

// Ruido filtrado (golpes, explosiones, tajos).
function noise(dur, filterFreq, vol = 0.3, delay = 0, type = 'lowpass') {
    const t = audioCtx.currentTime + delay;
    const buffer = audioCtx.createBuffer(1, Math.ceil(audioCtx.sampleRate * dur), audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource(), filter = audioCtx.createBiquadFilter(), gain = audioCtx.createGain();
    src.buffer = buffer; filter.type = type; filter.frequency.value = filterFreq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter); filter.connect(gain); gain.connect(masterGain);
    src.start(t);
}

const SFX = {
    hit: () => noise(0.06, 1800, 0.12),
    heroHit: () => { noise(0.08, 900, 0.2); tone(180, 90, 0.08, 'square', 0.08); },
    crit: () => { noise(0.1, 3000, 0.25); tone(900, 300, 0.12, 'sawtooth', 0.12); },
    swing: () => noise(0.09, 2500, 0.1, 0, 'bandpass'),
    shoot: () => tone(1200, 500, 0.07, 'triangle', 0.08),
    pop: () => tone(420, 140, 0.1, 'square', 0.09),
    death: () => { tone(300, 60, 0.5, 'sawtooth', 0.2); noise(0.4, 600, 0.2); },
    cast: () => tone(500, 1100, 0.18, 'sine', 0.18),
    ult: () => { tone(200, 800, 0.35, 'sawtooth', 0.15); tone(400, 1600, 0.35, 'sine', 0.12, 0.05); noise(0.3, 1200, 0.12); },
    heal: () => tone(700, 1000, 0.15, 'sine', 0.08),
    coin: () => { tone(1300, 1300, 0.06, 'square', 0.07); tone(1750, 1750, 0.1, 'square', 0.07, 0.05); },
    levelup: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.14, 'square', 0.1, i * 0.08)),
    boom: () => { noise(0.5, 400, 0.4); tone(120, 40, 0.5, 'sine', 0.3); },
    click: () => tone(900, 700, 0.04, 'square', 0.06),
    wave: () => [392, 523, 659].forEach((f, i) => tone(f, f, 0.18, 'sawtooth', 0.09, i * 0.1)),
    duel: () => { tone(260, 260, 0.2, 'sawtooth', 0.12); tone(390, 390, 0.3, 'sawtooth', 0.12, 0.15); },
    boss: () => { tone(90, 60, 0.9, 'sawtooth', 0.2); noise(0.8, 300, 0.2); },
    win: () => [659, 784, 1047].forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.14, i * 0.1)),
    tick: () => tone(880, 880, 0.07, 'square', 0.1),                       // cuenta regresiva: últimos 5 segundos
    tickLast: () => tone(1320, 1320, 0.18, 'square', 0.12),                // último segundo
    betWin: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.12, 'square', 0.08, i * 0.07)); tone(1568, 1568, 0.3, 'triangle', 0.1, 0.3); },
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, f * 0.98, 0.25, 'triangle', 0.14, i * 0.12))
};

// Sonidos propios (archivos): si un nombre está en SOUND_FILES (js/data/sounds.js), suena el archivo en vez del
// sintetizado. Si el archivo no carga, vuelve al sintetizado.
const soundFileCache = {};
function playSoundFile(name) {
    const path = typeof SOUND_FILES !== 'undefined' && SOUND_FILES[name];
    if (!path || soundFileCache[name] === false) return false;
    if (!soundFileCache[name]) {
        const audio = new Audio(path);
        audio.addEventListener('error', () => { soundFileCache[name] = false; });
        soundFileCache[name] = audio;
    }
    const clip = soundFileCache[name].cloneNode();
    clip.volume = Math.min(1, AUDIO.volume * 2 * ((typeof SOUND_VOLUME !== 'undefined' && SOUND_VOLUME[name]) || 1));
    clip.play().catch(() => { /* el navegador todavía no dejó reproducir */ });
    return true;
}

function sfx(name) {
    if (!audioCtx || !soundOn) return;
    const now = audioCtx.currentTime, gap = AUDIO.minGap[name] || 0.03;
    if (lastSfx[name] && now - lastSfx[name] < gap) return;
    lastSfx[name] = now;
    if (playSoundFile(name) || !SFX[name]) return;
    try { SFX[name](); } catch (e) { /* un sonido que falla no rompe el juego */ }
}
