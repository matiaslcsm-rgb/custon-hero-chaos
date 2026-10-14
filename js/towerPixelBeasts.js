// Tower Chaos: criaturas en pixel art (2026-10-13, estilo principal de la Torre; va con el suelo en pixel art, towerPixel.js).
//
//   Las criaturas se generan por piezas (towerBestiary.js): rol, CUERPO, tamaño, color y PARTES. Acá cada uno de los 16
//   cuerpos es un dibujo en pixel art hecho en código, mirando a la derecha, con 4 cuadros de caminata y 2 de reposo.
//   El color sale de la criatura (5 tonos, con luz de arriba a la izquierda) y las partes (cuernos, púas, alas, ojos,
//   manchas) se enganchan en la cabeza y el lomo de cada cuerpo; así cualquier combinación sale sola.
//   Para que se lean sobre cualquier suelo: contorno oscuro, sombra en el piso y el color principal nunca muy oscuro.
//   Vista de todos: index.html?demo=pixelbeasts

const PXB_PAD = 4; // margen alrededor del cuerpo (cuernos, alas)
const PXB_BONE = '#e6dcc4', PXB_STEEL = ['#4a4f57', '#6b727c', '#9aa2ab', '#d0d6dc'], PXB_WOOD = ['#3d2a1c', '#5a3f29', '#7a5a3c'];
const PXB_SKIN = ['#7a5038', '#a06c4c', '#c48e68', '#dcae86', '#ecc8a2'];

// Pierna de un cuadrúpedo: o corre el pie (paso)
function pxbLeg(S, x, y, len, o, col) { for (let k = 0; k < len; k++) S.set(x + (k >= len - 2 ? o : 0), y + k - (o !== 0 && k === len - 1 ? 1 : 0), col); }
function pxbShadow(S, cx, cy, rx) { const R = S.R || 1, o = (R - 1) / 2; pxShadow(S.raw || S, cx * R + o, cy * R + o, rx * R, Math.max(1, rx * 0.22) * R); } // S.R: el héroe con más resolución (towerPixelHero.js)

// Humanoide (14×22): piernas o túnica, torso, brazos, cabeza y arma
function pxbHumanoid(S, P, f, o) {
    const b = f.bob, ph = f.ph, br = f.br;
    pxbShadow(S, 7, 21, 5.5);
    const skin = o.skin || PXB_SKIN;
    if (o.robe) {
        for (let y = 10; y <= 21; y++) {
            const half = 3 + (y - 10) * 0.28 + (y === 21 && (f.walk >= 0 ? f.walk % 2 : 0) ? 0.6 : 0);
            for (let x = Math.round(7 - half); x <= Math.round(7 + half); x++) S.set(x, y + (y < 21 ? b : 0), x < 6 ? P[3] : x > 8 ? P[1] : P[2]);
        }
        S.set(7 + ph, 21, P[0]);
    } else {
        S.rect(4 - ph, 15 + b, 2, 6 - b, P[0]); S.set(4 - ph, 20, '#241b16'); S.set(5 - ph, 20, '#241b16'); // pierna de atrás
        S.rect(7 + ph, 15 + b, 2, 6 - b, P[1]); S.set(7 + ph, 20, '#2e231c'); S.set(8 + ph, 20, '#2e231c');
    }
    S.rect(2, 9 + b + br, 2, 5, P[0]); S.set(2, 14 + b + br, skin[1]);                       // brazo de atrás
    S.ball(6.5, 11.5 + b + br, 3.6 + (o.bulk || 0), 3.8, P);                                     // torso
    if (o.belt) S.rect(3, 14 + b, 8, 1, o.belt);
    // Cabeza
    const hy = 5 + b + br;
    if (o.head === 'helm') { S.ball(6.5, hy, 2.8, 2.7, PXB_STEEL.concat(['#eef2f5'])); S.rect(6, hy, 4, 1, '#14161a'); S.set(7, hy - 3, P[3]); S.set(6, hy - 4, P[4]); }
    else if (o.head === 'hood') { S.ball(6.5, hy, 3, 3, P); S.ball(8, hy + 0.5, 1.6, 1.6, skin.map(c => shade(c, -0.35))); S.set(9, hy, '#f2e6c8'); }
    else if (o.head === 'hat') { S.ball(7, hy + 1, 2.4, 2.2, skin); S.set(8, hy + 1, '#1a1412'); S.rect(3, hy - 1, 9, 1, P[1]); S.tri([4.5, hy - 1], [9.5, hy - 1], [6, hy - 7], P[2]); S.set(6, hy - 6, P[3]); S.set(5, hy - 7, P[2]); }
    else if (o.head === 'mask') { S.ball(6.5, hy, 2.8, 2.8, P.map(c => shade(c, -0.3))); S.rect(9, hy, 2, 1, PXB_BONE); S.set(11, hy + 1, PXB_BONE); S.set(8, hy - 1, '#c03a2b'); S.rect(3, hy - 3, 8, 1, '#1d1714'); }
    else { S.ball(6.5, hy, 2.7, 2.6, skin); S.rect(4, hy - 3, 5, 2, o.hair || '#3a281c'); S.set(8, hy, '#1a1412'); }
    // Brazo de adelante y arma
    S.rect(9, 9 + b + br, 2, 5, P[2]); S.set(9, 14 + b + br, skin[2]); S.set(10, 14 + b + br, skin[2]);
    const hx = 10, hyy = 14 + b + br;
    if (o.weapon === 'sword') { S.line(hx + 1, hyy, hx + 1, hyy - 8, PXB_STEEL[3]); S.line(hx + 2, hyy - 1, hx + 2, hyy - 7, PXB_STEEL[1]); S.rect(hx, hyy - 1, 3, 1, '#c9a227'); }
    else if (o.weapon === 'bow') { for (let k = -5; k <= 5; k++) S.set(hx + 2 + Math.round(1.6 * Math.cos(k / 5 * 1.3)), hyy - 3 + k, PXB_WOOD[2]); S.line(hx + 2, hyy - 8, hx + 2, hyy + 2, '#d8d0c0'); }
    else if (o.weapon === 'staff') { S.line(hx + 1, 21, hx + 1, hyy - 11, PXB_WOOD[1]); S.ball(hx + 1, hyy - 12, 1.7, 1.7, o.orb); S.set(hx + 1, hyy - 13, '#ffffff'); }
    else if (o.weapon === 'dagger') { S.line(hx + 1, hyy, hx + 3, hyy - 3, PXB_STEEL[3]); }
    else if (o.weapon === 'hammer') { S.line(hx + 1, hyy + 1, hx + 1, hyy - 6, PXB_WOOD[1]); S.rect(hx - 1, hyy - 9, 5, 3, PXB_STEEL[1]); S.rect(hx - 1, hyy - 9, 5, 1, PXB_STEEL[2]); }
    else if (o.weapon === 'lantern') { S.line(hx + 1, hyy, hx + 1, hyy + 2, '#2a2420'); S.rect(hx, hyy + 3, 3, 3, '#3a3028'); S.set(hx + 1, hyy + 4, f.idle ? '#ffd166' : '#ffe9a0'); }
}

const PXB = {
    wolf: { w: 22, h: 15, head: [17, 3], back: [9, 4], draw(S, P, f) {
        const b = f.bob, ph = f.ph;
        pxbShadow(S, 11, 14, 8);
        pxbLeg(S, 7, 10 + b, 5 - b, -ph, P[1]); pxbLeg(S, 15, 10 + b, 5 - b, ph, P[1]);
        S.line(4, 8 + b, 1, 5 + b - f.br, P[2]); S.set(0, 4 + b - f.br, P[3]);
        S.ball(10, 8 + b, 7, 3.4, P);
        S.ball(16.5, 6 + b, 3.2, 2.8, P); S.rect(18, 7 + b, 3, 2, P[2]); S.set(21, 7 + b, '#1a1412'); S.set(19, 9 + b, P[1]);
        S.set(15, 2 + b, P[2]); S.set(16, 3 + b, P[3]); S.set(15, 3 + b, P[1]);
        S.set(17, 5 + b, '#f0d060');
        pxbLeg(S, 5, 10 + b, 5 - b, ph, P[2]); pxbLeg(S, 13, 10 + b, 5 - b, -ph, P[2]);
    } },
    boar: { w: 22, h: 16, head: [17, 6], back: [9, 4], draw(S, P, f) {
        const b = f.bob, ph = f.ph;
        pxbShadow(S, 11, 15, 8.5);
        pxbLeg(S, 7, 12 + b, 4 - b, -ph, P[0]); pxbLeg(S, 15, 12 + b, 4 - b, ph, P[0]);
        S.ball(10, 9 + b, 8, 4.4, P);
        for (let x = 5; x <= 14; x++) S.set(x, 4 + b + (x % 2), P[0]); // crin
        S.ball(17, 10 + b, 3.6, 3, P); S.rect(20, 9 + b, 2, 3, '#b07a6a'); S.set(21, 10 + b, '#3a2620');
        S.set(20, 12 + b, PXB_BONE); S.set(21, 11 + b, PXB_BONE); S.set(15, 6 + b, P[1]); S.set(16, 7 + b, P[2]);
        S.set(18, 8 + b, '#c0302a');
        pxbLeg(S, 5, 12 + b, 4 - b, ph, P[1]); pxbLeg(S, 13, 12 + b, 4 - b, -ph, P[1]);
    } },
    lizard: { w: 24, h: 12, head: [19, 4], back: [11, 4], draw(S, P, f) {
        const b = f.bob, ph = f.ph, sw = f.walk >= 0 ? (f.walk % 2 ? 1 : -1) : f.br;
        pxbShadow(S, 12, 11, 9);
        S.line(6, 8 + b, 0, 9 + sw, P[1]); S.line(6, 7 + b, 1, 8 + sw, P[2]);
        S.line(8, 8 + b, 7 - ph, 11, P[0]); S.line(16, 8 + b, 17 + ph, 11, P[0]);
        S.ball(11.5, 7 + b, 7, 2.6, P);
        S.ball(19, 6 + b, 3.2, 2.1, P); S.set(22, 7 + b, P[1]); S.set(20, 5 + b, '#f0d060'); S.set(21, 7 + b, '#1a1412');
        for (let x = 7; x <= 15; x += 2) S.set(x, 5 + b, P[3]);
        S.line(10, 8 + b, 11 + ph, 11, P[1]); S.line(15, 8 + b, 14 - ph, 11, P[1]);
    } },
    scorpion: { w: 22, h: 16, head: [16, 8], back: [9, 8], draw(S, P, f) {
        const ph = f.ph, t = f.br + (f.walk >= 0 ? f.walk % 2 : 0);
        pxbShadow(S, 10, 15, 8);
        for (let i = 0; i < 3; i++) { const x = 6 + i * 3, o = i % 2 ? ph : -ph; S.line(x, 12, x - 1 + o, 15, P[0]); S.line(x + 1, 12, x + 2 - o, 15, P[1]); }
        S.ball(9, 11, 6, 2.9, P);
        S.line(14, 11, 17, 10, P[1]); S.ball(18.5, 9.5, 2, 1.6, P); S.set(21, 8, P[3]); S.set(21, 10, P[1]);
        S.line(14, 12, 17, 13, P[1]); S.set(18, 13, P[2]); S.set(19, 12, P[3]);
        [[3, 8, 1.9], [2.5, 5, 1.8], [4.5, 2.5 - t * 0.5, 1.7], [7.5, 1.5 - t * 0.5, 1.5]].forEach(([x, y, r]) => S.ball(x, y, r, r, P));
        S.set(10, 2 - t, '#e8d080'); S.set(11, 3 - t, '#e8d080');
        S.set(15, 10, '#1a1412');
    } },
    toad: { w: 16, h: 13, head: [8, 3], back: [8, 5], draw(S, P, f) {
        const b = f.walk >= 0 ? -[0, 2, 0, 1][f.walk] : 0;
        pxbShadow(S, 8, 12, 6);
        S.rect(2, 10 + b, 3, 2 - b, P[1]); S.rect(11, 10 + b, 3, 2 - b, P[1]);
        S.ball(8, 8 + b, 6, 4.2 - f.br * 0.3, P); S.ball(8, 10 + b, 4, 1.8, [P[2], P[3], P[3], P[4], P[4]]);
        S.ball(5, 4.5 + b, 1.7, 1.7, P); S.ball(11, 4.5 + b, 1.7, 1.7, P); S.set(4, 4 + b, '#f4f0e0'); S.set(5, 4 + b, '#1a1412'); S.set(10, 4 + b, '#f4f0e0'); S.set(11, 4 + b, '#1a1412');
        for (let x = 4; x <= 12; x++) S.set(x, 8 + b, P[0]);
    } },
    footman: { w: 14, h: 22, head: [6, 2], back: [6, 9], draw(S, P, f) { pxbHumanoid(S, P, f, { head: 'helm', weapon: 'sword', belt: '#3a2a1c' }); } },
    archer: { w: 14, h: 22, head: [6, 2], back: [6, 9], draw(S, P, f) { pxbHumanoid(S, P, f, { head: 'hood', weapon: 'bow', belt: '#4a3524' }); } },
    mage: { w: 14, h: 22, head: [7, 0], back: [6, 9], draw(S, P, f) { pxbHumanoid(S, P, f, { robe: true, head: 'hat', weapon: 'staff', orb: [shade(P[3], -0.25), P[3], P[4], shade(P[4], 0.35), '#ffffff'] }); } },
    plague: { w: 14, h: 22, head: [6, 2], back: [6, 9], draw(S, P, f) { pxbHumanoid(S, P, f, { robe: true, head: 'mask', weapon: 'lantern' }); } },
    chusma: { w: 14, h: 15, head: [7, 2], back: [7, 8], draw(S, P, f) { // trasgo: cabezón y orejas largas
        const b = f.bob, ph = f.ph;
        pxbShadow(S, 7, 14, 4.5);
        S.rect(5 - ph, 11 + b, 2, 4 - b, P[0]); S.rect(8 + ph, 11 + b, 2, 4 - b, P[1]);
        S.ball(7, 10 + b, 2.8, 2.4, ['#3a2a1c', '#4f3a26', '#654a30', '#7a5c3c', '#8f6d48']);
        S.ball(7, 5 + b + f.br, 3.3, 2.8, P); S.set(2, 3 + b, P[2]); S.set(3, 4 + b, P[3]); S.set(12, 3 + b, P[2]); S.set(11, 4 + b, P[3]);
        S.set(8, 5 + b + f.br, '#f0d060'); S.set(9, 7 + b + f.br, '#1a1412');
        S.set(10, 10 + b, P[2]); S.line(11, 10 + b, 13, 7 + b, PXB_STEEL[3]);
    } },
    brute: { w: 20, h: 24, head: [14, 6], back: [8, 7], draw(S, P, f) { // ogro encorvado con garrote
        const b = f.bob, ph = f.ph, br = f.br;
        pxbShadow(S, 10, 23, 8);
        S.rect(5 - ph, 17 + b, 3, 7 - b, P[0]); S.rect(11 + ph, 17 + b, 3, 7 - b, P[1]);
        S.rect(3, 10 + b + br, 3, 8, P[1]); S.ball(4.5, 18.5 + b + br, 1.8, 1.6, P);
        S.ball(9, 12.5 + b + br, 6.4, 5.6, P); S.rect(4, 17 + b, 10, 2, '#4a3524');
        // Cabeza adelante, más baja que los hombros (encorvado), con mandíbula y colmillo
        S.ball(14.5, 9 + b + br, 2.9, 2.6, P.map(c => shade(c, 0.06))); S.set(16, 8 + b + br, '#f0d060'); S.set(15, 7 + b + br, P[0]); S.set(16, 7 + b + br, P[0]);
        S.rect(15, 11 + b + br, 3, 1, P[0]); S.set(17, 10 + b + br, PXB_BONE);
        // Brazo de adelante y el garrote colgando hacia el piso
        S.rect(12, 12 + b + br, 3, 6, P[2]); S.ball(13.5, 18.5 + b + br, 1.8, 1.6, P);
        S.line(14, 19 + b + br, 17, 22, PXB_WOOD[1]); S.line(15, 19 + b + br, 18, 22, PXB_WOOD[2]); S.ball(18, 21.5, 2, 1.8, PXB_WOOD.concat(['#8f6d48', '#a27e56']));
    } },
    golem: { w: 20, h: 22, head: [10, 1], back: [10, 7], draw(S, P, f) { // bloques de piedra con ojos que brillan
        const b = f.bob, ph = f.ph, br = f.br;
        pxbShadow(S, 10, 21, 8);
        S.rect(5, 16 + b + Math.max(0, ph), 4, 6 - b - Math.max(0, ph), P[1]); S.rect(11, 16 + b + Math.max(0, -ph), 4, 6 - b - Math.max(0, -ph), P[2]);
        S.rect(1, 8 + b + br, 4, 9, P[1]); S.rect(1, 8 + b + br, 1, 9, P[0]);
        S.ball(10, 11 + b + br, 7, 5.6, P);
        S.rect(7, 2 + b + br, 6, 5, P[2]); S.rect(7, 2 + b + br, 6, 1, P[3]); S.rect(12, 3 + b + br, 1, 4, P[1]);
        S.set(8, 4 + b + br, '#ffd166'); S.set(11, 4 + b + br, '#ffd166');
        S.line(7, 9 + b, 9, 13 + b, P[0]); S.line(13, 10 + b, 12, 14 + b, P[0]);
        S.rect(15, 8 + b + br, 4, 9, P[2]); S.rect(18, 8 + b + br, 1, 9, P[1]);
    } },
    wraith: { w: 14, h: 22, head: [7, 2], back: [7, 9], draw(S, P, f) { // espectro encapuchado que flota
        const fl = f.walk >= 0 ? [0, -1, 0, 1][f.walk] : -f.br;
        pxShadow(S, 7, 21, 4, 1);
        for (let y = 8; y <= 18; y++) { const half = 3 + (y - 8) * 0.3; for (let x = Math.round(7 - half); x <= Math.round(7 + half); x++) if (y < 17 || (x + y + (f.walk >= 0 ? f.walk : f.idle)) % 3) S.set(x, y + fl, x < 6 ? P[2] : x > 8 ? P[0] : P[1]); }
        S.ball(7, 5 + fl, 3.2, 3.1, P); S.ball(8, 5.5 + fl, 1.9, 1.7, ['#08070a', '#0d0b10', '#0d0b10', '#141118', '#141118']);
        S.set(7, 5 + fl, '#9df2ff'); S.set(9, 5 + fl, '#9df2ff');
        S.line(10, 10 + fl, 12, 13 + fl, P[1]); S.set(12, 14 + fl, PXB_BONE); S.set(13, 13 + fl, PXB_BONE);
    } },
    phantom: { w: 16, h: 20, head: [8, 1], back: [8, 6], draw(S, P, f) { // sábana fantasma
        const fl = f.walk >= 0 ? [0, -1, 0, 1][f.walk] : -f.br, L = [P[2], P[3], P[3], P[4], shade(P[4], 0.3)];
        S.ball(8, 7 + fl, 5.2, 5, L); S.rect(3, 7 + fl, 11, 9, L[2]); S.rect(3, 7 + fl, 2, 9, L[3]); S.rect(12, 7 + fl, 2, 9, L[1]);
        for (let x = 3; x <= 13; x++) if ((x + (f.walk >= 0 ? f.walk : f.idle)) % 3) S.set(x, 16 + fl, L[1]);
        S.rect(6, 6 + fl, 1, 2, '#1a1418'); S.rect(9, 6 + fl, 1, 2, '#1a1418'); S.rect(7, 9 + fl, 2, 1, '#1a1418');
    } },
    swarm: { w: 16, h: 14, head: [8, 3], back: [8, 6], draw(S, P, f) { // nube de bichos
        const k = f.walk >= 0 ? f.walk : f.idle;
        [[3, 5], [8, 3], [12, 6], [5, 9], [10, 10], [7, 7], [13, 2]].forEach(([x, y], i) => {
            const jx = Math.round((pxHash(i, k, 3) - 0.5) * 2), jy = Math.round((pxHash(i, k, 4) - 0.5) * 2);
            pxShadow(S, x + jx, 13, 1, 0.5);
            S.rect(x + jx, y + jy, 2, 2, P[i % 2 ? 1 : 2]); S.set(x + jx + 1, y + jy, P[3]);
            S.set(x + jx + ((k + i) % 2 ? -1 : 2), y + jy - 1, '#dfe8ee');
        });
    } },
    kamikaze: { w: 13, h: 14, head: [6, 5], back: [6, 6], draw(S, P, f) { // escarabajo bomba con mecha
        const b = f.bob, ph = f.ph;
        pxbShadow(S, 6, 13, 5);
        for (let i = 0; i < 3; i++) { S.line(3 + i * 3, 11 + b, 2 + i * 3 + (i % 2 ? ph : -ph), 13, P[0]); }
        S.ball(6.5, 8.5 + b, 5.2, 4.2, P); S.line(6, 5 + b, 6, 12 + b, P[0]);
        S.line(6, 4 + b, 8, 1 + b, PXB_WOOD[2]);
        S.set(9, 0 + b, (f.walk >= 0 ? f.walk : f.idle) % 2 ? '#ffd166' : '#ff7a1a'); S.set(9, 1 + b, '#ff7a1a');
    } }
};

// --- LOS GUARDIANES: el jefe de cada bioma, con su sprite propio (towerBosses.js) ---
const PXG_BARK = ['#2a1d14', '#3e2b1d', '#553c28', '#6d4f35', '#86643f'], PXG_LEAF = ['#1d3a1c', '#285024', '#33662c', '#448038', '#5c9c46'];
const PXG_OBSID = ['#141012', '#1f191c', '#2b2327', '#3a3035', '#4a3e44'], PXG_FIRE = ['#a8300c', '#e0561a', '#ff7a1a', '#ffb347', '#fff0a0'];
Object.assign(PXB, {
    // Raíz Madre (bosque): árbol viejo que camina sobre sus raíces, con cara y copa
    'boss:forest': { w: 34, h: 40, head: [17, 4], back: [17, 12], draw(S, P, f) {
        const b = f.bob, ph = f.ph, br = f.br;
        pxbShadow(S, 17, 39, 13);
        [-1, 1].forEach(i => { S.line(17 + i * 4, 32, 17 + i * 10 + ph * i, 39, PXG_BARK[1]); S.line(17 + i * 4, 33, 17 + i * 10 + ph * i, 39 - 1, PXG_BARK[1]); S.line(17 + i * 2, 33, 17 + i * 5 - ph * i, 39, PXG_BARK[2]); });
        S.line(10, 20 + b, 4, 27 + b + br, PXG_BARK[2], 2); S.line(5, 27 + b + br, 3, 30 + b + br, PXG_BARK[1]); S.line(5, 26 + b + br, 2, 25 + b + br, PXG_BARK[1]);
        S.ball(17, 25 + b, 8.5, 9.5, PXG_BARK);
        for (const x of [13, 17, 21]) for (let y = 18; y < 33; y++) if ((x + y) % 4) S.set(x + (y % 7 === 0 ? 1 : 0), y + b, PXG_BARK[0]);
        S.rect(14, 21 + b, 2, 1, '#c8ff70'); S.rect(19, 21 + b, 2, 1, '#c8ff70'); S.rect(15, 26 + b, 5, 2, '#120c08'); S.set(16, 27 + b, '#2a1d14');
        S.line(24, 20 + b, 31, 24 + b - br, PXG_BARK[2], 2); S.line(31, 24 + b - br, 33, 22 + b - br, PXG_BARK[3]); S.line(31, 25 + b - br, 33, 27 + b - br, PXG_BARK[3]);
        S.ball(9, 13 + b + br, 5.5, 4.5, PXG_LEAF); S.ball(25, 12 + b + br, 6, 4.8, PXG_LEAF); S.ball(17, 9 + b + br, 10, 7.5, PXG_LEAF);
        [[11, 8], [20, 5], [24, 10], [14, 12], [8, 14]].forEach(([x, y], i) => S.set(x, y + b + br, i % 2 ? '#f0a0c0' : '#fff0a0'));
        for (const x of [10, 14, 22, 26]) S.line(x, 15 + b + br, x, 18 + b + br + (x % 3), shade(P[2], -0.1));
    } },
    // Bruja del Fango (ciénaga): vieja encorvada de sombrero caído, con un bastón de calavera
    'boss:swamp': { w: 30, h: 42, head: [19, 10], back: [12, 18], draw(S, P, f) {
        const b = f.bob, br = f.br, sk = ['#3e4a22', '#56642e', '#6e7e3c', '#879a4c', '#a0b45e'], sw = f.walk >= 0 ? f.walk % 2 : br;
        pxbShadow(S, 15, 41, 10);
        for (let y = 18; y <= 40; y++) { const half = 5 + (y - 18) * 0.32; for (let x = Math.round(14 - half); x <= Math.round(14 + half); x++) if (y < 39 || (x + sw) % 3) S.set(x, y + (y < 38 ? b : 0), x < 11 ? P[1] : x > 17 ? P[0] : P[2]); }
        S.ball(12, 20 + b, 6.5, 5.5, P);
        for (const x of [9, 13, 18]) S.set(x, 41, P[0]);
        S.line(15, 14 + b + br, 12, 23 + b + br, '#9a9a90'); S.line(16, 14 + b + br, 14, 22 + b + br, '#bdbdb2');
        S.ball(19, 16 + b + br, 3.6, 3.2, sk); S.line(22, 16 + b + br, 25, 19 + b + br, sk[2]); S.set(25, 19 + b + br, sk[1]); S.set(21, 15 + b + br, '#ffe14a'); S.set(20, 19 + b + br, '#1a1412');
        S.rect(11, 12 + b + br, 14, 1, P[0]); S.tri([13, 12 + b + br], [23, 12 + b + br], [15, 2 + b + br], P[1]); S.line(15, 3 + b + br, 11, 5 + b + br, P[1]); S.set(10, 6 + b + br, P[2]);
        S.rect(14, 10 + b + br, 9, 1, P[3]);
        S.line(19, 22 + b, 24, 26 + b, sk[1]); S.line(25, 40, 25, 10 + br, PXB_WOOD[1]);
        S.ball(25, 8 + br, 2.4, 2.2, ['#a89e88', '#c8bea6', '#ddd4bc', PXB_BONE, '#fffaf0']); S.set(24, 8 + br, '#1a1412'); S.set(26, 8 + br, '#1a1412');
        S.set(25, 4 + br, (f.idle || f.walk % 2) ? '#b8ff60' : '#80e040'); S.set(25, 5 + br, '#80e040');
    } },
    // Reina Escorpión (desierto): escorpión gigante con cresta de reina y aguijón que gotea
    'boss:desert': { w: 46, h: 34, head: [34, 17], back: [22, 19], draw(S, P, f) {
        const ph = f.ph, t = f.br + (f.walk >= 0 ? f.walk % 2 : 0);
        pxbShadow(S, 23, 33, 18);
        for (let i = 0; i < 4; i++) { const x = 12 + i * 5, o = i % 2 ? ph : -ph; S.line(x, 25, x - 3 + o, 33, P[0]); S.line(x + 1, 25, x + 4 - o, 33, P[1]); }
        S.ball(14, 24, 7, 4.5, P); S.ball(22, 23, 6, 4.8, P); S.ball(28, 22, 5, 4.2, P);
        S.ball(33, 22, 5, 4, P); for (let x = 31; x <= 36; x++) S.set(x, 17 - (x % 2), '#e8c860'); S.set(35, 20, '#ff5040'); S.set(37, 21, '#ff5040');
        S.line(36, 24, 40, 22, P[1], 2); S.ball(42, 20, 3.5, 2.8, P); S.set(45, 18, P[3]); S.set(45, 22, P[2]);
        S.line(35, 26, 39, 28, P[1], 2); S.ball(41.5, 28, 3, 2.4, P); S.set(44, 27, P[3]);
        [[7, 19, 3.2], [5, 14, 3], [7, 9, 2.7], [11, 5.5, 2.5], [15.5, 4, 2.2]].forEach(([x, y, r], i) => S.ball(x, y - t * (i > 1 ? 1 : 0), r, r, P));
        S.tri([17, 4 - t], [19, 7 - t], [22, 2 - t], '#e8d080'); S.set(21, 5 - t, (f.idle || f.walk % 2) ? '#a6f04a' : '#e8d080');
    } },
    // Wyrm de Escarcha (nieve): serpiente dragón de hielo con púas de cristal y alas chicas
    'boss:snow': { w: 46, h: 34, head: [41, 6], back: [24, 21], draw(S, P, f) {
        const k = f.walk >= 0 ? f.walk : f.idle * 2, ice = ['#9fdcf0', '#dff6ff'];
        pxbShadow(S, 23, 33, 18);
        S.tri([30, 20], [24, 9 - (k % 2) * 2], [35, 14], P[3]); S.line(30, 20, 24, 9 - (k % 2) * 2, P[1]);
        for (let i = 0; i <= 8; i++) {
            const x = 4 + i * 4, y = 27 + Math.round(Math.sin(i * 0.9 + k * 0.8) * 2), r = 1.8 + Math.min(i, 6) * 0.3;
            S.ball(x, y, r + 0.6, r, P); S.set(x, y + Math.round(r) - 1, P[4]);
            if (i > 1) { S.set(x, y - Math.round(r) - 1, ice[0]); S.set(x, y - Math.round(r) - 2, ice[1]); }
        }
        S.ball(37, 21, 3.6, 3.2, P); S.ball(39, 15, 3.4, 3.2, P);
        S.ball(41, 9, 4.6, 3.4, P); S.rect(43, 10, 3, 2, P[2]); S.set(45, 12, ice[1]); S.set(43, 8, '#e0ffff');
        S.line(38, 7, 34, 3, PXB_BONE); S.line(39, 6, 36, 1, ice[1]);
        if (k % 2) { S.set(46 - 1, 9, '#ffffff'); S.set(45, 7, '#e8f8ff'); }
    } },
    // Señor de la Ceniza (volcán): demonio de obsidiana con grietas de lava, cuernos y corona de fuego
    'boss:volcano': { w: 38, h: 44, head: [20, 6], back: [19, 18], draw(S, P, f) {
        const b = f.bob, ph = f.ph, br = f.br, k = f.walk >= 0 ? f.walk : f.idle;
        pxbShadow(S, 19, 43, 13);
        S.rect(12 - ph, 32 + b, 5, 11 - b, PXG_OBSID[1]); S.rect(21 + ph, 32 + b, 5, 11 - b, PXG_OBSID[2]); S.line(14 - ph, 34 + b, 15 - ph, 40, PXG_FIRE[2]); S.line(23 + ph, 35 + b, 22 + ph, 41, PXG_FIRE[2]);
        S.rect(7, 19 + b + br, 4, 11, PXG_OBSID[1]); S.ball(8.5, 31 + b + br, 2.4, 2.2, PXG_FIRE);
        S.ball(19, 24 + b + br, 10, 9, PXG_OBSID);
        [[13, 18, 17, 23, 15, 28], [24, 19, 21, 24, 23, 30]].forEach(([a, c, d, e, g, h]) => { S.line(a, c + b + br, d, e + b + br, PXG_FIRE[2]); S.line(d, e + b + br, g, h + b + br, PXG_FIRE[3]); });
        S.ball(20, 11 + b + br, 5, 4.6, PXG_OBSID); S.set(21, 11 + b + br, '#ffd166'); S.set(24, 11 + b + br, '#ffd166'); S.rect(21, 14 + b + br, 4, 1, PXG_FIRE[1]);
        S.line(16, 8 + b + br, 11, 2 + b + br, PXG_OBSID[3], 2); S.set(10, 0 + b + br, PXG_FIRE[3]); S.line(24, 8 + b + br, 29, 2 + b + br, PXG_OBSID[3], 2); S.set(30, 0 + b + br, PXG_FIRE[3]);
        for (let x = 16; x <= 24; x++) S.set(x, 5 + b + br - ((x + k) % 3 === 0 ? 1 : 0), (x + k) % 2 ? PXG_FIRE[2] : PXG_FIRE[3]);
        S.rect(28, 19 + b + br, 4, 9, PXG_OBSID[2]); S.ball(32, 30 + b + br, 2.8 + (k % 2) * 0.5, 2.8 + (k % 2) * 0.5, PXG_FIRE);
    } }
});

// Partes enganchadas en la cabeza (h) y el lomo (k) de cada cuerpo
function pxbWings(S, P, a, f) {
    const [x, y] = a.back, flap = (f.walk >= 0 ? f.walk : f.idle) % 2 ? 2 : 0, c = shade(P[0], -0.2), m = shade(P[2], -0.25);
    S.tri([x - 1, y + 1], [x - 7, y - 6 + flap], [x - 5, y + 2], m); S.line(x - 1, y + 1, x - 7, y - 6 + flap, c);
    S.tri([x + 1, y + 1], [x + 5, y - 7 + flap], [x + 4, y + 2], m); S.line(x + 1, y + 1, x + 5, y - 7 + flap, c);
}
function pxbParts(S, P, a, parts) {
    const [hx, hy] = a.head, [bx, by] = a.back;
    if (parts.includes('horns')) { S.set(hx - 1, hy - 1, PXB_BONE); S.set(hx - 2, hy - 2, PXB_BONE); S.set(hx - 2, hy - 3, '#fff8e8'); S.set(hx + 1, hy - 1, PXB_BONE); S.set(hx + 2, hy - 2, PXB_BONE); S.set(hx + 2, hy - 3, '#fff8e8'); }
    if (parts.includes('spikes')) for (let i = -2; i <= 2; i++) { S.set(bx + i * 2, by - 1, P[0]); if (i % 2 === 0) S.set(bx + i * 2, by - 2, P[1]); }
    if (parts.includes('eyes')) { S.set(hx - 1, hy + 2, '#ff3b30'); S.set(hx + 1, hy + 2, '#ff3b30'); S.set(hx, hy + 1, '#ff8a80'); }
    if (parts.includes('spots')) [[-3, 1], [0, 2], [2, 0], [-1, -1], [3, 2]].forEach(([dx, dy]) => { if (S.get(bx + dx, by + dy + 1)) S.set(bx + dx, by + dy + 1, P[4]); });
}

// Cuadro de una criatura: { img, white } (se arman una vez y se guardan)
const pxbCache = {};
function pxbPalette(color) {
    let main = color || '#888888';
    const n = parseInt(main.slice(1), 16), lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    if (lum < 0.3) main = shade(main, (0.3 - lum) * 1.6); // nunca tan oscuro que se pierda en el suelo
    return [shade(main, -0.62), shade(main, -0.38), shade(main, -0.12), shade(main, 0.14), shade(main, 0.38)];
}
function pxbFrame(body, color, parts, kind, k) {
    const key = [body, color, parts.join(','), kind, k].join('|');
    if (pxbCache[key]) return pxbCache[key];
    const B = PXB[body], P = pxbPalette(color);
    const f = kind === 'walk' ? { walk: k, idle: 0, ph: [0, 1, 0, -1][k], bob: k % 2 ? -1 : 0, br: 0 } : { walk: -1, idle: k, ph: 0, bob: 0, br: k };
    const make = white => {
        const c = pxSprite(B.w + PXB_PAD * 2, B.h + PXB_PAD, S => {
            S.tx = PXB_PAD; S.ty = PXB_PAD;
            if (parts.includes('wings')) pxbWings(S, P, B, f);
            B.draw(S, P, f);
            pxbParts(S, P, B, parts);
            S.outline('#110d0b');
        });
        if (white) { const g = c.getContext('2d'); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); }
        return c;
    };
    const fr = { img: make(false), _white: null };
    Object.defineProperty(fr, 'white', { get() { return this._white || (this._white = make(true)); } });
    return (pxbCache[key] = fr);
}

// --- EL HÉROE (un muñeco que se viste con el equipo) ---
// Capa del color de la armadura (o del arma), capucha del casco, ribete y botas de las botas, y el arma con su forma.
const PXH_WEAPON = { ADVENTURER_BOW: 'bow', SNIPER: 'rifle', NECROMANCER: 'scythe', DANCER: 'twin', ASSASSIN: 'daggers' };
function pxHeroLook(u) {
    // Caos de Héroes (2026-10-13): no hay equipo dinámico, así que la pinta sale de la identidad fija de cada
    // héroe (la misma paleta de sprites.js) en vez del equipo puesto; el arma usa la misma tabla que la Torre.
    if (!u.gear) {
        const pal = (HERO_SPRITES[u.key] || [])[1] || {};
        return { cape: pal.b || '#a33a3a', hood: pal.h || pal.b || '#a33a3a', trim: pal.a || '#c9a227', glow: pal.w || '#9ad1ff',
            weapon: PXH_WEAPON[u.key] || (HERO_WEAPONS[u.key] && HERO_WEAPONS[u.key].shape) || 'fists' };
    }
    const gear = u.gear || {}, col = item => item && item.heroKey && HERO_TEMPLATES[item.heroKey] ? shade(ATTR_INFO[HERO_TEMPLATES[item.heroKey].primaryAttr].color, -0.15) : null;
    const w = gear.weapon, el = typeof weaponFx === 'function' ? ELEMENTS[weaponFx(u).el] : null;
    const cape = col(gear.armor) || col(w) || '#a33a3a';
    return { cape, hood: col(gear.helm) || cape, trim: col(gear.boots) || '#c9a227', glow: el ? el.c1 : '#9ad1ff',
        weapon: w ? PXH_WEAPON[w.heroKey] || HERO_WEAPONS[w.heroKey].shape : 'fists' };
}
// f.atk (0 o 1): el cuadro propio del golpe (pxbHeroFrame kind 'attack'), un solo cuadro por forma de arma, no
// toda una secuencia — el giro/estirón de todo el cuerpo ya lo hace attackPose() (fx.js) aparte.
function pxhWeapon(S, hx, hy, L, f) {
    const st = PXB_STEEL, wd = PXB_WOOD, gl = L.glow, atk = f.atk || 0;
    const mx = hx + atk * 2.2, my = hy - atk * 2.6; // cuerpo a cuerpo: el arma se extiende hacia adelante y arriba
    switch (L.weapon) {
        case 'sword': case 'twin':
            pxhBlade(S, mx + 1, my, atk > 0.3 ? -20 : -55, 9); // inclinada hacia adelante: no tapa la cara (ni los ojos)
            if (atk > 0.3) S.line(mx - 2, my - 9, mx + 4, my - 1, '#ffffff'); // tajo: brillo cruzando el filo
            if (L.weapon === 'twin') { S.line(3, 15 + f.bob + f.br, 1, 9 + f.bob + f.br, st[2]); S.set(3, 16 + f.bob + f.br, '#c9a227'); }
            break;
        case 'hammer': S.line(mx + 1, my + 2, mx + 1, my - 9, wd[1]); S.rect(mx + 2, my - 10, 3, 4, st[2]); S.rect(mx + 4, my - 11, 1, 6, st[3]); S.set(mx, my - 9, st[1]); break;
        case 'spear': S.line(mx + 1, my + 5, mx + 1, my - 12, wd[1]); S.tri([mx - 0.5, my - 12], [mx + 2.5, my - 12], [mx + 1, my - 16.5], st[3]); break;
        case 'bow': for (let k = -6; k <= 6; k++) S.set(hx + 2 + Math.round(2 * Math.cos(k / 6 * 1.3)), hy - 4 + k, wd[2]); S.line(hx + 2, hy - 10, hx + 2, hy + 2, '#e0d8c8'); break;
        case 'rifle': {
            const kick = atk * 1.6; // retroceso del rifle al disparar
            S.line(hx - 3 - kick, hy, hx + 7 - kick, hy - 2, st[1]); S.line(hx - 3 - kick, hy + 1, hx + 1 - kick, hy, wd[1]); S.set(hx + 7 - kick, hy - 2, st[3]);
            if (atk > 0.2) S.ball(hx + 8 - kick, hy - 2, 1.3, 1.3, ['#fff6b0', '#ffe066', '#ffd60a']); // fogonazo
            break;
        }
        case 'scythe': S.line(mx + 1, my + 5, mx + 1, my - 12, '#3a2e28'); S.line(mx + 1, my - 12, mx - 4, my - 11, st[3]); S.line(mx - 4, my - 11, mx - 6, my - 8, st[2]); break;
        case 'dagger': case 'daggers':
            S.line(mx + 1, my - 1, mx + 3, my - 4, st[3]); S.set(mx + 1, my, '#c9a227');
            if (L.weapon === 'daggers') S.line(4, 15 + f.bob + f.br, 2, 12 + f.bob + f.br, st[3]);
            break;
        case 'staff': {
            const r = 1.8 + atk * 0.9;
            S.line(hx + 1, 23, hx + 1, hy - 12, wd[1]); S.ball(hx + 1, hy - 13, r, r, [shade(gl, -0.4), shade(gl, -0.15), gl, shade(gl, 0.35), '#ffffff']); S.set(hx + 1, hy - 14, '#ffffff');
            if (atk > 0.3) { S.set(hx - 1, hy - 15, gl); S.set(hx + 3, hy - 15, gl); } // chispas al lanzar
            break;
        }
        case 'orb': {
            const r = 1.8 + atk * 0.9;
            S.rect(hx + 1, hy - 4, 1, 2, '#d8e4e8'); S.ball(hx + 1.5, hy - 1, r, r * 0.9, [shade(gl, -0.3), gl, gl, shade(gl, 0.3), '#ffffff']);
            if (atk > 0.3) { S.set(hx - 1, hy - 2, gl); S.set(hx + 4, hy - 1, gl); }
            break;
        }
        case 'crystal':
            S.tri([hx, hy - 2], [hx + 3, hy - 2], [hx + 1.5, hy - 9 - atk], '#ffd60a'); S.line(hx + 1, hy - 3, hx + 1, hy - 7 - atk, '#fff6b0');
            S.set(hx + 3, hy - 8, (atk > 0.3 || f.idle || f.walk % 2) ? '#ffffff' : '#ffd60a');
            if (atk > 0.3) S.set(hx - 1, hy - 7, '#fff6b0');
            break;
        default: S.rect(mx, my - 1, 3, 2, st[2]); S.set(mx + 2, my - 1, st[3]); // puños: guantelete
    }
}
// La hoja desde la mano: filo claro, lomo oscuro, guarda dorada cruzada y la punta que brilla
function pxhBlade(S, x, y, ang, len = 10) {
    const a = ang * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
    S.line(x + dx * 2, y + dy * 2, x + dx * len, y + dy * len, PXB_STEEL[3]);
    S.line(x + dx * 2 + px, y + dy * 2 + py, x + dx * (len - 1) + px, y + dy * (len - 1) + py, PXB_STEEL[1]);
    S.set(x + dx * (len + 1), y + dy * (len + 1), '#ffffff');
    S.line(x + dx + px * 1.5, y + dy + py * 1.5, x + dx - px * 1.5, y + dy - py * 1.5, '#c9a227');
    S.set(x - dx, y - dy, '#8a6a20');
}
// La estela del tajo: un arco de píxeles claros entre el ángulo de preparación y el del golpe (más brillante al final)
function pxhSmear(S, x, y, from, to, r = 9) {
    const n = 14;
    for (let i = 0; i <= n; i++) {
        const t = i / n, a = (from + (to - from) * t) * Math.PI / 180, col = t > 0.75 ? '#ffffff' : t > 0.4 ? '#f3e7c9' : '#b8ad94';
        S.set(x + Math.cos(a) * r, y + Math.sin(a) * r, col);
        if (t > 0.4) S.set(x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r - 1), col);
    }
}
// El dibujo del héroe por poses (pxhPose, pxbHeroFrame, pxhPick) está en towerPixelHero.js.
// Retrato de la barra del héroe: busto en pixel art
const pxhPortraitCache = {};
function pixelPortrait(u) {
    const L = pxHeroLook(u), key = JSON.stringify(L);
    if (pxhPortraitCache[key]) return pxhPortraitCache[key];
    const fr = pxbHeroFrame(L, 'idle', 0).img, c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#2b2420'; g.fillRect(0, 0, 64, 64);
    const R = PXH_RES; g.drawImage(fr, Math.round((PXB_PAD + 1) * R), Math.round((PXB_PAD - 2) * R), Math.round(16 * R), Math.round(16 * R), 0, 0, 64, 64); // con la resolución del héroe (towerPixelHero.js)
    return (pxhPortraitCache[key] = c.toDataURL());
}

// Qué cuerpo de pixel art usa una unidad (null: sigue en el sprite estático)
// Custom Hero Chaos (2026-10-13): con el pixel art prendido, sus creeps y jefes también usan estos cuerpos. Jefes de
// ronda → el cuerpo que más se parece. Los héroes (2026-10-14) usan el mismo muñeco animado que la Torre, vestido con
// la pinta fija de cada héroe en vez del equipo (pxHeroLook).
const PXB_ROUND_BOSS = { GOLEM: 'golem', HIVE_QUEEN: 'boss:desert', FROST_DRAGON: 'boss:snow', ABYSS_LORD: 'boss:volcano', HYDRA: 'lizard', LICH: 'boss:swamp', BLOOD_TITAN: 'brute', PHANTOM: 'phantom' };
function pixelBodyFor(u) {
    if (typeof pixelEnabled === 'undefined' || !pixelEnabled || !u) return null;
    if (gameMode !== 'tower') {
        if (u.isHero) return 'hero';
        if (!u.type) return null;
        if (u.isRoundBoss || u.isBoss) { const b = PXB_ROUND_BOSS[u.type.key]; if (b) return b; }
        const plan = inkPlanFor(u);
        return PXB[plan] ? plan : null;
    }
    if (pixelOn() && u.isHero) return 'hero';
    if (!pixelOn() || u.isHero || !u.type) return null;
    if (u.isGuardian) return u.type.biomeBoss && PXB['boss:' + u.type.biomeBoss] ? 'boss:' + u.type.biomeBoss : null; // el jefe del bioma
    // Jefes de cueva y guardianes de cofres malditos: el cuerpo de su criatura, más grande (pxbScale)
    const plan = inkPlanFor(u);
    return PXB[plan] ? plan : null;
}
const PXH_SCALE = 1; // el héroe: misma grilla de píxeles que el mundo (su dibujo ya tiene más resolución, towerPixelHero.js)
function pxbScale(u) {
    if (u.isHero && gameMode === 'tower') return PXG.scale * PXH_SCALE;
    if (u.isRoundBoss) return PXG.scale * (String(pixelBodyFor(u)).startsWith('boss:') ? 1.15 : 1.6); // jefes de ronda de Custom Hero Chaos
    return PXG.scale * (u.isGuardian ? 1.35 : ((u.type && u.type.scale) || 1) * (u.isCaveBoss ? 1.6 : u.isBoss ? 1.3 : 1));
}
// Altura de la figura por encima del centro de la casilla (para la barra de vida)
function pixelHalfHeight(u) { const B = PXB[pixelBodyFor(u)]; return B.h * pxbScale(u) - TILE * 0.45 + 2; }

// Dibuja una criatura en pixel art. Devuelve false si no tiene cuerpo de pixel (y se dibuja en tinta).
function drawPixelUnit(u, cx, cy, facing, flash, pose) {
    const body = pixelBodyFor(u);
    if (!body) return false;
    const moving = Math.hypot(u.x - (u.rx ?? u.x), u.y - (u.ry ?? u.y)) > 0.04 || body === 'wraith' || body === 'phantom' || body === 'swarm';
    let kind = 'idle', k;
    if (moving) kind = 'walk', k = Math.floor(((fxClock / (2 * Math.max(0.12, unitStepTime(u))) + (u.bobSeed || 0)) % 1) * 4);
    else k = Math.floor(((fxClock * 1.4 + (u.bobSeed || 0)) % 1) * 2);
    // Golpe de arma visible (2026-10-14): en el instante del golpe (ni al arrancar ni al terminar la animación
    // de ataque) el héroe pasa a su cuadro de ataque, donde el arma se extiende o brilla según su forma
    // (pxhWeapon) — aparte del giro/estirón de todo el cuerpo que ya hace attackPose() (fx.js).
    let dir = 'side';
    if (body === 'hero') { ({ kind, k } = pxhPick(u, moving)); dir = kind === 'death' ? 'side' : pxhDir(u, moving); } // el héroe: su cuadro y para dónde mira (towerPixelHero.js)
    const fr = body === 'hero' ? pxbHeroFrame(pxHeroLook(u), kind, k, dir) : pxbFrame(body, u.color, (u.type.parts || []), kind, k), img = flash ? fr.white : fr.img, s = pxbScale(u);
    if (body === 'hero' && gameMode === 'tower') pxhDrawGhosts(pxhFeel(u, kind, moving, cx, cy, fr, s, facing < 0 && dir === 'side')); // polvo y estelas (towerPixelHero.js)
    else u.pxLast = { fr, s, flip: facing < 0 }; // su último dibujo: con él se hace la caída al morir (fx.js)
    ctx.save();
    const q = PXG.scale * (body === 'hero' ? 1 : 0) || 0; // el héroe, alineado a la grilla de píxeles del mundo
    ctx.translate(q ? Math.round(cx / q) * q : cx, q ? Math.round((cy + TILE * 0.45) / q) * q : cy + TILE * 0.45);
    if (pose && body !== 'hero') { ctx.rotate(pose.rot * (facing < 0 ? -1 : 1)); ctx.scale(pose.sx, pose.sy); } // el héroe no se estira ni gira: sus cuadros ya tienen la pose (estirar el pixel art lo ensucia)
    if (facing < 0 && dir === 'side') ctx.scale(-1, 1); // de frente o de espaldas no se espeja (la espada queda en su mano)
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, -Math.round(img.width / 2) * s, -img.height * s, img.width * s, img.height * s); // a píxel entero del dibujo
    ctx.restore();
    return true;
}

// Vista de todos los cuerpos con sus cuadros, colores y partes (index.html?demo=pixelbeasts)
if (location.search.includes('demo=pixelbeasts')) setTimeout(() => {
    const c = document.createElement('canvas'); c.width = 1400; c.height = 900;
    c.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#33522d;image-rendering:pixelated';
    document.body.appendChild(c);
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const colors = ['#8d8d8d', '#8b5e3c', '#6a994e', '#c08552', '#90caf9', '#9d0208', '#3d3b40'], partsSets = [[], ['horns'], ['wings', 'eyes'], ['spikes', 'spots']];
    const grounds = ['#33522d', '#b68d55', '#c3d0dc', '#2d2523'];
    Object.keys(PXB).forEach((body, i) => {
        const col = i % 2 ? 0 : 1, row = Math.floor(i / 2), x0 = col * 700, y0 = row * 110;
        g.fillStyle = grounds[(row + col) % 4]; g.fillRect(x0, y0, 700, 110);
        g.fillStyle = '#fff'; g.font = '12px monospace'; g.fillText(body, x0 + 6, y0 + 14);
        ['walk', 'walk', 'walk', 'walk', 'idle', 'idle'].forEach((kind, j) => {
            const k = kind === 'walk' ? j : j - 4, fr = pxbFrame(body, colors[(i + j) % colors.length], partsSets[j % 4], kind, k).img;
            g.drawImage(fr, x0 + 70 + j * 105, y0 + 104 - fr.height * 3, fr.width * 3, fr.height * 3);
        });
    });
}, 300);
