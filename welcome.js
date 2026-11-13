/* ═══════════ ONAÉ — CODE DE BIENVENUE (pop-up de sortie) ═══════════
   Un code personnel par adresse e-mail : −10 % sur la première commande,
   valable 7 jours, utilisable une seule fois (marqué utilisé par le webhook Stripe).
   Données : <DATA_DIR>/welcome.json — jamais servi au public.            */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PERCENT = 10;
const VALID_DAYS = 7;

module.exports = function (dataDir) {
  const FILE = path.join(dataDir, 'welcome.json');
  const read = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (_) { return []; } };
  const write = l => { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(l, null, 2)); };
  const norm = c => String(c || '').trim().toUpperCase().replace(/\s+/g, '');
  const newCode = list => {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; /* sans 0/O/1/I : lisible */
    let c;
    do { c = 'ONAE-' + Array.from(crypto.randomBytes(5), b => A[b % A.length]).join(''); } while (list.some(x => x.code === c));
    return c;
  };

  /* Crée (ou renvoie) le code d'une adresse. Un code expiré non utilisé est renouvelé une fois. */
  function issue(email, source) {
    const list = read();
    let e = list.find(x => x.email === email);
    if (e && e.used) return { status: 'used' };
    if (e && Date.parse(e.expires) > Date.now()) return { status: 'ok', code: e.code, expires: e.expires, percent: PERCENT, again: true };
    const expires = new Date(Date.now() + VALID_DAYS * 864e5).toISOString();
    if (e) { e.code = newCode(list); e.expires = expires; e.renewed = (e.renewed || 0) + 1; }
    else { e = { email, code: newCode(list), at: new Date().toISOString(), expires, source: String(source || '').slice(0, 40), used: null }; list.push(e); }
    write(list);
    return { status: 'ok', code: e.code, expires: e.expires, percent: PERCENT };
  }

  /* Vérifie un code au panier / au paiement */
  function check(code, ignoreRef) {
    const c = norm(code); if (!/^ONAE-[A-Z0-9]{5}$/.test(c)) return { ok: false, error: 'invalid' };
    const e = read().find(x => x.code === c);
    if (!e) return { ok: false, error: 'invalid' };
    if (e.used) return { ok: false, error: 'used' };
    if (Date.parse(e.expires) <= Date.now()) return { ok: false, error: 'expired' };
    if (e.hold && e.hold.until > Date.now() && e.hold.ref !== ignoreRef) return { ok: false, error: 'pending' };
    return { ok: true, code: c, percent: PERCENT, expires: e.expires, email: e.email };
  }

  /* Réserve le code pour un paiement en cours (opération synchrone : deux paiements simultanés ne peuvent pas l'utiliser) */
  function claim(code, ref, until) {
    const list = read(); const e = list.find(x => x.code === norm(code));
    if (!e || e.used || Date.parse(e.expires) <= Date.now() || (e.hold && e.hold.until > Date.now())) return false;
    e.hold = { ref, until }; write(list); return true;
  }
  function rehold(code, from, to) { const list = read(); const e = list.find(x => x.code === norm(code)); if (e && e.hold && e.hold.ref === from) { e.hold.ref = to; write(list); } }
  function release(code, ref) { const list = read(); const e = list.find(x => x.code === norm(code)); if (e && e.hold && e.hold.ref === ref) { delete e.hold; write(list); } }

  function markUsed(code, sessionId) {
    const list = read(); const e = list.find(x => x.code === norm(code));
    if (!e || e.used) return;
    e.used = new Date().toISOString(); e.session = sessionId || ''; delete e.hold;
    write(list);
  }

  return { issue, check, claim, rehold, release, markUsed, PERCENT, VALID_DAYS, list: read };
};
