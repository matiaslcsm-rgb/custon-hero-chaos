// Mundo de la partida: los 8 héroes (el jugador + 7 rivales con IA), sus arenas de combate y el ranking.
// Reglas: DISEÑO.md §9.
//
// ARENA — donde pelean uno o más héroes. Cada uno tiene la suya durante la oleada (kind 'wave'), con sus propios
// creeps, jefe y proyectiles; en los duelos (fase F2) dos héroes comparten una arena (kind 'duel').
// Todas las arenas se actualizan en paralelo en cada frame. La que se ve en pantalla es la del héroe que estás
// mirando (viewedHero): por defecto el jugador; con un clic en el ranking se mira la de cualquier otro.

const MAX_HEROES = 8;
let MAX_ROUNDS = 60;        // tope de seguridad: la partida sigue hasta que quede uno (si se llega, gana el primero del ranking)
const POINTS = { duelWin: 3, waveClean: 1 };

let heroes = [];            // todos los héroes de la partida; el jugador es el primero
let arenas = [];            // arenas activas en esta fase
let viewedHero = null;      // héroe cuya arena (o descanso) se muestra

function makeArena(kind, fighters) {
    const arena = { kind, heroes: fighters, creeps: [], boss: null, projectiles: [], elapsed: 0, enrageAnnounced: false, done: false };
    fighters.forEach(h => { h.arena = arena; });
    return arena;
}

// Atajos al estado de la arena del jugador (los usan la interfaz y las pruebas).
Object.defineProperty(window, 'creeps', { get: () => (player && player.arena ? player.arena.creeps : []), configurable: true });
Object.defineProperty(window, 'boss', { get: () => (player && player.arena ? player.arena.boss : null), configurable: true });
Object.defineProperty(window, 'projectiles', { get: () => (player && player.arena ? player.arena.projectiles : []), configurable: true });

function aliveHeroes() { return heroes.filter(h => !h.eliminated); }
// Al empezar cada fase la cámara vuelve a tu héroe (si miraste a otro con el ranking). Eliminado: al primero del ranking.
function followPlayer() {
    if (!player.eliminated) viewedHero = player;
    else if (!viewedHero || viewedHero.eliminated) viewedHero = rankedHeroes()[0];
}
function viewArena() { const h = viewedHero || player; return h ? h.arena : null; }

// Nombres de los jugadores bot (se reparten al azar, sin repetir en la partida).
const BOT_NAMES = ['Tano', 'Pocho', 'Colo', 'Flaco', 'Chino', 'Gringo', 'Ruso', 'Tincho', 'Pato', 'Nacho', 'Juanchi', 'Toto',
    'Lolo', 'Fede', 'Cata', 'Luli', 'Sofi', 'Maru', 'Rocío', 'Meli'];

// Tu nombre (se escribe en el menú y se recuerda entre partidas).
function playerName() {
    let name = '';
    try { name = (localStorage.getItem('chc-name') || '').trim(); } catch (e) { /* sin almacenamiento */ }
    return name || 'Vos';
}
function setPlayerName(name) {
    try { localStorage.setItem('chc-name', name.trim().slice(0, 14)); } catch (e) { /* no se guarda */ }
}

// Crea los rivales: cada uno elige entre sus opciones de la fase de elección (ver menu.js), sin repetir héroes.
// Cada bot tiene un nombre de jugador: "Axe (Tano)".
function createRivals(playerTemplate) {
    const names = shuffle(BOT_NAMES.filter(n => n !== playerName()));
    pickRivalTemplates(playerTemplate).forEach((template, i) => {
        const rival = new Hero(template);
        rival.isAI = true;
        rival.ownerName = names[i % names.length];
        rival.displayName = `${rival.name} (${rival.ownerName})`;
        heroes.push(rival);
    });
}

// Corre fn sin mostrar sus mensajes en el registro (ej: las compras y el draft de los rivales).
function quietly(fn) {
    const previous = logMuted;
    logMuted = true;
    try { return fn(); } finally { logMuted = previous; }
}

// --- RANKING ---
// Orden: los que siguen en juego primero; después más puntos; el oro desempata.
function rankedHeroes() {
    return heroes.slice().sort((a, b) => (a.eliminated - b.eliminated) || (b.points - a.points) || (b.gold - a.gold));
}
function heroRank(hero) { return rankedHeroes().indexOf(hero) + 1; }
