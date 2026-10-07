# Estado del proyecto y forma de trabajo

Documento de traspaso: dónde estamos, qué falta y cómo se trabaja. Las reglas del juego están en [`DISEÑO.md`](../DISEÑO.md).

- **Jugar online:** https://matiaslcsm-rgb.github.io/custon-hero-chaos/ (GitHub Pages, se actualiza con cada push a `main`)
- **Repositorio:** https://github.com/matiaslcsm-rgb/custon-hero-chaos
- **Carpeta local:** `Desktop\mattbox\custom-hero-chaos`

## Qué está hecho
| Fase | Estado |
|---|---|
| A. Cimientos (efectos, eventos, etiquetas) | ✅ |
| B. Draft mezclado, niveles estilo Dota 2, Fragmento/Libro del Destino | ✅ |
| C. Roster: 9 héroes (4 físicos + 5 magos diseñados con Gemini) | ✅ |
| D. Ítems con recetas estilo Dota 2 (15 básicos, 16 compuestos, inventario de 6) | ✅ |
| E. Creeps con mecánicas (17 tipos), oleadas con tema, aviso de oleada | ✅ |
| Área de Descanso, Voluntad de Titán, Condenado, temporizadores, IA + Piloto automático (P) | ✅ |
| F1. Partida de 8 héroes (jugador + 7 IA), arenas en paralelo, ranking clickeable | ✅ |
| F2. Duelos 1v1, maldición con la mitad o menos, duelos a muerte con 3 o menos | ✅ |
| F3. Previa de duelos con apuestas (×2, tope 25% del oro); Fragmentos a la mitad de abajo y Libro al último | ✅ |
| G. Jefes de ronda cada 5 rondas (todos contra uno) y objetos neutrales (elegís 1 de 3) | ✅ |
| Menú de inicio, tutorial, elección de héroe (3 opciones + al azar, sin repetir) y códice de ítems con colores | ✅ |
| Gráficos paso 1: efectos de combate (números, partículas, temblor, fondos) | ✅ |
| Gráficos paso 2: HUD estilo MOBA (barra superior, ranking, mapa grande, barra del héroe, panel de fase) | ✅ |
| Calidad de vida: duelos desde la ronda 5, apuestas con monto elegido (tope 50%) en ventana, tienda en ventana (B), mapa grande (M) | ✅ |
| Habilidades automáticas (H para manual) y círculo de rango de ataque | ✅ |
| Mouse estilo MOBA (apuntar con tecla + clic, clic derecho para caminar) y movimiento −20% | ✅ |
| Jefes individuales (8, cada uno con escalada propia; cuestan vidas) y apuestas de la IA con respaldo del 25% | ✅ (balance de jefes en ajuste) |
| Guía de ítems por héroe, estadísticas bajo el ranking, etiqueta Innato y definitivas subrayadas | ✅ |
| Sonidos sintetizados, sala de espera caminable, héroes agrupados por atributo, enfriamientos −25% | ✅ |
| Pixel art dibujado en código para héroes, creeps y jefes (G para volver a ASCII) | ✅ |
| Objetivo marcado con clic izquierdo y movimiento −35% | ✅ |
| Ataque libre al moverse + balance por stats, curación y control −50/60% en duelo | ✅ (Vampiro y Nigromante siguen abajo) |
| Retoques de kits (Vampiro, Nigromante), pausa con glosario y opciones, sin barras arriba, tutorial rediseñado | ✅ |
| Presión al líder en creeps y jefes; balance por habilidades; escenarios en pixel art animados | ✅ |
| Un duelo por ronda con pozo compartido, maldición solo por duelos, sin límite de 20 rondas | ✅ (Sniper gana 8/14 partidas largas: revisar) |
| PDFs de héroes e ítems con requisitos para sumar nuevos (`docs/heroes-pdf.html`, `docs/items-pdf.html` → `docs/*.pdf`) | ✅ |
| Cámara fija en tu héroe en cada fase y 🔥 en el ranking para quien está peleando | ✅ |
| Libros de Talento (+5 a un atributo, 500g y +250g por cada uno) | ✅ |
| Héroe 10: Danzante Cinético `D` (diseño del usuario) + creep Ancla | ✅ (45% de duelos) |
| Draft de habilidades en ventana emergente (cartas con el ícono y color del héroe de origen) | ✅ |
| Cuerpos físicos: pasar por la casilla de otro frena según su tamaño (+25/75/150%); `phasing` atraviesa | ✅ |
| Regla: al menos 1 pasiva entre las 3 nativas (Axe, Sniper, Asesino y Vampiro convirtieron una activa) | ✅ |
| Héroe 11: Zeus `Z` (fiel a Dota 2, pedido del usuario) + `mageSpellAmp` bajado de 100% a 25% (se saca del escalado, pasa a ítems) | ✅ (sin medir duelos) |
| Elegir cualquier héroe: panel desplegable desde la izquierda en la elección de héroe, los 11 sin depender de las 3 opciones al azar; arrancás con 0g en vez de 100g. Grilla de retratos por atributo (Fuerza/Agilidad/Inteligencia), al estilo de la ventana de "todos los héroes" de Dota 2 (pedido del usuario 2026-09-28); nombre, rol y descripción quedan en el tooltip | ✅ |
| Proyectiles de habilidad (`pointTarget`): viajan de verdad al punto donde clickeaste, con velocidad y radio propios, y pueden fallar si apuntás mal (ver DISEÑO.md §9 quater). Convertidos: Rayo Relámpago (Zeus), Proyectil Arcano (Arcanista), Explosión Helada (Bruja del Hielo), Mezcla Inestable (Alquimista) | ✅ (falta el resto del roster, ver abajo) |
| Enfriamientos reiniciados al volver a pelear (oleada nueva o jefe de ronda), no solo en duelos como antes; mientras esperás en el Área de Descanso no se tocan (ver DISEÑO.md §9 quinquies, pedido del usuario 2026-09-28) | ✅ |
| Rework del Nigromante fiel a Necrophos de Dota 2 (Sadista, Pulso de Muerte, Aura que Detiene el Corazón, Manto Fantasma, Guadaña del Segador — ejecuta según vida faltante); sumó las flags `physicalImmune`/`disarm` y corrigió que `hpRegen`/`manaRegen` no reflejaban efectos temporales (ver DISEÑO.md §9 sexies, pedido del usuario 2026-09-28) | ✅ (sin medir balance) |
| Duelo simultáneo con las oleadas de los demás; enfriamientos en el descanso; contador central con pitidos; cartel de apuestas; nombres de jugadores; sonidos propios (`sounds/`) | ✅ |

## Pendientes y temas abiertos
- **En curso:** 3 héroes de Agilidad del usuario, de a uno y midiendo cada uno: Danzante ✅ → **Chakravin `Y`** (proyectiles
  de habilidad que vuelven + creep Guardián de Hierro) → **Trampero `P`** (zonas en el piso + creep Saltador).
- **Proyectiles de habilidad:** convertidos los nukes de un solo objetivo de Zeus, Arcanista, Bruja del Hielo y
  Alquimista (el Nigromante perdió el suyo en el rework a Necrophos: Pulso de Muerte pasó a ser un área centrada en
  uno mismo, no se apunta). Quedan afuera a propósito: Distorsión Espacial del Sabio del Vacío (es un blink, no un
  proyectil). Falta: los del resto del roster (Danzante, Asesino, Vampiro, Sniper) si tiene sentido, y variar la
  forma del proyectil por habilidad (`vfx.shape`), no solo el color. Ver DISEÑO.md §9 quater.
- **Ítems:** lista de candidatos sin implementar en DISEÑO.md §7 (Orquídea, Mariposa, Tarrasque, Núcleo de Octarine y más;
  varios piden mecánica nueva: `silenced`, `cooldownReduction`, robo de vida mágico, `spellBlock`, `cyclone`). El usuario
  pidió tener la lista lista y decidir después cómo se van sumando.
- **Balance del recorte de `mageSpellAmp`** (100%→25%, 2026-09-28): medido en PvE con `simulateGame` (A/B controlado,
  n=5): el tiempo para limpiar 5 oleadas con jugador invulnerable **casi no cambia** (Arcanista 144 vs 145, Bruja del
  Hielo 158 vs 154, con 60% vs 100%). Ojo: la comparación contra la marca vieja de este documento (Arcanista 79s) estaba
  confundida — el juego se puso más difícil en general desde esa medición, por otros cambios. **Sin medir:** el impacto
  en duelos 1v1, donde el nuke mágico de golpe pesa más que en una oleada larga. Medir con `simulateGame(i, false, 60)`.
- **Modo roguelike «Tower Chaos» (2026-10-03, se elige en el menú junto a Custom Hero Chaos):** diseño en `docs/ROGUELIKE.md`; fase 1 hecha (nivel explorable con cámara,
  creeps con nivel, guardián y escalera, muerte con renacer en la base) y fases 2-3 (aventurero sin clase, héroes convertidos
  en 55 piezas de equipo, inventario en grilla, cofres, forja al subir de nivel) y fase 4 (2026-10-05: pisos de 160×110 al
  estilo Aincrad con 5 biomas, pueblo seguro con mercader y torre-laberinto; ver `js/towerWorld.js`) y una revisión de diseño
  medida (ritmo de niveles estilo Diablo II, campeones y santuarios, restos que guardan lo perdido, objetivo del piso,
  crónica, Tomo de Talento; ver ROGUELIKE.md §4 ter). Próximo: la criatura que carga tus ítems (resto de la fase 5),
  élites con nombre, eventos en el campo; más adelante, crafteo con materiales.
- **Mundo con profundidad (2026-10-06):** pisos de 220×150 con mesetas, día y noche, cuevas con niveles de profundidad y
  bestiario generado por run (ROGUELIKE.md §4 quater).
- **Códice, piezas sin alma y Herrero (2026-10-07):** ROGUELIKE.md §4 septies.
- **Rework grande de Tower Chaos (plan 2026-10-07):** `docs/REWORK.md` — despertar con cuaderno y 3 armas, 3 ranuras de
  habilidad, jefes estilo Hades, Esencia y crafteo con calidades, pantalla con zoom y pausa, Bitácora, música. Con orden
  de fases y preguntas abiertas.
- **Fase 2 del rework completa (2026-10-07):** las 3 armas iniciales (Espada/Arco/Bastón) como pedestal obligatorio
  al entrar a la torre, cada una con su habilidad propia (Golpe Certero, Ráfaga del Arco, Saeta Arcana); ya no
  hay hechizo inicial al azar. El Cuaderno (tecla N): 7 páginas de tutorial jugado que se escriben solas con tus
  acciones (despertar, caminar, esquivar, lanzar, primera baja, un cofre, el pueblo), persistentes entre runs. Ver
  ROGUELIKE.md §4 octies y REWORK.md §1-2. Falta solo la escena del despertar en el mundo (hoy es una ventana, no
  3 armas clavadas en el piso); la unión con el Códice/Bestiario en la Bitácora queda para la fase 6.
- **Esqueleto mecánico de la fase 3 del rework (2026-10-07):** solo arma/guantes/armadura dan habilidad activa
  (casco/botas/amuleto/anillos quedan en pasivas y stats), con teclas fijas Q/E/R sin importar el orden de
  equipado. Decisión del usuario que pisa la recomendación anterior de REWORK.md: **sin sistema de carga** — las
  11 definitivas pasan a ser activas comunes (maná y enfriamiento normal), rebalanceadas a la baja vía un
  `towerValues` opcional por habilidad (`js/progression.js`) que solo aplica en la Torre y no toca Caos de
  Héroes. De paso se cerró un bug del Herrero que dejaba imbuir un poder en una ranura que no era la suya
  (rompía el límite de 3 activas). Ver REWORK.md §2.
- **Balance de arma/guantes (2026-10-07, "armar y balancear lo que tenemos"):** revisadas las 33 activas de
  arma/guantes contra las 11 ex-definitivas ya rebalanceadas — la mayoría ya caía en un rango parejo (7-15s de
  enfriamiento). Dos outliers corregidos vía `towerValues`: Manto Fantasma (Nigromante) tenía el doble de
  enfriamiento/maná que cualquier par suyo (26s/60 maná → 16-12s/55-45); las 3 activas no-definitiva de Zeus
  pagaban 70-115 de maná contra 30-50 del resto del roster (en Caos de Héroes lo compensa el maná que crece por
  nivel, en la Torre no) → recortadas a 45-60.
- **Fase 3 del rework completa (2026-10-07):** además del balance de arriba, las habilidades con tag `MOVILIDAD`
  (Parpadeo, Salto Sangriento, Distorsión Espacial, Corte Errante, Paso Fantasma, Tormenta Cinética) se atan
  siempre a la tecla del esquive en vez de a su Q/E/R; si el espacio ya lo tiene otra equipada, cae a la tecla
  fija de su ranura. Al apretar Espacio se prueba la habilidad primero y si no se pudo lanzar (sin maná,
  enfriamiento, sin objetivo) cae al esquive de siempre (`spaceAction()`, `js/game.js`). **Revisado y descartado
  como pendiente:** la ranura de botas no recibe ninguna habilidad activa en todo el roster, pero ya da velocidad
  de movimiento (`SLOT_STATS.boots`) — cumple la idea de REWORK.md de "botas que cambian el esquive" con lo que
  ya había; y que Zeus no tenga pasiva es fiel a su diseño original (puro daño, sin robo de vida ni control), no
  un hueco del catálogo. El resto del rediseño del catálogo que pide REWORK.md §2 (control nuevo, zonas de área,
  etiquetas de rol en la carta) queda para más adelante como contenido nuevo, no como cierre de esta fase.
- **Medición después de las fases 2 y 3 (2026-10-07, piloto, run completa):** Espada 91 min/1 muerte y 105/3, Arco
  120/6, Bastón 92/3; antes de las fases 2-3 eran 122-161 min con 0-9 muertes. **La Torre quedó más fácil y más
  rápida** (las ex-definitivas como activas comunes pegan mucho). Una run de Espada cayó en una **espiral de muertes**
  (30 muertes, trabada en el piso 6, sin equipo: cada muerte un portador se lleva piezas, el héroe queda más débil y
  vuelve a morir). Pendiente: subir la dificultad o bajar las ex-definitivas, y frenar la espiral (por ejemplo, que
  no se lleve piezas si hay un portador vivo sin cazar). La habilidad del Bastón pasó a llamarse Saeta Arcana
  (chocaba con el Proyectil Arcano del Arcanista).
- **Fase 4 del rework (2026-10-07):** ataques anunciados, jefes con 3 fases y definitiva, barra de jefe abajo, piloto que
  esquiva y freno a la espiral de muertes. La Torre volvió a ~105-168 min (REWORK.md §3).
- **Motor (decidido 2026-10-06):** seguimos en canvas + JavaScript puro. Pasar a un motor (Phaser para seguir en el
  navegador, Godot para publicar en PC/celular) se decide cuando el contenido de Tower Chaos esté más cerrado.
- **Balance en curso (2026-09-28):** jefes más suaves desde la ronda 20 + Kaya y Cetro del Eclipse (ver DISEÑO.md §9 bis).
  Falta: los 4 magos (Arcanista, Bruja, Sabio, Alquimista) quedan eliminados cerca de la ronda 14; Zeus pasó a ganar 1 de 3.
- **Después:** balancear la supervivencia contra creeps en el formato de un duelo por ronda (gana el último en pie: el Sniper
  ganó 8 de 14 partidas simuladas y el Nigromante 4). Medir con `simulateGame(i, false, 60)` (~31 rondas por partida).
- **Balance de duelos:** Vampiro (17%) sigue abajo; Alquimista, Axe y Bruja ~70% (ver DISEÑO.md §9). El Nigromante
  tenía 17-24% con el kit viejo, pero se reescribió entero (§9 sexies) — falta medir el nuevo.
- **Modo debug** (propuesto): panel para probar situaciones (ronda, oro, nivel, ítems, creeps, duelos, velocidad, modo dios).
- Preguntas abiertas de diseño: DISEÑO.md §11 (probabilidad de definitivas en el draft, precio del Fragmento…).
- Autor de los commits: el email de git (comusanmiguel24@gmail.com) está asociado a la cuenta `comusanmiguel24-bit`, no a
  `matiaslcsm-rgb`. Se ofreció cambiarlo; sin respuesta todavía.

## Cómo se trabaja
- **Idioma:** español rioplatense (voseo), en el código, los comentarios, los textos del juego y los commits.
- **Decisiones de diseño:** se consultan con opciones y una recomendada, idealmente con números medidos. Lo que se decide
  se anota en DISEÑO.md (secciones de la fase y "Decisiones tomadas").
- **Cada cambio:** pruebas automáticas (`tests.html`, hoy **196**) → commit en git → push a GitHub siempre al terminar cada paso (pedido del usuario 2026-10-07, para trabajar desde otros lugares).
- **Commits:** mensaje en español que explica el porqué; terminan con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Héroes nuevos con otra IA:** prompt en [`prompt-heroes.md`](prompt-heroes.md); lo que devuelva se revisa contra el motor
  (pasivas, efectos por segundo con `everyInterval`, descripciones que coincidan con el código) antes de integrarlo.

## Cómo probar y medir
- **Pruebas:** abrir `tests.html` (o `index.html?test`). Cada mecánica nueva suma su prueba en `js/tests.js`.
- **Probar desde el navegador integrado de Claude:** servir la carpeta con un servidor **sin caché** (el navegador guardaba
  versiones viejas de los `.js`). En esta máquina se instalaron **Node.js LTS** y **GitHub CLI (`gh`)** por `winget`
  (2026-09-28, con permiso del usuario); en una sesión de terminal nueva deberían estar en el PATH solos. Igual queda
  `serve-nocache.ps1` (raíz del repo, servidor mínimo en PowerShell con `Cache-Control: no-store`, puerto 8766) para
  cuando no haya Node a mano: `powershell -ExecutionPolicy Bypass -File serve-nocache.ps1` (en segundo plano) y abrir
  `http://localhost:8766/index.html` (o `?test`). Con Node instalado, `npx http-server -c-1` hace lo mismo. El panel del
  navegador puede estar oculto y frenar `requestAnimationFrame`: para probar en "tiempo real" se reproduce el cuerpo de
  `loop()` a mano a 60 cuadros por segundo.
- **Medir balance:** `simulateGame(índiceDeHéroe, godMode, rondas)` (en tests.js) juega partidas completas con la IA.
  Para diagnosticar, se registran muertes/duelos envolviendo funciones (`resolveDuel`, `handlePlayerDeath`, `endRound`) y se
  prueba **cambiando una cosa por vez** (ablación). Con 8-16 partidas por variante hay bastante ruido: repetir antes de concluir.
