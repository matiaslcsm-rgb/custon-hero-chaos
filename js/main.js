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

initHeroSelect();
renderHeroCodex();
requestAnimationFrame(loop);
