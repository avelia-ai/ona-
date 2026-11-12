/* Onaé — référencement Google & moteurs IA (rendu côté serveur, sans dépendance).
   - /produits/<slug>   : fiche produit lisible sans JavaScript (titre, description, prix, INCI, FAQ)
                          + données structurées Product / BreadcrumbList / FAQPage
   - /product.html?id=X : redirection 301 vers l'URL propre
   - robots.txt, sitemap.xml, llms.txt : générés depuis products.json
   - toutes les pages HTML : canonical, Open Graph, robots, JSON-LD (Organization, WebSite, BlogPosting) */
/* 08/11/2026 : images de partage 1200×630 (/og/<id>.jpg), Product enrichi (livraison, retours, mpn),
   pages catégories/gammes lisibles sans JS (CollectionPage + ItemList + liens), flux catalogue
   /feeds/produits.xml (Google Merchant Center, Meta, TikTok, Pinterest), /llms-full.txt, IndexNow (Bing → ChatGPT),
   balises de vérification via variables d'environnement (GOOGLE_SITE_VERIFICATION, BING_SITE_VERIFICATION,
   FACEBOOK_DOMAIN_VERIFICATION, PINTEREST_VERIFICATION) et profils sociaux via SOCIAL_LINKS (URL séparées par des virgules). */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const SITE = 'https://www.onaecosmetics.fr';
const BRAND = 'Onaé Paris';
const DEMO = new Set(['serum-eclat-peptides', 'creme-reparatrice-intense', 'essence-hydratante-pro', 'huile-nuit-reparatrice']);
/* Anciens produits de démo retirés du catalogue (07/11/2026) : redirection 301 vers le vrai soin équivalent */
const RETIRED = {
  'serum-eclat-peptides': 'serum-vitamine-c-boost',
  'creme-reparatrice-intense': 'creme-onctueuse-nourrissante',
  'essence-hydratante-pro': 'serum-hydratant-reparateur',
  'huile-nuit-reparatrice': 'creme-onctueuse-nourrissante',
};
// Pages privées ou transactionnelles : jamais indexées
const NOINDEX = new Set(['/banniere-peptides.html', '/banniere-retinol.html', '/banniere-routine.html', '/banniere-noel.html', '/banniere-bar.html', '/apercu-banniere-serum.html', '/apercu-banniere-routine.html', '/panier.html', '/checkout.html', '/compte.html', '/mon-compte.html', '/suivi-commande.html', '/product.html', '/mentions-legales-concours.html']);
const CAT = {
  visage:  { label: 'Soins visage',  url: '/soins-visage.html' },
  yeux:    { label: 'Soins yeux',    url: '/soins-yeux.html' },
  cheveux: { label: 'Soins cheveux', url: '/soins-cheveux.html' },
  box:     { label: 'Les Box',       url: '/box.html' },
};

const GAMME = g => p => p.gamme === g;
const COLLECTIONS = {
  '/soins-visage.html':    { label: 'Soins visage', filter: p => (p.category || 'visage') === 'visage' },
  '/soins-yeux.html':      { label: 'Soins yeux', filter: p => p.category === 'yeux', grid: 'catalog-grid' },
  '/soins-cheveux.html':   { label: 'Soins cheveux', filter: p => p.category === 'cheveux' },
  '/nouveautes.html':      { label: 'Nouveautés', filter: p => /^Nouv/.test(p.badge || '') || /^Nouv/.test(p.badge2 || '') },
  '/box.html':             { label: 'Les Box', filter: p => p.category === 'box' },
  '/gamme-boost.html':     { label: 'Gamme o·boost', filter: GAMME('o·boost'), grid: 'gmGrid' },
  '/gamme-care.html':      { label: 'Gamme o·care', filter: GAMME('o·care'), grid: 'gmGrid' },
  '/gamme-hydraline.html': { label: 'Gamme o·hydraline', filter: GAMME('o·hydraline'), grid: 'gmGrid' },
  '/gamme-repare.html':    { label: 'Gamme o·répare', filter: GAMME('o·répare'), grid: 'gmGrid' },
};

module.exports = function (ROOT) {
  const prelaunch = () => process.env.PRELAUNCH === '1';
  let cache = { mtime: 0, list: [] };
  function products() {
    const f = path.join(ROOT, 'products.json');
    try {
      const m = fs.statSync(f).mtimeMs;
      if (m !== cache.mtime) cache = { mtime: m, list: JSON.parse(fs.readFileSync(f, 'utf8')).products || [] };
    } catch (_) {}
    return cache.list;
  }
  const real = () => products().filter(p => !DEMO.has(p.id) && p.category !== 'cadeau');
  const find = slug => products().find(p => p.slug === slug || p.id === slug);
  const purl = p => `${SITE}/produits/${encodeURIComponent(p.slug || p.id)}`;
  const img = s => s ? (/^https?:/.test(s) ? s : `${SITE}/${String(s).replace(/^\//, '')}`) : `${SITE}/og/onae.jpg`;
  const ogImg = p => fs.existsSync(path.join(ROOT, 'og', p.id + '.jpg')) ? `${SITE}/og/${p.id}.jpg` : img(p.image);
  const SHIP_FREE = 59, SHIP_COST = 4.9, RETURN_DAYS = 14;
  const social = () => String(process.env.SOCIAL_LINKS || '').split(',').map(x => x.trim()).filter(x => /^https:\/\//.test(x));
  const until = () => `${new Date().getFullYear() + 1}-12-31`;
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const json = o => JSON.stringify(o).replace(/</g, '\\u003c');
  const ld = o => `<script type="application/ld+json">${json(o)}</script>`;
  const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
  const fullName = p => [p.name, p.name_line2].filter(Boolean).join(' ');
  const mainOffer = p => (p.bundles || []).find(b => b.id === 'solo' && b.price_raw > 0) || (p.bundles || []).find(b => b.price_raw > 0);

  const ORG = {
    '@context': 'https://schema.org', '@type': 'OnlineStore', '@id': SITE + '/#organization',
    name: BRAND, alternateName: ['Onaé', 'Onae', 'ONAĒ', 'Onaé Cosmetics', 'Onae Cosmetics'], url: SITE + '/',
    logo: { '@type': 'ImageObject', url: SITE + '/logo_onae_homepage.png', width: 200, height: 200 }, image: SITE + '/og/onae.jpg', email: 'contact@onaecosmetics.fr',
    description: 'Marque française de soins naturels aux peptides pour la peau et les cheveux : des routines courtes, en trois gestes, élaborées en France.',
    slogan: 'La beauté en trois gestes.',
    knowsAbout: ['soins visage aux peptides', 'alternative au rétinol', 'soins contour des yeux', 'soins cheveux naturels', 'huile de romarin', 'cosmétiques naturels', 'routine beauté'],
    areaServed: ['FR', 'BE', 'CH', 'LU', 'MC'],
    address: { '@type': 'PostalAddress', addressLocality: 'Paris', addressCountry: 'FR' },
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', email: 'contact@onaecosmetics.fr', availableLanguage: 'French' },
  };
  const RETURN_POLICY = { '@type': 'MerchantReturnPolicy', applicableCountry: 'FR', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: RETURN_DAYS, returnMethod: 'https://schema.org/ReturnByMail', merchantReturnLink: SITE + '/livraison-retours.html' };
  const shipping = price => ({ '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: price >= SHIP_FREE ? 0 : SHIP_COST, currency: 'EUR' },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'FR' },
    deliveryTime: { '@type': 'ShippingDeliveryTime', handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 3, unitCode: 'DAY' } } });
  /* France 2-3 j ouvrés ; Belgique, Suisse, Luxembourg, Monaco 5-10 j ouvrés, même tarif (stripe.js) */
  const shippingAll = price => [shipping(price), ...['BE', 'CH', 'LU', 'MC'].map(c => { const x = shipping(price); x.shippingDestination = { '@type': 'DefinedRegion', addressCountry: c }; x.deliveryTime.transitTime = { '@type': 'QuantitativeValue', minValue: 5, maxValue: 10, unitCode: 'DAY' }; return x; })];
  const orgLd = () => Object.assign({}, ORG, social().length ? { sameAs: social() } : {}, { hasMerchantReturnPolicy: RETURN_POLICY });
  const WEBSITE = { '@context': 'https://schema.org', '@type': 'WebSite', '@id': SITE + '/#website', name: BRAND, alternateName: ['Onaé', 'Onaé Cosmetics'], url: SITE + '/', inLanguage: 'fr-FR', publisher: { '@id': SITE + '/#organization' } };

  // ---------- Fiche produit rendue côté serveur ----------
  function productLd(p) {
    const o = mainOffer(p), cat = CAT[p.category || 'visage'] || CAT.visage;
    const product = {
      '@context': 'https://schema.org', '@type': 'Product', '@id': purl(p) + '#product',
      name: fullName(p), sku: p.id, mpn: p.id, url: purl(p),
      image: (p.gallery && p.gallery.length ? p.gallery : [p.image]).slice(0, 6).map(img),
      description: cut(p.description || p.subtitle, 900),
      brand: { '@type': 'Brand', name: BRAND }, category: cat.label,
      countryOfOrigin: 'FR',
    };
    if (p.volume) product.size = p.volume;
    if (Array.isArray(p.ingredients) && p.ingredients.length) product.additionalProperty = [{ '@type': 'PropertyValue', name: 'Ingrédients clés', value: p.ingredients.join(', ') }];
    if (o) product.offers = {
      '@type': 'Offer', url: purl(p), priceCurrency: 'EUR', price: o.price_raw.toFixed(2),
      availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition', priceValidUntil: until(),
      seller: { '@id': SITE + '/#organization' }, shippingDetails: shippingAll(o.price_raw), hasMerchantReturnPolicy: RETURN_POLICY,
    };
    // Pas d'aggregateRating tant qu'il n'y a pas de vrais avis vérifiés.
    const out = [product, {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: cat.label, item: SITE + cat.url },
        { '@type': 'ListItem', position: 3, name: fullName(p), item: purl(p) },
      ] }];
    if (Array.isArray(p.faq) && p.faq.length) out.push({ '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: p.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
    return out.map(ld).join('\n');
  }

  // Contenu identique à celui que le JavaScript affiche ensuite (pas de contenu caché) :
  // les robots qui n'exécutent pas le JS (GPTBot, ClaudeBot, PerplexityBot…) lisent la fiche complète.
  function productBody(p) {
    const o = mainOffer(p), cat = CAT[p.category || 'visage'] || CAT.visage;
    const list = (arr, f) => Array.isArray(arr) && arr.length ? arr.map(f).join('') : '';
    return `<article class="ssr-prod" style="max-width:760px;margin:0 auto;padding:28px 20px;font-family:'DM Sans',system-ui,sans-serif;color:#141414;line-height:1.6">
<nav style="font-size:12px;color:#888"><a href="/" style="color:inherit">Accueil</a> › <a href="${cat.url}" style="color:inherit">${esc(cat.label)}</a></nav>
<img src="${esc(p.image)}" alt="${esc(p.image_alt || fullName(p))}" width="560" height="700" style="width:100%;max-width:420px;height:auto;margin:18px 0;border-radius:16px">
<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#888">${esc(p.gamme_label || '')}${p.volume ? ' · ' + esc(p.volume) : ''}</p>
<h1 style="font-family:'DM Serif Display',Georgia,serif;font-weight:400;font-size:32px;line-height:1.15">${esc(fullName(p))}</h1>
<p>${esc(p.subtitle || '')}</p>
${o ? `<p style="font-size:22px;margin:10px 0">${esc(o.price)}</p>` : ''}
${p.description ? `<h2 style="font-size:18px;margin-top:22px">Description</h2><p>${esc(p.description)}</p>` : ''}
${list(p.benefits, b => `<h3 style="font-size:15px;margin-top:12px">${esc(b.title)}</h3><p>${esc(b.desc)}</p>`) ? `<h2 style="font-size:18px;margin-top:22px">Bienfaits</h2>` + list(p.benefits, b => `<h3 style="font-size:15px;margin-top:12px">${esc(b.title)}</h3><p>${esc(b.desc)}</p>`) : ''}
${list(p.how_to_use, s => `<li>${esc(s.title)} : ${esc(s.desc)}</li>`) ? `<h2 style="font-size:18px;margin-top:22px">Conseils d'utilisation</h2><ol>${list(p.how_to_use, s => `<li>${esc(s.title)} : ${esc(s.desc)}</li>`)}</ol>` : ''}
${Array.isArray(p.ingredients) && p.ingredients.length ? `<h2 style="font-size:18px;margin-top:22px">Ingrédients clés</h2><p>${esc(p.ingredients.join(', '))}</p>` : ''}
${p.ingredients_full ? `<h2 style="font-size:18px;margin-top:22px">Composition (INCI)</h2><p>${esc(p.ingredients_full)}</p>` : ''}
${list(p.faq, f => `<h3 style="font-size:15px;margin-top:12px">${esc(f.q)}</h3><p>${esc(f.a)}</p>`) ? `<h2 style="font-size:18px;margin-top:22px">Questions fréquentes</h2>` + list(p.faq, f => `<h3 style="font-size:15px;margin-top:12px">${esc(f.q)}</h3><p>${esc(f.a)}</p>`) : ''}
</article>`;
  }

  function verifyTags() {
    const e = process.env, t = [];
    if (e.GOOGLE_SITE_VERIFICATION) t.push(`<meta name="google-site-verification" content="${esc(e.GOOGLE_SITE_VERIFICATION)}">`);
    if (e.BING_SITE_VERIFICATION) t.push(`<meta name="msvalidate.01" content="${esc(e.BING_SITE_VERIFICATION)}">`);
    if (e.FACEBOOK_DOMAIN_VERIFICATION) t.push(`<meta name="facebook-domain-verification" content="${esc(e.FACEBOOK_DOMAIN_VERIFICATION)}">`);
    if (e.PINTEREST_VERIFICATION) t.push(`<meta name="p:domain_verify" content="${esc(e.PINTEREST_VERIFICATION)}">`);
    return t.join('\n');
  }
  function headTags({ title, description, canonical, image, imageAlt, type = 'website', robots, extra = '' }) {
    const im = image || SITE + '/og/onae.jpg', is1200 = /\/og\//.test(im);
    return [
      verifyTags(),
      robots ? `<meta name="robots" content="${robots}">` : '',
      canonical ? `<link rel="canonical" href="${esc(canonical)}">` : '',
      `<meta property="og:site_name" content="${BRAND}">`,
      `<meta property="og:locale" content="fr_FR">`,
      `<meta property="og:type" content="${type}">`,
      title ? `<meta property="og:title" content="${esc(title)}">` : '',
      description ? `<meta property="og:description" content="${esc(description)}">` : '',
      canonical ? `<meta property="og:url" content="${esc(canonical)}">` : '',
      `<meta property="og:image" content="${esc(im)}">`,
      is1200 ? `<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:image:type" content="image/jpeg">` : '',
      `<meta property="og:image:alt" content="${esc(imageAlt || title || BRAND)}">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      title ? `<meta name="twitter:title" content="${esc(title)}">` : '',
      description ? `<meta name="twitter:description" content="${esc(description)}">` : '',
      `<meta name="twitter:image" content="${esc(im)}">`,
      `<meta name="theme-color" content="#fbf6f3">`,
      extra,
    ].filter(Boolean).join('\n');
  }

  // Insère dans le <head> juste après </title> (plusieurs pages omettent </head>, ce qui est valide en HTML5)
  // et garantit lang="fr" sur la page.
  function inject(html, tags) {
    html = html.replace('</title>', '</title>\n' + tags);
    if (/<html(?![^>]*\blang=)/i.test(html)) html = html.replace(/<html/i, '<html lang="fr"');
    else if (!/<html/i.test(html)) html = '<html lang="fr">\n' + html;
    return html;
  }

  function renderProduct(html, p) {
    const o = mainOffer(p);
    const title = `${fullName(p)} — ${BRAND}`;
    const description = cut(`${p.subtitle || ''}${o ? ' ' + o.price + '.' : ''} Formule élaborée en France.`, 158);
    const robots = DEMO.has(p.id) ? 'noindex, follow' : 'index, follow, max-image-preview:large';
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>\n<base href="/">\n<meta name="description" content="${esc(description)}">`);
    html = inject(html, headTags({ title, description, canonical: purl(p), image: ogImg(p), imageAlt: fullName(p) + ' — Onaé', type: 'product', robots,
      extra: productLd(p) + (o ? `\n<meta property="product:price:amount" content="${o.price_raw.toFixed(2)}">\n<meta property="product:price:currency" content="EUR">\n<meta property="product:availability" content="in stock">\n<meta property="product:brand" content="${BRAND}">` : '') }));
    html = html.replace(/<div id="app">[\s\S]*?<\/div>/, `<div id="app">${productBody(p)}</div>`);
    return html;
  }

  // ---------- Toutes les autres pages HTML ----------
  function enhancePage(html, urlPath) {
    if (html.includes('rel="canonical"') && html.includes('og:title')) return html;   // page déjà complète (concours)
    const page = urlPath === '/' ? '/index.html' : (path.extname(urlPath) ? urlPath : urlPath + '.html');
    const canonical = SITE + (page === '/index.html' ? '/' : page);
    const title = ((html.match(/<title>([^<]*)<\/title>/) || [])[1] || BRAND).replace(/&amp;/g, '&');
    const description = ((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '').replace(/&amp;/g, '&');
    let extra = '';
    if (page === '/index.html') extra = ld(orgLd()) + '\n' + ld(WEBSITE);
    /* pages catégories et gammes : liste des produits lisible par tous les robots (y compris les IA qui n'exécutent pas le JavaScript) */
    const coll = COLLECTIONS[page];
    if (coll) {
      const list = real().filter(coll.filter);
      if (list.length) {
        extra += '\n' + ld({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description, url: canonical, inLanguage: 'fr-FR', isPartOf: { '@id': SITE + '/#website' },
          mainEntity: { '@type': 'ItemList', numberOfItems: list.length, itemListElement: list.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: purl(p), name: fullName(p) })) } });
        extra += '\n' + ld({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: coll.label, item: canonical }] });
        /* grille vide remplie côté serveur avec les mêmes produits que le JavaScript affichera ensuite (il la remplace) */
        if (coll.grid) html = html.replace(new RegExp(`(<div[^>]*id="${coll.grid}"[^>]*>)\\s*(</div>)`), (m, a, b) => a + list.map(p => {
          const o = mainOffer(p);
          return `<a href="/produits/${esc(p.slug || p.id)}" class="cat-card ssr-card"><div class="cat-body"><p class="cat-name">${esc(fullName(p))}</p><p class="cat-sub">${esc(p.subtitle || '')}</p>${o ? `<span class="cat-price">${esc(o.price)}</span>` : ''}</div></a>`;
        }).join('') + b);
      }
    }
    if (/^\/blog-[a-z0-9-]+\.html$/.test(page)) {
      const h1 = ((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || title).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      const MOIS = { janvier: 1, 'février': 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, 'août': 8, septembre: 9, octobre: 10, novembre: 11, 'décembre': 12 };
      const dm = html.match(/class="ah-meta"[\s\S]{0,200}?(\d{1,2}) (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) (\d{4})/);
      const art = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: cut(h1, 110), description, url: canonical, inLanguage: 'fr-FR',
        author: { '@type': 'Organization', name: 'La Rédaction Onaé', url: SITE + '/' }, publisher: { '@id': SITE + '/#organization' }, mainEntityOfPage: canonical };
      if (dm) art.datePublished = `${dm[3]}-${String(MOIS[dm[2]]).padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
      try { art.dateModified = new Date(fs.statSync(path.join(ROOT, page.slice(1))).mtimeMs).toISOString().slice(0, 10); } catch (_) {}
      const im = (html.match(/<img[^>]+src="([^"]+\.(?:jpe?g|png|webp))"/) || [])[1];
      if (im) art.image = img(im);
      extra = ld(art) + '\n' + ld({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Le Journal', item: SITE + '/blog.html' },
        { '@type': 'ListItem', position: 3, name: cut(h1, 80), item: canonical }] });
    }
    const robots = NOINDEX.has(page) ? 'noindex, follow' : 'index, follow, max-image-preview:large';
    return inject(html, headTags({ title, description, canonical, type: page.startsWith('/blog-') ? 'article' : 'website', robots, extra }));
  }

  // ---------- robots.txt / sitemap.xml / llms.txt ----------
  function robotsTxt() {
    // Les robots de recherche IA sont explicitement bienvenus : c'est ce qui permet d'être cité par ChatGPT, Perplexity, Claude, Gemini…
    const ai = ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'Claude-SearchBot', 'Claude-User', 'ClaudeBot', 'PerplexityBot', 'Perplexity-User',
      'Google-Extended', 'Applebot', 'Applebot-Extended', 'Bingbot', 'MistralAI-User', 'Meta-ExternalAgent', 'Meta-ExternalFetcher',
      'Amazonbot', 'DuckAssistBot', 'YouBot', 'cohere-ai', 'PetalBot', 'facebookexternalhit', 'Twitterbot', 'LinkedInBot', 'Pinterestbot', 'TikTokSpider'];
    const dis = ['/api/', '/panier.html', '/checkout.html', '/compte.html', '/mon-compte.html', '/suivi-commande.html'];
    const block = dis.map(d => `Disallow: ${d}`).join('\n');
    return `# Onaé Paris — ${SITE}\nUser-agent: *\nAllow: /\n${block}\n\n` +
      ai.map(a => `User-agent: ${a}\nAllow: /\n${block}`).join('\n\n') +
      `\n\nSitemap: ${SITE}/sitemap.xml\n# Pour les assistants IA : ${SITE}/llms.txt et ${SITE}/llms-full.txt\n`;
  }

  function sitemapXml() {
    const day = ms => new Date(ms).toISOString().slice(0, 10);
    const stat = f => { try { return fs.statSync(path.join(ROOT, f)).mtimeMs; } catch (_) { return Date.now(); } };
    const urls = [];
    if (prelaunch()) {
      urls.push({ loc: SITE + '/concours', lastmod: day(stat('concours.html')), pri: '1.0' });
    } else {
      const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && !NOINDEX.has('/' + f) && !/concours/.test(f));
      for (const f of pages) {
        const loc = f === 'index.html' ? SITE + '/' : `${SITE}/${f}`;
        const pri = f === 'index.html' ? '1.0' : /^(soins-|makeup|box|nouveautes|nos-gammes|gamme-|routine-peptides|alternatives-retinol|serum-peptides|carte-cadeau|bar-a-routines|coffrets-duos)/.test(f) ? '0.8' : /^blog/.test(f) ? '0.6' : '0.4';
        urls.push({ loc, lastmod: day(stat(f)), pri });
      }
      const pm = day(stat('products.json'));
      for (const p of real()) urls.push({ loc: purl(p), lastmod: pm, pri: '0.9', images: [p.image, ...(p.gallery || [])].filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 8).map(img), title: fullName(p) });
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
      urls.map(u => `  <url><loc>${esc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.pri}</priority>${(u.images || []).map(i => `<image:image><image:loc>${esc(i)}</image:loc><image:title>${esc(u.title)}</image:title></image:image>`).join('')}</url>`).join('\n') +
      `\n</urlset>\n`;
  }

  function llmsTxt() {
    const byCat = {};
    for (const p of real()) (byCat[p.category || 'visage'] ||= []).push(p);
    const line = p => { const o = mainOffer(p); return `- [${fullName(p)}](${purl(p)}) — ${p.gamme_label || ''}${p.volume ? ', ' + p.volume : ''}${o ? ', ' + o.price : ''}. ${cut(p.subtitle, 200)}`; };
    const sec = (k, t) => byCat[k] && byCat[k].length ? `\n## ${t}\n\n${byCat[k].map(line).join('\n')}\n` : '';
    return `# Onaé Paris\n\n> Marque française de cosmétiques naturels (${SITE}). Onaé conçoit des routines courtes et efficaces, en trois gestes, pour la peau et les cheveux, avec les peptides comme actif signature. Formules d'origine naturelle, élaborées en France, vendues en ligne avec livraison en France, Belgique, Suisse, Luxembourg et Monaco.\n\n` +
      `Le positionnement : moins de produits, mieux choisis. Chaque gamme (o·boost anti-âge aux peptides, o·care, o·hydraline hydratation peau et cheveux, o·répare) est pensée comme une routine complète plutôt qu'une accumulation de soins.\n` +
      sec('box', 'Coffrets et routines complètes') + sec('visage', 'Soins visage') + sec('yeux', 'Soins contour des yeux') + sec('cheveux', 'Soins cheveux et cuir chevelu') +
      `\n## Pages utiles\n\n- [Nos gammes](${SITE}/nos-gammes.html) : les 4 routines Onaé et à qui elles s'adressent\n- [Nos ingrédients](${SITE}/nos-ingredients.html) : peptides, romarin, acide hyaluronique, actifs végétaux\n- [Diagnostic peau et cheveux](${SITE}/diagnostic.html) : questionnaire guidé pour trouver sa routine\n- [Notre histoire](${SITE}/notre-histoire.html)\n- [Nos engagements](${SITE}/nos-engagements.html)\n- [Livraison et retours](${SITE}/livraison-retours.html)\n- [Questions fréquentes](${SITE}/faq.html)\n- [Le Journal (blog)](${SITE}/blog.html) : conseils routine, ingrédients, lecture INCI\n- Contact : contact@onaecosmetics.fr\n`;
  }

  // ---------- Flux catalogue (Google Merchant Center, Meta/Instagram Shopping, TikTok, Pinterest) ----------
  // Format RSS 2.0 + espace de noms g: — accepté tel quel par les quatre plateformes.
  function feedXml() {
    const items = [];
    for (const p of real()) {
      const cat = p.category || 'visage';
      const gcat = cat === 'cheveux' ? 'Health & Beauty > Personal Care > Hair Care' : 'Health & Beauty > Personal Care > Cosmetics > Skin Care';
      const type = `Soins ${cat === 'yeux' ? 'contour des yeux' : cat === 'box' ? 'coffrets' : cat} > ${p.gamme_label || p.gamme || 'Onaé'}`;
      const gal = (p.gallery && p.gallery.length ? p.gallery : [p.image]).filter(x => !/avant-apres/.test(x));
      for (const b of (p.bundles || []).filter(b => b.price_raw > 0 && (b.id === 'solo' || (p.bundles || []).length === 1))) {
        const price = b.price_raw;
        const desc = cut([p.subtitle, p.description, Array.isArray(p.benefits) ? p.benefits.map(x => typeof x === 'string' ? x : x.title).join(' · ') : ''].filter(Boolean).join(' — '), 4900);
        const x = [
          `<g:id>${esc(p.id)}</g:id>`, `<g:item_group_id>${esc(p.id)}</g:item_group_id>`,
          `<g:title>${esc(cut(`${fullName(p)} — Onaé${p.volume ? ' ' + p.volume : ''}`, 150))}</g:title>`,
          `<g:description>${esc(desc)}</g:description>`, `<g:link>${esc(purl(p))}</g:link>`,
          `<g:image_link>${esc(img(gal[0] || p.image))}</g:image_link>`,
          ...gal.slice(1, 10).map(u => `<g:additional_image_link>${esc(img(u))}</g:additional_image_link>`),
          `<g:availability>in_stock</g:availability>`, `<g:condition>new</g:condition>`,
          `<g:price>${price.toFixed(2)} EUR</g:price>`,
          `<g:brand>${BRAND}</g:brand>`, `<g:mpn>${esc(p.id)}</g:mpn>`, `<g:identifier_exists>no</g:identifier_exists>`,
          `<g:google_product_category>${esc(gcat)}</g:google_product_category>`, `<g:product_type>${esc(type)}</g:product_type>`,
          `<g:age_group>adult</g:age_group>`, p.volume ? `<g:size>${esc(p.volume)}</g:size>` : '',
          ...['FR', 'BE', 'CH', 'LU', 'MC'].map(c => `<g:shipping><g:country>${c}</g:country><g:service>Standard</g:service><g:price>${price >= SHIP_FREE ? '0.00' : SHIP_COST.toFixed(2)} EUR</g:price><g:min_handling_time>0</g:min_handling_time><g:max_handling_time>1</g:max_handling_time><g:min_transit_time>${c === 'FR' ? 2 : 5}</g:min_transit_time><g:max_transit_time>${c === 'FR' ? 3 : 10}</g:max_transit_time></g:shipping>`),
          (p.badge === 'Bestseller' || p.bestseller) ? `<g:custom_label_0>bestseller</g:custom_label_0>` : '',
          (/^Nouv/.test(p.badge || '') || /^Nouv/.test(p.badge2 || '')) ? `<g:custom_label_1>nouveaute</g:custom_label_1>` : '',
          `<g:custom_label_2>${esc(p.gamme || '')}</g:custom_label_2>`,
        ].filter(Boolean).join('');
        items.push(`<item>${x}</item>`);
      }
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>${BRAND} — catalogue</title><link>${SITE}/</link><description>Soins naturels aux peptides, peau et cheveux — marque élaborée en France.</description>\n${items.join('\n')}\n</channel></rss>\n`;
  }

  // ---------- llms-full.txt : fiche complète de chaque soin, pour les assistants IA ----------
  function llmsFullTxt() {
    const lines = [llmsTxt(), '\n---\n\n# Fiches détaillées des soins\n'];
    for (const p of real()) {
      const o = mainOffer(p);
      const ben = Array.isArray(p.benefits) ? p.benefits.map(b => typeof b === 'string' ? `- ${b}` : `- ${b.title} : ${b.desc || ''}`).join('\n') : '';
      const how = Array.isArray(p.how_to_use) ? p.how_to_use.map((h, i) => `${i + 1}. ${h.title} : ${h.desc || ''}`).join('\n') : '';
      const eff = p.efficacy && Array.isArray(p.efficacy.stats) && p.efficacy.stats.length ? `${p.efficacy.claim || 'Test d\'usage'} : ${p.efficacy.stats.map(s => `${s.pct} % ${s.when}`).join(', ')}${p.efficacy.source ? ` (${p.efficacy.source})` : ''}` : '';
      const offers = (p.bundles || []).filter(b => b.price_raw > 0).map(b => `${b.name || b.label || b.id} : ${b.price}`).join(' · ');
      lines.push(`\n## ${fullName(p)}\n\n- URL : ${purl(p)}\n- Gamme : ${p.gamme_label || p.gamme || ''}${p.volume ? '\n- Contenance : ' + p.volume : ''}${o ? '\n- Prix : ' + o.price : ''}${offers ? '\n- Formules : ' + offers : ''}\n\n${p.subtitle || ''}\n\n${p.description || ''}\n` +
        (ben ? `\n### Bienfaits\n${ben}\n` : '') + (how ? `\n### Utilisation\n${how}\n` : '') + (eff ? `\n### Résultats\n${eff}\n` : '') +
        (Array.isArray(p.ingredients) && p.ingredients.length ? `\n### Ingrédients clés\n${p.ingredients.join(', ')}\n` : '') + (p.ingredients_full ? `\n### Composition (INCI)\n${p.ingredients_full}\n` : '') +
        (Array.isArray(p.faq) && p.faq.length ? `\n### Questions fréquentes\n${p.faq.map(f => `- **${f.q}** ${f.a}`).join('\n')}\n` : ''));
    }
    lines.push(`\n---\n\nLivraison : expédition sous 24 h ouvrées, livraison en 2 à 3 jours ouvrés en France et 5 à 10 jours ouvrés en Belgique, Suisse, Luxembourg et Monaco, offerte dès ${SHIP_FREE} € (sinon ${SHIP_COST.toFixed(2).replace('.', ',')} €). Retours : ${RETURN_DAYS} jours pour changer d'avis sur les produits non ouverts. Paiement : Visa, Mastercard, Apple Pay, Google Pay, Bancontact. Programme fidélité Onaé Privilège : 1 € = 1 éclat, 50 éclats offerts à l'inscription. Contact : contact@onaecosmetics.fr\n`);
    return lines.join('');
  }

  // ---------- IndexNow : prévient Bing (et donc la recherche ChatGPT / Copilot), Yandex, Seznam… à chaque mise en ligne ----------
  const INDEXNOW_KEY = process.env.INDEXNOW_KEY || crypto.createHash('sha256').update('onae-indexnow-' + SITE).digest('hex').slice(0, 32);
  function allUrls() { return [...sitemapXml().matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(/&amp;/g, '&')); }
  function pingIndexNow() {
    if (prelaunch() || !process.env.RAILWAY_ENVIRONMENT) return;           // seulement en production, boutique ouverte
    const body = JSON.stringify({ host: new URL(SITE).host, key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList: allUrls().slice(0, 10000) });
    const req = https.request({ hostname: 'api.indexnow.org', path: '/indexnow', method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) }, timeout: 15000 },
      r => { console.log('[indexnow]', r.statusCode, JSON.parse(body).urlList.length, 'URL'); r.resume(); });
    req.on('error', e => console.log('[indexnow] erreur', e.message)); req.on('timeout', () => req.destroy()); req.end(body);
  }
  setTimeout(pingIndexNow, 45000).unref();

  // ---------- Routeur : renvoie true si la requête a été traitée ----------
  const route = function seo(req, res, urlPath) {
    const send = (type, body, cc = 'public, max-age=3600') => { res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cc }); res.end(body); };
    if (urlPath === '/robots.txt') { send('text/plain; charset=utf-8', robotsTxt()); return true; }
    if (urlPath === '/sitemap.xml') { send('application/xml; charset=utf-8', sitemapXml()); return true; }
    if (urlPath === '/llms.txt') { send('text/plain; charset=utf-8', llmsTxt()); return true; }
    if (urlPath === '/llms-full.txt') { send('text/plain; charset=utf-8', llmsFullTxt()); return true; }
    if (urlPath === '/feeds/produits.xml' || urlPath === '/feeds/google.xml') { send('application/xml; charset=utf-8', feedXml()); return true; }
    if (urlPath === `/${INDEXNOW_KEY}.txt`) { send('text/plain; charset=utf-8', INDEXNOW_KEY); return true; }

    if (urlPath === '/product.html' || urlPath === '/product' || urlPath === '/product/serum-anti-age') {
      const q = new URL(req.url, 'http://x').searchParams;
      const id = q.get('id') || 'serum-anti-age-peptides';
      const p = find(RETIRED[id] || id);
      if (p) {
        q.delete('id');
        const rest = q.toString();
        res.writeHead(301, { Location: `/produits/${encodeURIComponent(p.slug || p.id)}${rest ? '?' + rest : ''}` }); res.end(); return true;
      }
    }
    const m = urlPath.match(/^\/produits\/([a-z0-9-]+)$/);
    if (m) {
      if (RETIRED[m[1]]) { res.writeHead(301, { Location: `/produits/${RETIRED[m[1]]}` }); res.end(); return true; }
      const p = find(m[1]);
      if (!p) return false;
      fs.readFile(path.join(ROOT, 'product.html'), 'utf8', (err, html) => {
        if (err) { res.writeHead(500); res.end('Erreur'); return; }
        send('text/html; charset=utf-8', renderProduct(html, p), 'no-cache');
      });
      return true;
    }
    return false;
  };
  route.enhance = enhancePage;
  return route;
};
