// IA básica de héroes. Controla a un héroe durante la oleada (moverse, atacar, lanzar habilidades) y fuera
// de ella (repartir puntos, draftear, comprar). La usa el Piloto automático del jugador (botón o tecla P),
// las pruebas y las mediciones de balance, y más adelante los héroes rivales (fase F).
//
//   A distancia (tiradores y magos): atacan al enemigo más cercano y retroceden si alguno se acerca
//   demasiado, sin salir de su rango de ataque. Si no hay nadie a tiro, avanzan.
//   Cuerpo a cuerpo: van al enemigo más cercano.
//   Los dos persiguen primero a los objetivos prioritarios cercanos (ej: Sanadores).
//   Habilidades: de área con 2+ enemigos cerca, definitiva con 3+ o con el jefe cerca, mejoras cuando hay pelea,
//   de un objetivo cuando están listas.

const AI = {
    thinkInterval: 0.25,  // cada cuánto decide qué habilidades lanzar (segundos)
    rangedFrom: 2.5,      // desde este rango de ataque se considera héroe a distancia
    kiteDistance: 0.6,    // retrocede si el enemigo más cercano está a menos de este % de su rango
    nearRadius: 3.5,      // radio para contar enemigos "cerca" (decidir habilidades de área y definitivas)
    focusRadius: 8        // busca objetivos prioritarios (ej: Sanadores) hasta esta distancia
};

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function isRanged(hero) { return hero.attackRange >= AI.rangedFrom; }

// --- MOVIMIENTO ---
// Devuelve la dirección del próximo paso: { dx, dy } con valores -1, 0 o 1.
function aiMoveDirection(hero) {
    const enemies = enemiesOf(hero).filter(c => c.isAlive());
    if (!enemies.length) return { dx: 0, dy: 0 };
    const nearest = nearestEnemy(hero);
    const range = effRange(hero);
    // Objetivo a perseguir: uno prioritario cercano (ej: Sanador) o, si no hay, el más cercano
    const focus = enemies.filter(c => c.priority > 0 && distance(hero, c) <= AI.focusRadius)
        .sort((a, b) => b.priority - a.priority || distance(hero, a) - distance(hero, b))[0] || nearest;
    if (isRanged(hero)) {
        if (distance(hero, nearest) < range * AI.kiteDistance) return retreatStep(hero, enemies);
        return distance(hero, focus) > range ? stepToward(hero, focus) : { dx: 0, dy: 0 };
    }
    return distance(hero, focus) > Math.max(1, hero.attackRange) ? stepToward(hero, focus) : { dx: 0, dy: 0 };
}

function stepToward(hero, target) {
    return { dx: Math.sign(target.x - hero.x), dy: Math.sign(target.y - hero.y) };
}

// Elige la casilla vecina que más lo aleja del enemigo más cercano a ella. Si está acorralado, se queda.
function retreatStep(hero, enemies) {
    const safety = (x, y) => Math.min(...enemies.map(c => Math.hypot(c.x - x, c.y - y)));
    let best = { dx: 0, dy: 0 }, bestScore = safety(hero.x, hero.y);
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const x = hero.x + dx, y = hero.y + dy;
            if ((!dx && !dy) || x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
            const score = safety(x, y);
            if (score > bestScore) { bestScore = score; best = { dx, dy }; }
        }
    }
    return best;
}

// --- HABILIDADES ---
function aiWantsToCast(hero, skill, nearCount, bossNear) {
    const dealsDamage = skill.tags.some(t => t === 'FÍSICO' || t === 'MÁGICO' || t === 'PURO');
    if (skill.isUltimate) return nearCount >= 3 || bossNear;
    if (skill.tags.includes('ÁREA')) return nearCount >= 2 || bossNear;
    if (skill.tags.includes('MOVILIDAD') && isRanged(hero)) return nearCount === 0; // a distancia: solo para acercarse
    if (!dealsDamage) return nearCount >= 1; // mejoras y controles propios: cuando hay pelea
    return true; // de un objetivo: si no hay objetivo, cast() devuelve false y no se cobra nada
}

function aiCastSkills(hero) {
    const near = enemiesOf(hero).filter(c => c.isAlive() && distance(hero, c) <= AI.nearRadius);
    const bossNear = near.some(c => c.isBoss);
    hero.skills.forEach(s => {
        if (s.kind !== 'active' || skillLevel(hero, s) === 0 || (hero.cooldowns[s.id] || 0) > 0) return;
        if (!aiWantsToCast(hero, s, near.length, bossNear)) return;
        tryCastSkill(hero, s, { quiet: true });
    });
}

// --- FUERA DEL COMBATE ---
// Puntos: primero la definitiva cuando se puede; después la habilidad con menos niveles.
function aiSpendPoints(hero) {
    while (hero.skillPoints > 0) {
        const candidates = hero.skills.filter(s => !levelUpBlocker(hero, s));
        if (!candidates.length) return;
        const ult = candidates.find(s => s.isUltimate);
        const pick = ult || candidates.sort((a, b) => skillLevel(hero, a) - skillLevel(hero, b))[0];
        levelUpSkill(hero, pick);
    }
}

// Draft: prefiere sus habilidades naturales; si no tiene definitiva, una definitiva; si no, la primera activa.
function aiPickDraft(hero, options) {
    return options.find(s => s.heroKey === hero.key)
        || (!hero.skills.some(s => s.isUltimate) && options.find(s => s.isUltimate))
        || options.find(s => s.kind === 'active')
        || options[0];
}

// Tienda: si está Condenado compra una vida; después arma ítems en orden de prioridad: los contras de la
// próxima oleada (mirando el aviso), su atributo principal y los compuestos de su tipo. Si no le alcanza para
// un compuesto entero, compra un componente que falte (lo va armando de a poco, como en Dota 2).
let aiBuysCounters = true; // se puede apagar para medir cuánto importan los contras
const AI_BUILDS = {
    STR: ['BELT', 'HEART', 'THORNS', 'CRIMSON'],
    AGI: ['GLOVES', 'SWIFT_BLADE', 'CRIMSON', 'SKADI'],
    INT: ['TOME', 'ARCANE_STAFF', 'AEGIS', 'DIADEM']
};

function aiNeededCounters(wave) {
    // Solo contras que valen la pena: tipos que vienen de a 2 o más, o el tipo del jefe
    return [...new Set(waveSummary(wave).filter(({ type, count }) => type.counterItem && (count >= 2 || type.key === wave.boss)).map(({ type }) => type.counterItem))];
}

// Da un paso hacia un ítem: lo compra entero si le alcanza o, si es compuesto, compra el componente faltante
// más barato. Si el inventario está lleno, vende primero un contra que no esté en sus objetivos.
function aiWorkToward(hero, key, targets) {
    const item = ITEMS[key];
    if (countItem(hero, key) > 0) return false;
    if (itemBlocker(item, hero) === 'Inventario lleno') {
        const spare = hero.inventory.find(inv => ITEMS[inv.key].counters && !targets.includes(inv.key));
        if (!spare) return false;
        sellItem(spare.key, hero);
    }
    if (itemAvailable(item, hero) && hero.gold >= itemCost(item, hero)) return buyItem(item, hero);
    if (item.tier !== 'composite') return false;
    const part = recipeStatus(hero, item).missing.map(k => ITEMS[k])
        .filter(c => itemAvailable(c, hero) && hero.gold >= c.cost).sort((a, b) => a.cost - b.cost)[0];
    return part ? buyItem(part, hero) : false;
}

function aiShop(hero) {
    if (itemAvailable(ITEMS.GREED, hero) && hero.gold >= itemCost(ITEMS.GREED, hero)) buyItem(ITEMS.GREED, hero);
    const counters = aiBuysCounters && nextWave ? aiNeededCounters(nextWave) : [];
    const targets = [...counters, ...AI_BUILDS[hero.primaryAttr]];
    // Siempre intenta primero el objetivo más prioritario; cuando no puede avanzar en ninguno, termina
    for (let guard = 0; guard < 30; guard++) {
        if (!targets.some(key => aiWorkToward(hero, key, targets))) return;
    }
}

// --- PILOTO AUTOMÁTICO DEL JUGADOR ---
let autopilot = false;
let autopilotWait = 0; // pausa en draft/preparación para que se vea lo que hace

function setAutopilot(on) {
    autopilot = on;
    const btn = document.getElementById('autopilot-btn');
    if (btn) { btn.textContent = `🤖 Piloto automático: ${on ? 'ON' : 'OFF'}`; btn.classList.toggle('on', on); }
    log(on ? '🤖 Piloto automático activado.' : '🤖 Piloto automático desactivado.');
}

// Fuera de la oleada: decide el draft y la tienda con una pausa corta entre cada paso.
function tickAutopilot(dt) {
    if (!autopilot || !player || (gameState !== 'DRAFT' && gameState !== 'PREP')) return;
    autopilotWait += dt;
    if (autopilotWait < 1.2) return;
    autopilotWait = 0;
    if (gameState === 'DRAFT') {
        if (currentDraft.mode === 'bookChoice') useBookOn(player.skills[0]);
        else learnSkill(aiPickDraft(player, currentDraft.options));
    } else {
        aiSpendPoints(player);
        aiShop(player);
        startWave();
    }
}
