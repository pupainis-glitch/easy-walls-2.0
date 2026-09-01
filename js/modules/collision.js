/**
 * Easy walls 2.0 — Moduļu kolīziju un pārklāšanās pārbaude (Collision Detection)
 */
window.EW = window.EW || {};
EW.Modules = EW.Modules || {};

(function() {
  const S = EW.State;
  const Grid = EW.Grid;
  const Geom = EW.Modules.Geometry;

  const EPSILON = 0.001; // 1 mm pielaide noapaļošanas kļūdām

  /**
   * Pārbauda, vai divi moduļi uz viena režģa pārklājas.
   * Saskaršanās ar malām ir ATĻAUTA, bet iekšēja pārklāšanās ir AIZLIEGTA.
   */
  function checkOverlapSameGrid(m1, m2) {
    const d1 = Geom.getDimensionsInGrid(m1);
    const d2 = Geom.getDimensionsInGrid(m2);

    const halfW1 = d1.width / 2;
    const halfH1 = d1.height / 2;
    const halfW2 = d2.width / 2;
    const halfH2 = d2.height / 2;

    const dx = Math.abs(m1.x - m2.x);
    const dy = Math.abs(m1.y - m2.y);

    const overlapX = (halfW1 + halfW2) - dx;
    const overlapY = (halfH1 + halfH2) - dy;

    // Pārklāšanās notiek tikai tad, ja abās asīs pārklāšanās dziļums pārsniedz EPSILON
    return (overlapX > EPSILON && overlapY > EPSILON);
  }

  /**
   * Aprēķina moduļa 4 virsotnes pasaules (world) koordinātās
   */
  function getModuleWorldVertices(mod, g) {
    const spec = Geom.SPECS[mod.type] || Geom.SPECS.large;
    const halfL = spec.length / 2;
    const halfW = spec.width / 2;

    // Lokālie stūri pirms rotācijas
    const localCorners = [
      { x: -halfL, y: -halfW },
      { x:  halfL, y: -halfW },
      { x:  halfL, y:  halfW },
      { x: -halfL, y:  halfW }
    ];

    const rad = ((mod.rot || 0)) * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return localCorners.map(p => {
      // Pārnesam uz režģa koordinātām
      const gx = p.x * cos - p.y * sin + mod.x;
      const gy = p.x * sin + p.y * cos + mod.y;
      // Pārnesam uz pasaules koordinātām
      return Grid.g2w(g, gx, gy);
    });
  }

  /**
   * Separating Axis Theorem (SAT) daudzstūru pārklāšanās pārbaudei
   * (izmanto, ja moduļi pieder dažādiem režģiem ar dažādiem leņķiem)
   */
  function checkPolygonOverlapSAT(poly1, poly2) {
    const polygons = [poly1, poly2];
    for (let i = 0; i < polygons.length; i++) {
      const poly = polygons[i];
      for (let j = 0; j < poly.length; j++) {
        const p1 = poly[j];
        const p2 = poly[(j + 1) % poly.length];

        // Normāle uz malu
        const normal = { x: -(p2.y - p1.y), y: p2.x - p1.x };
        const len = Math.hypot(normal.x, normal.y);
        if (len === 0) continue;
        const axis = { x: normal.x / len, y: normal.y / len };

        // Projicējam abus poligonus uz ass
        let minA = Infinity, maxA = -Infinity;
        for (const p of poly1) {
          const proj = p.x * axis.x + p.y * axis.y;
          minA = Math.min(minA, proj);
          maxA = Math.max(maxA, proj);
        }

        let minB = Infinity, maxB = -Infinity;
        for (const p of poly2) {
          const proj = p.x * axis.x + p.y * axis.y;
          minB = Math.min(minB, proj);
          maxB = Math.max(maxB, proj);
        }

        // Ja starp projekcijām ir atstarpe (lielāka par EPSILON), tie nepārklājas
        if (maxA <= minB + EPSILON || maxB <= minA + EPSILON) {
          return false;
        }
      }
    }
    return true; // Pārklājas pa visām asīm
  }

  /**
   * Pārbauda, vai kandidāta modulis pārklājas ar jebkuru citu moduli sarakstā
   * @param {Object} candidateMod - Pārbaudāmais modulis
   * @param {Array} allModules - Visi moduļi
   * @param {string} [ignoreId] - Moduļa ID, kuru ignorēt (pats sevi)
   * @returns {Object|null} - Kolīzijas kaimiņš vai null
   */
  function checkCollision(candidateMod, allModules, ignoreId) {
    const candidateGrid = S.grids.find(g => g.id === candidateMod.gridId) || S.G();
    if (!candidateGrid) return null;

    for (let i = 0; i < allModules.length; i++) {
      const other = allModules[i];
      if (other.id === (ignoreId || candidateMod.id)) continue;

      const otherGrid = S.grids.find(g => g.id === other.gridId) || S.G();
      if (!otherGrid || !otherGrid.visible) continue;

      // Ja abi moduļi ir uz viena režģa ar vienādu leņķi, izmantojam super-ātru AABB
      if (candidateMod.gridId === other.gridId && candidateGrid.angle === otherGrid.angle) {
        if (checkOverlapSameGrid(candidateMod, other)) {
          return other;
        }
      } else {
        // Dažādi režģi vai leņķi — izmantojam SAT pasaules koordinātās
        const poly1 = getModuleWorldVertices(candidateMod, candidateGrid);
        const poly2 = getModuleWorldVertices(other, otherGrid);
        if (checkPolygonOverlapSAT(poly1, poly2)) {
          return other;
        }
      }
    }
    return null;
  }

  EW.Modules.Collision = {
    EPSILON,
    checkOverlapSameGrid,
    checkCollision
  };
})();
