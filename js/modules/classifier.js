/**
 * Easy walls 2.0 — Automātiskā moduļu tipu noteikšana un specifikācijas aprēķins
 * Atbilstoši LNMM-M2-1020 komponentu sarakstam
 */
window.EW = window.EW || {};
EW.Modules = EW.Modules || {};

(function() {
  const C = EW.Config;
  const Geom = EW.Modules.Geometry;
  const Snapping = EW.Modules.Snapping;

  /**
   * Pārveido punktu no režģa koordinātām uz dotā moduļa lokālajām koordinātām
   * (kur moduļa centrs ir (0,0) un rotācija ir 0)
   */
  function toLocalCoord(mod, gx, gy) {
    const rad = - (mod.rot || 0) * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = gx - mod.x;
    const dy = gy - mod.y;
    return {
      x: Math.round((dx * cos - dy * sin) * 1000) / 1000,
      y: Math.round((dx * sin + dy * cos) * 1000) / 1000
    };
  }

  /**
   * Analizē viena moduļa kaimiņus un nosaka tā tipu
   */
  function classifySingleModule(mod, allModules) {
    const spec = Geom.SPECS[mod.type] || Geom.SPECS.large;

    // Ja mazais 1x1m modulis
    if (mod.type === 'small') {
      const isRight = ((mod.rot || 0) === 90 || (mod.rot || 0) === 180);
      const code = isRight ? 'M-UN-R' : 'M-UN-L';
      const meta = C.MODULE_WEIGHTS[code] || { name: '1x1m universal module', weight: 145.53 };
      return { code, name: meta.name, weight: meta.weight };
    }

    // Lielais 2x1m modulis
    // Meklējam visus kaimiņus tajā pašā režģī, kas saskaras ar šo moduli
    const contacts = [];
    for (let i = 0; i < allModules.length; i++) {
      const other = allModules[i];
      if (other.id === mod.id) continue;
      if (other.gridId !== mod.gridId) continue;

      const contact = Snapping.getContactInfo(mod, other);
      if (contact) {
        // Pārvedam kontakta centru uz mod lokālajām koordinātām
        const localCenter = toLocalCoord(mod, contact.contactCenter.x, contact.contactCenter.y);
        contacts.push({
          other,
          touchAxis: contact.touchAxis,
          overlapLength: contact.overlapLength,
          localCenter
        });
      }
    }

    // 1. Ja nav neviena kaimiņa -> Brīvstāvošs
    if (contacts.length === 0) {
      const code = 'M-FS';
      const meta = C.MODULE_WEIGHTS[code];
      return { code, name: meta.name, weight: meta.weight };
    }

    // Analizējam kontaktu novietojumu uz lielā moduļa (lokāli X: -1..+1, Y: -0.5..+0.5)
    let hasEndNeg = false; // gals pie X = -1.0
    let hasEndPos = false; // gals pie X = +1.0
    let hasSideTopCenter = false; // sānu centrs pie Y = -0.5, X ≈ 0
    let hasSideBottomCenter = false; // sānu centrs pie Y = +0.5, X ≈ 0
    let hasSideTopCornerNeg = false; // sānu stūris pie Y = -0.5, X ≈ -0.5 vai -1.0
    let hasSideTopCornerPos = false; // sānu stūris pie Y = -0.5, X ≈ +0.5 vai +1.0
    let hasSideBottomCornerNeg = false; // sānu stūris pie Y = +0.5, X ≈ -0.5 vai -1.0
    let hasSideBottomCornerPos = false; // sānu stūris pie Y = +0.5, X ≈ +0.5 vai +1.0
    let hasZOffset = false;
    let isZRight = false;

    contacts.forEach(c => {
      const lx = c.localCenter.x;
      const ly = c.localCenter.y;

      // Gala kontakti (X pie -1.0 vai +1.0)
      if (Math.abs(lx - (-1.0)) < 0.15) hasEndNeg = true;
      else if (Math.abs(lx - 1.0) < 0.15) hasEndPos = true;

      // Sānu kontakti (Y pie -0.5 vai +0.5)
      if (Math.abs(ly - (-0.5)) < 0.15) {
        if (Math.abs(lx) < 0.25) hasSideTopCenter = true;
        else if (lx < -0.3) hasSideTopCornerNeg = true;
        else if (lx > 0.3) hasSideTopCornerPos = true;

        // Pārbaudām paralēlu Z savienojumu (kaimiņš paralēls ar 1m nobīdi)
        if (c.other.rot === mod.rot && Math.abs(c.overlapLength - 1.0) < 0.15) {
          hasZOffset = true;
          isZRight = (c.other.x > mod.x);
        }
      } else if (Math.abs(ly - 0.5) < 0.15) {
        if (Math.abs(lx) < 0.25) hasSideBottomCenter = true;
        else if (lx < -0.3) hasSideBottomCornerNeg = true;
        else if (lx > 0.3) hasSideBottomCornerPos = true;

        if (c.other.rot === mod.rot && Math.abs(c.overlapLength - 1.0) < 0.15) {
          hasZOffset = true;
          isZRight = (c.other.x > mod.x);
        }
      }
    });

    // 2. Krustojums (Intersection / X veida)
    if (hasSideTopCenter && hasSideBottomCenter) {
      const code = 'M-IN';
      const meta = C.MODULE_WEIGHTS[code];
      return { code, name: meta.name, weight: meta.weight };
    }

    // 3. T savienojums (T-connection)
    if (hasSideTopCenter || hasSideBottomCenter) {
      const code = 'M-TC';
      const meta = C.MODULE_WEIGHTS[code];
      return { code, name: meta.name, weight: meta.weight };
    }

    // 4. Z savienojums (Z-type R / L)
    if (hasZOffset) {
      const code = isZRight ? 'M-ZR' : 'M-ZL';
      const meta = C.MODULE_WEIGHTS[code];
      return { code, name: meta.name, weight: meta.weight };
    }

    // 5. L savienojums (L type — L / R)
    const hasCorner = (hasSideTopCornerNeg || hasSideTopCornerPos || hasSideBottomCornerNeg || hasSideBottomCornerPos);
    if ((hasEndNeg || hasEndPos) && hasCorner) {
      // Nosakām L-labais vai L-kreisais pēc stūra puses
      const isLeft = (hasSideTopCornerNeg || hasSideBottomCornerNeg);
      const code = isLeft ? 'M-LL' : 'M-LR';
      const meta = C.MODULE_WEIGHTS[code];
      return { code, name: meta.name, weight: meta.weight };
    }

    // 6. Līnija (Line)
    if (hasEndNeg && hasEndPos) {
      const code = 'M-LN';
      const meta = C.MODULE_WEIGHTS[code];
      return { code, name: meta.name, weight: meta.weight };
    }

    // 7. Rindas gals (End of line)
    if (hasEndNeg || hasEndPos || contacts.length === 1) {
      const code = 'M-EL';
      const meta = C.MODULE_WEIGHTS[code];
      return { code, name: meta.name, weight: meta.weight };
    }

    // Noklusējums
    const code = 'M-LN';
    const meta = C.MODULE_WEIGHTS[code];
    return { code, name: meta.name, weight: meta.weight };
  }

  /**
   * Pārrēķina visu moduļu tipus un sagatavo kopsavilkuma specifikāciju
   */
  function updateClassification(modules) {
    if (!modules || !modules.length) {
      return {
        groups: [],
        totalCount: 0,
        totalWeight: 0
      };
    }

    const groupMap = new Map();

    modules.forEach(mod => {
      const res = classifySingleModule(mod, modules);
      mod.subType = res.code;

      if (!groupMap.has(res.code)) {
        groupMap.set(res.code, {
          code: res.code,
          name: res.name,
          unitWeight: res.weight,
          count: 0,
          totalWeight: 0
        });
      }

      const item = groupMap.get(res.code);
      item.count++;
      item.totalWeight = Math.round((item.count * item.unitWeight) * 100) / 100;
    });

    const groups = Array.from(groupMap.values()).sort((a, b) => a.code.localeCompare(b.code));
    const totalCount = modules.length;
    const totalWeight = Math.round(groups.reduce((sum, g) => sum + g.totalWeight, 0) * 100) / 100;

    return {
      groups,
      totalCount,
      totalWeight
    };
  }

  EW.Modules.Classifier = {
    classifySingleModule,
    updateClassification
  };
})();
