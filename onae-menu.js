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
    : r.img ? `<span class="om-th" style="--bg:${r.bg || '#f4ece6'}"><img src="${r.img}" alt="" loading="lazy"></span>` : '';
  const txt = r => `<span class="om-tx"><strong>${esc(r.t)}</strong>${r.badge ? `<span class="om-bdg${r.hot ? ' hot' : ''}">${esc(r.badge)}</span>` : ''}${r.s ? `<small>${esc(r.s)}</small>` : ''}</span>`;
  const row = (r, i) => {
    if (r.more) return `<a class="om-more om-r" style="--i:${i}" href="${r.href}">${esc(r.t)} <span>→</span></a>`;
    if (r.sub) return `<div class="om-acc om-r" style="--i:${i}"><button class="om-row" type="button" aria-expanded="false">${th(r)}${txt(r)}<span class="om-pl" aria-hidden="true">+</span></button>
      <div class="om-sub"><div><div class="om-sg${r.sub.length === 3 ? ' c3' : ''}">${r.sub.map((s, j) => s.more
        ? `<a class="om-sc more" style="--i:${j}" href="${s.href}"><span style="position:static;padding:0;background:none"><b>${esc(s.t)}</b><small>${esc(s.s || '')}</small></span><em style="font-style:normal">→</em></a>`
        : `<a class="om-sc" style="--i:${j};--bg:${s.bg}" href="${s.href}"><img src="${s.img}" alt="" loading="lazy"><span><b>${s.dot ? `<i style="--dot:${s.dot}"></i>` : ''}${esc(s.t)}</b><small>${esc(s.s)}</small></span></a>`).join('')}</div></div></div></div>`;
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
  function loadCat() { if (cat) return Promise.resolve(cat); return fetch('products.json').then(r => r.json()).then(d => (cat = (d.products || d).filter(p => !DEMO.includes(p.id)))).catch(() => (cat = [])); }
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
  window.OnaeMenu = { open, close, tab: setTab };
})();
