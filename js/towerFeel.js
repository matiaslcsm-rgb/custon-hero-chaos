// Tower Chaos: cómo se sienten las 3 armas iniciales (REWORK.md, "sensación de las armas", 2026-10-08).
//
//   El problema (a pedido): sin animación de combate se sentía tosco, y la Q de cada arma tardaba 6-7 s en volver,
//   así que la mayor parte del tiempo no había nada que apretar. Referencias: el combo de Hades (ritmo de 3 golpes
//   con remate), el arco cargado de Hyper Light Drifter / Hades (mantener, apuntar, soltar) y la "recarga activa"
//   de Gears of War (soltar justo en el momento da un plus).
//
//   ESPADA · Combo de Tajos: cada toque de Q tira un tajo en arco hacia el cursor que agarra a TODOS los que están en
//   el arco; el tercero es el remate (×2, empuja y frena el tiempo un instante). Enfriamiento corto entre tajos y una
//   recuperación después del remate. Sin maná: el límite es el ritmo. Mantener la Q encadena solo.
//   ARCO · Tiro Tensado: mantené Q para tensar (caminás más lento y no disparás de forma automática) y soltá para
//   tirar hacia el cursor: de ×0.5 al toque a ×2 tensado del todo, que atraviesa a todos. Soltar justo al tensarse
//   (la línea destella): tiro perfecto, +30%. Cuesta poco maná: el límite es el maná.
//   BASTÓN · Saeta Arcana: un orbe apuntado que explota al tocar al primero (y salpica al resto alrededor). Cuesta
//   maná y vuelve rápido.
//
//   Equilibrio: usar bien la Q rinde un 30-50% más que dejar que pegue el ataque automático (lo reemplaza mientras
//   la usás), no el doble. Medido con el piloto automático (que también la usa); los números, en REWORK.md.

const SWORD_COMBO = { hits: [1, 1.15, 2], others: 0.6, window: 0.9, halfArc: 1.15, hitStop: [0.025, 0.03, 0.075], shake: [0, 0.8, 3] };
const BOW_SHOT = { chargeTime: 0.9, perfect: 0.2, tap: 0.5, full: 2.3, perfectMult: 1.3, slow: -0.45, aiHold: 1.3, speed: 18 }; // aiHold: el piloto suelta tensado del todo, pasado el momento perfecto (como un jugador correcto, no perfecto)

// Hacia dónde sale un golpe apuntado: el cursor (aimPoint) o, si no hay, el enemigo más cercano o hacia donde mira.
function aimDirection(c, maxRange = 6) {
    const t = c.aimPoint || nearestEnemy(c, maxRange);
    const dx = t ? t.x - c.x : c.facing || 1, dy = t ? t.y - c.y : 0, d = Math.hypot(dx, dy) || 1;
    return { dx: dx / d, dy: dy / d, dist: t ? Math.hypot(t.x - c.x, t.y - c.y) : 0 };
}
function inArc(c, e, dir, reach, halfArc) {
    const vx = e.x - c.x, vy = e.y - c.y, d = Math.hypot(vx, vy);
    if (d > reach) return false;
    if (d <= 1.01) return true; // pegado: siempre lo agarra (en casillas, el de al lado está a 1)
    return Math.acos(Math.max(-1, Math.min(1, (vx * dir.dx + vy * dir.dy) / d))) <= halfArc;
}

// --- ESPADA: Combo de Tajos ---
const SWORD_SKILL = {
    id: 'ADVENTURER_GOLPE', name: 'Combo de Tajos', kind: 'active', heroKey: 'ADVENTURER', tags: ['FÍSICO'],
    pointTarget: true, ownFx: true, castXp: 0.25,
    values: { cooldown: 0.5, recovery: [1.8, 1.7, 1.6, 1.5], manaCost: 0, dmgMult: [0.7, 0.8, 0.9, 1], radius: 1.9 },
    description: 'Tres tajos en arco hacia el cursor: {dmgMult%} de tu daño al más cercano (60% al resto del arco), después ×1.15 y el remate ×2, que empuja. Sin maná. Mantené la tecla para encadenarlos.',
    cooldownAfter(h) { return (h.comboStep || 0) === 0 ? val(this, h, 'recovery') * COOLDOWN_MULT : skillCooldown(this, h); },
    aiWants(h, nearest, d) { return !!nearest && d <= val(this, h, 'radius') + 0.2; },
    cast(c) { return swordSwing(c, this); }
};
function swordSwing(c, skill) {
    if (gameClock - (c.comboAt ?? -99) > SWORD_COMBO.window + skillCooldown(skill, c)) c.comboStep = 0; // se cortó el ritmo
    const step = c.comboStep || 0, dir = aimDirection(c, 4), reach = val(skill, c, 'radius');
    // Paso adelante (peso del golpe, como en Hades): si no hay nadie pegado en esa dirección, avanza una casilla
    const sx = Math.round(dir.dx), sy = Math.round(dir.dy);
    if (c.arena && (sx || sy) && dir.dist > 1.5 && canStep(c.arena, c.x, c.y, sx, sy) && !unitAt(c.arena, c.x + sx, c.y + sy)) { c.x += sx; c.y += sy; }
    const mult = val(skill, c, 'dmgMult') * SWORD_COMBO.hits[step];
    const hit = enemiesOf(c).filter(e => e.isAlive() && inArc(c, e, dir, reach, SWORD_COMBO.halfArc))
        .sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y));
    hit.forEach((e, i) => {
        const isCrit = Math.random() < effCritChance(c) / 100, falloff = i ? SWORD_COMBO.others : 1; // el más cercano entero, el resto menos
        dealDamage(c, e, Math.round(effAttack(c) * mult * falloff * (isCrit ? 2 : 1)), 'physical', { isCrit });
        if (step === 2 && e.isAlive() && !(e.isGuardian || e.isCaveBoss || e.isBoss)) { // el remate empuja
            const kx = Math.sign(Math.round(e.x - c.x)), ky = Math.sign(Math.round(e.y - c.y));
            if ((kx || ky) && walkable(e.arena, e.x + kx, e.y + ky) && !unitAt(e.arena, e.x + kx, e.y + ky)) { e.x += kx; e.y += ky; }
        }
    });
    deflectBullets(c, dir, reach, SWORD_COMBO.halfArc); // el tajo desvía los proyectiles que agarra (towerBullets.js)
    c.attackTimer = 0; // el tajo reemplaza al ataque automático (no se suman)
    c.comboAt = gameClock; c.comboStep = (step + 1) % 3;
    fxSwordSwing(c, dir, step, reach, hit.length > 0);
    return true; // un tajo al aire también cuenta (el ritmo es tuyo)
}
function unitAt(arena, x, y) { return (arena.creeps || []).some(o => o.isAlive() && o.x === x && o.y === y) || (arena.heroes || []).some(h => h.isAlive() && h.x === x && h.y === y); }
function fxSwordSwing(c, dir, step, reach, landed) {
    const arena = fxArena(c);
    if (!arena) return;
    const angle = Math.atan2(dir.dy, dir.dx);
    if (Math.abs(dir.dx) > 0.2) c.facing = Math.sign(dir.dx);
    c.fxAttack = { kind: 'melee', dx: dir.dx, dy: dir.dy, at: fxClock };
    pushFx(arena, { kind: 'sweep', unit: c, x: c.x, y: c.y, angle, reach, half: SWORD_COMBO.halfArc, flip: step === 1, finisher: step === 2,
        color: step === 2 ? '#ffd166' : '#f3e7c9', color2: step === 2 ? '#c9a227' : '#8a7a5c', life: step === 2 ? 0.3 : 0.2 });
    sfx('swing');
    if (landed) { sfx(step === 2 ? 'crit' : 'hit'); fxHitStop(SWORD_COMBO.hitStop[step]); if (SWORD_COMBO.shake[step]) fxShake(SWORD_COMBO.shake[step]); }
    if (step === 2) fxParticles(arena, c.x + dir.dx * reach * 0.6, c.y + dir.dy * reach * 0.6, 'steel', landed ? 10 : 4, 4, { angle, spread: 1.1, life: 0.35 });
}

// --- ARCO: Tiro Tensado ---
const BOW_SKILL = {
    id: 'ADVENTURER_VOLLEY', name: 'Tiro Tensado', kind: 'active', heroKey: 'ADVENTURER', tags: ['FÍSICO'],
    pointTarget: true, ownFx: true, chargeable: true, castXp: 0.35,
    values: { cooldown: 0.6, manaCost: 6, dmgMult: [1, 1.15, 1.3, 1.45], range: 8 },
    description: 'Mantené la tecla para tensar y soltala para tirar hacia el cursor: {dmgMult%} de tu daño ×0.5 al toque, hasta ×2.3 tensado del todo (y atraviesa a todos). Soltá justo cuando destella: tiro perfecto, +30%.',
    aiWants(h, nearest, d) { // el piloto también tensa (no dispara al instante: sería trampa en las mediciones)
        if (nearest && d <= val(this, h, 'range') && !h.charging && lineClear(h.arena, h.x, h.y, nearest.x, nearest.y)) startCharge(h, this, null);
        return false;
    },
    cast(c) { return bowShot(c, this); }
};
function chargeOf(c) { return c.charging ? Math.min(1, (gameClock - c.charging.start) / BOW_SHOT.chargeTime) : 0; }
function bowShot(c, skill) {
    const held = c.charging ? gameClock - c.charging.start : BOW_SHOT.chargeTime * BOW_SHOT.aiHold;
    const charge = Math.min(1, held / BOW_SHOT.chargeTime), full = charge >= 1;
    const perfect = full && held - BOW_SHOT.chargeTime <= BOW_SHOT.perfect;
    const dir = aimDirection(c, val(skill, c, 'range')), range = val(skill, c, 'range');
    const isCrit = Math.random() < effCritChance(c) / 100;
    const dmg = Math.round(effAttack(c) * val(skill, c, 'dmgMult') * (BOW_SHOT.tap + (BOW_SHOT.full - BOW_SHOT.tap) * charge) * (perfect ? BOW_SHOT.perfectMult : 1) * (isCrit ? 2 : 1));
    fireSkillProjectile(c, { tx: c.x + dir.dx * range, ty: c.y + dir.dy * range, speed: BOW_SHOT.speed * (full ? 1.25 : 1), radius: 0.55, dmg, dmgType: 'physical',
        skillName: skill.name, stopOnHit: !full, solid: true, arrow: full ? 'full' : 'arrow', isCrit, quietMiss: true });
    c.attackTimer = 0;
    const arena = fxArena(c);
    if (arena) {
        if (Math.abs(dir.dx) > 0.2) c.facing = Math.sign(dir.dx);
        c.fxAttack = { kind: 'ranged', dx: dir.dx, dy: dir.dy, at: fxClock };
        sfx(full ? 'el_steel' : 'shoot');
        if (perfect) { fxText(c, '¡PERFECTO!', '#ffd166', 12, 0.8); fxHitStop(0.04); fxShake(1.5); }
        if (full) fxParticles(arena, c.x + dir.dx * 0.6, c.y + dir.dy * 0.6, 'steel', 6, 3, { angle: Math.atan2(dir.dy, dir.dx), spread: 0.4, life: 0.3 });
    }
    return true;
}
// Empezar a tensar (jugador con la tecla, o el piloto). key: la tecla que hay que soltar.
function startCharge(h, skill, key) {
    if (h.charging || !h.isAlive() || hasFlag(h, 'stun') || skillLevel(h, skill) === 0 || (h.cooldowns[skill.id] || 0) > 0) return false;
    if (h.mana < (val(skill, h, 'manaCost') || 0)) { if (key) log(`❌ Maná insuficiente para ${skill.name}.`); return false; }
    h.charging = { skill, start: gameClock, key };
    return true;
}
function releaseCharge(h) {
    const ch = h.charging;
    if (!ch) return false;
    const c = ch.key ? cursorWorld() : null, t = c || nearestEnemy(h, val(ch.skill, h, 'range')); // con la tecla, al cursor; la IA, al más cercano
    let ok;
    try { ok = t ? castAt(h, ch.skill, t.x, t.y) : tryCastSkill(h, ch.skill); } finally { h.charging = null; removeEffect(h, 'CHARGING'); }
    return ok;
}
// Cada cuadro (updateTower): mientras tensa, camina más lento y no ataca solo; el piloto suelta al llegar a su punto.
function towerFeelTick(h) {
    if (!h.charging) return;
    if (!h.isAlive() || hasFlag(h, 'stun') || !h.hasSkill(h.charging.skill.id)) { h.charging = null; removeEffect(h, 'CHARGING'); return; }
    if (!getEffect(h, 'CHARGING')) addEffect(h, { id: 'CHARGING', name: 'Tensando', duration: Infinity, flags: [], mods: { moveSpeedPct: BOW_SHOT.slow } });
    h.attackTimer = 0;
    if (!h.charging.key && gameClock - h.charging.start >= BOW_SHOT.chargeTime * BOW_SHOT.aiHold) releaseCharge(h); // la tensó la IA (piloto o automáticas, H): suelta sola
}
window.addEventListener('keyup', e => { if (player && player.charging && player.charging.key === e.key.toLowerCase()) releaseCharge(player); });
window.addEventListener('blur', () => { if (player && player.charging && player.charging.key) releaseCharge(player); }); // cambiar de ventana suelta la flecha

// --- BASTÓN: Saeta Arcana ---
const STAFF_SKILL = {
    id: 'ADVENTURER_BOLT', name: 'Saeta Arcana', kind: 'active', heroKey: 'ADVENTURER', tags: ['MÁGICO'],
    pointTarget: true, castXp: 0.5,
    values: { cooldown: [2.9, 2.7, 2.5, 2.3], manaCost: 14, dmgMult: [1, 1.15, 1.3, 1.45], radius: 1.3, range: 7 },
    description: 'Un orbe arcano hacia el cursor que explota al tocar al primero: {dmgMult%} de tu daño como daño mágico, y la mitad a los que estén a {radius} casillas. Marca con su elemento para las reacciones.',
    aiWants(h, nearest, d) { return !!nearest && d <= val(this, h, 'range') && lineClear(h.arena, h.x, h.y, nearest.x, nearest.y); },
    cast(c) {
        const range = val(this, c, 'range'), aim = c.aimPoint || nearestEnemy(c, range);
        if (!aim) { log('Saeta Arcana: sin objetivo en alcance.'); return false; }
        const dx = aim.x - c.x, dy = aim.y - c.y, d = Math.hypot(dx, dy) || 1, go = Math.min(range, Math.max(d, 1.5));
        const dmg = Math.round(effAttack(c) * val(this, c, 'dmgMult')), radius = val(this, c, 'radius');
        const burst = (x, y, skip) => { // explosión: la mitad a los de alrededor
            enemiesOf(c).forEach(e => { if (e !== skip && e.isAlive() && Math.hypot(e.x - x, e.y - y) <= radius) { projectileElement = 'arcane'; try { dealDamage(c, e, Math.round(dmg * 0.5), 'magical'); } finally { projectileElement = null; } } });
            const fa = fxArena(c); if (fa) { pushFx(fa, { kind: 'ring', x, y, color: '#c77dff', radius, life: 0.35 }); fxImpact(fa, x, y, 'arcane', true); }
        };
        fireSkillProjectile(c, { tx: c.x + dx / d * go, ty: c.y + dy / d * go, speed: 13, radius: 0.55, dmg, dmgType: 'magical', skillName: this.name, stopOnHit: true, solid: true, quietMiss: true,
            onHit: t => burst(t.x, t.y, t), onArrive: (x, y) => burst(x, y, null) });
        return true;
    }
};

[SWORD_SKILL, BOW_SKILL, STAFF_SKILL].forEach(s => { SKILL_INDEX[s.id] = s; });

// --- DIBUJO ---
// Tajo en arco alrededor del que pega (lo llama drawSkillFx en fxSkills.js)
function drawSweepFx(f, t, px, py) {
    const r = f.reach * TILE * 0.85, half = f.half * (f.finisher ? 1.15 : 1), head = Math.min(1, t * 2.6), tail = Math.max(0, t * 2.6 - 0.9);
    const a0 = f.angle - half, a1 = f.angle + half, from = f.flip ? a1 : a0, span = (f.flip ? -1 : 1) * 2 * half;
    const s = from + span * tail, e = from + span * head;
    ctx.save();
    ctx.globalAlpha *= 0.35; ctx.fillStyle = f.color2; // la estela, una medialuna rellena
    ctx.beginPath(); ctx.arc(px, py, r, Math.min(s, e), Math.max(s, e)); ctx.arc(px, py, r * 0.45, Math.max(s, e), Math.min(s, e), true); ctx.closePath(); ctx.fill();
    ctx.globalAlpha /= 0.35;
    ctx.strokeStyle = f.color; ctx.lineWidth = (f.finisher ? 7 : 4.5) * (1 - t * 0.5); ctx.lineCap = 'round'; ctx.shadowColor = f.color; ctx.shadowBlur = f.finisher ? 14 : 8;
    ctx.beginPath(); ctx.arc(px, py, r, Math.min(s, e), Math.max(s, e)); ctx.stroke();
    ctx.restore();
}
// Flecha (los disparos del arco, básicos y tensados)
function drawArrowProjectile(p, x, y) {
    const dx = p.dx ?? (p.target ? p.target.x - p.x : 1), dy = p.dy ?? (p.target ? p.target.y - p.y : 0), a = Math.atan2(dy, dx), full = p.arrow === 'full';
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    if (full) { ctx.strokeStyle = 'rgba(255,209,102,0.55)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(4, 0); ctx.stroke(); }
    ctx.strokeStyle = INK.line; ctx.lineWidth = full ? 2.5 : 2; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.fillStyle = p.isCrit || full ? '#ffd166' : '#d9d2c0'; ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(5, -4); ctx.lineTo(5, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#6b2a1f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-15, -3); ctx.moveTo(-12, 0); ctx.lineTo(-15, 3); ctx.stroke();
    ctx.restore();
}
// Encima de las unidades: la línea de tiro mientras tensás y los puntitos del combo de la espada.
function drawTowerFeel(level) {
    const h = player;
    if (!h || !h.isAlive() || h.arena !== level) return;
    const p = { x: (h.rx ?? h.x) * TILE + TILE / 2, y: (h.ry ?? h.y) * TILE + TILE / 2 };
    if (h.charging) {
        const k = chargeOf(h), over = gameClock - h.charging.start - BOW_SHOT.chargeTime, perfect = k >= 1 && over <= BOW_SHOT.perfect;
        const c = h === player && !autopilot ? cursorWorld() : nearestEnemy(h, 8), dir = c ? (() => { const dx = c.x - h.x, dy = c.y - h.y, d = Math.hypot(dx, dy) || 1; return { dx: dx / d, dy: dy / d }; })() : { dx: h.facing || 1, dy: 0 };
        const len = val(h.charging.skill, h, 'range') * TILE;
        ctx.save();
        ctx.strokeStyle = perfect ? '#ffffff' : k >= 1 ? '#ffd166' : '#6b2a1f'; ctx.globalAlpha = 0.35 + 0.55 * k; ctx.lineWidth = 1.5 + 2.5 * k;
        if (k < 1) ctx.setLineDash([6, 6 - 4 * k]);
        if (perfect) { ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 14; }
        ctx.beginPath(); ctx.moveTo(p.x + dir.dx * TILE * 0.5, p.y + dir.dy * TILE * 0.5); ctx.lineTo(p.x + dir.dx * len, p.y + dir.dy * len); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 0.9; ctx.lineWidth = 3; ctx.strokeStyle = k >= 1 ? '#ffd166' : '#f3e7c9'; // aro que se cierra
        ctx.beginPath(); ctx.arc(p.x, p.y, TILE * 0.62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
        ctx.restore();
    }
    const step = h.comboStep || 0;
    if (step && gameClock - (h.comboAt ?? -99) < SWORD_COMBO.window + 0.4) { // el combo sigue vivo: cuántos tajos van
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i < step ? '#c9a227' : 'rgba(29,23,18,0.35)'; ctx.strokeStyle = INK.line; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(p.x - 8 + i * 8, p.y + TILE * 0.62, i === 2 ? 3.5 : 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
    }
}
