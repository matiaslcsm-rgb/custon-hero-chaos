// Control con el mouse, estilo MOBA.
//
//   Habilidades con objetivo (las que eligen un enemigo: golpes, proyectiles, saltos): apretás la tecla (E R T F Q) y entrás en
//   modo apuntar: se ve el alcance y se marca el enemigo más cercano al cursor. Clic izquierdo la lanza sobre ese enemigo;
//   clic derecho o Esc cancela. Con "lanzamiento rápido" (Opciones) salen al apretar la tecla. Las de área alrededor tuyo y
//   las mejoras se lanzan al apretar la tecla.
//   Clic derecho en el mapa (sin estar apuntando): tu héroe camina hasta ahí; sobre un rival, lo ataca. W A S D, solo si
//   lo prendés en Opciones (y entonces manda el teclado).
//   En la Torre, el clic izquierdo es el ataque básico hacia el cursor (towerClickAttack.js; se apaga en la pausa).
//   Con espada, el clic derecho es la parada en vez de caminar (towerParry.js).
//
//   Para apuntar no hace falta tocar cada habilidad: mientras se lanza con el mouse, el héroe tiene aimPoint y
//   nearestEnemy() (combat.js) elige, entre los enemigos a su alcance, el más cercano a ese punto.

// CONTROLES ESTILO DOTA en Custom Hero (MATCH, pedido del usuario 2026-10-18): clic derecho camina y, sobre un rival,
// lo ataca; las habilidades apuntadas se confirman con clic (salvo que prendas el "lanzamiento rápido"); W A S D solo si
// lo prendés en Opciones. En la Torre no cambia nada: es un juego de acción (teclado, esquive y clic para pegar).
let quickCast = false, wasdMove = false;
try { quickCast = localStorage.getItem('chc-lanzamiento-rapido') === 'on'; wasdMove = localStorage.getItem('chc-wasd') === 'on'; } catch (e) { /* sin almacenamiento: como Dota */ }
function setQuickCast(on) {
    quickCast = on;
    try { localStorage.setItem('chc-lanzamiento-rapido', on ? 'on' : 'off'); } catch (e) { /* no se guarda */ }
    log(on ? '⚡ Lanzamiento rápido: las habilidades salen al apretar la tecla, hacia el cursor.' : '🎯 Habilidades con tecla y clic: apretás la tecla, apuntás y confirmás con clic izquierdo.');
}
function setWasdMove(on) {
    wasdMove = on;
    try { localStorage.setItem('chc-wasd', on ? 'on' : 'off'); } catch (e) { /* no se guarda */ }
    log(on ? '⌨️ Te podés mover con W A S D (y las flechas), además del clic derecho.' : '🖱️ Te movés con clic derecho, como en Dota.');
}
function keyboardMoveOn() { return gameMode === 'tower' || wasdMove; }
function aimWithClick() { return gameMode !== 'tower' && !quickCast; }

let targeting = null;               // { skill } mientras se está apuntando una habilidad
const mouse = { x: 0, y: 0, over: false }; // posición del cursor en casillas (con decimales)

// Una habilidad necesita apuntar si elige un enemigo con nearestEnemy (así funciona sola para héroes nuevos)
// o si declara pointTarget: true (proyectil de habilidad que viaja al punto exacto donde clickeaste, ver
// fireSkillProjectile en combat.js — a diferencia de nearestEnemy, esta sí puede fallar si apuntás mal).
function isAimedSkill(skill) { return skill.kind === 'active' && (skill.pointTarget || /nearestEnemy\(/.test(String(skill.cast))); }

// Alcance que se muestra al apuntar: el valor 'range' de la habilidad o, si no tiene, el rango de ataque + 1 (aproximado).
function aimRange(skill, hero) {
    const r = skill.values && skill.values.range !== undefined ? val(skill, hero, 'range') : undefined;
    return r !== undefined ? r : effRange(hero) + 1;
}
// Radio de área que se telegrafía en el cursor para las de pointTarget (ver fireSkillProjectile en combat.js).
function skillRadius(skill, hero) {
    const r = skill.values && skill.values.radius !== undefined ? val(skill, hero, 'radius') : undefined;
    return r !== undefined ? r : 0.6;
}

function cancelTargeting() {
    targeting = null;
    canvas.style.cursor = '';
}

// Enemigo que se marcaría si se lanza ahora (el más cercano al cursor dentro del alcance aproximado).
function aimedEnemy() {
    if (!targeting || !player.arena) return null;
    const range = aimRange(targeting.skill, player);
    let best = null, bestDist = Infinity;
    enemiesOf(player).forEach(c => {
        if (!c.isAlive() || Math.hypot(c.x - player.x, c.y - player.y) > range) return;
        const d = Math.hypot(c.x - mouse.x, c.y - mouse.y);
        if (d < bestDist) { bestDist = d; best = c; }
    });
    return best;
}

// Lanza la habilidad apuntando al punto (x, y). Devuelve true si se lanzó.
function castAt(hero, skill, x, y) {
    hero.aimPoint = { x, y };
    try { return tryCastSkill(hero, skill); } finally { hero.aimPoint = null; }
}

function mouseToTile(e) {
    if (window.M3D && M3D.active) { const t = M3D.screenToTile(e.clientX, e.clientY); if (t) return t; } // MATCH 3D: rayo contra el piso
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width * viewCols() - 0.5 + camera.x, y: (e.clientY - rect.top) / rect.height * viewRows() - 0.5 + camera.y }; // viewCols: con el zoom de la Torre (towerView.js)
}

function canControlPlayer() { return player && inCombat() && !autopilot && player.arena && !player.inRest && player.isAlive(); }

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    Object.assign(mouse, mouseToTile(e), { over: true, fx: (e.clientX - rect.left) / rect.width, fy: (e.clientY - rect.top) / rect.height }); // fx, fy: posición en pantalla (ver cursorWorld)
});
canvas.addEventListener('mouseleave', () => { mouse.over = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('mousedown', e => {
    if (paused) return;
    const p = mouseToTile(e);
    Object.assign(mouse, p);
    if (e.button === 2) { rightClickAt(p); return; }
    if (e.button === 0 && targeting) {
        const skill = targeting.skill;
        cancelTargeting();
        if (canControlPlayer()) castAt(player, skill, p.x, p.y);
        return;
    }
    if (e.button === 0 && canControlPlayer()) { // clic izquierdo: marcar un enemigo como objetivo (o desmarcar)
        if (gameMode === 'tower' && towerClickWeapon(p)) return; // o agarrar un arma del círculo (towerAwaken.js)
        if (clickAttackOn(player)) { clickAttackPress(p); return; } // Torre: el clic es el golpe (towerClickAttack.js)
        const enemy = enemyUnderCursor(p.x, p.y);
        player.focus = enemy;
        player.focusChase = !!enemy;
        player.moveTarget = null;
        if (enemy) fxRing(enemy, '#ff477e', 0.9, 0.3);
    }
});

// Clic derecho: cancela el apuntado o, como en Dota, ataca al rival que tenga abajo o camina hasta ahí
function rightClickAt(p) {
    if (targeting) { cancelTargeting(); return; }
    if (secondaryAction(p)) return; // Torre: la parada, el flechazo o la tormenta
    const tile = { x: Math.max(0, Math.min(COLS - 1, Math.round(p.x))), y: Math.max(0, Math.min(ROWS - 1, Math.round(p.y))), at: fxClock };
    if (player && player.inRest && !player.eliminated && !autopilot) { player.moveTarget = { ...tile, arena: null }; return; } // caminar por la sala de espera
    if (!canControlPlayer()) return;
    if (gameMode !== 'tower') {
        const enemy = enemyUnderCursor(p.x, p.y);
        if (enemy) { // sobre un rival: atacarlo (lo persigue hasta tenerlo a tiro)
            player.focus = enemy; player.focusChase = true; player.moveTarget = null;
            fxRing(enemy, '#ff477e', 0.9, 0.3);
            return;
        }
        player.focus = null; player.focusChase = false; // caminar cancela la orden de ataque
    }
    player.moveTarget = { ...tile, arena: player.arena };
}

// La acción secundaria de cada clase en la Torre (clic derecho, o la tecla/botón sin mouse: padControls.js)
function secondaryAction(p) {
    if (!canControlPlayer()) return false;
    if (swordParryOn(player)) { swordParry(player, p); return true; } // con espada: la parada (towerParry.js)
    if (isArcher(player)) { archerSnipe(player, p); return true; } // el Arquero: el flechazo (towerArcher.js)
    if (isMage(player)) { mageChargeStart(player, 'storm'); return true; } // el Mago: la tormenta, al soltar (towerMage.js)
    return false;
}
// Enemigo bajo el cursor (a menos de 0,8 casillas; si hay varios, el más cercano al cursor).
function enemyUnderCursor(x, y) {
    let best = null, bestDist = 0.8;
    enemiesOf(player).forEach(c => {
        if (!c.isAlive()) return;
        const d = Math.hypot(c.x - x, c.y - y);
        if (d < bestDist) { bestDist = d; best = c; }
    });
    return best;
}

// Con un objetivo marcado fuera de alcance, el héroe camina hasta tenerlo a tiro (y ahí se queda atacando).
function focusChaseDirection(hero) {
    const f = hero.focusChase && validFocus(hero);
    if (!f) return null;
    if (Math.hypot(f.x - hero.x, f.y - hero.y) <= effRange(hero)) return null;
    if (hero.arena && hero.arena.walls) return towerPathDir(hero, f); // en la Torre, rodeando paredes
    return { dx: Math.sign(f.x - hero.x), dy: Math.sign(f.y - hero.y) };
}

// Dirección del próximo paso hacia el destino del clic derecho (o null si no hay destino).
function moveTargetDirection(hero) {
    const t = hero.moveTarget;
    if (!t) return null;
    if (t.arena !== hero.arena || (hero.x === t.x && hero.y === t.y)) { hero.moveTarget = null; return null; }
    if (hero.arena && hero.arena.walls) return towerPathDir(hero, t) || (hero.moveTarget = null); // en la Torre, rodeando paredes
    return { dx: Math.sign(t.x - hero.x), dy: Math.sign(t.y - hero.y) };
}

// Dibujo: alcance, enemigo marcado y mira al apuntar; marca del destino del clic derecho.
// noHint: sin el cartel de abajo (el 3D dibuja todo esto en el piso y el cartel aparte, match3d.js)
function drawMouseOverlay(arena, noHint) {
    if (!player || player.arena !== arena) return;
    drawPadAim(arena); // la mira sin mouse (padControls.js)
    const px = x => x * TILE + TILE / 2;
    if (player.moveTarget && player.moveTarget.arena === arena) {
        const t = player.moveTarget, age = fxClock - t.at;
        ctx.strokeStyle = '#2dc653'; ctx.globalAlpha = Math.max(0.35, 1 - age); ctx.lineWidth = 2;
        const s = 5;
        ctx.beginPath(); ctx.moveTo(px(t.x) - s, px(t.y) - s); ctx.lineTo(px(t.x) + s, px(t.y) + s); ctx.moveTo(px(t.x) + s, px(t.y) - s); ctx.lineTo(px(t.x) - s, px(t.y) + s); ctx.stroke();
        ctx.globalAlpha = 1;
    }
    const focus = validFocus(player);
    if (focus) { // objetivo marcado: anillo rojo punteado que gira
        ctx.save();
        ctx.strokeStyle = '#ff477e'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -fxClock * 20;
        ctx.beginPath(); ctx.arc(px(focus.rx ?? focus.x), px(focus.ry ?? focus.y), TILE * 0.62, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }
    if (!targeting) return;
    const color = '#ffd166';
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(px(player.rx ?? player.x), px(player.ry ?? player.y), aimRange(targeting.skill, player) * TILE, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    if (targeting.skill.pointTarget) {
        // Punto de efecto: círculo de área en el cursor (adónde va a viajar y a quién le va a pegar si llega ahí).
        // No engancha a ningún enemigo: si lo movés lejos de todos, el hechizo falla.
        const radius = skillRadius(targeting.skill, player);
        ctx.fillStyle = color; ctx.globalAlpha = 0.15;
        ctx.beginPath(); ctx.arc(px(mouse.x), px(mouse.y), radius * TILE, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.9; ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px(mouse.x), px(mouse.y), radius * TILE, 0, Math.PI * 2); ctx.stroke();
    } else {
        const target = aimedEnemy();
        if (target) {
            ctx.strokeStyle = '#ff477e'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(px(target.rx ?? target.x), px(target.ry ?? target.y), TILE * 0.6, 0, Math.PI * 2); ctx.stroke();
        }
    }
    if (mouse.over) {
        ctx.strokeStyle = color; ctx.lineWidth = 1.5;
        const mx = px(mouse.x), my = px(mouse.y);
        ctx.beginPath(); ctx.moveTo(mx - 8, my); ctx.lineTo(mx + 8, my); ctx.moveTo(mx, my - 8); ctx.lineTo(mx, my + 8); ctx.stroke();
    }
    if (!noHint) drawTargetingHint();
}
// El cartel de cómo lanzar la habilidad que estás apuntando
function drawTargetingHint() {
    if (!targeting) return;
    ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#ffd166'; ctx.textAlign = 'center';
    ctx.fillText(`${targeting.skill.name}: clic izquierdo para lanzar · clic derecho o Esc para cancelar`, screenW() / 2, screenH() - 12);
}
