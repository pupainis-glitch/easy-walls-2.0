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
    if (!S.modules || !S.modules.length) return;

    S.modules.forEach(mod => {
      const g = S.grids.find(x => x.id === mod.gridId) || S.G();
      if (!g || !g.visible) return;

      const isSelected = (S.selectedModuleId === mod.id);
      drawSingleModule(ctx, mod, g, isSelected, W, H);
    });

    // Zīmējam aktīvo snap ceļvedi (ja tiek vilkts un ir atrasta kaimiņa piesaiste)
    if (EW.ModulesInteraction && typeof EW.ModulesInteraction.getDragState === 'function') {
      const dragState = EW.ModulesInteraction.getDragState();
      if (dragState && dragState.activeSnap) {
        drawSnapGuide(ctx, dragState.activeSnap, dragState.grid, W, H);
      }
    }
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
      // Vertikāla robeža režģī
      ctx.moveTo(0, -lineLen / 2);
      ctx.lineTo(0, lineLen / 2);
    } else {
      // Horizontāla robeža režģī
      ctx.moveTo(-lineLen / 2, 0);
      ctx.lineTo(lineLen / 2, 0);
    }
    ctx.stroke();

    // Spīdošs centra punkts
    ctx.fillStyle = '#5ad1c8';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawSingleModule(ctx, mod, g, isSelected, W, H) {
    const spec = Geom.SPECS[mod.type] || Geom.SPECS.large;
    // Centrs world koordinātās
    const wp = Grid.g2w(g, mod.x, mod.y);
    // Centrs ekrāna koordinātās
    const sp = Grid.w2s(wp.x, wp.y, W, H);

    // Kopējais leņķis = režģa leņķis + moduļa rotācija
    const totalAngle = ((g.angle || 0) + (mod.rot || 0)) * Math.PI / 180;
    const px = 1 / S.view.z;

    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate(totalAngle);
    ctx.scale(S.view.z, S.view.z);

    const halfL = spec.length / 2;
    const halfW = spec.width / 2;

    // 1. Moduļa korpusa pildījums
    if (mod.hasCollision) {
      ctx.fillStyle = 'rgba(224, 106, 90, 0.38)';
    } else if (isSelected) {
      ctx.fillStyle = 'rgba(90, 209, 200, 0.22)';
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    }
    ctx.fillRect(-halfL, -halfW, spec.length, spec.width);

    // 2. Moduļa ārējā kontūra
    ctx.strokeStyle = mod.hasCollision
      ? '#e06a5a'
      : (isSelected ? '#5ad1c8' : 'rgba(232, 230, 226, 0.85)');
    ctx.lineWidth = px * (mod.hasCollision ? 2.8 : (isSelected ? 2.2 : 1.5));
    ctx.strokeRect(-halfL, -halfW, spec.length, spec.width);

    // 3. Iekšējās 500mm dalījuma līnijas (lielajam modulim)
    if (mod.type === 'large') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = px * 1.0;
      ctx.setLineDash([px * 3, px * 3]);
      // Šķērslīnijas ik pa 500 mm (-0.5, 0, +0.5)
      [-0.5, 0, 0.5].forEach(x => {
        ctx.beginPath();
        ctx.moveTo(x, -halfW);
        ctx.lineTo(x, halfW);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // 4. Perimetra snap punkti un iezīmes (kā Snap loģika.png)
    spec.snapPoints.forEach(p => {
      ctx.strokeStyle = isSelected ? '#5ad1c8' : 'rgba(255, 255, 255, 0.65)';
      ctx.fillStyle = isSelected ? '#5ad1c8' : '#26262b';
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

    // 5. Centra marķējums un orientācijas indikācija
    ctx.fillStyle = isSelected ? '#5ad1c8' : 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(0, 0, px * 3, 0, Math.PI * 2);
    ctx.fill();

    // Mazie montāžas punktiņi
    if (mod.type === 'large') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(-0.35, 0, px * 2.2, 0, Math.PI * 2);
      ctx.arc(0.35, 0, px * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Teksta marķējums (tips / kods)
    if (S.view.z >= 25) {
      ctx.fillStyle = mod.hasCollision ? '#e06a5a' : (isSelected ? '#5ad1c8' : 'rgba(255, 255, 255, 0.85)');
      ctx.font = `600 ${Math.max(10, Math.min(15, 12 * S.view.z / 60))}px ${U.getCSS('--mono')}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = mod.hasCollision ? 'PĀRKLĀŠANĀS!' : (mod.subType || (mod.type === 'large' ? '2×1m' : '1×1m'));
      ctx.save();
      // Pārliecināmies, ka teksts nav apgriezts kājām gaisā
      ctx.scale(px, px);
      ctx.fillText(label, 0, (mod.type === 'large' ? -14 : -10));
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
