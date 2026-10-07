// Tower Chaos: los héroes convertidos en ítems (docs/ROGUELIKE.md §1 bis).
//
//   En la Torre no se elige héroe: arrancás como AVENTURERO sin clase. Cada habilidad (44) y cada innato (11) de los
//   héroes es una PIEZA DE EQUIPO que trae esa habilidad: equiparla te la da; sacártela, te la quita. Sin bonos de set:
//   la gracia es mezclar (el rifle del Sniper con las botas del Vampiro) y armar sinergias.
//   El ARMA define tu ataque básico (daño, velocidad, alcance, proyectil y atributo principal).
//   Las piezas SUBEN DE NIVEL CON EL USO (las armas rápido; el resto, más lento) y en cada nivel ELEGÍS cómo crece su
//   habilidad: más daño, más área, más duración, más probabilidad, menos enfriamiento… (forjás tu arma).
//   Botín: cofres custodiados por creeps más fuertes, y lo que sueltan creeps y guardianes.

// --- RANURAS Y TAMAÑOS (inventario en grilla, como Diablo 1) ---
const TOWER_SLOTS = {
    weapon: { name: 'Arma', size: [1, 3], icon: 'sword' },
    helm: { name: 'Casco', size: [2, 2], icon: 'mask' },
    armor: { name: 'Armadura', size: [2, 3], icon: 'armor' },
    gloves: { name: 'Guantes', size: [2, 2], icon: 'glove' },
    boots: { name: 'Botas', size: [2, 2], icon: 'boot' },
    amulet: { name: 'Amuleto', size: [1, 1], icon: 'amulet' },
    ring: { name: 'Anillo', size: [1, 1], icon: 'ring' }
};
const EQUIP_SLOTS = ['weapon', 'helm', 'armor', 'gloves', 'boots', 'amulet', 'ring1', 'ring2'];
const slotKind = s => (s === 'ring1' || s === 'ring2' ? 'ring' : s);
const BAG = { cols: 10, rows: 4 };

// Stats base de cada tipo de pieza (crecen un poco con el nivel del ítem)
const SLOT_STATS = {
    helm: lvl => ({ maxHp: 20 + 6 * lvl }),
    armor: lvl => ({ armor: 2 + 0.5 * lvl, maxHp: 15 + 5 * lvl }),
    gloves: lvl => ({ atkSpeedPct: 0.05 + 0.01 * lvl }),
    boots: lvl => ({ moveSpeedPct: 0.06 + 0.005 * lvl }),
    amulet: lvl => ({ maxMana: 20 + 5 * lvl }),
    ring: lvl => ({ hpRegen: 0.5 + 0.2 * lvl })
};

// Arma de cada héroe: cómo ataca quien la lleva (nombre, alcance, velocidad, proyectil y atributo principal)
const HERO_WEAPONS = {
    AXE: { noun: 'Hacha', shape: 'hammer', range: 1.5, atkSpeed: 0.9, atk: 14, projectile: 0 },
    VAMPIRE: { noun: 'Espada', shape: 'sword', range: 1.4, atkSpeed: 0.95, atk: 13, projectile: 0 },
    SNIPER: { noun: 'Rifle', shape: 'spear', range: 5, atkSpeed: 0.85, atk: 11, projectile: 11 },
    ASSASSIN: { noun: 'Dagas', shape: 'dagger', range: 1.3, atkSpeed: 1.15, atk: 10, projectile: 0 },
    DANCER: { noun: 'Espadas Gemelas', shape: 'sword', range: 1.3, atkSpeed: 1.05, atk: 10, projectile: 0 },
    ARCANIST: { noun: 'Báculo', shape: 'staff', range: 5, atkSpeed: 0.8, atk: 9, projectile: 10 },
    FROSTWITCH: { noun: 'Vara Helada', shape: 'staff', range: 4, atkSpeed: 0.7, atk: 9, projectile: 10 },
    NECROMANCER: { noun: 'Guadaña', shape: 'spear', range: 3, atkSpeed: 0.85, atk: 10, projectile: 10 },
    VOIDSAGE: { noun: 'Cetro', shape: 'staff', range: 4, atkSpeed: 0.95, atk: 9, projectile: 10 },
    ALCHEMIST: { noun: 'Matraz', shape: 'orb', range: 3, atkSpeed: 0.7, atk: 9, projectile: 9 },
    ZEUS: { noun: 'Rayo', shape: 'crystal', range: 4.5, atkSpeed: 0.8, atk: 9, projectile: 12 }
};
const FISTS = { noun: 'Puños', range: 1.3, atkSpeed: 1.0, atk: 8, projectile: 0 };
const SLOT_NOUNS = { helm: 'Casco', armor: 'Coraza', gloves: 'Guantes', boots: 'Botas', amulet: 'Amuleto' };

// Innatos sin eventos (su efecto era un stat del héroe): como pieza, dan ese stat.
const INNATE_STATS = { DEADLY_STRIKE: { critChance: 15 }, BLOODLUST: { lifesteal: 15 } };

// --- CATÁLOGO: cada habilidad e innato de cada héroe, en una ranura ---
// La definitiva va en la armadura y el innato en el amuleto; la de movilidad en las botas; la primera que pega,
// en el arma; las demás en casco (pasivas) o guantes.
let TOWER_CATALOG = null;
function towerCatalog() {
    if (TOWER_CATALOG) return TOWER_CATALOG;
    TOWER_CATALOG = [];
    Object.values(HERO_TEMPLATES).forEach(t => {
        const skills = Object.values(HERO_SKILLS[t.key]);
        const used = new Set();
        const place = (skill, slot) => { used.add(slot); TOWER_CATALOG.push({ heroKey: t.key, skillId: skill.id, slot }); };
        const ult = skills.find(s => s.isUltimate);
        if (ult) place(ult, 'armor');
        const normals = skills.filter(s => !s.isUltimate);
        const mobility = normals.find(s => s.tags.includes('MOVILIDAD'));
        if (mobility) place(mobility, 'boots');
        const hitter = normals.find(s => !used.has('weapon') && s !== mobility && s.kind === 'active' && s.tags.some(x => x === 'FÍSICO' || x === 'MÁGICO' || x === 'PURO'));
        if (hitter) place(hitter, 'weapon');
        normals.filter(s => s !== mobility && s !== hitter).forEach(s => {
            const order = s.kind === 'passive' ? ['helm', 'gloves', 'weapon', 'boots'] : ['gloves', 'helm', 'weapon', 'boots'];
            place(s, order.find(o => !used.has(o)) || 'gloves');
        });
        TOWER_CATALOG.push({ heroKey: t.key, innateId: t.innate.id, slot: 'amulet' });
    });
    return TOWER_CATALOG;
}

// --- CALIDADES Y AFIJOS (como Diablo) ---
const ITEM_QUALITY = {
    normal: { name: 'Normal', color: '#e9ecef', ink: '#2b2118', affixes: 0 },
    magic: { name: 'Mágico', color: '#4dabf7', ink: '#1d4e89', affixes: [1, 2] },
    rare: { name: 'Raro', color: '#ffd43b', ink: '#9a6b00', affixes: [3, 4] }
};
const AFFIXES = [
    { key: 'flatAtk', name: 'Feroz', roll: f => 3 + 2 * f, label: v => `+${v} daño` },
    { key: 'maxHp', name: 'del Oso', roll: f => 20 + 12 * f, label: v => `+${v} vida` },
    { key: 'armor', name: 'Blindado', roll: f => 1 + 0.6 * f, label: v => `+${v} armadura` },
    { key: 'atkSpeedPct', name: 'Veloz', roll: f => 0.04 + 0.015 * f, label: v => `+${Math.round(v * 100)}% vel. de ataque` },
    { key: 'critChance', name: 'Certero', roll: f => 3 + f, label: v => `+${v}% crítico` },
    { key: 'lifesteal', name: 'Sanguinario', roll: f => 3 + f, label: v => `+${v}% robo de vida` },
    { key: 'spellAmp', name: 'Arcano', roll: f => 5 + 2 * f, label: v => `+${v}% amplificación de hechizo` },
    { key: 'maxMana', name: 'del Sabio', roll: f => 25 + 10 * f, label: v => `+${v} maná` },
    { key: 'manaRegen', name: 'Sereno', roll: f => 0.5 + 0.2 * f, label: v => `+${v} maná/s` },
    { key: 'hpRegen', name: 'del Troll', roll: f => 0.6 + 0.3 * f, label: v => `+${v} vida/s` },
    { key: 'moveSpeedPct', name: 'del Viento', roll: f => 0.04 + 0.01 * f, label: v => `+${Math.round(v * 100)}% vel. de movimiento` },
    { key: 'magicResist', name: 'del Hechicero', roll: f => 5 + 2 * f, label: v => `+${v}% resistencia mágica` },
    { key: 'str', name: 'del Titán', roll: f => 2 + f, label: v => `+${v} Fuerza` },
    { key: 'agi', name: 'del Lince', roll: f => 2 + f, label: v => `+${v} Agilidad` },
    { key: 'int', name: 'del Búho', roll: f => 2 + f, label: v => `+${v} Inteligencia` }
];
const round1 = v => Math.round(v * 100) / 100;

function rollQuality(floor) {
    const r = Math.random(), rare = 0.06 + 0.02 * floor, magic = 0.3 + 0.03 * floor;
    return r < rare ? 'rare' : r < rare + magic ? 'magic' : 'normal';
}

let towerItemSeq = 0;
// Crea una pieza al azar (o la indicada) para el nivel `floor` de la torre.
function makeTowerItem(floor = 1, entry = pickRandom(towerCatalog()), quality = rollQuality(floor)) {
    const t = HERO_TEMPLATES[entry.heroKey];
    const item = { id: ++towerItemSeq, heroKey: entry.heroKey, slot: entry.slot, skillId: entry.skillId || null, innateId: entry.innateId || null,
        quality, level: 1, xp: 0, floor, affixes: [], boosts: {}, skillLevel: 1, pendingChoices: 0 };
    const q = ITEM_QUALITY[quality];
    const n = Array.isArray(q.affixes) ? q.affixes[0] + Math.floor(Math.random() * (q.affixes[1] - q.affixes[0] + 1)) : q.affixes;
    shuffle(AFFIXES.slice()).slice(0, n).forEach(a => item.affixes.push({ key: a.key, name: a.name, value: round1(a.roll(floor)) }));
    const noun = entry.slot === 'weapon' ? HERO_WEAPONS[entry.heroKey].noun : SLOT_NOUNS[entry.slot];
    const prefix = item.affixes.find(a => !a.name.startsWith('del '));
    const suffix = item.affixes.find(a => a.name.startsWith('del '));
    item.name = `${noun}${prefix && quality !== 'normal' ? ' ' + prefix.name : ''} de ${t.name}${suffix && quality === 'magic' ? ' ' + suffix.name : ''}`;
    return item;
}

// Habilidad que trae la pieza (el innato, envuelto como pasiva para que reaccione a eventos).
function itemSkill(item) {
    if (item.skillId) return SKILL_INDEX[item.skillId];
    if (!item.innateId) return null;
    if (!itemSkill.cache) itemSkill.cache = {};
    if (!itemSkill.cache[item.innateId]) {
        const innate = HERO_TEMPLATES[item.heroKey].innate;
        const w = Object.create(innate);
        Object.assign(w, { kind: 'passive', heroKey: item.heroKey, isInnateItem: true, tags: innate.tags || [], hooks: innate.hooks || {}, values: {} });
        itemSkill.cache[item.innateId] = w;
    }
    return itemSkill.cache[item.innateId];
}

// Stats que da la pieza (base de su ranura + afijos + innato convertido en stat)
function itemMods(item) {
    const mods = {};
    const add = (k, v) => { mods[k] = round1((mods[k] || 0) + v); };
    if (SLOT_STATS[slotKind(item.slot)]) Object.entries(SLOT_STATS[slotKind(item.slot)](item.level)).forEach(([k, v]) => add(k, v));
    item.affixes.forEach(a => add(a.key, a.value));
    if (item.innateId && INNATE_STATS[item.innateId]) Object.entries(INNATE_STATS[item.innateId]).forEach(([k, v]) => add(k, v));
    Object.entries(item.statBoosts || {}).forEach(([k, v]) => { if (k !== 'weaponAtk') add(k, v); }); // el daño del arma va al ataque
    return mods;
}

// --- EL AVENTURERO ---
const ADVENTURER = {
    key: 'ADVENTURER', name: 'Aventurero', symbol: '☺', primaryAttr: 'STR', role: 'Sin clase',
    attributes: { str: [15, 0], agi: [15, 0], int: [15, 0] },
    baseHp: 140, baseAtk: FISTS.atk, baseAtkSpeed: FISTS.atkSpeed, baseAttackRange: FISTS.range,
    baseArmor: 1, baseMagicResist: 10, baseHpRegen: 0.8, baseMaxMana: 90, baseManaRegen: 1.5, baseMoveSpeed: 3.2, baseProjectileSpeed: 0,
    baseCritChance: 5, baseEvasion: 5, baseSpellAmp: 0, baseLifesteal: 0,
    description: 'Sin clase: tu forma de pelear sale del equipo que encontrás.',
    scaling: { stat: 'maxHp', perKills: 10, perKillsAmount: 5, perHeroKill: 20 },
    innate: { id: 'ADVENTURER_INNATE', name: 'Sin clase', tags: [], description: 'Tu clase la arma tu equipo: cada pieza trae la habilidad de un héroe.' }
};

// Habilidad propia del Aventurero: siempre la tiene (tecla E), así arranca con algo que lanzar y los innatos
// "al lanzar" (Arcanista, Sabio del Vacío, Zeus) funcionan desde el principio. No sale del equipo: sube con tu nivel.
const ADVENTURER_STRIKE = {
    id: 'ADVENTURER_GOLPE', name: 'Golpe Certero', kind: 'active', heroKey: 'ADVENTURER',
    tags: ['FÍSICO'],
    values: { cooldown: [7, 6.5, 6, 5.5], manaCost: 15, dmgMult: [1.5, 1.8, 2.1, 2.4] },
    levelEvery: 8, // sube un nivel cada 8 niveles del héroe (1, 9, 17, 25)
    description: 'Golpe con tu arma: {dmgMult%} de tu daño físico al enemigo más cercano en tu alcance. Sube con tu nivel (cada 8).',
    cast(caster) {
        const target = nearestEnemy(caster, caster.attackRange + 1);
        if (!target) { log('Golpe Certero: sin objetivo en alcance.'); return false; }
        const dmg = Math.round(caster.atk * val(this, caster, 'dmgMult'));
        const { dealt } = dealDamage(caster, target, dmg, 'physical');
        if (fxArena(caster)) fxText(target, '¡CERTERO!', '#c9a227', 11, 0.8);
        log(`🗡️ ¡Golpe Certero a ${target.label}! (-${dealt} HP)`);
        return true;
    }
};
SKILL_INDEX[ADVENTURER_STRIKE.id] = ADVENTURER_STRIKE;
function syncAdventurerStrike(hero) {
    if (!hero.hasSkill(ADVENTURER_STRIKE.id)) return;
    hero.skillLevels[ADVENTURER_STRIKE.id] = Math.min(maxSkillLevel(ADVENTURER_STRIKE), 1 + Math.floor((hero.level - 1) / ADVENTURER_STRIKE.levelEvery));
}

// Hechizo inicial: al empezar la run el aventurero recibe, ya equipada, una pieza normal con una habilidad activa
// al azar (ni definitiva ni de movilidad), así cada run arranca distinta y con algo para castear además del Golpe.
function starterSpellEntries() {
    return towerCatalog().filter(e => {
        const s = e.skillId && SKILL_INDEX[e.skillId];
        return s && s.kind === 'active' && !s.isUltimate && !s.tags.includes('MOVILIDAD');
    });
}
function giveStarterSpell(hero) {
    const item = makeTowerItem(1, pickRandom(starterSpellEntries()), 'normal');
    equipItem(hero, item);
    return item;
}

function giveTowerGear(hero) {
    hero.gear = Object.fromEntries(EQUIP_SLOTS.map(s => [s, null]));
    hero.bag = []; // { item, x, y }
    hero.skillBoosts = {};
}

// Ataque básico según el arma (o los puños) y nivel del arma.
function applyWeaponProfile(hero) {
    const w = hero.gear.weapon;
    const p = w ? HERO_WEAPONS[w.heroKey] : FISTS;
    hero.baseAtk = p.atk + (w ? 1.5 * (w.level - 1) + (w.statBoosts && w.statBoosts.weaponAtk || 0) : 0);
    hero.baseAtkSpeed = p.atkSpeed; hero.baseAttackRange = p.range; hero.baseProjectileSpeed = p.projectile;
    hero.primaryAttr = w ? HERO_TEMPLATES[w.heroKey].primaryAttr : 'STR';
}

// Rehace los efectos del equipo (uno permanente por pieza) y el ataque. Lo llaman equipar/desequipar/subir de nivel.
function applyGear(hero) {
    hero.effects = hero.effects.filter(e => !e.flags.includes('gear'));
    EQUIP_SLOTS.forEach(s => {
        const item = hero.gear[s];
        if (item) addEffect(hero, { id: 'GEAR_' + s, name: item.name, duration: Infinity, flags: ['gear', 'item', 'persistent'], mods: itemMods(item) });
    });
    applyWeaponProfile(hero);
    hero.recalculateStats();
}

function equipItem(hero, item, slot = null) {
    slot = slot || (item.slot === 'ring' ? (hero.gear.ring1 ? 'ring2' : 'ring1') : item.slot);
    if (slotKind(slot) !== item.slot) return false;
    const old = hero.gear[slot];
    if (old) unequipSlot(hero, slot, false);
    hero.bag = hero.bag.filter(b => b.item !== item);
    hero.gear[slot] = item;
    const skill = itemSkill(item);
    if (skill && !hero.skills.includes(skill)) { hero.addSkill(skill); hero.skillLevels[skill.id] = item.skillLevel; hero.skillBoosts[skill.id] = item.boosts; }
    applyGear(hero);
    if (old && !addToBag(hero, old)) dropOnFloor(hero, old);
    return true;
}

function unequipSlot(hero, slot, toBag = true) {
    const item = hero.gear[slot];
    if (!item) return null;
    if (toBag && !bagSpotFor(hero, item)) { log('🎒 No hay lugar en el inventario.'); return null; }
    hero.gear[slot] = null;
    const skill = itemSkill(item);
    if (skill && hero.skills.includes(skill)) { hero.removeSkill(skill); delete hero.skillBoosts[skill.id]; }
    applyGear(hero);
    if (toBag) addToBag(hero, item);
    return item;
}

// --- INVENTARIO EN GRILLA ---
function itemSize(item) { return TOWER_SLOTS[slotKind(item.slot)].size; }
function bagFree(hero, x, y, w, h, ignore = null) {
    if (x < 0 || y < 0 || x + w > BAG.cols || y + h > BAG.rows) return false;
    return !hero.bag.some(b => b.item !== ignore && x < b.x + itemSize(b.item)[0] && x + w > b.x && y < b.y + itemSize(b.item)[1] && y + h > b.y);
}
function bagSpotFor(hero, item) {
    const [w, h] = itemSize(item);
    for (let x = 0; x < BAG.cols; x++) for (let y = 0; y < BAG.rows; y++) if (bagFree(hero, x, y, w, h)) return { x, y };
    return null;
}
function addToBag(hero, item, at = null) {
    const spot = at && bagFree(hero, at.x, at.y, ...itemSize(item), item) ? at : bagSpotFor(hero, item);
    if (!spot) return false;
    hero.bag = hero.bag.filter(b => b.item !== item);
    hero.bag.push({ item, x: spot.x, y: spot.y });
    return true;
}

// --- MEJORAS DE HABILIDAD (forjar): qué se puede subir y cómo ---
// dir: +1 mejora subiendo (más daño), -1 mejora bajando (menos enfriamiento); int: sube de a 1; cap: tope.
const BOOSTABLE = {
    dmgMult: { label: 'daño', dir: 1 }, baseDmg: { label: 'daño base', dir: 1 }, intRatio: { label: 'escalado con Inteligencia', dir: 1 },
    bonusDmg: { label: 'daño extra', dir: 1 }, dmgPerSecond: { label: 'daño por segundo', dir: 1 }, waveMult: { label: 'daño de la onda', dir: 1 },
    strikeBonus: { label: 'daño del golpe', dir: 1 }, missingHpRatio: { label: 'daño por vida faltante', dir: 1 }, hpDmgPct: { label: 'daño por vida', dir: 1 },
    radius: { label: 'área', dir: 1 }, slowRadius: { label: 'área de la ralentización', dir: 1 }, range: { label: 'alcance', dir: 1 }, jumpRange: { label: 'alcance de los saltos', dir: 1 },
    duration: { label: 'duración', dir: 1 }, buffDuration: { label: 'duración de la mejora', dir: 1 }, slowDuration: { label: 'duración de la ralentización', dir: 1 },
    stunDuration: { label: 'aturdimiento', dir: 1 }, rootDuration: { label: 'inmovilización', dir: 1 }, stun: { label: 'aturdimiento', dir: 1 }, freeze: { label: 'congelamiento', dir: 1 },
    slow: { label: 'ralentización', dir: 1, cap: 0.9 }, slowPct: { label: 'ralentización', dir: 1, cap: 0.9 }, attackerSlow: { label: 'ralentización al atacante', dir: 1, cap: 0.9 },
    stunChance: { label: 'probabilidad de aturdir', dir: 1, cap: 1 }, critChance: { label: 'probabilidad de crítico', dir: 1, cap: 100 }, chance: { label: 'probabilidad', dir: 1, cap: 100 },
    atkSpeedPct: { label: 'vel. de ataque', dir: 1 }, atkPct: { label: 'daño de ataque', dir: 1 }, moveSpeedPct: { label: 'vel. de movimiento', dir: 1 },
    dmgReduction: { label: 'reducción de daño', dir: 1, cap: 0.8 }, healPct: { label: 'curación', dir: 1 }, hpPerSecond: { label: 'curación por segundo', dir: 1 },
    lifesteal: { label: 'robo de vida', dir: 1 }, lifestealPerStep: { label: 'robo de vida', dir: 1 }, evasion: { label: 'evasión', dir: 1, cap: 80 },
    armorReduction: { label: 'reducción de armadura', dir: 1 }, armorBonus: { label: 'armadura', dir: 1 }, critMult: { label: 'multiplicador de crítico', dir: 1 },
    dmgPerStack: { label: 'daño por carga', dir: 1 }, atkSpeedPerStack: { label: 'vel. de ataque por carga', dir: 1 }, stackAtk: { label: 'daño por carga', dir: 1 },
    atkPerStep: { label: 'daño por tramo', dir: 1 }, farBonus: { label: 'bonus a distancia', dir: 1 },
    maxStacks: { label: 'cargas máximas', dir: 1, int: true }, stackCap: { label: 'tope de cargas', dir: 1 }, jumps: { label: 'saltos', dir: 1, int: true },
    hitsNeeded: { label: 'golpes necesarios', dir: -1, int: true, min: 2 }, waveEvery: { label: 'ataques por onda', dir: -1, int: true, min: 1 },
    cooldown: { label: 'enfriamiento', dir: -1 }, manaCost: { label: 'costo de maná', dir: -1 }, internalCooldown: { label: 'tiempo entre activaciones', dir: -1 },
    payback: { label: 'daño devuelto al terminar', dir: -1 }
};
const BOOST_PCT = 0.15; // cada mejora: +15% (o −12% en lo que conviene bajar), o ±1 en los enteros

// Valor de una habilidad con las mejoras de la pieza (lo usa val() en progression.js).
function applySkillBoost(skill, hero, key, v) {
    const b = hero && hero.skillBoosts && hero.skillBoosts[skill.id] && hero.skillBoosts[skill.id][key];
    if (!b || typeof v !== 'number') return v;
    const meta = BOOSTABLE[key] || {};
    let out = meta.int ? v + b : v * Math.pow(meta.dir < 0 ? 1 - BOOST_PCT * 0.8 : 1 + BOOST_PCT, b);
    if (meta.int) out = Math.max(meta.min || 1, Math.round(out));
    if (meta.cap !== undefined) out = Math.min(meta.cap, out);
    return out;
}

// Opciones para forjar una pieza que subió de nivel: 3 entre las mejoras de su habilidad, subir el nivel de la
// habilidad y mejorar la pieza misma.
function forgeOptions(item) {
    const skill = itemSkill(item);
    const opts = [];
    if (skill && skill.values) Object.keys(skill.values).filter(k => BOOSTABLE[k]).forEach(k => {
        const m = BOOSTABLE[k];
        opts.push({ type: 'boost', key: k, text: m.int ? `${m.dir > 0 ? '+1' : '−1'} ${m.label}` : `${m.dir > 0 ? '+15%' : '−12%'} ${m.label}`, skillName: skill.name });
    });
    if (skill && !skill.isInnateItem) {
        const max = skill.isUltimate ? 3 : 4;
        if (item.skillLevel < max) opts.push({ type: 'skillLevel', text: `Habilidad a nivel ${item.skillLevel + 1}`, skillName: skill.name });
    }
    opts.push(item.slot === 'weapon' ? { type: 'stat', key: 'weaponAtk', amount: 4, text: '+4 daño del arma' }
        : { type: 'stat', key: 'maxHp', amount: 30, text: '+30 vida de la pieza' });
    return shuffle(opts).slice(0, 3);
}

function applyForge(hero, item, opt) {
    if (opt.type === 'boost') item.boosts[opt.key] = (item.boosts[opt.key] || 0) + 1;
    else if (opt.type === 'skillLevel') item.skillLevel++;
    else { item.statBoosts = item.statBoosts || {}; item.statBoosts[opt.key] = (item.statBoosts[opt.key] || 0) + opt.amount; }
    const skill = itemSkill(item);
    if (skill && hero.skills.includes(skill)) { hero.skillLevels[skill.id] = item.skillLevel; hero.skillBoosts[skill.id] = item.boosts; }
    applyGear(hero);
    log(`⚒️ Forjaste ${item.name}: ${opt.text}${opt.skillName ? ` (${opt.skillName})` : ''}.`);
}

// --- EXPERIENCIA DE LAS PIEZAS (por uso) ---
const ITEM_XP = { weaponHit: 1, weaponKill: 3, skillCast: 4, damageTaken: 1 / 25, gearKill: 0.5 };
function itemXpToNext(item) { return Math.round((item.slot === 'weapon' ? 18 : 40) * Math.pow(item.level, 1.35)); }
function giveItemXp(hero, item, amount) {
    if (!item || amount <= 0) return;
    item.xp += amount;
    while (item.xp >= itemXpToNext(item)) {
        item.xp -= itemXpToNext(item);
        item.level++;
        item.pendingChoices++;
        applyGear(hero);
        if (hero === player) { log(`⚒️ ¡${item.name} subió a nivel ${item.level}! Elegí cómo crece.`); sfx('levelup'); }
    }
}
// Reparte experiencia según el evento (lo llaman los hooks del aventurero).
function gearEvent(hero, event, payload) {
    if (!hero.gear) return;
    const g = hero.gear;
    if (event === 'onHit') giveItemXp(hero, g.weapon, ITEM_XP.weaponHit);
    if (event === 'onKill') { giveItemXp(hero, g.weapon, ITEM_XP.weaponKill); ['amulet', 'ring1', 'ring2'].forEach(s => giveItemXp(hero, g[s], ITEM_XP.gearKill)); }
    if (event === 'onDamaged' && payload.dealt > 0) ['helm', 'armor', 'gloves', 'boots'].forEach(s => giveItemXp(hero, g[s], payload.dealt * ITEM_XP.damageTaken));
    if (event === 'onCast') EQUIP_SLOTS.forEach(s => { if (g[s] && itemSkill(g[s]) === payload.skill) giveItemXp(hero, g[s], ITEM_XP.skillCast * (s === 'weapon' ? 1 : 0.5)); });
}
ADVENTURER.innate.hooks = {
    onHit(owner, p) { gearEvent(owner, 'onHit', p); },
    onKill(owner, p) { gearEvent(owner, 'onKill', p); },
    onDamaged(owner, p) { gearEvent(owner, 'onDamaged', p); },
    onCast(owner, p) { gearEvent(owner, 'onCast', p); }
};
function pendingForge(hero) { return EQUIP_SLOTS.map(s => hero.gear[s]).concat(hero.bag.map(b => b.item)).find(i => i && i.pendingChoices > 0) || null; }

// --- BOTÍN: cofres y lo que sueltan los creeps ---
const LOOT = { creepChance: 0.04, chestsPerFloor: 5, guardianDrops: 2 }; // creepChance: con ~140 creeps por piso
function dropOnFloor(hero, item, x = hero.x, y = hero.y) {
    const level = hero.arena;
    if (!level || !level.drops) return;
    level.drops.push({ x, y, item });
}
function towerLootOnKill(level, c, killer) {
    if (!killer || !killer.isHero) return;
    if (c.carrier) carrierDrops(level, c); // el portador suelta tu equipo (towerWorld.js)
    if (towerRun && killer === player) { const s = towerRun.stats; s.kills++; s.gold += c.gold || 0; if (c.champion) s.champions++; if (c.isGuardian) s.guardians++; }
    if (c.isGuardian) { for (let i = 0; i < LOOT.guardianDrops; i++) level.drops.push({ x: c.x, y: c.y, item: makeTowerItem(level.floor, undefined, i === 0 ? 'rare' : rollQuality(level.floor)) }); return; }
    if (c.champion) { if (Math.random() < CHAMPION.dropChance) level.drops.push({ x: c.x, y: c.y, item: makeTowerItem(level.floor, undefined, Math.random() < 0.3 ? 'rare' : 'magic') }); return; }
    if (Math.random() < LOOT.creepChance * (c.isChestGuard ? 0 : 1) * (towerIsNight() ? DAYNIGHT.nightLoot : 1) * (1 + CAVE.lootPerDepth * (level.depth || 0))) level.drops.push({ x: c.x, y: c.y, item: makeTowerItem(level.floor + (level.depth || 0)) });
}
// Recoge lo que hay en tu casilla (si entra en el inventario); abre el cofre si ya no tiene custodios.
function towerPickup(hero) {
    const level = hero.arena;
    (level.chests || []).forEach(ch => {
        if (ch.open || ch.x !== hero.x || ch.y !== hero.y) return;
        if (ch.guards.some(g => g.isAlive())) { if (!ch.warned) { ch.warned = true; log('🔒 El cofre está custodiado: vencé a sus guardias.'); } return; }
        ch.open = true;
        if (ch.treasure) { for (let i = 0; i < 2; i++) level.drops.push({ x: ch.x, y: ch.y, item: makeTowerItem(level.floor + level.depth, undefined, 'rare') }); log('💎 ¡El tesoro de la cueva!'); }
        else level.drops.push({ x: ch.x, y: ch.y, item: makeTowerItem(level.floor + (level.depth || 0), undefined, Math.random() < 0.25 + 0.1 * (level.depth || 0) ? 'rare' : 'magic') });
        log('🧰 ¡Abriste el cofre!'); sfx('coin');
    });
    level.drops = level.drops.filter(d => {
        if (d.x !== hero.x || d.y !== hero.y) return true;
        if (!addToBag(hero, d.item)) { if (!d.warned) { d.warned = true; log(`🎒 Inventario lleno: no podés levantar ${d.item.name}.`); } return true; }
        log(`🎒 Levantaste ${d.item.name} (${ITEM_QUALITY[d.item.quality].name}).`); sfx('coin');
        return false;
    });
}
// Cofres de un nivel: en salas al azar, con un custodio fuerte o un grupo.
function placeChests(level, rooms) {
    level.chests = [];
    shuffle(rooms.slice()).slice(0, LOOT.chestsPerFloor).forEach(r => {
        const ch = { x: r.x + 1, y: r.y + 1, open: false, guards: [] };
        const strong = Math.random() < 0.5;
        const n = strong ? 1 : 3;
        for (let i = 0; i < n; i++) {
            const type = pickRandom(towerCreepPool(level.floor));
            const lvl = level.floor + (strong ? 2 : 1);
            const g = makeCreep(type, Math.min(r.x + r.w - 1, ch.x + 1 + i), ch.y + (i % 2), TOWER.creepMult(lvl) * (strong ? 1.6 : 1), false, 0);
            Object.assign(g, { arena: level, level: lvl, xp: Math.round(type.xp * TOWER.xpMult(lvl) * (strong ? 2 : 1)), isChestGuard: true, spawnTime: -1e9 });
            if (strong) g.label = `${type.label} Custodio`;
            level.creeps.push(g); ch.guards.push(g);
        }
        level.chests.push(ch);
    });
}

// IA (piloto automático y pruebas): equipa lo que levantó si la ranura está vacía o la pieza es de mejor calidad, y forja
// eligiendo la primera opción.
function aiManageGear(hero) {
    const rank = { normal: 0, magic: 1, rare: 2 };
    hero.bag.slice().forEach(({ item }) => {
        const slot = item.slot === 'ring' ? (!hero.gear.ring1 ? 'ring1' : !hero.gear.ring2 ? 'ring2' : 'ring1') : item.slot;
        const cur = hero.gear[slot];
        if (!cur || rank[item.quality] > rank[cur.quality] || (rank[item.quality] === rank[cur.quality] && item.level > cur.level)) equipItem(hero, item, slot);
    });
    let item;
    while ((item = pendingForge(hero))) { item.pendingChoices--; applyForge(hero, item, forgeOptions(item)[0]); }
}
