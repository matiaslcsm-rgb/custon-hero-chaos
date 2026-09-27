// Interfaz: paneles de selección/draft/tienda, códice de héroes, HUD de stats y render del canvas.

const canvas = document.getElementById('ascii-canvas');
const ctx = canvas.getContext('2d');
const TILE = 30;
const MAP_W = COLS * TILE, MAP_H = ROWS * TILE; // tamaño lógico del mapa (se dibuja siempre en estas coordenadas)

// Tamaño real del canvas: el mapa normal o agrandado (M), y multiplicado por la densidad de la pantalla para que se vea nítido.
let mapScale = 1;
const BIG_MAP_SCALE = 1.45;
function applyMapSize() {
    const k = mapScale * (window.devicePixelRatio || 1);
    canvas.width = Math.round(MAP_W * k); canvas.height = Math.round(MAP_H * k);
    canvas.style.width = `${Math.round(MAP_W * mapScale)}px`; canvas.style.height = `${Math.round(MAP_H * mapScale)}px`;
    document.body.classList.toggle('big-map', mapScale > 1);
}
function toggleBigMap() { mapScale = mapScale > 1 ? 1 : BIG_MAP_SCALE; applyMapSize(); }
applyMapSize();

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
    document.getElementById('shop-gold').textContent = player.gold;
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

let betAmount = 0; // monto elegido en la ventana de apuestas (arranca en 0: el riesgo lo decidís vos)

function setBetAmount(v) {
    betAmount = Math.max(0, Math.min(betLimit(), Math.round(v)));
    renderBetting();
}

function renderBetting() {
    const mine = duelPlan.pairs.find(p => p.includes(player));
    const rival = mine ? mine.find(h => h !== player) : null;
    const limit = betLimit();
    if (betAmount > limit) betAmount = limit;
    document.getElementById('bet-info').innerHTML = (rival ? `Tu duelo: contra <strong>${rival.displayName}</strong>. ` : 'Esta ronda no peleás. ') +
        (currentBet ? `Apostaste <strong>${currentBet.amount}g</strong> a <strong>${currentBet.on.displayName}</strong>: si gana cobrás ${currentBet.amount * BET_PAYOUT}g.`
                    : `Elegí cuánto arriesgar y a quién. Si acertás cobrás el doble; si no, lo perdés. Tope: ${limit}g (${BET_MAX_PCT * 100}% de tu oro).`);
    const box = document.getElementById('bet-amount-box');
    box.innerHTML = '';
    if (!currentBet) {
        box.innerHTML = `<div class="bet-slider"><input id="bet-amount" type="range" min="0" max="${limit}" step="1" value="${betAmount}">` +
            `<b class="bet-value">${betAmount}g</b></div>` +
            `<div class="bet-quick">${[['0', 0], ['¼', 0.25], ['½', 0.5], ['Máx', 1]].map(([t, f]) => `<button data-f="${f}">${t}</button>`).join('')}</div>` +
            `<div class="bet-odds">${betAmount ? `Si ganás: <span class="win">+${betAmount}g</span> (cobrás ${betAmount * BET_PAYOUT}g) · Si perdés: <span class="lose">−${betAmount}g</span>` : 'Mové el control para elegir cuánto apostar.'}</div>`;
        const input = box.querySelector('#bet-amount');
        input.oninput = () => { betAmount = Number(input.value); box.querySelector('.bet-value').textContent = `${betAmount}g`;
            box.querySelector('.bet-odds').innerHTML = betAmount ? `Si ganás: <span class="win">+${betAmount}g</span> (cobrás ${betAmount * BET_PAYOUT}g) · Si perdés: <span class="lose">−${betAmount}g</span>` : 'Mové el control para elegir cuánto apostar.';
            document.querySelectorAll('#bet-pairs .bet-side button').forEach(b => { b.disabled = !betAmount; }); };
        input.onchange = () => renderBetting();
        box.querySelectorAll('.bet-quick button').forEach(btn => { btn.onclick = () => setBetAmount(limit * Number(btn.dataset.f)); });
    }
    const list = document.getElementById('bet-pairs'); list.innerHTML = '';
    bettablePairs().forEach(pair => {
        const row = document.createElement('div'); row.className = 'bet-pair';
        pair.forEach((h, i) => {
            const side = document.createElement('div'); side.className = 'bet-side' + (currentBet && currentBet.on === h ? ' chosen' : '');
            side.innerHTML = betHeroHtml(h);
            if (!currentBet) {
                const btn = document.createElement('button');
                btn.textContent = `Apostar a ${h.name}`; btn.disabled = !betAmount;
                btn.onclick = () => { if (placeBet(h, betAmount)) betAmount = 0; };
                side.appendChild(btn);
            }
            row.appendChild(side);
            if (i === 0) { const vs = document.createElement('div'); vs.className = 'bet-vs'; vs.textContent = 'vs'; row.appendChild(vs); }
        });
        list.appendChild(row);
    });
    document.getElementById('bet-done-btn').textContent = currentBet ? 'Listo, a los duelos' : 'No apuesto, a los duelos';
}

// --- KIT (nivel, experiencia, puntos y habilidades) ---
let lastKitSignature = '';

// --- BARRA DEL HÉROE (abajo del mapa) ---
// Retrato con nivel y experiencia, vida y maná, las 4 habilidades como casillas (tecla, niveles, enfriamiento y [+]),
// innato y pasivas como chips, inventario de 6 + el neutral y los efectos activos. Todo con tooltip (title) al pasar el mouse.
// La estructura se rehace solo cuando cambia algo (para no romper los clics); vida, maná y enfriamientos se actualizan en cada cuadro.
function shortName(name, max = 14) { return name.length > max ? name.slice(0, max - 1) + '…' : name; }

function heroTooltip() {
    const p = player;
    let text = `${p.name} (${p.primaryAttr}) · Nivel ${p.level}\n` +
        `Fuerza ${Math.floor(p.attr('str'))} · Agilidad ${Math.floor(p.attr('agi'))} · Inteligencia ${Math.floor(p.attr('int'))}\n` +
        `Daño ${Math.round(effAttack(p))} · Vel. ataque ${effAtkSpeed(p).toFixed(2)}/s · Rango ${effRange(p).toFixed(1)}\n` +
        `Armadura ${p.armor.toFixed(1)} · Res. mágica ${p.magicResist.toFixed(0)}% · Evasión ${p.evasion.toFixed(1)}%\n` +
        `Crítico ${p.critChance.toFixed(1)}% · Robo de vida ${p.lifesteal.toFixed(1)}% · Amp. hechizo ${p.spellAmp.toFixed(1)}%\n` +
        `Regeneración ${p.hpRegen.toFixed(1)} vida/s · ${p.manaRegen.toFixed(1)} maná/s · Vel. mov. ${p.moveSpeed.toFixed(1)}`;
    if (p.scaling) {
        const toNext = p.scaling.perKills - (p.creepKillCount % p.scaling.perKills);
        text += `\nEscalado: +${(p.bonus[p.scaling.stat] || 0).toFixed(1)} ${scalingStatLabel(p.scaling.stat)} (${p.creepKillCount} bajas, próximo en ${toNext})`;
    }
    return text;
}

function levelButton(ability) {
    const blocker = levelUpBlocker(player, ability);
    if (blocker) return null;
    const btn = document.createElement('button');
    btn.className = 'lvl-btn'; btn.textContent = '+'; btn.title = 'Subir de nivel';
    btn.onclick = e => { e.stopPropagation(); levelUpSkill(player, ability); lastKitSignature = ''; renderHeroBar(); };
    return btn;
}

function renderHeroBar() {
    const bar = document.getElementById('hero-bar');
    bar.style.display = 'grid';
    const p = player;
    // Partes que cambian en cada cuadro
    document.getElementById('hb-hp-fill').style.width = `${Math.max(0, p.hp / p.maxHp * 100)}%`;
    document.getElementById('hb-hp-text').textContent = `${Math.max(0, Math.round(p.hp))} / ${p.maxHp}`;
    document.getElementById('hb-mana-fill').style.width = `${p.maxMana ? Math.max(0, p.mana / p.maxMana * 100) : 0}%`;
    document.getElementById('hb-mana-text').textContent = `${Math.round(p.mana)} / ${p.maxMana}`;
    document.getElementById('hb-xp-fill').style.width = `${Math.min(100, p.xp / xpToNext(p.level) * 100)}%`;
    document.querySelectorAll('#hb-skills .skill-slot[data-id]').forEach(slot => {
        const s = p.skills.find(x => x.id === slot.dataset.id);
        if (!s) return;
        const total = val(s, p, 'cooldown') || 1, left = Math.max(0, p.cooldowns[s.id] || 0);
        const cd = slot.querySelector('.cd');
        cd.style.height = `${Math.min(100, left / total * 100)}%`;
        cd.textContent = left > 0 ? left.toFixed(left < 10 ? 1 : 0) : '';
        slot.classList.toggle('no-mana', skillLevel(p, s) > 0 && p.mana < (val(s, p, 'manaCost') || 0));
    });
    const effects = activeEffects(p).filter(e => !e.flags.includes('item'));
    const effSig = effects.map(e => e.id + (isFinite(e.until) ? Math.ceil(e.until - gameClock) : '')).join('|');
    const effBox = document.getElementById('hb-effects');
    if (effBox.dataset.sig !== effSig) {
        effBox.dataset.sig = effSig;
        effBox.innerHTML = effects.map(e => `<span class="fx-chip" title="${e.name}">${shortName(e.name, 16)}${isFinite(e.until) ? ` ${Math.ceil(e.until - gameClock)}s` : ''}</span>`).join('');
    }

    // Estructura (solo si cambió algo)
    const signature = [p.level, p.skillPoints, p.neutral, p.inventory.map(i => i.key).join(','), Math.floor(p.attr('str')), Math.floor(p.attr('agi')),
        Math.floor(p.attr('int')), p.armor.toFixed(1), ...p.skills.map(s => s.id + ':' + skillLevel(p, s) + ':' + p.keyBindings[s.id] + ':' + !!levelUpBlocker(p, s))].join('|');
    if (signature === lastKitSignature) return;
    lastKitSignature = signature;

    const portrait = document.getElementById('hb-portrait');
    portrait.title = heroTooltip();
    const sym = document.getElementById('hb-symbol');
    sym.textContent = p.symbol; sym.style.color = heroColor(p);
    document.getElementById('hb-level').innerHTML = `Nv ${p.level}` + (p.skillPoints > 0 ? ` <span class="pts" title="Puntos de habilidad para repartir con [+]">+${p.skillPoints}</span>` : '');
    document.getElementById('hb-name').textContent = p.name;
    const stats = document.getElementById('hb-stats');
    stats.innerHTML = `<span class="st-str">FUE ${Math.floor(p.attr('str'))}</span> <span class="st-agi">AGI ${Math.floor(p.attr('agi'))}</span> ` +
        `<span class="st-int">INT ${Math.floor(p.attr('int'))}</span> <span>ARM ${p.armor.toFixed(1)}</span> <span class="st-more">ⓘ</span>`;
    stats.title = heroTooltip();

    // Habilidades activas: 4 casillas (las vacías se llenan en el draft)
    const skills = document.getElementById('hb-skills'); skills.innerHTML = '';
    const actives = p.skills.filter(s => s.kind === 'active');
    for (let i = 0; i < KIT_SIZE; i++) {
        const s = actives[i];
        const slot = document.createElement('div');
        if (!s) { slot.className = 'skill-slot empty'; slot.textContent = 'libre'; slot.title = 'Espacio libre: se llena en el draft'; skills.appendChild(slot); continue; }
        const lvl = skillLevel(p, s), max = maxSkillLevel(s);
        slot.className = 'skill-slot' + (lvl === 0 ? ' locked' : '') + (s.isUltimate ? ' ult' : '');
        slot.dataset.id = s.id;
        slot.title = `${s.name}${s.isUltimate ? ' (definitiva)' : ''}\n${stripHtml(skillCostLine(s, lvl))}\n${stripHtml(describeSkill(s, lvl))}` +
            (p.skillPoints > 0 && levelUpBlocker(p, s) ? `\n🔒 ${levelUpBlocker(p, s)}` : '');
        slot.innerHTML = `<span class="key">${(p.keyBindings[s.id] || '—').toUpperCase()}</span><span class="nm">${s.name}</span>` +
            `<span class="pips">${Array.from({ length: max }, (_, j) => `<i class="${j < lvl ? 'on' : ''}"></i>`).join('')}</span><div class="cd"></div>`;
        const btn = levelButton(s); if (btn) slot.appendChild(btn);
        skills.appendChild(slot);
    }

    // Innato y pasivas: chips (las pasivas drafteadas también se suben con [+])
    const passives = document.getElementById('hb-passives'); passives.innerHTML = '';
    [{ a: p.innate, innate: true }, ...p.skills.filter(s => s.kind === 'passive').map(a => ({ a }))].forEach(({ a, innate }) => {
        if (!a) return;
        const chip = document.createElement('span');
        const lvl = innate ? null : skillLevel(p, a);
        chip.className = 'passive-chip' + (innate ? ' innate' : '') + (lvl === 0 ? ' locked' : '');
        chip.textContent = `${innate ? '◆ ' : '◇ '}${a.name}${innate ? '' : ` ${lvl}/${maxSkillLevel(a)}`}`;
        chip.title = `${innate ? 'Innato' : 'Pasiva'}: ${a.name}\n${stripHtml(innate ? a.description : describeSkill(a, lvl))}`;
        if (!innate) { const btn = levelButton(a); if (btn) chip.appendChild(btn); }
        passives.appendChild(chip);
    });

    // Inventario: 6 casillas + el neutral
    const slots = document.getElementById('hb-slots'); slots.innerHTML = '';
    for (let i = 0; i < INVENTORY_SLOTS; i++) {
        const inv = p.inventory[i], el = document.createElement('div');
        el.className = 'item-slot' + (inv ? '' : ' empty');
        if (inv) { const item = ITEMS[inv.key]; el.textContent = shortName(item.name, 11); el.style.color = itemColor(item); el.style.borderColor = itemColor(item); el.title = `${item.name}\n${describeItem(item)}`; }
        slots.appendChild(el);
    }
    const n = p.neutral ? NEUTRAL_ITEMS[p.neutral] : null, neutral = document.createElement('div');
    neutral.className = 'item-slot neutral' + (n ? '' : ' empty');
    neutral.textContent = n ? shortName(n.name, 11) : 'neutral';
    if (n) { neutral.style.color = itemColor(n); neutral.style.borderColor = itemColor(n); neutral.title = `${n.name} (neutral)\n${describeNeutral(n)}`; }
    else neutral.title = 'Objeto neutral: se gana contra los jefes de ronda';
    slots.appendChild(neutral);
}

function updateHud() {
    if (!player) return;
    document.getElementById('player-gold').textContent = player.gold;
    document.getElementById('round-num').textContent = `${waveNumber}/${MAX_ROUNDS}${isRoundBossRound() ? ' 👹' : ''}`;
    document.getElementById('lives-text').innerHTML = `<span class="hearts">${'♥'.repeat(Math.max(0, player.lives))}${'♡'.repeat(Math.max(0, 2 - player.lives))}</span>` +
        (isCondemned(player) ? ` <span class="cursed" title="Condenado: recibís más daño">☠ +${Math.round(player.condemnPct * 100)}%</span>` : '');
    document.getElementById('points-text').textContent = `🏆 ${player.points} pts · ${heroRank(player)}º`;
    renderScoreboard();
    renderHeroBar();
    renderCombatInfo();
}

// Panel derecho durante el combate (no hay nada para elegir): qué está pasando y qué hacer.
function renderCombatInfo() {
    const box = document.getElementById('combat-info');
    const show = inCombat() || gameState === 'ENDED' || gameState === 'PREP' || gameState === 'BETTING';
    box.style.display = show ? 'block' : 'none';
    if (!show) return;
    const hero = viewedHero || player, arena = hero.arena;
    let html;
    if (gameState === 'PREP' && !player.eliminated) {
        html = `<h3>🛒 Preparación · ronda ${waveNumber}</h3><p class="subtitle">Comprá en la tienda, subí tus habilidades con [+] y preparate para la oleada` +
            `${nextWave ? `: <b>${nextWave.name}</b>` : ''}.${waveNumber < DUEL_START_ROUND ? ` Los duelos arrancan en la ronda ${DUEL_START_ROUND}.` : ''}</p>` +
            `<button class="primary-btn" onclick="openShop()">🛒 Abrir tienda (B)</button><button class="secondary-btn" onclick="startWave()">⚔ Comenzar oleada</button>`;
    } else if (gameState === 'BETTING') {
        html = `<h3>🎲 Previa de duelos</h3><p class="subtitle">Apostá en la ventana antes de que arranquen los duelos.</p>`;
    } else if (gameState === 'ENDED') html = `<h3>Fin de la partida</h3><p class="subtitle">Mirá el ranking a la izquierda. Tocá "Nueva Partida" para jugar otra.</p>`;
    else if (player.eliminated) html = `<h3>Quedaste eliminado</h3><p class="subtitle">Podés seguir mirando: clic en un héroe del ranking.</p>`;
    else if (gameState === 'BOSS') html = `<h3>👹 Jefe de ronda</h3><p class="subtitle">Todos contra ${arena && arena.boss ? arena.boss.label : 'el jefe'}. Morir acá no cuesta vidas. Los 3 que más daño hagan cobran extra.</p>`;
    else if (gameState === 'DUEL') {
        const rival = arena && arena.kind === 'duel' ? arena.heroes.find(h => h !== hero) : null;
        html = `<h3>⚔ Duelos</h3><p class="subtitle">${rival ? `${hero === player ? 'Peleás' : hero.name + ' pelea'} contra <b>${rival.displayName}</b>. Gana quien mata al otro o, a los ${DUEL_TIME}s, quien tenga más % de vida.` : 'Esperando que terminen los demás duelos.'}</p>` +
            (currentBet ? `<p class="subtitle">🎲 Apostaste ${currentBet.amount}g a ${currentBet.on.displayName}.</p>` : '');
    } else html = `<h3>🌊 Oleada ${waveNumber}</h3><p class="subtitle">${hero.inRest ? 'Terminaste: esperás en el Área de Descanso a que terminen los demás.' : 'Matá a todos los creeps antes de que se acabe el tiempo (después se enfurecen). El ataque es automático: movete y usá tus habilidades.'}</p>`;
    if (box.dataset.html !== html) { box.dataset.html = html; box.innerHTML = html; }
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
    document.querySelectorAll('.phase-countdown').forEach(c => {
        c.textContent = ['PREP', 'BETTING'].includes(gameState) ? `⏱ ${Math.max(0, Math.ceil(phaseTimeLeft))}s` : '';
        c.classList.toggle('urgent', phaseTimeLeft <= 5);
    });
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
        row.innerHTML = `<span class="pos">${i + 1}</span><span class="sym" style="color:${heroColor(h)}">${h.symbol}</span><span class="name">${h === player ? 'Vos' : h.name}</span>` +
            `<span class="lives">${lives}</span><span class="pts">${h.points}</span><span class="st">${heroStatusIcon(h)}</span>`;
        row.title = `${h.displayName} · ${h.points} pts · ${h.gold}g · nivel ${h.level} · duelos ${h.duelWins}-${h.duelLosses}`;
        row.onclick = () => { viewedHero = h; lastScoreboardSignature = ''; };
        board.appendChild(row);
    });
}

// Deja la interfaz como al abrir el juego (usado por "Nueva Partida").
function resetHud() {
    ['draft-container', 'shop-container', 'bet-container', 'restart-btn', 'hero-select-panel'].forEach(id => showPanel(id, false));
    showPanel('menu-panel', true);
    setStateText('MENÚ');
    document.getElementById('round-num').textContent = '1';
    ['lives-text', 'points-text', 'player-gold'].forEach(id => { document.getElementById(id).textContent = ''; });
    document.getElementById('hero-bar').style.display = 'none';
    document.getElementById('combat-info').style.display = 'none';
    document.getElementById('scoreboard').innerHTML = ''; lastScoreboardSignature = '';
    document.getElementById('combat-log').innerHTML = '';
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
    ctx.fillStyle = '#07140d'; ctx.fillRect(0, 0, MAP_W, MAP_H);
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
    ctx.fillText('ÁREA DE DESCANSO', MAP_W / 2, TILE * 0.8);
    ctx.font = '11px monospace'; ctx.fillStyle = '#74c69d';
    ctx.fillText('Volvés al combate con vida y maná completos', MAP_W / 2, MAP_H - TILE * 0.6);
    ctx.font = '18px monospace';
    heroes.filter(h => h.inRest && !h.eliminated).forEach(h => drawUnit({ x: h.x, y: h.y, hp: h.hp, maxHp: h.maxHp }, heroColor(h), h.symbol));
}

// Portada en el mapa mientras estás en el menú o eligiendo héroe.
function renderTitle() {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 30px monospace'; ctx.fillStyle = '#ffb703';
    ctx.fillText('CUSTOM HERO CHAOS', MAP_W / 2, MAP_H / 2 - 30);
    ctx.font = '13px monospace'; ctx.fillStyle = '#8ecae6';
    ctx.fillText(gameState === 'MENU' ? 'Iniciá una partida o mirá el tutorial →' : 'Elegí tu héroe →', MAP_W / 2, MAP_H / 2 + 10);
    ctx.font = '20px monospace';
    Object.values(HERO_TEMPLATES).forEach((t, i, all) => {
        ctx.fillStyle = i % 2 ? '#ffb703' : '#00f5d4';
        ctx.fillText(t.symbol, MAP_W / 2 + (i - (all.length - 1) / 2) * TILE * 1.4, MAP_H / 2 + 55);
    });
}

function render() {
    const dt = tickFx();
    const k = mapScale * (window.devicePixelRatio || 1);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const hero = viewedHero || player;
    if (hero && (hero.inRest || !hero.arena) && gameState !== 'HERO_SELECT' && gameState !== 'MENU') { renderRestArea(); return; }
    ctx.fillStyle = '#050507'; ctx.fillRect(0, 0, MAP_W, MAP_H);
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
    ctx.drawImage(arenaBackground(arena.kind), 0, 0, MAP_W, MAP_H);
    if (arena.kind === 'duel') {
        ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffb703';
        ctx.fillText(`⚔ DUELO: ${arena.heroes[0].displayName}  vs  ${arena.heroes[1].displayName}`, MAP_W / 2, TILE * 0.7);
    }
    if (arena.kind === 'boss' && arena.boss) {
        const b = arena.boss;
        ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = b.color;
        ctx.fillText(`👹 ${b.label}: ${Math.max(0, b.hp)} / ${b.maxHp}`, MAP_W / 2, TILE * 0.5);
        ctx.fillStyle = '#330010'; ctx.fillRect(TILE * 3, TILE * 0.8, MAP_W - TILE * 6, 5);
        ctx.fillStyle = '#ff0055'; ctx.fillRect(TILE * 3, TILE * 0.8, (MAP_W - TILE * 6) * Math.max(0, b.hp) / b.maxHp, 5);
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
        const pos = drawPos(h, dt);
        // Rango de ataque: círculo punteado (el tuyo más visible). Lo que entra en el círculo recibe tu ataque automático.
        ctx.save();
        ctx.strokeStyle = heroColor(h); ctx.globalAlpha = h === player ? 0.45 : 0.18; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(pos.x * TILE + TILE / 2, pos.y * TILE + TILE / 2, effRange(h) * TILE, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        drawUnit(h, hasFlag(h, 'invulnerable') ? '#ffffff' : heroColor(h), h.symbol, pos, { glow: true });
    });
    drawArenaFx(arena);
    ctx.restore();
    if (hero !== player) {
        ctx.font = '11px monospace'; ctx.fillStyle = '#ffb703';
        ctx.fillText(`👁 Mirando a ${hero.displayName} (clic en tu fila del ranking para volver)`, MAP_W / 2, MAP_H - 8);
    }
}
