// Infinite Tower: la especial (R) de cada clase (fase T00 paso 4, decidido por el usuario 2026-10-14). Enfriamiento largo.
//   · Guerrero, Torbellino: un giro que pega a todos alrededor y los empuja.
//   · Arquero, Lluvia de Flechas: una zona en el cursor que pega varias veces.
//   · Mago, Meteoro: cae en el cursor después de un aviso y deja el suelo ardiendo.
// Medida contra el daño por segundo de cada clase (REWORK.md).

const SPECIAL = { cd: 20,
    whirl: { radius: 2.2, mult: 3, push: 2 },
    rain: { radius: 2, hits: 6, every: 0.35, mult: 0.3 },
    meteor: { radius: 2, delay: 0.8, mult: 1.6, burn: 3, burnEvery: 0.5, burnMult: 0.3 } }; // medidas: cada una suma ~20% de daño en grupo (REWORK.md)
const SPECIAL_NAME = { warrior: 'Torbellino', archer: 'Lluvia de Flechas', mage: 'Meteoro' };

function hasSpecial(h) { return gameMode === 'tower' && !!h && !!SPECIAL_NAME[h.heroClass]; }
// Tecla R (game.js): devuelve true si la tecla era de la especial (aunque esté recargando)
function classSpecial(h, aim = cursorWorld()) {
    if (!hasSpecial(h)) return false;
    if (!h.isAlive() || hasFlag(h, 'stun') || h.mageCharge) return true;
    if (gameClock < (h.specialReadyAt || 0)) { log(`⏳ ${SPECIAL_NAME[h.heroClass]}: faltan ${Math.ceil(h.specialReadyAt - gameClock)} s.`); return true; }
    const at = aim || { x: h.x + (h.facing || 1) * 2, y: h.y };
    h.specialReadyAt = gameClock + SPECIAL.cd * (typeof archerHaste === 'function' ? archerHaste(h) : 1);
    ({ warrior: specialWhirl, archer: specialRain, mage: specialMeteor })[h.heroClass](h, at);
    emit(h, 'onCast', { skill: { id: 'CLASS_SPECIAL', name: SPECIAL_NAME[h.heroClass] } });
    return true;
}
// El piloto automático (updateTower): la tira con 2 o más enemigos al alcance, o contra un jefe. Sin esto, el piloto
// medía las clases sin su especial (2026-10-14).
function aiClassSpecial(h) {
    if (!hasSpecial(h) || gameClock < (h.specialReadyAt || 0) || h.mageCharge || hasFlag(h, 'stun')) return false;
    const r = h.heroClass === 'warrior' ? SPECIAL.whirl.radius : effRange(h) + 1, foes = foesNear(h, h, r);
    if (foes.length < 2 && !foes.some(e => e.isGuardian || e.isCaveBoss || e.isBoss || e.isHiddenBoss)) return false;
    const c = foes.reduce((a, e) => ({ x: a.x + e.x / foes.length, y: a.y + e.y / foes.length }), { x: 0, y: 0 }); // al medio del grupo
    return classSpecial(h, c);
}
// Lo que pasa después (los golpes de la lluvia, el meteoro que cae, el suelo que arde): se corre cada cuadro
function specialTick(h) {
    if (!h.specialLater || !h.specialLater.length) return;
    const due = h.specialLater.filter(e => gameClock >= e.at);
    h.specialLater = h.specialLater.filter(e => gameClock < e.at);
    due.forEach(e => e.run());
}
const later = (h, delay, run) => (h.specialLater = h.specialLater || []).push({ at: gameClock + delay, run });
const foesNear = (h, p, r) => enemiesOf(h).filter(o => o.isAlive() && Math.hypot(o.x - p.x, o.y - p.y) <= r);

function specialWhirl(h) {
    const S = SPECIAL.whirl, dmg = Math.round(effAttack(h) * S.mult);
    foesNear(h, h, S.radius).forEach(e => {
        dealDamage(h, e, dmg, 'physical');
        if (!e.isAlive() || e.isGuardian || e.isCaveBoss || e.isBoss) return;
        const kx = Math.sign(Math.round(e.x - h.x)), ky = Math.sign(Math.round(e.y - h.y));
        for (let i = 0; i < S.push && (kx || ky); i++) { if (!walkable(e.arena, e.x + kx, e.y + ky) || unitAt(e.arena, e.x + kx, e.y + ky)) break; e.x += kx; e.y += ky; }
    });
    const fa = fxArena(h);
    if (fa) { fxRing(h, '#f3e7c9', S.radius, 0.4); fxParticles(fa, h.x, h.y, 'steel', 16, 5); fxText(h, '¡Torbellino!', '#f3e7c9', 12, 0.8); fxShake(4); }
}
function specialRain(h, at) {
    const S = SPECIAL.rain, dmg = Math.round(effAttack(h) * S.mult), fa = fxArena(h);
    if (fa) { pushFxAt(fa, { kind: 'ring', x: at.x, y: at.y, color: '#ffd166', radius: S.radius, life: S.hits * S.every }); fxText(h, '¡Lluvia de Flechas!', '#ffd166', 12, 0.8); }
    for (let i = 0; i < S.hits; i++) later(h, i * S.every, () => {
        foesNear(h, at, S.radius).forEach(e => dealDamage(h, e, dmg, 'physical'));
        if (fa) fxParticles(fa, at.x + (Math.random() - 0.5) * S.radius * 1.5, at.y + (Math.random() - 0.5) * S.radius * 1.5, 'steel', 5, 2);
    });
}
function specialMeteor(h, at) {
    const S = SPECIAL.meteor, dmg = Math.round(effAttack(h) * S.mult), fa = fxArena(h);
    if (fa) { pushFxAt(fa, { kind: 'ring', x: at.x, y: at.y, color: '#e85d04', radius: S.radius, life: S.delay }); fxText(h, '¡Meteoro!', '#e85d04', 12, 0.8); }
    later(h, S.delay, () => {
        foesNear(h, at, S.radius).forEach(e => dealDamage(h, e, dmg, 'magical'));
        if (fa) { pushFxAt(fa, { kind: 'skybolt', x: at.x, y: at.y, color: '#ffd166', color2: '#e85d04', life: 0.4 }); fxParticles(fa, at.x, at.y, 'fire', 20, 5); fxShake(7); }
        for (let t = S.burnEvery; t <= S.burn; t += S.burnEvery) later(h, t, () => {
            foesNear(h, at, S.radius).forEach(e => dealDamage(h, e, Math.round(dmg * S.burnMult * S.burnEvery), 'magical'));
            if (fa) fxParticles(fa, at.x, at.y, 'fire', 4, 1.5, { style: 'smoke' });
        });
    });
}
