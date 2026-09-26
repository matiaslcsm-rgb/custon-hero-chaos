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
        gold: isBossUnit ? 40 : t.gold, oneHit,
        x, y, moveTimer: 0, attackTimer: 0, isBoss: !!isBossUnit, spawnTime: gameClock,
        auraRadius: isBossUnit ? 4 : 0, auraAtkBonus: isBossUnit ? bossAuraBonus : 0,
        effects: [],
        isAlive() { return this.hp > 0; }
    };
}

// --- OBJETIVOS ---
// Enemigos de una unidad. Por ahora un héroe solo enfrenta creeps; con PvP se suman los héroes rivales.
function enemiesOf(unit) { return creeps; }

function nearestEnemy(unit, maxRange) {
    let best = null, bestDist = Infinity;
    enemiesOf(unit).forEach(c => {
        if (!c.isAlive()) return;
        const d = Math.hypot(c.x - unit.x, c.y - unit.y);
        if (d < bestDist && (maxRange === undefined || d <= maxRange)) { bestDist = d; best = c; }
    });
    return best;
}

// Teletransporta una unidad junto a un objetivo (Parpadeo, Salto Sangriento), a 1 casilla de distancia.
function blinkNextTo(unit, target) {
    const dx = target.x - unit.x, dy = target.y - unit.y;
    unit.x = Math.max(0, Math.min(COLS - 1, target.x - Math.sign(dx || 1)));
    unit.y = Math.max(0, Math.min(ROWS - 1, dy === 0 ? target.y : target.y - Math.sign(dy)));
}

// --- DAÑO ---
// Aplica daño a un creep respetando la regla de "un solo golpe" (oneHit) y dispara la muerte si corresponde.
// opts.isMagical aplica la amplificación de hechizo (spellAmp) de quien ataca. Devuelve el daño
// realmente aplicado (para robo de vida y otros efectos que dependen del daño causado).
function damageCreep(source, c, dmg, opts) {
    if (!c.isAlive()) return 0;
    let final = dmg;
    if (opts && opts.isMagical) final = Math.round(final * (1 + (source.spellAmp || 0) / 100));
    final = c.oneHit ? c.hp : Math.min(c.hp, final);
    c.hp = Math.max(0, c.hp - final);
    if (c.hp <= 0) killCreep(c, source);
    return final;
}

// Robo de vida: cura según el robo de vida efectivo (base + efectos). El innato Hambre y Sangre Oscura
// modifican el multiplicador a través del evento beforeLifesteal.
function applyLifesteal(unit, dmgDealt, target) {
    const ls = effLifesteal(unit);
    if (ls <= 0 || dmgDealt <= 0) return;
    const ctx = { target, mult: 1 };
    emit(unit, 'beforeLifesteal', ctx);
    const heal = Math.round(dmgDealt * (ls / 100) * ctx.mult);
    if (heal > 0) unit.hp = Math.min(unit.maxHp, unit.hp + heal);
}

// Calcula el daño de un ataque básico: daño efectivo (base + efectos), luego los modificadores de
// beforeAttack (Puntería Perfecta, combo de Velocidad Letal...) y por último la tirada de crítico.
function rollAttackDamage(attacker, target) {
    const ctx = { target, dmg: effAttack(attacker) };
    emit(attacker, 'beforeAttack', ctx);
    let dmg = Math.round(ctx.dmg);
    let isCrit = false;
    if (Math.random() < effCritChance(attacker) / 100) { dmg = Math.round(dmg * 2); isCrit = true; }
    return { dmg, isCrit };
}

// Resuelve el impacto de un ataque básico ya calculado (instantáneo o al llegar un proyectil).
function resolveBasicHit(attacker, target, dmg, isCrit) {
    if (!target.isAlive()) return; // el objetivo murió mientras el proyectil viajaba
    if (isCrit) log(`💥 ¡Golpe crítico a ${target.label}!`);
    const dealt = damageCreep(attacker, target, dmg);
    applyLifesteal(attacker, dealt, target);
    emit(attacker, 'onHit', { target, dealt, isCrit });
}

// --- PROYECTILES (ataques básicos a distancia con velocidad de proyectil) ---
let projectiles = [];
function fireProjectile(attacker, target, dmg, isCrit) {
    projectiles.push({ attacker, x: attacker.x, y: attacker.y, target, dmg, isCrit, speed: attacker.projectileSpeed || 10 });
}
function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
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
// Aplica el bonus de escalado del héroe (armadura, daño, etc. según su plantilla) y recalcula stats.
function applyScalingBonus(hero, amount) {
    if (!hero.scaling) return;
    if (hero.scaling.stat === 'armor') hero.bonusArmor = (hero.bonusArmor || 0) + amount;
    else if (hero.scaling.stat === 'atk') hero.bonusAtk = (hero.bonusAtk || 0) + amount;
    else if (hero.scaling.stat === 'critChance') hero.bonusCritChance = (hero.bonusCritChance || 0) + amount;
    else if (hero.scaling.stat === 'lifesteal') hero.bonusLifesteal = (hero.bonusLifesteal || 0) + amount;
    hero.recalculateStats();
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
    const timeAlive = gameClock - (c.spawnTime || gameClock);
    const speedMult = speedGoldMultiplier(timeAlive);
    const gold = Math.max(1, Math.round(c.gold * speedMult));
    killer.gold += gold;
    applyScalingOnCreepKill(killer);
    emit(killer, 'onKill', { victim: c });
    const bonusTag = speedMult > 1.05 ? ` ⚡x${speedMult.toFixed(1)}` : '';
    log(`${c.isBoss ? '👹 ¡Eliminaste al Jefe!' : '⚔️ Eliminaste un ' + c.label} (+${gold}g${bonusTag})`);
}
