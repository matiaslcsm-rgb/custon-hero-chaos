# MATCH: el diseño del juego

Decidido por el usuario el 2026-10-18:
- El juego propio se llama **MATCH**.
- El concepto es **"En Vivo"**: un show de competencia del año 2099, transmitido en vivo (ver `docs/CONCEPTO-FUTURISTA.md`).
- **El juego es el mismo Custom Hero:** rondas, creeps, draft mezclado, un duelo por ronda desde la 5, apuestas,
  jefes, tienda. No cambia la estructura (las reglas de hoy están en `docs/MECANICAS.md`).
- **Lo que cambia es el centro del diseño de los héroes:** cada competidor tiene que tener **mecánicas que hagan
  divertido y desafiante pelear contra otros competidores.** El duelo es el momento estelar del programa.
- **Estilo RTS, como Dota:** te movés y peleás con el mouse, y las habilidades salen con tecla y clic. **No hay esquive
  con Espacio** (es una mecánica de la Torre, y en Custom Hero ya no está desde el 2026-10-18): uno se defiende con la
  posición, el momento justo y las defensas de su propio kit.

---

## 1. Qué hace bueno un duelo entre personajes (lo que investigamos)

- **Contrajuego** (Riot, los creadores de *League of Legends*): lo fuerte tiene que tener una respuesta **jugando**, no
  solo comprando un ítem. También advierten que, si todo pega demasiado fuerte, el poder tapa las decisiones.
- **Lectura** (David Sirlin, diseñador de *Street Fighter*, lo llama *yomi*): lo más rico de un duelo es adivinar qué va
  a hacer el otro. La base es un piedra, papel o tijera entre **atacar, defenderse y esperar**, con capas: si sé que vas
  a defenderte, espero; si sabés que espero, atacás.
- **En un RTS, la habilidad está en la posición y en el momento.** En Dota no hay botón de esquivar: se esquiva
  caminando fuera de un área o de la línea de un proyectil, cortando a tiempo lo que el rival está cargando, usando una
  habilidad que te saca o te protege, y eligiendo bien cuándo entrar y cuándo irse.
- **Avisos coherentes:** un golpe fuerte se anuncia **siempre con la misma señal** (un gesto, un color, un sonido), y así
  recibirlo es un error del que se aprende, no una injusticia. Pero si se anuncia todo, se pierde habilidad: los
  **amagues** y los tiempos variados mantienen viva la lectura.

## 2. Los pilares de los duelos de MATCH

Todo competidor se revisa contra esta lista antes de entrar:
1. **Lo fuerte se avisa y se puede evitar jugando:** caminando fuera del área, cortándolo a tiempo o con una defensa del
   kit. La señal es la misma en todo el juego, y dura lo que hace falta para reaccionar con un clic (más que en un
   juego de acción como la Torre).
2. **Todo tiene respuesta jugando.** Si la única respuesta es un ítem, está mal diseñado.
3. **Ventanas para castigar:** después de un golpe fuerte o de un error, el que lo hizo queda expuesto un instante.
4. **Una lectura propia:** cada competidor tiene algo que se gana adivinando al rival (una carga, un amague, una trampa).
5. **Recursos con decisión:** energía, cargas y enfriamientos que importan (¿lo gasto ya o lo guardo para su ventana?).
6. **Moverse importa:** distancia, paredes, zonas en el piso.
7. **Nada de lo que no es divertido:** aturdir sin fin, invisibilidad sin pista, daño que no se puede evitar, curación
   que no se puede cortar, ganar sin jugar.
8. **Duelos con idas y vueltas:** de 15 a 30 segundos (hoy la mediana es de unos 10-14 s), donde quien va ganando cambia
   más de una vez.

## 3. La caja de herramientas: lo que ya tenemos y lo que falta

**Ya está en el motor:**
- Controles estilo Dota: caminar con clic derecho, marcar un objetivo, habilidades que salen hacia el cursor.
- Proyectiles de habilidad que viajan al punto apuntado y pueden fallar.
- Inmunidad corta después de un aturdimiento y control a la mitad en duelo (nadie queda aturdido para siempre).
- En la Torre: **avisos de golpe** (los enemigos se preparan antes de pegar) y una **parada** que devuelve proyectiles.
- En el muñeco: golpes en tres tiempos (preparación, golpe y recuperación) y cajas de golpe.

**Falta para MATCH:**
- **Que los rivales de la IA lean los avisos:** que caminen fuera de las áreas anunciadas, corten lo que se pueda cortar
  y usen las defensas de su kit, con tiempos de reacción de una persona. Hoy no reaccionan a nada, así que un duelo
  contra ellos no puede ser una lectura de verdad.
- Avisos de golpe en los módulos de los competidores (traer lo de la Torre).
- Zonas y trampas en el piso, objetos que se pueden romper (drones, torretas).
- Cargas a la vista sobre el competidor.
- Habilidades que se cargan o canalizan (y se pueden cortar), y formas de cortarlas.

## 4. Los 8 competidores, con su mecánica de duelo (borrador)

Para cada uno: **cómo gana**, **su lectura** y **cómo se le gana**. Son ideas para aprobar o cambiar; los números
vienen después, en una ficha por competidor.

| Competidor/a | Cómo gana | Su lectura | Cómo se le gana |
|---|---|---|---|
| **Grúa** (operaria con brazo-grúa) | Un gancho lento y anunciado: si engancha, arrastra al rival; contra una pared, lo aturde un instante. | ¿Tirar el gancho ya o esperar a que el rival se quede quieto? | Correrse de la línea del gancho: si falla, Grúa queda expuesta un segundo. |
| **Eco** (DJ con ondas de sonido) | Un pulso que se ve (un metrónomo): los módulos tirados en el pulso pegan el doble. | El rival también ve el pulso: ¿tiro en el pulso, donde me esperan, o fuera, más flojo? | Cortarle el ritmo: empujarlo o aturdirlo reinicia el pulso. |
| **Flash** (camarógrafa del show) | Un flash en cono, anunciado: el que lo mira de frente queda encandilado (falla sus ataques 2 s). Sus golpes marcan al rival: recibe más daño. | ¿Me alejo del cono del flash (y dejo de pegar) o me la juego? | Entrarle de costado y no darle tiempo de girar. |
| **Kilo** (repartidor en patines) | Drones de entrega que pegan por él; cuanto más se mueve, más rápido va. | ¿Rompo los drones primero o voy por él? | Romper los drones (que se pueden golpear) y arrinconarlo contra una pared. |
| **Parche** (técnico de boxes) | Pone torretas en el piso (se ven) y se repara cerca de ellas. | ¿Dónde pongo la torreta? El rival elige pelear lejos. | Sacarlo de su zona o romper las torretas. |
| **Vector** (esgrimista con hoja de luz) | **Guardia:** un módulo corto de bloqueo; si le pegan durante la guardia, contraataca con un golpe enorme. | Espera tu golpe fuerte con la guardia. | **Amagar:** no tirar el golpe fuerte hasta que él gaste la guardia. |
| **Viral** (influencer) | Una "pose" a la vista (quieto medio segundo) que, si nadie la interrumpe, le da un refuerzo grande. Crece con las apuestas a su favor. | ¿Poso ahora, que el rival tiene el golpe en enfriamiento? | Guardar algo para cortar la pose. |
| **Glitch** (un error de la transmisión) | Copia por un rato el último módulo que lo golpeó. | ¿Qué le conviene que yo le tire? | Pegarle primero con el módulo más flojo y guardar el bueno. |

Los tres propios que ya teníamos (el Danzante Cinético, el Arcanista y el Sabio del Vacío) pasan al estilo nuevo con el
mismo filtro: se les busca su lectura y su respuesta.

## 5. Los duelos de hoy: qué mirar (sin cambiar la estructura)

- **Los ajustes de duelo** (−60% de daño y de curación entre héroes, control a la mitad) se pusieron porque el que
  aturdía primero ganaba. Con avisos y respuestas en los kits, puede que sobren: se revisan cuando entren los
  competidores nuevos.
- **Qué medir en cada competidor nuevo** (con el banco de partidas y el piloto):
  - cuánto duran los duelos (meta: 15 a 30 s);
  - cuántas veces cambia quién va ganando;
  - qué parte de los golpes fuertes evita el piloto con reflejos humanos (si nadie evita nada, no hay habilidad;
    si se evita todo, no hay amenaza);
  - que ningún cruce sea 80 a 20.
- **El piloto y la IA tienen que reaccionar a los avisos** caminando, con los tiempos de una persona (en la Torre ya hay
  un piloto con reflejos humanos que a veces falla).

### La base de hoy (banco de duelos, 2026-10-18)

Medido con `index.html?banco=66` (66 partidas de la IA contra la IA, 1.404 duelos; dos corridas dan lo mismo):

| Qué | Hoy | Meta de MATCH |
|---|---|---|
| Cuánto dura un duelo (mediana) | **5,2 s** (la mitad, entre 1,6 y 11 s) | 15 a 30 s |
| Duelos que terminan por tiempo (45 s) | 4% | pocos (menos del 10%) |
| Veces que cambia quién va ganando | **0,7** por duelo | más de 1 |
| Daño entre héroes que se podía evitar caminando | **14%** | la mayoría del daño fuerte |

O sea: hoy los duelos se deciden en segundos, casi siempre gana el que arranca ganando y casi nada se puede evitar.
Es lo que el plan del equipo (abajo) quiere cambiar.

### El plan del equipo (director de juego, 2026-10-18)

En orden, sin esperar decisiones:
1. ✅ **Banco de duelos** (la tabla de arriba): todo lo demás se mide con esto.
2. **Preparación anunciada para las habilidades** (en Dota se llama "cast point"): el golpe fuerte tarda al menos 0,7 s
   en salir, con la marca en el piso (la de la Torre), se puede cortar aturdiendo, y el que lo tiró queda expuesto de 0,3
   a 0,5 s. Se prueba con 1 o 2 habilidades de hoy.
3. **La IA lee los avisos:** camina para salir de las zonas y de la línea de los proyectiles, y corta preparaciones si
   tiene un aturdimiento listo, con tiempos de persona. Meta: el piloto evita entre el 30% y el 70% de los golpes
   anunciados, y los duelos se acercan a 15-30 s.
4. **Panel del rival en el duelo:** sus módulos con el enfriamiento y sus cargas (para leerlo: ¿tiene el golpe listo?).
5. **Arena de duelo con 2 a 4 columnas** que frenan proyectiles (para cubrirse, y la pared que va a usar Grúa).
6. Las herramientas de cada competidor (gancho, torretas, drones, pose) se hacen junto con su ficha, no antes.

## 6. Decisiones

- **Decidido por el usuario el 2026-10-18:** sin esquive con Espacio (es de la Torre) y estilo RTS, como Dota. Cada
  competidor se defiende con la posición y con lo que traiga su kit (la guardia de Vector, la pose de Viral, las
  torretas de Parche).

- **Controles como Dota** (elegido por el usuario el 2026-10-18 y hecho): clic derecho para caminar y, sobre un rival,
  para atacarlo (caminar a otro lado cancela la orden); las habilidades que se apuntan, con tecla y clic para confirmar
  (clic derecho o Esc cancela); en Opciones, "lanzamiento rápido" (sale al apretar la tecla) y "moverse con W A S D",
  los dos apagados de entrada. En la Torre no cambia nada.

- **No se pega caminando, como en Dota** (decidido por el usuario el 2026-10-18): para pegar te quedás quieto, moverte
  corta el golpe y el golpe básico tiene una preparación cortita. Está en el roadmap para que lo haga el equipo.

- **El color del peligro es el rojo** de los avisos de la Torre (decidido por el usuario el 2026-10-19): siempre el
  mismo en todo el juego; ya tiene modo daltónico (azul y naranja) y se cambia en un solo lugar.

- **Atributos y competidores** (decidido por el usuario el 2026-10-19): Blindaje, Reflejos y Procesador, y las 8 semillas
  (más el Danzante, el Arcanista y el Sabio del Vacío pasados al estilo nuevo).

1. **Sigue abierta:** quedarnos con el motor de hoy (recomendado).

## 7. Lo que sigue (una vez decidido)

1. **Una ficha por competidor**, de a uno: sello, 4 módulos con sus números, qué aviso tiene cada golpe fuerte, cuál es
   su lectura, su respuesta y su mal cruce. Para que vos la apruebes antes de programarla.
2. **Traer los avisos de golpe de la Torre** a los módulos de MATCH.
3. **El primer competidor jugable**, reemplazando a uno de los copiados de Dota, medido en duelos con los criterios de §5.

## Fuentes

- [Morello (Riot) sobre diseño, contrajuego y exceso de poder](https://www.surrenderat20.net/2013/08/red-post-collection-morello-on-design.html)
  y [la charla de Riot en la GDC sobre contrajuego en juegos multijugador](https://gdcvault.com/play/1018158/contactUs)
- [Qué es el *yomi* (David Sirlin)](https://www.gamedeveloper.com/design/what-is-yomi-)
- [Legibilidad y dificultad en los juegos de acción](https://www.gamedeveloper.com/game-platforms/designing-for-difficulty-readability-in-arpgs),
  [cómo diseñar avisos de ataque](https://bugnet.io/blog/how-to-design-enemy-attack-telegraphs) y
  [por qué no conviene anunciar todo](https://www.patreon.com/posts/120704454)
