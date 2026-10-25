// Infinite Tower 2D — prototipo (pedido del usuario 2026-10-25: "pasar Infinite Tower a 2D lateral"; estilo metroidvania
// conectado, como Hollow Knight; modo nuevo en paralelo: la Torre de vista desde arriba sigue jugable).
//
//   · Salas hechas a mano y conectadas: salís por un borde y entrás a la sala vecina.
//   · Movimiento con sensación de plataformas modernas: aceleración, salto que se corta al soltar, tiempo de coyote
//     (podés saltar un instante después de dejar el borde) y salto guardado (si lo apretás justo antes de tocar el piso).
//   · Plataformas que se atraviesan desde abajo (y se bajan con ↓ + salto), pinchos.
//   · El héroe encapuchado dibujado (js/towerHeroArt.js: sus cuadros ya son de costado) con el combo de 3 tajos.
//   · Metroidvania: la Pluma de Arén da el doble salto y abre el camino a la sala alta.
// Se juega en torre2d.html. Las funciones de física son puras (T2D.step) y tienen pruebas en js/tests.js.

const T2D = {
    TILE: 16, VIEW_W: 320, VIEW_H: 180, DT: 1 / 120,
    // el héroe (en píxeles del dibujo)
    hero: { w: 10, h: 22, accel: 1400, airAccel: 900, friction: 1600, maxRun: 115, jumpV: 300, gravity: 900, fallMax: 380,
        cutJump: 0.45, coyote: 0.1, buffer: 0.12, hp: 5, iframes: 1, knock: 160, attackGap: 0.32, comboWindow: 0.6 },
    slash: { w: 26, h: 20, dmg: [1, 1, 2], active: [0.05, 0.16] },
    walker: { w: 14, h: 12, speed: 30, hp: 3 }
};

// --- LAS SALAS (hechas a mano). # piedra · = plataforma que se atraviesa · ^ pinchos · P entrada · E caminante ·
//     F la Pluma de Arén (doble salto). Los bordes abiertos llevan a la sala que dice `exits`.
const T2D_ROOMS = {
    base: { name: 'La puerta de la Torre', exits: { right: 'salon' }, rows: [
        '########################################',
        '#......................................#',
        '#......................................#',
        '#......................................#',
        '#......................................#',
        '#......................................#',
        '#.....................======...........#',
        '#......................................#',
        '#..............====....................#',
        '#......................................#',
        '#.....=====...........................',
        '#.....................................',
        '#..P.............E..........^^^.......',
        '########################################'] },
    salon: { name: 'El Atrio Verde', exits: { left: 'base', up: 'alto' }, rows: [
        '###############################...######',
        '#..............................F.......#',
        '#............................=====.....#',
        '#......................................#',
        '#.....................=====............#',
        '#......................................#',
        '#..............====....................#',
        '#......................................#',
        '#.......====...........................#',
        '.......................................#',
        '.......................................#',
        '..........E.............E..............#',
        '#.....................^^^..............#',
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
        '#......................................#',
        '#..........................E...........#',
        '#......................................#',
        '###############################...######'] }
};

// --- FÍSICA (pura: sin dibujar; se prueba en js/tests.js) ---
function t2dTile(room, tx, ty) { const r = room.rows[ty]; return r === undefined ? (ty < 0 ? '.' : '#') : (r[tx] === undefined ? '.' : r[tx]); }
function t2dSolid(c) { return c === '#'; }
// Choca una caja contra la grilla moviéndose por un eje. Devuelve true si tocó algo.
function t2dMoveAxis(room, b, dx, dy, dropping) {
    const T = T2D.TILE;
    if (dx) {
        b.x += dx;
        const tx = Math.floor((dx > 0 ? b.x + b.w - 0.01 : b.x) / T);
        for (let ty = Math.floor(b.y / T); ty <= Math.floor((b.y + b.h - 0.01) / T); ty++)
            if (t2dSolid(t2dTile(room, tx, ty))) { b.x = dx > 0 ? tx * T - b.w : (tx + 1) * T; return true; }
    }
    if (dy) {
        const prevBottom = b.y + b.h;
        b.y += dy;
        const ty = Math.floor((dy > 0 ? b.y + b.h - 0.01 : b.y) / T);
        for (let tx = Math.floor(b.x / T); tx <= Math.floor((b.x + b.w - 0.01) / T); tx++) {
            const c = t2dTile(room, tx, ty);
            const oneWay = c === '=' && dy > 0 && !dropping && prevBottom <= ty * T + 0.01; // la plataforma solo frena desde arriba
            if (t2dSolid(c) || oneWay) { b.y = dy > 0 ? ty * T - b.h : (ty + 1) * T; return true; }
        }
    }
    return false;
}
// Un paso del héroe. input: { left, right, jump (apretado ahora), jumpHeld, down }
function t2dStepHero(room, h, input, dt) {
    const H = T2D.hero, dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    h.t = (h.t || 0) + dt;
    if (dir) { h.vx += dir * (h.onGround ? H.accel : H.airAccel) * dt; h.facing = dir; }
    else if (h.onGround) { const f = H.friction * dt; h.vx = Math.abs(h.vx) <= f ? 0 : h.vx - Math.sign(h.vx) * f; }
    h.vx = Math.max(-H.maxRun, Math.min(H.maxRun, h.vx));
    if (h.onGround) { h.coyoteUntil = h.t + H.coyote; h.jumpsLeft = h.doubleJump ? 1 : 0; }
    if (input.jump) h.bufferUntil = h.t + H.buffer;
    const dropping = input.down && input.jump && h.onGround && t2dStandingOn(room, h) === '=';
    if (dropping) { h.y += 2; h.bufferUntil = 0; h.dropUntil = h.t + 0.2; }
    else if (h.bufferUntil > h.t && (h.t <= h.coyoteUntil || h.jumpsLeft > 0)) {
        if (h.t > h.coyoteUntil) h.jumpsLeft--; // en el aire: gasta el doble salto
        h.vy = -H.jumpV; h.bufferUntil = 0; h.coyoteUntil = 0; h.jumped = true;
    }
    if (!input.jumpHeld && h.vy < 0 && h.jumped) { h.vy *= H.cutJump; h.jumped = false; } // soltar corta el salto
    h.vy = Math.min(H.fallMax, h.vy + H.gravity * dt);
    if (t2dMoveAxis(room, h, h.vx * dt, 0)) h.vx = 0;
    const hitY = t2dMoveAxis(room, h, 0, h.vy * dt, h.t < (h.dropUntil || 0));
    h.onGround = hitY && h.vy > 0;
    if (hitY) { if (h.vy < 0) h.jumped = false; h.vy = 0; }
}
function t2dStandingOn(room, b) { const T = T2D.TILE; return t2dTile(room, Math.floor((b.x + b.w / 2) / T), Math.floor((b.y + b.h + 1) / T)); }
function t2dOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function t2dFind(room, ch) { const out = []; room.rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === ch) out.push({ x, y }); })); return out; }

// --- EL JUEGO ---
let t2d = null;
function t2dEnterRoom(key, from) {
    const room = T2D_ROOMS[key], T = T2D.TILE, W = room.rows[0].length * T, H = room.rows.length * T;
    const h = t2d ? t2d.hero : { w: T2D.hero.w, h: T2D.hero.h, vx: 0, vy: 0, facing: 1, hp: T2D.hero.hp, doubleJump: false };
    if (!from) { const p = t2dFind(room, 'P')[0] || { x: 2, y: 2 }; h.x = p.x * T + 3; h.y = (p.y + 1) * T - h.h; }
    else if (from === 'left') h.x = 2; else if (from === 'right') h.x = W - h.w - 2;
    else if (from === 'down') { h.y = H - h.h - T - 1; h.vy = -T2D.hero.jumpV; } else if (from === 'up') h.y = 2;
    const enemies = t2dFind(room, 'E').map(p => ({ x: p.x * T + 1, y: (p.y + 1) * T - T2D.walker.h, w: T2D.walker.w, h: T2D.walker.h, vx: T2D.walker.speed, hp: T2D.walker.hp, hurtAt: -9 }));
    const feathers = (t2d && t2d.hero.doubleJump) ? [] : t2dFind(room, 'F').map(p => ({ x: p.x * T + 3, y: p.y * T + 3, w: 10, h: 10 }));
    t2d = Object.assign(t2d || { clock: 0, msg: null }, { key, room, W, H, hero: h, enemies, feathers, enteredAt: t2d ? t2d.clock : 0 });
    t2d.spawn = { x: h.x, y: h.y };
}
function t2dUpdate(input, dt) {
    const g = t2d, h = g.hero, T = T2D.TILE;
    g.clock += dt;
    if (h.hp <= 0) { if (g.clock - h.diedAt > 1.2) { h.hp = T2D.hero.hp; t2d = null; t2dEnterRoom('base'); t2d.hero.doubleJump = h.doubleJump; t2dMsg('Volviste a la puerta de la Torre.'); } return; }
    t2dStepHero(g.room, h, input, dt);
    // salir por un borde: la sala vecina
    const ex = g.room.exits;
    if (h.x + h.w < 0 && ex.left) return t2dEnterRoom(ex.left, 'right');
    if (h.x > g.W && ex.right) return t2dEnterRoom(ex.right, 'left');
    if (h.y + h.h < 0 && ex.up) return t2dEnterRoom(ex.up, 'down');
    if (h.y > g.H && ex.down) return t2dEnterRoom(ex.down, 'up');
    if (h.y > g.H + 40) { h.x = g.spawn.x; h.y = g.spawn.y; h.vx = h.vy = 0; t2dHurt(1, 0); }
    // pinchos: se tocan con los pies
    const feet = t2dTile(g.room, Math.floor((h.x + h.w / 2) / T), Math.floor((h.y + h.h - 1) / T));
    if (feet === '^') { t2dHurt(1, -h.facing); h.vy = -T2D.hero.jumpV * 0.7; }
    // el ataque: combo de 3 tajos
    if (input.attack && g.clock - (h.attackAt ?? -9) >= T2D.hero.attackGap) {
        h.combo = g.clock - (h.attackAt ?? -9) < T2D.hero.comboWindow ? ((h.combo ?? -1) + 1) % 3 : 0;
        h.attackAt = g.clock; h.hitThisSwing = new Set();
    }
    const at = g.clock - (h.attackAt ?? -9), S = T2D.slash;
    if (at >= S.active[0] && at <= S.active[1]) {
        const box = { x: h.facing > 0 ? h.x + h.w - 2 : h.x - S.w + 2, y: h.y + h.h - S.h - 2, w: S.w, h: S.h };
        g.enemies.forEach(e => { if (e.hp > 0 && !h.hitThisSwing.has(e) && t2dOverlap(box, e)) { h.hitThisSwing.add(e); e.hp -= S.dmg[h.combo]; e.hurtAt = g.clock; e.vx = Math.abs(e.vx) * h.facing; e.knockUntil = g.clock + 0.15; if (!h.onGround && h.vy > 0) h.vy = -120; } });
    }
    // enemigos: caminan y se dan vuelta en las paredes y los bordes
    g.enemies.forEach(e => {
        if (e.hp <= 0) return;
        const speed = g.clock < (e.knockUntil || 0) ? 120 : T2D.walker.speed, dir = Math.sign(e.vx) || 1;
        const ahead = t2dTile(g.room, Math.floor((dir > 0 ? e.x + e.w + 1 : e.x - 1) / T), Math.floor((e.y + e.h + 1) / T));
        if (t2dMoveAxis(g.room, e, dir * speed * dt, 0) || (!t2dSolid(ahead) && ahead !== '=' && g.clock >= (e.knockUntil || 0))) e.vx = -dir * T2D.walker.speed;
        if (t2dOverlap(h, e)) t2dHurt(1, Math.sign(h.x - e.x) || 1);
    });
    // la Pluma de Arén: doble salto (el camino al mirador)
    g.feathers = g.feathers.filter(f => { if (!t2dOverlap(h, f)) return true; h.doubleJump = true; t2dMsg('🪶 La Pluma de Arén: ahora podés saltar otra vez en el aire. Arriba se abre el mirador.'); return false; });
}
function t2dHurt(n, dir) {
    const h = t2d.hero;
    if (t2d.clock < (h.invulnUntil || 0)) return;
    h.hp -= n; h.invulnUntil = t2d.clock + T2D.hero.iframes; h.hurtAt = t2d.clock;
    h.vx = dir * T2D.hero.knock; h.vy = -T2D.hero.knock;
    if (h.hp <= 0) h.diedAt = t2d.clock;
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
    const at = clock - (h.attackAt ?? -9);
    if (at < 0.3) return ([['ready', 'slashA', 'recover'], ['ready', 'slashB', 'recover'], ['raise', 'slashA', 'recover']][h.combo || 0])[Math.min(2, Math.floor(at / 0.1))];
    if (!h.onGround) return h.vy < 0 ? 'walk1' : 'walk3';
    if (Math.abs(h.vx) > 10) return ['walk1', 'walk2', 'walk3'][Math.floor(clock * 10) % 3];
    return 'idle';
}
function t2dDraw(ctx, scale) {
    const g = t2d, h = g.hero, T = T2D.TILE, VW = T2D.VIEW_W, VH = T2D.VIEW_H;
    const camX = Math.round(Math.max(0, Math.min(g.W - VW, h.x + h.w / 2 - VW / 2))), camY = Math.round(Math.max(0, Math.min(g.H - VH, h.y + h.h / 2 - VH / 2)));
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.scale(scale, scale);
    ctx.fillStyle = '#9a93ab'; ctx.fillRect(0, 0, VW, VH); // fondo claro: el encapuchado es oscuro y tiene que recortarse
    for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(70,62,85,0.25)'; ctx.fillRect(((i * 97 - camX * 0.3) % (VW + 60) + VW + 60) % (VW + 60) - 30, 20 + (i % 3) * 30, 18, VH); } // columnas al fondo (paralaje)
    ctx.translate(-camX, -camY);
    g.room.rows.forEach((r, y) => [...r].forEach((c, x) => {
        if (c === '#') { ctx.fillStyle = (x + y) % 2 ? '#5b5266' : '#544b5e'; ctx.fillRect(x * T, y * T, T, T); ctx.fillStyle = '#6e6479'; ctx.fillRect(x * T, y * T, T, 2); }
        else if (c === '=') { ctx.fillStyle = '#8a6f4e'; ctx.fillRect(x * T, y * T, T, 4); ctx.fillStyle = '#5e4a33'; ctx.fillRect(x * T, y * T + 4, T, 1); }
        else if (c === '^') { ctx.fillStyle = '#c9ccd1'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x * T + k * 4, y * T + T); ctx.lineTo(x * T + k * 4 + 2, y * T + T - 7); ctx.lineTo(x * T + k * 4 + 4, y * T + T); ctx.fill(); } }
    }));
    g.feathers.forEach(f => { ctx.fillStyle = '#ffd166'; ctx.fillRect(f.x + 3, f.y + Math.sin(g.clock * 3) * 2, 4, 10); ctx.fillStyle = '#fff3c4'; ctx.fillRect(f.x + 4, f.y + 1 + Math.sin(g.clock * 3) * 2, 2, 6); });
    g.enemies.forEach(e => { if (e.hp <= 0) return; ctx.fillStyle = g.clock - e.hurtAt < 0.1 ? '#ffffff' : '#6a994e'; ctx.fillRect(e.x, e.y + 2, e.w, e.h - 2); ctx.fillRect(e.x + 2, e.y, e.w - 4, 2); ctx.fillStyle = '#1d1712'; ctx.fillRect(e.x + (e.vx > 0 ? e.w - 5 : 2), e.y + 4, 2, 2); });
    // el héroe: si recién lo golpearon, titila
    if (!(h.invulnUntil > g.clock && Math.floor(g.clock * 20) % 2) && h.hp > 0) {
        const s = t2dHeroSprite(t2dHeroFrame(h, g.clock)), fx = Math.round(h.x + h.w / 2), fy = Math.round(h.y + h.h);
        ctx.save(); ctx.translate(fx, fy); if (h.facing < 0) ctx.scale(-1, 1);
        ctx.drawImage(s.img, -Math.round(s.ax), -s.img.height); ctx.restore();
    }
    ctx.restore();
    // interfaz (en píxeles del dibujo, así se ve igual con cualquier zoom): vida, nombre de la sala, mensajes
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.scale(scale, scale);
    for (let i = 0; i < T2D.hero.hp; i++) { ctx.fillStyle = '#1d1712'; ctx.fillRect(5 + i * 9, 5, 8, 8); ctx.fillStyle = i < h.hp ? '#ff2a1f' : '#4a3a3a'; ctx.fillRect(6 + i * 9, 6, 6, 6); }
    ctx.font = '7px monospace'; ctx.fillStyle = '#1d1712'; ctx.fillText(g.room.name + (h.doubleJump ? ' · doble salto' : ''), 6, 22);
    if (g.msg && g.clock - g.msg.at < 5) {
        const words = g.msg.text.split(' '), lines = [''];
        words.forEach(w => { if (ctx.measureText(lines[lines.length - 1] + ' ' + w).width > VW - 12) lines.push(w); else lines[lines.length - 1] += (lines[lines.length - 1] ? ' ' : '') + w; });
        ctx.fillStyle = 'rgba(20,16,26,0.8)'; ctx.fillRect(0, 27, VW, lines.length * 9 + 5); // arriba: abajo está el piso
        ctx.fillStyle = '#ffd166'; lines.forEach((l, i) => ctx.fillText(l, 6, 36 + i * 9));
    }
    if (h.hp <= 0) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#ff2a1f'; ctx.font = '14px monospace'; ctx.fillText('Caíste', VW / 2 - 24, VH / 2); }
    ctx.restore();
}

// --- ARRANQUE (torre2d.html) ---
function t2dStart(canvas) {
    const ctx = canvas.getContext('2d'), keys = {}, scale = Math.max(2, Math.floor(Math.min(window.innerWidth / T2D.VIEW_W, (window.innerHeight - 40) / T2D.VIEW_H)));
    canvas.width = T2D.VIEW_W * scale; canvas.height = T2D.VIEW_H * scale;
    const pressed = {};
    const map = k => ({ a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', s: 'down', arrowdown: 'down', w: 'jump', arrowup: 'jump', ' ': 'jump', k: 'jump', j: 'attack', x: 'attack' })[k];
    window.addEventListener('keydown', e => { const a = map(e.key.toLowerCase()); if (!a) return; e.preventDefault(); if (!keys[a]) pressed[a] = true; keys[a] = true; });
    window.addEventListener('keyup', e => { const a = map(e.key.toLowerCase()); if (a) keys[a] = false; });
    canvas.addEventListener('mousedown', e => { if (e.button === 0) pressed.attack = true; });
    t2dEnterRoom('base');
    t2dMsg('A/D o flechas: moverte · Espacio/W: saltar (mantené para más alto) · J o clic: tajo · ↓ + salto: bajar de una plataforma');
    let last = performance.now(), acc = 0;
    const frame = now => {
        acc += Math.min(0.1, (now - last) / 1000); last = now;
        while (acc >= T2D.DT) {
            t2dUpdate({ left: keys.left, right: keys.right, down: keys.down, jump: !!pressed.jump, jumpHeld: !!keys.jump, attack: !!pressed.attack }, T2D.DT);
            pressed.jump = pressed.attack = false; acc -= T2D.DT;
        }
        t2dDraw(ctx, scale);
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
}
