// El caballero (2026-10-17, pedido: "copiar los movimientos de este set con una estética propia"): un personaje nuestro
// —yelmo con visera y penacho, capa azul, el muñeco por poses de towerPixelHero.js— con TODAS las animaciones del pack
// FreeKnight (aamatniekss), que el usuario bajó y solo usamos de referencia: no se copió ningún píxel, solo la cantidad de
// cuadros de cada movimiento y por dónde pasan el cuerpo y la espada. Se midió cada cuadro del pack (alto del cuerpo,
// inclinación de la cabeza, ángulo de la espada) y se pasó a poses: su caballero mide 37 px y el nuestro 20, así que los
// corrimientos van ×0,54 (agachado: 37 → 26 px = 6 de los nuestros; deslizándose: 17 px = 9).
// Cada animación es una lista de poses (pxhP) que se guarda en PXH_ANIM como 'cab:<nombre>' y se dibuja con pxbHeroFrame.
const CABALLERO_LOOK = { cape: '#2f4a7a', hood: '#9aa2ab', trim: '#c9a227', glow: '#9ad1ff', weapon: 'sword', helm: '#c0392b' };

const CABALLERO_ANIMS = (() => {
    const P = pxhP, low = 6; // agachado: 6 píxeles más abajo
    const run = (n, o = {}) => Array.from({ length: n }, (_, k) => { // correr: como pxhRun, en n cuadros, la espada se mece con el brazo
        const p = k / n * Math.PI * 2, s = Math.sin(p);
        return P({ lean: 2, by: (o.by || 0) + (Math.cos(p * 2) > 0.3 ? 0 : -1), ff: [10 + (o.step || 3) * s, 22 - Math.max(0, 1.6 * Math.cos(p))], rf: [7 - (o.step || 3) * s, 22 - Math.max(0, -1.6 * Math.cos(p))],
            fh: [0.5 - 2.5 * s, 4], rh: [-1.5 + 2 * s, 4], blade: (o.blade || 100) - 40 * s, sway: s > 0 ? 1 : 0, lift: o.lift ?? 0.7 + 0.3 * Math.abs(s) });
    });
    const attack = [ // tajo de arriba hacia adelante: 4 cuadros (preparación, golpe, sostiene, vuelve)
        P({ lean: -1, rf: [5.5, 22], ff: [12, 22], fh: [-2, -4], rh: [-2, 2], blade: -150, sway: 1 }),
        P({ lean: 2, bx: 2, rf: [5.5, 22], ff: [13, 22], fh: [4, 0], rh: [-1, 3], blade: 10, smear: [-150, 10], glint: true }),
        P({ lean: 2, bx: 2, rf: [5.5, 22], ff: [13, 22], fh: [4, 1], blade: 15, sway: 2 }),
        P({ lean: 1, bx: 1.5, rf: [6, 22], ff: [12.5, 22], fh: [3, 3], blade: 30, sway: 1 })];
    const attack2 = [ // barrido: se carga atrás 2 cuadros, cruza de atrás hacia adelante y la hoja termina baja, atrás
        P({ lean: 0.5, bx: 1, rf: [5.5, 22], ff: [12.5, 22], fh: [-3, -3], blade: -155, sway: 1 }),
        P({ lean: 0.3, bx: 1, rf: [5.5, 22], ff: [12.5, 22], fh: [-3.5, -2.5], blade: -160, sway: 1 }),
        P({ lean: 1.5, bx: 1, rf: [5.5, 22], ff: [12.5, 22], fh: [4, -1], blade: -6, smear: [-160, -6], glint: true }),
        P({ lean: 0.5, bx: 0.5, rf: [5.5, 22], ff: [12.5, 22], fh: [-2, 3], blade: 155, smear: [-6, 155], sway: 2 }),
        P({ lean: 0.3, bx: 0.5, rf: [6, 22], ff: [12, 22], fh: [-2, 3.5], blade: 152, sway: 1 }),
        P({ lean: 0.2, rf: [6, 22], ff: [11.5, 22], fh: [-1.5, 4], blade: 150 })];
    const crouch = (o = {}) => P(Object.assign({ by: low, lean: 2, rf: [5, 22], ff: [12, 22], fh: [1, 3], blade: 120 }, o));
    return {
        idle: [0, 0, 0, 0.5, 1, 1, 1, 0.5, 0, 0].map((by, k) => P({ by, sh: k >= 3 && k <= 6 ? -0.5 : 0, sway: k > 2 && k < 8 ? 1 : 0, fh: [0.5, 4.5], blade: 108 })),
        run: run(10),
        attack, attack2, combo: attack.concat(attack2),
        dash: [P({ lean: 3, by: 3, rf: [4, 22], ff: [12, 22], fh: [2, 4], blade: 70, lift: 1, sway: 2 }), P({ lean: 3, by: 3, rf: [4, 22], ff: [12, 22], fh: [2, 4], blade: 70, lift: 1, sway: 1 })],
        roll: [P({ by: 2, lean: 2, fh: [1, 3], blade: 114 })]
            .concat([0.3, 0.7, 1.1, 1.5, 1.9, 2.3, 2.7, 3.1, 3.45].map((r, i) => P({ roll: r, ry: i < 2 ? -1 : 0 })))
            .concat([crouch({ by: 4, lean: 1, blade: 55 }), P({ by: 1, lean: 1, fh: [1, 4], blade: 63 })]),
        hit: [P({ lean: -2.5, bx: -1, hd: [-1, -0.5], rf: [5.5, 22], ff: [9.5, 22], fh: [-1, 2], rh: [-2.5, 1], blade: 70, sway: 2, hurt: true })],
        death: [
            P({ lean: -2.5, bx: -1, hd: [-1, -0.5], fh: [-1, 2], blade: 70, sway: 2, hurt: true }),
            P({ lean: -3, bx: -2, by: 1, hd: [-1.5, 0], rf: [5, 22], ff: [9, 22], fh: [-1, 3], blade: 68, sway: 2, hurt: true }),
            P({ lean: 1, bx: -2, by: 5, rf: [4, 22], ff: [10, 22], fh: [2, 5], blade: 33, dim: true }),
            P({ lean: 2, bx: -2, by: 6, rf: [4, 22], ff: [10, 22], fh: [3, 5], hd: [1, 1], blade: 23, dim: true }),
            P({ lie: 0.3, dim: true }), P({ lie: 0.5, dim: true }), P({ lie: 0.6, dim: true }), P({ lie: 0.8, dim: true }),
            P({ lie: 1, dim: true }), P({ lie: 1, dim: true, closed: true })],
        jump: [0, 1, 0].map(s => P({ by: -4, rf: [6.5, 19], ff: [11, 18], fh: [1, -3], blade: -86, lift: 1, sway: s })),
        jumpFall: [P({ by: -3, rf: [7, 20], ff: [10.5, 20], fh: [1, 1], blade: 84, lift: 1 }), P({ by: -2, rf: [7, 20.5], ff: [10.5, 21], fh: [1.5, 2], blade: 74, lift: 1, sway: 1 })],
        fall: [0, 1, 2].map(s => P({ by: -2, rf: [7, 21], ff: [10, 21.5], fh: [1.5, 2], blade: 78, lift: 1, sway: s })),
        crouch: [crouch()],
        crouchTransition: [crouch({ by: 4, lean: 1.5 })],
        crouchAttack: [
            crouch({ by: 5, lean: 1, fh: [-3, -2], blade: -158 }),
            crouch({ lean: 2.5, bx: 1, fh: [5, 1], blade: -2, smear: [-158, -2], glint: true }),
            crouch({ lean: 1, fh: [-2, 3], blade: 167, smear: [-2, 167], sway: 2 }),
            crouch({ lean: 1, fh: [-2, 3.5], blade: 169, sway: 1 })],
        crouchWalk: run(8, { by: low, step: 2, blade: 92, lift: 0.3 }),
        slide: [0, 1].map(s => P({ by: 7, lean: -2.5, hd: [-1, 0], rf: [8, 22], ff: [14, 22], fh: [3, 4], blade: 22, lift: 1, sway: s })),
        slideStart: [P({ by: 5, lean: -2, hd: [-1, 0], rf: [7, 22], ff: [13, 22], fh: [3, 4], blade: 29, lift: 1 })],
        slideEnd: [P({ by: 4, lean: 0, rf: [6.5, 22], ff: [11, 22], fh: [2, 4], blade: 46 })],
        turnAround: [P({ lean: -1, fh: [0, 4], blade: 85 }), P({ face: 'down', blade: 84 }), P({ lean: -0.5, hd: [-1, 0], fh: [0, 4], blade: 85 })],
        wallSlide: [0, 1, 2].map(s => P({ by: -2, lean: 1, rf: [7, 20.5], ff: [11, 20], fh: [3, -8], rh: [2, -6], blade: -80, lift: 0.5, sway: s % 2 })),
        wallHang: [P({ by: -3, rf: [8, 19], ff: [11, 19], fh: [3, -9], rh: [2, -9], two: false, blade: -86, lift: 0.4 })],
        wallClimb: [
            P({ by: -3, rf: [8, 19], ff: [11, 19], fh: [3, -9], rh: [2, -9], blade: -86 }),
            P({ by: -5, rf: [8, 18], ff: [11, 18], fh: [2, -3], rh: [1, -3], blade: 100 }),
            P({ by: -6, lean: 1, rf: [8, 17], ff: [11, 15], fh: [3, -2], blade: -50 }),
            P({ by: -6, lean: 3, rf: [7, 18], ff: [12, 16], fh: [2, 2], blade: 150 }),
            P({ by: -4, lean: 2, rf: [6, 20], ff: [12, 20], fh: [2, 3], blade: 139 }),
            P({ by: -2, lean: 1, rf: [6, 22], ff: [11.5, 22], fh: [1, 4], blade: 126 }),
            P({ fh: [0.5, 4], blade: -83 })]
    };
})();
// Nombres para la galería, en el orden del pack
const CABALLERO_NAMES = { idle: 'quieto', run: 'correr', attack: 'tajo', attack2: 'barrido', combo: 'combo (tajo + barrido)', dash: 'impulso',
    roll: 'rodar', hit: 'golpe recibido', death: 'muerte', jump: 'salto', jumpFall: 'salto → caída', fall: 'caída', crouch: 'agachado',
    crouchTransition: 'agacharse', crouchAttack: 'tajo agachado', crouchWalk: 'caminar agachado', slide: 'deslizarse', slideStart: 'empieza a deslizarse',
    slideEnd: 'termina de deslizarse', turnAround: 'darse vuelta', wallSlide: 'resbalar por la pared', wallHang: 'colgado', wallClimb: 'trepar' };
Object.entries(CABALLERO_ANIMS).forEach(([k, v]) => { PXH_ANIM['cab:' + k] = v; });
