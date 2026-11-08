/* ═══════════ ONAÉ — LÉA, CONSEILLÈRE BEAUTÉ (WHATSAPP) ═══════════
   - Bulle conciergerie (bas droite) + panneau façon conversation : écrire à Léa sur WhatsApp, ou recevoir ses conseils
   - Panier : « Léa garde votre panier au chaud » (inscription WhatsApp + suivi du panier)
   - Après commande : « Recevoir mes conseils d'utilisation »
   Visible si le numéro WhatsApp est branché (/api/wa/config), ou en aperçu avec ?lea=1.            */
(function () {
  if (window.__onaeLea) return; window.__onaeLea = 1;
  const path = location.pathname.toLowerCase();
  if (/admin|concours|reglement/.test(path)) return;
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} } };
  if (/[?&]lea=1\b/.test(location.search)) { try { sessionStorage.setItem('onae_lea_preview', '1'); } catch (_) {} }
  const preview = (() => { try { return sessionStorage.getItem('onae_lea_preview') === '1'; } catch (_) { return false; } })();
  const onCart = /panier/.test(path), onCheckout = /checkout/.test(path);
  const success = onCheckout && /[?&]success=1\b/.test(location.search);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  fetch('/api/wa/config', { cache: 'no-store' }).then(r => r.json()).then(cfg => {
    /* boutique fermée au public (prélancement) : seules les personnes avec l'accès privé voient le site → Léa visible en aperçu */
    if (!cfg.enabled && !preview && !cfg.preview) { syncCart(); return; }
    start(cfg);
  }).catch(() => { if (preview) start({ enabled: false, number: '', consent: '' }); });

  /* synchronisation du panier pour les inscrites (même si la bulle est masquée) */
  let syncT = 0;
  function syncCart() {
    const id = LS.get('onae_wa_id'); if (!/^[a-f0-9]{16}$/.test(id || '') || !window.OnaeCart) return;
    const push = lines => { clearTimeout(syncT); syncT = setTimeout(() => {
      fetch('/api/wa/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, cart: (lines || OnaeCart.lines()).map(l => ({ id: l.id, qty: l.qty })) }) })
        .then(r => { if (r.status === 404) { try { localStorage.removeItem('onae_wa_id'); } catch (_) {} } }).catch(() => {});
    }, 1200); };
    OnaeCart.onChange(push); push();
  }

  function start(cfg) {
    const CONSENT = cfg.consent || "J'accepte que Léa, l'assistante beauté d'Onaé, m'envoie sur WhatsApp des rappels de panier, des conseils et des offres. Désinscription à tout moment en répondant STOP.";
    const waLink = t => cfg.number ? `https://wa.me/${cfg.number}?text=${encodeURIComponent(t)}` : '';
    const me = () => { try { return JSON.parse(LS.get('onae_wa_me') || 'null'); } catch (_) { return null; } };

    const st = document.createElement('style');
    st.textContent = `
.lea,.lea *{box-sizing:border-box}
.lea{--ink:#160f13;--mid:#6b5a60;--cream:#fbf6f3;--rose:#c9556e;--gold:#c9a46a;font-family:'DM Sans',system-ui,sans-serif;color:var(--ink)}
.lea-av{position:relative;flex:none;width:46px;height:46px;border-radius:50%;background:radial-gradient(circle at 30% 25%,#fff4ef,#f3d9dd 70%);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px rgba(201,164,106,.55)}
.lea-av b{font-family:'DM Serif Display',Georgia,serif;font-weight:400;font-size:24px;line-height:1;background:linear-gradient(135deg,#8a6a3a,#d9b77c 45%,#a8834f);-webkit-background-clip:text;background-clip:text;color:transparent;transform:translateY(1px)}
.lea-av i{position:absolute;right:1px;bottom:2px;width:11px;height:11px;border-radius:50%;background:#3fbf73;box-shadow:0 0 0 2px #fff}
.lea-fab{position:fixed;right:22px;bottom:22px;z-index:9980;border:0;padding:0;background:var(--ink);width:62px;height:62px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 18px 40px -12px rgba(22,15,19,.55),0 0 0 1px rgba(201,164,106,.4);transform:scale(.4);opacity:0;transition:transform .7s cubic-bezier(.34,1.56,.64,1),opacity .4s}
.lea-fab.on{transform:none;opacity:1}
.lea-fab .lea-av{width:50px;height:50px}
.lea-fab::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:1px solid rgba(201,164,106,.5);animation:leaRing 3.2s ease-out infinite}
@keyframes leaRing{0%{transform:scale(.92);opacity:.9}70%,100%{transform:scale(1.25);opacity:0}}
.lea-tip{position:fixed;right:96px;bottom:34px;z-index:9980;max-width:250px;background:#fff;padding:12px 16px 12px 15px;font-size:13.5px;line-height:1.45;box-shadow:0 16px 40px -14px rgba(22,15,19,.35),0 0 0 1px rgba(201,164,106,.3);opacity:0;transform:translateX(12px);transition:opacity .5s,transform .6s cubic-bezier(.16,1,.3,1);pointer-events:none}
.lea-tip.on{opacity:1;transform:none;pointer-events:auto;cursor:pointer}
.lea-tip b{font-weight:500}
.lea-tip::after{content:"";position:absolute;right:-6px;bottom:16px;width:12px;height:12px;background:#fff;transform:rotate(45deg);box-shadow:1px -1px 0 rgba(201,164,106,.3)}
.lea-pan{position:fixed;right:22px;bottom:98px;z-index:9985;width:380px;max-width:calc(100vw - 24px);max-height:calc(100vh - 130px);display:flex;flex-direction:column;background:var(--cream);box-shadow:0 40px 90px -20px rgba(22,15,19,.5),0 0 0 1px rgba(201,164,106,.35);opacity:0;transform:translateY(18px) scale(.97);transform-origin:bottom right;pointer-events:none;transition:opacity .45s,transform .6s cubic-bezier(.16,1,.3,1)}
.lea-pan.on{opacity:1;transform:none;pointer-events:auto}
.lea-hd{display:flex;align-items:center;gap:13px;padding:18px 18px 16px;background:var(--ink);color:#fbf6f3;position:relative;overflow:hidden}
.lea-hd::before{content:"";position:absolute;right:-40px;top:-60px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(201,164,106,.28),transparent 65%)}
.lea-hd h3{margin:0;font:400 21px/1.1 'DM Serif Display',Georgia,serif;letter-spacing:.01em}
.lea-hd p{margin:3px 0 0;font-size:11.5px;color:#cbb9a8;letter-spacing:.03em}
.lea-hd p span{color:#7fd8a2}
.lea-x{margin-left:auto;position:relative;width:34px;height:34px;border:0;background:transparent;color:#cbb9a8;cursor:pointer;font-size:20px;line-height:1;transition:color .3s,transform .4s}
.lea-x:hover{color:#fff;transform:rotate(90deg)}
.lea-bd{padding:20px 18px 6px;overflow-y:auto;background:linear-gradient(180deg,#f7efe9,#fbf6f3 120px)}
.lea-msg{max-width:88%;background:#fff;padding:11px 14px;margin:0 0 9px;font-size:14px;line-height:1.5;box-shadow:0 1px 0 rgba(201,164,106,.25);opacity:0;transform:translateY(8px);transition:opacity .45s,transform .55s cubic-bezier(.16,1,.3,1)}
.lea-msg.on{opacity:1;transform:none}
.lea-msg.me{margin-left:auto;background:#160f13;color:#fbf6f3}
.lea-typing{display:inline-flex;gap:4px;background:#fff;padding:13px 15px;margin:0 0 9px}
.lea-typing i{width:6px;height:6px;border-radius:50%;background:#c9a46a;animation:leaDot 1.1s infinite}.lea-typing i:nth-child(2){animation-delay:.15s}.lea-typing i:nth-child(3){animation-delay:.3s}
@keyframes leaDot{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
.lea-chips{display:flex;flex-wrap:wrap;gap:7px;margin:6px 0 14px;opacity:0;transition:opacity .5s .2s}
.lea-chips.on{opacity:1}
.lea-chip{border:1px solid rgba(201,164,106,.6);background:transparent;color:var(--ink);padding:8px 12px;font:13px 'DM Sans',system-ui,sans-serif;cursor:pointer;text-decoration:none;transition:background .3s,color .3s}
.lea-chip:hover{background:var(--ink);color:#fbf6f3}
.lea-ft{padding:12px 18px 16px;border-top:1px solid rgba(201,164,106,.25);background:var(--cream)}
.lea-go[hidden]{display:none}
.lea-go{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;gap:11px;width:100%;height:52px;border:0;background:var(--ink);color:#fbf6f3;font:500 12.5px 'DM Sans',system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:background .3s}
.lea-go:hover{background:#2c1d23}
.lea-go::after{content:"";position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(100deg,transparent,rgba(243,223,184,.3),transparent);transform:skewX(-20deg);animation:leaGl 3.4s ease-in-out infinite}
@keyframes leaGl{0%,55%{left:-60%}100%{left:130%}}
.lea-go svg{flex:none;width:19px;height:19px;fill:#7fd8a2}
.lea-go span{white-space:nowrap}
.lea-alt{display:block;width:100%;margin-top:9px;border:0;background:none;font:13px 'DM Sans',system-ui,sans-serif;color:var(--mid);cursor:pointer;text-decoration:underline;text-underline-offset:4px;text-decoration-color:rgba(107,90,96,.35)}
.lea-alt:hover{color:var(--ink)}
.lea-legal{margin:10px 0 0;font-size:10.5px;line-height:1.45;color:#9a8a90;text-align:center}
.lea-note{margin:8px 0 0;font-size:12px;color:var(--rose);text-align:center}
/* formulaire d'inscription */
.lea-f{display:grid;gap:8px}
.lea-row{display:grid;grid-template-columns:92px 1fr;gap:8px}
.lea-f select,.lea-f input[type=tel],.lea-f input[type=text]{width:100%;height:46px;border:1px solid #dccdc4;background:#fff;padding:0 12px;font:15px 'DM Sans',system-ui,sans-serif;color:var(--ink);border-radius:0;outline:none;transition:border-color .3s,box-shadow .3s;-webkit-appearance:none;appearance:none}
.lea-f select{background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b5a60' fill='none'/%3E%3C/svg%3E") no-repeat right 10px center;padding-right:24px}
.lea-f input:focus,.lea-f select:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(201,164,106,.16)}
.lea-ck{display:flex;gap:10px;align-items:flex-start;font-size:11.5px;line-height:1.45;color:var(--mid);cursor:pointer}
.lea-ck input{flex:none;width:17px;height:17px;margin:1px 0 0;accent-color:#160f13}
.lea-err{min-height:16px;margin:0;font-size:12px;color:var(--rose)}
.lea-done{display:flex;gap:12px;align-items:center;font-size:13.5px;line-height:1.45}
.lea-done svg{flex:none;width:30px;height:30px}
/* carte (panier / confirmation) */
.lea-card{position:relative;display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:start;margin:18px 0;padding:18px;border:1px solid rgba(201,164,106,.5);background:linear-gradient(150deg,rgba(255,255,255,.06),rgba(201,164,106,.08))}
.lea-card h4{margin:0 0 4px;font:400 19px/1.2 'DM Serif Display',Georgia,serif}
.lea-card p.t{margin:0 0 12px;font-size:13px;line-height:1.5;opacity:.85}
.lea-card .lea-f{grid-column:1/-1}
.lea-card.dark{color:#fbf6f3}
.lea-card.dark .lea-ck{color:#cbb9a8}.lea-card.dark .lea-legal{color:#9d8f88}
.lea-card.dark .lea-done{color:#fbf6f3}
.lea-card .lea-go{height:48px}
.lea-card.dark .lea-go{background:#fbf6f3;color:#160f13}.lea-card.dark .lea-go:hover{background:#fff}.lea-card.dark .lea-go svg{fill:#25a560}
.lea-card.light{background:#fff;color:var(--ink);box-shadow:0 20px 50px -30px rgba(22,15,19,.4)}
@media(max-width:760px){
 .lea-fab{right:14px;bottom:14px;width:56px;height:56px}.lea-fab .lea-av{width:45px;height:45px}
 .lea-fab.up{bottom:86px}
 .lea-tip{right:80px;bottom:24px;max-width:210px;font-size:13px}.lea-tip.up{bottom:96px}
 .lea-pan{left:0;right:0;bottom:0;width:100%;max-width:none;max-height:88vh;transform:translateY(100%);transform-origin:bottom}
 .lea-pan.on{transform:none}
}
@media(prefers-reduced-motion:reduce){.lea *,.lea{animation:none!important;transition:none!important}}`;
    document.head.appendChild(st);

    const WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2.1.7 2.8.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>';
    const AV = '<span class="lea-av" aria-hidden="true"><b>L</b><i></i></span>';
    const CHECK = '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#c9a46a"/><path d="M9.5 16.5l4.2 4.2 8.8-9.4" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>';

    function form(source, opts = {}) {
      const w = document.createElement('form'); w.className = 'lea-f'; w.noValidate = true;
      w.innerHTML = `<div class="lea-row"><select name="cc" aria-label="Indicatif"><option value="33">🇫🇷 +33</option><option value="32">🇧🇪 +32</option><option value="41">🇨🇭 +41</option><option value="352">🇱🇺 +352</option><option value="377">🇲🇨 +377</option></select><input type="tel" name="phone" placeholder="Numéro WhatsApp" autocomplete="tel-national" inputmode="tel" aria-label="Numéro WhatsApp"></div>
        ${opts.name === false ? '' : '<input type="text" name="name" placeholder="Prénom" autocomplete="given-name" maxlength="40" aria-label="Prénom">'}
        <label class="lea-ck"><input type="checkbox" name="ok"><span>${CONSENT}</span></label>
        <p class="lea-err" role="status"></p>
        <button class="lea-go" type="submit">${WA}<span>${opts.btn || 'Activer Léa sur WhatsApp'}</span></button>`;
      w.addEventListener('submit', async e => {
        e.preventDefault();
        const err = w.querySelector('.lea-err'), b = w.querySelector('button span');
        if (!w.ok.checked) { err.textContent = 'Cochez la case pour autoriser Léa à vous écrire.'; return; }
        if (w.phone.value.replace(/\D/g, '').length < 8) { err.textContent = 'Merci de saisir votre numéro WhatsApp.'; w.phone.focus(); return; }
        err.textContent = ''; const old = b.textContent; b.textContent = 'Un instant…';
        try {
          const q = { phone: w.phone.value, cc: w.cc.value, name: w.name ? w.name.value : '', consent: true, source, cart: window.OnaeCart ? OnaeCart.lines().map(l => ({ id: l.id, qty: l.qty })) : [] };
          const sid = (location.search.match(/session_id=([^&]+)/) || [])[1]; if (sid) q.session = decodeURIComponent(sid);
          const r = await fetch('/api/wa/optin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q) });
          const j = await r.json();
          if (!r.ok) throw new Error(j.error === 'invalid_phone' ? 'Ce numéro ne semble pas valide (France, Belgique, Suisse, Luxembourg ou Monaco).' : 'Une erreur est survenue, merci de réessayer.');
          LS.set('onae_wa_id', j.id); LS.set('onae_wa_me', JSON.stringify({ name: j.name, phone: j.phone }));
          syncCart();
          const h = +new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', hour12: false, timeZone: 'Europe/Paris' }).format(new Date());
          const when = (h < 9 || h >= 21) ? 'demain matin' : 'dans un instant';
          w.outerHTML = `<div class="lea-done">${CHECK}<span>${opts.done ? opts.done(j, when) : `C'est fait${j.name ? ', ' + j.name : ''} 🤍 Léa vous écrit ${when} sur WhatsApp.`}</span></div>`;
          document.dispatchEvent(new CustomEvent('onae:lea-optin', { detail: j }));
        } catch (x) { err.textContent = x.message; b.textContent = old; }
      });
      return w;
    }
    const doneBlock = (txt) => `<div class="lea-done">${CHECK}<span>${txt}</span></div>`;

    /* ---------- bulle + panneau ---------- */
    if (!onCheckout) {
      const root = document.createElement('div'); root.className = 'lea';
      root.innerHTML = `
        <button class="lea-fab" type="button" aria-label="Parler à Léa, conseillère beauté Onaé">${AV}</button>
        <div class="lea-tip" role="status"><b>Une question sur votre peau&nbsp;?</b><br>Je vous conseille comme une amie&nbsp;✨</div>
        <div class="lea-pan" role="dialog" aria-modal="false" aria-label="Léa, assistante beauté Onaé">
          <div class="lea-hd">${AV}<div><h3>Léa</h3><p>Assistante beauté Onaé · IA · <span>en ligne</span></p></div><button class="lea-x" type="button" aria-label="Fermer">×</button></div>
          <div class="lea-bd"><div class="lea-feed"></div><div class="lea-chips"></div><div class="lea-optin" hidden></div></div>
          <div class="lea-ft">
            <a class="lea-go lea-wa" href="${waLink("Bonjour Léa ✨")}" target="_blank" rel="noopener">${WA}<span>Écrire à Léa sur WhatsApp</span></a>
            <button class="lea-alt" type="button">ou recevoir ses conseils et rappels</button>
            <p class="lea-note" hidden></p>
            <p class="lea-legal">Léa est une intelligence artificielle créée par Onaé. Pour une commande, l'équipe reste joignable à contact@onaecosmetics.fr.</p>
          </div>
        </div>`;
      document.body.appendChild(root);
      const $ = s => root.querySelector(s), fab = $('.lea-fab'), tip = $('.lea-tip'), pan = $('.lea-pan');
      const sticky = () => { const s = document.querySelector('.sticky-cta.visible'); return !!s && innerWidth <= 760; };
      const place = () => { const u = sticky(); fab.classList.toggle('up', u); tip.classList.toggle('up', u); };
      addEventListener('scroll', place, { passive: true });
      setTimeout(() => { if (!onCart) fab.classList.add('on'); place(); }, 2500);
      if (onCart) fab.remove();

      const CHIPS = [['Trouver mon sérum', "Bonjour Léa, pouvez-vous m'aider à trouver le sérum idéal pour ma peau ?"], ['Ma routine anti-âge', "Bonjour Léa, j'aimerais construire une routine anti-âge simple."], ['Cernes & poches', "Bonjour Léa, que me conseillez-vous contre les cernes et les poches ?"], ['Cheveux secs', "Bonjour Léa, mes cheveux sont secs et ternes, que me conseillez-vous ?"]];
      let played = false;
      function play() {
        if (played) return; played = true;
        const feed = $('.lea-feed'), m = me();
        const lines = [m && m.name ? `Rebonjour ${m.name} ✨ Ravie de vous revoir.` : 'Bonjour ✨ Moi, c\'est Léa, l\'assistante beauté d\'Onaé.', 'Une hésitation sur un soin, une routine à construire, un doute sur votre type de peau ? Écrivez-moi sur WhatsApp : je vous réponds comme une amie experte, à toute heure.'];
        let t = 0;
        lines.forEach((txt, i) => {
          const ty = document.createElement('div'); ty.className = 'lea-typing'; ty.innerHTML = '<i></i><i></i><i></i>';
          setTimeout(() => feed.appendChild(ty), t); t += reduce ? 0 : 900;
          setTimeout(() => { ty.remove(); const b = document.createElement('p'); b.className = 'lea-msg'; b.textContent = txt; feed.appendChild(b); requestAnimationFrame(() => b.classList.add('on')); }, t); t += reduce ? 0 : 450;
        });
        setTimeout(() => {
          const c = $('.lea-chips');
          c.innerHTML = CHIPS.map(([l, msg]) => cfg.number ? `<a class="lea-chip" href="${waLink(msg)}" target="_blank" rel="noopener">${l}</a>` : `<button class="lea-chip" type="button">${l}</button>`).join('');
          c.classList.add('on');
          c.querySelectorAll('button.lea-chip').forEach(b => b.onclick = noNumber);
        }, t + 100);
      }
      function noNumber(e) { if (cfg.number) return; e.preventDefault(); const n = $('.lea-note'); n.hidden = false; n.textContent = 'Aperçu : le numéro WhatsApp de Léa sera actif dès que le compte Meta est connecté.'; }
      $('.lea-wa').addEventListener('click', noNumber);
      function open() { pan.classList.add('on'); tip.classList.remove('on'); fab.setAttribute('aria-expanded', 'true'); play(); try { sessionStorage.setItem('onae_lea_tip', '1'); } catch (_) {} }
      function close() { pan.classList.remove('on'); fab.setAttribute('aria-expanded', 'false'); }
      fab.onclick = () => pan.classList.contains('on') ? close() : open();
      tip.onclick = open;
      $('.lea-x').onclick = close;
      document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
      $('.lea-alt').onclick = () => {
        const box = $('.lea-optin');
        if (LS.get('onae_wa_id')) { box.innerHTML = doneBlock(`Léa veille déjà sur vous${(me() || {}).name ? ', ' + me().name : ''} 🤍 Elle vous écrit sur WhatsApp au ${(me() || {}).phone || 'numéro enregistré'}.`); }
        else if (!box.firstChild) box.appendChild(form('bulle'));
        box.hidden = false; $('.lea-alt').hidden = true; $('.lea-wa').hidden = true; box.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
      };
      /* petite bulle d'invitation, une fois par session, jamais par-dessus une autre pop-up */
      let seen = false; try { seen = sessionStorage.getItem('onae_lea_tip') === '1'; } catch (_) {}
      if (!seen && !onCart) setTimeout(function tryTip() {
        if (document.querySelector('.ox.on') || pan.classList.contains('on')) return setTimeout(tryTip, 4000);
        tip.classList.add('on'); place(); try { sessionStorage.setItem('onae_lea_tip', '1'); } catch (_) {}
        setTimeout(() => tip.classList.remove('on'), 9000);
      }, 25000);
    }

    /* ---------- panier : « Léa garde votre panier au chaud » ---------- */
    if (onCart) {
      const mount = () => {
        const anchor = document.getElementById('promoForm') && (document.getElementById('promoForm').closest('details, .promo, div') || document.getElementById('promoForm'));
        if (!anchor || document.querySelector('.lea-card')) return !!anchor;
        const card = document.createElement('div'); card.className = 'lea lea-card dark';
        const m = me();
        card.innerHTML = `${AV}<div><h4>Léa garde votre panier au chaud</h4><p class="t">Votre assistante beauté vous envoie un rappel et ses conseils sur WhatsApp, et répond à vos questions avant de commander.</p></div>`;
        if (LS.get('onae_wa_id')) card.insertAdjacentHTML('beforeend', `<div style="grid-column:1/-1">${doneBlock(`Léa veille sur votre panier${m && m.name ? ', ' + m.name : ''} 🤍 ${m && m.phone ? 'WhatsApp ' + m.phone : ''}`)}</div>`);
        else {
          const go = document.createElement('button'); go.type = 'button'; go.className = 'lea-go'; go.style.gridColumn = '1/-1'; go.innerHTML = `${WA}<span>Garder mon panier</span>`;
          card.appendChild(go);
          go.onclick = () => { const f = form('panier', { btn: 'Activer', done: (j, when) => `Parfait${j.name ? ', ' + j.name : ''} 🤍 Léa garde votre panier et vous écrit ${when} sur WhatsApp.` }); go.replaceWith(f); const i = f.querySelector('input[type=tel]'); if (i) i.focus(); };
        }
        anchor.parentNode.insertBefore(card, anchor);
        return true;
      };
      if (!mount()) { let n = 0; const iv = setInterval(() => { if (mount() || ++n > 20) clearInterval(iv); }, 400); }
    }

    /* ---------- confirmation de commande ---------- */
    if (success && !LS.get('onae_wa_id')) {
      const mount = () => {
        const hero = document.querySelector('.success-hero'); if (!hero || document.querySelector('.lea-card')) return !!hero;
        const card = document.createElement('div'); card.className = 'lea lea-card light';
        card.innerHTML = `${AV}<div><h4>Vos premiers pas, avec Léa</h4><p class="t">À réception, Léa vous envoie sur WhatsApp ses conseils pour bien utiliser vos soins, puis prend des nouvelles de votre peau. Une question ? Elle vous répond à toute heure.</p></div>`;
        card.appendChild(form('confirmation', { btn: 'Recevoir mes conseils', done: (j, when) => `Merci${j.name ? ', ' + j.name : ''} 🤍 Léa vous écrit ${when}, puis vous accompagne à réception de votre colis.` }));
        hero.insertAdjacentElement('afterend', card);
        return true;
      };
      if (!mount()) { let n = 0; const iv = setInterval(() => { if (mount() || ++n > 25) clearInterval(iv); }, 400); }
    }
    syncCart();
  }
})();
