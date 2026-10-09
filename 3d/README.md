# Tower Chaos 3D

Prototipo en 3D low poly con estética de PlayStation 1 (referencias: Lunacid, King's Field). Es un proyecto aparte que vive
dentro del repositorio de [Custom Hero Chaos](https://github.com/matiaslcsm-rgb/custon-hero-chaos), en la carpeta `3d/`:
no comparte código con el juego en 2D, solo la música (`../music/`).

Despertás en la playa de una isla, entre los restos de un barco, con un palo. Al norte, más allá de un bosque frondoso,
una torre se pierde en las nubes. Hay que cruzar la isla entre animales y entrar.

## Cómo se abre
- **Online:** https://matiaslcsm-rgb.github.io/custon-hero-chaos/3d/ (o el botón "🧊 Prototipo 3D" del menú del juego).
- **En tu compu:** el navegador no carga los módulos con doble clic en `index.html`; hace falta un servidor en la carpeta
  del repositorio (no en `3d/`, porque la música está un nivel más arriba):
  ```bash
  python -m http.server 8000
  ```
  y abrir http://localhost:8000/3d/

## Controles
| Tecla | Qué hace |
|---|---|
| W A S D | moverse |
| mouse | girar la cámara |
| Shift | correr |
| Espacio | esquivar (un instante invulnerable) |
| clic izquierdo | atacar (combo de 3; el tercero empuja e interrumpe) |
| 1 2 3 / ruedita | cambiar de arma (palo, espada, bastón) |
| E | agarrar, entrar a la torre, subir la escalera |
| Esc | pausa |

## Qué hay
- **La isla** (`island.js`): la playa del naufragio, el bosque (abetos, robles, arbustos y pasto instanciados), un
  sendero hacia el norte, la explanada de la torre y un claro en ruinas fuera del camino. Océano con olas, cielo nublado
  con tres capas de nubes y una torre de 300 m que desaparece en ellas. La isla es siempre la misma.
- **Animales** que avisan antes de pegar: cangrejo (de costado), lobos en manada (muerden y se alejan) y jabalí (marca
  una franja roja y embiste; si choca contra un árbol queda atontado).
- **Armas:** el palo del comienzo, la espada clavada en la puerta de la torre y el bastón (orbes que explotan, gasta
  maná) en el altar del claro.
- **La torre por dentro:** pisos generados al azar (salas y pasillos) con esqueletos, limos, caballeros huecos y
  autómatas; cada piso más oscuro y con más enemigos.
- **Tercera persona** sobre el hombro, con apuntado suave hacia el enemigo cercano.
- **Look PS1** (`ps1.js`): se dibuja a 320 px y se agranda sin suavizar, vértices que tiemblan, texturas afines, colores
  a 15 bits con tramado. Modelos y texturas pintadas por código (`models.js`).

## Archivos
| Archivo | Qué tiene |
|---|---|
| `index.html`, `style.css` | la página, la interfaz y la pantalla de inicio |
| `main.js` | el juego: jugador, cámara, armas, enemigos, la torre, el bucle |
| `island.js` | el terreno, la vegetación, el mar, las nubes y la torre de afuera |
| `models.js` | modelos low poly, texturas pixeladas y animaciones |
| `ps1.js` | el efecto PS1 y la pasada final de color |
| `../music/` | la música (bosque y cueva) es la del juego en 2D |

Usa [Three.js](https://threejs.org/) 0.160 cargado desde unpkg: no hay nada que instalar ni compilar.

## Para capturas y pruebas
`?demo=1&spin=0` arranca sin pantalla de inicio. Se puede sumar `&at=forest|tower|altar` (dónde aparece el héroe),
`&calm=1` (los bichos no te ven), `&weapon=sword|staff` y `&depth=N` (arrancar en el piso N de la torre). En la consola,
`window.__game` da acceso al estado (`P`, `enemies()`, `spawnAt(tipo, x, z)`, `enterIsland()`, `enterTower()`).

## Ideas para seguir
1. Un guardián en la puerta de la torre (oso o jabalí gigante con ataques que avisan).
2. Ajustar cámara y dificultad jugándolo.
3. Más vida en la isla: lluvia, viento en los árboles, ciervos que huyen, fogatas para descansar.
4. Cosas para juntar: hongos y bayas que curan, cofres del naufragio, equipo.
5. Traer el sistema de la Torre en 2D (equipo, bestiario, jefes con fases).
