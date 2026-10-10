// ============================= 1. MENU MOBILE =============================

document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  const menuIcon = document.getElementById('menuIcon');
  const burgerIcon = document.querySelector('.burger-icon');

  if (!menuToggle) {
    return; // Pas de menu sur cette page
  }

  function syncMenuState() {
    const isOpen = menuToggle.checked;

    // Icône burger (menu/fermer)
    if (menuIcon) {
      const currentSrc = menuIcon.getAttribute('src') || menuIcon.src;
      const basePath = currentSrc ? currentSrc.substring(0, currentSrc.lastIndexOf('icons/')) : '';
      menuIcon.src = isOpen ? `${basePath}icons/fermer.svg` : `${basePath}icons/menu.svg`;
    }

    // Blur, scroll lock et état body pour overlay
    document.body.classList.toggle('menu-open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
    document.documentElement.style.overflow = isOpen ? 'hidden' : '';

    // Animation menu + accessibilité/interaction des liens
    if (mobileMenu) {
      mobileMenu.classList.toggle('open', isOpen);
      mobileMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');

      mobileMenu.querySelectorAll('a').forEach(link => {
        link.tabIndex = isOpen ? 0 : -1;
        link.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        link.style.opacity = isOpen ? '1' : '0';
        link.style.pointerEvents = isOpen ? 'auto' : 'none';
        link.style.transition = 'opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
      });
    }
  }

  // Checkbox change
  menuToggle.addEventListener('change', syncMenuState);

  // Afficher le bouton menu uniquement tout en haut sur mobile
  let burgerTicking = false;
  const isMobileViewport = () => window.matchMedia('(max-width: 768px)').matches;

  const updateBurgerVisibility = () => {
    if (!burgerIcon) return;

    const atTop = (window.pageYOffset || document.documentElement.scrollTop) <= 0;
    const shouldShow = !isMobileViewport() || atTop;
    burgerIcon.classList.toggle('is-hidden', !shouldShow);
  };

  const handleBurgerScroll = () => {
    if (burgerTicking) return;
    burgerTicking = true;

    requestAnimationFrame(() => {
      updateBurgerVisibility();
      burgerTicking = false;
    });
  };

  window.addEventListener('scroll', handleBurgerScroll, { passive: true });
  window.addEventListener('resize', updateBurgerVisibility);

  // Fermer si lien cliqué
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.checked = false;
        syncMenuState();
      });
    });
  }

  // Fermer sur clic blur-overlay
  const blurOverlay = document.querySelector('.blur-overlay');
  if (blurOverlay) {
    blurOverlay.addEventListener('click', () => {
      menuToggle.checked = false;
      syncMenuState();
    });
  }

  // Fermer menu avec Échap
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuToggle.checked) {
      menuToggle.checked = false;
      syncMenuState();
    }
  });

  // État initial
  syncMenuState();
  updateBurgerVisibility();
});



// ============================= 2. LIGHTBOX POUR LES CRÉATIONS =============================

document.addEventListener('DOMContentLoaded', () => {
  const lightbox      = document.getElementById('lightbox');
  if (!lightbox) return;

  const lightboxImg   = document.getElementById('lightbox-img');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxDate  = document.getElementById('lightbox-date');
  const lightboxDesc  = document.getElementById('lightbox-desc');
  const lightboxExtra = document.getElementById('lightbox-extra');
  const closeBtn      = document.getElementById('lightbox-close');
  const lbLikeBtn     = document.getElementById('lb-like-btn');
  const lbLikeIcon    = document.getElementById('lb-like-icon');
  const lbShareBtn    = document.getElementById('lb-share-btn');
  const lbCopyBtn     = document.getElementById('lb-copy-btn');
  const lbPrevBtn     = document.getElementById('lb-prev');
  const lbNextBtn     = document.getElementById('lb-next');

  // ── Mini lightbox "Se connecter" (déclenchée par un like sans session) ──
  const loginPromptOverlay = document.getElementById('login-prompt-overlay');
  const loginPromptClose   = document.getElementById('login-prompt-close');

  function openLoginPrompt() {
    if (!loginPromptOverlay) return;
    loginPromptOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLoginPrompt() {
    if (!loginPromptOverlay) return;
    loginPromptOverlay.classList.remove('active');
    // On ne relâche le scroll que si la lightbox principale n'est plus active
    if (!lightbox.classList.contains('active')) {
      document.body.style.overflow = '';
    }
  }

  if (loginPromptClose) {
    loginPromptClose.addEventListener('click', closeLoginPrompt);
  }

  if (loginPromptOverlay) {
    loginPromptOverlay.addEventListener('click', function(e) {
      if (e.target === loginPromptOverlay) closeLoginPrompt();
    });
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && loginPromptOverlay && loginPromptOverlay.classList.contains('active')) {
      closeLoginPrompt();
    }
  });

  if (!lightboxImg || !lightboxTitle || !lightboxDesc || !closeBtn) {
    console.warn('Lightbox : certains éléments sont manquants.');
    return;
  }

  let currentId = null;

  // ── Index de navigation : trié par numéro de fichier (1.webp → 45.webp) ──
  function getNavItems() {
    const items = Array.from(document.querySelectorAll('.creations-grid .prspk-thumb'));
    return items.sort((a, b) => {
      const numA = parseInt(a.getAttribute('src').match(/(\d+)\.webp/)?.[1] ?? '0', 10);
      const numB = parseInt(b.getAttribute('src').match(/(\d+)\.webp/)?.[1] ?? '0', 10);
      return numA - numB;
    });
  }

  function getCurrentIndex() {
    const items = getNavItems();
    return items.findIndex(img => (img.id || img.src) === currentId);
  }

  function updateNavButtons() {
    if (!lbPrevBtn || !lbNextBtn) return;
    const items = getNavItems();
    const idx = getCurrentIndex();
    lbPrevBtn.disabled = idx <= 0;
    lbNextBtn.disabled = idx >= items.length - 1;
    lbPrevBtn.style.opacity = idx <= 0 ? '0.3' : '1';
    lbNextBtn.style.opacity = idx >= items.length - 1 ? '0.3' : '1';
  }

  // ── LIKES (Firestore : users/{uid}/likedDrawings/{id}) ──────────────────
  // currentFirebaseUser est tenu à jour via window.__prspkAuthReady /
  // l'event "prspk:auth-ready" (voir plus bas), exposés par firebase.js.
  // likedCache mémorise, pour la session en cours, les états déjà vérifiés
  // en base pour éviter de re-lire Firestore à chaque réouverture d'une
  // même œuvre pendant qu'on navigue dans la galerie.
  let currentFirebaseUser = null;
  const likedCache = {};   // { [drawingId]: true | false }
  let likeCheckToken = 0;  // pour ignorer les réponses de lecture obsolètes

  // firebase.js (chargé avant, en <script type="module">) expose déjà
  // window.__prspkAuthReady (Promise résolue avec l'utilisateur courant dès
  // le premier onAuthStateChanged) et l'event "prspk:auth-ready" à chaque
  // changement ultérieur. On réutilise ce pont plutôt que de réimporter et
  // réinitialiser un second onAuthStateChanged ici.
  function handleAuthUser(user) {
    currentFirebaseUser = user || null;

    // L'utilisateur vient de se (dé)connecter pendant que la lightbox est
    // ouverte sur une œuvre : on rafraîchit l'état du bouton like en
    // conséquence plutôt que de laisser un état obsolète affiché.
    if (currentId) {
      if (currentFirebaseUser) {
        refreshLikeStateFromFirestore(currentId);
      } else {
        updateLikeUI(currentId, false);
      }
    }
  }

  if (window.__prspkAuthReady) {
    window.__prspkAuthReady.then(handleAuthUser).catch(function(err) {
      console.error('Erreur de résolution de l\'auth :', err);
    });
  } else {
    // Filet de sécurité si firebase.js n'a pas encore posé la promesse
    // (ordre de chargement inattendu) : on retombe sur __prspkUser, déjà
    // tenu à jour par firebase.js à chaque changement d'état.
    currentFirebaseUser = window.__prspkUser || null;
  }

  document.addEventListener('prspk:auth-ready', function(e) {
    handleAuthUser(e.detail ? e.detail.user : null);
  });

  function getFirebaseBits() {
    return {
      db: window.__prspkDb,
      fns: window.__prspkFire
    };
  }

  function likedDrawingRef(uid, id) {
    const { db, fns } = getFirebaseBits();
    if (!db || !fns) return null;
    return fns.doc(db, 'users', uid, 'likedDrawings', id);
  }

  // Vérifie en base si l'œuvre `id` est likée par l'utilisateur courant, et
  // met à jour l'UI en conséquence (utilisé à l'ouverture de la lightbox).
  async function refreshLikeStateFromFirestore(id) {
    if (!currentFirebaseUser) {
      updateLikeUI(id, false);
      return;
    }

    if (Object.prototype.hasOwnProperty.call(likedCache, id)) {
      updateLikeUI(id, likedCache[id]);
      return;
    }

    const token = ++likeCheckToken;
    const { fns } = getFirebaseBits();
    const ref = likedDrawingRef(currentFirebaseUser.uid, id);
    if (!ref || !fns) return;

    try {
      const snap = await fns.getDoc(ref);
      const liked = snap.exists();
      likedCache[id] = liked;

      // Ignore une réponse arrivée après avoir déjà navigué vers une autre
      // œuvre (currentId a changé pendant l'attente réseau).
      if (token === likeCheckToken && id === currentId) {
        updateLikeUI(id, liked);
      }
    } catch (err) {
      console.error('Erreur de lecture du like :', err);
    }
  }

  // ── UI like ──────────────────────────────────────────────────────────────
  // `liked` peut être omis : dans ce cas on affiche l'état "non liké" par
  // défaut en attendant la vérification Firestore (refreshLikeStateFromFirestore).
  function updateLikeUI(id, liked) {
    if (!lbLikeBtn || !lbLikeIcon) return;
    const isLiked = !!liked;
    lbLikeIcon.src = isLiked ? '/icons/like-active.svg' : '/icons/like.svg';
    lbLikeBtn.classList.toggle('liked', isLiked);
  }

  // ── Animation like ───────────────────────────────────────────────────────
  function animateLike(liked) {
    if (!liked || !lbLikeBtn) return;
    lbLikeBtn.classList.remove('like-pop');
    void lbLikeBtn.offsetWidth;
    lbLikeBtn.classList.add('like-pop');
    spawnHearts(lbLikeBtn);
  }

  function spawnHearts(btn) {
    for (var i = 0; i < 6; i++) {
      var heart = document.createElement('span');
      heart.className = 'like-particle';
      heart.textContent = '\u2665';
      var angle = Math.random() * 160 - 80;
      var dist  = 30 + Math.random() * 30;
      heart.style.setProperty('--angle', angle + 'deg');
      heart.style.setProperty('--dist', dist + 'px');
      heart.style.setProperty('--delay', (i * 40) + 'ms');
      btn.appendChild(heart);
      heart.addEventListener('animationend', function() { this.remove(); });
    }
  }

  // ── Toast partage ────────────────────────────────────────────────────────
  function showShareToast() {
    var toast = document.getElementById('share-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'share-toast';
      toast.className = 'share-toast';
      toast.textContent = 'Lien copié ! 🔗';
      document.body.appendChild(toast);
    }
    toast.classList.add('visible');
    setTimeout(function() { toast.classList.remove('visible'); }, 2500);
  }

  // ── Résolution de la source ────────────────────────────────────────────
  function resolveSource(img) {
    return img.dataset.title ? img : null;
  }

  // ── Transition au changement de lightbox ────────────────────────────────
  function switchImage(callback) {
    const win = lightbox.querySelector('.lightbox-window');
    win.style.transition = 'opacity 0.18s cubic-bezier(0.4, 0, 0.2, 1), transform 0.16s cubic-bezier(0.4, 0, 0.2, 1)';
    win.style.opacity    = '0.7';
    win.style.transform  = 'scale(0.97)';

    setTimeout(() => {
      callback();
      requestAnimationFrame(() => {
        win.style.transition = 'opacity 0.18s cubic-bezier(0.22, 1, 0.36, 1), transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)';
        win.style.opacity    = '1';
        win.style.transform  = 'scale(1)';
      });
    }, 180);
  }

  // ── Remplissage du contenu lightbox ─────────────────────────────────────
  function fillLightbox(source) {
    lightboxImg.src           = source.src;
    lightboxImg.alt           = source.alt || '';
    lightboxTitle.textContent = source.dataset.title || '';
    if (lightboxDate) lightboxDate.textContent = source.dataset.date || '';
    lightboxDesc.innerHTML    = source.dataset.desc || '';

    currentId = source.id || source.src;
    lightbox.dataset.id = currentId;

    if (lbLikeBtn) {
      // Affichage immédiat de l'état connu (cache ou "non liké" par défaut),
      // pendant que la vérification Firestore se fait en arrière-plan.
      updateLikeUI(currentId, likedCache[currentId]);
      refreshLikeStateFromFirestore(currentId);
    }
    updateNavButtons();

    if (source.id) {
      history.pushState(null, '', '#' + source.id);
    }

    document.dispatchEvent(new CustomEvent('prspk:lightbox-opened', {
      detail: { drawingId: currentId }
    }));
  }

  // ── Ouverture de la lightbox ─────────────────────────────────────────────
  function openLightbox(img) {
    var source = resolveSource(img);
    if (!source) return;

    fillLightbox(source);
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // ── Navigation prev / next ───────────────────────────────────────────────
  function navigateLightbox(direction) {
    const items = getNavItems();
    const idx = getCurrentIndex();
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= items.length) return;

    switchImage(() => fillLightbox(items[newIdx]));
  }

  if (lbPrevBtn) {
    lbPrevBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      navigateLightbox(-1);
    });
  }

  if (lbNextBtn) {
    lbNextBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      navigateLightbox(1);
    });
  }

  // Écoute les clics sur toutes les images de la grille
  document.querySelectorAll(
    '.creations-grid .prspk-thumb'
  ).forEach(function(img) {
    img.addEventListener('click', function() {
      openLightbox(img);
    });
  });

  // ── Ouverture via hash (depuis la page recherche, par ex.) ───────────────
  var hash = window.location.hash.substring(1);
  if (hash) {
    var targetImg = document.querySelector(
      '.creations-grid .prspk-thumb#' + CSS.escape(hash)
    );
    if (targetImg) openLightbox(targetImg);
  }

  // ── Bouton like ──────────────────────────────────────────────────────────
  if (lbLikeBtn) {
    lbLikeBtn.addEventListener('click', function() {
      if (!currentId) return;

      // Non connecté : on ouvre la mini lightbox "Se connecter" et on
      // n'écrit rien.
      if (!currentFirebaseUser) {
        openLoginPrompt();
        return;
      }

      toggleLikeInFirestore(currentId, lightbox.dataset.id === currentId ? getCurrentSourceForLike() : null);
    });
  }

  // Récupère l'élément source (.prspk-thumb) de l'œuvre actuellement
  // affichée, pour en tirer les infos minimales (src, titre) à stocker
  // dans Firestore avec le like.
  function getCurrentSourceForLike() {
    if (!currentId) return null;
    return document.getElementById(currentId) || null;
  }

  // Résout le chemin absolu d'une image (/portfolio/...) à partir de
  // l'attribut src brut de l'élément (ex: "creations/46.webp" → 
  // "/portfolio/creations/46.webp"), pour un affichage correct dans le
  // profil quelle que soit la page d'où provient le like. Une URL déjà
  // absolue (http(s):// ou commençant par /) est laissée telle quelle.
  function resolveAbsoluteSrc(source) {
    if (!source) return '';
    const raw = source.getAttribute('src') || '';
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) return raw;
    return '/portfolio/' + raw.replace(/^\.?\//, '');
  }

  // Toggle du like dans Firestore : users/{uid}/likedDrawings/{id}.
  // - Si l'œuvre n'est pas encore likée : setDoc avec likedAt + infos
  //   minimales (src, titre, page) pour un affichage rapide et un lien
  //   correct dans le profil. `page` reprend exactement la même logique
  //   que les boutons copier/partager : data-page de la source si présent
  //   (chemin canonique exact, ex. /portfolio/illustrations/xxx), sinon
  //   le même fallback générique /portfolio/creations/{id}.
  // - Si elle l'est déjà : deleteDoc.
  // L'UI est mise à jour de façon optimiste (avant confirmation réseau),
  // puis remise en cohérence en cas d'erreur.
  async function toggleLikeInFirestore(id, sourceEl) {
    const { fns } = getFirebaseBits();
    const ref = likedDrawingRef(currentFirebaseUser.uid, id);
    if (!ref || !fns) return;

    const wasLiked = !!likedCache[id];
    const nowLiked = !wasLiked;

    // Optimiste : on met à jour tout de suite l'UI et le cache local.
    likedCache[id] = nowLiked;
    updateLikeUI(id, nowLiked);
    animateLike(nowLiked);

    try {
      if (nowLiked) {
        const source = sourceEl || getCurrentSourceForLike();
        const page = (source && source.dataset.page)
          ? source.dataset.page
          : '/portfolio/creations/' + id;
        const src = resolveAbsoluteSrc(source);

        await fns.setDoc(ref, {
          likedAt: fns.serverTimestamp(),
          src: src,
          title: source ? (source.dataset.title || '') : '',
          page: page
        });
      } else {
        await fns.deleteDoc(ref);
      }
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement du like :', err);
      // Rollback de l'UI si l'écriture a échoué.
      likedCache[id] = wasLiked;
      updateLikeUI(id, wasLiked);
    }
  }

  // ── Bouton copier le lien ────────────────────────────────────────────────
  if (lbCopyBtn) {
    lbCopyBtn.addEventListener('click', function() {
      if (!currentId) return;

      var source = document.getElementById(currentId);
      var copyUrl;

      if (source && source.dataset.page) {
        copyUrl = window.location.origin + source.dataset.page;
      } else {
        copyUrl = window.location.origin + '/portfolio/creations/' + currentId;
      }

      if (navigator.clipboard) {
        navigator.clipboard.writeText(copyUrl).then(function() {
          showShareToast();
        });
      }
    });
  }

  // ── Bouton partager ──────────────────────────────────────────────────────
  if (lbShareBtn) {
    lbShareBtn.addEventListener('click', function() {
      if (!currentId) return;

      const source = document.getElementById(currentId);
      let shareUrl = window.location.origin + '/portfolio/creations#' + currentId;

      if (source && source.dataset.page) {
        shareUrl = window.location.origin + source.dataset.page;
      }

      const textePartage = 'Jette un œil à cette création sur Perspikative !';

      if (navigator.share) {
        navigator.share({
          title: 'Perspikative',
          text: textePartage,
          url: shareUrl
        }).catch(function() {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(textePartage + ' ' + shareUrl).then(function() {
          showShareToast();
        });
      }
    });
  }

  // ── Fermeture ────────────────────────────────────────────────────────────
  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function(e) {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   navigateLightbox(-1);
    if (e.key === 'ArrowRight')  navigateLightbox(1);
  });
});



// ============================= 2 BIS. GRILLE DYNAMIQUE MASONRY (CRÉATIONS) =============================

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('.creations-grid');
  if (!grid || typeof Masonry === 'undefined') return;

  const msnry = new Masonry(grid, {
    itemSelector: '.grid-item',
    columnWidth: '.grid-sizer',
    percentPosition: true
  });

  if (typeof imagesLoaded !== 'undefined') {
    imagesLoaded(grid).on('progress', () => msnry.layout());
  }

  // Recalcule au redimensionnement (changement de colonnes via les media queries)
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => msnry.layout(), 150);
  });

  // ── Filtre par couleur ───────────────────────────────────────────────────

  const filterBtn       = document.getElementById('filter-btn');
  const colorFilter     = document.getElementById('color-filter');
  const filterPanel     = document.getElementById('filter-panel');
  const filterSwatches  = document.getElementById('filter-swatches');
  const filterResetBtn  = document.getElementById('filter-panel-reset');
  const mainCreations   = document.querySelector('main.creations');
  const emptyState      = document.getElementById('filter-empty-state');

  if (filterBtn && colorFilter && filterPanel && filterSwatches) {

    // Alias : formes fautives/plurielles qui désignent en réalité la même couleur
    const COLOR_ALIASES = {
      'bleus': 'bleu',
      'jaunes': 'jaune',
      'verts': 'vert'
    };

    // Teintes de référence (utilisées pour dessiner les pastilles)
    const COLOR_HEX = {
      'bleu': '#4C8DFF',
      'vert': '#4CAF6D',
      'jaune': '#F2C94C',
      'rouge': '#E15554',
      'orange': '#F2994A',
      'rose': '#F2A6C9',
      'violet': '#9B6BD9',
      'mauve': '#C9A0DC',
      'brun': '#8B5E3C',
      'marron': '#6F4423',
      'gris': '#A0A6AD',
      'beige': '#D9C6A5',
      'noir': '#2B2B2E',
      'blanc': '#F5F5F0',
      'argenté': '#C7CDD1',
      'magenta': '#D6249F',
      'doré': '#D4AF37',
      'bordeau': '#6E1E3A',
      'bordeaux': '#6E1E3A',
      'turquoise': '#2DD4BF',
      'cyan': '#22D3EE',
      'kaki': '#8A8F5C',
      'olive': '#6B6B1F',
      'marine': '#1E2A5E',
    };

    // Couleur de secours déterministe (hash) pour toute future couleur
    // ajoutée dans les data-colors mais absente du dictionnaire ci-dessus.
    function fallbackHue(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return Math.abs(hash) % 360;
    }

    function normalizeColor(raw) {
      const key = raw.trim().toLowerCase();
      return COLOR_ALIASES[key] || key;
    }

    function hexForColor(key) {
      return COLOR_HEX[key] || `hsl(${fallbackHue(key)}, 55%, 60%)`;
    }

    function labelForColor(key) {
      return key.charAt(0).toUpperCase() + key.slice(1);
    }

    // Renvoie les couleurs normalisées d'un .grid-item
    function getItemColors(item) {
      const img = item.querySelector('.prspk-thumb');
      const raw = (img && img.dataset.colors) || '';
      return raw.split(',').map(normalizeColor).filter(Boolean);
    }

    // ── Génère la liste des pastilles à partir des dessins réellement présents ──
    // Pas de nom affiché : chaque pastille porte juste sa teinte, avec le nom
    // de la couleur en info-bulle (title / aria-label) pour rester accessible.
    function buildSwatches() {
      const freq = new Map(); // couleur normalisée -> nombre de dessins

      grid.querySelectorAll('.grid-item').forEach(item => {
        getItemColors(item).forEach(color => {
          freq.set(color, (freq.get(color) || 0) + 1);
        });
      });

      const sorted = Array.from(freq.keys()).sort((a, b) => freq.get(b) - freq.get(a));

      filterSwatches.innerHTML = '';
      sorted.forEach(color => {
        const label = labelForColor(color);
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'filter-chip';
        chip.dataset.color = color;
        chip.title = label;
        chip.setAttribute('aria-label', label);
        chip.setAttribute('aria-pressed', 'false');
        chip.style.setProperty('--chip-color', hexForColor(color));
        chip.innerHTML = '<span class="filter-chip-dot"></span>';
        filterSwatches.appendChild(chip);
      });
    }

    buildSwatches();

    // ── État de sélection + application du filtre ──────────────────────────
    // Logique "ET inclusif" : un dessin reste visible s'il possède TOUTES
    // les couleurs sélectionnées (il peut en avoir d'autres en plus).
    const selectedColors = new Set();

    function applyFilter() {
      let visibleCount = 0;

      grid.querySelectorAll('.grid-item').forEach(item => {
        const itemColors = getItemColors(item);
        const visible = selectedColors.size === 0 ||
          Array.from(selectedColors).every(color => itemColors.includes(color));
        item.classList.toggle('is-hidden', !visible);
        if (visible) visibleCount++;
      });

      if (mainCreations) {
        mainCreations.classList.toggle('filter-active', selectedColors.size > 0);
      }

      const noResults = selectedColors.size > 0 && visibleCount === 0;
      if (emptyState) emptyState.hidden = !noResults;
      grid.style.display = noResults ? 'none' : '';

      msnry.layout();
    }

    filterSwatches.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;

      const color = chip.dataset.color;
      if (selectedColors.has(color)) {
        selectedColors.delete(color);
        chip.classList.remove('is-active');
        chip.setAttribute('aria-pressed', 'false');
      } else {
        selectedColors.add(color);
        chip.classList.add('is-active');
        chip.setAttribute('aria-pressed', 'true');
      }
      applyFilter();
    });

    if (filterResetBtn) {
      filterResetBtn.addEventListener('click', () => {
        selectedColors.clear();
        filterSwatches.querySelectorAll('.filter-chip.is-active').forEach(chip => {
          chip.classList.remove('is-active');
          chip.setAttribute('aria-pressed', 'false');
        });
        applyFilter();
      });
    }

    // ── Positionnement du panneau (calculé, pas en CSS) ─────────────────────
    // #filter-panel vit désormais en fin de <main class="creations"> (voir
    // creations.html), et non plus imbriqué dans le bouton, pour que son
    // backdrop-filter puisse réellement flouter les dessins derrière lui.
    // On calcule donc sa position à l'écran par rapport au bouton, en JS.
    function positionFilterPanel() {
      const btnRect  = filterBtn.getBoundingClientRect();
      const mainRect = mainCreations.getBoundingClientRect();

      // Distance entre le bord droit du bouton et le bord droit de main.creations
      const rightOffset = mainRect.right - btnRect.right;
      // Distance entre le bas du bouton et le haut de main.creations, + un petit espace
      const topOffset = (btnRect.bottom - mainRect.top) + 14;

      filterPanel.style.top = topOffset + 'px';
      filterPanel.style.right = rightOffset + 'px';
    }

    // ── Ouverture / fermeture du panneau ────────────────────────────────────
    function closeFilterPanel() {
      filterBtn.classList.remove('is-open');
      filterPanel.classList.remove('is-open');
      filterBtn.setAttribute('aria-expanded', 'false');
      filterPanel.setAttribute('aria-hidden', 'true');
      window.removeEventListener('resize', positionFilterPanel);
    }

    function openFilterPanel() {
      positionFilterPanel();
      filterBtn.classList.add('is-open');
      filterPanel.classList.add('is-open');
      filterBtn.setAttribute('aria-expanded', 'true');
      filterPanel.setAttribute('aria-hidden', 'false');
      window.addEventListener('resize', positionFilterPanel);
    }

    filterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      filterPanel.classList.contains('is-open') ? closeFilterPanel() : openFilterPanel();
    });

    filterPanel.addEventListener('click', (e) => e.stopPropagation());

    document.addEventListener('click', (e) => {
      if (!filterBtn.contains(e.target) && !filterPanel.contains(e.target)) {
        closeFilterPanel();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeFilterPanel();
    });

    // Utilitaire conservé pour un usage éventuel en console
    window.filterCreationsByColor = function(color) {
      selectedColors.clear();
      if (color) selectedColors.add(normalizeColor(color));
      filterSwatches.querySelectorAll('.filter-chip').forEach(chip => {
        const active = selectedColors.has(chip.dataset.color);
        chip.classList.toggle('is-active', active);
        chip.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      applyFilter();
    };
  }
});



// ============================= 3. BARRE DE NAVIGATION MOBILE - RÉTRÉCISSEMENT EN BAS DE PAGE =============================

document.addEventListener('DOMContentLoaded', () => {
  const mobileNav = document.querySelector('.mobile-nav');
  const navBlurGradient = document.querySelector('.nav-blur-gradient');
  
  // Vérifier si la barre de navigation mobile existe (seulement sur mobile)
  if (!mobileNav) return;
  
  let ticking = false;
  const scrollThreshold = 5; // Tolérance très petite pour détecter le bas exact
  
  // Fonction pour gérer le rétrécissement de la barre + la descente du flou
  const handleScroll = () => {
    if (ticking) return;
    
    ticking = true;
    requestAnimationFrame(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
      
      // Tout en bas du footer : la barre rétrécit, le flou descend
      if (distanceFromBottom <= scrollThreshold) {
        mobileNav.classList.add('at-bottom');
        if (navBlurGradient) navBlurGradient.classList.add('at-bottom');
      } 
      // Ailleurs : la barre retrouve sa taille normale, le flou remonte
      else {
        mobileNav.classList.remove('at-bottom');
        if (navBlurGradient) navBlurGradient.classList.remove('at-bottom');
      }
      
      ticking = false;
    });
  };
  
  // Écouter l'événement de scroll avec throttling
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  // Vérifier l'état initial
  handleScroll();
});



// ============================= 4. ANTI CLIQUE GAUCHE =============================

// Bloque clic droit partout
document.addEventListener("contextmenu", e => e.preventDefault());



// ============================= 5. GESTION DU MODE SOMBRE =============================

document.addEventListener("DOMContentLoaded", () => {
  const root = document.documentElement;
  const savedTheme = localStorage.getItem("theme");

  // Appliquer le thème partout
  if (savedTheme === "dark") {
    root.setAttribute("data-theme", "dark");
  }

  // Gestion de la toggle (seulement si elle existe)
  const darkToggle = document.getElementById("dark-mode");
  if (!darkToggle) return;

  darkToggle.checked = savedTheme === "dark";

  darkToggle.addEventListener("change", () => {
    if (darkToggle.checked) {
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.removeAttribute("data-theme");
      localStorage.removeItem("theme");
    }
  });
});



// ============================= 6. FAQ DÉROULANTE =============================

document.addEventListener('DOMContentLoaded', () => {
  const faqQuestions = document.querySelectorAll('.faq-question');

  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const faqItem = question.closest('.faq-item');
      const isActive = faqItem.classList.contains('active');

      // Fermer tous les autres éléments de FAQ
      document.querySelectorAll('.faq-item.active').forEach(item => {
        if (item !== faqItem) {
          item.classList.remove('active');
          const btn = item.querySelector('.faq-question');
          if (btn) {
            btn.setAttribute('aria-expanded', 'false');
          }
        }
      });

      // Basculer l'élément actuel
      if (isActive) {
        faqItem.classList.remove('active');
        question.setAttribute('aria-expanded', 'false');
      } else {
        faqItem.classList.add('active');
        question.setAttribute('aria-expanded', 'true');
      }
    });
  });
});



// ============================= 7. LOADER PERSPIKATIVE =============================

document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("site-loader");

  if (!loader) return;

  const hasSeenLoader = sessionStorage.getItem("perspikative-loader");

  if (hasSeenLoader) {
    loader.style.display = "none";
  } else {
    sessionStorage.setItem("perspikative-loader", "true");
  }
});



// ============================= 8. BOUTON FLOTTANT DE RECHERCHE - MASQUAGE AU SCROLL =============================

document.addEventListener('DOMContentLoaded', () => {
  const searchBtn = document.querySelector('.search-float-btn');
  
  // Vérifier si le bouton existe
  if (!searchBtn) return;
  
  let lastScrollTop = 0;
  let ticking = false;
  const scrollThreshold = 5; // Tolérance très petite pour détecter le bas exact
  
  // Fonction pour gérer le masquage/affichage du bouton
  const handleScroll = () => {
    if (ticking) return;
    
    ticking = true;
    requestAnimationFrame(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
      
      // Masquer le bouton uniquement quand on arrive tout en bas
      if (distanceFromBottom <= scrollThreshold) {
        searchBtn.classList.add('hide');
      } 
      // Afficher le bouton quand on remonte et qu'on n'est plus tout en bas
      else {
        searchBtn.classList.remove('hide');
      }
      
      lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
      ticking = false;
    });
  };
  
  // Écouter l'événement de scroll avec throttling
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  // Vérifier l'état initial
  handleScroll();
});



// ============================= 9. ANIMATION D'APPARITION DU FOOTER =============================

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    // Si le footer est visible à au moins 10% dans l'écran
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
    }
  });
}, { threshold: 0.1 }); // Se déclenche quand 10% du footer apparaît

observer.observe(document.querySelector('footer'));



// ============================= 10. PARALLAX SUR LES IMAGES DE L'ACCUEIL =============================

document.addEventListener('DOMContentLoaded', () => {
  if (window.innerWidth <= 768) return;

  // Déplacement max en px selon z-index (devant = plus grand)
  const DEPTH = {
    'pos-8': 40,   // z 20  — tout devant
    'pos-2': 30,   // z 14
    'pos-6': 26,   // z 12
    'pos-3': 22,   // z 10
    'pos-4': 16,   // z  7
    'pos-7': 14,   // z  6
    'pos-1':  4,   // z -20 — fond
    'pos-5':  4,   // z -20 — fond
  };

  // Vitesse de lerp par calque : les images de devant suivent plus vite
  const SMOOTH = {
    'pos-8': 0.10,
    'pos-2': 0.09,
    'pos-6': 0.08,
    'pos-3': 0.07,
    'pos-4': 0.06,
    'pos-7': 0.055,
    'pos-1': 0.04,
    'pos-5': 0.04,
  };

  const imgData = Array.from(document.querySelectorAll('.p-img')).map(img => {
    const posClass = [...img.classList].find(c => c.startsWith('pos-'));
    const maxDist  = posClass ? (DEPTH[posClass]  ?? 12)   : 12;
    const smooth   = posClass ? (SMOOTH[posClass] ?? 0.06) : 0.06;

    // Lire la rotation initiale depuis le CSS (transform ou rotate)
    const computed = window.getComputedStyle(img);
    const matrix   = new DOMMatrix(computed.transform);
    const rot      = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);

    return { el: img, maxDist, smooth, rot, cx: 0, cy: 0 };
  });

  let targetX = 0, targetY = 0;

  const lerp = (a, b, t) => a + (b - a) * t;

  function animate() {
    imgData.forEach(item => {
      item.cx = lerp(item.cx, targetX, item.smooth);
      item.cy = lerp(item.cy, targetY, item.smooth);

      const x = item.cx * -item.maxDist;
      const y = item.cy * -item.maxDist;

      item.el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${item.rot}deg)`;
    });

    requestAnimationFrame(animate);
  }

  window.addEventListener('mousemove', (e) => {
    // Normalise entre -1 et 1
    targetX = (e.clientX - window.innerWidth  / 2) / (window.innerWidth  / 2);
    targetY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
  }, { passive: true });

  document.addEventListener('mouseleave', () => { targetX = 0; targetY = 0; });

  requestAnimationFrame(animate);
});



// ============================= 12. ANIMATION FONDU AU SCROLL - GRILLE MASONRY =============================

document.addEventListener('DOMContentLoaded', () => {
  const imgs = document.querySelectorAll('.creations-grid .prspk-thumb');
  if (!imgs.length) return;

  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  const LAYOUT_DELAY = 1000;
  const ANIM_DURATION = 400;
  const STAGGER = 55;

  // 1) Rendre toutes les images invisibles immédiatement
  imgs.forEach(img => {
    img.style.opacity = '0';
    img.style.transform = 'translateY(10px)';
    img.style.transition = 'none';
    img.dataset.revealed = 'false';
  });

  // 2) Après le délai layout, activer le système de scroll
  setTimeout(() => {
    const reveal = (img, delay) => {
      img.style.transition = `opacity ${ANIM_DURATION}ms ease ${delay}ms,
                              transform ${ANIM_DURATION}ms ease ${delay}ms`;
      img.style.opacity = '1';
      img.style.transform = 'translateY(0)';
      img.dataset.revealed = 'true';
    };

    // 3) Révéler d'abord les images déjà dans le viewport
    let initialIndex = 0;
    imgs.forEach(img => {
      const rect = img.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) {
        reveal(img, initialIndex * STAGGER);
        initialIndex++;
      }
    });

    // 4) Observer les images hors viewport — rootMargin à 0 sur mobile pour ne pas rater d'images
    const observer = new IntersectionObserver((entries) => {
      const appearing = entries.filter(e => e.isIntersecting && e.target.dataset.revealed === 'false');
      appearing.forEach((entry, i) => {
        reveal(entry.target, i * STAGGER);
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.05,
      rootMargin: isMobile ? '0px' : '0px 0px -20px 0px'
    });

    imgs.forEach(img => {
      if (img.dataset.revealed === 'false') {
        observer.observe(img);
      }
    });

  }, LAYOUT_DELAY);
});


// ============================= 13. SERVICE WORKER =============================

if ('serviceWorker' in navigator) {

  navigator.serviceWorker.register('/sw.js')
    .then((registration) => {

      registration.update();

      setInterval(() => {
        registration.update();
      }, 60000);

    });

  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => {
      window.location.reload();
    }
  );
}

// ============================= FIN DU SCRIPT =============================