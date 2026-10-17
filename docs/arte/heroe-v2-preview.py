# Héroe de frente y de espaldas, versión 2 (pedido del usuario 2026-10-16: "de frente es medio cabezón; estilizar la
# capucha y el personaje"; 2026-10-17: "que conserven los rasgos del de costado"). Se dibujan copiando al de costado
# (idle): mismo alto (24 filas), capucha redonda de 9 filas con la abertura oscura y los dos ojos juntos, hombros de capa,
# broche dorado, túnica gris con cinturón dorado, capa hasta la rodilla y botas doradas. Luz desde la izquierda.
# Uso: python docs/arte/heroe-v2-preview.py  →  docs/arte/heroe-v2-preview.png (frente nuevo, costado, espalda nueva)
import re, os, json
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, '..', '..', 'js', 'towerHeroArt.js'), encoding='utf-8').read()
PAL = json.loads(re.search(r'pal: (\{.*?\})', src).group(1))
def frame(name): return re.findall(r"'([^']*)'", re.search(name + r": \{ ax: [\d.]+, rows: \[(.*?)\]", src, re.S).group(1))

FRONT = [
    "......AAAAA......",  # capucha: misma cúpula que el de costado
    ".....AZZZZXA.....",
    "....AZZZZZXWA....",
    "...AZZZZZZXWUA...",
    "...AZZAAAAAXUA...",  # abertura de la cara
    "..AZZAAAAAAAXUA..",
    "..AZZAA!A!AAXUA..",  # ojos juntos, como de costado
    "..AWZAAAAAAAXUA..",
    "..AWZXAAAAAXWUA..",
    ".AWZXXXAAAXXWUSA.",  # hombros de capa
    "AWZXXWWXXXWWUUSRA",
    "AZXWRPPbcbPPRUSRA",  # capa abierta con el broche dorado
    "AXWRPVYYcYYVPRSRA",  # túnica gris
    "AXRPAVYYcYYVAPRPA",
    "ARRPAOObcbOOAPRPA",  # cinturón con hebilla
    "ARPA.AYYYYYA.APPA",
    ".APA.AYTATYA.APA.",
    ".APA.AQQAQQA.APA.",  # la capa baja hasta la rodilla
    ".AA..AQQAQQA..AA.",
    ".....AQQAQQA.....",
    ".....AQQAQQA.....",
    ".....AbbAbbA.....",  # botas doradas
    "....AbcbAbcbA....",
    "....AAAA.AAAA....",
]
SWORD_FRONT = [(14, 3, 'b'), (14, 4, 'c'), (14, 5, 'b')] + [(y, 4, 'd' if y == 15 else 'e') for y in range(15, 20)] + [(20, 4, 'a')]
BACK = [
    "......AAAAA......",
    ".....AXZZZXA.....",
    "....AXZZZZZXA....",
    "...AWZZZZZZZWA...",
    "...AWZZZZZZZWA...",
    "..AWZZZZWZZZZWA..",  # costura de la capucha
    "..AUWZZZWZZZXWA..",
    "..AUWXZZWZZXWUA..",
    "..ASUWWWWWWWUSA..",
    ".AWZXXXXWXXXXZWA.",  # hombros de capa
    "AWZXXWUWUWUWXXWSA",
    "AXWUWURURURUWUWSA",  # pliegues de la capa
    "AXWUSURURURUSUWSA",
    "AWUURURURURURUUSA",
    "AUUSRURURURURSUSA",
    "ARUSRPRPRPRPRSURA",
    "ARSRPRPRPRPRPRSRA",
    ".ARSPRPRPRPRPSRA.",
    ".AARPAPAPAPAPRAA.",
    ".....AQQAQQA.....",
    ".....AQQAQQA.....",
    ".....AbbAbbA.....",
    "....AbbbAbbbA....",
    "....AAAA.AAAA....",
]
SWORD_BACK = [(13, 15, 'b'), (13, 16, 'c')] + [(y, 16, 'd' if y == 14 else 'e') for y in range(14, 20)] + [(20, 16, 'a')]

def build(rows, sword):
    rows = [list(r) for r in rows]
    for y, x, c in sword: rows[y][x] = c
    return [''.join(r) for r in rows]
side = frame('idle')
assert all(len(r) == 17 for r in FRONT + BACK) and len(FRONT) == len(BACK) == len(side)
new = {'frontIdle': build(FRONT, SWORD_FRONT), 'backIdle': build(BACK, SWORD_BACK)}

S = 10
def img(rows):
    im = Image.new('RGBA', (len(rows[0]) * S, len(rows) * S), (21, 20, 26, 255))
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c in PAL: im.paste(Image.new('RGBA', (S, S), PAL[c]), (x * S, y * S))
    return im
ims = [img(r) for r in (new['frontIdle'], side, new['backIdle'])]
W = sum(i.width for i in ims) + 20 * len(ims); H = max(i.height for i in ims)
sheet = Image.new('RGBA', (W, H), (21, 20, 26, 255)); x = 0
for i in ims: sheet.paste(i, (x, H - i.height)); x += i.width + 20
sheet.save(os.path.join(HERE, 'heroe-v2-preview.png'))
json.dump(new, open(os.path.join(HERE, 'heroe-v2.json'), 'w'), indent=1)
print('ok')
