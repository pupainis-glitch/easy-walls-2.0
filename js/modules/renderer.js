/**
 * Easy walls 2.0 — Moduļu renderēšana uz kanvas
 */
window.EW = window.EW || {};
EW.ModulesRenderer = EW.ModulesRenderer || {};

(function() {
  const S = EW.State;
  const U = EW.Utils;
  const Grid = EW.Grid;
  const Geom = EW.Modules.Geometry;

  function drawModules(ctx, W, H) {
    // 1. Karkasa moduļu slānis
    if (S.showModules !== false && S.modules && S.modules.length) {
      S.modules.forEach(mod => {
        const g = S.grids.find(x => x.id === mod.gridId) || S.G();
        if (!g || !g.visible) return;

        const isSelected = (S.selectedModuleId === mod.id);
        drawSingleModule(ctx, mod, g, isSelected, W, H);
      });
    }

    // 2. Apdares paneļu slānis
    if (S.showPanels !== false && S.panels && S.panels.length) {
      drawPanels(ctx, W, H);
    }

    // Zīmējam aktīvo snap ceļvedi (ja tiek vilkts un ir atrasta kaimiņa piesaiste)
    if (EW.ModulesInteraction && typeof EW.ModulesInteraction.getDragState === 'function') {
      const dragState = EW.ModulesInteraction.getDragState();
      if (dragState && dragState.activeSnap) {
        drawSnapGuide(ctx, dragState.activeSnap, dragState.grid, W, H);
      }
    }
  }

  function drawPanels(ctx, W, H) {
    if (!S.panels || !S.panels.length) return;

    const px = 1 / S.view.z;

    S.panels.forEach(p => {
      const g = S.grids.find(x => x.id === p.gridId) || S.G();
      if (!g || !g.visible) return;

      const wp = Grid.g2w(g, p.gridCenter.x, p.gridCenter.y);
      const sp = Grid.w2s(wp.x, wp.y, W, H);
      const totalAngle = ((g.angle || 0) + (p.panelAngle || 0)) * Math.PI / 180;

      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(totalAngle);
      ctx.scale(S.view.z, S.view.z);

      const halfLen = p.length / 2;
      const th = p.thickness || 0.016; // 16 mm biezums

      // 1. Apdares paneļa plāksne
      ctx.fillStyle = '#2e7d32'; // LNMM zaļā apdare
      ctx.fillRect(-halfLen, -th / 2, p.length, th);

      ctx.strokeStyle = '#a5d6a7';
      ctx.lineWidth = px * 1.5;
      ctx.strokeRect(-halfLen, -th / 2, p.length, th);

      // 2. Taga etiķete virs paneļa fasādes
      const tagH = Math.max(0.13, px * 15);
      const tagW = Math.max(0.38, px * 50);
      const tagY = -th / 2 - tagH / 2 - 0.03;

      ctx.save();
      ctx.fillStyle = 'rgba(18, 30, 20, 0.94)';
      ctx.strokeStyle = '#4caf50';
      ctx.lineWidth = px * 1.0;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(-tagW / 2, tagY - tagH / 2, tagW, tagH, px * 2);
      } else {
        ctx.rect(-tagW / 2, tagY - tagH / 2, tagW, tagH);
      }
      ctx.fill();
      ctx.stroke();

      // Kods
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(0.08, px * 9)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textX = p.dotColor ? -tagW * 0.12 : 0;
      ctx.fillText(p.code, textX, tagY);

      // L / R marķieris (zaļš vai sarkans punkts)
      if (p.dotColor) {
        ctx.fillStyle = p.dotColor;
        ctx.beginPath();
        ctx.arc(tagW * 0.32, tagY, px * 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = px * 0.8;
        ctx.stroke();
      }
      ctx.restore();

      ctx.restore();
    });
  }

  function drawSnapGuide(ctx, snapInfo, g, W, H) {
    if (!snapInfo || !snapInfo.contact) return;
    const contact = snapInfo.contact;
    const wp = Grid.g2w(g, contact.contactCenter.x, contact.contactCenter.y);
    const sp = Grid.w2s(wp.x, wp.y, W, H);

    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate((g.angle || 0) * Math.PI / 180);

    const lineLen = contact.overlapLength * S.view.z;

    ctx.strokeStyle = '#5ad1c8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (contact.touchAxis === 'X') {
      ctx.moveTo(0, -lineLen / 2);
      ctx.lineTo(0, lineLen / 2);
    } else {
      ctx.moveTo(-lineLen / 2, 0);
      ctx.lineTo(lineLen / 2, 0);
    }
    ctx.stroke();

    ctx.fillStyle = '#5ad1c8';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawSingleModule(ctx, mod, g, isSelected, W, H) {
    const spec = Geom.SPECS[mod.type] || Geom.SPECS.large;
    const wp = Grid.g2w(g, mod.x, mod.y);
    const sp = Grid.w2s(wp.x, wp.y, W, H);

    const totalAngle = ((g.angle || 0) + (mod.rot || 0)) * Math.PI / 180;
    const px = 1 / S.view.z;

    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate(totalAngle);
    ctx.scale(S.view.z, S.view.z);

    const halfL = spec.length / 2;
    const halfW = spec.width / 2;
    const INSET = 0.016; // 16 mm karkasa vizuālā atkāpe uz iekšu
    const frameL = spec.length - 2 * INSET;
    const frameW = spec.width - 2 * INSET;

    // Ārējais montāžas 2x1m gabarīts (smalka blāva ass)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = px * 0.8;
    ctx.setLineDash([px * 2, px * 2]);
    ctx.strokeRect(-halfL, -halfW, spec.length, spec.width);
    ctx.setLineDash([]);

    // 1. Moduļa karkasa korpuss (ar 16 mm ofsetu uz iekšpusi)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 8 * S.view.z / 60;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2 * S.view.z / 60;

    if (mod.hasCollision) {
      ctx.fillStyle = '#4a1816';
    } else if (isSelected) {
      ctx.fillStyle = '#17363e';
    } else {
      ctx.fillStyle = '#252932'; // Monolīts karkass
    }
    ctx.fillRect(-halfL + INSET, -halfW + INSET, frameL, frameW);
    ctx.restore();

    // Viegls iekšējais tonējums
    if (isSelected) {
      ctx.fillStyle = 'rgba(90, 209, 200, 0.18)';
      ctx.fillRect(-halfL + INSET, -halfW + INSET, frameL, frameW);
    } else if (mod.hasCollision) {
      ctx.fillStyle = 'rgba(224, 106, 90, 0.28)';
      ctx.fillRect(-halfL + INSET, -halfW + INSET, frameL, frameW);
    }

    // 2. Karkasa ārējā kontūra
    ctx.strokeStyle = mod.hasCollision
      ? '#ff5449'
      : (isSelected ? '#5ad1c8' : '#e0dbcd');
    ctx.lineWidth = px * (mod.hasCollision ? 2.8 : (isSelected ? 2.6 : 1.8));
    ctx.strokeRect(-halfL + INSET, -halfW + INSET, frameL, frameW);

    // 3. Iekšējās 500mm dalījuma līnijas (lielajam modulim)
    if (mod.type === 'large') {
      ctx.strokeStyle = isSelected ? 'rgba(90, 209, 200, 0.35)' : 'rgba(255, 255, 255, 0.20)';
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

    // 4. Perimetra snap punkti un iezīmes (kā Snap loģika.png)
    spec.snapPoints.forEach(p => {
      ctx.strokeStyle = isSelected ? '#5ad1c8' : 'rgba(255, 255, 255, 0.75)';
      ctx.fillStyle = isSelected ? '#5ad1c8' : '#2a2e38';
      ctx.lineWidth = px * 1.2;

      const markSize = px * (p.isPort ? 4.5 : 3.2);
      ctx.beginPath();
      // Mazs krustiņš vai punkts
      ctx.moveTo(p.x - markSize, p.y);
      ctx.lineTo(p.x + markSize, p.y);
      ctx.moveTo(p.x, p.y - markSize);
      ctx.lineTo(p.x, p.y + markSize);
      ctx.stroke();

      if (p.isPort) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, px * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });

    // 5. Centra marķējums un satveršanas punkts (viduspunkta rokturis)
    ctx.strokeStyle = isSelected ? '#5ad1c8' : 'rgba(255, 255, 255, 0.7)';
    ctx.fillStyle = isSelected ? 'rgba(90, 209, 200, 0.35)' : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = px * 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, px * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isSelected ? '#5ad1c8' : '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, px * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Mazie montāžas punktiņi
    if (mod.type === 'large') {
      ctx.fillStyle = isSelected ? 'rgba(90, 209, 200, 0.5)' : 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(-0.35, 0, px * 2.2, 0, Math.PI * 2);
      ctx.arc(0.35, 0, px * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Teksta marķējums (tips / kods)
    if (S.view.z >= 20) {
      ctx.fillStyle = mod.hasCollision ? '#ff7b72' : (isSelected ? '#5ad1c8' : '#ffffff');
      ctx.font = `700 ${Math.max(10.5, Math.min(15, 12.5 * S.view.z / 60))}px ${U.getCSS('--mono')}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = mod.hasCollision ? 'PĀRKLĀŠANĀS!' : (mod.subType || (mod.type === 'large' ? '2×1m' : '1×1m'));
      ctx.save();
      // Pārliecināmies, ka teksts nav apgriezts kājām gaisā
      ctx.scale(px, px);
      ctx.fillText(label, 0, (mod.type === 'large' ? -15 : -11));
      ctx.restore();
    }

    // 7. Ja atlasīts, iezīmējam stūru marķierus
    if (isSelected) {
      ctx.fillStyle = '#5ad1c8';
      const cs = px * 5;
      [
        [-halfL, -halfW],
        [halfL, -halfW],
        [halfL, halfW],
        [-halfL, halfW]
      ].forEach(([cx, cy]) => {
        ctx.fillRect(cx - cs / 2, cy - cs / 2, cs, cs);
      });
    }

    ctx.restore();
  }

  EW.ModulesRenderer = {
    drawModules
  };
})();
