/**
 * Easy walls 2.0 — Bento Studio Cockpit Hero Overlay Modulis
 * powered by Motion.dev (Framer Motion dzinējs) & UI/UX Pro Max
 */
window.EW = window.EW || {};

(function() {
  const S = EW.State || {};
  let isOpen = false;

  // 4 LNMM šedevri ātrajam ieskatam
  const SHOWCASE_ARTWORKS = [
    {
      inv: 'ASN-001',
      title: 'Pavasara strauts',
      author: 'Vilhelms Purvītis',
      year: '1902',
      dims: '35 × 45 cm',
      img: 'catalog_images/ASN-001.png'
    },
    {
      inv: 'ASN-002',
      title: 'Ganu zēns rīta saulē',
      author: 'Janis Rozentāls',
      year: '1898',
      dims: '40 × 30 cm',
      img: 'catalog_images/ASN-002.png'
    },
    {
      inv: 'ASN-003',
      title: 'Bērza lapa saulē',
      author: 'Johans Valters',
      year: '1905',
      dims: '50 × 50 cm',
      img: 'catalog_images/ASN-003.png'
    },
    {
      inv: 'ASN-004',
      title: 'Dandy ar orhideju',
      author: 'Kārlis Padegs',
      year: '1931',
      dims: '35 × 50 cm',
      img: 'catalog_images/ASN-004.png'
    }
  ];

  // Galvenās zāļu veidnes
  const QUICK_VENUES = [
    {
      buildingId: 'arsenals',
      roomId: 'arsenals_floor1_main',
      buildingName: 'Arsenāls',
      roomName: '1. stāvs — Lielā zāle',
      dims: '42.0 × 18.5 m · Velves',
      step: '500 mm'
    },
    {
      buildingId: 'arsenals',
      roomId: 'arsenals_floor2',
      buildingName: 'Arsenāls',
      roomName: '2. stāvs — Izstāžu zāle',
      dims: '42.0 × 18.5 m · Kolonnas',
      step: '500 mm'
    },
    {
      buildingId: 'birza',
      roomId: 'birza_floor2_main',
      buildingName: 'Rīgas Birža',
      roomName: '2. stāvs — Lielā zāle',
      dims: '30.0 × 16.0 m · Renesanse',
      step: '500 mm'
    },
    {
      buildingId: 'arsenals',
      roomId: 'arsenals_basement',
      buildingName: 'Arsenāls',
      roomName: 'Pagrabstāvs — Velvju zāle',
      dims: '38.0 × 16.0 m · Kamerzāle',
      step: '500 mm'
    }
  ];

  const Bento = {
    init() {
      this.bindTriggers();
      this.populateQuickVenues();
      this.populateArtworks();
      this.updateMetrics();

      // Automātiski atveram startā tikai vienu reizi sesijā (ja nav atzīmēts 'skip')
      const hasSeen = sessionStorage.getItem('ew_bento_seen');
      if (!hasSeen) {
        setTimeout(() => {
          this.open();
          sessionStorage.setItem('ew_bento_seen', '1');
        }, 350);
      }
    },

    bindTriggers() {
      // Poga galvenajā rīkjoslā vai sānjoslā
      const btnSidebar = document.getElementById('btnBentoCockpit');
      if (btnSidebar) {
        btnSidebar.addEventListener('click', () => this.open());
      }

      const btnStage = document.getElementById('btnStageBento');
      if (btnStage) {
        btnStage.addEventListener('click', () => this.open());
      }

      // Aizvēršanas poga
      const btnClose = document.getElementById('btnBentoClose');
      if (btnClose) {
        btnClose.addEventListener('click', () => this.close());
      }

      // Fona klikšķis aizver
      const overlay = document.getElementById('bentoCockpit');
      if (overlay) {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) this.close();
        });
      }

      // Klaviatūras saīsnes (Esc aizver, 'B' atver, ja nav aktīvs ievades lauks)
      window.addEventListener('keydown', (e) => {
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
        if (e.key === 'Escape' && isOpen) {
          this.close();
        } else if ((e.key === 'b' || e.key === 'B') && !isInput && !e.ctrlKey && !e.metaKey && !isOpen) {
          this.open();
        }
      });

      // Galvenās darbību pogas Bento iekšienē
      const btnResume = document.getElementById('btnBentoResume');
      if (btnResume) {
        btnResume.addEventListener('click', () => {
          this.close();
        });
      }

      const btnNewExp = document.getElementById('btnBentoNewExp');
      if (btnNewExp) {
        btnNewExp.addEventListener('click', () => {
          this.close();
          const wizardBtn = document.getElementById('btnNewExpWizard');
          if (wizardBtn) wizardBtn.click();
        });
      }

      const btn3D = document.getElementById('btnBento3D');
      if (btn3D) {
        btn3D.addEventListener('click', () => {
          this.close();
          const view3DBtn = document.getElementById('btnView3D');
          if (view3DBtn) view3DBtn.click();
        });
      }

      const btnPrintCoords = document.getElementById('btnBentoPrintCoords');
      if (btnPrintCoords) {
        btnPrintCoords.addEventListener('click', () => {
          const btn = document.getElementById('btnPrintMountingCoords');
          if (btn) btn.click();
        });
      }

      const btnPrintLabels = document.getElementById('btnBentoPrintLabels');
      if (btnPrintLabels) {
        btnPrintLabels.addEventListener('click', () => {
          const btn = document.getElementById('btnPrintCaptions');
          if (btn) btn.click();
        });
      }

      const btnBrowseArt = document.getElementById('btnBentoBrowseArt');
      if (btnBrowseArt) {
        btnBrowseArt.addEventListener('click', () => {
          this.close();
          const btnArt = document.getElementById('btnOpenArtworkManager');
          if (btnArt) btnArt.click();
        });
      }
    },

    open() {
      const overlay = document.getElementById('bentoCockpit');
      if (!overlay) return;
      isOpen = true;
      this.updateMetrics();

      overlay.classList.add('active');

      // Motion.dev animācija virsslānim un kartītēm
      if (window.Motion && window.Motion.animate) {
        window.Motion.animate(overlay, { opacity: [0, 1] }, { duration: 0.25, easing: 'ease-out' });

        const cards = overlay.querySelectorAll('.bento-card');
        if (cards.length) {
          window.Motion.animate(
            cards,
            { opacity: [0, 1], y: [26, 0], scale: [0.96, 1] },
            {
              delay: window.Motion.stagger(0.06),
              duration: 0.45,
              easing: [0.16, 1, 0.3, 1]
            }
          );
        }
      }
    },

    close() {
      const overlay = document.getElementById('bentoCockpit');
      if (!overlay) return;
      isOpen = false;

      if (window.Motion && window.Motion.animate) {
        window.Motion.animate(overlay, { opacity: [1, 0] }, { duration: 0.2, easing: 'ease-in' }).finished.then(() => {
          overlay.classList.remove('active');
        });
      } else {
        overlay.classList.remove('active');
      }
    },

    updateMetrics() {
      const S = EW.State || {};
      const modulesCount = (S.modules && S.modules.length) || (S.panels && S.panels.length) || 0;
      const artworksCount = (S.artworks && S.artworks.length) || 0;
      const linearMeters = (modulesCount * 0.5).toFixed(1);
      const estHours = Math.ceil(modulesCount * 0.75);
      const estCost = Math.round(modulesCount * 38 + artworksCount * 12);

      // Aktualizējam ciparus domā
      const elMods = document.getElementById('bentoStatMods');
      if (elMods) elMods.textContent = modulesCount;

      const elMeters = document.getElementById('bentoStatMeters');
      if (elMeters) elMeters.textContent = linearMeters + ' m';

      const elArts = document.getElementById('bentoStatArts');
      if (elArts) elArts.textContent = artworksCount;

      const elEst = document.getElementById('bentoStatEst');
      if (elEst) elEst.textContent = `~${estHours}h · €${estCost}`;

      // Aktīvās zāles un ekspozīcijas dati
      let venueName = 'Izstāžu zāle «Arsenāls»';
      let roomName = '1. stāvs — Lielā zāle';
      let dimsStr = '42.0 × 18.5 m';

      if (S.room) {
        roomName = S.room.name || roomName;
        if (S.room.widthM && S.room.heightM) {
          dimsStr = `${S.room.widthM.toFixed(1)} × ${S.room.heightM.toFixed(1)} m`;
        }
      }

      if (S.building && S.building.name) {
        venueName = S.building.name;
      }

      const elVenueTag = document.getElementById('bentoHeroVenueTag');
      if (elVenueTag) elVenueTag.textContent = `🏛️ ${venueName}`;

      const elHeroTitle = document.getElementById('bentoHeroTitle');
      if (elHeroTitle) elHeroTitle.textContent = roomName;

      const elChipDims = document.getElementById('bentoChipDims');
      if (elChipDims) elChipDims.innerHTML = `📐 Izmēri: <b>${dimsStr}</b>`;

      const elChipMods = document.getElementById('bentoChipMods');
      if (elChipMods) elChipMods.innerHTML = `🧱 Moduļi: <b>${modulesCount} gab.</b>`;

      const elChipArts = document.getElementById('bentoChipArts');
      if (elChipArts) elChipArts.innerHTML = `🖼️ Eksponāti: <b>${artworksCount}</b>`;

      // Motion skaitītāja animācija
      if (window.Motion && window.Motion.animate) {
        const stats = document.querySelectorAll('.bento-stat-val');
        stats.forEach(el => {
          window.Motion.animate(el, { scale: [1.12, 1] }, { duration: 0.35, easing: 'ease-out' });
        });
      }
    },

    populateQuickVenues() {
      const container = document.getElementById('bentoVenuesList');
      if (!container) return;

      container.innerHTML = QUICK_VENUES.map(v => `
        <div class="bento-venue-item" data-building="${v.buildingId}" data-room="${v.roomId}">
          <div class="bento-venue-info">
            <span class="bento-venue-name">${v.buildingName} · ${v.roomName}</span>
            <span class="bento-venue-meta">${v.dims} · Solis: ${v.step}</span>
          </div>
          <button type="button" class="bento-venue-btn">Ielādēt ➔</button>
        </div>
      `).join('');

      container.querySelectorAll('.bento-venue-item').forEach(item => {
        item.addEventListener('click', () => {
          const bId = item.getAttribute('data-building');
          const rId = item.getAttribute('data-room');
          if (EW.Venues && typeof EW.Venues.loadBaseTemplate === 'function') {
            EW.Venues.loadBaseTemplate(bId, rId);
          }
          this.close();
        });
      });
    },

    populateArtworks() {
      const container = document.getElementById('bentoArtGrid');
      if (!container) return;

      container.innerHTML = SHOWCASE_ARTWORKS.map(art => `
        <div class="bento-art-item" title="${art.title} (${art.year}) — ${art.author}">
          <div class="bento-art-thumb">
            <img src="${art.img}" alt="${art.title}" loading="lazy" onerror="this.src='catalog_images/ASN-001.png'">
          </div>
          <div class="bento-art-caption">
            <span class="bento-art-title">${art.title}</span>
            <span class="bento-art-author">${art.author} (${art.year})</span>
            <span class="bento-art-dims">${art.dims}</span>
          </div>
        </div>
      `).join('');
    }
  };

  EW.Bento = Bento;

  // Inicializējam, kad DOM ir gatavs
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Bento.init());
  } else {
    Bento.init();
  }
})();
