import cv2, glob, json, numpy as np, os, sys
os.chdir('/home/claude/ona-')
P=json.load(open('products.json'))['products']
L=[(p['id'],x) for p in P for x in (p.get('gallery') or []) if 'avant' in x]
cands=sorted(glob.glob('ba-*.jpg'))
C={f:cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY) for f in cands}
def panels(f):
    im=cv2.imread(f)
    if im[700,525].mean()>235 and abs(int(im[700,522].mean())-int(im[700,528].mean()))<30 and im[200,30].mean()<200:  # côte à côte
        pass
    a=im.astype(int); bg=a[:,3:6].mean(1,keepdims=True); m=(np.abs(a-bg).sum(2)>40)
    if m[700,10] : return [im[0:1290,0:522], im[0:1290,528:1050]], 'side'
    if m[200,30]: return [im[189:1170,28:517], im[189:1170,533:1021]],'sat'
    return [im[275:1100,40:518], im[275:1100,531:1009]],'pale'
res={}
for pid,f in L:
    ps,kind=panels(f); out=[]
    for pan in ps:
        g=cv2.cvtColor(pan,cv2.COLOR_BGR2GRAY); T=cv2.resize(g,(48,int(48*g.shape[0]/g.shape[1])))
        best=(-1,None,None)
        for cf,cg in C.items():
            for W in range(56,140,4):
                H=int(W*cg.shape[0]/cg.shape[1]); s=cv2.resize(cg,(W,H),interpolation=cv2.INTER_AREA)
                if s.shape[0]<T.shape[0] or s.shape[1]<T.shape[1]: continue
                r=cv2.matchTemplate(s,T,cv2.TM_CCOEFF_NORMED); _,mx,_,loc=cv2.minMaxLoc(r)
                if mx>best[0]: best=(mx,cf,(W,loc))
        out.append((round(best[0],3),best[1],best[2],kind))
    res[f]=out; print(f,out,flush=True)
json.dump(res,open('/tmp/ba/match.json','w'),default=str)
