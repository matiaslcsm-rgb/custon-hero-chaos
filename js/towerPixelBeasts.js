// Tower Chaos: criaturas en pixel art (PRUEBA, 2026-10-13; va con el suelo en pixel art, towerPixel.js).
//
//   Las criaturas se generan por piezas (towerBestiary.js): rol, CUERPO, tamaño, color y PARTES. Acá cada uno de los 16
//   cuerpos es un dibujo en pixel art hecho en código, mirando a la derecha, con 4 cuadros de caminata y 2 de reposo.
//   El color sale de la criatura (5 tonos, con luz de arriba a la izquierda) y las partes (cuernos, púas, alas, ojos,
//   manchas) se enganchan en la cabeza y el lomo de cada cuerpo; así cualquier combinación sale sola.
//   Para que se lean sobre cualquier suelo: contorno oscuro, sombra en el piso y el color principal nunca muy oscuro.
//   Los jefes, los guardianes y el héroe siguen en tinta por ahora. Vista de todos: index.html?demo=pixelbeasts

const PXB_PAD = 4; // margen alrededor del cuerpo (cuernos, alas)
const PXB_BONE = '#e6dcc4', PXB_STEEL = ['#4a4f57', '#6b727c', '#9aa2ab', '#d0d6dc'], PXB_WOOD = ['#3d2a1c', '#5a3f29', '#7a5a3c'];
const PXB_SKIN = ['#7a5038', '#a06c4c', '#c48e68', '#dcae86', '#ecc8a2'];

// Pierna de un cuadrúpedo: o corre el pie (paso)
function pxbLeg(S, x, y, len, o, col) { for (let k = 0; k < len; k++) S.set(x + (k >= len - 2 ? o : 0), y + k - (o !== 0 && k === len - 1 ? 1 : 0), col); }
function pxbShadow(S, cx, cy, rx) { pxShadow(S, cx, cy, rx, Math.max(1, rx * 0.22)); }

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

// Qué cuerpo de pixel art usa una unidad (null: sigue en tinta)
function pixelBodyFor(u) {
    if (!pixelOn() || u.isHero || u.isGuardian || u.isBoss || u.isCaveBoss || !u.type) return null;
    const plan = inkPlanFor(u);
    return PXB[plan] ? plan : null;
}
function pxbScale(u) { return PXG.scale * ((u.type && u.type.scale) || 1); }
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
    const fr = pxbFrame(body, u.color, (u.type.parts || []), kind, k), img = flash ? fr.white : fr.img, s = pxbScale(u);
    ctx.save();
    ctx.translate(cx, cy + TILE * 0.45);
    if (pose) { ctx.rotate(pose.rot * (facing < 0 ? -1 : 1)); ctx.scale(pose.sx, pose.sy); }
    if (facing < 0) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, -img.width * s / 2, -img.height * s, img.width * s, img.height * s);
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
