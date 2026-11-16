/* Onaé — mesure d'audience interne, anonyme (aucun outil tiers, aucune adresse IP enregistrée).
   Envoie à /api/ev : pages vues, fiches produits vues, ajouts au panier, temps passé.
   Identifiants aléatoires : visiteur (cookie onae_v, 13 mois), visite (cookie onae_s, 30 min d'inactivité).
   Refus : https://www.onaecosmetics.fr/?nostat=1 (mémorisé dans ce navigateur). */
(function () {
  if (window.top !== window.self) return;   /* bannières en iframe : pas comptées */
  try {
    var q = new URLSearchParams(location.search);
    if (q.get('nostat') === '1') localStorage.setItem('onae_nostat', '1');
    if (q.get('nostat') === '0') localStorage.removeItem('onae_nostat');
    if (localStorage.getItem('onae_nostat') === '1' || navigator.webdriver) return;
  } catch (_) { return; }

  var END = '/api/ev', now = Date.now();
  function rid() { var a = new Uint8Array(8); (window.crypto || window.msCrypto).getRandomValues(a); return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function getC(n) { var m = document.cookie.match('(?:^|; )' + n + '=([a-f0-9]{16})'); return m ? m[1] : ''; }
  function setC(n, v, age) { document.cookie = n + '=' + v + '; Path=/; SameSite=Lax' + (age ? '; Max-Age=' + age : '') + (location.protocol === 'https:' ? '; Secure' : ''); }

  /* visiteur : 13 mois maximum (recommandation CNIL pour la mesure d'audience) */
  var v = getC('onae_v'), isNew = 0;
  if (!v) { v = rid(); isNew = 1; }
  setC('onae_v', v, 34128000);

  /* visite : nouvelle après 30 min sans activité */
  var s = '', last = 0, newSess = 0;
  try { var st = JSON.parse(localStorage.getItem('onae_ss') || '{}'); s = st.id || ''; last = st.t || 0; } catch (_) {}
  if (!/^[a-f0-9]{16}$/.test(s) || now - last > 30 * 60e3) { s = rid(); newSess = 1; }
  function touch() { try { localStorage.setItem('onae_ss', JSON.stringify({ id: s, t: Date.now() })); } catch (_) {} setC('onae_s', s, 1800); }
  touch();

  function send(o, beacon) {
    o.v = v; o.s = s; o.p = location.pathname;
    var body = JSON.stringify(o);
    try {
      if (beacon && navigator.sendBeacon) { navigator.sendBeacon(END, new Blob([body], { type: 'text/plain' })); return; }
      fetch(END, { method: 'POST', body: body, headers: { 'Content-Type': 'text/plain' }, keepalive: true, credentials: 'same-origin' }).catch(function () {});
    } catch (_) {}
  }
  function cart() { try { var C = window.OnaeCart; if (C) return { cc: C.count(), cv: Math.round(C.subtotal() * 100) }; var l = JSON.parse(localStorage.getItem('onae-cart-v1') || '[]'); return { cc: l.reduce(function (t, x) { return t + (x.qty || 0); }, 0) }; } catch (_) { return {}; } }

  var m = location.pathname.match(/^\/produits\/([a-z0-9-]+)/), pid = m ? m[1] : (q.get('id') || '');
  var ref = document.referrer || '';
  try { if (ref && new URL(ref).host === location.host) ref = ''; } catch (_) {}

  function pv() {
    var c = cart();
    send({ e: 'pv', n: isNew, ns: newSess, r: ref.slice(0, 300), us: (q.get('utm_source') || '').slice(0, 60), um: (q.get('utm_medium') || '').slice(0, 60), uc: (q.get('utm_campaign') || '').slice(0, 80),
      w: screen.width || 0, z: (Intl.DateTimeFormat().resolvedOptions().timeZone || '').slice(0, 40), l: (navigator.language || '').slice(0, 10), id: pid.slice(0, 80), cc: c.cc || 0, cv: c.cv || 0 });
  }
  pv();

  /* ajouts au panier : on écoute OnaeCart.add (toutes les cartes, fiches, Bar à routines, upsell) */
  var hooked = false;
  function hook() {
    var C = window.OnaeCart; if (!C || hooked || !C.add) return; hooked = true;
    var orig = C.add;
    C.add = function (id, qty, snap) {
      var ok = orig.apply(this, arguments);
      if (ok) { var i = (C.info && C.info(id)) || {}; touch(); send({ e: 'add', id: String(id).slice(0, 160), q: qty || 1, val: Math.round((i.price || (snap && snap.price) || 0) * 100 * (qty || 1)) }); }
      return ok;
    };
  }
  hook(); if (!hooked) { document.addEventListener('DOMContentLoaded', hook); addEventListener('load', hook); setTimeout(hook, 2500); }

  /* temps réellement passé sur la page (onglet visible) + profondeur de lecture */
  var shown = document.visibilityState === 'visible' ? Date.now() : 0, active = 0, depth = 0, sent = false;
  addEventListener('scroll', function () {
    var el = document.scrollingElement || document.documentElement, b = document.body;
    var top = Math.max(el.scrollTop || 0, b ? b.scrollTop : 0), h = Math.max(el.scrollHeight, b ? b.scrollHeight : 0) - innerHeight;
    if (h > 0) depth = Math.max(depth, Math.min(100, Math.round(top / h * 100)));
  }, { passive: true, capture: true });
  function flush() {
    if (shown) { active += Date.now() - shown; shown = 0; }
    if (sent || active < 500) return; sent = true; touch();
    var c = cart(); send({ e: 'end', dur: Math.min(active, 3600e3), sc: depth, cc: c.cc || 0, cv: c.cv || 0 }, true);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
    else { shown = Date.now(); if (sent) { sent = false; active = 0; } }
  });
  addEventListener('pagehide', flush);
})();
