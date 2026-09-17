/**
 * Easy walls 2.0 — 2. un 3. slāņa vizuālais renderētājs
 * Zīmē moduļus ar 16 mm karkasa ofsetu un apdares paneļus
 * Pilnībā adaptēts gan Gaišajai (Studijas), gan Tumšajai (Inženieru) tēmai
 */
window.EW = window.EW || {};
EW.Modules = EW.Modules || {};

(function() {
  const S = EW.State;
  const Grid = EW.Grid;
  const Geom = EW.Modules.Geometry;
  const Classifier = EW.Modules.Classifier;

  function isLightTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light';
  }

  function drawModules(ctx, W, H) {
    if (!S || !S.modules || !S.modules.length) return;
    if (S.showModules === false) return; // Ja karkass globāli atslēgts

    const activeGrid = S.G();
    const isMultiRoomExp = !!(S.exhibition && S.exhibition.rooms && S.exhibition.rooms.length > 1);

    // 1. Zīmējam visus neizvēlētos moduļus, kuru režģis ir ieslēgts
    S.modules.forEach(mod => {
      if (mod.id !== S.selectedModuleId) {
        if (isMultiRoomExp && activeGrid && mod.gridId !== activeGrid.id) return;
        const gMod = (S.grids || []).find(x => x.id === mod.gridId);
        if (gMod && gMod.visible) {
          drawSingleModule(ctx, mod, gMod, false, W, H);
        }
      }
    });

    // 2. Zīmējam aktīvo/izvēlēto moduli virspusē (ja tā režģis ir ieslēgts)
    if (S.selectedModuleId) {
      const selMod = S.modules.find(m => m.id === S.selectedModuleId);
      if (selMod) {
        if (!isMultiRoomExp || !activeGrid || selMod.gridId === activeGrid.id) {
          const gMod = (S.grids || []).find(x => x.id === selMod.gridId);
          if (gMod && gMod.visible) {
            drawSingleModule(ctx, selMod, gMod, true, W, H);
          }
        }
      }
    }

    // 3. Zīmējam snapping vadlīnijas aktīvajam režģim
    const activeG = S.G();
    if (S.activeSnapInfo && activeG && activeG.visible) {
      drawSnapGuide(ctx, S.activeSnapInfo, activeG, W, H);
    }

    // 4. Zīmējam 3. slāņa apdares paneļus
    if (S.showPanels !== false && S.panels && S.panels.length > 0) {
      drawPanels(ctx, S.panels, W, H);
    }
  }

  /**
   * Zīmē 3. slāņa apdares paneļus (tikai ieslēgtiem režģiem)
   */
  function drawPanels(ctx, panels, W, H) {
    const isLight = isLightTheme();
    const activeGrid = S.G();
    const isMultiRoomExp = !!(S.exhibition && S.exhibition.rooms && S.exhibition.rooms.length > 1);

    panels.forEach(p => {
      if (isMultiRoomExp && activeGrid && p.gridId !== activeGrid.id) return;
      const gMod = (S.grids || []).find(x => x.id === p.gridId);
      if (!gMod || !gMod.visible) return; // Ja zāle/režģis atslēgts, paneļi netiek zīmēti

      const wp = Grid.g2w(gMod, p.gridCenter.x, p.gridCenter.y);
      const sp = Grid.w2s(wp.x, wp.y, W, H);
      const px = 1 / S.view.z;
      const totalAngle = ((gMod.angle || 0) + (p.panelAngle || 0)) * Math.PI / 180;

      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(totalAngle);
      ctx.scale(S.view.z, S.view.z);

      const halfLen = p.length / 2;
      const th = p.thickness || 0.016; // 16 mm biezums

      // 1. Apdares paneļa plāksne (LNMM zaļā apdare)
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(-halfLen, -th / 2, p.length, th);

      ctx.strokeStyle = isLight ? '#1b5e20' : '#a5d6a7';
      ctx.lineWidth = px * 1.5;
      ctx.strokeRect(-halfLen, -th / 2, p.length, th);

      // 2. Taga etiķete virs paneļa fasādes (tikai ja nav ieslēgts tīrs skats)
      if (S.showTechnicalAnnotations !== false) {
        const tagH = Math.max(0.13, px * 15);
        const tagW = Math.max(0.40, px * 52);
        const tagY = -th / 2 - tagH / 2 - 0.035;

        ctx.save();
        ctx.fillStyle = isLight ? '#ffffff' : 'rgba(18, 30, 20, 0.94)';
        ctx.strokeStyle = isLight ? '#2e7d32' : '#4caf50';
        ctx.lineWidth = px * 1.1;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(-tagW / 2, tagY - tagH / 2, tagW, tagH, px * 2.5);
        } else {
          ctx.rect(-tagW / 2, tagY - tagH / 2, tagW, tagH);
        }
        ctx.fill();
        ctx.stroke();

        // Kods
        ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
        ctx.font = 'bold ' + Math.max(0.08, px * 9) + 'px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textX = p.dotColor ? -tagW * 0.12 : 0;
        ctx.fillText(p.code, textX, tagY);

        // L / R marķieris (zaļš vai sarkans punkts)
        if (p.dotColor) {
          ctx.fillStyle = p.dotColor;
          ctx.beginPath();
          ctx.arc(tagW * 0.32, tagY, px * 3.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = px * 0.8;
          ctx.stroke();
        }
        ctx.restore();
      }

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
    const isLight = isLightTheme();
    const snapColor = isLight ? '#b71c1c' : '#5ad1c8';

    ctx.strokeStyle = snapColor;
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

    ctx.fillStyle = snapColor;
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawSingleModule(ctx, mod, g, isSelected, W, H) {
    const isLight = isLightTheme();
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

    // Ārējais montāžas gabarīts (smalka blāva ass)
    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = px * 0.8;
    ctx.setLineDash([px * 2.5, px * 2.5]);
    ctx.strokeRect(-halfL, -halfW, spec.length, spec.width);
    ctx.setLineDash([]);

    // 1. Moduļa karkasa korpuss (ar 16 mm ofsetu uz iekšpusi)
    ctx.save();
    ctx.shadowColor = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 8 * S.view.z / 60;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2 * S.view.z / 60;

    // Jaunā moduļa pulsējošais oreols
    if (mod.isPulsing) {
      const t = (Date.now() / 220);
      const pulse = (Math.sin(t) + 1) / 2; // 0..1
      const haloPad = INSET + px * (4 + pulse * 7);
      ctx.save();
      ctx.strokeStyle = isLight 
        ? ('rgba(234, 88, 12, ' + (0.45 + pulse * 0.50) + ')')
        : ('rgba(251, 146, 60, ' + (0.50 + pulse * 0.45) + ')');
      ctx.lineWidth = px * (2.8 + pulse * 2.2);
      ctx.strokeRect(-halfL - haloPad, -halfW - haloPad, spec.length + 2 * haloPad, spec.width + 2 * haloPad);
      ctx.restore();
      
      // Plūstoša animācija nākamajam kadram
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          if (EW.Renderer && typeof EW.Renderer.draw === 'function') EW.Renderer.draw();
        });
      }
    }

    if (mod.hasCollision) {
      ctx.fillStyle = isLight ? '#fee2e2' : '#4a1816';
    } else if (isSelected) {
      ctx.fillStyle = isLight ? '#fed7aa' : '#7c2d12'; // Izvēlēts: piesātināti oranžs
    } else {
      ctx.fillStyle = isLight ? '#fff7ed' : '#2e1c14'; // Viegli gaiši oranžīgs karkass
    }
    ctx.fillRect(-halfL + INSET, -halfW + INSET, frameL, frameW);
    ctx.restore();

    // Viegls iekšējais tonējums
    if (isSelected) {
      ctx.fillStyle = isLight ? 'rgba(234, 88, 12, 0.15)' : 'rgba(251, 146, 60, 0.22)';
      ctx.fillRect(-halfL + INSET, -halfW + INSET, frameL, frameW);
    } else if (mod.hasCollision) {
      ctx.fillStyle = isLight ? 'rgba(239, 68, 68, 0.20)' : 'rgba(224, 106, 90, 0.28)';
      ctx.fillRect(-halfL + INSET, -halfW + INSET, frameL, frameW);
    }

    // 2. Karkasa ārējā kontūra (izteikts gaiši oranžs/terakotas akcents)
    if (mod.hasCollision) {
      ctx.strokeStyle = '#ef4444';
    } else if (isSelected) {
      ctx.strokeStyle = isLight ? '#c2410c' : '#fb923c';
    } else {
      ctx.strokeStyle = isLight ? '#ea580c' : '#f97316'; // Skaists, akcentēts oranžs rāmis
    }
    ctx.lineWidth = px * (mod.hasCollision ? 2.8 : (isSelected ? 2.8 : 2.0));
    ctx.strokeRect(-halfL + INSET, -halfW + INSET, frameL, frameW);

    // 3. Iekšējās 500mm dalījuma līnijas, snap punkti, kodi un balasts (Tikai ja NAV ieslēgts tīrs skats)
    if (S.showTechnicalAnnotations !== false) {
      if (mod.type === 'large') {
        ctx.strokeStyle = isLight ? 'rgba(234, 88, 12, 0.40)' : 'rgba(251, 146, 60, 0.40)';
        ctx.lineWidth = px * 1.1;
        ctx.setLineDash([px * 3, px * 3]);
        [-0.5, 0, 0.5].forEach(x => {
          ctx.beginPath();
          ctx.moveTo(x, -halfW + INSET);
          ctx.lineTo(x, halfW - INSET);
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }

      // 4. Perimetra snap punkti un iezīmes
      spec.snapPoints.forEach(p => {
        ctx.strokeStyle = isSelected
          ? (isLight ? '#0284c7' : '#5ad1c8')
          : (isLight ? '#475569' : 'rgba(255, 255, 255, 0.75)');
        ctx.fillStyle = isSelected
          ? (isLight ? '#0284c7' : '#5ad1c8')
          : (isLight ? '#ffffff' : '#2a2e38');
        ctx.lineWidth = px * 1.2;

        const markSize = px * (p.isPort ? 4.5 : 3.2);
        ctx.beginPath();
        ctx.moveTo(p.x - markSize, p.y);
        ctx.lineTo(p.x + markSize, p.y);
        ctx.moveTo(p.x, p.y - markSize);
        ctx.lineTo(p.x, p.y + markSize);
        ctx.stroke();

        if (p.isPort) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, px * 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });

      // 5. Karkasa tipa kods centrā
      const cls = Classifier ? Classifier.classifySingleModule(mod, S.modules) : { code: 'M-LN' };
      ctx.fillStyle = isLight ? '#9a3412' : '#fed7aa';
      ctx.font = '700 ' + Math.max(0.13, px * 11) + 'px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cls.code, 0, -0.05);

      // 6. Stabilitātes un balasta indikators
      if (EW.Stability) {
        const modArts = (S.artworks || []).filter(a => a.moduleId === mod.id);
        const stab = EW.Stability.calculateModuleStability(mod, modArts);

        if (stab.ballastNeeded > 0) {
          // Balasta kārbiņa modulī
          const badgeW = Math.max(0.74, px * 88);
          const badgeH = Math.max(0.18, px * 22);
          const badgeY = 0.22;
          ctx.save();
          ctx.fillStyle = isLight ? '#fef3c7' : '#78350f';
          ctx.strokeStyle = isLight ? '#d97706' : '#f59e0b';
          ctx.lineWidth = px * 1.5;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(-badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, px * 4);
          } else {
            ctx.rect(-badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH);
          }
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isLight ? '#92400e' : '#fef3c7';
          ctx.font = '700 ' + Math.max(0.10, px * 9) + 'px system-ui, sans-serif';
          ctx.fillText(`⚖️ +${stab.ballastNeeded} kg balasts`, 0, badgeY);
          ctx.restore();
        } else if (modArts.length > 0) {
          // Ir darbi un modulis ir stabils
          ctx.save();
          ctx.fillStyle = isLight ? '#15803d' : '#4ade80';
          ctx.font = '600 ' + Math.max(0.09, px * 8.5) + 'px system-ui, sans-serif';
          ctx.fillText(`✓ SF ${stab.SF_actual.toFixed(1)} stabils`, 0, 0.22);
          ctx.restore();
        }
      }
    }

    // 7. Piekārtie mākslas darbi pie šī moduļa fasādēm
    const modArts = (S.artworks || []).filter(a => a.moduleId === mod.id);
    if (modArts.length > 0) {
      drawArtworksOnModule(ctx, modArts, halfL, halfW, px, isLight);
    }

    ctx.restore();
  }

  /**
   * Zīmē pie moduļa skaldnēm piekārtos mākslas darbus
   */
  function drawArtworksOnModule(ctx, artworks, halfL, halfW, px, isLight) {
    artworks.forEach(art => {
      const isSel = S.selectedArtworkId === art.id;
      const posX = art.posOnWall || 0;
      const artW = art.width || 1.0;
      const artTh = art.depth || 0.08;
      const sideY = (art.wallSide === 'front' ? -halfW : halfW);
      const artY = sideY + (art.wallSide === 'front' ? -artTh / 2 : artTh / 2);

      ctx.save();
      // Mākslas darba rāmis (zeltīts/bronzas koka tonis)
      ctx.fillStyle = isLight ? '#fefce8' : '#1c1917';
      ctx.strokeStyle = isSel 
        ? (isLight ? '#0284c7' : '#38bdf8') 
        : (isLight ? '#b45309' : '#f59e0b');
      ctx.lineWidth = px * (isSel ? 2.5 : 1.6);

      ctx.fillRect(posX - artW / 2, artY - artTh / 2, artW, artTh);
      ctx.strokeRect(posX - artW / 2, artY - artTh / 2, artW, artTh);

      // Centrālais Pivot Gizmo rokturis
      if (EW.Artworks && typeof EW.Artworks.drawPivotGizmo === 'function') {
        EW.Artworks.drawPivotGizmo(ctx, posX, artY, px, isSel, isLight);
      }

      // Piesaistes līnija pie moduļa skaldnes
      ctx.strokeStyle = isLight ? '#78350f' : '#fbbf24';
      ctx.lineWidth = px * 1.0;
      ctx.beginPath();
      ctx.moveTo(posX - artW / 2, sideY);
      ctx.lineTo(posX + artW / 2, sideY);
      ctx.stroke();

      // Etiķete ar darba nosaukumu un svaru
      const lblY = artY + (art.wallSide === 'front' ? -artTh / 2 - 0.06 : artTh / 2 + 0.06 + 0.09);
      ctx.fillStyle = isLight ? '#78350f' : '#fde68a';
      ctx.font = '600 ' + Math.max(0.10, px * 8.5) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lockIcon = art.locked ? '🔒 ' : '';
      ctx.fillText(`${lockIcon}${art.title} (${art.weight}kg)`, posX, lblY);

      // Piekāršanas augstuma anotācija
      ctx.fillStyle = isLight ? '#92400e' : '#cbd5e1';
      ctx.font = '500 ' + Math.max(0.08, px * 7.5) + 'px ui-monospace, monospace';
      ctx.fillText(`h=${(art.elevation || 1.2).toFixed(1)}m`, posX, lblY + (art.wallSide === 'front' ? -0.09 : 0.09));

      ctx.restore();
    });
  }

  EW.ModulesRenderer = {
    drawModules,
    drawSingleModule,
    drawPanels,
    drawSnapGuide
  };
})();
