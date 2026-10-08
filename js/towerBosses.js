// Tower Chaos: un jefe con nombre por bioma (REWORK.md §3, 2026-10-07).
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
        mechanic: 'Planta raíces que la curan mientras sigan vivas: cortalas. Hace brotar raíces del piso en línea.' },
    swamp: { base: 'LICH', name: 'Bruja del Fango', color: '#606c38', signature: 'mire',
        mechanic: 'Deja charcos de veneno que duran. Desde la fase 2 se esconde en la niebla: un rato no se la puede golpear.' },
    desert: { base: 'HIVE_QUEEN', name: 'Reina Escorpión', color: '#bc6c25', signature: 'burrow',
        mechanic: 'Se entierra y sale debajo tuyo, y después barre con la cola. Desde la fase 2, su tormenta te arrastra hacia ella.' },
    snow: { base: 'FROST_DRAGON', name: 'Wyrm de Escarcha', color: '#48cae4', signature: 'frost',
        mechanic: 'Su aliento congela y deja el piso helado (frena). Desde la fase 2 hace llover carámbanos.' },
    volcano: { base: 'ABYSS_LORD', name: 'Señor de la Ceniza', color: '#d00000', signature: 'lava',
        mechanic: 'Llena de lava un sector por vez: movete al que no arde. Desde la fase 2 tira meteoritos.' }
};
// hp/atk: iguales para los 5 (antes, con los jefes de Custom Hero Chaos, 1400-2000 de vida: medido 2026-10-07, morían en
// 5-60 s, antes de mostrar sus fases; la idea es ~1-1,5 minutos con el piloto, que esquiva casi todo)
const BOSS_SIG = { every: [7, 6, 5], rootRegen: 0.006, roots: 2, zoneTick: 0.5, hp: 4500, atk: 40 };
const bossTypeCache = {};
// Tipo del guardián de un piso: el jefe de su bioma (copia del jefe base, sin su mecánica de Custom Hero Chaos)
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
        if (ph >= 1 && !(L.creeps.some(o => o.isRoot && o.isAlive()))) plantRoots(c); // vuelven a crecer
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
function plantRoots(c) {
    const L = c.arena, n = BOSS_SIG.roots + (c.bossPhase || 0);
    for (let i = 0, made = 0; i < 24 && made < n; i++) {
        const a = Math.random() * Math.PI * 2, x = Math.round(c.x + Math.cos(a) * 3.5), y = Math.round(c.y + Math.sin(a) * 3.5);
        if (!walkable(L, x, y) || L.creeps.some(o => o.isAlive() && o.x === x && o.y === y)) continue;
        const r = makeCreep(CREEP_TYPES.ARMORED, x, y, TOWER.creepMult(L.floor), false, 0);
        Object.assign(r, { arena: L, label: 'Raíz', isRoot: true, atk: 0, moveInterval: 1e9, aggro: true, spawnTime: -1e9, xp: 0, gold: 0, level: L.floor, color: '#40916c' });
        r.hp = r.maxHp = Math.round(c.maxHp * 0.05);
        L.creeps.push(r); made++;
    }
    log('🌱 Brotan raíces alrededor de la Raíz Madre: mientras vivan, la curan.');
}
function rootsHeal(c) {
    const n = c.arena.creeps.filter(o => o.isRoot && o.isAlive()).length;
    if (n && gameClock >= (c.rootHealAt || 0)) { c.rootHealAt = gameClock + 1; c.hp = Math.min(c.maxHp, c.hp + c.maxHp * BOSS_SIG.rootRegen * n); }
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
    level.creeps.filter(o => o.isRoot && o.isAlive()).forEach(r => {
        ctx.save(); ctx.strokeStyle = 'rgba(45,106,79,0.7)'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(r.x * TILE + TILE / 2, r.y * TILE + TILE / 2); ctx.lineTo(g.x * TILE + TILE / 2, g.y * TILE + TILE / 2); ctx.stroke(); ctx.restore();
    });
}
function bossAlpha(c) { return c.hiddenUntil && gameClock < c.hiddenUntil ? 0.22 : 1; }
