// Infinite Tower: el Mago (fase T00, clases fijas al estilo Risk of Rain; diseño del usuario 2026-10-14).
//
//   · Clic: orbe arcano que rebota 1 vez hacia el enemigo más cercano del primero que toca.
//   · Clic derecho: tormenta, 3 rayos sobre enemigos al azar cerca del cursor (7 s de enfriamiento).
//   · Espacio: teletransporte corto hacia el mouse (hasta 4 casillas; no atraviesa paredes).
//   · Pasiva, Carga: mantener apretado el clic o el clic derecho carga en 3 etapas. Cada etapa sortea una mejora (más
//     área, más daño, más velocidad, más tamaño o un rebote más; se repiten y se apilan) que se ve sobre el mago, y al
//     soltar sale con todo. Es una apuesta: mientras carga queda quieto.
//   El equipo no le da Q/E/R (como al Guerrero y al Arquero); conserva la Saeta Arcana del bastón en la Q.

const MAGE = { orbMult: 1.35, bounceRange: 3.5, bounceMult: 0.45, stormCd: 7, stormBolts: 3, stormMult: 1.2, stormRadius: 3.5, // medido contra el Guerrero (REWORK.md)
    blinkTiles: 4, stage: 0.45, stages: 3, perk: 0.35, stageDmg: 0.08, splash: 0.35 }; // perk: cuánto suma cada mejora repetida; stageDmg: cada etapa cargada suma daño; splash: daño del área
const MAGE_PERKS = { area: '+Área', dmg: '+Daño', speed: '+Velocidad', size: '+Tamaño', bounce: '+Rebote' };
function isMage(h) { return gameMode === 'tower' && !!h && h.heroClass === 'mage'; }
const perkCount = (perks, k) => perks.filter(p => p === k).length;

// --- CARGA (la pasiva) ---
function mageChargeStart(h, kind) {
    if (!isMage(h) || h.mageCharge || !h.isAlive() || hasFlag(h, 'stun')) return false;
    if (kind === 'storm' && gameClock < (h.stormReadyAt || 0)) return false;
    h.mageCharge = { kind, at: gameClock, perks: [] };
    return true;
}
function mageRelease(h, kind) {
    const ch = h.mageCharge;
    if (!ch || ch.kind !== kind) return false;
    h.mageCharge = null; removeEffect(h, 'MAGE_CHARGE');
    const c = cursorWorld() || { x: h.x + (h.facing || 1), y: h.y };
    if (kind === 'orb') mageOrb(h, clickAimDir(h), ch.perks);
    else mageStorm(h, c, ch.perks);
    return true;
}
// Cada cuadro (updateTower): sortea una mejora por etapa y lo deja quieto mientras carga
function mageTick(h) {
    const ch = h.mageCharge;
    if (!ch) return;
    if (!h.isAlive() || hasFlag(h, 'stun')) { h.mageCharge = null; removeEffect(h, 'MAGE_CHARGE'); return; }
    if (!getEffect(h, 'MAGE_CHARGE')) addEffect(h, { id: 'MAGE_CHARGE', name: 'Cargando', duration: Infinity, flags: [], tags: ['MEJORA'], mods: { moveSpeedPct: -0.95 } });
    // (la recarga del ataque sigue corriendo: cargar se superpone con ella, no se suma)
    const stage = Math.min(MAGE.stages, Math.floor((gameClock - ch.at) / MAGE.stage));
    while (ch.perks.length < stage) {
        const k = pickRandom(Object.keys(MAGE_PERKS));
        ch.perks.push(k);
        if (fxArena(h)) { fxText(h, MAGE_PERKS[k], '#c77dff', 11, 0.9); fxRing(h, '#c77dff', 0.6 + 0.3 * ch.perks.length, 0.3); }
    }
}
window.addEventListener('mouseup', e => { if (player && player.mageCharge) mageRelease(player, e.button === 2 ? 'storm' : 'orb'); });
window.addEventListener('blur', () => { if (player && player.mageCharge) mageRelease(player, player.mageCharge.kind); });

// --- CLIC: el orbe que rebota ---
function mageOrb(h, dir, perks = []) {
    const reach = effRange(h) + CLICK_ATTACK.shotReach, aim = { x: h.x + dir.dx * reach, y: h.y + dir.dy * reach };
    const { dmg, isCrit } = rollAttackDamage(h, aim);
    fxAttack(h, aim, 'ranged', heroColor(h));
    mageOrbShot(h, h, aim, Math.round(dmg * MAGE.orbMult * (1 + MAGE.perk * perkCount(perks, 'dmg') + MAGE.stageDmg * perks.length)), isCrit, 1 + perkCount(perks, 'bounce'), perks, true, new Set());
}
function mageOrbShot(h, from, aim, dmg, isCrit, bounces, perks, basic, hit) {
    const area = perkCount(perks, 'area');
    fireSkillProjectile(h, { x: from.x, y: from.y, tx: aim.x, ty: aim.y, speed: Math.max(CLICK_ATTACK.shotSpeed, h.projectileSpeed || 0) * (1 + MAGE.perk * perkCount(perks, 'speed')),
        radius: CLICK_ATTACK.shotRadius * (1 + MAGE.perk * perkCount(perks, 'size')), dmg, isCrit, basic, dmgType: 'magical', stopOnHit: true, solid: true, quietMiss: true, skillName: 'Orbe',
        onHit: t => {
            hit.add(t);
            if (area) enemiesOf(h).filter(o => o !== t && o.isAlive() && Math.hypot(o.x - t.x, o.y - t.y) <= 0.8 + 0.7 * area).forEach(o => dealDamage(h, o, Math.round(dmg * MAGE.splash), 'magical'));
            if (area && fxArena(h)) fxRing(t, '#c77dff', 0.8 + 0.7 * area, 0.35);
            if (bounces <= 0) return;
            const next = enemiesOf(h).filter(o => o.isAlive() && !hit.has(o) && Math.hypot(o.x - t.x, o.y - t.y) <= MAGE.bounceRange)
                .sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y))[0];
            if (next) mageOrbShot(h, t, next, Math.round(dmg * MAGE.bounceMult), false, bounces - 1, perks, false, hit);
        } });
}

// --- CLIC DERECHO: la tormenta ---
function mageStorm(h, aim, perks = []) {
    if (gameClock < (h.stormReadyAt || 0)) return false;
    h.stormReadyAt = gameClock + MAGE.stormCd * Math.max(0.4, 1 - 0.15 * perkCount(perks, 'speed'));
    const r = MAGE.stormRadius * (1 + 0.3 * perkCount(perks, 'area')), bolts = MAGE.stormBolts + perkCount(perks, 'bounce');
    const splash = perkCount(perks, 'size'), dmg = Math.round(effAttack(h) * MAGE.stormMult * (1 + MAGE.perk * perkCount(perks, 'dmg') + MAGE.stageDmg * perks.length));
    const foes = enemiesOf(h).filter(o => o.isAlive() && Math.hypot(o.x - aim.x, o.y - aim.y) <= r);
    const arena = fxArena(h);
    for (let i = 0; i < bolts; i++) {
        const f = foes.length ? pickRandom(foes) : { x: aim.x + (Math.random() - 0.5) * r, y: aim.y + (Math.random() - 0.5) * r };
        if (arena) { pushFxAt(arena, { kind: 'skybolt', x: f.x, y: f.y, color: '#fffbe0', color2: '#c77dff', life: 0.35 }, i * 0.08); fxParticles(arena, f.x, f.y, 'lightning', 6, 4, { delay: i * 0.08 }); }
        if (!f.isAlive || !f.isAlive()) continue;
        dealDamage(h, f, dmg, 'magical');
        if (splash) enemiesOf(h).filter(o => o !== f && o.isAlive() && Math.hypot(o.x - f.x, o.y - f.y) <= 0.8 * splash).forEach(o => dealDamage(h, o, Math.round(dmg * MAGE.splash), 'magical'));
    }
    if (arena) fxShake(3);
    if (Math.abs(aim.x - h.x) > 0.2) h.facing = Math.sign(aim.x - h.x);
    return true;
}

// --- ESPACIO: el teletransporte (lo llama playerDash, fxSkills.js) ---
function mageBlink(h) {
    const c = cursorWorld();
    if (!c) return false;
    const dx = c.x - h.x, dy = c.y - h.y, d = Math.min(MAGE.blinkTiles, Math.hypot(dx, dy));
    if (d < 0.5) return false;
    let to = null; // la última casilla libre antes de una pared (no atraviesa muros: los secretos siguen sellados)
    for (let s = 0.25; s <= d; s += 0.25) {
        const x = Math.round(h.x + dx / Math.hypot(dx, dy) * s), y = Math.round(h.y + dy / Math.hypot(dx, dy) * s);
        if (!walkable(h.arena, x, y)) break;
        to = { x, y };
    }
    if (!to || (to.x === h.x && to.y === h.y)) return false;
    const from = { x: h.x, y: h.y }, fa = fxArena(h);
    h.x = h.rx = to.x; h.y = h.ry = to.y;
    if (fa) { fxParticles(fa, from.x, from.y, 'arcane', 10, 2); fxParticles(fa, to.x, to.y, 'arcane', 10, 2); fxRing(h, '#c77dff', 0.9, 0.3); sfx('dash'); }
    if (Math.abs(dx) > 0.2) h.facing = Math.sign(dx);
    return true;
}
