// Interfaz: paneles de selección/draft/tienda, códice de héroes, HUD de stats y render del canvas.

const canvas = document.getElementById('ascii-canvas');
const ctx = canvas.getContext('2d');
const TILE = 26;
canvas.width = COLS * TILE; canvas.height = ROWS * TILE;

function setStateText(text) { document.getElementById('game-state-text').textContent = text; }
function showPanel(id, visible) { document.getElementById(id).style.display = visible ? 'block' : 'none'; }

// --- ELECCIÓN DE HÉROE (tus opciones + uno al azar, ver menu.js) ---
function renderHeroPick() {
    const container = document.getElementById('hero-options');
    container.innerHTML = '';
    heroOffers[0].forEach(t => {
        const card = document.createElement('div');
        card.className = 'skill-card';
        const scalingText = `Escalado: +${t.scaling.perKillsAmount} ${scalingStatLabel(t.scaling.stat)} cada ${t.scaling.perKills} bajas &middot; +${t.scaling.perHeroKill} al ganar un duelo.`;
        card.innerHTML = `<h4>[${t.symbol}] ${t.name} (${t.primaryAttr})</h4><p>${t.description}</p><p style="color:#ffb703; margin-top:4px;">${scalingText}</p>`;
        card.onclick = () => selectHero(t);
        container.appendChild(card);
    });
    const random = document.createElement('div');
    random.className = 'skill-card random-pick';
    random.innerHTML = `<h4>🎲 Héroe al azar</h4><p>Te toca uno que no está entre tus opciones. ¡Sorpresa!</p>`;
    random.onclick = () => selectHero(randomHeroPick());
    container.appendChild(random);
}

// --- CÓDICE DE HÉROES (referencia navegable, no afecta una partida en curso) ---
function renderHeroCodex() {
    const list = document.getElementById('codex-hero-list');
    list.innerHTML = '';
    Object.values(HERO_TEMPLATES).forEach(t => {
        const card = document.createElement('div');
        card.className = 'skill-card';
        card.innerHTML = `<h4>[${t.symbol}] ${t.name}</h4><p>${t.primaryAttr} &middot; ${t.description}</p>`;
        card.onclick = () => renderCodexDetail(t);
        list.appendChild(card);
    });
}

function renderCodexDetail(t) {
    const ref = new Hero(t); // instancia de referencia solo para calcular los stats de nivel 1 (sin ítems ni habilidades)
    const detail = document.getElementById('codex-detail');
    const natural = Object.values(HERO_SKILLS[t.key]);
    const statRows = [
        ['HP máx.', ref.maxHp], ['Maná máx.', ref.maxMana],
        ['Daño de ataque', ref.atk], ['Vel. de ataque', ref.atkSpeed.toFixed(2)],
        ['Rango de ataque', ref.attackRange], ['Vel. de proyectil', ref.projectileSpeed || 'Melé (instantáneo)'],
        ['Armadura física', ref.armor.toFixed(1)], ['Resistencia mágica', ref.magicResist.toFixed(1) + '%'],
        ['Regen. HP', ref.hpRegen.toFixed(2) + '/s'], ['Regen. Maná', ref.manaRegen.toFixed(2) + '/s'],
        ['Vel. de movimiento', ref.moveSpeed.toFixed(2)], ['Prob. de crítico', ref.critChance.toFixed(1) + '%'],
        ['Prob. de esquivar', ref.evasion + '%'], ['Amp. de hechizo', ref.spellAmp.toFixed(1) + '%'],
        ['Robo de vida', ref.lifesteal + '%'], ['Rol', t.role]
    ];
    let html = `<h3>[${t.symbol}] ${t.name} &mdash; ${t.primaryAttr}</h3><p style="color:#bbb;">${t.description}</p>`;
    const attrs = t.attributes, mark = a => t.primaryAttr === a.toUpperCase() ? ' ★' : '';
    html += `<div class="codex-sub">Atributos (base + ganancia por nivel; ★ = principal)</div>`;
    html += `<div class="stat-grid">${['str', 'agi', 'int'].map(a => `<div>${a.toUpperCase()}${mark(a)}: <strong>${attrs[a][0]} + ${attrs[a][1]}/nivel</strong></div>`).join('')}</div>`;
    html += `<div class="codex-sub">Stats en nivel 1 (sin ítems)</div>`;
    html += `<div class="stat-grid">${statRows.map(r => `<div>${r[0]}: <strong>${r[1]}</strong></div>`).join('')}</div>`;
    html += `<div class="codex-sub">Escalado del héroe</div>`;
    html += `<div class="ability-row"><p>+${t.scaling.perKillsAmount} ${scalingStatLabel(t.scaling.stat)} cada ${t.scaling.perKills} bajas de creeps &middot; +${t.scaling.perHeroKill} al ganar un duelo 1v1.</p></div>`;
    html += `<div class="codex-sub">Innato (siempre activo, no se draftea)</div>`;
    html += abilityRow(t.innate, true);
    html += `<div class="codex-sub">Habilidades naturales (4 niveles las normales, 3 la definitiva: niveles 6/12/18 del héroe)</div>`;
    html += natural.map(s => abilityRow(s, s.isUltimate)).join('');
    detail.innerHTML = html;
}

function tagChips(tags) {
    return (tags || []).map(tag => `<span class="tag" title="${TAGS[tag] || ''}">${tag}</span>`).join('');
}

// Fila del códice. Los innatos no tienen `values`: se muestran con su descripción tal cual.
function abilityRow(a, fixed) {
    const desc = a.values ? describeSkill(a, 0) : a.description;
    const meta = a.values ? `<p class="meta">${skillCostLine(a, 0)}</p>` : '';
    return `<div class="ability-row${fixed ? ' fixed' : ''}"><h4>${a.name}</h4><p>${desc}</p>${meta}<div class="tags">${tagChips(a.tags)}</div></div>`;
}

function stripHtml(html) { return html.replace(/<[^>]+>/g, ''); }

function showView(view) {
    document.getElementById('view-game').style.display = view === 'game' ? 'flex' : 'none';
    ['heroes', 'creeps', 'items'].forEach(v => { document.getElementById('view-' + v).style.display = view === v ? 'block' : 'none'; });
    ['game', 'heroes', 'creeps', 'items'].forEach(v => document.getElementById('nav-' + v).classList.toggle('active', view === v));
}

// --- CÓDICE DE CREEPS ---
function creepTag(t) { return `<span class="creep-symbol" style="color:${t.color}">${t.symbol}</span>`; }

// Mismo formato que el códice de ítems: nombre en el color del creep, descripción en blanco, secciones con botones
// para saltar: básicos, con mecánica, temas de oleada y jefes de ronda.
const CREEP_SECTION_COLORS = { basic: '#adb5bd', mechanic: '#c77dff', themes: '#8ecae6', bosses: '#ff0055' };

function creepNameHtml(t) { return `<span class="item-name" style="color:${t.color}">${t.label}</span>`; }

function creepStatLines(t, hpText) {
    const lines = [hpText || `${t.hp === 1 && t.oneHit ? 'Muere de un golpe' : `${t.hp} de vida`}${t.groupSize ? ` · aparecen de a ${t.groupSize}` : ''}`,
        `${t.atk} de daño ${t.attackType === 'magical' ? 'mágico' : 'físico'} · rango ${String(t.range).replace('.', ',')}`];
    const def = [t.armor ? `armadura ${t.armor}` : '', t.magicResist ? `${t.magicResist}% res. mágica` : '', t.evasion ? `${t.evasion}% evasión` : ''].filter(Boolean);
    if (def.length) lines.push(def.join(' · '));
    return `<ul class="item-stats">${lines.map(l => `<li>${l}</li>`).join('')}</ul>`;
}

function creepCard(t, extra = '', hpText) {
    return `<div class="item-card" style="border-left-color:${t.color}">` +
        `<div class="item-head"><span>${creepTag(t)} ${creepNameHtml(t)}</span>${t.gold ? `<span class="item-price">${t.gold}g</span>` : ''}</div>` +
        creepStatLines(t, hpText) + `<p class="item-text">${t.mechanic}</p>` + extra + `</div>`;
}

function counterHtml(t) {
    if (!t.counter || t.counter === '—') return '';
    return `<p class="item-meta">Contra: <span class="item-counter">${t.counter}</span>${t.counterItem ? ` → ${itemNameHtml(ITEMS[t.counterItem])}` : ''}</p>`;
}

function renderCreepCodex() {
    const grid = cards => `<div class="item-grid">${cards.join('')}</div>`;
    const types = Object.values(CREEP_TYPES);
    const withExtra = t => creepCard(t, counterHtml(t) + (t.bossable ? '<p class="item-meta">Puede ser el jefe de una oleada.</p>' : ''));
    const basics = grid(types.filter(t => t.basic).map(withExtra));
    const mechanics = grid(types.filter(t => !t.basic).map(withExtra));
    const last = WAVE_THEMES.length - 1;
    const themes = WAVE_THEMES.map((tier, i) => `<h4 class="item-group" style="color:${CREEP_SECTION_COLORS.themes}">Ronda ${i + 1}${i === last ? ' en adelante' : ''}</h4>` +
        grid(tier.map(th => {
            const boss = CREEP_TYPES[th.boss];
            const rows = waveSummary(th).map(({ type, count }) => `<li>${creepTag(type)} ${creepNameHtml(type)} ×${count}</li>`).join('');
            return `<div class="item-card" style="border-left-color:${CREEP_SECTION_COLORS.themes}"><div class="item-head"><span class="item-name" style="color:#fff">${th.name}</span></div>` +
                `<ul class="item-stats creep-list">${rows}</ul><p class="item-meta">Jefe de la oleada: ${creepNameHtml(boss)}</p></div>`;
        }))).join('');
    const bosses = grid(ROUND_BOSSES.map((b, i) => creepCard(b,
        `<p class="item-meta">Ronda ${(i + 1) * ROUND_BOSS_EVERY} · premio: ${BOSS_FIGHT.gold[i]}g para todos + objeto neutral del escalón ${i + 1}</p>`,
        `${b.hpPerHero} de vida por cada héroe que pelea`)));

    const sections = [
        ['creeps-basic', 'Básicos', CREEP_SECTION_COLORS.basic, 'Sin mecánicas especiales: aparecen en todas las oleadas.', basics],
        ['creeps-mechanic', 'Con mecánica', CREEP_SECTION_COLORS.mechanic, 'Cada uno tiene algo especial y una forma de contrarrestarlo (mirá el aviso de oleada en la tienda).', mechanics],
        ['creeps-themes', 'Temas de oleada', CREEP_SECTION_COLORS.themes,
            'Cada ronda sortea uno de su nivel. Todas las oleadas traen además un jefe: 4 veces más vida, +2 de armadura y un aura que potencia a los creeps cercanos. Los creeps se hacen más fuertes en cada ronda.', themes],
        ['creeps-bosses', 'Jefes de ronda', CREEP_SECTION_COLORS.bosses,
            `Cada ${ROUND_BOSS_EVERY} rondas, después de los duelos, todos los héroes contra uno. Morir no cuesta vidas (revivís en ${BOSS_FIGHT.respawn}s). Si cae en ${BOSS_FIGHT.time}s, todos cobran y eligen un objeto neutral; los 3 que más daño hicieron cobran extra.`, bosses]
    ];
    const codex = document.getElementById('creep-codex');
    codex.innerHTML = `<h3>Creeps y Jefes</h3><p class="subtitle">El número a la derecha es el oro que dan (hasta ×3 si los matás rápido).</p>` +
        `<div class="item-jump">${sections.map(([id, title, color]) => `<button data-target="${id}" style="color:${color}; border-color:${color}">${title}</button>`).join('')}</div>` +
        sections.map(sec => itemSection(...sec)).join('');
    codex.querySelectorAll('.item-jump button').forEach(btn => { btn.onclick = () => document.getElementById(btn.dataset.target).scrollIntoView({ behavior: 'smooth' }); });
}

// Aviso de la próxima oleada en la tienda: qué creeps vienen, qué hacen y cómo contrarrestarlos.
function renderWavePreview() {
    const el = document.getElementById('wave-preview');
    if (!nextWave) { el.innerHTML = ''; return; }
    const title = `Próxima oleada · ronda ${waveNumber}`;
    const rows = waveSummary(nextWave).map(({ type, count }) => {
        const counter = type.counterItem ? ` → <span class="counter-item">${ITEMS[type.counterItem].name}</span>` : '';
        return `<div class="preview-row">${creepTag(type)} <strong>${type.label} x${count}</strong>: ${type.mechanic}${type.counter !== '—' ? ` <em>Contra: ${type.counter}${counter}</em>` : ''}</div>`;
    }).join('');
    el.innerHTML = `<h3>🔭 ${title}: ${nextWave.name}</h3>${rows}<div class="preview-row">${creepTag(CREEP_TYPES[nextWave.boss])} <strong>Jefe: ${CREEP_TYPES[nextWave.boss].label}</strong></div>` +
        (isRoundBossRound() ? `<div class="preview-row">${creepTag(roundBossOf())} <strong>Después de los duelos, jefe de ronda: ${roundBossOf().label}</strong>. ${roundBossOf().mechanic}</div>` : '');
}

// --- DRAFT Y TIENDA ---
const DRAFT_TITLES = {
    normal: ['Draft de Habilidades', 'Elegí una habilidad (★ = natural de tu héroe). Llega en nivel 0.'],
    fragment: ['Fragmento del Destino', 'Elegí 1 de estas 4 habilidades para reemplazar la que perdiste.'],
    book: ['Libro del Destino', 'Elegí 1 de estas 6 habilidades para reemplazar la que cambiaste.']
};

function skillCardHtml(s) {
    const natural = s.heroKey === player.key;
    const type = s.isUltimate ? 'Definitiva' : s.kind === 'passive' ? 'Pasiva' : 'Activa';
    return `<h4>${s.name}</h4>` +
        `<p class="meta"><span class="${natural ? 'natural' : ''}">${natural ? '★ Natural' : 'De ' + naturalHeroName(s)}</span> &middot; ${type} &middot; ${skillCostLine(s, 0)}</p>` +
        `<p>${describeSkill(s, 0)}</p><div class="tags">${tagChips(s.tags)}</div>`;
}

function renderDraft(options, mode) {
    const [title, subtitle] = DRAFT_TITLES[mode];
    document.getElementById('draft-title').textContent = title;
    document.getElementById('draft-subtitle').textContent = subtitle;
    const c = document.getElementById('draft-options'); c.innerHTML = '';
    options.forEach(s => {
        const card = document.createElement('div');
        card.className = 'skill-card' + (s.isUltimate ? ' ult' : '');
        card.innerHTML = skillCardHtml(s);
        card.onclick = () => learnSkill(s);
        c.appendChild(card);
    });
}

// Libro del Destino, paso 1: elegir qué habilidad del kit cambiar.
function renderBookChoice() {
    document.getElementById('draft-title').textContent = 'Libro del Destino';
    document.getElementById('draft-subtitle').textContent = '¿Qué habilidad querés cambiar? Recuperás sus puntos y elegís entre 6 nuevas.';
    const c = document.getElementById('draft-options'); c.innerHTML = '';
    player.skills.forEach(s => {
        const card = document.createElement('div');
        card.className = 'skill-card' + (s.isUltimate ? ' ult' : '');
        card.innerHTML = `<h4>${s.name} (nivel ${skillLevel(player, s)})</h4><p>${describeSkill(s, skillLevel(player, s))}</p>`;
        card.onclick = () => useBookOn(s);
        c.appendChild(card);
    });
}

// --- TIENDA ---
const SHOP_TABS = { basic: 'Básicos', composite: 'Compuestos', other: 'Otros' };
let shopTab = 'composite';

// Receta de un compuesto: cada componente con ✓ si ya lo tenés, más el precio de la receta.
function recipeHtml(item, hero) {
    const { used } = hero ? recipeStatus(hero, item) : { used: [] };
    const pool = used.slice();
    const parts = item.components.map(k => {
        const has = pool.includes(k); if (has) pool.splice(pool.indexOf(k), 1);
        return has ? `<span class="has">✓ ${ITEMS[k].name}</span>` : itemNameHtml(ITEMS[k]);
    });
    return `<p class="meta recipe">${parts.join(' + ')} + receta ${item.recipe}g</p>`;
}

function shopCard(item) {
    const blocker = itemBlocker(item, player);
    const cost = itemCost(item, player);
    const card = document.createElement('div');
    card.className = 'skill-card' + (blocker || player.gold < cost ? ' disabled' : '');
    const owned = isEquip(item) ? countItem(player, item.key) : 0;
    const total = item.tier === 'composite' && cost !== itemTotalCost(item) ? ` <span class="item-level">(total ${itemTotalCost(item)}g)</span>` : '';
    card.innerHTML = `<h4>${itemNameHtml(item)} (${cost}g)${total}${owned ? ` <span class="item-level">tenés ${owned}</span>` : ''}</h4>` +
        `<p>${describeItem(item)}</p>` +
        (item.tier === 'composite' ? recipeHtml(item, player) : '') +
        (item.counters ? `<p class="meta">Contra: ${item.counters}</p>` : '') +
        (blocker ? `<p class="meta">${blocker}</p>` : '');
    card.onclick = () => buyItem(item);
    return card;
}

function renderShop() {
    renderWavePreview();
    const tabs = document.getElementById('shop-tabs'); tabs.innerHTML = '';
    Object.entries(SHOP_TABS).forEach(([key, label]) => {
        const btn = document.createElement('button');
        btn.textContent = label; btn.className = shopTab === key ? 'active' : '';
        btn.onclick = () => { shopTab = key; renderShop(); };
        tabs.appendChild(btn);
    });
    const c = document.getElementById('shop-options'); c.innerHTML = '';
    const heading = text => { const d = document.createElement('div'); d.className = 'shop-category'; d.textContent = text; c.appendChild(d); };
    const all = Object.values(ITEMS);
    if (shopTab === 'basic') all.filter(i => i.tier === 'basic').forEach(i => c.appendChild(shopCard(i)));
    if (shopTab === 'composite') ITEM_GROUPS.forEach(group => {
        heading(group);
        all.filter(i => i.tier === 'composite' && i.group === group).forEach(i => c.appendChild(shopCard(i)));
    });
    if (shopTab === 'other') all.filter(i => !isEquip(i) && itemAvailable(i, player)).forEach(i => c.appendChild(shopCard(i)));
    renderInventoryPanel();
    renderNeutralPanel();
    renderDestinyPanel();
}

// Objeto neutral: el equipado (con botón para venderlo) y, después de un jefe de ronda, los 3 para elegir.
function renderNeutralPanel() {
    const panel = document.getElementById('inventory-panel');
    const title = document.createElement('div'); title.className = 'shop-category'; title.textContent = '🎁 Objeto neutral (solo uno)';
    panel.appendChild(title);
    const row = document.createElement('div'); row.className = 'destiny-row';
    if (player.neutral) {
        const n = NEUTRAL_ITEMS[player.neutral];
        row.innerHTML = `<span>${n.name} <span class="item-level">escalón ${n.tier}</span><br><small>${describeNeutral(n)}</small></span>`;
        const sell = document.createElement('button'); sell.textContent = `Vender (${neutralSellPrice(n.key)}g)`; sell.onclick = () => sellNeutral(player);
        row.appendChild(sell);
    } else row.innerHTML = `<span>Ninguno. Se ganan derrotando al jefe de ronda (cada ${ROUND_BOSS_EVERY} rondas).</span>`;
    panel.appendChild(row);
    if (!player.neutralOffer) return;
    const offer = document.createElement('div'); offer.className = 'neutral-offer';
    offer.innerHTML = `<p class="subtitle">Premio del jefe: elegí uno${player.neutral ? ' (el tuyo se vende solo)' : ''}.</p>`;
    player.neutralOffer.forEach(key => {
        const n = NEUTRAL_ITEMS[key];
        const card = document.createElement('div'); card.className = 'skill-card';
        card.innerHTML = `<h4>${n.name}</h4><p>${describeNeutral(n)}</p><p class="meta">Le sirve a: ${n.fits.join(', ')}</p>`;
        card.onclick = () => equipNeutral(player, key);
        offer.appendChild(card);
    });
    const keep = document.createElement('button'); keep.textContent = player.neutral ? 'Me quedo con el mío' : 'No quiero ninguno';
    keep.onclick = () => declineNeutral(player);
    offer.appendChild(keep);
    panel.appendChild(offer);
}

// Inventario en la tienda: cada ítem con un botón para venderlo.
function renderInventoryPanel() {
    const panel = document.getElementById('inventory-panel'); panel.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'shop-category';
    title.textContent = `🎒 Inventario (${player.inventory.length}/${INVENTORY_SLOTS})`;
    panel.appendChild(title);
    player.inventory.forEach(inv => {
        const item = ITEMS[inv.key];
        const row = document.createElement('div'); row.className = 'destiny-row';
        row.innerHTML = `<span>${item.name}${item.tier === 'basic' ? ' <span class="item-level">básico</span>' : ''}</span>`;
        const sell = document.createElement('button');
        sell.textContent = `Vender (${Math.floor(itemTotalCost(item) * SELL_REFUND)}g)`;
        sell.onclick = () => sellItem(inv.key);
        row.appendChild(sell);
        panel.appendChild(row);
    });
}

// --- CÓDICE DE ÍTEMS ---
// El nombre de cada ítem va en el color de su categoría; la descripción, en blanco. Secciones: básicos, mejoras
// (compuestos, por grupo), neutrales (por escalón) y especiales.
const ITEM_COLORS = {
    basic: '#9ecbff', composite: '#ffb703', special: '#e0aaff',
    neutral: ['#95d5b2', '#48cae4', '#c77dff', '#ff7b00'] // escalones 1 a 4
};
function isNeutral(item) { return NEUTRAL_ITEMS[item.key] === item; }
function itemColor(item) {
    if (isNeutral(item)) return ITEM_COLORS.neutral[item.tier - 1];
    return ITEM_COLORS[item.tier] || ITEM_COLORS.special;
}
function itemNameHtml(item) { return `<span class="item-name" style="color:${itemColor(item)}">${item.name}</span>`; }

function itemCard(item, price, extra = '') {
    const stats = Object.entries(item.mods || {}).map(([k, v]) => `<li>${MOD_LABELS[k] ? MOD_LABELS[k](v) : `${k} ${v}`}</li>`).join('');
    return `<div class="item-card" style="border-left-color:${itemColor(item)}">` +
        `<div class="item-head">${itemNameHtml(item)}<span class="item-price">${price}</span></div>` +
        (stats ? `<ul class="item-stats">${stats}</ul>` : '') +
        (item.special ? `<p class="item-text">★ ${item.special}</p>` : '') +
        (item.desc ? `<p class="item-text">${item.desc}</p>` : '') + extra + `</div>`;
}
function itemSection(id, title, color, note, body) {
    return `<section id="${id}" class="item-section"><h3 style="color:${color}">${title}</h3><p class="subtitle">${note}</p>${body}</section>`;
}

function renderItemCodex() {
    const all = Object.values(ITEMS);
    const grid = cards => `<div class="item-grid">${cards.join('')}</div>`;
    const basics = grid(all.filter(i => i.tier === 'basic').map(i => {
        const usedIn = all.filter(c => c.tier === 'composite' && c.components.includes(i.key));
        return itemCard(i, `${i.cost}g`, usedIn.length ? `<p class="item-meta">Se usa en: ${usedIn.map(itemNameHtml).join(', ')}</p>` : '');
    }));
    const composites = ITEM_GROUPS.map(group => `<h4 class="item-group">${group}</h4>` + grid(all.filter(i => i.tier === 'composite' && i.group === group).map(i =>
        itemCard(i, `${itemTotalCost(i)}g`,
            `<p class="item-meta">Receta: ${i.components.map(k => itemNameHtml(ITEMS[k])).join(' + ')} + ${i.recipe}g</p>` +
            (i.counters ? `<p class="item-meta">Contra: <span class="item-counter">${i.counters}</span></p>` : ''))))).join('');
    const neutrals = [1, 2, 3, 4].map(tier => `<h4 class="item-group" style="color:${ITEM_COLORS.neutral[tier - 1]}">Escalón ${tier} · jefe de la ronda ${tier * ROUND_BOSS_EVERY}</h4>` +
        grid(Object.values(NEUTRAL_ITEMS).filter(n => n.tier === tier).map(n =>
            itemCard(n, `vende ${neutralSellPrice(n.key)}g`, `<p class="item-meta">Le sirve a: ${n.fits.join(', ')}</p>`)))).join('');
    const specials = grid(all.filter(i => !isEquip(i)).map(i => itemCard(i, typeof i.cost === 'function' ? `desde ${GREED.baseCost}g` : `${i.cost}g`)));

    const sections = [
        ['items-basic', 'Básicos', ITEM_COLORS.basic, 'Mejoran un solo stat y se pueden repetir. Son los componentes de las mejoras.', basics],
        ['items-composite', 'Mejoras (compuestos)', ITEM_COLORS.composite, 'Se arman con básicos + una receta. Si ya tenés los básicos, pagás solo lo que falta. No se repiten.', composites],
        ['items-neutral', 'Objetos neutrales', ITEM_COLORS.neutral[2], `Premio de los jefes de ronda: elegís 1 de 3. Van en un espacio aparte y solo podés tener uno.`, neutrals],
        ['items-special', 'Especiales', ITEM_COLORS.special, 'No ocupan espacio: se usan al comprarlos.', specials]
    ];
    const codex = document.getElementById('item-codex');
    codex.innerHTML = `<h3>Ítems</h3><p class="subtitle">Inventario: ${INVENTORY_SLOTS} espacios (+1 para el neutral). Vender devuelve el ${SELL_REFUND * 100}%.</p>` +
        `<div class="item-jump">${sections.map(([id, title, color]) => `<button data-target="${id}" style="color:${color}; border-color:${color}">${title}</button>`).join('')}</div>` +
        sections.map(sec => itemSection(...sec)).join('');
    codex.querySelectorAll('.item-jump button').forEach(btn => { btn.onclick = () => document.getElementById(btn.dataset.target).scrollIntoView({ behavior: 'smooth' }); });
}

// Inventario de objetos del destino (solo se usan fuera de las oleadas).
function renderDestinyPanel() {
    const panel = document.getElementById('destiny-panel'); panel.innerHTML = '';
    const { fragments, books } = player.destiny;
    if (fragments > 0) {
        const row = document.createElement('div'); row.className = 'destiny-row';
        row.innerHTML = `<span>🔮 Fragmentos del Destino: ${fragments}</span>`;
        const use = document.createElement('button'); use.textContent = 'Usar'; use.onclick = useFragment;
        const sell = document.createElement('button'); sell.textContent = `Vender (${FRAGMENT_SELL_PRICE}g)`; sell.onclick = sellFragment;
        use.disabled = !player.skills.length;
        row.append(use, sell); panel.appendChild(row);
    }
    if (books > 0) {
        const row = document.createElement('div'); row.className = 'destiny-row';
        row.innerHTML = `<span>📖 Libros del Destino: ${books}</span>`;
        const use = document.createElement('button'); use.textContent = 'Usar'; use.onclick = useBook;
        use.disabled = !player.skills.length;
        row.appendChild(use); panel.appendChild(row);
    }
}

// --- PREVIA DE DUELOS (apuestas, ver bets.js) ---
function betHeroHtml(h) {
    const lives = '♥'.repeat(Math.max(0, h.lives)) + (isCondemned(h) ? '☠' : '');
    return `<span class="bet-name">${h.symbol} ${h.displayName}</span>` +
        `<span class="bet-stats">${heroRank(h)}º · ${h.points} pts · niv ${h.level} · ${lives} · duelos ${h.duelWins}-${h.duelLosses}</span>`;
}

function renderBetting() {
    const mine = duelPlan.pairs.find(p => p.includes(player));
    const rival = mine ? mine.find(h => h !== player) : null;
    document.getElementById('bet-info').innerHTML = (rival ? `Tu duelo: contra <strong>${rival.displayName}</strong>. ` : 'Esta ronda no peleás. ') +
        (currentBet ? `Apostaste <strong>${currentBet.amount}g</strong> a ${currentBet.on.displayName}.`
                    : `Apostá a un duelo ajeno: si acertás, cobrás el doble. Tope: <strong>${betLimit()}g</strong> (${BET_MAX_PCT * 100}% de tu oro).`);
    const list = document.getElementById('bet-pairs'); list.innerHTML = '';
    if (!currentBet) {
        const row = document.createElement('div'); row.className = 'bet-amount';
        row.innerHTML = `<label>Monto: <input id="bet-amount" type="number" min="1" max="${betLimit()}" value="${betLimit()}"> g</label>`;
        list.appendChild(row);
    }
    bettablePairs().forEach(pair => {
        const box = document.createElement('div'); box.className = 'bet-pair';
        pair.forEach((h, i) => {
            const side = document.createElement('div'); side.className = 'bet-side' + (currentBet && currentBet.on === h ? ' chosen' : '');
            side.innerHTML = betHeroHtml(h);
            if (!currentBet) {
                const btn = document.createElement('button'); btn.textContent = 'Apostar';
                btn.onclick = () => placeBet(h, Number(document.getElementById('bet-amount').value));
                side.appendChild(btn);
            }
            box.appendChild(side);
            if (i === 0) { const vs = document.createElement('div'); vs.className = 'bet-vs'; vs.textContent = 'vs'; box.appendChild(vs); }
        });
        list.appendChild(box);
    });
}

// --- KIT (nivel, experiencia, puntos y habilidades) ---
let lastKitSignature = '';

// Se redibuja solo cuando cambia algo (nivel, puntos, habilidades), para no romper los clics en cada frame.
function renderKit() {
    document.getElementById('kit-panel').style.display = 'flex';
    document.getElementById('xp-fill').style.width = `${Math.min(100, player.xp / xpToNext(player.level) * 100)}%`;
    const signature = [player.level, player.skillPoints, ...player.skills.map(s => s.id + ':' + skillLevel(player, s) + ':' + player.keyBindings[s.id])].join('|');
    if (signature === lastKitSignature) return;
    lastKitSignature = signature;

    document.getElementById('level-line').innerHTML = `<strong>Nivel ${player.level}</strong>` +
        (player.skillPoints > 0 ? ` &middot; <span class="points">${player.skillPoints} punto${player.skillPoints > 1 ? 's' : ''} de habilidad</span>` : '');

    const active = document.getElementById('kit-active'); active.innerHTML = '';
    player.skills.filter(s => s.kind === 'active').forEach(s => {
        const lvl = skillLevel(player, s), max = maxSkillLevel(s), blocker = levelUpBlocker(player, s);
        const row = document.createElement('div');
        row.className = 'kit-row' + (lvl === 0 ? ' locked' : '') + (s.isUltimate ? ' ult' : '');
        row.title = `${s.name}\n${stripHtml(skillCostLine(s, lvl))}\n${stripHtml(describeSkill(s, lvl))}`;
        const pips = Array.from({ length: max }, (_, i) => i < lvl ? '■' : '<span class="off">□</span>').join('');
        row.innerHTML = `<span class="key">[${(player.keyBindings[s.id] || '—').toUpperCase()}]</span><span class="name">${s.name}</span><span class="pips">${pips}</span>`;
        const btn = document.createElement('button');
        btn.textContent = '+'; btn.disabled = !!blocker; btn.title = blocker || 'Subir de nivel';
        btn.onclick = e => { e.stopPropagation(); levelUpSkill(player, s); renderKit(); };
        row.appendChild(btn);
        active.appendChild(row);
    });
    for (let i = player.skills.length; i < KIT_SIZE; i++) {
        const row = document.createElement('div'); row.className = 'kit-row empty';
        row.textContent = '— espacio libre (se llena en el draft) —';
        active.appendChild(row);
    }

    // Innato y pasivas: recuadros chicos siempre visibles. Las pasivas drafteadas también se suben con [+].
    const passive = document.getElementById('kit-passive'); passive.innerHTML = '';
    const boxes = [{ a: player.innate, innate: true }, ...player.skills.filter(s => s.kind === 'passive').map(a => ({ a }))];
    boxes.forEach(({ a, innate }) => {
        if (!a) return;
        const box = document.createElement('div'); box.className = 'passive-box';
        const lvl = innate ? null : skillLevel(player, a);
        box.innerHTML = `<h5>${innate ? 'Innato: ' : ''}${a.name}${innate ? '' : ` (nv ${lvl}/${maxSkillLevel(a)})`}</h5><div>${innate ? a.description : describeSkill(a, lvl)}</div>`;
        if (!innate) {
            const btn = document.createElement('button');
            btn.textContent = '+'; btn.disabled = !!levelUpBlocker(player, a);
            btn.onclick = () => { levelUpSkill(player, a); renderKit(); };
            box.appendChild(btn);
        }
        passive.appendChild(box);
    });
}

// --- HUD ---
function renderCooldownBar() {
    const bar = document.getElementById('cooldown-bar'); bar.innerHTML = '';
    player.skills.filter(s => s.kind === 'active').forEach(s => {
        const remaining = Math.max(0, (player.cooldowns[s.id] || 0));
        const locked = skillLevel(player, s) === 0;
        const span = document.createElement('span');
        span.className = !locked && remaining <= 0 ? 'ready' : '';
        const key = player.keyBindings[s.id];
        span.textContent = `[${key ? key.toUpperCase() : '—'}] ${s.name}: ${locked ? 'Nivel 0' : remaining <= 0 ? 'Listo' : remaining.toFixed(1) + 's'}`;
        bar.appendChild(span);
    });
    // Efectos activos sobre el jugador (mejoras propias, invulnerabilidad al reaparecer...)
    activeEffects(player).filter(e => !e.flags.includes('item')).forEach(e => {
        const span = document.createElement('span');
        span.className = 'effect';
        span.textContent = `✦ ${e.name}${isFinite(e.until) ? ' ' + (e.until - gameClock).toFixed(1) + 's' : ''}`;
        bar.appendChild(span);
    });
}

function updateHud() {
    if (!player) return;
    document.getElementById('player-name').textContent = player.name;
    document.getElementById('player-hp').textContent = `${Math.round(player.hp)}/${player.maxHp}`;
    document.getElementById('player-mana').textContent = `${Math.round(player.mana)}/${player.maxMana}`;
    document.getElementById('player-gold').textContent = player.gold;
    document.getElementById('round-num').textContent = `${waveNumber}/${MAX_ROUNDS}${isRoundBossRound() ? ' (JEFE)' : ''}`;
    renderScoreboard();
    document.getElementById('stat-str').textContent = Math.floor(player.attr('str'));
    document.getElementById('stat-agi').textContent = Math.floor(player.attr('agi'));
    document.getElementById('stat-int').textContent = Math.floor(player.attr('int'));
    document.getElementById('inventory-line').textContent = player.inventory.length
        ? '🎒 ' + player.inventory.map(inv => ITEMS[inv.key].name).join(' · ') : '';
    document.getElementById('stat-armor').textContent = player.armor.toFixed(1);
    document.getElementById('extra-stats').textContent =
        `RM: ${player.magicResist.toFixed(0)}% | Crít: ${player.critChance.toFixed(1)}% | Evasión: ${player.evasion.toFixed(1)}% | ` +
        `Amp.Hechizo: ${player.spellAmp.toFixed(1)}% | Robo Vida: ${player.lifesteal.toFixed(1)}% | Regen: ${player.hpRegen.toFixed(1)} HP/s, ${player.manaRegen.toFixed(1)} Maná/s | ` +
        `Vel.Mov: ${player.moveSpeed.toFixed(1)}${player.projectileSpeed > 0 ? ` | Vel.Proyectil: ${player.projectileSpeed.toFixed(1)}` : ''}`;
    document.getElementById('lives-text').textContent = '♥'.repeat(Math.max(0, player.lives)) + '♡'.repeat(Math.max(0, 2 - player.lives)) +
        (isCondemned(player) ? ` ☠ Condenado +${Math.round(player.condemnPct * 100)}%` : '');
    renderKit();
    if (player.scaling) {
        const bonusSoFar = player.bonus[player.scaling.stat] || 0;
        const toNext = player.scaling.perKills - (player.creepKillCount % player.scaling.perKills);
        document.getElementById('scaling-info').textContent = `Escalado: +${bonusSoFar.toFixed(1)} ${scalingStatLabel(player.scaling.stat)} acumulado (${player.creepKillCount} bajas, próximo bonus en ${toNext})`;
    }
    if (inCombat()) renderCooldownBar();
}

// Temporizador de la fase actual (o de la oleada / reaparición) al lado del estado.
function renderTimer() {
    const el = document.getElementById('phase-timer');
    let text = '', cls = '';
    if (['HERO_SELECT', 'DRAFT', 'PREP', 'BETTING'].includes(gameState)) {
        text = `⏱ ${Math.max(0, Math.ceil(phaseTimeLeft))}s`;
        if (phaseTimeLeft <= 5) cls = 'urgent';
    } else if (inCombat() && player) {
        const hero = viewedHero || player, arena = hero.arena;
        const waiting = arenas.filter(a => !a.done).length;
        if (hero.inRest || !arena || arena.done) { text = `🏕 Descansando · ${waiting} ${gameState === 'DUEL' ? 'duelo' : 'arena'}${waiting === 1 ? '' : 's'} en curso`; }
        else if (arena.kind === 'duel') { const left = DUEL_TIME - arena.elapsed; text = `⚔ Duelo ${Math.max(0, Math.ceil(left))}s`; if (left <= 5) cls = 'urgent'; }
        else if (!hero.isAlive() && hero.respawnAt) { text = `☠ Revive en ${Math.max(0, hero.respawnAt - gameClock).toFixed(1)}s`; cls = 'urgent'; }
        else if (arena.kind === 'boss') { const left = BOSS_FIGHT.time - arena.elapsed; text = `👹 Jefe ${Math.max(0, Math.ceil(left))}s · tu daño ${hero.bossDamage}`; if (left <= 10) cls = 'urgent'; }
        else if (waveTimeLeft(arena) > 0) { text = `⏱ ${Math.ceil(waveTimeLeft(arena))}s`; if (waveTimeLeft(arena) <= 5) cls = 'urgent'; }
        else { text = `🔥 Creeps enfurecidos +${Math.round((enrageMult(arena) - 1) * 100)}%`; cls = 'urgent'; }
    }
    el.textContent = text;
    el.className = cls;
}

// --- RANKING ---
// Tabla con los 8 héroes: puesto, vidas, puntos, oro y dónde está. Un clic en un héroe muestra su arena.
let lastScoreboardSignature = '';
function heroStatusIcon(h) {
    if (h.eliminated) return '💀';
    if (h.inRest) return '🏕';
    if (!h.isAlive()) return '☠';
    return inCombat() ? '⚔' : '🏕';
}
function renderScoreboard() {
    const ranked = rankedHeroes();
    const signature = ranked.map(h => [h.displayName, h.points, h.gold, h.lives, heroStatusIcon(h), isCondemned(h)].join(':')).join('|') + (viewedHero ? viewedHero.displayName : '');
    if (signature === lastScoreboardSignature) return;
    lastScoreboardSignature = signature;
    const board = document.getElementById('scoreboard'); board.innerHTML = '';
    ranked.forEach((h, i) => {
        const row = document.createElement('div');
        row.className = 'score-row' + (h === player ? ' you' : '') + (h === (viewedHero || player) ? ' viewed' : '') + (h.eliminated ? ' out' : '');
        const lives = h.eliminated ? '' : '♥'.repeat(Math.max(0, h.lives)) + (isCondemned(h) ? '☠' : '');
        row.innerHTML = `<span class="pos">${i + 1}º</span><span class="sym">${h.symbol}</span><span class="name">${h.displayName}</span>` +
            `<span class="lives">${lives}</span><span class="pts">${h.points} pts</span><span class="gold">${h.gold}g</span><span class="st">${heroStatusIcon(h)}</span>`;
        row.title = h === player ? 'Vos' : 'Clic para mirar su arena';
        row.onclick = () => { viewedHero = h; lastScoreboardSignature = ''; };
        board.appendChild(row);
    });
}

// Deja la interfaz como al abrir el juego (usado por "Nueva Partida").
function resetHud() {
    ['draft-container', 'shop-container', 'bet-container', 'restart-btn', 'hero-select-panel'].forEach(id => showPanel(id, false));
    showPanel('menu-panel', true);
    setStateText('MENÚ');
    document.getElementById('player-name').textContent = 'Ninguno';
    document.getElementById('round-num').textContent = '1';
    document.getElementById('scoreboard').innerHTML = ''; lastScoreboardSignature = '';
    ['cooldown-bar', 'combat-log'].forEach(id => document.getElementById(id).innerHTML = '');
    ['scaling-info', 'extra-stats'].forEach(id => document.getElementById(id).textContent = '');
    document.getElementById('kit-panel').style.display = 'none';
    lastKitSignature = '';
}

// --- RENDER DEL CANVAS ---
// Dibuja una unidad: símbolo (con brillo si es héroe o jefe), destello blanco al recibir daño, barra de vida
// (y de maná en los héroes) y marcas de estado (aturdido, ralentizado). pos: posición dibujada (ver drawPos en fx.js).
function drawUnit(u, color, symbol, pos = u, opts = {}) {
    const cx = pos.x * TILE + TILE / 2, cy = pos.y * TILE + TILE / 2;
    const hit = u.fxHitAt !== undefined && fxClock - u.fxHitAt < 0.12;
    if (opts.glow) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
    ctx.font = opts.big ? 'bold 26px monospace' : opts.glow ? 'bold 19px monospace' : '18px monospace';
    ctx.fillStyle = hit ? '#ffffff' : color; ctx.fillText(symbol, cx, cy + 1);
    ctx.shadowBlur = 0;
    if (u.maxHp) {
        const pct = Math.max(0, u.hp / u.maxHp), w = TILE - 4, top = cy - TILE / 2 - 1;
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(cx - w / 2 - 1, top - 1, w + 2, 5);
        ctx.fillStyle = pct > 0.5 ? '#2dc653' : pct > 0.25 ? '#ffb703' : '#ff0055';
        ctx.fillRect(cx - w / 2, top, w * pct, 3);
        if (u.isHero && u.maxMana) { ctx.fillStyle = '#4895ef'; ctx.fillRect(cx - w / 2, top + 4, w * Math.max(0, u.mana / u.maxMana), 2); }
    }
    if (u.effects && u.effects.length) {
        ctx.font = '10px monospace';
        if (hasFlag(u, 'stun')) { ctx.fillStyle = '#ffd166'; ctx.fillText('✦✦', cx, cy - TILE / 2 - 7 + Math.sin(fxClock * 10) * 1.5); }
        else if (sumMod(u, 'moveSpeedPct') < 0) { ctx.fillStyle = '#90e0ef'; ctx.fillText('❄', cx + TILE / 2 - 3, cy - TILE / 2 + 6); }
    }
}

// Área de Descanso: un claro tranquilo con una fuente y fogatas donde los héroes esperan entre combates.
function heroColor(h) { return h === player ? '#00f5d4' : '#ffb703'; }

function renderRestArea() {
    ctx.fillStyle = '#07140d'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f2418';
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) ctx.strokeRect(c * TILE, r * TILE, TILE, TILE);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '14px monospace'; ctx.fillStyle = '#2d6a4f';
    [[2, 2], [17, 2], [2, 10], [17, 10], [5, 5], [15, 8]].forEach(([x, y]) => ctx.fillText('♣', x * TILE + TILE / 2, y * TILE + TILE / 2));
    ctx.font = '22px monospace'; ctx.fillStyle = '#48cae4';
    ctx.fillText('≈', REST_SPOT.x * TILE + TILE / 2, (REST_SPOT.y - 3) * TILE + TILE / 2);
    ctx.fillStyle = '#fb8500';
    [[REST_SPOT.x - 5, REST_SPOT.y], [REST_SPOT.x + 5, REST_SPOT.y]].forEach(([x, y]) => ctx.fillText('♨', x * TILE + TILE / 2, y * TILE + TILE / 2));
    ctx.font = 'bold 16px monospace'; ctx.fillStyle = '#95d5b2';
    ctx.fillText('ÁREA DE DESCANSO', canvas.width / 2, TILE * 0.8);
    ctx.font = '11px monospace'; ctx.fillStyle = '#74c69d';
    ctx.fillText('Volvés al combate con vida y maná completos', canvas.width / 2, canvas.height - TILE * 0.6);
    ctx.font = '18px monospace';
    heroes.filter(h => h.inRest && !h.eliminated).forEach(h => drawUnit({ x: h.x, y: h.y, hp: h.hp, maxHp: h.maxHp }, heroColor(h), h.symbol));
}

// Portada en el mapa mientras estás en el menú o eligiendo héroe.
function renderTitle() {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 30px monospace'; ctx.fillStyle = '#ffb703';
    ctx.fillText('CUSTOM HERO CHAOS', canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = '13px monospace'; ctx.fillStyle = '#8ecae6';
    ctx.fillText(gameState === 'MENU' ? 'Iniciá una partida o mirá el tutorial →' : 'Elegí tu héroe →', canvas.width / 2, canvas.height / 2 + 10);
    ctx.font = '20px monospace';
    Object.values(HERO_TEMPLATES).forEach((t, i, all) => {
        ctx.fillStyle = i % 2 ? '#ffb703' : '#00f5d4';
        ctx.fillText(t.symbol, canvas.width / 2 + (i - (all.length - 1) / 2) * TILE * 1.4, canvas.height / 2 + 55);
    });
}

function render() {
    const dt = tickFx();
    const hero = viewedHero || player;
    if (hero && (hero.inRest || !hero.arena) && gameState !== 'HERO_SELECT' && gameState !== 'MENU') { renderRestArea(); return; }
    ctx.fillStyle = '#050507'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'MENU' || gameState === 'HERO_SELECT' || !hero || !hero.arena || !inCombat()) {
        ctx.strokeStyle = '#151821';
        for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) ctx.strokeRect(c * TILE, r * TILE, TILE, TILE);
        if (gameState === 'MENU' || gameState === 'HERO_SELECT') renderTitle();
        return;
    }
    const arena = hero.arena;
    updateArenaFx(arena, dt);
    ctx.save();
    if (shakeAmount) ctx.translate((Math.random() - 0.5) * shakeAmount * 2, (Math.random() - 0.5) * shakeAmount * 2);
    ctx.drawImage(arenaBackground(arena.kind), 0, 0);
    if (arena.kind === 'duel') {
        ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffb703';
        ctx.fillText(`⚔ DUELO: ${arena.heroes[0].displayName}  vs  ${arena.heroes[1].displayName}`, canvas.width / 2, TILE * 0.7);
    }
    if (arena.kind === 'boss' && arena.boss) {
        const b = arena.boss;
        ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = b.color;
        ctx.fillText(`👹 ${b.label}: ${Math.max(0, b.hp)} / ${b.maxHp}`, canvas.width / 2, TILE * 0.5);
        ctx.fillStyle = '#330010'; ctx.fillRect(TILE * 3, TILE * 0.8, canvas.width - TILE * 6, 5);
        ctx.fillStyle = '#ff0055'; ctx.fillRect(TILE * 3, TILE * 0.8, (canvas.width - TILE * 6) * Math.max(0, b.hp) / b.maxHp, 5);
    }

    // Aura del jefe
    if (arena.boss && arena.boss.isAlive()) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,0,85,0.4)';
        ctx.arc(arena.boss.x * TILE + TILE / 2, arena.boss.y * TILE + TILE / 2, arena.boss.auraRadius * TILE, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    arena.creeps.forEach(c => { if (c.isAlive()) drawUnit(c, c.color, c.symbol, drawPos(c, dt), { glow: c.isBoss || c.isRoundBoss, big: c.isRoundBoss }); });
    // Proyectiles con estela, del color de quien los disparó
    arena.projectiles.forEach(p => {
        const color = p.attacker.isHero ? heroColor(p.attacker) : p.attacker.color || '#fefae0';
        p.trail = p.trail || [];
        p.trail.push([p.x, p.y]); if (p.trail.length > 6) p.trail.shift();
        p.trail.forEach(([x, y], i) => {
            ctx.globalAlpha = (i + 1) / p.trail.length * 0.5; ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, 1.5 + i * 0.3, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1; ctx.fillStyle = p.isCrit ? '#ffd166' : '#fefae0';
        ctx.beginPath(); ctx.arc(p.x * TILE + TILE / 2, p.y * TILE + TILE / 2, p.isCrit ? 4 : 3, 0, Math.PI * 2); ctx.fill();
    });
    arena.heroes.forEach(h => {
        if (h.eliminated) return;
        // Muerto esperando revivir: una calavera en el lugar donde va a reaparecer
        if (!h.isAlive()) { ctx.font = '18px monospace'; ctx.fillStyle = '#555'; ctx.fillText('☠', h.x * TILE + TILE / 2, h.y * TILE + TILE / 2); return; }
        drawUnit(h, hasFlag(h, 'invulnerable') ? '#ffffff' : heroColor(h), h.symbol, drawPos(h, dt), { glow: true });
    });
    drawArenaFx(arena);
    ctx.restore();
    if (hero !== player) {
        ctx.font = '11px monospace'; ctx.fillStyle = '#ffb703';
        ctx.fillText(`👁 Mirando a ${hero.displayName} (clic en tu fila del ranking para volver)`, canvas.width / 2, canvas.height - 8);
    }
}
