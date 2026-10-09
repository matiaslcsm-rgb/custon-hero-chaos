// Pausa, glosario y opciones.
//
//   Esc (o el botón ⏸ arriba del mapa) pausa la partida: se congelan el combate, los temporizadores y los efectos.
//   El menú de pausa tiene: Continuar, Tutorial, Glosario (Héroes, Creeps y Jefes, Ítems), Opciones (sonido, gráficos,
//   habilidades automáticas, piloto automático, mapa grande) y Salir al menú.
//   El glosario también se abre desde el menú de inicio. Cada códice se muestra como una ventana a pantalla completa.

let paused = false;
let glossaryFromPause = false; // al cerrar el glosario, volver al menú de pausa si se abrió desde ahí

function canPause() { return gameState !== 'MENU' && gameState !== 'ENDED'; }

function setPaused(on) {
    if (on && !canPause()) return;
    paused = on;
    showPanel('pause-menu', on);
    document.body.classList.toggle('paused', on); // esconde el cartel del piso (style.css)
    if (on) { cancelTargeting(); renderPauseMenu(); sfx('click'); }
}
function togglePause() { setPaused(!paused); }

// Deslizador de accesibilidad (utils.js)
function a11ySlider(key, label, min, max) {
    return `<label class="pm-slider">${label}<input type="range" min="${min * 100}" max="${max * 100}" step="10" value="${Math.round(A11Y[key] * 100)}" data-a11y="${key}"><b>${Math.round(A11Y[key] * 100)}%</b></label>`;
}
function renderPauseMenu() {
    const opt = (id, label, on, fn) => `<button class="pm-toggle${on ? ' on' : ''}" data-opt="${id}">${label}<span>${on ? 'SÍ' : 'NO'}</span></button>`;
    document.getElementById('pause-options').innerHTML =
        opt('sound', '🔊 Sonido', soundOn) +
        opt('music', '🎵 Música', musicOn) +
        opt('sprites', '🎨 Pixel art (G)', spritesOn) +
        opt('colorblind', '🎨 Zonas de ataque para daltonismo (azul y naranja)', A11Y.colorblind) +
        opt('weather', '🌧 Clima (lluvia, nieve, ceniza…)', weatherOn) +
        (gameMode === 'tower' ? `<button class="pm-toggle on" data-opt="loot">🎒 Levantar botín<span>${LOOT_FILTERS[lootFilter].name.toUpperCase()}</span></button>` : '') +
        opt('autocast', '✨ Habilidades automáticas (H)', autoCast) +
        opt('autopilot', '🤖 Piloto automático (P)', autopilot) +
        (gameMode === 'tower' ? '' : opt('bigmap', '⤢ Mapa grande (M)', mapScale > 1)); // en la Torre el mapa ya ocupa la ventana
    // Deslizadores: volumen general, música, efectos y temblor de pantalla
    const slider = (key, label, max = 1) => `<label class="pm-slider">${label}<input type="range" min="0" max="${max * 100}" step="5" value="${Math.round(VOLUME[key] * 100)}" data-vol="${key}"><b>${Math.round(VOLUME[key] * 100)}%</b></label>`;
    document.getElementById('pause-options').insertAdjacentHTML('afterbegin',
        slider('master', '🔈 Volumen general') + slider('music', '🎵 Música') + slider('sfx', '💥 Efectos') + slider('shake', '📳 Temblor de pantalla', 1.5) +
        `<div class="pause-section">♿ Accesibilidad</div>` +
        a11ySlider('combatText', '🔠 Textos de combate', 0.8, 1.6) + a11ySlider('uiScale', '🖥 Escala de la interfaz', 0.8, 1.4));
    document.querySelectorAll('#pause-options input[data-vol]').forEach(inp => {
        inp.oninput = () => { VOLUME[inp.dataset.vol] = inp.value / 100; inp.nextElementSibling.textContent = inp.value + '%'; if (inp.dataset.vol !== 'sfx' && inp.dataset.vol !== 'master') setVolume(inp.dataset.vol, inp.value / 100); else applyVolume(); };
        inp.onchange = () => { setVolume(inp.dataset.vol, inp.value / 100); inp.blur(); }; // al soltar: se guarda y suena una muestra
    });
    document.querySelectorAll('#pause-options input[data-a11y]').forEach(inp => {
        inp.oninput = () => { inp.nextElementSibling.textContent = inp.value + '%'; setA11y(inp.dataset.a11y, inp.value / 100); };
        inp.onchange = () => inp.blur();
    });
    document.querySelectorAll('#pause-options .pm-toggle').forEach(btn => {
        btn.onclick = () => {
            ({ sound: () => setSound(!soundOn), music: () => setMusic(!musicOn), colorblind: () => setA11y('colorblind', !A11Y.colorblind), weather: () => setWeather(!weatherOn), loot: cycleLootFilter, sprites: () => setSprites(!spritesOn), autocast: () => setAutoCast(!autoCast),
               autopilot: () => setAutopilot(!autopilot), bigmap: toggleBigMap })[btn.dataset.opt]();
            renderPauseMenu();
        };
    });
    document.getElementById('pause-tower').innerHTML = gameMode === 'tower' && towerRun ? towerPauseHtml() : '';
    document.getElementById('pause-glossary').style.display = gameMode === 'tower' ? 'none' : '';
    document.getElementById('pause-info').textContent = gameMode === 'tower' && towerRun ? `Aventurero nivel ${player.level} · piso ${towerRun.floor} de ${TOWER.floors} · ${player.gold}g` : player
        ? `${player.name} · ronda ${waveNumber} · ${aliveHeroes().length} héroes en juego · ${heroRank(player)}º con ${player.points} puntos` : '';
}

// --- GLOSARIO (códices) ---
function openGlossary(view) {
    glossaryFromPause = paused;
    if (paused) showPanel('pause-menu', false);
    ['heroes', 'creeps', 'items'].forEach(v => { document.getElementById('view-' + v).style.display = v === view ? 'block' : 'none'; });
    document.getElementById('view-' + view).scrollTop = 0;
}
function closeGlossary() {
    const open = ['heroes', 'creeps', 'items'].some(v => document.getElementById('view-' + v).style.display === 'block');
    ['heroes', 'creeps', 'items'].forEach(v => { document.getElementById('view-' + v).style.display = 'none'; });
    if (open && glossaryFromPause && paused) showPanel('pause-menu', true);
    return open;
}
function isGlossaryOpen() { return ['heroes', 'creeps', 'items'].some(v => document.getElementById('view-' + v).style.display === 'block'); }

// Compatibilidad: antes había pestañas arriba; ahora el glosario se abre como ventana.
function showView(view) { if (view === 'game') closeGlossary(); else openGlossary(view); }

function quitToMenu() {
    if (player && !confirm('¿Salir al menú? Se pierde la partida en curso.')) return; // eligiendo héroe no hay nada que perder
    setPaused(false);
    resetGame();
}

// Esc: cierra lo que esté abierto (apuntado, tienda, tutorial, glosario) y si no hay nada, pausa o reanuda.
function handleEscape() {
    if (targeting) { cancelTargeting(); return; }
    if (typeof waystoneOpen !== 'undefined' && waystoneOpen) { toggleWaystone(false); return; }
    if (document.getElementById('tutorial').style.display === 'flex') { closeTutorial(); return; }
    if (closeGlossary()) return;
    if (statsOpen) { toggleStatsWindow(false); return; }
    if (invOpen) { toggleInventory(false); return; }
    if (tshopOpen) { toggleTowerShop(false); return; }
    if (bestiaryOpen) { toggleBestiary(false); return; }
    if (codexOpen) { toggleCodex(false); return; }
    if (smithOpen) { toggleSmith(false); return; }
    if (towerLogOpen) { toggleTowerLog(false); return; }
    if (towerMapOpen) { toggleTowerMap(false); return; }
    if (keysOpen) { toggleKeys(false); return; }
    if (notebookOpen) { toggleNotebook(false); return; }
    if (document.getElementById('hero-any-drawer').classList.contains('open')) { closeHeroDrawer(); return; }
    if (document.getElementById('shop-container').style.display === 'block') { closeShop(); return; }
    togglePause();
}
