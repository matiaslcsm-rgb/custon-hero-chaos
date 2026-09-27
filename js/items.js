// Inventario y tienda: 6 espacios con ítems equipables que suben de nivel (hasta 3), vender, e ítems de
// uso inmediato. Los ítems equipables dan sus bonus como efectos permanentes del héroe (ver applyInventory).
// Reglas: DISEÑO.md §7. Datos de los ítems: data/items.js.

const INVENTORY_SLOTS = 6;
const ITEM_MAX_LEVEL = 3;
const SELL_REFUND = 0.5; // al vender se recupera la mitad de todo lo gastado en ese ítem

function inventoryItem(hero, key) { return hero.inventory.find(i => i.key === key) || null; }
function itemLevel(hero, key) { const inv = inventoryItem(hero, key); return inv ? inv.level : 0; }

// Precio de la próxima compra (en los equipables, el del próximo nivel).
function itemCost(item, hero) {
    if (item.kind === 'equip') return item.costs[Math.min(itemLevel(hero, item.key), ITEM_MAX_LEVEL - 1)];
    return typeof item.cost === 'function' ? item.cost(hero) : item.cost;
}

// Motivo por el que no se puede comprar (null = se puede). No mira el oro.
function itemBlocker(item, hero) {
    if (item.kind === 'equip') {
        const level = itemLevel(hero, item.key);
        if (level >= ITEM_MAX_LEVEL) return 'Nivel máximo';
        if (level === 0 && hero.inventory.length >= INVENTORY_SLOTS) return 'Inventario lleno';
        return null;
    }
    return item.available && !item.available(hero) ? 'No disponible' : null;
}
function itemAvailable(item, hero) { return !itemBlocker(item, hero); }

// Rehace los efectos de todos los ítems del inventario (uno permanente por ítem, según su nivel).
function applyInventory(hero) {
    hero.effects = hero.effects.filter(e => !e.flags.includes('item'));
    hero.inventory.forEach(inv => {
        const item = ITEMS[inv.key];
        const fx = item.effect(inv.level);
        addEffect(hero, {
            id: 'ITEM_' + inv.key, name: `${item.name} ${inv.level}`, duration: Infinity,
            flags: ['persistent', 'item', ...(fx.flags || [])], mods: fx.mods, hooks: fx.hooks
        });
    });
    hero.recalculateStats();
}

function buyItem(item, hero = player) {
    const blocker = itemBlocker(item, hero);
    if (blocker) { log(`❌ ${item.name}: ${blocker}.`); return false; }
    const cost = itemCost(item, hero);
    if (hero.gold < cost) { log('❌ Oro insuficiente'); return false; }
    hero.gold -= cost;
    if (item.kind === 'equip') {
        const inv = inventoryItem(hero, item.key);
        if (inv) { inv.level++; inv.spent += cost; } else hero.inventory.push({ key: item.key, level: 1, spent: cost });
        applyInventory(hero);
        log(inv ? `⬆️ ${item.name} sube a nivel ${inv.level}.` : `🎒 Compraste: ${item.name}.`);
    } else {
        item.apply(hero);
        hero.recalculateStats();
        log(`Compraste: ${item.name}`);
    }
    if (hero === player) renderShop();
    return true;
}

function sellItem(key, hero = player) {
    const inv = inventoryItem(hero, key);
    if (!inv) return 0;
    const refund = Math.floor(inv.spent * SELL_REFUND);
    hero.inventory = hero.inventory.filter(i => i !== inv);
    hero.gold += refund;
    applyInventory(hero);
    log(`💰 Vendiste ${ITEMS[key].name} (+${refund}g).`);
    if (hero === player) renderShop();
    return refund;
}

// Da un ítem directamente (sin oro): para pruebas y, más adelante, premios.
function giveItem(hero, key, level = 1) {
    const inv = inventoryItem(hero, key);
    if (inv) inv.level = level; else hero.inventory.push({ key, level, spent: 0 });
    applyInventory(hero);
}
