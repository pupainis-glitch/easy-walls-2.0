/**
 * Easy walls 2.0 — Izstāžu variantu (Scenāriju A/B/C) pārvaldnieks
 * 
 * Ļauj katrā izstādes zālē uzturēt un salīdzināt vairākus izkārtojuma scenārijus:
 * - Variants A: atvērts telpas plānojums
 * - Variants B: kabinetu struktūra ar papildu starpsienām
 * - Variants C: hibrīda risinājums
 * 
 * Katram variantam ir savs neatkarīgs moduļu, paneļu un piekārto mākslas darbu stāvoklis,
 * kā arī arhivēšanas (Archive/Unarchive) un dublēšanas iespējas.
 */
window.EW = window.EW || {};

(function() {
  const S = EW.State;
  const U = EW.Utils;

  function getCurrentRoomId() {
    if (S.exhibition && S.exhibition.rooms && S.exhibition.rooms.length) {
      const idx = S.activeRoomIndex !== undefined ? S.activeRoomIndex : (S.active || 0);
      const rm = S.exhibition.rooms[idx];
      return rm ? rm.id : null;
    }
    return null;
  }

  function getCurrentGridId() {
    return (S.activeRoomIndex !== undefined ? S.activeRoomIndex : (S.active || 0)) + 1;
  }

  // Pārliecināmies, ka stāvoklī ir variantu saraksts
  function ensureVariants() {
    const curRoomId = getCurrentRoomId();
    const curGridId = getCurrentGridId();

    if (!S.variants || !S.variants.length) {
      S.variants = [
        {
          id: curRoomId ? `var_${curRoomId}_a` : 'var_a',
          roomId: curRoomId,
          gridId: curGridId,
          name: 'Variants A',
          modules: (S.modules || []).map(m => ({ ...m })),
          artworks: (S.artworks || []).map(a => ({ ...a })),
          panels: (S.panels || []).map(p => ({ ...p })),
          updated: Date.now(),
          isArchived: false
        }
      ];
      S.activeVariantId = S.variants[0].id;
      if (!S.activeRoomVariants) S.activeRoomVariants = {};
      if (curRoomId) S.activeRoomVariants[curRoomId] = S.variants[0].id;
    } else {
      // Pārbaudām, vai esošajiem variantiem ir piešķirts roomId, ja esam daudzzāļu ekspozīcijā
      if (curRoomId && S.exhibition && S.exhibition.rooms && S.exhibition.rooms.length > 1) {
        S.variants.forEach(v => {
          if (!v.roomId) {
            v.roomId = S.exhibition.rooms[0].id;
            v.gridId = 1;
          }
        });
      }
    }
  }

  ensureVariants();

  function getVariantsForRoom(roomId) {
    ensureVariants();
    if (!roomId) return S.variants;
    return S.variants.filter(v => v.roomId === roomId || (!v.roomId && S.exhibition?.rooms?.[0]?.id === roomId));
  }

  function getActiveVariant() {
    ensureVariants();
    const curRoomId = getCurrentRoomId();
    if (curRoomId && S.activeRoomVariants && S.activeRoomVariants[curRoomId]) {
      const v = S.variants.find(x => x.id === S.activeRoomVariants[curRoomId]);
      if (v) return v;
    }
    return S.variants.find(v => v.id === S.activeVariantId) || S.variants[0];
  }

  /**
   * Saglabā pašreizējo stāvokli (modules, artworks, panels) aktīvajā variantā
   */
  function saveCurrentToActiveVariant() {
    ensureVariants();
    const active = getActiveVariant();
    if (!active) return;

    const curRoomId = getCurrentRoomId();
    const curGridId = getCurrentGridId();
    const isMulti = !!(S.exhibition && S.exhibition.rooms && S.exhibition.rooms.length > 1);

    if (curRoomId && !active.roomId) {
      active.roomId = curRoomId;
      active.gridId = curGridId;
    }

    if (isMulti) {
      active.modules = (S.modules || []).filter(m => m.gridId === curGridId).map(m => ({ ...m }));
      active.panels = (S.panels || []).filter(p => p.gridId === curGridId).map(p => ({ ...p }));
      active.artworks = (S.artworks || []).filter(a => {
        if (a.gridId === curGridId) return true;
        if (a.moduleId) {
          const mod = S.modules.find(m => m.id === a.moduleId);
          return mod && mod.gridId === curGridId;
        }
        return false;
      }).map(a => ({ ...a }));
    } else {
      active.modules = (S.modules || []).map(m => ({ ...m }));
      active.panels = (S.panels || []).map(p => ({ ...p }));
      active.artworks = (S.artworks || []).map(a => ({ ...a }));
    }

    active.updated = Date.now();
  }

  /**
   * Pārslēdzas uz citu scenāriju (variantu)
   */
  function switchVariant(targetId, force = false) {
    ensureVariants();
    if (targetId === S.activeVariantId && !force) return;
    if (targetId !== S.activeVariantId) {
      saveCurrentToActiveVariant();
    }

    const target = S.variants.find(v => v.id === targetId);
    if (!target) return;

    const curRoomId = getCurrentRoomId();
    const curGridId = getCurrentGridId();
    const isMulti = !!(S.exhibition && S.exhibition.rooms && S.exhibition.rooms.length > 1);

    S.activeVariantId = target.id;
    if (!S.activeRoomVariants) S.activeRoomVariants = {};
    if (curRoomId) S.activeRoomVariants[curRoomId] = target.id;

    if (isMulti) {
      // Aizstājam tikai šīs zāles moduļus un paneļus
      const otherModules = (S.modules || []).filter(m => m.gridId !== curGridId);
      const newModules = (target.modules || []).map(m => ({ ...m, gridId: curGridId }));
      S.modules = [...otherModules, ...newModules];

      const otherPanels = (S.panels || []).filter(p => p.gridId !== curGridId);
      const newPanels = (target.panels || []).map(p => ({ ...p, gridId: curGridId }));
      S.panels = [...otherPanels, ...newPanels];

      const otherArt = (S.artworks || []).filter(a => {
        if (a.gridId === curGridId) return false;
        if (a.moduleId) {
          const mod = S.modules.find(m => m.id === a.moduleId);
          if (mod && mod.gridId === curGridId) return false;
        }
        return true;
      });
      const newArt = (target.artworks || []).map(a => ({ ...a, gridId: curGridId }));
      S.artworks = [...otherArt, ...newArt];
    } else {
      S.modules = (target.modules || []).map(m => ({ ...m }));
      S.artworks = (target.artworks || []).map(a => ({ ...a }));
      S.panels = (target.panels || []).map(p => ({ ...p }));
    }

    S.selectedModuleId = null;
    S.selectedArtworkId = null;

    // Sinhronizējam moduļu numerāciju
    if (EW.Modules && EW.Modules.Geometry) {
      const maxId = S.modules.reduce((max, m) => {
        const n = parseInt(String(m.id || '').replace('m_', ''), 10);
        return Number.isFinite(n) ? Math.max(max, n) : max;
      }, 0);
      EW.Modules.Geometry.setSeq(maxId);
    }

    if (EW.Modules && EW.Modules.Classifier) {
      EW.Modules.Classifier.updateClassification(S.modules);
    }
    if (EW.Artworks && EW.Artworks.renderUI) {
      EW.Artworks.renderUI();
    }
    if (EW.Renderer && EW.Renderer.draw) {
      EW.Renderer.draw();
    }
    if (window.EW_AppUpdateStability) {
      window.EW_AppUpdateStability();
    }
    if (EW.ThreeView && EW.ThreeView.isReady && EW.ThreeView.syncFromState) {
      EW.ThreeView.syncFromState();
    }

    renderUI();
    if (EW.UI && EW.UI.toast) EW.UI.toast(`Pārslēgts uz variantu “${target.name}”`);
  }

  /**
   * Izveido jaunu variantu
   * @param {string|null} name Varianta nosaukums
   * @param {boolean} cloneCurrent Vai nokopēt esošā varianta moduļus un darbus
   * @param {string|null} targetRoomId Konkrētā zāle (vai aktīvā pēc noklusējuma)
   */
  function createVariant(name = null, cloneCurrent = true, targetRoomId = null) {
    ensureVariants();
    saveCurrentToActiveVariant();

    const curRoomId = targetRoomId || getCurrentRoomId();
    const curGridId = getCurrentGridId();
    const roomVariants = getVariantsForRoom(curRoomId);

    const count = roomVariants.length + 1;
    const letter = String.fromCharCode(64 + Math.min(26, count)); // 'A', 'B', 'C'...
    const newName = name || `Variants ${letter}`;
    const newId = 'var_' + (curRoomId ? curRoomId + '_' : '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

    let mods = [];
    let arts = [];
    let pans = [];
    if (cloneCurrent) {
      const active = getActiveVariant();
      if (active) {
        mods = (active.modules || []).map(m => ({ ...m, gridId: curGridId }));
        arts = (active.artworks || []).map(a => ({ ...a, gridId: curGridId }));
        pans = (active.panels || []).map(p => ({ ...p, gridId: curGridId }));
      }
    }

    const newVar = {
      id: newId,
      roomId: curRoomId,
      gridId: curGridId,
      name: newName,
      modules: mods,
      artworks: arts,
      panels: pans,
      updated: Date.now(),
      isArchived: false
    };

    S.variants.push(newVar);
    switchVariant(newId);
    return newVar;
  }

  /**
   * Dublē aktīvo variantu
   */
  function duplicateActiveVariant() {
    const active = getActiveVariant();
    return createVariant(`${active.name} (kopija)`, true);
  }

  /**
   * Dublē konkrētu variantu pēc ID
   */
  function duplicateVariant(id) {
    ensureVariants();
    const v = S.variants.find(x => x.id === id);
    if (!v) return null;

    const newId = 'var_' + (v.roomId ? v.roomId + '_' : '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const newVar = {
      ...v,
      id: newId,
      name: `${v.name} (kopija)`,
      modules: (v.modules || []).map(m => ({ ...m })),
      artworks: (v.artworks || []).map(a => ({ ...a })),
      panels: (v.panels || []).map(p => ({ ...p })),
      updated: Date.now(),
      isArchived: false
    };

    S.variants.push(newVar);
    renderUI();
    return newVar;
  }

  /**
   * Pārdēvē variantu
   */
  function renameVariant(id, newName) {
    ensureVariants();
    const v = S.variants.find(x => x.id === id);
    if (!v) return;
    const clean = (newName || '').trim();
    if (clean) {
      v.name = clean;
      renderUI();
    }
  }

  /**
   * Dzēš variantu
   */
  function deleteVariant(id) {
    ensureVariants();
    const curRoomId = getCurrentRoomId();
    const roomVariants = getVariantsForRoom(curRoomId);

    if (roomVariants.length <= 1) {
      if (EW.UI && EW.UI.toast) EW.UI.toast('Nevar izdzēst vienīgo aktīvo zāles variantu');
      return;
    }
    const idx = S.variants.findIndex(v => v.id === id);
    if (idx === -1) return;

    if (id === S.activeVariantId) {
      const otherInRoom = roomVariants.filter(v => v.id !== id);
      const nextId = otherInRoom[0] ? otherInRoom[0].id : (S.variants[idx === 0 ? 1 : idx - 1].id);
      switchVariant(nextId);
    }
    const delIdx = S.variants.findIndex(v => v.id === id);
    if (delIdx >= 0) S.variants.splice(delIdx, 1);
    renderUI();
    if (EW.UI && EW.UI.toast) EW.UI.toast('Variants dzēsts');
  }

  /**
   * Arhivē vai atarhivē variantu
   */
  function toggleArchiveVariant(id) {
    ensureVariants();
    const v = S.variants.find(x => x.id === id);
    if (!v) return;

    v.isArchived = !v.isArchived;
    v.updated = Date.now();

    // Ja arhivējam aktīvo variantu, pārslēdzamies uz citu nearhivēto
    if (v.isArchived && id === S.activeVariantId) {
      const curRoomId = getCurrentRoomId();
      const available = getVariantsForRoom(curRoomId).filter(x => !x.isArchived && x.id !== id);
      if (available.length) {
        switchVariant(available[0].id);
      }
    }

    renderUI();
    if (EW.UI && EW.UI.toast) {
      EW.UI.toast(v.isArchived ? `Variants “${v.name}” arhivēts` : `Variants “${v.name}” atarhivēts`);
    }
  }

  /**
   * Zāles pārslēgšanas āķis — aktivizē zāles variantu
   */
  function activateRoomVariants(roomIdx) {
    ensureVariants();
    if (!S.exhibition || !S.exhibition.rooms || !S.exhibition.rooms[roomIdx]) return;
    const rm = S.exhibition.rooms[roomIdx];
    const roomVars = getVariantsForRoom(rm.id);

    if (!S.activeRoomVariants) S.activeRoomVariants = {};
    let targetId = S.activeRoomVariants[rm.id];
    if (!targetId || !roomVars.some(v => v.id === targetId)) {
      targetId = roomVars[0] ? roomVars[0].id : null;
    }

    if (!targetId) {
      // Izveidojam Variants A šai zālei
      const vA = {
        id: `var_${rm.id}_a`,
        roomId: rm.id,
        gridId: roomIdx + 1,
        name: 'Variants A',
        modules: (S.modules || []).filter(m => m.gridId === (roomIdx + 1)).map(m => ({ ...m })),
        artworks: (S.artworks || []).filter(a => a.gridId === (roomIdx + 1)).map(a => ({ ...a })),
        panels: (S.panels || []).filter(p => p.gridId === (roomIdx + 1)).map(p => ({ ...p })),
        updated: Date.now(),
        isArchived: false
      };
      S.variants.push(vA);
      targetId = vA.id;
    }

    S.activeVariantId = targetId;
    S.activeRoomVariants[rm.id] = targetId;
    renderUI();
  }

  /**
   * Renderē aktīvās zāles variantu cilnes augšējā joslā
   */
  function renderUI() {
    ensureVariants();
    const cont = document.getElementById('variantTabsContainer');
    if (!cont) return;

    const curRoomId = getCurrentRoomId();
    const curGridId = getCurrentGridId();
    const isMulti = !!(S.exhibition && S.exhibition.rooms && S.exhibition.rooms.length > 1);

    // Rādām tikai šīs zāles nearhivētos variantus
    const visibleVariants = getVariantsForRoom(curRoomId).filter(v => !v.isArchived);

    cont.innerHTML = visibleVariants.map(v => {
      const isActive = v.id === S.activeVariantId;
      let modCount = 0;
      let artCount = 0;

      if (v.id === S.activeVariantId) {
        modCount = isMulti
          ? (S.modules || []).filter(m => m.gridId === curGridId).length
          : (S.modules || []).length;
        artCount = isMulti
          ? (S.artworks || []).filter(a => a.gridId === curGridId).length
          : (S.artworks || []).length;
      } else {
        modCount = (v.modules || []).length;
        artCount = (v.artworks || []).length;
      }

      return `
        <div class="variant-tab ${isActive ? 'active' : ''}" data-varid="${v.id}" title="${U.esc(v.name)}: ${modCount} moduļi, ${artCount} darbi">
          <span class="vtab-name" data-varid="${v.id}">${U.esc(v.name)}</span>
          <span class="vtab-badge">${modCount}m · ${artCount}d</span>
          ${visibleVariants.length > 1 ? `<button class="vtab-close" data-varid="${v.id}" title="Dzēst šo variantu">×</button>` : ''}
        </div>
      `;
    }).join('');

    cont.querySelectorAll('.variant-tab').forEach(tab => {
      tab.onclick = (e) => {
        if (e.target.classList.contains('vtab-close')) return;
        switchVariant(tab.dataset.varid);
      };
    });

    cont.querySelectorAll('.vtab-name').forEach(el => {
      el.ondblclick = (e) => {
        e.stopPropagation();
        const varId = el.dataset.varid;
        const v = S.variants.find(x => x.id === varId);
        if (!v) return;
        const res = prompt('Ievadiet varianta nosaukumu:', v.name);
        if (res !== null && res.trim()) {
          renameVariant(varId, res.trim());
        }
      };
    });

    cont.querySelectorAll('.vtab-close').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const varId = btn.dataset.varid;
        const v = S.variants.find(x => x.id === varId);
        if (confirm(`Vai tiešām dzēst variantu “${v ? v.name : ''}”?`)) {
          deleteVariant(varId);
        }
      };
    });
  }

  EW.Variants = {
    ensureVariants,
    getCurrentRoomId,
    getCurrentGridId,
    getVariantsForRoom,
    getActiveVariant,
    saveCurrentToActiveVariant,
    switchVariant,
    createVariant,
    duplicateActiveVariant,
    duplicateVariant,
    renameVariant,
    deleteVariant,
    toggleArchiveVariant,
    activateRoomVariants,
    renderUI
  };
})();
