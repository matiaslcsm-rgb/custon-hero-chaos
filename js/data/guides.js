// Guía de ítems sugeridos para cada héroe: qué comprar al principio, el núcleo de la build y qué sumar al final.
// Se muestra en la tienda (pestaña "⭐ Guía" y una ⭐ en los ítems sugeridos) y en el códice de Héroes.
// Son sugerencias: los contras de cada oleada (ver el aviso en la tienda) siguen siendo importantes.
// why: por qué esa build, en una línea.

const BUILD_GUIDES = {
    AXE: {
        why: 'Tanque que pega cuando lo golpean: vida y armadura para aguantar y devolver daño con Contraataque y Espinas.',
        early: ['CHAINMAIL', 'VITALITY'], core: ['THORNS', 'HEART', 'BOOTS'], late: ['AEGIS', 'CRIMSON']
    },
    SNIPER: {
        why: 'Daño a distancia: velocidad de ataque y crítico, con Hoja Certera para que no le esquiven.',
        early: ['BLADE', 'QUICK_GLOVES'], core: ['TRUESTRIKE', 'SWIFT_BLADE', 'GLOVES'], late: ['HAMMER', 'SKADI']
    },
    ASSASSIN: {
        why: 'Críticos enormes cuerpo a cuerpo: más crítico y velocidad, y robo de vida para sostenerse.',
        early: ['FANG', 'BLADE'], core: ['SWIFT_BLADE', 'CRIMSON', 'TRUESTRIKE'], late: ['HAMMER', 'BOOTS']
    },
    VAMPIRE: {
        why: 'Se cura pegando: robo de vida y fuerza, y vida extra para que Forma Inmortal rinda más.',
        early: ['VAMP_MASK', 'VITALITY'], core: ['CRIMSON', 'BELT', 'HEART'], late: ['THORNS', 'AEGIS']
    },
    ARCANIST: {
        why: 'Ráfagas mágicas: maná, inteligencia y amplificación de hechizos; defensa mágica para los duelos.',
        early: ['MANA_CRYSTAL', 'BRANCH_INT'], core: ['ARCANE_STAFF', 'TOME', 'CLOAK'], late: ['AEGIS', 'DIADEM']
    },
    FROSTWITCH: {
        why: 'Control en área: hechizos más fuertes, resistencia al control y ralentizar también con el ataque.',
        early: ['MANA_CRYSTAL', 'RUNE_CAPE'], core: ['ARCANE_STAFF', 'TOME', 'BOOTS'], late: ['SKADI', 'AEGIS']
    },
    NECROMANCER: {
        why: 'Desgaste y drenaje: vida y maná para pelear largo, y resistencia mágica contra los magos.',
        early: ['VITALITY', 'MANA_CRYSTAL'], core: ['ARCANE_STAFF', 'HEART', 'CLOAK'], late: ['AEGIS', 'DIADEM']
    },
    VOIDSAGE: {
        why: 'Entra y sale con teletransportes: movilidad, maná y amplificación para la ráfaga en área.',
        early: ['TRAVEL_BOOTS', 'MANA_CRYSTAL'], core: ['ARCANE_STAFF', 'BOOTS', 'TOME'], late: ['AEGIS', 'CLOAK']
    },
    ALCHEMIST: {
        why: 'Ácido que baja la armadura: anticuración y rompe corazas para que su daño y el de sus ataques rindan.',
        early: ['SERRATED', 'MANA_CRYSTAL'], core: ['ARCANE_STAFF', 'SPEAR', 'TOME'], late: ['HAMMER', 'HEART']
    },
    DANCER: {
        why: 'Pega mientras se mueve: velocidad de ataque y movimiento para cargar la Danza, y Hoja Certera contra la evasión.',
        early: ['BLADE', 'QUICK_GLOVES'], core: ['SWIFT_BLADE', 'GLOVES', 'TRAVEL_BOOTS'], late: ['HAMMER', 'TRUESTRIKE']
    }
};

const GUIDE_STAGES = [['early', 'Inicio'], ['core', 'Núcleo'], ['late', 'Final']];

function guideOf(hero) { return BUILD_GUIDES[hero.key || hero] || null; }
function isSuggested(hero, key) { const g = guideOf(hero); return !!g && GUIDE_STAGES.some(([s]) => g[s].includes(key)); }
