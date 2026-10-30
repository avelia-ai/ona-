/* Onaé — e-mails de notification à l'équipe (API HTTPS Brevo, sans dépendance).
   Variables Railway : BREVO_API_KEY (obligatoire pour envoyer), NOTIFY_EMAIL (défaut contact@onaecosmetics.fr),
   NOTIFY_FROM (expéditeur validé dans Brevo, défaut = NOTIFY_EMAIL).
   Sans BREVO_API_KEY, rien n'est envoyé : la notification est seulement écrite dans les journaux. */
const https = require('https');

function sendMail({ subject, html, text }) {
  const key = process.env.BREVO_API_KEY;
  const to = process.env.NOTIFY_EMAIL || 'contact@onaecosmetics.fr';
  const from = process.env.NOTIFY_FROM || to;
  if (!key) { console.log('[notify] (BREVO_API_KEY absente, e-mail non envoyé)', subject); return Promise.resolve(false); }
  const body = JSON.stringify({ sender: { name: 'Onaé · Site', email: from }, to: [{ email: to }], subject, htmlContent: html, textContent: text || subject });
  return new Promise(resolve => {
    const req = https.request({ hostname: 'api.brevo.com', path: '/v3/smtp/email', method: 'POST', timeout: 10000,
      headers: { 'api-key': key, 'Content-Type': 'application/json', 'Accept': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => {
      let out = ''; res.on('data', c => out += c);
      res.on('end', () => { const ok = res.statusCode >= 200 && res.statusCode < 300; if (!ok) console.error('[notify] Brevo', res.statusCode, out.slice(0, 300)); resolve(ok); });
    });
    req.on('error', e => { console.error('[notify]', e.message); resolve(false); });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end(body);
  });
}
module.exports = { sendMail };
