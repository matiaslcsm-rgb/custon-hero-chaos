# Arma los cuadros de ataque de frente y de espaldas del héroe con espada a partir de frontIdle y backIdle
# (js/towerHeroArt.js): saca la espada de la mano, la vuelve a dibujar en otra posición (con su contorno) y
# guarda una vista previa ampliada para comparar con los cuadros del usuario.
# Uso: python docs/arte/ataques-frente-espalda.py  →  docs/arte/ataques-frente-espalda.png
import re, os, json
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
src = open(os.path.join(ROOT, 'js', 'towerHeroArt.js'), encoding='utf-8').read()
PAL = json.loads(re.search(r'pal: (\{.*?\})', src).group(1))

def frame(name):
    m = re.search(name + r": \{ ax: ([\d.]+), rows: \[(.*?)\]", src, re.S)
    return float(m.group(1)), [list(r) for r in re.findall(r"'([^']*)'", m.group(2))]

def pad(rows, n):  # agranda el lienzo n columnas por lado y n filas arriba (para la hoja levantada)
    w = len(rows[0]) + 2 * n
    return [['.'] * w for _ in range(n)] + [['.'] * n + r + ['.'] * n for r in rows]

def put(g, x, y, c):
    if 0 <= y < len(g) and 0 <= x < len(g[0]): g[y][x] = c

def blade(g, pts, hilt):
    """La hoja: puntos de la base a la punta (claro 'e' con filo 'd' y punta 'a'), contorno 'A' donde está vacío,
    y la empuñadura dorada ('b' 'c' 'b') atravesada en hilt = (x, y, 'h'|'v')."""
    for (x, y) in pts:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if 0 <= y + dy < len(g) and 0 <= x + dx < len(g[0]) and g[y + dy][x + dx] == '.': g[y + dy][x + dx] = 'A'
    for i, (x, y) in enumerate(pts): put(g, x, y, 'a' if i == len(pts) - 1 else 'e' if i % 3 else 'd')
    hx, hy, o = hilt
    for k, c in zip((-1, 0, 1), 'bcb'): put(g, hx + k, hy, c) if o == 'h' else put(g, hx, hy + k, c)

def line(x0, y0, x1, y1):
    n = max(abs(x1 - x0), abs(y1 - y0))
    return [(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)) for i in range(n + 1)]

P = 3  # columnas/filas que se agregan por lado
# --- DE FRENTE: la espada está en la mano a la izquierda de la pantalla (x 3-5, filas 14-20) ---
ax, base = frame('frontIdle')
def front_clean():
    g = pad([r[:] for r in base], P)
    for y in range(14, 21):  # saca la hoja y la empuñadura; la mano queda como guantelete
        for x in (3, 4, 5):
            c = g[y + P][x + P]
            if c in 'bcde a' and c != 'A' or (y >= 15 and x == 4): g[y + P][x + P] = '.'
    g[14 + P][3 + P] = 'A'; g[14 + P][4 + P] = 'V'; g[14 + P][5 + P] = 'A'
    for y in range(16, 21):
        if g[y + P][3 + P] == '.' and g[y + P][5 + P] == 'A': pass
    return g
frames = {}
g = front_clean()  # preparación: la hoja levantada al costado de la capucha, apuntando arriba
blade(g, line(4 + P, 9 + P, 4 + P, 0), (4 + P, 10 + P, 'h')); frames['frontReady'] = g
g = front_clean()  # el tajo: la hoja baja cruzando adelante del cuerpo, hacia abajo a la derecha
blade(g, line(9 + P, 16 + P, 15 + P, 22 + P), (8 + P, 15 + P, 'h')); g[14 + P][7 + P] = 'V'; frames['frontSlash'] = g
g = front_clean()  # el seguimiento: la hoja abajo a la derecha, del otro lado del cuerpo
blade(g, line(13 + P, 15 + P, 13 + P, 21 + P), (13 + P, 14 + P, 'h')); frames['frontRecover'] = g

# --- DE ESPALDAS: la espada asoma a la derecha (x 14-15, filas 12-18) ---
axb, bb = frame('backIdle')
def back_clean():
    g = pad([r[:] for r in bb], P)
    for y in range(12, 19):
        for x in (14, 15, 16):
            if x < len(bb[0]) and g[y + P][x + P] in 'cde': g[y + P][x + P] = '.'
    return g
g = back_clean()  # preparación: la hoja baja a la derecha, lista para subir
blade(g, line(15 + P, 14 + P, 17 + P, 20 + P), (15 + P, 13 + P, 'h')); frames['backReady'] = g
g = back_clean()  # el tajo: la hoja sube por arriba de la cabeza, hacia el fondo
blade(g, line(10 + P, 6 + P, 7 + P, 0), (10 + P, 7 + P, 'h')); frames['backSlash'] = g
g = back_clean()  # el seguimiento: la hoja cae a la izquierda
blade(g, line(2 + P, 10 + P, 0, 16 + P), (3 + P, 9 + P, 'h')); frames['backRecover'] = g

# --- VISTA PREVIA: arriba los cuadros del usuario (frontIdle, backIdle), abajo los nuevos; ×8 ---
S = 8
def img(rows):
    h, w = len(rows), len(rows[0])
    im = Image.new('RGBA', (w * S, h * S), (21, 20, 26, 255))
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c != '.': im.paste(Image.new('RGBA', (S, S), PAL[c]), (x * S, y * S))
    return im
shown = [('frontIdle', pad(base, P)), ('backIdle', pad(bb, P))] + list(frames.items())
ims = [img(r) for _, r in shown]
W = sum(i.width for i in ims) + 10 * len(ims); H = max(i.height for i in ims)
sheet = Image.new('RGBA', (W, H), (21, 20, 26, 255)); x = 0
for i in ims: sheet.paste(i, (x, H - i.height)); x += i.width + 10
sheet.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ataques-frente-espalda.png'))
json.dump({k: [''.join(r) for r in v] for k, v in frames.items()}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ataques-frente-espalda.json'), 'w'), indent=1)
print('ok', list(frames))
