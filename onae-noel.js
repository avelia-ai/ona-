/* ═══════════ ONAÉ · ÉDITION DE NOËL 2026 ═══════════
   Bandeau animé, guirlande sous l'en-tête, neige légère sur le premier écran,
   bloc « Noël chez Onaé » avant le pied de page. Retrait en janvier : voir onae-noel.css. */
(function () {
  if (window.__onaeNoel) return; window.__onaeNoel = 1;
  const path = location.pathname.replace(/^\//, '') || 'index.html';
  if (/^(checkout|admin|concours|reglement|mentions-legales-concours|banniere|apercu)/.test(path)) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 860px)').matches;
  const noBand = /^(panier|compte|mon-compte|mentions|cgv|suivi-commande)/.test(path);

  /* ── neige (canvas) ── */
  function snow(cv, opts) {
    const ctx = cv.getContext('2d'); let W = 0, H = 0, F = [], run = true, raf;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const size = () => { const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    const n = Math.round(opts.n * (mobile ? .55 : 1));
    for (let i = 0; i < n; i++) F.push({ x: Math.random() * W, y: Math.random() * H, r: opts.min + Math.random() * (opts.max - opts.min), s: .2 + Math.random() * .5, d: Math.random() * 6.28, o: .35 + Math.random() * .5 });
    const tick = () => {
      if (!run) return; ctx.clearRect(0, 0, W, H);
      if (opts.shadow) { ctx.shadowColor = opts.shadow; ctx.shadowBlur = 4; }
      for (const f of F) { f.y += f.s * opts.speed; f.d += .01; f.x += Math.sin(f.d) * .35;
        if (f.y > H + 6) { f.y = -6; f.x = Math.random() * W; }
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fillStyle = `rgba(${opts.c},${f.o})`; ctx.fill(); }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(tick);
    };
    if (reduce) { tick(); run = false; return { stop() {}, start() {} }; }
    const io = new IntersectionObserver(es => es.forEach(e => { run = e.isIntersecting && !document.hidden; if (run) { cancelAnimationFrame(raf); tick(); } }));
    io.observe(cv);
    document.addEventListener('visibilitychange', () => { run = !document.hidden; if (run) { cancelAnimationFrame(raf); tick(); } });
    tick();
    return { set on(v) { run = v; if (v) { cancelAnimationFrame(raf); tick(); } } };
  }

  /* ── guirlande ── */
  function lights(host, count) {
    const w = document.createElement('div'); w.className = 'nl-lights'; w.setAttribute('aria-hidden', 'true');
    const N = count, pts = [];
    let d = 'M0 2';
    for (let i = 0; i < N; i++) { const x0 = i / N * 100, x1 = (i + 1) / N * 100; d += ` Q${(x0 + x1) / 2} 12 ${x1} 2`; }
    w.innerHTML = `<svg viewBox="0 0 100 14" preserveAspectRatio="none"><path d="${d}" vector-effect="non-scaling-stroke"/></svg>`;
    for (let i = 0; i < N; i++) { const t = .5, x = (i + t) / N * 100, y = 2 + 2 * t * (1 - t) * 10;
      const b = document.createElement('i'); b.className = 'b' + (i % 3 === 1 ? ' r' : ''); b.style.left = x + '%'; b.style.top = (y / 14 * 100) + '%'; b.style.animationDelay = (-(i * 0.37) % 3.2) + 's'; w.appendChild(b); }
    host.appendChild(w);
  }

  /* ── bandeau du haut ── */
  const MSG = [
    ['coffrets-duos.html', '<i>✦</i> <b>Édition de Noël</b> <i>✦</i> Des rituels à offrir, ou à s’offrir <u>Découvrir</u>'],
    ['bar-a-routines.html', '<i>✦</i> <b>−20 %</b> sur toute routine de 3 soins <u>Composer</u>'],
    ['coffrets-duos.html', '<i>✦</i> <b>Bombe de bain offerte</b> avec chaque commande <i>✦</i> livraison offerte dès 49 €'],
    ['homme.html', '<i>✦</i> <b>Onaé Homme</b> arrive bientôt <u>Être prévenu</u>']
  ];
  function bar() {
    const b = document.createElement('div'); b.className = 'nl-bar'; b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Édition de Noël');
    const msgs = mobile ? [
      ['coffrets-duos.html', '<i>✦</i> <b>Édition de Noël</b> <i>✦</i>'],
      ['bar-a-routines.html', '<b>−20 %</b> sur toute routine de 3 soins'],
      ['coffrets-duos.html', '<b>Bombe de bain</b> offerte'],
      ['homme.html', '<b>Onaé Homme</b> arrive bientôt']] : MSG;
    b.innerHTML = `<canvas aria-hidden="true"></canvas><div class="nl-bar-in">${msgs.map((m, i) => `<a class="nl-msg${i ? '' : ' on'}" href="/${m[0]}"${i ? ' tabindex="-1"' : ''}>${m[1]}</a>`).join('')}</div>`;
    document.body.insertBefore(b, document.body.firstChild);
    document.documentElement.classList.add('noel-on');
    snow(b.querySelector('canvas'), { n: 26, min: .6, max: 1.6, speed: .5, c: '246,230,198' });
    if (!reduce) { const els = b.querySelectorAll('.nl-msg'); let k = 0;
      setInterval(() => { if (document.hidden) return; els[k].classList.remove('on'); els[k].tabIndex = -1; k = (k + 1) % els.length; els[k].classList.add('on'); els[k].removeAttribute('tabindex'); }, 4200); }
  }

  /* ── neige du premier écran ── */
  function pageSnow() {
    if (reduce || /^(index\.html|panier|compte|mon-compte)/.test(path)) return;   // accueil : les bannières ont déjà leur propre neige
    const cv = document.createElement('canvas'); cv.className = 'nl-snow'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv);
    const s = snow(cv, { n: 42, min: .9, max: 2.6, speed: .7, c: '255,255,255', shadow: 'rgba(120,70,60,.45)' });
    const fade = () => { const y = Math.max(window.scrollY || 0, document.body.scrollTop || 0, document.documentElement.scrollTop || 0);
      const o = Math.max(0, 1 - y / (innerHeight * .9)); cv.style.opacity = o.toFixed(2); s.on = o > 0.02; };
    addEventListener('scroll', fade, { passive: true }); document.body.addEventListener('scroll', fade, { passive: true }); fade();
  }

  /* ── bloc « Noël chez Onaé » ── */
  function band() {
    if (noBand) return;
    const s = document.createElement('section'); s.className = 'nl-gift'; s.setAttribute('aria-labelledby', 'nlGiftT');
    s.innerHTML = `<canvas aria-hidden="true"></canvas><div class="nl-gift-in">
      <p class="nl-ey"><span></span>Édition de Noël<span></span></p>
      <h2 id="nlGiftT">Cette année, offrez <em>un rituel.</em></h2>
      <p class="nl-gift-sub">Des soins qui se répondent, pensés pour être offerts&nbsp;– ou gardés pour soi. Votre peau n’a pas besoin de plus, elle a besoin de mieux.</p>
      <div class="nl-tiles">
        <a class="nl-tile" href="/coffrets-duos.html"><span class="im"><span class="tg">À offrir</span><img src="/serum-anti-age-peptides-4.jpg" alt="Coffrets et duos de soins Onaé" loading="lazy"></span><span class="bd"><h3>Coffrets &amp; Duos</h3><p>Deux ou trois soins qui fonctionnent ensemble, réunis à prix doux.</p><span class="go">Découvrir les coffrets →</span></span></a>
        <a class="nl-tile" href="/bar-a-routines.html"><span class="im"><span class="tg">−20 %</span><img src="/creme-anti-age-peptides-6.jpg" alt="Le Bar à routines Onaé" loading="lazy"></span><span class="bd"><h3>Le Bar à routines</h3><p>Composez une routine de 3 soins, sur mesure&nbsp;: elle est à −20 %.</p><span class="go">Composer une routine →</span></span></a>
        <a class="nl-tile" href="/box.html"><span class="im"><span class="tg">Signature</span><img src="/box-anti-age-peptides-3.jpg" alt="Box Anti-âge aux Peptides Onaé" loading="lazy"></span><span class="bd"><h3>La Box Anti-âge</h3><p>Sérum, crème et contour des yeux aux peptides, dans un seul écrin.</p><span class="go">Découvrir la Box →</span></span></a>
      </div>
      <p class="nl-note">✦ Bombe de bain offerte avec chaque commande · Livraison offerte dès 49 € ✦</p></div>`;
    const anchor = document.querySelector('.ojr') || document.querySelector('footer.ofoot') || document.querySelector('.footer-simple');
    if (!anchor) return;
    anchor.parentNode.insertBefore(s, anchor);
    lights(s, mobile ? 9 : 18);
    snow(s.querySelector('canvas'), { n: 60, min: .7, max: 2.2, speed: .55, c: '246,230,198' });
  }

  /* ── en-tête : guirlande + étoile sur Coffrets ── */
  function header() {
    let tries = 0;
    const t = setInterval(() => {
      const h = [...document.querySelectorAll('.header, .nav')].find(e => e.offsetParent !== null && e.getBoundingClientRect().height > 30);
      if (h && !h.querySelector('.nl-lights')) { if (getComputedStyle(h).position === 'static') h.style.position = 'relative'; lights(h, mobile ? 12 : 26); }
      const c = document.querySelector('.dk-i[data-m="coffrets"] .dk-a');
      if (c && !c.querySelector('.nl-star')) c.insertAdjacentHTML('afterbegin', '<span class="nl-star" aria-hidden="true">✦</span>');
      if ((h && (c || mobile)) || ++tries > 40) clearInterval(t);
    }, 150);
  }

  const go = () => { bar(); header(); pageSnow(); band(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
