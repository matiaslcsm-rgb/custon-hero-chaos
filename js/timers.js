// Temporizadores para que la partida siempre avance (DISEÑO.md §4 y §8).
//
//   Fases (elección de héroe, draft, preparación): si se acaba el tiempo, el juego decide por vos.
//   Oleada: pasado el límite, los creeps se enfurecen y ganan daño y velocidad de ataque cada segundo.
//
// Los tiempos de oleada salen de medir partidas simuladas: limpiar una oleada tarda 13-19s
// (mediana según el héroe), el 90% de las veces menos de 24s y el peor caso fue 27s.

const PHASE_TIMES = { heroSelect: 30, draft: 20, prep: 30, betting: 15 }; // previa: 15s para elegir monto y a quién
const WAVE_TIME = { limit: 30, enragePerSecond: 0.05 };

let phaseTimeLeft = PHASE_TIMES.heroSelect; // segundos que le quedan a la fase actual
let savedPrepTime = null; // al usar un objeto del destino, la preparación retoma el tiempo que le quedaba

function setPhaseTimer(seconds) { phaseTimeLeft = seconds; }

function tickPhaseTimer(dt) {
    if (!['HERO_SELECT', 'DRAFT', 'PREP', 'BETTING'].includes(gameState)) return;
    phaseTimeLeft -= dt;
    if (phaseTimeLeft <= 0) onPhaseTimeout();
}

function onPhaseTimeout() {
    if (gameState === 'HERO_SELECT') {
        const t = pickRandom(heroOffers ? heroOffers[0] : Object.values(HERO_TEMPLATES));
        log(`⏱️ Se acabó el tiempo: te toca ${t.name}.`);
        selectHero(t);
    } else if (gameState === 'DRAFT') {
        log('⏱️ Se acabó el tiempo del draft: se elige al azar.');
        if (currentDraft.mode === 'bookChoice') useBookOn(pickRandom(player.skills));
        else learnSkill(pickRandom(currentDraft.options));
    } else if (gameState === 'PREP') {
        log('⏱️ Se acabó el tiempo de preparación.');
        startWave();
    } else if (gameState === 'BETTING') {
        endBetting();
    }
}

// --- OLEADA ---
// Cada arena lleva su propio tiempo (solo corre con su héroe vivo).
function resetWaveTimer(arena = player && player.arena) { if (arena) { arena.elapsed = 0; arena.enrageAnnounced = false; } }

function tickWaveTimer(arena = player && player.arena, dt = 0) {
    if (typeof arena === 'number') { dt = arena; arena = player && player.arena; } // compatibilidad: tickWaveTimer(segundos)
    arena.elapsed += dt;
    if (!arena.enrageAnnounced && arena.elapsed > WAVE_TIME.limit) {
        arena.enrageAnnounced = true;
        log(`🔥 ¡Se acabó el tiempo! Los creeps se enfurecen: +${WAVE_TIME.enragePerSecond * 100}% de daño y velocidad de ataque por segundo.`);
    }
}

function waveTimeLeft(arena = player && player.arena) { return arena ? WAVE_TIME.limit - arena.elapsed : WAVE_TIME.limit; }

// Multiplicador de daño y velocidad de ataque de los creeps de una arena (1 = normal).
function enrageMult(arena = player && player.arena) {
    const over = arena && arena.kind === 'wave' ? arena.elapsed - WAVE_TIME.limit : 0;
    return over > 0 ? 1 + over * WAVE_TIME.enragePerSecond : 1;
}
