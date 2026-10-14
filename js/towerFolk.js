// Infinite Tower: la gente del pueblo se ve (ROADMAP T0, 2026-10-14).
//
//   Dos vecinos por piso, con la pinta de su gente (towerLore.js: barqueros, relojeros, faroleros…), que pasean por el
//   pueblo entre pausas. Con F (cerca) te dicen algo: cada run arrancan por otra frase (cuenta las runs de los récords,
//   towerSave.js) y si les volvés a hablar siguen con la próxima. El Corazón (10) y Lo No Escrito no tienen gente.

const FOLK = {
    speed: 1.1, reach: 1.6, sayTime: 5, // casillas/s, distancia para hablar, segundos que queda el globo
    1: { who: ['uno de los que Esperan', 'una de las que Esperan'], color: '#6b7a4a', look: { head: 'hood', weapon: 'lantern' },
        lines: ['Brena anota a todos. A vos te tiene repetido.', 'No subas de noche: el bosque cambia.', 'Dicen que la torre creció anoche. Nadie la vio.', 'Si volvés, traé algo de arriba. Nadie trae nada.'] },
    2: { who: ['un jardinero', 'una jardinera'], color: '#4f7a3a', look: { head: 'hat', weapon: 'dagger', belt: '#3a2a1c' },
        lines: ['Las raíces bajan del techo. Raro, ¿no?', 'Podé tres árboles ayer. Hoy son cinco.', 'En el invernadero algo mastica cuando llueve.', 'Si ves baldosas sueltas, pisá despacio.'] },
    3: { who: ['un barquero', 'una barquera'], color: '#4a6a7a', look: { head: 'hood', weapon: 'staff', orb: ['#3a4a3a', '#55705a', '#7a9a7a', '#a8c4a8', '#d8eed8'] },
        lines: ['El agua sube cuando nadie mira.', 'Mi bote tiene más parches que tablas.', 'Abajo de la niebla hay salas enteras.', 'Madre Junco sabe dónde está la llave. No dice.'] },
    4: { who: ['un pescador de raíz', 'una pescadora de raíz'], color: '#5a5a3a', look: { head: 'skin', hair: '#4a3a24', weapon: 'dagger', belt: '#2a1d14' },
        lines: ['La raíz bebe. Si te quedás quieto, te traga.', 'Pescamos lo que la raíz no quiere.', 'Tallo llora de noche. Dice que es la humedad.', 'Acá nada se pudre del todo.'] },
    5: { who: ['un relojero', 'una relojera'], color: '#a8875a', look: { head: 'hat', weapon: 'hammer', belt: '#5a3f29' },
        lines: ['Contamos granos. Siempre falta uno.', 'Cuando cae más rápido, alguien llegó arriba.', 'El reloj tapiado no se rompió. Ese es el problema.', '¿Qué hora es? Nadie sabe desde hace años.'] },
    6: { who: ['un archivista', 'una archivista'], color: '#7a5a7a', look: { robe: true, head: 'hood', weapon: 'lantern' },
        lines: ['Faltan páginas. Siempre las mismas.', 'Leemos con la arena hasta el cuello.', 'Hay un libro con tu nombre. Está en blanco.', 'Hablá bajo, que en las estanterías alguien escucha.'] },
    7: { who: ['un farolero', 'una farolera'], color: '#8a6a3a', look: { head: 'hood', weapon: 'lantern' },
        lines: ['Un farol apagado es una galería perdida.', 'El viento sopla para adentro. Siempre.', 'Isla prende el primero y el último.', 'Llevá luz. La nieve tapa las huellas.'] },
    8: { who: ['un vigía', 'una vigía'], color: '#5a6a8a', look: { head: 'helm', weapon: 'bow', belt: '#3a2a1c' },
        lines: ['Te anoté. Otra vez.', 'Desde acá se ve el mar. Nadie bajó a verlo.', 'La campana sonó sola hace cien años.', 'Mirá para arriba: falta poco. O mucho.'] },
    9: { who: ['un herrero del núcleo', 'una herrera del núcleo'], color: '#7a3a2a', look: { head: 'skin', hair: '#2a1d14', weapon: 'hammer', belt: '#2a1d14' },
        lines: ['El Corazón pide hierro. Nunca alcanza.', 'Brasa no duerme. Martilla.', 'Lo que forjamos sube solo por las paredes.', 'Si oís martillazos y no hay nadie, alejate.'] }
};

// Los vecinos de un pueblo (se arman la primera vez que hacen falta)
function townFolk(level) {
    const t = level && !level.isCave && level.town, F = level && FOLK[level.floor];
    if (!t || !F) return [];
    if (!t.folk) t.folk = [0, 1].map(i => ({ i, x: t.x + 4 + i * (t.w - 9), y: t.y + t.h - 4, tx: null, ty: null, waitUntil: 0, facing: 1, moving: false, talks: 0, say: null }));
    return t.folk;
}
function folkSpotOk(level, x, y) {
    const t = level.town;
    return x >= t.x + 2 && x <= t.x + t.w - 3 && y >= t.y + 2 && y <= t.y + t.h - 3 && walkable(level, x, y)
        && Math.hypot(x - t.merchant.x, y - t.merchant.y) > 1.5 && !(t.smith && Math.hypot(x - t.smith.x, y - t.smith.y) < 1.5);
}
// Cada cuadro: caminan hasta un punto del pueblo, se quedan un rato y eligen otro. Mientras te hablan, te miran.
function folkTick(level, dt) {
    townFolk(level).forEach(f => {
        if (f.say && gameClock < f.say.until) { f.moving = false; f.facing = player.x < f.x ? -1 : 1; return; }
        if (gameClock < f.waitUntil) { f.moving = false; return; }
        if (f.tx === null) {
            for (let k = 0; k < 20 && f.tx === null; k++) {
                const x = level.town.x + 2 + Math.floor(Math.random() * (level.town.w - 4)), y = level.town.y + 2 + Math.floor(Math.random() * (level.town.h - 4));
                if (folkSpotOk(level, x, y)) { f.tx = x; f.ty = y; }
            }
            if (f.tx === null) { f.waitUntil = gameClock + 1; return; }
        }
        const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy), step = FOLK.speed * dt;
        const nx = d <= step ? f.tx : f.x + dx / d * step, ny = d <= step ? f.ty : f.y + dy / d * step;
        if (d <= step || !walkable(level, Math.round(nx), Math.round(ny))) { // llegó (o se topó con algo): pausa y otro destino
            if (d <= step) { f.x = nx; f.y = ny; }
            f.tx = f.ty = null; f.moving = false; f.waitUntil = gameClock + 1.5 + Math.random() * 3;
            return;
        }
        if (Math.abs(dx) > 0.05) f.facing = dx < 0 ? -1 : 1;
        f.x = nx; f.y = ny; f.moving = true;
    });
}
function folkNear(hero = player) {
    let best = null, bestD = FOLK.reach;
    townFolk(hero && hero.arena).forEach(f => { const d = Math.hypot(f.x - hero.x, f.y - hero.y); if (d <= bestD) { bestD = d; best = f; } });
    return best;
}
// F cerca de un vecino: dice la frase que le toca en esta run y, si le volvés a hablar, la siguiente
function talkToFolk() {
    const f = folkNear();
    if (!f) return false;
    const F = FOLK[player.arena.floor], runs = typeof towerRecords === 'function' ? towerRecords().runs : 0;
    const text = F.lines[(runs + f.i * 2 + f.talks++) % F.lines.length];
    f.say = { text, until: gameClock + FOLK.sayTime };
    log(`💬 ${F.who[f.i][0].toUpperCase() + F.who[f.i].slice(1)}: «${text}»`);
    return true;
}

// --- DIBUJO (pixel art: el mismo muñeco que el mercader, con su caminata) ---
function pxFolkFrame(floor, i, kind, k) {
    const key = 'folk' + floor + i + kind + k;
    if (pxpCache[key]) return pxpCache[key];
    const F = FOLK[floor], P = pxbPalette(i ? shade(F.color, 0.18) : F.color);
    const f = kind === 'walk' ? { walk: k, idle: 0, ph: [0, 1, 0, -1][k], bob: k % 2 ? -1 : 0, br: 0 } : { walk: -1, idle: k, ph: 0, bob: 0, br: k };
    const look = Object.assign({}, F.look, i && F.look.head === 'skin' ? { hair: '#8a5a3a' } : {}); // la segunda, otro pelo
    return (pxpCache[key] = pxSprite(14 + PXB_PAD * 2, 22 + PXB_PAD, S => { S.tx = PXB_PAD; S.ty = PXB_PAD; pxbHumanoid(S, P, f, look); S.outline('#110d0b'); }));
}
function pxDrawFolk(level) {
    const near = folkNear();
    townFolk(level).forEach(f => {
        const tx = Math.round(f.x), ty = Math.round(f.y);
        if (!level.explored[ty] || !level.explored[ty][tx]) return;
        const cx = f.x * TILE + TILE / 2, by = f.y * TILE + TILE - 2;
        const img = f.moving ? pxFolkFrame(level.floor, f.i, 'walk', pxFrameK(7, 4, f.i)) : pxFolkFrame(level.floor, f.i, 'idle', pxFrameK(1.6, 2, f.i));
        ctx.save(); ctx.translate(cx, 0); if (f.facing < 0) ctx.scale(-1, 1); pxPut(img, 0, by); ctx.restore();
        if (f.say && gameClock < f.say.until) pxLabel(`«${f.say.text}»`, cx, f.y * TILE - TILE * 0.55, '#fff3c4');
        else if (f === near) pxLabel(`${keyName(KEYMAP.interact)}: hablar`, cx, f.y * TILE - TILE * 0.55);
    });
}
