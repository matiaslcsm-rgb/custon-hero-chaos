// Infinite Tower sin mouse (netbook) y con joystick (pedido del usuario, 2026-10-14).
//
//   TECLADO SOLO: dos acciones más en ⌨️ Teclas: Ataque (U, mantenela para seguir) y Ataque secundario (O: la parada de la
//   espada, el flechazo del arco o la tormenta del bastón). Apuntan solas: al enemigo visible más cercano y, si no hay,
//   hacia donde caminás. Por dentro es un "cursor virtual": se mueve el punto del mouse, así que todo lo que apunta al
//   cursor (golpes, flechas, especiales, habilidades) anda igual. Si movés el mouse de verdad, vuelve a mandar el mouse.
//   JOYSTICK (mapeo estándar): stick izquierdo o cruceta, mover · stick derecho, apuntar a mano · A o RT, atacar · B,
//   esquivar (con una ventana abierta, la cierra) · X, interactuar · Y, especial · LB y LT, habilidades · RB, secundario ·
//   Select, mapa · Start, pausa · apretar el stick izquierdo, stats (y las cartas de nivel: cruceta y A) · el derecho, equipo.
//   El joystick "aprieta" las mismas teclas configuradas (eventos de teclado), así no hay un camino aparte que mantener.

const PAD = { autoAim: 9, ahead: 3, stickAim: 4, dead: 0.35 };
const PAD_BUTTONS = { 0: 'attack', 1: 'dash', 2: 'interact', 3: 'skill3', 4: 'skill1', 5: 'attack2', 6: 'skill2', 7: 'attack', 8: 'map', 9: 'escape', 10: 'stats', 11: 'inventory', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
let aimMode = 'mouse', lastMoveDir = { dx: 1, dy: 0 }, stickAim = null, padPrev = {};

// Hacia dónde se camina con las teclas (o null)
function heldMoveDir() {
    const k = a => keys[KEYMAP[a]];
    const dx = (k('right') || keys.arrowright ? 1 : 0) - (k('left') || keys.arrowleft ? 1 : 0), dy = (k('down') || keys.arrowdown ? 1 : 0) - (k('up') || keys.arrowup ? 1 : 0);
    if (!dx && !dy) return null;
    const n = Math.hypot(dx, dy);
    return { dx: dx / n, dy: dy / n };
}
// El punto al que se apunta sin mouse: el stick derecho, o el enemigo visible más cercano, o adelante
function padAimPoint() {
    if (stickAim) return { x: player.x + stickAim.dx * PAD.stickAim, y: player.y + stickAim.dy * PAD.stickAim };
    let best = null, bestD = PAD.autoAim;
    enemiesOf(player).forEach(c => {
        if (!c.isAlive() || (player.arena.visible && !canSee(player.arena, Math.round(c.x), Math.round(c.y)))) return;
        const d = Math.hypot(c.x - player.x, c.y - player.y);
        if (d < bestD) { bestD = d; best = c; }
    });
    return best ? { x: best.x, y: best.y } : { x: player.x + lastMoveDir.dx * PAD.ahead, y: player.y + lastMoveDir.dy * PAD.ahead };
}
function padAim() {
    const d = heldMoveDir();
    if (d) lastMoveDir = d;
    if (aimMode !== 'pad' || gameMode !== 'tower' || !player || !player.arena || !player.isAlive()) return;
    const p = padAimPoint();
    Object.assign(mouse, p, { over: true, fx: (p.x + 0.5 - camera.x) / viewCols(), fy: (p.y + 0.5 - camera.y) / viewRows() }); // fx, fy: como el mouse (cursorWorld)
}

// Las teclas de ataque (las llama game.js al apretarlas en la Torre, fuera de la pausa)
function padKeyDown(act, e) {
    aimMode = 'pad'; padAim();
    if (!canControlPlayer() || (e && e.repeat)) return;
    const p = { x: mouse.x, y: mouse.y };
    if (act === 'attack2') { secondaryAction(p); return; }
    if (targeting) { const s = targeting.skill; cancelTargeting(); castAt(player, s, p.x, p.y); return; }
    if (clickAttackOn(player)) clickAttackPress(p);
}
function padKeyUp(act) {
    if (act === 'attack') attackButton.held = false;
    if (player && player.mageCharge && (act === 'attack' || act === 'attack2')) mageRelease(player, act === 'attack2' ? 'storm' : 'orb');
}
window.addEventListener('keyup', e => { const act = actionForKey(e.key.toLowerCase()); if (act === 'attack' || act === 'attack2') padKeyUp(act); });
canvas.addEventListener('mousemove', () => { aimMode = 'mouse'; });

// --- JOYSTICK ---
function padSend(type, act) {
    const key = act === 'escape' ? 'Escape' : KEYMAP[act];
    if (key !== undefined) window.dispatchEvent(new KeyboardEvent(type, { key }));
}
function pollGamepad() {
    const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(g => g && g.connected) : null;
    if (!gp) return;
    const now = {}, ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, rx = gp.axes[2] || 0, ry = gp.axes[3] || 0, r = Math.hypot(rx, ry);
    const menu = paused || (typeof towerModalOpen === 'function' && towerModalOpen()) || (typeof towerMapOpen !== 'undefined' && towerMapOpen); // con una ventana abierta, B la cierra (como Esc)
    Object.entries(PAD_BUTTONS).forEach(([b, act]) => { if (gp.buttons[b] && gp.buttons[b].pressed) now[menu && act === 'dash' ? 'escape' : act] = true; });
    if (ax < -PAD.dead) now.left = true; if (ax > PAD.dead) now.right = true;
    if (ay < -PAD.dead) now.up = true; if (ay > PAD.dead) now.down = true;
    stickAim = r > PAD.dead + 0.1 ? { dx: rx / r, dy: ry / r } : null;
    if (stickAim || Object.keys(now).length) aimMode = 'pad';
    Object.keys(now).forEach(a => { if (!padPrev[a]) padSend('keydown', a); });
    Object.keys(padPrev).forEach(a => { if (!now[a]) padSend('keyup', a); });
    padPrev = now;
}
window.addEventListener('gamepadconnected', e => log(`🎮 Joystick conectado (${e.gamepad.id.split('(')[0].trim()}). Mirá la pausa → Cómo funciona → Sin mouse y con joystick.`));
(function padLoop() { pollGamepad(); padAim(); requestAnimationFrame(padLoop); })();

// La mira sin mouse: un anillo chico donde se va a apuntar
function drawPadAim(arena) {
    if (aimMode !== 'pad' || targeting || !player || player.arena !== arena || !player.isAlive()) return;
    const x = mouse.x * TILE + TILE / 2, y = mouse.y * TILE + TILE / 2;
    ctx.save(); ctx.strokeStyle = '#ffd166'; ctx.globalAlpha = 0.75; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, TILE * 0.35, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - TILE * 0.55, y); ctx.lineTo(x - TILE * 0.2, y); ctx.moveTo(x + TILE * 0.2, y); ctx.lineTo(x + TILE * 0.55, y); ctx.stroke();
    ctx.restore();
}
