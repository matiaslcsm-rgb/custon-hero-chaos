// Tower Chaos: interfaz del equipo — inventario en grilla (tecla I), forja e íconos de las piezas (ver towerItems.js).
//
//   Inventario: clic en una pieza la levanta; clic en una casilla libre o en su ranura la suelta (o la equipa);
//   clic derecho equipa o desequipa. Mientras está abierto (o la forja, o los stats), la partida espera.

let invOpen = false, forgeOpen = false, invHeld = null, tshopOpen = false;
function towerModalOpen() { return statsOpen || invOpen || forgeOpen || tshopOpen || bestiaryOpen; }

// Ícono de una pieza en estilo tinta (inkart.js): forma según el arma o la ranura, color del atributo del héroe de origen.
// Color de la calidad: sobre el pergamino de la Torre, en tinta oscura (los claros no se leen)
const qColor = item => (gameMode === 'tower' ? ITEM_QUALITY[item.quality].ink : ITEM_QUALITY[item.quality].color);
const SLOT_INK_ICON = { helm: 'helm', armor: 'armor', gloves: 'glove', boots: 'boot', amulet: 'amulet', ring: 'ring' };
function towerItemIcon(item) {
    const color = inkMute(ATTR_INFO[HERO_TEMPLATES[item.heroKey].primaryAttr].color, 0.2);
    // game-icons.net (js/data/gameIcons.js): el objeto grande y, en la esquina, la habilidad que trae
    const main = typeof GAME_ICON_FOR !== 'undefined' && (item.slot === 'weapon' ? GAME_ICON_FOR.weapons[item.heroKey] : GAME_ICON_FOR.slots[slotKind(item.slot)]);
    const skill = itemSkill(item);
    if (hasGameIcon(main)) return inkGameIcon(main, color, skill && GAME_ICON_FOR.skills[skill.id], INK.line);
    const kind = item.slot === 'weapon' ? HERO_WEAPONS[item.heroKey].shape : SLOT_INK_ICON[slotKind(item.slot)];
    return inkIcon(kind, color);
}

function itemTooltipHtml(item) {
    const q = { ...ITEM_QUALITY[item.quality], color: qColor(item) }, t = HERO_TEMPLATES[item.heroKey], skill = itemSkill(item);
    const mods = Object.entries(itemMods(item)).map(([k, v]) => `<li>${MOD_LABELS[k] ? MOD_LABELS[k](v) : `${k} ${v}`}</li>`).join('');
    const w = item.slot === 'weapon' ? HERO_WEAPONS[item.heroKey] : null;
    const forged = Object.entries(item.boosts).map(([k, n]) => `${BOOSTABLE[k] ? BOOSTABLE[k].label : k} ×${n}`)
        .concat(Object.entries(item.statBoosts || {}).map(([k, v]) => (k === 'weaponAtk' ? `+${v} daño del arma` : `+${v} vida`)));
    let html = `<div class="tt-name" style="color:${q.color}">${item.name}</div>` +
        `<div class="tt-meta">${q.name} · ${TOWER_SLOTS[slotKind(item.slot)].name} de ${t.name} · nivel ${item.level} ` +
        `<span class="tt-xp"><span style="width:${Math.round(100 * item.xp / itemXpToNext(item))}%"></span></span></div>`;
    if (w) {
        const atk = Math.round(w.atk + 1.5 * (item.level - 1) + ((item.statBoosts && item.statBoosts.weaponAtk) || 0));
        html += `<div class="tt-weapon">Ataque: ${atk} de daño · ${w.atkSpeed} ataques/s · alcance ${w.range}${w.projectile ? ' (a distancia)' : ''} · atributo ${ATTR_INFO[t.primaryAttr].label}</div>`;
    }
    if (mods) html += `<ul class="tt-mods">${mods}</ul>`;
    if (skill) {
        const lvl = skill.isInnateItem ? 0 : item.skillLevel;
        const kind = skill.isInnateItem ? 'Innato' : skill.kind === 'passive' ? 'Pasiva' : skill.isUltimate ? 'Definitiva' : 'Activa';
        html += `<div class="tt-skill"><b>${skill.name}</b> <span class="tt-kind">${kind}${skill.isInnateItem ? '' : ' · nivel ' + lvl}</span>` +
            (skill.kind === 'active' && !skill.isInnateItem ? `<div class="tt-cost">${skillCostLine(skill, lvl)}</div>` : '') +
            `<div>${skill.isInnateItem ? skill.description.replace(/^Innato:\s*/, '') : describeSkill(skill, lvl)}</div></div>`;
    }
    if (forged.length) html += `<div class="tt-forged">⚒ Forjado: ${forged.join(' · ')}</div>`;
    return html;
}

function toggleInventory(open = !invOpen) {
    if (gameMode !== 'tower' || !player || !player.gear) return;
    if (!open && invHeld) { if (!addToBag(player, invHeld.item)) dropOnFloor(player, invHeld.item); invHeld = null; }
    invOpen = open;
    showPanel('inv-container', open);
    if (open) { document.getElementById('inv-tooltip').innerHTML = ''; renderInventory(); }
}

function renderInventory() {
    if (!invOpen) return;
    const tip = document.getElementById('inv-tooltip');
    const hover = item => { tip.innerHTML = item ? itemTooltipHtml(item) : '<span class="subtitle">Pasá el mouse por una pieza para ver sus detalles.</span>'; };
    // Ranuras de equipo
    const gear = document.getElementById('inv-gear'); gear.innerHTML = '';
    EQUIP_SLOTS.forEach(s => {
        const item = player.gear[s];
        const box = document.createElement('div');
        box.className = 'gear-slot gear-' + slotKind(s) + (item ? ' filled' : '');
        if (item) box.style.borderColor = qColor(item);
        box.innerHTML = `<span class="gear-label">${TOWER_SLOTS[slotKind(s)].name}</span>` + (item ? `<img src="${towerItemIcon(item)}" class="ink-icon"><span class="gear-lvl">${item.level}</span>` : '');
        box.onmouseenter = () => hover(item);
        box.onclick = () => {
            if (invHeld) { if (slotKind(s) === invHeld.item.slot) { const held = invHeld.item; invHeld = null; equipItem(player, held, s); } }
            else if (item) { unequipSlot(player, s, false); invHeld = { item }; }
            renderInventory();
        };
        box.oncontextmenu = e => { e.preventDefault(); if (item) unequipSlot(player, s); renderInventory(); };
        gear.appendChild(box);
    });
    // Grilla
    const bag = document.getElementById('inv-bag'); bag.innerHTML = '';
    for (let y = 0; y < BAG.rows; y++) for (let x = 0; x < BAG.cols; x++) {
        const cell = document.createElement('div'); cell.className = 'bag-cell';
        cell.style.gridColumn = x + 1; cell.style.gridRow = y + 1;
        cell.onclick = () => {
            if (invHeld && bagFree(player, x, y, ...itemSize(invHeld.item))) { addToBag(player, invHeld.item, { x, y }); invHeld = null; renderInventory(); }
        };
        bag.appendChild(cell);
    }
    player.bag.forEach(b => {
        const [w, h] = itemSize(b.item);
        const el = document.createElement('div'); el.className = 'bag-item';
        el.style.gridColumn = `${b.x + 1} / span ${w}`; el.style.gridRow = `${b.y + 1} / span ${h}`;
        el.style.borderColor = qColor(b.item);
        el.innerHTML = `<img src="${towerItemIcon(b.item)}" class="ink-icon">`;
        el.onmouseenter = () => hover(b.item);
        el.onclick = () => { if (!invHeld) { player.bag = player.bag.filter(o => o !== b); invHeld = { item: b.item }; renderInventory(); } };
        el.oncontextmenu = e => { e.preventDefault(); equipItem(player, b.item); renderInventory(); };
        bag.appendChild(el);
    });
    const heldBox = document.getElementById('inv-held');
    heldBox.innerHTML = invHeld
        ? `En la mano: <b style="color:${qColor(invHeld.item)}">${invHeld.item.name}</b> — clic en una casilla libre o en su ranura. <button class="secondary-btn" id="inv-drop">Tirar al piso</button>`
        : 'Clic en una pieza para moverla · clic derecho para equipar o desequipar';
    const dropBtn = document.getElementById('inv-drop');
    if (dropBtn) dropBtn.onclick = () => { dropOnFloor(player, invHeld.item); log(`Tiraste ${invHeld.item.name}.`); invHeld = null; renderInventory(); };
    if (!tip.innerHTML) hover(null);
}

// Forja: cuando una pieza sube de nivel, elegís cómo crece (la partida espera).
function openForge(item) {
    forgeOpen = true;
    showPanel('forge-container', true);
    document.getElementById('forge-title').innerHTML = `⚒ Forjar · <span style="color:${qColor(item)}">${item.name}</span> (nivel ${item.level})`;
    const skill = itemSkill(item);
    document.getElementById('forge-sub').textContent = skill ? `Elegí cómo crece ${skill.name}. Cada elección queda en la pieza para siempre.` : 'Elegí cómo crece la pieza.';
    const box = document.getElementById('forge-options'); box.innerHTML = '';
    forgeOptions(item).forEach(opt => {
        const card = document.createElement('div');
        card.className = 'skill-card draft-card forge-card';
        card.innerHTML = `<h4>${opt.text}</h4>${opt.skillName ? `<p class="meta">${opt.skillName}</p>` : ''}`;
        card.onclick = () => { item.pendingChoices--; applyForge(player, item, opt); forgeOpen = false; showPanel('forge-container', false); sfx('click'); if (invOpen) renderInventory(); };
        box.appendChild(card);
    });
}

// Piezas y cofres en el piso del nivel (los dibuja renderTower dentro de la vista de la cámara).
function drawTowerLoot(level) {
    (level.chests || []).forEach(ch => {
        if (!canSee(level, ch.x, ch.y) && !level.explored[ch.y][ch.x]) return;
        const px = ch.x * TILE, py = ch.y * TILE;
        ctx.fillStyle = ch.open ? '#5c4033' : '#8b5a2b'; ctx.fillRect(px + 6, py + 12, TILE - 12, TILE - 16);
        ctx.fillStyle = ch.open ? '#3e2a1e' : '#ffd166'; ctx.fillRect(px + 6, py + 10, TILE - 12, 4);
        if (!ch.open) { ctx.fillStyle = '#ffd166'; ctx.fillRect(px + TILE / 2 - 2, py + 16, 4, 5); }
    });
    (level.drops || []).forEach(d => {
        if (!canSee(level, d.x, d.y)) return;
        const px = d.x * TILE + TILE / 2, py = d.y * TILE + TILE / 2, color = ITEM_QUALITY[d.item.quality].color;
        ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 10 + 4 * Math.sin(fxClock * 4);
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(px - 11, py - 11, 22, 22); ctx.restore();
        const img = towerIconImage(d.item);
        if (img.complete) ctx.drawImage(img, px - 10, py - 10, 20, 20);
    });
}
const towerIconImages = {};
function towerIconImage(item) {
    const url = towerItemIcon(item);
    if (!towerIconImages[url]) { const img = new Image(); img.src = url; towerIconImages[url] = img; }
    return towerIconImages[url];
}

// --- MERCADER DEL PUEBLO ---
// Vende 6 piezas del piso (3 normales, 2 mágicas, 1 rara; se reponen al cambiar de piso) y compra lo que tengas en la bolsa.
const TSHOP = { stock: { normal: 3, magic: 2, rare: 1 }, base: { normal: 80, magic: 220, rare: 520 }, perFloor: 0.5, perLevel: 20, sell: { normal: 4, magic: 10, rare: 25 } };
// Vender paga poco (como los vendedores de Diablo): con ~17 piezas por piso, vender todo era la mayor fuente de oro.
function towerItemPrice(item) { return Math.round(TSHOP.base[item.quality] * (1 + TSHOP.perFloor * (item.floor - 1)) + TSHOP.perLevel * (item.level - 1)); }
function towerSellPrice(item) { return TSHOP.sell[item.quality] * item.floor; }
function towerShopStock(level) {
    if (!level.town.stock) {
        level.town.stock = [];
        Object.entries(TSHOP.stock).forEach(([q, n]) => { for (let i = 0; i < n; i++) level.town.stock.push(makeTowerItem(level.floor, undefined, q)); });
    }
    return level.town.stock;
}
function buyTowerItem(hero, item) {
    const level = hero.arena, price = towerItemPrice(item);
    if (hero.gold < price) { log(`🛒 Te faltan ${price - hero.gold}g para ${item.name}.`); return false; }
    if (!addToBag(hero, item)) { log('🎒 No hay lugar en el inventario.'); return false; }
    hero.gold -= price;
    level.town.stock = level.town.stock.filter(i => i !== item);
    log(`🛒 Compraste ${item.name} (-${price}g).`); sfx('coin');
    return true;
}
// Tomo de Talento: +1 punto de stats para repartir. Siempre a la venta; cada uno cuesta 25% más que el anterior
// (como los Libros de Talento del modo normal). Le da sentido al oro que sobra y ayuda a reponerse de una muerte.
const TOME = { base: 300, growth: 1.25 };
function towerTomePrice(hero) { return Math.round(TOME.base * Math.pow(TOME.growth, hero.tomesBought || 0)); }
function buyTowerTome(hero) {
    const price = towerTomePrice(hero);
    if (hero.gold < price) { log(`🛒 Te faltan ${price - hero.gold}g para el Tomo de Talento.`); return false; }
    hero.gold -= price; hero.tomesBought = (hero.tomesBought || 0) + 1; hero.statPoints++;
    log(`📘 Tomo de Talento: +1 punto de stats (C para repartir). El próximo cuesta ${towerTomePrice(hero)}g.`); sfx('levelup');
    return true;
}
function sellTowerItem(hero, item) {
    const price = towerSellPrice(item);
    hero.bag = hero.bag.filter(b => b.item !== item);
    hero.gold += price;
    log(`🛒 Vendiste ${item.name} (+${price}g).`); sfx('coin');
}
// B: abre o cierra la tienda si estás en el pueblo
function towerShopKey() {
    if (tshopOpen) { toggleTowerShop(false); return; }
    if (player && heroInTown(player)) toggleTowerShop(true);
    else log('🛒 El mercader está en el pueblo del piso (seguí el camino).');
}
function toggleTowerShop(open = !tshopOpen) {
    if (gameMode !== 'tower' || !player || !player.arena || !player.arena.town) return;
    tshopOpen = open;
    showPanel('tshop-container', open);
    if (open) { document.getElementById('tshop-tooltip').innerHTML = ''; renderTowerShop(); }
}
function renderTowerShop() {
    if (!tshopOpen) return;
    const level = player.arena, tip = document.getElementById('tshop-tooltip');
    document.getElementById('tshop-gold').textContent = `💰 ${player.gold}g`;
    const hover = item => { tip.innerHTML = item ? itemTooltipHtml(item) : '<span class="subtitle">Pasá el mouse por una pieza para ver sus detalles.</span>'; };
    const row = (item, label, price, can, act) => {
        const el = document.createElement('div'); el.className = 'tshop-row';
        el.innerHTML = `<img src="${towerItemIcon(item)}" class="ink-icon"><span class="tshop-name" style="color:${qColor(item)}">${item.name}</span>` +
            `<button class="${can ? 'primary-btn' : 'secondary-btn'}" ${can ? '' : 'disabled'}>${label} · ${price}g</button>`;
        el.onmouseenter = () => hover(item);
        el.querySelector('button').onclick = () => { act(); renderTowerShop(); };
        return el;
    };
    const stock = document.getElementById('tshop-stock'); stock.innerHTML = '';
    towerShopStock(level).forEach(item => stock.appendChild(row(item, 'Comprar', towerItemPrice(item), player.gold >= towerItemPrice(item), () => buyTowerItem(player, item))));
    if (!level.town.stock.length) stock.innerHTML = '<p class="subtitle">No le queda nada: vuelve a tener en el próximo piso.</p>';
    const tome = document.createElement('div'); tome.className = 'tshop-row';
    const tp = towerTomePrice(player);
    tome.innerHTML = `<span class="tshop-tome">📘</span><span class="tshop-name"><b>Tomo de Talento</b> · +1 punto de stats</span>` +
        `<button class="${player.gold >= tp ? 'primary-btn' : 'secondary-btn'}" ${player.gold >= tp ? '' : 'disabled'}>Comprar · ${tp}g</button>`;
    tome.onmouseenter = () => { tip.innerHTML = `<div class="tt-name">📘 Tomo de Talento</div><div>+1 punto de stats para repartir (tecla C). Siempre a la venta; cada uno cuesta 25% más que el anterior. Al morir cuenta como cualquier punto puesto (la mitad queda en tus restos).</div>`; };
    tome.querySelector('button').onclick = () => { buyTowerTome(player); renderTowerShop(); };
    stock.appendChild(tome);
    const bag = document.getElementById('tshop-bag'); bag.innerHTML = '';
    player.bag.forEach(b => bag.appendChild(row(b.item, 'Vender', towerSellPrice(b.item), true, () => sellTowerItem(player, b.item))));
    if (!player.bag.length) bag.innerHTML = '<p class="subtitle">La bolsa está vacía (lo equipado no se vende).</p>';
    if (!tip.innerHTML) hover(null);
}

// IA (piloto automático y mediciones): en el pueblo compra la mejor pieza que pueda pagar si mejora una ranura
// (vacía o de peor calidad) y vende lo que le sobra en la bolsa.
function aiTowerShop(hero) {
    const level = hero.arena;
    if (!level || !level.town || !heroInTown(hero) || level.town.aiShopped) return;
    level.town.aiShopped = true;
    const rank = { normal: 0, magic: 1, rare: 2 };
    aiManageGear(hero); // primero se pone lo que le sirve de la bolsa; el resto se vende
    hero.bag.slice().forEach(b => sellTowerItem(hero, b.item));
    towerShopStock(level).slice().sort((a, b) => rank[b.quality] - rank[a.quality]).forEach(item => {
        const slot = item.slot === 'ring' ? (!hero.gear.ring1 ? 'ring1' : 'ring2') : item.slot, cur = hero.gear[slot];
        if ((!cur || rank[item.quality] > rank[cur.quality]) && hero.gold >= towerItemPrice(item)) buyTowerItem(hero, item);
    });
    while (hero.gold >= towerTomePrice(hero) + 200) buyTowerTome(hero); // el resto en tomos (guarda un poco)
    aiManageGear(hero);
}

