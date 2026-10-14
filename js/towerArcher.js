// Infinite Tower: el Arquero (fase T00, clases fijas al estilo Risk of Rain; diseño del usuario 2026-10-14).
//
//   · Clic: ráfaga de 3 flechas en abanico (cada una pega 33%: juntas, como una flecha sola, pero en abanico).
//   · Clic derecho: flechazo que siempre es crítico y aturde al primero que toca (6 s de enfriamiento).
//   · Espacio: impulso rápido hacia el mouse (4 casillas, en vez de las 3 del esquive con el teclado).
//   · Pasiva, Ojo Rápido: sus enfriamientos son 20% más cortos y sus reliquias se activan 50% más seguido.
//   El equipo no le da Q/E/R (como al Guerrero); conserva el Tiro Tensado del arco inicial en la Q.

const ARCHER = { burst: 3, spread: 0.12, burstMult: 0.33, snipeCd: 6, snipeMult: 1.8, // medido contra el Guerrero: con 0,55/2,2 pegaba +36%; con 0,4/1,8, +18%
    snipeStun: 1.2, snipeSpeed: 22, haste: 0.8, relicProc: 1.5, dashTiles: 4 };
function isArcher(h) { return gameMode === 'tower' && !!h && h.heroClass === 'archer'; }
function archerHaste(h) { return isArcher(h) ? ARCHER.haste : 1; }
function relicProc(h) { return isArcher(h) ? ARCHER.relicProc : 1; }

// Clic: tres flechas en abanico hacia dir
function archerBurst(hero, dir, reach) {
    const base = Math.atan2(dir.dy, dir.dx);
    for (let i = 0; i < ARCHER.burst; i++) {
        const a = base + (i - (ARCHER.burst - 1) / 2) * ARCHER.spread, tx = hero.x + Math.cos(a) * reach, ty = hero.y + Math.sin(a) * reach;
        const { dmg, isCrit } = rollAttackDamage(hero, { x: tx, y: ty });
        fireSkillProjectile(hero, { tx, ty, speed: Math.max(CLICK_ATTACK.shotSpeed, hero.projectileSpeed || 0), radius: CLICK_ATTACK.shotRadius, dmg: Math.round(dmg * ARCHER.burstMult), isCrit,
            basic: i === 1, dmgType: 'physical', stopOnHit: true, solid: true, quietMiss: true, arrow: 'arrow', skillName: 'Ráfaga' }); // la del medio cuenta como ataque (robo de vida, efectos al golpear)
    }
    fxAttack(hero, { x: hero.x + dir.dx, y: hero.y + dir.dy }, 'ranged', heroColor(hero));
}
// Clic derecho: el flechazo que critea y aturde
function archerSnipe(h, aim) {
    if (!isArcher(h) || gameClock < (h.snipeReadyAt || 0) || !h.isAlive() || hasFlag(h, 'stun') || h.charging) return false;
    const dx = aim.x - h.x, dy = aim.y - h.y, d = Math.hypot(dx, dy) || 1, reach = effRange(h) + 3;
    h.snipeReadyAt = gameClock + ARCHER.snipeCd * archerHaste(h);
    fireSkillProjectile(h, { tx: h.x + dx / d * reach, ty: h.y + dy / d * reach, speed: ARCHER.snipeSpeed, radius: 0.6, dmg: Math.round(effAttack(h) * ARCHER.snipeMult * 2), isCrit: true,
        dmgType: 'physical', stopOnHit: true, solid: true, quietMiss: true, arrow: 'full', skillName: 'Flechazo',
        onHit: t => { if (t.isAlive()) addEffect(t, { id: 'STUN_SNIPE', name: 'Aturdido', duration: ARCHER.snipeStun, flags: ['stun'], tags: ['PERJUICIO', 'CONTROL'] }); } });
    if (Math.abs(dx) > 0.2) h.facing = Math.sign(dx);
    if (fxArena(h)) fxText(h, '¡Flechazo!', '#ffd166', 11, 0.7);
    return true;
}
// Espacio: hacia el mouse (8 direcciones)
function archerDashDir() {
    const c = cursorWorld();
    if (!c) return null;
    const a = Math.atan2(c.y - player.y, c.x - player.x), k = Math.round(a / (Math.PI / 4));
    return { dx: Math.round(Math.cos(k * Math.PI / 4)), dy: Math.round(Math.sin(k * Math.PI / 4)) };
}
