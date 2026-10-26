# Boceto de Rec (competidor de MATCH) en pixel art, con la paleta del show (docs/CONCEPTO-FUTURISTA.md).
# Diseño del usuario (2026-10-26): un robot camarógrafo sobre un trípode de 3 patas con ruedas, un brazo con varias
# herramientas, la cara es una cámara de TV, y 3 drones que salen de su cuerpo: el aéreo (graba desde arriba), el de
# sonido (micrófono) y el de luz (reflector). Rec y sus drones son el "Equipo de Grabación".
# Cada pieza se pinta con su rampa de 4 tonos (luz de arriba a la izquierda) y al final se le pone el contorno tinta.
# Es para aprobar el aspecto en la ficha (docs/competidores/rec.md), no el sprite final del juego.
# Uso: python docs/arte/competidor-rec.py  →  docs/competidores/rec.png
import os, math
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
S = 64
INK = (0x1e, 0x3a, 0x5f)
R = {  # rampas: brillo, base, sombra, sombra profunda
    'hueso': [(0xff, 0xfd, 0xf6), (0xf2, 0xf0, 0xe9), (0xd6, 0xd2, 0xc8), (0xb0, 0xab, 0xa1)],
    'gris': [(0xe6, 0xe9, 0xed), (0xc9, 0xcc, 0xd1), (0xa0, 0xa6, 0xaf), (0x7b, 0x82, 0x8d)],
    'metal': [(0x8a, 0x95, 0xa5), (0x63, 0x6d, 0x7c), (0x47, 0x4f, 0x5c), (0x31, 0x37, 0x42)],
    'cian': [(0xc4, 0xfa, 0xff), (0x29, 0xe0, 0xff), (0x14, 0xa8, 0xc8), (0x0c, 0x6c, 0x88)],
    'ama': [(0xff, 0xf3, 0xb0), (0xff, 0xd2, 0x3f), (0xe6, 0xa6, 0x1c), (0xb3, 0x76, 0x10)],
    'mag': [(0xff, 0xc6, 0xe4), (0xff, 0x3e, 0xa5), (0xc8, 0x28, 0x7e), (0x8e, 0x1a, 0x58)],
}
base = Image.new('RGBA', (S, S), (0, 0, 0, 0))   # las piezas sólidas (llevan contorno)
glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))   # luces, brillos y movimiento (sin contorno)

def part(ramp, draw_fn):
    """Pinta una pieza: draw_fn(d) dibuja la forma en una máscara; después se sombrea con su rampa."""
    m = Image.new('L', (S, S), 0); draw_fn(ImageDraw.Draw(m)); px = m.load(); out = base.load()
    on = lambda x, y: 0 <= x < S and 0 <= y < S and px[x, y] > 0
    for y in range(S):
        for x in range(S):
            if not on(x, y): continue
            t = 1
            if not on(x, y - 1) or not on(x - 1, y): t = 0              # borde de arriba o izquierda: brillo
            if not on(x, y + 1) or not on(x + 1, y): t = 2              # borde de abajo o derecha: sombra
            if not on(x, y + 1) and not on(x + 1, y): t = 3
            out[x, y] = R[ramp][t] + (255,)
def dot(x, y, c, a=255): base.putpixel((x, y), c + (a,))
def halo(cx, cy, r, c, a0):
    g = glow.load()
    for y in range(max(0, int(cy - r)), min(S, int(cy + r) + 1)):
        for x in range(max(0, int(cx - r)), min(S, int(cx + r) + 1)):
            d = math.hypot(x - cx, y - cy)
            if d <= r:
                a = int(a0 * (1 - d / r) ** 1.5)
                if a > g[x, y][3]: g[x, y] = c + (a,)
gd = ImageDraw.Draw(glow)

# la sombra en el piso
gd.ellipse((17, 57, 49, 62), fill=INK + (60,))
# el trípode: 3 patas con collares amarillos y ruedas
part('metal', lambda d: [d.line((32, 44, 22, 56), fill=255, width=2), d.line((34, 44, 34, 57), fill=255, width=2), d.line((36, 44, 45, 56), fill=255, width=2)])
part('ama', lambda d: [d.rectangle((26, 49, 28, 50), fill=255), d.rectangle((33, 50, 35, 51), fill=255), d.rectangle((40, 49, 42, 50), fill=255)])
for wx in (19, 32, 43):
    part('metal', lambda d, wx=wx: d.ellipse((wx, 55, wx + 4, 59), fill=255)); dot(wx + 2, 57, R['gris'][0])
part('metal', lambda d: d.rounded_rectangle((29, 40, 39, 45), 2, fill=255))
# el cable que baja de la espalda
part('ama', lambda d: d.arc((20, 32, 30, 48), 90, 250, fill=255, width=1))
# el torso, con las 3 bahías vacías (los drones están afuera) y su luz de estado
part('hueso', lambda d: d.rounded_rectangle((24, 27, 41, 41), 3, fill=255))
part('gris', lambda d: d.rectangle((26, 37, 39, 39), fill=255))
for i, c in enumerate(('cian', 'mag', 'ama')):
    bx = 27 + i * 4
    part('metal', lambda d, bx=bx: d.rectangle((bx, 30, bx + 2, 34), fill=255))
    dot(bx + 1, 31, R[c][1]); halo(bx + 1, 31, 2.5, R[c][1], 120)
for x in range(26, 40, 2): dot(x, 38, R['ama'][1]); dot(x + 1, 38, INK)   # franja de peligro
# el cuello
part('metal', lambda d: d.rectangle((30, 24, 34, 27), fill=255))
# la cabeza: una cámara de TV, la lente es su cara
part('metal', lambda d: d.rounded_rectangle((20, 6, 29, 11), 2, fill=255))                        # visor de arriba
part('metal', lambda d: [d.rectangle((27, 7, 37, 8), fill=255), d.rectangle((27, 7, 28, 11), fill=255), d.rectangle((36, 7, 37, 11), fill=255)])  # manija
part('hueso', lambda d: d.rounded_rectangle((18, 11, 39, 25), 3, fill=255))
part('gris', lambda d: d.rectangle((19, 22, 38, 24), fill=255))
part('metal', lambda d: d.rounded_rectangle((22, 15, 31, 20), 1, fill=255))                       # pantallita lateral
for x in range(23, 31): dot(x, 17 + int(round(math.sin(x * 1.3))), R['cian'][1])                 # su "pulso": la señal
part('metal', lambda d: d.rectangle((39, 12, 46, 24), fill=255))                                   # el tubo de la lente
part('gris', lambda d: [d.rectangle((41, 12, 41, 24), fill=255), d.rectangle((44, 12, 44, 24), fill=255)])  # anillos
part('metal', lambda d: d.rectangle((47, 10, 50, 26), fill=255))                                   # el parasol
part('cian', lambda d: d.ellipse((45, 13, 52, 23), fill=255))                                      # el vidrio
dot(47, 15, (255, 255, 255)); dot(48, 15, R['cian'][0]); dot(47, 16, R['cian'][0])
halo(49, 18, 6, R['cian'][1], 70)
dot(21, 13, R['mag'][1]); dot(22, 13, R['mag'][1]); halo(21.5, 13, 4, R['mag'][1], 150)       # la luz de "grabando"
# el brazo con herramientas: llave, pinza y destornillador
part('metal', lambda d: [d.line((41, 31, 47, 35), fill=255, width=3), d.line((47, 35, 52, 41), fill=255, width=2)])
part('ama', lambda d: d.ellipse((45, 33, 49, 37), fill=255))
part('metal', lambda d: d.ellipse((51, 39, 55, 43), fill=255))
part('ama', lambda d: [d.line((54, 40, 58, 35), fill=255, width=2), d.rectangle((57, 33, 60, 35), fill=255)])   # llave
part('gris', lambda d: [d.line((55, 42, 60, 43), fill=255, width=1), d.line((55, 43, 60, 45), fill=255, width=1)])  # pinza
part('gris', lambda d: d.line((53, 43, 53, 49), fill=255, width=1)); part('ama', lambda d: d.rectangle((52, 43, 54, 45), fill=255))  # destornillador

# los drones
# aéreo (arriba a la izquierda): dos rotores girando y la camarita abajo
part('hueso', lambda d: d.rounded_rectangle((4, 7, 15, 11), 2, fill=255))
part('metal', lambda d: [d.line((3, 6, 7, 8), fill=255), d.line((16, 6, 12, 8), fill=255)])
for rx in (3, 16): gd.ellipse((rx - 4, 4, rx + 4, 6), fill=R['gris'][0] + (120,))
part('metal', lambda d: d.ellipse((8, 11, 11, 14), fill=255)); dot(9, 12, R['cian'][1]); halo(9.5, 12.5, 3, R['cian'][1], 90)
dot(14, 8, R['cian'][1])
# sonido (a la izquierda): el micrófono peludo con su rotor y las ondas
part('gris', lambda d: d.ellipse((3, 28, 13, 38), fill=255))
for (x, y) in ((5, 31), (8, 30), (10, 33), (6, 35), (9, 36), (11, 30)): dot(x, y, R['gris'][3])
part('metal', lambda d: d.rectangle((7, 25, 9, 28), fill=255))
gd.ellipse((3, 23, 13, 25), fill=R['gris'][0] + (120,))
for k, a in ((0, 200), (3, 130), (6, 70)): gd.arc((10 + k, 29 - k, 18 + k, 37 + k), -50, 50, fill=R['mag'][1] + (a,))
# luz (arriba a la derecha): el reflector con sus aletas, mirando para abajo a la izquierda, y su haz
part('metal', lambda d: d.rounded_rectangle((52, 3, 61, 9), 2, fill=255))
part('ama', lambda d: d.ellipse((50, 6, 56, 12), fill=255))
part('metal', lambda d: [d.line((50, 4, 48, 7), fill=255), d.line((58, 10, 55, 13), fill=255)])
gd.ellipse((52, 0, 62, 2), fill=R['gris'][0] + (120,))
halo(53, 9, 9, R['ama'][1], 170)
gd.polygon(((51, 10), (55, 12), (40, 30), (33, 24)), fill=R['ama'][0] + (40,))

# el contorno tinta alrededor de todo lo sólido
bp = base.load(); edge = []
for y in range(S):
    for x in range(S):
        if bp[x, y][3]: continue
        if any(0 <= x + dx < S and 0 <= y + dy < S and bp[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): edge.append((x, y))
for (x, y) in edge: bp[x, y] = INK + (255,)
sprite = Image.new('RGBA', (S, S), (0, 0, 0, 0)); sprite.alpha_composite(glow); sprite.alpha_composite(base)
lights = glow.copy(); lp = lights.load()  # las luces también brillan un poco sobre las piezas
for y in range(S):
    for x in range(S):
        r, g, b, a = lp[x, y]; lp[x, y] = (r, g, b, a // 2)
sprite.alpha_composite(lights)

# la lámina: el estudio de fondo (claro, con grilla en el piso), el grande y a tamaño real
Z = 6; W, H = S * Z + 150, S * Z + 40
sheet = Image.new('RGBA', (W, H), (0xe8, 0xeb, 0xf0, 255)); sd = ImageDraw.Draw(sheet)
for y in range(H):
    k = y / H; sd.line((0, y, W, y), fill=(int(0xf2 - 18 * k), int(0xf4 - 16 * k), int(0xf8 - 10 * k), 255))
for i in range(-14, 26): sd.line((W // 2 + i * 40, H, W // 2 + i * 14, int(H * 0.72)), fill=(0xc9, 0xcc, 0xd1, 255))
for k in range(5):
    y = int(H * 0.72 + (H * 0.28) * (k / 4) ** 1.6); sd.line((0, y, W, y), fill=(0xc9, 0xcc, 0xd1, 255))
sheet.alpha_composite(sprite.resize((S * Z, S * Z), Image.NEAREST), (10, 20))
sheet.alpha_composite(sprite.resize((S * 2, S * 2), Image.NEAREST), (S * Z + 15, 30))
sheet.alpha_composite(sprite, (S * Z + 15 + 32, 180))
out = os.path.join(ROOT, 'docs', 'competidores'); os.makedirs(out, exist_ok=True)
sheet.save(os.path.join(out, 'rec.png'))
print('ok')
