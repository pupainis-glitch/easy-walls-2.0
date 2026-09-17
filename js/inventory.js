/**
 * Easy walls 2.0 — Noliktavas inventāra un krājumu reāllaika kontroles modulis
 * 
 * Nodrošina:
 * 1. Muzeja ēku (Arsenāls, Birža, LNMM) reālo krājumu uzskaiti
 * 2. Izmantoto karkasu (2x1m, 1x1m), apdares paneļu un balasta atsvaru uzskaiti reāllaikā
 * 3. Brīdinājumu indikāciju, ja kurators projektā pārsniedz noliktavas fiziskos limitus
 * 4. Administratora iestatījumus krājumu robežu maiņai
 */
window.EW = window.EW || {};

(function() {
  const S = EW.State;
  const U = EW.Utils;

  const STOCK_STORAGE_KEY = 'ew:stock_limits';

  // Noklusētie muzeju noliktavu krājumu apjomi
  const DEFAULT_STOCK = {
    arsenals: {
      name: 'Arsenāls',
      frames_large: 45,
      frames_small: 15,
      panels_2000: 90,
      panels_1000: 30,
      ballast_weights: 24 // 24 × 25 kg = 600 kg
    },
    birza: {
      name: 'Rīgas Birža',
      frames_large: 30,
      frames_small: 10,
      panels_2000: 60,
      panels_1000: 20,
      ballast_weights: 16 // 16 × 25 kg = 400 kg
    },
    lnmm: {
      name: 'LNMM Galvenā ēka',
      frames_large: 25,
      frames_small: 8,
      panels_2000: 50,
      panels_1000: 16,
      ballast_weights: 12 // 12 × 25 kg = 300 kg
    }
  };

  let stockLimits = loadStockLimits();

  function loadStockLimits() {
    try {
      const saved = localStorage.getItem(STOCK_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return JSON.parse(JSON.stringify(DEFAULT_STOCK));
  }

  function saveStockLimits(newLimits) {
    stockLimits = newLimits;
    try {
      localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(stockLimits));
    } catch {}
    renderUI();
  }

  function getActiveVenueId() {
    if (S && S.activeVenueId && stockLimits[S.activeVenueId]) {
      return S.activeVenueId;
    }
    const name = (S && S.planName ? S.planName.toLowerCase() : '');
    if (name.includes('birž') || name.includes('birza')) return 'birza';
    if (name.includes('lnmm') || name.includes('galven')) return 'lnmm';
    return 'arsenals';
  }

  /**
   * Aprēķina noliktavas atlikuma un noslodzes statusu
   */
  function calculateStockStatus() {
    const venueId = getActiveVenueId();
    const limits = stockLimits[venueId] || stockLimits.arsenals;

    const modules = S ? (S.modules || []) : [];
    const panels = S ? (S.panels || []) : [];

    let largeUsed = 0;
    let smallUsed = 0;
    modules.forEach(m => {
      if (m.type === 'small') smallUsed++;
      else largeUsed++;
    });

    let p2000Used = 0;
    let p1000Used = 0;
    if (panels.length > 0) {
      panels.forEach(p => {
        if (p.code === 'P-2000') p2000Used++;
        else if (p.code === 'P-1000') p1000Used++;
      });
    } else {
      p2000Used = largeUsed * 2;
      p1000Used = smallUsed * 2;
    }

    let ballastKg = 0;
    if (EW.Stability && EW.Stability.calculateExhibitionStability) {
      const stab = EW.Stability.calculateExhibitionStability();
      ballastKg = stab.totalBallast || 0;
    }
    const ballastUnitsUsed = Math.ceil(ballastKg / 25);

    function calcCat(used, limit, unit = 'gab.') {
      const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
      const isOver = used > limit;
      const isWarn = pct >= 80 && !isOver;
      return {
        used,
        limit,
        pct,
        unit,
        isOver,
        isWarn,
        diff: limit - used
      };
    }

    const categories = {
      large: calcCat(largeUsed, limits.frames_large),
      small: calcCat(smallUsed, limits.frames_small),
      p2000: calcCat(p2000Used, limits.panels_2000),
      p1000: calcCat(p1000Used, limits.panels_1000),
      ballast: calcCat(ballastUnitsUsed, limits.ballast_weights)
    };

    let overallStatus = 'ok';
    const isAnyOver = Object.values(categories).some(c => c.isOver);
    const isAnyWarn = Object.values(categories).some(c => c.isWarn);

    if (isAnyOver) overallStatus = 'over';
    else if (isAnyWarn) overallStatus = 'warning';

    return {
      venueId,
      venueName: limits.name,
      categories,
      ballastKg,
      overallStatus
    };
  }

  /**
   * Renderē noliktavas atlikuma logrīku sānjoslā
   */
  function renderUI() {
    const cont = document.getElementById('stockWidgetContent');
    const badge = document.getElementById('stockStatusBadge');
    if (!cont) return;

    const data = calculateStockStatus();

    if (badge) {
      badge.className = `stab-badge ${data.overallStatus === 'ok' ? 'stable' : (data.overallStatus === 'warning' ? 'needs-ballast' : 'unstable')}`;
      badge.textContent = data.overallStatus === 'ok' ? '✓ Noliktavā pietiek'
        : (data.overallStatus === 'warning' ? '⚠️ Tuvojas limitam' : '🔴 Pārsniegts krājums!');
    }

    function rowHtml(label, cat, extra = '') {
      const color = cat.isOver ? 'var(--danger)' : (cat.isWarn ? 'var(--warn)' : 'var(--accent)');
      const barW = Math.min(100, cat.pct);

      return `
        <div style="margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px">
            <span style="color:var(--ink)">${label}</span>
            <span style="font-family:var(--mono);font-weight:600;color:${color}">
              ${cat.used} / ${cat.limit} ${cat.unit} ${cat.isOver ? `<b style="color:var(--danger)">(!+${Math.abs(cat.diff)})</b>` : ''}
            </span>
          </div>
          <div style="height:5px;background:var(--surface);border-radius:3px;overflow:hidden">
            <div style="width:${barW}%;height:100%;background:${color};border-radius:3px;transition:width 0.2s"></div>
          </div>
        </div>
      `;
    }

    cont.innerHTML = `
      <div style="font-size:11px;font-weight:700;color:var(--ink-dim);margin-bottom:6px;display:flex;justify-content:space-between">
        <span>🏛️ ${data.venueName}</span>
        <button id="btnEditStock" class="ghost admin-only" style="padding:1px 5px;font-size:10px" title="Rediģēt noliktavas krājumus">⚙️ Labot</button>
      </div>
      ${rowHtml('2×1m karkasi (M-LN/FS)', data.categories.large)}
      ${rowHtml('1×1m karkasi (M-UN)', data.categories.small)}
      ${rowHtml('P-2000 paneļi (2.0m)', data.categories.p2000)}
      ${rowHtml('P-1000 paneļi (1.0m)', data.categories.p1000)}
      ${rowHtml(`Balasts 25kg (${data.ballastKg} kg)`, data.categories.ballast)}
    `;

    const btnEdit = document.getElementById('btnEditStock');
    if (btnEdit) {
      btnEdit.onclick = () => openStockAdminModal(data.venueId);
    }
  }

  function openStockAdminModal(venueId) {
    const limits = stockLimits[venueId] || stockLimits.arsenals;
    const lLarge = prompt(`[${limits.name}] Pieejamais 2×1m karkasu skaits:`, limits.frames_large);
    if (lLarge === null) return;
    const lSmall = prompt(`[${limits.name}] Pieejamais 1×1m karkasu skaits:`, limits.frames_small);
    if (lSmall === null) return;
    const lP2000 = prompt(`[${limits.name}] Pieejamais P-2000 paneļu skaits:`, limits.panels_2000);
    if (lP2000 === null) return;
    const lP1000 = prompt(`[${limits.name}] Pieejamais P-1000 paneļu skaits:`, limits.panels_1000);
    if (lP1000 === null) return;
    const lBallast = prompt(`[${limits.name}] Pieejamais balasta atsvaru skaits (25kg):`, limits.ballast_weights);
    if (lBallast === null) return;

    limits.frames_large = parseInt(lLarge, 10) || limits.frames_large;
    limits.frames_small = parseInt(lSmall, 10) || limits.frames_small;
    limits.panels_2000 = parseInt(lP2000, 10) || limits.panels_2000;
    limits.panels_1000 = parseInt(lP1000, 10) || limits.panels_1000;
    limits.ballast_weights = parseInt(lBallast, 10) || limits.ballast_weights;

    saveStockLimits(stockLimits);
    if (EW.UI && EW.UI.toast) EW.UI.toast(`Noliktavas krājumi atjaunoti`);
  }

  EW.Inventory = {
    calculateStockStatus,
    renderUI,
    getStockLimits: () => stockLimits,
    saveStockLimits
  };
})();
