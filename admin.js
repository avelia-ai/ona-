/* Onaé — espace administrateur : https://www.onaecosmetics.fr/admin
   Connexion avec la clé NEWSLETTER_KEY (variable Railway) saisie dans un formulaire : plus besoin de la mettre dans l'adresse.
   Un cookie sécurisé garde la session 30 jours sur ce navigateur. Les exports et la modération des avis l'acceptent aussi. */
const crypto = require('crypto');

/* la clé telle que définie sur Railway, débarrassée des espaces / guillemets copiés par erreur */
function secret(){
  return String(process.env.NEWSLETTER_KEY || '').trim().replace(/^["']+|["']+$/g, '').trim();
}
function token(){ const s = secret(); return s ? crypto.createHash('sha256').update('onae-admin|' + s).digest('hex').slice(0, 48) : ''; }
function cookie(req, name){ const m = String(req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(name + '=')); return m ? decodeURIComponent(m.slice(name.length + 1)) : ''; }
function same(a, b){ a = Buffer.from(String(a)); b = Buffer.from(String(b)); return a.length === b.length && crypto.timingSafeEqual(a, b); }
function keyMatches(k){ const s = secret(); return !!s && k != null && same(String(k).trim(), s); }
function isAdmin(req){ const t = token(); return !!t && same(cookie(req, 'onae_admin'), t); }
/* accès autorisé : clé dans l'adresse (?key=) OU session ouverte via /admin */
function allowed(req, key){ return keyMatches(key) || isAdmin(req); }

const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BASE = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
<style>
:root{--berry:#8e2a47;--rose:#c9556e;--ink:#1c1418;--mid:#6b5d63;--line:#efe3e6;--bg:#fbf6f7}
*{box-sizing:border-box}body{margin:0;font:15px/1.6 'DM Sans',system-ui,sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased}
.logo{font-family:'DM Serif Display',Georgia,serif;font-size:26px;letter-spacing:.18em}
.logo .m{position:relative;display:inline-block;letter-spacing:0;line-height:1}.logo .m::before{content:"";position:absolute;left:10%;right:10%;top:-.08em;height:.07em;background:currentColor}
h1,h2{font-family:'DM Serif Display',Georgia,serif;font-weight:400;margin:0}
a{color:inherit}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 22px;border:0;border-radius:999px;background:var(--ink);color:#fff;font:600 13px 'DM Sans',sans-serif;letter-spacing:.06em;text-decoration:none;cursor:pointer;transition:background .25s,transform .25s}
.btn:hover{background:var(--berry);transform:translateY(-1px)}.btn.ghost{background:#fff;color:var(--ink);border:1px solid var(--line)}.btn.ghost:hover{background:#fff;border-color:var(--rose);color:var(--berry)}
</style>`;

function loginPage(msg){
  return BASE + `<title>Espace Onaé · Connexion</title>
<style>
body{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(70% 60% at 50% 0%,#f6dfe5 0%,rgba(246,223,229,0) 70%),var(--bg)}
.card{width:min(420px,100%);padding:44px 36px 36px;border-radius:26px;background:#fff;box-shadow:0 40px 80px -40px rgba(90,25,50,.35),0 0 0 1px var(--line);text-align:center}
.card h1{font-size:30px;margin:22px 0 6px}.card p{margin:0 0 26px;color:var(--mid);font-size:14px}
label{display:block;text-align:left;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--mid);margin-bottom:8px}
.f{position:relative}input{width:100%;padding:15px 48px 15px 16px;border:1px solid var(--line);border-radius:14px;font:15px 'DM Sans',sans-serif;background:#fffdfd;outline:none;transition:border .2s,box-shadow .2s}
input:focus{border-color:var(--rose);box-shadow:0 0 0 4px rgba(201,85,110,.12)}
.eye{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:36px;height:36px;border:0;background:none;cursor:pointer;color:var(--mid);border-radius:10px}
.btn{width:100%;margin-top:18px;padding:15px}
.err{margin:0 0 18px;padding:12px 14px;border-radius:12px;background:#fdecef;color:var(--berry);font-size:13.5px;text-align:left}
small{display:block;margin-top:20px;color:#a3959b;font-size:12px;line-height:1.5}
</style>
<form class="card" method="post" action="/admin/login" autocomplete="on">
  <div class="logo">ONA<span class="m">E</span></div>
  <h1>Espace administrateur</h1>
  <p>Inscrits au concours, exports et avis clients.</p>
  ${msg ? `<div class="err">${msg}</div>` : ''}
  <label for="k">Clé d'accès</label>
  <div class="f"><input id="k" name="key" type="password" required autofocus autocomplete="current-password" placeholder="Votre clé NEWSLETTER_KEY">
  <button class="eye" type="button" aria-label="Afficher la clé" onclick="var i=document.getElementById('k');i.type=i.type==='password'?'text':'password'">👁</button></div>
  <button class="btn" type="submit">Se connecter</button>
  <small>Votre navigateur reste connecté 30 jours.<br>La clé est celle de la variable NEWSLETTER_KEY sur Railway.</small>
</form>`;
}

function dashboard(entries, stats, reviews, names){
  reviews = (reviews || []).slice().sort((a, b) => String(b.at).localeCompare(String(a.at))); names = names || {};
  const pend = reviews.filter(r => r.status === 'en_attente').length;
  const ST = { en_attente: 'En attente', publie: 'Publié', refuse: 'Refusé' };
  const rvRows = reviews.map(r => `<div class="rv ${esc(r.status)}" data-id="${esc(r.id)}"><div class="rv-h"><span class="rv-st">${ST[r.status] || esc(r.status)}</span><span class="rv-p">${esc(names[r.productId] || r.productId)}</span><span class="rv-d">${esc(new Date(r.at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' }))}</span></div><div class="rv-s">${'★'.repeat(r.rating)}<i>${'★'.repeat(5 - r.rating)}</i></div>${r.title ? `<b class="rv-t">${esc(r.title)}</b>` : ''}<p>${esc(r.text)}</p>${(r.photos || []).length ? '<div class="rv-ph">' + r.photos.map(f => `<a href="/api/reviews/photo/${esc(f)}" target="_blank"><img src="/api/reviews/photo/${esc(f)}" alt=""></a>`).join('') + '</div>' : ''}<div class="rv-f"><span>${esc(r.name)} · ${esc(r.email)}${r.skin ? ' · peau ' + esc(String(r.skin).toLowerCase()) : ''}${r.verified ? ' · ✓ achat vérifié' : ''}</span><span class="rv-b"><button data-s="publie">Publier</button><button data-s="refuse">Refuser</button></span></div></div>`).join('');
  const list = entries.slice().reverse(), nl = list.filter(m => m.newsletter).length;
  const today = new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
  const todayN = list.filter(m => new Date(m.at).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }) === today).length;
  const src = {}; list.forEach(m => { const s = m.source || 'site'; src[s] = (src[s] || 0) + 1; });
  const rows = list.map((m, i) => `<tr><td class="n">${list.length - i}</td><td>${esc(new Date(m.at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' }))}</td><td><b>${esc(m.firstName)} ${esc(m.lastName)}</b></td><td><a href="mailto:${esc(m.email)}">${esc(m.email)}</a></td><td>${m.newsletter ? '<span class="y">Oui</span>' : '<span class="no">Non</span>'}</td><td>${esc(m.source || '')}</td></tr>`).join('');
  const exp = (href, t, d) => `<a class="x" href="${href}"><b>${t}</b><span>${d}</span></a>`;
  return BASE + `<title>Espace Onaé · Concours</title>
<style>
header{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px max(20px,calc((100% - 1200px)/2));background:rgba(255,255,255,.92);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
header nav{display:flex;gap:10px;align-items:center}
main{width:min(1200px,100% - 40px);margin:40px auto 80px}
.eye{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#a3959b;margin:0 0 10px}
h1{font-size:clamp(32px,4vw,46px);line-height:1.05}h1 em{color:var(--rose)}
.kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin:32px 0}
.kpi div{padding:22px 22px 20px;border-radius:20px;background:#fff;box-shadow:0 0 0 1px var(--line)}
.kpi div:first-child{background:linear-gradient(140deg,#2a1820,#4a1f2f);color:#fff;box-shadow:0 24px 50px -24px rgba(90,25,50,.6)}
.kpi b{display:block;font-family:'DM Serif Display',serif;font-weight:400;font-size:44px;line-height:1}
.kpi span{display:block;margin-top:8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.7}
.bar{display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin:8px 0 16px}
.search{flex:1;min-width:220px;max-width:380px;padding:12px 16px;border:1px solid var(--line);border-radius:999px;font:14px 'DM Sans',sans-serif;background:#fff;outline:none}
.search:focus{border-color:var(--rose)}
.tw{overflow-x:auto;border-radius:20px;background:#fff;box-shadow:0 0 0 1px var(--line)}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:13px 16px;border-bottom:1px solid var(--line);white-space:nowrap}
th{position:sticky;top:0;background:#fff;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#a3959b;font-weight:500}
tr:last-child td{border-bottom:0}tbody tr:hover{background:#fdf7f8}td.n{color:#a3959b}
td a{color:var(--ink);text-decoration:none}td a:hover{color:var(--berry)}
.y{padding:3px 10px;border-radius:999px;background:#fbe9ee;color:var(--berry);font-size:12px;font-weight:600}.no{color:#bbb;font-size:12px}
h2{font-size:26px;margin:48px 0 16px}
.xs{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.x{display:block;padding:18px 20px;border-radius:18px;background:#fff;box-shadow:0 0 0 1px var(--line);text-decoration:none;transition:box-shadow .25s,transform .25s}
.x:hover{transform:translateY(-2px);box-shadow:0 0 0 1px var(--rose),0 16px 30px -18px rgba(90,25,50,.4)}
.x b{display:block;font-weight:600}.x span{font-size:13px;color:var(--mid)}
.empty{padding:40px;text-align:center;color:var(--mid)}
.rvs{display:grid;gap:14px}
.rv{padding:20px 22px;border-radius:20px;background:#fff;box-shadow:0 0 0 1px var(--line)}
.rv.en_attente{box-shadow:0 0 0 1.5px var(--rose),0 18px 34px -24px rgba(90,25,50,.5)}.rv.refuse{opacity:.55}
.rv-h{display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:13px;color:var(--mid)}
.rv-st{padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;background:#f1ecee;color:var(--mid)}
.rv.en_attente .rv-st{background:var(--rose);color:#fff}.rv.publie .rv-st{background:#e3f4ea;color:#2a7a4b}
.rv-p{font-weight:600;color:var(--ink)}.rv-d{margin-left:auto}
.rv-s{margin-top:10px;color:var(--rose);font-size:18px;letter-spacing:2px}.rv-s i{font-style:normal;color:#e6dde0}
.rv-t{display:block;margin-top:6px;font-family:'DM Serif Display',serif;font-weight:400;font-size:19px}.rv p{margin:6px 0 0;color:#3d3236}
.rv-ph{display:flex;gap:8px;margin-top:12px}.rv-ph img{width:84px;height:84px;object-fit:cover;border-radius:12px}
.rv-f{display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-top:14px;font-size:13px;color:var(--mid)}
.rv-b{display:flex;gap:8px}.rv-b button{padding:10px 18px;border-radius:999px;border:1px solid var(--line);background:#fff;font:600 13px 'DM Sans',sans-serif;cursor:pointer;transition:all .2s}
.rv-b button[data-s=publie]{background:#2a7a4b;border-color:#2a7a4b;color:#fff}.rv-b button:hover{transform:translateY(-1px)}
.rv.publie .rv-b button[data-s=publie],.rv.refuse .rv-b button[data-s=refuse]{display:none}
h2 small{font-family:'DM Sans',sans-serif;font-size:14px;color:var(--mid);margin-left:10px}

@media(max-width:760px){.kpi{grid-template-columns:1fr 1fr}header .logo{font-size:20px}}
</style>
<header><div class="logo">ONA<span class="m">E</span></div><nav><a class="btn ghost" href="/" target="_blank">Voir le site</a><a class="btn ghost" href="/admin/logout">Se déconnecter</a></nav></header>
<main>
  <p class="eye">Jeu-concours · tirage au sort le 6 novembre 2026</p>
  <h1>Les inscrites <em>au concours</em></h1>
  <div class="kpi">
    <div><b>${list.length}</b><span>Participations</span></div>
    <div><b>${todayN}</b><span>Aujourd'hui</span></div>
    <div><b>${nl}</b><span>Inscrites newsletter</span></div>
    <div><b>${list.length ? Math.round(nl / list.length * 100) : 0} %</b><span>Taux d'opt-in</span></div>
  </div>
  <div class="bar"><input class="search" id="q" type="search" placeholder="Rechercher un nom ou un e-mail…"><a class="btn" href="/api/concours/export">Télécharger en Excel (CSV)</a></div>
  <div class="tw"><table><thead><tr><th>#</th><th>Date</th><th>Nom</th><th>E-mail</th><th>Newsletter</th><th>Source</th></tr></thead><tbody id="tb">${rows || '<tr><td colspan="6" class="empty">Aucune participation pour le moment.</td></tr>'}</tbody></table></div>
  <h2 id="avis">Avis clients <small>${pend} en attente · ${reviews.length} au total</small></h2>
  <div class="rvs">${rvRows || '<div class="empty tw">Aucun avis reçu pour le moment.</div>'}</div>
  <h2>Autres données</h2>
  <div class="xs">
    ${exp('/api/newsletter/export', 'Newsletter', 'Fichier des inscrits (CSV)')}
    ${exp('/api/contact/export', 'Messages de contact', 'Fichier des demandes (CSV)')}
    ${exp('/api/partner/export', 'Partenariats', 'Demandes presse et influence (CSV)')}
    ${exp('/api/loyalty/export', 'Fidélité', 'Membres Onaé Privilège (CSV)')}
  </div>
</main>
<script>
document.addEventListener('click',async function(e){var b=e.target.closest('.rv-b button');if(!b)return;var c=b.closest('.rv');b.disabled=true;try{var r=await fetch('/api/reviews/moderate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:c.dataset.id,status:b.dataset.s})});if(r.ok){c.className='rv '+b.dataset.s;c.querySelector('.rv-st').textContent=b.dataset.s==='publie'?'Publié':'Refusé'}else alert('Échec, réessayez.')}catch(_){}b.disabled=false});
document.getElementById('q').addEventListener('input',function(){var v=this.value.toLowerCase();document.querySelectorAll('#tb tr').forEach(function(r){r.style.display=r.textContent.toLowerCase().indexOf(v)>-1?'':'none'})});
</script>`;
}

const hits = new Map();
/* routes /admin, /admin/login, /admin/logout ; renvoie true si traité */
function route(req, res, urlPath, data){
  if (urlPath !== '/admin' && urlPath !== '/admin/login' && urlPath !== '/admin/logout') return false;
  const html = (code, body, extra) => { res.writeHead(code, Object.assign({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }, extra || {})); res.end(body); };
  if (urlPath === '/admin/logout'){ html(303, '', { 'Set-Cookie': 'onae_admin=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure', Location: '/admin' }); return true; }
  if (urlPath === '/admin/login' && req.method === 'POST'){
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(), now = Date.now();
    const h = (hits.get(ip) || []).filter(t => now - t < 15 * 60e3);
    if (h.length >= 8){ html(429, loginPage('Trop de tentatives. Réessayez dans quelques minutes.')); return true; }
    let body = ''; req.on('data', c => { body += c; if (body.length > 2000) req.destroy(); });
    req.on('end', () => {
      const key = new URLSearchParams(body).get('key');
      if (!secret()) return html(503, loginPage("La variable <b>NEWSLETTER_KEY</b> n'existe pas encore sur Railway (service onae-boutique → Variables). Ajoutez-la, attendez le redéploiement, puis réessayez."));
      if (!keyMatches(key)){ h.push(now); hits.set(ip, h); return setTimeout(() => html(401, loginPage('Clé incorrecte. Vérifiez la valeur de NEWSLETTER_KEY sur Railway (majuscules, espaces).')), 500); }
      html(303, '', { 'Set-Cookie': 'onae_admin=' + token() + '; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure', Location: '/admin' });
    });
    return true;
  }
  if (!isAdmin(req)){ html(200, loginPage(!secret() ? "La variable <b>NEWSLETTER_KEY</b> n'existe pas encore sur Railway (service onae-boutique → Variables). Ajoutez-la, attendez le redéploiement, puis connectez-vous ici." : '')); return true; }
  html(200, dashboard(data.entries(), data.stats ? data.stats() : {}, data.reviews ? data.reviews() : [], data.names ? data.names() : {}));
  return true;
}

module.exports = { route, allowed, isAdmin, keyMatches, secret };
