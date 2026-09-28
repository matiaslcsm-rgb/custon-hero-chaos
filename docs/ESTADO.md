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

## Pendientes y temas abiertos
- **Próximo:** balancear la supervivencia contra creeps en el formato de un duelo por ronda (gana el último en pie: el Sniper
  ganó 8 de 14 partidas simuladas y el Nigromante 4). Medir con `simulateGame(i, false, 60)` (~31 rondas por partida).
- Pasivas: solo los magos tienen pasivas drafteables; se ofreció diseñar una para Axe, Sniper, Asesino y Vampiro.
- **Balance de duelos:** Vampiro (17%) y Nigromante (24%) siguen abajo; Alquimista, Axe y Bruja ~70% (ver DISEÑO.md §9).
- **Modo debug** (propuesto): panel para probar situaciones (ronda, oro, nivel, ítems, creeps, duelos, velocidad, modo dios).
- Preguntas abiertas de diseño: DISEÑO.md §11 (probabilidad de definitivas en el draft, precio del Fragmento…).
- Autor de los commits: el email de git (comusanmiguel24@gmail.com) está asociado a la cuenta `comusanmiguel24-bit`, no a
  `matiaslcsm-rgb`. Se ofreció cambiarlo; sin respuesta todavía.

## Cómo se trabaja
- **Idioma:** español rioplatense (voseo), en el código, los comentarios, los textos del juego y los commits.
- **Decisiones de diseño:** se consultan con opciones y una recomendada, idealmente con números medidos. Lo que se decide
  se anota en DISEÑO.md (secciones de la fase y "Decisiones tomadas").
- **Cada cambio:** pruebas automáticas (`tests.html`, hoy **134**) → commit en git → push a GitHub solo cuando el usuario lo pide.
- **Commits:** mensaje en español que explica el porqué; terminan con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Héroes nuevos con otra IA:** prompt en [`prompt-heroes.md`](prompt-heroes.md); lo que devuelva se revisa contra el motor
  (pasivas, efectos por segundo con `everyInterval`, descripciones que coincidan con el código) antes de integrarlo.

## Cómo probar y medir
- **Pruebas:** abrir `tests.html` (o `index.html?test`). Cada mecánica nueva suma su prueba en `js/tests.js`.
- **Probar desde el navegador integrado de Claude:** servir la carpeta con un servidor **sin caché** (el navegador guardaba
  versiones viejas de los `.js` con `python -m http.server`). Script usado: `http.server` con cabecera
  `Cache-Control: no-store`, puerto 8766. El panel del navegador puede estar oculto y frenar `requestAnimationFrame`: para
  probar en "tiempo real" se reproduce el cuerpo de `loop()` a mano a 60 cuadros por segundo.
- **Medir balance:** `simulateGame(índiceDeHéroe, godMode, rondas)` (en tests.js) juega partidas completas con la IA.
  Para diagnosticar, se registran muertes/duelos envolviendo funciones (`resolveDuel`, `handlePlayerDeath`, `endRound`) y se
  prueba **cambiando una cosa por vez** (ablación). Con 8-16 partidas por variante hay bastante ruido: repetir antes de concluir.
