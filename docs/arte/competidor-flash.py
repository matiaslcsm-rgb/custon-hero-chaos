# Boceto de Flash (competidora de MATCH) en pixel art, con la paleta del show (docs/CONCEPTO-FUTURISTA.md).
# Es para aprobar el aspecto en la ficha (docs/competidores/flash.md), no el sprite final del juego.
# Uso: python docs/arte/competidor-flash.py  →  docs/competidores/flash.png
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PAL = {
    '.': None,
    'k': (0x1e, 0x3a, 0x5f),  # azul tinta: contorno y sombras
    'w': (0xf2, 0xf0, 0xe9),  # hueso: campera
    'g': (0xc9, 0xcc, 0xd1),  # gris claro: pliegues, botas
    'y': (0xff, 0xd2, 0x3f),  # amarillo: el flash y los detalles
    'c': (0x29, 0xe0, 0xff),  # cian: visor y lente
    'm': (0xff, 0x3e, 0xa5),  # magenta: el "EN VIVO" de la cámara
    's': (0xe8, 0xb8, 0x96),  # piel
    'h': (0x3a, 0x2a, 0x4a),  # pelo
}
# 24 x 32: de tres cuartos, la cámara al hombro (a la derecha) con el flash arriba
ART = [
    "........................",
    "..............yyy.......",
    ".............yyyyy......",
    "..............ykky......",
    "......hhhh....kggk......",
    ".....hhhhhh..kkkkkkk....",
    "....hhkkkkhh.kgggggkkk..",
    "....hkccccckkkgmgggkcck.",
    "....hkcccccckgggggkkcck.",
    "....hksssssskkkkkkkkkk..",
    ".....kssksskwwk.........",
    ".....kkssssk.wwk........",
    "......kkkkkwwwwk........",
    ".....kwwwwwwwwwwk.......",
    "....kwwgwwwwwwgwwk......",
    "....kwwgwwywwwgwwk......",
    "....kwgkwwywwwkgwk......",
    "....kwgkwwwwwwkgwk......",
    "....kssk.wwwwwkssk......",
    "....kssk.wwwwwkssk......",
    ".....kk.kyyyyk.kk.......",
    "........kwwwwk..........",
    "........kwwkwk..........",
    "........kwwkwk..........",
    "........kwwkwwk.........",
    "........kwk.kwk.........",
    "........kwk.kwk.........",
    "........kgk.kgk.........",
    ".......kggk.kggk........",
    ".......kkkk.kkkk........",
    "........................",
    "........................",
]
assert all(len(r) == 24 for r in ART), [len(r) for r in ART]
img = Image.new('RGBA', (24, 32), (0, 0, 0, 0))
for y, row in enumerate(ART):
    for x, ch in enumerate(row):
        c = PAL.get(ch)
        if c: img.putpixel((x, y), c + (255,))
# lámina: el boceto grande sobre el fondo claro del estudio, y a tamaño real al lado
sheet = Image.new('RGBA', (24 * 10 + 60, 32 * 10 + 20), (0xe4, 0xe7, 0xec, 255))
sheet.alpha_composite(img.resize((240, 320), Image.NEAREST), (10, 10))
sheet.alpha_composite(img.resize((48, 64), Image.NEAREST), (250, 20))
out = os.path.join(ROOT, 'docs', 'competidores'); os.makedirs(out, exist_ok=True)
sheet.save(os.path.join(out, 'flash.png'))
print('ok')
