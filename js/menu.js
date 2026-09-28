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
// Cada página: icono y color (panel de la izquierda), título y cuerpo. heroes: true muestra los sprites de los héroes.
const tutCard = (icon, title, text) => `<div class="tut-card"><div class="tut-card-icon">${icon}</div><div><b>${title}</b><p>${text}</p></div></div>`;
const tutKey = (keys, text) => `<div class="tut-key"><span>${keys.map(k => `<kbd>${k}</kbd>`).join(' ')}</span><p>${text}</p></div>`;

const TUTORIAL_PAGES = [
    { icon: '🎯', color: '#ffb703', title: 'El objetivo', heroes: true, body: `
        <p class="tut-lead">Sos uno de <b>8 héroes</b>. Cada ronda peleás contra creeps y, desde la ronda 5, en duelos contra los demás.</p>
        <div class="tut-cards">
            ${tutCard('🏆', 'Cómo se gana', 'Quedando último en pie o, si se llega a la ronda 20, primero en el ranking.')}
            ${tutCard('⭐', 'Puntos', 'Ganar un duelo da <b>+3</b>; superar la oleada sin morir, <b>+1</b>. El oro desempata.')}
            ${tutCard('🧩', 'Tu kit', 'Armás 4 habilidades mezclando las de cualquier héroe. Cada partida es distinta.')}
        </div>` },
    { icon: '🔁', color: '#00b4d8', title: 'Una ronda', body: `
        <div class="tut-steps">
            <div><span>1</span><b>Draft</b><p>Elegís una habilidad entre 3 (hasta tener 4).</p></div>
            <div><span>2</span><b>Preparación</b><p>Tienda, subir habilidades, ver qué oleada viene.</p></div>
            <div><span>3</span><b>Oleada</b><p>Cada héroe contra los mismos creeps, en su arena.</p></div>
            <div><span>4</span><b>Previa y duelos</b><p>Desde la ronda 5: apuestas y duelos 1 contra 1.</p></div>
            <div><span>5</span><b>Jefe</b><p>Rondas 5, 10, 15 y 20: cada uno contra un jefe.</p></div>
            <div><span>6</span><b>Ranking</b><p>Ayuda para los de abajo y a la ronda siguiente.</p></div>
        </div>
        <p class="tut-note">⏱ Cada fase tiene tiempo: si se acaba, el juego decide por vos.</p>` },
    { icon: '⌨️', color: '#2dc653', title: 'Teclado', body: `
        <div class="tut-keys">
            ${tutKey(['W', 'A', 'S', 'D'], 'Moverte (también flechas). Podés atacar mientras caminás.')}
            ${tutKey(['E', 'R', 'T', 'F'], 'Lanzar tus habilidades a mano, en el orden en que las aprendiste.')}
            ${tutKey(['H'], 'Habilidades automáticas: se lanzan solas y vos solo te movés.')}
            ${tutKey(['B'], 'Abrir o cerrar la tienda (en la preparación).')}
            ${tutKey(['M'], 'Agrandar el mapa.')}
            ${tutKey(['G'], 'Pixel art o letras ASCII.')}
            ${tutKey(['P'], 'Piloto automático: la IA juega por vos.')}
            ${tutKey(['Esc'], 'Pausa: tutorial, glosario y opciones.')}
        </div>` },
    { icon: '🖱️', color: '#c77dff', title: 'Mouse', body: `
        <div class="tut-cards">
            ${tutCard('🗡️', 'Ataque automático', 'Tu héroe le pega solo al enemigo más cercano que tenga a tiro (el círculo punteado es tu alcance).')}
            ${tutCard('🎯', 'Clic izquierdo en un enemigo', 'Lo marcás como objetivo: tu ataque y tus habilidades lo priorizan, y si está lejos caminás hasta él.')}
            ${tutCard('👣', 'Clic derecho en el mapa', 'Caminás hasta ahí. También en la sala de espera.')}
            ${tutCard('✨', 'Apuntar una habilidad', 'Tocá su tecla, se ve el alcance y el enemigo marcado; clic izquierdo la lanza, clic derecho cancela.')}
        </div>` },
    { icon: '📈', color: '#ff9f1c', title: 'Habilidades y niveles', body: `
        <div class="tut-cards">
            ${tutCard('🃏', 'Draft', 'En cada draft una de las 3 opciones es de tu héroe (natural, ★); las otras pueden ser de cualquiera.')}
            ${tutCard('➕', 'Puntos', 'Llegan en nivel 0: con el botón <b>[+]</b> les ponés puntos (1 por nivel del héroe). Normales hasta 4, la <u>definitiva</u> hasta 3 (niveles 6, 12 y 18).')}
            ${tutCard('◆', 'Innato y pasivas', 'El innato está siempre activo. Las pasivas no usan tecla: funcionan solas.')}
            ${tutCard('🔮', 'Rehacer el kit', '<b>Fragmento del Destino</b>: cambia una habilidad al azar por una de 4. <b>Libro</b>: elegís cuál, entre 6.')}
        </div>` },
    { icon: '🛒', color: '#ffd166', title: 'Tienda e ítems', body: `
        <div class="tut-cards">
            ${tutCard('⭐', 'Guía de tu héroe', 'La primera pestaña de la tienda te sugiere qué comprar: inicio, núcleo y final.')}
            ${tutCard('🧱', 'Básicos y mejoras', 'Los básicos se pueden repetir; las mejoras se arman con básicos + una receta y pagás solo lo que falta.')}
            ${tutCard('🛡️', 'Contras', 'Mirá el aviso de la próxima oleada: hay ítems que contrarrestan a cada tipo de creep.')}
            ${tutCard('🎒', 'Inventario', '6 espacios + 1 para el objeto neutral. Vender devuelve la mitad.')}
        </div>` },
    { icon: '💀', color: '#ff477e', title: 'Vidas y muerte', body: `
        <div class="tut-cards">
            ${tutCard('♥♥', '2 vidas', 'Se pierden contra creeps y jefes, no en duelos. Al morir revivís a los 3s con la <b>Voluntad de Titán</b>: 5s sin recibir daño.')}
            ${tutCard('☠', 'Condenado', 'Sin vidas recibís más daño y, si te matan otra vez, quedás eliminado (podés seguir mirando).')}
            ${tutCard('💰', 'Injusticia de los Codiciosos', 'Estando Condenado, en la tienda (Otros) podés comprar una vida.')}
        </div>` },
    { icon: '⚔️', color: '#e63946', title: 'Duelos y apuestas', body: `
        <div class="tut-cards">
            ${tutCard('🤺', 'Duelos', 'Desde la ronda 5, parejas al azar. En duelo se hacen menos daño, se curan menos y los aturdimientos duran menos. A los 45s gana el de más % de vida.')}
            ${tutCard('☠', 'Maldición', 'Perder no cuesta vidas, pero con 4 héroes o menos quedás maldito; con 3 o menos, perder maldito elimina.')}
            ${tutCard('🎲', 'Apuestas', 'En la previa elegís cuánto arriesgar (hasta la mitad de tu oro) en un duelo ajeno. Si acertás, cobrás el doble.')}
            ${tutCard('🤝', 'Respaldo', 'La IA también apuesta. Si te apostaron a vos y ganás, cobrás el 25% de lo que te apostaron.')}
        </div>` },
    { icon: '👹', color: '#9d0208', title: 'Jefes y ayudas', body: `
        <div class="tut-cards">
            ${tutCard('👑', 'Jefe de ronda', 'Rondas 5, 10, 15 y 20: cada héroe contra el mismo jefe en su arena. Hay 8 y cada uno se pone difícil a su manera.')}
            ${tutCard('🔥', 'Como una oleada', 'Morir cuesta vidas y, si tardás más de 60s, se enfurece cada vez más.')}
            ${tutCard('🎁', 'Premio', 'Oro y un objeto neutral (elegís 1 de 3). Los 3 más rápidos cobran extra.')}
            ${tutCard('🤲', 'Ayuda a los de abajo', 'La mitad de abajo del ranking recibe un Fragmento del Destino por ronda; el último, además, un Libro.')}
        </div>
        <p class="tut-note">¡Listo! Tocá <b>Iniciar partida</b> cuando quieras. En partida, <kbd>Esc</kbd> abre este tutorial.</p>` }
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
    const box = document.getElementById('tutorial-box');
    box.style.setProperty('--tut-color', p.color);
    document.getElementById('tutorial-icon').textContent = p.icon;
    document.getElementById('tutorial-title').textContent = p.title;
    const heroes = p.heroes ? `<div class="tut-heroes">${Object.values(HERO_TEMPLATES).map(t => {
        const url = typeof heroSpriteUrl === 'function' ? heroSpriteUrl({ isHero: true, key: t.key }) : null;
        return `<div title="${t.name}">${url ? `<img src="${url}" class="pixel-img">` : `<b>${t.symbol}</b>`}<span>${t.name}</span></div>`;
    }).join('')}</div>` : '';
    document.getElementById('tutorial-body').innerHTML = heroes + p.body;
    document.getElementById('tutorial-step').textContent = `${tutorialPage + 1} / ${TUTORIAL_PAGES.length}`;
    document.getElementById('tutorial-dots').innerHTML = TUTORIAL_PAGES.map((pg, i) =>
        `<button class="${i === tutorialPage ? 'on' : ''}" data-page="${i}" title="${pg.title}">${pg.icon}</button>`).join('');
    document.querySelectorAll('#tutorial-dots button').forEach(b => { b.onclick = () => { tutorialPage = Number(b.dataset.page); renderTutorial(); }; });
    document.getElementById('tutorial-prev').disabled = tutorialPage === 0;
    document.getElementById('tutorial-next').textContent = tutorialPage === TUTORIAL_PAGES.length - 1 ? '¡A jugar!' : 'Siguiente ▶';
}

function tutorialStep(delta) {
    const next = tutorialPage + delta;
    if (next >= TUTORIAL_PAGES.length) { closeTutorial(); return; }
    tutorialPage = Math.max(0, next);
    renderTutorial();
}

// Flechas para pasar de página con el tutorial abierto
window.addEventListener('keydown', e => {
    if (document.getElementById('tutorial').style.display !== 'flex') return;
    if (e.key === 'ArrowRight') tutorialStep(1);
    if (e.key === 'ArrowLeft') tutorialStep(-1);
});
