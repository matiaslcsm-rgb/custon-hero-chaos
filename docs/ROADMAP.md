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
> **Apagado el 2026-10-19 (pedido del usuario: "la tarea automática sacala también").** La tarea programada quedó
> desactivada (no corre más; para borrarla del todo, desde la lista de tareas programadas de la app). Su texto está en
> `~/.claude/scheduled-tasks/mejora-automatica-chc/SKILL.md`. Lo de
> abajo es cómo funcionaba.

Tarea programada `mejora-automatica-chc`: toma el primer ítem `[ ]` que no diga **(decisión)**, lo hace, lo prueba,
lo documenta, lo sube y lo marca `[x]` con la fecha y el commit. Los ítems **(decisión)** esperan que el usuario
elija; el modo automático anota las opciones en "Esperando al usuario" y los saltea.
- Trabaja de corrido mientras el límite de 5 horas del plan esté **por debajo del 50%** y frena al llegar.
  Si el límite **semanal** llegó al 50%, no trabaja en el juego.
- **Sin agentes** (pedido del usuario 2026-10-19; antes, desde el 2026-10-18, repartía a los agentes): hace todo el
  trabajo solo. Los agentes de `.claude/agents/` (skill `equipo`) quedan para cuando el usuario pida "el equipo" en el chat.
- Un ítem por vez (sin tope por corrida), chico y jugable. Si un ítem es grande, lo parte en pasos y hace solo el primero.
- Sube solo si pasan **todas** las pruebas (`index.html?test`; sin abrir el navegador: `python docs/correr-pruebas.py`,
  que sale con código 0 si pasan todas; con `--veces N` las repite para cazar las que fallan a veces). Si no pasan y no lo puede arreglar, deshace sus
  cambios, anota por qué en el ítem y sigue con otro.
- Balance: se mide (simulación o banco de pruebas) antes y después, y se anotan los números.
- Rioplatense con voseo en código, comentarios, commits e interfaz. Sube `GAME_VERSION` (js/main.js) en cada entrega.
- Anota cada cambio en REWORK.md ("Interfaz y calidad de vida" o su sección) y ESTADO.md.
- No toca el guardado de partidas del jugador, no borra archivos del usuario, no cambia el estilo gráfico elegido.
- Al terminar cada corrida deja un informe en `docs/informes/` (qué hizo, qué midió, cómo probarlo) con un pie
  **"Tu feedback"**: lo que escribas ahí, la corrida siguiente lo lee primero y lo pasa al roadmap (pedido del usuario 2026-10-14).

El orden de la lista **es** la prioridad: primero lo que destraba el loop completo, después contenido y pulido.

> **🆕 2026-10-25 (decidido por el usuario): el nuevo rumbo.**
> - **Infinite Tower vuelve, pero en 2D lateral**, estilo **metroidvania conectado** (como Hollow Knight: salas hechas a
>   mano y conectadas, caminos que se abren con habilidades nuevas). Se arma como **modo nuevo en paralelo**
>   (`torre2d.html`, `js/tower2d.js`) que reusa lo que sirve (clases, reliquias, bestiario, historia y el héroe dibujado,
>   que ya es de costado); la Torre de vista desde arriba sigue jugable hasta que la nueva la alcance. **Va primero.**
> - **MATCH: el foco pasa a la creación de personajes y los menús.** Primero los 8 competidores del show (aspecto,
>   habilidades, sello y frases, cada uno aprobado por el usuario) y después un **creador de competidor para el
>   jugador** con las mismas piezas; además, los menús del juego.
> - **MATCH: el RTS queda en pausa** (los duelos, los controles estilo Dota, "no se pega caminando", la IA de rivales y
>   el banco de duelos). El parche `docs/parches/2026-10-19-no-pegar-caminando.patch` sigue guardado sin aplicar.

> **⏸ (reemplazado el 2026-10-25, ver arriba) INFINITE TOWER EN PAUSA (pedido del usuario 2026-10-18: "avanzá solo con Custom, la Tower pausala").**
> Hasta que el usuario diga otra cosa, el modo automático trabaja **solo en Custom Hero**.
> **Desde el 2026-10-18 (pedido del usuario): Custom Hero se rehace como un juego propio, sin nada de Dota: MATCH**, un
> show de competencia del futuro. **La estructura es la misma de Custom Hero; lo que cambia son los competidores, con
> mecánicas que hagan divertido y desafiante pelear entre ellos** (Fase C0, `docs/MATCH.md`, `docs/MECANICAS.md` y
> `docs/CONCEPTO-FUTURISTA.md`). Orden: los ítems sin "(decisión)" de C0, después lo que quede de C1. Todo lo marcado ⏸ en C2, C3
> y C4 espera las decisiones de C0 (no tiene sentido balancear o sumar contenido al roster que se va a reemplazar). Se saltean como si dijeran (decisión) todos los ítems de INFINITE TOWER y los de la base que son solo de
> la Torre (B2 1d, "Cajas de golpe en la Torre", la galería y el arte de la Torre). El muñeco y la base compartida
> (B0) solo si ayudan a Custom Hero. No se borra nada de la Torre: sigue jugable como está.

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
  - [ ] 1d (arte) (decisión): cuadros de ataque, parada y esquive de frente y de espaldas para la espada (hoy hacia arriba y abajo
        se usa el dibujo de costado). El 2026-10-17 el usuario sacó el borrador de estos cuadros y pidió el caballero
        afuera (`docs/arte/PEDIDO-CABALLERO.md`): el modo automático no lo dibuja hasta saber qué arte se usa.
  - [x] 1c: onda de corte (disparo del héroe), el muñeco que tira bolas de paja con aviso, recibir golpe con empujón,
        esquive intocable en su tiempo activo, parada que devuelve el disparo y caída con levantarse. 2026-10-16.
- [x] **Capturas en los informes:** si una corrida cambia algo que se ve, el informe trae captura de antes y después
      (`docs/informes/img/`, PNG chicos) para aprobarlo sin abrir el juego. 2026-10-18: `python docs/captura.py`
      sirve el juego sin caché y guarda los PNG que le manda el navegador (cómo, en el mismo archivo).
- [x] **Muñeco, paso 2:** cajas de golpe a la vista con una tecla (rojo: lo que pega, solo en los cuadros activos;
      verde: lo que puede ser golpeado; los proyectiles con su propia caja que viaja con la animación) y un panel para
      ajustar en vivo los tiempos, el tamaño de las cajas, el congelado al impacto y el empujón. Lo ajustado se guarda
      en un archivo de datos. (Las cajas a la vista ya estaban desde el 1a, tecla H.)
  - [x] 2a: panel de ajustes en vivo (tecla O): elegís el movimiento y cambiás sus tiempos, daño, avance, empujón,
        congelado, sacudón y la caja que pega (o el disparo); "Copiar datos" saca todo en JSON. 2026-10-18.
  - [x] 2b: el archivo de datos (`js/munecoDatos.js`) que el muñeco carga al empezar, con lo copiado del panel, y que el
        panel marque lo que cambió respecto de ese archivo. 2026-10-18.
  - [x] 2c: los golpes fijos que hoy no se ajustan (congelado de la parada que devuelve 0,06, de la onda 0,04 y del golpe
        recibido 0,05; la bola del muñeco) pasan a los datos y al panel. 2026-10-18: entrada "⚙️ General" del panel.
- [x] **Prueba de ida y vuelta entre modos** (riesgo 1 del mapa): jugar un rato la Torre, volver a la portada y
      empezar Custom Hero (y al revés), y revisar que `player`, `COLS`/`ROWS`, `camera`, `autopilot`, `paused`,
      `gameState` y `towerRun` queden limpios. Si algo queda sucio, arreglarlo en un solo lugar (una función que
      deje el estado como al cargar la página).
      Hecho 2026-10-18: salían sucios el piloto automático y las ventanas de la Torre; arreglado en `resetGame` (game.js).
- [ ] **⏸ Cajas de golpe en la Torre** (en pausa con la Torre): pasar el sistema del muñeco al juego, primero la espada, después el arco y el
      bastón; después Custom Hero. Que se sienta igual que en el muñeco y que pasen todas las pruebas.
      Medido el 2026-10-18 (17 píxeles del dibujo por casilla, posiciones a 3 casillas en 8 direcciones): la caja del
      tajo del muñeco agarra todo lo que agarra el cono de hoy (24 de 24) y además las 2 casillas de los costados del
      héroe (32 en total; el remate, 43). Es casi igual: pasar la caja no cambia el alcance, lo que cambia es el tiempo
      (hoy pega al instante del clic; en el muñeco, después de la preparación).

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

## Fase T2D — Infinite Tower en 2D lateral, metroidvania conectado (decidido por el usuario 2026-10-25)
Modo nuevo en paralelo: `torre2d.html` + `js/tower2d.js` (se entra desde el menú de Infinite Tower, "🧗 Torre 2D").
- [x] **Prototipo jugable:** 3 salas hechas a mano y conectadas por los bordes; correr con aceleración, salto que llega
      más alto si lo mantenés, tiempo de coyote y salto guardado; plataformas que se atraviesan desde abajo (↓ + salto
      para bajar); pinchos; el héroe dibujado con el combo de 3 tajos; caminantes; vida y respawn; **la Pluma de Arén
      da el doble salto y abre el mirador de arriba** (la primera puerta metroidvania). Medido: salto 49 px (3 bloques),
      con toque corto 25 px, doble salto 97 px. 2026-10-25.
- [x] **Sensación del personaje (game feel)** (2026-10-25, "me es importante el game feel"): flotar en la punta del
      salto y caer más rápido (subida 0,34 s, bajada 0,32 s, 44 px); corrección de esquinas; estirar y aplastar con polvo;
      tajos en 3 direcciones con el **pogo** (el tajo abajo rebota en enemigos y pinchos); pausa de impacto, temblor,
      chispas y retroceso al pegar; **dash** (Shift o clic derecho, 51 px, uno en el aire); cámara suave que mira adelante;
      sonidos del juego; **panel de ajuste en vivo (tecla T)** con 20 números, guardado en el navegador.
- [x] **Paredes** (2026-10-25, pedido del usuario): en el aire, empujando contra una pared, te pegás y bajás a 55 px/s;
      con salto, saltás para el otro lado (165 px/s de empuje, 0,14 s sin control para despegarte). Recarga el dash y el
      doble salto. Por ahora está desde el principio; puede volverse una habilidad que abre zonas.
- [x] **Combate más profundo** (2026-10-25, pedido del usuario): **golpe cargado** (mantené el tajo 0,75 s; brilla; al
      soltar avanza 33 px y saca 3 de vida); **el dash corta el tajo**; **parada (E)**: ventana de 0,18 s, si algo te pega
      adentro no hace daño y lo aturde 1,2 s; **el embestidor**: te ve, avisa con un "!" rojo 0,55 s, embiste (2 de daño),
      se frena en paredes y bordes, y pegarle corta la embestida.
- [x] **Pulido** (2026-10-25, pedido del usuario): destello blanco en el punto de impacto, números de daño que suben
      (dorados en el remate y el cargado), polvo al correr, fundido a negro entre salas y pausa con Esc (con los controles).
      Sin sonido de pasos (podía cansar); la capa que flamea va con las animaciones.
- [x] **Mundo de píxeles estilo Noita liviano** (2026-10-25, decidido por el usuario; `js/tower2dWorld.js`): cada píxel es
      un material (roca, piedra, tierra, arena, agua, madera, fuego, lava, humo, espinas); arena y agua caen y corren,
      el fuego quema la madera, la lava y el agua se hacen piedra; el héroe y los enemigos chocan contra los píxeles reales
      (sube escalones de 3 px, se pega al bajar pendientes, sale si la arena lo tapa); el tajo cava tierra y arena, el
      golpe cargado también piedra y madera; en el agua se nada; lava, fuego y espinas lastiman. Se simulan solo los
      trozos de 16×16 que se mueven. **Arregla lo de "las superficies no coinciden con el dibujo"** (ahora el dibujo es el
      choque). **Salas dibujadas como imagen** (`torre2d/salas/*.png`, guía de colores en `docs/TORRE2D-SALAS.md`; las 3
      de hoy salen de `docs/arte/torre2d-salas.py`). Tecla **H**: ver las cajas de choque.
- [x] **La playa** (2026-10-25, pedido del usuario): la primera sala es una playa (mar contra el acantilado, médanos que se
      derrumban, una roca, un tronco y la entrada a la torre) con cielo, sol, nubes y la torre a lo lejos. **El héroe
      arranca dormido en la arena** (cuadro propio, con "z") y cualquier tecla lo despierta.
- [x] **La sala de la pluma alcanzable** (2026-10-25, "no llego a agarrar el ítem"): las tablas ya no se atraviesan desde
      abajo, así que se rearmó con escalones de 32 px (el salto llega a 44). Verificado simulando los 5 saltos, la pluma y
      la salida de arriba con el doble salto. De paso: al aterrizar quedaba 1 px arriba del piso (corregido).
- [x] **Más física** (2026-10-25, pedido del usuario: "más físicas a la arena, fluidos, rocas"): **píxeles que vuelan**
      (al cavar, los pedazos salen para el lado del golpe y vuelven a ser material al caer); **grava** (la piedra rota; cae
      y se hunde en el agua); **aceite** (flota sobre el agua y prende enseguida); el agua corre más rápido; **olas** en el
      mar de la playa; el cuerpo mueve el material (aterrizar levanta arena, correr patea, entrar al agua salpica); **la
      tierra sin apoyo se desmorona** (solo donde algo se movió). El mirador tiene grava y aceite sobre el agua.
- [x] **Luz y oscuridad** (2026-10-25, elegido por el usuario): las salas de adentro son oscuras (`dark` por sala; la
      playa, de día); alumbran una luz suave alrededor del héroe, sus ojos rojos, **antorchas** que titilan (marca
      violeta `#aa00ff` / letra `T`), el fuego y la lava (por trozo, más fuerte cuanto más hay; con tinte cálido), la
      pluma y los golpes. **Texturas:** cuatro tonos por material con vetas (ruido), piedritas y grietas en la roca y la
      tierra, ondas en la arena y el borde brillante del agua.
- [x] **Joystick y sonido** (2026-10-25, elegido por el usuario; `js/tower2dAudio.js`): **joystick** con el mando estándar
      (palanca o cruz, A saltar, X tajo y cargado, B/RB dash, Y/LB parada, Start pausa) que se suma al teclado, y
      **vibra** al recibir un golpe, al pegar fuerte y al caer de alto. **Sonidos sintetizados del mundo:** pisadas según
      el material (arena, piedra, madera, agua), aterrizajes, salpicones, el crujido al cavar, chisporroteo de antorchas y
      fuego cerca, burbujas de lava; de fondo, **olas en la playa** y viento sordo adentro. **Música por zona** (las
      pistas de la Torre): el bosque en la playa, la cueva adentro; con un enemigo atacando entra la de combate.
- [ ] **Rebanada vertical** (propuesta 2026-10-25, aceptada empezando por la luz): de la playa al primer jefe, terminado.
      Siguen: enemigos dibujados que sufren la física, un acertijo de física por sala, el primer jefe, bancos de
      guardado y el mapa.
- [ ] **Animar todo** (pedido del usuario 2026-10-25: "faltan animaciones a todo"): enemigos con dibujo y animación
      propios (hoy son rectángulos), la capa que flamea, el tajo hacia abajo, antorchas y fondos con movimiento.
      **Hecho 2026-10-26:** los enemigos usan dibujos de la Torre (babosa y jabalí) que caminan, avisan, embisten, quedan
      aturdidos y se aplastan al morir; su caja de golpe sale del contorno del dibujo y el héroe recibe daño en una caja
      más chica que la de choque (se ven con H). Falta: la capa, el tajo hacia abajo y los fondos.
- [ ] **Sustancias y fluidos** (pedido del usuario 2026-10-26): quemarse, mojarse, aceite, ahogarse y quedar enterrado
      (héroe y enemigos); el agua que se nivela, corrientes, vapor que condensa y burbujas.
- [ ] **Afinar la sensación con el usuario:** jugarlo, tocar el panel (T) y pasar a los valores de fábrica lo que guste.
- [x] **El mapa (decidido por el usuario 2026-10-25): pisos fijos y partes procedurales.** Cada piso tiene salas hechas
      a mano (la entrada, el pueblo, el jefe, los caminos que abre cada habilidad) y tramos que se arman al azar con
      piezas (salas de pelea, de plataformas, secretos), distintos en cada run.
  - [ ] Proponer cuántos pisos fijos, qué habilidad abre cada uno y cómo se arman las piezas al azar (con 2-3 opciones).
- [x] **Animaciones propias del héroe 2D** (2026-10-25, pedido del usuario): saltar, punta, caer (la capa se levanta),
      aterrizar, dash (inclinado, capa atrás), golpe recibido y pared (mirando hacia afuera); el ciclo de correr va más
      rápido cuanto más corrés. Se generan desde los dibujos del usuario con `docs/arte/torre2d-cuadros.py` (mismo estilo
      y paleta; muestra en `docs/arte/torre2d-cuadros.png`). Falta: tajo hacia abajo propio y la capa que flamea en el ciclo.
- [ ] **Enemigos 2D:** pasar el bestiario a costado (caminante, volador, tirador, el que embiste) con sus avisos.
- [ ] **Bancos de guardado y mapa del jugador** (como los bancos de Hollow Knight): curan, guardan y son el punto de
      reaparición; el mapa se va dibujando a medida que explorás.
- [ ] **El primer jefe 2D** (la Raíz Madre de costado, con sus fases).
- [ ] **Reusar de la Torre de arriba:** clases, reliquias, Páginas de Arén y la gente de cada piso.

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
- [ ] **Prueba que falla al azar (2026-10-25):** "el camino se pierde hacia arriba" falló 1 vez en ~10 corridas (pasó 8 de 8
      al repetir). Es del mapa al azar de la Torre de arriba; revisar el margen cuando se toque esa Torre.
- [ ] **Prueba que falla a veces: "pedidos que cruzan pisos"** (la llave del Guardián de Arena abre las compuertas del piso 3,
      "los cofres hundidos quedan al alcance"): falló 1 de 2 corridas el 2026-10-17 sin cambios en esa parte. Buscar qué depende del azar.
- [ ] **Las pruebas escriben en el guardado real de localhost:** al correr toda la batería en `index.html?test`,
      `towerSavePersist` termina en `true` (ninguna prueba sola lo hace; pasa con `runTests`). Solo afecta a la dirección de
      pruebas, no al juego publicado. Encontrar quién lo cambia y forzarlo en falso en `runTests`.
- [ ] **(decisión) Ataques de la espada de frente y de espaldas** (igual que el 1d de la fase B2): los 3 tajos del combo hacia abajo y hacia arriba con su
      estela, en el estilo de `docs/arte/vistas-frente-espalda.py` y la paleta de `js/towerHeroArt.js`.
- [ ] **Golpe recibido y caída propios del héroe dibujado:** hoy se arman con el cuadro de quieto.
- [ ] **(decisión) Parada y esquive de frente y de espaldas** (igual que el 1d de la fase B2).
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

## Fase C0 — MATCH: un juego propio, desde cero (pedido del usuario 2026-10-18)
Todas las mecánicas de hoy, con su origen, están en `docs/MECANICAS.md`; el diseño del juego nuevo, en `docs/MATCH.md`.
Contenido e identidad nuevos (competidores, módulos, equipos, nombres, mundo y arte), sin nada de Dota; el motor se queda
si el usuario lo confirma.
- [ ] **(decisión) Desde cero: ¿también el código, o solo el contenido?** Ver "Esperando al usuario".
- [x] **El mundo del juego:** decidido por el usuario el 2026-10-18: **futurista, la antítesis de Dota.** Investigado en
      `docs/CONCEPTO-FUTURISTA.md` (estilos, tres conceptos, nombres para todo, atributos y semillas de competidores).
- [x] **El concepto:** decidido por el usuario el 2026-10-18: **"En Vivo"**, un show de competencia del año 2099.
- [x] **El nombre:** decidido por el usuario el 2026-10-18: **MATCH**.
- [x] **La regla central:** aclarado por el usuario el 2026-10-18: **el juego es el mismo Custom Hero** (rondas, creeps,
      un duelo por ronda, apuestas, jefes); **los competidores se diseñan para que pelear entre ellos sea divertido y
      desafiante.** Pilares, herramientas y la mecánica de duelo de cada semilla en `docs/MATCH.md`. (Se descartó la
      primera propuesta de que los 8 pelearan a la vez con una "audiencia" como vida.)
- [x] **Estilo RTS, como Dota, y sin esquive con Espacio** (pedido del usuario 2026-10-18): el esquive es de la Torre. En
      Custom Hero, Espacio ya no esquiva (hecho el 2026-10-18); cada competidor se defiende con la posición y su kit.
- [x] **Controles como Dota** (elegido por el usuario 2026-10-18, hecho el mismo día): clic derecho camina y, sobre un
      rival, lo ataca; habilidades apuntadas con tecla y clic; "lanzamiento rápido" y W A S D como opciones.
- [x] **Los atributos:** decidido por el usuario el 2026-10-19: **Blindaje** (vida y armadura), **Reflejos** (velocidad de
      ataque, movimiento y crítico) y **Procesador** (energía y potencia de los módulos), con números propios.
- [x] **Los competidores de arranque:** decidido por el usuario el 2026-10-19: **las 8 semillas** (Grúa, Eco, Flash, Kilo,
      Parche, Vector, Viral y Glitch), y el Danzante, el Arcanista y el Sabio del Vacío pasan al estilo nuevo. Los actuales
      se retiran a medida que entran los nuevos, con el juego siempre jugable.
- [x] **Banco de duelos** (plan del equipo, 2026-10-18): el banco de partidas cuenta cuánto dura cada duelo, si termina por
      tiempo, cuántas veces cambia quién va ganando y qué parte del daño se podía evitar. Base: mediana 5,2 s, 4% por
      tiempo, 0,7 cambios, 14% evitable (`docs/MATCH.md` §5).
- [ ] **No se pega caminando, como en Dota** (decidido por el usuario 2026-10-18): para pegar, el competidor se queda
      quieto; moverse corta el golpe (el motor ya tiene esa regla, `MOVE_ATTACK_RULE = 'reset'` en `js/game.js`; hoy está
      en `'free'`), y el golpe básico tiene una preparación cortita (0,2-0,3 s). Solo en MATCH; la Torre no cambia.
      Equipo: disenador-de-sistemas (los números), ingeniero-de-motor (la preparación del golpe), ia-de-rivales (que los
      rivales se frenen para pegar y no se queden trabados), qa-jugador (banco antes y después). Medir: duración de los
      duelos, cambios de quién va ganando y ganadores por héroe (en `DISEÑO.md` §9, con "reset" los cuerpo a cuerpo
      ganaban 46% de los duelos; con "libre", 38%).
  - [ ] 1 (motor, hecho y guardado sin subir el 2026-10-19): `docs/parches/2026-10-19-no-pegar-caminando.patch` (`git apply`).
        En MATCH el golpe solo avanza quieto, el primero sale a los `ATTACK_WINDUP` 0,25 s y cada paso lo reinicia; la
        Torre igual. Sus 2 pruebas pasan, pero rompe "Las arenas se juegan en paralelo" (8 de 9 puntos): el Danzante
        Cinético de la IA gira sin parar (`movesToFight`/`circleStep`, `js/ai.js:39-44`) y no pega nunca. Se deshizo
        porque la corrida llegó al tope del plan.
  - [ ] 2 (IA de los rivales): aplicar el parche y que el que gira por AL_MOVERSE frene con alguien a tiro (y revisar el
        `retreatStep` de los de distancia). Después sistemas mide con el banco y QA.
- [ ] **Preparación anunciada para las habilidades** (plan del equipo, `docs/MATCH.md` §5): golpe fuerte con al menos 0,7 s
      de aviso y marca en el piso (la de la Torre), que se corta aturdiendo, y 0,3-0,5 s de exposición después. Probar
      con 1 o 2 habilidades de hoy y medir con el banco de duelos.
- [ ] **La IA lee los avisos** (plan del equipo): camina fuera de las zonas y de la línea de los proyectiles, y corta
      preparaciones con un aturdimiento, con tiempos de persona. Meta: evita 30-70% de los golpes anunciados; duelos de
      15-30 s de mediana.
- [ ] **Panel del rival en el duelo** (plan del equipo): sus módulos con el enfriamiento y sus cargas a la vista.
- [ ] **Arena de duelo con 2 a 4 columnas** que frenan proyectiles (plan del equipo). Medir: nadie trabado más de 3 s,
      menos del 10% de duelos por tiempo.
- [x] **El color del peligro: rojo** (decidido por el usuario 2026-10-19): el de los avisos de la Torre, siempre el mismo en
      todo el juego (con su modo daltónico). Lo usan los avisos de golpe de MATCH cuando se hagan.
- [ ] **Los atributos nuevos, el acuerdo** (disenador-de-sistemas): las fórmulas de Blindaje, Reflejos y Procesador (qué da
      cada punto, base y ganancia por nivel) partiendo de las de hoy, con la medición prevista. Solo el documento; después
      lo programa el ingeniero-de-motor y lo muestra el disenador-de-interfaz.
- [ ] **Ficha del primer competidor** (disenador-de-competidores): una ficha por competidor en `docs/competidores/`, de a
      una, para que el usuario la apruebe antes de programarla. Empezar por el que reemplaza al que más gana hoy (el Sniper).
- [ ] **Inventario de lo que hay que cambiar, archivo por archivo:** buscar en el código, los datos y los textos de la
      interfaz todo nombre o kit que venga de Dota (héroes, habilidades, ítems, "objetos neutrales", comentarios que
      dicen "fiel a Dota") y anotarlo como lista en `docs/MECANICAS.md` (apéndice), con dónde está cada uno. Solo
      documentar, sin tocar el juego.

## Fase C1 — Cerrar el loop
- [x] **Resumen después de cada ronda** (2026-10-15): oro ganado, de dónde salió (bajas, interés, racha, apuesta), vida
      perdida y la posición en el ranking. Enseña la economía sin texto largo.
- [x] **Interés y racha visibles** (2026-10-15: interés tope 25, racha +5/+10/+15): +1 de oro por cada 10 ahorrados (con tope) y bonus por racha de victorias o
      derrotas, mostrado en la barra de oro. Medir que no domine "ahorrar siempre".
- [x] **Muerte súbita** (2026-10-15: desde la ronda 15, +50% de daño recibido por ronda): desde una ronda fija (medir cuál deja partidas de 15-25 min; Custom Hero Clash usa ~31),
      los duelos y las oleadas pegan cada vez más fuerte hasta que quede uno.
- [x] **Pantalla de fin de partida:** puesto, rondas, duelos ganados, oro total, build final y "▶ Otra partida".
      2026-10-18: `js/matchSummary.js`; también al quedar eliminado, con "👁 Seguir mirando".
- [x] **Historial y perfil:** partidas jugadas, victorias, top 3, héroe favorito, mejor puesto con cada héroe.
      2026-10-18: en el menú de Custom Hero (clave nueva `chc-perfil-ch`; no toca nada de lo guardado antes).
- [ ] **Ver el kit de los duelistas al apostar** (idea 1 de `docs/REFERENCIA-CHC.md`): en la ventana de apuestas, las
      habilidades (con su nivel) y los ítems de cada duelista. En el original es lo que hace que apostar sea leer el
      duelo. No cambia el balance.

## Fase C2 — Balance medido
- [ ] **⏸ Sniper gana 8 de 14 partidas largas** (el Sniper es de Dota: se va con el roster nuevo): medir con `simulateGame` y bajarlo hasta ≤20%.
- [ ] **⏸ Vampiro y Nigromante siguen abajo** (se mide con el roster nuevo): medir y subirlos sin pasarse.
- [ ] **¿Rinde más pelear o apostar?** (idea 2 de `docs/REFERENCIA-CHC.md`, el error que *Clash* le corrigió a *Chaos*):
      con el banco, oro que cobra el ganador de un duelo contra la ganancia promedio de apostar. Si apostar rinde más,
      subir lo del duelista. Va con el resto del balance, al final.
- [ ] **⏸ Ítem contra aturdimientos** (idea 5 de `docs/REFERENCIA-CHC.md`; decidido por el usuario 2026-10-18: un ítem
      compuesto con resistencia a aturdimientos y control). Medir cuánto tiempo pasás aturdido con y sin él.
      El 2026-10-18 se frenó a mitad (el usuario cortó la corrida) y se deshizo: se diseña junto con los ítems nuevos de C0.
- [ ] **Balance de `mageSpellAmp` en duelos 1v1:** medir con `simulateGame(i, false, 60)`.
- [ ] **Primeras rondas contra la máquina:** las rondas 1-4 son solo oleadas (aprender sin perder), los duelos
      desde la 5 (ya está). Revisar que el jugador nuevo llegue a la ronda 5 con build armada.

## Fase C3 — Contenido
- ~~Chakravin `Y` y Trampero `P`~~ (con sus creeps Guardián de Hierro y Saltador): **descartados por el usuario el 2026-10-18.**
- [ ] **⏸ Proyectiles de habilidad para el resto del roster** (Danzante, Asesino, Vampiro, Sniper) y forma propia por
      habilidad (`vfx.shape`).
- [ ] **(decisión) Ítems nuevos** de DISEÑO.md §7: el usuario decide cuáles entran.
- [x] **Baneo antes de empezar** (idea 3 de `docs/REFERENCIA-CHC.md`; decidido por el usuario 2026-10-18: banear 1
      habilidad, que no le salga a nadie en el draft). 2026-10-18: selector en la elección de héroe, recuerda la última.
- [x] **Quinta habilidad en la ronda 9** (idea 4 de `docs/REFERENCIA-CHC.md`; decidido por el usuario 2026-10-18).
      Medir con el banco antes y después (ganadores, ronda final). 2026-10-18: hecho y medido (ver abajo).

## Fase C4 — Metaprogresión y pulido
- [ ] **⏸ Desbloqueos** (con el roster nuevo): arrancás con 6 héroes y desbloqueás el resto jugando (ganar con un atributo, llegar al top
      3...). Logros con ícono en el perfil.
- [ ] **Dificultad de la máquina:** Fácil / Normal / Difícil (cuánto piensa la IA, cómo apuesta y cómo arma build).
- [ ] **El mismo pulido de golpe que la Torre:** pausa de impacto y señal de daño recibido en las arenas.
- [ ] **Tutorial jugado** en la primera partida en vez de páginas (una idea por ronda).
- [ ] **Modo de a dos** (idea 6 de `docs/REFERENCIA-CHC.md`): vos y un compañero de la IA contra 3 parejas. Según una
      reseña, el modo más divertido del original. Grande: proponer el diseño antes de hacerlo.

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

- **Custom Hero propio: ¿desde cero también el código?** (Fase C0, `docs/MECANICAS.md`): (a) **contenido e identidad
  nuevos sobre el motor de hoy (recomendada: el motor no tiene nada de Dota y trae las rondas, el draft, los duelos, las
  apuestas, la IA, el banco de partidas y 289 pruebas; rehacerlo llevaría meses sin que se note en el juego)**;
  (b) reescribir también el código desde cero; (c) un juego aparte en otra carpeta, copiando del actual lo que sirva.

- **Cuadros de frente y de espaldas de la espada (B2 1d y T2):** el borrador se sacó el 2026-10-17 y se pidió el caballero
  afuera. Opciones: (a) **esperar el arte del caballero (o la hoja que elijas) y recortarlo con `extraer-sprites.py`
  (recomendada: no se dibuja dos veces)**; (b) que el modo automático los dibuje en código sobre las piezas del héroe calcado
  (`HERO_PARTS`), como se hizo con quieto y caminar; (c) dejar el dibujo de costado para arriba y abajo hasta la 1.0.

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
- 2026-10-18 · Los agentes aparecen solos (el usuario eligió la opción a) · ver git log · `mattbox/.claude/agents` y `mattbox/.claude/skills` son accesos directos a las carpetas del juego: probado que se ven los 10 agentes y la skill `equipo` desde `mattbox`. Tope de pasos: director 40, QA 60.
- 2026-10-18 · Guía del equipo de agentes (pedido en el chat) · ver git log · investigado en la documentación oficial, dos artículos de Anthropic y Claude Code Game Studios (GitHub); aplicado: CLAUDE.md, formato de entrega en los 10 agentes, verificación completa del QA, Sonnet para QA y narrativa, plantilla de encargo y reparto por archivos en la skill. Pendiente: que los agentes aparezcan solos (decisión).
- 2026-10-18 · MATCH: banco de duelos (plan del director de juego) · ver git log · 66 partidas, 1.404 duelos, dos corridas idénticas: mediana 5,2 s (25-75%: 1,6-11 s), 4% por tiempo, 0,7 cambios de quién va ganando por duelo, 14% del daño entre héroes evitable caminando. Los duelos se deciden en segundos (meta: 15-30 s). Pruebas 292/292.
- 2026-10-18 · Custom Hero: controles como Dota (elegido por el usuario) · ver git log · probado con clics de verdad en el navegador: la tecla de Rayo Relámpago entra en modo apuntar (alcance y área en el cursor), el clic izquierdo lo lanza (queda en enfriamiento) y el clic derecho sobre un creep lo marca y lo persigue; en el piso camina y cancela el ataque. Sin la opción, W A S D no mueve (en la Torre sí). Pruebas 291/291 (las 3 de movimiento con teclado corren con la opción prendida).
- 2026-10-18 · Custom Hero: sin esquive con Espacio (pedido del usuario: es de la Torre; MATCH es estilo RTS) · ver git log · en Custom Hero, Espacio no hace nada (no mueve ni da invulnerabilidad) y la ayuda de controles ya no lo nombra; en la Torre sigue igual (sus dos pruebas del esquive pasan). Pruebas 290/290.
- 2026-10-18 · Custom Hero: quinta habilidad en la ronda 9 (decidido por el usuario) · a49067e · banco de 132 partidas antes → después: ronda final promedio 24 → 25; Sniper 65% → 68%, Zeus 22 → 18, Guerrero Vampiro 18 → 12, Asesino 16 → 13, Nigromante 8 → 9, Arcanista 2 → 6, Sabio del Vacío 0 → 2, Alquimista 0 → 1 (todo dentro del ruido de ±6). No arregla el dominio del Sniper. Pruebas 289/289.
- 2026-10-18 · Custom Hero: baneo de 1 habilidad (decidido por el usuario) · ver git log · con una habilidad de Axe baneada y Axe elegido (su natural sale siempre si puede), 0 apariciones en 300 sorteos × 8 héroes × draft, Fragmento y Libro. Se recuerda la última (en pruebas, en memoria). Pruebas 288/288.
- 2026-10-18 · Custom Hero C1: historial y perfil · ver git log · 3 partidas del piloto a 30 rondas (en memoria): "3 partidas · 0 victorias · 1 en el top 3 · favorito: Danzante Cinético (2)" y "Mejor puesto: Zeus 3º · Danzante Cinético 6º". Se anota una vez por partida (eliminado y después terminada: 1). De paso, la tarjeta de la última ronda ya no queda arriba en el menú. Pruebas 287/287.
- 2026-10-18 · Custom Hero C1: pantalla de fin de partida · ver git log · 2 partidas del piloto a 30 rondas con el Danzante: 7º (eliminado en la 25, 0-7 en duelos, 5330g ganados, nivel 22) y 5º (eliminado en la 20, 3-2, 4572g, nivel 19); "Otra partida" lleva a elegir héroe; el banco no la muestra. Pruebas 287/287.
- 2026-10-18 · Prueba de ida y vuelta entre modos · ver git log · Torre → portada → Custom Hero → portada → Torre revisando 11 ventanas, 6 paneles, modo, estado, mundo (20×12 en Custom Hero), cámara, pausa, piloto y tema. Salieron 2 cosas sucias: el piloto prendido en la Torre seguía jugando Custom Hero, y el inventario (y la tienda, el herrero, la Bitácora) quedaban abiertos porque `resetGame` soltaba al jugador antes de cerrarlos. Arreglado en `resetGame`. Pruebas 286/286.
- 2026-10-18 · Muñeco, paso 2c (lo general al panel) · ver git log · 14 números más en "⚙️ General" (caminar, bola del muñeco, congelados del disparo 0,04, de la parada que devuelve 0,06 y del golpe recibido 0,05, × velocidad 1,5 y × daño 2 de la bola devuelta, sacudón 1,5); mismos valores que antes. Con el congelado al recibir en 0,2 el golpe congela 0,2 (prueba). Pruebas 285/285.
- 2026-10-18 · Muñeco, paso 2b (archivo de datos) · ver git log · `js/munecoDatos.js` con los 9 movimientos y 71 números (los mismos de antes: el muñeco no cambia); "Copiar datos" da el archivo entero e idéntico si no tocaste nada (prueba); lo distinto del archivo se ve en amarillo (probado con la velocidad del esquive 210→250). Pruebas 285/285.
- 2026-10-18 · Muñeco, paso 2a (panel de ajustes) · ver git log · 10 movimientos con 4-10 números cada uno; probado escribiendo 0.15 en el congelado del remate (antes el punto lo agarraba el muñeco como "un cuadro"); un tajo con el daño en 33 le pega 33; no acepta negativos ni vacío. Pruebas 283/283.
- 2026-10-18 · Capturas en los informes · ver git log · `docs/captura.py`: servidor sin caché que acepta PUT de PNG solo en `docs/informes/img/` (hasta 2 MB, revisa la firma PNG; un nombre con `..` da 400). Probado: captura del muñeco ×3 = 31 KB. Pruebas sin cambios de código del juego.
- 2026-10-17 · El juego se actualiza solo (a pedido, en el chat) · ver git log · al abrir compara GAME_VERSION con el main.js del servidor y, si cambió, rebaja la página y sus ~100 archivos y recarga una vez por versión. No corre en ?test.
- 2026-10-17 · El caballero jugable en el muñeco (a pedido, en el chat) · ver git log · tecla V lo cambia; corre (10 cuadros), combo de 2 golpes (tajo 10 de daño, barrido 12), rueda en el esquive, C agacha (camina al 45% y la caja baja de 22 a 10: las bolas a 14 pasan por arriba), tajo agachado 9; golpe y muerte con sus cuadros. Pruebas 282/282.
- 2026-10-17 · Caballero con todas las animaciones del pack FreeKnight (a pedido, en el chat) · ver git log · se midió cada cuadro del pack (alto, cabeza, ángulo de la espada) y se pasó a poses del muñeco ×0,54; 23 animaciones, 105 cuadros, mismo conteo que el pack; dibujo propio (yelmo con penacho, capa azul). Por ahora solo en la galería. Pruebas 281/281.
- 2026-10-17 · Galería de personajes (a pedido, en el chat) · ver git log · `index.html?galeria` y botón en la portada: 13 héroes (el de la Torre con sus 3 vistas) con quieto, caminar, combo, parada, esquive, golpe y caída; 21 criaturas y 5 guardianes caminando y quietos; 150 recuadros en loop. Pruebas 281/281.
- 2026-10-17 · Orco, demonio, engendro de sangre y gólem con cristales (a pedido, en el chat) · ver git log · 3 cuerpos nuevos (pixel art y tinta): orco peleador/pegador en todos los biomas, demonio hechicero/maldecidor en volcán, pantano y desierto, engendro pegador/tanque en pantano y volcán; el gólem suma cristales que brillan. Pruebas 281/281.
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
