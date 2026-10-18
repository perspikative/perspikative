/* ═══ ZOOM PLEIN ECRAN OEUVRES LIGHTBOX ═══ */


// ─── Menu mobile (burger) ────────────────────────────────────────────────
(function () {
    const menuToggle = document.getElementById('menuToggle');
    menuToggle.addEventListener('change', (e) => {
      document.body.classList.toggle('menu-open', e.target.checked);
    });
  })();

// ─── Zoom plein écran de l'œuvre (clic sur l'image en lightbox) ─────────
(function () {
    const sourceImg   = document.getElementById('lightbox-img');
    const zoomOverlay = document.getElementById('zoom-overlay');
    const zoomImg     = document.getElementById('zoom-img');
    const lightbox    = document.getElementById('lightbox');

    if (!sourceImg || !zoomOverlay || !zoomImg) return;

    // ─── Réglages ────────────────────────────────────────────────────────
    const reduceMotion      = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const OPEN_MS           = 560;   // ouverture (miniature → plein écran)
    const CLOSE_MS          = 480;   // fermeture (retour à la miniature)
    const ZOOM_MS           = 320;   // double-clic / double-tap / touches + -
    const WHEEL_MS          = 140;   // lissage de la molette
    const SETTLE_MS         = 300;   // rattrapage après un geste qui dépasse les limites
    const DOUBLE_TAP_MS     = 280;
    const TAP_SLOP          = 6;     // px de tolérance avant de considérer un « glissement »
    const FULLSCREEN_RADIUS = 12;    // rayon des coins en plein écran (px, taille VISUELLE)
    const MIN_DOUBLE_ZOOM   = 2;     // niveau du zoom au double-clic

    const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easeOut   = t => 1 - Math.pow(1 - t, 3);
    const clamp     = (v, a, b) => Math.min(b, Math.max(a, v));

    // ─── État ────────────────────────────────────────────────────────────
    // status : 'closed' | 'opening' | 'open' | 'closing'
    let status = 'closed';
    // view : position/échelle courantes de l'image (coordonnées écran)
    //   x, y   : coin haut-gauche   s : échelle UNIFORME
    //   cx, cy : rognage (px de l'image) pour les miniatures en object-fit: cover
    //   r      : rayon des coins VISUEL (px à l'écran)
    let view = { x: 0, y: 0, s: 1, cx: 0, cy: 0, r: 0 };
    // fit : taille de l'image « ajustée à l'écran » (échelle 1) + limites de zoom
    const fit = { w: 0, h: 0, max: 4, dbl: MIN_DOUBLE_ZOOM };
    let anim = null;
    let refitPending = false;

    // L'image garde TOUJOURS son ratio : l'élément a la taille finale (échelle 1)
    // et on ne fait que le translater / l'agrandir uniformément → plus de déformation.
    Object.assign(zoomImg.style, {
      position: 'fixed', top: '0', left: '0', margin: '0',
      maxWidth: 'none', maxHeight: 'none', objectFit: 'fill',
      transformOrigin: '0 0', transition: 'none',
      borderRadius: '0', boxShadow: 'none',
      touchAction: 'none', userSelect: 'none', webkitUserSelect: 'none'
    });
    zoomImg.draggable = false;
    zoomImg.addEventListener('dragstart', e => e.preventDefault());
    zoomOverlay.style.touchAction = 'none';
    zoomOverlay.setAttribute('role', 'dialog');
    zoomOverlay.setAttribute('aria-label', 'Image en plein écran');

    // ─── Géométrie ───────────────────────────────────────────────────────
    const vw = () => document.documentElement.clientWidth || window.innerWidth;
    const vh = () => window.innerHeight;
    const padding = () => (vw() <= 700 ? 16 : 48);

    function computeFit() {
      const r  = sourceImg.getBoundingClientRect();
      const nW = sourceImg.naturalWidth  || r.width;
      const nH = sourceImg.naturalHeight || r.height;
      const p  = padding();
      // Jamais d'agrandissement au-delà du natif, toujours dans le viewport moins la marge
      const ratio = Math.max(0.05, Math.min((vw() - p * 2) / nW, (vh() - p * 2) / nH, 1));
      fit.w = nW * ratio;
      fit.h = nH * ratio;

      // Zoom max : ~3× la taille « 1 pixel d'image = 1 pixel d'écran »
      const dpr = window.devicePixelRatio || 1;
      const oneToOne = nW / dpr / fit.w;
      fit.max = Math.min(10, Math.max(4, oneToOne * 3));
      fit.dbl = MIN_DOUBLE_ZOOM;

      zoomImg.style.width  = fit.w + 'px';
      zoomImg.style.height = fit.h + 'px';
    }

    function fitView() {
      return { x: (vw() - fit.w) / 2, y: (vh() - fit.h) / 2, s: 1, cx: 0, cy: 0, r: FULLSCREEN_RADIUS };
    }

    function readRadius(el) {
      const cs = getComputedStyle(el);
      const raw = cs.borderTopLeftRadius || '0';
      const n = parseFloat(raw) || 0;
      if (!n) return 0;
      if (raw.includes('%')) {
        const b = el.getBoundingClientRect();
        return (n / 100) * Math.min(b.width, b.height);
      }
      return n;
    }

    // État de départ/arrivée = l'image de la lightbox, telle qu'on la voit
    function sourceState() {
      const r  = sourceImg.getBoundingClientRect();
      const cs = getComputedStyle(sourceImg);
      const cover = cs.objectFit === 'cover';

      const sx = r.width / fit.w, sy = r.height / fit.h;
      const s  = cover ? Math.max(sx, sy) : Math.min(sx, sy); // échelle uniforme
      const w  = fit.w * s, h = fit.h * s;

      // Rayon : celui de l'image, ou à défaut celui de son conteneur si celui-ci rogne
      let radius = readRadius(sourceImg);
      const parent = sourceImg.parentElement;
      if (!radius && parent && getComputedStyle(parent).overflow !== 'visible') radius = readRadius(parent);

      return {
        x: r.left + (r.width  - w) / 2,
        y: r.top  + (r.height - h) / 2,
        s,
        cx: cover ? Math.max(0, (w - r.width)  / 2) / s : 0,
        cy: cover ? Math.max(0, (h - r.height) / 2) / s : 0,
        r: radius
      };
    }

    // Limites de déplacement pour une échelle donnée (image centrée si plus petite que l'écran)
    function bounds(s) {
      const W = fit.w * s, H = fit.h * s, w = vw(), h = vh();
      return {
        minX: W <= w ? (w - W) / 2 : w - W,  maxX: W <= w ? (w - W) / 2 : 0,
        minY: H <= h ? (h - H) / 2 : h - H,  maxY: H <= h ? (h - H) / 2 : 0
      };
    }

    // Effet « élastique » quand on tire au-delà des bords pendant un geste
    const rubber = d => (d * 0.5) / (1 + d / 120);
    const soft = (v, min, max) => v < min ? min - rubber(min - v) : v > max ? max + rubber(v - max) : v;

    // Nouvelle position pour que le point (px, py) de l'écran reste fixe quand l'échelle change
    function zoomAt(base, s, px, py) {
      const k = s / base.s;
      return { x: px - (px - base.x) * k, y: py - (py - base.y) * k };
    }

    // ─── Rendu ───────────────────────────────────────────────────────────
    function render() {
      zoomImg.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
      // Le rayon est exprimé dans le repère de l'image → divisé par l'échelle
      // pour que les coins gardent la même taille visuelle (et restent circulaires).
      const rr = view.r / view.s;
      zoomImg.style.clipPath = `inset(${view.cy}px ${view.cx}px round ${rr}px)`;
    }

    function updateCursor(dragging) {
      zoomImg.style.cursor = dragging ? 'grabbing' : (view.s > 1.01 ? 'grab' : '');
    }

    // ─── Animation (une seule mécanique pour ouverture, fermeture, zooms) ─
    const KEYS = ['x', 'y', 's', 'cx', 'cy', 'r'];

    function stopAnim() {
      if (anim) { cancelAnimationFrame(anim.raf); anim = null; zoomImg.style.willChange = ''; }
    }

    function animateTo(to, ms, ease, done) {
      stopAnim();
      const target = Object.assign({}, view, to);
      if (reduceMotion || ms <= 0) {
        Object.assign(view, target);
        render(); updateCursor(false);
        if (done) done();
        return;
      }
      const from = Object.assign({}, view);
      const t0 = performance.now();
      const a = anim = { to: target, raf: 0 };
      zoomImg.style.willChange = 'transform';
      const step = (now) => {
        if (anim !== a) return;
        const p = Math.min(1, (now - t0) / ms);
        const e = ease(p);
        for (const k of KEYS) view[k] = from[k] + (target[k] - from[k]) * e;
        render();
        if (p < 1) {
          a.raf = requestAnimationFrame(step);
        } else {
          anim = null;
          zoomImg.style.willChange = '';
          updateCursor(false);
          if (done) done();
        }
      };
      a.raf = requestAnimationFrame(step);
    }

    // ─── Ouverture / fermeture ───────────────────────────────────────────
    async function openZoom() {
      if (status !== 'closed' || !sourceImg.src) return;
      status = 'opening';

      zoomImg.src = sourceImg.currentSrc || sourceImg.src;
      zoomImg.alt = sourceImg.alt || '';
      try { await zoomImg.decode(); } catch (_) { /* image déjà en cache : on continue */ }
      if (status !== 'opening') return; // fermé entre-temps

      computeFit();
      const start = sourceState();      // à mesurer AVANT de masquer la source
      Object.assign(view, start);
      render();

      sourceImg.classList.add('zoom-source-hidden');
      zoomOverlay.classList.add('active');

      animateTo(fitView(), OPEN_MS, easeInOut, () => {
        status = 'open';
        if (refitPending) { refitPending = false; refit(); }
      });
    }

    function finishClose() {
      sourceImg.classList.remove('zoom-source-hidden');
      zoomOverlay.classList.remove('active');
      zoomImg.removeAttribute('src');
      zoomImg.style.willChange = '';
      zoomImg.style.cursor = '';
      status = 'closed';
    }

    function closeZoom() {
      if (status !== 'open') return;
      status = 'closing';
      pointers.clear();
      gesture = null;
      clearTimeout(tapTimer);
      // Revient à la miniature depuis l'état courant (même si on est zoomé / déplacé)
      animateTo(sourceState(), CLOSE_MS, easeInOut, finishClose);
    }

    // Annulation brutale (lightbox fermée ou image changée pendant le zoom)
    function hardReset() {
      stopAnim();
      pointers.clear();
      gesture = null;
      clearTimeout(tapTimer);
      refitPending = false;
      finishClose();
    }

    function refit() {
      stopAnim();
      pointers.clear();
      gesture = null;
      computeFit();
      Object.assign(view, fitView());
      render(); updateCursor(false);
    }

    // ─── Zoom à un point donné ───────────────────────────────────────────
    function zoomBy(factor, px, py, ms) {
      if (status !== 'open') return;
      const base = anim ? anim.to : view;   // on cumule sur la cible en cours (molette fluide)
      const s = clamp(base.s * factor, 1, fit.max);
      const p = zoomAt(base, s, px, py);
      const b = bounds(s);
      animateTo({ s, x: clamp(p.x, b.minX, b.maxX), y: clamp(p.y, b.minY, b.maxY) }, ms, easeOut);
    }

    function toggleZoom(px, py) {
      if (status !== 'open') return;
      if (view.s > 1.05) {
        animateTo(fitView(), ZOOM_MS, easeOut);
      } else {
        const s = fit.dbl;
        const p = zoomAt(view, s, px, py);
        const b = bounds(s);
        animateTo({ s, x: clamp(p.x, b.minX, b.maxX), y: clamp(p.y, b.minY, b.maxY) }, ZOOM_MS, easeOut);
      }
    }

    // Ramène l'image dans les limites après un geste (pinch trop fort, tirage au bord…)
    function settle() {
      const s = clamp(view.s, 1, fit.max);
      const p = s === view.s ? view : zoomAt(view, s, vw() / 2, vh() / 2);
      const b = bounds(s);
      const x = clamp(p.x, b.minX, b.maxX);
      const y = clamp(p.y, b.minY, b.maxY);
      if (Math.abs(x - view.x) < 0.5 && Math.abs(y - view.y) < 0.5 && Math.abs(s - view.s) < 0.001) return;
      animateTo({ x, y, s }, SETTLE_MS, easeOut);
    }

    // ─── Gestes : un doigt/souris = déplacer, deux doigts = pincer ───────
    const pointers = new Map();
    let gesture = null;
    let lastTap = { t: 0, x: 0, y: 0 };
    let tapTimer = null;

    function beginGesture(first) {
      const pts = [...pointers.values()];
      if (first) gesture = { moved: false, pinched: false };
      const base = { x: view.x, y: view.y, s: view.s };
      if (pts.length >= 2) {
        const [a, b] = pts;
        gesture.mode = 'pinch';
        gesture.pinched = true;
        gesture.moved = true;
        gesture.d0 = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        gesture.mx0 = (a.x + b.x) / 2;
        gesture.my0 = (a.y + b.y) / 2;
        gesture.base = base;
      } else {
        gesture.mode = 'pan';
        gesture.ax = pts[0].x;
        gesture.ay = pts[0].y;
        gesture.base = base;
      }
    }

    zoomImg.addEventListener('pointerdown', (e) => {
      if (status !== 'open') return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      stopAnim();
      try { zoomImg.setPointerCapture(e.pointerId); } catch (_) {}
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      beginGesture(pointers.size === 1);
      if (pointers.size === 1) updateCursor(true);
    });

    zoomImg.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (!p || !gesture) return;
      p.x = e.clientX; p.y = e.clientY;

      if (gesture.mode === 'pinch') {
        const [a, b] = [...pointers.values()];
        const d  = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const s  = clamp(gesture.base.s * d / gesture.d0, 0.7, fit.max * 1.25);
        const k  = s / gesture.base.s;
        // Le point de l'image qui était sous le milieu des doigts les suit
        const x = mx - (gesture.mx0 - gesture.base.x) * k;
        const y = my - (gesture.my0 - gesture.base.y) * k;
        const bd = bounds(s);
        view.s = s;
        view.x = soft(x, bd.minX, bd.maxX);
        view.y = soft(y, bd.minY, bd.maxY);
        render();
      } else {
        const dx = e.clientX - gesture.ax, dy = e.clientY - gesture.ay;
        if (!gesture.moved && Math.hypot(dx, dy) > TAP_SLOP) gesture.moved = true;
        if (view.s > 1.001) {
          const bd = bounds(view.s);
          view.x = soft(gesture.base.x + dx, bd.minX, bd.maxX);
          view.y = soft(gesture.base.y + dy, bd.minY, bd.maxY);
          render();
        }
      }
    });

    function endPointer(e, cancelled) {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      try { zoomImg.releasePointerCapture(e.pointerId); } catch (_) {}
      if (!gesture) return;

      if (pointers.size > 0) { beginGesture(false); return; } // 2 doigts → 1 : on reprend en déplacement

      const wasTap = !cancelled && !gesture.moved && !gesture.pinched;
      const wasMoved = gesture.moved;
      gesture = null;
      updateCursor(false);

      if (wasTap) handleTap(e);
      else if (wasMoved) settle();
    }
    zoomImg.addEventListener('pointerup',     (e) => endPointer(e, false));
    zoomImg.addEventListener('pointercancel', (e) => endPointer(e, true));

    // Simple clic (souris) : dézoome si on est zoomé, sinon ferme.
    // Simple tap (tactile) : rien (la fermeture se fait en touchant le fond).
    // Double clic / double tap : zoom ↔ ajusté, centré sur le point touché.
    function handleTap(e) {
      const now = performance.now();
      const x = e.clientX, y = e.clientY, type = e.pointerType;
      const isDouble = now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(x - lastTap.x, y - lastTap.y) < 30;

      clearTimeout(tapTimer);
      if (isDouble) {
        lastTap.t = 0;
        toggleZoom(x, y);
        return;
      }
      lastTap = { t: now, x, y };
      tapTimer = setTimeout(() => {
        lastTap.t = 0;
        if (type !== 'mouse' || status !== 'open') return;
        if (view.s > 1.05) animateTo(fitView(), ZOOM_MS, easeOut);
        else closeZoom();
      }, DOUBLE_TAP_MS);
    }

    // Le « click » natif ne doit pas remonter à l'overlay (qui ferme tout)
    zoomImg.addEventListener('click', (e) => e.stopPropagation());

    // Clic sur le fond (hors image) : ferme toujours, mobile et desktop
    zoomOverlay.addEventListener('click', (e) => {
      if (e.target === zoomOverlay) closeZoom();
    });

    // ─── Molette / pincement trackpad (Chrome, Firefox, Edge) ────────────
    zoomOverlay.addEventListener('wheel', (e) => {
      if (status === 'closed') return;
      e.preventDefault();
      if (status !== 'open') return;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vh() : 1;
      const dy = clamp(e.deltaY * unit, -300, 300);
      zoomBy(Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0018)), e.clientX, e.clientY, WHEEL_MS);
    }, { passive: false });

    // ─── Pincement trackpad Safari (desktop) ─────────────────────────────
    if ('GestureEvent' in window && !window.matchMedia('(pointer: coarse)').matches) {
      let g = null;
      zoomOverlay.addEventListener('gesturestart', (e) => {
        e.preventDefault();
        if (status !== 'open') return;
        stopAnim();
        g = { base: { x: view.x, y: view.y, s: view.s }, px: e.clientX, py: e.clientY };
      });
      zoomOverlay.addEventListener('gesturechange', (e) => {
        e.preventDefault();
        if (!g) return;
        const s = clamp(g.base.s * e.scale, 0.7, fit.max * 1.25);
        const p = zoomAt(g.base, s, g.px, g.py);
        const bd = bounds(s);
        view.s = s;
        view.x = soft(p.x, bd.minX, bd.maxX);
        view.y = soft(p.y, bd.minY, bd.maxY);
        render();
      });
      zoomOverlay.addEventListener('gestureend', (e) => {
        e.preventDefault();
        if (g) { g = null; settle(); }
      });
    }

    // ─── Clavier ─────────────────────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
      if (status !== 'open') return;
      if (e.key === 'Escape') closeZoom();
      else if (e.key === '+' || e.key === '=') zoomBy(1.5, vw() / 2, vh() / 2, ZOOM_MS);
      else if (e.key === '-' || e.key === '_') zoomBy(1 / 1.5, vw() / 2, vh() / 2, ZOOM_MS);
      else if (e.key === '0') animateTo(fitView(), ZOOM_MS, easeOut);
    });

    // ─── Redimensionnement / rotation ────────────────────────────────────
    sourceImg.addEventListener('click', openZoom);

    window.addEventListener('resize', () => {
      if (status === 'closed') return;
      if (status !== 'open') { refitPending = true; return; }
      refit();
    });

    // Si la lightbox parente se ferme, ou si son image change, on annule proprement le zoom
    const observer = new MutationObserver(() => {
      if (status === 'closed') return;
      if (lightbox && !lightbox.classList.contains('active')) hardReset();
    });
    if (lightbox) observer.observe(lightbox, { attributes: true, attributeFilter: ['class'] });

    const srcObserver = new MutationObserver(() => { if (status !== 'closed') hardReset(); });
    srcObserver.observe(sourceImg, { attributes: true, attributeFilter: ['src', 'srcset'] });
  })();
