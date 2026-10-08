// Punto de entrada: conecta los botones y arranca el bucle principal.

// Versión visible en el menú: si no coincide con la última subida, el navegador muestra una copia vieja (Ctrl+F5).
const GAME_VERSION = '2026-10-08 · golpes que avisan';
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
document.getElementById('stats-close').onclick = () => toggleStatsWindow(false);
document.getElementById('inv-close').onclick = () => toggleInventory(false);
document.getElementById('tshop-close').onclick = () => toggleTowerShop(false);
document.getElementById('bestiary-close').onclick = () => toggleBestiary(false);
document.getElementById('codex-close').onclick = () => toggleCodex(false);
document.getElementById('smith-close').onclick = () => toggleSmith(false);
document.getElementById('notebook-close').onclick = () => toggleNotebook(false);
document.getElementById('map-toggle').onclick = toggleBigMap;
document.getElementById('shop-container').onclick = e => { if (e.target.id === 'shop-container') closeShop(); };
window.addEventListener('resize', applyMapSize);
// Elegir modo: Custom Hero Chaos (el de siempre) o Tower Chaos (roguelike, tower.js)
// Tower Chaos no tiene elección de héroe: arrancás como aventurero sin clase
document.querySelectorAll('.mode-card').forEach(card => { card.onclick = () => { gameMode = card.dataset.mode; if (gameMode === 'tower') startTowerRun(); else startHeroPick(); }; });
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
    if (!paused && !inHitStop()) { // en pausa se congela todo; en la pausa de impacto también (unos milisegundos)
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

// Vista de los pisos para revisar la generación (index.html?demo=biomes): un mapa chico de cada bioma.
if (location.search.includes('demo=biomes')) setTimeout(() => {
    startTowerRun();
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#2b2118;display:flex;flex-wrap:wrap;gap:8px;padding:8px;align-content:flex-start';
    document.body.appendChild(wrap);
    [1, 3, 5, 7, 9].forEach(f => {
        const L = towerLevel(f), c = document.createElement('canvas'), g = c.getContext('2d');
        c.width = COLS * 2.5; c.height = ROWS * 2.5;
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { g.fillStyle = towerMiniColor(L, x, y); g.fillRect(x * 2.5, y * 2.5, 2.5, 2.5); }
        L.creeps.forEach(cr => { g.fillStyle = cr.isGuardian ? '#d00' : '#1d1712'; g.fillRect(cr.x * 2.5, cr.y * 2.5, cr.isGuardian ? 6 : 2.5, cr.isGuardian ? 6 : 2.5); });
        (L.chests || []).forEach(ch => { g.fillStyle = '#e0a800'; g.fillRect(ch.x * 2.5 - 2, ch.y * 2.5 - 2, 6, 6); });
        g.fillStyle = '#0a0'; g.fillRect(L.start.x * 2.5 - 3, L.start.y * 2.5 - 3, 7, 7);
        g.font = 'bold 14px Georgia'; g.fillStyle = '#1d1712'; g.fillText(`Piso ${f}: ${BIOMES[L.biome].name}`, 10, 18);
        wrap.appendChild(c);
    });
}, 300);

// Muestra del generador de criaturas (index.html?demo=bestiary): un bestiario por bioma, como saldría en una run.
if (location.search.includes('demo=bestiary')) setTimeout(() => {
    startTowerRun();
    const c = document.createElement('canvas'); c.width = 1400; c.height = 1000;
    c.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#e9dcc0';
    document.body.appendChild(c);
    const g = c.getContext('2d'); g.fillStyle = '#e9dcc0'; g.fillRect(0, 0, 1400, 1000);
    BIOME_ORDER.forEach((b, row) => {
        g.fillStyle = '#6b2a1f'; g.font = 'bold 15px Georgia'; g.fillText(`${BIOMES[b].name}`, 8, 18 + row * 196);
        towerBestiary(b).forEach((t, i) => {
            const f = inkFigure(t.plan, inkLookFor({ type: t, color: t.color }), 'walk', 2), s = 1.05 * t.scale;
            g.drawImage(f.img, 10 + i * 152 + (64 - 64 * s) / 2, 22 + row * 196 + 120 - 96 * s * 1.25, 64 * s * 1.25, 96 * s * 1.25);
            g.fillStyle = '#1d1712'; g.font = '11px Georgia';
            const words = t.label.split(' '), l1 = words.slice(0, 2).join(' '), l2 = words.slice(2).join(' ');
            g.fillText(l1, 10 + i * 152, 160 + row * 196); g.fillText(l2, 10 + i * 152, 173 + row * 196);
            g.fillStyle = '#5e5444'; g.fillText(t.genome.role + (t.from ? ' ★' : ''), 10 + i * 152, 186 + row * 196);
        });
    });
}, 300);

// Demo para capturas de pantalla (index.html?demo=tower): arranca Tower Chaos con equipo y creeps a la vista.
if (location.search.includes('demo=tower')) setTimeout(() => {
    startTowerRun();
    const wq = new URLSearchParams(location.search).get('weapon'); // &weapon=sword|bow|staff: con un arma inicial (sin el Hacha)
    const awaken = new URLSearchParams(location.search).get('at') === 'awaken';
    if (!awaken && awaitingWeapon()) chooseStarterWeapon('ADVENTURER_' + (wq || 'sword').toUpperCase()); // el demo arranca armado (&at=awaken: con las 3 clavadas)
    const cat = towerCatalog();
    if (!wq && !awaken) equipItem(player, makeTowerItem(1, cat.find(e => e.heroKey === 'AXE' && e.slot === 'weapon'), 'rare'));
    // &floor=N: otro piso (bioma); &at=town|lab: parado en el pueblo o en la puerta del laberinto
    const q = new URLSearchParams(location.search);
    if (q.get('floor')) enterTowerFloor(+q.get('floor'), 'demo');
    if (q.get('at') === 'town') { player.x = player.arena.town.merchant.x + 2; player.y = player.arena.town.merchant.y + 2; }
    if (q.get('time') === 'night') towerRun.startedAt = gameClock - (DAYNIGHT.day + DAYNIGHT.dusk + 10); // &time=night
    if (q.get('cast')) { // &cast=ID1,ID2: lanza esas habilidades en bucle con enemigos alrededor (para ver los efectos)
        const L = player.arena, ids = q.get('cast').split(',');
        ids.forEach(id => { const e = cat.find(o => o.skillId === id); if (e) equipItem(player, makeTowerItem(3, e, 'rare')); });
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, x = Math.round(player.x + Math.cos(a) * 2.5), y = Math.round(player.y + Math.sin(a) * 2); if (walkable(L, x, y)) { const c = makeCreep(towerCreepPool(1)[i % 3], x, y, 50, false, 0); c.arena = L; c.spawnTime = -1e9; L.creeps.push(c); } }
        let k = 0;
        setInterval(() => { const id = ids[k++ % ids.length], sk = SKILL_INDEX[id]; if (!sk) return; player.cooldowns[id] = 0; player.mana = player.maxMana; player.skillLevels[id] = Math.max(1, player.skillLevels[id] || 1); tryCastSkill(player, sk, { quiet: true }); }, 380);
    }
    if (q.get('at') === 'event') { const L = player.arena, e = L.events.find(o => o.kind === q.get('kind')) || L.events[0]; player.x = e.x - 4; player.y = e.y; if (!walkable(L, player.x, player.y)) { player.x = e.x; player.y = e.y + 3; } }
    if (q.get('at') === 'carrier') { equipItem(player, makeTowerItem(1, cat.find(e => e.slot === 'helm'), 'rare')); const c = spawnItemCarrier(player.arena, player); c.x = player.x + 3; c.y = player.y; c.spawnX = c.x; c.spawnY = c.y; }
    if (q.get('at') === 'cave') { const L = player.arena; for (let d = 1; d <= +(q.get('depth') || 1); d++) enterCave(L.caves[0], d); }
    if (q.get('at') === 'plateau') { const L = player.arena, i = L.ramp.findIndex((v, j) => v && L.height[j] && L.zone[j] === ZONE.field && !L.ground[j]); if (i >= 0) { player.x = i % COLS; player.y = Math.floor(i / COLS); } }
    if (q.get('at') === 'boss') { const G = player.arena.guardian; player.x = G.x - 3; player.y = G.y; if (!walkable(player.arena, player.x, player.y)) { player.x = G.x; player.y = G.y + 2; } if (q.get('phase')) { G.hp = Math.round(G.maxHp * [1, 0.6, 0.3][+q.get('phase') - 1]); G.aggro = true; } } // &phase=2|3: el jefe ya herido
    if (q.get('at') === 'lab') { player.x = player.arena.gate.x - 2; player.y = player.arena.gate.y; }
    if (q.get('at') === 'field') { const L = player.arena; const h = L.creeps.find(c => !c.isGuardian && L.zone[c.y * COLS + c.x] === ZONE.field); player.x = h.x - 3; player.y = h.y; if (!walkable(L, player.x, player.y)) { player.x = h.x; player.y = h.y + 1; } }
    const level = player.arena;
    if (awaken && q.get('near')) { const w = level.starterWeapons.find(o => o.key === 'ADVENTURER_' + q.get('near').toUpperCase()); player.x = w.x; player.y = w.y + (walkable(level, w.x, w.y + 1) ? 1 : -1); } // &near=bow: al lado de un arma (su cartel)
    if (!awaken) ['GRUNT', 'ARCHER', 'SHAMAN', 'BRUTE'].forEach((k, i) => {
        const x = player.x + 2 + i, y = player.y + (i % 2 ? 1 : -1);
        if (!walkable(level, x, y)) return;
        const c = makeCreep(CREEP_TYPES[k], x, y, 1, false, 0); c.arena = level; c.spawnTime = -1e9; level.creeps.push(c);
    });
    level.fovKey = null; computeFov(level, player);
    if (q.get('gunner')) { // &gunner=burst|fan|shotgun|ring|spiral: un tirador cerca que dispara y la imagen se congela (capturas)
        const t = makeGunnerType(generateBeast(level.biome, 'gunner', 0), 'gunner'); t.bulletPattern = q.get('gunner');
        const spot = [[4, -1], [4, 0], [-4, 0], [0, 4], [0, -4], [3, 3], [-3, -3], [3, -3], [-3, 3]].map(([dx, dy]) => ({ x: player.x + dx, y: player.y + dy }))
            .find(o => walkable(level, o.x, o.y) && lineClear(level, player.x, player.y, o.x, o.y)) || { x: player.x + 3, y: player.y };
        const g = makeCreep(t, spot.x, spot.y, 1, false, 0); Object.assign(g, { arena: level, spawnTime: -1e9, aggro: true, shotAt: gameClock + 0.3 }); level.creeps.push(g);
        level.creeps.forEach(c => { if (c !== g && !c.isGuardian && Math.hypot(c.x - player.x, c.y - player.y) < 6) c.hp = 0; });
        setTimeout(() => { tickFx = () => 0; hitStopUntil = 1e12; }, +(q.get('at_ms') || 1150));
    }
    if (q.get('shot')) setTimeout(() => { // &shot=sword|bow|staff: congela el golpe de la Q en pleno movimiento (capturas)
        const kind = q.get('shot'), e = nearestEnemy(player, 8), sk = player.skills.find(s => s.kind === 'active');
        player.mana = player.maxMana; player.cooldowns[sk.id] = 0;
        if (kind === 'bow') startCharge(player, sk, 'q'), player.charging.start = gameClock - BOW_SHOT.chargeTime - 0.05;
        else { if (kind === 'sword') { player.comboStep = 2; player.comboAt = gameClock; } castAt(player, sk, e.x, e.y); }
        if (q.get('threat')) { const g = makeCreep(CREEP_TYPES.ARCHER, player.x, player.y, 1, false, 0); g.arena = level; [[-26, 0, 18, 0], [0, -20, 0, 14]].forEach(([dx, dy, vx, vy]) => { spawnBullet(g, 0, 1, 0.5); Object.assign(level.bullets[level.bullets.length - 1], { x: player.x + dx, y: player.y + dy, vx, vy }); }); } // &threat=1: balas que vienen de fuera de la vista
        setTimeout(() => { tickFx = () => 0; hitStopUntil = 1e12; }, kind === 'staff' ? 160 : 50);
    }, 800);
    if (location.search.includes('inv')) { // demo del inventario con piezas variadas
        [['SNIPER', 'helm', 'rare'], ['VAMPIRE', 'boots', 'magic'], ['FROSTWITCH', 'armor', 'magic'], ['ZEUS', 'weapon', 'rare'], ['DANCER', 'gloves', 'normal']]
            .forEach(([h, slot, q]) => addToBag(player, makeTowerItem(2, cat.find(e => e.heroKey === h && e.slot === slot), q)));
        equipItem(player, makeTowerItem(2, cat.find(e => e.innateId === 'PERFECT_AIM'), 'magic'));
        toggleInventory(true);
        const w = document.querySelector('.gear-weapon'); if (w) w.dispatchEvent(new Event('mouseenter'));
    }
}, 300);
