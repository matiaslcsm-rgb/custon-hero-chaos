# Vista previa del héroe por piezas (js/towerHeroArt.js, HERO_PARTS): arriba cada pieza suelta, abajo los cuadros ya
# encastrados de frente, el de costado (la referencia) y de espaldas. Necesita node para leer las piezas del juego.
# Uso: python docs/arte/heroe-piezas.py  →  docs/arte/heroe-piezas.png
import os, json, subprocess
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
JS = os.path.join(HERE, '..', '..', 'js', 'towerHeroArt.js').replace('\\', '/')
data = json.loads(subprocess.check_output(['node', '-e', f"""
const src = require('fs').readFileSync('{JS}', 'utf8');
const r = new Function(src + '; return {{ pal: HERO_ART.pal, frames: HERO_ART.frames, parts: HERO_PARTS }};')();
console.log(JSON.stringify(r));"""], text=True))
PAL, FR, PARTS = data['pal'], data['frames'], data['parts']

S, BG = 8, (21, 20, 26, 255)
def img(rows):
    w = max(len(r) for r in rows)
    im = Image.new('RGBA', (w * S, len(rows) * S), BG)
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c in PAL: im.paste(Image.new('RGBA', (S, S), PAL[c]), (x * S, y * S))
    return im
def strip(ims, gap=3 * S):
    W = sum(i.width for i in ims) + gap * (len(ims) + 1); H = max(i.height for i in ims) + 2 * gap
    out = Image.new('RGBA', (W, H), BG); x = gap
    for i in ims: out.paste(i, (x, H - gap - i.height)); x += i.width + gap
    return out

piezas = [img(p['rows']) for p in PARTS['body'].values()] + [img(w['rows']) for w in PARTS['weapons'].values()]
names = ['frontIdle', 'frontWalk0', 'frontWalk1', 'frontWalk2', 'frontWalk3', 'idle',
         'backIdle', 'backWalk0', 'backWalk1', 'backWalk2', 'backWalk3']
filas = [strip(piezas), strip([img(FR[n]['rows']) for n in names])]
sheet = Image.new('RGBA', (max(f.width for f in filas), sum(f.height for f in filas)), BG); y = 0
for f in filas: sheet.paste(f, (0, y)); y += f.height
sheet.save(os.path.join(HERE, 'heroe-piezas.png'))
print('ok')
