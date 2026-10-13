// Tower Chaos: el ataque básico con el mouse (pedido del usuario, 2026-10-13: "quiero poder dar los golpes básicos con los
// clicks del mouse"). Antes el héroe le pegaba solo al más cercano; ahora el golpe es tuyo, como en Hades o Diablo.
//   · Clic izquierdo: un golpe hacia el cursor. Mantenerlo: golpea seguido, al ritmo de tu velocidad de ataque.
//   · Cuerpo a cuerpo: le pega al enemigo a tu alcance más cercano al cursor, dentro de un cono hacia el cursor (el de al
//     lado entra con un cono más ancho). Si no hay nadie, el golpe va al aire.
//   · A distancia: el disparo sale en línea recta hacia el cursor y se frena en el primero que toca; si apuntás mal, falla.
//   · Un clic que llega antes de que el golpe esté listo queda guardado un momento (no se pierde).
//   · Clic sobre un enemigo fuera de alcance: caminás hasta él (y si mantenés, le pegás al llegar).
//   · Se vuelve al ataque automático en la pausa (🖱️). El piloto automático y Custom Hero Chaos siguen como antes.
//   · ESPADA (2026-10-13, pedido: "sacá la Q y que haga un combo de 3 golpes con el clic; usar la espada te da eso de
//     base"): con cualquier espada el ataque básico es el combo de 3 tajos en arco (al aire también cuenta, el ritmo es
//     tuyo); el remate empuja y tarda un poco más. Vale con el clic, con el automático y con el piloto. La parada del clic
//     derecho está en towerParry.js.

// Combo de la espada como ataque básico: multiplicadores de los 3 tajos, alcance del arco, cuánto más tarda el que sigue al
// remate, y cuánto aguanta el ritmo sin pegar antes de volver al primer tajo
const SWORD_BASIC = { hits: [1.35, 1.5, 2.6], others: 0.65, reach: 1.9, afterFinisher: 1.35, keep: 0.7 }; // medido: REWORK.md, "Interfaz y calidad de vida"
function swordWielder(hero) { const w = gameMode === 'tower' && hero.gear && hero.gear.weapon; return !!w && (HERO_WEAPONS[w.heroKey] || {}).shape === 'sword'; }
function attackGap(hero) { const p = 1 / effAtkSpeed(hero); return swordWielder(hero) && (hero.comboStep || 0) === 0 && hero.comboAt > -1 && gameClock - hero.comboAt < p * 2 ? p * SWORD_BASIC.afterFinisher : p; }
// Un tajo del combo hacia aim (un punto o un enemigo)
function towerSwordAttack(hero, aim) {
    const p = 1 / effAtkSpeed(hero);
    if (gameClock - (hero.comboAt ?? -99) > p * SWORD_BASIC.afterFinisher + SWORD_BASIC.keep) hero.comboStep = 0; // se cortó el ritmo
    const dx = aim ? aim.x - hero.x : hero.facing || 1, dy = aim ? aim.y - hero.y : 0, d = Math.hypot(dx, dy) || 1;
    const step = hero.comboStep || 0;
    const hit = swingArc(hero, { dx: dx / d, dy: dy / d, dist: aim ? d : 0 }, step, SWORD_BASIC.reach, SWORD_BASIC.hits[step], true);
    hero.comboUntil = gameClock + p * SWORD_BASIC.afterFinisher + SWORD_BASIC.keep;
    return hit;
}

const CLICK_ATTACK = { halfArc: 1.0, nearArc: 1.35, buffer: 0.3, shotSpeed: 16, shotRadius: 0.55, shotReach: 1.5 };
let clickAttack = (() => { try { return localStorage.getItem('chc-click-attack') !== 'off'; } catch (e) { return true; } })();
const attackButton = { held: false, queuedAt: -99 };

function setClickAttack(on) {
    clickAttack = on; attackButton.held = false;
    try { localStorage.setItem('chc-click-attack', on ? 'on' : 'off'); } catch (e) { /* no se guarda */ }
    log(on ? '🖱️ Ataque con clic: clic izquierdo para pegar hacia el cursor (mantenelo para seguir pegando).' : '🖱️ Ataque automático: tu héroe le pega solo al más cercano.');
}
function clickAttackOn(hero) { return gameMode === 'tower' && hero === player && !autopilot && clickAttack; }
function wantsClickAttack() { return attackButton.held || gameClock - attackButton.queuedAt < CLICK_ATTACK.buffer; }

// Hacia el cursor (en casillas). Sin cursor sobre el mapa, hacia donde mira.
function clickAimDir(hero) {
    const dx = mouse.over ? mouse.x - hero.x : hero.facing || 1, dy = mouse.over ? mouse.y - hero.y : 0, d = Math.hypot(dx, dy) || 1;
    return { dx: dx / d, dy: dy / d };
}
// El enemigo que recibe un golpe cuerpo a cuerpo: a tu alcance, dentro del cono hacia el cursor, el más cercano al cursor
function clickMeleeTarget(hero, range) {
    const dir = clickAimDir(hero);
    let best = null, bestD = Infinity;
    enemiesOf(hero).forEach(e => {
        if (!e.isAlive()) return;
        const vx = e.x - hero.x, vy = e.y - hero.y, d = Math.hypot(vx, vy);
        if (d > range) return;
        const ang = d ? Math.acos(Math.max(-1, Math.min(1, (vx * dir.dx + vy * dir.dy) / d))) : 0;
        if (ang > (d <= 1.01 ? CLICK_ATTACK.nearArc : CLICK_ATTACK.halfArc)) return;
        const k = mouse.over ? Math.hypot(e.x - mouse.x, e.y - mouse.y) : d;
        if (k < bestD) { bestD = k; best = e; }
    });
    return best;
}

// Cada cuadro, en vez del ataque automático: el golpe se carga solo y sale cuando apretás (o mantenés) el clic
function clickAttackStep(hero, dt, blocked) {
    const period = attackGap(hero);
    hero.attackTimer = Math.min(period, (hero.attackTimer || 0) + dt);
    if (blocked || hero.charging || hero.parry || !wantsClickAttack() || hero.attackTimer < period) return;
    hero.attackTimer = 0; attackButton.queuedAt = -99;
    if (swordWielder(hero)) { towerSwordAttack(hero, mouse.over ? { x: mouse.x, y: mouse.y } : null); return; } // espada: el combo
    const ranged = hero.projectileSpeed > 0, range = effRange(hero), dir = clickAimDir(hero);
    if (ranged) { // disparo apuntado: línea recta hacia el cursor, se frena en el primero
        const reach = range + CLICK_ATTACK.shotReach, aimAt = { x: hero.x + dir.dx * reach, y: hero.y + dir.dy * reach };
        const { dmg, isCrit } = rollAttackDamage(hero, aimAt);
        fxAttack(hero, aimAt, 'ranged', heroColor(hero));
        fireSkillProjectile(hero, { tx: aimAt.x, ty: aimAt.y, speed: Math.max(CLICK_ATTACK.shotSpeed, hero.projectileSpeed || 0), radius: CLICK_ATTACK.shotRadius,
            dmg, isCrit, basic: true, stopOnHit: true, solid: true, quietMiss: true, arrow: weaponFx(hero).kind === 'arrow' ? 'arrow' : null, skillName: 'Ataque' });
        return;
    }
    const target = clickMeleeTarget(hero, range);
    if (target) {
        const { dmg, isCrit } = rollAttackDamage(hero, target);
        fxAttack(hero, target, 'melee'); fxHeroAttack(hero, target, isCrit); resolveBasicHit(hero, target, dmg, isCrit);
    } else { // al aire: se ve y se oye igual (el ritmo es tuyo)
        const aimAt = { x: hero.x + dir.dx, y: hero.y + dir.dy };
        fxAttack(hero, aimAt, 'melee'); fxHeroAttack(hero, aimAt, false);
    }
}

// Botón izquierdo: se aprieta en mouse.js (ahí se decide si es un ataque); se suelta en cualquier lado
function clickAttackPress(p) {
    const enemy = enemyUnderCursor(p.x, p.y);
    if (enemy && Math.hypot(enemy.x - player.x, enemy.y - player.y) > effRange(player)) { // lejos: caminar hasta él
        player.focus = enemy; player.focusChase = true; player.moveTarget = null; fxRing(enemy, '#ff477e', 0.9, 0.3);
    } else { player.focus = null; player.focusChase = false; }
    attackButton.held = true; attackButton.queuedAt = gameClock;
}
window.addEventListener('mouseup', e => { if (e.button === 0) attackButton.held = false; });
window.addEventListener('blur', () => { attackButton.held = false; });
