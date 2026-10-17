// Galería de personajes (index.html?galeria, 2026-10-17, pedido: "una hoja donde estén todos los personajes de los
// juegos moviéndose y haciendo todas sus animaciones"): el héroe dibujado de la Torre en sus tres vistas, los héroes de
// Custom Hero con el muñeco por poses y todas las criaturas y guardianes, cada animación en su recuadro y en loop.
const GALERIA = { scale: 3, fps: 8 };

// Las animaciones de un héroe: [nombre, tipo, cuadros, vista]
function galeriaHeroAnims(art) {
    const n = kind => (typeof PXH_ANIM !== 'undefined' && PXH_ANIM[kind] ? PXH_ANIM[kind].length : 4);
    const list = [['quieto', 'idle', 8], ['caminar', 'walk', 8], ['combo (3 tajos)', 'swing', 18], ['parada', 'swing', 6, 'side', 18],
        ['esquive', 'dash', 4], ['golpe recibido', 'hurt', n('hurt')], ['caída', 'death', art ? 5 : n('death')]];
    if (!art) return list;
    return list.concat([['quieto de frente', 'idle', 8, 'down'], ['caminar de frente', 'walk', 8, 'down'],
        ['quieto de espaldas', 'idle', 8, 'up'], ['caminar de espaldas', 'walk', 8, 'up']]);
}

function galeriaStart() {
    document.body.classList.add('galeria-on');
    const wrap = document.createElement('div'); wrap.id = 'galeria';
    wrap.innerHTML = '<div class="ga-top"><b>Galería de personajes</b> <span>todas las animaciones en loop · Esc: volver a la portada</span></div>';
    document.body.appendChild(wrap);
    addEventListener('keydown', e => { if (e.code === 'Escape') location.href = location.pathname; });
    const cards = [];
    const section = title => { const h = document.createElement('h3'); h.textContent = title; wrap.appendChild(h); const g = document.createElement('div'); g.className = 'ga-grid'; wrap.appendChild(g); return g; };
    // el recuadro mide lo que su cuadro más grande (los cuadros ya vienen armados y guardados)
    const card = (grid, label, frameAt, count) => {
        const imgs = Array.from({ length: count }, (_, i) => frameAt(i));
        const d = document.createElement('div'); d.className = 'ga-card';
        const c = document.createElement('canvas'); c.width = Math.max(...imgs.map(i => i.width)) * GALERIA.scale; c.height = Math.max(...imgs.map(i => i.height)) * GALERIA.scale;
        d.appendChild(c); const p = document.createElement('p'); p.textContent = label; d.appendChild(p); grid.appendChild(d);
        cards.push({ c, imgs });
    };

    // Héroes: el de la Torre con espada (dibujado) y cada héroe de Custom Hero (muñeco por poses, con su arma)
    const looks = [['Torre · con espada', { cape: '#a33a3a', hood: '#7a2a2a', trim: '#c9a227', glow: '#9ad1ff', weapon: 'sword' }, true]]
        .concat(Object.keys(HERO_SPRITES).map(key => [(HERO_TEMPLATES[key] && HERO_TEMPLATES[key].name) || (key === 'ADVENTURER' ? 'Aventurero (Torre, sin espada)' : key), pxHeroLook({ key }), false]));
    looks.forEach(([name, L, art]) => {
        const grid = section('🦸 ' + name);
        galeriaHeroAnims(art && heroUsesArt(L)).forEach(([label, kind, n, dir = 'side', k0 = 0]) =>
            card(grid, label, i => pxbHeroFrame(L, kind, k0 + i, dir).img, n));
    });

    // Criaturas de la Torre (también los creeps de Custom Hero) y guardianes: caminar y quieto
    const colors = ['#8d8d8d', '#8b5e3c', '#6a994e', '#c08552', '#90caf9', '#9d0208', '#6a4c93'];
    const bodies = Object.keys(PXB).filter(b => !b.startsWith('boss:') && b !== 'hero'), bosses = Object.keys(PXB).filter(b => b.startsWith('boss:'));
    const beasts = section('👹 Criaturas');
    bodies.forEach((b, i) => {
        const col = colors[i % colors.length];
        const name = { deer: 'Ciervo' }[b] || (BEAST_NOUNS[b] ? BEAST_NOUNS[b][0][0] : b);
        card(beasts, name + ' · camina', k => pxbFrame(b, col, [], 'walk', k % 4).img, 4);
        card(beasts, name + ' · quieto', k => pxbFrame(b, col, [], 'idle', k % 2).img, 2);
    });
    const boss = section('👑 Guardianes');
    bosses.forEach((b, i) => {
        const col = colors[(i + 2) % colors.length];
        const name = 'Guardián ' + (BIOMES[b.slice(5)] ? BIOMES[b.slice(5)].name : b.slice(5));
        card(boss, name + ' · camina', k => pxbFrame(b, col, [], 'walk', k % 4).img, 4);
        card(boss, name + ' · quieto', k => pxbFrame(b, col, [], 'idle', k % 2).img, 2);
    });

    // Un solo bucle para todos: cada recuadro dibuja su cuadro, apoyado abajo y centrado
    const draw = now => {
        const tick = Math.floor(now / 1000 * GALERIA.fps);
        cards.forEach(({ c, imgs }) => {
            const g = c.getContext('2d'), img = imgs[tick % imgs.length], s = GALERIA.scale;
            g.imageSmoothingEnabled = false; g.clearRect(0, 0, c.width, c.height);
            g.drawImage(img, Math.round((c.width - img.width * s) / 2), c.height - img.height * s, img.width * s, img.height * s);
        });
        requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    return cards.length;
}
if (/[?&]galeria\b/.test(location.search)) addEventListener('load', () => setTimeout(galeriaStart, 0));
