// Tower Chaos: los golpes comunes avisan (REWORK.md §12, 2026-10-08).
//
//   Medido con el piloto de reflejos humanos: el 70-77% del daño que recibís son ataques comunes, que pegaban al instante
//   (no había nada que esquivar fuera de los ataques anunciados de los fuertes). Como en Hades, ahora cada golpe común
//   tiene una PREPARACIÓN corta y visible:
//     · Cuerpo a cuerpo: 0,4 s (0,5 los grandes) con un tajo rojo marcado hacia vos. Si salís de su alcance o esquivás, falla.
//       Si lo aturdís mientras se prepara, el golpe se cancela.
//     · A distancia: 0,35 s con una línea roja de puntería y después un proyectil apuntado (más rápido que los de los
//       tiradores) que se puede esquivar y que las paredes frenan. Los rasgos (veneno, fuego…) se aplican si pega.
//   Equilibrio: la preparación se descuenta del tiempo entre ataques, así pegan igual de seguido que antes; la diferencia
//   es que ahora se pueden esquivar. Los jefes y los guardianes siguen con lo suyo (ataques anunciados).

const WINDUP = { melee: 0.4, big: 0.5, ranged: 0.35, reachSlack: 0.6, shotSpeed: 9, minGap: 0.25 };
function creepWindsUp(c) { return gameMode === 'tower' && !c.isBoss && !c.isGuardian && !c.isCaveBoss && !c.isRoot && c.arena && c.arena.kind === 'tower'; }
function windupTime(c) { return c.range > 2 ? WINDUP.ranged : (c.type && c.type.scale > 1.1 ? WINDUP.big : WINDUP.melee); }
// Intervalo entre ataques con la preparación descontada (mismo ritmo que antes)
function creepAttackGap(c, base) { return creepWindsUp(c) ? Math.max(WINDUP.minGap, base - windupTime(c)) : base; }
function startCreepWindup(c, target, atk) {
    c.windup = { target, atk, at: gameClock, until: gameClock + windupTime(c), ranged: c.range > 2, aimX: target.x, aimY: target.y };
    if (target.x !== c.x) c.facing = Math.sign(target.x - c.x);
}
// Cada cuadro mientras se prepara: true = el turno es de la preparación (quieto)
function creepWindupTick(c) {
    const w = c.windup;
    if (!w) return false;
    if (hasFlag(c, 'stun') || !w.target.isAlive()) { c.windup = null; return false; } // aturdido: se cancela
    if (!w.ranged) { w.aimX = w.target.x; w.aimY = w.target.y; } // el tajo sigue a quien apunta hasta el final
    if (gameClock < w.until) return true;
    c.windup = null;
    if (w.ranged) {
        const a = Math.atan2(w.target.y - c.y, w.target.x - c.x), t = w.target;
        spawnBullet(c, a, WINDUP.shotSpeed, 1, null, { arrow: true, onHit: result => { if (c.type.onAttack) c.type.onAttack(c, t, result); if (c.champion) championOnAttack(c, t, result); } });
        fxAttack(c, t, c.attackType === 'magical' ? 'cast' : 'ranged', c.attackType === 'magical' ? c.color : '#fefae0');
        return true;
    }
    const d = Math.hypot(c.x - w.target.x, c.y - w.target.y);
    if (d > c.range + WINDUP.reachSlack || hasFlag(w.target, 'invulnerable')) { // se corrió o esquivó: al aire
        fxAttack(c, w.target, 'melee');
        if (fxArena(c)) { fxSlash(c, { x: w.aimX, y: w.aimY }, '#8f8166', false); if (w.target === player && !player.dodgedOnce) { player.dodgedOnce = true; fxText(player, '¡esquivado!', '#2d6a4f', 11, 0.8); } }
        return true;
    }
    creepStrike(c, w.target, w.atk);
    return true;
}
// Lo que se dibuja mientras se prepara: tajo rojo o línea de puntería (debajo de las unidades)
function drawCreepWindups(level) {
    const col = A11Y.colorblind ? '245,158,11' : '193,18,31';
    level.creeps.forEach(c => {
        const w = c.windup;
        if (!w || !c.isAlive() || !canSee(level, c.x, c.y)) return;
        const k = Math.min(1, (gameClock - w.at) / (w.until - w.at)), cx = (c.rx ?? c.x) * TILE + TILE / 2, cy = (c.ry ?? c.y) * TILE + TILE / 2;
        const tx = (w.ranged ? w.target.x : w.aimX) * TILE + TILE / 2, ty = (w.ranged ? w.target.y : w.aimY) * TILE + TILE / 2;
        ctx.save();
        if (w.ranged) {
            ctx.strokeStyle = `rgba(${col},${0.25 + 0.6 * k})`; ctx.lineWidth = 1 + 2 * k; ctx.setLineDash([5, 4]);
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();
        } else { // arco rojo frente al bicho, que se cierra hacia el objetivo
            const a = Math.atan2(ty - cy, tx - cx), r = TILE * (0.55 + c.range * 0.45), half = 0.9 - 0.4 * k;
            ctx.fillStyle = `rgba(${col},${0.12 + 0.3 * k})`; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a - half, a + half); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = `rgba(${col},${0.5 + 0.5 * k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, a - half, a + half); ctx.stroke();
        }
        ctx.restore();
    });
}
// Encima de todo (el arco del piso queda tapado por los muñecos): un "!" rojo sobre la cabeza del que se prepara, que crece
function drawCreepWindupMarks(level) {
    const col = A11Y.colorblind ? '#f59e0b' : '#c1121f';
    level.creeps.forEach(c => {
        const w = c.windup;
        if (!w || w.ranged || !c.isAlive() || !canSee(level, c.x, c.y)) return;
        const k = Math.min(1, (gameClock - w.at) / (w.until - w.at)), x = (c.rx ?? c.x) * TILE + TILE / 2, y = (c.ry ?? c.y) * TILE - TILE * 0.2 * (c.type && c.type.scale || 1);
        ctx.save(); ctx.font = `bold ${Math.round(12 + 8 * k)}px Georgia, serif`; ctx.textAlign = 'center';
        ctx.lineWidth = 3; ctx.strokeStyle = '#f3e7c9'; ctx.strokeText('!', x, y); ctx.fillStyle = col; ctx.fillText('!', x, y);
        ctx.restore();
    });
}
// El piloto: a distancia se corre de los tajos que le apuntan (cuerpo a cuerpo los aguanta, como haría una persona con
// espada); las flechas las lee como cualquier bala (bulletDanger).
function windupThreatsOn(hero, x, y) {
    if (!isRanged(hero)) return 0;
    return hero.arena.creeps.filter(c => c.windup && !c.windup.ranged && c.windup.target === hero && c.isAlive() && aiNotices(c.windup, c.windup.at) && Math.hypot(c.x - x, c.y - y) <= c.range + WINDUP.reachSlack).length;
}
