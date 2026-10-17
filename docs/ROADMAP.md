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

# BASE SÓLIDA (los dos juegos) — va antes que todo lo demás
Orden decidido por el usuario el 2026-10-16: primero cómo se siente el combate (el muñeco y las cajas de golpe),
después las herramientas de arte, después el orden del código y **el balance al final** (con el combate nuevo,
los números cambian todos). El modo automático sigue este orden de arriba hacia abajo.

## Fase B2 — El muñeco: animaciones y cajas de golpe (pedido del usuario 2026-10-16)
Un laboratorio (`index.html?muneco`) para pulir cómo se siente pegar, antes de llevarlo al juego. En **2D**, con el
arte del héroe de la Torre (`towerHeroArt.js`, `towerPixelHero.js`): el 3D sería empezar de cero (ver REWORK.md §17).
Hoy el juego **no tiene cajas de golpe**: el daño se decide por distancia (si está a tiro, pega).
- [x] **Muñeco, paso 1:** terreno básico (piso, pared, un escalón u obstáculo), un muñeco de práctica que recibe
      golpes y muestra el daño, y el héroe con cada movimiento animado en tres tiempos (preparación, golpe activo,
      recuperación): quieto, caminar, esquive, combo de ataque básico, parada, recibir golpe, disparo y caída.
      Antes de animar, fijar tamaños y cuántos cuadros lleva cada movimiento (arranque de `docs/ESTILO.md`).
      Partirlo en pasos chicos:
  - [x] 1a: la sala con el terreno (pared, cajón, columna, escalón), el muñeco de práctica y el héroe que camina y
        esquiva (tres tiempos), con cámara lenta, pausa, avance de a un cuadro y las cajas a la vista (H). 2026-10-16.
  - [x] 1b: combo de 3 tajos y parada (levanta, bloquea con destello y vuelve) que le pegan al muñeco solo en el
        tiempo activo, con lo apretado antes guardado, congelado al impacto, estela y sacudón en el remate. 2026-10-16.
  - [x] 1d-0 (arte, a pedido en el chat 2026-10-17): el héroe de frente y de espaldas se arma por piezas
        (`HERO_PARTS` en `js/towerHeroArt.js`: cabeza, torso, capa abierta/cerrada/espalda, piernas y la espada con
        su punto de agarre), con los mismos rasgos y alto que el de costado. Quieto y caminar ya lo usan.
  - [ ] 1d (arte): cuadros de ataque, parada y esquive de frente y de espaldas para la espada (hoy hacia arriba y abajo
        se usa el dibujo de costado).
  - [x] 1c: onda de corte (disparo del héroe), el muñeco que tira bolas de paja con aviso, recibir golpe con empujón,
        esquive intocable en su tiempo activo, parada que devuelve el disparo y caída con levantarse. 2026-10-16.
- [ ] **Capturas en los informes:** si una corrida cambia algo que se ve, el informe trae captura de antes y después
      (`docs/informes/img/`, PNG chicos) para aprobarlo sin abrir el juego.
- [ ] **Muñeco, paso 2:** cajas de golpe a la vista con una tecla (rojo: lo que pega, solo en los cuadros activos;
      verde: lo que puede ser golpeado; los proyectiles con su propia caja que viaja con la animación) y un panel para
      ajustar en vivo los tiempos, el tamaño de las cajas, el congelado al impacto y el empujón. Lo ajustado se guarda
      en un archivo de datos.
- [ ] **Prueba de ida y vuelta entre modos** (riesgo 1 del mapa): jugar un rato la Torre, volver a la portada y
      empezar Custom Hero (y al revés), y revisar que `player`, `COLS`/`ROWS`, `camera`, `autopilot`, `paused`,
      `gameState` y `towerRun` queden limpios. Si algo queda sucio, arreglarlo en un solo lugar (una función que
      deje el estado como al cargar la página).
- [ ] **Cajas de golpe en la Torre:** pasar el sistema del muñeco al juego, primero la espada, después el arco y el
      bastón; después Custom Hero. Que se sienta igual que en el muñeco y que pasen todas las pruebas.

## Fase B1 — Herramientas de arte, animación y menús (pedido del usuario 2026-10-16)
Herramientas para ver, revisar y mantener coherente lo gráfico. No cambian el estilo elegido: lo ordenan.
- [ ] **Galería de arte en el juego** (`index.html?galeria`): todos los sprites (héroe, enemigos, jefes, gente,
      objetos, props) y sus animaciones, ampliados, con pausa y avance cuadro por cuadro. Primero la Torre
      (`pxSprite`); después ver cómo se dibuja Custom Hero y sumarlo. Agregar una prueba que abra la galería sin errores.
- [ ] **Guía de estilo** (`docs/ESTILO.md`): paleta, tamaños, contornos, cuántos cuadros lleva cada animación
      (caminar, golpe, muerte), tipografías (`docs/arte/tipografias.html`) y colores, espaciados y botones de los
      menús. Pasar los colores de `style.css` a variables CSS sin cambiar cómo se ve.
- [ ] **La guía como skill del proyecto** (`.claude/skills/arte-chc/SKILL.md`): que cada corrida la lea antes de tocar
      algo gráfico y revise contra la galería.
- [ ] **Repaso de menús e interfaz** con la guía en la mano: portada, tienda, inventario, pausa y muerte de los dos
      juegos. Jerarquía, espaciados, botones y que se lea bien en pantallas chicas. Una pantalla por ítem, con captura.
- [ ] **(decisión) Editor externo de pixel art** (Aseprite o Piskel, exportando imágenes que carga el juego): ver
      "Esperando al usuario".

## Fase B0 — Entender y estabilizar antes de agregar (pedido del usuario 2026-10-16)
Regla: no agregar cosas por agregar. Primero entender, estabilizar y medir lo que ya existe. Las fases T0 y T00 (y
el resto) esperan hasta cerrar esta. **Nada de refactor grande ni de "motor compartido" de una:** se mueve código
solo cuando un cambio en un modo rompe el otro de verdad, y de a un paso que pase las pruebas.
- [x] **Mapa de lo compartido entre los modos:** escribir `docs/MAPA-CODIGO.md` con qué archivos usa cada modo (Custom
      Hero, Torre, los dos), qué variables globales tocan los dos y los puntos donde un cambio en uno puede romper el
      otro. Solo documentar, sin tocar código. Al final, una lista corta de los 3-5 riesgos más grandes como ítems nuevos
      en esta fase.
      Hecho 2026-10-16: `docs/MAPA-CODIGO.md` y `docs/mapa-codigo.py` (lo vuelve a medir).
- [x] **Arreglar la prueba de las raíces de la Raíz Madre que falla sola:** encontrar por qué a veces falla (azar sin
      semilla, tiempo, orden) y dejarla estable. Criterio: 20 corridas seguidas de `index.html?test` sin fallos.
      Hecho 2026-10-16: eran dos causas (una de la prueba y un error chico del juego), ver REWORK.md §9.
- [x] **Banco de balance de Custom Hero que se pueda repetir:** partidas de la IA contra la IA con semilla fija, que
      salga una tabla de victorias, ronda promedio de muerte y daño por héroe. Que se pueda correr con un parámetro de
      la URL y guardar los números en `docs/BALANCE-CH.md`. Medir la base actual (¿el Sniper sigue ganando 8 de 14?).
      Hecho 2026-10-16: `index.html?banco=66`. Sin daño por héroe (el juego no lo cuenta todavía).
- [ ] **Partir `ui.js`** (riesgo 2): 1.113 líneas con 21 preguntas por el modo. Pasar lo que solo dibuja la Torre a
      `towerView.js` (ya existe), una función por paso, sin cambiar cómo se ve. Medir antes y después con el script del mapa.
- [ ] **Ganchos de la Torre en el núcleo** (riesgo 3): que `combat.js`, `creeps.js`, `effects.js`, `hero.js` y
      `death.js` no llamen a funciones `tower*` sueltas. Una prueba que verifique que Custom Hero juega una ronda con
      el piloto sin errores aunque falte un gancho de la Torre; después juntar los ganchos detrás de un solo objeto.
- [ ] **Atajos de teclado de los dos modos en un solo lugar** (riesgo 5): `pause.js` y `game.js` mezclan las teclas de
      los dos juegos. Una prueba que avise si dos acciones del mismo modo usan la misma tecla.
- [ ] **Balance de Custom Hero con números** (al final, con el combate nuevo): con el banco (`?banco=66` o más),
      acercar a los héroes que más ganan y a los que menos, un héroe por ítem, con números de antes y después.
      Ojo con el ruido: cualquier cambio da otras partidas, así que con 66 partidas el margen es de unos ±8 puntos;
      para decidir, usar 132 o más. Medido el 2026-10-16 con 132 partidas: Sniper 65% (alcance 4,5: 62%; alcance 4: 49%;
      Disparo Congelante que frena menos: 66%; menos bonus por distancia y menos crítico de la definitiva: sin bajar).
      Ver "Esperando al usuario" para qué hacer con el Sniper mientras tanto.
- Regla para el balance (riesgo 4): `data/creeps.js`, `data/bosses.js`, `effects.js` y `combat.js` los usan los dos
  modos. Todo ajuste ahí se mide en Custom Hero **y** en la Torre (piloto), con números de los dos.

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
- [x] **Jefes escondidos:** uno por piso según la tabla de TORRE-MUNDO.md.
  - [x] Paso 1: el Ciervo Blanco del piso 1 (solo de noche en un claro apartado, se va al amanecer), con su entrada
        del Bestiario y una pieza única (Astas del Ciervo Blanco). 2026-10-14.
  - [x] Paso 2: la Flor Carnívora del piso 2, en el invernadero tapiado (sala grande sellada con una pared
        agrietada; la flor echó raíces y escupe espinas). 2026-10-14.
  - [x] Paso 3: el Leviatán del Fango del piso 3, encerrado en la sala de bombas. 2026-10-14.
  - [x] Paso 4: la Semilla Primera del piso 4, en el hueco de la raíz. 2026-10-14.
  - [x] Paso 5: el Guardián de Arena del piso 5, en la sala del reloj detenido. 2026-10-14.
  - [x] Paso 6: el Lector Sin Ojos del piso 6, entre las estanterías hundidas. 2026-10-14.
  - [x] Paso 7a: el Lobo de Escarcha del piso 7, en el mirador cerrado. 2026-10-14.
  - [x] Paso 7b: el Vigía Perdido (piso 8) y el Yunque Vivo (piso 9). 2026-10-14.
  - [x] Botas y anillos únicos (decisión del usuario, 2026-10-14: solo de los jefes escondidos): el Ciervo Blanco suelta
        las Botas del Ciervo Blanco y la Flor Carnívora el Anillo de la Flor Carnívora. Las botas y anillos de stats
        sueltos del botín (20% de las piezas, desde el 2026-10-07) siguen igual. 2026-10-14.
  - [x] Dibujo propio del ciervo: cuerpo de pixel art propio (patas largas, cuello alto, astas de hueso, manchas y
        cola blanca), solo para el Ciervo Blanco. 2026-10-14.
- [x] **La gente del pueblo se ve:** 2 o 3 personajes en pixel art que caminan por el pueblo, con el aspecto de su
      gente (barqueros, relojeros, faroleros…). Hablás con F y cada run dicen algo nuevo.
- [x] **Pedidos que cruzan pisos:** ej. la llave de las compuertas (piso 5) abre la sala de bombas del piso 3.
      La piedra de regreso permite volver.
  - [x] Paso 1: la Llave de las Compuertas (la suelta el Guardián de Arena, piso 5) abre las compuertas del piso 3, una
        sala con reja de hierro y un cofre (js/towerQuests.js). 2026-10-14.
  - [x] Paso 2: la llave del almacén de los faroleros (la suelta el Vigía Perdido, piso 8) abre el almacén del piso 7:
        cofre y se prenden todos los faroles de la galería. 2026-10-14.
  - [x] Paso 3: hacia arriba: la llave del Archivo Sellado (la suelta la Semilla Primera, piso 4) abre el archivo del
        piso 6 (reja, cofre y una línea de la historia). 2026-10-14.
- [x] **El misterio de cada piso, jugable:** compuertas que bajan el agua (3), relojes que cambian el laberinto (5),
      faroles que hay que encender de noche (7). De a uno, empezando por el 3.
  - [x] Piso 3: al abrir las compuertas baja el agua de todo el piso (fondo seco) y asoman 2 cofres hundidos. 2026-10-14.
  - [x] Piso 5: relojes que cambian el laberinto: 8 compuertas de arena en 2 tandas que se dan vuelta cada 30 s
        (js/towerMysteries.js). 2026-10-14.
  - [x] Piso 7: faroles que hay que encender de noche: 8 al costado del camino, con F; de noche se ve menos salvo cerca
        de uno prendido; todos prendidos, paga Isla. 2026-10-14.
- [ ] **Menos explorado hacia arriba:** caminos, carteles, tamaño del pueblo, mapa que vende el mercader y luz según la
      tabla de TORRE-MUNDO.md.
  - [x] Paso 1: carteles en los pisos 1 a 3 (al pueblo, cerca de la entrada, y al laberinto, a la salida del pueblo). 2026-10-14.
  - [x] Paso 2: caminos que se cortan hacia arriba (4-6 hasta el pueblo, 7-9 tramos sueltos, 10+ ninguno): solo cambia
        el suelo, al final de armar el piso (el paso sigue abierto, los faroles del 7 ya están puestos). 2026-10-14.
  - [x] Paso 3: el mercader vende el mapa del piso (pisos 1-6): 40g + 20 por piso; muestra lo que se camina. 2026-10-14.
  - [x] Paso 4a: más oscuro arriba: penumbra de día en el campo (0,3 en 7-9, 0,5 desde el 10). 2026-10-14.
  - [ ] Paso 4b (decisión): pueblos más chicos arriba, sin mercader fijo en 7-9 y sin pueblo desde el 10 (cambia la economía).
- [x] **Transición de biomas:** cerca de la escalera ya se ve el bioma de arriba (arena que cae, nieve que entra).
      Hecho con el clima: a 14 casillas de la escalera, el del piso de arriba (más fuerte cuanto más cerca) y un aviso. 2026-10-14.
- [ ] **El piso 1 afuera:** la torre gigante se ve desde el bosque (silueta al fondo) y el laberinto es su puerta.
  - [x] El laberinto como base de la torre: muro exterior más oscuro y pesado con contrafuertes, y la entrada con dos
        pilares altos y el cartel "Puerta de la Torre". 2026-10-14.
  - [ ] (decisión) La silueta al fondo: en vista de arriba no hay "fondo"; opciones en Esperando al usuario.

## Fase T00 — Rework de equipo, habilidades y stats (decidido por el usuario 2026-10-14, `docs/PROPUESTA-SISTEMAS.md`)
Decidido: **3 clases fijas al estilo Risk of Rain** (cada una con sus habilidades y su pasiva, ya no salen del
equipo), **reliquias apilables** con etiquetas y bonus de conjunto (lo que arma cada run), **la armadura** como única
pieza de equipo, **elegir 1 de 3 mejoras al subir de nivel**, **arenas de jefes con la llave del piso** y **PixiJS**.

Las clases (diseño del usuario, 2026-10-14; clic izquierdo = básico, clic derecho, Espacio = movilidad):
- **Guerrero** (espada): combo de 3 tajos · parada · rodar · pasiva: el daño físico puede ser crítico (o critea más).
- **Mago** (bastón): orbe de magia que rebota 1 vez · tormenta de 3 rayos a enemigos al azar · teletransporte corto ·
  pasiva **Carga** (decidido por el usuario 2026-10-14): mantener apretada una habilidad la carga en 3 etapas; cada
  etapa sortea una mejora que se ve sobre el mago mientras cargás (más área, más daño, más velocidad, más tamaño o un
  rebote más; pueden repetirse y se apilan) y al soltar sale con todo lo que juntó. Es una apuesta: cargar más es más
  fuerte pero te deja quieto más tiempo.
- **Cuarta habilidad (decidido por el usuario 2026-10-14): cada clase tiene una "especial"** con enfriamiento largo
  (~20 s), desde el principio, en la R. Propuesta (a corregir en el feedback): Guerrero, **Torbellino** (giro que pega
  alrededor y empuja); Arquero, **Lluvia de Flechas** (zona en el cursor que pega varias veces); Mago, **Meteoro** (cae
  en el cursor tras un aviso y deja el suelo ardiendo).
- El Arquero **conserva el Tiro Tensado en la Q** (decidido por el usuario 2026-10-14).
- **Arquero** (arco): ráfaga de 3 flechas · flechazo que critea y aturde · impulso rápido hacia el mouse · pasiva: sus
  habilidades y reliquias se activan más rápido (menos enfriamiento y más chance de disparo de las reliquias).
- [x] **Reliquias, paso 1 (motor):** `js/towerRelics.js` con reliquias que se apilan y se enganchan a los eventos que
      ya emite el combate (`emit`: onHit, onKill, onCast, onDamaged, onTick) más dos nuevos (al esquivar, al parar).
      12 reliquias con 4 etiquetas (fuego, sangrado, crítico, escudo) y el bonus al juntar 3 de una etiqueta. Caen de
      campeones, cofres y jefes; fila de íconos en la interfaz con su cartel. Convive con lo viejo. Medir con el piloto:
      daño por piso y variación entre runs, antes y después. 2026-10-14.
- [x] **Subir de nivel: elegir 1 de 3 mejoras** (ventana con 3 cartas, como Hades), con umbrales por atributo (3 de
      Fuerza destraban un efecto, etc.). Reemplaza los 5 puntos por nivel; el piloto elige con una regla. 2026-10-14.
  - [x] Paso 2a: una mejora de clase a las 4 elecciones del stat principal: Remate Aturdidor (Guerrero), Flechazo
        Perforante (Arquero), Eco del Orbe (Mago). 2026-10-14.
  - [x] Paso 2b: segunda mejora de clase a las 8: Espejo de Acero (parada doble y más larga), Paso de Viento (esquive
        40% más rápido), Tormenta Mayor (+2 rayos). 2026-10-14. Vigilar la Tormenta Mayor (+67% a la tormenta).
- [x] **Las 3 clases, paso 1: el Guerrero** completo (combo, parada, rodar y su pasiva) con las teclas fijas; las
      habilidades dejan de salir del equipo. Medir con el piloto contra la espada de hoy.
  - [x] 1a: las armas iniciales son clases (Guerrero, Arquero, Mago: nombre en el pedestal y en el cartel, se guarda
        con la run) y la pasiva del Guerrero, Templanza (+5% de crítico y el daño físico de habilidades puede critear).
        2026-10-14.
  - [x] 1b: el Guerrero pelea solo con su kit (combo con clic, parada con clic derecho, rodar con Espacio): el equipo ya
        no le da Q/E/R ni pasivas, solo stats, y el cartel de la pieza lo avisa. 2026-10-14.
  - [x] 1c: revisada la dificultad sin las Q/E/R con la especial: el piloto no la usaba (ahora sí, con 2+ enemigos o un
        jefe). 45 min con reflejos humanos: Guerrero piso 4 a los 41, Arquero a los 40, Mago a los 35 (vigilar: ~15% más
        rápido); 0 muertes. Igual que el Guerrero con Q/E/R (piso 4 a los 41). 2026-10-14.
- [x] **Las 3 clases, paso 2: el Arquero** (ráfaga de 3, flechazo que critea y aturde, impulso hacia el mouse, pasiva
      Ojo Rápido; sin Q/E/R del equipo, conserva el Tiro Tensado en la Q). 2026-10-14.
- [x] **Las 3 clases, paso 3: el Mago** (2026-10-14: tocando, +6% en grupo y −5% solo contra el Guerrero; cargando, +29% / −14%) (orbe que rebota 1 vez, tormenta de 3 rayos a enemigos al azar,
      teletransporte corto, pasiva Carga). Medir contra el Guerrero (±10%).
- [x] **Las 3 clases, paso 4: la especial (R) de cada clase** (2026-10-14: cada una suma 12-20% de daño en grupo) (Torbellino, Lluvia de Flechas, Meteoro), medida. Cada uno medido contra el Guerrero (daño por segundo
      parejo ±10%, muertes por piso).
- [ ] **El equipo queda en la armadura:** una sola pieza (vida, armadura, 1 rasgo) que se encuentra y se mejora. Las
      piezas de héroes de Custom Hero salen del botín de la Torre (o pasan a ser reliquias). Medir daño por piso ±15%.
- [ ] **Mercader y herrero nuevos:** el mercader vende 3 reliquias por piso (y rerolls); el herrero mejora la armadura
      (o le cambia el rasgo) y funde 2 reliquias iguales en su versión mayor. Se van fundir y traspasar.
  - [x] El mercader vende 3 reliquias por piso (200g + 60 por piso) y se pueden cambiar (25g, +50% cada vez). 2026-10-14.
  - [ ] El herrero (va con "el equipo queda en la armadura").
- [ ] **Esencia que desbloquea reliquias** nuevas en el mazo; las piezas únicas de los jefes escondidos pasan a ser
      reliquias únicas.
- [ ] **Más reliquias**, de a 5 por entrega y midiendo, hasta 40.
  - [x] Entrega 1 (17): etiqueta Rayo (Chispa, Pararrayos, Bobina; conjunto Tormenta), Fuelle (fuego) y Costra (escudo). 2026-10-14.
  - [x] Entrega 2 (22): etiqueta Hielo (Escarcha, Copo, Carámbano; conjunto Glaciar), Garfio (sangrado), Nube Cargada (rayo). 2026-10-14.
  - [x] Entrega 3 (27): etiqueta Viento (Pluma, Ráfaga, Remolino; conjunto Ventarrón), Sangre Fría (sangrado), Ascua (fuego). 2026-10-14.
- [x] **Arenas de jefes, paso 1:** la sala del guardián se cierra al entrar (rejas) hasta que gane alguien; la puerta
      pide la **llave del piso**, que lleva el campeón más fuerte (marcado en el mapa y en el objetivo del piso).
  - [x] 1a: la sala del guardián se cierra al entrar y se abre al vencerlo, al morir o al irte del piso. 2026-10-14.
  - [x] 1b: la llave del piso: la lleva el campeón más fuerte alcanzable (🗝️ arriba suyo, en el mapa y en el objetivo);
        hasta vencerlo, rejas doradas en la sala del guardián. 2026-10-14.
- [ ] **Arenas, paso 2:** los jefes escondidos también pelean en arena cerrada; la llave puede salir del misterio del
      piso (compuertas, relojes, faroles).
  - [x] 2a: la sala tapiada del jefe escondido (pisos 2-9): rota la grieta, al entrar bajan rejas sobre ella hasta que gane
        alguien. 2026-10-14.
  - [ ] 2b (decisión): ¿la llave del piso puede salir también del misterio (compuertas, relojes, faroles)?
- [ ] **PixiJS, paso 1:** probar PixiJS (WebGL) dibujando encima del canvas actual solo la capa de luces (antorchas,
      fogatas, balas, noche) y medir cuadros por segundo antes y después. Si anda, migrar de a capas.

## Fase T1 — Cerrar el loop (lo que falta para que sea un juego completo)
- [x] **Pantalla de fin de run** (2026-10-14: al conquistar la torre; morir no termina la run):** al morir o ganar, un resumen claro con el piso alcanzado, el tiempo, las bajas,
      quién te mató, la build final (íconos de las piezas), lo que ganaste para siempre (Esencia, entradas del
      Códice) y un botón grande "▶ Otra run". Es el puente entre la run y la metaprogresión.
- [x] **Mejor marca y estadísticas guardadas** (2026-10-14: piso más alto, runs, cumbres y mejor tiempo en el menú): piso más alto, runs jugadas, Cumbres, mejor tiempo. Se muestran en
      el menú de Infinite Tower y en el resumen ("¡Nuevo récord!").
- [x] **Ascenso infinito, paso 1** (2026-10-14: botón en la pantalla de la Cumbre; 11+ con biomas mezclados): después del piso 10 (la Cumbre) se ofrece "Seguir subiendo" o "Volver con el
      botín". Los pisos 11 en adelante ("Lo No Escrito": la torre crece) mezclan biomas al azar y escalan con la fórmula del piso (REWORK.md §14),
      con tope blando para que el jugador no choque contra una pared exponencial (medir con el piloto).
- [x] **Ascenso infinito, paso 2 (hitos):** guardián cada 5 pisos. Cada 10 pisos se suma un **agravante** a los
      enemigos (escudo → escudo que refleja → escudo que cura a los cercanos), anunciado con un cartel. Piedra de
      regreso cada 10 pisos como punto de control.
  - [x] 2a: el primer agravante: desde el piso 20 los enemigos tienen escudo del 20% de su vida, con aviso al llegar. 2026-10-14.
  - [x] 2b: desde el 30 el escudo devuelve 30% de lo que absorbe; desde el 40, con escudo, curan 3% cada 3 s a los aliados
        a 3 casillas. 2026-10-14. (Falta: los que salen de noche también con escudo.)
- [x] **Guardar en el Ascenso:** el guardado de la run (towerSave.js) incluye el piso infinito y los agravantes. (2026-10-14:
      el piso y el Ascenso; los agravantes, cuando existan, en el paso 2.)
- [x] **La Cumbre como final** (2026-10-14): una escena corta al vencer al guardián del piso 10 (la torre se abre, el cuaderno
      escribe la última página) antes de ofrecer seguir subiendo.

## Fase T2 — Sensación de juego y claridad
- [ ] **Las pruebas escriben en el guardado real de localhost:** al correr toda la batería en `index.html?test`,
      `towerSavePersist` termina en `true` (ninguna prueba sola lo hace; pasa con `runTests`). Solo afecta a la dirección de
      pruebas, no al juego publicado. Encontrar quién lo cambia y forzarlo en falso en `runTests`.
- [ ] **Ataques de la espada de frente y de espaldas:** los 3 tajos del combo hacia abajo y hacia arriba con su
      estela, en el estilo de `docs/arte/vistas-frente-espalda.py` y la paleta de `js/towerHeroArt.js`.
- [ ] **Golpe recibido y caída propios del héroe dibujado:** hoy se arman con el cuadro de quieto.
- [ ] **Parada y esquive de frente y de espaldas.**
- [x] **Señal clara al recibir daño** (2026-10-14: borde rojo según el daño; falta medir golpes sin aviso con el piloto): destello rojo en el borde de la pantalla, un sonido propio y la barra de
      vida que tiembla. Medir con el piloto cuántos golpes recibidos no tenían aviso previo (meta: 0).
- [x] **Pausa de impacto por peso** (2026-10-14: espada contra jefes, 65 ms; el remate, 75 ms): el remate del combo y el golpe a un guardián frenan 60-90 ms; los golpes chicos,
      nada. Revisar que no se apilen (REWORK.md §8).
- [x] **Señores de cueva con daño desmedido:** midiendo el piso 6 salió uno con 1833 de daño por golpe (los demás,
      261-393). Buscar qué combinación de afijos de campeón lo dispara y ponerle tope.
- [x] **Prueba aleatoria de la Raíz Madre:** con el bestiario fijo pasa 260 de 260 veces (lo que variaba eran las criaturas generadas). 2026-10-14.
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
- [x] **Resumen después de cada ronda** (2026-10-15): oro ganado, de dónde salió (bajas, interés, racha, apuesta), vida
      perdida y la posición en el ranking. Enseña la economía sin texto largo.
- [x] **Interés y racha visibles** (2026-10-15: interés tope 25, racha +5/+10/+15): +1 de oro por cada 10 ahorrados (con tope) y bonus por racha de victorias o
      derrotas, mostrado en la barra de oro. Medir que no domine "ahorrar siempre".
- [x] **Muerte súbita** (2026-10-15: desde la ronda 15, +50% de daño recibido por ronda): desde una ronda fija (medir cuál deja partidas de 15-25 min; Custom Hero Clash usa ~31),
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

- **El Sniper mientras tanto (Custom Hero):** gana 65% de sus partidas (lo parejo es 12,5%) y ningún ajuste chico lo
  baja lo suficiente. Opciones: (a) **dejarlo como está hasta el balance del final (recomendada: el combate nuevo va a
  cambiar los números igual)**; (b) sacarlo de la elección y de los rivales por ahora, sin borrar su código (una marca en su
  ficha; la Torre lo sigue usando); (c) alcance 4 ya (baja a ~49%).

- **Editor externo de pixel art (Fase B1):** hoy el arte se dibuja con código (`pxSprite`). Opciones: (a) **seguir con
  código y usar la galería y la guía de estilo (recomendada por ahora: no cambia nada de cómo se hace y ya funciona)**;
  (b) Piskel (gratis, en el navegador) para sprites nuevos o retoques, exportando PNG que carga el juego, conviviendo con
  los de código; (c) Aseprite (unos US$20, el estándar de pixel art y animación) para pasar de a poco el arte a imágenes.

- **La silueta de la torre en el piso 1:** la vista es de arriba, así que no hay un "fondo" donde verla. Opciones: (a) **una
  sombra gigante de la torre sobre el bosque que se mueve con el día (recomendada: se ve desde todo el piso sin tapar nada)**;
  (b) la silueta en la pantalla de carga del piso 1 y en el mapa; (c) dejarlo con la base y el portón que ya están.

- **La llave del piso desde el misterio (Arenas, paso 2b):** hoy la lleva el campeón más fuerte. Opciones: (a) **dejarla
  así y que el misterio dé otro premio (recomendada: ya funciona y el piloto la consigue)**; (b) en los pisos 3, 5 y 7 la
  llave sale del misterio (compuertas, relojes, faroles) en vez del campeón; (c) las dos: cualquiera de las dos abre.

- **Pueblos más chicos arriba (Menos explorado, paso 4b):** la tabla de TORRE-MUNDO.md pide pueblo chico sin mercader fijo
  en 7-9 y sin pueblo desde el 10. Opciones: (a) **solo achicar el pueblo y sacar la gente en 10+, el mercader sigue**
  (recomendada: no toca la economía); (b) en 7-9 el mercader aparece algunas runs (como el herrero) y en 10+ no hay
  pueblo; (c) hacerlo tal cual la tabla.

## Hecho por el modo automático
(Fecha · ítem · commit · qué se midió.)
- 2026-10-17 · Murciélago (a pedido, en el chat) · ver git log · cuerpo nuevo `bat` (pixel art y tinta) que aletea y flota; sale como escurridizo en todos los biomas (~1 de cada 4). Los packs bajados se usan solo de referencia: el repo es público y sus licencias no dejan subir los archivos.
- 2026-10-17 · Hongo con patas (a pedido, en el chat) · ver git log · cuerpo nuevo `mushroom` (pixel art y tinta), peleador o aturdidor solo en bosque y pantano (~1 de cada 6 peleadores). Pruebas 281/281.
- 2026-10-17 · Héroe de frente y de espaldas calcado de la hoja del usuario (a pedido, en el chat) · ver git log · figuras S y N de la hoja (184 px de alto) llevadas a 24 filas; 12 piezas + 3 espadas arman 10 cuadros; quieto de frente con la capa cerrada. En el muñeco las cajas de golpe calzan sin cambios. Pruebas 281/281.
- 2026-10-17 · Héroe por piezas de frente y de espaldas (a pedido, en el chat) · ver git log · 10 cuadros (quieto + 4 de caminar por vista) armados con 11 piezas y 2 espadas; todos 17×24 como el de costado y con la empuñadura en la mano que marca el cuadro. Pruebas 281/281.
- 2026-10-16 · Muñeco, paso 1c (a pedido, en el chat) · 2bd9076 · Onda de corte 120/50/250 ms a 160 px/s (8 de daño); bola del muñeco cada 1,8 s con aviso de 0,5 s, 85 px/s y 20 de daño; golpe recibido 0/120/140 ms con 9 px de empujón; la parada devuelve la bola ×1,5 de rápido y ×2 de daño; caída 200/500/1400 ms y se levanta con 100. Pruebas 279/279.
- 2026-10-16 · Muñeco, paso 1b (a pedido, en el chat) · 99672a8 · Tajo 1 70/80/220 ms (10 de daño), revés 60/80/220 (12), remate 160/100/320 (22, congelado 90 ms y sacudón), parada 40/300/180 (5); el combo entero le hace 44 al muñeco y nunca pega en la preparación. Pruebas 278/278.
- 2026-10-16 · Muñeco, paso 1a (a pedido, en el chat) · 2c1a4ca · `index.html?muneco`: sala de 240×150, caminar a 62 px/s, esquive 50/160/120 ms que recorre 35 px (210 px/s en el tiempo activo); choca con bordes, cajón, columna, escalón y el muñeco. Pruebas 277/277.
- 2026-10-16 · Banco de balance de Custom Hero (a pedido, en el chat) · 4ce62c0 · 66 partidas con semilla fija (~2,5 s cada una): Sniper gana 59% (26/44), Zeus 29%, Sabio del Vacío y Alquimista 0%; ronda final promedio 24 (20-30). La misma semilla repite la partida (3/3). Hubo que apagar los sonidos en el banco: usaban Math.random según el tiempo real. Pruebas 276/276.
- 2026-10-16 · Prueba de las raíces de la Raíz Madre estable (a pedido, en el chat) · 3ab3ca4 · antes fallaba ~1 de cada 40-100 corridas de esa prueba; la fase 2 plantaba 2 raíces en vez de 3 en 1 de 300 pisos. Después: 487/487 corridas de la prueba, 300/300 pisos con las 3 raíces y 20/20 corridas completas en verde. Pruebas 275/275.
- 2026-10-16 · Mapa de lo compartido entre los modos (a pedido, en el chat) · f841f7e · 97 scripts; Torre 9.867 líneas y resto 8.396; el núcleo usa 174 globales de la Torre; 15 variables que cambian compartidas (`player` en 36 archivos de la Torre y 21 del resto); `ui.js` con 21 preguntas por el modo; ningún nombre declarado dos veces.
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
- 2026-10-14 · Jefes escondidos, paso 7a (Lobo de Escarcha) · 11ef3ed (lo subió junto con lo suyo otra sesión que trabajaba en paralelo) · 10/10 pisos 7, grieta a 55-204 pasos; 1246 vida/115 daño por golpe (rápido; el Lector del piso 6: 1242/191). Pruebas 244/244.
- 2026-10-14 · Jefes escondidos, paso 7b (Vigía Perdido y Yunque Vivo) · 83c11c6 · 10/10 pisos 8 y 9, grieta a 99-235 y 60-309 pasos; Vigía 1674/211, Yunque 3477→1912 vida, 169 daño (curva pisos 6-9: 1242, 1246, 1674, 1912). Pruebas 246/246.
- 2026-10-14 · Botas y anillos únicos (pedido en el chat) · a9ff2a9 · botín suelto del piso 5 sin cambios: 401/2000 piezas son botas o anillos; las dos únicas salen raras con 4-6 afijos. Pruebas 246/246.
- 2026-10-14 · Dibujo propio del ciervo (pedido en el chat) · 55401af · revisado a ojo en 4 cuadros de caminata y 2 de reposo, al lado del lobo; ojos en la cara. Pruebas 246/246.
- 2026-10-14 · La gente del pueblo se ve (pedido en el chat) · 57fec6e · 2 vecinos por piso (1 a 9) con 4 frases cada gente; en 15 s de prueba siguen adentro del pueblo y en casillas libres, caminan, se quedan quietos mientras hablan; revisado en pantalla en el piso 3. Pruebas 247/247.
- 2026-10-14 · Pedidos que cruzan pisos, paso 1 (las compuertas) · 9c97698 · 20/20 pisos 3 con la reja, alcanzable en los 20 (a 39-269 pasos); a golpes no se abre, con la llave sí; la llave se guarda con la run. Pruebas 248/248.
- 2026-10-14 · Misterio del piso 3 (el agua baja) · 7b85c59 · 20/20 pisos 3 con 2 cofres hundidos; se secan 93-356 casillas; atajo al guardián solo en 1/20 (los pozos casi nunca cortan el camino: el premio es el tesoro). Pruebas 248/248.
- 2026-10-14 · Misterio del piso 5 (los relojes) · ebfb9a1 · 20/20 pisos 5 con 8 compuertas; camino a la escalera 260-354 pasos y en las dos posiciones siempre hay camino; el reloj cambia el largo del camino en 18/20 (hasta 58 pasos). Primer intento al azar: 16/20 y 11/20. Pruebas 249/249.
- 2026-10-14 · Misterio del piso 7 (los faroles) · 52edf5e · 20/20 pisos 7 con 8 faroles; visión de noche en el campo: piso 6 3,5 casillas, piso 7 sin farol 2, al lado de uno prendido 4,5. Pruebas 250/250.
- 2026-10-14 · Pedidos que cruzan pisos, paso 2 (el almacén de faroles) · 998cdfa · 20/20 pisos 7 con el almacén, alcanzable en los 20 (36-376 pasos); la sala del Lobo de Escarcha sigue en 20/20. Pruebas 251/251.
- 2026-10-14 · Transición de biomas (pedido en el chat) · fbb63d5 · pisos 2, 4, 6 y 8: a 14 casillas de la escalera, clima de arriba con intensidad 0,25 a 1 según la distancia y aviso a 8; revisado en pantalla en el piso 6 (nieve en el laberinto del desierto). Pruebas 252/252.
- 2026-10-14 · Menos explorado, paso 1 (carteles) · f1829d0 · 20/20 pisos 1-3 con los 2 carteles, el primero a 3-8 casillas de la entrada; piso 4 sin carteles. Pruebas 253/253.
- 2026-10-14 · Menos explorado, paso 3 (el mapa del piso) · a427481 · pisos 1/3/6: 60/100/160g, muestra el 84/87/90% del mapa, tarda ~20 ms; las salas tapiadas no figuran; comprado desde la tienda en pantalla. Pruebas 254/254.
- 2026-10-14 · Menos explorado, paso 2 (el camino se pierde) · e48d717 · casillas de camino en 5 torres: piso 1 638-930, 4-6 204-403, 7-9 158-265 (primero con tramos de 1 cada 2 quedaba más que en 4-6: pasé a 1 cada 3), 10: 0; escalera alcanzable; faroles del 7 siguen en 8. Pruebas 255/255.
- 2026-10-14 · Menos explorado, paso 4a (penumbra) · ee1ca59 · visión de día en el campo: piso 5 6 casillas, piso 8 5,25, piso 10 4,75; de noche igual que antes. Se arregló de paso la prueba de la gente del pueblo (a veces contestaba el otro vecino). Pruebas 256/256.
- 2026-10-14 · Cómo funciona en la pausa (pedido en el chat, para los testers) · 7accf65 · 15 secciones plegables, una por sistema, con las teclas configuradas; revisado en pantalla. Pruebas 257/257.
- 2026-10-14 · Pedidos que cruzan pisos, paso 3 (el Archivo Sellado) · 876ee0f · 20/20 pisos 6 con el archivo, alcanzable en los 20; la sala del Lector Sin Ojos sigue en 20/20; prueba nueva que recorre todos los pedidos. Pruebas 258/258.
- 2026-10-14 · Sin mouse y con joystick (pedido en el chat) · e0069af · con teclas de verdad en el navegador: U apunta solo al Grunt, el héroe va y le pega (3000→2971), la mira se ve; el joystick no se pudo probar sin uno conectado (la prueba mira que los botones manden las teclas). Pruebas 259/259.
- 2026-10-14 · Subir de nivel, paso 2a (mejoras de clase) · 77d3fc7 · Eco del Orbe: 40 orbes contra 4 muñecos agrupados, 1801→2002 de daño (+11%; contra uno solo no suma); el remate aturde y el flechazo atraviesa (probados). Pruebas 260/260.
- 2026-10-14 · Subir de nivel, paso 2b (mejoras de clase a las 8) · c5697c5 · tormenta contra 5 agrupados (promedio de 20): 87→145 de daño (+67%, de 3 a 5 rayos; enfriamiento de 7 s y llega tarde); la parada dura 0,45 s en vez de 0,3. Se arregló la prueba de la gente del pueblo (dejaba al héroe en casilla con decimales). Pruebas 260/260.
- 2026-10-14 · Guerrero 1c (dificultad sin Q/E/R) · 04663cd · el piloto no usaba la especial: sin ella el Guerrero llegaba al piso 3 a los 33 min y no pasaba; con ella (80 usos), piso 4 a los 41 = igual que con Q/E/R. Arquero piso 4 a los 40 (121 usos), Mago a los 35 (112 usos). 0 muertes en las tres. Pruebas 261/261.
- 2026-10-14 · Más reliquias, entrega 1 (12→17) · c982487 · Guerrero 60 s contra 3 muñecos, 1 copia: Brasa +4%, Colmillo +3%, Chispa +2%, Bobina +7% con 35% → bajada a 25%: +4%. Pruebas 262/262.
- 2026-10-14 · Arenas, paso 1a (rejas en la sala del guardián) · 9c835fc · piloto Guerrero con reflejos humanos: piso 1 en 13,6 min con 48 s encerrado (todo peleando); dos corridas de 45 min: piso 3 a los 35 y a los 28, 0 muertes (la corrida sin rejas: piso 4 a los 41; la diferencia está antes del primer cierre: variación). Pruebas 263/263.
- 2026-10-14 · Arenas, paso 1b (la llave del piso) · e989da8 · 19/20 pisos con llave. El piloto se trababa 2 veces: salía por una entrada ocupada y quedaba encerrado afuera, y el guardián salía de su sala y lo dejaba encerrado solo (arreglados: la pelea se corta). Después: Guerrero 45 min, piso 2 a los 18, piso 3 a los 34, 3 llaves, 0 muertes. Pruebas 264/264.
- 2026-10-14 · Arenas, paso 2a (jefes escondidos) · 9da85d2 · 24/24 salas (pisos 2-9, 3 torres) con su sala y grieta registradas; probado: con la grieta sana nada, rota y adentro se cierra, vencido se abre. Pruebas 265/265.
- 2026-10-14 · Más reliquias, entrega 2 (17→22) · c5493a6 · Guerrero 60 s contra 3 muñecos, 1 copia: Nube +3% (Brasa +5% en la misma tanda); las de hielo frenan (no suman daño a muñecos). Pruebas 266/266 (la Raíz Madre falló sola una vez).
- 2026-10-14 · Mercader: 3 reliquias por piso · 19872a2 · el piloto llega al piso 2 con ~830g: con 120+40 por reliquia compraba 4 (el doble de las que caen, ~2,3 por piso) → 200+60 (320 en el piso 2, como un Tomo). El piloto no las compra (no cambia sus mediciones). Columna "A la venta" más ancha. Pruebas 267/267.
- 2026-10-14 · Joystick: B cierra las ventanas (pedido en el chat) · 4797cd0 · probado con un joystick simulado: en pausa B manda Esc, jugando esquiva. Pruebas 267/267.
- 2026-10-14 · Cartas de nivel sin mouse y con joystick · 428656c · probado con teclas de verdad: → marca la segunda y U la elige (+5 al stat); el 3 elige la tercera; revisado en pantalla. La lista de stats filtra las mejoras por clase. Pruebas 268/268.
- 2026-10-14 · Más reliquias, entrega 3 (22→27) · 8b0b958 · son de esquive, defensa y movimiento: probadas una por una (Pluma da velocidad, Ráfaga empuja y pega, Ventarrón da +30% tras esquivar, Sangre Fría cura); sin banco de daño (los muñecos no pegan). Pruebas 269/269.
- 2026-10-14 · Piso 1: base de la torre y portón · 046b76e · revisado en pantalla (los pilares primero quedaban oscuros como el muro: aclarados). Pruebas 270/270.
- 2026-10-14 · Pantalla de fin de run · 3c6efa5 · al conquistar la torre: piso, tiempo, nivel, muertes, bajas, campeones, guardianes, oro, reliquias, Códice/Esencia, récord y "▶ Otra run" (probado: arranca una run nueva); revisada en pantalla. Pruebas 270/270.
- 2026-10-14 · Ascenso infinito, paso 1 · e511640 · guardián por piso: 10 12206, 11 13387, 12 14569, 13 15750, 14 16931 de vida (+~1180 por piso, lineal: sin pared); biomas del 11 al 15 mezclados. "Otra run" sigue disponible. Pruebas 271/271.
- 2026-10-14 · Guardar en el Ascenso · fec925e · el guardado lleva el Ascenso y el piso 11+ (probado con la foto del guardado). Pruebas 271/271.
- 2026-10-14 · Ascenso, paso 2a (escudo desde el 20) · 47740cb · en el piso 19 sin escudo, en el 20 escudo del 20% de la vida que absorbe antes que la vida (probado). Pruebas 272/272.
- 2026-10-14 · Ascenso, paso 2b (reflejo y cura) · b056875 · probado: en el 30 un golpe al escudo te devuelve daño; en el 40 un aliado con 1 de vida se cura al lado de uno con escudo. Pruebas 272/272.
- 2026-10-14 · La Cumbre como final · e2568ab · escena de 4 líneas que aparecen cada 1,6 s, página nueva del Cuaderno ("La Cumbre") y "Continuar" lleva al resumen; revisada en pantalla. Pruebas 272/272.
- 2026-10-15 · Custom Hero C1: resumen de ronda, interés y racha (pedido en el chat) · 9309f97 · 2 partidas completas con el piloto: oro por ronda 131 (bajas 95, jefe 27, interés 4 = 3%, racha 1 = 1%: no se notaban) → con tope 25 y racha +5/+10/+15: 154 por ronda, interés 9%, racha 3%. Pruebas 273/273.
- 2026-10-15 · Custom Hero C1: muerte súbita · af8a08c · 8 partidas con el piloto por variante: sin muerte súbita 33-46 rondas y 33-39 min; desde la 15 con +20% por ronda 23-32 rondas (el Sniper ganó 5 de 8); desde la 20, 25-37; desde la 15 con +50%: 20-26 rondas, 16-21 min, 6 ganadores distintos (máx. 3 de 8). Minutos = combate + 25 s de preparación por ronda. Pruebas 274/274.
- 2026-10-14 · Reliquias, paso 1 (motor y 12 reliquias) · 8c1e664 · piloto con reflejos humanos, 45 min: sin reliquias piso 3 y 2 muertes; con 0,25/0,35 de chance, 19 reliquias en 3 pisos (demasiadas); con 0,05/0,10, 7 en 3 pisos (~2,3 por piso), piso 4 y 0 muertes. Pruebas 239/239.
- 2026-10-14 · Subir de nivel: 1 de 3 mejoras · 6716de1 · piloto con reflejos humanos, 45 min: piso 4 a los 41 min, 0 muertes, nivel 15, 6 reliquias (igual que sin la elección: piso 4 a los 43 min); destrabó Piel de Roble, Golpe Pesado y Sangre Espesa. Pruebas 240/240.
- 2026-10-14 · Guerrero, paso 1a (clases y Templanza) · 259f4bc · banco de 60 s contra un muñeco, 8 muestras: 119 de daño/s sin pasiva y 116 con ella (sin diferencia: el combo ya critea; el ruido es ±25). Pruebas 241/241; se arregló la prueba de visión que fallaba si el héroe quedaba en una meseta.
- 2026-10-14 · Guerrero, paso 1b (sin Q/E/R del equipo) · 6b357e3 · piloto con reflejos humanos, 45 min: piso 3 a los 35 min y no llegó al 4 (antes, piso 4 a los 41); 0 muertes, nivel 14, 10 reliquias. Pruebas 241/241.
- 2026-10-14 · Arquero (kit y pasiva) · 4812da3 · banco de 60 s contra un muñeco, clic mantenido, 8 muestras: con ráfaga 0,55 y flechazo ×2,2 pegaba 150 contra 110 del Guerrero (+36%); con 0,4/1,8, +18%; con 0,33/1,8, 102 contra 93 (+10%, en el límite de la meta). Pruebas 242/242.
