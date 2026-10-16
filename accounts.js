// ---------- Comptes clients Onaé : inscription (e-mail ou téléphone), connexion, profil ----------
// Stockage JSON dans DATA_DIR (volume Railway monté sur /data).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = function createAccounts(DATA_DIR, readMembers, writeMembers){
  const ACC_FILE = path.join(DATA_DIR, 'accounts.json');
  const SES_FILE = path.join(DATA_DIR, 'sessions.json');
  const ORD_FILE = path.join(DATA_DIR, 'orders.json');
  const COOKIE = 'onae_sid';
  const SESSION_DAYS = 30;

  const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch(_) { return d; } };
  const write = (f, v) => { fs.mkdirSync(DATA_DIR, { recursive: true }); const tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(v, null, 2)); fs.renameSync(tmp, f); };

  // ---- helpers ----
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const normEmail = v => String(v || '').trim().toLowerCase();
  function normPhone(v){
    let p = String(v || '').replace(/[\s.\-()]/g, '');
    if (/^0[1-9]\d{8}$/.test(p)) p = '+33' + p.slice(1);
    else if (/^0033[1-9]\d{8}$/.test(p)) p = '+' + p.slice(2);
    return /^\+[1-9]\d{7,14}$/.test(p) ? p : '';
  }
  const clean = (v, n) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, n);
  function hashPw(pw, salt = crypto.randomBytes(16).toString('hex')){
    return salt + ':' + crypto.scryptSync(String(pw), salt, 64).toString('hex');
  }
  function checkPw(pw, stored){
    const [salt, h] = String(stored || '').split(':'); if (!salt || !h) return false;
    const a = Buffer.from(h, 'hex'), b = crypto.scryptSync(String(pw), salt, 64);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  function parseCookies(req){
    const out = {}; String(req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
    return out;
  }
  const isHttps = req => String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  function setCookie(req, res, token, maxAge){
    res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}` + (isHttps(req) ? '; Secure' : ''));
  }
  const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
  function body(req, cb, max = 16384){
    let b = ''; req.on('data', c => { b += c; if (b.length > max) req.destroy(); });
    req.on('end', () => { try { cb(JSON.parse(b || '{}')); } catch(_) { cb(null); } });
  }

  // brute-force guard: 8 tentatives / 15 min par IP + identifiant
  const attempts = new Map();
  function limited(key){
    const now = Date.now(), a = (attempts.get(key) || []).filter(t => now - t < 15 * 60e3);
    attempts.set(key, a); return a.length >= 8;
  }
  const note = key => { const a = attempts.get(key) || []; a.push(Date.now()); attempts.set(key, a); };
  const ip = req => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

  // ---- sessions ----
  function newSession(req, res, uid){
    const token = crypto.randomBytes(32).toString('hex');
    const s = read(SES_FILE, {}); const now = Date.now();
    for (const k of Object.keys(s)) if (s[k].exp < now) delete s[k];
    s[crypto.createHash('sha256').update(token).digest('hex')] = { uid, exp: now + SESSION_DAYS * 864e5 };
    write(SES_FILE, s); setCookie(req, res, token, SESSION_DAYS * 86400);
  }
  function currentUser(req){
    const token = parseCookies(req)[COOKIE]; if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const s = read(SES_FILE, {})[crypto.createHash('sha256').update(token).digest('hex')];
    if (!s || s.exp < Date.now()) return null;
    return read(ACC_FILE, []).find(u => u.id === s.uid) || null;
  }

  // ---- profil public (sans mot de passe) + fidélité + commandes ----
  const TIERS = [{ name: 'Rose', min: 0, rate: 1 }, { name: 'Nacre', min: 200, rate: 1.25 }, { name: 'Écrin', min: 500, rate: 1.5 }];
  function view(u){
    const { pw, ...pub } = u;
    const orders = read(ORD_FILE, []).filter(o => o.uid === u.id || (u.email && o.email === u.email)).sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const m = u.email ? readMembers().find(x => x.email === u.email) : null;
    let loyalty = null;
    if (m) {
      const yearAgo = Date.now() - 365 * 864e5;
      const spent = orders.filter(o => Date.parse(o.at) > yearAgo && o.status !== 'annulée').reduce((t, o) => t + (Number(o.subtotal) || 0), 0);
      let ti = 0; TIERS.forEach((t, i) => { if (spent >= t.min) ti = i; });
      const next = TIERS[ti + 1] || null;
      loyalty = { points: m.points || 0, tier: TIERS[ti].name, rate: TIERS[ti].rate, spent12m: Math.round(spent * 100) / 100,
        next: next ? { name: next.name, min: next.min, left: Math.max(0, Math.round((next.min - spent) * 100) / 100) } : null,
        since: m.at, birthday: m.birthday || '', history: m.history || [{ label: 'Bienvenue dans Onaé Privilège', points: 50, at: m.at }] };
    }
    return { ...pub, orders, loyalty };
  }

  // ---- routes ----
  function register(req, res){
    if (limited('reg:' + ip(req))) return send(res, 429, { error: 'too_many' });
    body(req, d => {
      if (!d) return send(res, 400, { error: 'invalid_json' });
      note('reg:' + ip(req));
      const method = d.method === 'phone' ? 'phone' : 'email';
      const email = normEmail(d.email), phone = normPhone(d.phone);
      if (method === 'email' && (!EMAIL_RE.test(email) || email.length > 254)) return send(res, 400, { error: 'invalid_email' });
      if (method === 'phone' && !phone) return send(res, 400, { error: 'invalid_phone' });
      const firstName = clean(d.firstName, 40);
      if (!firstName) return send(res, 400, { error: 'first_name_required' });
      const pw = String(d.password || '');
      if (pw.length < 8 || pw.length > 128 || !/[A-Za-zÀ-ÿ]/.test(pw) || !/\d/.test(pw)) return send(res, 400, { error: 'weak_password' });
      if (d.terms !== true) return send(res, 400, { error: 'terms_required' });
      const users = read(ACC_FILE, []);
      if (method === 'email' && users.some(u => u.email === email)) return send(res, 409, { error: 'email_taken' });
      if (method === 'phone' && users.some(u => u.phone === phone)) return send(res, 409, { error: 'phone_taken' });
      const u = { id: crypto.randomUUID(), email: method === 'email' ? email : '', phone: method === 'phone' ? phone : '',
        firstName, lastName: clean(d.lastName, 60), birthday: '', pw: hashPw(pw), createdAt: new Date().toISOString(),
        addresses: [], skin: { type: '', concerns: [] }, prefs: { newsletter: d.newsletter === true, sms: false } };
      users.push(u);
      try { write(ACC_FILE, users); } catch(e) { console.error('accounts write failed', e); return send(res, 500, { error: 'storage' }); }
      newSession(req, res, u.id);
      send(res, 201, { ok: true, user: view(u) });
    });
  }

  function login(req, res){
    body(req, d => {
      if (!d) return send(res, 400, { error: 'invalid_json' });
      const raw = String(d.id || '').trim();
      const key = 'login:' + ip(req) + ':' + raw.toLowerCase();
      if (limited(key)) return send(res, 429, { error: 'too_many' });
      const users = read(ACC_FILE, []);
      const email = normEmail(raw), phone = normPhone(raw);
      const u = users.find(x => (x.email && x.email === email) || (phone && x.phone === phone));
      if (!u || !checkPw(d.password, u.pw)) { note(key); return send(res, 401, { error: 'bad_credentials' }); }
      attempts.delete(key);
      newSession(req, res, u.id);
      send(res, 200, { ok: true, user: view(u) });
    });
  }

  function logout(req, res){
    const token = parseCookies(req)[COOKIE];
    if (token) { const s = read(SES_FILE, {}); delete s[crypto.createHash('sha256').update(token).digest('hex')]; try { write(SES_FILE, s); } catch(_) {} }
    setCookie(req, res, '', 0); send(res, 200, { ok: true });
  }

  function me(req, res){
    const u = currentUser(req); if (!u) return send(res, 401, { error: 'not_logged_in' });
    send(res, 200, { user: view(u) });
  }

  function update(req, res){
    const cur = currentUser(req); if (!cur) return send(res, 401, { error: 'not_logged_in' });
    body(req, d => {
      if (!d) return send(res, 400, { error: 'invalid_json' });
      const users = read(ACC_FILE, []); const u = users.find(x => x.id === cur.id);
      if ('firstName' in d) { const v = clean(d.firstName, 40); if (!v) return send(res, 400, { error: 'first_name_required' }); u.firstName = v; }
      if ('lastName' in d) u.lastName = clean(d.lastName, 60);
      if ('birthday' in d) { const b = String(d.birthday || ''); if (b && !/^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])$/.test(b)) return send(res, 400, { error: 'invalid_birthday' }); u.birthday = b; }
      if ('email' in d) {
        const e = normEmail(d.email);
        if (e && !EMAIL_RE.test(e)) return send(res, 400, { error: 'invalid_email' });
        if (!e && !u.phone) return send(res, 400, { error: 'contact_required' });
        if (e && users.some(x => x.id !== u.id && x.email === e)) return send(res, 409, { error: 'email_taken' });
        u.email = e;
      }
      if ('phone' in d) {
        const raw = String(d.phone || '').trim(), p = normPhone(raw);
        if (raw && !p) return send(res, 400, { error: 'invalid_phone' });
        if (!p && !u.email) return send(res, 400, { error: 'contact_required' });
        if (p && users.some(x => x.id !== u.id && x.phone === p)) return send(res, 409, { error: 'phone_taken' });
        u.phone = p;
      }
      if (d.skin && typeof d.skin === 'object') {
        const types = ['', 'sèche', 'normale', 'mixte', 'grasse', 'sensible'];
        const okC = ['rides', 'éclat', 'taches', 'imperfections', 'hydratation', 'cernes', 'fermeté', 'sensibilité', 'cheveux'];
        u.skin = { type: types.includes(d.skin.type) ? d.skin.type : '', concerns: (Array.isArray(d.skin.concerns) ? d.skin.concerns : []).filter(c => okC.includes(c)).slice(0, 6) };
      }
      if (d.prefs && typeof d.prefs === 'object') u.prefs = { newsletter: d.prefs.newsletter === true, sms: d.prefs.sms === true };
      if (Array.isArray(d.addresses)) {
        u.addresses = d.addresses.slice(0, 6).map(a => ({ id: /^[a-z0-9-]{6,40}$/.test(a.id || '') ? a.id : crypto.randomUUID(), label: clean(a.label, 30) || 'Domicile',
          name: clean(a.name, 80), line1: clean(a.line1, 120), line2: clean(a.line2, 120), zip: clean(a.zip, 10), city: clean(a.city, 60),
          country: 'France', phone: clean(a.phone, 20), isDefault: a.isDefault === true })).filter(a => a.name && a.line1 && /^\d{5}$/.test(a.zip) && a.city);
        if (u.addresses.length && !u.addresses.some(a => a.isDefault)) u.addresses[0].isDefault = true;
      }
      try { write(ACC_FILE, users); } catch(e) { return send(res, 500, { error: 'storage' }); }
      send(res, 200, { ok: true, user: view(u) });
    });
  }

  function password(req, res){
    const cur = currentUser(req); if (!cur) return send(res, 401, { error: 'not_logged_in' });
    body(req, d => {
      if (!d) return send(res, 400, { error: 'invalid_json' });
      const key = 'pw:' + cur.id; if (limited(key)) return send(res, 429, { error: 'too_many' });
      const users = read(ACC_FILE, []); const u = users.find(x => x.id === cur.id);
      if (!checkPw(d.current, u.pw)) { note(key); return send(res, 401, { error: 'bad_password' }); }
      const pw = String(d.next || '');
      if (pw.length < 8 || pw.length > 128 || !/[A-Za-zÀ-ÿ]/.test(pw) || !/\d/.test(pw)) return send(res, 400, { error: 'weak_password' });
      u.pw = hashPw(pw); write(ACC_FILE, users); send(res, 200, { ok: true });
    });
  }

  function joinLoyalty(req, res){
    const u = currentUser(req); if (!u) return send(res, 401, { error: 'not_logged_in' });
    if (!u.email) return send(res, 400, { error: 'email_required' });
    const members = readMembers();
    if (!members.some(m => m.email === u.email)) {
      members.push({ email: u.email, name: u.firstName, birthday: u.birthday || '', points: 50, tier: 'Rose', source: 'espace-client', at: new Date().toISOString() });
      try { writeMembers(members); } catch(e) { return send(res, 500, { error: 'storage' }); }
    }
    send(res, 200, { ok: true, user: view(u) });
  }

  function remove(req, res){
    const cur = currentUser(req); if (!cur) return send(res, 401, { error: 'not_logged_in' });
    body(req, d => {
      const users = read(ACC_FILE, []); const u = users.find(x => x.id === cur.id);
      if (!d || !checkPw(d.password, u.pw)) return send(res, 401, { error: 'bad_password' });
      write(ACC_FILE, users.filter(x => x.id !== u.id));
      const s = read(SES_FILE, {}); for (const k of Object.keys(s)) if (s[k].uid === u.id) delete s[k]; write(SES_FILE, s);
      setCookie(req, res, '', 0); send(res, 200, { ok: true });
    });
  }

  // renvoie true si la requête a été prise en charge
  return function route(req, res, urlPath){
    const M = req.method;
    if (urlPath === '/api/auth/register' && M === 'POST') { register(req, res); return true; }
    if (urlPath === '/api/auth/login' && M === 'POST') { login(req, res); return true; }
    if (urlPath === '/api/auth/logout' && M === 'POST') { logout(req, res); return true; }
    if (urlPath === '/api/me' && M === 'GET') { me(req, res); return true; }
    if (urlPath === '/api/me' && M === 'PATCH') { update(req, res); return true; }
    if (urlPath === '/api/me/password' && M === 'POST') { password(req, res); return true; }
    if (urlPath === '/api/me/loyalty' && M === 'POST') { joinLoyalty(req, res); return true; }
    if (urlPath === '/api/me/delete' && M === 'POST') { remove(req, res); return true; }
    return false;
  };
};
