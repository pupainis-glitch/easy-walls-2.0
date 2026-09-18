/**
 * Easy walls 2.0 — Ēku un telpu veidņu pārvaldības modulis (Venues & Templates)
 * 
 * Nodrošina:
 * 1. Trīs galveno muzeja ēku katalogu (Arsenāls, Birža, LNMM) + jaunu ēku pievienošanu
 * 2. Gatavas telpu bāzes veidnes ar iebūvētiem 500mm režģiem, mērogu un perimetra atkāpēm
 * 3. Administratora veidņu pārvaldnieku (izveidot, rediģēt, dublēt, dzēst, importēt/eksportēt JSON)
 * 4. Jaunas ekspozīcijas izveides vedni (multi-room atlase ar tūlītēju jauno veidņu integrāciju)
 */
window.EW = window.EW || {};

(function() {
  const S = EW.State;
  const C = EW.Config;
  const Store = EW.Store;

  // Trīs galvenās LNMM ēkas (iebūvētās bāzes veidnes)
  const BUILDINGS = [
    {
      id: 'arsenals',
      name: 'Izstāžu zāle «Arsenāls»',
      shortName: 'Arsenāls',
      address: 'Torņa iela 1, Rīga',
      icon: '🏛️',
      isCustom: false,
      rooms: [
        {
          id: 'arsenals_floor1_main',
          name: '1. stāvs — Lielā zāle',
          defaultScale: 100,
          gridName: 'Arsenāls: 1. stāvs Lielā zāle',
          widthM: 42.0,
          heightM: 18.5,
          angle: 0,
          step: 0.5,
          dx: 21.0,
          dy: 9.25,
          marginM: 1.0,
          region: { minWx: 1.0, maxWx: 41.0, minWy: 1.0, maxWy: 17.5 },
          pdfFile: 'Arsenāls plāni/ARi-3-E 1. Stāva plāns.pdf',
          description: 'Vēsturiskā velvēta telpa ar granīta kolonnām. 500 mm bāzes solis.',
          isCustom: false
        },
        {
          id: 'arsenals_floor1_vestibule',
          name: '1. stāvs — Mazā zāle / Vestibils',
          defaultScale: 100,
          gridName: 'Arsenāls: 1. stāvs Vestibils',
          widthM: 16.0,
          heightM: 14.0,
          angle: 0,
          step: 0.5,
          marginM: 1.0,
          pdfFile: 'Arsenāls plāni/ARi-3-E 1. Stāva plāns.pdf',
          description: 'Ieejas zonas ekspozīciju telpa.',
          isCustom: false
        },
        {
          id: 'arsenals_floor2',
          name: '2. stāvs — Izstāžu zāle',
          defaultScale: 100,
          gridName: 'Arsenāls: 2. stāva zāle',
          widthM: 42.0,
          heightM: 18.5,
          angle: 0,
          step: 0.5,
          marginM: 1.0,
          pdfFile: 'Arsenāls plāni/AR-2 2.stāva plāns.pdf',
          description: 'Augsto griestu zāle lielformāta instalācijām un glezniecībai.',
          isCustom: false
        },
        {
          id: 'arsenals_basement',
          name: 'Pagrabstāvs — Velvju zāle',
          defaultScale: 100,
          gridName: 'Arsenāls: Pagrabstāva zāle',
          widthM: 38.0,
          heightM: 16.0,
          angle: 0,
          step: 0.5,
          marginM: 1.0,
          pdfFile: 'Arsenāls plāni/ARi-2-E Pagrabstāva plāns_.pdf',
          description: 'Kamerzāle vēsturiskajā pagraba daļā.',
          isCustom: false
        }
      ]
    },
    {
      id: 'birza',
      name: 'Mākslas muzejs «RĪGAS BIRŽA»',
      shortName: 'Rīgas Birža',
      address: 'Doma laukums 6, Rīga',
      icon: '🏛️',
      isCustom: false,
      rooms: [
        {
          id: 'birza_floor2_main',
          name: '2. stāvs — Lielā izstāžu zāle',
          defaultScale: 142,
          mppPt: 0.05,
          gridName: 'Birža: 2. stāvs Lielā zāle',
          widthM: 16.0,
          heightM: 22.2,
          angle: 0,
          step: 0.5,
          dx: 8.0,
          dy: 11.1,
          marginM: 1.0,
          region: { minWx: 1.0, maxWx: 15.0, minWy: 1.0, maxWy: 21.2 },
          pdfFile: 'Rīgas Birža plāni/MMRB_2_stavs_liela_izstazu_zale.pdf',
          pdfPage: 1,
          description: 'Galvenā reprezentatīvā izstāžu telpa (vēsturiskā Biržas sēžu zāle ar kolonnām). Platība ~355 m², bāzes solis 500 mm.',
          isCustom: false
        },
        {
          id: 'birza_floor2_bosse',
          name: '2. stāvs — Boses zāle (Mazā zāle)',
          defaultScale: 142,
          mppPt: 0.05,
          gridName: 'Birža: 2. stāvs Boses zāle',
          widthM: 8.0,
          heightM: 6.0,
          angle: 0,
          step: 0.5,
          dx: 4.0,
          dy: 3.0,
          marginM: 0.8,
          region: { minWx: 0.8, maxWx: 7.2, minWy: 0.8, maxWy: 5.2 },
          pdfFile: 'Rīgas Birža plāni/MMRB_2_stavs_liela_izstazu_zale.pdf',
          pdfPage: 1,
          description: 'Kamerzāle mazāka formāta mākslas darbiem un grafikai. Platība ~48 m².',
          isCustom: false
        },
        {
          id: 'birza_floor1_atrijs',
          name: '1. stāvs — Centrālais Ātrijs',
          defaultScale: 142,
          mppPt: 0.05,
          gridName: 'Birža: 1. stāvs Ātrijs',
          widthM: 17.0,
          heightM: 8.0,
          angle: 0,
          step: 0.5,
          dx: 8.5,
          dy: 4.0,
          marginM: 1.0,
          region: { minWx: 1.0, maxWx: 16.0, minWy: 1.0, maxWy: 7.0 },
          pdfFile: 'Rīgas Birža plāni/MMRB_1_stavs_atrijs_un_kases.pdf',
          pdfPage: 1,
          description: 'Stiklotais centrālais pagalms/ātrijs lielformāta instalācijām un skulptūrām. Platība ~136–176 m².',
          isCustom: false
        },
        {
          id: 'birza_floor1_art_nouveau',
          name: '1. stāvs — Jūgendstila salons',
          defaultScale: 142,
          mppPt: 0.05,
          gridName: 'Birža: 1. stāvs Jūgendstila salons',
          widthM: 7.0,
          heightM: 11.0,
          angle: 0,
          step: 0.5,
          dx: 3.5,
          dy: 5.5,
          marginM: 0.8,
          region: { minWx: 0.8, maxWx: 6.2, minWy: 0.8, maxWy: 10.2 },
          pdfFile: 'Rīgas Birža plāni/MMRB_1_stavs_atrijs_un_kases.pdf',
          pdfPage: 1,
          description: 'Ieejas zonas salons un izstāžu telpa. Platība ~77 m².',
          isCustom: false
        },
        {
          id: 'birza_floor3_europe',
          name: '3. stāvs — Eiropas mākslas galerija & Vēsture',
          defaultScale: 142,
          mppPt: 0.05,
          gridName: 'Birža: 3. stāvs Eiropas galerija',
          widthM: 8.0,
          heightM: 19.5,
          angle: 0,
          step: 0.5,
          dx: 4.0,
          dy: 9.75,
          marginM: 1.0,
          region: { minWx: 1.0, maxWx: 7.0, minWy: 1.0, maxWy: 18.5 },
          pdfFile: 'Rīgas Birža plāni/MMRB_3_stavs_rigas_birzas_vesture_un_eiropas_maksla.pdf',
          pdfPage: 1,
          description: 'Klasiskās Eiropas mākslas galerijas anfilāde ap ātriju. Platība ~156 m².',
          isCustom: false
        },
        {
          id: 'birza_floor4_asia',
          name: '4. stāvs — Āzijas mākslas galerija',
          defaultScale: 142,
          mppPt: 0.05,
          gridName: 'Birža: 4. stāvs Āzijas galerija',
          widthM: 8.0,
          heightM: 19.4,
          angle: 0,
          step: 0.5,
          dx: 4.0,
          dy: 9.7,
          marginM: 1.0,
          region: { minWx: 1.0, maxWx: 7.0, minWy: 1.0, maxWy: 18.4 },
          pdfFile: 'Rīgas Birža plāni/MMRB_4_stavs_azijas_maksla_un_sudraba_kabinets.pdf',
          pdfPage: 1,
          description: 'Austrumu un Āzijas mākslas kolekciju izstāžu telpa. Platība ~155 m².',
          isCustom: false
        },
        {
          id: 'birza_floor4_silver',
          name: '4. stāvs — Sudraba & Antīkās mākslas kabinets',
          defaultScale: 142,
          mppPt: 0.05,
          gridName: 'Birža: 4. stāvs Sudraba kabinets',
          widthM: 19.0,
          heightM: 5.5,
          angle: 0,
          step: 0.5,
          dx: 9.5,
          dy: 2.75,
          marginM: 0.8,
          region: { minWx: 0.8, maxWx: 18.2, minWy: 0.8, maxWy: 4.7 },
          pdfFile: 'Rīgas Birža plāni/MMRB_4_stavs_azijas_maksla_un_sudraba_kabinets.pdf',
          pdfPage: 1,
          description: 'Fasādes anfilādes kabineti dārgmetālu un antīkās mākslas kolekcijām. Platība ~105 m².',
          isCustom: false
        },
        {
          id: 'birza_floor5_conference',
          name: '5. stāvs — Mansarda zāle',
          defaultScale: 142,
          mppPt: 0.05,
          gridName: 'Birža: 5. stāvs Mansarda zāle',
          widthM: 16.0,
          heightM: 22.5,
          angle: 0,
          step: 0.5,
          dx: 8.0,
          dy: 11.25,
          marginM: 1.0,
          region: { minWx: 1.0, maxWx: 15.0, minWy: 1.0, maxWy: 21.5 },
          pdfFile: 'Rīgas Birža plāni/MMRB_5_stavs_mansards_konferencu_telpas.pdf',
          pdfPage: 1,
          description: 'Augšējā stāva atvērtā telpa konferencēm, semināriem un izstādēm. Platība ~360 m².',
          isCustom: false
        },
        {
          id: 'birza_floor0_basement',
          name: 'Pagrabstāvs — Šāra & Kavīcela velves',
          defaultScale: 142,
          mppPt: 0.05,
          gridName: 'Birža: Pagrabstāva velves',
          widthM: 16.0,
          heightM: 14.0,
          angle: 0,
          step: 0.5,
          dx: 8.0,
          dy: 7.0,
          marginM: 1.0,
          region: { minWx: 1.0, maxWx: 15.0, minWy: 1.0, maxWy: 13.0 },
          pdfFile: 'Rīgas Birža plāni/MMRB_0_stavs_pagrabs.pdf',
          pdfPage: 1,
          description: 'Vēsturiskās pagraba velves un papildtelpas. Platība ~224 m².',
          isCustom: false
        }
      ]
    },
    {
      id: 'lnmm',
      name: 'Latvijas Nacionālais mākslas muzejs',
      shortName: 'LNMM Galvenā ēka',
      address: 'Jaņa Rozentāla laukums 1, Rīga',
      icon: '🏛️',
      isCustom: false,
      rooms: [
        {
          id: 'lnmm_underground',
          name: '-1. stāvs — Lielā izstāžu zāle',
          defaultScale: 100,
          gridName: 'LNMM: Pazemes Lielā zāle',
          widthM: 36.0,
          heightM: 16.0,
          angle: 0,
          step: 0.5,
          marginM: 1.0,
          description: 'Pazemes jaunbūves lielā zāle vērienīgām retrospekcijām.',
          isCustom: false
        },
        {
          id: 'lnmm_white_hall',
          name: '3. stāvs — Baltā zāle',
          defaultScale: 100,
          gridName: 'LNMM: Baltā zāle',
          widthM: 22.0,
          heightM: 12.0,
          angle: 0,
          step: 0.5,
          marginM: 1.0,
          description: 'Vēsturiskā korpusa centrālā izstāžu telpa.',
          isCustom: false
        },
        {
          id: 'lnmm_cupola',
          name: '4. stāvs — Kupola zāle',
          defaultScale: 100,
          gridName: 'LNMM: Kupola zāle',
          widthM: 24.0,
          heightM: 14.0,
          angle: 0,
          step: 0.5,
          marginM: 1.0,
          description: 'Bēniņu stāva zāle zem vēsturiskā kupola koka konstrukcijām.',
          isCustom: false
        }
      ]
    }
  ];

  // Noklusēto veidņu momentuzņēmums (izmantojams veidņu atjaunošanai)
  const DEFAULT_BUILDINGS_SNAPSHOT = JSON.stringify(BUILDINGS);

  // Administratora režīma stāvoklis un UI stāvoklis
  let isAdminMode = false;
  let selectedAdminBuildingTab = 'all';
  let currentEditingRoomId = null;
  let currentEditingBuildingId = null;

  async function init() {
    await loadCustomBuildings();
    await loadCustomTemplates();
    initTemplateAdminEvents();
    initAdminSidebarEvents();
  }

  function getBuildings() {
    return BUILDINGS;
  }

  function getBuilding(id) {
    return BUILDINGS.find(b => b.id === id) || BUILDINGS[0];
  }

  function getRoom(buildingId, roomId) {
    const b = getBuilding(buildingId);
    return (b.rooms || []).find(r => r.id === roomId) || null;
  }

  function isAdmin() {
    return isAdminMode;
  }

  function setAdmin(val) {
    isAdminMode = !!val;
    updateAdminUI();
  }

  function toggleAdmin() {
    setAdmin(!isAdminMode);
    return isAdminMode;
  }

  function updateAdminUI() {
    document.body.classList.toggle('is-admin', isAdminMode);
    const badge = document.getElementById('adminBadge');
    if (badge) {
      badge.style.display = isAdminMode ? 'inline-flex' : 'none';
    }
    const curatorBtn = document.getElementById('btnRoleCurator');
    const adminBtn = document.getElementById('btnRoleAdmin');
    if (curatorBtn) curatorBtn.classList.toggle('active', !isAdminMode);
    if (adminBtn) adminBtn.classList.toggle('active', isAdminMode);

    const adminTools = document.querySelectorAll('.admin-only');
    adminTools.forEach(el => {
      el.style.display = isAdminMode ? '' : 'none';
    });

    if (isAdminMode) {
      const emptyDash = document.getElementById('emptyStageDashboard');
      if (emptyDash) emptyDash.style.display = 'none';
      renderAdminSidebar();
    } else {
      // Kuratora režīmā darba laukam jābūt pilnīgi tukšam, ja nav atvērta konkrēta kuratora ekspozīcija
      if (!S.exhibition && !S.recordId) {
        S.img = null;
        S.pdf = null;
        S.vp = null;
        S.chain = null;
        S.detected = null;
        S.planName = '';
        S.mppPt = null;
        S.denom = null;
        S.modules = [];
        S.panels = [];
        S.artworks = [];
        S.selectedModuleId = null;
        S.selectedArtworkId = null;
        S.grids = [EW.State.newGrid('Režģis 1')];
        S.active = 0;
      }

      if (EW.UI && typeof EW.UI.updateEmptyDashboard === 'function') {
        EW.UI.updateEmptyDashboard();
      }
      if (EW.UI && typeof EW.UI.renderSavedExhibitions === 'function') {
        EW.UI.renderSavedExhibitions();
      }
      if (EW.UI && typeof EW.UI.syncInputs === 'function') {
        EW.UI.syncInputs();
        EW.UI.renderChips();
      }
      if (EW.Renderer && typeof EW.Renderer.draw === 'function') {
        EW.Renderer.draw();
      }
    }

    if (EW.UI && typeof EW.UI.toast === 'function') {
      EW.UI.toast(isAdminMode ? 'Administratora telpu veidņu režīms IESLĒGTS' : 'Kuratora režīms IESLĒGTS');
    }
  }

  /**
   * Pielāgoto ēku ielāde no Store
   */
  async function loadCustomBuildings() {
    try {
      if (!Store || !Store.driver) return;
      const customBlds = await Store.driver.get('ew:custom_buildings');
      if (customBlds && Array.isArray(customBlds)) {
        customBlds.forEach(b => {
          if (!BUILDINGS.some(x => x.id === b.id)) {
            BUILDINGS.push({
              id: b.id,
              name: b.name,
              shortName: b.shortName || b.name,
              address: b.address || '',
              icon: b.icon || '🏛️',
              isCustom: true,
              rooms: b.rooms || []
            });
          }
        });
      }
    } catch (e) {
      console.warn('Neizdevās ielādēt pielāgotās ēkas:', e);
    }
  }

  /**
   * Pielāgoto ēku saglabāšana Store
   */
  async function saveCustomBuildingsToStore() {
    try {
      if (!Store || !Store.driver) return;
      const customBlds = BUILDINGS.filter(b => b.isCustom).map(b => ({
        id: b.id,
        name: b.name,
        shortName: b.shortName,
        address: b.address,
        icon: b.icon,
        isCustom: true
      }));
      await Store.driver.set('ew:custom_buildings', customBlds);
    } catch (e) {
      console.warn('Neizdevās saglabāt pielāgotās ēkas:', e);
    }
  }

  /**
   * Pielāgoto veidņu ielāde no Store
   */
  async function loadCustomTemplates() {
    try {
      if (!Store || !Store.driver) return;

      // 1. Filtrējam ārā iebūvētās telpas, ko lietotājs izdzēsis
      let deletedIds = [];
      try {
        deletedIds = (await Store.driver.get('ew:deleted_room_ids')) || [];
        if (!Array.isArray(deletedIds)) deletedIds = [];
      } catch (_) {}

      if (deletedIds.length > 0) {
        BUILDINGS.forEach(b => {
          if (b.rooms) {
            b.rooms = b.rooms.filter(r => !deletedIds.includes(r.id));
          }
        });
      }

      // 2. Ielādējam pielāgotās veidnes no Store
      const custom = await Store.driver.get('ew:custom_room_templates');
      if (custom && Array.isArray(custom)) {
        custom.forEach(item => {
          if (deletedIds.includes(item.id)) return;
          const b = BUILDINGS.find(x => x.id === item.buildingId);
          if (b) {
            const existingIdx = b.rooms.findIndex(r => r.id === item.id);
            if (existingIdx >= 0) {
              b.rooms[existingIdx] = { ...b.rooms[existingIdx], ...item, isCustom: item.isCustom !== undefined ? item.isCustom : true };
            } else {
              b.rooms.push({ ...item, isCustom: true });
            }
          }
        });
      }
    } catch (e) {
      console.warn('Neizdevās ielādēt pielāgotās veidnes:', e);
    }
  }

  /**
   * Pielāgoto veidņu saglabāšana Store
   */
  async function saveCustomTemplatesToStore() {
    try {
      if (!Store || !Store.driver) return;
      const customList = [];
      BUILDINGS.forEach(b => {
        (b.rooms || []).forEach(r => {
          if (r.isCustom) {
            customList.push({
              buildingId: b.id,
              ...r
            });
          }
        });
      });
      await Store.driver.set('ew:custom_room_templates', customList);
    } catch (e) {
      console.warn('Neizdevās saglabāt pielāgotās veidnes:', e);
    }
  }

  /**
   * Telpas veidnes saglabāšana (izveide vai rediģēšana)
   */
  async function saveRoomTemplate(data) {
    if (!data.name || !data.name.trim()) throw new Error('Telpas nosaukums ir obligāts');
    if (!data.widthM || data.widthM <= 0) throw new Error('Platumam jābūt lielākam par 0');
    if (!data.heightM || data.heightM <= 0) throw new Error('Garumam jābūt lielākam par 0');

    let targetBuildingId = data.buildingId;
    if (targetBuildingId === '__new__' || !BUILDINGS.some(b => b.id === targetBuildingId)) {
      const bName = (data.buildingName && data.buildingName.trim()) || 'Pielāgota ēka';
      const newBId = 'custom_bld_' + Date.now();
      const newBld = {
        id: newBId,
        name: bName,
        shortName: bName,
        address: 'Pielāgota lokācija',
        icon: '🏛️',
        isCustom: true,
        rooms: []
      };
      BUILDINGS.push(newBld);
      await saveCustomBuildingsToStore();
      targetBuildingId = newBId;
    }

    const b = getBuilding(targetBuildingId);
    if (!b) throw new Error('Ēka nav atrasta');

    let roomId = data.id;
    let roomObj;

    if (roomId) {
      // Meklējam esošo istabu
      const existingIdx = b.rooms.findIndex(r => r.id === roomId);
      if (existingIdx >= 0) {
        roomObj = b.rooms[existingIdx];
        roomObj.name = data.name.trim();
        roomObj.widthM = Number(data.widthM);
        roomObj.heightM = Number(data.heightM);
        roomObj.step = Number(data.step) || 0.5;
        roomObj.angle = Number(data.angle) || 0;
        if (data.dx !== undefined) roomObj.dx = Number(data.dx);
        if (data.dy !== undefined) roomObj.dy = Number(data.dy);
        if (data.region !== undefined) roomObj.region = data.region ? { ...data.region } : null;
        roomObj.defaultScale = Number(data.defaultScale) || 100;
        if (data.mppPt !== undefined && data.mppPt !== null) roomObj.mppPt = Number(data.mppPt);
        roomObj.marginM = Number(data.marginM) !== undefined ? Number(data.marginM) : 1.0;
        roomObj.pdfFile = (data.pdfFile && data.pdfFile.trim()) || null;
        roomObj.description = (data.description && data.description.trim()) || '';
        roomObj.isCustom = true; // Pārveidojam/iezīmējam kā pielāgotu, lai saglabātos Store
      } else {
        roomId = null; // Nav atrasta šajā ēkā, izveidosim jaunu
      }
    }

    if (!roomId) {
      roomId = 'custom_rm_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      roomObj = {
        id: roomId,
        name: data.name.trim(),
        widthM: Number(data.widthM),
        heightM: Number(data.heightM),
        step: Number(data.step) || 0.5,
        angle: Number(data.angle) || 0,
        dx: data.dx !== undefined ? Number(data.dx) : (Number(data.widthM) / 2),
        dy: data.dy !== undefined ? Number(data.dy) : (Number(data.heightM) / 2),
        region: data.region ? { ...data.region } : null,
        defaultScale: Number(data.defaultScale) || 100,
        mppPt: (data.mppPt !== undefined && data.mppPt !== null) ? Number(data.mppPt) : null,
        marginM: Number(data.marginM) !== undefined ? Number(data.marginM) : 1.0,
        pdfFile: (data.pdfFile && data.pdfFile.trim()) || null,
        description: (data.description && data.description.trim()) || '',
        isCustom: true
      };
      b.rooms.push(roomObj);
    }

    await saveCustomTemplatesToStore();
    return { buildingId: targetBuildingId, roomId: roomObj.id, room: roomObj };
  }

  /**
   * Telpas veidnes dublēšana
   */
  async function duplicateRoomTemplate(buildingId, roomId) {
    const b = getBuilding(buildingId);
    if (!b) throw new Error('Ēka nav atrasta');
    const rm = (b.rooms || []).find(r => r.id === roomId);
    if (!rm) throw new Error('Veidne nav atrasta');

    const newId = 'custom_rm_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const clone = {
      ...JSON.parse(JSON.stringify(rm)),
      id: newId,
      name: `${rm.name} (Kopija)`,
      isCustom: true
    };
    b.rooms.push(clone);
    await saveCustomTemplatesToStore();
    return clone;
  }

  /**
   * Telpas veidnes dzēšana no atmiņas un Store
   */
  async function deleteRoomTemplate(buildingId, roomId) {
    const b = getBuilding(buildingId);
    if (!b) throw new Error('Ēka nav atrasta');
    const rm = (b.rooms || []).find(r => r.id === roomId);
    if (!rm) throw new Error('Veidne nav atrasta');

    // Dzēšam no ēkas telpu saraksta
    b.rooms = b.rooms.filter(r => r.id !== roomId);

    // Saglabājam dzēsto veidņu reģistrā, lai pēc lapas pārlādes tā vairs neparādītos
    try {
      if (Store && Store.driver) {
        let deletedIds = (await Store.driver.get('ew:deleted_room_ids')) || [];
        if (!Array.isArray(deletedIds)) deletedIds = [];
        if (!deletedIds.includes(roomId)) {
          deletedIds.push(roomId);
          await Store.driver.set('ew:deleted_room_ids', deletedIds);
        }
      }
    } catch (err) {
      console.warn('Neizdevās saglabāt dzēsto veidņu sarakstu:', err);
    }

    // Pārsaglabājam pielāgotās veidnes
    await saveCustomTemplatesToStore();
    return true;
  }

  /**
   * Telpas veidnes dzēšana ar dialogu un tūlītēju UI atsvaidzināšanu
   */
  async function deleteRoomTemplateConfirm(buildingId, roomId) {
    const b = getBuilding(buildingId);
    if (!b) return false;
    const rm = (b.rooms || []).find(r => r.id === roomId);
    if (!rm) return false;

    const isBuiltIn = !rm.isCustom;
    const promptMsg = isBuiltIn
      ? `Vai tiešām vēlaties dzēst veidni “${rm.name}”?\n\n(Tā ir standarta veidne. Vajadzības gadījumā to vēlāk var atjaunot ar pogu "🔄 Atjaunot".)`
      : `Vai tiešām vēlaties dzēst pielāgoto veidni “${rm.name}”?`;

    if (!confirm(promptMsg)) {
      return false;
    }

    try {
      await deleteRoomTemplate(buildingId, roomId);

      if (currentEditingRoomId === roomId) {
        resetTemplateEditor();
        currentEditingRoomId = null;
      }

      renderAdminTemplatesList();
      renderAdminBuildingTabs();
      renderAdminSidebar();

      if (window.renderBuildingGrid) window.renderBuildingGrid();
      if (window.renderRoomList) window.renderRoomList();

      if (EW.UI && typeof EW.UI.toast === 'function') {
        EW.UI.toast(`Veidne “${rm.name}” veiksmīgi izdzēsta!`);
      }
      return true;
    } catch (err) {
      if (EW.UI && typeof EW.UI.toast === 'function') {
        EW.UI.toast('Kļūda dzēšot veidni: ' + err.message);
      }
      return false;
    }
  }

  /**
   * Atjauno noklusētās telpu veidnes
   */
  async function restoreDefaultTemplates() {
    if (!confirm('Vai vēlaties atjaunot visas standarta muzeja telpu veidnes?\n\nIebūvētās veidnes tiks atjaunotas to sākotnējā stāvoklī. Jūsu izveidotās pielāgotās telpas netiks dzēstas.')) {
      return;
    }

    try {
      if (Store && Store.driver) {
        // Notīrām dzēsto veidņu sarakstu
        await Store.driver.set('ew:deleted_room_ids', []);

        // Notīrām vecos pagaidu melnrakstus, ja tādi glabājas
        const custom = await Store.driver.get('ew:custom_room_templates');
        if (Array.isArray(custom)) {
          const obsoleteMockIds = ['birza_attic', 'birza_bosse', 'birza_venice'];
          const cleanedCustom = custom.filter(c => !obsoleteMockIds.includes(c.id));
          await Store.driver.set('ew:custom_room_templates', cleanedCustom);
        }
      }

      // Atjaunojam standarta telpas no snapshot
      const defaults = JSON.parse(DEFAULT_BUILDINGS_SNAPSHOT);
      defaults.forEach(defBld => {
        const targetBld = BUILDINGS.find(b => b.id === defBld.id);
        if (targetBld) {
          const userRooms = (targetBld.rooms || []).filter(r => r.isCustom && !defBld.rooms.some(dr => dr.id === r.id));
          targetBld.rooms = [...defBld.rooms, ...userRooms];
        } else {
          BUILDINGS.push(defBld);
        }
      });

      // Pārlādējam no Store
      await loadCustomTemplates();

      resetTemplateEditor();
      renderAdminBuildingTabs();
      renderAdminTemplatesList();
      renderAdminSidebar();

      if (window.renderBuildingGrid) window.renderBuildingGrid();
      if (window.renderRoomList) window.renderRoomList();

      if (EW.UI && typeof EW.UI.toast === 'function') {
        EW.UI.toast('Standarta telpu veidnes veiksmīgi atjaunotas!');
      }
    } catch (err) {
      console.error('Kļūda atjaunojot veidnes:', err);
      if (EW.UI && typeof EW.UI.toast === 'function') {
        EW.UI.toast('Kļūda atjaunojot veidnes: ' + err.message);
      }
    }
  }

  /**
   * Veidņu eksports JSON failā
   */
  function exportTemplatesJson() {
    const exportData = {
      app: 'Easy walls 2.0',
      type: 'room_templates',
      version: '2.8.0',
      exportedAt: new Date().toISOString(),
      buildings: BUILDINGS.filter(b => b.isCustom).map(b => ({
        id: b.id,
        name: b.name,
        shortName: b.shortName,
        address: b.address,
        icon: b.icon,
        isCustom: true
      })),
      templates: []
    };

    BUILDINGS.forEach(b => {
      (b.rooms || []).forEach(r => {
        exportData.templates.push({
          buildingId: b.id,
          buildingName: b.name,
          ...r
        });
      });
    });

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `easy_walls_telpu_veidnes_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (EW.UI) EW.UI.toast(`Eksportētas ${exportData.templates.length} telpu veidnes JSON formātā`);
  }

  /**
   * Veidņu imports no JSON teksta
   */
  async function importTemplatesJson(jsonStr) {
    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch (err) {
      throw new Error('Nederīgs JSON faila formāts');
    }

    let templatesToImport = [];
    if (Array.isArray(data)) {
      templatesToImport = data;
    } else if (data && Array.isArray(data.templates)) {
      if (Array.isArray(data.buildings)) {
        data.buildings.forEach(b => {
          if (!BUILDINGS.some(x => x.id === b.id)) {
            BUILDINGS.push({
              id: b.id,
              name: b.name,
              shortName: b.shortName || b.name,
              address: b.address || '',
              icon: b.icon || '🏛️',
              isCustom: true,
              rooms: []
            });
          }
        });
        await saveCustomBuildingsToStore();
      }
      templatesToImport = data.templates;
    } else {
      throw new Error('Failā netika atrastas derīgas telpu veidnes');
    }

    let count = 0;
    templatesToImport.forEach(item => {
      const bId = item.buildingId || 'arsenals';
      let b = BUILDINGS.find(x => x.id === bId);
      if (!b) {
        b = {
          id: bId,
          name: item.buildingName || 'Importēta ēka',
          shortName: item.buildingName || 'Importēta ēka',
          address: '',
          icon: '🏛️',
          isCustom: true,
          rooms: []
        };
        BUILDINGS.push(b);
      }

      const newId = 'custom_rm_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      const rm = {
        id: item.id && !b.rooms.some(r => r.id === item.id) ? item.id : newId,
        name: item.name || 'Importēta telpa',
        widthM: Number(item.widthM) || 30.0,
        heightM: Number(item.heightM) || 18.0,
        step: Number(item.step) || 0.5,
        angle: Number(item.angle) || 0,
        defaultScale: Number(item.defaultScale) || 100,
        mppPt: item.mppPt ? Number(item.mppPt) : null,
        marginM: Number(item.marginM) !== undefined ? Number(item.marginM) : 1.0,
        pdfFile: item.pdfFile || null,
        description: item.description || '',
        isCustom: true
      };

      const existingIdx = b.rooms.findIndex(r => r.id === rm.id);
      if (existingIdx >= 0) {
        b.rooms[existingIdx] = rm;
      } else {
        b.rooms.push(rm);
      }
      count++;
    });

    await saveCustomBuildingsToStore();
    await saveCustomTemplatesToStore();

    renderAdminBuildingTabs();
    renderAdminTemplatesList();
    resetTemplateEditor();

    if (EW.UI) EW.UI.toast(`Veiksmīgi importētas ${count} telpu veidnes!`);
    if (window.renderBuildingGrid) window.renderBuildingGrid();
    if (window.renderRoomList) window.renderRoomList();
    return count;
  }

  // ========================================================
  // Administratora sānjoslas paneļa UI un zāles ielāde
  // ========================================================

  async function loadRoomTemplateToStage(buildingId, roomId) {
    const b = getBuilding(buildingId);
    if (!b) return false;
    const rm = (b.rooms || []).find(r => r.id === roomId);
    if (!rm) return false;

    currentEditingRoomId = rm.id;
    currentEditingBuildingId = b.id;

    // Notīrām iepriekšējo ekspozīciju (veidņu pārvaldības režīms)
    S.recordId = null;
    S.planName = `${b.shortName || b.name} — ${rm.name}`;
    S.activeVenueId = b.id;
    S.modules = [];
    S.panels = [];
    S.artworks = [];
    S.selectedModuleId = null;

    // Bāzes režģis šai telpai
    const gridStep = rm.step || 0.5;
    const gridDx = rm.dx !== undefined ? rm.dx : ((rm.widthM || 30) / 2);
    const gridDy = rm.dy !== undefined ? rm.dy : ((rm.heightM || 18) / 2);
    const gridAngle = rm.angle || 0;
    const gridRegion = rm.region ? { ...rm.region } : (
      (rm.marginM !== undefined && rm.marginM > 0) ? {
        minWx: rm.marginM,
        maxWx: (rm.widthM || 30) - rm.marginM,
        minWy: rm.marginM,
        maxWy: (rm.heightM || 18) - rm.marginM
      } : null
    );

    const g = {
      id: 1,
      name: rm.name,
      color: '#0284c7',
      angle: gridAngle,
      dx: gridDx,
      dy: gridDy,
      step: gridStep,
      visible: true,
      locked: false,
      region: gridRegion
    };

    S.grids = [g];
    S.setGridSeq(1);
    S.active = 0;

    // Ielādējam arhitektūras plāna PDF failu vai uzģenerējam sintētisko kanvu
    let pdfLoaded = false;
    if (rm.pdfFile && EW.UI && typeof EW.UI.loadPdfFromUrl === 'function') {
      pdfLoaded = await EW.UI.loadPdfFromUrl(rm.pdfFile, rm.pdfPage, rm.defaultScale, rm.mppPt);
    }

    if (!pdfLoaded) {
      createSyntheticPlanCanvas([rm], rm.widthM || 30);
    }

    if (EW.Interaction && typeof EW.Interaction.fitView === 'function') {
      EW.Interaction.fitView();
    }
    if (EW.UI && typeof EW.UI.updateScaleInfo === 'function') {
      EW.UI.updateScaleInfo();
    }

    if (EW.Renderer && typeof EW.Renderer.draw === 'function') {
      EW.Renderer.draw();
    }

    // Sinhronizējam administratora sānjoslas inspektoru
    fillAdminSidebarInspector(b, rm, g);
    highlightSidebarRoomItem(rm.id);

    return true;
  }

  function renderAdminSidebar() {
    renderAdminSidebarBuildingTabs();
    renderAdminSidebarRoomsList();
    populateAdminSidebarBuildingSelect();

    if (!currentEditingRoomId || !currentEditingBuildingId) {
      const firstB = BUILDINGS[0];
      if (firstB && firstB.rooms && firstB.rooms[0]) {
        loadRoomTemplateToStage(firstB.id, firstB.rooms[0].id);
      }
    } else {
      const b = getBuilding(currentEditingBuildingId);
      const rm = getRoom(currentEditingBuildingId, currentEditingRoomId);
      if (rm) {
        fillAdminSidebarInspector(b, rm, S.G());
        highlightSidebarRoomItem(rm.id);
      }
    }
  }

  function renderAdminSidebarBuildingTabs() {
    const tabs = document.getElementById('adminSidebarBuildingTabs');
    if (!tabs) return;
    tabs.innerHTML = '';

    const createTab = (id, label) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `step ${selectedAdminBuildingTab === id ? 'active' : ''}`;
      btn.style.fontSize = '10.5px';
      btn.style.padding = '2px 7px';
      btn.textContent = label;
      btn.onclick = () => {
        selectedAdminBuildingTab = id;
        renderAdminSidebarBuildingTabs();
        renderAdminSidebarRoomsList();
      };
      return btn;
    };

    tabs.appendChild(createTab('all', 'Visas'));
    BUILDINGS.forEach(b => {
      tabs.appendChild(createTab(b.id, b.shortName || b.name));
    });
  }

  function renderAdminSidebarRoomsList() {
    const listEl = document.getElementById('adminSidebarRoomsList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const searchInput = document.getElementById('adminSidebarSearch');
    const q = searchInput ? searchInput.value.trim().toLowerCase() : '';

    BUILDINGS.forEach(b => {
      if (selectedAdminBuildingTab !== 'all' && selectedAdminBuildingTab !== b.id) return;

      (b.rooms || []).forEach(rm => {
        if (q && !rm.name.toLowerCase().includes(q) && !(b.name && b.name.toLowerCase().includes(q))) return;

        const item = document.createElement('div');
        const isActive = currentEditingRoomId === rm.id;
        item.className = `admin-sidebar-room-item ${isActive ? 'active' : ''}`;
        item.setAttribute('data-room-id', rm.id);
        item.setAttribute('data-bld-id', b.id);

        const hasRegion = !!(rm.region || (rm.marginM !== undefined && rm.marginM > 0));
        const regionBadge = hasRegion 
          ? `<span class="badge-region" title="Telpai ir nodefinēta kontūra">📐 Kontūra</span>`
          : `<span class="badge-no-region" title="Kontūra vēl nav iezīmēta">Bez kontūras</span>`;

        const esc = EW.Utils && EW.Utils.esc ? EW.Utils.esc : (s => s || '');

        item.innerHTML = `
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:5px">
              <span style="font-weight:600;font-size:11px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(rm.name)}</span>
            </div>
            <div style="font-size:10px;color:var(--ink-dim);margin-top:1px">
              ${esc(b.shortName || b.name)} · ${rm.widthM}×${rm.heightM}m · ${((rm.step || 0.5) * 1000).toFixed(0)}mm
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:4px">
            ${regionBadge}
          </div>
        `;

        item.onclick = () => {
          loadRoomTemplateToStage(b.id, rm.id);
        };

        listEl.appendChild(item);
      });
    });
  }

  function highlightSidebarRoomItem(roomId) {
    const items = document.querySelectorAll('#adminSidebarRoomsList .admin-sidebar-room-item');
    items.forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-room-id') === roomId);
    });
  }

  function populateAdminSidebarBuildingSelect() {
    const sel = document.getElementById('adminInspBuilding');
    if (!sel) return;
    sel.innerHTML = '';
    BUILDINGS.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = `${b.icon || '🏛️'} ${b.shortName || b.name}`;
      sel.appendChild(opt);
    });
  }

  function fillAdminSidebarInspector(building, room, grid) {
    if (!room) return;
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val !== undefined && val !== null ? val : '';
    };

    const titleEl = document.getElementById('adminInspTitle');
    if (titleEl) titleEl.textContent = room.name;

    const badgeEl = document.getElementById('adminInspBadge');
    if (badgeEl) {
      badgeEl.className = room.isCustom ? 'badge-custom' : 'badge-builtin';
      badgeEl.textContent = room.isCustom ? 'Pielāgota' : 'Iebūvēta';
    }

    setVal('adminInspName', room.name);
    setVal('adminInspBuilding', building.id);
    setVal('adminInspWidth', room.widthM);
    setVal('adminInspHeight', room.heightM);
    setVal('adminInspPdfFile', room.pdfFile || '');

    updateAdminRegionStatusText(grid ? grid.region : room.region);

    // Mēroga un kalibrācijas birkas
    const scaleBadge = document.getElementById('adminInspScaleBadge');
    const scaleSelect = document.getElementById('adminInspPlotScale');
    const scaleDetail = document.getElementById('adminInspScaleDetail');

    const C = EW.Config;
    const denom = S.denom || room.defaultScale || (room.mppPt && C && C.PT2M ? Math.round(room.mppPt / C.PT2M) : 100);
    if (scaleBadge) scaleBadge.textContent = denom ? `1:${denom}` : 'Kalibrēts';
    if (scaleSelect && denom) {
      scaleSelect.value = String(denom);
    }
    if (scaleDetail) {
      const m = S.mpp ? S.mpp() : 0.01;
      scaleDetail.textContent = `1 px = ${(m * 100).toFixed(2)} cm · ${room.widthM || 0}m × ${room.heightM || 0}m`;
    }

    const btnDel = document.getElementById('btnAdminDeleteRoomDirect');
    if (btnDel) btnDel.style.display = 'inline-flex';
  }

  function updateAdminRegionStatusText(region) {
    const st = document.getElementById('adminInspRegionStatus');
    if (!st) return;
    if (region && typeof region.minWx === 'number' && typeof region.maxWx === 'number') {
      const wM = (region.maxWx - region.minWx).toFixed(1);
      const hM = (region.maxWy - region.minWy).toFixed(1);
      st.textContent = `📐 Kontūra: ${wM} × ${hM} m`;
      st.className = 'badge-region';
    } else {
      st.textContent = 'Nav iezīmēta';
      st.className = 'badge-no-region';
    }
  }

  function onRegionDrawn(region) {
    if (currentEditingRoomId && currentEditingBuildingId) {
      const rm = getRoom(currentEditingBuildingId, currentEditingRoomId);
      if (rm) rm.region = region ? { ...region } : null;
    }
    updateAdminRegionStatusText(region);
    renderAdminSidebarRoomsList();
  }

  function syncAdminInputsFromGrid() {
    const g = S.G();
    if (!g || !isAdminMode) return;
    updateAdminRegionStatusText(g.region);
  }

  async function saveCurrentRoomFromSidebar() {
    const nameInp = document.getElementById('adminInspName');
    const name = nameInp ? nameInp.value.trim() : '';
    const bldId = (document.getElementById('adminInspBuilding') || {}).value || 'arsenals';
    const widthM = parseFloat((document.getElementById('adminInspWidth') || {}).value);
    const existingRoom = getRoom(bldId, currentEditingRoomId);
    const step = (existingRoom && existingRoom.step) || 0.5;
    const angle = (existingRoom && existingRoom.angle) || 0;
    const dx = (existingRoom && existingRoom.dx) || 0;
    const dy = (existingRoom && existingRoom.dy) || 0;
    const pdfFile = (document.getElementById('adminInspPdfFile') || {}).value || '';
    const g = S.G();
    const region = g ? g.region : null;

    if (!name) {
      if (EW.UI) EW.UI.toast('Lūdzu ievadiet telpas nosaukumu');
      return;
    }
    if (isNaN(widthM) || widthM <= 0 || isNaN(heightM) || heightM <= 0) {
      if (EW.UI) EW.UI.toast('Lūdzu ievadiet korektus telpas izmērus (W un H)');
      return;
    }

    const defaultScale = S.denom || 100;
    const mppPt = S.mppPt || null;

    try {
      const res = await saveRoomTemplate({
        id: currentEditingRoomId,
        buildingId: bldId,
        name,
        widthM,
        heightM,
        step,
        angle,
        dx,
        dy,
        region,
        defaultScale,
        mppPt,
        pdfFile,
        isCustom: true
      });
      currentEditingRoomId = res.roomId;
      currentEditingBuildingId = res.buildingId;
      renderAdminSidebarBuildingTabs();
      renderAdminSidebarRoomsList();
      highlightSidebarRoomItem(res.roomId);
      await propagateRoomTemplateUpdate(res.room);
      if (EW.UI) EW.UI.toast(`Veidne “${name}” veiksmīgi saglabāta!`);
    } catch (e) {
      if (EW.UI) EW.UI.toast('Kļūda saglabājot: ' + e.message);
    }
  }

  function createNewBlankRoom() {
    const defaultBld = selectedAdminBuildingTab !== 'all' ? selectedAdminBuildingTab : 'arsenals';
    currentEditingBuildingId = defaultBld;
    currentEditingRoomId = null;

    const b = getBuilding(defaultBld);
    const tempRoom = {
      id: null,
      name: 'Jauna izstāžu telpa',
      widthM: 30.0,
      heightM: 18.0,
      step: 0.5,
      angle: 0,
      dx: 15.0,
      dy: 9.0,
      region: null,
      pdfFile: '',
      isCustom: true
    };

    S.recordId = null;
    S.planName = tempRoom.name;
    S.activeVenueId = defaultBld;
    S.modules = [];
    S.panels = [];
    S.artworks = [];
    S.selectedModuleId = null;

    const g = {
      id: 1,
      name: tempRoom.name,
      color: '#0284c7',
      angle: 0,
      dx: 15.0,
      dy: 9.0,
      step: 0.5,
      visible: true,
      locked: false,
      region: null
    };
    S.grids = [g];
    S.setGridSeq(1);
    S.active = 0;

    createSyntheticPlanCanvas([tempRoom], 30.0);
    if (EW.Interaction) EW.Interaction.fitView();
    if (EW.Renderer && typeof EW.Renderer.draw === 'function') {
      EW.Renderer.draw();
    }

    fillAdminSidebarInspector(b, tempRoom, g);
    highlightSidebarRoomItem(null);
    if (EW.UI) EW.UI.toast('Izveidojiet jaunu telpu: iezīmējiet kontūru un iestatiet režģi');
  }

  function initAdminSidebarEvents() {
    const search = document.getElementById('adminSidebarSearch');
    if (search) {
      search.addEventListener('input', () => {
        renderAdminSidebarRoomsList();
      });
    }

    const btnNew = document.getElementById('btnAdminNewRoomSidebar');
    if (btnNew) {
      btnNew.addEventListener('click', () => {
        createNewBlankRoom();
      });
    }

    const btnDrawRegion = document.getElementById('btnAdminDrawRegion');
    if (btnDrawRegion) {
      btnDrawRegion.addEventListener('click', () => {
        if (EW.UI) {
          EW.UI.setMode('region');
          EW.UI.toast('Iezīmējiet zāles kontūru uz plāna ar peli (velkot taisnstūri)...');
        }
      });
    }

    const btnClearRegion = document.getElementById('btnAdminClearRegion');
    if (btnClearRegion) {
      btnClearRegion.addEventListener('click', () => {
        const g = S.G();
        if (g) g.region = null;
        if (currentEditingRoomId && currentEditingBuildingId) {
          const rm = getRoom(currentEditingBuildingId, currentEditingRoomId);
          if (rm) rm.region = null;
        }
        onRegionDrawn(null);
        if (EW.Renderer && typeof EW.Renderer.draw === 'function') {
          EW.Renderer.draw();
        }
        if (EW.UI) EW.UI.toast('Telpas kontūra noņemta');
      });
    }

    const btnBrowsePdf = document.getElementById('btnAdminBrowsePdf');
    const pdfInput = document.getElementById('adminInspPdfInput');
    const pdfTextInput = document.getElementById('adminInspPdfFile');
    if (btnBrowsePdf && pdfInput) {
      btnBrowsePdf.addEventListener('click', () => {
        pdfInput.value = '';
        pdfInput.click();
      });
      pdfInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (pdfTextInput) pdfTextInput.value = file.name;
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          if (EW.UI) await EW.UI.loadPdf(file);
        } else {
          if (EW.UI) EW.UI.loadRaster(file);
        }
        if (currentEditingRoomId && currentEditingBuildingId) {
          const rm = getRoom(currentEditingBuildingId, currentEditingRoomId);
          if (rm) rm.pdfFile = file.name;
        }
      });
    }

    // 2 punktu mērogošanas rīks un mēroga izvēle
    const btnCalib = document.getElementById('btnAdminCalibScale');
    if (btnCalib) {
      btnCalib.addEventListener('click', () => {
        if (EW.UI && typeof EW.UI.startPick === 'function') {
          EW.UI.startPick('calib');
        }
      });
    }

    const selPlotScale = document.getElementById('adminInspPlotScale');
    if (selPlotScale) {
      selPlotScale.addEventListener('change', () => {
        const val = parseInt(selPlotScale.value, 10);
        if (val && EW.PdfScale) {
          EW.PdfScale.applyPlotScale(val);
          if (currentEditingRoomId && currentEditingBuildingId) {
            const rm = getRoom(currentEditingBuildingId, currentEditingRoomId);
            if (rm) {
              rm.defaultScale = val;
              rm.mppPt = S.mppPt;
              rm.isCustom = true;
              saveCustomTemplatesToStore();
            }
          }
          if (EW.UI) EW.UI.updateScaleInfo();
          if (EW.Renderer) EW.Renderer.draw();
          const scaleBadge = document.getElementById('adminInspScaleBadge');
          if (scaleBadge) scaleBadge.textContent = `1:${val}`;
          const scaleDetail = document.getElementById('adminInspScaleDetail');
          if (scaleDetail) {
            const m = S.mpp ? S.mpp() : 0.01;
            scaleDetail.textContent = `1 px = ${(m * 100).toFixed(2)} cm`;
          }
        }
      });
    }

    const btnSave = document.getElementById('btnAdminSaveRoomDirect');
    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        await saveCurrentRoomFromSidebar();
      });
    }

    const btnDup = document.getElementById('btnAdminDuplicateRoomDirect');
    if (btnDup) {
      btnDup.addEventListener('click', async () => {
        if (!currentEditingRoomId || !currentEditingBuildingId) return;
        try {
          const dup = await duplicateRoomTemplate(currentEditingBuildingId, currentEditingRoomId);
          renderAdminSidebarRoomsList();
          loadRoomTemplateToStage(currentEditingBuildingId, dup.id);
          if (EW.UI) EW.UI.toast(`Izveidota veidnes kopija “${dup.name}”!`);
        } catch (err) {
          if (EW.UI) EW.UI.toast('Kļūda dublējot: ' + err.message);
        }
      });
    }

    const btnDel = document.getElementById('btnAdminDeleteRoomDirect');
    if (btnDel) {
      btnDel.addEventListener('click', async () => {
        if (!currentEditingRoomId || !currentEditingBuildingId) return;
        await deleteRoomTemplateConfirm(currentEditingBuildingId, currentEditingRoomId);
      });
    }

    const btnExport = document.getElementById('btnAdminSidebarExportJson');
    if (btnExport) {
      btnExport.addEventListener('click', () => exportTemplatesJson());
    }

    const btnImport = document.getElementById('btnAdminSidebarImportJson');
    const fileInput = document.getElementById('adminTemplatesFileInput');
    if (btnImport && fileInput) {
      btnImport.addEventListener('click', () => {
        fileInput.value = '';
        fileInput.click();
      });
    }

    const btnWide = document.getElementById('btnAdminOpenWideModal');
    if (btnWide) {
      btnWide.addEventListener('click', () => {
        openTemplateAdminModal(currentEditingBuildingId, currentEditingRoomId);
      });
    }
  }

  // ========================================================
  // Administratora modālā loga UI kontrolieris
  // ========================================================

  function openTemplateAdminModal(buildingId, roomId) {
    const modal = document.getElementById('roomTemplatesAdminModal');
    if (!modal) return;

    if (buildingId) selectedAdminBuildingTab = buildingId;
    renderAdminBuildingTabs();
    renderAdminTemplatesList();

    if (buildingId && roomId) {
      fillTemplateEditor(buildingId, roomId);
    } else {
      resetTemplateEditor();
    }

    modal.classList.add('open');
  }

  function closeTemplateAdminModal() {
    const modal = document.getElementById('roomTemplatesAdminModal');
    if (modal) modal.classList.remove('open');
  }

  function populateBuildingSelect(selectedId) {
    const sel = document.getElementById('tmplBuildingSelect');
    if (!sel) return;
    sel.innerHTML = '';
    BUILDINGS.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = `${b.icon || '🏛️'} ${b.name}`;
      if (b.id === selectedId) opt.selected = true;
      sel.appendChild(opt);
    });
    const newOpt = document.createElement('option');
    newOpt.value = '__new__';
    newOpt.textContent = '+ Pievienot jaunu ēku...';
    if (selectedId === '__new__') newOpt.selected = true;
    sel.appendChild(newOpt);

    const wrap = document.getElementById('tmplNewBuildingWrap');
    if (wrap) wrap.style.display = sel.value === '__new__' ? 'block' : 'none';
  }

  function renderAdminBuildingTabs() {
    const tabsContainer = document.getElementById('adminBuildingTabs');
    if (!tabsContainer) return;
    tabsContainer.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = `step ${selectedAdminBuildingTab === 'all' ? 'active' : ''}`;
    allBtn.setAttribute('data-b', 'all');
    allBtn.style.fontSize = '10.5px';
    allBtn.style.padding = '2px 7px';
    allBtn.textContent = 'Visas';
    allBtn.onclick = () => {
      selectedAdminBuildingTab = 'all';
      renderAdminBuildingTabs();
      renderAdminTemplatesList();
    };
    tabsContainer.appendChild(allBtn);

    BUILDINGS.forEach(b => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `step ${selectedAdminBuildingTab === b.id ? 'active' : ''}`;
      btn.setAttribute('data-b', b.id);
      btn.style.fontSize = '10.5px';
      btn.style.padding = '2px 7px';
      btn.textContent = b.shortName || b.name;
      btn.onclick = () => {
        selectedAdminBuildingTab = b.id;
        renderAdminBuildingTabs();
        renderAdminTemplatesList();
      };
      tabsContainer.appendChild(btn);
    });
  }

  function renderAdminTemplatesList() {
    const listEl = document.getElementById('adminTemplatesList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const searchInput = document.getElementById('adminTemplateSearch');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    let totalMatched = 0;

    BUILDINGS.forEach(b => {
      if (selectedAdminBuildingTab !== 'all' && selectedAdminBuildingTab !== b.id) {
        return;
      }
      (b.rooms || []).forEach(rm => {
        const matchesQuery = !query ||
          rm.name.toLowerCase().includes(query) ||
          (rm.description && rm.description.toLowerCase().includes(query)) ||
          b.name.toLowerCase().includes(query);

        if (!matchesQuery) return;
        totalMatched++;

        const isSelected = currentEditingRoomId === rm.id;
        const item = document.createElement('div');
        item.className = `template-admin-item ${isSelected ? 'active' : ''}`;
        item.setAttribute('data-building', b.id);
        item.setAttribute('data-room', rm.id);

        const badgeHtml = rm.isCustom
          ? `<span class="badge-custom">Pielāgota</span>`
          : `<span class="badge-builtin">Iebūvēta</span>`;

        const esc = EW.Utils && EW.Utils.esc ? EW.Utils.esc : (s => s || '');

        item.innerHTML = `
          <div style="flex:1;min-width:0;cursor:pointer">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(rm.name)}</span>
              ${badgeHtml}
            </div>
            <div style="font-size:10.5px;color:var(--ink-dim);margin-top:2px">
              ${esc(b.shortName || b.name)} · ${rm.widthM}×${rm.heightM}m · Režģis: ${(rm.step * 1000).toFixed(0)}mm
            </div>
          </div>
          <button type="button" class="btn-item-del" title="Dzēst veidni “${esc(rm.name)}”" onclick="event.stopPropagation(); EW.Venues.deleteRoomTemplateConfirm('${b.id}', '${rm.id}')">🗑️</button>
          <div style="font-size:14px;opacity:0.4;margin-left:4px;cursor:pointer">›</div>
        `;

        item.onclick = () => {
          fillTemplateEditor(b.id, rm.id);
        };

        listEl.appendChild(item);
      });
    });

    if (totalMatched === 0) {
      const empty = document.createElement('div');
      empty.style.padding = '16px';
      empty.style.textAlign = 'center';
      empty.style.fontSize = '12px';
      empty.style.color = 'var(--ink-dim)';
      empty.textContent = query ? 'Nav atrasta neviena telpa' : 'Šajā ēkā vēl nav pievienotas telpas';
      listEl.appendChild(empty);
    }
  }

  function fillTemplateEditor(buildingId, roomId) {
    const b = getBuilding(buildingId);
    if (!b) return;
    const rm = (b.rooms || []).find(r => r.id === roomId);
    if (!rm) return;

    currentEditingRoomId = rm.id;
    currentEditingBuildingId = b.id;

    populateBuildingSelect(b.id);

    const titleEl = document.getElementById('adminEditorTitle');
    if (titleEl) {
      titleEl.textContent = rm.isCustom
        ? `Rediģēt veidni: ${rm.name}`
        : `Iebūvētā veidne: ${rm.name}`;
    }

    const badgeEl = document.getElementById('adminEditorBadge');
    if (badgeEl) {
      badgeEl.style.display = 'inline-block';
      if (rm.isCustom) {
        badgeEl.className = 'badge-custom';
        badgeEl.textContent = 'Pielāgota veidne';
      } else {
        badgeEl.className = 'badge-builtin';
        badgeEl.textContent = 'Iebūvēta veidne';
      }
    }

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val !== undefined && val !== null ? val : '';
    };

    setVal('tmplRoomId', rm.id);
    setVal('tmplRoomName', rm.name);
    setVal('tmplWidthM', rm.widthM);
    setVal('tmplHeightM', rm.heightM);
    setVal('tmplStep', rm.step || 0.5);
    setVal('tmplAngle', rm.angle || 0);
    setVal('tmplDefaultScale', rm.defaultScale || 100);
    setVal('tmplMarginM', rm.marginM !== undefined ? rm.marginM : 1.0);
    setVal('tmplPdfFile', rm.pdfFile || '');
    setVal('tmplDescription', rm.description || '');

    const btnDelete = document.getElementById('btnAdminDeleteTemplate');
    if (btnDelete) {
      btnDelete.style.display = 'inline-flex';
    }

    const btnDuplicate = document.getElementById('btnAdminDuplicateTemplate');
    if (btnDuplicate) {
      btnDuplicate.style.display = 'inline-flex';
    }

    const listItems = document.querySelectorAll('#adminTemplatesList .template-admin-item');
    listItems.forEach(item => {
      const match = item.getAttribute('data-room') === rm.id;
      item.classList.toggle('active', match);
    });

    renderRoomTemplatePreview(rm);
  }

  function resetTemplateEditor() {
    currentEditingRoomId = null;
    currentEditingBuildingId = null;

    const titleEl = document.getElementById('adminEditorTitle');
    if (titleEl) titleEl.textContent = 'Jaunas telpas veidnes izveide';

    const badgeEl = document.getElementById('adminEditorBadge');
    if (badgeEl) badgeEl.style.display = 'none';

    const defaultBuilding = selectedAdminBuildingTab !== 'all'
      ? selectedAdminBuildingTab
      : (BUILDINGS[0] ? BUILDINGS[0].id : 'arsenals');

    populateBuildingSelect(defaultBuilding);

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };

    setVal('tmplRoomId', '');
    setVal('tmplRoomName', '');
    setVal('tmplWidthM', '30.0');
    setVal('tmplHeightM', '18.0');
    setVal('tmplStep', '0.5');
    setVal('tmplAngle', '0');
    setVal('tmplDefaultScale', '100');
    setVal('tmplMarginM', '1.0');
    setVal('tmplPdfFile', '');
    setVal('tmplDescription', '');
    setVal('tmplNewBuildingName', '');

    const btnDelete = document.getElementById('btnAdminDeleteTemplate');
    if (btnDelete) btnDelete.style.display = 'none';

    const btnDuplicate = document.getElementById('btnAdminDuplicateTemplate');
    if (btnDuplicate) btnDuplicate.style.display = 'none';

    const listItems = document.querySelectorAll('#adminTemplatesList .template-admin-item');
    listItems.forEach(item => item.classList.remove('active'));

    renderRoomTemplatePreview({
      name: 'Jauna telpas veidne',
      widthM: 30.0,
      heightM: 18.0,
      step: 0.5,
      marginM: 1.0,
      defaultScale: 100
    });
  }

  /**
   * Zāles vizuālais priekšskatījums (Mini-map) paplašinātajā veidņu pārvaldniekā
   */
  function renderRoomTemplatePreview(room) {
    const cv = document.getElementById('adminTmplPreviewCanvas');
    if (!cv || !room) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const W = cv.width;
    const H = cv.height;

    ctx.clearRect(0, 0, W, H);

    // Fona pildījums
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, H);

    const wM = Math.max(1, Number(room.widthM) || 20);
    const hM = Math.max(1, Number(room.heightM) || 15);
    const step = Math.max(0.1, Number(room.step) || 0.5);
    const marginM = room.marginM !== undefined ? Number(room.marginM) : 1.0;
    const scaleDenom = room.defaultScale || 100;

    // Centrā izvietots mērogs ar 24px atkāpēm
    const pad = 24;
    const availW = W - 2 * pad;
    const availH = H - 2 * pad;
    const scale = Math.min(availW / wM, availH / hM);

    const rw = wM * scale;
    const rh = hM * scale;
    const startX = (W - rw) / 2;
    const startY = (H - rh) / 2;

    // 1. Koordinātu pamata rasējuma fons
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.7)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // 2. Nesošās ārsienas (450mm = 0.45m)
    const wallThick = Math.max(3, 0.45 * scale);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(startX - wallThick, startY - wallThick, rw + 2 * wallThick, rh + 2 * wallThick);

    // 3. Telpas iekšējā grīda
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(startX, startY, rw, rh);

    // Iekšējā apmetuma līnija
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, startY, rw, rh);

    // 4. Bāzes režģis (500mm vai telpas solis)
    const gridStepPx = step * scale;
    if (gridStepPx >= 5) {
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 0.8;
      for (let gx = startX + gridStepPx; gx < startX + rw - 1; gx += gridStepPx) {
        ctx.beginPath();
        ctx.moveTo(gx, startY);
        ctx.lineTo(gx, startY + rh);
        ctx.stroke();
      }
      for (let gy = startY + gridStepPx; gy < startY + rh - 1; gy += gridStepPx) {
        ctx.beginPath();
        ctx.moveTo(startX, gy);
        ctx.lineTo(startX + rw, gy);
        ctx.stroke();
      }
    }

    // 5. Drošības / brīvā perimetra atkāpe (Margin)
    if (marginM > 0 && marginM * 2 < wM && marginM * 2 < hM) {
      const mx = marginM * scale;
      const my = marginM * scale;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.strokeRect(startX + mx, startY + my, rw - 2 * mx, rh - 2 * my);
      ctx.setLineDash([]);
    }

    // 6. Kolonnas (ja telpai ir definētas)
    if (room.columns && Array.isArray(room.columns)) {
      room.columns.forEach(col => {
        const colX = startX + (col.x / wM) * rw;
        const colY = startY + (col.y / hM) * rh;
        const colR = Math.max(2.5, (col.radius || 0.35) * scale);
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(colX, colY, colR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    // 7. Durvis un atvēruma loki
    // Galvenā ieeja (apakšā)
    const doorW = Math.min(rw * 0.3, Math.max(12, 1.6 * scale));
    const doorX = startX + rw / 2 - doorW / 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(doorX, startY + rh - wallThick - 0.5, doorW, wallThick + 1);

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(doorX, startY + rh, doorW, -Math.PI / 2, 0, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(doorX, startY + rh);
    ctx.lineTo(doorX, startY + rh - doorW);
    ctx.stroke();

    // Evakuācijas izeja (kreisajā sānā)
    const exitH = Math.min(rh * 0.3, Math.max(10, 1.2 * scale));
    const exitY = startY + rh / 2 - exitH / 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(startX - wallThick - 0.5, exitY, wallThick + 1, exitH);

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(startX, exitY, exitH, 0, Math.PI / 2, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(startX, exitY);
    ctx.lineTo(startX + exitH, exitY);
    ctx.stroke();

    // 8. Izmēru anotācijas (Platums un Augstums)
    ctx.fillStyle = '#475569';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`↔ ${wM.toFixed(1)} m`, startX + rw / 2, startY - wallThick - 3);

    ctx.save();
    ctx.translate(startX - wallThick - 5, startY + rh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`↕ ${hM.toFixed(1)} m`, 0, 0);
    ctx.restore();

    // 9. Meta apraksta atjaunošana (#tmplPreviewMeta)
    const metaEl = document.getElementById('tmplPreviewMeta');
    if (metaEl) {
      metaEl.textContent = `${room.name || 'Zāle'} · ${wM.toFixed(1)}m × ${hM.toFixed(1)}m · ${(step * 1000).toFixed(0)}mm · 1:${scaleDenom}`;
    }
  }

  /**
   * Tiek izsaukts, kad administrators nokalibrē mērogu ar 2 punktiem
   */
  function onScaleCalibrated(newMppPt, newDenom, realDistM, pixelDist) {
    if (!currentEditingRoomId || !currentEditingBuildingId) return;
    const rm = getRoom(currentEditingBuildingId, currentEditingRoomId);
    if (!rm) return;

    rm.mppPt = newMppPt;
    rm.defaultScale = newDenom;
    rm.isCustom = true;
    saveCustomTemplatesToStore();

    // Atjaunojam inspektora birkas
    const scaleBadge = document.getElementById('adminInspScaleBadge');
    if (scaleBadge) scaleBadge.textContent = newDenom ? `1:${newDenom}` : 'Kalibrēts';

    const scaleSelect = document.getElementById('adminInspPlotScale');
    if (scaleSelect && newDenom) scaleSelect.value = String(newDenom);

    const scaleDetail = document.getElementById('adminInspScaleDetail');
    if (scaleDetail) {
      const m = S.mpp ? S.mpp() : 0.01;
      scaleDetail.textContent = `1 px = ${(m * 100).toFixed(2)} cm · Kalibrēts: ${realDistM}m`;
    }

    // Ja ekspozīcija izmanto šo telpu, sinhronizējam to
    if (S.exhibition && S.exhibition.rooms) {
      const exRoom = S.exhibition.rooms.find(r => r.id === rm.id);
      if (exRoom) {
        exRoom.mppPt = newMppPt;
        exRoom.defaultScale = newDenom;
      }
    }
  }

  /**
   * Automātiski sinhronizē veidnes izmaiņas ar aktīvo ekspozīciju un skatuvi
   */
  async function propagateRoomTemplateUpdate(roomObj) {
    if (!roomObj) return;

    // 1. Ja ir aktīva ekspozīcija, sinhronizējam telpas un režģus
    if (S.exhibition && S.exhibition.rooms && S.exhibition.rooms.length) {
      let exhibitionChanged = false;
      S.exhibition.rooms.forEach((r, idx) => {
        if (r.id === roomObj.id) {
          Object.assign(r, {
            name: roomObj.name,
            widthM: roomObj.widthM,
            heightM: roomObj.heightM,
            step: roomObj.step,
            angle: roomObj.angle,
            dx: roomObj.dx,
            dy: roomObj.dy,
            defaultScale: roomObj.defaultScale,
            mppPt: roomObj.mppPt,
            marginM: roomObj.marginM,
            pdfFile: roomObj.pdfFile,
            description: roomObj.description,
            region: roomObj.region ? { ...roomObj.region } : null
          });
          exhibitionChanged = true;

          const g = S.grids.find(grid => grid.roomId === roomObj.id || grid.id === (idx + 1));
          if (g) {
            g.name = roomObj.name;
            g.step = roomObj.step || 0.5;
            g.angle = roomObj.angle || 0;
            g.dx = roomObj.dx !== undefined ? roomObj.dx : (roomObj.widthM / 2);
            g.dy = roomObj.dy !== undefined ? roomObj.dy : (roomObj.heightM / 2);
            if (roomObj.region) {
              g.region = { ...roomObj.region };
            } else if (roomObj.marginM > 0) {
              g.region = {
                minWx: roomObj.marginM,
                maxWx: roomObj.widthM - roomObj.marginM,
                minWy: roomObj.marginM,
                maxWy: roomObj.heightM - roomObj.marginM
              };
            }
          }
        }
      });

      if (exhibitionChanged) {
        const activeRoom = S.exhibition.rooms[S.activeRoomIndex || 0];
        if (activeRoom && activeRoom.id === roomObj.id) {
          await activateExhibitionRoom(S.activeRoomIndex || 0);
        } else {
          renderExhibitionRoomTabs();
        }
      }
    }

    // 2. Ja atrodamies administratora skatā uz darba virsmas
    if (currentEditingRoomId === roomObj.id && (!S.exhibition || !S.exhibition.rooms || !S.exhibition.rooms.length)) {
      const g = S.G();
      if (g) {
        g.name = roomObj.name;
        g.step = roomObj.step || 0.5;
        g.angle = roomObj.angle || 0;
        g.dx = roomObj.dx !== undefined ? roomObj.dx : (roomObj.widthM / 2);
        g.dy = roomObj.dy !== undefined ? roomObj.dy : (roomObj.heightM / 2);
        if (roomObj.region) g.region = { ...roomObj.region };
      }
      if (!roomObj.pdfFile) {
        createSyntheticPlanCanvas([roomObj], roomObj.widthM);
      }
      if (EW.Interaction && typeof EW.Interaction.fitView === 'function') {
        EW.Interaction.fitView();
      }
      if (EW.UI && typeof EW.UI.updateScaleInfo === 'function') {
        EW.UI.updateScaleInfo();
      }
      if (EW.Renderer && typeof EW.Renderer.draw === 'function') {
        EW.Renderer.draw();
      }
    }
  }

  async function saveRoomTemplateFromForm() {
    const selBuilding = document.getElementById('tmplBuildingSelect');
    const buildingId = selBuilding ? selBuilding.value : 'arsenals';
    const newBuildingName = (document.getElementById('tmplNewBuildingName') || {}).value || '';

    const roomId = (document.getElementById('tmplRoomId') || {}).value || '';
    const roomName = (document.getElementById('tmplRoomName') || {}).value || '';
    const widthM = parseFloat((document.getElementById('tmplWidthM') || {}).value);
    const heightM = parseFloat((document.getElementById('tmplHeightM') || {}).value);
    const step = parseFloat((document.getElementById('tmplStep') || {}).value) || 0.5;
    const angle = parseFloat((document.getElementById('tmplAngle') || {}).value) || 0;
    const defaultScale = parseInt((document.getElementById('tmplDefaultScale') || {}).value, 10) || 100;
    const marginM = parseFloat((document.getElementById('tmplMarginM') || {}).value);
    const pdfFile = (document.getElementById('tmplPdfFile') || {}).value || '';
    const description = (document.getElementById('tmplDescription') || {}).value || '';

    if (!roomName.trim()) {
      if (EW.UI) EW.UI.toast('Lūdzu ievadiet telpas nosaukumu');
      return;
    }
    if (isNaN(widthM) || widthM <= 0) {
      if (EW.UI) EW.UI.toast('Lūdzu ievadiet korektu telpas platumu');
      return;
    }
    if (isNaN(heightM) || heightM <= 0) {
      if (EW.UI) EW.UI.toast('Lūdzu ievadiet korektu telpas garumu');
      return;
    }
    if (buildingId === '__new__' && !newBuildingName.trim()) {
      if (EW.UI) EW.UI.toast('Lūdzu ievadiet jaunās ēkas nosaukumu');
      return;
    }

    const existingRm = buildingId && roomId ? getRoom(buildingId, roomId) : null;
    const mppPt = (existingRm && existingRm.mppPt) ? existingRm.mppPt : (currentEditingRoomId === roomId ? S.mppPt : null);

    try {
      const res = await saveRoomTemplate({
        id: roomId,
        buildingId,
        buildingName: newBuildingName,
        name: roomName,
        widthM,
        heightM,
        step,
        angle,
        defaultScale,
        mppPt,
        marginM: isNaN(marginM) ? 1.0 : marginM,
        pdfFile,
        description
      });

      renderAdminBuildingTabs();
      renderAdminTemplatesList();
      fillTemplateEditor(res.buildingId, res.roomId);
      await propagateRoomTemplateUpdate(res.room);

      if (EW.UI) EW.UI.toast(`Veidne “${roomName}” veiksmīgi saglabāta!`);

      if (window.renderBuildingGrid) window.renderBuildingGrid();
      if (window.renderRoomList) window.renderRoomList();
    } catch (err) {
      if (EW.UI) EW.UI.toast('Kļūda saglabājot veidni: ' + err.message);
    }
  }

  async function duplicateRoomTemplateFromForm() {
    if (!currentEditingRoomId || !currentEditingBuildingId) return;
    try {
      const dup = await duplicateRoomTemplate(currentEditingBuildingId, currentEditingRoomId);
      renderAdminTemplatesList();
      fillTemplateEditor(currentEditingBuildingId, dup.id);
      if (EW.UI) EW.UI.toast(`Izveidota veidnes kopija “${dup.name}”!`);

      if (window.renderBuildingGrid) window.renderBuildingGrid();
      if (window.renderRoomList) window.renderRoomList();
    } catch (err) {
      if (EW.UI) EW.UI.toast('Kļūda dublējot: ' + err.message);
    }
  }

  async function deleteRoomTemplateFromForm() {
    if (!currentEditingRoomId || !currentEditingBuildingId) return;
    await deleteRoomTemplateConfirm(currentEditingBuildingId, currentEditingRoomId);
  }

  function initTemplateAdminEvents() {
    const search = document.getElementById('adminTemplateSearch');
    if (search) {
      search.addEventListener('input', () => {
        renderAdminTemplatesList();
      });
    }

    const btnNew = document.getElementById('btnAdminNewTemplate');
    if (btnNew) {
      btnNew.addEventListener('click', () => {
        resetTemplateEditor();
      });
    }

    const btnReset = document.getElementById('btnAdminResetForm');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        resetTemplateEditor();
      });
    }

    const btnSave = document.getElementById('btnAdminSaveTemplate');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        saveRoomTemplateFromForm();
      });
    }

    const btnDelete = document.getElementById('btnAdminDeleteTemplate');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => {
        deleteRoomTemplateFromForm();
      });
    }

    const btnDuplicate = document.getElementById('btnAdminDuplicateTemplate');
    if (btnDuplicate) {
      btnDuplicate.addEventListener('click', () => {
        duplicateRoomTemplateFromForm();
      });
    }

    const btnExport = document.getElementById('btnAdminExportTemplates');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        exportTemplatesJson();
      });
    }

    const btnImport = document.getElementById('btnAdminImportTemplates');
    const fileInput = document.getElementById('adminTemplatesFileInput');
    if (btnImport && fileInput) {
      btnImport.addEventListener('click', () => {
        fileInput.value = '';
        fileInput.click();
      });
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          await importTemplatesJson(text);
        } catch (err) {
          if (EW.UI) EW.UI.toast('Importa kļūda: ' + err.message);
        }
      });
    }

    const bldSelect = document.getElementById('tmplBuildingSelect');
    const newBldWrap = document.getElementById('tmplNewBuildingWrap');
    if (bldSelect) {
      bldSelect.addEventListener('change', () => {
        if (newBldWrap) {
          newBldWrap.style.display = bldSelect.value === '__new__' ? 'block' : 'none';
        }
      });
    }

    const btnBrowsePdf = document.getElementById('btnBrowseTmplPdf');
    const pdfFileInput = document.getElementById('tmplPdfFileInput');
    const pdfTextInput = document.getElementById('tmplPdfFile');
    if (btnBrowsePdf && pdfFileInput) {
      btnBrowsePdf.addEventListener('click', () => {
        pdfFileInput.value = '';
        pdfFileInput.click();
      });
      pdfFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file && pdfTextInput) {
          pdfTextInput.value = file.name;
        }
      });
    }

    const btnResetDefaults = document.getElementById('btnAdminResetDefaults');
    if (btnResetDefaults) {
      btnResetDefaults.addEventListener('click', () => {
        restoreDefaultTemplates();
      });
    }

    const btnOpenOnStage = document.getElementById('btnAdminOpenOnStage');
    if (btnOpenOnStage) {
      btnOpenOnStage.addEventListener('click', async () => {
        if (!currentEditingRoomId || !currentEditingBuildingId) {
          if (EW.UI) EW.UI.toast('Vispirms izvēlieties veidni');
          return;
        }
        closeTemplateAdminModal();
        await loadRoomTemplateToStage(currentEditingBuildingId, currentEditingRoomId);
        if (EW.UI) EW.UI.toast('Veidne atvērta uz darba virsmas');
      });
    }

    const previewInputIds = ['tmplWidthM', 'tmplHeightM', 'tmplStep', 'tmplMarginM', 'tmplRoomName', 'tmplDefaultScale'];
    previewInputIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          const wM = parseFloat((document.getElementById('tmplWidthM') || {}).value) || 20;
          const hM = parseFloat((document.getElementById('tmplHeightM') || {}).value) || 15;
          const step = parseFloat((document.getElementById('tmplStep') || {}).value) || 0.5;
          const marginM = parseFloat((document.getElementById('tmplMarginM') || {}).value);
          const name = (document.getElementById('tmplRoomName') || {}).value || 'Priekšskatījums';
          const defaultScale = parseInt((document.getElementById('tmplDefaultScale') || {}).value, 10) || 100;

          let existingCols = null;
          if (currentEditingBuildingId && currentEditingRoomId) {
            const rm = getRoom(currentEditingBuildingId, currentEditingRoomId);
            if (rm && rm.columns) existingCols = rm.columns;
          }

          renderRoomTemplatePreview({
            name,
            widthM: wM,
            heightM: hM,
            step,
            marginM: isNaN(marginM) ? 1.0 : marginM,
            defaultScale,
            columns: existingCols
          });
        });
      }
    });
  }

  // ========================================================
  // Ekspozīcijas izveides dzinējs (Multi-room)
  // ========================================================

  /**
   * Izveido jaunu ekspozīciju no atlasītajām telpām ar vienas zāles fokusu (Tabs)
   */
  async function createExhibition(buildingId, roomIds, exhibitionName) {
    const building = getBuilding(buildingId);
    if (!building) throw new Error('Ēka nav atrasta');

    const selectedRooms = (building.rooms || []).filter(r => roomIds.includes(r.id));
    if (!selectedRooms.length) throw new Error('Nav izvēlēta neviena telpa');

    const name = exhibitionName && exhibitionName.trim()
      ? exhibitionName.trim()
      : `${building.shortName} — Jauna ekspozīcija (${new Date().toLocaleDateString('lv-LV')})`;

    // Notīrām iepriekšējos datus
    S.recordId = null;
    S.planName = name;
    S.activeVenueId = buildingId;
    S.modules = [];
    S.panels = [];
    S.artworks = [];
    S.selectedModuleId = null;
    S.selectedArtworkId = null;

    // Saglabājam ekspozīcijas struktūru stāvoklī
    S.exhibition = {
      buildingId,
      buildingName: building.shortName || building.name,
      name,
      roomIds: [...roomIds],
      rooms: selectedRooms.map(r => ({ ...r }))
    };

    // Ģenerējam režģus katrai zālei ar savu lokālo telpas centru (0, 0 bāze)
    const newGrids = selectedRooms.map((rm, idx) => {
      const margin = rm.marginM !== undefined ? rm.marginM : 1.0;
      return {
        id: idx + 1,
        roomId: rm.id,
        name: rm.name,
        color: EW.Config.PALETTE[idx % EW.Config.PALETTE.length],
        angle: rm.angle || 0,
        dx: rm.dx !== undefined ? rm.dx : ((rm.widthM || 30) / 2),
        dy: rm.dy !== undefined ? rm.dy : ((rm.heightM || 20) / 2),
        step: rm.step || 0.5,
        visible: idx === 0,
        locked: true,
        region: rm.region ? { ...rm.region } : (margin > 0 ? {
          minWx: margin,
          maxWx: (rm.widthM || 30) - margin,
          minWy: margin,
          maxWy: (rm.heightM || 20) - margin
        } : null)
      };
    });

    S.grids = newGrids;
    S.setGridSeq(newGrids.length);

    // Inicializējam variantu A katrai izvēlētajai ekspozīcijas zālei
    S.variants = selectedRooms.map((rm, idx) => ({
      id: `var_${rm.id}_a`,
      roomId: rm.id,
      gridId: idx + 1,
      name: 'Variants A',
      modules: [],
      panels: [],
      artworks: [],
      updated: Date.now(),
      isArchived: false
    }));
    S.activeVariantId = S.variants[0]?.id || 'var_a';
    S.activeRoomVariants = {};
    selectedRooms.forEach(rm => {
      S.activeRoomVariants[rm.id] = `var_${rm.id}_a`;
    });

    // Aktivizējam pirmo zāli un ielādējam tās fona plānu
    await activateExhibitionRoom(0);

    if (EW.UI) {
      if (EW.ModulesInteraction) EW.ModulesInteraction.updateModuleControls();
      if (EW.Artworks) EW.Artworks.renderUI();
      if (EW.Inventory) EW.Inventory.renderUI();
      EW.UI.toast(`Izveidota ekspozīcija “${name}” (${selectedRooms.length} zāles)`);
    }

    return true;
  }

  /**
   * Pārslēdz aktīvo ekspozīcijas zāli (Vienas zāles fokuss / Single-room focus)
   */
  async function activateExhibitionRoom(roomIdx) {
    if (!S.exhibition || !S.exhibition.rooms || !S.exhibition.rooms.length) return false;
    if (roomIdx < 0 || roomIdx >= S.exhibition.rooms.length) roomIdx = 0;

    // Saglabājam esošās zāles stāvokli tās aktīvajā variantā
    if (EW.Variants && typeof EW.Variants.saveCurrentToActiveVariant === 'function') {
      EW.Variants.saveCurrentToActiveVariant();
    }

    S.activeRoomIndex = roomIdx;
    S.active = roomIdx;

    const rm = S.exhibition.rooms[roomIdx];
    if (!rm) return false;

    // Ieslēdzam TIKAI aktīvās zāles režģi un izslēdzam pārējos
    S.grids.forEach((g, idx) => {
      g.visible = (idx === roomIdx);
    });

    // Sinhronizējam zāles variantus
    if (EW.Variants && typeof EW.Variants.activateRoomVariants === 'function') {
      EW.Variants.activateRoomVariants(roomIdx);
    }

    // Ielādējam šīs zāles autentisko arhitektūras plānu (PDF vai detalizētu sintētisko pamatni)
    let pdfLoaded = false;
    if (rm.pdfFile && EW.UI && typeof EW.UI.loadPdfFromUrl === 'function') {
      pdfLoaded = await EW.UI.loadPdfFromUrl(rm.pdfFile, rm.pdfPage || 1, rm.defaultScale || 100, rm.mppPt);
    }

    if (!pdfLoaded) {
      createSyntheticPlanCanvas([rm], rm.widthM || 30);
    }

    // Pielāgojam kameras skatu aktīvajai telpai
    if (EW.Interaction && typeof EW.Interaction.fitView === 'function') {
      EW.Interaction.fitView();
    }

    renderExhibitionRoomTabs();

    if (EW.UI) {
      EW.UI.syncInputs();
      EW.UI.renderChips();
      EW.UI.updateScaleInfo();
    }

    if (EW.Renderer && typeof EW.Renderer.draw === 'function') {
      EW.Renderer.draw();
    }
    return true;
  }

  /**
   * Renderē zāļu navigācijas ciļņu joslu virs audekla (#stageRoomTabsBar)
   */
  function renderExhibitionRoomTabs() {
    const tabsBar = document.getElementById('stageRoomTabsBar');
    const tabsList = document.getElementById('roomTabsList');
    if (!tabsBar || !tabsList) return;

    if (!S.exhibition || !S.exhibition.rooms || !S.exhibition.rooms.length) {
      tabsBar.style.display = 'none';
      return;
    }

    tabsBar.style.display = 'flex';
    tabsList.innerHTML = '';

    const esc = EW.Utils && EW.Utils.esc ? EW.Utils.esc : (s => s || '');

    S.exhibition.rooms.forEach((rm, idx) => {
      const isCur = (idx === S.activeRoomIndex);
      const modCount = (S.modules || []).filter(m => m.gridId === (idx + 1)).length;
      const artCount = (S.artworks || []).filter(a => {
        if (a.gridId === (idx + 1)) return true;
        if (a.moduleId) {
          const m = (S.modules || []).find(mod => mod.id === a.moduleId);
          return m && m.gridId === (idx + 1);
        }
        return false;
      }).length;

      const tab = document.createElement('div');
      tab.className = `room-tab ${isCur ? 'active' : ''}`;
      tab.setAttribute('data-idx', idx);
      tab.title = `Pārslēgties uz zāli “${rm.name}”`;
      tab.innerHTML = `
        <span class="room-tab-icon">🏛️</span>
        <span class="room-tab-title">${esc(rm.name)}</span>
        <span class="room-tab-badge">${rm.widthM}×${rm.heightM}m</span>
        <span class="room-tab-count">🧱 ${modCount} · 🖼️ ${artCount}</span>
      `;

      tab.onclick = () => {
        if (idx !== S.activeRoomIndex) {
          activateExhibitionRoom(idx);
        }
      };

      tabsList.appendChild(tab);
    });

    const btnAdd = document.getElementById('btnAddRoomToExhibition');
    if (btnAdd) {
      btnAdd.onclick = () => promptAddRoomToExhibition();
    }
  }

  /**
   * Piedāvā pievienot vēl vienu zāli esošajai ekspozīcijai
   */
  function promptAddRoomToExhibition() {
    if (!S.exhibition) return;
    const b = getBuilding(S.exhibition.buildingId);
    if (!b) return;

    const availableRooms = (b.rooms || []).filter(r => !S.exhibition.rooms.some(er => er.id === r.id));
    if (!availableRooms.length) {
      if (EW.UI) EW.UI.toast('Visas šīs ēkas zāles jau ir pievienotas ekspozīcijai');
      return;
    }

    const roomNames = availableRooms.map((r, i) => `${i + 1}. ${r.name} (${r.widthM}×${r.heightM}m)`).join('\n');
    const choice = prompt(`Izvēlieties zāli, ko pievienot ekspozīcijai (ievadiet kārtas numuru 1..${availableRooms.length}):\n\n${roomNames}`);
    if (!choice) return;

    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= availableRooms.length) {
      if (EW.UI) EW.UI.toast('Nederīga izvēle');
      return;
    }

    const selectedRm = availableRooms[idx];
    addRoomToActiveExhibition(selectedRm.id);
  }

  /**
   * Pievieno telpu aktīvajai ekspozīcijai un pārslēdzas uz to
   */
  async function addRoomToActiveExhibition(roomId) {
    if (!S.exhibition) return false;
    const b = getBuilding(S.exhibition.buildingId);
    if (!b) return false;
    const rm = (b.rooms || []).find(r => r.id === roomId);
    if (!rm) return false;

    S.exhibition.rooms.push({ ...rm });
    S.exhibition.roomIds.push(rm.id);

    const newGridId = S.grids.length + 1;
    const margin = rm.marginM !== undefined ? rm.marginM : 1.0;
    const g = {
      id: newGridId,
      roomId: rm.id,
      name: rm.name,
      color: EW.Config.PALETTE[(newGridId - 1) % EW.Config.PALETTE.length],
      angle: rm.angle || 0,
      dx: rm.dx !== undefined ? rm.dx : ((rm.widthM || 30) / 2),
      dy: rm.dy !== undefined ? rm.dy : ((rm.heightM || 20) / 2),
      step: rm.step || 0.5,
      visible: true,
      locked: true,
      region: rm.region ? { ...rm.region } : (margin > 0 ? {
        minWx: margin,
        maxWx: (rm.widthM || 30) - margin,
        minWy: margin,
        maxWy: (rm.heightM || 20) - margin
      } : null)
    };

    S.grids.push(g);
    S.setGridSeq(S.grids.length);

    if (S.variants) {
      S.variants.push({
        id: `var_${rm.id}_a`,
        roomId: rm.id,
        gridId: newGridId,
        name: 'Variants A',
        modules: [],
        panels: [],
        artworks: [],
        updated: Date.now(),
        isArchived: false
      });
      if (!S.activeRoomVariants) S.activeRoomVariants = {};
      S.activeRoomVariants[rm.id] = `var_${rm.id}_a`;
    }

    await activateExhibitionRoom(S.exhibition.rooms.length - 1);
    if (EW.UI) EW.UI.toast(`Zāle “${rm.name}” pievienota ekspozīcijai`);
    return true;
  }

  /**
   * Izveido autentisku arhitektūras plāna pamatni ar fiksētajiem elementiem:
   * Kolonnām, ieejām, izejām, logiem un evakuācijas ceļiem.
   */
  function createSyntheticPlanCanvas(rooms, totalWidthM) {
    const scale = 50; // 50 px uz metru
    const rm = (rooms && rooms[0]) ? rooms[0] : { widthM: totalWidthM || 30, heightM: 20, name: 'Izstāžu zāle' };
    const wM = rm.widthM || 30;
    const hM = rm.heightM || 20;

    const padM = 3.0;
    const canvasW = Math.round((wM + padM * 2) * scale);
    const canvasH = Math.round((hM + padM * 2) * scale);

    const cv = document.createElement('canvas');
    cv.width = canvasW;
    cv.height = canvasH;
    const ctx = cv.getContext('2d');

    // 1. Gaišs arhitektonisks rasējuma papīra fons
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvasW, canvasH);

    const startX = padM * scale;
    const startY = padM * scale;
    const rw = wM * scale;
    const rh = hM * scale;

    // 2. Telpas grīdas laukums
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(startX, startY, rw, rh);

    // 3. Masīvas nesošās ārsienas (450mm ar dubultu štrihu)
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 14;
    ctx.strokeRect(startX, startY, rw, rh);

    // Iekšējā apmetuma līnija
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX + 6, startY + 6, rw - 12, rh - 12);

    // 4. Logu ailes gar fasādes sienu (augšā un/vai apakšā)
    ctx.fillStyle = '#f8fafc';
    const numWindows = Math.max(2, Math.floor(wM / 5));
    const winWidth = 2.4 * scale;
    const winStep = rw / (numWindows + 1);

    for (let i = 1; i <= numWindows; i++) {
      const wx = startX + i * winStep - winWidth / 2;
      // Augšējā siena (logi)
      ctx.fillRect(wx, startY - 8, winWidth, 16);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx, startY - 2);
      ctx.lineTo(wx + winWidth, startY - 2);
      ctx.moveTo(wx, startY + 2);
      ctx.lineTo(wx + winWidth, startY + 2);
      ctx.stroke();
    }

    // 5. Ieejas un izejas durvis ar atvēruma lokiem
    // Galvenā ieeja (apakšā centrā)
    const doorW = 1.6 * scale;
    const doorX = startX + rw / 2 - doorW / 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(doorX, startY + rh - 9, doorW, 18);

    // Durvju atvēruma loks
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(doorX, startY + rh, doorW, -Math.PI / 2, 0, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(doorX, startY + rh);
    ctx.lineTo(doorX, startY + rh - doorW);
    ctx.stroke();

    // Ieejas birka
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚪 GALVENĀ IEEJA', doorX + doorW / 2, startY + rh + 20);

    // Evakuācijas izeja (kreisajā sānā)
    const exitY = startY + rh / 2 - doorW / 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(startX - 9, exitY, 18, doorW);

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(startX, exitY, doorW, 0, Math.PI / 2, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(startX, exitY);
    ctx.lineTo(startX + doorW, exitY);
    ctx.stroke();

    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🚪 EVAKUĀCIJAS IZEJA', startX + 6, exitY - 8);

    // 6. Fiksētās nesošās kolonnas telpas iekšienē
    // Ja zāle ir pietiekami liela (> 10x8m), izvietojam vēsturiskās nesošās kolonnas
    if (wM >= 12 && hM >= 9) {
      const colRows = hM >= 16 ? 2 : 1;
      const colCols = Math.max(2, Math.floor(wM / 7));
      const colW = 0.65 * scale;

      for (let r = 1; r <= colRows; r++) {
        const cy = startY + (rh * r) / (colRows + 1);
        for (let c = 1; c <= colCols; c++) {
          const cx = startX + (rw * c) / (colCols + 1);

          // Kolonnas ēna un pamatne
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(cx - colW / 2, cy - colW / 2, colW, colW, 4);
          } else {
            ctx.rect(cx - colW / 2, cy - colW / 2, colW, colW);
          }
          ctx.fill();

          // Kolonnas asu krustpunkts
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx - colW / 2, cy);
          ctx.lineTo(cx + colW / 2, cy);
          ctx.moveTo(cx, cy - colW / 2);
          ctx.lineTo(cx, cy + colW / 2);
          ctx.stroke();

          // Kolonnas numurs
          ctx.fillStyle = '#94a3b8';
          ctx.font = '8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`K${r}.${c}`, cx, cy + colW / 2 + 10);
        }
      }
    }

    // 7. Evakuācijas eju virzienu vadlīnijas
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(startX + rw / 2, startY + 40);
    ctx.lineTo(startX + rw / 2, startY + rh - 10);
    ctx.moveTo(startX + rw / 2, startY + rh / 2);
    ctx.lineTo(startX + 10, startY + rh / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 8. Perimetra drošības zona (margin atkāpe no sienām)
    const margin = rm.marginM !== undefined ? rm.marginM : 1.0;
    if (margin > 0) {
      ctx.strokeStyle = 'rgba(234, 88, 12, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      const mPx = margin * scale;
      ctx.strokeRect(startX + mPx, startY + mPx, rw - mPx * 2, rh - mPx * 2);
      ctx.setLineDash([]);
    }

    // 9. Ziemeļu virziena bulta (North Arrow)
    const nX = startX + rw - 35;
    const nY = startY + 35;
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(nX, nY - 18);
    ctx.lineTo(nX - 7, nY + 10);
    ctx.lineTo(nX, nY + 4);
    ctx.lineTo(nX + 7, nY + 10);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', nX, nY - 22);

    // 10. Telpas nosaukuma un izmēru anotācijas
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(rm.name, startX + 24, startY + 24);

    ctx.fillStyle = '#64748b';
    ctx.font = '13px monospace';
    ctx.fillText(`Izmēri: ${wM}m × ${hM}m · Režģis: ${((rm.step || 0.5) * 1000).toFixed(0)}mm · Atkāpe: ${margin}m`, startX + 24, startY + 52);

    S.img = cv;
    S.pdf = null;
    S.vp = null;
    S.R = 1;
    S.mppPt = (rm && rm.mppPt) ? rm.mppPt : (1 / scale);
    S.denom = (rm && rm.defaultScale) ? rm.defaultScale : 100;
  }

  EW.Venues = {
    init,
    BUILDINGS,
    getBuildings,
    getBuilding,
    getRoom,
    isAdmin,
    setAdmin,
    toggleAdmin,
    updateAdminUI,
    loadRoomTemplateToStage,
    renderAdminSidebar,
    onRegionDrawn,
    syncAdminInputsFromGrid,
    createExhibition,
    activateExhibitionRoom,
    renderExhibitionRoomTabs,
    addRoomToActiveExhibition,
    saveRoomTemplate,
    duplicateRoomTemplate,
    deleteRoomTemplate,
    deleteRoomTemplateConfirm,
    restoreDefaultTemplates,
    exportTemplatesJson,
    importTemplatesJson,
    openTemplateAdminModal,
    closeTemplateAdminModal,
    renderAdminTemplatesList,
    fillTemplateEditor,
    resetTemplateEditor,
    renderRoomTemplatePreview,
    onScaleCalibrated,
    propagateRoomTemplateUpdate
  };
})();
