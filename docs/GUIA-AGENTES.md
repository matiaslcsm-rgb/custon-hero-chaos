# Cómo armar bien el equipo de agentes (guía aplicada a MATCH)

Pedido del usuario el 2026-10-18: buscar recomendaciones (en internet, en GitHub) para que el sistema de agentes
funcione de verdad al diseñar y programar este juego, y aplicarlas. Acá están lo que dicen las fuentes, cómo lo
aplicamos y lo que falta decidir.

---

## 1. Qué dicen las fuentes

**La documentación oficial de los subagentes de Claude Code:**
- Cada agente es un archivo en `.claude/agents/` con un encabezado (nombre, descripción, herramientas, modelo) y su
  rol. **La descripción** es lo que usa Claude para saber cuándo llamarlo: tiene que ser corta y decir cuándo usarlo.
- **Se cargan según la carpeta donde arranca la sesión:** Claude Code mira esa carpeta y las de arriba hasta la raíz
  del repositorio, **no las de adentro**.
- **Darle a cada agente solo las herramientas que necesita** (un revisor, solo leer).
- **Mandar el trabajo barato a un modelo más chico**, para ahorrar.
- Los agentes sirven para sacar del medio lo que ocupa mucho (correr pruebas, leer mucho código) y devolver solo un
  resumen. Cuidado con lanzar muchos a la vez: cada uno gasta lo suyo.

**Anthropic, sobre su sistema de investigación con varios agentes:**
- El que coordina tiene que darle a cada agente **un encargo claro**: el objetivo, cómo entregar el resultado, qué
  herramientas usar y **hasta dónde llega su tarea**. Con encargos vagos, los agentes repetían trabajo o dejaban huecos.
- **Escalar el esfuerzo:** algo simple, 1 agente; una comparación, 2 a 4; algo complejo, más. Sin límites, llegaron a
  lanzar 50 agentes para preguntas simples.
- **Cuesta caro:** un agente gasta unas 4 veces lo de un chat, y un sistema de varios agentes, unas 15 veces.
- Guardar el plan y los resultados **en archivos**, y que los agentes devuelvan referencias cortas.
- Juzgar si **el resultado final** está bien, no si se siguió cada paso.
- **No conviene para la mayoría de las tareas de programación**, que tienen pocas partes independientes y muchas
  dependencias entre sí.

**Anthropic, sobre cuándo usar varios agentes:**
- Empezar con uno y sumar agentes solo si hay una razón: mucho contexto que ensucia, trabajo que va en paralelo o una
  especialización real.
- **Partir el trabajo por contexto, no por tipo de tarea.** Si planear, programar, probar y revisar van a agentes
  distintos, se arma un "teléfono descompuesto": la información se pierde en cada pasada.
- **Una función y sus pruebas, en el mismo agente** (el que la programó tiene el contexto).
- Partir por bordes limpios, por ejemplo partes que se comunican por un acuerdo claro.
- Un **verificador** que corre **todas** las pruebas y no se apura a decir "anda" (el problema de la "victoria
  temprana").

**Claude Code Game Studios** (GitHub, unas 18 mil estrellas): una plantilla que arma un estudio de videojuegos con 48
agentes en tres niveles (directores, jefes de área y especialistas).
- Cada agente trabaja en su área y **no toca archivos de otra sin que se lo pidan**.
- Las dudas de diseño las resuelve el director creativo, y las técnicas, el director técnico.
- **El usuario decide todo**, y los agentes preguntan antes de proponer, con 2 a 4 opciones.
- Modelo grande para los directores y uno más chico para varios especialistas.
- **Un cambio que se ve no está terminado sin una corrida real con captura:** que pasen las pruebas no alcanza.

## 2. La tensión con nuestra regla, y cómo la resolvemos

Tu regla es que cada trabajo lo haga el agente que corresponde y nadie haga el de otro. Anthropic avisa que pasar una
misma función de mano en mano entre agentes (uno la diseña, otro la programa, otro la prueba) pierde información.

Las dos cosas se cumplen si **los roles se reparten por parte del juego y por archivos**, no por etapa:
1. **Los que diseñan** (director, competidores, sistemas) escriben **un acuerdo en un archivo**: qué se hace, con qué
   números y qué se va a medir. Es la única entrada de los que programan.
2. **Los que programan** (motor, IA de rivales, interfaz, arte, niveles) hacen **su parte completa con sus pruebas**, cada
   uno en sus archivos. Una misma función no se parte entre dos programadores.
3. **El QA verifica al final:** todas las pruebas, el banco de partidas y de duelos, y una corrida real con captura si
   el cambio se ve.
4. **Quien coordina** reparte, integra, documenta y sube. Los agentes no pueden lanzar otros agentes (no tienen esa
   herramienta): solo coordina uno.

## 3. Qué cambiamos ya (2026-10-18)

- **`CLAUDE.md` en la carpeta del juego:** las reglas de la casa y dónde está todo, para cualquier sesión o agente que
  trabaje ahí.
- **Cada agente** ahora dice cómo entrega su trabajo (siempre igual: qué hizo, qué archivos tocó, qué pruebas y números,
  qué falta y para qué rol) y qué necesita traer su encargo.
- **El QA** hace una verificación completa: todas las pruebas, el banco y una corrida real con captura si se ve. No da
  nada por bueno con un par de pruebas.
- **Modelos:** el QA y narrativa usan **Sonnet**, que es más barato; los demás usan el mismo modelo que la sesión. Se
  cambia en una línea de cada archivo.
- **La skill del equipo** suma una plantilla de encargo, cuántos agentes usar según el tamaño del trabajo y el orden:
  primero el acuerdo, después cada uno lo suyo y al final el QA.

## 4. Que los agentes aparezcan solos (decidido y hecho: opción a, 2026-10-18)

Las sesiones y la tarea automática arrancan en `mattbox`, la carpeta de arriba, y Claude Code no mira las carpetas de
adentro: los 10 agentes del juego no aparecían. **El usuario eligió la opción (a)** y quedó hecho:
`mattbox/.claude/agents` y `mattbox/.claude/skills` son accesos directos (junction) a las carpetas del juego, así que los
agentes y la skill `equipo` están en todas las sesiones de `mattbox` y en la tarea automática. Hace falta **reiniciar
una vez** las sesiones que ya estaban abiertas. Una sesión abierta en la carpeta del juego los ve igual (no se
duplican: ahí la búsqueda termina en la carpeta del repositorio). Si OneDrive avisa que no puede sincronizar esos
accesos directos, no pasa nada: los archivos de verdad están en la carpeta del juego y se suben con git.

Ajustes de la misma fecha para que rinda más: tope de pasos para el director (40) y el QA (60), que son los que más
leen; QA y narrativa con Sonnet; formato fijo de entrega; plantilla de encargo y cantidad de agentes según el tamaño.

Las opciones que se plantearon:
- **(a) Recomendada:** que `mattbox/.claude/agents` sea un acceso directo de carpeta (en Windows, un "junction") a la
  carpeta de agentes del juego. Aparecen en todas las sesiones de `mattbox` y en la tarea automática, sin copias que se
  desactualicen. Hay que reiniciar la sesión una vez. Ojo: también aparecerían en otros proyectos que abras desde
  `mattbox`.
- **(b)** Abrir las sesiones del juego directamente en la carpeta del juego. Anda para tus sesiones, pero la tarea
  automática igual arranca en `mattbox`.
- **(c)** Seguir como hoy, con el agente general y el archivo del rol.

## 5. Para más adelante (opcional)

- **Ganchos** (hooks): anotar qué agente trabajó en cada cosa, o frenar a un agente que edita archivos de otra área.
- **Memoria propia por agente** (`memory: project`), para que cada rol recuerde lo que aprendió.
- **Revisar al equipo:** después de 5 a 10 trabajos, mirar qué encargos salieron bien y cuáles no, y ajustar los roles.

## Fuentes

- [Subagentes de Claude Code (documentación oficial)](https://code.claude.com/docs/en/sub-agents)
- [Cómo armamos nuestro sistema de investigación con varios agentes (Anthropic)](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Sistemas de varios agentes: cuándo y cómo usarlos (Anthropic)](https://www.claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them)
- [Claude Code Game Studios (GitHub)](https://github.com/Donchitos/Claude-Code-Game-Studios)
- Colecciones de agentes de la comunidad: [awesome-claude-code-subagents (VoltAgent)](https://dev.to/voltagent/100-claude-code-subagent-collection-1eb0) y [wshobson/agents](https://awesome.ecosyste.ms/projects/github.com%2Fwshobson%2Fagents%3Ftab=re)
- Guías de terceros: [PubNub](https://www.pubnub.com/blog/best-practices-claude-code-sub-agents/) y [Tembo](https://tembo.io/blog/claude-code-subagents)
