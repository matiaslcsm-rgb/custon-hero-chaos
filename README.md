# Custom Hero Chaos — ASCII Edition

Juego inspirado en Custom Hero Chaos: elegís un héroe, drafteás habilidades de todos los héroes,
subís de nivel, comprás ítems y sobrevivís oleadas de creeps.

- **Jugar:** abrir `index.html` (doble clic).
- **Probar:** abrir `tests.html` (doble clic). Corre todas las pruebas automáticas y muestra ✅/❌.
- **Diseño:** reglas, decisiones, glosario y roadmap en [`DISEÑO.md`](DISEÑO.md).

## Estructura

```
index.html · style.css · tests.html
js/
├── data/        héroes, habilidades, ítems, creeps y etiquetas (contenido)
├── utils.js     log y utilidades
├── effects.js   efectos temporales y eventos de combate
├── progression.js  experiencia, niveles, puntos de habilidad, draft
├── hero.js      entidad del héroe y atributos
├── combat.js    daño, críticos, robo de vida, proyectiles, bajas
├── game.js      flujo de la partida y oleadas
├── ui.js        paneles, kit, códice y dibujo del mapa
├── main.js      arranque y validador de contenido
└── tests.js     pruebas automáticas
```
