// Tower Chaos: la parada de la espada (pedido del usuario, 2026-10-13: "el segundo clic de la espada es un golpe que rebota
// el disparo que le hagan, un tipo de parry reflectivo"). Referencias: el parry de Sekiro / Hollow Knight (una ventana
// corta que premia el momento justo) y el reflejo de Hades (Égida) o de Enter the Gungeon (la espada que devuelve balas).
//   · Clic derecho con una espada: un tajo corto hacia el cursor que pega poco y abre una ventana de 0,3 s.
//   · Un disparo que entra en ese arco (o que te llega desde ese lado) vuelve hacia quien lo tiró, el doble de fuerte
//     y más rápido, y ahora le pega a los enemigos.
//   · Un golpe cuerpo a cuerpo que te llega desde ese lado no te hace nada y deja aturdido al que pegó.
//   · Si la parada agarra algo, se recarga casi al instante (encadenar paradas es el premio por el momento justo); si no,
//     tarda 1 s. Mientras dura, no atacás (es un compromiso, no un escudo gratis).
//   · Con espada, el clic derecho deja de servir para caminar (se camina con el teclado). El piloto no la usa.

const PARRY = { window: 0.3, cooldown: 1.0, refund: 0.15, reach: 1.7, halfArc: 1.35, dmgMult: 0.5, reflectMult: 2, reflectAtk: 0.5, reflectSpeed: 1.5, stun: 1.0, color: '#7fd8ff' };

function swordParryOn(hero) { return clickAttackOn(hero) && swordWielder(hero); }
function parryActive(h) { return !!(h && h.parry && gameClock < h.parry.until); }

// Clic derecho: abre la parada hacia el cursor
function swordParry(h, aim) {
    if (gameClock < (h.parryReadyAt || 0) || !h.isAlive() || hasFlag(h, 'stun') || h.charging) return false;
    const dx = aim.x - h.x, dy = aim.y - h.y, d = Math.hypot(dx, dy) || 1, dir = { dx: dx / d, dy: dy / d };
    h.parry = { start: gameClock, until: gameClock + PARRY.window, dir, caught: 0 };
    h.parryReadyAt = gameClock + PARRY.cooldown;
    h.attackTimer = 0;
    // el tajo de la parada: corto, pega poco (no empuja)
    enemiesOf(h).filter(e => e.isAlive() && inArc(h, e, dir, PARRY.reach - 0.3, PARRY.halfArc)).forEach(e => dealDamage(h, e, Math.round(effAttack(h) * PARRY.dmgMult), 'physical'));
    const arena = fxArena(h);
    if (arena) {
        if (Math.abs(dir.dx) > 0.2) h.facing = Math.sign(dir.dx);
        h.fxAttack = { kind: 'swing', dx: dir.dx, dy: dir.dy, at: fxClock }; h.fxSwingStep = 3; // se dibuja con el escudo (towerPixelHero.js; el muñeco por poses, como el revés)
        pushFx(arena, { kind: 'sweep', unit: h, x: h.x, y: h.y, angle: Math.atan2(dir.dy, dir.dx), reach: PARRY.reach, half: PARRY.halfArc, flip: true, color: PARRY.color, color2: '#2a6f97', life: PARRY.window });
        sfx('swing');
    }
    return true;
}
// ¿Viene del lado de la parada? (el que está pegado siempre cuenta: en casillas, el de al lado está a 1)
function inParrySide(h, x, y) {
    const vx = x - h.x, vy = y - h.y, d = Math.hypot(vx, vy);
    if (d < 0.6) return true;
    return Math.acos(Math.max(-1, Math.min(1, (vx * h.parry.dir.dx + vy * h.parry.dir.dy) / d))) <= PARRY.halfArc;
}
function parryCatchesBullet(h, b) {
    if (!parryActive(h) || b.reflected || h.arena !== (b.owner && b.owner.arena)) return false;
    // la agarra si entra al arco, o si te iba a pegar viniendo desde ese lado
    return Math.hypot(b.x - h.x, b.y - h.y) < PARRY.reach && inParrySide(h, b.x - b.vx * 0.05, b.y - b.vy * 0.05);
}
function parryCatchesMelee(target, c) { return target === player && parryActive(target) && c.range <= 2 && inParrySide(target, c.x, c.y); }

function parrySuccess(h, x, y, text) {
    h.parry.caught++;
    h.parryReadyAt = Math.min(h.parryReadyAt, gameClock + PARRY.refund); // agarró algo: se recarga casi enseguida
    const arena = fxArena(h);
    if (!arena) return;
    fxParticles(arena, x, y, 'lightning', 8, 3.5, { life: 0.3 });
    if (h.parry.caught === 1) { fxText(h, text, PARRY.color, 12, 0.8); sfx('crit'); fxHitStop(0.06); fxShake(1.5); }
}
// Devuelve la bala hacia quien la tiró (o hacia donde apuntaste), más fuerte y más rápida
function reflectBullet(h, b) {
    const o = b.owner && b.owner.isAlive && b.owner.isAlive() ? b.owner : null;
    const tx = o ? o.x : h.x + h.parry.dir.dx * 6, ty = o ? o.y : h.y + h.parry.dir.dy * 6;
    const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(b.vx, b.vy) * PARRY.reflectSpeed;
    Object.assign(b, { vx: dx / d * sp, vy: dy / d * sp, reflected: true, owner: h, born: gameClock, life: 2.5, arrow: b.arrow, onHit: null,
        dmg: Math.round(b.dmg * PARRY.reflectMult + effAttack(h) * PARRY.reflectAtk) });
    parrySuccess(h, b.x, b.y, '¡DEVUELTO!');
}
// Golpe cuerpo a cuerpo parado: no te toca y el que pegó queda aturdido
function parryMelee(h, c) {
    addEffect(c, { id: 'PARRIED', name: 'Parado', duration: PARRY.stun, flags: ['stun'] });
    if (c.windup) c.windup = null;
    parrySuccess(h, c.x, c.y, '¡PARADA!');
}
// Cada cuadro: la ventana termina; mientras dura, agarra las balas que entran en el arco
function parryTick(h) {
    if (!h || !h.parry) return;
    if (gameClock >= h.parry.until) { h.parry = null; return; }
    const B = h.arena && h.arena.bullets;
    if (B) B.forEach(b => { if (parryCatchesBullet(h, b)) reflectBullet(h, b); });
}
