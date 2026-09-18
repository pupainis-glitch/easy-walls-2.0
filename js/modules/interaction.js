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
  let activeDragCard = null;
  let dragGhost = null;

  function snapToGrid(val) {
    if (EW.Modules && EW.Modules.Snapping && EW.Modules.Snapping.snapToGrid) {
      return EW.Modules.Snapping.snapToGrid(val);
    }
    return Math.round(Math.round(val / 0.5) * 0.5 * 1000) / 1000;
  }

  /**
   * Pievieno jaunu moduli aktīvajā režģī
   * @param {'large'|'small'} type 
   * @param {number} [rot=0] - 0 (horizontāls) vai 90 (vertikāls)
   * @param {number} [targetGx=null] - Izvēles režģa koordināta X
   * @param {number} [targetGy=null] - Izvēles režģa koordināta Y
   */
  function addModule(type, rot = 0, targetGx = null, targetGy = null) {
    const g = S.G();
    if (!g) return;

    if (!g.visible) {
      if (EW.UI) EW.UI.toast('Lūdzu ieslēdziet aktīvo zāli (👁️), lai pievienotu moduli');
      return;
    }

    if (EW.UI && S.mode !== 'pan') {
      EW.UI.setMode('pan');
    }

    const { W, H } = EW.Renderer.getDims();
    let snapGx, snapGy;

    if (targetGx !== null && targetGy !== null && !isNaN(targetGx) && !isNaN(targetGy)) {
      snapGx = snapToGrid(targetGx);
      snapGy = snapToGrid(targetGy);
    } else {
      let targetWx, targetWy;
      if (g.region) {
        const r = g.region;
        const minWx = r.minWx !== undefined ? r.minWx : r.minX;
        const maxWx = r.maxWx !== undefined ? r.maxWx : r.maxX;
        const minWy = r.minWy !== undefined ? r.minWy : r.minY;
        const maxWy = r.maxWy !== undefined ? r.maxWy : r.maxY;
        targetWx = (minWx + maxWx) / 2;
        targetWy = (minWy + maxWy) / 2;
      } else {
        const wp = Grid.s2w(W / 2, H / 2, W, H);
        targetWx = wp.x;
        targetWy = wp.y;
      }
      const gp = Grid.w2g(g, targetWx, targetWy);
      snapGx = snapToGrid(gp.x);
      snapGy = snapToGrid(gp.y);
    }

    let candidate = Geom.createModule(type, g.id, snapGx, snapGy, Number(rot) || 0);

    // Ja novieto brīvi vai ar drag&drop, pielietojam magnētisko snapošanu pie kaimiņiem
    if (EW.Modules && EW.Modules.Snapping && EW.Modules.Snapping.calculateSnap) {
      const snapResult = EW.Modules.Snapping.calculateSnap(candidate, S.modules, snapGx, snapGy);
      if (snapResult && snapResult.snappedToNeighbor) {
        candidate.x = snapToGrid(snapResult.x);
        candidate.y = snapToGrid(snapResult.y);
      }
    }

    // Ja centrā ir kolīzija (kad pievieno ar klikšķi, nevis drag), meklējam brīvu blakus vietu
    const modLen = (type === 'large' ? 2.0 : 1.0);
    if (targetGx === null && Collision && Collision.checkCollision(candidate, S.modules, null)) {
      const offsets = [
        [modLen, 0], [-modLen, 0], [0, 1.0], [0, -1.0],
        [modLen, 1.0], [-modLen, 1.0], [modLen, -1.0], [-modLen, -1.0],
        [2 * modLen, 0], [-2 * modLen, 0], [0, 2.0], [0, -2.0],
        [modLen, 2.0], [-modLen, 2.0], [2 * modLen, 1.0], [-2 * modLen, 1.0]
      ];
      for (let i = 0; i < offsets.length; i++) {
        const testCandidate = Geom.createModule(type, g.id, snapGx + offsets[i][0], snapGy + offsets[i][1], Number(rot) || 0);
        if (!Collision.checkCollision(testCandidate, S.modules, null)) {
          candidate = testCandidate;
          break;
        }
      }
    }

    // Jaunajam modulim īslaicīgs vizuāls izcēlums uz 800ms (statisks akcents)
    candidate.isPulsing = true;
    setTimeout(() => {
      candidate.isPulsing = false;
      if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
    }, 800);

    S.modules.push(candidate);
    S.selectedModuleId = candidate.id;

    // Automātiska kameras piebīdīšana pie jaunā moduļa tikai tad, ja tas ievietots ar pogu centrā
    if (targetGx === null && targetGy === null) {
      const newWp = Grid.g2w(g, candidate.x, candidate.y);
      const sp = Grid.w2s(newWp.x, newWp.y, W, H);
      if (sp.x < 120 || sp.x > W - 120 || sp.y < 120 || sp.y > H - 120) {
        S.view.x = newWp.x;
        S.view.y = newWp.y;
      }
    }

    updateModuleControls();
    EW.Renderer.draw();
    if (EW.UI) {
      const rotLabel = (Number(rot) === 90) ? 'vertikāls' : 'horizontāls';
      const typeLabel = candidate.type === 'large' ? `lielais (2×1m, ${rotLabel})` : 'mazais (1×1m)';
      EW.UI.toast(`Pievienots ${typeLabel} modulis zālē “${g.name}”`);
    }

    return candidate;
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

    const newGx = snapRes ? snapToGrid(snapRes.x) : snapToGrid(rawGx);
    const newGy = snapRes ? snapToGrid(snapRes.y) : snapToGrid(rawGy);

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
    mod.x = snapToGrid(mod.x);
    mod.y = snapToGrid(mod.y);

    // Pārbaudām, vai modulis nav atstāts uz aizliegta pusbiezuma
    if (EW.Modules && EW.Modules.Snapping && typeof EW.Modules.Snapping.hasInvalidHalfThicknessTouch === 'function') {
      const badNeighbor = EW.Modules.Snapping.hasInvalidHalfThicknessTouch(mod, S.modules);
      if (badNeighbor) {
        const snapRes = EW.Modules.Snapping.calculateSnap(mod, S.modules, mod.x, mod.y);
        if (snapRes && snapRes.snappedToNeighbor) {
          mod.x = snapRes.x;
          mod.y = snapRes.y;
        }
      }
    }

    mod.isPulsing = false;
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

  // 1x1 caurspīdīgs attēls OS līmeņa ēnas apspiešanai (pilnībā novērš Windows OLE miglaino ēnu pāri monitoriem)
  const transparentDragImg = new Image();
  transparentDragImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  let dragFollowerEl = null;

  function getDragFollower() {
    if (!dragFollowerEl) {
      dragFollowerEl = document.getElementById('moduleDragFollower');
      if (!dragFollowerEl) {
        dragFollowerEl = document.createElement('div');
        dragFollowerEl.id = 'moduleDragFollower';
        dragFollowerEl.style.cssText = [
          'position: fixed',
          'left: 0',
          'top: 0',
          'pointer-events: none',
          'z-index: 999999',
          'display: none',
          'align-items: center',
          'justify-content: center',
          'background: rgba(255, 247, 237, 0.95)',
          'border: 2px solid #ea580c',
          'border-radius: 4px',
          'box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22)',
          'color: #9a3412',
          'font-family: ui-monospace, monospace',
          'font-size: 11px',
          'font-weight: 700',
          'box-sizing: border-box',
          'transform: translate3d(-9999px, -9999px, 0)',
          'transition: none'
        ].join(';');
        document.body.appendChild(dragFollowerEl);
      }
    }
    return dragFollowerEl;
  }

  function updateDragFollower(type, rot, clientX, clientY, isOverCanvas) {
    const follower = getDragFollower();
    if (!follower) return;

    if (isOverCanvas || !type || clientX == null || clientY == null || (clientX === 0 && clientY === 0)) {
      follower.style.display = 'none';
      return;
    }

    const spec = (Geom && Geom.SPECS)
      ? (Geom.SPECS[type] || Geom.SPECS.large)
      : (type === 'large' ? { length: 2.0, width: 1.0 } : { length: 1.0, width: 1.0 });

    const isRot = (rot === 90 || rot === 270);
    const lenM = isRot ? spec.width : spec.length;
    const widM = isRot ? spec.length : spec.width;

    const g = S.G();
    const pxPerMeter = (g && g.sc ? g.sc : 40) * (S.view && S.view.s ? S.view.s : 1);
    const mScale = Math.max(30, Math.min(80, pxPerMeter));

    const w = Math.round(lenM * mScale);
    const h = Math.round(widM * mScale);

    follower.style.width = w + 'px';
    follower.style.height = h + 'px';
    follower.textContent = `${lenM.toFixed(1)}×${widM.toFixed(1)}m`;
    follower.style.transform = `translate3d(${Math.round(clientX - w / 2)}px, ${Math.round(clientY - h / 2)}px, 0)`;
    follower.style.display = 'flex';
  }

  function hideDragFollower() {
    if (dragFollowerEl) {
      dragFollowerEl.style.display = 'none';
      dragFollowerEl.style.transform = 'translate3d(-9999px, -9999px, 0)';
    }
  }

  function initDragAndDrop() {
    if (initDragAndDrop._initialized) return;
    initDragAndDrop._initialized = true;

    // 1. Moduļu vilkšanas kartītes no paletes
    const cards = document.querySelectorAll('.module-drag-card');
    cards.forEach(card => {
      card.addEventListener('dragstart', ev => {
        const type = card.getAttribute('data-mod-type') || 'large';
        const rot = parseInt(card.getAttribute('data-mod-rot'), 10) || 0;
        activeDragCard = { type, rot };
        ev.dataTransfer.setData('text/plain', JSON.stringify({ type, rot }));
        ev.dataTransfer.effectAllowed = 'copy';
        card.style.opacity = '0.5';

        // Pilnībā apspiežam OS līmeņa OLE drag ēnu (kas Windows DWM dēļ stiepjas pāri monitoriem)
        try {
          if (ev.dataTransfer && ev.dataTransfer.setDragImage) {
            ev.dataTransfer.setDragImage(transparentDragImg, 0, 0);
          }
        } catch (err) {
          console.warn('Neizdevās uzstādīt transparent dragImage:', err);
        }

        // Parādām tīru pārlūka DOM sekotāju
        updateDragFollower(type, rot, ev.clientX, ev.clientY, false);
      });

      card.addEventListener('drag', ev => {
        if (activeDragCard && ev.clientX > 0 && ev.clientY > 0) {
          const cv = document.getElementById('cv');
          const isOverCanvas = cv && (ev.target === cv || cv.contains(ev.target));
          updateDragFollower(activeDragCard.type, activeDragCard.rot, ev.clientX, ev.clientY, isOverCanvas);
        }
      });

      card.addEventListener('dragend', () => {
        card.style.opacity = '1';
        activeDragCard = null;
        hideDragFollower();
        if (dragGhost) {
          dragGhost = null;
          if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
        }
      });
    });

    // Sekojam kursoram pa visu dokumentu, kamēr velk
    document.addEventListener('dragover', ev => {
      if (!activeDragCard) return;
      const cv = document.getElementById('cv');
      const isOverCanvas = cv && (ev.target === cv || cv.contains(ev.target));
      updateDragFollower(activeDragCard.type, activeDragCard.rot, ev.clientX, ev.clientY, isOverCanvas);
    });

    document.addEventListener('drop', () => {
      hideDragFollower();
    });

    // 2. Direct click "+ Pievienot" pogas
    const addBtns = document.querySelectorAll('.btn-add-mod-direct');
    addBtns.forEach(btn => {
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        const type = btn.getAttribute('data-add-type') || 'large';
        const rot = parseInt(btn.getAttribute('data-add-rot'), 10) || 0;
        addModule(type, rot);
      });
    });

    // 3. Canvas Dragover, Dragleave & Drop apstrāde ar tūlītēju Ghost priekšskatījumu
    const cv = document.getElementById('cv');
    if (cv) {
      cv.addEventListener('dragover', ev => {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'copy';
        hideDragFollower();
        if (!activeDragCard) return;

        const g = S.G();
        if (!g || !g.visible) return;

        const rect = cv.getBoundingClientRect();
        const sx = ev.clientX - rect.left;
        const sy = ev.clientY - rect.top;
        const { W, H } = EW.Renderer.getDims();

        const wp = Grid.s2w(sx, sy, W, H);
        const gp = Grid.w2g(g, wp.x, wp.y);

        const snapGx = snapToGrid(gp.x);
        const snapGy = snapToGrid(gp.y);

        let finalGx = snapGx;
        let finalGy = snapGy;
        const tempMod = Geom.createModule(activeDragCard.type, g.id, snapGx, snapGy, activeDragCard.rot);
        if (EW.Modules && EW.Modules.Snapping) {
          const snapRes = EW.Modules.Snapping.calculateSnap(tempMod, S.modules, snapGx, snapGy);
          if (snapRes && snapRes.snappedToNeighbor) {
            finalGx = snapToGrid(snapRes.x);
            finalGy = snapToGrid(snapRes.y);
          }
        }

        tempMod.x = finalGx;
        tempMod.y = finalGy;
        const hasCollision = !!(Collision && Collision.checkCollision(tempMod, S.modules, null));

        if (!dragGhost || dragGhost.x !== finalGx || dragGhost.y !== finalGy || dragGhost.hasCollision !== hasCollision) {
          dragGhost = {
            ...tempMod,
            hasCollision,
            isGhost: true
          };
          if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
        }
      });

      cv.addEventListener('dragleave', () => {
        if (dragGhost) {
          dragGhost = null;
          if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
        }
      });

      cv.addEventListener('drop', ev => {
        ev.preventDefault();
        hideDragFollower();
        const raw = ev.dataTransfer.getData('text/plain');
        let data = activeDragCard;
        if (raw) {
          try { data = JSON.parse(raw); } catch { /* ignore */ }
        }
        const targetX = dragGhost ? snapToGrid(dragGhost.x) : null;
        const targetY = dragGhost ? snapToGrid(dragGhost.y) : null;

        dragGhost = null;
        activeDragCard = null;

        if (!data || !data.type) {
          if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
          return;
        }

        const g = S.G();
        if (!g) return;

        if (targetX !== null && targetY !== null) {
          addModule(data.type, data.rot || 0, targetX, targetY);
        } else {
          const rect = cv.getBoundingClientRect();
          const sx = ev.clientX - rect.left;
          const sy = ev.clientY - rect.top;
          const { W, H } = EW.Renderer.getDims();
          const wp = Grid.s2w(sx, sy, W, H);
          const gp = Grid.w2g(g, wp.x, wp.y);
          addModule(data.type, data.rot || 0, snapToGrid(gp.x), snapToGrid(gp.y));
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDragAndDrop);
  } else {
    setTimeout(initDragAndDrop, 100);
  }

  EW.ModulesInteraction = {
    addModule,
    initDragAndDrop,
    rotateSelected,
    deleteSelected,
    getSelectedModule,
    getDragState: () => dragState,
    getDragGhost: () => dragGhost,
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
