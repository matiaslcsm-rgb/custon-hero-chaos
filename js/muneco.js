// El muñeco (index.html?muneco, fase B2 del roadmap, pedido del usuario 2026-10-16): un laboratorio para pulir cómo se
// siente pegar antes de llevarlo al juego. Sala chica con terreno, un muñeco de práctica y el héroe con espada (los
// cuadros dibujados de towerHeroArt.js). Va aparte del juego: su propio lienzo, su propio bucle y sus propias teclas.
//
// Cada movimiento tiene TRES TIEMPOS (como en los juegos de pelea y en Hades):
//   preparación (startup): avisa lo que viene, todavía no pasa nada
//   activo (active): el momento en que el movimiento hace lo suyo (el esquive te mueve rápido, el tajo PEGA, la parada bloquea)
//   recuperación (recovery): vuelve a la guardia. Se puede cortar con otro movimiento (el próximo tajo, la parada o
//   el esquive); lo que apretás antes queda guardado y sale apenas empieza la recuperación.
// Las medidas son píxeles del dibujo (1 píxel del héroe = 1 unidad) y segundos.
//
// Paso 1a: la sala, el muñeco y el héroe que camina y esquiva. 1b: combo de 3 tajos y parada que le pegan al muñeco.
// 1c: recibir golpe, disparo y caída (ver ROADMAP.md, B2).

const MUNECO = {
    W: 240, H: 150,           // la sala, en píxeles del dibujo (se agranda por un entero para que se vea nítido)
    wallTop: 22,              // alto de la pared del fondo (la cara que se ve)
    walk: 62,                 // velocidad caminando (px/s)
    walkCycle: 26,            // px recorridos por ciclo de 8 cuadros: los pies no patinan
    feet: { w: 10, h: 5 },    // caja de choque con el terreno (en los pies)
    hurt: { w: 12, h: 22 },   // caja donde lo pueden golpear (el cuerpo, arriba de los pies)
    slow: 0.25                // cámara lenta (tecla T)
};
// Datos de cada movimiento: los tres tiempos (s) y qué cuadros del dibujo van en cada uno ([tipo, número] de
// pxbHeroFrame; se reparten parejo dentro del tiempo). hit: la caja que pega mirando a la derecha, desde los pies
// (x hacia adelante, y negativo hacia arriba); existe solo en el tiempo activo y pega una vez por movimiento.
// lunge: cuánto avanza en el activo · hitstop: congelado al impacto · shake: sacudón de la pantalla.
// Los tajos usan la secuencia de la espada (HERO_ART_SEQ): tajo N = cuadros N×6 … N×6+5; la parada, el cuadro 18 (block).
const MUNECO_MOVES = {
    dash: { name: 'Esquive', startup: 0.05, active: 0.16, recovery: 0.12, speed: 210,
        frames: { startup: [['dash', 0]], active: [['dash', 1], ['dash', 2]], recovery: [['dash', 3]] } },
    swing0: { name: 'Tajo 1', startup: 0.07, active: 0.08, recovery: 0.22, dmg: 10, lunge: 6, hitstop: 0.05, shake: 0,
        hit: { x: 2, y: -24, w: 22, h: 20 }, arc: [-110, 40],
        frames: { startup: [['swing', 0]], active: [['swing', 1], ['swing', 2]], recovery: [['swing', 3], ['swing', 4], ['swing', 5]] } },
    swing1: { name: 'Tajo 2 (revés)', startup: 0.06, active: 0.08, recovery: 0.22, dmg: 12, lunge: 6, hitstop: 0.05, shake: 0,
        hit: { x: 2, y: -24, w: 22, h: 20 }, arc: [60, -80],
        frames: { startup: [['swing', 6]], active: [['swing', 7], ['swing', 8]], recovery: [['swing', 9], ['swing', 10], ['swing', 11]] } },
    swing2: { name: 'Remate', startup: 0.16, active: 0.1, recovery: 0.32, dmg: 22, lunge: 10, hitstop: 0.09, shake: 2,
        hit: { x: 0, y: -28, w: 28, h: 26 }, arc: [-120, 70],
        frames: { startup: [['swing', 12], ['swing', 13]], active: [['swing', 14], ['swing', 15]], recovery: [['swing', 16], ['swing', 17]] } },
    // la parada: levanta la espada, bloquea con un destello y vuelve. Pega poco (como en la Torre, towerParry.js)
    parry: { name: 'Parada', startup: 0.04, active: 0.3, recovery: 0.18, dmg: 5, lunge: 0, hitstop: 0.04, shake: 0,
        hit: { x: 0, y: -26, w: 16, h: 24 },
        frames: { startup: [['swing', 0]], active: [['swing', 18]], recovery: [['swing', 3], ['swing', 5]] } }
};
const MUNECO_COMBO = ['swing0', 'swing1', 'swing2'];
const MUNECO_COMBO_GAP = 0.3; // si volvés a atacar antes de esto, sigue el combo; si no, arranca de nuevo
// El terreno: rectángulos que no se pueden atravesar (además de los bordes)
const MUNECO_SOLIDS = [
    { x: 92, y: 70, w: 22, h: 14, kind: 'crate' },     // un cajón
    { x: 40, y: 104, w: 12, h: 10, kind: 'pillar' },   // una columna baja
    { x: 150, y: 116, w: 56, h: 12, kind: 'step' }      // un escalón de piedra (por ahora, de costado no se sube)
];
const MUNECO_LOOK = { cape: '#a33a3a', hood: '#7a2a2a', trim: '#c9a227', glow: '#9ad1ff', weapon: 'sword' };

function munecoNew() {
    return {
        t: 0, hero: { x: 60, y: 70, dir: 'side', flip: false, move: null, walked: 0, moving: false, lastDx: 1, lastDy: 0, queued: null, comboNext: 0, comboUntil: 0 },
        dummy: { x: 182, y: 72, hitAt: -9, shake: 0, total: 0, hits: 0 },
        numbers: [], showBoxes: false, slow: false, paused: false, freeze: 0, shake: 0
    };
}

// ¿En qué tiempo va el movimiento? 'startup' | 'active' | 'recovery' | null (terminó). u = fracción del total (0-1).
function munecoPhase(mv, t) {
    const d = MUNECO_MOVES[mv.id], total = d.startup + d.active + d.recovery;
    if (t >= total) return null;
    const phase = t < d.startup ? 'startup' : t < d.startup + d.active ? 'active' : 'recovery';
    const from = phase === 'startup' ? 0 : phase === 'active' ? d.startup : d.startup + d.active;
    return { phase, u: t / total, pu: (t - from) / d[phase], total }; // pu: cuánto va dentro de ese tiempo (0-1)
}

function munecoFeetBox(x, y) { const f = MUNECO.feet; return { x: x - f.w / 2, y: y - f.h, w: f.w, h: f.h }; }
function munecoOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function munecoBlocked(M, x, y) {
    const box = munecoFeetBox(x, y);
    if (box.x < 4 || box.x + box.w > MUNECO.W - 4 || box.y < MUNECO.wallTop || box.y + box.h > MUNECO.H - 4) return true;
    const d = M.dummy, dummyBox = { x: d.x - 5, y: d.y - 4, w: 10, h: 4 }; // la base del muñeco
    return MUNECO_SOLIDS.some(s => munecoOverlap(box, s)) || munecoOverlap(box, dummyBox);
}
// Mueve de a un eje: si choca en x, igual se desliza en y (no se traba en las esquinas)
function munecoMoveBy(M, dx, dy) {
    const h = M.hero;
    if (!munecoBlocked(M, h.x + dx, h.y)) h.x += dx;
    if (!munecoBlocked(M, h.x, h.y + dy)) h.y += dy;
}

function munecoDummyBox(d) { return { x: d.x - 7, y: d.y - 28, w: 14, h: 26 }; }
// La caja que pega, girada hacia donde mira: de costado tal cual (espejada a la izquierda); arriba o abajo, acostada
function munecoHitBox(h, spec) {
    if (h.dir === 'side') return { x: h.flip ? h.x - spec.x - spec.w : h.x + spec.x, y: h.y + spec.y, w: spec.w, h: spec.h };
    const w = spec.h + 4, hh = spec.w - 4;
    return { x: h.x - w / 2, y: h.dir === 'down' ? h.y - 6 + spec.x : h.y - 18 - spec.x - hh, w, h: hh };
}
function munecoBegin(h, id, dx, dy) {
    h.move = { id, t: 0, dx, dy, hit: false };
    h.dir = Math.abs(dy) > Math.abs(dx) * 1.3 ? (dy > 0 ? 'down' : 'up') : 'side';
    if (Math.abs(dx) > 0.1) h.flip = dx < 0;
}

// input: { x: -1..1, y: -1..1, dash / attack / parry: bool (apretó recién), aim: { dx, dy } (hacia el mouse, opcional) }
function munecoStep(M, dt, input) {
    if (M.freeze > 0) { M.freeze -= dt; return; } // congelado al impacto: todo se detiene un instante
    M.t += dt;
    const h = M.hero;
    let ix = input.x || 0, iy = input.y || 0;
    const len = Math.hypot(ix, iy); if (len > 1) { ix /= len; iy /= len; }
    if (len) { h.lastDx = ix; h.lastDy = iy; }
    if (input.dash) h.queued = 'dash'; if (input.attack) h.queued = 'attack'; if (input.parry) h.queued = 'parry';
    const aim = input.aim || (len ? { dx: ix, dy: iy } : h.move && h.move.id !== 'dash' ? { dx: h.move.dx, dy: h.move.dy } : { dx: h.flip ? -1 : 1, dy: h.dir === 'down' ? 1 : h.dir === 'up' ? -1 : 0 });
    const cur = h.move && munecoPhase(h.move, h.move.t);
    if (h.queued && (!h.move || cur.phase === 'recovery')) { // lo guardado sale apenas se puede (cortando la recuperación)
        const q = h.queued; h.queued = null;
        if (q === 'dash') munecoBegin(h, 'dash', len ? ix : h.lastDx, len ? iy : h.lastDy);
        else if (q === 'parry') munecoBegin(h, 'parry', aim.dx, aim.dy);
        else {
            const i = h.move && MUNECO_COMBO.includes(h.move.id) ? MUNECO_COMBO.indexOf(h.move.id) + 1 : M.t < h.comboUntil ? h.comboNext : 0;
            munecoBegin(h, MUNECO_COMBO[i % MUNECO_COMBO.length], aim.dx, aim.dy);
        }
    }
    h.moving = false;
    if (h.move) {
        h.move.t += dt;
        const ph = munecoPhase(h.move, h.move.t), d = MUNECO_MOVES[h.move.id];
        if (!ph) {
            const i = MUNECO_COMBO.indexOf(h.move.id);
            if (i >= 0) { h.comboNext = (i + 1) % MUNECO_COMBO.length; h.comboUntil = M.t + MUNECO_COMBO_GAP; }
            h.move = null;
        } else if (ph.phase === 'active') {
            const sp = h.move.id === 'dash' ? d.speed : d.lunge / d.active;
            if (sp) munecoMoveBy(M, h.move.dx * sp * dt, h.move.dy * sp * dt);
            if (d.hit && !h.move.hit && munecoOverlap(munecoHitBox(h, d.hit), munecoDummyBox(M.dummy))) {
                h.move.hit = true;
                munecoHitDummy(M, d.dmg, h.move.id === 'swing2' ? 1.6 : 1);
                M.freeze = d.hitstop; M.shake = Math.max(M.shake, d.shake);
            }
        }
    }
    if (!h.move && len) {
        const x0 = h.x, y0 = h.y;
        munecoMoveBy(M, ix * MUNECO.walk * dt, iy * MUNECO.walk * dt);
        const moved = Math.hypot(h.x - x0, h.y - y0);
        h.walked += moved; h.moving = moved > 0.01;
    }
    // para dónde mira: lo que hace manda; de costado salvo que vaya claramente arriba o abajo
    const fx = h.move ? h.move.dx : len ? ix : null, fy = h.move ? h.move.dy : len ? iy : null;
    if (fx !== null) { h.dir = Math.abs(fy) > Math.abs(fx) * 1.3 ? (fy > 0 ? 'down' : 'up') : 'side'; if (Math.abs(fx) > 0.1) h.flip = fx < 0; }
    const d = M.dummy; d.shake = Math.max(0, d.shake - dt * 3); M.shake = Math.max(0, M.shake - dt * 12);
    M.numbers = M.numbers.filter(n => (n.age += dt) < 0.8);
}

// El muñeco de práctica recibe un golpe: se sacude, parpadea en blanco y muestra el número
function munecoHitDummy(M, dmg, shake = 1) {
    const d = M.dummy;
    d.hitAt = M.t; d.shake = shake; d.total += dmg; d.hits++;
    M.numbers.push({ x: d.x + (Math.random() - 0.5) * 6, y: d.y - 30, v: dmg, age: 0 });
}

// Qué cuadro del héroe toca ahora
function munecoHeroFrame(M) {
    const h = M.hero;
    if (h.move) {
        const ph = munecoPhase(h.move, h.move.t), list = MUNECO_MOVES[h.move.id].frames[ph.phase];
        const [kind, k] = list[Math.min(list.length - 1, Math.floor(ph.pu * list.length))];
        return { kind, k };
    }
    if (h.moving) return { kind: 'walk', k: Math.floor((h.walked / MUNECO.walkCycle % 1) * 8) };
    let k = Math.floor((M.t / 1.6 % 1) * 4); if (M.t % 3.3 < 0.14) k += 4; // respira y parpadea, como en el juego
    return { kind: 'idle', k };
}

// --- DIBUJO ---
let munecoTerrain = null; // el piso y las paredes se dibujan una vez
function munecoBuildTerrain() {
    const W = MUNECO.W, H = MUNECO.H, T = MUNECO.wallTop;
    return pxSprite(W, H, S => {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { // baldosas de piedra de 16 px, con juntas y un poco de ruido
            const edge = x % 16 === 0 || y % 16 === 0, n = pxHash(x, y);
            S.set(x, y, edge ? '#2b2a33' : ((x >> 4) + (y >> 4)) % 2 ? (n < 0.1 ? '#4a4856' : '#43414e') : (n < 0.1 ? '#514f5e' : '#4a4857'));
        }
        for (let y = 0; y < T; y++) for (let x = 0; x < W; x++) { // la pared del fondo: ladrillos con el borde de arriba claro
            const row = Math.floor(y / 6), joint = y % 6 === 0 || (x + (row % 2) * 8) % 16 === 0;
            S.set(x, y, y < 2 ? '#6c6a7a' : joint ? '#24232b' : pxHash(x, y) < 0.15 ? '#3c3a47' : '#35343f');
        }
        for (let x = 0; x < W; x++) S.set(x, T, '#1c1b22'); // sombra al pie de la pared
        for (let y = T; y < H; y++) for (let x of [0, 1, 2, 3, W - 4, W - 3, W - 2, W - 1]) S.set(x, y, '#2a2932'); // bordes
        for (let x = 0; x < W; x++) for (let y = H - 4; y < H; y++) S.set(x, y, '#2a2932');
        MUNECO_SOLIDS.forEach(s => munecoPaintSolid(S, s));
    });
}
function munecoPaintSolid(S, s) {
    const top = s.kind === 'crate' ? '#a0703c' : s.kind === 'pillar' ? '#7d7b8c' : '#6a6878';
    const face = s.kind === 'crate' ? '#6e4823' : s.kind === 'pillar' ? '#55535f' : '#4a4856';
    const rise = s.kind === 'step' ? 4 : 10; // cuánto sobresale hacia arriba en la pantalla (la tapa)
    for (let y = s.y - rise; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) {
        const isTop = y < s.y + s.h - rise, border = x === s.x || x === s.x + s.w - 1 || y === s.y - rise || y === s.y + s.h - 1;
        S.set(x, y, border ? '#1c1b22' : isTop ? top : face);
    }
    if (s.kind === 'crate') for (let x = s.x + 2; x < s.x + s.w - 2; x++) S.set(x, s.y + s.h - rise - 1 - ((x - s.x) % 5 === 0 ? 1 : 0), '#7d5530'); // tablas
}
let munecoDummyArt = null;
function munecoBuildDummy() {
    const img = pxSprite(20, 34, S => { // poste de madera y una bolsa de paja con dos travesaños
        pxShadow(S, 10, 32, 7, 2);
        for (let y = 12; y < 32; y++) { S.set(9, y, '#7a5230'); S.set(10, y, '#8c5f38'); }
        S.ball(10, 12, 6, 8, ['#a8823e', '#c49a50', '#d9b46a'], () => 0.5);
        for (let x = 2; x < 18; x++) S.set(x, 10, '#7a5230');
        S.set(8, 9, '#3a2a1a'); S.set(12, 9, '#3a2a1a'); // la cara pintada
        for (let x = 7; x < 14; x++) if (x % 2) S.set(x, 14, '#8a3a2a');
        S.outline('#110d0b');
    });
    const w = document.createElement('canvas'); w.width = img.width; w.height = img.height;
    const g = w.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, w.width, w.height);
    return { img, white: w };
}

function munecoDraw(M, ctx) {
    munecoTerrain = munecoTerrain || munecoBuildTerrain();
    munecoDummyArt = munecoDummyArt || munecoBuildDummy();
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (M.shake > 0) ctx.translate(Math.round((pxHash(Math.floor(M.t * 60), 1) - 0.5) * 2 * M.shake), Math.round((pxHash(Math.floor(M.t * 60), 2) - 0.5) * 2 * M.shake));
    ctx.drawImage(munecoTerrain, 0, 0);
    // de atrás hacia adelante: se dibuja primero lo que está más arriba en la pantalla
    const h = M.hero, d = M.dummy, items = [
        { y: d.y, draw: () => {
            const flash = M.t - d.hitAt < 0.08, sx = Math.round(Math.sin(M.t * 60) * 2 * d.shake);
            ctx.drawImage(flash ? munecoDummyArt.white : munecoDummyArt.img, Math.round(d.x - 10 + sx), Math.round(d.y - 32));
        } },
        { y: h.y, draw: () => {
            const f = munecoHeroFrame(M), fr = pxbHeroFrame(MUNECO_LOOK, f.kind, f.k, h.dir), img = fr.img;
            const ox = Math.round(h.x - img.width / 2), oy = Math.round(h.y - img.height + 2);
            if (h.flip && h.dir === 'side') { ctx.save(); ctx.translate(Math.round(h.x) * 2, 0); ctx.scale(-1, 1); ctx.drawImage(img, ox, oy); ctx.restore(); }
            else ctx.drawImage(img, ox, oy);
        } }
    ].sort((a, b) => a.y - b.y);
    items.forEach(i => i.draw());
    munecoDrawSwingFx(M, ctx);
    if (M.showBoxes) munecoDrawBoxes(M, ctx);
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    M.numbers.forEach(n => { ctx.globalAlpha = 1 - n.age / 0.8; ctx.fillStyle = '#110d0b'; ctx.fillText(n.v, n.x + 1, n.y - n.age * 18 + 1); ctx.fillStyle = '#ffd166'; ctx.fillText(n.v, n.x, n.y - n.age * 18); });
    ctx.globalAlpha = 1;
    ctx.restore();
}
// La estela del tajo (en el activo y apagándose al empezar la recuperación) y el arco celeste de la parada
function munecoDrawSwingFx(M, ctx) {
    const h = M.hero, mv = h.move; if (!mv || mv.id === 'dash') return;
    const d = MUNECO_MOVES[mv.id], ph = munecoPhase(mv, mv.t); if (!ph || ph.phase === 'startup') return;
    const fade = ph.phase === 'active' ? 1 : 1 - ph.pu * 3; if (fade <= 0) return;
    const base = Math.atan2(mv.dy, mv.dx), cx = h.x, cy = h.y - 14, dot = (a, r, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1); };
    ctx.globalAlpha = fade;
    if (mv.id === 'parry') { // un arco de 1 píxel, con un destello blanco al abrir la ventana
        const flash = ph.phase === 'active' && ph.pu < 0.2;
        for (let a = -1.2; a <= 1.2; a += 0.04) { dot(base + a, 15, flash ? '#ffffff' : '#7fd8ff'); dot(base + a, 16, '#2a6f97'); }
    } else { // la estela: del ángulo de arranque hasta donde va la hoja, más gruesa en la punta
        const [a0, a1] = d.arc, reach = mv.id === 'swing2' ? 20 : 17, upto = ph.phase === 'active' ? ph.pu : 1, flipY = h.flip ? -1 : 1;
        const n = 28;
        for (let i = 0; i <= n * upto; i++) {
            const a = base + flipY * (a0 + (a1 - a0) * i / n) * Math.PI / 180;
            for (let r = reach - 4; r <= reach; r++) dot(a, r, r === reach ? '#ffffff' : '#ffd8a8');
        }
    }
    ctx.globalAlpha = 1;
}
// Tecla H: las cajas. Azul: choque con el terreno (los pies) · verde: donde te pueden golpear
function munecoDrawBoxes(M, ctx) {
    const h = M.hero, d = M.dummy, rect = (b, c) => { ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.strokeRect(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5, Math.round(b.w) - 1, Math.round(b.h) - 1); };
    rect(munecoFeetBox(h.x, h.y), '#4cc9f0');
    rect({ x: h.x - MUNECO.hurt.w / 2, y: h.y - MUNECO.hurt.h, w: MUNECO.hurt.w, h: MUNECO.hurt.h }, '#52b788');
    rect(munecoDummyBox(d), '#52b788');
    MUNECO_SOLIDS.forEach(s => rect(s, '#4cc9f0'));
    const mv = h.move, ph = mv && munecoPhase(mv, mv.t), spec = mv && MUNECO_MOVES[mv.id].hit;
    if (spec && ph.phase === 'active') rect(munecoHitBox(h, spec), '#ef476f'); // rojo: lo que pega, solo en el tiempo activo
}

// --- EL LABORATORIO EN PANTALLA ---
function munecoHud(M) {
    const h = M.hero, mv = h.move, ph = mv && munecoPhase(mv, mv.t), d = mv && MUNECO_MOVES[mv.id];
    const names = { startup: 'preparación', active: 'activo', recovery: 'recuperación' };
    const bar = d ? `<div class="mu-bar">${['startup', 'active', 'recovery'].map(p => `<span class="mu-${p}${ph.phase === p ? ' on' : ''}" style="flex:${d[p]}">${names[p]} ${Math.round(d[p] * 1000)}ms</span>`).join('')}<i style="left:${ph.u * 100}%"></i></div>` : '';
    const dd = M.dummy, score = dd.hits ? ` · muñeco: ${dd.hits} golpes, ${dd.total} de daño` : '';
    return `<b>${mv ? d.name : h.moving ? 'Caminar' : 'Quieto'}</b>${mv ? ` · ${names[ph.phase]}` : ''}${M.slow ? ' · 🐢 cámara lenta' : ''}${M.paused ? ' · ⏸ pausa' : ''}${score}${bar}`;
}
function munecoStart() {
    document.body.classList.add('muneco-on');
    const wrap = document.createElement('div'); wrap.id = 'muneco';
    wrap.innerHTML = `<canvas id="mu-canvas"></canvas><div id="mu-hud"></div>
        <div id="mu-help">WASD / flechas: caminar · J o clic: atacar (3 tajos) · K o clic derecho: parada · Espacio: esquive<br>H: cajas · T: cámara lenta · P: pausa · . : un cuadro · R: reiniciar el muñeco</div>`;
    document.body.appendChild(wrap);
    const cv = wrap.querySelector('#mu-canvas'), ctx = cv.getContext('2d'), hud = wrap.querySelector('#mu-hud');
    cv.width = MUNECO.W; cv.height = MUNECO.H;
    const fit = () => { const s = Math.max(1, Math.floor(Math.min(innerWidth / MUNECO.W, (innerHeight - 90) / MUNECO.H))); cv.style.width = MUNECO.W * s + 'px'; cv.style.height = MUNECO.H * s + 'px'; };
    fit(); addEventListener('resize', fit);
    const M = (window.muneco = munecoNew()), down = {};
    let dash = false, attack = false, parry = false, aim = null, stepOnce = false;
    const mine = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyJ', 'KeyK', 'KeyH', 'KeyT', 'KeyP', 'Period', 'KeyR'];
    // con el mouse: el clic apunta hacia el cursor
    cv.addEventListener('mousedown', e => {
        const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * MUNECO.W / r.width, y = (e.clientY - r.top) * MUNECO.H / r.height;
        const dx = x - M.hero.x, dy = y - (M.hero.y - 12), n = Math.hypot(dx, dy) || 1; aim = { dx: dx / n, dy: dy / n };
        if (e.button === 0) attack = true; else if (e.button === 2) parry = true;
        e.preventDefault();
    });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    // las teclas son del laboratorio: no le llegan al juego que está abajo
    addEventListener('keydown', e => {
        if (!mine.includes(e.code)) return;
        e.preventDefault(); e.stopImmediatePropagation();
        if (!e.repeat) { if (e.code === 'Space') dash = true; if (e.code === 'KeyJ') { attack = true; aim = null; } if (e.code === 'KeyK') { parry = true; aim = null; } if (e.code === 'KeyR') Object.assign(M.dummy, { total: 0, hits: 0 }); if (e.code === 'KeyH') M.showBoxes = !M.showBoxes; if (e.code === 'KeyT') M.slow = !M.slow; if (e.code === 'KeyP') M.paused = !M.paused; if (e.code === 'Period') stepOnce = true; }
        down[e.code] = true;
    }, true);
    addEventListener('keyup', e => { if (mine.includes(e.code)) { e.stopImmediatePropagation(); down[e.code] = false; } }, true);
    let last = performance.now();
    const frame = now => {
        const real = Math.min(0.05, (now - last) / 1000); last = now;
        const input = { x: (down.KeyD || down.ArrowRight ? 1 : 0) - (down.KeyA || down.ArrowLeft ? 1 : 0), y: (down.KeyS || down.ArrowDown ? 1 : 0) - (down.KeyW || down.ArrowUp ? 1 : 0), dash, attack, parry, aim };
        const dt = M.paused ? (stepOnce ? 1 / 60 : 0) : real * (M.slow ? MUNECO.slow : 1);
        if (dt > 0) { munecoStep(M, dt, input); dash = attack = parry = false; aim = null; }
        stepOnce = false;
        munecoDraw(M, ctx);
        hud.innerHTML = munecoHud(M);
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
}
if (/[?&]muneco\b/.test(location.search)) addEventListener('load', () => setTimeout(munecoStart, 0));
