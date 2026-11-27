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

const FREE_SHIPPING_THRESHOLD = 4900; // centimes (49 €)
const SHIPPING_COST = 490;            // centimes (4,90 €)
/* Zones de livraison (mêmes valeurs que cart.js). La cliente choisit son pays au panier ;
   Stripe n'accepte ensuite que les adresses de la zone payée. */
const ZONE_EU = ['FR','AT','BE','BG','HR','CY','CZ','DK','EE','FI','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','CH','MC'];
const ZONE_INTL = ['GB','US','HK','NO'];
const SHIP_ZONES = {
  eu:   { countries: ZONE_EU,   cost: SHIPPING_COST, free: FREE_SHIPPING_THRESHOLD, label: 'Livraison Onaé', desc: 'Expédition sous 24 h (jours ouvrés)', note: 'Préparée avec soin et expédiée sous 24 h ouvrées · livraison en 2 à 3 jours ouvrés en France, 5 à 10 jours ouvrés en Europe.' },
  intl: { countries: ZONE_INTL, cost: 990,           free: 8900,                    label: 'Livraison internationale Onaé', desc: 'Royaume-Uni, États-Unis, Hong Kong, Norvège · 7 à 15 jours ouvrés', note: 'Expédiée sous 24 h ouvrées · livraison en 7 à 15 jours ouvrés. Droits de douane et taxes locales éventuels à la charge du destinataire.' },
};
const zoneFor = c => ZONE_INTL.includes(c) ? 'intl' : 'eu';

/* visuels de la page de paiement (scratchpad/gen-checkout.py) : soin détouré sur fond de gamme, sans badge fournisseur */
const CHECKOUT_IMG_DIR = __dirname;
function checkoutImage(id, bundleId) {
  for (const f of [bundleId ? `checkout-${id}--${bundleId}.jpg` : null, `checkout-${id}.jpg`])
    if (f && fs.existsSync(path.join(CHECKOUT_IMG_DIR, f))) return 'https://www.onaecosmetics.fr/' + f;
  return `https://www.onaecosmetics.fr/cart-${id}.jpg`;
}

/* habillage de la page Stripe (paramètre branding_settings, API 2025-09-30.clover et suivantes) */
const CHECKOUT_BRANDING = {
  display_name: 'Onaé Paris',
  logo: { type: 'url', url: 'https://www.onaecosmetics.fr/checkout-logo-v2.png' },
  font_family: 'lora',
  border_style: 'rounded',   /* arrondis partout (26/11) ; avant : rectangular */
  background_color: '#f8ece9',
  button_color: '#2a0f18',
};
const BRANDING_VERSION = '2025-09-30.clover';
const ELEMENTS_VERSION = '2026-10-28.endive';   /* même version que https://js.stripe.com/endive/stripe.js */

/* ─── helpers Stripe API (sans SDK, zéro dépendance) ──────────── */
function stripePost(endpoint, data, rawBody, version) {
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
        'Stripe-Version': version || '2024-04-10',
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
  let ts = ''; const sigs = [];
  String(sigHeader || '').split(',').forEach(p => { const i = p.indexOf('='); const k = p.slice(0, i).trim(), v = p.slice(i + 1).trim(); if (k === 't') ts = v; else if (k === 'v1' && /^[a-f0-9]{64}$/.test(v)) sigs.push(v); });
  if (!secret || !/^\d+$/.test(ts) || Math.abs(Date.now() / 1000 - Number(ts)) > 300 || !sigs.length) return false; // 5 min
  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(ts + '.' + rawBody).digest('hex'), 'hex');
  return sigs.some(v => { const b = Buffer.from(v, 'hex'); return b.length === expected.length && crypto.timingSafeEqual(b, expected); });
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
/* Bar à routines : 3 soins choisis = −20 % (au moins), prix terminé en ,99 — même calcul que cart.js */
const BAR_OFF = 0.20;
function barPriceCents(sumC) { const t = Math.floor(sumC * (1 - BAR_OFF)); return Math.floor((t + 1) / 100) * 100 - 1; }

function buildLineItems(items, catalog) {
  const prodMap = {};
  (catalog.products || []).forEach(p => { prodMap[p.id] = p; });
  const lineItems = [], rejected = [];
  let subtotalCents = 0, barCents = 0, virtualCents = 0;
  let physical = false;   /* les cartes cadeau (virtual) n'entraînent pas de livraison */
  for (const { id, qty } of items) {
    /* id "soin1--bar-soin1.soin2.soin3" : routine composée au Bar à routines */
    const bar = /^([a-z0-9-]+)--bar-([a-z0-9.-]+)$/.exec(String(id));
    if (bar) {
      const ids = bar[2].split('.'), ps = ids.map(i => prodMap[i]);
      const okBar = ids.length === 3 && new Set(ids).size === 3 && ids[0] === bar[1] &&
        ps.every(p => p && !p.virtual && !['box', 'cadeau'].includes(p.category) && p.bundles && p.bundles[0] && p.bundles[0].price_raw > 0);
      if (!okBar) { rejected.push({ id, raison: 'routine sur mesure invalide' }); continue; }
      const q = Math.min(Math.max(1, parseInt(qty) || 1), 9);
      const priceCents = barPriceCents(ps.reduce((s, p) => s + Math.round(p.bundles[0].price_raw * 100), 0));
      physical = true;
      subtotalCents += priceCents * q;
      barCents += priceCents * q;
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Ma routine sur mesure · −20 %',
            description: ps.map(p => p.name + (p.name_line2 ? ' ' + p.name_line2 : '')).join(' + '),
            images: [`https://www.onaecosmetics.fr/checkout-routine.jpg`],
            metadata: { product_id: ps[0].id, bundle: 'bar', items: ids.join(',') },
          },
          unit_amount: priceCents,
        },
        quantity: q,
      });
      continue;
    }
    /* id "produit--formule" : formule (duo, routine…) d'une fiche produit, prix lu dans le catalogue */
    const [baseId, bundleId] = String(id).split('--');
    const p = prodMap[baseId];
    if (!p) { rejected.push({ id, raison: 'produit inconnu' }); continue; }
    const q = Math.min(Math.max(1, parseInt(qty) || 1), 9);
    const bundle = p.bundles && (bundleId ? p.bundles.find(b => b.id === bundleId) : p.bundles[0]);
    if (!bundle) { rejected.push({ id, raison: 'formule inconnue' }); continue; }
    const priceCents = Math.round(bundle.price_raw * 100);
    if (!Number.isFinite(priceCents) || priceCents < 50) { rejected.push({ id, raison: 'prix invalide' }); continue; }
    if (!p.virtual) physical = true; else virtualCents += priceCents * q;
    subtotalCents += priceCents * q;
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: bundleId ? bundle.name : p.name + (p.name_line2 ? ' ' + p.name_line2 : ''),
          description: (bundleId ? bundle.description : p.volume) || undefined,
          images: [checkoutImage(p.id, bundleId)],
          metadata: { product_id: p.id, bundle: bundleId || 'solo' },
        },
        unit_amount: priceCents,
      },
      quantity: q,
    });
  }
  return { lineItems, subtotalCents, barCents, virtualCents, physical, rejected };
}

/* ─── handlers ────────────────────────────────────────────────── */

/**
 * POST /api/checkout
 * Body JSON : { items: [{ id, qty }], email? }
 */
async function handleCheckout(req, res, rootDir, ctx) {
  const send = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
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
  if (items.length > 30) return send(400, { error: 'too_many_items' });

  const { lineItems, subtotalCents, barCents, virtualCents, physical, rejected } = buildLineItems(items, catalog);
  /* un article introuvable n'est jamais retiré en silence : la cliente paierait un autre montant que celui affiché */
  if (rejected.length) { console.warn('Checkout refusé, articles invalides :', JSON.stringify(rejected)); return send(409, { error: 'items_unavailable', items: rejected }); }

  if (!lineItems.length) return send(400, { error: 'no_valid_items' });

  /* Cadeau : Bombe de bain Menthe & Eucalyptus offerte avec chaque commande (hors cartes cadeau seules) */
  const gift = physical;

  /* Livraison : zone du pays choisi au panier (France par défaut) */
  const country = /^[A-Z]{2}$/.test(String(data.country || '')) ? String(data.country) : 'FR';
  if (!ZONE_EU.includes(country) && !ZONE_INTL.includes(country)) return send(400, { error: 'country_not_served' });
  const zone = SHIP_ZONES[zoneFor(country)];
  const shippingCents = (!physical || subtotalCents >= zone.free) ? 0 : zone.cost;
  if (shippingCents > 0) {
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: { name: zone.label, description: zone.desc },
        unit_amount: shippingCents,
      },
      quantity: 1,
    });
  }

  const origin = `https://www.onaecosmetics.fr`;

  /* Onaé Privilège : cliente connectée → éclats rattachés à son compte ; récompense éventuelle (100/200/400 éclats) */
  const user = ctx && ctx.user, L = ctx && ctx.loyalty;
  const loyaltyEmail = user && user.email ? String(user.email).toLowerCase() : '';
  /* Paiement Stripe ouvert 30 min (minimum Stripe) : récompense et code de bienvenue sont réservés jusqu'à expiration */
  const expiresAt = Math.floor(Date.now() / 1000) + 31 * 60;
  const holdUntil = (expiresAt + 10 * 60) * 1000;
  const tmpRef = 'tmp_' + crypto.randomBytes(8).toString('hex');
  const discountBase = subtotalCents - virtualCents;       // jamais de remise sur une carte cadeau
  let reward = null;
  const want = parseInt(data.reward) || 0;
  if (want) {
    const m = loyaltyEmail && L ? L.member(loyaltyEmail) : null;
    const value = L && L.REWARDS[want];
    if (!m || !value) return send(400, { error: 'reward_unavailable' });
    /* adresse e-mail non confirmée : seuls les éclats gagnés avec CE compte sont utilisables */
    const cap = user.emailVerified ? null : (ctx.ownPoints ? ctx.ownPoints(m, user) : 50);
    if (value * 100 >= discountBase) return send(400, { error: 'reward_too_high' });
    if (!L.reserve(loyaltyEmail, want, tmpRef, holdUntil, cap)) return send(400, { error: 'not_enough_eclats' });
    reward = { cost: want, value };
  }
  /* Code de bienvenue : −10 %, non cumulable avec une récompense Privilège (Stripe n'accepte qu'une remise) */
  let welcomeOk = null;
  if (data.welcome && !reward && ctx && ctx.welcome) {
    const w = ctx.welcome.check(data.welcome);
    if (!w.ok) return send(400, { error: 'welcome_' + w.error });
    /* première commande uniquement : refusé si l'adresse du code (ou du compte) a déjà une commande payée */
    if (!w.creator && ctx.hasOrdered && (ctx.hasOrdered(w.email) || (loyaltyEmail && ctx.hasOrdered(loyaltyEmail)))) return send(400, { error: 'welcome_not_first' });
    welcomeOk = w;
    /* −10 % de bienvenue : jamais sur une routine du Bar à routines (déjà −20 %), ni sur la livraison ou une carte cadeau */
    welcomeOk.offCents = Math.floor((discountBase - barCents) * w.percent / 100);
    if (welcomeOk.offCents < 1) return send(400, { error: 'welcome_not_on_bar' });
    if (!ctx.welcome.claim(w.code, tmpRef, holdUntil)) return send(400, { error: 'welcome_pending' });
  }
  /* Carte cadeau : solde utilisable en plusieurs fois, non cumulable avec une récompense Privilège
     ou le code de bienvenue (Stripe n'accepte qu'une seule remise par commande) */
  let giftcardOk = null;
  if (data.giftcard && !reward && !welcomeOk && ctx && ctx.giftcards) {
    const g = ctx.giftcards.check(data.giftcard);
    if (!g.ok) return send(400, { error: 'giftcard_' + g.error });
    const avail = discountBase - barCents; // jamais sur une routine du Bar (déjà −20 %) ni sur une autre carte cadeau
    if (avail < 1) return send(400, { error: 'giftcard_not_on_bar' });
    let offCents = Math.min(g.balance, avail);
    const totalCandidate = subtotalCents + shippingCents;
    if (offCents > totalCandidate - 50) offCents = Math.max(0, totalCandidate - 50); // au moins 0,50 € à régler
    if (offCents < 1) return send(400, { error: 'giftcard_too_small' });
    if (!ctx.giftcards.claim(g.code, tmpRef, offCents, holdUntil)) return send(400, { error: 'giftcard_pending' });
    giftcardOk = { code: g.code, offCents };
  }
  const releaseHolds = () => {
    try { if (reward) L.release(loyaltyEmail, tmpRef); if (welcomeOk) ctx.welcome.release(welcomeOk.code, tmpRef); if (giftcardOk) ctx.giftcards.release(giftcardOk.code, tmpRef); } catch (_) {}
  };
  /* e-mail de la commande : celui du compte, sinon celui du code de bienvenue (code personnel), sinon saisi chez Stripe */
  const custEmail = loyaltyEmail || (welcomeOk && welcomeOk.email) || (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(data.email || '')) ? String(data.email).slice(0, 254) : undefined);

  try {
    let coupon = null;
    if (reward) coupon = await stripePost('coupons', { amount_off: reward.value * 100, currency: 'eur', duration: 'once', max_redemptions: 1, redeem_by: expiresAt + 600, name: `Onaé Privilège · ${reward.value} € offerts` });
    else if (welcomeOk) coupon = await stripePost('coupons', { amount_off: welcomeOk.offCents, currency: 'eur', duration: 'once', max_redemptions: 1, redeem_by: expiresAt + 600, name: (welcomeOk.creator ? `Code ${welcomeOk.code} · −${welcomeOk.percent} %` : `Bienvenue chez Onaé · −${welcomeOk.percent} %`) + (barCents ? ' (hors routine sur mesure)' : '') });
    else if (giftcardOk) coupon = await stripePost('coupons', { amount_off: giftcardOk.offCents, currency: 'eur', duration: 'once', max_redemptions: 1, redeem_by: expiresAt + 600, name: `Carte cadeau Onaé · −${(giftcardOk.offCents / 100).toFixed(2).replace('.', ',')} €` });
    const params = {
      mode: 'payment',
      line_items: lineItems,
      expires_at: expiresAt,
      billing_address_collection: 'required',
      shipping_address_collection: { allowed_countries: zone.countries },
      customer_email: custEmail,
      phone_number_collection: { enabled: true },
      locale: 'fr',
      ...(coupon ? { discounts: [{ coupon: coupon.id }] } : { allow_promotion_codes: true }),
      success_url: origin + '/checkout.html?success=1&session_id={CHECKOUT_SESSION_ID}',
      cancel_url:  origin + '/panier.html?canceled=1',
      metadata: { source: 'onae_boutique', gift: gift ? 'bombe-bain-menthe-eucalyptus' : '', eclats_email: loyaltyEmail, uid: user && user.id ? String(user.id) : '', eclats_reward: reward ? String(reward.cost) : '', welcome_code: welcomeOk ? welcomeOk.code : '', giftcard_code: giftcardOk ? giftcardOk.code : '', giftcard_amount: giftcardOk ? String(giftcardOk.offCents) : '', expected_total: String(subtotalCents + shippingCents - (reward ? reward.value * 100 : welcomeOk ? welcomeOk.offCents : giftcardOk ? giftcardOk.offCents : 0)), wa_id: /^[a-f0-9]{16}$/.test(data.wa || '') ? data.wa : '', wa_items: /^[a-f0-9]{16}$/.test(data.wa || '') ? [...new Set((data.items || []).map(i => String(i.id || '').split('--')[0]).filter(x => /^[a-z0-9-]+$/.test(x)))].join(',').slice(0, 490) : '' },
      custom_text: {
        shipping_address: { message: zone.note },
        submit: { message: [gift ? '✦ Bombe de bain Menthe & Eucalyptus esprit SPA offerte (valeur 12,99 €).' : '', loyaltyEmail ? '✦ Éclats Onaé Privilège crédités dès le paiement.' : '', '✦ Paiement sécurisé · retours sous 14 jours.'].filter(Boolean).join('  ') },
      },
      payment_intent_data: {
        description: 'Commande Onaé Paris',
        metadata: { source: 'onae_boutique' },
      },
    };
    /* Page de paiement Onaé (/paiement.html) : session « elements », formulaire Stripe intégré au site.
       En cas d'échec, on retombe sur la page Stripe hébergée ci-dessous. */
    const statCo = (sid, ui) => { try { require('./stats').checkout(req, { sid, cents: Number(params.metadata.expected_total) || 0, items: (data.items || []).map(i => String(i.id || '')), country, email: custEmail || '', ui }); } catch (_) {} };
    if (data.ui === 'elements' && /^pk_(live|test)_/.test(process.env.STRIPE_PUBLISHABLE_KEY || '')) {
      try {
        const { success_url, cancel_url, custom_text, ...base } = params;
        const es = await stripePost('checkout/sessions', {
          ...base,
          ui_mode: 'elements',
          billing_address_collection: 'auto',
          return_url: origin + '/checkout.html?success=1&session_id={CHECKOUT_SESSION_ID}',
        }, null, ELEMENTS_VERSION);
        try { if (reward) L.rename(loyaltyEmail, tmpRef, es.id); if (welcomeOk) ctx.welcome.rehold(welcomeOk.code, tmpRef, es.id); if (giftcardOk) ctx.giftcards.rehold(giftcardOk.code, tmpRef, es.id); } catch (_) {}
        statCo(es.id, 'elements');
        return send(200, { client_secret: es.client_secret, session_id: es.id, pk: process.env.STRIPE_PUBLISHABLE_KEY, email: custEmail || '', gift: !!gift, member: !!loyaltyEmail, expires_at: expiresAt });
      } catch (e) { console.error('Stripe elements refusé, page hébergée :', (e && e.message) || e); }
    }
    /* habillage Onaé de la page Stripe ; si Stripe refuse ce paramètre, la page s'ouvre quand même avec le style par défaut */
    let session;
    try { session = await stripePost('checkout/sessions', { ...params, branding_settings: CHECKOUT_BRANDING }, null, BRANDING_VERSION); }
    catch (e) {
      if (e && (e.type === 'invalid_request_error' || e.message === 'parse error')) { console.error('Stripe branding refusé, page par défaut :', e.message || e); session = await stripePost('checkout/sessions', params); }
      else throw e;
    }
    /* la réservation porte désormais le numéro de la session Stripe */
    try { if (reward) L.rename(loyaltyEmail, tmpRef, session.id); if (welcomeOk) ctx.welcome.rehold(welcomeOk.code, tmpRef, session.id); if (giftcardOk) ctx.giftcards.rehold(giftcardOk.code, tmpRef, session.id); } catch (_) {}
    statCo(session.id, 'hosted');
    send(200, { url: session.url, session_id: session.id });
  } catch(err) {
    releaseHolds();
    console.error('Stripe checkout error:', err);
    send(500, { error: 'stripe_error' });
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
function handleWebhook(req, res, dataDir, loyalty, welcome, whatsapp, giftcards) {
  const send = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };

  if (!process.env.STRIPE_WEBHOOK_SECRET) return send(503, { error: 'webhook_not_configured' });

  const chunks = []; let size = 0;
  req.on('data', c => { size += c.length; if (size > 1e6) { req.destroy(); return; } chunks.push(c); });
  req.on('end', () => {
    const rawBody = Buffer.concat(chunks).toString('utf8');
    const sig = req.headers['stripe-signature'] || '';

    if (!verifyWebhookSignature(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)) {
      console.warn('Stripe webhook: invalid signature');
      return send(400, { error: 'invalid_signature' });
    }

    let event;
    try { event = JSON.parse(rawBody); } catch(_) { return send(400, { error: 'invalid_json' }); }

    /* paiement confirmé tout de suite, ou plus tard pour les moyens de paiement différés */
    if (event.type === 'checkout.session.expired') {
      const o = event.data.object || {}, md = o.metadata || {};
      try { if (md.eclats_email && loyalty) loyalty.release(md.eclats_email, o.id); if (md.welcome_code && welcome) welcome.release(md.welcome_code, o.id); if (md.giftcard_code && giftcards) giftcards.release(md.giftcard_code, o.id); } catch (_) {}
      return send(200, { received: true });
    }
    if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') return send(200, { received: true });
    const session = event.data.object;
    (async () => {
      /* L'événement ne contient pas les articles : on relit la session avec ses line_items */
      let full = session;
      try { full = await stripeGet(`checkout/sessions/${encodeURIComponent(session.id)}?expand[]=line_items&expand[]=line_items.data.price.product`); }
      catch (e) { try { full = await stripeGet(`checkout/sessions/${encodeURIComponent(session.id)}?expand[]=line_items`); } catch (_) {} console.error('Stripe expand produits:', e && e.message); }

      if (full.payment_status !== 'paid') return;   // jamais de commande enregistrée sans paiement réel encaissé
      saveOrder(full, dataDir);
      if (whatsapp) whatsapp.onOrder(full);
      if (welcome && full.metadata && full.metadata.welcome_code) { try { welcome.markUsed(full.metadata.welcome_code, full.id); } catch (e) { console.error('welcome markUsed error:', e); } }
      if (giftcards && full.metadata && full.metadata.giftcard_code && full.metadata.giftcard_amount) {
        try { giftcards.debit(full.metadata.giftcard_code, Number(full.metadata.giftcard_amount), full.id); } catch (e) { console.error('giftcard debit error:', e); }
      }
      if (loyalty) {
        const md = full.metadata || {};
        try {
          if (md.eclats_reward && md.eclats_email) loyalty.redeem(md.eclats_email, md.eclats_reward, full.id);
          loyalty.creditOrders(md.eclats_email || full.customer_details?.email || full.customer_email || '');
        } catch (e) { console.error('Onaé Privilège error:', e); }
      }
      if (giftcards) { try { await issuePurchasedGiftcards(full, giftcards); } catch (e) { console.error('giftcard issue error:', e); } }
    })().finally(() => send(200, { received: true }));
  });
}

/* Émet un code de carte cadeau par carte achetée (une par unité), puis l'envoie par e-mail à la cliente.
   Idempotent (giftcards.issue ignore un sourceKey déjà vu) : un webhook rejoué ne crée jamais de doublon. */
async function issuePurchasedGiftcards(session, giftcards) {
  const email = String(session.customer_details?.email || session.customer_email || '').toLowerCase();
  const lines = session.line_items?.data || [];
  for (let i = 0; i < lines.length; i++) {
    const li = lines[i];
    const md = (li.price && typeof li.price.product === 'object' && li.price.product.metadata) || {};
    if (!md.product_id || !/^carte-cadeau-/.test(md.product_id)) continue;
    const qty = li.quantity || 1;
    const unitCents = Math.round((li.amount_total || 0) / qty);
    for (let u = 0; u < qty; u++) {
      const card = giftcards.issue(`${session.id}:${i}:${u}`, unitCents, email);
      if (card && email) {
        const N = require('./notify');
        if (N.canSend()) {
          const m = giftcardMail(card);
          N.sendMail({ ...m, to: email }).catch(() => {});
        }
      }
    }
  }
}

function giftcardMail(card) {
  const amount = (card.initial / 100).toFixed(2).replace('.', ',');
  const expires = new Date(card.expires).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return { subject: `Votre carte cadeau Onaé de ${amount} € ✦`, html: `<div style="max-width:560px;margin:auto;font:15px/1.7 Georgia,serif;color:#1a1216;padding:30px"><p style="font:600 11px Arial,sans-serif;letter-spacing:.28em;text-transform:uppercase;color:#b88a5a">Onaé Paris</p><h1 style="font-weight:400;font-size:28px;margin:6px 0 16px">Votre carte cadeau est prête.</h1><p>Merci pour votre commande. Voici votre carte cadeau Onaé d'une valeur de <b>${amount} €</b>, à utiliser vous-même ou à offrir.</p><p style="margin:26px 0;text-align:center"><span style="display:inline-block;padding:18px 32px;background:#2a0f18;color:#fff;letter-spacing:.14em;font:600 20px Arial,sans-serif;border-radius:2px">${card.code}</span></p><p>À saisir dans le champ « Carte cadeau » au moment du paiement, sur <a href="https://www.onaecosmetics.fr/panier.html" style="color:#b88a5a">onaecosmetics.fr</a>. Utilisable en plusieurs fois jusqu'à épuisement du solde, valable jusqu'au <b>${expires}</b>.</p><p style="color:#6f5e66">À très vite,<br>L'équipe Onaé</p></div>` };
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
      .map(li => {
        const md = (li.price && typeof li.price.product === 'object' && li.price.product.metadata) || {};
        return {
          id: md.product_id || '', bundle: md.bundle || '',
          name: li.description || '',
          qty:  li.quantity || 1,
          price: (li.amount_total || 0) / 100 / (li.quantity || 1),
        };
      });
    const shipLine = (session.line_items?.data || []).find(li => li.description?.startsWith('Livraison'));
    if (session.metadata && session.metadata.gift) items.push({ name: 'Bombe de bain Menthe & Eucalyptus esprit SPA (offerte)', qty: 1, price: 0, gift: true });

    const order = {
      number,
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent || '',
      uid: (session.metadata && session.metadata.uid) || '',
      livemode: !!session.livemode,
      at: new Date().toISOString(),
      status: 'Confirmée',
      email: String(session.customer_details?.email || session.customer_email || '').toLowerCase(),
      loyalty_email: (session.metadata && session.metadata.eclats_email) || '',
      discount: ((session.total_details?.amount_discount || 0) / 100),
      promo_code: (session.metadata && session.metadata.welcome_code) || '',
      expected_total: session.metadata && session.metadata.expected_total ? Number(session.metadata.expected_total) / 100 : null,
      name:  session.customer_details?.name  || '',
      phone: session.customer_details?.phone || '',
      city:  session.shipping_details?.address?.city || '',
      address: session.shipping_details?.address || null,
      items,
      subtotal: ((session.amount_total || 0) / 100),
      shipping: shipLine ? (shipLine.amount_total || 0) / 100 : 0,
      total: ((session.amount_total || 0) / 100),
      history: { Confirmée: new Date().toISOString() },
    };

    orders.push(order);
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
    console.log(`Onaé: commande ${number} enregistrée (${order.email})`);
    try { require('./guide').sendOrderMail(order).catch(() => {}); } catch (_) {}
    try { require('./notify').sendMail({ subject: `Nouvelle commande ${number} · ${order.total.toFixed(2).replace('.', ',')} €`, html: `<p><b>Nouvelle commande ${number}</b> de ${order.name || order.email} (${order.email}), ${order.total.toFixed(2).replace('.', ',')} €.</p><ul>${items.map(i => `<li>${i.qty} × ${String(i.name).replace(/</g, '&lt;')}</li>`).join('')}</ul><p>À préparer depuis l'espace admin : https://www.onaecosmetics.fr/admin/commandes</p>` }); } catch (_) {}
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
  /* Apple Pay / Google Pay sur la page de paiement du site : le domaine doit être déclaré chez Stripe */
  await safe('domaines_wallets', async () => {
    const l = await stripeGet('payment_method_domains?limit=20'); const have = (l.data || []).map(d => d.domain_name);
    for (const d of ['www.onaecosmetics.fr', 'onaecosmetics.fr']) if (!have.includes(d)) { try { await stripePost('payment_method_domains', { domain_name: d }); have.push(d + ' (ajouté)'); } catch (e) { have.push(d + ' : ' + (e.message || 'erreur')); } }
    const l2 = await stripeGet('payment_method_domains?limit=20');
    return (l2.data || []).map(d => ({ domaine: d.domain_name, actif: d.enabled, apple_pay: d.apple_pay && d.apple_pay.status, google_pay: d.google_pay && d.google_pay.status }));
  });
  console.log('[stripe-diag]', JSON.stringify(out));
}
setTimeout(() => { stripeDiagnostic().catch(e => console.error('[stripe-diag] echec', e && e.message)); }, 4000);

module.exports = { handleCheckout, handleWebhook, handleSessionGet, buildLineItems, verifyWebhookSignature };
