// Tower Chaos: estilo pixel art con luz (PRUEBA, 2026-10-13). Referencias del usuario: Noita y Risk of Rain 1.
//
//   El mundo se dibuja como siempre y una pasada en la placa de video (WebGL) lo convierte en pixel art:
//   - RESOLUCIÓN BAJA: cada casilla queda en ~12 píxeles grandes (el héroe mide ~26), con escala entera para que los
//     píxeles sean todos iguales, y la cámara se mueve de a un píxel grande (sin "temblor" de bordes).
//   - LUZ (lo de Noita): el mundo está a oscuras y se ve por lo que alumbra: el héroe, antorchas, fogatas, la fragua,
//     santuarios, la lava, tus proyectiles y las balas enemigas. De día la luz ambiente es alta; de noche y en las
//     cuevas, baja. La luz se arma en una imagen chica aparte (mapa de luz) y el filtro la multiplica.
//   - BRILLO: lo saturado y luminoso (fuego, magia, balas, lava) se ilumina solo aunque esté a oscuras y suelta un halo.
//   - PALETA: colores más oscuros y saturados que el pergamino (el suelo de cada bioma tiene su paleta propia) y un
//     tramado ordenado que deja ver los escalones de color, como en los juegos de 16 bits.
//   La interfaz (minimapa, carteles, barra del jefe) y los números de daño van encima, sin filtro, para que se lean.
//   Se prende en la pausa (🟫 Estilo pixel) o con ?pixel=1 en la dirección. Apagado, el juego queda como estaba.

const PIXEL = { perTile: 12, minPx: 2 };
let pixelEnabled = /[?&]pixel=1/.test(location.search);
try { if (!/[?&]pixel=/.test(location.search)) pixelEnabled = localStorage.getItem('chc-pixel') === 'on'; } catch (e) { /* sin almacenamiento */ }
let pixelGL = null; // { canvas, gl, tex: {scene, light}, loc, failed }
let pixelLight = null, pixelLightCtx = null, pixelPx = 3, pixelLowW = 0, pixelLowH = 0;
let fxTextPass = null; // null: drawArenaFx dibuja todo · 'skip': todo menos los números · 'only': solo los números

function pixelOn() { return pixelEnabled && gameMode === 'tower' && towerLayout && !(pixelGL && pixelGL.failed); }
function setPixelStyle(on) {
    pixelEnabled = on;
    try { localStorage.setItem('chc-pixel', on ? 'on' : 'off'); } catch (e) { /* no se guarda */ }
}

// Paleta del suelo de cada bioma en el estilo pixel: más oscura y saturada (el pergamino era pastel)
const PIXEL_BIOME_COLORS = {
    forest: { ground: '#34462a', ground2: '#2f4026', speck: '#5d7d34', hazard: '#41562a', hazardInk: '#8fb04a', obstacle: '#3f7a32', road: '#5a4632', deep: '#1f4a5e' },
    swamp: { ground: '#30362a', ground2: '#2b3125', speck: '#55603c', hazard: '#3f4720', hazardInk: '#a4c23a', obstacle: '#4a3a2c', road: '#463c2c', deep: '#1d3d38' },
    desert: { ground: '#8a6538', ground2: '#805d33', speck: '#a8824a', hazard: '#9a7038', hazardInk: '#d0a060', obstacle: '#7a5f40', road: '#6e5432', deep: '#1f4a5e' },
    snow: { ground: '#a9b8c6', ground2: '#9eadbd', speck: '#dbe6ee', hazard: '#bccbd8', hazardInk: '#5f7d97', obstacle: '#2f5a48', road: '#78726a', deep: '#2d5f84' },
    volcano: { ground: '#2e2422', ground2: '#28201e', speck: '#4e3c34', hazard: '#3f2016', hazardInk: '#ff7a1a', obstacle: '#221d1b', road: '#3e332c', deep: '#ff6418' }
};
function biomeColors(key) { return pixelOn() ? { ...BIOMES[key].colors, ...PIXEL_BIOME_COLORS[key] } : BIOMES[key].colors; }
function tileStyleKey(key) { return pixelOn() ? key + ':px' : key; }

// --- TAMAÑO DEL PÍXEL Y CÁMARA ---
// Píxel grande en píxeles reales del canvas (entero), según el zoom: siempre ~12 por casilla
function pixelSize() {
    const k = window.devicePixelRatio || 1;
    return Math.max(PIXEL.minPx, Math.round(TILE * viewScale() * k / PIXEL.perTile));
}
// La cámara se mueve de a un píxel grande (si no, los bordes "bailan" al caminar)
function pixelSnapCamera() {
    if (!pixelOn()) return;
    const step = pixelSize() / (TILE * viewScale() * (window.devicePixelRatio || 1));
    camera.x = Math.round(camera.x / step) * step; camera.y = Math.round(camera.y / step) * step;
}

// --- MAPA DE LUZ ---
// Imagen chica (un píxel por píxel grande). El filtro lo multiplica ×2: 0,5 es la luz "normal" del día.
function pixelAmbient(level) {
    if (level.isCave) return Math.max(0.05, 0.16 - 0.03 * (level.depth || 1));
    if (!level.zone || towerZoneAt(level, player.x, player.y) === ZONE.lab) return 0.2; // el laberinto de piedra: penumbra
    return 0.42 - 0.32 * towerDarkness();
}
function pixelLightMap(level) {
    if (!pixelLight) { pixelLight = document.createElement('canvas'); pixelLightCtx = pixelLight.getContext('2d'); }
    if (pixelLight.width !== pixelLowW || pixelLight.height !== pixelLowH) { pixelLight.width = pixelLowW; pixelLight.height = pixelLowH; }
    const g = pixelLightCtx, a = Math.round(pixelAmbient(level) * 255);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = `rgb(${a},${Math.round(a * 0.97)},${Math.round(a * 1.06)})`; g.fillRect(0, 0, pixelLowW, pixelLowH); // ambiente apenas frío
    g.globalCompositeOperation = 'lighter';
    const k = (window.devicePixelRatio || 1) / pixelPx, z = viewScale() * k; // casillas → píxeles grandes
    const light = (x, y, r, rgb, power = 1) => {
        const sx = (x - camera.x + 0.5) * TILE * z, sy = (y - camera.y + 0.5) * TILE * z, rr = r * TILE * z;
        if (sx < -rr || sy < -rr || sx > pixelLowW + rr || sy > pixelLowH + rr) return;
        const grd = g.createRadialGradient(sx, sy, 0, sx, sy, rr);
        grd.addColorStop(0, `rgba(${rgb},${0.5 * power})`); grd.addColorStop(0.45, `rgba(${rgb},${0.22 * power})`); grd.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = grd; g.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
    };
    const rgbOf = hex => { const n = parseInt(hex.slice(1, 7), 16); return `${n >> 16},${(n >> 8) & 255},${n & 255}`; };
    if (player.isAlive()) { const p = drawPos(player, 0); light(p.x, p.y, Math.min(9, heroSight(player)) * 0.95, '255,236,205', 0.45); } // tu farol
    towerLights(level).forEach(o => { // antorchas, fogatas y fragua (towerAtmos.js)
        if (!canSeeOrExplored(level, o)) return;
        const r = LIGHT_KIND[o.kind].r * (o.kind === 'fire' ? 1.1 : 1) * flicker(o, 1.6);
        light(o.x, o.y, r * 1.2, '255,165,80', 2);
    });
    const tw = level.town; if (tw && !level.isCave) light(tw.merchant.x, tw.merchant.y + 3, 8, '255,190,120', 0.6);
    (level.shrines || []).forEach(s => { if (!s.used && level.explored[s.y][s.x]) light(s.x, s.y, 2.6, rgbOf(SHRINES[s.kind].color || '#ffffff'), 0.9); });
    if (level.exitUp) light(level.exitUp.x, level.exitUp.y, 3, '255,220,150', 0.8);
    (level.zones || []).forEach(zn => { if (zn.kind === 'lava') light(zn.x, zn.y, 3, '255,90,20', 1); });
    level.projectiles.forEach(p => { // tus proyectiles alumbran del color de su elemento
        const lk = projectileLook(p), col = lk ? lk.c1 : '#ffe8a0';
        light(p.x, p.y, p.kind === 'skill' ? 2.4 : 1.5, rgbOf(col), 1);
    });
    (level.bullets || []).forEach(b => light(b.x, b.y, 1.3, rgbOf(b.color || '#ff3020'), 1)); // las balas se ven en la oscuridad
    (level.fx || []).forEach(f => { // golpes y hechizos: un destello breve
        const t = (fxClock - f.born) / f.life;
        if (t < 0 || t > 1 || f.kind === 'text' || !f.color || f.color[0] !== '#') return;
        const r = f.kind === 'ring' ? (f.radius || 1.6) : f.kind === 'particle' ? 0.5 : 1.2;
        light(f.x, f.y, r, rgbOf(f.color), (1 - t) * (f.kind === 'particle' ? 0.35 : 0.7));
    });
    return pixelLight;
}

// --- WEBGL ---
const PIXEL_VS = 'attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }';
const PIXEL_FS = `precision mediump float;
varying vec2 uv;
uniform sampler2D uScene, uLight;
uniform vec2 uLow, uCover; // tamaño en píxeles grandes; parte del canvas que cubre la imagen chica
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 scene(vec2 q) { return texture2D(uScene, q * uCover).rgb; } // la textura viene sin dar vuelta: y=0 es arriba
// Promedio de la celda (2×2 muestras): el pixelado no "parpadea" con las líneas finas
vec3 cell(vec2 c) { vec2 d = 0.25 / uLow; return (scene(c + d) + scene(c - d) + scene(c + vec2(d.x, -d.y)) + scene(c + vec2(-d.x, d.y))) * 0.25; }
// Cuánto "brilla solo": saturado y luminoso (fuego, magia, balas, lava)
float emissive(vec3 c) { float hi = max(c.r, max(c.g, c.b)), lo = min(c.r, min(c.g, c.b)); return smoothstep(0.42, 0.75, hi - lo) * smoothstep(0.55, 0.9, hi); }
float bayer(vec2 p) { // tramado ordenado 4×4
    vec2 q = mod(p, 4.0); float x = q.x, y = q.y;
    float v = mod(x, 2.0) * 2.0 + mod(y, 2.0) * 3.0 - 2.0 * mod(x, 2.0) * mod(y, 2.0);
    float w = mod(floor(x / 2.0), 2.0) * 2.0 + mod(floor(y / 2.0), 2.0) * 3.0 - 2.0 * mod(floor(x / 2.0), 2.0) * mod(floor(y / 2.0), 2.0);
    return (v * 4.0 + w) / 16.0;
}
void main() {
    vec2 px = floor(vec2(uv.x, 1.0 - uv.y) * uLow);       // píxel grande desde arriba a la izquierda
    vec2 c0 = (px + 0.5) / uLow;
    vec3 c = cell(c0);
    // Paleta: más contraste y saturación, medios más oscuros
    float L = lum(c);
    vec3 g = clamp(mix(vec3(L), c, 1.35), 0.0, 1.0);
    g = pow(g, vec3(1.25)) * 0.95;
    float e = emissive(c);
    vec3 light = min(texture2D(uLight, c0).rgb * 2.0, vec3(1.2)); // con tope: cerca de una luz no se "quema"
    vec3 col = g * light + c * e * 0.85;                    // lo que brilla se ve aunque esté a oscuras
    // Halo de lo que brilla (dos anillos de 8 muestras)
    vec3 halo = vec3(0.0);
    for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.785398 + 0.39;
        vec2 dir = vec2(cos(a), sin(a)) / uLow;
        vec3 s1 = scene(c0 + dir * 2.0), s2 = scene(c0 + dir * 4.5);
        halo += s1 * emissive(s1) * 0.6 + s2 * emissive(s2) * 0.4;
    }
    col += halo * 0.11;
    // Escalones de color con tramado (32 niveles por canal) y viñeta suave
    col = floor(col * 31.0 + bayer(px)) / 31.0;
    vec2 v = uv - 0.5; col *= 1.0 - dot(v, v) * 0.55;
    gl_FragColor = vec4(col, 1.0);
}`;
function pixelInit() {
    if (pixelGL) return pixelGL;
    pixelGL = { failed: false };
    try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl', { premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true });
        if (!gl) throw new Error('sin WebGL');
        const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
        const prog = gl.createProgram();
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, PIXEL_VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, PIXEL_FS));
        gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        gl.useProgram(prog);
        const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const p = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(p); gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
        const tex = unit => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
        Object.assign(pixelGL, { canvas: c, gl, tex: { scene: tex(0), light: tex(1) }, loc: n => gl.getUniformLocation(prog, n) });
        gl.uniform1i(pixelGL.loc('uScene'), 0); gl.uniform1i(pixelGL.loc('uLight'), 1);
    } catch (e) { pixelGL.failed = true; console.warn('Estilo pixel no disponible:', e.message); }
    return pixelGL;
}

// Antes de dibujar el mundo: tamaño del píxel grande y cámara alineada
function pixelBegin() {
    pixelPx = pixelSize();
    pixelLowW = Math.ceil(canvas.width / pixelPx); pixelLowH = Math.ceil(canvas.height / pixelPx);
    pixelSnapCamera();
}
// Convierte lo que hay en el canvas (el mundo) en pixel art con luz, y lo vuelve a poner en el canvas
function pixelRender(level) {
    const P = pixelInit();
    if (P.failed) return false;
    const gl = P.gl, c = P.canvas;
    if (c.width !== pixelLowW || c.height !== pixelLowH) { c.width = pixelLowW; c.height = pixelLowH; }
    gl.viewport(0, 0, pixelLowW, pixelLowH);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, P.tex.scene);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, P.tex.light);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pixelLightMap(level));
    gl.uniform2f(P.loc('uLow'), pixelLowW, pixelLowH);
    gl.uniform2f(P.loc('uCover'), pixelLowW * pixelPx / canvas.width, pixelLowH * pixelPx / canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // De vuelta al canvas, agrandado sin suavizar (escala entera)
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, 0, 0, pixelLowW * pixelPx, pixelLowH * pixelPx);
    ctx.restore();
    return true;
}
// Los números de daño, encima del pixelado (se leen igual que siempre)
function pixelFxTexts(level) {
    ctx.save();
    ctx.scale(viewScale(), viewScale());
    ctx.translate(-camera.x * TILE, -camera.y * TILE);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fxTextPass = 'only'; drawArenaFx(level); fxTextPass = null;
    ctx.restore();
}
