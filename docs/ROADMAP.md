# Roadmap de Custom Hero Chaos (Tower Chaos)

Lista viva y ordenada. La usa el **modo automático** (tarea programada `mejora-automatica-chc`): toma el primer
ítem `[ ]` que no diga **(decisión)**, lo hace, lo prueba, lo documenta, lo sube y lo marca `[x]` con la fecha y el
commit. Los ítems **(decisión)** esperan que el usuario elija una opción; el modo automático los salta y deja
anotadas las opciones en la sección "Esperando al usuario".

Reglas del modo automático (las mismas de siempre):
- Corre solo si el límite de 5 horas y el semanal del plan están **por debajo del 50%**. Si alguno llega a 50%, frena.
- Un ítem por vez, chico y jugable. Si un ítem es grande, lo parte en pasos y hace solo el primero.
- Sube solo si pasan **todas** las pruebas (`index.html?test`). Si no pasan y no lo puede arreglar, deshace sus
  cambios, anota por qué en el ítem y sigue con otro.
- Balance: se mide (simulación o banco de pruebas) antes y después, y se anotan los números.
- Rioplatense con voseo en código, comentarios, commits e interfaz. Sube `GAME_VERSION` (js/main.js) en cada entrega.
- Anota cada cambio en REWORK.md ("Interfaz y calidad de vida" o su sección) y ESTADO.md.
- No toca el guardado de partidas del jugador, no borra archivos del usuario, no cambia el estilo gráfico elegido.

## 1. El héroe dibujado (lo que más se ve)
- [ ] **Ataques de la espada de frente y de espaldas:** los 3 tajos del combo hacia abajo y hacia arriba con su
      estela, en el estilo de `docs/arte/vistas-frente-espalda.py` y la paleta de `js/towerHeroArt.js`.
- [ ] **Golpe recibido y caída propios:** hoy se arman con el cuadro de quieto (retroceso y tendido).
- [ ] **Parada y esquive de frente y de espaldas.**
- [ ] **El arco en el estilo dibujado:** el mismo encapuchado con arco (quieto, caminar, tensar y soltar; de costado
      primero). Hoy el arco usa el muñeco viejo por poses.
- [ ] **El bastón en el estilo dibujado** (quieto, caminar, lanzar).
- [ ] **La capa toma el color de la armadura** (recolorear la paleta de la capa según la pieza puesta).

## 2. Arreglos y medición
- [ ] **Prueba aleatoria de la Raíz Madre:** a veces falla sola. Fijar la semilla o el margen para que sea estable.
- [ ] **Dificultad medida con el piloto** después de los cambios de la espada (combo con clic, parada): enseñarle la
      parada al piloto y comparar muertes y tiempos por piso contra la marca de REWORK.md §10.
- [ ] **Cuánto pierde quien apunta mal con el arco** (ataque con clic): simular puntería con error y medir el daño.
- [ ] **Cuánto cuesta la cámara más cerca** (VIEW.across 24): medir avisos de ataque vistos a tiempo.

## 3. Torre: contenido
- [ ] **La escena del despertar en el mundo:** las 3 armas clavadas en el piso en vez de la ventana (REWORK.md §1).
- [ ] **Minimapa con colores de pergamino** (REWORK.md §18-19).
- [ ] **Ideas para las criaturas**, de a una (REWORK.md §19, "Ideas para las criaturas").
- [ ] **La criatura que carga tus ítems** (resto de la fase 5, ROGUELIKE.md).
- [ ] **Élites con nombre** y **eventos en el campo** (ROGUELIKE.md).
- [ ] **(decisión) El Mazo** (REWORK.md §15): verbo propio del arma. Opciones a proponer antes de hacerlo.
- [ ] **(decisión) Edictos de la Torre** (REWORK.md §15 D): el toque de cada run.

## 4. Caos de Héroes (modo clásico)
- [ ] **Chakravin `Y`** (proyectiles de habilidad que vuelven + creep Guardián de Hierro), midiendo.
- [ ] **Trampero `P`** (zonas en el piso + creep Saltador), midiendo.
- [ ] **Balance de `mageSpellAmp` en duelos 1v1:** medir con `simulateGame(i, false, 60)`.
- [ ] **(decisión) Ítems nuevos** de DISEÑO.md §7: el usuario decide cuáles entran.

## 5. 3D (prototipo aparte, carpeta `3d/`)
- [ ] **(decisión)** Seguir el 3D o dejarlo en pausa mientras se termina el 2D.

## Esperando al usuario
(El modo automático anota acá las opciones de los ítems **(decisión)**, con una marcada como recomendada.)

## Hecho por el modo automático
(Fecha · ítem · commit · qué se midió.)
