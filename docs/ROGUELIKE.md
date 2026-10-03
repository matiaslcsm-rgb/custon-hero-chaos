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
   - Medido (22 runs simuladas de 25 min, piloto automático, solo ataque básico): la mayoría llega a los pisos 3-5 y muere
     varias veces; el Vampiro llega al 7-10 (se cura con su innato); Bruja y Alquimista casi no pasan del 1. Sin ítems
     es lo esperable: el balance de la Torre se hace en la fase 2.
2. **Ítems Diablo básicos**: ranuras de equipo, inventario en grilla, calidades y afijos, cofres custodiados.
3. **Ítems vivos**: suben de nivel con el uso, mejoras para elegir y los primeros únicos (Mjölnir y 4-5 más).
4. **Biomas y varios niveles**: perjuicios, creeps por bioma, dificultad por nivel.
5. **Muerte con consecuencias**: cadáver, criatura portadora, reparto y desgaste de ítems.
6. **Élites y más contenido**: héroes de la IA como élites, más únicos, eventos.

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
