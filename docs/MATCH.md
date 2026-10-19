# MATCH: el diseño del juego

Decidido por el usuario el 2026-10-18:
- El juego propio se llama **MATCH**.
- El concepto es **"En Vivo"**: un show de competencia del año 2099, transmitido en vivo (ver `docs/CONCEPTO-FUTURISTA.md`).
- **El juego es el mismo Custom Hero:** rondas, creeps, draft mezclado, un duelo por ronda desde la 5, apuestas,
  jefes, tienda. No cambia la estructura (las reglas de hoy están en `docs/MECANICAS.md`).
- **Lo que cambia es el centro del diseño de los héroes:** cada competidor tiene que tener **mecánicas que hagan
  divertido y desafiante pelear contra otros competidores.** El duelo es el momento estelar del programa.

---

## 1. Qué hace bueno un duelo entre personajes (lo que investigamos)

- **Contrajuego** (Riot, los creadores de *League of Legends*): lo fuerte tiene que tener una respuesta **jugando**, no
  solo comprando un ítem. También advierten que, si todo pega demasiado fuerte, el poder tapa las decisiones.
- **Lectura** (David Sirlin, diseñador de *Street Fighter*, lo llama *yomi*): lo más rico de un duelo es adivinar qué va
  a hacer el otro. La base es un piedra, papel o tijera entre **atacar, cubrirse y esquivar**, con capas: si sé que vas a
  esquivar, espero; si sabés que espero, atacás.
- **Avisos coherentes:** un golpe fuerte se anuncia **siempre con la misma señal** (un gesto, un color, un sonido), y así
  recibirlo es un error del que se aprende, no una injusticia. Pero si se anuncia todo, se pierde habilidad: los
  **amagues** y los tiempos variados mantienen viva la lectura.

## 2. Los pilares de los duelos de MATCH

Todo competidor se revisa contra esta lista antes de entrar:
1. **Lo fuerte se avisa y se puede evitar:** esquivando, cubriéndose o saliendo del área. La señal es la misma en todo
   el juego.
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
- Esquive con Espacio (y unos instantes intocable).
- Proyectiles de habilidad que viajan al punto apuntado y pueden fallar.
- Inmunidad corta después de un aturdimiento y control a la mitad en duelo (nadie queda aturdido para siempre).
- En la Torre: **avisos de golpe** (los enemigos se preparan antes de pegar) y una **parada** que devuelve proyectiles.
- En el muñeco: golpes en tres tiempos (preparación, golpe y recuperación) y cajas de golpe.

**Falta para MATCH:**
- **Que los rivales de la IA también esquiven.** Hoy el esquive con Espacio es solo del jugador (y del piloto en la
  Torre): los 7 rivales pelean sin esquivar, así que un duelo contra ellos no puede ser una lectura de verdad.
- Avisos de golpe en los módulos de los competidores (traer lo de la Torre).
- Zonas y trampas en el piso, objetos que se pueden romper (drones, torretas).
- Cargas a la vista sobre el competidor.
- Una forma de cubrirse (ver la decisión de abajo).

## 4. Los 8 competidores, con su mecánica de duelo (borrador)

Para cada uno: **cómo gana**, **su lectura** y **cómo se le gana**. Son ideas para aprobar o cambiar; los números
vienen después, en una ficha por competidor.

| Competidor/a | Cómo gana | Su lectura | Cómo se le gana |
|---|---|---|---|
| **Grúa** (operaria con brazo-grúa) | Un gancho lento y anunciado: si engancha, arrastra al rival; contra una pared, lo aturde un instante. | ¿Tirar el gancho ya o esperar a que el rival esquive? | Esquivar el gancho: si falla, Grúa queda expuesta un segundo. |
| **Eco** (DJ con ondas de sonido) | Un pulso que se ve (un metrónomo): los módulos tirados en el pulso pegan el doble. | El rival también ve el pulso: ¿tiro en el pulso, donde me esperan, o fuera, más flojo? | Cortarle el ritmo: empujarlo o aturdirlo reinicia el pulso. |
| **Flash** (camarógrafa del show) | Un flash en cono, anunciado: el que lo mira de frente queda encandilado (falla sus ataques 2 s). Sus golpes marcan al rival: recibe más daño. | ¿Me doy vuelta para esquivar el flash (y dejo de pegar) o me la juego? | Entrarle de costado y no darle tiempo de girar. |
| **Kilo** (repartidor en patines) | Drones de entrega que pegan por él; cuanto más se mueve, más rápido va. | ¿Rompo los drones primero o voy por él? | Romper los drones (que se pueden golpear) y arrinconarlo contra una pared. |
| **Parche** (técnico de boxes) | Pone torretas en el piso (se ven) y se repara cerca de ellas. | ¿Dónde pongo la torreta? El rival elige pelear lejos. | Sacarlo de su zona o romper las torretas. |
| **Vector** (esgrimista con hoja de luz) | Esquivar justo cuando le pegan le carga un golpe enorme. | Espera tu golpe para esquivarlo. | **Amagar:** no tirar el golpe fuerte hasta que él esquive primero. |
| **Viral** (influencer) | Una "pose" a la vista (quieto medio segundo) que, si nadie la interrumpe, le da un refuerzo grande. Crece con las apuestas a su favor. | ¿Poso ahora, que el rival tiene el golpe en enfriamiento? | Guardar algo para cortar la pose. |
| **Glitch** (un error de la transmisión) | Copia por un rato el último módulo que lo golpeó. | ¿Qué le conviene que yo le tire? | Pegarle primero con el módulo más flojo y guardar el bueno. |

Los tres propios que ya teníamos (el Danzante Cinético, el Arcanista y el Sabio del Vacío) pasan al estilo nuevo con el
mismo filtro: se les busca su lectura y su respuesta.

## 5. Los duelos de hoy: qué mirar (sin cambiar la estructura)

- **Los ajustes de duelo** (−60% de daño y de curación entre héroes, control a la mitad) se pusieron porque el que
  aturdía primero ganaba. Con avisos y esquives, puede que sobren: se revisan cuando entren los competidores nuevos.
- **Qué medir en cada competidor nuevo** (con el banco de partidas y el piloto):
  - cuánto duran los duelos (meta: 15 a 30 s);
  - cuántas veces cambia quién va ganando;
  - qué parte de los golpes fuertes esquiva el piloto con reflejos humanos (si nadie esquiva nada, no hay habilidad;
    si se esquiva todo, no hay amenaza);
  - que ningún cruce sea 80 a 20.
- **El piloto tiene que esquivar los avisos** (en la Torre ya lo hace, con reflejos humanos que a veces fallan).

## 6. Decisiones

1. **Cómo se cubren los competidores:** (a) **cada uno trae su propia defensa en el kit (el esquive con carga de
   Vector, la pose de Viral, la torreta de Parche), y todos tienen el esquive con Espacio (recomendada: más identidad)**;
   (b) una parada común para todos (clic derecho), como la de la Torre, además del esquive; (c) solo el esquive.
2. **Siguen abiertas de antes:** los atributos (Blindaje, Reflejos y Procesador, recomendados), los competidores de
   arranque (las 8 semillas, recomendadas) y quedarnos con el motor (recomendado).

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
