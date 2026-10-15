// Infinite Tower: las reliquias (fase T00 del roadmap, docs/PROPUESTA-SISTEMAS.md; decidido por el usuario 2026-10-14).
//
//   Como los ítems de Risk of Rain: no tienen ranura, se apilan (cada copia hace el efecto más fuerte) y se enganchan a
//   lo que pasa en la pelea con los eventos que ya emite el combate (emit, effects.js): al pegar (onDealDamage), al
//   matar (onKill), al recibir daño (onDamaged), al esquivar (onDodge) y al parar (onParry). Cada reliquia tiene una
//   etiqueta; juntar 3 de la misma (contando copias) prende el BONUS DE CONJUNTO de esa etiqueta.
//   Paso 1: 12 reliquias en 4 etiquetas (fuego, sangrado, crítico, escudo). Se ganan al vencer campeones (a veces),
//   al abrir cofres (a veces) y al vencer guardianes y jefes (siempre). Conviven con el equipo de siempre.
//   Paso 2 (2026-10-14): +5 (17 en total): la etiqueta Rayo (Chispa, Pararrayos, Bobina) y Fuelle (fuego) y Costra (escudo).
//   Paso 3 (2026-10-14): +5 (22): la etiqueta Hielo (Escarcha, Copo, Carámbano), Garfio (sangrado) y Nube (rayo).

const RELIC_TAGS = {
    fuego: { name: 'Fuego', icon: '🔥', color: '#f77f00', set: 'Incendio: tus quemaduras pegan +50%.' },
    sangrado: { name: 'Sangrado', icon: '🩸', color: '#c1121f', set: 'Hemorragia: tus sangrados pegan +50%.' },
    critico: { name: 'Crítico', icon: '🎯', color: '#ffd166', set: 'Rebote: cada crítico tuyo salta a otro enemigo cercano (50% de tu daño).' },
    escudo: { name: 'Escudo', icon: '🛡️', color: '#8ecae6', set: 'Bastión: tu escudo se recarga el doble de rápido.' },
    rayo: { name: 'Rayo', icon: '⚡', color: '#9ad1ff', set: 'Tormenta: tus rayos saltan a un enemigo más.' },
    hielo: { name: 'Hielo', icon: '❄️', color: '#bde0fe', set: 'Glaciar: tus ralentizaciones duran el doble.' }
};
const RELIC_SET_AT = 3;
const RELIC_DROP = { champion: 0.05, chest: 0.1 }; // medido: con 0,25/0,35 el piloto juntaba 19 en 3 pisos (48 campeones); meta ~2-5 por piso
// n: copias. Los números de cada copia están en la descripción para que se lean en el cartel.
const RELICS = {
    BRASA: { name: 'Brasa Viva', icon: '🔥', tag: 'fuego', desc: n => `Al pegar: ${10 * n}% de prender fuego (30% de tu daño por segundo, 3 s).`,
        onDealDamage(h, p, n) { if (Math.random() < 0.1 * n * relicProc(h)) relicBurn(h, p.target); } },
    CENIZA: { name: 'Corazón de Ceniza', icon: '🌋', tag: 'fuego', desc: n => `Al matar: explota en llamas alrededor (${60 * n}% de tu daño, radio 2).`,
        onKill(h, p, n) { relicBlast(h, p.victim, 2, 0.6 * n, 'fire'); } },
    PEDERNAL: { name: 'Pedernal', icon: '🪨', tag: 'fuego', desc: n => `Al esquivar: prendés fuego a los enemigos a ${1 + n} casillas.`,
        onDodge(h, p, n) { relicNear(h, 1 + n).forEach(e => relicBurn(h, e)); } },
    COLMILLO: { name: 'Colmillo', icon: '🦷', tag: 'sangrado', desc: n => `Al pegar: ${15 * n}% de hacer sangrar (20% de tu daño por segundo, 4 s).`,
        onDealDamage(h, p, n) { if (Math.random() < 0.15 * n * relicProc(h)) relicBleed(h, p.target); } },
    SANGUIJUELA: { name: 'Sanguijuela', icon: '🪱', tag: 'sangrado', desc: n => `Al matar a un enemigo que sangra: te curás ${4 * n}% de tu vida.`,
        onKill(h, p, n) { if (p.victim && getEffect(p.victim, 'RELIC_BLEED')) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.04 * n); } },
    ESPINAS: { name: 'Cota de Espinas', icon: '🌵', tag: 'sangrado', desc: n => `Al recibir un golpe: quien te pegó sangra (${n} vez${n > 1 ? 'es' : ''} más fuerte).`,
        onDamaged(h, p, n) { if (p.source && p.source !== h && p.source.isAlive && p.source.isAlive()) relicBleed(h, p.source, n); } },
    LENTE: { name: 'Lente del Tirador', icon: '🔎', tag: 'critico', desc: n => `+${8 * n}% de crítico.`, mods: n => ({ critChance: 8 * n }) },
    FILO: { name: 'Filo Hambriento', icon: '🗡️', tag: 'critico', desc: n => `Tus críticos te curan ${2 * n}% de tu vida.`,
        onDealDamage(h, p, n) { if (p.isCrit) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.02 * n); } },
    OJO: { name: 'Ojo del Cazador', icon: '👁️', tag: 'critico', desc: n => `Al matar: +${15 * n}% de crítico por 3 s.`,
        onKill(h, p, n) { addEffect(h, { id: 'RELIC_EYE', name: 'Ojo del Cazador', duration: 3, tags: ['MEJORA'], mods: { critChance: 15 * n } }); } },
    EGIDA: { name: 'Égida', icon: '🛡️', tag: 'escudo', desc: n => `Escudo de ${8 * n}% de tu vida que se recarga si no te pegan por 5 s.`, shield: n => 0.08 * n },
    BROQUEL: { name: 'Broquel', icon: '🔰', tag: 'escudo', desc: n => `Al esquivar o parar: ganás un escudo de ${5 * n}% de tu vida.`,
        onDodge(h, p, n) { relicAddShield(h, h.maxHp * 0.05 * n); }, onParry(h, p, n) { relicAddShield(h, h.maxHp * 0.05 * n); } },
    PIEDRA: { name: 'Piedra Firme', icon: '🗿', tag: 'escudo', desc: n => `Mientras tengas escudo: +${15 * n}% de daño.` },
    COSTRA: { name: 'Costra', icon: '🧱', tag: 'escudo', desc: n => `Al matar: ganás un escudo de ${3 * n}% de tu vida.`,
        onKill(h, p, n) { relicAddShield(h, h.maxHp * 0.03 * n); } },
    FUELLE: { name: 'Fuelle', icon: '🌬️', tag: 'fuego', desc: n => `Tus quemaduras duran ${n} s más.` },
    CHISPA: { name: 'Chispa', icon: '⚡', tag: 'rayo', desc: n => `Al pegar: ${10 * n}% de soltar un rayo a un enemigo cercano (40% de tu daño).`,
        onDealDamage(h, p, n) { if (Math.random() < 0.1 * n * relicProc(h)) relicZap(h, p.target, 0.4, 1); } },
    PARARRAYOS: { name: 'Pararrayos', icon: '🌩️', tag: 'rayo', desc: n => `Al recibir un golpe: un rayo a quien te pegó (${40 * n}% de tu daño).`,
        onDamaged(h, p, n) { if (p.source && p.source !== h && p.source.isAlive && p.source.isAlive()) relicZapAt(h, p.source, 0.4 * n); } },
    BOBINA: { name: 'Bobina', icon: '🌀', tag: 'rayo', desc: n => `Cada 5 golpes: un rayo que salta entre ${1 + n} enemigos (25% de tu daño).`, // medido: con 35% sumaba +7% (las demás, 2-4%)
        onDealDamage(h, p, n) { h.relicCoil = (h.relicCoil || 0) + 1; if (h.relicCoil >= 5) { h.relicCoil = 0; relicZap(h, p.target, 0.25, 1 + n); } } },
    NUBE: { name: 'Nube Cargada', icon: '☁️', tag: 'rayo', desc: n => `Cada 8 s: cae un rayo sobre un enemigo a 5 casillas (${50 * n}% de tu daño).` }, // relicTick
    ESCARCHA: { name: 'Escarcha', icon: '❄️', tag: 'hielo', desc: n => `Al pegar: ${15 * n}% de frenar al enemigo 35% por 2 s.`,
        onDealDamage(h, p, n) { if (Math.random() < 0.15 * n * relicProc(h)) relicChill(h, p.target); } },
    COPO: { name: 'Copo', icon: '🌨️', tag: 'hielo', desc: n => `Al esquivar: frenás 35% a los enemigos a ${1 + n} casillas.`,
        onDodge(h, p, n) { relicNear(h, 1 + n).forEach(e => relicChill(h, e)); } },
    CARAMBANO: { name: 'Carámbano', icon: '🧊', tag: 'hielo', desc: n => `Al matar: estalla en hielo (radio 2): ${40 * n}% de tu daño y frena.`,
        onKill(h, p, n) { relicBlast(h, p.victim, 2, 0.4 * n, 'ice'); relicNear(p.victim, 2).forEach(e => relicChill(h, e)); } },
    GARFIO: { name: 'Garfio', icon: '🪝', tag: 'sangrado', desc: n => `Al esquivar o parar: hacés sangrar a los enemigos a ${1 + n} casillas.`,
        onDodge(h, p, n) { relicNear(h, 1 + n).forEach(e => relicBleed(h, e)); }, onParry(h, p, n) { relicNear(h, 1 + n).forEach(e => relicBleed(h, e)); } }
};

function relicCount(h, id) { return (h.relics && h.relics[id]) || 0; }
function relicTagCount(h, tag) { return Object.entries(h.relics || {}).reduce((s, [id, n]) => s + (RELICS[id] && RELICS[id].tag === tag ? n : 0), 0); }
function relicSet(h, tag) { return relicTagCount(h, tag) >= RELIC_SET_AT; }
function addRelic(h, id) {
    h.relics = h.relics || {};
    const had = relicSet(h, RELICS[id].tag);
    h.relics[id] = (h.relics[id] || 0) + 1;
    h.recalculateStats();
    if (h !== player) return;
    const R = RELICS[id], T = RELIC_TAGS[R.tag];
    if (fxArena(h)) fxText(h, `${R.icon} ${R.name}`, T.color, 12, 1.8);
    log(`${R.icon} Reliquia: ${R.name}${h.relics[id] > 1 ? ` ×${h.relics[id]}` : ''}. ${R.desc(h.relics[id])}`); sfx('levelup');
    if (!had && relicSet(h, R.tag)) log(`${T.icon} ¡Conjunto de ${T.name}! ${T.set}`);
    renderRelicBar();
}
// Una reliquia al azar (las que ya tenés pesan igual: apilarlas también es una build)
function grantRandomRelic(h) { addRelic(h, pickRandom(Object.keys(RELICS))); }

// Los eventos del combate (los llama emit en effects.js)
function relicEmit(h, event, p) {
    if (!h.relics || (p && p.relic)) return; // el daño de las reliquias no vuelve a disparar reliquias
    Object.entries(h.relics).forEach(([id, n]) => { const R = RELICS[id]; if (R && R[event]) R[event](h, p || {}, n); });
    if (event === 'onDealDamage' && p.isCrit && relicSet(h, 'critico')) {
        const o = relicNear(p.target, 3).find(e => e !== p.target);
        if (o) dealDamage(h, o, Math.round(effAttack(h) * 0.5), 'physical', { relic: true });
    }
    if (event === 'onDamaged') h.relicHitAt = gameClock;
}
// Stats que suman (Lente) y el daño extra con escudo (Piedra Firme): los lee recalculateStats / effAttack vía relicMods
function relicMods(h) {
    const m = {};
    Object.entries(h.relics || {}).forEach(([id, n]) => { const R = RELICS[id]; if (R && R.mods) Object.entries(R.mods(n)).forEach(([k, v]) => { m[k] = (m[k] || 0) + v; }); });
    if (relicCount(h, 'PIEDRA') && (h.relicShield || 0) > 0) m.atkPct = (m.atkPct || 0) + 0.15 * relicCount(h, 'PIEDRA');
    return m;
}

// --- EFECTOS ---
function relicNear(u, r) { return u && u.arena ? enemiesOf(player).filter(e => e.isAlive() && e.arena === u.arena && Math.hypot(e.x - u.x, e.y - u.y) <= r) : []; }
function relicDot(h, t, id, name, pct, dur, tag) {
    if (!t || !t.isAlive || !t.isAlive()) return;
    const mult = relicSet(h, tag) ? 1.5 : 1;
    addEffect(t, { id, name, duration: dur, tags: ['PERJUICIO'], hooks: { onTick(u, { dt }) {
        if (everyInterval(u, id, dt, 1)) dealDamage(h, u, Math.max(1, Math.round(effAttack(h) * pct * mult)), 'pure', { relic: true });
    } } });
}
function relicChill(h, t) {
    if (!t || !t.isAlive || !t.isAlive()) return;
    addEffect(t, { id: 'RELIC_CHILL', name: 'Helado', duration: relicSet(h, 'hielo') ? 4 : 2, tags: ['PERJUICIO'], mods: { moveSpeedPct: -0.35 } });
}
function relicBurn(h, t) { relicDot(h, t, 'RELIC_BURN', 'Quemado', 0.3, 3 + relicCount(h, 'FUELLE'), 'fuego'); }
// Rayos: le pega a uno y salta a los más cercanos que no tocó (uno más con el conjunto de Rayo)
function relicZapAt(h, t, mult) {
    if (!t || !t.isAlive || !t.isAlive()) return;
    dealDamage(h, t, Math.max(1, Math.round(effAttack(h) * mult)), 'magical', { relic: true });
    const arena = fxArena(h);
    if (arena) fxParticles(arena, t.x, t.y, 'lightning', 6, 2.5, { life: 0.25 });
}
function relicZap(h, from, mult, jumps) {
    const hit = new Set([from]);
    let at = from;
    for (let j = 0; j < jumps + (relicSet(h, 'rayo') ? 1 : 0); j++) {
        const next = relicNear(at, 4).filter(e => !hit.has(e)).sort((a, b) => Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y))[0];
        if (!next) return;
        hit.add(next); relicZapAt(h, next, mult); at = next;
    }
}
function relicBleed(h, t, n = 1) { relicDot(h, t, 'RELIC_BLEED', 'Sangrando', 0.2 * n, 4, 'sangrado'); }
function relicBlast(h, at, r, mult, el) {
    if (!at) return;
    relicNear(at, r).forEach(e => { if (e !== at) dealDamage(h, e, Math.round(effAttack(h) * mult), 'magical', { relic: true }); });
    const arena = fxArena(h);
    if (arena) fxParticles(arena, at.x, at.y, el, 12, 4, { life: 0.4 });
}
// Escudo: absorbe daño antes que la vida (lo llama dealDamage)
function relicShieldMax(h) { return Math.round(h.maxHp * (relicCount(h, 'EGIDA') ? RELICS.EGIDA.shield(relicCount(h, 'EGIDA')) : 0)); }
function relicAddShield(h, v) { h.relicShield = Math.min(Math.max(relicShieldMax(h), h.maxHp * 0.3), (h.relicShield || 0) + Math.round(v)); }
function relicAbsorb(target, final) {
    const s = target.relicShield || 0;
    if (s <= 0 || final <= 0) return final;
    const used = Math.min(s, final);
    target.relicShield = s - used;
    return final - used;
}
// Cada cuadro: la Égida se recarga si no te pegan por 5 s (2,5 con el conjunto de escudo)
function relicTick(h) {
    const e = getEffect(h, 'RELICS'), m = relicMods(h); // crítico y daño con escudo, en un efecto permanente
    if (e) e.mods = m; else addEffect(h, { id: 'RELICS', name: 'Reliquias', duration: Infinity, flags: ['persistent'], tags: ['MEJORA'], mods: m });
    if (relicCount(h, 'NUBE') && gameClock >= (h.relicCloudAt || 0) && inCombat && inCombat()) { // la Nube: un rayo cada 8 s
        h.relicCloudAt = gameClock + 8;
        const t = relicNear(h, 5)[0];
        if (t) relicZapAt(h, t, 0.5 * relicCount(h, 'NUBE'));
    }
    const max = relicShieldMax(h);
    if (!max || (h.relicShield || 0) >= max) return;
    if (gameClock - (h.relicHitAt ?? -99) >= (relicSet(h, 'escudo') ? 2.5 : 5)) h.relicShield = max;
}

// --- INTERFAZ: fila de íconos arriba de la barra del héroe, con el cartel al pasar el mouse ---
function renderRelicBar() {
    const bar = typeof document !== 'undefined' && document.getElementById('relic-bar');
    if (!bar) return;
    const h = player, list = h && gameMode === 'tower' ? Object.entries(h.relics || {}) : [];
    bar.style.display = list.length ? '' : 'none';
    const sets = Object.keys(RELIC_TAGS).filter(t => h && relicSet(h, t));
    bar.innerHTML = list.map(([id, n]) => {
        const R = RELICS[id], T = RELIC_TAGS[R.tag];
        return `<span class="relic" style="border-color:${T.color}" title="${R.name}${n > 1 ? ' ×' + n : ''} (${T.name})&#10;${R.desc(n)}">${R.icon}${n > 1 ? `<b>${n}</b>` : ''}</span>`;
    }).join('') + sets.map(t => `<span class="relic set" style="border-color:${RELIC_TAGS[t].color}" title="Conjunto de ${RELIC_TAGS[t].name}&#10;${RELIC_TAGS[t].set}">${RELIC_TAGS[t].icon}✦</span>`).join('');
}
