from PIL import Image
import numpy as np, json
im=np.asarray(Image.open('ref.jpg').convert('RGB')).astype(float)
H,W,_=im.shape
bg=np.array([22,30,49.])
cols=[(71,471),(525,991),(1023,1502),(1568,2000)]
rows=[(54,443),(544,935),(1062,1438),(1470,1965)]
gx=np.abs(np.diff(im,axis=1)).sum(2); gx=np.pad(gx,((0,0),(0,1)))
gy=np.abs(np.diff(im,axis=0)).sum(2); gy=np.pad(gy,((0,1),(0,0)))
def fit(prof, lo, hi):
    best=None
    for p in np.arange(14.0,18.0,0.02):
        for o in np.arange(0,p,0.25):
            xs=np.arange(lo-20+o, hi+20, p)
            xs=xs[(xs>=0)&(xs<len(prof)-1)]
            idx=np.round(xs).astype(int)
            s=prof[idx].mean()
            if best is None or s>best[0]: best=(s,p,o)
    return best
frames=[]
for r,(y0,y1) in enumerate(rows):
    for c,(x0,x1) in enumerate(cols):
        reg=(slice(max(0,y0-10),min(H,y1+10)),slice(max(0,x0-10),min(W,x1+10)))
        px=gx[reg].sum(0); py=gy[reg].sum(1)
        bx=fit(np.pad(px,(max(0,x0-10),0)), x0, x1); by=fit(np.pad(py,(max(0,y0-10),0)), y0, y1)
        _,p,ox=bx; _,q,oy=by
        # cell grid: boundaries at ox + k*p (absolute)
        kx0=int(np.floor((x0-25-ox)/p)); kx1=int(np.ceil((x1+25-ox)/p))
        ky0=int(np.floor((y0-25-oy)/q)); ky1=int(np.ceil((y1+25-oy)/q))
        grid=[]
        for ky in range(ky0,ky1):
            row=[]
            for kx in range(kx0,kx1):
                a=ox+kx*p; b=oy+ky*q
                xa=int(round(a+p*0.3)); xb=int(round(a+p*0.7)); ya=int(round(b+q*0.3)); yb=int(round(b+q*0.7))
                xa=max(0,min(W-1,xa)); xb=max(xa+1,min(W,xb)); ya=max(0,min(H-1,ya)); yb=max(ya+1,min(H,yb))
                cell=im[ya:yb,xa:xb].reshape(-1,3)
                row.append(np.median(cell,0).tolist())
            grid.append(row)
        frames.append({'r':r,'c':c,'p':p,'q':q,'grid':grid})
        print(r,c,round(p,2),round(q,2),len(grid[0]),len(grid))
json.dump(frames,open('raw.json','w'))
