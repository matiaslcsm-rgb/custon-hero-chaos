# Modo roguelike: Tower Chaos

Documento de diseño del modo roguelike. Estado: **fase 1 hecha** (2026-10-03; en el menú se elige el modo: **Custom Hero Chaos** o **Tower Chaos**; código en
`js/tower.js`). Las demás fases están por hacer.
Las decisiones marcadas ❓ están abiertas.

## 1. Visión (idea del usuario)

Un ARPG roguelike tipo Diablo dentro del mismo juego. Elegís un héroe y explorás un **mapa procedural** por niveles,
con biomas que te ponen trabas, creeps sueltos, cofres custodiados y un jefe que cuida la escalera al nivel siguiente.
El corazón del modo son los **ítems**: armas y armaduras con calidades al estilo Diablo, efectos propios (ej: el martillo
Mjölnir que tira rayos encadenados) y que **suben de nivel con el uso**, eligiendo qué mejorar. La gracia es que cada
partida termine en combinaciones únicas y raras, armadas con lo que te tocó o con lo que fuiste buscando.
Al morir no se pierde todo: **tu cadáver y tus cosas quedan en el mapa** y pueden terminar en manos de los monstruos.

## 1 bis. Decisiones del 2026-10-03 (tarde): héroes convertidos en ítems

- **Sin elección de héroe en Tower Chaos**: arrancás como un **aventurero sin clase**, con stats parejos y sin innato.
  Tu "clase" sale de lo que encontrás y de cómo repartís los puntos de stats.
- **Los 11 héroes se convierten en ítems**: cada habilidad (44) y cada innato (11) pasa a ser una **pieza de equipo**
  (arma, casco, armadura, guantes, botas, anillo, amuleto) que trae esa habilidad y sus stats. Ej: un rifle con
  Disparo Potente, unas botas con Salto Sangriento, un amuleto con Puntería Perfecta.
- **Sin bonos de set**: juntar piezas del mismo héroe no da nada extra. Los bonos de set encasillan en arquetipos;
  lo que se busca son **sinergias**: mezclar libremente (el arma del Sniper con la armadura de Axe y las botas del Danzante).
- **Las habilidades de cada pieza crecen con el uso**: lanzarla o que se active le suma experiencia y sube de nivel
  (la mecánica de ítems que suben de nivel de §2.4).
- **Vos elegís cómo crece** (2026-10-03): cada vez que una pieza sube de nivel aparece una elección de cómo mejora su
  habilidad: más daño, más área, más duración del efecto, más probabilidad de que salte la pasiva, menos enfriamiento,
  menos maná… El jugador va **forjando** su arma según lo que elige. **Las armas crecen rápido**; las armaduras y los
  demás objetos, más lento.
- **Más adelante — crafteo**: desarmar piezas y combinar habilidades de armas, con un sistema de **materiales**.

## 2. Reglas propuestas

### 2.1 Mapa
- **Procedural**: cada nivel es un mapa más grande que la pantalla (propuesta: 60×40 casillas) y la cámara sigue al héroe.
  Hay un **minimapa** que se va descubriendo.
- **Una torre de 10 niveles**: se avanza **subiendo**. Cada nivel se genera **al azar** (distinto en cada run). En cada
  nivel hay que encontrar la **escalera** que sube al siguiente; está detrás de una **puerta** que custodia el **jefe del
  nivel**: hay que matarlo para pasar.
- **Final**: en el nivel 10 espera el **jefe final**. Si lo vencés, tu héroe queda con su equipo en un **salón de la fama**
  (más adelante se puede sumar un modo infinito).
- **Biomas**: cada nivel (o cada zona de un nivel) tiene un bioma con su **perjuicio** y sus creeps típicos. Ejemplos:

  | Bioma | Perjuicio | Creeps típicos |
  |---|---|---|
  | Bosque | Niebla: −20% de rango de ataque | Arqueros, Exploradores, Ladrones |
  | Pantano | Barro: −15% de velocidad de movimiento | Enjambre, Sanadores, Chamanes |
  | Tundra | Frío: −15% de velocidad de ataque | Escarchadores, Acorazados |
  | Volcán | Calor: −1 de vida por segundo fuera del combate | Kamikazes, Brutos |
  | Cripta | Mortaja: −30% de curación | Espectros, Brujos |

- **Contenido de un nivel**: entrada, escalera con su puerta y su jefe, grupos de creeps sueltos (algunos patrullan),
  **cofres** (siempre custodiados por un creep fuerte o varios), **élites** (héroes de la IA) y, si moriste ahí, tu cadáver.

### 2.2 Creeps
- **Nivel con stats fijos**: cada creep tiene un nivel (1, 2, 3…) y una tabla de stats por nivel, en vez del crecimiento
  por ronda del modo normal. Así el balance se controla: un creep de nivel 5 siempre pega lo mismo.
- Dan **experiencia** según su nivel. Se mantienen sus mecánicas actuales (el Sanador cura, el Aturdidor aturde…).
- Tienen **radio de alerta**: están quietos o patrullando hasta que te ven.

### 2.3 Héroe
- *(Cambió: ver §1 bis — ahora arrancás como aventurero sin clase.)*
- Arranca **solo con su héroe y su innato**, sin habilidades. Sube de nivel con la experiencia (atributos, como ahora).
- **Sin draft de habilidades en este modo** (por ahora): las habilidades vienen de los **ítems** (un arma única puede
  traer su propio efecto o una activa con tecla).
- **Stats con niveles propios** (a desarrollar más adelante): cada stat del personaje (Fuerza, Agilidad, Inteligencia,
  vida, armadura…) se sube **por separado**, con un sistema de niveles distinto al de las armas y los ítems.
- **Botín de stats y habilidades** (a desarrollar más adelante): los jefes y los creeps pueden soltar stats o habilidades.
- **Stats base**: los del héroe al empezar. Lo que ganás encima se puede perder al morir (ver §2.5), pero nunca bajás
  del punto base (salvo maldiciones, más adelante).

### 2.4 Ítems (el corazón del modo)
- **Equipo**: arma, segunda mano (escudo u otra arma), casco, armadura, guantes, botas, 2 anillos y amuleto.
- **Inventario en grilla como Diablo 1**: cada ítem ocupa un tamaño (anillo 1×1, espada 1×3, armadura 2×3…).
- **Calidades** (como Diablo):

  | Calidad | Color | Qué trae |
  |---|---|---|
  | Normal | Blanco | Solo los stats de la base |
  | Mágico | Azul | 1-2 afijos (prefijo y/o sufijo: «Martillo **Feroz** **del Oso**») |
  | Raro | Amarillo | 3-4 afijos, nombre al azar |
  | Único | Dorado | Efecto propio fijo, nombre propio (ej: **Mjölnir**) |

- **Suben de nivel con el uso**: el arma con los golpes y las bajas, la armadura con el daño que aguanta. Cada nivel te
  deja **elegir una mejora** de su lista. Ejemplo, **Mjölnir** (único):
  - Efecto: cada golpe tiene una chance de lanzar un **rayo que salta** entre enemigos cercanos.
  - Mejoras para elegir al subir de nivel: más área del golpe · más velocidad de ataque · más saltos del rayo ·
    más daño del rayo · más probabilidad de rayo · rayo que aturde (efecto nuevo).
- **Cofres**: 1 ítem, siempre custodiado. A más nivel, más chance de mágicos, raros y únicos.

### 2.5 Muerte
- Tu **cadáver queda donde moriste**. El creep o jefe que te mató se convierte en una **criatura nueva** (ej: «Bruto
  Portador del Mjölnir»): se equipa parte de tus ítems y se hace más fuerte.
- El resto de tus ítems puede **repartirse por el mapa**. Cada ítem tiene chance de **perder calidad**, **romperse** o
  **equiparse en otro monstruo** del mismo nivel.
- Lo roguelike es eso: tu partida se va inventando con lo que perdés y lo que recuperás.
- **Renacer**: reaparecés en el **círculo de piedra** de la base de la torre. **Cada muerte te obliga a subir la torre
  de nuevo** (decidido por el usuario 2026-10-03).
- **Stats al morir**: perdés **la mitad de lo que ganaste por encima de la base**, y nunca bajás de la base.
  Ej: Fuerza base 20, llegaste a 40 → al morir quedás en 30. (Maldiciones que bajen de la base: más adelante.)

### 2.6 Héroes rivales
- Aparecen como **élites** en el mapa: héroes de la IA con ítems, que pelean como en los duelos.

## 3. Qué se reutiliza y qué hay que construir

| Ya existe (se reutiliza) | Hay que construir |
|---|---|
| Combate, daño, críticos, robo de vida, proyectiles | Mapa grande con cámara que sigue al héroe y minimapa |
| Efectos y eventos (`onHit`, `onKill`…): ideales para los efectos de los ítems | Generador procedural de niveles (salas, pasillos, cuevas) |
| 18 tipos de creeps con mecánica, 8 jefes, héroes de la IA | Biomas con perjuicio y tabla de creeps por bioma |
| Atributos y niveles del héroe, innatos | Creeps con nivel, stats fijos, radio de alerta y patrulla |
| Cuerpos físicos, pixel art, efectos visuales, sonidos | Sistema de ítems nuevo: bases, calidades, afijos, únicos |
| Ítems con `hooks` (el Cetro del Eclipse ya hace algo parecido a un efecto propio) | Ítems que suben de nivel y su lista de mejoras |
| | Inventario en grilla con arrastrar y soltar, y ranuras de equipo |
| | Cofres custodiados, escalera, puerta y jefe del nivel |
| | Muerte: cadáver, criatura portadora, reparto y desgaste de ítems |
| | Guardar la partida (la run dura más que una sesión) y menú del modo |

## 4. Orden propuesto (de a una fase, jugable al final de cada una)

1. ✅ **Un nivel explorable**: mapa procedural con cámara y minimapa, creeps con nivel sueltos, escalera con puerta y jefe.
   El héroe solo con su innato y su ataque básico, subiendo de nivel.
   - Hecho: niveles de 60×40 (salas unidas por pasillos de 2 casillas), cámara que sigue al héroe, niebla (radio de visión
     7) y minimapa; creeps con nivel (vida y daño ×1+0,4 por nivel) quietos hasta que te ven (radio 6) y que te persiguen
     rodeando paredes; guardián (uno de los 8 jefes de ronda) en la sala más lejana, que cierra la escalera; niveles que
     quedan iguales; muerte: mitad de los atributos ganados, cadáver marcado y renacer en el círculo de piedra del nivel 1.
     Piloto automático (P) también en la Torre.
   - Ajustes pedidos al probarla: el héroe camina en **diagonal** (camino de 8 direcciones sin cortar esquinas; los creeps
     siguen en cruz) y **40% más rápido** que en una arena (`TOWER.heroSpeed`). En los dos modos, el dibujo ahora se
     **desliza a velocidad constante** entre casillas (antes llegaba y frenaba: se notaba casilla por casilla).
   - Segunda tanda (pedido del usuario): niveles de **90×60**; **visión** como stat (base 6 casillas) con **paredes que
     tapan** la vista (campo de visión propio, sin librerías); **stats con puntos** (5 por nivel: Fuerza, Agilidad,
     Inteligencia, Vitalidad, Visión; ventana con la tecla C; al morir se pierde la mitad de lo puesto); **creeps
     inteligentes** (avisan a la manada, te rodean, los de lejos y el apoyo mantienen distancia, huyen con poca vida);
     **animaciones de ataque** para héroes y creeps en los dos modos (preparación, golpe con tajo, disparo con estela,
     hechizo con brillo) y **rasgos visuales** por creep (aura del Tamborilero, pulso del Sanador, Espectro translúcido…).
   - Librerías evaluadas: rot.js (BSD), Yuka (MIT), packs de arte 0x72/Kenney (CC0). Por ahora no se usan: el campo de
     visión y la IA son poco código y el usuario prefirió mantener el pixel art propio.
   - Medido (22 runs simuladas de 25 min, piloto automático, solo ataque básico): la mayoría llega a los pisos 3-5 y muere
     varias veces; el Vampiro llega al 7-10 (se cura con su innato); Bruja y Alquimista casi no pasan del 1. Sin ítems
     es lo esperable: el balance de la Torre se hace en la fase 2.
2. ✅ **Ítems Diablo básicos**: ranuras de equipo, inventario en grilla, calidades y afijos, cofres custodiados.
   Hecho junto con la fase 3 (código: `js/towerItems.js` y `js/towerUI.js`):
   - **Aventurero sin clase** (sin elegir héroe). El **arma** define el ataque básico: daño, velocidad, alcance,
     proyectil y atributo principal (el del héroe de origen). Sin arma, puños.
   - **Golpe Certero** (propia del Aventurero, siempre en la E): 150% del daño físico al enemigo más cercano en el
     alcance, 7s / 15 de maná. Sube sola con el nivel del héroe (niveles 1, 9, 17 y 25: hasta 240% y 5,5s). Existe para
     que arranques con algo que lanzar y los innatos "al lanzar" (Arcanista, Sabio del Vacío, Zeus) sirvan desde el
     principio. Deja 5 teclas (R T F Q V) para las activas del equipo.
   - **Hechizo inicial**: al empezar la run recibís, ya equipada, una pieza normal con una activa al azar (ni
     definitiva ni de movilidad). Cada run arranca distinta.
   - **55 piezas**: cada habilidad (44) y cada innato (11) de los héroes. La definitiva va en la armadura, el innato en
     el amuleto, la de movilidad en las botas, la primera que pega en el arma y el resto en casco o guantes. Anillos con
     stats. Calidades Normal / Mágico (1-2 afijos) / Raro (3-4 afijos), con nombre al estilo Diablo.
   - **8 ranuras de equipo** e **inventario en grilla 10×4** con tamaños (arma 1×3, armadura 2×3, casco/guantes/botas
     2×2, anillo y amuleto 1×1). Tecla **I**: clic para mover, clic derecho para equipar/desequipar. La partida espera.
   - **Botín**: 3 cofres por nivel custodiados (un creep fuerte o tres), 7% de que un creep suelte una pieza y el
     guardián suelta 2 (una rara). Se levantan al pisarlas.
   - Hasta **6 habilidades activas** con el equipo (teclas E R T F Q V).
3. ✅ **Ítems vivos**: suben de nivel con el uso y mejoras para elegir.
   - Experiencia: el arma con cada golpe y baja; armadura, casco, guantes y botas con el daño que aguantan; anillos y
     amuleto con las bajas; todas cuando se lanza su habilidad. Las armas suben rápido; el resto, 2,2 veces más lento.
   - **Forja**: al subir de nivel, ventana con 3 opciones (la partida espera): +15% / −12% a un valor de su habilidad
     (daño, área, duración, aturdimiento, probabilidad, enfriamiento, maná… ±1 en saltos, cargas o golpes necesarios),
     subir el nivel de la habilidad, o +4 daño del arma / +30 vida de la pieza. Las mejoras quedan en la pieza.
   - Medido (10 runs de 25 min con piloto automático): llegan a los pisos 4-9 con 4-6 piezas y el arma en nivel 9-13;
     0-5 muertes. Se corrigió que los saltos (Parpadeo, Salto Sangriento, Paso del Vacío…) metieran al héroe en paredes.
   - Pendiente de balance: el héroe llega al nivel 30 (tope) hacia el piso 8.
3. **Ítems vivos**: suben de nivel con el uso, mejoras para elegir y los primeros únicos (Mjölnir y 4-5 más).
4. **Biomas y varios niveles**: perjuicios, creeps por bioma, dificultad por nivel.
5. **Muerte con consecuencias**: cadáver, criatura portadora, reparto y desgaste de ítems.
6. **Élites y más contenido**: héroes de la IA como élites, más únicos, eventos.

## 4 bis. Estética "tinta y pergamino" (en curso)
Pedido del usuario con referencias de ilustraciones de caballeros en tinta (líneas negras gruesas, colores planos
apagados, fondo crema, rayado; no se usan esas imágenes, solo el estilo). Decidido: dirección de arte + personajes
vectoriales, primero en Tower Chaos. Código: `js/inkart.js`; hoja de muestra: `docs/ink-preview.html`; captura del juego:
`index.html?demo=tower`.
- Paso 1 hecho: piso de pergamino, paredes de piedra en tinta con rayado, niebla sepia, viñeta de papel viejo, contorno de
  tinta y colores apagados en los sprites que todavía son pixel art, ventanas de la Torre color pergamino.
- Paso 2 (prototipo): figuras vectoriales por silueta — caballero encapuchado (aventurero), soldado, arquero, mago,
  bruto, espectro y médico de la peste (Sanador); los guardianes, más grandes.
- Segunda tanda con más referencias del usuario: proporciones más altas y esbeltas (lienzo 64×96), telas con dibujo
  (rombos, zigzag, rayas, puntitos y guardas en los dobladillos), cintas al viento, sombrero de ala ancha, máscara de
  pico y espadas flotando. **El aventurero se ve según su equipo**: la capa toma el color del héroe de su armadura,
  la capucha el de su casco, la guarda el de sus botas y el arma tiene la forma de la suya (espada, hacha, báculo,
  rifle, dagas…).
- **Upgrade gráfico grande** (pedido del usuario, solo Tower Chaos por ahora):
  - **Animación de los cuerpos**: cada figura tiene 8 cuadros de caminata (piernas que alternan, capa y túnica que
    ondean con retraso, brazos y arma que acompañan, rebote del paso, cintas que flamean) y 4 de respiración quieta.
    Se dibujan una vez y se reutilizan (liviano).
  - **Íconos en tinta** (`inkIcon`): 13 formas de piezas (espada, hacha, rifle/lanza, báculo, cristal, orbe, dagas,
    casco, coraza, guantes, botas, amuleto, anillo) y 10 de habilidades según lo que hacen (físico, mágico, control,
    curación, movilidad, área, robo de vida, mejora…). En el inventario, el botín, la barra del héroe y el equipo.
  - **Retrato dibujado**: el busto del aventurero según su equipo.
  - **Interfaz en pergamino**: columnas, barra del héroe (barras de vida y maná rayadas), ranuras de habilidad con
    ícono, botones bordó, registro, contador, ventanas; tipografía con serifa; colores de calidad oscuros para leerse
    sobre el papel; barras de vida de las unidades en tinta, sin brillos; menhires de tinta en el círculo de piedra.
  - En la Torre las habilidades no se suben con puntos (sin botones [+]): crecen forjando.

## 5. Decisiones tomadas (2026-10-03)
- Avance: **subir una torre**; cada nivel es aleatorio. Final en el **nivel 10**, con salón de la fama.
- Al morir: perdés la **mitad de lo ganado** por encima de la base y renacés en el **círculo de piedra de la base de la
  torre**: hay que subirla de nuevo.
- Cada stat se sube por separado (sistema propio) y los jefes y creeps pueden soltar stats o habilidades: **se diseña después**.
- Héroes rivales: como **élites**.
- **Los niveles quedan iguales durante la run**: se generan al llegar por primera vez y, si morís y volvés a subir,
  están como los dejaste (con tu cadáver y la criatura que se quedó con tus cosas).
- Sin draft de habilidades en este modo por ahora: las habilidades vienen de los ítems.

## 6. Preguntas abiertas ❓
- Cómo funciona el sistema de niveles de cada stat (¿sube con el uso, con puntos, con botín?).
- Tamaño de la grilla del inventario y si el peso o el tamaño limitan cuánto cargás.
- Cuántos únicos para arrancar y cuáles (Mjölnir es el primero).
