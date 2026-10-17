# Pedido: el caballero en pixel art, con todas sus animaciones

Para pedírselo a una herramienta de imágenes (Midjourney, DALL·E, Leonardo, PixelLab, Retro Diffusion…) o a un
artista. El texto del pedido va en inglés porque esas herramientas lo entienden mejor; abajo está en castellano qué pide
cada parte. Con el formato de acá, el juego lo carga directo (un script recorta la hoja en cuadros, como se hizo con
`heroe-hoja-original.jpg` → `extraer-sprites.py`).

## Consejos antes de pedir
- **Las herramientas de IA casi nunca mantienen el mismo personaje en 80 cuadros.** Lo que mejor funciona: primero pedir
  solo la **hoja de referencia** (parte 1) hasta que guste, y después pedir **una animación por vez** (parte 2),
  pegando la referencia como imagen y el bloque de esa animación.
- Pedir siempre **PNG con fondo transparente, sin achicar ni suavizar**. Si la herramienta devuelve la imagen agrandada
  (cada píxel como un cuadradito de 4×4 u 8×8), sirve igual: el script la reduce.
- Si sale con fondo de color, que sea **un solo color plano** (no degradé ni ruido), así se saca fácil.
- **Un artista** puede tomar este archivo tal cual: tiene medidas, paleta, cuadros y qué pasa en cada uno.

---

## Parte 1: hoja de referencia (copiar y pegar)

```
Pixel art character reference sheet for a 2D top-down action roguelike (similar in feel to Hades and Hyper Light
Drifter). One character shown in 3 views side by side: SIDE view facing right, FRONT view facing the camera, BACK
view facing away. Same size and proportions in all three.

Character: a small knight. Silver steel helmet with a narrow horizontal visor slit (no face visible, two small glowing
light-blue eyes #9ad1ff in the slit) and a red plume on top (#c0392b). Dark blue cape (#2f4a7a) hanging from the
shoulders down to the knees. Steel chest plate and gauntlets, brown leather belt and tunic, gold trim and buckles
(#c9a227), dark steel greaves and boots. Holds a straight longsword in the right hand, blade pointing down at rest.
Heroic but compact proportions: head about 1/4 of the body height (not chibi, not big-headed).

Style rules (very important):
- True pixel art, crisp hard edges, NO anti-aliasing, NO blur, NO gradients, NO dithering noise.
- Character height: 28 pixels from the feet to the top of the helmet (plume can add 3-4 px).
- 1-pixel dark outline around the whole silhouette, color #110d0b.
- Light comes from the top-left; 2-3 shades per material.
- Limited palette, max 24 colors, built around: steel #9aa2ab / #6b7280 / #d8dde3, cape #2f4a7a / #1e3050 / #46679e,
  plume #c0392b / #8e2a20, gold #c9a227 / #8a6d1f, leather #6b4a2b / #4a321d, outline #110d0b.
- Transparent background, PNG, exported at 1x (one image pixel = one sprite pixel).
- Each view inside a 64x64 cell, feet touching y = 58, character centered horizontally.
```

**Qué pide:** el caballero de costado, de frente y de espaldas, con las medidas del juego (28 píxeles de alto, celdas de
64×64 con los pies siempre a la misma altura), contorno de 1 píxel y la paleta del caballero actual.

---

## Parte 2: la hoja de animaciones

Cada animación es **una fila**, con los cuadros de izquierda a derecha, todos en celdas de **64×64** y con los pies en la
**misma línea (y = 58)**. De costado mira a la **derecha** (a la izquierda se espeja en el juego). Al lado de cada
cuadro está en qué **tiempo** va (P = preparación, A = activo, el momento en que pega o bloquea, R = recuperación); el
juego usa esa división para saber cuándo pega el golpe.

### Bloque común (pegar antes de cada animación)
```
Same knight as in the reference image, same palette and proportions. Pixel art sprite sheet, ONE horizontal row of
frames, each frame in a 64x64 cell, feet always on the same baseline (y = 58), character centered. Transparent
background, PNG at 1x, no anti-aliasing, 1-pixel #110d0b outline. Smooth, readable animation with clear key poses,
anticipation before each action and follow-through after it. The cape and plume react to the movement.
```

### De costado (mirando a la derecha)

| # | Animación | Cuadros | Qué pasa en cada cuadro |
|---|---|---|---|
| 1 | Quieto (loop) | 6 | respira: los hombros suben y bajan 1 píxel, la capa y el penacho se mecen apenas |
| 2 | Correr (loop) | 8 | inclinado hacia adelante, piernas y brazos cruzados, la capa flamea atrás, la espada se mece |
| 3 | Esquive / rodar | 6 | 1 P se agacha · 2-5 A rueda hecho un ovillo (la capa lo envuelve) · 6 R se levanta |
| 4 | Tajo 1 (horizontal) | 6 | 1-2 P lleva la espada atrás y arriba · 3 A tajo hacia adelante con estela blanca · 4 A la hoja termina abajo adelante · 5-6 R vuelve a la guardia |
| 5 | Tajo 2 (revés) | 6 | 1 P la espada abajo atrás · 2-3 A revés de abajo hacia arriba con estela · 4-6 R vuelve |
| 6 | Tajo 3 (remate a dos manos) | 8 | 1-3 P levanta la espada con las dos manos sobre la cabeza y salta un poco · 4-5 A baja de golpe hasta el piso, chispas y polvo en el impacto · 6-8 R se incorpora |
| 7 | Parada | 5 | 1 P sube la espada cruzada adelante · 2 A bloquea con un destello en la hoja · 3 A sostiene · 4-5 R baja |
| 8 | Onda de corte (a distancia) | 6 | 1-2 P carga atrás · 3 A tajo al aire que suelta la onda · 4-6 R vuelve |
| 9 | La onda (el proyectil) | 4 (celdas de 32×32) | media luna de luz celeste y blanca, que titila; va hacia la derecha |
| 10 | Golpe recibido | 3 | la cabeza y el cuerpo van para atrás, parpadeo · vuelve |
| 11 | Caída | 8 | se tambalea · cae de rodillas · se desploma · queda tendido de costado (los últimos 2 iguales) |
| 12 | Levantarse | 5 | de tendido a rodillas a parado |

### De frente (mirando a la cámara, hacia abajo de la pantalla)

| # | Animación | Cuadros | Qué pasa |
|---|---|---|---|
| 13 | Quieto (loop) | 6 | como el 1, de frente |
| 14 | Caminar (loop) | 8 | pasos hacia la cámara, la capa se abre un poco |
| 15 | Tajo hacia abajo | 6 | 1-2 P la espada arriba sobre el hombro · 3-4 A tajo en diagonal cruzando adelante del cuerpo hacia la cámara, con estela · 5-6 R |
| 16 | Parada | 5 | la espada cruzada horizontal adelante del pecho, destello en el 2 |
| 17 | Esquive | 6 | rueda hacia la cámara |
| 18 | Golpe recibido | 3 | |

### De espaldas (mirando hacia el fondo, hacia arriba de la pantalla)

| # | Animación | Cuadros | Qué pasa |
|---|---|---|---|
| 19 | Quieto (loop) | 6 | se ve la capa entera y el penacho |
| 20 | Caminar (loop) | 8 | el ruedo de la capa se balancea |
| 21 | Tajo hacia arriba | 6 | 1-2 P la espada baja al costado · 3-4 A tajo hacia arriba y adelante (sobre la cabeza, hacia el fondo) · 5-6 R |
| 22 | Parada | 5 | la espada levantada adelante (se ve asomar por arriba de los hombros) |
| 23 | Esquive | 6 | rueda alejándose |
| 24 | Golpe recibido | 3 | |

**Total:** 24 animaciones, unos 140 cuadros. Si hay que elegir, el orden de importancia es: 1, 2, 4, 5, 6, 7, 3, 10, 11,
13, 14, 19, 20, 15, 21, el resto.

---

## Cómo se entrega
- Una hoja PNG por vista (costado, frente, espalda) o una por animación, con las filas en el orden de las tablas.
- O, si es más fácil, una imagen por animación con el número y el nombre en el archivo (`04-tajo1.png`).
- Ponerla en `docs/arte/caballero/` y avisar: el script la recorta, saca la paleta y la carga en el muñeco para
  revisarla en movimiento, con las cajas de golpe a la vista.
