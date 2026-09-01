/**
 * Easy walls 2.0 — PDF mēroga automātiskā noteikšana un renderēšana
 */
window.EW = window.EW || {};

(function() {
  const S = EW.State;
  const C = EW.Config;
  const U = EW.Utils;

  function parseDim(str) {
    const s = str.replace(/[\u00a0\u2007\u202f\u2009]/g, ' ').trim();
    if (!/^\d[\d ]*$/.test(s)) return null;
    const v = parseInt(s.replace(/ /g, ''), 10);
    return (v >= 200 && v <= 300000) ? v : null;
  }

  function linreg(xs, ys) {
    const n = xs.length;
    let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      sx += xs[i];
      sy += ys[i];
      sxx += xs[i] * xs[i];
      sxy += xs[i] * ys[i];
      syy += ys[i] * ys[i];
    }
    const den = n * sxx - sx * sx;
    const dy = n * syy - sy * sy;
    if (!den || !dy) return null;
    const slope = (n * sxy - sx * sy) / den;
    const k = n * sxy - sx * sy;
    return { slope, icpt: (sy - slope * sx) / n, r2: k * k / (den * dy) };
  }

  function fitChain(group) {
    let g = group.slice().sort((a, b) => a.t - b.t);
    for (let att = 0; att < 3; att++) {
      if (g.length < 4) return null;
      const cum = [];
      let acc = 0;
      for (let i = 0; i < g.length; i++) {
        acc = (i === 0) ? g[0].v / 2 : acc + g[i - 1].v / 2 + g[i].v / 2;
        cum.push(acc);
      }
      const xs = g.map(o => o.t);
      const fit = linreg(xs, cum);
      if (!fit || fit.slope <= 0) return null;
      if (fit.r2 > 0.99995 || g.length <= 4) {
        return {
          mmPerPt: fit.slope,
          r2: fit.r2,
          n: g.length,
          items: g,
          total: g.reduce((s, o) => s + o.v, 0)
        };
      }
      let worst = 0, wd = -1;
      for (let i = 0; i < g.length; i++) {
        const d = Math.abs(cum[i] - (fit.icpt + fit.slope * xs[i]));
        if (d > wd) { wd = d; worst = i; }
      }
      g = g.filter((_, i) => i !== worst);
    }
    return null;
  }

  async function detectScale(page) {
    let tc;
    try { tc = await page.getTextContent(); } catch { return null; }
    const raw = [];
    for (const it of (tc.items || [])) {
      const v = parseDim(it.str || '');
      if (v === null) continue;
      const tr = it.transform;
      const rot = Math.atan2(tr[1], tr[0]);
      const cos = Math.cos(rot), sin = Math.sin(rot), w = it.width || 0;
      raw.push({
        v,
        t: tr[4] * cos + tr[5] * sin + w / 2,
        u: -tr[4] * sin + tr[5] * cos,
        rotKey: Math.round(rot * 180 / Math.PI),
        x: tr[4] + w / 2 * cos,
        y: tr[5] + w / 2 * sin
      });
    }
    if (raw.length < 4) return null;

    const groups = new Map();
    for (const o of raw) {
      const key = `${((o.rotKey % 180) + 180) % 180}|${Math.round(o.u / 4)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(o);
    }

    const merged = [], used = new Set();
    for (const k of groups.keys()) {
      if (used.has(k)) continue;
      const [r, b] = k.split('|');
      const bi = +b;
      let g = [];
      for (const d of [-1, 0, 1]) {
        const kk = `${r}|${bi + d}`;
        if (groups.has(kk) && !used.has(kk)) {
          g = g.concat(groups.get(kk));
          used.add(kk);
        }
      }
      if (g.length >= 4) merged.push(g);
    }

    let best = null;
    for (const g of merged) {
      const f = fitChain(g);
      if (!f) continue;
      const sc = f.n * f.r2;
      if (!best || sc > best.score) best = { ...f, score: sc };
    }
    if (!best) return null;

    const denom = best.mmPerPt / (25.4 / 72);
    if (denom < 5 || denom > 2000) return null;

    let snapped = null;
    for (const d of C.STANDARD_SCALES) {
      if (Math.abs(denom - d) / d < 0.005) {
        snapped = d;
        break;
      }
    }
    const totals = raw.filter(o => !best.items.includes(o) && Math.abs(o.v - best.total) / best.total < 0.02);
    return {
      mmPerPt: best.mmPerPt,
      denom,
      snapped,
      r2: best.r2,
      n: best.n,
      total: best.total,
      confirmed: totals.length > 0,
      items: best.items
    };
  }

  function setMppPt(v) {
    const old = S.mppPt;
    if (old && old > 0) {
      const k = v / old;
      S.view.x *= k;
      S.view.y *= k;
      S.view.z /= k;
      S.grids.forEach(g => {
        g.dx *= k;
        g.dy *= k;
      });
    }
    S.mppPt = v;
  }

  function applyDetected(a) {
    setMppPt(C.PT2M * (a.snapped || a.denom));
    S.denom = a.snapped;
    S.detected = {
      n: a.n,
      total: a.total,
      confirmed: a.confirmed,
      denom: a.denom,
      snapped: a.snapped
    };
    S.chain = a.items.map(o => ({ x: o.x, y: o.y }));
  }

  function applyPlotScale(d) {
    setMppPt(C.PT2M * d);
    S.denom = d;
  }

  EW.PdfScale = {
    detectScale,
    applyDetected,
    applyPlotScale,
    setMppPt
  };
})();
