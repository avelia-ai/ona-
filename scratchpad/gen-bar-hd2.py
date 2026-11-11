# Visuels HD du tiroir « Découvrir » (bar-<id>-hd.jpg, 1200×1500) : même cadrage que bar-<id>-v2.jpg,
# mais recadré dans l'image d'origine haute définition (boxes calculées par correspondance miniature ↔ original).
import json
from PIL import Image
P={p['id']:p for p in json.load(open('products.json'))['products']}
res=json.load(open('/home/claude/scratch/boxes.json'))
OUT_W,OUT_H=1200,1500; FILLH,FILLW=.68,.76
for pid,r in res.items():
  if r['diff']>8: continue   # gardé : version détectée directement sur l'original (gen-bar-hd.py)
  full=Image.open(r.get('src',P[pid]['image'])).convert('RGB'); k=r['k']
  x0,y0,x1,y1=r['box']; box=tuple(round(v) for v in ((x0+r['dx'])/k,(y0+r['dy'])/k,(x1+r['dx'])/k,(y1+r['dy'])/k))
  prod=full.crop(box); pw,ph=prod.size
  s=min(OUT_H*FILLH/ph, OUT_W*FILLW/pw)
  prod=prod.resize((round(pw*s),round(ph*s)),Image.LANCZOS)
  out=Image.new('RGB',(OUT_W,OUT_H),tuple(r['bg'])); out.paste(prod,((OUT_W-prod.size[0])//2,round(OUT_H*.5-prod.size[1]/2)))
  out.save('bar-%s-hd.jpg'%pid,quality=86,optimize=True,progressive=True); print(pid, box, round(s,2))
