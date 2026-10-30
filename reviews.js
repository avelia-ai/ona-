/* Onaé — avis clients
   POST /api/reviews                    dépôt d'un avis (en attente de modération)
   GET  /api/reviews?product=<id>       avis publiés d'un produit + moyenne + répartition
   GET  /api/reviews/admin?key=…        page de modération (NEWSLETTER_KEY)
   POST /api/reviews/moderate?key=…     { id, status: 'publie' | 'refuse' }
   Tous les avis conformes sont publiés, positifs comme négatifs. Mention « Achat vérifié »
   uniquement si l'e-mail correspond à une commande contenant le produit.            */
const fs = require('fs');
const path = require('path');
const { sendMail } = require('./notify');

module.exports = function (DATA_DIR, ROOT) {
  const FILE = path.join(DATA_DIR, 'reviews.json');
  const PHOTOS = path.join(DATA_DIR, 'review-photos');
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
  const pub = r => ({ id: r.id, name: r.name, rating: r.rating, title: r.title, text: r.text, skin: r.skin || '', date: r.at, verified: !!r.verified, photos: (r.photos || []).map(f => '/api/reviews/photo/' + f) });

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
    req.on('data', c => { body += c; if (body.length > 5.5e6) req.destroy(); });
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
      /* photos : jusqu'à 3 JPEG, 1,5 Mo max chacune, vérifiées octet par octet */
      const imgs = Array.isArray(d.photos) ? d.photos.slice(0, 3) : [];
      const bufs = [];
      for (const u of imgs) {
        const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(u || ''));
        if (!m) return send(res, 400, { error: 'photo_format' });
        const b = Buffer.from(m[1], 'base64');
        if (b.length < 2000 || b.length > 1.5e6 || b[0] !== 0xFF || b[1] !== 0xD8) return send(res, 400, { error: 'photo_format' });
        bufs.push(b);
      }
      if (bufs.length) {
        try { fs.mkdirSync(PHOTOS, { recursive: true }); r.photos = bufs.map((b, i) => { const f = r.id + '-' + (i + 1) + '.jpg'; fs.writeFileSync(path.join(PHOTOS, f), b); return f; }); }
        catch (e) { console.error('review photo write failed', e); return send(res, 500, { error: 'storage' }); }
      }
      l.push(r);
      try { write(l); } catch (e) { console.error('reviews write failed', e); return send(res, 500, { error: 'storage' }); }
      h.push(now); hits.set(ip, h);
      console.log('[avis] nouvel avis en attente', r.id, product.id, rating + '/5');
      const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const site = 'https://www.onaecosmetics.fr', adm = site + '/api/reviews/admin' + (process.env.NEWSLETTER_KEY ? '?key=' + encodeURIComponent(process.env.NEWSLETTER_KEY) : '');
      const pending = l.filter(x => x.status === 'en_attente').length;
      sendMail({
        subject: `Nouvel avis ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} · ${product.name} ${product.name_line2 || ''}`.trim(),
        text: `Nouvel avis de ${name} (${rating}/5) sur ${product.name}. ${pending} avis en attente. Valider : ${adm}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222"><p style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#c9556e">Onaé · nouvel avis à valider</p>
<h2 style="font-family:Georgia,serif;font-weight:400;margin:6px 0 14px">${esc(product.name)} ${esc(product.name_line2 || '')}</h2>
<p style="font-size:22px;color:#c9556e;margin:0">${'★'.repeat(rating)}<span style="color:#ddd">${'★'.repeat(5 - rating)}</span></p>
${title ? `<p style="font-family:Georgia,serif;font-size:18px;margin:12px 0 4px">${esc(title)}</p>` : ''}<p style="line-height:1.6">${esc(text)}</p>
<p style="color:#777;font-size:13px">${esc(name)} · ${esc(email)}${r.skin ? ' · peau ' + esc(r.skin.toLowerCase()) : ''}${r.verified ? ' · ✓ achat vérifié' : ''}${(r.photos || []).length ? ' · ' + r.photos.length + ' photo(s)' : ''}</p>
<p style="margin:26px 0"><a href="${adm}" style="background:#7a2240;color:#fff;text-decoration:none;padding:14px 26px;border-radius:30px;font-size:13px;letter-spacing:.12em;text-transform:uppercase">Valider ou refuser</a></p>
<p style="color:#999;font-size:12px">${pending} avis en attente de validation au total.</p></div>`
      });
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
    const rows = read().sort((a, b) => b.at.localeCompare(a.at)).map(r => `<tr data-id="${e(r.id)}" class="${e(r.status)}"><td>${e(r.at.slice(0, 10))}</td><td>${e(names[r.productId] || r.productId)}</td><td>${'★'.repeat(r.rating)}</td><td><b>${e(r.title)}</b><br>${e(r.text)}${(r.photos || []).length ? '<div class="ph">' + r.photos.map(f => `<a href="/api/reviews/photo/${e(f)}?key=${e(new URL(req.url, 'http://x').searchParams.get('key'))}" target="_blank"><img src="/api/reviews/photo/${e(f)}?key=${e(new URL(req.url, 'http://x').searchParams.get('key'))}"></a>`).join('') + '</div>' : ''}</td><td>${e(r.name)}<br><small>${e(r.email)}</small>${r.verified ? '<br><small>✓ achat vérifié</small>' : ''}</td><td class="st">${({ en_attente: '⏳ En attente', publie: '✓ Publié', refuse: '✕ Refusé' })[r.status] || e(r.status)}</td><td><button data-s="publie">Publier</button> <button data-s="refuse">Refuser</button></td></tr>`).join('');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(`<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Avis — modération Onaé</title>
<style>body{font:14px system-ui;margin:24px;color:#222}table{border-collapse:collapse;width:100%}td{border-bottom:1px solid #eee;padding:10px;vertical-align:top}tr.publie{background:#f2fbf4}tr.refuse{background:#fdf1f1;opacity:.6}button{padding:8px 12px;cursor:pointer;border-radius:8px;border:1px solid #ccc;background:#fff}button[data-s=publie]{background:#2a7a4b;color:#fff;border-color:#2a7a4b}.ph{display:flex;gap:6px;margin-top:8px}.ph img{width:72px;height:72px;object-fit:cover;border-radius:8px}.st{font-weight:600}</style>
<h1>Avis clients</h1><p><b>${read().filter(r => r.status === 'en_attente').length}</b> avis en attente de validation.</p><p>Publiez tous les avis conformes, qu'ils soient positifs ou négatifs. Refusez uniquement les contenus injurieux, hors sujet ou contenant des données personnelles.</p><table>${rows || '<tr><td>Aucun avis pour le moment.</td></tr>'}</table>
<script>document.addEventListener('click',async e=>{const b=e.target.closest('button[data-s]');if(!b)return;const tr=b.closest('tr');const r=await fetch('/api/reviews/moderate'+location.search,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:tr.dataset.id,status:b.dataset.s})});if(r.ok){tr.className=b.dataset.s;tr.querySelector('.st').textContent=b.dataset.s==='publie'?'✓ Publié':'✕ Refusé';}});</script>`);
  }

  function photo(req, res, urlPath) {
    const f = decodeURIComponent(urlPath.slice('/api/reviews/photo/'.length));
    if (!/^AV[A-Z0-9]+-[1-3]\.jpg$/.test(f)) { res.writeHead(404); res.end(); return; }
    const r = read().find(x => (x.photos || []).includes(f));
    if (!r || (r.status !== 'publie' && !keyOk(req))) { res.writeHead(404); res.end(); return; }
    fs.readFile(path.join(PHOTOS, f), (err, b) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': r.status === 'publie' ? 'public, max-age=86400' : 'no-store' }); res.end(b);
    });
  }
  return function (req, res, urlPath) {
    if (urlPath === '/api/reviews' && req.method === 'GET') return list(req, res), true;
    if (urlPath === '/api/reviews' && req.method === 'POST') return create(req, res), true;
    if (urlPath === '/api/reviews/moderate' && req.method === 'POST') return moderate(req, res), true;
    if (urlPath === '/api/reviews/admin' && req.method === 'GET') return admin(req, res), true;
    if (urlPath.startsWith('/api/reviews/photo/') && req.method === 'GET') return photo(req, res, urlPath), true;
    return false;
  };
};
