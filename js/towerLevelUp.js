// Infinite Tower: al subir de nivel elegís 1 de 3 mejoras (fase T00 del roadmap; decidido por el usuario 2026-10-14).
//
//   Antes repartías 5 puntos sueltos por nivel y cada punto hacía lo mismo que el anterior: una cuenta, no una elección.
//   Ahora la ventana de stats (C) ofrece 3 cartas al azar (de Fuerza, Agilidad, Inteligencia, Vitalidad y Visión), cada
//   una con los 5 puntos del nivel juntos, y cada stat tiene UMBRALES: elegirlo 3 y 6 veces destraba una mejora propia
//   (como las bendiciones de Hades que cambian cómo jugás). Los puntos siguen siendo puntos, así que los restos al morir
//   (DEATH, tower.js) y el piloto automático (aiSpendStatPoints) funcionan igual.

const LEVEL_PICK = { points: 5, offer: 3 };
const LEVEL_PERKS = {
    str: [{ at: 3, name: 'Piel de Roble', desc: '−10% de daño recibido', mods: { dmgReduction: 0.1 } },
        { at: 6, name: 'Golpe Pesado', desc: '+15% de daño', mods: { atkPct: 0.15 } }],
    agi: [{ at: 3, name: 'Pies Ligeros', desc: '+8% de velocidad de movimiento', mods: { moveSpeedPct: 0.08 } },
        { at: 6, name: 'Ojo Certero', desc: '+10% de crítico', mods: { critChance: 10 } }],
    int: [{ at: 3, name: 'Fuente Arcana', desc: '+2 de maná por segundo', mods: { manaRegen: 2 } },
        { at: 6, name: 'Mente Afilada', desc: '+20% de amplificación de hechizo', mods: { spellAmp: 20 } }],
    vit: [{ at: 3, name: 'Sangre Espesa', desc: '+6% de robo de vida', mods: { lifesteal: 6 } },
        { at: 6, name: 'Coraza Viva', desc: '−15% de daño recibido (no se suma con Piel de Roble: vale la mayor)', mods: { dmgReduction: 0.15 } }],
    vis: [{ at: 3, name: 'Cazador de Tesoros', desc: 'reliquias: el doble de chance en campeones y cofres', relicLuck: 2 },
        { at: 6, name: 'Ojo del Explorador', desc: 'reliquias: el triple de chance en campeones y cofres', relicLuck: 3 }]
};
// Cuántas veces elegiste un stat (cada carta son 5 puntos)
function levelPicks(h, k) { return Math.floor(((h.towerStats && h.towerStats[k]) || 0) / LEVEL_PICK.points); }
function levelPerksOf(h) { return Object.entries(LEVEL_PERKS).flatMap(([k, list]) => list.filter(p => levelPicks(h, k) >= p.at)); }
function relicLuck(h) { return Math.max(1, ...levelPerksOf(h).map(p => p.relicLuck || 1)); }
// Las 3 cartas que se ofrecen (quedan fijas hasta que elijas una, así no se "rerollea" cerrando la ventana)
function levelOffer(h) {
    if (!h.statPoints) return (h.levelOffer = null);
    return h.levelOffer || (h.levelOffer = shuffle(Object.keys(TOWER_STATS)).slice(0, LEVEL_PICK.offer));
}
function chooseLevelPick(h, k) {
    if (!h.statPoints || !(levelOffer(h) || []).includes(k)) return false;
    const before = levelPerksOf(h).length;
    for (let i = 0; i < LEVEL_PICK.points && h.statPoints; i++) { h.statPoints--; changeTowerStat(h, k, 1); }
    h.levelOffer = null;
    const got = levelPerksOf(h).slice(before);
    if (h === player) { got.forEach(p => { log(`✨ ¡${p.name}! ${p.desc}.`); sfx('levelup'); }); renderStatsWindow(); }
    return true;
}
// Las mejoras destrabadas, en un efecto permanente (lo llama towerTerrainTick cada cuadro)
function levelPerkTick(h) {
    const mods = {};
    levelPerksOf(h).forEach(p => Object.entries(p.mods || {}).forEach(([k, v]) => { mods[k] = k === 'dmgReduction' ? Math.max(mods[k] || 0, v) : (mods[k] || 0) + v; }));
    const e = getEffect(h, 'LEVEL_PERKS');
    if (e) e.mods = mods; else addEffect(h, { id: 'LEVEL_PERKS', name: 'Mejoras', duration: Infinity, flags: ['persistent'], tags: ['MEJORA'], mods });
}
// Las cartas en la ventana de stats: qué da, cuánto falta para su próxima mejora
function renderLevelCards(box) {
    const offer = levelOffer(player);
    if (!offer) { box.innerHTML = ''; return; }
    box.innerHTML = `<p class="subtitle">Elegí una mejora (${Math.min(LEVEL_PICK.points, player.statPoints)} puntos):</p>` + offer.map(k => {
        const st = TOWER_STATS[k], n = levelPicks(player, k), next = LEVEL_PERKS[k].find(p => p.at > n);
        return `<button class="level-card" data-k="${k}" style="border-color:${st.color}"><b style="color:${st.color}">${st.icon} ${st.name}</b>` +
            `<small>${st.gives()}</small>${next ? `<span class="perk">${n + 1}/${next.at} → <b>${next.name}</b>: ${next.desc}</span>` : '<span class="perk">Ya destrabaste todo</span>'}</button>`;
    }).join('');
    box.querySelectorAll('.level-card').forEach(b => { b.onclick = () => chooseLevelPick(player, b.dataset.k); });
}
