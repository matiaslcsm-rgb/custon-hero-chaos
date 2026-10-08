// Tower Chaos: Esencia, desguace con calidades y mejoras permanentes (REWORK.md §4, fase 5, 2026-10-07).
//
//   ESENCIA (✦): moneda permanente, no se pierde al morir ni al terminar la run (se guarda con el Códice). La sueltan
//   jefes, señores de cueva, guardianes malditos y campeones, y se gana al dominar un poder.
//   DESGUACE en el Herrero: 5 piezas de la misma ranura (de la bolsa) + Esencia → una PIEZA PURA (sin alma) de esa
//   ranura, con una CALIDAD al azar: roma, usada, nueva u obra maestra. Mejores piezas entregadas, mejor chance.
//   Idea del usuario: si entre las 5 va una pieza ya fabricada, el resultado sale SÍ O SÍ una calidad por encima de la
//   mejor fabricada que entregaste (roma + 4 → al menos usada). Así se sube escalón por escalón hasta obra maestra.
//   MEJORAS PERMANENTES (con Esencia, en el Códice): herrero en el piso 1, imbuir más barato, arrancar con una pieza
//   pura y una fila más de bolsa.

// Calidades de fabricación. Los números son una primera versión: se ajustan acá sin tocar la lógica.
const CRAFT_QUALITY = [
    { key: 'roma', name: 'Roma', adj: ['Romo', 'Roma', 'Romos', 'Romas'], statMult: 0.8, affixes: 1, quality: 'normal' },
    { key: 'usada', name: 'Usada', adj: ['Usado', 'Usada', 'Usados', 'Usadas'], statMult: 1.0, affixes: 2, quality: 'magic' },
    { key: 'nueva', name: 'Nueva', adj: ['Nuevo', 'Nueva', 'Nuevos', 'Nuevas'], statMult: 1.2, affixes: 3, quality: 'rare' },
    { key: 'maestra', name: 'Obra maestra', adj: ['de Obra Maestra', 'de Obra Maestra', 'de Obra Maestra', 'de Obra Maestra'], statMult: 1.4, affixes: 4, quality: 'rare', master: true }
];
// Género y número de cada pieza, para concordar el adjetivo (Casco Romo, Coraza Roma, Guantes Romos, Botas Romas)
const SLOT_GENDER = { helm: 0, armor: 1, gloves: 2, boots: 3, amulet: 0, ring: 0 };
const CRAFT = {
    pieces: 5, cost: 15,                                  // piezas y Esencia por fabricación
    baseWeights: [45, 35, 17, 3],                         // chance de cada calidad con piezas normales
    perRank: 7                                            // cada punto de calidad entregada (mágica 1, rara 2, fabricada +tier) mueve chance hacia arriba
};
// Medido (2026-10-07): con 1 por campeón una run completa daba ~470 ✦ y se compraba todo en la primera; ahora ~270.
const ESSENCE = { guardian: f => 10 + 2 * f, caveBoss: d => 8 + 2 * d, cursed: 6, champion: 1, championChance: 0.25, mastery: 5 };
const META_UPGRADES = {
    smith1: { name: 'Herrero en el piso 1', desc: 'El pueblo del piso 1 siempre tiene herrero.', cost: [100] },
    infuse: { name: 'Imbuir más barato', desc: 'Imbuir cuesta 25% menos por nivel.', cost: [80, 160] },
    pure: { name: 'Arrancar con una pieza pura', desc: 'Empezás cada run con una pieza pura usada al azar en la bolsa.', cost: [150] },
    bag: { name: 'Bolsa más grande', desc: '+1 fila de inventario.', cost: [250] }
};
const BASE_BAG_ROWS = BAG.rows;

// --- ESENCIA ---
function essence() { return codex.essence || 0; }
function gainEssence(n, why) {
    if (!n) return;
    codex.essence = essence() + n; codexSave();
    writeNotebookPage('ESSENCE');
    if (towerRun) towerRun.stats.essence = (towerRun.stats.essence || 0) + n;
    if (why) log(`✦ +${n} de Esencia (${why}). Tenés ${essence()}.`);
    if (fxArena(player)) fxText(player, `+${n} ✦`, '#7b2cbf', 12, 1.2);
}
function spendEssence(n) { if (essence() < n) return false; codex.essence = essence() - n; codexSave(); return true; }
// Lo llama el botín de cada baja (towerItems.js)
function essenceOnKill(level, c) {
    if (c.isGuardian) gainEssence(ESSENCE.guardian(level.floor), 'guardián del piso');
    else if (c.isCaveBoss && level.isCave) gainEssence(ESSENCE.caveBoss(level.depth || 1), 'señor de la cueva');
    else if (c.isCaveBoss) gainEssence(ESSENCE.cursed, 'guardián maldito');
    else if (c.champion && Math.random() < ESSENCE.championChance) gainEssence(ESSENCE.champion);
}

// --- DESGUACE: 5 piezas → una pieza pura con calidad ---
const QUALITY_RANK = { normal: 0, magic: 1, rare: 2 };
// Calidad mínima garantizada: una por encima de la mejor pieza fabricada entregada (idea del usuario)
function craftFloor(pieces) {
    const best = Math.max(-1, ...pieces.filter(i => i.craftTier !== undefined).map(i => i.craftTier));
    return Math.min(CRAFT_QUALITY.length - 1, best + 1);
}
function craftWeights(pieces) {
    const score = pieces.reduce((a, i) => a + QUALITY_RANK[i.quality] + (i.craftTier !== undefined ? i.craftTier : 0), 0);
    const w = CRAFT.baseWeights.slice(), shift = Math.min(w[0] + w[1] - 10, score * CRAFT.perRank);
    // la chance sale de roma (y después de usada) y pasa a nueva y obra maestra
    const fromRoma = Math.min(w[0] - 5, shift), fromUsada = Math.min(w[1] - 5, shift - fromRoma);
    w[0] -= fromRoma; w[1] -= fromUsada; w[2] += (fromRoma + fromUsada) * 0.7; w[3] += (fromRoma + fromUsada) * 0.3;
    const min = craftFloor(pieces);
    for (let i = 0; i < min; i++) w[i] = 0;
    return w;
}
function rollCraftTier(pieces) {
    const w = craftWeights(pieces), total = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < w.length; i++) { if ((r -= w[i]) < 0) return i; }
    return w.length - 1;
}
function makePureItem(floor, slot, tier) {
    const q = CRAFT_QUALITY[tier];
    const item = { id: ++towerItemSeq, heroKey: null, slot, skillId: null, innateId: null, blank: true, plain: CODEX.statSlots.includes(slot), crafted: true, craftTier: tier, craftMult: q.statMult,
        masterwork: !!q.master, quality: q.quality, level: 1, xp: 0, floor, affixes: [], boosts: {}, skillLevel: 1, pendingChoices: 0 };
    shuffle(AFFIXES.slice()).slice(0, q.affixes).forEach(a => item.affixes.push({ key: a.key, name: a.name, value: round1(a.roll(floor)) }));
    nameTowerItem(item);
    return item;
}
// Las 5 que se usan: la mejor fabricada (para la garantía) y después las de menor calidad (lo que menos sirve)
function craftPick(hero, slot) {
    const pool = hero.bag.map(b => b.item).filter(i => slotKind(i.slot) === slot);
    if (pool.length < CRAFT.pieces) return null;
    const crafted = pool.filter(i => i.craftTier !== undefined).sort((a, b) => b.craftTier - a.craftTier);
    const first = crafted.length ? [crafted[0]] : [];
    const rest = pool.filter(i => !first.includes(i)).sort((a, b) => (QUALITY_RANK[a.quality] + (a.craftTier ?? -1)) - (QUALITY_RANK[b.quality] + (b.craftTier ?? -1)));
    return first.concat(rest).slice(0, CRAFT.pieces);
}
const CRAFT_SLOTS = () => CODEX.blankSlots.concat(CODEX.statSlots); // se funden las 6 ranuras
function craftableSlots(hero) { return CRAFT_SLOTS().filter(s => craftPick(hero, s)); }
// chosen: las 5 que eligió el jugador (si no, las elige el Herrero con craftPick)
function craftPure(hero, slot, floor = towerRun ? towerRun.floor : 1, chosen = null) {
    const inBag = new Set(hero.bag.map(b => b.item));
    const pieces = chosen ? (chosen.length === CRAFT.pieces && chosen.every(i => inBag.has(i) && slotKind(i.slot) === slot) ? chosen : null) : craftPick(hero, slot);
    if (!pieces) return null;
    if (essence() < CRAFT.cost) { log(`⚒️ Te falta Esencia: fabricar cuesta ${CRAFT.cost} ✦ (tenés ${essence()}).`); return null; }
    spendEssence(CRAFT.cost);
    const tier = rollCraftTier(pieces);
    hero.bag = hero.bag.filter(b => !pieces.includes(b.item));
    const item = makePureItem(floor, slot, tier);
    addToBag(hero, item);
    log(`⚒️ El Herrero fundió 5 piezas: ${item.name} (${CRAFT_QUALITY[tier].name}). −${CRAFT.cost} ✦`); sfx('levelup');
    writeNotebookPage('CRAFT');
    if (towerRun) towerRun.stats.crafted = (towerRun.stats.crafted || 0) + 1;
    return item;
}

// --- MEJORAS PERMANENTES ---
function upgradeLevel(key) { return (codex.upgrades && codex.upgrades[key]) || 0; }
function upgradeCost(key) { const c = META_UPGRADES[key].cost; return upgradeLevel(key) < c.length ? c[upgradeLevel(key)] : null; }
function buyUpgrade(key) {
    const cost = upgradeCost(key);
    if (cost === null || !spendEssence(cost)) return false;
    codex.upgrades = codex.upgrades || {}; codex.upgrades[key] = upgradeLevel(key) + 1; codexSave();
    log(`✦ Mejora permanente: ${META_UPGRADES[key].name}${META_UPGRADES[key].cost.length > 1 ? ` (nivel ${upgradeLevel(key)})` : ''}.`); sfx('levelup');
    return true;
}
// Al empezar una run (tower.js)
function applyMetaUpgrades(hero) {
    BAG.rows = BASE_BAG_ROWS + upgradeLevel('bag');
    if (upgradeLevel('pure')) addToBag(hero, makePureItem(1, pickRandom(CODEX.blankSlots), 1));
}
function renderUpgrades() {
    const box = document.getElementById('codex-upgrades');
    if (!box) return;
    box.innerHTML = `<h4>✦ Esencia: ${essence()} · mejoras permanentes</h4>`;
    Object.entries(META_UPGRADES).forEach(([k, u]) => {
        const cost = upgradeCost(k), lvl = upgradeLevel(k), row = document.createElement('div'); row.className = 'tshop-row';
        row.innerHTML = `<span class="tshop-name"><b>${u.name}</b>${u.cost.length > 1 ? ` <small>(${lvl}/${u.cost.length})</small>` : ''} <small>${u.desc}</small></span>` +
            (cost === null ? '<button class="secondary-btn" disabled>Comprada</button>' : `<button class="${essence() >= cost ? 'primary-btn' : 'secondary-btn'}" ${essence() >= cost ? '' : 'disabled'}>${cost} ✦</button>`);
        const b = row.querySelector('button'); if (cost !== null) b.onclick = () => { buyUpgrade(k); renderUpgrades(); };
        box.appendChild(row);
    });
}
// Desguace en la ventana del Herrero
// Elegir a mano (pedido de la lista de interfaz): clic en "Elegir" abre las piezas de esa ranura; arrancan marcadas
// las que elegiría el Herrero, y cada clic marca o desmarca. Las chances y la garantía se actualizan al instante.
let craftSel = null; // { slot, items: [] }
function renderCraft() {
    const box = document.getElementById('smith-craft');
    if (!box) return;
    box.innerHTML = '';
    const tip = html => { document.getElementById('smith-tooltip').innerHTML = html; };
    const slots = CRAFT_SLOTS().map(s => ({ s, n: player.bag.filter(b => slotKind(b.item.slot) === s).length })).filter(o => o.n > 0);
    if (!slots.some(o => o.n >= CRAFT.pieces)) box.innerHTML = `<p class="subtitle">Juntá ${CRAFT.pieces} piezas de la misma ranura en la bolsa (casco, coraza, guantes, botas, amuleto o anillo).</p>`;
    if (craftSel && !slots.some(o => o.s === craftSel.slot && o.n >= CRAFT.pieces)) craftSel = null;
    slots.forEach(({ s, n }) => {
        const open = craftSel && craftSel.slot === s, pick = open ? craftSel.items : craftPick(player, s);
        const ready = pick && pick.length === CRAFT.pieces, can = ready && essence() >= CRAFT.cost, floorTier = ready ? craftFloor(pick) : 0;
        const row = document.createElement('div'); row.className = 'tshop-row' + (open ? ' picked' : '');
        row.innerHTML = `<span class="tshop-name"><b>${SLOT_NOUNS[s]}</b> <small>${open ? `${pick.length}/${CRAFT.pieces} elegidas` : `${n}/${CRAFT.pieces} en la bolsa`}${ready && floorTier ? ` · mínimo ${CRAFT_QUALITY[floorTier].name}` : ''}</small></span>` +
            (n >= CRAFT.pieces ? `<button class="secondary-btn craft-choose">${open ? 'Listo' : 'Elegir'}</button>` : '') +
            `<button class="${can ? 'primary-btn' : 'secondary-btn'} craft-go" ${can ? '' : 'disabled'}>Fundir · ${CRAFT.cost} ✦</button>`;
        if (ready) row.onmouseenter = () => tip(craftPreviewHtml(pick));
        const choose = row.querySelector('.craft-choose');
        if (choose) choose.onclick = () => { craftSel = open ? null : { slot: s, items: craftPick(player, s) }; renderSmith(); if (craftSel) tip(craftPreviewHtml(craftSel.items)); };
        row.querySelector('.craft-go').onclick = () => {
            const it = craftPure(player, s, undefined, open ? craftSel.items : null);
            craftSel = null; renderSmith(); if (it) tip(itemTooltipHtml(it));
        };
        box.appendChild(row);
        if (!open) return;
        // Las piezas de esa ranura, para marcar o desmarcar
        const list = document.createElement('div'); list.className = 'craft-pick-list';
        player.bag.map(b => b.item).filter(i => slotKind(i.slot) === s).forEach(item => {
            const on = craftSel.items.includes(item), el = document.createElement('button');
            el.className = 'craft-pick' + (on ? ' on' : '');
            el.innerHTML = `${on ? '☑' : '☐'} <span style="color:${qColor(item)}">${item.name}</span>${item.craftTier !== undefined ? ' <small>(fabricada)</small>' : ''}`;
            el.onmouseenter = () => tip(itemTooltipHtml(item));
            el.onclick = () => {
                if (on) craftSel.items = craftSel.items.filter(i => i !== item);
                else if (craftSel.items.length < CRAFT.pieces) craftSel.items.push(item);
                else { log(`⚒️ Ya elegiste ${CRAFT.pieces}: desmarcá una para cambiarla.`); return; }
                renderSmith();
                tip(craftSel.items.length === CRAFT.pieces ? craftPreviewHtml(craftSel.items) : `<span class="subtitle">Elegí ${CRAFT.pieces - craftSel.items.length} más.</span>`);
            };
            list.appendChild(el);
        });
        box.appendChild(list);
    });
}
function craftPreviewHtml(pieces) {
    const w = craftWeights(pieces), total = w.reduce((a, b) => a + b, 0);
    return `<div class="tt-name">Se funden:</div><ul class="tt-mods">${pieces.map(i => `<li style="color:${qColor(i)}">${i.name}</li>`).join('')}</ul>` +
        `<div class="tt-forged">Chances: ${CRAFT_QUALITY.map((q, i) => `${q.name} ${Math.round(100 * w[i] / total)}%`).join(' · ')}</div>` +
        (craftFloor(pieces) ? `<div class="tt-forged">Garantía: va una pieza fabricada, así que sale ${CRAFT_QUALITY[craftFloor(pieces)].name} o mejor.</div>` : '');
}
// IA: funde cuando junta 5 de una ranura (antes de vender) y compra mejoras si le alcanza
function aiCraft(hero) {
    craftableSlots(hero).forEach(s => { if (essence() >= CRAFT.cost) craftPure(hero, s); });
}
