// Muerte del héroe: vidas, revivir con Voluntad de Titán, estado Condenado, eliminación
// e Injusticia de los Codiciosos. Reglas en DISEÑO.md §8.
//
//   Vidas > 0   → muere, pierde 1 vida, queda RESPAWN_DELAY segundos muerto (los creeps pierden el agro
//                 y vuelven a su lugar) y revive en el lugar con Voluntad de Titán.
//   Vidas = 0   → al revivir queda Condenado: recibe +10% de daño (+10% por cada duelo perdido).
//   Condenado   → si lo mata un creep, queda eliminado (espectador).
//   Injusticia  → estando Condenado, compra 1 vida y deja de estarlo; si vuelve a quedar sin vidas,
//                 el % de daño recibido que tenía se duplica.

const RESPAWN_DELAY = 3;
const TITAN_WILL = { duration: 5, atkSpeedPct: 1.0 };
const CONDEMNED = { initialPct: 0.10, perDuelLostPct: 0.10 };
const GREED = { baseCost: 400 }; // cada compra cuesta el doble que la anterior

// Voluntad de Titán: no recibe daño, ataca más rápido y lanza habilidades sin gastar maná.
function applyTitanWill(hero) {
    addEffect(hero, {
        id: 'TITAN_WILL', name: 'Voluntad de Titán', duration: TITAN_WILL.duration,
        mods: { atkSpeedPct: TITAN_WILL.atkSpeedPct }, flags: ['invulnerable', 'freeCast']
    });
}

// --- CONDENADO ---
// Es un efecto permanente ('persistent': sobrevive a la muerte) que aumenta el daño recibido.
function setCondemned(hero, pct) {
    hero.condemnPct = pct;
    addEffect(hero, {
        id: 'CONDEMNED', name: `Condenado +${Math.round(pct * 100)}% daño recibido`, duration: Infinity,
        mods: { dmgTakenPct: pct }, flags: ['persistent']
    });
}
function isCondemned(hero) { return !!getEffect(hero, 'CONDEMNED'); }

// Primera vez: +10%. Si ya había estado Condenado (y se salvó comprando una vida), el % se duplica.
function enterCondemned(hero) {
    const pct = hero.condemnPct > 0 ? hero.condemnPct * 2 : CONDEMNED.initialPct;
    setCondemned(hero, pct);
    log(`☠️ ¡Sin vidas! Quedás CONDENADO: recibís +${Math.round(pct * 100)}% de daño. Si un creep te mata, quedás eliminado.`);
}

// Duelo perdido estando Condenado: +10% más de daño recibido (se usa con los duelos de la fase F).
function registerDuelLoss(hero) {
    if (!isCondemned(hero)) return;
    setCondemned(hero, hero.condemnPct + CONDEMNED.perDuelLostPct);
    log(`⚔️ Duelo perdido: ahora recibís +${Math.round(hero.condemnPct * 100)}% de daño.`);
}

// --- INJUSTICIA DE LOS CODICIOSOS ---
function greedCost(hero) { return GREED.baseCost * 2 ** hero.greedPurchases; }

function buyGreedLife(hero) {
    hero.lives++;
    hero.greedPurchases++;
    removeEffect(hero, 'CONDEMNED');
    log(`💰 Injusticia de los Codiciosos: comprás una vida y dejás de estar Condenado. Si volvés a quedar sin vidas, tu castigo se duplica.`);
}

// --- MORIR Y REVIVIR ---
// killer: la unidad que lo mató (un creep) o null si murió por otra causa (ej: el costo de Forma Inmortal).
// Los duelos (fase F) van a resolver la muerte contra héroes con registerDuelLoss en vez de eliminar.
function handlePlayerDeath(killer) {
    if (gameState !== 'WAVE' || player.respawnAt) return; // evita procesar la misma muerte dos veces
    const cause = killer ? `${killer.label} te mató` : 'Moriste';
    if (isCondemned(player)) {
        gameState = 'GAMEOVER';
        setStateText('ELIMINADO');
        log(`💀 ${cause}. Estabas Condenado: quedás ELIMINADO. Modo espectador.`);
        showPanel('restart-btn', true);
        return;
    }
    player.lives--;
    player.hp = 0;
    player.effects = player.effects.filter(e => e.flags.includes('persistent')); // al morir se pierden las mejoras
    player.respawnAt = gameClock + RESPAWN_DELAY;
    const livesText = player.lives > 0 ? `te queda${player.lives > 1 ? 'n' : ''} ${player.lives} vida${player.lives > 1 ? 's' : ''}` : 'no te quedan vidas';
    log(`💀 ${cause} (${livesText}). Revivís en ${RESPAWN_DELAY}s; los creeps pierden tu rastro.`);
}

// Llamado cada frame mientras el jugador está muerto. Devuelve true si revivió.
function tryRespawn() {
    if (!player.respawnAt || gameClock < player.respawnAt) return false;
    player.respawnAt = 0;
    player.hp = player.maxHp;
    applyTitanWill(player);
    log(`⚡ ¡Voluntad de Titán! ${TITAN_WILL.duration}s de inmortalidad, +${TITAN_WILL.atkSpeedPct * 100}% vel. ataque y habilidades sin costo de maná.`);
    if (player.lives <= 0 && !isCondemned(player)) enterCondemned(player);
    return true;
}

// Punto único para la muerte de cualquier héroe (lo usan dealDamage y los efectos, ej: Forma Inmortal).
// Con PvP, acá se resuelve también la muerte de héroes rivales.
function onHeroDeath(hero, killer = null) {
    if (hero === player) handlePlayerDeath(killer);
}
