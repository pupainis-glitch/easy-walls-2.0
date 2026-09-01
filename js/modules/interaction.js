/**
 * Easy walls 2.0 — Moduļu pievienošana, atlase, brīva vilkšana (Drag & Drop), pagriešana un dzēšana
 */
window.EW = window.EW || {};
EW.ModulesInteraction = EW.ModulesInteraction || {};

(function() {
  const S = EW.State;
  const Grid = EW.Grid;
  const Geom = EW.Modules.Geometry;
  const Collision = EW.Modules.Collision;

  let dragState = null;

  /**
   * Pievieno jaunu moduli aktīvajā režģī
   * @param {'large'|'small'} type 
   */
  function addModule(type) {
    const g = S.G();
    if (!g) return;

    const { W, H } = EW.Renderer.getDims();
    const barEl = document.getElementById('bar');
    const barHeight = barEl ? barEl.getBoundingClientRect().height : 60;

    // Centrs ekrānā -> world -> aktīvā režģa koordinātas
    const wp = Grid.s2w(W / 2, (H - barHeight) / 2, W, H);
    const gp = Grid.w2g(g, wp.x, wp.y);

    const step = 0.5;
    let snapGx = Math.round(gp.x / step) * step;
    let snapGy = Math.round(gp.y / step) * step;

    // Pārbaudām, vai centra pozīcijā nav kolīzijas; ja ir, meklējam tuvāko brīvo vietu
    let candidate = Geom.createModule(type, g.id, snapGx, snapGy, 0);
    let attempts = 0;
    while (Collision && Collision.checkCollision(candidate, S.modules, null) && attempts < 20) {
      attempts++;
      snapGx += (type === 'large' ? 2.0 : 1.0);
      candidate.x = snapGx;
    }

    if (Collision && Collision.checkCollision(candidate, S.modules, null)) {
      if (EW.UI) EW.UI.toast('Šajā zonā nav brīvas vietas jaunam modulim');
      return;
    }

    S.modules.push(candidate);
    S.selectedModuleId = candidate.id;

    updateModuleControls();
    EW.Renderer.draw();
    if (EW.UI) {
      EW.UI.toast(`Pievienots ${candidate.type === 'large' ? 'lielais (2×1m)' : 'mazais (1×1m)'} modulis`);
    }
  }

  /**
   * Pagriež atlasīto moduli par 90 grādiem ar kolīziju drošības pārbaudi
   */
  function rotateSelected() {
    const mod = getSelectedModule();
    if (!mod) return;

    const nextRot = (mod.rot + 90) % 360;
    const testMod = { ...mod, rot: nextRot };

    if (Collision) {
      const coll = Collision.checkCollision(testMod, S.modules, mod.id);
      if (coll) {
        if (EW.UI) EW.UI.toast('Nevar pagriezt — radīsies pārklāšanās ar citu moduli');
        return;
      }
    }

    mod.rot = nextRot;
    EW.Renderer.draw();
    if (EW.UI) EW.UI.toast(`Modulis pagriezts (${mod.rot}°)`);
  }

  /**
   * Dzēš atlasīto moduli
   */
  function deleteSelected() {
    const mod = getSelectedModule();
    if (!mod) return;
    const idx = S.modules.findIndex(m => m.id === mod.id);
    if (idx >= 0) {
      S.modules.splice(idx, 1);
      S.selectedModuleId = null;
      updateModuleControls();
      EW.Renderer.draw();
      if (EW.UI) EW.UI.toast('Modulis dzēsts');
    }
  }

  function getSelectedModule() {
    if (!S.selectedModuleId) return null;
    return S.modules.find(m => m.id === S.selectedModuleId) || null;
  }

  function updateModuleControls() {
    const hasSelection = !!getSelectedModule();
    const btnRot = document.getElementById('btnRotateMod');
    const btnDel = document.getElementById('btnDeleteMod');
    const modCount = document.getElementById('modCountLabel');

    if (btnRot) btnRot.disabled = !hasSelection;
    if (btnDel) btnDel.disabled = !hasSelection;

    // Automātiski atjauninām moduļu klasifikāciju
    let spec = { groups: [], totalCount: 0, totalWeight: 0 };
    if (EW.Modules && EW.Modules.Classifier) {
      spec = EW.Modules.Classifier.updateClassification(S.modules);
    }

    if (modCount) {
      if (S.modules.length === 0) {
        modCount.textContent = '0 moduļi';
      } else {
        modCount.innerHTML = `<b>${spec.totalCount}</b> mod. · <b>${EW.Utils.fmt(spec.totalWeight)}</b> kg`;
      }
    }
  }

  /**
   * PointerDown: Pārbauda, vai noklikšķināts uz moduļa. Ja jā, sāk vilkšanu (Drag).
   */
  function onPointerDown(e) {
    if (S.mode !== 'pan') return false;

    const cv = EW.Renderer.getCanvas();
    const { W, H } = EW.Renderer.getDims();
    const r = cv.getBoundingClientRect();
    const wp = Grid.s2w(e.clientX - r.left, e.clientY - r.top, W, H);

    // Meklējam moduli no augšējā (jaunākā) uz apakšējo
    let hitModule = null;
    let hitGrid = null;
    for (let i = S.modules.length - 1; i >= 0; i--) {
      const m = S.modules[i];
      const g = S.grids.find(x => x.id === m.gridId) || S.G();
      if (!g || !g.visible) continue;

      const gp = Grid.w2g(g, wp.x, wp.y);
      if (Geom.containsPointInGrid(m, gp.x, gp.y)) {
        hitModule = m;
        hitGrid = g;
        break;
      }
    }

    if (hitModule) {
      S.selectedModuleId = hitModule.id;
      const gp = Grid.w2g(hitGrid, wp.x, wp.y);

      dragState = {
        mod: hitModule,
        grid: hitGrid,
        startX: hitModule.x,
        startY: hitModule.y,
        pointerStartX: gp.x,
        pointerStartY: gp.y,
        lastValidX: hitModule.x,
        lastValidY: hitModule.y,
        hasMoved: false
      };

      updateModuleControls();
      EW.Renderer.draw();
      return true; // Pārtver notikumu, lai kanvas skats netiktu bīdīts
    }

    return false;
  }

  /**
   * PointerMove: Veic moduļa vilkšanu un reāllaika kolīziju pārbaudi
   */
  function onPointerMove(e) {
    if (!dragState) return false;

    const cv = EW.Renderer.getCanvas();
    const { W, H } = EW.Renderer.getDims();
    const r = cv.getBoundingClientRect();
    const wp = Grid.s2w(e.clientX - r.left, e.clientY - r.top, W, H);
    const gp = Grid.w2g(dragState.grid, wp.x, wp.y);

    const rawGx = dragState.startX + deltaX;
    const rawGy = dragState.startY + deltaY;

    // Inteliģentā snapošana (režģis + kaimiņi)
    const Snapping = EW.Modules.Snapping;
    let snapRes = null;
    if (Snapping) {
      snapRes = Snapping.calculateSnap(dragState.mod, S.modules, rawGx, rawGy);
    }

    const newGx = snapRes ? snapRes.x : Math.round(rawGx / 0.5) * 0.5;
    const newGy = snapRes ? snapRes.y : Math.round(rawGy / 0.5) * 0.5;

    dragState.mod.x = newGx;
    dragState.mod.y = newGy;
    dragState.activeSnap = (snapRes && snapRes.snappedToNeighbor) ? snapRes.snapInfo : null;

    // Kolīziju pārbaude
    let hasColl = false;
    if (Collision) {
      const coll = Collision.checkCollision(dragState.mod, S.modules, dragState.mod.id);
      hasColl = !!coll;
    }
    dragState.mod.hasCollision = hasColl;

    // Ja kolīzijas nav, saglabājam kā pēdējo derīgo pozīciju
    if (!hasColl) {
      dragState.lastValidX = newGx;
      dragState.lastValidY = newGy;
    }

    EW.Renderer.draw();
    return true;
  }

  /**
   * PointerUp: Pabeidz vilkšanu un bloķē pārklāšanos
   */
  function onPointerUp(e) {
    if (!dragState) return false;

    const mod = dragState.mod;
    if (mod.hasCollision) {
      // Stingrā pārklāšanās bloķēšana: atgriežam iepriekšējā vietā
      mod.x = dragState.lastValidX;
      mod.y = dragState.lastValidY;
      mod.hasCollision = false;
      if (EW.UI) {
        EW.UI.toast('Pārklāšanās nav atļauta — modulis atgriezts iepriekšējā pozīcijā');
      }
    }

    dragState = null;
    updateModuleControls();
    EW.Renderer.draw();
    return true;
  }

  /**
   * Klikšķis kanvasā tukšā vietā noņem atlasi
   */
  function onClick(e) {
    const cv = EW.Renderer.getCanvas();
    const { W, H } = EW.Renderer.getDims();
    const r = cv.getBoundingClientRect();
    const wp = Grid.s2w(e.clientX - r.left, e.clientY - r.top, W, H);

    let hit = false;
    for (let i = S.modules.length - 1; i >= 0; i--) {
      const m = S.modules[i];
      const g = S.grids.find(x => x.id === m.gridId) || S.G();
      if (!g || !g.visible) continue;

      const gp = Grid.w2g(g, wp.x, wp.y);
      if (Geom.containsPointInGrid(m, gp.x, gp.y)) {
        hit = true;
        break;
      }
    }

    if (!hit) {
      S.selectedModuleId = null;
      updateModuleControls();
      EW.Renderer.draw();
    }
  }

  /**
   * Tastatūras saīsnes
   */
  function onKeyDown(e) {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return false;

    if (e.key === 'r' || e.key === 'R') {
      if (S.selectedModuleId) {
        e.preventDefault();
        rotateSelected();
        return true;
      }
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (S.selectedModuleId) {
        e.preventDefault();
        deleteSelected();
        return true;
      }
    }

    return false;
  }

  /**
   * Specifikācijas modāļa atvēršana
   */
  function openSpecModal() {
    renderSpecTable();
    const modal = document.getElementById('specModal');
    if (modal) modal.classList.add('open');
  }

  function renderSpecTable() {
    const tableWrap = document.getElementById('specTableWrap');
    const summaryWrap = document.getElementById('specSummaryWrap');
    if (!tableWrap || !summaryWrap) return;

    const spec = EW.Modules.Classifier
      ? EW.Modules.Classifier.updateClassification(S.modules)
      : { groups: [], totalCount: 0, totalWeight: 0 };

    if (!spec.groups.length) {
      tableWrap.innerHTML = '<div class="empty">Plānā vēl nav izvietots neviens modulis.</div>';
      summaryWrap.innerHTML = '<span>Kopā: 0 moduļi</span><span>Kopsvars: 0,00 kg</span>';
      return;
    }

    let html = `
      <table class="spec-table">
        <thead>
          <tr>
            <th>Kods</th>
            <th>Apraksts</th>
            <th style="text-align:right">Skaits</th>
            <th style="text-align:right">Vien. svars</th>
            <th style="text-align:right">Kopsvars</th>
          </tr>
        </thead>
        <tbody>
    `;

    spec.groups.forEach(g => {
      html += `
        <tr>
          <td><span class="spec-tag">${g.code}</span></td>
          <td>${g.name}</td>
          <td class="num"><b>${g.count}</b></td>
          <td class="num">${EW.Utils.fmt(g.unitWeight)} kg</td>
          <td class="num"><b>${EW.Utils.fmt(g.totalWeight)} kg</b></td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    tableWrap.innerHTML = html;

    summaryWrap.innerHTML = `
      <span>Kopā moduļi: <b style="color:var(--accent); font-family:var(--mono); font-size:15px;">${spec.totalCount}</b></span>
      <span>Kopējais svars: <b style="color:var(--accent); font-family:var(--mono); font-size:15px;">${EW.Utils.fmt(spec.totalWeight)} kg</b></span>
    `;
  }

  function copySpecText() {
    const spec = EW.Modules.Classifier
      ? EW.Modules.Classifier.updateClassification(S.modules)
      : { groups: [], totalCount: 0, totalWeight: 0 };

    if (!spec.groups.length) {
      if (EW.UI) EW.UI.toast('Nav ko kopēt — moduļu saraksts ir tukšs');
      return;
    }

    let txt = `Easy walls 2.0 — Moduļu specifikācija\n`;
    txt += `Zona: ${S.planName || 'Bez nosaukuma'}\n`;
    txt += `Datums: ${new Date().toLocaleDateString('lv-LV')}\n\n`;
    txt += `Kods\tApraksts\tSkaits\tVien. svars (kg)\tKopsvars (kg)\n`;

    spec.groups.forEach(g => {
      txt += `${g.code}\t${g.name}\t${g.count}\t${g.unitWeight}\t${g.totalWeight}\n`;
    });

    txt += `\nKOPĀ:\t${spec.totalCount} gab.\tKopējais svars:\t${spec.totalWeight} kg\n`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(() => {
        if (EW.UI) EW.UI.toast('Specifikācija nokopēta starpliktuvē!');
      }).catch(() => {
        if (EW.UI) EW.UI.toast('Neizdevās piekļūt starpliktuvei');
      });
    } else {
      if (EW.UI) EW.UI.toast('Starpliktuve nav pieejama');
    }
  }

  EW.ModulesInteraction = {
    addModule,
    rotateSelected,
    deleteSelected,
    getSelectedModule,
    getDragState: () => dragState,
    updateModuleControls,
    openSpecModal,
    renderSpecTable,
    copySpecText,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onClick,
    onKeyDown
  };
})();
