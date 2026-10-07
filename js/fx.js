// Efectos visuales del combate: números de daño, partículas, anillos de hechizo, temblor de pantalla, golpe (lunge),
// destello al recibir daño, movimiento suave y fondo de cada arena. Son SOLO visuales: no cambian ninguna regla.
//
//   Se generan desde los eventos del juego (dealDamage, healUnit, killCreep, tryCastSkill, gainXp, jefes...) pero solo
//   para la arena que se está mirando (el resto no dibuja nada, así las 8 arenas en paralelo no cuestan de más).
//   Corren con su propio reloj (fxClock, en segundos reales) que avanza al dibujar.

const FX = { enabled: true, maxPerArena: 160 };
const DMG_COLORS = { physical: '#ff9f1c', magical: '#c77dff', pure: '#ffffff' };
const SKILL_FX_COLORS = { 'MÁGICO': '#c77dff', 'FÍSICO': '#ff9f1c', 'PURO': '#ffffff', 'CURACIÓN': '#80ffdb' };

let fxClock = 0, fxLastFrame = 0, shakeAmount = 0;

// Arena donde dibujar el efecto de esta unidad (null si no es la que se está mirando).
function fxArena(unit) {
    const arena = unit && unit.arena;
    return FX.enabled && arena && arena === viewArena() ? arena : null;
}
function pushFx(arena, fx) {
    arena.fx = arena.fx || [];
    if (arena.fx.length >= FX.maxPerArena) arena.fx.shift();
    fx.born = fxClock;
    arena.fx.push(fx);
}

// --- EFECTOS QUE DISPARA EL JUEGO ---
function fxText(unit, text, color, size = 12, life = 0.9) {
    const arena = fxArena(unit);
    if (arena) pushFx(arena, { kind: 'text', x: unit.x + (Math.random() - 0.5) * 0.5, y: unit.y - 0.4, text, color, size, life });
}

function fxDamage(target, amount, type, isCrit) {
    const arena = fxArena(target);
    if (!arena || amount <= 0) return;
    target.fxHitAt = fxClock;
    sfx(isCrit ? 'crit' : target.isHero ? 'heroHit' : 'hit');
    const color = target.isHero ? '#ff477e' : DMG_COLORS[type] || '#fff';
    pushFx(arena, { kind: 'text', x: target.x + (Math.random() - 0.5) * 0.6, y: target.y - 0.4, text: isCrit ? `${amount}!` : `${amount}`, color, size: isCrit ? 18 : 12, life: isCrit ? 1.1 : 0.8 });
    if (isCrit) { fxBurst(target, '#ffd166', 6, 3); fxShake(2.5); if (!target.isHero) fxHitStop(0.04); }
}

function fxHeal(unit, amount) { if (amount >= 3) fxText(unit, `+${amount}`, '#72efdd', 11, 0.8); }

// Partículas que salen disparadas desde la unidad.
function fxBurst(unit, color, count = 10, speed = 4) {
    const arena = fxArena(unit);
    if (!arena) return;
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
        pushFx(arena, { kind: 'particle', x: unit.x, y: unit.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color, life: 0.35 + Math.random() * 0.35, size: 1.5 + Math.random() * 2 });
    }
}

// Anillo que se expande (hechizos, golpes de área). radius en casillas.
function fxRing(unit, color, radius = 1.6, life = 0.45) {
    const arena = fxArena(unit);
    if (arena) pushFx(arena, { kind: 'ring', x: unit.x, y: unit.y, color, radius, life });
}

function fxDeath(unit) {
    if (fxArena(unit)) sfx(unit.isHero ? 'death' : 'pop');
    fxBurst(unit, unit.color || '#ff477e', unit.isHero ? 22 : 12, unit.isHero ? 5 : 3.5);
    if (unit.isHero) fxShake(5);
}

// --- ANIMACIÓN DE ATAQUE (sirve para cualquier sprite: se anima con movimiento, giro y estiramiento) ---
//   kind 'melee'  golpe: se estira y gira hacia el objetivo (y antes se echa atrás, ver attackPose)
//   kind 'ranged' disparo: retroceso y fogonazo, y una estela hasta el objetivo
//   kind 'cast'   hechizo: se eleva y brilla del color de su magia, y un rayo hasta el objetivo
const ATTACK_ANIM = { melee: 0.26, ranged: 0.2, cast: 0.34 };
function fxAttack(attacker, target, kind = 'melee', color) {
    const arena = fxArena(attacker);
    if (!arena) return;
    const d = Math.hypot(target.x - attacker.x, target.y - attacker.y) || 1;
    if (target.x !== attacker.x) attacker.facing = Math.sign(target.x - attacker.x); // mira a quien ataca
    attacker.fxAttack = { kind, dx: (target.x - attacker.x) / d, dy: (target.y - attacker.y) / d, at: fxClock, color };
    // Estela hasta el objetivo (los héroes no: ya tienen su proyectil propio)
    if (kind !== 'melee' && !attacker.isHero) pushFx(arena, { kind: 'bolt', x: attacker.x, y: attacker.y, tx: target.x, ty: target.y, color: color || '#fefae0', cast: kind === 'cast', life: kind === 'cast' ? 0.24 : 0.14 });
}
// Compatibilidad: el "salto" de antes ahora es la animación de golpe.
function fxLunge(attacker, target) { fxAttack(attacker, target, 'melee'); }

// Pose del momento: desplazamiento (casillas), giro, estiramiento y brillo. Antes del golpe se echa atrás
// según cuánto le falta al próximo ataque (attackTimer), así se anticipa.
function attackPose(u) {
    const pose = { ox: 0, oy: 0, rot: 0, sx: 1, sy: 1, glow: null, flash: 0 };
    const a = u.fxAttack;
    const atkSpeed = u.isHero ? effAtkSpeed(u) : (u.atkSpeed ? effAtkSpeed(u) : 0);
    const frac = atkSpeed ? (u.attackTimer || 0) * atkSpeed : 0;
    const wind = frac > 0.6 && frac < 1 && inCombat() ? (frac - 0.6) / 0.4 : 0;
    const dir = a || { dx: u.facing || 1, dy: 0 };
    if (wind > 0 && (!a || a.kind === 'melee')) { // preparación: se echa atrás y se comprime
        pose.ox -= dir.dx * 0.12 * wind; pose.oy -= dir.dy * 0.12 * wind;
        pose.rot -= 0.2 * wind; pose.sx += 0.08 * wind; pose.sy -= 0.08 * wind;
    }
    if (!a) return pose;
    const t = (fxClock - a.at) / ATTACK_ANIM[a.kind];
    if (t >= 1) { u.fxAttack = null; return pose; }
    const k = Math.sin(t * Math.PI);
    if (a.kind === 'melee') { pose.ox += a.dx * 0.42 * k; pose.oy += a.dy * 0.42 * k; pose.rot += 0.35 * k; pose.sx += 0.14 * k; pose.sy -= 0.06 * k; }
    else if (a.kind === 'ranged') { pose.ox -= a.dx * 0.16 * k; pose.oy -= a.dy * 0.16 * k; pose.flash = t < 0.35 ? 1 - t / 0.35 : 0; }
    else { pose.oy -= 0.22 * k; pose.sy += 0.1 * k; pose.glow = a.color || '#c77dff'; }
    return pose;
}

// Tajo de un ataque cuerpo a cuerpo: un arco que barre sobre el objetivo, del color de quien pega (dorado si es crítico).
function fxSlash(attacker, target, color, isCrit) {
    const arena = fxArena(attacker);
    if (!arena) return;
    sfx('swing');
    const angle = Math.atan2(target.y - attacker.y, target.x - attacker.x);
    const flip = (attacker.fxSlashFlip = !attacker.fxSlashFlip); // alterna el sentido del tajo en cada golpe
    pushFx(arena, { kind: 'slash', x: target.x, y: target.y, angle, flip, color: isCrit ? '#ffd166' : color, width: isCrit ? 5 : 3.5, life: 0.22 });
    if (isCrit) fxBurst(target, '#ffd166', 5, 3);
}

function fxShake(amount) {
    shakeAmount = Math.max(shakeAmount, amount);
    if (amount >= 4) sfx('boom');
}

function fxCast(hero, skill, from) {
    if (fxArena(hero)) sfx(skill.isUltimate ? 'ult' : 'cast');
    fxSkill(hero, skill, from); // cada habilidad con su forma y su elemento (fxSkills.js)
}

// --- ACTUALIZAR Y DIBUJAR ---
// Avanza el reloj visual; devuelve el dt real del cuadro (limitado para que un salto de pestaña no rompa nada).
function tickFx() {
    const now = performance.now() / 1000;
    const dt = fxLastFrame && !paused ? Math.min(0.1, now - fxLastFrame) : 0; // en pausa, los efectos se congelan
    fxLastFrame = now;
    fxClock += dt;
    shakeAmount *= Math.pow(0.02, dt); // se calma rápido
    if (shakeAmount < 0.2) shakeAmount = 0;
    return dt;
}

function updateArenaFx(arena, dt) {
    if (!arena.fx) return;
    arena.fx = arena.fx.filter(f => fxClock - f.born < f.life);
    arena.fx.forEach(f => {
        if (f.kind === 'particle' && f.born <= fxClock) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= Math.pow(0.05, dt); f.vy *= Math.pow(0.05, dt); }
        if (f.kind === 'text') f.y -= 1.1 * dt;
    });
}

function drawArenaFx(arena) {
    (arena.fx || []).forEach(f => {
        const t = (fxClock - f.born) / f.life; // 0 → 1
        if (t < 0) return; // todavía no empezó (efecto con retardo)
        const px = f.x * TILE + TILE / 2, py = f.y * TILE + TILE / 2;
        ctx.globalAlpha = Math.max(0, 1 - t * t);
        if (f.kind === 'text') {
            ctx.font = `bold ${Math.round(f.size * (t < 0.15 ? 1 + (0.15 - t) * 3 : 1))}px ${gameMode === 'tower' ? 'Georgia, serif' : 'monospace'}`;
            ctx.lineWidth = 3; ctx.strokeStyle = gameMode === 'tower' ? '#1d1712' : 'rgba(0,0,0,0.8)'; ctx.strokeText(f.text, px, py);
            ctx.fillStyle = f.color; ctx.fillText(f.text, px, py);
        } else if (f.kind === 'particle') {
            if (f.style) drawStyledParticle(f, t, px, py);
            else { ctx.fillStyle = f.color; ctx.fillRect(px - f.size / 2, py - f.size / 2, f.size, f.size); }
        } else if (f.kind === 'slash') {
            // El arco barre 140° alrededor del objetivo, perpendicular a la dirección del golpe
            const sweep = Math.PI * 0.78, start = f.angle + Math.PI - sweep / 2, dir = f.flip ? 1 : -1;
            const from = f.flip ? start : start + sweep, head = Math.min(1, t * 2.2), tail = Math.max(0, t * 2.2 - 0.6);
            ctx.strokeStyle = f.color; ctx.lineWidth = f.width * (1 - t * 0.6); ctx.lineCap = 'round';
            ctx.shadowColor = f.color; ctx.shadowBlur = 8;
            ctx.beginPath();
            const a0 = from + dir * sweep * tail, a1 = from + dir * sweep * head;
            ctx.arc(px, py, TILE * 0.62 * (f.scale || 1), Math.min(a0, a1), Math.max(a0, a1));
            ctx.stroke();
            ctx.shadowBlur = 0; ctx.lineCap = 'butt';
        } else if (f.kind === 'bolt') {
            // Estela de un disparo o rayo de un hechizo, del atacante al objetivo
            const ex = f.tx * TILE + TILE / 2, ey = f.ty * TILE + TILE / 2, head = Math.min(1, t * 2.5);
            const hx = px + (ex - px) * head, hy = py + (ey - py) * head;
            ctx.strokeStyle = f.color; ctx.lineCap = 'round'; ctx.shadowColor = f.color; ctx.shadowBlur = f.cast ? 10 : 4;
            ctx.lineWidth = f.cast ? 3 : 2; ctx.beginPath(); ctx.moveTo(px + (ex - px) * Math.max(0, head - 0.35), py + (ey - py) * Math.max(0, head - 0.35)); ctx.lineTo(hx, hy); ctx.stroke();
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(hx, hy, f.cast ? 3.5 : 2.2, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; ctx.lineCap = 'butt';
        } else if (f.kind === 'ring') {
            ctx.strokeStyle = f.color; ctx.lineWidth = 3 * (1 - t) + 1;
            ctx.beginPath(); ctx.arc(px, py, f.radius * TILE * (0.3 + 0.7 * t), 0, Math.PI * 2); ctx.stroke();
        } else drawSkillFx(f, t, px, py); // formas de habilidad (fxSkills.js)
    });
    ctx.globalAlpha = 1;
    if (gameMode !== 'tower') drawUltBanner(MAP_W / 2, MAP_H * 0.72); // en la Torre va encima de la niebla (renderTower)
}

// Posición dibujada de una unidad: se desliza hacia su casilla (movimiento suave) + el salto del golpe.
function drawPos(u, dt) {
    if (u.rx === undefined || Math.abs(u.rx - u.x) > 3 || Math.abs(u.ry - u.y) > 3) { u.rx = u.x; u.ry = u.y; } // teletransportes: sin deslizar
    const moveX = u.x - u.rx;
    if (Math.abs(moveX) > 0.05) u.facing = Math.sign(moveX); // mira hacia donde camina
    // Se desliza a velocidad constante hacia su casilla: llega justo cuando empieza el paso siguiente, así caminar
    // seguido se ve continuo (antes llegaba rápido y esperaba: se notaba casilla por casilla). Si quedó muy atrás
    // (empujones, un paso doble), alcanza más rápido.
    const step = Math.max(0.05, unitStepTime(u));
    const behind = Math.max(Math.abs(u.x - u.rx), Math.abs(u.y - u.ry));
    const speed = (1 / step) * 1.02 * (behind > 1.2 ? 3 : 1);
    const toward = (from, to) => { const d = to - from, m = speed * dt; return Math.abs(d) <= m ? to : from + Math.sign(d) * m; };
    u.rx = toward(u.rx, u.x); u.ry = toward(u.ry, u.y);
    const pose = attackPose(u);
    return { x: u.rx + pose.ox, y: u.ry + pose.oy, pose };
}

// Los fondos de las arenas están en scenery.js.
