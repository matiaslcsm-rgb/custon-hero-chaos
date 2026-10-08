// Tower Chaos: mapa del piso a pantalla completa (tecla M; REWORK.md, lista de interfaz, 2026-10-07).
//
//   Como el mapa de Diablo o de Hollow Knight: lo descubierto del piso, grande y con leyenda (pueblo, herrero, mercader,
//   laberinto, escalera, guardián, santuarios, cuevas, eventos, cofres, tus restos y el portador). La partida no se frena:
//   es un vistazo (M o Esc lo cierran).

let towerMapOpen = false;
function toggleTowerMap(open = !towerMapOpen) {
    towerMapOpen = open && gameMode === 'tower' && !!(player && player.arena);
    document.body.classList.toggle('map-open', towerMapOpen); // esconde la barra del héroe y los mensajes (style.css)
}

// Qué se marca (con lo que ya descubriste) y cómo
const MAP_MARKS = [
    { key: 'you', label: 'Vos', color: '#00a896', shape: 'arrow' },
    { key: 'town', label: 'Pueblo (zona segura)', color: '#6b2a1f', shape: 'rect' },
    { key: 'merchant', label: 'Mercader (B)', color: '#c9a227', shape: 'coin' },
    { key: 'smith', label: 'Herrero (B)', color: '#e85d04', shape: 'anvil' },
    { key: 'lab', label: 'Laberinto de la torre', color: '#3d3d3d', shape: 'rect' },
    { key: 'stairs', label: 'Escalera (abierta / cerrada)', color: '#2d6a4f', shape: 'stairs' },
    { key: 'guardian', label: 'Guardián del piso', color: '#9b2226', shape: 'skull' },
    { key: 'shrine', label: 'Santuario sin usar', color: '#7b2cbf', shape: 'diamond' },
    { key: 'cave', label: 'Entrada de cueva', color: '#1d1712', shape: 'hole' },
    { key: 'event', label: 'Evento', color: '#e85d04', shape: 'star' },
    { key: 'chest', label: 'Cofre sin abrir', color: '#8b5a2b', shape: 'chest' },
    { key: 'corpse', label: 'Tus restos', color: '#c9a227', shape: 'cross' },
    { key: 'carrier', label: 'Portador con tu equipo', color: '#c9a227', shape: 'bag' }
];
function drawMapMark(g, shape, x, y, color, r = 6) {
    g.save(); g.fillStyle = color; g.strokeStyle = INK.line; g.lineWidth = 1.5;
    g.beginPath();
    if (shape === 'diamond') { g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); }
    else if (shape === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r * 1.1; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); }
    else if (shape === 'skull') { g.arc(x, y - 1, r, 0, Math.PI * 2); }
    else if (shape === 'hole') { g.ellipse(x, y, r * 1.1, r * 0.7, 0, 0, Math.PI * 2); }
    else if (shape === 'chest') { g.rect(x - r, y - r * 0.6, r * 2, r * 1.3); }
    else if (shape === 'stairs') { g.rect(x - r, y + r * 0.2, r * 2, r * 0.8); g.rect(x - r * 0.4, y - r * 0.6, r * 1.4, r * 0.8); g.rect(x + r * 0.2, y - r * 1.3, r * 0.8, r * 0.7); }
    else if (shape === 'anvil') { g.rect(x - r, y - r * 0.5, r * 2, r * 0.5); g.rect(x - r * 0.4, y, r * 0.8, r * 0.8); }
    else if (shape === 'cross') { g.rect(x - r * 0.25, y - r, r * 0.5, r * 2); g.rect(x - r * 0.75, y - r * 0.4, r * 1.5, r * 0.5); }
    else if (shape === 'arrow') { g.moveTo(x, y - r * 1.3); g.lineTo(x + r, y + r); g.lineTo(x, y + r * 0.4); g.lineTo(x - r, y + r); g.closePath(); }
    else g.arc(x, y, r, 0, Math.PI * 2); // coin, bag
    g.fill(); g.stroke(); g.restore();
}
// En pantalla, encima de todo (lo llama renderTower)
function drawTowerBigMap(level) {
    if (!towerMapOpen || !level) return;
    const W = screenW(), H = screenH(), m = 26, legendW = 230;
    const s = Math.min((W - m * 3 - legendW) / COLS, (H - m * 2 - 30) / ROWS), mw = COLS * s, mh = ROWS * s;
    const ox = m + Math.max(0, (W - m * 3 - legendW - mw) / 2), oy = m + 30 + Math.max(0, (H - m * 2 - 30 - mh) / 2);
    ctx.save();
    ctx.fillStyle = 'rgba(29,23,18,0.55)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(233,220,192,0.97)'; ctx.fillRect(m / 2, m / 2, W - m, H - m);
    ctx.strokeStyle = INK.line; ctx.lineWidth = 2; ctx.strokeRect(m / 2, m / 2, W - m, H - m);
    ctx.fillStyle = '#6b2a1f'; ctx.font = 'bold 17px Georgia, serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const B = BIOMES[level.biome];
    ctx.fillText(level.isCave ? `Piso ${level.floor} · Cueva, nivel −${level.depth}` : `Piso ${level.floor} de ${TOWER.floors} · ${B ? B.icon + ' ' + B.name : ''}`, m + 4, m + 12);
    ctx.font = '12px Georgia, serif'; ctx.fillStyle = INK.line; ctx.textAlign = 'right';
    ctx.fillText('M o Esc para cerrar · la partida sigue', W - m - 4, m + 12);
    // Lo descubierto (el minimapa, ampliado) sobre lo no descubierto en sombra
    ctx.fillStyle = '#2b2118'; ctx.fillRect(ox, oy, mw, mh);
    if (level.minimap) { ctx.imageSmoothingEnabled = false; ctx.drawImage(level.minimap, ox, oy, mw, mh); ctx.imageSmoothingEnabled = true; }
    ctx.strokeStyle = INK.line; ctx.lineWidth = 1.5; ctx.strokeRect(ox, oy, mw, mh);
    const X = x => ox + (x + 0.5) * s, Y = y => oy + (y + 0.5) * s, seen = (x, y) => level.explored[y] && level.explored[y][x];
    const mark = (k, x, y, label) => { const d = MAP_MARKS.find(o => o.key === k); drawMapMark(ctx, d.shape, X(x), Y(y), d.color); if (label) { ctx.font = 'bold 11px Georgia, serif'; ctx.fillStyle = INK.line; ctx.textAlign = 'left'; ctx.fillText(label, X(x) + 9, Y(y)); } };
    const rectMark = (k, r, label) => { const d = MAP_MARKS.find(o => o.key === k); ctx.strokeStyle = d.color; ctx.lineWidth = 2; ctx.setLineDash([5, 3]); ctx.strokeRect(ox + r.x * s, oy + r.y * s, r.w * s, r.h * s); ctx.setLineDash([]); ctx.font = 'bold 12px Georgia, serif'; ctx.fillStyle = d.color; ctx.textAlign = 'left'; ctx.fillText(label, ox + r.x * s + 3, oy + r.y * s - 8); };
    const tw = level.town;
    if (tw && seen(tw.merchant.x, tw.merchant.y)) {
        rectMark('town', tw, 'Pueblo');
        mark('merchant', tw.merchant.x, tw.merchant.y);
        if (tw.smith) mark('smith', tw.smith.x, tw.smith.y);
    }
    if (level.lab && level.enteredLab) rectMark('lab', level.lab, 'Laberinto');
    if (level.stairs && seen(level.stairs.x, level.stairs.y)) { drawMapMark(ctx, 'stairs', X(level.stairs.x), Y(level.stairs.y), level.stairsOpen ? '#2d6a4f' : '#8f8166'); }
    const g = level.guardian || level.caveBoss;
    if (g && g.isAlive() && seen(g.x, g.y)) mark('guardian', g.x, g.y);
    (level.shrines || []).forEach(sh => { if (!sh.used && seen(sh.x, sh.y)) drawMapMark(ctx, 'diamond', X(sh.x), Y(sh.y), SHRINES[sh.kind].color); });
    (level.caves || []).forEach(c => { if (seen(c.x, c.y)) mark('cave', c.x, c.y); });
    if (level.down && seen(level.down.x, level.down.y)) mark('cave', level.down.x, level.down.y, 'Bajada');
    if (level.exitUp) drawMapMark(ctx, 'stairs', X(level.exitUp.x), Y(level.exitUp.y), '#c9a227');
    (level.events || []).forEach(e => { if (e.kind !== 'ambush' && e.seen && !['saved', 'lost', 'open', 'freed'].includes(e.state)) drawMapMark(ctx, 'star', X(e.x), Y(e.y), EVENT_INFO[e.kind].color); });
    (level.chests || []).forEach(ch => { if (!ch.open && seen(ch.x, ch.y)) mark('chest', ch.x, ch.y); });
    if (towerRun.corpse && towerRun.corpse.level === level) mark('corpse', towerRun.corpse.x, towerRun.corpse.y, 'Tus restos');
    carriersOn(level).forEach(c => mark('carrier', c.x, c.y, 'Portador'));
    if (player.isAlive()) mark('you', player.x, player.y);
    // Leyenda
    const lx = W - m - legendW + 6;
    let ly = oy + 4;
    ctx.font = 'bold 13px Georgia, serif'; ctx.fillStyle = '#6b2a1f'; ctx.textAlign = 'left'; ctx.fillText('Referencias', lx, ly); ly += 22;
    ctx.font = '12px Georgia, serif';
    MAP_MARKS.forEach(d => {
        if (d.shape === 'rect') { ctx.strokeStyle = d.color; ctx.lineWidth = 2; ctx.setLineDash([5, 3]); ctx.strokeRect(lx, ly - 6, 14, 12); ctx.setLineDash([]); }
        else drawMapMark(ctx, d.shape, lx + 7, ly, d.color);
        ctx.fillStyle = INK.line; ctx.fillText(d.label, lx + 22, ly); ly += 21;
    });
    ly += 8;
    if (!level.isCave && level.town) { ctx.fillStyle = '#5e5444'; ctx.fillText(`Objetivo: ${towerObjective(level).text}`, lx, ly, legendW - 10); }
    ctx.restore();
}
