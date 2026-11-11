const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json; charset=utf-8',
};

const ROUTES = {
  '/': path.join(__dirname, 'index.html'),
  '/product': path.join(__dirname, 'product.html'),
  '/product/serum-anti-age': path.join(__dirname, 'product.html'),
  '/concours': path.join(__dirname, 'concours.html'),
  '/reglement-concours': path.join(__dirname, 'reglement-concours.html'),
};

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

// ---------- Mode pré-lancement ----------
// PRELAUNCH=1  → toutes les pages du site redirigent vers /concours
// PREVIEW_KEY  → https://www.onaecosmetics.fr/?acces=<clé> ouvre la boutique pour ce navigateur (cookie 30 j)
const PRELAUNCH_OPEN = new Set(['/admin', '/admin/login', '/admin/logout', '/concours', '/concours.html', '/reglement-concours', '/reglement-concours.html', '/mentions-legales.html', '/cgv.html']);
function prelaunchGate(req, res, urlPath){
  if (process.env.PRELAUNCH !== '1') return false;
  const ext = path.extname(urlPath).toLowerCase();
  if (ext && ext !== '.html') return false;                 // images, scripts, JSON… restent servis
  if (urlPath.startsWith('/api/') || PRELAUNCH_OPEN.has(urlPath)) return false;
  const key = process.env.PREVIEW_KEY;
  const q = new URL(req.url, 'http://x').searchParams.get('acces');
  if (key && q === key) {
    res.writeHead(302, { 'Set-Cookie': 'onae_preview=' + key + '; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure', Location: urlPath });
    res.end(); return true;
  }
  const cookie = String(req.headers.cookie || '');
  if (key && cookie.split(/;\s*/).includes('onae_preview=' + key)) return false;
  res.writeHead(302, { Location: '/concours', 'Cache-Control': 'no-store' }); res.end(); return true;
}


/* Clé d'accès aux espaces privés (exports, modération) : message clair si elle manque ou ne correspond pas */
const admin = require('./admin');
function keyCheck(res, key, req){
  if (admin.allowed(req, key)) return true;
  const why = !admin.secret() ? "La variable NEWSLETTER_KEY n'est pas définie sur Railway (service onae-boutique, onglet Variables)."
    : "Connectez-vous d'abord à l'espace administrateur avec votre clé.";
  res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Accès refusé</title><div style="font:15px/1.6 system-ui;max-width:520px;margin:12vh auto;padding:0 20px"><h1 style="font-weight:500">Accès réservé</h1><p>${why}</p><p><a href="/admin" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#1c1418;color:#fff;text-decoration:none">Ouvrir l'espace administrateur</a></p></div>`);
  return false;
}

// ---------- Jeu-concours pré-lancement (data/concours.json) ----------
const CC_FILE = path.join(DATA_DIR, 'concours.json');
const ccHits = new Map();
function readEntries(){ try { return JSON.parse(fs.readFileSync(CC_FILE, 'utf8')); } catch(_) { return []; } }
function handleConcours(req, res){
  const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now(), hits = (ccHits.get(ip) || []).filter(t => now - t < 3600e3);
  if (hits.length >= 10) return send(429, { error: 'too_many' });
  let body = '';
  req.on('data', c => { body += c; if (body.length > 4096) req.destroy(); });
  req.on('end', () => {
    let d; try { d = JSON.parse(body || '{}'); } catch(_) { return send(400, { error: 'invalid_json' }); }
    if (d.website) return send(200, { ok: true });            // pot de miel anti-robots
    const clean = (v, n) => String(v ?? '').replace(/[<>"]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
    const firstName = clean(d.firstName, 60), lastName = clean(d.lastName, 60);
    const email = String(d.email || '').trim().toLowerCase();
    if (!firstName) return send(400, { error: 'first_name_required' });
    if (!lastName) return send(400, { error: 'last_name_required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return send(400, { error: 'invalid_email' });
    if (d.rules !== true) return send(400, { error: 'rules_required' });
    hits.push(now); ccHits.set(ip, hits);
    const list = readEntries();
    const existing = list.find(e => e.email === email);
    if (existing) {
      if (d.newsletter === true && !existing.newsletter) { existing.newsletter = true; existing.newsletterAt = new Date().toISOString(); try { fs.writeFileSync(CC_FILE, JSON.stringify(list, null, 2)); } catch(_) {} }
      return send(200, { ok: true, already: true, firstName: existing.firstName });
    }
    list.push({ firstName, lastName, email, newsletter: d.newsletter === true, source: clean(d.source, 40), at: new Date().toISOString() });
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(CC_FILE, JSON.stringify(list, null, 2)); }
    catch(e) { console.error('concours write failed', e); return send(500, { error: 'storage' }); }
    console.log('[concours] nouvelle participation', list.length);
    send(200, { ok: true, already: false, firstName });
  });
}

const NL_FILE = path.join(DATA_DIR, 'newsletter.json');
function readSubs(){ try { return JSON.parse(fs.readFileSync(NL_FILE, 'utf8')); } catch(_) { return []; } }

function handleNewsletter(req, res){
  let body = '';
  req.on('data', c => { body += c; if (body.length > 4096) req.destroy(); });
  req.on('end', () => {
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
    let data; try { data = JSON.parse(body || '{}'); } catch(_) { return send(400, { error: 'invalid_json' }); }
    const email = String(data.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return send(400, { error: 'invalid_email' });
    const subs = readSubs();
    if (!subs.some(s => s.email === email)) {
      subs.push({ email, name: String(data.name || '').trim().slice(0, 60), source: String(data.source || '').slice(0, 40), at: new Date().toISOString() });
      try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(NL_FILE, JSON.stringify(subs, null, 2)); }
      catch(e) { console.error('newsletter write failed', e); return send(500, { error: 'storage' }); }
    }
    send(200, { ok: true });
  });
}

// ---------- Programme fidélité : inscriptions (data/loyalty.json) ----------
const LOY_FILE = path.join(DATA_DIR, 'loyalty.json');
function readMembers(){ try { return JSON.parse(fs.readFileSync(LOY_FILE, 'utf8')); } catch(_) { return []; } }
function writeMembers(m){ fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(LOY_FILE, JSON.stringify(m, null, 2)); }
const loyalty = require('./loyalty')(DATA_DIR);
const welcome = require('./welcome')(DATA_DIR);
const whatsapp = require('./whatsapp')(DATA_DIR, __dirname);
/* Pop-up de sortie : code de bienvenue −10 % (1 par e-mail, 7 jours, usage unique) + inscription newsletter */
function handleWelcome(req, res){
  let body = '';
  req.on('data', c => { body += c; if (body.length > 2048) req.destroy(); });
  req.on('end', () => {
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
    let d; try { d = JSON.parse(body || '{}'); } catch(_) { return send(400, { error: 'invalid_json' }); }
    const email = String(d.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return send(400, { error: 'invalid_email' });
    let r; try { r = welcome.issue(email, String(d.source || 'exit-popup').slice(0, 30)); } catch(e) { console.error('welcome write failed', e); return send(500, { error: 'storage' }); }
    if (r.status === 'used') return send(409, { error: 'already_used' });
    const src = String(d.source || 'exit-popup').replace(/[^a-z-]/g, '').slice(0, 30) || 'exit-popup';
    const name = String(d.name || '').replace(/[<>]/g, '').trim().slice(0, 60);
    try { const subs = readSubs(); if (!subs.some(s => s.email === email)) { subs.push({ email, name, source: src, at: new Date().toISOString() }); fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(NL_FILE, JSON.stringify(subs, null, 2)); } } catch(_) {}
    /* pop-up de bienvenue : inscription Onaé Privilège (50 éclats offerts), même logique que /api/loyalty */
    let loy = null;
    if (d.loyalty === true) {
      try {
        const members = readMembers(); let m = members.find(x => x.email === email), created = false;
        if (!m) { m = { email, name, birthday: '', points: 50, tier: 'Rose', source: src, at: new Date().toISOString() }; members.push(m); created = true; fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(LOY_FILE, JSON.stringify(members, null, 2)); }
        try { loyalty.creditOrders(email); m = readMembers().find(x => x.email === email) || m; } catch(_) {}
        loy = { created, points: m.points, tier: m.tier };
      } catch(e) { console.error('welcome loyalty failed', e); }
    }
    send(200, { ok: true, code: r.code, percent: r.percent, expires: r.expires, again: !!r.again, loyalty: loy });
  });
}
/* Bilan Onaé Privilège au démarrage (aucune donnée personnelle) : vérifie que les commandes des membres sont bien créditées */
try {
  const L = JSON.parse(fs.readFileSync(LOY_FILE, 'utf8') || '[]'), O = (() => { try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'orders.json'), 'utf8')); } catch (_) { return []; } })();
  const isM = e => L.some(m => String(m.email || '').toLowerCase() === String(e || '').toLowerCase());
  console.log('[loyalty-diag] ' + JSON.stringify({ membres: L.length, commandes: O.length, dernieres: O.slice(-5).map(o => ({ n: o.number, soins: (o.items || []).filter(i => !i.gift).reduce((t, i) => t + (Number(i.price) || 0) * (Number(i.qty) || 1), 0), membre: isM(o.loyalty_email || o.email), eclats: o.eclats == null ? null : o.eclats, credite: !!o.eclats_credited })) }));
} catch (e) { console.log('[loyalty-diag] indisponible', e.message); }
const accountsRoute = require('./accounts')(DATA_DIR, readMembers, writeMembers, email => loyalty.creditOrders(email));
const diagRoute = require('./diagnostic')(DATA_DIR, __dirname);
const reviewsRoute = require('./reviews')(DATA_DIR, __dirname);
function readReviews(){ try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'reviews.json'), 'utf8')); } catch(_) { return []; } }
function productNames(){ try { return Object.fromEntries(JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8')).products.map(p => [p.id, (p.name + ' ' + (p.name_line2 || '')).trim()])); } catch(_) { return {}; } }
function reviewStats(){ try { return { reviewsPending: JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'reviews.json'), 'utf8')).filter(r => r.status === 'en_attente').length }; } catch(_) { return {}; } }
const { handleCheckout, handleWebhook, handleSessionGet } = require('./stripe');
const seoRoute = require('./seo')(__dirname);
function handleLoyalty(req, res){
  let body = '';
  req.on('data', c => { body += c; if (body.length > 4096) req.destroy(); });
  req.on('end', () => {
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
    let data; try { data = JSON.parse(body || '{}'); } catch(_) { return send(400, { error: 'invalid_json' }); }
    const email = String(data.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return send(400, { error: 'invalid_email' });
    if (data.consent !== true) return send(400, { error: 'consent_required' });
    const bday = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])$/.test(String(data.birthday || '')) ? data.birthday : '';
    const members = readMembers();
    let m = members.find(x => x.email === email), created = false;
    if (!m) {
      m = { email, name: String(data.name || '').trim().slice(0, 60), birthday: bday, points: 50, tier: 'Rose', source: String(data.source || '').slice(0, 40), at: new Date().toISOString() };
      members.push(m); created = true;
      try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(LOY_FILE, JSON.stringify(members, null, 2)); }
      catch(e) { console.error('loyalty write failed', e); return send(500, { error: 'storage' }); }
    }
    try { loyalty.creditOrders(email); m = readMembers().find(x => x.email === email) || m; } catch(e) { console.error('loyalty credit failed', e); }
    send(200, { ok: true, created, points: m.points, tier: m.tier, name: m.name });
  });
}

// ---------- Formulaire de contact (data/contact.json) ----------
const CT_FILE = path.join(DATA_DIR, 'contact.json');
const ctHits = new Map();
function readMsgs(){ try { return JSON.parse(fs.readFileSync(CT_FILE, 'utf8')); } catch(_) { return []; } }
function handleContact(req, res){
  const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now(), hits = (ctHits.get(ip) || []).filter(t => now - t < 3600e3);
  if (hits.length >= 6) return send(429, { error: 'too_many' });
  let body = '';
  req.on('data', c => { body += c; if (body.length > 12000) req.destroy(); });
  req.on('end', () => {
    let d; try { d = JSON.parse(body || '{}'); } catch(_) { return send(400, { error: 'invalid_json' }); }
    if (d.website) return send(200, { ok: true });            // pot de miel anti-robots
    const clean = (v, n) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, n);
    const email = String(d.email || '').trim().toLowerCase();
    const name = clean(d.name, 80), message = clean(d.message, 3000);
    const TOPICS = ['commande', 'conseil', 'retour', 'fidelite', 'partenariat', 'autre'];
    if (!name) return send(400, { error: 'name_required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return send(400, { error: 'invalid_email' });
    if (message.length < 10) return send(400, { error: 'message_too_short' });
    if (d.consent !== true) return send(400, { error: 'consent_required' });
    const msgs = readMsgs();
    const ref = 'ONA-' + Date.now().toString(36).toUpperCase().slice(-6);
    msgs.push({ ref, name, email, phone: clean(d.phone, 20), topic: TOPICS.includes(d.topic) ? d.topic : 'autre', order: clean(d.order, 40), message, at: new Date().toISOString(), status: 'nouveau' });
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(CT_FILE, JSON.stringify(msgs, null, 2)); }
    catch(e) { console.error('contact write failed', e); return send(500, { error: 'storage' }); }
    hits.push(now); ctHits.set(ip, hits);
    console.log('[contact] nouveau message', ref, d.topic);
    send(200, { ok: true, ref });
  });
}


// ---------- Presse & partenariats (data/partners.json) ----------
const PT_FILE = path.join(DATA_DIR, 'partners.json');
const ptHits = new Map();
function readPartners(){ try { return JSON.parse(fs.readFileSync(PT_FILE, 'utf8')); } catch(_) { return []; } }
function handlePartner(req, res){
  const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now(), hits = (ptHits.get(ip) || []).filter(t => now - t < 3600e3);
  if (hits.length >= 5) return send(429, { error: 'too_many' });
  let body = '';
  req.on('data', c => { body += c; if (body.length > 12000) req.destroy(); });
  req.on('end', () => {
    let d; try { d = JSON.parse(body || '{}'); } catch(_) { return send(400, { error: 'invalid_json' }); }
    if (d.website) return send(200, { ok: true });
    const clean = (v, n) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, n);
    const TYPES = ['createur', 'presse', 'professionnel', 'marque', 'autre'];
    const type = TYPES.includes(d.type) ? d.type : 'autre';
    const email = String(d.email || '').trim().toLowerCase();
    const name = clean(d.name, 80), message = clean(d.message, 3000);
    if (!name) return send(400, { error: 'name_required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return send(400, { error: 'invalid_email' });
    if (message.length < 10) return send(400, { error: 'message_too_short' });
    if (d.consent !== true) return send(400, { error: 'consent_required' });
    const list = readPartners();
    const ref = 'PRT-' + Date.now().toString(36).toUpperCase().slice(-6);
    const platforms = Array.isArray(d.platforms) ? d.platforms.slice(0, 8).map(x => clean(x, 24)) : [];
    list.push({ ref, type, name, email, phone: clean(d.phone, 20), company: clean(d.company, 120), handle: clean(d.handle, 120), platforms, audience: clean(d.audience, 30), niche: clean(d.niche, 80), link: clean(d.link, 300), message, at: new Date().toISOString(), status: 'nouveau' });
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(PT_FILE, JSON.stringify(list, null, 2)); }
    catch(e) { console.error('partner write failed', e); return send(500, { error: 'storage' }); }
    hits.push(now); ptHits.set(ip, hits);
    console.log('[partenariat] nouvelle demande', ref, type);
    send(200, { ok: true, ref });
  });
}

// ---------- Suivi de commande (data/orders.json) ----------
const trHits = new Map();
function handleTrack(req, res){
  const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now(), hits = (trHits.get(ip) || []).filter(t => now - t < 15 * 60e3);
  if (hits.length >= 12) return send(429, { error: 'too_many' });
  let body = '';
  req.on('data', c => { body += c; if (body.length > 2048) req.destroy(); });
  req.on('end', () => {
    let d; try { d = JSON.parse(body || '{}'); } catch(_) { return send(400, { error: 'invalid_json' }); }
    hits.push(now); trHits.set(ip, hits);
    const num = String(d.number || '').trim().toUpperCase().replace(/^#/, '');
    const contact = String(d.contact || '').trim().toLowerCase();
    if (!num || !contact) return send(400, { error: 'missing' });
    const digits = s => String(s || '').replace(/\D/g, '').replace(/^33/, '0');
    let orders = []; try { orders = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'orders.json'), 'utf8')); } catch(_) {}
    const o = orders.find(x => String(x.number || x.id).toUpperCase() === num &&
      ((x.email && x.email.toLowerCase() === contact) || (x.phone && digits(x.phone) && digits(x.phone) === digits(contact))));
    if (!o) return send(404, { error: 'not_found' });
    send(200, { order: { number: o.number || o.id, at: o.at, status: o.status || 'Confirmée', history: o.history || {}, carrier: o.carrier || '', trackingNumber: o.trackingNumber || '', tracking: o.tracking || '',
      city: o.city || '', items: (o.items || []).map(i => ({ id: i.id, name: i.name || '', qty: i.qty || 1, price: i.price || 0 })), subtotal: o.subtotal || 0, shipping: o.shipping || 0, total: o.total || 0 } });
  });
}

// ── Performance : compression Brotli/Gzip + revalidation (ETag / 304) ─────────
// Toutes les réponses texte (pages, catalogue, scripts, styles, SVG) partent compressées,
// et un navigateur qui a déjà la bonne version reçoit un simple « 304 » au lieu de tout retélécharger.
// Les versions compressées sont gardées en mémoire (une seule compression par version de fichier).
const zlib = require('zlib');
const crypto = require('crypto');
const ZTYPES = /^(text\/|application\/(json|javascript|xml|manifest\+json)|image\/svg\+xml)/;
const ZCACHE = new Map();
function zcache(key, make) {
  let v = ZCACHE.get(key);
  if (v) { ZCACHE.delete(key); ZCACHE.set(key, v); return v; }
  v = make(); ZCACHE.set(key, v);
  if (ZCACHE.size > 400) ZCACHE.delete(ZCACHE.keys().next().value);
  return v;
}
function enableCompression(req, res) {
  if (req.method !== 'GET' || req.url.startsWith('/api/')) return;
  const ae = String(req.headers['accept-encoding'] || '');
  const enc = /\bbr\b/.test(ae) ? 'br' : /\bgzip\b/.test(ae) ? 'gzip' : null;
  const _wh = res.writeHead.bind(res), _write = res.write.bind(res), _end = res.end.bind(res);
  let held = null;                                   // en-têtes retenus jusqu'à ce que le corps soit connu
  res.writeHead = (code, a, b) => { held = { code, headers: Object.assign({}, typeof a === 'object' && a ? a : (b || {})) }; return res; };
  const flush = () => { if (held && !res.headersSent) { _wh(held.code, held.headers); } held = null; };
  res.write = (...args) => { flush(); return _write(...args); };   // flux (vidéos, plages d'octets) : inchangé
  res.end = (body, ...rest) => {
    if (typeof body === 'function') { rest.unshift(body); body = undefined; }
    if (!held && !res.headersSent) held = { code: res.statusCode, headers: {} };
    if (!held || body == null || (held.code !== 200)) { flush(); return _end(body, ...rest); }
    const h = held.headers, get = n => { const k = Object.keys(h).find(x => x.toLowerCase() === n); return k ? h[k] : res.getHeader(n); };
    const type = String(get('content-type') || '');
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body), typeof rest[0] === 'string' ? rest[0] : 'utf8');
    if (!ZTYPES.test(type) || get('content-encoding') || buf.length < 1024) { flush(); return _end(body, ...rest); }
    for (const k of Object.keys(h)) if (k.toLowerCase() === 'content-length') delete h[k];
    const tag = '"' + crypto.createHash('sha1').update(buf).digest('base64').slice(0, 22) + '"';
    h['ETag'] = tag; h['Vary'] = 'Accept-Encoding';
    const inm = String(req.headers['if-none-match'] || '');
    if (inm && inm.split(/\s*,\s*/).some(t => t.replace(/^W\//, '').replace(/-(br|gzip)"$/, '"') === tag)) {
      held = null; _wh(304, { 'ETag': tag, 'Vary': 'Accept-Encoding', 'Cache-Control': get('cache-control') || 'no-cache' }); return _end();
    }
    let out = buf;
    if (enc) {
      out = zcache(tag + enc, () => enc === 'br'
        ? zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length } })
        : zlib.gzipSync(buf, { level: 9 }));
      h['Content-Encoding'] = enc;
    }
    h['Content-Length'] = out.length;
    held = null; _wh(200, h); return _end(out);
  };
}

http.createServer((req, res) => {
  enableCompression(req, res);
  const urlPath = req.url.split('?')[0].replace(/\/$/, '') || '/';
  if (prelaunchGate(req, res, urlPath)) return;
  if (admin.route(req, res, urlPath, { entries: readEntries, stats: reviewStats, reviews: readReviews, names: productNames, wa: whatsapp.summary })) return;   // espace administrateur /admin
  if (urlPath === '/products.json' && req.method === 'GET') {          // catalogue + notes réelles (avis publiés), pour toutes les cartes du site
    try {
      const cat = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8'));
      const pub = readReviews().filter(r => r.status === 'publie'), agg = {};
      pub.forEach(r => { const a = agg[r.productId] || (agg[r.productId] = { n: 0, s: 0 }); a.n++; a.s += r.rating; });
      (cat.products || []).forEach(p => { const a = agg[p.id]; p.rating = a ? Math.round(a.s / a.n * 10) / 10 : 0; p.review_count = a ? a.n : 0; });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify(cat)); return;
    } catch (e) { console.error('products.json', e); }
  }
  if (seoRoute(req, res, urlPath)) return;          // robots.txt, sitemap.xml, llms.txt, /produits/<slug>

  if (urlPath.startsWith('/api/auth/') || urlPath === '/api/me' || urlPath.startsWith('/api/me/')) { if (accountsRoute(req, res, urlPath)) return; res.writeHead(404); res.end('Not found'); return; }
  if (urlPath.startsWith('/api/wa/')) { whatsapp.route(req, res, urlPath); return; }
  if (urlPath === '/api/welcome' && req.method === 'POST') return handleWelcome(req, res);
  if (urlPath === '/api/welcome/check' && req.method === 'GET') { const r = welcome.check(new URL(req.url, 'http://x').searchParams.get('code')); res.writeHead(r.ok ? 200 : 404, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end(JSON.stringify(r.ok ? { ok: true, code: r.code, percent: r.percent, expires: r.expires } : r)); }
  if (urlPath === '/api/checkout' && req.method === 'POST') return handleCheckout(req, res, __dirname, { user: accountsRoute.currentUser(req), loyalty, welcome, whatsapp });
  if (urlPath === '/api/checkout/session' && req.method === 'GET') return handleSessionGet(req, res);
  if (urlPath === '/api/stripe/webhook' && req.method === 'POST') return handleWebhook(req, res, DATA_DIR, loyalty, welcome, whatsapp);
  if (urlPath === '/api/track' && req.method === 'POST') return handleTrack(req, res);
  if (urlPath === '/api/reviews' || urlPath.startsWith('/api/reviews/')) { if (!reviewsRoute(req, res, urlPath)) { res.writeHead(404); res.end('Not found'); } return; }
  if (urlPath === '/api/diagnostic' || urlPath.startsWith('/api/diagnostic/')) { if (diagRoute(req, res, urlPath) === false) { res.writeHead(404); res.end('Not found'); } return; }
  if (urlPath === '/api/partner' && req.method === 'POST') return handlePartner(req, res);
  if (urlPath === '/api/partner/export' && req.method === 'GET') {
    const key = new URL(req.url, 'http://x').searchParams.get('key');
    if (!keyCheck(res, key, req)) return;
    const csv = 'reference,date,type,nom,email,telephone,structure,compte,plateformes,audience,univers,lien,message,statut\n' + readPartners().map(m => [m.ref, m.at, m.type, m.name, m.email, m.phone, m.company, m.handle, (m.platforms || []).join(' / '), m.audience, m.niche, m.link, m.message, m.status].map(x => '"' + String(x ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="demandes-partenariat-onae.csv"' });
    res.end('\ufeff' + csv); return;
  }
  if (urlPath === '/api/contact' && req.method === 'POST') return handleContact(req, res);
  if (urlPath === '/api/contact/export' && req.method === 'GET') {
    const key = new URL(req.url, 'http://x').searchParams.get('key');
    if (!keyCheck(res, key, req)) return;
    const csv = 'reference,date,nom,email,telephone,sujet,commande,message,statut\n' + readMsgs().map(m => [m.ref, m.at, m.name, m.email, m.phone, m.topic, m.order, m.message, m.status].map(x => '"' + String(x ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="messages-contact-onae.csv"' });
    res.end('﻿' + csv); return;
  }
  if (urlPath === '/api/concours' && req.method === 'POST') return handleConcours(req, res);
  if (urlPath === '/api/concours/admin' && req.method === 'GET') {        // ancienne adresse : renvoie vers /admin (et connecte si la clé est bonne)
    const key = new URL(req.url, 'http://x').searchParams.get('key');
    const h = { Location: '/admin', 'Cache-Control': 'no-store' };
    if (admin.keyMatches(key)) h['Set-Cookie'] = 'onae_admin=' + require('crypto').createHash('sha256').update('onae-admin|' + admin.secret()).digest('hex').slice(0, 48) + '; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure';
    res.writeHead(303, h); res.end(); return;
  }
  if (urlPath === '/api/concours/export' && req.method === 'GET') {
    const key = new URL(req.url, 'http://x').searchParams.get('key');
    if (!keyCheck(res, key, req)) return;
    const csv = 'prenom,nom,email,newsletter,source,date\n' + readEntries().map(m => [m.firstName, m.lastName, m.email, m.newsletter ? 'oui' : 'non', m.source, m.at].map(x => '"' + String(x ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="participants-concours-onae.csv"' });
    res.end('﻿' + csv); return;
  }
  if (urlPath === '/api/newsletter' && req.method === 'POST') return handleNewsletter(req, res);
  if (urlPath === '/api/loyalty' && req.method === 'POST') return handleLoyalty(req, res);
  if (urlPath === '/api/loyalty/export' && req.method === 'GET') {
    const key = new URL(req.url, 'http://x').searchParams.get('key');
    if (!keyCheck(res, key, req)) return;
    const csv = 'email,prenom,anniversaire,eclats,palier,source,date\n' + readMembers().map(m => [m.email, m.name, m.birthday, m.points, m.tier, m.source, m.at].map(x => '"' + String(x ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="fidelite-onae.csv"' });
    res.end(csv); return;
  }
  if (urlPath === '/api/newsletter/export' && req.method === 'GET') {
    const key = new URL(req.url, 'http://x').searchParams.get('key');
    if (!keyCheck(res, key, req)) return;
    const subs = readSubs();
    const csv = 'email,prenom,source,date\n' + subs.map(s => [s.email, s.name, s.source, s.at].map(x => '"' + String(x || '').replace(/"/g, '""') + '"').join(',')).join('\n');
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="newsletter-onae.csv"' });
    res.end(csv); return;
  }
  // never serve stored data as a static file
  if (urlPath.startsWith('/data/') || urlPath.startsWith('/scratchpad/') || urlPath === '/accounts.js' || urlPath === '/loyalty.js' || urlPath === '/welcome.js' || urlPath === '/whatsapp.js' || urlPath === '/admin.js' || urlPath === '/reviews.js' || urlPath === '/notify.js' || urlPath === '/server.js' || urlPath === '/diagnostic.js' || urlPath === '/stripe.js' || urlPath === '/seo.js' || /\.md$/i.test(urlPath) || /\.env(\.|$)/i.test(urlPath) || urlPath.includes('/.env') || /\.(sql|bak|log|config|cfg|ini|yaml|yml|xml|pem|key|crt|p12|pfx)$/i.test(urlPath)) { res.writeHead(404); res.end('Not found'); return; }

  // Fichiers statiques (images, etc.)
  const staticFile = path.join(__dirname, urlPath);
  const ext = path.extname(urlPath).toLowerCase();
  if (ext === '.html' && fs.existsSync(staticFile)) {
    fs.readFile(staticFile, 'utf8', (err, html) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
      res.end(seoRoute.enhance(html, urlPath));
    });
    return;
  }
  if (ext && MIME[ext] && fs.existsSync(staticFile)) {
    const cc = (ext === '.html' || ext === '.js' || ext === '.css' || ext === '.json') ? 'no-cache' : 'public, max-age=86400';
    const size = fs.statSync(staticFile).size;
    const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (range) {                                   // byte ranges: required by iOS Safari for <video>
      let start = range[1] === '' ? size - Number(range[2]) : Number(range[1]);
      let end = range[1] !== '' && range[2] !== '' ? Number(range[2]) : size - 1;
      if (isNaN(start) || start < 0 || start >= size || end < start) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return; }
      end = Math.min(end, size - 1);
      res.writeHead(206, { 'Content-Type': MIME[ext], 'Cache-Control': cc, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
      fs.createReadStream(staticFile, { start, end }).pipe(res);
      return;
    }
    if (ZTYPES.test(MIME[ext]) && req.method === 'GET') {   // texte : lu d'un bloc pour partir compressé (+ ETag)
      fs.readFile(staticFile, (err, buf) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[ext], 'Cache-Control': cc });
        res.end(buf);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext], 'Cache-Control': cc, 'Accept-Ranges': 'bytes', 'Content-Length': size });
    fs.createReadStream(staticFile).pipe(res);
    return;
  }

  // URL inconnue : vrai code 404 (évite les « soft 404 » pénalisés par Google), avec la page d'accueil pour ne perdre personne
  const known = ROUTES[urlPath];
  const file = known || ROUTES['/'];
  fs.readFile(file, 'utf8', (err, html) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    if (!known) html = html.replace('</title>', '</title>\n<meta name="robots" content="noindex">');
    res.writeHead(known ? 200 : 404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(known ? seoRoute.enhance(html, urlPath) : html);
  });
}).listen(PORT, () => console.log(`Onaé boutique live on port ${PORT}`));
