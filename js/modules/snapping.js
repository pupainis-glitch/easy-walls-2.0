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
  const NEIGHBOR_SNAP_THRESHOLD = 0.35; // 350 mm tolerances rādiuss piesaistei pie kaimiņa

  /**
   * Pārbauda, vai divu moduļu saskare atbilst pilnam biezumam (1.0m solis).
   * Jebkurš izvirzījums (overhang) gar saskares līniju drīkst būt TIKAI vesels metrs (0m, 1m, 2m...).
   * Ja kāds no izvirzījumiem ir 0.5m (pusbiezums), savienojums ir aizliegts un nederīgs!
   */
  function isFullThicknessConnection(m1, m2) {
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

    const eps = Collision.EPSILON || 0.01;

    // Saskare pa X asi (vertikāla robeža starp moduļiem)
    if (Math.abs(dx - touchDistX) <= eps) {
      const minY = Math.max(m1.y - halfH1, m2.y - halfH2);
      const maxY = Math.min(m1.y + halfH1, m2.y + halfH2);
      const overlapY = maxY - minY;
      // Minimālais pilna biezuma saskares garums ir 1.0 m (ar 5 cm pielaidi)
      if (overlapY < 0.95) return false;

      // Pārbaudām visus 4 izvirzījumus gar saskares līniju (Y ass):
      const o1Bottom = minY - (m1.y - halfH1);
      const o1Top = (m1.y + halfH1) - maxY;
      const o2Bottom = minY - (m2.y - halfH2);
      const o2Top = (m2.y + halfH2) - maxY;

      const isInt = v => Math.abs(v - Math.round(v)) <= eps;
      return isInt(o1Bottom) && isInt(o1Top) && isInt(o2Bottom) && isInt(o2Top);
    }

    // Saskare pa Y asi (horizontāla robeža starp moduļiem)
    if (Math.abs(dy - touchDistY) <= eps) {
      const minX = Math.max(m1.x - halfW1, m2.x - halfW2);
      const maxX = Math.min(m1.x + halfW1, m2.x + halfW2);
      const overlapX = maxX - minX;
      // Minimālais pilna biezuma saskares garums ir 1.0 m (ar 5 cm pielaidi)
      if (overlapX < 0.95) return false;

      // Pārbaudām visus 4 izvirzījumus gar saskares līniju (X ass):
      const o1Left = minX - (m1.x - halfW1);
      const o1Right = (m1.x + halfW1) - maxX;
      const o2Left = minX - (m2.x - halfW2);
      const o2Right = (m2.x + halfW2) - maxX;

      const isInt = v => Math.abs(v - Math.round(v)) <= eps;
      return isInt(o1Left) && isInt(o1Right) && isInt(o2Left) && isInt(o2Right);
    }

    return false;
  }

  /**
   * Pārbauda, vai dotais modulis saskaras ar kādu citu moduli uz AIZLIEGTA pusbiezuma (0.5m)
   */
  function hasInvalidHalfThicknessTouch(mod, allModules) {
    if (!allModules || !allModules.length) return null;
    const d1 = Geom.getDimensionsInGrid(mod);
    const halfW1 = d1.width / 2;
    const halfH1 = d1.height / 2;
    const eps = Collision.EPSILON || 0.01;

    for (let i = 0; i < allModules.length; i++) {
      const other = allModules[i];
      if (other.id === mod.id || other.gridId !== mod.gridId) continue;

      const d2 = Geom.getDimensionsInGrid(other);
      const halfW2 = d2.width / 2;
      const halfH2 = d2.height / 2;

      const dx = Math.abs(mod.x - other.x);
      const dy = Math.abs(mod.y - other.y);
      const touchDistX = halfW1 + halfW2;
      const touchDistY = halfH1 + halfH2;

      const touchesX = Math.abs(dx - touchDistX) <= eps && (Math.min(mod.y + halfH1, other.y + halfH2) - Math.max(mod.y - halfH1, other.y - halfH2)) > 0.05;
      const touchesY = Math.abs(dy - touchDistY) <= eps && (Math.min(mod.x + halfW1, other.x + halfW2) - Math.max(mod.x - halfW1, other.x - halfW2)) > 0.05;

      if (touchesX || touchesY) {
        if (!isFullThicknessConnection(mod, other)) {
          return other;
        }
      }
    }
    return null;
  }

  /**
   * Pārbauda, vai divi moduļi saskaras ar malām un nosaka savienojuma veidu (TIKAI pilna biezuma saskarei)
   */
  function getContactInfo(m1, m2) {
    if (!isFullThicknessConnection(m1, m2)) {
      return null;
    }

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
    const eps = Collision.EPSILON || 0.01;

    // Saskare pa X asi
    if (Math.abs(dx - touchDistX) <= eps) {
      const minY = Math.max(m1.y - halfH1, m2.y - halfH2);
      const maxY = Math.min(m1.y + halfH1, m2.y + halfH2);
      return {
        touchAxis: 'X',
        overlapLength: Math.round((maxY - minY) * 1000) / 1000,
        contactCenter: {
          x: m1.x > m2.x ? m1.x - halfW1 : m1.x + halfW1,
          y: (minY + maxY) / 2
        }
      };
    }

    // Saskare pa Y asi
    if (Math.abs(dy - touchDistY) <= eps) {
      const minX = Math.max(m1.x - halfW1, m2.x - halfW2);
      const maxX = Math.min(m1.x + halfW1, m2.x + halfW2);
      return {
        touchAxis: 'Y',
        overlapLength: Math.round((maxX - minX) * 1000) / 1000,
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
   * 1. Gals pie gala (taisnas sienas) — PILNA saskare (dy = 0 vai dx = 0).
   * 2. L-veida stūri (90°) — stūra ārējās malas ir pilnībā salāgotas (flush, Image 2 ✓).
   *    KATEGORISKI AIZLIEGTS: saskare uz pusbiezumu (0.5m nobīde, Image 1 ✗)!
   * 3. T-veida savienojumi — pieslēdzas precīzi uz veseliem 1.0m soļiem.
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

    // --- 1. GALS PIE GALA (TAISNAS SIENAS) ---
    // A) Abi moduļi ir horizontāli (2x1 + 2x1, 2x1 + 1x1, 1x1 + 1x1)
    if (!isNeighborVert && !isDraggedVert) {
      const dist = (nDim.width + dDim.width) / 2;
      candidateCoords.push({ x: nx - dist, y: ny });
      candidateCoords.push({ x: nx + dist, y: ny });
    }

    // B) Abi moduļi ir vertikāli (1x2 + 1x2, 1x2 + 1x1, 1x1 + 1x1)
    if (!isNeighborHoriz && !isDraggedHoriz) {
      const dist = (nDim.height + dDim.height) / 2;
      candidateCoords.push({ x: nx, y: ny - dist });
      candidateCoords.push({ x: nx, y: ny + dist });
    }

    // --- 2. PERPENDIKULĀRI SAVIENOJUMI (L-stūri un T-savienojumi) ---
    // A) Kaimiņš horizontāls (2x1), velkamais vertikāls (1x2 vai 1x1)
    if (isNeighborHoriz && !isDraggedHoriz) {
      const distY = (nDim.height + dDim.height) / 2; // (1.0 + dDim.height) / 2

      // Augšējā un apakšējā garā mala (Y = ny ± distY):
      if (dDim.width === 1.0) {
        // Velkamais ir 1m plats: drīkst atrasties TIKAI kreisajā (-0.5m) vai labajā (+0.5m) blokā!
        // Nekad vidū (xo = 0), jo tas atstātu 0.5m izvirzījumus abās pusēs!
        for (const yo of [-distY, distY]) {
          candidateCoords.push({ x: nx - 0.5, y: ny + yo });
          candidateCoords.push({ x: nx + 0.5, y: ny + yo });
        }
      } else if (dDim.width === 2.0) {
        // 2m pret 2m: centrēts pilns pārklājums
        for (const yo of [-distY, distY]) {
          candidateCoords.push({ x: nx, y: ny + yo });
        }
      }

      // Kaimiņa kreisais un labais īsais gals (X = nx ± distX):
      const distX = (nDim.width + dDim.width) / 2; // (2.0 + dDim.width) / 2
      if (dDim.height === 2.0) {
        // Velkamais ir 2m augsts: lai stūris būtu FLUSH (Image 2 ✓),
        // yo drīkst būt TIKAI -0.5 (apakša flush) vai +0.5 (augša flush)!
        // NEKAD yo = 0, jo tas izveido 0.5m izvirzījumus uz abām pusēm (Image 1 ✗)!
        for (const xo of [-distX, distX]) {
          candidateCoords.push({ x: nx + xo, y: ny - 0.5 });
          candidateCoords.push({ x: nx + xo, y: ny + 0.5 });
        }
      } else if (dDim.height === 1.0) {
        // Velkamais ir 1m kubveida: precīzi flush pie 1m gala (yo = 0)
        for (const xo of [-distX, distX]) {
          candidateCoords.push({ x: nx + xo, y: ny });
        }
      }
    }

    // B) Kaimiņš vertikāls (1x2), velkamais horizontāls (2x1 vai 1x1)
    if (isNeighborVert && !isDraggedVert) {
      const distX = (nDim.width + dDim.width) / 2; // (1.0 + dDim.width) / 2

      // Kreisā un labā garā mala (X = nx ± distX):
      if (dDim.height === 1.0) {
        // Velkamais ir 1m augsts: drīkst atrasties TIKAI augšējā (-0.5m) vai apakšējā (+0.5m) 1m blokā!
        for (const xo of [-distX, distX]) {
          candidateCoords.push({ x: nx + xo, y: ny - 0.5 });
          candidateCoords.push({ x: nx + xo, y: ny + 0.5 });
        }
      } else if (dDim.height === 2.0) {
        for (const xo of [-distX, distX]) {
          candidateCoords.push({ x: nx + xo, y: ny });
        }
      }

      // Kaimiņa augšējais un apakšējais īsais gals (Y = ny ± distY):
      const distY = (nDim.height + dDim.height) / 2; // (2.0 + dDim.height) / 2
      if (dDim.width === 2.0) {
        // Velkamais ir 2m plats: xo drīkst būt TIKAI -0.5 (kreisā puse flush) vai +0.5 (labā puse flush)!
        for (const yo of [-distY, distY]) {
          candidateCoords.push({ x: nx - 0.5, y: ny + yo });
          candidateCoords.push({ x: nx + 0.5, y: ny + yo });
        }
      } else if (dDim.width === 1.0) {
        for (const yo of [-distY, distY]) {
          candidateCoords.push({ x: nx, y: ny + yo });
        }
      }
    }

    // C) Kaimiņš mazais (1x1 kvadrāts)
    if (isNeighborSquare) {
      if (isDraggedHoriz) {
        // Gals pie gala
        candidateCoords.push({ x: nx - 1.5, y: ny });
        candidateCoords.push({ x: nx + 1.5, y: ny });
        // Garā mala pie 1m kuba (xo drīkst būt tikai -0.5 vai +0.5, nekad 0!)
        for (const xo of [-0.5, 0.5]) {
          candidateCoords.push({ x: nx + xo, y: ny - 1.0 });
          candidateCoords.push({ x: nx + xo, y: ny + 1.0 });
        }
      } else if (isDraggedVert) {
        // Gals pie gala
        candidateCoords.push({ x: nx, y: ny - 1.5 });
        candidateCoords.push({ x: nx, y: ny + 1.5 });
        // Garā mala pie 1m kuba (yo drīkst būt tikai -0.5 vai +0.5, nekad 0!)
        for (const yo of [-0.5, 0.5]) {
          candidateCoords.push({ x: nx - 1.0, y: ny + yo });
          candidateCoords.push({ x: nx + 1.0, y: ny + yo });
        }
      } else if (isDraggedSquare) {
        // Divi 1x1 moduļi
        candidateCoords.push({ x: nx - 1.0, y: ny });
        candidateCoords.push({ x: nx + 1.0, y: ny });
        candidateCoords.push({ x: nx, y: ny - 1.0 });
        candidateCoords.push({ x: nx, y: ny + 1.0 });
      }
    }

    // Validējam katru kandidātu: kolīzijas, pilna biezuma saskare un 500mm režģa noapaļošana
    for (let i = 0; i < candidateCoords.length; i++) {
      const coord = candidateCoords[i];
      const cx = snapToGrid(coord.x);
      const cy = snapToGrid(coord.y);

      const candidateMod = {
        ...draggedMod,
        x: cx,
        y: cy
      };

      // 1. Pārbaudām, vai ar kaimiņu ir atļauta PILNA biezuma saskare (bez pusbiezuma izvirzījumiem)
      if (!isFullThicknessConnection(candidateMod, neighborMod)) continue;

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
    // 1. Pamatlīmenis: Režģa snapošana (0.5 m solis)
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

      // Attāluma filtrs: pārbaudām tikai tuvumā esošos moduļus
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

    // 3. Aizsardzība pret nejaušu pusbiezuma novietošanu:
    // Ja brīvā režģa pozīcija pieskartos kādam modulim uz pusbiezuma,
    // automātiski pievelkam pie tā kaimiņa tuvākās derīgās pilna biezuma pozīcijas!
    const testMod = { ...draggedMod, x: baseGridX, y: baseGridY };
    const invalidNeighbor = hasInvalidHalfThicknessTouch(testMod, allModules);
    if (invalidNeighbor) {
      const candidates = getValidSnapPositionsForNeighbor(draggedMod, invalidNeighbor, allModules);
      let closestCand = null;
      let closestDist = Infinity;
      for (let j = 0; j < candidates.length; j++) {
        const dist = Math.hypot(candidates[j].x - rawGx, candidates[j].y - rawGy);
        if (dist < closestDist) {
          closestDist = dist;
          closestCand = candidates[j];
        }
      }
      if (closestCand) {
        return {
          x: closestCand.x,
          y: closestCand.y,
          snappedToNeighbor: true,
          snapInfo: closestCand
        };
      }
    }

    // Ja kaimiņu piesaiste netika atrasta un nav nepareizas saskares, atgriežam bāzes režģa snapu
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
    isFullThicknessConnection,
    hasInvalidHalfThicknessTouch,
    getContactInfo,
    getValidSnapPositionsForNeighbor,
    calculateSnap
  };
})();
