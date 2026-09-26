// Pruebas automáticas del juego. Se ejecutan solas al abrir tests.html (o index.html?test) y muestran
// un panel con el resultado de cada una. Jugando normal no corren.
//
// Para agregar una prueba: test('nombre', () => { ...; checkEq(obtenido, esperado, 'qué se mide'); });
// Por defecto Math.random devuelve 0.99 (sin críticos, sin esquives, sin aturdir por azar) para que los
// resultados sean predecibles. Con { random: true } la prueba usa azar real.

const TESTS = [];
function test(name, fn, opts = {}) { TESTS.push({ name, fn, opts }); }

function check(cond, msg) { if (!cond) throw new Error(msg); }
function checkEq(actual, expected, msg) {
    if (actual !== expected) throw new Error(`${msg}: se esperaba ${JSON.stringify(expected)} y dio ${JSON.stringify(actual)}`);
}
function checkNear(actual, expected, msg, tolerance = 0.001) {
    if (Math.abs(actual - expected) > tolerance) throw new Error(`${msg}: se esperaba ${expected} y dio ${actual}`);
}

function withRandom(value, fn) {
    const original = Math.random;
    Math.random = typeof value === 'function' ? value : () => value;
    try { return fn(); } finally { Math.random = original; }
}

// --- AYUDAS PARA ARMAR ESCENARIOS ---
// Partida en curso con el héroe elegido, en medio de una oleada, con todos los creeps lejos (x = 19).
function newGame(heroKey) {
    resetGame();
    selectHero(HERO_TEMPLATES[heroKey]);
    showPanel('draft-container', false);
    gameState = 'WAVE';
    spawnWave();
    resetWaveTimer();
    creeps.forEach(c => { c.x = 19; c.spawnX = 19; });
    player.x = 5; player.y = 5;
    return player;
}
function learn(id, level) {
    const skill = SKILL_INDEX[id];
    player.addSkill(skill);
    player.skillLevels[id] = level;
    return skill;
}
// Un creep común (ni jefe ni de un golpe) al lado del jugador, sin armadura salvo que se indique.
function dummy(props = {}) {
    const c = creeps.find(k => k.isAlive() && !k.oneHit && !k.isBoss && !k.__used);
    c.__used = true;
    Object.assign(c, { x: player.x + 1, y: player.y, armor: 0, magicResist: 0 }, props);
    return c;
}
// Avanza el reloj de la oleada hasta que el jugador reviva.
function waitRespawn() { gameClock = player.respawnAt; updateWave(0.016); }
function lastLog() { const p = document.querySelector('#combat-log p:last-child'); return p ? p.textContent : ''; }

// ============================================================ CONTENIDO
test('El contenido del juego es válido (validador)', () => {
    const problems = validateContent();
    checkEq(problems.length, 0, 'problemas: ' + problems.join(' | '));
});

// ============================================================ ATRIBUTOS
test('Atributos de nivel 1 salen de la plantilla del héroe', () => {
    const h = new Hero(HERO_TEMPLATES.AXE);
    checkEq(h.str, 24, 'Fuerza base');
    checkEq(h.maxHp, 100 + 24 * 5, 'HP = base + 5 por Fuerza');
    checkEq(h.atk, Math.round(13 + 24 * 0.8), 'daño = base + 0.8 por atributo principal');
    checkNear(h.armor, 2 + 12 * 0.08, 'armadura = base + 0.08 por Agilidad');
    checkNear(h.magicResist, 15 + 14 * 0.1, 'resistencia mágica = base + 0.1 por Inteligencia');
});

test('Subir de nivel suma atributos (más en el principal)', () => {
    newGame('SNIPER');
    const agi0 = player.agi, str0 = player.str;
    gainXp(player, xpToNext(1));
    checkEq(player.level, 2, 'nivel');
    checkNear(player.agi - agi0, 3.0, 'Agilidad ganada (principal)');
    checkNear(player.str - str0, 1.8, 'Fuerza ganada');
});

// ============================================================ DAÑO
test('Daño físico: la armadura reduce 4% por punto', () => {
    newGame('AXE');
    const c = dummy({ armor: 5, hp: 9999, maxHp: 9999 });
    checkEq(dealDamage(player, c, 100, 'physical').dealt, 80, 'daño con 5 de armadura');
    const c2 = dummy({ armor: 50, hp: 9999, maxHp: 9999 });
    checkEq(dealDamage(player, c2, 100, 'physical').dealt, 20, 'la armadura reduce como máximo 80%');
});

test('Daño mágico: resistencia mágica y amplificación de hechizo', () => {
    newGame('AXE');
    const c = dummy({ magicResist: 20, hp: 9999, maxHp: 9999 });
    const expected = Math.round(100 * (1 + player.spellAmp / 100) * 0.8);
    checkEq(dealDamage(player, c, 100, 'magical').dealt, expected, 'daño mágico');
    checkEq(dealDamage(player, c, 100, 'pure').dealt, 100, 'el daño puro ignora todo');
});

test('El esquive solo afecta a los ataques básicos', () => {
    newGame('AXE');
    const c = dummy();
    player.evasion = 100;
    check(dealDamage(c, player, 10, 'physical', { isAttack: true }).evaded, 'un ataque básico se esquiva');
    check(!dealDamage(c, player, 10, 'physical').evaded, 'una habilidad no se esquiva');
});

test('Invulnerable no recibe daño; los creeps de un golpe mueren con cualquier golpe', () => {
    newGame('AXE');
    addEffect(player, { id: 'T', duration: 5, flags: ['invulnerable'] });
    const hp = player.hp;
    dealDamage(creeps[0], player, 500, 'pure');
    checkEq(player.hp, hp, 'vida del invulnerable');
    const chusma = makeCreep(CREEP_POOL.find(t => t.oneHit), 6, 5, 1, false, 0);
    creeps.push(chusma);
    dealDamage(player, chusma, 1, 'physical');
    check(!chusma.isAlive(), 'la Chusma muere de un golpe');
});

// ============================================================ HABILIDADES Y NIVELES
test('Habilidad en nivel 0 no se lanza; en nivel 1 cobra maná y enfriamiento', () => {
    newGame('AXE');
    const s = learn('AXE_HACHAZO', 0);
    dummy({ hp: 9999, maxHp: 9999 });
    const mana = player.mana;
    handleSkillKeypress('e');
    checkEq(player.mana, mana, 'maná en nivel 0');
    player.skillLevels[s.id] = 1;
    handleSkillKeypress('e');
    checkEq(mana - player.mana, valueAt(s, 'manaCost', 1), 'maná gastado');
    checkEq(player.cooldowns[s.id], valueAt(s, 'cooldown', 1), 'enfriamiento');
});

test('Sin objetivo en rango no se cobra maná ni enfriamiento', () => {
    newGame('SNIPER');
    const s = learn('SNIPER_POTENTE', 1);
    const mana = player.mana;
    handleSkillKeypress('e');
    checkEq(player.mana, mana, 'maná');
    checkEq(player.cooldowns[s.id], 0, 'enfriamiento');
});

test('Teclas por orden de aprendizaje (E, R, T, F)', () => {
    newGame('AXE');
    ['VAMP_CLAW', 'AXE_FURIA', 'SNIPER_VISION', 'AXE_GIRO'].forEach(id => learn(id, 0));
    checkEq(['VAMP_CLAW', 'AXE_FURIA', 'SNIPER_VISION', 'AXE_GIRO'].map(id => player.keyBindings[id]).join(''), 'ertf', 'teclas');
});

test('Definitiva: niveles 1/2/3 recién en los niveles 6/12/18 del héroe', () => {
    newGame('AXE');
    const ult = learn('AXE_FURIA', 0);
    player.skillPoints = 10;
    player.level = 5; check(!levelUpSkill(player, ult), 'nivel 5 no alcanza');
    player.level = 6; check(levelUpSkill(player, ult), 'nivel 6 sube a 1');
    check(!levelUpSkill(player, ult), 'no sube a 2 en nivel 6');
    player.level = 12; check(levelUpSkill(player, ult), 'nivel 12 sube a 2');
    player.level = 18; check(levelUpSkill(player, ult), 'nivel 18 sube a 3');
    check(!levelUpSkill(player, ult), 'máximo 3 niveles');
});

test('Puntos sin gastar se guardan; con el kit al máximo se vuelven atributos', () => {
    newGame('AXE');
    ['AXE_HACHAZO', 'AXE_PROVOCACION', 'AXE_GIRO'].forEach(id => learn(id, 4));
    learn('AXE_FURIA', 1);
    player.level = 10; player.skillPoints = 3;
    resolveExcessPoints(player);
    checkEq(player.skillPoints, 3, 'puntos guardados esperando nivel 12');
    player.level = 18; levelUpSkill(player, SKILL_INDEX.AXE_FURIA); levelUpSkill(player, SKILL_INDEX.AXE_FURIA);
    const str0 = player.str;
    checkEq(player.skillPoints, 0, 'el punto sobrante se convirtió');
    checkNear(str0 - 24, 1, 'Fuerza +1 por el punto sobrante');
});

test('Experiencia: cada nivel da 1 punto de habilidad', () => {
    newGame('VAMPIRE');
    gainXp(player, xpToNext(1) + xpToNext(2) + xpToNext(3));
    checkEq(player.level, 4, 'nivel');
    checkEq(player.skillPoints, 4, 'puntos (1 inicial + 3)');
});

// ============================================================ DRAFT Y DESTINO
test('Draft: 3 opciones distintas y siempre al menos 1 natural', () => {
    newGame('AXE');
    for (let i = 0; i < 200; i++) {
        const o = draftOptions(player, 3);
        checkEq(o.length, 3, 'cantidad de opciones');
        checkEq(new Set(o.map(s => s.id)).size, 3, 'opciones repetidas');
        check(o.some(s => s.heroKey === 'AXE'), 'falta la habilidad natural');
    }
}, { random: true });

test('Fragmento del Destino: quita una, devuelve puntos, ofrece 4 sin la quitada', () => {
    newGame('SNIPER');
    learn('SNIPER_POTENTE', 2); learn('SNIPER_CONGELANTE', 1);
    player.skillPoints = 0; player.destiny.fragments = 1;
    gameState = 'PREP';
    withRandom(0, () => useFragment()); // quita la primera: Disparo Potente (nivel 2)
    checkEq(gameState, 'DRAFT', 'abre el draft');
    checkEq(player.skillPoints, 2, 'puntos devueltos');
    check(!player.hasSkill('SNIPER_POTENTE'), 'la habilidad fue quitada');
    const names = [...document.querySelectorAll('#draft-options .skill-card h4')].map(h => h.textContent);
    checkEq(names.length, 4, 'opciones');
    check(!names.includes('Disparo Potente'), 'no ofrece la quitada');
    document.querySelector('#draft-options .skill-card').click();
    checkEq(player.keyBindings[player.skills[1].id], 'e', 'la nueva toma la tecla liberada');
});

test('Libro del Destino: elegís cuál cambiar y ofrece 6', () => {
    newGame('SNIPER');
    learn('SNIPER_POTENTE', 1); learn('SNIPER_CONGELANTE', 3);
    player.skillPoints = 0; player.destiny.books = 1;
    gameState = 'PREP';
    useBook();
    document.querySelectorAll('#draft-options .skill-card')[1].click(); // cambia Disparo Congelante
    checkEq(player.skillPoints, 3, 'puntos devueltos');
    checkEq(document.querySelectorAll('#draft-options .skill-card').length, 6, 'opciones');
});

test('Vender un Fragmento del Destino', () => {
    newGame('AXE');
    gameState = 'PREP'; player.destiny.fragments = 1;
    const gold = player.gold;
    sellFragment();
    checkEq(player.gold - gold, FRAGMENT_SELL_PRICE, 'oro');
    checkEq(player.destiny.fragments, 0, 'fragmentos');
});

// ============================================================ INNATOS Y SINERGIAS
test('Contraataque: 20% base, +20% provocando', () => {
    newGame('AXE');
    const c = dummy({ hp: 9999, maxHp: 9999 });
    withRandom(0.3, () => dealDamage(c, player, 5, 'physical'));
    checkEq(c.hp, 9999, 'sin provocar (30% > 20%) no contraataca');
    learn('AXE_PROVOCACION', 1).cast(player);
    withRandom(0.3, () => dealDamage(c, player, 5, 'physical'));
    checkEq(9999 - c.hp, player.atk, 'provocando (30% < 40%) contraataca con 100% del daño');
});

test('Puntería Perfecta: más daño cuanto más lejos', () => {
    newGame('SNIPER');
    const c = dummy();
    const at = x => { c.x = player.x + x; return rollAttackDamage(player, c).dmg; };
    checkEq(at(1), player.atk, 'cerca');
    checkEq(at(3), Math.round(player.atk * 1.15), 'media distancia');
    checkEq(at(5), Math.round(player.atk * 1.35), 'distancia máxima');
});

test('Hambre + Sangre Oscura multiplican el robo de vida', () => {
    newGame('VAMPIRE');
    const c = dummy({ hp: 10, maxHp: 100 }); // <30% HP
    player.hp = 10; applyLifesteal(player, 100, c);
    checkEq(player.hp - 10, Math.round(100 * 0.15 * 2), 'Hambre duplica contra <30% HP');
    learn('VAMP_DARKBLOOD', 1).cast(player);
    player.hp = 10; applyLifesteal(player, 100, c);
    checkEq(player.hp - 10, Math.round(100 * 0.15 * (2 + 0.3)), 'Sangre Oscura suma al multiplicador');
});

test('Velocidad Letal: +5% por golpe al mismo objetivo, se reinicia al cambiar', () => {
    newGame('ASSASSIN');
    const a = dummy({ hp: 9999, maxHp: 9999 }), b = dummy({ y: player.y + 1 });
    learn('ASSASSIN_LETHALSPEED', 2).cast(player);
    const base = effAttack(player);
    const hits = [1, 2, 3].map(() => rollAttackDamage(player, a).dmg);
    checkEq(hits.join(','), [0, 1, 2].map(k => Math.round(base * (1 + k * 0.05))).join(','), 'combo');
    checkEq(rollAttackDamage(player, b).dmg, Math.round(base), 'al cambiar de objetivo se reinicia');
});

// ============================================================ DEFINITIVAS Y ASCENSO
test('Furia: +2 de daño por golpe recibido hasta el tope, y armadura por baja', () => {
    newGame('AXE');
    const ult = learn('AXE_FURIA', 2);
    ult.cast(player);
    const c = dummy({ hp: 9999, maxHp: 9999 });
    for (let i = 0; i < 25; i++) dealDamage(c, player, 1, 'physical');
    checkEq(getEffect(player, 'AXE_FURIA').mods.flatAtk, valueAt(ult, 'stackCap', 2), 'tope de daño acumulado');
    const armor = player.armor;
    dealDamage(player, dummy(), 99999, 'pure');
    checkNear(player.armor - armor, valueAt(ult, 'armorPerKill', 2), 'armadura permanente por baja');
});

test('Disparo Mortal: +daño permanente solo si mata', () => {
    newGame('SNIPER');
    const ult = learn('SNIPER_MORTAL', 1);
    let atk = player.atk;
    dummy({ hp: 99999, maxHp: 99999 }); ult.cast(player);
    checkEq(player.atk, atk, 'no mató');
    creeps.forEach(k => { if (k.x !== 19) k.x = 19; });
    dummy({ hp: 1, maxHp: 100 }); ult.cast(player);
    checkEq(player.atk - atk, valueAt(ult, 'atkPerKill', 1), 'mató');
});

test('Masacre: cada baja extiende la duración y da crítico permanente', () => {
    newGame('ASSASSIN');
    const ult = learn('ASSASSIN_MASACRE', 2);
    ult.cast(player);
    const until = getEffect(player, 'ASSASSIN_MASACRE').until, crit = player.critChance;
    dealDamage(player, dummy(), 99999, 'pure'); dealDamage(player, dummy(), 99999, 'pure');
    checkNear(getEffect(player, 'ASSASSIN_MASACRE').until - until, 2 * valueAt(ult, 'extendPerKill', 2), 'extensión');
    checkNear(player.critChance - crit, 2 * valueAt(ult, 'critPerKill', 2), 'crítico permanente');
});

test('Forma Inmortal: no baja de 1, paga al terminar y da HP máximo por curación', () => {
    newGame('VAMPIRE');
    const ult = learn('VAMP_IMMORTAL', 1);
    ult.cast(player);
    const hpMax = player.maxHp;
    player.hp = 10; healUnit(player, 120);
    checkEq(player.maxHp - hpMax, 2 * valueAt(ult, 'hpPerStep', 1), 'HP máximo por cada 50 curados');
    player.hp = 50;
    dealDamage(creeps[0], player, 1000, 'pure');
    checkEq(player.hp, 1, 'no baja de 1');
    gameClock += 10; tickEffects(player, 0.016);
    checkEq(player.lives, 1, 'el costo al terminar lo mató (pierde una vida)');
    check(!player.isAlive(), 'queda muerto esperando revivir');
    waitRespawn();
    check(!!getEffect(player, 'TITAN_WILL'), 'y revive con Voluntad de Titán');
});

// ============================================================ MUERTE
test('Morir: 3s muerto, los creeps pierden el agro y vuelven a su lugar', () => {
    newGame('AXE');
    const c = dummy({ atk: 9999, attackTimer: 99, spawnX: 15, spawnY: 5 });
    player.hp = 1;
    updateCreep(c, 0.016);
    checkEq(player.lives, 1, 'pierde una vida');
    check(!player.isAlive(), 'queda muerto');
    checkNear(player.respawnAt - gameClock, RESPAWN_DELAY, 'tiempo para revivir');
    const x0 = c.x;
    for (let i = 0; i < 20; i++) { gameClock += 0.1; updateWave(0.1); }
    check(c.x > x0, 'el creep se aleja hacia su lugar de aparición');
    check(!player.isAlive(), 'sigue muerto antes de los 3s');
    waitRespawn();
    check(player.isAlive(), 'revive a los 3s');
});

test('Voluntad de Titán: revive en el lugar, inmortal, x2 vel. ataque y sin maná', () => {
    newGame('AXE');
    const s = learn('AXE_GIRO', 1);
    const c = dummy({ atk: 9999, attackTimer: 99 });
    player.hp = 1;
    updateCreep(c, 0.016);
    waitRespawn();
    checkEq(player.hp, player.maxHp, 'vida llena');
    checkEq([player.x, player.y].join(','), '5,5', 'revive en el lugar');
    checkNear(effAtkSpeed(player) / player.atkSpeed, 1 + TITAN_WILL.atkSpeedPct, 'velocidad de ataque');
    dealDamage(c, player, 500, 'pure');
    checkEq(player.hp, player.maxHp, 'no recibe daño');
    player.mana = 0; c.x = 6; c.y = 5; handleSkillKeypress('e');
    check(player.cooldowns[s.id] > 0, 'lanza sin maná');
    gameClock += TITAN_WILL.duration + 0.1; tickEffects(player, 0.016);
    check(!getEffect(player, 'TITAN_WILL'), 'dura ' + TITAN_WILL.duration + 's');
});

test('Sin vidas: al revivir queda Condenado y recibe +10% de daño', () => {
    newGame('AXE');
    player.lives = 1; player.hp = 1;
    const c = dummy({ atk: 9999, attackTimer: 99 });
    updateCreep(c, 0.016);
    checkEq(player.lives, 0, 'vidas');
    checkEq(gameState, 'WAVE', 'no termina la partida');
    waitRespawn();
    check(isCondemned(player), 'queda Condenado');
    removeEffect(player, 'TITAN_WILL');
    const hp = player.hp;
    dealDamage(c, player, 100, 'pure');
    checkEq(hp - player.hp, 110, 'recibe +10% de daño');
});

test('Condenado: si lo mata un creep queda eliminado (una sola vez aunque peguen varios)', () => {
    newGame('AXE');
    player.lives = 0; setCondemned(player, 0.1); player.hp = 1;
    const attackers = [[4, 5], [6, 5], [5, 4], [5, 6]].map(([x, y]) => dummy({ x, y, attackTimer: 99, atk: 999 }));
    attackers.forEach(c => updateCreep(c, 0.016));
    checkEq(gameState, 'GAMEOVER', 'estado');
    checkEq([...document.querySelectorAll('#combat-log p')].filter(p => p.textContent.includes('ELIMINADO')).length, 1, 'mensajes de eliminación');
});

test('Condenado: cada duelo perdido suma +10% de daño recibido', () => {
    newGame('AXE');
    setCondemned(player, CONDEMNED.initialPct);
    registerDuelLoss(player); registerDuelLoss(player);
    checkNear(player.condemnPct, 0.30, '10% + 2 duelos');
    checkNear(sumMod(player, 'dmgTakenPct'), 0.30, 'el efecto aplica el 30%');
});

test('Injusticia de los Codiciosos: solo Condenado, vida, precio doble y castigo doble', () => {
    newGame('AXE');
    check(!itemAvailable(ITEMS.GREED, player), 'no aparece sin estar Condenado');
    player.lives = 0; setCondemned(player, 0.3);
    check(itemAvailable(ITEMS.GREED, player), 'aparece estando Condenado');
    checkEq(itemCost(ITEMS.GREED, player), GREED.baseCost, 'primer precio');
    gameState = 'PREP'; player.gold = 1000;
    buyItem(ITEMS.GREED);
    checkEq(player.lives, 1, 'compró una vida');
    check(!isCondemned(player), 'deja de estar Condenado');
    checkEq(itemCost(ITEMS.GREED, player), GREED.baseCost * 2, 'la próxima cuesta el doble');
    gameState = 'WAVE'; player.hp = 1;
    updateCreep(dummy({ atk: 9999, attackTimer: 99 }), 0.016);
    waitRespawn();
    checkNear(player.condemnPct, 0.6, 'al volver a quedar sin vidas el castigo se duplica');
});

test('Oleada: pasado el límite los creeps se enfurecen', () => {
    newGame('AXE');
    checkEq(enrageMult(), 1, 'sin enfurecer al empezar');
    tickWaveTimer(WAVE_TIME.limit + 10);
    checkNear(enrageMult(), 1 + 10 * WAVE_TIME.enragePerSecond, '10s de más');
    const c = dummy({ atk: 100, attackTimer: 99 });
    const hp = player.hp;
    updateCreep(c, 0.016);
    const expected = Math.round(mitigate(player, Math.round(100 * enrageMult()), 'physical'));
    checkEq(hp - player.hp, expected, 'el golpe del creep enfurecido');
});

test('Temporizadores: al vencer, el juego elige por vos', () => {
    resetGame();
    tickPhaseTimer(PHASE_TIMES.heroSelect + 1);
    checkEq(gameState, 'DRAFT', 'elige un héroe al azar y pasa al draft');
    tickPhaseTimer(PHASE_TIMES.draft + 1);
    checkEq(player.skills.length, 1, 'elige una habilidad al azar');
    checkEq(gameState, 'PREP', 'pasa a preparación');
    tickPhaseTimer(PHASE_TIMES.prep + 1);
    checkEq(gameState, 'WAVE', 'empieza la oleada');
});

test('Usar un Fragmento no reinicia el tiempo de preparación', () => {
    newGame('AXE');
    learn('AXE_GIRO', 0);
    gameState = 'PREP'; setPhaseTimer(12); player.destiny.fragments = 1;
    useFragment();
    document.querySelector('#draft-options .skill-card').click();
    checkEq(gameState, 'PREP', 'vuelve a preparación');
    checkEq(phaseTimeLeft, 12, 'con el tiempo que le quedaba');
});

test('Magos (Inteligencia): +100% de amplificación de hechizo', () => {
    const mage = new Hero({ ...HERO_TEMPLATES.AXE, primaryAttr: 'INT' });
    const warrior = new Hero(HERO_TEMPLATES.AXE);
    checkNear(mage.spellAmp - warrior.spellAmp, ATTRIBUTE_RULES.mageSpellAmp, 'amplificación extra');
});

// ============================================================ CONTROL
test('Aturdido no se mueve; ralentizar reduce la velocidad', () => {
    newGame('VAMPIRE');
    const c = dummy({ x: 10 });
    addEffect(c, { id: 'STUN', duration: 1, flags: ['stun'] });
    c.moveTimer = 99999; updateCreep(c, 0.05);
    checkEq(c.x, 10, 'posición del aturdido');
    removeEffect(c, 'STUN');
    c.x = 8; c.hp = c.maxHp = 9999;
    learn('VAMP_LEAP', 1).cast(player);
    checkNear(effMoveMult(c), 1 - 0.4, 'Salto Sangriento ralentiza 40%');
});

// ============================================================ MAGOS Y MOTOR
test('Pasiva en nivel 0 no hace nada; en nivel 1 actúa una vez por segundo', () => {
    newGame('FROSTWITCH');
    const aura = learn('FROSTWITCH_AURA', 0);
    const c = dummy({ hp: 9999, maxHp: 9999 });
    for (let i = 0; i < 60; i++) tickEffects(player, 1 / 60);
    checkEq(c.hp, 9999, 'nivel 0: sin daño');
    player.skillLevels[aura.id] = 1;
    for (let i = 0; i < 59; i++) tickEffects(player, 1 / 60);
    check(c.hp > 9999 - 1, 'todavía no pasó un segundo');
    tickEffects(player, 1 / 60); tickEffects(player, 1 / 60);
    check(c.hp < 9999, 'al segundo hace daño');
});

test('Resonancia Arcana: +8% de amplificación por carga (máx. 5)', () => {
    newGame('ARCANIST');
    const base = effSpellAmp(player);
    for (let i = 0; i < 7; i++) emit(player, 'onCast', { skill: null });
    checkNear(effSpellAmp(player) - base, 40, '5 cargas');
});

test('Escarcha Profunda: el daño mágico ralentiza 15%', () => {
    newGame('FROSTWITCH');
    const c = dummy({ hp: 9999, maxHp: 9999 });
    dealDamage(player, c, 10, 'physical');
    checkEq(effMoveMult(c), 1, 'el físico no ralentiza');
    dealDamage(player, c, 10, 'magical');
    checkNear(effMoveMult(c), 0.85, 'el mágico sí');
});

test('Armadura de Escarcha: +armadura y ralentiza el ataque de quien te pega', () => {
    newGame('FROSTWITCH');
    const armor0 = effArmor(player);
    const s = learn('FROSTWITCH_ARMOR', 1);
    s.cast(player);
    checkNear(effArmor(player) - armor0, valueAt(s, 'armorBonus', 1), 'armadura');
    const c = dummy();
    dealDamage(c, player, 10, 'physical');
    checkNear(effAtkSpeed(c) / c.atkSpeed, 1 - valueAt(s, 'attackerSlow', 1), 'velocidad de ataque del atacante');
});

test('Pulverización Ácida: quita armadura y hace daño por segundo', () => {
    newGame('ALCHEMIST');
    const s = learn('ALCHEMIST_ACID', 1);
    const c = dummy({ armor: 3, hp: 9999, maxHp: 9999 });
    s.cast(player);
    checkNear(effArmor(c), 3 - valueAt(s, 'armorReduction', 1), 'armadura del enemigo');
    for (let i = 0; i < 61; i++) tickEffects(c, 1 / 60);
    check(c.hp < 9999, 'daño por segundo');
});

test('Paso Etéreo: +20% de evasión al lanzar', () => {
    newGame('VOIDSAGE');
    const ev = effEvasion(player);
    emit(player, 'onCast', { skill: null });
    checkNear(effEvasion(player) - ev, 20, 'evasión');
});

test('Sobrecarga Mágica: el ataque después de lanzar suma daño mágico una sola vez', () => {
    newGame('ARCANIST');
    learn('ARCANIST_SURGE', 1);
    const c = dummy({ hp: 9999, maxHp: 9999 });
    emit(player, 'onCast', { skill: null });
    resolveBasicHit(player, c, 10, false);
    const withSurge = 9999 - c.hp;
    c.hp = 9999;
    resolveBasicHit(player, c, 10, false);
    check(withSurge > 9999 - c.hp, 'el primer golpe hace daño extra');
    checkEq(9999 - c.hp, 10, 'el segundo golpe es normal');
});

test('Furia Química: el Ascenso sube la Inteligencia', () => {
    newGame('ALCHEMIST');
    const s = learn('ALCHEMIST_CHEMICAL', 1);
    s.cast(player);
    const int0 = player.int, mana0 = player.maxMana;
    dealDamage(player, dummy(), 99999, 'pure');
    checkNear(player.int - int0, valueAt(s, 'intPerKill', 1), 'Inteligencia');
    check(player.maxMana > mana0, 'y con ella el maná máximo');
});

test('Pacto de la Muerte: daño puro en área y cura lo que drena', () => {
    newGame('NECROMANCER');
    const s = learn('NECROMANCER_REAP', 1);
    const a = dummy({ hp: 9999, maxHp: 9999, armor: 50 }), b = dummy({ y: player.y + 1, hp: 9999, maxHp: 9999 });
    player.hp = 1;
    s.cast(player);
    const expected = Math.round(valueAt(s, 'baseDmg', 1) + player.int * valueAt(s, 'intRatio', 1));
    checkEq(9999 - a.hp, expected, 'el daño puro ignora la armadura');
    checkEq(player.hp, Math.min(player.maxHp, 1 + 2 * expected), 'cura el total drenado');
});

// ============================================================ PARTIDAS COMPLETAS
// El "jugador" draftea la primera opción, reparte los puntos, camina hacia el enemigo más cercano y
// lanza sus habilidades. Es invulnerable para que la prueba mida que el flujo completo funciona.
function simulateGame(heroIndex) {
    resetGame();
    document.querySelectorAll('#hero-options .skill-card')[heroIndex].click();
    const spend = () => { let again = true; while (again) { again = false; for (const s of player.skills) if (levelUpSkill(player, s)) again = true; } };
    let guard = 0;
    while (gameState !== 'VICTORY' && gameState !== 'GAMEOVER' && guard++ < 30) {
        if (gameState === 'DRAFT') document.querySelector('#draft-options .skill-card').click();
        if (gameState === 'PREP') { spend(); document.getElementById('start-wave-btn').click(); }
        if (gameState === 'WAVE') {
            addEffect(player, { id: 'TEST_GOD', duration: 1e9, flags: ['invulnerable'] });
            for (let f = 0; gameState === 'WAVE' && f < 6000; f++) {
                spend();
                const t = nearestEnemy(player);
                keys = {};
                if (t && Math.hypot(t.x - player.x, t.y - player.y) > player.attackRange) {
                    if (t.x !== player.x) keys[t.x > player.x ? 'd' : 'a'] = true;
                    if (t.y !== player.y) keys[t.y > player.y ? 's' : 'w'] = true;
                }
                if (f % 20 === 0) player.skills.forEach(s => handleSkillKeypress(player.keyBindings[s.id]));
                gameClock += 0.05; updateWave(0.05);
            }
            keys = {};
            if (gameState === 'WAVE') throw new Error('una oleada no terminó');
        }
    }
    return { state: gameState, skills: player.skills.length, level: player.level };
}

Object.keys(HERO_TEMPLATES).forEach((key, i) => {
    test(`Partida completa con ${HERO_TEMPLATES[key].name}`, () => {
        const r = simulateGame(i);
        checkEq(r.state, 'VICTORY', 'resultado');
        checkEq(r.skills, KIT_SIZE, 'kit completo');
        check(r.level > 1, 'subió de nivel');
    }, { random: true });
});

test('Nueva Partida deja todo como al empezar', () => {
    newGame('AXE');
    resetGame();
    checkEq(player, null, 'jugador');
    checkEq(gameState, 'HERO_SELECT', 'estado');
    checkEq(document.getElementById('hero-select-panel').style.display, 'block', 'panel de selección visible');
});

// ============================================================ EJECUCIÓN
function runTests() {
    const results = TESTS.map(t => {
        try {
            if (t.opts.random) t.fn(); else withRandom(0.99, t.fn);
            return { name: t.name, ok: true };
        } catch (e) {
            return { name: t.name, ok: false, error: e.message };
        }
    });
    keys = {};
    resetGame();
    const failed = results.filter(r => !r.ok);
    const panel = document.createElement('div');
    panel.id = 'test-report';
    panel.innerHTML = `<h3>${failed.length ? '❌' : '✅'} Pruebas: ${results.length - failed.length}/${results.length} OK</h3>` +
        results.map(r => `<div class="${r.ok ? 'ok' : 'fail'}">${r.ok ? '✅' : '❌'} ${r.name}${r.ok ? '' : `<br><small>${r.error}</small>`}</div>`).join('');
    document.body.appendChild(panel);
    document.title = `${failed.length ? '❌' : '✅'} ${results.length - failed.length}/${results.length} pruebas`;
    console.log(`Pruebas: ${results.length - failed.length}/${results.length} OK`);
    failed.forEach(r => console.error(`❌ ${r.name}: ${r.error}`));
    return results;
}

if (/[?&]test\b/.test(location.search)) window.addEventListener('load', () => setTimeout(runTests, 0));
