// Copiado de arena-robots (https://github.com/matiaslcsm-rgb/arena-robots, src/robot.js) el 2026-10-28 para MATCH 3D.
// Arma el robot en 3D: el esqueleto (skeleton.js) y, enganchadas a sus huesos, las piezas elegidas (parts.js).
// Y lo anima articulación por articulación: caminar (cadera, rodilla, tobillo), brazos que se hamacan o apuntan,
// dedos que agarran, la columna que gira, orugas y ruedas.
import * as THREE from 'three';
import { partOf, LIMB_BONES } from './parts.js';
import { BONES, SHAPES, LEG } from './skeleton.js';
import { mat } from './ps1.js';

const SIDES = { L: 1, R: -1 }; // izquierda del robot: x+ (mira hacia z+)
const GEO = {}; // geometrías compartidas
function geo(s) {
    const k = s.t === 'box' ? 'b' + s.s.join(',') : `c${s.rad},${s.h},${s.seg || 8}`;
    return GEO[k] || (GEO[k] = s.t === 'box' ? new THREE.BoxGeometry(...s.s) : new THREE.CylinderGeometry(s.rad, s.rad, s.h, s.seg || 8));
}
const isLimb = name => BONES.some(b => b.n === name && b.limb);

export function buildRobot(build) {
    const robot = new THREE.Group(), bones = {};
    // los huesos, padres primero (los de brazos y piernas, uno por lado)
    BONES.forEach(b => (b.limb ? Object.keys(SIDES) : ['']).forEach(side => {
        const g = new THREE.Group(), k = SIDES[side] || 1;
        g.position.set(b.p[0] * k, b.p[1], b.p[2]);
        (b.parent ? bones[b.parent + (isLimb(b.parent) ? side : '')] : robot).add(g);
        bones[b.n + side] = g;
    }));
    const wheels = [], tracks = [], hands = { L: [], R: [] };
    const put = (s, side) => {
        const k = SIDES[side] || 1, m = new THREE.Mesh(geo(s), mat(s.m));
        m.position.set(s.p[0] * k, s.p[1], s.p[2]);
        if (s.r) m.rotation.set(s.r[0], s.r[1] * k, s.r[2] * k);
        bones[s.b + side].add(m);
        if (s.wheel) wheels.push(m);
        if (s.m === 'oruga') tracks.push(m);
        if (s.hand) hands[side].push(m);
    };
    const putAll = (shapes, sides) => shapes.forEach(s => (isLimb(s.b) ? sides : ['']).forEach(side => put(s, side)));
    putAll(SHAPES.map(s => s.t === 'cyl' ? { ...s, rad: s.rad * 1.35 } : s), ['L', 'R']); // un poco más grueso: a 320x240 los caños finos se pierden
    ['legs', 'core', 'head'].forEach(slot => putAll(partOf(build, slot).shapes, ['L', 'R']));
    const arms = { L: partOf(build, 'armL'), R: partOf(build, 'armR') };
    Object.entries(arms).forEach(([side, arm]) => {
        arm.shapes.forEach(s => { if (!LIMB_BONES.arm.includes(s.b)) throw new Error(`${arm.name}: el hueso "${s.b}" no es del brazo`); put(s, side); });
        if (arm.hideHand) hands[side].forEach(m => { m.visible = false; });
    });
    robot.userData = { bones, wheels, tracks, arms, gait: partOf(build, 'legs').gait, step: 0, t: 0 };
    return robot;
}

// La animación. speed: la velocidad real (m/s); air: en el aire.
export function animateRobot(robot, dt, speed, air) {
    const u = robot.userData, B = u.bones, move = Math.min(1, speed / 3);
    u.t += dt;
    const stride = u.gait === 'heavy' ? 1.1 : u.gait === 'glide' ? 2.4 : 1.5; // metros por paso
    u.step += dt * speed / stride * Math.PI;
    const amp = u.gait === 'heavy' ? 0.32 : u.gait === 'glide' ? 0.22 : 0.55;
    let reach = 0;
    for (const [side, k] of Object.entries(SIDES)) {
        const ph = u.step + (k > 0 ? 0 : Math.PI);
        let hip, knee;
        if (air) { hip = k > 0 ? -0.65 : -0.2; knee = k > 0 ? 1.0 : 0.45; }
        else if (u.gait === 'glide') { hip = -0.3 + Math.sin(ph) * amp * move; knee = 0.6; }                  // agachado, patinando
        else { hip = -Math.sin(ph) * amp * move; knee = (Math.max(0, Math.cos(ph)) * 1.3 * amp + 0.06) * move + 0.05; } // la rodilla se dobla al traer la pierna
        B['thigh' + side].rotation.x = hip;
        B['shin' + side].rotation.x = knee;
        B['foot' + side].rotation.x = -(hip + knee);                                                          // el pie, siempre plano
        reach = Math.max(reach, LEG.thigh * Math.cos(hip) + LEG.shin * Math.cos(hip + knee));
        // los brazos: apuntando al frente (armas) o hamacándose al revés que las piernas
        const arm = u.arms[side];
        if (arm.pose === 'aim') {
            B['upperArm' + side].rotation.set(-0.35 + Math.sin(u.step * 2) * 0.03 * move, 0, k * 0.1);
            B['forearm' + side].rotation.x = -1.2;
        } else {
            B['upperArm' + side].rotation.set(Math.sin(ph) * 0.45 * move, 0, k * 0.08);
            B['forearm' + side].rotation.x = -0.25 - 0.25 * move;
        }
        const curl = arm.pose === 'aim' ? 1.1 : 0.35 + Math.sin(u.t * 1.3 + k) * 0.08;                        // agarra el arma
        for (let i = 0; i < 4; i++) { B[`finger${i}a${side}`].rotation.z = -k * curl; B[`finger${i}b${side}`].rotation.z = -k * curl * 0.9; }
        B['thumbA' + side].rotation.z = k * curl * 0.6;
    }
    // la cadera baja cuando las rodillas se doblan (los pies no se hunden ni flotan)
    B.pelvis.position.y = air ? 1.9 : LEG.ankle + reach + 0.06;
    B.pelvis.rotation.y = Math.sin(u.step) * 0.06 * move;
    B.spine.rotation.y = -Math.sin(u.step) * 0.1 * move;
    B.chest.rotation.x = Math.sin(u.t * 2) * 0.015 + (u.gait === 'glide' ? 0.12 * move : 0);                  // respira; patinando, se inclina
    B.neck.rotation.y = Math.sin(u.t * 0.7) * 0.15 * (1 - move);                                             // quieto, mira alrededor
    u.wheels.forEach(w => { w.rotation.x += dt * speed / 0.08; });
    u.tracks.forEach(t => { t.material.map.offset.y -= dt * speed * 0.1; });
}
