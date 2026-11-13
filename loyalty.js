/**
 * Onaé Privilège — logique serveur des éclats (jamais servi au public).
 *  - crédit des éclats à chaque commande payée (1 € = 1 éclat Rose, 1,25 Nacre, 1,5 Écrin ; doublés le mois d'anniversaire)
 *  - rattrapage : une cliente qui rejoint le programme après avoir commandé récupère les éclats de ses commandes
 *  - échange : 100 éclats = 5 €, 200 = 12 €, 400 = 30 € (débités quand la commande est payée)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const TIERS = [{ name: 'Rose', min: 0, rate: 1 }, { name: 'Nacre', min: 200, rate: 1.25 }, { name: 'Écrin', min: 500, rate: 1.5 }];
const REWARDS = { 100: 5, 200: 12, 400: 30 };

module.exports = function createLoyalty(DATA_DIR) {
  const LOY = path.join(DATA_DIR, 'loyalty.json');
  const ORD = path.join(DATA_DIR, 'orders.json');
  const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return d; } };
  const write = (f, v) => { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 2)); };
  const norm = e => String(e || '').trim().toLowerCase();
  const history = m => m.history || [{ label: 'Bienvenue dans Onaé Privilège', points: 50, at: m.at }];

  /* Montant des soins d'une commande (hors livraison, hors cadeau), remises déduites */
  const itemsTotal = o => (o.items || []).filter(i => !i.gift).reduce((t, i) => t + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);

  /* Palier au moment de la commande : achats payés sur les 12 mois précédents (commande exclue) */
  function rateAt(orders, email, at) {
    const t = Date.parse(at) || Date.now();
    const spent = orders.filter(o => norm(o.loyalty_email || o.email) === email && o.status !== 'annulée'
      && Date.parse(o.at) < t && Date.parse(o.at) > t - 365 * 864e5).reduce((s, o) => s + itemsTotal(o), 0);
    let r = TIERS[0]; TIERS.forEach(x => { if (spent >= x.min) r = x; });
    return r;
  }
  /* Anniversaire « JJ/MM » ou « AAAA-MM-JJ » */
  function birthdayMonth(m, at) {
    const b = String(m.birthday || ''); const d = new Date(at || Date.now());
    const mm = (/^\d{2}\/(\d{2})$/.exec(b) || /^\d{4}-(\d{2})-\d{2}$/.exec(b) || [])[1];
    return mm && Number(mm) === d.getMonth() + 1;
  }

  /* Crédite toutes les commandes payées et pas encore créditées de cette adresse (si elle est membre). */
  function creditOrders(email) {
    email = norm(email); if (!email) return 0;
    const members = read(LOY, []), m = members.find(x => norm(x.email) === email);
    if (!m) return 0;
    const orders = read(ORD, []);
    let total = 0, changed = false;
    orders.filter(o => norm(o.loyalty_email || o.email) === email && !o.eclats_credited && o.status !== 'annulée')
      .sort((a, b) => String(a.at).localeCompare(String(b.at)))
      .forEach(o => {
        const tier = rateAt(orders, email, o.at), bday = birthdayMonth(m, o.at);
        const pts = Math.floor(itemsTotal(o) * tier.rate * (bday ? 2 : 1));
        o.eclats = pts; o.eclats_credited = new Date().toISOString(); changed = true;
        if (pts > 0) {
          m.history = history(m);
          m.history.push({ label: `Commande ${o.number}${bday ? ' · éclats doublés (anniversaire)' : ''}`, points: pts, at: o.at });
          m.points = (m.points || 0) + pts; total += pts;
        }
      });
    if (changed) { write(ORD, orders); write(LOY, members); }
    return total;
  }

  /* Débite une récompense utilisée (une seule fois par session Stripe). */
  function redeem(email, cost, ref) {
    email = norm(email); cost = Number(cost);
    if (!email || !REWARDS[cost]) return false;
    const members = read(LOY, []), m = members.find(x => norm(x.email) === email);
    if (!m) return false;
    m.redeemed = m.redeemed || [];
    if (m.redeemed.includes(ref)) return true;
    m.redeemed.push(ref);
    m.holds = (m.holds || []).filter(h => h.ref !== ref);
    m.history = history(m);
    m.history.push({ label: `Récompense ${REWARDS[cost]} € utilisée`, points: -cost, at: new Date().toISOString() });
    m.points = Math.max(0, (m.points || 0) - cost);
    write(LOY, members);
    return true;
  }

  /* Réservation des éclats pendant un paiement en cours : deux paiements ouverts en même temps ne peuvent pas
     utiliser les mêmes éclats (la réservation tombe d'elle-même si le paiement n'aboutit pas). */
  const activeHolds = m => (m.holds || []).filter(h => h.until > Date.now());
  function available(email) { const m = member(email); return m ? Math.max(0, (m.points || 0) - activeHolds(m).reduce((t, h) => t + h.cost, 0)) : 0; }
  function reserve(email, cost, ref, until, cap) {
    email = norm(email); cost = Number(cost);
    const members = read(LOY, []), m = members.find(x => norm(x.email) === email);
    if (!m || !REWARDS[cost]) return false;
    m.holds = activeHolds(m);
    const free = (m.points || 0) - m.holds.reduce((t, h) => t + h.cost, 0);
    const limit = cap == null ? free : Math.min(free, cap - m.holds.reduce((t, h) => t + h.cost, 0));
    if (limit < cost) return false;
    m.holds.push({ ref, cost, until }); write(LOY, members); return true;
  }
  function release(email, ref) {
    email = norm(email); const members = read(LOY, []), m = members.find(x => norm(x.email) === email);
    if (!m || !m.holds) return; m.holds = m.holds.filter(h => h.ref !== ref); write(LOY, members);
  }
  function rename(email, from, to) {
    email = norm(email); const members = read(LOY, []), m = members.find(x => norm(x.email) === email);
    if (!m || !m.holds) return; m.holds.forEach(h => { if (h.ref === from) h.ref = to; }); write(LOY, members);
  }

  function member(email) { email = norm(email); return email ? read(LOY, []).find(x => norm(x.email) === email) || null : null; }

  return { creditOrders, redeem, member, available, reserve, release, rename, REWARDS, TIERS };
};
