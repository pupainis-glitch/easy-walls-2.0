/**
 * Easy walls 2.0 — Montāžas lapu PDF / Drukas dzinējs (A4 Landscape)
 * Noformēts atbilstoši LNMM Arsenāls grafiskajam standartam un stabilitātes aprēķina paraugam:
 * - Balts, arhitektoniski tīrs rasējuma fons (nekāda melnā fona)
 * - Arsenāls sarkanā galvene ar retinātiem burtiem un metadatu tabulu labajā pusē
 * - Sekciju numerācija A, B, C ar plānām sadalošajām līnijām
 * - Skaidra karkasa un apdares paneļu BOM tabula ar svariem
 */
window.EW = window.EW || {};
EW.Modules = EW.Modules || {};

(function() {
  const S = EW.State;
  const Grid = EW.Grid;
  const Geom = EW.Modules.Geometry;
  const Panels = EW.Modules.Panels;
  const Classifier = EW.Modules.Classifier;

  /**
   * Uzģenerē augstas kvalitātes arhitektonisku rasējumu konkrētam sienas fragmentam uz balta fona
   */
  function renderWallPreviewImage(group, width = 1400, height = 750) {
    if (!group || !group.modules || !group.modules.length) return '';

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d');

    const gObj = S.grids.find(x => x.id === group.gridId) || S.G();

    // 1. Aprēķinām sienas robežas world koordinātās
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    group.modules.forEach(m => {
      const spec = Geom.SPECS[m.type] || Geom.SPECS.large;
      const pts = Geom.getPointsInGrid(m);
      pts.forEach(p => {
        const wp = Grid.g2w(gObj, p.x, p.y);
        minX = Math.min(minX, wp.x);
        maxX = Math.max(maxX, wp.x);
        minY = Math.min(minY, wp.y);
        maxY = Math.max(maxY, wp.y);
      });
    });

    const margin = 1.4; // 1.4 m brīvā telpa apkārt precīzam mērogam un izmēru līnijām
    minX -= margin; maxX += margin;
    minY -= margin; maxY += margin;

    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const scale = Math.min(width / spanX, height / spanY);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // TĪRI BALTS FONS (atbilstoši Arsenāla rasējuma standartam)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    const px = 1 / scale;

    // A. Smalks arhitektonisks fona koordinātu tīkls (0.5m solis, ļoti blāvs)
    ctx.strokeStyle = '#f0f1f4';
    ctx.lineWidth = px * 0.8;
    ctx.beginPath();
    const gridStep = 0.5;
    const startGX = Math.floor(minX / gridStep) * gridStep;
    const endGX = Math.ceil(maxX / gridStep) * gridStep;
    const startGY = Math.floor(minY / gridStep) * gridStep;
    const endGY = Math.ceil(maxY / gridStep) * gridStep;

    for (let x = startGX; x <= endGX; x += gridStep) {
      ctx.moveTo(x, minY);
      ctx.lineTo(x, maxY);
    }
    for (let y = startGY; y <= endGY; y += gridStep) {
      ctx.moveTo(minX, y);
      ctx.lineTo(maxX, y);
    }
    ctx.stroke();

    // B. Karkasa moduļi (ar 16 mm iekšējo atkāpi un smalku alumīnija profilējumu)
    group.modules.forEach(mod => {
      const spec = Geom.SPECS[mod.type] || Geom.SPECS.large;
      const wp = Grid.g2w(gObj, mod.x, mod.y);
      const totalAngle = ((gObj.angle || 0) + (mod.rot || 0)) * Math.PI / 180;

      ctx.save();
      ctx.translate(wp.x, wp.y);
      ctx.rotate(totalAngle);

      const halfL = spec.length / 2;
      const halfW = spec.width / 2;
      const INSET = 0.016; // 16 mm ofsets
      const frameL = spec.length - 2 * INSET;
      const frameW = spec.width - 2 * INSET;

      // Montāžas ārējā ass (ļoti smalka punktlīnija)
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = px * 0.7;
      ctx.setLineDash([px * 3, px * 3]);
      ctx.strokeRect(-halfL, -halfW, spec.length, spec.width);
      ctx.setLineDash([]);

      // Karkasa korpuss — gaišs alumīnija tonējums
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(-halfL + INSET, -halfW + INSET, frameL, frameW);

      // Karkasa kontūra — precīza grafīta līnija
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = px * 1.6;
      ctx.strokeRect(-halfL + INSET, -halfW + INSET, frameL, frameW);

      // 500 mm iekšējās atzīmes
      if (mod.type === 'large') {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = px * 1.0;
        ctx.setLineDash([px * 3, px * 3]);
        [-0.5, 0, 0.5].forEach(x => {
          ctx.beginPath();
          ctx.moveTo(x, -halfW + INSET);
          ctx.lineTo(x, halfW - INSET);
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }

      // Karkasa tipa kods centrā (tīrs, arhitektonisks)
      const cls = Classifier ? Classifier.classifySingleModule(mod, S.modules) : { code: 'M-LN' };
      ctx.fillStyle = '#1e293b';
      ctx.font = '600 ' + Math.max(0.16, px * 13) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cls.code, 0, 0);

      ctx.restore();
    });

    // C. Apdares paneļi (LNMM zaļais tonis, birkas un L/R punkti)
    const groupPanels = (S.panels || []).filter(p => p.wallGroupId === group.id);
    groupPanels.forEach(p => {
      const wp = Grid.g2w(gObj, p.gridCenter.x, p.gridCenter.y);
      const totalAngle = ((gObj.angle || 0) + (p.panelAngle || 0)) * Math.PI / 180;

      ctx.save();
      ctx.translate(wp.x, wp.y);
      ctx.rotate(totalAngle);

      const halfLen = p.length / 2;
      const th = p.thickness || 0.016;

      // Paneļa plāksne (16 mm)
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(-halfLen, -th / 2, p.length, th);

      ctx.strokeStyle = '#1b5e20';
      ctx.lineWidth = px * 1.4;
      ctx.strokeRect(-halfLen, -th / 2, p.length, th);

      // Taga birka virs fasādes
      const tagH = Math.max(0.18, px * 18);
      const tagW = Math.max(0.52, px * 60);
      const tagY = -th / 2 - tagH / 2 - 0.05;

      // Balta etiķetes kastīte ar smalku zaļu rāmi
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = px * 1.2;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(-tagW / 2, tagY - tagH / 2, tagW, tagH, px * 3);
      } else {
        ctx.rect(-tagW / 2, tagY - tagH / 2, tagW, tagH);
      }
      ctx.fill();
      ctx.stroke();

      // Kods melnā krāsā
      ctx.fillStyle = '#111827';
      ctx.font = 'bold ' + Math.max(0.11, px * 11) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textX = p.dotColor ? -tagW * 0.12 : 0;
      ctx.fillText(p.code, textX, tagY);

      // L / R orientācijas aplītis
      if (p.dotColor) {
        ctx.fillStyle = p.dotColor;
        ctx.beginPath();
        ctx.arc(tagW * 0.32, tagY, px * 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = px * 0.8;
        ctx.stroke();
      }

      ctx.restore();
    });

    ctx.restore();
    return offscreen.toDataURL('image/png');
  }

  /**
   * Uzģenerē zāles autentisko arhitektūras kopplāna rasējumu ar moduļu grupām un marķieriem
   */
  function renderRoomOverviewImage(room, roomIdx, roomGroups, width = 1600, height = 1000) {
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d');

    // Tīri balts fons
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const wM = room ? (room.widthM || 30) : 30;
    const hM = room ? (room.heightM || 20) : 20;
    const gObj = (S.grids && S.grids[roomIdx]) ? S.grids[roomIdx] : S.G();
    const gId = gObj ? gObj.id : (roomIdx + 1);

    const isMulti = !!(S.exhibition && S.exhibition.rooms && S.exhibition.rooms.length > 1);
    const roomMods = (S.modules || []).filter(m => isMulti ? (m.gridId === gId) : true);

    const padM = 2.5;
    const scale = Math.min(width / (wM + padM * 2), height / (hM + padM * 2));
    const px = 1 / scale;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    const gDx = (gObj && gObj.dx !== undefined) ? gObj.dx : wM / 2;
    const gDy = (gObj && gObj.dy !== undefined) ? gObj.dy : hM / 2;
    ctx.translate(-(wM / 2 - gDx), -(hM / 2 - gDy));

    // 1. Zāles arhitektūras plāns (attēls vai vektora kontūra)
    const hasImage = (S.img && (roomIdx === (S.activeRoomIndex || 0) || !isMulti));
    if (hasImage) {
      const mpp = S.mpp();
      const imgWM = S.img.width * mpp;
      const imgHM = S.img.height * mpp;
      ctx.save();
      ctx.globalAlpha = 0.88;
      ctx.drawImage(S.img, -gDx, -gDy, imgWM, imgHM);
      ctx.restore();
    } else {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-gDx, -gDy, wM, hM);

      // Nesošās ārsienas
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = px * 6;
      ctx.strokeRect(-gDx, -gDy, wM, hM);

      // Apmetuma līnija
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = px * 1.5;
      ctx.strokeRect(-gDx + 0.15, -gDy + 0.15, wM - 0.3, hM - 0.3);

      // Ieejas durvis
      const doorW = 2.0;
      const doorX = -gDx + wM / 2 - doorW / 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(doorX, -gDy + hM - 0.2, doorW, 0.4);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = px * 2;
      ctx.beginPath();
      ctx.arc(doorX, -gDy + hM, doorW, -Math.PI / 2, 0, false);
      ctx.stroke();
    }

    // 2. 500 mm režģa līnijas (blāvs fona tīkls)
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = px * 0.7;
    ctx.beginPath();
    const gridStep = 0.5;
    for (let x = -gDx; x <= -gDx + wM; x += gridStep) {
      ctx.moveTo(x, -gDy);
      ctx.lineTo(x, -gDy + hM);
    }
    for (let y = -gDy; y <= -gDy + hM; y += gridStep) {
      ctx.moveTo(-gDx, y);
      ctx.lineTo(-gDx + wM, y);
    }
    ctx.stroke();

    // 3. Visi zāles karkasa moduļi
    roomMods.forEach(mod => {
      const spec = Geom.SPECS[mod.type] || Geom.SPECS.large;
      const wp = Grid.g2w(gObj, mod.x, mod.y);
      const totalAngle = ((gObj.angle || 0) + (mod.rot || 0)) * Math.PI / 180;

      ctx.save();
      ctx.translate(wp.x, wp.y);
      ctx.rotate(totalAngle);

      const halfL = spec.length / 2;
      const halfW = spec.width / 2;
      const INSET = 0.016;
      const frameL = spec.length - 2 * INSET;
      const frameW = spec.width - 2 * INSET;

      // Karkass
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-halfL + INSET, -halfW + INSET, frameL, frameW);

      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = px * 1.8;
      ctx.strokeRect(-halfL + INSET, -halfW + INSET, frameL, frameW);

      if (mod.type === 'large') {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = px * 1.0;
        [-0.5, 0, 0.5].forEach(lx => {
          ctx.beginPath();
          ctx.moveTo(lx, -halfW + INSET);
          ctx.lineTo(lx, halfW - INSET);
          ctx.stroke();
        });
      }

      ctx.restore();
    });

    // 4. Apdares paneļi
    const roomPanels = (S.panels || []).filter(p => roomMods.some(m => m.id === p.moduleId));
    roomPanels.forEach(p => {
      const wp = Grid.g2w(gObj, p.gridCenter.x, p.gridCenter.y);
      const totalAngle = ((gObj.angle || 0) + (p.panelAngle || 0)) * Math.PI / 180;

      ctx.save();
      ctx.translate(wp.x, wp.y);
      ctx.rotate(totalAngle);

      const halfLen = p.length / 2;
      const th = p.thickness || 0.016;

      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(-halfLen, -th / 2, p.length, th);
      ctx.strokeStyle = '#1b5e20';
      ctx.lineWidth = px * 1.2;
      ctx.strokeRect(-halfLen, -th / 2, p.length, th);

      ctx.restore();
    });

    // 5. MODUĻU GRUPU IEZĪMĒJUMS UN CALLOUT BIRKAS
    roomGroups.forEach(g => {
      if (!g.modules || !g.modules.length) return;

      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      g.modules.forEach(m => {
        const spec = Geom.SPECS[m.type] || Geom.SPECS.large;
        const pts = Geom.getPointsInGrid(m);
        pts.forEach(p => {
          const wp = Grid.g2w(gObj, p.x, p.y);
          minX = Math.min(minX, wp.x);
          maxX = Math.max(maxX, wp.x);
          minY = Math.min(minY, wp.y);
          maxY = Math.max(maxY, wp.y);
        });
      });

      const bPad = 0.35;
      const bMinX = minX - bPad;
      const bMaxX = maxX + bPad;
      const bMinY = minY - bPad;
      const bMaxY = maxY + bPad;
      const bSpanX = bMaxX - bMinX;
      const bSpanY = bMaxY - bMinY;
      const bCenterX = (bMinX + bMaxX) / 2;

      // Akcentēts perimetra rāmis ap grupu
      ctx.save();
      ctx.fillStyle = 'rgba(2, 132, 199, 0.06)';
      ctx.fillRect(bMinX, bMinY, bSpanX, bSpanY);

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = px * 1.8;
      ctx.setLineDash([px * 6, px * 4]);
      ctx.strokeRect(bMinX, bMinY, bSpanX, bSpanY);
      ctx.setLineDash([]);
      ctx.restore();

      // Callout birka
      const badgeW = Math.max(2.6, px * 190);
      const badgeH = Math.max(0.75, px * 50);

      // Pozicionējam virs grupas (vai zem, ja par tuvu griestiem)
      let badgeY = bMinY - badgeH / 2 - 0.45;
      let leaderTargetY = bMinY;
      if (badgeY < -gDy + 0.8) {
        badgeY = bMaxY + badgeH / 2 + 0.45;
        leaderTargetY = bMaxY;
      }
      const badgeX = bCenterX;

      // Rādītājlīnija
      ctx.save();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = px * 1.6;
      ctx.beginPath();
      ctx.moveTo(badgeX, badgeY > leaderTargetY ? badgeY - badgeH / 2 : badgeY + badgeH / 2);
      ctx.lineTo(badgeX, leaderTargetY);
      ctx.stroke();

      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(badgeX, leaderTargetY, px * 4, 0, Math.PI * 2);
      ctx.fill();

      // Birkas fons
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(badgeX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, px * 5);
      } else {
        ctx.rect(badgeX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH);
      }
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = px * 1.4;
      ctx.stroke();

      // Birkas teksts
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold ' + Math.max(0.24, px * 16) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(g.code, badgeX, badgeY - badgeH * 0.18);

      ctx.fillStyle = '#fdba74';
      ctx.font = '600 ' + Math.max(0.16, px * 11) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const pageRef = g.targetPageNum ? `Lapa ${g.targetPageNum}` : '';
      const modCountStr = `${g.modules.length} mod.`;
      ctx.fillText(`${pageRef} · ${modCountStr}`, badgeX, badgeY + badgeH * 0.24);

      ctx.restore();
    });

    ctx.restore();

    // 6. Grafiskā mēroga josla (Scale Bar)
    ctx.save();
    const barX = 40;
    const barY = height - 40;
    const barLenPx = 5 * scale;
    ctx.fillStyle = '#1e293b';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillText('0', barX, barY - 6);
    ctx.fillText('1m', barX + barLenPx * 0.2 - 6, barY - 6);
    ctx.fillText('2.5m', barX + barLenPx * 0.5 - 12, barY - 6);
    ctx.fillText('5m (Mēroga solis)', barX + barLenPx - 20, barY - 6);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(barX, barY, barLenPx * 0.2, 5);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(barX + barLenPx * 0.2, barY, barLenPx * 0.3, 5);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(barX + barLenPx * 0.5, barY, barLenPx * 0.5, 5);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barLenPx, 5);
    ctx.restore();

    // 7. Ziemeļu kompasa bulta (N)
    ctx.save();
    const compX = width - 60;
    const compY = height - 55;
    ctx.translate(compX, compY);
    const rotRad = ((gObj && gObj.angle) || 0) * Math.PI / 180;
    ctx.rotate(rotRad);

    ctx.fillStyle = '#b71c1c';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(7, 5);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(-7, 5);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#b71c1c';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -24);
    ctx.restore();

    return offscreen.toDataURL('image/png');
  }

  /**
   * Uzģenerē zāles minikarti (Key Plan) montāžas lapas stūrim ar izceltu konkrēto sienas grupu
   */
  function renderKeyPlanThumbnail(room, roomIdx, activeGroup, width = 360, height = 240) {
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const wM = room ? (room.widthM || 30) : 30;
    const hM = room ? (room.heightM || 20) : 20;
    const gObj = (S.grids && S.grids[roomIdx]) ? S.grids[roomIdx] : S.G();
    const gId = gObj ? gObj.id : (roomIdx + 1);

    const padM = 1.8;
    const scale = Math.min(width / (wM + padM * 2), height / (hM + padM * 2));
    const px = 1 / scale;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    const gDx = (gObj && gObj.dx !== undefined) ? gObj.dx : wM / 2;
    const gDy = (gObj && gObj.dy !== undefined) ? gObj.dy : hM / 2;
    ctx.translate(-(wM / 2 - gDx), -(hM / 2 - gDy));

    // Zāles perimetrs
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-gDx, -gDy, wM, hM);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = px * 2.5;
    ctx.strokeRect(-gDx, -gDy, wM, hM);

    const isMulti = !!(S.exhibition && S.exhibition.rooms && S.exhibition.rooms.length > 1);
    const roomMods = (S.modules || []).filter(m => isMulti ? (m.gridId === gId) : true);

    // Citas sienu grupas (pelēkā krāsā)
    roomMods.forEach(m => {
      const isCur = activeGroup && activeGroup.modules.some(gm => gm.id === m.id);
      if (isCur) return;

      const spec = Geom.SPECS[m.type] || Geom.SPECS.large;
      const wp = Grid.g2w(gObj, m.x, m.y);
      const totalAngle = ((gObj.angle || 0) + (m.rot || 0)) * Math.PI / 180;

      ctx.save();
      ctx.translate(wp.x, wp.y);
      ctx.rotate(totalAngle);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-spec.length / 2, -spec.width / 2, spec.length, spec.width);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = px * 1.0;
      ctx.strokeRect(-spec.length / 2, -spec.width / 2, spec.length, spec.width);
      ctx.restore();
    });

    // Aktīvā sienu grupa (koši sarkanā tonī ar akcentu)
    if (activeGroup && activeGroup.modules) {
      activeGroup.modules.forEach(m => {
        const spec = Geom.SPECS[m.type] || Geom.SPECS.large;
        const wp = Grid.g2w(gObj, m.x, m.y);
        const totalAngle = ((gObj.angle || 0) + (m.rot || 0)) * Math.PI / 180;

        ctx.save();
        ctx.translate(wp.x, wp.y);
        ctx.rotate(totalAngle);
        ctx.fillStyle = '#b71c1c';
        ctx.fillRect(-spec.length / 2, -spec.width / 2, spec.length, spec.width);
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = px * 2.0;
        ctx.strokeRect(-spec.length / 2, -spec.width / 2, spec.length, spec.width);
        ctx.restore();
      });
    }

    ctx.restore();

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    return offscreen.toDataURL('image/png');
  }

  /**
   * Sagatavo un atver A4 Landscape montāžas lapu pārlūka drukas logā
   * Ietver:
   * 1. Kopējo stāva / noliktavas pasūtījuma specifikāciju (BOM) ar satura rādītāju
   * 2. Zāļu autentiskos kopplānus ar moduļu grupu iezīmējumu un numerācijas kodiem (Z1-SG01...)
   * 3. Atsevišķo moduļu grupu detalizētās montāžas lapas ar Key Plan minikarti
   */
  function printWallSheets(targetGroupId = null) {
    const groups = Panels.findWallGroups(S.modules);
    if (!groups.length) {
      if (EW.UI) EW.UI.toast('Plānā nav neviena moduļa drukai');
      return;
    }

    if (!S.panels || !S.panels.length) {
      Panels.generatePanels();
    }

    const isMulti = !!(S.exhibition && S.exhibition.rooms && S.exhibition.rooms.length > 1);
    let rooms = [];
    if (S.exhibition && S.exhibition.rooms && S.exhibition.rooms.length) {
      rooms = S.exhibition.rooms;
    } else {
      const w = S.img ? S.img.width * S.mpp() : 30;
      const h = S.img ? S.img.height * S.mpp() : 20;
      rooms = [{ id: 'room_1', name: S.planName || 'Izstāžu zāle', widthM: w, heightM: h }];
    }

    const targetGroups = targetGroupId ? groups.filter(g => g.id === targetGroupId) : groups;
    const relevantRooms = targetGroupId 
      ? rooms.filter((r, idx) => targetGroups.some(g => (g.roomIdx !== undefined ? g.roomIdx === idx : g.gridId === (idx + 1))))
      : rooms;

    // --- LAPPUŠU SECĪBA UN NUMERĀCIJA ---
    let curPage = 1;
    const warehousePageNum = curPage++; // Lapa 1: Noliktava

    relevantRooms.forEach((rm, rIdx) => {
      rm._pdfPageNum = curPage++; // Lapas 2..K: Zāļu kopplāni
    });

    targetGroups.forEach(g => {
      g.targetPageNum = curPage++; // Lapas (K+1)..N: Montāžas lapas
      const actualRoomIdx = (g.roomIdx !== undefined) ? g.roomIdx : ((g.gridId || 1) - 1);
      const rm = relevantRooms[actualRoomIdx] || relevantRooms[0];
      g.roomPlanPageNum = rm ? rm._pdfPageNum : 2;
    });

    const totalSheets = curPage - 1;

    const printWindow = window.open('', '_blank', 'width=1250,height=880');
    if (!printWindow) {
      if (EW.UI) EW.UI.toast('Lūdzu atļaujiet uznirstošos logus (pop-up) drukai');
      return;
    }

    const today = new Date();
    const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const planTitle = (S.exhibition && S.exhibition.name) ? S.exhibition.name : (S.planName || 'Arsenāls — Stāva plāns');

    // --- 1. APKOPOJAM KOPĒJO STĀVA / NOLIKTAVAS PASŪTĪJUMU VISĀM ZĀLĒM ---
    const allModules = S.modules || [];
    const allPanels = S.panels || [];

    const floorFrames = {};
    let totalFloorFrameWeight = 0;
    allModules.forEach(m => {
      const cls = Classifier ? Classifier.classifySingleModule(m, allModules) : { code: 'M-LN', weight: 201.97, name: '2x1m taisne' };
      const gMod = (S.grids || []).find(x => x.id === m.gridId);
      const hallName = gMod ? gMod.name : 'Zāle 1';

      if (!floorFrames[cls.code]) {
        floorFrames[cls.code] = {
          code: cls.code,
          name: cls.name,
          dims: m.type === 'large' ? '2000 × 1000 × 2970' : '1000 × 1000 × 2970',
          weight: cls.weight,
          count: 0,
          halls: {}
        };
      }
      floorFrames[cls.code].count++;
      floorFrames[cls.code].halls[hallName] = (floorFrames[cls.code].halls[hallName] || 0) + 1;
      totalFloorFrameWeight += cls.weight;
    });

    const floorPanels = {};
    let totalFloorPanelWeight = 0;
    allPanels.forEach(p => {
      const pMod = allModules.find(m => m.id === p.moduleId);
      const gMod = pMod ? (S.grids || []).find(x => x.id === pMod.gridId) : null;
      const hallName = gMod ? gMod.name : 'Zāle 1';

      if (!floorPanels[p.code]) {
        floorPanels[p.code] = {
          code: p.code,
          name: p.name,
          length: p.length,
          hand: p.hand,
          weight: p.weight,
          count: 0,
          totalWeight: 0,
          halls: {}
        };
      }
      floorPanels[p.code].count++;
      floorPanels[p.code].totalWeight += p.weight;
      floorPanels[p.code].halls[hallName] = (floorPanels[p.code].halls[hallName] || 0) + 1;
      totalFloorPanelWeight += p.weight;
    });

    const grandTotalWeight = totalFloorFrameWeight + totalFloorPanelWeight;

    // --- HTML DOKUMENTA STRUKTŪRA UN STILI ---
    let html = '<!DOCTYPE html>\n<html lang="lv">\n<head>\n  <meta charset="utf-8">\n  <title>LNMM Arsenāls — Montāžas un noliktavas shēma</title>\n  <style>\n' +
      '    @page { size: A4 landscape; margin: 8mm 10mm; }\n' +
      '    * { box-sizing: border-box; }\n' +
      '    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #1e293b; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 8.5pt; line-height: 1.35; }\n' +
      '    .sheet { page-break-after: always; display: flex; flex-direction: column; height: 192mm; box-sizing: border-box; padding: 2mm 0; justify-content: space-between; }\n' +
      '    .sheet:last-child { page-break-after: auto; }\n' +
      '    /* Galvene atbilstoši Arsenāla standartam */\n' +
      '    .top-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5mm; }\n' +
      '    .brand-col { flex: 1; }\n' +
      '    .brand-title { font-size: 13pt; font-weight: 700; color: #b71c1c; letter-spacing: 0.24em; text-transform: uppercase; margin: 0 0 1mm 0; }\n' +
      '    .brand-sub { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 1.5mm 0; }\n' +
      '    .doc-main-title { font-size: 13pt; font-weight: 700; color: #0f172a; margin: 0 0 1mm 0; }\n' +
      '    .doc-sub-title { font-size: 8.5pt; color: #475569; margin: 0; }\n' +
      '    /* Metadatu tabula labajā pusē */\n' +
      '    .meta-box { width: 72mm; border: 1px solid #cbd5e1; border-collapse: collapse; font-size: 7.8pt; }\n' +
      '    .meta-box td { padding: 1.2mm 2.2mm; border: 1px solid #e2e8f0; }\n' +
      '    .meta-box td.label { font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; width: 44%; background: #f8fafc; }\n' +
      '    .meta-box td.val { font-weight: 600; color: #0f172a; text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }\n' +
      '    .accent-bar { height: 1.5px; background: #b71c1c; margin-bottom: 3.5mm; width: 100%; }\n' +
      '    /* Rasējuma laukums */\n' +
      '    .main-body { display: flex; gap: 5mm; flex: 1; min-height: 0; margin-bottom: 2.5mm; }\n' +
      '    .dwg-pane { flex: 1.55; display: flex; flex-direction: column; position: relative; }\n' +
      '    .sec-tag { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #b71c1c; margin-bottom: 1.5mm; display: flex; justify-content: space-between; align-items: center; }\n' +
      '    .sec-tag span.aux { color: #64748b; font-weight: normal; font-size: 7.5pt; text-transform: none; }\n' +
      '    .preview-frame { flex: 1; border: 1px solid #cbd5e1; border-radius: 3px; background: #ffffff; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 2mm; position: relative; }\n' +
      '    .preview-frame img { max-width: 100%; max-height: 100%; object-fit: contain; }\n' +
      '    /* Tabulu zona */\n' +
      '    .bom-pane { flex: 1.15; display: flex; flex-direction: column; gap: 2.5mm; }\n' +
      '    .bom-card { border: 1px solid #e2e8f0; border-radius: 3px; background: #ffffff; padding: 2.5mm; flex: 1; display: flex; flex-direction: column; }\n' +
      '    table.bom-table { width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-top: 1mm; }\n' +
      '    table.bom-table th { background: #f8fafc; color: #475569; font-weight: 700; text-align: left; padding: 1.2mm 1.5mm; border-bottom: 1.5px solid #cbd5e1; text-transform: uppercase; letter-spacing: 0.03em; font-size: 7pt; }\n' +
      '    table.bom-table td { padding: 1.2mm 1.5mm; border-bottom: 1px solid #f1f5f9; color: #1e293b; }\n' +
      '    table.bom-table td.num { text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }\n' +
      '    .dot { display: inline-block; width: 6.5px; height: 6.5px; border-radius: 50%; margin-left: 3px; vertical-align: middle; }\n' +
      '    .dot.L { background: #2e7d32; }\n' +
      '    .dot.R { background: #d32f2f; }\n' +
      '    .hall-pill { display: inline-block; background: #f1f5f9; padding: 0.8px 4px; border-radius: 2px; font-size: 6.8pt; color: #475569; margin-right: 2px; }\n' +
      '    /* Key Plan minikarte rasējuma stūrī */\n' +
      '    .keyplan-box { position: absolute; top: 6px; right: 6px; background: rgba(255, 255, 255, 0.94); border: 1px solid #cbd5e1; border-radius: 4px; padding: 2.5px 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.12); width: 110px; text-align: center; z-index: 5; }\n' +
      '    .keyplan-title { font-size: 5.8pt; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.03em; }\n' +
      '    .keyplan-img { width: 100%; height: 62px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 2px; display: block; background: #ffffff; }\n' +
      '    .keyplan-tag { font-size: 5.8pt; color: #b71c1c; font-weight: 700; margin-top: 1.5px; }\n' +
      '    /* Kopsavilkuma rāmis */\n' +
      '    .summary-box { border: 1px solid #cbd5e1; border-radius: 3px; background: #f8fafc; padding: 2mm 3mm; display: flex; justify-content: space-between; align-items: center; font-size: 8.2pt; }\n' +
      '    .summary-box .highlight { font-size: 10.5pt; font-weight: 800; color: #0f172a; font-family: ui-monospace, monospace; }\n' +
      '    /* Kājene */\n' +
      '    .footer-bar { border-top: 1px solid #e2e8f0; padding-top: 1.5mm; display: flex; justify-content: space-between; font-size: 7.2pt; color: #64748b; }\n' +
      '    /* Ekrāna rīkjosla */\n' +
      '    @media screen {\n' +
      '      body { background: #e2e8f0; padding-top: 48px; }\n' +
      '      .sheet { background: #ffffff; margin: 15px auto; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border-radius: 4px; padding: 6mm 8mm; }\n' +
      '      .print-toolbar { position: fixed; top: 0; left: 0; right: 0; height: 44px; background: #1e293b; color: #ffffff; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; z-index: 100; box-shadow: 0 2px 10px rgba(0,0,0,0.25); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; }\n' +
      '      .toolbar-acts { display: flex; gap: 8px; }\n' +
      '      .toolbar-acts button { font: inherit; cursor: pointer; border-radius: 4px; padding: 6px 14px; font-size: 12px; font-weight: 600; border: none; display: flex; align-items: center; gap: 6px; }\n' +
      '      .btn-pdf-save { background: #0284c7; color: #ffffff; }\n' +
      '      .btn-pdf-save:hover { background: #0369a1; }\n' +
      '      .btn-print { background: #b71c1c; color: #ffffff; }\n' +
      '      .btn-print:hover { background: #991b1b; }\n' +
      '      .btn-close { background: #334155; color: #ffffff; }\n' +
      '      .btn-close:hover { background: #475569; }\n' +
      '    }\n' +
      '    @media print {\n' +
      '      .no-print { display: none !important; }\n' +
      '      body { background: #ffffff; padding: 0; }\n' +
      '    }\n' +
      '  </style>\n</head>\n<body>\n' +
      '  <div class="no-print print-toolbar">' +
      '    <div><b>A R S E N Ā L S</b> &bull; Montāžas shēma un noliktavas komplektācija &bull; ' + totalSheets + ' lapas</div>' +
      '    <div class="toolbar-acts">' +
      '      <button onclick="window.print()" class="btn-pdf-save">💾 Saglabāt PDF failā</button>' +
      '      <button onclick="window.print()" class="btn-print">🖨️ Drukāt</button>' +
      '      <button onclick="window.close()" class="btn-close">✖ Aizvērt</button>' +
      '    </div>' +
      '  </div>';

    // =========================================================================
    // LAPA 1: KOPĒJĀ STĀVA KOMPLEKTĀCIJAS SPECIFIKĀCIJA (NOLIKTAVAS PASŪTĪJUMS)
    // =========================================================================
    html += '<div class="sheet">';
    html += '  <div class="top-header">';
    html += '    <div class="brand-col">';
    html += '      <div class="brand-title">A R S E N Ā L S</div>';
    html += '      <div class="brand-sub">Izstāžu sienu sistēma &bull; Latvijas Nacionālais mākslas muzejs</div>';
    html += '      <div class="doc-main-title">KOPĒJĀ STĀVA KOMPLEKTĀCIJAS SPECIFIKĀCIJA (NOLIKTAVAI)</div>';
    html += '      <div class="doc-sub-title">Ekspozīcijas moduļu un apdares paneļu pasūtījums izsniegšanai un transportēšanai &bull; ' + planTitle + '</div>';
    html += '    </div>';
    html += '    <table class="meta-box">';
    html += '      <tr><td class="label">Projekts</td><td class="val">' + planTitle + '</td></tr>';
    html += '      <tr><td class="label">Zāļu skaits</td><td class="val">' + relevantRooms.length + ' zāle(s)</td></tr>';
    html += '      <tr><td class="label">Sienu grupas</td><td class="val">' + targetGroups.length + ' grupa(s)</td></tr>';
    html += '      <tr><td class="label">Dok. Nr.</td><td class="val">ASN-WH-001</td></tr>';
    html += '      <tr><td class="label">Datums</td><td class="val">' + dateStr + '</td></tr>';
    html += '      <tr><td class="label">Izstrādāja</td><td class="val">LNMM</td></tr>';
    html += '      <tr><td class="label">Lapa</td><td class="val">1 / ' + totalSheets + '</td></tr>';
    html += '    </table>';
    html += '  </div>';

    html += '  <div class="accent-bar"></div>';

    html += '  <div class="main-body" style="gap:5mm">';
    // Tabula A: Karkasa moduļi noliktavai
    html += '    <div class="bom-card" style="flex:1">';
    html += '      <div class="sec-tag" style="color:#0369a1; border-bottom:1.5px solid #bae6fd; padding-bottom:1.5mm; margin-bottom:1.5mm">' +
            '        <span>A &nbsp; Karkasa moduļu kopsavilkums</span>' +
            '        <span class="aux">Kopā: <b>' + allModules.length + ' gab.</b> (' + EW.Utils.fmt(totalFloorFrameWeight) + ' kg)</span>' +
            '      </div>';
    html += '      <table class="bom-table"><thead><tr>' +
            '        <th>Kods</th><th>Nosaukums</th><th>Gabarīti (mm)</th><th class="num">Skaits</th><th class="num">Vien. kg</th><th class="num">Kopā kg</th><th>Izvietojums grupās</th>' +
            '      </tr></thead><tbody>';
    Object.values(floorFrames).forEach(fc => {
      const groupCodes = targetGroups
        .filter(g => g.modules.some(m => Classifier.classifySingleModule(m, allModules).code === fc.code))
        .map(g => g.code)
        .join(', ');
      html += '<tr>' +
              '  <td><b>' + fc.code + '</b></td>' +
              '  <td>' + fc.name + '</td>' +
              '  <td style="font-family:ui-monospace,monospace;font-size:7pt">' + fc.dims + '</td>' +
              '  <td class="num"><b>' + fc.count + '</b></td>' +
              '  <td class="num">' + EW.Utils.fmt(fc.weight) + '</td>' +
              '  <td class="num"><b>' + EW.Utils.fmt(fc.count * fc.weight) + '</b></td>' +
              '  <td><span class="hall-pill">' + (groupCodes || '—') + '</span></td>' +
              '</tr>';
    });
    html += '      </tbody></table>';
    html += '    </div>';

    // Tabula B: Apdares paneļi noliktavai
    html += '    <div class="bom-card" style="flex:1.15">';
    html += '      <div class="sec-tag" style="color:#15803d; border-bottom:1.5px solid #bbf7d0; padding-bottom:1.5mm; margin-bottom:1.5mm">' +
            '        <span>B &nbsp; Apdares paneļu kopsavilkums</span>' +
            '        <span class="aux">Kopā: <b>' + allPanels.length + ' gab.</b> (' + EW.Utils.fmt(totalFloorPanelWeight) + ' kg)</span>' +
            '      </div>';
    html += '      <table class="bom-table"><thead><tr>' +
            '        <th>Kods</th><th>Izmērs (mm)</th><th>Puse</th><th class="num">Skaits</th><th class="num">Vien. kg</th><th class="num">Kopā kg</th><th>Izvietojums grupās</th>' +
            '      </tr></thead><tbody>';
    Object.values(floorPanels).forEach(pc => {
      const handStr = pc.hand ? (pc.hand === 'L' ? 'Kreisā <span class="dot L"></span>' : 'Labā <span class="dot R"></span>') : '&mdash;';
      const groupCodes = targetGroups
        .filter(g => (S.panels || []).some(p => p.wallGroupId === g.id && p.code === pc.code))
        .map(g => g.code)
        .join(', ');
      html += '<tr>' +
              '  <td><b>' + pc.code + '</b></td>' +
              '  <td>' + pc.length + ' × 2970</td>' +
              '  <td>' + handStr + '</td>' +
              '  <td class="num"><b>' + pc.count + '</b></td>' +
              '  <td class="num">' + EW.Utils.fmt(pc.weight) + '</td>' +
              '  <td class="num"><b>' + EW.Utils.fmt(pc.totalWeight) + '</b></td>' +
              '  <td><span class="hall-pill">' + (groupCodes || '—') + '</span></td>' +
              '</tr>';
    });
    html += '      </tbody></table>';
    html += '    </div>';
    html += '  </div>';

    // Tabula C: DOKUMENTA SATURS UN ZĀĻU / GRUPU PĀRSKATS
    html += '  <div class="bom-card" style="margin-bottom:2mm; flex:0.75">';
    html += '    <div class="sec-tag" style="color:#b71c1c; border-bottom:1.5px solid #fecaca; padding-bottom:1mm; margin-bottom:1mm">' +
            '      <span>C &nbsp; DOKUMENTA SATURS UN EKSPOZĪCIJAS ZĀĻU PĀRSKATS</span>' +
            '      <span class="aux">Kopā: <b>' + relevantRooms.length + ' zāle(s)</b> &bull; <b>' + targetGroups.length + ' moduļu grupas</b></span>' +
            '    </div>';
    html += '    <table class="bom-table"><thead><tr>' +
            '      <th>Zāle / Telpa</th><th>Gabarīti</th><th style="text-align:center">Zāles kopplāns</th><th>Moduļu grupas un montāžas lapu saites</th><th class="num">Moduļi</th><th class="num">Paneļi</th>' +
            '    </tr></thead><tbody>';

    relevantRooms.forEach((rm, rIdx) => {
      const roomGroups = targetGroups.filter(g => (g.roomIdx !== undefined ? g.roomIdx === rIdx : g.gridId === (rIdx + 1)));
      const roomModsCount = roomGroups.reduce((sum, g) => sum + g.modules.length, 0);
      const roomPansCount = (S.panels || []).filter(p => roomGroups.some(g => g.id === p.wallGroupId)).length;
      const groupLinksHtml = roomGroups.map(g => `<span class="hall-pill" style="font-weight:700;color:#0284c7">${g.code} (Lapa ${g.targetPageNum})</span>`).join(' ') || '<span style="color:#94a3b8">Tukša telpa</span>';

      html += '<tr>' +
              '  <td><b>' + rm.name + '</b></td>' +
              '  <td style="font-family:ui-monospace,monospace">' + (rm.widthM || 30) + ' × ' + (rm.heightM || 20) + ' m</td>' +
              '  <td style="text-align:center"><span style="background:#0284c7;color:#fff;padding:1px 6px;border-radius:3px;font-weight:700;font-size:7pt">Lapa ' + rm._pdfPageNum + ' &rarr;</span></td>' +
              '  <td>' + groupLinksHtml + '</td>' +
              '  <td class="num"><b>' + roomModsCount + '</b></td>' +
              '  <td class="num"><b>' + roomPansCount + '</b></td>' +
              '</tr>';
    });
    html += '    </tbody></table>';
    html += '  </div>';

    let totalExhibitionBallast = 0;
    if (EW.Stability) {
      const stab = EW.Stability.calculateExhibitionStability();
      totalExhibitionBallast = stab.totalBallast;
    }
    const finalTransportWeight = grandTotalWeight + totalExhibitionBallast;

    // Stāva kopējā transporta kopsavilkuma rāmis
    html += '  <div class="summary-box" style="background:#f1f5f9;border:1.5px solid #cbd5e1;padding:2mm 3.5mm">';
    html += '    <div>' +
            '      <span style="font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.04em">Kopējā stāva komplektācija noliktavai &bull; </span>' +
            '      <span>Karkass: <b>' + allModules.length + ' gab.</b> (' + EW.Utils.fmt(totalFloorFrameWeight) + ' kg) &bull; </span>' +
            '      <span>Paneļi: <b>' + allPanels.length + ' gab.</b> (' + EW.Utils.fmt(totalFloorPanelWeight) + ' kg) &bull; </span>' +
            '      <span>Balasta atsvari: <b style="color:#b45309">' + totalExhibitionBallast + ' kg</b></span>' +
            '    </div>';
    html += '    <div>' +
            '      <span style="color:#475569;font-size:7.8pt;text-transform:uppercase;margin-right:2mm">Kopējais transporta svars (liftam):</span>' +
            '      <span class="highlight" style="color:#b71c1c;font-size:11.5pt">' + EW.Utils.fmt(finalTransportWeight) + ' kg</span>' +
            '    </div>';
    html += '  </div>';

    html += '  <div class="footer-bar">';
    html += '    <div>LNMM Arsenāls &bull; Modulāro sienu sistēma &bull; Noliktavas pasūtījuma lapa &bull; Izsniegšanai uz objektu</div>';
    html += '    <div>Lapa 1 / ' + totalSheets + '</div>';
    html += '  </div>';
    html += '</div>';

    // =========================================================================
    // LAPAS 2 LĪDZ (1 + relevantRooms.length): ZĀĻU KOPPLĀNU LAPAS AR MARĶIERIEM
    // =========================================================================
    relevantRooms.forEach((rm, rIdx) => {
      const roomGroups = targetGroups.filter(g => (g.roomIdx !== undefined ? g.roomIdx === rIdx : g.gridId === (rIdx + 1)));
      const roomPlanImgData = renderRoomOverviewImage(rm, rIdx, roomGroups);
      const roomModCount = roomGroups.reduce((sum, g) => sum + g.modules.length, 0);
      const roomPanCount = (S.panels || []).filter(p => roomGroups.some(g => g.id === p.wallGroupId)).length;

      let roomWeight = 0;
      roomGroups.forEach(g => {
        g.modules.forEach(m => {
          const cls = Classifier ? Classifier.classifySingleModule(m, allModules) : { weight: 201.97 };
          roomWeight += cls.weight;
        });
      });
      (S.panels || []).filter(p => roomGroups.some(g => g.id === p.wallGroupId)).forEach(p => {
        roomWeight += p.weight;
      });

      const docNum = 'ASN-ZP-' + String(rIdx + 1).padStart(2, '0');

      html += '<div class="sheet">';
      html += '  <div class="top-header">';
      html += '    <div class="brand-col">';
      html += '      <div class="brand-title">A R S E N Ā L S</div>';
      html += '      <div class="brand-sub">Izstāžu sienu sistēma &bull; Latvijas Nacionālais mākslas muzejs</div>';
      html += '      <div class="doc-main-title">ZĀLES TELPAS PLĀNS UN MODUĻU IZVIETOJUMS</div>';
      html += '      <div class="doc-sub-title">Ekspozīcijas zāle: <b>' + rm.name + '</b> &bull; Gabarīti: ' + (rm.widthM || 30) + '×' + (rm.heightM || 20) + ' m &bull; Projekts: ' + planTitle + '</div>';
      html += '    </div>';
      html += '    <table class="meta-box">';
      html += '      <tr><td class="label">Projekts</td><td class="val">' + planTitle + '</td></tr>';
      html += '      <tr><td class="label">Zāle</td><td class="val">' + rm.name + '</td></tr>';
      html += '      <tr><td class="label">Sienu grupas</td><td class="val" style="color:#0284c7;font-weight:800">' + roomGroups.length + ' grupa(s)</td></tr>';
      html += '      <tr><td class="label">Moduļu skaits</td><td class="val">' + roomModCount + ' gab.</td></tr>';
      html += '      <tr><td class="label">Dok. Nr.</td><td class="val">' + docNum + '</td></tr>';
      html += '      <tr><td class="label">Datums</td><td class="val">' + dateStr + '</td></tr>';
      html += '      <tr><td class="label">Mērogs</td><td class="val">1 : 100</td></tr>';
      html += '      <tr><td class="label">Lapa</td><td class="val">' + rm._pdfPageNum + ' / ' + totalSheets + '</td></tr>';
      html += '    </table>';
      html += '  </div>';

      html += '  <div class="accent-bar" style="background:#0284c7"></div>';

      html += '  <div class="main-body" style="gap:5mm">';
      // Kreisajā pusē: Zāles kopplāna rasējums ar moduļu grupām un marķieriem
      html += '    <div class="dwg-pane" style="flex:1.65">';
      html += '      <div class="sec-tag" style="color:#0284c7">' +
              '        <span>A &nbsp; TELPAS PLĀNS AR MODUĻU GRUPĀM <span class="aux">(Horizontālais griezums &bull; 500 mm režģis)</span></span>' +
              '        <span class="aux">Kopā: <b>' + roomModCount + ' moduļi</b></span>' +
              '      </div>';
      html += '      <div class="preview-frame">' +
              '        <img src="' + roomPlanImgData + '" alt="Zāles plāns: ' + rm.name + '">' +
              '      </div>';
      html += '    </div>';

      // Labajā pusē: Zāles moduļu grupu rādītājs (Index Table)
      html += '    <div class="bom-pane" style="flex:1.05">';
      html += '      <div class="bom-card">';
      html += '        <div class="sec-tag" style="color:#0f172a; border-bottom:1.5px solid #cbd5e1; padding-bottom:1.5mm; margin-bottom:1.5mm">' +
              '          <span>B &nbsp; Zāles moduļu grupu rādītājs</span>' +
              '          <span class="aux">' + roomGroups.length + ' grupas</span>' +
              '        </div>';
      html += '        <table class="bom-table"><thead><tr>' +
              '          <th>Grupas kods</th><th>Konfigurācija</th><th class="num">Moduļi</th><th class="num">Paneļi</th><th class="num">Svars kg</th><th style="text-align:right">Montāžas lapa</th>' +
              '        </tr></thead><tbody>';

      roomGroups.forEach(g => {
        const modCount = g.modules.length;
        const gPanels = (S.panels || []).filter(p => p.wallGroupId === g.id);

        let runLen = 0;
        let gWeight = 0;
        g.modules.forEach(m => {
          runLen += (m.type === 'small' ? 1.0 : 2.0);
          const cls = Classifier ? Classifier.classifySingleModule(m, allModules) : { weight: 201.97 };
          gWeight += cls.weight;
        });
        gPanels.forEach(p => { gWeight += p.weight; });

        let shapeDesc = 'Taisne';
        if (g.isFree || (g.name && g.name.includes('brīvstāvoša'))) {
          shapeDesc = 'Brīvstāvošs';
        } else if (g.modules.length >= 3) {
          const rots = new Set(g.modules.map(m => m.rot || 0));
          shapeDesc = rots.size > 1 ? 'L/T-veida siena' : 'Taisna siena';
        } else if (g.modules.length === 2) {
          const rots = new Set(g.modules.map(m => m.rot || 0));
          shapeDesc = rots.size > 1 ? 'L-veida stūris' : 'Taisne (4m)';
        }

        html += '<tr>' +
                '  <td><b style="color:#0284c7;font-family:ui-monospace,monospace;font-size:8pt">' + g.code + '</b></td>' +
                '  <td>' + shapeDesc + ' <span style="color:#64748b;font-size:6.8pt">(' + runLen.toFixed(1) + 'm)</span></td>' +
                '  <td class="num"><b>' + modCount + '</b></td>' +
                '  <td class="num"><b>' + gPanels.length + '</b></td>' +
                '  <td class="num">' + EW.Utils.fmt(gWeight) + '</td>' +
                '  <td style="text-align:right"><span style="background:#0284c7;color:#fff;padding:1px 6px;border-radius:3px;font-weight:700;font-size:7pt">Lapa ' + g.targetPageNum + ' &rarr;</span></td>' +
                '</tr>';
      });

      if (!roomGroups.length) {
        html += '<tr><td colspan="6" style="text-align:center;padding:8mm;color:#94a3b8">Šajā zālē moduļi nav izvietoti (Tukša telpa)</td></tr>';
      }

      html += '        </tbody></table>';
      html += '      </div>';

      // Zāles kopsavilkuma rāmis
      html += '      <div class="summary-box" style="margin-top:auto">';
      html += '        <div><span style="color:#475569">Zāles moduļi:</span> <b>' + roomModCount + ' gab.</b> &bull; <span style="color:#475569">Paneļi:</span> <b>' + roomPanCount + ' gab.</b></div>';
      html += '        <div><span style="color:#475569;font-size:7.5pt;text-transform:uppercase">Kopējais svars zālē:</span> <span class="highlight" style="color:#0284c7">' + EW.Utils.fmt(roomWeight) + ' kg</span></div>';
      html += '      </div>';

      html += '    </div>';
      html += '  </div>';

      html += '  <div class="footer-bar">';
      html += '    <div>LNMM Arsenāls &bull; Zāles telpas plāns ar moduļu grupām &bull; ' + rm.name + ' &bull; Dok. ' + docNum + '</div>';
      html += '    <div>Lapa ' + rm._pdfPageNum + ' / ' + totalSheets + '</div>';
      html += '  </div>';
      html += '</div>';
    });

    // =========================================================================
    // NĀKAMĀS LAPAS: ATSEVIŠĶO SIENU GRUPU MONTĀŽAS SHĒMAS AR KEY PLAN MINIKARTI
    // =========================================================================
    targetGroups.forEach(g => {
      const imgData = renderWallPreviewImage(g);
      const actualRoomIdx = (g.roomIdx !== undefined) ? g.roomIdx : ((g.gridId || 1) - 1);
      const rm = relevantRooms[actualRoomIdx] || relevantRooms[0];
      const keyPlanImg = renderKeyPlanThumbnail(rm, actualRoomIdx, g);
      const groupPanels = (S.panels || []).filter(p => p.wallGroupId === g.id);

      // Karkasa moduļu apkopošana
      const frameCounts = {};
      let frameWeight = 0;
      g.modules.forEach(m => {
        const cls = Classifier ? Classifier.classifySingleModule(m, allModules) : { code: 'M-LN', weight: 201.97, name: '2x1m taisne' };
        if (!frameCounts[cls.code]) frameCounts[cls.code] = { code: cls.code, name: cls.name, weight: cls.weight, count: 0 };
        frameCounts[cls.code].count++;
        frameWeight += cls.weight;
      });

      // Apdares paneļu apkopošana
      const panelCounts = {};
      let pWeight = 0;
      groupPanels.forEach(p => {
        if (!panelCounts[p.code]) {
          panelCounts[p.code] = {
            code: p.code,
            name: p.name,
            length: p.length,
            hand: p.hand,
            weight: p.weight,
            count: 0,
            totalWeight: 0
          };
        }
        panelCounts[p.code].count++;
        panelCounts[p.code].totalWeight += p.weight;
        pWeight += p.weight;
      });

      let groupBallast = 0;
      if (EW.Stability) {
        g.modules.forEach(m => {
          const modArts = (S.artworks || []).filter(a => a.moduleId === m.id);
          const mStab = EW.Stability.calculateModuleStability(m, modArts);
          groupBallast += mStab.ballastNeeded;
        });
      }

      const totalGroupWeight = frameWeight + pWeight + groupBallast;
      const docNum = 'ASN-M3-' + g.code.replace(/[^a-zA-Z0-9_-]/g, '_');

      html += '<div class="sheet">';

      // 1. Standarta galvene ar skaidru grupas kodu un zāles kopplāna atsauci
      html += '  <div class="top-header">';
      html += '    <div class="brand-col">';
      html += '      <div class="brand-title">A R S E N Ā L S</div>';
      html += '      <div class="brand-sub">Izstāžu sienu sistēma &bull; Latvijas Nacionālais mākslas muzejs</div>';
      html += '      <div class="doc-main-title">MODUĻU GRUPAS MONTĀŽAS SHĒMA: ' + g.code + '</div>';
      html += '      <div class="doc-sub-title">Konfigurācija: <b>' + g.name + '</b> &bull; Telpa: ' + (g.roomName || g.gridName) + ' &bull; <b>Zāles kopplāns: Lapa ' + g.roomPlanPageNum + '</b></div>';
      html += '    </div>';
      html += '    <table class="meta-box">';
      html += '      <tr><td class="label">Projekts</td><td class="val">' + planTitle + '</td></tr>';
      html += '      <tr><td class="label">Grupas kods</td><td class="val" style="color:#b71c1c;font-weight:800">' + g.code + '</td></tr>';
      html += '      <tr><td class="label">Zāle / Zona</td><td class="val">' + (g.roomName || g.gridName) + '</td></tr>';
      html += '      <tr><td class="label">Kopplāns</td><td class="val">Lapa ' + g.roomPlanPageNum + '</td></tr>';
      html += '      <tr><td class="label">Dok. Nr.</td><td class="val">' + docNum + '</td></tr>';
      html += '      <tr><td class="label">Datums</td><td class="val">' + dateStr + '</td></tr>';
      html += '      <tr><td class="label">Mērogs</td><td class="val">1 : 50</td></tr>';
      html += '      <tr><td class="label">Lapa</td><td class="val">' + g.targetPageNum + ' / ' + totalSheets + '</td></tr>';
      html += '    </table>';
      html += '  </div>';

      html += '  <div class="accent-bar"></div>';

      // 2. Galvenā satura zona: kreisajā pusē rasējums ar Key Plan minikarti, labajā pusē BOM
      html += '  <div class="main-body">';
      html += '    <div class="dwg-pane">';
      html += '      <div class="sec-tag">' +
              '        <span>B &nbsp; RASĒJUMS <span class="aux">Plakne W–T (Plāns no augšas &bull; Mērogs 1:50)</span></span>' +
              '        <span class="aux" style="color:#0284c7;font-weight:700">Kods: ' + g.code + '</span>' +
              '      </div>';
      html += '      <div class="preview-frame">' +
              '        <img src="' + imgData + '" alt="' + g.name + '">' +
              '        <!-- Key Plan minikarte stūrī -->' +
              '        <div class="keyplan-box">' +
              '          <div class="keyplan-title">🧭 ' + (g.roomName || g.gridName) + '</div>' +
              '          <img class="keyplan-img" src="' + keyPlanImg + '" alt="Key plan">' +
              '          <div class="keyplan-tag">● ' + g.code + ' novietojums</div>' +
              '        </div>' +
              '      </div>';
      html += '    </div>';

      html += '    <div class="bom-pane">';
      // Karkasa tabula
      html += '      <div class="bom-card">';
      html += '        <div class="sec-tag" style="color:#0369a1; border-bottom:1px solid #e0f2fe; padding-bottom:1mm; margin-bottom:1mm">A &nbsp; Karkasa moduļi (' + g.code + ')</div>';
      html += '        <table class="bom-table"><thead><tr><th>Kods</th><th>Nosaukums</th><th class="num">Skaits</th><th class="num">Vien. kg</th><th class="num">Kopā kg</th></tr></thead><tbody>';
      Object.values(frameCounts).forEach(fc => {
        html += '<tr><td><b>' + fc.code + '</b></td><td>' + fc.name + '</td><td class="num"><b>' + fc.count + '</b></td><td class="num">' + EW.Utils.fmt(fc.weight) + '</td><td class="num">' + EW.Utils.fmt(fc.count * fc.weight) + '</td></tr>';
      });
      html += '        </tbody></table>';
      html += '      </div>';

      // Paneļu tabula
      html += '      <div class="bom-card">';
      html += '        <div class="sec-tag" style="color:#15803d; border-bottom:1px solid #f0fdf4; padding-bottom:1mm; margin-bottom:1mm">B &nbsp; Apdares paneļi (' + g.code + ')</div>';
      html += '        <table class="bom-table"><thead><tr><th>Kods</th><th>Izmērs</th><th>Puse</th><th class="num">Skaits</th><th class="num">Vien. kg</th><th class="num">Kopā kg</th></tr></thead><tbody>';
      Object.values(panelCounts).forEach(pc => {
        const handStr = pc.hand ? (pc.hand === 'L' ? 'Kreisā <span class="dot L"></span>' : 'Labā <span class="dot R"></span>') : '&mdash;';
        html += '<tr><td><b>' + pc.code + '</b></td><td>' + pc.length + 'mm</td><td>' + handStr + '</td><td class="num"><b>' + pc.count + '</b></td><td class="num">' + EW.Utils.fmt(pc.weight) + '</td><td class="num">' + EW.Utils.fmt(pc.totalWeight) + '</td></tr>';
      });
      html += '        </tbody></table>';
      html += '      </div>';
      html += '    </div>';
      html += '  </div>';

      // Kopsavilkuma josla
      html += '  <div class="summary-box">';
      html += '    <div><span style="color:#475569">Karkass:</span> <b>' + EW.Utils.fmt(frameWeight) + ' kg</b> &nbsp;&bull;&nbsp; <span style="color:#475569">Apdares paneļi:</span> <b>' + EW.Utils.fmt(pWeight) + ' kg</b> &nbsp;&bull;&nbsp; <span style="color:#475569">Balasts:</span> <b style="color:#b45309">' + (groupBallast > 0 ? groupBallast + ' kg' : '0 kg (stabils)') + '</b></div>';
      html += '    <div><span style="color:#475569;font-size:7.8pt;text-transform:uppercase">Kopējais sienas svars:</span> <span class="highlight">' + EW.Utils.fmt(totalGroupWeight) + ' kg</span></div>';
      html += '  </div>';

      // Kājene
      html += '  <div class="footer-bar">';
      html += '    <div>LNMM Arsenāls &bull; Modulāro sienu sistēma &bull; Sienas montāžas shēma &bull; Dok. ' + docNum + ' &bull; Kopplāns: Lapa ' + g.roomPlanPageNum + '</div>';
      html += '    <div>Lapa ' + g.targetPageNum + ' / ' + totalSheets + '</div>';
      html += '  </div>';

      html += '</div>';
    });

    html += '</body></html>';

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  /**
   * Drukā mākslas darbu montāžas koordināšu specifikāciju montieriem
   */
  function printMountingSchedule() {
    const artworks = S.artworks || [];
    if (!artworks.length) {
      if (EW.UI) EW.UI.toast('Projektā nav neviena mākslas darba');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1100,height=850');
    if (!printWindow) {
      if (EW.UI) EW.UI.toast('Lūdzu atļaujiet uznirstošos logus (pop-up) drukai');
      return;
    }

    const today = new Date();
    const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const planTitle = S.planName || 'Arsenāls — Izstāde';

    let html = '<!DOCTYPE html><html><head><meta charset="utf-8">';
    html += '<title>Mākslas darbu montāžas koordināšu specifikācija — ' + planTitle + '</title>';
    html += '<style>';
    html += '@page { size: A4 portrait; margin: 12mm 15mm; }';
    html += 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 9pt; color: #0f172a; margin: 0; }';
    html += '.sheet { page-break-after: always; padding: 5mm 0; }';
    html += '.sheet:last-child { page-break-after: avoid; }';
    html += '.top-bar { display: flex; justify-content: space-between; border-bottom: 2px solid #b71c1c; padding-bottom: 3mm; margin-bottom: 5mm; }';
    html += '.brand { font-weight: 800; font-size: 14pt; letter-spacing: 0.1em; color: #b71c1c; }';
    html += '.sub { font-size: 8pt; color: #64748b; margin-top: 1mm; }';
    html += '.title { font-size: 13pt; font-weight: 700; margin: 3mm 0 1mm; }';
    html += '.wall-sec { margin-top: 5mm; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; margin-bottom: 5mm; }';
    html += '.wall-header { background: #f1f5f9; padding: 2.5mm 4mm; font-weight: 700; font-size: 9.5pt; color: #1e293b; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: space-between; }';
    html += 'table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }';
    html += 'th { background: #f8fafc; text-align: left; padding: 2mm 3mm; border-bottom: 1px solid #cbd5e1; font-weight: 600; color: #475569; font-size: 8pt; }';
    html += 'td { padding: 2.5mm 3mm; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }';
    html += 'tr:last-child td { border-bottom: none; }';
    html += '.coord { font-family: ui-monospace, monospace; font-weight: 700; color: #0369a1; }';
    html += '.elev { font-family: ui-monospace, monospace; font-weight: 700; color: #b45309; }';
    html += '@media print { button { display: none; } }';
    html += '</style></head><body>';

    html += '<div class="sheet">';
    html += '  <div class="top-bar">';
    html += '    <div>';
    html += '      <div class="brand">A R S E N Ā L S</div>';
    html += '      <div class="sub">Latvijas Nacionālais mākslas muzejs &bull; Izstāžu iekārtošanas dienests</div>';
    html += '      <div class="title">Mākslas darbu montāžas koordināšu specifikācija</div>';
    html += '    </div>';
    html += '    <div style="text-align:right;font-size:8pt;color:#64748b">';
    html += '      <div>Projekts: <b>' + planTitle + '</b></div>';
    html += '      <div>Datums: ' + dateStr + '</div>';
    html += '      <div>Kopā eksponāti: <b>' + artworks.length + ' gab.</b></div>';
    html += '    </div>';
    html += '  </div>';

    const placed = artworks.filter(a => a.moduleId);
    const unplaced = artworks.filter(a => !a.moduleId);

    html += '  <div class="wall-sec">';
    html += '    <div class="wall-header"><span>Izvietotie mākslas darbi pie sienām (' + placed.length + ')</span><span>Lāzermēra koordinātas</span></div>';
    html += '    <table><thead><tr>';
    html += '      <th style="width:30px">Nr.</th>';
    html += '      <th>Eksponāts un autors</th>';
    html += '      <th>Siena / Puse</th>';
    html += '      <th>Izmēri (W×H)</th>';
    html += '      <th>Svars</th>';
    html += '      <th>X no moduļa centra</th>';
    html += '      <th>Apakša no grīdas</th>';
    html += '      <th>Centrs no grīdas</th>';
    html += '      <th>Statuss</th>';
    html += '    </tr></thead><tbody>';

    placed.forEach((art, i) => {
      const elev = art.elevation !== undefined ? art.elevation : 1.20;
      const centerH = elev + (art.height || 1.2) / 2;
      const sideName = art.wallSide === 'front' ? 'Priekšpuse (A)' : 'Aizmugure (B)';
      const posStr = (art.posOnWall >= 0 ? '+' : '') + (art.posOnWall || 0).toFixed(2) + ' m';

      html += '<tr>';
      html += '  <td>' + (i + 1) + '.</td>';
      html += '  <td><b>' + EW.Utils.esc(art.title) + '</b><br><span style="color:#64748b;font-size:7.5pt">' + EW.Utils.esc(art.author || '') + '</span></td>';
      html += '  <td>' + art.moduleId + '<br><span style="font-size:7.5pt;color:#64748b">' + sideName + '</span></td>';
      html += '  <td>' + art.width + ' × ' + art.height + ' m</td>';
      html += '  <td><b>' + art.weight + ' kg</b></td>';
      html += '  <td class="coord">X = ' + posStr + '</td>';
      html += '  <td class="elev">h = ' + elev.toFixed(2) + ' m</td>';
      html += '  <td style="font-family:ui-monospace,monospace">H_c = ' + centerH.toFixed(2) + ' m</td>';
      html += '  <td>' + (art.locked ? '<span style="color:#b45309;font-weight:700">🔒 Bloķēts</span>' : '<span style="color:#16a34a">✓ Brīvs</span>') + '</td>';
      html += '</tr>';
    });

    html += '    </tbody></table>';
    html += '  </div>';

    if (unplaced.length > 0) {
      html += '  <div class="wall-sec" style="border-color:#f59e0b">';
      html += '    <div class="wall-header" style="background:#fef3c7;color:#92400e"><span>Neizvietotie eksponāti noliktavā (' + unplaced.length + ')</span></div>';
      html += '    <table><thead><tr><th>Nr.</th><th>Nosaukums</th><th>Autors</th><th>Izmēri</th><th>Svars</th><th>Ieteicamais h</th></tr></thead><tbody>';
      unplaced.forEach((art, i) => {
        html += '<tr>';
        html += '  <td>' + (i + 1) + '.</td>';
        html += '  <td><b>' + EW.Utils.esc(art.title) + '</b></td>';
        html += '  <td>' + EW.Utils.esc(art.author || '—') + '</td>';
        html += '  <td>' + art.width + ' × ' + art.height + ' m</td>';
        html += '  <td>' + art.weight + ' kg</td>';
        html += '  <td>h = ' + (art.elevation || 1.2).toFixed(2) + ' m</td>';
        html += '</tr>';
      });
      html += '    </tbody></table>';
      html += '  </div>';
    }

    html += '</div></body></html>';

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  /**
   * Drukā muzeja anotāciju etiķetes (Captions) A4 formātā ar griezuma līnijām
   */
  function printArtworkCaptions() {
    const artworks = S.artworks || [];
    if (!artworks.length) {
      if (EW.UI) EW.UI.toast('Projektā nav neviena mākslas darba');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=950,height=850');
    if (!printWindow) {
      if (EW.UI) EW.UI.toast('Lūdzu atļaujiet uznirstošos logus (pop-up) drukai');
      return;
    }

    let html = '<!DOCTYPE html><html><head><meta charset="utf-8">';
    html += '<title>Eksponātu anotāciju etiķetes</title>';
    html += '<style>';
    html += '@page { size: A4 portrait; margin: 10mm; }';
    html += 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Georgia, serif; margin: 0; background: #fff; }';
    html += '.label-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }';
    html += '.label-card { border: 1px dashed #cbd5e1; padding: 8mm 10mm; min-height: 48mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-inside: avoid; }';
    html += '.author { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #0f172a; margin-bottom: 2mm; font-family: sans-serif; }';
    html += '.title { font-size: 11pt; font-style: italic; color: #1e293b; margin-bottom: 2mm; }';
    html += '.details { font-size: 8.5pt; color: #475569; line-height: 1.4; }';
    html += '.footer-tag { font-size: 7pt; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; border-top: 1px solid #f1f5f9; padding-top: 2mm; margin-top: 3mm; font-family: sans-serif; display: flex; justify-content: space-between; }';
    html += '@media print { .no-print { display: none; } }';
    html += '</style></head><body>';

    html += '<div class="label-grid">';
    artworks.forEach(art => {
      const wCm = Math.round((art.width || 1.0) * 100);
      const hCm = Math.round((art.height || 1.2) * 100);

      html += '<div class="label-card">';
      html += '  <div>';
      html += '    <div class="author">' + EW.Utils.esc(art.author || 'Nezināms autors') + '</div>';
      html += '    <div class="title">' + EW.Utils.esc(art.title) + '</div>';
      html += '    <div class="details">';
      html += '      <span>Audekls, eļļa</span> &bull; <span>' + wCm + ' &times; ' + hCm + ' cm</span><br>';
      html += '      <span>LNMM kolekcija</span>';
      html += '    </div>';
      html += '  </div>';
      html += '  <div class="footer-tag">';
      html += '    <span>Latvijas Nacionālais mākslas muzejs</span>';
      html += '    <span>' + (art.invNo || art.id) + '</span>';
      html += '  </div>';
      html += '</div>';
    });
    html += '</div></body></html>';

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  EW.Modules.PdfExport = {
    renderWallPreviewImage,
    printWallSheets,
    printMountingSchedule,
    printArtworkCaptions
  };
})();
