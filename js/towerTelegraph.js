// Tower Chaos: ataques anunciados y jefes con fases (REWORK.md §3, fase 4, 2026-10-07).
//
//   ATAQUES ANUNCIADOS (como Hades o Hyper Light Drifter): una zona marcada en el piso se va llenando y, al
//   completarse, pega fuerte a quien siga adentro. Se esquivan saliendo o con el esquive (Espacio, invulnerable).
//   Formas: círculo, línea y cono. Los tiran los campeones, algunos roles del bestiario (brutos, aturdidores y tanques
//   golpean el piso; hechiceros marcan tu lugar; arqueros cargan un tiro en línea) y los jefes.
//   JEFES CON FASES (guardianes, señores de cueva, guardianes malditos): al 66% y al 33% de vida rugen (invulnerables
//   un instante, onda alrededor), atacan más seguido y cambian de repertorio. En la fase 2 llaman ayudantes; al
//   entrar en la fase 3 tiran su DEFINITIVA (una lluvia de zonas con huecos) y la repiten cada tanto.

const TELE = {
    every: { champion: [6, 9], beast: [7, 11] },   // segundos entre ataques anunciados (al azar en el rango)
    bossEvery: [4.6, 3.7, 2.9],                     // por fase del jefe
    windup: { champion: 1.0, beast: 0.95, boss: 0.9, ult: 1.5 },
    dmg: { champion: 2.4, beast: 2.0, boss: 2.6, ult: 2.2, roar: 1.2 }, // × el ataque del que lo tira
    phases: [0.66, 0.33],
    ultEvery: 14,
    adds: 2
};
// Qué roles del bestiario tienen ataque anunciado y cuál
const TELE_ROLES = { bruiser: 'slam', stunner: 'slam', tank: 'slam', caster: 'mark', hexer: 'mark', archer: 'aimed' };
const teleRand = ([a, b]) => a + Math.random() * (b - a);

// --- FORMAS ---
// circle {x, y, r} · line {x, y, dx, dy, len, w} · cone {x, y, dx, dy, r, half} · ring {x, y, r0, r1}
function teleContains(t, px, py) {
    const vx = px - t.x, vy = py - t.y, d = Math.hypot(vx, vy);
    if (t.shape === 'circle') return d <= t.r;
    if (t.shape === 'ring') return d >= t.r0 && d <= t.r1;
    if (t.shape === 'line') { const along = vx * t.dx + vy * t.dy, across = Math.abs(vx * t.dy - vy * t.dx); return along >= -0.5 && along <= t.len && across <= t.w / 2 + 0.25; }
    if (t.shape === 'cone') { if (d > t.r) return false; if (d < 0.5) return true; return Math.acos(Math.max(-1, Math.min(1, (vx * t.dx + vy * t.dy) / d))) <= t.half; }
    return false;
}
function dirTo(a, b) { const d = Math.hypot(b.x - a.x, b.y - a.y) || 1; return { dx: (b.x - a.x) / d, dy: (b.y - a.y) / d }; }
function startTelegraph(owner, shape, kind, extra = {}) {
    const level = owner.arena;
    level.telegraphs = level.telegraphs || [];
    const t = Object.assign({ owner, kind, at: gameClock, windup: TELE.windup[kind], mult: TELE.dmg[kind] }, shape, extra);
    if (player && owner.arena === player.arena && Math.hypot(owner.x - player.x, owner.y - player.y) < 10) writeNotebookPage('TELEGRAPH'); // el Cuaderno lo explica
    level.telegraphs.push(t);
    if (!extra.free) owner.castingUntil = Math.max(owner.castingUntil || 0, gameClock + t.windup + (extra.delay || 0)); // se queda cargando
    return t;
}

// --- CADA FRAME: resolver los que se completaron ---
function towerTelegraphTick(level) {
    if (!level.telegraphs || !level.telegraphs.length) return;
    level.telegraphs = level.telegraphs.filter(t => {
        if (!t.owner.isAlive() && t.kind !== 'ult') return false; // si murió, se cancela (la definitiva queda)
        if (gameClock < t.at + (t.delay || 0) + t.windup) return true;
        const fa = fxArena(player);
        if (player.isAlive() && teleContains(t, player.x, player.y)) {
            const dmg = Math.max(1, Math.round(effAttack(t.owner) * t.mult));
            const { dealt } = dealDamage(t.owner.isAlive() ? t.owner : null, player, dmg, t.owner.attackType === 'magical' ? 'magical' : 'physical');
            if (dealt > 0 && fa) { fxShake(t.kind === 'ult' || t.kind === 'boss' ? 7 : 4); fxHitStop(0.06); }
            if (t.onHit) t.onHit(t);
            if (towerRun) towerRun.stats.teleHit = (towerRun.stats.teleHit || 0) + 1;
        } else if (towerRun && player.isAlive()) towerRun.stats.teleDodged = (towerRun.stats.teleDodged || 0) + 1;
        if (t.onFire) t.onFire(t);
        if (fa) fxImpact(fa, Math.round(t.shape === 'line' ? t.x + t.dx * t.len / 2 : t.x), Math.round(t.shape === 'line' ? t.y + t.dy * t.len / 2 : t.y), t.owner.attackType === 'magical' ? 'arcane' : 'steel', t.kind !== 'beast');
        return false;
    });
}

// --- QUIÉN TIRA QUÉ (lo llama el bucle de creeps de la Torre; true = este frame no hace otra cosa) ---
function towerCreepTelegraph(c) {
    if (gameClock < (c.castingUntil || 0)) return true; // cargando: quieto
    if (hasFlag(c, 'stun') || !player.isAlive()) return false;
    const boss = c.isGuardian || c.isCaveBoss;
    if (boss) return bossTick(c);
    const role = c.type.genome && TELE_ROLES[c.type.genome.role];
    const kind = c.champion ? 'champion' : role ? 'beast' : null;
    if (!kind) return false;
    if (c.teleNext === undefined) c.teleNext = gameClock + 1.5 + Math.random() * 2.5;
    if (gameClock < c.teleNext) return false;
    const d = Math.hypot(c.x - player.x, c.y - player.y);
    if (!canSee(c.arena, c.x, c.y)) return false;
    const how = c.champion && !role ? (c.range >= 3 ? 'mark' : 'slam') : role;
    if (how === 'slam' && d > 2.6) return false;
    if (how === 'mark' && d > Math.max(c.range, 3) + 1) return false;
    if (how === 'aimed' && d > Math.max(c.range, 3) + 2) return false;
    c.teleNext = gameClock + teleRand(TELE.every[kind]);
    if (how === 'slam') startTelegraph(c, { shape: 'circle', x: c.x, y: c.y, r: c.champion ? 2.2 : 1.7 }, kind);
    else if (how === 'mark') startTelegraph(c, { shape: 'circle', x: player.x, y: player.y, r: 1.3 }, kind);
    else { const v = dirTo(c, player); startTelegraph(c, { shape: 'line', x: c.x, y: c.y, ...v, len: 8, w: 1 }, kind); }
    return true;
}

// --- JEFES ---
const BOSS_ULTS = ['Lluvia de Ruina', 'Furia de la Torre', 'Cólera Antigua', 'Juicio del Guardián'];
function bossPhase(c) { const r = c.hp / c.maxHp; return r > TELE.phases[0] ? 0 : r > TELE.phases[1] ? 1 : 2; }
function bossTick(c) {
    const ph = bossPhase(c);
    c.bossPhase = c.bossPhase || 0;
    if (ph > c.bossPhase) { c.bossPhase = ph; bossPhaseChange(c, ph); return true; }
    if (ph === 2 && gameClock >= (c.ultNext || 0)) { bossUlt(c); return true; }
    const d = Math.hypot(c.x - player.x, c.y - player.y);
    if (d <= 10 && canSee(c.arena, c.x, c.y)) bossBulletTick(c, ph); // anillos y espirales de proyectiles (towerBullets.js)
    if (d <= 9 && canSee(c.arena, c.x, c.y) && bossSignatureTick(c, ph)) return true; // la mecánica propia de su bioma (towerBosses.js)
    if (c.teleNext === undefined) c.teleNext = gameClock + 2;
    if (gameClock < c.teleNext) return false;
    if (d > 9 || !canSee(c.arena, c.x, c.y)) return false;
    c.teleNext = gameClock + TELE.bossEvery[ph];
    const moves = ['slam', 'cone', 'charge'].concat(ph >= 1 ? ['barrage', 'barrage'] : []);
    const m = d > 4.5 ? pickRandom(['charge', 'barrage'].filter(x => moves.includes(x))) : pickRandom(moves);
    const v = dirTo(c, player);
    if (m === 'slam') startTelegraph(c, { shape: 'circle', x: player.x, y: player.y, r: 2.2 }, 'boss');
    else if (m === 'cone') startTelegraph(c, { shape: 'cone', x: c.x, y: c.y, ...v, r: 4.5, half: 0.62 }, 'boss');
    else if (m === 'charge') startTelegraph(c, { shape: 'line', x: c.x, y: c.y, ...v, len: 9, w: 1.6 }, 'boss', { onFire: t => bossCharge(c, t) });
    else [[0, 0], [2, 1], [-1, -2]].forEach(([ox, oy], i) => startTelegraph(c, { shape: 'circle', x: player.x + ox * (i ? 1 : 0), y: player.y + oy * (i ? 1 : 0), r: 1.3 }, 'boss', { delay: i * 0.3 }));
    return true;
}
// Embestida: el jefe recorre la línea hasta donde pueda
function bossCharge(c, t) {
    if (!c.isAlive()) return;
    for (let i = 1; i <= Math.round(t.len); i++) {
        const nx = Math.round(t.x + t.dx * i), ny = Math.round(t.y + t.dy * i);
        if (!walkable(c.arena, nx, ny) || (nx === player.x && ny === player.y)) break;
        c.x = nx; c.y = ny;
    }
}
function bossPhaseChange(c, ph) {
    addEffect(c, { id: 'BOSS_ROAR', name: 'Rugido', duration: 1.3, flags: ['invulnerable'], tags: ['MEJORA'] });
    startTelegraph(c, { shape: 'ring', x: c.x, y: c.y, r0: 0, r1: 3.2 }, 'boss', { windup: 1.2, mult: TELE.dmg.roar });
    const fa = fxArena(c);
    if (fa) { fxText(c, ph === 1 ? '¡FASE 2!' : '¡FASE FINAL!', '#9b2226', 16, 1.6); fxShake(6); }
    log(ph === 1 ? `👹 ${c.label} se enfurece: ataca más seguido y llama ayuda.` : `👹 ${c.label} está al límite: prepará el esquive.`);
    if (ph === 1 && typeof spawnEventCreeps === 'function') spawnEventCreeps(c.arena, c.x, c.y, TELE.adds, { ring: 2.5, aggro: true });
    if (ph === 2) c.ultNext = gameClock + 2.2; // la definitiva, enseguida después del rugido
}
// Definitiva: lluvia de zonas alrededor tuyo, en dos tandas, dejando huecos
function bossUlt(c) {
    c.ultNext = gameClock + TELE.ultEvery;
    const name = c.ultName || (c.ultName = pickRandom(BOSS_ULTS));
    log(`💥 ${c.label}: ¡${name}!`);
    if (fxArena(c)) fxText(c, `¡${name.toUpperCase()}!`, '#9b2226', 17, 1.8);
    startTelegraph(c, { shape: 'circle', x: player.x, y: player.y, r: 1.4 }, 'ult');
    for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + Math.random() * 0.4, r = 2.2 + (i % 3) * 1.4;
        startTelegraph(c, { shape: 'circle', x: Math.round(player.x + Math.cos(a) * r), y: Math.round(player.y + Math.sin(a) * r), r: 1.2 }, 'ult', { delay: (i % 2) * 0.7, free: true });
    }
}

// --- DIBUJO (en el mundo, debajo de las unidades) ---
function drawTowerTelegraphs(level) {
    (level.telegraphs || []).forEach(t => {
        const p = Math.max(0, Math.min(1, (gameClock - t.at - (t.delay || 0)) / t.windup));
        if (gameClock < t.at + (t.delay || 0)) return;
        const X = v => v * TILE + TILE / 2, R = v => v * TILE;
        const path = (k = 1) => {
            ctx.beginPath();
            if (t.shape === 'circle') ctx.arc(X(t.x), X(t.y), R(t.r) * k, 0, Math.PI * 2);
            else if (t.shape === 'ring') { ctx.arc(X(t.x), X(t.y), R(t.r1) * k, 0, Math.PI * 2); }
            else if (t.shape === 'cone') { const a = Math.atan2(t.dy, t.dx); ctx.moveTo(X(t.x), X(t.y)); ctx.arc(X(t.x), X(t.y), R(t.r) * k, a - t.half, a + t.half); ctx.closePath(); }
            else { const a = Math.atan2(t.dy, t.dx); ctx.save(); ctx.translate(X(t.x), X(t.y)); ctx.rotate(a); ctx.rect(-TILE / 2, -R(t.w) / 2, (R(t.len) + TILE / 2) * k, R(t.w)); ctx.restore(); }
        };
        ctx.save();
        const ult = t.kind === 'ult' || t.kind === 'boss';
        const rgb = A11Y.colorblind ? '29,78,216' : '155,34,38'; // daltonismo: azul y naranja (utils.js)
        ctx.fillStyle = `rgba(${rgb},${0.1 + 0.12 * p})`; path(1); ctx.fill();
        ctx.fillStyle = `rgba(${rgb},${ult ? 0.38 : 0.3})`; path(p); ctx.fill(); // se va llenando
        ctx.strokeStyle = p > 0.8 ? (A11Y.colorblind ? '#f59e0b' : '#ffd166') : (A11Y.colorblind ? '#1e3a8a' : '#6b2a1f'); ctx.lineWidth = p > 0.8 ? 2.5 : 1.8; ctx.setLineDash(p > 0.8 ? [] : [6, 4]); path(1); ctx.stroke();
        ctx.restore();
    });
}

// Barra del jefe abajo al centro (estilo Hades): nombre, vida y las marcas de las fases
function drawBossBar(g) {
    const hud = document.getElementById('hero-bar'), lift = towerLayout && hud && hud.offsetHeight ? hud.getBoundingClientRect().height + 18 : 0; // con la escala de la interfaz // arriba de la barra del héroe
    const W = screenW(), bw = Math.min(620, W * 0.55), bx = (W - bw) / 2, by = screenH() - 40 - lift;
    ctx.fillStyle = 'rgba(233,220,192,0.94)'; ctx.fillRect(bx - 10, by - 22, bw + 20, 38);
    ctx.strokeStyle = INK.line; ctx.lineWidth = 2; ctx.strokeRect(bx - 10, by - 22, bw + 20, 38);
    ctx.font = 'bold 13px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#6b2a1f';
    const ph = bossPhase(g);
    ctx.fillText(`${g.label}${ph ? ` · fase ${ph + 1}` : ''}`, W / 2, by - 7);
    ctx.fillStyle = '#3a2d21'; ctx.fillRect(bx, by, bw, 9);
    ctx.fillStyle = ph === 2 ? '#c1121f' : '#9b2226'; ctx.fillRect(bx, by, bw * Math.max(0, g.hp) / g.maxHp, 9);
    ctx.strokeStyle = INK.line; ctx.lineWidth = 1.2; ctx.strokeRect(bx, by, bw, 9);
    ctx.fillStyle = INK.line; TELE.phases.forEach(f => ctx.fillRect(bx + bw * f - 1, by - 3, 2, 15));
}

// --- PILOTO AUTOMÁTICO: salir de las zonas y esquivar a último momento ---
// Reflejos del piloto (para medir la dificultad, 2026-10-08): el 'perfecto' ve cada aviso al instante y nunca falla el
// esquive, así que no moría nunca y no servía para saber cuánto pegan las balas y los jefes. El 'humano' imita a una
// persona: tarda en reaccionar, a veces no ve un aviso (pasa en pantalla llena) y a veces el esquive le sale tarde.
// Referencias: el tiempo de reacción visual simple ronda 0,25 s; con varias cosas en pantalla, 0,35-0,45 s.
const AI_REFLEX = { perfect: { reaction: 0, miss: 0, dashOk: 1 }, human: { reaction: 0.35, miss: 0.2, dashOk: 0.6 } };
let aiReflex = 'perfect';
function aiNotices(o, born) {
    const R = AI_REFLEX[aiReflex];
    if (!R.miss && !R.reaction) return true;
    if (o.aiRoll === undefined) o.aiRoll = Math.random(); // cada aviso o bala: lo ve o no, una sola vez
    return o.aiRoll >= R.miss && gameClock >= born + R.reaction;
}
// ¿Le sale el esquive? (una tirada por intento; si falla, no lo vuelve a intentar enseguida)
function aiDashWorks(hero) {
    if (gameClock < (hero.aiDashFumbleUntil || 0)) return false;
    if (Math.random() < AI_REFLEX[aiReflex].dashOk) return true;
    hero.aiDashFumbleUntil = gameClock + 0.6;
    return false;
}
function telegraphsOn(hero, x = hero.x, y = hero.y) {
    return (hero.arena.telegraphs || []).filter(t => gameClock >= t.at + (t.delay || 0) - (aiReflex === 'perfect' ? 0.2 : 0) && teleContains(t, x, y) && aiNotices(t, t.at + (t.delay || 0)))
        .concat((hero.arena.zones || []).filter(z => (z.mult || z.slow) && teleContains(z, x, y)).map(z => Object.assign({ at: -1e9, windup: 1e9 }, z))); // las zonas que duran también se evitan (sin apuro de esquive)
}
function towerDodgeDir(hero) {
    const threats = telegraphsOn(hero);
    const bullets = bulletDanger(hero, hero.x, hero.y); // proyectiles que van a pasar por acá (towerBullets.js)
    if (!threats.length && !bullets) return null;
    let best = null, bestScore = Infinity;
    STEPS_8.forEach(([dx, dy]) => {
        const nx = hero.x + dx, ny = hero.y + dy;
        if (!walkable(hero.arena, nx, ny) || (dx && dy && (!walkable(hero.arena, nx, hero.y) || !walkable(hero.arena, hero.x, ny)))) return;
        const inside = telegraphsOn(hero, nx, ny).length;
        const away = -threats.reduce((a, t) => a + Math.hypot(nx - t.x, ny - t.y), 0);
        const score = inside * 100 + bulletDanger(hero, nx, ny, 1.6) * 30 + away; // más lejos en el tiempo: retroceder en la misma línea no sirve
        if (score < bestScore) { bestScore = score; best = { dx, dy }; }
    });
    hero.autoGoal = 'esquivar';
    return best;
}
function aiTelegraphDash(hero) {
    if (bulletImminent(hero) && gameClock >= (hero.dashReadyAt || 0) && aiDashWorks(hero)) { const d = towerDodgeDir(hero); if (d) { playerDash(d); return; } } // una bala encima: se tira (towerBullets.js)
    const threats = telegraphsOn(hero);
    if (!threats.length || gameClock < (hero.dashReadyAt || 0)) return;
    const left = Math.min(...threats.map(t => t.at + (t.delay || 0) + t.windup - gameClock));
    if (left > 0.35 || !aiDashWorks(hero)) return;
    const d = towerDodgeDir(hero);
    if (d) playerDash(d);
}
