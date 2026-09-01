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
    const planTitle = S.planName || 'Arsenāls';

    let html = '<!DOCTYPE html>\n<html lang="lv">\n<head>\n  <meta charset="utf-8">\n  <title>LNMM Arsenāls — Montāžas shēma</title>\n  <style>\n' +
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
      '    .doc-main-title { font-size: 14pt; font-weight: 700; color: #0f172a; margin: 0 0 1mm 0; }\n' +
      '    .doc-sub-title { font-size: 8.5pt; color: #475569; margin: 0; }\n' +
      '    /* Metadatu tabula labajā pusē */\n' +
      '    .meta-box { width: 68mm; border: 1px solid #cbd5e1; border-collapse: collapse; font-size: 7.8pt; }\n' +
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
      '    /* Tabulu zona labajā pusē vai apakšā */\n' +
      '    .bom-pane { flex: 1.15; display: flex; flex-direction: column; gap: 2.5mm; }\n' +
      '    .bom-card { border: 1px solid #e2e8f0; border-radius: 3px; background: #ffffff; padding: 2.5mm; flex: 1; display: flex; flex-direction: column; }\n' +
      '    table.bom-table { width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-top: 1mm; }\n' +
      '    table.bom-table th { background: #f8fafc; color: #475569; font-weight: 700; text-align: left; padding: 1.2mm 1.5mm; border-bottom: 1.5px solid #cbd5e1; text-transform: uppercase; letter-spacing: 0.03em; font-size: 7pt; }\n' +
      '    table.bom-table td { padding: 1.2mm 1.5mm; border-bottom: 1px solid #f1f5f9; color: #1e293b; }\n' +
      '    table.bom-table td.num { text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }\n' +
      '    .dot { display: inline-block; width: 6.5px; height: 6.5px; border-radius: 50%; margin-left: 3px; vertical-align: middle; }\n' +
      '    .dot.L { background: #2e7d32; }\n' +
      '    .dot.R { background: #d32f2f; }\n' +
      '    /* Kopsavilkuma rāmis */\n' +
      '    .summary-box { border: 1px solid #cbd5e1; border-radius: 3px; background: #f8fafc; padding: 2mm 3mm; display: flex; justify-content: space-between; align-items: center; font-size: 8.2pt; }\n' +
      '    .summary-box .highlight { font-size: 10.5pt; font-weight: 800; color: #0f172a; font-family: ui-monospace, monospace; }\n' +
      '    /* Kājene */\n' +
      '    .footer-bar { border-top: 1px solid #e2e8f0; padding-top: 1.5mm; display: flex; justify-content: space-between; font-size: 7.2pt; color: #64748b; }\n' +
      '  </style>\n</head>\n<body>\n' +
      '  <div class="no-print print-toolbar">' +
      '    <div><b>A R S E N Ā L S</b> &bull; Modulāro sienu montāžas shēma &bull; ' + targetGroups.length + ' lapa(s)</div>' +
      '    <div class="toolbar-acts">' +
      '      <button onclick="window.print()" class="btn-pdf-save">💾 Saglabāt PDF failā</button>' +
      '      <button onclick="window.print()" class="btn-print">🖨️ Drukāt</button>' +
      '      <button onclick="window.close()" class="btn-close">✖ Aizvērt</button>' +
      '    </div>' +
      '  </div>';

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

      const totalGroupWeight = frameWeight + pWeight;
      const docNum = 'ASN-M3-' + String(g.id).padStart(3, '0');

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
      html += '      <tr><td class="label">Lapa</td><td class="val">' + (idx + 1) + ' / ' + targetGroups.length + '</td></tr>';
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
        html += '<tr><td><b>' + pc.code + '</b></td><td>' + Math.round(pc.length * 1000) + '×3350</td><td>' + handStr + '</td><td class="num"><b>' + pc.count + '</b></td><td class="num">' + EW.Utils.fmt(pc.weight) + '</td><td class="num">' + EW.Utils.fmt(pc.totalWeight) + '</td></tr>';
      });
      html += '        </tbody></table>';
      html += '      </div>';

      // Kopsavilkuma kartīte
      html += '      <div class="summary-box">';
      html += '        <div>Karkass: <b>' + EW.Utils.fmt(frameWeight) + ' kg</b> &bull; Apdare: <b>' + EW.Utils.fmt(pWeight) + ' kg</b></div>';
      html += '        <div>KOPĀ: <span class="highlight">' + EW.Utils.fmt(totalGroupWeight) + ' kg</span></div>';
      html += '      </div>';

      html += '    </div>';
      html += '  </div>';

      // 3. Kājene
      html += '  <div class="footer-bar">';
      html += '    <div>Arsenāls &bull; Modulāro sienu sistēma &bull; Latvijas Nacionālais mākslas muzejs</div>';
      html += '    <div>Dokuments: <b>' + docNum + '</b></div>';
      html += '    <div>Lapa ' + (idx + 1) + ' no ' + targetGroups.length + '</div>';
      html += '  </div>';

      html += '</div>';
    });

    html += '<script>window.onload = function() { setTimeout(function() { window.print(); }, 400); };<\/script></body></html>';

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  EW.Modules.PdfExport = {
    renderWallPreviewImage,
    printWallSheets
  };
})();
