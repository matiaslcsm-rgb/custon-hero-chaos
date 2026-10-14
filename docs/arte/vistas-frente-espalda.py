import re, json
from PIL import Image
src=open(r'C:/Users/matia/OneDrive/Desktop/mattbox/custom-hero-chaos/js/towerHeroArt.js',encoding='utf-8').read()
PAL=eval(re.search(r"pal: (\{.*?\}),",src).group(1))
def frame(name):
    m=re.search(name+r": \{ ax: [\d.]+, rows: \[(.*?)\] \}",src,re.S); return re.findall(r"'([^']*)'",m.group(1))

# --- DE FRENTE (mira a la cámara). 20 de ancho; la espada en su mano derecha (a la izquierda de la pantalla) ---
FRONT_TOP = [
"......AAAAA......",
".....AZZZZXA.....",
"....AZZZZZZXA....",
"...AZZZZZZZXWA...",
"...AZZZAAAAXWA...",
"..AZZZAAAAAAXWA..",
"..AZZA!AAA!AXUA..",
"..AZZAAAAAAAXUA..",
"..AWZXAAAAAXWUA..",
".AWZXXXAAAXXWUSA.",
"AWZXXWWXXXWWUUSRA",
"AZXWVAbYcYbAVUSRA",
"AXWAVAYYcYYAVASRA",
"AXRAVATYcYTAVARRA",
"ARRAcAOOcOOAcARPA",
"ARPAAAYYYYYAAAPPA",
".APA.AYTATYA.APA.",
]
FRONT_LEGS = {
 'idle': [".AA..AQQAQQA..AA.", ".....AQQAQQA.....", ".....AQQAQQA.....", "....AbbAAAbbA....", "....AAAA.AAAA...."],
 'w0':   [".AA..AQQAQQA..AA.", ".....AQQAQQA.....", "....AbbAAQQA.....", "....AAAA.AbbA....", ".........AAAA...."],
 'w1':   [".AA..AQQAQQA..AA.", ".....AQQAQQA.....", ".....AQQAQQA.....", "....AbbAAAbbA....", "....AAAA.AAAA...."],
 'w2':   [".AA..AQQAQQA..AA.", ".....AQQAQQA.....", ".....AQQAbbA.....", "....AbbAAAAA.....", "....AAAA........."],
}
SWORD_FRONT = [(14,3,'b'),(14,5,'b'),(15,4,'d'),(16,4,'e'),(17,4,'e'),(18,4,'e'),(19,4,'d'),(20,4,'a')]
BACK_TOP = [
"......AAAAA......",
".....AXZZZXA.....",
"....AXZZZZZXA....",
"...AWZZZZZZZWA...",
"...AWZZZZZZZWA...",
"...AWZZZWZZZXA...",
"...AUWZZWZZXWA...",
"...AUWXZWZXWUA...",
"...ASUWWWWWUSA...",
"..AWZXXXWXXXZWA..",
"..AWXXWUWUWXXWA..",
"..AXWUWURUWUWSA..",
"..AXWUSURUSUWSA..",
"..AWUURURURUUSA..",
"..AUUSRURURSUSA..",
"..ARUSRPRPRSURA..",
"..ARSRPRPRPRSRA..",
"..AARPAPAPAPRAA..",
]
BACK_LEGS = {
 'idle': ["....AQQA.AQQA....", "....AQQA.AQQA....", "...AbbbA.AbbbA...", "...AAAAA.AAAAA..."],
 'w0':   ["....AQQA.AQQA....", "...AbbbA.AQQA....", "...AAAAA.AbbbA...", ".........AAAAA..."],
 'w1':   ["....AQQA.AQQA....", "....AQQA.AQQA....", "...AbbbA.AbbbA...", "...AAAAA.AAAAA..."],
 'w2':   ["....AQQA.AQQA....", "....AQQA.AbbbA...", "...AbbbA.AAAAA...", "...AAAAA........."],
}
SWORD_BACK = [(12,14,'c'),(12,15,'c'),(13,15,'d'),(14,15,'e'),(15,15,'e'),(16,15,'e'),(17,15,'e'),(18,15,'d')]
def build(top, legs, sword, bob=0):
    rows=[list(r) for r in top]+[list(r) for r in legs]
    if bob: rows=[list('.'*len(rows[0]))]+rows[:len(top)]+rows[len(top):] ; rows=rows[:len(top)+len(legs)+1]
    W=max(len(r) for r in rows)
    rows=[r+['.']*(W-len(r)) for r in rows]
    for y,x,c in sword:
        y2=y+(1 if bob else 0)
        if 0<=y2<len(rows) and 0<=x<W: rows[y2][x]=c
    return [''.join(r) for r in rows]
out={}
out['frontIdle']=build(FRONT_TOP,FRONT_LEGS['idle'],SWORD_FRONT)
out['frontWalk0']=build(FRONT_TOP,FRONT_LEGS['w0'],SWORD_FRONT)
out['frontWalk1']=build(FRONT_TOP,FRONT_LEGS['w1'],SWORD_FRONT,bob=1)
out['frontWalk2']=build(FRONT_TOP,FRONT_LEGS['w2'],SWORD_FRONT)
out['frontWalk3']=build(FRONT_TOP,FRONT_LEGS['w1'],SWORD_FRONT,bob=1)
out['backIdle']=build(BACK_TOP,BACK_LEGS['idle'],SWORD_BACK)
out['backWalk0']=build(BACK_TOP,BACK_LEGS['w0'],SWORD_BACK)
out['backWalk1']=build(BACK_TOP,BACK_LEGS['w1'],SWORD_BACK,bob=1)
out['backWalk2']=build(BACK_TOP,BACK_LEGS['w2'],SWORD_BACK)
out['backWalk3']=build(BACK_TOP,BACK_LEGS['w1'],SWORD_BACK,bob=1)
out['sideIdle']=frame('idle')
json.dump(out,open('views.json','w'))
S=10; ims=[]
for n,rows in out.items():
    im=Image.new('RGB',(len(rows[0])*S,len(rows)*S),(40,70,45)); px=im.load()
    for y,r in enumerate(rows):
        for x,ch in enumerate(r):
            if ch in PAL:
                c=tuple(int(PAL[ch][i:i+2],16) for i in (1,3,5))
                for yy in range(S):
                    for xx in range(S): px[x*S+xx,y*S+yy]=c
    ims.append(im)
W=max(i.width for i in ims); H=max(i.height for i in ims)
sh=Image.new('RGB',((W+10)*6,(H+10)*2),(40,70,45))
for i,im in enumerate(ims): sh.paste(im,((i%6)*(W+10),(i//6)*(H+10)+H-im.height))
sh.save('views.png'); print('ok')
