/* Onaé — commandes : lecture/écriture, transporteurs et liens de suivi, visuels des articles, mise à jour par l'admin.
   Fichier privé (jamais servi au public). Données : <DATA_DIR>/orders.json */
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'orders.json');
const ROOT = __dirname;

const STATUSES = ['Confirmée', 'Préparée', 'Expédiée', 'Livrée', 'Annulée'];

/* transporteurs : lien de suivi construit à partir du numéro */
const CARRIERS = {
  'Colissimo':    n => 'https://www.laposte.fr/outils/suivre-vos-envois?code=' + n,
  'La Poste':     n => 'https://www.laposte.fr/outils/suivre-vos-envois?code=' + n,
  'Chronopost':   n => 'https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=' + n,
  'Mondial Relay':n => 'https://www.mondialrelay.fr/suivi-de-colis/?NumeroExpedition=' + n,
  'DPD':          n => 'https://trace.dpd.fr/fr/trace/' + n,
  'GLS':          n => 'https://gls-group.com/FR/fr/suivi-colis?match=' + n,
  'Colis Privé':  n => 'https://www.colisprive.com/moncolis/pages/detailColis.aspx?numColis=' + n,
  'UPS':          n => 'https://www.ups.com/track?loc=fr_FR&tracknum=' + n,
  'DHL':          n => 'https://www.dhl.com/fr-fr/home/suivi.html?tracking-id=' + n,
  'Autre':        null,
};
function trackUrl(carrier, number, custom){
  const n = encodeURIComponent(String(number || '').trim());
  if (custom && /^https:\/\/[^\s"<>]+$/.test(custom)) return custom;
  const f = CARRIERS[carrier];
  return f && n ? f(n) : '';
}

function read(){ try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (_) { return []; } }
function write(list){ fs.mkdirSync(path.dirname(FILE), { recursive: true }); const tmp = FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(list, null, 2)); fs.renameSync(tmp, FILE); }

/* retrouve le soin d'une ligne de commande (id enregistré, sinon par le nom) pour afficher son visuel */
let CAT = null, CAT_AT = 0;
function catalog(){
  if (CAT && Date.now() - CAT_AT < 60e3) return CAT;
  try { const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'products.json'), 'utf8')); CAT = Array.isArray(d) ? d : (d.products || []); } catch (_) { CAT = []; }
  CAT_AT = Date.now(); return CAT;
}
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
function productOf(item){
  const C = catalog();
  if (item.id) { const p = C.find(x => x.id === String(item.id).split('--')[0]); if (p) return p; }
  const n = norm(item.name);
  if (!n) return null;
  return C.find(p => norm([p.name, p.name_line2].filter(Boolean).join(' ')) === n)
      || C.find(p => (p.bundles || []).some(b => b.name && norm(b.name) === n))
      || (/routine sur mesure/.test(n) ? null : C.find(p => n.startsWith(norm(p.name)) && norm(p.name).length > 12))
      || null;
}
function itemImage(item){
  if (item.gift) return '/cart-bombe-bain-menthe-eucalyptus.jpg';
  if (/routine sur mesure/i.test(item.name || '')) return '/checkout-routine.jpg';
  const p = productOf(item);
  if (!p) return '';
  const own = item.bundle && item.bundle !== 'solo' ? `checkout-${p.id}--${item.bundle}.jpg` : `checkout-${p.id}.jpg`;
  for (const f of [own, `checkout-${p.id}.jpg`, `cart-${p.id}.jpg`]) if (fs.existsSync(path.join(ROOT, f))) return '/' + f;
  return '';
}

/* vue d'une commande pour la cliente (pas d'identifiants Stripe ni de note interne) */
function forClient(o){
  return {
    number: o.number, at: o.at, status: o.status || 'Confirmée', history: o.history || {},
    carrier: o.carrier || '', trackingNumber: o.trackingNumber || '', tracking: o.tracking || '', shippedAt: o.shippedAt || '',
    city: o.city || '', name: o.name || '', address: o.address || null,
    items: (o.items || []).map(i => ({ id: i.id || ((productOf(i) || {}).id) || '', name: i.name, qty: i.qty || 1, price: i.price || 0, gift: !!i.gift, img: itemImage(i) })),
    subtotal: o.subtotal || 0, shipping: o.shipping || 0, discount: o.discount || 0, total: o.total || 0,
  };
}

/* mise à jour par l'admin : statut, transporteur, numéro de suivi, note interne */
function update(number, patch){
  const list = read();
  const o = list.find(x => String(x.number) === String(number));
  if (!o) return { error: 'not_found' };
  const now = new Date().toISOString();
  const before = { status: o.status || 'Confirmée', trackingNumber: o.trackingNumber || '' };
  if (patch.carrier != null) o.carrier = Object.prototype.hasOwnProperty.call(CARRIERS, patch.carrier) ? patch.carrier : '';
  if (patch.trackingNumber != null) o.trackingNumber = String(patch.trackingNumber).replace(/[^\w\- ]/g, '').trim().slice(0, 40);
  if (patch.trackingUrl != null) o.trackingCustom = /^https:\/\/[^\s"<>]+$/.test(String(patch.trackingUrl).trim()) ? String(patch.trackingUrl).trim().slice(0, 300) : '';
  o.tracking = trackUrl(o.carrier, o.trackingNumber, o.trackingCustom);
  if (patch.note != null) o.note = String(patch.note).slice(0, 1000);
  if (patch.test != null) o.test = !!patch.test;
  let status = patch.status != null && STATUSES.includes(patch.status) ? patch.status : o.status || 'Confirmée';
  if ((patch.status == null || patch.status === before.status) && o.trackingNumber && !before.trackingNumber && ['Confirmée', 'Préparée'].includes(status)) status = 'Expédiée';   // un numéro de suivi ajouté = colis expédié
  if (status !== o.status) {
    o.status = status; o.history = o.history || {};
    const order = ['Confirmée', 'Préparée', 'Expédiée', 'Livrée'], k = order.indexOf(status);
    for (let i = 0; i <= k; i++) if (!o.history[order[i]]) o.history[order[i]] = now;   // étapes intermédiaires remplies
    if (status === 'Annulée') o.history['Annulée'] = now;
    if (status === 'Expédiée' && !o.shippedAt) o.shippedAt = now;
  }
  o.updatedAt = now;
  write(list);
  return { order: o, shipped: (status === 'Expédiée' && (before.status !== 'Expédiée' || (!before.trackingNumber && o.trackingNumber))) };
}

module.exports = { read, write, update, forClient, itemImage, productOf, trackUrl, CARRIERS, STATUSES, FILE };
