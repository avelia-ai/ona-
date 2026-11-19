/* Onaé — demande d'avis après livraison (jamais servi au public)
   - un seul e-mail par commande réelle (hors tests / annulées) :
       5 jours après « Livrée », sinon 9 jours après « Expédiée », sinon 14 jours après la commande
   - envoi entre 10 h et 20 h (heure de Paris), 20 e-mails max par passage, adresses désinscrites ignorées
   - chaque soin de la commande a ses 5 étoiles cliquables → fiche produit, formulaire d'avis pré-rempli
   - récompense : 50 éclats Onaé Privilège par avis publié, positif comme négatif, sur achat vérifié
     (créditée par loyalty.creditOrders → creditReviews)
   Données : DATA_DIR/review-requests.json                                                    */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { sendMail, canSend } = require('./notify');
const SITE = 'https://www.onaecosmetics.fr';
const REWARD = 50;
const DAY = 864e5;
const norm = e => String(e || '').trim().toLowerCase();
const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const SECRET = () => process.env.MAIL_SECRET || process.env.NEWSLETTER_KEY || process.env.STRIPE_WEBHOOK_SECRET || 'onae-mail';
const unsubUrl = e => `${SITE}/desinscription?e=${encodeURIComponent(norm(e))}&t=${crypto.createHmac('sha256', SECRET()).update('unsub|' + norm(e)).digest('hex').slice(0, 24)}`;
const isTest = o => o.test != null ? !!o.test : (o.livemode === false || (Number(o.total) || 0) < 2);

/* soins contenus dans une ligne de commande (solo, duo/rituel, Box, routine du Bar) */
function components(item, catalog) {
  if (!item || item.gift) return [];
  const byId = id => catalog.find(p => p.id === id);
  const p = byId(item.id), out = new Set();
  const ok = x => x && !/^carte-cadeau/.test(x.id) && x.category !== 'box';
  if (p) {
    if (p.category === 'box') (p.box_items || []).forEach(b => { const q = byId(b.id || b); if (ok(q)) out.add(q.id); });
    const b = (p.bundles || []).find(x => x.id === item.bundle);
    if (b && Array.isArray(b.product_images)) b.product_images.forEach(f => { const m = /^cart-(.+?)(?:-v\d+)?\.jpg$/.exec(f); const q = m && byId(m[1]); if (ok(q)) out.add(q.id); });
    if (ok(p)) out.add(p.id);
  }
  const n = fold(item.name);   /* routine du Bar ou ancienne commande : soins cités dans le libellé */
  if (item.bundle === 'bar' || !p) catalog.forEach(q => { const k = fold(q.name); if (ok(q) && k.length > 12 && n.includes(k)) out.add(q.id); });
  return [...out];
}

module.exports = function (DATA_DIR, ROOT) {
  const F = n => path.join(DATA_DIR, n);
  const read = (n, d) => { try { return JSON.parse(fs.readFileSync(F(n), 'utf8')); } catch (_) { return d; } };
  const write = (n, v) => { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(F(n), JSON.stringify(v, null, 2)); };
  const catalog = () => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'products.json'), 'utf8')).products || []; } catch (_) { return []; } };

  function dueAt(o) {
    const h = o.history || {};
    if (h['Livrée']) return Date.parse(h['Livrée']) + 5 * DAY;
    if (h['Expédiée']) return Date.parse(h['Expédiée']) + 9 * DAY;
    return Date.parse(o.at) + 14 * DAY;
  }

  function mail(o, prods) {
    const first = (o.name || '').trim().split(/\s+/)[0] || '';
    const star = '<span style="font-size:30px;line-height:1;color:#c9a46a;text-decoration:none">★</span>';
    const cards = prods.map(p => {
      const q = n => `${SITE}/produits/${encodeURIComponent(p.id)}?note=${n}&e=${encodeURIComponent(norm(o.email))}${first ? '&n=' + encodeURIComponent(first) : ''}#avis`;
      return `<tr><td style="padding:14px 0;border-bottom:1px solid #f1e4e0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="96" valign="top"><a href="${q(5)}"><img src="${SITE}/cart-${esc(p.id)}.jpg" width="84" alt="" style="display:block;width:84px;height:auto;border:0"></a></td>
<td valign="middle" style="padding-left:14px;font:15px/1.45 Georgia,serif;color:#2a0f18"><p style="margin:0 0 8px">${esc(p.name)} ${esc(p.name_line2 || '')}</p>
<p style="margin:0">${[1, 2, 3, 4, 5].map(n => `<a href="${q(n)}" title="${n} sur 5" style="text-decoration:none">${star}</a>`).join('&nbsp;')}</p>
<p style="margin:6px 0 0;font:11px/1.4 Arial,sans-serif;color:#9a8a90">Touchez une étoile pour noter</p></td></tr></table></td></tr>`;
    }).join('');
    const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f8ece9"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8ece9"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff">
<tr><td align="center" style="background:#2a0f18;padding:30px 20px 26px"><img src="${SITE}/email-logo-clair.png" width="150" alt="Onaé Paris" style="display:block;width:150px;height:auto;border:0"><p style="margin:12px 0 0;font:700 9px/1 Arial,sans-serif;letter-spacing:.42em;color:#e8cba0;text-transform:uppercase">Votre avis compte</p></td></tr>
<tr><td style="padding:36px 38px 8px;font:15px/1.7 Georgia,serif;color:#2a0f18"><h1 style="margin:0 0 14px;font:400 30px/1.2 Georgia,serif">Comment se passe votre rituel ?</h1><p style="margin:0 0 12px">Bonjour${first ? ' ' + esc(first) : ''},</p><p style="margin:0 0 12px">Cela fait quelques jours que vos soins Onaé font partie de votre quotidien. Votre ressenti, qu'il soit enthousiaste ou plus nuancé, aide d'autres personnes à choisir, et nous aide à faire encore mieux.</p></td></tr>
<tr><td style="padding:6px 38px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards}</table></td></tr>
<tr><td style="padding:24px 38px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#7a2443,#2a0f18);background-color:#5a1830"><tr><td style="padding:20px 22px;font:14px/1.6 Georgia,serif;color:#fbeee8"><p style="margin:0 0 6px;font:700 9px/1 Arial,sans-serif;letter-spacing:.32em;color:#e8cba0;text-transform:uppercase">Notre merci ✦</p><p style="margin:0;font:400 19px/1.35 Georgia,serif;color:#fff">+${REWARD} éclats Onaé Privilège pour chaque avis publié</p><p style="margin:8px 0 0">Offerts que votre avis soit positif ou négatif, crédités dès sa publication sur votre compte Onaé Privilège (inscription gratuite). 100 éclats = 5 € offerts.</p></td></tr></table></td></tr>
<tr><td style="padding:24px 38px 34px;font:13px/1.7 Georgia,serif;color:#6f5e66"><p style="margin:0">Chaque avis est relu avant publication et publié tel quel, sans retouche. Votre e-mail n'est jamais affiché.</p><p style="margin:18px 0 0">Avec toute notre gratitude,<br>L'équipe Onaé</p></td></tr>
<tr><td align="center" style="background:#f3e3df;padding:18px;font:11px/1.6 Arial,sans-serif;color:#8a7a80">Onaé Paris · Marque élaborée en France · contact@onaecosmetics.fr<br>Commande ${esc(o.number)} · <a href="${unsubUrl(o.email)}" style="color:#8a7a80">Ne plus recevoir nos e-mails</a></td></tr>
</table></td></tr></table></body></html>`;
    const text = `Bonjour ${first},\n\nComment se passe votre rituel ? Donnez votre avis sur vos soins Onaé (+${REWARD} éclats par avis publié, positif ou négatif) :\n` + prods.map(p => `- ${p.name} : ${SITE}/produits/${p.id}#avis`).join('\n') + `\n\nL'équipe Onaé`;
    return { subject: prods.length > 1 ? 'Vos soins Onaé vous plaisent ? Dites-le-nous ✦' : `Votre ${prods[0].name} vous plaît ? ✦`, html, text, headers: { 'List-Unsubscribe': `<${unsubUrl(o.email)}>` } };
  }

  let running = false;
  async function tick(force) {
    if (running || !canSend()) return;
    const hour = Number(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric', hour12: false }).format(new Date()));
    if (!force && (hour < 10 || hour >= 20)) return;
    running = true;
    try {
      const sent = read('review-requests.json', {}), orders = read('orders.json', []), C = catalog();
      const unsub = new Set(read('unsub.json', []).map(u => norm(u.email)));
      const reviewed = new Set(read('reviews.json', []).map(r => norm(r.email) + '|' + r.productId));
      let n = 0;
      for (const o of (Array.isArray(orders) ? orders : [])) {
        if (n >= 20) break;
        if (!o.number || sent[o.number] || isTest(o) || o.status === 'Annulée' || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(norm(o.email))) continue;
        if (Date.now() < dueAt(o)) continue;
        if (Date.now() - dueAt(o) > 60 * DAY) { sent[o.number] = { at: new Date().toISOString(), skipped: 'trop_ancienne' }; continue; }
        if (unsub.has(norm(o.email))) { sent[o.number] = { at: new Date().toISOString(), skipped: 'desinscrit' }; continue; }
        const ids = [...new Set((o.items || []).flatMap(i => components(i, C)))].filter(id => !reviewed.has(norm(o.email) + '|' + id)).slice(0, 6);
        const prods = ids.map(id => C.find(p => p.id === id)).filter(Boolean);
        if (!prods.length) { sent[o.number] = { at: new Date().toISOString(), skipped: 'aucun_soin' }; continue; }
        const m = mail(o, prods);
        const ok = await sendMail(Object.assign({ to: norm(o.email), toName: o.name || undefined, tags: ['avis'] }, m));
        if (!ok) { console.error('[avis-mail] échec', o.number); break; }
        sent[o.number] = { at: new Date().toISOString(), products: ids }; n++;
        write('review-requests.json', sent);
      }
      write('review-requests.json', sent);
      if (n) console.log('[avis-mail]', n, 'demande(s) d\'avis envoyée(s)');
    } catch (e) { console.error('[avis-mail] tick', e.message); }
    running = false;
  }
  setTimeout(() => tick(), 60e3).unref();
  setInterval(() => tick(), 30 * 60e3).unref();
  return { tick, mail, components, REWARD };
};
module.exports.components = components;
module.exports.REWARD = REWARD;
