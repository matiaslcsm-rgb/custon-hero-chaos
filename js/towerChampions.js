// Tower Chaos: campeones legibles (REWORK.md §13, 2026-10-08).
//
//   Medido con el piloto de reflejos humanos: los campeones fueron los que más mataron, y su nombre ("Gran Troll Acorazado
//   Campeón (Regenerador, Veloz)") no se lee en plena pelea. Como los íconos de afijo de Diablo III y Path of Exile:
//     · Un ícono por afijo sobre la barra de vida, siempre del mismo color y forma.
//     · Con el mouse encima, un cartel que dice qué hace cada uno.
//     · La primera vez, el Cuaderno lo explica.
//   Combos más justos (los que más mataban): el Regenerador deja de curarse 2,5 s cada vez que recibe un golpe (como en
//   Diablo: se le gana pegándole sin parar) y no sale junto con Blindado ni con Vampírico (la pared que se cura sola).

const CHAMPION_LOOK = {
    fast: { icon: '»', color: '#c9a227', desc: 'se mueve y ataca 30% más rápido' },
    strong: { icon: '⚔', color: '#9b2226', desc: 'pega 40% más fuerte' },
    armored: { icon: '⛨', color: '#5c677d', desc: 'más armadura y resistencia mágica' },
    vampiric: { icon: '♥', color: '#6a040f', desc: 'se cura con la mitad de lo que te pega' },
    burning: { icon: '♨', color: '#e85d04', desc: 'sus golpes queman' },
    frozen: { icon: '❄', color: '#1d4e89', desc: 'sus golpes te ralentizan' },
    regen: { icon: '✚', color: '#2d6a4f', desc: 'se regenera, salvo 2,5 s después de cada golpe que recibe: no le des respiro' },
    explosive: { icon: '✹', color: '#d00000', desc: 'explota al morir: alejate' }
};
const CHAMPION_RULES = { regenPause: 2.5, exclude: [['regen', 'armored'], ['regen', 'vampiric']] };

// Afijos al azar, sin los combos excluidos
function pickChampionAffixes(n) {
    const out = [];
    shuffle(Object.keys(CHAMPION_AFFIXES)).forEach(k => {
        if (out.length >= n) return;
        if (CHAMPION_RULES.exclude.some(([a, b]) => (k === a && out.includes(b)) || (k === b && out.includes(a)))) return;
        out.push(k);
    });
    return out;
}
// ¿Puede regenerarse ahora? (no si lo golpearon hace poco)
function championCanRegen(c) { return gameClock - (c.lastHitAt ?? -99) > CHAMPION_RULES.regenPause; }

// --- DIBUJO ---
function drawChampionBadges(c, p, level) {
    if (!c.champion || !c.champion.length) return;
    const s = 11, gap = 2, n = c.champion.length, w = n * s + (n - 1) * gap;
    const cx = p.x * TILE + TILE / 2, top = p.y * TILE + TILE / 2 - TILE * 0.5 * (c.type && c.type.scale || 1) - 24 - (c.isGuardian ? 10 : 0); // arriba de la barra de vida
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 9px Georgia, serif';
    c.champion.forEach((k, i) => {
        const L = CHAMPION_LOOK[k], x = cx - w / 2 + i * (s + gap) + s / 2;
        const off = k === 'regen' && !championCanRegen(c); // el Regenerador cortado se ve apagado
        ctx.globalAlpha = off ? 0.4 : 1;
        ctx.fillStyle = L.color; ctx.beginPath(); ctx.arc(x, top, s / 2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#f3e7c9'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = '#f3e7c9'; ctx.fillText(L.icon, x, top + 0.5);
    });
    ctx.restore();
    if (player && Math.hypot(c.x - player.x, c.y - player.y) < 8) writeNotebookPage('CHAMPION'); // el Cuaderno lo explica
}
// Cartel con los afijos del campeón que está bajo el mouse (encima de todo)
function drawChampionCard(level) {
    if (!mouse.over || autopilot) return;
    const m = cursorWorld();
    if (!m) return;
    const c = level.creeps.find(o => o.isAlive() && o.champion && o.champion.length && canSee(level, o.x, o.y) && Math.hypot(o.x - m.x, o.y - m.y) < 0.8);
    if (!c) return;
    const rows = c.champion.map(k => ({ L: CHAMPION_LOOK[k], name: CHAMPION_AFFIXES[k].name }));
    ctx.save(); ctx.font = '10px Georgia, serif';
    const width = Math.max(200, ...rows.map(r => ctx.measureText(`${r.name}: ${r.L.desc}`).width + 36)); ctx.restore();
    // En la pantalla, encima de la niebla (si no, del lado oscuro lo tapaba), sin salirse de los bordes
    const h = 26 + rows.length * 16, z = viewScale(), sx = ((c.rx ?? c.x) - camera.x + 1.2) * TILE * z, sy = ((c.ry ?? c.y) - camera.y + 0.5) * TILE * z;
    const x = Math.max(8, Math.min(screenW() - width - 8, sx)), y = Math.max(8, Math.min(screenH() - h - 8, sy - h / 2));
    ctx.save();
    ctx.fillStyle = 'rgba(241,231,208,0.97)'; ctx.strokeStyle = INK.line; ctx.lineWidth = 2; ctx.fillRect(x, y, width, h); ctx.strokeRect(x, y, width, h);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1d4e89'; ctx.font = 'bold 11px Georgia, serif';
    ctx.fillText('Campeón · ' + c.label.replace(/ Campeón \(.*\)$/, ''), x + 8, y + 12);
    rows.forEach((r, i) => {
        const ry = y + 28 + i * 16;
        ctx.fillStyle = r.L.color; ctx.beginPath(); ctx.arc(x + 14, ry, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f3e7c9'; ctx.font = 'bold 9px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(r.L.icon, x + 14, ry + 0.5);
        ctx.textAlign = 'left'; ctx.fillStyle = INK.line; ctx.font = '10px Georgia, serif'; ctx.fillText(`${r.name}: ${r.L.desc}`, x + 25, ry);
    });
    ctx.restore();
}
