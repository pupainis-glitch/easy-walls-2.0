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

    if (EW.UI && S.mode !== 'pan') {
      EW.UI.setMode('pan');
    }

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
    updateModuleControls();
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
      // Ja lietotne bija 'origin' režīmā, automātiski atgriežamies uz normālo 'pan', jo lietotājs grib kustināt moduli
      if (S.mode === 'origin' && EW.UI) {
        EW.UI.setMode('pan');
      }

      S.selectedModuleId = hitModule.id;

      // Pārslēdzam aktīvo režģi uz šī moduļa režģi, lai UI rādītu pareizo režģi
      const gridIdx = S.grids.findIndex(x => x.id === hitGrid.id);
      if (gridIdx >= 0 && S.active !== gridIdx) {
        S.active = gridIdx;
        if (EW.UI) {
          EW.UI.syncInputs();
          EW.UI.renderChips();
        }
      }

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
      return true; // Pārtver notikumu
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

    const deltaX = gp.x - dragState.pointerStartX;
    const deltaY = gp.y - dragState.pointerStartY;
    if (Math.hypot(deltaX, deltaY) > 0.02) {
      dragState.hasMoved = true;
    }

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
   * PointerUp: Pabeidz vilkšanu un saglabā jauno pozīciju režģī
   */
  function onPointerUp(e) {
    if (!dragState) return false;

    const mod = dragState.mod;
    if (Collision) {
      const coll = Collision.checkCollision(mod, S.modules, mod.id);
      mod.hasCollision = !!coll;
      if (coll && EW.UI) {
        EW.UI.toast('Uzmanību: modulis pārklājas ar citu moduli');
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
  let currentSpecTab = 'frames';

  /**
   * Specifikācijas modāļa atvēršana
   */
  function openSpecModal(tab = 'frames') {
    currentSpecTab = tab;
    updateSpecTabButtons();
    renderSpecTable();
    const modal = document.getElementById('specModal');
    if (modal) modal.classList.add('open');
  }

  function setSpecTab(tab) {
    currentSpecTab = tab;
    updateSpecTabButtons();
    renderSpecTable();
  }

  function updateSpecTabButtons() {
    const btnFrames = document.getElementById('tabFrames');
    const btnPanels = document.getElementById('tabPanels');
    if (btnFrames && btnPanels) {
      if (currentSpecTab === 'frames') {
        btnFrames.className = 'key';
        btnFrames.style.background = '#0277bd';
        btnFrames.style.borderColor = '#0288d1';
        btnFrames.style.color = '#fff';
        btnPanels.className = 'ghost';
        btnPanels.style.background = 'transparent';
        btnPanels.style.color = 'var(--ink)';
      } else {
        btnPanels.className = 'key';
        btnPanels.style.background = '#2e7d32';
        btnPanels.style.borderColor = '#388e3c';
        btnPanels.style.color = '#fff';
        btnFrames.className = 'ghost';
        btnFrames.style.background = 'transparent';
        btnFrames.style.color = 'var(--ink)';
      }
    }
  }

  function renderSpecTable() {
    const tableWrap = document.getElementById('specTableWrap');
    const summaryWrap = document.getElementById('specSummaryWrap');
    if (!tableWrap || !summaryWrap) return;

    const frameSpec = EW.Modules.Classifier
      ? EW.Modules.Classifier.updateClassification(S.modules)
      : { groups: [], totalCount: 0, totalWeight: 0 };

    const panelSpec = EW.Modules.Panels
      ? EW.Modules.Panels.getPanelSpecification(S.panels)
      : { groups: [], totalCount: 0, totalWeight: 0 };

    if (currentSpecTab === 'frames') {
      // 1. Karkasa moduļi
      if (!frameSpec.groups.length) {
        tableWrap.innerHTML = '<div class="empty" style="padding:24px;text-align:center;color:var(--ink-dim)">Plānā vēl nav izvietots neviens karkasa modulis.</div>';
      } else {
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
        frameSpec.groups.forEach(g => {
          html += `
            <tr>
              <td><span class="spec-tag" style="background:rgba(2,119,189,0.15);color:#0288d1;border:1px solid #0288d1">${g.code}</span></td>
              <td>${g.name}</td>
              <td class="num"><b>${g.count}</b></td>
              <td class="num">${EW.Utils.fmt(g.unitWeight)} kg</td>
              <td class="num"><b>${EW.Utils.fmt(g.totalWeight)} kg</b></td>
            </tr>
          `;
        });
        html += '</tbody></table>';
        tableWrap.innerHTML = html;
      }
    } else {
      // 2. Apdares paneļi
      if (!panelSpec.groups.length) {
        tableWrap.innerHTML = '<div class="empty" style="padding:24px;text-align:center;color:var(--ink-dim)">Apdares paneļi vēl nav saģenerēti.<br><button id="btnGenFromSpec" class="key" style="margin-top:10px;background:#2e7d32;border-color:#388e3c">🧩 Ģenerēt paneļus tagad</button></div>';
        const genBtn = document.getElementById('btnGenFromSpec');
        if (genBtn) {
          genBtn.onclick = () => {
            if (EW.Modules.Panels) EW.Modules.Panels.generatePanels();
            renderSpecTable();
          };
        }
      } else {
        let html = `
          <table class="spec-table">
            <thead>
              <tr>
                <th>Kods</th>
                <th>Nosaukums / Izmērs</th>
                <th>Puse</th>
                <th style="text-align:right">Skaits</th>
                <th style="text-align:right">Vien. svars</th>
                <th style="text-align:right">Kopsvars</th>
              </tr>
            </thead>
            <tbody>
        `;
        panelSpec.groups.forEach(p => {
          const dotHtml = p.dotColor
            ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.dotColor};margin-left:4px;vertical-align:middle;"></span>`
            : '';
          const handStr = p.hand ? (p.hand === 'L' ? `Kreisā ${dotHtml}` : `Labā ${dotHtml}`) : '&mdash;';

          html += `
            <tr>
              <td><span class="spec-tag" style="background:rgba(46,125,50,0.15);color:#4caf50;border:1px solid #4caf50">${p.code}</span></td>
              <td>${p.name} (${Math.round(p.length * 1000)}×3350)</td>
              <td>${handStr}</td>
              <td class="num"><b>${p.count}</b></td>
              <td class="num">${EW.Utils.fmt(p.unitWeight)} kg</td>
              <td class="num"><b>${EW.Utils.fmt(p.totalWeight)} kg</b></td>
            </tr>
          `;
        });
        html += '</tbody></table>';
        tableWrap.innerHTML = html;
      }
    }

    const totalWeight = frameSpec.totalWeight + panelSpec.totalWeight;
    summaryWrap.innerHTML = `
      <div>
        Karkass: <b>${frameSpec.totalCount} gab.</b> (${EW.Utils.fmt(frameSpec.totalWeight)} kg) &bull; 
        Paneļi: <b>${panelSpec.totalCount} gab.</b> (${EW.Utils.fmt(panelSpec.totalWeight)} kg)
      </div>
      <div style="color:var(--accent); font-size:14.5px;">
        Kopsvars: <b style="font-family:var(--mono);">${EW.Utils.fmt(totalWeight)} kg</b>
      </div>
    `;
  }

  /**
   * Paneļu ģenerēšanas dialoga atvēršana ar sienu sarakstu
   */
  function openPanelModal() {
    const listWrap = document.getElementById('wallGroupsList');
    const modal = document.getElementById('panelModal');
    if (!listWrap || !modal) return;

    const groups = EW.Modules.Panels ? EW.Modules.Panels.findWallGroups(S.modules) : [];
    if (!groups.length) {
      if (EW.UI) EW.UI.toast('Vispirms ievieto plānā karkasa moduļus');
      return;
    }

    let html = '';
    groups.forEach(g => {
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg-elevated); border:1px solid var(--line); border-radius:6px;">
          <div>
            <div style="font-weight:600; font-size:13.5px; color:var(--ink)">${g.name}</div>
            <div style="font-size:11.5px; color:var(--ink-dim)">${g.modules.length} karkasa moduļi &bull; ${g.gridName}</div>
          </div>
          <button class="btn-gen-single" data-group-id="${g.id}" style="font-size:12px; padding:4px 10px; color:#2e7d32; border-color:#388e3c">
            Ģenerēt šai sienai
          </button>
        </div>
      `;
    });

    listWrap.innerHTML = html;

    // Notikumu klausītāji konkrētai sienai
    listWrap.querySelectorAll('.btn-gen-single').forEach(btn => {
      btn.onclick = () => {
        const gid = parseInt(btn.dataset.groupId, 10);
        if (EW.Modules.Panels) EW.Modules.Panels.generatePanels(gid);
        modal.classList.remove('open');
      };
    });

    modal.classList.add('open');
  }

  function copySpecText() {
    const frameSpec = EW.Modules.Classifier
      ? EW.Modules.Classifier.updateClassification(S.modules)
      : { groups: [], totalCount: 0, totalWeight: 0 };

    const panelSpec = EW.Modules.Panels
      ? EW.Modules.Panels.getPanelSpecification(S.panels)
      : { groups: [], totalCount: 0, totalWeight: 0 };

    let txt = `LNMM Arsenāls — Montāžas materiālu specifikācija\n`;
    txt += `Zona: ${S.planName || 'Bez nosaukuma'}\n`;
    txt += `Datums: ${new Date().toLocaleDateString('lv-LV')}\n\n`;

    txt += `=== 1. KARKASA MODUĻI ===\n`;
    txt += `Kods\tNosaukums\tSkaits\tVien. kg\tKopā kg\n`;
    frameSpec.groups.forEach(g => {
      txt += `${g.code}\t${g.name}\t${g.count}\t${g.unitWeight}\t${g.totalWeight}\n`;
    });
    txt += `Karkass kopā:\t${frameSpec.totalCount} gab.\t${frameSpec.totalWeight} kg\n\n`;

    txt += `=== 2. APDARES PANEĻI (LNMM-M3-1020) ===\n`;
    txt += `Kods\tIzmērs\tPuse\tSkaits\tVien. kg\tKopā kg\n`;
    panelSpec.groups.forEach(p => {
      txt += `${p.code}\t${Math.round(p.length * 1000)}x3350\t${p.hand || '-'}\t${p.count}\t${p.unitWeight}\t${p.totalWeight}\n`;
    });
    txt += `Paneļi kopā:\t${panelSpec.totalCount} gab.\t${panelSpec.totalWeight} kg\n\n`;

    const totalWeight = Math.round((frameSpec.totalWeight + panelSpec.totalWeight) * 100) / 100;
    txt += `KOPĒJAIS MONTĀŽAS SVARS: ${totalWeight} kg\n`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(() => {
        if (EW.UI) EW.UI.toast('Pilna specifikācija nokopēta starpliktuvē!');
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
    setSpecTab,
    openPanelModal,
    renderSpecTable,
    copySpecText,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onClick,
    onKeyDown
  };
})();
