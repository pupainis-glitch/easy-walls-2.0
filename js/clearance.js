/**
 * Easy walls 2.0 — Apmeklētāju plūsmas un evakuācijas eju (Clearance) pārbaude
 * 
 * Nodrošina:
 * 1. Attālumu mērīšanu starp sienu moduļu blokiem
 * 2. Šauro eju un koridoru detektēšanu:
 *    - < 0.90 m: Kritisks evakuācijas aizsprostojums (sarkans)
 *    - 0.90–1.20 m: Šaurs pagrieziens ratiņkrēslam (oranžs)
 *    - >= 1.20 m: Brīva apmeklētāju plūsma (zaļš)
 * 3. Mērlīniju un brīdinājuma bultiņu zīmēšanu tieši 2D rasējuma kanvā
 */
window.EW = window.EW || {};

(function() {
  const S = EW.State;
  const Grid = EW.Grid;
  const U = EW.Utils;

  S.showClearance = false;

  /**
   * Aprēķina moduļa 4 stūru koordinātas režģa sistēmā
   */
  function getModuleCorners(mod) {
    const len = mod.type === 'small' ? 1.0 : 2.0;
    const th = 1.0;
    const halfL = len / 2;
    const halfT = th / 2;

    const rad = (mod.rot || 0) * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const locals = [
      { x: -halfL, y: -halfT },
      { x: halfL, y: -halfT },
      { x: halfL, y: halfT },
      { x: -halfL, y: halfT }
    ];

    return locals.map(p => ({
      x: mod.x + p.x * cos - p.y * sin,
      y: mod.y + p.x * sin + p.y * cos
    }));
  }

  /**
   * Attālums no punkta līdz nogrieznim
   */
  function distPointToSegment(p, a, b) {
    const l2 = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
    if (l2 === 0) return { d: Math.hypot(p.x - a.x, p.y - a.y), proj: { ...a } };

    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const proj = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    return { d: Math.hypot(p.x - proj.x, p.y - proj.y), proj };
  }

  /**
   * Minimālais attālums starp diviem nogriežņiem (ab un cd)
   */
  function distSegmentToSegment(a, b, c, d) {
    const d1 = distPointToSegment(c, a, b);
    const d2 = distPointToSegment(d, a, b);
    const d3 = distPointToSegment(a, c, d);
    const d4 = distPointToSegment(b, c, d);

    let min = { d: d1.d, p1: d1.proj, p2: c };
    if (d2.d < min.d) min = { d: d2.d, p1: d2.proj, p2: d };
    if (d3.d < min.d) min = { d: d3.d, p1: a, p2: d3.proj };
    if (d4.d < min.d) min = { d: d4.d, p1: b, p2: d4.proj };

    return min;
  }

  /**
   * Minimālais attālums starp divu taisnstūru perimetriem
   */
  function distBetweenBoxes(cornersA, cornersB) {
    let best = { d: Infinity, p1: null, p2: null };

    for (let i = 0; i < 4; i++) {
      const a1 = cornersA[i];
      const a2 = cornersA[(i + 1) % 4];

      for (let j = 0; j < 4; j++) {
        const b1 = cornersB[j];
        const b2 = cornersB[(j + 1) % 4];

        const res = distSegmentToSegment(a1, a2, b1, b2);
        if (res.d < best.d) {
          best = res;
        }
      }
    }
    return best;
  }

  /**
   * Aprēķina visas šaurās ejas starp moduļiem telpā
   */
  function findCorridors() {
    const modules = S ? (S.modules || []) : [];
    if (modules.length < 2) return [];

    const cornersMap = new Map();
    modules.forEach(m => cornersMap.set(m.id, getModuleCorners(m)));

    const corridors = [];

    for (let i = 0; i < modules.length; i++) {
      for (let j = i + 1; j < modules.length; j++) {
        const m1 = modules[i];
        const m2 = modules[j];
        if (m1.gridId !== m2.gridId) continue;

        // Ja moduļi saskaras (ir savienoti vienā sienā), izlaižam
        if (EW.Modules && EW.Modules.Snapping && EW.Modules.Snapping.getContactInfo(m1, m2)) {
          continue;
        }

        const boxA = cornersMap.get(m1.id);
        const boxB = cornersMap.get(m2.id);
        const res = distBetweenBoxes(boxA, boxB);

        // Ja attālums ir mazāks par 0.05 m, tie fiziski saskaras
        if (res.d <= 0.05) continue;

        // Reģistrējam tikai tos, kas veido eju (< 2.20 m)
        if (res.d < 2.20) {
          let status = 'ok'; // >= 1.20 m
          if (res.d < 0.90) status = 'critical';
          else if (res.d < 1.20) status = 'narrow';

          corridors.push({
            mod1: m1,
            mod2: m2,
            gridId: m1.gridId,
            dist: Math.round(res.d * 100) / 100,
            p1: res.p1,
            p2: res.p2,
            status
          });
        }
      }
    }

    // Sakārtojam pēc kritiskuma (šaurākās pirmās)
    corridors.sort((a, b) => a.dist - b.dist);
    return corridors;
  }

  /**
   * Zīmē eju mērlīnijas un brīdinājuma atzīmes kanvā
   */
  function draw(ctx, g, px, isLight) {
    if (!S.showClearance) return;
    const corridors = findCorridors();
    if (!corridors.length) return;

    ctx.save();

    corridors.forEach(cor => {
      if (cor.gridId !== g.id) return;

      const p1 = cor.p1;
      const p2 = cor.p2;

      let color = isLight ? '#16a34a' : '#22c55e'; // Zaļš
      let badgeBg = isLight ? '#dcfce7' : '#14532d';
      let badgeBorder = isLight ? '#86efac' : '#16a34a';

      if (cor.status === 'critical') {
        color = '#dc2626'; // Sarkans
        badgeBg = isLight ? '#fee2e2' : '#7f1d1d';
        badgeBorder = '#ef4444';
      } else if (cor.status === 'narrow') {
        color = '#d97706'; // Dzeltens / Oranžs
        badgeBg = isLight ? '#fef3c7' : '#78350f';
        badgeBorder = '#f59e0b';
      }

      // Mērlīnija
      ctx.strokeStyle = color;
      ctx.lineWidth = px * (cor.status === 'critical' ? 2.5 : 1.8);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Galu atzīmes (bultiņas / perpendikuli)
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const perpAngle = angle + Math.PI / 2;
      const tickLen = 0.12;

      [p1, p2].forEach(p => {
        ctx.beginPath();
        ctx.moveTo(p.x - Math.cos(perpAngle) * tickLen, p.y - Math.sin(perpAngle) * tickLen);
        ctx.lineTo(p.x + Math.cos(perpAngle) * tickLen, p.y + Math.sin(perpAngle) * tickLen);
        ctx.stroke();
      });

      // Mērlīnijas birka viduspunktā
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      ctx.save();
      ctx.translate(midX, midY);

      const label = cor.status === 'critical'
        ? `⚠️ ${cor.dist.toFixed(2)} m`
        : (cor.status === 'narrow' ? `↔ ${cor.dist.toFixed(2)} m` : `✓ ${cor.dist.toFixed(2)} m`);

      const bw = Math.max(0.68, px * 82);
      const bh = Math.max(0.24, px * 24);

      ctx.fillStyle = badgeBg;
      ctx.strokeStyle = badgeBorder;
      ctx.lineWidth = px * 1.5;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(-bw / 2, -bh / 2, bw, bh, px * 4);
      } else {
        ctx.rect(-bw / 2, -bh / 2, bw, bh);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = '700 ' + Math.max(0.11, px * 10) + 'px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, 0);

      ctx.restore();
    });

    ctx.restore();
  }

  function toggleClearance(force = null) {
    S.showClearance = force !== null ? force : !S.showClearance;
    const btn = document.getElementById('btnToggleClearance');
    if (btn) {
      if (S.showClearance) btn.classList.add('active');
      else btn.classList.remove('active');
    }
    if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();

    if (S.showClearance) {
      const corridors = findCorridors();
      const crit = corridors.filter(c => c.status === 'critical').length;
      const narrow = corridors.filter(c => c.status === 'narrow').length;
      if (crit > 0) {
        if (EW.UI && EW.UI.toast) EW.UI.toast(`Atrastas ${crit} bīstami šauras ejas (< 0.9m)!`);
      } else if (narrow > 0) {
        if (EW.UI && EW.UI.toast) EW.UI.toast(`Atrastas ${narrow} šauras ejas ratiņkrēsliem (< 1.2m)`);
      } else {
        if (EW.UI && EW.UI.toast) EW.UI.toast('Visas ejas atbilst pieejamības prasībām (≥ 1.2m)');
      }
    }
  }

  EW.Clearance = {
    findCorridors,
    draw,
    toggleClearance
  };
})();
