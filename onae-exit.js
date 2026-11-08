/* ═══════════ ONAÉ — POP-UP DE SORTIE « UN CADEAU AVANT DE PARTIR » ═══════════
   Déclenchement : souris qui quitte la fenêtre par le haut (ordinateur) ;
   remontée rapide ou retour sur l'onglet (mobile). 8 s minimum sur le site.
   Une fois par session ; après « Plus tard », plus rien pendant 3 jours
   (une pastille discrète « −10 % vous attend » reste pour la session).
   Le code est personnel (serveur /api/welcome) et appliqué au panier.
   Aperçu forcé : ajouter ?exit=1 à n'importe quelle URL.                     */
(function () {
  if (window.__onaeExit) return; window.__onaeExit = 1;
  const path = location.pathname.toLowerCase();
  if (/checkout|admin|concours|reglement|compte|cgv|mentions/.test(path)) return;

  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} } };
  const SS = { get(k) { try { return sessionStorage.getItem(k); } catch (_) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (_) {} } };
  const force = /[?&]exit=1\b/.test(location.search);
  const have = LS.get('onae_welcome');
  if (!force && have && have.code) return;               /* code déjà obtenu : le panier s'en charge */
  const snooze = LS.get('onae_exit_snooze') || 0;
  if (!force && Date.now() < snooze) return;
  const start = Date.now(), MIN = 8000;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IMG = '/serum-anti-age-peptides-5.jpg';
  const PCT = 10;

  /* ---------- styles ---------- */
  const st = document.createElement('style');
  st.textContent = `
.ox{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:24px;font-family:'DM Sans',system-ui,sans-serif;color:#160f13;visibility:hidden}
.ox.on{visibility:visible}
.ox-veil{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 40%,rgba(40,22,30,.45),rgba(12,7,10,.78));backdrop-filter:blur(7px) saturate(1.1);-webkit-backdrop-filter:blur(7px) saturate(1.1);opacity:0;transition:opacity .6s ease}
.ox.on .ox-veil{opacity:1}
.ox-box{position:relative;display:grid;grid-template-columns:1fr 1.08fr;width:min(920px,100%);min-height:560px;background:#fbf6f3;box-shadow:0 40px 120px -20px rgba(10,4,8,.6),0 0 0 1px rgba(230,199,156,.35);opacity:0;transform:translateY(26px) scale(.96);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1);overflow:hidden}
.ox.on .ox-box{opacity:1;transform:none}
.ox-vis{position:relative;overflow:hidden;background:#2a1c20}
.ox-vis img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.12);transition:transform 6s cubic-bezier(.16,1,.3,1)}
.ox.on .ox-vis img{transform:scale(1.02)}
.ox-vis::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(22,15,19,0) 45%,rgba(22,15,19,.72)),linear-gradient(90deg,rgba(22,15,19,0) 70%,rgba(251,246,243,.12))}
.ox-vcap{position:absolute;left:34px;right:34px;bottom:30px;z-index:2;color:#fbf6f3}
.ox-vcap small{display:block;font-size:10.5px;letter-spacing:.32em;text-transform:uppercase;color:#e6c79c;margin-bottom:8px}
.ox-vcap p{font-family:'DM Serif Display',Georgia,serif;font-size:25px;line-height:1.15;margin:0;font-style:italic}
.ox-sp{position:absolute;z-index:1;width:4px;height:4px;border-radius:50%;background:#f3dfb8;box-shadow:0 0 10px 2px rgba(243,223,184,.8);opacity:0;animation:oxSp 5s ease-in-out infinite}
@keyframes oxSp{0%{opacity:0;transform:translateY(0) scale(.6)}25%{opacity:1}100%{opacity:0;transform:translateY(-120px) scale(1.2)}}
.ox-main{position:relative;padding:54px 54px 40px;display:flex;flex-direction:column;justify-content:center}
.ox-main::before{content:"";position:absolute;inset:14px;border:1px solid rgba(201,164,106,.38);pointer-events:none}
.ox-x{position:absolute;top:22px;right:22px;z-index:5;width:40px;height:40px;border:0;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#5a4a50;transition:transform .4s,color .3s}
.ox-x:hover{transform:rotate(90deg);color:#160f13}
.ox-x svg{width:18px;height:18px;stroke:currentColor;stroke-width:1.4;fill:none}
.ox-eb{font-size:11px;letter-spacing:.34em;text-transform:uppercase;color:#a8834f;margin:0 0 18px;display:flex;align-items:center;gap:12px}
.ox-eb::before{content:"";width:28px;height:1px;background:#c9a46a}
.ox-h{font-family:'DM Serif Display',Georgia,serif;font-weight:400;font-size:34px;line-height:1.08;margin:0 0 6px;letter-spacing:-.01em}
.ox-h em{color:#c9556e}
.ox-big{font-family:'DM Serif Display',Georgia,serif;font-size:118px;line-height:.92;margin:12px 0 2px;letter-spacing:-.04em;background:linear-gradient(100deg,#8a6a3a 0%,#c9a46a 22%,#f6e7c8 42%,#c9a46a 58%,#8a6a3a 80%,#c9a46a 100%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:oxSh 4.5s linear infinite}
.ox-big sup{font-size:.42em;vertical-align:.95em;margin-left:4px;letter-spacing:0}
@keyframes oxSh{to{background-position:-220% 0}}
.ox-sub{font-size:15px;color:#5a4a50;margin:0 0 20px}
.ox-sub b{color:#160f13;font-weight:500}
.ox-perks{list-style:none;padding:0;margin:0 0 24px;display:grid;gap:9px}
.ox-perks li{display:flex;align-items:center;gap:11px;font-size:13.5px;color:#3a2e33}
.ox-perks i{flex:none;width:18px;height:18px;border-radius:50%;background:#c9556e;display:flex;align-items:center;justify-content:center}
.ox-perks svg{width:10px;height:10px;stroke:#fff;stroke-width:2.5;fill:none}
.ox-f{display:flex;flex-direction:column;gap:10px}
.ox-in{width:100%;height:54px;border:1px solid #d9c9c0;background:#fff;padding:0 18px;font:15px 'DM Sans',system-ui,sans-serif;color:#160f13;outline:none;transition:border-color .3s,box-shadow .3s;border-radius:0}
.ox-in:focus{border-color:#c9a46a;box-shadow:0 0 0 4px rgba(201,164,106,.16)}
.ox-in.err{border-color:#c9556e}
.ox-go{position:relative;overflow:hidden;height:56px;border:0;background:#160f13;color:#fbf6f3;font:500 13px 'DM Sans',system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:12px;transition:background .4s}
.ox-go:hover{background:#2c1d23}
.ox-go::after{content:"";position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(100deg,transparent,rgba(243,223,184,.35),transparent);transform:skewX(-20deg);animation:oxGl 3.2s ease-in-out infinite}
@keyframes oxGl{0%,55%{left:-60%}100%{left:130%}}
.ox-go svg{width:16px;height:16px;stroke:#e6c79c;stroke-width:1.6;fill:none}
.ox-go[disabled]{opacity:.7;cursor:wait}
.ox-msg{min-height:18px;font-size:12.5px;color:#c9556e;margin:2px 0 0}
.ox-no{align-self:center;margin-top:8px;border:0;background:none;font:13px 'DM Sans',system-ui,sans-serif;color:#8a7a80;cursor:pointer;text-decoration:underline;text-underline-offset:4px;text-decoration-color:rgba(138,122,128,.4)}
.ox-no:hover{color:#160f13}
.ox-legal{font-size:10.5px;line-height:1.5;color:#9a8a90;margin:14px 0 0;text-align:center}
/* étape 2 : le code */
.ox-s2{display:none;text-align:center;align-items:center}
.ox.done .ox-s1{display:none}
.ox.done .ox-s2{display:flex;flex-direction:column}
.ox-ok{width:62px;height:62px;border-radius:50%;margin:0 auto 18px;background:radial-gradient(circle at 35% 30%,#f6e7c8,#c9a46a 60%,#8a6a3a);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px -8px rgba(138,106,58,.6);animation:oxPop .8s cubic-bezier(.34,1.56,.64,1) both}
.ox-ok svg{width:26px;height:26px;stroke:#fff;stroke-width:2.2;fill:none;stroke-dasharray:40;stroke-dashoffset:40;animation:oxDraw .6s .35s ease forwards}
@keyframes oxPop{from{transform:scale(0)}to{transform:scale(1)}}
@keyframes oxDraw{to{stroke-dashoffset:0}}
.ox-code{position:relative;margin:22px auto 10px;padding:20px 30px;min-width:290px;font-family:'DM Serif Display',Georgia,serif;font-size:36px;letter-spacing:.14em;color:#160f13;background:#fff}
.ox-code::before{content:"";position:absolute;inset:0;padding:1px;background:linear-gradient(120deg,#8a6a3a,#f6e7c8,#c9a46a,#8a6a3a);background-size:300% 100%;animation:oxSh 3s linear infinite;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.ox-copy{display:inline-flex;align-items:center;gap:9px;border:0;background:none;font:500 12px 'DM Sans',system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#a8834f;cursor:pointer;padding:8px}
.ox-copy svg{width:15px;height:15px;stroke:currentColor;stroke-width:1.6;fill:none}
.ox-auto{font-size:14px;color:#3a2e33;margin:16px 0 4px}
.ox-auto b{font-weight:500}
.ox-exp{font-size:12px;color:#9a8a90;margin:0 0 24px}
.ox-s2 .ox-go{width:100%;text-decoration:none}
.ox-conf{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:4}
.ox-conf i{position:absolute;top:-12px;width:7px;height:11px;opacity:.95}
/* pastille de rappel */
.oxt{position:fixed;left:20px;bottom:20px;z-index:9990;display:flex;align-items:center;background:#160f13;color:#fbf6f3;box-shadow:0 14px 40px -10px rgba(10,4,8,.55);font-family:'DM Sans',system-ui,sans-serif;transform:translateY(140%);transition:transform .7s cubic-bezier(.16,1,.3,1)}
.oxt.on{transform:none}
.oxt-b{display:flex;align-items:center;gap:12px;border:0;background:none;color:inherit;cursor:pointer;padding:13px 6px 13px 18px;font:13px 'DM Sans',system-ui,sans-serif}
.oxt-b b{font-family:'DM Serif Display',Georgia,serif;font-weight:400;font-size:21px;color:#e6c79c}
.oxt-b span{letter-spacing:.04em}
.oxt-x{border:0;background:none;color:#8a7a80;cursor:pointer;padding:13px 14px;font-size:18px;line-height:1}
.oxt-x:hover{color:#fbf6f3}
@media(max-width:760px){
 .ox{align-items:flex-end;padding:0}
 .ox-box{grid-template-columns:1fr;min-height:0;width:100%;max-height:94vh;overflow-y:auto;transform:translateY(100%);transition:opacity .4s,transform .75s cubic-bezier(.16,1,.3,1)}
 .ox-vis{height:150px}
 .ox-vcap{left:20px;bottom:14px}.ox-vcap small{font-size:9.5px;margin-bottom:5px}.ox-vcap p{font-size:17px}
 .ox-main{padding:24px 22px 18px}
 .ox-main::before{inset:7px}
 .ox-x{top:8px;right:8px;width:36px;height:36px;color:#fbf6f3;background:rgba(22,15,19,.38);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
 .ox.done .ox-x{color:#5a4a50;background:none;backdrop-filter:none}
 .ox-eb{margin-bottom:10px;font-size:10px}
 .ox-h{font-size:24px}
 .ox-big{font-size:70px;margin:6px 0 0}
 .ox-sub{font-size:14px;margin-bottom:12px}
 .ox-perks{margin-bottom:14px;gap:6px}.ox-perks li{font-size:12.5px;gap:9px}.ox-perks i{width:16px;height:16px}
 .ox-in{height:50px}.ox-go{height:52px}
 .ox-no{margin-top:2px}.ox-legal{margin-top:8px;font-size:10px}
 .ox.done .ox-vis{display:none}
 .ox-code{font-size:28px;min-width:0;width:100%;padding:16px 10px}
 .oxt{left:12px;bottom:12px}
}
@media(prefers-reduced-motion:reduce){.ox *,.oxt{animation:none!important;transition:none!important}}`;
  document.head.appendChild(st);

  const check = '<i aria-hidden="true"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></i>';
  const ox = document.createElement('div');
  ox.className = 'ox'; ox.setAttribute('role', 'dialog'); ox.setAttribute('aria-modal', 'true'); ox.setAttribute('aria-labelledby', 'oxH');
  ox.innerHTML = `
  <div class="ox-veil" data-ox-close></div>
  <div class="ox-box">
    <button class="ox-x" type="button" aria-label="Fermer" data-ox-close><svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg></button>
    <div class="ox-vis"><img src="${IMG}" alt="Sérum Anti-âge aux Peptides Onaé à la lueur d'une bougie" decoding="async">
      ${Array.from({ length: 9 }, (_, i) => `<span class="ox-sp" style="left:${8 + i * 10}%;top:${55 + (i * 37) % 40}%;animation-delay:${(i * .55).toFixed(2)}s"></span>`).join('')}
      <div class="ox-vcap"><small>Onaé · Élaborée en France</small><p>« Prenez le temps<br>de prendre soin de vous. »</p></div>
    </div>
    <div class="ox-main">
      <div class="ox-s1">
        <p class="ox-eb">Avant de partir</p>
        <h2 class="ox-h" id="oxH">Un cadeau, <em>rien que pour vous</em>.</h2>
        <div class="ox-big" aria-label="moins ${PCT} pour cent">−${PCT}<sup>%</sup></div>
        <p class="ox-sub">sur <b>votre première commande</b>, avec votre code personnel.</p>
        <ul class="ox-perks">
          <li>${check}Bombe de bain esprit SPA offerte avec chaque commande</li>
          <li>${check}Livraison offerte dès 59 €</li>
          <li>${check}Code valable 7 jours, sur tous nos soins</li>
        </ul>
        <form class="ox-f" novalidate>
          <input class="ox-in" type="email" name="email" placeholder="Votre adresse e-mail" autocomplete="email" inputmode="email" required aria-label="Votre adresse e-mail">
          <button class="ox-go" type="submit"><span>Révéler mon code</span><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
          <p class="ox-msg" role="status"></p>
        </form>
        <button class="ox-no" type="button" data-ox-later>Plus tard</button>
        <p class="ox-legal">En validant, vous acceptez de recevoir les actualités et offres Onaé par e-mail. Désinscription en un clic.</p>
      </div>
      <div class="ox-s2">
        <div class="ox-ok"><svg viewBox="0 0 24 24"><polyline points="5,12.5 10,17 19,7"/></svg></div>
        <p class="ox-eb" style="justify-content:center">C'est à vous</p>
        <h2 class="ox-h">Votre code est prêt.</h2>
        <div class="ox-code" aria-live="polite">ONAE-·····</div>
        <button class="ox-copy" type="button"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12"/><path d="M16 8V4H4v12h4"/></svg><span>Copier le code</span></button>
        <p class="ox-auto">Il est <b>déjà appliqué à votre panier</b> : −${PCT} % au paiement.</p>
        <p class="ox-exp"></p>
        <a class="ox-go" href="${/panier/.test(path) ? '/panier.html' : '/index.html#products'}" data-ox-cta><span>${/panier/.test(path) ? 'Finaliser ma commande' : 'Découvrir nos best-sellers'}</span><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      </div>
    </div>
    <div class="ox-conf"></div>
  </div>`;
  document.body.appendChild(ox);
  const $ = s => ox.querySelector(s);

  /* pastille de rappel */
  const oxt = document.createElement('div');
  oxt.className = 'oxt';
  oxt.innerHTML = `<button class="oxt-b" type="button"><b>−${PCT} %</b><span>Votre cadeau vous attend</span></button><button class="oxt-x" type="button" aria-label="Masquer">×</button>`;
  document.body.appendChild(oxt);
  oxt.querySelector('.oxt-b').onclick = () => { oxt.classList.remove('on'); open(true); };
  oxt.querySelector('.oxt-x').onclick = () => { oxt.classList.remove('on'); SS.set('onae_exit_teaser', '0'); };

  let shown = false, lastFocus = null;
  function open(manual) {
    if (ox.classList.contains('on')) return;
    if (!manual && (shown || SS.get('onae_exit_seen'))) return;
    shown = true; SS.set('onae_exit_seen', '1');
    lastFocus = document.activeElement;
    ox.classList.add('on');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => { const i = $('.ox-in'); if (i && matchMedia('(pointer:fine)').matches) i.focus({ preventScroll: true }); }, 500);
  }
  function close(later) {
    ox.classList.remove('on');
    document.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    if (!ox.classList.contains('done') && later !== false) {
      LS.set('onae_exit_snooze', Date.now() + 3 * 864e5);
      if (SS.get('onae_exit_teaser') !== '0') { SS.set('onae_exit_teaser', '1'); setTimeout(() => oxt.classList.add('on'), 900); }
    }
  }
  ox.addEventListener('click', e => { if (e.target.closest('[data-ox-close]')) close(); if (e.target.closest('[data-ox-later]')) close(); });
  document.addEventListener('keydown', e => {
    if (!ox.classList.contains('on')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { /* focus piégé dans la fenêtre */
      const f = [...ox.querySelectorAll('button,input,a[href]')].filter(x => x.offsetParent);
      if (!f.length) return; const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
  $('[data-ox-cta]').addEventListener('click', e => { if (/panier/.test(path)) { e.preventDefault(); close(false); location.reload(); } else close(false); });

  /* envoi de l'e-mail → code personnel */
  $('.ox-f').addEventListener('submit', async e => {
    e.preventDefault();
    const inp = $('.ox-in'), msg = $('.ox-msg'), btn = $('.ox-go');
    const email = inp.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { inp.classList.add('err'); msg.textContent = 'Merci de saisir une adresse e-mail valide.'; inp.focus(); return; }
    inp.classList.remove('err'); msg.textContent = ''; btn.disabled = true; btn.querySelector('span').textContent = 'Un instant…';
    try {
      const r = await fetch('/api/welcome', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, source: 'exit-popup' }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 409) throw new Error('Ce code de bienvenue a déjà été utilisé avec cette adresse.');
      if (!r.ok || !j.code) throw new Error('Une erreur est survenue, merci de réessayer.');
      LS.set('onae_welcome', { code: j.code, percent: j.percent, expires: j.expires });
      window.dispatchEvent(new CustomEvent('onae:welcome', { detail: j }));
      reveal(j);
    } catch (err) {
      msg.textContent = err.message; btn.disabled = false; btn.querySelector('span').textContent = 'Révéler mon code';
    }
  });

  function reveal(j) {
    ox.classList.add('done');
    const d = new Date(j.expires);
    $('.ox-exp').textContent = `Valable jusqu'au ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} · une seule utilisation`;
    /* le code se « déchiffre » lettre après lettre */
    const box = $('.ox-code'), target = j.code, A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    if (reduce) box.textContent = target;
    else { let k = 0; const t = setInterval(() => { k++; box.textContent = target.split('').map((c, i) => i < 5 || i < k / 2 + 5 ? c : A[Math.random() * A.length | 0]).join(''); if (k / 2 + 5 >= target.length) { clearInterval(t); box.textContent = target; } }, 45); }
    $('.ox-copy').onclick = () => {
      const done = () => { $('.ox-copy span').textContent = 'Copié ✓'; setTimeout(() => $('.ox-copy span').textContent = 'Copier le code', 2200); };
      if (navigator.clipboard) navigator.clipboard.writeText(target).then(done, done); else done();
    };
    confetti();
  }
  function confetti() {
    if (reduce) return;
    const c = $('.ox-conf'), col = ['#e6c79c', '#c9a46a', '#f6e7c8', '#d4a0ab', '#c9556e', '#fbf6f3'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i'); p.style.left = Math.random() * 100 + '%'; p.style.background = col[i % col.length];
      if (i % 3 === 0) p.style.borderRadius = '50%';
      c.appendChild(p);
      p.animate([{ transform: `translate(0,0) rotate(0)`, opacity: 1 }, { transform: `translate(${(Math.random() - .5) * 160}px,${520 + Math.random() * 260}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }],
        { duration: 1800 + Math.random() * 1400, delay: Math.random() * 400, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }).onfinish = () => p.remove();
    }
  }

  /* ---------- déclencheurs ---------- */
  const ready = () => Date.now() - start > MIN;
  if (SS.get('onae_exit_teaser') === '1') setTimeout(() => oxt.classList.add('on'), 1200);
  if (force) { setTimeout(() => open(true), 400); return; }
  /* ordinateur : la souris sort par le haut (vers les onglets / la barre d'adresse) */
  document.addEventListener('mouseout', e => { if (!e.relatedTarget && e.clientY <= 6 && ready()) open(); });
  /* mobile : remontée rapide après avoir parcouru la page, ou retour sur l'onglet */
  if (matchMedia('(pointer:coarse)').matches) {
    let ly = scrollY, lt = performance.now(), maxY = 0;
    addEventListener('scroll', () => {
      const y = scrollY, t = performance.now(); maxY = Math.max(maxY, y);
      const v = (ly - y) / Math.max(1, t - lt);           /* px/ms vers le haut */
      if (v > 2.2 && maxY > 900 && y > 200 && ready()) open();
      ly = y; lt = t;
    }, { passive: true });
    let hid = 0;
    document.addEventListener('visibilitychange', () => { if (document.hidden) hid = Date.now(); else if (hid && Date.now() - hid > 4000 && ready()) setTimeout(open, 600); });
  }
})();
