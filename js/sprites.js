// Pixel art dibujado en código: sprites de 12×12 para héroes, creeps y jefes. Sin archivos de imagen.
//
//   Cada sprite es una plantilla (forma) + una paleta (colores). Las plantillas son filas de 12 caracteres: '.' es
//   transparente y cada letra es un color de la paleta:
//     h pelo/capucha/casco · s piel · e ojos · b cuerpo · a detalle · l piernas · d botas · w arma/bastón/alas · m boca/musgo · t dientes
//   Se dibujan una vez en un canvas aparte (con una versión blanca para el destello al recibir daño) y después se copian.
//   Con la tecla G (o el botón 🎨) se vuelve a las letras ASCII.

const SPRITE_PX = 3; // cada píxel del sprite se dibuja de 3×3 en el canvas aparte (después se escala al tamaño que toque)

const SPRITE_TEMPLATES = {
    // Guerrero con arma a la derecha
    humanoid: [
        '....hhhh....', '...hhhhhh...', '...hesseh...', '....ssss....',
        '..bbbbbbbb.w', '.sbbbaabbbsw', '.s.bbaabb.sw', '...bbbbbb..w',
        '...ll..ll...', '...ll..ll...', '...ll..ll...', '..ddd..ddd..'
    ],
    // Duelista con un arma en cada mano, inclinado hacia adelante
    duelist: [
        '....hhhh....', '...hhhhhh...', '...hesseh...', '....ssss....',
        'w.bbbbbbbb.w', 'ws.bbaabb.sw', '.w.bbaabb.w.', '...bbbbbb...',
        '...ll..ll...', '..ll....ll..', '..ll....ll..', '.ddd....ddd.'
    ],
    // Mago con túnica y bastón (a = orbe)
    robed: [
        '....hhhh..a.', '...hhhhhh.w.', '...hesseh.w.', '...hssssh.w.',
        '..bbbbbbbbw.', '..bbbaabbbw.', '..bbbaabbbw.', '..bbbbbbbbw.',
        '.bbbbbbbbbw.', '.bbbbbbbbbw.', '.bbbbbbbbbw.', '..dd....dd..'
    ],
    ghost: [
        '....bbbb....', '...bbbbbb...', '..bbebbebb..', '..bbbbbbbb..',
        '..bbbmmbbb..', '.bbbbbbbbbb.', '.bbbbbbbbbb.', '.bbbabbabbb.',
        '.bbbbbbbbbb.', '.bb.bbb.bb..', '.b...b...b..', '............'
    ],
    bomb: [
        '........a...', '.......w....', '......w.....', '....bbbb....',
        '...bbbbbb...', '..bbhbbbbb..', '..bhbbbbbb..', '..bbbbbbbb..',
        '..bbbbbbbb..', '...bbbbbb...', '....bbbb....', '............'
    ],
    bug: [
        '............', '............', '............', '....w..w....',
        '.....ww.....', '...wbbbbw...', '..wwbeebww..', '..wwbbbbww..',
        '....bbbb....', '...l.ll.l...', '............', '............'
    ],
    golem: [
        '............', '...bbbbbb...', '...babbab...', '...bbbbbb...',
        '.bbbbbbbbbb.', 'bbbbmbbmbbbb', 'bb.bbbbbb.bb', 'bb.bbmbbb.bb',
        '...bbbbbb...', '...bb..bb...', '..bbb..bbb..', '..bbb..bbb..'
    ],
    dragon: [
        '......w....w', '.....ww...ww', '.bb..www.www', 'bebb.wwwwwww',
        'bbbbbbbbbww.', '..tt.bbbbbb.', '.....bbbbbbb', '.....bbbbbbb',
        '......b..b.b', '......b..b..', '.....bb.bb..', '............'
    ],
    hydra: [
        'bb...bb...bb', 'eb...eb...eb', '.b...b...b..', '.b...b...b..',
        '..b..b..b...', '...b.b.b....', '...bbbbbb...', '..bbbbbbbb..',
        '.bbbbabbbbb.', '.bbbbbbbbbb.', '..ll....ll..', '............'
    ],
    demon: [
        '.h........h.', '.hh......hh.', '..hbbbbbbh..', '...beebeb...',
        '...bbttbb...', '.wbbbbbbbbw.', 'wwbbbbbbbbww', 'w.bbbbbbbb.w',
        '...bbbbbb...', '...bb..bb...', '...bb..bb...', '..ddd..ddd..'
    ]
};

// Aclara (f > 0) u oscurece (f < 0) un color #rrggbb.
function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = [n >> 16, (n >> 8) & 255, n & 255].map(c => Math.round(f >= 0 ? c + (255 - c) * f : c * (1 + f)));
    return '#' + ch.map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

// Paleta a partir de un color principal (creeps y jefes): el cuerpo en su color y el resto derivado.
function paletteFrom(color, extra = {}) {
    return { h: shade(color, -0.35), s: '#d6b894', e: '#111111', b: color, a: shade(color, 0.45), l: shade(color, -0.55), d: '#1d1d1d',
        w: '#adb5bd', m: shade(color, -0.5), t: '#ffffff', ...extra };
}

const HERO_SPRITES = {
    AXE: ['humanoid', { h: '#8d0801', s: '#e5989b', e: '#111', b: '#6a040f', a: '#ffba08', l: '#3d0c02', d: '#1b1b1b', w: '#dee2e6' }],
    SNIPER: ['humanoid', { h: '#606c38', s: '#f1c27d', e: '#111', b: '#283618', a: '#dda15e', l: '#3a3a3a', d: '#1b1b1b', w: '#7f5539' }],
    ASSASSIN: ['humanoid', { h: '#2b2d42', s: '#d4a373', e: '#e63946', b: '#1d1d1d', a: '#8d99ae', l: '#2b2d42', d: '#111', w: '#e0e1dd' }],
    VAMPIRE: ['humanoid', { h: '#111111', s: '#f1f3f5', e: '#d00000', b: '#6a040f', a: '#ffd166', l: '#1b1b1b', d: '#111', w: '#9d0208' }],
    ARCANIST: ['robed', { h: '#3a0ca3', s: '#f1c27d', e: '#111', b: '#4361ee', a: '#f72585', d: '#1b1b1b', w: '#b08968' }],
    FROSTWITCH: ['robed', { h: '#caf0f8', s: '#e9ecef', e: '#0077b6', b: '#48cae4', a: '#ffffff', d: '#023e8a', w: '#90e0ef' }],
    NECROMANCER: ['robed', { h: '#1b1b1b', s: '#adb5bd', e: '#80ffdb', b: '#2d6a4f', a: '#95d5b2', d: '#111', w: '#6c757d' }],
    VOIDSAGE: ['robed', { h: '#240046', s: '#c8b6ff', e: '#e0aaff', b: '#5a189a', a: '#e0aaff', d: '#10002b', w: '#9d4edd' }],
    ALCHEMIST: ['robed', { h: '#606c38', s: '#f1c27d', e: '#111', b: '#bc6c25', a: '#a7c957', d: '#3a2a1a', w: '#8d6e63' }],
    DANCER: ['duelist', { h: '#1d3557', s: '#e0c097', e: '#48cae4', b: '#14213d', a: '#8d99ae', l: '#22223b', d: '#0b0c10', w: '#ced4da' }],
    ZEUS: ['robed', { h: '#023e8a', s: '#f1c27d', e: '#ffd60a', b: '#03045e', a: '#ffd60a', d: '#03071e', w: '#ffea00' }]
};

const CREEP_SPRITE_TEMPLATE = {
    SHAMAN: 'robed', HEALER: 'robed', WARLOCK: 'robed', FROSTCASTER: 'robed',
    SPECTER: 'ghost', SWARM: 'bug', KAMIKAZE: 'bomb'
};
const CREEP_SPRITE_EXTRA = {
    ARCHER: { w: '#7f5539' }, CROSSBOW: { w: '#6c584c' }, ARMORED: { w: '#6c757d', a: '#dee2e6' },
    HEALER: { a: '#ffffff', w: '#80ffdb' }, KAMIKAZE: { b: '#343a40', h: '#adb5bd', w: '#ffb703', a: '#ff5400' }, DRUMMER: { w: '#bc6c25' }, ANCHOR: { w: '#6c757d', a: '#a8dadc' }
};

const BOSS_SPRITES = {
    GOLEM: 'golem', HIVE_QUEEN: 'bug', FROST_DRAGON: 'dragon', ABYSS_LORD: 'demon',
    HYDRA: 'hydra', LICH: 'robed', BLOOD_TITAN: 'humanoid', PHANTOM: 'ghost'
};

// --- CONSTRUCCIÓN Y CACHÉ ---
const spriteCache = {};

function buildSprite(template, palette, white) {
    const rows = SPRITE_TEMPLATES[template];
    const c = document.createElement('canvas');
    c.width = 12 * SPRITE_PX; c.height = 12 * SPRITE_PX;
    const g = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.' || !palette[ch]) return;
        g.fillStyle = white ? '#ffffff' : palette[ch];
        g.fillRect(x * SPRITE_PX, y * SPRITE_PX, SPRITE_PX, SPRITE_PX);
    }));
    return c;
}

// { img, white, crown } para una unidad, o null si no tiene sprite.
function spriteFor(u) {
    let key, template, palette, crown = false;
    if (u.isHero) {
        const def = HERO_SPRITES[u.key];
        if (!def) return null;
        key = 'hero:' + u.key; [template, palette] = def;
    } else if (u.isRoundBoss) {
        key = 'boss:' + u.type.key; template = BOSS_SPRITES[u.type.key] || 'golem'; palette = paletteFrom(u.color);
        crown = template === 'bug' || template === 'robed';
    } else if (u.type) {
        key = 'creep:' + u.type.key + (u.isBoss ? ':boss' : '');
        template = CREEP_SPRITE_TEMPLATE[u.type.key] || 'humanoid';
        palette = paletteFrom(u.type.color, CREEP_SPRITE_EXTRA[u.type.key]);
        crown = u.isBoss;
    } else return null;
    if (!spriteCache[key]) spriteCache[key] = { img: buildSprite(template, palette), white: buildSprite(template, palette, true), crown };
    return spriteCache[key];
}

// Imagen (data URL) de un héroe para la interfaz (retrato, ranking).
const spriteUrlCache = {};
function heroSpriteUrl(hero) {
    if (!spritesOn) return null;
    const s = spriteFor(hero);
    if (!s) return null;
    return spriteUrlCache[hero.key] || (spriteUrlCache[hero.key] = s.img.toDataURL());
}

// Imagen (data URL) de cualquier unidad para la interfaz: héroes, creeps y jefes (glosarios, aviso de oleada).
const unitUrlCache = {};
function unitSpriteUrl(u, cacheKey) {
    if (!spritesOn) return null;
    if (!unitUrlCache[cacheKey]) { const s = spriteFor(u); if (!s) return null; unitUrlCache[cacheKey] = s.img.toDataURL(); }
    return unitUrlCache[cacheKey];
}
// Ícono de un tipo de creep o de un jefe de ronda (o su símbolo si están las letras ASCII).
function unitIconHtml(t, size = 'md') {
    const isRoundBoss = typeof ROUND_BOSSES !== 'undefined' && ROUND_BOSSES.includes(t);
    const url = unitSpriteUrl(isRoundBoss ? { isRoundBoss: true, type: t, color: t.color } : { type: t }, (isRoundBoss ? 'boss:' : 'creep:') + t.key);
    return url ? `<img src="${url}" alt="${t.symbol}" class="pixel-img unit-icon ${size}">` : `<span class="creep-symbol" style="color:${t.color}">${t.symbol}</span>`;
}
function heroIconHtml(t, size = 'md') {
    const url = heroSpriteUrl({ isHero: true, key: t.key });
    return url ? `<img src="${url}" alt="${t.symbol}" class="pixel-img unit-icon ${size}">` : `<span class="hc-symbol" style="color:${ATTR_INFO[t.primaryAttr].color}">${t.symbol}</span>`;
}

// --- DIBUJO ---
let spritesOn = true;
try { spritesOn = localStorage.getItem('chc-sprites') !== 'off'; } catch (e) { /* queda prendido */ }

function setSprites(on) {
    spritesOn = on;
    try { localStorage.setItem('chc-sprites', on ? 'on' : 'off'); } catch (e) { /* no se guarda */ }
    const btn = document.getElementById('sprites-btn');
    if (btn) btn.textContent = on ? '🎨 Pixel' : '🔤 ASCII';
    if (typeof lastKitSignature !== 'undefined') lastKitSignature = '';
    if (typeof lastScoreboardSignature !== 'undefined') lastScoreboardSignature = '';
    // los glosarios muestran los íconos o las letras según el modo
    if (typeof renderHeroCodex === 'function' && document.getElementById('hero-codex')) { renderHeroCodex(); renderCreepCodex(); }
}

// Dibuja el sprite centrado en (cx, cy) con el tamaño size (px). facing: 1 mira a la derecha, -1 a la izquierda.
function drawSprite(s, cx, cy, size, facing, flash, pose) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(cx, cy);
    if (pose) { ctx.rotate(pose.rot * (facing < 0 ? -1 : 1)); ctx.scale(pose.sx, pose.sy); }
    if (facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(flash ? s.white : s.img, -size / 2, -size / 2, size, size);
    ctx.restore();
    if (s.crown) { // corona para los jefes
        const w = size * 0.42, top = cy - size / 2 - 2;
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.moveTo(cx - w / 2, top + 5); ctx.lineTo(cx - w / 2, top); ctx.lineTo(cx - w / 4, top + 3); ctx.lineTo(cx, top - 1);
        ctx.lineTo(cx + w / 4, top + 3); ctx.lineTo(cx + w / 2, top); ctx.lineTo(cx + w / 2, top + 5); ctx.closePath(); ctx.fill();
    }
}
