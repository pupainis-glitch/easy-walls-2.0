/**
 * Easy walls 2.0 — Koordinātu transformācijas un režģu ģeometrija
 */
window.EW = window.EW || {};

(function() {
  const S = EW.State;

  /**
   * World (metri plānā) -> Screen (kanvas pikseļi)
   */
  function w2s(x, y, W, H) {
    return {
      x: (x - S.view.x) * S.view.z + W / 2,
      y: (y - S.view.y) * S.view.z + H / 2
    };
  }

  /**
   * Screen (kanvas pikseļi) -> World (metri plānā)
   */
  function s2w(x, y, W, H) {
    return {
      x: (x - W / 2) / S.view.z + S.view.x,
      y: (y - H / 2) / S.view.z + S.view.y
    };
  }

  /**
   * World (metri plānā) -> Grid (aktīvā režģa koordinātas metros)
   */
  function w2g(g, x, y) {
    if (!g) return { x, y };
    const a = (g.angle || 0) * Math.PI / 180;
    const c = Math.cos(a), s = Math.sin(a);
    const vx = x - (g.dx || 0);
    const vy = y - (g.dy || 0);
    return {
      x: vx * c + vy * s,
      y: -vx * s + vy * c
    };
  }

  /**
   * Grid (režģa koordinātas metros) -> World (metri plānā)
   */
  function g2w(g, gx, gy) {
    if (!g) return { x: gx, y: gy };
    const a = (g.angle || 0) * Math.PI / 180;
    const c = Math.cos(a), s = Math.sin(a);
    return {
      x: gx * c - gy * s + (g.dx || 0),
      y: gx * s + gy * c + (g.dy || 0)
    };
  }

  EW.Grid = {
    w2s,
    s2w,
    w2g,
    g2w
  };
})();
