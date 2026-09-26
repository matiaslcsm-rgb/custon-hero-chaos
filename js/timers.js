// Temporizadores para que la partida siempre avance (DISEÑO.md §4 y §8).
//
//   Fases (elección de héroe, draft, preparación): si se acaba el tiempo, el juego decide por vos.
//   Oleada: pasado el límite, los creeps se enfurecen y ganan daño y velocidad de ataque cada segundo.
//
// Los tiempos de oleada salen de medir partidas simuladas: limpiar una oleada tarda 13-19s
// (mediana según el héroe), el 90% de las veces menos de 24s y el peor caso fue 27s.

const PHASE_TIMES = { heroSelect: 30, draft: 20, prep: 30 };
const WAVE_TIME = { limit: 30, enragePerSecond: 0.05 };

let phaseTimeLeft = PHASE_TIMES.heroSelect; // segundos que le quedan a la fase actual
let savedPrepTime = null; // al usar un objeto del destino, la preparación retoma el tiempo que le quedaba
let waveElapsed = 0;      // segundos de oleada (solo cuentan con el héroe vivo)
let enrageAnnounced = false;

function setPhaseTimer(seconds) { phaseTimeLeft = seconds; }

function tickPhaseTimer(dt) {
    if (!['HERO_SELECT', 'DRAFT', 'PREP'].includes(gameState)) return;
    phaseTimeLeft -= dt;
    if (phaseTimeLeft <= 0) onPhaseTimeout();
}

function onPhaseTimeout() {
    if (gameState === 'HERO_SELECT') {
        const t = pickRandom(Object.values(HERO_TEMPLATES));
        log(`⏱️ Se acabó el tiempo: te toca ${t.name}.`);
        selectHero(t);
    } else if (gameState === 'DRAFT') {
        log('⏱️ Se acabó el tiempo del draft: se elige al azar.');
        if (currentDraft.mode === 'bookChoice') useBookOn(pickRandom(player.skills));
        else learnSkill(pickRandom(currentDraft.options));
    } else if (gameState === 'PREP') {
        log('⏱️ Se acabó el tiempo de preparación.');
        startWave();
    }
}

// --- OLEADA ---
function resetWaveTimer() { waveElapsed = 0; enrageAnnounced = false; }

function tickWaveTimer(dt) {
    waveElapsed += dt;
    if (!enrageAnnounced && waveElapsed > WAVE_TIME.limit) {
        enrageAnnounced = true;
        log(`🔥 ¡Se acabó el tiempo! Los creeps se enfurecen: +${WAVE_TIME.enragePerSecond * 100}% de daño y velocidad de ataque por segundo.`);
    }
}

function waveTimeLeft() { return WAVE_TIME.limit - waveElapsed; }

// Multiplicador de daño y velocidad de ataque de los creeps (1 = normal).
function enrageMult() {
    const over = waveElapsed - WAVE_TIME.limit;
    return over > 0 ? 1 + over * WAVE_TIME.enragePerSecond : 1;
}
