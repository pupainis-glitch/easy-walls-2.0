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

  function setMode(m) {
    S.mode = m;
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

    if (m === 'origin') {
      S.G().locked = false;
      banner(`${S.G().name}: uzklikšķini uz plāna jauno sākumpunktu, tad spied “✓ Pabeigt novietošanu”.`);
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
      btnRelocate.textContent = placing ? '✓ Pabeigt novietošanu' : '📍 Pārnest sākumpunktu';
      btnRelocate.classList.toggle('key', placing);
      btnRelocate.classList.toggle('on', placing);
    }

    if (btnLockToggle) {
      btnLockToggle.textContent = g.locked ? '🔒 Nobloķēts' : '🔓 Atbloķēts';
      btnLockToggle.classList.toggle('on', !g.locked);
      btnLockToggle.title = g.locked ? 'Režģis ir nobloķēts. Klikšķini, lai atbloķētu X un Y regulēšanu.' : 'Režģis ir atbloķēts. Klikšķini, lai nobloķētu.';
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

    const auto = await PdfScale.detectScale(page);
    if (auto) {
      PdfScale.applyDetected(auto);
    } else if (!S.mppPt) {
      PdfScale.applyPlotScale(U.num(el('plotScale').value));
      toast('Izmēru ķēde neatradās — mērogs pieņemts pēc saraksta');
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
    loadRaster
  };
})();
