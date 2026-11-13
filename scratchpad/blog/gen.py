# -*- coding: utf-8 -*-
"""Générateur du Journal Onaé.
Lancer depuis la racine du repo :  python3 scratchpad/blog/gen.py
Produit : blog-<slug>.html (articles), blog.html (index), journal.json (maillage fiches produits),
journal-<slug>.jpg (couverture 2000x860) et og/journal-<slug>.jpg (partage 1200x630).
Le contenu des articles est dans scratchpad/blog/articles_*.py (liste ARTICLES)."""
import json, os, re, sys, html, glob, importlib.util, datetime, math
from PIL import Image, ImageFilter, ImageEnhance

ROOT = os.getcwd()
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = 'https://www.onaecosmetics.fr'
PV = re.search(r'products\.json\?v=(\d+)', open('index.html', encoding='utf-8').read()).group(1)

# ---------- sources externes vérifiées ----------
SOURCES = {
  'niacinamide': ('Bissett, Oblong & Berge — « Niacinamide: A B vitamin that improves aging facial skin appearance », Dermatologic Surgery, 2005', 'https://pubmed.ncbi.nlm.nih.gov/16029679/'),
  'bakuchiol': ('Dhaliwal et al. — étude randomisée en double aveugle bakuchiol vs rétinol, British Journal of Dermatology, 2019', 'https://onlinelibrary.wiley.com/doi/abs/10.1111/bjd.16918'),
  'bakuchiol-bad': ('British Association of Dermatologists — communiqué sur l\'étude bakuchiol / rétinol', 'https://www.skinhealthinfo.org.uk/plant-extract-found-to-rival-leading-anti-ageing-skincare-ingredient-research-shows/'),
  'microbiome': ('Byrd, Belkaid & Segre — « The human skin microbiome », Nature Reviews Microbiology, 2018', 'https://doi.org/10.1038/nrmicro.2017.157'),
  'microbiome2': ('Chen, Fischbach & Belkaid — « Skin microbiota–host interactions », Nature, 2018', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6075667/'),
  'hyaluronique': ('Papakonstantinou, Roth & Karakiulakis — « Hyaluronic acid: A key molecule in skin aging », Dermato-Endocrinology, 2012', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3583886/'),
  'vitc': ('Pullar, Carr & Vissers — « The Roles of Vitamin C in Skin Health », Nutrients, 2017', 'https://www.mdpi.com/2072-6643/9/8/866'),
  'aha': ('U.S. Food & Drug Administration — Alpha Hydroxy Acids (AHA) et sensibilité au soleil', 'https://www.fda.gov/cosmetics/cosmetic-ingredients/alpha-hydroxy-acids'),
  'peptides': ('Schagen — « Topical Peptide Treatments with Effective Anti-Aging Results », Cosmetics, 2017', 'https://www.mdpi.com/2079-9284/4/2/16'),
  'romarin': ('Panahi et al. — huile de romarin vs minoxidil 2 %, essai randomisé, Skinmed, 2015', 'https://pubmed.ncbi.nlm.nih.gov/25842469/'),
  'reglement': ('EUR-Lex — synthèse du règlement (CE) n° 1223/2009 relatif aux produits cosmétiques', 'https://eur-lex.europa.eu/FR/legal-content/summary/safer-cosmetics-for-people-in-the-eu.html'),
  'cosmile': ('COSMILE Europe — base de données européenne des ingrédients cosmétiques', 'https://cosmileeurope.eu/fr'),
  'allergenes': ('COSMILE Europe — Qu\'en est-il des allergènes dans les cosmétiques ?', 'https://cosmileeurope.eu/fr/facts/quen-est-il-des-allergenes-dans-les-cosmetiques/'),
  'pellicules': ('DermNet — Seborrhoeic dermatitis (dont les pellicules)', 'https://dermnetnz.org/topics/seborrhoeic-dermatitis'),
  'aad-cheveux': ('American Academy of Dermatology — Tips for healthy hair', 'https://www.aad.org/public/everyday-care/hair-scalp-care/hair/healthy-hair-tips'),
  'aad-boucles': ('American Academy of Dermatology — 6 curly hair tips from dermatologists', 'https://www.aad.org/news/6-curly-hair-tips-from-dermatologists'),
  'melasma': ('DermNet — Melasma', 'https://dermnetnz.org/topics/melasma'),
  'cernes': ('DermNet — Dark circles under the eyes', 'https://pro.dermnetnz.org/topics/dark-circles-under-the-eyes'),
  'cernes-revue': ('Sarkar et al. — « Periorbital Hyperpigmentation: A Comprehensive Review », J Clin Aesthet Dermatol, 2016', 'https://pubmed.ncbi.nlm.nih.gov/26962392/'),
  'soleil': ('Santé.fr / Institut national du cancer — Comment mieux se protéger du soleil ?', 'https://www.sante.fr/comment-mieux-se-proteger-du-soleil'),
  'aad-peau-seche': ('American Academy of Dermatology — Dermatologists\' top tips for relieving dry skin', 'https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin'),
}

PAL = {  # couleurs par gamme : fond clair, couleur forte, fond très clair
  'boost': ('#d3e6ff', '#4f86b3', '#f2f7fd'),
  'care': ('#ffefff', '#9b6fb5', '#fbf3ff'),
  'hydraline': ('#f9db86', '#a07d00', '#fdf7e3'),
  'repare': ('#fde4ec', '#b0577a', '#fdf3f6'),
}
MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
def fdate(iso):
    y, m, d = map(int, iso.split('-')); return f'{d} {MOIS[m-1]} {y}'.replace('1 ', '1er ', 1) if d == 1 else f'{d} {MOIS[m-1]} {y}'

E = lambda s: html.escape(s, quote=True)
def slugify(s):
    s = s.lower()
    for a, b in [('àâä', 'a'), ('éèêë', 'e'), ('îï', 'i'), ('ôö', 'o'), ('ùûü', 'u'), ('ç', 'c'), ('œ', 'oe'), ('’\'', '-')]:
        for ch in a: s = s.replace(ch, b)
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s)).strip('-')[:60]

# ---------- catalogue ----------
CAT = {p['id']: p for p in json.load(open('products.json', encoding='utf-8'))['products']}
def pname(p): return (p['name'] + (' ' + p['name_line2'] if p.get('name_line2') else '')).strip()
def pprice(p):
    s = [b for b in p.get('bundles', []) if b.get('id') == 'solo']
    return s[0]['price'] if s else p.get('price', '')
GL = {'o·boost': 'Boost', 'o·care': 'Care', 'o·hydraline': 'Hydraline', 'o·répare': 'Répare'}

# ---------- texte enrichi ----------
USED = set()
def inline(t):
    t = E(t).replace('&#x27;', '’').replace("'", '’')
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?!\w)', r'<em>\1</em>', t)
    def lk(m):
        txt, url = m.group(1), m.group(2)
        if url.startswith('p:'):
            pid = url[2:]; assert pid in CAT, 'produit inconnu ' + pid
            return f'<a href="/produits/{pid}">{txt}</a>'
        if url.startswith('a:'):
            return f'<a href="/blog-{url[2:]}.html">{txt}</a>'
        if url.startswith('s:'):
            k = url[2:]; assert k in SOURCES, 'source inconnue ' + k; USED.add(k)
            return f'<a href="{SOURCES[k][1]}" target="_blank" rel="noopener">{txt}</a>'
        return f'<a href="{url}">{txt}</a>'
    return re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', lk, t)

def prod_card(pid):
    p = CAT[pid]; g = GL.get(p.get('gamme'), '')
    n1, n2 = p['name'], p.get('name_line2', '')
    img = f'cart-{pid}.jpg' if os.path.exists(f'cart-{pid}.jpg') else p['image']
    return (f'<aside class="pc rv"><img src="{img}" alt="{E(pname(p))} — Onaé" loading="lazy" width="560" height="700"><div><small>Le soin Onaé associé · {g}</small>'
            f'<h4>{E(n1)}{" <em>" + E(n2) + "</em>" if n2 else ""}</h4><p class="pc-price" data-pid="{pid}">{E(pprice(p))}</p>'
            f'<div class="pc-acts"><button type="button" data-add-to-cart="{pid}">Ajouter au panier</button><a href="/produits/{pid}">Voir le soin</a></div></div></aside>')

CTAS = {
  'diag': ('Votre routine en 2 minutes', 'Peau sèche, mixte, sensible ? Notre [diagnostic peau et cheveux](/diagnostic.html) vous oriente vers les soins adaptés, gratuitement.', '/diagnostic.html', 'Faire mon diagnostic'),
  'bar': ('Composez votre routine sur mesure', 'Choisissez trois soins au [Bar à routines](/bar-a-routines.html) : nous les rangeons dans le bon ordre d’application et votre routine complète est à −20 %.', '/bar-a-routines.html', 'Composer ma routine'),
  'coffrets': ('Les duos qui vont ensemble', 'Nos [coffrets et duos](/coffrets-duos.html) associent des soins pensés pour fonctionner ensemble, à prix doux.', '/coffrets-duos.html', 'Voir les coffrets'),
}

def block(b):
    m = re.match(r'^(p|h3|ul|ol|tip|q|prod|cta):(.*)$', b, re.S)
    k, v = (m.group(1), m.group(2).strip()) if m else ('p', b)
    if k == 'p': return f'<p>{inline(v)}</p>'
    if k == 'h3': return f'<h3 id="{slugify(v)}">{inline(v)}</h3>'
    if k in ('ul', 'ol'): return f'<{k}>' + ''.join(f'<li>{inline(x.strip())}</li>' for x in v.split('||')) + f'</{k}>'
    if k == 'tip':
        t, x = [s.strip() for s in v.split('||', 1)]; return f'<aside class="tip rv"><small>{E(t)}</small><p>{inline(x)}</p></aside>'
    if k == 'q': return f'<blockquote class="rv">{inline(v)}</blockquote>'
    if k == 'prod': return prod_card(v)
    if k == 'cta':
        t, x, u, l = CTAS[v]; return f'<aside class="cta rv"><div><small>{E(t)}</small><p>{inline(x)}</p></div><a href="{u}">{E(l)} →</a></aside>'

def words(h): return len(re.sub(r'<[^>]+>', ' ', h).split())

# ---------- images de couverture ----------
def compose(src, out, W, H):
    im = Image.open(src).convert('RGB'); r = im.width / im.height
    if r >= W / H * 0.92:
        s = max(W / im.width, H / im.height); im2 = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        x = (im2.width - W) // 2; y = int((im2.height - H) * .35); im2.crop((x, y, x + W, y + H)).save(out, quality=86, optimize=True, progressive=True); return
    s = max(W / im.width, H / im.height); bg = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = (bg.width - W) // 2; y = (bg.height - H) // 2; bg = bg.crop((x, y, x + W, y + H)).filter(ImageFilter.GaussianBlur(W / 28))
    bg = ImageEnhance.Brightness(bg).enhance(1.04); bg = Image.blend(bg, Image.new('RGB', (W, H), (250, 244, 242)), .28)
    h = H; w = round(im.width * h / im.height); fg = im.resize((w, h), Image.LANCZOS)
    sh = Image.new('L', (W, H), 0); from PIL import ImageDraw
    ImageDraw.Draw(sh).rectangle(((W - w) // 2 - 6, 0, (W + w) // 2 + 6, H), fill=90); sh = sh.filter(ImageFilter.GaussianBlur(28))
    bg = Image.composite(Image.new('RGB', (W, H), (90, 60, 66)), bg, sh.point(lambda v: v * .5))
    bg.paste(fg, ((W - w) // 2, 0)); bg.save(out, quality=86, optimize=True, progressive=True)

# ---------- gabarit ----------
TPL = open(os.path.join(HERE, 'template-src.html'), encoding='utf-8').read()
HEAD_CSS = TPL[TPL.index('<link rel="preconnect"'):TPL.index('<!-- HEADER -->')]
HEAD_CSS = HEAD_CSS.replace(':root{--c:#ffefff;--d:#9b6fb5;--s:#fbf3ff}', '')
HEADER = TPL[TPL.index('<!-- HEADER -->'):TPL.index('<div class="prog"')].rstrip() + '\n'
NEWS = TPL[TPL.index('<!-- NEWSLETTER -->'):TPL.index("<script>\ndocument.querySelectorAll('.js-w')")].replace("source:'nos-gammes'", "source:'journal'")
TAIL_JS = TPL[TPL.index("<script>\ndocument.querySelectorAll('.js-w')"):TPL.index('<script src="cart.js')]
EXTRA_CSS = '''<style>
.art h3{font-family:var(--font-d);font-weight:400;font-size:clamp(21px,2.2vw,25px);line-height:1.25;color:var(--ink);margin:34px 0 12px;scroll-margin-top:100px}
.art a:not(.pc-acts a):not(.cta a){color:var(--ink);text-decoration:underline;text-decoration-color:var(--d);text-decoration-thickness:1.5px;text-underline-offset:3px;transition:color .2s}
.art a:not(.pc-acts a):not(.cta a):hover{color:var(--d)}
.art ol{margin:0 0 28px;padding-left:0;list-style:none;counter-reset:o;display:grid;gap:12px}
.art ol li{position:relative;padding-left:40px;counter-increment:o}
.art ol li::before{content:counter(o);position:absolute;left:0;top:.15em;width:26px;height:26px;border-radius:50%;background:var(--s);border:1.5px solid var(--c);color:var(--d);font:500 13px/23px var(--font-b);text-align:center}
.lead{font-size:19px;line-height:1.75;color:var(--ink)}
.key{margin:6px 0 44px;padding:26px 28px 22px;background:#fff;border:1.5px solid var(--border-accent);border-left:3px solid var(--d)}
.key p.key-t{display:flex;align-items:center;gap:10px;font-size:10px;letter-spacing:.2em;text-transform:uppercase;font-weight:500;color:var(--d);margin-bottom:14px}
.key ul{margin:0;gap:10px}.key li{font-size:15.5px;line-height:1.65}
.cta{display:flex;align-items:center;justify-content:space-between;gap:22px;margin:44px 0;padding:24px 26px;background:var(--ink);color:#fff}
.cta small{display:block;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#e7b3be;margin-bottom:8px}
.cta p{font-size:15px;line-height:1.7;margin:0;color:rgba(255,255,255,.82)}
.cta p a{color:#fff;text-decoration:underline;text-underline-offset:3px}
.cta>a{flex-shrink:0;padding:14px 20px;background:#fff;color:var(--ink);font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:500;white-space:nowrap;transition:background .3s,color .3s}
.cta>a:hover{background:var(--accent);color:#fff}
.faq-i{border-bottom:1px solid var(--border-accent)}
.faq-i summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:20px 0}
.faq-i summary::-webkit-details-marker{display:none}
.faq-i summary h3{margin:0;font-size:19px;line-height:1.35}
.faq-i summary::after{content:'+';flex-shrink:0;font:300 26px/1 var(--font-b);color:var(--d);transition:transform .3s}
.faq-i[open] summary::after{transform:rotate(45deg)}
.faq-i .faq-a{padding:0 0 22px}.faq-i .faq-a p{margin:0;font-size:16px}
.srcs ol{gap:10px}.srcs li{font-size:14px;line-height:1.6;color:var(--ink-mid)}
.more{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:0 0 30px;list-style:none}
.more li{padding:0}.more li::before{display:none}
.more a{display:block;padding:14px 16px;border:1.5px solid var(--border-accent);background:#fff;font-size:14px;text-decoration:none!important;transition:border-color .3s}
.more a:hover{border-color:var(--d)}
.author{display:flex;gap:18px;align-items:center;margin-top:40px;padding:22px;background:var(--s);border:1.5px solid var(--c)}
.author b{display:block;font-family:var(--font-d);font-weight:400;font-size:20px;color:var(--ink)}
.author span{font-size:13px;line-height:1.6;color:var(--ink-mid)}
.author i{flex-shrink:0;width:52px;height:52px;border-radius:50%;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font:400 22px var(--font-d);font-style:normal}
.ah-meta time{color:inherit}
.pc img{height:auto;align-self:center}
@media(max-width:960px){.lead{font-size:17px}.cta{flex-direction:column;align-items:flex-start}.more{grid-template-columns:1fr}.key{padding:22px 20px 18px}}
</style>
'''
PRICE_JS = '''<script>
fetch('/products.json?v=%s').then(r=>r.json()).then(d=>{const m={};(d.products||[]).forEach(p=>{const s=(p.bundles||[]).find(b=>b.id==='solo');if(s)m[p.id]=s.price;});
document.querySelectorAll('.pc-price[data-pid]').forEach(el=>{if(m[el.dataset.pid])el.textContent=m[el.dataset.pid];});}).catch(()=>{});
</script>
''' % PV

def load_articles():
    arts = []
    for f in sorted(glob.glob(os.path.join(HERE, 'articles_*.py'))):
        spec = importlib.util.spec_from_file_location(os.path.basename(f)[:-3], f); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
        arts += m.ARTICLES
    return arts

def card(a, big=False, delay=0):
    c, d, _ = PAL[a['pal']]
    return (f'<a class="card rv{" big" if big else ""}" href="blog-{a["slug"]}.html" data-cat="{a["cat"]}" style="--c:{c};--d:{d};transition-delay:{delay:.2f}s">\n'
            f'      <div class="card-img"><img decoding="async" src="journal-{a["slug"]}.jpg" alt="{E(a["hero_alt"])}" loading="lazy" width="2000" height="860"><span class="chip">{a["cat"]}</span></div>\n'
            f'      <div class="card-body"><span class="meta">{fdate(a["date"])} · {a["read"]} min de lecture</span><h3>{E(a["title"])}</h3><p>{E(a["desc"])}</p><span class="card-more">Lire l\'article <i></i></span></div>\n    </a>')

def render(a, arts):
    USED.clear()
    c, d, s = PAL[a['pal']]
    # corps
    toc, body = [], []
    body.append(''.join(f'<p class="lead">{inline(x)}</p>' if i == 0 else f'<p>{inline(x)}</p>' for i, x in enumerate(a['intro'])))
    body.append('<aside class="key" aria-label="L’essentiel"><p class="key-t">✦ L’essentiel en 30 secondes</p><ul>' + ''.join(f'<li>{inline(k)}</li>' for k in a['key']) + '</ul></aside>')
    for sec in a['sections']:
        sid = slugify(sec['h2']); toc.append((sid, sec['h2']))
        body.append(f'<h2 id="{sid}">{inline(sec["h2"])}</h2>' + ''.join(block(b) for b in sec['body']))
    toc.append(('conclusion', 'Conclusion'))
    body.append('<h2 id="conclusion">Conclusion</h2>' + ''.join(f'<p>{inline(x)}</p>' for x in a['conclusion']))
    more = a.get('more', [])
    if more:
        body.append('<ul class="more">' + ''.join(f'<li><a href="{u}">{E(t)} →</a></li>' for t, u in more) + '</ul>')
    toc.append(('faq', 'Questions fréquentes'))
    body.append('<h2 id="faq">Questions fréquentes</h2><div class="faq">' + ''.join(
        f'<details class="faq-i"{" open" if i == 0 else ""}><summary><h3>{E(q)}</h3></summary><div class="faq-a"><p>{inline(r)}</p></div></details>' for i, (q, r) in enumerate(a['faq'])) + '</div>')
    for k in a.get('sources', []): USED.add(k)
    srcs = [k for k in SOURCES if k in USED]
    if srcs:
        toc.append(('sources', 'Sources'))
        body.append('<h2 id="sources">Sources et références</h2><div class="srcs"><ol>' + ''.join(
            f'<li><a href="{SOURCES[k][1]}" target="_blank" rel="noopener">{E(SOURCES[k][0])}</a></li>' for k in srcs) + '</ol></div>')
    body.append('<div class="author"><i>O</i><div><b>La Rédaction Onaé</b><span>Le Journal Onaé décrypte les ingrédients, les gestes et les routines pour prendre soin de sa peau et de ses cheveux simplement. Nos articles s’appuient sur des publications scientifiques et des sources institutionnelles, citées en fin d’article.</span></div></div>')
    body.append('<p class="disclaimer">Ces conseils sont donnés à titre informatif et ne remplacent pas l\'avis d\'un professionnel de santé. Un cosmétique n’a pas vocation à soigner : en cas de doute, de réaction cutanée, de grossesse ou d’allaitement, demandez conseil à votre médecin, dermatologue ou pharmacien.</p>')
    art_html = ''.join(body)
    a['words'] = words(art_html); a['read'] = max(3, math.ceil(a['words'] / 210))
    a['used_sources'] = srcs
    # articles liés : même catégorie d'abord, puis les plus récents
    others = [x for x in arts if x['slug'] != a['slug']]
    rel = [x for x in a.get('related', []) if any(o['slug'] == x for o in others)]
    rel = [next(o for o in others if o['slug'] == x) for x in rel]
    for o in sorted(others, key=lambda o: (o['cat'] != a['cat'], o['date']), reverse=False):
        pass
    pool = sorted([o for o in others if o not in rel], key=lambda o: (o['cat'] == a['cat'], o['date']), reverse=True)
    rel = (rel + pool)[:3]
    prods = a['products']
    url = f'{SITE}/blog-{a["slug"]}.html'
    ld_art = {'@context': 'https://schema.org', '@type': 'BlogPosting', '@id': url + '#article', 'headline': a['title'][:110], 'description': a['desc'],
              'image': [f'{SITE}/journal-{a["slug"]}.jpg', f'{SITE}/og/journal-{a["slug"]}.jpg'], 'datePublished': a['date'], 'dateModified': a.get('updated', a['date']),
              'inLanguage': 'fr-FR', 'url': url, 'mainEntityOfPage': url, 'articleSection': a['cat'], 'keywords': ', '.join(a['keywords']), 'wordCount': a['words'],
              'timeRequired': f'PT{a["read"]}M', 'author': {'@type': 'Organization', 'name': 'La Rédaction Onaé', 'url': SITE + '/blog.html'},
              'publisher': {'@id': SITE + '/#organization'}, 'isPartOf': {'@type': 'Blog', '@id': SITE + '/blog.html#blog', 'name': 'Le Journal Onaé'},
              'about': [{'@type': 'Thing', 'name': k} for k in a['keywords'][:3]],
              'mentions': [{'@type': 'Product', 'name': pname(CAT[p]), 'url': f'{SITE}/produits/{p}'} for p in prods],
              'citation': [SOURCES[k][1] for k in srcs]}
    ld_faq = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', r).replace('**', '')}} for q, r in a['faq']]}
    ld_bc = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': 1, 'name': 'Accueil', 'item': SITE + '/'}, {'@type': 'ListItem', 'position': 2, 'name': 'Le Journal', 'item': SITE + '/blog.html'},
        {'@type': 'ListItem', 'position': 3, 'name': a['cat'], 'item': SITE + '/blog.html#' + slugify(a['cat'])}, {'@type': 'ListItem', 'position': 4, 'name': a['title'][:80], 'item': url}]}
    ld = '\n'.join(f'<script type="application/ld+json"{" id=\"ld-article\"" if i == 0 else ""}>{json.dumps(x, ensure_ascii=False)}</script>' for i, x in enumerate([ld_art, ld_faq, ld_bc]))
    upd = a.get('updated') and a['updated'] != a['date']
    meta = f'<span>Par <b>la Rédaction Onaé</b></span><i></i><span>Publié le <time datetime="{a["date"]}">{fdate(a["date"])}</time></span>' + (f'<i></i><span>Mis à jour le <time datetime="{a["updated"]}">{fdate(a["updated"])}</time></span>' if upd else '') + f'<i></i><span>{a["read"]} min de lecture</span>'
    rel_html = ''.join(card(o, delay=i * .08) for i, o in enumerate(rel))
    out = f'''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/onae-desk.css?v=4">
<link rel="stylesheet" href="/onae-cards.css?v=5">
<title>{E(a["seo_title"])}</title>
<meta name="description" content="{E(a["desc"])}">
<meta name="keywords" content="{E(", ".join(a["keywords"]))}">
<meta name="author" content="La Rédaction Onaé">
<meta property="article:published_time" content="{a["date"]}">
<meta property="article:modified_time" content="{a.get("updated", a["date"])}">
<meta property="article:section" content="{a["cat"]}">
{"".join(f'<meta property="article:tag" content="{E(k)}">' + chr(10) for k in a["keywords"][:6])}<meta name="x-og-image" content="/og/journal-{a["slug"]}.jpg">
<link rel="preload" as="image" href="journal-{a["slug"]}.jpg">
{ld}
{HEAD_CSS.strip()}
<style>:root{{--c:{c};--d:{d};--s:{s}}}</style>
{EXTRA_CSS}</head>
<body>
{HEADER}
<div class="prog" id="prog"></div>
<header class="ah">
  <nav class="crumb" aria-label="Fil d’Ariane"><a href="/">Accueil</a> &nbsp;/&nbsp; <a href="blog.html">Le Journal</a> &nbsp;/&nbsp; {a["cat"]}</nav>
  <span class="chip">{a["cat"]}</span>
  <h1 class="js-w">{E(a["title"])}</h1>
  <div class="ah-meta">{meta}</div>
</header>
<div class="a-hero"><div><img src="journal-{a["slug"]}.jpg" alt="{E(a["hero_alt"])}" width="2000" height="860" fetchpriority="high"></div></div>
<div class="a-wrap">
  <nav class="toc" aria-label="Sommaire"><small>Sommaire</small><ol>{"".join(f'<li><a href="#{i}">{E(t)}</a></li>' for i, t in toc)}</ol>
    <div class="share"><button type="button" id="shareBtn"><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.9l7.6-4.4M8.2 13.1l7.6 4.4"/></svg><span>Partager l'article</span></button></div></nav>
  <article class="art" id="art">
    {art_html}
  </article>
</div>
<section class="rel"><h2>À lire <em>ensuite</em></h2><div class="rel-grid">{rel_html}</div></section>
{NEWS}{TAIL_JS}{PRICE_JS}<script src="cart.js?v=7"></script>
<script src="perf.js?v=1" defer></script>
<div class="footer-simple">
  <p>© 2026 Onaé Paris · Tous droits réservés · <a href="blog.html" style="color:var(--accent)">Le Journal</a> · <a href="mentions-legales.html" style="color:var(--accent)">Mentions légales</a></p>
</div>
<script src="onae-menu.js?v=30" defer></script>
</body>
</html>
'''
    return out

def build_index(arts):
    src = open(os.path.join(HERE, 'blog-src.html'), encoding='utf-8').read()
    arts = sorted(arts, key=lambda a: a['date'], reverse=True)
    feat, rest = arts[0], arts[1:]
    cats = []
    for a in arts:
        if a['cat'] not in cats: cats.append(a['cat'])
    total = sum(a['read'] for a in arts)
    src = re.sub(r'<title>.*?</title>', '<title>Le Journal Onaé : conseils soin de la peau, cheveux et ingrédients | Onaé</title>', src)
    src = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Routines, ingrédients décryptés (peptides, niacinamide, acide hyaluronique, AHA), soins des cheveux et du regard : les conseils du Journal Onaé pour une peau et des cheveux en beauté, simplement.">', src)
    src = re.sub(r'<div class="bh-stats">.*?</div></div></div>', f'<div class="bh-stats"><div><b>{len(arts)}</b><span>Articles</span></div><div><b>{len(cats)}</b><span>Thématiques</span></div><div><b>{total}</b><span>Min de lecture</span></div></div></div>', src, flags=re.S)
    c, d, _ = PAL[feat['pal']]
    feat_html = f'''<section class="feat">
  <a href="blog-{feat["slug"]}.html" style="--d:{d}">
    <div class="feat-img"><img src="journal-{feat["slug"]}.jpg" alt="{E(feat["hero_alt"])}" width="2000" height="860"></div>
    <div class="feat-txt">
      <span class="feat-badge">À la une</span>
      <span class="chip">{feat["cat"]}</span>
      <h2>{E(feat["title"])}</h2>
      <p>{E(feat["desc"])}</p>
      <span class="meta">{fdate(feat["date"])} · {feat["read"]} min de lecture</span>
      <span class="card-more">Lire l'article <i></i></span>
    </div>
  </a>
</section>'''
    src = re.sub(r'<section class="feat">.*?</section>', lambda m: feat_html, src, flags=re.S)
    flt = '<button type="button" data-c="Tous" class=on>Tous</button>' + ''.join(f'<button type="button" data-c="{c}">{c}</button>' for c in cats)
    src = re.sub(r'(<span class="flt-ind" id="fltInd"></span>).*?(</div></div>)', lambda m: m.group(1) + flt + m.group(2), src, flags=re.S)
    grid = ''.join(card(a, big=(i == 0), delay=min(i, 6) * .08) for i, a in enumerate(rest))
    src = re.sub(r'(<div class="grid" id="grid">).*?(\n  </div>\n</section>)', lambda m: m.group(1) + grid + m.group(2), src, flags=re.S)
    ld = {'@context': 'https://schema.org', '@type': 'Blog', '@id': SITE + '/blog.html#blog', 'name': 'Le Journal Onaé', 'url': SITE + '/blog.html', 'inLanguage': 'fr-FR',
          'description': 'Conseils soin de la peau, des cheveux et du regard, ingrédients décryptés et routines.', 'publisher': {'@id': SITE + '/#organization'},
          'blogPost': [{'@type': 'BlogPosting', 'headline': a['title'][:110], 'url': f'{SITE}/blog-{a["slug"]}.html', 'datePublished': a['date'], 'dateModified': a.get('updated', a['date']),
                        'image': f'{SITE}/journal-{a["slug"]}.jpg', 'description': a['desc']} for a in arts]}
    src = re.sub(r'<script type="application/ld\+json" id="ld-blog">.*?</script>\n', '', src, flags=re.S)
    src = src.replace('</title>', '</title>\n<script type="application/ld+json" id="ld-blog">' + json.dumps(ld, ensure_ascii=False) + '</script>', 1)
    src = src.replace("source:'nos-gammes'", "source:'journal'")
    # filtre par ancre (#cheveux…) depuis les fils d'Ariane des articles
    if 'location.hash' not in src:
        src = src.replace("setTimeout(()=> moveInd(flt.querySelector('button.on')), 50);",
          "setTimeout(()=> moveInd(flt.querySelector('button.on')), 50);\nconst hc = decodeURIComponent(location.hash.slice(1)); if(hc){ const b=[...flt.querySelectorAll('button')].find(x=>x.dataset.c.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase()===hc); if(b) setTimeout(()=>b.click(),120); }")
    open('blog.html', 'w', encoding='utf-8').write(src)

def main():
    arts = load_articles()
    slugs = [a['slug'] for a in arts]; assert len(slugs) == len(set(slugs)), 'slug en double'
    os.makedirs('og', exist_ok=True)
    for a in arts:
        if not os.path.exists(f'journal-{a["slug"]}.jpg') or '--img' in sys.argv:
            compose(a['hero'], f'journal-{a["slug"]}.jpg', 2000, 860)
            compose(a['hero'], f'og/journal-{a["slug"]}.jpg', 1200, 630)
    # 1re passe pour connaître les temps de lecture (utilisés dans les cartes)
    for a in arts: a['read'] = 0
    for a in arts: render(a, arts)
    for a in arts:
        h = render(a, arts)
        open(f'blog-{a["slug"]}.html', 'w', encoding='utf-8').write(h)
        print(f'{a["date"]}  {a["slug"]:<34} {a["words"]:>5} mots  {a["read"]:>2} min  {len(a["sections"])} H2  {len(a["faq"])} FAQ  {len(a["used_sources"])} sources')
    build_index(arts)
    j = [{'slug': a['slug'], 'url': f'/blog-{a["slug"]}.html', 'title': a['title'], 'desc': a['desc'], 'date': a['date'], 'updated': a.get('updated', a['date']),
          'cat': a['cat'], 'img': f'journal-{a["slug"]}.jpg', 'read': a['read'], 'products': a['products'], 'keywords': a['keywords']} for a in sorted(arts, key=lambda a: a['date'], reverse=True)]
    open('journal.json', 'w', encoding='utf-8').write(json.dumps(j, ensure_ascii=False, indent=1))
    print(len(arts), 'articles')

if __name__ == '__main__':
    main()
