// Flujo de la partida: estado global, selección de héroe, draft, tienda, oleadas en paralelo de los 8 héroes
// (ver world.js) y la actualización de cada frame de cada arena (movimiento, ataques, IA).

// Pantalla: siempre 20×12 casillas. Mundo: 20×12 en el modo normal; en la Torre, el tamaño del nivel (tower.js).
const VIEW_COLS = 20, VIEW_ROWS = 12;
let COLS = VIEW_COLS, ROWS = VIEW_ROWS;

let player = null;
let gameState = 'MENU', waveNumber = 1, gameClock = 0, keys = {};
let currentDraft = null; // { mode, options } del draft abierto; mode 'bookChoice' = eligiendo qué cambiar con el Libro

const WAVE_HARD_LIMIT = 120;
// Moverse reinicia el ataque (como la animación de ataque de Dota): sin esto los héroes a distancia se alejaban y disparaban
// a la vez sin costo, y los cuerpo a cuerpo casi no ganaban duelos.
// Qué pasa con el ataque al moverse: 'reset' (arranca de cero), 'pause' (no avanza mientras caminás, pero no se pierde)
// 'reset-ranged' (solo los de distancia reinician) o 'free' (se puede atacar caminando). Es let para poder medir las variantes.
let MOVE_ATTACK_RULE = 'free'; // a pedido: se ataca caminando; el equilibrio se hace con stats (ver DISEÑO.md)
// Velocidad de movimiento de todos (héroes y creeps): 0,65 = 35% más lentos que al principio, a pedido (se veía muy frenético).
// Solo el movimiento: ataques y proyectiles quedan igual.
const MOVE_SPEED_MULT = 0.65; // bajado otra vez a pedido (antes 0,8)

// Segundos que tarda una unidad en avanzar una casilla (con sus efectos). En Tower Chaos el héroe camina más rápido
// (TOWER.heroSpeed): el mapa es mucho más grande que una arena. Lo usa también el dibujo para deslizarse sin frenar.
function heroStepTime(hero) {
    const tower = hero.arena && hero.arena.kind === 'tower' ? TOWER.heroSpeed : 1;
    return hero.moveInterval / (effMoveMult(hero) * MOVE_SPEED_MULT * tower);
}
function unitStepTime(u) {
    if (u.isHero) return u.inRest ? u.moveInterval / MOVE_SPEED_MULT : heroStepTime(u);
    return u.moveInterval ? (u.moveInterval / 1000) / (effMoveMult(u) * MOVE_SPEED_MULT) : 0.4;
}

window.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return; // escribiendo (tu nombre, el monto de la apuesta): no son teclas del juego
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (k === 'p') { setAutopilot(!autopilot); return; }
    if (k === 'b') { if (gameMode === 'tower') towerShopKey(); else toggleShop(); return; }
    if (k === 'm') { toggleBigMap(); return; }
    if (k === 'h') { setAutoCast(!autoCast); return; }
    if (k === 'g') { setSprites(!spritesOn); return; }
    if (k === 'c' && gameMode === 'tower') { toggleStatsWindow(); return; }
    if (k === 'i' && gameMode === 'tower') { toggleInventory(); return; }
    if (k === 'k' && gameMode === 'tower') { toggleBestiary(); return; }
    if (k === 'escape') { handleEscape(); return; }
    if (paused) return; // en pausa no responden las demás teclas
    if (inCombat() && !autopilot) handleSkillKeypress(k);
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// --- SELECCIÓN, DRAFT Y TIENDA ---
// Oro con el que arranca quien elige libremente (panel "Elegir cualquier héroe"), en vez de los 100g normales.
// Es la penalización por saltarse las 3 opciones al azar y llevarse cualquiera de los HERO_TEMPLATES.
const GOLD_PENALTY_FREE_PICK = 0;

function selectHero(template, freePick = false) {
    if (gameMode === 'tower') { startTowerRun(); return; }
    player = new Hero(template);
    if (freePick) player.gold = GOLD_PENALTY_FREE_PICK;
    player.ownerName = playerName();
    player.displayName = `${player.name} (${player.ownerName})`;
    heroes = [player];
    createRivals(template);
    heroes.forEach(sendToRestArea);
    viewedHero = player;
    heroOffers = null;
    showPanel('menu-panel', false);
    showPanel('hero-select-panel', false);
    log(freePick
        ? `Elegiste a ${player.name} de entre todos los héroes. Arrancás con ${GOLD_PENALTY_FREE_PICK}g en vez de 100g. Tus rivales: ${heroes.slice(1).map(h => h.name).join(', ')}.`
        : `Seleccionaste a ${player.name}. Tus rivales: ${heroes.slice(1).map(h => h.name).join(', ')}.`);
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
    showPanel('shop-container', !player.eliminated && !autopilot); // con el piloto automático no se abre la ventana
    if (!player.eliminated) renderShop();
}

// --- VENTANA DE LA TIENDA ---
// Se abre sola al empezar la preparación; se cierra con ✕ o Esc y se vuelve a abrir con B.
function openShop() {
    if (gameState !== 'PREP' || player.eliminated) return;
    showPanel('shop-container', true);
    renderShop();
}
function closeShop() { showPanel('shop-container', false); }
function toggleShop() {
    const open = document.getElementById('shop-container').style.display === 'block';
    if (open) closeShop(); else openShop();
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

// En la sala de espera se puede caminar: vos con el teclado o clic derecho; la IA pasea de a ratos.
// No se puede pisar la fuente ni las fogatas.
function restBlocked(x, y) { return (x === REST_SPOT.x && y === REST_SPOT.y - 3) || (y === REST_SPOT.y && (x === REST_SPOT.x - 5 || x === REST_SPOT.x + 5)); }

function updateRestArea(dt) {
    heroes.forEach(h => {
        if (!h.inRest || h.eliminated) return;
        tickCooldowns(h, dt); // los enfriamientos siguen corriendo mientras descansás
        h.restMoveTimer = (h.restMoveTimer || 0) + dt;
        if (h.restMoveTimer < h.moveInterval / MOVE_SPEED_MULT) return;
        h.restMoveTimer = 0;
        let dir = { dx: 0, dy: 0 };
        if (h === player && !autopilot) {
            dir = keyboardDirection();
            if (dir.dx || dir.dy) h.moveTarget = null; else dir = moveTargetDirection(h) || dir;
        } else {
            if (!h.wander && Math.random() < 0.08) h.wander = { x: 2 + Math.floor(Math.random() * (COLS - 4)), y: 2 + Math.floor(Math.random() * (ROWS - 4)) };
            if (h.wander) {
                dir = { dx: Math.sign(h.wander.x - h.x), dy: Math.sign(h.wander.y - h.y) };
                if (!dir.dx && !dir.dy) h.wander = null;
            }
        }
        const x = Math.max(0, Math.min(COLS - 1, h.x + dir.dx)), y = Math.max(0, Math.min(ROWS - 1, h.y + dir.dy));
        if (!restBlocked(x, y)) { h.x = x; h.y = y; } else h.wander = null;
    });
}

// Al volver del Área de Descanso a pelear (oleada nueva o jefe de ronda) se reinician los enfriamientos,
// igual que ya pasaba al empezar un duelo (duels.js) o un jefe (bosses.js). Mientras estás EN el descanso siguen
// corriendo (updateRestArea); al volver a entrar en combate se reinician del todo.
function returnFromRestArea(hero) {
    hero.inRest = false;
    hero.x = WAVE_START.x; hero.y = WAVE_START.y;
    restoreHero(hero);
    hero.cooldowns = Object.fromEntries(Object.keys(hero.cooldowns).map(k => [k, 0]));
}

// --- OLEADAS ---
// Cada héroe en juego pelea la misma oleada en su propia arena, todos al mismo tiempo.
// Desde la ronda DUEL_START_ROUND hay un duelo por ronda: primero la previa de apuestas (bets.js) y después, AL MISMO
// TIEMPO, los 2 duelistas pelean su duelo y los demás hacen su oleada (los duelistas se saltean los creeps esa ronda).
//   startWave()      arranca la ronda: previa de apuestas si hay duelo, o directo a las oleadas
//   startWave(plan)  arranca el combate con el duelo de `plan` (o sin duelo si es null)
function isDuelRound() { return waveNumber >= DUEL_START_ROUND && aliveHeroes().length >= 2; }

function startWave(plan) {
    if (plan === undefined && isDuelRound()) { showPanel('shop-container', false); startBetting(); return; }
    showPanel('shop-container', false);
    gameState = 'WAVE';
    const wave = nextWave || rollWave(waveNumber);
    nextWave = null;
    const duelArenas = plan ? makeDuelArenas(plan) : [];
    const duelists = duelArenas.flatMap(a => a.heroes);
    arenas = [...duelArenas, ...aliveHeroes().filter(h => !duelists.includes(h)).map(hero => {
        returnFromRestArea(hero);
        hero.diedThisRound = false;
        const arena = makeArena('wave', [hero]);
        spawnWave(arena, wave);
        return arena;
    })];
    followPlayer();
    const duel = duelArenas[0];
    setStateText(duel ? `RONDA ${waveNumber}: DUELO + ${wave.name.toUpperCase()}` : `OLEADA · RONDA ${waveNumber}: ${wave.name.toUpperCase()}`);
    sfx(duel ? 'duel' : 'wave');
    const rival = duel && duel.heroes.includes(player) ? duel.heroes.find(h => h !== player) : null;
    log(`🌊 ¡Ronda ${waveNumber}: ${wave.name}!` + (duel ? ` ⚔️ Duelo: ${duel.heroes[0].displayName} vs ${duel.heroes[1].displayName}` +
        (rival ? ` (¡te toca a vos contra ${rival.displayName}!). Los demás pelean su oleada.` : '; mientras tanto, vos peleás tu oleada.') : ' Cada héroe pelea en su arena.'));
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

// Terminaron el duelo y todas las oleadas de la ronda: jefe de ronda (si toca) o ranking y siguiente ronda.
function onRoundWavesDone() {
    logMuted = false;
    if (aliveHeroes().length <= 1) { arenas = []; heroes.forEach(h => { if (!h.eliminated) h.arena = null; }); endRound(); return; }
    onDuelsDone();
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
    if (statsOpen) toggleStatsWindow(false);
    if (invOpen) toggleInventory(false);
    if (forgeOpen) { forgeOpen = false; showPanel('forge-container', false); }
    gameMode = 'normal'; towerRun = null; document.body.classList.remove('ink-theme'); COLS = VIEW_COLS; ROWS = VIEW_ROWS; camera.x = 0; camera.y = 0;
    gameState = 'MENU'; waveNumber = 1; gameClock = 0; heroOffers = null;
    currentDraft = null; savedPrepTime = null; nextWave = null; logMuted = false;
    duelPlan = null; currentBet = null; duelBets = []; nextRoundBoss = null; lastRoundBoss = null; lastDuelPair = [];
    cancelTargeting();
    paused = false; showPanel('pause-menu', false);
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
    // Las que eligen un enemigo se apuntan con el mouse (ver mouse.js); el resto se lanza al toque
    if (isAimedSkill(skill)) { if (targeting && targeting.skill === skill) cancelTargeting(); else startTargeting(skill); return; }
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
    hero.cooldowns[skill.id] = skillCooldown(skill, hero);
    fxCast(hero, skill);
    emit(hero, 'onCast', { skill });
    return true;
}

// --- ACTUALIZACIÓN POR FRAME ---
// Actualiza todas las arenas activas (oleadas o duelos). Los mensajes solo se muestran si son de la arena que mirás.
function updateWave(dt) {
    if (!inCombat()) return;
    if (gameState === 'TOWER') { updateTower(dt); return; }
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
    } else if (hero === player && autoCast && everyInterval(hero, 'AI_THINK', dt, AI.thinkInterval)) {
        aiCastSkills(hero); // habilidades automáticas: el jugador solo se mueve (los puntos los reparte él)
    }

    const stunned = hasFlag(hero, 'stun');

    // Movimiento: del teclado o de la IA (la velocidad la modifican los efectos: Masacre, Visión de Cazador...)
    hero.moveTimer = (hero.moveTimer || 0) + dt;
    const stepTime = heroStepTime(hero);
    if (!stunned && hero.moveTimer > stepTime) {
        let dir = aiControlled ? aiMoveDirection(hero) : keyboardDirection();
        if (!aiControlled) {
            if (dir.dx || dir.dy) { hero.moveTarget = null; hero.focusChase = false; } // el teclado manda sobre el mouse
            else dir = moveTargetDirection(hero) || focusChaseDirection(hero) || dir;
        }
        const x = hero.x, y = hero.y;
        let nx = Math.max(0, Math.min(COLS - 1, hero.x + dir.dx)), ny = Math.max(0, Math.min(ROWS - 1, hero.y + dir.dy));
        const cutsCorner = dir.dx && dir.dy && (!walkable(hero.arena, nx, y) || !walkable(hero.arena, x, ny));
        if (!walkable(hero.arena, nx, ny) || cutsCorner) { // paredes (Torre): si iba en diagonal, prueba deslizarse por un eje
            if (dir.dx && walkable(hero.arena, nx, y)) ny = y; else if (dir.dy && walkable(hero.arena, x, ny)) nx = x; else { nx = x; ny = y; }
        }
        // Cuerpos físicos (bodies.js): entrar a una casilla ocupada tarda más; mientras tanto, sigue empujando
        const penalty = (nx !== x || ny !== y) ? bodyPenalty(hero, nx, ny) : 0;
        const pushing = hero.moveTimer < stepTime * (1 + penalty);
        if (!pushing) {
            // Se guarda el tiempo que sobró del paso (así caminar seguido no pierde un pedacito en cada casilla)
            const carry = hero.moveTimer - stepTime;
            hero.x = nx; hero.y = ny; hero.moveTimer = penalty === 0 && carry < stepTime ? carry : 0;
        }
        if (hero.x !== x || hero.y !== y) {
            emit(hero, 'onMove', { steps: 1 });
            if (MOVE_ATTACK_RULE === 'reset' || (MOVE_ATTACK_RULE === 'reset-ranged' && isRanged(hero))) hero.attackTimer = 0;
            // "está caminando" hasta que le tocaría dar el próximo paso
            hero.movingUntil = gameClock + stepTime + dt;
        }
    }

    // Ataque automático: al enemigo en rango de mayor prioridad (ej: Sanadores) o, si no, al más cercano
    // (desarmado: como el Manto Fantasma del Nigromante, no ataca pero sigue moviéndose, a diferencia de un aturdimiento)
    const target = (stunned || hasFlag(hero, 'disarm')) ? null : pickAttackTarget(hero, effRange(hero));
    const walking = MOVE_ATTACK_RULE === 'pause' && gameClock < (hero.movingUntil || 0);
    if (target && walking) {
        // pausa: mientras camina el ataque no avanza, pero conserva lo que tenía cargado
    } else if (target) {
        hero.attackTimer += dt;
        if (hero.attackTimer >= (1 / effAtkSpeed(hero))) {
            hero.attackTimer = 0;
            const { dmg, isCrit } = rollAttackDamage(hero, target);
            if (hero.projectileSpeed > 0) { fxAttack(hero, target, 'ranged', heroColor(hero)); fireProjectile(hero, target, dmg, isCrit); }
            else { fxAttack(hero, target, 'melee'); fxSlash(hero, target, heroColor(hero), isCrit); resolveBasicHit(hero, target, dmg, isCrit); }
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
