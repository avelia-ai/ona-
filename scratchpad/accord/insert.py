"""Insère / remplace le bloc « L'Accord parfait » dans product.html (rejouable). Lancer depuis la racine du repo."""
import re
src=open('scratchpad/accord/accord.html').read().strip()
p='product.html'; h=open(p).read()
h=re.sub(r"\n?<!-- ═══ L'ACCORD PARFAIT.*?<!-- /ACCORD -->\n?","\n",h,flags=re.S)
h=h.replace('</body>', src+'\n</body>',1)
if 'id="pdAccord"' not in h:
    h=h.replace('<div class="reviews-mini">${miniReviewsHTML}</div>\n','<div class="reviews-mini">${miniReviewsHTML}</div>\n\n    <div id="pdAccord"></div>\n',1)
if 'renderAccord(product' not in h:
    h=h.replace("      pageBg(product);\n","      try { window.renderAccord && renderAccord(product, data.products); } catch (e) { console.error('accord', e); }\n      pageBg(product);\n",1)
open(p,'w').write(h)
print(h.count('pdAccord'), h.count('renderAccord(product'))
