/* Bar à routines : la cliente compose sa routine de 3 soins, ordonnés automatiquement (du plus léger au plus riche). */
(function(){
  const bar = document.getElementById('bar-routines'); if(!bar) return;
  const MAX = 3, KEY = 'onae_bar';
  const GC = {'o·boost':['#d3e6ff','#4f86b3'],'o·care':['#ffefff','#9b6fb5'],'o·hydraline':['#f9db86','#a07d00'],'o·répare':['#f6dbe6','#c9556e']};
  /* type de soin → rang dans la routine (ordre d'application) et famille pour les « accords parfaits » */
  function kind(id){
    const T = [
      ['peeling','Exfoliant',0,'soin'],['brume-visage','Brume',1,'soin'],['patchs','Patchs regard',4,'regard'],['contour','Contour des yeux',5,'regard'],
      ['serum-cuir','Sérum cuir chevelu',24,'fin'],['serum','Sérum',2,'soin'],['creme','Crème',6,'creme'],
      ['gommage','Gommage',20,'lav'],['apres-shampoing','Après-shampoing',22,'soinc'],['shampoing-sec','Shampoing sec',27,'lav'],['shampoing','Shampoing',21,'lav'],
      ['masque','Masque',23,'soinc'],['soin-hydratant','Soin sans rinçage',25,'fin'],['brume-capillaire','Brume capillaire',26,'fin'],['huile','Huile',28,'fin']];
    const t = T.find(x => id.includes(x[0])) || ['', 'Soin', 9, 'soin'];
    return {label:t[1], rank:t[2], group:t[3], fam:t[2] >= 20 ? 'hair' : 'face'};
  }
  const fmt = n => n.toFixed(2).replace('.', ',') + ' €';
  /* −20 % sur la routine complète, prix terminé en ,99 : même règle que cart.js / stripe.js */
  const barPrice = sum => { const t = Math.floor(Math.round(sum * 100) * .8); return (Math.floor((t + 1) / 100) * 100 - 1) / 100; };
  const pct = (ref, price) => ref > price ? Math.floor((1 - price / ref) * 100 + 1e-9) : 0;   /* % affiché arrondi à l'inférieur */
  const refOf = p => p.orig > p.price ? p.orig : p.price;
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let P = [], byId = {}, sel = [], cat = 'visage';
  try { sel = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch(_) { sel = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(sel)); } catch(_) {} };

  const slotsEl = bar.querySelector('.bar-slots'), rail = bar.querySelector('.bar-rail'), sum = bar.querySelector('.bar-sum');
  const cta = bar.querySelector('.bar-cta'), reset = bar.querySelector('.bar-reset');
  const mob = document.querySelector('.bar-mob');

  const ordered = () => sel.map(id => byId[id]).filter(Boolean).sort((a,b) => a.k.rank - b.k.rank);

  function renderSlots(landId){
    const list = ordered();
    slotsEl.innerHTML = '';
    for(let i = 0; i < MAX; i++){
      const p = list[i], s = document.createElement('div');
      s.className = 'bar-slot' + (p ? ' full' : '') + (p && p.id === landId ? ' landing' : '');
      s.setAttribute('role', 'listitem');
      if(p){
        s.dataset.id = p.id; s.style.setProperty('--c', p.c); s.style.setProperty('--d', p.d);
        s.innerHTML = `<div class="bar-niche"><img src="${p.img}" alt="${esc(p.name)}" decoding="async"><span class="bar-hl"></span><span class="bar-step"><b>Étape ${i+1}</b><span> · ${esc(p.k.label)}</span></span></div>
          <button class="bar-x" type="button" aria-label="Retirer ${esc(p.name)}">×</button><div class="bar-plinth"></div>
          <div class="bar-info"><h4>${esc(p.name)}</h4><p>${esc(p.l2)}</p><b>${p.orig > p.price ? `<s>${fmt(p.orig)}</s>` : ''}${fmt(p.price)}${p.orig > p.price ? `<em>−${pct(p.orig, p.price)}&nbsp;%</em>` : ''}</b></div>`;
        s.querySelector('.bar-x').addEventListener('click', e => { e.stopPropagation(); toggle(p.id); });
        s.addEventListener('click', () => { location.href = '/produits/' + p.id; });
      } else {
        s.innerHTML = `<div class="bar-niche"><span class="bar-plus">+</span><span class="bar-empty-t"><b>Soin 0${i+1}</b>À choisir</span></div><div class="bar-plinth"></div><div class="bar-info"></div>`;
        s.addEventListener('click', () => rail.scrollIntoView({behavior:'smooth', block:'center'}));
      }
      slotsEl.appendChild(s);
    }
  }

  function accords(){
    const list = ordered(); if(!list.length || list.length >= MAX) return new Set();
    const fam = list[0].k.fam, have = new Set(list.map(p => p.k.group)), gam = new Set(list.map(p => p.gamme));
    const groups = fam === 'face' ? ['soin','regard','creme'] : ['lav','soinc','fin'];
    const miss = groups.filter(g => !have.has(g));
    const cand = P.filter(p => !sel.includes(p.id) && p.k.fam === fam && miss.includes(p.k.group))
      .map(p => ({p, s:(gam.has(p.gamme) ? 2 : 0) + (p.best ? 1 : 0)})).sort((a,b) => b.s - a.s);
    const out = new Set(); miss.forEach(g => cand.filter(x => x.p.k.group === g).slice(0, 2).forEach(x => out.add(x.p.id)));
    return out;
  }

  function missing(){
    const list = ordered(); if(!list.length) return [];
    const have = new Set(list.map(p => p.k.group));
    const L = list[0].k.fam === 'face' ? {soin:'un sérum', regard:'un soin du regard', creme:'une crème'} : {lav:'un shampoing', soinc:'un soin ou un masque', fin:'une finition (sérum, brume ou huile)'};
    return Object.keys(L).filter(g => !have.has(g)).map(g => L[g]).slice(0, MAX - list.length);
  }
  function renderRail(){
    const C = CONCERNS.find(x => x.k === concern);
    const items = P.filter(p => (cat === 'all' || p.cat === cat) && (!C || (C.cat ? p.cat === C.cat : C.re.test(p.txt)))), acc = accords();
    const cnt = bar.querySelector('.bar-count'); if(cnt) cnt.textContent = items.length + ' soin' + (items.length > 1 ? 's' : '');
    rail.innerHTML = '';
    items.forEach((p, k) => {
      const b = document.createElement('div'); b.tabIndex = 0; b.setAttribute('role', 'button');
      b.className = 'bar-item' + (sel.includes(p.id) ? ' on' : '') + (acc.has(p.id) ? ' acc' : '');
      b.dataset.id = p.id; b.style.cssText = `--c:${p.c};--d:${p.d};--k:${Math.min(k, 8)}`;
      b.setAttribute('aria-pressed', sel.includes(p.id));
      b.innerHTML = `<span class="bar-item-img"><img src="${p.img}" alt="" loading="lazy" decoding="async"><span class="bar-g">${esc(p.gamme)}</span><span class="bar-acc">Accord parfait</span><span class="bar-item-on"><span>✓</span></span><button type="button" class="bar-more" aria-label="Découvrir ${esc(p.name)} ${esc(p.l2)}">Découvrir</button></span>
        <span class="bar-item-b"><span class="bar-type">${esc(p.k.label)}</span><h5>${esc(p.name)}<small>${esc(p.l2)}</small></h5>
        <span class="bar-item-f"><span class="bar-pr">${p.orig > p.price ? `<span class="bar-pr-o"><s>${fmt(p.orig)}</s><em>−${pct(p.orig, p.price)}&nbsp;%</em></span>` : ''}<b>${fmt(p.price)}</b></span><span class="bar-add" aria-hidden="true">${sel.includes(p.id) ? '✓' : '+'}</span></span></span>`;
      b.addEventListener('click', e => { if(e.target.closest('.bar-more')){ e.stopPropagation(); openInfo(p.id); return; } toggle(p.id, b); });
      b.addEventListener('keydown', e => { if((e.key === 'Enter' || e.key === ' ') && e.target === b){ e.preventDefault(); toggle(p.id, b); } });
      rail.appendChild(b);
    });
  }
  function refreshRail(){
    const acc = accords();
    rail.querySelectorAll('.bar-item').forEach(b => { const on = sel.includes(b.dataset.id);
      b.classList.toggle('on', on); b.classList.toggle('acc', acc.has(b.dataset.id)); b.setAttribute('aria-pressed', on);
      b.querySelector('.bar-add').textContent = on ? '✓' : '+'; });
  }

  function renderSum(){
    const list = ordered(), n = list.length, sumP = list.reduce((s,p) => s + p.price, 0), sumR = list.reduce((s,p) => s + refOf(p), 0), tot = n >= MAX ? barPrice(sumP) : sumP, eco = sumP - tot, gainP = sumR - sumP, gainT = sumR - tot;
    bar.classList.toggle('full', n >= MAX);
    sum.querySelectorAll('.bar-prog span').forEach((s,i) => s.classList.toggle('on', i < n));
    sum.querySelector('.bar-prog-t').textContent = n + ' / 3 soins';
    sum.querySelector('.bar-tot').textContent = fmt(tot);
    const was = sum.querySelector('.bar-was'), off = sum.querySelector('.bar-off'), pc = pct(sumR, tot);
    was.hidden = !(sumR > tot); was.textContent = fmt(sumR); off.hidden = !pc; off.innerHTML = `−${pc}&nbsp;%`;
    /* tout ce que la cliente gagne : remises des soins + −20 % routine complète */
    const sv = sum.querySelector('.bar-perk-save'); sv.hidden = !n; sv.classList.add('ok');
    sv.innerHTML = `<span class="bar-ln"><span>Remises sur vos soins</span><b>−${fmt(gainP)}</b></span>` + (n >= MAX
      ? `<span class="bar-ln"><span>Routine complète −20&nbsp;%</span><b>−${fmt(eco)}</b></span>`
      : `<span class="bar-ln bar-ln-next"><span>Encore ${MAX - n} soin${MAX - n > 1 ? 's' : ''} : −20&nbsp;% en plus sur toute votre routine</span></span>`);
    const gn = sum.querySelector('.bar-perk-gain'); gn.hidden = !(n && gainT > 0); gn.innerHTML = `Vous gagnez <b>${fmt(gainT)}</b>${pc ? ` <em>soit −${pc}&nbsp;%</em>` : ''}`;
    const sh = sum.querySelector('.bar-perk-ship'), free = (window.OnaeCart && OnaeCart.FREE_SHIPPING) || 59;
    sh.classList.toggle('ok', tot >= free);
    sh.textContent = tot >= free ? 'Livraison offerte' : (n ? `Plus que ${fmt(free - tot)} pour la livraison offerte` : 'Livraison offerte dès 59 €');
    const ec = sum.querySelector('.bar-perk-ec'); ec.hidden = !n; ec.classList.add('ok'); ec.innerHTML = `<b>+${Math.floor(tot)} éclats</b> fidélité Onaé Privilège`;
    const tip = sum.querySelector('.bar-perk-tip'), miss = n && n < MAX ? missing() : [];
    tip.hidden = !miss.length; if(miss.length) tip.innerHTML = `Notre conseil : ajoutez ${miss.join(' et ')} <em>(repérez « Accord parfait » dans la vitrine)</em>`;
    cta.disabled = n < MAX; cta.classList.toggle('ready', n >= MAX); cta.classList.remove('done');
    cta.querySelector('span').textContent = n >= MAX ? 'Ajouter ma routine −20\u00a0%' : (n ? `Encore ${MAX - n} soin${MAX - n > 1 ? 's' : ''} à choisir` : 'Choisissez 3 soins');
    reset.hidden = !n;
    if(mob){
      mob.querySelector('.bar-mob-n').textContent = n + '/3';
      mob.querySelector('.bar-mob-p').innerHTML = (sumR > tot ? `<s>${fmt(sumR)}</s>` : '') + fmt(tot) + (pc ? `<em>−${pc}&nbsp;%</em>` : '');
      const b = mob.querySelector('.bar-mob-b'); b.disabled = n < MAX; b.textContent = n >= MAX ? 'Ajouter' : `+ ${MAX - n} soin${MAX - n > 1 ? 's' : ''}`;
      mob.querySelector('.bar-mob-th').innerHTML = [0,1,2].map(i => list[i] ? `<i class="f" style="background-image:url('${list[i].img}');background-color:${list[i].c}"></i>` : '<i></i>').join('');
      mobVis();
    }
  }

  function msg(t){
    let m = sum.querySelector('.bar-msg'); if(!m){ m = document.createElement('div'); m.className = 'bar-msg'; sum.appendChild(m); }
    m.textContent = t; m.classList.add('on'); sum.classList.remove('shake'); void sum.offsetWidth; sum.classList.add('shake');
    clearTimeout(msg.t); msg.t = setTimeout(() => m.classList.remove('on'), 2600);
  }

  function fly(srcEl, id){
    const slot = slotsEl.querySelector(`.bar-slot[data-id="${id}"]`); if(!slot) return;
    const img = srcEl && srcEl.querySelector('img'), done = () => { slot.classList.remove('landing'); slot.classList.add('pop'); };
    if(!img || matchMedia('(prefers-reduced-motion:reduce)').matches || !img.animate){ done(); return; }
    const a = img.getBoundingClientRect(), niche = slot.querySelector('.bar-niche').getBoundingClientRect();
    if(niche.bottom < 0 || niche.top > innerHeight){ done(); return; }
    const c = img.cloneNode(); c.className = 'bar-fly'; c.style.background = byId[id].c; document.body.appendChild(c);
    c.animate([
      {left:a.left+'px', top:a.top+'px', width:a.width+'px', height:a.height+'px', borderRadius:'0', opacity:1},
      {left:(a.left+niche.left)/2+'px', top:Math.min(a.top, niche.top)-60+'px', width:(a.width+niche.width)/2+'px', height:(a.height+niche.height)/2+'px', borderRadius:'40% 40% 0 0', opacity:1, offset:.55},
      {left:niche.left+'px', top:niche.top+'px', width:niche.width+'px', height:niche.height+'px', borderRadius:niche.width/2+'px '+niche.width/2+'px 0 0', opacity:.9}
    ], {duration:850, easing:'cubic-bezier(.65,0,.35,1)', fill:'forwards'}).onfinish = () => { c.remove(); done(); };
  }

  function toggle(id, srcEl){
    const i = sel.indexOf(id);
    if(i >= 0){ sel.splice(i, 1); save(); renderSlots(); refreshRail(); renderSum(); return; }
    if(sel.length >= MAX){ msg('Votre routine est complète : retirez un soin pour en choisir un autre.'); return; }
    sel.push(id); save(); renderSlots(id); refreshRail(); renderSum(); fly(srcEl, id);
  }

  function addAll(btn){
    const list = ordered(); if(list.length < MAX || !window.OnaeCart) return;
    const id = OnaeCart.barId && OnaeCart.barId(list.map(p => p.id));
    if(!id){ msg('Un instant, nous préparons votre routine…'); setTimeout(() => addAll(btn), 700); return; }
    OnaeCart.add(id, 1); OnaeCart.toast && OnaeCart.toast(id);
    document.querySelectorAll('.cart-n, .cart-badge span').forEach(x => { x.textContent = OnaeCart.count(); x.classList.remove('cart-bump'); void x.offsetWidth; x.classList.add('cart-bump'); });
    cta.classList.add('done'); cta.classList.remove('ready'); cta.querySelector('span').textContent = '✓ Votre routine est dans le panier';
    if(btn && btn !== cta){ const o = btn.textContent; btn.textContent = '✓'; setTimeout(() => { btn.textContent = o; }, 2000); }
    setTimeout(renderSum, 2600);
  }
  cta.addEventListener('click', () => addAll(cta));
  reset.addEventListener('click', () => { sel = []; save(); renderSlots(); refreshRail(); renderSum(); });

  bar.querySelectorAll('.bar-tabs button').forEach(t => t.addEventListener('click', () => {
    cat = t.dataset.cat; bar.querySelectorAll('.bar-tabs button').forEach(x => x.setAttribute('aria-selected', x === t)); rail.scrollLeft = 0; renderRail();
  }));
  const step = () => Math.max(240, rail.clientWidth * .8);
  bar.querySelector('.bar-prev').addEventListener('click', () => rail.scrollBy({left:-step()}));
  bar.querySelector('.bar-next').addEventListener('click', () => rail.scrollBy({left:step()}));

  /* barre fixe mobile, visible quand le bar est à l'écran et qu'un soin est choisi */
  let inView = false;
  function mobVis(){ if(mob) mob.classList.toggle('on', inView && sel.length > 0); }
  if(mob){
    document.body.appendChild(mob);
    new IntersectionObserver(es => { inView = es[0].isIntersecting; mobVis(); }, {threshold:.12}).observe(bar);
    mob.querySelector('.bar-mob-b').addEventListener('click', e => addAll(e.currentTarget));
    mob.querySelector('.bar-mob-th').addEventListener('click', () => slotsEl.scrollIntoView({behavior:'smooth', block:'center'}));
  }

  /* Nos routines phares : chaque prix accompagné du prix de base barré et du % de remise */
  function phares(){
    document.querySelectorAll('#routines .rtc-card').forEach(card => {
      const ps = (card.dataset.ids || '').split(',').map(i => byId[i]).filter(Boolean); if(ps.length !== 3) return;
      card.querySelectorAll('.rtc-steps li').forEach((li, i) => { const p = ps[i], b = li.querySelector('b'); if(!p || !b || !(p.orig > p.price) || b.dataset.ref) return;
        b.dataset.ref = 1; b.innerHTML = `<s>${fmt(p.orig)}</s>${fmt(p.price)}<em>−${pct(p.orig, p.price)}&nbsp;%</em>`; });
      const buy = card.querySelector('.rtc-buy > span'), tb = buy && buy.querySelector('b'); if(!tb || buy.dataset.ref) return;
      const price = parseFloat(tb.textContent.replace(/[^\d,]/g, '').replace(',', '.')), ref = ps.reduce((s,p) => s + refOf(p), 0), pc = pct(ref, price);
      if(!(ref > price)) return; buy.dataset.ref = 1;
      tb.insertAdjacentHTML('beforebegin', `<s class="rtc-was">${fmt(ref)}</s>`); tb.insertAdjacentHTML('afterend', `<em class="rtc-pct">−${pc}&nbsp;%</em>`);
      const sv = buy.querySelector('.rtc-save'); const gain = `Vous gagnez ${fmt(ref - price)}`;
      if(sv) sv.textContent = gain; else buy.insertAdjacentHTML('beforeend', `<em class="rtc-save">${gain}</em>`);
    });
  }
  /* ── besoins (page Bar à routines) ── */
  let concern = '', ready = false;
  const CONCERNS = [
    {k:'rides', l:'Rides & fermeté', re:/ride|ferme|raffermi|élasticit|anti-âge|peptide|rétinol|retinol|lift/i},
    {k:'eclat', l:'Éclat & teint', re:/éclat|teint|tache|pigment|vitamine c|lumin|terne/i},
    {k:'hydra', l:'Hydratation & confort', re:/hydrat|nourri|sèche|seche|confort|repulp|désaltér/i},
    {k:'imperf', l:'Imperfections', re:/imperfection|bouton|pore|microbiome|niacinamide|aha|peeling|exfoli/i},
    {k:'regard', l:'Cernes & regard', re:/cerne|poche|regard|contour/i},
    {k:'cheveux', l:'Cheveux', cat:'cheveux'}];
  function concerns(){
    const box = bar.querySelector('.bar-concerns'); if(!box) return;
    box.innerHTML = '<button type="button" class="on" data-k="">Tous les besoins</button>' + CONCERNS.map(c => `<button type="button" data-k="${c.k}">${c.l}</button>`).join('');
    box.querySelectorAll('button').forEach(bt => bt.addEventListener('click', () => {
      concern = bt.dataset.k; box.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === bt));
      if(concern){ const C = CONCERNS.find(x => x.k === concern); cat = C.cat || 'all'; bar.querySelectorAll('.bar-tabs button').forEach(x => x.setAttribute('aria-selected', x.dataset.cat === cat)); }
      rail.scrollLeft = 0; renderRail(); }));
  }

  /* ── panneau « Découvrir » : bienfaits, actifs, geste, résultats, avant d'ajouter ── */
  let dr = null;
  function openInfo(id){
    const p = byId[id]; if(!p) return; const r = p.r || {};
    if(!dr){ dr = document.createElement('div'); dr.className = 'bar-dr'; dr.setAttribute('aria-hidden', 'true');
      dr.innerHTML = '<div class="bar-dr-bg"></div><aside class="bar-dr-p" role="dialog" aria-modal="true" aria-label="Détail du soin"><button type="button" class="bar-dr-x" aria-label="Fermer">×</button><div class="bar-dr-c"></div></aside>';
      document.body.appendChild(dr);
      const close = () => { dr.classList.remove('on'); dr.setAttribute('aria-hidden', 'true'); };
      dr.querySelector('.bar-dr-bg').addEventListener('click', close); dr.querySelector('.bar-dr-x').addEventListener('click', close);
      addEventListener('keydown', e => { if(e.key === 'Escape') close(); });
      dr._close = close; }
    const on = sel.includes(id), ben = (r.benefits || []).slice(0, 4).map(b => typeof b === 'string' ? {title:b} : b);
    const st = r.efficacy && r.efficacy.stats || [], top = st.length ? st[st.length - 1] : null, how = (r.how_to_use || []).find(x => x && x.desc);
    dr.querySelector('.bar-dr-c').innerHTML = `
      <div class="bar-dr-img" style="--c:${p.c}"><img src="${p.img}" alt="${esc(p.name)} ${esc(p.l2)}"><span class="bar-g" style="--d:${p.d}">${esc(p.gamme)}</span>${r.volume ? `<span class="bar-dr-vol">${esc(r.volume)}</span>` : ''}</div>
      <div class="bar-dr-b">
        <p class="bar-type">${esc(p.k.label)}</p>
        <h3>${esc(p.name)}<em>${esc(p.l2)}</em></h3>
        ${r.subtitle ? `<p class="bar-dr-sub">${esc(r.subtitle)}</p>` : ''}
        <div class="bar-dr-price">${p.orig > p.price ? `<s>${fmt(p.orig)}</s>` : ''}<b>${fmt(p.price)}</b>${p.orig > p.price ? `<em>−${pct(p.orig, p.price)}&nbsp;%</em>` : ''}<span>puis −20&nbsp;% dans votre routine de 3 soins</span></div>
        ${top ? `<div class="bar-dr-eff"><b>${top.pct}&nbsp;%</b><span>des testeuses satisfaites ${esc(String(top.when).toLowerCase())}<small>${esc(r.efficacy.source || 'Auto-évaluation, résultats variables.')}</small></span></div>` : ''}
        ${ben.length ? `<h4>Ses bienfaits</h4><ul class="bar-dr-ben">${ben.map(b => `<li><i></i><span><b>${esc(b.title || '')}</b>${b.desc ? esc(b.desc) : ''}</span></li>`).join('')}</ul>` : ''}
        ${(r.ingredients || []).length ? `<h4>Ses actifs</h4><p class="bar-dr-ing">${r.ingredients.slice(0, 6).map(x => `<span>${esc(x)}</span>`).join('')}</p>` : ''}
        ${how ? `<h4>Le geste</h4><p class="bar-dr-how">${esc(how.desc)}</p>` : ''}
        <div class="bar-dr-act"><button type="button" class="bar-dr-add${on ? ' on' : ''}">${on ? '✓ Dans ma routine · retirer' : '+ Ajouter à ma routine'}</button><a href="/produits/${id}" class="bar-dr-link" target="_top">Voir la fiche complète →</a></div>
      </div>`;
    dr.querySelector('.bar-dr-add').addEventListener('click', () => { const was = sel.includes(id); if(!was && sel.length >= MAX){ dr._close(); msg('Votre routine est complète : retirez un soin pour en choisir un autre.'); return; }
      toggle(id, rail.querySelector(`.bar-item[data-id="${id}"]`)); dr._close(); });
    dr.classList.add('on'); dr.setAttribute('aria-hidden', 'false');
  }
  /* API pour la page Bar à routines (inspirations) */
  window.OnaeBar = {
    set(ids){ const run = () => { sel = ids.filter(id => byId[id]).slice(0, MAX); save(); renderSlots(); refreshRail(); renderSum(); slotsEl.scrollIntoView({behavior:'smooth', block:'center'}); };
      ready ? run() : addEventListener('onaebar', run, {once:true}); },
    open: openInfo
  };

  fetch('/products.json?v=130').then(r => r.json()).then(d => {
    P = (d.products || []).filter(p => !['box','cadeau'].includes(p.category) && !p.virtual && p.bundles && p.bundles[0] && p.bundles[0].price_raw > 0).map(p => {
      const g = GC[p.gamme] || ['#f0ece8','#9b6fb5'], b = p.bundles[0];
      return {id:p.id, cat:p.category || 'visage', gamme:p.gamme, name:p.name, l2:p.name_line2 || '', price:b.price_raw, orig:b.original_price_raw || 0,
        img:'bar-' + p.id + '-v2.jpg', c:g[0], d:g[1], k:kind(p.id), best:!!(p.bestseller || p.bestseller_rank), r:p,
        txt:[p.name, p.name_line2, p.subtitle, ...(p.benefits || []).map(x => typeof x === 'string' ? x : (x.title || '') + ' ' + (x.desc || ''))].join(' ')};
    });
    P.sort((a,b) => a.k.rank - b.k.rank || (a.best === b.best ? 0 : a.best ? -1 : 1));
    P.forEach(p => byId[p.id] = p);
    sel = sel.filter(id => byId[id]).slice(0, MAX);
    concerns(); renderSlots(); renderRail(); renderSum();
    phares(); ready = true; window.dispatchEvent(new Event('onaebar'));
  }).catch(() => { renderSlots(); renderSum(); });
})();
