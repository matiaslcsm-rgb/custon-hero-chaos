// Pozo de enemigos, tamaño de la partida y recompensa de oro.

// xp: experiencia que da al morir (el jefe da BOSS_XP).
// armor / magicResist: opcionales (0 si no se indican). El jefe suma +2 de armadura.
const BOSS_XP = 120;
const CREEP_POOL = [
    { key: 'CHUSMA', symbol: 'x', color: '#6c757d', hp: 1, atk: 4, atkSpeed: 1.0, moveInterval: 220, range: 1.0, gold: 4, xp: 6, label: 'Chusma', oneHit: true },
    { key: 'GRUNT', symbol: 'g', color: '#ffb703', hp: 35, atk: 8, atkSpeed: 0.8, moveInterval: 260, range: 1.3, gold: 6, xp: 18, armor: 1, label: 'Grunt' },
    { key: 'ARCHER', symbol: 'r', color: '#8ecae6', hp: 22, atk: 10, atkSpeed: 0.9, moveInterval: 300, range: 4.5, gold: 7, xp: 18, label: 'Arquero' },
    { key: 'SCOUT', symbol: 's', color: '#ff477e', hp: 18, atk: 6, atkSpeed: 1.4, moveInterval: 150, range: 1.2, gold: 5, xp: 14, label: 'Explorador' },
    { key: 'BRUTE', symbol: 'b', color: '#e63946', hp: 60, atk: 14, atkSpeed: 0.6, moveInterval: 340, range: 1.4, gold: 10, xp: 28, armor: 3, label: 'Bruto' }
];
// Plantillas normales, sin contar la Chusma (no debe aparecer como base del jefe: un jefe de 1 HP no tiene sentido)
const BOSS_BASE_POOL = CREEP_POOL.filter(t => !t.oneHit);

const NORMAL_WAVES = 4; // ciclos de oleada+draft antes de la oleada de jefe final

// Bonus de oro por velocidad de muerte: cuanto antes muere un creep tras aparecer, más oro paga.
function speedGoldMultiplier(timeAliveSeconds) {
    if (timeAliveSeconds <= 1) return 3;
    if (timeAliveSeconds >= 6) return 1;
    return 3 - (timeAliveSeconds - 1) * (2 / 5);
}
