# Rework de Tower Chaos (plan, 2026-10-07)

Pedido del usuario (2026-10-07): "vamos a reworkear muchas cosas". Este documento junta todo lo pedido, lo ordena
como diseño (qué problema resuelve, referencias, cómo encaja con lo que ya hay) y propone un orden de fases. Lo que se
decida se anota acá y en `ROGUELIKE.md`. Las decisiones abiertas están marcadas con ❓ y una opción recomendada.

**Ya hecho (fase 0):** Códice de poderes, piezas sin alma y Herrero (ROGUELIKE.md §4 septies).

---

## Visión
El jugador **despierta en la base sin nada**, solo con un cuaderno. Todo lo que aprende lo anota: habilidades,
monstruos, recetas. Cada run lo hace un poco más poderoso **de forma permanente** (Códice, recetas, piezas que sabe
fabricar), y cada jugador termina armando **su propio arsenal**, distinto al de otro. Referencias: Hades (combate,
metaprogresión, jefes), Dead Cells (desbloqueos permanentes con moneda de la run), Rogue Legacy 2 (herrero y
planos), Diablo II (calidad de las piezas), Hollow Knight (el diario de cazador).

---

## 1. Inicio: el despertar, el cuaderno y las 3 armas (tutorial)
- **Escena inicial:** el personaje despierta en la base (el círculo de piedra del piso 1), sin equipo. Lo único que sabe
  hacer es escribir: tiene un **cuaderno** (la Bitácora, §6). Las primeras páginas son el tutorial, escritas a mano
  ("Me desperté. No recuerdo nada. Puedo moverme con W A S D…").
- **Elegir arma**, en tres pedestales (o tres armas clavadas en el piso), cada una con una habilidad de entrada:
  | Arma | Estilo | Habilidad inicial |
  |---|---|---|
  | **Espada** | cuerpo a cuerpo | golpe fuerte en arco frente a vos (daño cuerpo a cuerpo) |
  | **Arco** | distancia, daño sostenido | ráfaga de flechas o disparo cargado (daño a distancia) |
  | **Bastón** | hechicero | un hechizo (proyectil elemental que marca para reacciones) |
- Reemplaza el "hechizo inicial al azar" actual y el Golpe Certero del aventurero (que pasa a ser la habilidad de la espada).
- **Tutorial jugado** (no carteles): cada página del cuaderno se escribe cuando hacés la acción (moverse, esquivar,
  lanzar, primer creep, primer cofre, el pueblo). Se puede saltar y no se repite en las runs siguientes.
- ❓ ¿Las 3 armas siempre disponibles, o se desbloquean (arrancás solo con la espada)?
  **Recomendado:** las 3 desde el principio; lo desbloqueable son sus variantes (Espada de Fuego, Arco Largo…) en el Códice.

**Hecho (2026-10-07, `js/towerItems.js`/`js/tower.js`/`js/towerUI.js`):** las 3 armas, como pedestal obligatorio al
entrar a la torre (ventana sin botón de cerrar; Esc no la cierra ni se puede pausar por arriba —
`weaponPickOpen` en `towerModalOpen()`, igual que el inventario o la forja; el piloto automático elige Espada sola).
Golpe Certero pasó de ser fijo del Aventurero a ser la habilidad de la Espada (se pierde si cambiás de arma, como
cualquier otra pieza); se sumaron Ráfaga del Arco (pega a 3 enemigos distintos) y Saeta Arcana (daño mágico,
marca elemento arcano para las reacciones). Como las 3 armas no son de ningún héroe del roster, no entran en
`HERO_TEMPLATES`: `heroOf()` las resuelve aparte (y de paso corrige que el ícono y el color de un arma sin héroe
real crasheaban en un par de lugares).

**Hecho (2026-10-07, el Cuaderno, `js/towerNotebook.js`):** tutorial jugado mínimo — 7 páginas (despertar, caminar,
esquivar, lanzar, primera baja, un cofre, el pueblo) que se escriben solas la primera vez que hacés esa acción, en
la voz del Aventurero, y quedan guardadas para siempre (no se repiten en runs siguientes, como el Códice). Ventana
con tecla N o desde la pausa, con las páginas que faltan mostradas como "???". **Falta de esta fase:** la escena
del despertar en el mundo (hoy es una ventana modal con 3 cartas, no 3 armas clavadas en el piso que camines a
buscar). La unión del Cuaderno con el Códice y el Bestiario en una sola Bitácora (§6) queda para más adelante.

## 2. Habilidades: menos, más claras y con más identidad
**Problema:** hoy podés tener hasta 6 activas más pasivas de 8 piezas. Es confuso, y a mano (estilo Hades) no se puede
manejar tanto.
- **Reducir a 3 ranuras activas** (como Hades: ataque, especial y hechizo, más el esquive):
  1. **Habilidad del arma** (Q): viene con el arma.
  2. **Habilidad de los guantes** (E): la ofensiva o de control que elijas.
  3. **Habilidad de la armadura** (R): la que antes era la definitiva de cada héroe.
  4. **Movilidad → Espacio (2026-10-07):** toda habilidad con el tag `MOVILIDAD` (Parpadeo, Salto Sangriento,
     Distorsión Espacial, Corte Errante, Paso Fantasma, Tormenta Cinética) se ata siempre a la tecla del
     esquive en vez de a su Q/E/R — se juegan como una variante del esquive, no como "una más del botón". Si
     el espacio ya lo tiene otra pieza de movilidad equipada, la siguiente cae a la tecla fija de su ranura.
     Al apretar Espacio se prueba la habilidad primero; si no se pudo lanzar (sin maná, enfriamiento, sin
     objetivo), cae al esquive de toda la vida para que la tecla nunca quede pegada (`spaceAction()`, `js/game.js`).
  - Casco, botas, amuleto y anillos dan **pasivas** y stats; botas da velocidad de movimiento (ya cumple la idea
    original de "que cambien cómo es el esquive" con lo que ya había, sin ítem nuevo).
  - **Decisión (2026-10-07):** sin sistema de carga. Las ex-definitivas pasan a ser activas comunes (maná y
    enfriamiento, como cualquier otra), con sus números rebalanceados a la baja para que anden seguido en vez de
    una vez cada mucho. Técnicamente, cada habilidad puede declarar un `towerValues` con los números que usa solo
    en la Torre (`js/progression.js`, `skillValueSource`); Caos de Héroes sigue usando los valores de siempre.
- **Rediseñar el catálogo** con roles claros y efectos que se lean:
  - **Control de unidades:** atraer (vórtice), empujar (onda), aturdir, congelar, raíz, provocar, miedo (huyen),
    convertir a un enemigo en aliado por unos segundos.
  - **Áreas visibles:** zonas en el piso que duran (fuego, hielo, veneno), muros, trampas, torretas.
  - Mantener las **reacciones elementales**; cada habilidad con un solo elemento claro.
- **Etiquetas visibles en la carta:** Control · Área · Daño · Defensa · Movilidad, y el elemento.
- Los poderes del Códice siguen siendo los que se imbuyen; con 3 ranuras, elegir cuál imbuir pesa mucho más.

## 3. Jefes y enemigos estilo Hades
- **Ataques anunciados** (también los creeps fuertes): zona marcada en el piso que se llena (círculo, línea, cono) y
  después pega fuerte. El esquive pasa a tener sentido. (Era la recomendación de la vuelta anterior.)
- **Jefes con fases:** al 66% y al 33% de vida cambian de patrón. Al bajar de la mitad tiran su **definitiva**: un
  ataque de pantalla con huecos seguros, invocaciones, el piso que se rompe…
- **Un jefe con nombre por bioma** (5), diseñado a mano, con su mecánica: por ejemplo, el del bosque planta raíces
  que hay que cortar y el del volcán inunda de lava el piso por sectores.
- **Barra de jefe grande** abajo de la pantalla, con su nombre y las fases.
- Los jefes sueltan **esencia** (§4), y la primera vez, una **receta** o un plano nuevo.

**Hecho (fase 4, 2026-10-07, `js/towerTelegraph.js`):**
- **Ataques anunciados:** una zona en el piso (círculo, línea o cono) se llena en ~1 s y al completarse pega a quien
  siga adentro: campeones 2,4× su ataque, bestias 2×, jefes 2,6×. Se evitan saliendo o con el esquive (invulnerable).
  Los tiran los campeones y, del bestiario, los brutos, aturdidores y tanques (golpe al piso), los hechiceros
  (marcan tu lugar) y los arqueros (tiro cargado en línea). Mientras cargan se quedan quietos.
- **Jefes con 3 fases** (guardianes, señores de cueva y guardianes malditos): al 66% y al 33% rugen invulnerables
  con una onda alrededor y atacan más seguido (cada 4,6 → 3,7 → 2,9 s). Repertorio: golpe al piso, cono, embestida
  en línea (el jefe la recorre) y, desde la fase 2, ráfagas de 3 zonas. En la fase 2 llaman 2 ayudantes. Al entrar en
  la fase 3 tiran su **definitiva** (lluvia de 10 zonas en dos tandas, con huecos) y la repiten cada 14 s.
- **Barra del jefe abajo al centro** con su nombre, la fase y las marcas del 66% y el 33%.
- **El piloto esquiva:** sale de las zonas y usa el esquive a último momento.
- **Freno a la espiral de muertes:** si ya hay un portador vivo con tus piezas, morir otra vez no se lleva más.
- **Medido** (piloto, run completa): Espada 116 min/5 muertes y 104/6, Arco 105/1, Bastón 168/8. Antes de esta fase:
  91-120 min con 1-6 muertes (y una espiral de 30). Volvió al rango de diseño (122-161). El piloto esquiva el 90-97%
  de los ataques anunciados; una persona va a recibir más, así que en la práctica es algo más difícil que la medición.
- **Falta:** un jefe con nombre y mecánica propia por bioma (por ahora todos comparten el repertorio), y que los
  jefes suelten Esencia (fase 5).

## 4. Economía: monedas, energía y crafteo
**Dos monedas** (separar lo de la run de lo permanente, como Hades u Oscuridad):
| Moneda | Se consigue | Se pierde al morir | Para qué |
|---|---|---|---|
| **Oro** (ya existe) | creeps, eventos, vender | la mitad queda en tus restos | tienda, tomos, herrero en la run |
| **Esencia** (nueva, permanente) | jefes, campeones, desguazar piezas, dominar poderes | no | crafteo, mejoras del Códice, fabricar piezas puras |

- ❓ **"Energía"** para el farmeo: una energía diaria tipo juego de celular frustra y no aporta en un juego para PC.
  **Recomendado:** no usar energía con tiempo de espera. Lo que limita el farmeo es la Esencia, y la "energía" queda
  como el costo de imbuir o desbloquear.
- **Desguace y fabricación** (idea del usuario): **5 piezas de la misma ranura** (por ejemplo, 5 guantes) más Esencia →
  el Herrero fabrica **una pieza pura** (sin alma) de esa ranura, con una **calidad** que depende de las piezas que
  entregás y de la suerte:
  | Calidad | Modificadores (primera versión, se ajustan) |
  |---|---|
  | **Roma** | −20% de stats base, 1 afijo |
  | **Usada** | stats base, 2 afijos |
  | **Nueva** | +20% de stats base, 3 afijos |
  | **Obra maestra** | +40% de stats base, 4 afijos, 1 afijo exclusivo (por ejemplo "+1 al nivel de la habilidad imbuida") |
  - ❓ Pediste "3 niveles" pero nombraste 4 (roma, usado, nuevo, obra maestra). **Recomendado:** los 4. Roma es la que
    sale si mezclás piezas malas.
  - Las calidades y sus modificadores van en una tabla de datos (`CRAFT_QUALITY`), así se pueden cambiar después sin
    tocar la lógica.
- **Mejoras permanentes con Esencia** (en la base, entre runs): más ranuras de bolsa, el Herrero garantizado en el piso 1,
  imbuir más barato, arrancar con una pieza pura, y subir el nivel inicial de los poderes del Códice.
- **Planos:** algunas piezas (armaduras con nombre, sets) se desbloquean como plano en la Bitácora y después se
  fabrican. Así cada jugador va juntando las armaduras y habilidades que le interesan.

**Hecho (fase 5, 2026-10-07, `js/towerCraft.js`):**
- **Esencia ✦** (permanente, se guarda con el Códice y no se pierde al morir): guardián del piso 10 + 2×piso, señor de
  la cueva 8 + 2×profundidad, guardián maldito 6, campeón 1 (25% de las veces) y 5 por cada poder dominado. Se ve en
  la franja de arriba, al lado del oro.
- **Fundir en el Herrero** (idea del usuario): 5 piezas de la misma ranura de la bolsa + 15 ✦ → una **pieza pura**
  (sin alma) de esa ranura con calidad al azar: **Roma** (stats base ×0,8, 1 afijo), **Usada** (×1, 2), **Nueva**
  (×1,2, 3) u **Obra maestra** (×1,4, 4 afijos y **Maestría**: la habilidad que le imbuyas arranca en nivel 2). Las
  chances base son 45/35/17/3% y mejoran con la calidad de lo que entregás. **Garantía:** si entre las 5 va una
  pieza ya fabricada, el resultado sale sí o sí una calidad por encima de la mejor fabricada (Roma + 4 → al menos
  Usada), así se sube escalón por escalón. El Herrero muestra las chances y la garantía antes de fundir. Los
  números están en la tabla `CRAFT_QUALITY` para ajustarlos después.
- **Mejoras permanentes** (en el Códice, J): Herrero en el piso 1 (100 ✦), Imbuir −25% por nivel (80 y 160),
  Arrancar con una pieza pura Usada (150) y +1 fila de bolsa (250).
- **Medido:** Espada 120 min/2 muertes, Bastón 100/8 (el balance de la run no cambia). Con 1 ✦ por campeón una run
  daba ~470-510 ✦ y se compraba todo en la primera; bajado a 25% de chance y mejoras más caras (total 740 ✦): medido
  de nuevo, una run da ~290 ✦, así que se completan en 2-3 runs.
- Decisión mía (reversible): las piezas a fundir salen de la bolsa, no de lo equipado, y el Herrero elige cuáles (la
  mejor fabricada, para la garantía, y después las de menor calidad).

## 5. Pantalla, cámara y menús
- **Más pantalla de juego:** el HUD pasa a los bordes y se achica. Abajo al centro: vida, maná, las 3 habilidades y el
  esquive. Arriba a la izquierda: piso, bioma y objetivo. El registro de mensajes se abre con una tecla (antes estaba
  siempre visible).
- **Zoom** con la rueda del mouse (y + / −): de cerca para pelear, de lejos para explorar. Tres niveles o continuo, y el
  minimapa en una esquina.
- **Menú de pausa** (Esc) con pestañas: Continuar · Bitácora · Códice · Bestiario · Opciones (volumen de música y
  efectos, zoom, habilidades automáticas) · Salir. Hoy el Esc cierra ventanas y pausa: queda igual, pero con estas pestañas.
- Se mantiene la estética de tinta y pergamino.

**Hecho (fase 1, 2026-10-07, `js/towerView.js`):**
- El mapa ocupa toda la ventana: sin ranking ni panel derecho, y la barra del héroe queda abajo. En 1600×900 se ven
  ~30×13 casillas (antes 20×12 en un recuadro chico).
- **Zoom** con la rueda o + / −, de 14 a 64 casillas a lo ancho. Se guarda como "casillas a lo ancho" para que se vea
  igual en cualquier pantalla; el mouse y el apuntado siguen al zoom.
- Los mensajes **flotan** 7 s abajo a la izquierda del mapa (los últimos 5). La **L** abre el diario del piso
  (información del piso y registro completo) como panel a la derecha.
- Aviso arriba a la izquierda cuando hay puntos de stats para repartir.
- **Pausa de la Torre:** accesos a Equipo, Stats, Códice, Bestiario y Diario, zoom con − y +, y la lista de controles.
  Sin el glosario del otro modo ni "mapa grande". Las pestañas completas llegan con la Bitácora (§6).
- Falta: achicar la barra del héroe cuando haya 3 ranuras (fase 3) y la barra de jefe abajo (fase 4).

## 6. La Bitácora (diario del personaje)
Une el Códice, el Bestiario y el tutorial en **un cuaderno escrito a mano**, persistente entre runs (como el Diario
de Cazador de Hollow Knight):
- **Habilidades:** cada poder que viste (con lo que sabés de él), y los dominados, marcados.
- **Monstruos:** cada criatura que mataste, con notas que se completan al matar más (10 = sus stats, 25 = su
  debilidad elemental). Hoy el bestiario se genera por run: se guarda el **molde** (rol y cuerpo) y no la criatura exacta.
- **Recetas y planos** del Herrero.
- **Diario:** una línea por run escrita por el personaje ("Día 4: llegué al piso 6. Un Gólem de Ceniza me aplastó.").
  Reutiliza la crónica de la run.
- Se abre con J (reemplaza al Códice suelto) y desde la pausa.

## 7. Música y sonido
- **Música ambiental por bioma**, de día y de noche, más una **capa de combate** que entra con fundido cuando hay
  enemigos cerca y se va al terminar la pelea (música dinámica en capas, como Hades o Zelda).
- **Tema de jefe** propio.
- ❓ ¿De dónde sacarla? **Recomendado:** pistas con licencia CC0 o CC-BY de OpenGameArt o Incompetech, con créditos en
  docs/CREDITOS.md, como se hizo con los íconos. La alternativa es generarla con código (WebAudio), como los efectos
  actuales: sale gratis y liviana, pero suena más pobre.

**Hecho (fase 7, 2026-10-07, `js/towerMusic.js`, carpeta `music/`):** 11 pistas libres de OpenGameArt (10 CC0 y la del
volcán CC BY 4.0, créditos en docs/CREDITOS.md y en el menú), ~21 MB que se bajan recién cuando hacen falta.
- **Capa base** por lugar: una pista por bioma en el campo (la nieve suma viento; la ciénaga es ambiente de bichos y
  burbujas), el pueblo, el laberinto y las cuevas.
- **Capa de combate:** entra con fundido (1,6 s) cuando te persigue algo a 10 casillas o menos, y la base baja al
  30%. Contra un guardián o un señor de cueva suena el tema de jefe en vez del combate. En el pueblo no hay combate.
- **Noche:** la base baja al 75% y pasa por un filtro de graves (más oscura), sin pista aparte.
- Opción **🎵 Música** en la pausa (se guarda); el 🔊 Sonido también la apaga. En pausa baja al 40%.
- Falta: música del menú y del Custom Hero Chaos (por ahora solo suena en la Torre).

---

## Orden propuesto (cada fase jugable y medida)
1. **Pantalla:** zoom, HUD más chico y menú de pausa con pestañas. Es barato y mejora todo lo que viene después.
2. **Despertar y tutorial:** cuaderno y las 3 armas (espada, arco y bastón, con su habilidad). ✅ — las 3 armas
   como pedestal obligatorio y el Cuaderno con sus 7 páginas, ver más arriba. Falta solo la escena en el mundo
   (hoy el despertar es una ventana, no 3 armas clavadas en el piso).
3. **Habilidades:** 3 ranuras (arma/guantes/armadura, sin carga) y el catálogo rediseñado, con control y áreas.
   ✅ **completa (2026-10-07)**: catálogo solo arma/guantes/armadura dan activas, teclas fijas Q/E/R, las
   11 definitivas rebalanceadas como activas comunes vía `towerValues`, el Herrero ya no deja imbuir un poder
   en una ranura que no es la suya, "armar y balancear lo que tenemos" (los dos outliers de maná/enfriamiento
   que quedaban en arma/guantes) y las habilidades de movilidad atadas siempre al espacio. Queda pendiente para
   más adelante, como contenido nuevo y no como cierre de esta fase, el resto del catálogo rediseñado que pide
   esta sección (control nuevo tipo vórtice/empujar/convertir, zonas de área visibles, etiquetas de rol en la
   carta) — eso es "inventar", no "armar lo que tenemos".
4. **Combate estilo Hades:** ataques anunciados en enemigos fuertes, 5 jefes con fases y definitiva.
5. **Economía:** Esencia, desguace (5 piezas → pieza pura con calidad), mejoras permanentes y planos.
6. **Bitácora:** unifica el Códice, el Bestiario, las recetas y el diario.
7. **Música:** ambiente por bioma, capa de combate y tema de jefe.

Las fases 3 y 4 son las más grandes: hay que rehacer pruebas y volver a medir el balance con el piloto (el piloto
también tiene que aprender a esquivar los ataques anunciados).

## Interfaz y calidad de vida (lista viva)
Pedido del usuario (2026-10-07): en cada paso, pensar la interfaz y la calidad de vida como diseñador. Lo chico se hace en
el mismo paso; lo grande queda acá, ordenado por impacto.

**Hecho:**
- ✅ Volumen general, música y efectos, y temblor de pantalla (0-150%), con deslizadores en la pausa que se guardan.
- ✅ La forja ya no corta una pelea: si una pieza sube de nivel peleando aparece un aviso arriba a la izquierda, y la
  ventana se abre sola cuando nadie te persigue.
- ✅ Pausa en tinta: los interruptores pasaron al estilo pergamino y el cartel del piso no tapa la ventana.
- ✅ (antes) Pantalla grande con zoom, mensajes flotantes, aviso de puntos para repartir y barra del jefe abajo.

**Pendiente (de más a menos impacto):**
1. **Barra del héroe más compacta en la Torre**: retrato chico, vida y maná finitas, las 3 habilidades y el esquive con
   su enfriamiento sobre el mapa (estilo Hades), y la Esencia ahí. Libera ~120 px de mapa.
2. **Comparar con lo equipado** en el detalle de cada pieza: lo que gana o pierde, en verde y rojo (como Diablo).
3. **Mapa del piso a pantalla completa (M)** en la Torre, con leyenda: pueblo, herrero, santuarios, cuevas, eventos,
   tus restos y el portador.
4. **Elegir a mano las 5 piezas a fundir** en el Herrero (hoy las elige él).
5. **Reasignar teclas** desde la pausa.
6. **Accesibilidad:** otros colores para las zonas de ataque (para daltonismo), tamaño de los números de daño y escala
   de la interfaz.
7. **Filtro de botín**: no levantar piezas normales, o marcarlas para vender.
8. **El Cuaderno explica lo nuevo** la primera vez: el Herrero, la Esencia, la fundición y los ataques anunciados.
9. **Música en el menú y en Custom Hero Chaos.**

## Decisiones tomadas (2026-10-07)
- **Ranuras:** 3 activas (arma, guantes y armadura), todas con maná y enfriamiento normal. Sin sistema de carga:
  las ex-definitivas se rebalancean para andar como una activa común (pedido explícito del usuario, pisa la
  recomendación anterior de esta misma sección).
- **Calidades de fabricación:** las 4 (roma, usada, nueva, obra maestra).
- **Economía:** solo Esencia, sin energía con tiempo de espera.
- **Primera fase:** pantalla, zoom y pausa con pestañas.

## Preguntas abiertas
- ❓ 3 armas desde el principio o desbloqueables. Recomendado: desde el principio.
- ❓ Calidades: 4 (roma, usada, nueva, obra maestra) o 3. Recomendado: 4.
- ❓ "Armar y balancear lo que tenemos": con el esqueleto de 3 ranuras ya andando, falta revisar el catálogo
  completo (no solo las 11 ex-definitivas) para que arma/guantes/armadura tengan opciones parejas entre sí.
- ❓ Energía con tiempo de espera, o solo Esencia. Recomendado: solo Esencia.
- ❓ Música de bancos libres o generada con código. Recomendado: bancos libres con créditos.
- ❓ El modo Custom Hero Chaos: ¿el rework de habilidades también lo toca? Recomendado: no, queda como está. El rework
  es de Tower Chaos.
