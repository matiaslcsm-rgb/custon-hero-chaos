// Cuerpos físicos: las unidades no se atraviesan libremente. Entrar a una casilla ocupada por otra unidad viva (héroe,
// creep o jefe) cuesta más tiempo según el tamaño del que está ahí ("cuerpo blando": nunca te quedás trabado).
// Reglas: DISEÑO.md §8 bis.
//
//   Tamaño     quiénes                                   el paso tarda
//   chico      Chusma, Enjambre (type.size = 'small')    +25%
//   mediano    héroes y creeps normales                  +75%
//   grande     jefes de oleada y jefes de ronda          +150%
//
// Los creeps, además, prueban otro camino libre antes de empujar. Las habilidades que teletransportan o saltan no
// frenan, y con el estado 'phasing' (ej: Paso Fantasma) se atraviesa todo sin frenar.

const BODY_SLOW = { small: 0.25, medium: 0.75, large: 1.5 };
let BODIES_ON = true; // se puede apagar para medir

function bodySize(u) {
    if (u.isRoundBoss || u.isBoss) return 'large';
    if (u.type && u.type.size) return u.type.size;
    return 'medium';
}

// Unidades vivas de la arena que ocupan una casilla (sin contar a `self`).
function bodiesAt(arena, x, y, self) {
    if (!arena) return [];
    const heroes = arena.heroes.filter(h => !h.eliminated && !h.inRest && h.isAlive());
    return [...heroes, ...arena.creeps.filter(c => c.isAlive())].filter(u => u !== self && u.x === x && u.y === y);
}

// Cuánto más tarda `unit` en entrar a (x, y): 0 si está libre o si atraviesa cuerpos.
function bodyPenalty(unit, x, y) {
    if (!BODIES_ON || (unit.effects && hasFlag(unit, 'phasing'))) return 0;
    return bodiesAt(unit.arena, x, y, unit).reduce((m, u) => Math.max(m, BODY_SLOW[bodySize(u)]), 0);
}
