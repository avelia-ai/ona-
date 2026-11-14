"""Visuels de la page de paiement Stripe (lancer depuis la racine du repo).
checkout-<id>.jpg (soin seul), checkout-<id>--<formule>.jpg (duo/rituel), checkout-routine.jpg (Bar), checkout-logo-v2.png."""
import json, os, subprocess
from PIL import Image, ImageFilter
S = 1000
_d = json.load(open('products.json')); ps = _d if isinstance(_d, list) else _d['products']; pm = {p['id']: p for p in ps}
def hd(i):
    f = f'bar-{i}-hd.jpg'
    return Image.open(f).convert('RGB') if os.path.exists(f) else None
def bg(im): return im.getpixel((8, 8))
def strip(im, w, h, scale):
    im = im.resize((int(1200*scale), int(1500*scale)), Image.LANCZOS)
    c = Image.new('RGB', (w, h), bg(im))
    x = (im.width - w)//2; y = (im.height - h)//2
    c.paste(im.crop((max(0, x), max(0, y), max(0, x)+min(w, im.width), max(0, y)+min(h, im.height))), (max(0, -x), max(0, -y)))
    return c
def tiles(ids, out):
    ims = [hd(i) for i in ids]
    if not all(ims): return False
    n = len(ims); w = S//n; c = Image.new('RGB', (S, S), (255, 255, 255))
    sc = {1: 0.83, 2: 0.76, 3: 0.6}[n]
    for k, im in enumerate(ims):
        c.paste(strip(im, w - (6 if k < n-1 else 0), S, sc), (k*w, 0))
    c.save(out, quality=88, optimize=True, progressive=True); return True
done = 0
for p in ps:
    if tiles([p['id']], f"checkout-{p['id']}.jpg"): done += 1
    for b in (p.get('bundles') or [])[1:]:
        ids = [x.replace('cart-', '').replace('.jpg', '').replace('-v2', '') for x in (b.get('product_images') or [])]
        ids = [i for i in ids if i in pm]
        if len(set(ids)) >= 2 and tiles(list(dict.fromkeys(ids))[:3], f"checkout-{p['id']}--{b['id']}.jpg"): done += 1
# routine sur mesure : la mannequin du Bar sur fond rose poudré
m = Image.open('bar-noel-modele.webp').convert('RGBA')
c = Image.new('RGB', (S, S)); px = c.load()
for y in range(S):
    t = y/S; col = tuple(int(a + (b-a)*t) for a, b in zip((250, 232, 230), (226, 176, 186)))
    for x in range(S): px[x, y] = col
h = int(S*1.02); m = m.resize((int(m.width*h/m.height), h), Image.LANCZOS)
c.paste(m, ((S-m.width)//2, S-h+40), m); c.save('checkout-routine.jpg', quality=88, optimize=True, progressive=True)
# logo : mot ONAĒ recadré, fond transparent
subprocess.run(['rsvg-convert', '-w', '1600', '-h', '1600', 'logo-onae.svg', '-o', '/tmp/logo-big.png'], check=True)
L = Image.open('/tmp/logo-big.png'); bb = L.getbbox(); L = L.crop(bb)
pad = int(L.height*0.04); o = Image.new('RGBA', (L.width+2*pad, L.height+2*pad), (0, 0, 0, 0)); o.paste(L, (pad, pad), L)
o.save('checkout-logo-v2.png', optimize=True)
print(done, 'visuels', o.size)
