# Guía de estilo (arranque, 2026-10-16)

Empieza por lo que necesita el muñeco (fase B2 del roadmap): tamaños y animaciones del héroe. La guía completa
(paleta, menús, tipografías) es un ítem de la fase B1.

## Tamaños
- **1 píxel del dibujo = 1 unidad del mundo.** Se agranda siempre por un número entero (×2, ×3…) para que los píxeles
  queden parejos (`image-rendering: pixelated`, sin suavizado).
- **El héroe con espada** (los cuadros dibujados de `js/towerHeroArt.js`): cada cuadro va en un lienzo de 40×36 con los
  pies en el centro de abajo (`HERO_ART_BOX`). El cuerpo mide unos 18 de ancho y 24 de alto.
- **El héroe con las otras armas** (poses de `js/towerPixelHero.js`): se diseña en 18×24 y se dibuja ×4/3 (`PXH_RES`).
- **Contorno** oscuro de 1 píxel (`#110d0b`) alrededor de todo lo que se mueve.
- **Sombra** en el piso: un óvalo semitransparente debajo de los pies.

## Animaciones del héroe (cuadros por movimiento)
Mirando a la derecha; a la izquierda se espeja. De frente y de espaldas hay quieto, caminar y golpe recibido.

| Movimiento | Cuadros | Notas |
|---|---|---|
| Quieto | 4 (+ parpadeo) | respira en un ciclo de 1,6 s; parpadea cada ~3,3 s |
| Caminar | 8 | los pasos van con la distancia, no con el reloj (los pies no patinan) |
| Tajo del combo | 6 por tajo × 3 tajos | preparación → golpe con estela → seguimiento → guardia; el 3.º es el remate a dos manos |
| Esquive | 4 | se agacha, rueda y se levanta |
| Golpe recibido | 2 | la cabeza y el cuerpo van para atrás |
| Caída | 5 | se tambalea, cae de rodillas y queda tendido |
| Parada | 4 | preparación `ready` → activo `block` (con destello y arco celeste) → recuperación `recover`, `idle` (muñeco 1b) |

## Los tres tiempos de cada movimiento
Las reacciones (golpe recibido y caída) también tienen sus tiempos, pero no se pueden cortar con nada.

Todo movimiento que hace algo (esquive, tajo, parada, disparo) se divide en **preparación**, **activo** y
**recuperación**, con su duración en segundos en una tabla de datos (`MUNECO_MOVES` en `js/muneco.js`). La animación
se reparte entre los tres: la preparación avisa, el activo es cuando pasa (el golpe pega, el esquive mueve) y la
recuperación vuelve a la guardia.
