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
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json; charset=utf-8',
};

const ROUTES = {
  '/': path.join(__dirname, 'index.html'),
  '/product': path.join(__dirname, 'product.html'),
  '/product/serum-anti-age': path.join(__dirname, 'product.html'),
};

http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0].replace(/\/$/, '') || '/';

  // Fichiers statiques (images, etc.)
  const staticFile = path.join(__dirname, urlPath);
  const ext = path.extname(urlPath).toLowerCase();
  if (ext && MIME[ext] && fs.existsSync(staticFile)) {
    res.writeHead(200, { 'Content-Type': MIME[ext], 'Cache-Control': 'public, max-age=86400' });
    fs.createReadStream(staticFile).pipe(res);
    return;
  }

  const file = ROUTES[urlPath] || ROUTES['/'];
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Onaé boutique live on port ${PORT}`));
