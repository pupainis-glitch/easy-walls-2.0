/**
 * Easy walls 2.0 — Inteliģentā snapošana (Grid snap + Port/Edge snap pie kaimiņiem)
 */
window.EW = window.EW || {};
EW.Modules = EW.Modules || {};

(function() {
  const S = EW.State;
  const Geom = EW.Modules.Geometry;
  const Collision = EW.Modules.Collision;

  const GRID_STEP = 0.5; // 500 mm pamat-režģa solis
  const NEIGHBOR_SNAP_THRESHOLD = 0.40; // 400 mm tolerances rādiuss piesaistei pie kaimiņa

  /**
   * Pārbauda, vai divi moduļi saskaras ar malām un nosaka savienojuma veidu
   */
  function getContactInfo(m1, m2) {
    const d1 = Geom.getDimensionsInGrid(m1);
    const d2 = Geom.getDimensionsInGrid(m2);

    const halfW1 = d1.width / 2;
    const halfH1 = d1.height / 2;
    const halfW2 = d2.width / 2;
    const halfH2 = d2.height / 2;

    const dx = Math.abs(m1.x - m2.x);
    const dy = Math.abs(m1.y - m2.y);

    const touchDistX = halfW1 + halfW2;
    const touchDistY = halfH1 + halfH2;

    const eps = Collision.EPSILON;

    // Saskare pa X asi (vertikāla robeža starp moduļiem)
    const isTouchX = Math.abs(dx - touchDistX) <= eps;
    // Pārklāšanās pa Y asi
    const overlapY = (halfH1 + halfH2) - dy;

    // Saskare pa Y asi (horizontāla robeža starp moduļiem)
    const isTouchY = Math.abs(dy - touchDistY) <= eps;
    // Pārklāšanās pa X asi
    const overlapX = (halfW1 + halfW2) - dx;

    if (isTouchX && overlapY >= 0.45) {
      return {
        touchAxis: 'X',
        overlapLength: Math.round(overlapY * 1000) / 1000,
        contactCenter: {
          x: m1.x > m2.x ? m1.x - halfW1 : m1.x + halfW1,
          y: (m1.y + m2.y) / 2
        }
      };
    }

    if (isTouchY && overlapX >= 0.45) {
      return {
        touchAxis: 'Y',
        overlapLength: Math.round(overlapX * 1000) / 1000,
        contactCenter: {
          x: (m1.x + m2.x) / 2,
          y: m1.y > m2.y ? m1.y - halfH1 : m1.y + halfH1
        }
      };
    }

    return null;
  }

  /**
   * Atrod visas legālās saskares pozīcijas ap doto kaimiņa moduli
   */
  function getValidSnapPositionsForNeighbor(draggedMod, neighborMod, allModules) {
    const validPositions = [];
    const dDim = Geom.getDimensionsInGrid(draggedMod);
    const nDim = Geom.getDimensionsInGrid(neighborMod);

    // Iespējamās nobīdes režģa koordinātās pa 0.5 m soļiem
    const minDx = - (nDim.width / 2 + dDim.width / 2 + 0.1);
    const maxDx = (nDim.width / 2 + dDim.width / 2 + 0.1);
    const minDy = - (nDim.height / 2 + dDim.height / 2 + 0.1);
    const maxDy = (nDim.height / 2 + dDim.height / 2 + 0.1);

    const xSteps = [];
    for (let x = Math.floor(minDx / GRID_STEP) * GRID_STEP; x <= maxDx + 0.01; x += GRID_STEP) {
      xSteps.push(Math.round(x * 1000) / 1000);
    }
    const ySteps = [];
    for (let y = Math.floor(minDy / GRID_STEP) * GRID_STEP; y <= maxDy + 0.01; y += GRID_STEP) {
      ySteps.push(Math.round(y * 1000) / 1000);
    }

    for (const sx of xSteps) {
      for (const sy of ySteps) {
        const testGx = Math.round((neighborMod.x + sx) * 1000) / 1000;
        const testGy = Math.round((neighborMod.y + sy) * 1000) / 1000;

        const candidateMod = {
          ...draggedMod,
          x: testGx,
          y: testGy
        };

        // 1. Pārbaudām, vai ar kaimiņu ir pareiza saskare
        const contact = getContactInfo(candidateMod, neighborMod);
        if (!contact) continue;

        // 2. Pārbaudām, vai nav iekšējas pārklāšanās ar šo kaimiņu
        if (Collision.checkOverlapSameGrid(candidateMod, neighborMod)) continue;

        // 3. Pārbaudām, vai nerodas kolīzija ar jebkuru citu moduli telpā!
        const otherColl = Collision.checkCollision(candidateMod, allModules, draggedMod.id);
        if (otherColl) continue;

        validPositions.push({
          x: testGx,
          y: testGy,
          neighborMod,
          contact
        });
      }
    }

    return validPositions;
  }

  /**
   * Aprēķina optimālo snapošanas pozīciju velkamajam modulim
   * @param {Object} draggedMod - Velkamais modulis
   * @param {Array} allModules - Visi moduļi telpā
   * @param {number} rawGx - Aptuvenā peles pozīcija režģa koordinātās
   * @param {number} rawGy - Aptuvenā peles pozīcija režģa koordinātās
   * @returns {Object} - { x, y, snappedToNeighbor, snapInfo }
   */
  function calculateSnap(draggedMod, allModules, rawGx, rawGy) {
    // 1. Pamatlīmenis: Režģa snapošana (0.5 m solis)
    const baseGridX = Math.round(rawGx / GRID_STEP) * GRID_STEP;
    const baseGridY = Math.round(rawGy / GRID_STEP) * GRID_STEP;

    // 2. Kaimiņu portu / malu snapošana
    // Meklējam tuvākos kaimiņus tajā pašā režģī
    let bestSnap = null;
    let minDistance = NEIGHBOR_SNAP_THRESHOLD;

    for (let i = 0; i < allModules.length; i++) {
      const neighbor = allModules[i];
      if (neighbor.id === draggedMod.id) continue;
      if (neighbor.gridId !== draggedMod.gridId) continue;

      // Ja kaimiņš atrodas saprātīgā attālumā
      const distToNeighbor = Math.hypot(neighbor.x - rawGx, neighbor.y - rawGy);
      if (distToNeighbor > 4.0) continue;

      const candidates = getValidSnapPositionsForNeighbor(draggedMod, neighbor, allModules);
      for (let j = 0; j < candidates.length; j++) {
        const cand = candidates[j];
        const dist = Math.hypot(cand.x - rawGx, cand.y - rawGy);
        if (dist < minDistance) {
          minDistance = dist;
          bestSnap = cand;
        }
      }
    }

    if (bestSnap) {
      return {
        x: bestSnap.x,
        y: bestSnap.y,
        snappedToNeighbor: true,
        snapInfo: bestSnap
      };
    }

    // Ja kaimiņu piesaiste netika atrasta, atgriežam bāzes režģa snapu
    return {
      x: baseGridX,
      y: baseGridY,
      snappedToNeighbor: false,
      snapInfo: null
    };
  }

  EW.Modules.Snapping = {
    GRID_STEP,
    NEIGHBOR_SNAP_THRESHOLD,
    getContactInfo,
    calculateSnap
  };
})();
