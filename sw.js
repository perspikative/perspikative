const CACHE_NAME = 'perspikative-v1.3.6';

// Fichiers essentiels
const PRECACHE_ASSETS = [
  '/',
  '/404',
  '/actus',
  '/art-challenge',
  '/auth',
  '/commu/beta-program',
  '/brand-guidelines',
  '/changelog',
  '/commu',
  '/contact',
  '/faq',
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
          return cache.add(asset).catch(() => {});
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

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, clone).catch(() => {});
          });

          return res;
        })
        .catch(async () => {
          return (await caches.match(req)) || caches.match('/offline.html');
        })
    );

    return;
  }

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