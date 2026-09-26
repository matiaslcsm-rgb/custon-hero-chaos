// Punto de entrada: conecta los botones y arranca el bucle principal.

document.getElementById('nav-game').onclick = () => showView('game');
document.getElementById('nav-heroes').onclick = () => showView('heroes');
document.getElementById('start-wave-btn').onclick = startWave;
document.getElementById('restart-btn').onclick = resetGame;

let lastTime = 0;
function loop(ts) {
    const dt = Math.max(0, Math.min(0.1, (ts - lastTime) / 1000 || 0)); lastTime = ts;
    if (gameState === 'WAVE') gameClock += dt;
    updateHud();
    if (gameState === 'WAVE' && player.isAlive()) updateWave(dt);
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
    Object.values(HERO_TEMPLATES).forEach(t => {
        if (!t.innate) problems.push(`${t.key}: no tiene innato`);
        else checkAbility(t.innate, `${t.key} (innato)`);
        const skills = Object.values(HERO_SKILLS[t.key] || {});
        const ult = HERO_ULTIMATES[t.key];
        if (skills.length !== 3) problems.push(`${t.key}: tiene ${skills.length} habilidades normales (deben ser 3)`);
        if (!ult) problems.push(`${t.key}: no tiene definitiva`);
        [...skills, ...(ult ? [ult] : [])].forEach(s => {
            checkAbility(s, `${t.key}/${s.id}`);
            if (s.kind === 'active' && typeof s.cast !== 'function') problems.push(`${t.key}/${s.id}: es activa pero no tiene cast()`);
            if (s.kind === 'passive' && !s.hooks) problems.push(`${t.key}/${s.id}: es pasiva pero no tiene hooks`);
            if (s.kind !== 'active' && s.kind !== 'passive') problems.push(`${t.key}/${s.id}: kind debe ser 'active' o 'passive'`);
        });
    });
    if (problems.length) console.warn('⚠️ Problemas en el contenido del juego:\n- ' + problems.join('\n- '));
    return problems;
}

validateContent();
initHeroSelect();
renderHeroCodex();
requestAnimationFrame(loop);
