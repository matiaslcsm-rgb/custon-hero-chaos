// Tower Chaos: estilo ASCII (PRUEBA, 2026-10-07), inspirado en las referencias del usuario (el MMORPG ASCII de ansenjeo).
//
//   El mundo se dibuja como siempre y una pasada en la placa de video (WebGL) lo convierte en caracteres: cada celda
//   de 6×10 px toma el color de lo que hay abajo y elige un carácter según cuánta "tinta" tiene (lo claro del pergamino
//   queda vacío, lo oscuro y lo de color se llena de Q, 0, 8, &…). Fondo azul noche, colores apagados y brillo naranja
//   alrededor del fuego. La niebla y la noche no se pintan: llegan al filtro como "menos luz" (una máscara aparte).
//   La interfaz (minimapa, barra del jefe, carteles) se dibuja después, encima y sin filtro, para que se lea.
//   Se prende en la pausa (🔤 Estilo ASCII) o con ?ascii=1 en la dirección.

const ASCII = { cellW: 6, cellH: 10, font: 'bold 10px Consolas, "Courier New", monospace', bg: [0.035, 0.04, 0.085] };
// Caracteres de menos a más densos; 3 juegos parecidos para que no se vea una grilla repetida
const ASCII_RAMPS = [' .:-=+*oQ@', ' .,;~ia08&', ' \'^"xdbQ$#'];
let asciiEnabled = /[?&]ascii=1/.test(location.search);
try { if (!/[?&]ascii=/.test(location.search)) asciiEnabled = localStorage.getItem('chc-ascii') === 'on'; } catch (e) { /* sin almacenamiento */ }
let asciiGL = null; // { canvas, gl, prog, tex: {scene, shade, atlas}, loc, failed }
let asciiShade = null, asciiShadeCtx = null;

function asciiOn() { return asciiEnabled && gameMode === 'tower' && towerLayout && !(asciiGL && asciiGL.failed); }
function setAscii(on) {
    asciiEnabled = on;
    try { localStorage.setItem('chc-ascii', on ? 'on' : 'off'); } catch (e) { /* no se guarda */ }
    if (asciiGL) asciiGL.canvas.style.display = 'none';
}

// --- MÁSCARA DE LUZ (niebla y noche) ---
// Mismo tamaño que el canvas; se dibuja con la misma transformación que el mundo
function asciiShadeBegin() {
    if (!asciiShade) { asciiShade = document.createElement('canvas'); asciiShadeCtx = asciiShade.getContext('2d'); }
    if (asciiShade.width !== canvas.width || asciiShade.height !== canvas.height) { asciiShade.width = canvas.width; asciiShade.height = canvas.height; }
    asciiShadeCtx.setTransform(1, 0, 0, 1, 0, 0);
    asciiShadeCtx.clearRect(0, 0, asciiShade.width, asciiShade.height);
    asciiShadeCtx.setTransform(ctx.getTransform());
    return asciiShadeCtx;
}
function asciiShadeSync() { asciiShadeCtx.setTransform(ctx.getTransform()); return asciiShadeCtx; }

// --- WEBGL ---
const ASCII_VS = 'attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }';
const ASCII_FS = `precision mediump float;
varying vec2 uv;
uniform sampler2D uScene, uShade, uAtlas;
uniform vec2 uRes, uCell;
uniform float uGlyphs, uRows;
uniform vec3 uBg;
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 scene(vec2 q) { return texture2D(uScene, q).rgb; } // la textura viene sin dar vuelta: y=0 es arriba
void main() {
    vec2 px = vec2(uv.x, 1.0 - uv.y) * uRes;              // píxeles desde arriba a la izquierda
    vec2 cell = floor(px / uCell);
    vec2 c0 = (cell + 0.5) * uCell / uRes, d = uCell / uRes * 0.25;
    vec3 c = (scene(c0) * 2.0 + scene(c0 + vec2(d.x, d.y)) + scene(c0 - vec2(d.x, d.y)) + scene(c0 + vec2(d.x, -d.y)) + scene(c0 + vec2(-d.x, d.y))) / 6.0;
    float shade = texture2D(uShade, c0).a; // 1 = sin luz (no descubierto o noche cerrada)
    float L = lum(c);
    float hi = max(c.r, max(c.g, c.b)), lo = min(c.r, min(c.g, c.b)), sat = hi - lo;
    // Cuánta "tinta": lo oscuro y lo saturado se llena; el papel claro casi no (puntitos)
    float density = clamp(smoothstep(0.84, 0.16, L) + sat * 0.9, 0.0, 1.0);
    float h2 = hash(cell + 17.3);
    if (density < 0.16) density = h2 > 0.72 ? density * 1.6 : 0.0; // el suelo casi vacío: algún carácter suelto, sin grilla
    if (L < 0.035) density = 0.0;                           // el negro del fondo queda vacío
    // Color del carácter: lo oscuro (las líneas de tinta) pasa a gris azulado claro; el color se apaga un poco
    vec3 tint = mix(c / max(hi, 0.3), vec3(0.62, 0.69, 0.78), smoothstep(0.42, 0.08, L) * (1.0 - sat));
    tint = mix(vec3(lum(tint)), tint, 0.85) * (0.32 + 0.95 * density); // lo denso, brillante; el suelo, apagado
    float gi = floor(clamp(density, 0.0, 0.999) * uGlyphs);
    float row = floor(hash(cell) * uRows);
    vec2 local = fract(px / uCell);
    float a = texture2D(uAtlas, vec2((gi + local.x) / uGlyphs, (row + local.y) / uRows)).a;
    vec3 col = mix(uBg + c * 0.035, tint, a);
    // Brillo del fuego: lo cálido y saturado alrededor ilumina las celdas vecinas
    float glow = 0.0;
    for (int i = 0; i < 8; i++) {
        float ang = float(i) * 0.785398;
        vec3 s = scene(c0 + vec2(cos(ang), sin(ang)) * uCell / uRes * 2.6);
        glow += max(0.0, s.r - s.b - 0.35) * step(0.55, s.r);
    }
    float own = max(0.0, c.r - c.b - 0.35) * step(0.55, c.r);
    col += vec3(1.0, 0.55, 0.15) * (glow * 0.09 + own * 0.6);
    col *= 1.0 - shade * 0.92;
    gl_FragColor = vec4(col, 1.0);
}`;
function asciiInit() {
    if (asciiGL) return asciiGL;
    asciiGL = { failed: false };
    try {
        const c = document.createElement('canvas');
        c.id = 'ascii-gl';
        canvas.parentNode.insertBefore(c, canvas);
        const gl = c.getContext('webgl', { premultipliedAlpha: false, antialias: false });
        if (!gl) throw new Error('sin WebGL');
        const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
        const prog = gl.createProgram();
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, ASCII_VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, ASCII_FS));
        gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        gl.useProgram(prog);
        const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const p = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(p); gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
        const tex = unit => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
        Object.assign(asciiGL, { canvas: c, gl, prog, tex: { scene: tex(0), shade: tex(1), atlas: tex(2) }, atlasKey: '',
            loc: n => gl.getUniformLocation(prog, n) });
        gl.uniform1i(asciiGL.loc('uScene'), 0); gl.uniform1i(asciiGL.loc('uShade'), 1); gl.uniform1i(asciiGL.loc('uAtlas'), 2);
    } catch (e) { asciiGL.failed = true; console.warn('Estilo ASCII no disponible:', e.message); }
    return asciiGL;
}
// Los caracteres, dibujados una vez en una imagen (una fila por juego de caracteres)
function asciiAtlas(cw, ch) {
    const g = asciiGL, key = cw + 'x' + ch;
    if (g.atlasKey === key) return;
    g.atlasKey = key;
    const n = ASCII_RAMPS[0].length, a = document.createElement('canvas');
    a.width = cw * n; a.height = ch * ASCII_RAMPS.length;
    const x = a.getContext('2d');
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = ASCII.font.replace('10px', Math.round(ch * 0.95) + 'px');
    ASCII_RAMPS.forEach((ramp, r) => [...ramp].forEach((chr, i) => x.fillText(chr, i * cw + cw / 2, r * ch + ch / 2 + 1)));
    const gl = g.gl;
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, g.tex.atlas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, a);
    gl.uniform1f(g.loc('uGlyphs'), n); gl.uniform1f(g.loc('uRows'), ASCII_RAMPS.length);
}
// Convierte lo que hay en el canvas en caracteres (en la capa de abajo) y deja el canvas limpio para la interfaz
function asciiRender() {
    const g = asciiInit();
    if (g.failed) return false;
    const gl = g.gl, c = g.canvas, k = window.devicePixelRatio || 1;
    if (c.width !== canvas.width || c.height !== canvas.height) { c.width = canvas.width; c.height = canvas.height; }
    c.style.width = canvas.style.width; c.style.height = canvas.style.height; c.style.display = 'block';
    document.body.classList.add('ascii-on'); // el canvas de arriba sin fondo (style.css)
    c.style.left = canvas.offsetLeft + 'px'; c.style.top = canvas.offsetTop + 'px';
    gl.viewport(0, 0, c.width, c.height);
    const cw = Math.round(ASCII.cellW * k), ch = Math.round(ASCII.cellH * k);
    asciiAtlas(cw, ch);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, g.tex.scene);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, g.tex.shade);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, asciiShade);
    gl.uniform2f(g.loc('uRes'), c.width, c.height); gl.uniform2f(g.loc('uCell'), cw, ch); gl.uniform3fv(g.loc('uBg'), ASCII.bg);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // El canvas de arriba queda transparente: ahí va la interfaz
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.restore();
    return true;
}
function asciiHide() { if (asciiGL && asciiGL.canvas) asciiGL.canvas.style.display = 'none'; document.body.classList.remove('ascii-on'); }
