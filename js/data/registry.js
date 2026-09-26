// Registro de héroes. Cada héroe vive en su propio archivo en js/data/heroes/ y se registra con
// registerHero(plantilla, habilidades). Para sumar un héroe: crear su archivo y agregarlo en index.html
// (antes de progression.js). Reglas y criterios: DISEÑO.md §2 y §6.
//
// PLANTILLA (primer argumento):
//   key, name, symbol (1 carácter, único), primaryAttr ('STR' | 'AGI' | 'INT'), role, description
//   attributes  [base, ganancia por nivel] de Fuerza, Agilidad e Inteligencia (estilo Dota 2).
//               El atributo principal crece más rápido. Qué da cada punto: ATTRIBUTE_RULES en hero.js.
//   base*       stats base (vida, daño, velocidad de ataque, rango, armadura, etc.)
//   scaling     escalado chico propio del héroe (Crecimiento): qué stat sube, cuánto por cada N creeps
//               eliminados y cuánto por ganar un duelo 1v1 (perHeroKill queda listo para los duelos).
//   innate      la habilidad innata, permanente y no drafteable. Reacciona a eventos con `hooks`
//               (ver effects.js) y tiene que funcionar con cualquier kit drafteado.
//
// HABILIDADES (segundo argumento): 3 normales + 1 definitiva (isUltimate). Todas se draftean.
//   id, name, description
//   kind        'active' (se lanza con tecla) | 'passive' (reacciona a eventos con `hooks`, no usa tecla)
//   isUltimate  true en la definitiva (3 niveles, uno cada 6 niveles del héroe)
//   tags        etiquetas de data/tags.js; las usan las sinergias, los ítems de contra y los creeps
//   values      números de la habilidad. Un array = un valor por nivel (4 en normales, 3 en definitivas);
//               un número suelto = igual en todos los niveles. cooldown y manaCost van acá también.
//               Dentro de cast/hooks se leen con val(this, caster, 'clave') según el nivel actual.
//   description texto con marcadores que se completan desde `values`:
//               {clave} muestra el valor tal cual; {clave%} lo muestra como porcentaje (0.25 → 25%).
//   cast(caster) solo las activas. `caster` es el héroe que la lanza; `this` es la habilidad.
//               Devuelve false si no pudo lanzarse (ej: sin objetivo): no se cobra maná ni cooldown.
//   hooks       solo las pasivas: reacciones a eventos (`this` es la habilidad). Para algo "por segundo"
//               usar everyInterval(owner, this.id, dt).
//
// La tecla NO es parte de la habilidad: se asigna por orden de aprendizaje (ver Hero.addSkill).
// Regla para agregar habilidades: tienen que funcionar solas en cualquier héroe (ver DISEÑO.md §6).

const HERO_TEMPLATES = {};
const HERO_SKILLS = {};

function registerHero(template, skills) {
    HERO_TEMPLATES[template.key] = template;
    HERO_SKILLS[template.key] = skills;
}

function scalingStatLabel(stat) { return PERMANENT_LABELS[stat] || stat; }
