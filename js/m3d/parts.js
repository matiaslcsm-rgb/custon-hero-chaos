// Copiado de arena-robots (https://github.com/matiaslcsm-rgb/arena-robots, src/parts.js) el 2026-10-28 para MATCH 3D.
// El robot: un esqueleto articulado (siempre el mismo) y las piezas que se le enganchan. Solo datos y cuentas (sin
// three.js), así se prueba con node.
//
// EL ESQUELETO (skeleton.js lo dibuja): pelvis → columna → pecho → cuello → cabeza; en el pecho, los hombros →
// brazo → antebrazo → mano (con dedos); en la pelvis, las caderas → muslo → canilla → pie. Cada hueso nace en su
// articulación y los de brazos y piernas cuelgan para abajo (-y).
//
// LAS PIEZAS se enganchan a los huesos. Cada forma dice a qué hueso va (b) y dónde, medido desde la articulación:
//   box: { t: 'box', s: [ancho, alto, fondo], p: [x, y, z], r?: [rx, ry, rz], m: material, b: hueso }
//   cyl: { t: 'cyl', rad, h, seg?, p, r?, m, b }
// En brazos y piernas, x positivo es "hacia afuera": el lado izquierdo y el derecho son espejo. Las piernas se ponen en
// los dos lados; cada brazo, en el suyo.
// Materiales: gris, oliva, hueso, nar, ama, carbon, metal, peligro (franjas), oruga, lente (brilla), hierro, junta, cobre.

export const SLOTS = ['legs', 'core', 'head', 'armL', 'armR'];
export const SLOT_NAMES = { legs: 'Piernas', core: 'Núcleo', head: 'Cabeza', armL: 'Brazo izq.', armR: 'Brazo der.' };
export const BONES = ['pelvis', 'spine', 'chest', 'neck', 'head', 'shoulder', 'upperArm', 'forearm', 'hand', 'thigh', 'shin', 'foot'];
export const LIMB_BONES = { legs: ['thigh', 'shin', 'foot'], arm: ['shoulder', 'upperArm', 'forearm', 'hand'] };
const ARM_SLOTS = ['armL', 'armR'];

export const PARTS = {
    // gait: cómo camina (walk: paso normal · heavy: paso corto y pesado · glide: patina)
    legs: {
        bipedo: {
            name: 'Bípedo B-12', weight: 28, armor: 300, maxLoad: 70, speed: 9, jump: 1, gait: 'walk',
            shapes: [
                { t: 'box', s: [0.42, 0.18, 0.34], p: [0, -0.02, 0], m: 'oliva', b: 'pelvis' },
                { t: 'box', s: [0.44, 0.05, 0.36], p: [0, -0.12, 0], m: 'peligro', b: 'pelvis' },
                { t: 'box', s: [0.2, 0.5, 0.1], p: [0, -0.4, 0.09], m: 'oliva', b: 'thigh' },
                { t: 'box', s: [0.12, 0.12, 0.08], p: [0, -0.86, 0.11], m: 'nar', b: 'thigh' },     // rodillera
                { t: 'box', s: [0.15, 0.48, 0.08], p: [0, -0.42, 0.08], m: 'gris', b: 'shin' }
            ]
        },
        oruga: {
            name: 'Oruga T-40', weight: 46, armor: 620, maxLoad: 115, speed: 6, jump: 0, gait: 'heavy',
            shapes: [
                { t: 'box', s: [0.5, 0.22, 0.4], p: [0, -0.02, 0], m: 'gris', b: 'pelvis' },
                { t: 'box', s: [0.26, 0.55, 0.16], p: [0.02, -0.4, 0.06], m: 'oliva', b: 'thigh' },
                { t: 'box', s: [0.3, 0.62, 0.55], p: [0.03, -0.55, 0.04], m: 'oruga', b: 'shin' },   // el módulo de oruga
                { t: 'box', s: [0.32, 0.08, 0.5], p: [0.03, -0.2, 0.04], m: 'peligro', b: 'shin' },
                { t: 'box', s: [0.3, 0.16, 0.5], p: [0.03, -0.05, 0.08], m: 'carbon', b: 'foot' }
            ]
        },
        ruedas: {
            name: 'Ruedas R-3', weight: 22, armor: 200, maxLoad: 55, speed: 13, jump: 0.5, gait: 'glide',
            shapes: [
                { t: 'box', s: [0.36, 0.14, 0.28], p: [0, -0.02, 0], m: 'hueso', b: 'pelvis' },
                { t: 'box', s: [0.13, 0.4, 0.07], p: [0, -0.45, 0.08], m: 'hueso', b: 'shin' },
                { t: 'box', s: [0.1, 0.05, 0.4], p: [0, -0.15, 0.06], m: 'carbon', b: 'foot' },        // el patín
                { t: 'cyl', rad: 0.08, h: 0.08, seg: 8, p: [0, -0.2, 0.22], r: [0, 0, Math.PI / 2], m: 'carbon', b: 'foot', wheel: true },
                { t: 'cyl', rad: 0.08, h: 0.08, seg: 8, p: [0, -0.2, -0.08], r: [0, 0, Math.PI / 2], m: 'carbon', b: 'foot', wheel: true },
                { t: 'cyl', rad: 0.03, h: 0.09, p: [0, -0.2, 0.22], r: [0, 0, Math.PI / 2], m: 'nar', b: 'foot', wheel: true },
                { t: 'cyl', rad: 0.03, h: 0.09, p: [0, -0.2, -0.08], r: [0, 0, Math.PI / 2], m: 'nar', b: 'foot', wheel: true }
            ]
        }
    },
    core: {
        estandar: {
            name: 'Núcleo C-20', weight: 30, armor: 500, energy: 1000, regen: 120,
            shapes: [
                { t: 'box', s: [0.62, 0.4, 0.08], p: [0, 0.24, 0.2], m: 'oliva', b: 'chest' },
                { t: 'box', s: [0.64, 0.06, 0.09], p: [0, 0.03, 0.2], m: 'peligro', b: 'chest' },
                { t: 'box', s: [0.42, 0.5, 0.24], p: [0, 0.22, -0.24], m: 'carbon', b: 'chest' },        // la mochila
                { t: 'cyl', rad: 0.04, h: 0.45, p: [0.12, 0.2, -0.4], m: 'ama', b: 'chest' },
                { t: 'cyl', rad: 0.04, h: 0.45, p: [-0.12, 0.2, -0.4], m: 'ama', b: 'chest' },
                { t: 'box', s: [0.26, 0.12, 0.3], p: [0.42, 0.5, 0], m: 'oliva', b: 'chest' },           // hombreras
                { t: 'box', s: [0.26, 0.12, 0.3], p: [-0.42, 0.5, 0], m: 'oliva', b: 'chest' }
            ]
        },
        pesado: {
            name: 'Núcleo H-55', weight: 48, armor: 920, energy: 900, regen: 100,
            shapes: [
                { t: 'box', s: [0.8, 0.55, 0.5], p: [0, 0.25, 0], m: 'gris', b: 'chest' },
                { t: 'box', s: [0.84, 0.16, 0.54], p: [0, 0.5, 0], m: 'oliva', b: 'chest' },
                { t: 'box', s: [0.82, 0.07, 0.52], p: [0, 0.02, 0], m: 'peligro', b: 'chest' },
                { t: 'box', s: [0.55, 0.6, 0.3], p: [0, 0.25, -0.38], m: 'carbon', b: 'chest' },
                { t: 'box', s: [0.34, 0.18, 0.42], p: [0.48, 0.5, 0], m: 'oliva', b: 'chest' },
                { t: 'box', s: [0.34, 0.18, 0.42], p: [-0.48, 0.5, 0], m: 'oliva', b: 'chest' },
                { t: 'box', s: [0.3, 0.3, 0.16], p: [0, 0.22, 0.12], m: 'carbon', b: 'spine' }          // faja
            ]
        },
        liviano: {
            name: 'Núcleo L-08', weight: 18, armor: 280, energy: 1250, regen: 165,
            shapes: [
                { t: 'box', s: [0.42, 0.3, 0.06], p: [0, 0.26, 0.19], m: 'hueso', b: 'chest' },
                { t: 'box', s: [0.3, 0.06, 0.07], p: [0, 0.32, 0.22], m: 'nar', b: 'chest' },
                { t: 'cyl', rad: 0.12, h: 0.42, p: [0, 0.24, -0.24], m: 'carbon', b: 'chest' }          // la batería
            ]
        }
    },
    head: {
        sensor: {
            name: 'Cabeza S-1', weight: 4, armor: 80,
            shapes: [
                { t: 'box', s: [0.32, 0.26, 0.34], p: [0, 0.14, 0.02], m: 'hierro', b: 'head' },
                { t: 'box', s: [0.34, 0.1, 0.12], p: [0, 0.16, 0.16], m: 'cobre', b: 'head' },            // el visor
                { t: 'box', s: [0.22, 0.05, 0.02], p: [0, 0.16, 0.225], m: 'lente', b: 'head' },
                { t: 'box', s: [0.03, 0.25, 0.03], p: [0.12, 0.38, -0.1], m: 'junta', b: 'head' }
            ]
        },
        camara: {
            name: 'Cabeza TV-4', weight: 6, armor: 100,
            shapes: [
                { t: 'box', s: [0.28, 0.26, 0.42], p: [0, 0.15, -0.02], m: 'hueso', b: 'head' },
                { t: 'cyl', rad: 0.09, h: 0.2, p: [0, 0.15, 0.28], r: [Math.PI / 2, 0, 0], m: 'carbon', b: 'head' },
                { t: 'cyl', rad: 0.07, h: 0.02, p: [0, 0.15, 0.39], r: [Math.PI / 2, 0, 0], m: 'lente', b: 'head' },
                { t: 'box', s: [0.04, 0.07, 0.3], p: [0, 0.32, -0.02], m: 'carbon', b: 'head' },
                { t: 'box', s: [0.05, 0.05, 0.05], p: [-0.11, 0.24, 0.19], m: 'nar', b: 'head' }
            ]
        },
        domo: {
            name: 'Cabeza D-9', weight: 7, armor: 160,
            shapes: [
                { t: 'cyl', rad: 0.22, h: 0.26, seg: 6, p: [0, 0.14, 0], m: 'oliva', b: 'head' },
                { t: 'cyl', rad: 0.225, h: 0.06, seg: 6, p: [0, 0.18, 0], m: 'lente', b: 'head' },
                { t: 'cyl', rad: 0.15, h: 0.07, seg: 6, p: [0, 0.3, 0], m: 'carbon', b: 'head' }
            ]
        }
    },
    // pose: aim (antebrazo al frente, apuntando) · free (cuelga y se hamaca al caminar). hideHand: tapa la mano.
    arm: {
        canon: {
            name: 'Cañón K-90', weight: 14, armor: 120, kind: 'cañón', pose: 'aim',
            shapes: [
                { t: 'box', s: [0.14, 0.4, 0.14], p: [0.02, -0.3, 0.08], m: 'oliva', b: 'upperArm' },
                { t: 'box', s: [0.2, 0.5, 0.2], p: [0.02, -0.35, 0.1], m: 'gris', b: 'forearm' },
                { t: 'cyl', rad: 0.06, h: 0.75, p: [0.02, -0.95, 0.1], m: 'carbon', b: 'forearm' },   // el caño, a lo largo del antebrazo
                { t: 'box', s: [0.15, 0.1, 0.15], p: [0.02, -1.32, 0.1], m: 'metal', b: 'forearm' },
                { t: 'box', s: [0.21, 0.05, 0.21], p: [0.02, -0.15, 0.1], m: 'peligro', b: 'forearm' }
            ]
        },
        ametralladora: {
            name: 'Ametralladora M-6', weight: 10, armor: 100, kind: 'ametralladora', pose: 'aim',
            shapes: [
                { t: 'box', s: [0.13, 0.35, 0.13], p: [0.02, -0.3, 0.07], m: 'gris', b: 'upperArm' },
                { t: 'box', s: [0.15, 0.45, 0.15], p: [0.02, -0.35, 0.09], m: 'carbon', b: 'forearm' },
                ...[-0.04, 0, 0.04].map(dx => ({ t: 'cyl', rad: 0.018, h: 0.4, p: [0.02 + dx, -0.78, 0.09 + Math.abs(dx)], m: 'metal', b: 'forearm' })),
                { t: 'cyl', rad: 0.1, h: 0.09, p: [0.13, -0.35, 0.09], r: [0, 0, Math.PI / 2], m: 'ama', b: 'forearm' }   // el tambor
            ]
        },
        pinza: {
            name: 'Pinza P-2', weight: 9, armor: 140, kind: 'cuerpo a cuerpo', pose: 'free', hideHand: true,
            shapes: [
                { t: 'box', s: [0.14, 0.4, 0.14], p: [0.02, -0.3, 0.06], m: 'oliva', b: 'upperArm' },
                { t: 'cyl', rad: 0.025, h: 0.5, p: [0.09, -0.35, -0.05], m: 'metal', b: 'forearm' },     // pistón
                { t: 'box', s: [0.18, 0.14, 0.2], p: [0, -0.06, 0.02], m: 'gris', b: 'hand' },
                { t: 'box', s: [0.05, 0.3, 0.06], p: [-0.05, -0.26, 0.08], r: [0.25, 0, 0], m: 'nar', b: 'hand' },
                { t: 'box', s: [0.05, 0.3, 0.06], p: [0.07, -0.26, 0.08], r: [0.25, 0, 0], m: 'nar', b: 'hand' },
                { t: 'box', s: [0.05, 0.26, 0.06], p: [0.01, -0.24, -0.06], r: [-0.3, 0, 0], m: 'nar', b: 'hand' }
            ]
        }
    }
};

export const DEFAULT_BUILD = { legs: 'bipedo', core: 'estandar', head: 'sensor', armL: 'ametralladora', armR: 'canon' };

// Las opciones de una ranura (los dos brazos comparten catálogo)
export const catalog = slot => PARTS[ARM_SLOTS.includes(slot) ? 'arm' : slot];
export const partOf = (build, slot) => catalog(slot)[build[slot]];

// Arreglo de un armado que vino de afuera (guardado viejo, pieza que ya no existe): lo que falta, de fábrica
export function cleanBuild(b) {
    const out = {};
    SLOTS.forEach(s => { out[s] = b && catalog(s)[b[s]] ? b[s] : DEFAULT_BUILD[s]; });
    return out;
}

// Los números del robot armado. La carga es todo lo que van cargando las piernas; pasada de su límite, el robot anda
// más lento (nunca menos de un tercio).
export function computeStats(build) {
    const parts = SLOTS.map(s => partOf(build, s)), legs = partOf(build, 'legs'), core = partOf(build, 'core');
    const weight = parts.reduce((t, p) => t + p.weight, 0), load = weight - legs.weight;
    const over = load > legs.maxLoad;
    return {
        weight, load, maxLoad: legs.maxLoad, over,
        armor: parts.reduce((t, p) => t + p.armor, 0),
        speed: legs.speed * (over ? Math.max(1 / 3, legs.maxLoad / load) : 1),
        jump: legs.jump, energy: core.energy, regen: core.regen
    };
}
