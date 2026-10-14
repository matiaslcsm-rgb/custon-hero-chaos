// Infinite Tower: guardar la run y continuarla (pedido del usuario, 2026-10-14: "que se guarde la partida para poder guardar
// la run y continuarla").
//
//   Cómo lo resuelven los roguelikes: Hades guarda al cambiar de cámara, Dead Cells al entrar a cada bioma, Slay the Spire
//   en cada sala. Acá, igual: se guarda TODO lo que es tuyo (héroe, nivel, stats, equipo, bolsa, oro, el piso al que
//   llegaste, los pisos cuyo guardián ya venciste, tus restos, la crónica de la run) y al continuar volvés a la ENTRADA
//   del piso donde estabas, con el piso armado de nuevo (otro mapa). Así el guardado es chico y nunca se rompe.
//   · Se guarda solo: al entrar a un piso, al morir, cada 15 s de juego, al salir al menú y al cerrar la pestaña.
//   · "Continuar" aparece en el menú de Infinite Tower; empezar una run nueva pide confirmación si hay una guardada.
//   · Ganar la torre borra el guardado. Un solo lugar de guardado (una run a la vez).
//   · Lo que no viaja: las criaturas del piso, lo que estaba tirado en el suelo y los efectos del momento. Lo que te había
//     quitado un portador vuelve a tu bolsa (el portador no existe en el piso nuevo).

const TOWER_SAVE = { key: 'chc-tower-save', version: 1, every: 15 };
const SAVE_HERO_FIELDS = ['str', 'agi', 'int', 'bonus', 'permGains', 'level', 'xp', 'skillPoints', 'statPoints', 'towerStats', 'gold', 'tomesBought'];
let towerSaveAt = 0;
// En las pruebas y las demos no se toca el guardado de verdad: se guarda en memoria
let towerSavePersist = !/[?&](test|demo)/.test(location.search), towerSaveMemory = null;
const saveStore = {
    get() { return towerSavePersist ? localStorage.getItem(TOWER_SAVE.key) : towerSaveMemory; },
    set(v) { if (towerSavePersist) localStorage.setItem(TOWER_SAVE.key, v); else towerSaveMemory = v; },
    clear() { if (towerSavePersist) localStorage.removeItem(TOWER_SAVE.key); else towerSaveMemory = null; }
};

function canSaveTower() { return gameMode === 'tower' && towerRun && player && !towerRun.starterPending && gameState !== 'ENDED'; }
// Lo que se guarda (todo serializable: piezas, números, listas)
function towerSnapshot() {
    const h = {};
    SAVE_HERO_FIELDS.forEach(k => { if (player[k] !== undefined) h[k] = player[k]; });
    h.hpPct = player.maxHp ? Math.max(0.05, player.hp / player.maxHp) : 1; h.manaPct = player.maxMana ? player.mana / player.maxMana : 1;
    h.gear = player.gear; h.bag = player.bag;
    const lost = (towerRun.carriers || []).filter(c => c.carrier && c.carrier.length).flatMap(c => c.carrier); // lo que tenía un portador
    const cleared = towerRun.levels.map((L, f) => (L && L.stairsOpen ? f : null)).filter(f => f !== null);
    const c = towerRun.corpse;
    return {
        v: TOWER_SAVE.version, savedAt: Date.now(), itemSeq: towerItemSeq, hero: h, lost,
        run: { floor: towerRun.floor, base: towerRun.base, deaths: towerRun.deaths, elapsed: gameClock - towerRun.startedAt, stats: towerRun.stats,
            reactions: towerRun.reactions || {}, lore: towerRun.lore || {}, smithless: towerRun.smithless || 0, cleared: [...new Set([...(towerRun.cleared || []), ...cleared])],
            corpse: c && !c.recovered ? { floor: c.floor, lost: c.lost, points: c.points, killer: c.killer } : null }
    };
}
function saveTowerRun() {
    if (!canSaveTower()) return false;
    try { saveStore.set(JSON.stringify(towerSnapshot())); towerSaveAt = gameClock; return true; } catch (e) { return false; }
}
function loadTowerSave() {
    try { const s = JSON.parse(saveStore.get()); return s && s.v === TOWER_SAVE.version && s.hero && s.run ? s : null; } catch (e) { return null; }
}
function clearTowerSave() { try { saveStore.clear(); } catch (e) { /* nada */ } }
// Cada cuadro de la Torre (updateTower): guardado automático cada tanto
function towerAutosave() { if (gameClock - towerSaveAt >= TOWER_SAVE.every) saveTowerRun(); }
window.addEventListener('beforeunload', () => saveTowerRun());

// Continuar: arma una run nueva y le pone encima lo guardado; entra a la entrada del piso guardado
function continueTowerRun() {
    const S = loadTowerSave();
    if (!S) return false;
    startTowerRun();
    towerRun.starterPending = false; towerRun.levels = [];
    towerItemSeq = Math.max(towerItemSeq, S.itemSeq || 0);
    const h = S.hero;
    SAVE_HERO_FIELDS.forEach(k => { if (h[k] !== undefined) player[k] = h[k]; });
    Object.entries(h.gear || {}).forEach(([slot, item]) => { if (item) equipItem(player, item, slot); });
    player.bag = h.bag || [];
    (S.lost || []).forEach(item => { if (!addToBag(player, item)) player.bag.push({ item, x: 0, y: 0 }); });
    player.recalculateStats();
    player.hp = Math.max(1, Math.round(player.maxHp * (h.hpPct ?? 1))); player.mana = Math.round(player.maxMana * (h.manaPct ?? 1));
    const R = S.run;
    Object.assign(towerRun, { base: R.base || towerRun.base, deaths: R.deaths || 0, startedAt: gameClock - (R.elapsed || 0), stats: R.stats || towerRun.stats,
        reactions: R.reactions || {}, lore: R.lore || {}, smithless: R.smithless || 0, cleared: R.cleared || [], pendingCorpse: R.corpse });
    enterTowerFloor(R.floor || 1, 'start');
    log(`💾 Seguís la run: piso ${towerRun.floor}, nivel ${player.level}. El piso se armó de nuevo; ${R.cleared && R.cleared.includes(towerRun.floor) ? 'su guardián ya lo habías vencido: la escalera está abierta.' : 'el guardián te espera en el laberinto.'}` +
        (R.corpse ? ` Tus restos (${R.corpse.points} puntos) te esperan en la entrada del piso ${R.corpse.floor}.` : '') + (S.lost && S.lost.length ? ` Lo que se había llevado el portador volvió a tu bolsa.` : ''));
    saveTowerRun();
    return true;
}
// Al armar un piso (towerLevel): si su guardián ya estaba vencido, la escalera queda abierta; tus restos, en la entrada
function applySaveToLevel(level) {
    if (!towerRun) return;
    if ((towerRun.cleared || []).includes(level.floor) && level.guardian) { level.guardian.hp = 0; level.stairsOpen = true; }
    const pc = towerRun.pendingCorpse;
    if (pc && pc.floor === level.floor) {
        const spot = [[2, 0], [0, 2], [-2, 0], [0, -2], [1, 1]].map(([dx, dy]) => ({ x: level.start.x + dx, y: level.start.y + dy })).find(p => walkable(level, p.x, p.y)) || level.start;
        const corpse = { x: spot.x, y: spot.y, killer: pc.killer, at: gameClock, floor: level.floor, level, lost: pc.lost, points: pc.points };
        level.corpses.push(corpse); towerRun.corpse = corpse; towerRun.pendingCorpse = null;
    }
}

// Texto para el menú: "Piso 4 · nivel 12 · hace 2 h"
function towerSaveSummary(S = loadTowerSave()) {
    if (!S) return null;
    const mins = Math.round((Date.now() - S.savedAt) / 60000), ago = mins < 1 ? 'recién' : mins < 60 ? `hace ${mins} min` : mins < 1440 ? `hace ${Math.round(mins / 60)} h` : `hace ${Math.round(mins / 1440)} d`;
    return `Piso ${S.run.floor} · nivel ${S.hero.level} · ${Math.floor((S.run.elapsed || 0) / 60)} min jugados · ${ago}`;
}
