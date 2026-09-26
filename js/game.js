// Flujo de la partida: estado global, selección de héroe, draft, tienda, oleadas, muerte y
// la actualización de cada frame durante una oleada (movimiento, ataques, IA de creeps).

const COLS = 20, ROWS = 12;

let player = null, creeps = [], boss = null;
let gameState = 'HERO_SELECT', waveNumber = 1, isBossWave = false, gameClock = 0, keys = {};
let moveTimer = 0;

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
    renderDraft(draftOptions(player, DRAFT_OPTIONS[mode], exclude), mode);
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
    gameState = 'DRAFT';
    setStateText('LIBRO DEL DESTINO');
    showPanel('shop-container', false);
    showPanel('draft-container', true);
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
    setStateText('PREPARACIÓN');
    showPanel('shop-container', true);
    renderShop();
}

function buyItem(item) {
    if (player.gold < item.cost) { log('❌ Oro insuficiente'); return; }
    player.gold -= item.cost; item.apply(player); player.recalculateStats();
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

// Voluntad de Titán: al morir en una oleada (PvE), el héroe revive en el lugar con la vida llena y,
// durante unos segundos, no recibe daño, ataca más rápido y lanza habilidades sin gastar maná.
const TITAN_WILL = { duration: 5, atkSpeedPct: 1.0 };

function applyTitanWill(hero) {
    addEffect(hero, {
        id: 'TITAN_WILL', name: 'Voluntad de Titán', duration: TITAN_WILL.duration,
        mods: { atkSpeedPct: TITAN_WILL.atkSpeedPct }, flags: ['invulnerable', 'freeCast']
    });
}

// killer: la unidad que lo mató (un creep), o null si murió por otra causa (ej: el costo de Forma Inmortal).
function handlePlayerDeath(killer) {
    if (gameState !== 'WAVE') return; // evita procesar la misma muerte dos veces
    player.lives--;
    const cause = killer ? `${killer.label} te mató` : 'Moriste';
    if (player.lives <= 0) {
        gameState = 'GAMEOVER';
        setStateText('GAME OVER');
        log(`💀 ${cause}. Sin vidas restantes. GAME OVER.`);
        showPanel('restart-btn', true);
    } else {
        player.hp = player.maxHp;
        applyTitanWill(player);
        log(`💀 ${cause} (te queda ${player.lives} vida). ⚡ ¡Voluntad de Titán! Revivís con ${TITAN_WILL.duration}s de inmortalidad, +${TITAN_WILL.atkSpeedPct * 100}% vel. ataque y habilidades sin costo de maná.`);
    }
}

// Punto único para la muerte de cualquier héroe (lo usan los efectos que hacen daño, ej: Forma Inmortal).
// Con PvP, acá se resuelve también la muerte de héroes rivales.
function onHeroDeath(hero, killer = null) {
    if (hero === player) handlePlayerDeath(killer);
}

// Vuelve todo al estado inicial (selección de héroe) sin recargar la página.
function resetGame() {
    player = null; creeps = []; boss = null; projectiles = [];
    gameState = 'HERO_SELECT'; waveNumber = 1; isBossWave = false; gameClock = 0;
    resetHud();
    log('🔄 Nueva partida. Elegí un héroe.');
}

// --- HABILIDADES ACTIVAS ---
function handleSkillKeypress(k) {
    if (!player || !player.isAlive()) return;
    const skill = player.skillForKey(k);
    if (!skill) return;
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
    if (gameState !== 'WAVE' || !player.isAlive()) return;

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

    // Reducir cooldowns
    for (let id in player.cooldowns) if (player.cooldowns[id] > 0) player.cooldowns[id] = Math.max(0, player.cooldowns[id] - dt);

    // ¿Oleada limpia?
    if (gameState === 'WAVE' && creeps.every(c => !c.isAlive())) onWaveCleared();
}

// IA de un creep: aura del jefe, acercarse al jugador y atacarlo.
// Las reacciones al daño (Contraataque, Furia, Forma Inmortal) las manejan los hooks onDamaged del héroe.
function updateCreep(c, dt) {
    if (!c.isAlive()) return;
    // Si el jugador murió (o fue Game Over) en este mismo frame, el resto de los creeps no sigue pegando
    if (gameState !== 'WAVE' || !player.isAlive()) return;
    if (hasFlag(c, 'stun')) return;

    let effAtk = c.atk;
    if (!c.isBoss && boss && boss.isAlive()) {
        const dBoss = Math.hypot(c.x - boss.x, c.y - boss.y);
        if (dBoss <= boss.auraRadius) effAtk = Math.round(c.atk * (1 + boss.auraAtkBonus));
    }

    const dPlayer = Math.hypot(c.x - player.x, c.y - player.y);
    if (dPlayer > c.range) {
        c.moveTimer += dt * 1000;
        if (c.moveTimer >= c.moveInterval / effMoveMult(c)) {
            c.moveTimer = 0;
            const dx = player.x - c.x, dy = player.y - c.y;
            if (Math.abs(dx) >= Math.abs(dy)) c.x += Math.sign(dx); else c.y += Math.sign(dy);
        }
        return;
    }

    c.attackTimer += dt;
    if (c.attackTimer < (1 / c.atkSpeed)) return;
    c.attackTimer = 0;
    const result = player.takeDamage(effAtk, 'physical', c);
    if (result.evaded) { log(`💨 Esquivaste el ataque de ${c.label}.`); return; }
    if (!player.isAlive()) handlePlayerDeath(c);
}
