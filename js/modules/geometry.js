/**
 * Easy walls 2.0 — Moduļu ģeometrija, porti un snap punkti
 */
window.EW = window.EW || {};
EW.Modules = EW.Modules || {};

(function() {
  /**
   * Moduļu definīcijas lokālajās koordinātās (metros, enkurs centrā (0,0))
   */
  const SPECS = {
    large: {
      type: 'large',
      name: 'Lielais modulis',
      code: '2x1',
      length: 2.0, // garums gar X asi pie rot=0
      width: 1.0,  // platums gar Y asi pie rot=0
      defaultWeight: 201.97, // kg (M-LN bāze)
      // Perimetra snap punkti ik pa 0.5 m (lokālajās koordinātās)
      snapPoints: [
        // Augšējā mala (Y = -0.5)
        { x: -1.0, y: -0.5 },
        { x: -0.5, y: -0.5 },
        { x:  0.0, y: -0.5, isPort: true, normal: { x: 0, y: -1 } }, // T/X ports
        { x:  0.5, y: -0.5 },
        { x:  1.0, y: -0.5 },
        // Apakšējā mala (Y = +0.5)
        { x: -1.0, y:  0.5 },
        { x: -0.5, y:  0.5 },
        { x:  0.0, y:  0.5, isPort: true, normal: { x: 0, y:  1 } }, // T/X ports
        { x:  0.5, y:  0.5 },
        { x:  1.0, y:  0.5 },
        // Gali (X = -1.0 un X = +1.0)
        { x: -1.0, y:  0.0, isPort: true, normal: { x: -1, y: 0 } }, // Gals L/Line
        { x:  1.0, y:  0.0, isPort: true, normal: { x:  1, y: 0 } }  // Gals L/Line
      ],
      // Galvenie montāžas porti
      ports: [
        { id: 'end-neg',  x: -1.0, y:  0.0, dir: { x: -1, y:  0 } },
        { id: 'end-pos',  x:  1.0, y:  0.0, dir: { x:  1, y:  0 } },
        { id: 'side-neg', x:  0.0, y: -0.5, dir: { x:  0, y: -1 } },
        { id: 'side-pos', x:  0.0, y:  0.5, dir: { x:  0, y:  1 } }
      ]
    },
    small: {
      type: 'small',
      name: 'Mazais modulis',
      code: '1x1',
      length: 1.0,
      width: 1.0,
      defaultWeight: 145.53, // kg (M-UN-L bāze)
      // Perimetra snap punkti ik pa 0.5 m
      snapPoints: [
        { x: -0.5, y: -0.5 },
        { x:  0.0, y: -0.5, isPort: true, normal: { x: 0, y: -1 } },
        { x:  0.5, y: -0.5 },
        { x:  0.5, y:  0.0, isPort: true, normal: { x: 1, y:  0 } },
        { x:  0.5, y:  0.5 },
        { x:  0.0, y:  0.5, isPort: true, normal: { x: 0, y:  1 } },
        { x: -0.5, y:  0.5 },
        { x: -0.5, y:  0.0, isPort: true, normal: { x: -1, y: 0 } }
      ],
      ports: [
        { id: 'top',    x:  0.0, y: -0.5, dir: { x:  0, y: -1 } },
        { id: 'right',  x:  0.5, y:  0.0, dir: { x:  1, y:  0 } },
        { id: 'bottom', x:  0.0, y:  0.5, dir: { x:  0, y:  1 } },
        { id: 'left',   x: -0.5, y:  0.0, dir: { x: -1, y:  0 } }
      ]
    }
  };

  let moduleSeq = 0;

  /**
   * Izveido jaunu moduļa objektu
   * @param {'large'|'small'} type 
   * @param {number} gridId 
   * @param {number} gx - centra koordināta metros režģa sistēmā
   * @param {number} gy - centra koordināta metros režģa sistēmā
   * @param {number} [rot=0] - leņķis (0, 90, 180, 270 grādi)
   */
  function createModule(type, gridId, gx, gy, rot = 0) {
    moduleSeq++;
    return {
      id: 'm_' + moduleSeq,
      type: type || 'large',
      gridId: gridId || 1,
      x: Math.round(gx * 1000) / 1000,
      y: Math.round(gy * 1000) / 1000,
      rot: ((rot % 360) + 360) % 360,
      subType: type === 'small' ? 'M-UN-L' : 'M-FS'
    };
  }

  /**
   * Aprēķina moduļa izmērus režģa koordinātās (ņemot vērā 90° rotāciju)
   */
  function getDimensionsInGrid(mod) {
    const spec = SPECS[mod.type] || SPECS.large;
    const isRotated = (mod.rot === 90 || mod.rot === 270);
    return {
      width: isRotated ? spec.width : spec.length,
      height: isRotated ? spec.length : spec.width
    };
  }

  /**
   * Aprēķina moduļa stūrus un perimetra punktus režģa koordinātu sistēmā
   */
  function getPointsInGrid(mod) {
    const spec = SPECS[mod.type] || SPECS.large;
    const rad = (mod.rot || 0) * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return spec.snapPoints.map(p => {
      // Rotācija ap centru (0,0) un translācija uz (mod.x, mod.y)
      const gx = p.x * cos - p.y * sin + mod.x;
      const gy = p.x * sin + p.y * cos + mod.y;
      return {
        x: Math.round(gx * 1000) / 1000,
        y: Math.round(gy * 1000) / 1000,
        isPort: !!p.isPort
      };
    });
  }

  /**
   * Pārbauda, vai konkrētais punkts (gx, gy) režģa koordinātās atrodas moduļa iekšienē
   */
  function containsPointInGrid(mod, gx, gy) {
    const spec = SPECS[mod.type] || SPECS.large;
    // Pārvedam punktu atpakaļ uz moduļa lokālajām koordinātām
    const rad = -(mod.rot || 0) * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = gx - mod.x;
    const dy = gy - mod.y;
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;

    const halfL = spec.length / 2;
    const halfW = spec.width / 2;
    return (lx >= -halfL && lx <= halfL && ly >= -halfW && ly <= halfW);
  }

  EW.Modules.Geometry = {
    SPECS,
    createModule,
    getDimensionsInGrid,
    getPointsInGrid,
    containsPointInGrid,
    setSeq: v => { moduleSeq = Math.max(moduleSeq, v); }
  };
})();
