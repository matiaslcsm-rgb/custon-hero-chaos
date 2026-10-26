# Ficha: Flash, el camarógrafo robot del show

> **Estado: borrador para aprobar** (2026-10-26). Primera ficha de MATCH. Reemplaza al **Sniper**, el que más gana hoy
> (59% de las partidas en el banco). Nada de esto está programado todavía.
> **Rediseñado por el usuario (2026-10-26):** robot sobre un trípode de ruedas, con la cara de cámara de TV, un brazo con
> herramientas y 3 drones que salen de su cuerpo; su habilidad principal es **Cámara Fija** (canalizada).

![Boceto de Flash](flash.png)

*(Boceto para aprobar el aspecto: `docs/arte/competidor-flash.py`. No es el sprite final.)*

## Quién es
El camarógrafo del propio show "En Vivo": un robot de estudio que se metió a competir. No tiene cara: **su rostro es una
cámara de TV**, con la lente como ojo y la luz roja de "grabando".
- **Cuerpo:** un **trípode de 3 patas con ruedas** (se planta o rueda), un torso con 3 bahías y **un brazo con varias
  herramientas** (llave, pinza, destornillador).
- **Sus 3 drones son parte de su cuerpo** y se despliegan de él:
  - **el aéreo**, que graba desde arriba (pega **físico**);
  - **el de sonido**, un micrófono volador (pega **mágico**);
  - **el de luz**, el reflector (pega **puro**: ignora armadura y resistencia). Es el "flash" del nombre.
- **Colores:** hueso y gris de estudio, cian de la lente, magenta de la luz "grabando", amarillo de la luz y las
  herramientas.
- **Rol:** distancia y control. Se planta, encuadra y castiga; pierde si lo agarran de costado o lo obligan a moverse.

## Atributos y base (comparada con el Sniper)
Atributo principal: **Reflejos**. Los números siguen la escala de hoy (la de los atributos nuevos está pendiente).

| | Sniper hoy | **Flash** | Por qué |
|---|---|---|---|
| Vida base | 85 | **95** | Es un robot de estudio, más firme; su juego es plantarse. |
| Daño base | 8 | **7** | Pega menos por golpe: el daño grande es de los drones. |
| Velocidad de ataque | 0,85 | **0,85** | |
| Rango | 5 | **4** | Menos que el Sniper: hoy el rango largo gana sin que el otro pueda hacer nada. |
| Velocidad | 2,3 | **2,1** | Rueda, pero no es rápido. |
| Blindaje / Reflejos / Procesador | 16 / 22 / 15 | **18 / 19 / 16** | Ganancia por nivel: 2,0 / 2,4 / 1,6. |

## Su sello (innato): **Equipo de Rodaje** (diseño del usuario)
**Cámara no pega: pegan sus 3 drones.** Cada ataque básico manda a los tres contra el objetivo, y llegan **siempre en
este orden**:

| Orden | Dron | Daño | Por golpe (propuesta) | Velocidad propia (propuesta) |
|---|---|---|---|---|
| 1º | **Aéreo** (graba desde arriba) | **físico** | 50% de su daño | rápido: 6 casillas/s |
| 2º | **Sonido** (el micrófono) | **mágico** | 35% de su daño | medio: 4,5 casillas/s |
| 3º | **Luz** (el reflector) | **puro, y quema** | 15% de su daño + quemadura | lento: 3,5 casillas/s |

- **La quemadura de la luz:** 2 de daño puro por segundo durante 2 s (no se acumula: cada golpe la renueva).
- **Cada dron se mueve solo**, con su velocidad: vuelan desde Cámara hasta el objetivo y vuelven. Si el objetivo se
  aleja corriendo, los lentos llegan tarde (el de luz es el que más cuesta que llegue).
- **Los drones no se pueden atacar** (ni con golpes ni con daño de área).
- **Se aturden de a uno con ataques mágicos:** un módulo mágico que alcanza a un dron lo deja **aturdido 1,5 s** (quieto
  y sin pegar; no le hace daño). Así se le puede sacar, por ejemplo, el de luz.
- **Si aturden a Cámara, se frenan los tres:** mientras Cámara está aturdido, ningún dron ataca ni se mueve.
- **Lectura:** se ve dónde está cada dron y cuál está aturdido. ¿Le saco un dron con mi mágico, o guardo el
  aturdimiento para él y freno a los tres?
- **Respuesta:** aturdir a Cámara (frena todo) o aturdir drones sueltos con mágicos; correrse para que los lentos no
  lleguen.

## Sus módulos

### Las 3 que faltan: **las diseña el usuario**
Quedan tres lugares (dos módulos y una pasiva, o como prefieras). Los que había propuesto antes quedan acá abajo solo
como ideas, por si alguno sirve:
- *Destello* (el dron de luz): 0,7 s de aviso con un cono rojo; encandila al que viene de frente (falla el 50% de sus
  golpes 2 s).
- *Travelling* (las ruedas): rueda 2,5 casillas para atrás y su próximo ataque llega más lejos y pega más.
- *Trípode* (pasiva): quieto 1 s, clava las patas y ataca 20% más rápido.
- *Primer Plano* (marcas): cada ataque marca al rival, hasta 3, y cada marca le suma +4% de daño recibido.

### Definitiva: **Cámara Fija** (diseño del usuario)
- **Aviso:** 0,5 s. Clava el trípode y en el piso aparece **un cono rojo delante de él** (60°, 5 casillas). Al terminar el
  aviso, **fija como objetivo al rival más cercano dentro del cono** (si no hay nadie, no pasa nada y el enfriamiento
  queda en 10 s).
- **Canalización de 3 s:** Cámara se queda **fijo**. El objetivo queda **ralentizado 40%** y **los 3 drones lo atacan**:
  cada uno le pega **una vez por segundo**, en el orden de siempre (físico, mágico, puro), con **daño fijo** (no
  depende de los atributos):

  | Dron | Tipo | Por golpe (nivel 1 / 2 / 3) | En los 3 s |
  |---|---|---|---|
  | Aéreo | físico | 10 / 15 / 20 | 30 / 45 / 60 |
  | Sonido | mágico | 10 / 15 / 20 | 30 / 45 / 60 |
  | Luz | puro, y quema | 6 / 9 / 12 | 18 / 27 / 36 (+ la quemadura) |

  En total, 78 / 117 / 156 antes de armadura, resistencia y el ajuste de duelo (en duelo, hoy, −60%).
- **Se corta si:** aturden a Cámara (los tres drones se frenan), el objetivo sale a más de **7 casillas**, o muere. Si
  aturden **un** dron con un mágico, solo ese deja de pegar; los otros siguen.
- **Enfriamiento:** 60 / 50 / 40 s · **Energía:** 100 / 120 / 140.
- **Lectura:** el cono avisa medio segundo antes: el rival puede salirse. Una vez fijado, ¿corro (lento) para salir del
  alcance, aturdo a Cámara, o le saco un dron con un mágico?
- **Respuesta:** salir del cono en el aviso; aturdir a Cámara para cortar todo; aturdir drones sueltos; o correr lejos.
- **Por qué tres tipos de daño:** ninguna defensa sola alcanza (la armadura frena al aéreo, la resistencia al de sonido y
  nada frena al de luz). Premia armar defensa mezclada contra él.

## Cómo pelea un duelo
1. Se planta lejos y sus drones pegan en cadena: físico, mágico y puro con quemadura.
2. Con el rival encuadrado y cerca de la punta del cono: Cámara Fija.
3. (Lo demás depende de las 3 habilidades que faltan.)

**Cómo se le gana:** guardar el aturdimiento para Cámara (frena a los tres drones), sacarle drones sueltos con
mágicos (el de luz, que quema, es el mejor para sacar) y moverse para que los lentos lleguen tarde.

**Cruces (a medir):**
- Bien contra los que se defienden con un solo tipo de defensa (los tres tipos de daño).
- Mal contra quien tenga aturdimientos rápidos y mágicos de área (le frenan los drones).
- Mal contra **Glitch** (le copia la Cámara Fija).
- ⚠️ **Kilo también tenía drones** (de entrega). Para que no se pisen, propongo que Kilo cambie los drones por otra cosa
  cuando hagamos su ficha (por ejemplo, paquetes que tira y explotan).

## Frases del show
- **Al entrar:** "Grabando." · "Tres, dos, uno... ¡al aire!"
- **Al ganar un duelo:** "Corte. Se imprime." · "Esta va a la repetición."
- **Al perder:** "Señal... perdida..." · "Fuera de foco."
- **El conductor lo presenta:** "¡El que nunca se pierde una toma, el ojo del show... FLASH!"

## Lo que hace falta en el motor
| Pieza | ¿Existe? |
|---|---|
| Daño físico, mágico y puro | Sí (`dealDamage` en `js/combat.js`). |
| Quemadura (daño puro por segundo) | Hay daño en el tiempo en otros héroes; se reusa con daño puro. |
| **Drones: unidades que vuelan solas** con su velocidad, que no se pueden atacar y pegan por él | **Nuevo**, la pieza grande. |
| Aturdir un dron solo con un mágico; aturdir a Cámara frena a los tres | Nuevo, sale con los drones. |
| Aviso con cono en el piso | La Torre tiene avisos (`towerTelegraph.js`); falta traerlos a MATCH, con forma de cono. |
| **Canalización** (quieto, se corta con aturdimiento o distancia) | **Nuevo.** Pieza general: la van a usar otros. |
| Dibujo y animación de los drones saliendo, volando y volviendo | Nuevo. |

## Qué medir cuando esté jugable
- Gana entre el **45% y el 55%** de sus duelos en el banco.
- Sus duelos duran más que los del Sniper (meta del juego: 15 a 30 s).
- El piloto evita entre el **30% y el 70%** de sus Destellos y Cámaras Fijas (saliéndose en el aviso o cortándolas).
- Ningún cruce 80 a 20.

## (decisión) Para aprobar
**Ya decidido por el usuario (2026-10-26):** robot con trípode de ruedas, cara de cámara de TV, brazo con herramientas y
3 drones que son parte de su cuerpo. Los drones son su ataque (en orden: físico, mágico, puro que quema), cada uno con su
velocidad; no se pueden atacar; se aturden de a uno con ataques mágicos, o los tres aturdiendo a Cámara. Cámara Fija es
suya. Faltan 3 habilidades, que diseña el usuario.

Queda abierto:
1. **¿Cámara Fija es su definitiva?** **a) Sí (recomendado)**; b) módulo común (18 s, 2 s de canalización, la mitad del
   daño).
2. **¿Qué es un "ataque mágico" que aturde un dron?**
   - **a) Cualquier módulo de daño mágico que lo alcance (recomendado):** lo deja 1,5 s quieto. Simple y se aprende rápido.
   - b) Solo los módulos mágicos que ya aturden (más raro de lograr).
3. **El nombre:** ¿**Flash**, o como le venís diciendo, **Cámara**? (Otras: Rec, Toma, Trípode.)
4. **El aspecto:** ¿el boceto va?
5. **Las 3 habilidades que faltan:** contámelas cuando las tengas y las paso a la ficha con números, aviso y respuesta.
