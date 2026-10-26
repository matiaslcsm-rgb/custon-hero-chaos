// Infinite Tower 2D: sonido, música y joystick (2026-10-25, pedido del usuario: "joystick y sonido").
//
//   SONIDO: sintetizado con Web Audio (usa el audioCtx y el volumen de js/audio.js), sin archivos:
//   · pisadas según el material (arena, piedra, madera, agua), aterrizajes, salpicones, el crujido al cavar
//   · el chisporroteo del fuego y las antorchas cerca, burbujas en la lava
//   · de fondo: las olas en la playa, un viento sordo adentro de la torre
//   MÚSICA: las pistas de la Torre (js/towerMusic.js): la del bosque en la playa, la de la cueva adentro; cuando un
//   enemigo te ataca entra la de combate y la de fondo baja.
//   JOYSTICK (Gamepad API, mando estándar): palanca o cruz para moverte, A saltar, X tajo (mantené: cargado),
//   B o RB dash, Y o LB parada, Start pausa. Vibra al recibir un golpe y al pegar fuerte.

// --- SONIDO ---
let t2dNoiseBuf = null, t2dAmb = null;
const t2dAudioOk = () => typeof audioCtx !== 'undefined' && audioCtx && typeof soundOn !== 'undefined' && soundOn && masterGain;
function t2dNoise() {
    if (t2dNoiseBuf) return t2dNoiseBuf;
    const n = audioCtx.sampleRate; t2dNoiseBuf = audioCtx.createBuffer(1, n, n);
    const d = t2dNoiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return t2dNoiseBuf;
}
// Un golpe de ruido filtrado: la base de casi todos los sonidos del mundo
function t2dBurst({ dur = 0.08, freq = 1000, q = 1, type = 'bandpass', vol = 0.15, sweep = 0 }) {
    if (!t2dAudioOk()) return;
    const t = audioCtx.currentTime, src = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
    src.buffer = t2dNoise(); src.playbackRate.value = 0.8 + Math.random() * 0.4;
    f.type = type; f.frequency.setValueAtTime(freq, t); if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur); f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(masterGain);
    src.start(t, Math.random() * 0.5, dur + 0.02);
}
function t2dTone(f0, f1, dur, vol, type = 'sine') {
    if (!t2dAudioOk()) return;
    const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(masterGain); o.start(t); o.stop(t + dur + 0.02);
}
const T2D_SND = {
    step(m) {
        if (m === MAT.SAND || m === MAT.GRAVEL) t2dBurst({ dur: 0.07, freq: 700, q: 0.7, type: 'lowpass', vol: 0.09 });
        else if (m === MAT.WOOD) { t2dBurst({ dur: 0.04, freq: 500, q: 2, vol: 0.1 }); t2dTone(180, 120, 0.05, 0.03, 'triangle'); }
        else if (m === MAT.WATER || m === MAT.OIL) t2dBurst({ dur: 0.1, freq: 1400, q: 1.2, vol: 0.07 });
        else t2dBurst({ dur: 0.03, freq: 2200, q: 1.5, vol: 0.06 }); // piedra
    },
    land(m, big) { T2D_SND.step(m); t2dBurst({ dur: big ? 0.18 : 0.1, freq: 300, q: 0.8, type: 'lowpass', vol: big ? 0.22 : 0.1 }); },
    splash(k = 1) { t2dBurst({ dur: 0.35 * k, freq: 1600, q: 0.6, vol: 0.18 * k, sweep: 0.4 }); t2dBurst({ dur: 0.2, freq: 4000, q: 0.5, type: 'highpass', vol: 0.05 * k }); },
    dig() { t2dBurst({ dur: 0.12, freq: 450, q: 1.5, vol: 0.16, sweep: 0.6 }); },
    crackle(k) { t2dBurst({ dur: 0.012, freq: 3000 + Math.random() * 2000, q: 2, type: 'highpass', vol: 0.05 * k }); },
    bubble(k) { t2dTone(140 + Math.random() * 60, 60, 0.14, 0.05 * k); }
};
// Ruido de fondo continuo: olas (sube y baja como el mar) o viento (sordo y parejo)
function t2dAmbient(kind) {
    if (!t2dAudioOk() || (t2dAmb && t2dAmb.kind === kind)) return;
    if (t2dAmb) { const old = t2dAmb; old.gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.4); setTimeout(() => old.src.stop(), 2000); t2dAmb = null; }
    if (!kind) return;
    const t = audioCtx.currentTime, src = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), gain = audioCtx.createGain();
    src.buffer = t2dNoise(); src.loop = true;
    f.type = 'lowpass'; f.frequency.value = kind === 'waves' ? 550 : 260;
    gain.gain.setValueAtTime(0, t); gain.gain.setTargetAtTime(kind === 'waves' ? 0.09 : 0.035, t, 0.8);
    src.connect(f); f.connect(gain); gain.connect(masterGain); src.start();
    if (kind === 'waves') { // la ola: un oscilador lento mueve el volumen
        const lfo = audioCtx.createOscillator(), depth = audioCtx.createGain();
        lfo.frequency.value = 0.13; depth.gain.value = 0.06; lfo.connect(depth); depth.connect(gain.gain); lfo.start();
    }
    t2dAmb = { kind, src, gain };
}
// Cada cuadro: pisadas, fuego cerca, lava cerca, el fondo y la música
function t2dAudioTick(g, dt) {
    const h = g.hero;
    t2dAmbient(g.room.bg === 'beach' ? 'waves' : 'wind');
    if (h.onGround && Math.abs(h.vx) > 40 && !h.sleeping) {
        h.stepT = (h.stepT || 0) + dt;
        if (h.stepT > (Math.abs(h.vx) > 100 ? 0.22 : 0.3)) { h.stepT = 0; T2D_SND.step(w2dGet(g.world, (h.x + h.w / 2) | 0, (h.y + h.h + 1) | 0)); }
    }
    // fuego, antorchas y lava cerca: chisporroteo y burbujas, más fuerte cuanto más cerca
    let fire = 0, lava = 0; const C = W2D.chunk, cx = h.x + h.w / 2, cy = h.y + h.h / 2;
    (g.torches || []).forEach(t => { const d = Math.hypot(t.x - cx, t.y - cy); if (d < 120) fire += 1 - d / 120; });
    for (let y = 0; y < g.world.ch; y++) for (let x = 0; x < g.world.cw; x++) {
        const n = g.world.glow[y * g.world.cw + x]; if (!n) continue;
        const d = Math.hypot(x * C + C / 2 - cx, y * C + C / 2 - cy); if (d < 140) lava += (1 - d / 140) * Math.min(1, n / 80);
    }
    if (fire > 0 && Math.random() < 0.25 * fire) T2D_SND.crackle(Math.min(1, fire));
    if (lava > 0 && Math.random() < 0.04 * lava) T2D_SND.bubble(Math.min(1, lava));
    // música: la de la zona, y la de combate si algo te está atacando cerca
    if (typeof towerMusicTick === 'function') {
        const base = g.room.music || (g.room.bg === 'beach' ? 'forest' : 'cave');
        const fight = g.enemies.some(e => e.hp > 0 && Math.hypot(e.x - h.x, e.y - h.y) < 110 && (e.state === 'windup' || e.state === 'rush' || Math.hypot(e.x - h.x, e.y - h.y) < 50));
        if (fight) g.fightUntil = g.clock + 3; // la de combate queda un rato después
        const inFight = g.clock < (g.fightUntil || 0);
        towerMusicTick(null, dt, { [base]: inFight ? 0.35 : 1, ...(inFight ? { combat: 0.8 } : {}) });
    }
}

// --- JOYSTICK (Gamepad API, mando estándar) ---
const t2dPadPrev = {};
function t2dPad() {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const p = pads[0]; if (!p) return null;
    const b = i => !!(p.buttons[i] && p.buttons[i].pressed), ax = p.axes[0] || 0, ay = p.axes[1] || 0, dz = 0.35;
    const now = { left: ax < -dz || b(14), right: ax > dz || b(15), up: ay < -dz * 1.4 || b(12), down: ay > dz * 1.4 || b(13),
        jump: b(0), attack: b(2), dash: b(1) || b(5), parry: b(3) || b(4), pause: b(9) };
    const edge = {}; Object.keys(now).forEach(k => { edge[k] = now[k] && !t2dPadPrev[k]; t2dPadPrev[k] = now[k]; });
    return { held: now, pressed: edge, pad: p };
}
// Vibración (si el mando y el navegador la tienen)
function t2dRumble(strong, weak, ms) {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const a = pads[0] && pads[0].vibrationActuator;
    if (a && a.playEffect) a.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
}
window.addEventListener('gamepadconnected', () => { if (typeof t2dMsg === 'function' && t2d) t2dMsg('🎮 Joystick conectado: A saltar · X tajo (mantené: cargado) · B dash · Y parada · Start pausa'); });
