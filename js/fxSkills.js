// Efectos de habilidades con identidad: cada habilidad tiene una FORMA (proyectil, nova, zona, aura, escudo,
// teletransporte, cadena, rayo del cielo, torbellino, garras, disparo, grito, meteoro…) y un ELEMENTO (paleta y
// partícula propias: brasas, esquirlas, chispas, burbujas, runas, humo, gotas…). Además: estados visibles sobre las
// unidades, pausa de impacto (hit-stop), cartel de las definitivas y ataque básico distinto según el arma.
// Son SOLO visuales. Referencias: "Juice it or lose it" (Jonasson y Purho, 2012), hitstop de los juegos de pelea,
// identidad por color de los dioses de Hades. Diseño: docs/ROGUELIKE.md §4 quinquies.

const ELEMENTS = {
    fire: { c1: '#e85d04', c2: '#ffd166', p: 'ember' }, ice: { c1: '#48cae4', c2: '#e9f5ff', p: 'shard' },
    lightning: { c1: '#ffd60a', c2: '#fffbe0', p: 'spark' }, poison: { c1: '#55a630', c2: '#c9f2a6', p: 'bubble' },
    arcane: { c1: '#9d4edd', c2: '#e0aaff', p: 'rune' }, shadow: { c1: '#3c096c', c2: '#b8a1d9', p: 'smoke' },
    blood: { c1: '#9b2226', c2: '#ff6b6b', p: 'drop' }, steel: { c1: '#adb5bd', c2: '#ffffff', p: 'spark' },
    holy: { c1: '#52b788', c2: '#d8f3dc', p: 'plus' }, void: { c1: '#240046', c2: '#c77dff', p: 'swirl' }
};
// Forma y elemento de cada habilidad activa (las demás se deducen de sus etiquetas)
const SKILL_VFX = {
    ADVENTURER_GOLPE: { el: 'steel', shape: 'strike' },
    ALCHEMIST_ACID: { el: 'poison', shape: 'cone' }, ALCHEMIST_BREW: { el: 'fire', shape: 'proj' }, ALCHEMIST_CHEMICAL: { el: 'poison', shape: 'aura' },
    ARCANIST_BOLT: { el: 'arcane', shape: 'proj' }, ARCANIST_SHIELD: { el: 'arcane', shape: 'shield' }, ARCANIST_OVERLOAD: { el: 'arcane', shape: 'meteor' },
    ASSASSIN_BLINK: { el: 'shadow', shape: 'blink' }, ASSASSIN_LETHALSPEED: { el: 'blood', shape: 'aura' }, ASSASSIN_MASACRE: { el: 'blood', shape: 'whirl' },
    AXE_PROVOCACION: { el: 'steel', shape: 'shout' }, AXE_GIRO: { el: 'steel', shape: 'whirl' }, AXE_FURIA: { el: 'blood', shape: 'aura' },
    DANCER_CUT: { el: 'steel', shape: 'dash' }, DANCER_GHOSTSTEP: { el: 'shadow', shape: 'blink' }, DANCER_STORM: { el: 'steel', shape: 'whirl' },
    FROSTWITCH_BLAST: { el: 'ice', shape: 'proj' }, FROSTWITCH_ARMOR: { el: 'ice', shape: 'shield' }, FROSTWITCH_ZERO: { el: 'ice', shape: 'nova' },
    NECROMANCER_PULSE: { el: 'shadow', shape: 'nova' }, NECROMANCER_SHROUD: { el: 'shadow', shape: 'aura' }, NECROMANCER_REAP: { el: 'shadow', shape: 'reap' },
    SNIPER_POTENTE: { el: 'steel', shape: 'shot' }, SNIPER_CONGELANTE: { el: 'ice', shape: 'shot' }, SNIPER_MORTAL: { el: 'blood', shape: 'shot' },
    VAMP_CLAW: { el: 'blood', shape: 'claw' }, VAMP_LEAP: { el: 'blood', shape: 'dash' }, VAMP_IMMORTAL: { el: 'blood', shape: 'aura' },
    VOIDSAGE_BLINK: { el: 'void', shape: 'blink' }, VOIDSAGE_PULSE: { el: 'void', shape: 'nova' }, VOIDSAGE_RIFT: { el: 'void', shape: 'zone' },
    ZEUS_ARC: { el: 'lightning', shape: 'chain' }, ZEUS_BOLT: { el: 'lightning', shape: 'proj' }, ZEUS_NIMBUS: { el: 'lightning', shape: 'zone' }, ZEUS_WRATH: { el: 'lightning', shape: 'sky' }
};
function skillVfx(skill) {
    if (SKILL_VFX[skill.id]) return SKILL_VFX[skill.id];
    const t = skill.tags || [], magic = t.includes('MÁGICO');
    if (t.includes('CURACIÓN')) return { el: 'holy', shape: 'heal' };
    if (t.includes('MOVILIDAD')) return { el: magic ? 'arcane' : 'shadow', shape: 'blink' };
    if (t.includes('ÁREA')) return { el: magic ? 'arcane' : 'steel', shape: 'nova' };
    if (t.includes('MEJORA')) return { el: 'holy', shape: 'aura' };
    if (t.includes('CONTROL')) return { el: 'steel', shape: 'shout' };
    if (magic) return { el: 'arcane', shape: 'beam' };
    return { el: 'steel', shape: 'strike' };
}

// --- Primitivas ---
function pushFxAt(arena, fx, delay = 0) { pushFx(arena, fx); fx.born += delay; return fx; }
// Partículas del elemento alrededor de (x, y): style decide cómo se mueven y se dibujan
function fxParticles(arena, x, y, elKey, n = 10, speed = 4, opts = {}) {
    const el = ELEMENTS[elKey] || ELEMENTS.steel;
    for (let i = 0; i < n; i++) {
        const a = opts.angle !== undefined ? opts.angle + (Math.random() - 0.5) * (opts.spread || 0.8) : Math.random() * Math.PI * 2;
        const v = speed * (0.4 + Math.random() * 0.8), style = opts.style || el.p;
        const rise = style === 'ember' || style === 'bubble' || style === 'plus' ? -1.6 : style === 'drop' ? 1.4 : 0;
        pushFxAt(arena, { kind: 'particle', style, x: x + (opts.jitter ? (Math.random() - 0.5) * opts.jitter : 0), y: y + (opts.jitter ? (Math.random() - 0.5) * opts.jitter : 0),
            vx: Math.cos(a) * v, vy: Math.sin(a) * v + rise, color: Math.random() < 0.5 ? el.c1 : el.c2, life: (opts.life || 0.5) * (0.7 + Math.random() * 0.6),
            size: (opts.size || 2.4) * (0.7 + Math.random() * 0.7), rot: Math.random() * 6 }, opts.delay || 0);
    }
}
function fxImpact(arena, x, y, elKey, big = false) {
    const el = ELEMENTS[elKey] || ELEMENTS.steel;
    pushFxAt(arena, { kind: 'ring', x, y, color: el.c1, radius: big ? 2.2 : 1.1, life: 0.35 });
    fxParticles(arena, x, y, elKey, big ? 16 : 8, big ? 6 : 4);
}
// Pausa de impacto: el juego se congela unos milisegundos (los efectos siguen)
let hitStopUntil = 0, fxCastingSkill = null;
function fxHitStop(sec) { hitStopUntil = Math.max(hitStopUntil, performance.now() / 1000 + sec); }
function inHitStop() { return performance.now() / 1000 < hitStopUntil; }
// Cartel de la definitiva (nombre en tinta, de lado a lado)
let fxBanner = null;
function fxUltBanner(skill, hero) { fxBanner = { text: skill.name, at: fxClock, color: (ELEMENTS[skillVfx(skill).el] || ELEMENTS.steel).c1, who: hero.displayName || hero.name }; }

// --- Lanzar una habilidad: forma + elemento ---
function fxSkill(hero, skill, from) {
    const arena = fxArena(hero);
    if (!arena) return;
    const v = skillVfx(skill), el = ELEMENTS[v.el] || ELEMENTS.steel, k = v.el;
    const range = Math.max(effRange(hero) + 3, 5);
    const target = hero.aimPoint && skill.pointTarget ? hero.aimPoint : nearestEnemy(hero, range);
    const radius = (typeof val === 'function' && val(skill, hero, 'radius')) || 2;
    const tx = target ? target.x : hero.x, ty = target ? target.y : hero.y;
    { const d = Math.hypot(tx - hero.x, ty - hero.y) || 1; hero.fxAttack = { kind: CAST_POSE[v.shape] || 'cast', dx: target ? (tx - hero.x) / d : hero.facing || 1, dy: target ? (ty - hero.y) / d : 0, at: fxClock, color: el.c1 }; if (target && tx !== hero.x) hero.facing = Math.sign(tx - hero.x); }
    sfx('el_' + k); // sonido del elemento (audio.js)
    switch (v.shape) {
        case 'strike':
            pushFxAt(arena, { kind: 'slash', x: tx, y: ty, angle: Math.atan2(ty - hero.y, tx - hero.x), flip: true, color: el.c2, width: 7, life: 0.28 });
            fxImpact(arena, tx, ty, k); fxShake(2); break;
        case 'cone': {
            const a = Math.atan2(ty - hero.y, tx - hero.x);
            fxParticles(arena, hero.x, hero.y, k, 22, 9, { angle: a, spread: 0.9, life: 0.45, size: 3 });
            fxImpact(arena, tx, ty, k); break;
        }
        case 'proj': // el proyectil real lo dibuja el juego; acá, el destello al lanzarlo
            pushFxAt(arena, { kind: 'ring', x: hero.x, y: hero.y, color: el.c1, radius: 1, life: 0.3 });
            fxParticles(arena, hero.x, hero.y, k, 8, 3); break;
        case 'aura':
            pushFxAt(arena, { kind: 'aura', unit: hero, x: hero.x, y: hero.y, color: el.c1, color2: el.c2, life: 1.4 });
            fxParticles(arena, hero.x, hero.y, k, 14, 3, { jitter: 1, life: 0.9 }); break;
        case 'shield':
            pushFxAt(arena, { kind: 'bubble', unit: hero, x: hero.x, y: hero.y, color: el.c1, color2: el.c2, life: 1.2 });
            fxParticles(arena, hero.x, hero.y, k, 10, 2.5, { jitter: 1.2 }); break;
        case 'blink':
            if (from) { fxParticles(arena, from.x, from.y, k, 12, 3, { style: 'smoke', size: 4, life: 0.6 }); pushFxAt(arena, { kind: 'afterimage', x: from.x, y: from.y, tx: hero.x, ty: hero.y, color: el.c2, life: 0.35 }); }
            fxParticles(arena, hero.x, hero.y, k, 12, 4); break;
        case 'dash':
            if (from) pushFxAt(arena, { kind: 'afterimage', x: from.x, y: from.y, tx: hero.x, ty: hero.y, color: el.c2, life: 0.4 });
            for (let i = 0; i < 3; i++) pushFxAt(arena, { kind: 'slash', x: hero.x + (Math.random() - 0.5), y: hero.y + (Math.random() - 0.5), angle: Math.random() * 6, flip: i % 2 === 0, color: el.c1, width: 4, life: 0.22 }, i * 0.06);
            fxShake(1.5); break;
        case 'whirl':
            for (let i = 0; i < 4; i++) pushFxAt(arena, { kind: 'slash', x: hero.x, y: hero.y, angle: i * Math.PI / 2, flip: true, color: i % 2 ? el.c1 : el.c2, width: 5, life: 0.25, scale: radius / 0.62 / 1.2 }, i * 0.05);
            pushFxAt(arena, { kind: 'ring', x: hero.x, y: hero.y, color: el.c1, radius, life: 0.4 }); fxShake(2); break;
        case 'shout':
            for (let i = 0; i < 3; i++) pushFxAt(arena, { kind: 'ring', x: hero.x, y: hero.y, color: el.c1, radius: radius * (0.6 + i * 0.25), life: 0.45 }, i * 0.1);
            fxShake(1.5); break;
        case 'nova':
            pushFxAt(arena, { kind: 'ring', x: hero.x, y: hero.y, color: el.c1, radius, life: 0.5 });
            pushFxAt(arena, { kind: 'ring', x: hero.x, y: hero.y, color: el.c2, radius: radius * 0.7, life: 0.45 }, 0.1);
            fxParticles(arena, hero.x, hero.y, k, 24, radius * 3, { life: 0.55 }); fxShake(skill.isUltimate ? 5 : 2.5); break;
        case 'zone': {
            const dur = Math.min(6, (typeof val === 'function' && val(skill, hero, 'duration')) || 2.5);
            pushFxAt(arena, { kind: 'zone', x: tx, y: ty, color: el.c1, color2: el.c2, radius, life: dur, el: k });
            fxImpact(arena, tx, ty, k, true); break;
        }
        case 'meteor':
            pushFxAt(arena, { kind: 'streak', x: tx - 3, y: ty - 7, tx, ty, color: el.c2, life: 0.3 });
            pushFxAt(arena, { kind: 'ring', x: tx, y: ty, color: el.c1, radius: radius + 0.5, life: 0.6 }, 0.3);
            fxParticles(arena, tx, ty, k, 26, 7, { delay: 0.3, life: 0.6 }); setTimeout(() => fxShake(6), 300); break;
        case 'reap':
            pushFxAt(arena, { kind: 'crescent', x: tx, y: ty, color: el.c2, color2: el.c1, life: 0.45 });
            fxParticles(arena, tx, ty, k, 18, 4, { style: 'smoke', size: 4, life: 0.8 }); fxShake(5); break;
        case 'shot':
            pushFxAt(arena, { kind: 'tracer', x: hero.x, y: hero.y, tx, ty, color: el.c2, color2: el.c1, life: 0.18 });
            pushFxAt(arena, { kind: 'ring', x: hero.x, y: hero.y, color: '#fff3b0', radius: 0.6, life: 0.18 });
            fxImpact(arena, tx, ty, k, skill.isUltimate); if (skill.isUltimate) fxShake(4); break;
        case 'claw':
            pushFxAt(arena, { kind: 'claw', x: tx, y: ty, color: el.c2, color2: el.c1, life: 0.3 });
            fxParticles(arena, tx, ty, k, 10, 3, { style: 'drop' }); fxShake(1.5); break;
        case 'chain': {
            const pts = [{ x: hero.x, y: hero.y }]; let cur = target;
            const hit = new Set();
            while (cur && pts.length < 5) { pts.push({ x: cur.x, y: cur.y }); hit.add(cur); cur = enemiesOf(hero).filter(c => c.isAlive() && !hit.has(c) && Math.hypot(c.x - cur.x, c.y - cur.y) <= 3.5).sort((a, b) => Math.hypot(a.x - cur.x, a.y - cur.y) - Math.hypot(b.x - cur.x, b.y - cur.y))[0]; }
            for (let i = 1; i < pts.length; i++) { pushFxAt(arena, { kind: 'zigzag', x: pts[i - 1].x, y: pts[i - 1].y, tx: pts[i].x, ty: pts[i].y, color: el.c2, color2: el.c1, life: 0.3 }, (i - 1) * 0.05); fxParticles(arena, pts[i].x, pts[i].y, k, 5, 3, { delay: (i - 1) * 0.05 }); }
            break;
        }
        case 'sky': {
            const foes = enemiesOf(hero).filter(c => c.isAlive() && Math.hypot(c.x - hero.x, c.y - hero.y) <= 7).slice(0, 8);
            (foes.length ? foes : [{ x: hero.x, y: hero.y }]).forEach((f, i) => { pushFxAt(arena, { kind: 'skybolt', x: f.x, y: f.y, color: el.c2, color2: el.c1, life: 0.35 }, i * 0.07); fxParticles(arena, f.x, f.y, k, 6, 4, { delay: i * 0.07 }); });
            fxShake(6); break;
        }
        case 'heal':
            pushFxAt(arena, { kind: 'ring', x: hero.x, y: hero.y, color: el.c1, radius: 1.4, life: 0.5 });
            fxParticles(arena, hero.x, hero.y, k, 14, 1.5, { style: 'plus', jitter: 1.2, life: 1, size: 4 }); break;
        default: // beam: rayo directo al objetivo
            pushFxAt(arena, { kind: 'tracer', x: hero.x, y: hero.y, tx, ty, color: el.c2, color2: el.c1, life: 0.25, wide: true });
            fxImpact(arena, tx, ty, k);
    }
    if (skill.isUltimate) { fxUltBanner(skill, hero); fxHitStop(0.12); }
}

// --- Ataque básico según el arma (Torre: la que tenés equipada; modo normal: tu héroe) ---
const WEAPON_FX = {
    AXE: { el: 'steel', kind: 'heavy' }, VAMPIRE: { el: 'blood', kind: 'slash' }, SNIPER: { el: 'steel', kind: 'shot' }, ASSASSIN: { el: 'shadow', kind: 'twin' },
    DANCER: { el: 'steel', kind: 'twin' }, ARCANIST: { el: 'arcane', kind: 'orb' }, FROSTWITCH: { el: 'ice', kind: 'orb' }, NECROMANCER: { el: 'shadow', kind: 'scythe' },
    VOIDSAGE: { el: 'void', kind: 'orb' }, ALCHEMIST: { el: 'poison', kind: 'orb' }, ZEUS: { el: 'lightning', kind: 'zap' }, FISTS: { el: 'steel', kind: 'punch' }
};
function weaponFx(hero) {
    const key = gameMode === 'tower' ? (hero.gear && hero.gear.weapon ? hero.gear.weapon.heroKey : 'FISTS') : hero.key;
    return WEAPON_FX[key] || WEAPON_FX.FISTS;
}
function fxHeroAttack(hero, target, isCrit) {
    const arena = fxArena(hero);
    if (!arena) return;
    const w = weaponFx(hero), el = ELEMENTS[w.el], color = isCrit ? '#ffd166' : el.c2;
    const angle = Math.atan2(target.y - hero.y, target.x - hero.x);
    sfx('swing');
    if (w.kind === 'heavy') { pushFxAt(arena, { kind: 'slash', x: target.x, y: target.y, angle, flip: true, color, width: isCrit ? 8 : 6, life: 0.28, scale: 1.3 }); fxParticles(arena, target.x, target.y, w.el, 5, 3); fxShake(isCrit ? 3 : 1); }
    else if (w.kind === 'twin') { [0, 0.07].forEach((d, i) => pushFxAt(arena, { kind: 'slash', x: target.x, y: target.y, angle: angle + (i ? 0.5 : -0.5), flip: i === 0, color: i ? el.c1 : color, width: 3, life: 0.18 }, d)); }
    else if (w.kind === 'scythe') { pushFxAt(arena, { kind: 'crescent', x: target.x, y: target.y, color, color2: el.c1, life: 0.3, small: true }); }
    else if (w.kind === 'punch') { pushFxAt(arena, { kind: 'ring', x: target.x, y: target.y, color, radius: 0.6, life: 0.2 }); fxParticles(arena, target.x, target.y, 'steel', 4, 3, { life: 0.25 }); }
    else { const flip = (hero.fxSlashFlip = !hero.fxSlashFlip); pushFxAt(arena, { kind: 'slash', x: target.x, y: target.y, angle, flip, color: isCrit ? '#ffd166' : el.c1, width: isCrit ? 5 : 3.5, life: 0.22 }); fxParticles(arena, target.x, target.y, w.el, 3, 2.5, { life: 0.3 }); }
    if (isCrit) fxParticles(arena, target.x, target.y, 'lightning', 5, 3);
}
// Disparo del héroe: destello en el arma y, para el rifle y el rayo, la estela al instante
function fxHeroShot(hero, target) {
    const arena = fxArena(hero);
    if (!arena) return;
    const w = weaponFx(hero), el = ELEMENTS[w.el];
    if (w.kind === 'shot') pushFxAt(arena, { kind: 'tracer', x: hero.x, y: hero.y, tx: target.x, ty: target.y, color: el.c2, color2: '#ffd166', life: 0.12 });
    if (w.kind === 'zap') pushFxAt(arena, { kind: 'zigzag', x: hero.x, y: hero.y, tx: target.x, ty: target.y, color: el.c2, color2: el.c1, life: 0.18 });
}
// Impacto de un proyectil (básico o de habilidad)
function fxProjectileHit(p, x, y) {
    const arena = p.attacker && fxArena(p.attacker);
    if (!arena) return;
    const elKey = p.fxEl || (p.attacker.isHero ? weaponFx(p.attacker).el : null);
    if (elKey) fxImpact(arena, x, y, elKey, p.kind === 'skill');
}
// Color y elemento con que se dibuja un proyectil del héroe
function projectileLook(p) {
    const elKey = p.fxEl || (p.attacker && p.attacker.isHero ? weaponFx(p.attacker).el : null);
    return elKey ? ELEMENTS[elKey] : null;
}

// --- Dibujo de las formas (lo llama drawArenaFx) ---
function drawSkillFx(f, t, px, py) {
    const T = TILE, ex = (f.tx ?? f.x) * T + T / 2, ey = (f.ty ?? f.y) * T + T / 2;
    if (f.unit) { px = (f.unit.rx ?? f.unit.x) * T + T / 2; py = (f.unit.ry ?? f.unit.y) * T + T / 2; }
    ctx.lineCap = 'round';
    if (f.kind === 'aura') {
        const r = T * (0.7 + 0.15 * Math.sin(t * 18));
        ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(px, py + T * 0.35, r, r * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = f.color2; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(px, py + T * 0.35 - t * 20, r * 0.8, r * 0.32, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (f.kind === 'bubble') {
        ctx.strokeStyle = f.color; ctx.lineWidth = 2.5; ctx.fillStyle = f.color2;
        ctx.globalAlpha *= 0.35; ctx.beginPath(); ctx.arc(px, py - 4, T * 0.75, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha /= 0.35;
        ctx.beginPath(); ctx.arc(px, py - 4, T * 0.75, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py - 4, T * 0.6, -2.4, -1.6); ctx.stroke();
    } else if (f.kind === 'zone') {
        const pulse = 0.85 + 0.15 * Math.sin(fxClock * 6), r = f.radius * T * pulse;
        ctx.fillStyle = f.color; ctx.globalAlpha *= 0.22; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha /= 0.22;
        ctx.strokeStyle = f.color2; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -fxClock * 30;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        for (let i = 0; i < 3; i++) { const a = fxClock * 2 + i * 2.1; ctx.fillStyle = f.color2; ctx.fillRect(px + Math.cos(a) * r * 0.6 - 1.5, py + Math.sin(a) * r * 0.6 - 1.5, 3, 3); }
    } else if (f.kind === 'afterimage') {
        ctx.strokeStyle = f.color; ctx.lineWidth = 8 * (1 - t); ctx.globalAlpha *= 0.6;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke(); ctx.globalAlpha /= 0.6;
    } else if (f.kind === 'tracer') {
        ctx.strokeStyle = f.color2; ctx.lineWidth = (f.wide ? 7 : 4) * (1 - t); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = f.color; ctx.lineWidth = (f.wide ? 3 : 1.6) * (1 - t); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke();
    } else if (f.kind === 'zigzag' || f.kind === 'skybolt') {
        const sx = f.kind === 'skybolt' ? px + (Math.random() - 0.5) * 10 : px, sy = f.kind === 'skybolt' ? py - T * 6 : py;
        const tx2 = f.kind === 'skybolt' ? px : ex, ty2 = f.kind === 'skybolt' ? py : ey;
        const seg = 7, pts = [[sx, sy]];
        for (let i = 1; i < seg; i++) { const k2 = i / seg; pts.push([sx + (tx2 - sx) * k2 + (Math.random() - 0.5) * 14, sy + (ty2 - sy) * k2 + (Math.random() - 0.5) * 14]); }
        pts.push([tx2, ty2]);
        [[f.color2, 5], [f.color, 2]].forEach(([c, w]) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y)); ctx.stroke(); });
        if (f.kind === 'skybolt' && t < 0.3) { ctx.fillStyle = '#ffffff'; ctx.globalAlpha *= 0.5; ctx.beginPath(); ctx.arc(px, py, T * 0.8, 0, Math.PI * 2); ctx.fill(); }
    } else if (f.kind === 'streak') {
        const k2 = Math.min(1, t * 1.2), hx = px + (ex - px) * k2, hy = py + (ey - py) * k2;
        ctx.strokeStyle = f.color; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(px + (ex - px) * Math.max(0, k2 - 0.4), py + (ey - py) * Math.max(0, k2 - 0.4)); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2); ctx.fill();
    } else if (f.kind === 'crescent') {
        const r = T * (f.small ? 0.8 : 1.4), a0 = -2.4 + t * 1.5;
        ctx.fillStyle = f.color2; ctx.beginPath(); ctx.arc(px, py, r, a0, a0 + 2.6); ctx.arc(px + r * 0.25, py - r * 0.1, r * 0.82, a0 + 2.6, a0, true); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = f.color; ctx.lineWidth = 2; ctx.stroke();
    } else if (f.kind === 'claw') {
        ctx.strokeStyle = f.color; ctx.lineWidth = 4 * (1 - t * 0.5);
        for (let i = -1; i <= 1; i++) { const k2 = Math.min(1, t * 3); ctx.beginPath(); ctx.moveTo(px - 12 + i * 7, py - 14); ctx.lineTo(px - 12 + i * 7 + 22 * k2, py - 14 + 26 * k2); ctx.stroke(); }
    }
    ctx.lineCap = 'butt';
}
// Partículas con estilo del elemento
function drawStyledParticle(f, t, px, py) {
    const s = f.size;
    ctx.fillStyle = f.color; ctx.strokeStyle = f.color;
    switch (f.style) {
        case 'ember': ctx.beginPath(); ctx.arc(px, py, s * 0.7, 0, Math.PI * 2); ctx.fill(); break;
        case 'shard': ctx.save(); ctx.translate(px, py); ctx.rotate(f.rot); ctx.beginPath(); ctx.moveTo(0, -s * 1.4); ctx.lineTo(s * 0.6, 0); ctx.lineTo(0, s * 1.4); ctx.lineTo(-s * 0.6, 0); ctx.closePath(); ctx.fill(); ctx.restore(); break;
        case 'spark': ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - f.vx * 2.2, py - f.vy * 2.2); ctx.stroke(); break;
        case 'bubble': ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(px, py, s * 0.9, 0, Math.PI * 2); ctx.stroke(); break;
        case 'rune': ctx.save(); ctx.translate(px, py); ctx.rotate(f.rot + t * 4); ctx.lineWidth = 1.4; ctx.strokeRect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4); ctx.restore(); break;
        case 'smoke': ctx.globalAlpha *= 0.45; ctx.beginPath(); ctx.arc(px, py, s * (1 + t * 1.5), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha /= 0.45; break;
        case 'drop': ctx.beginPath(); ctx.arc(px, py, s * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(px - s * 0.5, py); ctx.lineTo(px, py - s * 1.4); ctx.lineTo(px + s * 0.5, py); ctx.fill(); break;
        case 'plus': ctx.font = `bold ${Math.round(s * 3)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.fillText('+', px, py); break;
        case 'swirl': ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(px, py, s, f.rot + t * 6, f.rot + t * 6 + 3.5); ctx.stroke(); break;
        default: ctx.fillRect(px - s / 2, py - s / 2, s, s);
    }
}
// Cartel de la definitiva (cx, cy: centro en pantalla)
function drawUltBanner(cx, cy) {
    if (!fxBanner) return;
    const t = (fxClock - fxBanner.at) / 1.4;
    if (t > 1) { fxBanner = null; return; }
    const slide = t < 0.15 ? (0.15 - t) / 0.15 : t > 0.85 ? -(t - 0.85) / 0.15 : 0, alpha = Math.max(0, 1 - Math.abs(slide));
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx + slide * 200, cy);
    ctx.fillStyle = 'rgba(29,23,18,0.82)'; ctx.beginPath(); ctx.moveTo(-260, -22); ctx.lineTo(250, -26); ctx.lineTo(262, 20); ctx.lineTo(-250, 24); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = fxBanner.color; ctx.lineWidth = 3; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 26px Georgia, serif'; ctx.lineWidth = 4; ctx.strokeStyle = '#1d1712'; ctx.strokeText(fxBanner.text.toUpperCase(), 0, 0);
    ctx.fillStyle = '#f3e7c9'; ctx.fillText(fxBanner.text.toUpperCase(), 0, 0);
    ctx.restore();
}

// --- ESTADOS VISIBLES SOBRE LAS UNIDADES ---
// Aturdido (estrellas), frenado (escarcha a los pies), veneno (burbujas), quemado (llamitas), sangrado (gotas),
// escudo/reducción de daño (burbuja), apurado (líneas de velocidad), provocando (signo rojo).
function drawStatusFx(u, cx, cy, half) {
    if (u.elMark) drawElementMark(u, cx, cy, half);
    const eff = activeEffects(u);
    if (!eff.length) return;
    const has = id => eff.some(e => e.id === id), flag = f => eff.some(e => e.flags.includes(f));
    const feet = cy + TILE * 0.38, head = cy - half - 8;
    ctx.save();
    if (flag('stun')) for (let i = 0; i < 3; i++) { const a = fxClock * 5 + i * 2.1; ctx.fillStyle = '#ffd166'; ctx.font = 'bold 11px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('✦', cx + Math.cos(a) * 11, head + Math.sin(a) * 4); }
    const move = effMoveMult(u);
    if (move < 0.95 || has('CHILL')) { ctx.fillStyle = 'rgba(144,224,239,0.45)'; ctx.beginPath(); ctx.ellipse(cx, feet, TILE * 0.42, TILE * 0.14, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#e9f5ff'; ctx.lineWidth = 1.2; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 8, feet - 4); ctx.lineTo(cx + i * 8 + 2, feet - 9); ctx.stroke(); } }
    if (move > 1.05 || sumMod(u, 'atkSpeedPct') > 0.1) { ctx.strokeStyle = 'rgba(243,231,201,0.8)'; ctx.lineWidth = 1.4; const f = -(u.facing || 1); for (let i = 0; i < 3; i++) { const y = cy - 6 + i * 7, x0 = cx + f * (12 + ((fxClock * 40 + i * 9) % 10)); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + f * 10, y); ctx.stroke(); } }
    const dot = (id, color, style) => { if (!has(id)) return; for (let i = 0; i < 3; i++) { const k = (fxClock * 0.9 + i / 3) % 1, x = cx - 8 + i * 8, y = cy - k * half * 0.9; ctx.globalAlpha = 1 - k; ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1.3;
        if (style === 'bubble') { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.stroke(); } else if (style === 'flame') { ctx.beginPath(); ctx.moveTo(x - 3, y + 3); ctx.quadraticCurveTo(x, y - 7, x + 3, y + 3); ctx.fill(); } else { ctx.beginPath(); ctx.arc(x, cy - half * 0.5 + k * half, 2, 0, Math.PI * 2); ctx.fill(); } } ctx.globalAlpha = 1; };
    dot('POISON', '#7ac74f', 'bubble'); dot('BURN', '#e85d04', 'flame'); dot('BLEED', '#c1121f', 'drop');
    if (effDmgReduction(u) > 0 || flag('invulnerable')) { ctx.strokeStyle = flag('invulnerable') ? '#ffd166' : 'rgba(157,78,221,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy - half * 0.3, half * 0.85, 0, Math.PI * 2); ctx.stroke(); }
    if (flag('taunt')) { ctx.fillStyle = '#9b2226'; ctx.font = 'bold 14px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('!', cx + 12, head); }
    ctx.restore();
}
// Marca de elemento (para las reacciones): rombo del color del elemento arriba de la cabeza
function drawElementMark(u, cx, cy, half) {
    const m = u.elMark;
    if (!m || gameClock >= m.until) return;
    const el = ELEMENTS[m.el], x = cx - 14, y = cy - half - 6;
    ctx.save(); ctx.fillStyle = el.c1; ctx.strokeStyle = el.c2; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 4, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
}

// --- REACCIONES ELEMENTALES (Tower Chaos) ---
// Una habilidad que daña marca al enemigo con su elemento (5 s). Si otra de OTRO elemento le pega mientras tiene la
// marca, se produce una reacción y la marca se consume (como en Magicka, Divinity o Genshin). Premia combinar
// habilidades de héroes distintos en el equipo. Los ataques básicos no marcan.
const ELEMENT_NAMES = { fire: 'Fuego', ice: 'Hielo', lightning: 'Rayo', poison: 'Veneno', arcane: 'Arcano', shadow: 'Sombra', blood: 'Sangre', steel: 'Acero', holy: 'Luz', void: 'Vacío' };
const REACTIONS = {
    'fire+ice': { name: 'Derretir', desc: 'el golpe hace +60% de daño', mult: 1.6 },
    'fire+poison': { name: 'Explosión Tóxica', desc: 'explota: 50% del golpe a los de alrededor (radio 2)', after: (src, t, dealt) => reactionSplash(src, t, dealt * 0.5, 2) },
    'ice+lightning': { name: 'Fragmentar', desc: 'aturde 1,2 s', after: (src, t) => addEffect(t, { id: 'STUN', name: 'Fragmentado', duration: 1.2, flags: ['stun'] }) },
    'lightning+poison': { name: 'Sobrecarga', desc: 'salta al 40% a 2 enemigos cercanos', after: (src, t, dealt) => reactionChain(src, t, dealt * 0.4, 2) },
    'fire+lightning': { name: 'Plasma', desc: 'el golpe hace +40% y quema', mult: 1.4, after: (src, t) => creepDot(src, t, 'BURN', 'Quemado', 0.25) },
    'blood+shadow': { name: 'Cosecha', desc: 'te curás el 35% del golpe', after: (src, t, dealt) => healUnit(src, dealt * 0.35) },
    'blood+steel': { name: 'Desgarro', desc: 'sangra fuerte (3 s)', after: (src, t) => creepDot(src, t, 'BLEED', 'Desgarrado', 0.35) },
    'ice+steel': { name: 'Quebrar', desc: 'el golpe hace +50% de daño', mult: 1.5 },
    'poison+shadow': { name: 'Plaga', desc: 'el veneno se contagia a los de alrededor', after: (src, t) => enemiesOf(src).filter(c => c.isAlive() && c !== t && Math.hypot(c.x - t.x, c.y - t.y) <= 2.5).forEach(c => creepDot(src, c, 'POISON', 'Plaga', 0.3)) },
    'arcane': { name: 'Desestabilizar', desc: 'recibe +25% de daño por 4 s', after: (src, t) => addEffect(t, { id: 'UNSTABLE', name: 'Desestabilizado', duration: 4, tags: ['PERJUICIO'], mods: { dmgTakenPct: 0.25 } }) },
    'void': { name: 'Implosión', desc: 'atrae a los de alrededor y les pega el 30%', after: (src, t, dealt) => reactionSplash(src, t, dealt * 0.3, 2.5, true) }
};
let projectileElement = null;
function currentDamageElement() { return fxCastingSkill ? skillVfx(fxCastingSkill).el : projectileElement; }
function reactionFor(a, b) {
    if (a === b) return null;
    const key = [a, b].sort().join('+');
    if (REACTIONS[key]) return REACTIONS[key];
    if (a === 'void' || b === 'void') return REACTIONS.void;     // el vacío reacciona con todo
    if (a === 'arcane' || b === 'arcane') return REACTIONS.arcane; // lo arcano también
    return null;
}
// Antes del golpe: multiplicador de la reacción (y la deja preparada para después del golpe)
function elementReactionMult(source, target) {
    if (gameMode !== 'tower' || !source || !source.isHero || target.isHero) return 1;
    const el = currentDamageElement();
    if (!el || el === 'holy') return 1;
    const mark = target.elMark && gameClock < target.elMark.until ? target.elMark.el : null;
    const r = mark && reactionFor(mark, el);
    if (!r) { target.elMark = { el, until: gameClock + 5 }; return 1; }
    target.elMark = null;
    target.pendingReaction = { r, a: mark, b: el };
    return r.mult || 1;
}
// Después del golpe: efecto de la reacción, cartel y aviso la primera vez
function elementReactionAfter(source, target, dealt) {
    const p = target.pendingReaction;
    if (!p) return;
    target.pendingReaction = null;
    const prevEl = projectileElement, prevSkill = fxCastingSkill;
    projectileElement = null; fxCastingSkill = null; // el daño de la reacción no marca ni reacciona
    try { if (p.r.after) p.r.after(source, target, dealt); } finally { projectileElement = prevEl; fxCastingSkill = prevSkill; }
    const arena = fxArena(target);
    if (arena) { fxText(target, p.r.name + '!', ELEMENTS[p.b].c1, 14, 1.2); fxImpact(arena, target.x, target.y, p.b, true); fxParticles(arena, target.x, target.y, p.a, 10, 4); }
    if (towerRun) {
        towerRun.reactions = towerRun.reactions || {};
        if (!towerRun.reactions[p.r.name]) log(`⚗️ ¡Descubriste una reacción: ${p.r.name}! (${ELEMENT_NAMES[p.a]} + ${ELEMENT_NAMES[p.b]}: ${p.r.desc}).`);
        towerRun.reactions[p.r.name] = (towerRun.reactions[p.r.name] || 0) + 1;
    }
}
function reactionSplash(src, t, dmg, radius, pull = false) {
    enemiesOf(src).filter(c => c.isAlive() && c !== t && Math.hypot(c.x - t.x, c.y - t.y) <= radius).forEach(c => {
        if (pull) { const dx = Math.sign(t.x - c.x), dy = Math.sign(t.y - c.y); if (walkable(c.arena, c.x + dx, c.y + dy)) { c.x += dx; c.y += dy; } }
        dealDamage(src, c, Math.max(1, Math.round(dmg)), 'magical');
    });
}
function reactionChain(src, t, dmg, n) {
    const arena = fxArena(t);
    enemiesOf(src).filter(c => c.isAlive() && c !== t && Math.hypot(c.x - t.x, c.y - t.y) <= 4).slice(0, n).forEach(c => {
        if (arena) pushFxAt(arena, { kind: 'zigzag', x: t.x, y: t.y, tx: c.x, ty: c.y, color: ELEMENTS.lightning.c2, color2: ELEMENTS.lightning.c1, life: 0.25 });
        dealDamage(src, c, Math.max(1, Math.round(dmg)), 'magical');
    });
}

// --- SENSACIÓN DE JUEGO (pedido del usuario, 2026-10-07: "los hechizos se sienten planos y los controles raros") ---
// Controles estilo Hades: WASD mueve, el mouse apunta, las habilidades salen al instante hacia el cursor, Espacio es
// el esquive. Cada habilidad mueve el cuerpo del héroe según su forma, los enemigos se sacuden y retroceden.

// Pose del héroe al lanzar, según la forma de la habilidad
const CAST_POSE = {
    strike: 'lunge', claw: 'lunge', reap: 'lunge', whirl: 'spin', dash: 'dashpose', blink: 'dashpose',
    proj: 'recoil', shot: 'recoil', beam: 'recoil', cone: 'recoil', chain: 'recoil',
    nova: 'slam', shout: 'slam', zone: 'slam', aura: 'power', shield: 'power', heal: 'power', meteor: 'raise', sky: 'raise'
};
Object.assign(ATTACK_ANIM, { lunge: 0.32, spin: 0.38, recoil: 0.26, slam: 0.42, power: 0.5, raise: 0.55, dashpose: 0.28 });
// Pose de las animaciones nuevas (la llama attackPose en fx.js). t: 0 → 1, k = sin(t·π)
function castPose(a, t, k, pose) {
    switch (a.kind) {
        case 'lunge': pose.ox += a.dx * 0.62 * k; pose.oy += a.dy * 0.62 * k; pose.rot += 0.5 * k; pose.sx += 0.22 * k; pose.sy -= 0.1 * k; break;
        case 'spin': pose.rot += t * Math.PI * 2; pose.sy -= 0.08 * k; pose.oy -= 0.1 * k; break;
        case 'recoil': pose.ox -= a.dx * 0.32 * k; pose.oy -= a.dy * 0.32 * k; pose.rot -= 0.18 * k * (a.dx || 1); pose.flash = t < 0.3 ? 1 - t / 0.3 : 0; break;
        case 'slam': // se agacha, salta y cae aplastado
            if (t < 0.35) { const c = t / 0.35; pose.sy -= 0.25 * c; pose.sx += 0.18 * c; }
            else if (t < 0.75) { const j = Math.sin((t - 0.35) / 0.4 * Math.PI); pose.oy -= 0.45 * j; pose.sy += 0.15 * j; pose.sx -= 0.08 * j; }
            else { const c = 1 - (t - 0.75) / 0.25; pose.sy -= 0.2 * c; pose.sx += 0.2 * c; }
            pose.glow = a.color; break;
        case 'power': pose.oy -= 0.18 * k; pose.sx += 0.1 * Math.sin(t * 20) * k; pose.sy += 0.12 * k; pose.glow = a.color; break;
        case 'raise': pose.oy -= 0.38 * k; pose.sy += 0.2 * k; pose.sx -= 0.06 * k; pose.glow = a.color; break;
        case 'dashpose': pose.sx += 0.4 * k; pose.sy -= 0.18 * k; pose.ox += a.dx * 0.2 * k; break;
    }
    return pose;
}
// Los golpeados se sacuden hacia atrás (solo visual) y, con habilidades de impacto en la Torre, retroceden una casilla
const KNOCK_SHAPES = new Set(['strike', 'claw', 'reap', 'whirl', 'nova', 'shout', 'meteor', 'sky', 'cone', 'dash']);
function hitFlinch(source, target) {
    if (!source || !fxArena(target)) return;
    const d = Math.hypot(target.x - source.x, target.y - source.y) || 1;
    target.fxKnock = { dx: (target.x - source.x) / d, dy: (target.y - source.y) / d, at: fxClock };
}
function skillKnockback(source, target) {
    if (gameMode !== 'tower' || source !== player || !fxCastingSkill || !target.isAlive() || target.isHero) return;
    if (target.isGuardian || target.isCaveBoss || target.isBoss || !KNOCK_SHAPES.has(skillVfx(fxCastingSkill).shape)) return;
    const dx = Math.sign(target.x - source.x), dy = Math.sign(target.y - source.y);
    if ((dx || dy) && walkable(target.arena, target.x + dx, target.y + dy)) { target.x += dx; target.y += dy; }
}
function flinchOffset(u) {
    const f = u.fxKnock;
    if (!f) return null;
    const t = (fxClock - f.at) / 0.16;
    if (t >= 1) { u.fxKnock = null; return null; }
    const k = Math.sin(t * Math.PI) * 0.18;
    return { ox: f.dx * k, oy: f.dy * k };
}

// --- ESQUIVE (Espacio) ---
const DASH = { tiles: 3, cooldown: 1.1, iframes: 0.3 };
// Hacia donde apunta el cursor, en casillas del mundo (se recalcula con la cámara)
function cursorWorld() { return mouse.over && mouse.fx !== undefined ? { x: mouse.fx * VIEW_COLS - 0.5 + camera.x, y: mouse.fy * VIEW_ROWS - 0.5 + camera.y } : null; }
function playerDash() {
    if (!canControlPlayer() || hasFlag(player, 'stun') || gameClock < (player.dashReadyAt || 0)) return false;
    let d = keyboardDirection();
    if (!d.dx && !d.dy) { const c = cursorWorld(); d = c ? { dx: Math.sign(Math.round(c.x - player.x)), dy: Math.sign(Math.round(c.y - player.y)) } : { dx: player.facing || 1, dy: 0 }; }
    if (!d.dx && !d.dy) d = { dx: player.facing || 1, dy: 0 };
    const arena = player.arena, from = { x: player.x, y: player.y };
    let moved = 0;
    for (let i = 0; i < DASH.tiles; i++) {
        const nx = player.x + d.dx, ny = player.y + d.dy;
        if (!walkable(arena, nx, ny) || (d.dx && d.dy && (!walkable(arena, nx, player.y) || !walkable(arena, player.x, ny)))) break;
        player.x = nx; player.y = ny; moved++;
    }
    if (!moved) return false;
    player.dashReadyAt = gameClock + DASH.cooldown;
    player.moveTarget = null; player.moveTimer = 0;
    addEffect(player, { id: 'DASH', name: 'Esquive', duration: DASH.iframes, flags: ['invulnerable', 'phasing'], tags: ['MEJORA'] });
    if (d.dx) player.facing = d.dx;
    const fa = fxArena(player);
    if (fa) {
        pushFxAt(fa, { kind: 'afterimage', x: from.x, y: from.y, tx: player.x, ty: player.y, color: '#f3e7c9', life: 0.3 });
        fxParticles(fa, from.x, from.y, 'steel', 8, 2, { style: 'smoke', size: 3.5, life: 0.5 });
        player.fxAttack = { kind: 'dashpose', dx: d.dx, dy: d.dy, at: fxClock };
        sfx('dash');
    }
    emit(player, 'onMove', { steps: moved });
    return true;
}
// Recarga del esquive: arquito a los pies del héroe mientras se recarga
function drawDashMeter(u, cx, cy) {
    if (u !== player || !u.dashReadyAt || gameClock >= u.dashReadyAt) return;
    const left = (u.dashReadyAt - gameClock) / DASH.cooldown;
    ctx.save(); ctx.strokeStyle = 'rgba(243,231,201,0.9)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy + TILE * 0.38, TILE * 0.32, Math.PI * 0.15, Math.PI * 0.15 + Math.PI * 1.7 * (1 - left)); ctx.stroke(); ctx.restore();
}
