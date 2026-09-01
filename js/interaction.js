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

  function init(canvas) {
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    canvas.addEventListener('wheel', onWheel, { passive: false });
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
    const cv = EW.Renderer.getCanvas();
    cv.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: false });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: S.view.z };
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

    // Moduļu vilkšana (2. solim)
    if (EW.ModulesInteraction && typeof EW.ModulesInteraction.onPointerMove === 'function') {
      const handled = EW.ModulesInteraction.onPointerMove(e);
      if (handled) {
        cv.style.cursor = 'grabbing';
        return;
      }
    }

    // Kursors virs moduļiem (hover)
    if (!pointers.size) {
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
    e.preventDefault();
    const cv = EW.Renderer.getCanvas();
    const r = cv.getBoundingClientRect();
    setZoom(S.view.z * Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  }

  function placeOrigin(e) {
    const cv = EW.Renderer.getCanvas();
    const { W, H } = EW.Renderer.getDims();
    const r = cv.getBoundingClientRect();
    const p = Grid.s2w(e.clientX - r.left, e.clientY - r.top, W, H);
    const g = S.G();
    g.dx = Math.round(p.x * 1000) / 1000;
    g.dy = Math.round(p.y * 1000) / 1000;
    if (EW.UI) EW.UI.syncInputs();
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
    updateHud
  };
})();
