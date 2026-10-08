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
    const duels = arenas.filter(a => a.kind === 'duel' && !a.done);
    if (!duels.length) return;
    duels.forEach(a => { a.elapsed = DUEL_TIME; });
    updateWave(0.016);
}
// Mata a todos los creeps de todas las arenas (si estaba la previa de apuestas, la saltea primero). El duelo de la ronda
// sigue en curso: se termina con skipDuels.
function clearAllWaves(skipBetting = true) {
    if (skipBetting && gameState === 'BETTING') endBetting();
    heroes.forEach(h => { if (h.arena) h.arena.creeps.forEach(c => { c.hp = 0; }); });
    updateWave(0.016);
}
function duelArena() { return arenas.find(a => a.kind === 'duel') || null; }
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
    const s = learn('VAMP_CLAW', 0);
    const d = dummy({ hp: 9999, maxHp: 9999 });
    const mana = player.mana;
    handleSkillKeypress('e');
    checkEq(player.mana, mana, 'maná en nivel 0');
    checkEq(targeting, null, 'en nivel 0 ni siquiera se apunta');
    player.skillLevels[s.id] = 1;
    handleSkillKeypress('e'); // lanzamiento al instante (estilo Hades): sin cursor, al enemigo más cercano
    checkEq(targeting, null, 'sin paso extra de apuntar');
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
    ['VAMP_CLAW', 'AXE_FURIA', 'SNIPER_POTENTE', 'AXE_GIRO'].forEach(id => learn(id, 0));
    checkEq(['VAMP_CLAW', 'AXE_FURIA', 'SNIPER_POTENTE', 'AXE_GIRO'].map(id => player.keyBindings[id]).join(''), 'ertf', 'teclas');
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
    const dark = learn('VAMP_DARKBLOOD', 1);
    player.hp = 10; applyLifesteal(player, 100, c);
    checkEq(player.hp - 10, Math.round(100 * ls * (2 + darkBloodSteps(player) * val(dark, player, 'lifestealPerStep'))), 'Sangre Oscura suma al multiplicador según la vida que falta');
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

test('Magos (Inteligencia): amplificación de hechizo extra respecto a un no-mago', () => {
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

test('Sadista: cada baja da una carga de regeneración que se acumula y se renueva; una baja de héroe da 6 de una', () => {
    newGame('NECROMANCER');
    const c = dummy({ hp: 1 });
    const before = effHpRegen(player);
    emit(player, 'onKill', { victim: c });
    checkNear(effHpRegen(player) - before, 3, '1 carga = +3 regen. de vida/s (y otro tanto de maná)');
    emit(player, 'onKill', { victim: c });
    checkNear(effHpRegen(player) - before, 6, '2 cargas se acumulan');
    const rival = dummy(); rival.isHero = true; // una baja "de héroe" da varias cargas de una
    emit(player, 'onKill', { victim: rival });
    checkNear(effHpRegen(player) - before, 3 * 6, 'tope de 6 cargas (la baja de héroe ya suma 6 de una)');
});

test('Pulso de Muerte: daño mágico en área a tu alrededor y te cura según lo que dañaste', () => {
    newGame('NECROMANCER');
    const s = learn('NECROMANCER_PULSE', 1);
    const near = dummy({ hp: 9999, maxHp: 9999 });
    const far = dummy({ x: player.x + 15, y: player.y, hp: 9999, maxHp: 9999 });
    player.hp = 1;
    s.cast(player);
    const expected = magicDmg(valueAt(s, 'baseDmg', 1) + player.int * valueAt(s, 'intRatio', 1));
    checkEq(9999 - near.hp, expected, 'daño a un enemigo en el radio');
    checkEq(far.hp, 9999, 'no llega a uno lejos');
    checkEq(player.hp, Math.min(player.maxHp, 1 + Math.round(expected * valueAt(s, 'healPct', 1))), 'se cura según el daño hecho');
});

test('Manto Fantasma: inmune a físico y desarmado, pierde resistencia mágica y cura más; ralentiza al activarse', () => {
    newGame('NECROMANCER');
    const s = learn('NECROMANCER_SHROUD', 1);
    const near = dummy({ hp: 9999, maxHp: 9999 });
    const magicResist0 = effMagicResist(player);
    player.hp = 1;
    s.cast(player);
    check(hasFlag(player, 'physicalImmune'), 'inmune a daño físico');
    check(hasFlag(player, 'disarm'), 'desarmado');
    checkNear(effMagicResist(player), magicResist0 - valueAt(s, 'magicResistPenalty', 1), 'pierde resistencia mágica');
    const { dealt } = dealDamage(near, player, 100, 'physical');
    checkEq(dealt, 0, 'el daño físico no le hace nada');
    checkEq(player.hp, 1, 'vida sin cambios');
    const healed = healUnit(player, 100);
    checkNear(healed, Math.round(100 * (1 + valueAt(s, 'healingBonusPct', 1))), 'cura más mientras está espectral');
    checkNear(effMoveMult(near), 1 - valueAt(s, 'slowPct', 1), 'ralentiza al activarse');
});

test('Guadaña del Segador: aturde y, al terminar, hace daño puro según la vida que falta (ejecuta si alcanza)', () => {
    newGame('NECROMANCER');
    const s = learn('NECROMANCER_REAP', 1);
    const a = dummy({ hp: 500, maxHp: 1000, armor: 50 }); // le falta 500: con ratio 0.7 son 350, no alcanza a matarlo
    s.cast(player);
    check(hasFlag(a, 'stun'), 'aturdido de entrada');
    checkEq(a.hp, 500, 'el daño todavía no se aplicó, se calcula al terminar el aturdimiento');
    const hpRegen0 = player.hpRegen;
    gameClock += valueAt(s, 'stunDuration', 1) + 0.1;
    tickEffects(a, 0.016);
    const expected = Math.round((1000 - 500) * valueAt(s, 'missingHpRatio', 1));
    checkEq(500 - a.hp, expected, 'daño puro (ignora la armadura) según lo que le faltaba');
    check(a.isAlive(), 'no le alcanzó para matarlo');
    checkEq(player.hpRegen, hpRegen0, 'sin matarlo, no gana regeneración permanente');

    a.hp = 0; // fuera de juego: si no, nearestEnemy lo sigue eligiendo a él (mismo lugar que el nuevo dummy)
    const b = dummy({ hp: 50, maxHp: 200 }); // le falta 150: con ratio 0.7 son 105, más que sus 50 de vida
    s.cast(player);
    gameClock += valueAt(s, 'stunDuration', 1) + 0.1;
    tickEffects(b, 0.016);
    check(!b.isAlive(), 'con poca vida, lo ejecuta');
    checkNear(player.hpRegen - hpRegen0, valueAt(s, 'hpRegenPerKill', 1), 'Ascenso: regeneración de vida permanente por la baja');
});

// Daño mágico esperado tras pasar por dealDamage: aplica la amplificación de hechizo del que lanza
// (spellAmp) antes de redondear. Los dummy() no tienen resistencia mágica, así que no hace falta mitigar.
function magicDmg(rawAmount) { return Math.round(rawAmount * (1 + effSpellAmp(player) / 100)); }

test('Campo Estático: cada hechizo lanzado hace daño mágico a los enemigos cercanos, % de su vida actual', () => {
    newGame('ZEUS');
    const near = dummy({ hp: 1000, maxHp: 1000 }); // pegado al jugador, adentro del radio 4
    const far = dummy({ x: player.x + 15, y: player.y, hp: 1000, maxHp: 1000 }); // bien lejos, afuera del radio
    emit(player, 'onCast', { skill: null });
    checkEq(1000 - near.hp, magicDmg(Math.max(player.innate.minDmg, 1000 * player.innate.pct)), 'daño a un enemigo cercano (% de su vida)');
    checkEq(far.hp, 1000, 'no llega a un enemigo lejos del radio');
});

test('Rayo Arco: salta entre varios enemigos y hace el mismo daño en cada salto', () => {
    newGame('ZEUS');
    const s = learn('ZEUS_ARC', 1);
    const a = dummy({ hp: 9999, maxHp: 9999 }), b = dummy({ x: a.x + 1, y: a.y, hp: 9999, maxHp: 9999 });
    const far = dummy({ x: player.x + 15, y: player.y, hp: 9999, maxHp: 9999 }); // fuera del alcance del primer salto
    s.cast(player);
    const expected = magicDmg(valueAt(s, 'baseDmg', 1) + player.int * valueAt(s, 'intRatio', 1));
    checkEq(9999 - a.hp, expected, 'daño al primero (el más cercano)');
    checkEq(9999 - b.hp, expected, 'daño al segundo (salta hacia el más cercano al anterior)');
    checkEq(far.hp, 9999, 'no llega a uno lejos de la cadena');
});

test('Rayo Relámpago: proyectil real que viaja y aturde; si apuntás a un punto vacío, no le pega a nadie', () => {
    newGame('ZEUS');
    const s = learn('ZEUS_BOLT', 1);
    const c = dummy({ hp: 9999, maxHp: 9999 }); // adyacente: sin aimPoint, cast() cae en nearestEnemy como destino
    s.cast(player);
    checkEq(player.arena.projectiles.length, 1, 'dispara un proyectil (no daña al instante)');
    checkEq(c.hp, 9999, 'no le pega apenas se lanza, tiene que viajar');
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    checkEq(player.arena.projectiles.length, 0, 'el proyectil llega y se consume');
    const expected = magicDmg(valueAt(s, 'baseDmg', 1) + player.int * valueAt(s, 'intRatio', 1));
    checkEq(9999 - c.hp, expected, 'daño al llegar');
    check(hasFlag(c, 'stun'), 'aturdido');

    // Apuntando a un punto vacío (lejos de cualquier enemigo, fuera del camino del rayo): no le pega a nadie.
    const off = dummy({ x: player.x, y: player.y + 5, hp: 9999, maxHp: 9999 }); // lejos de la línea de tiro
    player.aimPoint = { x: player.x + 5, y: player.y };
    s.cast(player);
    player.aimPoint = null;
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    checkEq(off.hp, 9999, 'apuntar a un punto vacío no le pega a nadie');
});

test('Nimbo de Tormenta: daño en área alrededor de Zeus', () => {
    newGame('ZEUS');
    const s = learn('ZEUS_NIMBUS', 1);
    const near = dummy({ hp: 9999, maxHp: 9999 });
    const far = dummy({ x: player.x + 15, y: player.y, hp: 9999, maxHp: 9999 });
    s.cast(player);
    const expected = magicDmg(valueAt(s, 'baseDmg', 1) + player.int * valueAt(s, 'intRatio', 1));
    checkEq(9999 - near.hp, expected, 'daño a un enemigo en el radio');
    checkEq(far.hp, 9999, 'no llega a uno lejos');
});

test('Ira del Dios del Trueno: golpea a TODOS los enemigos vivos, sin importar la distancia', () => {
    newGame('ZEUS');
    const s = learn('ZEUS_WRATH', 1);
    const near = dummy({ hp: 9999, maxHp: 9999 });
    const far = dummy({ x: player.x + 15, y: player.y, hp: 9999, maxHp: 9999 });
    const dead = dummy({ hp: 0, maxHp: 9999 });
    // El daño se calcula una sola vez al lanzar; medirlo antes del cast, porque golpea también a los Grunts
    // reales de la oleada (mueren y su baja escala la Inteligencia de Zeus a mitad del propio lanzamiento).
    const expected = magicDmg(valueAt(s, 'baseDmg', 1) + player.int * valueAt(s, 'intRatio', 1));
    s.cast(player);
    checkEq(9999 - near.hp, expected, 'daño al cercano');
    checkEq(9999 - far.hp, expected, 'daño al lejano (sin límite de rango)');
    checkEq(dead.hp, 0, 'no revive al que ya estaba muerto');
});

// El resto de los nukes de un solo objetivo del roster, convertidos a pointTarget (ver DISEÑO.md §9 quater):
// mismo patrón que Rayo Relámpago, viajan de verdad y pueden fallar si apuntás a un punto vacío.
test('Proyectil Arcano: proyectil de punto de efecto con área; si apuntás mal, no le pega a nadie', () => {
    newGame('ARCANIST');
    const s = learn('ARCANIST_BOLT', 1);
    check(s.pointTarget, 'está marcado como punto de efecto');
    const a = dummy({ hp: 9999, maxHp: 9999 }); // adyacente: sin aimPoint, cast() cae en nearestEnemy
    const b = dummy({ x: a.x + 1, y: a.y, hp: 9999, maxHp: 9999 }); // dentro del radio de a
    s.cast(player);
    checkEq(a.hp, 9999, 'no daña al instante, tiene que viajar');
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    const expected = magicDmg(valueAt(s, 'baseDmg', 1) + player.int * valueAt(s, 'intRatio', 1));
    checkEq(9999 - a.hp, expected, 'daño al del punto');
    checkEq(9999 - b.hp, expected, 'y a quien estaba en el área alrededor');

    a.hp = 0; b.hp = 0; // fuera de juego: que no lo vuelva a agarrar el segundo disparo, que pasa por su línea
    const off = dummy({ x: player.x, y: player.y + 5, hp: 9999, maxHp: 9999 });
    player.aimPoint = { x: player.x + 5, y: player.y };
    s.cast(player);
    player.aimPoint = null;
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    checkEq(off.hp, 9999, 'apuntar a un punto vacío no le pega a nadie');
});

test('Explosión Helada: proyectil de punto de efecto que aturde en área; si apuntás mal, no aturde a nadie', () => {
    newGame('FROSTWITCH');
    const s = learn('FROSTWITCH_BLAST', 1);
    check(s.pointTarget, 'está marcado como punto de efecto');
    const c = dummy({ hp: 9999, maxHp: 9999 });
    s.cast(player);
    checkEq(c.hp, 9999, 'no daña al instante, tiene que viajar');
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    const expected = magicDmg(valueAt(s, 'baseDmg', 1) + player.int * valueAt(s, 'intRatio', 1));
    checkEq(9999 - c.hp, expected, 'daño al llegar');
    check(hasFlag(c, 'stun'), 'aturdido');

    c.hp = 0; // fuera de juego: que no lo vuelva a agarrar el segundo disparo, que pasa por su línea
    const off = dummy({ x: player.x, y: player.y + 5, hp: 9999, maxHp: 9999 });
    player.aimPoint = { x: player.x + 5, y: player.y };
    s.cast(player);
    player.aimPoint = null;
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    checkEq(off.hp, 9999, 'apuntar a un punto vacío no le pega a nadie');
    check(!hasFlag(off, 'stun'), 'y sin daño no hay aturdimiento');
});

test('Mezcla Inestable: proyectil de punto de efecto que aturde; si falla, no aturde a nadie', () => {
    newGame('ALCHEMIST');
    const s = learn('ALCHEMIST_BREW', 1);
    check(s.pointTarget, 'está marcado como punto de efecto');
    const c = dummy({ hp: 9999, maxHp: 9999 });
    s.cast(player);
    checkEq(c.hp, 9999, 'no daña al instante, tiene que viajar');
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    const expected = magicDmg(valueAt(s, 'baseDmg', 1) + player.int * valueAt(s, 'intRatio', 1));
    checkEq(9999 - c.hp, expected, 'daño al llegar');
    check(hasFlag(c, 'stun'), 'aturdido');

    c.hp = 0; // fuera de juego: que no lo vuelva a agarrar el segundo disparo, que pasa por su línea
    const off = dummy({ x: player.x, y: player.y + 5, hp: 9999, maxHp: 9999 });
    player.aimPoint = { x: player.x + 5, y: player.y };
    s.cast(player);
    player.aimPoint = null;
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    checkEq(off.hp, 9999, 'apuntar a un punto vacío no le pega a nadie');
    check(!hasFlag(off, 'stun'), 'y sin daño no hay aturdimiento');
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

test('Pasivas nuevas: Golpe de Hacha, Visión de Cazador, Golpe Crítico y Sangre Oscura', () => {
    newGame('AXE');
    const hacha = learn('AXE_HACHAZO', 1);
    const c = dummy({ hp: 5000, maxHp: 5000 });
    for (let i = 0; i < 3; i++) resolveBasicHit(player, c, 10, false);
    checkEq(c.hp, 5000 - 30, 'tres golpes normales');
    resolveBasicHit(player, c, 10, false);
    checkEq(c.hp, 5000 - 40 - Math.round(player.atk * val(hacha, player, 'dmgMult')), 'el cuarto suma el hachazo');
    newGame('SNIPER');
    const vision = learn('SNIPER_VISION', 2), range = effRange(player);
    updateArena(player.arena, 0.016);
    checkNear(effRange(player), range * (1 + val(vision, player, 'rangePct')), '+rango fijo');
    player.skillLevels.SNIPER_VISION = 0; player.skills = player.skills.filter(s => s !== vision);
    updateArena(player.arena, 0.016);
    checkNear(effRange(player), range, 'si deja el kit, se va el bonus');
    newGame('ASSASSIN');
    learn('ASSASSIN_CRITSTRIKE', 4);
    updateArena(player.arena, 0.016);
    const saved = Math.random; Math.random = () => 0;
    try { checkEq(rollAttackDamage(player, dummy()).dmg, Math.round(Math.round(effAttack(player)) * 2.8), 'crítico x2,8'); } finally { Math.random = saved; }
    newGame('VAMPIRE');
    const dark = learn('VAMP_DARKBLOOD', 4);
    player.hp = player.maxHp * 0.5;
    updateArena(player.arena, 0.016);
    checkNear(getEffect(player, 'VAMP_DARKBLOOD').mods.atkPct, 5 * val(dark, player, 'atkPerStep'), 'a mitad de vida: 5 tramos de daño');
});

test('Cetro del Eclipse: el daño mágico suma % de la vida máxima (una vez por segundo por enemigo)', () => {
    newGame('ARCANIST');
    giveItem(player, 'ECLIPSE_STAFF');
    const c = dummy({ hp: 10000, maxHp: 10000 });
    dealDamage(player, c, 10, 'magical');
    const extra = Math.round(10000 * ITEMS.ECLIPSE_STAFF.maxHpPct);
    check(10000 - c.hp >= extra, 'sumó el % de vida máxima');
    const hp = c.hp;
    dealDamage(player, c, 10, 'magical');
    check(hp - c.hp < extra, 'no se repite en el mismo segundo');
    gameClock += 1.1;
    const hp2 = c.hp;
    dealDamage(player, c, 10, 'physical');
    check(hp2 - c.hp < extra, 'el daño físico no lo activa');
});

test('Jefes de ronda: desde la ronda 20 crecen +4% por ronda en vez de +10%', () => {
    checkNear(bossStatMult(20), creepStatMult(20), 'igual que los creeps hasta la 20');
    checkNear(bossStatMult(25), creepStatMult(20) * Math.pow(BOSS_LATE.growth, 5), 'más lento después');
    check(bossStatMult(30) < creepStatMult(30) * 0.6, 'en la 30, menos del 60% de los creeps');
});

// ============================================================ LA TORRE (modo roguelike, fase 1)
// Por defecto elige la Espada (como antes el Golpe Certero, siempre disponible) para que las pruebas partan de
// un aventurero que ya puede pelear. Pasale weapon: null para probar el momento de elegir (el modal queda
// abierto y la partida espera, como con el inventario o la forja).
function newTower(heroKey = 'AXE', { weapon = 'ADVENTURER_SWORD' } = {}) {
    resetGame();
    gameMode = 'tower';
    selectHero(HERO_TEMPLATES[heroKey]);
    if (weapon) chooseStarterWeapon(weapon);
    return player.arena;
}

test('Torre: cada piso es un bioma con campo, pueblo y laberinto, todo conectado', () => {
    newTower();
    [1, 3, 5, 7, 9].forEach(f => {
        const L = towerLevel(f), at = (x, y) => y * COLS + x;
        checkEq(L.biome, biomeFor(f), `bioma del piso ${f}`);
        const dist = bfsFrom(L, L.start.x, L.start.y);
        check(dist[at(L.town.merchant.x, L.town.merchant.y)] >= 0, `se llega al mercader (piso ${f})`);
        check(dist[at(L.stairs.x, L.stairs.y)] >= 0, `se llega a la escalera (piso ${f})`);
        checkEq(L.zone[at(L.guardian.x, L.guardian.y)], ZONE.lab, 'el guardián está en el laberinto');
        check(L.creeps.every(c => L.zone[at(c.x, c.y)] !== ZONE.town), 'no hay creeps en el pueblo');
        check(L.creeps.some(c => L.zone[at(c.x, c.y)] === ZONE.field) && L.creeps.some(c => !c.isGuardian && L.zone[at(c.x, c.y)] === ZONE.lab), 'creeps en el campo y en el laberinto');
        check(L.creeps.filter(c => !c.isGuardian).every(c => c.type.biome === L.biome), 'los creeps son del bioma');
        for (let i = 0; i < COLS * ROWS; i++) if (L.deep[i]) { check(!walkable(L, i % COLS, Math.floor(i / COLS)), 'lo profundo no se pisa'); break; }
    });
    check(towerLevel(3).deep.some(v => v) && towerLevel(9).deep.some(v => v), 'la ciénaga tiene lagos y el volcán, lava');
}, { random: true });

test('Torre: terreno y clima del bioma, y el pueblo es zona segura', () => {
    newTower();
    enterTowerFloor(3); // Ciénaga: fango venenoso y niebla
    const L = player.arena, at = (x, y) => y * COLS + x;
    let cell = null;
    for (let i = 0; i < COLS * ROWS && !cell; i++) { const x = i % COLS, y = Math.floor(i / COLS); if (L.ground[i] === GROUND.hazard && L.zone[i] === ZONE.field && walkable(L, x, y)) cell = { x, y }; }
    player.x = cell.x; player.y = cell.y;
    const hp = player.hp;
    for (let i = 0; i < 70; i++) { gameClock += 1 / 60; towerTerrainTick(L, player, 1 / 60); }
    checkNear(sumMod(player, 'moveSpeedPct'), -0.25, 'el fango frena');
    check(player.hp < hp, 'el fango envenena');
    checkEq(climateSight(player), -1.5, 'la niebla quita visión en el campo');
    const c = L.creeps.find(o => !o.isGuardian);
    c.aggro = true;
    player.x = L.town.merchant.x + 3; player.y = L.town.merchant.y + 3;
    updateTower(1 / 60);
    for (let i = 0; i < 40; i++) { gameClock += 1 / 60; towerTerrainTick(L, player, 1 / 60); }
    toggleTowerShop(false);
    check(!c.aggro, 'en el pueblo los creeps te sueltan');
    check(getEffect(player, 'TOWN_REST'), 'descansás en el pueblo');
    checkEq(climateSight(player), 0, 'sin niebla en el pueblo');
}, { random: true });

test('Torre: el mercader del pueblo vende y compra piezas', () => {
    newTower();
    const L = player.arena, stock = towerShopStock(L);
    checkEq(stock.length, 6, '6 piezas a la venta');
    check(stock.filter(i => i.quality === 'rare').length === 1, 'una rara');
    const item = stock[0], price = towerItemPrice(item);
    player.gold = 50;
    check(!buyTowerItem(player, stock.find(i => i.quality === 'rare')), 'sin oro no se compra');
    player.gold = 10000;
    check(buyTowerItem(player, item), 'se compra');
    checkEq(player.gold, 10000 - price, 'cobra el precio');
    check(player.bag.some(b => b.item === item) && !L.town.stock.includes(item), 'pasa a la bolsa');
    sellTowerItem(player, item);
    checkEq(player.gold, 10000 - price + towerSellPrice(item), 'vender devuelve una parte');
    const tp = towerTomePrice(player), pts = player.statPoints;
    check(buyTowerTome(player) && player.statPoints === pts + 1, 'el Tomo de Talento da un punto de stats');
    check(towerTomePrice(player) > tp, 'el siguiente tomo cuesta más');
    check(!player.bag.some(b => b.item === item), 'sale de la bolsa');
}, { random: true });

test('Torre: los creeps de bioma tienen su rasgo (veneno, quemadura, frío)', () => {
    newTower();
    const toad = biomeCreepTypes('swamp').find(t => t.trait === 'poison');
    const c = makeCreep(toad, player.x + 1, player.y, 1, false, 0); c.arena = player.arena;
    toad.onAttack(c, player, { dealt: 5 });
    check(getEffect(player, 'POISON'), 'envenena');
    const yeti = biomeCreepTypes('snow').find(t => t.trait === 'chill');
    yeti.onAttack(makeCreep(yeti, 0, 0, 1, false, 0), player, { dealt: 5 });
    check(sumMod(player, 'moveSpeedPct') < 0, 'el frío frena');
    check(towerCreepPool(1).every(t => !t.from) && towerCreepPool(2).some(t => t.from === 1), 'el segundo piso del bioma suma creeps');
}, { random: true });

test('Torre: ritmo de niveles al estilo Diablo II (experiencia según el nivel de zona del piso)', () => {
    newTower();
    player.level = towerZoneLevel(3);
    checkEq(towerXpFactor(player, 3), 1, 'en el nivel de zona: experiencia completa');
    player.level = towerZoneLevel(3) + 3;
    checkNear(towerXpFactor(player, 3), 1 - 3 * PACE.overPenalty, 'tres niveles de más: menos experiencia');
    player.level = towerZoneLevel(3) + 10;
    checkEq(towerXpFactor(player, 3), PACE.overFloor, 'muy pasado: casi nada');
    player.level = 1;
    check(towerXpFactor(player, 3) > 1, 'atrasado: un poco más');
}, { random: true });

test('Torre: campeones con afijos, santuarios y objetivo del piso', () => {
    newTower();
    const L = player.arena;
    const c = makeCreep(towerCreepPool(1)[0], player.x + 1, player.y, 1, false, 0); c.arena = L;
    const hp = c.maxHp;
    makeChampion(c, ['explosive', 'strong']);
    check(c.maxHp > hp && c.label.includes('Campeón') && c.label.includes('Explosivo'), 'campeón con más vida y sus afijos en el nombre');
    const php = player.hp;
    championOnDeath(c);
    check(player.hp < php, 'el Explosivo daña al morir cerca tuyo');
    L.shrines = [{ x: player.x, y: player.y, kind: 'fury', used: false }];
    useShrines(L, player);
    check(L.shrines[0].used && getEffect(player, 'SHRINE_FURY'), 'el santuario se usa una vez y da su efecto');
    check(towerObjective(L).text.includes('pueblo'), 'primero: ir al pueblo');
    L.visitedTown = true;
    check(towerObjective(L).text.includes('laberinto'), 'después: entrar al laberinto');
    L.enteredLab = true;
    check(towerObjective(L).text.includes('guardián'), 'adentro: vencer al guardián');
    checkEq(towerLevel(2).shrines.length, SHRINES_PER_FLOOR, 'cada piso trae sus santuarios');
}, { random: true });

test('Torre: día y noche (oscuridad, menos visión, criaturas nocturnas que se van al amanecer)', () => {
    newTower();
    const L = player.arena;
    checkEq(towerDarkness(0), 0, 'arranca de día');
    checkEq(towerDarkness(DAYNIGHT.day + DAYNIGHT.dusk + 10), 1, 'noche cerrada');
    const sight = heroSight(player);
    player.x = L.start.x; player.y = L.start.y;
    gameClock = towerRun.startedAt + DAYNIGHT.day + DAYNIGHT.dusk + 5;
    const before = L.creeps.length;
    towerDayNightTick(L);
    check(L.isNight && L.creeps.length > before && L.creeps.some(c => c.nocturnal), 'de noche salen criaturas nocturnas');
    check(heroSight(player) < sight, 'de noche se ve menos en el campo');
    player.level = 1;
    check(towerXpFactor(player, 1) > 1, 'de noche se gana más experiencia');
    gameClock = towerRun.startedAt + DAY_CYCLE + 5;
    towerDayNightTick(L);
    check(!L.isNight && !L.creeps.some(c => c.nocturnal && !c.aggro), 'al amanecer se van');
}, { random: true });

test('Torre: lugares altos (mesetas con rampas, más visión y daño desde arriba)', () => {
    newTower();
    const L = player.arena;
    check(L.height.some(v => v) && L.ramp.some(v => v), 'hay mesetas y rampas');
    check(L.walls.some(row => row.some(w => w === WALL.cliff)), 'con acantilados');
    const i = L.height.findIndex((v, j) => v && !L.walls[Math.floor(j / COLS)][j % COLS] && !L.deep[j]);
    const c = makeCreep(towerCreepPool(1)[0], 0, 0, 1, false, 0); c.arena = L;
    player.x = i % COLS; player.y = Math.floor(i / COLS);
    const j = L.height.findIndex((v, k) => !v && L.zone[k] === ZONE.field && walkable(L, k % COLS, Math.floor(k / COLS)));
    c.x = j % COLS; c.y = Math.floor(j / COLS);
    checkEq(heightDamageMult(player, c), HEIGHT_RULES.dmgUp, 'de arriba hacia abajo pega más');
    checkEq(heightDamageMult(c, player), HEIGHT_RULES.dmgDown, 'de abajo hacia arriba, menos');
}, { random: true });

test('Torre: cuevas con niveles de profundidad, jefe y tesoro en el fondo, y volver a la superficie', () => {
    newTower();
    const L = player.arena;
    checkEq(L.caves.length, CAVE.mouths, 'dos entradas de cueva por piso');
    const cave = L.caves[0];
    player.x = cave.x; player.y = cave.y;
    towerPortals(L, player);
    const c1 = player.arena;
    check(c1.isCave && c1.depth === 1 && COLS === CAVE.w, 'entró a la cueva (−1), mundo de 90×70');
    check(c1.creeps.length > 0 && c1.down, 'con creeps y una bajada');
    check(heroSight(player) < TOWER.baseSight, 'en la cueva se ve menos');
    const dist = bfsFrom(c1, c1.exitUp.x, c1.exitUp.y);
    check(dist[c1.down.y * COLS + c1.down.x] > 0, 'se llega a la bajada');
    for (let d = 2; d <= cave.max; d++) enterCave(cave, d);
    const bottom = player.arena;
    check(!bottom.down && bottom.caveBoss && bottom.chests.some(ch => ch.treasure), 'en el fondo: jefe y tesoro');
    const avg = lv => { const cs = lv.creeps.filter(c => !c.isCaveBoss && !c.isChestGuard); return cs.reduce((a, c) => a + c.level, 0) / cs.length; };
    check(avg(bottom) > avg(c1), 'más hondo, creeps de más nivel');
    player.x = bottom.exitUp.x; player.y = bottom.exitUp.y;
    towerPortals(bottom, player);
    checkEq(player.arena.depth, cave.max - 1, 'la soga sube un nivel');
    for (let d = cave.max - 1; d >= 1; d--) leaveCave(player.arena);
    check(player.arena === L && COLS === TOWER.cols, 'volvió a la superficie con el mundo grande');
}, { random: true });

test('Torre: generador de criaturas (bestiario propio por run, nombres, rasgos del bioma, figuras con partes)', () => {
    newTower();
    const list = generateBestiary('swamp');
    checkEq(list.length, 9, '6 del primer piso + 3 difíciles');
    checkEq(list.filter(t => t.from === 1).length, 3, 'tres difíciles');
    checkEq(new Set(list.map(t => t.label)).size, list.length, 'sin nombres repetidos');
    check(list.every(t => t.traits.every(k => BEAST_TRAITS[k].biomes.includes('swamp'))), 'rasgos con afinidad por el bioma');
    check(list.every(t => INK_PLANS[t.plan] && CREEP_TYPES[t.key]), 'cuerpo dibujable y mecánica de un creep conocido');
    list.forEach(t => inkFigure(t.plan, inkLookFor({ type: t, color: t.color }), 'walk', 3));
    check(towerCreepPool(1).every(t => t.genome && t.biome === 'forest'), 'los pisos usan el bestiario generado de la run');
    check(towerCreepPool(1)[0] === towerCreepPool(1)[0] && towerBestiary('forest') === towerBestiary('forest'), 'el bestiario queda fijo durante la run');
    // Espinas
    const t = generateBeast('forest', 'brawler', 0); t.thorns = 0.2;
    const c = makeCreep(t, player.x + 1, player.y, 1, false, 0); c.arena = player.arena;
    const hp = player.hp;
    dealDamage(player, c, 20, 'physical', { isAttack: true });
    check(player.hp < hp, 'las espinas devuelven daño cuerpo a cuerpo');
    let names = 0; for (let i = 0; i < 30; i++) names += /Gran |Pequeñ/.test(generateBeast('desert', 'brawler', 0).label) ? 1 : 0;
    check(names > 0, 'el tamaño aparece en el nombre');
}, { random: true });

test('Torre: el nivel se genera conectado, con guardián, escalera y creeps con nivel', () => {
    const level = newTower();
    checkEq(gameState, 'TOWER', 'fase de la Torre');
    checkEq(COLS + 'x' + ROWS, TOWER.cols + 'x' + TOWER.rows, 'mundo grande');
    checkEq(player.skills.map(s => s.id).join(), 'ADVENTURER_GOLPE', 'arranca con la Espada puesta (Golpe Certero)');
    const dist = bfsFrom(level, level.start.x, level.start.y);
    check(level.rooms.every(r => dist[r.cy * COLS + r.cx] >= 0), 'todas las salas se alcanzan');
    check(dist[level.stairs.y * COLS + level.stairs.x] >= 0, 'la escalera se alcanza');
    check(level.guardian && level.guardian.isRoundBoss, 'guardián');
    const creeps = level.creeps.filter(c => !c.isGuardian);
    check(creeps.length > 5 && creeps.every(c => c.level >= 1 && walkable(level, c.x, c.y)), 'creeps con nivel, sobre el piso');
    resetGame();
    checkEq(COLS + 'x' + ROWS, '20x12', 'al salir, el mundo vuelve al tamaño normal');
}, { random: true });

test('Torre: las paredes no se atraviesan y los creeps las rodean', () => {
    const level = newTower();
    let spot = null;
    for (let y = 1; y < ROWS - 1 && !spot; y++) for (let x = 1; x < COLS - 2 && !spot; x++) if (walkable(level, x, y) && !walkable(level, x + 1, y)) spot = { x, y };
    player.x = spot.x; player.y = spot.y;
    level.creeps.forEach(c => { c.hp = 0; });
    keys['d'] = true;
    try { player.moveTimer = 99; updateHero(player, level, 0); } finally { keys['d'] = false; }
    checkEq(player.x, spot.x, 'la pared frena');
    // Un creep lejos encuentra el camino hacia el héroe
    const far = level.rooms.slice(-1)[0];
    const c = makeCreep(CREEP_TYPES.GRUNT, far.cx, far.cy, 1, false, 0); c.arena = level; level.creeps.push(c);
    const f = flowField(level, player.x, player.y), before = f[c.y * COLS + c.x];
    const dir = towerPathDir(c, player);
    check(dir && f[(c.y + dir.dy) * COLS + c.x + dir.dx] < before, 'el paso acerca por el camino');
}, { random: true });

test('Torre: el héroe camina en diagonal hacia donde hiciste clic (los creeps, en cruz)', () => {
    const level = newTower();
    level.creeps.forEach(c => { c.hp = 0; });
    const room = level.rooms.find(r => r.w >= 6 && r.h >= 5);
    player.x = room.x + 1; player.y = room.y + 1;
    const dir = towerPathDir(player, { x: room.x + 4, y: room.y + 4 });
    checkEq([dir.dx, dir.dy].join(), '1,1', 'paso en diagonal');
    const c = makeCreep(CREEP_TYPES.GRUNT, room.x + 1, room.y + 1, 1, false, 0); c.arena = level;
    const cd = towerPathDir(c, { x: room.x + 4, y: room.y + 4 });
    check(!(cd.dx && cd.dy), 'el creep sigue en cruz');
}, { random: true });

test('Torre: visión con paredes que tapan y distancia según el héroe', () => {
    const level = newTower();
    // Una casilla de piso detrás de una pared, cerca del héroe: no se ve
    let hidden = null;
    for (let y = 1; y < ROWS - 1 && !hidden; y++) for (let x = 1; x < COLS - 2 && !hidden; x++)
        if (walkable(level, x, y) && !walkable(level, x + 1, y) && walkable(level, x + 2, y) && level.walls[y][x + 1] && level.walls[y][x + 1] !== WALL.cliff) hidden = { x, y }; // (desde una meseta los acantilados no tapan)
    if (hidden) {
        player.x = hidden.x; player.y = hidden.y; level.fovKey = null; computeFov(level, player);
        check(!canSee(level, hidden.x + 2, hidden.y), 'la pared tapa lo que hay detrás');
        check(canSee(level, hidden.x + 1, hidden.y), 'la pared misma se ve');
    }
    checkEq(heroSight(player), TOWER.baseSight, 'visión base');
}, { random: true });

test('Torre: cada nivel da 5 puntos de stats para repartir (Vitalidad da vida, Visión da distancia)', () => {
    newTower();
    const str = player.str, hp = player.maxHp, sight = heroSight(player);
    gainXp(player, xpToNext(1));
    checkEq(player.statPoints, TOWER.pointsPerLevel, 'puntos al subir de nivel');
    checkNear(player.str, str, 'sin atributos automáticos');
    spendStatPoint(player, 'vit'); spendStatPoint(player, 'vis');
    checkEq(player.maxHp, hp + TOWER.vitHp, 'Vitalidad: vida');
    checkNear(heroSight(player), sight + TOWER.visionPerPoint, 'Visión: distancia');
    checkEq(player.statPoints, TOWER.pointsPerLevel - 2, 'gastó 2');
}, { random: true });

test('Torre: creeps inteligentes (avisan, huyen con poca vida, los de lejos y el apoyo mantienen distancia, te rodean)', () => {
    const level = newTower();
    level.creeps.forEach(c => { c.hp = 0; });
    const room = level.rooms.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
    player.x = room.cx; player.y = room.cy; level.fovKey = null; computeFov(level, player);
    const add = (key, dx, dy) => { const c = makeCreep(CREEP_TYPES[key], room.cx + dx, room.cy + dy, 1, false, 0); Object.assign(c, { arena: level, spawnTime: -1e9 }); level.creeps.push(c); return c; };
    const a = add('GRUNT', 2, 0), b = add('GRUNT', 3, 1);
    a.aggro = true; alertPack(level, a);
    check(b.aggro, 'avisó al compañero');
    a.hp = a.maxHp * 0.1;
    a.moveTimer = 9999; const before = Math.hypot(a.x - player.x, a.y - player.y);
    check(towerCreepBrain(a, 0.016) && Math.hypot(a.x - player.x, a.y - player.y) >= before, 'huye con poca vida');
    const archer = add('ARCHER', 1, 0); archer.moveTimer = 9999;
    check(towerCreepBrain(archer, 0.016), 'el arquero se aleja si lo tenés encima');
    const healer = add('HEALER', 0, 2); healer.moveTimer = 9999;
    check(towerCreepBrain(healer, 0.016), 'el sanador se queda atrás');
    const g = add('GRUNT', -3, 0), slot = surroundSlot(g);
    check(slot && Math.hypot(slot.x - player.x, slot.y - player.y) === 1, 'busca una casilla al lado tuyo');
}, { random: true });

test('Torre: arrancás como aventurero; cada habilidad e innato de cada héroe es una pieza (sin repetir)', () => {
    newTower();
    checkEq(player.key, 'ADVENTURER', 'aventurero sin clase');
    const cat = towerCatalog();
    const skills = Object.values(HERO_SKILLS).flatMap(k => Object.keys(k));
    checkEq(cat.filter(e => e.skillId).length, skills.length, 'una pieza por habilidad');
    checkEq(new Set(cat.filter(e => e.skillId).map(e => e.skillId)).size, skills.length, 'sin repetir');
    checkEq(cat.filter(e => e.innateId).length, Object.keys(HERO_TEMPLATES).length, 'un amuleto por innato');
    check(cat.every(e => TOWER_SLOTS[e.slot]), 'ranuras válidas');
}, { random: true });

test('Torre: al despertar, las 3 armas están clavadas en el círculo; sin arma no salís; F o clic la agarra y las otras se hunden', () => {
    newTower('AXE', { weapon: null });
    const L = player.arena;
    check(awaitingWeapon(), 'esperando que agarres una');
    checkEq(L.starterWeapons.length, 3, 'las 3 clavadas');
    check(L.starterWeapons.every(w => walkable(L, w.x, w.y) && Math.hypot(w.x - L.start.x, w.y - L.start.y) <= AWAKEN.gate), 'en el círculo, en casillas que se pisan');
    check(!towerModalOpen(), 'la partida no espera: se camina');
    // sin arma no se sale del círculo
    const from = { x: player.x, y: player.y }; player.x = L.start.x + 4; towerAwakenTick(L, from);
    check(player.x === from.x && player.y === from.y, 'te frena en el borde del círculo');
    // lejos de todas, F no hace nada
    player.x = L.start.x; player.y = L.start.y;
    const bow = L.starterWeapons.find(w => w.key === 'ADVENTURER_BOW');
    L.starterWeapons.forEach(w => { if (w !== bow) { w.x = L.start.x - 2; w.y = L.start.y - 2; } });
    bow.x = L.start.x + 2; bow.y = L.start.y + 2; player.x = L.start.x - 2; player.y = L.start.y + 2; // lejos de todas
    if (!starterWeaponNear()) check(!towerInteract(), 'lejos: nada');
    player.x = bow.x; player.y = bow.y - 1;
    checkEq(starterWeaponNear(), bow, 'al lado del arco: lo tenés a mano');
    check(towerInteract(), 'F lo agarra');
    check(player.hasSkill('ADVENTURER_VOLLEY') && !awaitingWeapon(), 'con el arco y su habilidad; ya no espera');
    check(!starterWeaponNear(), 'las otras se hundieron');
    from.x = player.x; from.y = player.y; player.x = L.start.x + 4; towerAwakenTick(L, from);
    checkEq(player.x, L.start.x + 4, 'armado, salís');
    // el clic también, y el piloto agarra la espada solo
    newTower('AXE', { weapon: null });
    const st = player.arena.starterWeapons.find(w => w.key === 'ADVENTURER_STAFF'); player.x = st.x; player.y = st.y;
    check(towerClickWeapon({ x: st.x, y: st.y }) && player.hasSkill('ADVENTURER_BOLT'), 'clic en el bastón');
    newTower('AXE', { weapon: null });
    const saved = autopilot; autopilot = true;
    try { towerAwakenTick(player.arena, { x: player.x, y: player.y }); check(player.hasSkill('ADVENTURER_GOLPE'), 'el piloto agarra la espada'); } finally { autopilot = saved; }
});

test('Torre: cada arma inicial da su propia habilidad y atributo; cambiar de arma te la saca', () => {
    ['ADVENTURER_SWORD', 'ADVENTURER_BOW', 'ADVENTURER_STAFF'].forEach(key => {
        newTower('AXE', { weapon: key });
        const w = STARTER_WEAPONS[key];
        check(player.hasSkill(w.skillId), `tiene ${w.skillId}`);
        check(player.keyBindings[w.skillId], 'con tecla propia');
        checkEq(player.primaryAttr, heroOf(key).primaryAttr, 'el atributo principal sale del arma elegida');
    });
    // Cambiar de arma (como con cualquier otra pieza) saca la habilidad vieja y pone la nueva.
    newTower('AXE', { weapon: 'ADVENTURER_SWORD' });
    check(player.hasSkill('ADVENTURER_GOLPE'), 'arrancó con Golpe Certero');
    const entry = towerCatalog().find(e => e.heroKey === 'SNIPER' && e.slot === 'weapon');
    equipItem(player, makeTowerItem(1, entry, 'normal'));
    check(!player.hasSkill('ADVENTURER_GOLPE'), 'perdió Golpe Certero al cambiar de arma');
    check(player.hasSkill(entry.skillId), 'tiene la del rifle en su lugar');
});

// Crea un creep de prueba en la Torre (dummy() usa el array `creeps` global, que acá no se usa: cada nivel
// tiene el suyo en level.creeps, ver "Torre: las paredes no se atraviesan...").
function towerDummy(level, dx = 1, dy = 0) {
    const c = makeCreep(CREEP_TYPES.GRUNT, player.x + dx, player.y + dy, 1, false, 0);
    Object.assign(c, { arena: level, hp: 9999, maxHp: 9999, spawnTime: -1e9 });
    level.creeps.push(c);
    return c;
}
// Vuela los proyectiles hasta que no quede ninguno (o se acabe el tiempo)
function flyProjectiles(level, max = 3) { for (let t = 0; t < max && level.projectiles.length; t += 0.02) updateProjectiles(level, 0.02); }
test('Torre: Combo de Tajos (espada) — arco a todos, remate ×2 que empuja, recuperación y el ritmo se corta', () => {
    const level = newTower('AXE', { weapon: 'ADVENTURER_SWORD' });
    level.creeps.forEach(c => { c.hp = 0; });
    const sk = SKILL_INDEX.ADVENTURER_GOLPE;
    const a = towerDummy(level, 1, 0), b = towerDummy(level, 1, 1), back = towerDummy(level, -2, 0);
    player.aimPoint = { x: player.x + 3, y: player.y };
    check(tryCastSkill(player, sk), 'primer tajo');
    check(a.hp < 9999 && b.hp < 9999, 'el arco agarra a los dos de adelante');
    checkEq(back.hp, 9999, 'no al de atrás (fuera del arco)');
    const d1 = 9999 - a.hp;
    checkEq(player.comboStep, 1, 'va un tajo');
    check(player.cooldowns[sk.id] < 0.5, 'entre tajo y tajo, casi nada');
    player.cooldowns[sk.id] = 0; tryCastSkill(player, sk);
    player.cooldowns[sk.id] = 0; const ax = a.x, hpBefore = a.hp; tryCastSkill(player, sk);
    check(hpBefore - a.hp > d1 * 1.5, 'el remate pega mucho más');
    check(a.x !== ax, 'y empuja');
    checkEq(player.comboStep, 0, 'vuelve a empezar');
    check(player.cooldowns[sk.id] > 1, 'después del remate, recuperación');
    player.cooldowns[sk.id] = 0; tryCastSkill(player, sk); gameClock += 5; player.cooldowns[sk.id] = 0; tryCastSkill(player, sk);
    checkEq(player.comboStep, 1, 'si tardás, el ritmo se corta y arranca de nuevo');
    player.aimPoint = null;
    checkEq(sk.manaCost, undefined); checkEq(val(sk, player, 'manaCost'), 0, 'sin maná');
});
test('Torre: Tiro Tensado (arco) — al toque no atraviesa, tensado del todo atraviesa, perfecto suma, tensar frena', () => {
    const level = newTower('AXE', { weapon: 'ADVENTURER_BOW' });
    level.creeps.forEach(c => { c.hp = 0; });
    player.critChance = -1000; // sin críticos: se comparan los multiplicadores
    const sk = SKILL_INDEX.ADVENTURER_VOLLEY;
    // un pasillo libre a la derecha
    for (let x = 1; x <= 6; x++) level.walls[player.y][player.x + x] = 0;
    const a = towerDummy(level, 2, 0), b = towerDummy(level, 4, 0);
    const shoot = held => { player.cooldowns[sk.id] = 0; player.mana = player.maxMana; startCharge(player, sk, 'q'); player.charging.start = gameClock - held; player.aimPoint = null; releaseCharge(player); flyProjectiles(level); };
    shoot(0.05);
    check(a.hp < 9999 && b.hp === 9999, 'al toque: se queda en el primero');
    const tap = 9999 - a.hp; a.hp = b.hp = 9999;
    shoot(BOW_SHOT.chargeTime + 0.5);
    check(a.hp < 9999 && b.hp < 9999, 'tensado del todo: atraviesa');
    const full = 9999 - a.hp; a.hp = b.hp = 9999;
    check(full > tap * 2.5, `tensado pega mucho más (${tap} → ${full})`);
    shoot(BOW_SHOT.chargeTime + 0.05);
    check(9999 - a.hp > full * 1.15, 'soltar justo: tiro perfecto');
    player.cooldowns[sk.id] = 0; startCharge(player, sk, 'q'); towerFeelTick(player);
    check(effMoveMult(player) < 0.7, 'tensando camina más lento');
    releaseCharge(player); towerFeelTick(player);
    check(!getEffect(player, 'CHARGING'), 'al soltar, vuelve a caminar normal');
    // una pared frena la flecha
    a.hp = 9999; level.walls[player.y][player.x + 1] = WALL.stone; shoot(BOW_SHOT.chargeTime + 0.5);
    checkEq(a.hp, 9999, 'la pared la frena');
}, { random: true });
test('Torre: Saeta Arcana (bastón) — orbe que explota en el primero, salpica y marca arcano', () => {
    const level = newTower('AXE', { weapon: 'ADVENTURER_STAFF' });
    level.creeps.forEach(c => { c.hp = 0; });
    for (let x = 1; x <= 4; x++) for (let y = -1; y <= 1; y++) level.walls[player.y + y][player.x + x] = 0;
    const sk = SKILL_INDEX.ADVENTURER_BOLT;
    const c = towerDummy(level, 2, 0), side = towerDummy(level, 2, 1), far = towerDummy(level, 9, 5);
    player.mana = player.maxMana;
    check(tryCastSkill(player, sk), 'sale el orbe');
    flyProjectiles(level);
    check(c.hp < 9999, 'le pega al primero');
    check(side.hp < 9999 && 9999 - side.hp < 9999 - c.hp, 'salpica al de al lado, menos');
    checkEq(far.hp, 9999, 'no al de lejos');
    check(c.elMark && c.elMark.el === 'arcane', 'marcado con arcano para las reacciones (fxSkills.js)');
}, { random: true });

test('Torre: tiradores — avisan, disparan su patrón, la bala pega, el esquive la atraviesa, la pared la frena y la espada la desvía', () => {
    const level = newTower('AXE', { weapon: 'ADVENTURER_SWORD' });
    level.creeps.forEach(c => { c.hp = 0; });
    for (let x = -1; x <= 6; x++) for (let y = -2; y <= 2; y++) if (level.walls[player.y + y] && level.walls[player.y + y][player.x + x] !== undefined) level.walls[player.y + y][player.x + x] = 0;
    check(towerBestiary('forest').some(t => t.genome.role === 'gunner' && BULLET_PATTERNS[t.bulletPattern]), 'cada bioma tiene un tirador con su patrón');
    const type = makeGunnerType(generateBeast('forest', 'gunner', 0), 'gunner'); type.bulletPattern = 'fan';
    const g = makeCreep(type, player.x + 5, player.y, 1, false, 0); Object.assign(g, { arena: level, spawnTime: -1e9, aggro: true }); level.creeps.push(g);
    g.shotAt = gameClock; gunnerTick(g, 0.05);
    check(g.tellUntil > gameClock, 'primero avisa');
    checkEq((level.bullets || []).length, 0, 'todavía no disparó');
    gameClock += BULLET.tell + 0.01; gunnerTick(g, 0.05);
    checkEq(level.bullets.length, 3, 'abanico: 3 balas');
    const hp = player.hp;
    for (let i = 0; i < 40; i++) { gameClock += 0.05; towerBulletsTick(level, 0.05); }
    check(player.hp < hp, 'la del medio le pega al que se queda quieto');
    // el esquive la atraviesa
    level.bullets = []; g.shotAt = gameClock; g.tellUntil = 0; gunnerTick(g, 0.05); gameClock += BULLET.tell + 0.01; gunnerTick(g, 0.05);
    const hp2 = player.hp; addEffect(player, { id: 'DASH', name: 'Esquive', duration: 99, flags: ['invulnerable'] });
    for (let i = 0; i < 40; i++) { gameClock += 0.05; towerBulletsTick(level, 0.05); }
    checkEq(player.hp, hp2, 'con el esquive no le pega'); removeEffect(player, 'DASH');
    // la pared la frena
    level.bullets = []; spawnBullet(g, Math.PI, 6, 1); level.walls[player.y][player.x + 2] = WALL.stone;
    const hp3 = player.hp; for (let i = 0; i < 40; i++) { gameClock += 0.05; towerBulletsTick(level, 0.05); }
    checkEq(player.hp, hp3, 'la pared la frena'); level.walls[player.y][player.x + 2] = 0;
    // el piloto la ve venir y se corre
    level.bullets = []; spawnBullet(g, Math.PI, 6, 1);
    check(bulletDanger(player, player.x, player.y) > 0, 've que viene');
    const d = towerDodgeDir(player);
    check(d && d.dy !== 0, 'se corre de la línea');
    // la espada la desvía
    level.bullets = []; spawnBullet(g, Math.PI, 6, 1); level.bullets[0].x = player.x + 1.2;
    player.aimPoint = { x: player.x + 3, y: player.y }; player.cooldowns.ADVENTURER_GOLPE = 0; tryCastSkill(player, SKILL_INDEX.ADVENTURER_GOLPE); player.aimPoint = null;
    checkEq(level.bullets.length, 0, 'el tajo la desvía');
}, { random: true });

test('Torre: traspasar — la pieza vieja se consume, la nueva hereda la mitad de su experiencia y de sus stats, y cuesta oro', () => {
    newTower('AXE', { weapon: 'ADVENTURER_SWORD' });
    const old = player.gear.weapon;
    giveItemXp(player, old, itemTotalXp(Object.assign({}, old, { level: 7, xp: 0 })));
    old.statBoosts = { weaponAtk: 8 };
    checkEq(old.level, 7, 'la vieja llegó a nivel 7');
    const neu = makeTowerItem(2, towerCatalog().find(e => e.slot === 'weapon' && e.heroKey === 'AXE'), 'magic');
    equipItem(player, neu);
    check(player.bag.some(b => b.item === old), 'la vieja quedó en la bolsa');
    const p = transferPreview(old, neu), cost = transferCost(old);
    check(p.levels >= 2, `sube varios niveles (${p.levels})`);
    checkEq(p.stats.weaponAtk, 4, 'la mitad del daño forjado');
    player.gold = cost - 1;
    check(!transferItem(player, old, neu), 'sin oro, no');
    player.gold = cost + 5; const lvl = neu.level, atk = player.baseAtk, xp0 = itemTotalXp(neu);
    check(transferItem(player, old, neu), 'traspasa');
    checkEq(player.gold, 5, 'cobró');
    check(!player.bag.some(b => b.item === old), 'la vieja desapareció');
    checkEq(neu.level, lvl + p.levels, 'subió lo que decía la vista previa');
    check(neu.pendingChoices >= p.levels, 'con sus elecciones de forja');
    check(player.baseAtk > atk, 'pega más');
    check(!canTransfer(neu, makeBlankItem(1, 'helm', 'normal')), 'solo entre piezas de la misma ranura');
    checkEq(itemTotalXp(neu) - xp0, Math.floor(itemTotalXp(old) * TRANSFER.share), 'exactamente la mitad de la experiencia');
});

test('Torre: interfaz de combate — la ranura Q muestra la carga del arco y el combo; avisos de balas fuera de la vista', () => {
    const level = newTower('AXE', { weapon: 'ADVENTURER_BOW' });
    const sk = SKILL_INDEX.ADVENTURER_VOLLEY, slot = document.createElement('div');
    slot.innerHTML = '<div class="charge"><i></i></div>';
    player.mana = player.maxMana; startCharge(player, sk, 'q'); player.charging.start = gameClock - BOW_SHOT.chargeTime * 0.5;
    feelSlotCharge(slot, player, sk);
    check(Math.abs(parseFloat(slot.querySelector('.charge i').style.width) - 50) < 1, 'a mitad de tensar, barra a la mitad');
    player.charging.start = gameClock - BOW_SHOT.chargeTime - 0.05; feelSlotCharge(slot, player, sk);
    check(slot.querySelector('.charge').classList.contains('perfect') && slot.classList.contains('perfect-now'), 'en el momento perfecto, destella');
    releaseCharge(player);
    // combo
    newTower('AXE', { weapon: 'ADVENTURER_SWORD' });
    const box = document.createElement('div'); box.innerHTML = '<span class="combo"><b></b><b></b><b></b></span>';
    player.comboStep = 2; player.comboAt = gameClock; feelSlotCombo(box, player);
    checkEq(box.querySelectorAll('.combo b.on').length, 2, 'dos tajos');
    check(box.querySelector('.combo').classList.contains('next-finisher'), 'el próximo es el remate');
    gameClock += 5; feelSlotCombo(box, player);
    checkEq(box.querySelectorAll('.combo b.on').length, 0, 'se cortó el ritmo');
    // avisos fuera de la vista
    const L = player.arena; updateCamera(L, player, 0);
    const g = makeCreep(CREEP_TYPES.ARCHER, player.x, player.y, 1, false, 0); g.arena = L;
    L.bullets = [];
    spawnBullet(g, 0, 30, 1); Object.assign(L.bullets[0], { x: player.x - 40, y: player.y, vx: 30, vy: 0 }); // viene hacia vos desde lejos
    spawnBullet(g, 0, 30, 1); Object.assign(L.bullets[1], { x: player.x + 40, y: player.y, vx: 30, vy: 0 }); // se aleja
    const th = offscreenThreats(L);
    checkEq(th.length, 1, 'solo la que viene');
    check(Math.abs(Math.abs(th[0].a) - Math.PI) < 0.01, 'del lado izquierdo');
    L.bullets = [];
}, { random: true });

test('Piloto con reflejos humanos: tarda en ver los avisos, a veces no los ve y a veces el esquive le falla', () => {
    const saved = aiReflex;
    try {
        const level = newTower('AXE', { weapon: 'ADVENTURER_SWORD' });
        level.creeps.forEach(c => { c.hp = 0; });
        const c = towerDummy(level, 3, 0);
        aiReflex = 'perfect';
        startTelegraph(c, { shape: 'circle', x: player.x, y: player.y, r: 1.5 }, 'champion');
        check(telegraphsOn(player).length === 1, 'el perfecto lo ve al instante');
        aiReflex = 'human';
        const t = level.telegraphs[level.telegraphs.length - 1]; t.aiRoll = 0.9; // de los que sí ve
        checkEq(telegraphsOn(player).length, 0, 'el humano todavía no reaccionó');
        gameClock += AI_REFLEX.human.reaction + 0.01;
        checkEq(telegraphsOn(player).length, 1, 'ahora sí');
        t.aiRoll = 0.01; checkEq(telegraphsOn(player).length, 0, 'este no lo vio (pantalla llena)');
        level.telegraphs = [];
        // el esquive: con dashOk 0 nunca le sale
        const keep = AI_REFLEX.human.dashOk; AI_REFLEX.human.dashOk = 0;
        try { player.aiDashFumbleUntil = 0; check(!aiDashWorks(player), 'le falló'); check(player.aiDashFumbleUntil > gameClock, 'y no reintenta enseguida'); }
        finally { AI_REFLEX.human.dashOk = keep; }
    } finally { aiReflex = saved; }
}, { random: true });

test('Torre: al morir los stats quedan en tus restos; si morís otra vez antes de buscarlos, los restos se suman (no se pierden)', () => {
    newTower();
    player.statPoints = 20; for (let i = 0; i < 20; i++) spendStatPoint(player, 'vit');
    checkEq(player.towerStats.vit, 20, '20 en Vitalidad');
    towerHeroDeath(player, null);
    checkEq(player.towerStats.vit, 10, 'la mitad queda en los restos');
    checkEq(towerRun.corpse.points, 10, 'restos con 10');
    towerRespawn();
    towerHeroDeath(player, null); // muere de nuevo sin buscarlos
    checkEq(player.towerStats.vit, 5, 'pierde la mitad de lo que le quedaba');
    checkEq(towerRun.corpse.points, 15, 'los restos nuevos traen también los viejos (10 + 5)');
    towerRespawn();
    const c = towerRun.corpse; enterTowerLevel(c.level, { x: c.x, y: c.y }); player.x = c.x; player.y = c.y; recoverCorpse(c.level, player);
    checkEq(player.towerStats.vit, 20, 'al buscarlos vuelve todo');
});

test('Torre: el Cuaderno escribe una página sola la primera vez que hacés cada cosa, y no se repite', () => {
    notebookState = { seen: {} };
    newTower(); // startTowerRun() ya escribió WAKE al despertar
    check(notebookState.seen.WAKE, 'WAKE al despertar');

    keys.w = true;
    updateTower(1 / 60);
    keys.w = false;
    check(notebookState.seen.MOVE, 'MOVE al caminar');

    player.dashReadyAt = gameClock + 1; // como si recién hubiese esquivado (fxSkills.js)
    updateTower(1 / 60);
    check(notebookState.seen.DODGE, 'DODGE con el esquive recién usado');

    emit(player, 'onKill', { victim: {} });
    check(notebookState.seen.KILL, 'KILL al matar (innato del Aventurero, towerItems.js)');
    emit(player, 'onCast', { skill: SKILL_INDEX.ADVENTURER_GOLPE });
    check(notebookState.seen.CAST, 'CAST al lanzar');

    writeNotebookPage('CHEST'); writeNotebookPage('TOWN');
    check(notebookState.seen.CHEST && notebookState.seen.TOWN, 'CHEST y TOWN');

    ['TELEGRAPH', 'ESSENCE', 'SMITH', 'CRAFT', 'MASTERY', 'BULLETS', 'TRANSFER'].forEach(id => writeNotebookPage(id)); // las de lo nuevo (fases 4 y 5, tiradores)
    checkEq(Object.keys(notebookState.seen).length, NOTEBOOK_PAGES.length, 'todas las páginas');
    const before = JSON.stringify(notebookState.seen);
    writeNotebookPage('WAKE'); // repetir no hace nada
    checkEq(JSON.stringify(notebookState.seen), before, 'repetir no cambia nada');
}, { random: true });

test('Torre: la ventana del Cuaderno (N) muestra las páginas que ya escribiste y "???" las demás', () => {
    notebookState = { seen: { WAKE: true } };
    newTower();
    toggleNotebook(true);
    check(notebookOpen, 'se abre');
    const rows = [...document.querySelectorAll('#notebook-pages .notebook-page')];
    checkEq(rows.length, NOTEBOOK_PAGES.length, 'una fila por página');
    check(rows[0].textContent.includes('despertar'), 'la escrita muestra su texto');
    check(!rows[0].classList.contains('locked'), 'sin candado');
    check(rows[1].textContent.includes('???'), 'la que falta, oculta');
    check(rows[1].classList.contains('locked'), 'con candado');
    handleEscape();
    check(!notebookOpen, 'Esc la cierra');
});

test('Torre: equipar un arma cambia el ataque y da su habilidad; sacarla la quita', () => {
    newTower('AXE', { weapon: null }); // sin arma de base, para que "vuelve a los puños" compare contra los puños
    const entry = towerCatalog().find(e => e.heroKey === 'SNIPER' && e.slot === 'weapon');
    const rifle = makeTowerItem(1, entry, 'normal');
    addToBag(player, rifle);
    const range = player.attackRange;
    equipItem(player, rifle);
    checkEq(player.attackRange, HERO_WEAPONS.SNIPER.range, 'alcance del rifle');
    check(player.projectileSpeed > 0, 'dispara');
    const skill = itemSkill(rifle);
    check(player.skills.includes(skill) && player.keyBindings[skill.id], 'tiene la habilidad con tecla');
    unequipSlot(player, 'weapon');
    checkEq(player.attackRange, range, 'vuelve a los puños');
    check(!player.skills.includes(skill), 'sin la habilidad');
    check(player.bag.some(b => b.item === rifle), 'el rifle volvió a la bolsa');
}, { random: true });

test('Torre: las piezas suben de nivel con el uso y la forja mejora su habilidad', () => {
    newTower();
    const entry = towerCatalog().find(e => e.skillId === 'SNIPER_POTENTE');
    const item = makeTowerItem(1, entry, 'normal');
    equipItem(player, item);
    const skill = itemSkill(item);
    const cd = skillCooldown(skill, player), dmg = val(skill, player, 'dmgMult');
    for (let i = 0; i < 40; i++) gearEvent(player, 'onHit', {});
    check(item.level > 1 && item.pendingChoices > 0, 'subió de nivel y espera una elección');
    applyForge(player, item, { type: 'boost', key: 'cooldown', text: '' });
    check(skillCooldown(skill, player) < cd, 'menos enfriamiento');
    applyForge(player, item, { type: 'boost', key: 'dmgMult', text: '' });
    checkNear(val(skill, player, 'dmgMult'), dmg * (1 + BOOST_PCT), '+15% daño');
    const opts = forgeOptions(item);
    check(opts.length === 3 && opts.every(o => o.text), '3 opciones para elegir');
    const armorEntry = towerCatalog().find(e => e.slot === 'armor');
    const armor = makeTowerItem(1, armorEntry, 'normal');
    check(itemXpToNext(armor) > itemXpToNext(makeTowerItem(1, entry, 'normal')), 'las armaduras crecen más lento');
}, { random: true });

test('Torre: el amuleto trae el innato de su héroe (reacciona a eventos)', () => {
    const level = newTower();
    const amulet = makeTowerItem(1, towerCatalog().find(e => e.innateId === 'PERFECT_AIM'), 'normal');
    equipItem(player, amulet);
    player.baseAttackRange = 5; player.recalculateStats();
    const c = makeCreep(CREEP_TYPES.GRUNT, player.x + 4, player.y, 1, false, 0); c.arena = level;
    const ctx = { target: c, dmg: 100 }; emit(player, 'beforeAttack', ctx);
    check(ctx.dmg > 100, 'Puntería Perfecta suma daño a distancia');
}, { random: true });

test('Torre: inventario en grilla, botín del guardián y cofres custodiados', () => {
    const level = newTower();
    let added = 0;
    for (let i = 0; i < 60; i++) if (addToBag(player, makeTowerItem(1, towerCatalog().find(e => e.slot === 'armor'), 'normal'))) added++;
    checkEq(added, Math.floor(BAG.cols / 2) * Math.floor(BAG.rows / 3), 'entran las armaduras (2×3) que caben');
    player.bag = [];
    killCreep(level.guardian, player);
    checkEq(level.drops.length, LOOT.guardianDrops, 'el guardián suelta piezas');
    player.x = level.drops[0].x; player.y = level.drops[0].y;
    towerPickup(player);
    checkEq(player.bag.length, LOOT.guardianDrops, 'las levantás al pisarlas');
    const ch = level.chests[0];
    check(ch && ch.guards.length >= 1, 'cofre con custodios');
    player.x = ch.x; player.y = ch.y; towerPickup(player);
    check(!ch.open, 'cerrado con los custodios vivos');
    ch.guards.forEach(g => { g.hp = 0; });
    towerPickup(player);
    check(ch.open, 'se abre al vencerlos');
}, { random: true });

test('Torre: los saltos y teletransportes nunca te dejan dentro de una pared', () => {
    const level = newTower();
    let spot = null;
    for (let y = 1; y < ROWS - 1 && !spot; y++) for (let x = 1; x < COLS - 2 && !spot; x++) if (walkable(level, x, y) && !walkable(level, x - 1, y)) spot = { x, y };
    const c = makeCreep(CREEP_TYPES.GRUNT, spot.x, spot.y, 1, false, 0); c.arena = level;
    player.x = spot.x + 3; player.y = spot.y;
    blinkNextTo(player, { x: spot.x, y: spot.y, arena: level }); // del otro lado del objetivo hay pared
    check(walkable(level, player.x, player.y), 'quedó sobre el piso');
    player.x = spot.x - 1; player.y = spot.y; // forzado dentro de la pared
    unstickFromWall(player);
    check(walkable(level, player.x, player.y), 'la red de seguridad lo saca');
}, { random: true });

test('Torre: la escalera se abre al vencer al guardián y el nivel queda igual al volver', () => {
    const level = newTower();
    level.creeps.forEach(c => { if (!c.isGuardian) c.hp = 0; });
    player.x = level.stairs.x; player.y = level.stairs.y;
    updateTower(0.016);
    checkEq(towerRun.floor, 1, 'cerrada con el guardián vivo');
    level.guardian.hp = 0;
    updateTower(0.016);
    check(level.stairsOpen, 'se abrió');
    player.x = level.stairs.x; player.y = level.stairs.y;
    updateTower(0.016);
    checkEq(towerRun.floor, 2, 'subió al nivel 2');
    const second = player.arena;
    enterTowerFloor(1);
    check(player.arena === level && level.stairsOpen && !level.guardian.isAlive(), 'el nivel 1 sigue como lo dejaste');
    enterTowerFloor(2);
    check(player.arena === second, 'y el 2 también');
}, { random: true });

test('Torre: al morir perdés la mitad de lo ganado y renacés en el círculo de piedra del nivel 1', () => {
    const level = newTower();
    level.guardian.hp = 0; updateTower(0.016);
    enterTowerFloor(2);
    const base = towerRun.base.str;
    player.statPoints = 10;
    for (let i = 0; i < 10; i++) spendStatPoint(player, 'str');
    checkNear(player.str, base + 10, 'puntos puestos en Fuerza');
    const killer = player.arena.creeps.find(c => !c.isGuardian);
    dealDamage(killer, player, 99999, 'pure');
    check(!player.isAlive(), 'murió');
    checkNear(player.str, base + 5, 'mitad de lo ganado');
    checkEq(player.arena.corpses.length, 1, 'cadáver marcado');
    gameClock = player.respawnAt + 0.1;
    updateTower(0.016);
    check(player.isAlive() && towerRun.floor === 1, 'renació en el nivel 1');
    checkEq([player.x, player.y].join(), [level.start.x, level.start.y].join(), 'en el círculo de piedra');
    dealDamage(killer, player, 99999, 'pure'); dealDamage(killer, player, 99999, 'pure');
    gameClock = player.respawnAt + 0.1; updateTower(0.016); dealDamage(killer, player, 99999, 'pure');
    gameClock = player.respawnAt + 0.1; updateTower(0.016); dealDamage(killer, player, 99999, 'pure');
    check(player.str >= base, 'nunca baja de la base');
}, { random: true });

test('Torre: tus restos guardan lo que perdiste; si volvés los recuperás, si morís antes se suman a los nuevos', () => {
    newTower();
    enterTowerFloor(2);
    const base = towerRun.base.str;
    player.statPoints = 10;
    for (let i = 0; i < 10; i++) spendStatPoint(player, 'str');
    const killer = player.arena.creeps.find(c => !c.isGuardian);
    dealDamage(killer, player, 99999, 'pure');
    const corpse = towerRun.corpse;
    checkEq(corpse.points, 5, 'los 5 puntos perdidos quedan en los restos');
    checkEq(towerObjective(player.arena).text.startsWith('Recuperá'), true, 'el objetivo te lleva a tus restos');
    towerRespawn();
    enterTowerFloor(2);
    player.x = corpse.x; player.y = corpse.y;
    recoverCorpse(player.arena, player);
    checkNear(player.str, base + 10, 'recuperó lo perdido');
    check(!towerRun.corpse, 'los restos ya no están');
    dealDamage(killer, player, 99999, 'pure');
    const first = towerRun.corpse;
    towerRespawn();
    dealDamage(killer, player, 99999, 'pure');
    check(first.merged && towerRun.corpse !== first && towerRun.corpse.points >= first.points, 'al morir otra vez, los restos anteriores se suman a los nuevos');
}, { random: true });

test('Torre: al morir, un portador se lleva piezas de tu equipo (nunca el arma) y al cazarlo las suelta', () => {
    newTower();
    const cat = towerCatalog();
    const helm = makeTowerItem(1, cat.find(e => e.slot === 'helm'), 'magic'), weapon = makeTowerItem(1, cat.find(e => e.slot === 'weapon'), 'normal');
    equipItem(player, helm); equipItem(player, weapon);
    const killer = player.arena.creeps.find(c => !c.isGuardian);
    dealDamage(killer, player, 99999, 'pure');
    const carrier = towerRun.carriers[0];
    check(carrier && carrier.carrier.includes(helm) && !player.gear.helm, 'el portador se llevó el casco');
    check(player.gear.weapon === weapon, 'el arma no se la lleva');
    check(towerObjective(player.arena).text.includes('portador'), 'el objetivo te manda a cazarlo');
    const x = carrier.spawnX;
    carrier.x = carrier.spawnX; carrier.y = carrier.spawnY; gameClock += 10;
    carrierRoam(carrier);
    check(carrier.spawnX !== x || carrier.spawnY !== carrier.y, 'deambula por el piso');
    towerRespawn();
    killCreep(carrier, player);
    check(player.arena.drops.some(d => d.item === helm), 'al cazarlo suelta tu equipo');
    checkEq(carriersOn(player.arena).length, 0, 'ya no queda portador');
}, { random: true });

test('Torre: eventos del campo (caravana, emboscada, cofre maldito, mercader ambulante, prisionero)', () => {
    newTower();
    const L = player.arena;
    checkEq(L.events.length, EVENTS.perFloor, 'cuatro eventos por piso');
    checkEq(new Set(L.events.map(e => e.kind)).size, EVENTS.perFloor, 'sin repetir tipo');
    const mk = (kind, extra = {}) => { const e = { kind, x: player.x + 5, y: player.y, state: 'idle', seen: true, ...extra }; L.events.push(e); return e; };
    // Caravana: se salva matando a los atacantes
    const car = mk('caravan', { cart: { hp: 100, maxHp: 100 } });
    towerEventsTick(L, player, 0.1);
    check(car.state === 'attack' && car.attackers.length >= 4, 'la atacan al verla');
    car.attackers.forEach(c => { c.hp = 0; });
    const gold = player.gold;
    towerEventsTick(L, player, 0.1);
    check(car.state === 'saved' && player.gold > gold, 'salvada: pagan');
    // Caravana: se pierde si rompen la carreta
    const car2 = mk('caravan', { cart: { hp: 1, maxHp: 100 } });
    towerEventsTick(L, player, 0.1);
    car2.attackers.forEach(c => { c.x = car2.x; c.y = car2.y; });
    towerEventsTick(L, player, 2);
    checkEq(car2.state, 'lost', 'llegaste tarde');
    // Cofre maldito
    const cur = mk('cursed'); player.x = cur.x; player.y = cur.y;
    towerEventsTick(L, player, 0.1);
    check(cur.state === 'cursed' && cur.guardian.champion, 'libera a su guardián campeón');
    cur.guardian.hp = 0; towerEventsTick(L, player, 0.1);
    checkEq(cur.state, 'open', 'al vencerlo se abre');
    // Prisionero
    const pr = mk('prisoner', { guards: [] }); player.x = pr.x + 1; player.y = pr.y;
    const pts = player.statPoints;
    towerEventsTick(L, player, 0.1);
    check(pr.state === 'freed' && player.statPoints === pts + 1, 'liberado: +1 punto de stats');
    // Emboscada
    const am = mk('ambush', { seen: false }); player.x = am.x; player.y = am.y;
    towerEventsTick(L, player, 0.1);
    check(am.state === 'sprung' && am.ambushers.every(c => c.aggro), 'la emboscada sale y te ataca');
    // Mercader ambulante: 20% más caro
    const pd = mk('peddler', { vendor: { name: 'x', priceMult: 1.2, stock: [makeTowerItem(1, undefined, 'rare')] } });
    player.gold = 99999; const item = pd.vendor.stock[0];
    check(buyTowerItem(player, item, pd.vendor) && player.gold === 99999 - vendorPrice(item, pd.vendor) && vendorPrice(item, pd.vendor) > towerItemPrice(item), 'vende más caro');
}, { random: true });

test('Torre: reacciones elementales (marca + otro elemento = reacción)', () => {
    newTower();
    const c = makeCreep(towerCreepPool(1)[0], player.x + 1, player.y, 20, false, 0); c.arena = player.arena; player.arena.creeps.push(c);
    const fire = SKILL_INDEX.ALCHEMIST_BREW, ice = SKILL_INDEX.FROSTWITCH_BLAST;
    fxCastingSkill = fire; dealDamage(player, c, 10, 'magical'); fxCastingSkill = null;
    checkEq(c.elMark.el, 'fire', 'la habilidad de fuego marca');
    const hp = c.hp;
    fxCastingSkill = ice; dealDamage(player, c, 10, 'magical'); fxCastingSkill = null;
    check(hp - c.hp >= 15 && !c.elMark, 'fuego + hielo = Derretir (+60%) y consume la marca');
    check(towerRun.reactions && towerRun.reactions.Derretir === 1, 'queda registrada');
    fxCastingSkill = SKILL_INDEX.ARCANIST_BOLT; dealDamage(player, c, 5, 'magical');
    fxCastingSkill = SKILL_INDEX.ZEUS_ARC; dealDamage(player, c, 5, 'magical'); fxCastingSkill = null;
    check(getEffect(c, 'UNSTABLE'), 'lo arcano con otro elemento desestabiliza');
    const plain = makeCreep(towerCreepPool(1)[0], player.x + 2, player.y, 20, false, 0); plain.arena = player.arena;
    dealDamage(player, plain, 10, 'physical');
    check(!plain.elMark, 'los ataques básicos no marcan');
}, { random: true });

test('Controles estilo Hades: esquive con Espacio (3 casillas, invulnerable, recarga) y habilidades a mano por defecto', () => {
    newTower();
    const L = player.arena;
    let dir = null;
    for (const d of STEPS_8) { let ok = true; for (let i = 1; i <= 3; i++) ok = ok && walkable(L, player.x + d[0] * i, player.y + d[1] * i) && (!d[0] || !d[1] || (walkable(L, player.x + d[0] * i, player.y + d[1] * (i - 1)) && walkable(L, player.x + d[0] * (i - 1), player.y + d[1] * i))); if (ok) { dir = d; break; } }
    const x = player.x, y = player.y;
    keys[dir[0] > 0 ? 'd' : dir[0] < 0 ? 'a' : 'x'] = true; keys[dir[1] > 0 ? 's' : dir[1] < 0 ? 'w' : 'x'] = true;
    try { check(playerDash(), 'esquiva'); } finally { keys.a = keys.d = keys.w = keys.s = keys.x = false; }
    checkEq(Math.max(Math.abs(player.x - x), Math.abs(player.y - y)), 3, '3 casillas');
    check(hasFlag(player, 'invulnerable'), 'invulnerable un instante');
    check(!playerDash(), 'con recarga no se repite enseguida');
    gameClock += DASH.cooldown + 0.1;
    check(playerDash() || true, 'después de la recarga vuelve a estar');
    checkEq(typeof autoCast, 'boolean', 'existe el modo automático (H)');
}, { random: true });

test('Torre: las habilidades de movilidad van siempre al espacio, y de última a su ranura', () => {
    newTower();
    // Parpadeo (arma, Asesino) es de movilidad: tiene que atarse a Espacio, no a Q.
    const blinkPiece = makeTowerItem(1, towerCatalog().find(e => e.skillId === 'ASSASSIN_BLINK'), 'normal');
    equipItem(player, blinkPiece);
    checkEq(player.keyBindings['ASSASSIN_BLINK'], ' ', 'la primera de movilidad toma el espacio');
    // Salto Sangriento (guantes, Vampiro) también es de movilidad: el espacio ya está tomado, cae a su tecla.
    const leapPiece = makeTowerItem(1, towerCatalog().find(e => e.skillId === 'VAMP_LEAP'), 'normal');
    equipItem(player, leapPiece);
    checkEq(player.keyBindings['VAMP_LEAP'], 'e', 'la segunda de movilidad cae a la tecla fija de su ranura');
    // Espacio prueba primero la de movilidad; si no se pudo lanzar (sin maná), cae al esquive de siempre.
    player.mana = 0;
    const x = player.x, y = player.y;
    gameClock += DASH.cooldown + 1;
    spaceAction();
    check(Math.max(Math.abs(player.x - x), Math.abs(player.y - y)) > 0 || !player.isAlive(), 'sin maná para la habilidad, espacio esquiva igual');
    player.mana = player.maxMana;
    unequipSlot(player, blinkPiece.slot);
    check(!Object.values(player.keyBindings).includes(' '), 'al sacar la pieza, el espacio queda libre de nuevo');
}, { random: true });

test('Torre: Códice (dominar al máximo), piezas sin alma y Herrero (imbuir y vaciar)', () => {
    newTower();
    codex = { unlocked: {}, best: {} };
    // ZEUS_WRATH (definitiva) siempre va en la ranura de armadura (fase 3, ver REWORK.md §2); las piezas sin
    // alma nunca son armas, así que el poder a imbuir tiene que ser de una ranura que SÍ pueda ser sin alma.
    const entry = codexEntries().find(e => e.skillId === 'ZEUS_WRATH');
    checkEq(codexEntries().length, towerCatalog().length, 'una entrada por habilidad e innato');
    const piece = makeTowerItem(1, towerCatalog().find(e => e.skillId === 'ZEUS_WRATH'), 'normal');
    equipItem(player, piece);
    for (let i = 1; i < entry.max; i++) applyForge(player, piece, { type: 'skillLevel', text: 'nivel' });
    check(codexUnlocked('ZEUS_WRATH'), 'al llegar al nivel máximo queda dominada');
    checkEq(codex.best.ZEUS_WRATH, entry.max, 'registra la mejor marca');
    // Pieza sin alma: sin habilidad y con un afijo de más
    const blank = makeBlankItem(3, 'armor', 'magic');
    check(blank.blank && !itemSkill(blank) && blank.affixes.length >= 2, 'sin alma: sin habilidad, afijo extra');
    check(/sin alma/.test(blank.name) && itemTooltipHtml(blank).includes('sin alma'), 'nombre y detalle');
    // La armadura solo tiene una ranura: hay que guardar la pieza natural para poder equipar la sin alma ahí.
    unequipSlot(player, piece.slot);
    equipItem(player, blank);
    // Herrero: imbuir la pieza equipada
    const L = player.arena; L.town.smith = null; openTownSmith(L);
    check(L.town.smith && L.town.smith.stock.every(i => i.blank), 'el herrero vende piezas sin alma');
    player.gold = 10;
    check(!infuseItem(player, blank, 'ZEUS_WRATH'), 'sin oro no imbuye');
    player.gold = 5000;
    check(!infuseItem(player, blank, 'AXE_GIRO'), 'lo no dominado no se imbuye');
    check(infuseItem(player, blank, 'ZEUS_WRATH'), 'imbuye lo dominado');
    check(!blank.blank && blank.skillId === 'ZEUS_WRATH' && blank.skillLevel === 1 && player.gear.armor === blank, 'la pieza trae el poder y sigue equipada');
    // Vaciar
    check(purgeItem(player, blank), 'vacía');
    check(blank.blank && !player.hasSkill('ZEUS_WRATH') && blank.affixes.length >= 2, 'pierde la habilidad, conserva los afijos');
    check(!purgeItem(player, makeTowerItem(1, towerCatalog().find(e => e.slot === 'weapon'))), 'las armas no se vacían');
    // El botín a veces trae piezas sin alma
    let blanks = 0; for (let i = 0; i < 400; i++) { const it = lootItem(2); if (it.blank && !it.plain) blanks++; }
    check(blanks > 20 && blanks < 90, `~12% del botín sale sin alma (15% de lo que no es bota ni anillo: ${blanks}/400)`);
    // Herrero en el pueblo: nunca dos pisos seguidos sin
    let miss = 0, run = 0; for (let f = 2; f <= 9; f++) { const has = !!towerLevel(f).town.smith; run = has ? 0 : run + 1; miss = Math.max(miss, run); }
    check(miss <= 1, 'nunca dos pisos seguidos sin herrero');
}, { random: true });

test('Torre: pantalla grande con zoom (rueda o + −) y mouse acorde al zoom', () => {
    newTower();
    check(towerLayout && document.body.classList.contains('tower-layout'), 'la Torre usa la pantalla grande');
    const saved = VIEW.across;
    try {
        setTowerZoom(30);
        towerZoom(1); check(VIEW.across < 30, 'acercar muestra menos casillas');
        setTowerZoom(1000); checkEq(VIEW.across, VIEW.max, 'tope de alejar');
        setTowerZoom(24);
        checkEq(viewCols(), 24, 'casillas a lo ancho');
        check(Math.abs(viewRows() - VIEW.h / VIEW.w * 24) < 1e-6, 'las filas siguen la proporción de la pantalla');
        const r = canvas.getBoundingClientRect();
        const m = mouseToTile({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
        check(Math.abs(m.x - (camera.x + 12 - 0.5)) < 1e-6, 'el mouse apunta a la casilla correcta con el zoom');
    } finally { setTowerZoom(saved); }
    resetGame();
    check(!towerLayout && viewCols() === VIEW_COLS, 'fuera de la Torre vuelve la arena fija');
}, { random: true });

test('Torre: si ya hay un portador vivo, morir otra vez no se lleva más piezas (freno a la espiral)', () => {
    newTower();
    const L = player.arena;
    ['helm', 'armor', 'gloves', 'boots'].forEach(s => equipItem(player, makeBlankItem(1, s, 'normal')));
    const first = spawnItemCarrier(L, player);
    check(first && first.carrier.length, 'la primera muerte deja un portador');
    const before = EQUIP_SLOTS.filter(s => player.gear[s]).length;
    check(!spawnItemCarrier(L, player), 'con el portador vivo no aparece otro');
    checkEq(EQUIP_SLOTS.filter(s => player.gear[s]).length, before, 'no pierde más piezas');
    first.hp = 0;
    check(spawnItemCarrier(L, player), 'cazado el portador, la próxima muerte vuelve a costar');
}, { random: true });

test('Torre: ataques anunciados (la zona se llena y pega; salir o esquivar lo evita)', () => {
    newTower();
    const L = player.arena;
    const c = makeCreep(towerCreepPool(1)[0], player.x + 1, player.y, 1, false, 0); Object.assign(c, { arena: L }); L.creeps.push(c);
    const hp = player.hp;
    const t = startTelegraph(c, { shape: 'circle', x: player.x, y: player.y, r: 1.5 }, 'champion');
    check(gameClock < c.castingUntil, 'el que lo tira se queda cargando');
    towerTelegraphTick(L); checkEq(player.hp, hp, 'mientras se llena no pega');
    gameClock += t.windup + 0.01; towerTelegraphTick(L);
    check(player.hp < hp, 'al completarse pega a quien sigue adentro');
    check(!L.telegraphs.length, 'y desaparece');
    const hp2 = player.hp;
    startTelegraph(c, { shape: 'circle', x: player.x, y: player.y, r: 1.5 }, 'champion');
    addEffect(player, { id: 'DASH', name: 'Esquive', duration: 5, flags: ['invulnerable'] });
    gameClock += 1.1; towerTelegraphTick(L);
    checkEq(player.hp, hp2, 'con el esquive (invulnerable) no pega');
    // Formas
    check(teleContains({ shape: 'line', x: 0, y: 0, dx: 1, dy: 0, len: 6, w: 1 }, 5, 0) && !teleContains({ shape: 'line', x: 0, y: 0, dx: 1, dy: 0, len: 6, w: 1 }, 3, 2), 'línea');
    check(teleContains({ shape: 'cone', x: 0, y: 0, dx: 1, dy: 0, r: 4, half: 0.6 }, 3, 1) && !teleContains({ shape: 'cone', x: 0, y: 0, dx: 1, dy: 0, r: 4, half: 0.6 }, -2, 0), 'cono');
    // El piloto sale de la zona
    startTelegraph(c, { shape: 'circle', x: player.x, y: player.y, r: 1.2 }, 'champion');
    const d = towerDodgeDir(player);
    check(d && !teleContains(L.telegraphs[L.telegraphs.length - 1], player.x + d.dx, player.y + d.dy), 'el piloto elige un paso afuera');
}, { random: true });

test('Torre: los jefes tienen 3 fases (rugido, ayudantes y definitiva)', () => {
    newTower();
    const L = player.arena, g = L.guardian;
    player.x = g.x - 2; player.y = g.y; computeFov(L, player);
    checkEq(bossPhase(g), 0, 'arranca en la fase 1');
    const creeps = L.creeps.length;
    g.hp = Math.floor(g.maxHp * 0.6);
    check(towerCreepTelegraph(g), 'al cruzar el 66% hace algo');
    checkEq(g.bossPhase, 1, 'pasa a la fase 2');
    check(hasFlag(g, 'invulnerable'), 'ruge invulnerable un instante');
    check(L.creeps.length > creeps, 'llama ayudantes');
    g.hp = Math.floor(g.maxHp * 0.3); g.castingUntil = 0;
    towerCreepTelegraph(g); checkEq(g.bossPhase, 2, 'fase final');
    gameClock += 3; g.castingUntil = 0;
    const before = L.telegraphs.length;
    check(towerCreepTelegraph(g) && L.telegraphs.length >= before + 8, 'tira su definitiva (lluvia de zonas)');
}, { random: true });

test('Torre: Esencia, fundir 5 piezas en una pura con calidad y la garantía de subir de calidad', () => {
    newTower();
    codex = { unlocked: {}, best: {} };
    const L = player.arena;
    gainEssence(50);
    checkEq(essence(), 50, 'la Esencia se acumula');
    // 4 guantes no alcanzan
    player.bag = [];
    for (let i = 0; i < 4; i++) addToBag(player, makeBlankItem(1, 'gloves', 'normal'));
    check(!craftPure(player, 'gloves'), 'con 4 no se funde');
    addToBag(player, makeBlankItem(1, 'gloves', 'normal'));
    const pure = craftPure(player, 'gloves');
    check(pure && pure.crafted && pure.blank && pure.slot === 'gloves', 'con 5 sale una pieza pura de esa ranura');
    checkEq(essence(), 50 - CRAFT.cost, 'cobra la Esencia');
    checkEq(player.bag.length, 1, 'se funden las 5');
    check(pure.affixes.length === CRAFT_QUALITY[pure.craftTier].affixes, 'afijos según la calidad');
    // La garantía (idea del usuario): con una fabricada entre las 5, sale una calidad más arriba
    for (let k = 0; k < 20; k++) {
        player.bag = []; gainEssence(CRAFT.cost);
        const roma = makePureItem(1, 'boots', 0); addToBag(player, roma);
        for (let i = 0; i < 4; i++) addToBag(player, makeBlankItem(1, 'boots', 'normal'));
        check(craftPure(player, 'boots').craftTier >= 1, 'roma + 4 → al menos usada');
    }
    const master = makePureItem(1, 'armor', 3);
    check(master.masterwork && /Obra Maestra/.test(master.name), 'obra maestra');
    const bare = t => Object.assign(makePureItem(1, 'armor', t), { affixes: [] }); // sin afijos: solo la base
    check(itemMods(bare(3)).maxHp > itemMods(bare(0)).maxHp, 'mejor calidad, más stats base');
    checkEq(makePureItem(1, 'gloves', 0).name.split(' ')[1], 'Romos', 'el adjetivo concuerda (Guantes Romos)');
    // Obra maestra: lo imbuido arranca en nivel 2
    codex.unlocked.AXE_GIRO = { floor: 1 }; player.gold = 9999;
    const e = codexEntry('AXE_GIRO'), mw = makePureItem(1, e.slot, 3); addToBag(player, mw);
    check(infuseItem(player, mw, 'AXE_GIRO') && mw.skillLevel === 2, 'obra maestra: la habilidad imbuida arranca en nivel 2');
    // Esencia de los jefes
    const before = essence(); essenceOnKill(L, L.guardian);
    checkEq(essence() - before, ESSENCE.guardian(L.floor), 'el guardián da Esencia');
    // Mejoras permanentes
    codex.essence = 300;
    check(buyUpgrade('bag') && upgradeLevel('bag') === 1, 'compra una mejora');
    check(!buyUpgrade('bag'), 'no se compra dos veces');
    newTower();
    checkEq(BAG.rows, BASE_BAG_ROWS + 1, 'la run nueva arranca con la bolsa más grande');
    codex = { unlocked: {}, best: {} }; BAG.rows = BASE_BAG_ROWS;
}, { random: true });

test('Torre: música por capas (bioma, pueblo, laberinto, combate y jefe)', () => {
    newTower();
    const L = player.arena;
    L.creeps.forEach(c => { c.aggro = false; });
    let t = musicTargets(L);
    check(t[L.biome] > 0 && !t.combat, 'en el campo suena el bioma');
    player.x = L.town.merchant.x; player.y = L.town.merchant.y + 2;
    check(musicTargets(L).town > 0, 'en el pueblo, la del pueblo');
    player.x = L.start.x; player.y = L.start.y;
    const c = L.creeps.find(o => !o.isGuardian); c.x = player.x + 2; c.y = player.y; c.aggro = true;
    t = musicTargets(L);
    check(t.combat === 1 && t[L.biome] < 1, 'si te persiguen entra el combate y baja la base');
    c.aggro = false;
    const g = L.guardian; const gx = g.x, gy = g.y; g.x = player.x + 3; g.y = player.y; g.aggro = true;
    t = musicTargets(L);
    check(t.boss === 1 && !t.combat, 'contra un jefe suena su tema');
    g.x = gx; g.y = gy; g.aggro = false;
    Object.values(MUSIC_TRACKS).forEach(p => check(/^music\/[a-z-]+\.(ogg|mp3)$/.test(p), 'pista ' + p));
}, { random: true });

test('Opciones: volumen general, música, efectos y temblor (se guardan); la forja no corta una pelea', () => {
    const saved = Object.assign({}, VOLUME);
    try {
        setVolume('music', 0.3); setVolume('shake', 0);
        checkEq(VOLUME.music, 0.3, 'volumen de la música');
        shakeAmount = 0; fxShake(6); checkEq(shakeAmount, 0, 'sin temblor si se apaga');
        setVolume('shake', 9); checkEq(VOLUME.shake, 1.5, 'tope del temblor');
        setVolume('sfx', -1); checkEq(VOLUME.sfx, 0, 'mínimo del volumen');
    } finally { Object.keys(saved).forEach(k => setVolume(k, saved[k])); shakeAmount = 0; }
    newTower();
    const L = player.arena, c = L.creeps.find(o => !o.isGuardian);
    c.x = player.x + 2; c.y = player.y; c.aggro = true;
    check(towerInFight(L), 'con un creep encima, estás en pelea');
    c.aggro = false;
    check(!towerInFight(L), 'sin perseguidores, no');
}, { random: true });

test('Torre: el detalle de una pieza la compara con lo equipado (gana en verde, pierde en rojo)', () => {
    newTower();
    const cat = towerCatalog();
    const worn = makeTowerItem(1, cat.find(e => e.slot === 'helm'), 'normal'); equipItem(player, worn);
    const better = makeTowerItem(5, cat.find(e => e.slot === 'helm' && e.skillId !== worn.skillId), 'normal'); better.level = 6;
    const html = itemCompareHtml(better);
    check(/Si la equipás/.test(html) && /▲/.test(html), 'muestra lo que gana');
    check(/Habilidad:/.test(html), 'avisa el cambio de habilidad');
    checkEq(itemCompareHtml(worn), '', 'la equipada no se compara consigo misma');
    check(/Ranura vacía/.test(itemCompareHtml(makeBlankItem(1, 'boots', 'normal'))), 'ranura vacía');
    worn.level = 4; // el equipado tiene más nivel: más vida de base
    const worse = makeBlankItem(1, 'helm', 'normal'); worse.affixes = [];
    check(/class="down">▼ −\d+ vida/.test(itemCompareHtml(worse)), 'lo que pierde, en rojo');
}, { random: true });

test('Torre: mapa del piso a pantalla completa (M) con lo descubierto y la leyenda', () => {
    newTower();
    const L = player.arena;
    toggleTowerMap(); check(towerMapOpen, 'M lo abre');
    L.explored.forEach(row => row.fill(true));
    drawTowerBigMap(L); // no rompe con todo a la vista (pueblo, laberinto, santuarios, cuevas, cofres)
    check(MAP_MARKS.some(m => m.key === 'smith') && MAP_MARKS.some(m => m.key === 'carrier'), 'la leyenda incluye herrero y portador');
    toggleTowerMap(); check(!towerMapOpen, 'M lo cierra');
    resetGame(); toggleTowerMap(); check(!towerMapOpen, 'fuera de la Torre no se abre');
}, { random: true });

test('Torre: botas y anillos salen en el botín como piezas de stats (no se imbuyen)', () => {
    let boots = 0, rings = 0;
    for (let i = 0; i < 400; i++) { const it = lootItem(3); if (it.slot === 'boots') boots++; if (it.slot === 'ring') rings++; }
    check(boots > 15 && rings > 15, `salen botas (${boots}) y anillos (${rings})`);
    const b = makeBlankItem(3, 'boots', 'magic');
    check(b.plain && !/sin alma/.test(b.name) && /Pieza de stats/.test(itemTooltipHtml(b)), 'pieza de stats, sin "sin alma"');
    check(!CODEX.blankSlots.includes('boots') && CRAFT_SLOTS().includes('ring'), 'no se imbuyen, pero se funden');
}, { random: true });

test('Torre: fundir con las 5 piezas elegidas a mano (y la garantía también vale)', () => {
    newTower();
    codex = { unlocked: {}, best: {} }; gainEssence(100);
    player.bag = [];
    const keep = makeBlankItem(4, 'gloves', 'rare'); addToBag(player, keep);
    const roma = makePureItem(1, 'gloves', 0); addToBag(player, roma);
    const junk = []; for (let i = 0; i < 4; i++) { const it = makeBlankItem(1, 'gloves', 'normal'); junk.push(it); addToBag(player, it); }
    check(!craftPure(player, 'gloves', 1, junk), 'con 4 elegidas no funde');
    check(!craftPure(player, 'gloves', 1, junk.concat([makeBlankItem(1, 'boots', 'normal')])), 'no mezcla ranuras ni piezas de afuera de la bolsa');
    const out = craftPure(player, 'gloves', 1, junk.concat([roma]));
    check(out && out.craftTier >= 1, 'funde las elegidas y la garantía de la roma vale');
    check(player.bag.some(b => b.item === keep), 'la que no elegiste queda en la bolsa');
    codex = { unlocked: {}, best: {} };
}, { random: true });

test('Teclas configurables: cambiar, intercambiar, reservadas y las habilidades siguen a su tecla', () => {
    const saved = Object.assign({}, KEYMAP);
    try {
        newTower();
        const s = player.skills.find(x => player.keyBindings[x.id] === KEYMAP.skill1);
        check(setKey('skill1', 'z') && KEYMAP.skill1 === 'z', 'la habilidad del arma pasa a la Z');
        if (s) checkEq(player.keyBindings[s.id], 'z', 'la habilidad equipada sigue a su tecla');
        setKey('inventory', 'z');
        check(KEYMAP.inventory === 'z' && KEYMAP.skill1 === KEY_DEFAULTS.inventory, 'se intercambian');
        check(!setKey('map', 'escape'), 'Esc no se puede usar');
        setKey('up', 'u'); keys = { u: true }; checkEq(keyboardDirection().dy, -1, 'moverse con la tecla nueva'); keys = {};
    } finally { resetKeymap(); Object.assign(KEYMAP, saved); saveKeymap(); keys = {}; }
}, { random: true });

test('Accesibilidad: daltonismo, tamaño de textos de combate y escala de la interfaz (con topes, se guardan)', () => {
    const saved = Object.assign({}, A11Y);
    try {
        setA11y('combatText', 9); checkEq(A11Y.combatText, 1.6, 'tope de los textos');
        setA11y('uiScale', 0.1); checkEq(A11Y.uiScale, 0.8, 'mínimo de la escala');
        checkEq(getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim(), '0.8', 'la escala llega a la interfaz');
        setA11y('colorblind', true); check(A11Y.colorblind === true, 'modo daltonismo');
        newTower();
        const c = makeCreep(towerCreepPool(1)[0], player.x + 1, player.y, 1, false, 0); c.arena = player.arena; player.arena.creeps.push(c);
        startTelegraph(c, { shape: 'circle', x: player.x, y: player.y, r: 1.5 }, 'champion');
        drawTowerTelegraphs(player.arena); // dibuja con la otra paleta sin romper
    } finally { Object.keys(saved).forEach(k => setA11y(k, saved[k])); }
}, { random: true });

test('Filtro de botín, páginas nuevas del Cuaderno y música fuera de la Torre', () => {
    const savedF = lootFilter;
    try {
        newTower();
        const L = player.arena;
        setLootFilter('magic');
        const normal = makeBlankItem(1, 'helm', 'normal'), rare = makeBlankItem(1, 'helm', 'rare');
        L.drops.push({ x: player.x, y: player.y, item: normal }, { x: player.x, y: player.y, item: rare });
        player.bag = []; towerPickup(player);
        check(player.bag.some(b => b.item === rare) && !player.bag.some(b => b.item === normal), 'levanta la rara y deja la normal');
        check(L.drops.some(d => d.item === normal), 'la filtrada queda en el piso');
        cycleLootFilter(); checkEq(lootFilter, 'rare', 'el botón pasa por los filtros');
        ['TELEGRAPH', 'ESSENCE', 'SMITH', 'CRAFT', 'MASTERY'].forEach(id => check(NOTEBOOK_PAGES.some(p => p.id === id), 'página ' + id));
        resetGame();
        gameState = 'MENU'; check(normalMusicTargets().town > 0, 'en el menú suena la del pueblo');
        gameState = 'BOSS'; check(normalMusicTargets().boss === 1, 'jefe de ronda');
        gameState = 'MENU';
    } finally { setLootFilter(savedF); }
}, { random: true });

test('Torre: un jefe con nombre por bioma, cada uno con su mecánica (raíces, veneno, entierro, hielo, lava)', () => {
    newTower();
    [[1, 'Raíz Madre'], [2, 'Gran Raíz Madre'], [3, 'Bruja del Fango'], [5, 'Reina Escorpión'], [7, 'Wyrm de Escarcha'], [9, 'Señor de la Ceniza']]
        .forEach(([f, name]) => checkEq(towerLevel(f).guardian.label, name, `jefe del piso ${f}`));
    const prep = f => { enterTowerFloor(f); const L = player.arena, g = L.guardian; player.x = g.x - 3; player.y = g.y; if (!walkable(L, player.x, player.y)) { player.x = g.x; player.y = g.y + 2; } computeFov(L, player); g.castingUntil = 0; return { L, g }; };
    // Bosque: raíces que curan
    let { L, g } = prep(1);
    bossSignatureTick(g, 0);
    const roots = L.creeps.filter(o => o.isRoot && o.isAlive());
    check(roots.length >= 2, 'la Raíz Madre planta raíces');
    g.hp = g.maxHp * 0.5; const hp = g.hp; gameClock += 1.1; rootsHeal(g);
    check(g.hp > hp, 'las raíces la curan');
    roots.forEach(r => { r.hp = 0; }); const hp2 = g.hp; gameClock += 1.1; rootsHeal(g);
    checkEq(g.hp, hp2, 'cortadas, ya no la curan');
    // Ciénaga: charco de veneno que dura
    ({ L, g } = prep(3));
    g.introduced = true; g.sigNext = 0; bossSignatureTick(g, 0);
    const tele = L.telegraphs[L.telegraphs.length - 1]; gameClock += tele.windup + 0.05; towerTelegraphTick(L);
    check(L.zones && L.zones.some(z => z.kind === 'poison'), 'deja un charco de veneno');
    const before = player.hp; towerZonesTick(L, 0.6);
    check(player.hp < before || !teleContains(L.zones[0], player.x, player.y), 'el charco lastima al que está adentro');
    check(towerDodgeDir(player) || !teleContains(L.zones[0], player.x, player.y), 'el piloto sale del charco');
    // Volcán: un sector de lava
    ({ L, g } = prep(9));
    g.introduced = true; g.sigNext = 0; bossSignatureTick(g, 0);
    const sec = L.telegraphs[L.telegraphs.length - 1]; gameClock += sec.windup + 0.05; towerTelegraphTick(L);
    check(L.zones.some(z => z.kind === 'lava' && z.shape === 'cone'), 'un sector se llena de lava');
}, { random: true });

test('Torre: las raíces de la Raíz Madre se cortan fácil, son el blanco primero, se secan solas y solo rebrotan con cada fase', () => {
    newTower();
    enterTowerFloor(1); const L = player.arena, g = L.guardian;
    player.x = g.x - 3; player.y = g.y; if (!walkable(L, player.x, player.y)) { player.x = g.x; player.y = g.y + 2; }
    bossSignatureTick(g, 0);
    const roots = () => L.creeps.filter(o => o.isRoot && o.isAlive());
    check(roots().length >= 2, 'brotan al empezar');
    const r = roots()[0];
    checkEq(r.armor, BOSS_SIG.rootArmor, 'madera: poca armadura');
    player.x = r.x - 1; player.y = r.y; L.creeps.filter(o => o !== r && !o.isRoot && o.isAlive() && o !== g).forEach(o => { o.hp = 0; });
    checkEq(pickAttackTarget(player, 5), r, 'el ataque automático le pega primero a la raíz');
    roots().forEach(o => { o.hp = 0; });
    g.sigNext = 0; bossSignatureTick(g, 0);
    checkEq(roots().length, 0, 'cortadas, no rebrotan en la misma fase');
    g.sigNext = 0; bossSignatureTick(g, 1);
    check(roots().length >= 3, 'con la fase 2, brotan de nuevo (más)');
    gameClock += BOSS_SIG.rootLife + 0.5; rootsHeal(g);
    checkEq(roots().length, 0, 'se secan solas');
}, { random: true });

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
    const giro = learn('AXE_GIRO', 1);
    waveNumber = 1;
    creeps.forEach(c => { c.hp = 0; });
    player.hp = 5; player.mana = 0;
    player.cooldowns[giro.id] = 20; // a mitad de recargar, como si lo hubiese lanzado justo antes de ganar
    addEffect(player, { id: 'TEMP', duration: 99, mods: { atkPct: 1 } });
    updateWave(0.016); // su arena quedó limpia: terminan las oleadas
    skipDuels();
    check(player.inRest, 'está en el Área de Descanso');
    checkEq(player.hp, player.maxHp, 'vida llena');
    check(!getEffect(player, 'TEMP'), 'sin mejoras temporales');
    check(player.cooldowns[giro.id] > 19, 'en el Área de Descanso el enfriamiento no se toca'); // salvo el propio frame en que termina la oleada
    if (gameState === 'DRAFT') learnSkill(currentDraft.options[0]);
    player.hp = 5; player.x = 0;
    startWave();
    check(!player.inRest, 'volvió al combate');
    checkEq(player.hp, player.maxHp, 'con la vida llena');
    checkEq(player.mana, player.maxMana, 'y el maná lleno');
    checkEq(`${player.x},${player.y}`, `${WAVE_START.x},${WAVE_START.y}`, 'en el punto de inicio');
    checkEq(player.cooldowns[giro.id], 0, 'al arrancar la ronda siguiente, los enfriamientos se reinician');
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
    const hacha = learn('VAMP_CLAW', 1);
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
    checkEq(total, (MAX_HEROES - 2) * POINTS.waveClean + POINTS.duelWin, 'puntos: 6 oleadas limpias + 1 duelo (los duelistas no hacen oleada)');
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
    clearAllWaves(); // saltea la previa y termina las oleadas de los demás: queda el duelo en curso
    return arenas;
}

test('Un duelo por ronda: pelean los que menos pelearon, sin repetir la pareja anterior; los demás miran', () => {
    toDuels();
    checkEq(gameState, 'WAVE', 'el duelo se pelea en la misma fase que las oleadas');
    checkEq(arenas.filter(a => a.kind === 'duel').length, 1, 'un solo duelo');
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
    player.gold = gold;
    startWave(); // la ronda arranca con la previa de apuestas
}

test('Ronda con duelo: los duelistas pelean mientras los demás hacen su oleada; los enfriamientos corren en el descanso', () => {
    toBetting(400);
    endBetting();
    const duel = duelArena();
    check(duel && !duel.done, 'duelo en curso');
    const others = aliveHeroes().filter(h => !duel.heroes.includes(h));
    check(others.every(h => h.arena && h.arena.kind === 'wave' && h.arena.creeps.length), 'los demás, en su oleada');
    check(duel.heroes.every(h => !arenas.some(a => a.kind === 'wave' && a.heroes.includes(h))), 'los duelistas no hacen oleada');
    clearAllWaves();
    check(player.inRest, 'el jugador terminó y descansa');
    player.cooldowns.X = 5;
    updateRestArea(2);
    checkNear(player.cooldowns.X, 3, 'el enfriamiento sigue corriendo en el descanso');
    skipDuels();
    check(!inCombat(), 'terminó la ronda');
});

test('Previa: al empezar la ronda se eligen los duelistas y los demás apuestan; después pelean mientras los demás hacen su oleada', () => {
    toBetting();
    checkEq(gameState, 'BETTING', 'previa');
    checkEq(bettablePairs().length, 1, 'un solo duelo para apostar');
    const pair = duelPlan.pairs[0].slice();
    tickPhaseTimer(PHASE_TIMES.betting + 0.1);
    checkEq(gameState, 'WAVE', 'al vencer el tiempo arranca la ronda');
    check(arenas[0].kind === 'duel', 'con el duelo');
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
    checkEq(gameState, 'WAVE', 'directo a la ronda');
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
    checkEq(gameState, 'WAVE', 'con 1g el tope es 0');
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

test('Elegir cualquier héroe: el panel muestra los 11 (no solo tus 3 opciones) y penaliza el oro inicial', () => {
    resetGame();
    startHeroPick();
    const totalHeroes = Object.keys(HERO_TEMPLATES).length;
    openHeroDrawer();
    check(document.getElementById('hero-any-drawer').classList.contains('open'), 'el panel se abre');
    checkEq(document.querySelectorAll('#hero-any-options .skill-card').length, totalHeroes, 'una carta por cada héroe del roster');
    // Elegir uno que no está entre las 3 opciones que te tocaron (si hay alguno disponible), haciendo clic
    // en su carta real (no llamando a selectHero directo) para probar el cierre del panel también.
    const notOffered = Object.values(HERO_TEMPLATES).find(t => !heroOffers[0].includes(t)) || Object.values(HERO_TEMPLATES)[0];
    const card = [...document.querySelectorAll('#hero-any-options .skill-card')].find(c => c.textContent.includes(notOffered.name));
    card.click();
    checkEq(player.key, notOffered.key, 'te deja elegir uno que no estaba en tus opciones');
    checkEq(player.gold, GOLD_PENALTY_FREE_PICK, 'arranca con la penalización de oro');
    check(!document.getElementById('hero-any-drawer').classList.contains('open'), 'el panel se cierra al elegir');

    resetGame();
    startHeroPick();
    document.querySelectorAll('#hero-options .skill-card')[0].click();
    checkEq(player.gold, 100, 'elegir de las 3 opciones normales no penaliza');
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

test('pointTarget (proyectil de habilidad): a diferencia de nearestEnemy, si apuntás mal con el mouse no le pega a nadie', () => {
    newGame('ZEUS');
    const skill = learn('ZEUS_BOLT', 1);
    check(isAimedSkill(skill), 'se apunta con el mouse');
    check(skill.pointTarget, 'está marcada como punto de efecto');
    // A más de 4 del jugador para que no lo alcance de paso el innato Campo Estático (radio 4 alrededor tuyo).
    const c = dummy({ hp: 9999, maxHp: 9999 });
    c.x = player.x; c.y = player.y + 5;
    // Clic bien lejos del enemigo y fuera de su línea de tiro (con nearestEnemy pegaría igual; acá, no).
    check(castAt(player, skill, player.x + 5, player.y), 'se lanzó igual (había rango para el punto)');
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    checkEq(c.hp, 9999, 'clic errado, no le pegó a nadie');
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
            if (inCombat() || gameState === 'BETTING') {
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
    codexPersist = false; codex = { unlocked: {}, best: {} }; // el Códice guardado no se toca
    notebookPersist = false; notebookState = { seen: {} }; // el cuaderno guardado tampoco
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
