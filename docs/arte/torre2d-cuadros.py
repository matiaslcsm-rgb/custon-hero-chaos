# Cuadros nuevos del héroe para la Torre 2D (2026-10-25, pedido del usuario: "animaciones propias").
# Parten de los cuadros dibujados (js/towerHeroArt.js) y los modifican para que mantengan el estilo y la paleta:
#   jump (subiendo: piernas recogidas, capa hacia abajo) · apex (en la punta) · fall (cayendo: piernas estiradas, capa
#   hacia arriba) · land (aterrizando: agachado) · dash (inclinado hacia adelante, capa estirada atrás) · hurt (echado
#   para atrás) · wall (contra la pared: agachado, capa pegada).
# Uso: python docs/arte/torre2d-cuadros.py  → reescribe el bloque "CUADROS 2D" de js/towerHeroArt.js y deja una muestra
#      en docs/arte/torre2d-cuadros.png
import re, json, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ART = os.path.join(ROOT, 'js', 'towerHeroArt.js')
src = open(ART, encoding='utf-8').read()
src = re.sub(r"\n// --- CUADROS 2D.*?// --- FIN CUADROS 2D ---\n", "\n", src, flags=re.S)  # vuelve a generar desde cero
pal = json.loads(re.search(r'pal: (\{.*?\}),\n', src).group(1))
frames = {m.group(1): (float(m.group(2)), re.findall(r"'([^']*)'", m.group(3)))
          for m in re.finditer(r"(\w+): \{ ax: ([\d.]+), rows: \[(.*?)\] \}", src, re.S)}

RED = set('LMNPRSUWXZ')  # rojos de la capa y la capucha

def grid(name):
    ax, rows = frames[name]
    w = max(len(r) for r in rows)
    return ax, [list(r.ljust(w, '.')) for r in rows]

def pad(g, left, right, top=0, bottom=0):
    w = len(g[0]) + left + right
    return [['.'] * w for _ in range(top)] + [['.'] * left + r + ['.'] * right for r in g] + [['.'] * w for _ in range(bottom)]

def shear(g, k):
    """Inclina: la fila de arriba se corre k columnas (positivo = hacia adelante), la de abajo 0."""
    h = len(g); m = abs(k)
    g = pad(g, m, m)
    out = []
    for y, r in enumerate(g):
        s = round(k * (h - 1 - y) / (h - 1))
        out.append((['.'] * s + r[:len(r) - s]) if s >= 0 else (r[-s:] + ['.'] * -s))
    return out

def legs_shift(g, rows_from_bottom, dy):
    """Mueve las últimas filas (las piernas) dy filas (negativo = hacia arriba, recogidas)."""
    h = len(g); start = h - rows_from_bottom
    out = [r[:] for r in g]
    if dy < 0:
        for y in range(start, h):
            ny = y + dy
            for x, c in enumerate(g[y]):
                if c != '.': out[ny][x] = c
            if y >= h + dy: out[y] = ['.'] * len(g[0])
        return out
    # estirar: repite la fila de los tobillos
    ext = [g[h - 2][:] for _ in range(dy)]
    return out[:h - 1] + ext + [out[h - 1]]

def cape_move(g, ax, dx, dy, below=8):
    """Corre los rojos de la capa (detrás del cuerpo, debajo de la capucha) dx, dy."""
    h, w = len(g), len(g[0])
    out = [r[:] for r in g]
    moved = []
    for y in range(below, h):
        for x in range(w):
            if g[y][x] != '.' and x < ax - 3:  # toda la capa con su contorno (si se mueven solo los rojos, queda deshilachada)
                moved.append((x, y, g[y][x]))
                out[y][x] = '.'
    for x, y, c in moved:
        nx, ny = x + dx, y + dy
        if 0 <= ny < h and 0 <= nx < w and out[ny][nx] == '.': out[ny][nx] = c
    return out

def squash(g, remove):
    """Agachado: saca filas a la altura de la cintura."""
    h = len(g); mid = int(h * 0.55)
    return g[:mid - remove] + g[mid:]

def trim(g, ax):
    """Saca columnas y filas vacías de los bordes (y corrige ax)."""
    while all(r[0] == '.' for r in g): g = [r[1:] for r in g]; ax -= 1
    while all(r[-1] == '.' for r in g): g = [r[:-1] for r in g]
    while all(c == '.' for c in g[0]): g = g[1:]
    while all(c == '.' for c in g[-1]): g = g[:-1]
    return ax, g

new = {}
ax, g = grid('walk1'); g = pad(g, 0, 0, 0, 0); g = legs_shift(g, 5, -2); g = cape_move(g, ax, 0, 1); new['jump'] = trim(g, ax)
ax, g = grid('walk2'); g = legs_shift(g, 5, -1); new['apex'] = trim(g, ax)
ax, g = grid('idle'); g = pad(g, 2, 0, 3, 0); ax += 2; g = cape_move(g, ax, -1, -2, below=12); g = legs_shift(g, 4, 1); new['fall'] = trim(g, ax)
ax, g = grid('ready'); g = squash(g, 3); new['land'] = trim(g, ax)
ax, g = grid('walk1'); g = pad(g, 4, 0); ax += 4; g = shear(g, 3); ax += 3; g = cape_move(g, ax, -1, -1); new['dash'] = trim(g, ax)
ax, g = grid('idle'); g = shear(g, -2); ax += 2; new['hurt'] = trim(g, ax)
ax, g = grid('idle'); g = squash(g, 2); g = cape_move(g, ax, 1, 0); new['wall'] = trim(g, ax)

# escribir el bloque en js/towerHeroArt.js (antes del cierre de frames)
lines = ["\n// --- CUADROS 2D (docs/arte/torre2d-cuadros.py; no editar a mano: se regeneran) ---"]
lines.append("Object.assign(HERO_ART.frames, {")
for n, (ax, g) in new.items():
    rows = ",\n".join(f"        '{''.join(r)}'" for r in g)
    lines.append(f"    {n}: {{ ax: {round(ax, 1)}, rows: [\n{rows}] }},")
lines.append("});\n// --- FIN CUADROS 2D ---\n")
open(ART, 'w', encoding='utf-8', newline='\n').write(src.rstrip('\n') + '\n' + '\n'.join(lines))

# muestra
S, W, H = 8, 40, 38
names = ['idle', 'walk1'] + list(new)
img = Image.new('RGB', (W * S * len(names), H * S), (154, 147, 171))
allf = dict(frames); allf.update(new)
for i, n in enumerate(names):
    ax, rows = allf[n]; rows = [''.join(r) for r in rows]
    ox = int(round(W / 2 - ax)); oy = H - 2 - len(rows)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch == '.': continue
            c = pal[ch]; rgb = tuple(int(c[k:k + 2], 16) for k in (1, 3, 5))
            for a in range(S):
                for b in range(S): img.putpixel(((i * W + ox + x) * S + a, (oy + y) * S + b), rgb)
img.save(os.path.join(ROOT, 'docs', 'arte', 'torre2d-cuadros.png'))
print('cuadros:', {n: (len(g[0]), len(g)) for n, (ax, g) in new.items()})
