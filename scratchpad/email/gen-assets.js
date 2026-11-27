/* Visuels des e-mails de bienvenue (sceau, icônes, carte Privilège) rendus en PNG transparents @2x.
   Lancer depuis la racine : NODE_PATH=$(npm root -g) node scratchpad/email/gen-assets.js */
const { chromium } = require('playwright');
const INK = '#2a0f18', BERRY = '#7a2443', ROSE = '#c9556e', GOLD = '#b88a5a', GOLD2 = '#e8cba0';
const ico = (paths) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="120" height="120"><circle cx="32" cy="32" r="31" fill="#fbeeee"/><g fill="none" stroke="${BERRY}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
const ASSETS = {
  'email-w-ico-ship.png': [120, 120, ico(`<path d="M14 24h22v16H14z"/><path d="M36 29h7l5 6v5H36"/><circle cx="21" cy="42" r="3.2" fill="#fbeeee"/><circle cx="42" cy="42" r="3.2" fill="#fbeeee"/><path d="M9 29h8M7 34h7"/>`)],
  'email-w-ico-gift.png': [120, 120, ico(`<rect x="15" y="27" width="34" height="21" rx="1.5"/><rect x="13" y="21" width="38" height="7" rx="1.5"/><path d="M32 21v27"/><path d="M32 21c-4-7-12-7-11-2 1 3 7 2 11 2zM32 21c4-7 12-7 11-2-1 3-7 2-11 2z"/>`)],
  'email-w-ico-guide.png': [120, 120, ico(`<path d="M32 22c-5-3-11-3-16-1v24c5-2 11-2 16 1 5-3 11-3 16-1V21c-5-2-11-2-16 1z"/><path d="M32 22v24"/><path d="M20 28h7M20 33h7M37 28h7M37 33h7"/>`)],
  'email-w-ico-eclat.png': [120, 120, ico(`<path d="M32 16l3.6 10.4L46 30l-10.4 3.6L32 44l-3.6-10.4L18 30l10.4-3.6z"/><path d="M45 18l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z"/>`)],
  'email-w-seal.png': [240, 240, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="240" height="240">
    <defs><path id="c" d="M100,100 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0"/>
    <radialGradient id="g" cx="35%" cy="30%"><stop offset="0" stop-color="#9b3557"/><stop offset="1" stop-color="${INK}"/></radialGradient></defs>
    <g transform="rotate(-12 100 100)">
    <circle cx="100" cy="100" r="96" fill="url(#g)"/><circle cx="100" cy="100" r="88" fill="none" stroke="${GOLD2}" stroke-width="1.2"/><circle cx="100" cy="100" r="52" fill="none" stroke="${GOLD2}" stroke-width="1" stroke-dasharray="2 4"/>
    <text font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="14" fill="${GOLD2}"><textPath href="#c" textLength="432" lengthAdjust="spacing">BIENVENUE ✦ DANS LA MAISON ✦ ONAÉ PARIS ✦</textPath></text>
    <text x="100" y="96" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="25" fill="#fff">Vous êtes</text>
    <text x="100" y="122" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="21" fill="${GOLD2}">des nôtres</text></g></svg>`],
};
/* carte Onaé Privilège « Rose » (e-mail d'adhésion) */
const CARD = `<div style="width:520px;height:320px;border-radius:22px;position:relative;overflow:hidden;font-family:Georgia,serif;
  background:linear-gradient(135deg,#f6d9d6 0%,#e9b7b4 38%,#f7e2dc 62%,#d99a9d 100%);box-shadow:0 18px 40px rgba(122,36,67,.28)">
  <div style="position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.0) 0 6px,rgba(255,255,255,.12) 6px 7px)"></div>
  <div style="position:absolute;inset:14px;border:1px solid rgba(122,36,67,.35);border-radius:14px"></div>
  <div style="position:absolute;right:-20px;bottom:-34px;font-style:italic;font-size:150px;color:rgba(122,36,67,.10)">Rose</div>
  <div style="position:absolute;left:36px;top:32px;font:700 12px Arial;letter-spacing:.32em;color:${BERRY}">ONAÉ PRIVILÈGE</div>
  <div style="position:absolute;right:36px;top:28px;width:44px;height:34px;border-radius:7px;background:linear-gradient(135deg,#f3dcc0,#c9a46f,#f1d9b6);box-shadow:inset 0 0 0 1px rgba(122,36,67,.25)"></div>
  <div style="position:absolute;left:36px;top:118px;font-size:64px;line-height:1;color:${INK}">50 <span style="font-size:26px;font-style:italic;color:${BERRY}">éclats</span></div>
  <div style="position:absolute;left:38px;top:196px;font:13px Arial;color:${BERRY};letter-spacing:.06em">offerts à votre arrivée ✦</div>
  <div style="position:absolute;left:36px;bottom:34px;font:700 11px Arial;letter-spacing:.3em;color:${BERRY}">CARTE ROSE</div>
  <div style="position:absolute;right:36px;bottom:30px;font-style:italic;font-size:22px;color:${INK}">Paris</div></div>`;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const p = await b.newPage({ deviceScaleFactor: 2 });
  for (const [f, [w, h, svg]] of Object.entries(ASSETS)) {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    await p.screenshot({ path: f, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } }); console.log(f);
  }
  await p.setViewportSize({ width: 600, height: 400 });
  await p.setContent(`<html><body style="margin:0;background:transparent;padding:30px 40px 50px">${CARD}</body></html>`);
  await p.screenshot({ path: 'email-w-card-rose.png', omitBackground: true, clip: { x: 0, y: 0, width: 600, height: 400 } }); console.log('email-w-card-rose.png');
  await b.close();
})();
