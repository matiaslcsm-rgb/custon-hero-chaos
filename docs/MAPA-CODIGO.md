# Mapa del código: qué usa cada modo y qué comparten

Medido el 2026-10-16 con `docs/mapa-codigo.py` (lo corrés con `python docs/mapa-codigo.py` y lista de nuevo todo lo de
abajo). Cuenta las globales que declara cada archivo (`function`, `const`, `let`, `var` o `class` al principio de la
línea) y en qué otros archivos aparecen, sin contar comentarios ni textos.

## La foto general
- **97 `<script>` clásicos** en `index.html`, todos en el mismo espacio global. El orden importa solo para el código que
  corre al cargar; las funciones se llaman en tiempo de juego, así que hay dependencias en los dos sentidos
  (`utils.js` usa `towerLayout` y `floatLog`, que se declaran 80 archivos después) y anda igual.
- **Custom Hero y la base:** unas 8.400 líneas (`js/*.js` y `js/data/`). **La Torre:** unas 9.900 líneas
  (`js/tower*.js` e `inkart.js`). **Pruebas:** 4.300 líneas en `js/tests.js`.
- **No hay nombres declarados dos veces** entre archivos.
- **El "motor compartido" ya existe:** la Torre no tiene un motor propio, corre arriba del de Custom Hero. Usa su
  `player` (`game.js`), el daño (`combat.js`), los enemigos (`creeps.js`), los efectos (`effects.js`, `fx.js`,
  `fxSkills.js`), el héroe (`hero.js`), la IA (`ai.js`) y el dibujo (`ui.js`). Lo que falta no es crear un núcleo,
  sino que el núcleo deje de saber tantas cosas de la Torre.

## Qué archivo es de quién
| Grupo | Archivos | Comentario |
|---|---|---|
| **Núcleo (los dos modos)** | `utils`, `keymap`, `data/registry`, `effects`, `fx`, `fxSkills`, `audio`, `sprites`, `progression`, `hero`, `combat`, `bodies`, `game`, `world`, `creeps`, `ai`, `ui`, `mouse`, `padControls`, `pause`, `main` | La Torre usa entre 2 y 36 globales de cada uno |
| **Solo Custom Hero** | `data/heroes/*`, `data/items`, `data/neutrals`, `data/guides`, `data/sounds`, `itemicons`, `items`, `menu`, `duels`, `bets`, `rewards`, `bosses`, `roundEconomy`, `death`, `timers` | La Torre no los usa (o usa 1 global, como `menu.js`) |
| **Datos de CH que también usa la Torre** | `data/creeps`, `data/bosses`, `data/gameIcons`, `scenery` | Tocar estos datos cambia también la Torre |
| **Solo la Torre** | `tower*.js`, `inkart.js` | Pero el núcleo usa 174 de sus globales (ver abajo) |
| **Portada** | `titleScreen.js` | Usa el arte de la Torre (`pxSprite`, `pxbHeroFrame`) y su guardado |

## Estado que comparten los dos modos (variables que cambian)
Son `let` del núcleo que leen o escriben archivos de los dos lados. Si un modo las deja "sucias", el otro las hereda.

| Variable | Archivo | Archivos de la Torre que la usan | Del resto |
|---|---|---|---|
| `player` | `game.js` | 36 | 21 |
| `ctx` (el lienzo) | `ui.js` | 22 | 14 |
| `COLS` / `ROWS` | `game.js` | 12 | 10 |
| `fxClock` | `fx.js` | 13 | 5 |
| `autopilot` | `ai.js` | 10 | 7 |
| `gameState` | `game.js` | 4 | 10 |
| `paused` | `pause.js` | 2 | 8 |
| `heroes`, `arenas`, `viewedHero` | `world.js` | 1 | 4-7 |
| `mapScale` | `ui.js` | 2 | 2 |
| `audioCtx`, `fxTextPass`, `projectileElement`, `heroOffers` | varios | 1 | 1-4 |

Y al revés: `gameMode`, `towerRun` y `camera` se declaran en `tower.js` pero las leen 13, 4 y 4 archivos del núcleo.

## Dónde el núcleo pregunta "¿es la Torre?"
Menciones de `gameMode` por archivo (sin contar comentarios): **`ui.js` 21**, `pause.js` 8, `game.js` 4, `fx.js` 3, `fxSkills.js` 3,
`progression.js` 2, `menu.js` 2, `roundEconomy.js` 2, `combat.js` 1, `mouse.js` 1, `padControls.js` 1, `main.js` 2, `titleScreen.js` 2.
Aparte, hay chequeos por dato (`arena.kind === 'tower'`, `this.towerStats`, `target.relicShield`) en `combat.js`, `hero.js`
y `creeps.js`.

## Ganchos de la Torre adentro del núcleo
El núcleo llama directamente a funciones de la Torre (la lista completa sale del script). Las más delicadas, porque
están en el camino de cada golpe o de cada muerte de los dos modos:
- `combat.js`: `heightDamageMult` (altura), `relicAbsorb` (escudo de reliquias), `towerLootOnKill`, `towerXpFactor`,
  `championOnDeath`, `beastThorns`, `hitCrack`, `TOWER.goldMult`.
- `creeps.js`: `parryCatchesMelee` / `parryMelee` (parada), `creepWindsUp` / `startCreepWindup` / `creepWindupTick`
  (aviso de golpe), `championOnAttack`, `towerStepCreep`.
- `effects.js`: `relicEmit`. `hero.js`: `TOWER.pointsPerLevel`. `death.js`: `towerHeroDeath`. `ai.js`: `towerAutoDir`, `lineClear`.
- `fxSkills.js`: `isArcher`, `isMage`, `archerHaste`, `archerDashDir`, `mageBlink`, `hasLevelFlag`, `FISTS`, `creepDot`.
- `ui.js`, `pause.js`, `game.js`, `mouse.js`, `padControls.js`, `main.js`: abren y cierran ventanas de la Torre
  (inventario, mapa, códice, bestiario, herrero, cuaderno…) y la dibujan.

Hoy funciona porque cada gancho está protegido por un dato de la Torre (si no hay altura, reliquia o parada, no hace
nada). El riesgo es que Custom Hero **necesita** que los archivos de la Torre estén cargados: si se renombra o se mueve
algo de la Torre, se puede romper Custom Hero sin que se note jugando la Torre.

## Los riesgos más grandes (pasaron como ítems a la Fase B0)
1. **El estado que se hereda al cambiar de modo.** `player`, `COLS`/`ROWS`, `autopilot`, `paused`, `gameState` y
   `camera` los escriben los dos modos. No hay ninguna prueba que juegue la Torre, vuelva a la portada y empiece Custom
   Hero (ni al revés) y revise que todo quede limpio.
2. **`ui.js` hace de todo:** 1.113 líneas, 78 globales, 21 preguntas por el modo. Es el archivo donde un cambio de
   dibujo o de interfaz de un modo tiene más chances de romper el otro.
3. **El núcleo llama a la Torre de forma directa** (los ganchos de arriba). Un renombre en un `tower*.js` rompe
   `combat.js` o `creeps.js` y, con eso, Custom Hero.
4. **Datos de Custom Hero que comparte la Torre** (`data/creeps.js`, `data/bosses.js`, `effects.js`, `combat.js`):
   un ajuste de balance para un modo cambia el otro. Al balancear hay que medir los dos.
5. **`pause.js` y las teclas de `game.js`** mezclan los atajos de los dos modos (8 + 4 preguntas por el modo y unas 20
   ventanas de la Torre). Es fácil que una tecla nueva choque con otra.

## Lo que NO conviene hacer
- Mover a la vez todos los archivos a carpetas por modo, o pasar a módulos (`import`): rompe el orden y las 274
  pruebas de una, y no mejora nada que se juegue.
- Reescribir el núcleo como "motor" aparte. Ya está, y anda: se trata de ordenar sus bordes de a poco.
