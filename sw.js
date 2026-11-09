const CACHE_NAME = 'perspikative-v1.7.0';

const PRECACHE_ASSETS = [
  '/',
   '/@',
  '/404',
  '/actus',
  '/actus/actus.css',
  '/actus/_layouts/article.html',
  '/art-challenge',
  '/auth',
  '/commu/beta-program',
  '/brand-guidelines',
  '/changelog',
  '/commu',
  '/contact',
  '/faq',
  '/forgot-password',
  '/help-center',
  '/login',
  '/logo.svg',
  '/mentions-legales',
  '/commu/perspikateam',
  '/politiques-de-confidentialite',
  '/portfolio',
  '/portfolio/creations',
  '/portfolio/illustrations',
  '/portfolio/projets',
  '/portfolio/portfolio.css',
  '/position-ia',
  '/profile',
  '/rechercher',
  '/script.js',
  '/style.css',
  '/js/auth-handler.js',
  '/js/comments-fade.js',
  '/js/firebase.js',
  '/js/moderation.js',
  '/js/nav-liquid-glass.js',
  '/js/profile.js',
  '/js/public-profile.js',
  '/js/script-comments.js',
  '/fonts/Manoela-Regular.woff2',
  '/fonts/Manoela-Regular.woff',
  '/icons/accueil.svg',
  '/icons/accueil-active.svg',
  '/icons/actus.svg',
  '/icons/actus-active.svg',
  '/icons/contact.svg',
  '/icons/contact-active.svg',
  '/icons/cross.svg',
  '/icons/fermer.svg',
  '/icons/home-title1.svg',
  '/icons/home-title2.svg',
  '/icons/home-title3.svg',
  '/icons/menu.svg',
  '/icons/portfolio.svg',
  '/icons/portfolio-active.svg',
  '/icons/profile.svg',
  '/icons/profile-active.svg',
  '/icons/rechercher.svg',
  '/icons/rechercher-active.svg'
];


self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        PRECACHE_ASSETS.map((asset) => {
          // { cache: 'reload' } : force le navigateur à aller chercher
          // l'asset sur le réseau pour le pré-cache, plutôt que de
          // piocher dans son propre cache HTTP une copie potentiellement
          // périmée au moment de l'installation du nouveau SW.
          return cache.add(new Request(asset, { cache: 'reload' })).catch(() => {});
        })
      );
    })
  );

  self.skipWaiting();
});


self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );

      await clients.claim();
    })()
  );
});


self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = req.url;

  if (url.startsWith('chrome-extension://')) return;

  if (!url.startsWith('http')) return;

  const parsedUrl = new URL(url);

  if (
    parsedUrl.hostname.includes('firebase') ||
    parsedUrl.hostname.includes('googleapis') ||
    parsedUrl.hostname.includes('gstatic')
  ) {
    return;
  }

  // Pages HTML (navigation) ET scripts JS : network-first STRICT, avec
  // bypass explicite du cache HTTP du navigateur via { cache: 'no-store' }.
  // Sans ça, un simple fetch(req) peut très bien être satisfait depuis le
  // cache disque du navigateur sans repasser par le réseau, et on se
  // retrouve à servir une page ou un profile.js périmés malgré une
  // stratégie "network-first" censée toujours aller chercher du frais.
  // C'est précisément ce genre de fichiers (auth, redirections) qui ne
  // doit jamais rester bloqué sur une ancienne version après déploiement.
  if (req.mode === 'navigate' || req.destination === 'script') {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          const clone = res.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, clone).catch(() => {});
          });

          return res;
        })
        .catch(async () => {
          return (
            (await caches.match(req)) ||
            (req.mode === 'navigate' ? caches.match('/offline.html') : undefined)
          );
        })
    );

    return;
  }

  // Tout le reste (images, polices, CSS...) : stale-while-revalidate.
  // La fraîcheur immédiate n'est pas critique pour ces fichiers-là, donc
  // on garde l'ancien comportement (cache d'abord, mise à jour en fond).
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (!res || res.status !== 200) return res;

          const clone = res.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, clone).catch(() => {});
          });

          return res;
        })
        .catch(() => null);

      if (cached) {
        fetchPromise?.catch(() => {});
        return cached;
      }

      return fetchPromise || caches.match('/offline.html');
    })
  );
});
