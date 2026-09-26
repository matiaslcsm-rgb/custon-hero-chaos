// Progresión del héroe: experiencia y niveles, puntos y niveles de habilidad (estilo Dota 2),
// bonus permanentes, opciones de draft y objetos del destino. Reglas en DISEÑO.md §3 y §4.

const KIT_SIZE = 4;            // elecciones de draft en total (activas + pasivas)
const MAX_HERO_LEVEL = 30;
const ULT_LEVEL_STEP = 6;      // la definitiva sube 1 nivel cada 6 niveles del héroe (6, 12, 18)
const DRAFT_OPTIONS = { normal: 3, fragment: 4, book: 6 };
const FRAGMENT_SELL_PRICE = 75;

// Índice de todas las habilidades por id. Cada una recuerda su héroe natural en `heroKey`.
const SKILL_INDEX = {};
Object.entries(HERO_SKILLS).forEach(([heroKey, skills]) => {
    Object.values(skills).forEach(s => { s.heroKey = heroKey; SKILL_INDEX[s.id] = s; });
});
const ALL_SKILLS = Object.values(SKILL_INDEX);

// --- VALORES POR NIVEL ---
function maxSkillLevel(skill) { return skill.isUltimate ? 3 : 4; }
function skillLevel(hero, skill) { return hero.skillLevels[skill.id] || 0; }

// Valor de una habilidad en un nivel dado. Con nivel 0 devuelve el de nivel 1.
function valueAt(skill, key, level) {
    const v = skill.values[key];
    if (!Array.isArray(v)) return v;
    return v[Math.max(0, Math.min(v.length, level) - 1)];
}
// Valor de una habilidad según el nivel que tiene en ese héroe (lo usan cast() y los hooks).
function val(skill, hero, key) { return valueAt(skill, key, skillLevel(hero, skill)); }

// Texto de un valor: "100/120/140/160%" con el nivel actual resaltado (level 0 = ninguno).
function formatKey(skill, key, level, pct) {
    const v = skill.values && skill.values[key];
    if (v === undefined) return null;
    const fmt = x => String(+(pct ? x * 100 : x).toFixed(2));
    const suffix = pct ? '%' : '';
    if (!Array.isArray(v)) return fmt(v) + suffix;
    return v.map((x, i) => (i + 1 === level ? `<b class="cur">${fmt(x)}</b>` : fmt(x))).join('/') + suffix;
}

// Completa los marcadores {clave} / {clave%} de la descripción con los valores por nivel.
function describeSkill(skill, level) {
    return skill.description.replace(/\{(\w+)(%?)\}/g, (m, key, pct) => formatKey(skill, key, level, !!pct) ?? m);
}

function skillCostLine(skill, level) {
    if (skill.kind === 'passive') return 'Pasiva';
    return `Maná ${formatKey(skill, 'manaCost', level)} · Enfriamiento ${formatKey(skill, 'cooldown', level)}s`;
}

// --- EXPERIENCIA Y NIVELES ---
function xpToNext(level) { return 100 + (level - 1) * 40; }

function gainXp(hero, amount) {
    if (hero.level >= MAX_HERO_LEVEL || amount <= 0) return;
    hero.xp += amount;
    while (hero.level < MAX_HERO_LEVEL && hero.xp >= xpToNext(hero.level)) {
        hero.xp -= xpToNext(hero.level);
        hero.level++;
        hero.skillPoints++;
        log(`⬆️ ¡Nivel ${hero.level}! +1 punto de habilidad.`);
    }
    resolveExcessPoints(hero);
}

// Motivo por el que no se puede subir una habilidad (null = se puede).
function levelUpBlocker(hero, skill) {
    const lvl = skillLevel(hero, skill);
    if (lvl >= maxSkillLevel(skill)) return 'Nivel máximo';
    if (skill.isUltimate && hero.level < ULT_LEVEL_STEP * (lvl + 1)) return `Requiere nivel ${ULT_LEVEL_STEP * (lvl + 1)}`;
    if (hero.skillPoints <= 0) return 'Sin puntos';
    return null;
}

function levelUpSkill(hero, skill) {
    if (levelUpBlocker(hero, skill)) return false;
    hero.skillPoints--;
    hero.skillLevels[skill.id] = skillLevel(hero, skill) + 1;
    log(`✨ ${skill.name} sube a nivel ${hero.skillLevels[skill.id]}.`);
    resolveExcessPoints(hero);
    return true;
}

// Con el kit completo y todo al máximo, cada punto se convierte en +1 a los tres atributos.
// Si falta algo (kit incompleto o la definitiva esperando nivel), los puntos se guardan.
function resolveExcessPoints(hero) {
    if (hero.skillPoints <= 0 || hero.skills.length < KIT_SIZE) return;
    if (!hero.skills.every(s => skillLevel(hero, s) >= maxSkillLevel(s))) return;
    const n = hero.skillPoints;
    hero.skillPoints = 0;
    hero.str += n; hero.agi += n; hero.int += n;
    hero.recalculateStats();
    log(`💪 Kit al máximo: +${n} a Fuerza, Agilidad e Inteligencia.`);
}

// --- BONUS PERMANENTES (escalado del héroe y de las definitivas) ---
const PERMANENT_LABELS = { armor: 'armadura', atk: 'daño de ataque', critChance: '% crítico', lifesteal: '% robo de vida', maxHp: 'HP máximo' };

function grantPermanent(hero, stat, amount, sourceName) {
    hero.bonus[stat] = (hero.bonus[stat] || 0) + amount;
    hero.recalculateStats();
    if (sourceName) log(`📈 ${sourceName}: +${amount} ${PERMANENT_LABELS[stat]} permanente.`);
}

// --- DRAFT ---
// Opciones de draft: 1 garantizada entre las naturales del héroe (si le queda alguna) + el resto
// del pool global. Nunca ofrece habilidades que ya tiene ni las de `exclude` (ej: la recién reemplazada).
function draftOptions(hero, count, exclude = []) {
    const blocked = new Set([...hero.skills.map(s => s.id), ...exclude]);
    const available = ALL_SKILLS.filter(s => !blocked.has(s.id));
    const natural = shuffle(available.filter(s => s.heroKey === hero.key));
    const picks = natural.length ? [natural[0]] : [];
    shuffle(available.filter(s => !picks.includes(s))).forEach(s => { if (picks.length < count) picks.push(s); });
    return shuffle(picks);
}

function naturalHeroName(skill) { return HERO_TEMPLATES[skill.heroKey].name; }
