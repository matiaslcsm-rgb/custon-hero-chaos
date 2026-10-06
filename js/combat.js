// Sistema de combate: creación de creeps, daño, críticos, robo de vida, proyectiles, escalado y bajas.
// Todas las funciones reciben explícitamente quién ataca (attacker/source/caster) para que el mismo
// código sirva para el jugador y, en el futuro, para héroes rivales.

// --- CREEPS ---
function makeCreep(t, x, y, statMult, isBossUnit, bossAuraBonus) {
    const hpMult = isBossUnit ? 4 : 1;
    const atkMult = isBossUnit ? 1.6 : 1;
    const oneHit = !!t.oneHit && !isBossUnit;
    const hp = oneHit ? 1 : Math.round(t.hp * statMult * hpMult);
    const atk = Math.round(t.atk * statMult * atkMult);
    return {
        key: t.key, label: isBossUnit ? 'Jefe ' + t.label : t.label,
        symbol: isBossUnit ? 'J' : t.symbol, color: isBossUnit ? '#ff0055' : t.color,
        hp, maxHp: hp, atk, atkSpeed: t.atkSpeed * (isBossUnit ? 0.85 : 1),
        moveInterval: t.moveInterval * (isBossUnit ? 1.15 : 1),
        range: isBossUnit ? Math.max(t.range, 1.8) : t.range,
        gold: isBossUnit ? 40 : t.gold, xp: isBossUnit ? BOSS_XP : t.xp, oneHit,
        armor: (t.armor || 0) + (isBossUnit ? 2 : 0), magicResist: t.magicResist || 0, evasion: t.evasion || 0,
        attackType: t.attackType || 'physical', type: t, statMult, priority: t.priority || 0, // type: el tipo de creep (comportamiento propio en data/creeps.js)
        x, y, spawnX: x, spawnY: y, moveTimer: 0, attackTimer: 0, isBoss: !!isBossUnit, spawnTime: gameClock,
        auraRadius: isBossUnit ? 4 : 0, auraAtkBonus: isBossUnit ? bossAuraBonus : 0,
        effects: [],
        isAlive() { return this.hp > 0; }
    };
}

// --- OBJETIVOS ---
// Enemigos de una unidad según su arena: un héroe en su oleada enfrenta a los creeps; en un duelo, al otro héroe.
// Los creeps enfrentan a los héroes de su arena.
function enemiesOf(unit) {
    const arena = unit.arena;
    if (!arena) return [];
    if (!unit.isHero) return arena.heroes;
    return arena.kind === 'duel' ? arena.heroes.filter(h => h !== unit) : arena.creeps;
}

// Si la unidad está apuntando con el mouse (aimPoint, ver mouse.js), elige entre los enemigos a su alcance el más cercano
// a ese punto en vez del más cercano a ella.
// Objetivo marcado con clic (ver mouse.js): vale mientras siga vivo y en la misma arena.
function validFocus(unit) {
    const f = unit.focus;
    if (f && f.isAlive() && f.arena === unit.arena && unit.arena) return f;
    if (f) unit.focus = null;
    return null;
}

function nearestEnemy(unit, maxRange) {
    const focus = !unit.aimPoint && validFocus(unit);
    if (focus && (maxRange === undefined || Math.hypot(focus.x - unit.x, focus.y - unit.y) <= maxRange)) return focus; // el marcado primero
    let best = null, bestScore = Infinity;
    const aim = unit.aimPoint;
    enemiesOf(unit).forEach(c => {
        if (!c.isAlive()) return;
        const d = Math.hypot(c.x - unit.x, c.y - unit.y);
        if (maxRange !== undefined && d > maxRange) return;
        const score = aim ? Math.hypot(c.x - aim.x, c.y - aim.y) : d;
        if (score < bestScore) { bestScore = score; best = c; }
    });
    return best;
}

// Objetivo del ataque automático: entre los enemigos en rango, el de mayor prioridad (ej: Sanadores) y, a igual
// prioridad, el más cercano.
function pickAttackTarget(unit, range) {
    const focus = validFocus(unit);
    if (focus && Math.hypot(focus.x - unit.x, focus.y - unit.y) <= range) return focus; // el marcado con clic, si está a tiro
    let best = null, bestKey = null;
    enemiesOf(unit).forEach(c => {
        if (!c.isAlive()) return;
        const d = Math.hypot(c.x - unit.x, c.y - unit.y);
        if (d > range) return;
        const key = [-(c.priority || 0), d];
        if (!best || key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] < bestKey[1])) { best = c; bestKey = key; }
    });
    return best;
}

// Teletransporta una unidad junto a un objetivo (Parpadeo, Salto Sangriento), a 1 casilla de distancia.
function blinkNextTo(unit, target) {
    const dx = target.x - unit.x, dy = target.y - unit.y;
    unit.x = Math.max(0, Math.min(COLS - 1, target.x - Math.sign(dx || 1)));
    unit.y = Math.max(0, Math.min(ROWS - 1, dy === 0 ? target.y : target.y - Math.sign(dy)));
    unstickFromWall(unit, target);
}

// Si una unidad terminó sobre una pared (saltos y teletransportes en Tower Chaos), la lleva a la casilla libre más
// cercana (a `near` si se indica, si no a ella misma). En las arenas sin paredes no hace nada.
function unstickFromWall(unit, near = unit) {
    const arena = unit.arena;
    if (!arena || !arena.walls || walkable(arena, unit.x, unit.y)) return;
    let best = null, bestD = Infinity;
    for (let r = 1; r <= 4 && !best; r++) for (let y = near.y - r; y <= near.y + r; y++) for (let x = near.x - r; x <= near.x + r; x++) {
        if (!walkable(arena, x, y) || (x === near.x && y === near.y && near !== unit)) continue;
        const d = Math.hypot(x - unit.x, y - unit.y);
        if (d < bestD) { bestD = d; best = { x, y }; }
    }
    if (best) { unit.x = best.x; unit.y = best.y; }
}

// --- DAÑO ---
// Mitigación según el tipo de daño:
//   'physical' → armadura: cada punto reduce 4% (como máximo 80%)
//   'magical'  → resistencia mágica en % (como máximo 75%)
//   'pure'     → sin mitigación
function mitigate(target, amount, type) {
    if (type === 'physical') return amount * Math.min(2, Math.max(0.2, 1 - effArmor(target) * 0.04)); // armadura negativa: más daño (hasta x2)
    if (type === 'magical') return amount * Math.max(0.25, 1 - effMagicResist(target) / 100);
    return amount;
}

// Único punto de entrada para dañar a cualquier unidad (héroe o creep). En orden:
// invulnerabilidad → esquive (solo ataques básicos, opts.isAttack) → amplificación de hechizo (mágico)
// → reducción de daño entre héroes en duelo
// → reducción de daño por efectos → armadura/resistencia mágica → daño recibido extra (Condenado) → regla de un solo golpe (oneHit)
// → no bajar de 1 con preventDeath → evento onDamaged → muerte.
// Devuelve { dealt, evaded }: dealt es la vida que realmente perdió el objetivo (para robo de vida).
function dealDamage(source, target, amount, type = 'physical', opts = {}) {
    if (!target.isAlive() || hasFlag(target, 'invulnerable')) return { dealt: 0, evaded: false };
    if (type === 'magical' && hasFlag(target, 'magicImmune')) return { dealt: 0, evaded: false };
    if (type === 'physical' && hasFlag(target, 'physicalImmune')) return { dealt: 0, evaded: false };
    const canEvade = opts.isAttack && !(source && hasFlag(source, 'trueStrike'));
    if (canEvade && Math.random() < effEvasion(target) / 100) { fxText(target, 'esquiva', '#8ecae6', 10); return { dealt: 0, evaded: true }; }
    let final = amount;
    if (type === 'magical' && source) final *= 1 + effSpellAmp(source) / 100;
    if (source && source.isHero && target.isHero && target.arena && target.arena.kind === 'duel') final *= 1 - DUEL_DAMAGE_REDUCTION;
    final = mitigate(target, final * (1 - effDmgReduction(target)), type);
    let takenPct = sumMod(target, 'dmgTakenPct'); // ej: Condenado
    // La maldición (Condenado) solo amplifica el daño de creeps y de héroes sin maldición
    if (source && source.isHero && isCondemned(source)) takenPct -= (getEffect(target, 'CONDEMNED') || { mods: {} }).mods.dmgTakenPct || 0;
    final = Math.round(final * (1 + takenPct));
    if (target.oneHit) final = target.hp;
    const floor = hasFlag(target, 'preventDeath') ? 1 : 0;
    const hpLost = Math.max(0, Math.min(final, target.hp - floor));
    target.hp -= hpLost;
    fxDamage(target, hpLost, type, opts.isCrit);
    // dealt en el evento es el daño completo (sin recortar por la vida restante): lo usa Forma Inmortal para acumular
    emit(target, 'onDamaged', { source, dealt: final, type });
    if (source && hpLost > 0) emit(source, 'onDealDamage', { target, dealt: hpLost, type });
    if (!target.isAlive()) onUnitDeath(target, source);
    return { dealt: hpLost, evaded: false };
}

function onUnitDeath(unit, killer) {
    if (unit.isHero) onHeroDeath(unit, killer);
    else killCreep(unit, killer);
}

// Cura a una unidad (sin pasar su máximo), emite onHeal y devuelve cuánto curó realmente.
// La anticuración (mod healingTakenPct negativo) reduce la curación.
// En duelo, las curaciones bajan igual que el daño entre héroes (si no, regenerar valía muchísimo más que pegar).
// El robo de vida no, porque ya sale del daño hecho, que ya viene reducido (opts.fromDamage).
let DUEL_HEAL_REDUCTION = 0.6; // igual que el daño entre héroes (ver DISEÑO.md)
function healUnit(unit, amount, opts = {}) {
    amount *= Math.max(0, 1 + sumMod(unit, 'healingTakenPct'));
    if (!opts.fromDamage && unit.arena && unit.arena.kind === 'duel') amount *= 1 - DUEL_HEAL_REDUCTION;
    const healed = Math.max(0, Math.min(unit.maxHp - unit.hp, Math.round(amount)));
    if (healed <= 0) return 0;
    unit.hp += healed;
    fxHeal(unit, healed);
    emit(unit, 'onHeal', { amount: healed });
    return healed;
}

// Robo de vida: cura según el robo de vida efectivo (base + efectos). El innato Hambre y Sangre Oscura
// modifican el multiplicador a través del evento beforeLifesteal.
function applyLifesteal(unit, dmgDealt, target) {
    const ls = effLifesteal(unit);
    if (ls <= 0 || dmgDealt <= 0) return;
    const ctx = { target, mult: 1 };
    emit(unit, 'beforeLifesteal', ctx);
    healUnit(unit, dmgDealt * (ls / 100) * ctx.mult, { fromDamage: true });
}

// Calcula el daño de un ataque básico: daño efectivo (base + efectos), luego los modificadores de
// beforeAttack (Puntería Perfecta, combo de Velocidad Letal...) y por último la tirada de crítico.
function rollAttackDamage(attacker, target) {
    const ctx = { target, dmg: effAttack(attacker) };
    emit(attacker, 'beforeAttack', ctx);
    let dmg = Math.round(ctx.dmg);
    let isCrit = false;
    if (Math.random() < effCritChance(attacker) / 100) { dmg = Math.round(dmg * (2 + sumMod(attacker, 'critDamage'))); isCrit = true; }
    return { dmg, isCrit };
}

// Resuelve el impacto de un ataque básico ya calculado (instantáneo o al llegar un proyectil).
function resolveBasicHit(attacker, target, dmg, isCrit) {
    if (!target.isAlive()) return; // el objetivo murió mientras el proyectil viajaba
    if (isCrit) log(`💥 ¡Golpe crítico a ${target.label}!`);
    const { dealt } = dealDamage(attacker, target, dmg, 'physical', { isAttack: true, isCrit });
    applyLifesteal(attacker, dealt, target);
    emit(attacker, 'onHit', { target, dealt, isCrit });
}

// --- PROYECTILES (ataques básicos a distancia con velocidad de proyectil) ---
function fireProjectile(attacker, target, dmg, isCrit) {
    if (attacker.isHero && fxArena(attacker)) sfx('shoot');
    attacker.arena.projectiles.push({ attacker, x: attacker.x, y: attacker.y, target, dmg, isCrit, speed: attacker.projectileSpeed || 10 });
}

// Proyectil de habilidad: a diferencia del de arriba, no persigue a un enemigo — viaja en línea recta hacia
// un punto fijo (donde apuntó el jugador, o la posición del enemigo más cercano si no hay mouse de por medio,
// ver isAimedSkill/pointTarget en mouse.js) y daña en área (opts.radius) a quien encuentre en el camino. Si
// apuntás mal y no hay nadie en el radio cuando termina de viajar, no le pega a nadie: es la idea, como un
// hechizo de habilidad en Dota 2. Cada objetivo recibe el golpe una sola vez (opts.onHit por cada uno nuevo).
// opts: { tx, ty, speed, radius, dmg, dmgType, vfx: {color, shape}, skillName, onHit(target), onArrive(x,y) }
function fireSkillProjectile(attacker, opts) {
    const dx = opts.tx - attacker.x, dy = opts.ty - attacker.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    if (attacker.isHero && fxArena(attacker)) sfx('shoot');
    attacker.arena.projectiles.push({
        attacker, kind: 'skill', x: attacker.x, y: attacker.y, tx: opts.tx, ty: opts.ty,
        dx: dx / dist, dy: dy / dist, dist, traveled: 0, speed: opts.speed, radius: opts.radius,
        dmg: opts.dmg, dmgType: opts.dmgType || 'magical', vfx: opts.vfx, skillName: opts.skillName,
        onHit: opts.onHit, onArrive: opts.onArrive, hitSet: new Set()
    });
}

function updateProjectiles(arena, dt) {
    const projectiles = arena.projectiles;
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        if (p.kind === 'skill') {
            const step = p.speed * dt;
            p.traveled += step;
            p.x += p.dx * step; p.y += p.dy * step;
            enemiesOf(p.attacker).forEach(c => {
                if (!c.isAlive() || p.hitSet.has(c) || Math.hypot(c.x - p.x, c.y - p.y) > p.radius) return;
                p.hitSet.add(c);
                const { dealt } = dealDamage(p.attacker, c, p.dmg, p.dmgType);
                if (p.onHit) p.onHit(c, dealt);
            });
            if (p.traveled >= p.dist) {
                if (p.onArrive) p.onArrive(p.tx, p.ty);
                if (!p.hitSet.size && p.attacker.isHero && fxArena(p.attacker)) log(`${p.skillName}: no le pegó a nadie.`);
                projectiles.splice(i, 1);
            }
            continue;
        }
        if (!p.target.isAlive()) { projectiles.splice(i, 1); continue; }
        const dx = p.target.x - p.x, dy = p.target.y - p.y;
        const dist = Math.hypot(dx, dy);
        const step = p.speed * dt;
        if (dist < 0.35 || step >= dist) {
            resolveBasicHit(p.attacker, p.target, p.dmg, p.isCrit);
            projectiles.splice(i, 1);
            continue;
        }
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
    }
}

// --- ESCALADO Y BAJAS ---
// Escalado chico del héroe (definido en su plantilla): suma un bonus permanente al stat que corresponde.
function applyScalingBonus(hero, amount) {
    if (hero.scaling) grantPermanent(hero, hero.scaling.stat, amount);
}

function applyScalingOnCreepKill(hero) {
    if (!hero.scaling) return;
    hero.creepKillCount++;
    if (hero.creepKillCount % hero.scaling.perKills === 0) {
        applyScalingBonus(hero, hero.scaling.perKillsAmount);
        log(`📈 ¡Escalado! +${hero.scaling.perKillsAmount} ${scalingStatLabel(hero.scaling.stat)} (${hero.creepKillCount} bajas totales)`);
    }
}

// Lista para cuando existan duelos PvP: otorga el bonus de escalado por ganar un duelo.
function awardHeroKillScaling(hero) {
    if (!hero.scaling) return;
    hero.heroKillCount++;
    applyScalingBonus(hero, hero.scaling.perHeroKill);
    log(`🏅 ¡Escalado por duelo! +${hero.scaling.perHeroKill} ${scalingStatLabel(hero.scaling.stat)}`);
}

function killCreep(c, killer) {
    c.hp = 0;
    fxDeath(c);
    if (!killer || !killer.isHero) return;
    if (c.arena && c.arena.kind === 'tower') towerLootOnKill(c.arena, c, killer); // Tower Chaos: botín
    if (c.type && c.type.onDeath) c.type.onDeath(c, killer);
    if (c.champion) championOnDeath(c);
    const timeAlive = gameClock - (c.spawnTime || gameClock);
    const speedMult = speedGoldMultiplier(timeAlive);
    const gold = Math.max(1, Math.round(c.gold * speedMult * (c.arena && c.arena.kind === 'tower' ? TOWER.goldMult : 1))); // Torre: economía propia
    killer.gold += gold;
    fxText(c, `+${gold}g`, '#ffd166', 10, 1);
    if (fxArena(c) && killer === player) sfx('coin');
    applyScalingOnCreepKill(killer);
    gainXp(killer, (c.xp || 0) * (c.arena && c.arena.kind === 'tower' ? towerXpFactor(killer, c.arena.floor) : 1)); // Torre: ritmo de niveles (towerWorld.js)
    emit(killer, 'onKill', { victim: c });
    const bonusTag = speedMult > 1.05 ? ` ⚡x${speedMult.toFixed(1)}` : '';
    log(`${c.isBoss ? '👹 ¡Eliminaste al Jefe!' : '⚔️ Eliminaste un ' + c.label} (+${gold}g${bonusTag})`);
}
