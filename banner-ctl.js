/* Onaé — pilotage des bannières animées affichées dans le carrousel de l'accueil.
   Chargé en tout premier dans le <head> de chaque bannière.
   Une bannière qui n'est pas à l'écran est mise en pause : animations CSS figées, boucles requestAnimationFrame
   (WebGL 3D, particules, profondeur) suspendues. Elle reprend exactement là où elle s'était arrêtée.
   La page parente envoie postMessage({onaeBanner:'play'|'pause'}) ; l'état initial est lu sur l'attribut data-state de l'iframe. */
(function(){
  var d = document.documentElement, fe = null;
  try { fe = window.frameElement; } catch(e){}
  var paused = !!(fe && fe.getAttribute('data-state') === 'paused');
  var raf = window.requestAnimationFrame.bind(window), q = [];
  window.ONAE_PAUSED = paused;
  if(paused) d.classList.add('paused');
  window.requestAnimationFrame = function(cb){ if(window.ONAE_PAUSED){ q.push(cb); return 0; } return raf(cb); };
  function set(p){
    if(p === window.ONAE_PAUSED) return;
    window.ONAE_PAUSED = p; d.classList.toggle('paused', p);
    if(!p){ var l = q; q = []; for(var i = 0; i < l.length; i++) raf(l[i]); window.dispatchEvent(new Event('onaeplay')); }
  }
  addEventListener('message', function(e){ if(e.origin === location.origin && e.data && e.data.onaeBanner) set(e.data.onaeBanner === 'pause'); });
  var st = document.createElement('style');
  st.textContent = '.paused *,.paused *::before,.paused *::after{animation-play-state:paused!important}';
  (document.head || d).appendChild(st);
})();
