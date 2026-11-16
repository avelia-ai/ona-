/* Onaé — envoi des e-mails (API HTTPS, sans dépendance).
   Fournisseur : Resend si RESEND_API_KEY est définie (recommandé), sinon Brevo si BREVO_API_KEY est définie.
   Variables Railway : RESEND_API_KEY, NOTIFY_EMAIL (adresse de l'équipe, défaut contact@onaecosmetics.fr),
   NOTIFY_FROM (expéditeur, sur un domaine validé chez Resend, défaut = NOTIFY_EMAIL).
   Sans clé, rien n'est envoyé : la notification est seulement écrite dans les journaux. */
const https = require('https');

const provider = () => process.env.RESEND_API_KEY ? 'resend' : process.env.BREVO_API_KEY ? 'brevo' : '';
const providerLabel = () => ({ resend: 'Resend', brevo: 'Brevo' })[provider()] || '';

function post(hostname, path, headers, payload) {
  const body = JSON.stringify(payload);
  return new Promise(resolve => {
    const req = https.request({ hostname, path, method: 'POST', timeout: 15000,
      headers: Object.assign({ 'Content-Type': 'application/json', 'Accept': 'application/json', 'Content-Length': Buffer.byteLength(body) }, headers) }, res => {
      let out = ''; res.on('data', c => out += c);
      res.on('end', () => resolve({ status: res.statusCode, body: out.slice(0, 400) }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: 'timeout' }); });
    req.end(body);
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

async function sendMail({ subject, html, text, to: dest, toName, headers, tags, senderName }) {
  const p = provider();
  const to = dest || process.env.NOTIFY_EMAIL || 'contact@onaecosmetics.fr';
  const from = process.env.NOTIFY_FROM || process.env.NOTIFY_EMAIL || 'contact@onaecosmetics.fr';
  const name = senderName || (dest ? 'Onaé Paris' : 'Onaé · Site');
  const replyTo = process.env.NOTIFY_EMAIL || 'contact@onaecosmetics.fr';
  if (!p) { console.log('[notify] (aucune clé d\'envoi, e-mail non envoyé)', subject); sendMail.last = { status: 0, body: 'no_key' }; return false; }
  let r;
  if (p === 'resend') {
    const payload = { from: `${name} <${from}>`, to: [toName ? `${String(toName).replace(/[<>",]/g, '')} <${to}>` : to], subject, html, text: text || subject };
    if (dest) payload.reply_to = replyTo;
    if (headers) payload.headers = headers;
    if (tags) payload.tags = tags.map(t => ({ name: 'type', value: String(t).replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 256) })).slice(0, 1);
    for (let i = 0; i < 4; i++) {          /* limite de débit Resend (quelques envois / seconde) : on patiente et on réessaie */
      r = await post('api.resend.com', '/emails', { Authorization: 'Bearer ' + process.env.RESEND_API_KEY }, payload);
      if (r.status === 429 && !/quota/i.test(r.body)) { await wait(1200 * (i + 1)); continue; }
      break;
    }
  } else {
    const payload = { sender: { name, email: from }, to: [toName ? { email: to, name: toName } : { email: to }], subject, htmlContent: html, textContent: text || subject };
    if (dest) payload.replyTo = { email: replyTo, name: 'Onaé Paris' };
    if (headers) payload.headers = headers;
    if (tags) payload.tags = tags;
    r = await post('api.brevo.com', '/v3/smtp/email', { 'api-key': process.env.BREVO_API_KEY }, payload);
  }
  sendMail.last = r;
  const ok = r.status >= 200 && r.status < 300;
  if (!ok) console.error('[notify]', providerLabel(), r.status, r.body.slice(0, 300));
  return ok;
}
const canSend = () => !!provider();
module.exports = { sendMail, canSend, providerLabel };
