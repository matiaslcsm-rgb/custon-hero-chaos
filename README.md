# Custom Hero Chaos — ASCII Edition

Juego inspirado en Custom Hero Chaos: elegís un héroe, drafteás habilidades de todos los héroes,
subís de nivel, comprás ítems y sobrevivís oleadas de creeps.

- **Jugar:** abrir `index.html` (doble clic). Tecla **P** (o el botón 🤖): la IA juega por vos.
- **Probar:** abrir `tests.html` (doble clic). Corre todas las pruebas automáticas y muestra ✅/❌.
- **Diseño:** reglas, decisiones, glosario y roadmap en [`DISEÑO.md`](DISEÑO.md).
- **Nuevos héroes con otra IA:** prompt listo en [`docs/prompt-heroes.md`](docs/prompt-heroes.md).

## Estructura

```
index.html · style.css · tests.html
js/
├── data/        contenido del juego
│   ├── registry.js    registro de héroes (y documentación del formato)
│   ├── heroes/        un archivo por héroe: plantilla + sus 4 habilidades
│   └── items.js · creeps.js · tags.js
├── utils.js     log y utilidades
├── effects.js   efectos temporales y eventos de combate
├── progression.js  experiencia, niveles, puntos de habilidad, draft
├── hero.js      entidad del héroe y atributos
├── combat.js    daño, críticos, robo de vida, proyectiles, bajas
├── items.js     inventario (6), recetas (básicos + compuestos), comprar y vender
├── game.js      flujo de la ronda y actualización de las arenas
├── world.js     los 8 héroes, arenas y ranking
├── death.js     vidas, revivir, Condenado, Injusticia de los Codiciosos
├── timers.js    temporizadores de fase y enfurecimiento de creeps
├── ai.js        IA de héroes y Piloto automático (tecla P)
├── creeps.js    oleadas con tema, aparición y comportamiento de los creeps
├── ui.js        paneles, kit, códice y dibujo del mapa
├── main.js      arranque y validador de contenido
└── tests.js     pruebas automáticas
```
