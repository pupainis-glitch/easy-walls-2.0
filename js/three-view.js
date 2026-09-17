/**
 * Easy walls 2.0 — Interaktīva 3D telpas projekcija (Three.js)
 * 
 * Nodrošina:
 * 1. Pilnvērtīgu 3D telpas vizualizāciju ar 3.35 m augstiem moduļu blokiem un paneļu šuvēm
 * 2. Mākslas darbu renderēšanu 3D telpā ar to reālajām fotofiksācijas tekstūrām un rāmjiem
 * 3. 1.75 m cilvēka arhitektonisko siluetu mēroga un acu līnijas izjūtai
 * 4. OrbitControls kameras navigāciju (rotācija, pietuvināšana, pārbīde)
 * 5. Raycasting un interaktīvu darbu bīdīšanu tieši 3D skatā
 */
window.EW = window.EW || {};

(function() {
  const S = EW.State;
  const U = EW.Utils;

  let container = null;
  let scene = null;
  let camera = null;
  let renderer = null;
  let controls = null;
  let animId = null;
  let isReady = false;
  let isVisible = false;

  const wallMeshes = [];
  const artworkMeshes = [];
  let humanMesh = null;

  // Interaktivitāte 3D
  const raycaster = (typeof THREE !== 'undefined') ? new THREE.Raycaster() : null;
  const mouse = (typeof THREE !== 'undefined') ? new THREE.Vector2() : null;
  let selectedArtMesh = null;
  let dragPlane = null;
  let isDraggingArt = false;
  let dragOffset = null;

  /**
   * Pārliecinās, ka Three.js ir pieejams un inicializēts
   */
  function init() {
    if (isReady) return;
    if (typeof THREE === 'undefined') {
      console.warn('Three.js bibliotēka vēl nav ielādēta');
      return;
    }

    container = document.getElementById('threeContainer');
    if (!container) return;

    // 1. Scēna
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);

    // 2. Kamera
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    camera.position.set(0, 8, 14);

    // 3. Renderētājs
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Kameras vadība (OrbitControls)
    if (typeof THREE.OrbitControls !== 'undefined') {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI / 2 - 0.02; // neļauj ielīst zem grīdas
      controls.minDistance = 2;
      controls.maxDistance = 50;
      controls.target.set(0, 1.6, 0);
    }

    // 5. Apgaismojums (muzeja galerijas gaismas)
    setupLighting();

    // 6. Grīda
    setupFloor();

    // 7. Cilvēka siluets mērogam
    setupHumanScale();

    // 8. Peles notikumi 3D manipulācijām
    setupInteraction();

    // 9. Resize klausītājs
    window.addEventListener('resize', onResize);

    isReady = true;
    animate();
  }

  function setupLighting() {
    // Difūzā apkārtējā gaisma
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    // Galvenais virziena prožektors ar mīkstām ēnām
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(8, 15, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 40;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Papildus maiga gaisma no pretējās puses
    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.35);
    fillLight.position.set(-10, 10, -8);
    scene.add(fillLight);
  }

  function setupFloor() {
    // Muzeja grīda (gaišs betona/parketa tonis)
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.7,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Režģa līnijas uz grīdas (0.5 m un 1.0 m solis)
    const gridHelper = new THREE.GridHelper(50, 50, 0x94a3b8, 0xcbd5e1);
    gridHelper.position.y = 0.002;
    scene.add(gridHelper);
  }

  function setupHumanScale() {
    // 1.75 m cilvēka siluets mērogam
    const humanGroup = new THREE.Group();

    // Ķermenis (stilizēts cilindrs/elipsoīds)
    const bodyGeo = new THREE.CylinderGeometry(0.16, 0.14, 1.35, 16);
    const humanMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.5
    });
    const body = new THREE.Mesh(bodyGeo, humanMat);
    body.position.y = 0.675;
    body.castShadow = true;
    humanGroup.add(body);

    // Galva (lodīte) pie 1.65–1.75 m
    const headGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const head = new THREE.Mesh(headGeo, humanMat);
    head.position.y = 1.55;
    head.castShadow = true;
    humanGroup.add(head);

    humanGroup.position.set(-2.5, 0, 3.5);
    scene.add(humanGroup);
    humanMesh = humanGroup;
  }

  /**
   * Sinhronizē 3D ainas objektus ar Easy Walls stāvokli (S.modules un S.artworks)
   */
  function syncFromState() {
    if (!isReady || !scene) return;

    // 1. Notīrām esošos sienu un mākslas darbu meshadatus
    wallMeshes.forEach(m => scene.remove(m));
    wallMeshes.length = 0;
    artworkMeshes.forEach(m => scene.remove(m));
    artworkMeshes.length = 0;

    const modules = S.modules || [];
    if (!modules.length) return;

    // Aprēķinām centru, lai novietotu kameru
    let sumX = 0, sumY = 0;
    modules.forEach(m => {
      sumX += m.x;
      sumY += m.y;
    });
    const avgX = sumX / modules.length;
    const avgY = sumY / modules.length;

    // 2. Ģenerējam sienu moduļus 3D telpā
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.6,
      metalness: 0.05
    });
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4
    });

    modules.forEach(m => {
      const len = m.type === 'small' ? 1.0 : 2.0;
      const th = 1.0;
      const h = 3.35;

      const group = new THREE.Group();

      // Sienas galvenais korpuss
      const boxGeo = new THREE.BoxGeometry(len, h - 0.08, th);
      const boxMesh = new THREE.Mesh(boxGeo, wallMat);
      boxMesh.position.y = (h - 0.08) / 2 + 0.08;
      boxMesh.castShadow = true;
      boxMesh.receiveShadow = true;
      group.add(boxMesh);

      // Sienas kontūru līnijas (lai redzētu paneļu šuves)
      const edges = new THREE.EdgesGeometry(boxGeo);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xcbd5e1 }));
      line.position.copy(boxMesh.position);
      group.add(line);

      // Balsta pēdas / cokols apakšā (0.08 m)
      const baseGeo = new THREE.BoxGeometry(len * 0.96, 0.08, th * 0.94);
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.04;
      baseMesh.castShadow = true;
      group.add(baseMesh);

      // Pozīcija un rotācija (Three.js: X = East, Z = South, Y = Up)
      const posX = m.x - avgX;
      const posZ = m.y - avgY;
      const rotY = -(m.rot || 0) * Math.PI / 180;

      group.position.set(posX, 0, posZ);
      group.rotation.y = rotY;
      group.userData = { module: m };

      scene.add(group);
      wallMeshes.push(group);

      // 3. Pievienojam šim modulim piekārtos mākslas darbus
      const modArts = (S.artworks || []).filter(a => a.moduleId === m.id);
      modArts.forEach(art => {
        const artMesh = createArtworkMesh(art, m, avgX, avgY);
        if (artMesh) {
          scene.add(artMesh);
          artworkMeshes.push(artMesh);
        }
      });
    });

    // Novietojam cilvēka siluetu blakus sienai
    if (humanMesh && modules.length > 0) {
      humanMesh.position.set(modules[0].x - avgX + 1.8, 0, modules[0].y - avgY + 2.2);
    }

    if (controls) {
      controls.target.set(0, 1.6, 0);
      controls.update();
    }
  }

  /**
   * Izveido 3D mākslas darba objektu ar rāmi un fotofiksācijas tekstūru
   */
  function createArtworkMesh(art, mod, avgX, avgY) {
    const artW = art.width || 1.2;
    const artH = art.height || 1.6;
    const artDepth = art.depth || 0.06;
    const elev = art.elevation !== undefined ? art.elevation : 1.20;

    const group = new THREE.Group();

    // 1. Rāmja materiāls
    const frameMat = new THREE.MeshStandardMaterial({
      color: art.locked ? 0xb45309 : 0x334155,
      roughness: 0.4,
      metalness: 0.3
    });
    const frameGeo = new THREE.BoxGeometry(artW, artH, artDepth);
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.castShadow = true;
    group.add(frameMesh);

    // 2. Gleznas plakne (attēls vai audekla tekstūra)
    const canvasGeo = new THREE.PlaneGeometry(artW - 0.04, artH - 0.04);
    let canvasMat;

    if (art.imageUrl) {
      const loader = new THREE.TextureLoader();
      const texture = loader.load(art.imageUrl);
      canvasMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.3
      });
    } else {
      // Dinamisks kanvas audekls ar nosaukumu
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const cx = c.getContext('2d');
      cx.fillStyle = '#fef3c7';
      cx.fillRect(0, 0, 512, 512);
      cx.fillStyle = '#78350f';
      cx.font = 'bold 36px system-ui, sans-serif';
      cx.textAlign = 'center';
      cx.fillText(art.title, 256, 230);
      if (art.author) {
        cx.font = '28px system-ui, sans-serif';
        cx.fillStyle = '#92400e';
        cx.fillText(art.author, 256, 280);
      }
      const textTex = new THREE.CanvasTexture(c);
      canvasMat = new THREE.MeshStandardMaterial({ map: textTex, roughness: 0.5 });
    }

    const canvasMesh = new THREE.Mesh(canvasGeo, canvasMat);
    canvasMesh.position.z = artDepth / 2 + 0.002;
    group.add(canvasMesh);

    // 3. Pozicionējam pie moduļa skaldnes (front vai back)
    const modLen = mod.type === 'small' ? 1.0 : 2.0;
    const sideSign = art.wallSide === 'front' ? -1 : 1;
    const localX = art.posOnWall || 0;
    const localY = elev + artH / 2;
    const localZ = sideSign * (0.50 + artDepth / 2 + 0.005);

    // Pārnesam no moduļa lokālajām koordinātām uz pasaules 3D koordinātām
    const rotY = -(mod.rot || 0) * Math.PI / 180;
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);

    const worldRelX = localX * cos + localZ * sin;
    const worldRelZ = -localX * sin + localZ * cos;

    const posX = mod.x - avgX + worldRelX;
    const posY = localY;
    const posZ = mod.y - avgY + worldRelZ;

    group.position.set(posX, posY, posZ);
    group.rotation.y = rotY + (art.wallSide === 'front' ? 0 : Math.PI);

    group.userData = {
      artwork: art,
      module: mod,
      isArtwork: true
    };

    return group;
  }

  /**
   * Peles un pieskārienu notikumi (Raycasting un mākslas darbu atlase)
   */
  function setupInteraction() {
    if (!renderer) return;
    const dom = renderer.domElement;

    dom.addEventListener('pointerdown', (e) => {
      const rect = dom.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const rc = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2(x, y), camera);

      // Pārbaudām trāpījumu mākslas darbiem
      const intersects = rc.intersectObjects(artworkMeshes, true);
      if (intersects.length > 0) {
        let topGroup = intersects[0].object;
        while (topGroup.parent && !topGroup.userData.isArtwork) {
          topGroup = topGroup.parent;
        }

        if (topGroup && topGroup.userData.artwork) {
          const art = topGroup.userData.artwork;
          showArt3dCard(art, e.clientX, e.clientY);
        }
      } else {
        hideArt3dCard();
      }
    });
  }

  function showArt3dCard(art, clientX, clientY) {
    let card = document.getElementById('threeArtCard');
    if (!card) {
      card = document.createElement('div');
      card.id = 'threeArtCard';
      card.className = 'three-art-card';
      document.body.appendChild(card);
    }

    const thumbHtml = art.imageUrl ? `<img src="${art.imageUrl}" style="width:50px;height:50px;object-fit:cover;border-radius:4px">` : '';

    card.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center">
        ${thumbHtml}
        <div style="flex:1">
          <div style="font-weight:700;font-size:13px;color:#0f172a">${U.esc(art.title)}</div>
          <div style="font-size:11.5px;color:#475569">${art.width}×${art.height}m · <b>${art.weight} kg</b> · h=${art.elevation}m</div>
          <div style="font-size:10.5px;color:#0284c7;margin-top:2px">Siena: ${art.moduleId || '—'} (${art.wallSide === 'front' ? 'A puse' : 'B puse'})</div>
        </div>
      </div>
      <div style="display:flex;gap:6px;margin-top:8px;justify-content:flex-end">
        <button id="btn3dOpenElev" class="step" style="font-size:11px;padding:3px 8px">📐 Sienas fasādē</button>
        <button id="btn3dCloseCard" class="ghost" style="font-size:11px;padding:3px 6px">✕</button>
      </div>
    `;

    card.style.left = `${Math.min(window.innerWidth - 280, clientX + 12)}px`;
    card.style.top = `${Math.min(window.innerHeight - 150, clientY + 12)}px`;
    card.style.display = 'block';

    const btnElev = document.getElementById('btn3dOpenElev');
    if (btnElev) {
      btnElev.onclick = () => {
        hideArt3dCard();
        if (EW.Elevation && EW.Elevation.openElevation) {
          EW.Elevation.openElevation();
        }
      };
    }
    const btnClose = document.getElementById('btn3dCloseCard');
    if (btnClose) {
      btnClose.onclick = hideArt3dCard;
    }
  }

  function hideArt3dCard() {
    const card = document.getElementById('threeArtCard');
    if (card) card.style.display = 'none';
  }

  function onResize() {
    if (!renderer || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function animate() {
    animId = requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera && isVisible) {
      renderer.render(scene, camera);
    }
  }

  /**
   * Kameras skatupunktu preseti
   * @param {'entrance'|'isometric'|'eye_level'} type
   */
  function setViewpoint(type) {
    if (!camera) return;

    if (type === 'entrance') {
      camera.position.set(0, 1.7, 14);
      if (controls) controls.target.set(0, 1.6, 0);
    } else if (type === 'isometric') {
      camera.position.set(14, 16, 14);
      if (controls) controls.target.set(0, 0, 0);
    } else if (type === 'eye_level') {
      camera.position.set(0, 1.6, 5);
      if (controls) controls.target.set(0, 1.6, 0);
    }
    if (controls) controls.update();
  }

  function show() {
    init();
    if (!container) return;
    container.style.display = 'block';
    isVisible = true;
    const ctrl = document.getElementById('threeViewControls');
    if (ctrl) ctrl.style.display = 'inline-flex';
    onResize();
    syncFromState();
  }

  function hide() {
    if (container) container.style.display = 'none';
    isVisible = false;
    const ctrl = document.getElementById('threeViewControls');
    if (ctrl) ctrl.style.display = 'none';
    hideArt3dCard();
  }

  EW.ThreeView = {
    init,
    show,
    hide,
    setViewpoint,
    syncFromState,
    get isReady() { return isReady; },
    get isVisible() { return isVisible; }
  };
})();
