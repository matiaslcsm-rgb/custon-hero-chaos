// Infinite Tower: la torre por dentro — el lugar, la gente y la historia de cada piso (docs/TORRE-MUNDO.md, 2026-10-14).
//
//   Pedido del usuario: "el primer piso, la base, es el bosque; después la torre es gigante y tiene los biomas en su
//   interior; cada bioma con su gente que crea un pueblo; una historia interconectada entre pisos".
//   · El piso 1 es AFUERA: el bosque al pie de la torre. Del 2 en adelante estás ADENTRO: muro exterior de piedra,
//     columnas gigantes y restos de muros con puertas (towerInterior), más cerrado cuanto más alto.
//   · Cada piso tiene su lugar (por qué ese bioma está dentro de la torre), su gente y un anciano que te recibe en el
//     pueblo con su parte de la historia (la Expedición de Arén, los Ecos, la torre que crece).

const FLOOR_LORE = {
    1: { place: 'Al pie de la Torre', people: 'Los que Esperan', elder: 'la vieja Brena', outside: true,
        intro: 'El bosque al pie de la torre. Arriba, la piedra se pierde entre las nubes.',
        greet: '«Otro más para el libro... A ver, tu cara. Qué raro: ya te anoté. Varias veces.»' },
    2: { place: 'El Atrio Verde', people: 'Los Jardineros', elder: 'Hermano Musgo',
        intro: 'Adentro de la torre. El jardín de los constructores se desbordó: los árboles rompieron las baldosas y tapan las columnas.',
        greet: '«Cortamos y cortamos, y las raíces siguen bajando. No crecen desde el suelo, Eco: crecen desde arriba.»' },
    3: { place: 'Las Cisternas', people: 'Los Barqueros', elder: 'Madre Junco',
        intro: 'Las cisternas de la torre reventaron hace generaciones: los salones son una ciénaga con niebla.',
        greet: '«Las compuertas están cerradas desde que se fue la expedición. Quien tenga la llave baja el agua... y ve lo que hay abajo.»' },
    4: { place: 'La Raíz Ahogada', people: 'Los Pescadores de Raíz', elder: 'el viejo Tallo',
        intro: 'Una raíz más ancha que un pueblo bebe el agua de la torre. Todo lo que se pudre acá termina en ella.',
        greet: '«Yo subí con Arén. Éramos siete. Me quedé acá porque tuve miedo... ¿Vos no? Claro: los Ecos no se acuerdan.»' },
    5: { place: 'Las Salas del Reloj', people: 'Los Relojeros', elder: 'el Contador',
        intro: 'Relojes de arena del tamaño de torres se rompieron: la arena cae sin parar y tapó los salones.',
        greet: '«Cada vez que alguien llega a la cima, la arena cae más rápido: la torre crece un piso. La última vez fue hace muy poco.»' },
    6: { place: 'La Biblioteca Enterrada', people: 'Los Archivistas', elder: 'la archivista Sela',
        intro: 'La biblioteca de los constructores quedó bajo la arena. Solo asoman las estanterías más altas.',
        greet: '«Tenemos el diario de la expedición, pero le arrancaron las páginas. Una por piso, dicen. Las arrancó alguien que subía.»' },
    7: { place: 'Las Galerías del Viento', people: 'Los Faroleros', elder: 'Isla, la farolera',
        intro: 'Los ventanales de este piso se rompieron: entra la nieve de afuera y el viento apaga las luces.',
        greet: '«Si se apagan los faroles, la galería te traga. De noche no camines a oscuras, Eco.»' },
    8: { place: 'El Mirador Helado', people: 'Los Vigías', elder: 'el vigía Ondo',
        intro: 'Tan alto que el frío no se va nunca. Desde los miradores se ve el mar y, abajo, las nubes.',
        greet: '«Anotamos a todos los que suben. Hace cien años subió uno con tu capucha y tus ojos. No bajó.»' },
    9: { place: 'La Fragua', people: 'Los Herreros del Núcleo', elder: 'el maestro Brasa',
        intro: 'El calor del núcleo sube por las paredes. Acá se forja lo que mueve la torre.',
        greet: '«Lo que forjamos alimenta al Corazón, y el Corazón hace crecer la torre. Nadie sabe para qué.»' },
    10: { place: 'El Corazón de la Torre', people: 'El último refugio', elder: null,
        intro: 'El núcleo. Las paredes laten como si respiraran.',
        greet: 'No hay nadie. Solo un fuego que alguien dejó encendido y una capucha igual a la tuya, colgada de un clavo.' }
};
const FLOOR_LORE_BEYOND = { place: 'Lo No Escrito', people: null, elder: null, intro: 'Un piso recién crecido: nadie lo pisó nunca.', greet: null };
function floorLore(floor) { return FLOOR_LORE[floor] || FLOOR_LORE_BEYOND; }

// La primera vez en cada run que entrás al pueblo de un piso, su anciano te dice su parte de la historia
function towerLoreGreet(level) {
    if (!towerRun || level.isCave) return;
    const L = floorLore(level.floor), seen = towerRun.lore || (towerRun.lore = {});
    if (!L.greet || seen[level.floor]) return;
    seen[level.floor] = true;
    log(`📜 ${L.people}${L.elder ? ` · ${L.elder}` : ''}: ${L.greet}`);
}

// --- LAS PÁGINAS DE ARÉN (TORRE-MUNDO.md) ---
// El diario de la expedición tiene las páginas arrancadas: una por piso, tirada en el rincón más apartado del campo (lo
// más lejos de la entrada, pegado a muros o rocas). Se juntan al pisarlas y quedan para siempre, como el Bestiario: una
// vez encontrada, esa página ya no aparece en las runs siguientes. El Cuaderno (N) las muestra en orden.
const AREN_PAGES = {
    1: '«Somos siete. Brena nos anotó en su libro y se rió: dice que nadie vuelve a firmar dos veces. Arén firmó primero.»',
    2: '«Las raíces bajan desde arriba, como si algo allá adentro tuviera sed. Arén dice que vamos a ver qué la alimenta.»',
    3: '«Las compuertas no se abren. Junco nos cruzó en bote. Arén guardó la llave en la bolsa sin decirnos de dónde la sacó.»',
    4: '«Tallo se queda. Le tiembla todo. Arén le dejó su brújula y le dijo: "Si no volvemos, no subas a buscarnos".»',
    5: '«Los relojes caen más rápido cuando alguien llega arriba. Arén los miró mucho rato. "Ya pasó antes", dijo. ¿Cómo sabe?»',
    6: '«Somos cinco. Arén arranca estas páginas y las deja atrás, una por piso. Dice que son para alguien que viene después.»',
    7: '«Los faroles se apagan solos. En la oscuridad, Arén camina como si ya conociera el camino. No mira el mapa.»',
    8: '«Somos dos. Los vigías nos anotaron y nos miraron raro: dicen que Arén ya pasó por acá, hace mucho, con la misma capucha.»',
    9: '«Brasa forja sin parar para el Corazón. Arén le preguntó para qué. "Para que la torre siga creciendo", dijo. "Para que siga esperando."»',
    10: '«Quedo yo solo. El Corazón no mata: devuelve. Me va a bajar al bosque sin memoria, con este cuaderno. Si leés esto, Eco, esta es tu letra. Soy Arén. Sos Arén.»'
};
const AREN_KEY = 'chc-aren-pages';
let arenPersist = true; // las pruebas lo apagan
let arenStore = (() => { try { const a = JSON.parse(localStorage.getItem(AREN_KEY) || 'null'); if (a && a.found) return a; } catch (e) { /* vacío */ } return { found: {} }; })();
function arenSave() { if (!arenPersist) return; try { localStorage.setItem(AREN_KEY, JSON.stringify(arenStore)); } catch (e) { /* no se guarda */ } }
function arenFoundCount() { return Object.keys(arenStore.found).length; }
// El rincón más difícil del campo: lejos de la entrada (dist) y encerrado (muros alrededor). Sin pisar santuarios ni cuevas.
function placeArenPage(level, dist) {
    level.arenPage = null;
    if (!AREN_PAGES[level.floor] || arenStore.found[level.floor]) return;
    const at = (x, y) => y * COLS + x, taken = (level.shrines || []).concat(level.caves || []);
    let best = null, bestScore = -1;
    for (let y = 3; y < ROWS - 3; y++) for (let x = 3; x < COLS - 3; x++) {
        const i = at(x, y);
        if (level.zone[i] !== ZONE.field || dist[i] < 0 || level.ground[i] === GROUND.road || level.ground[i] === GROUND.hazard || !walkable(level, x, y)) continue;
        if (taken.some(s => s.x === x && s.y === y)) continue;
        let walls = 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (level.walls[y + dy][x + dx]) walls++;
        const score = dist[i] + walls * 3;
        if (score > bestScore) { bestScore = score; best = { x, y }; }
    }
    if (best) level.arenPage = Object.assign(best, { floor: level.floor });
}
function takeArenPage(level, hero) {
    const p = level.arenPage;
    if (!p || hero !== player || p.x !== hero.x || p.y !== hero.y) return;
    level.arenPage = null;
    arenStore.found[p.floor] = true; arenSave();
    if (fxArena(hero)) { fxRing(hero, '#e9dcc0', 2, 0.8); fxText(hero, `Página de Arén (${arenFoundCount()}/10)`, '#e9dcc0', 12, 2); }
    log(`📄 Una página arrancada del diario de la expedición (${arenFoundCount()}/10, la guardás en el Cuaderno, N): ${AREN_PAGES[p.floor]}`); sfx('levelup');
}
// En el Cuaderno, debajo de las páginas del tutorial: las de Arén en orden (las que faltan, en blanco)
function renderArenPages() {
    const box = document.getElementById('aren-pages');
    if (!box) return;
    box.innerHTML = `<h4 class="aren-title">📄 Las Páginas de Arén (${arenFoundCount()}/10)</h4>` + Object.keys(AREN_PAGES).map(f => arenStore.found[f]
        ? `<div class="notebook-page"><h4>Piso ${f} · ${floorLore(+f).place}</h4><p>${AREN_PAGES[f]}</p></div>`
        : `<div class="notebook-page locked"><h4>Piso ${f} · ???</h4><p>Arrancada. Está tirada en algún rincón apartado del piso ${f}.</p></div>`).join('');
}

// --- LA ARQUITECTURA DE LA TORRE (pisos 2+) ---
// Cada piso es una planta de la torre: muro exterior de piedra (en vez del borde del bosque) y SALONES enormes separados
// por muros gruesos con portones anchos; el bioma llena los salones. Abajo los muros están más derrumbados (piso abierto,
// explorado, gente que pasa); arriba quedan enteros (más cerrado, cuesta más encontrar el camino). Columnas en los salones.
const TOWER_ARCH = { band: 2, hall: [38, 30], thick: 2, gate: [4, 6], pillars: 26,
    ruin: floor => Math.max(0.12, 0.62 - floor * 0.06) }; // chance de que un tramo de muro esté derrumbado (piso 2: 50%, piso 9: 12%)
function towerInterior(g) {
    const { floor, walls, zone, deep, height, ramp, W, H, at, rint, guarded } = g;
    if (floor < 2) return; // el piso 1 es afuera
    const A = TOWER_ARCH;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
        if ((x < A.band || y < A.band || x >= W - A.band || y >= H - A.band) && zone[at(x, y)] === ZONE.field) walls[y][x] = WALL.stone;
    const free = (x, y) => x >= A.band && y >= A.band && x < W - A.band && y < H - A.band && zone[at(x, y)] === ZONE.field &&
        !guarded(x, y) && !deep[at(x, y)] && !height[at(x, y)] && !ramp[at(x, y)] && walls[y][x] !== WALL.cliff;
    const put = (x, y, w) => { if (free(x, y)) walls[y][x] = w; };
    // Muros de los salones: líneas cada `hall` casillas, cortadas en tramos (uno por salón) con un portón por tramo
    const [hw, hh] = A.hall, ox = rint(0, hw - 1), oy = rint(0, hh - 1);
    const segment = (horiz, line, from, to) => {
        if (Math.random() < A.ruin(floor)) { // derrumbado: quedan solo los muñones de las puntas
            for (let i = from; i < Math.min(to, from + 3); i++) for (let k = 0; k < A.thick; k++) horiz ? put(i, line + k, WALL.stone) : put(line + k, i, WALL.stone);
            return;
        }
        const gw = rint(A.gate[0], A.gate[1]), gs = rint(from + 4, Math.max(from + 4, to - gw - 4));
        for (let i = from; i < to; i++) for (let k = 0; k < A.thick; k++) {
            const gateHere = i >= gs && i < gs + gw, x = horiz ? i : line + k, y = horiz ? line + k : i;
            if (gateHere) { if (free(x, y)) walls[y][x] = 0; } else put(x, y, WALL.stone); // el portón se despeja para pasar siempre
        }
    };
    for (let x = ox; x < W - A.band; x += hw) if (x > A.band + 4) for (let y = A.band; y < H - A.band; y += hh) segment(false, x, y, Math.min(H - A.band, y + hh));
    for (let y = oy; y < H - A.band; y += hh) if (y > A.band + 4) for (let x = A.band; x < W - A.band; x += hw) segment(true, y, x, Math.min(W - A.band, x + hw));
    // Columnas de 2×2 o 3×3 con un claro alrededor (paradas en el piso del salón, no metidas en el bosque)
    for (let n = 0, t = 0; n < A.pillars && t < 4000; t++) {
        const s = rint(2, 3), x = rint(A.band + 3, W - A.band - 6), y = rint(A.band + 3, H - A.band - 6);
        let ok = true;
        for (let dy = -1; dy <= s && ok; dy++) for (let dx = -1; dx <= s && ok; dx++) ok = free(x + dx, y + dy) && walls[y + dy][x + dx] !== WALL.stone;
        if (!ok) continue;
        for (let dy = -1; dy <= s; dy++) for (let dx = -1; dx <= s; dx++) walls[y + dy][x + dx] = dx >= 0 && dy >= 0 && dx < s && dy < s ? WALL.stone : 0;
        n++;
    }
}
