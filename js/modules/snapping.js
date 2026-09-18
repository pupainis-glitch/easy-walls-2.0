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
  const NEIGHBOR_SNAP_THRESHOLD = 0.20; // 200 mm tolerances rādiuss piesaistei pie kaimiņa

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
    // Patiesais saskares nogrieznis pa Y asi (1D šķēlums)
    const minY = Math.max(m1.y - halfH1, m2.y - halfH2);
    const maxY = Math.min(m1.y + halfH1, m2.y + halfH2);
    const overlapY = Math.max(0, maxY - minY);

    // Saskare pa Y asi (horizontāla robeža starp moduļiem)
    const isTouchY = Math.abs(dy - touchDistY) <= eps;
    // Patiesais saskares nogrieznis pa X asi (1D šķēlums)
    const minX = Math.max(m1.x - halfW1, m2.x - halfW2);
    const maxX = Math.min(m1.x + halfW1, m2.x + halfW2);
    const overlapX = Math.max(0, maxX - minX);

    if (isTouchX && overlapY >= 0.45) {
      return {
        touchAxis: 'X',
        overlapLength: Math.round(overlapY * 1000) / 1000,
        contactCenter: {
          x: m1.x > m2.x ? m1.x - halfW1 : m1.x + halfW1,
          y: (minY + maxY) / 2
        }
      };
    }

    if (isTouchY && overlapX >= 0.45) {
      return {
        touchAxis: 'Y',
        overlapLength: Math.round(overlapX * 1000) / 1000,
        contactCenter: {
          x: (minX + maxX) / 2,
          y: m1.y > m2.y ? m1.y - halfH1 : m1.y + halfH1
        }
      };
    }

    return null;
  }

  /**
   * Atrod visas legālās saskares pozīcijas ap doto kaimiņa moduli
   * Tikai 4 kontaktu malām (Labā, Kreisā, Augšējā, Apakšējā), nevis visam 2D laukumam!
   */
  function getValidSnapPositionsForNeighbor(draggedMod, neighborMod, allModules) {
    const validPositions = [];
    const dDim = Geom.getDimensionsInGrid(draggedMod);
    const nDim = Geom.getDimensionsInGrid(neighborMod);

    const halfWd = dDim.width / 2;
    const halfHd = dDim.height / 2;
    const halfWn = nDim.width / 2;
    const halfHn = nDim.height / 2;

    const candidateCoords = [];

    // 1. Saskare pa X asi: Labajā un Kreisajā pusē
    const touchXOffsets = [halfWn + halfWd, -(halfWn + halfWd)];
    const maxDy = Math.max(0, halfHn + halfHd - 0.45);
    for (let i = 0; i < touchXOffsets.length; i++) {
      const cx = Math.round((neighborMod.x + touchXOffsets[i]) * 1000) / 1000;
      for (let dy = -maxDy; dy <= maxDy + 0.01; dy += GRID_STEP) {
        const cy = Math.round((neighborMod.y + dy) * 1000) / 1000;
        candidateCoords.push({ x: cx, y: cy });
      }
    }

    // 2. Saskare pa Y asi: Augšā un Apakšā
    const touchYOffsets = [halfHn + halfHd, -(halfHn + halfHd)];
    const maxDx = Math.max(0, halfWn + halfWd - 0.45);
    for (let i = 0; i < touchYOffsets.length; i++) {
      const cy = Math.round((neighborMod.y + touchYOffsets[i]) * 1000) / 1000;
      for (let dx = -maxDx; dx <= maxDx + 0.01; dx += GRID_STEP) {
        const cx = Math.round((neighborMod.x + dx) * 1000) / 1000;
        candidateCoords.push({ x: cx, y: cy });
      }
    }

    for (let i = 0; i < candidateCoords.length; i++) {
      const coord = candidateCoords[i];
      const candidateMod = {
        ...draggedMod,
        x: coord.x,
        y: coord.y
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
        x: coord.x,
        y: coord.y,
        neighborMod,
        contact
      });
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

    if (!allModules || allModules.length === 0) {
      return { x: baseGridX, y: baseGridY, snappedToNeighbor: false, snapInfo: null };
    }

    const dDim = Geom.getDimensionsInGrid(draggedMod);
    const maxDSize = Math.max(dDim.width, dDim.height);

    // 2. Kaimiņu portu / malu snapošana
    let bestSnap = null;
    let minDistance = NEIGHBOR_SNAP_THRESHOLD;

    for (let i = 0; i < allModules.length; i++) {
      const neighbor = allModules[i];
      if (neighbor.id === draggedMod.id) continue;
      if (neighbor.gridId !== draggedMod.gridId) continue;

      const nDim = Geom.getDimensionsInGrid(neighbor);
      const maxNSize = Math.max(nDim.width, nDim.height);

      // Zibenīgs attāluma filtrs: ja kaimiņš atrodas ārpus iespējamās saskares zonas, izlaižam
      const reachLimit = (maxNSize + maxDSize) / 2 + NEIGHBOR_SNAP_THRESHOLD + 0.1;
      if (Math.abs(neighbor.x - rawGx) > reachLimit || Math.abs(neighbor.y - rawGy) > reachLimit) {
        continue;
      }

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
