/**
 * Easy walls 2.0 — Sienas fasādes (frontālā izklājuma) 2D redaktors
 * 
 * Nodrošina:
 * 1. Izvēlētās sienu grupas atritināšanu taisnā 2D fasādes plaknē (3.35 m augstumā)
 * 2. Moduļu un apdares paneļu vertikālo šuvju un balsta pēdu attēlošanu
 * 3. Mākslas darbu mērogotu zīmēšanu ar ielādētajām fotofiksācijām (PNG/JPG)
 * 4. Interaktīvu bīdīšanu ar peli (Drag & Drop) horizontāli un vertikāli (10 cm solis)
 * 5. Acu līnijas (Eye-level, 1.50 m) un automātisko mērlīniju (starp-rāmju attālumu) indikāciju
 */
window.EW = window.EW || {};

(function() {
  const S = EW.State;
  const U = EW.Utils;

  let activeGroupId = 1;
  let activeSide = 'front'; // 'front' (A puse) | 'back' (B puse)
  let eyeLevel = 1.50;      // Acu līnija metros

  let canvas = null;
  let ctx = null;
  let view = {
    scale: 80,  // px metrā
    panX: 60,
    panY: 340   // grīdas līnija pikseļos no augšas
  };

  let dragArt = null; // { art, startX, startY, origPos, origElev, mouseStartX, mouseStartY }
  let hoverArtId = null;

  /**
   * Atrod visas sienu grupas
   */
  function getWallGroups() {
    if (EW.Modules && EW.Modules.Panels && EW.Modules.Panels.generatePanels) {
      // Izmantojam panels.js grupu noteikšanas algoritmu
      const list = S ? S.modules : [];
      if (!list || !list.length) return [];
      const groups = [];
      const visited = new Set();

      list.forEach(m => {
        if (visited.has(m.id)) return;
        const gMods = [];
        const queue = [m];
        visited.add(m.id);

        while (queue.length > 0) {
          const curr = queue.shift();
          gMods.push(curr);
          list.forEach(other => {
            if (visited.has(other.id)) return;
            if (other.gridId !== curr.gridId) return;
            if (EW.Modules.Snapping && EW.Modules.Snapping.getContactInfo(curr, other)) {
              visited.add(other.id);
              queue.push(other);
            }
          });
        }

        // Sakārtojam moduļus lineārā secībā gar galveno asi
        sortModulesLinearly(gMods);

        const id = groups.length + 1;
        groups.push({
          id,
          name: `Siena ${id} (${gMods.length} mod.)`,
          modules: gMods
        });
      });
      return groups;
    }

    // Fallback: visi moduļi kā viena grupa
    return [{ id: 1, name: 'Siena 1', modules: S.modules || [] }];
  }

  /**
   * Sakārto savienotos moduļus lineārā secībā no viena gala līdz otram
   */
  function sortModulesLinearly(mods) {
    if (mods.length <= 1) return mods;

    // Nosakām leņķi
    const rot = (mods[0].rot || 0) * Math.PI / 180;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    // Sakārtojam pēc projekcijas uz moduļa garenass
    mods.sort((a, b) => {
      const projA = a.x * cos + a.y * sin;
      const projB = b.x * cos + b.y * sin;
      return projA - projB;
    });

    return mods;
  }

  /**
   * Aprēķina sienas moduļu izvietojumu fasādē
   */
  function getWallLayout(group) {
    if (!group || !group.modules || !group.modules.length) {
      return { totalLength: 0, segments: [], artworks: [] };
    }

    const segments = [];
    let curX = 0;

    group.modules.forEach(m => {
      const len = m.type === 'small' ? 1.0 : 2.0;
      segments.push({
        module: m,
        startX: curX,
        endX: curX + len,
        centerX: curX + len / 2,
        length: len,
        type: m.type
      });
      curX += len;
    });

    // Atlasām mākslas darbus, kas piekārti pie šīs sienas moduļiem un konkrētās puses
    const modIds = new Set(group.modules.map(m => m.id));
    const arts = (S.artworks || []).filter(a => modIds.has(a.moduleId) && a.wallSide === activeSide);

    const layoutArts = arts.map(a => {
      const seg = segments.find(s => s.module.id === a.moduleId);
      const posX = seg ? seg.centerX + (a.posOnWall || 0) : (a.width || 1.0) / 2;
      return {
        artwork: a,
        segment: seg,
        wallX: posX,
        elevation: a.elevation !== undefined ? a.elevation : 1.20,
        width: a.width || 1.0,
        height: a.height || 1.2,
        weight: a.weight || 25
      };
    });

    // Sakārtojam darbus pēc to X pozīcijas
    layoutArts.sort((a, b) => a.wallX - b.wallX);

    return {
      totalLength: curX,
      segments,
      artworks: layoutArts
    };
  }

  /**
   * Pārvērš pasaules koordinātas (m) uz kanvas pikseļiem
   */
  function m2px(mX, mY) {
    return {
      x: view.panX + mX * view.scale,
      y: view.panY - mY * view.scale // Y ass augšup
    };
  }

  /**
   * Pārvērš kanvas pikseļus uz metriem
   */
  function px2m(pX, pY) {
    return {
      x: (pX - view.panX) / view.scale,
      y: (view.panY - pY) / view.scale
    };
  }

  /**
   * Inicializē un atver fasādes skatu
   */
  function openElevation(targetGroupId = null) {
    const modal = document.getElementById('wallElevationModal');
    if (!modal) return;

    canvas = document.getElementById('elevationCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    const groups = getWallGroups();
    if (!groups.length) {
      if (EW.UI && EW.UI.toast) EW.UI.toast('Ekspozīcijā vēl nav ievietots neviens modulis');
      return;
    }

    if (targetGroupId) {
      activeGroupId = targetGroupId;
    } else if (S.selectedModuleId) {
      const found = groups.find(g => g.modules.some(m => m.id === S.selectedModuleId));
      activeGroupId = found ? found.id : groups[0].id;
    } else if (!groups.some(g => g.id === activeGroupId)) {
      activeGroupId = groups[0].id;
    }

    // Piepildām grupu izvēlni
    const select = document.getElementById('elevWallSelect');
    if (select) {
      select.innerHTML = groups.map(g => `<option value="${g.id}" ${g.id === activeGroupId ? 'selected' : ''}>${U.esc(g.name)}</option>`).join('');
      select.onchange = () => {
        activeGroupId = parseInt(select.value, 10);
        fitView();
        draw();
      };
    }

    // Puses pārslēdzēji
    const btnSideA = document.getElementById('btnElevSideA');
    const btnSideB = document.getElementById('btnElevSideB');
    if (btnSideA && btnSideB) {
      btnSideA.onclick = () => {
        activeSide = 'front';
        btnSideA.classList.add('active');
        btnSideB.classList.remove('active');
        draw();
      };
      btnSideB.onclick = () => {
        activeSide = 'back';
        btnSideB.classList.add('active');
        btnSideA.classList.remove('active');
        draw();
      };
    }

    // Acu līnijas ievade
    const inEye = document.getElementById('elevEyeLevelInput');
    if (inEye) {
      inEye.value = eyeLevel.toFixed(2);
      inEye.onchange = () => {
        const val = U.num(inEye.value);
        if (val && val >= 0.5 && val <= 2.5) {
          eyeLevel = val;
          draw();
        }
      };
    }

    // Ietilpināšanas poga
    const btnFit = document.getElementById('btnElevFit');
    if (btnFit) {
      btnFit.onclick = () => {
        fitView();
        draw();
      };
    }

    attachCanvasEvents();
    modal.classList.add('open');

    // Mērogojam un zīmējam
    resizeCanvas();
    fitView();
    draw();
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function fitView() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const groups = getWallGroups();
    const group = groups.find(g => g.id === activeGroupId) || groups[0];
    if (!group) return;

    const layout = getWallLayout(group);
    const wallLen = Math.max(2.0, layout.totalLength);
    const wallH = 3.35;

    const marginX = 80;
    const marginY = 60;
    const availW = Math.max(200, rect.width - marginX * 2);
    const availH = Math.max(150, rect.height - marginY * 2);

    const scaleX = availW / wallLen;
    const scaleY = availH / wallH;
    view.scale = Math.max(30, Math.min(180, Math.min(scaleX, scaleY)));

    view.panX = marginX;
    view.panY = rect.height - 40; // grīda 40px no apakšas
  }

  /**
   * Zīmē visu fasādes skatu
   */
  function draw() {
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    const groups = getWallGroups();
    const group = groups.find(g => g.id === activeGroupId);
    if (!group) return;

    const layout = getWallLayout(group);
    const wallLen = layout.totalLength;
    const wallH = 3.35;

    // 1. Grīdas līnija un fons
    const pFloorLeft = m2px(-0.8, 0);
    const pFloorRight = m2px(wallLen + 0.8, 0);

    ctx.save();
    // Grīdas segums (koka parketa vai tumšs galerijas tonis)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, view.panY, rect.width, rect.height - view.panY);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pFloorLeft.x, view.panY);
    ctx.lineTo(pFloorRight.x, view.panY);
    ctx.stroke();

    // Grīdas atzīme "0.00 m"
    ctx.fillStyle = '#64748b';
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.fillText('± 0.00 m (Grīda)', pFloorLeft.x, view.panY + 16);

    // 2. Sienas pamatkorpuss (3.35 m augstums)
    const pWallTL = m2px(0, wallH);
    const wallPxW = wallLen * view.scale;
    const wallPxH = wallH * view.scale;

    // Ēna aiz sienas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(pWallTL.x + 4, pWallTL.y + 4, wallPxW, wallPxH);

    // Sienas virsma (gluds balts/pelēks izstāžu apdares tonis)
    const grad = ctx.createLinearGradient(0, pWallTL.y, 0, view.panY);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = grad;
    ctx.fillRect(pWallTL.x, pWallTL.y, wallPxW, wallPxH);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pWallTL.x, pWallTL.y, wallPxW, wallPxH);

    // 3. Moduļu un paneļu vertikālās šuves
    layout.segments.forEach(seg => {
      const pSegTL = m2px(seg.startX, wallH);
      const segW = seg.length * view.scale;

      // Moduļa robežlīnija (vertikālā šuve)
      if (seg.startX > 0) {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(pSegTL.x, pSegTL.y);
        ctx.lineTo(pSegTL.x, view.panY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Moduļa karkasa nosaukums un platums augšpusē
      ctx.fillStyle = '#475569';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      const pCenter = m2px(seg.centerX, wallH);
      const modLabel = `${seg.module.id} (${seg.type === 'large' ? '2×1m' : '1×1m'})`;
      ctx.fillText(modLabel, pCenter.x, pCenter.y - 12);

      // Balsta kājas (pēdas) apakšā
      const legOffset = 0.16; // 16 cm no malas
      [seg.startX + legOffset, seg.endX - legOffset].forEach(legX => {
        const pLeg = m2px(legX, 0);
        ctx.fillStyle = '#334155';
        ctx.fillRect(pLeg.x - 6, pLeg.y - 6, 12, 6);
      });
    });

    // Sienas augstuma anotācija (H = 3.35 m)
    ctx.fillStyle = '#64748b';
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`H = 3.35 m`, pWallTL.x + wallPxW + 8, pWallTL.y + 14);

    // 4. Acu līnijas vadošā ass (Eye-level)
    const pEye = m2px(0, eyeLevel);
    ctx.save();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(pFloorLeft.x, pEye.y);
    ctx.lineTo(pFloorRight.x, pEye.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#0284c7';
    ctx.font = '600 10.5px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`👁️ Acu līnija ${eyeLevel.toFixed(2)} m`, pWallTL.x - 8, pEye.y + 3);
    ctx.restore();

    // 5. Mākslas darbi (Artworks)
    layout.artworks.forEach(la => {
      drawArtworkOnElevation(la);
    });

    // 6. Mērlīnijas starp blakus darbiem
    drawSpacingDimensions(layout.artworks);

    ctx.restore();

    // Atjaunojam kājenes statusu
    const footEl = document.getElementById('elevTotalInfo');
    if (footEl) {
      const artCount = layout.artworks.length;
      const totalWt = layout.artworks.reduce((s, a) => s + a.weight, 0);
      footEl.textContent = `Sienas garums: ${wallLen.toFixed(2)} m · Izvietoti darbi: ${artCount} gab. (${totalWt.toFixed(1)} kg) · Puse: ${activeSide === 'front' ? 'Priekšpuse (A)' : 'Aizmugure (B)'}`;
    }
  }

  /**
   * Zīmē atsevišķu mākslas darbu fasādē
   */
  function drawArtworkOnElevation(la) {
    const art = la.artwork;
    const isHover = hoverArtId === art.id;
    const isDrag = dragArt && dragArt.art.id === art.id;

    const wPx = la.width * view.scale;
    const hPx = la.height * view.scale;
    const pCenter = m2px(la.wallX, la.elevation + la.height / 2);

    const leftX = pCenter.x - wPx / 2;
    const topY = pCenter.y - hPx / 2;

    ctx.save();

    // Ēna
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(leftX + 3, topY + 4, wPx, hPx);

    // Fons / audekls
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(leftX, topY, wPx, hPx);

    // Attēla fotofiksācija (ja ielādēta)
    let hasDrawnImage = false;
    if (art.imageUrl && EW.Artworks && EW.Artworks.getLoadedImage) {
      const img = EW.Artworks.getLoadedImage(art.imageUrl);
      if (img) {
        ctx.drawImage(img, leftX, topY, wPx, hPx);
        hasDrawnImage = true;
      }
    }

    // Ja attēls nav pieejams, zīmējam elegantu muzeja kartīti
    if (!hasDrawnImage) {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(leftX, topY, wPx, hPx);
      ctx.fillStyle = '#78350f';
      ctx.font = '700 ' + Math.min(13, Math.max(9, wPx * 0.12)) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(art.title, pCenter.x, pCenter.y - 8);

      if (art.author) {
        ctx.fillStyle = '#92400e';
        ctx.font = '500 ' + Math.min(11, Math.max(8, wPx * 0.09)) + 'px system-ui, sans-serif';
        ctx.fillText(art.author, pCenter.x, pCenter.y + 8);
      }
    }

    // Rāmis (profilēts koka/metāla rāmis)
    ctx.strokeStyle = isDrag
      ? '#0284c7'
      : (isHover ? '#38bdf8' : (art.locked ? '#b45309' : '#334155'));
    ctx.lineWidth = isHover || isDrag ? 3 : 2;
    ctx.strokeRect(leftX, topY, wPx, hPx);

    // Iekšējā paspartū līnija
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(leftX + 2, topY + 2, wPx - 4, hPx - 4);

    // Informācijas birka zem rāmja: Izmēri, svars un montāžas augstums
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const lockSymbol = art.locked ? '🔒 ' : '';
    ctx.fillText(`${lockSymbol}${art.title} (${art.width}×${art.height}m)`, pCenter.x, topY + hPx + 4);

    // Montāžas augstuma atzīme (h = X.XX m)
    ctx.fillStyle = '#0284c7';
    ctx.font = '600 9.5px ui-monospace, monospace';
    ctx.fillText(`h=${la.elevation.toFixed(2)}m (${art.weight}kg)`, pCenter.x, topY + hPx + 16);

    ctx.restore();
  }

  /**
   * Zīmē starp-rāmju attālumus
   */
  function drawSpacingDimensions(arts) {
    if (arts.length < 2) return;

    ctx.save();
    ctx.strokeStyle = '#b45309';
    ctx.fillStyle = '#b45309';
    ctx.lineWidth = 1;
    ctx.font = '600 9px ui-monospace, monospace';
    ctx.textAlign = 'center';

    for (let i = 0; i < arts.length - 1; i++) {
      const a1 = arts[i];
      const a2 = arts[i + 1];

      const r1X = a1.wallX + a1.width / 2;
      const l2X = a2.wallX - a2.width / 2;
      const dist = l2X - r1X;

      if (dist >= 0.05) {
        const p1 = m2px(r1X, eyeLevel);
        const p2 = m2px(l2X, eyeLevel);
        const midX = (p1.x + p2.x) / 2;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Mazie bultiņu gali
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y - 4);
        ctx.lineTo(p1.x, p1.y + 4);
        ctx.moveTo(p2.x, p2.y - 4);
        ctx.lineTo(p2.x, p2.y + 4);
        ctx.stroke();

        ctx.fillText(`↔ ${(dist * 100).toFixed(0)}cm`, midX, p1.y - 4);
      }
    }

    ctx.restore();
  }

  /**
   * Pārbauda, vai pele trāpa kādam mākslas darbam fasādē
   */
  function hitTestArtwork(pxX, pxY) {
    const groups = getWallGroups();
    const group = groups.find(g => g.id === activeGroupId);
    if (!group) return null;

    const layout = getWallLayout(group);
    for (let i = layout.artworks.length - 1; i >= 0; i--) {
      const la = layout.artworks[i];
      const wPx = la.width * view.scale;
      const hPx = la.height * view.scale;
      const pCenter = m2px(la.wallX, la.elevation + la.height / 2);

      const xMin = pCenter.x - wPx / 2;
      const xMax = pCenter.x + wPx / 2;
      const yMin = pCenter.y - hPx / 2;
      const yMax = pCenter.y + hPx / 2;

      if (pxX >= xMin && pxX <= xMax && pxY >= yMin && pxY <= yMax) {
        return la;
      }
    }
    return null;
  }

  /**
   * Piesaista kanvas peles notikumus (vilkšana ar 10 cm soli)
   */
  function attachCanvasEvents() {
    if (!canvas) return;

    canvas.onpointerdown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const pxX = e.clientX - rect.left;
      const pxY = e.clientY - rect.top;

      const hit = hitTestArtwork(pxX, pxY);
      if (hit) {
        if (hit.artwork.locked) {
          if (EW.UI && EW.UI.toast) EW.UI.toast('Šis darbs ir nobloķēts (Lock)');
          return;
        }
        dragArt = {
          art: hit.artwork,
          segment: hit.segment,
          origPos: hit.artwork.posOnWall || 0,
          origElev: hit.elevation,
          startWallX: hit.wallX,
          mouseStartX: pxX,
          mouseStartY: pxY
        };
        canvas.setPointerCapture(e.pointerId);
        draw();
      }
    };

    canvas.onpointermove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const pxX = e.clientX - rect.left;
      const pxY = e.clientY - rect.top;

      if (dragArt) {
        const dxM = (pxX - dragArt.mouseStartX) / view.scale;
        const dyM = (dragArt.mouseStartY - pxY) / view.scale; // uz augšu = pozitīvs

        // 1. Horizontālā nobīde (10 cm solis)
        const rawWallX = dragArt.startWallX + dxM;
        const snappedWallX = Math.round(rawWallX * 10) / 10;

        // Atrodam atbilstošo moduli gar sienu
        const groups = getWallGroups();
        const group = groups.find(g => g.id === activeGroupId);
        if (group) {
          const layout = getWallLayout(group);
          const targetSeg = layout.segments.find(s => snappedWallX >= s.startX && snappedWallX <= s.endX) 
                         || (snappedWallX < layout.segments[0].startX ? layout.segments[0] : layout.segments[layout.segments.length - 1]);

          if (targetSeg) {
            dragArt.art.moduleId = targetSeg.module.id;
            const newPosOnWall = snappedWallX - targetSeg.centerX;
            dragArt.art.posOnWall = Math.round(newPosOnWall * 10) / 10;
          }
        }

        // 2. Vertikālā nobīde no grīdas (10 cm solis)
        const rawElev = dragArt.origElev + dyM;
        const snappedElev = Math.max(0.10, Math.min(2.80, Math.round(rawElev * 10) / 10));
        dragArt.art.elevation = snappedElev;

        draw();
        return;
      }

      // Hover stāvoklis
      const hit = hitTestArtwork(pxX, pxY);
      const newHoverId = hit ? hit.artwork.id : null;
      if (newHoverId !== hoverArtId) {
        hoverArtId = newHoverId;
        canvas.style.cursor = hoverArtId ? 'grab' : 'default';
        draw();
      }
    };

    canvas.onpointerup = (e) => {
      if (dragArt) {
        canvas.releasePointerCapture(e.pointerId);
        dragArt = null;
        draw();

        // Sinhronizējam galveno kanvu un stabilitātes dzinēju
        if (EW.Renderer && EW.Renderer.draw) EW.Renderer.draw();
        if (EW.Artworks && EW.Artworks.renderUI) EW.Artworks.renderUI();
        if (window.EW_AppUpdateStability) window.EW_AppUpdateStability();
      }
    };
  }

  EW.Elevation = {
    openElevation,
    draw,
    getWallGroups
  };
})();
