# Propuesta: equipo, habilidades, stats, arenas de jefes y motor (Infinite Tower)

Pedido del usuario (2026-10-14): *"hay que reworkear todo el sistema de ítems y habilidades para que tenga sentido y se
sienta divertido. ¿Un sistema tipo Risk of Rain (ítems con habilidades únicas, juntar y crear sinergias) o seguimos con
el sistema tipo Diablo (ir encontrando equipo)? Los puntos de stats dan un crecimiento sostenido pero no sirven para
especializar nada. Los jefes, en una arena de la que no se pueda salir, con una condición para entrar. El herrero y los
comerciantes quedaron abandonados, pero dependen de lo primero."*

Este documento ordena la decisión. Hasta que el usuario elija, el modo automático **no toca** equipo, habilidades,
stats, herrero ni mercader.

---

## 1. El diagnóstico: por qué hoy no se siente bien
Así está hoy:
- **Equipo:** 55 piezas sacadas de los héroes de Custom Hero. El arma, los guantes y la armadura traen una habilidad
  (Q, E y R). Las demás ranuras dan stats. Encima van afijos al azar (15 tipos, todos números: +daño, +vida, +crítico),
  calidades, fundir y traspasar.
- **Stats:** 5 puntos por nivel en Fuerza, Agilidad, Inteligencia, Vitalidad o Visión. Todos suman de a poco.

Qué está mal:
1. **Casi todas las decisiones son de números.** Una pieza "mejor" es la que tiene números más altos. Cambiar de pieza
   no cambia cómo jugás, salvo la habilidad de las 3 ranuras activas.
2. **Los stats no tienen umbrales.** El punto 1 y el punto 40 hacen lo mismo. Repartirlos es una cuenta, no una
   elección, y el piloto los reparte con una regla fija (3 al principal y 2 a Vitalidad) sin perder nada.
3. **No hay sinergias.** Las piezas no se hablan entre sí: no existe "si tenés A, B se vuelve mejor".
4. **Herrero, mercader, fundir y traspasar** son maneras de mover números entre piezas. Sin piezas que importen,
   ninguno importa.

Lo que **sí** funciona y conviene conservar:
- Las 3 armas iniciales con un verbo propio: el combo y la parada de la espada, el tiro tensado del arco, el orbe del
  bastón.
- Q, E y R con habilidades de los héroes.
- La Esencia como moneda entre runs.

## 2. Las tres opciones
### A. Risk of Rain puro: reliquias que se apilan, sin equipo
Juntás objetos con un efecto único que se engancha a algo que pasa ("al golpear: 10% de tirar un rayo", "al esquivar:
dejás una mina"). Se apilan: dos iguales hacen el efecto más fuerte. Las sinergias salen solas de combinar efectos. No
hay ranuras, ni calidades, ni afijos.
- **A favor:** es lo más divertido de armar. Cada run se siente distinta a los 10 minutos. Es fácil de leer: un ícono es
  un efecto.
- **En contra:** tira a la basura casi todo lo que hay (calidades, fundir, traspasar, herrero). Pierde el "encontré una
  espada mejor". Hay que diseñar entre 40 y 60 efectos y balancear las combinaciones que se disparan (en Risk of Rain
  pasa mucho).

### B. Diablo mejorado: seguir con equipo y hacer que importe
Se quedan las ranuras, pero cada pieza rara o única trae un **efecto que cambia la build** (las legendarias de
Diablo 3 y 4), no solo números. Los stats pasan a tener umbrales.
- **A favor:** reaprovecha todo lo que existe.
- **En contra:** el loop sigue dependiendo de la suerte con el botín (REWORK.md §16 ya midió que la suerte decide mucho).
  Las sinergias se arman recién al final de la run, cuando juntaste varias únicas.

### C. Híbrido (recomendada): pocas piezas que te dan las habilidades y reliquias que arman la build
- **Equipo reducido a 3 ranuras:** arma, guantes y armadura, las que hoy dan Q, E y R. Te dan **qué hacés**: el verbo
  del arma y tus 3 habilidades. Se encuentran y se cambian, como ahora, pero sin la sopa de afijos: cada pieza tiene un
  nivel (su daño) y como mucho 1 rasgo.
- **Reliquias tipo Risk of Rain:** te dan **cómo lo hacés**. No tienen ranura y se apilan. Se enganchan a eventos: al
  golpear, al esquivar, al matar, al recibir daño, al lanzar una habilidad, al parar. Cada reliquia tiene **etiquetas**
  (fuego, sangrado, veneno, crítico, escudo, invocación, movimiento). Juntar 3 de la misma etiqueta prende un **bonus de
  conjunto**: ahí están las sinergias, y se leen en pantalla.
- **Los stats cambian por elecciones al subir de nivel:** se van los 5 puntos por nivel. En su lugar elegís **1 de 3
  mejoras**, como las bendiciones de Hades: "+20% de daño de fuego", "el remate de la espada aturde", "una carga más de
  esquive". Fuerza, Agilidad e Inteligencia quedan como **umbrales** que dan esas mejoras. Por ejemplo, 3 mejoras de
  Fuerza destraban "Golpe pesado: tus remates rompen escudos". Así especializarse es una decisión, no una cuenta.
- **Herrero y mercader con un rol claro:**
  - El **mercader** vende 3 reliquias por piso (y rerolls).
  - El **herrero** mejora la pieza que te da la habilidad (sube su nivel o le cambia el rasgo) y **funde 2 reliquias
    iguales en su versión mayor**.
  - Fundir y traspasar se reemplazan por eso.
- **La Esencia (entre runs) desbloquea reliquias nuevas en el mazo** en vez de dar solo números. Encaja con lo que
  investigamos: la metaprogresión que **abre opciones** retiene más que la que suma números. Además los jefes escondidos
  ya tienen dónde caer: su pieza única pasa a ser una **reliquia única**.
- **A favor:** se conserva lo que funciona (las armas, Q, E y R, las piezas de héroes), aparece la diversión de armar
  sinergias y cada sistema tiene un lugar.
- **En contra:** es el rework más grande de los tres en interfaz. Hay que rehacer el inventario, la ventana de stats y
  la tienda.

### Cómo se haría (C, de a pasos jugables y medidos)
1. **Corte vertical:** 12 reliquias con 4 etiquetas, el bonus de conjunto y la elección 1 de 3 al subir de nivel. En una
   run de prueba, sin sacar todavía lo viejo. Se mide con el piloto si las runs varían más y si alguna combinación se
   dispara.
2. Sacar los afijos y los puntos de stats, y reducir el equipo a 3 ranuras. Se mide que el daño por piso no cambie
   ±15%.
3. Herrero y mercader nuevos.
4. Desbloqueos con Esencia y las reliquias únicas de los jefes.
5. Llegar a 40 reliquias, de a 5 por entrega, midiendo cada tanda.

## 3. Arenas de jefes con condición para entrar
Hoy el guardián está en la última sala del laberinto y te podés ir de la pelea. La propuesta es que **cada jefe pelee en
una arena**. Al entrar se cierra (rejas o raíces) y solo se abre si ganás o morís. La condición para entrar cambia según
el jefe.

| Jefe | Condición para entrar (opciones) |
|---|---|
| Guardián del piso (obligatorio) | **La llave del piso** (recomendada): la tiene el campeón más fuerte del piso, o sale del misterio del piso (compuertas, relojes, faroles). Sin la llave, la puerta de la arena no abre. |
| | O **3 sellos**: uno en el pueblo, uno en un campeón y uno en una sala secreta. Más largo y con riesgo de volverse tedioso. |
| | O **sin condición**: arena cerrada pero de libre acceso. Lo más simple. |
| Jefes escondidos | Lo que ya tienen (de noche, detrás de una grieta) **más** la arena cerrada. Algunos con un puzle propio: encender 3 faroles (piso 7), dejar los relojes a la misma hora (piso 5). |

Recomendado: la llave del piso para los guardianes y la arena cerrada para todos los jefes. Que la llave no sea una
búsqueda ciega: el objetivo del piso y el mapa marcan quién la tiene.

## 4. Gráficos y motor
**¿Hay algo para instalar que mejore los gráficos?**
- Yo no genero imágenes. Lo que mejor funcionó fue la hoja de sprites que dibujaste vos: la pasé a código y le armé el
  frente y la espalda.
- Para producir más arte:
  - **Aseprite** (pago) o **Piskel/LibreSprite** (gratis), para dibujar vos o encargar hojas.
  - Un generador de pixel art con IA (por ejemplo **PixelLab**) para bocetos que después se limpian. Antes de pagar
    nada hay que verificar si tiene conexión con Claude.
  - En el proyecto ya existe el agente `arte-pixel` (`/equipo`) para el estilo y la paleta.
- **Sin cambiar de motor** se puede mejorar mucho:
  - Pasar el dibujo a **WebGL con PixiJS**, que permite luces de verdad, sombras suaves, brillo y distorsión de calor.
  - Iluminación por casilla con mapas de normales.
  - Partículas por GPU.
  - Se hace de a partes.

**¿Godot o Unity?**
| | Seguir en el navegador (JS) | Godot | Unity |
|---|---|---|---|
| ¿Lo puedo seguir trabajando yo? | Sí, como hasta ahora, probando cada cambio en el navegador integrado. | **Sí, bastante:** las escenas y el código (GDScript) son texto. Habría que instalar Godot para correr las pruebas por consola y exportar a web para verlo. | Peor: depende del editor y de archivos que no se editan bien a mano. No lo recomiendo para trabajar conmigo. |
| Gráficos | Buenos con PixiJS y WebGL. | Mejores: luces 2D, sombras, shaders y partículas listos. | Igual o mejor, más pesado. |
| Publicar | Link web (GitHub Pages). | PC, celular y web (la exportación web es más pesada). | PC, celular y consolas. |
| Costo de pasarse | 0 | Reescribir todo (~20 mil líneas de JS). Semanas. | Igual o más. |

**Recomendado:** **no cambiar de motor ahora.** Primero se decide y se arma el sistema de equipo y habilidades (la
sección 2), que define el juego. Reescribir en otro motor un diseño que todavía va a cambiar es hacer el trabajo dos
veces. Cuando el loop esté cerrado y divertido, si se quiere publicar en PC o celular, **Godot** es el paso, y lo puedo
seguir trabajando yo. Mientras tanto, PixiJS para las luces da el salto gráfico más grande por menos trabajo.

---

## Lo que tenés que decidir
1. **Sistema de equipo y habilidades:** A (Risk of Rain puro), B (Diablo mejorado) o **C (híbrido, recomendada)**.
2. **Stats:** **elegir 1 de 3 mejoras al subir de nivel, con umbrales (recomendada)**, o umbrales sobre los puntos de
   ahora.
3. **Arenas:** **llave del piso + arena cerrada (recomendada)**, 3 sellos, o arena sin condición.
4. **Motor:** **seguir en el navegador y sumar PixiJS para las luces (recomendada)**, pasar a Godot ya, o Unity.
