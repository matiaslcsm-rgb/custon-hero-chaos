// Punto de entrada: conecta los botones y arranca el bucle principal.

// Versión visible en el menú: si no coincide con la última subida, el navegador muestra una copia vieja (Ctrl+F5).
const GAME_VERSION = '2026-10-03 · dos modos';
document.getElementById('game-version').textContent = `Versión ${GAME_VERSION}`;

document.getElementById('start-wave-btn').onclick = startWave;
document.getElementById('restart-btn').onclick = resetGame;
document.getElementById('bet-done-btn').onclick = endBetting;
document.getElementById('pause-btn').onclick = togglePause;
document.getElementById('pause-continue').onclick = () => setPaused(false);
document.getElementById('pause-tutorial').onclick = () => openTutorial();
document.getElementById('pause-quit').onclick = quitToMenu;
document.querySelectorAll('[data-glossary]').forEach(btn => { btn.onclick = () => openGlossary(btn.dataset.glossary); });
document.querySelectorAll('.back-btn').forEach(btn => { btn.onclick = closeGlossary; });
document.getElementById('shop-close').onclick = closeShop;
document.getElementById('map-toggle').onclick = toggleBigMap;
document.getElementById('shop-container').onclick = e => { if (e.target.id === 'shop-container') closeShop(); };
window.addEventListener('resize', applyMapSize);
// Elegir modo: Custom Hero Chaos (el de siempre) o Tower Chaos (roguelike, tower.js)
document.querySelectorAll('.mode-card').forEach(card => { card.onclick = () => { gameMode = card.dataset.mode; startHeroPick(); }; });
{ const input = document.getElementById('player-name'); input.value = playerName() === 'Vos' ? '' : playerName(); input.oninput = () => setPlayerName(input.value); }
document.getElementById('hero-any-btn').onclick = openHeroDrawer;
document.getElementById('hero-back-btn').onclick = () => { closeHeroDrawer(); resetGame(); };
document.getElementById('hero-any-close').onclick = closeHeroDrawer;
document.getElementById('hero-any-backdrop').onclick = closeHeroDrawer;
document.getElementById('menu-tutorial-btn').onclick = () => openTutorial();
document.getElementById('tutorial-close').onclick = closeTutorial;
document.getElementById('tutorial-prev').onclick = () => tutorialStep(-1);
document.getElementById('tutorial-next').onclick = () => tutorialStep(1);
document.getElementById('tutorial').onclick = e => { if (e.target.id === 'tutorial') closeTutorial(); };
document.getElementById('autopilot-btn').onclick = () => setAutopilot(!autopilot);
document.getElementById('autocast-btn').onclick = () => setAutoCast(!autoCast);
document.getElementById('sound-btn').onclick = () => setSound(!soundOn);
document.getElementById('sprites-btn').onclick = () => setSprites(!spritesOn);
setSprites(spritesOn);
setSound(soundOn);
// Sonido de clic en botones y cartas
document.addEventListener('click', e => { if (e.target.closest('button, .skill-card, .score-row')) sfx('click'); });
{ const btn = document.getElementById('autocast-btn'); btn.textContent = `✨ Habilidades: ${autoCast ? 'AUTO' : 'MANUAL'}`; btn.classList.toggle('on', autoCast); }
document.getElementById('log-toggle').onclick = () => {
    const panel = document.getElementById('log-panel');
    panel.classList.toggle('small');
    document.getElementById('log-toggle').textContent = panel.classList.contains('small') ? '▴' : '▾';
};

let lastTime = 0;
function loop(ts) {
    const dt = Math.max(0, Math.min(0.1, (ts - lastTime) / 1000 || 0)); lastTime = ts;
    if (!paused) { // en pausa se congela todo: combate, temporizadores y la sala de espera
        if (inCombat()) gameClock += dt;
        tickPhaseTimer(dt);
        tickAutopilot(dt);
        if (inCombat()) updateWave(dt); // oleadas o duelos (también con el jugador muerto: cuenta el tiempo para revivir)
        if (player && gameState !== 'MENU' && gameState !== 'HERO_SELECT') updateRestArea(dt); // en la sala de espera se puede caminar
    }
    updateHud();
    renderTimer();
    render();
    requestAnimationFrame(loop);
}

// Revisa que los datos de héroes y habilidades sean consistentes. Avisa en la consola (F12) en vez de
// romper la partida, para detectar errores al agregar contenido nuevo.
function validateContent() {
    const problems = [];
    const seenIds = new Set();
    const checkAbility = (a, where) => {
        if (!a.id || !a.name || !a.description) problems.push(`${where}: falta id, name o description`);
        if (seenIds.has(a.id)) problems.push(`${where}: id repetido "${a.id}"`);
        seenIds.add(a.id);
        (a.tags || []).forEach(tag => { if (!TAGS[tag]) problems.push(`${where}: etiqueta desconocida "${tag}"`); });
        if (!a.tags || !a.tags.length) problems.push(`${where}: no declara etiquetas`);
    };
    const symbols = {};
    Object.values(HERO_TEMPLATES).forEach(t => {
        if (symbols[t.symbol]) problems.push(`${t.key}: usa el símbolo "${t.symbol}", igual que ${symbols[t.symbol]}`);
        symbols[t.symbol] = t.key;
        ['str', 'agi', 'int'].forEach(a => {
            const v = t.attributes && t.attributes[a];
            if (!Array.isArray(v) || v.length !== 2) problems.push(`${t.key}: attributes.${a} debe ser [base, ganancia por nivel]`);
        });
        if (!t.innate) problems.push(`${t.key}: no tiene innato`);
        else checkAbility(t.innate, `${t.key} (innato)`);
        const skills = Object.values(HERO_SKILLS[t.key] || {});
        const ults = skills.filter(s => s.isUltimate);
        if (skills.length - ults.length !== 3) problems.push(`${t.key}: tiene ${skills.length - ults.length} habilidades normales (deben ser 3)`);
        if (ults.length !== 1) problems.push(`${t.key}: tiene ${ults.length} definitivas (debe ser 1)`);
        skills.forEach(s => {
            const where = `${t.key}/${s.id}`;
            checkAbility(s, where);
            if (s.kind === 'active' && typeof s.cast !== 'function') problems.push(`${where}: es activa pero no tiene cast()`);
            if (s.kind === 'passive' && !s.hooks) problems.push(`${where}: es pasiva pero no tiene hooks`);
            if (s.kind !== 'active' && s.kind !== 'passive') problems.push(`${where}: kind debe ser 'active' o 'passive'`);
            if (!s.values) { problems.push(`${where}: no tiene values`); return; }
            if (s.kind === 'active' && (s.values.cooldown === undefined || s.values.manaCost === undefined)) problems.push(`${where}: falta cooldown o manaCost en values`);
            // Los valores por nivel tienen que tener exactamente tantos niveles como la habilidad
            Object.entries(s.values).forEach(([key, v]) => {
                if (Array.isArray(v) && v.length !== maxSkillLevel(s)) problems.push(`${where}: values.${key} tiene ${v.length} niveles (deben ser ${maxSkillLevel(s)})`);
            });
            // Cada marcador {clave} de la descripción tiene que existir en values
            [...s.description.matchAll(/\{(\w+)%?\}/g)].forEach(([, key]) => {
                if (s.values[key] === undefined) problems.push(`${where}: la descripción usa {${key}} pero no existe en values`);
            });
        });
    });
    Object.entries(ITEMS).forEach(([key, item]) => {
        if (item.key !== key) problems.push(`Ítem ${key}: su key no coincide`);
        if (item.tier === 'basic') {
            if (typeof item.cost !== 'number') problems.push(`Ítem ${key}: un básico necesita cost`);
        } else if (item.tier === 'composite') {
            if (!Array.isArray(item.components) || !item.components.length) problems.push(`Ítem ${key}: un compuesto necesita components`);
            (item.components || []).forEach(k => { if (!ITEMS[k] || ITEMS[k].tier !== 'basic') problems.push(`Ítem ${key}: el componente "${k}" no es un básico`); });
            if (typeof item.recipe !== 'number') problems.push(`Ítem ${key}: un compuesto necesita recipe`);
            if (!ITEM_GROUPS.includes(item.group)) problems.push(`Ítem ${key}: grupo "${item.group}" desconocido`);
            if (item.components && item.components.length > INVENTORY_SLOTS) problems.push(`Ítem ${key}: tiene más componentes que espacios`);
        } else if (item.kind !== 'instant') problems.push(`Ítem ${key}: tiene que ser básico, compuesto o inmediato`);
        Object.keys(item.mods || {}).forEach(m => { if (!MOD_LABELS[m]) problems.push(`Ítem ${key}: mod "${m}" sin texto en MOD_LABELS`); });
    });
    Object.values(CREEP_TYPES).forEach(t => {
        if (t.counterItem && !ITEMS[t.counterItem]) problems.push(`Creep ${t.key}: el ítem de contra "${t.counterItem}" no existe`);
        if (Object.values(HERO_TEMPLATES).some(h => h.symbol === t.symbol)) problems.push(`Creep ${t.key}: su símbolo "${t.symbol}" lo usa un héroe`);
    });
    WAVE_THEMES.flat().forEach(th => {
        th.groups.forEach(g => { if (!CREEP_TYPES[g.type]) problems.push(`Tema ${th.name}: el tipo "${g.type}" no existe`); });
        if (!CREEP_TYPES[th.boss] || !CREEP_TYPES[th.boss].bossable) problems.push(`Tema ${th.name}: el jefe "${th.boss}" no existe o no puede ser jefe`);
        const units = th.groups.reduce((n, g) => n + (CREEP_TYPES[g.type] ? groupUnits(g) : 0), 0);
        if (units > 6 * ROWS) problems.push(`Tema ${th.name}: ${units} creeps no entran en la zona de aparición`);
    });
    Object.entries(BUILD_GUIDES).forEach(([hero, g]) => {
        if (!HERO_TEMPLATES[hero]) problems.push(`Guía: el héroe "${hero}" no existe`);
        GUIDE_STAGES.forEach(([stage]) => (g[stage] || []).forEach(k => { if (!ITEMS[k]) problems.push(`Guía de ${hero}: el ítem "${k}" no existe`); }));
    });
    Object.keys(HERO_TEMPLATES).forEach(k => { if (!BUILD_GUIDES[k]) problems.push(`${k}: no tiene guía de ítems (data/guides.js)`); });
    if (problems.length) console.warn('⚠️ Problemas en el contenido del juego:\n- ' + problems.join('\n- '));
    return problems;
}

validateContent();
showMenu();
renderHeroCodex();
renderCreepCodex();
renderItemCodex();
requestAnimationFrame(loop);
