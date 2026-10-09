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
con tecla N o desde la pausa, con las páginas que faltan mostradas como "???". La unión del Cuaderno con el Códice y
el Bestiario en una sola Bitácora (§6) queda para más adelante.

**Hecho (2026-10-08, el despertar en el mundo, `js/towerAwaken.js`):** a pedido ("el inicio es feo"), ya no hay
ventana: las 3 armas están **clavadas en el borde del círculo de piedra** (izquierda, arriba y derecha, a 2 casillas,
así desde el centro ninguna queda "a mano" por accidente), brillando, con su nombre encima. Al acercarte aparece un
cartel de pergamino con el arma, su habilidad y qué hace; **F** (tecla nueva, configurable: "Agarrar") o **clic** la
agarra, y las otras dos se hunden en la piedra. Sin arma no salís del círculo: el personaje se frena y lo dice. La
partida ya no espera (se puede pausar, abrir el Cuaderno, caminar): el primer acto del juego es moverse por el mundo,
como el comienzo de Hades o Death's Door. El piloto agarra la espada solo. Demo: `?demo=tower&at=awaken&near=bow`.

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
- **Jefes con nombre por bioma (2026-10-07, `js/towerBosses.js`):** el guardián de cada piso es el jefe de su bioma
  (en el segundo piso del bioma, "Gran …"), con una mecánica propia sobre las fases:
  | Bioma | Jefe | Mecánica |
  |---|---|---|
  | Bosque | Raíz Madre | Planta 2-4 raíces quietas que la curan 0,6%/s cada una (lazo visible): hay que cortarlas. Raíces en 3 líneas. |
  | Ciénaga | Bruja del Fango | Charcos de veneno que duran 8 s (lastiman y frenan). Desde la fase 2 se esconde en la niebla 3,5 s (invulnerable, casi invisible) y reaparece en otro lado. |
  | Desierto | Reina Escorpión | Se entierra y sale debajo tuyo, y barre con la cola en cono. Desde la fase 2 la tormenta te arrastra una casilla hacia ella cada 1,3 s. |
  | Nieve | Wyrm de Escarcha | Aliento en cono que congela 1 s y deja el piso helado 10 s (−45% de velocidad). Desde la fase 2, lluvia de carámbanos. |
  | Volcán | Señor de la Ceniza | Un sector (un cuarto alrededor suyo) se marca y arde 6 s: hay que cambiar de sector. Desde la fase 2, meteoritos. |
  **Zonas que duran en el piso** (veneno, hielo, lava): sistema nuevo, reutilizable; el piloto las evita.
  **Medido** (piloto): con la vida de los jefes de Custom Hero Chaos (1400-2000) morían en 5-60 s, antes de mostrar sus
  fases, y las runs salieron sin muertes (Espada 75 min, Bastón 112). Igualados a 4500 de vida y 40 de ataque: Espada
  137 min y 5 muertes (jefes de 32 s a 3 min; la Bruja del Fango era la más dura para el cuerpo a cuerpo, por eso su
  niebla bajó a 2,5 s y reaparece a 3-5 casillas), Bastón 92 min sin muertes (jefes en 13-33 s). **Queda abierto:** el
  Bastón quedó bastante más fuerte que la Espada contra los jefes.

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

**Hecho (2026-10-08, `js/towerLogbook.js`):** un solo libro con pestañas (✏️ Cuaderno · 📜 Códice · 🐾 Bestiario) en
vez de tres ventanas. N, J y K abren el libro en su pestaña; la misma tecla lo cierra y otra cambia de pestaña (como el
diario de Hades o el Compendio de Hollow Knight). El **Bestiario se guarda entre runs**: "Esta run" muestra las
criaturas de ahora y "Colección" todas las que viste alguna vez (hasta 400), con en cuántas runs aparecieron y cuántas
mataste. Queda para después: recetas y planos (cuando existan) y una pestaña de armas (ver §15).

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

## 8. Sensación de las armas, tiradores y traspaso (2026-10-08)
Pedido del usuario: "mejorar el gamefeel de las clases: sin animación de combate se siente tosco y esperar a que se
cargue la Q es tosco; enemigos que disparen tipo Enter the Gungeon; mejorar cómo se siente la espada; el arco, poder
apuntar y cargar la flecha; las armas que suban de nivel y después aparezca una mejor, que se puedan fundir para pasar
un porcentaje de sus stats a otro objeto, con un costo. Todo con balance."

**Lo que encontramos:** las 3 armas iniciales no tenían efecto propio: la espada se dibujaba como un **puñetazo**. Y la Q
tardaba 6-7 s en volver (~4,5 s con el −25% general), así que casi siempre no había nada que apretar.

**Las 3 armas (`js/towerFeel.js`):**
- **Espada · Combo de Tajos:** cada Q es un tajo en arco hacia el cursor (paso adelante, como Hades). Tercer tajo =
  remate ×2 que empuja y frena el tiempo un instante. Entre tajos 0,375 s; después del remate, 1,35-1,1 s. Sin maná.
  Mantener la Q encadena solo. Pega entero al más cercano y 60% al resto del arco. **Desvía los proyectiles** que agarra.
  El ataque automático también es un tajo en arco (antes, puñetazo). Puntitos bajo el héroe: cuántos tajos van.
- **Arco · Tiro Tensado:** mantener Q tensa (0,9 s; caminás 45% más lento y no disparás solo) con la línea de tiro
  hacia el cursor que se afina y se pone dorada; al soltar, de ×0,5 (al toque) a ×2,3 tensado, que **atraviesa** a
  todos. Soltar dentro de 0,2 s de tensarse: **tiro perfecto** +30% (la "recarga activa" de Gears of War). 6 de maná.
  Las flechas se dibujan como flechas y las paredes las frenan.
- **Bastón · Saeta Arcana:** orbe apuntado que explota al tocar al primero (mitad del daño a los de alrededor) y marca
  arcano. 14 de maná, 2,2-1,7 s.
- Las Q que se tiran seguido dan menos experiencia por tiro a su pieza (`castXp`), para que el arma no suba volando.

**Medido** (60 s contra muñecos, daño por segundo sin Q → con Q, el piloto usándola):

| Arma | Solo | Grupo de 4 | Límite |
|---|---|---|---|
| Espada | 23 → 34 (+48%) | 23 → 65 | el ritmo (sin maná), pero hay que estar cuerpo a cuerpo |
| Arco | 19 → 24 (+26%; con tiros perfectos ~+50%) | 18 → 51 (atraviesa) | maná: ~75 s seguidos |
| Bastón | 17 → 26 (+53%) | 17 → 39 | maná: se vacía en ~60 s |

**Tiradores (`js/towerBullets.js`):** lo que el usuario recordaba de Enter the Gungeon se llama *bullet hell*
(danmaku): proyectiles lentos con formas que se leen. Patrones: **ráfaga** (3 seguidas que corrigen la puntería),
**abanico** (3), **escopeta** (6 de corto alcance), **anillo** (10) y **espiral**. Reglas copiadas de Gungeon: cada
tirador **avisa** (aro rojo que se cierra, 0,45 s), las balas son lentas y se esquivan caminando, **el esquive las
atraviesa** y las paredes las frenan. Siempre el mismo color de peligro (rojo; naranja en modo daltonismo).
- Rol nuevo **Tirador** (siempre uno por bioma, en el primer piso) con ráfaga, abanico o escopeta; se mueve de costado
  entre disparos y no te deja acercarte. Rol nuevo **Rociador** (segundo piso de cada bioma) con anillo o espiral.
- **Jefes:** desde la fase 2 tiran un anillo cada 7 s; en la 3, además, una espiral cada 10 s (35% de su ataque por bala).
- El piloto lee las balas (predice por dónde pasan) y se corre o se tira con el esquive.
- Página nueva del Cuaderno: "Lluvia de proyectiles".

**Traspaso (`js/towerTransfer.js`, en el Herrero):** la pieza vieja se consume y la nueva (misma ranura) hereda **el 50%
de su experiencia** (sube niveles y elige cómo crece en la forja) y el 50% de sus mejoras de stats forjadas. La
habilidad no pasa (para eso está imbuir). Costo: 30g × piso + 25g por nivel de la vieja (piso 3, nivel 6: 215g, más o
menos una pieza mágica). Nunca conviene más que seguir con la vieja: perdés la mitad y pagás. El piloto lo usa si le
sobra oro. Vista previa con los niveles que sube. Página nueva del Cuaderno: "Nada se pierde".

**Partidas completas con el piloto** (con tiradores y balas de jefes): Espada 105 min, 0 muertes; Arco 137 min, 0
muertes; Bastón 133 min, 0 muertes. El primer jefe con espada pasó de 436 s a 66 s. Jefes lentos para revisar: la Bruja
del Fango (piso 3, 251-493 s con espada y arco) y la Gran Raíz Madre con bastón (piso 2, **1366 s**: el piloto a distancia
no corta las raíces que la curan). Sin muertes en las 3: el piloto esquiva bien las balas; un jugador va a recibir más. Nota: el piloto cambia el arma inicial por la primera
mejor que encuentra (en el piso 1), así que las partidas completas miden más el equipo que el arma inicial; por eso
la medición de arriba contra muñecos.

## 9. Jefes lentos: las raíces y el piloto (2026-10-08)
Pedido: arreglar los jefes que tardaban (Gran Raíz Madre 1366 s con bastón, Bruja del Fango 250-500 s).

**Medido** (partidas del piloto hasta el piso 4, registrando cada pelea):
- **El reloj mentía en parte:** contaba desde que el jefe te veía, aunque el piloto se fuera a limpiar el resto del mapa
  y volviera mucho después (una "pelea" de 592 s tenía 566 s lejos del jefe). La medición nueva cuenta solo el tiempo a
  9 casillas o menos del jefe. Con eso, la Bruja del Fango ya estaba bien: 64-106 s, 10-28 s escondida.
- **Las raíces sí eran un problema real:** curaban 0,6%/s cada una, sin techo, y si las cortabas todas rebrotaban a los
  5-6 s. Con un personaje flojo se curaba más rápido de lo que recibía: **hasta 291% de su vida** en una pelea, y el
  piloto, al ver que la vida no bajaba en 25 s, abandonaba la pelea 30 s y se iba.

**Cambios (`js/towerBosses.js`, `js/tower.js`):**
- Las raíces curan 0,45%/s, **se secan solas a los 16 s** (un aro muestra cuánto les queda) y **brotan solo al empezar
  cada fase** (2, 3 y 4). Curación total acotada: ~22% por fase si no cortás ninguna.
- Son de madera: armadura 4 (eran Acorazados, 12) y **el ataque automático les pega primero** si están a tiro.
- Se ve la curación: savia (puntitos verdes) que corre por el lazo hacia el jefe, ✚ arriba de cada raíz y "+N" en el
  jefe. Su descripción lo dice ("cortalas, o se secan solas").
- El piloto **ya no abandona al guardián** por "pelea que no avanza" (escondido o curándose, igual hay que matarlo).

**Después:** Raíz Madre 21-58 s y 10-24% curado; Bruja del Fango 64-106 s; Reina Escorpión 31-85 s. Sin muertes.

## 10. Dificultad medida con reflejos humanos (2026-10-08)
El piloto esquivaba casi todo y no moría nunca: servía para medir tiempos, no dificultad. Nuevo modo **`aiReflex =
'human'`** (`js/towerTelegraph.js`): reacciona 0,35 s tarde a cada aviso o bala (reacción visual con la pantalla
cargada), no ve 1 de cada 5 y el esquive le sale 6 de cada 10 veces. Se registra de dónde viene el daño y quién mata.

| Arma | Minutos | Muertes | Notas |
|---|---|---|---|
| Espada | 240+ (no terminó) | 30 | 29 en el piso 6: **espiral de muertes** (ver abajo) |
| Espada | 116 | 0 | |
| Espada | 121 | 1 | |
| Arco | 98 | 0 | |
| Bastón | 109 | 1 | en el piso 1, un tirador |
| Bastón | 137 | 3 | las 3 en el piso 1, tiradores con escopeta |

**De dónde viene el daño recibido:** golpes comunes 70-77%, ataques anunciados 18-24%, balas 4-8%, zonas 0-1%. Las
balas no son lo que mata en general; **la escopeta en el piso 1 sí** (6 perdigones × 45% del ataque: un tirador "Gran"
de cerca sacaba 35 de 215 por descarga, más que un arquero común). → Escopeta: 5 × 33% (21 por descarga).

**La espiral de muertes:** al morir perdés la mitad de los puntos de stats; quedan en tus restos, pero si morís otra vez
antes de buscarlos, los viejos se pierden para siempre. Cada muerte te deja más débil para el mismo piso. Con mala suerte
de equipo, el piloto humano murió 29 veces seguidas en el piso 6. Queda configurable (`DEATH = { lose, stack }` en
tower.js). **Decisión del usuario: los restos se suman** (`stack: true`): si morís otra vez antes de buscarlos, los
restos viejos se juntan con los nuevos. Se sigue perdiendo la mitad al morir (hay que volver a buscarla), pero nunca se
pierde nada para siempre: se corta la espiral.

**Confirmado con datos** (3 partidas más con Espada y reflejos humanos, ya con los restos que se suman): 98 min/1
muerte, 185/2 y 93/2. Las tres terminan la torre; nunca más de 2 muertes ni restos de más de 83 puntos. Quién mata ahora:
sobre todo **campeones** con afijos de resistencia y velocidad (Acorazado, Blindado, Veloz, Regenerador) en los pisos
6-10, y lo del jefe final. Daño recibido: comunes 69-78%, anunciados 15-23%, balas 4-7%. La de 185 min es lenta (el
diseño apunta a 120-160): vigilar a los campeones de los pisos 6-8 si se repite.

## 11. Luz y clima (2026-10-08, `js/towerAtmos.js`)
Para que el mundo se sienta vivo (referencias: las fogatas de Don't Starve y Valheim, que son luz y refugio a la vez; el
clima de Hyper Light Drifter, pura atmósfera que no tapa la pelea).
- **Luces:** el pueblo tiene una fogata en la plaza y ~8 antorchas; la puerta del laberinto, dos antorchas; el herrero,
  su fragua; en el campo hay ~4 **campamentos abandonados** con fogata; las cuevas, antorchas en las paredes. De noche
  abren un hueco en la oscuridad y tiñen de naranja con parpadeo. Las **balas enemigas brillan de noche** (se leen) y la
  lava del volcán también.
- **Fogata:** de noche, al lado de una y sin nadie persiguiéndote, recuperás 1,2% de vida por segundo (un respiro en la
  parte más peligrosa del día). De día es solo un campamento. Página nueva del Cuaderno: "Una fogata".
- **Clima por bioma, solo visual** (los efectos de clima ya existían en BIOMES): bosque, hojas y luciérnagas de noche;
  ciénaga, llovizna y bancos de niebla; desierto, ráfagas de arena; nieve, nevada; volcán, ceniza y brasas que suben.
  La intensidad va y viene. De noche se ve menos, salvo lo que brilla. **Se apaga en la pausa** (Opciones → 🌧 Clima).
- No se mide balance: la fogata es chica y está lejos del camino; el resto es visual.

## 12. Los golpes comunes avisan (2026-10-08, `js/towerWindup.js`)
Medido en §10: el 70-77% del daño recibido eran golpes comunes, que pegaban al instante (no había nada que esquivar
fuera de los fuertes). Como en Hades, ahora cada golpe común se **prepara**:
- **Cuerpo a cuerpo:** 0,4 s (0,5 los grandes), con un arco rojo en el piso hacia vos y un **"!" rojo** sobre la cabeza que
  crece. Si salís de su alcance o esquivás, falla ("¡esquivado!" la primera vez). Si lo aturdís mientras se prepara, se
  cancela.
- **A distancia:** 0,35 s con una línea roja punteada de puntería y después **una flecha** (más rápida que las balas de los
  tiradores, 9 casillas/s) que se esquiva y que las paredes frenan; si pega, aplica los rasgos del bicho (veneno, fuego…).
- **Mismo ritmo:** la preparación se descuenta del tiempo entre ataques. Los jefes y guardianes siguen con lo suyo.
- **El piloto:** con arma a distancia se corre de los tajos que le apuntan; con cuerpo a cuerpo los aguanta (como haría
  una persona con espada). Las flechas las lee como cualquier bala.

**Medido** (piloto con reflejos humanos, igual que en §10):

| Arma | Antes (§10) | Ahora |
|---|---|---|
| Espada | 93-185 min, 0-2 muertes (sin contar la espiral) | 117 min, 0 muertes |
| Arco | 98 min, 0 | 108 min, 0 |
| Bastón | 109-137 min, 1-3 | 155 min, 1 |
| (segunda tanda) | | Espada 82/0 · Arco 93/0 · Bastón 90/0 |

Daño recibido: comunes **50-56%** (antes 69-78%), balas y flechas 17-24% (antes 4-8%: ahora incluyen las flechas de los
arqueros), anunciados 26%. La dificultad general queda parecida (es lo buscado: el mismo daño, pero ahora se puede
evitar jugando bien); la diferencia la va a sentir el jugador, que el piloto esquiva poco cuerpo a cuerpo.

**Ojo:** con las 6 partidas, 1 sola muerte en total y 5 de 6 entre 82 y 117 min (el diseño apunta a 120-160 con algunas
muertes). Con el piloto humano el juego quedó más fácil que lo buscado: anotado como decisión pendiente (subir la
dificultad o dejarlo así, ver ESTADO.md).

## 13. Campeones legibles (2026-10-08, `js/towerChampions.js`)
Los campeones fueron los que más mataron con reflejos humanos, y su nombre largo no se lee peleando. Como Diablo III y
Path of Exile:
- **Un ícono por afijo** sobre la barra de vida, siempre del mismo color y forma: » Veloz, ⚔ Feroz, ⛨ Blindado,
  ♥ Vampírico, ♨ Ardiente, ❄ Gélido, ✚ Regenerador, ✹ Explosivo.
- **Con el mouse encima**, un cartel con qué hace cada uno (en la pantalla, encima de la niebla, sin salirse del borde).
- El Cuaderno lo explica la primera vez ("Los marcados").
- **Combos más justos:** el Regenerador **deja de curarse 2,5 s con cada golpe** que recibe (como en Diablo: se le gana
  pegándole sin parar; su ícono se apaga mientras está cortado) y ya no sale junto con Blindado ni con Vampírico (la
  pared que se cura sola, de los que más mataban).

## 14. Dificultad: los enemigos crecen con cada piso (2026-10-08)
Decisión del usuario: subir la dificultad (con el piloto humano, 1 muerte cada 6 partidas y 82-117 min). Medido con el
piloto de reflejos humanos, 3 partidas por variante (espada, arco, bastón):

| Variante (enemigos comunes; jefes sin cambios) | Minutos | Muertes | Vida mínima del héroe |
|---|---|---|---|
| +12% de daño desde el piso 4 | 106 (espada) | 0 | — |
| +22% de daño y +15% de vida desde el piso 4 | 73-81 | 0 | ≥ 87% en los pisos 7-10 |
| +4%/piso de daño y +10%/piso de vida | 209 (espada) | 5 (piso 9, campeones) | — |
| +4%/piso de daño y +6%/piso de vida | 80 · 152 · ~160 | 0 | — |
| +7%/piso de daño y +6%/piso de vida | 153 · 105 · 115 | 0 | 45% |
| **+12%/piso de daño y +6%/piso de vida (queda)** | 58 · 93 · 93 | 0 | **6% y 1%** (al borde) |

**Queda:** daño de los enemigos comunes ×(1 + 0,12 × (piso − 1)) (piso 10: ×2,08) y vida ×(1 + 0,06 × (piso − 1))
(piso 10: ×1,54), en `TOWER.danger`/`TOWER.dangerHp` (tower.js). El piso 1 no cambia; jefes, guardianes y raíces tampoco.

**Lo que aprendimos:** el héroe crece mucho más rápido que los enemigos (del piso 1 al 5, su ataque ×14 y su vida ×9;
la vida de un creep, ×5) y **la suerte con el botín pesa más que cualquier número de los enemigos**: con los mismos
valores, una partida dura 58 min y otra 153. Las partidas rápidas suelen terminar con armas de mago raras. El piloto
ahora queda al borde de morir (1-6% de vida) pero pelea ordenado (de a uno, se aleja a tiempo); una persona va a morir
más. Próximo paso sugerido: achicar la diferencia entre una partida con suerte y una sin suerte (cuánto suma el botín).

## 16. ¿De dónde sale la diferencia entre runs? (2026-10-08)
Pedido: achicar la suerte del botín (§14: con los mismos valores, runs de 58 a 153 min). Medido con el piloto de reflejos
humanos, registrando en cada piso nivel, ataque, vida, arma, piezas raras y de dónde salen los bonus permanentes:

| Run | Minutos | Muertes | Ataque en el piso 10 | Bonus permanente por bajas |
|---|---|---|---|---|
| Espada → Hacha | 185 | 6 (las 6 en el piso 10) | 363 | +240 de daño (Grieta del Vacío) |
| Arco → Rifle | 98 | 0 | 164 | ninguno |
| Bastón → Rayo | 107 | 0 | 163 | **+757% de crítico** (Masacre) |

**Lo que encontramos:**
1. **No es el botín común:** con ~13 piezas por piso, a partir del piso 3 todas las runs tienen el equipo lleno de raras.
   El ataque tampoco decide la duración: la run con más del doble de ataque fue la más lenta.
2. **Las muertes son las que más tiempo se comen:** al morir renacés en el piso 1 y volvés a subir. 6 muertes en el piso
   10 = 47 minutos perdidos (~8 min cada una). Eso explica casi toda la diferencia. → Decisión pendiente (ver abajo).
3. **Error de diseño heredado:** las habilidades de los héroes que suman "+X permanente por cada baja" (pensadas para las
   rondas de Custom Hero Chaos) en la Torre, con ~2400 bajas por run, daban +240 de daño o +757% de crítico. →
   **Arreglado:** tope por habilidad y por run (`TOWER_PERM_CAP`, progression.js): daño +40, vida +300, atributos +15,
   armadura +8, crítico +15%, vel. de ataque +20%, robo de vida +10%, regeneración +10/+5. Al llegar al tope, un mensaje
   lo avisa. El escalado propio del Aventurero (vida por bajas, +1150-1235 por run) no tiene tope: es igual para todos.
4. **Decisión del usuario: piedras de regreso** (`js/towerWaystone.js`). Seguís renaciendo en el círculo de la base, pero
   ahí hay una piedra rúnica: con F o clic aparecés en la entrada de cualquier piso al que ya llegaste (como las hogueras
   de Dark Souls o los waypoints de Diablo). La lista marca dónde están tus restos y cuál es el piso más alto. Morir pasa
   a costar ~1 minuto en vez de ~8. El piloto la usa solo al renacer (va al piso de sus restos). Página del Cuaderno: "La
   piedra que recuerda".
5. **Las armas de los héroes, parejas:** con la piedra, la diferencia que quedaba era la velocidad de limpiar: el piloto se
   queda con el arma de mejor calidad y algunas de mago pegaban la mitad por segundo (Vara Helada 6,3 contra Hacha 12,6;
   la velocidad de ataque multiplica todo). Medido: espada→hacha 56 min, arco→Vara Helada 145 min, sin muertes. → Báculo,
   Vara Helada, Matraz y Rayo pasan a velocidad 0,85 y daño 10 (~8,5 por segundo); cuerpo a cuerpo 10,5-12,6, rifle 9,4.

## 15. Más armas y el caos de cada run (propuesta, 2026-10-08)
Pedido del usuario: "agregar más armas y que el gameplay se base en esas armas (ballesta, mazo, guantes de casteo,
libros de hechizos); después, cómo escalar las cosas y mezclarlas para inventar mecánicas al azar y darle ese toque
caótico a cada run".

### A. Familias de armas: cada una con un verbo propio
La regla de diseño que ya funcionó con las 3 primeras (§8): **cada arma tiene un verbo** que se juega distinto con la
misma tecla Q, y un **límite** propio (ritmo, maná, munición, carga). Así cambiar de arma cambia cómo pensás la pelea.

| Arma | Verbo (Q) | Límite | Ataque básico | Identidad |
|---|---|---|---|---|
| Espada ✅ | combo de 3 tajos, el remate empuja y desvía balas | el ritmo | tajo en arco | cuerpo a cuerpo ágil |
| Arco ✅ | tensar y soltar, tiro perfecto | maná | flecha | puntería |
| Bastón ✅ | orbe que explota en área | maná | orbe | hechicero de área |
| **Ballesta** | dispara un virote pesado que **atraviesa y empuja**; cargador de 3; se recarga sola o con **recarga activa** (tocar Q cuando la aguja pasa por la zona dorada: recarga al instante) | munición y recarga | virote lento y fuerte | ráfagas con pausa (Gears of War, Enter the Gungeon) |
| **Mazo** | **mantener para cargar** un golpe al piso: onda que **aturde** en área; mientras carga, recibe menos daño. Golpe cargado contra un enemigo que se está preparando: lo **interrumpe** (sinergia con §12) | el tiempo de carga | golpes lentos que aturden un instante | control y peso (Monster Hunter, Hades: el escudo) |
| **Guantes de casteo** | cada golpe cuerpo a cuerpo **carga una runa** (hasta 3); Q gasta las runas: 1 = chispa, 2 = onda, 3 = explosión. Las runas toman el **elemento** del último golpe | hay que pegar para cargar | puñetazos rápidos | mago cuerpo a cuerpo (combo → hechizo) |
| **Libro de hechizos** | el libro trae **3 páginas** (hechizos al azar del catálogo, cada libro distinto); Q lanza la página abierta y **pasa a la siguiente**. Se consiguen páginas sueltas y se cambian en el Herrero | maná y el orden de las páginas | orbe débil | variedad: **el arma del caos** |

Otras para después: **Lanza** (estocada en línea de 3, contraataque si esquivás justo), **Látigo** (agarra y tira hacia
vos), **Escudo + espada corta** (bloquear a tiempo devuelve el golpe).

### B. Cómo se mezcla todo: runas que se enganchan a eventos
La clave de los juegos que inventan mecánicas cada run (Binding of Isaac, Noita, Risk of Rain, las bendiciones de Hades)
es que los modificadores **no son de un arma**: se enganchan a **eventos** que cualquier arma produce. Así cada combinación
es nueva y nadie las diseña una por una.

- **Eventos:** golpe, proyectil disparado, impacto de área, crítico, muerte de un enemigo, esquive, aturdir, recibir daño.
- **Runas** (botín, santuarios, jefes; **elegís 1 de 3** como en Hades → hay azar pero vos decidís). Ejemplos:
  - *Rebote:* tus proyectiles rebotan a otro enemigo. *Fisión:* se dividen en 3 al impactar.
  - *Tercer golpe:* cada 3er golpe cae un rayo. *Estela:* al esquivar dejás una mina.
  - *Contagio:* los enemigos que matás explotan con tu elemento. *Eco:* tu Q se repite al 50% 1 s después.
  - *Imán:* tus áreas atraen. *Escarcha:* los aturdidos se congelan. *Vampiro:* los críticos curan.
- **Por qué sale caótico:** Rebote + Ballesta = virotes que atraviesan Y rebotan; Fisión + Bastón = el orbe explota en 3
  orbes que explotan; Tercer golpe + Guantes = rayos que cargan runas que tiran explosiones; Eco + Libro = cada página
  dos veces. Con ~25 runas y 7 armas hay cientos de combinaciones que nadie diseñó a mano.
- **Elementos y reacciones** (ya existen: Derretir, Plasma, Sobrecarga, Plaga…): las runas pueden dar elemento a tu arma
  (*Brasa*: tus golpes queman) y las reacciones aparecen solas al mezclar.

### C. Cómo escala (sin romperse)
Tres ejes, cada uno con su freno:
1. **El arma** sube de nivel y se forja (ya existe). Freno: el traspaso pasa solo el 50%.
2. **Las runas se apilan**: la 2ª copia de la misma suma menos (rendimiento decreciente: 100%, 60%, 40%…) y cada runa
   tiene un "presupuesto de poder" (las que pegan más, salen menos seguido o cuestan algo: maná, vida).
3. **Sinergias:** 2 runas con la misma etiqueta (PROYECTIL, ÁREA, GOLPE, ELEMENTO) prenden un bonus de familia, y algunas
   parejas concretas tienen un **dúo** con nombre (como las bendiciones dobles de Hades): *Tormenta de Agujas* (Fisión +
   Rebote), *Eclipse* (Eco + Contagio)…
- Se mide como todo lo demás: piloto con reflejos humanos, que también elige runas. Hallazgo de §14: la suerte con el
  botín ya pesa demasiado; por eso las runas se **eligen** (1 de 3) en vez de caer al azar, y el poder total por piso
  queda acotado.

### D. El toque de cada run: los Edictos de la Torre
Al empezar una run se sortean **2 reglas globales** que se ven en el pergamino de arriba y en la Bitácora, por ejemplo:
"los proyectiles rebotan en las paredes", "todo enemigo que muere explota", "de noche sos invisible para los lejanos",
"cada cofre tiene un mímico", "las fogatas dan una runa". Una a favor y una en contra, para que cada run se sienta distinta
aunque uses la misma arma (como los Pactos de Hades o las Variantes de Dead Cells, pero al azar).

### Decisiones del usuario (2026-10-08)
- **Todavía ninguna arma nueva:** queda la propuesta; se arranca cuando el usuario elija con cuál.
- **Se consiguen solo como botín:** siempre se empieza con espada, arco o bastón; las nuevas aparecen durante la run.
- **Orden:** primero las armas (de a una, medidas), después las runas, sinergias y Edictos.

### Orden propuesto
1. Las 4 armas nuevas, de a una y medidas (empezar por la que elijas).
2. Las runas con eventos (10-12 para arrancar) + elegir 1 de 3.
3. Sinergias y dúos.
4. Edictos de la Torre.
5. Pestaña "Armas y runas" en la Bitácora (lo descubierto, como el Códice).

## Orden propuesto (cada fase jugable y medida)
1. **Pantalla:** zoom, HUD más chico y menú de pausa con pestañas. Es barato y mejora todo lo que viene después.
2. **Despertar y tutorial:** cuaderno y las 3 armas (espada, arco y bastón, con su habilidad). ✅ — las 3 armas
   como pedestal obligatorio y el Cuaderno con sus 7 páginas, ver más arriba. ✅ La escena en el mundo (2026-10-08):
   las 3 armas clavadas en el círculo, se camina hasta una y se agarra con F o clic.
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
- ✅ **Barra del héroe compacta** (estilo Hades): placa de pergamino abajo al centro, encima del mapa, con retrato y
  nivel, vida y maná finitas, Q/E/R con ícono grande y el **esquive (ESP) con su recarga** (antes no se veía); los
  estados activos van en chips arriba de la placa. Pasivas y equipo, en sus ventanas. El mapa ganó ~150 px de alto y
  la barra del jefe sube para no chocar.
- ✅ **Comparar con lo equipado** (como Diablo): el detalle de cada pieza que no tenés puesta (bolsa, tienda,
  herrero) muestra qué ganás (▲ verde) y qué perdés (▼ rojo) respecto de la que reemplazaría: stats, daño, velocidad y
  alcance del arma, si pasás a pelear a distancia, y el cambio de habilidad. Con dos anillos, contra el peor.
- ✅ **Mapa del piso (M)** a pantalla completa, con lo descubierto y referencias: vos, pueblo, mercader, herrero,
  laberinto, escalera, guardián, santuarios, cuevas, eventos, cofres, tus restos y el portador, más el objetivo. No
  frena la partida (como Diablo); M o Esc lo cierran. También desde la pausa.
- ✅ **Botas y anillos salen en el botín** como piezas de stats (20% de las piezas). Desde la fase 3 ninguna habilidad
  iba a esas ranuras y solo aparecían sin alma, que el Herrero no podía imbuir. Ahora sin alma solo en casco, coraza,
  guantes y amuleto; se funden las 6. Medido: Espada 88 min/1 muerte, Bastón 120/4 (antes 100-168): quizás algo más
  fácil, dentro del ruido de una run por arma; vigilar si se suma más poder.
- ✅ **Elegir a mano las 5 piezas a fundir:** "Elegir" abre las piezas de esa ranura, ya marcadas las que elegiría el
  Herrero; cada clic marca o desmarca, y las chances y la garantía se actualizan al instante.
- ✅ Las notas en amarillo de los detalles (chances, garantía, forjado) no se leían sobre el pergamino: pasaron a ocre.
- ✅ **Teclas configurables** (pausa → ⌨️ Teclas, `js/keymap.js`): moverse, esquive, las 3 habilidades, las ventanas, la
  tienda, el mapa, las automáticas y el piloto. Clic en la acción y apretás la tecla; si otra la usaba se intercambian
  y las habilidades equipadas siguen a su tecla. Flechas y Esc fijos. La barra del héroe y la ayuda muestran las elegidas.
- ✅ **Accesibilidad** (pausa → Opciones): zonas de ataque en azul y naranja para daltonismo, tamaño de los textos de
  combate (80-160%) y escala de la interfaz (80-140%: barra del héroe, ventanas, mensajes y franja de arriba). Se guardan.
- ✅ **Filtro de botín** (pausa): levantar todo, mágico o mejor, o solo raro. Lo filtrado queda en el piso, apagado. El
  piloto automático levanta todo.
- ✅ **El Cuaderno explica lo nuevo** con 5 páginas más, la primera vez que pasa: el suelo que avisa (ataques anunciados),
  la Esencia, el Herrero, fundir y dominar un poder.
- ✅ **Música en el menú y en Custom Hero Chaos:** el pueblo en el menú y las fases tranquilas, combate en oleadas y
  duelos, jefe en los jefes de ronda. Volumen y opción de música en la pausa de los dos modos.
- ✅ **La Q de las armas iniciales se ve y se siente** (2026-10-08): tajos en arco, línea de tiro que se tensa, flechas con
  forma de flecha, puntitos del combo, el remate frena el tiempo; los tiradores avisan con un aro rojo y sus balas son
  siempre del mismo color de peligro.
- ✅ **Tecla para agarrar (F)**, configurable, con el cartel del arma al acercarte (2026-10-08).
- ✅ **La ranura Q muestra el arma** (2026-10-08): el arco, una barra que se llena al tensar (dorada tensado del todo; la
  ranura brilla en el momento del tiro perfecto); la espada, 3 puntitos con el paso del combo (el del remate se ilumina
  cuando toca). Así se juega mirando la barra, no solo al héroe.
- ✅ **Avisos de balas fuera de la vista** (2026-10-08, `drawOffscreenThreats` en towerBullets.js): un chevrón rojo en el
  borde, del lado de donde viene una bala que va a pasar cerca en menos de 1,6 s (más opaco cuanto antes llega), y un aro
  rojo para un tirador fuera de vista que está por disparar. Una marca por dirección (16), para no llenar el borde.
- ✅ **Opción para apagar el clima** (partículas) en la pausa, para quien prefiera la pantalla limpia (2026-10-08).
- ✅ **Íconos de afijo de los campeones** y su cartel al pasar el mouse (2026-10-08, §13).
- Lista al día. Próximas ideas de interfaz cuando aparezcan (se anotan acá).
- ✅ (antes) Pantalla grande con zoom, mensajes flotantes, aviso de puntos para repartir y barra del jefe abajo.

**Pendiente (de más a menos impacto):**

## Decisiones tomadas (2026-10-07)
- **Al renacer (2026-10-08):** piedras de regreso en el círculo de la base hacia cualquier piso ya alcanzado (§16).
- **Armas nuevas (2026-10-08):** solo como botín; primero las armas y después las runas (§15). Todavía sin elegir la primera.
- **Al morir (2026-10-08):** los restos se suman si morís otra vez antes de buscarlos (nada se pierde para siempre).
- **Estilo ASCII descartado:** se probó un filtro que convertía el mundo en caracteres (referencia: el MMORPG ASCII de
  ansenjeo) y al usuario no le gustó cómo quedaba. Se sacó entero; la Torre sigue en tinta y pergamino.
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
