/**
 * Easy walls 2.0 — Mākslas darbu (eksponātu) pārvaldība, Excel imports un snapošana pie sienām
 * 
 * Nodrošina:
 * 1. Eksponātu datu modeli (platums, augstums, svars, montāžas augstums)
 * 2. Excel / CSV importu un tiešu copy-paste no tabulas
 * 3. Magnētisko snapošanu pie moduļa skaldnes ar 10 cm soli
 * 4. Bīdīšanu gar sienas skaldni un starp kaimiņmoduļiem
 * 5. Labā klikšķa konteksta izvēlni (Lock/Unlock, pārlikšana uz otru pusi, noņemšana)
 */
window.EW = window.EW || {};

(function() {
  const S = EW.State;
  const Grid = EW.Grid;
  const U = EW.Utils;

  // Inicializējam eksponātu masīvu stāvoklī
  S.artworks = S.artworks || [];
  S.selectedArtworkId = null;

  let dragArtState = null;
  let artSeq = 0;

  // Attēlu kešatmiņa Canvas un 3D renderēšanai
  const imgCache = new Map();

  function getLoadedImage(url) {
    if (!url) return null;
    if (imgCache.has(url)) {
      const entry = imgCache.get(url);
      return (entry.complete && entry.naturalWidth > 0) ? entry : null;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    imgCache.set(url, img);
    img.onload = () => {
      if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
      if (EW.Elevation && EW.Elevation.draw) EW.Elevation.draw();
    };
    return null;
  }

  /**
   * Klientspuses attēla optimizācija (mērogošana un saspiešana)
   */
  function processArtworkImageFile(file, maxDim = 1200, quality = 0.85) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        return reject(new Error('Izvēlētais fails nav attēls'));
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const origW = img.naturalWidth || img.width;
          const origH = img.naturalHeight || img.height;
          const aspect = origW / origH;
          const s = Math.min(1, maxDim / Math.max(origW, origH));
          const w = Math.round(origW * s);
          const h = Math.round(origH * s);

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(mime, quality);

          resolve({
            dataUrl,
            widthPx: origW,
            heightPx: origH,
            aspectRatio: Math.round(aspect * 100) / 100
          });
        };
        img.onerror = () => reject(new Error('Neizdevās nolasīt attēlu'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Kļūda lasot failu'));
      reader.readAsDataURL(file);
    });
  }

  function newArtworkId() {
    artSeq++;
    return `art_${artSeq}`;
  }

  /**
   * Pievieno jaunu mākslas darbu
   */
  function addArtwork(data) {
    const w = Math.max(0.2, Math.round((data.width || 1.0) * 100) / 100);
    const h = Math.max(0.2, Math.round((data.height || 1.2) * 100) / 100);

    const art = {
      id: data.id || (data.invNo ? data.invNo.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : newArtworkId()),
      title: (data.title || 'Mākslas darbs').trim(),
      author: (data.author || '').trim(),
      invNo: (data.invNo || '').trim(),
      year: (data.year !== undefined && data.year !== null ? data.year : '').toString().trim(),
      technique: (data.technique || '').trim(),
      width: w,   // metri
      height: h, // metri
      weight: Math.max(1.0, Math.round((data.weight || 25) * 10) / 10),    // kg
      depth: Math.max(0.04, Math.round((data.depth || 0.08) * 100) / 100), // biezums m
      elevation: Math.round((data.elevation !== undefined ? data.elevation : 1.20) * 10) / 10, // 10 cm solis no grīdas
      imageUrl: data.imageUrl || null,
      aspectRatio: data.aspectRatio || Math.round((w / h) * 100) / 100,
      moduleId: data.moduleId || null,
      wallSide: data.wallSide || 'front', // 'front' | 'back'
      posOnWall: Math.round((data.posOnWall || 0) * 10) / 10, // 10 cm solis gar moduli
      locked: !!data.locked
    };

    if (art.imageUrl) {
      getLoadedImage(art.imageUrl);
    }

    S.artworks.push(art);
    renderUI();
    if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
    return art;
  }

  /**
   * Noņem mākslas darbu no sistēmas
   */
  function removeArtwork(id) {
    const idx = S.artworks.findIndex(a => a.id === id);
    if (idx >= 0) {
      S.artworks.splice(idx, 1);
      if (S.selectedArtworkId === id) S.selectedArtworkId = null;
      renderUI();
      if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
      if (EW.UI) EW.UI.toast('Mākslas darbs dzēsts');
    }
  }

  /**
   * Noņem mākslas darbu no sienas (atgriež neizvietoto sarakstā)
   */
  function detachArtworkFromWall(id) {
    const art = S.artworks.find(a => a.id === id);
    if (art) {
      art.moduleId = null;
      art.locked = false;
      renderUI();
      if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
      if (EW.UI) EW.UI.toast(`Darbs “${art.title}” noņemts no sienas`);
    }
  }

  /**
   * Pārslēdz mākslas darba bloķēšanas statusu (Lock / Unlock)
   */
  function toggleLockArtwork(id) {
    const art = S.artworks.find(a => a.id === id);
    if (art) {
      art.locked = !art.locked;
      renderUI();
      if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
      if (EW.UI) EW.UI.toast(art.locked ? `🔒 “${art.title}” nobloķēts` : `🔓 “${art.title}” atbloķēts`);
    }
  }

  /**
   * Pārliek darbu uz otru sienas pusi (front <-> back)
   */
  function flipArtworkSide(id) {
    const art = S.artworks.find(a => a.id === id);
    if (!art || !art.moduleId) return;
    art.wallSide = art.wallSide === 'front' ? 'back' : 'front';
    renderUI();
    if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
    if (EW.UI) EW.UI.toast(`Darbs pārvietots uz sienas ${art.wallSide === 'front' ? 'priekšpusi' : 'aizmuguri'}`);
  }

  /**
   * Piesaista neizvietotu darbu pie moduļa
   */
  function attachToModule(artId, moduleId, wallSide = 'front', posOnWall = 0) {
    const art = S.artworks.find(a => a.id === artId);
    const mod = S.modules.find(m => m.id === moduleId);
    if (!art || !mod) return;

    art.moduleId = mod.id;
    art.wallSide = wallSide;
    art.posOnWall = Math.round(posOnWall * 10) / 10;
    art.locked = false;

    renderUI();
    if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
    if (EW.UI) EW.UI.toast(`Darbs “${art.title}” pievienots pie moduļa ${mod.id}`);
  }

  /**
   * Parsē no Excel iekopētu tekstu (TSV / CSV)
   * Kolonnas var būt: Nosaukums, Autors, Platums, Augstums, Svars
   */
  function parsePastedTable(rawText) {
    if (!rawText || !rawText.trim()) return [];

    const trimmed = rawText.trim();
    // 1. Pārbaudām, vai ievadīts tiešs JSON formāts (masīvs vai objekts ar artworks)
    if (trimmed.startsWith('[') || (trimmed.startsWith('{') && (trimmed.includes('"artworks"') || trimmed.includes('"title"') || trimmed.includes('"invNo"')))) {
      try {
        const data = JSON.parse(trimmed);
        const list = Array.isArray(data) ? data : (data.artworks || [data]);
        return list.map((it, i) => {
          const invNo = (it.invNo || it.inv || it.id || '').trim();
          const w = parseDimension(it.width || it.platums);
          const h = parseDimension(it.height || it.augstums);
          return {
            id: it.id || (invNo ? invNo.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : `art_${i + 1}`),
            invNo,
            title: (it.title || it.nosaukums || `Eksponāts ${i + 1}`).trim(),
            author: (it.author || it.autors || '').trim(),
            year: (it.year !== undefined && it.year !== null ? it.year : (it.gads || '')).toString().trim(),
            technique: (it.technique || it.tehnika || '').trim(),
            width: w,
            height: h,
            weight: parseWeight(it.weight || it.svars),
            depth: parseDimension(it.depth || it.biezums || 0.08),
            elevation: it.elevation !== undefined ? Math.round(parseDimension(it.elevation) * 10) / 10 : 1.20,
            imageUrl: it.imageUrl || it.image || it.attels || null,
            aspectRatio: it.aspectRatio || Math.round((w / h) * 100) / 100
          };
        });
      } catch (e) {
        // Ja JSON parsēšana neizdevās, turpinām ar tabulas parsēšanu
      }
    }

    const lines = rawText.trim().split(/\r?\n/);
    if (!lines.length) return [];

    // Noteikt atdalītāju (tabulācija no Excel, semikols vai komats)
    const firstLine = lines[0];
    let sep = '\t';
    if (firstLine.includes('\t')) sep = '\t';
    else if (firstLine.includes(';')) sep = ';';
    else if (firstLine.includes(',')) sep = ',';

    const header = lines[0].split(sep).map(s => s.trim().toLowerCase());
    
    // Meklējam kolonnu indeksus
    let idxInv = header.findIndex(h => h.includes('inv') || h.includes('numur') || h.includes('nr') || h.includes('kods') || h === 'id');
    let idxTitle = header.findIndex(h => h.includes('nosauk') || h.includes('darbs') || h.includes('title') || h.includes('name'));
    let idxAuthor = header.findIndex(h => h.includes('autor') || h.includes('mākslin') || h.includes('artist'));
    let idxYear = header.findIndex(h => h.includes('gad') || h.includes('year'));
    let idxTech = header.findIndex(h => h.includes('tehn') || h.includes('tech') || h.includes('medij'));
    let idxWidth = header.findIndex(h => h.includes('plat') || h.includes('width') || h === 'w');
    let idxHeight = header.findIndex(h => h.includes('augst') || h.includes('height') || h === 'h');
    let idxWeight = header.findIndex(h => h.includes('svar') || h.includes('mas') || h.includes('weight') || h.includes('kg'));
    let idxElevation = header.findIndex(h => h.includes('mont') || h.includes('grīd') || h.includes('elev'));
    let idxImage = header.findIndex(h => h.includes('attēl') || h.includes('foto') || h.includes('image') || h.includes('url') || h.includes('png') || h.includes('jpg'));

    let startRow = 1;
    // Ja pirmajā rindā nav vārdiska galvene, pieņemam fiksētu secību
    if (idxTitle === -1 && idxWidth === -1) {
      startRow = 0;
      idxTitle = 0;
      idxWidth = 1;
      idxHeight = 2;
      idxWeight = 3;
    }

    const imported = [];
    for (let i = startRow; i < lines.length; i++) {
      const parts = lines[i].split(sep).map(s => s.trim());
      if (!parts || parts.length < 2 || !parts.some(p => p.length > 0)) continue;

      const invNo = idxInv >= 0 ? parts[idxInv] : '';
      const title = idxTitle >= 0 ? parts[idxTitle] : `Eksponāts ${i}`;
      const author = idxAuthor >= 0 ? parts[idxAuthor] : '';
      const year = idxYear >= 0 ? parts[idxYear] : '';
      const technique = idxTech >= 0 ? parts[idxTech] : '';

      // Izmēru un svara parsēšana (pieņem cm, mm, m un komatus)
      let w = parseDimension(idxWidth >= 0 ? parts[idxWidth] : '1.2');
      let h = parseDimension(idxHeight >= 0 ? parts[idxHeight] : '1.5');
      let wt = parseWeight(idxWeight >= 0 ? parts[idxWeight] : '25');
      let elev = idxElevation >= 0 ? parseDimension(parts[idxElevation]) : 1.20;
      let imgUrl = idxImage >= 0 && parts[idxImage] ? parts[idxImage] : null;

      imported.push({
        id: invNo ? invNo.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : undefined,
        invNo,
        title: title || `Darbs ${i}`,
        author,
        year,
        technique,
        width: w,
        height: h,
        weight: wt,
        elevation: Math.round(elev * 10) / 10,
        imageUrl: imgUrl
      });
    }

    return imported;
  }

  function parseDimension(val) {
    if (!val) return 1.0;
    const num = U.num(val);
    if (!num || num <= 0) return 1.0;
    // Ja ievadīts mm (> 100) -> pārvēršam metros
    if (num >= 100) return Math.round((num / 1000) * 100) / 100;
    // Ja ievadīts cm (10 .. 99) -> pārvēršam metros
    if (num >= 10 && num < 100) return Math.round((num / 100) * 100) / 100;
    return Math.round(num * 100) / 100;
  }

  function parseWeight(val) {
    if (!val) return 20;
    const num = U.num(val);
    return num && num > 0 ? Math.round(num * 10) / 10 : 20;
  }

  /**
   * Aprēķina pie moduļa piekārta darba centru pasaules koordinātēs
   */
  function getSnappedArtCenterW(art, mod, grid) {
    const g = grid || (S.grids || []).find(x => x.id === mod.gridId) || S.G();
    const modRad = (mod.rot || 0) * Math.PI / 180;
    const lx = art.posOnWall || 0;
    const artTh = art.depth || 0.08;
    const halfW = 0.50; // moduļa puse-biezums (1.0m kopējais)
    const ly = art.wallSide === 'front' ? -(halfW + artTh / 2) : (halfW + artTh / 2);
    const gx = mod.x + lx * Math.cos(modRad) - ly * Math.sin(modRad);
    const gy = mod.y + lx * Math.sin(modRad) + ly * Math.cos(modRad);
    return Grid.g2w(g, gx, gy);
  }

  function getArtCenterW(art) {
    if (!art) return null;
    if (art.moduleId) {
      const mod = (S.modules || []).find(m => m.id === art.moduleId);
      if (mod) return getSnappedArtCenterW(art, mod);
    }
    if (art.x !== undefined && art.y !== undefined) {
      return { x: art.x, y: art.y };
    }
    return null;
  }

  /**
   * Meklē tuvāko moduļa skaldni magnētiskai pievilkšanai (Magnetic Wall Snap)
   */
  function findNearestModuleSnap(targetW, art, activeGrid, snapRadius = 0.28) {
    if (!S.modules || !S.modules.length) return null;
    const g = activeGrid || S.G();
    if (!g) return null;

    let bestSnap = null;
    let minDist = snapRadius;

    for (let i = 0; i < S.modules.length; i++) {
      const mod = S.modules[i];
      if (mod.gridId && g.id && mod.gridId !== g.id) continue;

      const gMod = (S.grids || []).find(x => x.id === mod.gridId) || g;
      const gp = Grid.w2g(gMod, targetW.x, targetW.y);
      const modRad = (mod.rot || 0) * Math.PI / 180;
      const cos = Math.cos(-modRad);
      const sin = Math.sin(-modRad);
      const relX = gp.x - mod.x;
      const relY = gp.y - mod.y;
      const lx = relX * cos - relY * sin;
      const ly = relX * sin + relY * cos;

      const halfL = (mod.type === 'large' ? 2.0 : 1.0) / 2;
      const halfW = 0.50; // moduļa puse-biezums
      const margin = 0.20;

      if (lx >= -halfL - margin && lx <= halfL + margin) {
        const distFront = Math.abs(ly - (-halfW));
        const distBack = Math.abs(ly - (halfW));
        const d = Math.min(distFront, distBack);
        if (d < minDist) {
          minDist = d;
          const artW = art.width || 1.0;
          const maxBound = halfL - artW / 4;
          const clampedPos = Math.max(-maxBound - 0.2, Math.min(maxBound + 0.2, Math.round(lx * 10) / 10));
          bestSnap = {
            mod,
            wallSide: distFront < distBack ? 'front' : 'back',
            posOnWall: clampedPos,
            dist: d
          };
        }
      }
    }

    return bestSnap;
  }

  /**
   * Pārbauda, vai peles koordinātas (World) trāpa kādam mākslas darbam (gan uz sienas, gan brīvam)
   */
  function hitTestArtwork(worldPos) {
    if (!S.artworks || !S.artworks.length) return null;
    const dims = EW.Renderer && EW.Renderer.getDims ? EW.Renderer.getDims() : { W: 1000, H: 800 };
    const { W, H } = dims;
    const activeGrid = S.G();
    const isMultiRoomExp = !!(S.exhibition && S.exhibition.rooms && S.exhibition.rooms.length > 1);
    const sc = Grid.w2s(worldPos.x, worldPos.y, W, H);

    // 1. Pārbaudām brīvos mākslas darbus (freestanding / telpā)
    for (let i = S.artworks.length - 1; i >= 0; i--) {
      const art = S.artworks[i];
      if (art.moduleId) continue;
      if (art.x === undefined || art.y === undefined) continue;
      if (isMultiRoomExp && activeGrid && art.gridId && art.gridId !== activeGrid.id) continue;

      const sp = Grid.w2s(art.x, art.y, W, H);
      const distPx = Math.hypot(sc.x - sp.x, sc.y - sp.y);
      const artW = art.width || 1.0;
      const artTh = Math.max(art.depth || 0.08, 0.25);

      // Trāpījums centrālajā gizmo rokturī (ekrāna pikseļos) vai taisnstūra laukumā
      const hitGizmo = distPx <= 18;
      const hitBox = (
        Math.abs(worldPos.x - art.x) <= artW / 2 + 0.08 &&
        Math.abs(worldPos.y - art.y) <= artTh / 2 + 0.08
      );

      if (hitGizmo || hitBox) {
        return { art, isFree: true, grid: activeGrid };
      }
    }

    // 2. Pārbaudām pie sienu moduļiem piekārtos mākslas darbus
    for (let i = S.artworks.length - 1; i >= 0; i--) {
      const art = S.artworks[i];
      if (!art.moduleId) continue;

      const mod = S.modules.find(m => m.id === art.moduleId);
      if (!mod) continue;

      const g = (S.grids || []).find(x => x.id === mod.gridId) || activeGrid;
      if (!g || !g.visible) continue;
      if (isMultiRoomExp && activeGrid && mod.gridId !== activeGrid.id) continue;

      const centerW = getSnappedArtCenterW(art, mod, g);
      const sp = Grid.w2s(centerW.x, centerW.y, W, H);
      const distPx = Math.hypot(sc.x - sp.x, sc.y - sp.y);
      if (distPx <= 18) {
        return { art, mod, isFree: false, grid: g };
      }

      // Pārbaudām moduļa lokālajā koordinātu sistēmā
      const gp = Grid.w2g(g, worldPos.x, worldPos.y);
      const modAngleRad = (mod.rot || 0) * Math.PI / 180;
      const cos = Math.cos(-modAngleRad);
      const sin = Math.sin(-modAngleRad);
      const dx = gp.x - mod.x;
      const dy = gp.y - mod.y;
      const lx = dx * cos - dy * sin;
      const ly = dx * sin + dy * cos;

      const sideY = (art.wallSide === 'front' ? -0.50 : 0.50);
      const artThickness = art.depth || 0.08;
      const artYCenter = sideY + (art.wallSide === 'front' ? -artThickness / 2 : artThickness / 2);

      const halfW = (art.width || 1.0) / 2;
      const xMin = (art.posOnWall || 0) - halfW;
      const xMax = (art.posOnWall || 0) + halfW;
      const yMin = Math.min(sideY, artYCenter - artThickness / 2) - 0.12;
      const yMax = Math.max(sideY, artYCenter + artThickness / 2) + 0.12;

      if (lx >= xMin && lx <= xMax && ly >= yMin && ly <= yMax) {
        return { art, mod, isFree: false, grid: g };
      }
    }
    return null;
  }

  /**
   * Apstrādā peles nospiešanu virs mākslas darba
   */
  function onPointerDown(e) {
    const cv = EW.Renderer.getCanvas();
    const { W, H } = EW.Renderer.getDims();
    const r = cv.getBoundingClientRect();
    const wp = Grid.s2w(e.clientX - r.left, e.clientY - r.top, W, H);

    const hit = hitTestArtwork(wp);
    if (hit) {
      if (e.button === 2) {
        showContextMenu(e.clientX, e.clientY, hit.art);
        return true;
      }

      if (hit.art.locked) {
        if (EW.UI) EW.UI.toast(`🔒 “${hit.art.title}” ir nobloķēts. Ar labo klikšķi var atbloķēt.`);
        return true;
      }

      const centerW = hit.isFree 
        ? { x: hit.art.x, y: hit.art.y } 
        : getSnappedArtCenterW(hit.art, hit.mod, hit.grid);

      dragArtState = {
        art: hit.art,
        isFree: hit.isFree,
        mod: hit.mod || null,
        grid: hit.grid || S.G(),
        startPointerW: { x: wp.x, y: wp.y },
        startArtCenterW: centerW,
        isSnapped: !hit.isFree,
        hasMoved: false
      };
      S.selectedArtworkId = hit.art.id;
      renderUI();
      if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
      return true;
    }

    hideContextMenu();
    return false;
  }

  /**
   * Apstrādā mākslas darba brīvu 2D pārvietošanu un snapošanu pie sienām
   */
  function onPointerMove(e) {
    if (!dragArtState) return false;

    const cv = EW.Renderer.getCanvas();
    const { W, H } = EW.Renderer.getDims();
    const r = cv.getBoundingClientRect();
    const wp = Grid.s2w(e.clientX - r.left, e.clientY - r.top, W, H);

    const dx = wp.x - dragArtState.startPointerW.x;
    const dy = wp.y - dragArtState.startPointerW.y;
    if (Math.hypot(dx, dy) > 0.02) {
      dragArtState.hasMoved = true;
    }

    const targetW = {
      x: dragArtState.startArtCenterW.x + dx,
      y: dragArtState.startArtCenterW.y + dy
    };

    const activeGrid = dragArtState.grid || S.G();

    // 1. Ja eksponāts pašlaik ir piekārts pie sienas moduļa:
    if (dragArtState.isSnapped && dragArtState.mod) {
      const mod = dragArtState.mod;
      const gMod = (S.grids || []).find(g => g.id === mod.gridId) || activeGrid;
      const targetG = Grid.w2g(gMod, targetW.x, targetW.y);
      const modAngleRad = (mod.rot || 0) * Math.PI / 180;
      const cos = Math.cos(-modAngleRad);
      const sin = Math.sin(-modAngleRad);
      const relX = targetG.x - mod.x;
      const relY = targetG.y - mod.y;
      const lx = relX * cos - relY * sin;
      const ly = relX * sin + relY * cos;

      const sideY = dragArtState.art.wallSide === 'front' ? -0.50 : 0.50;
      const distPerp = Math.abs(ly - sideY);
      const halfL = (mod.type === 'large' ? 2.0 : 1.0) / 2;

      // DINAMISKĀ ATVIENOŠANA (Unsnap): ja novelk > 35 cm prom no sienas vai > 40 cm aiz moduļa galiem
      if (distPerp > 0.35 || lx < -halfL - 0.40 || lx > halfL + 0.40) {
        dragArtState.isSnapped = false;
        dragArtState.art.moduleId = null;
        dragArtState.art.x = targetW.x;
        dragArtState.art.y = targetW.y;
        dragArtState.art.gridId = activeGrid ? activeGrid.id : null;
        dragArtState.mod = null;
      } else {
        // Pārvietošanās pa sienas skaldni ar 10 cm soli
        const artW = dragArtState.art.width || 1.0;
        const maxBound = halfL - artW / 4;
        const rawStep = Math.round(lx * 10) / 10;
        dragArtState.art.posOnWall = Math.max(-maxBound - 0.2, Math.min(maxBound + 0.2, rawStep));

        // Pārslēgšana starp fasādes pusēm (front <-> back)
        if (ly > 0.10 && dragArtState.art.wallSide === 'front') {
          dragArtState.art.wallSide = 'back';
        } else if (ly < -0.10 && dragArtState.art.wallSide === 'back') {
          dragArtState.art.wallSide = 'front';
        }
      }
    }

    // 2. Ja eksponāts ir brīvā 2D kustības režīmā (vai tikko atvienots):
    if (!dragArtState.isSnapped) {
      dragArtState.art.x = targetW.x;
      dragArtState.art.y = targetW.y;
      dragArtState.art.gridId = activeGrid ? activeGrid.id : null;

      // Magnētiskā snapošana pie jebkuras tuvākās sienas (< 25 cm)
      const snapCandidate = findNearestModuleSnap(targetW, dragArtState.art, activeGrid, 0.25);
      if (snapCandidate && snapCandidate.mod) {
        dragArtState.isSnapped = true;
        dragArtState.mod = snapCandidate.mod;
        dragArtState.art.moduleId = snapCandidate.mod.id;
        dragArtState.art.wallSide = snapCandidate.wallSide;
        dragArtState.art.posOnWall = snapCandidate.posOnWall;
        delete dragArtState.art.x;
        delete dragArtState.art.y;
      }
    }

    if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
    return true;
  }

  function onPointerUp(e) {
    if (dragArtState) {
      if (dragArtState.isSnapped && dragArtState.mod) {
        dragArtState.art.moduleId = dragArtState.mod.id;
        delete dragArtState.art.x;
        delete dragArtState.art.y;
      } else {
        dragArtState.art.moduleId = null;
      }
      dragArtState = null;
      renderUI();
      if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
      return true;
    }
    return false;
  }

  /**
   * Zīmē centrālo satveršanas punktu / Pivot Gizmo rokturi
   */
  function drawPivotGizmo(ctx, x, y, px, isSel, isLight) {
    const rOuter = px * (isSel ? 9.5 : 7.5);
    const rInner = px * (isSel ? 7.0 : 5.2);
    const rDot = px * 2.2;

    ctx.save();
    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.40)';
    ctx.shadowBlur = px * 5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = px * 1.5;

    // Ārējais gredzens (izcēlums atlasītajam)
    ctx.fillStyle = isSel ? '#0284c7' : (isLight ? '#d97706' : '#f59e0b');
    ctx.beginPath();
    ctx.arc(x, y, rOuter, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Balts starpgredzens
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, rInner, 0, Math.PI * 2);
    ctx.fill();

    // Centrālais kodols
    ctx.fillStyle = isSel ? '#0284c7' : (isLight ? '#b45309' : '#d97706');
    ctx.beginPath();
    ctx.arc(x, y, rDot, 0, Math.PI * 2);
    ctx.fill();

    // 4 virzienu roktura krustiņš (norāde uz brīvu 2D manipulāciju)
    const tickLen = px * 3;
    const tickOff = rOuter + px * 1.2;
    ctx.strokeStyle = isSel ? '#0284c7' : (isLight ? '#b45309' : '#f59e0b');
    ctx.lineWidth = px * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y - tickOff);
    ctx.lineTo(x, y - tickOff - tickLen);
    ctx.moveTo(x, y + tickOff);
    ctx.lineTo(x, y + tickOff + tickLen);
    ctx.moveTo(x - tickOff, y);
    ctx.lineTo(x - tickOff - tickLen, y);
    ctx.moveTo(x + tickOff, y);
    ctx.lineTo(x + tickOff + tickLen, y);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Zīmē brīvos mākslas darbus un ievilkšanas (Drag & Drop) priekšskatījumu
   */
  function drawArtworks(ctx, W, H) {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const px = 1 / S.view.z;
    const activeGrid = S.G();
    const isMultiRoomExp = !!(S.exhibition && S.exhibition.rooms && S.exhibition.rooms.length > 1);

    // 1. Zīmējam telpā brīvos mākslas darbus
    (S.artworks || []).forEach(art => {
      if (art.moduleId) return; // Snapped darbi tiek zīmēti pie moduļa
      if (art.x === undefined || art.y === undefined) return;
      if (isMultiRoomExp && activeGrid && art.gridId && art.gridId !== activeGrid.id) return;

      const isSel = S.selectedArtworkId === art.id;
      const sp = Grid.w2s(art.x, art.y, W, H);
      const artW = art.width || 1.0;
      const artTh = art.depth || 0.08;

      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.scale(S.view.z, S.view.z);

      // Mākslas darba rāmis
      ctx.fillStyle = isLight ? '#fefce8' : '#1c1917';
      ctx.strokeStyle = isSel 
        ? (isLight ? '#0284c7' : '#38bdf8') 
        : (isLight ? '#b45309' : '#f59e0b');
      ctx.lineWidth = px * (isSel ? 2.5 : 1.6);

      ctx.fillRect(-artW / 2, -artTh / 2, artW, artTh);
      ctx.strokeRect(-artW / 2, -artTh / 2, artW, artTh);

      // Etiķete
      ctx.fillStyle = isLight ? '#78350f' : '#fde68a';
      ctx.font = '600 ' + Math.max(0.10, px * 8.5) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lockIcon = art.locked ? '🔒 ' : '';
      ctx.fillText(`${lockIcon}${art.title} (${art.weight}kg)`, 0, -artTh / 2 - 0.12);

      // Centrālais Pivot Gizmo rokturis
      drawPivotGizmo(ctx, 0, 0, px, isSel, isLight);

      ctx.restore();
    });

    // 2. Drag & Drop priekšskatījums no kataloga
    if (S.dragPreviewArt && S.dragPreviewArt.art) {
      const { art, x, y, snapGhost } = S.dragPreviewArt;
      if (snapGhost && snapGhost.mod) {
        const mod = snapGhost.mod;
        const gMod = (S.grids || []).find(g => g.id === mod.gridId) || activeGrid;
        const wp = Grid.g2w(gMod, mod.x, mod.y);
        const sp = Grid.w2s(wp.x, wp.y, W, H);
        const totalAngle = ((gMod.angle || 0) + (mod.rot || 0)) * Math.PI / 180;
        const halfW = 0.50;
        const artW = art.width || 1.0;
        const artTh = art.depth || 0.08;
        const sideY = snapGhost.wallSide === 'front' ? -halfW : halfW;
        const artY = sideY + (snapGhost.wallSide === 'front' ? -artTh / 2 : artTh / 2);
        const posX = snapGhost.posOnWall || 0;

        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(totalAngle);
        ctx.scale(S.view.z, S.view.z);

        ctx.fillStyle = 'rgba(2, 132, 199, 0.25)';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = px * 2;
        ctx.setLineDash([px * 4, px * 3]);
        ctx.fillRect(posX - artW / 2, artY - artTh / 2, artW, artTh);
        ctx.strokeRect(posX - artW / 2, artY - artTh / 2, artW, artTh);
        ctx.setLineDash([]);

        drawPivotGizmo(ctx, posX, artY, px, true, isLight);
        ctx.restore();
      } else {
        const sp = Grid.w2s(x, y, W, H);
        const artW = art.width || 1.0;
        const artTh = art.depth || 0.08;

        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.scale(S.view.z, S.view.z);

        ctx.fillStyle = 'rgba(2, 132, 199, 0.25)';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = px * 2;
        ctx.setLineDash([px * 4, px * 3]);
        ctx.fillRect(-artW / 2, -artTh / 2, artW, artTh);
        ctx.strokeRect(-artW / 2, -artTh / 2, artW, artTh);
        ctx.setLineDash([]);

        drawPivotGizmo(ctx, 0, 0, px, true, isLight);
        ctx.restore();
      }
    }
  }

  /**
   * Konteksta izvēlne ar labo peles taustiņu
   */
  function showContextMenu(clientX, clientY, art) {
    let menu = document.getElementById('artContextMenu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'artContextMenu';
      menu.className = 'context-menu';
      document.body.appendChild(menu);
    }

    const isPlacedOnWall = !!art.moduleId;
    menu.innerHTML = `
      <div class="menu-header"><b>${U.esc(art.title)}</b> (${art.weight} kg) ${isPlacedOnWall ? '' : '<span style="color:var(--accent);font-size:10px">[Brīvs eksponāts]</span>'}</div>
      <button id="ctxLock">${art.locked ? '🔓 Atbloķēt (Unlock)' : '🔒 Bloķēt (Lock)'}</button>
      ${isPlacedOnWall ? `<button id="ctxFlip">↔️ Pārlikt uz ${art.wallSide === 'front' ? 'aizmuguri' : 'priekšpusi'}</button>` : ''}
      <button id="ctxElev">📏 Montāžas augstums (${art.elevation}m)...</button>
      ${isPlacedOnWall ? `<button id="ctxOpenElev">🖼️ Sienas fasādes izklājums</button>` : ''}
      <div class="menu-sep"></div>
      <button id="ctxDetach" style="color:var(--danger)">❌ ${isPlacedOnWall ? 'Noņemt no sienas' : 'Noņemt no telpas'}</button>
    `;

    menu.style.left = `${clientX + 2}px`;
    menu.style.top = `${clientY + 2}px`;
    menu.style.display = 'flex';

    document.getElementById('ctxLock').onclick = () => {
      toggleLockArtwork(art.id);
      hideContextMenu();
    };
    const btnFlip = document.getElementById('ctxFlip');
    if (btnFlip) {
      btnFlip.onclick = () => {
        flipArtworkSide(art.id);
        hideContextMenu();
      };
    }
    document.getElementById('ctxElev').onclick = () => {
      hideContextMenu();
      promptElevation(art);
    };
    const btnOpenElev = document.getElementById('ctxOpenElev');
    if (btnOpenElev) {
      btnOpenElev.onclick = () => {
        hideContextMenu();
        if (EW.Elevation && EW.Elevation.openElevation) {
          EW.Elevation.openElevation();
        }
      };
    }
    document.getElementById('ctxDetach').onclick = () => {
      detachArtworkFromWall(art.id);
      hideContextMenu();
    };
  }

  function hideContextMenu() {
    const menu = document.getElementById('artContextMenu');
    if (menu) menu.style.display = 'none';
  }

  function promptElevation(art) {
    const cur = art.elevation !== undefined ? art.elevation : 1.20;
    const input = prompt(`Montāžas augstums no grīdas metriem (solis 10 cm, piem. 1.10, 1.40):`, cur.toFixed(2));
    if (input !== null) {
      const val = U.num(input);
      if (val !== null && val >= 0) {
        art.elevation = Math.round(val * 10) / 10;
        renderUI();
        if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
        if (EW.UI) EW.UI.toast(`Montāžas augstums iestatīts uz ${art.elevation.toFixed(2)} m`);
      }
    }
  }

  /**
   * Inicializē Canvas Drag & Drop klausītājus tiešai ievilkšanai no kataloga
   */
  function initDragAndDrop(canvas) {
    if (!canvas) return;

    canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      const artId = S.draggingArtworkId || e.dataTransfer.getData('text/plain');
      if (!artId) return;
      const art = S.artworks.find(a => a.id === artId);
      if (!art) return;

      const { W, H } = EW.Renderer.getDims();
      const r = canvas.getBoundingClientRect();
      const wp = Grid.s2w(e.clientX - r.left, e.clientY - r.top, W, H);
      const activeG = S.G();
      const snapCandidate = findNearestModuleSnap(wp, art, activeG, 0.30);

      S.dragPreviewArt = {
        art,
        x: wp.x,
        y: wp.y,
        snapGhost: snapCandidate
      };
      if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
    });

    canvas.addEventListener('dragleave', () => {
      S.dragPreviewArt = null;
      if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
    });

    canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      const artId = S.draggingArtworkId || e.dataTransfer.getData('text/plain');
      const art = S.artworks.find(a => a.id === artId);
      if (!art) return;

      const { W, H } = EW.Renderer.getDims();
      const r = canvas.getBoundingClientRect();
      const wp = Grid.s2w(e.clientX - r.left, e.clientY - r.top, W, H);
      const activeG = S.G();
      const snapCandidate = findNearestModuleSnap(wp, art, activeG, 0.30);

      if (snapCandidate && snapCandidate.mod) {
        attachToModule(art.id, snapCandidate.mod.id, snapCandidate.wallSide, snapCandidate.posOnWall);
      } else {
        art.moduleId = null;
        art.x = wp.x;
        art.y = wp.y;
        art.gridId = activeG ? activeG.id : null;
        if (EW.UI) EW.UI.toast(`Eksponāts “${art.title}” novietots telpā`);
      }

      S.selectedArtworkId = art.id;
      S.dragPreviewArt = null;
      S.draggingArtworkId = null;
      renderUI();
      if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
    });
  }

  /**
   * Renderē eksponātu kartītes sānjoslas panelī
   */
  function renderUI() {
    const listEl = document.getElementById('artworksList');
    const badgeEl = document.getElementById('artCountBadge');
    if (!listEl) return;

    const totalCount = S.artworks.length;
    let unplaced = S.artworks.filter(a => !a.moduleId && a.x === undefined);
    let placed = S.artworks.filter(a => a.moduleId || a.x !== undefined);
    const placedCount = placed.length;
    
    // Meklēšanas filtra atbalsts
    const searchInput = document.getElementById('artSearchInput');
    const searchVal = (searchInput && searchInput.value ? searchInput.value : '').trim().toLowerCase();

    if (searchVal) {
      const matchFilter = a => (
        (a.title && a.title.toLowerCase().includes(searchVal)) ||
        (a.author && a.author.toLowerCase().includes(searchVal)) ||
        (a.invNo && a.invNo.toLowerCase().includes(searchVal)) ||
        (a.technique && a.technique.toLowerCase().includes(searchVal))
      );
      unplaced = unplaced.filter(matchFilter);
      placed = placed.filter(matchFilter);
    }

    if (badgeEl) {
      badgeEl.textContent = `${placedCount}/${totalCount} izvietoti`;
    }

    if (!S.artworks.length) {
      listEl.innerHTML = `<div class="empty-hint" style="padding:10px;text-align:center;color:var(--ink-dim);font-size:11.5px">
        Vēl nav pievienots neviens eksponāts.<br>Importē Excel/JSON failu vai pievieno manuāli.
      </div>`;
      return;
    }

    let html = '';
    
    // 1. Neizvietotie darbi (Palette / Catalog)
    if (unplaced.length > 0) {
      html += `<div style="font-weight:700;font-size:11px;color:var(--warn);margin:4px 0 2px">📦 Neizvietotie darbi (${unplaced.length}) — <i>velc plānā</i>:</div>`;
      unplaced.forEach(art => {
        const thumb = art.imageUrl
          ? `<div class="art-thumb"><img src="${art.imageUrl}" alt="${U.esc(art.title)}"></div>`
          : `<div class="art-thumb empty">🖼️</div>`;

        const invTag = art.invNo ? `<span style="font-size:9.5px;font-weight:700;color:var(--accent);background:rgba(2,132,199,0.12);padding:1px 4px;border-radius:3px;margin-right:4px">${U.esc(art.invNo)}</span>` : '';
        const authorPrefix = art.author ? `<span style="color:var(--ink);font-weight:600">${U.esc(art.author)}</span> · ` : '';

        html += `
          <div class="art-card" draggable="true" data-artid="${art.id}">
            <div class="art-card-grip" title="Ievilkt plānā (Drag & Drop)">⋮⋮</div>
            ${thumb}
            <div class="art-card-info">
              <div class="art-card-title">${invTag}${U.esc(art.title)}</div>
              <div class="art-card-meta">${authorPrefix}${art.width}×${art.height}m · <b>${art.weight} kg</b></div>
            </div>
            <div style="display:flex;gap:3px;align-items:center">
              <button class="ghost btn-edit-art" data-artid="${art.id}" style="padding:2px 5px" title="Rediģēt darba datus vai foto">✏️</button>
              <button class="key btn-place-art" data-artid="${art.id}" style="font-size:10px;padding:3px 7px" title="Piekārt pie atlasītā moduļa">+ Piekārt</button>
            </div>
          </div>
        `;
      });
    }

    // 2. Jau izvietotie darbi (gan uz sienām, gan brīvi telpā)
    if (placed.length > 0) {
      html += `<div style="font-weight:700;font-size:11px;color:var(--accent);margin:8px 0 2px">🖼️ Izvietotie darbi (${placed.length}):</div>`;
      placed.forEach(art => {
        const thumb = art.imageUrl
          ? `<div class="art-thumb"><img src="${art.imageUrl}" alt="${U.esc(art.title)}"></div>`
          : `<div class="art-thumb empty">🖼️</div>`;

        const invTag = art.invNo ? `<span style="font-size:9.5px;font-weight:700;color:var(--accent);background:rgba(2,132,199,0.12);padding:1px 4px;border-radius:3px;margin-right:4px">${U.esc(art.invNo)}</span>` : '';
        const authorPrefix = art.author ? `<span style="color:var(--ink);font-weight:600">${U.esc(art.author)}</span> · ` : '';
        const locDesc = art.moduleId ? `${art.wallSide}` : '<span style="color:var(--accent)">Brīvs</span>';

        html += `
          <div class="art-card placed ${art.locked ? 'is-locked' : ''}" draggable="true" data-artid="${art.id}">
            <div class="art-card-grip" title="Pārvietot plānā (Drag & Drop)">⋮⋮</div>
            ${thumb}
            <div class="art-card-info">
              <div class="art-card-title">${art.locked ? '🔒 ' : ''}${invTag}${U.esc(art.title)}</div>
              <div class="art-card-meta">${authorPrefix}${art.width}×${art.height}m · <b>${art.weight}kg</b> · h=${art.elevation}m · ${locDesc}</div>
            </div>
            <div style="display:flex;gap:3px;align-items:center">
              <button class="ghost btn-edit-art" data-artid="${art.id}" style="padding:2px 5px" title="Rediģēt darba datus vai foto">✏️</button>
              <button class="ghost btn-toggle-lock" data-artid="${art.id}" style="padding:2px 5px" title="${art.locked ? 'Atbloķēt' : 'Bloķēt'}">${art.locked ? '🔒' : '🔓'}</button>
              <button class="ghost btn-detach-art" data-artid="${art.id}" style="padding:2px 5px;color:var(--danger)" title="Noņemt no plāna">✕</button>
            </div>
          </div>
        `;
      });
    }

    listEl.innerHTML = html;

    // Piesaistām Drag & Drop notikumus kartītēm
    listEl.querySelectorAll('.art-card[draggable="true"]').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        const artId = card.dataset.artid;
        e.dataTransfer.setData('text/plain', artId);
        e.dataTransfer.effectAllowed = 'copyMove';
        card.classList.add('dragging');
        S.draggingArtworkId = artId;
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        S.draggingArtworkId = null;
        S.dragPreviewArt = null;
        if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
      });
    });

    // Piesaistām pogu notikumus
    listEl.querySelectorAll('.btn-place-art').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.artid;
        if (!S.selectedModuleId) {
          if (EW.UI) EW.UI.toast('Vispirms atlasiet moduli uz plāna, pie kura piekārt darbu');
          return;
        }
        attachToModule(id, S.selectedModuleId, 'front', 0);
      };
    });

    listEl.querySelectorAll('.btn-edit-art').forEach(btn => {
      btn.onclick = (ev) => {
        ev.stopPropagation();
        if (window.openEditArtworkModal) {
          window.openEditArtworkModal(btn.dataset.artid);
        }
      };
    });

    listEl.querySelectorAll('.btn-toggle-lock').forEach(btn => {
      btn.onclick = (ev) => {
        ev.stopPropagation();
        toggleLockArtwork(btn.dataset.artid);
      };
    });

    listEl.querySelectorAll('.btn-detach-art').forEach(btn => {
      btn.onclick = (ev) => {
        ev.stopPropagation();
        detachArtworkFromWall(btn.dataset.artid);
      };
    });
  }

  EW.Artworks = {
    addArtwork,
    removeArtwork,
    detachArtworkFromWall,
    toggleLockArtwork,
    flipArtworkSide,
    attachToModule,
    parsePastedTable,
    hitTestArtwork,
    processArtworkImageFile,
    getLoadedImage,
    getArtCenterW,
    getSnappedArtCenterW,
    findNearestModuleSnap,
    drawPivotGizmo,
    drawArtworks,
    initDragAndDrop,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    renderUI
  };
})();
