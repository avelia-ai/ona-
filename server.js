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

http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0].replace(/\/$/, '') || '/';

  if (urlPath === '/api/newsletter' && req.method === 'POST') return handleNewsletter(req, res);
  if (urlPath === '/api/newsletter/export' && req.method === 'GET') {
    const key = new URL(req.url, 'http://x').searchParams.get('key');
    if (!process.env.NEWSLETTER_KEY || key !== process.env.NEWSLETTER_KEY) { res.writeHead(403); res.end('Forbidden'); return; }
    const subs = readSubs();
    const csv = 'email,prenom,source,date\n' + subs.map(s => [s.email, s.name, s.source, s.at].map(x => '"' + String(x || '').replace(/"/g, '""') + '"').join(',')).join('\n');
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="newsletter-onae.csv"' });
    res.end(csv); return;
  }
  // never serve stored data as a static file
  if (urlPath.startsWith('/data/')) { res.writeHead(404); res.end('Not found'); return; }

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
