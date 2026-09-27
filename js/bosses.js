// Jefes de ronda y objetos neutrales (DISEÑO.md §9 bis). Datos: data/bosses.js y data/neutrals.js.
//
//   Cada ROUND_BOSS_EVERY rondas, después de los duelos, todos los héroes en juego pelean juntos contra un jefe en una
//   arena compartida (kind 'boss'). Morir acá NO cuesta vidas: se revive a los BOSS_FIGHT.respawn segundos, sin Voluntad
//   de Titán. Si el jefe cae antes de BOSS_FIGHT.time, todos cobran oro y experiencia, y los 3 que más daño le hicieron
//   cobran un extra (BOSS_FIGHT.topBonus). Además cada uno elige 1 de 3 objetos neutrales del escalón del jefe.
//   Si se acaba el tiempo, el jefe se va y no hay premio.

const ROUND_BOSS_EVERY = 5;
const BOSS_FIGHT = {
    time: 60, respawn: 5,
    gold: [100, 150, 200, 250],    // por escalón, para todos
    xpPerTier: 80,
    topBonus: [0.5, 0.3, 0.15],    // oro extra (sobre el de todos) para el 1º, 2º y 3º en daño
    neutralOptions: 3
};

function isRoundBossRound(round = waveNumber) { return round % ROUND_BOSS_EVERY === 0; }
function bossTier(round = waveNumber) { return Math.min(ROUND_BOSSES.length, Math.max(1, Math.floor(round / ROUND_BOSS_EVERY))); }
function roundBossOf(round = waveNumber) { return ROUND_BOSSES[bossTier(round) - 1]; }

// Héroes vivos a los que puede pegarle el jefe con sus mecánicas.
function bossTargets(c) { return c.arena.heroes.filter(h => !h.eliminated && h.isAlive()); }

function bossStartSpot(i) { return { x: 1 + (i % 2), y: 1 + Math.floor(i / 2) * 3 % ROWS }; }

function makeRoundBoss(t, fighters) {
    const statMult = creepStatMult(waveNumber);
    const c = makeCreep(t, COLS - 4, Math.floor(ROWS / 2), statMult, false, 0);
    c.hp = c.maxHp = Math.round(t.hpPerHero * statMult * fighters);
    c.isRoundBoss = true;
    return c;
}

function startBossFight() {
    gameState = 'BOSS';
    const fighters = aliveHeroes();
    const arena = makeArena('boss', fighters);
    fighters.forEach((h, i) => {
        restoreHero(h);
        h.inRest = false; h.respawnAt = 0; h.attackTimer = 0; h.bossDamage = 0;
        h.cooldowns = Object.fromEntries(Object.keys(h.cooldowns).map(k => [k, 0]));
        Object.assign(h, bossStartSpot(i));
    });
    const t = roundBossOf();
    const boss = makeRoundBoss(t, fighters.length);
    boss.arena = arena;
    arena.creeps = [boss]; arena.boss = boss;
    arenas = [arena];
    if (player.eliminated || !viewedHero || viewedHero.eliminated) viewedHero = player.eliminated ? fighters[0] : player;
    setStateText(`JEFE DE RONDA · ${t.label.toUpperCase()}`);
    log(`👹 ¡Jefe de ronda: ${t.label}! Todos los héroes contra él (${BOSS_FIGHT.time}s). ${t.mechanic} ` +
        `Morir acá no cuesta vidas. Si cae, todos cobran y eligen un objeto neutral; los 3 que más daño hagan cobran extra.`);
}

// Llamado desde updateArena para la arena del jefe.
function updateBossArena(arena, dt) {
    arena.elapsed += dt;
    arena.creeps.forEach(c => updateCreep(c, dt));
    if (!arena.boss.isAlive()) finishBossFight(arena, true);
    else if (arena.elapsed >= BOSS_FIGHT.time) finishBossFight(arena, false);
}

function finishBossFight(arena, killed) {
    if (arena.done) return;
    arena.done = true;
    const wasMuted = logMuted;
    logMuted = false;
    const fighters = arena.heroes.filter(h => !h.eliminated);
    const name = arena.boss.label;
    if (killed) {
        const tier = bossTier(), base = BOSS_FIGHT.gold[tier - 1];
        const byDamage = fighters.slice().sort((a, b) => b.bossDamage - a.bossDamage);
        fighters.forEach(h => {
            const place = byDamage.indexOf(h);
            const gold = base + Math.round(base * (BOSS_FIGHT.topBonus[place] || 0));
            h.gold += gold;
            quietly(() => gainXp(h, BOSS_FIGHT.xpPerTier * tier));
            if (waveNumber < MAX_ROUNDS) offerNeutral(h, tier);
            if (h === player) log(`💰 Hiciste ${h.bossDamage} de daño (${place + 1}º de ${fighters.length}): cobrás ${gold}g.` +
                (waveNumber < MAX_ROUNDS ? ' Elegí tu objeto neutral en la preparación.' : ''));
        });
        log(`👹 ¡Cayó el ${name}! Todos cobran ${base}g. Más daño: ` +
            byDamage.slice(0, BOSS_FIGHT.topBonus.length).map((h, i) => `${i + 1}º ${h.displayName} (+${Math.round(BOSS_FIGHT.topBonus[i] * 100)}%)`).join(' · ') + '.');
    } else {
        log(`👹 Se acabó el tiempo: el ${name} se retira. Sin premio.`);
    }
    fighters.forEach(h => { h.respawnAt = 0; h.arena = null; sendToRestArea(h); });
    logMuted = wasMuted;
}

function onBossFightDone() {
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
