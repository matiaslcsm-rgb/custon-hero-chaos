// Infinite Tower 2D (pedido del usuario 2026-10-25: "pasar Infinite Tower a 2D lateral"; metroidvania conectado, con
// pisos fijos y partes procedurales; modo nuevo en paralelo: la Torre de vista desde arriba sigue jugable).
//
// SENSACIÓN DEL PERSONAJE (2026-10-25, "me es importante el game feel"; referencias: Hollow Knight, Celeste, Dead Cells):
//   · Correr con aceleración y frenada; salto que llega más alto si lo mantenés, y en la punta flota un instante (apex);
//     la caída es más rápida que la subida (se siente con peso, no como un globo).
//   · Perdón al saltar: tiempo de coyote (un instante después de dejar el borde), salto guardado (apretado justo antes
//     de tocar el piso) y corrección de esquinas (si la cabeza roza un borde, te corre en vez de frenarte).
//   · El cuerpo se estira al saltar y se aplasta al caer; polvo al saltar, aterrizar y girar.
//   · Tajos en 3 direcciones (de costado, arriba con ↑, abajo con ↓ en el aire). El de abajo rebota sobre enemigos y
//     pinchos (el "pogo" de Hollow Knight). Cada golpe frena el juego un instante, sacude la pantalla y empuja: al
//     enemigo hacia atrás y a vos un poquito para el otro lado.
//   · Dash (Shift o L): rápido, con estela; uno en el aire hasta volver a tocar el piso.
//   · Cámara que te sigue suave y mira un poco hacia donde vas.
//   · Panel de ajuste (tecla T): todos estos números se tocan en vivo y se guardan en tu navegador.
// Se juega en torre2d.html. La física es pura (sin dibujar) y tiene pruebas en js/tests.js.

const T2D = {
    TILE: 16, VIEW_W: 320, VIEW_H: 180, DT: 1 / 120, stepUp: 3, // stepUp: escalones que se suben solos (pendientes)
    // el héroe (en píxeles del dibujo, por segundo)
    hero: { w: 10, h: 22, accel: 1500, airAccel: 1000, friction: 1800, maxRun: 115, jumpV: 290, gravity: 950, fallMult: 1.45,
        apexBand: 45, apexMult: 0.5, fallMax: 400, cutJump: 0.45, coyote: 0.1, buffer: 0.12, corner: 5,
        hp: 5, iframes: 1, knock: 160, attackGap: 0.28, comboWindow: 0.6, recoil: 70, pogo: 0.9,
        dashSpeed: 270, dashTime: 0.15, dashCd: 0.4, walls: true, wallSlide: 55, wallJumpX: 165, wallLock: 0.14 },
    slash: { w: 26, h: 20, dmg: [1, 1, 2, 3], active: [0.04, 0.15] }, // el 4.º (3) es el golpe cargado
    charge: { start: 0.3, full: 0.75, slow: 0.35, lunge: 230, lungeTime: 0.12, size: 1.5 }, // mantener el tajo: empieza a cargar a los 0,3 s, listo a los 0,75
    parry: { window: 0.18, cd: 0.6, stun: 1.2 },
    feel: { hitStop: 0.06, hurtStop: 0.12, shake: 2.5, hurtShake: 5, camLook: 28, camLerp: 7, squash: 0.25 },
    walker: { w: 14, h: 12, speed: 30, hp: 3, knock: 140 },
    charger: { w: 16, h: 14, speed: 20, hp: 5, sight: 96, windup: 0.55, rush: 190, rushTime: 0.6, rest: 0.8 } // el embestidor: avisa (!) y embiste
};
// Lo que se ajusta en el panel (tecla T): [grupo, clave, nombre, mínimo, máximo, paso]
const T2D_TUNE = [
    ['hero', 'maxRun', 'Velocidad al correr', 60, 220, 5], ['hero', 'accel', 'Aceleración', 400, 4000, 100],
    ['hero', 'friction', 'Frenada', 400, 4000, 100], ['hero', 'jumpV', 'Fuerza del salto', 180, 420, 5],
    ['hero', 'gravity', 'Gravedad', 500, 1600, 25], ['hero', 'fallMult', 'Caída más rápida (×)', 1, 2.5, 0.05],
    ['hero', 'apexMult', 'Flotar en la punta (gravedad ×)', 0.2, 1, 0.05], ['hero', 'cutJump', 'Corte al soltar el salto', 0.1, 1, 0.05],
    ['hero', 'coyote', 'Coyote (s)', 0, 0.25, 0.01], ['hero', 'buffer', 'Salto guardado (s)', 0, 0.25, 0.01],
    ['hero', 'dashSpeed', 'Velocidad del dash', 120, 500, 10], ['hero', 'dashTime', 'Duración del dash (s)', 0.05, 0.35, 0.01],
    ['hero', 'attackGap', 'Tiempo entre tajos (s)', 0.12, 0.6, 0.01], ['hero', 'recoil', 'Retroceso al pegar', 0, 200, 5],
    ['hero', 'pogo', 'Rebote del tajo abajo (×)', 0.4, 1.3, 0.05],
    ['hero', 'wallSlide', 'Pared: velocidad al bajar', 10, 200, 5], ['hero', 'wallJumpX', 'Pared: empuje del salto', 60, 300, 5],
    ['charge', 'full', 'Golpe cargado: tiempo (s)', 0.4, 1.5, 0.05], ['parry', 'window', 'Parada: ventana (s)', 0.06, 0.4, 0.01],
    ['charger', 'windup', 'Embestidor: aviso (s)', 0.2, 1.2, 0.05],
    ['feel', 'hitStop', 'Pausa de impacto (s)', 0, 0.2, 0.01], ['feel', 'shake', 'Temblor al pegar', 0, 8, 0.5],
    ['feel', 'camLook', 'Cámara: mira adelante', 0, 80, 2], ['feel', 'camLerp', 'Cámara: rapidez', 2, 20, 0.5],
    ['feel', 'squash', 'Estirar y aplastar', 0, 0.5, 0.05]
];
const T2D_TUNED = ['hero', 'feel', 'charge', 'parry', 'charger'];
const T2D_DEFAULTS = JSON.parse(JSON.stringify(Object.fromEntries(T2D_TUNED.map(k => [k, T2D[k]]))));
try { const saved = JSON.parse(localStorage.getItem('t2d-feel') || '{}'); T2D_TUNED.forEach(k => Object.assign(T2D[k], saved[k] || {})); } catch (e) { /* valores de fábrica */ }

// --- LAS SALAS. Cada una es una imagen en torre2d/salas/<nombre>.png (cada color, un material: docs/TORRE2D-SALAS.md).
//     Si la imagen no carga (o en las pruebas), se arma desde estas filas de bloques de 16 px:
//     # roca · p piedra · t tierra · s arena · ~ agua · = tabla de madera · w madera · L lava · ^ espinas
//     P entrada · E caminante · C embestidor (avisa y embiste) · F la Pluma de Arén (doble salto)
//     Los bordes abiertos llevan a la sala que dice `exits`.
const T2D_ROOMS = {
    playa: { name: 'La playa', bg: 'beach', camUp: 45, exits: { right: 'base' }, rows: [
        '.....................................................#######',
        '.....................................................#######',
        '.....................................................#######',
        '.....................................................#######',
        '.....................................................#######',
        '.....................................................#######',
        '............................................................',
        '#............................##.......ss....................',
        '#................ss....ww.P..##.....sssss...................',
        '#~~~~~~~~~~~~~~~sssssssssssssssssssssssssssssssssssss#######',
        '#~~~~~~~~~~~~~~~sssssssssssssssssssssssssssssssssssss#######',
        '#~~~~~~~~~~~~~~~sssssssssssssssssssssssssssssssssssss#######',
        '#ssssssssssssssssssssssssssssssssssssssssssssssssssss#######',
        '############################################################'] },
    base: { name: 'La puerta de la Torre', exits: { left: 'playa', right: 'salon' }, rows: [
        '########################################',
        '#......................................#',
        '#......................................#',
        '#......................................#',
        '#......................................#',
        '#......................................#',
        '......................======...........#',
        '.......................................#',
        '...............====....................#',
        '#......................................#',
        '#.....=====........................tt...',
        '#..................................tt...',
        '#..P....ss..C....E...#~~~~#....^^^.tt...',
        '########################################'] },
    salon: { name: 'El Atrio Verde', exits: { left: 'base', up: 'alto' }, rows: [
        '###############################...######',
        '#......................................#',
        '#..............................F.......#',
        '#..........................=====.......#',
        '#......................................#',
        '#....................=====.............#',
        '#......................................#',
        '#.............=====....................#',
        '#......................................#',
        '#.......wwww...........................#',
        '.......................................#',
        '....##.................................#',
        '..........E.............C...#LLL#......#',
        '########################################'] },
    alto: { name: 'El mirador de Arén', exits: { down: 'salon' }, rows: [
        '########################################',
        '#......................................#',
        '#......................................#',
        '#......................................#',
        '#......................................#',
        '#......................................#',
        '#..........======.........======.......#',
        '#......................................#',
        '#......................................#',
        '#...............====...................#',
        '#.........................ssss.........#',
        '#..........................E...........#',
        '#....#~~~~~#...........................#',
        '###############################...######'] }
};
const T2D_WORLDS = {}; // el mundo de cada sala (lo que rompiste queda roto mientras dure la partida)

// --- FÍSICA contra los píxeles reales (js/tower2dWorld.js). Es pura: se prueba en js/tests.js. ---
function t2dBoxHits(w, b) { return w2dBoxHits(w, b); }
// Mueve una caja por un eje de a 1 píxel. De costado sube escalones de hasta T2D.stepUp píxeles (pendientes suaves).
// Devuelve true si chocó.
function t2dMoveAxis(w, b, dx, dy) {
    if (dx) {
        const s = Math.sign(dx); let rest = Math.abs(dx);
        while (rest > 1e-6) {
            const st = Math.min(1, rest), nx = b.x + s * st;
            if (!w2dBoxHits(w, { x: nx, y: b.y, w: b.w, h: b.h })) { b.x = nx; rest -= st; continue; }
            let up = 0;
            if (b.onGround !== false) for (let k = 1; k <= T2D.stepUp; k++) if (!w2dBoxHits(w, { x: nx, y: b.y - k, w: b.w, h: b.h })) { up = k; break; }
            if (!up) return true;
            b.x = nx; b.y -= up; rest -= st;
        }
    }
    if (dy) {
        const s = Math.sign(dy); let rest = Math.abs(dy);
        while (rest > 1e-6) {
            const st = Math.min(1, rest), ny = b.y + s * st;
            if (w2dBoxHits(w, { x: b.x, y: ny, w: b.w, h: b.h })) { // apoyado justo sobre el píxel (ni flotando ni metido)
                const fy = s > 0 ? Math.ceil(b.y + b.h) - b.h : Math.floor(b.y);
                if (!w2dBoxHits(w, { x: b.x, y: fy, w: b.w, h: b.h })) b.y = fy;
                return true;
            }
            b.y = ny; rest -= st;
        }
    }
    return false;
}
const t2dOnGround = (w, b) => w2dBoxHits(w, { x: b.x, y: b.y + 1, w: b.w, h: b.h });
// Si quedó metido en material (la arena que cae lo tapó, una pared que se cerró), sube hasta quedar libre
function t2dUnstick(w, b) {
    if (!w2dBoxHits(w, b)) return;
    for (let k = 1; k <= 24; k++) if (!w2dBoxHits(w, { x: b.x, y: b.y - k, w: b.w, h: b.h })) { b.y -= k; return; }
}
// Un paso del héroe. input: { left, right, up, down, jump (apretado ahora), jumpHeld, dash (apretado ahora) }
function t2dStepHero(room, h, input, dt) {
    const H = T2D.hero, rawDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    h.t = (h.t || 0) + dt;
    const dir = h.t < (h.wallLockUntil || 0) ? 0 : rawDir; // recién saltado de una pared: un instante sin control, para despegarse
    h.events = h.events || [];
    t2dUnstick(room, h);
    // dash: rápido, recto, sin gravedad; uno en el aire hasta tocar el piso
    if (input.dash && h.t >= (h.dashReadyAt || 0) && (h.onGround || h.airDash !== false)) {
        h.dashDir = dir || h.facing || 1; h.dashUntil = h.t + H.dashTime; h.dashReadyAt = h.t + H.dashCd;
        if (!h.onGround) h.airDash = false;
        h.attackAt = -9; h.charging = false; // el dash corta el tajo y la carga
        h.events.push('dash');
    }
    if (h.t < (h.dashUntil || 0)) {
        h.vx = h.dashDir * H.dashSpeed; h.vy = 0; h.facing = h.dashDir;
        if (t2dMoveAxis(room, h, h.vx * dt, 0)) h.dashUntil = 0;
        h.onGround = t2dOnGround(room, h);
        return;
    }
    if (dir) {
        if (h.onGround && dir !== h.facing && Math.abs(h.vx) > 40) h.events.push('turn');
        h.vx += dir * (h.onGround ? H.accel : H.airAccel) * dt; h.facing = dir;
    } else if (h.onGround) { const f = H.friction * dt; h.vx = Math.abs(h.vx) <= f ? 0 : h.vx - Math.sign(h.vx) * f; }
    else if (h.t >= (h.wallLockUntil || 0)) h.vx *= Math.pow(0.2, dt); // en el aire, sin teclas, frena de a poco (no se queda patinando)
    const maxRun = H.maxRun * (h.charging ? T2D.charge.slow : 1) * (h.inWater ? 0.6 : 1); // cargando un golpe o en el agua, más lento
    if (h.t < (h.lungeUntil || 0)) h.vx = h.facing * T2D.charge.lunge; // el golpe cargado avanza como un mini dash
    else if (Math.abs(h.vx) > maxRun) h.vx = Math.sign(h.vx) * Math.max(maxRun, Math.abs(h.vx) - H.friction * dt); // pasado de velocidad (dash, golpe): baja de a poco
    if (h.onGround) { h.coyoteUntil = h.t + H.coyote; h.jumpsLeft = h.doubleJump ? 1 : 0; h.airDash = true; }
    if (input.jump) h.bufferUntil = h.t + H.buffer;
    // la pared: en el aire, empujando contra ella y bajando, te pegás y bajás despacio; con salto, saltás para el otro lado
    const wall = H.walls && !h.onGround ? t2dWallDir(room, h) : 0;
    h.onWall = wall && rawDir === wall && h.vy > 0 ? wall : 0;
    if (h.onWall) { h.wallCoyoteUntil = h.t + H.coyote; h.lastWall = wall; h.airDash = true; if (h.doubleJump) h.jumpsLeft = 1; h.facing = wall; }
    if (h.bufferUntil > h.t && !h.onGround && h.t > (h.coyoteUntil || 0) && h.t <= (h.wallCoyoteUntil || 0)) {
        h.vy = -H.jumpV * 0.95; h.vx = -h.lastWall * H.wallJumpX; h.facing = -h.lastWall; h.wallLockUntil = h.t + H.wallLock;
        h.bufferUntil = 0; h.wallCoyoteUntil = 0; h.jumped = true; h.onWall = 0; h.events.push('wallJump');
    }
    // en el agua: se nada (cada salto es una brazada hacia arriba)
    h.inWater = w2dBoxFraction(room, h, MAT.WATER) > 0.35;
    if (h.inWater && h.bufferUntil > h.t && h.t >= (h.strokeAt || 0)) { h.vy = -H.jumpV * 0.6; h.strokeAt = h.t + 0.25; h.bufferUntil = 0; h.events.push('swim'); }
    else if (h.bufferUntil > h.t && (h.t <= h.coyoteUntil || h.jumpsLeft > 0)) {
        const air = h.t > h.coyoteUntil;
        if (air) h.jumpsLeft--; // en el aire: gasta el doble salto
        h.vy = -H.jumpV * (air ? 0.9 : 1); h.bufferUntil = 0; h.coyoteUntil = 0; h.jumped = true;
        h.events.push(air ? 'doubleJump' : 'jump');
    }
    if (!input.jumpHeld && h.vy < 0 && h.jumped) { h.vy *= H.cutJump; h.jumped = false; } // soltar corta el salto
    // gravedad: flota en la punta si mantenés el salto, cae más rápido de lo que sube
    const g = H.gravity * (h.inWater ? 0.3 : Math.abs(h.vy) < H.apexBand && input.jumpHeld ? H.apexMult : h.vy > 0 ? H.fallMult : 1);
    h.vy = Math.min(h.onWall ? H.wallSlide : h.inWater ? 70 : H.fallMax, h.vy + g * dt);
    if (h.inWater) h.vx *= Math.pow(0.15, dt); // el agua frena
    if (t2dMoveAxis(room, h, h.vx * dt, 0)) h.vx = 0;
    const wasGround = h.onGround, vyBefore = h.vy;
    let hitY = t2dMoveAxis(room, h, 0, h.vy * dt);
    if (hitY && vyBefore < 0) { // la cabeza tocó: si fue solo una esquina, corre y sigue subiendo
        corner: for (const nx of [1, -1]) for (let k = 1; k <= H.corner; k++) {
            const test = { x: h.x + nx * k, y: h.y + vyBefore * dt, w: h.w, h: h.h };
            if (!t2dBoxHits(room, test) && !t2dBoxHits(room, { x: h.x + nx * k, y: h.y, w: h.w, h: h.h })) { h.x += nx * k; h.y = test.y; hitY = false; break corner; }
        }
        if (!hitY) { h.onGround = false; return; }
    }
    h.onGround = hitY && vyBefore >= 0;
    // bajando una pendiente: si recién estaba en el piso y el piso sigue a 1-3 píxeles, se pega (no "salta" cada escalón)
    if (!h.onGround && wasGround && vyBefore >= 0 && !h.jumped) for (let k = 1; k <= T2D.stepUp; k++) if (w2dBoxHits(room, { x: h.x, y: h.y + k, w: h.w, h: h.h })) { h.y += k - 1; h.onGround = true; hitY = true; break; }
    if (hitY) { if (h.vy < 0) h.jumped = false; h.vy = 0; }
    if (h.onGround && !wasGround) h.events.push(vyBefore > H.fallMax * 0.7 ? 'bigLand' : 'land');
}
// ¿Hay pared pegada a un costado? -1 a la izquierda, 1 a la derecha, 0 nada (mira la mitad del cuerpo, no los pies)
function t2dWallDir(w, b) {
    for (const side of [-1, 1]) {
        const x = side > 0 ? Math.ceil(b.x + b.w) : Math.floor(b.x) - 1; let n = 0, t = 0;
        for (let y = Math.floor(b.y + 4); y < b.y + b.h - 6; y++) { t++; if (w2dSolid(w, x, y)) n++; }
        if (t && n / t > 0.6) return side;
    }
    return 0;
}
// ¿Toca un material? (la caja agrandada 1 píxel: espinas, lava, fuego)
function t2dTouches(w, b, m1, m2 = -1) {
    for (let y = Math.floor(b.y) - 1; y <= b.y + b.h; y++) for (let x = Math.floor(b.x) - 1; x <= b.x + b.w; x++) { const m = w2dGet(w, x, y); if (m === m1 || m === m2) return true; }
    return false;
}
function t2dOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
// La caja del tajo según hacia dónde: 'side', 'up', 'down'
function t2dSlashBox(h, aim) {
    const k = h.combo === 3 ? T2D.charge.size : 1, S = { w: T2D.slash.w * k, h: T2D.slash.h * k };
    if (aim === 'up') return { x: h.x + h.w / 2 - S.h / 2, y: h.y - S.w + 4, w: S.h, h: S.w };
    if (aim === 'down') return { x: h.x + h.w / 2 - S.h / 2, y: h.y + h.h - 4, w: S.h, h: S.w };
    return { x: h.facing > 0 ? h.x + h.w - 2 : h.x - S.w + 2, y: h.y + h.h - S.h - 2, w: S.w, h: S.h };
}

// --- EL JUEGO ---
let t2d = null;
function t2dWorld(key) { return T2D_WORLDS[key] || (T2D_WORLDS[key] = w2dFromRows(T2D_ROOMS[key].rows)); }
function t2dEnterRoom(key, from) {
    const room = T2D_ROOMS[key], w = t2dWorld(key), W = w.W, H = w.H, T = T2D.TILE;
    const h = t2d ? t2d.hero : { w: T2D.hero.w, h: T2D.hero.h, vx: 0, vy: 0, facing: 1, hp: T2D.hero.hp, doubleJump: false };
    if (!from) { const p = w.markers.P[0] || { x: 40, y: 40 }; h.x = p.x - h.w / 2; h.y = p.y - h.h; }
    else if (from === 'left') h.x = 2; else if (from === 'right') h.x = W - h.w - 2;
    else if (from === 'down') { h.y = H - h.h - T - 1; h.vy = -T2D.hero.jumpV; } else if (from === 'up') h.y = 2;
    while (w2dBoxHits(w, h) && h.y > 0) h.y--; // que no arranque metido en la piedra
    const mk = (p, kind) => { const D = T2D[kind], e = { kind, x: p.x - D.w / 2, y: p.y - D.h, w: D.w, h: D.h, vx: D.speed, vy: 0, hp: D.hp, hurtAt: -9, state: 'walk', stateAt: 0 }; while (w2dBoxHits(w, e) && e.y > 0) e.y--; return e; };
    const enemies = w.markers.E.map(p => mk(p, 'walker')).concat(w.markers.C.map(p => mk(p, 'charger')));
    const feathers = (t2d && t2d.hero.doubleJump) ? [] : w.markers.F.map(p => ({ x: p.x - 5, y: p.y - 12, w: 10, h: 10 }));
    t2d = Object.assign(t2d || { clock: 0, realClock: 0, msg: null, freeze: 0, shake: 0, parts: [], ghosts: [], squash: { x: 1, y: 1 } }, { key, room, world: w, W, H, hero: h, enemies, feathers, nums: [], flashes: [] });
    t2d.fadeAt = t2d.realClock; // fundido al entrar a la sala
    t2d.cam = { x: Math.max(0, Math.min(W - T2D.VIEW_W, h.x - T2D.VIEW_W / 2)), y: Math.max(0, Math.min(H - T2D.VIEW_H, h.y - T2D.VIEW_H / 2)) };
    t2d.spawn = { x: h.x, y: h.y };
}
function t2dSfx(name) { if (typeof sfx === 'function') sfx(name); }
function t2dDust(x, y, n, spread = 1) {
    for (let i = 0; i < n; i++) t2d.parts.push({ x: x + (Math.random() - 0.5) * 6, y, vx: (Math.random() - 0.5) * 60 * spread, vy: -Math.random() * 30, life: 0.3 + Math.random() * 0.2, at: t2d.clock, color: '#d8d2c4', size: 2 });
}
function t2dSparks(x, y, n, color) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 90; t2d.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.2 + Math.random() * 0.15, at: t2d.clock, color, size: 2 }); }
}
function t2dUpdate(input, dt) {
    const g = t2d, h = g.hero, T = T2D.TILE, F = T2D.feel;
    // pausa de impacto: el mundo se frena un instante (la cámara y las partículas siguen)
    g.realClock += dt;
    if (g.freeze > 0) { g.freeze -= dt; t2dFx(dt); return; }
    g.clock += dt;
    if (h.hp <= 0) { if (g.clock - h.diedAt > 1.2) { const dj = h.doubleJump; t2d = null; t2dEnterRoom('base'); t2d.hero.doubleJump = dj; t2dMsg('Volviste a la puerta de la Torre.'); } return; }
    if ((g.simTick = (g.simTick || 0) + 1) % 2 === 0) w2dStep(g.world); // el mundo de píxeles, 60 veces por segundo
    if (h.sleeping) { // dormido en la arena: cualquier tecla lo despierta
        if (input.left || input.right || input.jump || input.attack || input.dash || input.up || input.down) {
            h.sleeping = false; h.wakeAt = g.clock; g.squash = { x: 0.85, y: 1.15 };
            t2dMsg('Despertaste en una playa, sin recordar nada. A lo lejos, una torre que se pierde en las nubes. (Esc: controles)');
        } else if (g.clock - (h.zzzAt ?? -9) > 0.9) { h.zzzAt = g.clock; g.nums.push({ x: h.x + h.w, y: h.y + 6, text: 'z', at: g.realClock, color: '#f2f0e9' }); }
        t2dFx(dt); return;
    }
    if (g.clock - (h.wakeAt ?? -9) < 0.45) { t2dFx(dt); return; } // levantándose
    t2dStepHero(g.world, h, input, dt);
    // lo que pasó en el paso: polvo, estirar y aplastar, sonido
    (h.events || []).forEach(ev => {
        const fx = h.x + h.w / 2, fy = h.y + h.h;
        if (ev === 'jump' || ev === 'doubleJump') { g.squash = { x: 1 - F.squash, y: 1 + F.squash }; t2dDust(fx, fy, ev === 'jump' ? 5 : 8); t2dSfx('swing'); }
        if (ev === 'land' || ev === 'bigLand') { h.landAt = g.clock; g.squash = { x: 1 + F.squash, y: 1 - F.squash }; t2dDust(fx, fy, ev === 'bigLand' ? 10 : 5, 1.5); if (ev === 'bigLand') g.shake = Math.max(g.shake, F.shake * 0.8); }
        if (ev === 'turn') t2dDust(fx, fy, 3);
        if (ev === 'wallJump') { g.squash = { x: 1 - F.squash, y: 1 + F.squash }; t2dDust(h.lastWall > 0 ? h.x + h.w : h.x, h.y + h.h / 2, 6); t2dSfx('swing'); }
        if (ev === 'dash') { g.squash = { x: 1 + F.squash, y: 1 - F.squash * 0.6 }; t2dSfx('dash'); }
    });
    h.events = [];
    if (h.onWall && Math.floor(g.clock * 20) % 3 === 0) t2dDust(h.onWall > 0 ? h.x + h.w : h.x, h.y + 6, 1, 0.3); // polvo de la pared al bajar
    if (h.onGround && Math.abs(h.vx) > 80 && g.clock - (h.stepDustAt || 0) > 0.14) { h.stepDustAt = g.clock; t2dDust(h.x + h.w / 2 - h.facing * 3, h.y + h.h, 1, 0.4); } // polvo al correr
    if (g.clock < (h.dashUntil || 0) && Math.floor(g.clock * 60) % 2 === 0) g.ghosts.push({ x: h.x, y: h.y, facing: h.facing, frame: t2dHeroFrame(h, g.clock), at: g.realClock });
    // salir por un borde: la sala vecina
    const ex = g.room.exits;
    if (h.x + h.w < 0 && ex.left) return t2dEnterRoom(ex.left, 'right');
    if (h.x > g.W && ex.right) return t2dEnterRoom(ex.right, 'left');
    if (h.y + h.h < 0 && ex.up) return t2dEnterRoom(ex.up, 'down');
    if (h.y > g.H && ex.down) return t2dEnterRoom(ex.down, 'up');
    if (h.y > g.H + 40) { h.x = g.spawn.x; h.y = g.spawn.y; h.vx = h.vy = 0; t2dHurt(1, 0); }
    // el ataque: combo de 3 tajos, hacia arriba (↑) o hacia abajo (↓ en el aire)
    const C = T2D.charge;
    if (input.attack) h.pressAt = g.clock;
    if (input.attack && g.clock - (h.attackAt ?? -9) >= T2D.hero.attackGap) {
        h.aim = input.up ? 'up' : input.down && !h.onGround ? 'down' : 'side';
        h.combo = h.aim === 'side' && g.clock - (h.attackAt ?? -9) < T2D.hero.comboWindow ? ((h.combo ?? -1) % 3 + 1) % 3 : 0;
        h.attackAt = g.clock; h.hitThisSwing = new Set(); h.pogoDone = false; h.dug = false;
        t2dSfx('swing');
    }
    // golpe cargado: mantené el tajo; brilla al estar listo; al soltar sale el golpe grande hacia adelante
    if (input.attackHeld && !h.charging && g.clock - (h.pressAt ?? -9) > C.start && g.clock >= (h.dashUntil || 0)) h.charging = true;
    if (h.charging && input.attackHeld && g.clock - h.pressAt >= C.full && !h.chargeReady) { h.chargeReady = true; t2dSparks(h.x + h.w / 2, h.y + 6, 8, '#ffd166'); t2dSfx('cast'); }
    if (h.charging && !input.attackHeld) {
        if (h.chargeReady) {
            h.aim = 'side'; h.combo = 3; h.attackAt = g.clock; h.hitThisSwing = new Set(); h.dug = false; h.lungeUntil = (h.t || 0) + C.lungeTime;
            g.shake = Math.max(g.shake, F.shake); t2dSfx('crit');
        }
        h.charging = false; h.chargeReady = false;
    }
    const at = g.clock - (h.attackAt ?? -9), S = T2D.slash;
    if (at >= S.active[0] && at <= S.active[1]) {
        const box = t2dSlashBox(h, h.aim);
        g.enemies.forEach(e => {
            if (e.hp <= 0 || h.hitThisSwing.has(e) || !t2dOverlap(box, e)) return;
            h.hitThisSwing.add(e);
            e.hp -= S.dmg[h.combo] || 1; e.hurtAt = g.clock;
            const kx = h.aim === 'side' ? h.facing : Math.sign(e.x + e.w / 2 - (h.x + h.w / 2)) || h.facing;
            e.vx = kx * T2D.walker.speed; e.knockVx = kx * T2D.walker.knock; e.knockUntil = g.clock + 0.15; e.vy = h.aim === 'up' ? -150 : -60;
            const heavy = h.combo >= 2 ? (h.combo === 3 ? 2.2 : 1.5) : 1;
            g.freeze = F.hitStop * heavy; g.shake = Math.max(g.shake, F.shake * heavy);
            if (e.kind === 'charger' && e.state !== 'stun') { e.state = 'walk'; e.stateAt = g.clock; } // pegarle corta su embestida
            t2dSparks(e.x + e.w / 2, e.y + e.h / 2, e.hp <= 0 ? 14 : 7, e.hp <= 0 ? '#ffd166' : '#ffffff');
            g.flashes.push({ x: (Math.max(box.x, e.x) + Math.min(box.x + box.w, e.x + e.w)) / 2, y: e.y + e.h / 2, at: g.realClock, big: heavy > 1 });
            g.nums.push({ x: e.x + e.w / 2, y: e.y - 2, text: String(T2D.slash.dmg[h.combo] || 1), at: g.realClock, color: heavy > 1 ? '#ffd166' : '#f2f0e9' });
            t2dSfx(e.hp <= 0 ? 'crit' : 'hit');
            if (h.aim === 'side' && h.combo !== 3) h.vx -= h.facing * T2D.hero.recoil; // retroceso: el golpe empuja también al que pega
            if (h.aim === 'down') t2dPogo(h);
        });
        // el tajo hacia abajo también rebota en las espinas
        if (h.aim === 'down' && !h.pogoDone && t2dTouches(g.world, box, MAT.SPIKE)) { t2dPogo(h); t2dSparks(h.x + h.w / 2, box.y + box.h, 6, '#c9ccd1'); }
        // el tajo rompe la tierra y la arena; el golpe cargado, también piedra y madera
        if (!h.dug) { h.dug = true; const n = w2dDig(g.world, box, h.combo === 3); if (n) { t2dDust(box.x + box.w / 2, box.y + box.h / 2, Math.min(12, 2 + n / 20), 1.5); t2dSfx('hit'); } }
    }
    if (input.parry) t2dParry(h, g.clock);
    // espinas, lava y fuego: lastiman y te tiran para arriba
    if (t2dTouches(g.world, h, MAT.SPIKE, MAT.LAVA) || w2dBoxFraction(g.world, h, MAT.FIRE) > 0.1) { if (g.clock >= (h.invulnUntil || 0)) { t2dHurt(1, -h.facing); h.vy = -T2D.hero.jumpV * 0.7; } }
    // enemigos: caminan y se dan vuelta en las paredes y los bordes; al recibir un golpe salen despedidos
    g.enemies.forEach(e => {
        if (e.hp <= 0) return;
        const D = T2D[e.kind], knocked = g.clock < (e.knockUntil || 0), dir = Math.sign(e.vx) || 1, since = g.clock - e.stateAt;
        e.vy = Math.min(T2D.hero.fallMax, (e.vy || 0) + T2D.hero.gravity * dt);
        t2dUnstick(g.world, e);
        if (t2dMoveAxis(g.world, e, 0, e.vy * dt)) e.vy = 0;
        // el embestidor: te ve a su altura → se prepara (avisa con un "!") → embiste derecho → descansa
        if (e.kind === 'charger' && !knocked) {
            const seen = Math.abs(h.x - e.x) < D.sight && Math.abs((h.y + h.h) - (e.y + e.h)) < 20;
            if (e.state === 'walk' && seen && since > D.rest) { e.state = 'windup'; e.stateAt = g.clock; e.vx = Math.sign(h.x - e.x) * D.speed || D.speed; t2dSfx('tick'); }
            else if (e.state === 'windup' && since > D.windup) { e.state = 'rush'; e.stateAt = g.clock; t2dSfx('dash'); }
            else if (e.state === 'rush' && since > D.rushTime) { e.state = 'walk'; e.stateAt = g.clock; }
            else if (e.state === 'stun' && since > T2D.parry.stun) { e.state = 'walk'; e.stateAt = g.clock; }
        }
        const speed = knocked ? e.knockVx : e.state === 'windup' || e.state === 'stun' ? 0 : e.state === 'rush' ? Math.sign(e.vx) * D.rush : dir * D.speed;
        const fx = dir > 0 ? e.x + e.w + 1 : e.x - 2; let groundAhead = false; // ¿hay piso adelante (hasta 8 px abajo: las pendientes cuentan)? si no, se da vuelta
        for (let k = 1; k <= 8 && !groundAhead; k++) groundAhead = w2dSolid(g.world, fx, e.y + e.h + k);
        const steady = e.state === 'windup' || e.state === 'stun'; // preparándose o aturdido: no se da vuelta
        if ((t2dMoveAxis(g.world, e, speed * dt, 0) && !steady) || (!knocked && e.state === 'walk' && !groundAhead)) {
            e.vx = -dir * D.speed;
            if (e.state === 'rush') { e.state = 'walk'; e.stateAt = g.clock; g.shake = Math.max(g.shake, F.shake * 0.6); t2dDust(e.x + e.w / 2, e.y + e.h, 6); } // se dio contra la pared
        }
        if (e.state === 'rush' && !groundAhead) { e.state = 'walk'; e.stateAt = g.clock; e.vx = -dir * D.speed; } // no se tira por el borde
        if (t2dOverlap(h, e) && g.clock >= (h.dashUntil || 0) && e.state !== 'stun') t2dHurt(e.state === 'rush' ? 2 : 1, Math.sign(h.x - e.x) || 1, e);
    });
    g.enemies.filter(e => e.hp <= 0 && !e.gone).forEach(e => { e.gone = true; t2dSparks(e.x + e.w / 2, e.y + e.h / 2, 10, '#6a994e'); });
    // la Pluma de Arén: doble salto (el camino al mirador)
    g.feathers = g.feathers.filter(f => { if (!t2dOverlap(h, f)) return true; h.doubleJump = true; t2dSfx('levelup'); t2dMsg('🪶 La Pluma de Arén: ahora podés saltar otra vez en el aire. Arriba se abre el mirador.'); return false; });
    t2dFx(dt);
}
function t2dPogo(h) { if (h.pogoDone) return; h.pogoDone = true; h.vy = -T2D.hero.jumpV * T2D.hero.pogo; h.jumped = false; h.airDash = true; if (h.doubleJump) h.jumpsLeft = 1; }
// Cámara, temblor, estirar/aplastar, partículas y estelas (corren también durante la pausa de impacto)
function t2dFx(dt) {
    const g = t2d, h = g.hero, F = T2D.feel, VW = T2D.VIEW_W, VH = T2D.VIEW_H;
    const tx = Math.max(0, Math.min(g.W - VW, h.x + h.w / 2 - VW / 2 + h.facing * F.camLook)), ty = Math.max(0, Math.min(g.H - VH, h.y + h.h / 2 - VH / 2 - (g.room.camUp || 10))); // camUp: cuánto más mira para arriba
    const k = 1 - Math.exp(-F.camLerp * dt);
    g.cam.x += (tx - g.cam.x) * k; g.cam.y += (ty - g.cam.y) * k;
    g.shake *= Math.pow(0.002, dt);
    const s = 1 - Math.exp(-14 * dt); g.squash.x += (1 - g.squash.x) * s; g.squash.y += (1 - g.squash.y) * s;
    g.parts = g.parts.filter(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; return g.clock - p.at < p.life; });
    g.ghosts = g.ghosts.filter(gh => g.realClock - gh.at < 0.18);
    g.nums = g.nums.filter(n => g.realClock - n.at < 0.7); g.flashes = g.flashes.filter(f => g.realClock - f.at < 0.1);
}
function t2dHurt(n, dir, src) {
    const g = t2d, h = g.hero;
    if (g.clock < (h.invulnUntil || 0)) return;
    if (src && g.clock - (h.parryAt ?? -9) <= T2D.parry.window) { // ¡parada!
        h.parryAt = -9; h.invulnUntil = g.clock + 0.3;
        src.state = 'stun'; src.stateAt = g.clock; src.knockVx = -dir * T2D.walker.knock; src.knockUntil = g.clock + 0.2;
        g.freeze = T2D.feel.hitStop * 2; g.shake = Math.max(g.shake, T2D.feel.shake * 1.5);
        t2dSparks(h.x + h.w / 2 - dir * 6, h.y + h.h / 2, 14, '#7fd8ff'); t2dSfx('crit'); t2dMsg('¡Parada!');
        return;
    }
    h.hp -= n; h.invulnUntil = g.clock + T2D.hero.iframes; h.hurtAt = g.clock;
    h.vx = dir * T2D.hero.knock; h.vy = -T2D.hero.knock; h.dashUntil = 0;
    g.freeze = T2D.feel.hurtStop; g.shake = T2D.feel.hurtShake;
    t2dSfx('heroHit');
    if (h.hp <= 0) { h.diedAt = g.clock; t2dSfx('lose'); }
}
function t2dMsg(text) { if (t2d) t2d.msg = { text, at: t2d.clock }; }

// --- DIBUJO ---
const t2dArtCache = {};
function t2dHeroSprite(name) {
    if (t2dArtCache[name]) return t2dArtCache[name];
    const F = HERO_ART.frames[name], c = document.createElement('canvas');
    c.width = F.rows[0].length; c.height = F.rows.length;
    const g = c.getContext('2d');
    F.rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = HERO_ART.pal[ch]; g.fillRect(x, y, 1, 1); } }));
    return (t2dArtCache[name] = { img: c, ax: F.ax });
}
function t2dHeroFrame(h, clock) {
    if (h.sleeping) return 'sleep';
    if (clock - (h.wakeAt ?? -9) < 0.45) return 'land'; // se levanta
    const at = clock - (h.attackAt ?? -9);
    if (at < 0.24) {
        if (h.aim === 'up') return at < 0.08 ? 'ready' : 'raise';
        if (h.aim === 'down') return at < 0.08 ? 'raise' : 'slashA';
        return ([['ready', 'slashA', 'recover'], ['ready', 'slashB', 'recover'], ['raise', 'slashA', 'recover']][Math.min(2, h.combo || 0)])[Math.min(2, Math.floor(at / 0.08))];
    }
    if (clock < (h.blockFrameUntil || 0)) return 'block';
    if (h.charging) return 'ready';
    if (clock - (h.hurtAt ?? -9) < 0.25) return 'hurt';
    if (clock < (h.dashUntil || 0)) return 'dash';
    if (h.onWall) return 'wall';
    if (!h.onGround) return h.vy < -60 ? 'jump' : h.vy > 60 ? 'fall' : 'apex';
    if (clock - (h.landAt ?? -9) < 0.09) return 'land';
    const sp = Math.abs(h.vx);
    if (sp > 10) return ['walk1', 'walk2', 'walk3'][Math.floor(clock * (sp > 90 ? 14 : 9)) % 3]; // corriendo, el ciclo va más rápido
    return 'idle';
}
function t2dDrawHero(ctx, h, frame, sx, sy, alpha) {
    const s = t2dHeroSprite(frame), fx = Math.round(h.x + h.w / 2), fy = Math.round(h.y + h.h), face = frame === 'wall' ? -(h.onWall || h.facing) : h.facing; // en la pared, mira hacia afuera
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(fx, fy); ctx.scale((face < 0 ? -1 : 1) * sx, sy);
    ctx.drawImage(s.img, -Math.round(s.ax), -s.img.height); ctx.restore();
}
function t2dDraw(ctx, scale) {
    const g = t2d, h = g.hero, T = T2D.TILE, VW = T2D.VIEW_W, VH = T2D.VIEW_H;
    const sh = g.shake > 0.2 ? g.shake : 0;
    const camX = Math.round(g.cam.x + (Math.random() - 0.5) * sh), camY = Math.round(g.cam.y + (Math.random() - 0.5) * sh);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.scale(scale, scale);
    if (g.room.bg === 'beach') t2dBeachSky(ctx, camX, camY, g.realClock);
    else { ctx.fillStyle = '#9a93ab'; ctx.fillRect(0, 0, VW, VH); } // fondo claro: el encapuchado es oscuro y tiene que recortarse
    if (g.room.bg !== 'beach') for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(70,62,85,0.25)'; ctx.fillRect(((i * 97 - camX * 0.3) % (VW + 60) + VW + 60) % (VW + 60) - 30, 20 + (i % 3) * 30, 18, VH); } // columnas al fondo (paralaje)
    ctx.translate(-camX, -camY);
    w2dFlicker(g.world); ctx.drawImage(w2dRender(g.world), 0, 0); // el mundo de píxeles (js/tower2dWorld.js)
    g.feathers.forEach(f => { ctx.fillStyle = '#ffd166'; ctx.fillRect(f.x + 3, f.y + Math.sin(g.clock * 3) * 2, 4, 10); ctx.fillStyle = '#fff3c4'; ctx.fillRect(f.x + 4, f.y + 1 + Math.sin(g.clock * 3) * 2, 2, 6); });
    g.enemies.forEach(e => { if (e.hp <= 0) return; const base = e.kind === 'charger' ? (e.state === 'stun' ? '#7fd8ff' : '#bc6c25') : '#6a994e';
        const wob = e.state === 'windup' ? Math.round(Math.sin(g.clock * 60)) : 0;
        if (e.state === 'windup') { ctx.fillStyle = '#ff2a1f'; ctx.fillRect(e.x + e.w / 2 - 1, e.y - 12, 2, 6); ctx.fillRect(e.x + e.w / 2 - 1, e.y - 4, 2, 2); } // el aviso
        ctx.save(); ctx.translate(wob, 0); ctx.fillStyle = g.clock - e.hurtAt < 0.1 ? '#ffffff' : base; ctx.fillRect(e.x, e.y + 2, e.w, e.h - 2); ctx.fillRect(e.x + 2, e.y, e.w - 4, 2); ctx.fillStyle = e.state === 'windup' || e.state === 'rush' ? '#ff2a1f' : '#1d1712'; ctx.fillRect(e.x + (e.vx > 0 ? e.w - 5 : 2), e.y + 4, 2, 2); ctx.restore(); });
    // estelas del dash
    g.ghosts.forEach(gh => t2dDrawHero(ctx, gh, gh.frame, 1, 1, 0.35 * (1 - (g.realClock - gh.at) / 0.18)));
    // el héroe: si recién lo golpearon, titila
    if (!(h.invulnUntil > g.clock && Math.floor(g.clock * 20) % 2) && h.hp > 0) t2dDrawHero(ctx, h, t2dHeroFrame(h, g.clock), g.squash.x, g.squash.y, 1);
    if (h.charging) { ctx.globalAlpha = h.chargeReady ? 0.6 + 0.4 * Math.sin(g.clock * 30) : 0.35; ctx.fillStyle = h.chargeReady ? '#ffd166' : '#f2f0e9'; ctx.fillRect(h.x - 2, h.y - 4, h.w + 4, 2); ctx.globalAlpha = 1; } // la carga, sobre la capucha
    // la estela del tajo (arco blanco hacia donde pega)
    const at = g.clock - (h.attackAt ?? -9);
    if (at < 0.14 && h.hp > 0) {
        const b = t2dSlashBox(h, h.aim), cx = h.x + h.w / 2, cy = h.y + h.h / 2, k = at / 0.14;
        const base = h.aim === 'up' ? -Math.PI / 2 : h.aim === 'down' ? Math.PI / 2 : h.facing > 0 ? 0 : Math.PI;
        const swing = (h.combo === 1 ? -1 : 1) * (h.aim === 'side' && h.facing < 0 ? -1 : 1);
        ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = h.combo >= 2 ? '#ffd166' : '#f2f0e9'; ctx.lineWidth = h.combo === 3 ? 6 : h.combo === 2 ? 4 : 3;
        ctx.beginPath(); ctx.arc(cx, cy, Math.max(b.w, b.h) * 0.75, base - 1.1 * swing, base - 1.1 * swing + 2.2 * swing * Math.min(1, k * 2.5), swing < 0); ctx.stroke(); ctx.restore();
    }
    g.flashes.forEach(f => { const k = (g.realClock - f.at) / 0.1; ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(f.x, f.y, (f.big ? 9 : 6) * (0.5 + k), 0, Math.PI * 2); ctx.fill(); });
    ctx.font = 'bold 7px monospace'; g.nums.forEach(n => { const k = (g.realClock - n.at) / 0.7; ctx.globalAlpha = 1 - k * k; ctx.fillStyle = '#1d1712'; ctx.fillText(n.text, n.x - 2 + 1, n.y - k * 14 + 1); ctx.fillStyle = n.color; ctx.fillText(n.text, n.x - 2, n.y - k * 14); });
    if (g.debug) { // tecla H: las cajas de choque (lo que de verdad choca), encima del dibujo
        ctx.lineWidth = 1; // (el terreno ya es exacto: lo que se ve es lo que choca)
        ctx.strokeStyle = '#ff00ff'; ctx.strokeRect(h.x + 0.5, h.y + 0.5, h.w - 1, h.h - 1);
        ctx.strokeStyle = '#ffaa00'; g.enemies.forEach(e => { if (e.hp > 0) ctx.strokeRect(e.x + 0.5, e.y + 0.5, e.w - 1, e.h - 1); });
        if (g.clock - (h.attackAt ?? -9) < T2D.slash.active[1]) { const b = t2dSlashBox(h, h.aim); ctx.strokeStyle = '#ff3333'; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1); }
    }
    g.parts.forEach(p => { ctx.globalAlpha = Math.max(0, 1 - (g.clock - p.at) / p.life); ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size); });
    ctx.globalAlpha = 1;
    ctx.restore();
    // interfaz (en píxeles del dibujo, así se ve igual con cualquier zoom): vida, nombre de la sala, mensajes
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.scale(scale, scale);
    for (let i = 0; i < T2D.hero.hp; i++) { ctx.fillStyle = '#1d1712'; ctx.fillRect(5 + i * 9, 5, 8, 8); ctx.fillStyle = i < h.hp ? '#ff2a1f' : '#4a3a3a'; ctx.fillRect(6 + i * 9, 6, 6, 6); }
    ctx.font = '7px monospace'; ctx.fillStyle = '#1d1712'; ctx.fillText(g.room.name + (h.doubleJump ? ' · doble salto' : '') + ' · T: ajustes', 6, 22);
    if (g.msg && g.clock - g.msg.at < 5) {
        const words = g.msg.text.split(' '), lines = [''];
        words.forEach(w => { if (ctx.measureText(lines[lines.length - 1] + ' ' + w).width > VW - 12) lines.push(w); else lines[lines.length - 1] += (lines[lines.length - 1] ? ' ' : '') + w; });
        ctx.fillStyle = 'rgba(20,16,26,0.8)'; ctx.fillRect(0, 27, VW, lines.length * 9 + 5); // arriba: abajo está el piso
        ctx.fillStyle = '#ffd166'; lines.forEach((l, i) => ctx.fillText(l, 6, 36 + i * 9));
    }
    if (h.hp <= 0) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#ff2a1f'; ctx.font = '14px monospace'; ctx.fillText('Caíste', VW / 2 - 24, VH / 2); }
    const fade = 1 - (g.realClock - g.fadeAt) / 0.25; if (fade > 0) { ctx.fillStyle = `rgba(10,8,14,${fade.toFixed(2)})`; ctx.fillRect(0, 0, VW, VH); } // fundido entre salas
    if (g.paused) {
        ctx.fillStyle = 'rgba(10,8,14,0.75)'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#ffd166'; ctx.font = 'bold 12px monospace'; ctx.fillText('PAUSA', VW / 2 - 18, 40);
        ctx.font = '7px monospace'; ctx.fillStyle = '#f2f0e9';
        ['A / D: moverte', 'Espacio: saltar (mantené para más alto)', 'J o clic: tajo · W: arriba · S en el aire: abajo (rebota)', 'Mantené el tajo: golpe cargado', 'Shift o clic derecho: dash', 'E: parada (justo antes del golpe)', 'Contra una pared en el aire: deslizar y saltar', 'T: ajustes · Esc: seguir'].forEach((l, i) => ctx.fillText(l, 40, 62 + i * 11));
    }
    ctx.restore();
}

// --- PANEL DE AJUSTE (tecla T): los números de la sensación, en vivo; se guardan en este navegador ---
function t2dTunePanel(el) {
    const save = () => { try { localStorage.setItem('t2d-feel', JSON.stringify(Object.fromEntries(T2D_TUNED.map(k => [k, T2D[k]])))); } catch (e) { /* no se guarda */ } };
    const render = () => {
        el.innerHTML = '<b>Ajustes del personaje</b> <small>(T para cerrar · se guardan en este navegador)</small>' +
            T2D_TUNE.map(([grp, key, name, min, max, step], i) => `<label>${name} <span>${+T2D[grp][key].toFixed(3)}</span><input type="range" data-i="${i}" min="${min}" max="${max}" step="${step}" value="${T2D[grp][key]}"></label>`).join('') +
            '<button>Volver a los valores de fábrica</button>';
        el.querySelectorAll('input').forEach(inp => inp.oninput = () => {
            const [grp, key] = T2D_TUNE[inp.dataset.i]; T2D[grp][key] = +inp.value; inp.previousElementSibling.textContent = +(+inp.value).toFixed(3); save();
        });
        el.querySelector('button').onclick = () => { T2D_TUNED.forEach(k => Object.assign(T2D[k], T2D_DEFAULTS[k])); save(); render(); };
    };
    render();
}

// --- ARRANQUE (torre2d.html) ---
async function t2dStart(canvas, panel) {
    const ctx = canvas.getContext('2d'), keys = {}, scale = Math.max(2, Math.floor(Math.min(window.innerWidth / T2D.VIEW_W, (window.innerHeight - 40) / T2D.VIEW_H)));
    canvas.width = T2D.VIEW_W * scale; canvas.height = T2D.VIEW_H * scale;
    const pressed = {};
    const map = k => ({ a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', s: 'down', arrowdown: 'down', w: 'up', arrowup: 'up', ' ': 'jump', k: 'jump', j: 'attack', x: 'attack', shift: 'dash', l: 'dash', c: 'jump', z: 'attack', e: 'parry', i: 'parry' })[k];
    window.addEventListener('keydown', e => {
        if (e.key === 'Escape' && t2d) { t2d.paused = !t2d.paused; return; }
        if (e.key.toLowerCase() === 'h' && t2d) { t2d.debug = !t2d.debug; return; } // ver las cajas de choque
        if (e.key.toLowerCase() === 't' && panel) { panel.hidden = !panel.hidden; if (!panel.hidden) t2dTunePanel(panel); return; }
        const a = map(e.key.toLowerCase()); if (!a || e.target.tagName === 'INPUT') return; e.preventDefault(); if (!keys[a]) pressed[a] = true; keys[a] = true;
    });
    window.addEventListener('keyup', e => { const a = map(e.key.toLowerCase()); if (a) keys[a] = false; });
    canvas.addEventListener('mousedown', e => { if (e.button === 0) { pressed.attack = true; keys.attack = true; } if (e.button === 2) pressed.dash = true; });
    window.addEventListener('mouseup', e => { if (e.button === 0) keys.attack = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    const loads = Object.keys(T2D_ROOMS).map(key => new Promise(done => {
        const img = new Image();
        img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); try { T2D_WORLDS[key] = w2dFromImage(g.getImageData(0, 0, img.width, img.height)); } catch (e) { /* sin permiso de leer la imagen (abierto como archivo): bloques */ } done(); };
        img.onerror = () => done(); // sin imagen: se arma desde las filas de bloques
        img.src = `torre2d/salas/${key}.png`;
    }));
    await Promise.all(loads);
    t2dEnterRoom('playa'); t2d.hero.sleeping = true;
    t2dMsg('Zzz… (cualquier tecla para despertar)');
    let last = performance.now(), acc = 0;
    const frame = now => {
        acc += Math.min(0.1, (now - last) / 1000); last = now;
        if (t2d.paused) acc = 0;
        while (acc >= T2D.DT) {
            t2dUpdate({ left: keys.left, right: keys.right, up: keys.up, down: keys.down, jump: !!pressed.jump, jumpHeld: !!keys.jump, attack: !!pressed.attack, attackHeld: !!keys.attack, dash: !!pressed.dash, parry: !!pressed.parry }, T2D.DT);
            pressed.jump = pressed.attack = pressed.dash = pressed.parry = false; acc -= T2D.DT;
        }
        t2dDraw(ctx, scale);
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
}

// La parada (E): abre una ventana corta; si algo te pega adentro, no te hace daño y lo deja aturdido (t2dHurt)
function t2dParry(h, clock) {
    if (clock < (h.parryReadyAt || 0) || h.hp <= 0) return false;
    h.parryAt = clock; h.parryReadyAt = clock + T2D.parry.cd; h.blockFrameUntil = clock + 0.25;
    return true;
}

// El cielo de la playa: degradé, sol, nubes que pasan, el mar en el horizonte y la torre a lo lejos (paralaje)
function t2dBeachSky(ctx, camX, camY, t) {
    const VW = T2D.VIEW_W, VH = T2D.VIEW_H, sky = ctx.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, '#7fb8e0'); sky.addColorStop(0.7, '#cfe6ef'); sky.addColorStop(1, '#f2e6c9');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#fff4c2'; ctx.beginPath(); ctx.arc(60 - camX * 0.05, 34 - camY * 0.05, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 4; i++) { const x = ((i * 120 + t * 4 - camX * 0.15) % (VW + 80) + VW + 80) % (VW + 80) - 40; ctx.fillRect(x, 18 + i * 9, 34, 5); ctx.fillRect(x + 6, 15 + i * 9, 18, 4); }
    ctx.fillStyle = '#5a7a9a'; const tx = 250 - camX * 0.2; ctx.fillRect(tx, -10, 14, VH * 0.8); ctx.fillRect(tx - 3, -10, 20, 10); // la torre, perdida en las nubes
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(tx - 10, 4, 40, 6);
    ctx.fillStyle = '#3f7fb8'; ctx.fillRect(0, VH * 0.62 - camY * 0.1, VW, 3); // el horizonte del mar
}
