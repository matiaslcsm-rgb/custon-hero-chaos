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
        armor: (t.armor || 0) + (isBossUnit ? 2 : 0), magicResist: t.magicResist || 0, evasion: 0,
        x, y, spawnX: x, spawnY: y, moveTimer: 0, attackTimer: 0, isBoss: !!isBossUnit, spawnTime: gameClock,
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
// Mitigación según el tipo de daño:
//   'physical' → armadura: cada punto reduce 4% (como máximo 80%)
//   'magical'  → resistencia mágica en % (como máximo 75%)
//   'pure'     → sin mitigación
function mitigate(target, amount, type) {
    if (type === 'physical') return amount * Math.max(0.2, 1 - (target.armor || 0) * 0.04);
    if (type === 'magical') return amount * Math.max(0.25, 1 - (target.magicResist || 0) / 100);
    return amount;
}

// Único punto de entrada para dañar a cualquier unidad (héroe o creep). En orden:
// invulnerabilidad → esquive (solo ataques básicos, opts.isAttack) → amplificación de hechizo (mágico)
// → reducción de daño por efectos → armadura/resistencia mágica → daño recibido extra (Condenado) → regla de un solo golpe (oneHit)
// → no bajar de 1 con preventDeath → evento onDamaged → muerte.
// Devuelve { dealt, evaded }: dealt es la vida que realmente perdió el objetivo (para robo de vida).
function dealDamage(source, target, amount, type = 'physical', opts = {}) {
    if (!target.isAlive() || hasFlag(target, 'invulnerable')) return { dealt: 0, evaded: false };
    if (opts.isAttack && Math.random() < (target.evasion || 0) / 100) return { dealt: 0, evaded: true };
    let final = amount;
    if (type === 'magical' && source) final *= 1 + (source.spellAmp || 0) / 100;
    final = mitigate(target, final * (1 - effDmgReduction(target)), type);
    final = Math.round(final * (1 + sumMod(target, 'dmgTakenPct'))); // ej: Condenado
    if (target.oneHit) final = target.hp;
    const floor = hasFlag(target, 'preventDeath') ? 1 : 0;
    const hpLost = Math.max(0, Math.min(final, target.hp - floor));
    target.hp -= hpLost;
    // dealt en el evento es el daño completo (sin recortar por la vida restante): lo usa Forma Inmortal para acumular
    emit(target, 'onDamaged', { source, dealt: final, type });
    if (!target.isAlive()) onUnitDeath(target, source);
    return { dealt: hpLost, evaded: false };
}

function onUnitDeath(unit, killer) {
    if (unit.isHero) onHeroDeath(unit, killer);
    else killCreep(unit, killer);
}

// Cura a una unidad (sin pasar su máximo), emite onHeal y devuelve cuánto curó realmente.
function healUnit(unit, amount) {
    const healed = Math.max(0, Math.min(unit.maxHp - unit.hp, Math.round(amount)));
    if (healed <= 0) return 0;
    unit.hp += healed;
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
    healUnit(unit, dmgDealt * (ls / 100) * ctx.mult);
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
    const { dealt } = dealDamage(attacker, target, dmg, 'physical', { isAttack: true });
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
    if (!killer || !killer.isHero) return;
    const timeAlive = gameClock - (c.spawnTime || gameClock);
    const speedMult = speedGoldMultiplier(timeAlive);
    const gold = Math.max(1, Math.round(c.gold * speedMult));
    killer.gold += gold;
    applyScalingOnCreepKill(killer);
    gainXp(killer, c.xp || 0);
    emit(killer, 'onKill', { victim: c });
    const bonusTag = speedMult > 1.05 ? ` ⚡x${speedMult.toFixed(1)}` : '';
    log(`${c.isBoss ? '👹 ¡Eliminaste al Jefe!' : '⚔️ Eliminaste un ' + c.label} (+${gold}g${bonusTag})`);
}
