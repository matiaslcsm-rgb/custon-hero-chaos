// Flujo de la partida: estado global, selección de héroe, draft, tienda, oleadas en paralelo de los 8 héroes
// (ver world.js) y la actualización de cada frame de cada arena (movimiento, ataques, IA).

const COLS = 20, ROWS = 12;

let player = null;
let gameState = 'MENU', waveNumber = 1, gameClock = 0, keys = {};
let currentDraft = null; // { mode, options } del draft abierto; mode 'bookChoice' = eligiendo qué cambiar con el Libro

const WAVE_HARD_LIMIT = 120;
// Moverse reinicia el ataque (como la animación de ataque de Dota): sin esto los héroes a distancia se alejaban y disparaban
// a la vez sin costo, y los cuerpo a cuerpo casi no ganaban duelos.
const MOVE_RESETS_ATTACK = true;  // segundos: si una arena no terminó, se da por perdida (evita partidas trabadas)

window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (k === 'p') { setAutopilot(!autopilot); return; }
    if (inCombat() && !autopilot) handleSkillKeypress(k);
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// --- SELECCIÓN, DRAFT Y TIENDA ---
function selectHero(template) {
    player = new Hero(template);
    player.displayName = `${player.name} (Vos)`;
    heroes = [player];
    createRivals(template);
    heroes.forEach(sendToRestArea);
    viewedHero = player;
    heroOffers = null;
    showPanel('menu-panel', false);
    showPanel('hero-select-panel', false);
    log(`Seleccionaste a ${player.name}. Tus rivales: ${heroes.slice(1).map(h => h.name).join(', ')}.`);
    startRoundDraft();
}

// Comienzo de ronda: los rivales draftean al instante; el jugador, si su kit no está completo.
function startRoundDraft() {
    quietly(() => aliveHeroes().filter(h => h.isAI && h.skills.length < KIT_SIZE).forEach(h => h.addSkill(aiPickDraft(h, draftOptions(h, DRAFT_OPTIONS.normal)))));
    if (!player.eliminated && player.skills.length < KIT_SIZE) startSkillDraft();
    else startPreparation();
}

// Abre un draft para el jugador. mode: 'normal' (3 opciones), 'fragment' (4) o 'book' (6).
// exclude: habilidades que no se pueden ofrecer (ej: la que se acaba de reemplazar).
function startSkillDraft(mode = 'normal', exclude = []) {
    gameState = 'DRAFT';
    setStateText(mode === 'normal' ? 'DRAFT DE HABILIDAD' : 'DRAFT DEL DESTINO');
    showPanel('shop-container', false);
    showPanel('draft-container', true);
    currentDraft = { mode, options: draftOptions(player, DRAFT_OPTIONS[mode], exclude) };
    setPhaseTimer(PHASE_TIMES.draft);
    renderDraft(currentDraft.options, mode);
}

// Suma la habilidad elegida al kit. Llega en nivel 0: hay que invertirle un punto para usarla.
function learnSkill(skill) {
    player.addSkill(skill);
    log(`✨ Drafteaste: ${skill.name}${skill.heroKey !== player.key ? ` (de ${naturalHeroName(skill)})` : ''}. Invertile un punto para usarla.`);
    showPanel('draft-container', false);
    startPreparation();
}

// --- OBJETOS DEL DESTINO ---
// Fragmento: quita una habilidad al azar (devolviendo sus puntos) y abre un draft de 4 opciones.
function useFragment() {
    if (gameState !== 'PREP' || player.destiny.fragments <= 0 || !player.skills.length) return;
    player.destiny.fragments--;
    savedPrepTime = phaseTimeLeft;
    const removed = player.skills[Math.floor(Math.random() * player.skills.length)];
    replaceSkill(removed, 'fragment', 'Fragmento del Destino');
}

function sellFragment() {
    if (gameState !== 'PREP' || player.destiny.fragments <= 0) return;
    player.destiny.fragments--;
    player.gold += FRAGMENT_SELL_PRICE;
    log(`💰 Vendiste un Fragmento del Destino (+${FRAGMENT_SELL_PRICE}g).`);
    renderShop();
}

// Libro: primero se elige qué habilidad cambiar (ver renderBookChoice) y después se abre un draft de 6.
function useBook() {
    if (gameState !== 'PREP' || player.destiny.books <= 0 || !player.skills.length) return;
    savedPrepTime = phaseTimeLeft;
    gameState = 'DRAFT';
    setStateText('LIBRO DEL DESTINO');
    showPanel('shop-container', false);
    showPanel('draft-container', true);
    currentDraft = { mode: 'bookChoice' };
    setPhaseTimer(PHASE_TIMES.draft);
    renderBookChoice();
}

function useBookOn(skill) {
    player.destiny.books--;
    replaceSkill(skill, 'book', 'Libro del Destino');
}

function replaceSkill(skill, mode, sourceName) {
    const refund = player.removeSkill(skill);
    log(`🔮 ${sourceName}: perdiste ${skill.name}${refund ? ` (recuperás ${refund} punto${refund > 1 ? 's' : ''})` : ''}.`);
    startSkillDraft(mode, [skill.id]);
}

// Preparación: el jugador compra en la tienda (con el aviso de la oleada); los rivales se arman al instante.
function startPreparation() {
    gameState = 'PREP';
    if (!nextWave) nextWave = rollWave(waveNumber); // se sortea ya, para avisarla en la tienda
    quietly(() => aliveHeroes().filter(h => h.isAI).forEach(h => { aiUseDestiny(h); aiSpendPoints(h); aiShop(h); }));
    setPhaseTimer(savedPrepTime ?? PHASE_TIMES.prep);
    savedPrepTime = null;
    setStateText('PREPARACIÓN');
    showPanel('shop-container', !player.eliminated);
    if (!player.eliminated) renderShop();
}

// --- ÁREA DE DESCANSO ---
// Al terminar su oleada (y en la fase F2, su duelo) cada héroe va al Área de Descanso hasta que terminen todos,
// y vuelve al combate con la vida y el maná completos. Las mejoras temporales se pierden.
const REST_SPOT = { x: 10, y: 7 };
const WAVE_START = { x: 3, y: 6 };
// Lugares alrededor de la fuente para los 8 héroes
const REST_SPOTS = [[10, 7], [8, 6], [12, 6], [7, 8], [13, 8], [9, 9], [11, 9], [10, 5]];

function restoreHero(hero) {
    hero.hp = hero.maxHp; hero.mana = hero.maxMana;
    hero.effects = hero.effects.filter(e => e.flags.includes('persistent'));
}

function sendToRestArea(hero) {
    hero.inRest = true;
    const [x, y] = REST_SPOTS[Math.max(0, heroes.indexOf(hero)) % REST_SPOTS.length];
    hero.x = x; hero.y = y;
    restoreHero(hero);
}

function returnFromRestArea(hero) {
    hero.inRest = false;
    hero.x = WAVE_START.x; hero.y = WAVE_START.y;
    restoreHero(hero);
}

// --- OLEADAS ---
// Cada héroe en juego pelea la misma oleada en su propia arena, todos al mismo tiempo.
function startWave() {
    showPanel('shop-container', false);
    gameState = 'WAVE';
    const wave = nextWave || rollWave(waveNumber);
    nextWave = null;
    arenas = aliveHeroes().map(hero => {
        returnFromRestArea(hero);
        hero.diedThisRound = false;
        const arena = makeArena('wave', [hero]);
        spawnWave(arena, wave);
        return arena;
    });
    if (player.eliminated && (!viewedHero || viewedHero.eliminated)) viewedHero = rankedHeroes()[0];
    setStateText(`OLEADA · RONDA ${waveNumber}: ${wave.name.toUpperCase()}`);
    log(`🌊 ¡Ronda ${waveNumber}: ${wave.name}! Cada héroe pelea en su arena (${creeps.length ? creeps.length - 1 : '?'} creeps + 1 jefe).`);
}

// Un héroe limpió su arena: suma el punto (si no murió), experiencia e interés, y va a descansar.
function onArenaCleared(arena) {
    arena.done = true;
    const hero = arena.heroes[0];
    if (hero.eliminated) return;
    if (!hero.diedThisRound) hero.points += POINTS.waveClean;
    gainXp(hero, 40 + 20 * waveNumber);
    const interest = Math.min(5, Math.floor(hero.gold / 10));
    hero.gold += interest;
    sendToRestArea(hero);
    if (hero === player) {
        const waiting = arenas.filter(a => !a.done).length;
        log(`🏆 Oleada superada${hero.diedThisRound ? '' : ' sin morir (+1 punto)'}. 🏕️ Vas al Área de Descanso${waiting ? ` (esperando a ${waiting} héroe${waiting > 1 ? 's' : ''})` : ''}.${interest ? ` Interés: +${interest}g.` : ''}`);
    }
}

// Todas las oleadas terminaron: empiezan los duelos (ver duels.js).
function onRoundWavesDone() {
    arenas = [];
    heroes.forEach(h => { if (!h.eliminated) h.arena = null; });
    logMuted = false;
    if (aliveHeroes().length <= 1) { endRound(); return; }
    startBetting();
}

// Fin de la ronda (después de los duelos): ranking, fin de partida o siguiente ronda.
function endRound() {
    logMuted = false;
    const top = rankedHeroes().slice(0, 3).map((h, i) => `${i + 1}º ${h.displayName} (${h.points})`).join(' · ');
    log(`📊 Fin de la ronda ${waveNumber}. Ranking: ${top}. Vas ${heroRank(player)}º.`);
    if (aliveHeroes().length <= 1 || waveNumber >= MAX_ROUNDS) { endGame(); return; }
    giveRankingRewards();
    waveNumber++;
    startRoundDraft();
}

function endGame() {
    gameState = 'ENDED';
    const winner = rankedHeroes()[0];
    const place = heroRank(player);
    setStateText(winner === player ? '¡GANASTE LA PARTIDA!' : `FIN · QUEDASTE ${place}º DE ${heroes.length}`);
    log(`🏁 Fin de la partida. Ganador: ${winner.displayName} con ${winner.points} puntos. Quedaste ${place}º.`);
    showPanel('restart-btn', true);
    showPanel('shop-container', false);
    showPanel('draft-container', false);
}

// Vuelve todo al estado inicial (menú) sin recargar la página.
function resetGame() {
    player = null; heroes = []; arenas = []; viewedHero = null;
    gameState = 'MENU'; waveNumber = 1; gameClock = 0; heroOffers = null;
    currentDraft = null; savedPrepTime = null; nextWave = null; logMuted = false;
    duelPlan = null; currentBet = null;
    setPhaseTimer(PHASE_TIMES.heroSelect);
    resetHud();
    log('🔄 Nueva partida. Tocá "Iniciar partida" cuando quieras.');
}

// --- HABILIDADES ACTIVAS ---
function handleSkillKeypress(k) {
    if (!player || !player.isAlive() || player.inRest || !player.arena) return;
    const skill = player.skillForKey(k);
    if (!skill || skill.kind !== 'active') return;
    if (skillLevel(player, skill) === 0) { log(`🔒 ${skill.name} está en nivel 0: invertile un punto para usarla.`); return; }
    tryCastSkill(player, skill);
}

// Camino único para lanzar una habilidad (jugador o IA). Devuelve true si se lanzó.
// Solo se cobra maná y enfriamiento si la habilidad realmente se lanzó (ej: había objetivo en rango).
// opts.quiet: no muestra los mensajes de un intento fallido (la IA prueba seguido y llenaría el registro).
function tryCastSkill(hero, skill, opts = {}) {
    if (!hero.isAlive() || skillLevel(hero, skill) === 0 || (hero.cooldowns[skill.id] || 0) > 0) return false;
    if (hasFlag(hero, 'stun')) { if (!opts.quiet) log('💫 Estás aturdido.'); return false; }
    const manaCost = hasFlag(hero, 'freeCast') ? 0 : (val(skill, hero, 'manaCost') || 0);
    if (hero.mana < manaCost) {
        if (!opts.quiet) log(`❌ Maná insuficiente para ${skill.name} (necesitás ${manaCost}).`);
        return false;
    }
    const outerBuffer = logBuffer;
    logBuffer = [];
    let ok;
    try { ok = skill.cast(hero); } finally {
        const messages = logBuffer;
        logBuffer = outerBuffer;
        if (ok || !opts.quiet) messages.forEach(log);
    }
    if (!ok) return false;
    hero.mana -= manaCost;
    hero.cooldowns[skill.id] = val(skill, hero, 'cooldown') || 0;
    fxCast(hero, skill);
    emit(hero, 'onCast', { skill });
    return true;
}

// --- ACTUALIZACIÓN POR FRAME ---
// Actualiza todas las arenas activas (oleadas o duelos). Los mensajes solo se muestran si son de la arena que mirás.
function updateWave(dt) {
    if (!inCombat()) return;
    const shown = viewArena();
    arenas.forEach(arena => {
        if (arena.done) return;
        logMuted = arena !== shown;
        updateArena(arena, dt);
    });
    logMuted = false;
    if (!arenas.every(a => a.done)) return;
    if (gameState === 'WAVE') onRoundWavesDone();
    else if (gameState === 'DUEL') onDuelsDone();
    else if (gameState === 'BOSS') onBossFightDone();
}

function updateArena(arena, dt) {
    // Efectos temporales: avanzan, emiten onTick y los vencidos disparan su onExpire (puede matar al héroe)
    arena.heroes.forEach(h => tickEffects(h, dt));
    arena.creeps.forEach(c => { if (c.isAlive()) tickEffects(c, dt); });
    if (!inCombat() || arena.done) return;

    arena.heroes.forEach(hero => { if (!arena.done) updateHero(hero, arena, dt); });
    if (arena.done) return; // el héroe quedó eliminado o el duelo se resolvió
    updateProjectiles(arena, dt);
    if (arena.kind === 'duel') { updateDuelArena(arena, dt); return; }
    if (arena.kind === 'boss') { updateBossArena(arena, dt); return; }
    arena.creeps.forEach(c => updateCreep(c, dt));

    const fighting = arena.heroes.some(h => h.isAlive());
    if (fighting) tickWaveTimer(arena, dt);
    if (arena.creeps.every(c => !c.isAlive())) onArenaCleared(arena);
    else if (arena.elapsed > WAVE_HARD_LIMIT) { arena.done = true; arena.heroes.forEach(sendToRestArea); } // no la terminó a tiempo
}

// Un héroe en su arena: revivir, pensar (IA), moverse, atacar, regenerar y enfriamientos.
function updateHero(hero, arena, dt) {
    if (hero.eliminated) return;
    // Muerto esperando revivir: los creeps vuelven a su lugar y su temporizador de oleada se pausa
    if (!hero.isAlive()) {
        if (!tryRespawn(hero)) { tickCooldowns(hero, dt); return; }
    }
    const aiControlled = hero !== player || autopilot;
    if (aiControlled && everyInterval(hero, 'AI_THINK', dt, AI.thinkInterval)) {
        aiSpendPoints(hero);
        aiCastSkills(hero);
    }

    const stunned = hasFlag(hero, 'stun');

    // Movimiento: del teclado o de la IA (la velocidad la modifican los efectos: Masacre, Visión de Cazador...)
    hero.moveTimer = (hero.moveTimer || 0) + dt;
    if (!stunned && hero.moveTimer > hero.moveInterval / effMoveMult(hero)) {
        const dir = aiControlled ? aiMoveDirection(hero) : keyboardDirection();
        const x = hero.x, y = hero.y;
        hero.x = Math.max(0, Math.min(COLS - 1, hero.x + dir.dx));
        hero.y = Math.max(0, Math.min(ROWS - 1, hero.y + dir.dy));
        hero.moveTimer = 0;
        if (MOVE_RESETS_ATTACK && (hero.x !== x || hero.y !== y)) hero.attackTimer = 0;
    }

    // Ataque automático: al enemigo en rango de mayor prioridad (ej: Sanadores) o, si no, al más cercano
    const target = stunned ? null : pickAttackTarget(hero, effRange(hero));
    if (target) {
        hero.attackTimer += dt;
        if (hero.attackTimer >= (1 / effAtkSpeed(hero))) {
            hero.attackTimer = 0;
            const { dmg, isCrit } = rollAttackDamage(hero, target);
            if (hero.projectileSpeed > 0) fireProjectile(hero, target, dmg, isCrit);
            else { fxLunge(hero, target); fxSlash(hero, target, heroColor(hero), isCrit); resolveBasicHit(hero, target, dmg, isCrit); }
        }
    } else {
        hero.attackTimer = 0;
    }
    hero.regenTick(dt);
    tickCooldowns(hero, dt);
}

function keyboardDirection() {
    return {
        dx: (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0),
        dy: (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0)
    };
}

function tickCooldowns(hero, dt) {
    for (let id in hero.cooldowns) if (hero.cooldowns[id] > 0) hero.cooldowns[id] = Math.max(0, hero.cooldowns[id] - dt);
}
