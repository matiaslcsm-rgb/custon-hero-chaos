# Custom Hero: todas las mecánicas, para armar el juego propio desde cero

Pedido del usuario el 2026-10-18: juntar todas las mecánicas del Custom Hero en un solo documento y, a partir de ahí,
crear un juego **totalmente nuestro**, sin los héroes de Dota.

La idea de este documento es separar dos cosas:
- **El esqueleto:** las reglas. Cómo es una ronda, cómo se draftea, cómo funcionan los duelos, las apuestas y la
  economía. Las reglas de un juego no tienen dueño: muchas vienen del género (auto battlers, el *Custom Hero Chaos*
  original) y se pueden quedar, con nuestra vuelta.
- **El contenido:** los héroes, sus habilidades, los ítems, los creeps, los jefes, los nombres y el arte. Eso es lo que
  se rehace desde cero.

Cada mecánica lleva una marca de dónde viene:
- 🟢 **propia:** la inventamos acá.
- 🔵 **del género:** está en el *Custom Hero Chaos* original o en los auto battlers. Se puede quedar.
- 🟠 **estilo Dota:** es una regla (no tiene dueño), pero la tomamos tal cual de Dota 2. Para que el juego se sienta
  nuestro, conviene darle una vuelta propia.
- 🔴 **copiada de Dota:** contenido de Dota (nombres, kits). Hay que reemplazarlo.

Los números son los del código al 2026-10-18. Los detalles de cada regla y cómo se midieron están en `DISEÑO.md`;
cómo es el juego original, en `docs/REFERENCIA-CHC.md`.

---

## 1. La partida en una mirada

- **8 héroes, todos contra todos:** vos y 7 rivales que maneja la IA. Gana el último que queda en pie. 🔵
- **Cada uno pelea en su propia arena**, todas al mismo tiempo. 🔵
- **Una ronda:** draft (si toca) → preparación (tienda, subir habilidades) → previa de apuestas (desde la ronda 5) →
  combate (los 6 que no pelean el duelo hacen su oleada de creeps; los 2 duelistas, su duelo) → jefe de ronda
  (cada 5 rondas) → resumen y ranking. 🔵 con el orden y los tiempos propios 🟢
- **Rondas 1 a 4:** solo draft y creeps, para armar el kit sin perder. Duelos desde la 5. 🔵
- **Muerte súbita desde la ronda 15:** el daño recibido sube +50% por ronda. Las partidas duran **20-26 rondas, 16 a
  21 minutos** (el original va a la ronda 55-65). 🟢
- **Tope de seguridad:** ronda 60 (si se llega, gana el primero del ranking). 🟢

## 2. El héroe

| Mecánica | Cómo funciona hoy | Origen |
|---|---|---|
| **Atributos** | Fuerza (+5 de vida y +0,05 de regeneración por punto), Agilidad (+1% vel. de ataque, +1% de movimiento hasta 40, +0,1% crítico, +0,08 armadura), Inteligencia (+4 de maná, +0,05 de maná/s, +0,1% de amplificación de hechizos, +0,1% de resistencia mágica). El principal suma +0,8 de daño por punto; los de Inteligencia, +25% de amplificación. Cada héroe tiene base y ganancia por nivel. | 🟠 el trío Fuerza/Agilidad/Inteligencia y su reparto son de Dota |
| **Innato** | Una mecánica fija de cada héroe que no se draftea y define su identidad. | 🟢 |
| **Habilidades naturales** | 4 por héroe: 3 normales (al menos 1 pasiva) y 1 definitiva. | 🟠 el formato 3 + 1 es el de Dota |
| **Niveles** | Gana experiencia (creeps 6-28, jefe 120, oleada 40 + 20 por ronda). Siguiente nivel: 100 + 40 × (nivel − 1). Tope 30. 1 punto de habilidad por nivel. | 🟠 |
| **Niveles de habilidad** | Normales: 4 niveles. Definitiva: 3, uno cada 6 niveles del héroe (6, 12, 18). Llegan en nivel 0; los puntos que no se pueden gastar se guardan. | 🟠 igual que Dota |
| **Kit al máximo** | Cada punto sobrante da +1 a los tres atributos: el héroe siempre crece. | 🟢 |
| **Crecimiento y Ascenso** | El innato da un escalado chico por bajas y duelos; la definitiva, uno fuerte con una condición (ej.: "si mata al objetivo, +3 de daño para siempre"). Si drafteás la definitiva de otro, te llevás su escalado. | 🟢 |
| **Daño** | Físico (lo baja la armadura, 4% por punto, tope 80%), mágico (lo baja la resistencia mágica, tope 75%; lo sube la amplificación) y puro (nada lo baja). El esquive solo evita ataques básicos. | 🟠 los tres tipos y el esquive son de Dota; los números, nuestros |
| **Vida y maná** | Se recuperan del todo al volver de la sala de descanso. | 🟢 |

## 3. El draft de habilidades

| Mecánica | Cómo funciona hoy | Origen |
|---|---|---|
| **Kit mezclado** | Armás tu kit con habilidades de cualquier héroe. Se puede terminar con 2 definitivas o ninguna. | 🔵 el corazón del género |
| **Cuándo** | 1 por ronda en las rondas 1 a 4, y una quinta en la ronda 9 (desde el 2026-10-18). | 🔵 (el original: 1, 1, 3, 6 y 9) |
| **Opciones** | 3 por elección: 1 garantizada de tu héroe (si te queda alguna) y 2 del resto. Nunca algo que ya tenés. | 🟢 los números |
| **Teclas** | Las activas toman la primera libre entre E, R, T, F y Q. Las pasivas no usan tecla, pero cuentan como elección. | 🟢 |
| **Baneo** | Antes de empezar baneás 1 habilidad: no le sale a nadie (desde el 2026-10-18). | 🔵 |
| **Rehacer el kit** | Fragmento del Destino (te saca una habilidad al azar y elegís entre 4) y Libro del Destino (elegís cuál cambiar, entre 6). Devuelven los puntos invertidos. Se usan fuera del combate. Un Fragmento se puede vender (75 de oro). | 🔵 la idea (fichas del original); 🟢 nombres y reglas |

## 4. Las sinergias (el motor que hace que todo combine solo)

- **Etiquetas:** cada habilidad declara qué es (físico, mágico, al golpear, al matar, crítico, robo de vida, control,
  movilidad, área, daño en el tiempo, mejora, invocación…). Ítems y creeps las leen. 🟢
- **Eventos:** el combate avisa "golpeó", "criteó", "mató", "recibió daño", "lanzó", "se movió", "cada segundo", y las
  pasivas e ítems se enganchan ahí. 🟢
- **Efectos genéricos:** toda mejora o perjuicio tiene la misma forma (duración, cambios de stats, reacciones). 🟢
- **Proyectiles de habilidad:** algunas habilidades viajan al punto que apuntaste y pueden fallar. 🟢

## 5. Los ítems

| Mecánica | Cómo funciona hoy | Origen |
|---|---|---|
| **Básicos** | Mejoran un solo stat (ej.: +10 de daño por 100 de oro). Se pueden repetir. 16 hoy. | 🟠 |
| **Compuestos con receta** | Se arman con básicos más un precio de receta; pagás solo lo que falta. Uno de cada uno. 17 hoy. | 🟠 el sistema de recetas es el de Dota |
| **Inventario** | 6 espacios; vender devuelve el 50%. | 🟠 |
| **Inmediatos** | No ocupan espacio: Fragmento del Destino, Libros de Talento (+5 a un atributo; 500 de oro y +250 cada uno) e Injusticia de los Codiciosos (compra una vida estando Condenado; 400 de oro, el doble cada vez). | 🟢 |
| **Objetos neutrales** | Premio de los jefes de ronda: elegís 1 de 3 del escalón, en un espacio aparte, uno a la vez. 20 hoy (5 por escalón). | 🟠 el nombre y la idea son de Dota |
| **Contras** | Cada ítem dice qué contrarresta (un creep, una mecánica). La tienda avisa qué viene en la próxima oleada. | 🟢 |
| **Guía por héroe** | Ítems sugeridos de inicio, núcleo y final. | 🟢 |

## 6. Los creeps y las oleadas

- **17 tipos, cada uno con su mecánica y su contra** (Chusma, Grunt, Arquero, Explorador, Bruto, Chamán, Sanador,
  Espectro, Acorazado, Enjambre, Kamikaze, Aturdidor, Ladrón, Ancla, Brujo, Escarchador, Ballestero, Tamborilero). 🟢
- **Oleadas con tema** (Avanzada, Enjambre, Hechiceros, Muralla, Emboscada, Asedio…), con un jefe de oleada que
  potencia a los cercanos. 🟢
- **Crecen ×1,10 por ronda.** 🟢
- **Enfurecimiento:** pasados 30 s, los creeps ganan +5% de daño y vel. de ataque por segundo. 🟢
- **Presión al líder:** los creeps de cada arena se ajustan entre −15% y +25% según cuánto poder tenés comparado con el
  promedio. 🟢
- **Objetivos prioritarios:** el ataque automático va primero por los Sanadores y otros marcados. 🟢
- **Cuerpos:** nadie se atraviesa; entrar a una casilla ocupada tarda más según el tamaño. 🟢

## 7. Vidas, muerte y eliminación

- **2 vidas.** Al morir: 3 s afuera, los creeps pierden el rastro, y revivís con **Voluntad de Titán** (5 s sin recibir
  daño, +100% de vel. de ataque y habilidades sin costo). 🟢
- **Sin vidas, contra creeps:** eliminado; podés seguir mirando. 🔵
- **Maldición (Condenado), solo por duelos:** con 3 héroes en juego, cada duelo perdido suma +10% de daño recibido; con 2,
  perder el duelo cuesta una vida. 🟢 (el original castiga perder seguido; el nuestro es más suave)
- **Injusticia de los Codiciosos:** comprar una vida estando Condenado. 🟢

## 8. Duelos y apuestas

| Mecánica | Cómo funciona hoy | Origen |
|---|---|---|
| **Un duelo por ronda** desde la 5 | Pelean los que menos duelos pelearon, sin repetir la pareja anterior, mientras los demás hacen su oleada. | 🔵 la idea; 🟢 la regla |
| **Cómo se gana** | Matando al otro; a los 45 s, el de más % de vida. +3 puntos al ganador. | 🟢 |
| **Ajustes de duelo** | Entre héroes: −60% de daño, −60% de curación y el control dura la mitad. Enfriamientos reiniciados al empezar. | 🟢 |
| **Apuestas** | Previa de 15 s. Apuestan todos los que no pelean (la IA también), hasta la mitad de su oro. **Pozo compartido:** los que aciertan se reparten lo apostado al perdedor según lo que pusieron (la sorpresa paga más). El ganador del duelo cobra el 25% de lo que le apostaron. | 🔵 apostar a duelos ajenos; 🟢 el pozo y el respaldo |

## 9. Jefes de ronda

- **Cada 5 rondas**, después de los duelos, cada héroe pelea en su arena contra el mismo jefe (sorteado entre 8: Gólem
  Ancestral, Reina de la Colmena, Dragón de Escarcha, Señor del Abismo, Hidra, Liche, Titán de Sangre, Espectro
  Errante), cada uno con su mecánica que escala. 🟢 (el original tiene a Roshan cada ~10 rondas 🔵)
- **Como una oleada:** morir cuesta vidas; a los 60 s se enfurece. 🟢
- **Premio:** oro (100/150/200/250 según la ronda), experiencia y 1 de 3 objetos neutrales; los 3 más rápidos cobran
  +50/30/15%. Desde la ronda 20 los jefes crecen menos (+4% por ronda). 🟢

## 10. Economía

- **Oro por bajas**, con **Cacería Veloz** (hasta ×3 si limpiás rápido). 🔵 la idea; 🟢 el número
- **Interés:** +1 por cada 10 de oro que tengas al terminar la ronda, tope 25. 🔵 (auto battlers)
- **Racha:** ganar o perder rondas seguidas paga +5/+10/+15. 🔵 (auto battlers)
- **Apuestas, jefes y ventas.**
- **Resumen de la ronda:** una tarjeta con el oro y de dónde salió, la vida perdida y tu puesto. 🟢

## 11. Ranking y ayudas para el que va abajo

- **Puntos:** +3 por duelo ganado, +1 por oleada sin morir. El oro desempata. 🟢
- **Cada ronda:** la mitad de abajo recibe un Fragmento del Destino; el último, además, un Libro. 🔵 la idea; 🟢 la regla

## 12. Ritmo y tiempos

| Fase | Tiempo | Si se acaba |
|---|---|---|
| Elegir héroe | 30 s | Uno al azar de tus opciones |
| Draft | 20 s | Una opción al azar |
| Preparación | 30 s | Arranca el combate |
| Previa de apuestas | 15 s | Sin apuesta |
| Oleada | 30 s | Los creeps se enfurecen |
| Duelo | 45 s | Gana el de más % de vida |

- Los enfriamientos son 25% más cortos que los escritos en cada habilidad y siguen corriendo en la sala de descanso;
  se reinician al volver a pelear. 🟢

## 13. Controles e interfaz

- **Mover:** W A S D, o clic derecho para caminar hasta un punto. **Clic izquierdo:** marcar un objetivo.
- **Habilidades:** E R T F Q. Las apuntadas salen hacia el cursor. **H:** habilidades automáticas (vos solo te movés).
- **P:** piloto automático. **B:** tienda. **M:** mapa grande. **Esc:** pausa.
- **Elegir héroe:** 3 opciones tuyas al azar, uno al azar, o cualquiera arrancando sin oro. 🟢
- **Pantalla de fin de partida y perfil** (partidas, victorias, top 3, mejor puesto por héroe). 🟢
- **Códices:** héroes, creeps y jefes, ítems. Tutorial de 9 páginas. 🟢

## 14. La IA

- Juega con las mismas reglas que vos: draftea (prefiere lo natural de su héroe), sube habilidades, compra según su
  guía, apuesta (casi siempre al favorito, 10-35% de su oro), usa los objetos del destino y pelea (los de distancia
  retroceden si se les acercan; las de área, con 2 o más enemigos cerca). 🟢
- La misma IA es el **piloto automático**, y la que usamos para medir el balance con el **banco de partidas**. 🟢

---

## Qué es de Dota y hay que reemplazar

**Contenido copiado (🔴), lo primero:**

| Qué | Por qué |
|---|---|
| **Zeus** | Nombre y kit de Dota (Rayo Arco, Rayo Relámpago, Nimbo, Campo Estático, Ira del Dios del Trueno). |
| **Nigromante** | Su kit es el de Necrophos (Pulso de Muerte, Aura que Detiene el Corazón, Manto Fantasma, Guadaña del Segador, Sadista). |
| **Axe** | Nombre de Dota y kit muy parecido (Llamado Provocador, Contraataque, Furia). |
| **Sniper** | Nombre de Dota y su definitiva (Disparo Mortal) es la de Dota. |
| **Alquimista** | Su kit es el del Alchemist de Dota (Pulverización Ácida, Mezcla Inestable, Furia Química, oro extra). |
| **Kaya** | Nombre de un ítem de Dota. |
| **Ojo de Invierno** | Es el Eye of Skadi de Dota (en el código, `SKADI`). |
| **"Objetos neutrales"** | El nombre del sistema es de Dota. |

**Inspirados de lejos** (conviene revisarlos, aunque no son copias): Asesino, Guerrero Vampiro y Bruja del Hielo.
**Propios:** el Danzante Cinético (diseño tuyo), el Arcanista y el Sabio del Vacío.

**Reglas estilo Dota (🟠)**, para darles nuestra vuelta si queremos un juego con identidad: el trío de atributos y sus
fórmulas, el formato 3 habilidades + 1 definitiva, los niveles de habilidad (4 y 3 con la definitiva a los 6/12/18),
los tres tipos de daño con el esquive, y los ítems con recetas en 6 espacios.

**El nombre:** "Custom Hero" es casi el nombre del mod. Para un juego propio conviene uno nuestro.

## Ojo con la Torre

Infinite Tower (en pausa) usa las habilidades de los héroes de Custom Hero en su equipo. Si sacamos esos héroes, la
Torre pierde ese botín. Hay que decidir qué pasa con ella cuando se retome (por ejemplo: que tome las habilidades del
roster nuevo).

---

## Cómo armar el juego propio: propuesta

**Recomendación: rehacer todo el contenido y la identidad, y quedarnos con el motor.** El motor es el código que hace
funcionar las rondas, el draft, las sinergias, los duelos, las apuestas, la IA, el banco de partidas y las 289 pruebas.
No tiene nada de Dota adentro, y rehacerlo desde cero llevaría meses sin que se note en el juego. Lo que hace que hoy
"parezca Dota" es el contenido (héroes, habilidades, ítems, nombres), y eso sí se hace todo nuevo.

Pasos, de a uno y siempre con el juego jugable:
1. **Identidad:** nombre del juego y mundo (de dónde salen estos héroes, por qué pelean en arenas, qué es el oro).
   El usuario eligió un mundo **futurista, la antítesis de Dota**: ver `docs/CONCEPTO-FUTURISTA.md`.
2. **Repasar las reglas 🟠** de esta lista y decidir cuáles se quedan, cuáles cambian y cuáles se van.
3. **Roster nuevo:** primero los héroes que reemplazan a los 🔴, después el resto. Cada uno con su innato, sus 4
   habilidades y su contra, según los criterios de `DISEÑO.md` §6.
4. **Ítems propios** (nombres e ideas), con los mismos huecos que cubren hoy (contras de cada creep y mecánica).
5. **Arte propio** para cada héroe nuevo, con el estilo de pixel art que ya tenemos.
6. **Medir** cada cambio con el banco (que ningún héroe gane más del 20%).

Las decisiones que esto necesita están en "Esperando al usuario" del roadmap.
