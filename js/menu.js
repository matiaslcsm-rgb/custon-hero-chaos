// Menú de inicio, tutorial y fase de elección de héroe.
//
//   Menú ('MENU'): "Iniciar partida" o "Tutorial".
//   Elección de héroe ('HERO_SELECT'): a cada jugador se le reparten HERO_PICK_OPTIONS héroes al azar. Vos elegís uno de
//   los tuyos o "Héroe al azar" (uno que no está entre tus opciones). Los héroes elegidos nunca se repiten.
//   Tus opciones son solo tuyas; entre los rivales, las opciones no se repiten mientras alcancen los héroes
//   (hacen falta MAX_HEROES × HERO_PICK_OPTIONS; con menos, las de los rivales se pisan pero los picks no).

const HERO_PICK_OPTIONS = 3;
let heroOffers = null; // opciones de cada lugar: heroOffers[0] = las del jugador, [1..7] = las de los rivales

// --- MENÚ ---
function showMenu() {
    gameState = 'MENU';
    showPanel('menu-panel', true);
    showPanel('hero-select-panel', false);
    setStateText('MENÚ');
}

// --- ELECCIÓN DE HÉROE ---
function dealHeroOffers(templates = Object.values(HERO_TEMPLATES)) {
    const all = shuffle(templates.slice());
    const offers = [all.slice(0, HERO_PICK_OPTIONS)];
    const unique = all.length >= MAX_HEROES * HERO_PICK_OPTIONS;
    for (let i = 1; i < MAX_HEROES; i++) {
        offers.push(unique ? all.slice(i * HERO_PICK_OPTIONS, (i + 1) * HERO_PICK_OPTIONS)
            : shuffle(all.filter(t => !offers[0].includes(t))).slice(0, HERO_PICK_OPTIONS));
    }
    return offers;
}

// Héroe de "Héroe al azar": uno que no está entre tus opciones (si hubiera, si no cualquiera).
function randomHeroPick() {
    const others = Object.values(HERO_TEMPLATES).filter(t => !heroOffers || !heroOffers[0].includes(t));
    return pickRandom(others.length ? others : Object.values(HERO_TEMPLATES));
}

function startHeroPick() {
    heroOffers = dealHeroOffers();
    gameState = 'HERO_SELECT';
    showPanel('menu-panel', false);
    showPanel('hero-select-panel', true);
    setStateText('ELECCIÓN DE HÉROE');
    setPhaseTimer(PHASE_TIMES.heroSelect);
    renderHeroPick();
    log(`🎲 Elegí tu héroe entre tus ${HERO_PICK_OPTIONS} opciones o probá suerte con uno al azar.`);
}

// Los rivales eligen de sus opciones, sin repetir ningún héroe ya elegido.
function pickRivalTemplates(playerTemplate) {
    const offers = heroOffers || dealHeroOffers();
    const taken = [playerTemplate];
    for (let i = 1; i < MAX_HEROES; i++) {
        const own = offers[i].filter(t => !taken.includes(t));
        const rest = Object.values(HERO_TEMPLATES).filter(t => !taken.includes(t));
        // Si ya no quedan héroes sin elegir (menos plantillas que jugadores), se repiten
        taken.push(pickRandom(own.length ? own : rest.length ? rest : Object.values(HERO_TEMPLATES)));
    }
    return taken.slice(1);
}

// --- TUTORIAL ---
const TUTORIAL_PAGES = [
    { title: '🎯 El objetivo', body: `
        <p>Juegan <b>8 héroes</b>: vos y 7 rivales de la IA. Cada ronda peleás contra creeps y después en duelos contra los otros héroes.</p>
        <p>Gana el <b>último que quede en pie</b> o, si se llega a la <b>ronda 20</b>, el <b>primero del ranking</b>.</p>
        <p>El ranking se ordena por <b>puntos</b>: ganar un duelo da <b>+3</b> y superar la oleada sin morir <b>+1</b>. El oro desempata.</p>` },
    { title: '🔁 Una ronda', body: `
        <ol>
            <li><b>Draft:</b> elegís una habilidad nueva entre 3 (hasta tener 4).</li>
            <li><b>Preparación:</b> tienda, subir habilidades y usar objetos del destino. Arriba ves el <b>aviso de la próxima oleada</b>.</li>
            <li><b>Oleada:</b> cada héroe pelea contra los mismos creeps en su propia arena.</li>
            <li><b>Previa de duelos</b> (desde la ronda 5): ves las parejas y podés apostar a un duelo ajeno.</li>
            <li><b>Duelos 1 contra 1</b> (desde la ronda 5; las rondas 1 a 4 son para armar tu kit).</li>
            <li><b>Jefe de ronda</b> (cada 5 rondas): todos juntos contra un jefe.</li>
            <li><b>Ranking</b> y a la ronda siguiente.</li>
        </ol>
        <p>Cada fase tiene un tiempo: si se acaba, el juego decide por vos.</p>` },
    { title: '🎮 Controles', body: `
        <p><b>W A S D</b>, flechas o <b>clic derecho</b> en el mapa: moverte. <b>El ataque es automático</b> contra el enemigo a tiro más cercano (o el prioritario, como los Sanadores).</p>
        <p><b>Habilidades automáticas</b> (como Vampire Survivors): vos solo te movés y tus habilidades se lanzan solas. Con <b>H</b>
        las pasás a mano y las lanzás con <b>E R T F</b>, en el orden en que las aprendiste (mirá la barra debajo del mapa).
        Las que eligen un enemigo se <b>apuntan con el mouse</b>: apretás la tecla, ves el alcance, y con <b>clic izquierdo</b> la lanzás
        sobre el enemigo marcado (clic derecho o Esc cancela).</p>
        <p>El <b>círculo punteado</b> alrededor de tu héroe es tu <b>rango de ataque</b>: lo que entra ahí recibe tu ataque automático.</p>
        <p><b>Moverte reinicia tu ataque</b>: si te alejás, tu próximo golpe arranca de cero.</p>
        <p><b>B</b>: abrir o cerrar la tienda. <b>M</b>: agrandar el mapa. <b>P</b>: piloto automático (la IA juega por vos). <b>Esc</b>: cerrar ventanas. <b>Clic en el ranking</b>: mirar la arena de otro héroe.</p>` },
    { title: '✨ Habilidades y niveles', body: `
        <p>Tu kit tiene <b>4 habilidades</b>. En cada draft una de las 3 opciones es de tu héroe (natural); las otras pueden ser de cualquiera.</p>
        <p>Llegan en <b>nivel 0</b>: con el botón <b>[+]</b> les ponés puntos (1 por nivel del héroe). Las normales llegan a nivel 4; la
        <b>definitiva</b> a nivel 3, y se sube en los niveles 6, 12 y 18.</p>
        <p>Las <b>pasivas</b> no usan tecla: funcionan solas.</p>
        <p><b>Fragmento del Destino:</b> cambia una habilidad al azar por una de 4. <b>Libro del Destino:</b> elegís cuál cambiar, entre 6.</p>` },
    { title: '🎒 Tienda e ítems', body: `
        <p><b>Básicos:</b> mejoran un solo stat y se pueden repetir. <b>Compuestos (mejoras):</b> se arman con básicos + una receta;
        si ya tenés los básicos, pagás solo lo que falta.</p>
        <p>Algunos ítems son <b>contras</b> de ciertos creeps (por ejemplo, anticuración contra los Sanadores). Mirá el aviso de la oleada para saber qué comprar.</p>
        <p>Tenés <b>6 espacios</b>. Vender devuelve la mitad. En la pestaña <b>🎒 Ítems</b> están todos, con sus recetas.</p>` },
    { title: '💀 Vidas y muerte', body: `
        <p>Tenés <b>2 vidas</b>, y solo las perdés <b>contra creeps</b>. Al morir revivís a los 3s con la <b>Voluntad de Titán</b>:
        5s sin recibir daño, más velocidad de ataque y habilidades sin maná.</p>
        <p>Sin vidas quedás <b>Condenado</b>: recibís más daño y, si un creep te mata, quedás <b>eliminado</b> (podés seguir mirando).</p>
        <p><b>Injusticia de los Codiciosos</b> (tienda, pestaña Otros): estando Condenado, comprás una vida.</p>` },
    { title: '⚔️ Duelos y apuestas', body: `
        <p>Las parejas se arman al azar. En duelo los héroes se hacen menos daño entre sí y los enfriamientos arrancan de cero.
        A los 45s gana el que tenga más % de vida.</p>
        <p>Perder un duelo <b>no cuesta vidas</b>, pero con <b>4 héroes o menos</b> en juego el perdedor queda <b>maldito</b>, y con
        <b>3 o menos</b>, perder estando maldito <b>elimina</b>.</p>
        <p><b>Apuestas:</b> en la previa elegís cuánto arriesgar (hasta la mitad de tu oro) y a quién, en un duelo ajeno. Si acertás, cobrás el doble.</p>` },
    { title: '👹 Jefes, neutrales y ayudas', body: `
        <p>En las rondas <b>5, 10, 15 y 20</b>, después de los duelos, todos pelean juntos contra un <b>jefe de ronda</b>. Morir ahí no
        cuesta vidas. Si cae, todos cobran oro (más los 3 que más daño hicieron) y eligen un <b>objeto neutral</b>: va en un espacio
        aparte y solo podés tener uno.</p>
        <p>Los que van en la <b>mitad de abajo</b> del ranking reciben un Fragmento del Destino cada ronda, y el último, además, un Libro.</p>
        <p>¡Listo! Tocá <b>Iniciar partida</b> cuando quieras.</p>` }
];
let tutorialPage = 0;

function openTutorial(page = 0) {
    tutorialPage = page;
    renderTutorial();
    document.getElementById('tutorial').style.display = 'flex';
}
function closeTutorial() { document.getElementById('tutorial').style.display = 'none'; }

function renderTutorial() {
    const p = TUTORIAL_PAGES[tutorialPage];
    document.getElementById('tutorial-title').textContent = p.title;
    document.getElementById('tutorial-body').innerHTML = p.body;
    document.getElementById('tutorial-step').textContent = `${tutorialPage + 1} / ${TUTORIAL_PAGES.length}`;
    document.getElementById('tutorial-prev').disabled = tutorialPage === 0;
    document.getElementById('tutorial-next').textContent = tutorialPage === TUTORIAL_PAGES.length - 1 ? 'Cerrar' : 'Siguiente ▶';
}

function tutorialStep(delta) {
    const next = tutorialPage + delta;
    if (next >= TUTORIAL_PAGES.length) { closeTutorial(); return; }
    tutorialPage = Math.max(0, next);
    renderTutorial();
}
