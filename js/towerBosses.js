// Infinite Tower: un jefe con nombre por bioma (REWORK.md §3, 2026-10-07).
//
//   El guardián de cada piso es el jefe de su bioma (dos pisos por bioma; en el segundo, "Gran …"). Además de las 3 fases,
//   los ataques anunciados y la definitiva (towerTelegraph.js), cada uno tiene una MECÁNICA PROPIA que cambia la pelea:
//     🌲 Raíz Madre (bosque): planta raíces que la curan mientras viven (hay que cortarlas) y hace brotar raíces en línea.
//     🐸 Bruja del Fango (ciénaga): deja charcos de veneno que duran y se esconde en la niebla (no se la puede golpear).
//     🏜 Reina Escorpión (desierto): se entierra y sale debajo tuyo, barre con la cola; su tormenta te arrastra hacia ella.
//     ❄ Wyrm de Escarcha (nieve): aliento que congela y deja el piso helado (frena); lluvia de carámbanos.
//     🌋 Señor de la Ceniza (volcán): llena de lava un sector por vez (hay que moverse) y tira meteoritos.
//   ZONAS que duran en el piso (veneno, hielo, lava): lastiman o frenan mientras estés adentro. El piloto las esquiva.

const BIOME_BOSSES = {
    forest: { base: 'GOLEM', name: 'Raíz Madre', color: '#2d6a4f', signature: 'roots',
        mechanic: 'Al empezar cada fase planta raíces que la curan mientras vivan (✚ y un lazo verde): cortalas, o se secan solas. Hace brotar raíces del piso en línea.' },
    swamp: { base: 'LICH', name: 'Bruja del Fango', color: '#606c38', signature: 'mire',
        mechanic: 'Deja charcos de veneno que duran. Desde la fase 2 se esconde en la niebla: un rato no se la puede golpear.' },
    desert: { base: 'HIVE_QUEEN', name: 'Reina Escorpión', color: '#bc6c25', signature: 'burrow',
        mechanic: 'Se entierra y sale debajo tuyo, y después barre con la cola. Desde la fase 2, su tormenta te arrastra hacia ella.' },
    snow: { base: 'FROST_DRAGON', name: 'Wyrm de Escarcha', color: '#48cae4', signature: 'frost',
        mechanic: 'Su aliento congela y deja el piso helado (frena). Desde la fase 2 hace llover carámbanos.' },
    volcano: { base: 'ABYSS_LORD', name: 'Señor de la Ceniza', color: '#d00000', signature: 'lava',
        mechanic: 'Llena de lava un sector por vez: movete al que no arde. Desde la fase 2 tira meteoritos.' }
};
// hp/atk: iguales para los 5 (antes, con los jefes de Custom Hero, 1400-2000 de vida: medido 2026-10-07, morían en
// 5-60 s, antes de mostrar sus fases; la idea es ~1-1,5 minutos con el piloto, que esquiva casi todo)
// Raíces (medido 2026-10-08: con 0,6%/s por raíz, sin techo y rebrotando 5 s después de cortarlas, curaban hasta el 113% de la
// vida del jefe y la pelea podía durar 23 min): ahora curan 0,45%/s, se secan solas a los 16 s y brotan solo al empezar
// cada fase → la curación total queda acotada (~3 × 16 × 0,45% ≈ 22% por fase si no cortás ninguna).
const BOSS_SIG = { every: [7, 6, 5], rootRegen: 0.0045, rootLife: 16, rootArmor: 4, roots: 2, zoneTick: 0.5, hp: 4500, atk: 40 };
const bossTypeCache = {};
// Tipo del guardián de un piso: el jefe de su bioma (copia del jefe base, sin su mecánica de Custom Hero)
function biomeBossType(floor) {
    const biome = biomeFor(floor), b = BIOME_BOSSES[biome], second = floor % 2 === 0;
    const key = biome + (second ? '2' : '');
    if (bossTypeCache[key]) return bossTypeCache[key];
    const base = ROUND_BOSSES.find(r => r.key === b.base) || ROUND_BOSSES[0];
    const t = Object.assign({}, base, { label: (second ? 'Gran ' : '') + b.name, color: b.color, mechanic: b.mechanic, biomeBoss: biome, signature: b.signature, hp: BOSS_SIG.hp, atk: BOSS_SIG.atk,
        escalation: 'Fases al 66% y al 33%: ruge, ataca más seguido, llama ayuda y al final tira su definitiva.' });
    delete t.update; delete t.onAttack; // en la Torre, sus fases y su mecánica son las de acá
    return (bossTypeCache[key] = t);
}

// --- ZONAS QUE DURAN EN EL PISO ---
// { owner, shape…, until, mult (× ataque cada medio segundo), slow, freeze, kind: 'poison' | 'ice' | 'lava' }
const ZONE_LOOK = { poison: ['96,108,56', '#283618'], ice: ['72,202,228', '#1d4e89'], lava: ['208,0,0', '#ffb703'] };
function addZone(level, z) { level.zones = level.zones || []; level.zones.push(z); return z; }
function towerZonesTick(level, dt) {
    if (!level.zones || !level.zones.length) return;
    level.zones = level.zones.filter(z => gameClock < z.until);
    if (!player.isAlive()) return;
    level.zones.forEach(z => {
        if (!teleContains(z, player.x, player.y)) return;
        if (z.slow) addEffect(player, { id: 'ZONE_SLOW', name: z.kind === 'ice' ? 'Piso helado' : 'Fango', duration: 0.6, tags: ['PERJUICIO'], mods: { moveSpeedPct: -z.slow } });
        if (z.mult && everyInterval(player, 'ZONE_' + z.kind, dt, BOSS_SIG.zoneTick))
            dealDamage(z.owner.isAlive() ? z.owner : null, player, Math.max(1, Math.round(effAttack(z.owner) * z.mult)), 'magical');
    });
}
function drawTowerZones(level) {
    (level.zones || []).forEach(z => {
        const [rgb, line] = ZONE_LOOK[z.kind], fade = Math.min(1, (z.until - gameClock) / 1.2);
        const X = v => v * TILE + TILE / 2, R = v => v * TILE;
        ctx.save(); ctx.globalAlpha = fade;
        ctx.beginPath();
        if (z.shape === 'circle') ctx.arc(X(z.x), X(z.y), R(z.r), 0, Math.PI * 2);
        else if (z.shape === 'cone') { const a = Math.atan2(z.dy, z.dx); ctx.moveTo(X(z.x), X(z.y)); ctx.arc(X(z.x), X(z.y), R(z.r), a - z.half, a + z.half); ctx.closePath(); }
        ctx.fillStyle = `rgba(${rgb},${0.28 + 0.06 * Math.sin(fxClock * 3)})`; ctx.fill();
        ctx.strokeStyle = line; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.stroke();
        ctx.restore();
    });
}

// --- LA MECÁNICA DE CADA JEFE (la llama bossTick; true = este frame hizo su jugada) ---
function bossSignatureTick(c, ph) {
    const t = c.type;
    if (!t.signature) return false;
    if (!c.introduced) { c.introduced = true; log(`👹 ${c.label}: ${t.mechanic}`); if (t.signature === 'roots') plantRoots(c); }
    if (t.signature === 'burrow' && ph >= 1 && gameClock >= (c.stormAt || 0)) { c.stormAt = gameClock + 1.3; sandstormPull(c); }
    if (t.signature === 'roots') rootsHeal(c);
    if (gameClock < (c.sigNext || 0)) return false;
    c.sigNext = gameClock + BOSS_SIG.every[ph];
    const v = dirTo(c, player), L = c.arena;
    if (t.signature === 'roots') {
        [-0.6, 0, 0.6].forEach((a, i) => { const ca = Math.cos(a), sa = Math.sin(a);
            startTelegraph(c, { shape: 'line', x: c.x, y: c.y, dx: v.dx * ca - v.dy * sa, dy: v.dx * sa + v.dy * ca, len: 8, w: 1 }, 'boss', { delay: i * 0.15 }); });
        if (ph > (c.rootsPhase || 0)) { c.rootsPhase = ph; plantRoots(c, ph); } // brotan de nuevo solo al empezar cada fase (no cada vez que las cortás)
    } else if (t.signature === 'mire') {
        const z = { shape: 'circle', x: player.x, y: player.y, r: 1.6 };
        startTelegraph(c, z, 'boss', { onFire: () => addZone(L, Object.assign({ owner: c, until: gameClock + 8, mult: 0.18, slow: 0.25, kind: 'poison' }, z)) });
        if (ph >= 1 && Math.random() < 0.5) hideInFog(c);
    } else if (t.signature === 'burrow') {
        const spot = { x: player.x, y: player.y };
        c.hiddenUntil = gameClock + 1.3;
        addEffect(c, { id: 'BURROW', name: 'Enterrada', duration: 1.3, flags: ['invulnerable'], tags: ['MEJORA'] });
        startTelegraph(c, { shape: 'circle', x: spot.x, y: spot.y, r: 1.8 }, 'boss', { windup: 1.3, onFire: () => {
            if (!c.isAlive()) return;
            if (walkable(L, spot.x, spot.y) && !(spot.x === player.x && spot.y === player.y)) { c.x = spot.x; c.y = spot.y; }
            const w = dirTo(c, player); startTelegraph(c, { shape: 'cone', x: c.x, y: c.y, ...w, r: 3.5, half: 0.9 }, 'boss', { windup: 0.7 }); // coletazo
        } });
    } else if (t.signature === 'frost') {
        const cone = { shape: 'cone', x: c.x, y: c.y, ...v, r: 5, half: 0.5 };
        startTelegraph(c, cone, 'boss', { onHit: () => addEffect(player, { id: 'STUN', name: 'Congelado', duration: 1, flags: ['stun'] }),
            onFire: () => addZone(L, Object.assign({ owner: c, until: gameClock + 10, mult: 0, slow: 0.45, kind: 'ice' }, cone)) });
        if (ph >= 1) for (let i = 0; i < 5; i++) startTelegraph(c, { shape: 'circle', x: player.x + Math.round((Math.random() - 0.5) * 6), y: player.y + Math.round((Math.random() - 0.5) * 6), r: 1.1 }, 'boss', { delay: 0.4 + i * 0.2, free: true });
    } else if (t.signature === 'lava') {
        const a = Math.floor(Math.random() * 4) * Math.PI / 2 + Math.PI / 4;
        const sector = { shape: 'cone', x: c.x, y: c.y, dx: Math.cos(a), dy: Math.sin(a), r: 9, half: Math.PI / 4 };
        startTelegraph(c, sector, 'boss', { windup: 1.6, free: true, mult: 1.2, onFire: () => addZone(L, Object.assign({ owner: c, until: gameClock + 6, mult: 0.3, kind: 'lava' }, sector)) });
        if (ph >= 1) for (let i = 0; i < 4; i++) startTelegraph(c, { shape: 'circle', x: player.x + Math.round((Math.random() - 0.5) * 7), y: player.y + Math.round((Math.random() - 0.5) * 7), r: 1.5 }, 'boss', { delay: 0.6 + i * 0.25, free: true });
        return false; // el sector arde mientras el jefe sigue peleando
    }
    return true;
}
// Raíz Madre: raíces quietas alrededor que la curan mientras vivan
function plantRoots(c, ph = c.bossPhase || 0) {
    const L = c.arena, n = BOSS_SIG.roots + ph;
    for (let i = 0, made = 0; i < 24 && made < n; i++) {
        const a = Math.random() * Math.PI * 2, x = Math.round(c.x + Math.cos(a) * 3.5), y = Math.round(c.y + Math.sin(a) * 3.5);
        if (!walkable(L, x, y) || L.creeps.some(o => o.isAlive() && o.x === x && o.y === y)) continue;
        const r = makeCreep(CREEP_TYPES.ARMORED, x, y, TOWER.creepMult(L.floor), false, 0);
        Object.assign(r, { arena: L, label: 'Raíz (cura al jefe)', isRoot: true, atk: 0, armor: BOSS_SIG.rootArmor, priority: 2, witherAt: gameClock + BOSS_SIG.rootLife, // madera: se corta fácil; el ataque automático le pega primero
            moveInterval: 1e9, aggro: true, spawnTime: -1e9, xp: 0, gold: 0, level: L.floor, color: '#40916c' });
        r.hp = r.maxHp = Math.round(c.maxHp * 0.05);
        L.creeps.push(r); made++;
    }
    log('🌱 Brotan raíces alrededor de la Raíz Madre: mientras vivan, la curan.');
}
function rootsHeal(c) {
    const roots = c.arena.creeps.filter(o => o.isRoot && o.isAlive());
    roots.forEach(r => { if (gameClock >= r.witherAt) { r.hp = 0; if (fxArena(r)) fxParticles(c.arena, r.x, r.y, 'poison', 8, 1.5, { style: 'smoke', size: 3, life: 0.6 }); } }); // se secan solas
    const n = roots.filter(o => o.isAlive()).length;
    if (n && gameClock >= (c.rootHealAt || 0)) {
        c.rootHealAt = gameClock + 1;
        const before = c.hp; c.hp = Math.min(c.maxHp, c.hp + c.maxHp * BOSS_SIG.rootRegen * n);
        if (fxArena(c)) fxHeal(c, Math.round(c.hp - before)); // se ve cuánto la curan
    }
}
// Bruja del Fango: se esconde en la niebla y reaparece en otro lado
function hideInFog(c) {
    c.hiddenUntil = gameClock + 2.5; // medido: con 3,5 s y lejos, una espada tardaba minutos en alcanzarla
    addEffect(c, { id: 'FOG', name: 'En la niebla', duration: 2.5, flags: ['invulnerable'], tags: ['MEJORA'] });
    for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2, d = 3 + Math.random() * 2, x = Math.round(player.x + Math.cos(a) * d), y = Math.round(player.y + Math.sin(a) * d);
        if (walkable(c.arena, x, y)) { c.x = x; c.y = y; break; } // reaparece a 3-5 casillas
    }
    if (fxArena(c)) fxText(c, 'se esconde en la niebla', '#606c38', 12, 1.2);
}
// Reina Escorpión: la tormenta te arrastra una casilla hacia ella
function sandstormPull(c) {
    if (!player.isAlive() || Math.hypot(c.x - player.x, c.y - player.y) <= 2 || hasFlag(player, 'invulnerable')) return;
    const dx = Math.sign(c.x - player.x), dy = Math.sign(c.y - player.y);
    if (walkable(c.arena, player.x + dx, player.y + dy)) { player.x += dx; player.y += dy; }
}
// Dibujo: lazos de las raíces y el jefe medio transparente cuando está escondido o enterrado
function drawBossExtras(level) {
    const g = level.guardian;
    if (!g || !g.isAlive()) return;
    level.creeps.filter(o => o.isRoot && o.isAlive()).forEach((r, i) => {
        const x0 = r.x * TILE + TILE / 2, y0 = r.y * TILE + TILE / 2, x1 = g.x * TILE + TILE / 2, y1 = g.y * TILE + TILE / 2;
        ctx.save(); ctx.strokeStyle = 'rgba(45,106,79,0.75)'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.lineDashOffset = -fxClock * 24; // la savia corre hacia el jefe
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
        for (let k = 0; k < 3; k++) { const t = (fxClock * 0.8 + k / 3 + i * 0.17) % 1; ctx.fillStyle = '#95d5b2'; ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 3.5, 0, Math.PI * 2); ctx.fill(); }
        const left = Math.max(0, (r.witherAt - gameClock) / BOSS_SIG.rootLife); // aro: cuánto le falta para secarse
        ctx.strokeStyle = '#2d6a4f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x0, y0, TILE * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); ctx.stroke();
        ctx.font = 'bold 13px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#2d6a4f'; ctx.fillText('✚', x0, y0 - TILE * 0.7);
        ctx.restore();
    });
}
function bossAlpha(c) { return c.hiddenUntil && gameClock < c.hiddenUntil ? 0.22 : 1; }

// --- ARENA DEL GUARDIÁN (ROADMAP T00, "Arenas de jefes, paso 1", 2026-10-14) ---
// La sala del guardián tiene rejas en sus entradas. Están cerradas por dos razones:
//   · LA LLAVE DEL PISO (1b): la lleva el campeón más fuerte al que se llega desde la entrada (🗝️ sobre su cabeza, en el
//     mapa y en el objetivo). Hasta que lo vencés, no se entra.
//   · LA PELEA (1a): al entrar con el guardián vivo se cierran detrás tuyo hasta que gane alguien: se abren al vencerlo,
//     o si morís, te vas del piso, salís antes de que cierre o el guardián sale de su sala. Una entrada con alguien
//     parado encima se cierra cuando se corre.
// Pisos sin campeones alcanzables: sin llave. Si el guardián ya cayó (o la escalera está abierta), nunca se cierran.
function guardianRoom(level) {
    const g = level.guardian;
    if (!g || !level.rooms) return null;
    return level.guardRoom || (level.guardRoom = level.rooms.find(r => g.x >= r.x - 1 && g.x <= r.x + r.w && g.y >= r.y - 1 && g.y <= r.y + r.h) || null);
}
const inRoom = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
const nearRoom = (r, x, y) => x >= r.x - 1 && x <= r.x + r.w && y >= r.y - 1 && y <= r.y + r.h; // la sala y sus entradas
// Al armar el piso: el campeón más fuerte (alcanzable) lleva la llave
function placeFloorKey(level, dist) {
    level.floorKey = null;
    if (level.isCave || !guardianRoom(level)) return;
    const champs = level.creeps.filter(c => c.isAlive() && c.champion && c.champion.length && !c.isGuardian && dist[c.y * COLS + c.x] >= 0);
    if (!champs.length) return;
    const c = champs.reduce((a, b) => (b.maxHp > a.maxHp ? b : a));
    c.keyCarrier = true;
    level.floorKey = { carrier: c, got: false };
}
const needsFloorKey = level => !!(level.floorKey && !level.floorKey.got);
function roomGateCells(level, r) {
    const out = [];
    for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) {
        if (inRoom(r, x, y) || !walkable(level, x, y)) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inRoom(r, x + dx, y + dy))) out.push({ x, y });
    }
    return out;
}
function openBossArena(level) {
    const A = level.bossArena;
    if (!A || !A.closed) return;
    A.gates.forEach(p => { level.walls[p.y][p.x] = 0; });
    Object.assign(A, { closed: false, fight: false, gates: [], pending: [] });
    if (towerRun && towerRun.arenaLevel === level) towerRun.arenaLevel = null;
}
function bossArenaTick(level) {
    if (towerRun && towerRun.arenaLevel && towerRun.arenaLevel !== level && !needsFloorKey(towerRun.arenaLevel)) openBossArena(towerRun.arenaLevel); // te fuiste (o renaciste en otro piso)
    const r = guardianRoom(level), g = level.guardian;
    if (!r) return;
    const A = level.bossArena || (level.bossArena = { closed: false, fight: false, gates: [], pending: [] });
    const K = level.floorKey, alive = g.isAlive() && !level.stairsOpen;
    if (K && !K.got && (!K.carrier.isAlive() || !alive)) {
        K.got = true;
        if (alive) { log('🗝️ ¡La llave del piso! Las rejas de la sala del guardián se abren.'); sfx('levelup'); }
    }
    const here = player.isAlive() && player.arena === level;
    const gHome = nearRoom(r, g.x, g.y); // si el guardián salió de su sala, no hay arena (y se abre)
    if (!A.fight && alive && here && gHome && !needsFloorKey(level) && inRoom(r, Math.round(player.x), Math.round(player.y))) {
        A.fight = true; towerRun.arenaLevel = level;
        log(`🔒 Las rejas se cierran detrás tuyo: de la sala de ${g.type.label} no sale nadie hasta que gane alguien.`); sfx('hit');
    }
    if (A.fight && !(alive && here && gHome && nearRoom(r, Math.round(player.x), Math.round(player.y)))) A.fight = false; // ganaste, moriste, te fuiste o saliste antes de que cierre
    const want = alive && (needsFloorKey(level) || A.fight);
    if (!want) { if (A.closed) { if (!g.isAlive() && A.gates.length) log('🔓 Las rejas se levantan.'); openBossArena(level); } return; }
    if (!A.closed) { A.closed = true; A.gates = []; A.pending = roomGateCells(level, r); }
    A.pending = A.pending.filter(p => { // cierra las que estén libres
        if (unitAt(level, p.x, p.y) || (player.arena === level && Math.round(player.x) === p.x && Math.round(player.y) === p.y)) return true;
        level.walls[p.y][p.x] = WALL.stone; A.gates.push(p);
        return false;
    });
}
function drawBossArena(level) {
    const A = level.bossArena, K = level.floorKey;
    if (K && !K.got && K.carrier.isAlive() && canSee(level, K.carrier.x, K.carrier.y)) { // la llave sobre el que la lleva
        ctx.save(); ctx.font = '14px serif'; ctx.textAlign = 'center';
        ctx.fillText('🗝️', K.carrier.x * TILE + TILE / 2, K.carrier.y * TILE - TILE * 0.9 + Math.sin(fxClock * 3) * 2);
        ctx.restore();
    }
    if (!A || !A.closed) return;
    ctx.save();
    A.gates.forEach(p => {
        if (!level.explored[p.y][p.x]) return;
        const x = p.x * TILE, y = p.y * TILE;
        ctx.fillStyle = 'rgba(12,10,9,0.8)'; ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = needsFloorKey(level) ? '#c9a227' : '#9aa2ab'; // dorada: falta la llave
        for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(x + 4 + i * (TILE - 10) / 3), y + 2, 2, TILE - 4);
        ctx.fillRect(x + 2, Math.round(y + TILE * 0.3), TILE - 4, 2); ctx.fillRect(x + 2, Math.round(y + TILE * 0.7), TILE - 4, 2);
    });
    ctx.restore();
}
