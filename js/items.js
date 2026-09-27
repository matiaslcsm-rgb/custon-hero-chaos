// Inventario y tienda con recetas estilo Dota 2: 6 espacios; los básicos se pueden repetir; los compuestos
// se arman con básicos + receta (usando los componentes que ya tenés y pagando solo lo que falta).
// Los equipables dan sus bonus como efectos permanentes del héroe (ver applyInventory).
// Reglas: DISEÑO.md §7. Datos de los ítems: data/items.js.

const INVENTORY_SLOTS = 6;
const SELL_REFUND = 0.5; // al vender se recupera la mitad de lo que costó el ítem

function isEquip(item) { return item.tier === 'basic' || item.tier === 'composite'; }
function countItem(hero, key) { return hero.inventory.filter(i => i.key === key).length; }

// Precio total de un ítem (un compuesto suma sus componentes y la receta).
function itemTotalCost(item) {
    if (item.tier === 'composite') return item.recipe + item.components.reduce((s, k) => s + itemTotalCost(ITEMS[k]), 0);
    return typeof item.cost === 'function' ? null : item.cost;
}

// Componentes de un compuesto que el héroe ya tiene (used, uno por cada uno pedido) y los que le faltan (missing).
function recipeStatus(hero, item) {
    const pool = hero.inventory.map(i => i.key);
    const used = [], missing = [];
    item.components.forEach(k => {
        const idx = pool.indexOf(k);
        if (idx >= 0) { used.push(k); pool.splice(idx, 1); } else missing.push(k);
    });
    return { used, missing };
}

// Lo que cuesta comprarlo ahora (en un compuesto: los componentes que faltan + la receta).
function itemCost(item, hero) {
    if (item.tier === 'composite') return item.recipe + recipeStatus(hero, item).missing.reduce((s, k) => s + itemTotalCost(ITEMS[k]), 0);
    return typeof item.cost === 'function' ? item.cost(hero) : item.cost;
}

// Motivo por el que no se puede comprar (null = se puede). No mira el oro.
function itemBlocker(item, hero) {
    if (!isEquip(item)) return item.available && !item.available(hero) ? 'No disponible' : null;
    if (item.tier === 'composite' && countItem(hero, item.key) > 0) return 'Ya lo tenés';
    const freed = item.tier === 'composite' ? recipeStatus(hero, item).used.length : 0;
    if (hero.inventory.length - freed + 1 > INVENTORY_SLOTS) return 'Inventario lleno';
    return null;
}
function itemAvailable(item, hero) { return !itemBlocker(item, hero); }

// Rehace los efectos de todos los ítems del inventario (uno permanente por ítem).
function applyInventory(hero) {
    hero.effects = hero.effects.filter(e => !e.flags.includes('item'));
    hero.inventory.forEach((inv, i) => {
        const item = ITEMS[inv.key];
        addEffect(hero, {
            id: `ITEM_${inv.key}_${i}`, name: item.name, duration: Infinity,
            flags: ['persistent', 'item', ...(item.flags || [])], mods: item.mods, hooks: item.hooks ? item.hooks(item) : {}
        });
    });
    if (hero.neutral) {
        const n = NEUTRAL_ITEMS[hero.neutral];
        addEffect(hero, { id: 'NEUTRAL', name: n.name, duration: Infinity, flags: ['persistent', 'item'], mods: n.mods || {}, hooks: n.hooks ? n.hooks(n) : {} });
    }
    hero.recalculateStats();
}

function buyItem(item, hero = player) {
    const blocker = itemBlocker(item, hero);
    if (blocker) { log(`❌ ${item.name}: ${blocker}.`); return false; }
    const cost = itemCost(item, hero);
    if (hero.gold < cost) { log('❌ Oro insuficiente'); return false; }
    hero.gold -= cost;
    if (item.tier === 'composite') {
        const { used } = recipeStatus(hero, item);
        used.forEach(k => { hero.inventory.splice(hero.inventory.findIndex(i => i.key === k), 1); });
        hero.inventory.push({ key: item.key });
        applyInventory(hero);
        log(`🔨 Armaste ${item.name}${used.length ? ` (usando ${used.map(k => ITEMS[k].name).join(', ')})` : ''}.`);
    } else if (item.tier === 'basic') {
        hero.inventory.push({ key: item.key });
        applyInventory(hero);
        log(`🎒 Compraste: ${item.name}.`);
    } else {
        item.apply(hero);
        hero.recalculateStats();
        log(`Compraste: ${item.name}`);
    }
    if (hero === player) renderShop();
    return true;
}

// Vende una unidad del ítem: devuelve la mitad de su precio total.
function sellItem(key, hero = player) {
    const idx = hero.inventory.findIndex(i => i.key === key);
    if (idx < 0) return 0;
    const refund = Math.floor(itemTotalCost(ITEMS[key]) * SELL_REFUND);
    hero.inventory.splice(idx, 1);
    hero.gold += refund;
    applyInventory(hero);
    log(`💰 Vendiste ${ITEMS[key].name} (+${refund}g).`);
    if (hero === player) renderShop();
    return refund;
}

// Da un ítem directamente (sin oro): para pruebas y, más adelante, premios.
function giveItem(hero, key) {
    hero.inventory.push({ key });
    applyInventory(hero);
}

// Descripción de un ítem equipable: sus mods en texto + lo especial.
const MOD_LABELS = {
    str: v => `+${v} Fuerza`, agi: v => `+${v} Agilidad`, int: v => `+${v} Inteligencia`,
    flatAtk: v => `+${v} daño`, atkSpeedPct: v => `+${Math.round(v * 100)}% vel. de ataque`, critChance: v => `+${v}% crítico`,
    armor: v => `+${v} armadura`, magicResist: v => `+${v}% resistencia mágica`, maxHp: v => `+${v} vida`, hpRegen: v => `+${v} vida/s`,
    maxMana: v => `+${v} maná`, manaRegen: v => `+${v} maná/s`, lifesteal: v => `+${v}% robo de vida`, spellAmp: v => `+${v}% amplificación de hechizo`,
    moveSpeedPct: v => `+${Math.round(v * 100)}% vel. de movimiento`, statusResist: v => `${Math.round(v * 100)}% menos duración de control`
};
function describeItem(item) {
    if (!isEquip(item)) return item.desc;
    const stats = Object.entries(item.mods || {}).map(([k, v]) => (MOD_LABELS[k] ? MOD_LABELS[k](v) : `${k} ${v}`));
    const special = item.special ? item.special.replace(/\.$/, '') : '';
    return [stats.join(', '), special].filter(Boolean).join('. ') + '.';
}
