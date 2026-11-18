/* Onaé — Guide Beauté offert (PDF de 30 pages) avec chaque commande.
   - envoyé en pièce jointe dans l'e-mail de confirmation de commande (saveOrder → sendOrderMail)
   - téléchargeable par lien signé (/api/guide?o=<n° commande>&t=<signature>) et depuis l'espace client (/api/me/guide)
   Le PDF est rangé dans /private (jamais servi directement). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const SITE = 'https://www.onaecosmetics.fr';
const PDF = path.join(__dirname, 'private', 'guide-beaute-onae.pdf');
const FILENAME = 'Guide-Beaute-Onae.pdf';
const secret = () => process.env.MAIL_SECRET || process.env.NEWSLETTER_KEY || process.env.STRIPE_WEBHOOK_SECRET || 'onae-mail';
const sign = n => crypto.createHmac('sha256', secret()).update('guide:' + String(n).toUpperCase()).digest('hex').slice(0, 32);
const link = n => `${SITE}/api/guide?o=${encodeURIComponent(n)}&t=${sign(n)}`;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const eur = v => (Number(v) || 0).toFixed(2).replace('.', ',') + ' €';

function sendPdf(res){
  let buf; try { buf = fs.readFileSync(PDF); } catch (_) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Guide indisponible'); }
  res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Length': buf.length, 'Content-Disposition': `attachment; filename="${FILENAME}"`, 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' });
  res.end(buf);
}
function deny(res, code, msg){ res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(`<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Guide Beauté Onaé</title><div style="font:16px/1.6 Georgia,serif;max-width:520px;margin:80px auto;padding:0 24px;color:#2a0f18;text-align:center"><p style="font:700 11px Arial;letter-spacing:.3em;color:#b88a5a">ONAÉ PARIS</p><h1 style="font-weight:400">${msg}</h1><p>Le guide reste disponible à tout moment dans votre <a href="/mon-compte.html#guide" style="color:#7a2443">espace client</a>.</p></div>`); }

/* e-mail de confirmation de commande, avec le guide en pièce jointe */
function orderMail(o){
  const first = esc((o.name || '').split(' ')[0] || '');
  const rows = (o.items || []).map(i => `<tr><td style="padding:9px 0;border-bottom:1px solid #f1e4e0;font:14px/1.5 Georgia,serif;color:#2a0f18">${i.qty} × ${esc(i.name)}</td><td align="right" style="padding:9px 0;border-bottom:1px solid #f1e4e0;font:14px Georgia,serif;color:#2a0f18;white-space:nowrap">${i.gift ? 'Offert' : eur(i.price * i.qty)}</td></tr>`).join('')
    + `<tr><td style="padding:9px 0;border-bottom:1px solid #f1e4e0;font:14px/1.5 Georgia,serif;color:#2a0f18">1 × Le Guide Beauté Onaé (PDF, 30 pages)</td><td align="right" style="padding:9px 0;border-bottom:1px solid #f1e4e0;font:14px Georgia,serif;color:#b88a5a">Offert</td></tr>`;
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f8ece9"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8ece9"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff">
<tr><td align="center" style="background:#2a0f18;padding:30px 20px 26px"><img src="${SITE}/email-logo-clair.png" width="150" alt="Onaé Paris" style="display:block;width:150px;height:auto;border:0"><p style="margin:12px 0 0;font:700 9px/1 Arial,sans-serif;letter-spacing:.42em;color:#e8cba0;text-transform:uppercase">Merci pour votre commande</p></td></tr>
<tr><td style="padding:36px 38px 10px;font:15px/1.7 Georgia,serif;color:#2a0f18"><h1 style="margin:0 0 14px;font:400 30px/1.2 Georgia,serif">Votre rituel se prépare.</h1><p style="margin:0 0 12px">Bonjour ${first},</p><p style="margin:0 0 12px">Votre commande <b>${esc(o.number)}</b> est confirmée. Nous la préparons avec soin et vous écrirons dès qu'elle sera confiée au transporteur.</p></td></tr>
<tr><td style="padding:10px 38px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#7a2443,#2a0f18);background-color:#5a1830"><tr>
<td width="150" style="padding:22px 0 22px 22px"><img src="${SITE}/cadeau-guide-beaute.jpg" width="128" alt="Le Guide Beauté Onaé" style="display:block;width:128px;height:auto;border:0"></td>
<td style="padding:22px 22px 22px 18px;font:14px/1.6 Georgia,serif;color:#fbeee8"><p style="margin:0 0 6px;font:700 9px/1 Arial,sans-serif;letter-spacing:.32em;color:#e8cba0;text-transform:uppercase">Votre cadeau ✦</p><p style="margin:0 0 8px;font:400 21px/1.25 Georgia,serif;color:#fff">Le Guide Beauté Onaé</p><p style="margin:0 0 14px">30 pages pour comprendre votre peau et vos cheveux, décennie par décennie : ordre d'application, rituels, astuces de pro. Il est joint à cet e-mail.</p><a href="${link(o.number)}" style="display:inline-block;background:#e8cba0;color:#2a0f18;font:700 11px/1 Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;padding:13px 18px">Télécharger mon guide</a></td></tr></table></td></tr>
<tr><td style="padding:28px 38px 6px"><p style="margin:0 0 6px;font:700 10px/1 Arial,sans-serif;letter-spacing:.3em;color:#b88a5a;text-transform:uppercase">Récapitulatif</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
${o.shipping ? `<tr><td style="padding:9px 0;font:14px Georgia,serif;color:#6f5e66">Livraison</td><td align="right" style="padding:9px 0;font:14px Georgia,serif;color:#6f5e66">${eur(o.shipping)}</td></tr>` : `<tr><td style="padding:9px 0;font:14px Georgia,serif;color:#6f5e66">Livraison</td><td align="right" style="padding:9px 0;font:14px Georgia,serif;color:#6f5e66">Offerte</td></tr>`}
<tr><td style="padding:12px 0 0;font:700 15px Georgia,serif;color:#2a0f18">Total payé</td><td align="right" style="padding:12px 0 0;font:700 17px Georgia,serif;color:#2a0f18">${eur(o.total)}</td></tr></table></td></tr>
<tr><td style="padding:26px 38px 34px;font:14px/1.7 Georgia,serif;color:#6f5e66"><p style="margin:0 0 16px">Suivez votre commande et retrouvez votre guide à tout moment dans votre espace client.</p><a href="${SITE}/mon-compte.html#commandes" style="display:inline-block;border:1px solid #2a0f18;color:#2a0f18;font:700 11px/1 Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;padding:13px 18px">Mon espace client</a><p style="margin:22px 0 0">À très vite,<br>L'équipe Onaé</p></td></tr>
<tr><td align="center" style="background:#f3e3df;padding:18px;font:11px/1.6 Arial,sans-serif;color:#8a7a80">Onaé Paris · Marque élaborée en France · contact@onaecosmetics.fr</td></tr>
</table></td></tr></table></body></html>`;
  const text = `Bonjour ${(o.name || '').split(' ')[0] || ''},\n\nVotre commande ${o.number} est confirmée (${eur(o.total)}).\nVotre cadeau, le Guide Beauté Onaé, est joint à cet e-mail. Vous pouvez aussi le télécharger ici : ${link(o.number)}\n\nSuivi et guide dans votre espace client : ${SITE}/mon-compte.html\n\nL'équipe Onaé`;
  return { subject: `Commande ${o.number} confirmée · votre Guide Beauté offert ✦`, html, text };
}
async function sendOrderMail(o){
  if (!o || !o.email) return false;
  const notify = require('./notify'); if (!notify.canSend()) { console.log('[guide] pas de clé d\'envoi, e-mail de confirmation non envoyé', o.number); return false; }
  let attachments = null; try { attachments = [{ name: FILENAME, content: fs.readFileSync(PDF).toString('base64') }]; } catch (_) {}
  const m = orderMail(o);
  const ok = await notify.sendMail({ ...m, to: o.email, toName: o.name || '', attachments, tags: ['commande'] });
  console.log(`[guide] confirmation ${o.number} → ${ok ? 'envoyée' : 'échec'}`);
  return ok;
}

/* routes : lien signé + espace client */
function route(req, res, urlPath, accounts){
  if (req.method !== 'GET') return false;
  if (urlPath === '/api/guide') {
    const q = new URL(req.url, 'http://x').searchParams, n = String(q.get('o') || '').toUpperCase(), t = String(q.get('t') || '');
    const good = sign(n);
    if (!/^ON[A-Z0-9]{3,12}$/.test(n) || t.length !== good.length || !crypto.timingSafeEqual(Buffer.from(t), Buffer.from(good))) { deny(res, 403, 'Ce lien n\'est plus valide.'); return true; }
    sendPdf(res); return true;
  }
  if (urlPath === '/api/me/guide') {
    const u = accounts.currentUser(req);
    if (!u) { res.writeHead(302, { Location: '/compte.html?next=' + encodeURIComponent('/mon-compte.html#guide') }); res.end(); return true; }
    const orders = (accounts.view(u).orders || []).filter(o => !/annul/i.test(o.status || ''));
    if (!orders.length) { deny(res, 403, 'Votre guide vous attend après votre première commande.'); return true; }
    sendPdf(res); return true;
  }
  return false;
}
module.exports = { route, sendOrderMail, orderMail, link, sign };
