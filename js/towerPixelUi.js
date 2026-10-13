// Tower Chaos: interfaz en pixel art (PRUEBA, 2026-10-13; va con el suelo en pixel art, towerPixel.js).
//
//   - HTML (ventanas, barra del héroe, avisos): body.pixel-ui prende el tema de style.css (paneles oscuros con borde de
//     píxeles y fuente Pixelify Sans) encima del de pergamino.
//   - CANVAS: con el pixel art prendido, la letra de los carteles dibujados (Georgia) pasa a la fuente pixel. Y en la
//     pasada de interfaz (título del piso, minimapa, barra del jefe, cartel de campeones, mapa grande, cartel del arma)
//     los colores del pergamino se cambian por los del panel oscuro: el papel pasa a oscuro y la tinta a texto claro.
//     Se hace en el contexto del canvas (ctx.font, fillStyle, strokeStyle), así no hay que tocar cada función de dibujo.

let pxUiPass = false; // true mientras se dibuja la interfaz encima del mundo (renderTower)
const PXUI_FONT = "'Pixelify Sans', Consolas, monospace";
const PXUI_FILL = {
    '#e9dcc0': '#241e19', '#f1e7d0': '#241e19', '#e4d6b9': '#2f2822', '#d8c7a3': '#2f2822', '#f3e7c9': '#efe4cc',
    'rgba(241,231,208,0.97)': 'rgba(36,30,25,0.96)', 'rgba(241,231,208,0.93)': 'rgba(36,30,25,0.93)', 'rgba(233,220,192,0.95)': 'rgba(36,30,25,0.95)',
    '#1d1712': '#efe4cc', '#3d3226': '#c9bba0', '#5e5444': '#b8a98f', '#6b2a1f': '#f0a060', '#8a5a00': '#e8c060',
    '#1d4e89': '#7fb0ff', '#4a3f9a': '#b0a4ff', '#2f5d62': '#7fd0d8'
};
const PXUI_STROKE = { '#1d1712': '#5d5043', '#2b2118': '#5d5043', '#8f8166': '#5d5043', '#5e5444': '#5d5043' };
(function pxUiHookCanvas() {
    const P = CanvasRenderingContext2D.prototype, main = canvas.getContext('2d');
    const wrap = (prop, map) => {
        const d = Object.getOwnPropertyDescriptor(P, prop);
        Object.defineProperty(main, prop, { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, map(v)); } });
    };
    const on = () => gameMode === 'tower' && typeof pixelOn === 'function' && pixelOn();
    wrap('font', v => (on() && typeof v === 'string' && /Georgia|Palatino|serif/.test(v) ? v.replace(/(Georgia|'Palatino Linotype'|Palatino|serif).*$/, PXUI_FONT) : v));
    wrap('fillStyle', v => {
        if (!pxUiPass || typeof v !== 'string') return v;
        const k = v.replace(/\s/g, '').toLowerCase();
        if (PXUI_FILL[k]) return PXUI_FILL[k];
        const m = k.match(/^rgba\((2[0-5]\d),(2[0-5]\d),(1[6-9]\d|2\d\d),([\d.]+)\)$/); // papel claro con cualquier transparencia
        return m ? `rgba(36,30,25,${m[4]})` : v;
    });
    wrap('strokeStyle', v => (pxUiPass && typeof v === 'string' && PXUI_STROKE[v.toLowerCase()] ? PXUI_STROKE[v.toLowerCase()] : v));
})();
// La clase del body (tema HTML) acompaña al pixel art en la Torre
function pxUiSync() { document.body.classList.toggle('pixel-ui', gameMode === 'tower' && pixelOn()); pxUiPass = false; }
