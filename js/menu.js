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
    const tower = gameMode === 'tower';
    document.getElementById('ban-row').style.display = tower ? 'none' : ''; renderBanSelect(); // baneo (progression.js)
    document.getElementById('hero-select-title').textContent = tower ? 'Infinite Tower · elegí tu héroe' : 'Custom Hero · elegí tu héroe';
    document.getElementById('hero-select-subtitle').textContent = tower
        ? 'Subís solo con su innato y su ataque básico. Elegí bien: si morís, volvés a la base de la torre.'
        : 'Estas opciones son solo tuyas. Ningún héroe se repite en la partida.';
    document.getElementById('hero-any-btn').textContent = tower ? '🔓 Elegir cualquier héroe' : '🔓 Elegir cualquier héroe (arrancás sin oro)';
    log(`🎲 ${tower ? 'Infinite Tower' : 'Custom Hero'}: elegí tu héroe entre tus ${HERO_PICK_OPTIONS} opciones o probá suerte con uno al azar.`);
}

// --- ELEGIR CUALQUIER HÉROE (panel que se despliega desde la izquierda) ---
// Bypasea las 3 opciones al azar: el jugador elige cualquiera de los HERO_TEMPLATES. A cambio arranca sin oro
// (ver GOLD_PENALTY_FREE_PICK en game.js). Solo disponible en la fase de elección de héroe (gameState HERO_SELECT).
function openHeroDrawer() {
    renderHeroDrawer();
    document.getElementById('hero-any-backdrop').style.display = 'block';
    document.getElementById('hero-any-drawer').classList.add('open'); // el CSS ya lo esconde con transform, no hace falta display
}
function closeHeroDrawer() {
    document.getElementById('hero-any-drawer').classList.remove('open');
    document.getElementById('hero-any-backdrop').style.display = 'none';
}
// Grilla de retratos por atributo, al estilo de la ventana de "todos los héroes" de Dota 2: un ícono chico
// por héroe agrupado en columnas por atributo, en vez de tarjetas grandes con texto. El nombre, rol y
// descripción quedan en el title (tooltip nativo al pasar el mouse) para no perder esa info.
function renderHeroDrawer() {
    const container = document.getElementById('hero-any-options');
    container.innerHTML = '';
    Object.entries(ATTR_INFO).forEach(([attr, info]) => {
        const group = Object.values(HERO_TEMPLATES).filter(t => t.primaryAttr === attr);
        if (!group.length) return;
        const head = document.createElement('div');
        head.className = 'shop-category attr-head'; head.style.color = info.color; head.style.borderColor = info.color;
        head.textContent = info.label;
        container.appendChild(head);
        const grid = document.createElement('div');
        grid.className = 'hero-grid';
        group.forEach(t => {
            const card = document.createElement('div');
            card.className = 'skill-card hero-grid-card';
            card.style.border = `2px solid ${info.color}`;
            card.title = `${t.name} — ${t.role}\n${t.description}`;
            card.innerHTML = `${heroIconHtml(t, 'lg')}<span style="color:${info.color}">${t.name}</span>`;
            card.onclick = () => { closeHeroDrawer(); selectHero(t, true); };
            grid.appendChild(card);
        });
        container.appendChild(grid);
    });
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
            ${tutCard('🏆', 'Cómo se gana', 'Quedando último en pie. Los creeps se hacen más fuertes cada ronda, así que la partida siempre termina.')}
            ${tutCard('⭐', 'Puntos', 'Ganar un duelo da <b>+3</b>; superar la oleada sin morir, <b>+1</b>. El oro desempata.')}
            ${tutCard('🧩', 'Tu kit', 'Armás 4 habilidades mezclando las de cualquier héroe. Cada partida es distinta.')}
            ${tutCard('🔓', 'Elegir a mano', 'Si no te convencen tus 3 opciones, el botón "Elegir cualquier héroe" te deja elegir cualquiera de los 11 — pero arrancás sin oro (en vez de 100g).')}
        </div>` },
    { icon: '🔁', color: '#00b4d8', title: 'Una ronda', body: `
        <div class="tut-steps">
            <div><span>1</span><b>Draft</b><p>Elegís una habilidad entre 3 (hasta tener 4).</p></div>
            <div><span>2</span><b>Preparación</b><p>Tienda, subir habilidades, ver qué oleada viene.</p></div>
            <div><span>3</span><b>Oleada</b><p>Cada héroe contra los mismos creeps, en su arena.</p></div>
            <div><span>4</span><b>Apuestas y duelo</b><p>Desde la ronda 5: UN duelo por ronda; los demás miran y apuestan.</p></div>
            <div><span>5</span><b>Jefe</b><p>Rondas 5, 10, 15 y 20: cada uno contra un jefe.</p></div>
            <div><span>6</span><b>Ranking</b><p>Ayuda para los de abajo y a la ronda siguiente.</p></div>
        </div>
        <p class="tut-note">⏱ Cada fase tiene tiempo: si se acaba, el juego decide por vos.</p>` },
    { icon: '⌨️', color: '#2dc653', title: 'Teclado', body: `
        <div class="tut-keys">
            ${tutKey(['E', 'R', 'T', 'F', 'Q'], 'Tus habilidades, en el orden en que las aprendiste. Las que se apuntan se confirman con clic.')}
            ${tutKey(['W', 'A', 'S', 'D'], 'Moverte con el teclado: solo si lo prendés en Opciones (Esc). Como en Dota, se juega con el mouse.')}
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
            ${tutCard('👣', 'Clic derecho en el mapa', 'Caminás hasta ahí, como en Dota. También en la sala de espera.')}
            ${tutCard('⚔️', 'Clic derecho en un rival', 'Lo atacás: tu héroe va hasta tenerlo a tiro y le pega. Caminar a otro lado cancela la orden.')}
            ${tutCard('🎯', 'Clic izquierdo en un enemigo', 'Lo marcás como objetivo: tu ataque y tus habilidades lo priorizan.')}
            ${tutCard('✨', 'Apuntar una habilidad', 'Tocá su tecla, se ve el alcance y el enemigo marcado; clic izquierdo la lanza, clic derecho cancela. Con "lanzamiento rápido" (Opciones) sale al apretar la tecla.')}
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
            ${tutCard('♥♥', '2 vidas', 'Se pierden contra creeps y jefes, no en duelos. Al morir revivís a los 3s con la <b>Voluntad de Titán</b>: 5s sin recibir daño. Sin vidas, quedás eliminado (podés seguir mirando).')}
            ${tutCard('☠', 'Maldición', 'Solo se gana perdiendo duelos: con 3 héroes en juego, cada duelo perdido suma una instancia (recibís +10% de daño por cada una).')}
            ${tutCard('💰', 'Injusticia de los Codiciosos', 'Estando Condenado, en la tienda (Otros) podés comprar una vida.')}
        </div>` },
    { icon: '⚔️', color: '#e63946', title: 'Duelos y apuestas', body: `
        <div class="tut-cards">
            ${tutCard('🤺', 'Un duelo por ronda', 'Desde la ronda 5 pelean 2 héroes (primero los que menos pelearon) y los demás miran. En duelo se hacen menos daño, se curan menos y los aturdimientos duran menos. A los 45s gana el de más % de vida.')}
            ${tutCard('☠', 'Perder', 'Con 4 o más en juego no pasa nada. Con 3, suma una instancia de maldición. Con 2 (el mano a mano final), cuesta una vida y suma una instancia.')}
            ${tutCard('🎲', 'Pozo de apuestas', 'Todos los que no pelean apuestan (hasta la mitad de su oro). Los que aciertan recuperan lo suyo y se reparten lo apostado al perdedor: apostar a la sorpresa paga más.')}
            ${tutCard('🤝', 'Respaldo', 'El que gana el duelo cobra además el 25% de lo que le apostaron.')}
        </div>` },
    { icon: '👹', color: '#9d0208', title: 'Jefes y ayudas', body: `
        <div class="tut-cards">
            ${tutCard('👑', 'Jefe de ronda', 'Rondas 5, 10, 15 y 20: cada héroe contra el mismo jefe en su arena. Hay 8 y cada uno se pone difícil a su manera.')}
            ${tutCard('🔥', 'Como una oleada', 'Morir cuesta vidas y, si tardás más de 60s, se enfurece cada vez más.')}
            ${tutCard('🎁', 'Premio', 'Oro y un objeto neutral (elegís 1 de 3). Los 3 más rápidos cobran extra.')}
            ${tutCard('🤲', 'Ayuda a los de abajo', 'La mitad de abajo del ranking recibe un Fragmento del Destino por ronda; el último, además, un Libro.')}
        </div>
        <p class="tut-note">¡Listo! Tocá <b>¡A jugar!</b>. En partida, <kbd>Esc</kbd> abre este tutorial.</p>` }
];
// --- TUTORIAL DE INFINITE TOWER (2026-10-13) ---
// Mismo formato que el de Custom Hero. El cuerpo puede ser una función (así las teclas salen como las tenga
// configuradas el jugador) y art: una tira de dibujos en pixel art arriba de la página.
const tutK = a => keyName(KEYMAP[a]);
const tutArt = list => () => `<div class="tut-art">${list.map(([fr, s]) => { const c = fr(); return `<img src="${c.toDataURL()}" style="width:${c.width * s}px;height:${c.height * s}px">`; }).join('')}</div>`;
const TUT_HERO = { cape: '#a33a3a', hood: '#7a2a2a', trim: '#c9a227', glow: '#9ad1ff', weapon: 'sword' };
const TOWER_TUTORIAL_PAGES = [
    { icon: '🗼', color: '#8ab8ff', title: 'El objetivo', art: tutArt([[() => pxbHeroFrame(TUT_HERO, 'idle', 0).img, 3], [() => pxbFrame('wolf', '#8d8d8d', [], 'idle', 0).img, 3], [() => pxbFrame('boss:forest', '#2d6a4f', [], 'idle', 0).img, 2]]), body: `
        <p class="tut-lead">Despertás en un <b>círculo de piedra</b> al pie de una torre, sin nada. Hay que subir los <b>10 pisos</b>.</p>
        <div class="tut-cards">
            ${tutCard('🌲', 'Un bioma cada dos pisos', 'Bosque, Ciénaga, Desierto, Nieve y Volcán. Cada uno con sus criaturas, su clima y su terreno que molesta.')}
            ${tutCard('🏘', 'El pueblo', 'Zona segura: los bichos no entran y recuperás vida y maná. Hay un mercader y, en algunos, un herrero.')}
            ${tutCard('🌀', 'El laberinto', 'El guardián del piso (el jefe del bioma) cuida la escalera. Vencelo para subir.')}
            ${tutCard('🎲', 'Cada run es distinta', 'El mapa, las criaturas (se arman por piezas: cuerpo, rasgos, tamaño) y el botín cambian cada vez.')}
        </div>` },
    { icon: '⚔️', color: '#e8c060', title: 'Las tres armas', art: tutArt([['sword', 'bow', 'staff'].map(w => [() => pxbHeroFrame({ ...TUT_HERO, weapon: w }, 'idle', 0).img, 3])].flat()), body: () => `
        <p class="tut-lead">Al despertar elegís una de las tres armas clavadas en el círculo (acercate y <kbd>${tutK('interact')}</kbd> o clic). Cada una se juega distinto con <kbd>${tutK('skill1')}</kbd>.</p>
        <div class="tut-cards">
            ${tutCard('🗡', 'Espada', 'Clic: combo de tres tajos en arco; el remate empuja y el tajo desvía proyectiles. Clic derecho: parada; si te tiran o te pegan justo, lo devolvés. Sin Q.')}
            ${tutCard('🏹', 'Arco', 'Mantené la tecla para tensar y soltá hacia el cursor: tensada atraviesa. Si soltás justo, es un tiro perfecto.')}
            ${tutCard('🔮', 'Bastón', 'Orbe arcano apuntado que explota en área y marca a los enemigos para las reacciones. Gasta maná.')}
            ${tutCard('🎁', 'Después', 'Otras armas aparecen como botín: cada pieza de equipo viene de un héroe y trae su habilidad.')}
        </div>` },
    { icon: '⌨️', color: '#2dc653', title: 'Controles', body: () => `
        <div class="tut-keys">
            ${tutKey([tutK('up'), tutK('left'), tutK('down'), tutK('right')], 'Moverte (o clic derecho en el mapa). Podés atacar caminando.')}
            ${tutKey([tutK('dash')], 'Esquive: un salto corto en el que no te pegan. Es tu mejor defensa.')}
            ${tutKey([tutK('skill1'), tutK('skill2'), tutK('skill3')], 'Habilidades del arma, los guantes y la armadura. Salen hacia el cursor.')}
            ${tutKey(['Clic'], 'Clic izquierdo: golpe básico hacia el cursor. Mantenelo para seguir pegando; si el enemigo está lejos, caminás hasta él. (En la pausa se puede volver al ataque automático.)')}
            ${tutKey([tutK('interact')], 'Agarrar armas, abrir cofres, hablar.')}
            ${tutKey(['Rueda'], 'Zoom (también + y −).')}
            ${tutKey([tutK('autocast'), tutK('autopilot')], 'Habilidades automáticas · piloto automático.')}
            ${tutKey(['Esc'], 'Pausa: opciones, teclas, este tutorial y las ventanas.')}
        </div>
        <p class="tut-note">Las teclas se cambian en la pausa → ⌨️ Teclas.</p>` },
    { icon: '🎒', color: '#c77dff', title: 'Tu equipo es tu clase', body: () => `
        <div class="tut-cards">
            ${tutCard('✋', 'Tres habilidades', `El arma (<kbd>${tutK('skill1')}</kbd>), los guantes (<kbd>${tutK('skill2')}</kbd>) y la armadura (<kbd>${tutK('skill3')}</kbd>) traen una habilidad cada uno. Casco, botas, amuleto y anillo dan stats.`)}
            ${tutCard('🧩', 'Piezas de héroes', 'Cada pieza viene de un héroe de Custom Hero: su color, su habilidad y su estilo. Mezclalas.')}
            ${tutCard('📊', 'Niveles y stats', `Al subir de nivel ganás puntos para repartir (<kbd>${tutK('stats')}</kbd>). El equipo y el inventario, con <kbd>${tutK('inventory')}</kbd>.`)}
            ${tutCard('⚒', 'Forjar', 'Cuando un arma sube de nivel elegís cómo crece (más daño, menos costo, menos recarga…). Queda en la pieza.')}
        </div>` },
    { icon: '🏘', color: '#ff9f1c', title: 'El pueblo', body: () => `
        <div class="tut-cards">
            ${tutCard('🛒', 'Mercader', `Vende piezas del piso y compra lo que te sobra (<kbd>${tutK('shop')}</kbd>). Siempre tiene el Tomo de Talento: +1 punto de stats.`)}
            ${tutCard('⚒', 'Herrero', `Imbuye en piezas sin alma los poderes que juntaste en tu Códice (<kbd>${tutK('codex')}</kbd>), y funde 5 piezas de la misma ranura en una pura con calidad: roma, usada, nueva u obra maestra.`)}
            ${tutCard('✦', 'Esencia', 'No se pierde nunca, ni al morir ni al terminar la run. La sueltan jefes y campeones; se gasta en fundir y en mejoras permanentes (desde el Códice).')}
            ${tutCard('🔥', 'Fogata', 'De noche, al lado de una fogata (y sin nadie persiguiéndote) recuperás vida.')}
        </div>` },
    { icon: '⚠️', color: '#e63946', title: 'Leer la pelea', body: () => `
        <div class="tut-cards">
            ${tutCard('🟥', 'Golpes que avisan', `Antes de un golpe fuerte se marca la zona en el piso y se va llenando; un "!" sale sobre el que se prepara. Salí o esquivá con <kbd>${tutK('dash')}</kbd>.`)}
            ${tutCard('🎯', 'Tiradores', 'Un aro que se cierra sobre el tirador avisa la ráfaga. Las balas se ven también fuera de la pantalla.')}
            ${tutCard('🔵', 'Campeones', 'Aro azul y un ícono por afijo (veloz, blindado, explosivo…). Pasá el mouse encima para leerlos.')}
            ${tutCard('👑', 'Guardianes', 'Tres fases y una definitiva, y una mecánica propia: raíces que lo curan, charcos de veneno, se entierra, piso helado, lava.')}
        </div>` },
    { icon: '🌙', color: '#7b6cf6', title: 'El mundo', body: () => `
        <div class="tut-cards">
            ${tutCard('☀', 'Día y noche', 'Cada ocho minutos cae la noche: ves menos y salen criaturas nocturnas, pero todo da +50% de experiencia y botín.')}
            ${tutCard('🕳', 'Cuevas', 'Opcionales. Cuanto más hondo, más oscuro y peligroso, y mejor el botín; al fondo, un jefe con su tesoro.')}
            ${tutCard('✨', 'Santuarios y cofres', 'Los santuarios dan una bendición por un rato. Los cofres, piezas (algunos tienen guardianes).')}
            ${tutCard('🎪', 'Eventos', 'Caravanas que defender, prisioneros que liberar, cofres malditos, mercaderes ambulantes y emboscadas.')}
        </div>
        <p class="tut-note">🗺 <kbd>${tutK('map')}</kbd> abre el mapa del piso; la flecha del borde te marca a dónde ir.</p>` },
    { icon: '💀', color: '#9d0208', title: 'Morir', body: `
        <div class="tut-cards">
            ${tutCard('⭕', 'Renacés en la base', 'Volvés al círculo de piedra del primer piso a los pocos segundos.')}
            ${tutCard('🦴', 'Tus restos', 'Perdés la mitad de los puntos de stats que repartiste, pero quedan en tus restos: volvé y pisalos. Si morís de nuevo, los restos se suman: nunca se pierde nada para siempre.')}
            ${tutCard('🎒', 'El portador', 'Una criatura se lleva alguna pieza de tu equipo (nunca el arma) y anda por el piso. Cazala para recuperarla.')}
            ${tutCard('🪨', 'Piedra de regreso', 'En el círculo: te lleva a la entrada de cualquier piso que ya alcanzaste.')}
        </div>` },
    { icon: '📖', color: '#c9a227', title: 'La Bitácora', body: () => `
        <div class="tut-keys">
            ${tutKey([tutK('notebook')], 'Cuaderno: se escribe solo cuando encontrás algo nuevo. Leelo.')}
            ${tutKey([tutK('codex')], 'Códice: los poderes que juntaste, para imbuir en el herrero.')}
            ${tutKey([tutK('bestiary')], 'Bestiario: las criaturas que viste. Se guarda entre runs.')}
            ${tutKey([tutK('log')], 'Diario del piso: todo lo que pasó.')}
        </div>
        <p class="tut-note">¡Listo! Tocá <b>¡A jugar!</b>. En partida, <kbd>Esc</kbd> abre este tutorial.</p>` }
];

// Un tutorial por modo. openTutorial(página, modo, alTerminar): alTerminar corre si se llega al final con "¡A jugar!"
// (el menú previo de cada modo lo usa para arrancar la partida, titleScreen.js).
const TUTORIALS = { normal: { brand: 'CUSTOM HERO', pages: TUTORIAL_PAGES }, tower: { brand: 'INFINITE TOWER', pages: TOWER_TUTORIAL_PAGES } };
let tutorialPage = 0, tutorialMode = 'normal', tutorialDone = null;
function tutorialPages() { return TUTORIALS[tutorialMode].pages; }
function markTutorialSeen(mode) { if (/[?&]test/.test(location.search)) return; try { localStorage.setItem('chc-tut-' + mode, '1'); } catch (e) { /* no se guarda */ } } // (las pruebas no lo marcan)
function tutorialSeen(mode) { try { return localStorage.getItem('chc-tut-' + mode) === '1'; } catch (e) { return false; } }

function openTutorial(page = 0, mode = gameMode === 'tower' ? 'tower' : 'normal', onDone = null) {
    tutorialMode = TUTORIALS[mode] ? mode : 'normal';
    tutorialPage = page; tutorialDone = onDone;
    renderTutorial();
    document.getElementById('tutorial').style.display = 'flex';
}
function closeTutorial() { document.getElementById('tutorial').style.display = 'none'; markTutorialSeen(tutorialMode); tutorialDone = null; }

function renderTutorial() {
    const pages = tutorialPages(), p = pages[tutorialPage];
    const box = document.getElementById('tutorial-box');
    box.style.setProperty('--tut-color', p.color);
    document.getElementById('tutorial-icon').textContent = p.icon;
    document.getElementById('tutorial-brand').textContent = 'CÓMO SE JUEGA · ' + TUTORIALS[tutorialMode].brand;
    document.getElementById('tutorial-title').textContent = p.title;
    const heroes = p.heroes ? `<div class="tut-heroes">${Object.values(HERO_TEMPLATES).map(t => {
        const url = typeof heroSpriteUrl === 'function' ? heroSpriteUrl({ isHero: true, key: t.key }) : null;
        return `<div title="${t.name}">${url ? `<img src="${url}" class="pixel-img">` : `<b>${t.symbol}</b>`}<span>${t.name}</span></div>`;
    }).join('')}</div>` : '';
    const art = p.art ? p.art() : '';
    document.getElementById('tutorial-body').innerHTML = heroes + art + (typeof p.body === 'function' ? p.body() : p.body);
    document.getElementById('tutorial-step').textContent = `${tutorialPage + 1} / ${pages.length}`;
    document.getElementById('tutorial-dots').innerHTML = pages.map((pg, i) =>
        `<button class="${i === tutorialPage ? 'on' : ''}" data-page="${i}" title="${pg.title}">${pg.icon}</button>`).join('');
    document.querySelectorAll('#tutorial-dots button').forEach(b => { b.onclick = () => { tutorialPage = Number(b.dataset.page); renderTutorial(); }; });
    document.getElementById('tutorial-prev').disabled = tutorialPage === 0;
    document.getElementById('tutorial-next').textContent = tutorialPage === pages.length - 1 ? '¡A jugar!' : 'Siguiente ▶';
}

function tutorialStep(delta) {
    const next = tutorialPage + delta;
    if (next >= tutorialPages().length) { const done = tutorialDone; closeTutorial(); if (done) done(); return; }
    tutorialPage = Math.max(0, next);
    renderTutorial();
}

// Flechas para pasar de página con el tutorial abierto
window.addEventListener('keydown', e => {
    if (document.getElementById('tutorial').style.display !== 'flex') return;
    if (e.key === 'ArrowRight') tutorialStep(1);
    if (e.key === 'ArrowLeft') tutorialStep(-1);
});
