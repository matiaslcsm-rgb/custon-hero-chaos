// Tower Chaos: traspasar el crecimiento de una pieza a otra, en el Herrero (REWORK.md, "traspaso", 2026-10-08).
//
//   A pedido: "las armas que se suban de nivel y después aparezca una mejor, que se puedan fundir para sacar un
//   porcentaje de sus stats y sumarlo a otro objeto, así no desperdiciamos eso; que tenga algún costo". Es la
//   "transferencia" de Path of Exile / el "infuse" de Destiny: la pieza vieja se consume y la nueva hereda una parte.
//
//   Qué pasa: la pieza de origen DESAPARECE; la de destino (misma ranura) recibe el 50% de la experiencia que juntó
//   la de origen (sube de nivel con eso y elige cómo crece en la forja, como siempre) y el 50% de sus mejoras de
//   stats forjadas (+daño del arma, +vida de la pieza). La habilidad de la vieja NO pasa (para eso está imbuir).
//   Costo en oro: base por piso + por cada nivel de la de origen. Equilibrio: perdés la mitad de lo invertido y
//   pagás; a cambio no arrancás de cero con la pieza nueva. Nunca conviene más que haber seguido con la vieja.

const TRANSFER = { share: 0.5, base: 30, perLevel: 25, minLevel: 2 };

// Experiencia total que juntó una pieza (todo lo de los niveles que subió + lo que lleva del actual)
function itemTotalXp(item) {
    let xp = item.xp || 0;
    for (let l = 1; l < item.level; l++) xp += itemXpToNext(Object.assign({}, item, { level: l }));
    return xp;
}
function transferCost(source, floor = towerRun ? towerRun.floor : 1) { return Math.round(TRANSFER.base * floor + TRANSFER.perLevel * (source.level - 1)); }
function canTransfer(source, target) {
    return !!source && !!target && source !== target && source.level >= TRANSFER.minLevel && slotKind(source.slot) === slotKind(target.slot);
}
// Lo que recibiría la de destino (sin tocar nada): niveles que sube y stats que hereda
function transferPreview(source, target) {
    const xp = Math.floor(itemTotalXp(source) * TRANSFER.share);
    const sim = { slot: target.slot, level: target.level, xp: (target.xp || 0) + xp };
    while (sim.xp >= itemXpToNext(sim)) { sim.xp -= itemXpToNext(sim); sim.level++; }
    const stats = {};
    Object.entries(source.statBoosts || {}).forEach(([k, v]) => { const n = Math.round(v * TRANSFER.share); if (n) stats[k] = n; });
    return { xp, levels: sim.level - target.level, toLevel: sim.level, stats };
}
const TRANSFER_STAT_NAMES = { weaponAtk: 'daño del arma', maxHp: 'vida de la pieza' };
function transferItem(hero, source, target) {
    if (!canTransfer(source, target)) return false;
    const cost = transferCost(source);
    if (hero.gold < cost) { log(`⚒️ Te faltan ${cost - hero.gold}g para traspasar.`); return false; }
    const p = transferPreview(source, target);
    // La de origen se consume (si estaba puesta, se saca sin volver a la bolsa)
    const slot = equippedSlotOf(hero, source);
    if (slot) unequipSlot(hero, slot, false);
    hero.bag = hero.bag.filter(b => b.item !== source);
    hero.gold -= cost;
    target.statBoosts = target.statBoosts || {};
    Object.entries(p.stats).forEach(([k, v]) => { target.statBoosts[k] = (target.statBoosts[k] || 0) + v; });
    giveItemXp(hero, target, p.xp); // sube de nivel y deja elecciones de forja pendientes (towerItems.js)
    applyGear(hero);
    log(`⚒️ Traspasaste ${source.name} a ${target.name}: +${p.levels} nivel${p.levels === 1 ? '' : 'es'}${Object.keys(p.stats).length ? ', ' + Object.entries(p.stats).map(([k, v]) => `+${v} ${TRANSFER_STAT_NAMES[k] || k}`).join(', ') : ''}. −${cost}g`);
    sfx('levelup');
    writeNotebookPage('TRANSFER');
    return true;
}

// --- EN LA VENTANA DEL HERRERO ---
let transferSel = null; // { source } mientras se elige el destino
function renderTransfer() {
    const box = document.getElementById('smith-transfer');
    if (!box) return;
    box.innerHTML = '';
    const tip = html => { document.getElementById('smith-tooltip').innerHTML = html; };
    const pieces = heroPieces(player);
    if (transferSel && !pieces.includes(transferSel.source)) transferSel = null;
    const sources = pieces.filter(i => i.level >= TRANSFER.minLevel && pieces.some(t => canTransfer(i, t)));
    if (!sources.length) { box.innerHTML = `<p class="subtitle">Necesitás una pieza de nivel ${TRANSFER.minLevel} o más y otra de la misma ranura para recibir su crecimiento.</p>`; return; }
    const row = (item, label, can, act, extra = '') => {
        const el = document.createElement('div'); el.className = 'tshop-row' + (transferSel && transferSel.source === item ? ' picked' : '');
        el.innerHTML = `<img src="${towerItemIcon(item)}" class="ink-icon"><span class="tshop-name" style="color:${qColor(item)}">${item.name} <small>nv ${item.level}${equippedSlotOf(player, item) ? ' · equipada' : ''}${extra}</small></span>` +
            `<button class="${can ? 'primary-btn' : 'secondary-btn'}" ${can ? '' : 'disabled'}>${label}</button>`;
        el.querySelector('button').onclick = () => { act(); renderSmith(); };
        return el;
    };
    if (!transferSel) {
        sources.forEach(item => { const el = row(item, 'De esta', true, () => { transferSel = { source: item }; }); el.onmouseenter = () => tip(itemTooltipHtml(item)); box.appendChild(el); });
        return;
    }
    const src = transferSel.source, cost = transferCost(src);
    box.appendChild(row(src, 'Cancelar', true, () => { transferSel = null; }, ' · se consume'));
    pieces.filter(t => canTransfer(src, t)).forEach(t => {
        const p = transferPreview(src, t), can = player.gold >= cost;
        const el = row(t, `A esta · ${cost}g`, can, () => { if (transferItem(player, src, t)) transferSel = null; }, ` → nv ${p.toLevel}`);
        el.onmouseenter = () => tip(transferPreviewHtml(src, t, p, cost));
        box.appendChild(el);
    });
}
function transferPreviewHtml(src, t, p, cost) {
    return `<div class="tt-name">${src.name} → ${t.name}</div>` +
        `<ul class="tt-mods"><li>+${p.levels} nivel${p.levels === 1 ? '' : 'es'} (nv ${t.level} → ${p.toLevel}), con sus elecciones de forja</li>` +
        Object.entries(p.stats).map(([k, v]) => `<li>+${v} ${TRANSFER_STAT_NAMES[k] || k}</li>`).join('') + `</ul>` +
        `<div class="tt-forged">${src.name} desaparece. Pasa el ${Math.round(TRANSFER.share * 100)}% de lo que creció; su habilidad no. Cuesta ${cost}g.</div>`;
}

// IA: si guarda una pieza crecida que ya reemplazó, la traspasa a la que tiene puesta (con oro de sobra)
function aiTransfer(hero) {
    hero.bag.map(b => b.item).filter(i => i.level >= 3).forEach(src => {
        const slot = EQUIP_SLOTS.find(s => hero.gear[s] && canTransfer(src, hero.gear[s]));
        if (slot && hero.gold >= transferCost(src) + 100) transferItem(hero, src, hero.gear[slot]);
    });
}
