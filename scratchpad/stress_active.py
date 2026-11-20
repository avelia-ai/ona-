# -*- coding: utf-8 -*-
# Actif star « face au stress » de chaque soin -> champ `stress_active` de products.json
# Lancer depuis la racine : python3 scratchpad/stress_active.py
import json

def A(name, tag, intro, actions, feel):
    return {"name": name, "tag": tag, "intro": intro,
            "actions": [{"damage": d, "title": t, "text": x} for d, t, x in actions],
            "feel": feel}

PEP = "Hexapeptide-11"
D = {
"serum-anti-age-peptides": A(PEP, "Peptide signature", "Une courte chaîne d'acides aminés, l'actif signature d'Onaé, associée à deux acides hyaluroniques et aux vitamines C et E.", [
  ("Traits marqués", "Une peau qui paraît plus ferme", "Le peptide aide la peau à retrouver son ressort : les traits creusés par les nuits courtes paraissent visiblement lissés."),
  ("Teint fatigué", "L'éclat d'un visage reposé", "Les vitamines C et E protègent la peau des agressions du quotidien et ravivent un teint terni par la pression."),
  ("Peau qui tiraille", "Un confort qui dure", "Deux acides hyaluroniques retiennent l'eau à la surface : la peau reste souple, même les jours chargés.")],
  "Le matin, dans le miroir, on ne lit plus la semaine sur votre visage."),
"creme-anti-age-peptides": A(PEP, "Peptide signature", "Le peptide signature d'Onaé, enveloppé dans une texture riche au beurre de mangue et à l'huile de jojoba.", [
  ("Perte de fermeté", "Des contours qui se redessinent", "Le peptide aide la peau à paraître plus dense et plus tonique, là où la fatigue relâche les traits."),
  ("Barrière fragilisée", "Une peau protégée", "Beurre de mangue et jojoba forment un voile nourrissant qui aide la peau à mieux résister aux agressions."),
  ("Sécheresse", "Une souplesse retrouvée", "L'acide hyaluronique hydrolysé hydrate la surface : la peau redevient douce et confortable.")],
  "Une peau qui se sent tenue, enveloppée, comme après une vraie nuit de sommeil."),
"box-anti-age-peptides": A(PEP, "Le rituel aux peptides", "Le même peptide signature dans les 3 soins du rituel anti-stress : sérum, crème et contour des yeux, pour un effet cumulé.", [
  ("Traits tirés", "Un visage visiblement reposé", "Trois gestes, un même actif : la peau paraît plus ferme et les traits plus détendus dès 3 semaines."),
  ("Regard fatigué", "Un regard qui s'ouvre", "Le contour des yeux aux peptides cible la zone la plus fine, celle qui trahit le stress en premier."),
  ("Teint terne", "Un éclat qui revient", "Vitamines et acide hyaluronique redonnent à la peau sa lumière et son confort.")],
  "Trois minutes par jour rien que pour vous : le rituel qui efface la semaine."),
"creme-contour-yeux-peptides": A(PEP, "Peptide signature", "Le peptide signature d'Onaé, associé aux vitamines C et E et à l'huile de bourrache, pour la peau la plus fine du visage.", [
  ("Ridules du regard", "Un contour visiblement lissé", "Le peptide aide la peau du contour à paraître plus ferme : les ridules creusées par la fatigue s'estompent visiblement."),
  ("Cernes", "Un regard plus lumineux", "La vitamine C illumine la zone et atténue visiblement l'aspect des cernes."),
  ("Peau fragilisée", "Un contour protégé", "La vitamine E et l'huile de bourrache nourrissent et protègent cette zone si sensible au manque de sommeil.")],
  "Le regard ne dit plus « je suis épuisé », il dit « je suis là »."),
"serum-gelee-prebiotiques": A("Lysat de Lactobacillus", "Postbiotique", "Un ferment issu de bonnes bactéries, associé à deux acides hyaluroniques, pour prendre soin de l'équilibre naturel de la peau.", [
  ("Peau réactive", "Une peau qui se calme", "Le ferment aide à préserver l'équilibre de la peau, souvent bousculé par le stress : elle paraît visiblement plus apaisée."),
  ("Imperfections", "Un grain de peau plus net", "Une peau rééquilibrée est une peau plus régulière : les petites imperfections liées aux périodes tendues s'atténuent visiblement."),
  ("Déshydratation", "Une hydratation en continu", "Deux acides hyaluroniques et le PCA de sodium retiennent l'eau à la surface, toute la journée.")],
  "Une peau en paix, qui ne réagit plus à chaque coup de pression."),
"brume-visage-prebiotiques-acide-hyaluronique": A("Prébiotiques", "Équilibre de la peau", "Des sucres naturels (rhamnose, glucose, acide glucuronique) qui nourrissent la flore de la peau, associés à un ferment de Lactobacillus.", [
  ("Peau échauffée", "Un apaisement instantané", "Une brume fraîche qui aide la peau à retrouver son calme en quelques secondes, au bureau comme dans les transports."),
  ("Flore déséquilibrée", "Une peau rééquilibrée", "Les prébiotiques nourrissent les bonnes bactéries de la peau, que le stress a tendance à bousculer."),
  ("Tiraillements", "Un confort qui revient", "L'acide hyaluronique, le PCA de sodium et la bétaïne réhydratent la surface à chaque vaporisation.")],
  "Une respiration pour la peau, une pause pour vous, à tout moment de la journée."),
"serum-booster-cafeine": A("Caféine", "Actif énergisant", "La caféine, star des soins anti-fatigue, dans un gel léger qui pénètre en un instant.", [
  ("Teint brouillé", "Un coup d'éclat immédiat", "La caféine réveille le teint : la peau paraît plus vive, comme après une bonne nuit."),
  ("Gonflements", "Des traits défroissés", "Elle aide à atténuer visiblement l'aspect gonflé du visage au réveil."),
  ("Peau qui tiraille", "Une fraîcheur durable", "Glycérine bio et alginate gardent la peau hydratée et souple toute la journée.")],
  "Le visage suit enfin le rythme : réveillé, frais, prêt."),
"serum-vitamine-c-boost": A("Vitamine C", "Antioxydant", "Une vitamine C associée à l'acide férulique, qui renforce son action, et aux huiles d'argousier et d'églantier.", [
  ("Teint terne", "Une lumière retrouvée", "La vitamine C ravive l'éclat d'un teint éteint par la fatigue et la pression."),
  ("Stress oxydatif", "Une peau protégée", "Avec l'acide férulique, elle aide la peau à se défendre contre les radicaux libres, que le stress multiplie."),
  ("Teint irrégulier", "Un teint plus uniforme", "Jour après jour, le teint paraît plus homogène et les marques de fatigue moins visibles.")],
  "Ce teint lumineux qu'on remarque, et qui fait du bien à soi avant tout."),
"serum-correcteur-pigmentation": A("Alpha-arbutine", "Actif unifiant", "Un actif de référence pour unifier le teint, associé aux vitamines C et E et à l'extrait de Bidens pilosa.", [
  ("Taches", "Un teint plus net", "L'alpha-arbutine aide à atténuer visiblement l'aspect des taches pigmentaires."),
  ("Teint fatigué", "Une peau qui s'illumine", "Les vitamines C et E ravivent l'éclat et protègent la peau des agressions du quotidien."),
  ("Peau sèche", "Une douceur qui reste", "Acide hyaluronique et beurre de murumuru hydratent et nourrissent la peau.")],
  "Un teint plus uniforme, et l'envie de sortir sans rien cacher."),
"serum-alternatif-retinol": A("Bidens Pilosa", "Alternative végétale au rétinol", "Une plante tropicale connue comme alternative douce au rétinol, associée aux vitamines C et E.", [
  ("Ridules", "Une peau visiblement lissée", "Le Bidens Pilosa aide la peau à paraître plus lisse, sans les inconforts souvent associés au rétinol."),
  ("Peau sensibilisée", "Une douceur respectée", "Une approche délicate, pensée pour les peaux que le stress rend plus réactives."),
  ("Éclat terni", "Un teint ravivé", "Les vitamines C et E et l'argousier redonnent de la lumière et protègent la peau.")],
  "L'efficacité d'un soin anti-âge, la douceur d'un geste qui ne vous brusque pas."),
"creme-alternative-retinol": A("Bidens Pilosa", "Alternative végétale au rétinol", "L'alternative végétale au rétinol, dans une crème au beurre de mangue, au jojoba et à l'argousier.", [
  ("Rides de fatigue", "Des traits adoucis", "Le Bidens Pilosa aide la peau à paraître plus lisse et plus ferme, jour après jour."),
  ("Peau réactive", "Un confort respecté", "Une formule douce, pensée pour ne pas brusquer une peau déjà mise à l'épreuve."),
  ("Sécheresse", "Une peau nourrie", "Acide hyaluronique, beurre de mangue et jojoba hydratent et nourrissent la peau.")],
  "Une peau plus lisse, sans compromis sur son confort."),
"serum-contour-yeux-retinol": A("Bidens Pilosa", "Alternative végétale au rétinol", "L'alternative végétale au rétinol, adaptée au contour des yeux, associée au marron d'Inde et aux vitamines C et E.", [
  ("Ridules", "Un contour visiblement lissé", "Le Bidens Pilosa aide à lisser les ridules du regard, en douceur."),
  ("Poches", "Un regard défroissé", "Le marron d'Inde aide à atténuer visiblement l'aspect gonflé du contour."),
  ("Cernes", "Un regard plus clair", "La vitamine C illumine la zone et rend les cernes moins visibles.")],
  "Un regard qui retrouve sa douceur, même après les semaines les plus longues."),
"creme-contour-yeux-lissante": A("Acide hyaluronique", "Hydratant", "Une molécule capable de retenir l'eau, associée au marron d'Inde, au thé noir et au karité.", [
  ("Ridules de déshydratation", "Un contour repulpé", "L'acide hyaluronique hydrate la surface : les ridules de fatigue paraissent visiblement lissées."),
  ("Poches", "Un regard dégonflé", "Le marron d'Inde et le thé noir aident à atténuer l'aspect gonflé du contour au réveil."),
  ("Peau fine qui tiraille", "Un confort enveloppant", "Le beurre de karité nourrit cette zone fragile et la rend plus souple.")],
  "Un regard reposé qui raconte enfin la personne que vous êtes."),
"gel-contour-yeux-hydratation-booster": A("Acide hyaluronique", "Hydratant", "L'acide hyaluronique dans une texture gel fraîche, avec du thé blanc et de la sauge.", [
  ("Contour déshydraté", "Une hydratation immédiate", "L'acide hyaluronique désaltère la peau fine du contour en un instant."),
  ("Yeux gonflés", "Un effet frais", "La texture gel et le thé blanc défroissent visiblement le regard au réveil."),
  ("Regard terne", "Un regard réveillé", "La sauge et l'aloe vera apportent fraîcheur et éclat au contour.")],
  "Une sensation de fraîcheur qui vous réveille vraiment."),
"creme-contour-cannabidiol": A("Cannabidiol", "Actif apaisant", "Le cannabidiol (CBD), associé à l'huile de chanvre, au ginkgo biloba et au marron d'Inde.", [
  ("Contour sensibilisé", "Un regard apaisé", "Le cannabidiol aide à apaiser visiblement la peau fine du contour, souvent mise à rude épreuve."),
  ("Poches", "Un contour dégonflé", "Le marron d'Inde et le ginkgo aident à atténuer l'aspect gonflé du regard."),
  ("Sécheresse", "Une peau nourrie", "L'huile de chanvre et l'acide hyaluronique nourrissent et hydratent le contour.")],
  "Un instant de calme posé du bout des doigts, matin et soir."),
"patchs-yeux-hydrogel-anti-fatigue": A("Rooibos", "Antioxydant", "Le thé rouge d'Afrique du Sud, riche en antioxydants, associé à l'Annona Cherimola et à l'acide hyaluronique.", [
  ("Regard fatigué", "15 minutes pour se réveiller", "Le rooibos et la fraîcheur de l'hydrogel défroissent visiblement le regard dès la première pose."),
  ("Cernes", "Un contour plus lumineux", "L'Annona Cherimola aide à illuminer le contour et à atténuer l'aspect des cernes."),
  ("Déshydratation", "Un contour repulpé", "L'acide hyaluronique et le panthénol hydratent et assouplissent la peau fine.")],
  "Quinze minutes les yeux fermés : une vraie pause dans une journée qui n'en laisse pas."),
"patchs-yeux-cafeine-vitamine-c": A("Caféine", "Actif énergisant", "La caféine et la vitamine C, dans des patchs en hydrogel frais, avec de la rose et de la fleur de grenade.", [
  ("Poches", "Un regard dégonflé", "La caféine aide à atténuer visiblement l'aspect gonflé du contour au réveil."),
  ("Cernes", "Un regard plus clair", "La vitamine C illumine le contour et rend les cernes moins visibles."),
  ("Teint terne", "Un coup d'éclat", "La rose et la grenade redonnent fraîcheur et vitalité à la zone.")],
  "Le réveil que votre regard attendait, avant même votre café."),
"patchs-yeux-niacinamide-acide-hyaluronique": A("Niacinamide", "Vitamine B3", "La vitamine B3, associée à l'acide hyaluronique et au panthénol, dans des patchs en hydrogel.", [
  ("Ridules", "Un contour lissé", "L'acide hyaluronique repulpe la surface : les ridules du regard paraissent visiblement lissées."),
  ("Teint irrégulier", "Un regard illuminé", "La niacinamide aide à unifier et illuminer le contour."),
  ("Barrière fragilisée", "Une peau renforcée", "Niacinamide et panthénol aident la peau fine à mieux se protéger.")],
  "Un rituel doux qui vous rend un regard net, lisse et lumineux."),
"peeling-visage-aha": A("Acide lactique", "AHA doux", "Un acide de fruits doux qui exfolie la surface, associé à l'acide hyaluronique, au thé blanc et à la sauge.", [
  ("Teint brouillé", "Une peau neuve au réveil", "L'acide lactique élimine en douceur les cellules mortes : le teint paraît plus net et lumineux."),
  ("Grain irrégulier", "Une peau plus lisse", "La texture de la peau s'affine visiblement au fil des applications."),
  ("Peau sèche", "Une exfoliation confortable", "L'acide hyaluronique et la glycérine hydratent pendant que l'AHA agit.")],
  "Le plaisir de se réveiller avec une peau qui semble repartir de zéro."),
"serum-niacinamide": A("Niacinamide", "Vitamine B3", "5 % de niacinamide, la vitamine B3, associée au ginkgo biloba dans une texture gel.", [
  ("Imperfections", "Un teint plus net", "La niacinamide aide à atténuer visiblement les imperfections qui apparaissent dans les périodes tendues."),
  ("Brillances", "Une peau plus équilibrée", "Elle aide à réguler l'aspect brillant de la peau et à resserrer visiblement les pores."),
  ("Barrière fragilisée", "Une peau plus résistante", "Elle aide la peau à renforcer sa barrière naturelle, mise à mal par la fatigue.")],
  "Un teint net, sur lequel on n'a plus besoin de se concentrer."),
"serum-hydratant-reparateur": A("Bisabolol", "Actif apaisant", "Un actif apaisant issu de la camomille, associé à la mûre arctique, à la pivoine et à l'acide hyaluronique.", [
  ("Rougeurs", "Une peau apaisée", "Le bisabolol aide à apaiser visiblement la peau et à atténuer l'aspect des rougeurs."),
  ("Déshydratation", "Une hydratation profonde de la surface", "L'acide hyaluronique redonne à la peau son confort et sa souplesse."),
  ("Teint éteint", "Un éclat retrouvé", "La mûre arctique et la pivoine ravivent la luminosité de la peau.")],
  "Une peau qui se détend, et vous avec elle."),
"creme-onctueuse-nourrissante": A("Mûre arctique", "Antioxydant", "Une baie du Grand Nord riche en antioxydants, dans une crème au karité, au cacao et à l'argan.", [
  ("Stress oxydatif", "Une peau protégée", "La mûre arctique aide la peau à se défendre contre les agressions du quotidien."),
  ("Peau sèche", "Un cocon de nutrition", "Karité, cacao et argan nourrissent intensément et laissent la peau douce."),
  ("Traits fatigués", "Une peau plus souple", "Bien nourrie, la peau paraît plus repulpée et plus reposée.")],
  "Le réconfort d'une crème dans laquelle on aimerait se blottir."),
"creme-anti-rides-acide-hyaluronique": A("Acide hyaluronique multi-moléculaire", "Hydratant", "Plusieurs tailles d'acide hyaluronique pour hydrater toutes les couches de surface, avec des baies antioxydantes.", [
  ("Rides de déshydratation", "Une peau repulpée", "L'acide hyaluronique repulpe la surface : les rides paraissent visiblement atténuées."),
  ("Stress oxydatif", "Une peau protégée", "Airelle rouge, cassis et sureau noir apportent des antioxydants naturels."),
  ("Tiraillements", "Un confort durable", "Jojoba et karité nourrissent et retiennent l'hydratation.")],
  "Une peau rebondie, qui retrouve l'air reposé de vos meilleurs jours."),
"creme-jour-hydratante-anti-age": A("Acide hyaluronique", "Hydratant", "L'acide hyaluronique, associé à l'aloe vera, au jojoba, au karité et à l'avocat.", [
  ("Peau assoiffée", "Une hydratation toute la journée", "L'acide hyaluronique retient l'eau à la surface du matin au soir."),
  ("Ridules", "Des traits défroissés", "Une peau bien hydratée paraît plus lisse : les ridules de fatigue s'estompent visiblement."),
  ("Barrière fragilisée", "Une peau protégée", "Karité et avocat nourrissent et aident la peau à mieux résister.")],
  "Une base de confort qui vous accompagne, quoi que la journée vous réserve."),
"huile-fortifiante-romarin": A("Huile essentielle de romarin", "Actif fortifiant", "Le romarin, associé à l'ortie, au ricin et à sept huiles végétales bio.", [
  ("Cheveux fragilisés", "Une chevelure plus forte", "Le romarin et l'ortie aident à fortifier les cheveux que le stress fragilise."),
  ("Cuir chevelu tendu", "Un massage qui détend", "Appliquée en massage, l'huile apporte un vrai moment de détente au cuir chevelu."),
  ("Longueurs ternes", "Une brillance retrouvée", "Les huiles d'argan, d'avocat et d'amande douce nourrissent et font briller les longueurs.")],
  "Un massage du soir qui détend la tête autant que les cheveux."),
"masque-cheveux-keratine": A("Kératine hydrolysée", "Protéine réparatrice", "La protéine naturelle du cheveu, associée aux protéines de blé, au karité et à l'avocat.", [
  ("Casse", "Des cheveux renforcés", "La kératine comble les zones abîmées de la fibre et aide à limiter la casse."),
  ("Pointes sèches", "Des longueurs nourries", "Karité, avocat et amande douce nourrissent intensément les cheveux secs."),
  ("Chevelure terne", "Une brillance retrouvée", "Les cheveux redeviennent souples, doux et lumineux.")],
  "Une chevelure qui reprend vie, et l'envie de la porter fièrement."),
"shampoing-keratine": A("Kératine hydrolysée", "Protéine réparatrice", "La kératine, associée au romarin, à la menthe poivrée et à un complexe hydratant.", [
  ("Cheveux affaiblis", "Une fibre renforcée", "La kératine aide à renforcer les cheveux fragilisés dès le lavage."),
  ("Manque de volume", "Du volume", "Les cheveux paraissent plus épais et plus pleins."),
  ("Cuir chevelu fatigué", "Un réveil frais", "Le romarin et la menthe apportent une sensation de fraîcheur tonique.")],
  "Une douche qui vous redonne de l'élan, des racines aux pointes."),
"brume-capillaire-keratine": A("Kératine hydrolysée", "Protéine réparatrice", "La kératine en brume légère, associée à l'algue Furcellaria et aux agrumes.", [
  ("Frisottis", "Des cheveux lissés", "La kératine gaine la fibre : les frisottis sont visiblement disciplinés."),
  ("Coiffage difficile", "Un coiffage facile", "Les cheveux se démêlent et se coiffent plus facilement."),
  ("Chevelure terne", "Une brillance fraîche", "L'algue et les agrumes apportent éclat et légèreté.")],
  "Une chevelure disciplinée en un geste, même les matins pressés."),
"serum-cuir-chevelu-revitalisant": A("Ortie bio", "Actif revitalisant", "L'ortie, associée à l'acide lactique et à l'acide hyaluronique, pour le cuir chevelu.", [
  ("Cheveux fragilisés", "Des racines revitalisées", "L'ortie aide à revitaliser le cuir chevelu et à fortifier les cheveux."),
  ("Cuir chevelu déséquilibré", "Un cuir chevelu assaini", "L'acide lactique aide à rééquilibrer le cuir chevelu en douceur."),
  ("Sécheresse", "Un cuir chevelu hydraté", "L'acide hyaluronique hydrate sans alourdir.")],
  "Prendre soin des racines, c'est prendre soin de soi."),
"gommage-cuir-chevelu-romarin-menthe": A("Romarin & menthe poivrée", "Duo purifiant", "Le romarin et la menthe poivrée, associés à la poudre de noyau de cerise et au kaolin.", [
  ("Cuir chevelu encombré", "Un cuir chevelu purifié", "La poudre de noyau de cerise et le kaolin éliminent en douceur les résidus et les pellicules."),
  ("Démangeaisons", "Un apaisement frais", "La menthe poivrée apporte une fraîcheur immédiate qui soulage."),
  ("Racines fatiguées", "Des racines tonifiées", "Le romarin et la kératine aident à fortifier les cheveux.")],
  "Une sensation de légèreté, comme une tête enfin libérée."),
"shampoing-boucles": A("Graines de lin", "Définition des boucles", "L'extrait de graines de lin, associé à l'aloe vera, à l'argan et à l'inuline.", [
  ("Boucles sans définition", "Des boucles dessinées", "Le lin aide à définir et à rassembler les boucles."),
  ("Sécheresse", "Une hydratation douce", "L'aloe vera et la glycérine hydratent dès le lavage."),
  ("Frisottis", "Des boucles disciplinées", "L'argan et la noix de coco nourrissent et limitent les frisottis.")],
  "Des boucles qui reprennent leur ressort, et vous qui reprenez confiance."),
"soin-hydratant-cheveux-boucles": A("Protéine de riz hydrolysée", "Protéine de définition", "La protéine de riz, associée à l'huile d'argan et aux extraits de lin et de raisin.", [
  ("Boucles plates", "Des boucles rebondies", "La protéine de riz donne du corps et du ressort aux boucles."),
  ("Frisottis", "Une chevelure disciplinée", "Le lin et l'argan aident à lisser et définir les boucles."),
  ("Sécheresse", "Une hydratation intense", "L'acide lactique et l'argan nourrissent et hydratent la fibre.")],
  "Des boucles qui ont du caractère, sans effort."),
"brume-capillaire-anti-frisottis": A("Protéine de riz hydrolysée", "Protéine de définition", "La protéine de riz en brume légère, avec de l'aloe vera et des extraits de lin et de raisin.", [
  ("Frisottis", "Des cheveux disciplinés", "La brume aide à lisser les frisottis en un geste."),
  ("Cheveux cassants", "Des cheveux plus forts", "La protéine de riz aide à renforcer la fibre et à limiter la casse."),
  ("Cheveux secs", "De la souplesse", "L'aloe vera et la glycérine hydratent et assouplissent.")],
  "Une coiffure qui tient, même quand la journée déborde."),
"apres-shampoing-hydratant": A("Huile d'argan", "Actif nourrissant", "L'huile d'argan, associée à l'aloe vera, aux protéines de blé, au ginkgo et à la bardane.", [
  ("Cheveux secs", "Des longueurs nourries", "L'argan et la noix de coco nourrissent intensément."),
  ("Nœuds", "Un démêlage facile", "Les protéines de blé gainent la fibre : les cheveux se démêlent sans effort."),
  ("Chevelure terne", "Douceur et brillance", "Les cheveux redeviennent soyeux et lumineux.")],
  "Des cheveux doux comme on aime les toucher, du bout des doigts."),
"shampoing-doux-hydratant": A("Jus d'aloès", "Actif hydratant", "Le jus d'aloès, associé au ginkgo, à la bardane et au chou marin.", [
  ("Cuir chevelu sensible", "Un lavage tout en douceur", "L'aloès lave en douceur et respecte le cuir chevelu."),
  ("Cheveux secs", "Une hydratation dès le lavage", "L'aloès et la glycérine hydratent la fibre."),
  ("Cheveux fragiles", "Des cheveux renforcés", "Le ginkgo et la bardane aident à fortifier les cheveux.")],
  "Un geste quotidien doux, qui commence bien la journée."),
"shampoing-sec-quick-refresh": A("Rhodiola", "Actif tonifiant", "La rhodiola, plante des environnements extrêmes, associée à l'amidon de riz, au panthénol et à l'échinacée.", [
  ("Racines grasses", "Des racines fraîches", "L'amidon de riz absorbe l'excès de sébum en quelques secondes."),
  ("Cheveux plats", "Du volume instantané", "Les cheveux retrouvent du corps et de la légèreté."),
  ("Cuir chevelu fatigué", "Un regain de vitalité", "La rhodiola et l'échinacée tonifient le cuir chevelu.")],
  "Pas le temps de laver ? Une chevelure fraîche quand même, et une charge mentale en moins."),
"apres-shampoing-agrumes": A("Agrumes (citron et orange douce)", "Actif rafraîchissant", "Les huiles essentielles de citron et d'orange douce, associées aux protéines de blé et au panthénol.", [
  ("Cheveux ternes", "Éclat et brillance", "Les agrumes ravivent la brillance des cheveux."),
  ("Cheveux fragilisés", "Des cheveux renforcés", "Les protéines de blé et le panthénol aident à renforcer la fibre."),
  ("Manque d'énergie", "Une sensation fraîche", "Le parfum vivifiant des agrumes réveille les sens sous la douche.")],
  "Une bouffée de fraîcheur qui fait du bien au moral."),
}

if __name__ == "__main__":
    data = json.load(open("products.json", encoding="utf-8"))
    n = 0
    for p in data["products"]:
        if p.get("stress"):
            assert p["id"] in D, p["id"]
            p["stress_active"] = D[p["id"]]; n += 1
    assert n == len(D), (n, len(D))
    json.dump(data, open("products.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("ok", n)
