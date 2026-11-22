---
layout: article
permalink: /actus/2026/la-trilogie-des-nouveautes-part-2

title: "La Trilogie des Nouveautés - Part 2"
date: 2026-11-20
published_date: "Publié le 23 novembre 2026"
description: "La fin de l'été 2026 a offert une avalanche de nouveautés pour le site, en 3 chapitres. Voici le second."
keywords:
  - Perspikative
  - nouveautés
  - trilogie
  - fonctionnalités
  - chapitres
  - actus
  - article
  - blog
  - profils
  - comptes

og_description: "📰 Découvre cet article sur Perspikative !"
og_image: "https://perspikative.com/pics/meta/actus/2026/la-trilogie-des-nouveautes-part-2.jpg"
cover: /pics/actus/articles/2026/cover/la-trilogie-des-nouveautes-part-2.webp
cover_alt: "Image de couverture"

share_text: "Découvre cet article sur Perspikative !"
authors:
  - "Dsj5CIxUn8bqhhgdACxBcaB4HFB2"

cta:
  label: "Essayer la recherche"
  url: /rechercher

related_articles:
- title: "La Trilogie des Nouveautés - Part 1"
  url: /actus/2026/la-trilogie-des-nouveautes-part-1
  cover: /pics/actus/articles/2026/cover/la-trilogie-des-nouveautes-part-1.webp
  cover_alt: "La Trilogie des Nouveautés- Part 1"
  category_class: évènement
  category_label: "évènement"
  display_date: "16/11/2026"
  description: "La fin de l'été 2026 a offert une avalanche de nouveautés pour le site, en 3 chapitres. Voici le premier."
- title: "Pourquoi j'ai changé mes filigranes"
  url: /actus/2026/pourquoi-jai-change-mes-filigranes
  cover: /pics/actus/articles/2026/cover/pourquoi-jai-change-mes-filigranes.webp
  cover_alt: "Pourquoi j'ai changé mes filigranes"
  category_class: blog
  category_label: "blog"
  display_date: "14/05/2026"
  description: "Découvrez comment le retrait du filigrane change tout sur mes dessins."
---

<p>
  « Perspikative continuait son périple dans l’amélioration de son site, cherchant les moindres détails qui n’allaient pas. Puis quelque chose de frappant : le portfolio ne convenait pas. Ses idées étaient différentes, Perspikative voulait quelque chose de différent. Contempler est un art, et c’est ainsi que le portfolio du site est devenu magnifique... »
</p>
<br>

<p class="article-lead">🌱 Chapitre 2 : Contempler est un Art</p>
<p>
  Ce second chapitre fait bien avancer les choses. Les nouveautés sont d'un ordre supérieur par rapport au <a href="/actus/2026/la-trilogie-des-nouveautes-part-1" target="_blank">Chapitre 1</a>. Une fois les bases posées, je me suis concentré sur un défi plus important : rendre le <a href="/portfolio" target="_blank">portfolio</a> encore plus extraordinaire et complet. Et ça n'a pas été une mince affaire...
</p>
<br>

<p><strong>1. Une galerie dynamique</strong></p>
<p>
  C'est le début de tout. Avant, les galeries du portfolio était très lourde à charger. La page chargeait simultanément 2 versions de la galerie, une version desktop (ordinateur) et une version mobile. Résultat : la page chargeait lentement, et consommait plus de données pour récupérer les éléments. La structure de la page était aussi plus conséquente. Mais j'ai décidé de remédier à ça...
</p>
<p>
  Désormais, les galeries du portfolio utilise une structure commune pour chaque version du site. Que vous consultiez le site depuis votre smartphone, tablette ou depuis un ordinateur, c'est la même structure qui est utilisée. À partir de là, le poids des pages a bien diminué. Mais ici, je parle bien de « galerie dynamique ». En fait, j'utilisais différentes structures des galeries en une même page afin de disposer les œuvres d'une certaine façon. Sur mobile, 2 colonnes, et sur version desktop 3 colonnes. Mais maintenant que j'utilise une structure commune, comment choisir la disposition de mes œuvres ? Eh bien, j'ai fais appel à 2 scripts open-source...
</p>
<p>
  Les scripts sont des bibliothèques JavaScript développées par <a href="https://desandro.com/" target="_blank">David Desandro</a>. On y retrouve la bibliothèque <a href="https://masonry.desandro.com" target="_blank">Masonry (v4)</a>, qui permet d'organiser les œuvres du portfolio en grille dynamique. Les images se replacent seules en fonction du code ; ainsi que la bibliothèque <a href="https://imagesloaded.desandro.com/" target="_blank">imagesLoaded (v5)</a>, facultative, mais qui permet de détecter le chargement des images et faciliter le calcul de la disposition des galeries.
</p>
{% if page.cta %}
<br>
<a href="{{ page.cta.url | escape }}" class="btn-glass">{{ page.cta.label | escape }}</a>
<br><br>
{% endif %}

<p><strong>2. Filtrer par couleur, c'est possible</strong></p>
<p>
  C'est probablement l'une des fonctionnalités que je trouve le plus cool. Quelque part, c'est assez banal, mais c'est une fonctionnalité amusante (et pratique, encore heureux). Depuis les débuts du portfolio, je savais que je voulais ce petit bouton Filtrer. Et le voilà !
</p>
<div class="article-image">
  <img src="/pics/actus/articles/2026/pics/bouton-filtrer.webp" alt="Image d'illustration - bouton Filtrer" loading="lazy">
</div>
<p>
  Il vous suffit d'appuyer dessus pour qu'un panneau s'ouvre avec différentes couleurs. Le filtrage se fait par combinaisons de couleurs : toutes les couleurs que vous selectionnerez seront présentes dans les œuvres. Au plus vous sélectionnez de couleurs, au plus les résultats sont affinés. Si vous sélectionnez trop de couleurs, vous risquez de n'avoir aucun résultat (puisque jusqu'à présent, aucune œuvre ne contient toutes les couleurs présentes). Pour réinitaliser le filtre et voir toutes les œuvres par ordre chronologique, il vous suffit d'appuer sur la petite flèche Actualiser.
</p>
<p>
  Pour l'instant, il est seulement possible de trier ces œuvres par couleur. Mais plus tard, pourquoi pas les trier par années, thème ou encore popularité ? Le portfolio est plus complet ainsi, mais il manque toujours...
</p>
<br>

<p><strong>3. Des commentaires pour blablater</strong></p>
<p>
  Que serait Perspikative sans interactions ? Pas grand chose effectivement, même s'il faut encore que je m'améliore. Cette idée d'ajouter une section commentaires dans les lightboxs (fenêtres) de mes œuvres n'est pas d'ajourd'hui, mais je me vois enfin vous la présenter !
</p>
<div class="article-image">
  <img src="/pics/actus/articles/2026/pics/section-commentaires.webp" alt="Image d'illustration -section commentaires" loading="lazy">
</div>
<p>
  En dessous de chaque œuvre, une section commentaire est présente.
</p>