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

    if (isTouchX && overlapY >= 0.95) {
      return {
        touchAxis: 'X',
        overlapLength: Math.round(overlapY * 1000) / 1000,
        contactCenter: {
          x: m1.x > m2.x ? m1.x - halfW1 : m1.x + halfW1,
          y: (minY + maxY) / 2
        }
      };
    }

    if (isTouchY && overlapX >= 0.95) {
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
   * Palīgfunkcija stingrai koordinātu piesaistei pie 500mm (0.5m) pamat-režģa
   */
  function snapToGrid(val) {
    return Math.round(Math.round(val / GRID_STEP) * GRID_STEP * 1000) / 1000;
  }

  /**
   * Atrod visas legālās saskares pozīcijas ap doto kaimiņa moduli
   * Atbilstoši LNMM karkasa standartam:
   * 1. Gals pie gala (taisnas sienas, Image 1 ✓) — PILNA saskare (dy = 0 vai dx = 0).
   *    KATEGORISKI AIZLIEGTS: saskare uz pusbiezumu (0.5m nobīde, Image 3 ✗)!
   * 2. L-veida stūri (90°) — stūra ārējās malas ir pilnībā salāgotas (flush).
   * 3. T-veida savienojumi — perpendikulārais modulis pieslēdzas tieši centrā.
   * Visas koordinātas ir 100% salāgotas ar 500 mm (0.5 m) pamat-režģi (novērš Image 2 ✗).
   */
  function getValidSnapPositionsForNeighbor(draggedMod, neighborMod, allModules) {
    const validPositions = [];
    const dDim = Geom.getDimensionsInGrid(draggedMod);
    const nDim = Geom.getDimensionsInGrid(neighborMod);

    const nx = snapToGrid(neighborMod.x);
    const ny = snapToGrid(neighborMod.y);

    const isNeighborHoriz = (nDim.width > nDim.height);
    const isNeighborVert = (nDim.height > nDim.width);
    const isNeighborSquare = (nDim.width === nDim.height);

    const isDraggedHoriz = (dDim.width > dDim.height);
    const isDraggedVert = (dDim.height > dDim.width);
    const isDraggedSquare = (dDim.width === dDim.height);

    const candidateCoords = [];

    // --- 1. GALS PIE GALA (TAISNAS SIENAS, Image 1 ✓) ---
    // A) Abi moduļi ir horizontāli (2x1 + 2x1, 2x1 + 1x1, 1x1 + 1x1)
    if (!isNeighborVert && !isDraggedVert) {
      const dist = (nDim.width + dDim.width) / 2;
      // Saskare pa X asi ar kaimiņa kreiso un labo galu.
      // Y koordinātai OBLIGĀTI jāsakrīt ar kaimiņu (dy = 0)! Pusbiezuma nobīde (dy = ±0.5) ir AIZLIEGTA!
      candidateCoords.push({ x: nx - dist, y: ny });
      candidateCoords.push({ x: nx + dist, y: ny });
    }

    // B) Abi moduļi ir vertikāli (1x2 + 1x2, 1x2 + 1x1, 1x1 + 1x1)
    if (!isNeighborHoriz && !isDraggedHoriz) {
      const dist = (nDim.height + dDim.height) / 2;
      // Saskare pa Y asi ar kaimiņa augšējo un apakšējo galu.
      // X koordinātai OBLIGĀTI jāsakrīt ar kaimiņu (dx = 0)! Pusbiezuma nobīde (dx = ±0.5) ir AIZLIEGTA!
      candidateCoords.push({ x: nx, y: ny - dist });
      candidateCoords.push({ x: nx, y: ny + dist });
    }

    // --- 2. PERPENDIKULĀRI SAVIENOJUMI (L-stūri un T-savienojumi) ---
    // A) Kaimiņš horizontāls (2x1), velkamais vertikāls (1x2 vai 1x1)
    if (isNeighborHoriz && !isDraggedHoriz) {
      const distY = (nDim.height + dDim.height) / 2; // 0.5 + 1.0 = 1.5
      // Augšējā un apakšējā garā mala:
      // - Flush L-stūris pa kreisi: x = nx - 0.5
      // - Centrāls T-savienojums:   x = nx
      // - Flush L-stūris pa labi:   x = nx + 0.5
      for (const yo of [-distY, distY]) {
        for (const xo of [-0.5, 0, 0.5]) {
          candidateCoords.push({ x: nx + xo, y: ny + yo });
        }
      }

      // Kaimiņa kreisais un labais gals (X = nx ± dist):
      const distX = (nDim.width + dDim.width) / 2; // 1.0 + 0.5 = 1.5
      // - Flush stūris augšā:     y = ny + 0.5
      // - Centrāls T-savienojums: y = ny
      // - Flush stūris apakšā:    y = ny - 0.5
      for (const xo of [-distX, distX]) {
        for (const yo of [-0.5, 0, 0.5]) {
          candidateCoords.push({ x: nx + xo, y: ny + yo });
        }
      }
    }

    // B) Kaimiņš vertikāls (1x2), velkamais horizontāls (2x1 vai 1x1)
    if (isNeighborVert && !isDraggedVert) {
      const distX = (nDim.width + dDim.width) / 2; // 0.5 + 1.0 = 1.5
      // Kreisā un labā garā mala:
      // - Flush L-stūris augšā:    y = ny - 0.5
      // - Centrāls T-savienojums: y = ny
      // - Flush L-stūris apakšā:   y = ny + 0.5
      for (const xo of [-distX, distX]) {
        for (const yo of [-0.5, 0, 0.5]) {
          candidateCoords.push({ x: nx + xo, y: ny + yo });
        }
      }

      // Kaimiņa augšējais un apakšējais gals (Y = ny ± dist):
      const distY = (nDim.height + dDim.height) / 2; // 1.0 + 0.5 = 1.5
      // - Flush stūris kreisajā pusē: x = nx + 0.5
      // - Centrāls T-savienojums:      x = nx
      // - Flush stūris labajā pusē:   x = nx - 0.5
      for (const yo of [-distY, distY]) {
        for (const xo of [-0.5, 0, 0.5]) {
          candidateCoords.push({ x: nx + xo, y: ny + yo });
        }
      }
    }

    // C) Kaimiņš mazais (1x1 kvadrāts) un velkamais ir 2x1
    if (isNeighborSquare) {
      if (isDraggedHoriz) {
        // Gals pie gala
        candidateCoords.push({ x: nx - 1.5, y: ny });
        candidateCoords.push({ x: nx + 1.5, y: ny });
        // Sāns pie gala (T un L)
        for (const xo of [-0.5, 0, 0.5]) {
          candidateCoords.push({ x: nx + xo, y: ny - 1.0 });
          candidateCoords.push({ x: nx + xo, y: ny + 1.0 });
        }
      } else if (isDraggedVert) {
        // Gals pie gala
        candidateCoords.push({ x: nx, y: ny - 1.5 });
        candidateCoords.push({ x: nx, y: ny + 1.5 });
        // Sāns pie gala (T un L)
        for (const yo of [-0.5, 0, 0.5]) {
          candidateCoords.push({ x: nx - 1.0, y: ny + yo });
          candidateCoords.push({ x: nx + 1.0, y: ny + yo });
        }
      }
    }

    // Validējam katru kandidātu: kolīzijas, saskari un precīzu 0.5m režģa noapaļošanu
    for (let i = 0; i < candidateCoords.length; i++) {
      const coord = candidateCoords[i];
      const cx = snapToGrid(coord.x);
      const cy = snapToGrid(coord.y);

      const candidateMod = {
        ...draggedMod,
        x: cx,
        y: cy
      };

      // 1. Pārbaudām, vai ar kaimiņu ir pareiza saskare (vismaz 0.95m overlap)
      const contact = getContactInfo(candidateMod, neighborMod);
      if (!contact) continue;

      // 2. Pārbaudām, vai nav iekšējas pārklāšanās ar šo kaimiņu
      if (Collision.checkOverlapSameGrid(candidateMod, neighborMod)) continue;

      // 3. Pārbaudām, vai nerodas kolīzija ar jebkuru citu moduli telpā!
      const otherColl = Collision.checkCollision(candidateMod, allModules, draggedMod.id);
      if (otherColl) continue;

      validPositions.push({
        x: cx,
        y: cy,
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
    // 1. Pamatlīmenis: Režģa snapošana (0.5 m solis bez noapaļošanas kļūdām)
    const baseGridX = snapToGrid(rawGx);
    const baseGridY = snapToGrid(rawGy);

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
    snapToGrid,
    getContactInfo,
    calculateSnap
  };
})();
