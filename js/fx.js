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
    if (isCrit) { fxBurst(target, '#ffd166', 6, 3); fxShake(2.5); }
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

// El atacante "salta" hacia su objetivo al golpear.
function fxLunge(attacker, target) {
    if (!fxArena(attacker)) return;
    const d = Math.hypot(target.x - attacker.x, target.y - attacker.y) || 1;
    attacker.fxLunge = { dx: (target.x - attacker.x) / d, dy: (target.y - attacker.y) / d, at: fxClock };
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

function fxCast(hero, skill) {
    const tag = (skill.tags || []).find(t => SKILL_FX_COLORS[t]);
    const color = tag ? SKILL_FX_COLORS[tag] : '#00f5d4';
    if (fxArena(hero)) sfx(skill.isUltimate ? 'ult' : 'cast');
    fxRing(hero, color, skill.isUltimate ? 3.2 : 1.8, skill.isUltimate ? 0.7 : 0.45);
    if (skill.isUltimate) { fxBurst(hero, color, 18, 5); fxShake(3); }
}

// --- ACTUALIZAR Y DIBUJAR ---
// Avanza el reloj visual; devuelve el dt real del cuadro (limitado para que un salto de pestaña no rompa nada).
function tickFx() {
    const now = performance.now() / 1000;
    const dt = fxLastFrame ? Math.min(0.1, now - fxLastFrame) : 0;
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
        if (f.kind === 'particle') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= Math.pow(0.05, dt); f.vy *= Math.pow(0.05, dt); }
        if (f.kind === 'text') f.y -= 1.1 * dt;
    });
}

function drawArenaFx(arena) {
    (arena.fx || []).forEach(f => {
        const t = (fxClock - f.born) / f.life; // 0 → 1
        const px = f.x * TILE + TILE / 2, py = f.y * TILE + TILE / 2;
        ctx.globalAlpha = Math.max(0, 1 - t * t);
        if (f.kind === 'text') {
            ctx.font = `bold ${Math.round(f.size * (t < 0.15 ? 1 + (0.15 - t) * 3 : 1))}px monospace`;
            ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(f.text, px, py);
            ctx.fillStyle = f.color; ctx.fillText(f.text, px, py);
        } else if (f.kind === 'particle') {
            ctx.fillStyle = f.color; ctx.fillRect(px - f.size / 2, py - f.size / 2, f.size, f.size);
        } else if (f.kind === 'slash') {
            // El arco barre 140° alrededor del objetivo, perpendicular a la dirección del golpe
            const sweep = Math.PI * 0.78, start = f.angle + Math.PI - sweep / 2, dir = f.flip ? 1 : -1;
            const from = f.flip ? start : start + sweep, head = Math.min(1, t * 2.2), tail = Math.max(0, t * 2.2 - 0.6);
            ctx.strokeStyle = f.color; ctx.lineWidth = f.width * (1 - t * 0.6); ctx.lineCap = 'round';
            ctx.shadowColor = f.color; ctx.shadowBlur = 8;
            ctx.beginPath();
            const a0 = from + dir * sweep * tail, a1 = from + dir * sweep * head;
            ctx.arc(px, py, TILE * 0.62, Math.min(a0, a1), Math.max(a0, a1));
            ctx.stroke();
            ctx.shadowBlur = 0; ctx.lineCap = 'butt';
        } else if (f.kind === 'ring') {
            ctx.strokeStyle = f.color; ctx.lineWidth = 3 * (1 - t) + 1;
            ctx.beginPath(); ctx.arc(px, py, f.radius * TILE * (0.3 + 0.7 * t), 0, Math.PI * 2); ctx.stroke();
        }
    });
    ctx.globalAlpha = 1;
}

// Posición dibujada de una unidad: se desliza hacia su casilla (movimiento suave) + el salto del golpe.
function drawPos(u, dt) {
    if (u.rx === undefined || Math.abs(u.rx - u.x) > 3 || Math.abs(u.ry - u.y) > 3) { u.rx = u.x; u.ry = u.y; } // teletransportes: sin deslizar
    const k = Math.min(1, dt * 14);
    u.rx += (u.x - u.rx) * k; u.ry += (u.y - u.ry) * k;
    let x = u.rx, y = u.ry;
    if (u.fxLunge) {
        const t = (fxClock - u.fxLunge.at) / 0.18;
        if (t >= 1) u.fxLunge = null;
        else { const push = Math.sin(t * Math.PI) * 0.42; x += u.fxLunge.dx * push; y += u.fxLunge.dy * push; }
    }
    return { x, y };
}

// --- FONDOS DE LAS ARENAS ---
// Se dibujan una sola vez por tipo en un canvas aparte (con una semilla fija, siempre igual).
const ARENA_THEMES = {
    wave: { base: ['#0b120c', '#0d150e', '#0a100b'], marks: ['"', ',', '.', '\''], markColors: ['#1d3b24', '#23452b', '#2b3a1f'], border: '#1f2e22' },
    duel: { base: ['#15110e', '#18130f', '#120f0c'], marks: ['·', '+', '.'], markColors: ['#3a2b20', '#4a3526'], border: '#6a3b1f' },
    boss: { base: ['#170709', '#1b080b', '#140608'], marks: ['~', '·', '^'], markColors: ['#4a0d14', '#6a1420', '#3a0a10'], border: '#8a0f24' },
    rest: null
};
const arenaBgCache = {};

function seededRandom(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

function arenaBackground(kind) {
    if (arenaBgCache[kind]) return arenaBgCache[kind];
    const theme = ARENA_THEMES[kind] || ARENA_THEMES.wave;
    const bg = document.createElement('canvas');
    const k = 2; // se dibuja al doble para que se vea nítido también con el mapa agrandado
    bg.width = MAP_W * k; bg.height = MAP_H * k;
    const g = bg.getContext('2d');
    g.scale(k, k);
    const rnd = seededRandom(kind.length * 7919 + 17);
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        g.fillStyle = theme.base[Math.floor(rnd() * theme.base.length)];
        g.fillRect(c * TILE, r * TILE, TILE, TILE);
        if (rnd() < 0.22) {
            g.fillStyle = theme.markColors[Math.floor(rnd() * theme.markColors.length)];
            g.font = '14px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText(theme.marks[Math.floor(rnd() * theme.marks.length)], c * TILE + TILE / 2 + (rnd() - 0.5) * 8, r * TILE + TILE / 2 + (rnd() - 0.5) * 8);
        }
    }
    // Viñeta: oscurece los bordes
    const grad = g.createRadialGradient(MAP_W / 2, MAP_H / 2, MAP_H * 0.3, MAP_W / 2, MAP_H / 2, MAP_W * 0.65);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = grad; g.fillRect(0, 0, MAP_W, MAP_H);
    g.strokeStyle = theme.border; g.lineWidth = 2; g.strokeRect(1, 1, MAP_W - 2, MAP_H - 2);
    arenaBgCache[kind] = bg;
    return bg;
}
