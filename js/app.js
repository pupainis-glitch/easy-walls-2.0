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
        S.denom = null;
        S.detected = null;
        UI.updateScaleInfo();
        UI.setMode('pan');
        EW.Renderer.draw();
        UI.toast(`Mērogs kalibrēts pēc ${U.dec(real, 3)} m`);
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
          const rec = Store.buildRecord(name, id);
          el('saveSize').textContent = `Ieraksta apjoms ${U.kb(JSON.stringify(rec).length)}`;
          await Store.saveRecord(rec);
          S.recordId = rec.id;
          S.planName = name;
          el('saveModal').classList.remove('open');
          UI.setSlim(true);
          UI.renderSlim();
          EW.Interaction.updateHud();
          UI.toast(`Saglabāts: ${name}`);
        } catch (err) {
          UI.toast('Saglabāt neizdevās — ieraksts par lielu vai atmiņa pilna');
          console.error(err);
        }
        el('saveOk').disabled = false;
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

    // Sienu moduļu vadības pogas
    if (el('btnAddLarge')) {
      el('btnAddLarge').addEventListener('click', () => {
        EW.ModulesInteraction.addModule('large');
      });
    }
    if (el('btnAddSmall')) {
      el('btnAddSmall').addEventListener('click', () => {
        EW.ModulesInteraction.addModule('small');
      });
    }
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

    // Sākotnējais renderējums
    UI.renderChips();
    UI.syncInputs();
    EW.ModulesInteraction.updateModuleControls();
    EW.Renderer.resize();
    Store.loadIndex();
  }

  // Palaižam, kad DOM ir gatavs
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
