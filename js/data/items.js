// Ítems de la tienda. apply() modifica al héroe; después se llama a recalculateStats().
// cost: número o función (héroe) => número. available (opcional): función (héroe) => si aparece en la tienda.
const ITEMS = {
    BELT: { name: 'Cinturón de Fuerza', cost: 75, desc: '+6 STR (más HP y daño)', apply: h => { h.str += 6; } },
    GLOVES: { name: 'Guantes de Celeridad', cost: 100, desc: '+10 AGI (más vel. ataque, movimiento y armadura)', apply: h => { h.agi += 10; } },
    TOME: { name: 'Túnica del Mago', cost: 100, desc: '+10 INT (más maná, amplificación de hechizo y resistencia mágica)', apply: h => { h.int += 10; } },
    POTION: { name: 'Poción de Vida', cost: 40, desc: 'Cura 50 HP al instante', apply: h => { h.hp = Math.min(h.maxHp, h.hp + 50); } },
    // Precio provisorio (pregunta abierta en DISEÑO.md §11). Se guarda en el inventario del destino para usar o vender.
    FRAGMENT: { name: 'Fragmento del Destino', cost: 150, desc: 'Quita una de tus habilidades al azar (devuelve sus puntos) y te ofrece 4 nuevas para elegir. Se puede vender por 75g.', apply: h => { h.destiny.fragments++; } },
    // Solo aparece estando Condenado (ver death.js).
    GREED: {
        name: 'Injusticia de los Codiciosos', cost: h => greedCost(h), available: h => isCondemned(h),
        desc: 'Comprás 1 vida y dejás de estar Condenado. Si volvés a quedar sin vidas, tu castigo de daño recibido se duplica. Cada compra cuesta el doble.',
        apply: h => buyGreedLife(h)
    }
};
