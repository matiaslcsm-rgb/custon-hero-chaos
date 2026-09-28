// Danzante Cinético (Agilidad) — duelista móvil: convierte el movimiento constante en daño.
// Diseño del usuario (héroe 10). Se juega moviéndose alrededor del objetivo mientras ataca (se puede atacar caminando).
registerHero({
    key: 'DANCER', name: 'Danzante Cinético', symbol: 'D', primaryAttr: 'AGI', role: 'Duelista móvil',
    attributes: { str: [17, 1.8], agi: [24, 3.2], int: [13, 1.3] },
    baseHp: 135, baseAtk: 8, baseAtkSpeed: 1.0, baseAttackRange: 1.3,
    baseArmor: 0.6, baseMagicResist: 10, baseHpRegen: 0.65,
    baseMaxMana: 118, baseManaRegen: 1.35, baseMoveSpeed: 3.6, baseProjectileSpeed: 0,
    baseCritChance: 12.6, baseEvasion: 11, baseSpellAmp: 0, baseLifesteal: 0,
    description: 'Agilidad: guerrero que convierte el movimiento en daño. Gira alrededor de su objetivo encadenando ataques sin quedarse quieto.',
    scaling: { stat: 'atk', perKills: 8, perKillsAmount: 1.5, perHeroKill: 4 },
    innate: {
        id: 'DANCER_DANCE', name: 'Danza Cinética', moveNeeded: 2, moveWindow: 2, maxCharges: 5, chargeDuration: 5,
        atkSpeedPerCharge: 0.02, evasionPerCharge: 1, burstMult: 0.4,
        tags: ['AL_MOVERSE', 'AL_GOLPEAR', 'MEJORA'],
        description: 'Innato: si te moviste al menos 2 casillas en los últimos 2s, cada ataque básico te da 1 carga de Danza por 5s (máx. 5). Cada carga: +2% vel. de ataque y +1% evasión. Con 5 cargas, tu próximo ataque las consume y da un golpe extra de 40% de tu daño físico.',
        hooks: {
            onMove(owner, { steps }, innate) {
                const moves = owner.danceMoves || (owner.danceMoves = []);
                moves.push({ t: gameClock, steps });
                while (moves.length && moves[0].t < gameClock - innate.moveWindow) moves.shift();
            },
            onHit(owner, { target }, innate) {
                const dance = getEffect(owner, 'DANCER_DANCE');
                if (dance && dance.data.charges >= innate.maxCharges) {
                    removeEffect(owner, 'DANCER_DANCE');
                    if (target.isAlive()) dealDamage(owner, target, Math.round(owner.atk * innate.burstMult), 'physical');
                    fxText(owner, '¡DANZA!', '#48cae4', 12, 0.8);
                    return;
                }
                if (dancedEnough(owner, innate)) addDanceCharges(owner, innate, 1);
            },
            // Corte Errante: si su paso completa el movimiento de la Danza, da 1 carga extra
            onDashHit(owner, payload, innate) { if (dancedEnough(owner, innate)) addDanceCharges(owner, innate, 2); }
        }
    }
}, {
    DANCER_CUT: {
        id: 'DANCER_CUT', name: 'Corte Errante', kind: 'active',
        tags: ['FÍSICO', 'MOVILIDAD', 'AL_GOLPEAR', 'MEJORA'],
        values: { cooldown: [8, 7, 6, 5], manaCost: [30, 35, 40, 45], range: 2, dmgMult: [0.9, 1.2, 1.5, 1.8], moveSpeedPct: [0, 0, 0.1, 0.2], buffDuration: 2 },
        description: 'Avanzás una casilla hacia el enemigo más cercano (hasta {range} casillas) y le hacés un corte lateral de {dmgMult%} de tu daño físico, y ganás +{moveSpeedPct%} vel. de movimiento por {buffDuration}s.',
        cast(caster) {
            const target = nearestEnemy(caster, val(this, caster, 'range') + 0.5);
            if (!target) { log('Corte Errante: sin objetivo en rango.'); return false; }
            if (distance(caster, target) > 1.2) {
                const x = caster.x, y = caster.y;
                caster.x = Math.max(0, Math.min(COLS - 1, caster.x + Math.sign(target.x - caster.x)));
                caster.y = Math.max(0, Math.min(ROWS - 1, caster.y + Math.sign(target.y - caster.y)));
                if (caster.x !== x || caster.y !== y) emit(caster, 'onMove', { steps: 1 });
            }
            const { dealt } = dealDamage(caster, target, Math.round(caster.atk * val(this, caster, 'dmgMult')), 'physical');
            const ms = val(this, caster, 'moveSpeedPct');
            if (ms > 0) addEffect(caster, { id: this.id, name: this.name, duration: val(this, caster, 'buffDuration'), tags: ['MEJORA'], mods: { moveSpeedPct: ms } });
            emit(caster, 'onDashHit', { target });
            if (fxArena(caster)) { fxSlash(caster, target, '#48cae4', false); }
            log(`🌀 ¡Corte Errante a ${target.label}! (-${dealt} HP)`);
            return true;
        }
    },
    DANCER_GHOSTSTEP: {
        id: 'DANCER_GHOSTSTEP', name: 'Paso Fantasma', kind: 'active',
        tags: ['MOVILIDAD', 'MEJORA', 'AL_GOLPEAR'],
        values: { cooldown: [12, 11, 10, 9], manaCost: 35, duration: 2, evasion: [25, 35, 45, 55], strikeRange: 2, strikeBonus: [0.2, 0.3, 0.4, 0.5] },
        description: 'Durante {duration}s ganás +{evasion}% de evasión. Al terminar, hacés un ataque básico con +{strikeBonus%} de daño al enemigo más cercano a {strikeRange} casillas o menos.',
        cast(caster) {
            const skill = this;
            addEffect(caster, {
                id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: ['MEJORA'],
                mods: { evasion: val(this, caster, 'evasion') },
                hooks: {
                    onExpire(owner) {
                        if (!owner.isAlive()) return;
                        const target = nearestEnemy(owner, val(skill, owner, 'strikeRange'));
                        if (!target) return;
                        const { dmg, isCrit } = rollAttackDamage(owner, target);
                        if (fxArena(owner)) fxSlash(owner, target, '#adb5bd', isCrit);
                        resolveBasicHit(owner, target, Math.round(dmg * (1 + val(skill, owner, 'strikeBonus'))), isCrit);
                    }
                }
            });
            log('👻 ¡Paso Fantasma!');
            return true;
        }
    },
    DANCER_RHYTHM: {
        id: 'DANCER_RHYTHM', name: 'Ritmo Letal', kind: 'passive',
        tags: ['AL_GOLPEAR', 'MEJORA'],
        values: { maxStacks: [6, 7, 8, 8], dmgPerStack: [0.03, 0.035, 0.04, 0.04], atkSpeedPerStack: 0.01, evasionPer2: [0, 0, 0, 2], stackDuration: 4 },
        description: 'Pasiva: cada ataque básico seguido al mismo enemigo suma 1 carga de Ritmo por {stackDuration}s (máx. {maxStacks}). Cada carga: +{dmgPerStack%} de daño contra ese enemigo y +{atkSpeedPerStack%} vel. de ataque. En nivel 4, +{evasionPer2}% de evasión cada 2 cargas. Cambiar de objetivo borra las cargas.',
        hooks: {
            beforeAttack(owner, ctx) {
                const current = getEffect(owner, 'DANCER_RHYTHM');
                const same = current && current.data.target === ctx.target;
                const stacks = same ? current.data.stacks : 0;
                ctx.dmg *= 1 + stacks * val(this, owner, 'dmgPerStack');
                const next = Math.min(val(this, owner, 'maxStacks'), stacks + 1);
                addEffect(owner, {
                    id: 'DANCER_RHYTHM', name: `Ritmo ×${next}`, duration: val(this, owner, 'stackDuration'), tags: ['MEJORA'],
                    mods: { atkSpeedPct: next * val(this, owner, 'atkSpeedPerStack'), evasion: Math.floor(next / 2) * val(this, owner, 'evasionPer2') },
                    data: { target: ctx.target, stacks: next }
                });
            }
        }
    },
    DANCER_STORM: {
        id: 'DANCER_STORM', name: 'Tormenta Cinética', kind: 'active', isUltimate: true,
        tags: ['FÍSICO', 'ÁREA', 'MOVILIDAD', 'AL_GOLPEAR', 'AL_MATAR', 'MEJORA'],
        values: { cooldown: [60, 50, 40], manaCost: [100, 120, 140], duration: [6, 7, 8], atkSpeedPct: [0.25, 0.35, 0.45], waveEvery: [3, 3, 2],
                  waveMult: [0.7, 0.9, 1.1], radius: 2, evasion: [0, 10, 15], manaEvery: [0, 0, 10], manaPct: 0.1, atkSpeedPerKill: [1, 1.5, 2] },
        description: 'DEFINITIVA. {duration}s: +{atkSpeedPct%} vel. de ataque y +{evasion}% de evasión. Con cada ataque te movés solo alrededor del objetivo, y cada {waveEvery} ataques lanzás una onda de {waveMult%} de tu daño físico a los enemigos en radio {radius}. En nivel 3, cada 10 ataques recuperás {manaPct%} de tu maná máximo. ASCENSO: cada baja durante la Tormenta te da +{atkSpeedPerKill}% de vel. de ataque permanente.',
        cast(caster) {
            const skill = this;
            addEffect(caster, {
                id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: ['MEJORA'],
                mods: { atkSpeedPct: val(this, caster, 'atkSpeedPct'), evasion: val(this, caster, 'evasion') }, data: { attacks: 0 },
                hooks: {
                    onHit(owner, { target }, effect) {
                        effect.data.attacks++;
                        circleAround(owner, target);
                        if (effect.data.attacks % val(skill, owner, 'waveEvery') === 0) {
                            const dmg = Math.round(owner.atk * val(skill, owner, 'waveMult')), radius = val(skill, owner, 'radius');
                            enemiesOf(owner).forEach(c => { if (c.isAlive() && distance(owner, c) <= radius) dealDamage(owner, c, dmg, 'physical'); });
                            if (fxArena(owner)) fxRing(owner, '#48cae4', radius, 0.35);
                        }
                        const every = val(skill, owner, 'manaEvery');
                        if (every && effect.data.attacks % every === 0) owner.mana = Math.min(owner.maxMana, owner.mana + owner.maxMana * val(skill, owner, 'manaPct'));
                    },
                    onKill(owner) { grantPermanent(owner, 'atkSpeed', val(skill, owner, 'atkSpeedPerKill'), skill.name); }
                }
            });
            log('🌪️ ¡TORMENTA CINÉTICA!');
            return true;
        }
    }
});

// --- Ayudantes del Danzante ---
// ¿Se movió lo suficiente en la ventana de la Danza?
function dancedEnough(owner, innate) {
    const recent = (owner.danceMoves || []).filter(m => m.t >= gameClock - innate.moveWindow);
    return recent.reduce((s, m) => s + m.steps, 0) >= innate.moveNeeded;
}
function addDanceCharges(owner, innate, n) {
    const current = getEffect(owner, 'DANCER_DANCE');
    const charges = Math.min(innate.maxCharges, (current ? current.data.charges : 0) + n);
    addEffect(owner, {
        id: 'DANCER_DANCE', name: `Danza ×${charges}`, duration: innate.chargeDuration, tags: ['MEJORA'],
        mods: { atkSpeedPct: charges * innate.atkSpeedPerCharge, evasion: charges * innate.evasionPerCharge }, data: { charges }
    });
}
// Se mueve a la siguiente casilla alrededor del objetivo (sentido horario) sin salir de su alcance.
const CIRCLE_STEPS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
// Casilla siguiente alrededor del objetivo (o null si no hay otra).
function circleNext(unit, target) {
    const range = effRange(unit);
    const rel = [Math.sign(unit.x - target.x), Math.sign(unit.y - target.y)];
    let i = CIRCLE_STEPS.findIndex(([dx, dy]) => dx === rel[0] && dy === rel[1]);
    if (i < 0) i = 0;
    for (let k = 1; k <= 8; k++) {
        const [dx, dy] = CIRCLE_STEPS[(i + k) % 8];
        const x = target.x + dx, y = target.y + dy;
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS || Math.hypot(dx, dy) > range + 0.01) continue;
        return x === unit.x && y === unit.y ? null : { x, y };
    }
    return null;
}
function circleAround(unit, target) {
    const next = circleNext(unit, target);
    if (!next) return;
    unit.x = next.x; unit.y = next.y;
    emit(unit, 'onMove', { steps: 1 });
}
