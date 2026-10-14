---
name: equipo
description: Reúne al equipo de desarrollo de Custom Hero e Infinite Tower (director-de-juego, disenador-de-sistemas, disenador-de-niveles, narrativa, arte-pixel, qa-jugador) para diseñar, hacer y revisar un tema o un ítem del roadmap. Usalo cuando el usuario pida "el equipo", una revisión de diseño, o un ítem grande que toca varias áreas.
argument-hint: "[tema o ítem del roadmap]"
---

# El equipo de desarrollo

Trabajá el tema `$ARGUMENTS` como un estudio chico. Los agentes están en `.claude/agents/`:

| Agente | Para qué |
|---|---|
| `director-de-juego` | Visión, opciones con una recomendada, prioridad, qué medir |
| `disenador-de-sistemas` | Mecánicas, economía y balance medido |
| `disenador-de-niveles` | Pisos, mundo, secretos y generación |
| `narrativa` | Historia, diálogos y coherencia |
| `arte-pixel` | Sprites, animación y legibilidad |
| `qa-jugador` | Pruebas, partidas simuladas e informe de problemas |

## Cómo se trabaja
1. **Diseño.** Consultá al `director-de-juego` con el tema y el contexto (qué pidió el usuario, qué dice el roadmap). Si lo que vuelve es una decisión del usuario, presentale las opciones con la recomendada y pará ahí.
2. **Especialistas.** Lanzá en paralelo solo a los que el tema necesita, cada uno con un encargo concreto y los archivos a tocar.
   - Un arma nueva: sistemas y arte.
   - Un secreto en un piso: niveles y narrativa.
   - Si dos especialistas tocan el mismo archivo, hacelo en orden, no en paralelo.
3. **Integración.** Revisá lo que hizo cada uno, uní las partes y corré las pruebas (`index.html?test`).
4. **QA.** Pasale el cambio al `qa-jugador` para que lo pruebe y arreglá lo grave que encuentre.
5. **Cierre.** Subí `GAME_VERSION` (js/main.js), anotá en REWORK.md, ESTADO.md y ROADMAP.md, y hacé commit y push.

## Reglas
- Cada agente arranca sin el contexto de la conversación: dale el pedido del usuario, los archivos y lo que ya se decidió.
- No lances a todo el equipo para algo chico: un ajuste de un número o un texto lo hacés vos directamente.
- Al usuario le contás el resultado en rioplatense simple: qué se hizo, qué se midió, qué falta y qué tiene que decidir.
