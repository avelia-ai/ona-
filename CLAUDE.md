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
- **Cache images 24 h** (`server.js` : `public, max-age=86400` hors html/js/css/json) → pour REMPLACER une image, lui donner un **nouveau nom de fichier** et mettre à jour les références (sinon l'ancienne reste affichée sur PC). Après modif de products.json, incrémenter `products.json?v=N` dans index.html / soins-*.html (actuellement v=29, harmonisé sur toutes les pages).
- Pages catégories : soins-yeux.html et index.html génèrent leurs grilles depuis products.json (rien à ajouter à la main) ; soins-cheveux.html et nouveautes.html ont des cartes **écrites en dur** à ajouter manuellement (+ compteur « N produits » dans soins-cheveux).
- Fiche produit : champ `efficacy` `{claim, stats:[{pct, when}], source}` → affiche les vrais % du test d'usage ; absent → état « Résultats bientôt » (libellés des 3 paliers personnalisables via `efficacy_when`). Si `efficacy.stats` n'a qu'1 valeur → mise en page « solo » premium : grand cercle doré + accroche `desc` (préfixée du %) + texte émotionnel `story` + pastilles `points` (ex. patchs : 98 % après une seule utilisation). Avant/après (`serum-anti-age-peptides`, `serum-gelee-prebiotiques`, `serum-booster-cafeine`) : carrousel en dur dans product.html (`ba-peptides-1/4/2/3-avant|apres.jpg`, 4 slides ; n°4 = testeuse blonde, placée en 2e), défilement auto sans pause au survol (la pause bloquait tout sur PC) ; même photo n°1 réutilisée dans « Ce qu'elles disent » de l'accueil.
- `cart.js` (panier, `data-add-to-cart`, `OnaeCart.addWithFeedback`), `onae-menu.js` (menu mobile premium à onglets + recherche ; version en cache `?v=N` à incrémenter dans toutes les pages à chaque modif).
- Gabarit de nouvelle page : head + CSS racine de `fidelite.html` jusqu'à `/* ═══════════ ONAÉ PRIVILÈGE`, + bloc header/menu de `<!-- HEADER -->` jusqu'à la fin du script `onae-menu`, puis CSS/HTML propres, `footer-simple`, `cart.js`, `onae-menu.js`.
- Modules serveur : `accounts.js` (comptes e-mail/téléphone, sessions cookie `onae_sid`, profil, fidélité Rose/Nacre/Écrin, diagnostics enregistrés `/api/me/diagnostics`), `diagnostic.js` (`/api/diagnostic` analyse photo via API Anthropic, photos jamais stockées, résultats dans `diagnostics.json`, `/api/diagnostic/:id`).
- `seo.js` (jamais servi) : fiches produits sur `/produits/<slug>` rendues côté serveur + JSON-LD Product/FAQ/Breadcrumb (301 depuis `product.html?id=`) ; `robots.txt`, `sitemap.xml`, `llms.txt` générés depuis products.json ; canonical/OG/lang injectés dans toutes les pages HTML (après `</title>`, car beaucoup de pages omettent `</head>`). Liens internes produits = `/produits/<id>`. Pas d'`aggregateRating` tant qu'il n'y a pas de vrais avis.
- Espace admin : `/admin` (admin.js) — connexion par formulaire avec NEWSLETTER_KEY (espaces/guillemets tolérés), cookie `onae_admin` 30 j ; tableau des inscrits au concours + modération des avis (Publier/Refuser) + liens exports. Les exports et la modération acceptent ce cookie ou `?key=`. `/api/concours/admin` redirige vers `/admin`.
- Autres API : `/api/contact`, `/api/partner`, `/api/track` (suivi commande via `orders.json`), `/api/newsletter`, `/api/loyalty`.

## Pages existantes
Accueil (carrousel de bannières auto), soins-visage/yeux/cheveux, nos-gammes + gamme-boost/care/hydraline/repare (textes = bienfaits physiques ET émotionnels, peau ET cheveux, jamais centrés sur un produit/ingrédient), nouveautes, box (Les Box), product (fiche), routine, panier, compte + mon-compte (espace client), fidelite, diagnostic (IA), nos-ingredients (peptides = actif signature), notre-histoire, nos-engagements, presse-partenariats, contact, faq, livraison-retours, suivi-commande, blog + 6 articles.

## Tests en local
`(DATA_DIR=<scratch>/tdata PORT=4321 nohup node server.js >srv.log 2>&1 &)` ; ne jamais faire `pkill -f "node server.js"` (tue le shell). Captures Playwright avec chromium `/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`, `NODE_PATH=$(npm root -g)`.

## Règles de contenu
- Toujours répondre en français. Prix terminés en ,99 ; % de remise affiché arrondi vers le bas (jamais supérieur à la vraie remise). Duos/routines affichés sur chaque produit qu'ils contiennent (sauf si Guillaume dit « uniquement »).
- Jamais « Fabriqué/Made in France » → « Marque élaborée en France ». Jamais « cliniquement validé/prouvé ». Jamais « COSMOS Organic » si l'étiquette dit COSMOS Natural → exclure de la galerie les visuels fournisseur qui portent ces mentions.
- Allégations prudentes : pas de « cliniquement prouvé », pas de chiffres d'efficacité sans tests, pas d'allégations « sans X » (encadrées en UE), pas de faux avis. Signaler les erreurs des visuels (ex. « COSMOS Organic » alors que l'emballage dit COSMOS Natural).
- Prix barrés : attention aux prix de référence fictifs (risque légal).
- Commits : terminer par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Historique récent (03/11/2026)
- Masque Cheveux Kératine : prix de référence 49,99 € (39,99 €, -20 %).
- Shampoing nourrissant & volumateur à la Kératine (`shampoing-keratine`, o·boost, 390 ml, 34,99 €) ajouté : soins-cheveux (8 produits), nouveautés, bestsellers. 1 seule photo pour l'instant.
- Sérum Visage aux Prébiotiques (`serum-gelee-prebiotiques`) : test d'usage 90 % (3 sem.) / 93 % (1 mois) / 98 % (2 mois).
- Sérum Prébiotiques : 5 photos lifestyle ajoutées en positions 2 à 6 de la galerie (`serum-gelee-prebiotiques-4..8.jpg` : selfie, application, en main, sur jean, unboxing). Signalé : étiquettes déformées sur ces visuels (« Réduit la barrière cutanée », « Réduit le microbiome », badge gamme illisible ; photo n°9 lavabo : « Marque Fabriquée en ») ; à remplacer ou retirer si Guillaume le décide.
- Sérum Prébiotiques : visuel avant/après (imperfections) en 3e position de la galerie (`serum-gelee-prebiotiques-avant-apres.jpg`, gabarit lavande o·care) ; 2e avant/après (testeuse blonde) en 5e (`serum-gelee-prebiotiques-avant-apres-2.jpg`).
- Sérum Prébiotiques : section « Avant / Après » ajoutée sur la fiche (bloc en dur dans product.html, condition `p.id === 'serum-gelee-prebiotiques'`), 4 slides `ba-prebiotiques-1..4-avant|apres.jpg` (n°2 = même testeuse que le visuel galerie ; n°4 : étiquettes Avant/Après incrustées rognées). Sous-titre volontairement sans « non retouchées ».
- Sérum Booster Caféine : test d'usage 90 % (3 sem.) / 93 % (1 mois) / 97 % (2 mois).
- Sérum Booster Caféine : section « Avant / Après » sur la fiche (condition `p.id === 'serum-booster-cafeine'`), 2 slides `ba-cafeine-1|2-avant|apres.jpg` (n°2 = même testeuse que le visuel galerie).
- Sérum Booster Caféine : avant/après en 2e position (`serum-booster-cafeine-avant-apres.jpg`, gabarit bleu o·boost) + 4 photos lifestyle en 3 à 6 (`serum-booster-cafeine-9..12.jpg` : application, unboxing, café, selfie). Signalé : « Stimule les poches » sur la photo café (au lieu de « Tonifie »), textes déformés sur application/selfie.
- Patchs oculaires Hydrogel Anti-fatigue (`patchs-yeux-hydrogel-anti-fatigue`, o·répare, 7 paires, 39,99 € au lieu de 49,99 € (-20 %), bestseller rank 7.5 + nouveauté, category yeux) : 9 photos `patchs-yeux-hydrogel-1..9.jpg` (principale = n°6, visuel fond rose o·répare ; avant/après `patchs-yeux-hydrogel-avant-apres.jpg` en 2e, gabarit rose o·répare ; miniature panier `cart-...-v2.jpg`), en tête de nouveautes.html, auto dans soins-yeux / accueil / gamme-repare. Visuel fournisseur « Cliniquement validé / COSMOS Organic / ECOCERT » exclu. Mode d'emploi « 15 à 20 min » et FAQ à faire valider. Signalé : « MADE IN FRANCE » en petit sur le dos des sachets (photos 1 et 6), badge « 100% naturel » à vérifier vs INCI (conservateurs), coquille « puisant » sur l'emballage.
- Patchs oculaires Hydrogel énergisants à la Caféine & Vitamine C (`patchs-yeux-cafeine-vitamine-c`, o·boost, 7 paires, 39,99 € au lieu de 49,99 € (-20 %), bestseller rank 7.6 + nouveauté, category yeux) : 8 photos `patchs-yeux-cafeine-1..8.jpg` (principale = visuel fond bleu o·boost), en tête de nouveautes.html, auto dans soins-yeux / accueil / gamme-boost. Exclus : infographie « Cliniquement validé / COSMOS Organic / ECOCERT » et dos de boîte (« MADE IN FRANCE », textes anglais). Efficacité en attente (paliers 1/2/3 utilisations). Signalé : « Patches » vs « Patchs » selon visuels, coquilles « une regard » et « poche » sur l'infographie o·boost, « MADE IN FRANCE » en petit sur les sachets, badge « 100% natural ».
- Crème Contour des yeux apaisante au Cannabidiol (`creme-contour-cannabidiol`, o·répare, 15 ml, 39,99 €, bestseller rank 7 + nouveauté) : 9 photos (visuel fournisseur « Cliniquement validé / COSMOS Organic » exclu ; certification réelle COSMOS NATURAL), en tête de nouveautes.html, apparaît auto dans soins-yeux.
- Sérum Anti-âge Peptides : nouvel avant/après n°1 (Sophie) sur la fiche et l'accueil ; carrousel avant/après réparé sur PC.
- Sérum Anti-âge Peptides : visuel avant/après (Sophie) ajouté en 2e photo de la galerie produit (`serum-anti-age-peptides-avant-apres-v2.jpg`, 1050×1400, mise en page sûre pour le recadrage 4:5 mobile). Mention « Résultats individuels, pouvant varier ». Durée d'utilisation à ajouter quand Guillaume la confirme.
- Sérum Anti-âge Peptides : 6 photos lifestyle ajoutées (`serum-anti-age-peptides-3..8.jpg`) : coffret+flacon, application, bougie, en main, unboxing, magazine. Galerie = packshot, avant/après, 6 lifestyle, 2 infographies. Points signalés : textes d'étiquette déformés sur certaines photos (application, magazine) ; photo application montre une pipette alors que le flacon est à pompe.

## En attente / décisions ouvertes
- **À confirmer par Guillaume** : prix de référence barré du Shampoing Kératine (mis 44,99 €, -22 %) et de la Crème Cannabidiol (mis 49,99 €, -20 %). Confirmer aussi que l'avant/après s'affiche bien sur PC en ligne.
- Crème Contour des Yeux Anti-âge aux Peptides : fiche en ligne (`creme-contour-yeux-peptides`, 29,90 €) ; économie de la Box calculée automatiquement depuis les prix unitaires. Reste : photo dans l'unboxing de box.html.
- Volume Box : mis à 95 ml (emballage) au lieu de 170 ml (brief) — à confirmer.
- INCI complète de l'Huile Fortifiante manquante.
- Paiement réel (Stripe ?), envoi automatique e-mails/SMS (mot de passe, diagnostic, code -15 %), page admin commandes.
- Retirer produits de démo et faux avis ; harmoniser e·boost → o·boost partout ; Hydracare vs Hydraline ; Perfecteur vs Correcteur (sérum pigmentation).
- Frais de livraison < 59 €, transporteur, frais de retour, engagement « 48 h ».
- Afficher contact@onaecosmetics.fr sur Contact / Presse / Livraison (proposé, non confirmé).
- Visuels à corriger : « COSMOS Organic / Cliniquement validé » sur infographies crème peptides et gommage ; coquille « Estome ».
- Mettre la boutique Shopify en pause après la bascule du domaine.
