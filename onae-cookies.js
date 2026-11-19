/* Onaé — bandeau d'information sur les cookies.
   Cookies utilisés : session de compte, panier (stockage local) — strictement nécessaires —
   et une mesure d'audience interne, anonyme, sans IP ni outil tiers (critères CNIL respectés,
   exemptée de consentement ; voir mentions-legales.html#cookies). Aucun cookie publicitaire.
   « Refuser la mesure d'audience » réutilise le mécanisme existant de onae-stats.js
   (localStorage onae_nostat, déjà géré par ?nostat=1). Bandeau affiché une fois, 180 jours,
   jamais en même temps qu'une pop-up de bienvenue/sortie, et relevé sur mobile si une barre
   d'action (achat, routine du Bar) est visible en bas d'écran. */
(function () {
  if (window.top !== window.self) return;
  var KEY = 'onae_cookie_notice';
  function seen() { try { var t = +localStorage.getItem(KEY); return t && (Date.now() - t) < 180 * 864e5; } catch (_) { return false; } }
  function mark() { try { localStorage.setItem(KEY, String(Date.now())); } catch (_) {} }
  if (seen()) return;

  var css = '#oc{position:fixed;left:14px;right:14px;bottom:14px;z-index:9970;display:flex;justify-content:center;pointer-events:none;transform:translateY(140%);transition:transform .5s cubic-bezier(.16,1,.3,1)}'
    + '#oc.on{pointer-events:auto;transform:none}#oc.on.held{transform:translateY(140%)}'
    + '#oc .oc-in{max-width:640px;width:100%;background:linear-gradient(135deg,#2a0f18,#1b0b10);color:#f3e9e4;border:1px solid rgba(243,195,207,.28);box-shadow:0 20px 50px -14px rgba(0,0,0,.55);border-radius:3px;padding:16px 18px;display:flex;align-items:center;gap:16px;font-family:inherit}'
    + '#oc p{margin:0;flex:1;font-size:13px;line-height:1.5;color:#f3e9e4}#oc a{color:#e9b7c6;text-decoration:underline}'
    + '#oc .oc-b{display:flex;gap:8px;flex-shrink:0}'
    + '#oc button{border:0;cursor:pointer;font:600 12px/1 inherit;letter-spacing:.01em;padding:11px 15px;white-space:nowrap}'
    + '#oc [data-oc="ok"]{background:#f3e9e4;color:#2a0f18}#oc [data-oc="ok"]:hover{background:#fff}'
    + '#oc [data-oc="refuse"]{background:transparent;color:#f3e9e4;border:1px solid rgba(243,195,207,.4)}#oc [data-oc="refuse"]:hover{border-color:rgba(243,195,207,.75)}'
    + '@media(max-width:620px){#oc{left:10px;right:10px;bottom:10px}#oc .oc-in{flex-direction:column;align-items:stretch;gap:12px;padding:15px}#oc .oc-b{flex-direction:column}#oc button{width:100%;padding:12px}}'
    + '@media(prefers-reduced-motion:reduce){#oc{transition:none}}';
  var style = document.createElement('style'); style.textContent = css;

  var el = document.createElement('div'); el.id = 'oc'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Cookies');
  el.innerHTML = '<div class="oc-in"><p>Nous utilisons des cookies strictement nécessaires (compte, panier) et une mesure d’audience interne, anonyme et sans publicité. <a href="/mentions-legales.html#cookies">En savoir plus</a></p>'
    + '<div class="oc-b"><button type="button" data-oc="refuse">Refuser la mesure d’audience</button><button type="button" data-oc="ok">Tout accepter</button></div></div>';

  function ready(fn) { if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    document.head.appendChild(style);
    document.body.appendChild(el);

    function blocked() {
      if (document.querySelector('.ox.on')) return true;               /* pop-up de bienvenue/sortie ouverte */
      if (document.querySelector('.oe-cc.on')) return true;            /* bandeau « code activé » (lien /tiktok) */
      if (innerWidth > 760) return false;
      return !!(document.querySelector('.sticky-cta.visible') || document.querySelector('.bar-mob.on'));
    }
    var held = false;
    function place() { var b = blocked(); if (b !== held) { held = b; el.classList.toggle('held', held); } }
    var iv = setInterval(place, 500);

    function open() { place(); requestAnimationFrame(function () { el.classList.add('on'); }); }
    setTimeout(open, 900);

    function close() {
      el.classList.remove('on'); clearInterval(iv); mark();
      setTimeout(function () { el.remove(); style.remove(); }, 550);
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-oc]'); if (!b) return;
      if (b.dataset.oc === 'refuse') { try { localStorage.setItem('onae_nostat', '1'); } catch (_) {} }
      close();
    });
  });
})();
