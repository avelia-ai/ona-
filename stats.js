/* Onaé — statistiques de la boutique (fichier privé, jamais servi au public).
   Collecte : /api/ev (onae-stats.js sur toutes les pages) + paiements commencés (stripe.js → checkout()) + commandes (orders.json).
   Stockage : <DATA_DIR>/stats/AAAA-MM-JJ.ndjson (une ligne par événement, heure de Paris), effacé après 13 mois.
   Aucune adresse IP enregistrée ; visites de l'administrateur et robots ignorés.
   Page : /admin/stats (onglet « Statistiques »). */
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DIR = path.join(DATA_DIR, 'stats');
const TZ = 'Europe/Paris';
const fDay = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const fHour = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' });
const dayKey = t => fDay.format(new Date(t));
const hourOf = t => Number(fHour.format(new Date(t))) % 24;
const addDays = (key, n) => new Date(Date.parse(key + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);

/* ───────────── écriture (tampon, ajout en fin de fichier toutes les 2 s) ───────────── */
let pending = [];
function push(ev){ pending.push(ev); memToday(ev); }
function flush(){
  if (!pending.length) return;
  const by = {}; pending.forEach(e => { const k = dayKey(e.t); (by[k] = by[k] || []).push(JSON.stringify(e)); }); pending = [];
  try { fs.mkdirSync(DIR, { recursive: true }); } catch (_) {}
  for (const k in by) fs.appendFile(path.join(DIR, k + '.ndjson'), by[k].join('\n') + '\n', err => { if (err) console.error('[stats] écriture', err.message); });
}
setInterval(flush, 2000).unref();
process.on('SIGTERM', () => { try { flush(); } catch (_) {} });

/* effacement au-delà de 13 mois (recommandation CNIL pour la mesure d'audience) */
function purge(){
  try { const lim = addDays(dayKey(Date.now()), -395); fs.readdirSync(DIR).forEach(f => { if (/^\d{4}-\d\d-\d\d\.ndjson$/.test(f) && f.slice(0, 10) < lim) fs.unlinkSync(path.join(DIR, f)); }); } catch (_) {}
}
setTimeout(purge, 30e3).unref(); setInterval(purge, 24 * 3600e3).unref();

/* ───────────── lecture (jours passés gardés en mémoire, jour courant relu s'il a changé) ───────────── */
const cache = new Map();
function loadDay(key){
  const f = path.join(DIR, key + '.ndjson'); let st;
  try { st = fs.statSync(f); } catch (_) { return []; }
  const c = cache.get(key);
  if (c && c.size === st.size) return c.list;
  const list = [];
  try { fs.readFileSync(f, 'utf8').split('\n').forEach(l => { if (l) { try { list.push(JSON.parse(l)); } catch (_) {} } }); } catch (_) {}
  cache.set(key, { size: st.size, list });
  if (cache.size > 420) cache.delete(cache.keys().next().value);
  return list;
}
function events(keys){
  const today = dayKey(Date.now()), out = [];
  keys.forEach(k => { loadDay(k).forEach(e => out.push(e)); if (k === today) pending.forEach(e => { if (dayKey(e.t) === k) out.push(e); }); });
  return out;
}

/* ───────────── mémoire vive : qui est là maintenant, canal de chaque visite ───────────── */
const live = new Map();     // visiteur → { t, p, cc, cv, d }
const sessInfo = new Map(); // visite → { ch, src, d, cty }
function memToday(e){
  if (e.e === 'pv' || e.e === 'add' || e.e === 'end') live.set(e.v, { t: e.t, p: e.p, cc: e.cc != null ? e.cc : (live.get(e.v) || {}).cc, cv: e.cv ? e.cv : (e.cc === 0 ? 0 : (live.get(e.v) || {}).cv), d: e.d || (live.get(e.v) || {}).d });
  if (e.e === 'pv' && !sessInfo.has(e.s)) sessInfo.set(e.s, { ch: e.ch, src: e.src, d: e.d, cty: e.cty });
  if (live.size > 5000) { const lim = Date.now() - 3600e3; for (const [k, x] of live) if (x.t < lim) live.delete(k); }
  if (sessInfo.size > 20000) sessInfo.delete(sessInfo.keys().next().value);
}

/* ───────────── enrichissement ───────────── */
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|facebookexternalhit|embedly|quora link|python|curl|wget|httpclient|axios|node-fetch|go-http|java\/|monitor|uptime|pingdom|statuscake|semrush|ahrefs|mj12|dotbot|petal|bytespider|gptbot|chatgpt-user|claudebot|perplexitybot|ccbot|applebot/i;
const TZC = { 'Europe/Paris':'FR','Europe/Brussels':'BE','Europe/Berlin':'DE','Europe/Busingen':'DE','Europe/Zurich':'CH','Europe/Luxembourg':'LU','Europe/Monaco':'MC','Europe/Madrid':'ES','Atlantic/Canary':'ES','Europe/Rome':'IT','Europe/Amsterdam':'NL','Europe/Lisbon':'PT','Atlantic/Madeira':'PT','Atlantic/Azores':'PT','Europe/Vienna':'AT','Europe/Dublin':'IE','Europe/London':'GB','Europe/Stockholm':'SE','Europe/Copenhagen':'DK','Europe/Oslo':'NO','Europe/Helsinki':'FI','Europe/Warsaw':'PL','Europe/Prague':'CZ','Europe/Budapest':'HU','Europe/Athens':'GR','Europe/Bucharest':'RO','Europe/Sofia':'BG','Europe/Zagreb':'HR','Europe/Ljubljana':'SI','Europe/Bratislava':'SK','Europe/Tallinn':'EE','Europe/Riga':'LV','Europe/Vilnius':'LT','Europe/Malta':'MT','Asia/Nicosia':'CY','Europe/Nicosia':'CY','Asia/Hong_Kong':'HK','Africa/Casablanca':'MA','Africa/Algiers':'DZ','Africa/Tunis':'TN','Indian/Reunion':'RE','America/Martinique':'MQ','America/Guadeloupe':'GP','America/Cayenne':'GF','Indian/Mayotte':'YT','Pacific/Noumea':'NC','Pacific/Tahiti':'PF','America/Montreal':'CA','America/Toronto':'CA','America/Vancouver':'CA','Asia/Dubai':'AE','Asia/Tokyo':'JP','Australia/Sydney':'AU','Africa/Dakar':'SN','Africa/Abidjan':'CI' };
function country(tz, lang){
  if (TZC[tz]) return TZC[tz];
  if (/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Indiana|Kentucky|Boise)/.test(tz) || tz === 'Pacific/Honolulu') return 'US';
  const m = String(lang || '').match(/^[a-z]{2}-([A-Z]{2})$/); return m ? m[1] : '';
}
let DN = null; try { DN = new Intl.DisplayNames(['fr'], { type: 'region' }); } catch (_) {}
const ctyName = c => { if (!c) return 'Inconnu'; try { return DN ? DN.of(c) : c; } catch (_) { return c; } };
function device(ua, w){
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'Tablette';
  if (/Mobi|iPhone|iPod|Android/i.test(ua) || (w && w < 760)) return 'Mobile';
  return 'Ordinateur';
}
function os(ua){
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'; if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows'; if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
  if (/CrOS/i.test(ua)) return 'ChromeOS'; if (/Linux/i.test(ua)) return 'Linux'; return 'Autre';
}
function browser(ua){
  if (/Instagram/i.test(ua)) return 'Instagram (navigateur intégré)'; if (/FBAN|FBAV/i.test(ua)) return 'Facebook (navigateur intégré)'; if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return 'TikTok (navigateur intégré)';
  if (/Edg\//i.test(ua)) return 'Edge'; if (/OPR\/|Opera/i.test(ua)) return 'Opera'; if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
  if (/Firefox|FxiOS/i.test(ua)) return 'Firefox'; if (/Chrome|CriOS/i.test(ua)) return 'Chrome'; if (/Safari/i.test(ua)) return 'Safari'; return 'Autre';
}
const SEARCH = /(^|\.)(google|bing|yahoo|duckduckgo|ecosia|qwant|yandex|baidu|startpage|brave|search\.lilo|lilo|ask)\./i;
const SOCIAL = /(^|\.)(instagram|facebook|fb|tiktok|pinterest|youtube|youtu|snapchat|twitter|t|x|linkedin|lnkd|threads|reddit|whatsapp|wa|messenger|telegram|linktr|lnk|beacons|snipfeed)\.(com|me|co|net|it|fr|bio|ee|be|ai|app)$/i;
const AI = /(chatgpt|openai|perplexity|claude|gemini|copilot|mistral|you\.com|phind|poe\.com|meta\.ai)/i;
const MAIL = /(^mail\.|webmail|outlook|gmail|yahoo\.com\/mail|orange\.fr|laposte|free\.fr|sfr\.fr|proton|brevo|sendibt|em\.onaecosmetics)/i;
function channel(host, us, um){
  const S = String(us || '').toLowerCase(), M = String(um || '').toLowerCase();
  if (/mail|newsletter/.test(M) || /brevo|newsletter|e-?mail|sendinblue/.test(S)) return 'E-mail';
  if (/cpc|ppc|paid|ads?$|display|retarget/.test(M)) return 'Publicité';
  if (/influen|partenaire|affili/.test(M)) return 'Influence & partenaires';
  if (S) {   /* la source déclarée dans le lien (utm_source) prime sur le site d'origine */
    if (AI.test(S)) return 'Assistants IA';
    if (/google|bing|yahoo|duckduckgo|ecosia|qwant/.test(S)) return 'Moteurs de recherche';
    if (/^(ig|fb|tt|yt|x)$/.test(S) || /instagram|facebook|meta|tiktok|pinterest|youtube|snapchat|twitter|linkedin|threads|whatsapp|story|bio/.test(S)) return 'Réseaux sociaux';
    return 'Sites référents';
  }
  if (!host) return 'Accès direct';
  if (AI.test(host)) return 'Assistants IA';
  if (SEARCH.test(host)) return 'Moteurs de recherche';
  if (SOCIAL.test(host) || /instagram|facebook|tiktok|pinterest|youtube|snapchat/.test(host)) return 'Réseaux sociaux';
  if (MAIL.test(host)) return 'E-mail';
  return 'Sites référents';
}
function refHost(r){ try { const u = new URL(r); return /^https?:$/.test(u.protocol) ? u.hostname.replace(/^www\.|^m\.|^l\.|^lm\./, '').toLowerCase().slice(0, 80) : (r.startsWith('android-app://') ? r.slice(14).split('/')[0] : ''); } catch (_) { return ''; } }
const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const hex = v => /^[a-f0-9]{16}$/.test(String(v || '')) ? String(v) : '';
const cookieOf = (req, n) => { const m = String(req.headers.cookie || '').match(new RegExp('(?:^|;\\s*)' + n + '=([a-f0-9]{16})')); return m ? m[1] : ''; };

/* ───────────── collecte ───────────── */
const { limiter, clientIp } = require('./security');
const evHits = limiter(400, 10 * 60e3);
function ingest(req, res, isAdmin){
  const done = () => { res.writeHead(204, { 'Cache-Control': 'no-store' }); res.end(); };
  const ua = String(req.headers['user-agent'] || '');
  let body = '', big = false;
  req.on('data', c => { body += c; if (body.length > 4096) { big = true; req.destroy(); } });
  req.on('end', () => {
    if (big) return;
    done();
    try {
      if (!ua || BOT.test(ua) || isAdmin) return;
      if (evHits.take(clientIp(req))) return;
      const d = JSON.parse(body || '{}');
      const v = hex(d.v), s = hex(d.s), e = String(d.e || '');
      if (!v || !s || !['pv', 'add', 'end'].includes(e)) return;
      const p = clean(d.p, 200).split('?')[0] || '/';
      if (/^\/(admin|api)\b/.test(p)) return;
      const ev = { t: Date.now(), e, v, s, p };
      if (e === 'pv') {
        const host = refHost(clean(d.r, 300)), us = clean(d.us, 60), um = clean(d.um, 60), uc = clean(d.uc, 80);
        Object.assign(ev, { n: d.n ? 1 : 0, ns: d.ns ? 1 : 0, ch: channel(host, us, um), src: us || host || '', d: device(ua, Number(d.w) || 0), os: os(ua), br: browser(ua), cty: country(clean(d.z, 40), clean(d.l, 10)) });
        if (host) ev.ref = host; if (uc) ev.uc = uc; if (um) ev.um = um;
        const id = clean(d.id, 80); if (/^[a-z0-9-]+$/.test(id)) ev.id = id;
        const si = sessInfo.get(s); if (si && !ev.ns) { ev.ch = si.ch; ev.src = si.src; }   // le canal reste celui de l'arrivée
      } else if (e === 'add') {
        const id = clean(d.id, 160); if (!/^[a-z0-9.-]+$/.test(id)) return;
        Object.assign(ev, { id, q: Math.max(1, Math.min(9, Number(d.q) || 1)), val: Math.max(0, Math.min(500000, Math.round(Number(d.val) || 0))) });
      } else {
        Object.assign(ev, { dur: Math.max(0, Math.min(3600e3, Math.round(Number(d.dur) || 0))), sc: Math.max(0, Math.min(100, Math.round(Number(d.sc) || 0))) });
      }
      if (e !== 'add') { if (d.cc != null) ev.cc = Math.max(0, Math.min(99, Number(d.cc) || 0)); if (d.cv != null) ev.cv = Math.max(0, Math.min(5e6, Math.round(Number(d.cv) || 0))); }
      push(ev);
    } catch (_) {}
  });
}
/* paiement commencé (appelé par stripe.js une fois la session Stripe créée) */
function checkout(req, info){
  try {
    const v = cookieOf(req, 'onae_v'), s = cookieOf(req, 'onae_s'), si = sessInfo.get(s) || {};
    push({ t: Date.now(), e: 'co', v, s, sid: clean(info.sid, 120), val: Math.round(Number(info.cents) || 0), items: (info.items || []).map(i => clean(i, 160)).slice(0, 30), cty: clean(info.country, 2), em: clean(info.email, 120), ui: clean(info.ui, 12), ch: si.ch || '', src: si.src || '', d: si.d || '' });
  } catch (_) {}
}

/* ───────────── données annexes ───────────── */
const readJSON = (f, def) => { try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')); } catch (_) { return def; } };
let CAT = null, CAT_AT = 0;
function catalog(){
  if (CAT && Date.now() - CAT_AT < 60e3) return CAT;
  try { const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8')); const l = Array.isArray(d) ? d : (d.products || []); CAT = {}; l.forEach(p => { CAT[p.id] = { name: [p.name, p.name_line2].filter(Boolean).join(' '), img: 'cart-' + p.id + '.jpg', bundles: Object.fromEntries((p.bundles || []).map(b => [b.id, b.name])) }; }); } catch (_) { CAT = CAT || {}; }
  CAT_AT = Date.now(); return CAT;
}
const baseId = id => String(id || '').split('--')[0];
function compsOf(id){ const m = String(id).match(/--bar-(.+)$/); return m ? m[1].split('.') : [baseId(id)]; }
function lineName(id){
  const C = catalog(), b = baseId(id), p = C[b]; if (!p) return id;
  if (/--bar-/.test(id)) return 'Ma routine sur mesure (' + compsOf(id).map(x => (C[x] || {}).name || x).join(' + ') + ')';
  const f = String(id).split('--')[1]; return f ? (p.bundles[f] || f) + ' · ' + p.name : p.name;
}
const PAGE = { '/': 'Accueil', '/index.html': 'Accueil', '/panier.html': 'Panier', '/paiement.html': 'Paiement', '/checkout.html': 'Confirmation de commande', '/soins-visage.html': 'Soins visage', '/soins-yeux.html': 'Soins yeux', '/soins-cheveux.html': 'Soins cheveux', '/nouveautes.html': 'Nouveautés', '/coffrets-duos.html': 'Coffrets & Duos', '/bar-a-routines.html': 'Bar à routines', '/box.html': 'Les Box', '/diagnostic.html': 'Diagnostic', '/blog.html': 'Le Journal', '/mon-compte.html': 'Mon compte', '/compte.html': 'Connexion', '/fidelite.html': 'Onaé Privilège', '/homme.html': 'Onaé Homme', '/makeup.html': 'Onaé Makeup', '/nos-gammes.html': 'Nos gammes', '/routine.html': 'Routine', '/faq.html': 'FAQ', '/contact.html': 'Contact', '/livraison-retours.html': 'Livraison & retours', '/carte-cadeau.html': 'Carte cadeau', '/notre-histoire.html': 'Notre histoire', '/nos-ingredients.html': 'Nos ingrédients', '/suivi-commande.html': 'Suivi de commande' };
function pageName(p){
  const m = p.match(/^\/produits\/([a-z0-9-]+)/); if (m) { const c = catalog()[m[1]]; return c ? c.name : 'Fiche ' + m[1]; }
  if (PAGE[p]) return PAGE[p];
  if (/^\/blog-/.test(p)) return 'Journal · ' + p.slice(6).replace(/\.html$/, '').replace(/-/g, ' ');
  return p.replace(/\.html$/, '').replace(/^\//, '').replace(/-/g, ' ') || 'Accueil';
}
const isTest = o => o.test != null ? !!o.test : (o.livemode === false || (Number(o.total) || 0) < 2);

/* ───────────── calcul du rapport ───────────── */
function range(p){
  const today = dayKey(Date.now());
  const n = { today: 1, yesterday: 1, '7': 7, '30': 30, '90': 90, '365': 365 }[p] || 7;
  const end = p === 'yesterday' ? addDays(today, -1) : today;
  const keys = []; for (let i = n - 1; i >= 0; i--) keys.push(addDays(end, -i));
  const prev = keys.map(k => addDays(k, -n));
  return { keys, prev, n, hourly: n === 1 };
}
function compute(keys, hourly, full){
  const now = Date.now(), set = new Set(keys);
  const evs = events(keys);
  const S = new Map(), V = new Map(), newV = new Set();
  const sess = s => { let x = S.get(s); if (!x) { x = { pv: 0, first: Infinity, last: 0, pages: [], adds: 0, addVal: 0, dur: 0, sc: [], cc: 0, cv: 0, pview: false, cart: false, pay: false, co: [], ch: '', src: '', d: '', os: '', br: '', cty: '', v: '' }; S.set(s, x); } return x; };
  const pageStat = {}, prod = {}, hours = new Array(24).fill(0), series = {};
  const bucket = t => hourly ? hourOf(t) : dayKey(t);
  const ser = k => series[k] = series[k] || { visitors: new Set(), sessions: new Set(), pv: 0, adds: 0, orders: 0, ca: 0 };
  const P = id => prod[id] = prod[id] || { views: 0, vs: new Set(), adds: 0, addQ: 0, sold: 0, ca: 0 };
  const cos = [];
  for (const e of evs) {
    if (!set.has(dayKey(e.t))) continue;
    if (e.e === 'co') { cos.push(e); if (e.s) { const x = sess(e.s); x.co.push(e.sid); } continue; }
    const x = sess(e.s); x.v = e.v; x.first = Math.min(x.first, e.t); x.last = Math.max(x.last, e.t);
    V.set(e.v, Math.max(V.get(e.v) || 0, e.t));
    const b = ser(bucket(e.t)); b.visitors.add(e.v); b.sessions.add(e.s);
    if (e.e === 'pv') {
      x.pv++; x.pages.push(e.p); if (!x.ch || e.ns) { x.ch = e.ch; x.src = e.src; x.d = e.d; x.os = e.os; x.br = e.br; x.cty = e.cty; x.uc = e.uc || x.uc; x.ref = e.ref || x.ref; x.landing = x.landing || e.p; }
      if (e.ns && !x.landingSet) { x.landing = e.p; x.landingSet = 1; }
      if (e.n) newV.add(e.v);
      b.pv++; hours[hourOf(e.t)]++;
      const ps = pageStat[e.p] = pageStat[e.p] || { pv: 0, vs: new Set(), dur: 0, dn: 0 }; ps.pv++; ps.vs.add(e.v);
      if (e.id || /^\/produits\//.test(e.p)) { x.pview = true; const id = e.id || e.p.split('/')[2]; const q = P(id); q.views++; q.vs.add(e.s); }
      if (/^\/panier(\.html)?$/.test(e.p)) x.cart = true;
      if (/^\/paiement(\.html)?$/.test(e.p)) x.pay = true;
      if (e.cc != null) { x.cc = e.cc; if (e.cv || !e.cc) x.cv = e.cv || 0; }
    } else if (e.e === 'add') {
      x.adds++; x.addVal += e.val || 0; b.adds++;
      compsOf(e.id).forEach(id => { const q = P(id); q.adds++; q.addQ += e.q || 1; });
    } else if (e.e === 'end') {
      x.dur += e.dur || 0; x.sc.push(e.sc || 0);
      const ps = pageStat[e.p]; if (ps) { ps.dur += e.dur || 0; ps.dn++; }
      if (e.cc != null) { x.cc = e.cc; if (e.cv || !e.cc) x.cv = e.cv || 0; }
    }
  }
  /* commandes de la période (hors tests et annulées) */
  const allOrders = readJSON('orders.json', []);
  const orders = allOrders.filter(o => set.has(dayKey(o.at)) && !isTest(o) && o.status !== 'Annulée');
  const paidSid = new Set(allOrders.filter(o => !isTest(o)).map(o => o.stripe_session_id));
  const coBySid = {}; cos.forEach(c => { coBySid[c.sid] = c; });
  const firstOrder = {}; allOrders.filter(o => !isTest(o) && o.status !== 'Annulée').sort((a, b) => String(a.at).localeCompare(String(b.at))).forEach(o => { if (o.email && !firstOrder[o.email]) firstOrder[o.email] = o.at; });
  let ca = 0, items = 0, disc = 0, ship = 0, newCust = 0; const ordCty = {}, chOrders = {};
  orders.forEach(o => {
    const t = Date.parse(o.at), b = ser(bucket(t)); b.orders++; b.ca += Number(o.total) || 0;
    ca += Number(o.total) || 0; disc += Number(o.discount) || 0; ship += Number(o.shipping) || 0;
    (o.items || []).filter(i => !i.gift).forEach(i => { items += i.qty || 1; compsOf(i.id).forEach(id => { if (!id) return; const q = P(id); q.sold += i.qty || 1; }); if (i.id) P(i.id).ca += (i.price || 0) * (i.qty || 1); });
    if (o.email && firstOrder[o.email] === o.at) newCust++;
    const c = (o.address && o.address.country) || ''; ordCty[c] = (ordCty[c] || 0) + 1;
    const co = coBySid[o.stripe_session_id]; const ch = co ? (co.ch || 'Accès direct') : 'Non suivi';
    const k = chOrders[ch] = chOrders[ch] || { n: 0, ca: 0 }; k.n++; k.ca += Number(o.total) || 0;
  });
  const sessions = [...S.values()].filter(x => x.pv > 0);
  const nS = sessions.length, nV = V.size, pv = sessions.reduce((t, x) => t + x.pv, 0);
  const bounce = sessions.filter(x => x.pv === 1 && !x.adds).length;
  const durAvg = nS ? sessions.reduce((t, x) => t + x.dur, 0) / nS : 0;
  const scAll = sessions.flatMap(x => x.sc); const depth = scAll.length ? scAll.reduce((a, b) => a + b, 0) / scAll.length : 0;
  const nOrders = orders.length;
  /* tunnel (par visite) */
  const convS = sessions.filter(x => x.co.some(sid => paidSid.has(sid)));
  const funnel = [
    ['Visites', nS],
    ['Ont vu une fiche produit', sessions.filter(x => x.pview).length],
    ['Ont ajouté au panier', sessions.filter(x => x.adds > 0).length],
    ['Ont ouvert le panier', sessions.filter(x => x.cart).length],
    ['Ont commencé le paiement', sessions.filter(x => x.co.length || x.pay).length],
    ['Ont commandé', convS.length],
  ];
  /* paniers abandonnés */
  const cartSess = sessions.filter(x => x.cc > 0 || x.adds > 0);
  const ended = x => now - x.last > 30 * 60e3;
  const abCarts = cartSess.filter(x => ended(x) && !x.co.some(sid => paidSid.has(sid)) && x.cc > 0);
  const liveCarts = cartSess.filter(x => !ended(x) && x.cc > 0);
  /* une visite qui ouvre plusieurs fois le paiement compte une seule fois (la dernière tentative) ; payée = jamais abandonnée */
  const coKey = c => c.s || c.sid, paidKey = new Set(cos.filter(c => paidSid.has(c.sid)).map(coKey)), lastCo = new Map();
  cos.forEach(c => { const k = coKey(c), x = lastCo.get(k); if (!x || c.t > x.t) lastCo.set(k, c); });
  const abCo = [...lastCo.entries()].filter(([k, c]) => !paidKey.has(k) && now - c.t > 35 * 60e3).map(([, c]) => c);
  const nCo = lastCo.size;
  const r = {
    visitors: nV, newVisitors: newV.size, sessions: nS, pageviews: pv, pps: nS ? pv / nS : 0, bounce: nS ? bounce / nS : 0, durAvg, depth,
    adds: sessions.reduce((t, x) => t + x.adds, 0), addSessions: sessions.filter(x => x.adds > 0).length,
    orders: nOrders, ca, aov: nOrders ? ca / nOrders : 0, ipo: nOrders ? items / nOrders : 0, conv: nS ? convS.length / nS : 0, convOrders: nS ? nOrders / nS : 0, rpv: nV ? ca / nV : 0, disc, ship, newCust, retCust: nOrders - newCust,
    checkouts: nCo, coAb: abCo.length, coAbVal: abCo.reduce((t, c) => t + (c.val || 0), 0) / 100, coAbRate: nCo ? abCo.length / nCo : 0,
    cartSess: cartSess.length, abCarts: abCarts.length, abVal: abCarts.reduce((t, x) => t + (x.cv || 0), 0) / 100, abRate: cartSess.length ? 1 - convS.length / cartSess.length : 0,
  };
  if (!full) return r;
  const group = (fn) => { const g = {}; sessions.forEach(x => { const k = fn(x) || 'Inconnu'; const y = g[k] = g[k] || { n: 0, conv: 0 }; y.n++; if (x.co.some(sid => paidSid.has(sid))) y.conv++; }); return Object.entries(g).map(([k, y]) => ({ k, n: y.n, conv: y.conv })).sort((a, b) => b.n - a.n); };
  r.channels = group(x => x.ch || 'Accès direct').map(c => Object.assign(c, { orders: (chOrders[c.k] || {}).n || 0, ca: (chOrders[c.k] || {}).ca || 0 }));
  if (chOrders['Non suivi']) r.channels.push({ k: 'Non suivi', n: 0, conv: 0, orders: chOrders['Non suivi'].n, ca: chOrders['Non suivi'].ca });
  r.refs = group(x => x.ref || '').filter(x => x.k !== 'Inconnu').slice(0, 12);
  r.campaigns = group(x => x.uc || '').filter(x => x.k !== 'Inconnu').slice(0, 12);
  r.devices = group(x => x.d); r.os = group(x => x.os); r.browsers = group(x => x.br).slice(0, 8);
  r.countries = group(x => ctyName(x.cty)).slice(0, 12);
  r.landing = group(x => pageName(x.landing || '/')).slice(0, 12);
  r.pages = Object.entries(pageStat).map(([p, s]) => ({ k: pageName(p), p, pv: s.pv, v: s.vs.size, dur: s.dn ? s.dur / s.dn : 0 })).sort((a, b) => b.pv - a.pv).slice(0, 15);
  const C = catalog();
  r.products = Object.entries(prod).filter(([id]) => C[id]).map(([id, q]) => ({ id, name: C[id].name, img: C[id].img, views: q.vs.size, adds: q.adds, rate: q.vs.size ? Math.min(1, q.adds / q.vs.size) : 0, sold: q.sold, ca: q.ca })).sort((a, b) => (b.views - a.views) || (b.adds - a.adds) || (b.sold - a.sold)).slice(0, 40);
  r.hours = hours;
  r.ordCountries = Object.entries(ordCty).map(([k, n]) => ({ k: ctyName(k), n })).sort((a, b) => b.n - a.n);
  r.abCoList = abCo.slice().sort((a, b) => b.t - a.t).slice(0, 15).map(c => ({ t: c.t, val: (c.val || 0) / 100, items: (c.items || []).map(lineName), em: c.em, ch: c.ch || 'Accès direct', d: c.d, cty: ctyName(c.cty) }));
  r.abCartList = abCarts.slice().sort((a, b) => b.last - a.last).slice(0, 15).map(x => ({ t: x.last, val: (x.cv || 0) / 100, n: x.cc, ch: x.ch || 'Accès direct', d: x.d, last: pageName(x.pages[x.pages.length - 1] || '/'), pages: x.pv }));
  r.liveCarts = liveCarts.length; r.liveCartsVal = liveCarts.reduce((t, x) => t + (x.cv || 0), 0) / 100;
  /* séries (jour par jour, ou heure par heure pour une seule journée) */
  const ks = hourly ? [...Array(24).keys()] : keys;
  r.series = ks.map(k => { const b = series[k] || { visitors: new Set(), sessions: new Set(), pv: 0, adds: 0, orders: 0, ca: 0 }; return { k, visitors: b.visitors.size, sessions: b.sessions.size, pv: b.pv, adds: b.adds, orders: b.orders, ca: b.ca }; });
  r.funnel = funnel;
  /* acquisition de contacts */
  const inR = l => (Array.isArray(l) ? l : []).filter(x => x && x.at && set.has(dayKey(x.at)));
  const wel = readJSON('welcome.json', []);
  r.contacts = { newsletter: inR(readJSON('newsletter.json', [])).length, privilege: inR(readJSON('loyalty.json', [])).length, accounts: (Array.isArray(readJSON('accounts.json', [])) ? readJSON('accounts.json', []) : []).filter(u => u.createdAt && set.has(dayKey(u.createdAt))).length, codes: inR(wel).length, codesUsed: inR(wel).filter(w => w.used).length };
  return r;
}
let memo = { key: '', at: 0, data: null };
function report(p){
  const R = range(p), key = p + '|' + R.keys[R.keys.length - 1];
  if (memo.key === key && Date.now() - memo.at < 20e3) return memo.data;
  const cur = compute(R.keys, R.hourly, true), prev = compute(R.prev, R.hourly, false);
  const data = { p, R, cur, prev, at: Date.now() };
  memo = { key, at: Date.now(), data }; return data;
}
function liveNow(){
  const lim = Date.now() - 5 * 60e3, list = [];
  for (const [, x] of live) if (x.t >= lim) list.push(x);
  const pages = {}; list.forEach(x => { const k = pageName(x.p); pages[k] = (pages[k] || 0) + 1; });
  return { n: list.length, carts: list.filter(x => x.cc > 0).length, cartVal: list.reduce((t, x) => t + (x.cc > 0 ? (x.cv || 0) : 0), 0) / 100, pages: Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 6) };
}
/* au démarrage : on reconstruit « qui est là » à partir du fichier du jour */
setTimeout(() => { try { loadDay(dayKey(Date.now())).forEach(memToday); } catch (_) {} }, 1500).unref();

/* ───────────── page /admin/stats ───────────── */
const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = new Intl.NumberFormat('fr-FR'), eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const pct = (x, d = 1) => (x * 100).toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: 0 }) + ' %';
const mmss = ms => { const s = Math.round(ms / 1000); return s < 60 ? s + ' s' : Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0'); };
const when = t => new Date(t).toLocaleString('fr-FR', { timeZone: TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
function delta(a, b, inverse){
  if (!b && !a) return '<i class="dl z">—</i>';
  if (!b) return '<i class="dl up">nouveau</i>';
  const d = (a - b) / b, good = inverse ? d < 0 : d > 0;
  if (Math.abs(d) < 0.005) return '<i class="dl z">=</i>';
  return `<i class="dl ${good ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d * 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %</i>`;
}
function bars(rows, opt){
  opt = opt || {}; if (!rows.length) return '<p class="empty">Pas encore de données sur cette période.</p>';
  const max = Math.max(...rows.map(r => r.n)) || 1, tot = opt.total || rows.reduce((t, r) => t + r.n, 0) || 1;
  return '<div class="bl">' + rows.map(r => `<div class="bl-r" data-tip="${esc(r.k)} · ${nf.format(r.n)} ${opt.unit || 'visites'} (${pct(r.n / tot, 0)})${r.conv != null && r.n ? ' · conversion ' + pct(r.conv / r.n) : ''}${r.orders ? ' · ' + r.orders + ' commande' + (r.orders > 1 ? 's' : '') + ' · ' + eur.format(r.ca) : ''}"><span class="bl-k">${esc(r.k)}</span><span class="bl-t"><i style="width:${Math.max(1.5, r.n / max * 100).toFixed(1)}%"></i></span><span class="bl-v">${nf.format(r.n)}<small>${pct(r.n / tot, 0)}</small></span>${opt.extra ? `<span class="bl-x">${opt.extra(r)}</span>` : ''}</div>`).join('') + '</div>';
}
function chart(series, field, opt){
  const W = 560, H = 190, pl = 40, pr = 8, pt = 12, pb = 26, n = series.length;
  const vals = series.map(s => s[field]), max = Math.max(...vals, 0);
  const nice = m => { if (m <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(m))), f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
  const top = nice(max), bw = (W - pl - pr) / n, gap = Math.min(6, bw * 0.28);
  const y = v => pt + (H - pt - pb) * (1 - v / top);
  const ticks = [0, top / 2, top];
  const lab = k => opt.hourly ? k + ' h' : new Date(k + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const every = Math.max(1, Math.ceil(n / (opt.hourly ? 8 : 7)));
  const fmt = opt.money ? (v => eur.format(v)) : (v => nf.format(v));
  let g = ticks.map(t => `<line x1="${pl}" x2="${W - pr}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}" class="gr"/><text x="${pl - 6}" y="${(y(t) + 4).toFixed(1)}" class="ax" text-anchor="end">${opt.money ? nf.format(Math.round(t)) + ' €' : nf.format(Math.round(t))}</text>`).join('');
  g += series.map((s, i) => { const v = s[field], x = pl + i * bw + gap / 2, h = Math.max(0, H - pb - y(v)), w = Math.max(1, bw - gap);
    const r = Math.min(4, w / 2, h);
    const path = h > 0 ? `M${x.toFixed(1)},${(H - pb).toFixed(1)}V${(H - pb - h + r).toFixed(1)}q0,-${r} ${r},-${r}h${(w - 2 * r).toFixed(1)}q${r},0 ${r},${r}V${(H - pb).toFixed(1)}Z` : '';
    return `<g class="bk" data-tip="${esc(lab(s.k))} · ${esc(fmt(v))}${opt.sub ? ' · ' + esc(opt.sub(s)) : ''}"><rect x="${(pl + i * bw).toFixed(1)}" y="${pt}" width="${bw.toFixed(1)}" height="${H - pt - pb}" fill="transparent"/>${path ? `<path d="${path}" class="br"/>` : ''}</g>` + (i % every === 0 ? `<text x="${(x + w / 2).toFixed(1)}" y="${H - 8}" class="ax" text-anchor="middle">${esc(lab(s.k))}</text>` : ''); }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="ch" role="img" aria-label="${esc(opt.title)}">${g}</svg>`;
}
function table(head, rows, empty){
  if (!rows.length) return `<p class="empty">${empty || 'Pas encore de données sur cette période.'}</p>`;
  return `<div class="tw"><table><thead><tr>${head.map(h => `<th${h[1] ? ' class="r"' : ''}>${h[0]}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
const CSS = `
main{width:min(1240px,100% - 40px);margin:34px auto 90px}
.eye{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#a3959b;margin:0 0 10px}
h1{font-size:clamp(32px,4vw,46px);line-height:1.05}h1 em{color:var(--rose)}
.top{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end;justify-content:space-between;margin-bottom:26px}
.per{display:flex;flex-wrap:wrap;gap:6px;padding:5px;border-radius:999px;background:#fff;box-shadow:0 0 0 1px var(--line)}
.per a{padding:9px 15px;border-radius:999px;text-decoration:none;font-size:13px;font-weight:500;color:var(--mid)}.per a.on{background:#2a1820;color:#fff}
.live{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:16px 20px;border-radius:20px;background:linear-gradient(140deg,#2a1820,#4a1f2f);color:#fff;margin-bottom:18px;box-shadow:0 24px 50px -26px rgba(90,25,50,.6)}
.live b{font-family:'DM Serif Display',serif;font-weight:400;font-size:30px;line-height:1}
.dot{width:10px;height:10px;border-radius:50%;background:#5ee39a;box-shadow:0 0 0 0 rgba(94,227,154,.6);animation:pu 1.8s infinite}@keyframes pu{70%{box-shadow:0 0 0 10px rgba(94,227,154,0)}100%{box-shadow:0 0 0 0 rgba(94,227,154,0)}}
.live span{opacity:.75;font-size:13px}.live .lp{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto}.live .lp i{font-style:normal;font-size:12px;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.1)}
.kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:14px}
.k{padding:20px 20px 18px;border-radius:20px;background:#fff;box-shadow:0 0 0 1px var(--line);position:relative}
.k.hl{background:linear-gradient(150deg,#fff,#fdf1f4);box-shadow:0 0 0 1px #f1d3db}
.k small{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#a3959b;margin-bottom:8px}
.k b{display:block;font-family:'DM Serif Display',serif;font-weight:400;font-size:34px;line-height:1.05;color:var(--ink)}
.k p{margin:8px 0 0;font-size:12.5px;color:var(--mid)}
.dl{font-style:normal;font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;margin-right:6px}.dl.up{background:#e3f4ea;color:#23704a}.dl.dn{background:#fdecef;color:#a8324f}.dl.z{background:#f3eef0;color:#8d8086}
.g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.card{padding:22px 22px 18px;border-radius:22px;background:#fff;box-shadow:0 0 0 1px var(--line);min-width:0}
.card h3{font-family:'DM Serif Display',serif;font-weight:400;font-size:21px;margin:0 0 4px}.card .sub{margin:0 0 16px;font-size:13px;color:var(--mid)}
h2{font-size:28px;margin:46px 0 6px}h2+.lead{margin:0 0 18px;color:var(--mid);font-size:14px;max-width:760px}
.ch{width:100%;height:auto;display:block}.ch .gr{stroke:#f1e8eb;stroke-width:1}.ch .ax{font:11px 'DM Sans',sans-serif;fill:#a3959b}.ch .br{fill:#8e2a47}.ch .bk:hover .br{fill:#c9556e}
.bl{display:grid;gap:9px}.bl-r{display:grid;grid-template-columns:minmax(110px,38%) 1fr auto;gap:12px;align-items:center;font-size:13.5px;padding:2px 0;cursor:default}
.bl-k{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bl-t{height:8px;border-radius:999px;background:#f6eff1;overflow:hidden}.bl-t i{display:block;height:100%;border-radius:999px;background:#8e2a47}
.bl-r:hover .bl-t i{background:#c9556e}.bl-v{font-weight:600;font-variant-numeric:tabular-nums;text-align:right;min-width:74px}.bl-v small{font-weight:400;color:#a3959b;margin-left:6px;font-size:12px}
.bl-x{grid-column:1/-1;margin-top:-4px;font-size:12px;color:var(--mid)}
.fn{display:grid;gap:10px}.fn-r{display:grid;grid-template-columns:minmax(170px,26%) 1fr 150px;gap:14px;align-items:center;font-size:14px}
.fn-t{height:34px;border-radius:10px;background:#f8f2f4;overflow:hidden;position:relative}.fn-t i{position:absolute;left:0;top:0;bottom:0;border-radius:10px;background:linear-gradient(90deg,#8e2a47,#b94a68)}
.fn-t b{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#fff;font-size:13px;font-weight:600;mix-blend-mode:normal;text-shadow:0 1px 2px rgba(0,0,0,.25)}
.fn-t b.o{color:var(--ink);text-shadow:none}
.fn-p{font-size:12.5px;color:var(--mid);text-align:right}.fn-p strong{display:block;font-size:15px;color:var(--ink)}.fn-p .lo{color:#a8324f}
.tw{overflow-x:auto;border-radius:16px;box-shadow:0 0 0 1px var(--line)}
table{width:100%;border-collapse:collapse;font-size:13.5px;background:#fff}th,td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--line);white-space:nowrap}
th{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#a3959b;font-weight:500;background:#fff}th.r,td.r{text-align:right;font-variant-numeric:tabular-nums}
tr:last-child td{border-bottom:0}tbody tr:hover{background:#fdf7f8}td.w{white-space:normal;min-width:240px;max-width:420px}
td img{width:34px;height:42px;object-fit:cover;vertical-align:middle;margin-right:10px;border-radius:4px}
.mini{display:inline-block;height:6px;border-radius:999px;background:#8e2a47;vertical-align:middle;margin-right:8px;min-width:2px}
.pill{display:inline-block;padding:2px 9px;border-radius:999px;background:#f3eef0;font-size:12px;color:var(--mid)}
.cd{font:12.5px ui-monospace,Menlo,monospace;background:#fff;border:1px solid var(--line);padding:2px 7px;border-radius:6px;word-break:break-all}
.empty{margin:0;padding:22px;text-align:center;color:var(--mid);font-size:14px;background:#fcf9fa;border-radius:14px}
.note{margin-top:46px;padding:18px 22px;border-radius:18px;background:#fff;box-shadow:0 0 0 1px var(--line);font-size:13px;color:var(--mid);line-height:1.65}
.note button{margin-top:10px}
#tip{position:fixed;z-index:50;pointer-events:none;padding:8px 12px;border-radius:10px;background:#1c1418;color:#fff;font-size:12.5px;max-width:320px;opacity:0;transition:opacity .12s;box-shadow:0 12px 30px -12px rgba(0,0,0,.5)}
.hrs{display:grid;grid-template-columns:repeat(24,1fr);gap:3px;align-items:end;height:110px;margin-top:6px}.hrs i{display:block;border-radius:4px 4px 0 0;background:#8e2a47;min-height:2px}.hrs i:hover{background:#c9556e}
.hrl{display:grid;grid-template-columns:repeat(24,1fr);gap:3px;font-size:10px;color:#a3959b;text-align:center;margin-top:5px}
@media(max-width:1000px){.kpi{grid-template-columns:repeat(2,minmax(0,1fr))}.g3{grid-template-columns:1fr}}
@media(max-width:760px){.k{padding:16px 15px 14px}.card{padding:18px 15px 14px}.g2{grid-template-columns:1fr}.fn-r{grid-template-columns:1fr 92px}.fn-r>span:first-child{grid-column:1/-1;margin-bottom:-6px}.k b{font-size:28px}.live .lp{margin-left:0}}
`;
function page(admin, p, toPrep){
  const D = report(p), c = D.cur, v = D.prev, L = liveNow(), hourly = D.R.hourly;
  const PER = [['today', "Aujourd'hui"], ['yesterday', 'Hier'], ['7', '7 jours'], ['30', '30 jours'], ['90', '90 jours'], ['365', '12 mois']];
  const perLabel = (PER.find(x => x[0] === p) || PER[2])[1];
  const prevLabel = hourly ? 'la veille' : 'les ' + D.R.n + ' jours précédents';
  const K = (lab, val, d, sub, hl) => `<div class="k${hl ? ' hl' : ''}"><small>${lab}</small><b>${val}</b><p>${d}${String(sub || '').replace(/^\s*·\s*/, '')}</p></div>`;
  const fn = c.funnel, f0 = fn[0][1] || 0;
  const funnel = fn.map((r, i) => { const w = f0 ? r[1] / f0 * 100 : 0, prevN = i ? fn[i - 1][1] : 0, step = i && prevN ? r[1] / prevN : null;
    return `<div class="fn-r" data-tip="${esc(r[0])} : ${nf.format(r[1])}${f0 ? ' · ' + pct(r[1] / f0) + ' des visites' : ''}"><span>${esc(r[0])}</span><span class="fn-t"><i style="width:${Math.max(r[1] ? 2 : 0, w).toFixed(1)}%"></i><b class="${w < 14 ? 'o' : ''}" style="${w < 14 ? 'left:calc(' + Math.max(2, w).toFixed(1) + '% + 10px)' : ''}">${nf.format(r[1])}</b></span><span class="fn-p">${i ? `<strong>${step == null ? '—' : pct(step)}</strong>${step != null ? `<span class="${step < .3 ? 'lo' : ''}">de l'étape précédente</span>` : ''}` : '<strong>100 %</strong>point de départ'}</span></div>`; }).join('');
  const prodRows = c.products.map(q => `<tr><td><img src="/${esc(q.img)}" alt="" loading="lazy">${esc(q.name)}</td><td class="r">${nf.format(q.views)}</td><td class="r">${nf.format(q.adds)}</td><td class="r"><span class="mini" style="width:${Math.round(q.rate * 60)}px"></span>${pct(q.rate, 0)}</td><td class="r">${nf.format(q.sold)}</td><td class="r">${q.ca ? eur.format(q.ca) : '—'}</td></tr>`);
  const pageRows = c.pages.map(q => `<tr><td>${esc(q.k)}<br><small style="color:#a3959b">${esc(q.p)}</small></td><td class="r">${nf.format(q.pv)}</td><td class="r">${nf.format(q.v)}</td><td class="r">${q.dur ? mmss(q.dur) : '—'}</td></tr>`);
  const abCoRows = c.abCoList.map(a => `<tr><td>${esc(when(a.t))}</td><td class="w">${a.items.map(esc).join('<br>')}</td><td class="r"><b>${eur.format(a.val)}</b></td><td>${a.em ? `<a href="mailto:${esc(a.em)}">${esc(a.em)}</a>` : '<span class="pill">non connecté</span>'}</td><td>${esc(a.ch)}</td><td>${esc(a.d || '')}</td><td>${esc(a.cty || '')}</td></tr>`);
  const abCartRows = c.abCartList.map(a => `<tr><td>${esc(when(a.t))}</td><td class="r">${a.n}</td><td class="r"><b>${a.val ? eur.format(a.val) : '—'}</b></td><td>${esc(a.last)}</td><td class="r">${a.pages}</td><td>${esc(a.ch)}</td><td>${esc(a.d || '')}</td></tr>`);
  const chRows = c.channels.map(x => `<tr><td>${esc(x.k)}</td><td class="r">${nf.format(x.n)}</td><td class="r">${x.n ? pct(x.n / (c.sessions || 1), 0) : '—'}</td><td class="r">${x.n ? pct(x.conv / x.n) : '—'}</td><td class="r">${nf.format(x.orders)}</td><td class="r">${x.ca ? eur.format(x.ca) : '—'}</td></tr>`);
  const hmax = Math.max(...c.hours, 1);
  const k = c.contacts;
  const sess = x => nf.format(x);
  const body = `${admin.BASE}<title>Espace Onaé · Statistiques</title><style>${admin.NAV_CSS}${CSS}</style>
${admin.adminNav('stats', toPrep)}
<main>
  <div class="top"><div><p class="eye">Statistiques · ${esc(perLabel)}</p><h1>Votre boutique, <em>en chiffres</em></h1></div>
  <nav class="per">${PER.map(([k, l]) => `<a class="${k === p ? 'on' : ''}" href="/admin/stats?p=${k}">${l}</a>`).join('')}</nav></div>

  <div class="live" id="live"><span class="dot"></span><b id="lvN">${L.n}</b><span id="lvT">${L.n > 1 ? 'personnes sur le site' : 'personne sur le site'} en ce moment (5 dernières min.)</span>
    <span id="lvC">${L.carts ? '· ' + L.carts + ' avec un panier (' + eur.format(L.cartVal) + ')' : ''}</span>
    <span class="lp" id="lvP">${L.pages.map(([k, n]) => `<i>${esc(k)} · ${n}</i>`).join('')}</span></div>

  <div class="kpi">
    ${K('Chiffre d\'affaires', eur.format(c.ca), delta(c.ca, v.ca), 'vs ' + prevLabel, 1)}
    ${K('Commandes', nf.format(c.orders), delta(c.orders, v.orders), (c.newCust || c.retCust) ? `${c.newCust} nouveau${c.newCust > 1 ? 'x' : ''} client${c.newCust > 1 ? 's' : ''} · ${c.retCust} fidèle${c.retCust > 1 ? 's' : ''}` : 'vs ' + prevLabel, 1)}
    ${K('Panier moyen', c.orders ? eur.format(c.aov) : '—', delta(c.aov, v.aov), c.orders ? `${c.ipo.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} article${c.ipo >= 2 ? 's' : ''} par commande` : '', 1)}
    ${K('Taux de conversion', c.sessions ? pct(c.conv, 2) : '—', delta(c.conv, v.conv), 'visites qui ont commandé', 1)}
    ${K('Visiteurs', sess(c.visitors), delta(c.visitors, v.visitors), ` · ${nf.format(c.newVisitors)} nouveau${c.newVisitors > 1 ? 'x' : ''}`)}
    ${K('Visites', sess(c.sessions), delta(c.sessions, v.sessions), ` · ${c.pps.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} pages / visite`)}
    ${K('Ajouts au panier', nf.format(c.adds), delta(c.adds, v.adds), ` · ${c.sessions ? pct(c.addSessions / c.sessions, 1) : '—'} des visites`)}
    ${K('Paniers abandonnés', nf.format(c.abCarts), delta(c.abCarts, v.abCarts, true), c.abVal ? ` · ${eur.format(c.abVal)} laissés` : '')}
  </div>
  <div class="kpi">
    ${K('Temps moyen par visite', c.sessions ? mmss(c.durAvg) : '—', delta(c.durAvg, v.durAvg), '')}
    ${K('Taux de rebond', c.sessions ? pct(c.bounce, 0) : '—', delta(c.bounce, v.bounce, true), ' · visites d\'une seule page')}
    ${K('CA par visiteur', c.visitors ? eur.format(c.rpv) : '—', delta(c.rpv, v.rpv), '')}
    ${K('Paiements abandonnés', nf.format(c.coAb), delta(c.coAb, v.coAb, true), c.checkouts ? ` · ${pct(c.coAbRate, 0)} des ${c.checkouts} paiements commencés` : '')}
  </div>

  <div class="g2">
    <div class="card"><h3>Visiteurs</h3><p class="sub">${hourly ? 'Heure par heure' : 'Jour par jour'} · ${esc(perLabel.toLowerCase())}</p>${chart(c.series, 'visitors', { hourly, title: 'Visiteurs', sub: s => nf.format(s.pv) + ' pages vues · ' + nf.format(s.adds) + ' ajouts' })}</div>
    <div class="card"><h3>Chiffre d'affaires</h3><p class="sub">${hourly ? 'Heure par heure' : 'Jour par jour'} · commandes payées, hors tests</p>${chart(c.series, 'ca', { hourly, money: true, title: 'Chiffre d\'affaires', sub: s => s.orders + ' commande' + (s.orders > 1 ? 's' : '') })}</div>
  </div>

  <h2>Tunnel de conversion</h2><p class="lead">Combien de visites franchissent chaque étape, du premier clic à la commande. Le pourcentage de droite montre où l'on perd le plus de monde.</p>
  <div class="card"><div class="fn">${funnel}</div></div>

  <h2>Paniers abandonnés</h2><p class="lead">Un panier est abandonné quand la visite se termine (30 min sans activité) avec des articles dedans, sans commande. Un paiement est abandonné quand la page de paiement a été ouverte sans être payée dans les 35 minutes.</p>
  <div class="kpi">
    ${K('Taux d\'abandon panier', c.cartSess ? pct(c.abRate, 0) : '—', delta(c.abRate, v.abRate, true), ` · sur ${nf.format(c.cartSess)} visites avec panier`)}
    ${K('Valeur abandonnée', eur.format(c.abVal), delta(c.abVal, v.abVal, true), ' · paniers abandonnés')}
    ${K('Paiements commencés', nf.format(c.checkouts), delta(c.checkouts, v.checkouts), '')}
    ${K('Paniers ouverts en ce moment', nf.format(c.liveCarts), '', c.liveCartsVal ? eur.format(c.liveCartsVal) + ' en jeu' : '')}
  </div>
  <div class="card" style="margin-bottom:14px"><h3>Paiements abandonnés</h3><p class="sub">À relancer en priorité : l'adresse e-mail apparaît quand la personne était connectée à son compte.</p>${table([['Date'], ['Articles'], ['Montant', 1], ['E-mail'], ['Source'], ['Appareil'], ['Pays']], abCoRows, 'Aucun paiement abandonné sur cette période.')}</div>
  <div class="card"><h3>Paniers abandonnés</h3><p class="sub">Visites terminées avec un panier rempli, sans paiement.</p>${table([['Fin de visite'], ['Articles', 1], ['Valeur', 1], ['Dernière page'], ['Pages vues', 1], ['Source'], ['Appareil']], abCartRows, 'Aucun panier abandonné sur cette période.')}</div>

  <h2>Produits</h2><p class="lead">Les soins les plus regardés, ajoutés et vendus. Le taux d'ajout compare les ajouts au panier au nombre de visites qui ont ouvert la fiche : un taux faible signale une fiche qui attire sans convaincre.</p>
  <div class="card">${table([['Soin'], ['Visites de la fiche', 1], ['Ajouts au panier', 1], ['Taux d\'ajout', 1], ['Vendus', 1], ['CA', 1]], prodRows)}</div>

  <h2>Provenance des visiteurs</h2><p class="lead">D'où viennent vos visites, et lesquelles commandent. Pour suivre précisément une publication, ajoutez à la fin de votre lien <code class="cd">?utm_source=instagram&amp;utm_campaign=lancement</code>.</p>
  <div class="card" style="margin-bottom:14px"><h3>Canaux</h3><p class="sub">Visites, conversion et chiffre d'affaires par canal d'arrivée</p>${table([['Canal'], ['Visites', 1], ['Part', 1], ['Conversion', 1], ['Commandes', 1], ['CA', 1]], chRows)}</div>
  <div class="g2">
    <div class="card"><h3>Sites qui vous envoient du monde</h3><p class="sub">Domaines d'origine</p>${bars(c.refs)}</div>
    <div class="card"><h3>Campagnes</h3><p class="sub">Liens avec utm_campaign</p>${bars(c.campaigns)}</div>
  </div>

  <h2>Pages</h2><p class="lead">Les pages les plus consultées et celles par lesquelles on entre sur le site.</p>
  <div class="g2">
    <div class="card"><h3>Pages les plus vues</h3><p class="sub">Pages vues, visiteurs uniques, temps moyen</p>${table([['Page'], ['Vues', 1], ['Visiteurs', 1], ['Temps', 1]], pageRows)}</div>
    <div class="card"><h3>Pages d'entrée</h3><p class="sub">Première page de chaque visite</p>${bars(c.landing)}</div>
  </div>

  <h2>Audience</h2><p class="lead">Qui sont vos visiteurs et quand ils viennent.</p>
  <div class="g3">
    <div class="card"><h3>Appareils</h3><p class="sub">Visites</p>${bars(c.devices)}</div>
    <div class="card"><h3>Systèmes</h3><p class="sub">Visites</p>${bars(c.os)}</div>
    <div class="card"><h3>Navigateurs</h3><p class="sub">Visites</p>${bars(c.browsers)}</div>
  </div>
  <div class="g2" style="margin-top:14px">
    <div class="card"><h3>Pays des visiteurs</h3><p class="sub">D'après le fuseau horaire et la langue du navigateur</p>${bars(c.countries)}</div>
    <div class="card"><h3>Heures de visite</h3><p class="sub">Pages vues selon l'heure de Paris</p><div class="hrs">${c.hours.map((n, h) => `<i style="height:${Math.max(2, n / hmax * 100).toFixed(0)}%" data-tip="${h} h – ${h + 1} h · ${nf.format(n)} pages vues"></i>`).join('')}</div><div class="hrl">${c.hours.map((n, h) => `<span>${h % 3 ? '' : h}</span>`).join('')}</div>
      <h3 style="margin-top:26px">Commandes par pays</h3><p class="sub">Adresse de livraison</p>${bars(c.ordCountries, { unit: 'commandes' })}</div>
  </div>

  <h2>Contacts & fidélité</h2><p class="lead">Ce que la période a rapporté en contacts à recontacter.</p>
  <div class="kpi">
    ${K('Inscriptions newsletter', nf.format(k.newsletter), '', '')}
    ${K('Membres Onaé Privilège', nf.format(k.privilege), '', ' nouveaux')}
    ${K('Comptes créés', nf.format(k.accounts), '', '')}
    ${K('Codes −10 % utilisés', nf.format(k.codesUsed) + ' <span style="font-size:18px;color:#a3959b">/ ' + nf.format(k.codes) + '</span>', '', k.codes ? ' · ' + pct(k.codesUsed / k.codes, 0) + ' des codes distribués' : '')}
  </div>
  <div class="kpi">
    ${K('Remises accordées', eur.format(c.disc), '', '')}
    ${K('Livraison facturée', eur.format(c.ship), '', '')}
    ${K('Profondeur de lecture', c.sessions ? Math.round(c.depth) + ' %' : '—', '', ' · part de la page parcourue')}
    ${K('Pages vues', nf.format(c.pageviews), delta(c.pageviews, v.pageviews), '')}
  </div>

  <div class="note"><b>Comment ces chiffres sont mesurés.</b> Mesure d'audience interne à Onaé, sans outil tiers ni cookie publicitaire : aucune adresse IP n'est enregistrée, les robots et vos propres visites (navigateur connecté à l'espace administrateur) sont exclus, les données sont effacées après 13 mois. Le chiffre d'affaires et les commandes viennent des paiements Stripe confirmés (hors commandes de test et annulées). Les comparaisons portent sur ${esc(prevLabel)}. Calculé le ${esc(when(D.at))}.
  <br><button class="btn ghost" type="button" id="nostat">Ne jamais compter les visites de ce navigateur</button></div>
</main>
<div id="tip"></div>
<script>
(function(){
  var tip=document.getElementById('tip');
  document.addEventListener('mousemove',function(e){var el=e.target.closest&&e.target.closest('[data-tip]');if(!el){tip.style.opacity=0;return;}tip.textContent=el.getAttribute('data-tip');tip.style.opacity=1;var x=e.clientX+14,y=e.clientY+14;if(x+tip.offsetWidth>innerWidth-10)x=e.clientX-tip.offsetWidth-14;if(y+tip.offsetHeight>innerHeight-10)y=e.clientY-tip.offsetHeight-14;tip.style.left=x+'px';tip.style.top=y+'px';});
  var b=document.getElementById('nostat');try{if(localStorage.getItem('onae_nostat')==='1'){b.textContent='✓ Ce navigateur est exclu des statistiques';b.disabled=true;}}catch(_){}
  b.onclick=function(){try{localStorage.setItem('onae_nostat','1');}catch(_){}b.textContent='✓ Ce navigateur est exclu des statistiques';b.disabled=true;};
  var eur=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'});
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  setInterval(function(){fetch('/api/admin/stats/live',{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.json();}).then(function(L){
    document.getElementById('lvN').textContent=L.n;document.getElementById('lvT').textContent=(L.n>1?'personnes sur le site':'personne sur le site')+' en ce moment (5 dernières min.)';
    document.getElementById('lvC').textContent=L.carts?'· '+L.carts+' avec un panier ('+eur.format(L.cartVal)+')':'';
    document.getElementById('lvP').innerHTML=L.pages.map(function(p){return '<i>'+esc(p[0])+' · '+p[1]+'</i>';}).join('');
  }).catch(function(){});},20000);
})();
</script>`;
  return body;
}

function route(req, res, urlPath, admin, toPrep){
  if (urlPath === '/api/ev' && req.method === 'POST') { ingest(req, res, admin.isAdmin(req)); return true; }
  if (urlPath !== '/admin/stats' && urlPath !== '/api/admin/stats/live') return false;
  if (!admin.isAdmin(req)) { res.writeHead(303, { Location: '/admin', 'Cache-Control': 'no-store' }); res.end(); return true; }
  if (urlPath === '/api/admin/stats/live') { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(liveNow())); return true; }
  const p = new URL(req.url, 'http://x').searchParams.get('p') || '7';
  let html;
  try { html = page(admin, ['today', 'yesterday', '7', '30', '90', '365'].includes(p) ? p : '7', typeof toPrep === 'function' ? toPrep() : 0); }
  catch (e) { console.error('[stats] page', e); res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Erreur de calcul des statistiques : ' + e.message); return true; }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }); res.end(html);
  return true;
}

module.exports = { route, checkout, report, _compute: compute, _channel: channel, _flush: flush };
