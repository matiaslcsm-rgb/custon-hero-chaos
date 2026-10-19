---
name: equipo
description: Reúne al equipo de desarrollo de MATCH (y de Infinite Tower, en pausa) para diseñar, hacer y revisar un tema o un ítem del roadmap. Diez agentes; director-de-juego, disenador-de-competidores, disenador-de-sistemas, ingeniero-de-motor, ia-de-rivales, disenador-de-interfaz, arte-pixel, narrativa, disenador-de-niveles y qa-jugador. Usalo cuando el usuario pida "el equipo" o "los agentes", una revisión de diseño, o un ítem grande que toca varias áreas.
argument-hint: "[tema o ítem del roadmap]"
---

# El equipo de desarrollo

Trabajá el tema `$ARGUMENTS` como un estudio chico. Los agentes están en `.claude/agents/` (cada archivo trae su rol, el
contexto del proyecto y las reglas de la casa):

| Agente | Para qué |
|---|---|
| `director-de-juego` | Visión de MATCH, opciones con una recomendada, prioridad, qué medir y quién hace qué (no programa) |
| `disenador-de-competidores` | La ficha de cada competidor: sello, 4 módulos con números, avisos, lectura, cómo se le gana y su mal cruce |
| `disenador-de-sistemas` | Reglas base, economía y balance, medido con el banco de partidas y de duelos |
| `ingeniero-de-motor` | Programa las herramientas de los duelos (preparación anunciada, cortes, zonas, obstáculos) sin romper la Torre |
| `ia-de-rivales` | Que los 7 rivales jueguen como personas: lean los avisos, se corran, corten, drafteen, compren y apuesten |
| `disenador-de-interfaz` | HUD, ventanas, controles estilo Dota, leer al rival en el duelo, el show y la calidad de vida |
| `arte-pixel` | Sprites, animación, paleta futurista y legibilidad (y el arte de la Torre, en pausa) |
| `narrativa` | El guion del show "En Vivo" (conductor, frases de los competidores) y la historia de la Torre (en pausa) |
| `disenador-de-niveles` | Las arenas de MATCH (obstáculos del duelo) y los pisos de la Torre (en pausa) |
| `qa-jugador` | Pruebas, bancos, partidas simuladas e informe de problemas con pasos para reproducirlos (no arregla) |

**Si los agentes no aparecen** (pasa cuando la sesión se abrió desde una carpeta de arriba, como `mattbox`): usá el
agente `general-purpose` y pegale al principio del encargo el contenido del archivo del rol
(`.claude/agents/<agente>.md`, sin el encabezado). Si el rol no modifica archivos (director-de-juego, qa-jugador),
decíselo en el encargo.

## Cómo se trabaja
1. **Diseño.** Consultá al `director-de-juego` con el tema y el contexto (qué pidió el usuario, qué dice el roadmap). Si
   lo que vuelve es una decisión del usuario, presentale las opciones con la recomendada y pará ahí.
2. **Especialistas.** Lanzá en paralelo solo a los que el tema necesita, cada uno con un encargo concreto y los archivos
   a tocar. Ejemplos:
   - Un competidor nuevo: competidores (la ficha, que aprueba el usuario), después motor, IA y arte.
   - Que los duelos duren más y se puedan leer: sistemas, motor e IA.
   - Una pantalla nueva: interfaz y arte.
   - Si dos especialistas tocan el mismo archivo, hacelo en orden, no en paralelo.
3. **Integración.** Revisá lo que hizo cada uno, uní las partes y corré las pruebas (`python docs/correr-pruebas.py`).
4. **QA.** Pasale el cambio al `qa-jugador` para que lo pruebe y arreglá lo grave que encuentre.
5. **Cierre.** Subí `GAME_VERSION` (js/main.js), anotá en REWORK.md, ESTADO.md y ROADMAP.md, y hacé commit y push.

## Reglas
- Cada agente arranca sin el contexto de la conversación: dale el pedido del usuario, los archivos y lo que ya se decidió.
- No lances a todo el equipo para algo chico: un ajuste de un número o un texto lo hacés vos directamente.
- **Cuidá el plan:** cada agente lee mucho código. Antes de lanzar varios, mirá el uso (`get_usage`); si el límite de
  5 horas pasa el 50%, preferí hacerlo vos o lanzar de a uno.
- Al usuario le contás el resultado en rioplatense simple: qué se hizo, qué se midió, qué falta y qué tiene que decidir.
