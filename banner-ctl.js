/* Onaé — pilotage des bannières animées affichées dans le carrousel de l'accueil.
   Chargé en tout premier dans le <head> de chaque bannière.
   Trois états, envoyés par la page parente avec postMessage({onaeBanner:'play'|'hold'|'pause'}) :
   - play  : tout tourne ;
   - hold  : les animations CSS continuent (entrée des textes) mais les boucles requestAnimationFrame
             (WebGL 3D, particules, profondeur) attendent : utilisé pendant le glissement d'une bannière,
             pour que la transition reste parfaitement fluide ;
   - pause : tout est figé (animations CSS comprises). La bannière reprend exactement là où elle s'était arrêtée.
   L'état initial est lu sur l'attribut data-state de l'iframe. */
(function(){
  var d = document.documentElement, fe = null;
  try { fe = window.frameElement; } catch(e){}
  var init = fe && fe.getAttribute('data-state');
  var raf = window.requestAnimationFrame.bind(window), q = [], mode = 'play';
  window.ONAE_PAUSED = false;
  window.requestAnimationFrame = function(cb){ if(window.ONAE_PAUSED){ q.push(cb); return 0; } return raf(cb); };
  function set(m){
    if(m === mode) return;
    mode = m;
    var wasPaused = window.ONAE_PAUSED;
    window.ONAE_PAUSED = (m !== 'play');
    d.classList.toggle('paused', m === 'pause');
    if(wasPaused && !window.ONAE_PAUSED){ var l = q; q = []; for(var i = 0; i < l.length; i++) raf(l[i]); window.dispatchEvent(new Event('onaeplay')); }
  }
  if(init === 'paused') set('pause'); else if(init === 'hold') set('hold');
  addEventListener('message', function(e){
    if(e.origin !== location.origin || !e.data || !e.data.onaeBanner) return;
    var m = e.data.onaeBanner; set(m === 'pause' || m === 'hold' ? m : 'play');
  });
  var st = document.createElement('style');
  st.textContent = '.paused *,.paused *::before,.paused *::after{animation-play-state:paused!important}';
  (document.head || d).appendChild(st);
})();
