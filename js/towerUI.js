// Tower Chaos: interfaz del equipo — inventario en grilla (tecla I), forja e íconos de las piezas (ver towerItems.js).
//
//   Inventario: clic en una pieza la levanta; clic en una casilla libre o en su ranura la suelta (o la equipa);
//   clic derecho equipa o desequipa. Mientras está abierto (o la forja, o los stats), la partida espera.

let invOpen = false, forgeOpen = false, invHeld = null;
function towerModalOpen() { return statsOpen || invOpen || forgeOpen; }

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
