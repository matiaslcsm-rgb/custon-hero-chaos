// Tower Chaos: generador de criaturas. Cada run arma su propio bestiario por bioma combinando variables:
//   rol (cómo pelea: reutiliza la mecánica y la IA de un creep de siempre) · cuerpo (figura de tinta) · tamaño ·
//   colores de la paleta del bioma · 0 a 2 rasgos (con afinidad por bioma) · partes visuales (cuernos, púas, alas,
//   ojos, manchas). El nombre se arma con las partes, concordando el género ("Gran Hiena Sangrienta").
// Lo usa towerCreepPool (towerWorld.js). Pedido del usuario (2026-10-06): "un algoritmo que tome muchas variables y las
// combine en criaturas variadas".

// Roles: tipo base (mecánica e IA), cuerpos posibles y descripción para el bestiario. tier 1 = solo en el segundo
// piso de cada bioma (los más difíciles).
const BEAST_ROLES = {
    brawler: { base: 'GRUNT', bodies: ['wolf', 'boar', 'footman', 'lizard', 'scorpion'], desc: 'pelea cuerpo a cuerpo' },
    skirmisher: { base: 'SCOUT', bodies: ['wolf', 'lizard', 'chusma'], desc: 'rápido y escurridizo' },
    archer: { base: 'ARCHER', bodies: ['archer', 'toad', 'scorpion'], desc: 'ataca a distancia' },
    caster: { base: 'SHAMAN', bodies: ['mage', 'wraith', 'plague'], desc: 'lanza hechizos (daño mágico)' },
    bruiser: { base: 'BRUTE', bodies: ['brute', 'golem', 'boar'], desc: 'pega muy fuerte', tier: 1 },
    tank: { base: 'ARMORED', bodies: ['golem', 'brute'], desc: 'muy resistente', tier: 1 },
    hexer: { base: 'WARLOCK', bodies: ['mage', 'wraith'], desc: 'maldice a distancia', tier: 1 },
    healer: { base: 'HEALER', bodies: ['plague', 'mage'], desc: 'cura a los suyos', tier: 1 },
    stunner: { base: 'STUNNER', bodies: ['brute', 'golem', 'scorpion'], desc: 'aturde con sus golpes', tier: 1 },
    ghost: { base: 'SPECTER', bodies: ['wraith', 'phantom'], desc: 'esquiva muchos golpes', tier: 1 },
    swarm: { base: 'SWARM', bodies: ['swarm'], desc: 'viene en enjambre' },
    bomber: { base: 'KAMIKAZE', bodies: ['kamikaze'], desc: 'explota al alcanzarte', tier: 1 }
};
// Sustantivos por cuerpo, con su género
const BEAST_NOUNS = {
    wolf: [['Lobo', 'm'], ['Hiena', 'f'], ['Chacal', 'm']], boar: [['Jabalí', 'm'], ['Bestia', 'f'], ['Cerdo Salvaje', 'm']],
    lizard: [['Lagarto', 'm'], ['Salamandra', 'f'], ['Reptil', 'm']], scorpion: [['Escorpión', 'm'], ['Alacrana', 'f']],
    toad: [['Sapo', 'm'], ['Rana', 'f']], footman: [['Guerrero', 'm'], ['Saqueador', 'm'], ['Bandida', 'f']],
    brute: [['Ogro', 'm'], ['Troll', 'm'], ['Bruta', 'f']], golem: [['Gólem', 'm'], ['Coloso', 'm'], ['Estatua Viva', 'f']],
    archer: [['Cazador', 'm'], ['Arquera', 'f'], ['Hondero', 'm']], mage: [['Chamán', 'm'], ['Bruja', 'f'], ['Hechicero', 'm']],
    wraith: [['Espectro', 'm'], ['Ánima', 'f'], ['Sombra', 'f']], plague: [['Curandero', 'm'], ['Sanadora', 'f']],
    phantom: [['Fantasma', 'm'], ['Aparición', 'f']], chusma: [['Duende', 'm'], ['Trasgo', 'm']],
    swarm: [['Enjambre', 'm'], ['Plaga', 'f']], kamikaze: [['Escarabajo Bomba', 'm'], ['Bola de Pus', 'f']]
};
// Rasgos: adjetivo (m, f), afinidad por bioma
const BEAST_TRAITS = {
    poison: { adj: ['Venenoso', 'Venenosa'], biomes: ['forest', 'swamp', 'desert'] },
    burn: { adj: ['Ígneo', 'Ígnea'], biomes: ['desert', 'volcano'] },
    chill: { adj: ['Gélido', 'Gélida'], biomes: ['snow'] },
    bleed: { adj: ['Sangriento', 'Sangrienta'], biomes: ['forest', 'swamp', 'volcano'] },
    lifesteal: { adj: ['Vampírico', 'Vampírica'], biomes: ['swamp', 'volcano'] },
    armored: { adj: ['Acorazado', 'Acorazada'], biomes: ['desert', 'snow'] },
    swift: { adj: ['Veloz', 'Veloz'], biomes: ['forest', 'desert'] },
    thorns: { adj: ['Espinoso', 'Espinosa'], biomes: ['forest', 'volcano', 'desert'] },
    berserk: { adj: ['Rabioso', 'Rabiosa'], biomes: ['snow', 'volcano', 'forest'] }
};
const BEAST_PALETTES = {
    forest: ['#6b8e4e', '#8b5e3c', '#a68a64', '#4f6f52', '#9c6644', '#7d8f4e'],
    swamp: ['#7a9a3a', '#6b705c', '#5e503f', '#8a9a5b', '#4a5d4f', '#9fb8a0'],
    desert: ['#c08552', '#d4a373', '#b5651d', '#e0c080', '#9c6644', '#a47148'],
    snow: ['#cfd8dc', '#90caf9', '#b0bec5', '#7fa7c9', '#e0e1dd', '#a7c4d6'],
    volcano: ['#9d0208', '#e85d04', '#3d3b40', '#dc2f02', '#6a040f', '#5a4a44']
};
const BEAST_PLACE = { forest: 'del Musgo', swamp: 'del Pantano', desert: 'de las Dunas', snow: 'de la Escarcha', volcano: 'de Ceniza' };
const BEAST_PARTS = ['horns', 'spikes', 'wings', 'eyes', 'spots'];
const BEAST_SIZES = { small: { scale: 0.82, hp: 0.7, atk: 0.8, move: 0.85, xp: 0.75, prefix: ['Pequeño ', 'Pequeña '] }, normal: { scale: 1, hp: 1, atk: 1, move: 1, xp: 1, prefix: ['', ''] }, big: { scale: 1.28, hp: 1.6, atk: 1.3, move: 1.15, xp: 1.5, prefix: ['Gran ', 'Gran '] } };

// Efectos de los rasgos nuevos (los de veneno, fuego y hielo están en CREEP_TRAITS, towerWorld.js)
Object.assign(CREEP_TRAITS, {
    bleed: { label: 'hace sangrar', apply(c, t) { creepDot(c, t, 'BLEED', 'Sangrando', 0.22); } },
    lifesteal: { label: 'se cura con lo que pega', apply(c, t, r) { c.hp = Math.min(c.maxHp, c.hp + (r ? r.dealt : 0) * 0.35); } },
    berserk: { label: 'con poca vida pega mucho más', apply(c) { if (!c.berserk && c.hp < c.maxHp * 0.5) { c.berserk = true; c.atk = Math.round(c.atk * 1.45); if (fxArena(c)) fxText(c, '¡FURIA!', '#9b2226', 11, 1); } } },
    armored: { label: 'blindado (+armadura)', passive: true },
    swift: { label: 'muy rápido', passive: true },
    thorns: { label: 'devuelve 20% del daño cuerpo a cuerpo', passive: true }
});

const pickW = (arr, rnd = Math.random) => arr[Math.floor(rnd() * arr.length)];
// Arma un tipo de criatura (mismo formato que CREEP_TYPES, más los datos del genoma).
function generateBeast(biome, roleKey, from) {
    const role = BEAST_ROLES[roleKey], base = CREEP_TYPES[role.base];
    const body = pickW(role.bodies), [noun, g] = pickW(BEAST_NOUNS[body]), gi = g === 'f' ? 1 : 0;
    const sizeKey = roleKey === 'swarm' || roleKey === 'bomber' ? 'normal' : pickW(['small', 'normal', 'normal', 'big']);
    const size = BEAST_SIZES[sizeKey];
    const pool = Object.keys(BEAST_TRAITS).filter(k => BEAST_TRAITS[k].biomes.includes(biome));
    const nTraits = Math.random() < 0.15 ? 0 : Math.random() < (from ? 0.5 : 0.25) ? 2 : 1;
    const traits = shuffle(pool.slice()).slice(0, nTraits);
    const parts = shuffle(BEAST_PARTS.slice()).slice(0, Math.floor(Math.random() * 3));
    const color = pickW(BEAST_PALETTES[biome]);
    const adj = traits.length ? ' ' + BEAST_TRAITS[traits[0]].adj[gi] : ' ' + BEAST_PLACE[biome];
    const label = `${size.prefix[gi]}${noun}${adj}`;
    const hitTraits = traits.filter(k => CREEP_TRAITS[k] && !CREEP_TRAITS[k].passive);
    const onAttack = (c, target, result) => {
        if (base.onAttack) base.onAttack(c, target, result);
        if (!result || result.dealt <= 0) return;
        hitTraits.forEach(k => { if (target.isAlive() || k === 'lifesteal' || k === 'berserk') CREEP_TRAITS[k].apply(c, target, result); });
    };
    const t = {
        ...base, label, color, biome, from, plan: body, scale: size.scale, traits, trait: traits[0] || null, parts, genome: { role: roleKey, body, size: sizeKey },
        hp: Math.round(base.hp * size.hp), atk: Math.round(base.atk * size.atk), moveInterval: Math.round(base.moveInterval * size.move * (traits.includes('swift') ? 0.75 : 1)),
        atkSpeed: base.atkSpeed * (traits.includes('swift') ? 1.15 : 1), armor: (base.armor || 0) + (traits.includes('armored') ? 5 : 0),
        magicResist: (base.magicResist || 0) + (traits.includes('armored') ? 15 : 0), thorns: traits.includes('thorns') ? 0.2 : 0,
        xp: Math.round(base.xp * size.xp * (1 + 0.15 * traits.length)), onAttack,
        mechanic: `${role.desc[0].toUpperCase()}${role.desc.slice(1)}.` + (traits.length ? ' ' + traits.map(k => CREEP_TRAITS[k].label).join('; ') + '.' : '')
    };
    return t;
}
// Bestiario de un bioma: 6 criaturas del primer piso (cuerpo a cuerpo, rápida, a distancia, hechicera y 2 más) y 3 más
// difíciles para el segundo.
function generateBestiary(biome) {
    const t0 = Object.keys(BEAST_ROLES).filter(k => !BEAST_ROLES[k].tier);
    const t1 = Object.keys(BEAST_ROLES).filter(k => BEAST_ROLES[k].tier);
    const roles0 = ['brawler', 'skirmisher', 'archer', 'caster'].concat(shuffle(t0.slice()).slice(0, 2)); // 4 fijos + 2 distintos al azar
    const roles1 = shuffle(t1.slice()).slice(0, 3);
    const list = roles0.map(r => generateBeast(biome, r, 0)).concat(roles1.map(r => generateBeast(biome, r, 1)));
    const seen = new Set(); // sin nombres repetidos
    list.forEach(t => { while (seen.has(t.label)) t.label += ' Mayor'; seen.add(t.label); });
    return list;
}
function towerBestiary(biome) {
    if (!towerRun) return null;
    towerRun.bestiary = towerRun.bestiary || {};
    return towerRun.bestiary[biome] || (towerRun.bestiary[biome] = generateBestiary(biome));
}
// Espinas: devuelve parte del daño de los ataques de un héroe (lo llama dealDamage)
function beastThorns(target, source, dealt, opts) {
    if (!target.type || !target.type.thorns || !source || !source.isHero || !opts.isAttack || dealt <= 0 || !source.isAlive()) return;
    if (Math.hypot(source.x - target.x, source.y - target.y) > 2) return; // solo cuerpo a cuerpo
    dealDamage(target, source, Math.max(1, Math.round(dealt * target.type.thorns)), 'pure');
}

// --- PARTES VISUALES (sobre la figura de tinta) ---
// Dónde está la cabeza y el lomo de cada cuerpo (en el lienzo de 64×96)
const INK_ANCHORS = {
    wolf: { head: [52, 54], back: [30, 59] }, boar: { head: [54, 60], back: [30, 55] }, lizard: { head: [55, 76], back: [30, 74] },
    scorpion: { head: [50, 76], back: [32, 74] }, toad: { head: [32, 66], back: [32, 72] }, footman: { head: [33, 19], back: [33, 42] },
    brute: { head: [33, 14], back: [33, 36] }, golem: { head: [33, 17], back: [33, 36] }, archer: { head: [33, 14], back: [33, 40] },
    mage: { head: [33, 10], back: [33, 42] }, wraith: { head: [33, 16], back: [33, 36] }, plague: { head: [33, 16], back: [33, 40] },
    chusma: { head: [32, 51], back: [32, 68] }, swarm: { head: [32, 58], back: [32, 66] }, kamikaze: { head: [32, 60], back: [32, 72] },
    phantom: { head: [32, 13], back: [32, 36] }
};
function inkPartsBehind(g, plan, c, rnd) {
    const a = INK_ANCHORS[plan];
    if (!a || !(c.parts || []).includes('wings')) return;
    const [x, y] = a.back, w = INK_A.sway * 3;
    inkShape(g, [[x - 2, y], [x - 18, y - 16 - w], [x - 14, y - 6], [x - 20, y + 2], [x - 6, y + 4]], shade(c.main, -0.45), rnd, { width: 1.5 });
    inkShape(g, [[x + 2, y], [x + 18, y - 16 + w], [x + 14, y - 6], [x + 20, y + 2], [x + 6, y + 4]], shade(c.main, -0.45), rnd, { width: 1.5 });
}
function inkPartsFront(g, plan, c, rnd) {
    const a = INK_ANCHORS[plan], parts = c.parts || [];
    if (!a) return;
    const [hx, hy] = a.head, [bx, by] = a.back;
    if (parts.includes('horns')) {
        inkShape(g, [[hx - 3, hy - 3], [hx - 9, hy - 12], [hx - 6, hy - 3]], '#d9c6a0', rnd, { width: 1.3 });
        inkShape(g, [[hx + 3, hy - 3], [hx + 9, hy - 12], [hx + 6, hy - 3]], '#d9c6a0', rnd, { width: 1.3 });
    }
    if (parts.includes('spikes')) for (let i = -2; i <= 2; i++) inkShape(g, [[bx + i * 5 - 2, by - 3], [bx + i * 5, by - 9], [bx + i * 5 + 2, by - 3]], c.dark, rnd, { width: 1.1 });
    if (parts.includes('eyes')) { inkEye(g, hx - 4, hy + 3, '#c0392b', 1.2); inkEye(g, hx + 4, hy + 3, '#c0392b', 1.2); inkEye(g, hx, hy - 1, '#c0392b', 1.2); }
    if (parts.includes('spots')) { g.fillStyle = c.accent; [[-6, 2], [4, 4], [-1, 6], [8, 0], [-9, 6]].forEach(([dx, dy]) => { g.beginPath(); g.arc(bx + dx, by + dy, 1.8, 0, Math.PI * 2); g.fill(); }); }
}

// --- BESTIARIO (tecla K) ---
let bestiaryOpen = false;
function noteBeastSeen(type) { if (towerRun && type && type.genome) { towerRun.seen = towerRun.seen || {}; towerRun.seen[type.label] = type; } }
function toggleBestiary(open = !bestiaryOpen) {
    if (gameMode !== 'tower' || !towerRun) return;
    bestiaryOpen = open;
    showPanel('bestiary-container', open);
    if (open) renderBestiary();
}
function renderBestiary() {
    const box = document.getElementById('bestiary-list');
    const seen = Object.values(towerRun.seen || {});
    if (!seen.length) { box.innerHTML = '<p class="subtitle">Todavía no te cruzaste con ninguna criatura. Cada run trae su propio bestiario.</p>'; return; }
    box.innerHTML = '';
    BIOME_ORDER.forEach(b => {
        const list = seen.filter(t => t.biome === b);
        if (!list.length) return;
        const h = document.createElement('h4'); h.textContent = `${BIOMES[b].icon} ${BIOMES[b].name}`; box.appendChild(h);
        list.forEach(t => {
            const fig = inkFigure(t.plan, inkLookFor({ type: t, color: t.color }), 'idle', 0).img.toDataURL();
            const row = document.createElement('div'); row.className = 'beast-row';
            row.innerHTML = `<img src="${fig}" class="beast-fig"><div><b>${t.label}</b>${t.from ? ' <span class="subtitle">(difícil)</span>' : ''}<div class="subtitle">${t.mechanic}</div>` +
                `<div class="beast-stats">❤ ${t.hp} · ⚔ ${t.atk} · ${t.attackType === 'magical' ? 'mágico' : 'físico'} · alcance ${t.range}${t.armor ? ` · armadura ${t.armor}` : ''}</div></div>`;
            box.appendChild(row);
        });
    });
}
