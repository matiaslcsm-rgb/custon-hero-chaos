// Tower Chaos: tiradores y lluvias de proyectiles (REWORK.md, "tiradores", 2026-10-08).
//
//   A pedido: "enemigos que disparen tipo Enter the Gungeon". La mecánica se llama "bullet hell" (en japonés danmaku):
//   los enemigos llenan el aire de proyectiles LENTOS con formas reconocibles (ráfaga, abanico, escopeta, anillo,
//   espiral) y la gracia es leerlas y pasar entre ellas. Reglas de Enter the Gungeon que copiamos:
//     · Cada tirador AVISA antes de disparar (un brillo que se cierra, ~0.45 s): nunca te tira sin aviso.
//     · Los proyectiles son lentos y grandes: se esquivan caminando. El esquive (Espacio) los atraviesa (invulnerable).
//     · Las paredes los frenan: taparse detrás de algo sirve.
//   Lo nuestro: la ESPADA desvía los proyectiles que agarra su tajo (identidad: el cuerpo a cuerpo tiene con qué
//   responderle a un tirador). El piloto automático los lee (predice por dónde pasan) para que las mediciones valgan.

const BULLET = { r: 0.26, hitR: 0.3, maxLife: 4, cap: 220, tell: 0.45, firstShot: [0.8, 2], strafeEvery: 1.6 };
// Patrones: count balas por disparo, abiertas en spread (radianes, total), shots disparos separados por gap s,
// rotate: giro entre disparos (espiral), speed casillas/s (o [min, max] al azar), dmg × el ataque, every: s entre ataques.
const BULLET_PATTERNS = {
    burst: { name: 'ráfaga', count: 1, spread: 0, shots: 3, gap: 0.16, speed: 6.5, dmg: 0.55, every: [2.4, 3.2] },
    fan: { name: 'abanico', count: 3, spread: 0.6, shots: 1, speed: 6, dmg: 0.6, every: [2.2, 3] },
    shotgun: { name: 'escopeta', count: 6, spread: 0.9, shots: 1, speed: [4.5, 7.5], dmg: 0.45, life: 1.1, every: [2.6, 3.4] },
    ring: { name: 'anillo', count: 10, spread: Math.PI * 2, shots: 1, speed: 4.5, dmg: 0.5, every: [3.2, 4.2] },
    spiral: { name: 'espiral', count: 2, spread: Math.PI, shots: 12, gap: 0.12, rotate: 0.36, speed: 4.5, dmg: 0.4, every: [4.5, 5.5] }
};
const bulletRand = v => Array.isArray(v) ? v[0] + Math.random() * (v[1] - v[0]) : v;

// --- ROLES DEL BESTIARIO QUE DISPARAN (towerBestiary.js) ---
Object.assign(BEAST_ROLES, {
    gunner: { base: 'ARCHER', bodies: ['archer', 'toad', 'scorpion', 'mage'], desc: 'dispara ráfagas que se esquivan', patterns: ['burst', 'fan', 'shotgun'] },
    sprayer: { base: 'SHAMAN', bodies: ['mage', 'wraith', 'golem'], desc: 'llena el aire de proyectiles', patterns: ['ring', 'spiral'], tier: 1 }
});
// Cada criatura tiradora sale con un patrón propio (se ve en el bestiario)
function makeGunnerType(t, roleKey) {
    const role = BEAST_ROLES[roleKey];
    if (!role || !role.patterns) return t;
    const pattern = pickW(role.patterns);
    return Object.assign(t, { bulletPattern: pattern, range: 6, hp: Math.round(t.hp * (role.tier ? 1.3 : 1)),
        update: (c, dt) => gunnerTick(c, dt), mechanic: t.mechanic.replace(/\.$/, '') + ` (${BULLET_PATTERNS[pattern].name}).` });
}

// --- EL TIRADOR ---
// Devuelve true si manejó el turno (así updateCreep no hace su ataque básico).
function gunnerTick(c, dt) {
    if (!player.isAlive()) return false;
    const L = c.arena, d = Math.hypot(c.x - player.x, c.y - player.y);
    if (c.burst) { bulletBurstTick(c); return true; }
    if (d > 8 || !lineClear(L, c.x, c.y, player.x, player.y)) return false; // a buscarlo
    if (c.shotAt === undefined) c.shotAt = gameClock + bulletRand(BULLET.firstShot);
    if (c.tellUntil) { // avisando: quieto
        if (gameClock >= c.tellUntil) { c.tellUntil = 0; fireBulletPattern(c, c.type.bulletPattern); c.shotAt = gameClock + bulletRand(BULLET_PATTERNS[c.type.bulletPattern].every); }
        return true;
    }
    if (gameClock >= c.shotAt) { c.tellUntil = gameClock + BULLET.tell; return true; }
    if (d < 3) { towerStepAway(c, player, dt); return true; } // no te deja acercarte
    if (gameClock >= (c.strafeAt || 0)) { // se mueve de costado entre disparos (como los de Gungeon)
        c.strafeAt = gameClock + BULLET.strafeEvery * (0.7 + Math.random() * 0.6);
        const sx = Math.sign(player.y - c.y), sy = -Math.sign(player.x - c.x), k = Math.random() < 0.5 ? 1 : -1;
        if ((sx || sy) && canStep(L, c.x, c.y, sx * k, sy * k) && !unitAt(L, c.x + sx * k, c.y + sy * k)) { c.x += sx * k; c.y += sy * k; }
    }
    return true;
}
// Dispara un patrón (el primer disparo ya; los demás, en ráfaga)
function fireBulletPattern(c, key, opts = {}) {
    const P = BULLET_PATTERNS[key];
    const base = opts.angle ?? Math.atan2(player.y - c.y, player.x - c.x);
    c.burst = { key, left: P.shots, next: gameClock, angle: base, dmgMult: opts.dmgMult || 1 };
    bulletBurstTick(c);
}
function bulletBurstTick(c) {
    const b = c.burst, P = BULLET_PATTERNS[b.key];
    while (b.left > 0 && gameClock >= b.next) {
        const aim = P.rotate ? b.angle : (b.key === 'burst' ? Math.atan2(player.y - c.y, player.x - c.x) : b.angle); // la ráfaga corrige la puntería
        for (let i = 0; i < P.count; i++) {
            const a = P.count === 1 ? aim : P.spread >= Math.PI * 2 - 0.01 ? aim + i / P.count * Math.PI * 2 : aim - P.spread / 2 + P.spread * i / (P.count - 1);
            spawnBullet(c, a, bulletRand(P.speed), P.dmg * b.dmgMult, P.life);
        }
        b.left--; b.next += P.gap || 0; b.angle += P.rotate || 0;
        if (fxArena(c)) sfx('shoot');
    }
    if (b.left <= 0) c.burst = null;
}
function spawnBullet(c, angle, speed, dmgMult, life) {
    const L = c.arena;
    L.bullets = L.bullets || [];
    if (L.bullets.length >= BULLET.cap) return;
    L.bullets.push({ x: c.x, y: c.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: BULLET.r, born: gameClock, life: life || BULLET.maxLife,
        dmg: Math.max(1, Math.round(effAttack(c) * dmgMult)), type: c.attackType || 'physical', owner: c, color: c.color || '#9b2226' });
    if (player && player.arena === L && Math.hypot(c.x - player.x, c.y - player.y) < 9) writeNotebookPage('BULLETS'); // el Cuaderno lo explica
}

// --- CADA CUADRO: mover, chocar con paredes y pegarle al héroe ---
function towerBulletsTick(level, dt) {
    const B = level.bullets;
    if (!B || !B.length) return;
    const h = player, ghost = !h.isAlive() || hasFlag(h, 'invulnerable'); // con el esquive los atravesás
    for (let i = B.length - 1; i >= 0; i--) {
        const b = B[i];
        b.x += b.vx * dt; b.y += b.vy * dt;
        let gone = gameClock - b.born > b.life || !walkable(level, Math.round(b.x), Math.round(b.y));
        if (!gone && !ghost && h.arena === level && Math.hypot(b.x - h.x, b.y - h.y) < b.r + BULLET.hitR) {
            const { dealt } = dealDamage(b.owner, h, b.dmg, b.type);
            if (dealt > 0 && fxArena(h)) fxShake(1.2);
            gone = true;
        }
        if (gone) { if (fxArena(h) && level === h.arena) fxParticles(level, b.x, b.y, 'steel', 3, 1.5, { style: 'smoke', size: 2.5, life: 0.25 }); B.splice(i, 1); }
    }
}
// El tajo de la espada desvía los proyectiles que agarra (towerFeel.js)
function deflectBullets(c, dir, reach, halfArc) {
    const B = c.arena && c.arena.bullets;
    if (!B || !B.length) return 0;
    const before = B.length;
    c.arena.bullets = B.filter(b => !inArc(c, b, dir, reach + 0.3, halfArc + 0.2));
    const n = before - c.arena.bullets.length;
    if (n && fxArena(c)) { fxParticles(c.arena, c.x + dir.dx, c.y + dir.dy, 'lightning', 4 + n, 3, { life: 0.25 }); if (!c.deflectedOnce) { c.deflectedOnce = true; fxText(c, '¡DESVIADO!', '#ffd166', 11, 0.8); } }
    return n;
}

// --- JEFES: también llenan el aire (desde la fase 2: anillos; en la 3, espirales) ---
const BOSS_BULLETS = { ringEvery: 7, spiralEvery: 10, dmg: 0.35 };
function bossBulletTick(c, ph) {
    if (ph < 1 || c.burst) { if (c.burst) bulletBurstTick(c); return; }
    if (gameClock >= (c.ringAt ?? (c.ringAt = gameClock + 3))) { c.ringAt = gameClock + BOSS_BULLETS.ringEvery; fireBulletPattern(c, 'ring', { dmgMult: BOSS_BULLETS.dmg / BULLET_PATTERNS.ring.dmg }); }
    else if (ph >= 2 && gameClock >= (c.spiralAt ?? (c.spiralAt = gameClock + 5))) { c.spiralAt = gameClock + BOSS_BULLETS.spiralEvery; fireBulletPattern(c, 'spiral', { dmgMult: BOSS_BULLETS.dmg / BULLET_PATTERNS.spiral.dmg, angle: Math.random() * 6.28 }); }
}

// --- EL PILOTO LOS LEE ---
// Peligro en la casilla (x, y): balas que van a pasar cerca en los próximos `horizon` segundos (más peso cuanto antes).
function bulletDanger(hero, x, y, horizon = 0.7) {
    const B = hero.arena && hero.arena.bullets;
    if (!B || !B.length) return 0;
    let danger = 0;
    B.forEach(b => {
        const v2 = b.vx * b.vx + b.vy * b.vy || 1;
        const t = Math.max(0, Math.min(horizon, ((x - b.x) * b.vx + (y - b.y) * b.vy) / v2));
        if (Math.hypot(b.x + b.vx * t - x, b.y + b.vy * t - y) < b.r + BULLET.hitR + 0.25) danger += 1 / (t + 0.15);
    });
    return danger;
}
// ¿Le pega una en menos de `soon` segundos? (para tirarse con el esquive)
function bulletImminent(hero, soon = 0.22) { return bulletDanger(hero, hero.x, hero.y, soon) > 0; }

// --- DIBUJO ---
function drawTowerBullets(level) {
    (level.bullets || []).forEach(b => {
        if (!canSee(level, Math.round(b.x), Math.round(b.y))) return;
        const x = b.x * TILE + TILE / 2, y = b.y * TILE + TILE / 2, r = b.r * TILE;
        const danger = A11Y.colorblind ? '#f59e0b' : '#c1121f'; // siempre el mismo color de peligro: se leen en cualquier bioma
        ctx.save();
        ctx.globalAlpha = 0.4; ctx.fillStyle = danger; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = '#fff3d6'; ctx.strokeStyle = danger; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = INK.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    });
}
// El aviso del tirador: un aro de su color que se cierra hasta disparar
function drawGunnerTell(c, p) {
    if (!c.tellUntil || gameClock >= c.tellUntil) return;
    const k = 1 - (c.tellUntil - gameClock) / BULLET.tell, x = p.x * TILE + TILE / 2, y = p.y * TILE + TILE / 2;
    ctx.save(); ctx.strokeStyle = A11Y.colorblind ? '#f59e0b' : '#9b2226'; ctx.lineWidth = 2 + 2 * k; ctx.globalAlpha = 0.5 + 0.5 * k;
    ctx.beginPath(); ctx.arc(x, y, TILE * (1.3 - 0.7 * k), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}
