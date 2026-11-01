/* Onaé — fluidité de toutes les pages.
   1. Les animations en boucle d'une section qui n'est pas à l'écran sont figées (elles reprennent dès qu'on y revient) :
      le navigateur ne calcule plus que ce que l'on voit.
   2. Les vidéos d'ambiance se mettent en pause hors écran. */
(function(){
  if(!('IntersectionObserver' in window)) return;
  var st = document.createElement('style');
  st.textContent = '.onae-off,.onae-off *,.onae-off *::before,.onae-off *::after{animation-play-state:paused!important}';
  document.head.appendChild(st);

  var io = new IntersectionObserver(function(es){
    for(var i = 0; i < es.length; i++){
      var e = es[i], el = e.target;
      if(el.tagName === 'VIDEO'){
        if(e.isIntersecting){ if(el.autoplay && el.paused){ var p = el.play(); if(p && p.catch) p.catch(function(){}); } }
        else if(!el.paused) el.pause();
      } else el.classList.toggle('onae-off', !e.isIntersecting);
    }
  }, {rootMargin: '250px 0px'});

  function watch(root){
    var els = (root || document).querySelectorAll('body > section, main > section, body > div > section, footer, [data-perf], video[autoplay]');
    for(var i = 0; i < els.length; i++){ if(!els[i].__onaePerf){ els[i].__onaePerf = 1; io.observe(els[i]); } }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ watch(); }); else watch();
  addEventListener('load', function(){ watch(); });

  /* boucles d'animation dessinées en JS (particules, 3D…) : elles ne tournent que si leur élément est visible.
     Utilisation dans une boucle : if(window.onaeOn && !onaeOn(el)) return onaeWait(el, frame); */
  var vis = new WeakMap(), waits = new Map();
  var io2 = new IntersectionObserver(function(es){
    for(var i = 0; i < es.length; i++){
      var e = es[i]; vis.set(e.target, e.isIntersecting);
      if(e.isIntersecting && waits.has(e.target)){ var l = waits.get(e.target); waits.delete(e.target); l.forEach(function(f){ requestAnimationFrame(f); }); }
    }
  }, {rootMargin: '120px 0px'});
  window.onaeOn = function(el){ if(!el) return true; if(!vis.has(el)){ vis.set(el, true); io2.observe(el); } return vis.get(el); };
  window.onaeWait = function(el, fn){ var l = waits.get(el); if(!l){ l = new Set(); waits.set(el, l); } l.add(fn); };

})();
