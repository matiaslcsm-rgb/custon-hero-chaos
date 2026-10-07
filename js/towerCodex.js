// Tower Chaos: Códice de poderes, piezas sin alma y el Herrero (pedido del usuario, 2026-10-07; ROGUELIKE.md §4 septies).
//
//   CÓDICE (tecla J): cada habilidad e innato del catálogo (55). Cuando llevás la habilidad de una pieza a su nivel
//   máximo (4, o 3 la definitiva; los innatos, con la pieza a nivel CODEX.innateLevel), queda DESBLOQUEADA PARA SIEMPRE:
//   se guarda en el navegador y sobrevive a la muerte y a las runs nuevas (metaprogresión, como el Códice de Hades o
//   las runas de Rogue Legacy).
//   PIEZAS SIN ALMA: armaduras, cascos, guantes, botas, amuletos y anillos sin habilidad, con un afijo de más. Salen en
//   el botín, las vende el Herrero o se hacen vaciando una pieza.
//   HERRERO: está en el pueblo de algunos pisos (o lo liberás: el prisionero puede ser herrero). Imbuye un poder
//   desbloqueado del Códice en una pieza sin alma a elección, y vacía piezas (les saca la habilidad, conservan afijos).

const CODEX = {
    innateLevel: 5,                         // los innatos no tienen nivel de habilidad: se dominan con la pieza a nivel 5
    smithChance: 0.5,                       // herrero en el pueblo (si el piso anterior no tuvo, aparece seguro)
    blankDropShare: 0.15,                   // de cada pieza del botín, 15% sale sin alma
    blankSlots: ['helm', 'armor', 'gloves', 'boots', 'amulet', 'ring'], // las armas definen el ataque: siempre traen héroe
    infuseCost: { base: 150, perFloor: 0.5 },
    purgeCost: { base: 40 },
    smithStock: ['magic', 'magic', 'rare']
};
let codexPersist = true; // las pruebas lo apagan para no tocar el códice guardado
const CODEX_KEY = 'chc-codex';

// --- EL CÓDICE (persistente) ---
function codexLoad() {
    try { const raw = localStorage.getItem(CODEX_KEY); if (raw) { const c = JSON.parse(raw); if (c && c.unlocked) return { unlocked: c.unlocked, best: c.best || {} }; } } catch (e) { /* sin almacenamiento */ }
    return { unlocked: {}, best: {} };
}
let codex = codexLoad();
function codexSave() { if (!codexPersist) return; try { localStorage.setItem(CODEX_KEY, JSON.stringify(codex)); } catch (e) { /* no se guarda */ } }

// Entradas: una por habilidad o innato del catálogo de la Torre
let CODEX_ENTRIES = null;
function codexEntries() {
    if (!CODEX_ENTRIES) CODEX_ENTRIES = towerCatalog().map(e => {
        const id = e.skillId || e.innateId, skill = itemSkill({ skillId: e.skillId, innateId: e.innateId, heroKey: e.heroKey });
        return { id, heroKey: e.heroKey, skillId: e.skillId || null, innateId: e.innateId || null, slot: e.slot, skill, max: skill.isInnateItem ? CODEX.innateLevel : maxSkillLevel(skill) };
    });
    return CODEX_ENTRIES;
}
const codexEntry = id => codexEntries().find(e => e.id === id);
const codexUnlocked = id => !!codex.unlocked[id];
const codexUnlockedEntries = () => codexEntries().filter(e => codexUnlocked(e.id));

// Progreso de la pieza en su poder: nivel de la habilidad, o nivel de la pieza si es un innato
function codexProgress(item) { return item.innateId ? item.level : item.skillLevel; }
// Lo llaman la forja (al subir la habilidad) y la experiencia de las piezas (al subir de nivel)
function codexCheckItem(hero, item) {
    if (hero !== player || gameMode !== 'tower' || !item || item.blank) return;
    const e = codexEntry(item.skillId || item.innateId);
    if (!e) return;
    const p = Math.min(e.max, codexProgress(item));
    if (p > (codex.best[e.id] || 0)) { codex.best[e.id] = p; codexSave(); }
    if (p < e.max || codexUnlocked(e.id)) return;
    codex.unlocked[e.id] = { floor: towerRun ? towerRun.floor : 0 };
    codexSave();
    if (towerRun) towerRun.stats.codex = (towerRun.stats.codex || 0) + 1;
    log(`📜 ¡Dominaste ${e.skill.name}! Queda en tu Códice para siempre (J): un Herrero puede imbuirlo en una pieza sin alma.`);
    if (fxArena(hero)) fxText(hero, '¡PODER DOMINADO!', '#c9a227', 15, 1.6);
    sfx('levelup');
}

// --- PIEZAS SIN ALMA ---
function makeBlankItem(floor = 1, slot = pickRandom(CODEX.blankSlots), quality = rollQuality(floor)) {
    const item = { id: ++towerItemSeq, heroKey: null, slot, skillId: null, innateId: null, blank: true,
        quality, level: 1, xp: 0, floor, affixes: [], boosts: {}, skillLevel: 1, pendingChoices: 0 };
    const q = ITEM_QUALITY[quality];
    const n = 1 + (Array.isArray(q.affixes) ? q.affixes[0] + Math.floor(Math.random() * (q.affixes[1] - q.affixes[0] + 1)) : q.affixes); // +1 afijo: compensa no traer habilidad
    shuffle(AFFIXES.slice()).slice(0, n).forEach(a => item.affixes.push({ key: a.key, name: a.name, value: round1(a.roll(floor)) }));
    nameTowerItem(item);
    return item;
}
// Nombre según su estado: "Coraza Feroz sin alma" / "Coraza Feroz ✦ Rayo Relámpago"
function nameTowerItem(item) {
    const prefix = item.affixes.find(a => !a.name.startsWith('del '));
    const base = `${SLOT_NOUNS[slotKind(item.slot)]}${prefix && item.quality !== 'normal' ? ' ' + prefix.name : ''}`;
    item.name = item.blank ? `${base} sin alma` : `${base} ✦ ${itemSkill(item).name}`;
    return item;
}
// Botín: a veces sale una pieza sin alma en vez de una con habilidad
function lootItem(floor, quality = rollQuality(floor)) {
    return Math.random() < CODEX.blankDropShare ? makeBlankItem(floor, undefined, quality) : makeTowerItem(floor, undefined, quality);
}

// --- EL HERRERO ---
function infuseCost(floor) { return Math.round(CODEX.infuseCost.base * (1 + CODEX.infuseCost.perFloor * (floor - 1))); }
function purgeCost(floor) { return CODEX.purgeCost.base * floor; }
function heroPieces(hero) { return EQUIP_SLOTS.map(s => hero.gear[s]).filter(Boolean).concat(hero.bag.map(b => b.item)); }
function equippedSlotOf(hero, item) { return EQUIP_SLOTS.find(s => hero.gear[s] === item) || null; }
// Imbuir: la pieza sin alma pasa a traer el poder (nivel 1 de habilidad, sigue creciendo con la forja como cualquiera)
function infuseItem(hero, item, entryId, floor = towerRun ? towerRun.floor : 1) {
    const e = codexEntry(entryId), cost = infuseCost(floor);
    if (!item || !item.blank || !e || !codexUnlocked(entryId)) return false;
    if (hero.gold < cost) { log(`⚒️ Te faltan ${cost - hero.gold}g para imbuir ${e.skill.name}.`); return false; }
    const slot = equippedSlotOf(hero, item);
    if (slot) unequipSlot(hero, slot, false);
    hero.gold -= cost;
    Object.assign(item, { blank: false, infused: true, heroKey: e.heroKey, skillId: e.skillId, innateId: e.innateId, skillLevel: 1, boosts: {} });
    nameTowerItem(item);
    if (slot) { hero.bag = hero.bag.filter(b => b.item !== item); hero.gear[slot] = null; equipItem(hero, item, slot); }
    log(`⚒️ El Herrero imbuyó ${e.skill.name} en ${item.name} (-${cost}g).`); sfx('levelup');
    if (towerRun) towerRun.stats.infused = (towerRun.stats.infused || 0) + 1;
    return true;
}
// Vaciar: la pieza pierde su habilidad (y lo forjado en ella) pero conserva nivel y afijos
function purgeItem(hero, item, floor = towerRun ? towerRun.floor : 1) {
    const cost = purgeCost(floor);
    if (!item || item.blank || item.slot === 'weapon') return false;
    if (hero.gold < cost) { log(`⚒️ Te faltan ${cost - hero.gold}g para vaciar ${item.name}.`); return false; }
    const slot = equippedSlotOf(hero, item);
    if (slot) unequipSlot(hero, slot, false);
    hero.gold -= cost;
    Object.assign(item, { blank: true, infused: false, heroKey: null, skillId: null, innateId: null, skillLevel: 1, boosts: {} });
    nameTowerItem(item);
    if (slot) { hero.gear[slot] = null; equipItem(hero, item, slot); }
    log(`⚒️ El Herrero vació ${item.name}: queda lista para imbuirle un poder (-${cost}g).`); sfx('coin');
    return true;
}
// Herrero del pueblo: posición y mercadería (lo decide la generación del piso)
function placeTownSmith(level) {
    const miss = towerRun ? towerRun.smithless || 0 : 0;
    const has = miss >= 1 || Math.random() < CODEX.smithChance;
    if (towerRun) towerRun.smithless = has ? 0 : miss + 1;
    if (has) openTownSmith(level);
}
function openTownSmith(level) {
    const t = level.town;
    if (!t || t.smith) return false;
    t.smith = { x: t.x + 4, y: t.y + 4, name: 'Herrero', stock: CODEX.smithStock.map(q => makeBlankItem(level.floor, undefined, q)) };
    return true;
}
function nearSmith(hero) {
    const s = hero.arena && hero.arena.town && hero.arena.town.smith;
    return !!s && Math.max(Math.abs(hero.x - s.x), Math.abs(hero.y - s.y)) <= 2;
}
function towerSmithTick(level, hero) {
    const s = level.town && level.town.smith;
    if (!s || hero !== player || autopilot) return;
    const near = Math.max(Math.abs(hero.x - s.x), Math.abs(hero.y - s.y)) <= 1;
    if (near && !s.greeted) { s.greeted = true; toggleSmith(true); }
    else if (!near) s.greeted = false;
}
function drawTowerSmith(level) {
    const s = level.town && level.town.smith;
    if (!s || !level.explored[s.y][s.x]) return;
    const k = Math.floor(((fxClock * 0.8 + 0.4) % 1) * INK_IDLE_FRAMES);
    const fig = inkFigure('hoodedKnight', { main: '#5c4033', hood: '#3e2a1e', accent: '#e85d04', weapon: 'hammer' }, 'idle', k);
    const sc = 1.1 * TILE / INK_W * 1.3, w = INK_W * sc, h = INK_H * sc;
    const cx = s.x * TILE + TILE / 2, cy = s.y * TILE + TILE / 2 + TILE * 0.45;
    // yunque con chispas
    ctx.fillStyle = '#3d3d3d'; ctx.fillRect(cx + TILE * 0.55, cy - TILE * 0.3, TILE * 0.55, TILE * 0.18); ctx.fillRect(cx + TILE * 0.72, cy - TILE * 0.14, TILE * 0.2, TILE * 0.16);
    if (Math.sin(fxClock * 5) > 0.6) { ctx.fillStyle = '#ffb703'; for (let i = 0; i < 3; i++) ctx.fillRect(cx + TILE * (0.7 + 0.2 * Math.random()), cy - TILE * (0.4 + 0.3 * Math.random()), 2, 2); }
    ctx.fillStyle = 'rgba(29,23,18,0.28)'; ctx.beginPath(); ctx.ellipse(cx, cy - 2, w * 0.3, h * 0.04, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(fig.img, cx - w / 2, cy - h * (FOOT + 2) / INK_H, w, h);
    ctx.font = 'bold 11px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = INK.line;
    ctx.fillText('Herrero (B)', cx, s.y * TILE - TILE * 0.9);
}

// --- VENTANA DEL HERRERO ---
let smithOpen = false, smithPick = null;
function toggleSmith(open = !smithOpen) {
    if (gameMode !== 'tower' || !player || !player.arena || !player.arena.town || !player.arena.town.smith) return;
    smithOpen = open; smithPick = null;
    showPanel('smith-container', open);
    if (open) { document.getElementById('smith-tooltip').innerHTML = ''; renderSmith(); }
}
function renderSmith() {
    if (!smithOpen) return;
    const level = player.arena, s = level.town.smith, tip = document.getElementById('smith-tooltip'), floor = level.floor;
    document.getElementById('smith-gold').textContent = `💰 ${player.gold}g`;
    const hover = item => { tip.innerHTML = item ? itemTooltipHtml(item) : '<span class="subtitle">Elegí una pieza sin alma y después el poder del Códice que querés imbuirle.</span>'; };
    const row = (item, label, price, can, act, picked = false) => {
        const el = document.createElement('div'); el.className = 'tshop-row' + (picked ? ' picked' : '');
        el.innerHTML = `<img src="${towerItemIcon(item)}" class="ink-icon"><span class="tshop-name" style="color:${qColor(item)}">${item.name}${equippedSlotOf(player, item) ? ' <small>(equipada)</small>' : ''}</span>` +
            `<button class="${can ? 'primary-btn' : 'secondary-btn'}" ${can ? '' : 'disabled'}>${label}${price !== null ? ' · ' + price + 'g' : ''}</button>`;
        el.onmouseenter = () => hover(item);
        el.querySelector('button').onclick = () => { act(); renderSmith(); };
        return el;
    };
    // 1. Imbuir: pieza sin alma → poder
    const inf = document.getElementById('smith-infuse'); inf.innerHTML = '';
    const blanks = heroPieces(player).filter(i => i.blank);
    if (!blanks.length) inf.innerHTML = '<p class="subtitle">No tenés piezas sin alma. Salen en el botín, se compran acá o se hacen vaciando una pieza.</p>';
    blanks.forEach(item => inf.appendChild(row(item, smithPick === item ? 'Elegida' : 'Elegir', null, true, () => { smithPick = smithPick === item ? null : item; }, smithPick === item)));
    const pw = document.getElementById('smith-powers'); pw.innerHTML = '';
    const powers = codexUnlockedEntries(), cost = infuseCost(floor);
    if (!powers.length) pw.innerHTML = '<p class="subtitle">Tu Códice está vacío: llevá la habilidad de una pieza a su nivel máximo para dominarla (J para verlo).</p>';
    else if (!smithPick) pw.innerHTML = `<p class="subtitle">${powers.length} poder${powers.length > 1 ? 'es' : ''} en tu Códice. Elegí primero una pieza sin alma.</p>`;
    else powers.forEach(e => {
        const el = document.createElement('div'); el.className = 'tshop-row';
        const can = player.gold >= cost;
        el.innerHTML = `<img src="${inkSkillIcon(e.skill)}" class="ink-icon"><span class="tshop-name"><b>${e.skill.name}</b> <small>${codexKindLabel(e)} · de ${HERO_TEMPLATES[e.heroKey].name}</small></span>` +
            `<button class="${can ? 'primary-btn' : 'secondary-btn'}" ${can ? '' : 'disabled'}>Imbuir · ${cost}g</button>`;
        el.onmouseenter = () => { tip.innerHTML = codexEntryHtml(e); };
        el.querySelector('button').onclick = () => { if (infuseItem(player, smithPick, e.id)) smithPick = null; renderSmith(); };
        pw.appendChild(el);
    });
    // 2. Vaciar
    const pg = document.getElementById('smith-purge'); pg.innerHTML = '';
    const pc = purgeCost(floor);
    heroPieces(player).filter(i => !i.blank && i.slot !== 'weapon').forEach(item => pg.appendChild(row(item, 'Vaciar', pc, player.gold >= pc, () => purgeItem(player, item))));
    // 3. A la venta
    const st = document.getElementById('smith-stock'); st.innerHTML = '';
    s.stock.forEach(item => st.appendChild(row(item, 'Comprar', vendorPrice(item, s), player.gold >= vendorPrice(item, s), () => buyTowerItem(player, item, s))));
    if (!s.stock.length) st.innerHTML = '<p class="subtitle">No le queda nada.</p>';
    if (!tip.innerHTML) hover(null);
}

// --- VENTANA DEL CÓDICE (J) ---
let codexOpen = false;
function codexKindLabel(e) { return e.skill.isInnateItem ? 'Innato' : e.skill.kind === 'passive' ? 'Pasiva' : e.skill.isUltimate ? 'Definitiva' : 'Activa'; }
function codexEntryHtml(e) {
    const s = e.skill, un = codexUnlocked(e.id), lvl = s.isInnateItem ? 0 : (un ? e.max : Math.max(1, codex.best[e.id] || 1));
    const elKey = s.kind === 'active' && !s.isInnateItem ? skillVfx(s).el : null;
    return `<div class="tt-name">${un ? '📜' : '🔒'} ${s.name}</div>` +
        `<div class="tt-meta">${codexKindLabel(e)} de ${HERO_TEMPLATES[e.heroKey].name}${elKey ? ` · <span style="color:${ELEMENTS[elKey].c1}">◆ ${ELEMENT_NAMES[elKey]}</span>` : ''}</div>` +
        `<div>${s.isInnateItem ? s.description.replace(/^Innato:\s*/, '') : describeSkill(s, lvl)}</div>` +
        `<div class="tt-forged">${un ? 'Dominado: un Herrero puede imbuirlo en una pieza sin alma.' : `Para dominarlo: ${s.isInnateItem ? `subí su pieza (${TOWER_SLOTS[slotKind(e.slot)].name}) a nivel ${e.max}` : `llevá la habilidad a nivel ${e.max} forjando su pieza (${TOWER_SLOTS[slotKind(e.slot)].name})`}. Tu mejor marca: ${codex.best[e.id] || 0}/${e.max}.`}</div>`;
}
function toggleCodex(open = !codexOpen) {
    if (gameMode !== 'tower') return;
    codexOpen = open;
    showPanel('codex-container', open);
    if (open) renderCodex();
}
function renderCodex() {
    const all = codexEntries(), n = all.filter(e => codexUnlocked(e.id)).length;
    document.getElementById('codex-count').textContent = `${n}/${all.length} dominados`;
    const box = document.getElementById('codex-list'), tip = document.getElementById('codex-tooltip');
    box.innerHTML = '';
    Object.values(HERO_TEMPLATES).forEach(t => {
        const list = all.filter(e => e.heroKey === t.key);
        if (!list.length) return;
        const h = document.createElement('h4'); h.textContent = t.name; box.appendChild(h);
        const grid = document.createElement('div'); grid.className = 'codex-grid';
        list.forEach(e => {
            const un = codexUnlocked(e.id), best = codex.best[e.id] || 0;
            const card = document.createElement('div'); card.className = 'codex-card' + (un ? ' unlocked' : '');
            card.innerHTML = `<img src="${inkSkillIcon(e.skill)}" class="ink-icon"><span>${e.skill.name}</span>` +
                `<span class="codex-pips">${Array.from({ length: e.max }, (_, i) => (i < (un ? e.max : best) ? '◆' : '◇')).join('')}</span>`;
            card.onmouseenter = () => { tip.innerHTML = codexEntryHtml(e); };
            grid.appendChild(card);
        });
        box.appendChild(grid);
    });
    tip.innerHTML = '<span class="subtitle">Pasá el mouse por un poder. Lo dominado queda para siempre, aunque mueras o empieces otra run.</span>';
}

// --- IA (piloto automático y mediciones): imbuye en el herrero si tiene pieza sin alma y poderes que no lleva ---
function aiSmith(hero) {
    const level = hero.arena, s = level && level.town && level.town.smith;
    if (!s || !heroInTown(hero) || s.aiVisited) return;
    s.aiVisited = true;
    const owned = new Set(heroPieces(hero).map(i => i.skillId || i.innateId).filter(Boolean));
    heroPieces(hero).filter(i => i.blank).forEach(item => {
        const e = shuffle(codexUnlockedEntries().filter(x => !owned.has(x.id) && !x.skill.isInnateItem))[0];
        if (e && hero.gold >= infuseCost(level.floor) + 100 && infuseItem(hero, item, e.id)) owned.add(e.id);
    });
}
