# Cómo dibujar una sala de la Torre 2D

Cada sala es una imagen PNG en `torre2d/salas/<nombre>.png`. **Cada píxel de la imagen es un píxel del juego** y su
color dice de qué material es. Lo que dibujás es exactamente con lo que choca el personaje.

Se puede dibujar con cualquier programa de pixel art (Aseprite, Piskel, LibreSprite, incluso Paint).

## Los colores
| Color | Código | Material | Qué hace |
|---|---|---|---|
| Transparente o blanco | — | aire | se pasa |
| Gris oscuro | `#505050` | roca | no se rompe nunca (las paredes de la torre) |
| Gris claro | `#7a7a7a` | piedra | la rompe el golpe cargado |
| Marrón | `#7d5a3a` | tierra | la rompe cualquier tajo |
| Amarillo arena | `#e6c35c` | arena | cae y se amontona |
| Azul | `#2f6fd6` | agua | corre y llena huecos; te frena y podés nadar |
| Marrón claro | `#c08040` | madera | sólida; se quema |
| Naranja rojizo | `#ff4000` | lava | corre lenta, quema; con el agua se hace piedra |
| Gris azulado claro | `#d0d0e0` | espinas | lastiman (el tajo hacia abajo rebota en ellas) |
| Gris piedrita | `#9a9488` | grava | cae como la arena y se hunde en el agua (sale de la piedra rota) |
| Marrón muy oscuro | `#3a2a1a` | aceite | líquido que flota sobre el agua y prende fuego enseguida |

**Marcas** (un solo píxel; el juego no lo dibuja, solo ubica cosas ahí, apoyadas sobre ese punto):
| Color | Código | Qué pone |
|---|---|---|
| Magenta | `#ff00ff` | la entrada del héroe |
| Verde | `#00ff00` | un caminante |
| Naranja | `#ff8800` | un embestidor |
| Amarillo | `#ffff00` | la Pluma de Arén |

Los colores parecidos también sirven (el juego toma el más cercano). Un color que no está en la lista queda como aire.

## Medidas y salidas
- Las salas de hoy miden **640 × 224** píxeles. Lo que se ve en pantalla son 320 × 180, y la cámara recorre el resto.
- El héroe mide unos 10 × 22 píxeles: los pasillos necesitan al menos 26 de alto para pasar cómodos.
- Sube solo escalones de hasta 3 píxeles: una pendiente es una escalera de escalones chicos.
- **Las salidas** son los bordes donde dejás aire. A qué sala llevan se escribe en `js/tower2d.js` (`T2D_ROOMS`, `exits`).

## Sala nueva
1. Dibujá la imagen y guardala en `torre2d/salas/<nombre>.png`.
2. Agregala en `T2D_ROOMS` de `js/tower2d.js` con su nombre y sus salidas (las filas de bloques son el respaldo por si la
   imagen no carga; pueden ser una copia simple).
3. Para regenerar las salas de ejemplo desde los bloques: `python docs/arte/torre2d-salas.py` (**pisa las imágenes**).
