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
    return 0;
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

    // 5. Izmēru ķēde, kalibrācija, mērogs, aktīvā reģiona vilkšana
    drawRegionDrag();
    drawChain();
    drawCalib();
    drawScaleBar();
  }

  function drawGrid(g, active) {
    if (!g || !g.visible) return;
    const step = Math.max(0.01, g.step || 0.5);
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    let sx = 0, sy = 0, sw = 0, sh = 0;
    let hasRegion = false;

    // 1. ZĀLES REĢIONA KONTŪRA (PASAULES METROS — PILNĪGI NEKUSTĪGA UN NEROTĒ!)
    if (g.region) {
      hasRegion = true;
      const r = g.region;
      const minWx = r.minWx !== undefined ? r.minWx : r.minX;
      const maxWx = r.maxWx !== undefined ? r.maxWx : r.maxX;
      const minWy = r.minWy !== undefined ? r.minWy : r.minY;
      const maxWy = r.maxWy !== undefined ? r.maxWy : r.maxY;

      const p1 = Grid.w2s(minWx, minWy, W, H);
      const p2 = Grid.w2s(maxWx, maxWy, W, H);
      sx = Math.min(p1.x, p2.x);
      sy = Math.min(p1.y, p2.y);
      sw = Math.abs(p2.x - p1.x);
      sh = Math.abs(p2.y - p1.y);

      ctx.save();
      // Viegls zāles fona laukums
      ctx.fillStyle = isLight ? 'rgba(234, 88, 12, 0.04)' : 'rgba(249, 115, 22, 0.06)';
      ctx.fillRect(sx, sy, sw, sh);

      // Zāles perimetra kontūra (fiksēta pie ēkas sienām, leņķis nemaina rāmja formu!)
      ctx.strokeStyle = active 
        ? (isLight ? '#ea580c' : '#f97316')
        : (isLight ? 'rgba(234, 88, 12, 0.4)' : 'rgba(249, 115, 22, 0.4)');
      ctx.lineWidth = active ? 2.5 : 1.2;
      ctx.setLineDash(active ? [] : [6, 4]);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.setLineDash([]);

      // Zāles nosaukuma etiķete stūrī
      ctx.fillStyle = active ? (isLight ? '#c2410c' : '#fb923c') : 'rgba(150, 150, 150, 0.8)';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('🏛️ ' + (g.name || 'Zāle'), sx + 6, sy - 5);
      ctx.restore();
    }

    // 2. REŽĢA LĪNIJAS — ROTĒ UN PĀRVIETOJAS AP SĀKUMPUNKTU (dx, dy) ZĀLES IEKŠIENĒ
    ctx.save();
    if (hasRegion) {
      // APGRIEŠANAS MASKA (CLIP): Režģis redzams TIKAI un VIENĪGI nekustīgā zāles rāmja iekšpusē!
      ctx.beginPath();
      ctx.rect(sx, sy, sw, sh);
      ctx.clip();
    }

    // Režģa rotācija ap koordinātu sākumpunktu (g.dx, g.dy)
    const o = Grid.w2s(g.dx, g.dy, W, H);
    const a = (g.angle || 0) * Math.PI / 180;
    const k = active ? 1 : 0.42;
    const moduleDim = (S.modules && S.modules.length > 0) ? 0.45 : 1.0;
    const fade = Math.min(1, Math.max(0.15, (step * S.view.z) / 14)) * k * moduleDim;

    ctx.translate(o.x, o.y);
    ctx.rotate(a);
    ctx.scale(S.view.z, S.view.z);
    const px = 1 / S.view.z;

    // Aprēķinām režģa līniju diapazonu lokālajās koordinātās
    let gx0, gx1, gy0, gy1;
    if (hasRegion) {
      const r = g.region;
      const minWx = r.minWx !== undefined ? r.minWx : r.minX;
      const maxWx = r.maxWx !== undefined ? r.maxWx : r.maxX;
      const minWy = r.minWy !== undefined ? r.minWy : r.minY;
      const maxWy = r.maxWy !== undefined ? r.maxWy : r.maxY;

      // Pārnesam zāles 4 stūrus uz rotētā režģa koordinātām
      const corners = [
        Grid.w2g(g, minWx, minWy),
        Grid.w2g(g, maxWx, minWy),
        Grid.w2g(g, maxWx, maxWy),
        Grid.w2g(g, minWx, maxWy)
      ];
      gx0 = Math.min(...corners.map(p => p.x));
      gx1 = Math.max(...corners.map(p => p.x));
      gy0 = Math.min(...corners.map(p => p.y));
      gy1 = Math.max(...corners.map(p => p.y));
    } else {
      const c = [
        Grid.s2w(0, 0, W, H),
        Grid.s2w(W, 0, W, H),
        Grid.s2w(0, H, W, H),
        Grid.s2w(W, H, W, H)
      ].map(p => Grid.w2g(g, p.x, p.y));
      gx0 = Math.min(...c.map(p => p.x));
      gx1 = Math.max(...c.map(p => p.x));
      gy0 = Math.min(...c.map(p => p.y));
      gy1 = Math.max(...c.map(p => p.y));
    }

    const i0 = Math.floor(gx0 / step), i1 = Math.ceil(gx1 / step);
    const j0 = Math.floor(gy0 / step), j1 = Math.ceil(gy1 / step);

    if ((i1 - i0) <= 4000 && (j1 - j0) <= 4000) {
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

      pass(1, 0.25 * fade, n => n % 2 !== 0);
      pass(1.2, 0.45 * fade, n => n % 2 === 0 && n % 10 !== 0);
      pass(1.8, 0.80 * k * moduleDim, n => n % 10 === 0);
    }
    ctx.restore();
  }

  function drawRegionDrag() {
    if (!EW.Interaction || typeof EW.Interaction.getRegionDrag !== 'function') return;
    const rd = EW.Interaction.getRegionDrag();
    if (!rd || S.mode !== 'region') return;

    const g = S.G();
    if (!g) return;

    const p1 = Grid.w2s(rd.startW.x, rd.startW.y, W, H);
    const p2 = Grid.w2s(rd.currentW.x, rd.currentW.y, W, H);

    const minX = Math.min(p1.x, p2.x), maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y), maxY = Math.max(p1.y, p2.y);
    const w = maxX - minX, h = maxY - minY;

    ctx.save();
    ctx.fillStyle = 'rgba(234, 88, 12, 0.12)';
    ctx.fillRect(minX, minY, w, h);

    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(minX, minY, w, h);
    ctx.setLineDash([]);

    // Izmērs metros tieši pasaules plānā
    const wM = Math.abs(rd.currentW.x - rd.startW.x).toFixed(1);
    const hM = Math.abs(rd.currentW.y - rd.startW.y).toFixed(1);

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 1;
    ctx.font = 'bold 12px ui-monospace, monospace';
    const txt = `🏛️ ${g.name}: ${wM} × ${hM} m`;
    const tw = ctx.measureText(txt).width + 12;
    ctx.fillRect(minX, minY - 24, tw, 20);
    ctx.strokeRect(minX, minY - 24, tw, 20);
    ctx.fillStyle = '#ea580c';
    ctx.fillText(txt, minX + 6, minY - 10);

    ctx.restore();
  }

  function drawOrigin(g, active) {
    const o = Grid.w2s(g.dx, g.dy, W, H);
    const a = (g.angle || 0) * Math.PI / 180;
    const moduleDim = (S.modules && S.modules.length > 0) ? 0.5 : 1.0;
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(a);
    ctx.globalAlpha = (active ? 1 : 0.5) * moduleDim;
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
    const x = W - px - 24;
    const y = H - 24;
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
