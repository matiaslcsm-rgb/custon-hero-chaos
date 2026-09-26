// Ítems de la tienda. apply() modifica al héroe; después se llama a recalculateStats().
const ITEMS = {
    BELT: { name: 'Cinturón de Fuerza (75g)', cost: 75, desc: '+6 STR (más HP y daño)', apply: h => { h.str += 6; } },
    GLOVES: { name: 'Guantes de Celeridad (100g)', cost: 100, desc: '+10 AGI (más vel. ataque y movimiento)', apply: h => { h.agi += 10; } },
    POTION: { name: 'Poción de Vida (40g)', cost: 40, desc: 'Cura 50 HP al instante', apply: h => { h.hp = Math.min(h.maxHp, h.hp + 50); } },
    // Precio provisorio (pregunta abierta en DISEÑO.md §11). Se guarda en el inventario del destino para usar o vender.
    FRAGMENT: { name: 'Fragmento del Destino (150g)', cost: 150, desc: 'Quita una de tus habilidades al azar (devuelve sus puntos) y te ofrece 4 nuevas para elegir. Se puede vender por 75g.', apply: h => { h.destiny.fragments++; } }
};
