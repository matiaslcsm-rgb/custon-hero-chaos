# MATCH (antes Custom Hero) e Infinite Tower

Juegos web en JavaScript puro con `<script>` clásicos (el orden está en `index.html`), sin build. Se publican en
GitHub Pages con cada push a `main`: https://matiaslcsm-rgb.github.io/custon-hero-chaos/

## Antes de tocar nada
- Leé `docs/ESTADO.md` (qué está hecho y qué falta) y el aviso de arriba de `docs/ROADMAP.md`.
- **MATCH** es el foco: juego propio sin nada de Dota, concepto "En Vivo" (un show del 2099), la estructura de Custom Hero
  (rondas, creeps, draft, un duelo por ronda, apuestas, jefes) y competidores pensados para que **pelear entre héroes sea
  divertido y desafiante**. Estilo RTS como Dota (mouse; sin esquive con Espacio; no se pega caminando). Diseño en
  `docs/MATCH.md`; reglas de hoy en `docs/MECANICAS.md`.
- **Infinite Tower está en pausa:** no se toca.

## El equipo
**Sin agentes (pedido del usuario 2026-10-19):** el trabajo lo hacés vos, sin lanzar agentes. Los diez agentes de
`.claude/agents/` y la skill `equipo` quedan solo para cuando el usuario pida "el equipo" o "los agentes" en el chat
(guía en `docs/GUIA-AGENTES.md`).

## Cómo se prueba
- Pruebas: `python docs/correr-pruebas.py` (tiene que decir "✅ N/N pruebas").
- Banco de partidas y de duelos: `index.html?banco=66` (132 para decidir algo de balance).
- Capturas para los informes: `python docs/captura.py` (guarda PNG en `docs/informes/img/`).

## Reglas de la casa
- Español rioplatense con voseo en código, comentarios, commits e interfaz. El usuario no es programador.
- Escribí como el código de alrededor; toda mecánica nueva lleva su prueba en `js/tests.js`.
- Medí antes y después, y anotá en `docs/REWORK.md`, `docs/ESTADO.md` y `docs/ROADMAP.md`. Subí `GAME_VERSION`
  (`js/main.js`) en cada entrega.
- Lo que decide el usuario se marca "(decisión)" con 2-3 opciones y una recomendada.
- No toques el guardado del jugador ni nada fuera de la carpeta, no borres archivos del usuario, no fuerces push, no
  cambies el estilo gráfico sin que lo decida el usuario.
