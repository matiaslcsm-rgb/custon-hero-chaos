// Sistema de combate: creación de creeps, daño, críticos, robo de vida, proyectiles, escalado y bajas.

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
        stunnedUntil: 0, slowUntil: 0, dot: null,
        isAlive() { return this.hp > 0; }
    };
}

// Aplica daño a un creep respetando la regla de "un solo golpe" (oneHit) y dispara la muerte si corresponde.
// opts.isMagical aplica la amplificación de hechizo (spellAmp) del jugador al daño. Devuelve el daño
// realmente aplicado (para robo de vida y otros efectos que dependen del daño causado).
function damageCreep(c, dmg, opts) {
    if (!c.isAlive()) return 0;
    let final = dmg;
    if (opts && opts.isMagical) final = Math.round(final * (1 + (player.spellAmp || 0) / 100));
    final = c.oneHit ? c.hp : Math.min(c.hp, final);
    c.hp = Math.max(0, c.hp - final);
    if (c.hp <= 0) killCreep(c);
    return final;
}

// Robo de vida: cura al jugador según su stat de robo de vida (se duplica vs objetivos con <30% HP
// gracias a la pasiva Hambre del Vampiro, y aumenta durante Sangre Oscura y Forma Inmortal).
function applyLifesteal(dmgDealt, target) {
    let ls = player.lifesteal || 0;
    if (gameClock < player.immortalUntil) ls += 25; // Forma Inmortal: +25% robo de vida
    if (ls <= 0 || dmgDealt <= 0) return;
    let mult = 1;
    if (player.hasArchetypePassive('BLOODLUST') && target && target.maxHp && target.hp / target.maxHp < 0.3) mult = 2;
    if (gameClock < player.darkBloodUntil) mult += 0.5;
    const heal = Math.round(dmgDealt * (ls / 100) * mult);
    if (heal > 0) player.hp = Math.min(player.maxHp, player.hp + heal);
}

// Tira el crítico y aplica todos los multiplicadores de daño activos (Puntería Perfecta, Furia,
// Sangre Oscura, combo de Velocidad Letal, Masacre) para un golpe de ataque básico.
function rollAttackDamage(target) {
    let dmg = player.atk;
    if (player.hasArchetypePassive('PERFECT_AIM') && target && player.attackRange > 0) {
        const dist = Math.hypot(player.x - target.x, player.y - target.y);
        const distPct = dist / player.attackRange;
        if (distPct > 0.8) dmg *= 1.35; else if (distPct > 0.45) dmg *= 1.15;
    }
    if (gameClock < player.furiaUntil) dmg = dmg * 1.4 + (player.furiaBonusAtk || 0);
    if (gameClock < player.darkBloodUntil) dmg *= 1.3;
    if (gameClock < player.visionUntil) dmg *= 1.25;
    if (gameClock < player.immortalUntil) dmg *= 1.3;
    if (gameClock < player.lethalSpeedComboUntil && target && player.comboTarget === target) {
        dmg *= (1 + Math.min(0.4, player.comboStacks * 0.05));
    }
    dmg = Math.round(dmg);
    let critChance = player.critChance || 0;
    if (gameClock < player.masacreUntil) critChance += 50;
    let isCrit = false;
    if (Math.random() < critChance / 100) { dmg = Math.round(dmg * 2); isCrit = true; }
    if (gameClock < player.lethalSpeedComboUntil && target) {
        if (player.comboTarget !== target) { player.comboTarget = target; player.comboStacks = 0; }
        player.comboStacks++;
    }
    return { dmg, isCrit };
}

// Resuelve el impacto de un ataque básico ya calculado (instantáneo o al llegar un proyectil).
function resolveBasicHit(target, dmg, isCrit) {
    if (!target.isAlive()) return; // el objetivo murió mientras el proyectil viajaba
    if (isCrit) log(`💥 ¡Golpe crítico a ${target.label}!`);
    const dealt = damageCreep(target, dmg);
    applyLifesteal(dealt, target);
}

// --- PROYECTILES (ataques básicos a distancia con velocidad de proyectil) ---
let projectiles = [];
function fireProjectile(x, y, target, dmg, isCrit) {
    projectiles.push({ x, y, target, dmg, isCrit, speed: player.projectileSpeed || 10 });
}
function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        if (!p.target.isAlive()) { projectiles.splice(i, 1); continue; }
        const dx = p.target.x - p.x, dy = p.target.y - p.y;
        const dist = Math.hypot(dx, dy);
        const step = p.speed * dt;
        if (dist < 0.35 || step >= dist) {
            resolveBasicHit(p.target, p.dmg, p.isCrit);
            projectiles.splice(i, 1);
            continue;
        }
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
    }
}

// --- OBJETIVOS Y MOVIMIENTO DE HABILIDADES ---
function nearestAliveCreep(fromX, fromY, maxRange) {
    let best = null, bestDist = Infinity;
    creeps.forEach(c => {
        if (!c.isAlive()) return;
        const d = Math.hypot(c.x - fromX, c.y - fromY);
        if (d < bestDist && (maxRange === undefined || d <= maxRange)) { bestDist = d; best = c; }
    });
    return best;
}

// Teletransporta al jugador junto a un objetivo (para Parpadeo y Salto Sangriento), dejándolo a 1 casilla de distancia.
function blinkNextTo(target) {
    const dx = target.x - player.x, dy = target.y - player.y;
    player.x = Math.max(0, Math.min(COLS - 1, target.x - Math.sign(dx || 1)));
    player.y = Math.max(0, Math.min(ROWS - 1, dy === 0 ? target.y : target.y - Math.sign(dy)));
}

// --- ESCALADO Y BAJAS ---
// Aplica el bonus de escalado del héroe activo (armadura, daño, etc. según su arquetipo) y recalcula stats.
function applyScalingBonus(amount) {
    if (!player.scaling) return;
    if (player.scaling.stat === 'armor') player.bonusArmor = (player.bonusArmor || 0) + amount;
    else if (player.scaling.stat === 'atk') player.bonusAtk = (player.bonusAtk || 0) + amount;
    else if (player.scaling.stat === 'critChance') player.bonusCritChance = (player.bonusCritChance || 0) + amount;
    else if (player.scaling.stat === 'lifesteal') player.bonusLifesteal = (player.bonusLifesteal || 0) + amount;
    player.recalculateStats();
}

function applyScalingOnCreepKill() {
    if (!player.scaling) return;
    player.creepKillCount++;
    if (player.creepKillCount % player.scaling.perKills === 0) {
        applyScalingBonus(player.scaling.perKillsAmount);
        log(`📈 ¡Escalado! +${player.scaling.perKillsAmount} ${scalingStatLabel(player.scaling.stat)} (${player.creepKillCount} bajas totales)`);
    }
}

// Lista para cuando existan duelos PvP en el loop completo: otorga el bonus de escalado por ganar un duelo.
function awardHeroKillScaling() {
    if (!player.scaling) return;
    player.heroKillCount++;
    applyScalingBonus(player.scaling.perHeroKill);
    log(`🏅 ¡Escalado por duelo! +${player.scaling.perHeroKill} ${scalingStatLabel(player.scaling.stat)}`);
}

function killCreep(c) {
    c.hp = 0;
    const timeAlive = gameClock - (c.spawnTime || gameClock);
    const speedMult = speedGoldMultiplier(timeAlive);
    const gold = Math.max(1, Math.round(c.gold * speedMult));
    player.gold += gold;
    applyScalingOnCreepKill();
    if (gameClock < player.masacreUntil) player.masacreUntil += 1.5; // Masacre: cada baja extiende la duración
    const bonusTag = speedMult > 1.05 ? ` ⚡x${speedMult.toFixed(1)}` : '';
    log(`${c.isBoss ? '👹 ¡Eliminaste al Jefe!' : '⚔️ Eliminaste un ' + c.label} (+${gold}g${bonusTag})`);
}
