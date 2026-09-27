// Motor de los creeps: armar la oleada según su tema, hacerlos aparecer, moverlos y atacar.
// Los tipos y temas están en data/creeps.js.

let nextWave = null; // oleada ya sorteada para mostrar el aviso en la tienda

// Sortea el tema de la oleada de una ronda: las rondas 1-4 usan los temas de su nivel; después se repiten los del
// nivel 4 (cada vez más fuertes); cada BOSS_ROUND_EVERY rondas toca la oleada del jefe.
function rollWave(number) {
    const tier = number % BOSS_ROUND_EVERY === 0 ? WAVE_THEMES.length - 1 : Math.min(number, WAVE_THEMES.length - 1) - 1;
    const theme = pickRandom(WAVE_THEMES[tier]);
    return { name: theme.name, groups: theme.groups, boss: theme.boss };
}

// Cantidad real de unidades de cada grupo (los grupos de Enjambre traen 4 por unidad pedida).
function groupUnits(g) { return g.count * (CREEP_TYPES[g.type].groupSize || 1); }

// Llena una arena con los creeps de la oleada. Se hacen más fuertes en cada ronda (y más en las de jefe).
function spawnWave(arena, wave) {
    arena.creeps = []; arena.boss = null; arena.projectiles = [];
    const statMult = (1 + (waveNumber - 1) * 0.10) * (isBossWave ? 1.3 : 1);
    const add = c => { c.arena = arena; arena.creeps.push(c); return c; };
    // Aparecen en casillas distintas de las columnas 13 a 18; el jefe, en la última columna
    const cells = shuffle(Array.from({ length: 6 * ROWS }, (_, i) => [13 + Math.floor(i / ROWS), i % ROWS]));
    let next = 0;
    wave.groups.forEach(g => {
        for (let i = 0; i < groupUnits(g); i++) {
            const [x, y] = cells[next++];
            add(makeCreep(CREEP_TYPES[g.type], x, y, statMult, false, 0));
        }
    });
    arena.boss = add(makeCreep(CREEP_TYPES[wave.boss], COLS - 1, Math.floor(Math.random() * ROWS), statMult, true, isBossWave ? 0.5 : 0.35));
}

// El héroe al que ataca un creep (el de su arena).
function creepTarget(c) { return c.arena.heroes[0]; }

// --- MOVIMIENTO ---
// Mueve un creep una casilla hacia (tx, ty) respetando su velocidad (y ralentizaciones).
function stepCreepToward(c, tx, ty, dt) {
    if (c.x === tx && c.y === ty) return;
    c.moveTimer += dt * 1000;
    if (c.moveTimer < c.moveInterval / effMoveMult(c)) return;
    c.moveTimer = 0;
    const dx = tx - c.x, dy = ty - c.y;
    if (Math.abs(dx) >= Math.abs(dy)) c.x += Math.sign(dx); else c.y += Math.sign(dy);
}

// Se aleja de `from` (ej: el Ladrón huyendo), sin salir del mapa.
function stepCreepAway(c, from, dt) {
    const tx = Math.max(0, Math.min(COLS - 1, c.x + (Math.sign(c.x - from.x) || 1) * 3));
    const ty = Math.max(0, Math.min(ROWS - 1, c.y + Math.sign(c.y - from.y) * 3));
    stepCreepToward(c, tx, ty, dt);
}

// --- IA DE UN CREEP ---
// Aura del jefe, comportamiento propio del tipo (update), acercarse al jugador y atacarlo; si el jugador
// está muerto, vuelve a su lugar. Pasado el tiempo de la oleada, pegan más fuerte y más rápido (enrageMult).
// Las reacciones al daño (Contraataque, Furia, Forma Inmortal) las manejan los hooks onDamaged del héroe.
function updateCreep(c, dt) {
    if (!c.isAlive()) return;
    // Si el héroe murió (o quedó eliminado) en este mismo frame, el resto de los creeps no sigue pegando
    if (gameState !== 'WAVE' || c.arena.done) return;
    if (hasFlag(c, 'stun')) return;
    const target = creepTarget(c);
    if (!target.isAlive()) { stepCreepToward(c, c.spawnX, c.spawnY, dt); return; } // perdió el agro
    if (c.type.update && c.type.update(c, dt)) return;

    const enrage = enrageMult(c.arena);
    let effAtk = c.atk * enrage;
    const boss = c.arena.boss;
    if (!c.isBoss && boss && boss.isAlive()) {
        const dBoss = Math.hypot(c.x - boss.x, c.y - boss.y);
        if (dBoss <= boss.auraRadius) effAtk *= 1 + boss.auraAtkBonus;
    }

    const dTarget = Math.hypot(c.x - target.x, c.y - target.y);
    if (dTarget > c.range) { stepCreepToward(c, target.x, target.y, dt); return; }

    c.attackTimer += dt;
    if (c.attackTimer < 1 / (effAtkSpeed(c) * enrage)) return;
    c.attackTimer = 0;
    // dealDamage resuelve la muerte del héroe (revivir, Condenado o eliminación) a través de onHeroDeath
    const result = dealDamage(c, target, Math.round(effAtk), c.attackType, { isAttack: true });
    if (result.evaded) log(`💨 Esquivaste el ataque de ${c.label}.`);
    if (c.type.onAttack) c.type.onAttack(c, target, result);
}

// --- AVISO DE LA PRÓXIMA OLEADA ---
// Tipos distintos de la oleada (con cantidades), para el aviso en la tienda y para que la IA se arme.
function waveSummary(wave) {
    const counts = {};
    wave.groups.forEach(g => { counts[g.type] = (counts[g.type] || 0) + groupUnits(g); });
    return Object.entries(counts).map(([type, count]) => ({ type: CREEP_TYPES[type], count }));
}
