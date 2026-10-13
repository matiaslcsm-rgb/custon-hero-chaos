// El héroe en pixel art, animado por POSES (2026-10-14, pedido: "mejorar todavía más la animación, como un personaje de
// Hades, con un cuadro distinto para cada movimiento"). Referencia: Hades (anticipación → golpe → recuperación en cada
// tajo, la capa que acompaña, el cuerpo inclinado al correr) y Dead Cells (animación 3D pasada a píxeles).
//
//   En vez de dibujar cada cuadro a mano, cada movimiento es una lista de POSES CLAVE (dónde va el cuerpo, los pies, las
//   manos, el ángulo de la espada, la capa, la cabeza) y el código arma los cuadros: un solo dibujo (pxhDraw) que lee la
//   pose. Mirando a la derecha (a la izquierda se espeja). Coordenadas en píxeles del muñeco de 18×24 (los pies en y 22).
//     quieto · 4 cuadros: respira (suben los hombros, baja el cuerpo, se mece la capa) y parpadea cada tanto
//     correr · 8 cuadros: inclinado, brazos y piernas cruzados, la capa flamea
//     combo de la espada · 6 cuadros por tajo: preparación → golpe con estela → seguimiento → vuelta a la guardia
//       1) de arriba hacia adelante, 2) revés de abajo hacia arriba, 3) remate a dos manos con salto, golpe al piso y chispas
//     esquive · 4 cuadros: se agacha, rueda y se levanta
//     golpe recibido · 2 cuadros: la cabeza y el cuerpo van para atrás
//     muerte · 5 cuadros: se tambalea, cae de rodillas y queda tendido (hasta que renace)
//   Las otras armas (arco, bastón, rifle…) usan el mismo cuerpo y su dibujo de arma de siempre (pxhWeapon).

// --- POSES ---
// bx, by: corrimiento de todo el cuerpo (by > 0 = agachado) · lean: hombros adelante de la cadera · rf/ff: pie de atrás y
// de adelante · rh/fh: mano de atrás y de adelante, desde su hombro · blade: ángulo de la espada en grados (0 adelante,
// −90 arriba, 90 abajo) · cape: cuánto se mece / flamea · hd: corrimiento de la cabeza · two: las dos manos en la espada
// smear: estela [desde, hasta] · impact: chispas en la punta · roll: rodando (0-1) · lie: tendido (0-1)
const PXH_REST = { bx: 0, by: 0, lean: 0, rf: [6.5, 22], ff: [10.5, 22], rh: [-1.5, 4.5], fh: [0.5, 4.5], blade: -55, sway: 0, lift: 0, hd: [0, 0] };
const pxhP = o => Object.assign({}, PXH_REST, o);
const PXH_ANIM = {
    idle: [pxhP({}), pxhP({ by: 0, sh: -1, sway: 1 }), pxhP({ by: 1, sway: 1, blade: -52 }), pxhP({ by: 1, blade: -52 })],
    // correr: se arma con una fórmula (pxhRun) en vez de poses fijas
    swing0: [
        pxhP({ lean: -1, rf: [5.5, 22], ff: [11.5, 22], fh: [-2, -4], rh: [-2, 2], blade: -130, sway: 1 }),
        pxhP({ lean: 0, rf: [5.5, 22], ff: [12, 22], fh: [2, -2], rh: [-1, 3], blade: -40, smear: [-130, -40] }),
        pxhP({ lean: 1, bx: 1, rf: [5.5, 22], ff: [12.5, 22], fh: [4, 1], rh: [-1, 4], blade: 30, smear: [-130, 30], glint: true }),
        pxhP({ lean: 1.5, bx: 1, rf: [5.5, 22], ff: [12.5, 22], fh: [3, 2.5], rh: [-1.5, 4], blade: 60, sway: 2 }),
        pxhP({ lean: 0.5, bx: 0.5, rf: [6, 22], ff: [11.5, 22], fh: [1.5, 3.5], blade: 15, sway: 1 }),
        pxhP({ fh: [0.5, 4], blade: -30 })
    ],
    swing1: [
        pxhP({ lean: -1, by: 1, rf: [6, 22], ff: [11.5, 22], fh: [-1, 3], rh: [-2, 3], blade: 160, sway: 1 }),
        pxhP({ lean: 0, by: 0.5, rf: [6, 22], ff: [12, 22], fh: [2, 2], blade: 70, smear: [160, 70] }),
        pxhP({ lean: 1, bx: 1, rf: [6, 22], ff: [12.5, 22], fh: [4, -3], rh: [-1, 2], blade: -45, smear: [160, -45], glint: true }),
        pxhP({ lean: 1, bx: 1, rf: [6, 22], ff: [12.5, 22], fh: [3, -4.5], rh: [-1.5, 3], blade: -80, sway: 2 }),
        pxhP({ lean: 0.5, fh: [1.5, -1], blade: -50, sway: 1 }),
        pxhP({ fh: [0.5, 3], blade: -45 })
    ],
    swing2: [ // el remate: arriba a dos manos, salto, golpe al piso
        pxhP({ lean: -1.5, by: -1, rf: [6, 21], ff: [11, 21], fh: [-2, -10.5], rh: [0, -10], two: true, blade: -95, sway: 2 }), // las manos arriba y atrás de la capucha: la cara se sigue viendo
        pxhP({ lean: -1, by: -2, rf: [6.5, 20], ff: [11, 20], fh: [-2.5, -11], rh: [-0.5, -10.5], two: true, blade: -115, lift: 0.6 }),
        pxhP({ lean: 1, bx: 1, by: 0, rf: [5.5, 22], ff: [13, 22], fh: [3, -2], rh: [2, -1.5], two: true, blade: -10, smear: [-110, -10], glint: true }),
        pxhP({ lean: 2, bx: 1.5, by: 2, rf: [5, 22], ff: [13.5, 22], fh: [4, 2], rh: [3, 2.5], two: true, blade: 45, smear: [-110, 45], impact: true, sway: 2 }),
        pxhP({ lean: 2, bx: 1.5, by: 2, rf: [5, 22], ff: [13.5, 22], fh: [4, 2.5], rh: [3, 3], two: true, blade: 50, sway: 1 }),
        pxhP({ lean: 1, bx: 0.5, by: 1, rf: [6, 22], ff: [12, 22], fh: [2, 3.5], blade: 25 })
    ],
    attack: [pxhP({ lean: 0.5, bx: 0.5, fh: [2, 0], atk: 1 })], // las otras armas: el brazo al frente (pxhWeapon dibuja el disparo o el golpe)
    dash: [
        pxhP({ lean: 2, by: 2, rf: [5, 22], ff: [12, 22], fh: [2, 2], blade: 10, lift: 0.6 }),
        pxhP({ roll: 0 }), pxhP({ roll: 1 }),
        pxhP({ lean: 1, by: 1, rf: [5.5, 22], ff: [11.5, 22], fh: [1, 3], blade: -20, lift: 1 })
    ],
    hurt: [
        pxhP({ lean: -2, bx: -1, hd: [-1, -0.5], rf: [5.5, 22], ff: [9.5, 22], fh: [-0.5, 2], rh: [-2.5, 1], blade: -110, sway: 2, hurt: true }),
        pxhP({ lean: -1, bx: -0.5, hd: [-0.5, 0], fh: [0, 3.5], blade: -80, sway: 1 })
    ],
    death: [
        pxhP({ lean: -2, bx: -1, hd: [-1, -0.5], fh: [-1, 2], blade: -120, sway: 2, hurt: true }),
        pxhP({ lean: 1, by: 3, rf: [5, 22], ff: [11, 22], fh: [2, 5], blade: 70, dim: true }),
        pxhP({ lean: 2, by: 5, rf: [5, 22], ff: [11, 22], fh: [3, 5], hd: [1, 1], blade: 80, dim: true }),
        pxhP({ lie: 0.5, dim: true }), pxhP({ lie: 1, dim: true, closed: true })
    ]
};
// Correr: 8 cuadros en un ciclo de dos pasos (los pies van y vienen, el cuerpo rebota, los brazos al revés que las piernas)
function pxhRun(k) {
    const p = k / 8 * Math.PI * 2, s = Math.sin(p);
    return pxhP({ lean: 1.5, by: Math.cos(p * 2) > 0.3 ? 0 : -1,
        ff: [10 + 3 * s, 22 - Math.max(0, 1.6 * Math.cos(p))], rf: [7 - 3 * s, 22 - Math.max(0, -1.6 * Math.cos(p))],
        fh: [0.5 - 2 * s, 4], rh: [-1.5 + 2 * s, 4], blade: -35 - 8 * s, sway: s > 0 ? 1 : 0, lift: 0.7 + 0.3 * Math.abs(s) });
}

// --- DIBUJO DE UNA POSE ---
// Pierna en dos tramos (la rodilla se dobla hacia adelante)
function pxhLeg(S, hx, hy, fx, fy, col, boot) {
    const kx = (hx + fx) / 2 + 1, ky = (hy + fy) / 2;
    S.line(hx, hy, kx, ky, col, 2); S.line(kx, ky, fx, fy - 1, col, 2);
    S.rect(Math.round(fx), Math.round(fy) - 1, 2, 2, boot);
}
function pxhPose(S, L, f) {
    const P = f.pose;
    const C = pxbPalette(L.cape), H = pxbPalette(L.hood), T = pxbPalette(L.trim), cloth = ['#4f473c', '#665c4d', '#7f735f', '#978a72', '#ada087'];
    const legs = ['#231d1a', '#352d29', '#4a403a'], st = PXB_STEEL;
    const eyeOn = !(f.blink || P.closed), eye = eyeOn ? (P.dim ? '#8a1a14' : '#ff2a1f') : '#2a0806', eye2 = eyeOn ? (P.dim ? '#6a120e' : '#e0180e') : '#2a0806';
    if (P.lie !== undefined && P.lie > 0) { pxhLying(S, L, P, C, H, T, cloth, eye, eye2); return; }
    if (P.roll !== undefined) { pxhRoll(S, L, P, C, H, T, eye); return; }
    if (f.dir === 'down' || f.dir === 'up') { pxhPoseFacing(S, L, f, P, f.dir === 'down' ? 1 : -1, C, H, T, cloth, eye, eye2); return; }
    const bx = P.bx, by = P.by, lean = P.lean;
    const shX = 8.5 + bx + lean, shY = 9.5 + by + (P.sh || 0), hipX = 8.5 + bx, hipY = 15.5 + by;
    pxbShadow(S, 8.5 + bx * 0.5, 23, 5.5);
    // Capa (atrás): baja desde los hombros; se mece y, corriendo o saltando, flamea hacia atrás
    const top = shY - 1, bottom = 21 - P.lift * 4;
    for (let y = Math.floor(top); y <= bottom; y++) {
        const d = y - top, left = shX - 3 - d * (0.32 + P.lift * 0.45) - (y > hipY ? P.sway : 0), right = shX - 0.5 - d * 0.15 + (y > hipY ? 1 : 0);
        for (let x = Math.round(left); x <= Math.round(right); x++) S.set(x, y, C[x === Math.round(left) ? 0 : x < left + 2 ? 1 : 2]);
    }
    // Pierna de atrás, brazo de atrás
    pxhLeg(S, hipX - 1.5, hipY + 0.5, P.rf[0] + bx * 0.3, P.rf[1], legs[0], T[1]);
    const rsx = shX - 2.5, rsy = shY + 1;
    if (!P.two) { const hx = rsx + P.rh[0], hy = rsy + P.rh[1]; S.line(rsx, rsy, hx, hy, st[1], 2); S.set(hx, hy, st[0]); S.set(hx + 1, hy, st[0]); }
    // Torso (se inclina con lean), tabardo, cinturón; esclavina sobre los hombros
    for (let y = 0; y <= 6; y++) { const t = y / 6, cx = shX + (hipX - shX) * t; for (let x = -3; x <= 3; x++) S.set(cx + x, shY + 0.5 + y, cloth[x < -1 ? 1 : x > 1 ? 3 : 2]); }
    S.line(shX - 0.5, shY + 1, hipX - 0.5, hipY - 0.5, T[2], 2); S.line(shX - 0.5, shY + 1, hipX - 0.5, hipY - 0.5, T[3]);
    S.rect(Math.round(hipX - 3.5), Math.round(hipY - 0.5), 8, 1, '#3a2a1c'); S.set(hipX + 0.5, hipY - 0.5, '#e0b84a');
    S.rect(Math.round(shX - 3.5), Math.round(shY - 1), 7, 3, C[2]); S.rect(Math.round(shX - 3.5), Math.round(shY - 1), 7, 1, C[3]); S.set(shX + 2.5, shY + 1, C[1]); S.set(shX - 3.5, shY + 1, C[1]);
    // Pierna de adelante
    pxhLeg(S, hipX + 1, hipY + 0.5, P.ff[0] + bx * 0.3, P.ff[1], legs[1], T[2]);
    // Brazo de adelante con la espada: con las dos manos arriba va DETRÁS de la cabeza (si no, tapa la cara)
    const fsx = shX + 2, fsy = shY + 1, mx = fsx + P.fh[0], my = fsy + P.fh[1];
    const sword = L.weapon === 'sword' || L.weapon === 'twin', overhead = sword && P.two && P.fh[1] < -6;
    const swordArm = () => {
        if (P.smear) pxhSmear(S, mx, my, P.smear[0], P.smear[1], P.impact ? 10 : 9);
        if (P.two) S.line(rsx, rsy, mx - 1, my + 0.5, st[1], 2); // la otra mano también agarra
        S.line(fsx, fsy, mx, my, st[2], 2); S.set(fsx, fsy, st[3]);
        pxhBlade(S, mx, my, P.blade, P.two ? 11 : 10);
        S.rect(Math.round(mx), Math.round(my), 2, 1, st[1]);
        if (P.impact) { const a = P.blade * Math.PI / 180;[[1, 0], [0, 1], [-1, 1], [2, 1], [0, -1]].forEach(([ox, oy], i) => S.set(mx + Math.cos(a) * 12 + ox, my + Math.sin(a) * 12 + oy, i % 2 ? '#ffd166' : '#ffffff')); }
        if (L.weapon === 'twin' && !P.two) pxhBlade(S, rsx + P.rh[0], rsy + P.rh[1], P.blade + 40, 7);
    };
    if (overhead) swordArm();
    // Capucha, la cara en sombra y los dos ojos rojos (se encienden en el golpe)
    const hx = shX + P.hd[0], hy = shY - 4 + P.hd[1];
    S.ball(hx, hy, 3.5, 3.4, H); S.set(hx - 3.5, hy - 2, H[1]); S.set(hx - 4.5, hy - 1 + (P.lift > 0.5 ? 1 : 0), H[1]);
    S.ball(hx + 1.7, hy + 0.6, 1.9, 1.8, ['#0c0a09', '#15110f', '#1d1815', '#241e1a', '#2b2420']);
    S.set(hx + 1.5, hy + 0.4, eye2); S.set(hx + 3.5, hy + 0.4, eye);
    if (eyeOn && (P.glint || P.impact)) { S.set(hx + 1.5, hy - 0.6, '#ff6a50'); S.set(hx + 3.5, hy - 0.6, '#ff6a50'); }
    if (P.hurt) S.set(hx + 2.5, hy + 1.5, '#ff2a1f');
    // Brazo de adelante y el arma
    if (sword) { if (!overhead) swordArm(); }
    else {
        S.line(fsx, fsy, mx, my, st[2], 2); S.set(fsx, fsy, st[3]);
        pxhWeapon(S, Math.round(mx), Math.round(my) + 1, L, { atk: P.atk || 0, bob: by, br: 0, walk: -1, idle: f.idle || 0 });
        S.rect(Math.round(mx), Math.round(my) + 1, 2, 1, st[1]);
    }
}
// --- DE FRENTE Y DE ESPALDA (2026-10-14, pedido: "mirar hacia arriba y hacia abajo", como en Hades) ---
// Las mismas poses de costado, vistas desde adelante (mira hacia abajo, a la cámara) o desde atrás (mira hacia arriba).
// "Adelante" de la pose pasa a ser hacia la cámara (un poco hacia abajo en pantalla) o hacia el fondo (hacia arriba):
// se acorta (escorzo) y la espada abre un poco hacia afuera, así los tajos se leen igual. side: +1 de frente, −1 de espaldas.
function pxhProject(fwd, up, side) { return [-0.4 * fwd * side, up + 0.8 * fwd * side]; } // [x, y] en pantalla
function pxhPoseFacing(S, L, f, P, side, C, H, T, cloth, eye, eye2) {
    const legs = ['#231d1a', '#352d29', '#4a403a'], st = PXB_STEEL, cx = 8.5 + P.bx * 0.3;
    const by = P.by, shY = 9.5 + by + (P.sh || 0), hipY = 15.5 + by, eyeOn = eye !== '#2a0806';
    const sword = L.weapon === 'sword' || L.weapon === 'twin';
    pxbShadow(S, cx, 23, 5.5);
    // el brazo del arma: de frente queda a la izquierda de la pantalla (es la derecha del héroe), de espaldas a la derecha
    const ws = side > 0 ? -1 : 1, wsx = cx + ws * 3.5, wsy = shY + 1, osx = cx - ws * 3.5;
    const [hfx, hfy] = pxhProject(P.fh[0], P.fh[1], side), mx = wsx + ws * 0.5 + hfx, my = wsy + hfy;
    const a = P.blade * Math.PI / 180, [bdx, bdy] = pxhProject(Math.cos(a), Math.sin(a), side);
    const bl = Math.max(4, 10 * Math.hypot(bdx, bdy)), bladeAng = Math.atan2(bdy, bdx) * 180 / Math.PI; // la hoja en escorzo
    const drawWeapon = () => {
        if (!sword) { S.line(wsx, wsy, mx, my, st[2], 2); pxhWeapon(S, Math.round(mx) - 1, Math.round(my) + 1, L, { atk: P.atk || 0, bob: by, br: 0, walk: -1, idle: f.idle || 0 }); return; }
        if (P.smear) { const s0 = P.smear[0] * Math.PI / 180, s1 = P.smear[1] * Math.PI / 180, p0 = pxhProject(Math.cos(s0), Math.sin(s0), side), p1 = pxhProject(Math.cos(s1), Math.sin(s1), side);
            pxhSmear(S, mx, my, Math.atan2(p0[1], p0[0]) * 180 / Math.PI, Math.atan2(p1[1], p1[0]) * 180 / Math.PI, P.impact ? 9 : 8); }
        if (P.two) S.line(osx, wsy, mx, my + 0.5, st[1], 2);
        S.line(wsx, wsy, mx, my, st[2], 2);
        pxhBlade(S, mx, my, bladeAng, bl);
        S.rect(Math.round(mx), Math.round(my), 2, 1, st[1]);
        if (P.impact) [[1, 0], [0, 1], [-1, 1], [2, 1]].forEach(([ox, oy], i) => S.set(mx + Math.cos(bladeAng * Math.PI / 180) * bl + ox, my + Math.sin(bladeAng * Math.PI / 180) * bl + oy, i % 2 ? '#ffd166' : '#ffffff'));
    };
    // ¿la hoja va por detrás del cuerpo? (de espaldas, cuando apunta al fondo; de frente, cuando está arriba de la cabeza)
    const behind = side < 0 ? Math.cos(a) > 0.25 : (P.two && P.fh[1] < -6);
    if (behind) drawWeapon();
    // Capa: de frente asoma a los costados; de espaldas tapa la espalda (más abajo se mece)
    const bottom = 21 - P.lift * 3;
    if (side > 0) for (let y = Math.floor(shY); y <= bottom; y++) { const w = 4.5 + (y - shY) * 0.18; S.set(cx - w, y, C[0]); S.set(cx - w + 1, y, C[1]); S.set(cx + w, y, C[1]); S.set(cx + w - 1, y, C[2]); }
    // Piernas (al caminar, una sube y la otra baja: el pie de atrás de la pose es la pierna de la izquierda)
    const legL = Math.min(22, P.rf[1]), legR = Math.min(22, P.ff[1]);
    S.rect(Math.round(cx - 2.5), Math.round(hipY), 2, Math.round(legL - hipY), legs[0]); S.rect(Math.round(cx - 2.5), Math.round(legL) - 1, 2, 2, T[1]);
    S.rect(Math.round(cx + 0.5), Math.round(hipY), 2, Math.round(legR - hipY), legs[1]); S.rect(Math.round(cx + 0.5), Math.round(legR) - 1, 2, 2, T[2]);
    // Torso, tabardo (de frente) y cinturón
    for (let y = shY + 0.5; y <= hipY; y++) for (let x = -3; x <= 3; x++) S.set(cx + x, y, cloth[x < -1 ? 1 : x > 1 ? 3 : 2]);
    if (side > 0) { S.rect(Math.round(cx - 0.5), Math.round(shY + 1), 2, Math.round(hipY - shY), T[2]); S.rect(Math.round(cx - 0.5), Math.round(shY + 1), 1, Math.round(hipY - shY), T[3]); }
    S.rect(Math.round(cx - 3.5), Math.round(hipY - 0.5), 8, 1, '#3a2a1c'); if (side > 0) S.set(cx + 0.5, hipY - 0.5, '#e0b84a');
    if (side < 0) for (let y = Math.floor(shY); y <= bottom; y++) { // de espaldas: la capa entera, con pliegues
        const w = 3.8 + (y - shY) * 0.22, sw = y > hipY ? P.sway * 0.5 : 0;
        for (let x = Math.round(cx - w + sw); x <= Math.round(cx + w + sw); x++) S.set(x, y, C[(x + y) % 4 === 0 ? 1 : x < cx - 1 ? 2 : x > cx + 1 ? 2 : 3]);
    }
    // Esclavina sobre los hombros y el brazo libre
    S.rect(Math.round(cx - 4), Math.round(shY - 1), 9, 3, C[2]); S.rect(Math.round(cx - 4), Math.round(shY - 1), 9, 1, C[3]);
    if (!P.two) { const ohy = wsy + 4.5 - Math.abs(P.rh[0]) * 0.4; S.line(osx, wsy, osx - ws * 0.3, ohy, st[1], 2); S.rect(Math.round(osx - ws * 0.3), Math.round(ohy), 2, 1, st[0]); }
    // Capucha: de frente, la cara en sombra con los dos ojos rojos; de espaldas, la punta de la capucha
    const hx = cx + P.hd[0] * 0.3, hy = shY - 4 + P.hd[1];
    S.ball(hx, hy, 3.6, 3.4, H);
    if (side > 0) {
        S.ball(hx, hy + 0.9, 2.3, 1.9, ['#0c0a09', '#15110f', '#1d1815', '#241e1a', '#2b2420']);
        S.set(hx - 1, hy + 0.6, eye2); S.set(hx + 1, hy + 0.6, eye);
        if (eyeOn && (P.glint || P.impact)) { S.set(hx - 1, hy - 0.4, '#ff6a50'); S.set(hx + 1, hy - 0.4, '#ff6a50'); }
    } else { S.set(hx, hy - 3.5, H[3]); S.line(hx, hy - 2.5, hx, hy + 2.5, H[1]); } // la costura de atrás
    if (!behind) drawWeapon();
}
// Rodando (esquive): un ovillo de capa con la capucha que gira
function pxhRoll(S, L, P, C, H, T, eye) {
    pxbShadow(S, 9, 23, 5);
    S.ball(9, 18, 4.6, 4.2, C);
    const a = P.roll ? 0.9 : -1.4, hx = 9 + Math.cos(a) * 3.2, hy = 18 + Math.sin(a) * 3.2;
    S.ball(hx, hy, 2.8, 2.6, H); S.set(hx + 1, hy + 0.5, eye);
    S.rect(P.roll ? 5 : 11, P.roll ? 21 : 15, 2, 2, T[1]); // una bota que asoma
    S.line(9 - Math.cos(a) * 2, 18 - Math.sin(a) * 2, 9 - Math.cos(a) * 6, 18 - Math.sin(a) * 6, PXB_STEEL[3]); // la espada pegada al cuerpo
}
// Tendido (muerte): de costado en el piso, la espada al lado, los ojos que se apagan
function pxhLying(S, L, P, C, H, T, cloth, eye, eye2) {
    const half = P.lie < 1, y0 = half ? 18 : 20.5;
    pxbShadow(S, 9, 23, 7);
    for (let x = 1; x <= 14; x++) for (let y = -1.5; y <= 1.5; y++) S.set(x, y0 + y + (half ? (x - 8) * -0.35 : 0), x < 5 ? C[1] : C[2]);
    S.ball(14.5, y0 + (half ? -2.2 : -0.5), 2.8, 2.6, H); S.set(15.5, y0 + (half ? -2 : -0.3), eye2); S.set(16.5, y0 + (half ? -2 : -0.3), eye);
    S.rect(1, Math.round(y0) + 1, 3, 1, T[1]);
    S.line(4, 22.5, 14, 22.5, PXB_STEEL[3]); S.set(14, 22.5, '#c9a227');
}

// --- CUADROS (se guardan ya dibujados) ---
// kind: idle (k 0-3, +4 parpadeo) · walk (0-7) · swing (tajo × 6 + cuadro) · attack · dash (0-3) · hurt (0-1) · death (0-4)
function pxhFramePose(kind, k) {
    if (kind === 'walk') return pxhRun(k % 8);
    if (kind === 'swing') return PXH_ANIM['swing' + Math.floor(k / 6)][k % 6];
    if (kind === 'idle') return PXH_ANIM.idle[k % 4];
    return PXH_ANIM[kind][Math.min(k, PXH_ANIM[kind].length - 1)];
}
PXB.hero = { w: 18, h: 24, head: [8, 2], back: [8, 9], draw() {} };
function pxbHeroFrame(L, kind, k, dir = 'side') {
    const key = ['hero', L.cape, L.hood, L.trim, L.glow, L.weapon, kind, k, dir].join('|');
    if (pxbCache[key]) return pxbCache[key];
    const f = { pose: pxhFramePose(kind, k), blink: kind === 'idle' && k >= 4, idle: kind === 'idle' ? k % 4 : 0, dir };
    const ex = kind === 'idle' || kind === 'walk' ? 0 : 8; // los tajos, el esquive y la caída salen del cuerpo: más lienzo (sigue centrado)
    const make = white => {
        const c = pxSprite(PXB.hero.w + PXB_PAD * 2 + ex * 2, PXB.hero.h + PXB_PAD + ex, S => { S.tx = PXB_PAD + ex; S.ty = PXB_PAD + ex; pxhPose(S, L, f); S.outline('#110d0b'); });
        if (white) { const g = c.getContext('2d'); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); }
        return c;
    };
    const fr = { img: make(false), _white: null };
    Object.defineProperty(fr, 'white', { get() { return this._white || (this._white = make(true)); } });
    return (pxbCache[key] = fr);
}

// --- PARA DÓNDE MIRA: de costado, hacia abajo (de frente) o hacia arriba (de espaldas) ---
// El golpe manda (hacia donde pega), después el paso (hacia donde camina; en diagonal, de costado) y, quieto, el cursor.
function pxhDir(u, moving) {
    let dx, dy;
    const a = u.fxAttack;
    if (a && a.dx !== undefined && fxClock - a.at < 0.5) { dx = a.dx; dy = a.dy; }
    else if (moving && u.lastStepDir) { dx = u.lastStepDir.dx; dy = u.lastStepDir.dy; }
    else if (u === player && !autopilot && gameMode === 'tower' && mouse.over && typeof cursorWorld === 'function') { const c = cursorWorld(); if (!c) return u.pxDir || 'side'; dx = c.x - u.x; dy = c.y - u.y; }
    else return u.pxDir || 'side';
    return (u.pxDir = Math.abs(dy) > Math.abs(dx) * 1.3 ? (dy > 0 ? 'down' : 'up') : 'side');
}
// --- QUÉ CUADRO TOCA AHORA ---
const PXH_TIME = { dash: 0.28, hurt: 0.24, death: 1.1 };
function pxhPick(u, moving) {
    const seed = u.bobSeed || 0;
    if (!u.isAlive()) { // cayendo: 5 cuadros y queda tendido
        const t = u.diedAt !== undefined ? (gameClock - u.diedAt) / PXH_TIME.death : 1;
        return { kind: 'death', k: Math.min(4, Math.floor(t * 5)) };
    }
    const a = u.fxAttack, combo = gameMode === 'tower' && typeof swordWielder === 'function' && swordWielder(u);
    if (a && a.kind === 'dashpose') { const t = (fxClock - a.at) / PXH_TIME.dash; if (t < 1) return { kind: 'dash', k: Math.floor(t * 4) }; }
    if (a && ATTACK_ANIM[a.kind]) {
        const t = (fxClock - a.at) / ATTACK_ANIM[a.kind];
        // el tajo: el golpe ya pegó en el clic, así que la secuencia arranca en la preparación muy corta (1 de 6) y sigue
        if (combo && u.fxSwingStep !== undefined && t < 1) return { kind: 'swing', k: u.fxSwingStep * 6 + Math.min(5, Math.floor(t * 6)) };
        if (!combo && t >= 0.1 && t < 0.85) return { kind: 'attack', k: 0 };
    }
    if (u.fxHitAt !== undefined && fxClock - u.fxHitAt < PXH_TIME.hurt && !(a && fxClock - a.at < 0.3)) return { kind: 'hurt', k: fxClock - u.fxHitAt < PXH_TIME.hurt / 2 ? 0 : 1 };
    if (combo && !moving && u.attackTimer > 0 && inCombat()) { // preparando el próximo tajo (clic mantenido o automático)
        const frac = u.attackTimer * effAtkSpeed(u);
        if (frac > 0.6 && frac < 1) return { kind: 'swing', k: (u.comboStep || 0) * 6 };
    }
    if (moving) return { kind: 'walk', k: Math.floor(((fxClock / (4 * Math.max(0.12, unitStepTime(u))) + seed) % 1) * 8) }; // un ciclo cada 4 casillas
    let k = Math.floor(((fxClock / 1.6 + seed) % 1) * 4); // respira
    if ((fxClock + seed * 7) % 3.3 < 0.14) k += 4; // parpadea
    return { kind: 'idle', k };
}
