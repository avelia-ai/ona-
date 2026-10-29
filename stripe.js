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

/* ─── handlers ────────────────────────────────────────────────── */

/**
 * POST /api/checkout
 * Body JSON : { items: [{ id, qty }], email? }
 */
async function handleCheckout(req, res, rootDir) {
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
  const prodMap = {};
  (catalog.products || []).forEach(p => { prodMap[p.id] = p; });

  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) return send(400, { error: 'empty_cart' });

  /* Construit les line_items Stripe */
  const lineItems = [];
  let subtotalCents = 0;
  let physical = false;   /* les cartes cadeau (virtual) n'entraînent pas de livraison */

  for (const { id, qty } of items) {
    /* id "produit--formule" : formule (duo, routine…) d'une fiche produit, prix lu dans le catalogue */
    const [baseId, bundleId] = String(id).split('--');
    const p = prodMap[baseId];
    if (!p) continue;
    const q = Math.min(Math.max(1, parseInt(qty) || 1), 9);
    const bundle = p.bundles && (bundleId ? p.bundles.find(b => b.id === bundleId) : p.bundles[0]);
    if (!bundle) continue;
    const priceCents = Math.round(bundle.price_raw * 100);
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

  if (!lineItems.length) return send(400, { error: 'no_valid_items' });

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

  try {
    const session = await stripePost('checkout/sessions', {
      mode: 'payment',
      line_items: lineItems,
      billing_address_collection: 'required',
      shipping_address_collection: { allowed_countries: ['FR', 'BE', 'CH', 'LU', 'MC'] },
      customer_email: data.email || undefined,
      phone_number_collection: { enabled: true },
      locale: 'fr',
      allow_promotion_codes: true,
      success_url: origin + '/checkout.html?success=1&session_id={CHECKOUT_SESSION_ID}',
      cancel_url:  origin + '/panier.html?canceled=1',
      metadata: { source: 'onae_boutique' },
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
function handleWebhook(req, res, dataDir) {
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

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      saveOrder(session, dataDir);
    }

    send(200, { received: true });
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

    const order = {
      number,
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent || '',
      at: new Date().toISOString(),
      status: 'Confirmée',
      email: session.customer_details?.email || session.customer_email || '',
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

module.exports = { handleCheckout, handleWebhook, handleSessionGet };
