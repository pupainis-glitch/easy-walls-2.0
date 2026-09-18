/**
 * Easy walls 2.0 — Lietotāja mijiedarbība (Pointer, Keyboard, Pan, Zoom)
 */
window.EW = window.EW || {};

(function() {
  const S = EW.State;
  const U = EW.Utils;
  const Grid = EW.Grid;

  const pointers = new Map();
  let pinch = null;
  let regionDrag = null;

  function init(canvas) {
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (e) => {
      // Novēršam pārlūka noklusēto izvēlni, ja uzklikšķināts uz mākslas darba
      if (EW.Artworks && typeof EW.Artworks.hitTestArtwork === 'function') {
        const { W, H } = EW.Renderer.getDims();
        const r = canvas.getBoundingClientRect();
        const wp = Grid.s2w(e.clientX - r.left, e.clientY - r.top, W, H);
        const hit = EW.Artworks.hitTestArtwork(wp);
        if (hit) {
          e.preventDefault();
        }
      }
    });

    if (EW.Artworks && typeof EW.Artworks.initDragAndDrop === 'function') {
      EW.Artworks.initDragAndDrop(canvas);
    }

    document.addEventListener('keydown', onKeyDown);
  }

  function setZoom(z, ax, ay) {
    const { W, H } = EW.Renderer.getDims();
    z = Math.min(20000, Math.max(1, z));
    const b = Grid.s2w(ax, ay, W, H);
    S.view.z = z;
    const a = Grid.s2w(ax, ay, W, H);
    S.view.x += b.x - a.x;
    S.view.y += b.y - a.y;
    EW.Renderer.draw();
  }

  let activeTransitionAnimId = null;

  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function stopViewTransition() {
    if (activeTransitionAnimId) {
      cancelAnimationFrame(activeTransitionAnimId);
      activeTransitionAnimId = null;
    }
    if (S.roomTransition) {
      S.roomTransition = null;
      EW.Renderer.draw();
    }
  }

  function animateViewTransition(startView, targetView, duration = 750, onDone = null) {
    stopViewTransition();
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, Math.max(0, elapsed / duration));
      const t = easeInOutCubic(progress);

      S.view.x = startView.x + (targetView.x - startView.x) * t;
      S.view.y = startView.y + (targetView.y - startView.y) * t;
      S.view.z = startView.z + (targetView.z - startView.z) * t;

      EW.Renderer.draw();

      if (progress < 1) {
        activeTransitionAnimId = requestAnimationFrame(step);
      } else {
        activeTransitionAnimId = null;
        if (S.roomTransition) {
          S.roomTransition = null;
          EW.Renderer.draw();
        }
        if (typeof onDone === 'function') onDone();
      }
    }

    // Uzstādām sākuma stāvokli nekavējoties
    S.view.x = startView.x;
    S.view.y = startView.y;
    S.view.z = startView.z;
    EW.Renderer.draw();

    activeTransitionAnimId = requestAnimationFrame(step);
  }

  function getBuildingOverviewView() {
    if (!S.img) return null;
    const { W, H } = EW.Renderer.getDims();
    const barEl = document.getElementById('bar');
    const barHeight = barEl ? barEl.getBoundingClientRect().height : 60;
    const m = S.mpp();
    const wm = S.img.width * m;
    const hm = S.img.height * m;
    return {
      x: wm / 2,
      y: hm / 2,
      z: Math.min(W / wm, (H - barHeight - 40) / hm) * 0.88
    };
  }

  function getRoomFocusView(rm, targetGrid) {
    if (!S.img) return null;
    const { W, H } = EW.Renderer.getDims();
    const barEl = document.getElementById('bar');
    const barHeight = barEl ? barEl.getBoundingClientRect().height : 60;
    const g = targetGrid || S.G();

    let rx, ry, rw, rh;
    if (g && g.region) {
      const reg = g.region;
      const minWx = reg.minWx !== undefined ? reg.minWx : reg.minX;
      const maxWx = reg.maxWx !== undefined ? reg.maxWx : reg.maxX;
      const minWy = reg.minWy !== undefined ? reg.minWy : reg.minY;
      const maxWy = reg.maxWy !== undefined ? reg.maxWy : reg.maxY;
      rw = Math.max(1, maxWx - minWx);
      rh = Math.max(1, maxWy - minWy);
      rx = (minWx + maxWx) / 2;
      ry = (minWy + maxWy) / 2;
    } else {
      rw = (rm && rm.widthM) ? rm.widthM : 30;
      rh = (rm && rm.heightM) ? rm.heightM : 20;
      rx = (g && g.dx !== undefined) ? g.dx : rw / 2;
      ry = (g && g.dy !== undefined) ? g.dy : rh / 2;
    }

    const availW = Math.max(200, W - 100);
    const availH = Math.max(200, H - barHeight - 80);
    const z = Math.min(availW / rw, availH / rh) * 0.90;

    return { x: rx, y: ry, z, rw, rh };
  }

  function zoomToRoomWithOverview(rm, targetGrid, onComplete) {
    const fullView = getBuildingOverviewView();
    const roomView = getRoomFocusView(rm, targetGrid);
    if (!fullView || !roomView) {
      fitView();
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    // Uzstādām pārejas metadatus rendererim
    S.roomTransition = {
      room: rm || { name: (targetGrid && targetGrid.name) || 'Zāle' },
      grid: targetGrid || S.G(),
      roomView,
      fullView,
      startTime: performance.now(),
      duration: 800
    };

    animateViewTransition(fullView, roomView, 800, onComplete);
  }

  function zoomToBuildingOverview(onComplete) {
    const fullView = getBuildingOverviewView();
    if (!fullView) return;
    const startView = { x: S.view.x, y: S.view.y, z: S.view.z };
    stopViewTransition();
    animateViewTransition(startView, fullView, 650, onComplete);
  }

  function fitView() {
    if (!S.img) return;
    const { W, H } = EW.Renderer.getDims();
    const barEl = document.getElementById('bar');
    const barHeight = barEl ? barEl.getBoundingClientRect().height : 60;
    const m = S.mpp();
    const wm = S.img.width * m;
    const hm = S.img.height * m;
    S.view.x = wm / 2;
    S.view.y = hm / 2;
    S.view.z = Math.min(W / wm, (H - barHeight - 40) / hm) * 0.9;
    EW.Renderer.draw();
  }

  function updateHud() {
    const hudPlan = document.getElementById('hudPlan');
    const hudCoord = document.getElementById('hudCoord');
    if (!hudPlan && !hudCoord) return;
    if (hudPlan) {
      hudPlan.innerHTML = S.planName ? `<b>${U.esc(S.planName)}</b>` : 'Nav ielādēts';
    }
    if (!hudCoord) return;
    if (!S.cursor || !S.grids.length) {
      hudCoord.textContent = '';
      return;
    }
    const g = Grid.w2g(S.G(), S.cursor.x, S.cursor.y);
    hudCoord.textContent = `· ${S.G().name}  x ${U.fmt(g.x)}  y ${U.fmt(g.y)} m`;
  }

  function onPointerDown(e) {
    stopViewTransition();
    const cv = EW.Renderer.getCanvas();
    cv.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: false });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: S.view.z };
    }

    if (S.mode === 'region') {
      const { W, H } = EW.Renderer.getDims();
      const r = cv.getBoundingClientRect();
      const wp = Grid.s2w(e.clientX - r.left, e.clientY - r.top, W, H);
      regionDrag = { startW: wp, currentW: wp };
      EW.Renderer.draw();
      return;
    }

    // Pārbaudām mākslas darbu mijiedarbību (vilkšana, konteksta izvēlne)
    if (EW.Artworks && typeof EW.Artworks.onPointerDown === 'function') {
      const artHandled = EW.Artworks.onPointerDown(e);
      if (artHandled) return;
    }

    // Pārbaudām moduļu mijiedarbību (2. solim)
    if (EW.ModulesInteraction && typeof EW.ModulesInteraction.onPointerDown === 'function') {
      const handled = EW.ModulesInteraction.onPointerDown(e);
      if (handled) return;
    }
  }

  function onPointerMove(e) {
    const cv = EW.Renderer.getCanvas();
    const { W, H } = EW.Renderer.getDims();
    const p = pointers.get(e.pointerId);
    const r = cv.getBoundingClientRect();
    S.cursor = Grid.s2w(e.clientX - r.left, e.clientY - r.top, W, H);
    updateHud();

    if (S.mode === 'region' && regionDrag) {
      regionDrag.currentW = S.cursor;
      EW.Renderer.draw();
      return;
    }

    // Mākslas darbu manipulācija (brīva 2D kustība / snapošana)
    if (EW.Artworks && typeof EW.Artworks.onPointerMove === 'function') {
      const artHandled = EW.Artworks.onPointerMove(e);
      if (artHandled) {
        cv.style.cursor = 'grabbing';
        return;
      }
    }

    // Moduļu vilkšana (2. solim)
    if (EW.ModulesInteraction && typeof EW.ModulesInteraction.onPointerMove === 'function') {
      const handled = EW.ModulesInteraction.onPointerMove(e);
      if (handled) {
        cv.style.cursor = 'grabbing';
        return;
      }
    }

    // Kursors virs mākslas darbiem vai moduļiem (hover)
    if (!pointers.size) {
      let overArt = false;
      if (EW.Artworks && typeof EW.Artworks.hitTestArtwork === 'function' && S.cursor) {
        if (EW.Artworks.hitTestArtwork(S.cursor)) {
          overArt = true;
        }
      }
      if (overArt) {
        cv.style.cursor = 'grab';
        return;
      }

      let overMod = false;
      if (EW.Modules && EW.Modules.Geometry && S.cursor) {
        for (let i = S.modules.length - 1; i >= 0; i--) {
          const m = S.modules[i];
          const g = S.grids.find(x => x.id === m.gridId) || S.G();
          if (!g || !g.visible) continue;
          const gp = Grid.w2g(g, S.cursor.x, S.cursor.y);
          if (EW.Modules.Geometry.containsPointInGrid(m, gp.x, gp.y)) {
            overMod = true;
            break;
          }
        }
      }
      cv.style.cursor = overMod ? 'grab' : '';
    }

    if (!p) {
      EW.Renderer.draw();
      return;
    }
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (Math.hypot(dx, dy) > 3) p.moved = true;
    p.x = e.clientX;
    p.y = e.clientY;

    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.d > 0) {
        setZoom(pinch.z * d / pinch.d, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      }
      return;
    }

    if (pointers.size === 1) {
      S.view.x -= dx / S.view.z;
      S.view.y -= dy / S.view.z;
      EW.Renderer.draw();
    }
  }

  function onPointerUp(e) {
    const cv = EW.Renderer.getCanvas();
    const p = pointers.get(e.pointerId);

    // Mākslas darba atlaišana
    if (EW.Artworks && typeof EW.Artworks.onPointerUp === 'function') {
      const artHandled = EW.Artworks.onPointerUp(e);
      if (artHandled) {
        cv.style.cursor = '';
        pointers.delete(e.pointerId);
        if (pointers.size < 2) pinch = null;
        return;
      }
    }

    // Moduļu pabeigšana / atlaišana (2. solim)
    if (EW.ModulesInteraction && typeof EW.ModulesInteraction.onPointerUp === 'function') {
      const handled = EW.ModulesInteraction.onPointerUp(e);
      if (handled) {
        cv.style.cursor = '';
        pointers.delete(e.pointerId);
        if (pointers.size < 2) pinch = null;
        return;
      }
    }

    if (S.mode === 'region' && regionDrag) {
      const g = S.G();
      if (g) {
        // Zāles reģions tiek saglabāts PASAULES (World) koordinātās metros pie ēkas sienām!
        // Tas ir neatkarīgs no režģa leņķa vai koordinātu sākumpunkta un nekad nerotē.
        const minWx = Math.min(regionDrag.startW.x, regionDrag.currentW.x);
        const maxWx = Math.max(regionDrag.startW.x, regionDrag.currentW.x);
        const minWy = Math.min(regionDrag.startW.y, regionDrag.currentW.y);
        const maxWy = Math.max(regionDrag.startW.y, regionDrag.currentW.y);
        const wM = maxWx - minWx, hM = maxWy - minWy;
        if (wM > 0.4 && hM > 0.4) {
          g.region = { minWx, maxWx, minWy, maxWy };
          if (EW.UI) {
            EW.UI.toast(`Iezīmēts zāles “${g.name}” reģions: ${wM.toFixed(1)} × ${hM.toFixed(1)} m`);
          }
          if (EW.Venues && typeof EW.Venues.onRegionDrawn === 'function') {
            EW.Venues.onRegionDrawn(g.region);
          }
        }
      }
      regionDrag = null;
      if (EW.UI) EW.UI.setMode('pan');
      EW.Renderer.draw();
      pointers.delete(e.pointerId);
      return;
    }

    if (p && !p.moved) {
      if (S.mode === 'origin') {
        placeOrigin(e);
      } else if (S.mode === 'calib' || S.mode === 'measure') {
        if (EW.UI && typeof EW.UI.addCalibPoint === 'function') {
          EW.UI.addCalibPoint(e);
        }
      } else {
        // Klikšķis var atlasīt moduli kanvasā
        if (EW.ModulesInteraction && typeof EW.ModulesInteraction.onClick === 'function') {
          EW.ModulesInteraction.onClick(e);
        }
      }
    }
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
  }

  function onPointerCancel(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
  }

  function onWheel(e) {
    stopViewTransition();
    e.preventDefault();
    const cv = EW.Renderer.getCanvas();
    const r = cv.getBoundingClientRect();
    setZoom(S.view.z * Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  }

  function placeOrigin(e) {
    const cv = EW.Renderer.getCanvas();
    const { W, H } = EW.Renderer.getDims();
    const r = cv.getBoundingClientRect();
    let p = Grid.s2w(e.clientX - r.left, e.clientY - r.top, W, H);
    const g = S.G();
    if (!g) return;

    // Inteliģentā piesaiste pie moduļu stūriem vai centriem, ja tādi ir
    let bestDist = 0.35; // 35 cm tolerances rādiuss
    let snapWorldPos = null;

    if (S.modules && S.modules.length && EW.Modules && EW.Modules.Geometry) {
      S.modules.forEach(m => {
        if (m.gridId !== g.id) return;
        // Moduļa centrs
        const centerWp = Grid.g2w(g, m.x, m.y);
        const dCenter = Math.hypot(p.x - centerWp.x, p.y - centerWp.y);
        if (dCenter < bestDist) {
          bestDist = dCenter;
          snapWorldPos = centerWp;
        }
        // Moduļa perimetra snap punkti un stūri
        const pts = EW.Modules.Geometry.getPointsInGrid(m);
        pts.forEach(pt => {
          const ptWp = Grid.g2w(g, pt.x, pt.y);
          const dPt = Math.hypot(p.x - ptWp.x, p.y - ptWp.y);
          if (dPt < bestDist) {
            bestDist = dPt;
            snapWorldPos = ptWp;
          }
        });
      });
    }

    if (snapWorldPos) {
      p = snapWorldPos;
    }

    const oldG = { ...g };
    g.dx = Math.round(p.x * 1000) / 1000;
    g.dy = Math.round(p.y * 1000) / 1000;

    // Pārrēķinām moduļu koordinātas, lai to fiziskā vieta uz plāna nemainītos!
    if (S.modules && S.modules.length) {
      S.modules.forEach(m => {
        if (m.gridId === g.id) {
          const wp = Grid.g2w(oldG, m.x, m.y);
          const newGp = Grid.w2g(g, wp.x, wp.y);
          m.x = Math.round(newGp.x * 1000) / 1000;
          m.y = Math.round(newGp.y * 1000) / 1000;
        }
      });
    }

    if (EW.UI) {
      EW.UI.syncInputs();
      if (snapWorldPos) {
        EW.UI.toast(`${g.name}: sākumpunkts piesaistīts moduļa mezglam`);
      }
    }
    EW.Renderer.draw();
  }

  function onKeyDown(e) {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
      if (S.mode !== 'pan') {
        if (EW.UI) EW.UI.setMode('pan');
        EW.Renderer.draw();
      }
      return;
    }

    // Moduļu vadības taustiņi (R - pagriezt, Delete - dzēst)
    if (EW.ModulesInteraction && typeof EW.ModulesInteraction.onKeyDown === 'function') {
      const handled = EW.ModulesInteraction.onKeyDown(e);
      if (handled) return;
    }

    const fine = e.shiftKey ? 0.01 : 0.05;
    const g = S.G();
    const map = {
      ArrowLeft: ['dx', -fine],
      ArrowRight: ['dx', fine],
      ArrowUp: ['dy', -fine],
      ArrowDown: ['dy', fine],
      q: ['angle', -1],
      e: ['angle', 1]
    };
    const m = map[e.key];
    if (!m) return;
    if ((m[0] === 'dx' || m[0] === 'dy') && g.locked) return;
    e.preventDefault();
    g[m[0]] = Math.round((g[m[0]] + m[1]) * 10000) / 10000;
    if (EW.UI) EW.UI.syncInputs();
    EW.Renderer.draw();
  }

  EW.Interaction = {
    init,
    setZoom,
    fitView,
    updateHud,
    getRegionDrag: () => regionDrag,
    zoomToRoomWithOverview,
    zoomToBuildingOverview,
    animateViewTransition,
    stopViewTransition,
    getBuildingOverviewView,
    getRoomFocusView
  };
})();
