/* Vérifie onae-round.css : aucun sélecteur ne doit toucher une section pleine largeur (≥ 96 % de l'écran).
   NODE_PATH=$(npm root -g) node scratchpad/round/verify.js [pc|mob] [port] */
const { chromium } = require('playwright'); const fs = require('fs');
const vp = process.argv[2] || 'pc', BASE = 'http://localhost:' + (process.argv[3] || 4322);
const css = fs.readFileSync('onae-round.css', 'utf8');
const sels = [...css.matchAll(/\*\/\n([\s\S]*?)\{/g)].flatMap(m => m[1].split(',\n').map(s => s.trim())).filter(s => s && s !== ':root');
const pages = fs.readdirSync('.').filter(f => f.endsWith('.html') && !/^(apercu-|google)/.test(f) && f !== 'product.html' && !(/^blog-/.test(f) && !/^blog-(peptides-anti-age|routine-matin-soir|romarin-cheveux)/.test(f)))
  .map(f => '/' + f).concat(['/mon-compte.html']).concat(['serum-anti-age-peptides', 'shampoing-boucles', 'patchs-yeux-hydrogel-anti-fatigue', 'box-anti-age-peptides', 'carte-cadeau-50', 'creme-contour-cannabidiol', 'serum-gelee-prebiotiques'].map(id => '/produits/' + id));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const ctx = await b.newContext({ viewport: vp === 'pc' ? { width: 1440, height: 900 } : { width: 390, height: 844 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('onae-cart-v1', JSON.stringify([{ id: 'serum-anti-age-peptides', qty: 1 }, { id: 'shampoing-boucles', qty: 2 }])); } catch (e) {} });
  await ctx.route(u => !u.href.startsWith(BASE), r => r.abort());
  if (process.env.SID) await ctx.addCookies([{ name: 'onae_sid', value: process.env.SID, url: BASE }]);
  const pg = await ctx.newPage(); const wide = {}, had = {};
  for (const p of pages) {
    try { await pg.goto(BASE + p + '?lea=1', { waitUntil: 'domcontentloaded', timeout: 20000 }); } catch (e) { continue; }
    await pg.waitForTimeout(1500);
    const w = await pg.evaluate(sels => { const out = [], had = [];
      const lk = [...document.querySelectorAll('link[href*="onae-round"]')]; lk.forEach(l => l.disabled = true);
      const zero = e => { const c = getComputedStyle(e); return ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'].every(k => parseFloat(c[k]) === 0); };
      for (const s of sels) { let els; try { els = document.querySelectorAll(s); } catch (e) { continue; }
        if ([...els].some(e => !zero(e))) had.push(s);
        for (const e of els) { const r = e.getBoundingClientRect(); if (getComputedStyle(e).display !== 'none' && r.width >= innerWidth * 0.96) { out.push(s); break; } } }
      lk.forEach(l => l.disabled = false); return { out, had }; }, sels);
    w.out.forEach(s => (wide[s] = wide[s] || []).push(p)); w.had.forEach(s => (had[s] = had[s] || []).push(p));
  }
  fs.writeFileSync(`scratchpad/round/wide-${vp}.json`, JSON.stringify(wide, null, 1));
  fs.writeFileSync(`scratchpad/round/had-${vp}.json`, JSON.stringify(had, null, 1));
  console.log(vp, 'sélecteurs qui touchent un élément DÉJÀ arrondi :', Object.keys(had).length, JSON.stringify(Object.fromEntries(Object.entries(had).map(([k, v]) => [k, v.slice(0, 3)]))));
  console.log(vp, 'sélecteurs qui touchent une section pleine largeur :', Object.keys(wide).length, JSON.stringify(Object.fromEntries(Object.entries(wide).map(([k, v]) => [k, v.slice(0, 3)]))));
  await b.close();
})();
