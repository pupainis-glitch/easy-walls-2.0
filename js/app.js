/**
 * Easy walls 2.0 — Galvenais aplikācijas sākumpunkts un notikumu sasaiste
 */
window.EW = window.EW || {};

(function() {
  const S = EW.State;
  const C = EW.Config;
  const U = EW.Utils;
  const Grid = EW.Grid;
  const Store = EW.Store;
  const PdfScale = EW.PdfScale;
  const UI = EW.UI;
  const el = UI.el;

  function initApp() {
    // 1. PDF worker iestatīšana
    if (window.pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    // 2. Kanvas un mijiedarbības inicializācija
    const cv = el('cv');
    EW.Renderer.init(cv);
    EW.Interaction.init(cv);

    // 3. Ievades lauku sasaiste
    UI.bindNum('angle', 'angle');
    UI.bindNum('dx', 'dx');
    UI.bindNum('dy', 'dy');
    UI.bindNum('step', 'step', 0.05);

    if (el('gname')) {
      el('gname').addEventListener('input', e => {
        S.G().name = e.target.value || 'Bez nosaukuma';
        UI.renderChips();
        EW.Renderer.draw();
      });
    }

    if (el('op')) {
      el('op').addEventListener('input', e => {
        S.opacity = e.target.value / 100;
        EW.Renderer.draw();
      });
    }

    if (el('showChain')) {
      el('showChain').addEventListener('change', () => EW.Renderer.draw());
    }

    // Nudge pogas (+ / -)
    document.querySelectorAll('[data-nudge]').forEach(b => {
      b.addEventListener('click', () => {
        const k = b.dataset.nudge;
        const d = U.num(b.dataset.d);
        const g = S.G();
        if ((k === 'dx' || k === 'dy') && g.locked) return;

        const oldG = { ...g };
        g[k] = Math.round((g[k] + d) * 10000) / 10000;

        if ((k === 'dx' || k === 'dy') && S.mode === 'origin' && S.modules && S.modules.length) {
          S.modules.forEach(m => {
            if (m.gridId === g.id) {
              const wp = Grid.g2w(oldG, m.x, m.y);
              const newGp = Grid.w2g(g, wp.x, wp.y);
              m.x = Math.round(newGp.x * 1000) / 1000;
              m.y = Math.round(newGp.y * 1000) / 1000;
            }
          });
        }

        UI.syncInputs();
        EW.Renderer.draw();
      });
    });

    // Modāļu aizvēršana
    document.querySelectorAll('[data-close]').forEach(b => {
      b.addEventListener('click', () => {
        b.closest('.modal').classList.remove('open');
        if (S.mode === 'calib' || S.mode === 'measure') {
          UI.setMode('pan');
          EW.Renderer.draw();
        }
      });
    });

    // Faila ielāde
    if (el('btnLoad')) {
      el('btnLoad').addEventListener('click', () => el('file').click());
    }
    if (el('file')) {
      el('file').addEventListener('change', async e => {
        const f = e.target.files[0];
        if (!f) return;
        S.recordId = null;
        S.planName = f.name.replace(/\.[^.]+$/, '');
        if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
          await UI.loadPdf(f);
        } else {
          UI.loadRaster(f);
        }
        e.target.value = '';
      });
    }

    // Daudzlapu navigācija
    if (el('pgPrev')) {
      el('pgPrev').addEventListener('click', async () => {
        if (S.page > 1) {
          S.page--;
          await UI.renderPdfPage(true);
        }
      });
    }
    if (el('pgNext')) {
      el('pgNext').addEventListener('click', async () => {
        if (S.page < S.pages) {
          S.page++;
          await UI.renderPdfPage(true);
        }
      });
    }

    // Mēroga noteikšana
    if (el('btnAuto')) {
      el('btnAuto').addEventListener('click', async () => {
        if (!S.pdf) {
          UI.toast('Automātiskā noteikšana strādā tikai ar vektoru PDF');
          return;
        }
        const a = await PdfScale.detectScale(await S.pdf.getPage(S.page));
        if (a) {
          PdfScale.applyDetected(a);
          UI.updateScaleInfo();
          EW.Renderer.draw();
        } else {
          UI.toast('Izmēru ķēdi neizdevās atrast — kalibrē manuāli');
        }
      });
    }

    if (el('applyScale')) {
      el('applyScale').addEventListener('click', () => {
        if (!S.pdf) {
          UI.toast('Rasējuma mērogs strādā tikai ar PDF');
          return;
        }
        PdfScale.applyPlotScale(U.num(el('plotScale').value));
        S.detected = null;
        S.chain = null;
        UI.updateScaleInfo();
        EW.Renderer.draw();
        UI.toast(`Mērogs 1:${el('plotScale').value} piemērots`);
      });
    }

    // Kalibrācija un mērīšana
    if (el('btnCalib')) el('btnCalib').addEventListener('click', () => UI.startPick('calib'));
    if (el('btnMeasure')) el('btnMeasure').addEventListener('click', () => UI.startPick('measure'));

    if (el('calibVal')) {
      el('calibVal').addEventListener('keydown', e => {
        if (e.key === 'Enter') el('calibOk').click();
      });
    }

    if (el('calibOk')) {
      el('calibOk').addEventListener('click', () => {
        const real = U.num(el('calibVal').value);
        const d = Math.hypot(S.calibPts[1].x - S.calibPts[0].x, S.calibPts[1].y - S.calibPts[0].y);
        if (!(real > 0) || !(d > 0)) {
          UI.toast('Ievadi derīgu attālumu');
          return;
        }
        PdfScale.setMppPt((S.mppPt || 0.01 * S.R) * (real / d));
        if (S.pdf && EW.Config && EW.Config.PT2M) {
          S.denom = Math.round(S.mppPt / EW.Config.PT2M);
        } else if (S.mpp && S.mpp() > 0) {
          S.denom = Math.round(1 / S.mpp());
        } else {
          S.denom = null;
        }
        S.detected = null;
        UI.updateScaleInfo();
        UI.setMode('pan');
        EW.Renderer.draw();
        UI.toast(`Mērogs kalibrēts pēc ${U.dec(real, 3)} m (1:${S.denom || '—'})`);
        if (EW.Venues && typeof EW.Venues.onScaleCalibrated === 'function') {
          EW.Venues.onScaleCalibrated(S.mppPt, S.denom, real, d);
        }
      });
    }

    // Sākumpunkta pārnešana
    const relocateBtn = el('btnRelocate') || el('btnLock');
    if (relocateBtn) {
      relocateBtn.addEventListener('click', () => {
        if (S.mode === 'origin') {
          S.G().locked = true;
          UI.setMode('pan');
          UI.toast(`${S.G().name}: sākumpunkts nobloķēts`);
        } else {
          UI.setMode('origin');
        }
        UI.syncInputs();
        EW.Renderer.draw();
      });
    }

    // Sākumpunkta bloķēšanas pārslēgšana (X/Y regulēšanai)
    if (el('btnLockToggle')) {
      el('btnLockToggle').addEventListener('click', () => {
        const g = S.G();
        if (!g) return;
        g.locked = !g.locked;
        UI.syncInputs();
        UI.toast(g.locked ? `${g.name}: sākumpunkts nobloķēts` : `${g.name}: atbloķēts (regulē ar X/Y bultiņām vai rullīti)`);
        EW.Renderer.draw();
      });
    }

    // Zāles reģiona iezīmēšana
    if (el('btnRegion')) {
      el('btnRegion').addEventListener('click', () => {
        const g = S.G();
        if (!g) return;
        if (S.mode === 'region') {
          UI.setMode('pan');
          UI.toast('Reģiona iezīmēšana atcelta');
        } else {
          UI.setMode('region');
          UI.toast(`Iezīmē zāles “${g.name}” robežu: velc taisnstūri ar peli`);
        }
        EW.Renderer.draw();
      });
    }

    if (el('btnClearRegion')) {
      el('btnClearRegion').addEventListener('click', () => {
        const g = S.G();
        if (!g) return;
        g.region = null;
        if (el('btnClearRegion')) el('btnClearRegion').style.display = 'none';
        UI.toast(`Zālei “${g.name}” reģiona robeža noņemta`);
        EW.Renderer.draw();
      });
    }

    // Bibliotēka
    if (el('btnLib')) {
      el('btnLib').addEventListener('click', async () => {
        await Store.loadIndex();
        UI.renderCards();
        el('libModal').classList.add('open');
      });
    }

    // Saglabāšana
    if (el('btnSave')) {
      el('btnSave').addEventListener('click', () => {
        if (!S.img) { UI.toast('Vispirms ielādē plānu'); return; }
        if (!S.mppPt) { UI.toast('Vispirms nosaki mērogu'); return; }
        el('saveName').value = S.planName || '';
        el('asNewWrap').style.display = S.recordId ? 'flex' : 'none';
        el('asNew').checked = false;
        el('saveSize').textContent = '';
        el('saveModal').classList.add('open');
        el('saveName').focus();
      });
    }

    if (el('saveName')) {
      el('saveName').addEventListener('keydown', e => {
        if (e.key === 'Enter') el('saveOk').click();
      });
    }

    if (el('saveOk')) {
      el('saveOk').addEventListener('click', async () => {
        const name = el('saveName').value.trim();
        if (!name) { UI.toast('Ievadi nosaukumu'); return; }
        el('saveOk').disabled = true;
        try {
          const id = (S.recordId && !el('asNew').checked) ? S.recordId : null;
          const isTpl = el('chkAsTemplate') ? el('chkAsTemplate').checked : false;
          const rec = Store.buildRecord(name, id, isTpl);
          el('saveSize').textContent = `Ieraksta apjoms ${U.kb(JSON.stringify(rec).length)}`;
          await Store.saveRecord(rec);
          S.recordId = isTpl ? null : rec.id;
          S.planName = name;
          el('saveModal').classList.remove('open');
          EW.Interaction.updateHud();
          UI.toast(isTpl ? `Saglabāts kā telpas bāzes šablons: ${name}` : `Saglabāta ekspozīcija: ${name}`);
        } catch (err) {
          UI.toast('Saglabāt neizdevās — ieraksts par lielu vai atmiņa pilna');
          console.error(err);
        }
        el('saveOk').disabled = false;
      });
    }

    if (el('btnDuplicate')) {
      el('btnDuplicate').addEventListener('click', async () => {
        if (!S.img) {
          UI.toast('Vispirms ielādē vai atver telpas plānu');
          return;
        }
        const currentName = S.planName || 'Arsenāls';
        const copyName = currentName.includes('Kopija') ? currentName : `${currentName} — Kopija`;
        try {
          const rec = Store.buildRecord(copyName, null, false);
          await Store.saveRecord(rec);
          S.recordId = rec.id;
          S.planName = copyName;
          EW.Interaction.updateHud();
          UI.toast(`Izveidota ekspozīcijas kopija: ${copyName}`);
        } catch (e) {
          UI.toast('Neizdevās izveidot kopiju');
        }
      });
    }

    // Ātrā saglabāšana un kopija tieši no Karkasa un Apdares paneļu sadaļām (bez ritināšanas uz apakšu)
    const handleQuickSave = async () => {
      if (!S.img) { UI.toast('Vispirms ielādē vai atver telpas plānu'); return; }
      if (!S.mppPt) { UI.toast('Vispirms nosaki mērogu'); return; }
      if (EW.Variants && typeof EW.Variants.saveCurrentToActiveVariant === 'function') {
        EW.Variants.saveCurrentToActiveVariant();
      }
      if (S.recordId && S.planName) {
        try {
          const rec = Store.buildRecord(S.planName, S.recordId, false);
          await Store.saveRecord(rec);
          EW.Interaction.updateHud();
          if (UI && typeof UI.renderSavedExhibitions === 'function') UI.renderSavedExhibitions();
          UI.toast(`💾 Saglabāta ekspozīcija: ${S.planName}`);
          return;
        } catch (err) {
          console.warn('Ātrā saglabāšana kļūda, atveram dialogu:', err);
        }
      }
      if (el('btnSave')) el('btnSave').click();
    };

    if (el('btnSaveInModules')) {
      el('btnSaveInModules').addEventListener('click', handleQuickSave);
    }
    if (el('btnSaveInPanels')) {
      el('btnSaveInPanels').addEventListener('click', handleQuickSave);
    }
    if (el('btnDuplicateInModules')) {
      el('btnDuplicateInModules').addEventListener('click', () => {
        if (el('btnDuplicate')) el('btnDuplicate').click();
      });
    }
    if (el('btnDuplicateInPanels')) {
      el('btnDuplicateInPanels').addEventListener('click', () => {
        if (el('btnDuplicate')) el('btnDuplicate').click();
      });
    }

    // Eksports un imports
    if (el('btnExport')) {
      el('btnExport').addEventListener('click', async () => {
        const recs = [];
        for (const r of S.index) {
          const rec = await Store.driver.get('ew:wz:' + r.id);
          if (rec) recs.push(rec);
        }
        const blob = new Blob(
          [JSON.stringify({ schema: C.SCHEMA, exported: Date.now(), zones: recs }, null, 1)],
          { type: 'application/json' }
        );
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `easywalls-zonas-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    }

    if (el('btnImport')) {
      el('btnImport').addEventListener('click', () => el('importFile').click());
    }

    if (el('importFile')) {
      el('importFile').addEventListener('change', async e => {
        const f = e.target.files[0];
        if (!f) return;
        try {
          const data = JSON.parse(await f.text());
          const zones = data.zones || (data.schema === C.SCHEMA ? [data] : []);
          if (!zones.length) { UI.toast('Failā nav darba zonu'); return; }
          for (const z of zones) {
            z.id = 'wz_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            await Store.saveRecord(z);
          }
          await Store.loadIndex();
          UI.renderCards();
          UI.toast(`Importētas ${zones.length} zonas`);
        } catch {
          UI.toast('Failu neizdevās nolasīt');
        }
        e.target.value = '';
      });
    }

    // Joslas pārslēgšana
    if (el('btnEdit')) {
      el('btnEdit').addEventListener('click', () => UI.setSlim(false));
    }

    // Sienu moduļu vadības pogas (btnAddLarge/btnAddSmall tiek apstrādāti interaction.js ar vienreizēju piesaisti)
    if (el('btnRotateMod')) {
      el('btnRotateMod').addEventListener('click', () => {
        EW.ModulesInteraction.rotateSelected();
      });
    }
    if (el('btnDeleteMod')) {
      el('btnDeleteMod').addEventListener('click', () => {
        EW.ModulesInteraction.deleteSelected();
      });
    }
    if (el('btnGeneratePanels')) {
      el('btnGeneratePanels').addEventListener('click', () => {
        EW.ModulesInteraction.openPanelModal();
      });
    }
    if (el('btnClearPanels')) {
      el('btnClearPanels').addEventListener('click', () => {
        if (EW.Modules.Panels) EW.Modules.Panels.clearPanels();
      });
    }
    if (el('btnGenAllPanels')) {
      el('btnGenAllPanels').addEventListener('click', () => {
        if (EW.Modules.Panels) EW.Modules.Panels.generatePanels();
        el('panelModal').classList.remove('open');
      });
    }
    if (el('btnPrintSheet')) {
      el('btnPrintSheet').addEventListener('click', () => {
        if (EW.Modules.PdfExport) EW.Modules.PdfExport.printWallSheets();
      });
    }
    if (el('btnSpecPrint')) {
      el('btnSpecPrint').addEventListener('click', () => {
        if (EW.Modules.PdfExport) EW.Modules.PdfExport.printWallSheets();
      });
    }
    if (el('chkShowModules')) {
      el('chkShowModules').addEventListener('change', e => {
        S.showModules = e.target.checked;
        EW.Renderer.draw();
      });
    }
    if (el('chkShowPanels')) {
      el('chkShowPanels').addEventListener('change', e => {
        S.showPanels = e.target.checked;
        EW.Renderer.draw();
      });
    }
    if (el('tabFrames')) {
      el('tabFrames').addEventListener('click', () => {
        EW.ModulesInteraction.setSpecTab('frames');
      });
    }
    if (el('tabPanels')) {
      el('tabPanels').addEventListener('click', () => {
        EW.ModulesInteraction.setSpecTab('panels');
      });
    }
    if (el('btnSpec')) {
      el('btnSpec').addEventListener('click', () => {
        EW.ModulesInteraction.openSpecModal('frames');
      });
    }
    if (el('btnCopySpec')) {
      el('btnCopySpec').addEventListener('click', () => {
        EW.ModulesInteraction.copySpecText();
      });
    }

    // Tēmas (Gaišā studija / Tumšā inženieru) pārvaldība
    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      try { localStorage.setItem('ew_theme', theme); } catch (e) {}
      if (el('btnThemeToggle')) {
        el('btnThemeToggle').innerHTML = theme === 'light' ? '🌙 Tumšā' : '☀️ Gaišā';
        el('btnThemeToggle').title = theme === 'light' ? 'Pārslēgt uz tumšo tēmu' : 'Pārslēgt uz gaišo studijas tēmu';
      }
      EW.Renderer.draw();
    }

    let initialTheme = 'light';
    try {
      initialTheme = localStorage.getItem('ew_theme') || 'light';
    } catch (e) {}
    applyTheme(initialTheme);

    if (el('btnThemeToggle')) {
      el('btnThemeToggle').addEventListener('click', () => {
        const curr = document.documentElement.getAttribute('data-theme') || 'light';
        applyTheme(curr === 'light' ? 'dark' : 'light');
      });
    }

    // ========================================================
    // 1. Jaunas ekspozīcijas vednis (Ēkas un telpas)
    // ========================================================
    let selectedBuildingId = 'arsenals';
    const selectedRoomIds = new Set();

    function renderBuildingGrid() {
      const bGrid = el('buildingGrid');
      if (!bGrid || !EW.Venues) return;
      const buildings = EW.Venues.getBuildings();

      bGrid.innerHTML = '';
      buildings.forEach(b => {
        const card = document.createElement('div');
        card.className = `building-card ${b.id === selectedBuildingId ? 'selected' : ''}`;
        card.innerHTML = `
          <div class="building-icon">${b.icon}</div>
          <div class="building-name">${U.esc(b.name)}</div>
          <div class="building-addr">${U.esc(b.address)}</div>
        `;
        card.onclick = () => {
          selectedBuildingId = b.id;
          selectedRoomIds.clear();
          renderBuildingGrid();
          renderRoomList();
        };
        bGrid.appendChild(card);
      });
    }

    function renderRoomList() {
      const rList = el('newExpRoomList');
      if (!rList || !EW.Venues) return;
      const b = EW.Venues.getBuilding(selectedBuildingId);
      if (!b) return;

      rList.innerHTML = '';
      (b.rooms || []).forEach((rm, idx) => {
        if (selectedRoomIds.size === 0 && idx === 0) {
          selectedRoomIds.add(rm.id); // Noklusēti atzīmē pirmo zāli
        }
        const isChecked = selectedRoomIds.has(rm.id);
        const item = document.createElement('div');
        item.className = `room-item ${isChecked ? 'selected' : ''}`;
        item.innerHTML = `
          <input type="checkbox" id="chk_rm_${rm.id}" ${isChecked ? 'checked' : ''}>
          <div class="room-item-text">
            <div class="room-item-title">${U.esc(rm.name)}</div>
            <div class="room-item-desc">${U.esc(rm.description || '')} (${rm.widthM}×${rm.heightM}m, 500mm režģis)</div>
          </div>
        `;
        item.onclick = (e) => {
          if (e.target.tagName !== 'INPUT') {
            const chk = item.querySelector('input[type="checkbox"]');
            chk.checked = !chk.checked;
          }
          const chk = item.querySelector('input[type="checkbox"]');
          if (chk.checked) {
            selectedRoomIds.add(rm.id);
            item.classList.add('selected');
          } else {
            selectedRoomIds.delete(rm.id);
            item.classList.remove('selected');
          }
        };
        rList.appendChild(item);
      });
    }

    if (el('btnNewExpWizard')) {
      el('btnNewExpWizard').addEventListener('click', () => {
        renderBuildingGrid();
        renderRoomList();
        if (el('newExpName')) {
          const b = EW.Venues.getBuilding(selectedBuildingId);
          el('newExpName').value = `${b ? b.shortName : 'Ekspozīcija'} — ${new Date().toLocaleDateString('lv-LV')}`;
        }
        el('newExpModal').classList.add('open');
      });
    }

    if (el('btnCreateExpConfirm')) {
      el('btnCreateExpConfirm').addEventListener('click', async () => {
        const roomIds = Array.from(selectedRoomIds);
        if (!roomIds.length) {
          UI.toast('Lūdzu atzīmējiet vismaz vienu zāli');
          return;
        }
        const expName = el('newExpName') ? el('newExpName').value.trim() : '';
        try {
          await EW.Venues.createExhibition(selectedBuildingId, roomIds, expName);
          el('newExpModal').classList.remove('open');

          // Automātiski saglabājam jauno ekspozīciju Store datubāzē
          try {
            if (Store && Store.buildRecord) {
              const rec = Store.buildRecord(S.planName, null, false);
              await Store.saveRecord(rec);
              S.recordId = rec.id;
            }
          } catch (saveErr) {
            console.warn('Auto-save jaunajai ekspozīcijai neizdevās:', saveErr);
          }

          // Atjaunojam kuratora darba galdu un saglabātās ekspozīcijas
          if (UI && typeof UI.updateEmptyDashboard === 'function') UI.updateEmptyDashboard();
          if (UI && typeof UI.renderSavedExhibitions === 'function') UI.renderSavedExhibitions();

          // Automātisks lēciens uz 2. soli (Karkass)
          if (EW.Mentor && typeof EW.Mentor.setStep === 'function') {
            EW.Mentor.setStep(2);
          }

          // Atveram moduļu paneli un fiksējam to atvērtu
          if (UI && typeof UI.openToolDrawer === 'function') {
            UI.openToolDrawer('cardModules');
            document.body.classList.add('dock-pinned');
            const btnPin = el('btnPinDrawer');
            if (btnPin) btnPin.classList.add('on');
            const btnDockPin = el('btnDockTogglePin');
            if (btnDockPin) btnDockPin.classList.add('active');
          }

          if (EW.ModulesInteraction) EW.ModulesInteraction.updateModuleControls();
          EW.Renderer.draw();
          updateStabilityUI();
        } catch (err) {
          UI.toast('Neizdevās izveidot ekspozīciju: ' + err.message);
        }
      });
    }

    // Tukšā audekla kuratora darba galda pogas
    if (el('btnDashboardNewExp')) {
      el('btnDashboardNewExp').addEventListener('click', () => {
        if (el('btnNewExpWizard')) el('btnNewExpWizard').click();
      });
    }
    if (el('btnDashboardOpenTemplates')) {
      el('btnDashboardOpenTemplates').addEventListener('click', () => {
        if (el('btnOpenTemplatesAdmin')) el('btnOpenTemplatesAdmin').click();
      });
    }
    if (el('btnDashboardImport')) {
      el('btnDashboardImport').addEventListener('click', () => {
        if (el('btnImport')) el('btnImport').click();
      });
    }

    window.renderBuildingGrid = renderBuildingGrid;
    window.renderRoomList = renderRoomList;

    // Administratora / Kuratora režīma pārslēgšana
    if (el('btnRoleCurator')) {
      el('btnRoleCurator').addEventListener('click', () => {
        if (EW.Venues) EW.Venues.setAdmin(false);
      });
    }

    if (el('btnRoleAdmin')) {
      el('btnRoleAdmin').addEventListener('click', () => {
        if (EW.Venues) EW.Venues.setAdmin(true);
      });
    }

    if (el('btnAdminToggle')) {
      el('btnAdminToggle').addEventListener('click', () => {
        if (EW.Venues) EW.Venues.toggleAdmin();
      });
    }

    if (el('btnOpenTemplatesAdmin')) {
      el('btnOpenTemplatesAdmin').addEventListener('click', () => {
        if (EW.Venues) {
          if (!EW.Venues.isAdmin()) EW.Venues.setAdmin(true);
          EW.Venues.openTemplateAdminModal();
        }
      });
    }

    if (el('btnWizardManageTemplates')) {
      el('btnWizardManageTemplates').addEventListener('click', () => {
        if (EW.Venues) {
          if (!EW.Venues.isAdmin()) EW.Venues.setAdmin(true);
          EW.Venues.openTemplateAdminModal();
        }
      });
    }

    if (el('btnAdminOpenModalDirect')) {
      el('btnAdminOpenModalDirect').addEventListener('click', () => {
        if (EW.Venues) {
          if (!EW.Venues.isAdmin()) EW.Venues.setAdmin(true);
          EW.Venues.openTemplateAdminModal();
        }
      });
    }

    if (el('btnAdminTopOpenModal')) {
      el('btnAdminTopOpenModal').addEventListener('click', () => {
        if (EW.Venues) {
          if (!EW.Venues.isAdmin()) EW.Venues.setAdmin(true);
          EW.Venues.openTemplateAdminModal();
        }
      });
    }

    // ========================================================
    // 2. Eksponātu (Mākslas darbu) pārvaldība un imports
    // ========================================================
    if (el('btnImportArt')) {
      el('btnImportArt').addEventListener('click', () => {
        if (el('importArtText')) el('importArtText').value = '';
        if (el('importArtFeedback')) el('importArtFeedback').textContent = '';
        el('importArtModal').classList.add('open');
      });
    }

    if (el('importArtFileInput')) {
      el('importArtFileInput').addEventListener('change', async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const text = await f.text();
        if (el('importArtText')) el('importArtText').value = text;
        const parsed = EW.Artworks.parsePastedTable(text);
        if (el('importArtFeedback')) {
          el('importArtFeedback').textContent = `Atpazīti ${parsed.length} darbi`;
        }
      });
    }

    if (el('importArtText')) {
      el('importArtText').addEventListener('input', (e) => {
        const parsed = EW.Artworks.parsePastedTable(e.target.value);
        if (el('importArtFeedback')) {
          el('importArtFeedback').textContent = parsed.length > 0 ? `Atpazīti ${parsed.length} darbi` : '';
        }
      });
    }

    if (el('btnImportArtConfirm')) {
      el('btnImportArtConfirm').addEventListener('click', () => {
        const text = el('importArtText') ? el('importArtText').value : '';
        const items = EW.Artworks.parsePastedTable(text);
        if (!items.length) {
          UI.toast('Iekopētajā tekstā netika atpazīti derīgi mākslas darbu dati');
          return;
        }
        items.forEach(it => EW.Artworks.addArtwork(it));
        el('importArtModal').classList.remove('open');
        UI.toast(`Veiksmīgi importēti ${items.length} eksponāti`);
        updateStabilityUI();
      });
    }

    if (el('artSearchInput')) {
      el('artSearchInput').addEventListener('input', () => {
        if (EW.Artworks && EW.Artworks.renderUI) EW.Artworks.renderUI();
      });
    }

    async function loadCatalog100() {
      try {
        UI.toast('Ielādē 100 mākslas darbu parauga katalogu...');
        const res = await fetch('artworks_100.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.artworks || []);
        if (!items.length) throw new Error('Kataloga fails ir tukšs');
        items.forEach(it => EW.Artworks.addArtwork(it));
        EW.Artworks.renderUI();
        if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
        UI.toast(`Veiksmīgi ielādēti ${items.length} mākslas darbi ar fotofiksācijām!`);
        if (el('importArtModal')) el('importArtModal').classList.remove('open');
        updateStabilityUI();
      } catch (err) {
        UI.toast('Neizdevās ielādēt katalogu: ' + err.message);
      }
    }

    if (el('btnLoadCatalog100')) {
      el('btnLoadCatalog100').addEventListener('click', loadCatalog100);
    }
    if (el('btnImportCatalogSample')) {
      el('btnImportCatalogSample').addEventListener('click', loadCatalog100);
    }

    let currentArtImage = null;
    let editingArtworkId = null;

    function resetArtImageUpload() {
      currentArtImage = null;
      if (el('newArtImageFile')) el('newArtImageFile').value = '';
      if (el('artDropPreview')) el('artDropPreview').style.display = 'none';
      if (el('artDropPlaceholder')) el('artDropPlaceholder').style.display = 'flex';
    }

    window.openEditArtworkModal = function(artId) {
      const art = S.artworks.find(a => a.id === artId);
      if (!art) return;
      editingArtworkId = art.id;

      if (el('addArtModalTitle')) {
        el('addArtModalTitle').textContent = `🖼️ Rediģēt eksponātu: ${art.title}`;
      }
      if (el('btnAddArtConfirm')) {
        el('btnAddArtConfirm').textContent = '💾 Saglabāt izmaiņas';
      }

      if (el('newArtTitle')) el('newArtTitle').value = art.title || '';
      if (el('newArtAuthor')) el('newArtAuthor').value = art.author || '';
      if (el('newArtWidth')) el('newArtWidth').value = EW.Utils.fmt(art.width || 1.2);
      if (el('newArtHeight')) el('newArtHeight').value = EW.Utils.fmt(art.height || 1.6);
      if (el('newArtWeight')) el('newArtWeight').value = (art.weight || 35).toString();
      if (el('newArtElevation')) el('newArtElevation').value = EW.Utils.fmt(art.elevation !== undefined ? art.elevation : 1.2);

      resetArtImageUpload();
      if (art.imageUrl) {
        currentArtImage = {
          dataUrl: art.imageUrl,
          widthPx: 0,
          heightPx: 0,
          aspectRatio: art.aspectRatio || ((art.width || 1) / (art.height || 1))
        };
        if (el('artPreviewImg')) el('artPreviewImg').src = art.imageUrl;
        if (el('artImgInfo')) el('artImgInfo').textContent = 'Piesaistītā fotofiksācija';
        if (el('artImgDim')) el('artImgDim').textContent = `${art.width} × ${art.height} m`;
        if (el('artDropPlaceholder')) el('artDropPlaceholder').style.display = 'none';
        if (el('artDropPreview')) el('artDropPreview').style.display = 'flex';
      }

      el('addArtModal').classList.add('open');
    };

    async function handleArtworkFile(file) {
      if (!file || !file.type.startsWith('image/')) {
        UI.toast('Lūdzu izvēlieties derīgu attēlu (PNG, JPG vai WebP)');
        return;
      }
      try {
        const res = await EW.Artworks.processArtworkImageFile(file, 1200, 0.85);
        currentArtImage = res;
        if (el('artPreviewImg')) el('artPreviewImg').src = res.dataUrl;
        if (el('artImgInfo')) el('artImgInfo').textContent = file.name;
        if (el('artImgDim')) el('artImgDim').textContent = `${res.widthPx} × ${res.heightPx} px (proporcija ${res.aspectRatio})`;
        if (el('artDropPlaceholder')) el('artDropPlaceholder').style.display = 'none';
        if (el('artDropPreview')) el('artDropPreview').style.display = 'flex';

        // Ja nosaukums vēl nav ievadīts, piedāvājam faila vārdu bez paplašinājuma
        if (el('newArtTitle') && !el('newArtTitle').value.trim()) {
          el('newArtTitle').value = file.name.replace(/\.[^/.]+$/, '');
        }

        // Ja lauki ir ar noklusējumiem, pielāgojam augstumu atbilstoši attēla reālajai proporcijai
        if (el('newArtWidth') && el('newArtHeight')) {
          const curW = U.num(el('newArtWidth').value) || 1.2;
          const calcH = Math.round((curW / res.aspectRatio) * 100) / 100;
          el('newArtHeight').value = EW.Utils.fmt(calcH);
        }
      } catch (err) {
        UI.toast('Kļūda apstrādājot attēlu: ' + err.message);
      }
    }

    if (el('artImageDropZone')) {
      const zone = el('artImageDropZone');
      const fileInput = el('newArtImageFile');

      zone.addEventListener('click', (e) => {
        if (e.target.id !== 'btnClearArtImage' && fileInput) {
          fileInput.click();
        }
      });

      if (fileInput) {
        fileInput.addEventListener('change', () => {
          if (fileInput.files && fileInput.files[0]) {
            handleArtworkFile(fileInput.files[0]);
          }
        });
      }

      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
      });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleArtworkFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (el('btnClearArtImage')) {
      el('btnClearArtImage').addEventListener('click', (e) => {
        e.stopPropagation();
        resetArtImageUpload();
      });
    }

    if (el('btnAddArt')) {
      el('btnAddArt').addEventListener('click', () => {
        editingArtworkId = null;
        if (el('addArtModalTitle')) {
          el('addArtModalTitle').textContent = '🖼️ Pievienot mākslas darbu';
        }
        if (el('btnAddArtConfirm')) {
          el('btnAddArtConfirm').textContent = 'Pievienot';
        }
        if (el('newArtTitle')) el('newArtTitle').value = '';
        if (el('newArtAuthor')) el('newArtAuthor').value = '';
        if (el('newArtWidth')) el('newArtWidth').value = '1,20';
        if (el('newArtHeight')) el('newArtHeight').value = '1,60';
        if (el('newArtWeight')) el('newArtWeight').value = '35';
        if (el('newArtElevation')) el('newArtElevation').value = '1,20';
        resetArtImageUpload();
        el('addArtModal').classList.add('open');
      });
    }

    if (el('btnAddArtConfirm')) {
      el('btnAddArtConfirm').addEventListener('click', () => {
        const title = el('newArtTitle') ? el('newArtTitle').value.trim() : '';
        if (!title) {
          UI.toast('Lūdzu ievadiet mākslas darba nosaukumu');
          return;
        }
        const author = el('newArtAuthor') ? el('newArtAuthor').value.trim() : '';
        const width = U.num(el('newArtWidth').value) || 1.2;
        const height = U.num(el('newArtHeight').value) || 1.6;
        const weight = U.num(el('newArtWeight').value) || 35;
        const elevation = U.num(el('newArtElevation').value) || 1.2;

        if (editingArtworkId) {
          const art = S.artworks.find(a => a.id === editingArtworkId);
          if (art) {
            art.title = title;
            art.author = author;
            art.width = width;
            art.height = height;
            art.weight = weight;
            art.elevation = elevation;
            if (currentArtImage) {
              art.imageUrl = currentArtImage.dataUrl;
              art.aspectRatio = currentArtImage.aspectRatio;
            }
            EW.Artworks.renderUI();
            if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
            UI.toast(`Eksponāts “${art.title}” veiksmīgi atjaunots`);
          }
          editingArtworkId = null;
        } else {
          const art = EW.Artworks.addArtwork({
            title,
            author,
            width,
            height,
            weight,
            elevation,
            imageUrl: currentArtImage ? currentArtImage.dataUrl : null,
            aspectRatio: currentArtImage ? currentArtImage.aspectRatio : null
          });
          UI.toast(`Pievienots eksponāts “${art.title}”`);
        }

        resetArtImageUpload();
        el('addArtModal').classList.remove('open');
        updateStabilityUI();
      });
    }

    // ========================================================
    // 3. Stabilitātes dzinēja un pārskata integrācija
    // ========================================================
    function updateStabilityUI() {
      if (!EW.Stability) return;
      const stab = EW.Stability.calculateExhibitionStability();

      const badge = el('stabBadge');
      const label = el('totalBallastLabel');

      if (label) {
        label.textContent = `${stab.totalBallast} kg`;
      }

      if (badge) {
        badge.className = `stab-badge ${stab.overallStatus.replace('_', '-')}`;
        if (stab.overallStatus === 'stable') {
          badge.textContent = '🟢 Stabils';
        } else if (stab.overallStatus === 'needs_ballast') {
          badge.textContent = `🟡 Balasts: +${stab.totalBallast} kg`;
        } else {
          badge.textContent = '🔴 Nestabils';
        }
      }

      if (EW.Inventory && EW.Inventory.renderUI) {
        EW.Inventory.renderUI();
      }
    }

    if (el('btnOpenStabilityModal')) {
      el('btnOpenStabilityModal').addEventListener('click', () => {
        openStabilityModal();
      });
    }

    function openStabilityModal() {
      if (!EW.Stability) return;
      const stab = EW.Stability.calculateExhibitionStability();

      const tBody = el('stabTableBody');
      const badge = el('stabModalBadge');
      const foot = el('stabTotalBallastFoot');

      if (badge) {
        badge.className = `stab-badge ${stab.overallStatus.replace('_', '-')}`;
        badge.textContent = stab.overallStatus === 'stable' ? '🟢 Konstrukcija stabila'
          : (stab.overallStatus === 'needs_ballast' ? `🟡 Nepieciešams balasts (${stab.totalBallast} kg)` : '🔴 Kritiski nestabils');
      }

      if (foot) {
        foot.textContent = `Kopējais nepieciešamais balasts: ${stab.totalBallast} kg (${stab.modules.length} moduļi, ${S.artworks.length} eksponāti)`;
      }

      if (tBody) {
        if (!stab.modules.length) {
          tBody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:16px;color:var(--ink-dim)">Ekspozīcijā vēl nav ievietots neviens modulis.</td></tr>`;
        } else {
          tBody.innerHTML = stab.modules.map(m => {
            const statusBadge = m.status === 'stable'
              ? '<span style="color:#2e7d32;font-weight:700">✓ Stabils</span>'
              : (m.status === 'needs_ballast'
                  ? `<span style="color:#b45309;font-weight:700">⚖️ +${m.ballastNeeded} kg</span>`
                  : `<span style="color:#dc2626;font-weight:700">⚠️ Bīstams</span>`);

            const artInfo = m.artworksCount > 0
              ? `<b>${m.artworksCount}</b> <span style="font-size:10px;color:var(--ink-dim)">(${m.totalArtMass} kg)</span>`
              : '—';

            return `
              <tr>
                <td><b>${m.moduleId}</b></td>
                <td><span style="font-family:ui-monospace,monospace;font-weight:600;font-size:11px">${m.frameCode || (m.moduleType === 'large' ? 'M-LN' : 'M-UN-L')}</span></td>
                <td>${m.frameWeight} kg</td>
                <td>${m.panelWeight} kg</td>
                <td><b>${m.selfWeight} kg</b></td>
                <td>${artInfo}</td>
                <td>${m.total_Ma} N·m</td>
                <td><b>${m.SF_actual.toFixed(2)}</b> <span style="font-size:10px;color:var(--ink-dim)">(≥${m.SF_req})</span></td>
                <td><b>${m.ballastNeeded > 0 ? m.ballastNeeded + ' kg' : '—'}</b></td>
                <td>${m.N_max_leg_kg} kg/pēdu</td>
                <td>${statusBadge}</td>
              </tr>
            `;
          }).join('');
        }
      }

      el('stabilityModal').classList.add('open');
    }

    // ========================================================
    // 4. Scenāriju (Variantu A/B), Fasādes un 3D integrācija
    // ========================================================
    window.EW_AppUpdateStability = updateStabilityUI;

    if (el('btnNewVariant')) {
      el('btnNewVariant').addEventListener('click', () => {
        if (EW.Variants) EW.Variants.createVariant();
      });
    }

    if (el('btnDuplicateVariant')) {
      el('btnDuplicateVariant').addEventListener('click', () => {
        if (EW.Variants) EW.Variants.duplicateActiveVariant();
      });
    }

    if (el('btnOpenElevation')) {
      el('btnOpenElevation').addEventListener('click', () => {
        if (EW.Elevation) EW.Elevation.openElevation();
      });
    }

    if (el('btnToggleClearance')) {
      el('btnToggleClearance').addEventListener('click', () => {
        if (EW.Clearance && EW.Clearance.toggleClearance) {
          EW.Clearance.toggleClearance();
        }
      });
    }

    const btnClean = el('btnToggleCleanView');
    if (btnClean) {
      function updateCleanViewBtn() {
        const isClean = (S.showTechnicalAnnotations === false);
        btnClean.classList.toggle('is-clean', isClean);
        btnClean.textContent = isClean ? '👁️ Tīrs sienu skats' : '🏷️ Karkasa kodi: IESL';
        btnClean.title = isClean 
          ? 'Ieslēgts tīrs sienu skats (kodi paslēpti). Uzklikšķini, lai rādītu karkasa kodus.' 
          : 'Ieslēgti karkasa tehniskie kodi. Uzklikšķini, lai paslēptu kodus un rādītu tīru sienu skatu.';
      }
      btnClean.addEventListener('click', () => {
        S.showTechnicalAnnotations = (S.showTechnicalAnnotations === false) ? true : false;
        updateCleanViewBtn();
        if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
        UI.toast(S.showTechnicalAnnotations ? '🏷️ Karkasa kodi ieslēgti' : '👁️ Tīrs sienu skats ieslēgts (kodi paslēpti)');
      });
      window.updateCleanViewBtn = updateCleanViewBtn;
      updateCleanViewBtn();
    }

    const cardArtworks = el('cardArtworks');
    if (cardArtworks) {
      cardArtworks.addEventListener('toggle', () => {
        if (cardArtworks.open && S.showTechnicalAnnotations !== false) {
          // Automātiski pārslēdzamies uz tīru sienu skatu eksponātu izvietošanai
          S.showTechnicalAnnotations = false;
          if (window.updateCleanViewBtn) window.updateCleanViewBtn();
          if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
        }
      });
    }

    if (el('btnPrintMountingCoords')) {
      el('btnPrintMountingCoords').addEventListener('click', () => {
        if (EW.Modules.PdfExport && EW.Modules.PdfExport.printMountingSchedule) {
          EW.Modules.PdfExport.printMountingSchedule();
        }
      });
    }

    if (el('btnPrintCaptions')) {
      el('btnPrintCaptions').addEventListener('click', () => {
        if (EW.Modules.PdfExport && EW.Modules.PdfExport.printArtworkCaptions) {
          EW.Modules.PdfExport.printArtworkCaptions();
        }
      });
    }

    document.querySelectorAll('.btn-3d-cam').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-3d-cam').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const camType = btn.dataset.cam;
        if (EW.ThreeView && EW.ThreeView.setViewpoint) {
          EW.ThreeView.setViewpoint(camType);
        }
      });
    });

    const btnView2D = el('btnView2D');
    const btnView3D = el('btnView3D');
    const cvCanvas = el('cv');

    if (btnView2D && btnView3D) {
      btnView2D.addEventListener('click', () => {
        btnView2D.classList.add('active');
        btnView3D.classList.remove('active');
        if (EW.ThreeView) EW.ThreeView.hide();
        if (cvCanvas) cvCanvas.style.display = 'block';
        if (EW.Renderer) {
          EW.Renderer.resize();
          EW.Renderer.draw();
        }
      });

      btnView3D.addEventListener('click', () => {
        btnView3D.classList.add('active');
        btnView2D.classList.remove('active');
        if (cvCanvas) cvCanvas.style.display = 'none';
        if (EW.ThreeView) EW.ThreeView.show();
      });
    }

    // Globāls klikšķis aizver konteksta izvēlni
    window.addEventListener('click', (e) => {
      const ctxMenu = el('artContextMenu');
      if (ctxMenu && !ctxMenu.contains(e.target)) {
        ctxMenu.style.display = 'none';
      }
    });

    // Sānjoslas akordeonu pārvaldība un atcerēšanās
    const accordions = document.querySelectorAll('.side-card.accordion');
    const btnToggleAll = el('btnToggleAllSections');

    if (accordions.length > 0) {
      try {
        const saved = JSON.parse(localStorage.getItem('ew:sidebar_accordions') || '{}');
        accordions.forEach(card => {
          if (card.id && saved[card.id] !== undefined) {
            card.open = saved[card.id];
          }
          card.addEventListener('toggle', () => {
            if (!card.id) return;
            try {
              const current = JSON.parse(localStorage.getItem('ew:sidebar_accordions') || '{}');
              current[card.id] = card.open;
              localStorage.setItem('ew:sidebar_accordions', JSON.stringify(current));
            } catch (err) {}
            updateToggleAllBtn();
          });
        });
      } catch (e) {}

      function updateToggleAllBtn() {
        if (!btnToggleAll) return;
        const openCount = Array.from(accordions).filter(c => c.open).length;
        if (openCount > 2) {
          btnToggleAll.textContent = '↔ Sakļaut visas';
        } else {
          btnToggleAll.textContent = '↕ Izvērst visas';
        }
      }

      if (btnToggleAll) {
        btnToggleAll.addEventListener('click', () => {
          const openCount = Array.from(accordions).filter(c => c.open).length;
          const shouldOpen = openCount <= 2;
          accordions.forEach(card => {
            card.open = shouldOpen;
          });
          updateToggleAllBtn();
        });
        updateToggleAllBtn();
      }
    }

    // Piesaistām stabilitātes atjaunināšanu pie moduļu kontroles
    const origUpdateMod = EW.ModulesInteraction.updateModuleControls;
    EW.ModulesInteraction.updateModuleControls = function() {
      if (origUpdateMod) origUpdateMod();
      updateStabilityUI();
      if (EW.ThreeView && EW.ThreeView.isVisible && EW.ThreeView.syncFromState) {
        EW.ThreeView.syncFromState();
      }
    };

    // Milanote stila vertikālā rīku doka (Tool Dock) un peldošās atvilktnes sasaiste
    function initToolDock() {
      const dockBtns = document.querySelectorAll('#appToolDock .dock-btn[data-target-card]');
      const btnClose = el('btnCloseDrawer');
      const btnPin = el('btnPinDrawer');
      const btnDockPin = el('btnDockTogglePin');
      const drawerTitle = el('drawerTitle');

      // Atjaunojam lietotāja piespraušanas izvēli
      const isPinned = localStorage.getItem('ew_dock_pinned') === '1';
      if (isPinned) {
        document.body.classList.add('dock-pinned');
        document.body.classList.add('drawer-open');
        if (btnPin) btnPin.classList.add('on');
        if (btnDockPin) btnDockPin.classList.add('active');
      }

      function updateHeaderTitle() {
        const titleEl = el('headerExhibitionTitle');
        if (titleEl) {
          const name = S.planName || (S.G() ? S.G().name : 'Ekspozīcija');
          titleEl.textContent = name;
        }
      }

      function openCard(cardId) {
        document.body.classList.add('drawer-open');
        const allCards = document.querySelectorAll('#sidebar .side-card');
        allCards.forEach(c => {
          c.classList.remove('active-tool');
          if (c.id === cardId) {
            c.classList.add('active-tool');
            if (c.tagName.toLowerCase() === 'details') {
              c.open = true;
            }
          }
        });

        // Ja ir administrators, aktivizējam admin paneli
        if (cardId === 'adminSidebarPanel') {
          const adminPanel = el('adminSidebarPanel');
          if (adminPanel) adminPanel.classList.add('active-tool');
          if (drawerTitle) drawerTitle.textContent = '🏛️ Telpu veidņu pārvaldnieks';
        } else {
          const card = el(cardId);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            if (drawerTitle) {
              const titleSpan = card.querySelector('.side-card-title span') || card.querySelector('summary span') || card.querySelector('div span:last-child');
              if (titleSpan) {
                drawerTitle.textContent = titleSpan.textContent.trim();
              }
            }
          }
        }

        // Sinhronizējam aktīvo doka pogu
        dockBtns.forEach(b => {
          b.classList.toggle('active', b.dataset.targetCard === cardId);
        });

        setTimeout(() => {
          if (EW.Renderer && EW.Renderer.resize) EW.Renderer.resize();
        }, 260);
      }

      function closeDrawer() {
        if (document.body.classList.contains('dock-pinned')) return;
        document.body.classList.remove('drawer-open');
        dockBtns.forEach(b => b.classList.remove('active'));
        setTimeout(() => {
          if (EW.Renderer && EW.Renderer.resize) EW.Renderer.resize();
        }, 260);
      }

      // Eksportējam uz EW.UI
      if (EW.UI) {
        EW.UI.openToolDrawer = openCard;
        EW.UI.closeToolDrawer = closeDrawer;
      }

      dockBtns.forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const targetId = btn.dataset.targetCard;
          const wasActive = btn.classList.contains('active') && document.body.classList.contains('drawer-open');

          if (wasActive && !document.body.classList.contains('dock-pinned')) {
            closeDrawer();
          } else {
            openCard(targetId);
          }
        });
      });

      if (btnClose) {
        btnClose.addEventListener('click', e => {
          e.stopPropagation();
          document.body.classList.remove('dock-pinned');
          localStorage.setItem('ew_dock_pinned', '0');
          if (btnPin) btnPin.classList.remove('on');
          if (btnDockPin) btnDockPin.classList.remove('active');
          closeDrawer();
        });
      }

      function togglePin() {
        const pinned = document.body.classList.toggle('dock-pinned');
        localStorage.setItem('ew_dock_pinned', pinned ? '1' : '0');
        if (btnPin) btnPin.classList.toggle('on', pinned);
        if (btnDockPin) btnDockPin.classList.toggle('active', pinned);
        if (pinned) {
          document.body.classList.add('drawer-open');
        }
        setTimeout(() => {
          if (EW.Renderer && EW.Renderer.resize) EW.Renderer.resize();
        }, 260);
      }

      if (btnPin) btnPin.addEventListener('click', togglePin);
      if (btnDockPin) btnDockPin.addEventListener('click', togglePin);

      // Bento vadības pults poga dokā
      const btnDockBento = el('btnDockBento');
      if (btnDockBento) {
        btnDockBento.addEventListener('click', e => {
          e.stopPropagation();
          if (EW.Bento && typeof EW.Bento.open === 'function') {
            EW.Bento.open();
          } else if (el('btnBentoCockpit')) {
            el('btnBentoCockpit').click();
          }
        });
      }

      // Tēmas pārslēga poga dokā
      const btnDockTheme = el('btnDockThemeToggle');
      if (btnDockTheme) {
        btnDockTheme.addEventListener('click', e => {
          e.stopPropagation();
          if (el('btnThemeToggle')) el('btnThemeToggle').click();
        });
      }

      // Esc taustiņš aizver nepiesprausto atvilktni
      window.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !document.body.classList.contains('dock-pinned') && document.body.classList.contains('drawer-open')) {
          closeDrawer();
        }
      });

      // Kanvas klikšķis aizver nepiesprausto atvilktni (izņemot karkasa moduļu un paneļu laikā)
      const cv = el('cv');
      if (cv) {
        cv.addEventListener('pointerdown', () => {
          const activeCard = document.querySelector('#sidebar .side-card.active-tool');
          const isModulesActive = activeCard && (activeCard.id === 'cardModules' || activeCard.id === 'cardPanels');
          if (!document.body.classList.contains('dock-pinned') && document.body.classList.contains('drawer-open') && !isModulesActive) {
            closeDrawer();
          }
        });
      }

      // Periodiski atjaunojam eksponātu skaitu nozīmītē
      setInterval(() => {
        const badge = el('dockArtBadge');
        if (badge && S.artworks) {
          badge.textContent = S.artworks.length || '0';
        }
        updateHeaderTitle();
      }, 1000);
    }

    initToolDock();

    // Sākotnējais renderējums
    if (EW.Venues) EW.Venues.init();
    if (EW.Variants) EW.Variants.renderUI();
    if (EW.Artworks) EW.Artworks.renderUI();
    if (EW.Inventory) EW.Inventory.renderUI();
    if (EW.Mentor) EW.Mentor.init();
    UI.renderChips();
    UI.syncInputs();
    EW.ModulesInteraction.updateModuleControls();
    updateStabilityUI();
    EW.Renderer.resize();
    Store.loadIndex();
    if (UI.updateEmptyDashboard) UI.updateEmptyDashboard();
    if (UI.renderSavedExhibitions) UI.renderSavedExhibitions();
  }

  // Palaižam, kad DOM ir gatavs
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
