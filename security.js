/* Onaé — utilitaires de sécurité côté serveur (jamais servi au public).
   clientIp : adresse réelle de la visiteuse. Railway réécrit X-Real-IP à son entrée (une visiteuse ne peut pas
   la falsifier) ; X-Forwarded-For peut contenir des valeurs ajoutées par la visiteuse, il n'est jamais utilisé.
   limiter  : compteur de tentatives par clé sur une fenêtre glissante (anti force brute / anti abus).
   csvCell  : cellule CSV neutralisée (=, +, -, @ en tête → formules Excel désactivées). */
'use strict';
function clientIp(req) {
  const real = String(req.headers['x-real-ip'] || '').trim();
  if (real) return real;
  return String(req.socket && req.socket.remoteAddress || '');   // hors Railway : adresse de connexion (X-Forwarded-For est falsifiable)
}
function limiter(max, windowMs) {
  const m = new Map();
  const sweep = () => { const now = Date.now(); for (const [k, v] of m) { const f = v.filter(t => now - t < windowMs); if (f.length) m.set(k, f); else m.delete(k); } };
  setInterval(sweep, Math.min(windowMs, 10 * 60e3)).unref();
  return {
    blocked(key) { const now = Date.now(); const a = (m.get(key) || []).filter(t => now - t < windowMs); m.set(key, a); return a.length >= max; },
    hit(key) { const a = m.get(key) || []; a.push(Date.now()); m.set(key, a); },
    /* compte puis indique si la limite est dépassée */
    take(key) { this.hit(key); return (m.get(key) || []).filter(t => Date.now() - t < windowMs).length > max; },
    reset(key) { m.delete(key); },
  };
}
function csvCell(x) {
  let s = String(x ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
module.exports = { clientIp, limiter, csvCell };
