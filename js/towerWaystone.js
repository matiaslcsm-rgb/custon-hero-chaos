// Tower Chaos: la piedra de regreso (REWORK.md §16, decisión del usuario 2026-10-08).
//
//   Medido: lo que más separaba una run de otra eran las muertes, porque renacés en el piso 1 y había que volver a subir
//   todo (~8 min por muerte en los pisos altos). Seguís renaciendo en el círculo de la base, pero ahí hay una piedra
//   rúnica: tocándola (F o clic) aparecés en la entrada de cualquier piso al que ya llegaste, como las hogueras de Dark
//   Souls o los waypoints de Diablo. Tus restos siguen donde moriste. El piloto la usa solo al renacer.

const WAYSTONE = { reach: 1.6 };
// Dónde está: al pie del círculo de piedra (o la casilla libre más cercana)
function waystoneSpot(level) {
    if (level.floor !== 1 || level.isCave || !level.start) return null;
    if (level.waystone) return level.waystone;
    const s = level.start, cands = [[0, 2], [0, -2], [2, 2], [-2, 2], [1, 2], [-1, 2]].map(([dx, dy]) => ({ x: s.x + dx, y: s.y + dy }));
    return (level.waystone = cands.find(o => walkable(level, o.x, o.y) && !(level.starterWeapons || []).some(w => w.x === o.x && w.y === o.y)) || { x: s.x, y: s.y + 1 });
}
// Pisos a los que se puede volver (los que ya pisaste, salvo el 1)
function waystoneFloors() { return towerRun ? Array.from({ length: Math.max(0, towerRun.stats.bestFloor - 1) }, (_, i) => i + 2) : []; }
function nearWaystone(h = player) {
    const w = h && h.arena && waystoneSpot(h.arena);
    return !!w && waystoneFloors().length > 0 && Math.hypot(h.x - w.x, h.y - w.y) <= WAYSTONE.reach;
}
function waystoneTravel(floor) {
    if (!waystoneFloors().includes(floor)) return false;
    toggleWaystone(false);
    enterTowerFloor(floor, 'start');
    log(`🪨 La piedra de regreso te llevó a la entrada del piso ${floor}.`);
    if (fxArena(player)) { fxRing(player, '#7b6cf6', 1.8, 0.6); sfx('el_arcane'); }
    return true;
}

// --- VENTANA ---
let waystoneOpen = false;
function toggleWaystone(open = !waystoneOpen) {
    waystoneOpen = open && waystoneFloors().length > 0;
    showPanel('waystone-container', waystoneOpen);
    if (!waystoneOpen) return;
    writeNotebookPage('WAYSTONE');
    const box = document.getElementById('waystone-list'); box.innerHTML = '';
    const corpse = towerRun.corpse;
    waystoneFloors().forEach(f => {
        const B = BIOMES[biomeFor(f)], b = document.createElement('button');
        b.className = 'secondary-btn waystone-btn';
        b.innerHTML = `${B.icon} Piso ${f} · ${B.name}${corpse && corpse.floor === f ? ' <small>(tus restos)</small>' : ''}${f === towerRun.stats.bestFloor ? ' <small>(el más alto)</small>' : ''}`;
        b.onclick = () => waystoneTravel(f);
        box.appendChild(b);
    });
}

// --- DIBUJO: piedra rúnica que brilla si hay adónde ir ---
function drawWaystone(level) {
    const w = waystoneSpot(level);
    if (!w || !level.explored[w.y] || !level.explored[w.y][w.x]) return;
    const cx = w.x * TILE + TILE / 2, cy = w.y * TILE + TILE / 2, on = waystoneFloors().length > 0, pulse = 0.5 + 0.5 * Math.sin(fxClock * 2.5);
    ctx.save();
    if (on) { ctx.fillStyle = `rgba(123,108,246,${0.18 + 0.18 * pulse})`; ctx.beginPath(); ctx.ellipse(cx, cy + TILE * 0.3, TILE * 0.55, TILE * 0.2, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = INK.stone; ctx.strokeStyle = INK.line; ctx.lineWidth = 2; // la piedra, más alta que los menhires
    ctx.beginPath(); ctx.moveTo(cx - 8, cy + 10); ctx.lineTo(cx - 9, cy - 10); ctx.lineTo(cx - 2, cy - 18); ctx.lineTo(cx + 7, cy - 12); ctx.lineTo(cx + 8, cy + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = on ? `rgba(123,108,246,${0.6 + 0.4 * pulse})` : 'rgba(29,23,18,0.5)'; ctx.lineWidth = 1.8; // runas
    if (on) { ctx.shadowColor = '#7b6cf6'; ctx.shadowBlur = 8; }
    ctx.beginPath(); ctx.moveTo(cx - 3, cy - 9); ctx.lineTo(cx + 2, cy - 4); ctx.lineTo(cx - 3, cy + 1); ctx.moveTo(cx + 2, cy - 11); ctx.lineTo(cx + 2, cy + 4); ctx.stroke();
    ctx.restore();
    if (on && nearWaystone()) { ctx.font = 'bold 11px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#4a3f9a'; ctx.fillText(`${keyName(KEYMAP.interact)}: piedra de regreso`, cx, cy + TILE * 0.85); } // abajo: arriba lo tapa el héroe
}

// --- PILOTO: al renacer, vuelve al piso de sus restos (o al más alto) ---
function aiWaystone() {
    if (!autopilot || !towerRun || !player.isAlive() || player.arena.floor !== 1 || player.arena.isCave) return;
    const floors = waystoneFloors();
    if (!floors.length || towerRun.aiWaystoneUsedAt === towerRun.deaths) return;
    towerRun.aiWaystoneUsedAt = towerRun.deaths;
    if (!towerRun.deaths) return; // en la primera subida no hay nada que saltear
    const corpse = towerRun.corpse;
    waystoneTravel(corpse && floors.includes(corpse.floor) ? corpse.floor : Math.max(...floors));
}
