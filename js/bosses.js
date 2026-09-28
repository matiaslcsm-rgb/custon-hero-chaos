// Jefes de ronda y objetos neutrales (DISEÑO.md §9 bis). Datos: data/bosses.js y data/neutrals.js.
//
//   Cada ROUND_BOSS_EVERY rondas, después de los duelos, CADA héroe en juego pelea contra el jefe de la ronda en su propia
//   arena (kind 'boss'). El jefe se sortea de ROUND_BOSSES (el mismo para todos, sin repetir el anterior) y cada uno tiene
//   su forma de volverse más difícil durante la pelea.
//   Es como una oleada: morir cuesta una vida (revivís con Voluntad de Titán) y, pasado BOSS_FIGHT.enrageAfter, el jefe se
//   enfurece (+5% de daño y velocidad de ataque por segundo) hasta que lo matás o te saca todas las vidas y quedás eliminado.
//   Al matarlo: oro y experiencia según el escalón, y elegís 1 de 3 objetos neutrales. Los 3 más rápidos cobran un extra.

const ROUND_BOSS_EVERY = 5;
const BOSS_FIGHT = {
    enrageAfter: 60,               // segundos hasta que empieza a enfurecerse (las oleadas: 30)
    safetyLimit: 600,              // corte de seguridad (solo para que una simulación nunca quede trabada)
    gold: [100, 150, 200, 250],    // por escalón (ronda 5, 10, 15, 20), para todos los que lo matan
    xpPerTier: 80,
    fastBonus: [0.5, 0.3, 0.15],   // oro extra para los 3 que más rápido lo mataron
    neutralOptions: 3
};

let nextRoundBoss = null, lastRoundBoss = null; // jefe sorteado para la próxima ronda de jefe (se avisa en la tienda)

function isRoundBossRound(round = waveNumber) { return round % ROUND_BOSS_EVERY === 0; }
function bossTier(round = waveNumber) { return Math.min(4, Math.max(1, Math.floor(round / ROUND_BOSS_EVERY))); }

// Jefe de la ronda: se sortea una vez (sin repetir el anterior) y queda fijo hasta que se pelea.
function roundBossOf() {
    if (!nextRoundBoss) nextRoundBoss = pickRandom(ROUND_BOSSES.filter(b => b !== lastRoundBoss));
    return nextRoundBoss;
}

// Héroes vivos a los que puede pegarle el jefe con sus mecánicas.
function bossTargets(c) { return c.arena.heroes.filter(h => !h.eliminated && h.isAlive()); }

function makeRoundBoss(t, pressure = 1) {
    const c = makeCreep(t, COLS - 4, Math.floor(ROWS / 2), creepStatMult(waveNumber) * pressure, false, 0);
    c.isRoundBoss = true;
    return c;
}

function startBossFight() {
    gameState = 'BOSS';
    const t = roundBossOf();
    arenas = aliveHeroes().map(hero => {
        returnFromRestArea(hero);
        hero.respawnAt = 0; hero.attackTimer = 0;
        hero.cooldowns = Object.fromEntries(Object.keys(hero.cooldowns).map(k => [k, 0]));
        const arena = makeArena('boss', [hero]);
        arena.pressure = pressureMult(hero);
        const boss = makeRoundBoss(t, arena.pressure);
        boss.arena = arena;
        arena.creeps = [boss]; arena.boss = boss;
        return arena;
    });
    lastRoundBoss = t; nextRoundBoss = null;
    if (player.eliminated && (!viewedHero || viewedHero.eliminated)) viewedHero = rankedHeroes()[0];
    setStateText(`JEFE DE RONDA · ${t.label.toUpperCase()}`);
    sfx('boss');
    log(`👹 ¡Jefe de ronda: ${t.label}! Cada héroe contra el suyo. ${t.mechanic} ${t.escalation} ` +
        `Morir cuesta vidas y, pasados ${BOSS_FIGHT.enrageAfter}s, se enfurece. Los 3 más rápidos en matarlo cobran extra.`);
}

// Llamado desde updateArena para cada arena de jefe (una por héroe).
function updateBossArena(arena, dt) {
    const hero = arena.heroes[0];
    if (hero.isAlive()) arena.elapsed += dt; // como en las oleadas, el tiempo corre con el héroe vivo
    arena.creeps.forEach(c => updateCreep(c, dt));
    if (arena.done) return; // el héroe quedó eliminado
    if (!arena.enrageAnnounced && arena.elapsed > BOSS_FIGHT.enrageAfter) {
        arena.enrageAnnounced = true;
        log(`🔥 ¡El ${arena.boss.label} se enfurece! +${WAVE_TIME.enragePerSecond * 100}% de daño y velocidad de ataque por segundo hasta que lo mates.`);
    }
    if (!arena.boss.isAlive()) bossDefeated(arena);
    else if (arena.elapsed > BOSS_FIGHT.safetyLimit) { arena.done = true; sendToRestArea(hero); hero.arena = null; }
}

// Un héroe mató a su jefe: oro, experiencia y neutral; va a descansar. El extra de los más rápidos se reparte al final.
function bossDefeated(arena) {
    arena.done = true;
    const hero = arena.heroes[0];
    arena.killTime = arena.elapsed;
    arena.creeps.forEach(c => { c.hp = 0; }); // se van los invocados
    const tier = bossTier(), gold = BOSS_FIGHT.gold[tier - 1];
    hero.gold += gold;
    quietly(() => gainXp(hero, BOSS_FIGHT.xpPerTier * tier));
    if (waveNumber < MAX_ROUNDS) offerNeutral(hero, tier);
    sendToRestArea(hero); hero.arena = null;
    if (hero === player) log(`👹 ¡Mataste al ${arena.boss.label} en ${arena.killTime.toFixed(1)}s! +${gold}g.` +
        (waveNumber < MAX_ROUNDS ? ' Elegí tu objeto neutral en la preparación.' : ''));
}

// Terminaron todas las peleas: extra para los 3 más rápidos y sigue la ronda.
function onBossFightDone() {
    const wasMuted = logMuted;
    logMuted = false;
    const fastest = arenas.filter(a => a.killTime !== undefined).sort((a, b) => a.killTime - b.killTime).slice(0, BOSS_FIGHT.fastBonus.length);
    const base = BOSS_FIGHT.gold[bossTier() - 1];
    fastest.forEach((a, i) => { a.heroes[0].gold += Math.round(base * BOSS_FIGHT.fastBonus[i]); });
    if (fastest.length) log(`👹 Más rápidos contra el jefe: ` + fastest.map((a, i) =>
        `${i + 1}º ${a.heroes[0].displayName} ${a.killTime.toFixed(1)}s (+${Math.round(base * BOSS_FIGHT.fastBonus[i])}g)`).join(' · ') + '.');
    logMuted = wasMuted;
    arenas = [];
    endRound();
}

// --- OBJETOS NEUTRALES ---
function neutralOptions(tier) {
    return shuffle(Object.values(NEUTRAL_ITEMS).filter(n => n.tier === tier)).slice(0, BOSS_FIGHT.neutralOptions).map(n => n.key);
}

// Ofrece neutrales: la IA elige al instante; el jugador, en la preparación (o el Piloto automático por él).
function offerNeutral(hero, tier) {
    const options = neutralOptions(tier);
    if (hero.isAI) quietly(() => aiPickNeutral(hero, options));
    else hero.neutralOffer = options;
}

// Se queda con un neutral de la oferta. El que tenía se vende solo (así no se pierde por olvidarse de venderlo).
function equipNeutral(hero, key) {
    if (!hero.neutralOffer || !hero.neutralOffer.includes(key)) return false;
    if (hero.neutral) sellNeutral(hero);
    hero.neutral = key;
    hero.neutralOffer = null;
    applyInventory(hero);
    log(`🎁 Objeto neutral: ${NEUTRAL_ITEMS[key].name}.`);
    if (hero === player) renderShop();
    return true;
}

function declineNeutral(hero = player) {
    hero.neutralOffer = null;
    if (hero === player) renderShop();
}

function sellNeutral(hero = player) {
    if (!hero.neutral) return 0;
    const price = neutralSellPrice(hero.neutral);
    log(`💰 Vendiste ${NEUTRAL_ITEMS[hero.neutral].name} (+${price}g).`);
    hero.gold += price;
    hero.neutral = null;
    applyInventory(hero);
    if (hero === player && gameState === 'PREP') renderShop();
    return price;
}

function describeNeutral(n) {
    const stats = Object.entries(n.mods || {}).map(([k, v]) => (MOD_LABELS[k] ? MOD_LABELS[k](v) : `${k} ${v}`));
    return [stats.join(', '), n.special ? n.special.replace(/\.$/, '') : ''].filter(Boolean).join('. ') + '.';
}
