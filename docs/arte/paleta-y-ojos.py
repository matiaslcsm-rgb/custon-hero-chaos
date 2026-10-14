import json, numpy as np
from PIL import Image
fr=json.load(open('raw.json'))
bg=np.array([22,30,49.])
cells=[]
for f in fr:
    g=np.array(f['grid'])
    f['arr']=g
    m=np.abs(g-bg).sum(2)>45
    f['mask']=m
    cells.append(g[m])
allc=np.concatenate(cells)
# k-means
rng=np.random.default_rng(1); K=30
cent=allc[rng.choice(len(allc),K,replace=False)]
for it in range(40):
    d=((allc[:,None,:]-cent[None])**2).sum(2); lab=d.argmin(1)
    for k in range(K):
        if (lab==k).any(): cent[k]=allc[lab==k].mean(0)
# merge very close centers
cent=np.round(cent).astype(int)
order=np.argsort(cent.sum(1)); cent=cent[order]
keys='ABCDEFGHIJLMNOPQRSTUVWXYZabcdefghijlmnopqrstuvwxyz'
pal={keys[i]:'#%02x%02x%02x'%tuple(int(v) for v in c) for i,c in enumerate(cent)}
print(pal)
RED='#ff2a1f'; RED2='#b3120c'
out={}
names={(0,0):'idle',(1,0):'walk0',(1,1):'walk1',(1,2):'walk2',(1,3):'walk3',(2,0):'ready',(2,1):'slashA',(2,2):'slashB',(2,3):'recover',(3,0):'raise',(3,1):'block',(3,2):'use',(3,3):'cheer',(0,1):'idleB',(0,2):'idleC',(0,3):'idleD'}
for f in fr:
    g=f['arr']; m=f['mask'].copy(); h,w=m.shape
    d=((g[:,:,None,:]-cent[None,None])**2).sum(3); lab=d.argmin(2)
    lum=g.sum(2)
    dark=(lum<110)&m
    rows=[]
    for y in range(h):
        s=''
        for x in range(w):
            if not m[y,x]: s+='.'; continue
            # ojo: brillante rodeado de negro (la cara en sombra) -> rojo
            nb=[(y+dy,x+dx) for dy,dx in ((0,1),(0,-1),(1,0),(-1,0)) if 0<=y+dy<h and 0<=x+dx<w]
            r_,g_,b_=g[y,x]
            win=dark[max(0,y-2):y+3,max(0,x-2):x+3]
            def dk(yy,xx): return 0<=yy<h and 0<=xx<w and m[yy,xx] and dark[yy,xx]
            up=any(dk(y-k,x) for k in (1,2)); dn=any(dk(y+k,x) for k in (1,2)); lf=any(dk(y,x-k) for k in (1,2)); rt=any(dk(y,x+k) for k in (1,2))
            blade=any(lum[yy,xx]>560 for yy in range(max(0,y-1),min(h,y+2)) for xx in range(max(0,x-1),min(w,x+2)) if (yy,xx)!=(y,x) and m[yy,xx])
            if not blade and lum[y,x]>280 and (r_-g_)<90 and 0.1*h<y<0.5*h and win.sum()>=11 and up and dn and (lf or rt): s+='!'; continue
            s+=keys[lab[y,x]]
        rows.append(s)
    # recortar a lo usado
    ys=[i for i,r in enumerate(rows) if r.strip('.')]; xs=[i for r in rows for i,ch in enumerate(r) if ch!='.']
    y0,y1=min(ys),max(ys); x0,x1=min(xs),max(xs)
    rows=[r[x0:x1+1] for r in rows[y0:y1+1]]
    # ancla: centro de los pies (filas de abajo)
    bottom=rows[-3:]; fx=[i for r in bottom for i,ch in enumerate(r) if ch!='.']
    out[names[(f['r'],f['c'])]]={'rows':rows,'ax':round(sum(fx)/len(fx),1)}
pal['!']=RED
json.dump({'pal':pal,'frames':out},open('sprites.json','w'),indent=0)
# vista previa
S=8; ims=[]
for n,o in out.items():
    rows=o['rows']; im=Image.new('RGB',(len(rows[0])*S,len(rows)*S),(40,70,45)); px=im.load()
    for y,r in enumerate(rows):
        for x,ch in enumerate(r):
            if ch=='.': continue
            c=tuple(int(pal[ch][i:i+2],16) for i in (1,3,5))
            for yy in range(S):
                for xx in range(S): px[x*S+xx,y*S+yy]=c
    ims.append(im)
W=max(i.width for i in ims); H=max(i.height for i in ims)
sh=Image.new('RGB',(W*4+40,H*4+40),(40,70,45))
for i,im in enumerate(ims): sh.paste(im,((i%4)*(W+10),(i//4)*(H+10)+(H-im.height)))
sh.save('quant.png'); print('ok', {n:(len(o['rows'][0]),len(o['rows'])) for n,o in out.items()})
