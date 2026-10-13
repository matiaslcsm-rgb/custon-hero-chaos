// Tower Chaos: el despertar en el mundo (REWORK.md §1, 2026-10-08).
//
//   Antes: al entrar a la torre se abría una ventana con 3 cartas y la partida esperaba. A pedido ("el inicio es feo"),
//   ahora las 3 armas están CLAVADAS en el piso del círculo de piedra, alrededor tuyo, y vas caminando a agarrar una:
//   el primer acto del juego ya es moverse por el mundo (como el comienzo de Hades o de Death's Door, donde el
//   tutorial es el lugar). Al acercarte, un cartel de pergamino dice qué es y qué hace; F (configurable) o clic la
//   agarra. Las otras dos se hunden en la piedra. Sin arma no salís del círculo: el personaje se frena y lo anota.

const AWAKEN = { spots: [[-2, 0], [0, -2], [2, 0]], gate: 3.2, reach: 1.5, warnEvery: 3 }; // en el borde del círculo, a 2 casillas: desde el centro no tenés ninguna a mano

// Las clava alrededor del círculo (izquierda, arriba, derecha; si alguna casilla no se puede pisar, la más cercana libre)
function placeStarterWeapons(level) {
    const s = level.start, used = new Set([s.x + ',' + s.y]);
    const free = (x, y) => walkable(level, x, y) && !used.has(x + ',' + y);
    level.starterWeapons = Object.keys(STARTER_WEAPONS).map((key, i) => {
        let [x, y] = [s.x + AWAKEN.spots[i][0], s.y + AWAKEN.spots[i][1]];
        if (!free(x, y)) {
            const near = STEPS_8.map(([dx, dy]) => [s.x + dx, s.y + dy]).concat(STEPS_8.map(([dx, dy]) => [s.x + 2 * dx, s.y + 2 * dy])).find(([a, b]) => free(a, b));
            if (near) [x, y] = near;
        }
        used.add(x + ',' + y);
        return { key, x, y };
    });
}
function awaitingWeapon() { return !!(towerRun && towerRun.starterPending && player && player.arena && player.arena.starterWeapons); }

// El arma que tenés a mano (encima o al lado; si hay varias, la de tu casilla o la más cercana)
function starterWeaponNear(h = player) {
    if (!awaitingWeapon()) return null;
    let best = null, bestD = AWAKEN.reach;
    h.arena.starterWeapons.forEach(w => { const d = Math.hypot(w.x - h.x, w.y - h.y); if (d <= bestD) { bestD = d; best = w; } });
    return best;
}
// F o clic: agarrarla
function towerInteract() {
    const w = starterWeaponNear();
    if (w) { takeStarterWeapon(w); return true; }
    if (nearWaystone()) { toggleWaystone(true); return true; } // la piedra de regreso (towerWaystone.js)
    return false;
}
function towerClickWeapon(p) {
    const ws = player && player.arena && waystoneSpot(player.arena); // clic en la piedra de regreso (towerWaystone.js)
    if (ws && Math.hypot(ws.x - p.x, ws.y - p.y) < 0.8 && waystoneFloors().length) { if (nearWaystone()) toggleWaystone(true); else player.moveTarget = { x: ws.x, y: ws.y - 1, arena: player.arena, at: fxClock }; return true; }
    if (!awaitingWeapon()) return false;
    const w = player.arena.starterWeapons.find(o => Math.hypot(o.x - p.x, o.y - p.y) < 0.7);
    if (!w) return false;
    if (Math.hypot(w.x - player.x, w.y - player.y) > AWAKEN.reach) { player.moveTarget = { x: w.x, y: w.y, arena: player.arena, at: fxClock }; return true; } // lejos: camina hasta ella
    takeStarterWeapon(w);
    return true;
}
function takeStarterWeapon(w) {
    const level = player.arena, others = level.starterWeapons.filter(o => o !== w);
    const fa = fxArena(player);
    if (fa) {
        fxParticles(level, w.x, w.y, 'holy', 14, 4); pushFx(level, { kind: 'ring', x: w.x, y: w.y, color: '#c9a227', radius: 1.4, life: 0.5 });
        others.forEach(o => fxParticles(level, o.x, o.y, 'steel', 10, 1.5, { style: 'smoke', size: 4, life: 0.8 })); // las otras se hunden
        fxShake(2); sfx('levelup');
    }
    chooseStarterWeapon(w.key);
}
// Cada cuadro, mientras no elegiste: el piloto agarra la espada; vos no salís del círculo sin arma.
function towerAwakenTick(level, from) {
    if (!awaitingWeapon() || level !== player.arena) return;
    if (autopilot) { takeStarterWeapon(level.starterWeapons.find(w => w.key === 'ADVENTURER_SWORD') || level.starterWeapons[0]); return; }
    if (Math.hypot(player.x - level.start.x, player.y - level.start.y) > AWAKEN.gate) {
        player.x = from.x; player.y = from.y; player.moveTarget = null;
        if (gameClock >= (towerRun.gateWarnAt || 0)) { towerRun.gateWarnAt = gameClock + AWAKEN.warnEvery; log('✋ No voy a salir del círculo con las manos vacías. Hay tres armas clavadas acá.'); fxText(player, '¿desarmado?', '#6b2a1f', 11, 1); }
    }
}

// Cartel de pergamino arriba del arma que tenés a mano: nombre, qué hace y cómo agarrarla
function drawStarterCard(w) {
    const W = STARTER_WEAPONS[w.key], sk = W.skillId ? SKILL_INDEX[W.skillId] : { name: 'Combo y parada' }, cx = w.x * TILE + TILE / 2, top = w.y * TILE - TILE * 2.3;
    const width = 230, lines = wrapCanvasText(W.why, width - 16, '11px Georgia, serif');
    const h = 40 + lines.length * 13 + 16;
    ctx.save();
    ctx.fillStyle = 'rgba(241,231,208,0.97)'; ctx.strokeStyle = INK.line; ctx.lineWidth = 2;
    ctx.fillRect(cx - width / 2, top - h + 20, width, h); ctx.strokeRect(cx - width / 2, top - h + 20, width, h);
    ctx.textAlign = 'center'; ctx.fillStyle = INK.line; ctx.font = 'bold 13px Georgia, serif';
    let y = top - h + 38; ctx.fillText(`${W.noun} · ${sk.name}`, cx, y);
    ctx.font = '11px Georgia, serif'; ctx.fillStyle = '#3d3226'; y += 6;
    lines.forEach(l => { y += 13; ctx.fillText(l, cx, y); });
    ctx.font = 'bold 11px Georgia, serif'; ctx.fillStyle = '#8a5a00'; ctx.fillText(`${keyName(KEYMAP.interact)} o clic: agarrarla`, cx, y + 17);
    ctx.restore();
}
function wrapCanvasText(text, maxW, font) {
    ctx.save(); ctx.font = font;
    const out = []; let line = '';
    text.split(' ').forEach(word => { const t = line ? line + ' ' + word : word; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t; });
    if (line) out.push(line);
    ctx.restore();
    return out;
}
