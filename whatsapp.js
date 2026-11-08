/* ═══════════ ONAÉ — LÉA, ASSISTANTE BEAUTÉ SUR WHATSAPP ═══════════
   Une conseillère qui écrit comme une amie experte (et dit qu'elle est une IA : AI Act, art. 50).
   - Inscription avec consentement explicite (horodaté, texte conservé) : POST /api/wa/optin
   - Suivi du panier : POST /api/wa/cart        - Désinscription : « STOP » sur WhatsApp ou POST /api/wa/optout
   - Relances : panier oublié (1 h puis 24 h), après achat (conseils J+3, résultats J+21), réassort (selon contenance)
     → uniquement de 9 h à 21 h (heure de Paris), 1 message marketing max par 20 h, jamais après STOP
   - Réponses en direct par IA (API Anthropic, ANTHROPIC_API_KEY) ; sinon réponse d'attente + alerte dans l'admin
   - Webhook Meta : GET/POST /api/wa/webhook (signature X-Hub-Signature-256 vérifiée si WA_APP_SECRET)
   Variables : WA_TOKEN, WA_PHONE_ID (envoi réel), WA_NUMBER (numéro public, ex. 33612345678), WA_VERIFY_TOKEN,
   WA_APP_SECRET, WA_MODEL (facultatif). Sans WA_TOKEN/WA_PHONE_ID → MODE RÉPÉTITION : rien n'est envoyé,
   chaque message est enregistré dans whatsapp.json (visible dans /admin).                                    */
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const SITE = 'https://www.onaecosmetics.fr';
const H = 3600e3, D = 24 * H;
const CONSENT_TEXT = "J'accepte que Léa, l'assistante beauté d'Onaé, m'envoie sur WhatsApp des rappels de panier, des conseils et des offres. Désinscription à tout moment en répondant STOP.";

/* Modèles de messages (texte identique à soumettre à Meta, catégorie MARKETING, langue fr) */
const TEMPLATES = {
  onae_bienvenue: { vars: ['prénom'], text: "Bonjour {{1}} ✨ C'est Léa, l'assistante beauté d'Onaé. Je suis une IA, mais une IA qui adore parler soin 🌸 Je garde un œil sur votre panier et je réponds à toutes vos questions, ici, quand vous voulez. Pour ne plus recevoir mes messages, répondez STOP." },
  onae_panier_1:  { vars: ['prénom', 'soin', 'lien'], text: "{{1}}, votre {{2}} vous attend toujours 🤍 Si vous hésitez, dites-moi tout : votre type de peau, ce qui vous préoccupe… Je vous dirai franchement si c'est le bon soin pour vous. Votre panier : {{3}}" },
  onae_panier_2:  { vars: ['prénom', 'soin', 'lien'], text: "Un dernier petit mot avant que votre panier ne s'envole, {{1}} ✨ {{2}} vous attend encore, avec la livraison offerte dès 59 € et une bombe de bain glissée dans chaque colis. Je vous le garde ici : {{3}}" },
  onae_conseils:  { vars: ['prénom', 'soin', 'conseil'], text: "{{1}}, votre colis Onaé est bien arrivé ? 🌸 Mon conseil pour bien commencer avec {{2}} : {{3}} Une question sur l'ordre d'application ou la texture ? Écrivez-moi, je suis là." },
  onae_resultats: { vars: ['prénom', 'soin'], text: "Trois semaines déjà avec {{2}}, {{1}} ✨ Comment se sent votre peau ? Racontez-moi : si besoin, je vous aide à ajuster votre routine." },
  onae_reassort:  { vars: ['prénom', 'soin', 'lien'], text: "{{1}}, votre {{2}} doit bientôt arriver à sa fin 🤍 Pour ne pas interrompre votre rituel, il vous attend ici : {{3}}" },
};

module.exports = function (DATA_DIR, ROOT) {
  const FILE = path.join(DATA_DIR, 'whatsapp.json');
  const read = () => { try { const d = JSON.parse(fs.readFileSync(FILE, 'utf8')); d.contacts ||= []; d.outbox ||= []; return d; } catch (_) { return { contacts: [], outbox: [] }; } };
  const write = d => { fs.mkdirSync(DATA_DIR, { recursive: true }); d.outbox = d.outbox.slice(-500); fs.writeFileSync(FILE, JSON.stringify(d, null, 1)); };
  const live = () => !!(process.env.WA_TOKEN && process.env.WA_PHONE_ID);
  const number = () => String(process.env.WA_NUMBER || '').replace(/\D/g, '');

  /* ---------- catalogue ---------- */
  let cat = { m: 0, list: [] };
  const products = () => { const f = path.join(ROOT, 'products.json'); try { const m = fs.statSync(f).mtimeMs; if (m !== cat.m) cat = { m, list: (JSON.parse(fs.readFileSync(f, 'utf8')).products || []).filter(p => p.category !== 'cadeau') }; } catch (_) {} return cat.list; };
  const prod = id => products().find(p => p.id === String(id).split('--')[0]);
  const pname = p => [p.name, p.name_line2].filter(Boolean).join(' ');
  const price = p => { const b = (p.bundles || []).find(x => x.id === 'solo' && x.price_raw > 0) || (p.bundles || []).find(x => x.price_raw > 0); return b ? b.price : ''; };
  const refillDays = p => { const v = String(p.volume || ''); const n = parseFloat(v); if (/paire/.test(v)) return 24; if (!n) return 0; if (n <= 15) return 50; if (n <= 30) return 45; if (n <= 50) return 60; return 55; };

  /* ---------- utilitaires ---------- */
  const normPhone = (raw, cc) => {
    let s = String(raw || '').replace(/[^\d+]/g, '');
    if (s.startsWith('00')) s = '+' + s.slice(2);
    if (!s.startsWith('+')) { const c = String(cc || '33').replace(/\D/g, ''); s = '+' + c + s.replace(/^0/, ''); }
    return /^\+(33|32|41|352|377)\d{6,10}$/.test(s) ? s : '';
  };
  const mask = p => p ? p.slice(0, -4).replace(/\d(?=\d{2})/g, '•') + p.slice(-4) : '';
  const first = n => { n = String(n || '').trim().split(/\s+/)[0] || ''; return n ? n.charAt(0).toUpperCase() + n.slice(1) : ''; };
  const parisHour = () => +new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', hour12: false, timeZone: 'Europe/Paris' }).format(new Date());
  const quiet = () => { const h = parisHour(); return h < 9 || h >= 21; };
  const fill = (tpl, vals) => TEMPLATES[tpl].text.replace(/\{\{(\d)\}\}/g, (_, i) => vals[i - 1] || '');
  const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
  const body = (req, max = 8000) => new Promise((ok, ko) => { let b = ''; req.on('data', c => { b += c; if (b.length > max) { req.destroy(); ko(new Error('too_big')); } }); req.on('end', () => ok(b)); req.on('error', ko); });
  const hits = new Map();
  const limited = (req, n = 8) => { const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(), now = Date.now(); const h = (hits.get(ip) || []).filter(t => now - t < H); h.push(now); hits.set(ip, h); return h.length > n; };

  /* ---------- envoi (réel ou répétition) ---------- */
  function graph(payload) {
    return new Promise(resolve => {
      const b = JSON.stringify(payload);
      const r = https.request({ hostname: 'graph.facebook.com', path: `/v21.0/${process.env.WA_PHONE_ID}/messages`, method: 'POST', timeout: 20000,
        headers: { Authorization: 'Bearer ' + process.env.WA_TOKEN, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, res => {
        let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ ok: res.statusCode < 300, status: res.statusCode, body: d.slice(0, 300) }));
      });
      r.on('error', e => resolve({ ok: false, status: 0, body: e.message })); r.on('timeout', () => r.destroy()); r.end(b);
    });
  }
  async function send(d, c, { text, tpl, vals, kind }) {
    const inWindow = c.lastInAt && Date.now() - Date.parse(c.lastInAt) < 23.5 * H;
    const shown = tpl ? fill(tpl, vals) : text;
    let result = { ok: true, status: 'simulation' };
    if (live()) {
      const to = c.phone.replace('+', '');
      result = (tpl && !inWindow)
        ? await graph({ messaging_product: 'whatsapp', to, type: 'template', template: { name: tpl, language: { code: 'fr' }, components: [{ type: 'body', parameters: vals.map(v => ({ type: 'text', text: String(v).slice(0, 900) })) }] } })
        : await graph({ messaging_product: 'whatsapp', to, type: 'text', text: { body: shown, preview_url: true } });
    }
    const m = { dir: 'out', at: new Date().toISOString(), text: shown, kind: kind || 'reply', tpl: tpl || '', status: result.ok ? (live() ? 'envoyé' : 'simulation') : 'échec ' + result.status };
    (c.msgs ||= []).push(m); c.msgs = c.msgs.slice(-60);
    d.outbox.push({ to: mask(c.phone), name: c.name, ...m });
    if (!result.ok) console.log('[whatsapp] échec envoi', result.status, result.body);
    return result.ok;
  }

  /* ---------- IA : la voix de Léa ---------- */
  function catalogBrief() {
    return products().map(p => `- ${pname(p)} (${p.gamme_label || p.gamme || ''}${p.volume ? ', ' + p.volume : ''}, ${price(p)}) : ${String(p.subtitle || '').slice(0, 140)} → ${SITE}/produits/${p.id}`).join('\n');
  }
  function systemPrompt(c) {
    const cart = (c.cart || []).map(l => { const p = prod(l.id); return p ? `${pname(p)} ×${l.qty}` : ''; }).filter(Boolean).join(', ');
    const orders = (c.orders || []).map(o => `${o.at.slice(0, 10)} : ${(o.items || []).map(i => { const p = prod(i); return p ? pname(p) : i; }).join(', ')}`).join(' ; ');
    return `Tu es Léa, l'assistante beauté d'Onaé (marque française de soins naturels aux peptides pour la peau et les cheveux, ${SITE}). Tu écris sur WhatsApp à une cliente, en français, comme une amie experte en soin : chaleureuse, complice, élégante, jamais vendeuse agressive.

Style : messages courts (2 à 5 phrases, comme sur WhatsApp), vouvoiement, au plus un ou deux émojis délicats (✨ 🌸 🤍), pas de listes à puces sauf pour une routine. Pose une question à la fois pour comprendre sa peau, ses cheveux, ses envies. Donne des conseils concrets (ordre d'application, fréquence, associations). Recommande au plus deux soins à la fois, avec leur lien.

Règles impératives :
- Tu es une intelligence artificielle : si on te le demande, dis-le clairement et simplement. Ne prétends jamais être une personne.
- Ne recommande que des soins de la liste ci-dessous, avec le prix exact indiqué. N'invente aucun prix, aucune promotion, aucun code, aucun délai.
- Pas d'allégation médicale : pas de « soigne », « guérit », « cliniquement prouvé », pas de « sans X ». Pour un problème de peau sérieux, une grossesse ou une allergie, conseille l'avis d'un médecin ou d'un pharmacien.
- Commande, livraison, retour, remboursement, problème de colis : tu ne peux pas agir sur les commandes. Montre de l'empathie, demande le numéro de commande, et indique que l'équipe Onaé répond par e-mail à contact@onaecosmetics.fr. Commence alors ta réponse par [HUMAIN].
- Si la cliente veut arrêter les messages, dis-lui qu'il suffit d'écrire STOP.
- Infos utiles : livraison en France, Belgique, Suisse, Luxembourg et Monaco, 4,90 € et offerte dès 59 € ; expédition sous 24 h ouvrées ; une bombe de bain offerte dans chaque commande ; retours 14 jours (produits non ouverts) ; programme fidélité Onaé Privilège (1 € = 1 éclat, 50 éclats offerts à l'inscription) ; paiement carte, Apple Pay, Google Pay, Bancontact.

Cliente : ${c.name || 'prénom inconnu'}${cart ? `\nPanier en cours : ${cart} (lien : ${SITE}/panier.html)` : ''}${orders ? `\nCommandes passées : ${orders}` : ''}

Soins Onaé :
${catalogBrief()}`;
  }
  function claude(c) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return Promise.resolve(null);
    const hist = (c.msgs || []).filter(m => m.text).slice(-20).map(m => ({ role: m.dir === 'in' ? 'user' : 'assistant', content: m.text }));
    while (hist.length && hist[0].role !== 'user') hist.shift();
    const merged = []; for (const m of hist) { const l = merged[merged.length - 1]; if (l && l.role === m.role) l.content += '\n' + m.content; else merged.push({ ...m }); }
    if (!merged.length) return Promise.resolve(null);
    const b = JSON.stringify({ model: process.env.WA_MODEL || 'claude-sonnet-5-5', max_tokens: 600, system: systemPrompt(c), messages: merged });
    return new Promise(resolve => {
      const r = https.request({ hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST', timeout: 45000,
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-length': Buffer.byteLength(b) } }, res => {
        let d = ''; res.on('data', x => d += x);
        res.on('end', () => { try { const j = JSON.parse(d); resolve((j.content || []).filter(x => x.type === 'text').map(x => x.text).join('\n').trim() || null); } catch (_) { resolve(null); } });
      });
      r.on('error', () => resolve(null)); r.on('timeout', () => r.destroy()); r.end(b);
    });
  }

  /* ---------- messages entrants ---------- */
  const STOP = /^\s*(stop|arr[eê]t|arreter|arrêter|désinscri|desinscri|unsubscribe)\b/i, START = /^\s*(start|reprendre)\b/i;
  async function incoming(phone, name, text) {
    const d = read();
    let c = d.contacts.find(x => x.phone === phone);
    if (!c) { c = { id: crypto.randomBytes(8).toString('hex'), phone, name: first(name), source: 'whatsapp-entrant', consentAt: null, at: new Date().toISOString(), cart: [], msgs: [], orders: [] }; d.contacts.push(c); }
    c.lastInAt = new Date().toISOString();
    (c.msgs ||= []).push({ dir: 'in', at: c.lastInAt, text: String(text).slice(0, 2000) });
    if (STOP.test(text)) {
      c.optout = c.lastInAt;
      await send(d, c, { text: "C'est noté 🤍 Vous ne recevrez plus de messages de ma part. Si l'envie vous revient, écrivez simplement START.", kind: 'stop' });
      return write(d);
    }
    if (START.test(text)) {
      c.optout = null; c.consentAt = c.lastInAt; c.consentText = CONSENT_TEXT + ' (réinscription par message START)';
      await send(d, c, { text: `Avec plaisir${c.name ? ', ' + c.name : ''} ✨ Je suis de retour. Dites-moi ce dont votre peau a besoin aujourd'hui.`, kind: 'start' });
      return write(d);
    }
    write(d);
    let reply = await claude(c);
    const d2 = read(); const c2 = d2.contacts.find(x => x.phone === phone) || c;
    if (!reply) { reply = `Merci pour votre message${c2.name ? ', ' + c2.name : ''} 🌸 Je reviens vers vous très vite. Pour une question sur une commande, l'équipe vous répond aussi à contact@onaecosmetics.fr.`; c2.needsHuman = true; }
    if (reply.startsWith('[HUMAIN]')) { reply = reply.replace('[HUMAIN]', '').trim(); c2.needsHuman = true; }
    await send(d2, c2, { text: reply, kind: 'reply' });
    write(d2);
  }

  /* ---------- planificateur ---------- */
  const cartLabel = cart => { const ps = (cart || []).map(l => prod(l.id)).filter(Boolean); if (!ps.length) return ''; return ps.length === 1 ? pname(ps[0]) : `${pname(ps[0])} (et ${ps.length - 1} autre${ps.length > 2 ? 's' : ''} soin${ps.length > 2 ? 's' : ''})`; };
  async function tick() {
    if (quiet()) return;
    const d = read(), now = Date.now(); let changed = false;
    for (const c of d.contacts) {
      if (!c.consentAt || c.optout) continue;
      if (c.welcomePending) { delete c.welcomePending; changed = await send(d, c, { tpl: 'onae_bienvenue', vals: [c.name || 'Bonjour'], kind: 'bienvenue' }) || changed; continue; }
      const lastMk = Math.max(0, ...(c.msgs || []).filter(m => m.dir === 'out' && m.tpl).map(m => Date.parse(m.at)));
      if (now - lastMk < 20 * H) continue;                                  // jamais plus d'un message marketing par 20 h
      const lastOrder = (c.orders || []).slice(-1)[0];
      const name = c.name || 'Bonjour';
      // 1) panier oublié
      if ((c.cart || []).length && c.cartAt && (!lastOrder || Date.parse(lastOrder.at) < Date.parse(c.cartAt))) {
        const age = now - Date.parse(c.cartAt), n = (c.nudges ||= {}), key = c.cartSeq || 1;
        if (age > H && n.c1 !== key && age < 3 * D) { n.c1 = key; changed = await send(d, c, { tpl: 'onae_panier_1', vals: [name, cartLabel(c.cart), SITE + '/panier.html'], kind: 'panier-1h' }) || changed; continue; }
        if (age > D && n.c1 === key && n.c2 !== key && age < 4 * D) { n.c2 = key; changed = await send(d, c, { tpl: 'onae_panier_2', vals: [name, cartLabel(c.cart), SITE + '/panier.html'], kind: 'panier-24h' }) || changed; continue; }
      }
      // 2) après achat
      if (lastOrder) {
        const age = now - Date.parse(lastOrder.at), f = (lastOrder.flags ||= {});
        const p = (lastOrder.items || []).map(prod).find(Boolean);
        if (!p) continue;
        if (age > 3 * D && !f.tips && age < 10 * D) {
          const h0 = Array.isArray(p.how_to_use) ? p.how_to_use.find(x => x && x.desc) : null; const tip = h0 ? (h0.desc.charAt(0).toLowerCase() + h0.desc.slice(1)).trim().replace(/\.?$/, '.') : 'appliquez-le sur une peau propre, matin et soir, en légers mouvements.';
          f.tips = 1; changed = await send(d, c, { tpl: 'onae_conseils', vals: [name, pname(p), tip.slice(0, 300)], kind: 'conseils-J3' }) || changed; continue;
        }
        if (age > 21 * D && !f.results && age < 30 * D) { f.results = 1; changed = await send(d, c, { tpl: 'onae_resultats', vals: [name, pname(p)], kind: 'resultats-J21' }) || changed; continue; }
        const rd = refillDays(p);
        if (rd && age > rd * D && !f.refill && age < (rd + 20) * D) { f.refill = 1; changed = await send(d, c, { tpl: 'onae_reassort', vals: [name, pname(p), `${SITE}/produits/${p.id}`], kind: 'reassort' }) || changed; continue; }
      }
    }
    if (changed) write(d);
  }
  setInterval(() => tick().catch(e => console.error('[whatsapp] tick', e)), 5 * 60e3).unref();

  /* ---------- commande payée (appelé par le webhook Stripe) ---------- */
  function onOrder(session) {
    try {
      const md = session.metadata || {}; if (!/^[a-f0-9]{16}$/.test(md.wa_id || '')) return;
      const d = read(), c = d.contacts.find(x => x.id === md.wa_id); if (!c) return;
      if ((c.orders || []).some(o => o.session === session.id)) return;
      (c.orders ||= []).push({ at: new Date().toISOString(), session: session.id, items: String(md.wa_items || '').split(',').filter(Boolean), total: (session.amount_total || 0) / 100 });
      c.cart = []; c.cartAt = null;
      write(d);
    } catch (e) { console.error('[whatsapp] onOrder', e); }
  }
  function attachOrderBySession(c, sessionId) {
    try {
      const orders = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'orders.json'), 'utf8'));
      const o = orders.find(x => x.stripe_session_id === sessionId); if (!o || (c.orders || []).some(x => x.session === sessionId)) return;
      const ids = (o.items || []).map(i => { const p = products().find(p => i.name && i.name.startsWith(pname(p))); return p ? p.id : ''; }).filter(Boolean);
      (c.orders ||= []).push({ at: o.created_at || o.date || new Date().toISOString(), session: sessionId, items: ids, total: o.total || 0 });
    } catch (_) {}
  }

  /* ---------- tableau de bord ---------- */
  function summary() {
    const d = read();
    return { live: live(), number: number(), ai: !!process.env.ANTHROPIC_API_KEY,
      inscrites: d.contacts.filter(c => c.consentAt && !c.optout).length, desinscrites: d.contacts.filter(c => c.optout).length,
      paniers: d.contacts.filter(c => c.consentAt && !c.optout && (c.cart || []).length).length,
      humain: d.contacts.filter(c => c.needsHuman).map(c => ({ name: c.name, phone: mask(c.phone), last: (c.msgs || []).filter(m => m.dir === 'in').slice(-1)[0] })),
      conversations: d.contacts.filter(c => (c.msgs || []).length).sort((a, b) => Date.parse(b.msgs.slice(-1)[0].at) - Date.parse(a.msgs.slice(-1)[0].at)).slice(0, 12)
        .map(c => ({ name: c.name, phone: mask(c.phone), optout: !!c.optout, msgs: c.msgs.slice(-8) })),
      outbox: d.outbox.slice(-25).reverse(), templates: TEMPLATES };
  }

  /* ---------- routes ---------- */
  async function route(req, res, urlPath) {
    if (!urlPath.startsWith('/api/wa/')) return false;
    try {
      if (urlPath === '/api/wa/config' && req.method === 'GET') { json(res, 200, { enabled: live() && !!number(), preview: process.env.PRELAUNCH === '1', number: number(), consent: CONSENT_TEXT }); return true; }

      if (urlPath === '/api/wa/optin' && req.method === 'POST') {
        if (limited(req)) { json(res, 429, { error: 'too_many' }); return true; }
        const q = JSON.parse(await body(req) || '{}');
        if (q.consent !== true) { json(res, 400, { error: 'consent_required' }); return true; }
        const phone = normPhone(q.phone, q.cc); if (!phone) { json(res, 400, { error: 'invalid_phone' }); return true; }
        const d = read(); let c = d.contacts.find(x => x.phone === phone), isNew = !c;
        if (!c) { c = { id: crypto.randomBytes(8).toString('hex'), phone, at: new Date().toISOString(), msgs: [], orders: [] }; d.contacts.push(c); }
        const wasOptedIn = c.consentAt && !c.optout;
        c.name = first(q.name) || c.name || ''; c.consentAt = new Date().toISOString(); c.consentText = CONSENT_TEXT; c.optout = null;
        c.source = String(q.source || 'site').replace(/[^a-z-]/g, '').slice(0, 30);
        if (Array.isArray(q.cart)) { c.cart = q.cart.filter(l => l && prod(l.id)).slice(0, 20).map(l => ({ id: String(l.id).slice(0, 80), qty: Math.min(9, Math.max(1, l.qty | 0)) })); c.cartAt = c.cart.length ? new Date().toISOString() : null; c.cartSeq = (c.cartSeq || 0) + 1; }
        if (q.session && /^cs_[A-Za-z0-9_]+$/.test(q.session)) attachOrderBySession(c, q.session);
        if (!wasOptedIn && !quiet()) await send(d, c, { tpl: 'onae_bienvenue', vals: [c.name || 'Bonjour'], kind: 'bienvenue' });
        else if (!wasOptedIn) c.welcomePending = true;
        write(d);
        json(res, 200, { ok: true, id: c.id, phone: mask(phone), name: c.name, isNew }); return true;
      }

      if (urlPath === '/api/wa/cart' && req.method === 'POST') {
        const q = JSON.parse(await body(req) || '{}');
        const d = read(), c = d.contacts.find(x => x.id === q.id && /^[a-f0-9]{16}$/.test(q.id || ''));
        if (!c) { json(res, 404, { error: 'unknown' }); return true; }
        const cart = (Array.isArray(q.cart) ? q.cart : []).filter(l => l && prod(l.id)).slice(0, 20).map(l => ({ id: String(l.id).slice(0, 80), qty: Math.min(9, Math.max(1, l.qty | 0)) }));
        const sig = JSON.stringify(cart);
        if (sig !== JSON.stringify(c.cart || [])) { c.cart = cart; c.cartAt = cart.length ? new Date().toISOString() : null; if (cart.length) c.cartSeq = (c.cartSeq || 0) + 1; write(d); }
        json(res, 200, { ok: true, optedIn: !!(c.consentAt && !c.optout), phone: mask(c.phone), name: c.name }); return true;
      }

      if (urlPath === '/api/wa/optout' && req.method === 'POST') {
        const q = JSON.parse(await body(req) || '{}'); const d = read(), c = d.contacts.find(x => x.id === q.id);
        if (c) { c.optout = new Date().toISOString(); write(d); }
        json(res, 200, { ok: true }); return true;
      }

      if (urlPath === '/api/wa/webhook') {
        const u = new URL(req.url, 'http://x');
        if (req.method === 'GET') {
          const ok = u.searchParams.get('hub.mode') === 'subscribe' && process.env.WA_VERIFY_TOKEN && u.searchParams.get('hub.verify_token') === process.env.WA_VERIFY_TOKEN;
          res.writeHead(ok ? 200 : 403, { 'Content-Type': 'text/plain' }); res.end(ok ? u.searchParams.get('hub.challenge') : 'forbidden'); return true;
        }
        if (req.method === 'POST') {
          const raw = await body(req, 200000);
          if (process.env.WA_APP_SECRET) {
            const sig = String(req.headers['x-hub-signature-256'] || ''), exp = 'sha256=' + crypto.createHmac('sha256', process.env.WA_APP_SECRET).update(raw).digest('hex');
            if (sig.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) { res.writeHead(401); res.end(); return true; }
          }
          res.writeHead(200); res.end('ok');                                  // Meta attend une réponse rapide
          let j; try { j = JSON.parse(raw); } catch (_) { return true; }
          for (const e of j.entry || []) for (const ch of e.changes || []) {
            const v = ch.value || {}, names = Object.fromEntries((v.contacts || []).map(x => [x.wa_id, x.profile && x.profile.name]));
            for (const m of v.messages || []) {
              const text = m.type === 'text' ? m.text.body : m.type === 'button' ? m.button.text : m.type === 'interactive' ? JSON.stringify(m.interactive).slice(0, 200) : `[${m.type}]`;
              incoming('+' + m.from, names[m.from], text).catch(err => console.error('[whatsapp] entrant', err));
            }
          }
          return true;
        }
      }

      /* simulation d'un message entrant (admin uniquement) : tester Léa sans compte Meta */
      if (urlPath === '/api/wa/simulate' && req.method === 'POST') {
        const admin = require('./admin');
        if (!admin.isAdmin(req)) { json(res, 403, { error: 'admin' }); return true; }
        const q = JSON.parse(await body(req) || '{}'); const phone = normPhone(q.phone, '33'); if (!phone || !q.text) { json(res, 400, { error: 'phone_text' }); return true; }
        await incoming(phone, q.name || '', String(q.text));
        const c = read().contacts.find(x => x.phone === phone);
        json(res, 200, { ok: true, reply: (c.msgs || []).filter(m => m.dir === 'out').slice(-1)[0] }); return true;
      }
      if (urlPath === '/api/wa/tick' && req.method === 'POST') {
        const admin = require('./admin'); if (!admin.isAdmin(req)) { json(res, 403, { error: 'admin' }); return true; }
        await tick(); json(res, 200, { ok: true }); return true;
      }
    } catch (e) { console.error('[whatsapp]', e); if (!res.headersSent) json(res, 400, { error: 'bad_request' }); return true; }
    json(res, 404, { error: 'not_found' }); return true;
  }

  return { route, onOrder, summary, tick, TEMPLATES, CONSENT_TEXT, _incoming: incoming, _read: read, _write: write };
};
