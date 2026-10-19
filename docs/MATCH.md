# MATCH: el diseño del juego

Decidido por el usuario el 2026-10-18:
- El juego propio se llama **MATCH** (un partido: un show de competencia en vivo).
- El concepto es **"En Vivo"**: un show de competencia del año 2099, transmitido en vivo (ver `docs/CONCEPTO-FUTURISTA.md`).
- **La regla central: MATCH es PvP.** Todos los competidores combaten entre ellos, y cada uno se diseña para pelear
  contra otros competidores, no contra creeps.

Este documento es la propuesta para el corazón del juego. Las reglas de hoy, de donde partimos, están en
`docs/MECANICAS.md`. Lo marcado como decisión espera al usuario (también en el roadmap, Fase C0).

---

## 1. El cambio de fondo

Hoy, Custom Hero es sobre todo PvE: 6 de los 8 pelean contra creeps y solo 2 hacen un duelo por ronda (desde la 5).
En MATCH se da vuelta: **todas las rondas, todos pelean contra otro competidor.** Los creeps dejan de ser el centro.

Es lo que hacen los auto battlers que funcionan (*Teamfight Tactics*, *Hearthstone Battlegrounds*): cada ronda te toca
un rival, y perder te saca una parte de una vida que es tuya, no del personaje. Cuando te quedás sin esa vida, quedás
afuera. Gana el último. Para nosotros, esa vida es **tu audiencia**.

## 2. Una emisión (una partida)

8 competidores. Cada ronda tiene cuatro momentos:

1. **Camarines** (preparación, 30 s): patrocinadores (la tienda), subir módulos y, en las rondas 1 a 4 y 9, el sorteo de
   un módulo nuevo.
2. **La previa** (15 s): se anuncian los cruces de la ronda y la tribuna apuesta (vos también).
3. **Cara a cara** (hasta 45 s): **los 8 pelean al mismo tiempo**, en 4 arenas, uno contra uno. Mirás tu pelea; las
   otras se ven en el resumen (y podés espiarlas con el ranking).
   - **Cruces:** nunca contra el mismo rival de la ronda anterior, y rotando para que te toquen todos.
   - **Si quedan impares,** uno pelea contra **la repetición**: una copia del último competidor que salió del aire (en
     los auto battlers se llama "fantasma"). Perder contra la repetición cuesta la mitad.
4. **La tanda** (el resumen): créditos ganados, audiencia perdida, cómo salieron los otros cara a cara y tu rating.

**Cada 5 rondas, el Todos contra Todos:** los que siguen en el aire, juntos en una sola arena grande. Es el momento
estelar del programa (reemplaza a los jefes de ronda). Premios por puesto: créditos y un **prototipo** (los objetos
neutrales de hoy) para los primeros. Cuesta audiencia solo a los que caen primero.

**La ronda 1 es la "prueba de cámara":** contra drones, para probar el kit sin perder audiencia. Desde la 2, todo es PvP.

## 3. La audiencia (la vida del jugador)

- Arrancás con **100 de audiencia**.
- **Perder un cara a cara te baja la audiencia:** un poco según la ronda, y más cuanta más vida le haya quedado al
  ganador (perder apretado cuesta poco; que te pasen por arriba, mucho). Propuesta para medir:
  **2 + la mitad de la ronda + 10 × (la vida que le quedó al ganador, de 0 a 1)**. En la ronda 2, perdiendo apretado:
  ~3; en la ronda 10, aplastado: ~17.
- **Horario central** (desde la ronda 15): la audiencia que se pierde va subiendo cada ronda. Es la muerte súbita de
  hoy, pero sobre la audiencia: así la emisión siempre termina.
- **En 0: fuera del aire.** Mirás desde la tribuna.
- **El rating** (el ranking) se ordena por audiencia.
- **Reemplaza:** las 2 vidas, la tarjeta amarilla (Condenado), la Voluntad de Titán y la muerte súbita sobre el daño.

**Meta:** emisiones de 15 a 20 rondas y 16 a 21 minutos, como hoy. Se ajusta con el banco de partidas.

## 4. La economía (créditos)

- **Por ronda:** una base que crece con las rondas, más un extra por ganar el cara a cara.
- **Rendimiento** (el interés de hoy, +1 cada 10 ahorrados, tope 25) y **racha en vivo** (ganar o perder seguido paga).
- **Apuestas** (ver abajo) y **patrocinio**: el que gana el Todos contra Todos cobra el premio grande.
- **Se va** el oro por matar creeps (y con él la Cacería Veloz).

## 5. Las apuestas

- En la previa, la tribuna apuesta a los cruces de la ronda. **Vos podés apostar a otro cara a cara o a vos mismo**:
  apostarte a vos paga menos si sos el favorito y mucho si no lo sos.
- Sigue el **pozo compartido** (la sorpresa paga más) con tope de la mitad de tus créditos.
- El ganador de un cara a cara cobra el 25% de lo que le apostaron (como hoy).
- **Ver los módulos y los equipos de cada uno en la previa** (estaba en el roadmap): con PvP es más importante todavía.

## 6. Los competidores, pensados para PvP

Criterios nuevos (reemplazan a los de `DISEÑO.md` §6 donde choquen):
1. **Un plan claro para el uno contra uno:** cómo gana (presión, aguante, ráfaga, control, trampas, invocaciones) y
   **cómo se le gana**. Cada uno tiene al menos un mal cruce claro: así importan el baneo, el draft y los patrocinadores.
2. **Nada que solo sirva contra creeps.** El escalado que hoy sale de bajas de creeps pasa a salir de **cara a cara
   ganados** o de daño hecho a competidores.
3. **Contrajuego:** todo control fuerte se avisa antes y se puede esquivar o cortar. Nada de aturdir para siempre.
4. **Que también funcione en el Todos contra Todos** (con varios rivales a la vez).
5. **Sello (innato) con identidad** y, si se puede, atado al show (como Viral, que crece con las apuestas a su favor).

Las 8 semillas de `docs/CONCEPTO-FUTURISTA.md` ya son de PvP:
- **Grúa** agarra y arrastra.
- **Eco** premia el ritmo.
- **Flash** marca al rival.
- **Kilo** pelea con drones.
- **Parche** aguanta y pone torretas.
- **Vector** esquiva y castiga.
- **Viral** juega con la tribuna.
- **Glitch** copia el último módulo que le pegó.

## 7. Qué pasa con cada mecánica de hoy

| Se queda | Cambia | Se va |
|---|---|---|
| Sorteo de módulos (rondas 1-4 y 9) y baneo | El duelo de 1 por ronda → **todos pelean todas las rondas** | Las oleadas de creeps como base (quedan solo en la ronda 1) |
| Módulos, niveles, sinergias (etiquetas y eventos) | Las 2 vidas y la tarjeta amarilla → **la audiencia** | Los temas de oleada, la presión al líder, el enfurecimiento |
| Patrocinadores (ítems con ensamblado) | Los jefes de ronda → **el Todos contra Todos** | El oro por bajas y la Cacería Veloz |
| Rendimiento (interés) y racha | La muerte súbita → **horario central** sobre la audiencia | Los 17 creeps como rivales (algunos pueden volver como peligros en las arenas) |
| Apuestas con pozo compartido y respaldo | El escalado por bajas → **por cara a cara ganados** | |
| Reprogramación y Rediseño (Fragmento y Libro) para los de abajo | Ranking por puntos → **rating por audiencia** | |
| Pantalla de fin, perfil, IA, piloto y banco de partidas | Los ajustes de duelo (−60% de daño entre competidores, etc.) se revisan: ahora todo es duelo | |

## 8. ¿Se puede con el motor de hoy?

Sí, y sin empezar de cero:
- El motor **ya armó varios duelos a la vez** (en la fase F2 del diseño, todas las parejas peleaban en paralelo) y hoy
  arma los duelos a partir de una lista de parejas, con lugar para "el que descansa". Que peleen los 8 es,
  sobre todo, armar 4 parejas en vez de 1.
- La IA ya pelea contra competidores (duelos), el banco de partidas ya mide quién gana, y el piloto juega solo.
- Lo nuevo de verdad: la audiencia, la repetición, el Todos contra Todos y la economía sin creeps.

## 9. Decisiones

1. **Cómo es una ronda:** (a) **los 8 en cara a cara simultáneos todas las rondas, más un Todos contra Todos cada 5
   (recomendada)**; (b) solo cara a cara; (c) siempre Todos contra Todos, los 8 en una arena.
2. **La vida del jugador:** (a) **la audiencia, 100 puntos que bajan al perder (recomendada: es lo probado en los auto
   battlers y le da sentido al show)**; (b) 3 vidas fijas, una por derrota; (c) eliminación directa desde una ronda fija.
3. **Los drones:** (a) **solo la ronda 1 de prueba de cámara (recomendada)**; (b) nada de drones; (c) una ronda de
   drones cada 5 para ganar créditos, como las rondas contra monstruos de *Teamfight Tactics*.
4. **Las apuestas:** (a) **a otro cara a cara o a vos mismo (recomendada)**; (b) solo a otros; (c) solo en el Todos
   contra Todos.

Siguen pendientes de antes: los atributos (Blindaje, Reflejos y Procesador, recomendados) y los competidores de arranque
(las 8 semillas, recomendadas).

## Fuentes

- [Cómo se juega *Teamfight Tactics*: rondas, vida y rivales](https://wiki.leagueoflegends.com/en-us/Teamfight_Tactics_(game)) y [cómo se calcula el daño al perder](https://dotesports.com/league-of-legends/news/how-to-calculate-player-damage-teamfight-tactics)
- [Guía para principiantes de *Teamfight Tactics*](https://www.oneesports.gg/teamfight-tactics/the-beginners-guide-to-teamfight-tactics)
- [Presentación de *Hearthstone Battlegrounds* (Blizzard)](https://hearthstone.blizzard.com/en-us/news/23156373) y [los "fantasmas"](https://blizzardwatch.com/2022/09/08/how-to-win-hearthstone-battlegrounds/)
