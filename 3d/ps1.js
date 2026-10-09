// Tower Chaos 3D — lo que hace que se vea como PlayStation 1 (2026-10-08).
//   · Vértices pegados a una grilla de pantalla (el "temblor").
//   · Texturas afines: sin corrección de perspectiva, se deforman al acercarse (como en PS1).
//   · Texturas pixeladas pintadas con código (Nearest, sin mipmaps).
//   · Pasada final: colores a 15 bits (5 por canal) con tramado de Bayer 4×4 → degradés "granulados" como en las referencias.

import * as THREE from 'three';

export const PS1 = { snap: 110 };
export const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = a => a[Math.floor(Math.random() * a.length)];

export function ps1(mat) {
    mat.onBeforeCompile = sh => {
        sh.vertexShader = 'varying float vAffW;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
            vec4 ps1p = gl_Position; ps1p.xyz /= ps1p.w;
            ps1p.xy = floor(ps1p.xy * ${PS1.snap.toFixed(1)}) / ${PS1.snap.toFixed(1)};
            ps1p.xyz *= ps1p.w; gl_Position = ps1p;
            vAffW = gl_Position.w;
            #ifdef USE_MAP
                vMapUv *= vAffW; // textura afín: se interpola sin corregir la perspectiva
            #endif`);
        sh.fragmentShader = 'varying float vAffW;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
            #ifdef USE_MAP
                vec4 sampledDiffuseColor = texture2D( map, vMapUv / vAffW );
                diffuseColor *= sampledDiffuseColor;
            #endif`);
    };
    return mat;
}
export const lambert = opts => ps1(new THREE.MeshLambertMaterial(opts));

export function makeTex(draw, size = 32, repeat = null) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); draw(g, size);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    return t;
}
export const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
export function noise(g, s, base, amt, n) { for (let i = 0; i < n; i++) { g.fillStyle = shade(base, 1 + (Math.random() - 0.5) * amt); g.fillRect(rint(0, s - 1), rint(0, s - 1), 1, 1); } }

// --- PASADA FINAL: 15 bits con tramado ---
export function setupPost(renderer) {
    const rt = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    const mat = new THREE.ShaderMaterial({
        uniforms: { tDiffuse: { value: rt.texture } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
            float bayer(vec2 p) { int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0)); int i = x + y * 4;
                int m[16]; m[0]=0; m[1]=8; m[2]=2; m[3]=10; m[4]=12; m[5]=4; m[6]=14; m[7]=6; m[8]=3; m[9]=11; m[10]=1; m[11]=9; m[12]=15; m[13]=7; m[14]=13; m[15]=5;
                for (int k = 0; k < 16; k++) if (k == i) return float(m[k]) / 16.0; return 0.0; }
            void main() {
                vec3 c = texture2D(tDiffuse, vUv).rgb;
                c = pow(max(c, 0.0), vec3(1.0 / 2.2));             // a sRGB antes de bajar los bits
                c += (bayer(gl_FragCoord.xy) - 0.5) / 31.0;       // tramado
                c = floor(c * 31.0 + 0.5) / 31.0;                 // 5 bits por canal
                gl_FragColor = vec4(c, 1.0);
            }`,
        depthTest: false, depthWrite: false
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat), postScene = new THREE.Scene(), postCam = new THREE.Camera();
    postScene.add(quad);
    return {
        resize(w, h) { rt.setSize(w, h); },
        render(scene, camera) {
            renderer.setRenderTarget(rt); renderer.render(scene, camera);
            renderer.setRenderTarget(null); renderer.render(postScene, postCam);
        }
    };
}
