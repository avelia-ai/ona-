/* ═══════════ ONAÉ — MENU MOBILE PREMIUM ═══════════
   Remplace le menu mobile (#mnav) de toutes les pages.
   Onglets : Produits · Le Journal · La Marque · Privilège · Aide
   + recherche instantanée dans le catalogue (products.json).   */
(function () {
  if (window.__onaeMenu) return; window.__onaeMenu = 1;
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  /* ---------- données du menu ---------- */
  const G = { boost: '#d3e6ff', care: '#f3e2ff', hydra: '#f9db86', repare: '#f6dbe6', rose: '#f6e3e7', ivory: '#f4ece6' };
  const TABS = [
    { k: 'produits', label: 'Produits', rows: [
      { t: 'Bestsellers', img: 'cart-serum-gelee-prebiotiques.jpg', bg: G.care, href: 'index.html#products', badge: 'Coups de cœur' },
      { t: 'Diagnostic IA', s: 'Votre routine en 1 photo', img: 'creme-anti-age-peptides-6.jpg', bg: G.rose, href: 'diagnostic.html', badge: 'Nouveau', hot: 1 },
      { t: 'Nos soins', img: 'rituel-visage-poster.jpg', bg: G.rose, sub: [
        { t: 'Soins visage', s: 'Sérums & crèmes', img: 'cart-serum-anti-age-peptides.jpg', bg: G.boost, href: 'soins-visage.html' },
        { t: 'Soins yeux', s: 'Contour des yeux', img: 'cart-creme-contour-yeux-lissante.jpg', bg: G.repare, href: 'soins-yeux.html' },
        { t: 'Soins cheveux', s: 'Cheveux & cuir chevelu', img: 'cart-huile-fortifiante-romarin.jpg', bg: G.boost, href: 'soins-cheveux.html' } ] },
      { t: 'Nos gammes', img: 'gamme-care.jpg?v=2', bg: G.care, sub: [
        { t: 'Boost', s: 'Énergie & éclat', img: 'gamme-boost.jpg', bg: G.boost, href: 'gamme-boost.html', dot: '#4f86b3' },
        { t: 'Care', s: 'Équilibre & protection', img: 'gamme-care.jpg?v=2', bg: G.care, href: 'gamme-care.html', dot: '#9b6fb5' },
        { t: 'O·Hydraline', s: 'Hydratation & douceur', img: 'gamme-hydraline.jpg', bg: G.hydra, href: 'gamme-hydraline.html', dot: '#a07d00' },
        { t: 'Répare', s: 'Réparation & fermeté', img: 'gamme-repare.jpg', bg: G.repare, href: 'gamme-repare.html', dot: '#a0659f' },
        { t: 'Toutes les gammes', s: 'Comparer les 4 univers', href: 'nos-gammes.html', more: 1 } ] },
      { t: 'Routines', img: 'routine-boost-apres.jpg', bg: G.boost, badge: 'Sur-mesure', sub: [
        { t: 'Routine Boost', s: 'Réveiller l’éclat', img: 'routine-boost-apres.jpg', bg: G.boost, href: 'routine.html?r=boost' },
        { t: 'Routine Hydratation', s: 'Désaltérer la peau', img: 'routine-hydratation-apres.jpg', bg: G.hydra, href: 'routine.html?r=hydratation' },
        { t: 'Routine Protection', s: 'Apaiser & protéger', img: 'routine-protection-apres.jpg', bg: G.care, href: 'routine.html?r=protection' },
        { t: 'Routine Répare', s: 'Réparer & raffermir', img: 'routine-repare-apres.jpg', bg: G.repare, href: 'routine.html?r=repare' } ] },
      { t: 'Nouveautés', img: 'cart-huile-fortifiante-romarin.jpg', bg: G.boost, href: 'nouveautes.html', badge: 'New', hot: 1 },
      { t: 'Nos Box', s: 'Coffrets prêts à offrir', img: 'cart-box-anti-age-peptides.jpg', bg: G.rose, href: 'box.html', badge: 'Coffrets' },
      { t: 'Carte cadeau', s: 'Offrir l’éclat, laisser choisir', img: 'cart-carte-cadeau-75.jpg', bg: G.rose, href: 'carte-cadeau.html', badge: 'Idée cadeau', hot: 1 },
      { t: 'Nos ingrédients', img: 'drop3d-front.jpg', bg: G.ivory, href: 'nos-ingredients.html' } ] },
    { k: 'journal', label: 'Le Journal', rows: [
      { t: 'Le microbiome cutané', s: 'Peau', img: 'gamme-care.jpg?v=2', bg: G.care, href: 'blog-microbiome-cutane.html' },
      { t: 'Rétinol ou alternative ?', s: 'Ingrédients', img: 'gamme-hydraline.jpg', bg: G.hydra, href: 'blog-alternative-retinol.html' },
      { t: 'La routine matin & soir', s: 'Rituels', img: 'rituel-visage-poster.jpg', bg: G.rose, href: 'blog-routine-matin-soir.html' },
      { t: 'Cernes & poches', s: 'Regard', img: 'gamme-boost.jpg', bg: G.boost, href: 'blog-cernes-et-poches.html' },
      { t: 'Le romarin pour les cheveux', s: 'Cheveux', img: 'rituel-cheveux-poster.jpg', bg: G.rose, href: 'blog-romarin-cheveux.html' },
      { t: 'Lire une liste INCI', s: 'Clean beauty', img: 'drop3d-front.jpg', bg: G.ivory, href: 'blog-lire-une-liste-inci.html' },
      { t: 'Tous les articles', href: 'blog.html', more: 1 } ] },
    { k: 'marque', label: 'La Marque', rows: [
      { t: 'Notre histoire', s: 'La maison Onaé', img: 'creme-anti-age-peptides-6.jpg', bg: G.rose, href: 'notre-histoire.html' },
      { t: 'Nos engagements', s: 'Naturel, vegan, transparent', img: 'serum-correcteur-pigmentation-5.jpg', bg: G.ivory, href: 'nos-engagements.html' },
      { t: 'L’univers Onaé', s: 'Nos 4 gammes', img: 'gamme-boost.jpg', bg: G.boost, href: 'nos-gammes.html' },
      { t: 'Nos ingrédients', s: 'Les peptides & l’herbier', img: 'drop3d-front.jpg', bg: G.ivory, href: 'nos-ingredients.html' },
      { t: 'Presse & partenariats', s: 'Kit presse, collaborations', img: 'creme-anti-age-peptides-4.jpg', bg: G.ivory, href: 'presse-partenariats.html' },
      { t: 'Le Journal Onaé', s: 'Conseils & rituels', img: 'rituel-cheveux-poster.jpg', bg: G.rose, href: 'blog.html' } ] },
    { k: 'club', label: 'Onaé Privilège', club: 1 },
    { k: 'aide', label: 'Aide', rows: [
      { t: 'Suivi de commande', s: 'Où en est mon colis ?', ic: 'box', href: 'suivi-commande.html' },
      { t: 'Livraison & retours', s: 'Offerte dès 59 €', ic: 'truck', href: 'livraison-retours.html' },
      { t: 'FAQ', s: 'Vos questions, nos réponses', ic: 'q', href: 'faq.html' },
      { t: 'Nous contacter', s: 'Une conseillère vous répond', ic: 'chat', href: 'contact.html' },
      { t: 'Mon compte', s: 'Commandes, fidélité, profil', ic: 'user', href: 'mon-compte.html' } ] }
  ];
  const IC = {
    box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="m3 7.5 9 4.5 9-4.5M12 12v9"/>',
    truck: '<path d="M2 6h11v10H2zM13 9h4l3 3v4h-7"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    q: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8M8 13h5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'
  };
  const PAGE_TAB = /^blog/.test(page) ? 'journal' : /presse|nos-ingredients/.test(page) ? 'marque' : /fidelite|mon-compte|compte/.test(page) ? 'club' : /faq|contact|livraison|suivi/.test(page) ? 'aide' : 'produits';

  /* ---------- styles ---------- */
  const css = `
#mnav{display:none!important}
.om{position:fixed;inset:0;z-index:1000;visibility:hidden;pointer-events:none}
.om.on{visibility:visible;pointer-events:auto}
.om-bd{position:absolute;inset:0;background:rgba(28,16,22,.42);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .5s}
.om.on .om-bd{opacity:1}
.om-p{position:absolute;inset:0 auto 0 0;width:min(100%,520px);background:#fff;display:flex;flex-direction:column;transform:translateX(-104%);transition:transform .7s cubic-bezier(.16,1,.3,1);box-shadow:30px 0 80px -40px rgba(28,16,22,.5);overflow:hidden;padding-bottom:env(safe-area-inset-bottom,0px)}
.om.on .om-p{transform:none}
.om-tick{flex:none;overflow:hidden;white-space:nowrap;background:var(--accent,#c9556e);color:#fff;padding:9px 0;padding-top:calc(9px + env(safe-area-inset-top,0px));font-size:10.5px;letter-spacing:.2em;text-transform:uppercase}
.om-tick>div{display:inline-flex;animation:omTick 26s linear infinite}
.om-tick span{padding:0 22px;display:inline-flex;align-items:center;gap:44px}
.om-tick span::after{content:"✦";font-size:8px;opacity:.8}
@keyframes omTick{to{transform:translateX(-50%)}}
.om-top{flex:none;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid rgba(20,20,20,.07)}
.om-top .l,.om-top .r{display:flex;align-items:center;gap:4px}
.om-top .r{justify-content:flex-end}
.om-ib{position:relative;width:42px;height:42px;display:grid;place-items:center;border:0;background:none;color:var(--ink,#141414);cursor:pointer;border-radius:50%;transition:background .25s}
.om-ib:active,.om-ib:hover{background:#f6efec}
.om-ib svg{width:21px;height:21px}
.om-ib b{position:absolute;top:4px;right:3px;min-width:16px;height:16px;padding:0 4px;border-radius:9px;background:var(--accent,#c9556e);color:#fff;font:600 9.5px/16px var(--font-b,sans-serif);text-align:center}
.om-ib b:empty,.om-ib b[data-z]{display:none}
.om-logo{position:relative;display:block;width:124px;height:44px;overflow:hidden}
.om-logo img{position:absolute;left:50%;top:50%;width:132px;height:132px;max-width:none;transform:translate(-50%,-50%)}
.om-x svg{transition:transform .5s cubic-bezier(.16,1,.3,1)}
.om-x:hover svg{transform:rotate(90deg)}
.om-srch{flex:none;display:grid;grid-template-rows:0fr;transition:grid-template-rows .5s cubic-bezier(.16,1,.3,1)}
.om-srch.on{grid-template-rows:1fr}
.om-srch>div{overflow:hidden}
.om-sf{display:flex;align-items:center;gap:10px;margin:14px 16px 4px;padding:0 16px;height:50px;border-radius:30px;background:#f7f1ee}
.om-sf svg{flex:none;width:18px;height:18px;color:var(--ink-mid,#666)}
.om-sf input::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none}
.om-sf input{flex:1;min-width:0;border:0;background:none;outline:0;font:400 15px var(--font-b,sans-serif);color:var(--ink,#141414)}
.om-res{display:grid;gap:2px;padding:6px 16px 10px}
.om-res a{display:flex;gap:12px;align-items:center;padding:8px;border-radius:14px;transition:background .25s}
.om-res a:hover{background:#faf5f2}
.om-res img{width:46px;height:56px;object-fit:cover;border-radius:10px;background:#f4ece6}
.om-res b{display:block;font:400 15px/1.25 var(--font-d,serif);color:var(--ink,#141414)}
.om-res small{display:block;margin-top:3px;font-size:12px;color:var(--ink-mid,#666)}
.om-res p{padding:10px 8px;font-size:13px;color:var(--ink-mid,#666)}
.om-tabs{flex:none;position:relative;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:16px 16px 14px}
.om-tabs::-webkit-scrollbar{display:none}
.om-tab{position:relative;z-index:1;flex:none;padding:11px 17px;border-radius:30px;border:0;background:#f4eeeb;color:var(--ink,#141414);font:500 11px var(--font-b,sans-serif);letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:color .4s,background .4s}
.om-tab[aria-selected=true]{color:#fff;background:transparent}
.om-tab.club{background:#211218;color:#f1dcc4}
.om-tab.club[aria-selected=true]{background:transparent}
.om-pill{position:absolute;z-index:0;top:16px;height:38px;border-radius:30px;background:var(--accent,#c9556e);transition:transform .55s cubic-bezier(.16,1,.3,1),width .55s cubic-bezier(.16,1,.3,1),background .4s}
.om-pill.club{background:linear-gradient(120deg,#3a2230,#211218)}
.om-views{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0 16px 20px}
.om-v{display:none}
.om-v.on{display:block}
.om-r{opacity:0;transform:translateY(16px)}
.om-v.on .om-r{animation:omUp .7s cubic-bezier(.16,1,.3,1) forwards;animation-delay:calc(var(--i)*55ms + 80ms)}
@keyframes omUp{to{opacity:1;transform:none}}
.om-row{display:flex;width:100%;align-items:center;gap:16px;padding:11px 0;border:0;border-bottom:1px solid rgba(20,20,20,.07);background:none;text-align:left;cursor:pointer;color:var(--ink,#141414);font:inherit}
.om-th{position:relative;flex:none;width:76px;height:76px;border-radius:18px;overflow:hidden;background:var(--bg,#f4ece6)}
.om-th img{width:100%;height:100%;object-fit:cover;transition:transform .9s cubic-bezier(.16,1,.3,1)}
.om-row:hover .om-th img,.om-row:active .om-th img{transform:scale(1.08)}
.om-th::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(20,20,20,.05)}
.om-ic{flex:none;width:52px;height:52px;border-radius:50%;background:#f7f1ee;display:grid;place-items:center;color:var(--accent,#c9556e)}
.om-ic svg{width:22px;height:22px}
.om-tx{flex:1;min-width:0;display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}
.om-tx strong{font:400 21px/1.15 var(--font-d,serif)}
.om-tx small{flex-basis:100%;font-size:12.5px;color:var(--ink-mid,#666)}
.om-bdg{padding:5px 11px;border-radius:20px;background:#fbe3d8;color:#9b4a2b;font-size:11px;letter-spacing:.04em}
.om-bdg.hot{background:var(--accent,#c9556e);color:#fff;letter-spacing:.14em;text-transform:uppercase;font-size:9.5px;font-weight:600}
.om-pl{flex:none;width:34px;height:34px;display:grid;place-items:center;font-size:24px;font-weight:300;color:var(--ink,#141414);transition:transform .45s cubic-bezier(.16,1,.3,1)}
.om-acc.open>.om-row .om-pl{transform:rotate(45deg)}
.om-ar{flex:none;font-size:18px;color:var(--ink-light,#999);transition:transform .35s}
.om-row:hover .om-ar{transform:translateX(4px);color:var(--accent,#c9556e)}
.om-row.cur strong{color:var(--accent,#c9556e)}
.om-sub{display:grid;grid-template-rows:0fr;transition:grid-template-rows .55s cubic-bezier(.16,1,.3,1)}
.om-acc.open .om-sub{grid-template-rows:1fr}
.om-sub>div{overflow:hidden}
.om-sg{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 0 16px}
.om-sc{position:relative;display:block;border-radius:18px;overflow:hidden;background:var(--bg,#f4ece6);aspect-ratio:1/1.08;opacity:0;transform:scale(.94);transition:opacity .5s,transform .6s cubic-bezier(.16,1,.3,1)}
.om-acc.open .om-sc{opacity:1;transform:none;transition-delay:calc(var(--i)*60ms + 120ms)}
.om-sc img{width:100%;height:100%;object-fit:cover;transition:transform .9s cubic-bezier(.16,1,.3,1)}
.om-sc:hover img{transform:scale(1.07)}
.om-sc span{position:absolute;left:0;right:0;bottom:0;padding:44px 12px 12px;background:linear-gradient(transparent,rgba(20,12,16,.25) 30%,rgba(20,12,16,.78));color:#fff}
.om-sg.c3{grid-template-columns:repeat(3,1fr);gap:8px}
.om-sg.c3 .om-sc{aspect-ratio:3/4.2}
.om-sg.c3 .om-sc b{font-size:15px}
.om-sg.c3 .om-sc small{font-size:9.5px}
.om-sc b{display:flex;align-items:center;gap:7px;font:400 17px/1.15 var(--font-d,serif)}
.om-sc b i{width:8px;height:8px;border-radius:50%;background:var(--dot);box-shadow:0 0 0 2px rgba(255,255,255,.8)}
.om-sc small{display:block;margin-top:3px;font-size:10.5px;opacity:.85;letter-spacing:.02em}
.om-sc.more{display:flex;flex-direction:column;justify-content:flex-end;padding:14px;background:#211218;color:#f1dcc4;aspect-ratio:auto;grid-column:1/-1;min-height:64px;flex-direction:row;align-items:center;justify-content:space-between}
.om-sc.more b{font-size:17px}
.om-sc.more small{font-size:11px;opacity:.7}
.om-more{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding:18px 20px;border-radius:18px;background:#211218;color:#f1dcc4;font:400 18px var(--font-d,serif)}
/* club */
.om-club{padding:6px 0 10px}
.om-card{position:relative;aspect-ratio:1.6;border-radius:22px;overflow:hidden;padding:22px;color:#f1dcc4;background:radial-gradient(120% 140% at 0% 0%,#4a2b3b 0%,#211218 60%);box-shadow:0 30px 60px -30px rgba(33,18,24,.7);transform:perspective(900px) rotateX(8deg) rotateY(-10deg);transition:transform .8s cubic-bezier(.16,1,.3,1)}
.om-v.on .om-card{animation:omCard 1.1s cubic-bezier(.16,1,.3,1) both}
@keyframes omCard{from{opacity:0;transform:perspective(900px) rotateX(30deg) rotateY(-24deg) translateY(30px)}}
.om-card::before{content:"";position:absolute;inset:-50%;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.18) 50%,transparent 60%);animation:omShine 4.5s ease-in-out infinite}
@keyframes omShine{0%,40%{transform:translateX(-40%)}100%{transform:translateX(40%)}}
.om-card small{font-size:9.5px;letter-spacing:.3em;text-transform:uppercase;opacity:.8}
.om-card h4{margin-top:6px;font:italic 400 34px/1 var(--font-d,serif);background:linear-gradient(110deg,#f6e3cb,#c9a27c 45%,#f6e3cb 70%,#b98f6a);-webkit-background-clip:text;background-clip:text;color:transparent}
.om-card .tiers{position:absolute;left:22px;right:22px;bottom:20px;display:flex;justify-content:space-between;align-items:flex-end}
.om-card .tiers span{font-size:10px;letter-spacing:.2em;text-transform:uppercase;opacity:.75}
.om-card .tiers b{font:400 26px var(--font-d,serif);color:#f1dcc4}
.om-card .chip{position:absolute;right:22px;top:22px;width:38px;height:28px;border-radius:6px;background:linear-gradient(135deg,#f1dcc4,#b98f6a)}
.om-perks{display:grid;gap:0;margin-top:22px}
.om-perks div{display:flex;gap:14px;align-items:center;padding:14px 0;border-bottom:1px solid rgba(20,20,20,.07)}
.om-perks i{flex:none;width:40px;height:40px;border-radius:50%;background:#f7efe7;display:grid;place-items:center;font-style:normal;color:#b98f6a;font-size:14px}
.om-perks b{display:block;font:400 18px var(--font-d,serif)}
.om-perks small{font-size:12.5px;color:var(--ink-mid,#666)}
.om-cl{display:flex;gap:10px;margin-top:18px}
.om-cl a{flex:1;text-align:center;padding:15px 10px;border-radius:30px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:500}
.om-cl a:first-child{background:linear-gradient(120deg,#e9cfb2,#c9a27c 55%,#f1dcc4);color:#211218}
.om-cl a:last-child{border:1px solid rgba(20,20,20,.18);color:var(--ink,#141414)}
/* bas */
.om-foot{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 16px 16px;border-top:1px solid rgba(20,20,20,.07);background:#fff}
.om-foot a{display:flex;align-items:center;justify-content:center;text-align:center;min-height:56px;padding:8px 14px;border-radius:18px;font:400 17px/1.2 var(--font-d,serif);transition:transform .3s,box-shadow .3s}
.om-foot a:active{transform:scale(.97)}
.om-foot a:first-child{border:1.5px solid var(--accent,#c9556e);color:var(--accent,#c9556e)}
.om-foot a:last-child{background:var(--accent,#c9556e);color:#fff;box-shadow:0 14px 28px -14px rgba(201,85,110,.8)}
html.om-lock,html.om-lock body{overflow:hidden!important}
@media(prefers-reduced-motion:reduce){.om *,.om{animation:none!important;transition:none!important}.om-r{opacity:1;transform:none}.om-sc{opacity:1;transform:none}}
`;
  const st = document.createElement('style'); st.id = 'onae-menu-v2'; st.textContent = css; document.head.appendChild(st);

  /* ---------- rendu ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const isCur = h => h && h.split('#')[0].split('?')[0].toLowerCase() === page && !/#/.test(h);
  const th = r => r.ic ? `<span class="om-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${IC[r.ic]}</svg></span>`
    : r.img ? `<span class="om-th" style="--bg:${r.bg || '#f4ece6'}"><img decoding="async" src="${r.img}" alt="" loading="lazy"></span>` : '';
  const txt = r => `<span class="om-tx"><strong>${esc(r.t)}</strong>${r.badge ? `<span class="om-bdg${r.hot ? ' hot' : ''}">${esc(r.badge)}</span>` : ''}${r.s ? `<small>${esc(r.s)}</small>` : ''}</span>`;
  const row = (r, i) => {
    if (r.more) return `<a class="om-more om-r" style="--i:${i}" href="${r.href}">${esc(r.t)} <span>→</span></a>`;
    if (r.sub) return `<div class="om-acc om-r" style="--i:${i}"><button class="om-row" type="button" aria-expanded="false">${th(r)}${txt(r)}<span class="om-pl" aria-hidden="true">+</span></button>
      <div class="om-sub"><div><div class="om-sg${r.sub.length === 3 ? ' c3' : ''}">${r.sub.map((s, j) => s.more
        ? `<a class="om-sc more" style="--i:${j}" href="${s.href}"><span style="position:static;padding:0;background:none"><b>${esc(s.t)}</b><small>${esc(s.s || '')}</small></span><em style="font-style:normal">→</em></a>`
        : `<a class="om-sc" style="--i:${j};--bg:${s.bg}" href="${s.href}"><img decoding="async" src="${s.img}" alt="" loading="lazy"><span><b>${s.dot ? `<i style="--dot:${s.dot}"></i>` : ''}${esc(s.t)}</b><small>${esc(s.s)}</small></span></a>`).join('')}</div></div></div></div>`;
    return `<a class="om-row om-r${isCur(r.href) ? ' cur' : ''}" style="--i:${i}" href="${r.href}">${th(r)}${txt(r)}<span class="om-ar" aria-hidden="true">→</span></a>`;
  };
  const club = () => `<div class="om-club">
      <div class="om-card"><span class="chip"></span><small>Programme de fidélité</small><h4>Onaé Privilège</h4><div class="tiers"><span>Rose · Nacre · Écrin</span><b>✦</b></div></div>
      <div class="om-perks">
        <div class="om-r" style="--i:1"><i>✦</i><span><b>50 éclats de bienvenue</b><small>Offerts dès votre inscription</small></span></div>
        <div class="om-r" style="--i:2"><i>€</i><span><b>Vos achats récompensés</b><small>Transformez vos éclats en réductions</small></span></div>
        <div class="om-r" style="--i:3"><i>♡</i><span><b>Des attentions exclusives</b><small>Avant-premières et surprises d’anniversaire</small></span></div>
      </div>
      <div class="om-cl om-r" style="--i:4"><a href="fidelite.html">Découvrir</a><a href="mon-compte.html">Mon espace</a></div>
    </div>`;

  const logo = (document.querySelector('.header .logo img') || {}).getAttribute ? document.querySelector('.header .logo img').getAttribute('src') : 'logo_onae_homepage.png';
  const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const el = document.createElement('div'); el.className = 'om'; el.id = 'om'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="om-bd" data-x></div>
  <aside class="om-p" role="dialog" aria-modal="true" aria-label="Menu">
    <div class="om-tick" aria-hidden="true"><div>${Array(2).fill('<span>Livraison offerte dès 59 €</span><span>Formules naturelles & vegan</span><span>Marque élaborée en France</span><span>50 éclats offerts avec Onaé Privilège</span>').join('')}</div></div>
    <div class="om-top">
      <div class="l"><a class="om-ib" href="panier.html" aria-label="Panier">${svg('<path d="M6 7h12l-1 13H7z"/><path d="M9 7a3 3 0 0 1 6 0"/>')}<b id="omCart"></b></a><a class="om-ib" href="mon-compte.html" aria-label="Mon compte">${svg(IC.user)}</a></div>
      <a class="om-logo" href="index.html" aria-label="Accueil Onaé"><img src="${logo}" alt="ONAĒ"></a>
      <div class="r"><button class="om-ib" type="button" id="omSB" aria-label="Rechercher" aria-expanded="false">${svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>')}</button><button class="om-ib om-x" type="button" data-x aria-label="Fermer le menu">${svg('<path d="M6 6l12 12M18 6 6 18"/>')}</button></div>
    </div>
    <div class="om-srch" id="omS"><div><label class="om-sf">${svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>')}<input id="omQ" type="search" placeholder="Un soin, un actif, un besoin…" autocomplete="off" aria-label="Rechercher un soin"></label><div class="om-res" id="omR"></div></div></div>
    <div class="om-tabs" role="tablist"><span class="om-pill" id="omPill"></span>${TABS.map(t => `<button class="om-tab${t.club ? ' club' : ''}" role="tab" type="button" data-k="${t.k}" aria-selected="false">${esc(t.label)}</button>`).join('')}</div>
    <div class="om-views">${TABS.map(t => `<div class="om-v" data-k="${t.k}" role="tabpanel">${t.club ? club() : t.rows.map(row).join('')}</div>`).join('')}</div>
    <div class="om-foot"><a href="fidelite.html">Programme de fidélité</a><a href="diagnostic.html">Faire mon diagnostic</a></div>
  </aside>`;
  document.body.appendChild(el);

  const $ = s => el.querySelector(s), $$ = s => [...el.querySelectorAll(s)];
  const pill = $('#omPill'), tabsEl = $('.om-tabs');
  function setTab(k, instant) {
    $$('.om-tab').forEach(b => b.setAttribute('aria-selected', b.dataset.k === k));
    $$('.om-v').forEach(v => { const on = v.dataset.k === k; if (on && v.classList.contains('on')) return; v.classList.remove('on'); if (on) { void v.offsetWidth; v.classList.add('on'); } });
    const b = $(`.om-tab[data-k="${k}"]`);
    if (instant) pill.style.transition = 'none';
    pill.style.width = b.offsetWidth + 'px'; pill.style.height = b.offsetHeight + 'px'; pill.style.top = b.offsetTop + 'px'; pill.style.transform = `translateX(${b.offsetLeft - 16}px)`; pill.style.left = '16px';
    pill.classList.toggle('club', k === 'club');
    if (instant) { void pill.offsetWidth; pill.style.transition = ''; }
    const L = b.offsetLeft - tabsEl.clientWidth / 2 + b.offsetWidth / 2; tabsEl.scrollTo({ left: L, behavior: instant ? 'auto' : 'smooth' });
    $('.om-views').scrollTop = 0;
  }
  tabsEl.addEventListener('click', e => { const b = e.target.closest('.om-tab'); if (b) setTab(b.dataset.k); });
  el.addEventListener('click', e => {
    if (e.target.closest('[data-x]')) return close();
    const acc = e.target.closest('.om-acc > .om-row');
    if (acc) { const p = acc.parentElement, o = !p.classList.contains('open'); $$('.om-acc.open').forEach(a => { if (a !== p) { a.classList.remove('open'); a.firstElementChild.setAttribute('aria-expanded', 'false'); } }); p.classList.toggle('open', o); acc.setAttribute('aria-expanded', o);
      if (o) setTimeout(() => { const v = $('.om-views'), r = p.getBoundingClientRect(), vr = v.getBoundingClientRect(); if (r.top < vr.top || r.top > vr.top + vr.height * .45) v.scrollBy({ top: r.top - vr.top - 8, behavior: 'smooth' }); }, 320); return; }
    const a = e.target.closest('a[href]'); if (a && a.getAttribute('href').indexOf('#') > 0 && a.pathname.split('/').pop() === location.pathname.split('/').pop()) close();
  });

  /* recherche */
  let cat = null;
  const DEMO = ['serum-eclat-peptides', 'creme-reparatrice-intense', 'essence-hydratante-pro', 'huile-nuit-reparatrice'];
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function loadCat() { if (cat) return Promise.resolve(cat); return fetch('products.json').then(r => r.json()).then(d => (cat = (d.products || d).filter(p => !DEMO.includes(p.id) && p.category !== 'cadeau'))).catch(() => (cat = [])); }
  $('#omSB').addEventListener('click', () => { const s = $('#omS'), o = !s.classList.contains('on'); s.classList.toggle('on', o); $('#omSB').setAttribute('aria-expanded', o); if (o) { loadCat(); setTimeout(() => $('#omQ').focus(), 250); } });
  $('#omQ').addEventListener('input', e => {
    const q = norm(e.target.value).trim(), R = $('#omR');
    if (q.length < 2) { R.innerHTML = ''; return; }
    loadCat().then(list => {
      const words = q.split(/\s+/);
      const hits = list.filter(p => { const h = norm([p.name, p.name_line2, p.subtitle, p.gamme_label, (p.ingredients || []).join(' '), (p.benefits || []).join(' '), p.category].join(' ')); return words.every(w => h.includes(w)); }).slice(0, 6);
      R.innerHTML = hits.length ? hits.map(p => `<a href="/produits/${encodeURIComponent(p.id)}"><img src="cart-${p.id}.jpg" onerror="this.src='${esc(p.image)}'" alt=""><span><b>${esc(p.name)} ${esc(p.name_line2 || '')}</b><small>${esc(p.gamme_label || '')} · ${esc((p.bundles && p.bundles[0] && p.bundles[0].price) || '')}</small></span></a>`).join('')
        : `<p>Aucun soin ne correspond à « ${esc(e.target.value)} ». Essayez « peptides », « cheveux » ou « hydratation ».</p>`;
    });
  });

  /* ouverture / fermeture */
  let lastFocus = null;
  function open() {
    lastFocus = document.activeElement;
    const n = document.querySelector('.cart-n'); const c = $('#omCart'); const v = n ? n.textContent.trim() : ''; c.textContent = v; if (!v || v === '0') c.setAttribute('data-z', ''); else c.removeAttribute('data-z');
    el.classList.add('on'); el.setAttribute('aria-hidden', 'false'); document.documentElement.classList.add('om-lock');
    requestAnimationFrame(() => setTab(cur || PAGE_TAB, true));
    setTimeout(() => $('.om-x').focus({ preventScroll: true }), 400);
  }
  let cur = null;
  tabsEl.addEventListener('click', e => { const b = e.target.closest('.om-tab'); if (b) cur = b.dataset.k; });
  function close() { el.classList.remove('on'); el.setAttribute('aria-hidden', 'true'); document.documentElement.classList.remove('om-lock'); lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && el.classList.contains('on')) close(); });
  window.addEventListener('resize', () => { if (el.classList.contains('on')) { const b = $('.om-tab[aria-selected=true]'); if (b) { pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft - 16}px)`; } } });
  /* glisser vers la gauche pour fermer */
  let sx = null; const P = $('.om-p');
  let sy = 0;
  P.addEventListener('touchstart', e => { sx = e.target.closest('.om-tabs,.om-tick,.om-srch,input') ? null : e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  P.addEventListener('touchend', e => { const t = e.changedTouches[0], dx = sx === null ? 0 : sx - t.clientX, dy = Math.abs(t.clientY - sy); if (dx > 90 && dx > dy * 2) close(); sx = null; }, { passive: true });

  document.querySelectorAll('.mbtn').forEach(b => { b.removeAttribute('onclick'); b.addEventListener('click', e => { e.preventDefault(); open(); }); });

  /* ═══════════ ONAÉ — MÉGA-MENU ORDINATEUR (≥ 1025 px) ═══════════
     Remplace la barre de navigation PC de toutes les pages par un menu
     éditorial : méga-panneaux (Soins, Gammes, Coffrets, Journal, Marque),
     visuels qui changent au survol, best-seller, coffrets vedettes,
     carte Privilège et recherche plein écran.                         */
  (function boot() {
    /* Pages à barre compacte (fiche produit, routine) : sur ordinateur, on y crée le même en-tête que partout ailleurs */
    if (document.querySelector('.header')) return desk();
    const make = () => {
      const nav = document.querySelector('nav.nav'); if (!nav || document.querySelector('.header')) return !!nav;
      const ic = p => `<svg class="hico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${p}</svg>`;
      const h = document.createElement('header'); h.className = 'header dk-gen';
      h.innerHTML = `<a href="index.html" class="logo"><img src="logo-onae.svg" alt="ONAĒ"></a><div class="hactions">
        <a href="#" aria-label="Recherche">${ic('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>')}</a>
        <a href="mon-compte.html" aria-label="Compte">${ic('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>')}</a>
        <a href="panier.html" class="cart-btn" aria-label="Panier">${ic('<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>')}<span class="cart-n">${window.OnaeCart && OnaeCart.count ? OnaeCart.count() : 0}</span></a></div>`;
      nav.parentNode.insertBefore(h, nav); document.documentElement.classList.add('dk-has-gen');
      desk(); return true;
    };
    if (!make()) { const mo = new MutationObserver(() => { if (make()) mo.disconnect(); }); mo.observe(document.body, { childList: true, subtree: true }); }
  })();
  function desk() {
    const H = document.querySelector('.header'); if (!H || H.querySelector('.dk-l')) return;
    const fmt = n => n.toFixed(2).replace('.', ',') + ' €';
    const A = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    const CH = '<svg class="dk-ch" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4"><path d="m2 4 3 3 3-3"/></svg>';
    const dcss = '';
    if (!document.querySelector('link[href*="onae-desk.css"]')) { const st = document.createElement('link'); st.rel = 'stylesheet'; st.href = '/onae-desk.css?v=2'; document.head.appendChild(st); }

    const cur = page;
    const isCur = re => re.test(cur) ? ' cur' : '';
    const L = document.createElement('nav'); L.className = 'dk-l'; L.setAttribute('aria-label', 'Navigation principale');
    L.innerHTML = `
      <div class="dk-i" data-m="soins"><button class="dk-a${isCur(/^soins|nouveautes|product/)}" type="button" aria-expanded="false">Soins ${CH}</button></div>
      <div class="dk-i" data-m="gammes"><button class="dk-a${isCur(/gamme/)}" type="button" aria-expanded="false">Gammes ${CH}</button></div>
      <div class="dk-i" data-m="coffrets"><button class="dk-a${isCur(/coffrets|^box/)}" type="button" aria-expanded="false">Coffrets &amp; Duos ${CH}</button></div>
      <div class="dk-i"><a class="dk-a${isCur(/nouveautes/)}" href="nouveautes.html"><span class="dk-new"></span>Nouveautés</a></div>`;
    const R = document.createElement('nav'); R.className = 'dk-r'; R.setAttribute('aria-label', 'Navigation secondaire');
    R.innerHTML = `
      <div class="dk-i"><a class="dk-a${isCur(/diagnostic/)}" href="diagnostic.html">Diagnostic <span class="dk-ia">IA</span></a></div>
      <div class="dk-i dk-hide-s" data-m="journal"><button class="dk-a${isCur(/^blog/)}" type="button" aria-expanded="false">Journal ${CH}</button></div>
      <div class="dk-i" data-m="marque"><button class="dk-a${isCur(/histoire|engagements|ingredients|presse|fidelite/)}" type="button" aria-expanded="false">La Maison ${CH}</button></div>`;
    const logoA = H.querySelector('.logo'), acts = H.querySelector('.hactions');
    H.insertBefore(L, logoA || H.firstChild);
    if (acts) H.insertBefore(R, acts); else H.appendChild(R);

    const veil = document.createElement('div'); veil.className = 'dk-veil'; document.body.appendChild(veil);
    const P = document.createElement('div'); P.className = 'dk-p'; P.setAttribute('role', 'region'); H.appendChild(P);
    const S = document.createElement('div'); S.className = 'dk-s'; H.appendChild(S);

    /* ---------- contenus ---------- */
    const r8 = (i, html, tag = 'div', cls = '') => `<${tag} class="dk-r8 ${cls}" style="--i:${i}">${html}</${tag}>`;
    const VIS = {
      visage: ['creme-anti-age-peptides-6.jpg', 'Soins visage', 'Sérums & crèmes pour une peau éclatante'],
      yeux: ['patchs-yeux-hydrogel-2.jpg', 'Soins yeux', 'Un regard reposé, défatigué'],
      cheveux: ['apres-shampoing-agrumes-4.jpg', 'Soins cheveux', 'Force, brillance & cuir chevelu sain'],
      nouveautes: ['serum-gelee-prebiotiques-4.jpg', 'Nouveautés', 'Les derniers soins de la maison'],
      coffrets: ['serum-anti-age-peptides-4.jpg', 'Coffrets & duos', 'Des rituels pensés pour se répondre']
    };
    function build(cat) {
      const P0 = cat.filter(p => p.category !== 'box' && p.category !== 'cadeau');
      const count = c => P0.filter(p => (p.category || 'visage') === c).length;
      const nNew = P0.filter(p => /nouv/i.test(p.badge || '') || p.nouveaute).length;
      const best = P0.filter(p => p.bundles && p.bundles[0]).sort((a, b) => (a.bestseller_rank || 99) - (b.bestseller_rank || 99))[0];
      const byId = {}; cat.forEach(p => byId[p.id] = p);
      const price = p => p && p.bundles && p.bundles[0] ? p.bundles[0].price_raw : 0;
      /* offres coffrets */
      const byImg = {}; cat.forEach(p => byImg['cart-' + p.id + '.jpg'] = p.id);
      const seen = {}, offers = [];
      cat.forEach(p => { if (p.category === 'box') return; (p.bundles || []).forEach(b => {
        if (b.id === 'solo') return; const c = [...new Set((b.product_images || []).map(i => byImg[i] || byImg[String(i).replace(/-v\d+\.jpg$/, '.jpg')]).filter(Boolean))];
        if (c.length < 2 || c.length !== (b.product_images || []).length || seen[b.name + b.price_raw]) return; seen[b.name + b.price_raw] = 1;
        offers.push({ p, b, c, save: Math.max(0, (b.original_price_raw || 0) - b.price_raw) }); }); });
      const box = cat.find(p => p.category === 'box');
      const maxSave = Math.floor(Math.max(0, ...offers.map(o => o.save), box ? (box.bundles[0].original_price_raw || 0) - box.bundles[0].price_raw : 0));
      const pick = n => offers.find(o => o.b.name === n);
      const feat = [pick('Routine Cocon'), pick('Duo Prébiotiques')].filter(Boolean);

      const li = (k, href, t, s, n) => `<a class="dk-li" href="${href}" data-v="${k}"><span><b>${t}</b><small>${s}</small></span><span class="n">${n || ''}</span>${A}</a>`;
      const fig = k => `<figure data-v="${k}"><img src="${VIS[k][0]}" alt="" loading="lazy"><figcaption><small>${VIS[k][1]}</small><b>${VIS[k][2]}</b></figcaption></figure>`;
      const star = best ? `<a class="dk-star" href="/produits/${best.id}"><div class="im"><img src="cart-${best.id}.jpg" alt="" loading="lazy"><span class="tag">N°1 des ventes</span></div><h4>${esc(best.name)} ${esc(best.name_line2 || '')}</h4><p>${esc(best.gamme_label || '')}</p><div class="pr">${fmt(price(best))}<i>Découvrir →</i></div></a>` : '';

      const M = {};
      M.soins = `<div class="dk-in" style="grid-template-columns:330px 1fr 290px">
        <div>${r8(0, `<p class="dk-ey">Nos soins</p>`)}<div class="dk-list">
          ${r8(1, li('visage', 'soins-visage.html', 'Visage', 'Sérums, crèmes, brumes & peelings', count('visage') + ' soins'), 'div')}
          ${r8(2, li('yeux', 'soins-yeux.html', 'Regard', 'Contour des yeux & patchs', count('yeux') + ' soins'), 'div')}
          ${r8(3, li('cheveux', 'soins-cheveux.html', 'Cheveux', 'Shampoings, soins & cuir chevelu', count('cheveux') + ' soins'), 'div')}
          ${r8(4, li('nouveautes', 'nouveautes.html', 'Nouveautés', 'Les derniers nés de la maison', nNew ? nNew + ' nouveautés' : ''), 'div')}
          ${r8(5, li('coffrets', 'coffrets-duos.html', 'Coffrets & Duos', 'Rituels de 2 ou 3 soins', offers.length + 1 + ' offres'), 'div')}
        </div></div>
        ${r8(2, `<div class="dk-vis">${Object.keys(VIS).map(fig).join('')}</div>`, 'div', 'dk-visw')}
        ${r8(3, star)}
      </div>`;
      const GM = [['boost', 'Boost', 'Énergie & éclat', '#5F96BF', '#BDD0E2'], ['care', 'Care', 'Équilibre & protection', '#9B7DB5', '#CDBFDD'], ['hydraline', 'Hydraline', 'Hydratation & douceur', '#9A8200', '#F0E07A'], ['repare', 'Répare', 'Réparation & fermeté', '#A87AAA', '#E8D4EC']];
      const gN = k => P0.filter(p => (p.gamme || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(k)).length;
      M.gammes = `<div class="dk-in" style="grid-template-columns:280px 1fr">
        <div>${r8(0, '<p class="dk-ey">Nos gammes</p>')}${r8(1, '<h3 class="dk-h">Quatre univers,<br><em>une émotion</em> chacun.</h3>')}${r8(2, '<p class="dk-tx">Chaque gamme a sa couleur, sa promesse et sa façon de prendre soin de vous, de la peau jusqu’aux cheveux.</p>')}${r8(3, `<a class="dk-cta" href="nos-gammes.html">Comparer les 4 univers ${A}</a>`)}</div>
        <div class="dk-gg">${GM.map((g, i) => r8(i + 1, `<a class="dk-g" href="gamme-${g[0]}.html" style="--bg:${g[4]};--dot:${g[3]}"><img src="${g[0] === 'care' ? 'gamme-care.jpg?v=2' : 'gamme-' + g[0] + '.jpg'}" alt="Gamme o·${g[1]}" loading="lazy"><div class="cap"><b><i></i>o·${g[1].toLowerCase()}</b><small>${g[2]} · ${gN(g[0])} soins</small><span>Explorer ${A}</span></div></a>`)).join('')}</div>
      </div>`;
      const fan = o => `<a class="dk-c" href="/produits/${o.p.id}"><div class="fan" data-n="${o.c.length}" style="--bg:linear-gradient(150deg,#fbeef1,#fff)">${o.b.tag ? `<em>${esc(o.b.tag)}</em>` : ''}${o.c.map(id => `<span><img src="cart-${id}.jpg" alt="" loading="lazy"></span>`).join('')}</div><div class="bd"><b>${esc(o.b.name)}</b><div><strong>${fmt(o.b.price_raw)}</strong>${o.save > 0 ? `<small>Vous économisez ${fmt(o.save)}</small>` : ''}</div></div></a>`;
      const boxCard = box ? `<a class="dk-c" href="box.html"><div class="fan" style="--bg:#d9a9b5"><em>Coffret signature</em><img class="full" src="${box.image}" alt="" loading="lazy"></div><div class="bd"><b>${esc(box.name)} ${esc(box.name_line2 || '')}</b><div><strong>${fmt(box.bundles[0].price_raw)}</strong>${box.bundles[0].original_price_raw > box.bundles[0].price_raw ? `<small>Vous économisez ${fmt(box.bundles[0].original_price_raw - box.bundles[0].price_raw)}</small>` : ''}</div></div></a>` : '';
      M.coffrets = `<div class="dk-in" style="grid-template-columns:280px 1fr">
        <div>${r8(0, '<p class="dk-ey">Coffrets &amp; Duos</p>')}${r8(1, '<h3 class="dk-h">L’art du <em>duo</em>,<br>la magie du <em>rituel</em>.</h3>')}${r8(2, `<p class="dk-tx">${offers.length + 1} coffrets et duos pensés pour se compléter, jusqu’à ${maxSave} € d’économie. Livraison offerte dès 59 €.</p>`)}${r8(3, `<a class="dk-cta" href="coffrets-duos.html">Tous les coffrets ${A}</a>`)}</div>
        <div class="dk-cg">${[boxCard].concat(feat.map(fan)).map((h, i) => r8(i + 1, h)).join('')}</div>
      </div>`;
      const J = (TABS.find(t => t.k === 'journal') || { rows: [] }).rows.filter(r => !r.more).slice(0, 3);
      M.journal = `<div class="dk-in" style="grid-template-columns:280px 1fr">
        <div>${r8(0, '<p class="dk-ey">Le Journal Onaé</p>')}${r8(1, '<h3 class="dk-h">Conseils,<br><em>rituels</em> & actifs.</h3>')}${r8(2, '<p class="dk-tx">Comprendre sa peau pour mieux en prendre soin : nos articles écrits pour vous guider, sans jargon.</p>')}${r8(3, `<a class="dk-cta" href="blog.html">Tous les articles ${A}</a>`)}</div>
        <div class="dk-jg">${J.map((j, i) => r8(i + 1, `<a class="dk-j" href="${j.href}"><div class="im" style="--bg:${j.bg}"><img src="${j.img}" alt="" loading="lazy"></div><small>${esc(j.s || '')}</small><b>${esc(j.t)}</b></a>`)).join('')}</div>
      </div>`;
      M.marque = `<div class="dk-in" style="grid-template-columns:330px 1fr 340px">
        <div>${r8(0, '<p class="dk-ey">La Maison Onaé</p>')}<div class="dk-list">
          ${r8(1, li('h', 'notre-histoire.html', 'Notre histoire', 'Des routines simplifiées, une peau en meilleure santé'))}
          ${r8(2, li('e', 'nos-engagements.html', 'Nos engagements', 'Formules naturelles, vegan, transparentes'))}
          ${r8(3, li('i', 'nos-ingredients.html', 'Nos ingrédients', 'Les peptides, notre actif signature'))}
          ${r8(4, li('p', 'presse-partenariats.html', 'Presse & partenariats', 'Kit presse & collaborations'))}
        </div>${r8(5, '<div class="dk-aide"><a href="faq.html">FAQ</a><a href="livraison-retours.html">Livraison & retours</a><a href="suivi-commande.html">Suivi de commande</a><a href="contact.html">Contact</a></div>')}</div>
        ${r8(2, `<div class="dk-vis"><figure class="on"><img src="rituel-visage-poster.jpg" alt="" loading="lazy"><figcaption><small>Marque élaborée en France</small><b>Vos routines simplifiées,<br>votre peau en meilleure santé.</b></figcaption></figure></div>`)}
        ${r8(3, `<div class="dk-club"><div><small>Programme de fidélité</small><h4>Onaé Privilège</h4><p>Chaque commande vous rapporte des éclats, à transformer en réductions.</p><ul><li>50 éclats offerts à l’inscription</li><li>Paliers Rose, Nacre & Écrin</li><li>Éclats doublés le mois de votre anniversaire</li></ul></div><a href="fidelite.html">Rejoindre le club ${A}</a></div>`)}
      </div>`;
      return M;
    }

    /* ---------- ouverture / fermeture ---------- */
    let M = null, openK = null, tOpen = 0, tClose = 0;
    const items = [...H.querySelectorAll('.dk-i[data-m]')];
    function render(k) {
      if (!M) return false;
      P.innerHTML = M[k]; P.dataset.k = k;
      const vis = P.querySelector('.dk-vis'), lis = [...P.querySelectorAll('.dk-li[data-v]')];
      if (vis && vis.querySelectorAll('figure').length > 1) {
        const set = v => { vis.querySelectorAll('figure').forEach(f => f.classList.toggle('on', f.dataset.v === v)); lis.forEach(l => l.classList.toggle('hov', l.dataset.v === v)); };
        set(lis[0].dataset.v); lis.forEach(l => l.addEventListener('mouseenter', () => set(l.dataset.v)));
      }
      return true;
    }
    function show(k) {
      clearTimeout(tClose); closeSearch();
      if (openK === k) return;
      if (!render(k)) { loadCat().then(c => { M = build(c); if (openK === k) { render(k); requestAnimationFrame(() => P.classList.add('on')); } }); }
      const was = openK; openK = k;
      items.forEach(i => { const on = i.dataset.m === k; i.classList.toggle('on', on); i.firstElementChild.setAttribute('aria-expanded', on); });
      H.classList.add('dk-open'); veil.classList.add('on');
      if (M) { if (was) { P.classList.remove('on'); void P.offsetWidth; } P.classList.add('on'); }
    }
    function hide() {
      openK = null; P.classList.remove('on'); veil.classList.remove('on'); H.classList.remove('dk-open');
      items.forEach(i => { i.classList.remove('on'); i.firstElementChild.setAttribute('aria-expanded', 'false'); });
    }
    const isDesk = () => matchMedia('(min-width:1025px)').matches;
    let moved = false; addEventListener('pointermove', () => { moved = true; }, { once: true, passive: true });
    items.forEach(i => {
      i.addEventListener('mouseenter', () => { if (!isDesk() || !moved) return; clearTimeout(tClose); clearTimeout(tOpen); tOpen = setTimeout(() => show(i.dataset.m), openK ? 0 : 90); });
      i.addEventListener('mouseleave', () => { clearTimeout(tOpen); });
      i.firstElementChild.addEventListener('click', e => { e.preventDefault(); openK === i.dataset.m ? hide() : show(i.dataset.m); });
    });
    H.addEventListener('mouseleave', () => { clearTimeout(tOpen); if (openK) tClose = setTimeout(hide, 220); });
    H.addEventListener('mouseenter', () => clearTimeout(tClose));
    H.querySelectorAll('.dk-i:not([data-m]), .logo, .hactions').forEach(x => x.addEventListener('mouseenter', () => { clearTimeout(tOpen); if (openK) tClose = setTimeout(hide, 260); }));
    veil.addEventListener('click', () => { hide(); closeSearch(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { hide(); closeSearch(); } });
    addEventListener('scroll', () => H.classList.toggle('dk-sc', scrollY > 24), { passive: true }); H.classList.toggle('dk-sc', scrollY > 24);
    if ('requestIdleCallback' in window) requestIdleCallback(() => loadCat().then(c => { M = M || build(c); })); else setTimeout(() => loadCat().then(c => { M = M || build(c); }), 1500);

    /* ---------- recherche plein écran ---------- */
    S.innerHTML = `<div class="in"><label class="dk-sf"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input type="search" placeholder="Un soin, un actif, un besoin…" aria-label="Rechercher un soin" autocomplete="off"><button type="button">Fermer</button></label>
      <div class="dk-chips">${['Peptides', 'Rétinol', 'Hydratation', 'Cernes', 'Cheveux', 'Prébiotiques', 'Kératine', 'Coffret'].map(t => `<button type="button">${t}</button>`).join('')}</div><div class="dk-sr"></div></div>`;
    const sIn = S.querySelector('input'), sR = S.querySelector('.dk-sr');
    function openSearch() { hide(); S.classList.add('on'); veil.classList.add('on'); H.classList.add('dk-open'); loadCat(); setTimeout(() => sIn.focus(), 200); if (!sIn.value) run(''); }
    function closeSearch() { if (!S.classList.contains('on')) return; S.classList.remove('on'); if (!openK) { veil.classList.remove('on'); H.classList.remove('dk-open'); } }
    function run(v) {
      const q = norm(v).trim();
      loadCat().then(list => {
        let hits;
        if (q.length < 2) hits = list.filter(p => p.bundles && p.bundles[0] && p.category !== 'box').sort((a, b) => (a.bestseller_rank || 99) - (b.bestseller_rank || 99)).slice(0, 4);
        else { const w = q.split(/\s+/); hits = list.filter(p => { const h = norm([p.name, p.name_line2, p.subtitle, p.gamme_label, (p.ingredients || []).join(' '), (p.benefits || []).map(b => b && (b.title || b.text || b)).join(' '), p.category].join(' ')); return w.every(x => h.includes(x)); }).slice(0, 8); }
        sR.innerHTML = (q.length < 2 ? '<p style="grid-column:1/-1;margin:0 0 -6px">Les plus aimés en ce moment</p>' : '') + (hits.length ? hits.map(p => `<a href="/produits/${encodeURIComponent(p.id)}"><div class="im"><img src="cart-${p.id}.jpg" alt="" loading="lazy"></div><b>${esc(p.name)} ${esc(p.name_line2 || '')}</b><small>${esc(p.gamme_label || '')}${p.bundles && p.bundles[0] ? ' · ' + fmt(p.bundles[0].price_raw) : ''}</small></a>`).join('') : `<p>Aucun soin ne correspond à « ${esc(v)} ». Essayez « peptides », « cheveux » ou « hydratation ».</p>`);
      });
    }
    sIn.addEventListener('input', () => run(sIn.value));
    S.querySelector('.dk-sf button').addEventListener('click', closeSearch);
    S.querySelectorAll('.dk-chips button').forEach(b => b.addEventListener('click', () => { sIn.value = b.textContent; run(sIn.value); sIn.focus(); }));
    const sBtn = H.querySelector('.hactions a[aria-label="Recherche"], .hactions [aria-label="Rechercher"]');
    if (sBtn) sBtn.addEventListener('click', e => { if (!isDesk()) return; e.preventDefault(); S.classList.contains('on') ? closeSearch() : openSearch(); });
  }


  /* ═══════════ ÉCLATS ONAÉ PRIVILÈGE SUR LES CARTES PRODUITS ═══════════
     Sous le prix de chaque carte produit du site (pas sur la fiche, qui l'affiche déjà) :
     « ✦ +39 éclats ». Même calcul que le serveur : arrondi inférieur de (prix × taux du palier),
     taux 1 pour une invitée, taux réel (Rose 1 · Nacre 1,25 · Écrin 1,5) pour une membre connectée. */
  (function eclats() {
    if (/^product|^produits/.test(page) || location.pathname.indexOf('/produits/') === 0 || /panier|checkout/.test(page)) return;
    const st = document.createElement('style'); st.textContent = `
.oe-ecl{display:inline-flex;align-items:center;gap:5px;margin-top:7px;padding:4px 9px 4px 8px;border-radius:0;background:linear-gradient(120deg,#fbf3e6,#f6e7cf);color:#8a6a2c;font:500 10.5px/1.2 var(--font-b,'DM Sans',sans-serif);letter-spacing:.04em;white-space:nowrap;vertical-align:middle}
.oe-ecl svg{width:10px;height:10px;color:#c39a4a;flex:none}
.oe-ecl b{font-family:inherit!important;font-size:inherit!important;line-height:inherit!important;font-weight:600!important;color:#6e521f;display:inline!important;margin:0!important}
.oe-ecl.blk{display:flex;width:max-content}
.cd-foot .oe-ecl,.nv-foot+.oe-ecl{margin-top:8px}`;
    document.head.appendChild(st);
    let rate = 1;
    const SEL = '.pprice, .cat-price, .nv-foot > b, .cd-price > b';
    const euros = t => { const m = String(t || '').replace(/\s/g, '').match(/(\d+)[,.](\d{2})/); return m ? parseFloat(m[1] + '.' + m[2]) : 0; };
    const label = n => `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 0c.4 2.9 1.9 4.6 6 6-4.1 1.4-5.6 3.1-6 6-.4-2.9-1.9-4.6-6-6 4.1-1.4 5.6-3.1 6-6z" fill="currentColor"/></svg><b>+${n}</b> éclat${n > 1 ? 's' : ''}`;
    function paint() {
      document.querySelectorAll(SEL).forEach(el => {
        if (el.closest('.dk-p,.dk-s,.om,.oc-toast')) return;
        const v = euros(el.textContent); if (!(v > 0)) return;
        const n = Math.floor(v * rate);
        const host = el.closest('.pprices, .cat-prices, .cat-foot') || (el.matches('.nv-foot > b') ? el.parentElement : el.closest('.cd-price')) || el;
        let tag = host.nextElementSibling && host.nextElementSibling.classList.contains('oe-ecl') ? host.nextElementSibling : (host.querySelector(':scope > .oe-ecl'));
        if (!tag) { tag = document.createElement('span'); tag.className = 'oe-ecl'; tag.title = 'Éclats Onaé Privilège gagnés avec ce soin (1 € = 1 éclat)';
          if (host.classList.contains('cd-price')) host.appendChild(tag); else { tag.classList.add('blk'); host.insertAdjacentElement('afterend', tag); } }
        if (tag.dataset.n !== String(n)) { tag.dataset.n = n; tag.innerHTML = label(n); }
      });
    }
    let t = 0; const later = () => { clearTimeout(t); t = setTimeout(paint, 120); };
    new MutationObserver(m => { if (m.some(r => [...r.addedNodes].some(x => x.nodeType === 1 && !(x.classList && x.classList.contains('oe-ecl'))))) later(); }).observe(document.body, { childList: true, subtree: true });
    paint(); setTimeout(paint, 900);
    fetch('/api/me', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null).then(j => { const u = j && (j.user || j); const r = u && u.loyalty && u.loyalty.rate; if (r && r !== rate) { rate = r; paint(); } }).catch(() => {});
  })();


  /* ═══════════ 3 BIENFAITS SUR CHAQUE CARTE PRODUIT ═══════════
     Entre les avis et le prix : les 3 premiers bienfaits du produit (champ `benefits` de products.json),
     sur toutes les cartes du site (accueil, soins visage/yeux/cheveux, gammes, nouveautés). */
  (function benefits() {
    const st = document.createElement('style'); st.textContent = `
.oe-ben{list-style:none;margin:12px 0 14px;padding:12px 0 0;border-top:1px solid rgba(20,20,20,.07);display:grid;gap:6px;text-align:left}
.oe-ben li{display:flex;align-items:flex-start;gap:8px;font:400 12.5px/1.35 var(--font-b,'DM Sans',sans-serif);color:#3d3a3c;letter-spacing:.005em}
.oe-ben svg{flex:none;width:14px;height:14px;margin-top:1px;color:var(--oe-acc,#c9556e)}
.oe-ben span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
@media(max-width:600px){.oe-ben{gap:5px;margin-top:10px;padding-top:10px}.oe-ben li{font-size:12px}.oe-ben svg{width:13px;height:13px}}`;
    document.head.appendChild(st);
    const ACC = { 'o·boost': '#5f96bf', 'e·boost': '#5f96bf', 'o·care': '#9b7db5', 'o·hydraline': '#b39300', 'hydraline': '#b39300', 'o·répare': '#b06aa8', 'o·repare': '#b06aa8' };
    const ICO = '<svg viewBox="0 0 12 12" aria-hidden="true"><defs><linearGradient id="oeg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6c88f"/><stop offset=".55" stop-color="#b8924a"/><stop offset="1" stop-color="#8a6a2c"/></linearGradient></defs><path d="M6 .9 11.1 6 6 11.1.9 6z" fill="none" stroke="url(#oeg)" stroke-width="1"/><path d="M6 3.9 8.1 6 6 8.1 3.9 6z" fill="url(#oeg)"/></svg>';
    const idOf = card => {
      const b = card.querySelector('[data-add-to-cart]'); if (b) return b.getAttribute('data-add-to-cart').split('--')[0];
      const a = card.matches('a[href]') ? card : card.querySelector('a[href*="produits/"], a[href*="product.html?id="]');
      const h = a && a.getAttribute('href') || ''; const m = h.match(/produits\/([^/?#]+)/) || h.match(/[?&]id=([^&#]+)/); return m ? decodeURIComponent(m[1]) : '';
    };
    function paint(list) {
      const by = {}; list.forEach(p => by[p.id] = p);
      document.querySelectorAll('.pcard, .cat-card, .nv-card').forEach(card => {
        if (card.querySelector('.oe-ben') || card.closest('.dk-p,.dk-s,.om')) return;
        const p = by[idOf(card)]; if (!p || !p.benefits || !p.benefits.length) return;
        const items = p.benefits.map(b => typeof b === 'string' ? b : (b && b.title) || '').filter(Boolean).slice(0, 3); if (!items.length) return;
        const foot = card.querySelector('.pfoot, .cat-footer, .cat-foot, .nv-foot') || card.querySelector('.cat-body > .cat-prices'); if (!foot) return;
        const ul = document.createElement('ul'); ul.className = 'oe-ben'; ul.style.setProperty('--oe-acc', ACC[p.gamme] || '#c9556e');
        ul.innerHTML = items.map(t => `<li>${ICO}<span>${esc(t)}</span></li>`).join('');
        foot.parentNode.insertBefore(ul, foot);
      });
    }
    let t = 0; const run = () => loadCat().then(paint);
    new MutationObserver(m => { if (m.some(r => [...r.addedNodes].some(x => x.nodeType === 1 && x.matches && (x.matches('.pcard,.cat-card,.nv-card') || x.querySelector && x.querySelector('.pcard,.cat-card,.nv-card'))))) { clearTimeout(t); t = setTimeout(run, 80); } }).observe(document.body, { childList: true, subtree: true });
    run();
  })();

  window.OnaeMenu = { open, close, tab: setTab };
})();
