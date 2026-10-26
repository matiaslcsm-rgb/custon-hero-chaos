# Genera las imágenes de las salas de la Torre 2D (torre2d/salas/<sala>.png) a partir de las filas de bloques de
# js/tower2d.js, con bordes naturales: la roca y la tierra se "erosionan" con ruido para que no se vean cuadradas.
# Después cada imagen se puede retocar a mano en cualquier programa de pixel art (guía de colores: docs/TORRE2D-SALAS.md).
# OJO: correr esto PISA las imágenes. Uso: python docs/arte/torre2d-salas.py [sala ...]
import re, os, sys, random
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(ROOT, 'js', 'tower2d.js'), encoding='utf-8').read()
rooms = {m.group(1): re.findall(r"'([^']*)'", m.group(2)) for m in re.finditer(r"(\w+): \{ name: '[^']*',[^\[]*rows: \[(.*?)\] \}", src, re.S)}
T = 16
COL = {'#': (0x50, 0x50, 0x50), 'p': (0x7a, 0x7a, 0x7a), 't': (0x7d, 0x5a, 0x3a), 's': (0xe6, 0xc3, 0x5c), '~': (0x2f, 0x6f, 0xd6),
       'w': (0xc0, 0x80, 0x40), '=': (0xc0, 0x80, 0x40), 'L': (0xff, 0x40, 0x00), '^': (0xd0, 0xd0, 0xe0), 'g': (0x9a, 0x94, 0x88), 'o': (0x3a, 0x2a, 0x1a), 'a': (0x80, 0xe0, 0x20)}
MARK = {'P': (0xff, 0x00, 0xff), 'E': (0x00, 0xff, 0x00), 'C': (0xff, 0x88, 0x00), 'F': (0xff, 0xff, 0x00), 'T': (0xaa, 0x00, 0xff)}

def noise(x, y, seed):  # ruido suave (valor en una grilla de 4 px, interpolado)
    def v(ix, iy): return random.Random(ix * 73856093 ^ iy * 19349663 ^ seed).random()
    gx, gy = x / 4, y / 4; ix, iy = int(gx), int(gy); fx, fy = gx - ix, gy - iy
    a = v(ix, iy) * (1 - fx) + v(ix + 1, iy) * fx; b = v(ix, iy + 1) * (1 - fx) + v(ix + 1, iy + 1) * fx
    return a * (1 - fy) + b * fy

for name, rows in rooms.items():
    if len(sys.argv) > 1 and name not in sys.argv[1:]: continue
    assert all(len(r) == len(rows[0]) for r in rows), f'{name}: filas de distinto largo'
    W, H = len(rows[0]) * T, len(rows) * T
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); px = img.load()
    tile = lambda tx, ty: rows[ty][tx] if 0 <= ty < len(rows) and 0 <= tx < len(rows[0]) else '#'
    seed = sum(map(ord, name))
    for y in range(H):
        for x in range(W):
            tx, ty = x // T, y // T; c = tile(tx, ty)
            if c in ('#', 't', 'p'):
                # erosión: cerca de un borde con aire, el ruido decide si el píxel queda (bordes orgánicos, hasta 4 px)
                lx, ly = x % T, y % T; d = 99
                for (ox, oy, dist) in ((-1, 0, lx), (1, 0, T - 1 - lx), (0, -1, ly), (0, 1, T - 1 - ly)):
                    if tile(tx + ox, ty + oy) == '.': d = min(d, dist)
                edge = x < 2 or y < 2 or x >= W - 2 or y >= H - 2
                if d < 4 and not edge and noise(x, y, seed) * 4 > d + 0.6: continue
                px[x, y] = COL[c] + (255,)
            elif c == '=':
                if y % T < 4: px[x, y] = COL[c] + (255,)
            elif c == 'h':  # hueco angosto: 6 px de aire a la izquierda, el resto roca
                if x % T >= 6: px[x, y] = COL['#'] + (255,)
            elif c == '^':
                k = x % T; hh = 7 - abs((k % 4) - 2) * 3
                if y % T >= T - hh: px[x, y] = COL[c] + (255,)
            elif c in COL:
                px[x, y] = COL[c] + (255,)
    for ty, r in enumerate(rows):
        for tx, c in enumerate(r):
            if c in MARK: px[tx * T + T // 2, ty * T + T - 1] = MARK[c] + (255,)
    out = os.path.join(ROOT, 'torre2d', 'salas'); os.makedirs(out, exist_ok=True)
    img.save(os.path.join(out, name + '.png'))
    img.resize((W * 2, H * 2), Image.NEAREST).save(os.path.join(ROOT, 'docs', 'arte', f'sala-{name}.png'))
    print(name, W, H)
