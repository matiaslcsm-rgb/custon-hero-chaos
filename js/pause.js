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
    if (on && (!canPause() || weaponPickOpen)) return; // elegir arma es obligatorio: no se puede pausar por arriba
    paused = on;
    showPanel('pause-menu', on);
    if (on) { cancelTargeting(); renderPauseMenu(); sfx('click'); }
}
function togglePause() { setPaused(!paused); }

function renderPauseMenu() {
    const opt = (id, label, on, fn) => `<button class="pm-toggle${on ? ' on' : ''}" data-opt="${id}">${label}<span>${on ? 'SÍ' : 'NO'}</span></button>`;
    document.getElementById('pause-options').innerHTML =
        opt('sound', '🔊 Sonido', soundOn) +
        (gameMode === 'tower' ? opt('music', '🎵 Música', musicOn) : '') +
        opt('sprites', '🎨 Pixel art (G)', spritesOn) +
        opt('autocast', '✨ Habilidades automáticas (H)', autoCast) +
        opt('autopilot', '🤖 Piloto automático (P)', autopilot) +
        (gameMode === 'tower' ? '' : opt('bigmap', '⤢ Mapa grande (M)', mapScale > 1)); // en la Torre el mapa ya ocupa la ventana
    document.querySelectorAll('#pause-options .pm-toggle').forEach(btn => {
        btn.onclick = () => {
            ({ sound: () => setSound(!soundOn), music: () => setMusic(!musicOn), sprites: () => setSprites(!spritesOn), autocast: () => setAutoCast(!autoCast),
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
    if (weaponPickOpen) return; // elegir arma es obligatorio: Esc no la cierra
    if (targeting) { cancelTargeting(); return; }
    if (document.getElementById('tutorial').style.display === 'flex') { closeTutorial(); return; }
    if (closeGlossary()) return;
    if (statsOpen) { toggleStatsWindow(false); return; }
    if (invOpen) { toggleInventory(false); return; }
    if (tshopOpen) { toggleTowerShop(false); return; }
    if (bestiaryOpen) { toggleBestiary(false); return; }
    if (codexOpen) { toggleCodex(false); return; }
    if (smithOpen) { toggleSmith(false); return; }
    if (towerLogOpen) { toggleTowerLog(false); return; }
    if (notebookOpen) { toggleNotebook(false); return; }
    if (document.getElementById('hero-any-drawer').classList.contains('open')) { closeHeroDrawer(); return; }
    if (document.getElementById('shop-container').style.display === 'block') { closeShop(); return; }
    togglePause();
}
