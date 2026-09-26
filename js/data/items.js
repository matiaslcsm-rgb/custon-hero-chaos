// Ítems de la tienda. apply() modifica al héroe; después se llama a recalculateStats().
// cost: número o función (héroe) => número. available (opcional): función (héroe) => si aparece en la tienda.
// counters (opcional): texto de qué contrarresta, para la tienda.

// Ítem de contra: se compra una sola vez y queda como efecto permanente del héroe (no se pierde al morir).
function counterItem(key, name, cost, desc, counters, effect) {
    return {
        name, cost, desc, counters, unique: true,
        available: h => !getEffect(h, 'ITEM_' + key),
        apply: h => addEffect(h, { id: 'ITEM_' + key, name, duration: Infinity, flags: ['persistent', 'item', ...(effect.flags || [])], mods: effect.mods, hooks: effect.hooks })
    };
}

const ITEMS = {
    BELT: { name: 'Cinturón de Fuerza', cost: 75, desc: '+6 STR (más HP y daño)', apply: h => { h.str += 6; } },
    GLOVES: { name: 'Guantes de Celeridad', cost: 100, desc: '+10 AGI (más vel. ataque, movimiento y armadura)', apply: h => { h.agi += 10; } },
    TOME: { name: 'Túnica del Mago', cost: 100, desc: '+10 INT (más maná, amplificación de hechizo y resistencia mágica)', apply: h => { h.int += 10; } },
    POTION: { name: 'Poción de Vida', cost: 40, desc: 'Cura 50 HP al instante', apply: h => { h.hp = Math.min(h.maxHp, h.hp + 50); } },
    // Precio provisorio (pregunta abierta en DISEÑO.md §11). Se guarda en el inventario del destino para usar o vender.
    FRAGMENT: { name: 'Fragmento del Destino', cost: 150, desc: 'Quita una de tus habilidades al azar (devuelve sus puntos) y te ofrece 4 nuevas para elegir. Se puede vender por 75g.', apply: h => { h.destiny.fragments++; } },
    // --- Contras de creeps (DISEÑO.md §8) ---
    // Precios medidos: a 100-150g rendían menos que gastar en atributos; gratis subían las victorias de 69% a 89%.
    CLOAK: counterItem('CLOAK', 'Capa Antimagia', 60, '+25% de resistencia mágica.', 'Chamanes y daño mágico', { mods: { magicResist: 25 } }),
    TRUESTRIKE: counterItem('TRUESTRIKE', 'Hoja Certera', 75, 'Tus ataques básicos no se pueden esquivar.', 'Espectros y evasión', { flags: ['trueStrike'] }),
    SPEAR: counterItem('SPEAR', 'Lanza Cortacuras', 65, 'Todo tu daño reduce 50% la curación del objetivo por 3s.', 'Sanadores y robo de vida', {
        hooks: { onDealDamage(owner, { target }) { if (target.isAlive()) addEffect(target, { id: 'ANTIHEAL', name: 'Cortacuras', duration: 3, tags: ['PERJUICIO'], mods: { healingTakenPct: -0.5 } }); } }
    }),
    HAMMER: counterItem('HAMMER', 'Martillo Rompecorazas', 70, 'Cada ataque básico quita 2 de armadura al objetivo por 4s (acumula hasta -8).', 'Acorazados y armadura alta', {
        hooks: {
            onHit(owner, { target }) {
                if (!target.isAlive()) return;
                const stacks = Math.min(4, ((getEffect(target, 'ARMOR_BREAK') || { data: { stacks: 0 } }).data.stacks) + 1);
                addEffect(target, { id: 'ARMOR_BREAK', name: 'Coraza rota', duration: 4, tags: ['PERJUICIO'], mods: { armor: -2 * stacks }, data: { stacks } });
            }
        }
    }),
    BOOTS: counterItem('BOOTS', 'Botas Firmes', 50, 'Los aturdimientos y ralentizaciones te duran 50% menos.', 'Aturdidores y control', { mods: { statusResist: 0.5 } }),
    // Solo aparece estando Condenado (ver death.js).
    GREED: {
        name: 'Injusticia de los Codiciosos', cost: h => greedCost(h), available: h => isCondemned(h),
        desc: 'Comprás 1 vida y dejás de estar Condenado. Si volvés a quedar sin vidas, tu castigo de daño recibido se duplica. Cada compra cuesta el doble.',
        apply: h => buyGreedLife(h)
    }
};
