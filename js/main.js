// Punto de entrada: conecta los botones y arranca el bucle principal.

document.getElementById('nav-game').onclick = () => showView('game');
document.getElementById('nav-heroes').onclick = () => showView('heroes');
document.getElementById('start-wave-btn').onclick = startWave;
document.getElementById('restart-btn').onclick = resetGame;

let lastTime = 0;
function loop(ts) {
    const dt = Math.max(0, Math.min(0.1, (ts - lastTime) / 1000 || 0)); lastTime = ts;
    if (gameState === 'WAVE') gameClock += dt;
    tickPhaseTimer(dt);
    updateHud();
    renderTimer();
    if (gameState === 'WAVE') updateWave(dt); // también con el jugador muerto: cuenta el tiempo para revivir
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
    if (problems.length) console.warn('⚠️ Problemas en el contenido del juego:\n- ' + problems.join('\n- '));
    return problems;
}

validateContent();
initHeroSelect();
renderHeroCodex();
requestAnimationFrame(loop);
