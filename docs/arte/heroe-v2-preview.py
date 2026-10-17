# Héroe de frente y de espaldas, versión 2 (pedido del usuario 2026-10-16: "de frente es medio cabezón; estilizar la
# capucha y el personaje"): capucha más chica y en punta (8 filas en vez de 10) y el cuerpo más largo. Mismo alto total
# (22) y mismas piernas que vistas-frente-espalda.py, así la caminata sale igual.
# Uso: python docs/arte/heroe-v2-preview.py  →  docs/arte/heroe-v2-preview.png (actual vs. nuevo, al lado del de costado)
import re, os, json
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, '..', '..', 'js', 'towerHeroArt.js'), encoding='utf-8').read()
PAL = json.loads(re.search(r'pal: (\{.*?\})', src).group(1))
def frame(name): return re.findall(r"'([^']*)'", re.search(name + r": \{ ax: [\d.]+, rows: \[(.*?)\]", src, re.S).group(1))

FRONT_TOP = [
    "........A........",
    ".......AZA.......",
    "......AZZXA......",
    ".....AZZZZXA.....",
    ".....AZAAAXA.....",
    "....AZA!A!AXA....",
    "....AZAAAAAXA....",
    "...AWZXAAAXWUA...",
    "..AWZXXXXXXXWUA..",
    "..AZXWXbcbXWUSA..",
    ".AWZXWVYYYVWUSRA.",
    ".AZXWAVYcYVAUSRA.",
    "AXWRAVATYTAVASRRA",
    "AXRRAVAOOOAVARRPA",
    "ARRAAcAYYYAcAARPA",
    "ARPA.AAYYYAA.APPA",
    ".APA.AYTATYA.APA.",
]
FRONT_LEGS = [".AA..AQQAQQA..AA.", ".....AQQAQQA.....", ".....AQQAQQA.....", "....AbbAAAbbA....", "....AAAA.AAAA...."]
SWORD_FRONT = [(14, 4, 'b'), (14, 6, 'b'), (15, 5, 'd'), (16, 5, 'e'), (17, 5, 'e'), (18, 5, 'e'), (19, 5, 'd'), (20, 5, 'a')]
BACK_TOP = [
    "........A........",
    ".......AXA.......",
    "......AXZXA......",
    ".....AXZZZXA.....",
    ".....AWZZZWA.....",
    "....AWZZWZZWA....",
    "....AUWZWZXWA....",
    "...ASUWWWWWUSA...",
    "..AWZXXXWXXXZWA..",
    "..AWXXWUWUWXXWA..",
    "..AXWUWURUWUWSA..",
    "..AXWUSURUSUWSA..",
    "..AWUURURURUUSA..",
    "..AUUSRURURSUSA..",
    "..ARUSRPRPRSURA..",
    "..ARSRPRPRPRSRA..",
    "..ARSRPRPRPRSRA..",
    "..AARPAPAPAPRAA..",
]
BACK_LEGS = ["....AQQA.AQQA....", "....AQQA.AQQA....", "...AbbbA.AbbbA...", "...AAAAA.AAAAA..."]
SWORD_BACK = [(12, 14, 'c'), (12, 15, 'c'), (13, 15, 'd'), (14, 15, 'e'), (15, 15, 'e'), (16, 15, 'e'), (17, 15, 'e'), (18, 15, 'd')]

def build(top, legs, sword):
    rows = [list(r) for r in top + legs]
    for y, x, c in sword: rows[y][x] = c
    return [''.join(r) for r in rows]
assert all(len(r) == 17 for r in FRONT_TOP + FRONT_LEGS + BACK_TOP + BACK_LEGS)
new = {'frontIdle': build(FRONT_TOP, FRONT_LEGS, SWORD_FRONT), 'backIdle': build(BACK_TOP, BACK_LEGS, SWORD_BACK)}

S = 10
def img(rows):
    im = Image.new('RGBA', (len(rows[0]) * S, len(rows) * S), (21, 20, 26, 255))
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c in PAL: im.paste(Image.new('RGBA', (S, S), PAL[c]), (x * S, y * S))
    return im
shown = [frame('frontIdle'), new['frontIdle'], frame('idle'), frame('backIdle'), new['backIdle']]
ims = [img(r) for r in shown]
W = sum(i.width for i in ims) + 20 * len(ims); H = max(i.height for i in ims)
sheet = Image.new('RGBA', (W, H), (21, 20, 26, 255)); x = 0
for i in ims: sheet.paste(i, (x, H - i.height)); x += i.width + 20
sheet.save(os.path.join(HERE, 'heroe-v2-preview.png'))
json.dump(new, open(os.path.join(HERE, 'heroe-v2.json'), 'w'), indent=1)
print('ok')
