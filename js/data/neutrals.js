// Objetos neutrales (DISEÑO.md §9 bis): se ganan al derrotar a un jefe de ronda. Van en un espacio aparte del inventario
// y solo se puede tener uno. Cada jefe ofrece 3 del escalón siguiente (tier 1 = ronda 5, 2 = ronda 10, 3 = ronda 15,
// 4 = ronda 20): te quedás con uno (reemplaza al que tenías) o seguís con el tuyo. Se venden por NEUTRAL_SELL_PER_TIER × tier.
//
//   fits: atributos principales a los que les sirve más (lo usa la IA para elegir).
//   Mismo formato que los ítems equipables: mods, special y hooks (ver items.js).

const NEUTRAL_SELL_PER_TIER = 60;

const NEUTRAL_ITEMS = {
    // ============================================================ ESCALÓN 1 (ronda 5)
    BRUTE_AMULET: { key: 'BRUTE_AMULET', name: 'Amuleto del Bruto', tier: 1, fits: ['STR'], mods: { str: 6, armor: 2 } },
    STALKER_DAGGER: { key: 'STALKER_DAGGER', name: 'Daga del Acechador', tier: 1, fits: ['AGI'], mods: { agi: 6, atkSpeedPct: 0.08 } },
    APPRENTICE_STONE: { key: 'APPRENTICE_STONE', name: 'Piedra del Aprendiz', tier: 1, fits: ['INT'], mods: { int: 6, manaRegen: 1.5 } },
    EXPLORER_LANTERN: { key: 'EXPLORER_LANTERN', name: 'Farol del Explorador', tier: 1, fits: ['STR', 'AGI', 'INT'], mods: { moveSpeedPct: 0.12, hpRegen: 2 } },
    WOLF_FANG: { key: 'WOLF_FANG', name: 'Colmillo de Lobo', tier: 1, fits: ['STR', 'AGI'], mods: { flatAtk: 6, lifesteal: 6 } },

    // ============================================================ ESCALÓN 2 (ronda 10)
    OAK_SHIELD: { key: 'OAK_SHIELD', name: 'Escudo de Roble', tier: 2, fits: ['STR'], mods: { armor: 4, maxHp: 150 } },
    SHARP_CLAW: { key: 'SHARP_CLAW', name: 'Garra Afilada', tier: 2, fits: ['AGI'], mods: { flatAtk: 10, critChance: 10 } },
    ARCANE_RING: { key: 'ARCANE_RING', name: 'Anillo Arcano', tier: 2, fits: ['INT'], mods: { spellAmp: 10, maxMana: 100, int: 4 } },
    PILGRIM_MANTLE: { key: 'PILGRIM_MANTLE', name: 'Manto del Peregrino', tier: 2, fits: ['STR', 'INT'], mods: { magicResist: 15, moveSpeedPct: 0.08, hpRegen: 3 } },
    TENACITY_CHARM: { key: 'TENACITY_CHARM', name: 'Talismán de Tenacidad', tier: 2, fits: ['STR', 'AGI', 'INT'], mods: { statusResist: 0.3, maxHp: 100 } },

    // ============================================================ ESCALÓN 3 (ronda 15)
    COLOSSUS_PLATES: { key: 'COLOSSUS_PLATES', name: 'Placas del Coloso', tier: 3, fits: ['STR'], mods: { armor: 6, maxHp: 300 } },
    EXECUTIONER_AXE: {
        key: 'EXECUTIONER_AXE', name: 'Hacha del Verdugo', tier: 3, fits: ['STR', 'AGI'], mods: { flatAtk: 20 },
        special: 'Tus ataques básicos hacen +30% de daño a enemigos con menos del 30% de vida.',
        hooks: () => ({ beforeAttack(owner, ctx) { if (ctx.target && ctx.target.hp / ctx.target.maxHp < 0.3) ctx.dmg *= 1.3; } })
    },
    STORM_BOOTS: { key: 'STORM_BOOTS', name: 'Botas del Huracán', tier: 3, fits: ['AGI'], mods: { atkSpeedPct: 0.25, moveSpeedPct: 0.1, agi: 5 } },
    ARCHMAGE_ORB: { key: 'ARCHMAGE_ORB', name: 'Orbe del Archimago', tier: 3, fits: ['INT'], mods: { spellAmp: 20, int: 8 } },
    BLOOD_CHALICE: {
        key: 'BLOOD_CHALICE', name: 'Cáliz Sangriento', tier: 3, fits: ['STR', 'AGI'], mods: { lifesteal: 12, maxHp: 100 },
        special: 'Cada baja te cura el 4% de tu vida máxima.',
        hooks: () => ({ onKill(owner) { healUnit(owner, owner.maxHp * 0.04); } })
    },

    // ============================================================ ESCALÓN 4 (ronda 20)
    DOOM_SWORD: { key: 'DOOM_SWORD', name: 'Espada del Apocalipsis', tier: 4, fits: ['STR', 'AGI'], mods: { flatAtk: 35, critChance: 15 } },
    CROWN_OF_THREE: { key: 'CROWN_OF_THREE', name: 'Corona de los Tres', tier: 4, fits: ['STR', 'AGI', 'INT'], mods: { str: 15, agi: 15, int: 15 } },
    PHOENIX_HEART: { key: 'PHOENIX_HEART', name: 'Corazón del Fénix', tier: 4, fits: ['STR'], mods: { maxHp: 450, hpRegen: 8 } },
    FORBIDDEN_GRIMOIRE: { key: 'FORBIDDEN_GRIMOIRE', name: 'Grimorio Prohibido', tier: 4, fits: ['INT'], mods: { spellAmp: 35, maxMana: 250 } },
    BROKEN_CLOCK: { key: 'BROKEN_CLOCK', name: 'Reloj del Tiempo Roto', tier: 4, fits: ['AGI', 'INT'], mods: { atkSpeedPct: 0.4, statusResist: 0.4 } }
};

// Precio de venta de un neutral.
function neutralSellPrice(key) { return NEUTRAL_ITEMS[key].tier * NEUTRAL_SELL_PER_TIER; }
