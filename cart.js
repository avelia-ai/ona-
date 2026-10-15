/* Onaé — panier partagé entre toutes les pages (stocké dans le navigateur). */
(function(){
  const CATALOG = {
    'serum-eclat-peptides':     { name:'Sérum Éclat Peptides',        sub:'Nouvelle Génération',     gamme:'Boost',     color:'#d3e6ff', deep:'#4f86b3', price:49.90, vol:'30 ml', img:'cart-serum-eclat-peptides.jpg' },
    'serum-anti-age-peptides':  { name:'Sérum Visage Anti-âge',       sub:'aux Peptides',            gamme:'Boost',     color:'#d3e6ff', deep:'#4f86b3', price:39.90, vol:'30 ml', img:'cart-serum-anti-age-peptides.jpg' },
    'huile-fortifiante-romarin':{ name:'Huile Fortifiante',           sub:'au Romarin',              gamme:'Boost',     color:'#d3e6ff', deep:'#4f86b3', price:29.90, vol:'30 ml', img:'cart-huile-fortifiante-romarin.jpg' },
    'creme-reparatrice-intense':{ name:'Crème Réparatrice',           sub:'Intense',                 gamme:'Care',      color:'#ffefff', deep:'#9b6fb5', price:44.90, vol:'50 ml', img:'cart-creme-reparatrice-intense.jpg' },
    'essence-hydratante-pro':   { name:'Essence Hydratante',          sub:'Pro',                     gamme:'Hydracare', color:'#f9db86', deep:'#a07d00', price:38.90, vol:'120 ml', img:'cart-essence-hydratante-pro.jpg' },
    'huile-nuit-reparatrice':   { name:'Huile Nuit',                  sub:'Réparatrice',             gamme:'Repare',    color:'#ffefff', deep:'#a0659f', price:52.90, vol:'30 ml', img:'cart-huile-nuit-reparatrice.jpg' },
  };
  const FREE_SHIPPING = 59;
  const KEY = 'onae-cart-v1';
  let mem = null;
  function read(){
    if(mem) return mem;
    try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); mem = Array.isArray(v) ? v.filter(l => CATALOG[l.id] && l.qty > 0) : []; }
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
  const Cart = {
    CATALOG, FREE_SHIPPING, fmt,
    lines(){ return read().map(l => ({...l})); },
    count(){ return read().reduce((s,l) => s + l.qty, 0); },
    subtotal(){ return read().reduce((s,l) => s + l.qty * CATALOG[l.id].price, 0); },
    add(id, qty=1){ if(!CATALOG[id]) return false; const L = read().slice(); const f = L.find(l => l.id === id);
      if(f) f.qty = Math.min(9, f.qty + qty); else L.push({id, qty:Math.min(9, qty)}); write(L); return true; },
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
    const p = CATALOG[id]; if(!p) return;
    let t = document.querySelector('.oc-toast');
    if(!t){ t = document.createElement('div'); t.className = 'oc-toast'; t.setAttribute('role','status'); document.body.appendChild(t); }
    t.innerHTML = `<img src="${p.img}" alt=""><div><small>Ajouté au panier</small><b>${p.name} ${p.sub}</b></div><a href="panier.html">Voir le panier</a>`;
    requestAnimationFrame(() => t.classList.add('on'));
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 3200);
  }
  Cart.toast = toast;
  Cart.addWithFeedback = function(id){ if(Cart.add(id, 1)){ paintBadges(true); toast(id); return true; } return false; };

  /* ---------- "Ajouter au panier" buttons on catalogue pages ---------- */
  document.addEventListener('click', e => {
    const btn = e.target.closest('.padd, .cat-add, [data-add-to-cart]');
    if(!btn) return;
    let id = btn.dataset.addToCart;
    if(!id){ const a = btn.closest('a[href*="id="]'); if(a) id = new URL(a.getAttribute('href'), location.href).searchParams.get('id'); }
    if(!id || !CATALOG[id]) return;
    e.preventDefault(); e.stopPropagation();
    Cart.addWithFeedback(id);
    const old = btn.textContent; btn.textContent = '✓ Ajouté'; setTimeout(() => btn.textContent = old, 1600);
  }, true);

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
