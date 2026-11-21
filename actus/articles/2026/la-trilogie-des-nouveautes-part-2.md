---
layout: article
permalink: /actus/2026/la-trilogie-des-nouveautes-part-2

title: "La Trilogie des Nouveautés - Part 2"
date: 2026-11-16
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

<p><strong>1. Galerie dynamique :</strong></p>
<p>
  C'est le début de tout. Avant, les galeries du portfolio était très lourde à charger. La page chargeait simultanément 2 versions de la galerie, une version desktop (ordinateur) et une version mobile. Résultat : la page chargeait lentement, et consommait plus données pour récupérer les éléments. La structure de la page était aussi plus conséquent. Mais j'ai décidé de remédier à ça. fois..
</p>
<p>
  Désormais, les galeries du portfolio utilise une structure commune pour chaque version du site. Que vous consultiez le site depuis votre smartphone, tablette ou depuis un ordinateur, c'est la même structure qui est utilisée. 
</p>
{% if page.cta %}
<br>
<a href="{{ page.cta.url | escape }}" class="btn-glass">{{ page.cta.label | escape }}</a>
<br><br>
{% endif %}

<p><strong>2. Barre de navigation retravaillée :</strong></p>
<p>
  Ce premier chapitre étant consacré à rendre le site plus esthétique et agréable, la barre de navigation mobile en avait bien besoin. Le flou d’arrière-plan a été amélioré, les proportions de la barre ajustées, et un flou progressif a ajouté en-dessous. Ce flou progressif est probablement l'élément le plus satisfait de cette refonte de la barre de navigation. Il est discret, mais interpelle tout de même si on y fait attention. De plus, les ombres et les reflets de la barre de navigation ont été complètement revus, avec des paramètres variables en fonction du mode clair ou sombre du site (et oui, on peut faire ça). Voici un comparatif avant (en haut)/après (en bas) des changements de la barre de navigation :
</p>
<div class="article-image">
  <img src="/pics/actus/articles/2026/pics/barre-de-navigation-mobile.webp" alt="Image d'illustration - barre de navigation mobile" loading="lazy">
</div>

<p><strong>3. La réfraction au cœur de tout :</strong></p>
<p>
  La barre de navigation mobile ne s'arrête pas là. L'arrivée du Liquid Glass d'Apple en 2025 m'avait beaucoup interpellé. Ce nouveau système me semblait juste extraordinaire, cet effet de verre liquide si réaliste. Simplement, j'aimais beaucoup cet effet, et il se trouve qu'à ce moment là je faisais mes premiers essais de code pour mon site. Je pense que le Liquid Glass m'a beaucoup inspiré, et quelque peu influencé dans ma manière de concevoir le site. 
</p>
<p>
  Dans cet élan de rendre mon site meilleur, je pensais déjà depuis longtemps à rendre cette barre de navigation mobile beaucoup plus "iOSque", si je puis dire. Je me suis donc renseigné sur tous les éléments qui rendaient cette barre très naturelle et réaliste, en lisant plusieurs articles qui expliquaient cela. Même en trouvant ça très ingénieux, la question restait la même : comment recréer cet effet pour le web ? Un système d'exploitation et un navigateur web ne sont pas la même chose, et les navigateurs ne sont pas tous pareils (la galère vraiment). L'indice que je relevais le plus pertinent était la réfraction de l'élément. La réfraction déforme l'arrière-plan sur les bords pour donner une perspective et une impression de 3D à l'élément. J'ai alors trouvé des projets open source qui travaillait sur l'expérimentation de cette chose qu'est la réfraction. L'IA m'a également aidé à paufiner cet effet. Et ainsiest né la réfraction sur la barre de navigation mobile ! Cet effet est n'est malheureusement pas disponible sur des navigateurs comme Safari ou Firefox, mais seulement sur des navigateurs qui utilisent Chromium (Google, Samsung Internet...).
</p>

<p><strong>4. Les fameuses pages légales :</strong></p>
<p>
  Ce n'est peut-être qu'un détail pour vous, mais les pages légales sont finalement les plus importantes de ce chapitre de nouveautés. En effet, elles apportent toute la clarté du site, dont certaines sont obligatoires. Avec le Chapitre final, l'arrivée d'une toute nouvelle page est primordiale : les <a href="/terms-of-service" target="_blank">conditions d'utilisation</a>. Elles instaurent les règles de base pour le bien-vivre ensemble sur le site. La modification de la <a href="/politique-de-confidentialite" target="_blank">politique de confidentialité</a> a aussi été faite minutieusement, afin de rendre clair l'utilisation de vos données (vous inquiétez pas, je vais pas vous manger ni vendre vos données). Une petite modification a également été faite dans les mentions légales <a href="/mentions-legales" target="_blank">mentions légales</a>, du côté des crédits. 
</p>