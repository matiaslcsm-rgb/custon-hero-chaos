# Balance de Custom Hero: banco de partidas

## Cómo se mide
Abrí `index.html?banco=66` (o el número de partidas que quieras) y esperá a que el título diga "📊 banco 66/66 listo":
la tabla aparece en pantalla y en la consola (`benchResult`). Con 66 partidas tarda unos 3 minutos.

- Cada partida es completa: 8 héroes jugados por la IA (también el tuyo, con el piloto), hasta que queda uno (tope 60 rondas).
- **Semilla fija:** la partida N usa la semilla N, así que el mismo código da siempre la misma tabla. Si cambia la
  tabla, cambió el juego. El héroe del jugador rota (partida N → héroe N mod 11) y los rivales salen como en el juego.
- Los sonidos se apagan mientras corre: usan el mismo azar y, como se saltean según el tiempo real, rompían la semilla.
- Columnas: **ganadas** (de las partidas en que estuvo), **puesto** promedio (1 a 8) y **ronda** promedio en que quedó afuera.
- Referencia: si todos fueran parejos, cada héroe ganaría ~12,5% (1 de cada 8) y tendría puesto promedio 4,5.
- Código: `benchGame`, `benchTable` y `runBench` en `js/tests.js` (arriba de las pruebas de "Partida completa").

## Base: 2026-10-16 (66 partidas, semillas 1-66)
Ronda final promedio 24 (entre 20 y 30; ninguna llegó al tope de 60).

| Héroe | Ganadas | % | Puesto | Afuera en la ronda |
|---|---|---|---|---|
| Sniper | 26/44 | **59%** | 1,9 | 23 |
| Zeus | 15/51 | 29% | 3,6 | 21 |
| Asesino | 8/51 | 16% | 4,5 | 19 |
| Guerrero Vampiro | 7/51 | 14% | 4,2 | 22 |
| Nigromante | 4/48 | 8% | 5,2 | 18 |
| Danzante Cinético | 2/41 | 5% | 5,6 | 21 |
| Arcanista | 2/49 | 4% | 4,3 | 16 |
| Axe | 1/53 | 2% | 4,4 | 18 |
| Bruja del Hielo | 1/44 | 2% | 5,0 | 16 |
| Sabio del Vacío | 0/47 | 0% | 5,2 | 18 |
| Alquimista | 0/49 | 0% | 5,7 | 15 |

**Lectura:**
- El Sniper sigue arriba, y más que antes: gana 6 de cada 10 partidas en las que está (ESTADO.md decía 8 de 14 con
  otro método). Es lo primero a revisar.
- Zeus también está alto (29%, más del doble de lo parejo).
- Abajo, los magos (Sabio del Vacío, Alquimista, Bruja del Hielo, Arcanista) y Axe: casi nunca ganan y los magos
  quedan afuera antes (ronda 15-18). El Vampiro (14%) ya no está entre los peores; el Nigromante (8%) sí, un poco abajo.
- Ojo: el piloto juega igual a todos, así que esto mide héroes **jugados por la IA**. Un héroe difícil de usar puede
  rendir distinto en manos de una persona.

## Historial
(Cada ajuste de balance agrega una fila con el antes y el después, medido con el mismo banco.)
