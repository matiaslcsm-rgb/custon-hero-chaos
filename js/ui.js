// Interfaz: paneles de selección/draft/tienda, códice de héroes, HUD de stats y render del canvas.

const canvas = document.getElementById('ascii-canvas');
const ctx = canvas.getContext('2d');
const TILE = 26;
canvas.width = COLS * TILE; canvas.height = ROWS * TILE;

function setStateText(text) { document.getElementById('game-state-text').textContent = text; }
function showPanel(id, visible) { document.getElementById(id).style.display = visible ? 'block' : 'none'; }

// --- SELECCIÓN DE HÉROE ---
function initHeroSelect() {
    const container = document.getElementById('hero-options');
    container.innerHTML = '';
    Object.values(HERO_TEMPLATES).forEach(t => {
        const card = document.createElement('div');
        card.className = 'skill-card';
        const scalingText = `Escalado: +${t.scaling.perKillsAmount} ${scalingStatLabel(t.scaling.stat)} cada ${t.scaling.perKills} bajas &middot; +${t.scaling.perHeroKill} al ganar un duelo.`;
        card.innerHTML = `<h4>[${t.symbol}] ${t.name} (${t.primaryAttr})</h4><p>${t.description}</p><p style="color:#ffb703; margin-top:4px;">${scalingText}</p>`;
        card.onclick = () => selectHero(t);
        container.appendChild(card);
    });
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

function renderCreepCodex() {
    const rows = Object.values(CREEP_TYPES).map(t => {
        const stats = [`${t.hp} HP${t.groupSize ? ` (x${t.groupSize})` : ''}`, `${t.atk} daño${t.attackType === 'magical' ? ' mágico' : ''}`, `rango ${t.range}`];
        if (t.armor) stats.push(`armadura ${t.armor}`);
        if (t.evasion) stats.push(`evasión ${t.evasion}%`);
        if (t.bossable) stats.push('puede ser jefe');
        const item = t.counterItem ? ` <span class="counter-item">(${ITEMS[t.counterItem].name})</span>` : '';
        return `<div class="ability-row"><h4>${creepTag(t)} ${t.label}</h4><p>${t.mechanic}</p>` +
            `<p class="meta">${stats.join(' · ')}</p><p><strong>Contra:</strong> ${t.counter}${item}</p></div>`;
    }).join('');
    const last = WAVE_THEMES.length - 1;
    const themes = WAVE_THEMES.map((tier, i) => `<p><strong>${i < last - 1 ? 'Ronda ' + (i + 1) : i === last - 1 ? 'Ronda ' + (i + 1) + ' en adelante' : 'Cada ' + BOSS_ROUND_EVERY + ' rondas (jefe)'}:</strong> ${tier.map(th => th.name).join(' o ')}</p>`).join('');
    document.getElementById('creep-codex').innerHTML =
        `<h3>Creeps</h3><p class="subtitle">Cada oleada normal trae además un jefe (4x vida, +2 armadura y un aura que potencia a los creeps cercanos). Los creeps se hacen más fuertes en cada oleada.</p>${rows}` +
        `<div class="codex-sub">Temas de oleada (se elige uno al azar)</div>${themes}`;
}

// Aviso de la próxima oleada en la tienda: qué creeps vienen, qué hacen y cómo contrarrestarlos.
function renderWavePreview() {
    const el = document.getElementById('wave-preview');
    if (!nextWave) { el.innerHTML = ''; return; }
    const title = `Próxima oleada · ronda ${waveNumber}${waveNumber % BOSS_ROUND_EVERY === 0 ? ' (JEFE)' : ''}`;
    const rows = waveSummary(nextWave).map(({ type, count }) => {
        const counter = type.counterItem ? ` → <span class="counter-item">${ITEMS[type.counterItem].name}</span>` : '';
        return `<div class="preview-row">${creepTag(type)} <strong>${type.label} x${count}</strong>: ${type.mechanic}${type.counter !== '—' ? ` <em>Contra: ${type.counter}${counter}</em>` : ''}</div>`;
    }).join('');
    el.innerHTML = `<h3>🔭 ${title}: ${nextWave.name}</h3>${rows}<div class="preview-row">${creepTag(CREEP_TYPES[nextWave.boss])} <strong>Jefe: ${CREEP_TYPES[nextWave.boss].label}</strong></div>`;
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
        return `<span class="${has ? 'has' : ''}">${has ? '✓ ' : ''}${ITEMS[k].name}</span>`;
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
    card.innerHTML = `<h4>${item.name} (${cost}g)${total}${owned ? ` <span class="item-level">tenés ${owned}</span>` : ''}</h4>` +
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
    renderDestinyPanel();
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

// --- CÓDICE DE ÍTEMS (árbol de recetas) ---
function renderItemCodex() {
    const all = Object.values(ITEMS);
    const basics = all.filter(i => i.tier === 'basic').map(i => {
        const usedIn = all.filter(c => c.tier === 'composite' && c.components.includes(i.key)).map(c => c.name);
        return `<div class="ability-row"><h4>${i.name} <span class="item-level">${i.cost}g</span></h4><p>${describeItem(i)}</p>` +
            (usedIn.length ? `<p class="meta">Se usa en: ${usedIn.join(', ')}</p>` : '') + `</div>`;
    }).join('');
    const composites = ITEM_GROUPS.map(group => `<div class="codex-sub">${group}</div>` + all.filter(i => i.tier === 'composite' && i.group === group).map(i =>
        `<div class="ability-row fixed"><h4>${i.name} <span class="item-level">${itemTotalCost(i)}g</span></h4><p>${describeItem(i)}</p>${recipeHtml(i, null)}` +
        (i.counters ? `<p class="meta">Contra: ${i.counters}</p>` : '') + `</div>`).join('')).join('');
    document.getElementById('item-codex').innerHTML =
        `<h3>Ítems</h3><p class="subtitle">Los básicos mejoran un solo stat y se pueden repetir. Los compuestos se arman con básicos + una receta, ` +
        `suman sus efectos y agregan algo especial. Al comprar un compuesto se usan los básicos que ya tenés y pagás solo lo que falta. ` +
        `Inventario: ${INVENTORY_SLOTS} espacios. Vender devuelve el ${SELL_REFUND * 100}%.</p>` +
        `<div class="codex-sub">Básicos</div>${basics}${composites}`;
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
    document.getElementById('round-num').textContent = `${waveNumber}/${MAX_ROUNDS}${isBossWave ? ' (JEFE)' : ''}`;
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
    if (['HERO_SELECT', 'DRAFT', 'PREP'].includes(gameState)) {
        text = `⏱ ${Math.max(0, Math.ceil(phaseTimeLeft))}s`;
        if (phaseTimeLeft <= 5) cls = 'urgent';
    } else if (inCombat() && player) {
        const hero = viewedHero || player, arena = hero.arena;
        const waiting = arenas.filter(a => !a.done).length;
        if (hero.inRest || !arena || arena.done) { text = `🏕 Descansando · ${waiting} ${gameState === 'DUEL' ? 'duelo' : 'arena'}${waiting === 1 ? '' : 's'} en curso`; }
        else if (arena.kind === 'duel') { const left = DUEL_TIME - arena.elapsed; text = `⚔ Duelo ${Math.max(0, Math.ceil(left))}s`; if (left <= 5) cls = 'urgent'; }
        else if (!hero.isAlive() && hero.respawnAt) { text = `☠ Revive en ${Math.max(0, hero.respawnAt - gameClock).toFixed(1)}s`; cls = 'urgent'; }
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
    ['draft-container', 'shop-container', 'restart-btn'].forEach(id => showPanel(id, false));
    showPanel('hero-select-panel', true);
    setStateText('SELECCIÓN DE HÉROE');
    document.getElementById('player-name').textContent = 'Ninguno';
    document.getElementById('round-num').textContent = '1';
    document.getElementById('scoreboard').innerHTML = ''; lastScoreboardSignature = '';
    ['cooldown-bar', 'combat-log'].forEach(id => document.getElementById(id).innerHTML = '');
    ['scaling-info', 'extra-stats'].forEach(id => document.getElementById(id).textContent = '');
    document.getElementById('kit-panel').style.display = 'none';
    lastKitSignature = '';
}

// --- RENDER DEL CANVAS ---
function drawUnit(u, color, symbol) {
    const cx = u.x * TILE + TILE / 2, cy = u.y * TILE + TILE / 2;
    ctx.fillStyle = color; ctx.fillText(symbol, cx, cy);
    if (u.maxHp) {
        const pct = Math.max(0, u.hp / u.maxHp);
        ctx.fillStyle = '#333'; ctx.fillRect(cx - TILE / 2 + 2, cy - TILE / 2 + 2, TILE - 4, 3);
        ctx.fillStyle = pct > 0.5 ? '#00f5d4' : pct > 0.25 ? '#ffb703' : '#ff0055';
        ctx.fillRect(cx - TILE / 2 + 2, cy - TILE / 2 + 2, (TILE - 4) * pct, 3);
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

function render() {
    const hero = viewedHero || player;
    if (hero && (hero.inRest || !hero.arena) && gameState !== 'HERO_SELECT') { renderRestArea(); return; }
    ctx.fillStyle = '#050507'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#151821';
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) ctx.strokeRect(c * TILE, r * TILE, TILE, TILE);
    if (!hero || !hero.arena || !inCombat()) return;
    const arena = hero.arena;
    if (arena.kind === 'duel') {
        ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffb703';
        ctx.fillText(`⚔ DUELO: ${arena.heroes[0].displayName}  vs  ${arena.heroes[1].displayName}`, canvas.width / 2, TILE * 0.7);
    }

    // Aura del jefe
    if (arena.boss && arena.boss.isAlive()) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,0,85,0.4)';
        ctx.arc(arena.boss.x * TILE + TILE / 2, arena.boss.y * TILE + TILE / 2, arena.boss.auraRadius * TILE, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.font = '18px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    arena.creeps.forEach(c => { if (c.isAlive()) drawUnit(c, c.color, c.symbol); });
    ctx.fillStyle = '#fefae0';
    arena.projectiles.forEach(p => { ctx.beginPath(); ctx.arc(p.x * TILE + TILE / 2, p.y * TILE + TILE / 2, 3, 0, Math.PI * 2); ctx.fill(); });
    arena.heroes.forEach(h => {
        if (h.eliminated) return;
        // Muerto esperando revivir: una calavera en el lugar donde va a reaparecer
        if (!h.isAlive()) { ctx.fillStyle = '#555'; ctx.fillText('☠', h.x * TILE + TILE / 2, h.y * TILE + TILE / 2); return; }
        drawUnit({ x: h.x, y: h.y, hp: h.hp, maxHp: h.maxHp }, hasFlag(h, 'invulnerable') ? '#ffffff' : heroColor(h), h.symbol);
    });
    if (hero !== player) {
        ctx.font = '11px monospace'; ctx.fillStyle = '#ffb703';
        ctx.fillText(`👁 Mirando a ${hero.displayName} (clic en tu fila del ranking para volver)`, canvas.width / 2, canvas.height - 8);
    }
}
