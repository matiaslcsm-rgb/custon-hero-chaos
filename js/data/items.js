// Ítems de la tienda. Reglas: DISEÑO.md §7.
//
// Dos clases:
//   kind 'equip'   ocupa un espacio del inventario (6). Comprarlo de nuevo lo sube de nivel (hasta 3).
//                  costs: precio de cada nivel; values: números por nivel (como las habilidades);
//                  description: con marcadores {clave} / {clave%}; effect(level): { mods, flags, hooks }
//                  que el héroe tiene mientras lo lleva (ver applyInventory en items.js).
//                  counters (opcional): texto de qué contrarresta.
//   kind 'instant' se usa al comprarlo y no ocupa espacio: cost (número o función), desc, apply(héroe),
//                  available (opcional): función (héroe) => si aparece en la tienda.

const ITEMS = {
    // --- ATRIBUTOS ---
    BELT: {
        key: 'BELT', name: 'Cinturón de Fuerza', kind: 'equip', category: 'Atributos', costs: [75, 110, 150],
        values: { str: [6, 12, 20] },
        description: '+{str} de Fuerza (más vida; más daño si sos de Fuerza).',
        effect(level) { return { mods: { str: valueAt(this, 'str', level) } }; }
    },
    GLOVES: {
        key: 'GLOVES', name: 'Guantes de Celeridad', kind: 'equip', category: 'Atributos', costs: [90, 130, 170],
        values: { agi: [8, 16, 26] },
        description: '+{agi} de Agilidad (vel. de ataque, movimiento y armadura; más daño si sos de Agilidad).',
        effect(level) { return { mods: { agi: valueAt(this, 'agi', level) } }; }
    },
    TOME: {
        key: 'TOME', name: 'Túnica del Mago', kind: 'equip', category: 'Atributos', costs: [90, 130, 170],
        values: { int: [8, 16, 26] },
        description: '+{int} de Inteligencia (maná, amplificación y resistencia mágica; más daño si sos de Inteligencia).',
        effect(level) { return { mods: { int: valueAt(this, 'int', level) } }; }
    },

    // --- CONTRAS DE CREEPS (DISEÑO.md §8) ---
    CLOAK: {
        key: 'CLOAK', name: 'Capa Antimagia', kind: 'equip', category: 'Contras', costs: [60, 90, 120], counters: 'Chamanes y daño mágico',
        values: { magicResist: [25, 35, 45] },
        description: '+{magicResist}% de resistencia mágica.',
        effect(level) { return { mods: { magicResist: valueAt(this, 'magicResist', level) } }; }
    },
    TRUESTRIKE: {
        key: 'TRUESTRIKE', name: 'Hoja Certera', kind: 'equip', category: 'Contras', costs: [75, 110, 150], counters: 'Espectros y evasión',
        values: { flatAtk: [0, 8, 16] },
        description: 'Tus ataques básicos no se pueden esquivar. +{flatAtk} de daño de ataque.',
        effect(level) { return { flags: ['trueStrike'], mods: { flatAtk: valueAt(this, 'flatAtk', level) } }; }
    },
    SPEAR: {
        key: 'SPEAR', name: 'Lanza Cortacuras', kind: 'equip', category: 'Contras', costs: [65, 100, 140], counters: 'Sanadores y robo de vida',
        values: { antiHeal: [0.4, 0.6, 0.8], duration: 3 },
        description: 'Todo tu daño reduce {antiHeal%} la curación del objetivo por {duration}s.',
        effect(level) {
            const antiHeal = valueAt(this, 'antiHeal', level), duration = valueAt(this, 'duration', level);
            return { hooks: { onDealDamage(owner, { target }) {
                if (target.isAlive()) addEffect(target, { id: 'ANTIHEAL', name: 'Cortacuras', duration, tags: ['PERJUICIO'], mods: { healingTakenPct: -antiHeal } });
            } } };
        }
    },
    HAMMER: {
        key: 'HAMMER', name: 'Martillo Rompecorazas', kind: 'equip', category: 'Contras', costs: [70, 105, 140], counters: 'Acorazados y armadura alta',
        values: { armorPerHit: [1.5, 2, 3], maxStacks: 4, duration: 4 },
        description: 'Cada ataque básico quita {armorPerHit} de armadura al objetivo por {duration}s (acumula hasta {maxStacks} veces).',
        effect(level) {
            const perHit = valueAt(this, 'armorPerHit', level), maxStacks = valueAt(this, 'maxStacks', level), duration = valueAt(this, 'duration', level);
            return { hooks: { onHit(owner, { target }) {
                if (!target.isAlive()) return;
                const current = getEffect(target, 'ARMOR_BREAK');
                const stacks = Math.min(maxStacks, (current ? current.data.stacks : 0) + 1);
                addEffect(target, { id: 'ARMOR_BREAK', name: 'Coraza rota', duration, tags: ['PERJUICIO'], mods: { armor: -perHit * stacks }, data: { stacks } });
            } } };
        }
    },
    BOOTS: {
        key: 'BOOTS', name: 'Botas Firmes', kind: 'equip', category: 'Contras', costs: [50, 80, 110], counters: 'Aturdidores y control',
        values: { statusResist: [0.35, 0.5, 0.65], moveSpeedPct: [0, 0.05, 0.1] },
        description: 'Los aturdimientos y ralentizaciones te duran {statusResist%} menos. +{moveSpeedPct%} de velocidad de movimiento.',
        effect(level) { return { mods: { statusResist: valueAt(this, 'statusResist', level), moveSpeedPct: valueAt(this, 'moveSpeedPct', level) } }; }
    },

    // --- DE USO INMEDIATO (no ocupan espacio) ---
    POTION: { key: 'POTION', name: 'Poción de Vida', kind: 'instant', category: 'Otros', cost: 40, desc: 'Cura 50 HP al instante.', apply: h => { healUnit(h, 50); } },
    // Precio provisorio (pregunta abierta en DISEÑO.md §11). Va al inventario del destino para usar o vender.
    FRAGMENT: { key: 'FRAGMENT', name: 'Fragmento del Destino', kind: 'instant', category: 'Otros', cost: 150, desc: 'Quita una de tus habilidades al azar (devuelve sus puntos) y te ofrece 4 nuevas para elegir. Se puede vender por 75g.', apply: h => { h.destiny.fragments++; } },
    // Solo aparece estando Condenado (ver death.js).
    GREED: {
        key: 'GREED', name: 'Injusticia de los Codiciosos', kind: 'instant', category: 'Otros', cost: h => greedCost(h), available: h => isCondemned(h),
        desc: 'Comprás 1 vida y dejás de estar Condenado. Si volvés a quedar sin vidas, tu castigo de daño recibido se duplica. Cada compra cuesta el doble.',
        apply: h => buyGreedLife(h)
    }
};
