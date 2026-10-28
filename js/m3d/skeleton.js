// Copiado de arena-robots (https://github.com/matiaslcsm-rgb/arena-robots, src/skeleton.js) el 2026-10-28 para MATCH 3D.
// El esqueleto de todos los robots (basado en la referencia del usuario, 2026-10-26): flaco, de hierro oscuro, con
// todas las articulaciones a la vista (juntas redondas), detalles de cobre, la columna con cables de colores y la
// caja de costillas. Solo datos, sin three.js: robot.js lo arma.
//
// BONES: cada hueso nace en su articulación, medida desde la de su padre (metros). Los de brazos y piernas (limb) se
// hacen dos veces, izquierda (x+) y derecha (x-, espejo). Los dedos tienen dos falanges.
// SHAPES: el dibujo del esqueleto, con el mismo formato de las piezas (parts.js).

const FINGERS = [-0.04, -0.013, 0.014, 0.04]; // dónde nace cada dedo, a lo ancho de la palma (z)

export const BONES = [
    { n: 'pelvis', p: [0, 1.9, 0] },
    { n: 'spine', parent: 'pelvis', p: [0, 0.1, 0] },
    { n: 'chest', parent: 'spine', p: [0, 0.5, 0] },
    { n: 'neck', parent: 'chest', p: [0, 0.55, 0] },
    { n: 'head', parent: 'neck', p: [0, 0.22, 0] },
    { n: 'shoulder', parent: 'chest', p: [0.36, 0.44, 0], limb: true },
    { n: 'upperArm', parent: 'shoulder', p: [0.1, 0, 0], limb: true },
    { n: 'forearm', parent: 'upperArm', p: [0, -0.68, 0], limb: true },
    { n: 'hand', parent: 'forearm', p: [0, -0.62, 0], limb: true },
    ...FINGERS.flatMap((z, i) => [
        { n: `finger${i}a`, parent: 'hand', p: [0, -0.16, z], limb: true },
        { n: `finger${i}b`, parent: `finger${i}a`, p: [0, -0.07, 0], limb: true }
    ]),
    { n: 'thumbA', parent: 'hand', p: [-0.03, -0.08, 0.06], limb: true },
    { n: 'thumbB', parent: 'thumbA', p: [0, -0.06, 0], limb: true },
    { n: 'thigh', parent: 'pelvis', p: [0.2, -0.06, 0], limb: true },
    { n: 'shin', parent: 'thigh', p: [0, -0.86, 0], limb: true },
    { n: 'foot', parent: 'shin', p: [0, -0.86, 0], limb: true }
];
export const LEG = { thigh: 0.86, shin: 0.86, ankle: 0.12 }; // largos para que los pies queden en el piso

const AX = [0, 0, Math.PI / 2]; // cilindro acostado (eje x): las juntas
const hub = (b, rad, h, p = [0, 0, 0]) => [
    { t: 'cyl', rad, h, seg: 10, p, r: AX, m: 'junta', b },
    { t: 'cyl', rad: rad * 0.45, h: h + 0.02, seg: 8, p, r: AX, m: 'metal', b }   // la tapa con el eje
];
export const SHAPES = [
    // pelvis y columna con sus cables
    { t: 'box', s: [0.34, 0.12, 0.18], p: [0, 0, 0], m: 'hierro', b: 'pelvis' },
    ...[0.05, 0.17, 0.29, 0.41].map(y => ({ t: 'box', s: [0.11, 0.08, 0.1], p: [0, y, -0.02], m: 'hierro', b: 'spine' })),
    { t: 'cyl', rad: 0.03, h: 0.5, p: [0, 0.25, -0.02], m: 'junta', b: 'spine' },
    { t: 'cyl', rad: 0.016, h: 0.52, p: [-0.045, 0.25, 0.06], r: [0.05, 0, 0.04], m: 'cableR', b: 'spine' },
    { t: 'cyl', rad: 0.016, h: 0.52, p: [0, 0.25, 0.07], r: [0.08, 0, 0], m: 'cableV', b: 'spine' },
    { t: 'cyl', rad: 0.016, h: 0.52, p: [0.045, 0.25, 0.06], r: [0.05, 0, -0.04], m: 'cableA', b: 'spine' },
    // el pecho: esternón, tres costillas por lado, la espalda y la clavícula
    { t: 'box', s: [0.08, 0.4, 0.06], p: [0, 0.25, 0.13], m: 'hierro', b: 'chest' },
    ...[0.12, 0.26, 0.4].flatMap(y => [1, -1].map(k => ({ t: 'box', s: [0.3, 0.04, 0.04], p: [0.15 * k, y, 0.06], r: [0, -0.45 * k, 0], m: 'hierro', b: 'chest' }))),
    { t: 'box', s: [0.36, 0.45, 0.05], p: [0, 0.24, -0.12], m: 'hierro', b: 'chest' },
    { t: 'box', s: [0.72, 0.07, 0.09], p: [0, 0.44, 0], m: 'junta', b: 'chest' },
    // cuello y el soporte de la cabeza
    ...hub('neck', 0.05, 0.12),
    { t: 'cyl', rad: 0.025, h: 0.22, p: [0.04, 0.11, 0], m: 'junta', b: 'neck' },
    { t: 'cyl', rad: 0.025, h: 0.22, p: [-0.04, 0.11, 0], m: 'junta', b: 'neck' },
    { t: 'box', s: [0.12, 0.04, 0.12], p: [0, 0, 0], m: 'hierro', b: 'head' },
    // brazo: hombro, brazo (dos varillas y manga de cobre), codo, antebrazo, muñeca y mano
    ...hub('shoulder', 0.1, 0.12, [0.04, 0, 0]),
    { t: 'cyl', rad: 0.03, h: 0.6, p: [0, -0.34, 0.035], m: 'hierro', b: 'upperArm' },
    { t: 'cyl', rad: 0.03, h: 0.6, p: [0, -0.34, -0.035], m: 'hierro', b: 'upperArm' },
    { t: 'box', s: [0.09, 0.18, 0.11], p: [0, -0.28, 0], m: 'cobre', b: 'upperArm' },
    ...hub('forearm', 0.08, 0.12),
    { t: 'cyl', rad: 0.025, h: 0.55, p: [0, -0.31, 0.03], m: 'hierro', b: 'forearm' },
    { t: 'cyl', rad: 0.025, h: 0.55, p: [0, -0.31, -0.03], m: 'hierro', b: 'forearm' },
    { t: 'box', s: [0.07, 0.3, 0.05], p: [0, -0.3, -0.06], m: 'cobre', b: 'forearm' },
    ...hub('hand', 0.045, 0.09),
    { t: 'box', s: [0.06, 0.13, 0.11], p: [0, -0.09, 0], m: 'hierro', b: 'hand', hand: true },
    ...FINGERS.flatMap((z, i) => [
        { t: 'box', s: [0.022, 0.07, 0.022], p: [0, -0.035, 0], m: 'junta', b: `finger${i}a`, hand: true },
        { t: 'box', s: [0.02, 0.06, 0.02], p: [0, -0.03, 0], m: 'cobre', b: `finger${i}b`, hand: true }
    ]),
    { t: 'box', s: [0.022, 0.06, 0.022], p: [0, -0.03, 0], m: 'junta', b: 'thumbA', hand: true },
    { t: 'box', s: [0.02, 0.05, 0.02], p: [0, -0.025, 0], m: 'cobre', b: 'thumbB', hand: true },
    // pierna: cadera, muslo, rodilla, canilla con su puntal, tobillo y pie con puntera de cobre
    ...hub('thigh', 0.11, 0.14),
    { t: 'cyl', rad: 0.035, h: 0.75, p: [0, -0.43, 0.04], m: 'hierro', b: 'thigh' },
    { t: 'cyl', rad: 0.035, h: 0.75, p: [0, -0.43, -0.04], m: 'hierro', b: 'thigh' },
    { t: 'box', s: [0.1, 0.3, 0.04], p: [0, -0.35, 0.075], m: 'cobre', b: 'thigh' },
    ...hub('shin', 0.09, 0.13),
    { t: 'cyl', rad: 0.035, h: 0.8, p: [0, -0.43, -0.02], m: 'hierro', b: 'shin' },
    { t: 'box', s: [0.04, 0.62, 0.04], p: [0, -0.45, 0.06], r: [0.12, 0, 0], m: 'hierro', b: 'shin' },
    { t: 'box', s: [0.08, 0.3, 0.06], p: [0, -0.3, -0.07], m: 'cobre', b: 'shin' },
    ...hub('foot', 0.06, 0.1),
    { t: 'box', s: [0.12, 0.06, 0.3], p: [0, -0.09, 0.06], m: 'hierro', b: 'foot' },
    { t: 'box', s: [0.13, 0.06, 0.1], p: [0, -0.09, 0.24], m: 'cobre', b: 'foot' },
    { t: 'box', s: [0.1, 0.05, 0.06], p: [0, -0.09, -0.1], m: 'junta', b: 'foot' }
];
