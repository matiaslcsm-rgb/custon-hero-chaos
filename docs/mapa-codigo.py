# Mapa del código (docs/MAPA-CODIGO.md): qué globales declara cada archivo y qué archivos de cada modo las usan.
# Uso: python docs/mapa-codigo.py
import re, os, sys, collections
sys.stdout.reconfigure(encoding='utf-8')
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
html = open(os.path.join(root, 'index.html'), encoding='utf-8').read()
files = re.findall(r'<script[^>]*src="(js/[^"]+)"', html)

def es_torre(f):
    b = os.path.basename(f)
    return b.startswith('tower') or b == 'inkart.js'

src = {f: open(os.path.join(root, f), encoding='utf-8').read() for f in files}

def limpio(t):  # sin comentarios ni textos, para no contar menciones falsas
    t = re.sub(r'/\*.*?\*/', ' ', t, flags=re.S)
    t = re.sub(r'//[^\n]*', ' ', t)
    t = re.sub(r"'(?:\\.|[^'\\\n])*'", "''", t)
    t = re.sub(r'"(?:\\.|[^"\\\n])*"', '""', t)
    return t
cl = {f: limpio(t) for f, t in src.items()}

decl = re.compile(r'^(?:async\s+)?(function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)', re.M)
defs = {}
for f in files:
    for kind, name in decl.findall(cl[f]):
        defs.setdefault(name, (f, kind))
words = {f: collections.Counter(re.findall(r'(?<![\w$.])([A-Za-z_$][\w$]*)', cl[f])) for f in files}
uso = {n: [g for g in files if g != f and words[g][n] > 0] for n, (f, k) in defs.items()}

tower = [f for f in files if es_torre(f)]
otros = [f for f in files if not es_torre(f) and 'tests.js' not in f]
print('== archivos no-torre: globales propias, cuántas usa la torre, cuántas el resto ==')
for f in otros:
    mine = [n for n, d in defs.items() if d[0] == f]
    tu = [n for n in mine if any(u in tower for u in uso[n])]
    cu = [n for n in mine if any(u in otros for u in uso[n])]
    print(f'{f:32} {src[f].count(chr(10)):5}l defs={len(mine):3} torre={len(tu):3} resto={len(cu):3} gameMode={len(re.findall(r"gameMode", cl[f]))}')
print('== globales de la torre usadas por archivos no-torre ==')
for n, d in defs.items():
    if d[0] in tower:
        o = [u for u in uso[n] if u in otros]
        if o: print(n, d[0], '->', o)
print('== let/var del núcleo (estado que cambia) usados por la torre ==')
for n, d in defs.items():
    if d[1] in ('let', 'var') and d[0] not in tower:
        t = [u for u in uso[n] if u in tower]; c = [u for u in uso[n] if u in otros]
        if t: print(f'{n:24} {d[0]:20} torre={len(t)} resto={len(c) + (d[0] in otros)}')
print('== nombres declarados dos veces ==')
seen = collections.defaultdict(list)
for f in files:
    for kind, name in decl.findall(cl[f]): seen[name].append(f)
for n, fs in seen.items():
    if len(fs) > 1: print(n, fs)
print(f'== líneas: torre {sum(src[f].count(chr(10)) for f in tower)}, resto {sum(src[f].count(chr(10)) for f in otros)}')
