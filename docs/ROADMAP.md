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
- Al terminar cada corrida deja un informe en `docs/informes/` (qué hizo, qué midió, cómo probarlo) con un pie
  **"Tu feedback"**: lo que escribas ahí, la corrida siguiente lo lee primero y lo pasa al roadmap (pedido del usuario 2026-10-14).

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
- [x] **Paredes agrietadas y salas secretas:** grietas que se ven si mirás bien en los muros de los salones y del
      laberinto. Se rompen a golpes y adentro hay un cofre, una página o el camino al jefe escondido.
  - [x] Paso 1: 2 cámaras de piedra selladas por piso (2+) en el campo, con una pared agrietada (3 golpes: tajos,
        flechas u orbes) y un cofre con una pieza rara adentro (`js/towerSecrets.js`). 2026-10-14.
  - [x] Paso 2: una sala escondida por piso en la piedra maciza del laberinto (también en el piso 1), con la grieta
        hacia un pasillo o una sala. 2026-10-14.
  - [x] Paso 3a: la Página de Arén va adentro de la cámara sellada más lejana (pisos 2+; en el 1, que es afuera, sigue
        en el rincón más apartado). El Cuaderno dice dónde buscar las que faltan. 2026-10-14.
  - Paso 3b (el camino al jefe escondido detrás de una grieta) pasó al ítem del jefe escondido.
  - [x] ~~Paso 4: que el guardado recuerde las paredes rotas~~ Descartado: al continuar una run el piso entero se arma
        de nuevo (cofres comunes incluidos, towerSave.js); las cámaras se comportan igual que el resto.
- [ ] **Jefes escondidos:** uno por piso según la tabla de TORRE-MUNDO.md.
  - [x] Paso 1: el Ciervo Blanco del piso 1 (solo de noche en un claro apartado, se va al amanecer), con su entrada
        del Bestiario y una pieza única (Astas del Ciervo Blanco). 2026-10-14.
  - [x] Paso 2: la Flor Carnívora del piso 2, en el invernadero tapiado (sala grande sellada con una pared
        agrietada; la flor echó raíces y escupe espinas). 2026-10-14.
  - [x] Paso 3: el Leviatán del Fango del piso 3, encerrado en la sala de bombas. 2026-10-14.
  - [x] Paso 4: la Semilla Primera del piso 4, en el hueco de la raíz. 2026-10-14.
  - [x] Paso 5: el Guardián de Arena del piso 5, en la sala del reloj detenido. 2026-10-14.
  - [x] Paso 6: el Lector Sin Ojos del piso 6, entre las estanterías hundidas. 2026-10-14.
  - [ ] Paso 7: el resto, de a uno (Lobo de Escarcha, Vigía Perdido, Yunque Vivo).
  - [ ] Botas y anillos únicos: el catálogo no tiene piezas de esas ranuras (hoy los únicos usan arma, casco, coraza,
        guantes y amuleto).
  - [ ] Dibujo propio del ciervo (hoy usa el cuerpo de cuadrúpedo con astas del generador).
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

## Fase T00 — Rework de equipo, habilidades y stats (decidido por el usuario 2026-10-14, `docs/PROPUESTA-SISTEMAS.md`)
Decidido: **3 clases fijas al estilo Risk of Rain** (cada una con sus habilidades y su pasiva, ya no salen del
equipo), **reliquias apilables** con etiquetas y bonus de conjunto (lo que arma cada run), **la armadura** como única
pieza de equipo, **elegir 1 de 3 mejoras al subir de nivel**, **arenas de jefes con la llave del piso** y **PixiJS**.

Las clases (diseño del usuario, 2026-10-14; clic izquierdo = básico, clic derecho, Espacio = movilidad):
- **Guerrero** (espada): combo de 3 tajos · parada · rodar · pasiva: el daño físico puede ser crítico (o critea más).
- **Mago** (bastón): orbe de magia que rebota 1 vez · tormenta de 3 rayos a enemigos al azar · teletransporte corto ·
  pasiva: *a confirmar* — si el usuario no contesta antes, usar la interpretación propuesta: mantener una habilidad
  la carga (más daño o un rebote más), y marcarlo en el informe para que lo corrija en el feedback.
- Sin cuarta habilidad por ahora: la "especial" llega más adelante como una mejora de 1 de 3 (a confirmar).
- **Arquero** (arco): ráfaga de 3 flechas · flechazo que critea y aturde · impulso rápido hacia el mouse · pasiva: sus
  habilidades y reliquias se activan más rápido (menos enfriamiento y más chance de disparo de las reliquias).
- [x] **Reliquias, paso 1 (motor):** `js/towerRelics.js` con reliquias que se apilan y se enganchan a los eventos que
      ya emite el combate (`emit`: onHit, onKill, onCast, onDamaged, onTick) más dos nuevos (al esquivar, al parar).
      12 reliquias con 4 etiquetas (fuego, sangrado, crítico, escudo) y el bonus al juntar 3 de una etiqueta. Caen de
      campeones, cofres y jefes; fila de íconos en la interfaz con su cartel. Convive con lo viejo. Medir con el piloto:
      daño por piso y variación entre runs, antes y después. 2026-10-14.
- [x] **Subir de nivel: elegir 1 de 3 mejoras** (ventana con 3 cartas, como Hades), con umbrales por atributo (3 de
      Fuerza destraban un efecto, etc.). Reemplaza los 5 puntos por nivel; el piloto elige con una regla. 2026-10-14.
  - [ ] Paso 2: mejoras que cambien cómo se juega (no solo números): por ejemplo, el remate aturde, una carga más de
        esquive, la parada devuelve más. Van con las clases fijas.
- [ ] **Las 3 clases, paso 1: el Guerrero** completo (combo, parada, rodar y su pasiva) con las teclas fijas; las
      habilidades dejan de salir del equipo. Medir con el piloto contra la espada de hoy.
  - [x] 1a: las armas iniciales son clases (Guerrero, Arquero, Mago: nombre en el pedestal y en el cartel, se guarda
        con la run) y la pasiva del Guerrero, Templanza (+5% de crítico y el daño físico de habilidades puede critear).
        2026-10-14.
  - [x] 1b: el Guerrero pelea solo con su kit (combo con clic, parada con clic derecho, rodar con Espacio): el equipo ya
        no le da Q/E/R ni pasivas, solo stats, y el cartel de la pieza lo avisa. 2026-10-14.
  - [ ] 1c: una habilidad "especial" del Guerrero (la cuarta, como en Risk of Rain) como mejora de 1 de 3, si el
        usuario la confirma; y revisar la dificultad sin las Q/E/R (hoy va 15-20% más lento).
- [x] **Las 3 clases, paso 2: el Arquero** (ráfaga de 3, flechazo que critea y aturde, impulso hacia el mouse, pasiva
      Ojo Rápido; sin Q/E/R del equipo, conserva el Tiro Tensado en la Q). 2026-10-14.
- [ ] **Las 3 clases, paso 3: el Mago.** Cada uno medido contra el Guerrero (daño por segundo
      parejo ±10%, muertes por piso).
- [ ] **El equipo queda en la armadura:** una sola pieza (vida, armadura, 1 rasgo) que se encuentra y se mejora. Las
      piezas de héroes de Custom Hero salen del botín de la Torre (o pasan a ser reliquias). Medir daño por piso ±15%.
- [ ] **Mercader y herrero nuevos:** el mercader vende 3 reliquias por piso (y rerolls); el herrero mejora la armadura
      (o le cambia el rasgo) y funde 2 reliquias iguales en su versión mayor. Se van fundir y traspasar.
- [ ] **Esencia que desbloquea reliquias** nuevas en el mazo; las piezas únicas de los jefes escondidos pasan a ser
      reliquias únicas.
- [ ] **Más reliquias**, de a 5 por entrega y midiendo, hasta 40.
- [ ] **Arenas de jefes, paso 1:** la sala del guardián se cierra al entrar (rejas) hasta que gane alguien; la puerta
      pide la **llave del piso**, que lleva el campeón más fuerte (marcado en el mapa y en el objetivo del piso).
- [ ] **Arenas, paso 2:** los jefes escondidos también pelean en arena cerrada; la llave puede salir del misterio del
      piso (compuertas, relojes, faroles).
- [ ] **PixiJS, paso 1:** probar PixiJS (WebGL) dibujando encima del canvas actual solo la capa de luces (antorchas,
      fogatas, balas, noche) y medir cuadros por segundo antes y después. Si anda, migrar de a capas.

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
- [ ] **Señores de cueva con daño desmedido:** midiendo el piso 6 salió uno con 1833 de daño por golpe (los demás,
      261-393). Buscar qué combinación de afijos de campeón lo dispara y ponerle tope.
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
- 2026-10-14 · Salas secretas, paso 1 (cámaras con pared agrietada) · ccfc343 · 3 torres × pisos 2-10: 2 cámaras por piso siempre, laberinto alcanzable, grieta a 51-311 pasos de la entrada. Pruebas 235/235.
- 2026-10-14 · Salas secretas, paso 2 (sala escondida en el laberinto) · 5cb0dc5 · 3 torres × 10 pisos: entra en 30/30, guardián alcanzable en todos, grieta a 187-323 pasos. Pruebas 235/235.
- 2026-10-14 · Salas secretas, paso 3a (la página detrás de la grieta) · 3605bdb · 3 torres × pisos 2-10: 27/27 páginas adentro de una cámara, grieta a 121-310 pasos. Pruebas 235/235.
- 2026-10-14 · Jefes escondidos, paso 1 (Ciervo Blanco) · dbffc66 · 593 vida/52 daño (señor de cueva piso 1: 387/149); espada inicial: 21-26 golpes para vencerlo, 5 suyos para caer; claro a ~270 pasos. Pruebas 236/236.
- 2026-10-14 · Jefes escondidos, paso 2 (Flor Carnívora) · 04a8771 · 10 pisos 2: invernadero 10/10, laberinto alcanzable 10/10, grieta a 51-292 pasos; 785 vida/99 daño (señor de cueva: 644/172). Pruebas 237/237.
- 2026-10-14 · Jefes escondidos, paso 3 (Leviatán del Fango) · de95735 · 10/10 pisos 3, laberinto alcanzable; vida 2117→1000, daño 137 (señores de cueva del piso 3: 393-1226 / 153-333). Pruebas 238/238.
- 2026-10-14 · Jefes escondidos, paso 4 (Semilla Primera) · 4a117bb · 10/10 pisos 4, laberinto alcanzable, grieta a 56-265 pasos; 1125 vida/100 daño (cuevas del piso 4: 456-2435 / 106-380). Pruebas 238/238.
- 2026-10-14 · Jefes escondidos, paso 5 (Guardián de Arena) · 0e992ac · 10/10 pisos 5, grieta a 50-191 pasos; vida 3126→1329, daño 199, armadura 12 (cuevas del piso 5: 354-1241 / 89-295). Pruebas 238/238.
- 2026-10-14 · Jefes escondidos, paso 6 (Lector Sin Ojos) · 608a23d · 10/10 pisos 6, grieta a 49-229 pasos; 1242 vida/191 daño (cuevas del piso 6: 629-1374 / 261-393, una con 1833). Pruebas 238/238.
- 2026-10-14 · Reliquias, paso 1 (motor y 12 reliquias) · 8c1e664 · piloto con reflejos humanos, 45 min: sin reliquias piso 3 y 2 muertes; con 0,25/0,35 de chance, 19 reliquias en 3 pisos (demasiadas); con 0,05/0,10, 7 en 3 pisos (~2,3 por piso), piso 4 y 0 muertes. Pruebas 239/239.
- 2026-10-14 · Subir de nivel: 1 de 3 mejoras · 6716de1 · piloto con reflejos humanos, 45 min: piso 4 a los 41 min, 0 muertes, nivel 15, 6 reliquias (igual que sin la elección: piso 4 a los 43 min); destrabó Piel de Roble, Golpe Pesado y Sangre Espesa. Pruebas 240/240.
- 2026-10-14 · Guerrero, paso 1a (clases y Templanza) · 259f4bc · banco de 60 s contra un muñeco, 8 muestras: 119 de daño/s sin pasiva y 116 con ella (sin diferencia: el combo ya critea; el ruido es ±25). Pruebas 241/241; se arregló la prueba de visión que fallaba si el héroe quedaba en una meseta.
- 2026-10-14 · Guerrero, paso 1b (sin Q/E/R del equipo) · 6b357e3 · piloto con reflejos humanos, 45 min: piso 3 a los 35 min y no llegó al 4 (antes, piso 4 a los 41); 0 muertes, nivel 14, 10 reliquias. Pruebas 241/241.
- 2026-10-14 · Arquero (kit y pasiva) · 4812da3 · banco de 60 s contra un muñeco, clic mantenido, 8 muestras: con ráfaga 0,55 y flechazo ×2,2 pegaba 150 contra 110 del Guerrero (+36%); con 0,4/1,8, +18%; con 0,33/1,8, 102 contra 93 (+10%, en el límite de la meta). Pruebas 242/242.
