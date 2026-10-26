# Boceto de Rec (competidor de MATCH) en pixel art.
# Diseño del usuario (2026-10-26): un robot camarógrafo sobre un trípode de 3 patas con ruedas, un brazo con varias
# herramientas, la cara es una cámara de TV, y 3 drones que salen de su cuerpo: el aéreo (graba desde arriba), el de
# sonido (micrófono) y el de luz (reflector). Rec y sus drones son el "Equipo de Grabación".
# Estética (pedido del usuario 2026-10-26): ciencia ficción industrial y dura, "la forma sigue a la función": piezas
# en bloque y en ángulo, paneles, tornillos, rejillas, pistones y juntas hidráulicas, cables a la vista, carteles de
# peligro y letras de plantilla, todo gastado y sucio. Gris mate, verde oliva y blanco hueso, con naranja de alta
# visibilidad y amarillo de precaución; el esqueleto, gris oscuro y carbono.
# Cada pieza se pinta con su rampa de 4 tonos (luz de arriba a la izquierda), con desgaste, y al final el contorno.
# Es para aprobar el aspecto en la ficha (docs/competidores/rec.md), no el sprite final del juego.
# Uso: python docs/arte/competidor-rec.py  →  docs/competidores/rec.png
import os, math, random
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
S = 80
INK = (0x16, 0x18, 0x1b)
R = {  # rampas: brillo, base, sombra, sombra profunda
    'gris': [(0xa4, 0xa9, 0xab), (0x83, 0x88, 0x8b), (0x66, 0x6b, 0x6e), (0x4a, 0x4e, 0x51)],
    'oliva': [(0x8e, 0x95, 0x66), (0x6c, 0x74, 0x48), (0x55, 0x5c, 0x38), (0x3e, 0x43, 0x29)],
    'hueso': [(0xea, 0xe6, 0xd8), (0xd2, 0xcd, 0xbb), (0xb3, 0xad, 0x9a), (0x8d, 0x88, 0x77)],
    'nar': [(0xff, 0xa6, 0x5c), (0xf2, 0x7a, 0x1a), (0xc2, 0x5d, 0x10), (0x8a, 0x41, 0x0a)],
    'ama': [(0xff, 0xe2, 0x6a), (0xf2, 0xc2, 0x1a), (0xc6, 0x99, 0x10), (0x8c, 0x6b, 0x0a)],
    'carbon': [(0x50, 0x55, 0x5b), (0x37, 0x3b, 0x40), (0x27, 0x2a, 0x2e), (0x19, 0x1b, 0x1e)],
    'metal': [(0xd0, 0xd5, 0xd8), (0xa2, 0xa8, 0xad), (0x78, 0x7e, 0x84), (0x52, 0x57, 0x5c)],
    'cian': [(0xc8, 0xfb, 0xff), (0x3c, 0xd8, 0xf0), (0x1c, 0x9c, 0xb8), (0x0e, 0x62, 0x78)],
}
rnd = random.Random(4)
base = Image.new('RGBA', (S, S), (0, 0, 0, 0))   # las piezas sólidas (llevan contorno)
glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))   # luces y movimiento (sin contorno)
gd = ImageDraw.Draw(glow)

def part(ramp, draw_fn, wear=0.0):
    """Pinta una pieza con su rampa; wear: cuánto desgaste (raspones claros y mugre oscura)."""
    m = Image.new('L', (S, S), 0); draw_fn(ImageDraw.Draw(m)); px = m.load(); out = base.load()
    on = lambda x, y: 0 <= x < S and 0 <= y < S and px[x, y] > 0
    for y in range(S):
        for x in range(S):
            if not on(x, y): continue
            t = 1
            if not on(x, y - 1) or not on(x - 1, y): t = 0
            if not on(x, y + 1) or not on(x + 1, y): t = 2
            if not on(x, y + 1) and not on(x + 1, y): t = 3
            if t == 1 and wear:
                patch = random.Random((x // 3) * 7919 + (y // 2) * 104729).random()   # la mugre viene en manchas
                if patch < wear * 0.6: t = 2
                elif rnd.random() < wear * 0.12: t = 0                                # algún raspón suelto
            out[x, y] = R[ramp][t] + (255,)
def dot(x, y, c, a=255):
    if 0 <= x < S and 0 <= y < S: base.putpixel((x, y), c + (a,))
def hline(x0, x1, y, c):
    for x in range(x0, x1 + 1): dot(x, y, c)
def vline(x, y0, y1, c):
    for y in range(y0, y1 + 1): dot(x, y, c)
def bolts(pts):
    for (x, y) in pts: dot(x, y, R['metal'][0]); dot(x + 1, y + 1, R['carbon'][3])
def halo(cx, cy, r, c, a0):
    g = glow.load()
    for y in range(max(0, int(cy - r)), min(S, int(cy + r) + 1)):
        for x in range(max(0, int(cx - r)), min(S, int(cx + r) + 1)):
            d = math.hypot(x - cx, y - cy)
            if d <= r:
                a = int(a0 * (1 - d / r) ** 1.5)
                if a > g[x, y][3]: g[x, y] = c + (a,)
# letras de plantilla de 3x5 (para "REC", "04", "DNG", "HAZARD")
FONT = {'R': ['110', '101', '110', '101', '101'], 'E': ['111', '100', '110', '100', '111'], 'C': ['011', '100', '100', '100', '011'],
        '0': ['111', '101', '101', '101', '111'], '4': ['101', '101', '111', '001', '001'], 'D': ['110', '101', '101', '101', '110'],
        'N': ['101', '111', '111', '101', '101'], 'G': ['011', '100', '101', '101', '011'], 'H': ['101', '101', '111', '101', '101'],
        'A': ['010', '101', '111', '101', '101'], 'Z': ['111', '001', '010', '100', '111']}
def stencil(text, x, y, c):
    for ch in text:
        for j, row in enumerate(FONT[ch]):
            for i, b in enumerate(row):
                if b == '1' and not (j == 2 and i == 1 and ch in '0'): dot(x + i, y + j, c)
        x += 4
def hazard(x0, y0, x1, y1):  # franja de peligro: amarillo y negro en diagonal
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): dot(x, y, R['ama'][1] if ((x + y) // 2) % 2 == 0 else INK)

# la sombra en el piso
gd.ellipse((14, 73, 66, 79), fill=INK + (90,))
# --- EL TRÍPODE: tres patas hidráulicas (carbono arriba, pistón de metal abajo) con ruedas gordas ---
legs = [((38, 52), (22, 70)), ((40, 53), (40, 72)), ((42, 52), (58, 70))]
for (a, b) in legs:
    mx, my = (a[0] + b[0]) // 2, (a[1] + b[1]) // 2
    part('carbon', lambda d, a=a, mx=mx, my=my: d.line((a[0], a[1], mx, my), fill=255, width=4), 0.15)
    part('metal', lambda d, mx=mx, my=my, b=b: d.line((mx, my, b[0], b[1] - 2), fill=255, width=2))
    part('nar', lambda d, mx=mx, my=my: d.ellipse((mx - 2, my - 2, mx + 2, my + 2), fill=255))      # junta
    dot(mx, my, R['carbon'][3])
for wx in (22, 40, 58):
    part('carbon', lambda d, wx=wx: d.ellipse((wx - 4, 68, wx + 4, 76), fill=255), 0.2)
    part('nar', lambda d, wx=wx: d.ellipse((wx - 1, 71, wx + 1, 73), fill=255))
    for k in range(6): a = k * math.pi / 3; dot(int(wx + math.cos(a) * 3.2), int(72 + math.sin(a) * 3.2), R['carbon'][0])  # cubierta con taco
    for x in range(wx - 4, wx + 5): dot(x, 76, (0x4a, 0x3e, 0x30))   # barro
# la cadera: un bloque con tornillos
part('carbon', lambda d: d.polygon(((32, 48), (48, 48), (50, 51), (50, 55), (30, 55), (30, 51)), fill=255), 0.2)
bolts([(32, 52), (47, 52)]); hline(33, 47, 50, R['carbon'][3])
# --- LA MOCHILA (batería) y los cables ---
part('gris', lambda d: d.rectangle((17, 30, 25, 48), fill=255), 0.25)
for y in range(33, 45, 2): hline(19, 23, y, R['gris'][3])          # rejilla
part('nar', lambda d: d.rectangle((18, 46, 24, 47), fill=255))
part('carbon', lambda d: [d.arc((14, 40, 30, 62), 100, 250, fill=255, width=2), d.arc((20, 44, 36, 58), 160, 260, fill=255, width=1)])
# --- EL TORSO: caja blindada oliva con chaflanes, bahías de los drones, "04" y franja de peligro ---
part('oliva', lambda d: d.polygon(((26, 30), (52, 30), (55, 33), (55, 47), (52, 50), (26, 50), (24, 47), (24, 33)), fill=255), 0.22)
hline(25, 54, 37, R['oliva'][3]); vline(39, 31, 36, R['oliva'][3])          # líneas de panel
bolts([(26, 32), (52, 32), (26, 47), (52, 47)])
for i in range(3):                                                           # las 3 bahías (vacías: los drones están afuera)
    bx = 28 + i * 8
    part('carbon', lambda d, bx=bx: d.rectangle((bx, 39, bx + 5, 44), fill=255))
    hline(bx + 1, bx + 4, 42, R['carbon'][3])
    dot(bx + 1, 40, R['nar'][0]); halo(bx + 1, 40, 2.5, R['nar'][1], 140)
stencil('04', 43, 31, R['hueso'][1])
hazard(26, 46, 52, 48)
# --- EL CUELLO: carbono con pistones ---
part('carbon', lambda d: d.rectangle((35, 26, 43, 30), fill=255))
part('metal', lambda d: [d.line((34, 30, 36, 25), fill=255), d.line((44, 30, 42, 25), fill=255)])
# --- LA CABEZA: una cámara de TV de estudio, en bloque ---
part('gris', lambda d: d.rectangle((24, 9, 35, 14), fill=255), 0.2)                                   # visor de arriba
part('carbon', lambda d: [d.rectangle((33, 6, 49, 8), fill=255), d.rectangle((33, 6, 35, 11), fill=255), d.rectangle((47, 6, 49, 11), fill=255)])  # manija
part('nar', lambda d: d.rectangle((38, 6, 44, 7), fill=255))                                            # agarre naranja
part('hueso', lambda d: d.polygon(((22, 12), (51, 12), (53, 14), (53, 27), (22, 27), (20, 25), (20, 14)), fill=255), 0.25)
hline(21, 52, 23, R['hueso'][3]); vline(36, 13, 22, R['hueso'][3])          # líneas de panel
bolts([(22, 14), (50, 14), (22, 25)])
part('carbon', lambda d: d.rectangle((24, 15, 33, 21), fill=255))                                       # pantallita (su "cara")
for x in range(25, 33): dot(x, 18 + int(round(math.sin(x * 1.4))), R['cian'][1])
for y in range(15, 22, 2): hline(38, 44, y, R['hueso'][3])                                             # rejilla de ventilación
part('ama', lambda d: d.rectangle((46, 15, 51, 20), fill=255))                                          # cartel de peligro
dot(48, 16, INK); dot(49, 16, INK); dot(48, 17, INK); dot(49, 17, INK); dot(48, 19, INK); dot(49, 19, INK)
dot(23, 13, (0xff, 0x30, 0x30)); halo(23, 13, 4, (0xff, 0x40, 0x30), 170)                              # luz de "grabando"
part('gris', lambda d: d.rectangle((53, 14, 61, 26), fill=255), 0.15)                                   # el tubo de la lente
for x in (55, 57, 59):
    for y in range(14, 27, 2): dot(x, y, R['gris'][3])                                                  # anillos estriados
part('carbon', lambda d: d.polygon(((61, 11), (66, 9), (66, 31), (61, 29)), fill=255), 0.1)             # parasol
part('cian', lambda d: d.ellipse((59, 15, 66, 25), fill=255))                                           # el vidrio
dot(61, 17, (255, 255, 255)); dot(62, 17, R['cian'][0]); dot(61, 18, R['cian'][0])
halo(63, 20, 7, R['cian'][1], 80)
part('carbon', lambda d: d.line((26, 9, 24, 3), fill=255)); dot(24, 2, R['nar'][1]); halo(24, 2, 2, R['nar'][1], 160)  # antena
# --- EL BRAZO hidráulico con herramientas ---
part('oliva', lambda d: d.polygon(((52, 31), (59, 31), (61, 34), (59, 38), (52, 38)), fill=255), 0.2)   # hombrera
bolts([(54, 33), (58, 33)])
part('carbon', lambda d: d.line((58, 37, 63, 45), fill=255, width=3), 0.15)
part('metal', lambda d: d.line((60, 36, 65, 44), fill=255, width=1))                                     # pistón
part('nar', lambda d: d.ellipse((61, 43, 66, 48), fill=255)); dot(63, 45, R['carbon'][3])               # codo
part('carbon', lambda d: d.line((64, 47, 68, 54), fill=255, width=3), 0.15)
part('gris', lambda d: d.ellipse((66, 52, 71, 57), fill=255))                                            # cabezal de herramientas
part('metal', lambda d: [d.line((70, 53, 75, 48), fill=255, width=2), d.rectangle((73, 45, 77, 47), fill=255)])   # llave
part('metal', lambda d: [d.line((70, 56, 76, 57), fill=255), d.line((70, 57, 76, 60), fill=255)])        # pinza
part('nar', lambda d: d.ellipse((64, 57, 70, 63), fill=255)); dot(67, 60, R['carbon'][3])              # disco de corte
for k in range(8): a = k * math.pi / 4; dot(int(67 + math.cos(a) * 3.5), int(60 + math.sin(a) * 3.5), R['metal'][0])

# --- LOS DRONES, blindados ---
# aéreo: cuadricóptero en bloque, con puntas naranjas y la cámara colgando
part('oliva', lambda d: d.polygon(((4, 9), (16, 9), (18, 11), (16, 13), (4, 13), (2, 11)), fill=255), 0.2)
part('carbon', lambda d: [d.line((1, 7, 5, 10), fill=255), d.line((19, 7, 15, 10), fill=255)])
for rx in (1, 19): gd.ellipse((rx - 5, 5, rx + 5, 7), fill=R['gris'][0] + (110,)); dot(rx, 7, R['nar'][1])
part('carbon', lambda d: d.rectangle((8, 13, 12, 16), fill=255)); dot(10, 15, R['cian'][1]); halo(10, 15, 3, R['cian'][1], 100)
hazard(5, 10, 8, 10)
# sonido: el micrófono dentro de una jaula blindada, con su rotor y las ondas
part('carbon', lambda d: d.rounded_rectangle((3, 34, 14, 46), 2, fill=255), 0.15)
for y in range(36, 45, 2): hline(4, 13, y, R['carbon'][0])                                              # la jaula
part('gris', lambda d: d.ellipse((5, 37, 12, 44), fill=255)); [dot(x, y, R['gris'][3]) for (x, y) in ((7, 39), (9, 41), (10, 38))]
part('oliva', lambda d: d.rectangle((6, 30, 11, 34), fill=255), 0.2)
gd.ellipse((3, 28, 14, 30), fill=R['gris'][0] + (110,))
for k, a in ((0, 200), (3, 130), (6, 70)): gd.arc((12 + k, 34 - k, 20 + k, 46 + k), -50, 50, fill=R['nar'][1] + (a,))
# luz: un reflector cuadrado con aletas, mirando abajo a la izquierda
part('gris', lambda d: d.rectangle((66, 2, 77, 10), fill=255), 0.2)
part('carbon', lambda d: [d.line((65, 2, 62, 6), fill=255, width=1), d.line((78, 11, 74, 14), fill=255, width=1)])  # aletas
part('ama', lambda d: d.rectangle((66, 7, 72, 12), fill=255))
for x in range(67, 72, 2): vline(x, 8, 11, R['ama'][0])
hazard(73, 3, 76, 4)
gd.ellipse((66, 0, 77, 1), fill=R['gris'][0] + (110,))
halo(68, 11, 10, R['ama'][1], 170)
gd.polygon(((65, 11), (71, 13), (50, 34), (42, 27)), fill=R['ama'][0] + (35,))

# --- contorno ---
bp = base.load(); edge = []
for y in range(S):
    for x in range(S):
        if bp[x, y][3]: continue
        if any(0 <= x + dx < S and 0 <= y + dy < S and bp[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): edge.append((x, y))
for (x, y) in edge: bp[x, y] = INK + (255,)
sprite = Image.new('RGBA', (S, S), (0, 0, 0, 0)); sprite.alpha_composite(glow); sprite.alpha_composite(base)
lights = glow.copy(); lp = lights.load()
for y in range(S):
    for x in range(S):
        r, g, b, a = lp[x, y]; lp[x, y] = (r, g, b, a // 2)
sprite.alpha_composite(lights)

# --- la lámina de concepto: estudio gris neutro, líneas de boceto, vista grande, siluetas de frente y costado, notas ---
Z = 6; W, H = S * Z + 260, S * Z + 60
sheet = Image.new('RGBA', (W, H), (0, 0, 0, 255)); sd = ImageDraw.Draw(sheet)
for y in range(H):
    k = y / H; v = int(0xb4 - 30 * k); sd.line((0, y, W, y), fill=(v, v + 2, v + 4, 255))
sk = (0x9a, 0x9e, 0xa2, 255)
for x in range(0, W, 60): sd.line((x, 0, x, H), fill=(0xac, 0xb0, 0xb3, 255))                         # grilla de medidas
for y in range(0, H, 60): sd.line((0, y, W, y), fill=(0xac, 0xb0, 0xb3, 255))
sd.line((10, 20 + 76 * Z, S * Z + 10, 20 + 76 * Z), fill=sk, width=2)                                  # línea del piso
sd.ellipse((10 + 28 * Z, 20 + 6 * Z, 10 + 72 * Z, 20 + 32 * Z), outline=sk, width=1)                  # círculos de construcción
sd.line((10 + 40 * Z, 10, 10 + 40 * Z, H - 10), fill=sk, width=1)
sheet.alpha_composite(sprite.resize((S * Z, S * Z), Image.NEAREST), (10, 20))
# siluetas "ortográficas": de frente (aplastado) y a tamaño real
rx = S * Z + 30
sil = sprite.copy(); sp = sil.load()
for y in range(S):
    for x in range(S):
        if sp[x, y][3] > 200: sp[x, y] = (0x3a, 0x3e, 0x42, 255)
        else: sp[x, y] = (0, 0, 0, 0)
sheet.alpha_composite(sil.resize((S * 2, S * 2), Image.NEAREST), (rx, 30))
sheet.alpha_composite(sprite.resize((S * 2, S * 2), Image.NEAREST), (rx + 70, 200))
sheet.alpha_composite(sprite, (rx + 20, 220))
try: font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 15); small = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 12)
except OSError: font = small = ImageFont.load_default()
sd.text((rx, 8), 'REC  //  EQUIPO DE GRABACIÓN  //  04', fill=(0x26, 0x29, 0x2c, 255), font=font)
notes = ['DRON AÉREO ....... FÍSICO', 'DRON SONIDO ...... MÁGICO', 'DRON LUZ ......... PURO + QUEMA',
         'TRÍPODE HIDRÁULICO · RUEDAS', 'BRAZO: LLAVE · PINZA · DISCO']
for i, t in enumerate(notes): sd.text((rx, 380 + i * 18), t, fill=(0x2e, 0x32, 0x36, 255), font=small)
sd.rectangle((rx, 480, rx + 60, 486), fill=R['ama'][1] + (255,)); sd.rectangle((rx + 66, 480, rx + 126, 486), fill=R['nar'][1] + (255,))
out = os.path.join(ROOT, 'docs', 'competidores'); os.makedirs(out, exist_ok=True)
sheet.save(os.path.join(out, 'rec.png'))
print('ok')
