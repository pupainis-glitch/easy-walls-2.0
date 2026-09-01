/**
 * Easy walls 2.0 — Kanvas zīmēšanas modulis
 */
window.EW = window.EW || {};

(function() {
  const S = EW.State;
  const U = EW.Utils;
  const Grid = EW.Grid;

  let cv = null;
  let ctx = null;
  let W = 0, H = 0, DPR = 1;

  function init(canvasElement) {
    cv = canvasElement;
    ctx = cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!cv) return;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth;
    H = cv.clientHeight;
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    draw();
  }

  function getBarHeight() {
    const b = document.getElementById('bar');
    return b ? b.getBoundingClientRect().height : 60;
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = U.getCSS('--surface');
    ctx.fillRect(0, 0, W, H);

    // 1. Zīmē fona plāna attēlu
    if (S.img) {
      const p = Grid.w2s(0, 0, W, H);
      const m = S.mpp();
      const w = S.img.width * m * S.view.z;
      const h = S.img.height * m * S.view.z;
      ctx.save();
      ctx.globalAlpha = S.opacity;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(S.img, p.x, p.y, w, h);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x, p.y, w, h);
    } else {
      ctx.fillStyle = U.getCSS('--ink-dim');
      ctx.font = '13px ' + U.getCSS('--sans');
      ctx.textAlign = 'center';
      ctx.fillText('Ielādē plānu vai atver saglabātu darba zonu', W / 2, H / 2 - 40);
      ctx.textAlign = 'left';
    }

    // 2. Zīmē režģus
    S.grids.forEach((g, i) => {
      if (g.visible && i !== S.active) drawGrid(g, false);
    });
    if (S.G() && S.G().visible) {
      drawGrid(S.G(), true);
    }

    // 3. Zīmē režģu sākumpunktus
    S.grids.forEach((g, i) => {
      if (g.visible) drawOrigin(g, i === S.active);
    });

    // 4. Zīmē 2. slāņa moduļus (ja modulis reģistrēts un implementēts)
    if (EW.ModulesRenderer && typeof EW.ModulesRenderer.drawModules === 'function') {
      EW.ModulesRenderer.drawModules(ctx, W, H);
    }

    // 5. Izmēru ķēde, kalibrācija, mērogs
    drawChain();
    drawCalib();
    drawScaleBar();
  }

  function drawGrid(g, active) {
    const step = Math.max(0.01, g.step);
    const c = [
      Grid.s2w(0, 0, W, H),
      Grid.s2w(W, 0, W, H),
      Grid.s2w(0, H, W, H),
      Grid.s2w(W, H, W, H)
    ].map(p => Grid.w2g(g, p.x, p.y));

    const gx0 = Math.min(...c.map(p => p.x)), gx1 = Math.max(...c.map(p => p.x));
    const gy0 = Math.min(...c.map(p => p.y)), gy1 = Math.max(...c.map(p => p.y));
    const i0 = Math.floor(gx0 / step), i1 = Math.ceil(gx1 / step);
    const j0 = Math.floor(gy0 / step), j1 = Math.ceil(gy1 / step);

    if ((i1 - i0) > 4000 || (j1 - j0) > 4000) return;

    const o = Grid.w2s(g.dx, g.dy, W, H);
    const a = (g.angle || 0) * Math.PI / 180;
    const k = active ? 1 : 0.42;
    const fade = Math.min(1, Math.max(0.15, (step * S.view.z) / 14)) * k;

    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(a);
    ctx.scale(S.view.z, S.view.z);
    const px = 1 / S.view.z;

    const pass = (lw, al, keep) => {
      ctx.lineWidth = px * lw;
      ctx.strokeStyle = U.hexA(g.color, al);
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) {
        if (!keep(i)) continue;
        ctx.moveTo(i * step, gy0);
        ctx.lineTo(i * step, gy1);
      }
      for (let j = j0; j <= j1; j++) {
        if (!keep(j)) continue;
        ctx.moveTo(gx0, j * step);
        ctx.lineTo(gx1, j * step);
      }
      ctx.stroke();
    };

    pass(1, 0.30 * fade, n => n % 2 !== 0);
    pass(1.2, 0.58 * fade, n => n % 2 === 0 && n % 10 !== 0);
    pass(1.8, 0.90 * k, n => n % 10 === 0);
    ctx.restore();
  }

  function drawOrigin(g, active) {
    const o = Grid.w2s(g.dx, g.dy, W, H);
    const a = (g.angle || 0) * Math.PI / 180;
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(a);
    ctx.globalAlpha = active ? 1 : 0.5;
    ctx.strokeStyle = g.color;
    ctx.fillStyle = g.color;
    ctx.lineWidth = active ? 2 : 1.3;
    const r = active ? 30 : 20;

    ctx.beginPath();
    ctx.moveTo(-r * 0.45, 0);
    ctx.lineTo(r, 0);
    ctx.moveTo(0, -r * 0.45);
    ctx.lineTo(0, r);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, active ? 4.5 : 3, 0, Math.PI * 2);
    g.locked ? ctx.fill() : ctx.stroke();

    ctx.rotate(-a);
    ctx.font = (active ? '600 12px ' : '11px ') + U.getCSS('--sans');
    ctx.fillText(g.name + (g.locked ? '' : ' ○'), 9, -9);
    ctx.restore();
  }

  function drawChain() {
    const showChainEl = document.getElementById('showChain');
    if (!S.chain || !S.vp || (showChainEl && !showChainEl.checked)) return;
    const m = S.mpp();
    const pts = S.chain.map(p => {
      const [x, y] = S.vp.convertToViewportPoint(p.x, p.y);
      return Grid.w2s(x * m, y * m, W, H);
    });
    ctx.save();
    ctx.strokeStyle = U.getCSS('--accent');
    ctx.fillStyle = U.getCSS('--accent');
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawCalib() {
    if (!S.calibPts.length) return;
    ctx.save();
    ctx.strokeStyle = U.getCSS('--accent');
    ctx.fillStyle = U.getCSS('--accent');
    ctx.lineWidth = 1.5;
    const pts = S.calibPts.map(p => Grid.w2s(p.x, p.y, W, H));
    if (pts.length === 2) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.stroke();
    }
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawScaleBar() {
    let m = Math.pow(10, Math.floor(Math.log10(120 / S.view.z)));
    [1, 2, 5, 10].some(k => {
      if (m * k * S.view.z >= 70) { m = m * k; return true; }
      return false;
    });
    const px = m * S.view.z;
    const x = W - px - 20;
    const y = H - getBarHeight() - 18;
    ctx.save();
    ctx.strokeStyle = U.getCSS('--ink');
    ctx.fillStyle = U.getCSS('--ink');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x, y);
    ctx.lineTo(x + px, y);
    ctx.lineTo(x + px, y - 5);
    ctx.stroke();
    ctx.font = '11px ' + U.getCSS('--mono');
    ctx.textAlign = 'center';
    ctx.fillText(U.fmt(m) + ' m', x + px / 2, y - 9);
    ctx.restore();
  }

  EW.Renderer = {
    init,
    resize,
    draw,
    getDims: () => ({ W, H, DPR }),
    getCanvas: () => cv,
    getContext: () => ctx
  };
})();
