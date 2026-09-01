/**
 * Easy walls 2.0 — 3. slānis: Apdares paneļu ģenerēšanas dzinējs
 * Izvieto perimetra paneļus atbilstoši rasējumam LNMM-M3-1020 un lietotāja mezglu shēmām:
 * 1. P-968-E: TIKAI ja siena beidzas konkrēti ar metrīgo brīvo galu.
 * 2. P-1160-L / P-1160-R: L-veida pagriezienu iekšpusēs.
 * 3. P-984-L / P-984-R: Ja pieslēdzas L burta ārpusē moduļa galā.
 * 4. P-2000 / P-1000: Pilnajās brīvajās taisnēs.
 * 5. P-660-L / P-660-R: T-veida savienojumu iekšējos stūros.
 */
window.EW = window.EW || {};
EW.Modules = EW.Modules || {};

(function() {
  const S = EW.State;
  const Grid = EW.Grid;
  const Geom = EW.Modules.Geometry;
  const Snapping = EW.Modules.Snapping;
  const Classifier = EW.Modules.Classifier;

  const PANEL_SPECS = {
    'P-2000': {
      code: 'P-2000',
      dwg: 'LNMM-M2-0081',
      name: 'Panelis 2000×3350',
      length: 2.000,
      height: 3.350,
      thickness: 0.016,
      weight: 84.96,
      hand: null
    },
    'P-1000': {
      code: 'P-1000',
      dwg: 'LNMM-M2-0082',
      name: 'Panelis 1000×3350',
      length: 1.000,
      height: 3.350,
      thickness: 0.016,
      weight: 41.27,
      hand: null
    },
    'P-968-E': {
      code: 'P-968-E',
      dwg: 'LNMM-M2-0084',
      name: 'Gala panelis 968×3350',
      length: 0.968,
      height: 3.350,
      thickness: 0.016,
      weight: 40.06,
      hand: null
    },
    'P-1160-L': {
      code: 'P-1160-L',
      dwg: 'LNMM-M2-0086',
      name: 'Panelis 1160×3350 L',
      length: 1.160,
      height: 3.350,
      thickness: 0.016,
      weight: 44.09,
      hand: 'L',
      dotColor: '#2e7d32'
    },
    'P-1160-R': {
      code: 'P-1160-R',
      dwg: 'LNMM-M2-0087',
      name: 'Panelis 1160×3350 R',
      length: 1.160,
      height: 3.350,
      thickness: 0.016,
      weight: 44.09,
      hand: 'R',
      dotColor: '#d32f2f'
    },
    'P-660-L': {
      code: 'P-660-L',
      dwg: 'LNMM-M2-0088',
      name: 'Panelis 660×3350 L',
      length: 0.660,
      height: 3.350,
      thickness: 0.016,
      weight: 25.28,
      hand: 'L',
      dotColor: '#2e7d32'
    },
    'P-660-R': {
      code: 'P-660-R',
      dwg: 'LNMM-M2-0085',
      name: 'Panelis 660×3350 R',
      length: 0.660,
      height: 3.350,
      thickness: 0.016,
      weight: 25.28,
      hand: 'R',
      dotColor: '#d32f2f'
    },
    'P-984-L': {
      code: 'P-984-L',
      dwg: 'LNMM-M2-0092',
      name: 'Panelis 984×3350 L',
      length: 0.984,
      height: 3.350,
      thickness: 0.016,
      weight: 40.67,
      hand: 'L',
      dotColor: '#2e7d32'
    },
    'P-984-R': {
      code: 'P-984-R',
      dwg: 'LNMM-M2-0091',
      name: 'Panelis 984×3350 R',
      length: 0.984,
      height: 3.350,
      thickness: 0.016,
      weight: 40.67,
      hand: 'R',
      dotColor: '#d32f2f'
    },
    'P-1302': {
      code: 'P-1302',
      dwg: 'LNMM-M2-0170',
      name: 'Panelis 1302×3358',
      length: 1.302,
      height: 3.358,
      thickness: 0.016,
      weight: 54.25,
      hand: null
    }
  };

  let panelSeq = 0;

  function findWallGroups(modules) {
    const list = modules || (S ? S.modules : []);
    if (!list || list.length === 0) return [];

    const visited = new Set();
    const groups = [];

    list.forEach(m => {
      if (visited.has(m.id)) return;

      const groupModules = [];
      const queue = [m];
      visited.add(m.id);

      while (queue.length > 0) {
        const curr = queue.shift();
        groupModules.push(curr);

        list.forEach(other => {
          if (visited.has(other.id)) return;
          if (other.gridId !== curr.gridId) return;

          if (Snapping && Snapping.getContactInfo(curr, other)) {
            visited.add(other.id);
            queue.push(other);
          }
        });
      }

      const gObj = S && S.grids ? S.grids.find(x => x.id === m.gridId) : null;
      const groupId = groups.length + 1;
      const isFree = groupModules.length === 1 && (!Classifier || Classifier.classifySingleModule(groupModules[0], list).code === 'M-FS');

      groups.push({
        id: groupId,
        name: isFree ? ('Siena ' + groupId + ' (brīvstāvoša)') : ('Siena ' + groupId),
        modules: groupModules,
        gridId: m.gridId,
        gridName: gObj ? gObj.name : ('Režģis ' + m.gridId)
      });
    });

    return groups;
  }

  function rotVec(mod, vx, vy) {
    const rad = (mod.rot || 0) * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: vx * cos - vy * sin,
      y: vx * sin + vy * cos
    };
  }

  function modLocalToGrid(mod, lx, ly) {
    const v = rotVec(mod, lx, ly);
    return {
      x: Math.round((mod.x + v.x) * 1000) / 1000,
      y: Math.round((mod.y + v.y) * 1000) / 1000
    };
  }

  function isPointOccupied(gx, gy, excludeModId, modules) {
    for (let i = 0; i < modules.length; i++) {
      const m = modules[i];
      if (m.id === excludeModId) continue;
      if (Geom.containsPointInGrid(m, gx, gy)) return true;
    }
    return false;
  }

  function isSubEdgeFree(mod, lx, ly, normalLx, normalLy, groupModules) {
    const pCenter = modLocalToGrid(mod, lx, ly);
    const norm = rotVec(mod, normalLx, normalLy);
    const checkX = pCenter.x + norm.x * 0.05;
    const checkY = pCenter.y + norm.y * 0.05;
    return !isPointOccupied(checkX, checkY, mod.id, groupModules);
  }

  /**
   * Pārbauda vai 1m gals atrodas L-burta ārpusē
   */
  function getOuterCornerAdjacency(mod, xEnd, groupModules) {
    const stepInX = xEnd - (xEnd > 0 ? 0.3 : -0.3);
    const pTop = modLocalToGrid(mod, stepInX, -0.7);
    const pBot = modLocalToGrid(mod, stepInX, 0.7);

    const hasTopNeighbour = isPointOccupied(pTop.x, pTop.y, mod.id, groupModules);
    const hasBotNeighbour = isPointOccupied(pBot.x, pBot.y, mod.id, groupModules);

    if (hasBotNeighbour && !hasTopNeighbour) {
      return { isOuterCorner: true, hand: (xEnd < 0 ? 'R' : 'L') };
    }
    if (hasTopNeighbour && !hasBotNeighbour) {
      return { isOuterCorner: true, hand: (xEnd < 0 ? 'L' : 'R') };
    }

    return { isOuterCorner: false, hand: null };
  }

  function generatePanelsForGroup(group, allModules) {
    const groupModules = group.modules;
    if (!groupModules || !groupModules.length) return [];

    const panels = [];

    groupModules.forEach(mod => {
      const spec = Geom.SPECS[mod.type] || Geom.SPECS.large;
      const halfL = spec.length / 2;
      const halfW = spec.width / 2;

      // 1. GALI (1.0m platas gala fasādes)
      // A. Neg gals (lx = -halfL)
      const freeNegEnd = isSubEdgeFree(mod, -halfL, -0.25, -1, 0, groupModules) &&
                         isSubEdgeFree(mod, -halfL, 0.25, -1, 0, groupModules);
      if (freeNegEnd) {
        const corner = getOuterCornerAdjacency(mod, -halfL, groupModules);
        if (corner.isOuterCorner) {
          // L burta ārpusē moduļa galā -> P-984-L / P-984-R (2. attēls)
          addPanelInstance(panels, 'P-984-' + corner.hand, mod, group, {
            localCenter: { x: -halfL, y: (corner.hand === 'R' ? 0.008 : -0.008) },
            localNormal: { x: -1, y: 0 }
          });
        } else {
          // Siena beidzas konkrēti ar metrīgo brīvo galu -> P-968-E
          addPanelInstance(panels, 'P-968-E', mod, group, {
            localCenter: { x: -halfL, y: 0 },
            localNormal: { x: -1, y: 0 }
          });
        }
      }

      // B. Pos gals (lx = +halfL)
      const freePosEnd = isSubEdgeFree(mod, halfL, -0.25, 1, 0, groupModules) &&
                         isSubEdgeFree(mod, halfL, 0.25, 1, 0, groupModules);
      if (freePosEnd) {
        const corner = getOuterCornerAdjacency(mod, halfL, groupModules);
        if (corner.isOuterCorner) {
          addPanelInstance(panels, 'P-984-' + corner.hand, mod, group, {
            localCenter: { x: halfL, y: (corner.hand === 'R' ? -0.008 : 0.008) },
            localNormal: { x: 1, y: 0 }
          });
        } else {
          addPanelInstance(panels, 'P-968-E', mod, group, {
            localCenter: { x: halfL, y: 0 },
            localNormal: { x: 1, y: 0 }
          });
        }
      }

      // 2. SĀNU MALAS (Top Y = -halfW un Bottom Y = halfW)
      if (mod.type === 'small') {
        if (isSubEdgeFree(mod, 0, -halfW, 0, -1, groupModules)) {
          addPanelInstance(panels, 'P-1000', mod, group, {
            localCenter: { x: 0, y: -halfW },
            localNormal: { x: 0, y: -1 }
          });
        }
        if (isSubEdgeFree(mod, 0, halfW, 0, 1, groupModules)) {
          addPanelInstance(panels, 'P-1000', mod, group, {
            localCenter: { x: 0, y: halfW },
            localNormal: { x: 0, y: 1 }
          });
        }
      } else {
        processLongSide(panels, mod, group, 'top', -halfW, 0, -1, groupModules);
        processLongSide(panels, mod, group, 'bottom', halfW, 0, 1, groupModules);
      }
    });

    return panels;
  }

  function processLongSide(panels, mod, group, sideName, yVal, normX, normY, groupModules) {
    const f1 = isSubEdgeFree(mod, -0.75, yVal, normX, normY, groupModules);
    const f2 = isSubEdgeFree(mod, -0.25, yVal, normX, normY, groupModules);
    const f3 = isSubEdgeFree(mod, 0.25, yVal, normX, normY, groupModules);
    const f4 = isSubEdgeFree(mod, 0.75, yVal, normX, normY, groupModules);

    // 1. Pilnīga taisne
    if (f1 && f2 && f3 && f4) {
      addPanelInstance(panels, 'P-2000', mod, group, {
        localCenter: { x: 0, y: yVal },
        localNormal: { x: normX, y: normY }
      });
      return;
    }

    // 2. T-savienojums vidū (skat. 3. attēlu)
    if (f1 && !f2 && !f3 && f4) {
      addPanelInstance(panels, 'P-660-R', mod, group, {
        localCenter: { x: -0.67, y: yVal },
        localNormal: { x: normX, y: normY }
      });
      addPanelInstance(panels, 'P-660-L', mod, group, {
        localCenter: { x: 0.67, y: yVal },
        localNormal: { x: normX, y: normY }
      });
      return;
    }

    // 3. L-veida pagrieziena iekšpuse (1160 L un R versijas - skat. 2. attēlu):
    // A. Kreisā puse aizsegta, labā brīva -> P-1160-R
    if (!f1 && !f2 && (f3 || f4)) {
      addPanelInstance(panels, 'P-1160-R', mod, group, {
        localCenter: { x: 0.42, y: yVal },
        localNormal: { x: normX, y: normY }
      });
      return;
    }

    // B. Labā puse aizsegta, kreisā brīva -> P-1160-L
    if ((f1 || f2) && !f3 && !f4) {
      addPanelInstance(panels, 'P-1160-L', mod, group, {
        localCenter: { x: -0.42, y: yVal },
        localNormal: { x: normX, y: normY }
      });
      return;
    }

    // C. Viens stūris daļēji aizsegts -> P-2000 taisnei
    if ((f1 && f2 && f3 && !f4) || (!f1 && f2 && f3 && f4)) {
      addPanelInstance(panels, 'P-2000', mod, group, {
        localCenter: { x: (!f1 ? 0.2 : -0.2), y: yVal },
        localNormal: { x: normX, y: normY }
      });
      return;
    }
  }

  function addPanelInstance(panels, panelCode, mod, group, geom) {
    const meta = PANEL_SPECS[panelCode];
    if (!meta) return;

    panelSeq++;
    const gridCenter = modLocalToGrid(mod, geom.localCenter.x, geom.localCenter.y);
    const gridNormal = rotVec(mod, geom.localNormal.x, geom.localNormal.y);

    let panelAngle = (mod.rot || 0);
    if (Math.abs(geom.localNormal.x) > 0.5) {
      panelAngle = (panelAngle + 90) % 360;
    }

    panels.push({
      id: 'p_' + panelSeq,
      code: meta.code,
      name: meta.name,
      dwg: meta.dwg,
      length: meta.length,
      height: meta.height,
      thickness: meta.thickness,
      weight: meta.weight,
      hand: meta.hand,
      dotColor: meta.dotColor || null,
      modId: mod.id,
      gridId: mod.gridId,
      wallGroupId: group.id,
      wallGroupName: group.name,
      gridCenter,
      gridNormal,
      panelAngle,
      localCenter: geom.localCenter,
      localNormal: geom.localNormal
    });
  }

  function generatePanels(targetGroupId) {
    panelSeq = 0;
    const list = S ? S.modules : [];
    const groups = findWallGroups(list);
    let allPanels = [];

    if (targetGroupId) {
      const g = groups.find(x => x.id === targetGroupId);
      if (g) {
        allPanels = generatePanelsForGroup(g, list);
      }
    } else {
      groups.forEach(g => {
        const pList = generatePanelsForGroup(g, list);
        allPanels.push(...pList);
      });
    }

    if (S) {
      S.panels = allPanels;
      S.wallGroups = groups;
      S.showPanels = true;
    }

    if (EW.Renderer) EW.Renderer.draw();
    if (EW.UI) {
      EW.UI.toast('Ģenerēti ' + allPanels.length + ' apdares paneļi (' + groups.length + ' sienas)');
    }

    return { groups, panels: allPanels };
  }

  function clearPanels() {
    if (S) {
      S.panels = [];
    }
    if (EW.Renderer) EW.Renderer.draw();
    if (EW.UI) {
      EW.UI.toast('Apdares paneļi dzēsti');
    }
  }

  function getPanelSpecification(panels) {
    const list = panels || (S ? S.panels : []);
    if (!list || !list.length) return { groups: [], totalCount: 0, totalWeight: 0 };

    const grouped = {};
    let totalCount = 0;
    let totalWeight = 0;

    list.forEach(p => {
      if (!grouped[p.code]) {
        grouped[p.code] = {
          code: p.code,
          name: p.name,
          dwg: p.dwg,
          length: p.length,
          hand: p.hand,
          dotColor: p.dotColor,
          unitWeight: p.weight,
          count: 0,
          totalWeight: 0
        };
      }
      grouped[p.code].count++;
      grouped[p.code].totalWeight += p.weight;
      totalCount++;
      totalWeight += p.weight;
    });

    const specList = Object.values(grouped).sort((a, b) => b.count - a.count);
    return {
      groups: specList,
      totalCount,
      totalWeight: Math.round(totalWeight * 100) / 100
    };
  }

  EW.Modules.Panels = {
    PANEL_SPECS,
    findWallGroups,
    generatePanelsForGroup,
    generatePanels,
    clearPanels,
    getPanelSpecification
  };
})();
