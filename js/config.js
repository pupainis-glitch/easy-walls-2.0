/**
 * Easy walls 2.0 — Konfigurācija un universālās palīgfunkcijas
 */
window.EW = window.EW || {};

EW.Config = {
  PT2M: 0.0254 / 72,
  PALETTE: [
    '#e0489b', '#5ad1c8', '#e8b04b', '#7b8ff5',
    '#8fd14f', '#f2724c', '#c58af9', '#4fc3e8'
  ],
  SCHEMA: 'easywalls.workzone/1',
  GRID_INDEX_KEY: 'ew:index',
  
  // Standarta rasējumu mērogi izmēru ķēdes piesaistei
  STANDARD_SCALES: [10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 500, 1000],

  // Moduļu specifikācijas dati no LNMM-M2-1020
  MODULE_WEIGHTS: {
    'M-LN':   { name: 'Typical module 2x1m (Line)', weight: 201.97 },
    'M-IN':   { name: 'Typical module 2x1m (Intersection)', weight: 207.11 },
    'M-FS':   { name: 'Typical module 2x1m (Free standing)', weight: 196.83 },
    'M-LL':   { name: 'Typical module 2x1m (L type — L)', weight: 201.95 },
    'M-LR':   { name: 'Typical module 2x1m (L type — R)', weight: 201.95 },
    'M-EL':   { name: 'Typical module 2x1m (End of line)', weight: 199.40 },
    'M-TC':   { name: 'Typical module 2x1m (T-connection)', weight: 204.54 },
    'M-ZR':   { name: 'Typical module 2x1m (Z-type R)', weight: 201.98 },
    'M-ZL':   { name: 'Typical module 2x1m (Z-type L)', weight: 202.85 },
    'M-UN-L': { name: '1x1m universal module', weight: 145.53 },
    'M-UN-R': { name: '1x1m universal module', weight: 148.56 }
  }
};

EW.Utils = {
  // Skaitļu formāts: pieņem gan komatu, gan punktu
  num(v) {
    const s = String(v).replace(/\s/g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  },

  dec(n, d) {
    return (Math.round(n * 10**d) / 10**d).toFixed(d).replace('.', ',');
  },

  fmt(n) {
    return (Math.round(n * 1000) / 1000).toString().replace('.', ',');
  },

  esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
    }[c]));
  },

  kb(n) {
    return n > 1024 * 1024
      ? (n / 1024 / 1024).toFixed(1) + ' MB'
      : Math.round(n / 1024) + ' kB';
  },

  getCSS(prop) {
    return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
  },

  hexA(h, a) {
    const n = parseInt(h.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
};
