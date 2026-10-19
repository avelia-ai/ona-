# Onaé — boutique en ligne (contexte de reprise)

Fondateur : Guillaume (Avelia AI). Travaille en français. Attente constante : rendu **haut de gamme, premium, « effet waouh »**, montrer visuellement (captures ordinateur + mobile) après chaque livraison.

## Hébergement & déploiement
- Repo GitHub `avelia-ai/ona-` — **chaque push sur `main` déploie automatiquement** sur Railway.
- Railway : projet `onae-boutique` (id `e14a04c1-c9ab-4da1-91f9-00ef2610867c`), service `onae-boutique` (id `efedf70a-8f1a-4e05-9235-87c3f13d5504`), env production.
- URL Railway : https://onae-boutique-production.up.railway.app
- **Domaine : https://www.onaecosmetics.fr** (IONOS). `www` = CNAME `2bw5ubi7.up.railway.app` (vérifié, certificat Railway valide). Racine `onaecosmetics.fr` = redirection IONOS 301 → `https://www.onaecosmetics.fr`, certificat SSL Starter Wildcard IONOS (expire 04/12/2026, vérifier renouvellement). Bascule faite le 19/10/2026 (avant : Shopify). Ne jamais toucher aux enregistrements mail (MX, SPF, DKIM, DMARC, autodiscover). E-mail : contact@onaecosmetics.fr.
- Volume Railway `onae-data` monté sur `/data`, variable `DATA_DIR=/data` (données persistantes JSON).
- Variables à ajouter (pas encore faites) : `ANTHROPIC_API_KEY` (analyse photo du diagnostic IA ; sans elle → bascule automatique sur le diagnostic guidé), `NEWSLETTER_KEY` (exports CSV `/api/*/export?key=`). Optionnel `DIAG_MODEL`.

## Architecture
- Site statique HTML/CSS/JS + `server.js` (Node, sans dépendances) qui sert les fichiers et les API.
- `products.json` = source de vérité du catalogue (grilles générées dynamiquement). Champs clés : `id`, `gamme` (`e·boost`/`o·care`/`hydraline`/`o·répare`), `gamme_label`, `badge` (`Bestseller`, `Nouveau`…), `bestseller_rank`, `bestseller:true` (force l'affichage en bestsellers), `category` (`visage` par défaut, `yeux`, `cheveux`, `box`), `image`, `gallery`, `proof`, `ingredients_full`, `bundles`, `box_items`.
- Produits de démo à exclure des vraies listes : `serum-eclat-peptides`, `creme-reparatrice-intense`, `essence-hydratante-pro`, `huile-nuit-reparatrice`.
- Images : JPG redimensionnés max 1400 px qualité 86 ; miniature panier `cart-<id>.jpg` 560×700. Galerie : nouvelle image principale = en premier partout.
- `cart.js` (panier, `data-add-to-cart`, `OnaeCart.addWithFeedback`), `onae-menu.js` (menu mobile premium à onglets + recherche ; version en cache `?v=N` à incrémenter dans toutes les pages à chaque modif).
- Gabarit de nouvelle page : head + CSS racine de `fidelite.html` jusqu'à `/* ═══════════ ONAÉ PRIVILÈGE`, + bloc header/menu de `<!-- HEADER -->` jusqu'à la fin du script `onae-menu`, puis CSS/HTML propres, `footer-simple`, `cart.js`, `onae-menu.js`.
- Modules serveur : `accounts.js` (comptes e-mail/téléphone, sessions cookie `onae_sid`, profil, fidélité Rose/Nacre/Écrin, diagnostics enregistrés `/api/me/diagnostics`), `diagnostic.js` (`/api/diagnostic` analyse photo via API Anthropic, photos jamais stockées, résultats dans `diagnostics.json`, `/api/diagnostic/:id`).
- Autres API : `/api/contact`, `/api/partner`, `/api/track` (suivi commande via `orders.json`), `/api/newsletter`, `/api/loyalty`.

## Pages existantes
Accueil (carrousel de bannières auto), soins-visage/yeux/cheveux, nos-gammes + gamme-boost/care/hydraline/repare (textes = bienfaits physiques ET émotionnels, peau ET cheveux, jamais centrés sur un produit/ingrédient), nouveautes, box (Les Box), product (fiche), routine, panier, compte + mon-compte (espace client), fidelite, diagnostic (IA), nos-ingredients (peptides = actif signature), notre-histoire, nos-engagements, presse-partenariats, contact, faq, livraison-retours, suivi-commande, blog + 6 articles.

## Tests en local
`(DATA_DIR=<scratch>/tdata PORT=4321 nohup node server.js >srv.log 2>&1 &)` ; ne jamais faire `pkill -f "node server.js"` (tue le shell). Captures Playwright avec chromium `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, `NODE_PATH=$(npm root -g)`.

## Règles de contenu
- Allégations prudentes : pas de « cliniquement prouvé », pas de chiffres d'efficacité sans tests, pas d'allégations « sans X » (encadrées en UE), pas de faux avis. Signaler les erreurs des visuels (ex. « COSMOS Organic » alors que l'emballage dit COSMOS Natural).
- Prix barrés : attention aux prix de référence fictifs (risque légal).
- Commits : terminer par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## En attente / décisions ouvertes
- Crème Contour des Yeux Anti-âge aux Peptides : fiche en ligne (`creme-contour-yeux-peptides`, 29,90 €) ; économie de la Box calculée automatiquement depuis les prix unitaires. Reste : photo dans l'unboxing de box.html.
- Volume Box : mis à 95 ml (emballage) au lieu de 170 ml (brief) — à confirmer.
- INCI complète de l'Huile Fortifiante manquante.
- Paiement réel (Stripe ?), envoi automatique e-mails/SMS (mot de passe, diagnostic, code -15 %), page admin commandes.
- Retirer produits de démo et faux avis ; harmoniser e·boost → o·boost partout ; Hydracare vs Hydraline ; Perfecteur vs Correcteur (sérum pigmentation).
- Frais de livraison < 59 €, transporteur, frais de retour, engagement « 48 h ».
- Afficher contact@onaecosmetics.fr sur Contact / Presse / Livraison (proposé, non confirmé).
- Visuels à corriger : « COSMOS Organic / Cliniquement validé » sur infographies crème peptides et gommage ; coquille « Estome ».
- Mettre la boutique Shopify en pause après la bascule du domaine.
