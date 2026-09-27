// Ayuda a los que van atrás (DISEÑO.md §9): al terminar cada ronda, la mitad de abajo del ranking (contando solo a los
// que siguen en juego) recibe un Fragmento del Destino, y el último además un Libro del Destino.
// Con 8 en juego: los 4 últimos. Con 5: los 2 últimos. Con 2: solo el último.

function giveRankingRewards() {
    const alive = rankedHeroes().filter(h => !h.eliminated);
    const count = Math.floor(alive.length / 2);
    if (!count) return;
    const bottom = alive.slice(-count), last = alive[alive.length - 1];
    bottom.forEach(h => { h.destiny.fragments++; });
    last.destiny.books++;
    const names = bottom.filter(h => h !== player).map(h => h.name);
    if (last === player) log('📖 Vas último: recibís un Fragmento y un Libro del Destino para rehacer tu kit (usalos en la preparación).');
    else if (bottom.includes(player)) log('🔮 Vas en la mitad de abajo: recibís un Fragmento del Destino (usalo o vendelo en la preparación).');
    log(`🔮 Ayuda para los de abajo: ${names.length ? `${names.join(', ')} reciben un Fragmento del Destino` : 'Fragmentos repartidos'}; ` +
        `${last === player ? 'vos' : last.name}, además, un Libro.`);
}
