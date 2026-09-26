// Sistema genérico de efectos (mejoras y perjuicios) y eventos de combate.
// Es la base de las sinergias: las habilidades, innatos e ítems no se conocen entre sí,
// solo aplican efectos y reaccionan a eventos.
//
// EFECTOS — cada unidad (héroe o creep) tiene una lista `effects`. Un efecto tiene:
//   id        identificador; aplicar otro con el mismo id lo reemplaza (refresca la duración)
//   name      nombre visible
//   until     momento (gameClock) en que termina
//   mods      modificadores de stats mientras dura:
//               atkPct       +% daño de ataque (se multiplican entre efectos)
//               flatAtk      daño de ataque plano (se suma después de los %)
//               atkSpeedPct  +% velocidad de ataque (se suman)
//               moveSpeedPct +% velocidad de movimiento (se multiplican; negativo = ralentizar)
//               rangePct     +% rango de ataque (se suman)
//               critChance   +% probabilidad de crítico (se suman)
//               lifesteal    +% robo de vida (se suman)
//               dmgReduction reducción de daño recibido (se toma la mayor)
//   flags     estados sin número: 'stun', 'invulnerable', 'preventDeath' (la vida no baja de 1), 'taunt',
//             'freeCast' (las habilidades no gastan maná)
//   tags      etiquetas (ver data/tags.js), para que ítems de contra puedan detectarlo
//   hooks     reacciones a eventos (ver abajo) + onExpire(owner, efecto) al terminar
//   data      estado interno libre del efecto (acumuladores, combos...)
//
// EVENTOS — emit(unidad, evento, payload) avisa al innato, a las habilidades y a los efectos activos
// de esa unidad. Cada hook recibe (dueño, payload, fuente). Eventos disponibles:
//   beforeAttack     { target, dmg }            antes de tirar el crítico; se puede modificar dmg
//   onHit            { target, dealt, isCrit }  un ataque básico impactó
//   onKill           { victim }                 la unidad eliminó a un enemigo
//   onDamaged        { source, dealt, type }    la unidad recibió daño (no se emite si lo esquivó)
//   beforeLifesteal  { target, mult }           antes de curar por robo de vida; se puede modificar mult
//   onHeal           { amount }                 la unidad se curó (robo de vida, habilidades...)
//   onCast           { skill }                  la unidad lanzó una habilidad
//   onTick           { dt }                     cada frame de la oleada

function addEffect(unit, def) {
    removeEffect(unit, def.id);
    const effect = {
        name: def.id, flags: [], tags: [], hooks: {}, ...def,
        mods: { ...(def.mods || {}) }, data: { ...(def.data || {}) },
        until: gameClock + def.duration
    };
    unit.effects.push(effect);
    return effect;
}

function removeEffect(unit, id) { unit.effects = unit.effects.filter(e => e.id !== id); }
function activeEffects(unit) { return (unit.effects || []).filter(e => e.until > gameClock); }
function getEffect(unit, id) { return activeEffects(unit).find(e => e.id === id) || null; }
function hasFlag(unit, flag) { return activeEffects(unit).some(e => e.flags.includes(flag)); }

function sumMod(unit, key) { return activeEffects(unit).reduce((s, e) => s + (e.mods[key] || 0), 0); }
function prodMod(unit, key) { return activeEffects(unit).reduce((p, e) => p * (1 + (e.mods[key] || 0)), 1); }
function maxMod(unit, key) { return activeEffects(unit).reduce((m, e) => Math.max(m, e.mods[key] || 0), 0); }

// Avanza los efectos de una unidad: emite onTick y quita los vencidos (llamando a su onExpire).
function tickEffects(unit, dt) {
    emit(unit, 'onTick', { dt });
    const expired = unit.effects.filter(e => e.until <= gameClock);
    if (!expired.length) return;
    unit.effects = unit.effects.filter(e => e.until > gameClock);
    expired.forEach(e => { if (e.hooks.onExpire) e.hooks.onExpire(unit, e); });
}

function emit(unit, event, payload) {
    const innate = unit.innate;
    if (innate && innate.hooks && innate.hooks[event]) innate.hooks[event](unit, payload, innate);
    (unit.skills || []).forEach(s => { if (s.hooks && s.hooks[event]) s.hooks[event](unit, payload, s); });
    activeEffects(unit).forEach(e => { if (e.hooks[event]) e.hooks[event](unit, payload, e); });
}

// --- STATS EFECTIVOS (stats base de la unidad + efectos activos) ---
function effAttack(u) { return u.atk * prodMod(u, 'atkPct') + sumMod(u, 'flatAtk'); }
function effAtkSpeed(u) { return u.atkSpeed * (1 + sumMod(u, 'atkSpeedPct')); }
function effMoveMult(u) { return prodMod(u, 'moveSpeedPct'); }
function effRange(u) { return u.attackRange * (1 + sumMod(u, 'rangePct')); }
function effCritChance(u) { return (u.critChance || 0) + sumMod(u, 'critChance'); }
function effLifesteal(u) { return (u.lifesteal || 0) + sumMod(u, 'lifesteal'); }
function effDmgReduction(u) { return maxMod(u, 'dmgReduction'); }
