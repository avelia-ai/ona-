/* Onaé — panier partagé entre toutes les pages (stocké dans le navigateur). */
(function(){
  /* CATALOG est peuplé dynamiquement depuis products.json.
     Un catalogue statique minimal sert de fallback si le fetch échoue. */
  const CATALOG = {};

  /* Gammes : couleurs de fond pour les icônes panier */
  const GAMME_COLORS = {
    'e·boost':   { color:'#d3e6ff', deep:'#4f86b3' },
    'o·care':    { color:'#ffefff', deep:'#9b6fb5' },
    'hydraline': { color:'#f9db86', deep:'#a07d00' },
    'o·répare':  { color:'#f6dbe6', deep:'#c9556e' },
  };
  function gammeColors(g){ return GAMME_COLORS[g] || { color:'#f0ece8', deep:'#9b6fb5' }; }

  /* Charge products.json et peuple CATALOG */
  function loadCatalog(){
    return fetch('/products.json?v=1')
      .then(r => r.json())
      .then(data => {
        (data.products || []).forEach(p => {
          const gc = gammeColors(p.gamme);
          CATALOG[p.id] = {
            name:  p.name,
            sub:   p.name_line2 || '',
            gamme: p.gamme_label || p.gamme || '',
            color: gc.color,
            deep:  gc.deep,
            price: (p.bundles && p.bundles[0]) ? p.bundles[0].price_raw : 0,
            vol:   p.volume || '',
            img:   'cart-' + p.id + '.jpg',
          };
        });
        /* Notifie les abonnés que le catalogue est prêt */
        listeners.forEach(fn => { try { fn(read()); } catch(_) {} });
        paintBadges();
      })
      .catch(() => { /* garde le fallback statique vide — le panier continue */ });
  }
  const FREE_SHIPPING = 59;
  const KEY = 'onae-cart-v1';
  let mem = null;
  function read(){
    if(mem) return mem;
    try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); mem = Array.isArray(v) ? v.filter(l => (CATALOG[l.id] || (l.p && l.p.name && l.p.price > 0)) && l.qty > 0) : []; }
    catch(_) { mem = []; }
    return mem;
  }
  function write(lines){
    mem = lines;
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch(_) {}
    listeners.forEach(fn => { try { fn(lines); } catch(_) {} });
    paintBadges();
  }
  const listeners = [];
  const fmt = n => n.toFixed(2).replace('.', ',') + ' €';
  const info = id => { if(CATALOG[id]) return CATALOG[id]; const l = read().find(x => x.id === id); return l && l.p ? l.p : null; };
  const Cart = {
    CATALOG, FREE_SHIPPING, fmt, info,
    lines(){ return read().map(l => ({...l})); },
    count(){ return read().reduce((s,l) => s + l.qty, 0); },
    subtotal(){ return read().reduce((s,l) => s + l.qty * (info(l.id) || {price:0}).price, 0); },
    add(id, qty=1, snap){ if(!CATALOG[id] && !(snap && snap.name && snap.price > 0)) return false; const L = read().slice(); const f = L.find(l => l.id === id);
      if(f) f.qty = Math.min(9, f.qty + qty); else L.push(CATALOG[id] ? {id, qty:Math.min(9, qty)} : {id, qty:Math.min(9, qty), p:snap}); write(L); return true; },
    set(id, qty){ let L = read().slice(); const f = L.find(l => l.id === id); if(!f) return;
      if(qty <= 0) L = L.filter(l => l.id !== id); else f.qty = Math.min(9, qty); write(L); },
    remove(id){ write(read().filter(l => l.id !== id)); },
    restore(line, index){ const L = read().filter(l => l.id !== line.id); L.splice(Math.min(index, L.length), 0, line); write(L); },
    onChange(fn){ listeners.push(fn); },
  };
  window.OnaeCart = Cart;
  // other tabs
  window.addEventListener('storage', e => { if(e.key === KEY){ mem = null; listeners.forEach(fn => fn(read())); paintBadges(); } });

  /* ---------- header badges + links ---------- */
  function paintBadges(bump){
    const n = Cart.count();
    document.querySelectorAll('.cart-n, .cart-badge span').forEach(b => {
      b.textContent = n;
      if(bump){ b.classList.remove('cart-bump'); void b.offsetWidth; b.classList.add('cart-bump'); }
    });
  }
  function wire(){
    document.querySelectorAll('.cart-btn').forEach(a => a.setAttribute('href', 'panier.html'));
    document.querySelectorAll('a[aria-label="Compte"]').forEach(a => a.setAttribute('href', 'mon-compte.html'));
    document.querySelectorAll('.cart-badge').forEach(b => { b.style.cursor = 'pointer'; b.onclick = () => location.href = 'panier.html'; });
    paintBadges();
    const st = document.createElement('style');
    st.textContent = `
      @keyframes cartBump{0%{transform:scale(1)}35%{transform:scale(1.55)}70%{transform:scale(.9)}100%{transform:scale(1)}}
      .cart-bump{animation:cartBump .6s cubic-bezier(.16,1,.3,1)}
      .oc-toast{position:fixed;right:24px;bottom:24px;z-index:9999;display:flex;align-items:center;gap:14px;padding:12px 14px 12px 12px;background:#141414;color:#fff;font-family:'DM Sans',system-ui,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.25);transform:translateY(20px);opacity:0;transition:opacity .4s,transform .6s cubic-bezier(.16,1,.3,1);max-width:calc(100vw - 32px)}
      .oc-toast.on{opacity:1;transform:none}
      .oc-toast img{width:48px;height:60px;object-fit:cover;flex-shrink:0}
      .oc-toast small{display:block;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#d4a0ab;margin-bottom:3px}
      .oc-toast b{font-weight:400;font-size:14px}
      .oc-toast a{margin-left:10px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;padding:10px 14px;background:#fff;color:#141414;white-space:nowrap;text-decoration:none}
      @media(max-width:600px){.oc-toast{left:16px;right:16px;bottom:16px}}`;
    document.head.appendChild(st);
  }
  let toastTimer = null;
  function toast(id){
    const p = info(id); if(!p) return;
    let t = document.querySelector('.oc-toast');
    if(!t){ t = document.createElement('div'); t.className = 'oc-toast'; t.setAttribute('role','status'); document.body.appendChild(t); }
    t.innerHTML = `<img src="${p.img}" alt=""><div><small>Ajouté au panier</small><b>${p.name} ${p.sub}</b></div><a href="panier.html">Voir le panier</a>`;
    requestAnimationFrame(() => t.classList.add('on'));
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 3200);
  }
  Cart.toast = toast;
  Cart.addWithFeedback = function(id, snap){ if(Cart.add(id, 1, snap)){ paintBadges(true); toast(id); return true; } return false; };

  /* ---------- "Ajouter au panier" buttons on catalogue pages ---------- */
  const GAMMES = {
    boost:     { gamme:'Boost',     color:'#d3e6ff', deep:'#4f86b3', img:'gamme-boost.jpg' },
    care:      { gamme:'Care',      color:'#ffefff', deep:'#9b6fb5', img:'gamme-care.jpg?v=2' },
    hydraline: { gamme:'Hydracare', color:'#f9db86', deep:'#a07d00', img:'gamme-hydraline.jpg' },
    hydracare: { gamme:'Hydracare', color:'#f9db86', deep:'#a07d00', img:'gamme-hydraline.jpg' },
    repare:    { gamme:'Repare',    color:'#ffefff', deep:'#a0659f', img:'gamme-repare.jpg' },
  };
  const norm = t => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const slug = t => norm(t).replace(/ /g, '-').slice(0, 60);
  const txt = (root, sel) => { const el = root.querySelector(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
  const price = t => { const m = (t || '').replace(/\s/g, '').match(/(\d+)[,.](\d{2})/); return m ? parseFloat(m[1] + '.' + m[2]) : 0; };
  // Read the product the visitor actually clicked from its card (name, price, gamme, picture).
  function fromCard(btn){
    const card = btn.closest('.pcard, .cat-card, .feat-card, article, a');
    if(!card) return null;
    const a = btn.closest('a[href*="id="]') || card.querySelector('a[href*="id="]');
    const hrefId = a ? new URL(a.getAttribute('href'), location.href).searchParams.get('id') : null;
    let name = txt(card, '.pname, .cat-name, .feat-name, h3');
    let sub = txt(card, '.psub');
    const pr = price(txt(card, '.pprice, .cat-price, .feat-price'));
    let vol = '';
    const vm = sub.match(/(\d+\s?ml)/i); if(vm){ vol = vm[1]; sub = sub.replace(/·?\s*\d+\s?ml/i, '').replace(/[·\s]+$/, '').trim(); }
    sub = sub.replace(/·?\s*\d+\s*[×x]\s*$/i, '').replace(/[·\s]+$/, '').trim();
    const badge = norm(txt(card, '.pbadge, .cat-gamme, .feat-body .cat-gamme'));
    const gk = Object.keys(GAMMES).find(k => badge.includes(k)) || 'boost';
    // same product as the catalogue entry? (same price and the names overlap)
    if(hrefId && CATALOG[hrefId]){
      const c = CATALOG[hrefId], words = norm(name).split(' ').filter(w => w.length > 3);
      const overlap = words.some(w => norm(c.name + ' ' + c.sub).includes(w));
      if(!pr || (Math.abs(c.price - pr) < .01 && (overlap || !name))) return { id: hrefId };
    }
    if(!name || !pr) return hrefId && CATALOG[hrefId] ? { id: hrefId } : null;
    const img0 = card.querySelector('img');
    const src = img0 ? img0.getAttribute('src') || '' : '';
    const g = GAMMES[gk];
    const snap = { name, sub, gamme:g.gamme, color:g.color, deep:g.deep, price:pr, vol, img: (src && !src.startsWith('data:') && src.length < 300) ? src : g.img };
    return { id: 'p-' + slug(name + ' ' + sub), snap };
  }
  document.addEventListener('click', e => {
    const btn = e.target.closest('.padd, .cat-add, [data-add-to-cart]');
    if(!btn) return;
    let r = btn.dataset.addToCart ? { id: btn.dataset.addToCart } : fromCard(btn);
    if(!r) return;
    e.preventDefault(); e.stopPropagation();
    if(!Cart.addWithFeedback(r.id, r.snap)) return;
    const old = btn.textContent; btn.textContent = '✓ Ajouté'; setTimeout(() => btn.textContent = old, 1600);
  }, true);

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();

  /* Charge le catalogue dès que possible */
  loadCatalog();
  /* Expose une promesse pour que product.html puisse attendre le catalogue */
  Cart.catalogReady = loadCatalog;
})();
