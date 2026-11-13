# -*- coding: utf-8 -*-
"""Optimisation SEO de toutes les pages vitrines (rejouable, idempotent).
Lancer depuis la racine :  python3 scratchpad/seo-site.py   (gen.py du Journal le relance automatiquement)
- <title> et meta description optimisés (≤ 60 / ≤ 155 caractères)
- H1 : complément de mots-clés lu par les moteurs et les lecteurs d'écran (classe .seo-k, invisible à l'écran)
- hiérarchie des titres corrigée (pas de saut de niveau)
- textes alternatifs des images produits / gammes
- pied de page riche (maillage interne complet, en HTML statique lisible par tous les robots, y compris les IA)
- bloc « Nos conseils du Journal » contextuel sur les pages catégories, gammes et marque
"""
import re, os, json, glob, html
E = lambda s: html.escape(s, quote=True)
CAT = {p['id']: p for p in json.load(open('products.json', encoding='utf-8'))['products']}
JOUR = {a['slug']: a for a in json.load(open('journal.json', encoding='utf-8'))}
def pname(p): return (p['name'] + (' ' + p['name_line2'] if p.get('name_line2') else '')).strip()

# ───────────────── titres et descriptions ─────────────────
META = {
 'index.html': ("Onaé Paris | Soins naturels aux peptides, peau et cheveux",
   "Marque élaborée en France : sérums aux peptides, soins visage, regard et cheveux d’origine naturelle. Routines en 3 gestes, livraison offerte dès 59 €."),
 'soins-visage.html': ("Soins visage naturels : sérums et crèmes aux peptides | Onaé",
   "Sérums aux peptides, vitamine C, niacinamide, crèmes anti-âge et hydratantes : les soins visage Onaé, d’origine naturelle, pour une peau éclatante."),
 'soins-yeux.html': ("Soins contour des yeux : cernes, poches, ridules | Onaé",
   "Crèmes, sérums et patchs hydrogel pour le contour des yeux : caféine, peptides, acide hyaluronique pour un regard reposé et lissé. Découvrez Onaé."),
 'soins-cheveux.html': ("Soins cheveux naturels : romarin, kératine, boucles | Onaé",
   "Shampoings, après-shampoings, masques, huile au romarin et soins boucles : des soins cheveux naturels pour une chevelure forte, douce et brillante."),
 'nos-gammes.html': ("Nos 4 gammes de soins : Boost, Care, Hydraline, Répare | Onaé",
   "Énergie, équilibre, hydratation, réparation : découvrez les 4 gammes Onaé pour la peau et les cheveux, et composez la routine qui vous ressemble."),
 'gamme-boost.html': ("Gamme o·boost : soins anti-âge aux peptides et caféine | Onaé",
   "La gamme o·boost redonne énergie et éclat : sérums aux peptides, vitamine C, caféine, contour des yeux et soins cheveux kératine et romarin."),
 'gamme-care.html': ("Gamme o·care : soins équilibrants aux prébiotiques | Onaé",
   "La gamme o·care apaise et rééquilibre : sérum aux prébiotiques, brume à l’acide hyaluronique, crème anti-rides et soins cheveux rafraîchissants."),
 'gamme-hydraline.html': ("Gamme o·hydraline : soins hydratants et anti-âge | Onaé",
   "La gamme o·hydraline hydrate en douceur : soins alternatifs au rétinol, crème de jour, et routine cheveux bouclés, doux et réhydratés."),
 'gamme-repare.html': ("Gamme o·répare : soins réparateurs peau et cheveux | Onaé",
   "La gamme o·répare nourrit et répare : peeling AHA, niacinamide, crèmes réconfortantes, patchs yeux, masque kératine et gommage cuir chevelu."),
 'nouveautes.html': ("Nouveautés Onaé : les derniers soins visage, yeux, cheveux",
   "Patchs yeux hydrogel, soins cheveux, contour des yeux : découvrez les dernières nouveautés Onaé, des soins naturels élaborés en France."),
 'box.html': ("Box anti-âge aux peptides : coffret sérum, crème, yeux | Onaé",
   "La Box Anti-âge aux Peptides réunit sérum, crème visage et contour des yeux dans un écrin prêt à offrir. Le rituel anti-âge complet, à prix doux."),
 'coffrets-duos.html': ("Coffrets et duos de soins visage et cheveux | Onaé",
   "Duos et rituels de soins pensés pour fonctionner ensemble : visage, regard et cheveux, à prix doux. Livraison offerte dès 59 €. Idéal à offrir."),
 'bar-a-routines.html': ("Bar à routines : composez votre routine sur mesure | Onaé",
   "Choisissez 3 soins visage, regard ou cheveux : nous les rangeons dans le bon ordre d’application et votre routine complète est à −20 %."),
 'carte-cadeau.html': ("Carte cadeau Onaé : offrez des soins naturels | Onaé",
   "Offrez la carte cadeau Onaé de 50, 75 ou 100 €, envoyée par e-mail et valable 12 mois sur toute la boutique de soins visage et cheveux."),
 'makeup.html': ("Onaé Makeup : BB crème aux peptides, le soin qui maquille",
   "La BB crème aux peptides Onaé unifie le teint tout en prenant soin de la peau. Découvrez le soin qui maquille et inscrivez-vous pour être prévenue."),
 'serum-peptides.html': ("Sérum anti-âge aux peptides : rides, fermeté, éclat | Onaé",
   "Le sérum visage anti-âge aux peptides Onaé lisse visiblement les rides, repulpe et ravive l’éclat. Peptides, acide hyaluronique et antioxydants."),
 'routine-peptides.html': ("Routine anti-âge aux peptides en 3 gestes | Onaé",
   "Sérum, crème et contour des yeux aux peptides : la routine anti-âge Onaé en 3 gestes et 3 minutes, pour une peau visiblement plus lisse et ferme."),
 'alternatives-retinol.html': ("Alternative au rétinol : sérum, crème, contour des yeux | Onaé",
   "Des soins alternatifs au rétinol au Bidens pilosa : sérum, crème et contour des yeux pour lisser les rides en douceur, même sur peau sensible."),
 'diagnostic.html': ("Diagnostic peau et cheveux gratuit par IA | Onaé",
   "Faites votre diagnostic peau et cheveux en 2 minutes : analyse guidée ou par photo, et une routine Onaé personnalisée, matin et soir, offerte."),
 'nos-ingredients.html': ("Nos ingrédients : peptides, romarin, acide hyaluronique | Onaé",
   "Peptides, acide hyaluronique, niacinamide, romarin, kératine : découvrez les actifs naturels des soins Onaé, leur rôle et leur origine."),
 'notre-histoire.html': ("Notre histoire : Onaé, marque de soins élaborée en France",
   "Onaé est née d’une conviction : moins de produits, mieux choisis. Découvrez l’histoire d’une marque de soins naturels élaborée en France."),
 'nos-engagements.html': ("Nos engagements : formules naturelles et transparentes | Onaé",
   "Formules d’origine naturelle, INCI publiée en entier, soins non testés sur les animaux, marque élaborée en France : les engagements Onaé."),
 'presse-partenariats.html': ("Presse et partenariats : contacter Onaé | Onaé",
   "Journalistes, créateurs de contenu, revendeurs : découvrez l’univers Onaé et proposez-nous une collaboration ou un partenariat presse."),
 'fidelite.html': ("Onaé Privilège : programme fidélité et récompenses | Onaé",
   "1 € = 1 éclat : cumulez des éclats à chaque commande, débloquez les paliers Rose, Nacre et Écrin et profitez de remises et cadeaux exclusifs."),
 'faq.html': ("FAQ : livraison, retours, soins et routines | Onaé",
   "Livraison, retours, formules, peaux sensibles, routines, programme fidélité : toutes les réponses à vos questions sur les soins Onaé."),
 'livraison-retours.html': ("Livraison et retours : délais, tarifs, pays | Onaé",
   "Livraison en France, Belgique, Suisse, Luxembourg et Monaco : 4,90 €, offerte dès 59 €. Retours sous 14 jours. Toutes les conditions Onaé."),
 'contact.html': ("Contactez Onaé : service client et conseils beauté",
   "Une question sur une commande, un soin ou votre routine ? Contactez le service client Onaé par formulaire ou à contact@onaecosmetics.fr."),
 'cgv.html': ("Conditions générales de vente | Onaé", None),
 'mentions-legales.html': ("Mentions légales et confidentialité | Onaé", None),
 'blog.html': ("Le Journal Onaé : conseils soins visage, cheveux, ingrédients",
   "Peptides, rétinol, niacinamide, cernes, cheveux bouclés, cuir chevelu : les guides et conseils d’expertes du Journal Onaé pour prendre soin de vous."),
 'routine.html': ("Nos routines de soins visage en 3 gestes | Onaé",
   "Routines Boost, Hydratation, Protection et Répare : des routines visage complètes en 3 gestes, avec l’ordre d’application et les soins associés."),
}

# ───────────────── complément de mots-clés dans le H1 (texte réel, masqué visuellement) ─────────────────
H1K = {
 'soins-visage.html': 'naturels : sérums et crèmes aux peptides',
 'soins-yeux.html': ': soins du contour des yeux, cernes, poches et ridules',
 'soins-cheveux.html': 'naturels : shampoings, masques et huile au romarin',
 'nos-gammes.html': '— les 4 gammes de soins Onaé',
 'gamme-boost.html': '— gamme o·boost, soins énergisants peau et cheveux',
 'gamme-care.html': '— gamme o·care, soins équilibrants peau et cheveux',
 'gamme-hydraline.html': '— gamme o·hydraline, soins hydratants peau et cheveux',
 'gamme-repare.html': '— gamme o·répare, soins réparateurs peau et cheveux',
 'nouveautes.html': 'soins visage, yeux et cheveux Onaé',
 'box.html': '— Box anti-âge aux peptides Onaé',
 'coffrets-duos.html': '— coffrets et duos de soins Onaé',
 'bar-a-routines.html': '— composez votre routine de soins sur mesure',
 'carte-cadeau.html': '— la carte cadeau Onaé',
 'makeup.html': '— BB crème aux peptides Onaé Makeup',
 'serum-peptides.html': '— sérum visage anti-âge aux peptides',
 'routine-peptides.html': '— routine anti-âge aux peptides en 3 gestes',
 'alternatives-retinol.html': '— soins alternatifs au rétinol',
 'nos-ingredients.html': '— nos ingrédients et actifs naturels',
 'notre-histoire.html': 'de la marque Onaé',
 'nos-engagements.html': 'pour des soins naturels et transparents',
 'presse-partenariats.html': 'Onaé',
 'contact.html': '— contacter le service client Onaé',
 'fidelite.html': '— Onaé Privilège, le programme fidélité',
 'blog.html': '— conseils soins visage, cheveux et ingrédients',
 'diagnostic.html': '— diagnostic peau et cheveux',
 'faq.html': '— FAQ Onaé',
}

# ───────────────── blocs « Nos conseils du Journal » ─────────────────
JBLOCK = {
 'soins-visage.html': ['peptides-anti-age', 'niacinamide-bienfaits', 'vitamine-c-visage'],
 'soins-yeux.html': ['cernes-et-poches', 'patchs-yeux-mode-emploi', 'alternative-retinol'],
 'soins-cheveux.html': ['romarin-cheveux', 'routine-cheveux-boucles', 'keratine-cheveux-abimes'],
 'nos-gammes.html': ['ordre-application-soins-visage', 'routine-matin-soir', 'peptides-anti-age'],
 'gamme-boost.html': ['peptides-anti-age', 'vitamine-c-visage', 'cernes-et-poches'],
 'gamme-care.html': ['microbiome-cutane', 'acide-hyaluronique-guide', 'cuir-chevelu-gras-pellicules'],
 'gamme-hydraline.html': ['alternative-retinol', 'routine-cheveux-boucles', 'peau-deshydratee-ou-peau-seche'],
 'gamme-repare.html': ['peeling-aha-exfoliation-douce', 'niacinamide-bienfaits', 'keratine-cheveux-abimes'],
 'nouveautes.html': ['patchs-yeux-mode-emploi', 'cuir-chevelu-gras-pellicules', 'keratine-cheveux-abimes'],
 'box.html': ['peptides-anti-age', 'routine-matin-soir', 'ordre-application-soins-visage'],
 'coffrets-duos.html': ['ordre-application-soins-visage', 'routine-cheveux-boucles', 'routine-matin-soir'],
 'bar-a-routines.html': ['ordre-application-soins-visage', 'routine-matin-soir', 'peau-deshydratee-ou-peau-seche'],
 'serum-peptides.html': ['peptides-anti-age', 'alternative-retinol', 'lire-une-liste-inci'],
 'routine-peptides.html': ['peptides-anti-age', 'ordre-application-soins-visage', 'routine-matin-soir'],
 'alternatives-retinol.html': ['alternative-retinol', 'peptides-anti-age', 'peeling-aha-exfoliation-douce'],
 'diagnostic.html': ['peau-deshydratee-ou-peau-seche', 'microbiome-cutane', 'ordre-application-soins-visage'],
 'nos-ingredients.html': ['peptides-anti-age', 'acide-hyaluronique-guide', 'lire-une-liste-inci'],
 'notre-histoire.html': ['lire-une-liste-inci', 'microbiome-cutane', 'routine-matin-soir'],
 'nos-engagements.html': ['lire-une-liste-inci', 'microbiome-cutane', 'peptides-anti-age'],
 'makeup.html': ['peptides-anti-age', 'routine-matin-soir', 'peau-deshydratee-ou-peau-seche'],
 'faq.html': ['ordre-application-soins-visage', 'lire-une-liste-inci', 'routine-matin-soir'],
 'carte-cadeau.html': ['routine-matin-soir', 'routine-cheveux-boucles', 'peptides-anti-age'],
 'fidelite.html': ['ordre-application-soins-visage', 'routine-matin-soir', 'peptides-anti-age'],
}
MO = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
def fd(d): y, m, j = map(int, d.split('-')); return f'{j} {MO[m-1]} {y}'
def jblock(slugs, page):
    arts = [JOUR[s] for s in slugs if s in JOUR]
    cards = ''.join(f'<a class="ojr-c" href="{a["url"]}"><span class="ojr-i"><img src="/{a["img"]}" alt="{E(a["title"])}" loading="lazy" width="2000" height="860"></span>'
                    f'<span class="ojr-t"><small>{E(a["cat"])} · {a["read"]} min · {fd(a["date"])}</small><b>{E(a["title"])}</b><i>Lire l’article →</i></span></a>' for a in arts)
    return (f'<!-- JOURNAL-SEO -->\n<section class="ojr" aria-labelledby="ojr-t"><div class="ojr-in"><p class="ojr-e">Le Journal Onaé</p>'
            f'<h2 id="ojr-t" class="ojr-h">Nos conseils <em>d’expertes</em></h2><div class="ojr-g">{cards}</div>'
            f'<a class="ojr-all" href="/blog.html">Tous les articles du Journal →</a></div></section>\n<!-- /JOURNAL-SEO -->\n')

# ───────────────── pied de page riche ─────────────────
TOP_ART = ['peptides-anti-age', 'ordre-application-soins-visage', 'cernes-et-poches', 'routine-cheveux-boucles', 'alternative-retinol', 'taches-pigmentaires-teint-unifie']
def col(t, items): return f'<div class="of-c"><p class="of-t">{t}</p><ul>' + ''.join(f'<li><a href="{u}">{E(l)}</a></li>' for l, u in items) + '</ul></div>'
FOOTER = ('<!-- FOOTER-SEO -->\n<footer class="ofoot" aria-label="Plan du site Onaé"><div class="of-in">'
  '<div class="of-b"><a href="/" class="of-logo" aria-label="Onaé, accueil"><img src="/logo-onae.svg" alt="Onaé Paris" width="200" height="200"></a>'
  '<p>Onaé est une marque de cosmétiques naturels <strong>élaborée en France</strong> : soins visage, contour des yeux et cheveux aux peptides et actifs végétaux, '
  'pensés en routines simples de trois gestes. Quatre gammes — o·boost, o·care, o·hydraline et o·répare — pour révéler la beauté naturelle de chaque peau.</p>'
  '<p class="of-m"><a href="mailto:contact@onaecosmetics.fr">contact@onaecosmetics.fr</a><br>Livraison France, Belgique, Suisse, Luxembourg, Monaco · offerte dès 59 €</p></div>'
  + col('Nos soins', [('Soins visage', '/soins-visage.html'), ('Soins contour des yeux', '/soins-yeux.html'), ('Soins cheveux', '/soins-cheveux.html'), ('Onaé Makeup', '/makeup.html'),
                      ('Nouveautés', '/nouveautes.html'), ('Les Box', '/box.html'), ('Coffrets & duos', '/coffrets-duos.html'), ('Bar à routines', '/bar-a-routines.html'), ('Carte cadeau', '/carte-cadeau.html')])
  + col('Nos gammes', [('o·boost — énergie & éclat', '/gamme-boost.html'), ('o·care — équilibre', '/gamme-care.html'), ('o·hydraline — hydratation', '/gamme-hydraline.html'),
                       ('o·répare — réparation', '/gamme-repare.html'), ('Toutes nos gammes', '/nos-gammes.html'), ('Sérum aux peptides', '/serum-peptides.html'),
                       ('Routine anti-âge peptides', '/routine-peptides.html'), ('Alternatives au rétinol', '/alternatives-retinol.html'), ('Nos routines', '/routine.html')])
  + col('Le Journal', [(JOUR[s]['title'].split(' :')[0].split(' ?')[0], JOUR[s]['url']) for s in TOP_ART if s in JOUR] + [('Tous les articles', '/blog.html')])
  + col('La Maison', [('Notre histoire', '/notre-histoire.html'), ('Nos engagements', '/nos-engagements.html'), ('Nos ingrédients', '/nos-ingredients.html'),
                      ('Diagnostic peau & cheveux', '/diagnostic.html'), ('Onaé Privilège', '/fidelite.html'), ('Presse & partenariats', '/presse-partenariats.html')])
  + col('Aide', [('Questions fréquentes', '/faq.html'), ('Livraison & retours', '/livraison-retours.html'), ('Suivi de commande', '/suivi-commande.html'),
                 ('Nous contacter', '/contact.html'), ('Conditions générales de vente', '/cgv.html'), ('Mentions légales', '/mentions-legales.html')])
  + '</div><div class="of-bot"><p>© 2026 Onaé Paris · Marque élaborée en France · <a href="/mentions-legales.html#donnees">Confidentialité</a></p>'
  '<p class="of-pay"><span>Visa</span><span>Mastercard</span><span>Apple Pay</span><span>Google Pay</span><span>Bancontact</span></p></div></footer>\n<!-- /FOOTER-SEO -->\n')

# ───────────────── textes alternatifs ─────────────────
GAMME_ALT = {'gamme-boost': 'Univers de la gamme o·boost Onaé', 'gamme-care': 'Univers de la gamme o·care Onaé', 'gamme-hydraline': 'Univers de la gamme o·hydraline Onaé', 'gamme-repare': 'Univers de la gamme o·répare Onaé'}
MISC_ALT = {'rituel-visage-poster': 'Rituel visage Onaé : sérum, crème et contour des yeux', 'rituel-cheveux-poster': 'Rituel cheveux Onaé',
            'rt-serum': 'Sérum visage anti-âge aux peptides de la Box Onaé', 'rt-yeux': 'Crème contour des yeux aux peptides de la Box Onaé', 'rt-creme': 'Crème anti-âge aux peptides de la Box Onaé',
            'coffret-face': 'Box Anti-âge aux Peptides Onaé, face avant', 'coffret-dos': 'Box Anti-âge aux Peptides Onaé, dos du coffret',
            'makeup-bb-05-tube': 'BB crème aux peptides Onaé, tube teinte 05', 'makeup-bb-05-box': 'Étui de la BB crème aux peptides Onaé',
            'diagnostic-hero': 'Diagnostic peau et cheveux Onaé', 'diagnostic-peau': 'Diagnostic de peau Onaé', 'diagnostic-cheveux': 'Diagnostic cheveux Onaé'}
IDS = sorted(CAT, key=len, reverse=True)
def alt_for(src):
    b = os.path.basename(src.split('?')[0]); stem = re.sub(r'\.(jpg|jpeg|png|webp)$', '', b)
    if stem in MISC_ALT: return MISC_ALT[stem]
    for g, t in GAMME_ALT.items():
        if stem.startswith(g): return t
    s = re.sub(r'^(cart-|bar-)', '', stem)
    for i in IDS:
        if s == i or s.startswith(i + '-'):
            return pname(CAT[i]) + ' — Onaé'
    for a, i in [('masque-keratine', 'masque-cheveux-keratine'), ('patchs-yeux-hydrogel', 'patchs-yeux-hydrogel-anti-fatigue'), ('patchs-yeux-cafeine', 'patchs-yeux-cafeine-vitamine-c'), ('patchs-yeux-niacinamide', 'patchs-yeux-niacinamide-acide-hyaluronique')]:
        if s.startswith(a) and i in CAT: return pname(CAT[i]) + ' — Onaé'
    return None

def fix_alts(h):
    # hors scripts uniquement
    parts = re.split(r'(<script\b.*?</script>)', h, flags=re.S)
    for k in range(0, len(parts), 2):
        def r(m):
            tag = m.group(0)
            if 'aria-hidden' in tag: return tag
            src = re.search(r'src="([^"]+)"', tag)
            if not src: return tag
            a = alt_for(src.group(1))
            return tag.replace('alt=""', f'alt="{E(a)}"', 1) if a else tag
        parts[k] = re.sub(r'<img\b[^>]*\balt=""[^>]*>', r, parts[k])
    return ''.join(parts)

def set_meta(h, f):
    t, d = META[f]
    h = re.sub(r'<title>.*?</title>', lambda m: f'<title>{E(t)}</title>', h, count=1, flags=re.S)
    if d:
        if re.search(r'<meta name="description" content="[^"]*">', h):
            h = re.sub(r'<meta name="description" content="[^"]*">', lambda m: f'<meta name="description" content="{E(d)}">', h, count=1)
        else:
            h = h.replace('</title>', f'</title>\n<meta name="description" content="{E(d)}">', 1)
    return h

def set_h1(h, f):
    k = H1K.get(f)
    if not k: return h
    h = re.sub(r'<span class="seo-k">[^<]*</span>', '', h)
    return re.sub(r'(<h1\b[^>]*>)(.*?)(</h1>)', lambda m: m.group(1) + m.group(2) + f'<span class="seo-k"> {E(k)}</span>' + m.group(3), h, count=1, flags=re.S)

def headings(h, f):
    if f in ('alternatives-retinol.html', 'routine-peptides.html', 'serum-peptides.html'):
        h = h.replace('<h3 id="capName">', '<p class="cap-n" id="capName">').replace('</h3><p id="capTxt">', '</p><p id="capTxt">')
        if '.cap .cap-n' not in h: h = h.replace('.cap h3{', '.cap h3,.cap .cap-n{')
    if f == 'nos-gammes.html':
        if '.why-r h3' not in h: h = h.replace('.why-r h4{', '.why-r h3,.why-r h4{')
        h = re.sub(r'<h4>(Une formule, une mission|Une beauté qui évolue|Un rituel sur-mesure)</h4>', r'<h3>\1</h3>', h)
    if f == 'diagnostic.html':
        if '.dg-hc h3' not in h: h = h.replace('.dg-hc h4{', '.dg-hc h3,.dg-hc h4{')
        h = re.sub(r'(<div class="dg-hc rv"[^>]*><b>0\d</b>)<h4>(.*?)</h4>', r'\1<h3>\2</h3>', h)
    return h

def footer(h, f):
    if '<!-- FOOTER-SEO -->' in h:
        return re.sub(r'<!-- FOOTER-SEO -->.*?<!-- /FOOTER-SEO -->\n?', lambda m: FOOTER, h, count=1, flags=re.S)
    if f == 'index.html':
        h = re.sub(r'<footer class="footer">.*?</footer>\n?', FOOTER, h, count=1, flags=re.S)
    elif '<div class="footer-simple">' in h:
        h = re.sub(r'<div class="footer-simple">.*?</div>\n?', FOOTER, h, count=1, flags=re.S)
    elif f in ('product.html', 'routine.html'):
        i = h.rfind('</body>')
        if i > 0: h = h[:i] + FOOTER + h[i:]
    return h

def journal(h, f):
    h = re.sub(r'<!-- JOURNAL-SEO -->.*?<!-- /JOURNAL-SEO -->\n?', '', h, flags=re.S)
    if f not in JBLOCK: return h
    blk = jblock(JBLOCK[f], f)
    for anchor in ['<!-- NEWSLETTER -->', '<!-- FOOTER-SEO -->']:
        if anchor in h: return h.replace(anchor, blk + anchor, 1)
    return h

PUBLIC_NOFOOT = {'checkout.html', 'panier.html', 'compte.html', 'mon-compte.html', 'concours.html', 'mentions-legales-concours.html', 'reglement-concours.html'}
def main():
    for f in sorted(glob.glob('*.html')):
        if f.startswith(('banniere-', 'apercu-')): continue
        h0 = h = open(f, encoding='utf-8').read()
        if f in META: h = set_meta(h, f)
        h = set_h1(h, f); h = headings(h, f); h = fix_alts(h)
        if f not in PUBLIC_NOFOOT: h = footer(h, f)
        h = journal(h, f)
        if h != h0:
            open(f, 'w', encoding='utf-8').write(h); print('✓', f)
    for f, (t, d) in META.items():
        if len(t) > 62 or (d and len(d) > 158): print('⚠ longueur', f, len(t), len(d or ''))

if __name__ == '__main__':
    main()
