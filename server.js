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
};

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
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
const accountsRoute = require('./accounts')(DATA_DIR, readMembers, writeMembers);
const diagRoute = require('./diagnostic')(DATA_DIR, __dirname);
const { handleCheckout, handleWebhook, handleSessionGet } = require('./stripe');
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

http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0].replace(/\/$/, '') || '/';

  if (urlPath.startsWith('/api/auth/') || urlPath === '/api/me' || urlPath.startsWith('/api/me/')) { if (accountsRoute(req, res, urlPath)) return; res.writeHead(404); res.end('Not found'); return; }
  if (urlPath === '/api/checkout' && req.method === 'POST') return handleCheckout(req, res, __dirname);
  if (urlPath === '/api/checkout/session' && req.method === 'GET') return handleSessionGet(req, res);
  if (urlPath === '/api/stripe/webhook' && req.method === 'POST') return handleWebhook(req, res, DATA_DIR);
  if (urlPath === '/api/track' && req.method === 'POST') return handleTrack(req, res);
  if (urlPath === '/api/diagnostic' || urlPath.startsWith('/api/diagnostic/')) { if (diagRoute(req, res, urlPath) === false) { res.writeHead(404); res.end('Not found'); } return; }
  if (urlPath === '/api/partner' && req.method === 'POST') return handlePartner(req, res);
  if (urlPath === '/api/partner/export' && req.method === 'GET') {
    const key = new URL(req.url, 'http://x').searchParams.get('key');
    if (!process.env.NEWSLETTER_KEY || key !== process.env.NEWSLETTER_KEY) { res.writeHead(403); res.end('Forbidden'); return; }
    const csv = 'reference,date,type,nom,email,telephone,structure,compte,plateformes,audience,univers,lien,message,statut\n' + readPartners().map(m => [m.ref, m.at, m.type, m.name, m.email, m.phone, m.company, m.handle, (m.platforms || []).join(' / '), m.audience, m.niche, m.link, m.message, m.status].map(x => '"' + String(x ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="demandes-partenariat-onae.csv"' });
    res.end('\ufeff' + csv); return;
  }
  if (urlPath === '/api/contact' && req.method === 'POST') return handleContact(req, res);
  if (urlPath === '/api/contact/export' && req.method === 'GET') {
    const key = new URL(req.url, 'http://x').searchParams.get('key');
    if (!process.env.NEWSLETTER_KEY || key !== process.env.NEWSLETTER_KEY) { res.writeHead(403); res.end('Forbidden'); return; }
    const csv = 'reference,date,nom,email,telephone,sujet,commande,message,statut\n' + readMsgs().map(m => [m.ref, m.at, m.name, m.email, m.phone, m.topic, m.order, m.message, m.status].map(x => '"' + String(x ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="messages-contact-onae.csv"' });
    res.end('﻿' + csv); return;
  }
  if (urlPath === '/api/newsletter' && req.method === 'POST') return handleNewsletter(req, res);
  if (urlPath === '/api/loyalty' && req.method === 'POST') return handleLoyalty(req, res);
  if (urlPath === '/api/loyalty/export' && req.method === 'GET') {
    const key = new URL(req.url, 'http://x').searchParams.get('key');
    if (!process.env.NEWSLETTER_KEY || key !== process.env.NEWSLETTER_KEY) { res.writeHead(403); res.end('Forbidden'); return; }
    const csv = 'email,prenom,anniversaire,eclats,palier,source,date\n' + readMembers().map(m => [m.email, m.name, m.birthday, m.points, m.tier, m.source, m.at].map(x => '"' + String(x ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="fidelite-onae.csv"' });
    res.end(csv); return;
  }
  if (urlPath === '/api/newsletter/export' && req.method === 'GET') {
    const key = new URL(req.url, 'http://x').searchParams.get('key');
    if (!process.env.NEWSLETTER_KEY || key !== process.env.NEWSLETTER_KEY) { res.writeHead(403); res.end('Forbidden'); return; }
    const subs = readSubs();
    const csv = 'email,prenom,source,date\n' + subs.map(s => [s.email, s.name, s.source, s.at].map(x => '"' + String(x || '').replace(/"/g, '""') + '"').join(',')).join('\n');
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="newsletter-onae.csv"' });
    res.end(csv); return;
  }
  // never serve stored data as a static file
  if (urlPath.startsWith('/data/') || urlPath === '/accounts.js' || urlPath === '/server.js' || urlPath === '/diagnostic.js' || urlPath === '/stripe.js' || /\.md$/i.test(urlPath)) { res.writeHead(404); res.end('Not found'); return; }

  // Fichiers statiques (images, etc.)
  const staticFile = path.join(__dirname, urlPath);
  const ext = path.extname(urlPath).toLowerCase();
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
    res.writeHead(200, { 'Content-Type': MIME[ext], 'Cache-Control': cc, 'Accept-Ranges': 'bytes', 'Content-Length': size });
    fs.createReadStream(staticFile).pipe(res);
    return;
  }

  const file = ROUTES[urlPath] || ROUTES['/'];
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Onaé boutique live on port ${PORT}`));
