/* Onaé — avis clients
   POST /api/reviews                    dépôt d'un avis (en attente de modération)
   GET  /api/reviews?product=<id>       avis publiés d'un produit + moyenne + répartition
   GET  /api/reviews/admin?key=…        page de modération (NEWSLETTER_KEY)
   POST /api/reviews/moderate?key=…     { id, status: 'publie' | 'refuse' }
   Tous les avis conformes sont publiés, positifs comme négatifs. Mention « Achat vérifié »
   uniquement si l'e-mail correspond à une commande contenant le produit.            */
const fs = require('fs');
const path = require('path');

module.exports = function (DATA_DIR, ROOT) {
  const FILE = path.join(DATA_DIR, 'reviews.json');
  const hits = new Map();
  const read = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (_) { return []; } };
  const write = l => { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(l, null, 2)); };
  const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
  const clean = (v, n) => String(v ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
  const keyOk = req => { const k = new URL(req.url, 'http://x').searchParams.get('key'); return !!process.env.NEWSLETTER_KEY && k === process.env.NEWSLETTER_KEY; };
  const catalog = () => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'products.json'), 'utf8')).products || []; } catch (_) { return []; } };
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const SKINS = ['Sèche', 'Normale', 'Mixte', 'Grasse', 'Sensible'];

  function verified(email, product) {
    let orders = []; try { orders = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'orders.json'), 'utf8')); } catch (_) {}
    const n = norm(product.name);
    return orders.some(o => norm(o.email) === email && (o.items || []).some(i => norm(i.name).includes(n)));
  }
  const pub = r => ({ id: r.id, name: r.name, rating: r.rating, title: r.title, text: r.text, skin: r.skin || '', date: r.at, verified: !!r.verified });

  function list(req, res) {
    const pid = new URL(req.url, 'http://x').searchParams.get('product');
    const rs = read().filter(r => r.productId === pid && r.status === 'publie').sort((a, b) => b.at.localeCompare(a.at));
    const bars = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }; rs.forEach(r => bars[r.rating]++);
    const avg = rs.length ? Math.round(rs.reduce((s, r) => s + r.rating, 0) / rs.length * 10) / 10 : 0;
    send(res, 200, { count: rs.length, avg, bars, reviews: rs.map(pub) });
  }

  function create(req, res) {
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < 3600e3);
    if (h.length >= 5) return send(res, 429, { error: 'too_many' });
    let body = '';
    req.on('data', c => { body += c; if (body.length > 12000) req.destroy(); });
    req.on('end', () => {
      let d; try { d = JSON.parse(body || '{}'); } catch (_) { return send(res, 400, { error: 'invalid_json' }); }
      if (d.website) return send(res, 200, { ok: true });                         // pot de miel
      const product = catalog().find(p => p.id === d.productId);
      if (!product) return send(res, 400, { error: 'product' });
      const rating = parseInt(d.rating, 10);
      const email = String(d.email || '').trim().toLowerCase();
      const name = clean(d.name, 40), title = clean(d.title, 90), text = String(d.text ?? '').replace(/[<>]/g, '').trim().slice(0, 2000);
      if (!(rating >= 1 && rating <= 5)) return send(res, 400, { error: 'rating' });
      if (text.length < 20) return send(res, 400, { error: 'text_too_short' });
      if (!name) return send(res, 400, { error: 'name' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return send(res, 400, { error: 'email' });
      if (d.consent !== true) return send(res, 400, { error: 'consent' });
      const l = read();
      if (l.some(r => r.productId === product.id && r.email === email && r.status !== 'refuse')) return send(res, 409, { error: 'already' });
      const r = { id: 'AV' + now.toString(36).toUpperCase(), productId: product.id, rating, title, text, name, email,
        skin: SKINS.includes(d.skin) ? d.skin : '', verified: verified(email, product), status: 'en_attente', at: new Date().toISOString() };
      l.push(r);
      try { write(l); } catch (e) { console.error('reviews write failed', e); return send(res, 500, { error: 'storage' }); }
      h.push(now); hits.set(ip, h);
      console.log('[avis] nouvel avis en attente', r.id, product.id, rating + '/5');
      send(res, 200, { ok: true, verified: r.verified });
    });
  }

  function moderate(req, res) {
    if (!keyOk(req)) return send(res, 403, { error: 'forbidden' });
    let body = ''; req.on('data', c => { body += c; }); req.on('end', () => {
      let d; try { d = JSON.parse(body || '{}'); } catch (_) { return send(res, 400, { error: 'invalid_json' }); }
      const l = read(), r = l.find(x => x.id === d.id);
      if (!r || !['publie', 'refuse', 'en_attente'].includes(d.status)) return send(res, 400, { error: 'bad' });
      r.status = d.status; r.moderatedAt = new Date().toISOString(); write(l); send(res, 200, { ok: true });
    });
  }

  function admin(req, res) {
    if (!keyOk(req)) { res.writeHead(403); res.end('Forbidden'); return; }
    const names = Object.fromEntries(catalog().map(p => [p.id, p.name + ' ' + (p.name_line2 || '')]));
    const e = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const rows = read().sort((a, b) => b.at.localeCompare(a.at)).map(r => `<tr data-id="${e(r.id)}" class="${e(r.status)}"><td>${e(r.at.slice(0, 10))}</td><td>${e(names[r.productId] || r.productId)}</td><td>${'★'.repeat(r.rating)}</td><td><b>${e(r.title)}</b><br>${e(r.text)}</td><td>${e(r.name)}<br><small>${e(r.email)}</small>${r.verified ? '<br><small>✓ achat vérifié</small>' : ''}</td><td class="st">${e(r.status)}</td><td><button data-s="publie">Publier</button> <button data-s="refuse">Refuser</button></td></tr>`).join('');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(`<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Avis — modération Onaé</title>
<style>body{font:14px system-ui;margin:24px;color:#222}table{border-collapse:collapse;width:100%}td{border-bottom:1px solid #eee;padding:10px;vertical-align:top}tr.publie{background:#f2fbf4}tr.refuse{background:#fdf1f1;opacity:.6}button{padding:6px 10px;cursor:pointer}</style>
<h1>Avis clients</h1><p>Publiez tous les avis conformes, qu'ils soient positifs ou négatifs. Refusez uniquement les contenus injurieux, hors sujet ou contenant des données personnelles.</p><table>${rows || '<tr><td>Aucun avis pour le moment.</td></tr>'}</table>
<script>document.addEventListener('click',async e=>{const b=e.target.closest('button[data-s]');if(!b)return;const tr=b.closest('tr');const r=await fetch('/api/reviews/moderate'+location.search,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:tr.dataset.id,status:b.dataset.s})});if(r.ok){tr.className=b.dataset.s;tr.querySelector('.st').textContent=b.dataset.s;}});</script>`);
  }

  return function (req, res, urlPath) {
    if (urlPath === '/api/reviews' && req.method === 'GET') return list(req, res), true;
    if (urlPath === '/api/reviews' && req.method === 'POST') return create(req, res), true;
    if (urlPath === '/api/reviews/moderate' && req.method === 'POST') return moderate(req, res), true;
    if (urlPath === '/api/reviews/admin' && req.method === 'GET') return admin(req, res), true;
    return false;
  };
};
