# Saca de la hoja del usuario (heroe-hoja-8-direcciones.png, 2026-10-17) el quieto de frente (S) y de espaldas (N) y los
# dos pasos de espaldas, y los lleva al tamaño del héroe del juego (24 filas, como el de costado) con su paleta.
# La hoja no tiene una grilla de píxeles pareja (el quieto mide ~5 px por píxel y el caminar ~2,7), así que cada figura
# se recorta por su borde y se parte en 24 filas: cada celda toma el color más repetido de su centro.
# Uso: python docs/arte/hoja-8-direcciones.py [--ver]  →  imprime las filas (JSON) y con --ver guarda hoja-8-direcciones-recorte.png
import os, re, sys, json
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
im = np.asarray(Image.open(os.path.join(HERE, 'heroe-hoja-8-direcciones.png')).convert('RGB')).astype(int)
src = open(os.path.join(HERE, '..', '..', 'js', 'towerHeroArt.js'), encoding='utf-8').read()
PAL = json.loads(re.search(r'pal: (\{.*?\})', src).group(1))
# los negros casi iguales de la paleta (B…J) son ruido de la hoja vieja: acá el contorno es siempre A
USE = {k: v for k, v in PAL.items() if k not in 'BCDEFGHIJ'}
RGB = {k: np.array([int(v[i:i + 2], 16) for i in (1, 3, 5)]) for k, v in USE.items()}
BG = im[5, 5]
ROWS = 24

# zonas de la hoja donde está cada figura (x0, y0, x1, y1), medidas a ojo y ajustadas al borde
ZONAS = {'frente': (15, 45, 165, 245), 'espalda': (640, 45, 785, 245),
         'espaldaPaso0': (650, 310, 760, 421), 'espaldaPaso1': (650, 421, 760, 532)}

def near(c):
    return min(RGB, key=lambda k: ((RGB[k] - c) ** 2).sum())

def extraer(x0, y0, x1, y1, ojos=True):
    reg = im[y0:y1, x0:x1]; m = np.abs(reg - BG).sum(2) > 45
    ys, xs = np.where(m); reg = reg[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = m.shape; cols = max(1, round(w * ROWS / h))
    # promedio por celda (solo lo que no es fondo) y cuánto de la celda es figura
    big = Image.fromarray((reg * m[..., None]).astype(np.uint8)); cov = Image.fromarray((m * 255).astype(np.uint8))
    avg = np.asarray(big.resize((cols, ROWS), Image.BOX)).astype(float); fr = np.asarray(cov.resize((cols, ROWS), Image.BOX)) / 255
    # ojos: rojo puro sobre negro (la capa también es roja, pero clara y sin negro alrededor)
    red = ((reg[..., 0] > 190) & (reg[..., 1] < 70) & (reg[..., 2] < 70)).astype(np.uint8) * 255
    blk = (reg.sum(2) < 90).astype(np.uint8) * 255
    redc = np.asarray(Image.fromarray(red).resize((cols, ROWS), Image.BOX)) / 255
    blkc = np.asarray(Image.fromarray(blk).resize((cols, ROWS), Image.BOX)) / 255
    out = []
    for r in range(ROWS):
        row = ''
        for c in range(cols):
            if fr[r, c] < 0.45: row += '.'; continue
            if redc[r, c] > 0.2 and blkc[r, c] > 0.3 and ojos and 3 <= r <= 8: row += '!'; continue  # la cara va en estas filas
            if redc[r, c] > 0.2 and blkc[r, c] > 0.3: row += 'A'; continue  # rojo con negro fuera de la cara: es contorno
            row += near(avg[r, c] / fr[r, c])
        out.append(row)
    return out

def centrar(rows, w=17):  # al ancho del cuadro, centrado
    pad = w - len(rows[0]); l = pad // 2
    return ['.' * l + r + '.' * (pad - l) for r in rows] if pad >= 0 else [r[-pad // 2:][:w] for r in rows]

res = {k: centrar(extraer(*z, ojos=k == 'frente')) for k, z in ZONAS.items()}  # de espaldas no hay cara
if '--ver' in sys.argv:
    S = 8; ims = []
    for rows in res.values():
        a = Image.new('RGB', (17 * S, ROWS * S), (21, 20, 26))
        for y, r in enumerate(rows):
            for x, ch in enumerate(r):
                if ch != '.': a.paste(PAL[ch] if ch != '!' else '#ff2a1f', (x * S, y * S, x * S + S, y * S + S))
        ims.append(a)
    out = Image.new('RGB', (sum(i.width + 16 for i in ims), ROWS * S), (21, 20, 26)); x = 0
    for i in ims: out.paste(i, (x, 0)); x += i.width + 16
    out.save(os.path.join(HERE, 'hoja-8-direcciones-recorte.png'))
print(json.dumps(res, indent=1))
