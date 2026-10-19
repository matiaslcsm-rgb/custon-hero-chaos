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

## Cómo se reparte (de `docs/GUIA-AGENTES.md`)
- **Por parte del juego y por archivos, no por etapa.** Una misma función no pasa de mano en mano (se pierde
  información): el que la programa también escribe sus pruebas.
- **Primero el acuerdo:** los que diseñan (director, competidores, sistemas) dejan en un archivo qué se hace, con qué
  números y qué se mide. Eso es lo que reciben los que programan.
- **Después, cada uno lo suyo:** motor, IA de rivales, interfaz, arte y niveles, cada uno en sus archivos.
- **Al final, el QA** verifica todo (todas las pruebas, el banco, captura si se ve).
- **Cuántos agentes:** algo chico (un número, un texto, un arreglo puntual), 1 rol y el QA; algo mediano, 2 o 3 roles y
  el QA; algo grande, el director primero, después 3 a 5 roles y el QA. Nunca más de los que hacen falta: cada agente
  gasta unas 4 veces lo de un chat.
- Los agentes no lanzan otros agentes: coordina solo uno.

## El encargo (lo que le pasás a cada agente)
- **Objetivo:** qué tiene que quedar hecho y por qué (el pedido del usuario, con sus palabras si hace falta).
- **Lo ya decidido** que lo afecta (y lo que todavía es "(decisión)": no lo decide el agente).
- **Hasta dónde llega su parte** y qué es de otro rol.
- **Archivos** de entrada (el acuerdo, el código a tocar) y dónde deja el resultado.
- **Cómo se mide** que salió bien (con números si se puede).
- **Cómo entrega** (el formato de su archivo: qué hizo, archivos, pruebas y números, qué falta y para quién).

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
4. **QA.** Pasale el cambio al `qa-jugador` para que lo pruebe, y lo grave que encuentre mandáselo al rol que corresponde
   para que lo arregle.
5. **Cierre.** Subí `GAME_VERSION` (js/main.js), anotá en REWORK.md, ESTADO.md y ROADMAP.md, y hacé commit y push.

## Reglas
- **Regla del usuario (2026-10-18): siempre se llama a los agentes que el trabajo necesita, y cada uno hace solo lo suyo.**
  Repartí cada parte al rol que le corresponde (ver "Lo que te toca y lo que no" en cada agente): el diseño de un
  competidor, al de competidores; los números, a sistemas; el código del motor, al ingeniero; la IA, a ia-de-rivales;
  las pantallas, a interfaz; el arte, a arte-pixel; los textos, a narrativa; las arenas, a niveles; las pruebas, a QA.
  Vos (quien coordina) integrás, corrés las pruebas, documentás y subís; no hacés el trabajo de un rol.
- Cada agente arranca sin el contexto de la conversación: dale el pedido del usuario, los archivos y lo que ya se decidió.
- Un ajuste muy chico (un número o un texto) igual va al rol que corresponde, pero con un encargo corto.
- **Cuidá el plan:** cada agente lee mucho código. Antes de lanzar varios, mirá el uso (`get_usage`). Si no alcanza,
  lanzalos de a uno y con encargos chicos; si igual no alcanza, pará y dejá anotado en el roadmap dónde quedó (no hagas
  vos el trabajo de un rol para ahorrar).
- Al usuario le contás el resultado en rioplatense simple: qué se hizo, qué se midió, qué falta y qué tiene que decidir.
