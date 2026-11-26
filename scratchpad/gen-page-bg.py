"""Couleur de fond de la fiche produit = fond de la 1re photo de la galerie.
Lancer depuis la racine du repo : python3 scratchpad/gen-page-bg.py
Écrit `page_bg` (hex) dans products.json pour chaque produit."""
import json, sys
import numpy as np
from PIL import Image

def edge_color(path):
    im = Image.open(path).convert('RGB')
    im.thumbnail((400, 400))
    a = np.asarray(im).astype(int)
    h, w, _ = a.shape
    b = max(3, int(min(h, w) * 0.03))
    # bande du haut + bandes latérales (2/3 supérieurs) : là où le fond est le plus pur
    band = np.concatenate([
        a[:b].reshape(-1, 3),
        a[: int(h * .66), :b].reshape(-1, 3),
        a[: int(h * .66), -b:].reshape(-1, 3),
    ])
    med = np.median(band, axis=0)
    uni = float((np.abs(band - med).sum(1) < 30).mean())
    return '#%02x%02x%02x' % tuple(int(round(x)) for x in med), uni

d = json.load(open('products.json', encoding='utf-8'))
for p in d['products']:
    src = (p.get('gallery') or [p.get('image')])[0]
    if not src:
        continue
    try:
        col, uni = edge_color(src.lstrip('/'))
    except Exception as e:
        print('!!', p['id'], src, e); continue
    r, g, b = (int(col[i:i+2], 16) for i in (1, 3, 5))
    if (0.2126*r + 0.7152*g + 0.0722*b) / 255 < 0.55:   # fond trop sombre : textes illisibles
        p.pop('page_bg', None); print('   (trop sombre, ignoré)', p['id'], col); continue
    p['page_bg'] = col
    print(f"{p['id']:45s} {col}  uni={uni:.2f}  {src}")
if '--write' in sys.argv:
    json.dump(d, open('products.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('products.json mis à jour')
