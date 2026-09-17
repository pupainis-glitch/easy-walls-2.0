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
   * Sagatavo un atver A4 Landscape montāžas lapu pārlūka drukas logā
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

    const targetGroups = targetGroupId ? groups.filter(g => g.id === targetGroupId) : groups;
    const printWindow = window.open('', '_blank', 'width=1200,height=880');
    if (!printWindow) {
      if (EW.UI) EW.UI.toast('Lūdzu atļaujiet uznirstošos logus (pop-up) drukai');
      return;
    }

    const today = new Date();
    const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const planTitle = S.planName || 'Arsenāls — Stāva plāns';
    const totalSheets = targetGroups.length + 1;

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
      '    /* Galvene atbilstoši Arsenāla stabilitātes aprēķinam */\n' +
      '    .top-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5mm; }\n' +
      '    .brand-col { flex: 1; }\n' +
      '    .brand-title { font-size: 13pt; font-weight: 700; color: #b71c1c; letter-spacing: 0.24em; text-transform: uppercase; margin: 0 0 1mm 0; }\n' +
      '    .brand-sub { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 1.5mm 0; }\n' +
      '    .doc-main-title { font-size: 13.5pt; font-weight: 700; color: #0f172a; margin: 0 0 1mm 0; }\n' +
      '    .doc-sub-title { font-size: 8.5pt; color: #475569; margin: 0; }\n' +
      '    /* Metadatu tabula labajā pusē */\n' +
      '    .meta-box { width: 72mm; border: 1px solid #cbd5e1; border-collapse: collapse; font-size: 7.8pt; }\n' +
      '    .meta-box td { padding: 1.2mm 2.2mm; border: 1px solid #e2e8f0; }\n' +
      '    .meta-box td.label { font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; width: 44%; background: #f8fafc; }\n' +
      '    .meta-box td.val { font-weight: 600; color: #0f172a; text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }\n' +
      '    .accent-bar { height: 1.5px; background: #b71c1c; margin-bottom: 3.5mm; width: 100%; }\n' +
      '    /* Rasējuma laukums */\n' +
      '    .main-body { display: flex; gap: 5mm; flex: 1; min-height: 0; margin-bottom: 2.5mm; }\n' +
      '    .dwg-pane { flex: 1.55; display: flex; flex-direction: column; }\n' +
      '    .sec-tag { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #b71c1c; margin-bottom: 1.5mm; display: flex; justify-content: space-between; align-items: center; }\n' +
      '    .sec-tag span.aux { color: #64748b; font-weight: normal; font-size: 7.5pt; text-transform: none; }\n' +
      '    .preview-frame { flex: 1; border: 1px solid #cbd5e1; border-radius: 3px; background: #ffffff; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 2mm; }\n' +
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
    html += '      <tr><td class="label">Zāļu skaits</td><td class="val">' + (S.grids || []).length + ' zāle(s)</td></tr>';
    html += '      <tr><td class="label">Sienu grupas</td><td class="val">' + groups.length + ' siena(s)</td></tr>';
    html += '      <tr><td class="label">Dok. Nr.</td><td class="val">ASN-WH-001</td></tr>';
    html += '      <tr><td class="label">Datums</td><td class="val">' + dateStr + '</td></tr>';
    html += '      <tr><td class="label">Izstrādāja</td><td class="val">LNMM</td></tr>';
    html += '      <tr><td class="label">Lapa</td><td class="val">1 / ' + totalSheets + '</td></tr>';
    html += '    </table>';
    html += '  </div>';

    html += '  <div class="accent-bar"></div>';

    html += '  <div class="main-body" style="gap:6mm">';
    // Tabula A: Karkasa moduļi noliktavai
    html += '    <div class="bom-card" style="flex:1">';
    html += '      <div class="sec-tag" style="color:#0369a1; border-bottom:1.5px solid #bae6fd; padding-bottom:1.5mm; margin-bottom:1.5mm">' +
            '        <span>A &nbsp; Karkasa moduļu kopsavilkums stāvam</span>' +
            '        <span class="aux">Kopā: <b>' + allModules.length + ' gab.</b> (' + EW.Utils.fmt(totalFloorFrameWeight) + ' kg)</span>' +
            '      </div>';
    html += '      <table class="bom-table"><thead><tr>' +
            '        <th>Kods</th><th>Nosaukums</th><th>Gabarīti (mm)</th><th class="num">Skaits</th><th class="num">Vien. kg</th><th class="num">Kopā kg</th><th>Izvietojums pa zālēm</th>' +
            '      </tr></thead><tbody>';
    Object.values(floorFrames).forEach(fc => {
      const hallDetails = Object.entries(fc.halls).map(([h, c]) => `<span class="hall-pill">${h}: ${c}</span>`).join('');
      html += '<tr>' +
              '  <td><b>' + fc.code + '</b></td>' +
              '  <td>' + fc.name + '</td>' +
              '  <td style="font-family:ui-monospace,monospace;font-size:7pt">' + fc.dims + '</td>' +
              '  <td class="num"><b>' + fc.count + '</b></td>' +
              '  <td class="num">' + EW.Utils.fmt(fc.weight) + '</td>' +
              '  <td class="num"><b>' + EW.Utils.fmt(fc.count * fc.weight) + '</b></td>' +
              '  <td>' + hallDetails + '</td>' +
              '</tr>';
    });
    html += '      </tbody></table>';
    html += '    </div>';

    // Tabula B: Apdares paneļi noliktavai
    html += '    <div class="bom-card" style="flex:1.15">';
    html += '      <div class="sec-tag" style="color:#15803d; border-bottom:1.5px solid #bbf7d0; padding-bottom:1.5mm; margin-bottom:1.5mm">' +
            '        <span>B &nbsp; Apdares paneļu kopsavilkums stāvam</span>' +
            '        <span class="aux">Kopā: <b>' + allPanels.length + ' gab.</b> (' + EW.Utils.fmt(totalFloorPanelWeight) + ' kg)</span>' +
            '      </div>';
    html += '      <table class="bom-table"><thead><tr>' +
            '        <th>Kods</th><th>Izmērs (mm)</th><th>Puse</th><th class="num">Skaits</th><th class="num">Vien. kg</th><th class="num">Kopā kg</th><th>Izvietojums pa zālēm</th>' +
            '      </tr></thead><tbody>';
    Object.values(floorPanels).forEach(pc => {
      const handStr = pc.hand ? (pc.hand === 'L' ? 'Kreisā <span class="dot L"></span>' : 'Labā <span class="dot R"></span>') : '&mdash;';
      const hallDetails = Object.entries(pc.halls).map(([h, c]) => `<span class="hall-pill">${h}: ${c}</span>`).join('');
      html += '<tr>' +
              '  <td><b>' + pc.code + '</b></td>' +
              '  <td>' + pc.length + ' × 2970</td>' +
              '  <td>' + handStr + '</td>' +
              '  <td class="num"><b>' + pc.count + '</b></td>' +
              '  <td class="num">' + EW.Utils.fmt(pc.weight) + '</td>' +
              '  <td class="num"><b>' + EW.Utils.fmt(pc.totalWeight) + '</b></td>' +
              '  <td>' + hallDetails + '</td>' +
              '</tr>';
    });
    html += '      </tbody></table>';
    html += '    </div>';
    html += '  </div>';

    let totalExhibitionBallast = 0;
    if (EW.Stability) {
      const stab = EW.Stability.calculateExhibitionStability();
      totalExhibitionBallast = stab.totalBallast;
    }
    const finalTransportWeight = grandTotalWeight + totalExhibitionBallast;

    // Stāva kopējā transporta kopsavilkuma rāmis
    html += '  <div class="summary-box" style="background:#f1f5f9;border:1.5px solid #cbd5e1;padding:2.5mm 4mm">';
    html += '    <div>' +
            '      <span style="font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.04em">Kopējā stāva komplektācija noliktavai &bull; </span>' +
            '      <span>Karkass: <b>' + allModules.length + ' gab.</b> (' + EW.Utils.fmt(totalFloorFrameWeight) + ' kg) &bull; </span>' +
            '      <span>Paneļi: <b>' + allPanels.length + ' gab.</b> (' + EW.Utils.fmt(totalFloorPanelWeight) + ' kg) &bull; </span>' +
            '      <span>Balasta atsvari: <b style="color:#b45309">' + totalExhibitionBallast + ' kg</b></span>' +
            '    </div>';
    html += '    <div>' +
            '      <span style="color:#475569;font-size:7.8pt;text-transform:uppercase;margin-right:2mm">Kopējais transporta svars (liftam):</span>' +
            '      <span class="highlight" style="color:#b71c1c;font-size:12pt">' + EW.Utils.fmt(finalTransportWeight) + ' kg</span>' +
            '    </div>';
    html += '  </div>';

    html += '  <div class="footer-bar">';
    html += '    <div>LNMM Arsenāls &bull; Modulāro sienu sistēma &bull; Noliktavas pasūtījuma lapa &bull; Izsniegšanai uz objektu</div>';
    html += '    <div>Lapa 1 / ' + totalSheets + '</div>';
    html += '  </div>';
    html += '</div>';

    // =========================================================================
    // NĀKAMĀS LAPAS (2 līdz N): ATSEVIŠĶO SIENU GRUPU MONTĀŽAS SHĒMAS AR RASĒJUMU
    // =========================================================================
    targetGroups.forEach((g, idx) => {
      const imgData = renderWallPreviewImage(g);
      const groupPanels = (S.panels || []).filter(p => p.wallGroupId === g.id);

      // Karkasa moduļu apkopošana
      const frameCounts = {};
      let frameWeight = 0;
      g.modules.forEach(m => {
        const cls = Classifier ? Classifier.classifySingleModule(m, S.modules) : { code: 'M-LN', weight: 201.97, name: '2x1m taisne' };
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
      const docNum = 'ASN-M3-' + String(g.id).padStart(3, '0');
      const sheetPageNum = idx + 2;

      html += '<div class="sheet">';

      // 1. Arsenāla standarta galvene
      html += '  <div class="top-header">';
      html += '    <div class="brand-col">';
      html += '      <div class="brand-title">A R S E N Ā L S</div>';
      html += '      <div class="brand-sub">Izstāžu sienu sistēma &bull; Latvijas Nacionālais mākslas muzejs</div>';
      html += '      <div class="doc-main-title">Modulāro sienu montāžas shēma</div>';
      html += '      <div class="doc-sub-title">Konfigurācija: <b>' + g.name + '</b> &bull; Telpa: ' + planTitle + ' &bull; ' + g.gridName + '</div>';
      html += '    </div>';
      html += '    <table class="meta-box">';
      html += '      <tr><td class="label">Projekts</td><td class="val">' + planTitle + '</td></tr>';
      html += '      <tr><td class="label">Zāle / Zona</td><td class="val">' + (g.gridName || 'Galvenā') + '</td></tr>';
      html += '      <tr><td class="label">Dok. Nr.</td><td class="val">' + docNum + '</td></tr>';
      html += '      <tr><td class="label">Datums</td><td class="val">' + dateStr + '</td></tr>';
      html += '      <tr><td class="label">Izstrādāja</td><td class="val">LNMM</td></tr>';
      html += '      <tr><td class="label">Mērogs</td><td class="val">1 : 50</td></tr>';
      html += '      <tr><td class="label">Lapa</td><td class="val">' + sheetPageNum + ' / ' + totalSheets + '</td></tr>';
      html += '    </table>';
      html += '  </div>';

      html += '  <div class="accent-bar"></div>';

      // 2. Galvenā satura zona: kreisajā pusē rasējums, labajā pusē BOM
      html += '  <div class="main-body">';
      html += '    <div class="dwg-pane">';
      html += '      <div class="sec-tag">B &nbsp; RASĒJUMS <span class="aux">Plakne W–T (Plāns no augšas)</span></div>';
      html += '      <div class="preview-frame"><img src="' + imgData + '" alt="' + g.name + '"></div>';
      html += '    </div>';

      html += '    <div class="bom-pane">';
      // Karkasa tabula
      html += '      <div class="bom-card">';
      html += '        <div class="sec-tag" style="color:#0369a1; border-bottom:1px solid #e0f2fe; padding-bottom:1mm; margin-bottom:1mm">A &nbsp; Karkasa moduļi</div>';
      html += '        <table class="bom-table"><thead><tr><th>Kods</th><th>Nosaukums</th><th class="num">Skaits</th><th class="num">Vien. kg</th><th class="num">Kopā kg</th></tr></thead><tbody>';
      Object.values(frameCounts).forEach(fc => {
        html += '<tr><td><b>' + fc.code + '</b></td><td>' + fc.name + '</td><td class="num"><b>' + fc.count + '</b></td><td class="num">' + EW.Utils.fmt(fc.weight) + '</td><td class="num">' + EW.Utils.fmt(fc.count * fc.weight) + '</td></tr>';
      });
      html += '        </tbody></table>';
      html += '      </div>';

      // Paneļu tabula
      html += '      <div class="bom-card">';
      html += '        <div class="sec-tag" style="color:#15803d; border-bottom:1px solid #f0fdf4; padding-bottom:1mm; margin-bottom:1mm">B &nbsp; Apdares paneļi</div>';
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
      html += '    <div>LNMM Arsenāls &bull; Modulāro sienu sistēma &bull; Sienas montāžas shēma &bull; Dok. ' + docNum + '</div>';
      html += '    <div>Lapa ' + sheetPageNum + ' / ' + totalSheets + '</div>';
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
