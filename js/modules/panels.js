/**
 * Easy walls 2.0 — 3. slānis: Apdares paneļu ģenerēšanas dzinējs
 * Izvieto perimetra paneļus atbilstoši rasējumam LNMM-M3-1020 un taksonometrijai
 */
window.EW = window.EW || {};
EW.Modules = EW.Modules || {};

(function() {
  const S = EW.State;
  const Grid = EW.Grid;
  const Geom = EW.Modules.Geometry;
  const Snapping = EW.Modules.Snapping;
  const Classifier = EW.Modules.Classifier;

  // Paneļu taksonometrijas definīcijas
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
      dotColor: '#2e7d32' // Zaļš punkts
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
      dotColor: '#d32f2f' // Sarkans punkts
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

  /**
   * Atrod visas neatkarīgās karkasa moduļu grupas (sienu salas)
   * @param {Array} modules 
   * @returns {Array} [{ id, name, modules, gridId, gridName }]
   */
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

  function generatePanelsForGroup(group, allModules) {
    const list = allModules || (S ? S.modules : []);
    if (!group || !group.modules || !group.modules.length) return [];

    const panels = [];

    group.modules.forEach(mod => {
      const cls = Classifier ? Classifier.classifySingleModule(mod, list) : { code: 'M-LN' };
      const code = cls.code;
      const spec = Geom.SPECS[mod.type] || Geom.SPECS.large;
      const halfL = spec.length / 2;
      const halfW = spec.width / 2;

      const contacts = [];
      list.forEach(other => {
        if (other.id === mod.id || other.gridId !== mod.gridId) return;
        const c = Snapping ? Snapping.getContactInfo(mod, other) : null;
        if (c) {
          const rad = -(mod.rot || 0) * Math.PI / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const dx = c.contactCenter.x - mod.x;
          const dy = c.contactCenter.y - mod.y;
          const localCenter = {
            x: Math.round((dx * cos - dy * sin) * 1000) / 1000,
            y: Math.round((dx * sin + dy * cos) * 1000) / 1000
          };
          contacts.push({ other, touchAxis: c.touchAxis, overlapLength: c.overlapLength, localCenter });
        }
      });

      // Pārbaude balstoties uz lokālajām koordinātām (neatkarīgi no moduļa rotācijas leņķa)
      const hasEndNeg = contacts.some(c => Math.abs(c.localCenter.x - (-halfL)) < 0.15);
      const hasEndPos = contacts.some(c => Math.abs(c.localCenter.x - halfL) < 0.15);
      const hasTopSide = contacts.some(c => Math.abs(c.localCenter.y - (-halfW)) < 0.15);
      const hasBottomSide = contacts.some(c => Math.abs(c.localCenter.y - halfW) < 0.15);

      // 1. Gala paneļi: P-968-E (tikai ja gals ir pilnīgi brīvs)
      if (!hasEndNeg) {
        addPanelInstance(panels, 'P-968-E', mod, group, {
          localCenter: { x: -halfL, y: 0 },
          localNormal: { x: -1, y: 0 },
          localLen: 0.968
        });
      }
      if (!hasEndPos) {
        addPanelInstance(panels, 'P-968-E', mod, group, {
          localCenter: { x: halfL, y: 0 },
          localNormal: { x: 1, y: 0 },
          localLen: 0.968
        });
      }

      // 2. Taisnie un stūru sānu paneļi
      if (mod.type === 'small') {
        if (!hasTopSide) {
          addPanelInstance(panels, 'P-1000', mod, group, {
            localCenter: { x: 0, y: -halfW },
            localNormal: { x: 0, y: -1 },
            localLen: 1.000
          });
        }
        if (!hasBottomSide) {
          addPanelInstance(panels, 'P-1000', mod, group, {
            localCenter: { x: 0, y: halfW },
            localNormal: { x: 0, y: 1 },
            localLen: 1.000
          });
        }
      } else {
        handleSidePanels(panels, mod, group, 'top', hasTopSide, contacts, code);
        handleSidePanels(panels, mod, group, 'bottom', hasBottomSide, contacts, code);
      }
    });

    return panels;
  }

  function handleSidePanels(panels, mod, group, side, hasSideContact, contacts, code) {
    const halfL = 1.0;
    const halfW = 0.5;
    const isTop = (side === 'top');
    const yVal = isTop ? -halfW : halfW;
    const normalY = isTop ? -1 : 1;

    if (!hasSideContact) {
      addPanelInstance(panels, 'P-2000', mod, group, {
        localCenter: { x: 0, y: yVal },
        localNormal: { x: 0, y: normalY },
        localLen: 2.000
      });
      return;
    }

    const sideContacts = contacts.filter(c => Math.abs(c.localCenter.y - yVal) < 0.15);

    const centerContact = sideContacts.find(c => Math.abs(c.localCenter.x) < 0.35);
    if (centerContact) {
      addPanelInstance(panels, 'P-660-L', mod, group, {
        localCenter: { x: -0.67, y: yVal },
        localNormal: { x: 0, y: normalY },
        localLen: 0.660
      });
      addPanelInstance(panels, 'P-660-R', mod, group, {
        localCenter: { x: 0.67, y: yVal },
        localNormal: { x: 0, y: normalY },
        localLen: 0.660
      });
      return;
    }

    const cornerNeg = sideContacts.find(c => c.localCenter.x < -0.2);
    const cornerPos = sideContacts.find(c => c.localCenter.x > 0.2);

    if (cornerNeg) {
      addPanelInstance(panels, 'P-1160-R', mod, group, {
        localCenter: { x: 0.42, y: yVal },
        localNormal: { x: 0, y: normalY },
        localLen: 1.160
      });
    } else if (cornerPos) {
      addPanelInstance(panels, 'P-1160-L', mod, group, {
        localCenter: { x: -0.42, y: yVal },
        localNormal: { x: 0, y: normalY },
        localLen: 1.160
      });
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
    getPanelSpecification
  };
})();
