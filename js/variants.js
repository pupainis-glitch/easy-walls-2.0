/**
 * Easy walls 2.0 — Izstāžu variantu (Scenāriju A/B) pārvaldnieks
 * 
 * Ļauj vienas izstādes telpā uzturēt un salīdzināt vairākus izkārtojuma scenārijus:
 * - Variants A: atvērts telpas plānojums
 * - Variants B: kabinetu struktūra ar papildu starpsienām
 * 
 * Katram variantam ir savs neatkarīgs moduļu un piekārto mākslas darbu stāvoklis.
 */
window.EW = window.EW || {};

(function() {
  const S = EW.State;
  const U = EW.Utils;

  // Pārliecināmies, ka stāvoklī ir variantu saraksts
  function ensureVariants() {
    if (!S.variants || !S.variants.length) {
      S.variants = [
        {
          id: 'var_a',
          name: 'Variants A',
          modules: (S.modules || []).map(m => ({ ...m })),
          artworks: (S.artworks || []).map(a => ({ ...a })),
          panels: (S.panels || []).map(p => ({ ...p })),
          updated: Date.now()
        }
      ];
      S.activeVariantId = 'var_a';
    }
  }

  ensureVariants();

  function getActiveVariant() {
    ensureVariants();
    return S.variants.find(v => v.id === S.activeVariantId) || S.variants[0];
  }

  /**
   * Saglabā pašreizējo stāvokli (modules, artworks, panels) aktīvajā variantā
   */
  function saveCurrentToActiveVariant() {
    ensureVariants();
    const active = getActiveVariant();
    if (!active) return;
    active.modules = (S.modules || []).map(m => ({ ...m }));
    active.artworks = (S.artworks || []).map(a => ({ ...a }));
    active.panels = (S.panels || []).map(p => ({ ...p }));
    active.updated = Date.now();
  }

  /**
   * Pārslēdzas uz citu scenāriju (variantu)
   */
  function switchVariant(targetId) {
    ensureVariants();
    if (targetId === S.activeVariantId) return;
    saveCurrentToActiveVariant();

    const target = S.variants.find(v => v.id === targetId);
    if (!target) return;

    S.activeVariantId = target.id;
    S.modules = (target.modules || []).map(m => ({ ...m }));
    S.artworks = (target.artworks || []).map(a => ({ ...a }));
    S.panels = (target.panels || []).map(p => ({ ...p }));
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
   */
  function createVariant(name = null, cloneCurrent = true) {
    ensureVariants();
    saveCurrentToActiveVariant();

    const count = S.variants.length + 1;
    const letter = String.fromCharCode(64 + Math.min(26, count)); // 'A', 'B', 'C'...
    const newName = name || `Variants ${letter}`;
    const newId = 'var_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

    const newVar = {
      id: newId,
      name: newName,
      modules: cloneCurrent ? (S.modules || []).map(m => ({ ...m })) : [],
      artworks: cloneCurrent ? (S.artworks || []).map(a => ({ ...a })) : [],
      panels: cloneCurrent && S.panels ? S.panels.map(p => ({ ...p })) : [],
      updated: Date.now()
    };

    S.variants.push(newVar);
    switchVariant(newId);
  }

  /**
   * Dublē aktīvo variantu
   */
  function duplicateActiveVariant() {
    const active = getActiveVariant();
    createVariant(`${active.name} (kopija)`, true);
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
    if (S.variants.length <= 1) {
      if (EW.UI && EW.UI.toast) EW.UI.toast('Nevar izdzēst vienīgo variantu');
      return;
    }
    const idx = S.variants.findIndex(v => v.id === id);
    if (idx === -1) return;

    if (id === S.activeVariantId) {
      const nextId = S.variants[idx === 0 ? 1 : idx - 1].id;
      switchVariant(nextId);
    }
    const delIdx = S.variants.findIndex(v => v.id === id);
    if (delIdx >= 0) S.variants.splice(delIdx, 1);
    renderUI();
    if (EW.UI && EW.UI.toast) EW.UI.toast('Variants dzēsts');
  }

  /**
   * Renderē variantu cilnes
   */
  function renderUI() {
    ensureVariants();
    const cont = document.getElementById('variantTabsContainer');
    if (!cont) return;

    cont.innerHTML = S.variants.map(v => {
      const isActive = v.id === S.activeVariantId;
      const modCount = (v.id === S.activeVariantId ? (S.modules || []).length : (v.modules || []).length);
      const artCount = (v.id === S.activeVariantId ? (S.artworks || []).length : (v.artworks || []).length);

      return `
        <div class="variant-tab ${isActive ? 'active' : ''}" data-varid="${v.id}" title="${U.esc(v.name)}: ${modCount} moduļi, ${artCount} darbi">
          <span class="vtab-name" data-varid="${v.id}">${U.esc(v.name)}</span>
          <span class="vtab-badge">${modCount}m · ${artCount}d</span>
          ${S.variants.length > 1 ? `<button class="vtab-close" data-varid="${v.id}" title="Dzēst šo variantu">×</button>` : ''}
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
    getActiveVariant,
    saveCurrentToActiveVariant,
    switchVariant,
    createVariant,
    duplicateActiveVariant,
    renameVariant,
    deleteVariant,
    renderUI
  };
})();
