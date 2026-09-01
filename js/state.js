/**
 * Easy walls 2.0 — Centralizētais aplikācijas stāvoklis (State)
 */
window.EW = window.EW || {};

(function() {
  let gridSeq = 0;

  function newGrid(name) {
    gridSeq++;
    return {
      id: gridSeq,
      name: name || `Režģis ${gridSeq}`,
      color: EW.Config.PALETTE[(gridSeq - 1) % EW.Config.PALETTE.length],
      angle: 0,
      dx: 0,
      dy: 0,
      step: 0.5,
      visible: true,
      locked: false
    };
  }

  const S = {
    // Fona plāns (PDF vai attēls)
    img: null,
    pdf: null,
    vp: null,
    page: 1,
    pages: 1,
    planName: '',
    R: 1,                // attēla px uz PDF punktu
    mppPt: null,         // metri uz PDF punktu
    denom: null,         // 1:denom rasējuma mērogs
    detected: null,      // atpazītās ķēdes dati
    chain: null,         // ķēdes punktu koordinātas vizualizācijai
    opacity: 1,

    // Kameras / kanvas skats
    view: { x: 0, y: 0, z: 60 },

    // Režģi
    grids: [newGrid('Režģis 1')],
    active: 0,

    // Interaktivitātes režīms: 'pan' | 'origin' | 'calib' | 'measure' | 'select'
    mode: 'pan',
    calibPts: [],
    cursor: null,

    // Saglabātās zonas
    recordId: null,
    index: [],

    // 2. slānis: Sienu moduļi (karkass)
    modules: [],
    selectedModuleId: null,
    dragState: null,
    showModules: true,

    // 3. slānis: Apdares paneļi
    panels: [],
    wallGroups: [],
    showPanels: true
  };

  // Aktīvais režģis
  const G = () => S.grids[S.active] || S.grids[0];

  // Metri uz attēla pikseli
  const mpp = () => (S.mppPt ? S.mppPt / S.R : 0.01);

  EW.State = S;
  EW.State.newGrid = newGrid;
  EW.State.getGridSeq = () => gridSeq;
  EW.State.setGridSeq = (v) => { gridSeq = Math.max(gridSeq, v); };
  EW.State.G = G;
  EW.State.mpp = mpp;
})();
