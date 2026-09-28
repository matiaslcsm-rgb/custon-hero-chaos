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
// Oleada fija de Grunts para que las pruebas no dependan del tema sorteado.
const TEST_WAVE = { name: 'Prueba', groups: [{ type: 'GRUNT', count: 10 }], boss: 'GRUNT' };

// Partida en curso con el héroe elegido, en medio de una oleada, con todos los creeps lejos (x = 19).
function newGame(heroKey) {
    resetGame();
    selectHero(HERO_TEMPLATES[heroKey]);
    showPanel('draft-container', false);
    gameState = 'WAVE';
    player.inRest = false;
    arenas = [makeArena('wave', [player])];
    spawnWave(player.arena, TEST_WAVE);
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
// Termina todos los duelos en curso por tiempo (gana el de más % de vida; empate al azar).
function skipDuels() {
    if (gameState !== 'DUEL') return;
    arenas.forEach(a => { a.elapsed = DUEL_TIME; });
    updateWave(0.016);
}
// Mata a todos los creeps de todas las arenas y termina la fase de oleadas (salteando la previa de apuestas).
function clearAllWaves(skipBetting = true) {
    heroes.forEach(h => { if (h.arena) h.arena.creeps.forEach(c => { c.hp = 0; }); });
    updateWave(0.016);
    if (skipBetting) endBetting();
}
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
    checkEq(h.maxHp, HERO_TEMPLATES.AXE.baseHp + 24 * 5, 'HP = base + 5 por Fuerza');
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
    const chusma = makeCreep(CREEP_TYPES.CHUSMA, 6, 5, 1, false, 0);
    chusma.arena = player.arena;
    creeps.push(chusma);
    dealDamage(player, chusma, 1, 'physical');
    check(!chusma.isAlive(), 'la Chusma muere de un golpe');
});

// ============================================================ HABILIDADES Y NIVELES
test('Habilidad en nivel 0 no se lanza; en nivel 1 cobra maná y enfriamiento', () => {
    newGame('AXE');
    const s = learn('AXE_HACHAZO', 0);
    const d = dummy({ hp: 9999, maxHp: 9999 });
    const mana = player.mana;
    handleSkillKeypress('e');
    checkEq(player.mana, mana, 'maná en nivel 0');
    checkEq(targeting, null, 'en nivel 0 ni siquiera se apunta');
    player.skillLevels[s.id] = 1;
    handleSkillKeypress('e'); // se apunta con el mouse...
    check(targeting && targeting.skill === s, 'modo apuntar');
    cancelTargeting();
    castAt(player, s, d.x, d.y); // ...y el clic la lanza
    checkEq(mana - player.mana, valueAt(s, 'manaCost', 1), 'maná gastado');
    checkNear(player.cooldowns[s.id], valueAt(s, 'cooldown', 1) * COOLDOWN_MULT, 'enfriamiento (25% más corto)');
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
    const ls = HERO_TEMPLATES.VAMPIRE.baseLifesteal / 100;
    checkEq(player.hp - 10, Math.round(100 * ls * 2), 'Hambre duplica contra <30% HP');
    learn('VAMP_DARKBLOOD', 1).cast(player);
    player.hp = 10; applyLifesteal(player, 100, c);
    checkEq(player.hp - 10, Math.round(100 * ls * (2 + 0.3)), 'Sangre Oscura suma al multiplicador');
});

test('Hambre: cada baja cura 5% de la vida máxima', () => {
    newGame('VAMPIRE');
    player.hp = 50;
    dealDamage(player, dummy(), 99999, 'pure');
    checkEq(player.hp - 50, Math.round(player.maxHp * 0.05), 'curación por baja');
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

test('Sin vidas contra creeps: queda eliminado (espectador)', () => {
    newGame('AXE');
    player.lives = 1; player.hp = 1;
    const c = dummy({ atk: 9999, attackTimer: 99 });
    updateCreep(c, 0.016);
    checkEq(player.lives, 0, 'vidas');
    check(player.eliminated, 'eliminado sin pasar por Condenado');
});

test('Los creeps nunca maldicen (aunque queden 3 héroes)', () => {
    newGame('AXE');
    heroes.slice(3).forEach(h => { h.eliminated = true; });
    player.hp = 1;
    updateCreep(dummy({ atk: 9999, attackTimer: 99 }), 0.016);
    checkEq(player.lives, 1, 'perdió una vida');
    check(!isCondemned(player), 'sin maldición');
});

test('Condenado: si lo mata un creep queda eliminado (una sola vez aunque peguen varios)', () => {
    newGame('AXE');
    player.lives = 0; setCondemned(player, 0.1); player.hp = 1;
    const attackers = [[4, 5], [6, 5], [5, 4], [5, 6]].map(([x, y]) => dummy({ x, y, attackTimer: 99, atk: 999 }));
    attackers.forEach(c => updateCreep(c, 0.016));
    check(player.eliminated, 'quedó eliminado');
    checkEq([...document.querySelectorAll('#combat-log p')].filter(p => p.textContent.includes('ELIMINADO')).length, 1, 'mensajes de eliminación');
});

test('Condenado: cada duelo perdido suma +10% de daño recibido', () => {
    newGame('AXE');
    setCondemned(player, CONDEMNED.initialPct);
    registerDuelLoss(player); registerDuelLoss(player);
    checkNear(player.condemnPct, 0.30, '10% + 2 duelos');
    checkNear(sumMod(player, 'dmgTakenPct'), 0.30, 'el efecto aplica el 30%');
});

test('Libro de talento: +5 permanentes al atributo, sin espacio, y cada libro encarece el siguiente', () => {
    newGame('AXE');
    gameState = 'PREP'; player.gold = 5000;
    const str = player.str, hp = player.maxHp, slots = player.inventory.length;
    checkEq(itemCost(ITEMS.TALENT_STR, player), 500, 'primer precio');
    check(buyItem(ITEMS.TALENT_STR), 'se compra');
    checkNear(player.str, str + 5, '+5 Fuerza');
    checkEq(player.maxHp, hp + 5 * ATTRIBUTE_RULES.str.hp, 'la Fuerza suma vida');
    checkEq(player.inventory.length, slots, 'no ocupa espacio');
    checkEq(itemCost(ITEMS.TALENT_INT, player), 750, 'el siguiente (de cualquier atributo) cuesta +250');
    buyItem(ITEMS.TALENT_INT);
    checkEq(player.gold, 5000 - 500 - 750, 'cobró 500 + 750');
    checkEq(itemCost(ITEMS.TALENT_AGI, player), 1000, 'y sigue subiendo');
});

test('Injusticia de los Codiciosos: solo Condenado, vida y precio doble', () => {
    newGame('AXE');
    check(!itemAvailable(ITEMS.GREED, player), 'no aparece sin estar Condenado');
    player.lives = 1; setCondemned(player, 0.3);
    check(itemAvailable(ITEMS.GREED, player), 'aparece estando Condenado');
    checkEq(itemCost(ITEMS.GREED, player), GREED.baseCost, 'primer precio');
    gameState = 'PREP'; player.gold = 1000;
    buyItem(ITEMS.GREED);
    checkEq(player.lives, 2, 'compró una vida');
    check(!isCondemned(player), 'deja de estar Condenado');
    checkEq(itemCost(ITEMS.GREED, player), GREED.baseCost * 2, 'la próxima cuesta el doble');
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
    startHeroPick();
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
    checkNear(effMoveMult(c), 1 - SKILL_INDEX.VAMP_LEAP.values.slow, 'Salto Sangriento ralentiza');
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

// ============================================================ CREEPS E ÍTEMS DE CONTRA
// Agrega un creep de un tipo al lado del jugador (o donde se indique).
function spawnType(key, props = {}) {
    const c = makeCreep(CREEP_TYPES[key], player.x + 1, player.y, 1, false, 0);
    c.arena = player.arena;
    Object.assign(c, props);
    creeps.push(c);
    return c;
}

test('Oleadas: tema sorteado, cantidades correctas y el aviso coincide con lo que aparece', () => {
    newGame('AXE');
    waveNumber = 1;
    const wave = { name: 'Enjambre', groups: [{ type: 'SWARM', count: 2 }, { type: 'GRUNT', count: 2 }], boss: 'SCOUT' };
    spawnWave(player.arena, wave);
    checkEq(creeps.filter(c => c.key === 'SWARM').length, 8, 'el Enjambre viene de a 4');
    checkEq(creeps.length, 8 + 2 + 1, 'total con el jefe');
    check(boss.isBoss && boss.key === 'SCOUT', 'jefe del tipo del tema');
    checkEq(new Set(creeps.map(c => c.x + ',' + c.y)).size, creeps.length, 'cada uno en su casilla');
    resetGame(); selectHero(HERO_TEMPLATES.AXE); learnSkill(SKILL_INDEX.AXE_GIRO);
    const preview = nextWave;
    check(!!preview && document.getElementById('wave-preview').textContent.includes(preview.name), 'el aviso muestra el tema');
    startWave();
    const expected = preview.groups.reduce((n, g) => n + groupUnits(g), 0) + 1;
    checkEq(creeps.length, expected, 'la oleada que aparece es la avisada');
}, { random: true });

test('Chamán: su daño es mágico (lo frena la resistencia mágica, no la armadura)', () => {
    newGame('AXE');
    const c = spawnType('SHAMAN', { attackTimer: 99 });
    player.armor = 50; player.magicResist = 0;
    let hp = player.hp; updateCreep(c, 0.016);
    checkEq(hp - player.hp, Math.round(c.atk), 'la armadura no lo reduce');
    giveItem(player, 'CLOAK');
    hp = player.hp; c.attackTimer = 99; updateCreep(c, 0.016);
    check(effMagicResist(player) >= 25, 'la Capa da resistencia mágica');
    checkEq(hp - player.hp, Math.round(c.atk * (1 - effMagicResist(player) / 100)), 'y reduce el daño del Chamán');
});

test('Sanador: cura al más herido cada 3s; la Lanza Cortacuras lo reduce a la mitad', () => {
    newGame('AXE');
    player.x = 12; // el Sanador (rango 3) ya está a distancia de ataque y no se mueve
    const healer = spawnType('HEALER', { x: 15, y: 5 });
    const hurt = spawnType('GRUNT', { x: 16, y: 5 }); hurt.hp = 5;
    const heal = CREEP_TYPES.HEALER.healAmount;
    for (let i = 0; i < 3 * 60 + 1; i++) updateCreep(healer, 1 / 60);
    checkEq(hurt.hp, 5 + heal, 'curación fija');
    giveItem(player, 'SPEAR');
    hurt.hp = 5; dealDamage(player, hurt, 1, 'pure');
    for (let i = 0; i < 3 * 60 + 1; i++) updateCreep(healer, 1 / 60);
    checkEq(hurt.hp, 4 + Math.round(heal * (1 - ITEMS.SPEAR.antiHeal)), 'con Cortacuras cura menos');
});

test('Espectro: esquiva ataques básicos; la Hoja Certera no falla', () => {
    newGame('AXE');
    const e = spawnType('SPECTER', { hp: 9999, maxHp: 9999 });
    check(withRandom(0.3, () => dealDamage(player, e, 10, 'physical', { isAttack: true })).evaded, 'con 50% de evasión esquiva (azar 0.3)');
    giveItem(player, 'TRUESTRIKE');
    check(!withRandom(0.3, () => dealDamage(player, e, 10, 'physical', { isAttack: true })).evaded, 'con Hoja Certera no');
});

test('Acorazado: armadura alta; el Martillo Rompecorazas se la baja golpe a golpe', () => {
    newGame('AXE');
    const armor = CREEP_TYPES.ARMORED.armor;
    const a = spawnType('ARMORED', { hp: 9999, maxHp: 9999 });
    checkEq(dealDamage(player, a, 100, 'physical').dealt, Math.round(100 * (1 - armor * 0.04)), 'reducción por armadura');
    giveItem(player, 'HAMMER');
    for (let i = 0; i < 5; i++) resolveBasicHit(player, a, 1, false);
    const maxBreak = ITEMS.HAMMER.armorPerHit * ITEMS.HAMMER.maxStacks;
    checkNear(effArmor(a), armor - maxBreak, 'baja hasta el máximo de acumulaciones');
});

test('Kamikaze: explota al llegar, muere y no da oro', () => {
    newGame('AXE');
    const k = spawnType('KAMIKAZE');
    const hp = player.hp, gold = player.gold;
    updateCreep(k, 0.016);
    check(!k.isAlive(), 'se destruyó');
    check(player.hp < hp, 'hizo daño');
    checkEq(player.gold, gold, 'sin oro por su muerte');
});

test('Aturdidor: aturde cada N golpes; aturdido no te movés ni lanzás; las Botas Firmes lo acortan', () => {
    newGame('AXE');
    const s = learn('AXE_GIRO', 1);
    const { stunEvery, stunDuration } = CREEP_TYPES.STUNNER;
    const t = spawnType('STUNNER', { atk: 1 });
    for (let i = 0; i < stunEvery - 1; i++) { t.attackTimer = 99; updateCreep(t, 0.016); }
    check(!hasFlag(player, 'stun'), 'todavía no');
    t.attackTimer = 99; updateCreep(t, 0.016);
    check(hasFlag(player, 'stun'), 'aturdido al golpe ' + stunEvery);
    keys = { d: true }; const x = player.x;
    updateWave(1);
    keys = {};
    checkEq(player.x, x, 'no se mueve');
    check(!tryCastSkill(player, s, { quiet: true }), 'no lanza habilidades');
    removeEffect(player, 'STUN');
    player.stunImmuneUntil = 0;
    giveItem(player, 'BOOTS');
    for (let i = 0; i < stunEvery; i++) { t.attackTimer = 99; updateCreep(t, 0.016); }
    checkNear(getEffect(player, 'STUN').until - gameClock, stunDuration * (1 - ITEMS.BOOTS.mods.statusResist), 'dura menos');
});

test('Inmunidad tras aturdimiento: un héroe no puede quedar aturdido para siempre', () => {
    newGame('AXE');
    addEffect(player, { id: 'STUN', duration: 1, flags: ['stun'] });
    gameClock += 1.1; tickEffects(player, 0.016);
    check(!addEffect(player, { id: 'STUN', duration: 1, flags: ['stun'] }), 'recién salido del aturdimiento, es inmune');
    gameClock += STUN_IMMUNITY_AFTER;
    check(!!addEffect(player, { id: 'STUN', duration: 1, flags: ['stun'] }), 'pasada la inmunidad, se lo puede aturdir');
    const c = dummy();
    addEffect(c, { id: 'STUN', duration: 1, flags: ['stun'] }); gameClock += 1.1;
    check(!!addEffect(c, { id: 'STUN', duration: 1, flags: ['stun'] }), 'a los creeps no se les aplica');
});

test('Ladrón: roba oro y huye; si lo matás recuperás el oro +50%', () => {
    newGame('AXE');
    player.gold = 100;
    const steal = CREEP_TYPES.THIEF.steal;
    const t = spawnType('THIEF', { attackTimer: 99, hp: 9999, maxHp: 9999 });
    updateCreep(t, 0.016);
    checkEq(player.gold, 100 - steal, 'robó');
    const x0 = t.x;
    for (let i = 0; i < 60; i++) updateCreep(t, 1 / 60);
    check(t.x > x0, 'huye');
    t.hp = 1; dealDamage(player, t, 99, 'pure');
    check(player.gold >= 100 - steal + Math.round(steal * 1.5), 'recupera lo robado +50% (más el oro por matarlo)');
});

test('Recetas: un compuesto usa los básicos que ya tenés y cobra solo lo que falta', () => {
    newGame('AXE');
    gameState = 'PREP'; player.gold = 1000;
    const hoja = ITEMS.TRUESTRIKE;
    checkEq(itemCost(hoja, player), itemTotalCost(hoja), 'sin componentes cuesta el total');
    checkEq(itemTotalCost(hoja), ITEMS.BLADE.cost + ITEMS.QUICK_GLOVES.cost + hoja.recipe, 'total = componentes + receta');
    buyItem(ITEMS.BLADE);
    checkEq(itemCost(hoja, player), ITEMS.QUICK_GLOVES.cost + hoja.recipe, 'con la Espada, paga los Guantes y la receta');
    const atk0 = effAttack(player);
    buyItem(hoja);
    checkEq(player.inventory.map(i => i.key).join(','), 'TRUESTRIKE', 'la Espada se usó para armarla');
    checkEq(effAttack(player) - atk0, hoja.mods.flatAtk - ITEMS.BLADE.mods.flatAtk, 'daño del compuesto (en vez del de la Espada)');
    check(hasFlag(player, 'trueStrike'), 'y su efecto especial');
    check(!buyItem(hoja), 'un compuesto no se puede tener dos veces');
});

test('Recetas con componentes repetidos (Martillo = 2 Espadas) y básicos que se acumulan', () => {
    newGame('AXE');
    gameState = 'PREP'; player.gold = 1000;
    const atk0 = effAttack(player);
    buyItem(ITEMS.BLADE); buyItem(ITEMS.BLADE);
    checkEq(effAttack(player) - atk0, 2 * ITEMS.BLADE.mods.flatAtk, 'dos Espadas suman');
    checkEq(itemCost(ITEMS.HAMMER, player), ITEMS.HAMMER.recipe, 'con las dos Espadas solo paga la receta');
    buyItem(ITEMS.HAMMER);
    checkEq(countItem(player, 'BLADE'), 0, 'usó las dos');
    checkEq(countItem(player, 'HAMMER'), 1, 'y armó el Martillo');
});

test('Inventario: 6 espacios; un compuesto entra si libera los espacios de sus componentes', () => {
    newGame('AXE');
    gameState = 'PREP'; player.gold = 5000;
    ['BLADE', 'QUICK_GLOVES', 'CHAINMAIL', 'RUNE_CAPE', 'VITALITY', 'VITALITY'].forEach(k => buyItem(ITEMS[k]));
    checkEq(player.inventory.length, INVENTORY_SLOTS, 'inventario lleno');
    checkEq(itemBlocker(ITEMS.FANG, player), 'Inventario lleno', 'un séptimo básico no entra');
    check(buyItem(ITEMS.TRUESTRIKE), 'la Hoja Certera entra: usa 2 espacios y ocupa 1');
    checkEq(player.inventory.length, INVENTORY_SLOTS - 1, 'quedó un espacio libre');
    check(buyItem(ITEMS.HEART), 'el Corazón usa las 2 Piedras que ya tenía');
});

test('Ítem de atributo: suma al atributo y a sus stats; venderlo devuelve la mitad y lo quita', () => {
    newGame('AXE');
    gameState = 'PREP'; player.gold = 1000;
    const str0 = player.attr('str'), hp0 = player.maxHp;
    buyItem(ITEMS.BELT);
    checkEq(player.attr('str') - str0, ITEMS.BELT.mods.str, 'Fuerza');
    checkEq(player.maxHp - hp0, ITEMS.BELT.mods.str * ATTRIBUTE_RULES.str.hp, 'vida extra');
    const gold = player.gold;
    sellItem('BELT');
    checkEq(player.gold - gold, Math.floor(itemTotalCost(ITEMS.BELT) * SELL_REFUND), 'devuelve la mitad del precio total');
    checkEq(player.attr('str'), str0, 'pierde la Fuerza del ítem');
    checkEq(player.maxHp, hp0, 'y la vida');
});

test('Égida Inquebrantable: por debajo del 40% da inmunidad mágica (sin daño mágico ni aturdimientos)', () => {
    newGame('AXE');
    giveItem(player, 'AEGIS');
    const c = dummy();
    player.hp = player.maxHp;
    dealDamage(c, player, player.maxHp * 0.7, 'pure');
    check(hasFlag(player, 'magicImmune'), 'se activó');
    const hp = player.hp;
    dealDamage(c, player, 100, 'magical');
    checkEq(player.hp, hp, 'sin daño mágico');
    check(!addEffect(player, { id: 'STUN', duration: 1, flags: ['stun'] }), 'sin aturdimientos');
    dealDamage(c, player, 10, 'physical');
    check(player.hp < hp, 'el daño físico sí entra');
});

test('Coraza de Espinas devuelve daño cuerpo a cuerpo; Corazón del Titán regenera por segundo', () => {
    newGame('AXE');
    giveItem(player, 'THORNS');
    const c = dummy({ hp: 9999, maxHp: 9999 });
    const { dealt } = dealDamage(c, player, 100, 'physical');
    checkEq(9999 - c.hp, Math.round(dealt * ITEMS.THORNS.reflect), 'reflejo');
    giveItem(player, 'HEART');
    player.hp = 10;
    for (let i = 0; i < 61; i++) tickEffects(player, 1 / 60);
    checkEq(player.hp, 10 + Math.round(player.maxHp * ITEMS.HEART.regenPct), 'curación por segundo');
});

test('Brujo: rayo cada 5s con daño mágico y aturdimiento; Escarchador ralentiza; Tamborilero acelera', () => {
    newGame('AXE');
    const w = spawnType('WARLOCK', { x: player.x + 3 });
    const hp = player.hp;
    for (let i = 0; i < CREEP_TYPES.WARLOCK.boltEvery * 60 + 1; i++) updateCreep(w, 1 / 60);
    check(player.hp < hp, 'el rayo hizo daño');
    check(hasFlag(player, 'stun'), 'y aturdió');
    newGame('AXE');
    const f = spawnType('FROSTCASTER', { attackTimer: 99 });
    updateCreep(f, 0.016);
    checkNear(effMoveMult(player), 1 - CREEP_TYPES.FROSTCASTER.slow, 'ralentizado');
    const d = spawnType('DRUMMER', { x: 15, y: 5 }), ally = spawnType('GRUNT', { x: 16, y: 5 });
    for (let i = 0; i < 31; i++) updateCreep(d, 1 / 60);
    checkNear(effAtkSpeed(ally) / ally.atkSpeed, 1 + CREEP_TYPES.DRUMMER.auraAtkSpeed, 'aliado acelerado');
});

test('Cuerpos físicos: entrar a una casilla ocupada tarda más según el tamaño; Paso Fantasma atraviesa', () => {
    newGame('DANCER');
    const c = dummy();
    checkNear(bodyPenalty(player, c.x, c.y), BODY_SLOW.medium, 'creep normal: mediano');
    checkNear(bodyPenalty(player, c.x, c.y + 1), 0, 'casilla libre');
    const swarm = spawnType('SWARM', { x: 10, y: 2 }), boss = spawnType('GRUNT', { x: 11, y: 2, isBoss: true });
    checkNear(bodyPenalty(player, 10, 2), BODY_SLOW.small, 'enjambre: chico');
    checkNear(bodyPenalty(player, 11, 2), BODY_SLOW.large, 'jefe: grande');
    // El héroe empuja: con el tiempo de un paso normal no entra; con el tiempo extra, sí
    const step = player.moveInterval / (effMoveMult(player) * MOVE_SPEED_MULT);
    keys['d'] = true;
    try {
        player.moveTimer = step * 1.2; updateHero(player, player.arena, 0);
        checkEq(player.x, c.x - 1, 'todavía empujando');
        player.moveTimer = step * (1 + BODY_SLOW.medium) + 0.01; updateHero(player, player.arena, 0);
        checkEq(player.x, c.x, 'pasó');
        player.x = c.x - 1;
        addEffect(player, { id: 'PHASE', duration: 5, flags: ['phasing'] });
        player.moveTimer = step * 1.2; updateHero(player, player.arena, 0);
        checkEq(player.x, c.x, 'atravesando no frena');
    } finally { keys['d'] = false; }
});

test('Cuerpos físicos: un creep bloqueado prueba el otro camino si está libre', () => {
    newGame('AXE');
    const a = spawnType('GRUNT', { x: 10, y: 5 }), b = spawnType('GRUNT', { x: 12, y: 6 });
    // b va hacia (10, 4): su camino principal (x) está libre
    b.moveTimer = 0; stepCreepToward(b, 9, 5, 5);
    checkEq([b.x, b.y].join(), '11,6', 'avanza por x');
    b.x = 11; b.y = 5; // ahora (10,5) está ocupada por a: prueba por y
    b.moveTimer = 0; stepCreepToward(b, 8, 4, 5);
    checkEq([b.x, b.y].join(), '11,4', 'rodea por y');
});

test('Ancla: cada golpe ralentiza y quita evasión', () => {
    newGame('AXE');
    const ev = effEvasion(player);
    const a = spawnType('ANCHOR', { x: player.x + 3, attackTimer: 99 });
    updateCreep(a, 0.016);
    checkNear(effMoveMult(player), 1 - CREEP_TYPES.ANCHOR.slow, 'ralentizado');
    checkNear(effEvasion(player), ev - CREEP_TYPES.ANCHOR.evasionLoss, 'sin evasión');
});

test('Danza Cinética: moverse 2 casillas y pegar da cargas; con 5, el próximo golpe hace un golpe extra', () => {
    newGame('DANCER');
    const c = dummy({ hp: 5000, maxHp: 5000 });
    const inn = player.innate;
    resolveBasicHit(player, c, 10, false);
    check(!getEffect(player, 'DANCER_DANCE'), 'quieto no carga');
    emit(player, 'onMove', { steps: 1 }); emit(player, 'onMove', { steps: 1 });
    resolveBasicHit(player, c, 10, false);
    checkEq(getEffect(player, 'DANCER_DANCE').data.charges, 1, 'una carga');
    checkNear(effEvasion(player), player.evasion + inn.evasionPerCharge, '+1% evasión por carga');
    for (let i = 0; i < 4; i++) resolveBasicHit(player, c, 10, false);
    checkEq(getEffect(player, 'DANCER_DANCE').data.charges, 5, 'cinco cargas');
    const hp = c.hp;
    resolveBasicHit(player, c, 10, false);
    checkEq(hp - c.hp, 10 + Math.round(player.atk * inn.burstMult), 'golpe normal + golpe extra');
    check(!getEffect(player, 'DANCER_DANCE'), 'consumió las cargas');
    gameClock += inn.moveWindow + 0.1;
    resolveBasicHit(player, c, 10, false);
    check(!getEffect(player, 'DANCER_DANCE'), 'el movimiento viejo ya no cuenta');
});

test('Ritmo Letal: suma daño contra el mismo objetivo y se borra al cambiar', () => {
    newGame('DANCER');
    const skill = learn('DANCER_RHYTHM', 1);
    const a = dummy(), b = dummy({ y: player.y + 1 });
    const hitDmg = t => { const ctx = { target: t, dmg: 100 }; emit(player, 'beforeAttack', ctx); return ctx.dmg; };
    checkNear(hitDmg(a), 100, 'primer golpe sin bonus');
    checkNear(hitDmg(a), 100 * (1 + val(skill, player, 'dmgPerStack')), 'segundo golpe con 1 carga');
    checkNear(hitDmg(b), 100, 'cambiar de objetivo borra las cargas');
});

test('Tormenta Cinética: onda cada N ataques y +vel. de ataque permanente por baja (Ascenso)', () => {
    newGame('DANCER');
    const ult = learn('DANCER_STORM', 1);
    const c = dummy({ hp: 5000, maxHp: 5000 }), other = dummy({ x: player.x, y: player.y + 1, hp: 5000, maxHp: 5000 });
    tryCastSkill(player, ult);
    for (let i = 0; i < val(ult, player, 'waveEvery'); i++) resolveBasicHit(player, c, 1, false);
    check(other.hp < 5000, 'la onda golpeó al de al lado');
    const as = player.atkSpeed;
    emit(player, 'onKill', { victim: c });
    checkNear(player.atkSpeed, as + player.baseAtkSpeed * val(ult, player, 'atkSpeedPerKill') / 100, 'Ascenso: vel. de ataque permanente');
});

test('Área de Descanso: al terminar la oleada vas ahí y volvés con vida, maná completos y sin mejoras temporales', () => {
    newGame('AXE');
    waveNumber = 1;
    creeps.forEach(c => { c.hp = 0; });
    player.hp = 5; player.mana = 0;
    addEffect(player, { id: 'TEMP', duration: 99, mods: { atkPct: 1 } });
    updateWave(0.016); // su arena quedó limpia: terminan las oleadas
    skipDuels();
    check(player.inRest, 'está en el Área de Descanso');
    checkEq(player.hp, player.maxHp, 'vida llena');
    check(!getEffect(player, 'TEMP'), 'sin mejoras temporales');
    if (gameState === 'DRAFT') learnSkill(currentDraft.options[0]);
    player.hp = 5; player.x = 0;
    startWave();
    check(!player.inRest, 'volvió al combate');
    checkEq(player.hp, player.maxHp, 'con la vida llena');
    checkEq(player.mana, player.maxMana, 'y el maná lleno');
    checkEq(`${player.x},${player.y}`, `${WAVE_START.x},${WAVE_START.y}`, 'en el punto de inicio');
});

test('IA: con el inventario lleno vende un contra que no sirve para comprar el que necesita', () => {
    newGame('AXE');
    gameState = 'PREP'; player.gold = 500;
    ['BELT', 'TRUESTRIKE', 'SPEAR', 'BOOTS', 'CLOAK', 'THORNS'].forEach(k => giveItem(player, k));
    nextWave = { name: 'Muralla', groups: [{ type: 'ARMORED', count: 3 }], boss: 'ARMORED' };
    aiShop(player);
    checkEq(countItem(player, 'HAMMER'), 1, 'compró el Martillo');
    check(player.inventory.length <= INVENTORY_SLOTS, 'no pasó de 6');
    checkEq(countItem(player, 'BELT'), 1, 'no vendió su ítem de atributo');
});

test('IA: arma los contras de la próxima oleada (de a componentes si no le alcanza)', () => {
    newGame('AXE');
    gameState = 'PREP'; player.gold = 1000;
    nextWave = { name: 'Muralla', groups: [{ type: 'ARMORED', count: 2 }, { type: 'SHAMAN', count: 3 }, { type: 'SPECTER', count: 1 }], boss: 'ARMORED' };
    aiShop(player);
    checkEq(countItem(player, 'HAMMER'), 1, 'Martillo contra Acorazados');
    checkEq(countItem(player, 'CLOAK'), 1, 'Capa contra Chamanes');
    checkEq(countItem(player, 'TRUESTRIKE'), 0, 'no compra contra un solo Espectro');
    newGame('AXE');
    gameState = 'PREP'; player.gold = 120;
    nextWave = { name: 'Muralla', groups: [{ type: 'ARMORED', count: 3 }], boss: 'ARMORED' };
    aiShop(player);
    checkEq(countItem(player, 'BLADE'), 1, 'sin oro para el Martillo entero, compra una Espada para ir armándolo');
});

test('Prioridad: el ataque automático va primero por el Sanador si está a tiro', () => {
    newGame('SNIPER');
    const grunt = spawnType('GRUNT');
    const healer = spawnType('HEALER', { x: player.x + 4 });
    checkEq(pickAttackTarget(player, effRange(player)), healer, 'elige al Sanador aunque el Grunt esté más cerca');
    healer.x = 19;
    checkEq(pickAttackTarget(player, effRange(player)), grunt, 'fuera de rango, el más cercano');
});

// ============================================================ IA
test('IA a distancia: avanza si no hay nadie a tiro y retrocede si se le acercan', () => {
    newGame('SNIPER');
    const c = dummy({ x: 15, y: 5 });
    checkEq(aiMoveDirection(player).dx, 1, 'avanza hacia el enemigo lejano');
    c.x = 6;
    const dir = aiMoveDirection(player);
    checkEq(dir.dx, -1, 'retrocede alejándose del enemigo pegado');
    c.x = 9; // a 4 casillas, dentro del rango (5) y fuera de la zona de peligro (3)
    checkEq(JSON.stringify(aiMoveDirection(player)), JSON.stringify({ dx: 0, dy: 0 }), 'se queda disparando');
});

test('IA a distancia acorralada en una esquina se queda quieta', () => {
    newGame('ARCANIST');
    player.x = 0; player.y = 0;
    dummy({ x: 1, y: 1 });
    const dir = aiMoveDirection(player);
    checkEq(dir.dx === 1 && dir.dy === 1, false, 'no camina hacia el enemigo');
});

test('IA cuerpo a cuerpo: va al enemigo más cercano', () => {
    newGame('AXE');
    dummy({ x: 10, y: 8 });
    const dir = aiMoveDirection(player);
    checkEq(`${dir.dx},${dir.dy}`, '1,1', 'dirección');
});

test('IA: habilidades de área solo con 2+ enemigos cerca, sin ensuciar el registro', () => {
    newGame('AXE');
    const giro = learn('AXE_GIRO', 1);
    dummy({ hp: 9999, maxHp: 9999 });
    aiCastSkills(player);
    checkEq(player.cooldowns[giro.id], 0, 'con 1 enemigo no la usa');
    dummy({ y: player.y + 1, hp: 9999, maxHp: 9999 });
    aiCastSkills(player);
    check(player.cooldowns[giro.id] > 0, 'con 2 enemigos sí');
    const hacha = learn('AXE_HACHAZO', 1);
    creeps.forEach(k => { k.x = 19; });
    const logs = document.querySelectorAll('#combat-log p').length;
    aiCastSkills(player);
    checkEq(document.querySelectorAll('#combat-log p').length, logs, 'un intento fallido no deja mensajes');
    checkEq(player.cooldowns[hacha.id], 0, 'ni gasta el enfriamiento');
});

test('IA: definitiva primero al repartir puntos y prefiere habilidades naturales en el draft', () => {
    newGame('AXE');
    const ult = learn('AXE_FURIA', 0), giro = learn('AXE_GIRO', 0);
    player.level = 6; player.skillPoints = 2;
    aiSpendPoints(player);
    checkEq(skillLevel(player, ult), 1, 'definitiva');
    checkEq(skillLevel(player, giro), 1, 'y el resto');
    const pick = aiPickDraft(player, [SKILL_INDEX.SNIPER_VISION, SKILL_INDEX.AXE_HACHAZO, SKILL_INDEX.VAMP_CLAW]);
    checkEq(pick.id, 'AXE_HACHAZO', 'natural');
});

// ============================================================ MUNDO DE 8 HÉROES (fase F1)
test('Partida de 8: el jugador + 7 rivales con otros héroes, cada uno en su arena', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.AXE);
    checkEq(heroes.length, MAX_HEROES, 'héroes');
    check(heroes.slice(1).every(h => h.isAI && h.key !== 'AXE'), 'rivales con otros héroes');
    check(heroes.slice(1).every(h => h.skills.length === 1), 'los rivales ya draftearon');
    learnSkill(currentDraft.options[0]);
    startWave();
    checkEq(arenas.length, MAX_HEROES, 'una arena por héroe');
    checkEq(new Set(arenas.map(a => a.creeps)).size, MAX_HEROES, 'cada arena con sus propios creeps');
    check(arenas.every(a => a.creeps.length === arenas[0].creeps.length), 'todos pelean la misma oleada');
    check(heroes.every(h => enemiesOf(h) === h.arena.creeps), 'cada héroe pelea contra los creeps de su arena');
});

test('Las arenas se juegan en paralelo; al terminar todas, la ronda suma puntos y sigue', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.SNIPER);
    learnSkill(currentDraft.options[0]);
    waveNumber = DUEL_START_ROUND + 1;
    startWave();
    heroes.forEach(h => addEffect(h, { id: 'TEST_GOD', duration: 1e9, flags: ['invulnerable', 'persistent'] }));
    autopilot = true;
    try {
        for (let f = 0; (inCombat() || gameState === 'BETTING') && f < 20000; f++) {
            if (gameState === 'BETTING') endBetting();
            gameClock += 0.05; updateWave(0.05);
        }
    } finally { autopilot = false; }
    check(!inCombat(), 'terminó la ronda (oleadas, previa y duelos)');
    checkEq(waveNumber, DUEL_START_ROUND + 2, 'pasó a la ronda siguiente');
    const total = heroes.reduce((s, h) => s + h.points, 0);
    checkEq(total, MAX_HEROES * POINTS.waveClean + POINTS.duelWin, 'puntos: 8 oleadas limpias + 1 duelo');
    check(heroes.every(h => h.inRest && !h.arena), 'todos en el Área de Descanso');
});

test('Solo se ven los mensajes de la arena que estás mirando', () => {
    newGame('AXE');
    const rival = heroes[1];
    rival.inRest = false;
    arenas.push(makeArena('wave', [rival]));
    spawnWave(rival.arena, TEST_WAVE);
    rival.hp = 1;
    const c = rival.arena.creeps[0];
    Object.assign(c, { x: rival.x + 1, y: rival.y, atk: 999, attackTimer: 99 });
    const before = document.querySelectorAll('#combat-log p').length;
    updateWave(0.016);
    check(!rival.isAlive(), 'el rival murió en su arena');
    checkEq(document.querySelectorAll('#combat-log p').length, before, 'sin mensajes de su arena');
});

test('Rival Condenado que muere contra creeps queda eliminado y no juega la ronda siguiente', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.AXE);
    learnSkill(currentDraft.options[0]);
    startWave();
    const rival = heroes[3];
    rival.lives = 0; setCondemned(rival, 0.1);
    dealDamage(rival.arena.creeps[0], rival, 99999, 'pure');
    check(rival.eliminated, 'eliminado');
    check(rival.arena.done, 'su arena terminó');
    checkEq(heroRank(rival), MAX_HEROES, 'último en el ranking');
    clearAllWaves();
    check(!arenas.some(a => a.heroes.includes(rival)), 'no duela');
    skipDuels();
    if (gameState === 'DRAFT') learnSkill(currentDraft.options[0]);
    startWave();
    check(!arenas.some(a => a.heroes.includes(rival)), 'no tiene arena en la ronda 2');
    checkEq(arenas.length, MAX_HEROES - 1, 'juegan los otros 7');
});

test('Espectador: si el jugador queda eliminado, la partida sigue y mira a otro héroe', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.AXE);
    learnSkill(currentDraft.options[0]);
    startWave();
    player.lives = 0; setCondemned(player, 0.1);
    dealDamage(player.arena.creeps[0], player, 99999, 'pure');
    check(player.eliminated, 'eliminado');
    check(viewedHero !== player && !viewedHero.eliminated, 'pasa a mirar a un héroe en juego');
    clearAllWaves();
    skipDuels();
    checkEq(gameState, 'PREP', 'la partida sigue (sin draft para el eliminado)');
    startWave();
    checkEq(arenas.length, MAX_HEROES - 1, 'juegan los otros 7');
});

test('Fin de partida al llegar al máximo de rondas: gana el primero del ranking', () => {
    const saved = MAX_ROUNDS;
    try {
        MAX_ROUNDS = 1;
        resetGame();
        selectHero(HERO_TEMPLATES.AXE);
        learnSkill(currentDraft.options[0]);
        startWave();
        heroes[2].points = 10;
        clearAllWaves();
        skipDuels();
        checkEq(gameState, 'ENDED', 'terminó');
        checkEq(rankedHeroes()[0], heroes[2], 'gana el de más puntos');
    } finally { MAX_ROUNDS = saved; }
});

// ============================================================ DUELOS (fase F2)
// Deja la partida lista en el duelo de la ronda (todas las oleadas limpias). Por defecto el jugador pelea contra heroes[1]
// (la rotación elige a los que menos duelos pelearon).
function toDuels(heroKey = 'AXE', playerFights = true) {
    resetGame();
    selectHero(HERO_TEMPLATES[heroKey]);
    learnSkill(currentDraft.options[0]);
    waveNumber = DUEL_START_ROUND + 1; // los duelos arrancan en la ronda 5 (y la 5 tiene jefe)
    heroes.forEach((h, i) => { h.duelWins = playerFights ? (i < 2 ? 0 : 5) : (i === 0 ? 5 : 0); });
    startWave();
    clearAllWaves();
    return arenas;
}

test('Un duelo por ronda: pelean los que menos pelearon, sin repetir la pareja anterior; los demás miran', () => {
    toDuels();
    checkEq(gameState, 'DUEL', 'fase de duelo');
    checkEq(arenas.length, 1, 'un solo duelo');
    check(arenas[0].heroes.includes(player) && arenas[0].heroes.includes(heroes[1]), 'los que menos pelearon');
    check(heroes.slice(2).every(h => h.inRest), 'los demás, en la sala');
    for (let i = 0; i < 20; i++) {
        heroes.forEach(h => { h.duelWins = 0; h.duelLosses = 0; });
        lastDuelPair = [heroes[2], heroes[3]];
        const pair = pickDuelPair(heroes.slice(2, 5));
        check(!(pair.includes(heroes[2]) && pair.includes(heroes[3])), 'no repite la pareja anterior');
    }
    toDuels('AXE', false);
    check(!arenas[0].heroes.includes(player) && viewedHero === player, 'si no peleás, la cámara sigue en tu héroe');
    check(arenas[0].heroes.every(h => heroStatusIcon(h) === '🔥') && heroStatusIcon(player) === '🏕', 'el 🔥 marca a los duelistas');
}, { random: true });

test('Duelo: gana quien mata al otro (+3 puntos); con 5 o más en juego perder no cuesta nada', () => {
    toDuels();
    const arena = arenas.find(a => a.heroes.includes(player));
    const rival = arena.heroes.find(h => h !== player);
    const points = player.points, lives = rival.lives;
    dealDamage(player, rival, 99999, 'pure');
    check(arena.done, 'el duelo terminó');
    checkEq(player.points - points, POINTS.duelWin, 'puntos del ganador');
    checkEq(rival.lives, lives, 'los duelos no cuestan vidas');
    check(!isCondemned(rival), 'con 8 en juego, sin maldición');
    check(player.inRest && rival.inRest, 'los dos descansan');
    checkEq(rival.hp, rival.maxHp, 'el perdedor se recupera en el descanso');
});

test('Duelo con 3 héroes o menos: el perdedor queda maldito (aunque tenga vidas)', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    heroes.filter(h => h !== a && h !== b).slice(1).forEach(h => { h.eliminated = true; }); // quedan 3
    checkEq(aliveHeroes().length, DUEL_CURSE_ALIVE, 'quedan 3');
    dealDamage(a, b, 99999, 'pure');
    check(isCondemned(b) && b.lives === 2, 'maldito y con sus 2 vidas');
});

test('La maldición amplifica el daño de creeps y héroes sin maldición, no el de otro maldito', () => {
    newGame('AXE');
    const cursed = heroes[1], clean = heroes[2];
    setCondemned(player, 0.5);
    const c = dummy();
    const hp = player.hp;
    dealDamage(c, player, 100, 'pure'); checkEq(hp - player.hp, 150, 'creep: +50%');
    player.hp = hp; dealDamage(clean, player, 100, 'pure'); checkEq(hp - player.hp, 150, 'héroe sin maldición: +50%');
    setCondemned(cursed, 0.1);
    player.hp = hp; dealDamage(cursed, player, 100, 'pure'); checkEq(hp - player.hp, 100, 'héroe maldito: sin extra');
});

test('Maldito con vidas: un creep lo mata y pierde una vida (no queda eliminado)', () => {
    newGame('AXE');
    setCondemned(player, 0.1);
    player.hp = 1;
    updateCreep(dummy({ atk: 9999, attackTimer: 99 }), 0.016);
    check(!player.eliminated, 'sigue en juego');
    checkEq(player.lives, 1, 'perdió una vida');
});

test('Duelo: con más de 3 en juego, perder no cambia nada aunque esté maldito', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    heroes.filter(h => h !== a && h !== b).slice(2).forEach(h => { h.eliminated = true; }); // quedan 4
    setCondemned(b, 0.1);
    dealDamage(a, b, 99999, 'pure');
    checkNear(b.condemnPct, 0.1, 'sin castigo extra');
    check(!b.eliminated, 'sigue en la partida');
});

test('Con 3 en juego, cada duelo perdido suma una instancia; con 2, además cuesta una vida', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    heroes.filter(h => h !== a && h !== b).slice(1).forEach(h => { h.eliminated = true; }); // quedan 3
    setCondemned(b, 0.1);
    dealDamage(a, b, 99999, 'pure');
    checkNear(b.condemnPct, 0.2, 'una instancia más');
    checkEq(b.lives, 2, 'con 3 no cuesta vidas');
    check(!b.eliminated, 'sigue');
    toDuels();
    const [c, d] = arenas[0].heroes;
    heroes.forEach(h => { if (h !== c && h !== d) h.eliminated = true; }); // quedan 2
    dealDamage(c, d, 99999, 'pure');
    checkEq(d.lives, 1, 'con 2 pierde una vida');
    check(isCondemned(d), 'y una instancia de maldición');
    d.lives = 1; d.eliminated = false;
    toDuels();
    const [e, f] = arenas[0].heroes;
    heroes.forEach(h => { if (h !== e && h !== f) h.eliminated = true; });
    f.lives = 1;
    dealDamage(e, f, 99999, 'pure');
    check(f.eliminated, 'sin vidas: eliminado');
});

test('Duelo: si se acaba el tiempo gana el que tiene más % de vida; los enfriamientos arrancan en 0', () => {
    toDuels();
    check(arenas.every(a => a.heroes.every(h => Object.values(h.cooldowns).every(cd => cd === 0))), 'enfriamientos reiniciados');
    const arena = arenas[0];
    const [a, b] = arena.heroes;
    a.hp = a.maxHp * 0.3; b.hp = b.maxHp * 0.6;
    arena.elapsed = DUEL_TIME;
    updateWave(0.016);
    check(arena.done, 'terminó por tiempo');
    check(b.points > a.points, 'gana el de más % de vida');
});

test('Duelo: la IA usa su definitiva y habilidades de área contra un solo rival', () => {
    toDuels();
    const arena = arenas[0];
    const [a, b] = arena.heroes;
    a.skills.slice().forEach(s => a.removeSkill(s));
    const ult = SKILL_INDEX.AXE_GIRO; // de área
    a.addSkill(ult); a.skillLevels[ult.id] = 1; a.mana = a.maxMana;
    b.x = a.x + 1; b.y = a.y;
    aiCastSkills(a);
    check(a.cooldowns[ult.id] > 0, 'la lanzó contra un solo enemigo');
});

test('Coraza de Espinas también devuelve daño a héroes cuerpo a cuerpo en los duelos', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    giveItem(b, 'THORNS');
    a.baseAttackRange = 1.5; a.recalculateStats();
    const hp = a.hp;
    const { dealt } = dealDamage(a, b, 100, 'physical');
    checkEq(hp - a.hp, Math.round(dealt * ITEMS.THORNS.reflect * (1 - DUEL_DAMAGE_REDUCTION)), 'reflejo al atacante (con la reducción de duelo)');
});

// ============================================================ APUESTAS Y PREMIOS (fase F3)
// Deja la partida en la previa del duelo, con oro para apostar. El jugador no pelea (la rotación elige a otros), salvo
// que se pida lo contrario.
function toBetting(gold = 400, playerFights = false) {
    resetGame();
    selectHero(HERO_TEMPLATES.AXE);
    learnSkill(currentDraft.options[0]);
    waveNumber = DUEL_START_ROUND + 1;
    heroes.forEach((h, i) => { h.duelWins = playerFights ? (i < 2 ? 0 : 5) : (i === 0 ? 5 : 0); });
    startWave();
    player.gold = gold;
    clearAllWaves(false);
    player.gold = gold; // sin el interés de la oleada
}

test('Previa: al terminar las oleadas se eligen los duelistas; todos los demás apuestan; después pelean esos dos', () => {
    toBetting();
    checkEq(gameState, 'BETTING', 'previa');
    checkEq(bettablePairs().length, 1, 'un solo duelo para apostar');
    const pair = duelPlan.pairs[0].slice();
    tickPhaseTimer(PHASE_TIMES.betting + 0.1);
    checkEq(gameState, 'DUEL', 'al vencer el tiempo arranca el duelo');
    checkEq(arenas[0].heroes.join(), pair.join(), 'los mismos de la previa');
});

test('Apuesta: tope del 50% del oro y una por ronda', () => {
    toBetting(400);
    const [a, b] = bettablePairs()[0];
    check(!placeBet(a, 201), 'más del tope (200g)');
    check(placeBet(a, 100), 'apuesta válida');
    checkEq(player.gold, 300, 'se descuenta al apostar');
    check(!placeBet(b, 1), 'una sola apuesta por ronda');
});

test('Pozo compartido: los que aciertan recuperan lo suyo y se reparten lo apostado al perdedor', () => {
    toBetting(400);
    const [a, b] = bettablePairs()[0];
    const other = heroes.find(h => h !== player && h !== a && h !== b);
    duelBets = []; other.gold = 1000;
    duelBets.push({ bettor: other, on: b, against: a, amount: 300 });
    checkEq(potPayout(a, 100, 100), 400, 'la ventana calcula lo que cobrarías');
    placeBet(a, 100);
    endBetting();
    dealDamage(a, b, 99999, 'pure');
    checkEq(player.gold, 300 + 100 + 300, 'recupera sus 100 y se lleva los 300 del otro lado');
    toBetting(400);
    const [c, d] = bettablePairs()[0];
    duelBets = [];
    placeBet(c, 100);
    endBetting();
    dealDamage(d, c, 99999, 'pure');
    checkEq(player.gold, 300, 'perdió lo apostado');
});

test('La IA apuesta (nunca a su propio duelo) y el ganador cobra el 25% de lo que le apostaron', () => {
    toBetting(400, true); // el jugador pelea: no hay ventana, pero la IA apuesta igual
    checkEq(gameState, 'DUEL', 'directo al duelo');
    const rival = arenas[0].heroes.find(h => h !== player);
    for (let i = 0; i < 30; i++) { const saved = duelBets; duelBets = []; aiPlaceBets(); check(duelBets.every(b => !(b.bettor === b.on || b.bettor === b.against)), 'nadie apuesta a su propio duelo'); duelBets = saved; }
    const other = heroes.find(h => h !== player && h !== rival);
    duelBets = [{ bettor: other, on: player, against: rival, amount: 200 }];
    const gold = player.gold, otherGold = other.gold;
    dealDamage(player, rival, 99999, 'pure');
    checkEq(player.gold - gold, Math.round(200 * BACKING_BONUS), 'respaldo: 25% de lo que te apostaron');
    checkEq(other.gold - otherGold, 200, 'el que te apostó recupera lo suyo (nadie apostó al otro lado)');
});

test('Sin oro para apostar (o eliminado) no hay previa: los duelos arrancan directo', () => {
    toBetting(1);
    checkEq(gameState, 'DUEL', 'con 1g el tope es 0');
});

test('Premios: la mitad de abajo de los que siguen en juego recibe un Fragmento; el último, además un Libro', () => {
    toDuels();
    heroes.forEach((h, i) => { h.points = 1000 - i * 10; });  // ranking = orden de heroes
    heroes[7].eliminated = true;                          // quedan 7: premio para los 3 últimos en juego
    skipDuels();
    const frags = heroes.map(h => h.destiny.fragments), books = heroes.map(h => h.destiny.books);
    checkEq(frags.join(), '0,0,0,0,1,1,1,0', 'Fragmentos');
    checkEq(books.join(), '0,0,0,0,0,0,1,0', 'Libro para el último en juego');
});

test('IA: usa el Libro en una habilidad que no es natural y vende el Fragmento si su kit es casi todo natural', () => {
    const h = new Hero(HERO_TEMPLATES.AXE);
    const natural = Object.values(HERO_SKILLS.AXE).filter(s => !s.isUltimate);
    const foreign = Object.values(HERO_SKILLS.SNIPER).find(s => !s.isUltimate);
    natural.forEach(s => h.addSkill(s));
    h.addSkill(foreign);
    h.destiny.books = 1; h.destiny.fragments = 1;
    const gold = h.gold;
    aiUseDestiny(h);
    check(!h.skills.includes(foreign), 'cambió la habilidad ajena');
    checkEq(h.skills.length, KIT_SIZE, 'kit completo');
    checkEq(h.destiny.books + h.destiny.fragments, 0, 'usó todo');
    checkEq(h.gold, gold + FRAGMENT_SELL_PRICE, 'vendió el Fragmento');
});

// ============================================================ JEFES DE RONDA Y NEUTRALES (fase G)
// Deja la partida en la pelea contra el jefe de la ronda 5 (cada héroe en su arena).
function toBoss() {
    resetGame();
    selectHero(HERO_TEMPLATES.AXE);
    learnSkill(currentDraft.options[0]);
    waveNumber = ROUND_BOSS_EVERY;
    startWave();
    clearAllWaves();
    skipDuels();
    return player.arena;
}

test('Jefe de ronda: en la ronda 5, después de los duelos, cada héroe pelea contra el mismo jefe en su arena', () => {
    const arena = toBoss();
    checkEq(gameState, 'BOSS', 'fase del jefe');
    checkEq(arenas.length, MAX_HEROES, 'una arena por héroe');
    check(arenas.every(a => a.heroes.length === 1 && a.boss.isRoundBoss), 'cada uno con su jefe');
    checkEq(new Set(arenas.map(a => a.boss.type)).size, 1, 'el mismo tipo de jefe para todos');
    checkEq(arena.boss.type, lastRoundBoss, 'el jefe sorteado');
    checkEq(enrageMult(arena), 1, 'todavía no se enfureció');
    arena.elapsed = BOSS_FIGHT.enrageAfter + 10;
    check(enrageMult(arena) > 1, 'pasado el tiempo se enfurece');
});

test('Jefe de ronda: como contra los creeps, morir cuesta una vida y se revive con Voluntad de Titán', () => {
    const arena = toBoss();
    const lives = player.lives;
    dealDamage(arena.boss, player, 99999, 'pure');
    checkEq(player.lives, lives - 1, 'perdió una vida');
    waitRespawn();
    check(player.isAlive() && getEffect(player, 'TITAN_WILL'), 'revivió con Voluntad de Titán');
    player.lives = 0; setCondemned(player, 0.1); removeEffect(player, 'TITAN_WILL');
    dealDamage(arena.boss, player, 99999, 'pure');
    check(player.eliminated, 'sin vidas y Condenado: eliminado por el jefe');
});

test('Jefe de ronda: al matarlo cobrás oro y elegís neutral; los 3 más rápidos cobran extra', () => {
    toBoss();
    const realEndRound = endRound;
    window.endRound = () => {}; // para mirar el oro antes de que la IA compre en la ronda siguiente
    const gold = heroes.map(h => h.gold);
    try {
        heroes.forEach((h, i) => { h.arena.elapsed = 10 + i; dealDamage(h, h.arena.boss, 1e9, 'pure'); }); // el jugador, el más rápido
        updateWave(0.016);
    } finally { window.endRound = realEndRound; }
    const base = BOSS_FIGHT.gold[0];
    const got = heroes.map((h, i) => h.gold - gold[i]);
    checkEq(got[0], base + Math.round(base * BOSS_FIGHT.fastBonus[0]) + 1, '1º más rápido: +50% (y 1g por el último golpe)');
    checkEq(got[1], base + Math.round(base * BOSS_FIGHT.fastBonus[1]) + 1, '2º: +30%');
    checkEq(got[5], base + 1, 'el 6º: el oro de todos');
    checkEq(player.neutralOffer.length, BOSS_FIGHT.neutralOptions, '3 neutrales para elegir');
    check(player.neutralOffer.every(k => NEUTRAL_ITEMS[k].tier === 1), 'del escalón 1');
    check(heroes.slice(1).every(h => h.neutral), 'la IA ya eligió');
});

test('Jefes: cada uno se pone más difícil a su manera', () => {
    toBoss();
    const make = key => { const c = makeRoundBoss(ROUND_BOSSES.find(b => b.key === key)); c.arena = player.arena; player.arena.creeps.push(c); return c; };
    const golem = make('GOLEM'), armor = golem.armor;
    golem.hp = golem.maxHp * 0.5; golem.type.update(golem, 0.01);
    checkEq(golem.armor, armor + 3, 'Gólem: fase 2 con más armadura');
    const hydra = make('HYDRA');
    hydra.hp = hydra.maxHp * 0.4; hydra.type.update(hydra, 0.01);
    checkEq(hydra.heads, 2, 'Hidra: 2 cabezas nuevas con 60% de vida perdida');
    check(effAttack(hydra) > hydra.atk, 'Hidra: pega más');
    const lich = make('LICH');
    lich.type.update(lich, 12); const d1 = getEffect(lich, 'LICH_BARRIER').until - gameClock;
    lich.type.update(lich, 12); const d2 = getEffect(lich, 'LICH_BARRIER').until - gameClock;
    checkNear(d2 - d1, 1, 'Liche: cada barrera dura 1s más');
    const queen = make('HIVE_QUEEN');
    const before = player.arena.creeps.length; queen.type.update(queen, 8); const first = player.arena.creeps.length - before;
    queen.type.update(queen, 8); const second = player.arena.creeps.length - before - first;
    checkEq(second, first + 1, 'Reina: cada invocación trae uno más');
});

test('Neutrales: uno solo, da sus stats; al cambiarlo el anterior se vende solo', () => {
    newGame('AXE');
    const armor = effArmor(player);
    player.neutralOffer = ['BRUTE_AMULET', 'WOLF_FANG', 'STALKER_DAGGER'];
    check(equipNeutral(player, 'BRUTE_AMULET'), 'equipado');
    check(effArmor(player) > armor, 'más armadura');
    const gold = player.gold;
    player.neutralOffer = ['OAK_SHIELD'];
    equipNeutral(player, 'OAK_SHIELD');
    checkEq(player.neutral, 'OAK_SHIELD', 'cambiado');
    checkEq(player.gold - gold, neutralSellPrice('BRUTE_AMULET'), 'el anterior se vendió');
    checkEq(player.effects.filter(e => e.id === 'NEUTRAL').length, 1, 'un solo efecto de neutral');
    checkEq(sellNeutral(player), 2 * NEUTRAL_SELL_PER_TIER, 'se vende por escalón × 60');
    checkEq(player.neutral, null, 'sin neutral');
});

test('Las oleadas ya no traen el tema "Jefe Final" (lo reemplaza el jefe de ronda)', () => {
    for (let r = 1; r <= 20; r++) check(rollWave(r).name !== 'Jefe Final', 'ronda ' + r);
});

// ============================================================ MENÚ Y ELECCIÓN DE HÉROE
test('Elección de héroe: 3 opciones propias + "al azar" (uno que no está entre ellas)', () => {
    resetGame();
    startHeroPick();
    checkEq(gameState, 'HERO_SELECT', 'fase de elección');
    checkEq(heroOffers[0].length, HERO_PICK_OPTIONS, '3 opciones');
    checkEq(document.querySelectorAll('#hero-options .skill-card').length, HERO_PICK_OPTIONS + 1, '3 cartas + al azar');
    for (let i = 0; i < 20; i++) check(!heroOffers[0].includes(randomHeroPick()), 'al azar: fuera de tus opciones');
    for (let i = 1; i < MAX_HEROES; i++) check(heroOffers[i].every(t => !heroOffers[0].includes(t)), 'tus opciones son solo tuyas');
});

test('Elección de héroe: los rivales eligen de sus opciones y ningún héroe se repite', () => {
    for (let n = 0; n < 10; n++) {
        resetGame();
        startHeroPick();
        const offers = heroOffers;
        document.querySelectorAll('#hero-options .skill-card')[0].click();
        checkEq(new Set(heroes.map(h => h.key)).size, MAX_HEROES, 'sin repetidos');
        heroes.slice(1).forEach((h, i) => {
            const own = offers[i + 1].filter(t => t !== offers[0][0]);
            // elige de las suyas salvo que ya se las hayan tomado todas
            check(own.some(t => t.key === h.key) || own.every(t => heroes.some(o => o !== h && o.key === t.key)), 'eligió de sus opciones');
        });
    }
});

test('Con héroes de sobra, cada jugador tiene opciones que no se repiten', () => {
    const fake = Array.from({ length: MAX_HEROES * HERO_PICK_OPTIONS }, (_, i) => ({ key: 'H' + i }));
    const all = dealHeroOffers(fake).flat();
    checkEq(new Set(all).size, all.length, 'las 24 opciones son distintas');
});

test('Tutorial: se abre, avanza y se cierra', () => {
    openTutorial();
    checkEq(document.getElementById('tutorial').style.display, 'flex', 'abierto');
    for (let i = 0; i < TUTORIAL_PAGES.length - 1; i++) tutorialStep(1);
    checkEq(tutorialPage, TUTORIAL_PAGES.length - 1, 'última página');
    tutorialStep(1);
    checkEq(document.getElementById('tutorial').style.display, 'none', 'cerrado');
});

test('Rondas 1 a 4 sin duelos: al terminar las oleadas se pasa directo a la ronda siguiente', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.AXE);
    learnSkill(currentDraft.options[0]);
    startWave();
    clearAllWaves(false);
    check(gameState !== 'BETTING' && gameState !== 'DUEL', 'sin previa ni duelos en la ronda 1');
    checkEq(waveNumber, 2, 'ronda 2');
});

test('Tienda en ventana: se abre sola en la preparación, se cierra y se vuelve a abrir con B', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.AXE);
    learnSkill(currentDraft.options[0]);
    checkEq(gameState, 'PREP', 'preparación');
    checkEq(document.getElementById('shop-container').style.display, 'block', 'abierta');
    closeShop();
    checkEq(document.getElementById('shop-container').style.display, 'none', 'cerrada');
    toggleShop();
    checkEq(document.getElementById('shop-container').style.display, 'block', 'reabierta');
    startWave();
    checkEq(document.getElementById('shop-container').style.display, 'none', 'se cierra al empezar la oleada');
});

test('Mapa agrandable: M cambia el tamaño del mapa y vuelve', () => {
    const w = canvas.style.width;
    toggleBigMap();
    check(canvas.style.width !== w, 'más grande');
    toggleBigMap();
    checkEq(canvas.style.width, w, 'vuelve al tamaño normal');
});

test('Habilidades automáticas: con H prendido el jugador lanza sus habilidades solo; apagado, no', () => {
    const saved = autoCast;
    try {
        for (const on of [true, false]) {
            autoCast = on;
            newGame('AXE');
            const skill = learn(Object.values(HERO_SKILLS.AXE).find(s => s.kind === 'active' && !s.isUltimate).id, 1);
            player.mana = player.maxMana;
            const c = creeps[0]; c.x = player.x + 1; c.y = player.y; c.hp = c.maxHp = 1e6;
            creeps.slice(1).forEach(o => { o.hp = 0; });
            for (let i = 0; i < 30; i++) { gameClock += 0.05; updateHero(player, player.arena, 0.05); }
            checkEq((player.cooldowns[skill.id] || 0) > 0, on, on ? 'la lanzó sola' : 'no la lanzó');
        }
    } finally { autoCast = saved; }
});

test('Apuntar con el mouse: la habilidad va al enemigo más cercano al cursor (dentro de su alcance)', () => {
    newGame('SNIPER');
    const skill = learn('SNIPER_POTENTE', 1);
    check(isAimedSkill(skill), 'se apunta');
    check(!isAimedSkill(SKILL_INDEX.AXE_GIRO), 'el Giro (área alrededor) no se apunta');
    const near = dummy(), far = dummy();
    creeps.forEach(c => { if (c !== near && c !== far) c.hp = 0; });
    [near, far].forEach(c => { c.hp = c.maxHp = 5000; });
    near.x = player.x + 1; near.y = player.y;
    far.x = player.x + 3; far.y = player.y + 2;
    player.mana = player.maxMana;
    check(castAt(player, skill, far.x, far.y), 'se lanzó');
    check(far.hp < 5000 && near.hp === 5000, 'le pegó al del cursor, no al más cercano');
});

test('Clic derecho: el héroe camina hasta el destino; el teclado lo cancela', () => {
    newGame('AXE');
    creeps.forEach(c => { c.hp = 0; });
    creeps[0].hp = 1; creeps[0].x = 19; creeps[0].y = 0; // que la oleada no termine
    player.x = 2; player.y = 2;
    player.moveTarget = { x: 6, y: 2, arena: player.arena };
    for (let i = 0; i < 200 && player.moveTarget; i++) { gameClock += 0.05; updateHero(player, player.arena, 0.05); }
    checkEq(player.x + ',' + player.y, '6,2', 'llegó');
    checkEq(player.moveTarget, null, 'sin destino');
});

test('Pausa: congela la partida y Esc la abre y la cierra', () => {
    newGame('AXE');
    setPaused(true);
    check(paused, 'en pausa');
    checkEq(document.getElementById('pause-menu').style.display, 'block', 'menú de pausa visible');
    openGlossary('items');
    check(isGlossaryOpen(), 'glosario abierto desde la pausa');
    handleEscape();
    check(!isGlossaryOpen() && paused, 'Esc cierra el glosario y vuelve a la pausa');
    handleEscape();
    check(!paused, 'Esc reanuda');
    resetGame();
    setPaused(true);
    check(!paused, 'en el menú no se pausa');
});

test('Presión al líder: los creeps se adaptan al poder del héroe (entre −15% y +25%)', () => {
    newGame('AXE');
    heroes.forEach(h => { h.level = 5; h.inventory = []; });
    checkNear(pressureMult(player), 1, 'igual al promedio: sin cambio');
    player.level = 20;
    checkNear(pressureMult(player), PRESSURE.max, 'mucho más fuerte: el tope');
    player.level = 1;
    checkNear(pressureMult(player), PRESSURE.min, 'mucho más débil: el piso');
    player.level = 5; giveItem(player, 'HEART');
    check(pressureMult(player) > 1, 'los ítems cuentan');
    const arena = makeArena('wave', [player]);
    spawnWave(arena, TEST_WAVE);
    checkNear(arena.creeps[0].statMult, creepStatMult(waveNumber) * arena.pressure, 'se aplica a los creeps de su arena');
});

test('Íconos: cada ítem y cada neutral tiene el suyo, con formas de 12×12', () => {
    Object.entries(ITEM_ICON_SHAPES).forEach(([name, rows]) => {
        checkEq(rows.length, 12, name + ': 12 filas');
        rows.forEach((r, i) => checkEq(r.length, 12, `${name} fila ${i}`));
    });
    [...Object.keys(ITEMS), ...Object.keys(NEUTRAL_ITEMS)].forEach(k => {
        check(ITEM_ICONS[k] && ITEM_ICON_SHAPES[ITEM_ICONS[k][0]], 'ícono para ' + k);
        check(itemIconUrl(k), 'se dibuja ' + k);
    });
});

test('Guía de ítems: cada héroe tiene la suya y la tienda la muestra primero', () => {
    newGame('AXE');
    startPreparation();
    shopTab = 'guide'; renderShop();
    const cards = [...document.querySelectorAll('#shop-options .skill-card h4')].map(h => h.textContent);
    const g = guideOf(player);
    GUIDE_STAGES.forEach(([stage]) => g[stage].forEach(k => check(cards.some(t => t.includes(ITEMS[k].name)), 'muestra ' + ITEMS[k].name)));
    check(isSuggested(player, 'THORNS') && !isSuggested(player, 'ARCANE_STAFF'), 'marca solo los sugeridos');
});

test('Estadísticas debajo del ranking', () => {
    newGame('SNIPER');
    updateHud();
    checkEq(document.getElementById('hero-stats-panel').style.display, 'block', 'visible');
    check(document.getElementById('hero-stats').textContent.includes('Agilidad ★'), 'marca el atributo principal');
});

test('Códice de héroes: una carta por héroe, separadas por atributo, con innato y definitiva marcados', () => {
    renderHeroCodex();
    checkEq(document.querySelectorAll('#hero-codex .hero-card').length, Object.keys(HERO_TEMPLATES).length, 'todos los héroes');
    checkEq(document.querySelectorAll('#hero-codex .badge-innate').length, Object.keys(HERO_TEMPLATES).length, 'un innato por héroe');
    checkEq(document.querySelectorAll('#hero-codex .ult-name').length, Object.keys(HERO_TEMPLATES).length, 'una definitiva subrayada por héroe');
});

test('Sala de espera: el jugador camina con el teclado y no pisa la fuente', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.AXE);
    check(player.inRest, 'en la sala de espera');
    player.x = REST_SPOT.x; player.y = REST_SPOT.y - 2; // justo debajo de la fuente
    keys['w'] = true;
    try { for (let i = 0; i < 10; i++) updateRestArea(1); } finally { keys['w'] = false; }
    check(!restBlocked(player.x, player.y), 'no está sobre la fuente');
    checkEq(player.y, REST_SPOT.y - 2, 'la fuente lo frena');
    keys['a'] = true;
    try { updateRestArea(1); } finally { keys['a'] = false; }
    checkEq(player.x, REST_SPOT.x - 1, 'caminó a la izquierda');
});

test('Elección de héroe agrupada por atributo', () => {
    resetGame();
    startHeroPick();
    const heads = [...document.querySelectorAll('#hero-options .attr-head')].map(h => h.textContent);
    const attrs = [...new Set(heroOffers[0].map(t => ATTR_INFO[t.primaryAttr].label))];
    checkEq(heads.length, attrs.length, 'un título por atributo presente');
    checkEq(document.querySelectorAll('#hero-options .skill-card').length, HERO_PICK_OPTIONS + 1, '3 héroes + al azar');
});

test('Sprites: plantillas de 12×12 y un sprite para cada héroe, creep y jefe', () => {
    Object.entries(SPRITE_TEMPLATES).forEach(([name, rows]) => {
        checkEq(rows.length, 12, name + ': 12 filas');
        rows.forEach((r, i) => checkEq(r.length, 12, `${name} fila ${i}: 12 columnas`));
    });
    Object.keys(HERO_TEMPLATES).forEach(k => check(spriteFor({ isHero: true, key: k }), 'héroe ' + k));
    Object.values(CREEP_TYPES).forEach(t => check(spriteFor({ type: t }), 'creep ' + t.key));
    ROUND_BOSSES.forEach(b => check(spriteFor({ isRoundBoss: true, type: b, color: b.color }), 'jefe ' + b.key));
});

test('Objetivo marcado con clic: el ataque lo prioriza aunque haya otro más cerca, y se camina hasta tenerlo a tiro', () => {
    newGame('SNIPER');
    const near = dummy(), far = dummy();
    creeps.forEach(c => { if (c !== near && c !== far) c.hp = 0; });
    near.x = player.x + 1; near.y = player.y;
    far.x = player.x + 3; far.y = player.y + 1;
    checkEq(pickAttackTarget(player, effRange(player)), near, 'sin marca: el más cercano');
    player.focus = far;
    checkEq(pickAttackTarget(player, effRange(player)), far, 'con marca: el marcado');
    checkEq(nearestEnemy(player, 20), far, 'las habilidades también lo priorizan');
    far.x = player.x + 15; far.y = player.y; player.focusChase = true;
    check(focusChaseDirection(player).dx === 1, 'lejos: camina hacia él');
    far.hp = 0;
    checkEq(validFocus(player), null, 'si muere se desmarca');
});

test('Ataque al moverse: libre por defecto; con la regla "reset", moverse reinicia el ataque', () => {
    const saved = MOVE_ATTACK_RULE;
    try {
        for (const rule of ['free', 'reset']) {
            MOVE_ATTACK_RULE = rule;
            newGame('SNIPER');
            dummy({ x: player.x + 3 });
            player.attackTimer = 0.5; player.moveTimer = 99;
            keys = { a: true };
            updateWave(0.001);
            keys = {};
            check(rule === 'reset' ? player.attackTimer < 0.01 : player.attackTimer >= 0.5, rule + ': ' + player.attackTimer);
        }
    } finally { MOVE_ATTACK_RULE = saved; }
    checkEq(saved, 'free', 'por defecto se ataca caminando');
});

test('En duelo, la curación y el control entre héroes bajan (el robo de vida no)', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    b.hp = 1;
    checkEq(healUnit(b, 100), Math.round(100 * (1 - DUEL_HEAL_REDUCTION)), 'curación reducida');
    b.hp = 1;
    checkEq(healUnit(b, 100, { fromDamage: true }), 100, 'robo de vida sin reducir');
    addEffect(b, { id: 'STUN', name: 'Aturdido', duration: 2, flags: ['stun'] });
    checkNear(getEffect(b, 'STUN').until - gameClock, 2 * (1 - DUEL_CONTROL_REDUCTION) * (1 - Math.min(0.8, sumMod(b, 'statusResist'))), 'aturdimiento más corto');
});

test('En duelo los héroes se hacen menos daño entre sí; contra creeps no cambia', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    const hp = b.hp;
    dealDamage(a, b, 100, 'pure');
    checkEq(hp - b.hp, Math.round(100 * (1 - DUEL_DAMAGE_REDUCTION)), 'daño reducido en duelo');
    checkNear(creepStatMult(3, false), CREEP_GROWTH * CREEP_GROWTH, 'los creeps crecen x' + CREEP_GROWTH + ' por ronda');
});

// ============================================================ PARTIDAS COMPLETAS
// Juega varias rondas con la IA (draft, puntos, tienda y combate de los 8 héroes). Con godMode el jugador es
// invulnerable, para probar que el flujo completo funciona; sin godMode sirve para medir la dificultad.
function simulateGame(heroIndex, godMode = true, rounds = 4) {
    const savedMax = MAX_ROUNDS;
    MAX_ROUNDS = rounds;
    resetGame();
    selectHero(Object.values(HERO_TEMPLATES)[heroIndex]);
    autopilot = true;
    try {
        let guard = 0;
        while (gameState !== 'ENDED' && guard++ < rounds * 4 + 10) {
            if (gameState === 'DRAFT') learnSkill(aiPickDraft(player, currentDraft.options));
            if (gameState === 'PREP') {
                if (!player.eliminated) { aiUseDestiny(player); if (player.neutralOffer) aiPickNeutral(player, player.neutralOffer); aiSpendPoints(player); aiShop(player); }
                startWave();
            }
            if (gameState === 'WAVE') {
                if (godMode) addEffect(player, { id: 'TEST_GOD', duration: 1e9, flags: ['invulnerable', 'persistent'] });
                for (let f = 0; (inCombat() || gameState === 'BETTING') && f < 20000; f++) {
                    if (gameState === 'BETTING') endBetting();
                    gameClock += 0.05; updateWave(0.05);
                }
                if (inCombat()) throw new Error('una ronda no terminó');
            }
        }
    } finally { autopilot = false; MAX_ROUNDS = savedMax; }
    return { state: gameState, eliminated: player.eliminated, skills: player.skills.length, level: player.level, rank: heroRank(player), round: waveNumber };
}

Object.keys(HERO_TEMPLATES).forEach((key, i) => {
    test(`Partida completa (4 rondas) con ${HERO_TEMPLATES[key].name}`, () => {
        const r = simulateGame(i);
        checkEq(r.state, 'ENDED', 'la partida terminó');
        check(!r.eliminated, 'el jugador sigue en juego');
        checkEq(r.skills, KIT_SIZE, 'kit completo');
        check(r.level > 1, 'subió de nivel');
    }, { random: true });
});

test('Nueva Partida deja todo como al empezar', () => {
    newGame('AXE');
    resetGame();
    checkEq(player, null, 'jugador');
    checkEq(gameState, 'MENU', 'estado');
    checkEq(document.getElementById('menu-panel').style.display, 'block', 'menú visible');
});

// ============================================================ EJECUCIÓN
function runTests() {
    autoCast = false; // las pruebas controlan a mano cuándo se lanza cada habilidad (la de habilidades automáticas lo prende)
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
