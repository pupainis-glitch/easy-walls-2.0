/**
 * Easy walls 2.0 — Ekspozīcijas pārskats un variantu (A, B, C...) pārvaldnieks
 * 
 * Ļauj kuratoram vienuviet pārskatīt visas ekspozīcijas zāles un katras zāles
 * sastādītos arhitektūras variantus vizuālā stabiņā ar priekšskatījumu:
 * - Atvērt variantu un zāli redaktorā
 * - Kopēt / dublēt variantu
 * - Arhivēt / atarhivēt variantu vēsturiskai saglabāšanai
 * - Dzēst nevajadzīgos variantus
 */
window.EW = window.EW || {};

(function() {
  const S = EW.State;
  const U = EW.Utils;

  let currentExhibition = null;
  let currentRecordId = null;
  let currentVariants = [];
  let selectedRoomIndex = 0;
  let isViewingLoadedWorkspace = false;

  function el(id) {
    return document.getElementById(id);
  }

  /**
   * Atver ekspozīcijas pārskata dialogu
   * @param {string|null} recordId Saglabātās ekspozīcijas ID vai null aktīvajai
   */
  async function open(recordId = null) {
    const modal = el('exhibitionOverviewModal');
    if (!modal) return;

    // Ja atveram aktīvo darba galdu
    if (!recordId || (S.recordId && S.recordId === recordId)) {
      isViewingLoadedWorkspace = true;
      currentRecordId = S.recordId;

      if (EW.Variants && typeof EW.Variants.saveCurrentToActiveVariant === 'function') {
        EW.Variants.saveCurrentToActiveVariant();
      }

      // Ja nav formalizētas ekspozīcijas objekta, izveidojam vienkāršotu no pašreizējā plāna
      if (!S.exhibition || !S.exhibition.rooms || !S.exhibition.rooms.length) {
        currentExhibition = {
          name: S.planName || 'Aktīvā ekspozīcija',
          buildingName: 'Muzeja zāle',
          rooms: [
            {
              id: 'rm_default',
              name: S.planName || '1. zāle',
              widthM: S.G() ? Math.round(S.G().dx * 2) : 30,
              heightM: S.G() ? Math.round(S.G().dy * 2) : 20
            }
          ]
        };
      } else {
        currentExhibition = JSON.parse(JSON.stringify(S.exhibition));
      }

      currentVariants = S.variants ? JSON.parse(JSON.stringify(S.variants)) : [];
      selectedRoomIndex = S.activeRoomIndex || 0;
    } else {
      // Ielādējam datus no Store datubāzes
      isViewingLoadedWorkspace = false;
      currentRecordId = recordId;

      if (!EW.Store || !EW.Store.driver) return;
      const rec = await EW.Store.driver.get('ew:wz:' + recordId);
      if (!rec) {
        if (EW.UI) EW.UI.toast('Neizdevās atrast ekspozīcijas datus');
        return;
      }

      if (rec.exhibition && rec.exhibition.rooms && rec.exhibition.rooms.length) {
        currentExhibition = rec.exhibition;
      } else {
        currentExhibition = {
          name: rec.name,
          buildingName: 'Muzeja telpa',
          rooms: (rec.grids || []).map((g, i) => ({
            id: 'rm_' + (g.id || (i + 1)),
            name: g.name || `Zāle ${i + 1}`,
            widthM: Math.round((g.dx || 15) * 2),
            heightM: Math.round((g.dy || 10) * 2)
          }))
        };
        if (!currentExhibition.rooms.length) {
          currentExhibition.rooms = [{ id: 'rm_1', name: rec.name, widthM: 30, heightM: 20 }];
        }
      }

      currentVariants = rec.variants && rec.variants.length
        ? JSON.parse(JSON.stringify(rec.variants))
        : [
            {
              id: 'var_a',
              roomId: currentExhibition.rooms[0].id,
              gridId: 1,
              name: 'Variants A',
              modules: rec.modules || [],
              panels: [],
              artworks: rec.artworks || [],
              updated: rec.updated || Date.now(),
              isArchived: false
            }
          ];

      selectedRoomIndex = rec.activeRoomIndex || 0;
    }

    if (selectedRoomIndex >= currentExhibition.rooms.length) {
      selectedRoomIndex = 0;
    }

    renderHeader();
    renderRoomTabs();
    renderVariantsList();

    modal.classList.add('open');
  }

  function close() {
    const modal = el('exhibitionOverviewModal');
    if (modal) modal.classList.remove('open');
  }

  function renderHeader() {
    const titleEl = el('expOverviewTitle');
    const metaEl = el('expOverviewMeta');
    if (!titleEl || !currentExhibition) return;

    titleEl.textContent = currentExhibition.name || 'Ekspozīcija';
    const bName = currentExhibition.buildingName || 'Muzejs';
    const rCount = (currentExhibition.rooms || []).length;
    const vCount = (currentVariants || []).length;

    metaEl.textContent = `🏛️ ${bName} • ${rCount} ${rCount === 1 ? 'zāle' : 'zāles'} • Kopā ${vCount} ${vCount === 1 ? 'variants' : 'varianti'}`;
  }

  function renderRoomTabs() {
    const tabsWrap = el('expOverviewRoomTabs');
    if (!tabsWrap || !currentExhibition) return;

    tabsWrap.innerHTML = '';
    const rooms = currentExhibition.rooms || [];

    rooms.forEach((rm, idx) => {
      const isSelected = idx === selectedRoomIndex;
      const roomVars = currentVariants.filter(v => v.roomId === rm.id || (!v.roomId && idx === 0));
      const activeVars = roomVars.filter(v => !v.isArchived).length;
      const archivedVars = roomVars.filter(v => v.isArchived).length;

      const tab = document.createElement('div');
      tab.className = `exp-overview-room-tab ${isSelected ? 'active' : ''}`;
      tab.title = `Apskatīt zāles “${rm.name}” variantus`;
      tab.innerHTML = `
        <span style="font-size:14px">🏛️</span>
        <div style="display:flex;flex-direction:column;gap:2px">
          <span class="tab-title">${U.esc(rm.name)}</span>
          <span style="font-size:10px;color:var(--ink-dim)">${rm.widthM}×${rm.heightM}m</span>
        </div>
        <span class="tab-badge">${activeVars} var.${archivedVars > 0 ? ` (+${archivedVars} arh.)` : ''}</span>
      `;

      tab.onclick = () => {
        selectedRoomIndex = idx;
        renderRoomTabs();
        renderVariantsList();
      };

      tabsWrap.appendChild(tab);
    });
  }

  function renderVariantsList() {
    const listWrap = el('expOverviewVariantsList');
    const countBadge = el('expOverviewVariantCount');
    if (!listWrap || !currentExhibition) return;

    const currentRoom = currentExhibition.rooms[selectedRoomIndex];
    if (!currentRoom) return;

    const roomVars = currentVariants.filter(v => v.roomId === currentRoom.id || (!v.roomId && selectedRoomIndex === 0));

    if (countBadge) {
      countBadge.textContent = `${roomVars.length} ${roomVars.length === 1 ? 'variants' : 'varianti'}`;
    }

    if (!roomVars.length) {
      listWrap.innerHTML = `
        <div style="padding:24px;text-align:center;color:var(--ink-dim);border:1.5px dashed var(--line);border-radius:6px;background:var(--panel)">
          <div style="font-size:24px;margin-bottom:6px">📐</div>
          <div style="font-weight:700;font-size:13px;color:var(--ink);margin-bottom:4px">Šai zālei vēl nav izveidots neviens variants</div>
          <div style="font-size:11.5px;margin-bottom:12px">Nospiediet pogu zemāk, lai izveidotu pirmo karkasa izkārtojuma scenāriju.</div>
          <button type="button" class="key" id="btnEmptyCreateVar" style="background:var(--brand-red);border-color:var(--brand-red);font-size:11.5px;padding:6px 12px">
            ✨ Izveidot variantu A
          </button>
        </div>
      `;
      const btnEmpty = el('btnEmptyCreateVar');
      if (btnEmpty) {
        btnEmpty.onclick = () => createNewVariantForRoom(currentRoom.id, 'Variants A');
      }
      return;
    }

    listWrap.innerHTML = '';

    // Sakārtojam: vispirms aktīvie/nearhivētie, beigās arhivētie
    const sorted = [...roomVars].sort((a, b) => {
      if (a.isArchived && !b.isArchived) return 1;
      if (!a.isArchived && b.isArchived) return -1;
      return (b.updated || 0) - (a.updated || 0);
    });

    sorted.forEach(v => {
      const isCurrentActive = isViewingLoadedWorkspace && (v.id === S.activeVariantId);
      const isArchived = !!v.isArchived;

      const mods = v.modules || [];
      const largeMods = mods.filter(m => m.type === 'large').length;
      const smallMods = mods.filter(m => m.type === 'small').length;
      const panelCount = (v.panels || []).length;
      const artCount = (v.artworks || []).length;
      const dateStr = v.updated
        ? new Date(v.updated).toLocaleDateString('lv-LV') + ' ' + new Date(v.updated).toLocaleTimeString('lv-LV', { hour: '2-digit', minute: '2-digit' })
        : 'Nesen';

      const card = document.createElement('div');
      card.className = `exp-variant-card ${isCurrentActive ? 'active-variant' : ''} ${isArchived ? 'archived-variant' : ''}`;
      card.innerHTML = `
        <div class="exp-variant-header">
          <div class="exp-variant-title-wrap">
            <span style="font-size:16px">🧱</span>
            <span class="exp-variant-title">${U.esc(v.name)}</span>
            ${isCurrentActive ? '<span class="badge-variant-active">Aktīvs</span>' : ''}
            ${isArchived ? '<span class="badge-variant-archived">📦 Arhivēts</span>' : ''}
          </div>
          <span class="exp-variant-date">📅 ${dateStr}</span>
        </div>

        <div class="exp-variant-stats">
          <span>🧱 <b>${mods.length}</b> moduļi (${largeMods} lielie 2×1m, ${smallMods} mazie 1×1m)</span>
          <span>🧩 <b>${panelCount}</b> paneļi</span>
          <span>🖼️ <b>${artCount}</b> eksponāti</span>
        </div>

        <div class="exp-variant-actions">
          <button type="button" class="key btn-var-open" data-var-id="${v.id}" style="padding:4px 12px;font-size:11px;font-weight:700;background:var(--brand-red);border-color:var(--brand-red)">
            👁️ Atvērt
          </button>
          <button type="button" class="ghost btn-var-copy" data-var-id="${v.id}" style="padding:4px 10px;font-size:11px" title="Izveidot šī varianta kopiju">
            📋 Kopēt
          </button>
          <button type="button" class="ghost btn-var-archive" data-var-id="${v.id}" style="padding:4px 10px;font-size:11px" title="${isArchived ? 'Atjaunot darba sarakstā' : 'Arhivēt šo variantu'}">
            ${isArchived ? '↩️ Atarhivēt' : '📦 Arhivēt'}
          </button>
          <button type="button" class="ghost btn-var-delete" data-var-id="${v.id}" style="padding:4px 8px;font-size:11px;color:var(--danger);margin-left:auto" title="Dzēst šo variantu">
            🗑️ Dzēst
          </button>
        </div>
      `;

      // Piesaistām darbības
      const btnOpen = card.querySelector('.btn-var-open');
      if (btnOpen) {
        btnOpen.onclick = () => openVariantInEditor(v.id, selectedRoomIndex);
      }

      const btnCopy = card.querySelector('.btn-var-copy');
      if (btnCopy) {
        btnCopy.onclick = () => duplicateVariant(v.id);
      }

      const btnArchive = card.querySelector('.btn-var-archive');
      if (btnArchive) {
        btnArchive.onclick = () => toggleArchiveVariant(v.id);
      }

      const btnDel = card.querySelector('.btn-var-delete');
      if (btnDel) {
        btnDel.onclick = () => deleteVariant(v.id, v.name);
      }

      listWrap.appendChild(card);
    });
  }

  /**
   * Atver atlasīto variantu un zāli galvenajā redaktorā
   */
  async function openVariantInEditor(variantId, roomIndex) {
    close();

    // Ja skatījāmies citu saglabāto ierakstu, ielādējam to vispirms
    if (!isViewingLoadedWorkspace && currentRecordId) {
      if (EW.Store && EW.Store.driver && EW.Store.applyRecord) {
        const rec = await EW.Store.driver.get('ew:wz:' + currentRecordId);
        if (rec) {
          await new Promise(resolve => {
            EW.Store.applyRecord(rec, () => resolve(true));
          });
        }
      }
    }

    // Pārslēdzamies uz atbilstošo zāli
    if (EW.Venues && typeof EW.Venues.activateExhibitionRoom === 'function') {
      await EW.Venues.activateExhibitionRoom(roomIndex);
    }

    // Pārslēdzamies uz atbilstošo variantu
    if (EW.Variants && typeof EW.Variants.switchVariant === 'function') {
      EW.Variants.switchVariant(variantId);
    }

    // Automātisks lēciens uz 2. soli (Karkass)
    if (EW.Mentor && typeof EW.Mentor.setStep === 'function') {
      EW.Mentor.setStep(2);
    }

    // Atveram moduļu paneli
    if (EW.UI && typeof EW.UI.openToolDrawer === 'function') {
      EW.UI.openToolDrawer('cardModules');
    }

    if (EW.UI && EW.UI.toast) {
      const v = (S.variants || []).find(x => x.id === variantId);
      const rm = S.exhibition && S.exhibition.rooms ? S.exhibition.rooms[roomIndex] : null;
      EW.UI.toast(`Atvērts: ${rm ? rm.name + ' — ' : ''}${v ? v.name : 'Variants'}`);
    }
  }

  /**
   * Dublē variantu
   */
  async function duplicateVariant(variantId) {
    if (isViewingLoadedWorkspace) {
      if (EW.Variants && typeof EW.Variants.duplicateVariant === 'function') {
        const copy = EW.Variants.duplicateVariant(variantId);
        if (copy) {
          currentVariants = S.variants ? JSON.parse(JSON.stringify(S.variants)) : [];
          renderVariantsList();
          renderRoomTabs();
          saveExhibitionToStore();
          if (EW.UI) EW.UI.toast(`Izveidota kopija: “${copy.name}”`);
        }
      }
    } else {
      const v = currentVariants.find(x => x.id === variantId);
      if (!v) return;
      const copyId = 'var_' + (v.roomId ? v.roomId + '_' : '') + Date.now().toString(36);
      const copy = {
        ...v,
        id: copyId,
        name: `${v.name} (kopija)`,
        updated: Date.now(),
        isArchived: false,
        modules: (v.modules || []).map(m => ({ ...m })),
        panels: (v.panels || []).map(p => ({ ...p })),
        artworks: (v.artworks || []).map(a => ({ ...a }))
      };
      currentVariants.push(copy);
      renderVariantsList();
      renderRoomTabs();
      await saveExhibitionToStore();
      if (EW.UI) EW.UI.toast(`Izveidota kopija: “${copy.name}”`);
    }
  }

  /**
   * Arhivē vai atarhivē variantu
   */
  async function toggleArchiveVariant(variantId) {
    if (isViewingLoadedWorkspace) {
      if (EW.Variants && typeof EW.Variants.toggleArchiveVariant === 'function') {
        EW.Variants.toggleArchiveVariant(variantId);
        currentVariants = S.variants ? JSON.parse(JSON.stringify(S.variants)) : [];
        renderVariantsList();
        renderRoomTabs();
        saveExhibitionToStore();
      }
    } else {
      const v = currentVariants.find(x => x.id === variantId);
      if (!v) return;
      v.isArchived = !v.isArchived;
      v.updated = Date.now();
      renderVariantsList();
      renderRoomTabs();
      await saveExhibitionToStore();
      if (EW.UI) EW.UI.toast(v.isArchived ? `Variants “${v.name}” arhivēts` : `Variants “${v.name}” atarhivēts`);
    }
  }

  /**
   * Dzēš variantu
   */
  async function deleteVariant(variantId, variantName) {
    const currentRoom = currentExhibition.rooms[selectedRoomIndex];
    const roomVars = currentVariants.filter(v => v.roomId === currentRoom.id || (!v.roomId && selectedRoomIndex === 0));

    if (roomVars.length <= 1) {
      if (EW.UI) EW.UI.toast('Nevar izdzēst vienīgo zāles variantu');
      return;
    }

    if (!confirm(`Vai tiešām dzēst variantu “${variantName}”?`)) return;

    if (isViewingLoadedWorkspace) {
      if (EW.Variants && typeof EW.Variants.deleteVariant === 'function') {
        EW.Variants.deleteVariant(variantId);
        currentVariants = S.variants ? JSON.parse(JSON.stringify(S.variants)) : [];
        renderVariantsList();
        renderRoomTabs();
        saveExhibitionToStore();
      }
    } else {
      const delIdx = currentVariants.findIndex(v => v.id === variantId);
      if (delIdx >= 0) {
        currentVariants.splice(delIdx, 1);
        renderVariantsList();
        renderRoomTabs();
        await saveExhibitionToStore();
        if (EW.UI) EW.UI.toast('Variants dzēsts');
      }
    }
  }

  /**
   * Izveido jaunu variantu aktīvajai zālei
   */
  async function createNewVariantForRoom(roomId, customName = null) {
    const roomVars = currentVariants.filter(v => v.roomId === roomId || (!v.roomId && selectedRoomIndex === 0));
    const nextLetter = String.fromCharCode(65 + Math.min(25, roomVars.length));
    const vName = customName || `Variants ${nextLetter}`;

    if (isViewingLoadedWorkspace) {
      if (EW.Variants && typeof EW.Variants.createVariant === 'function') {
        const nv = EW.Variants.createVariant(vName, true, roomId);
        currentVariants = S.variants ? JSON.parse(JSON.stringify(S.variants)) : [];
        renderVariantsList();
        renderRoomTabs();
        saveExhibitionToStore();
        if (EW.UI) EW.UI.toast(`Izveidots ${vName}`);
      }
    } else {
      const newId = 'var_' + (roomId ? roomId + '_' : '') + Date.now().toString(36);
      const newVar = {
        id: newId,
        roomId: roomId,
        gridId: selectedRoomIndex + 1,
        name: vName,
        modules: [],
        panels: [],
        artworks: [],
        updated: Date.now(),
        isArchived: false
      };
      currentVariants.push(newVar);
      renderVariantsList();
      renderRoomTabs();
      await saveExhibitionToStore();
      if (EW.UI) EW.UI.toast(`Izveidots ${vName}`);
    }
  }

  /**
   * Saglabā izmaiņas Store datubāzē
   */
  async function saveExhibitionToStore() {
    if (!EW.Store) return;
    try {
      if (isViewingLoadedWorkspace && EW.Store.buildRecord) {
        const rec = EW.Store.buildRecord(S.planName, S.recordId, false);
        await EW.Store.saveRecord(rec);
        S.recordId = rec.id;
        currentRecordId = rec.id;
      } else if (currentRecordId) {
        const orig = await EW.Store.driver.get('ew:wz:' + currentRecordId);
        if (orig) {
          orig.variants = currentVariants;
          orig.updated = Date.now();
          await EW.Store.saveRecord(orig);
        }
      }
      if (EW.UI && typeof EW.UI.renderSavedExhibitions === 'function') {
        EW.UI.renderSavedExhibitions();
      }
    } catch (err) {
      console.warn('Neizdevās automātiski saglabāt variantu izmaiņas:', err);
    }
  }

  // Pogas piesaiste dialoga iekšienē
  function init() {
    const btnAdd = el('btnExpOverviewAddVariant');
    if (btnAdd) {
      btnAdd.onclick = () => {
        if (!currentExhibition || !currentExhibition.rooms) return;
        const currentRoom = currentExhibition.rooms[selectedRoomIndex];
        if (currentRoom) {
          createNewVariantForRoom(currentRoom.id);
        }
      };
    }

    const btnOpenStage = el('btnStageOpenExpOverview');
    if (btnOpenStage) {
      btnOpenStage.onclick = () => open();
    }

    const btnOpenBar = el('btnOpenExhibitionVariantsModal');
    if (btnOpenBar) {
      btnOpenBar.onclick = () => open();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  EW.ExhibitionOverview = {
    open,
    close
  };
})();
