# -*- coding: utf-8 -*-
"""Génère card-<id>.jpg (800x640) à partir de la 1re photo de la galerie.
Usage : python3 -I scratchpad/gen-card.py [id ...]   (sans argument : tous les produits)
Détecte la zone produit (sujet + éléments décoratifs proches), ignore les
logos de marque collés en haut/bas, recadre en 5:4 avec marge.
"""
import json, sys, os
import numpy as np
from PIL import Image
from scipy import ndimage

# format : (largeur, hauteur, part de la largeur, part de la hauteur, centre vertical)
FORMATS = {
    'card': ('card-%s.jpg',  800,  640, 0.82, 0.74, 0.47),
    'cart': ('cart-%s.jpg',  560,  700, 0.90, 0.84, 0.50),
    'mf':   ('mf-%s.jpg',   1200,  640, 0.52, 0.80, 0.50),
    'bar':  ('bar-%s-v2.jpg', 600,  750, 0.76, 0.68, 0.50),
    'barhd':('bar-%s-hd.jpg',1200, 1500, 0.76, 0.68, 0.50),
}
W, H = 800, 640
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def bg_color(a):
    e = np.concatenate([a[:6].reshape(-1,3), a[-6:].reshape(-1,3),
                        a[:,:6].reshape(-1,3), a[:,-6:].reshape(-1,3)])
    return np.median(e, 0)

def subject_box(a):
    bg = bg_color(a)
    d = np.abs(a.astype(np.int16) - bg).sum(2)
    m = d > 26
    m = ndimage.binary_opening(m, np.ones((5,5)))
    lab, n = ndimage.label(m)
    if n == 0: return None, bg
    h, w = m.shape
    lo, hi = h*0.18, h*0.78                  # centre admis : hors logos marque/gamme
    boxes = ndimage.find_objects(lab)
    sizes = ndimage.sum(m, lab, range(1, n+1))
    keep = []
    for i, sl in enumerate(boxes):
        if sizes[i] < m.size * 0.0012: continue   # bruit
        ys, xs = sl
        yc = (ys.start + ys.stop)/2
        if yc < lo or yc > hi: continue          # logo haut / logo de gamme en bas
        keep.append((ys.start, ys.stop, xs.start, xs.stop))
    if not keep: return None, bg
    y0 = min(k[0] for k in keep); y1 = max(k[1] for k in keep)
    x0 = min(k[2] for k in keep); x1 = max(k[3] for k in keep)
    y1 = min(y1, int(h*0.80))                # coupe le reflet et le logo de gamme
    return (x0, y0, x1, y1), bg

def make(src, out, W=800, H=640, fw=0.82, fh=0.74, cy=0.47):
    im = Image.open(os.path.join(ROOT, src)).convert('RGB')
    a = np.asarray(im)
    box, bg = subject_box(a)
    if box is None:
        im.resize((W,H), Image.LANCZOS).save(os.path.join(ROOT,out), quality=88, optimize=True)
        return 'plein cadre'
    x0,y0,x1,y1 = box
    sub = im.crop((x0,y0,x1,y1))
    bw,bh = sub.size
    k = min(W*fw/bw, H*fh/bh)
    sub = sub.resize((max(1,int(bw*k)), max(1,int(bh*k))), Image.LANCZOS)
    # fondu du bas : évite la coupe nette là où le reflet a été tronqué
    sw, sh = sub.size
    fade = max(1, int(sh*0.14))
    alpha = Image.new('L', (sw, sh), 255)
    import numpy as _np
    g = _np.ones((sh, sw), _np.uint8)*255
    ramp = _np.linspace(255, 0, fade).astype(_np.uint8)[:,None]
    g[sh-fade:] = ramp
    alpha = Image.fromarray(g)
    canvas = Image.new('RGB', (W,H), tuple(int(v) for v in bg))
    canvas.paste(sub, ((W-sw)//2, int(H*cy-sh/2)), alpha)
    canvas.save(os.path.join(ROOT,out), quality=88, optimize=True)
    return 'sujet %dx%d -> %d%%' % (bw, bh, round(k*100))

if __name__ == '__main__':
    data = json.load(open(os.path.join(ROOT,'products.json'), encoding='utf-8'))
    prods = data['products'] if isinstance(data, dict) else data
    args = sys.argv[1:]
    fmts = [a[2:] for a in args if a.startswith('--')] or ['card']
    ids = [a for a in args if not a.startswith('--')]
    for p in prods:
        pid = p.get('id','')
        if ids and pid not in ids: continue
        if pid.startswith('carte-cadeau'): continue
        g = (p.get('gallery') or [p.get('image')])[0]
        if not g: continue
        for f in fmts:
            tpl, w, h, fw, fh, cy = FORMATS[f]
            out = tpl % pid
            if f != 'card' and not os.path.exists(os.path.join(ROOT, out)): continue
            print('%-5s %-42s %s' % (f, pid, make(g, out, w, h, fw, fh, cy)))
