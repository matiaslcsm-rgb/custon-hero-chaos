# Roadmap a la versión 1.0 — Custom Hero e Infinite Tower

Dos juegos en la misma página (se elige en la portada):
- **Custom Hero** (antes "Custom Hero Chaos"): arena de 8 héroes con oleadas, duelos, apuestas y jefes. Armás tu
  kit mezclando habilidades de cualquier héroe y te quedás último en pie.
- **Infinite Tower** (antes "Tower Chaos"): roguelite de acción. Despertás sin nada y subís una torre piso por piso
  (bioma, pueblo, laberinto y guardián), armando tu clase con el equipo.

Lo armamos como lo haría un equipo de desarrollo: dirección, diseño de juego, combate, contenido, economía y
balance, arte, sonido, interfaz y QA con datos. La meta es que cada juego tenga un **loop completo**: qué hacés en
cada segundo, en cada partida y entre partidas, y que sea fluido y divertido. Cada fase cierra con criterios que se
**miden** (piloto automático, simulaciones o pruebas), no "a ojo".

## Qué aprendimos investigando (referencias)
- **El loop tiene tres capas.** Lo que hacés cada segundo (pegar, esquivar), cada partida (armar tu build, llegar
  más lejos) y entre partidas (desbloqueos, historia, mejoras). Los roguelites que retienen (Hades, Vampire
  Survivors) cuidan las tres. La metaprogresión funciona mejor cuando **abre opciones nuevas** (armas, personajes,
  modos) que cuando solo suma números (análisis de Vampire Survivors vs. Dead Cells).
- **La dificultad se sube por elección, después de la primera victoria.** Slay the Spire tiene niveles de Ascensión
  que se apilan de a uno. Hades tiene el Pacto de Castigo: elegís qué agravantes sumar y a cambio hay mejores premios.
- **Una torre infinita necesita hitos, no solo números más grandes.** Jefes cada 5 o 10 pisos, mecánicas nuevas
  cada tantos pisos (un escudo en el 10, que refleja en el 20, que cura en el 30), puntos de control y la opción de
  irse con el botín después de cada jefe (el Abismo de Nioh). Ojo con que el jugador crezca lineal y el enemigo
  exponencial: se choca contra una pared. Diablo III pone tope a sus Grietas.
- **Arena con rondas (Custom Hero Chaos de Dota 2, auto battlers).** Arrancar con rondas contra la máquina para
  aprender antes de enfrentar jugadores (TFT). Muerte súbita para que la partida termine (en Custom Hero Clash
  arranca cerca de la ronda 31). Partidas de 15 a 25 minutos. La economía se enseña con un **resumen después de
  cada ronda** (interés por ahorrar, racha). Cuidado con que una sola estrategia domine.
- **Sensación de golpe.** Pausa de impacto de 50 a 100 ms en golpes fuertes, temblor chico, destello y sonido en
  capas, y una señal clara cuando **te** pegan (si no, el jugador muere sin entender por qué).
- **Primera partida.** Una idea por vez. Enseñar dentro de la partida, no con una pared de texto. Un primer piso que
  sirva de tutorial y aparezca solo las primeras veces (Cogmind).

Fuentes: [Custom Hero Chaos (FAQ de Respawn)](https://respawn.media/gaming/7p3k8-faq-po-custom-hero-chaos-ot-cqru),
[cambios de Custom Hero Clash](https://steamcommunity.com/sharedfiles/filedetails/changelog/2141071809?p=21),
[auto battlers comparados](https://www.hearthstonetopdecks.com/how-does-hearthstone-battlegrounds-compare-to-other-auto-battlers/),
[economía de un auto battler](https://theatrxcity.itch.io/auto-units/devlog/555467/the-potential-future-of-auto-units),
[modo infinito en roguelikes](https://gamedev.net/blogs/entry/2263243-dev-log-4),
[la torre al final del tiempo](https://m.fightcancer.org/tower-end-time),
[Abismo de Voidling Bound](https://voidlingbound.wiki.gg/wiki/The_Abyss),
[Grietas Mayores de Diablo III](https://maxroll.gg/d3/resources/greater-rift-explained),
[Pacto de Castigo de Hades](https://www.rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards),
[Ascensión de Slay the Spire](https://www.pcgamesn.com/slay-the-spire-2/ascension-levels),
[metaprogresión de Vampire Survivors](https://played.danboland.net/vampire-survivors.html),
[sensación de golpe](https://uhiyama-lab.com/en/notes/unity/unity-game-feel-hit-feedback/),
[tutoriales en roguelikes (Cogmind)](https://www.moddb.com/games/cogmind/news/tutorials-and-help-easing-players-into-the-game).

---

## Cómo trabaja el modo automático
Tarea programada `mejora-automatica-chc`: toma el primer ítem `[ ]` que no diga **(decisión)**, lo hace, lo prueba,
lo documenta, lo sube y lo marca `[x]` con la fecha y el commit. Los ítems **(decisión)** esperan que el usuario
elija; el modo automático anota las opciones en "Esperando al usuario" y los saltea.
- Trabaja de corrido mientras el límite de 5 horas del plan esté **por debajo del 50%** y frena al llegar.
  Si el límite **semanal** llegó al 50%, no trabaja en el juego.
- Un ítem por vez (sin tope por corrida), chico y jugable. Si un ítem es grande, lo parte en pasos y hace solo el primero.
- Sube solo si pasan **todas** las pruebas (`index.html?test`). Si no pasan y no lo puede arreglar, deshace sus
  cambios, anota por qué en el ítem y sigue con otro.
- Balance: se mide (simulación o banco de pruebas) antes y después, y se anotan los números.
- Rioplatense con voseo en código, comentarios, commits e interfaz. Sube `GAME_VERSION` (js/main.js) en cada entrega.
- Anota cada cambio en REWORK.md ("Interfaz y calidad de vida" o su sección) y ESTADO.md.
- No toca el guardado de partidas del jugador, no borra archivos del usuario, no cambia el estilo gráfico elegido.

El orden de la lista **es** la prioridad: primero lo que destraba el loop completo, después contenido y pulido.

---

# INFINITE TOWER

## Visión 1.0
- **Cada segundo:** combate de acción legible estilo Hades: combo, parada, esquive, habilidades Q/E/R, enemigos que
  avisan sus golpes, golpes con peso.
- **Cada run (30-45 min hasta la Cumbre):** 10 pisos con bioma, pueblo, laberinto y guardián, armando tu clase con
  el equipo. Después de la Cumbre, el **Ascenso infinito**: ¿hasta qué piso llegás?
- **Entre runs:** Esencia y mejoras permanentes, armas nuevas para empezar, el Códice y el Bestiario que se llenan,
  la Bitácora con historia, y niveles de dificultad que se eligen (Juramentos) a cambio de mejores premios.
- **Criterios 1.0 (medidos con el piloto):** primera Cumbre entre la 3.ª y la 8.ª run de un jugador nuevo, ninguna
  muerte "sin entender por qué" (cada golpe que pega se anuncia), cada piso dura entre 3 y 5 minutos, 60 cuadros
  por segundo en una PC común, 0 errores en la consola en 10 runs del piloto.

## Fase T0 — La Torre por dentro: mundo, historia y secretos (pedido del usuario, diseño en `docs/TORRE-MUNDO.md`)
- [x] **Adentro de la torre (pisos 2+):** muro exterior de piedra, salones con muros gruesos y portones, y columnas.
      Más derrumbado abajo y más entero arriba. **Identidad de cada piso:** lugar, gente y anciano del pueblo con su
      línea de historia (`js/towerLore.js`). 2026-10-14.
- [x] **Las Páginas de Arén:** una por piso, escondida en un rincón difícil. La Bitácora las junta en orden y cuenta
      la historia de la expedición (`docs/TORRE-MUNDO.md`). 2026-10-14.
- [ ] **Paredes agrietadas y salas secretas:** grietas que se ven si mirás bien en los muros de los salones y del
      laberinto. Se rompen a golpes y adentro hay un cofre, una página o el camino al jefe escondido.
- [ ] **Jefe escondido, paso 1:** el Ciervo Blanco del piso 1 (aparece solo de noche en un claro apartado), con su
      entrada propia del Bestiario y una pieza única. Después, uno por piso según la tabla de TORRE-MUNDO.md.
- [ ] **La gente del pueblo se ve:** 2 o 3 personajes en pixel art que caminan por el pueblo, con el aspecto de su
      gente (barqueros, relojeros, faroleros…). Hablás con F y cada run dicen algo nuevo.
- [ ] **Pedidos que cruzan pisos:** ej. la llave de las compuertas (piso 5) abre la sala de bombas del piso 3.
      La piedra de regreso permite volver.
- [ ] **El misterio de cada piso, jugable:** compuertas que bajan el agua (3), relojes que cambian el laberinto (5),
      faroles que hay que encender de noche (7). De a uno, empezando por el 3.
- [ ] **Menos explorado hacia arriba:** caminos, carteles, tamaño del pueblo, mapa que vende el mercader y luz según la
      tabla de TORRE-MUNDO.md.
- [ ] **Transición de biomas:** cerca de la escalera ya se ve el bioma de arriba (arena que cae, nieve que entra).
- [ ] **El piso 1 afuera:** la torre gigante se ve desde el bosque (silueta al fondo) y el laberinto es su puerta.

## Fase T1 — Cerrar el loop (lo que falta para que sea un juego completo)
- [ ] **Pantalla de fin de run:** al morir o ganar, un resumen claro con el piso alcanzado, el tiempo, las bajas,
      quién te mató, la build final (íconos de las piezas), lo que ganaste para siempre (Esencia, entradas del
      Códice) y un botón grande "▶ Otra run". Es el puente entre la run y la metaprogresión.
- [ ] **Mejor marca y estadísticas guardadas:** piso más alto, runs jugadas, Cumbres, mejor tiempo. Se muestran en
      el menú de Infinite Tower y en el resumen ("¡Nuevo récord!").
- [ ] **Ascenso infinito, paso 1:** después del piso 10 (la Cumbre) se ofrece "Seguir subiendo" o "Volver con el
      botín". Los pisos 11 en adelante ("Lo No Escrito": la torre crece) mezclan biomas al azar y escalan con la fórmula del piso (REWORK.md §14),
      con tope blando para que el jugador no choque contra una pared exponencial (medir con el piloto).
- [ ] **Ascenso infinito, paso 2 (hitos):** guardián cada 5 pisos. Cada 10 pisos se suma un **agravante** a los
      enemigos (escudo → escudo que refleja → escudo que cura a los cercanos), anunciado con un cartel. Piedra de
      regreso cada 10 pisos como punto de control.
- [ ] **Guardar en el Ascenso:** el guardado de la run (towerSave.js) incluye el piso infinito y los agravantes.
- [ ] **La Cumbre como final:** una escena corta al vencer al guardián del piso 10 (la torre se abre, el cuaderno
      escribe la última página) antes de ofrecer seguir subiendo.

## Fase T2 — Sensación de juego y claridad
- [ ] **Ataques de la espada de frente y de espaldas:** los 3 tajos del combo hacia abajo y hacia arriba con su
      estela, en el estilo de `docs/arte/vistas-frente-espalda.py` y la paleta de `js/towerHeroArt.js`.
- [ ] **Golpe recibido y caída propios del héroe dibujado:** hoy se arman con el cuadro de quieto.
- [ ] **Parada y esquive de frente y de espaldas.**
- [ ] **Señal clara al recibir daño:** destello rojo en el borde de la pantalla, un sonido propio y la barra de
      vida que tiembla. Medir con el piloto cuántos golpes recibidos no tenían aviso previo (meta: 0).
- [ ] **Pausa de impacto por peso:** el remate del combo y el golpe a un guardián frenan 60-90 ms; los golpes chicos,
      nada. Revisar que no se apilen (REWORK.md §8).
- [ ] **Prueba aleatoria de la Raíz Madre:** a veces falla sola. Fijar la semilla o el margen para que sea estable.
- [ ] **Dificultad medida con el piloto** después de los cambios de la espada (combo con clic, parada): enseñarle la
      parada al piloto y comparar muertes y tiempos por piso contra la marca de REWORK.md §10.
- [ ] **Cuánto pierde quien apunta mal con el arco** (ataque con clic): simular puntería con error y medir el daño.
- [ ] **Cuánto cuesta la cámara más cerca** (VIEW.across 24): medir avisos de ataque vistos a tiempo.

## Fase T3 — Las 3 armas a la par
- [ ] **El arco en el estilo dibujado:** el mismo encapuchado con arco (quieto, caminar, tensar y soltar; de costado
      primero). Hoy el arco usa el muñeco viejo por poses.
- [ ] **El bastón en el estilo dibujado** (quieto, caminar, lanzar).
- [ ] **La capa toma el color de la armadura** (recolorear la paleta de la capa según la pieza puesta).
- [ ] **Arco y bastón con mecánica propia del clic,** como la espada (combo y parada): el arco tensa con el clic
      mantenido; el bastón carga un orbe. Medir el daño por segundo contra la espada (que queden parejos ±10%).

## Fase T4 — Metaprogresión que abre opciones
- [ ] **Tienda de mejoras permanentes con Esencia** en la base: pocas y con peso (más vida, una poción extra, ver el
      mapa del piso, empezar con 1 pieza común), cada una con 3 niveles. Medir que la run 10 no sea trivial.
- [ ] **Desbloquear armas iniciales** con logros de la run (ej.: matar un guardián sin recibir daño → el Mazo).
- [ ] **(decisión) El Mazo** (REWORK.md §15): el verbo propio del arma. Proponer opciones antes de hacerlo.
- [ ] **(decisión) Juramentos de la Torre** (los Edictos de REWORK.md §15 D, al estilo del Pacto de Hades): después
      de la primera Cumbre, elegís agravantes que suman "calor" a cambio de más Esencia y mejores piezas.
- [ ] **Desafíos diarios:** una torre con semilla del día igual para todos y una tabla local de marcas.

## Fase T5 — Contenido y mundo
- [ ] **Minimapa con colores de pergamino** (REWORK.md §18-19).
- [ ] **Ideas para las criaturas**, de a una (REWORK.md §19, "Ideas para las criaturas").
- [ ] **La criatura que carga tus ítems** (resto de la fase 5, ROGUELIKE.md).
- [ ] **Élites con nombre** y **eventos en el campo** (ROGUELIKE.md).
- [ ] **Personajes del pueblo con historia** (el Herrero, el mercader): una línea nueva de diálogo por run que
      avanza su historia, como en Hades. La Bitácora guarda lo que contaron.
- [ ] **Música:** tema de jefe y capa de combate en todos los biomas (REWORK.md §7).

## Fase T6 — Pulido para la 1.0
- [ ] **Primer piso tutorial** solo en las primeras 3 runs (enseña una cosa por vez dentro del juego).
- [ ] **Opciones completas:** teclas reasignables, tamaño de texto, modo daltónico para los avisos de ataque.
- [ ] **Rendimiento:** medir cuadros por segundo en el piso más cargado; meta 60 en una PC común.
- [ ] **Prueba larga del piloto:** 10 runs seguidas sin errores en la consola, con tiempos y muertes por piso
      anotados en REWORK.md.

---

# CUSTOM HERO

## Visión 1.0
- **Cada segundo:** tu héroe pelea solo o con tus habilidades; vos decidís el posicionamiento, a quién pegarle y
  cuándo tirar la definitiva.
- **Cada partida (15-25 min):** draft de habilidades, oleadas de creeps con tema, duelos 1v1 con apuestas, jefes cada
  5 rondas, tienda con recetas. Ganás si sos el último en pie. Muerte súbita para que la partida siempre termine.
- **Entre partidas:** héroes y habilidades que se desbloquean, perfil con estadísticas, logros y niveles de
  dificultad de la máquina.
- **Criterios 1.0 (medidos con `simulateGame`):** ningún héroe gana más del 20% de las partidas de 8 (lo esperable
  es 12,5%), partidas de 15 a 25 minutos, el jugador nuevo entiende la economía en la primera partida.

## Fase C1 — Cerrar el loop
- [ ] **Resumen después de cada ronda:** oro ganado, de dónde salió (bajas, interés, racha, apuesta), vida
      perdida y la posición en el ranking. Enseña la economía sin texto largo.
- [ ] **Interés y racha visibles:** +1 de oro por cada 10 ahorrados (con tope) y bonus por racha de victorias o
      derrotas, mostrado en la barra de oro. Medir que no domine "ahorrar siempre".
- [ ] **Muerte súbita:** desde una ronda fija (medir cuál deja partidas de 15-25 min; Custom Hero Clash usa ~31),
      los duelos y las oleadas pegan cada vez más fuerte hasta que quede uno.
- [ ] **Pantalla de fin de partida:** puesto, rondas, duelos ganados, oro total, build final y "▶ Otra partida".
- [ ] **Historial y perfil:** partidas jugadas, victorias, top 3, héroe favorito, mejor puesto con cada héroe.

## Fase C2 — Balance medido
- [ ] **Sniper gana 8 de 14 partidas largas:** medir con `simulateGame` y bajarlo hasta ≤20%.
- [ ] **Vampiro y Nigromante siguen abajo:** medir y subirlos sin pasarse.
- [ ] **Balance de `mageSpellAmp` en duelos 1v1:** medir con `simulateGame(i, false, 60)`.
- [ ] **Primeras rondas contra la máquina:** las rondas 1-4 son solo oleadas (aprender sin perder), los duelos
      desde la 5 (ya está). Revisar que el jugador nuevo llegue a la ronda 5 con build armada.

## Fase C3 — Contenido
- [ ] **Chakravin `Y`** (proyectiles de habilidad que vuelven + creep Guardián de Hierro), midiendo.
- [ ] **Trampero `P`** (zonas en el piso + creep Saltador), midiendo.
- [ ] **Proyectiles de habilidad para el resto del roster** (Danzante, Asesino, Vampiro, Sniper) y forma propia por
      habilidad (`vfx.shape`).
- [ ] **(decisión) Ítems nuevos** de DISEÑO.md §7: el usuario decide cuáles entran.

## Fase C4 — Metaprogresión y pulido
- [ ] **Desbloqueos:** arrancás con 6 héroes y desbloqueás el resto jugando (ganar con un atributo, llegar al top
      3...). Logros con ícono en el perfil.
- [ ] **Dificultad de la máquina:** Fácil / Normal / Difícil (cuánto piensa la IA, cómo apuesta y cómo arma build).
- [ ] **El mismo pulido de golpe que la Torre:** pausa de impacto y señal de daño recibido en las arenas.
- [ ] **Tutorial jugado** en la primera partida en vez de páginas (una idea por ronda).

---

# AMBOS
- [ ] **(decisión) Nombre del repositorio y del link:** hoy el link sigue siendo `custon-hero-chaos`. Cambiarlo
      rompe el link viejo (GitHub redirige el repo, pero no la página). Opciones: dejarlo (recomendado por ahora)
      o renombrarlo a `custom-hero` cuando salga la 1.0.
- [ ] **(decisión) 3D:** seguir el prototipo de la isla o pausarlo hasta la 1.0 de los dos juegos (recomendado:
      pausarlo).
- [ ] **Página de inicio más clara:** qué es cada juego en una línea, tu mejor marca en cada uno y "Continuar" si hay
      una run guardada.

## Esperando al usuario
(El modo automático anota acá las opciones de los ítems **(decisión)**, con una marcada como recomendada.)

## Hecho por el modo automático
(Fecha · ítem · commit · qué se midió.)
- 2026-10-14 · Las Páginas de Arén · 696aecb · 3 torres × 10 pisos: siempre aparece y se alcanza; 280-400 pasos de la entrada (87-100% del máximo del campo). Pruebas 234/234.
