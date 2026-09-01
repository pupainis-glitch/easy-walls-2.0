/**
 * Easy walls 2.0 — Montāžas lapu PDF / Drukas dzinējs (A4 Landscape)
 * Generē standartizētu LNMM Arsenāls montāžas lapu katram sienas fragmentam
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
   * Uzģenerē augstas izšķirtspējas attēlu konkrētam sienas fragmentam
   */
  function renderWallPreviewImage(group, width = 1200, height = 650) {
    if (!group || !group.modules || !group.modules.length) return '';

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d');

    const gObj = S.grids.find(x => x.id === group.gridId) || S.G();

    // 1. Aprēķinām sienas robežas (bounding box) world koordinātās
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

    const margin = 1.2; // 1.2 metru brīvā zona apkārt
    minX -= margin; maxX += margin;
    minY -= margin; maxY += margin;

    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const scale = Math.min(width / spanX, height / spanY);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Fons
    ctx.fillStyle = '#1e1e22';
    ctx.fillRect(0, 0, width, height);

    // Rasējuma koordinātu transformācija
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    const px = 1 / scale;

    // A. Uzzīmējam karkasa moduļus
    group.modules.forEach(mod => {
      const spec = Geom.SPECS[mod.type] || Geom.SPECS.large;
      const wp = Grid.g2w(gObj, mod.x, mod.y);
      const totalAngle = ((gObj.angle || 0) + (mod.rot || 0)) * Math.PI / 180;

      ctx.save();
      ctx.translate(wp.x, wp.y);
      ctx.rotate(totalAngle);

      const halfL = spec.length / 2;
      const halfW = spec.width / 2;
      const INSET = 0.016;

      // Karkasa korpuss
      ctx.fillStyle = '#2b303c';
      ctx.fillRect(-halfL + INSET, -halfW + INSET, spec.length - 2 * INSET, spec.width - 2 * INSET);

      ctx.strokeStyle = '#e0dbcd';
      ctx.lineWidth = px * 2.0;
      ctx.strokeRect(-halfL + INSET, -halfW + INSET, spec.length - 2 * INSET, spec.width - 2 * INSET);

      // Karkasa 500mm dalījumi
      if (mod.type === 'large') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = px * 1.0;
        ctx.setLineDash([px * 4, px * 4]);
        [-0.5, 0, 0.5].forEach(x => {
          ctx.beginPath();
          ctx.moveTo(x, -halfW + INSET);
          ctx.lineTo(x, halfW - INSET);
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }

      // Karkasa tipa kods centrā
      const cls = Classifier ? Classifier.classifySingleModule(mod, S.modules) : { code: 'M-LN' };
      ctx.fillStyle = '#5ad1c8';
      ctx.font = 'bold ' + Math.max(0.16, px * 13) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cls.code, 0, 0);

      ctx.restore();
    });

    // B. Uzzīmējam apdares paneļus
    const groupPanels = (S.panels || []).filter(p => p.wallGroupId === group.id);
    groupPanels.forEach(p => {
      const wp = Grid.g2w(gObj, p.gridCenter.x, p.gridCenter.y);
      const totalAngle = ((gObj.angle || 0) + (p.panelAngle || 0)) * Math.PI / 180;

      ctx.save();
      ctx.translate(wp.x, wp.y);
      ctx.rotate(totalAngle);

      const halfLen = p.length / 2;
      const th = p.thickness || 0.016;

      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(-halfLen, -th / 2, p.length, th);

      ctx.strokeStyle = '#a5d6a7';
      ctx.lineWidth = px * 1.5;
      ctx.strokeRect(-halfLen, -th / 2, p.length, th);

      // Taga birka
      const tagH = Math.max(0.18, px * 18);
      const tagW = Math.max(0.48, px * 56);
      const tagY = -th / 2 - tagH / 2 - 0.04;

      ctx.fillStyle = 'rgba(18, 30, 20, 0.96)';
      ctx.strokeStyle = '#4caf50';
      ctx.lineWidth = px * 1.2;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(-tagW / 2, tagY - tagH / 2, tagW, tagH, px * 3);
      } else {
        ctx.rect(-tagW / 2, tagY - tagH / 2, tagW, tagH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold ' + Math.max(0.11, px * 11) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.code, p.dotColor ? -tagW * 0.12 : 0, tagY);

      if (p.dotColor) {
        ctx.fillStyle = p.dotColor;
        ctx.beginPath();
        ctx.arc(tagW * 0.32, tagY, px * 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    ctx.restore();
    return offscreen.toDataURL('image/png');
  }

  /**
   * Sagatavo un atver drukas logu konkrētai sienai vai visām sienām
   */
  function printWallSheets(targetGroupId = null) {
    const groups = Panels.findWallGroups(S.modules);
    if (!groups.length) {
      if (EW.UI) EW.UI.toast('Plānā nav neviena moduļa drukai');
      return;
    }

    // Pārliecināmies, ka paneļi ir saģenerēti
    if (!S.panels || !S.panels.length) {
      Panels.generatePanels();
    }

    const targetGroups = targetGroupId ? groups.filter(g => g.id === targetGroupId) : groups;
    const printWindow = window.open('', '_blank', 'width=1100,height=850');
    if (!printWindow) {
      if (EW.UI) EW.UI.toast('Lūdzu atļaujiet uznirstošos logus (pop-up) drukai');
      return;
    }

    const dateStr = new Date().toLocaleDateString('lv-LV');
    const planTitle = S.planName || 'LNMM Arsenāls — Ekspozīcijas zāle';

    let html = '<!DOCTYPE html>\n<html lang="lv">\n<head>\n  <meta charset="utf-8">\n  <title>LNMM Arsenāls — Montāžas lapas</title>\n  <style>\n    @page { size: A4 landscape; margin: 8mm 10mm; }\n    body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #1a1a1a; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n    .sheet { page-break-after: always; display: flex; flex-direction: column; height: 190mm; box-sizing: border-box; padding: 4mm 0; }\n    .sheet:last-child { page-break-after: auto; }\n    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #2e7d32; padding-bottom: 3mm; margin-bottom: 3mm; }\n    .header h1 { margin: 0; font-size: 16pt; color: #1b5e20; text-transform: uppercase; letter-spacing: 0.5px; }\n    .header .subtitle { font-size: 11pt; font-weight: bold; color: #333; margin-top: 1mm; }\n    .header .meta { text-align: right; font-size: 9pt; color: #555; }\n    .preview-box { flex: 1; min-height: 80mm; border: 1px solid #ccc; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #1e1e22; margin-bottom: 4mm; }\n    .preview-box img { width: 100%; height: 100%; object-fit: contain; }\n    .tables-wrap { display: flex; gap: 5mm; font-size: 8pt; }\n    .bom-col { flex: 1; }\n    .bom-col h3 { margin: 0 0 1.5mm 0; font-size: 8.5pt; text-transform: uppercase; border-bottom: 1.5px solid #666; padding-bottom: 1mm; }\n    .bom-col.frames h3 { color: #0277bd; border-color: #0277bd; }\n    .bom-col.panels h3 { color: #2e7d32; border-color: #2e7d32; }\n    table { width: 100%; border-collapse: collapse; }\n    th, td { padding: 1.2mm 1.5mm; text-align: left; border-bottom: 1px solid #ddd; }\n    th { background: #f4f4f4; font-weight: bold; }\n    td.num { text-align: right; font-family: monospace; }\n    .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-left: 3px; vertical-align: middle; }\n    .dot.L { background: #2e7d32; }\n    .dot.R { background: #d32f2f; }\n    .footer-summary { margin-top: 2mm; font-size: 8.5pt; font-weight: bold; text-align: right; color: #222; border-top: 1px dashed #aaa; padding-top: 1.5mm; }\n  </style>\n</head>\n<body>\n';

    targetGroups.forEach((g, idx) => {
      const imgData = renderWallPreviewImage(g);
      const groupPanels = (S.panels || []).filter(p => p.wallGroupId === g.id);

      // Karkasa kopsavilkums
      const frameCounts = {};
      let frameWeight = 0;
      g.modules.forEach(m => {
        const cls = Classifier ? Classifier.classifySingleModule(m, S.modules) : { code: 'M-LN', weight: 201.97, name: '2x1m taisne' };
        if (!frameCounts[cls.code]) frameCounts[cls.code] = { code: cls.code, name: cls.name, weight: cls.weight, count: 0 };
        frameCounts[cls.code].count++;
        frameWeight += cls.weight;
      });

      // Paneļu kopsavilkums
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

      html += '<div class="sheet">';
      html += '  <div class="header">';
      html += '    <div>';
      html += '      <h1>LNMM ARSENĀLS — SIENAS MONTĀŽAS SHĒMA</h1>';
      html += '      <div class="subtitle">' + g.name + ' &bull; ' + planTitle + ' &bull; ' + g.gridName + '</div>';
      html += '    </div>';
      html += '    <div class="meta">';
      html += '      <div>Datums: <b>' + dateStr + '</b></div>';
      html += '      <div>Lapa: <b>' + (idx + 1) + ' / ' + targetGroups.length + '</b></div>';
      html += '    </div>';
      html += '  </div>';

      html += '  <div class="preview-box"><img src="' + imgData + '" alt="' + g.name + '"></div>';

      html += '  <div class="tables-wrap">';
      html += '    <div class="bom-col frames">';
      html += '      <h3>1. Karkasa moduļi (Zils)</h3>';
      html += '      <table><thead><tr><th>Kods</th><th>Nosaukums</th><th class="num">Skaits</th><th class="num">Vien. kg</th><th class="num">Kopā kg</th></tr></thead><tbody>';
      Object.values(frameCounts).forEach(fc => {
        html += '<tr><td><b>' + fc.code + '</b></td><td>' + fc.name + '</td><td class="num"><b>' + fc.count + '</b></td><td class="num">' + EW.Utils.fmt(fc.weight) + '</td><td class="num">' + EW.Utils.fmt(fc.count * fc.weight) + '</td></tr>';
      });
      html += '      </tbody></table>';
      html += '    </div>';

      html += '    <div class="bom-col panels">';
      html += '      <h3>2. Apdares paneļi (Zaļš)</h3>';
      html += '      <table><thead><tr><th>Kods</th><th>Izmērs</th><th>Puse</th><th class="num">Skaits</th><th class="num">Vien. kg</th><th class="num">Kopā kg</th></tr></thead><tbody>';
      Object.values(panelCounts).forEach(pc => {
        const handStr = pc.hand ? (pc.hand === 'L' ? 'Kreisā <span class="dot L"></span>' : 'Labā <span class="dot R"></span>') : '&mdash;';
        html += '<tr><td><b>' + pc.code + '</b></td><td>' + Math.round(pc.length * 1000) + '×3350</td><td>' + handStr + '</td><td class="num"><b>' + pc.count + '</b></td><td class="num">' + EW.Utils.fmt(pc.weight) + '</td><td class="num">' + EW.Utils.fmt(pc.totalWeight) + '</td></tr>';
      });
      html += '      </tbody></table>';
      html += '    </div>';
      html += '  </div>';

      html += '  <div class="footer-summary">';
      html += '    Karkass: ' + EW.Utils.fmt(frameWeight) + ' kg &bull; Apdare: ' + EW.Utils.fmt(pWeight) + ' kg &bull; ';
      html += '    KOPĒJAIS SIENAS MONTĀŽAS SVARS: <span style="color:#1b5e20; font-size:10pt;">' + EW.Utils.fmt(totalGroupWeight) + ' kg</span>';
      html += '  </div>';
      html += '</div>';
    });

    html += '<script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script></body></html>';

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  EW.Modules.PdfExport = {
    renderWallPreviewImage,
    printWallSheets
  };
})();
