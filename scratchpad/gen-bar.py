# Visuels du Bar à routines (bar-<id>-v2.jpg) : produit isolé (plus grande forme connexe, sans pictos ni logos), centré, même échelle partout.
import json, statistics
import numpy as np
from scipy import ndimage
from PIL import Image
P=[p for p in json.load(open('products.json'))['products'] if p.get('category') not in ('box','cadeau')]
OUT_W,OUT_H=600,750; FILLH,FILLW=.68,.76
HARD={'creme-contour-cannabidiol':(188,105,382,655)}   # fond photo dégradé : cadrage manuel
sheet=[]
for p in P:
  im=Image.open('cart-%s.jpg'%p['id']).convert('RGB'); W,H=im.size; a=np.asarray(im).astype(int)
  # couleur de fond = médiane d'une bande intérieure (évite les bandes noires de certains visuels)
  ring=np.concatenate([a[int(H*.9):int(H*.97),int(W*.08):int(W*.92)].reshape(-1,3),a[int(H*.25):int(H*.9),int(W*.9):int(W*.93)].reshape(-1,3)])
  bg=tuple(int(v) for v in np.median(ring,axis=0))
  if p['id'] in HARD: x0,y0,x1,y1=HARD[p['id']]
  else:
    d=np.abs(a-np.array(bg)).sum(axis=2)>60
    d[:, :int(W*.045)]=False; d[:, int(W*.955):]=False; d[int(H*.985):,:]=False
    d=ndimage.binary_opening(d,iterations=1); d=ndimage.binary_closing(d,iterations=6)
    lab,n=ndimage.label(d)
    sizes=ndimage.sum(d,lab,range(1,n+1))
    # composantes candidates : grosses et dont le centre est dans la moitié centrale (les pictos sont à gauche, les logos en haut)
    objs=ndimage.find_objects(lab)
    keep=[]
    big=max(sizes)
    main=int(np.argmax(sizes))
    ms=objs[main]
    for i,(sl,sz) in enumerate(zip(objs,sizes)):
      cy=(sl[0].start+sl[0].stop)/2/H; cx=(sl[1].start+sl[1].stop)/2/W
      near=sl[1].start<ms[1].stop+W*.04 and sl[1].stop>ms[1].start-W*.04 and sl[0].start<ms[0].stop and sl[0].stop>ms[0].start-H*.03
      vov=sl[0].start<ms[0].stop and sl[0].stop>ms[0].start
      if i==main or (sz>big*.05 and near and cy>.22) or (sz>big*.08 and vov and cx>.24 and cx<.95 and cy>.24): keep.append(sl)
    y0=min(s[0].start for s in keep); y1=max(s[0].stop for s in keep); x0=min(s[1].start for s in keep); x1=max(s[1].stop for s in keep)
    pad=5; x0,y0,x1,y1=max(0,x0-pad),max(0,y0-pad),min(W,x1+pad),min(H,y1+pad)
  prod=im.crop((x0,y0,x1,y1)); pw,ph=prod.size
  s=min(OUT_H*FILLH/ph, OUT_W*FILLW/pw)
  prod=prod.resize((max(1,round(pw*s)),max(1,round(ph*s))),Image.LANCZOS)
  out=Image.new('RGB',(OUT_W,OUT_H),bg)
  out.paste(prod,((OUT_W-prod.size[0])//2,round(OUT_H*.5-prod.size[1]/2)))
  out.save('bar-%s-v2.jpg'%p['id'],quality=88,optimize=True); sheet.append(out)
  print(p['id'],(x0,y0,x1,y1),round(s,2))
W,H=120,150;cols=9
sh=Image.new('RGB',(cols*W,((len(sheet)+cols-1)//cols)*H),'white')
for i,r in enumerate(sheet): sh.paste(r.resize((W,H)),((i%cols)*W,(i//cols)*H))
sh.save('/home/claude/scratch/sheet3.png')
