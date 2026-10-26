# Boceto de Flash (competidor de MATCH) en pixel art, con la paleta del show (docs/CONCEPTO-FUTURISTA.md).
# Diseño del usuario (2026-10-26): un robot camarógrafo sobre un trípode de 3 patas con ruedas, un brazo con varias
# herramientas, la cara es una cámara de TV, y 3 drones que salen de su cuerpo: el aéreo (graba desde arriba), el de
# sonido (micrófono) y el de luz (el flash).
# Es para aprobar el aspecto en la ficha (docs/competidores/flash.md), no el sprite final del juego.
# Uso: python docs/arte/competidor-flash.py  →  docs/competidores/flash.png
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
K, W, G, D = (0x1e, 0x3a, 0x5f), (0xf2, 0xf0, 0xe9), (0xc9, 0xcc, 0xd1), (0x6a, 0x72, 0x80)  # tinta, hueso, gris, rueda
Y, C, M = (0xff, 0xd2, 0x3f), (0x29, 0xe0, 0xff), (0xff, 0x3e, 0xa5)  # amarillo (luz, herramientas), cian (lente), magenta (REC)
img = Image.new('RGBA', (32, 40), (0, 0, 0, 0))
def px(x, y, c, a=255): img.putpixel((x, y), c + (a,))
def box(x0, y0, x1, y1, fill, line=K):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): px(x, y, line if x in (x0, x1) or y in (y0, y1) else fill)
def line(x0, y0, x1, y1, c):
    n = max(abs(x1 - x0), abs(y1 - y0))
    for i in range(n + 1): px(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), c)

# la cabeza: una cámara de TV (la lente es su cara, mirando a la derecha), con manija arriba y la luz REC
line(12, 5, 17, 5, K); px(12, 6, K); px(17, 6, K)
box(9, 7, 20, 14, W); line(10, 12, 19, 12, G); px(11, 9, M); px(12, 9, M)
box(21, 8, 24, 13, G); box(22, 9, 24, 12, C); px(23, 10, W)  # la lente
line(14, 15, 15, 15, K)
# el torso, con las 3 bahías de donde salen los drones
box(11, 16, 18, 23, W); line(12, 17, 17, 17, G); [box(x, 18, x + 1, 19, D) for x in (12, 14, 16)]; line(12, 21, 17, 21, Y)
# el brazo con herramientas: llave, pinza y destornillador
box(19, 18, 24, 20, W); box(25, 17, 26, 21, D)
line(27, 14, 27, 16, Y); px(26, 14, Y); px(28, 14, Y)        # llave
px(27, 18, Y); px(28, 18, Y); px(28, 19, Y)                  # pinza
line(27, 21, 30, 21, G); px(27, 21, Y)                        # destornillador
# el trípode: 3 patas desde el centro, cada una con su rueda
box(13, 24, 16, 25, D)
for (x1, x2) in ((7, 13), (15, 15), (22, 16)):
    line(x2, 26, x1, 35, K); line(x2 + 1, 26, x1 + 1, 35, G)
for x in (6, 14, 21): box(x, 35, x + 3, 38, D)
# los drones: aéreo (arriba a la izquierda), sonido (a la izquierda), luz (arriba a la derecha, con su haz)
line(0, 1, 3, 1, K); line(5, 1, 8, 1, K); px(2, 2, K); px(6, 2, K); box(1, 3, 7, 5, W); px(4, 6, C)
line(1, 12, 4, 12, K); px(2, 13, K); box(0, 14, 5, 19, G); [px(x, y, W) for x in (1, 3) for y in (15, 17)]; [px(x, y, D) for x in (2, 4) for y in (16, 18)]
line(24, 1, 30, 1, K); px(27, 2, K); box(25, 3, 29, 6, Y); px(26, 4, W)
for (x, y) in ((30, 4), (31, 3), (31, 5), (30, 2), (30, 6)): px(x, y, Y, 160)  # el destello

sheet = Image.new('RGBA', (32 * 8 + 70, 40 * 8 + 20), (0xe4, 0xe7, 0xec, 255))
sheet.alpha_composite(img.resize((256, 320), Image.NEAREST), (10, 10))
sheet.alpha_composite(img.resize((64, 80), Image.NEAREST), (270, 20))
out = os.path.join(ROOT, 'docs', 'competidores'); os.makedirs(out, exist_ok=True)
sheet.save(os.path.join(out, 'flash.png'))
print('ok')
