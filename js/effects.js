// Sistema genérico de efectos (mejoras y perjuicios) y eventos de combate.
// Es la base de las sinergias: las habilidades, innatos e ítems no se conocen entre sí,
// solo aplican efectos y reaccionan a eventos.
//
// EFECTOS — cada unidad (héroe o creep) tiene una lista `effects`. Un efecto tiene:
//   id        identificador; aplicar otro con el mismo id lo reemplaza (refresca la duración)
//   name      nombre visible
//   until     momento (gameClock) en que termina (duration: Infinity = permanente)
//   mods      modificadores de stats mientras dura:
//               atkPct       +% daño de ataque (se multiplican entre efectos)
//               flatAtk      daño de ataque plano (se suma después de los %)
//               atkSpeedPct  +% velocidad de ataque (se suman)
//               moveSpeedPct +% velocidad de movimiento (se multiplican; negativo = ralentizar)
//               rangePct     +% rango de ataque (se suman)
//               critChance   +% probabilidad de crítico (se suman)
//               lifesteal    +% robo de vida (se suman)
//               dmgReduction reducción de daño recibido (se toma la mayor)
//               dmgTakenPct  +% de daño recibido (se suman; ej: Condenado)
//               armor        armadura extra (se suman; negativo = reducir armadura)
//               magicResist  resistencia mágica extra en % (se suman)
//               evasion      probabilidad de esquivar ataques básicos en % (se suman)
//               spellAmp     amplificación de hechizo en % (se suman)
//               healingTakenPct  +% de curación recibida (negativo = anticuración; se suman)
//               str, agi, int  atributos extra (los usan los ítems; el héroe recalcula sus stats al cambiarlos)
//               maxHp, hpRegen, maxMana, manaRegen  vida/maná máximos y regeneración extra (ítems)
//               statusResist reduce la duración de aturdimientos y ralentizaciones que recibe (0.4 = 40% menos)
//   flags     estados sin número: 'stun', 'invulnerable', 'preventDeath' (la vida no baja de 1), 'taunt',
//             'freeCast' (las habilidades no gastan maná), 'persistent' (no se pierde al morir),
//             'trueStrike' (sus ataques básicos no se pueden esquivar),
//             'magicImmune' (no recibe daño mágico ni aturdimientos ni ralentizaciones), 'item' (efecto de un ítem: no se muestra en la barra)
//   tags      etiquetas (ver data/tags.js), para que ítems de contra puedan detectarlo
//   hooks     reacciones a eventos (ver abajo) + onExpire(owner, efecto) al terminar
//   data      estado interno libre del efecto (acumuladores, combos...)
//
// EVENTOS — emit(unidad, evento, payload) avisa al innato, a las habilidades y a los efectos activos
// de esa unidad. Cada hook recibe (dueño, payload, fuente) y además `this` es la fuente (el innato, la
// habilidad o el efecto), así dentro de una pasiva se puede usar val(this, owner, 'clave').
// Las habilidades en nivel 0 (drafteadas pero sin aprender) no reaccionan. Eventos disponibles:
//   beforeAttack     { target, dmg }            antes de tirar el crítico; se puede modificar dmg
//   onHit            { target, dealt, isCrit }  un ataque básico impactó
//   onKill           { victim }                 la unidad eliminó a un enemigo
//   onDealDamage     { target, dealt, type }    la unidad hizo daño (ataque, habilidad, daño en el tiempo...)
//   onDamaged        { source, dealt, type }    la unidad recibió daño (no se emite si lo esquivó)
//   beforeLifesteal  { target, mult }           antes de curar por robo de vida; se puede modificar mult
//   onHeal           { amount }                 la unidad se curó (robo de vida, habilidades...)
//   onCast           { skill }                  la unidad lanzó una habilidad
//   onTick           { dt }                     cada frame de la oleada (para algo "por segundo", usar everyInterval)
//   onMove           { steps }                  la unidad avanzó casillas (caminando o con una habilidad)
//   onDashHit        { target }                 una habilidad de avance golpeó (Corte Errante)

// Después de un aturdimiento, un héroe no puede ser aturdido de nuevo durante este tiempo (evita quedar
// aturdido para siempre, ej: 2 Aturdidores enfurecidos). A los creeps no se les aplica.
const STUN_IMMUNITY_AFTER = 1.5;

let DUEL_CONTROL_REDUCTION = 0.5; // aturdimientos y ralentizaciones entre héroes duran la mitad en duelo
function addEffect(unit, def) {
    const isStun = (def.flags || []).includes('stun');
    if (isStun && unit.isHero && gameClock < (unit.stunImmuneUntil || 0)) return null;
    const isControlDef = isStun || (def.mods && def.mods.moveSpeedPct < 0);
    if (isControlDef && unit.effects && hasFlag(unit, 'magicImmune')) return null; // inmunidad mágica: tampoco lo controlan
    removeEffect(unit, def.id);
    // Resistencia al control: acorta aturdimientos y ralentizaciones
    const isControl = isStun || (def.mods && def.mods.moveSpeedPct < 0);
    if (isControl && isFinite(def.duration)) def = { ...def, duration: def.duration * (1 - Math.min(0.8, sumMod(unit, 'statusResist'))) };
    // En duelo, el control entre héroes dura menos (DUEL_CONTROL_REDUCTION); si no, el que aturde primero gana casi siempre
    if (isControl && isFinite(def.duration) && unit.isHero && unit.arena && unit.arena.kind === 'duel') def = { ...def, duration: def.duration * (1 - DUEL_CONTROL_REDUCTION) };
    if (isStun && unit.isHero) unit.stunImmuneUntil = gameClock + def.duration + STUN_IMMUNITY_AFTER;
    const effect = {
        ...def, name: def.name || def.id,
        flags: def.flags || [], tags: def.tags || [], hooks: def.hooks || {},
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
    expired.forEach(e => { if (e.hooks.onExpire) e.hooks.onExpire.call(e, unit, e); });
}

function emit(unit, event, payload) {
    const innate = unit.innate;
    if (innate && innate.hooks && innate.hooks[event]) innate.hooks[event].call(innate, unit, payload, innate);
    (unit.skills || []).forEach(s => {
        if (s.hooks && s.hooks[event] && (unit.skillLevels[s.id] || 0) > 0) s.hooks[event].call(s, unit, payload, s);
    });
    activeEffects(unit).forEach(e => { if (e.hooks[event]) e.hooks[event].call(e, unit, payload, e); });
}

// Para cosas que pasan "cada X segundos" (auras, daño en el tiempo, regeneración): devuelve true una vez
// por intervalo. Hace falta porque onTick corre cada frame, y el daño por frame se redondearía a 0.
// key identifica el temporizador dentro de la unidad (ej: el id de la habilidad).
function everyInterval(unit, key, dt, interval = 1) {
    unit.intervals = unit.intervals || {};
    const t = (unit.intervals[key] || 0) + dt;
    unit.intervals[key] = t >= interval ? t - interval : t;
    return t >= interval;
}

// --- STATS EFECTIVOS (stats base de la unidad + efectos activos) ---
function effAttack(u) { return u.atk * prodMod(u, 'atkPct') + sumMod(u, 'flatAtk'); }
function effAtkSpeed(u) { return u.atkSpeed * (1 + sumMod(u, 'atkSpeedPct')); }
function effMoveMult(u) { return prodMod(u, 'moveSpeedPct'); }
function effRange(u) { return u.attackRange * (1 + sumMod(u, 'rangePct')); }
function effCritChance(u) { return (u.critChance || 0) + sumMod(u, 'critChance'); }
function effLifesteal(u) { return (u.lifesteal || 0) + sumMod(u, 'lifesteal'); }
function effDmgReduction(u) { return maxMod(u, 'dmgReduction'); }
function effArmor(u) { return (u.armor || 0) + sumMod(u, 'armor'); }
function effMagicResist(u) { return (u.magicResist || 0) + sumMod(u, 'magicResist'); }
function effEvasion(u) { return (u.evasion || 0) + sumMod(u, 'evasion'); }
function effSpellAmp(u) { return (u.spellAmp || 0) + sumMod(u, 'spellAmp'); }
