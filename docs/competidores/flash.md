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

## Su sello (innato): **Primer Plano**
Cada golpe básico suyo le pone al rival una **marca de cámara** (se ven sobre su cabeza, como cargas): hasta **3**, duran
**4 s**. Cada marca hace que el rival reciba **+4% de daño de todos** (máximo +12%).
- **Lectura:** las marcas están a la vista; cuanto más te quedás en su rango, peor.
- **Respuesta:** salir del rango 4 s y se borran.

## Sus módulos

### 1. **Destello** (el dron de luz)
- **Aviso:** 0,7 s. El dron de luz sale de su bahía y en el piso aparece un **cono rojo** (60°, 4 casillas). Se corta si lo
  aturden.
- **Efecto:** daño chico (puro, 15 + 10% de Procesador). Al que está en el cono **viniendo hacia él o quieto** lo
  **encandila**: sus golpes fallan el **50% por 2 s**. Al que se está alejando, solo el daño.
- **Después:** queda expuesto 0,4 s.
- **Enfriamiento:** 12 s · **Energía:** 40.
- **Lectura y respuesta:** ¿me salgo del cono o me la juego? Entrarle de costado o salir caminando.

### 2. **Travelling** (las ruedas)
- Pliega las patas y **rueda 2,5 casillas para atrás** mirando al rival; su próximo golpe en 3 s tiene **+2 de rango y
  +40% de daño** (y pone 2 marcas de una).
- **Enfriamiento:** 10 s · **Energía:** 30.
- **Lectura y respuesta:** si lo perseguís, se aleja y te castiga. Esperá a que lo gaste y recién ahí cerrá la distancia.

### 3. **Trípode** (pasiva)
- Si se queda **quieto 1 s**, clava las patas: **+20% de velocidad de ataque** mientras no se mueva.
- **Se ve:** las patas se abren y la luz de "grabando" queda fija. Moverlo o hacerlo caminar le saca la ventaja.

### 4. Definitiva: **Cámara Fija** (diseño del usuario)
- **Aviso:** 0,5 s. Clava el trípode y en el piso aparece **un cono rojo delante de él** (60°, 5 casillas). Al terminar el
  aviso, **fija como objetivo al rival más cercano dentro del cono** (si no hay nadie, no pasa nada y el enfriamiento
  queda en 10 s).
- **Canalización de 3 s:** Flash se queda **fijo** (no camina ni ataca). El objetivo queda **ralentizado 40%** y los **3
  drones se despliegan y lo atacan**: cada dron le pega **una vez por segundo** con **daño fijo** (no depende de los
  atributos):

  | Dron | Tipo | Por golpe (nivel 1 / 2 / 3) | En los 3 s |
  |---|---|---|---|
  | Aéreo | físico | 10 / 15 / 20 | 30 / 45 / 60 |
  | Sonido | mágico | 10 / 15 / 20 | 30 / 45 / 60 |
  | Luz | puro | 6 / 9 / 12 | 18 / 27 / 36 |

  En total, 78 / 117 / 156 antes de armadura, resistencia y el ajuste de duelo (en duelo, hoy, −60%).
- **Se corta si:** lo aturden o lo empujan, el objetivo sale a más de **7 casillas**, o muere. Al cortarse, los drones
  vuelven a su cuerpo.
- **Enfriamiento:** 60 / 50 / 40 s · **Energía:** 100 / 120 / 140.
- **Lectura:** el cono avisa medio segundo antes: el rival puede salirse. Una vez fijado, ¿corro (lento) para salir del
  alcance, o me quedo y le pego para cortarlo?
- **Respuesta:** salir del cono en el aviso; guardar un aturdimiento para cortar la canalización; o correr lejos (con la
  ralentización llega justo: los golpes del final no le pegan).
- **Por qué tres tipos de daño:** ninguna defensa sola alcanza (la armadura frena al aéreo, la resistencia al de sonido y
  nada frena al de luz). Premia armar defensa mezclada contra él.

## Cómo pelea un duelo
1. Se planta (Trípode) y pega de lejos poniendo marcas.
2. Si el rival se acerca: Travelling para atrás y un golpe fuerte.
3. Si viene de frente: Destello, y lo deja fallando la mitad.
4. Con el rival marcado y lento: Cámara Fija.

**Cómo se le gana:** de costado y sin darle tiempo; obligarlo a moverse; guardar el aturdimiento para la Cámara Fija.

**Cruces (a medir):**
- Bien contra los de cuerpo a cuerpo que vienen de frente.
- Mal contra **Glitch** (le copia la Cámara Fija) y contra quien tenga aturdimientos rápidos.
- Parejo contra **Vector** (la guardia contra el Destello).
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
| Marcas con cargas a la vista y +% de daño recibido | Casi: existe `dmgTakenPct`; faltan las cargas sobre la cabeza. |
| Aviso con cono en el piso que se corta aturdiendo | La Torre tiene avisos (`towerTelegraph.js`); falta traerlos a MATCH, con forma de cono. |
| **Canalización** (quieto, se corta con aturdimiento, empuje o distancia) | **Nuevo.** Pieza general: la van a usar otros competidores. |
| Drones que salen del cuerpo y pegan (dibujo y animación) | Nuevo: dibujarlos y animarlos saliendo y volviendo. |
| Encandilado (falla el 50%) y "viniendo hacia él" | Nuevo, chico. |
| Rodar para atrás | Hay movimientos de habilidad (Danzante); se reusa. |

## Qué medir cuando esté jugable
- Gana entre el **45% y el 55%** de sus duelos en el banco.
- Sus duelos duran más que los del Sniper (meta del juego: 15 a 30 s).
- El piloto evita entre el **30% y el 70%** de sus Destellos y Cámaras Fijas (saliéndose en el aviso o cortándolas).
- Ningún cruce 80 a 20.

## (decisión) Para aprobar
1. **¿Cámara Fija es su definitiva?**
   - **a) Sí, definitiva (recomendado):** 3 s con 3 drones es mucho; con enfriamiento largo se lee como "su momento".
   - b) Módulo común: enfriamiento de 18 s, pero 2 s de canalización y la mitad del daño.
2. **¿Los drones se pueden romper durante la Cámara Fija?**
   - **a) No (recomendado):** la respuesta es cortarlo a él (aturdir) o escaparse; más simple de leer.
   - b) Sí: cada dron tiene poca vida; romperlo saca su daño. Más profundo, pero se parece a Kilo.
3. **El nombre:** ¿sigue siendo **Flash** (el dron de luz) o le ponemos otro, como **Rec**, **Toma** o **Trípode**?
4. **El encandilado del Destello:** **a) falla el 50% de sus golpes 2 s (recomendado)**; b) falla todos 1,2 s; c) no puede
   tirar módulos 2 s.
5. **El aspecto:** ¿el boceto va?
