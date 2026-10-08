// Tower Chaos: el Cuaderno (REWORK.md §1, tutorial jugado) — pedido del usuario 2026-10-07.
//
//   El Aventurero no recuerda nada, salvo escribir. Cada acción nueva (despertar, moverse, esquivar, lanzar,
//   matar, abrir un cofre, llegar al pueblo) se anota sola, una vez, en su propia voz. Las páginas quedan para
//   siempre (se guardan en el navegador): no se repiten en runs siguientes. Se abre con N o desde la pausa.
//   Es la mitad "tutorial" de la fase 2 del rework; el despertar y las 3 armas ya estaban (ROGUELIKE.md §4 octies).
//   La unificación con el Códice y el Bestiario en una sola Bitácora queda para la fase 6, cuando se encare.

const NOTEBOOK_PAGES = [
    { id: 'WAKE', title: 'El despertar', text: 'Desperté en un círculo de piedra, sin nada encima salvo este cuaderno y la ropa puesta. No recuerdo nada de antes. Elegí un arma de las tres que había clavadas en el piso: con eso voy a tener que arreglarme.' },
    { id: 'MOVE', title: 'Caminar', text: 'Caminar no se me olvidó, al menos. W A S D, y el cuerpo responde solo. Mejor: no sé qué hay más allá de este círculo.' },
    { id: 'DODGE', title: 'El esquive', text: 'Un bicho me tiró un zarpazo y el cuerpo se tiró solo para el costado, más rápido de lo que pensé. Espacio. Unos segundos y lo puedo volver a hacer.' },
    { id: 'CAST', title: 'Lo que sé hacer', text: 'Probé lo que sea que trae esta arma. Algo salió de mis manos y el golpe se sintió distinto a cualquier otro. Así que esto es lo mío.' },
    { id: 'KILL', title: 'Primera baja', text: 'Maté a mi primer bicho de esta torre. No sentí nada en particular. Supongo que me voy a acostumbrar.' },
    { id: 'CHEST', title: 'El cofre', text: 'Encontré un cofre cerrado, con algo adentro. Lo que sea que guarde, ahora es mío.' },
    { id: 'TOWN', title: 'El pueblo', text: 'Llegué a un pueblo. Hay gente acá, viviendo a la sombra de esta torre que sube y sube. Acá adentro, al menos, nadie me va a atacar.' },
    // Lo nuevo de las fases 4 y 5 del rework (la lista de interfaz: "que el Cuaderno explique lo nuevo")
    { id: 'TELEGRAPH', title: 'El suelo avisa', text: 'Antes de un golpe fuerte, el piso se marca y se va llenando. Si salgo de la marca a tiempo, o me tiro con el esquive justo cuando brilla, no me toca. Los grandes y los jefes lo hacen seguido.' },
    { id: 'ESSENCE', title: 'Esencia', text: 'Del guardián salió una luz violeta que se me quedó adentro. Esencia, la llaman. No se va cuando muero: la junto run tras run y con ella compro cosas que duran (J, en el Códice).' },
    { id: 'SMITH', title: 'El Herrero', text: 'Hay un herrero en este pueblo. Si le doy una pieza sin alma y un poder que domino, me la imbuye. También funde cinco piezas iguales en una pura, mejor cuanto mejor lo que le doy.' },
    { id: 'CRAFT', title: 'Fundir', text: 'El herrero fundió cinco piezas en una. Si entre las cinco va una que ya fundió antes, la nueva sale sí o sí un escalón mejor: roma, usada, nueva, obra maestra.' },
    { id: 'BULLETS', title: 'Lluvia de proyectiles', text: 'Hay bichos que escupen proyectiles en ráfagas, abanicos, anillos. Antes de tirar brillan. Son lentos: se pasa entre ellos caminando, o atravesándolos con el esquive. Las paredes los frenan, y la espada los desvía.' },
    { id: 'TRANSFER', title: 'Nada se pierde', text: 'El herrero agarró mi arma vieja, la que tanto usé, y le pasó a la nueva la mitad de lo que había crecido. La vieja se fue; algo de ella quedó.' },
    { id: 'CAMPFIRE', title: 'Una fogata', text: 'Alguien acampó acá y se fue. El fuego todavía prende. De noche, sentado a su lado, las heridas cierran más rápido. Afuera del círculo de luz se mueven cosas.' },
    { id: 'CHAMPION', title: 'Los marcados', text: 'Algunos llevan un aro azul y unos signos sobre la cabeza: son más duros y cada signo es un don. Si paro el mouse encima, me doy cuenta de cuáles. Al que se cura solo hay que pegarle sin pausa.' },
    { id: 'MASTERY', title: 'Dominar', text: 'Usé tanto un poder que ya lo sé de memoria. Quedó en el Códice para siempre: aunque muera, un herrero me lo puede volver a poner en una pieza.' }
];

let notebookPersist = true; // las pruebas lo apagan para no tocar el cuaderno guardado del navegador (como el Códice)
const NOTEBOOK_KEY = 'chc-notebook';
function notebookLoad() {
    try { const raw = localStorage.getItem(NOTEBOOK_KEY); if (raw) { const n = JSON.parse(raw); if (n && n.seen) return { seen: n.seen }; } } catch (e) { /* sin almacenamiento */ }
    return { seen: {} };
}
let notebookState = notebookLoad();
function notebookSave() { if (!notebookPersist) return; try { localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(notebookState)); } catch (e) { /* no se guarda */ } }

// Escribe una página (una sola vez por siempre, entre runs). Se llama desde el momento justo de cada acción.
function writeNotebookPage(id) {
    if (notebookState.seen[id]) return;
    notebookState.seen[id] = true;
    notebookSave();
    const page = NOTEBOOK_PAGES.find(p => p.id === id);
    if (!page) return;
    log(`📖 Cuaderno — "${page.title}": ${page.text}`);
    if (player && fxArena(player)) fxText(player, '📖 nueva página', '#c9a227', 11, 1.3);
}

// --- VENTANA (tecla N, o desde la pausa) ---
let notebookOpen = false;
function toggleNotebook(open = !notebookOpen) {
    if (gameMode !== 'tower' || !towerRun) return;
    notebookOpen = open;
    showPanel('notebook-container', open);
    if (open) renderNotebook();
}
function renderNotebook() {
    const box = document.getElementById('notebook-pages');
    box.innerHTML = '';
    NOTEBOOK_PAGES.forEach(p => {
        const seen = !!notebookState.seen[p.id];
        const row = document.createElement('div');
        row.className = 'notebook-page' + (seen ? '' : ' locked');
        row.innerHTML = seen ? `<h4>${p.title}</h4><p>${p.text}</p>` : `<h4>???</h4><p>Página en blanco todavía.</p>`;
        box.appendChild(row);
    });
}
