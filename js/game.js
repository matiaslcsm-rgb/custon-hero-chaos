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
    if (gameState === 'WAVE') handleSkillKeypress(k);
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// --- SELECCIÓN, DRAFT Y TIENDA ---
function selectHero(template) {
    player = new Hero(template);
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
    setPhaseTimer(savedPrepTime ?? PHASE_TIMES.prep);
    savedPrepTime = null;
    setStateText('PREPARACIÓN');
    showPanel('shop-container', true);
    renderShop();
}

function itemCost(item, hero) { return typeof item.cost === 'function' ? item.cost(hero) : item.cost; }
function itemAvailable(item, hero) { return !item.available || item.available(hero); }

function buyItem(item) {
    const cost = itemCost(item, player);
    if (!itemAvailable(item, player)) return;
    if (player.gold < cost) { log('❌ Oro insuficiente'); return; }
    player.gold -= cost; item.apply(player); player.recalculateStats();
    log(`Compraste: ${item.name}`);
    renderShop();
}

// --- OLEADAS ---
function spawnWave() {
    creeps = []; boss = null; projectiles = [];
    const statMult = isBossWave ? 1.6 : 1 + (waveNumber - 1) * 0.10;
    const rows = shuffle(Array.from({ length: ROWS }, (_, i) => i));
    const creepRows = rows.slice(0, 10);
    creepRows.forEach((row, i) => {
        const t = CREEP_POOL[Math.floor(Math.random() * CREEP_POOL.length)];
        creeps.push(makeCreep(t, 15 + (i % 4), row, statMult, false, 0));
    });
    const bossRow = rows[10] !== undefined ? rows[10] : Math.floor(ROWS / 2);
    const bossBase = BOSS_BASE_POOL[Math.floor(Math.random() * BOSS_BASE_POOL.length)];
    boss = makeCreep(bossBase, COLS - 1, bossRow, statMult, true, isBossWave ? 0.5 : 0.35);
    creeps.push(boss);
}

function startWave() {
    showPanel('shop-container', false);
    isBossWave = waveNumber > NORMAL_WAVES;
    gameState = 'WAVE';
    setStateText(isBossWave ? 'OLEADA DE JEFE FINAL' : `OLEADA PVE (${waveNumber}/${NORMAL_WAVES})`);
    spawnWave();
    resetWaveTimer();
    log(isBossWave ? '👹 ¡Comienza la oleada de jefe final! 10 creeps mejorados + élite.' : `🌊 Comienza la oleada ${waveNumber}: 10 creeps + 1 jefe.`);
}

function onWaveCleared() {
    if (isBossWave) {
        gameState = 'VICTORY';
        setStateText('¡VICTORIA!');
        log('🏆 ¡Derrotaste al jefe final! Fin del prototipo de héroe único.');
        showPanel('restart-btn', true);
        return;
    }
    log(`🏆 Oleada ${waveNumber} superada.`);
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
    currentDraft = null; savedPrepTime = null;
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
    const cd = player.cooldowns[skill.id] || 0;
    if (cd > 0) return;
    const manaCost = hasFlag(player, 'freeCast') ? 0 : (val(skill, player, 'manaCost') || 0);
    if (player.mana < manaCost) { log(`❌ Maná insuficiente para ${skill.name} (necesitás ${manaCost}).`); return; }
    // Solo se cobra maná y cooldown si la habilidad realmente se lanzó (ej: había objetivo en rango)
    if (!skill.cast(player)) return;
    player.mana -= manaCost;
    player.cooldowns[skill.id] = val(skill, player, 'cooldown') || 0;
    emit(player, 'onCast', { skill });
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

    // Movimiento (la velocidad la modifican los efectos: Masacre, Visión de Cazador...)
    const effMoveInterval = player.moveInterval / effMoveMult(player);
    moveTimer += dt;
    if (moveTimer > effMoveInterval) {
        if (keys['w'] || keys['arrowup']) player.y = Math.max(0, player.y - 1);
        if (keys['s'] || keys['arrowdown']) player.y = Math.min(ROWS - 1, player.y + 1);
        if (keys['a'] || keys['arrowleft']) player.x = Math.max(0, player.x - 1);
        if (keys['d'] || keys['arrowright']) player.x = Math.min(COLS - 1, player.x + 1);
        moveTimer = 0;
    }

    // Ataque automático al enemigo vivo más cercano en rango
    const target = nearestEnemy(player, effRange(player));
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

function tickCooldowns(dt) {
    for (let id in player.cooldowns) if (player.cooldowns[id] > 0) player.cooldowns[id] = Math.max(0, player.cooldowns[id] - dt);
}

// Mueve un creep una casilla hacia (tx, ty) respetando su velocidad (y ralentizaciones).
function stepCreepToward(c, tx, ty, dt) {
    if (c.x === tx && c.y === ty) return;
    c.moveTimer += dt * 1000;
    if (c.moveTimer < c.moveInterval / effMoveMult(c)) return;
    c.moveTimer = 0;
    const dx = tx - c.x, dy = ty - c.y;
    if (Math.abs(dx) >= Math.abs(dy)) c.x += Math.sign(dx); else c.y += Math.sign(dy);
}

// IA de un creep: aura del jefe, acercarse al jugador y atacarlo (si está muerto, vuelve a su lugar).
// Pasado el tiempo de la oleada, los creeps enfurecidos pegan más fuerte y más rápido (enrageMult).
// Las reacciones al daño (Contraataque, Furia, Forma Inmortal) las manejan los hooks onDamaged del héroe.
function updateCreep(c, dt) {
    if (!c.isAlive()) return;
    // Si el jugador murió (o fue Game Over) en este mismo frame, el resto de los creeps no sigue pegando
    if (gameState !== 'WAVE') return;
    if (hasFlag(c, 'stun')) return;
    if (!player.isAlive()) { stepCreepToward(c, c.spawnX, c.spawnY, dt); return; } // perdió el agro

    const enrage = enrageMult();
    let effAtk = c.atk * enrage;
    if (!c.isBoss && boss && boss.isAlive()) {
        const dBoss = Math.hypot(c.x - boss.x, c.y - boss.y);
        if (dBoss <= boss.auraRadius) effAtk *= 1 + boss.auraAtkBonus;
    }

    const dPlayer = Math.hypot(c.x - player.x, c.y - player.y);
    if (dPlayer > c.range) { stepCreepToward(c, player.x, player.y, dt); return; }

    c.attackTimer += dt;
    if (c.attackTimer < 1 / (effAtkSpeed(c) * enrage)) return;
    c.attackTimer = 0;
    // dealDamage resuelve la muerte del héroe (revivir, Condenado o eliminación) a través de onHeroDeath
    const result = dealDamage(c, player, Math.round(effAtk), 'physical', { isAttack: true });
    if (result.evaded) log(`💨 Esquivaste el ataque de ${c.label}.`);
}
