// Flujo de la partida: estado global, selección de héroe, draft, tienda, oleadas, muerte y
// la actualización de cada frame durante una oleada (movimiento, ataques, IA de creeps).

const COLS = 20, ROWS = 12;

let player = null, creeps = [], boss = null;
let gameState = 'HERO_SELECT', waveNumber = 1, isBossWave = false, gameClock = 0, keys = {};
let moveTimer = 0;
let currentDraft = null; // { mode, options } del draft abierto; mode 'bookChoice' = eligiendo qué cambiar con el Libro

window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (k === 'p') { setAutopilot(!autopilot); return; }
    if (gameState === 'WAVE' && !autopilot) handleSkillKeypress(k);
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// --- SELECCIÓN, DRAFT Y TIENDA ---
function selectHero(template) {
    player = new Hero(template);
    sendToRestArea(player);
    showPanel('hero-select-panel', false);
    log(`Seleccionaste a ${player.name}.`);
    startSkillDraft();
}

// Abre un draft. mode: 'normal' (3 opciones), 'fragment' (4) o 'book' (6).
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

function startPreparation() {
    gameState = 'PREP';
    if (!nextWave) nextWave = rollWave(waveNumber); // se sortea ya, para avisarla en la tienda
    setPhaseTimer(savedPrepTime ?? PHASE_TIMES.prep);
    savedPrepTime = null;
    setStateText('PREPARACIÓN');
    showPanel('shop-container', true);
    renderShop();
}


// --- ÁREA DE DESCANSO ---
// Al terminar una oleada (y en el futuro, un duelo) el héroe va al Área de Descanso hasta que se acabe el
// tiempo de preparación, y vuelve al combate con la vida y el maná completos. Las mejoras temporales se pierden.
const REST_SPOT = { x: 10, y: 7 };
const WAVE_START = { x: 3, y: 6 };

function restoreHero(hero) {
    hero.hp = hero.maxHp; hero.mana = hero.maxMana;
    hero.effects = hero.effects.filter(e => e.flags.includes('persistent'));
}

function sendToRestArea(hero) {
    hero.inRest = true;
    hero.x = REST_SPOT.x; hero.y = REST_SPOT.y;
    restoreHero(hero);
}

function returnFromRestArea(hero) {
    hero.inRest = false;
    hero.x = WAVE_START.x; hero.y = WAVE_START.y;
    restoreHero(hero);
}

// --- OLEADAS ---
function startWave() {
    showPanel('shop-container', false);
    isBossWave = waveNumber > NORMAL_WAVES;
    gameState = 'WAVE';
    const wave = nextWave || rollWave(waveNumber);
    nextWave = null;
    returnFromRestArea(player);
    setStateText(isBossWave ? `JEFE FINAL: ${wave.name.toUpperCase()}` : `OLEADA ${waveNumber}/${NORMAL_WAVES}: ${wave.name.toUpperCase()}`);
    spawnWave(wave);
    resetWaveTimer();
    log(`🌊 ¡Comienza la oleada ${waveNumber}: ${wave.name}! ${creeps.length - 1} creeps + 1 jefe.`);
}

function onWaveCleared() {
    if (isBossWave) {
        gameState = 'VICTORY';
        setStateText('¡VICTORIA!');
        log('🏆 ¡Derrotaste al jefe final! Fin del prototipo de héroe único.');
        showPanel('restart-btn', true);
        return;
    }
    log(`🏆 Oleada ${waveNumber} superada. 🏕️ Vas al Área de Descanso: volvés con vida y maná completos.`);
    sendToRestArea(player);
    gainXp(player, 40 + 20 * waveNumber);
    const interest = Math.min(5, Math.floor(player.gold / 10));
    if (interest > 0) { player.gold += interest; log(`💰 Interés por oro ahorrado: +${interest}g`); }
    waveNumber++;
    if (player.skills.length < KIT_SIZE) startSkillDraft();
    else startPreparation();
}

// Vuelve todo al estado inicial (selección de héroe) sin recargar la página.
function resetGame() {
    player = null; creeps = []; boss = null; projectiles = [];
    gameState = 'HERO_SELECT'; waveNumber = 1; isBossWave = false; gameClock = 0;
    currentDraft = null; savedPrepTime = null; nextWave = null;
    setPhaseTimer(PHASE_TIMES.heroSelect);
    resetHud();
    log('🔄 Nueva partida. Elegí un héroe.');
}

// --- HABILIDADES ACTIVAS ---
function handleSkillKeypress(k) {
    if (!player || !player.isAlive()) return;
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
    logBuffer = [];
    let ok;
    try { ok = skill.cast(hero); } finally {
        const messages = logBuffer;
        logBuffer = null;
        if (ok || !opts.quiet) messages.forEach(log);
    }
    if (!ok) return false;
    hero.mana -= manaCost;
    hero.cooldowns[skill.id] = val(skill, hero, 'cooldown') || 0;
    emit(hero, 'onCast', { skill });
    return true;
}

// --- ACTUALIZACIÓN POR FRAME DURANTE UNA OLEADA ---
function updateWave(dt) {
    // Efectos temporales: avanzan, emiten onTick y los vencidos disparan su onExpire (puede matar al jugador).
    tickEffects(player, dt);
    creeps.forEach(c => { if (c.isAlive()) tickEffects(c, dt); });
    if (gameState !== 'WAVE') return;

    // Muerto esperando revivir: los creeps vuelven a su lugar y el temporizador de la oleada se pausa
    if (!player.isAlive()) {
        if (!tryRespawn()) {
            creeps.forEach(c => updateCreep(c, dt));
            tickCooldowns(dt);
            return;
        }
    }
    tickWaveTimer(dt);

    // Piloto automático: la IA reparte puntos y lanza habilidades varias veces por segundo
    if (autopilot && everyInterval(player, 'AI_THINK', dt, AI.thinkInterval)) {
        aiSpendPoints(player);
        aiCastSkills(player);
    }

    const stunned = hasFlag(player, 'stun');

    // Movimiento: del teclado o de la IA (la velocidad la modifican los efectos: Masacre, Visión de Cazador...)
    const effMoveInterval = player.moveInterval / effMoveMult(player);
    moveTimer += dt;
    if (!stunned && moveTimer > effMoveInterval) {
        const dir = autopilot ? aiMoveDirection(player) : keyboardDirection();
        player.x = Math.max(0, Math.min(COLS - 1, player.x + dir.dx));
        player.y = Math.max(0, Math.min(ROWS - 1, player.y + dir.dy));
        moveTimer = 0;
    }

    // Ataque automático: al enemigo en rango de mayor prioridad (ej: Sanadores) o, si no, al más cercano
    const target = stunned ? null : pickAttackTarget(player, effRange(player));
    if (target) {
        player.attackTimer += dt;
        if (player.attackTimer >= (1 / effAtkSpeed(player))) {
            player.attackTimer = 0;
            const { dmg, isCrit } = rollAttackDamage(player, target);
            if (player.projectileSpeed > 0) fireProjectile(player, target, dmg, isCrit);
            else resolveBasicHit(player, target, dmg, isCrit);
        }
    } else {
        player.attackTimer = 0;
    }
    updateProjectiles(dt);
    player.regenTick(dt);

    creeps.forEach(c => updateCreep(c, dt));

    tickCooldowns(dt);

    // ¿Oleada limpia?
    if (gameState === 'WAVE' && creeps.every(c => !c.isAlive())) onWaveCleared();
}

function keyboardDirection() {
    return {
        dx: (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0),
        dy: (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0)
    };
}

function tickCooldowns(dt) {
    for (let id in player.cooldowns) if (player.cooldowns[id] > 0) player.cooldowns[id] = Math.max(0, player.cooldowns[id] - dt);
}
