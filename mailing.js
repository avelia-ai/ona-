/* Onaé — e-mails aux inscrites (privé, jamais servi au public).
   · E-mails automatiques à l'inscription : lettre, listes d'attente Makeup / Homme, code −10 %, Onaé Privilège, jeu-concours.
   · Campagnes (ouverture de la boutique, newsletters) depuis /admin/emails : audience par source, aperçu, e-mail test,
     envoi immédiat ou programmé, par lots (reprise automatique si le quota d'envoi est atteint).
   · Désinscription en un clic (/desinscription + en-têtes List-Unsubscribe / One-Click).
   · Ouverture programmée de la boutique : lève le mode pré-lancement à l'heure choisie (launch.json), même après un redémarrage.
   Données : DATA_DIR/campaigns.json, unsub.json, mail-auto.json, launch.json. Envoi : notify.js (Resend via RESEND_API_KEY, ou Brevo). */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const N = require('./notify');

const SITE = 'https://www.onaecosmetics.fr';
const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = e => String(e || '').trim().toLowerCase();
const okMail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;
const first = n => String(n || '').trim().split(/\s+/)[0].replace(/[<>]/g, '').slice(0, 30);
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const euro = n => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',') + ' €';

module.exports = function (DATA_DIR, ROOT) {
  const F = n => path.join(DATA_DIR, n);
  const read = (n, d) => { try { return JSON.parse(fs.readFileSync(F(n), 'utf8')); } catch (_) { return d; } };
  const write = (n, v) => { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(F(n), JSON.stringify(v, null, 2)); };

  /* ---------- désinscription ---------- */
  const SECRET = () => process.env.MAIL_SECRET || process.env.NEWSLETTER_KEY || process.env.STRIPE_WEBHOOK_SECRET || 'onae-mail';
  const sig = e => crypto.createHmac('sha256', SECRET()).update('unsub|' + norm(e)).digest('hex').slice(0, 24);
  const sigOk = (e, t) => { const a = Buffer.from(sig(e)), b = Buffer.from(String(t || '')); return a.length === b.length && crypto.timingSafeEqual(a, b); };
  const unsubUrl = e => `${SITE}/desinscription?e=${encodeURIComponent(norm(e))}&t=${sig(e)}`;
  const unsubApi = e => `${SITE}/api/unsubscribe?e=${encodeURIComponent(norm(e))}&t=${sig(e)}`;
  const unsubbed = () => new Set(read('unsub.json', []).map(u => norm(u.email)));
  function unsubscribe(e, how) {
    e = norm(e); const list = read('unsub.json', []);
    if (!list.some(u => norm(u.email) === e)) { list.push({ email: e, at: new Date().toISOString(), how }); write('unsub.json', list); }
    try {   /* préférence du compte client alignée */
      const acc = read('accounts.json', null);
      if (Array.isArray(acc)) { const u = acc.find(x => norm(x.email) === e); if (u && u.prefs && u.prefs.newsletter) { u.prefs.newsletter = false; write('accounts.json', acc); } }
    } catch (_) {}
  }
  function resubscribe(e) { e = norm(e); const list = read('unsub.json', []).filter(u => norm(u.email) !== e); write('unsub.json', list); }

  /* ---------- audience ---------- */
  const SEGMENTS = [
    { id: 'newsletter', label: 'Lettre Onaé', hint: 'Formulaires « newsletter » et pop-ups −10 % (consentement explicite)', def: true },
    { id: 'concours', label: 'Jeu-concours (case « annonce de l\'ouverture » cochée)', hint: 'Uniquement les participants qui ont accepté de recevoir l\'annonce de l\'ouverture et les nouveautés', def: true },
    { id: 'concours_tous', label: 'Jeu-concours · participants SANS la case cochée', hint: 'N\'ont pas accepté de recevoir nos e-mails : envoi à vos risques (consentement requis par la loi pour la prospection)', def: false },
    { id: 'privilege', label: 'Membres Onaé Privilège', hint: 'Ont accepté de recevoir les offres Privilège par e-mail', def: true },
    { id: 'comptes', label: 'Comptes clients (case « offres » cochée)', hint: 'Préférence newsletter activée dans leur compte', def: true },
    { id: 'makeup', label: 'Liste d\'attente Onaé Makeup', hint: 'Inscrits pour le lancement de la BB Crème : à réserver à cette annonce', def: false },
    { id: 'homme', label: 'Liste d\'attente Onaé Homme', hint: 'Inscrits pour le lancement de la crème Homme : à réserver à cette annonce', def: false },
  ];
  const WAIT = { 'makeup-bb': 'makeup', 'homme': 'homme' };
  function audience(segs) {
    segs = new Set(segs || SEGMENTS.filter(s => s.def).map(s => s.id));
    const out = new Map(), counts = Object.fromEntries(SEGMENTS.map(s => [s.id, 0]));
    const add = (email, name, seg) => {
      email = norm(email); if (!okMail(email)) return;
      counts[seg]++;
      if (!segs.has(seg)) return;
      const r = out.get(email) || { email, name: '', segs: [] };
      if (!r.name && name) r.name = first(name);
      if (!r.segs.includes(seg)) r.segs.push(seg);
      out.set(email, r);
    };
    for (const s of read('newsletter.json', [])) {
      const srcs = [s.source, ...(s.also || [])].filter(Boolean), waits = srcs.filter(x => WAIT[x]);
      waits.forEach(w => add(s.email, s.name, WAIT[w]));
      if (!srcs.length || srcs.some(x => !WAIT[x])) add(s.email, s.name, 'newsletter');
    }
    for (const c of read('concours.json', [])) add(c.email, c.firstName, c.newsletter === true ? 'concours' : 'concours_tous');
    for (const m of read('loyalty.json', [])) add(m.email, m.name, 'privilege');
    const acc = read('accounts.json', []);
    if (Array.isArray(acc)) for (const u of acc) if (u.prefs && u.prefs.newsletter === true) add(u.email, u.firstName, 'comptes');
    const un = unsubbed(); let removed = 0;
    for (const e of [...out.keys()]) if (un.has(e)) { out.delete(e); removed++; }
    return { list: [...out.values()], counts, removed, unsubscribed: un.size };
  }

  /* ---------- produits (prix lus en direct) ---------- */
  function products() { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'products.json'), 'utf8')).products || []; } catch (_) { return []; } }
  function tile(id) {
    const p = products().find(x => x.id === id); if (!p) return null;
    const solo = (p.bundles || []).find(b => b.id === 'solo') || {};
    const img = fs.existsSync(path.join(ROOT, `checkout-${id}.jpg`)) ? `checkout-${id}.jpg` : (p.image || '');
    return { id, name: p.name, line2: p.name_line2 || '', gamme: p.gamme_label || '', price: solo.price_raw, ref: solo.original_price_raw, img: `${SITE}/${img}`, url: `${SITE}/produits/${id}?utm_source=email&utm_medium=email` };
  }

  /* ---------- gabarit ---------- */
  const C = { ink: '#2a0f18', berry: '#7a2443', rose: '#f8ece9', gold: '#b88a5a', text: '#3b2a31', mid: '#7a6870' };
  function inline(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<b style="color:' + C.ink + '">$1</b>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, (m, t, u) => `<a href="${u.startsWith('/') ? SITE + u : u}" style="color:${C.berry};text-decoration:underline">${t}</a>`);
  }
  function bodyHTML(text, r) {
    const name = r && r.name ? cap(r.name) : '';
    return String(text || '').replace(/\r/g, '').split(/\n{2,}/).map(b => b.trim()).filter(Boolean).map(b => {
      if (b === '[[concours]]') return r && r.segs && (r.segs.includes('concours') || r.segs.includes('concours_tous')) ? `<tr><td style="padding:0 44px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.rose};border-left:3px solid ${C.gold}"><tr><td style="padding:16px 20px;font:15px/1.6 Georgia,'Times New Roman',serif;color:${C.text}">✦ Merci d'avoir participé à notre jeu-concours. Le tirage au sort a lieu dans les 7 jours : chaque personne gagnante sera prévenue personnellement par e-mail.</td></tr></table></td></tr>` : '';
      b = b.replace(/\{prenom\}/g, name).replace(/ +,/g, ',').replace(/ {2,}/g, ' ');
      if (/^## /.test(b)) return `<tr><td style="padding:10px 44px 8px;font:400 22px/1.3 Georgia,'Times New Roman',serif;color:${C.ink}">${inline(b.slice(3))}</td></tr>`;
      if (/^- /m.test(b) && b.split('\n').every(l => /^- /.test(l))) return `<tr><td style="padding:0 44px 16px">${b.split('\n').map(l => `<p style="margin:0 0 8px;font:16px/1.65 Georgia,'Times New Roman',serif;color:${C.text}"><span style="color:${C.gold}">✦</span>&nbsp; ${inline(l.slice(2))}</p>`).join('')}</td></tr>`;
      return `<tr><td style="padding:0 44px 16px;font:16px/1.7 Georgia,'Times New Roman',serif;color:${C.text}">${inline(b).replace(/\n/g, '<br>')}</td></tr>`;
    }).join('');
  }
  function button(label, url) {
    return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:8px auto 6px"><tr><td style="background:${C.ink};border:1px solid ${C.gold}"><a href="${esc(url)}" style="display:inline-block;padding:17px 36px;font:700 12px/1 Arial,Helvetica,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#f6e4d6;text-decoration:none">${esc(label)}</a></td></tr></table>`;
  }
  function tilesHTML(ids) {
    const t = (ids || []).map(tile).filter(Boolean).slice(0, 3); if (!t.length) return '';
    const w = Math.floor(100 / t.length);
    return `<tr><td style="padding:14px 30px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${t.map(p => {
      const off = p.ref > p.price ? Math.floor((1 - p.price / p.ref) * 100) : 0;
      return `<td width="${w}%" valign="top" style="padding:0 7px"><a href="${p.url}" style="text-decoration:none;color:${C.ink}"><img src="${p.img}" width="166" alt="${esc(p.name + ' ' + p.line2)}" style="display:block;width:100%;max-width:166px;height:auto;border:0;margin:0 auto"><p style="margin:12px 0 3px;font:700 9.5px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:${C.gold}">${esc(p.gamme.replace(/^Gamme /, ''))}</p><p style="margin:0 0 6px;font:15px/1.3 Georgia,'Times New Roman',serif;color:${C.ink}">${esc(p.name)}<br>${esc(p.line2)}</p><p style="margin:0;font:15px Georgia,'Times New Roman',serif;color:${C.ink}">${p.price ? euro(p.price) : ''}${off ? ` <s style="color:${C.mid};font-size:12px">${euro(p.ref)}</s> <span style="font:700 11px Arial,sans-serif;color:${C.berry}">−${off} %</span>` : ''}</p></a></td>`;
    }).join('')}</tr></table></td></tr>`;
  }
  /* lignes d'un panier (relance) : visuel, nom, quantité, prix actuel */
  function cartHTML(lines) {
    const tot = lines.reduce((t, l) => t + l.price * l.qty, 0);
    return `<tr><td class="px" style="padding:6px 44px 22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ecdcd8">${lines.map(l => `<tr><td width="76" style="padding:16px 0;border-bottom:1px solid #ecdcd8;vertical-align:middle"><img src="${SITE}/${esc(l.img)}" width="64" alt="" style="display:block;width:64px;height:auto;border:0"></td><td style="padding:16px 14px;border-bottom:1px solid #ecdcd8;vertical-align:middle;font:15px/1.35 Georgia,'Times New Roman',serif;color:${C.ink}">${esc(l.name)}${l.qty > 1 ? `<br><span style="font:12px Arial,Helvetica,sans-serif;color:${C.mid}">Quantité : ${l.qty}</span>` : ''}</td><td align="right" style="padding:16px 0;border-bottom:1px solid #ecdcd8;vertical-align:middle;white-space:nowrap;font:15px Georgia,'Times New Roman',serif;color:${C.ink}">${euro(l.price * l.qty)}</td></tr>`).join('')}<tr><td colspan="2" style="padding:14px 0 0;font:700 10.5px Arial,Helvetica,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:${C.mid}">Votre panier</td><td align="right" style="padding:14px 0 0;font:18px Georgia,'Times New Roman',serif;color:${C.ink}">${euro(tot)}</td></tr></table></td></tr>`;
  }
  const GIFTS = `<tr><td style="padding:18px 30px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ecdcd8;border-bottom:1px solid #ecdcd8"><tr>${[['Bombe de bain', 'offerte avec votre commande'], ['Livraison offerte', 'dès 49 € d\'achat'], ['Éclats Privilège', 'à chaque commande']].map(g => `<td width="33%" align="center" valign="top" style="padding:18px 6px"><p style="margin:0 0 4px;font:18px Georgia,serif;color:${C.gold}">✦</p><p style="margin:0;font:15px/1.3 Georgia,'Times New Roman',serif;color:${C.ink}">${g[0]}</p><p style="margin:3px 0 0;font:12px/1.4 Arial,Helvetica,sans-serif;color:${C.mid}">${g[1]}</p></td>`).join('')}</tr></table></td></tr>`;

  const WHY = {
    newsletter: 'vous avez rejoint la lettre Onaé', concours: 'vous avez demandé à recevoir l\'annonce de l\'ouverture lors du jeu-concours',
    concours_tous: 'vous avez participé au jeu-concours Onaé', privilege: 'vous êtes membre Onaé Privilège', comptes: 'vous avez accepté de recevoir nos offres depuis votre compte',
    makeup: 'vous avez rejoint la liste d\'attente Onaé Makeup', homme: 'vous avez rejoint la liste d\'attente Onaé Homme',
  };
  /* f = { subject, preheader, kicker, title, body, cta, url, hero, products:[ids], gifts:bool } ; r = destinataire { email, name, segs } */
  function render(f, r, opt) {
    opt = opt || {}; r = r || { email: 'vous@exemple.fr', name: 'Camille', segs: ['newsletter', 'concours'] };
    const hero = f.hero === 'ouverture' ? `${SITE}/email-ouverture.jpg` : (/^https?:\/\//.test(f.hero || '') ? f.hero : (f.hero ? `${SITE}/${String(f.hero).replace(/^\//, '')}` : ''));
    const url = f.url ? (f.url.startsWith('/') ? SITE + f.url : f.url) : SITE + '/';
    const why = opt.transactional ? (opt.why || '') : `Vous recevez cet e-mail car ${WHY[(r.segs || [])[0]] || 'vous avez laissé votre adresse sur onaecosmetics.fr'}.`;
    const un = opt.noUnsub ? '' : `<a href="${unsubUrl(r.email)}" style="color:${C.mid};text-decoration:underline">Se désinscrire</a>`;
    const pre = esc(f.preheader || '');
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(f.subject)}</title>
<style>@media (max-width:620px){.wrap{width:100%!important}.px{padding-left:24px!important;padding-right:24px!important}.ttl{font-size:28px!important}.tg{letter-spacing:.22em!important;font-size:8px!important}.cd{font-size:24px!important;letter-spacing:.04em!important}.cdb{padding:16px 18px!important}}a{text-decoration:none}</style></head>
<body style="margin:0;padding:0;background:#efe4e0;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${pre}${'&#8199;&#847; '.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efe4e0"><tr><td align="center" style="padding:24px 10px">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#fffaf8">
<tr><td align="center" style="background:${C.ink};padding:30px 20px 26px"><a href="${SITE}/?utm_source=email&utm_medium=email"><img src="${SITE}/email-logo-clair.png" width="150" alt="Onaé Paris" style="display:block;width:150px;height:auto;border:0"></a><p class="tg" style="margin:12px 0 0;white-space:nowrap;font:700 9px/1 Arial,Helvetica,sans-serif;letter-spacing:.42em;color:${C.gold};text-transform:uppercase">Paris · Soins visage, regard &amp; cheveux</p></td></tr>
${hero ? `<tr><td style="background:${C.ink};line-height:0"><a href="${esc(url)}"><img src="${esc(hero)}" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0"></a></td></tr>` : ''}
<tr><td class="px" align="center" style="padding:42px 44px 10px">${f.kicker ? `<p style="margin:0 0 14px;font:700 10.5px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.32em;text-transform:uppercase;color:${C.gold}">${esc(f.kicker)}</p>` : ''}<h1 class="ttl" style="margin:0 0 8px;font:400 34px/1.2 Georgia,'Times New Roman',serif;color:${C.ink}">${inline(f.title || '')}</h1><p style="margin:16px auto 6px;width:46px;border-top:1px solid ${C.gold};font-size:0;line-height:0">&nbsp;</p></td></tr>
<tr><td style="padding:16px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${bodyHTML(f.body, r)}</table></td></tr>
${f.code ? `<tr><td align="center" style="padding:4px 44px 22px"><table role="presentation" cellpadding="0" cellspacing="0" style="border:1px dashed ${C.gold};background:${C.rose}"><tr><td class="cdb" align="center" style="padding:18px 34px"><p style="margin:0 0 6px;font:700 10px Arial,sans-serif;letter-spacing:.3em;text-transform:uppercase;color:${C.mid}">Votre code personnel</p><p class="cd" style="margin:0;white-space:nowrap;font:400 30px/1.1 Georgia,'Times New Roman',serif;letter-spacing:.12em;color:${C.ink}">${esc(f.code)}</p>${f.codeNote ? `<p style="margin:8px 0 0;font:12px Arial,sans-serif;color:${C.mid}">${esc(f.codeNote)}</p>` : ''}</td></tr></table></td></tr>` : ''}
${f.cart && f.cart.length ? cartHTML(f.cart) : ''}
${f.cta ? `<tr><td align="center" style="padding:10px 44px 26px">${button(f.cta, url)}</td></tr>` : ''}
${tilesHTML(f.products)}
${f.gifts ? GIFTS : ''}
<tr><td class="px" align="center" style="padding:30px 44px 34px;font:italic 17px/1.5 Georgia,'Times New Roman',serif;color:${C.berry}">« Votre peau n'a pas besoin de plus,<br>elle a besoin de mieux. »<p style="margin:12px 0 0;font:700 10px Arial,sans-serif;letter-spacing:.3em;font-style:normal;text-transform:uppercase;color:${C.gold}">L'équipe Onaé</p></td></tr>
<tr><td align="center" style="background:${C.rose};padding:26px 30px 30px;font:12px/1.7 Arial,Helvetica,sans-serif;color:${C.mid}">
<p style="margin:0 0 10px"><a href="${SITE}/soins-visage.html" style="color:${C.ink}">Soins visage</a> &nbsp;·&nbsp; <a href="${SITE}/soins-yeux.html" style="color:${C.ink}">Regard</a> &nbsp;·&nbsp; <a href="${SITE}/soins-cheveux.html" style="color:${C.ink}">Cheveux</a> &nbsp;·&nbsp; <a href="${SITE}/bar-a-routines.html" style="color:${C.ink}">Bar à routines</a></p>
<p style="margin:0 0 8px">Onaé Cosmetics · Marque élaborée en France · <a href="mailto:contact@onaecosmetics.fr" style="color:${C.mid}">contact@onaecosmetics.fr</a><br>Livraison en Europe, au Royaume-Uni, aux États-Unis, à Hong Kong et en Norvège.</p>
<p style="margin:0">${esc(why)}${why && un ? ' ' : ''}${un}</p></td></tr>
</table></td></tr></table></body></html>`;
    const text = [f.title, '', ...String(f.body || '').replace(/\[\[concours\]\]/g, r.segs && (r.segs.includes('concours') || r.segs.includes('concours_tous')) ? "Merci d'avoir participé à notre jeu-concours : le tirage au sort a lieu dans les 7 jours, chaque personne gagnante sera prévenue par e-mail." : '').replace(/\{prenom\}/g, r.name ? cap(r.name) : '').replace(/ +,/g, ',').replace(/\*\*/g, '').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)').split(/\n{2,}/), f.code ? 'Votre code : ' + f.code : '', f.cta ? `${f.cta} : ${url}` : '', '', "L'équipe Onaé", 'contact@onaecosmetics.fr', opt.noUnsub ? '' : 'Se désinscrire : ' + unsubUrl(r.email)].join('\n').replace(/\n{3,}/g, '\n\n');
    return { subject: f.subject, html, text };
  }

  /* ---------- e-mails de bienvenue « premium » (lettre, code −10 %, Privilège, compte) ----------
     Inspiré des meilleurs e-mails de marque : grand titre encadré, sceau, bloc « votre cadeau », photo plein cadre,
     avantages en icônes, produit star, résultats semaine après semaine (vrais chiffres du test d'usage), aide.
     Visuels : email-w-*.jpg|png (scratchpad/email/gen-assets.js). */
  const W = { ink: '#2a0f18', berry: '#7a2443', rose: '#c9556e', blush: '#f7e3e0', blush2: '#fbefec', cream: '#fffaf8', gold: '#b88a5a', gold2: '#e8cba0', text: '#3b2a31', mid: '#7a6870' };
  const SERIF = "Georgia,'Times New Roman',serif", SANS = 'Arial,Helvetica,sans-serif';
  const hl = t => `<span style="background:#f4c9d0;color:${W.ink};padding:0 4px">${t}</span>`;   // « surligneur » rose
  const utm = (u, c) => (u.startsWith('/') ? SITE + u : u) + (u.includes('?') ? '&' : '?') + `utm_source=email&utm_medium=email&utm_campaign=${c}`;
  function wBtn(label, url, ghost) {
    return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto"><tr><td style="border-radius:40px;background:${ghost ? 'transparent' : W.ink};border:1.5px solid ${W.ink}"><a class="wbtn" href="${esc(url)}" style="display:inline-block;padding:17px 38px;border-radius:40px;white-space:nowrap;font:700 12px/1 ${SANS};letter-spacing:.2em;text-transform:uppercase;color:${ghost ? W.ink : '#f6e4d6'};text-decoration:none">${esc(label)}</a></td></tr></table>`;
  }
  const corner = (b) => `<td width="22" height="22" style="width:22px;height:22px;font-size:0;line-height:0;${b}">&nbsp;</td>`;
  function wCard(label, inner) {   /* carte à ombre décalée (fonctionne dans tous les logiciels de messagerie) */
    return `<tr><td class="wpx" style="background:${W.blush};padding:6px 40px 42px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1.5px solid ${W.ink};border-right:7px solid ${W.ink};border-bottom:7px solid ${W.ink}">
<tr><td style="background:${W.blush};border-bottom:1.5px solid ${W.ink};padding:11px 20px;font:700 11px/1.3 ${SANS};letter-spacing:.24em;text-transform:uppercase;color:${W.ink}">✦&nbsp; ${label}</td></tr>
<tr><td style="padding:28px 26px 30px">${inner}</td></tr></table></td></tr>`;
  }
  function wTiles(ids, c) {
    const t = ids.map(tile).filter(Boolean); if (!t.length) return '';
    return `<tr><td class="wpx" style="padding:0 28px 10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${t.map(p => {
      const off = p.ref > p.price ? Math.floor((1 - p.price / p.ref) * 100) : 0;
      return `<td class="wst" width="33%" valign="top" style="padding:0 8px 22px"><a href="${p.url}&utm_campaign=${c}" style="text-decoration:none;color:${W.ink}"><img src="${p.img}" width="164" alt="${esc(p.name + ' ' + p.line2)}" style="display:block;width:100%;max-width:240px;height:auto;border:0;margin:0 auto;border-radius:14px"><p style="margin:12px 0 3px;font:700 9.5px/1.4 ${SANS};letter-spacing:.18em;text-transform:uppercase;color:${W.gold}">${esc(p.gamme.replace(/^Gamme /, ''))}</p><p style="margin:0 0 6px;font:15px/1.3 ${SERIF};color:${W.ink}">${esc(p.name)}<br>${esc(p.line2)}</p><p style="margin:0;font:15px ${SERIF};color:${W.ink}">${p.price ? euro(p.price) : ''}${off ? ` <s style="color:${W.mid};font-size:12px">${euro(p.ref)}</s> <span style="font:700 11px ${SANS};color:${W.rose}">−${off} %</span>` : ''}</p></a></td>`;
    }).join('')}</tr></table></td></tr>`;
  }
  /* w = { subject, preheader, t1, t2, intro(html), card:{label, html}, camp } ; r = { email, name } */
  function renderWelcome(w, r, opt) {
    opt = opt || {}; r = r || { email: 'vous@exemple.fr', name: 'Camille' };
    const name = r.name ? cap(r.name) : '', c = w.camp || 'bienvenue';
    const star = tile('serum-anti-age-peptides') || {}, starOff = star.ref > star.price ? Math.floor((1 - star.price / star.ref) * 100) : 0;
    const eff = ((products().find(p => p.id === 'serum-anti-age-peptides') || {}).efficacy || {}).stats || [];
    const why = opt.why || `Vous recevez cet e-mail car ${WHY[opt.seg || 'newsletter']}.`;
    const un = opt.noUnsub ? '' : ` <a href="${unsubUrl(r.email)}" style="color:${W.mid};text-decoration:underline">Se désinscrire</a>`;
    const intro = String(w.intro || '').replace(/\{prenom\}/g, name ? ' ' + esc(name) : '').replace(/ +,/g, ',');
    const step = (tag, pct, title, txt) => `<tr><td style="padding:0 0 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1.5px solid ${W.ink};border-right:5px solid ${W.ink};border-bottom:5px solid ${W.ink}">
<tr><td style="background:${W.ink};padding:10px 18px;font:700 11px/1.3 ${SANS};letter-spacing:.22em;text-transform:uppercase;color:${W.gold2}">${tag}</td></tr>
<tr><td style="padding:18px 20px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${pct ? `<td width="92" valign="top" style="font:400 38px/1 ${SERIF};color:${W.rose};white-space:nowrap">${pct}<span style="font-size:20px">&nbsp;%</span></td>` : ''}<td valign="top" style="font:15px/1.6 ${SERIF};color:${W.text}"><b style="color:${W.ink}">${title}</b><br>${txt}</td></tr></table></td></tr></table></td></tr>`;
    const perk = (img, t, s) => `<td class="wperk" width="33%" align="center" valign="top" style="padding:0 6px 22px"><img src="${SITE}/${img}" width="60" height="60" alt="" style="display:block;width:60px;height:60px;border:0;margin:0 auto 12px"><p style="margin:0 0 4px;font:700 11px/1.4 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${W.ink}">${hl(t)}</p><p style="margin:0;font:13px/1.5 ${SANS};color:${W.mid}">${s}</p></td>`;
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(w.subject)}</title>
<style>@media (max-width:620px){.wrap{width:100%!important}.wpx{padding-left:20px!important;padding-right:20px!important}.wst{display:block!important;width:100%!important;box-sizing:border-box}.wt1{font-size:32px!important}.wt2{font-size:34px!important}.wseal{width:78px!important;height:78px!important}.wbtn{padding:15px 22px!important;letter-spacing:.12em!important}.wtop{font-size:9px!important;letter-spacing:.12em!important}.wcrn{padding:2px 0!important}.wsealtd{width:80px!important}.wkick{letter-spacing:.18em!important;font-size:9.5px!important}.wperk{padding:0 2px 18px!important}.wperk p{font-size:11.5px!important;letter-spacing:.04em!important}.wh2{font-size:30px!important}.wcd{font-size:26px!important;letter-spacing:.06em!important}}a{text-decoration:none}</style></head>
<body style="margin:0;padding:0;background:#efe4e0;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(w.preheader || '')}${'&#8199;&#847; '.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efe4e0"><tr><td align="center" style="padding:22px 8px">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:${W.cream}">
<tr><td class="wtop" align="center" style="background:${W.berry};padding:10px 16px;font:700 10px/1.5 ${SANS};letter-spacing:.2em;text-transform:uppercase;color:${W.gold2}">Livraison offerte dès 49 € &nbsp;✦&nbsp; Bombe de bain offerte</td></tr>
<tr><td align="center" style="background:${W.ink};padding:28px 20px 24px"><a href="${utm('/', c)}"><img src="${SITE}/email-logo-clair.png" width="140" alt="Onaé Paris" style="display:block;width:140px;height:auto;border:0"></a></td></tr>

<tr><td style="background:${W.blush};padding:38px 30px 34px" class="wpx">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${corner(`border-top:2px solid ${W.gold};border-left:2px solid ${W.gold}`)}<td></td>${corner(`border-top:2px solid ${W.gold};border-right:2px solid ${W.gold}`)}</tr>
<tr><td></td><td class="wcrn" style="padding:6px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td valign="middle"><p class="wkick" style="margin:0 0 10px;font:700 10.5px/1.4 ${SANS};letter-spacing:.3em;text-transform:uppercase;color:${W.berry}">${esc(w.kicker || 'Bienvenue chez Onaé')}</p>
<p class="wt1" style="margin:0;font:400 46px/1.02 ${SERIF};color:${W.ink}">${esc(w.t1).replace(/ (%)/g, '&nbsp;$1').replace(/^(\S+) (−)/, '$1&nbsp;$2')}</p><p class="wt2" style="margin:2px 0 0;font:italic 400 48px/1.05 ${SERIF};color:${W.rose}">${esc(w.t2)}</p></td>
<td class="wsealtd" width="120" valign="middle" align="right"><img class="wseal" src="${SITE}/email-w-seal.png" width="120" height="120" alt="Vous êtes des nôtres" style="display:block;width:120px;height:120px;border:0"></td></tr></table></td><td></td></tr>
<tr>${corner(`border-bottom:2px solid ${W.gold};border-left:2px solid ${W.gold}`)}<td></td>${corner(`border-bottom:2px solid ${W.gold};border-right:2px solid ${W.gold}`)}</tr></table>
<p style="margin:26px 4px 0;font:17px/1.7 ${SERIF};color:${W.text}">${intro}</p></td></tr>

${wCard(w.card.label, w.card.html)}

<tr><td style="line-height:0;background:${W.ink}"><a href="${utm('/routine-peptides.html', c)}"><img src="${SITE}/email-w-hero.jpg" width="600" alt="Le rituel Onaé aux peptides" style="display:block;width:100%;max-width:600px;height:auto;border:0"></a></td></tr>
<tr><td align="center" style="background:${W.ink};padding:26px 34px 30px"><p style="margin:0;font:italic 23px/1.45 ${SERIF};color:#fff">Trois soins. Trois gestes. Trois minutes.</p><p style="margin:8px 0 0;font:15px/1.6 ${SERIF};color:${W.gold2}">Le rituel qui apaise les marques du stress, matin et soir.</p></td></tr>

<tr><td class="wpx" align="center" style="padding:44px 30px 18px"><p class="wh2" style="margin:0 0 30px;font:400 34px/1.15 ${SERIF};color:${W.ink}">Chez Onaé, vous profitez<br><i style="color:${W.rose}">toujours</i> de :</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
${perk('email-w-ico-ship.png', 'Livraison offerte', 'dès 49 € d\'achat,<br>partout en Europe')}
${perk('email-w-ico-gift.png', 'Bombe de bain', 'offerte dans<br>chaque commande')}
${perk('email-w-ico-guide.png', 'Guide Beauté', '30 pages offertes<br>dès la 1re commande')}
</tr></table></td></tr>

<tr><td style="background:${W.blush2};padding:0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td class="wst" width="50%" style="line-height:0"><a href="${star.url ? star.url + '&utm_campaign=' + c : utm('/', c)}"><img src="${SITE}/email-w-main.jpg" width="300" alt="Le Sérum Anti-âge aux Peptides" style="display:block;width:100%;height:auto;border:0"></a></td>
<td class="wst wpx" width="50%" valign="middle" style="padding:30px 28px"><p style="margin:0 0 10px;font:700 10.5px/1.4 ${SANS};letter-spacing:.28em;text-transform:uppercase;color:${W.gold}">Notre n°1 ✦ le soin signature</p>
<p style="margin:0 0 12px;font:400 27px/1.15 ${SERIF};color:${W.ink}">Le Sérum Anti-âge<br><i style="color:${W.rose}">aux Peptides</i></p>
<p style="margin:0 0 16px;font:15px/1.6 ${SERIF};color:${W.text}">Une texture qui fond, une peau qui paraît plus lisse, plus repulpée, plus reposée. Celui par lequel tout commence.</p>
<p style="margin:0 0 20px;font:22px ${SERIF};color:${W.ink}">${star.price ? euro(star.price) : ''}${starOff ? ` <s style="font-size:14px;color:${W.mid}">${euro(star.ref)}</s> <span style="font:700 12px ${SANS};color:${W.rose}">−${starOff} %</span>` : ''}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:40px;background:${W.ink}"><a href="${star.url ? star.url + '&utm_campaign=' + c : utm('/', c)}" style="display:inline-block;padding:14px 26px;border-radius:40px;font:700 11px/1 ${SANS};letter-spacing:.18em;text-transform:uppercase;color:#f6e4d6">Je le découvre</a></td></tr></table></td></tr></table></td></tr>

<tr><td class="wpx" style="padding:46px 40px 10px"><p style="margin:0 0 6px;font:700 10.5px/1.4 ${SANS};letter-spacing:.28em;text-transform:uppercase;color:${W.gold}">Votre rituel, en vrai</p>
<p class="wh2" style="margin:0 0 12px;font:400 34px/1.15 ${SERIF};color:${W.ink}">Votre peau,<br><i style="color:${W.rose}">semaine après semaine.</i></p>
<p style="margin:0 0 26px;font:16px/1.65 ${SERIF};color:${W.text}">Rien n'arrive par hasard : chaque étape prépare la suivante. Voici ce qu'ont constaté les personnes qui ont testé le Sérum aux Peptides.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${step('Jour 1 · Le premier geste', '', 'Un moment rien qu\'à vous.', 'Une goutte, trois pressions du bout des doigts : la texture fond, la peau est souple et confortable. Le stress de la journée retombe d\'un cran.')}
${eff[0] ? step('Semaine 3 · Les premiers effets', eff[0].pct, 'Ça se voit déjà.', 'des participants au test constatent une amélioration visible de leur peau.') : ''}
${eff[2] ? step('Mois 2 · Le rituel installé', eff[2].pct, 'Une peau qui paraît plus lisse et plus ferme.', 'des participants au test constatent une amélioration visible après 2 mois de régularité.') : ''}
</table><p style="margin:4px 0 0;font:12px/1.5 ${SANS};color:${W.mid}">Résultats d'auto-évaluation du test d'usage. Les résultats peuvent varier d'une personne à l'autre.</p></td></tr>
<tr><td align="center" style="padding:26px 40px 40px">${wBtn('Découvrir le rituel', utm('/routine-peptides.html', c))}</td></tr>

<tr><td class="wpx" align="center" style="padding:6px 30px 8px"><p style="margin:0 0 24px;font:400 30px/1.2 ${SERIF};color:${W.ink}">Les <i style="color:${W.rose}">chouchous</i> du moment</p></td></tr>
${wTiles(['serum-gelee-prebiotiques', 'creme-anti-age-peptides', 'patchs-yeux-hydrogel-anti-fatigue'], c)}

<tr><td class="wpx" style="background:${W.blush};padding:44px 40px 46px"><p class="wh2" style="margin:0 0 14px;font:400 36px/1.12 ${SERIF};color:${W.ink}">On est là<br>${hl('pour vous.')}</p>
<p style="margin:0 0 26px;font:16px/1.7 ${SERIF};color:${W.text}">Vous hésitez entre deux soins, vous voulez savoir par où commencer ? Répondez simplement à cet e-mail : une vraie personne de l'équipe vous répond. Ou laissez-vous guider en 2 minutes.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td class="wst" style="padding:0 10px 10px 0">${wBtn('Faire mon diagnostic', utm('/diagnostic.html', c))}</td><td class="wst" style="padding:0 0 10px">${wBtn('Nous écrire', 'mailto:contact@onaecosmetics.fr', true)}</td></tr></table></td></tr>

<tr><td align="center" style="padding:34px 40px 32px;font:italic 18px/1.5 ${SERIF};color:${W.berry}">« Votre peau n'a pas besoin de plus,<br>elle a besoin de mieux. »<p style="margin:12px 0 0;font:700 10px ${SANS};letter-spacing:.3em;font-style:normal;text-transform:uppercase;color:${W.gold}">L'équipe Onaé</p></td></tr>
<tr><td align="center" style="background:${W.ink};padding:26px 30px 30px;font:12px/1.7 ${SANS};color:#c9b3b9">
<p style="margin:0 0 10px"><a href="${utm('/soins-visage.html', c)}" style="color:#fff">Visage</a> &nbsp;·&nbsp; <a href="${utm('/soins-yeux.html', c)}" style="color:#fff">Regard</a> &nbsp;·&nbsp; <a href="${utm('/soins-cheveux.html', c)}" style="color:#fff">Cheveux</a> &nbsp;·&nbsp; <a href="${utm('/bar-a-routines.html', c)}" style="color:#fff">Bar à routines</a></p>
<p style="margin:0 0 8px">Onaé Cosmetics · Marque élaborée en France · <a href="mailto:contact@onaecosmetics.fr" style="color:#c9b3b9">contact@onaecosmetics.fr</a></p>
<p style="margin:0">${esc(why)}${un}</p></td></tr>
</table></td></tr></table></body></html>`;
    const text = [`${w.t1} ${w.t2}`, '', intro.replace(/<[^>]+>/g, ''), '', w.card.text || '', '', 'Découvrir la boutique : ' + utm('/', c), 'Faire mon diagnostic : ' + utm('/diagnostic.html', c), '', "L'équipe Onaé · contact@onaecosmetics.fr", opt.noUnsub ? '' : 'Se désinscrire : ' + unsubUrl(r.email)].join('\n');
    return { subject: w.subject, html, text };
  }
  const untilOf = v => v.expires ? new Date(v.expires).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long' }) : '';
  function codeCard(v, camp) {
    const until = untilOf(v);
    return { label: 'Votre code personnel', text: `Votre code : ${v.code}${until ? ` (valable jusqu'au ${until})` : ''}`, html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="border:2px dashed ${W.rose};background:${W.blush2};padding:22px 12px">
<p style="margin:0 0 8px;font:700 10px ${SANS};letter-spacing:.3em;text-transform:uppercase;color:${W.mid}">−${v.percent || 10} % · 1re commande</p>
<p class="wcd" style="margin:0;font:400 36px/1.1 ${SERIF};letter-spacing:.14em;color:${W.ink};white-space:nowrap">${esc(v.code)}</p>
<p style="margin:10px 0 0;font:12.5px/1.5 ${SANS};color:${W.mid}">${until ? `Valable jusqu'au ${until}` : 'Valable 7 jours'} · hors routine sur mesure (déjà à −20 %)</p></td></tr></table>
<p style="margin:22px 0 0">${wBtn(`J'en profite maintenant`, utm('/?code=' + encodeURIComponent(v.code), camp))}</p>` };
  }
  /* contenu propre à chaque e-mail de bienvenue */
  const WELCOME = {
    newsletter: (v, n) => ({ camp: 'bienvenue', subject: v.code ? (n ? `${n}, bienvenue ✦ votre −${v.percent || 10} % vous attend` : `Bienvenue ✦ votre −${v.percent || 10} % vous attend`) : (n ? `${n}, vous êtes des nôtres ✦` : 'Vous êtes des nôtres ✦'),
      preheader: v.code ? `Votre code ${v.code} : −${v.percent || 10} % sur votre première commande, activé en un clic.` : 'Bienvenue dans la Maison Onaé : votre rituel −20 % vous attend, la bombe de bain est offerte.',
      t1: 'Vous êtes', t2: 'des nôtres.',
      intro: `Bonjour{prenom}, bienvenue dans la Maison Onaé. Ici, pas de routine en douze étapes : ${hl('juste ce qui fait du bien à votre peau')}, et des soins pensés contre les marques du stress.${v.code ? ` Pour fêter votre arrivée, voici <b style="color:${W.ink}">−${v.percent || 10} % sur votre première commande</b>, en plus des prix déjà remisés.` : ' Vous recevrez nos conseils, nos nouveautés en avant-première et des offres réservées au cercle.'}`,
      card: v.code ? codeCard(v, 'bienvenue') : { label: 'Votre premier rituel', text: 'Composez votre routine de 3 soins au Bar à routines : −20 % sur la routine complète.', html: `<p style="margin:0 0 6px;font:400 26px/1.2 ${SERIF};color:${W.ink}">Composez votre routine,<br><i style="color:${W.rose}">−20 % sur les 3 soins.</i></p>
<p style="margin:12px 0 22px;font:15px/1.65 ${SERIF};color:${W.text}">Au Bar à routines, choisissez 3 soins qui vous ressemblent : nous les rangeons dans le bon ordre et votre routine complète est à −20 %. Bombe de bain offerte, livraison offerte dès 49 €.</p>
${wBtn('Je compose ma routine', utm('/bar-a-routines.html', 'bienvenue'))}` } }),
    code: (v, n) => {
      const until = untilOf(v);
      return { camp: 'code-bienvenue', subject: n ? `${n}, votre −${v.percent || 10} % vous attend ✦` : `Votre −${v.percent || 10} % vous attend ✦`, preheader: `Votre code ${v.code} s'applique tout seul en un clic${until ? `, jusqu'au ${until}` : ''}.`,
        kicker: 'Votre cadeau de bienvenue', t1: `Votre −${v.percent || 10} %`, t2: 'vous attend.',
        intro: `Bonjour{prenom}, comme promis, voici votre cadeau : ${hl(`−${v.percent || 10} % sur votre première commande`)}, en plus des prix déjà remisés. Un clic sur le bouton et il s'applique tout seul à votre panier.${v.loyalty ? ` Et vous êtes aussi membre Onaé Privilège : <b style="color:${W.ink}">50 éclats</b> vous attendent déjà.` : ''}`,
        card: codeCard(v, 'code-bienvenue') };
    },
    privilege: (v, n) => ({ camp: 'privilege', subject: n ? `${n}, vos 50 éclats sont arrivés ✦` : 'Vos 50 éclats sont arrivés ✦', preheader: 'Votre carte Rose est active : 100 éclats = 5 € offerts, et ils comptent double le mois de votre anniversaire.',
      kicker: 'Onaé Privilège', t1: 'Bienvenue', t2: 'dans le cercle.',
      intro: `Bonjour{prenom}, votre carte ${hl('Onaé Privilège Rose')} est active et vos 50 premiers éclats y sont déjà crédités. À chaque commande, vos soins vous rapportent de quoi vous offrir les suivants.`,
      card: { label: 'Votre carte Rose', text: '50 éclats offerts. 1 € = 1 éclat. 100 éclats = 5 €, 200 = 12 €, 400 = 30 €.', html: `<img src="${SITE}/email-w-card-rose.png" width="480" alt="Carte Onaé Privilège Rose, 50 éclats" style="display:block;width:100%;max-width:480px;height:auto;border:0;margin:-14px auto 4px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px">${[['100 éclats', '5 € offerts'], ['200 éclats', '12 € offerts'], ['400 éclats', '30 € offerts']].map(x => `<tr><td style="padding:11px 4px;border-bottom:1px solid #f0dcd8;font:15px ${SERIF};color:${W.ink}">✦&nbsp; ${x[0]}</td><td align="right" style="padding:11px 4px;border-bottom:1px solid #f0dcd8;font:700 13px ${SANS};color:${W.rose}">${x[1]}</td></tr>`).join('')}
<tr><td colspan="2" style="padding:12px 4px 0;font:13px/1.6 ${SANS};color:${W.mid}">1 € = 1 éclat, davantage aux paliers Nacre et Écrin · éclats doublés le mois de votre anniversaire.</td></tr></table>
${wBtn('Je fais grandir mes éclats', utm('/', 'privilege'))}` } }),
    compte: (v, n) => ({ camp: 'compte', subject: 'Bienvenue chez Onaé ✦ confirmez votre adresse', preheader: 'Votre espace est prêt. Une dernière étape : confirmez votre adresse (lien valable 48 h).',
      kicker: 'Votre espace Onaé', t1: 'Votre espace', t2: 'est prêt.',
      intro: `Bonjour{prenom}, bienvenue dans la Maison Onaé. Vos commandes, leur suivi et votre ${hl('Guide Beauté offert')} dès votre première commande vous attendent dans votre espace.`,
      card: { label: 'Une dernière étape', text: 'Confirmez votre adresse : ' + v.link, html: `<p style="margin:0 0 6px;font:400 25px/1.25 ${SERIF};color:${W.ink}">Confirmez votre adresse,<br><i style="color:${W.rose}">c'est tout.</i></p>
<p style="margin:12px 0 22px;font:15px/1.65 ${SERIF};color:${W.text}">Elle sécurise votre compte et y rattache vos commandes et vos éclats Onaé Privilège. Le lien est valable 48 heures.</p>
${wBtn('Confirmer mon adresse', v.link)}` } }),
  };

  /* ---------- modèles prêts à l'emploi ---------- */
  const PRESETS = {
    ouverture: {
      label: 'Ouverture de la boutique',
      subject: 'La boutique Onaé est ouverte ✦',
      preheader: 'Votre rituel commence maintenant · −10 % sur votre 1re commande · bombe de bain offerte · livraison offerte dès 49 €',
      kicker: 'L\'ouverture · Ce soir',
      title: 'La Maison Onaé vous ouvre ses portes.',
      body: `Bonjour {prenom},

Le moment que nous préparions depuis des mois est arrivé : **la boutique Onaé est ouverte.** Des soins élaborés en France, des actifs choisis pour ce qu'ils apportent vraiment à la peau, et des rituels pensés pour votre vraie vie : trois gestes, trois minutes.

[[concours]]

## Ce qui vous attend

- **Le Sérum Anti-âge aux Peptides**, notre soin signature, pour une peau qui paraît plus lisse et plus repulpée.
- **Le Bar à routines** : choisissez 3 soins qui vous ressemblent, nous les rangeons dans le bon ordre, et votre routine complète est à **−20 %**.
- **Onaé Privilège** : des éclats à chaque commande, à transformer en réductions.
- **Première commande ? −10 % en plus** sur votre première commande, qui s'ajoutent aux prix déjà remisés : votre code personnel vous attend dès votre arrivée sur le site (hors routine sur mesure du Bar, déjà à −20 %).

Pour fêter l'ouverture, chaque commande est accompagnée d'une bombe de bain offerte, et la livraison est offerte dès 49 €.`,
      cta: 'Découvrir la boutique', url: '/?utm_source=email&utm_medium=email&utm_campaign=ouverture', hero: 'ouverture',
      products: ['serum-anti-age-peptides', 'creme-anti-age-peptides', 'patchs-yeux-hydrogel-anti-fatigue'], gifts: true,
      segments: ['newsletter', 'concours', 'privilege', 'comptes'],
    },
    lettre: {
      label: 'Lettre libre (newsletter)',
      subject: '', preheader: '', kicker: 'La lettre Onaé', title: '',
      body: `Bonjour {prenom},

Votre texte ici. Une ligne vide = un nouveau paragraphe. **Gras** avec deux astérisques, [un lien](/bar-a-routines.html).

## Un intertitre

- Une liste
- à puces dorées`,
      cta: 'Découvrir', url: '/?utm_source=email&utm_medium=email', hero: '', products: [], gifts: true,
      segments: ['newsletter', 'concours', 'privilege', 'comptes'],
    },
  };

  /* ---------- e-mails automatiques à l'inscription ---------- */
  const AUTO = {
    newsletter: () => ({ subject: 'Bienvenue dans la lettre Onaé ✦', preheader: 'Conseils de soin, nouveautés et avant-premières : vous êtes des nôtres.', kicker: 'Bienvenue', title: 'Bienvenue dans le cercle Onaé.',
      body: `Bonjour {prenom},

Merci de nous rejoindre. Vous recevrez nos conseils de soin, nos nouveautés en avant-première et nos offres exclusives, sans jamais encombrer votre boîte.

## Pour bien commencer

- [Le Bar à routines](/bar-a-routines.html) : 3 soins choisis par vous, rangés dans le bon ordre, à −20 %.
- [Le diagnostic de peau](/diagnostic.html) : quelques questions pour trouver vos soins.
- [Le Journal](/blog.html) : nos conseils d'experts, ingrédient par ingrédient.`,
      cta: 'Découvrir nos soins', url: '/?utm_source=email&utm_medium=email&utm_campaign=bienvenue', hero: 'ouverture', products: ['serum-anti-age-peptides', 'creme-anti-age-peptides', 'patchs-yeux-hydrogel-anti-fatigue'], gifts: true }),
    makeup: () => ({ subject: 'Vous êtes sur la liste · Onaé Makeup ✦', preheader: 'Le lancement de la BB Crème aux Peptides vous sera annoncé en avant-première.', kicker: 'Onaé Makeup · Liste d\'attente', title: 'Vous l\'essaierez avant tout le monde.',
      body: `Bonjour {prenom},

C'est noté : vous êtes sur la liste d'attente de la **BB Crème aux Peptides**, le soin qui maquille. Le jour du lancement, vous recevrez un e-mail en avant-première, avant tout le monde.

En attendant, préparez votre peau : un teint unifié commence toujours par une peau bien soignée.`,
      cta: 'Préparer ma peau', url: '/makeup.html?utm_source=email&utm_medium=email&utm_campaign=makeup', hero: SITE + '/makeup-bb-05-1.jpg', products: ['serum-anti-age-peptides', 'creme-contour-yeux-peptides', 'creme-anti-age-peptides'], gifts: false }),
    homme: () => ({ subject: 'Vous êtes sur la liste · Onaé Homme', preheader: 'Le lancement de la Crème contour des yeux 3 en 1 vous sera annoncé en avant-première.', kicker: 'Onaé Homme · Liste d\'attente', title: 'Vous l\'essaierez avant tout le monde.',
      body: `Bonjour {prenom},

C'est noté : vous êtes sur la liste d'attente de la **Crème contour des yeux 3 en 1 pour Hommes**. Le jour du lancement, un seul e-mail, en avant-première.

En attendant, quelques soins de la Maison ont déjà trouvé leur place dans les salles de bain masculines.`,
      cta: 'Découvrir Onaé Homme', url: '/homme.html?utm_source=email&utm_medium=email&utm_campaign=homme', hero: SITE + '/homme-contour-yeux-1.jpg', products: ['serum-booster-cafeine', 'patchs-yeux-cafeine-vitamine-c', 'huile-fortifiante-romarin'], gifts: false }),
    code: (v) => ({ subject: `Votre code −${v.percent || 10} % est arrivé ✦`, preheader: `${v.code} · valable 7 jours sur votre première commande.`, kicker: 'Votre cadeau de bienvenue', title: `−${v.percent || 10} % sur votre première commande.`,
      body: `Bonjour {prenom},

Comme promis, voici votre code personnel. Il s'applique automatiquement à votre panier sur ce navigateur ; ailleurs, saisissez-le dans « Code avantage ».${v.loyalty ? `

Vous êtes aussi membre **Onaé Privilège** : **50 éclats** vous attendent déjà, et chaque commande vous en rapporte de nouveaux.` : ''}`,
      code: v.code, codeNote: `Valable 7 jours${v.expires ? `, jusqu'au ${new Date(v.expires).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long' })}` : ''} · 1re commande · hors routine sur mesure (déjà à −20 %)`,
      cta: 'Utiliser mon code', url: '/?utm_source=email&utm_medium=email&utm_campaign=code-bienvenue', hero: '', products: ['serum-anti-age-peptides', 'creme-anti-age-peptides', 'patchs-yeux-hydrogel-anti-fatigue'], gifts: true }),
    privilege: () => ({ subject: 'Bienvenue dans Onaé Privilège ✦ 50 éclats offerts', preheader: 'Vos 50 premiers éclats vous attendent. 100 éclats = 5 € offerts.', kicker: 'Onaé Privilège', title: 'Bienvenue dans le cercle. 50 éclats vous attendent.',
      body: `Bonjour {prenom},

Votre carte **Rose** est active et **50 éclats** y sont déjà crédités.

- 1 € dépensé = 1 éclat (davantage aux paliers Nacre et Écrin).
- 100 éclats = 5 € offerts, 200 = 12 €, 400 = 30 €, à utiliser directement au panier.
- Le mois de votre anniversaire, vos éclats comptent double.`,
      cta: 'Voir mes avantages', url: '/fidelite.html?utm_source=email&utm_medium=email&utm_campaign=privilege', hero: '', products: [], gifts: true }),
    concours: () => ({ subject: 'Votre participation est confirmée ✦', preheader: 'Tirage au sort dans les 7 jours après la clôture du jeu-concours.', kicker: 'Jeu-concours Onaé', title: 'Votre participation est bien enregistrée.',
      body: `Bonjour {prenom},

Merci d'avoir participé à notre jeu-concours. Le tirage au sort a lieu dans les 7 jours qui suivent sa clôture ; si votre participation est tirée au sort, nous vous préviendrons personnellement à cette adresse.

Bonne chance !`,
      cta: 'Le règlement du jeu', url: '/reglement-concours.html', hero: '', products: [], gifts: false }),
  };
  const AUTO_LABEL = { newsletter: 'Inscription à la lettre (accueil, pied de page…)', makeup: 'Liste d\'attente Onaé Makeup', homme: 'Liste d\'attente Onaé Homme', code: 'Code −10 % des pop-ups (avec Privilège si coché)', privilege: 'Adhésion Onaé Privilège (page fidélité)', concours: 'Participation au jeu-concours' };
  const TRANSAC = { code: 'Vous recevez cet e-mail car vous avez demandé votre code de bienvenue sur onaecosmetics.fr.', concours: 'Vous recevez cet e-mail car vous avez participé au jeu-concours Onaé.' };
  function autoMail(kind, email, name, vars) {
    email = norm(email); if (!AUTO[kind] || !okMail(email)) return;
    const log = read('mail-auto.json', {}), key = kind === 'code' ? `${email}|code|${(vars || {}).code}` : `${email}|${kind}`;
    if (log[key]) return;
    if (kind !== 'code' && kind !== 'concours' && unsubbed().has(email)) return;
    if (!N.canSend()) { console.log('[mailing] auto', kind, '(BREVO_API_KEY absente, non envoyé)'); return; }
    log[key] = new Date().toISOString(); try { write('mail-auto.json', log); } catch (_) {}
    const seg = { newsletter: 'newsletter', makeup: 'makeup', homme: 'homme', privilege: 'privilege' }[kind] || 'newsletter';
    const r0 = { email, name: first(name), segs: [seg] };
    const m = WELCOME[kind] ? renderWelcome(WELCOME[kind](vars || {}, cap(first(name))), r0, { seg, why: TRANSAC[kind] }) : render(AUTO[kind](vars || {}), r0, TRANSAC[kind] ? { transactional: true, why: TRANSAC[kind], noUnsub: kind === 'concours' } : {});
    N.sendMail({ ...m, to: email, headers: listHeaders(email), tags: ['auto-' + kind] }).then(ok => { if (!ok) { const l = read('mail-auto.json', {}); delete l[key]; try { write('mail-auto.json', l); } catch (_) {} } }).catch(() => {});
  }
  /* ---------- bienvenue à la création d'un compte client (avec le lien de confirmation de l'adresse) ----------
     E-mail de service : part même si l'adresse s'est désinscrite de la lettre (la confirmation protège le compte). */
  function accountWelcome(email, name, link) {
    email = norm(email); if (!okMail(email) || !N.canSend()) return Promise.resolve(false);
    const m = renderWelcome(WELCOME.compte({ link }, cap(first(name))), { email, name: first(name) }, { why: 'Vous recevez cet e-mail car vous venez de créer votre compte sur onaecosmetics.fr.', noUnsub: true });
    return N.sendMail({ ...m, to: email, tags: ['auto-compte'] }).catch(() => false);
  }

  /* ---------- rappel d'un panier laissé (envoyé à la main depuis /admin/stats, une seule fois par personne et par semaine) ---------- */
  function cartReminderMail(email, name, lines) {
    const code = lines.map(l => l.id + '*' + l.qty).join('|');
    const url = `${SITE}/panier.html?panier=${encodeURIComponent(code)}&utm_source=email&utm_medium=email&utm_campaign=relance-panier`;
    const f = {
      subject: 'Votre rituel vous attend ✦',
      preheader: 'Vos soins sont toujours dans votre panier · livraison offerte dès 49 € · bombe de bain offerte',
      kicker: 'Votre panier Onaé',
      title: 'Votre rituel vous attend.',
      body: `Bonjour {prenom},\n\nVous avez laissé quelques soins dans votre panier. Nous les avons gardés de côté : il ne reste plus qu'à finaliser votre commande, en un clic.`,
      cta: 'Retrouver mon panier', url, cart: lines, gifts: true,
    };
    return render(f, { email, name: first(name), segs: [] }, { transactional: true, why: 'Vous recevez cet e-mail car vous avez commencé une commande sur onaecosmetics.fr.' });
  }
  async function cartReminder(email, name, lines) {
    email = norm(email); if (!okMail(email) || !lines || !lines.length) return { error: 'bad_request' };
    if (unsubbed().has(email)) return { error: 'unsubscribed' };
    if (!N.canSend()) return { error: 'mail_off' };
    const m = cartReminderMail(email, name, lines);
    const ok = await N.sendMail({ ...m, to: email, toName: first(name) ? cap(first(name)) : undefined, headers: listHeaders(email), tags: ['relance-panier'] });
    return ok ? { ok: true } : { error: 'send_failed', detail: (N.sendMail.last || {}).body || '' };
  }
  const listHeaders = e => ({ 'List-Unsubscribe': `<${unsubApi(e)}>, <mailto:contact@onaecosmetics.fr?subject=D%C3%A9sinscription>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' });

  /* ---------- campagnes ---------- */
  const FIELDS = ['subject', 'preheader', 'kicker', 'title', 'body', 'cta', 'url', 'hero'];
  function cleanFields(d) {
    const f = {}; FIELDS.forEach(k => f[k] = String(d[k] ?? '').slice(0, k === 'body' ? 8000 : 300));
    f.products = (Array.isArray(d.products) ? d.products : String(d.products || '').split(',')).map(s => String(s).trim()).filter(id => products().some(p => p.id === id)).slice(0, 3);
    f.gifts = d.gifts === true || d.gifts === 'true' || d.gifts === 'on';
    return f;
  }
  const camps = () => read('campaigns.json', []);
  function saveCamp(c) { const l = camps(); const i = l.findIndex(x => x.id === c.id); if (i < 0) l.unshift(c); else l[i] = c; write('campaigns.json', l); }
  function createCampaign(d) {
    const fields = cleanFields(d.fields || {});
    if (!fields.subject.trim() || !fields.title.trim()) return { error: 'subject_title_required' };
    const segments = (d.segments || []).filter(s => SEGMENTS.some(x => x.id === s)); if (!segments.length) return { error: 'no_audience' };
    const sendAt = d.sendAt ? Date.parse(d.sendAt) : Date.now();
    if (!sendAt || sendAt < Date.now() - 60e3) return { error: 'bad_date' };
    const c = { id: 'C' + Date.now().toString(36).toUpperCase(), created: new Date().toISOString(), fields, segments, sendAt: new Date(sendAt).toISOString(), status: 'scheduled', estimate: audience(segments).list.length, recipients: null, sent: [], failed: {}, note: '' };
    saveCamp(c); setTimeout(tick, 1500); return { ok: true, campaign: summary(c) };
  }
  const summary = c => ({ id: c.id, subject: c.fields.subject, status: c.status, sendAt: c.sendAt, total: c.recipients ? c.recipients.length : c.estimate, sent: c.sent.length, failed: Object.keys(c.failed || {}).length, note: c.note, segments: c.segments, started: c.started, finished: c.finished });
  function action(id, a, at) {
    const c = camps().find(x => x.id === id); if (!c) return { error: 'not_found' };
    /* changer l'heure d'une campagne programmée, sans toucher à son contenu ni à son audience */
    if (a === 'reschedule') { const t = Date.parse(at); if (c.status !== 'scheduled' || !t) return { error: 'bad_action' }; c.sendAt = new Date(t).toISOString(); c.note = 'Heure modifiée'; saveCamp(c); return { ok: true, campaign: summary(c) }; }
    if (a === 'cancel' && ['scheduled', 'sending', 'paused'].includes(c.status)) { c.status = 'cancelled'; c.note = 'Annulée'; }
    else if (a === 'pause' && ['scheduled', 'sending'].includes(c.status)) { c.status = 'paused'; c.note = 'Mise en pause'; }
    else if (a === 'resume' && c.status === 'paused') { c.status = c.recipients ? 'sending' : 'scheduled'; c.note = ''; if (!c.recipients) c.sendAt = new Date().toISOString(); }
    else if (a === 'retry' && c.status === 'done' && Object.keys(c.failed || {}).length) { c.status = 'sending'; c.failed = {}; c.note = 'Nouvel essai des envois en échec'; }
    else return { error: 'bad_action' };
    saveCamp(c); setTimeout(tick, 500); return { ok: true, campaign: summary(c) };
  }

  /* ---------- ouverture programmée ---------- */
  const launch = () => read('launch.json', {});
  function applyLaunch() {
    const l = launch();
    if (l.openAt && Date.parse(l.openAt) <= Date.now() && process.env.PRELAUNCH === '1') {
      process.env.PRELAUNCH = '0';
      if (!l.openedAt) { l.openedAt = new Date().toISOString(); try { write('launch.json', l); } catch (_) {} console.log('[mailing] boutique ouverte (ouverture programmée)'); }
    }
  }
  function setLaunch(d) {
    const l = launch();
    if (d.action === 'open') { l.openAt = new Date().toISOString(); }
    else if (d.action === 'schedule') { const t = Date.parse(d.at); if (!t) return { error: 'bad_date' }; l.openAt = new Date(t).toISOString(); delete l.openedAt; }
    else if (d.action === 'cancel') { if (l.openedAt) return { error: 'already_open' }; delete l.openAt; }
    else return { error: 'bad_action' };
    write('launch.json', l); applyLaunch(); return { ok: true, launch: launchState() };
  }
  const launchState = () => { const l = launch(); return { prelaunchEnv: process.env.PRELAUNCH_ENV === '1', open: process.env.PRELAUNCH !== '1', openAt: l.openAt || null, openedAt: l.openedAt || null }; };

  /* ---------- moteur d'envoi (par lots, reprise après redémarrage) ---------- */
  let busy = false;
  async function tick() {
    applyLaunch();
    if (busy || !N.canSend()) return; busy = true;
    try {
      const c = camps().find(x => (x.status === 'scheduled' && Date.parse(x.sendAt) <= Date.now()) || x.status === 'sending');
      if (!c) return;
      if (!c.recipients) { c.recipients = audience(c.segments).list; c.status = 'sending'; c.started = new Date().toISOString(); saveCamp(c); console.log('[mailing] campagne', c.id, 'démarrée :', c.recipients.length, 'destinataires'); }
      const done = new Set(c.sent), un = unsubbed();
      const todo = c.recipients.filter(r => !done.has(r.email) && !(c.failed || {})[r.email]).slice(0, 40);
      for (const r of todo) {
        const live = camps().find(x => x.id === c.id); if (!live || live.status !== 'sending') return;
        if (un.has(r.email)) { live.sent.push(r.email); saveCamp(live); continue; }
        const m = render(c.fields, r);
        const ok = await N.sendMail({ ...m, to: r.email, toName: r.name ? cap(r.name) : undefined, headers: listHeaders(r.email), tags: ['campagne-' + c.id] });
        const cur = camps().find(x => x.id === c.id) || c;
        if (ok) cur.sent.push(r.email);
        else {
          const last = N.sendMail.last || {};
          if ([401, 402, 403, 429].includes(last.status) || /limit|quota|credit/i.test(last.body || '')) {
            cur.status = 'paused'; cur.note = last.status === 401 ? 'Clé d\'envoi refusée : vérifiez BREVO_API_KEY.' : last.status === 403 ? 'Expéditeur contact@onaecosmetics.fr pas encore validé dans Brevo (ou compte suspendu).' : 'Quota d\'envoi atteint : reprise automatique dans 1 heure.';
            cur.retryAt = Date.now() + 3600e3; saveCamp(cur); console.error('[mailing] campagne', c.id, 'en pause :', cur.note); return;
          }
          cur.failed = cur.failed || {}; cur.failed[r.email] = String(last.status || 'erreur');
        }
        saveCamp(cur);
        await new Promise(res => setTimeout(res, N.providerLabel() === 'Resend' ? 550 : 120));
      }
      const fin = camps().find(x => x.id === c.id);
      if (fin && fin.status === 'sending' && fin.recipients.every(r => fin.sent.includes(r.email) || (fin.failed || {})[r.email])) { fin.status = 'done'; fin.finished = new Date().toISOString(); saveCamp(fin); console.log('[mailing] campagne', c.id, 'terminée :', fin.sent.length, 'envoyés'); }
    } catch (e) { console.error('[mailing] tick', e.message); }
    finally { busy = false; }
  }
  function autoResume() {   /* pause pour quota → reprise automatique */
    const l = camps(); let ch = false;
    l.forEach(c => { if (c.status === 'paused' && c.retryAt && c.retryAt <= Date.now()) { c.status = c.recipients ? 'sending' : 'scheduled'; c.note = 'Reprise automatique'; delete c.retryAt; ch = true; } });
    if (ch) write('campaigns.json', l);
  }
  if (process.env.PRELAUNCH === '1') process.env.PRELAUNCH_ENV = '1';
  applyLaunch();
  setInterval(() => { autoResume(); tick(); }, 15e3).unref();

  /* ---------- pages ---------- */
  function unsubPage(e, t, done) {
    const ok = okMail(norm(e)) && sigOk(e, t);
    const inner = !ok ? `<h1>Lien incomplet</h1><p>Ce lien de désinscription n'est pas valide. Écrivez-nous à <a href="mailto:contact@onaecosmetics.fr">contact@onaecosmetics.fr</a> et nous vous retirerons de la liste.</p>`
      : done === 'out' ? `<h1>C'est fait.</h1><p>L'adresse <b>${esc(norm(e))}</b> ne recevra plus nos lettres ni nos offres. Les e-mails liés à vos commandes restent envoyés.</p><form method="post"><input type="hidden" name="e" value="${esc(norm(e))}"><input type="hidden" name="t" value="${esc(t)}"><input type="hidden" name="a" value="in"><button class="ghost">C'était une erreur, me réinscrire</button></form>`
      : done === 'in' ? `<h1>Bon retour parmi nous.</h1><p>L'adresse <b>${esc(norm(e))}</b> recevra de nouveau la lettre Onaé.</p><a class="b" href="/">Retour à la boutique</a>`
      : `<h1>Se désinscrire</h1><p>Vous ne recevrez plus la lettre Onaé ni nos offres à l'adresse <b>${esc(norm(e))}</b>.</p><form method="post"><input type="hidden" name="e" value="${esc(norm(e))}"><input type="hidden" name="t" value="${esc(t)}"><input type="hidden" name="a" value="out"><button>Confirmer la désinscription</button></form><a class="l" href="/">Finalement, je reste</a>`;
    return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Désinscription · Onaé</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(80% 60% at 50% 0%,#6e1e3a 0%,#2a0f18 70%);font:16px/1.65 Georgia,'Times New Roman',serif;color:#3b2a31;box-sizing:border-box}
.c{width:min(480px,100%);background:#fffaf8;padding:46px 38px 40px;text-align:center;box-shadow:0 40px 90px -30px rgba(0,0,0,.6);outline:1px solid #b88a5a;outline-offset:-10px}
img{width:130px;margin-bottom:26px}h1{font-weight:400;font-size:30px;color:#2a0f18;margin:0 0 12px}p{margin:0 0 24px}a{color:#7a2443}
button,.b{display:inline-block;border:1px solid #b88a5a;background:#2a0f18;color:#f6e4d6;padding:16px 28px;font:700 12px Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;cursor:pointer;text-decoration:none}
button.ghost{background:none;color:#7a2443}.l{display:block;margin-top:18px;font:13px Arial,sans-serif}</style>
<div class="c"><img src="/checkout-logo-v2.png" alt="Onaé">${inner}</div></html>`;
  }

  function adminPage(A) {
    const st = audience(SEGMENTS.map(s => s.id)), def = audience();
    const L = launchState(), canSend = N.canSend();
    const fmt = iso => iso ? new Date(iso).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    const ST = { scheduled: ['Programmée', '#8a6d3b'], sending: ['Envoi en cours', '#7a2443'], paused: ['En pause', '#b0503a'], done: ['Envoyée', '#2f7a52'], cancelled: ['Annulée', '#888'] };
    const list = camps().map(summary);
    const toLocal = iso => { if (!iso) return ''; const d = new Date(iso); const p = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d); return p.replace(' ', 'T'); };
    return A.BASE + `<title>E-mails · Espace Onaé</title><style>${A.NAV_CSS}
main{max-width:1200px;margin:0 auto;padding:28px 20px 80px}h1{font-size:34px;margin:6px 0 4px}.sub{color:var(--mid);margin:0 0 24px}
.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px 24px;margin:0 0 18px}.card h2{font-size:22px;margin:0 0 6px}.card>p{color:var(--mid);margin:0 0 14px;font-size:14px}
.warn{background:#fff4ef;border:1px solid #f0cdbf;border-radius:14px;padding:14px 18px;margin:0 0 18px;font-size:14px}.warn b{color:#9a3b22}.okb{background:#effaf3;border-color:#bfe3cd}.okb b{color:#2f7a52}
.grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}@media(max-width:980px){.grid{grid-template-columns:1fr}}
label.f{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mid);margin:12px 0 6px}
input[type=text],input[type=email],input[type=datetime-local],textarea,select{width:100%;padding:11px 13px;border:1px solid var(--line);border-radius:10px;font:14px 'DM Sans',sans-serif;background:#fffdfd}textarea{min-height:260px;line-height:1.55}
.seg{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--line);font-size:14px}.seg:first-of-type{border-top:0}.seg small{display:block;color:var(--mid);font-size:12px}.seg b{margin-left:auto;font-family:'DM Serif Display',serif;font-size:20px;font-weight:400}
.tot{display:flex;justify-content:space-between;align-items:baseline;margin-top:8px;padding-top:12px;border-top:2px solid var(--ink)}.tot b{font-family:'DM Serif Display',serif;font-size:30px;font-weight:400}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:14px}.btn.ghost{background:#fff;color:var(--ink);border:1px solid var(--line)}.btn.sm{padding:9px 14px;font-size:12px}
iframe{width:100%;height:900px;border:1px solid var(--line);border-radius:14px;background:#efe4e0}
.msg{font-size:14px;color:var(--berry);min-height:20px;margin-top:8px}
table.h{width:100%;border-collapse:collapse;font-size:14px}table.h td,table.h th{padding:10px 8px;border-top:1px solid var(--line);text-align:left;vertical-align:top}table.h th{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--mid);border-top:0}
.pill{display:inline-block;padding:3px 10px;border-radius:999px;color:#fff;font-size:12px}.auto{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}.auto a{display:block;padding:12px 14px;border:1px solid var(--line);border-radius:12px;text-decoration:none;font-size:14px}.auto a span{display:block;color:var(--mid);font-size:12px}
.launch{background:linear-gradient(135deg,#2a0f18,#6e1e3a);color:#f6e4d6;border:0}.launch h2{color:#fff}.launch>p{color:#e8cfd6}.launch .btn{background:#f6e4d6;color:#2a0f18}.launch .btn.ghost{background:transparent;color:#f6e4d6;border-color:rgba(246,228,214,.4)}.launch input{background:#fff}
.state{display:inline-block;padding:5px 12px;border-radius:999px;font-size:13px;margin-bottom:10px}
</style>${A.adminNav('mail')}<main>
<h1>E-mails</h1><p class="sub">Annonce de l'ouverture, newsletters et e-mails automatiques envoyés aux inscrits.</p>
${canSend ? `<div class="warn okb"><b>Envoi activé.</b> Expéditeur : ${esc(process.env.NOTIFY_FROM || process.env.NOTIFY_EMAIL || 'contact@onaecosmetics.fr')} (${N.providerLabel()}). Formule gratuite Brevo : 300 e-mails par jour ; au-delà, l'envoi se met en pause et reprend tout seul.</div>` : `<div class="warn"><b>Envoi désactivé :</b> la variable <b>BREVO_API_KEY</b> n'est pas encore définie sur Railway. Tout est prêt (aperçus, programmation) : les campagnes programmées partiront dès que la clé sera ajoutée.</div>`}

<div class="card launch"><h2>Ouverture de la boutique</h2><p>Lève le mode pré-lancement à l'heure choisie, sans toucher à Railway. Programmez l'e-mail d'annonce à la même heure.</p>
<span class="state" style="background:${L.open ? '#2f7a52' : 'rgba(255,255,255,.14)'}">${L.open ? '● Boutique ouverte' + (L.openedAt ? ' depuis le ' + fmt(L.openedAt) : '') : L.openAt ? '◷ Ouverture programmée le ' + fmt(L.openAt) : '○ Boutique fermée (pré-lancement, tout renvoie vers /concours)'}</span>
${L.open ? '' : `<div class="row"><input type="datetime-local" id="lAt" value="${toLocal(L.openAt)}" style="max-width:260px"><button class="btn" data-l="schedule">Programmer l'ouverture</button><button class="btn ghost" data-l="open">Ouvrir maintenant</button>${L.openAt ? '<button class="btn ghost" data-l="cancel">Annuler la programmation</button>' : ''}</div>`}<div class="msg" id="lMsg" style="color:#f6e4d6"></div></div>

<div class="grid"><div>
<div class="card"><h2>Nouvelle campagne</h2><p>Partez d'un modèle, ajustez le texte, vérifiez l'aperçu, envoyez-vous un test, puis lancez ou programmez.</p>
<label class="f">Modèle</label><select id="preset">${Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${esc(p.label)}</option>`).join('')}</select>
<label class="f">Objet</label><input type="text" id="subject"><label class="f">Pré-en-tête (aperçu sous l'objet)</label><input type="text" id="preheader">
<label class="f">Surtitre</label><input type="text" id="kicker"><label class="f">Titre</label><input type="text" id="title">
<label class="f">Texte · {prenom} = prénom · **gras** · [lien](/page) · ## intertitre · - liste · [[concours]] = mot pour les participants du jeu</label><textarea id="body"></textarea>
<label class="f">Bouton</label><div class="row" style="margin:0"><input type="text" id="cta" style="flex:1" placeholder="Texte du bouton"><input type="text" id="url" style="flex:2" placeholder="/page ou https://…"></div>
<label class="f">Image d'en-tête</label><select id="hero"><option value="ouverture">Mannequin, arche (ouverture)</option><option value="">Sans image</option><option value="serum-anti-age-peptides-5.jpg">Sérum Peptides · lifestyle</option><option value="creme-anti-age-peptides-6.jpg">Crème Peptides · lifestyle</option></select>
<label class="f">Soins mis en avant (3 max)</label><select id="products" multiple size="6">${products().filter(p => !/^carte|box/.test(p.id) && p.category !== 'box').map(p => `<option value="${p.id}">${esc(p.name + ' ' + (p.name_line2 || ''))}</option>`).join('')}</select>
<label style="display:flex;gap:8px;align-items:center;margin-top:12px;font-size:14px"><input type="checkbox" id="gifts"> Bandeau cadeaux (bombe de bain · livraison dès 49 € · éclats)</label>
</div>
<div class="card"><h2>Audience</h2><p>Seules les personnes qui ont accepté de recevoir nos e-mails. Doublons et désinscrites retirés automatiquement.</p>
${SEGMENTS.map(s => `<label class="seg"><input type="checkbox" name="seg" value="${s.id}"><span>${esc(s.label)}<small>${esc(s.hint)}</small></span><b>${st.counts[s.id]}</b></label>`).join('')}
<div class="tot"><span>Destinataires uniques</span><b id="aud">${def.list.length}</b></div><p style="font-size:12px;color:var(--mid);margin:6px 0 0">${st.unsubscribed} désinscription${st.unsubscribed > 1 ? 's' : ''} au total.</p>
<label class="f">E-mail test</label><div class="row" style="margin:0"><input type="email" id="testTo" placeholder="votre adresse" style="flex:1"><button class="btn ghost" id="test">Envoyer un test</button></div>
<label class="f">Envoi</label><div class="row" style="margin:0"><input type="datetime-local" id="at" style="max-width:240px"><button class="btn" id="sched">Programmer</button><button class="btn ghost" id="now">Envoyer maintenant</button></div>
<div class="msg" id="msg"></div></div>
</div><div><div class="card" style="position:sticky;top:90px"><h2>Aperçu</h2><p>Tel que le recevra Camille, inscrite au jeu-concours (exemple).</p><iframe id="pv" title="Aperçu"></iframe></div></div></div>

<div class="card"><h2>Campagnes</h2>${list.length ? `<table class="h"><tr><th>Objet</th><th>Envoi</th><th>Statut</th><th>Progression</th><th></th></tr>${list.map(c => `<tr><td>${esc(c.subject)}<br><small style="color:var(--mid)">${c.segments.map(s => (SEGMENTS.find(x => x.id === s) || {}).label || s).join(' · ')}</small></td><td>${fmt(c.sendAt)}</td><td><span class="pill" style="background:${(ST[c.status] || ['', '#888'])[1]}">${(ST[c.status] || [c.status])[0]}</span>${c.note ? `<br><small style="color:var(--mid)">${esc(c.note)}</small>` : ''}</td><td>${c.sent} / ${c.total}${c.failed ? ` · ${c.failed} échec${c.failed > 1 ? 's' : ''}` : ''}</td><td>${['scheduled', 'sending'].includes(c.status) ? `<button class="btn ghost sm" data-a="pause" data-id="${c.id}">Pause</button> ` : ''}${c.status === 'paused' ? `<button class="btn ghost sm" data-a="resume" data-id="${c.id}">Reprendre</button> ` : ''}${['scheduled', 'sending', 'paused'].includes(c.status) ? `<button class="btn ghost sm" data-a="cancel" data-id="${c.id}">Annuler</button>` : ''}${c.status === 'done' && c.failed ? `<button class="btn ghost sm" data-a="retry" data-id="${c.id}">Réessayer les échecs</button>` : ''}</td></tr>`).join('')}</table>` : '<p style="margin:0;color:var(--mid)">Aucune campagne pour l\'instant.</p>'}</div>

<div class="card"><h2>E-mails automatiques</h2><p>Envoyés une seule fois, juste après l'inscription${canSend ? '' : ' (dès que BREVO_API_KEY est définie)'}. Cliquez pour voir l'aperçu.</p><div class="auto">${Object.keys(AUTO).map(k => `<a href="/admin/emails/apercu?k=${k}" target="_blank">${esc((WELCOME[k] ? WELCOME[k]({ code: 'ONAE-7K2QX', percent: 10, loyalty: true }, '') : AUTO[k]({ code: 'ONAE-7K2QX', percent: 10, loyalty: true })).subject)}<span>${esc(AUTO_LABEL[k])}</span></a>`).join('')}<a href="/admin/emails/apercu?k=compte" target="_blank">${esc(WELCOME.compte({ link: '' }, '').subject)}<span>Création d'un compte client</span></a></div></div>
</main>
<script>
var P=${JSON.stringify(PRESETS).replace(/</g, '\\u003c')},$=function(i){return document.getElementById(i)};
function load(k){var p=P[k];['subject','preheader','kicker','title','body','cta','url'].forEach(function(f){$(f).value=p[f]||''});$('hero').value=p.hero||'';Array.prototype.forEach.call($('products').options,function(o){o.selected=p.products.indexOf(o.value)>-1});$('gifts').checked=!!p.gifts;document.querySelectorAll('[name=seg]').forEach(function(c){c.checked=p.segments.indexOf(c.value)>-1});pv();aud()}
function fields(){var f={};['subject','preheader','kicker','title','body','cta','url','hero'].forEach(function(k){f[k]=$(k).value});f.products=Array.prototype.filter.call($('products').options,function(o){return o.selected}).map(function(o){return o.value});f.gifts=$('gifts').checked;return f}
function segs(){return Array.prototype.filter.call(document.querySelectorAll('[name=seg]'),function(c){return c.checked}).map(function(c){return c.value})}
function api(u,d){return fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(function(r){return r.json()})}
var t;function pv(){clearTimeout(t);t=setTimeout(function(){api('/api/admin/mail/preview',{fields:fields()}).then(function(r){$('pv').srcdoc=r.html||''})},300)}
function aud(){api('/api/admin/mail/audience',{segments:segs()}).then(function(r){$('aud').textContent=r.count})}
document.querySelectorAll('input,textarea,select').forEach(function(e){if(e.id!=='preset'&&e.id!=='at'&&e.id!=='lAt'&&e.id!=='testTo')e.addEventListener('input',pv)});
document.querySelectorAll('[name=seg]').forEach(function(c){c.addEventListener('change',aud)});$('preset').addEventListener('change',function(){load(this.value)});
var M={subject_title_required:'Objet et titre obligatoires.',no_audience:'Choisissez au moins une audience.',bad_date:'Date invalide ou passée.',mail_off:'BREVO_API_KEY absente : impossible d\\u2019envoyer pour l\\u2019instant.',send_failed:'Envoi refusé : ',bad_email:'Adresse test invalide.'};
$('test').onclick=function(){$('msg').textContent='Envoi du test…';api('/api/admin/mail/test',{fields:fields(),to:$('testTo').value}).then(function(r){$('msg').textContent=r.ok?'Test envoyé à '+$('testTo').value+' ✓':(M[r.error]||r.error)+(r.detail||'')})};
function create(at){var n=$('aud').textContent;if(!confirm((at?'Programmer':'Envoyer maintenant')+' « '+$('subject').value+' » à '+n+' destinataire(s) ?'))return;api('/api/admin/mail/campaign',{fields:fields(),segments:segs(),sendAt:at}).then(function(r){if(r.ok)location.reload();else $('msg').textContent=M[r.error]||r.error})}
$('sched').onclick=function(){if(!$('at').value){$('msg').textContent='Choisissez la date et l\\u2019heure.';return}create(new Date($('at').value).toISOString())};$('now').onclick=function(){create(null)};
document.querySelectorAll('[data-a]').forEach(function(b){b.onclick=function(){api('/api/admin/mail/action',{id:b.dataset.id,action:b.dataset.a}).then(function(){location.reload()})}});
document.querySelectorAll('[data-l]').forEach(function(b){b.onclick=function(){var a=b.dataset.l,d={action:a};if(a==='schedule'){if(!$('lAt').value){$('lMsg').textContent='Choisissez la date et l\\u2019heure.';return}d.at=new Date($('lAt').value).toISOString()}if(a==='open'&&!confirm('Ouvrir la boutique au public maintenant ?'))return;api('/api/admin/launch',d).then(function(r){if(r.ok)location.reload();else $('lMsg').textContent=r.error})}});
load('ouverture');
</script>`;
  }

  /* ---------- routes ---------- */
  function body(req, max) { return new Promise(res => { let b = ''; req.on('data', c => { b += c; if (b.length > max) req.destroy(); }); req.on('end', () => res(b)); req.on('error', () => res('')); }); }
  const MINE = u => u === '/desinscription' || u === '/api/unsubscribe' || u.startsWith('/admin/emails') || u.startsWith('/api/admin/mail') || u === '/api/admin/launch';
  function route(req, res, urlPath, A) {
    if (!MINE(urlPath)) return false;
    handle(req, res, urlPath, A).catch(e => { console.error('[mailing] route', e); try { res.writeHead(500); res.end('Erreur'); } catch (_) {} });
    return true;
  }
  async function handle(req, res, urlPath, A) {
    const json = (c, o) => { res.writeHead(c, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
    const html = (c, h) => { res.writeHead(c, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }); res.end(h); };
    if (urlPath === '/desinscription') {
      if (req.method === 'POST') { const q = new URLSearchParams(await body(req, 2000)); const e = q.get('e'), t = q.get('t'), a = q.get('a'); if (okMail(norm(e)) && sigOk(e, t)) { a === 'in' ? resubscribe(e) : unsubscribe(e, 'page'); } html(200, unsubPage(e, t, a === 'in' ? 'in' : 'out')); return true; }
      const q = new URL(req.url, 'http://x').searchParams; html(200, unsubPage(q.get('e'), q.get('t'))); return true;
    }
    if (urlPath === '/api/unsubscribe' && req.method === 'POST') {   /* désinscription en un clic (Gmail, Apple Mail…) */
      const q = new URL(req.url, 'http://x').searchParams; await body(req, 2000);
      const e = q.get('e'), t = q.get('t'); if (okMail(norm(e)) && sigOk(e, t)) { unsubscribe(e, 'one-click'); return json(200, { ok: true }); } return json(400, { error: 'invalid' });
    }
    if (urlPath === '/api/unsubscribe') { json(405, { error: 'method' }); return true; }
    if (!A.isAdmin(req)) { if (urlPath.startsWith('/api/')) json(401, { error: 'not_admin' }); else { res.writeHead(302, { Location: '/admin' }); res.end(); } return true; }
    if (urlPath === '/admin/emails') { html(200, adminPage(A)); return true; }
    if (urlPath === '/admin/emails/apercu') { const k = new URL(req.url, 'http://x').searchParams.get('k'); const V = { code: 'ONAE-7K2QX', percent: 10, expires: new Date(Date.now() + 7 * 864e5).toISOString(), loyalty: true, link: SITE + '/mon-compte.html' };
      if (WELCOME[k]) { html(200, renderWelcome(WELCOME[k](V, 'Camille'), { email: 'camille@exemple.fr', name: 'Camille' }, { seg: k, why: TRANSAC[k], noUnsub: k === 'compte' }).html); return true; }
      if (!AUTO[k]) { html(404, 'Inconnu'); return true; } html(200, render(AUTO[k]({ code: 'ONAE-7K2QX', percent: 10, expires: new Date(Date.now() + 7 * 864e5).toISOString(), loyalty: true }), { email: 'camille@exemple.fr', name: 'Camille', segs: [k] }, TRANSAC[k] ? { transactional: true, why: TRANSAC[k], noUnsub: k === 'concours' } : {}).html); return true; }
    if (req.method !== 'POST') { json(405, { error: 'method' }); return true; }
    let d; try { d = JSON.parse(await body(req, 60000) || '{}'); } catch (_) { json(400, { error: 'invalid_json' }); return true; }
    if (urlPath === '/api/admin/mail/preview') { json(200, { html: render(cleanFields(d.fields || {})).html }); return true; }
    if (urlPath === '/api/admin/mail/audience') { json(200, { count: audience((d.segments || []).filter(s => SEGMENTS.some(x => x.id === s))).list.length }); return true; }
    if (urlPath === '/api/admin/mail/test') {
      const to = norm(d.to); if (!okMail(to)) { json(400, { error: 'bad_email' }); return true; }
      if (!N.canSend()) { json(200, { error: 'mail_off' }); return true; }
      const f = cleanFields(d.fields || {}); const m = render(f, { email: to, name: 'Camille', segs: ['newsletter', 'concours'] });
      const ok = await N.sendMail({ ...m, subject: '[TEST] ' + m.subject, to, headers: listHeaders(to), tags: ['test'] });
      json(200, ok ? { ok: true } : { error: 'send_failed', detail: (N.sendMail.last || {}).body || '' }); return true;
    }
    if (urlPath === '/api/admin/mail/campaign') { json(200, createCampaign(d)); return true; }
    if (urlPath === '/api/admin/mail/action') { json(200, action(d.id, d.action, d.at)); return true; }
    if (urlPath === '/api/admin/launch') { json(200, setLaunch(d)); return true; }
    json(404, { error: 'not_found' }); return true;
  }

  return { route, autoMail, accountWelcome, audience, render, unsubscribe, launchState, _tick: tick, PRESETS, AUTO, cartReminder, cartReminderMail, isUnsub: e => unsubbed().has(norm(e)), canSend: () => N.canSend() };
};
