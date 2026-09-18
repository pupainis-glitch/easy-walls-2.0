/**
 * Easy walls 2.0 — Lietotāja saskarne (UI) un formu pārvaldība
 */
window.EW = window.EW || {};

(function() {
  const S = EW.State;
  const C = EW.Config;
  const U = EW.Utils;
  const Grid = EW.Grid;
  const Store = EW.Store;
  const PdfScale = EW.PdfScale;

  const el = id => document.getElementById(id);
  let toastTimer;

  function toast(msg) {
    const t = el('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.style.display = 'none', 2600);
  }

  function banner(msg) {
    const b = el('banner');
    if (!b) return;
    if (!msg) {
      b.style.display = 'none';
      return;
    }
    b.textContent = msg;
    b.style.display = 'block';
  }

  let contextFocusBarInited = false;
  function ensureContextFocusBar() {
    if (contextFocusBarInited) return;
    const btnDone = el('btnContextFocusDone');
    const btnCancel = el('btnContextFocusCancel');
    if (!btnDone && !btnCancel) return;
    contextFocusBarInited = true;

    if (btnDone) {
      btnDone.addEventListener('click', () => {
        if (S.mode === 'origin') {
          if (S.G()) S.G().locked = true;
          toast('Režģa sākumpunkts nostiprināts ✓');
        } else if (S.mode === 'region') {
          toast('Telpas kontūra saglabāta ✓');
        } else if (S.mode === 'calib') {
          if (S.calibPts && S.calibPts.length === 2) {
            // calib modal handles it
          }
        }
        setMode('pan');
        if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
      });
    }

    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        if (S.mode === 'calib') {
          S.calibPts = [];
        }
        setMode('pan');
        toast('Darbība atcelta');
        if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
      });
    }
  }

  function setMode(m) {
    S.mode = m;
    ensureContextFocusBar();
    const stage = el('stage');
    if (stage) stage.classList.toggle('placing', m === 'origin');
    if (el('btnRelocate')) el('btnRelocate').classList.toggle('on', m === 'origin');
    if (el('btnLock')) el('btnLock').classList.toggle('on', m === 'origin');
    if (el('btnCalib')) el('btnCalib').classList.toggle('on', m === 'calib');
    if (el('btnMeasure')) el('btnMeasure').classList.toggle('on', m === 'measure');

    if (m !== 'calib' && m !== 'measure') {
      const calibModal = el('calibModal');
      if (calibModal) calibModal.classList.remove('open');
      S.calibPts = [];
    }

    if (el('btnRegion')) {
      el('btnRegion').classList.toggle('key', m === 'region');
      el('btnRegion').textContent = m === 'region' ? '✓ Velc ar peli' : '📐 Iezīmēt reģionu';
    }
    if (el('btnAdminDrawRegion')) {
      el('btnAdminDrawRegion').classList.toggle('on', m === 'region');
      el('btnAdminDrawRegion').textContent = m === 'region' ? '✓ Velciet ar peli…' : '📐 Iezīmēt kontūru';
    }
    if (el('btnAdminRelocateGrid')) {
      el('btnAdminRelocateGrid').classList.toggle('on', m === 'origin');
    }

    const focusBar = el('contextFocusBar');
    const focusMsg = el('contextFocusMsg');
    const isInteractive = ['origin', 'region', 'calib', 'measure'].includes(m);

    if (isInteractive) {
      if (EW.UI && typeof EW.UI.closeToolDrawer === 'function') {
        EW.UI.closeToolDrawer();
      } else {
        document.body.classList.remove('drawer-open');
      }
    }

    if (focusBar) {
      if (isInteractive) {
        focusBar.classList.add('active');
        let msg = '';
        const zaleName = S.G() ? S.G().name : 'Zāle';
        if (m === 'origin') {
          msg = `📍 ${zaleName}: Noklikšķiniet uz plāna jauno sākumpunktu`;
        } else if (m === 'region') {
          msg = `📐 ${zaleName}: Velciet taisnstūri ar peli, lai iezīmētu zāles kontūru`;
        } else if (m === 'calib') {
          msg = `📏 Noklikšķiniet divus punktus uz plāna zināmam attālumam`;
        } else if (m === 'measure') {
          msg = `📐 Noklikšķiniet divus punktus, lai izmērītu attālumu`;
        }
        if (focusMsg) focusMsg.textContent = msg;
        if (window.Motion) {
          try {
            window.Motion.animate(focusBar, { y: [-8, 0], opacity: [0, 1] }, { duration: 0.25 });
          } catch (e) {}
        }
      } else {
        focusBar.classList.remove('active');
      }
    }

    if (m === 'origin') {
      S.G().locked = false;
      banner(`${S.G().name}: uzklikšķini uz plāna jauno sākumpunktu, tad spied “✓ Pabeigt novietošanu”.`);
    } else if (m === 'region') {
      banner(`${S.G().name}: velc ar peli taisnstūra rāmi uz plāna, lai iezīmētu šīs zāles reģionu.`);
    } else {
      banner(null);
    }
    updateLockUI();
    renderChips();
  }

  function updateLockUI() {
    const g = S.G();
    if (!g) return;
    const placing = S.mode === 'origin';
    const btnRelocate = el('btnRelocate') || el('btnLock');
    const btnLockToggle = el('btnLockToggle');

    if (btnRelocate) {
      btnRelocate.textContent = placing ? '✓ Pabeigt' : '📍 Sākumpunkts';
      btnRelocate.classList.toggle('key', placing);
      btnRelocate.classList.toggle('on', placing);
    }

    if (btnLockToggle) {
      btnLockToggle.textContent = g.locked ? '🔒' : '🔓';
      btnLockToggle.classList.toggle('on', !g.locked);
      btnLockToggle.title = g.locked ? 'Režģis nobloķēts. Klikšķini, lai atbloķētu.' : 'Režģis atbloķēts. Klikšķini, lai nobloķētu.';
    }

    const btnClear = el('btnClearRegion');
    if (btnClear) {
      btnClear.style.display = g.region ? 'inline-flex' : 'none';
    }

    if (el('dx')) el('dx').disabled = g.locked;
    if (el('dy')) el('dy').disabled = g.locked;
    document.querySelectorAll('[data-nudge="dx"],[data-nudge="dy"]').forEach(b => {
      b.disabled = g.locked;
    });
  }

  function renderChips() {
    const box = el('chips');
    if (!box) return;
    box.innerHTML = '';
    S.grids.forEach((g, i) => {
      const c = document.createElement('div');
      c.className = 'chip' + (i === S.active ? ' active' : '') + (g.visible ? '' : ' off');
      c.innerHTML = `<span class="chip-eye ${g.visible ? '' : 'hidden-eye'}" data-vis="${i}" title="${g.visible ? 'Paslēpt zāli un tās moduļus' : 'Rādīt zāli un tās moduļus'}">${g.visible ? '👁️' : '🕶️'}</span>`
        + `<span class="nm" style="font-weight:600">${U.esc(g.name || ('Zāle ' + (i + 1)))}</span>`
        + (S.grids.length > 1 ? `<button class="ghost" data-del="${i}" style="padding:0 3px;color:var(--danger);font-size:14px;border:none;background:none" title="Dzēst zāli">×</button>` : '');
      c.addEventListener('click', ev => {
        if (ev.target.dataset.vis !== undefined) {
          g.visible = !g.visible;
          renderChips();
          EW.Renderer.draw();
          toast(g.visible ? `Zāle “${g.name}” ieslēgta` : `Zāle “${g.name}” paslēpta`);
          return;
        }
        if (ev.target.dataset.del !== undefined) {
          if (!confirm(`Dzēst zāli “${g.name}” un visus tās moduļus?`)) return;
          S.modules = (S.modules || []).filter(m => m.gridId !== g.id);
          S.grids.splice(i, 1);
          S.active = Math.min(S.active, S.grids.length - 1);
          setMode('pan');
          syncInputs();
          renderChips();
          EW.Renderer.draw();
          return;
        }
        S.active = i;
        setMode('pan');
        syncInputs();
        renderChips();
        EW.Renderer.draw();
      });
      box.appendChild(c);
    });

    const add = document.createElement('button');
    add.textContent = '+ zāle';
    add.className = 'chip add-chip';
    add.title = 'Pievienot jaunu ekspozīcijas zāli / režģi';
    add.addEventListener('click', addGrid);
    box.appendChild(add);
    renderSlim();
  }

  function renderSlim() {
    const slimPlan = el('slimPlan');
    const slimGrids = el('slimGrids');
    if (slimPlan) {
      slimPlan.innerHTML = (S.planName ? `<b>${U.esc(S.planName)}</b>` : '—')
        + (S.mppPt ? ` · ${S.denom ? '1:' + S.denom : 'kalibrēts'}` : '');
    }
    if (slimGrids) {
      slimGrids.innerHTML = S.grids.map(g =>
        `<span style="display:flex;gap:5px;align-items:center;opacity:${g.visible ? 1 : 0.4}">
           <span class="dot" style="background:${g.color}"></span>${U.esc(g.name)}</span>`
      ).join('');
    }
  }

  function addGrid() {
    const prevG = S.G();
    const g = S.newGrid();
    if (prevG) {
      g.dx = prevG.dx;
      g.dy = prevG.dy;
      g.step = prevG.step;
      g.angle = prevG.angle;
    }
    g.locked = false;
    S.grids.push(g);
    S.active = S.grids.length - 1;
    setMode('pan');
    syncInputs();
    renderChips();
    toast(`Pievienots ${g.name}`);
    EW.Renderer.draw();
  }

  function syncInputs() {
    const g = S.G();
    if (!g) return;
    if (el('gname')) el('gname').value = g.name;
    if (el('angle') && document.activeElement !== el('angle')) el('angle').value = U.dec(g.angle, 2);
    if (el('dx') && document.activeElement !== el('dx')) el('dx').value = U.dec(g.dx, 3);
    if (el('dy') && document.activeElement !== el('dy')) el('dy').value = U.dec(g.dy, 3);
    if (el('step') && document.activeElement !== el('step')) el('step').value = U.dec(g.step, 2);
    updateLockUI();
    EW.Interaction.updateHud();
    if (EW.Venues && typeof EW.Venues.syncAdminInputsFromGrid === 'function') {
      EW.Venues.syncAdminInputsFromGrid();
    }
    renderSlim();
  }

  function bindNum(id, key, min) {
    const inp = el(id);
    if (!inp) return;
    inp.addEventListener('input', () => {
      const v = U.num(inp.value);
      if (v === null) return;
      const g = S.G();
      const oldG = { ...g };
      g[key] = (min !== undefined) ? Math.max(min, v) : v;

      if ((key === 'dx' || key === 'dy') && S.mode === 'origin' && S.modules && S.modules.length) {
        S.modules.forEach(m => {
          if (m.gridId === g.id) {
            const wp = Grid.g2w(oldG, m.x, m.y);
            const newGp = Grid.w2g(g, wp.x, wp.y);
            m.x = Math.round(newGp.x * 1000) / 1000;
            m.y = Math.round(newGp.y * 1000) / 1000;
          }
        });
      }

      renderSlim();
      EW.Renderer.draw();
    });

    // Peles rullīša apstrāde skaitliskajai vērtībai (10 cm solis X/Y, 1° leņķim)
    inp.addEventListener('wheel', e => {
      if (inp.disabled) return;
      e.preventDefault();

      let stepSize = 0.10; // Noklusētais solis 10 cm (0.1 m)
      if (key === 'angle') {
        stepSize = e.shiftKey ? 0.1 : 1.0;
      } else if (key === 'step') {
        stepSize = 0.05;
      } else if (key === 'dx' || key === 'dy') {
        stepSize = e.shiftKey ? 0.01 : 0.10; // Ar Shift 1 cm, parasti 10 cm
      }

      const dir = e.deltaY < 0 ? 1 : -1;
      const g = S.G();
      const oldG = { ...g };
      const current = g[key] || 0;
      let next = Math.round((current + dir * stepSize) * 10000) / 10000;
      if (min !== undefined) next = Math.max(min, next);

      g[key] = next;

      // Ja sākumpunkts tiek pārvietots režīmā 'origin', moduļi paliek uz vietas uz plāna!
      if ((key === 'dx' || key === 'dy') && S.mode === 'origin' && S.modules && S.modules.length) {
        S.modules.forEach(m => {
          if (m.gridId === g.id) {
            const wp = Grid.g2w(oldG, m.x, m.y);
            const newGp = Grid.w2g(g, wp.x, wp.y);
            m.x = Math.round(newGp.x * 1000) / 1000;
            m.y = Math.round(newGp.y * 1000) / 1000;
          }
        });
      }

      inp.value = (key === 'angle') ? U.dec(g[key], 2) : (key === 'step' ? U.dec(g[key], 2) : U.dec(g[key], 3));
      renderSlim();
      EW.Renderer.draw();
    }, { passive: false });

    inp.addEventListener('blur', () => syncInputs());
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
  }

  function updateScaleInfo() {
    const info = el('scaleInfo');
    if (!info) return;
    if (!S.mppPt) {
      info.textContent = 'Mērogs nav noteikts.';
      info.className = 'note';
      renderSlim();
      return;
    }
    const m = S.mpp();
    const w = S.img ? S.img.width * m : 0;
    const h = S.img ? S.img.height * m : 0;
    const a = S.detected;
    if (a) {
      info.textContent = `1:${a.snapped || a.denom.toFixed(1)} pēc ${a.n} izmēru ķēdes`
        + (a.confirmed ? ', kopsumma sakrīt' : ', kopsumma nesakrīt — pārbaudi ar Mērīt')
        + `. Lapa ${U.fmt(w)} × ${U.fmt(h)} m.`;
      info.className = (a.snapped && a.confirmed) ? 'note' : 'note warn';
    } else {
      info.textContent = (S.denom ? `Pieņemts 1:${S.denom}` : 'Kalibrēts pēc izmēra')
        + `. Lapa ${U.fmt(w)} × ${U.fmt(h)} m.`;
      info.className = S.denom ? 'note warn' : 'note';
    }
    renderSlim();
  }

  function startPick(mode) {
    if (!S.img) { toast('Vispirms ielādē plānu'); return; }
    if (S.mode === mode) { setMode('pan'); EW.Renderer.draw(); return; }
    setMode(mode);
    S.calibPts = [];
    el('calibModal').classList.remove('open');
    el('calibTitle').textContent = mode === 'calib' ? 'Kalibrēt mērogu' : 'Mērīt attālumu';
    el('calibText').textContent = mode === 'calib'
      ? 'Uzsit uz plāna divus punktus, starp kuriem attālums ir zināms. Jo garāks nogrieznis, jo precīzāk.'
      : 'Uzsit uz plāna divus punktus, lai izmērītu attālumu pašreizējā mērogā.';
    el('measured').textContent = '';
    el('calibVal').disabled = true;
    el('calibOk').disabled = true;
    el('calibOk').style.display = mode === 'calib' ? '' : 'none';
    el('calibInputWrap').style.display = mode === 'calib' ? 'flex' : 'none';
    banner(mode === 'calib' ? 'Kalibrēšana: uzsit divus punktus' : 'Mērīšana: uzsit divus punktus');
    EW.Renderer.draw();
  }

  function addCalibPoint(e) {
    const cv = EW.Renderer.getCanvas();
    const { W, H } = EW.Renderer.getDims();
    const r = cv.getBoundingClientRect();
    const p = Grid.s2w(e.clientX - r.left, e.clientY - r.top, W, H);
    if (S.calibPts.length >= 2) S.calibPts = [];
    S.calibPts.push(p);

    if (S.calibPts.length === 2) {
      const d = Math.hypot(S.calibPts[1].x - S.calibPts[0].x, S.calibPts[1].y - S.calibPts[0].y);
      el('calibModal').classList.add('open');
      el('measured').textContent = `Izmērīts: ${U.dec(d, 3)} m`;
      if (S.mode === 'calib') {
        el('calibText').textContent = 'Cik metru patiesībā ir starp šiem punktiem? Var rakstīt ar komatu, piemēram 11,201.';
        el('calibVal').disabled = false;
        el('calibVal').value = U.dec(d, 3);
        el('calibOk').disabled = false;
        el('calibVal').focus();
        el('calibVal').select();
      }
    }
    EW.Renderer.draw();
  }

  async function renderCards() {
    const box = el('cards');
    if (!box) return;
    const storeKind = Store.driver.kind;
    el('storeNote').textContent = storeKind === 'cloud'
      ? 'Zonas glabājas šī rīka pastāvīgajā atmiņā.'
      : storeKind === 'local'
        ? 'Zonas glabājas šajā pārlūkā. Pārnešanai uz citu datoru izmanto eksportu.'
        : 'Pastāvīgā atmiņa nav pieejama — zonas pazudīs, aizverot lapu. Izmanto eksportu.';

    if (!S.index.length) {
      box.innerHTML = '<div class="empty">Vēl nav saglabātu darba zonu.</div>';
      return;
    }
    box.innerHTML = '';
    S.index.forEach(r => {
      const d = new Date(r.updated);
      const c = document.createElement('div');
      c.className = 'card';
      const isTpl = !!r.isTemplate;
      const typeBadge = isTpl 
        ? '<span style="background:#b71c1c;color:#fff;padding:1px 5px;border-radius:3px;font-size:10px;font-weight:700;margin-right:4px">🏛️ BĀZES TELPA</span>'
        : '<span style="background:#0284c7;color:#fff;padding:1px 5px;border-radius:3px;font-size:10px;font-weight:700;margin-right:4px">🎨 EKSPOZĪCIJA</span>';

      c.innerHTML = `<div class="thumb" style="background-image:url(${r.thumb})"></div>
        <div class="meta">
          <div class="t">${typeBadge}${U.esc(r.name)}</div>
          <div class="s">${r.denom ? '1:' + r.denom : 'kalibrēts'} &bull; ${r.grids} zāles &bull; ${isTpl ? 'šablons bez moduļiem' : (r.modules || 0) + ' moduļi'} &bull; ${d.toLocaleDateString('lv-LV')}</div>
        </div>
        <div class="acts" style="display:flex;gap:4px">
          ${isTpl ? `<button class="key" data-newexp="${r.id}" style="font-size:11px;padding:4px 8px">Sākt ekspozīciju</button>` : ''}
          <button class="ghost" data-open="${r.id}" style="font-size:11px;padding:4px 8px">Atvērt</button>
          <button class="ghost" data-dup="${r.id}" style="font-size:11px;padding:4px 8px" title="Izveidot šīs ekspozīcijas kopiju">📑 Kopēt</button>
          <button class="ghost" data-drop="${r.id}" style="color:var(--danger);font-size:11px;padding:4px 8px">Dzēst</button>
        </div>`;

      c.addEventListener('click', async ev => {
        const openId = ev.target.dataset.open;
        const dropId = ev.target.dataset.drop;
        const dupId = ev.target.dataset.dup;
        const newExpId = ev.target.dataset.newexp;

        if (dropId) {
          if (!confirm(`Dzēst “${r.name}”?`)) return;
          await Store.deleteRecord(dropId);
          renderCards();
          return;
        }

        if (dupId) {
          const copy = await Store.duplicateRecord(dupId);
          if (copy) {
            toast(`Izveidota kopija: ${copy.name}`);
            renderCards();
          }
          return;
        }

        if (newExpId) {
          const rec = await Store.driver.get('ew:wz:' + newExpId);
          if (!rec) return;
          el('libModal').classList.remove('open');
          // Sākam jaunu ekspozīciju ar tukšiem moduļiem uz šīs telpas bāzes
          Store.applyRecord(rec, () => {
            setMode('pan');
            syncInputs();
            renderChips();
            updateScaleInfo();
            if (EW.ModulesInteraction) EW.ModulesInteraction.updateModuleControls();
            EW.Renderer.draw();
            toast(`Uzsākta jauna ekspozīcija uz “${rec.name}” bāzes`);
          }, true);
          return;
        }

        if (openId || (!ev.target.closest('button') && !ev.target.dataset.del)) {
          const rec = await Store.driver.get('ew:wz:' + (openId || r.id));
          if (!rec) {
            toast('Ierakstu neizdevās nolasīt');
            return;
          }
          el('libModal').classList.remove('open');
          Store.applyRecord(rec, () => {
            setMode('pan');
            syncInputs();
            renderChips();
            updateScaleInfo();
            if (EW.ModulesInteraction) EW.ModulesInteraction.updateModuleControls();
            EW.Renderer.draw();
            toast(`Atvērts: ${rec.name}`);
          });
        }
      });
      box.appendChild(c);
    });
  }

  function updateEmptyDashboard() {
    const dash = el('emptyStageDashboard');
    if (!dash) return;
    const isAdmin = EW.Venues && typeof EW.Venues.isAdmin === 'function' && EW.Venues.isAdmin();
    const hasActiveContent = !!(S.img || S.exhibition);
    if (!isAdmin && !hasActiveContent) {
      dash.style.display = 'flex';
      renderSavedExhibitions();
    } else {
      dash.style.display = 'none';
    }
  }

  async function renderSavedExhibitions() {
    await Store.loadIndex();
    const countBadge = el('dashboardExpCountBadge');
    if (countBadge) countBadge.textContent = S.index.length;
    const sideCount = el('sidebarExpCount');
    if (sideCount) sideCount.textContent = S.index.length;

    // 1. Galvenā audekla kuratora darba galda kartītes
    const dashGrid = el('dashboardSavedExhibitions');
    if (dashGrid) {
      if (!S.index.length) {
        dashGrid.innerHTML = `
          <div style="grid-column:1/-1;padding:36px 16px;text-align:center;color:var(--ink-dim);border:1.5px dashed var(--line);border-radius:10px;background:var(--panel)">
            <div style="font-size:32px;margin-bottom:8px">🏛️</div>
            <div style="font-weight:700;font-size:14px;color:var(--ink);margin-bottom:4px">Vēl nav saglabātu ekspozīciju</div>
            <div style="font-size:12px;margin-bottom:12px">Izveidojiet jaunu ekspozīciju no muzeja zāļu veidnēm, lai sāktu montāžu!</div>
            <button type="button" class="key" id="btnDashCreateExpEmpty" style="background:var(--brand-red);border-color:var(--brand-red);font-size:12px;padding:6px 14px">
              ✨ Izveidot jaunu ekspozīciju
            </button>
          </div>
        `;
        const btnEmptyCreate = el('btnDashCreateExpEmpty');
        if (btnEmptyCreate) {
          btnEmptyCreate.addEventListener('click', () => {
            const btnWiz = el('btnNewExpWizard');
            if (btnWiz) btnWiz.click();
          });
        }
      } else {
        dashGrid.innerHTML = '';
        S.index.forEach(r => {
          const d = new Date(r.updated);
          const c = document.createElement('div');
          c.className = 'dashboard-exp-card';
          if (S.recordId === r.id) c.style.borderColor = 'var(--accent)';
          c.innerHTML = `
            <div class="dashboard-exp-thumb" style="background-image:url(${r.thumb || ''})"></div>
            <div class="dashboard-exp-name" title="${U.esc(r.name)}">${U.esc(r.name)}</div>
            <div class="dashboard-exp-meta">
              <span>🏛️ ${r.grids || 1} zāles &bull; 🧱 ${(r.modules || 0)} karkasa moduļi</span>
              <span>📅 ${d.toLocaleDateString('lv-LV')} (${d.toLocaleTimeString('lv-LV', { hour: '2-digit', minute: '2-digit' })})</span>
            </div>
            <div class="dashboard-exp-actions">
              <button type="button" class="key" data-open="${r.id}" style="flex:1;background:var(--brand-red);border-color:var(--brand-red)">Atvērt</button>
              <button type="button" class="step" data-overview="${r.id}" style="padding:3px 8px;font-size:11px;font-weight:600" title="Apskatīt zāles un variantus (A, B, C...)">🗂️ Varianti</button>
              <button type="button" class="ghost" data-dup="${r.id}" title="Dublēt šo ekspozīciju">📋 Kopēt</button>
              <button type="button" class="ghost" data-drop="${r.id}" style="color:var(--danger)" title="Dzēst šo ekspozīciju">🗑️</button>
            </div>
          `;
          attachExpCardActions(c, r);
          dashGrid.appendChild(c);
        });
      }
    }

    // 2. Sānjoslas kompaktais saraksts
    const sideList = el('sidebarSavedExhibitions');
    if (sideList) {
      if (!S.index.length) {
        sideList.innerHTML = '<div style="font-size:10.5px;color:var(--ink-dim);padding:6px 2px">Nav saglabātu ekspozīciju</div>';
      } else {
        sideList.innerHTML = '';
        S.index.forEach(r => {
          const d = new Date(r.updated);
          const c = document.createElement('div');
          c.className = `sidebar-exp-card ${S.recordId === r.id ? 'active-exp' : ''}`;
          c.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-weight:600;font-size:11px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${U.esc(r.name)}</span>
              <button type="button" class="ghost" data-drop="${r.id}" style="padding:1px 4px;font-size:10px;color:var(--danger)" title="Dzēst">✕</button>
            </div>
            <div style="font-size:10px;color:var(--ink-dim);display:flex;justify-content:space-between;align-items:center">
              <span>${r.grids || 1}z &bull; ${r.modules || 0}m &bull; ${d.toLocaleDateString('lv-LV')}</span>
              <div style="display:flex;gap:3px;align-items:center">
                <button type="button" class="step" data-overview="${r.id}" style="padding:2px 5px;font-size:10px" title="Apskatīt zāles un variantus">🗂️</button>
                <button type="button" class="key" data-open="${r.id}" style="padding:2px 6px;font-size:10px">Atvērt</button>
              </div>
            </div>
          `;
          attachExpCardActions(c, r);
          sideList.appendChild(c);
        });
      }
    }
  }

  function attachExpCardActions(container, record) {
    container.addEventListener('click', async ev => {
      const openId = ev.target.dataset.open;
      const dropId = ev.target.dataset.drop;
      const dupId = ev.target.dataset.dup;
      const overviewId = ev.target.dataset.overview || ev.target.closest('[data-overview]')?.dataset.overview;

      if (overviewId || (!ev.target.closest('button'))) {
        ev.stopPropagation();
        if (EW.ExhibitionOverview && typeof EW.ExhibitionOverview.open === 'function') {
          EW.ExhibitionOverview.open(overviewId || record.id);
        }
        return;
      }

      if (dropId) {
        ev.stopPropagation();
        if (!confirm(`Dzēst ekspozīciju “${record.name}”?`)) return;
        await Store.deleteRecord(dropId);
        if (S.recordId === dropId) {
          S.recordId = null;
          S.img = null;
          S.exhibition = null;
          S.modules = [];
          S.panels = [];
          EW.Renderer.draw();
        }
        updateEmptyDashboard();
        renderSavedExhibitions();
        renderCards();
        toast('Ekspozīcija dzēsta');
        return;
      }

      if (dupId) {
        ev.stopPropagation();
        const copy = await Store.duplicateRecord(dupId);
        if (copy) {
          toast(`Izveidota kopija: ${copy.name}`);
          renderSavedExhibitions();
          renderCards();
        }
        return;
      }

      if (openId || (!ev.target.closest('button'))) {
        const targetId = openId || record.id;
        const rec = await Store.driver.get('ew:wz:' + targetId);
        if (!rec) {
          toast('Ierakstu neizdevās nolasīt');
          return;
        }
        Store.applyRecord(rec, () => {
          setMode('pan');
          syncInputs();
          renderChips();
          updateScaleInfo();
          if (EW.ModulesInteraction) EW.ModulesInteraction.updateModuleControls();
          updateEmptyDashboard();
          renderSavedExhibitions();
          EW.Renderer.draw();
          toast(`Atvērta ekspozīcija: ${rec.name}`);
        });
      }
    });
  }

  function setSlim(on) {
    const bar = el('bar');
    if (bar) bar.classList.toggle('slim', on);
    renderSlim();
    requestAnimationFrame(() => EW.Renderer.draw());
  }

  // Lapas renderēšana no PDF
  async function renderPdfPage(fit) {
    const page = await S.pdf.getPage(S.page);
    const base = page.getViewport({ scale: 1 });
    S.R = Math.min(6, Math.max(1.5, 2600 / Math.max(base.width, base.height)));
    const vp = page.getViewport({ scale: S.R });
    S.vp = vp;
    const c = document.createElement('canvas');
    c.width = Math.round(vp.width);
    c.height = Math.round(vp.height);
    const cc = c.getContext('2d');
    cc.fillStyle = '#fff';
    cc.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: cc, viewport: vp }).promise;
    S.img = c;
    if (el('pgLabel')) el('pgLabel').textContent = `${S.page}/${S.pages}`;
    S.chain = null;
    S.detected = null;

    if (!S.mppPt) {
      const auto = await PdfScale.detectScale(page);
      if (auto) {
        PdfScale.applyDetected(auto);
      } else {
        PdfScale.applyPlotScale(U.num(el('plotScale').value));
        toast('Izmēru ķēde neatradās — mērogs pieņemts pēc saraksta');
      }
    }
    if (fit) EW.Interaction.fitView();
    updateScaleInfo();
    EW.Renderer.draw();
  }

  async function loadPdf(f) {
    if (!window.pdfjsLib) {
      toast('PDF bibliotēka nav pieejama — pārbaudi tīkla savienojumu');
      return;
    }
    toast('Renderē PDF…');
    S.pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
    S.pages = S.pdf.numPages;
    S.page = 1;
    if (el('pageNav')) el('pageNav').style.display = S.pages > 1 ? 'flex' : 'none';
    S.mppPt = null;
    S.denom = null;
    S.detected = null;
    await renderPdfPage(true);
  }

  async function loadPdfFromUrl(url, targetPage, targetScale, targetMppPt) {
    if (!window.pdfjsLib) {
      toast('PDF bibliotēka nav pieejama');
      return false;
    }
    toast('Ielādē telpas arhitektūras plānu…');
    try {
      const res = await fetch(encodeURI(url));
      if (!res.ok) throw new Error('Fails nav pieejams: ' + url);
      const buf = await res.arrayBuffer();
      S.pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      S.pages = S.pdf.numPages;
      S.page = (targetPage && targetPage >= 1 && targetPage <= S.pages) ? targetPage : 1;
      if (el('pageNav')) el('pageNav').style.display = S.pages > 1 ? 'flex' : 'none';
      if (targetMppPt) {
        S.mppPt = targetMppPt;
        S.denom = targetScale || Math.round(targetMppPt / C.PT2M);
      } else if (targetScale) {
        S.denom = targetScale;
        S.mppPt = C.PT2M * targetScale;
      } else {
        S.mppPt = null;
        S.denom = 100;
      }
      if (el('plotScale') && S.denom) {
        el('plotScale').value = String(S.denom);
      }
      S.detected = null;
      await renderPdfPage(true);
      return true;
    } catch (e) {
      console.warn('Neizdevās ielādēt PDF no URL:', e);
      return false;
    }
  }

  function loadRaster(f) {
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        S.img = im;
        S.pdf = null;
        S.vp = null;
        S.chain = null;
        S.detected = null;
        S.R = 1;
        S.mppPt = 0.01;
        S.denom = null;
        if (el('pageNav')) el('pageNav').style.display = 'none';
        EW.Interaction.fitView();
        updateScaleInfo();
        EW.Renderer.draw();
        toast('Attēls bez iekšēja mēroga — kalibrē pēc izmēra');
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
  }

  EW.UI = {
    el,
    toast,
    banner,
    setMode,
    updateLockUI,
    renderChips,
    renderSlim,
    syncInputs,
    bindNum,
    updateScaleInfo,
    startPick,
    addCalibPoint,
    renderCards,
    setSlim,
    renderPdfPage,
    loadPdf,
    loadPdfFromUrl,
    loadRaster,
    updateEmptyDashboard,
    renderSavedExhibitions
  };
})();
