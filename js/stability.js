/**
 * Easy walls 2.0 — Modulāro sienu stabilitātes un balasta kalkulators
 * 
 * Bāzēts uz fizikālo un matemātisko modeli no Arsenāla moduļu stabilitātes kalkulatora:
 * - Apgāšanās moments no dinamiskā grūdiena F un eksponātu ekscentriskās slodzes
 * - Moduļa un apdares paneļu pašsvara noteikšana
 * - Drošības koeficienta (SF >= 2.0) pārbaude
 * - Nepieciešamā balasta atsvaru svara aprēķins
 * - Savienoto sienu konstrukciju (L, T stūru) stabilizējošais novērtējums
 */
window.EW = window.EW || {};

(function() {
  const S = EW.State;
  const Geom = EW.Modules ? EW.Modules.Geometry : null;

  // Fizikālās konstantes
  const CONSTANTS = {
    g: 9.81,                // gravitācijas paātrinājums m/s²
    rho_betons: 2400,       // betona blīvums kg/m³
    rho_MDF: 750,           // MDF plākšņu blīvums kg/m³
    al_linear_mass: 3.14,   // Al karkasa lineārā masa kg/m
    mdf_thickness: 0.016,   // 16 mm MDF apšuvums
    wall_height: 3.35,      // standarta augstums H = 3.35 m
    default_push_F: 150,    // standarta horizontālais grūdiens F = 150 N (ieteicams 150–500 N)
    push_height: 1.50,      // grūdiena spēka pielikšanas augstums h = 1.5 m
    foot_offset_Ok: 0.16,   // kājas nobīde no malas Ok = 0.16 m
    default_SF: 2.0         // standarta drošības koeficients SF >= 2.0
  };

  /**
   * Aprēķina viena moduļa konstrukcijas pašsvaru atbilstoši aktuālajai tehniskajai dokumentācijai:
   * 1. Karkasa svars no LNMM-M2-1020 komponentu saraksta (M-LN 201.97 kg, M-IN 207.11 kg, M-UN 145.53 kg utt.)
   * 2. Apdares paneļu svars no SolidWorks specifikācijas LNMM-M2-0081..0170 (P-2000 84.96 kg, P-1000 41.27 kg utt.)
   */
  function calculateSelfWeight(modOrType, allModules = null, attachedPanels = null) {
    const isSmall = (typeof modOrType === 'string' ? modOrType === 'small' : modOrType.type === 'small');
    const W = isSmall ? 1.0 : 2.0;
    const T = 1.0;
    const H = CONSTANTS.wall_height;

    // 1. Karkasa nominālais vai klasificētais svars no LNMM-M2-1020
    let frameWeight = isSmall ? 145.53 : 201.97;
    let frameCode = isSmall ? 'M-UN-L' : 'M-LN';
    let frameName = isSmall ? '1x1m universal module' : 'Typical module 2x1m (Line)';

    if (typeof modOrType === 'object' && EW.Modules && EW.Modules.Classifier) {
      const cls = EW.Modules.Classifier.classifySingleModule(modOrType, allModules || (S ? S.modules : []));
      if (cls && cls.weight) {
        frameWeight = cls.weight;
        frameCode = cls.code;
        frameName = cls.name;
      }
    }

    // 2. Apdares paneļu svars no SolidWorks specifikācijas
    let panelWeight = 0;
    let panelCount = 0;
    let panelCodes = [];

    if (typeof modOrType === 'object' && S && S.panels) {
      const panels = attachedPanels || S.panels.filter(p => p.moduleId === modOrType.id);
      if (panels.length > 0) {
        panelWeight = panels.reduce((sum, p) => sum + (p.weight || 0), 0);
        panelCount = panels.length;
        panelCodes = panels.map(p => p.code);
      }
    }

    // Ja apdares paneļi vēl nav saģenerēti ar pogu "Ģenerēt paneļus",
    // pieņemam divus standarta taisnos paneļus atbilstoši rasējumiem LNMM-M2-0081 un 0082
    if (panelWeight === 0) {
      if (isSmall) {
        panelWeight = 2 * 41.27; // 2 × P-1000 (LNMM-M2-0082)
        panelCount = 2;
        panelCodes = ['P-1000', 'P-1000'];
      } else {
        panelWeight = 2 * 84.96; // 2 × P-2000 (LNMM-M2-0081)
        panelCount = 2;
        panelCodes = ['P-2000', 'P-2000'];
      }
    }

    const totalWeight = frameWeight + panelWeight;
    return {
      frameWeight: Math.round(frameWeight * 100) / 100,
      panelWeight: Math.round(panelWeight * 100) / 100,
      frameCode,
      frameName,
      panelCount,
      panelCodes,
      total: Math.round(totalWeight * 100) / 100,
      W,
      T,
      H
    };
  }

  /**
   * Pārbauda, vai modulis ir savienots ar perpendikulāru moduli (L vai T mezgls)
   * Tas dramatiski palielina telpisko stabilitāti pret apgāšanos
   */
  function checkStructuralBracing(mod, allModules) {
    if (!allModules || allModules.length <= 1) return { isBraced: false, bracingType: 'none' };

    const spec = (Geom && Geom.SPECS[mod.type]) ? Geom.SPECS[mod.type] : { length: 2.0, width: 1.0 };
    const myRot = (mod.rot || 0) % 180;

    // Meklējam blakus esošos kaimiņus ar perpendikulāru rotāciju (rotācijas starpība 90°)
    for (let other of allModules) {
      if (other.id === mod.id || other.gridId !== mod.gridId) continue;
      const otherRot = (other.rot || 0) % 180;
      const isPerpendicular = Math.abs(myRot - otherRot) === 90;

      if (isPerpendicular) {
        const dx = Math.abs(mod.x - other.x);
        const dy = Math.abs(mod.y - other.y);
        // Ja saskaras vai atrodas 1.5m attālumā, tas veido L vai T spārnu
        if (dx <= 1.6 && dy <= 1.6) {
          return {
            isBraced: true,
            bracingType: 'perpendicular_wing',
            bracedBy: other.id
          };
        }
      }
    }

    return { isBraced: false, bracingType: 'linear' };
  }

  /**
   * Pilns stabilitātes aprēķins konkrētam modulim ar piekārtajiem mākslas darbiem
   * @param {Object} mod Moduļa objekts
   * @param {Object[]} artworks Pie šī moduļa piekārtie mākslas darbi
   * @param {Object} options Aprēķina iestatījumi (F, SF, H)
   */
  function calculateModuleStability(mod, artworks = [], options = {}) {
    const F = options.F !== undefined ? options.F : CONSTANTS.default_push_F;
    const SF = options.SF !== undefined ? options.SF : CONSTANTS.default_SF;
    const H = options.H !== undefined ? options.H : CONSTANTS.wall_height;
    const g = CONSTANTS.g;

    const allModules = options.allModules || (typeof S !== 'undefined' ? S.modules : []);
    const selfWeight = calculateSelfWeight(mod, allModules);
    const Ms = selfWeight.total; // konstrukcijas pašsvars kg
    const T = selfWeight.T;      // 1.0 m

    // Balsta punkta attālums no centrālās ass
    const d = (T / 2) - CONSTANTS.foot_offset_Ok; // 0.5 - 0.16 = 0.34 m

    // 1. Apgāšanās moments no horizontālā grūdiena (150 N pie h = 1.5 m)
    const Ma_push = F * CONSTANTS.push_height; // N·m

    // 2. Mākslas darbu ekscentriskā un dinamiskā slodze
    let Ma_art_front = 0;
    let Ma_art_back = 0;
    let totalArtMass = 0;

    (artworks || []).forEach(art => {
      const Mi = art.weight || 0; // kg
      if (Mi <= 0) return;

      totalArtMass += Mi;
      const Hi = art.elevation !== undefined ? art.elevation + (art.height || 1.0) / 2 : 1.60; // masas centra augstums
      const depth = art.depth || 0.08; // rāmja biezums
      const Oi = (T / 2) + (depth / 2); // ekscentricitāte no ass līdz darba centram

      // Ekscentricitātes moments ap balsta līniju: Mi * g * (Oi - d)
      const Ma_eccentric = Mi * g * (Oi - d);

      // Horizontālā dinamiskā/inerces komponente pie grūdiena: 0.10 * Mi * g * Hi
      const Ma_inertia = 0.10 * Mi * g * Hi;

      const Ma_single = Ma_eccentric + Ma_inertia;

      if (art.wallSide === 'back') {
        Ma_art_back += Ma_single;
      } else {
        Ma_art_front += Ma_single;
      }
    });

    // Kritisko apgāšanās virzienu nosaka tā puse, kurā piekārts lielāks moments
    const maxArtMoment = Math.max(Ma_art_front, Ma_art_back);
    const minArtMoment = Math.min(Ma_art_front, Ma_art_back);
    
    // Netto apgāšanās moments ar pretsvara efektu (konservatīvi līdz 60% pretsvara)
    const netArtMoment = Math.max(0, maxArtMoment - minArtMoment * 0.6);

    // Kopējais apgāšanās moments
    const total_Ma = Ma_push + netArtMoment; // N·m

    // 3. Nepieciešamais stabilizējošais svars
    const M_nepiec = (SF * total_Ma) / (g * d); // kg

    // Pārbaudām telpisko nostiprinājumu (L/T spārnus)
    const bracing = checkStructuralBracing(mod, allModules);
    let ballastNeeded = 0;

    if (bracing.isBraced) {
      // Perpendikulārs spārns nodrošina papildu balsta plecu d_eff >= 1.2 m
      // Balasts nepieciešams tikai pie ekstremālām slodzēm
      const d_eff = 1.20;
      const M_nepiec_braced = (SF * total_Ma) / (g * d_eff);
      ballastNeeded = Math.max(0, Math.ceil(M_nepiec_braced - Ms));
    } else {
      ballastNeeded = Math.max(0, Math.ceil(M_nepiec - Ms));
    }

    // 4. Faktiskais drošības koeficients ar un bez balasta
    const SF_actual_no_ballast = (Ms * g * d) / Math.max(1, total_Ma);
    const SF_actual_with_ballast = ((Ms + ballastNeeded) * g * d) / Math.max(1, total_Ma);

    // 5. Statusa klasifikācija
    let status = 'stable'; // 'stable' | 'needs_ballast' | 'unstable'
    if (ballastNeeded > 0) {
      status = (ballastNeeded > 180 || SF_actual_no_ballast < 0.9) ? 'unstable' : 'needs_ballast';
    }

    // 6. Balsta pēdu reakcijas spēks N_max uz grīdu (kN un kg)
    const M_total = Ms + ballastNeeded + totalArtMass;
    const N_stat = (M_total * g) / 4; // uz 4 pēdām statiskā slodze
    const N_dyn = ((SF - 1) * total_Ma) / (4 * d);
    const N_max_leg_N = Math.max(N_stat, N_dyn);
    const N_max_leg_kg = Math.round(N_max_leg_N / g);

    return {
      moduleId: mod.id,
      moduleType: mod.type,
      frameCode: selfWeight.frameCode,
      frameName: selfWeight.frameName,
      frameWeight: selfWeight.frameWeight,
      panelWeight: selfWeight.panelWeight,
      panelCount: selfWeight.panelCount,
      panelCodes: selfWeight.panelCodes,
      selfWeight: Ms,
      artworksCount: (artworks || []).length,
      totalArtMass: Math.round(totalArtMass * 10) / 10,
      Ma_push: Math.round(Ma_push),
      Ma_art: Math.round(netArtMoment),
      total_Ma: Math.round(total_Ma),
      M_nepiec: Math.round(M_nepiec),
      ballastNeeded,
      isBraced: bracing.isBraced,
      bracingType: bracing.bracingType,
      SF_req: SF,
      SF_actual: Math.round(SF_actual_no_ballast * 100) / 100,
      SF_with_ballast: Math.round(SF_actual_with_ballast * 100) / 100,
      N_max_leg_kg,
      status // 'stable' (zaļš), 'needs_ballast' (dzeltens), 'unstable' (sarkans)
    };
  }

  /**
   * Aprēķina visas ekspozīcijas stabilitātes kopsavilkumu
   */
  function calculateExhibitionStability(options = {}) {
    if (!S.modules || !S.modules.length) {
      return {
        modules: [],
        totalBallast: 0,
        unstableCount: 0,
        needsBallastCount: 0,
        stableCount: 0,
        totalArtMass: 0,
        overallStatus: 'stable'
      };
    }

    const results = [];
    let totalBallast = 0;
    let unstableCount = 0;
    let needsBallastCount = 0;
    let stableCount = 0;
    let totalArtMass = 0;

    S.modules.forEach(mod => {
      // Atlasām mākslas darbus, kas piekārti pie šī moduļa
      const modArts = (S.artworks || []).filter(a => a.moduleId === mod.id);
      const res = calculateModuleStability(mod, modArts, options);
      results.push(res);

      totalBallast += res.ballastNeeded;
      totalArtMass += res.totalArtMass;
      if (res.status === 'unstable') unstableCount++;
      else if (res.status === 'needs_ballast') needsBallastCount++;
      else stableCount++;
    });

    let overallStatus = 'stable';
    if (unstableCount > 0) overallStatus = 'unstable';
    else if (needsBallastCount > 0) overallStatus = 'needs_ballast';

    return {
      modules: results,
      totalBallast,
      unstableCount,
      needsBallastCount,
      stableCount,
      totalArtMass: Math.round(totalArtMass * 10) / 10,
      overallStatus
    };
  }

  EW.Stability = {
    CONSTANTS,
    calculateSelfWeight,
    checkStructuralBracing,
    calculateModuleStability,
    calculateExhibitionStability
  };
})();
