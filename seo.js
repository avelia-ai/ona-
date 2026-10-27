/* Onaé — référencement Google & moteurs IA (rendu côté serveur, sans dépendance).
   - /produits/<slug>   : fiche produit lisible sans JavaScript (titre, description, prix, INCI, FAQ)
                          + données structurées Product / BreadcrumbList / FAQPage
   - /product.html?id=X : redirection 301 vers l'URL propre
   - robots.txt, sitemap.xml, llms.txt : générés depuis products.json
   - toutes les pages HTML : canonical, Open Graph, robots, JSON-LD (Organization, WebSite, BlogPosting) */
const fs = require('fs');
const path = require('path');

const SITE = 'https://www.onaecosmetics.fr';
const BRAND = 'Onaé Paris';
const DEMO = new Set(['serum-eclat-peptides', 'creme-reparatrice-intense', 'essence-hydratante-pro', 'huile-nuit-reparatrice']);
// Pages privées ou transactionnelles : jamais indexées
const NOINDEX = new Set(['/banniere-peptides.html', '/banniere-retinol.html', '/banniere-routine.html', '/apercu-banniere-serum.html', '/apercu-banniere-routine.html', '/panier.html', '/checkout.html', '/compte.html', '/mon-compte.html', '/suivi-commande.html', '/product.html', '/mentions-legales-concours.html']);
const CAT = {
  visage:  { label: 'Soins visage',  url: '/soins-visage.html' },
  yeux:    { label: 'Soins yeux',    url: '/soins-yeux.html' },
  cheveux: { label: 'Soins cheveux', url: '/soins-cheveux.html' },
  box:     { label: 'Les Box',       url: '/box.html' },
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
  const real = () => products().filter(p => !DEMO.has(p.id));
  const find = slug => products().find(p => p.slug === slug || p.id === slug);
  const purl = p => `${SITE}/produits/${encodeURIComponent(p.slug || p.id)}`;
  const img = s => s ? (/^https?:/.test(s) ? s : `${SITE}/${String(s).replace(/^\//, '')}`) : `${SITE}/coffret-face.webp`;
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const json = o => JSON.stringify(o).replace(/</g, '\\u003c');
  const ld = o => `<script type="application/ld+json">${json(o)}</script>`;
  const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
  const fullName = p => [p.name, p.name_line2].filter(Boolean).join(' ');
  const mainOffer = p => (p.bundles || []).find(b => b.id === 'solo' && b.price_raw > 0) || (p.bundles || []).find(b => b.price_raw > 0);

  const ORG = {
    '@context': 'https://schema.org', '@type': 'Organization', '@id': SITE + '/#organization',
    name: BRAND, alternateName: ['Onaé', 'Onae', 'ONAĒ', 'Onaé Cosmetics'], url: SITE + '/',
    logo: SITE + '/logo_onae_homepage.png', email: 'contact@onaecosmetics.fr',
    description: 'Marque française de soins naturels aux peptides pour la peau et les cheveux : des routines courtes, en trois gestes, élaborées en France.',
    address: { '@type': 'PostalAddress', addressLocality: 'Paris', addressCountry: 'FR' },
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', email: 'contact@onaecosmetics.fr', availableLanguage: 'French' },
  };
  const WEBSITE = { '@context': 'https://schema.org', '@type': 'WebSite', '@id': SITE + '/#website', name: BRAND, url: SITE + '/', inLanguage: 'fr-FR', publisher: { '@id': SITE + '/#organization' } };

  // ---------- Fiche produit rendue côté serveur ----------
  function productLd(p) {
    const o = mainOffer(p), cat = CAT[p.category || 'visage'] || CAT.visage;
    const product = {
      '@context': 'https://schema.org', '@type': 'Product', '@id': purl(p) + '#product',
      name: fullName(p), sku: p.id, url: purl(p),
      image: (p.gallery && p.gallery.length ? p.gallery : [p.image]).slice(0, 6).map(img),
      description: cut(p.description || p.subtitle, 900),
      brand: { '@type': 'Brand', name: BRAND }, category: cat.label,
      countryOfOrigin: 'FR',
    };
    if (p.volume) product.size = p.volume;
    if (Array.isArray(p.ingredients) && p.ingredients.length) product.additionalProperty = [{ '@type': 'PropertyValue', name: 'Ingrédients clés', value: p.ingredients.join(', ') }];
    if (o) product.offers = {
      '@type': 'Offer', url: purl(p), priceCurrency: 'EUR', price: o.price_raw.toFixed(2),
      availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': SITE + '/#organization' },
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

  function headTags({ title, description, canonical, image, type = 'website', robots, extra = '' }) {
    return [
      robots ? `<meta name="robots" content="${robots}">` : '',
      canonical ? `<link rel="canonical" href="${esc(canonical)}">` : '',
      `<meta property="og:site_name" content="${BRAND}">`,
      `<meta property="og:locale" content="fr_FR">`,
      `<meta property="og:type" content="${type}">`,
      title ? `<meta property="og:title" content="${esc(title)}">` : '',
      description ? `<meta property="og:description" content="${esc(description)}">` : '',
      canonical ? `<meta property="og:url" content="${esc(canonical)}">` : '',
      `<meta property="og:image" content="${esc(image || SITE + '/coffret-face.webp')}">`,
      `<meta name="twitter:card" content="summary_large_image">`,
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
    html = inject(html, headTags({ title, description, canonical: purl(p), image: img(p.image), type: 'product', robots, extra: productLd(p) }));
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
    if (page === '/index.html') extra = ld(ORG) + '\n' + ld(WEBSITE);
    if (/^\/blog-[a-z0-9-]+\.html$/.test(page)) {
      const h1 = ((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || title).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      const MOIS = { janvier: 1, 'février': 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, 'août': 8, septembre: 9, octobre: 10, novembre: 11, 'décembre': 12 };
      const dm = html.match(/class="ah-meta"[\s\S]{0,200}?(\d{1,2}) (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) (\d{4})/);
      const art = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: cut(h1, 110), description, url: canonical, inLanguage: 'fr-FR',
        author: { '@type': 'Organization', name: 'La Rédaction Onaé', url: SITE + '/' }, publisher: { '@id': SITE + '/#organization' }, mainEntityOfPage: canonical };
      if (dm) art.datePublished = `${dm[3]}-${String(MOIS[dm[2]]).padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
      extra = ld(art);
    }
    const robots = NOINDEX.has(page) ? 'noindex, follow' : 'index, follow, max-image-preview:large';
    return inject(html, headTags({ title, description, canonical, type: page.startsWith('/blog-') ? 'article' : 'website', robots, extra }));
  }

  // ---------- robots.txt / sitemap.xml / llms.txt ----------
  function robotsTxt() {
    // Les robots de recherche IA sont explicitement bienvenus : c'est ce qui permet d'être cité par ChatGPT, Perplexity, Claude, Gemini…
    const ai = ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'Claude-SearchBot', 'Claude-User', 'ClaudeBot', 'PerplexityBot', 'Perplexity-User',
      'Google-Extended', 'Applebot', 'Applebot-Extended', 'Bingbot', 'MistralAI-User', 'Meta-ExternalAgent', 'Meta-ExternalFetcher'];
    const dis = ['/api/', '/panier.html', '/checkout.html', '/compte.html', '/mon-compte.html', '/suivi-commande.html'];
    const block = dis.map(d => `Disallow: ${d}`).join('\n');
    return `# Onaé Paris — ${SITE}\nUser-agent: *\nAllow: /\n${block}\n\n` +
      ai.map(a => `User-agent: ${a}\nAllow: /\n${block}`).join('\n\n') +
      `\n\nSitemap: ${SITE}/sitemap.xml\n`;
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
        const pri = f === 'index.html' ? '1.0' : /^(soins-|box|nouveautes|nos-gammes|gamme-|routine-peptides)/.test(f) ? '0.8' : /^blog/.test(f) ? '0.6' : '0.4';
        urls.push({ loc, lastmod: day(stat(f)), pri });
      }
      const pm = day(stat('products.json'));
      for (const p of real()) urls.push({ loc: purl(p), lastmod: pm, pri: '0.9', image: img(p.image), title: fullName(p) });
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
      urls.map(u => `  <url><loc>${esc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.pri}</priority>${u.image ? `<image:image><image:loc>${esc(u.image)}</image:loc><image:title>${esc(u.title)}</image:title></image:image>` : ''}</url>`).join('\n') +
      `\n</urlset>\n`;
  }

  function llmsTxt() {
    const byCat = {};
    for (const p of real()) (byCat[p.category || 'visage'] ||= []).push(p);
    const line = p => { const o = mainOffer(p); return `- [${fullName(p)}](${purl(p)}) — ${p.gamme_label || ''}${p.volume ? ', ' + p.volume : ''}${o ? ', ' + o.price : ''}. ${cut(p.subtitle, 200)}`; };
    const sec = (k, t) => byCat[k] && byCat[k].length ? `\n## ${t}\n\n${byCat[k].map(line).join('\n')}\n` : '';
    return `# Onaé Paris\n\n> Marque française de cosmétiques naturels (${SITE}). Onaé conçoit des routines courtes et efficaces, en trois gestes, pour la peau et les cheveux, avec les peptides comme actif signature. Formules d'origine naturelle, élaborées en France, vendues en ligne avec livraison en France.\n\n` +
      `Le positionnement : moins de produits, mieux choisis. Chaque gamme (o·boost anti-âge aux peptides, o·care, o·hydraline hydratation peau et cheveux, o·répare) est pensée comme une routine complète plutôt qu'une accumulation de soins.\n` +
      sec('box', 'Coffrets et routines complètes') + sec('visage', 'Soins visage') + sec('yeux', 'Soins contour des yeux') + sec('cheveux', 'Soins cheveux et cuir chevelu') +
      `\n## Pages utiles\n\n- [Nos gammes](${SITE}/nos-gammes.html) : les 4 routines Onaé et à qui elles s'adressent\n- [Nos ingrédients](${SITE}/nos-ingredients.html) : peptides, romarin, acide hyaluronique, actifs végétaux\n- [Diagnostic peau et cheveux](${SITE}/diagnostic.html) : questionnaire guidé pour trouver sa routine\n- [Notre histoire](${SITE}/notre-histoire.html)\n- [Nos engagements](${SITE}/nos-engagements.html)\n- [Livraison et retours](${SITE}/livraison-retours.html)\n- [Questions fréquentes](${SITE}/faq.html)\n- [Le Journal (blog)](${SITE}/blog.html) : conseils routine, ingrédients, lecture INCI\n- Contact : contact@onaecosmetics.fr\n`;
  }

  // ---------- Routeur : renvoie true si la requête a été traitée ----------
  const route = function seo(req, res, urlPath) {
    const send = (type, body, cc = 'public, max-age=3600') => { res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cc }); res.end(body); };
    if (urlPath === '/robots.txt') { send('text/plain; charset=utf-8', robotsTxt()); return true; }
    if (urlPath === '/sitemap.xml') { send('application/xml; charset=utf-8', sitemapXml()); return true; }
    if (urlPath === '/llms.txt') { send('text/plain; charset=utf-8', llmsTxt()); return true; }

    if (urlPath === '/product.html' || urlPath === '/product' || urlPath === '/product/serum-anti-age') {
      const q = new URL(req.url, 'http://x').searchParams;
      const p = find(q.get('id') || 'serum-anti-age-peptides');
      if (p) {
        q.delete('id');
        const rest = q.toString();
        res.writeHead(301, { Location: `/produits/${encodeURIComponent(p.slug || p.id)}${rest ? '?' + rest : ''}` }); res.end(); return true;
      }
    }
    const m = urlPath.match(/^\/produits\/([a-z0-9-]+)$/);
    if (m) {
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
