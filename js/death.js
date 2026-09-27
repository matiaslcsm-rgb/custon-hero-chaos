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
    log(hero === player
        ? `☠️ ¡Sin vidas! Quedás CONDENADO: recibís +${Math.round(pct * 100)}% de daño. Si un creep te mata, quedás eliminado.`
        : `☠️ ${hero.displayName} quedó CONDENADO.`);
}

// Duelo perdido estando Condenado: +10% más de daño recibido (se usa con los duelos de la fase F).
function registerDuelLoss(hero) {
    if (!isCondemned(hero)) return;
    setCondemned(hero, hero.condemnPct + CONDEMNED.perDuelLostPct);
    log(hero === player ? `⚔️ Duelo perdido estando Condenado: ahora recibís +${Math.round(hero.condemnPct * 100)}% de daño.`
        : `⚔️ ${hero.displayName} (Condenado) ahora recibe +${Math.round(hero.condemnPct * 100)}% de daño.`);
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
// Sirve para cualquier héroe (jugador o rival). Los mensajes se ven si es la arena que estás mirando.
// killer: la unidad que lo mató (un creep) o null si murió por otra causa (ej: el costo de Forma Inmortal).
// En un duelo, morir no cuesta la vida acá: lo resuelve resolveDuel (duels.js).
function handleHeroDeath(hero, killer) {
    if (!inCombat() || hero.respawnAt || hero.eliminated) return; // evita procesar la misma muerte dos veces
    if (hero.arena && hero.arena.kind === 'duel') {
        const winner = hero.arena.heroes.find(h => h !== hero);
        resolveDuel(hero.arena, winner, hero);
        return;
    }
    hero.diedThisRound = true;
    const you = hero === player;
    const cause = killer ? `${killer.label} ${you ? 'te mató' : 'mató a ' + hero.displayName}` : (you ? 'Moriste' : `${hero.displayName} murió`);
    if (isCondemned(hero)) { eliminateHero(hero, cause); return; }
    hero.lives--;
    hero.hp = 0;
    hero.effects = hero.effects.filter(e => e.flags.includes('persistent')); // al morir se pierden las mejoras
    hero.respawnAt = gameClock + RESPAWN_DELAY;
    const livesText = hero.lives > 0 ? `${you ? 'te queda' : 'le queda'}${hero.lives > 1 ? 'n' : ''} ${hero.lives} vida${hero.lives > 1 ? 's' : ''}` : 'sin vidas';
    log(`💀 ${cause} (${livesText}). ${you ? 'Revivís' : 'Revive'} en ${RESPAWN_DELAY}s; los creeps pierden el rastro.`);
}

// Condenado y muerto por un creep: queda fuera de la partida. El jugador sigue mirando (espectador).
function eliminateHero(hero, cause) {
    hero.eliminated = true;
    hero.hp = 0;
    if (hero.arena) hero.arena.done = true;
    const wasLogMuted = logMuted;
    logMuted = false; // las eliminaciones se anuncian siempre
    if (hero === player) {
        log(`💀 ${cause}. Estabas Condenado: quedás ELIMINADO. Podés seguir mirando la partida (clic en el ranking).`);
        setStateText('ELIMINADO · ESPECTADOR');
        showPanel('restart-btn', true);
        viewedHero = aliveHeroes()[0] || player;
    } else {
        log(`☠️ ${hero.displayName} quedó ELIMINADO.`);
        if (viewedHero === hero) viewedHero = player.eliminated ? (aliveHeroes()[0] || player) : player;
    }
    logMuted = wasLogMuted;
}

// Llamado cada frame mientras el héroe está muerto. Devuelve true si revivió.
function tryRespawn(hero = player) {
    if (!hero.respawnAt || gameClock < hero.respawnAt) return false;
    hero.respawnAt = 0;
    hero.hp = hero.maxHp;
    applyTitanWill(hero);
    log(`⚡ ¡Voluntad de Titán! ${TITAN_WILL.duration}s de inmortalidad, +${TITAN_WILL.atkSpeedPct * 100}% vel. ataque y habilidades sin costo de maná.`);
    if (hero.lives <= 0 && !isCondemned(hero)) enterCondemned(hero);
    return true;
}

// Punto único para la muerte de cualquier héroe (lo usan dealDamage y los efectos, ej: Forma Inmortal).
function onHeroDeath(hero, killer = null) {
    handleHeroDeath(hero, killer);
}
