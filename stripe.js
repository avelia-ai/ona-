/**
 * Onaé — module Stripe Checkout
 * Endpoints :
 *   POST /api/checkout           → crée une Stripe Checkout Session, retourne { url }
 *   POST /api/stripe/webhook     → reçoit les événements Stripe (checkout.session.completed)
 *   GET  /api/checkout/session   → retourne le détail d'une session (page succès)
 */
'use strict';
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FREE_SHIPPING_THRESHOLD = 5900; // centimes (59 €)
const SHIPPING_COST = 490;            // centimes (4,90 €)

/* ─── helpers Stripe API (sans SDK, zéro dépendance) ──────────── */
function stripePost(endpoint, data, rawBody) {
  return new Promise((resolve, reject) => {
    const body = rawBody || Object.entries(flattenStripe(data))
      .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
      .join('&');
    const opts = {
      hostname: 'api.stripe.com',
      path: '/v1/' + endpoint,
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY,
        'Content-Type': rawBody ? 'application/json' : 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'Stripe-Version': '2024-04-10',
      },
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { const j = JSON.parse(d); if (j.error) reject(j.error); else resolve(j); }
        catch(e) { reject({ message: 'parse error' }); }
      });
    });
    req.on('error', reject);
    req.end(body);
  });
}

function stripeGet(endpoint) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.stripe.com',
      path: '/v1/' + endpoint,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY,
        'Stripe-Version': '2024-04-10',
      },
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { const j = JSON.parse(d); if (j.error) reject(j.error); else resolve(j); }
        catch(e) { reject({ message: 'parse error' }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/* Sérialise un objet imbriqué au format form-encoded de Stripe */
function flattenStripe(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flattenStripe(v, key));
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'object') Object.assign(result, flattenStripe(item, `${key}[${i}]`));
        else result[`${key}[${i}]`] = item;
      });
    } else if (v !== undefined && v !== null) {
      result[key] = v;
    }
  }
  return result;
}

/* Vérification signature webhook Stripe */
function verifyWebhookSignature(rawBody, sigHeader, secret) {
  const parts = {};
  (sigHeader || '').split(',').forEach(p => { const [k, v] = p.split('='); if (k && v) parts[k] = v; });
  const ts = parts.t;
  if (!ts || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false; // 5 min
  const payload = ts + '.' + rawBody;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(parts.v1 || '', 'hex'), Buffer.from(expected, 'hex')); }
  catch(_) { return false; }
}

/* Charge products.json une seule fois */
let _catalog = null;
function getCatalog(rootDir) {
  if (_catalog) return _catalog;
  try { _catalog = JSON.parse(fs.readFileSync(path.join(rootDir, 'products.json'), 'utf8')); }
  catch(_) { _catalog = { products: [] }; }
  return _catalog;
}

/* Construit les line_items Stripe d'un panier [{ id: "produit" | "produit--formule", qty }].
   Les prix sont toujours relus dans le catalogue (jamais ceux envoyés par le navigateur). */
function buildLineItems(items, catalog) {
  const prodMap = {};
  (catalog.products || []).forEach(p => { prodMap[p.id] = p; });
  const lineItems = [], rejected = [];
  let subtotalCents = 0;
  let physical = false;   /* les cartes cadeau (virtual) n'entraînent pas de livraison */
  for (const { id, qty } of items) {
    /* id "produit--formule" : formule (duo, routine…) d'une fiche produit, prix lu dans le catalogue */
    const [baseId, bundleId] = String(id).split('--');
    const p = prodMap[baseId];
    if (!p) { rejected.push({ id, raison: 'produit inconnu' }); continue; }
    const q = Math.min(Math.max(1, parseInt(qty) || 1), 9);
    const bundle = p.bundles && (bundleId ? p.bundles.find(b => b.id === bundleId) : p.bundles[0]);
    if (!bundle) { rejected.push({ id, raison: 'formule inconnue' }); continue; }
    const priceCents = Math.round(bundle.price_raw * 100);
    if (!Number.isFinite(priceCents) || priceCents < 50) { rejected.push({ id, raison: 'prix invalide' }); continue; }
    if (!p.virtual) physical = true;
    subtotalCents += priceCents * q;
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: bundleId ? bundle.name + ' — ' + p.name + (p.name_line2 ? ' ' + p.name_line2 : '') : p.name + (p.name_line2 ? ' ' + p.name_line2 : ''),
          description: (bundleId ? bundle.description : p.volume) || undefined,
          images: [`https://www.onaecosmetics.fr/cart-${p.id}.jpg`],
          metadata: { product_id: p.id, bundle: bundleId || 'solo' },
        },
        unit_amount: priceCents,
      },
      quantity: q,
    });
  }
  return { lineItems, subtotalCents, physical, rejected };
}

/* ─── handlers ────────────────────────────────────────────────── */

/**
 * POST /api/checkout
 * Body JSON : { items: [{ id, qty }], email? }
 */
async function handleCheckout(req, res, rootDir, ctx) {
  const send = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(obj));
  };

  if (!process.env.STRIPE_SECRET_KEY) return send(503, { error: 'stripe_not_configured' });

  let body = '';
  await new Promise(r => { req.on('data', c => { body += c; if (body.length > 8192) req.destroy(); }); req.on('end', r); });

  let data;
  try { data = JSON.parse(body || '{}'); } catch(_) { return send(400, { error: 'invalid_json' }); }

  const catalog = getCatalog(rootDir);

  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) return send(400, { error: 'empty_cart' });

  const { lineItems, subtotalCents, physical, rejected } = buildLineItems(items, catalog);
  /* un article introuvable n'est jamais retiré en silence : la cliente paierait un autre montant que celui affiché */
  if (rejected.length) { console.warn('Checkout refusé, articles invalides :', JSON.stringify(rejected)); return send(409, { error: 'items_unavailable', items: rejected }); }

  if (!lineItems.length) return send(400, { error: 'no_valid_items' });

  /* Cadeau : Bombe de bain Menthe & Eucalyptus offerte avec chaque commande (hors cartes cadeau seules) */
  const gift = physical;

  /* Livraison */
  const shippingCents = (!physical || subtotalCents >= FREE_SHIPPING_THRESHOLD) ? 0 : SHIPPING_COST;
  if (shippingCents > 0) {
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: { name: 'Livraison Onaé', description: 'Expédition sous 24 h (jours ouvrés)' },
        unit_amount: shippingCents,
      },
      quantity: 1,
    });
  }

  const origin = `https://www.onaecosmetics.fr`;

  /* Onaé Privilège : cliente connectée → éclats rattachés à son compte ; récompense éventuelle (100/200/400 éclats) */
  const user = ctx && ctx.user, L = ctx && ctx.loyalty;
  const loyaltyEmail = user && user.email ? String(user.email).toLowerCase() : '';
  let reward = null;
  const want = parseInt(data.reward) || 0;
  if (want) {
    const m = loyaltyEmail && L ? L.member(loyaltyEmail) : null;
    const value = L && L.REWARDS[want];
    if (!m || !value) return send(400, { error: 'reward_unavailable' });
    if ((m.points || 0) < want) return send(400, { error: 'not_enough_eclats' });
    if (value * 100 >= subtotalCents) return send(400, { error: 'reward_too_high' });
    reward = { cost: want, value };
  }

  try {
    let coupon = null;
    if (reward) coupon = await stripePost('coupons', { amount_off: reward.value * 100, currency: 'eur', duration: 'once', max_redemptions: 1, name: `Onaé Privilège · ${reward.value} € offerts` });
    const session = await stripePost('checkout/sessions', {
      mode: 'payment',
      line_items: lineItems,
      billing_address_collection: 'required',
      shipping_address_collection: { allowed_countries: ['FR', 'BE', 'CH', 'LU', 'MC'] },
      customer_email: loyaltyEmail || data.email || undefined,
      phone_number_collection: { enabled: true },
      locale: 'fr',
      ...(coupon ? { discounts: [{ coupon: coupon.id }] } : { allow_promotion_codes: true }),
      success_url: origin + '/checkout.html?success=1&session_id={CHECKOUT_SESSION_ID}',
      cancel_url:  origin + '/panier.html?canceled=1',
      metadata: { source: 'onae_boutique', gift: gift ? 'bombe-bain-menthe-eucalyptus' : '', eclats_email: loyaltyEmail, eclats_reward: reward ? String(reward.cost) : '' },
      ...(gift ? { custom_text: { submit: { message: 'Cadeau : votre Bombe de bain Menthe & Eucalyptus esprit SPA (valeur 12,99 €) est offerte avec cette commande.' } } } : {}),
      payment_intent_data: {
        description: 'Commande Onaé Paris',
        metadata: { source: 'onae_boutique' },
      },
    });
    send(200, { url: session.url, session_id: session.id });
  } catch(err) {
    console.error('Stripe checkout error:', err);
    send(500, { error: 'stripe_error', message: err.message || String(err) });
  }
}

/**
 * GET /api/checkout/session?id=cs_xxx
 */
async function handleSessionGet(req, res) {
  const send = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
  };
  if (!process.env.STRIPE_SECRET_KEY) return send(503, { error: 'stripe_not_configured' });
  const id = new URL(req.url, 'http://x').searchParams.get('id');
  if (!id || !id.startsWith('cs_')) return send(400, { error: 'invalid_id' });
  try {
    const session = await stripeGet(`checkout/sessions/${encodeURIComponent(id)}?expand[]=line_items`);
    send(200, {
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email || session.customer_email || '',
      customer_name:  session.customer_details?.name  || '',
      amount_total:   session.amount_total,
      shipping:       session.shipping_details || null,
      line_items:     (session.line_items?.data || []).map(li => ({
        description: li.description,
        quantity:    li.quantity,
        amount:      li.amount_total,
      })),
    });
  } catch(err) {
    console.error('Stripe session fetch error:', err);
    send(500, { error: 'stripe_error' });
  }
}

/**
 * POST /api/stripe/webhook
 * Corps brut nécessaire pour vérification de signature
 */
function handleWebhook(req, res, dataDir, loyalty) {
  const send = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };

  if (!process.env.STRIPE_WEBHOOK_SECRET) return send(503, { error: 'webhook_not_configured' });

  const chunks = [];
  req.on('data', c => { chunks.push(c); });
  req.on('end', () => {
    const rawBody = Buffer.concat(chunks).toString('utf8');
    const sig = req.headers['stripe-signature'] || '';

    if (!verifyWebhookSignature(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)) {
      console.warn('Stripe webhook: invalid signature');
      return send(400, { error: 'invalid_signature' });
    }

    let event;
    try { event = JSON.parse(rawBody); } catch(_) { return send(400, { error: 'invalid_json' }); }

    if (event.type !== 'checkout.session.completed') return send(200, { received: true });
    const session = event.data.object;
    (async () => {
      /* L'événement ne contient pas les articles : on relit la session avec ses line_items */
      let full = session;
      try { full = await stripeGet(`checkout/sessions/${encodeURIComponent(session.id)}?expand[]=line_items`); } catch (e) { console.error('Stripe session expand error:', e); }
      if (full.payment_status && full.payment_status !== 'paid') return;
      saveOrder(full, dataDir);
      if (loyalty) {
        const md = full.metadata || {};
        try {
          if (md.eclats_reward && md.eclats_email) loyalty.redeem(md.eclats_email, md.eclats_reward, full.id);
          loyalty.creditOrders(md.eclats_email || full.customer_details?.email || full.customer_email || '');
        } catch (e) { console.error('Onaé Privilège error:', e); }
      }
    })().finally(() => send(200, { received: true }));
  });
}

function saveOrder(session, dataDir) {
  try {
    const ordersFile = path.join(dataDir, 'orders.json');
    let orders = [];
    try { orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8')); } catch(_) {}

    /* Évite les doublons (idempotence) */
    if (orders.some(o => o.stripe_session_id === session.id)) return;

    const number = 'ON' + Date.now().toString(36).toUpperCase().slice(-6);
    const items = (session.line_items?.data || [])
      .filter(li => !li.description?.startsWith('Livraison'))
      .map(li => ({
        name: li.description || '',
        qty:  li.quantity || 1,
        price: (li.amount_total || 0) / 100 / (li.quantity || 1),
      }));
    if (session.metadata && session.metadata.gift) items.push({ name: 'Bombe de bain Menthe & Eucalyptus esprit SPA (offerte)', qty: 1, price: 0, gift: true });

    const order = {
      number,
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent || '',
      at: new Date().toISOString(),
      status: 'Confirmée',
      email: String(session.customer_details?.email || session.customer_email || '').toLowerCase(),
      loyalty_email: (session.metadata && session.metadata.eclats_email) || '',
      discount: ((session.total_details?.amount_discount || 0) / 100),
      name:  session.customer_details?.name  || '',
      phone: session.customer_details?.phone || '',
      city:  session.shipping_details?.address?.city || '',
      address: session.shipping_details?.address || null,
      items,
      subtotal: ((session.amount_total || 0) / 100),
      shipping: 0,
      total: ((session.amount_total || 0) / 100),
      history: { Confirmée: new Date().toISOString() },
    };

    orders.push(order);
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
    console.log(`Onaé: commande ${number} enregistrée (${order.email})`);
  } catch(err) {
    console.error('Erreur saveOrder:', err);
  }
}

/* ─── diagnostic au démarrage ─────────────────────────────────────
   Écrit dans les journaux du serveur un bilan de la configuration Stripe, sans aucune clé ni donnée client :
   mode (test/réel), compte activé ou non, webhooks déclarés, dernières sessions de paiement, moyens de paiement. */
async function stripeDiagnostic() {
  const key = process.env.STRIPE_SECRET_KEY || '', wh = process.env.STRIPE_WEBHOOK_SECRET || '';
  const out = {
    cle: key ? (key.startsWith('sk_live_') ? 'reelle (sk_live)' : key.startsWith('sk_test_') ? 'test (sk_test)' : key.startsWith('rk_live_') ? 'restreinte reelle (rk_live)' : key.startsWith('rk_test_') ? 'restreinte test (rk_test)' : 'format inconnu') : 'absente',
    secret_webhook: wh ? (wh.startsWith('whsec_') ? 'present (whsec_)' : 'present, format inattendu') : 'absent',
    cle_publique: process.env.STRIPE_PUBLISHABLE_KEY ? (process.env.STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_') ? 'reelle' : process.env.STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_') ? 'test' : 'format inconnu') : 'absente',
  };
  if (!key) { console.log('[stripe-diag]', JSON.stringify(out)); return; }
  const safe = async (label, fn) => { try { out[label] = await fn(); } catch (e) { out[label] = { erreur: (e && (e.message || e.code)) || String(e) }; } };
  await safe('compte', async () => { const a = await stripeGet('account');
    return { nom: a.business_profile && a.business_profile.name, pays: a.country, devise: a.default_currency, paiements_actives: a.charges_enabled, virements_actives: a.payouts_enabled, dossier_complet: a.details_submitted,
      a_fournir: (a.requirements && a.requirements.currently_due) || [], motif_blocage: a.requirements && a.requirements.disabled_reason }; });
  await safe('webhooks', async () => { const l = await stripeGet('webhook_endpoints?limit=20');
    return (l.data || []).map(w => ({ url: w.url, statut: w.status, evenements: w.enabled_events, reel: w.livemode })); });
  await safe('dernieres_sessions', async () => { const l = await stripeGet('checkout/sessions?limit=10');
    return (l.data || []).map(c => ({ cree: new Date(c.created * 1000).toISOString(), statut: c.status, paiement: c.payment_status, montant: c.amount_total, reel: c.livemode })); });
  await safe('moyens_paiement', async () => { const l = await stripeGet('payment_method_configurations?limit=5');
    return (l.data || []).filter(c => c.is_default || c.active).map(c => ({ nom: c.name, defaut: c.is_default,
      carte: c.card && c.card.display_preference && c.card.display_preference.value, apple_pay: c.apple_pay && c.apple_pay.display_preference && c.apple_pay.display_preference.value,
      google_pay: c.google_pay && c.google_pay.display_preference && c.google_pay.display_preference.value, link: c.link && c.link.display_preference && c.link.display_preference.value,
      paypal: c.paypal && c.paypal.display_preference && c.paypal.display_preference.value })); });
  /* ponctuel (07/11) : Stripe valide une session de paiement pour CHAQUE formule de CHAQUE produit, puis l'annule aussitôt (aucun débit) */
  try {
    const cat = getCatalog(path.join(__dirname));
    const DEMO = ['serum-eclat-peptides', 'creme-reparatrice-intense', 'essence-hydratante-pro', 'huile-nuit-reparatrice'];
    let ok = 0; const ko = [];
    for (const p of cat.products || []) {
      if (DEMO.includes(p.id)) continue;
      for (const [i, b] of (p.bundles || []).entries()) {
        const id = i === 0 ? p.id : p.id + '--' + b.id;
        const r = buildLineItems([{ id, qty: 1 }], cat);
        if (r.rejected.length) { ko.push(id + ' (refusé localement)'); continue; }
        const li = r.lineItems.slice();
        if (r.physical && r.subtotalCents < FREE_SHIPPING_THRESHOLD) li.push({ price_data: { currency: 'eur', product_data: { name: 'Livraison Onaé' }, unit_amount: SHIPPING_COST }, quantity: 1 });
        try {
          const sess = await stripePost('checkout/sessions', { mode: 'payment', line_items: li, locale: 'fr',
            shipping_address_collection: { allowed_countries: ['FR', 'BE', 'CH', 'LU', 'MC'] },
            success_url: 'https://www.onaecosmetics.fr/checkout.html?success=1&session_id={CHECKOUT_SESSION_ID}', cancel_url: 'https://www.onaecosmetics.fr/panier.html?canceled=1',
            metadata: { source: 'onae_autotest' } });
          if (sess.amount_total !== r.subtotalCents + (li.length > r.lineItems.length ? SHIPPING_COST : 0)) ko.push(id + ' (montant Stripe ' + sess.amount_total + ')');
          else ok++;
          await stripePost('checkout/sessions/' + sess.id + '/expire', {}).catch(() => {});
        } catch (e) { ko.push(id + ' : ' + ((e && e.message) || e)); }
      }
    }
    console.log('[stripe-diag] AUTOTEST paiements : ' + ok + ' formules acceptées par Stripe' + (ko.length ? ' | ECHECS : ' + ko.join(' ; ') : ' | aucun échec'));
  } catch (e) { console.log('[stripe-diag] AUTOTEST erreur :', e && e.message); }
  console.log('[stripe-diag]', JSON.stringify(out));
}
setTimeout(() => { stripeDiagnostic().catch(e => console.error('[stripe-diag] echec', e && e.message)); }, 4000);

module.exports = { handleCheckout, handleWebhook, handleSessionGet, buildLineItems };
