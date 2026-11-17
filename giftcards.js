/* ═══════════ ONAÉ — CARTES CADEAU ═══════════
   Un code par carte achetée (CADEAU-XXXXX), valable 12 mois, utilisable en plusieurs fois
   jusqu'à épuisement du solde. Codes envoyés par e-mail à l'achat (notify.js).
   Données : <DATA_DIR>/giftcards.json — jamais servi au public.                          */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VALID_MONTHS = 12;

module.exports = function (dataDir) {
  const FILE = path.join(dataDir, 'giftcards.json');
  const read = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (_) { return []; } };
  const write = l => { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(l, null, 2)); };
  const norm = c => String(c || '').trim().toUpperCase().replace(/\s+/g, '');
  const newCode = list => {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; /* sans 0/O/1/I : lisible */
    let c;
    do { c = 'CADEAU-' + Array.from(crypto.randomBytes(5), b => A[b % A.length]).join(''); } while (list.some(x => x.code === c));
    return c;
  };

  /* Émet une carte (1 par unité achetée), idempotent par sourceKey ("sessionId:ligne:unité") :
     un webhook rejoué ne crée jamais deux fois la même carte. Renvoie la carte créée, ou celle déjà
     existante si déjà émise, ou null si amountCents invalide. */
  function issue(sourceKey, amountCents, email) {
    if (!Number.isFinite(amountCents) || amountCents < 50) return null;
    const list = read();
    const already = list.find(x => x.sourceKey === sourceKey);
    if (already) return already;
    const expires = new Date(Date.now() + VALID_MONTHS * 30.44 * 864e5).toISOString();
    const c = { code: newCode(list), balance: amountCents, initial: amountCents, currency: 'eur',
      email: String(email || '').toLowerCase().slice(0, 254), sourceKey, at: new Date().toISOString(), expires,
      history: [], disabled: false };
    list.push(c);
    write(list);
    return c;
  }

  /* Vérifie un code au panier / au paiement */
  function check(code, ignoreRef) {
    const c = norm(code); if (!/^CADEAU-[A-Z0-9]{5}$/.test(c)) return { ok: false, error: 'invalid' };
    const e = read().find(x => x.code === c);
    if (!e || e.disabled) return { ok: false, error: 'invalid' };
    if (Date.parse(e.expires) <= Date.now()) return { ok: false, error: 'expired' };
    if (e.balance < 1) return { ok: false, error: 'empty' };
    if (e.hold && e.hold.until > Date.now() && e.hold.ref !== ignoreRef) return { ok: false, error: 'pending' };
    return { ok: true, code: c, balance: e.balance, expires: e.expires };
  }

  /* Réserve un montant (≤ solde) pour un paiement en cours — une carte n'est utilisable que dans
     un seul paiement à la fois, comme les codes de bienvenue et les récompenses Privilège. */
  function claim(code, ref, amountCents, until) {
    const list = read(); const e = list.find(x => x.code === norm(code));
    if (!e || e.disabled || Date.parse(e.expires) <= Date.now() || e.balance < amountCents) return false;
    if (e.hold && e.hold.until > Date.now()) return false;
    e.hold = { ref, until, amount: amountCents }; write(list); return true;
  }
  function rehold(code, from, to) { const list = read(); const e = list.find(x => x.code === norm(code)); if (e && e.hold && e.hold.ref === from) { e.hold.ref = to; write(list); } }
  function release(code, ref) { const list = read(); const e = list.find(x => x.code === norm(code)); if (e && e.hold && e.hold.ref === ref) { delete e.hold; write(list); } }

  /* Débite définitivement le solde au paiement confirmé — idempotent par sessionId (un webhook
     rejoué ne débite jamais deux fois la même commande). */
  function debit(code, amountCents, sessionId) {
    const list = read(); const e = list.find(x => x.code === norm(code));
    if (!e) return;
    if (e.history.some(h => h.session === sessionId)) return; // déjà débité pour cette commande
    const amt = Math.min(amountCents, e.balance);
    e.balance -= amt;
    e.history.push({ at: new Date().toISOString(), amount: amt, session: sessionId || '' });
    delete e.hold;
    write(list);
  }

  return { issue, check, claim, rehold, release, debit, list: read };
};
