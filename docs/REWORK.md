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

**Hecho (mitad mecánica, 2026-10-07, `js/towerItems.js`/`js/tower.js`/`js/towerUI.js`):** las 3 armas, como pedestal
obligatorio al entrar a la torre (ventana sin botón de cerrar; Esc no la cierra ni se puede pausar por arriba —
`weaponPickOpen` en `towerModalOpen()`, igual que el inventario o la forja; el piloto automático elige Espada sola).
Golpe Certero pasó de ser fijo del Aventurero a ser la habilidad de la Espada (se pierde si cambiás de arma, como
cualquier otra pieza); se sumaron Ráfaga del Arco (pega a 3 enemigos distintos) y Proyectil Arcano (daño mágico,
marca elemento arcano para las reacciones). Como las 3 armas no son de ningún héroe del roster, no entran en
`HERO_TEMPLATES`: `heroOf()` las resuelve aparte (y de paso corrige que el ícono y el color de un arma sin héroe
real crasheaban en un par de lugares). **Falta de esta fase:** la escena del despertar en el mundo (hoy es una
ventana modal, no 3 armas clavadas en el piso que camines a buscar) y el cuaderno/tutorial jugado — eso es
contenido a escribir, más grande, y se dejó para después (fase 6, la Bitácora, ya lo absorbe).

## 2. Habilidades: menos, más claras y con más identidad
**Problema:** hoy podés tener hasta 6 activas más pasivas de 8 piezas. Es confuso, y a mano (estilo Hades) no se puede
manejar tanto.
- **Reducir a 3 ranuras activas** (como Hades: ataque, especial y hechizo, más el esquive):
  1. **Habilidad del arma** (Q o clic derecho): viene con el arma.
  2. **Habilidad de los guantes** (E): la ofensiva o de control que elijas.
  3. **Definitiva de la armadura** (R): poderosa, con carga (se llena pegando, como el Llamado de Hades) en vez de maná.
  - Casco, botas, amuleto y anillos dan **pasivas** y stats (las botas pueden cambiar cómo es el esquive).
  - ❓ Alternativa: 3 activas sin la definitiva aparte. **Recomendado:** 2 activas + definitiva con carga. La definitiva
    con carga es lo que hace épico el final de una pelea.
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

---

## Orden propuesto (cada fase jugable y medida)
1. **Pantalla:** zoom, HUD más chico y menú de pausa con pestañas. Es barato y mejora todo lo que viene después.
2. **Despertar y tutorial:** cuaderno y las 3 armas (espada, arco y bastón, con su habilidad). ✅ parcial: las 3
   armas como pedestal obligatorio, ver más arriba. Falta el cuaderno/tutorial jugado.
3. **Habilidades:** 3 ranuras (2 activas + definitiva con carga) y el catálogo rediseñado, con control y áreas.
4. **Combate estilo Hades:** ataques anunciados en enemigos fuertes, 5 jefes con fases y definitiva.
5. **Economía:** Esencia, desguace (5 piezas → pieza pura con calidad), mejoras permanentes y planos.
6. **Bitácora:** unifica el Códice, el Bestiario, las recetas y el diario.
7. **Música:** ambiente por bioma, capa de combate y tema de jefe.

Las fases 3 y 4 son las más grandes: hay que rehacer pruebas y volver a medir el balance con el piloto (el piloto
también tiene que aprender a esquivar los ataques anunciados).

## Decisiones tomadas (2026-10-07)
- **Ranuras:** 2 activas (arma y guantes) + definitiva de la armadura que se carga pegando.
- **Calidades de fabricación:** las 4 (roma, usada, nueva, obra maestra).
- **Economía:** solo Esencia, sin energía con tiempo de espera.
- **Primera fase:** pantalla, zoom y pausa con pestañas.

## Preguntas abiertas
- ❓ 3 armas desde el principio o desbloqueables. Recomendado: desde el principio.
- ❓ 2 activas + definitiva con carga, o 3 activas. Recomendado: 2 + definitiva.
- ❓ Calidades: 4 (roma, usada, nueva, obra maestra) o 3. Recomendado: 4.
- ❓ Energía con tiempo de espera, o solo Esencia. Recomendado: solo Esencia.
- ❓ Música de bancos libres o generada con código. Recomendado: bancos libres con créditos.
- ❓ El modo Custom Hero Chaos: ¿el rework de habilidades también lo toca? Recomendado: no, queda como está. El rework
  es de Tower Chaos.
