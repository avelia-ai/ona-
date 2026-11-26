/* Audit des angles droits : relève, sur toutes les pages (ordinateur + mobile), les boutons / champs / pastilles / cartes / blocs
   dont les coins sont à 0, et écrit scratchpad/round/audit.json. Lancer depuis la racine avec un serveur local sur :4321.
   NODE_PATH=$(npm root -g) node scratchpad/round/audit.js */
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:4321';
const pages = fs.readdirSync('.').filter(f => f.endsWith('.html') && !/^(apercu-|google)/.test(f) && f !== 'product.html' && !(/^blog-/.test(f) && !/^blog-(peptides-anti-age|routine-matin-soir|romarin-cheveux)/.test(f)))
  .map(f => '/' + f).concat(['serum-anti-age-peptides', 'shampoing-boucles', 'patchs-yeux-hydrogel-anti-fatigue', 'box-anti-age-peptides',
    'carte-cadeau-50', 'creme-contour-cannabidiol', 'serum-gelee-prebiotiques'].map(id => '/produits/' + id));
if (process.env.PAGES) pages.splice(0, pages.length, ...process.env.PAGES.split(','));
const CART = JSON.stringify([{ id: 'serum-anti-age-peptides', qty: 1 }, { id: 'creme-anti-age-peptides--duo-anti-age', qty: 1 }, { id: 'shampoing-boucles', qty: 2 }]);

const collect = () => {
  const STATE = /^(on|off|active|open|opened|show|shown|visible|hidden|hov|sel|selected|is-.*|in|done|full|held|club|blk|cur|current|ok|err|error|ready|play|pause|hold|dk-sc|anim.*|reveal.*|seen|loaded|lazy)$/;
  const vw = innerWidth, out = [];
  const zero = cs => ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'].every(k => parseFloat(cs[k]) === 0);
  const alpha = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return c === 'transparent' ? 0 : 1; const p = m[1].split(/[ ,\/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; };
  const sig = el => { const c = [...el.classList].filter(x => !STATE.test(x) && /^[a-zA-Z_-][\w-]*$/.test(x)); return c.length ? '.' + c.sort().join('.') : (el.id && /^[a-zA-Z][\w-]*$/.test(el.id) ? '#' + el.id : ''); };
  const selOf = el => { const s = sig(el); if (s) return el.tagName.toLowerCase() + s; const p = el.parentElement; const ps = p && sig(p); return ps ? p.tagName.toLowerCase() + ps + ' > ' + el.tagName.toLowerCase() : null; };
  for (const el of document.querySelectorAll('body *')) {
    const tag = el.tagName.toLowerCase();
    if (['script', 'style', 'br', 'svg', 'path', 'source', 'iframe', 'option', 'noscript', 'canvas', 'td', 'th', 'tr', 'thead', 'tbody', 'tfoot', 'col', 'colgroup', 'html', 'body'].includes(tag) || el.closest('svg')) continue;
    const cs = getComputedStyle(el); if (cs.display === 'none') continue;
    const r = el.getBoundingClientRect(); if (r.width < 10 || r.height < 10) continue;
    if (r.width >= vw * 0.96) continue;                     /* bandeaux et sections bord à bord : restent droits */
    if (!zero(cs)) continue;
    const media = ['img', 'video', 'picture'].includes(tag);
    if (media) {                                 /* visuel collé à un coin de son cadre : c'est le cadre qui l'arrondira */
      let a = el.parentElement, flush = false;
      while (a && a !== document.body) { const acs = getComputedStyle(a); const ar = a.getBoundingClientRect();
        if (alpha(acs.backgroundColor) > .04 || acs.backgroundImage !== 'none' || acs.boxShadow !== 'none' || acs.overflow !== 'visible' || parseFloat(acs.borderTopWidth) > 0) {
          flush = (Math.abs(r.top - ar.top) < 2 || Math.abs(r.bottom - ar.bottom) < 2) && (Math.abs(r.left - ar.left) < 2 || Math.abs(r.right - ar.right) < 2); break; }
        a = a.parentElement; }
      if (flush) continue;
    }
    const field = ['input', 'select', 'textarea'].includes(tag) && !['checkbox', 'radio', 'range', 'hidden', 'file'].includes(el.type);
    if (['input'].includes(tag) && !field && !['button', 'submit'].includes(el.type)) continue;
    const borders = ['Top', 'Right', 'Bottom', 'Left'].filter(s => parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none' && alpha(cs['border' + s + 'Color']) > .05).length;
    const box = alpha(cs.backgroundColor) > .04 || cs.backgroundImage !== 'none' || borders >= 3 || cs.boxShadow !== 'none' || cs.backdropFilter !== 'none';
    const isBtn = tag === 'button' || (tag === 'input' && ['button', 'submit'].includes(el.type)) || el.getAttribute('role') === 'button' || /(^|[-_])(btn|cta|button)([-_]|$)/i.test(el.className && el.className.baseVal === undefined ? el.className : '');
    if (!box && !media && !field && !isBtn) continue;
    if (!box && isBtn && !media) continue;                     /* bouton « texte seul » : rien à arrondir */
    const s = selOf(el); if (!s) continue;
    const bigImg = [...el.querySelectorAll('img,canvas,video')].some(i => i.getBoundingClientRect().width > 40);
    let kind = media ? 'media' : field ? (tag === 'textarea' ? 'area' : 'field') : (isBtn && !bigImg && r.height <= 70) ? 'btn' : (r.height <= 34 && r.width <= 280 && !bigImg) ? 'chip' : (r.width >= 520 && r.height >= 300) ? 'block' : 'card';
    /* clip sûr ? aucun descendant ne déborde, pas de sticky, et un visuel touche un bord */
    let clip = false;
    if (kind === 'card' || kind === 'block') {
      const ds = [...el.querySelectorAll('*')].slice(0, 400);
      const over = ds.some(d => { const dr = d.getBoundingClientRect(); if (!dr.width || !dr.height) return false; return dr.left < r.left - 1 || dr.top < r.top - 1 || dr.right > r.right + 1 || dr.bottom > r.bottom + 1; });
      const sticky = ds.some(d => getComputedStyle(d).position === 'sticky');
      const touch = ds.some(d => { const t = d.tagName.toLowerCase(); const dcs = getComputedStyle(d);
        if (!(['img', 'video', 'canvas', 'picture'].includes(t) || dcs.backgroundImage !== 'none' || alpha(dcs.backgroundColor) > .04)) return false;
        const dr = d.getBoundingClientRect(); return dr.width > 30 && (Math.abs(dr.top - r.top) < 2 || Math.abs(dr.bottom - r.bottom) < 2) && (Math.abs(dr.left - r.left) < 2 || Math.abs(dr.right - r.right) < 2); });
      clip = touch && !over && !sticky && cs.overflow === 'visible' ? 'add' : (touch && cs.overflow !== 'visible' ? 'has' : false);
      if (touch && !clip) clip = 'unsafe';
    }
    out.push({ s, kind, clip, w: Math.round(r.width), h: Math.round(r.height), parentCard: !!el.parentElement && !!el.parentElement.closest('[data-x]') });
  }
  /* contrôle : un sélecteur ne doit toucher QUE des éléments à angles droits */
  const sels = [...new Set(out.map(o => o.s))];
  const bad = sels.filter(s => { try { return [...document.querySelectorAll(s)].some(e => !zero(getComputedStyle(e))); } catch (e) { return true; } });
  return { out, bad };
};

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const all = {}; const bad = new Set();
  const add = (res, page, vp) => { res.bad.forEach(s => bad.add(s)); for (const o of res.out) { const k = o.s; (all[k] = all[k] || { kinds: {}, clip: new Set(), pages: new Set(), vps: new Set(), w: 0, h: 0 });
    all[k].kinds[o.kind] = (all[k].kinds[o.kind] || 0) + 1; all[k].clip.add(String(o.clip)); all[k].pages.add(page); all[k].vps.add(vp); all[k].w = Math.max(all[k].w, o.w); all[k].h = Math.max(all[k].h, o.h); } };
  const ONLY = process.argv[2];
  for (const [w, h, vp] of [[1440, 900, 'pc'], [390, 844, 'mob']].filter(x => !ONLY || x[2] === ONLY)) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(c => { try { localStorage.setItem('onae-cart-v1', c); } catch (e) {} }, CART);
    await ctx.route(u => !u.href.startsWith(BASE), r => r.abort());
    if (process.env.SID) await ctx.addCookies([{ name: 'onae_sid', value: process.env.SID, url: BASE }]);
    const pg = await ctx.newPage();
    for (const p of pages) {
      try { await pg.goto(BASE + p + (p.includes('?') ? '&' : '?') + 'lea=1', { waitUntil: 'domcontentloaded', timeout: 20000 }); } catch (e) { console.log('!', p); continue; }
      await pg.waitForTimeout(p === '/index.html' ? 8000 : 1800);        /* l'accueil : laisser venir la pop-up de bienvenue + le bandeau cookies */
      add(await pg.evaluate(collect), p, vp);
      if (vp === 'pc') {                                                  /* ouvrir chaque panneau du méga-menu */
        const tops = await pg.$$('.dk-gen .dk-l > *, .dk-gen .dk-r > *, header .dk-l > *, header .dk-r > *');
        for (const t of tops.slice(0, 6)) { try { await pg.mouse.move(700, 500); await t.hover({ timeout: 1200 }); await pg.waitForTimeout(350); add(await pg.evaluate(collect), p + '#menu', vp); } catch (e) {} }
      } else {                                                            /* ouvrir le menu mobile */
        try { const bt = await pg.$('.om-burger, [aria-label*="enu"]'); if (bt) { await bt.click({ timeout: 1500 }); await pg.waitForTimeout(500); add(await pg.evaluate(collect), p + '#menu', vp); await pg.keyboard.press('Escape'); } } catch (e) {}
      }
      process.stdout.write(vp + ' ' + p + '\n');
    }
    await ctx.close();
  }
  await b.close();
  const ONLY2 = process.argv[2];
  const res = Object.entries(all).filter(([s]) => !bad.has(s)).map(([s, v]) => ({ s, kinds: v.kinds, clip: [...v.clip], pages: [...v.pages].slice(0, 6), n: v.pages.size, vps: [...v.vps], w: v.w, h: v.h }));
  fs.writeFileSync('scratchpad/round/audit' + (ONLY2 ? '-' + ONLY2 : '') + (process.env.TAG ? '-' + process.env.TAG : '') + '.json', JSON.stringify({ res, bad: [...bad] }, null, 1));
  console.log('sélecteurs retenus', res.length, '· écartés (déjà arrondis ailleurs)', bad.size);
})();
