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

  let floorBaseMesh = null;
  let floorPlanMesh = null;
  let floorGridHelper = null;
  let dragGhostMesh = null;
  let camTransition = null;

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
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 150);
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
      controls.maxDistance = 60;
      controls.target.set(0, 1.6, 0);
      controls.addEventListener('start', () => {
        cancelCamTransition();
      });
    }

    // 5. Apgaismojums (muzeja galerijas gaismas)
    setupLighting();

    // 6. Grīda un arhitektūras plāns
    setupFloor();

    // 7. Cilvēka siluets mērogam
    setupHumanScale();

    // 8. Peles notikumi 3D manipulācijām
    setupInteraction();

    // 8.1. 3D Drag & Drop moduļu ievilkšanai
    setup3dDragAndDrop();

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
    // Muzeja fona pamatgrīda
    const floorGeo = new THREE.PlaneGeometry(120, 120);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xebf0f5,
      roughness: 0.85,
      metalness: 0.05
    });
    floorBaseMesh = new THREE.Mesh(floorGeo, floorMat);
    floorBaseMesh.rotation.x = -Math.PI / 2;
    floorBaseMesh.position.y = -0.005;
    floorBaseMesh.receiveShadow = true;
    scene.add(floorBaseMesh);

    // Režģa līnijas uz grīdas (0.5 m un 1.0 m solis)
    floorGridHelper = new THREE.GridHelper(60, 60, 0x94a3b8, 0xcbd5e1);
    floorGridHelper.position.y = 0.002;
    scene.add(floorGridHelper);
  }

  /**
   * Sinhronizē telpas autentisko arhitektūras plānu (PDF vai sintētisko pamatni) kā tekstūru uz 3D grīdas
   */
  function syncFloorPlanTexture() {
    if (!scene) return;

    if (floorPlanMesh) {
      scene.remove(floorPlanMesh);
      if (floorPlanMesh.geometry) floorPlanMesh.geometry.dispose();
      if (floorPlanMesh.material) {
        if (floorPlanMesh.material.map) floorPlanMesh.material.map.dispose();
        floorPlanMesh.material.dispose();
      }
      floorPlanMesh = null;
    }

    if (!S.img) return;

    const m = S.mpp();
    const wm = S.img.width * m;
    const hm = S.img.height * m;
    if (wm <= 0 || hm <= 0) return;

    const g = S.G();
    const gDx = (g && g.dx !== undefined) ? g.dx : wm / 2;
    const gDy = (g && g.dy !== undefined) ? g.dy : hm / 2;

    const planGeo = new THREE.PlaneGeometry(wm, hm);
    const texture = new THREE.CanvasTexture(S.img);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    if (renderer && renderer.capabilities) {
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }
    texture.needsUpdate = true;

    const planMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      metalness: 0.05
    });

    floorPlanMesh = new THREE.Mesh(planGeo, planMat);
    floorPlanMesh.rotation.x = -Math.PI / 2;
    // Pozicionējam metros attiecībā pret režģa sākumpunktu (0,0)
    floorPlanMesh.position.set((wm / 2) - gDx, 0.001, (hm / 2) - gDy);
    floorPlanMesh.receiveShadow = true;
    scene.add(floorPlanMesh);
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

    // 1. Sinhronizējam telpas autentisko arhitektūras plānu uz grīdas
    syncFloorPlanTexture();

    // 2. Notīrām esošos sienu un mākslas darbu meshadatus
    wallMeshes.forEach(m => scene.remove(m));
    wallMeshes.length = 0;
    artworkMeshes.forEach(m => scene.remove(m));
    artworkMeshes.length = 0;

    const isMultiRoomExp = !!(S.exhibition && S.exhibition.rooms && S.exhibition.rooms.length > 1);
    const activeGrid = S.G();
    const activeGridId = activeGrid ? activeGrid.id : ((S.activeRoomIndex !== undefined ? S.activeRoomIndex : 0) + 1);

    const modules = (S.modules || []).filter(m => {
      if (isMultiRoomExp && m.gridId && m.gridId !== activeGridId) return false;
      return true;
    });

    // 3. Ģenerējam sienu moduļus 3D telpā
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

      // Pozīcija un rotācija — piesaistīta tieši aktīvās zāles režģa koordinātām
      const posX = m.x;
      const posZ = m.y;
      const rotY = -(m.rot || 0) * Math.PI / 180;

      group.position.set(posX, 0, posZ);
      group.rotation.y = rotY;
      group.userData = { module: m };

      scene.add(group);
      wallMeshes.push(group);

      // 4. Pievienojam šim modulim piekārtos mākslas darbus
      const modArts = (S.artworks || []).filter(a => a.moduleId === m.id);
      modArts.forEach(art => {
        const artMesh = createArtworkMesh(art, m);
        if (artMesh) {
          scene.add(artMesh);
          artworkMeshes.push(artMesh);
        }
      });
    });

    // Cilvēka siluets mērogam
    if (humanMesh) {
      if (modules.length > 0) {
        humanMesh.position.set(modules[0].x + 1.8, 0, modules[0].y + 2.2);
      } else {
        humanMesh.position.set(2.0, 0, 2.5);
      }
    }

    updateSelectionVisual();
  }

  /**
   * Izveido 3D mākslas darba objektu ar rāmi un fotofiksācijas tekstūru
   */
  function createArtworkMesh(art, mod) {
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

    const posX = mod.x + worldRelX;
    const posY = localY;
    const posZ = mod.y + worldRelZ;

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
   * Izveido 3D Ghost karkasa moduli vilkšanas laikā
   */
  function create3dGhostMesh(type, rot) {
    const len = type === 'small' ? 1.0 : 2.0;
    const th = 1.0;
    const h = 3.35;
    const group = new THREE.Group();

    // Caurspīdīgs oranžs ķermenis
    const boxGeo = new THREE.BoxGeometry(len, h, th);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      transparent: true,
      opacity: 0.45,
      roughness: 0.3
    });
    const mesh = new THREE.Mesh(boxGeo, boxMat);
    mesh.position.y = h / 2;
    group.add(mesh);

    // Karkasa kontūru malas
    const edges = new THREE.EdgesGeometry(boxGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x9a3412, linewidth: 2 });
    const wire = new THREE.LineSegments(edges, lineMat);
    wire.position.copy(mesh.position);
    group.add(wire);

    group.userData = { type, rot };
    return group;
  }

  /**
   * Piesaista Drag & Drop notikumus Three.js logam ar 500 mm režģa piesaisti
   */
  function setup3dDragAndDrop() {
    if (!renderer || !container) return;
    const dom = renderer.domElement;

    dom.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      ev.dataTransfer.dropEffect = 'copy';

      const follower = document.getElementById('moduleDragFollower');
      if (follower) follower.style.display = 'none';

      const dragCard = (EW.ModulesInteraction && typeof EW.ModulesInteraction.getActiveDragCard === 'function')
        ? EW.ModulesInteraction.getActiveDragCard()
        : null;

      let type = dragCard ? dragCard.type : 'large';
      let rot = dragCard ? dragCard.rot : 0;

      const raw = ev.dataTransfer.getData('text/plain');
      if (raw) {
        try {
          const d = JSON.parse(raw);
          if (d.type) type = d.type;
          if (d.rot !== undefined) rot = d.rot;
        } catch { /* ignore */ }
      }

      const rect = dom.getBoundingClientRect();
      const mouseX = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
      const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hit = new THREE.Vector3();

      if (raycaster.ray.intersectPlane(ground, hit)) {
        let snapGx = Math.round(hit.x / 0.5) * 0.5;
        let snapGy = Math.round(hit.z / 0.5) * 0.5;

        const g = S.G();
        const gid = g ? g.id : 1;
        const Geom = EW.Modules && EW.Modules.Geometry;
        const Snapping = EW.Modules && EW.Modules.Snapping;

        let finalGx = snapGx;
        let finalGy = snapGy;

        if (Geom && Snapping && typeof Snapping.calculateSnap === 'function') {
          const tempMod = Geom.createModule(type, gid, snapGx, snapGy, rot);
          const snapRes = Snapping.calculateSnap(tempMod, S.modules, snapGx, snapGy);
          if (snapRes && snapRes.snappedToNeighbor) {
            finalGx = Math.round(snapRes.x / 0.5) * 0.5;
            finalGy = Math.round(snapRes.y / 0.5) * 0.5;
          }
        }

        if (!dragGhostMesh) {
          dragGhostMesh = create3dGhostMesh(type, rot);
          scene.add(dragGhostMesh);
        } else if (dragGhostMesh.userData.type !== type) {
          scene.remove(dragGhostMesh);
          dragGhostMesh = create3dGhostMesh(type, rot);
          scene.add(dragGhostMesh);
        }

        dragGhostMesh.position.set(finalGx, 0, finalGy);
        dragGhostMesh.rotation.y = -(rot || 0) * Math.PI / 180;
        dragGhostMesh.visible = true;
        dragGhostMesh.userData = { type, rot, gx: finalGx, gy: finalGy };
      }
    });

    dom.addEventListener('dragleave', () => {
      if (dragGhostMesh) dragGhostMesh.visible = false;
    });

    dom.addEventListener('drop', (ev) => {
      ev.preventDefault();
      let type = 'large';
      let rot = 0;
      let targetGx = 0;
      let targetGy = 0;

      if (dragGhostMesh && dragGhostMesh.visible && dragGhostMesh.userData) {
        type = dragGhostMesh.userData.type || type;
        rot = dragGhostMesh.userData.rot || rot;
        targetGx = dragGhostMesh.userData.gx;
        targetGy = dragGhostMesh.userData.gy;
        dragGhostMesh.visible = false;
      } else {
        const raw = ev.dataTransfer.getData('text/plain');
        if (raw) {
          try {
            const d = JSON.parse(raw);
            if (d.type) type = d.type;
            if (d.rot !== undefined) rot = d.rot;
          } catch { /* ignore */ }
        }
      }

      if (EW.ModulesInteraction && typeof EW.ModulesInteraction.addModule === 'function') {
        EW.ModulesInteraction.addModule(type, rot, targetGx, targetGy);
      }

      syncFromState();
      if (EW.UI && EW.UI.toast) {
        EW.UI.toast(`🧱 Modulis (${type === 'small' ? '1×1m' : '2×1m'}) novietots 3D telpā`);
      }
    });
  }

  /**
   * Atjauno sienu moduļu vizuālo izcēlumu 3D telpā atbilstoši S.selectedModuleId
   */
  function updateSelectionVisual() {
    wallMeshes.forEach(group => {
      const mod = group.userData.module;
      if (!mod) return;
      const isSel = (mod.id === S.selectedModuleId);

      const boxMesh = group.children[0];
      const lineMesh = group.children[1];
      if (boxMesh && boxMesh.material) {
        if (isSel) {
          boxMesh.material.color.setHex(0xffedd5); // Maigs silts oranžs fons
          if (boxMesh.material.emissive) {
            boxMesh.material.emissive.setHex(0xea580c);
            boxMesh.material.emissiveIntensity = 0.28;
          }
        } else {
          boxMesh.material.color.setHex(0xf8fafc); // Standarta baltais tonis
          if (boxMesh.material.emissive) {
            boxMesh.material.emissive.setHex(0x000000);
            boxMesh.material.emissiveIntensity = 0;
          }
        }
      }
      if (lineMesh && lineMesh.material) {
        lineMesh.material.color.setHex(isSel ? 0xea580c : 0xcbd5e1);
      }
    });
  }

  /**
   * Peles un pieskārienu notikumi (Raycasting, moduļu atlase un mākslas darbu kartītes)
   */
  function setupInteraction() {
    if (!renderer) return;
    const dom = renderer.domElement;
    let pointerDownPos = null;

    dom.addEventListener('pointerdown', (e) => {
      cancelCamTransition();
      pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    dom.addEventListener('pointerup', (e) => {
      if (!pointerDownPos) return;
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      pointerDownPos = null;
      if (dist > 6) return; // Lietotājs rotēja kameru (Orbit), nevis veica klikšķi

      const rect = dom.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const rc = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2(x, y), camera);

      // 1. Pārbaudām trāpījumu mākslas darbiem
      const artHits = rc.intersectObjects(artworkMeshes, true);
      if (artHits.length > 0) {
        let topGroup = artHits[0].object;
        while (topGroup.parent && !topGroup.userData.isArtwork) {
          topGroup = topGroup.parent;
        }

        if (topGroup && topGroup.userData.artwork) {
          hideModule3dCard();
          showArt3dCard(topGroup.userData.artwork, e.clientX, e.clientY);
          return;
        }
      }
      hideArt3dCard();

      // 2. Pārbaudām trāpījumu sienu moduļiem (atlasīšanai un dzēšanai ar Delete)
      const wallHits = rc.intersectObjects(wallMeshes, true);
      if (wallHits.length > 0) {
        let topGroup = wallHits[0].object;
        while (topGroup.parent && !topGroup.userData.module) {
          topGroup = topGroup.parent;
        }

        if (topGroup && topGroup.userData.module) {
          const mod = topGroup.userData.module;
          S.selectedModuleId = mod.id;
          updateSelectionVisual();
          if (EW.ModulesInteraction && typeof EW.ModulesInteraction.updateModuleControls === 'function') {
            EW.ModulesInteraction.updateModuleControls();
          }
          showModule3dCard(mod, e.clientX, e.clientY);
          return;
        }
      }

      // 3. Ja noklikšķina tukšā laukumā — noņemam atlasi
      S.selectedModuleId = null;
      updateSelectionVisual();
      if (EW.ModulesInteraction && typeof EW.ModulesInteraction.updateModuleControls === 'function') {
        EW.ModulesInteraction.updateModuleControls();
      }
      hideModule3dCard();
    });
  }

  function showModule3dCard(mod, clientX, clientY) {
    let card = document.getElementById('threeModuleCard');
    if (!card) {
      card = document.createElement('div');
      card.id = 'threeModuleCard';
      card.className = 'three-mod-card';
      document.body.appendChild(card);
    }

    const typeLbl = mod.type === 'small' ? '1.0×1.0 m (Mazais)' : '2.0×1.0 m (Lielais)';
    const rotLbl = mod.rot ? `${mod.rot}°` : '0°';

    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px">
        <div style="font-weight:700;font-size:12px;color:#fdba74">🧱 Atlasīts modulis</div>
        <span style="font-size:10.5px;color:#94a3b8">${typeLbl} · ${rotLbl}</span>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <button id="btn3dRotMod" class="step" style="font-size:11px;padding:3px 8px" title="Pagriezt par 90 grādiem (taustiņš R)">🔄 Pagriezt (R)</button>
        <button id="btn3dDelMod" class="step" style="font-size:11px;padding:3px 8px;background:#ef4444;border-color:#ef4444;color:#fff" title="Dzēst moduli (taustiņš Del / Backspace)">🗑️ Dzēst (Del)</button>
        <button id="btn3dCloseMod" class="ghost" style="font-size:11px;padding:3px 6px">✕</button>
      </div>
    `;

    card.style.position = 'fixed';
    card.style.zIndex = '99999';
    card.style.background = 'rgba(15, 23, 42, 0.94)';
    card.style.border = '1.5px solid rgba(234, 88, 12, 0.7)';
    card.style.borderRadius = '8px';
    card.style.padding = '8px 12px';
    card.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.35)';
    card.style.backdropFilter = 'blur(10px)';
    card.style.left = `${Math.min(window.innerWidth - 270, clientX + 12)}px`;
    card.style.top = `${Math.min(window.innerHeight - 110, clientY + 12)}px`;
    card.style.display = 'block';

    const btnRot = document.getElementById('btn3dRotMod');
    if (btnRot) {
      btnRot.onclick = (ev) => {
        ev.stopPropagation();
        if (EW.ModulesInteraction && typeof EW.ModulesInteraction.rotateSelected === 'function') {
          EW.ModulesInteraction.rotateSelected();
        }
        hideModule3dCard();
      };
    }

    const btnDel = document.getElementById('btn3dDelMod');
    if (btnDel) {
      btnDel.onclick = (ev) => {
        ev.stopPropagation();
        if (EW.ModulesInteraction && typeof EW.ModulesInteraction.deleteSelected === 'function') {
          EW.ModulesInteraction.deleteSelected();
        }
        hideModule3dCard();
      };
    }

    const btnClose = document.getElementById('btn3dCloseMod');
    if (btnClose) {
      btnClose.onclick = (ev) => {
        ev.stopPropagation();
        hideModule3dCard();
      };
    }
  }

  function hideModule3dCard() {
    const card = document.getElementById('threeModuleCard');
    if (card) card.style.display = 'none';
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

  function cancelCamTransition() {
    camTransition = null;
  }

  function showCamFocusBadge(title, subtitle) {
    if (!container) return;
    let badge = document.getElementById('threeCamFocusBadge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'threeCamFocusBadge';
      badge.className = 'three-cam-focus-badge';
      container.appendChild(badge);
    }
    badge.innerHTML = `<span>🎥</span> <span>${title}</span>` + (subtitle ? `<span style="color:#fdba74;font-size:11px">· ${subtitle}</span>` : '');
    badge.classList.add('visible');

    if (badge._hideTimer) clearTimeout(badge._hideTimer);
    badge._hideTimer = setTimeout(() => {
      badge.classList.remove('visible');
    }, 2000);
  }

  /**
   * Aprēķina kameras optimālo fokusa punktu un skatupozīciju konkrētajai zālei un tās moduļu grupai
   */
  function calculateRoomFocus(roomIdx) {
    if (roomIdx === undefined || roomIdx === null) {
      roomIdx = S.activeRoomIndex || 0;
    }

    const isMultiRoomExp = !!(S.exhibition && S.exhibition.rooms && S.exhibition.rooms.length > 1);
    const targetGrid = (S.grids && S.grids[roomIdx]) ? S.grids[roomIdx] : S.G();
    const targetGridId = targetGrid ? targetGrid.id : (roomIdx + 1);

    const roomMods = (S.modules || []).filter(m => {
      if (isMultiRoomExp && m.gridId && m.gridId !== targetGridId) return false;
      return true;
    });

    const rm = (S.exhibition && S.exhibition.rooms) ? S.exhibition.rooms[roomIdx] : null;
    const rmName = rm ? rm.name : `Zāle ${roomIdx + 1}`;

    if (roomMods.length > 0) {
      let minX = Infinity, maxX = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      roomMods.forEach(m => {
        const halfLen = (m.type === 'small' ? 1.0 : 2.0) / 2;
        const halfTh = 0.5;
        const rad = ((m.rot || 0) * Math.PI) / 180;
        const cos = Math.abs(Math.cos(rad));
        const sin = Math.abs(Math.sin(rad));
        const extX = halfLen * cos + halfTh * sin;
        const extZ = halfLen * sin + halfTh * cos;

        minX = Math.min(minX, m.x - extX);
        maxX = Math.max(maxX, m.x + extX);
        minZ = Math.min(minZ, m.y - extZ);
        maxZ = Math.max(maxZ, m.y + extZ);
      });

      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const centerY = 1.6; // Cilvēka acu līnija un moduļu vertikālais centrs

      const spanX = maxX - minX;
      const spanZ = maxZ - minZ;
      const maxSpan = Math.max(spanX, spanZ, 4.0);

      // Kameras attālums komfortablai moduļu grupas kadrēšanai (45° kameras leņķis)
      const dist = Math.max(maxSpan * 1.35, 7.5);
      const camX = centerX + dist * 0.72;
      const camY = Math.max(dist * 0.62, 4.2);
      const camZ = centerZ + dist * 1.05;

      return {
        hasModules: true,
        count: roomMods.length,
        roomName: rmName,
        target: new THREE.Vector3(centerX, centerY, centerZ),
        position: new THREE.Vector3(camX, camY, camZ),
        span: maxSpan
      };
    } else {
      // Tukša zāle bez moduļiem — kadrējam zāles grīdas plānu
      const w = rm ? (rm.widthM || 24) : 24;
      const h = rm ? (rm.heightM || 18) : 18;
      const span = Math.max(w, h, 14);
      const dist = Math.max(span * 0.75, 12);

      return {
        hasModules: false,
        count: 0,
        roomName: rmName,
        target: new THREE.Vector3(0, 1.2, 0),
        position: new THREE.Vector3(dist * 0.65, Math.max(dist * 0.6, 6.5), dist * 0.95),
        span
      };
    }
  }

  /**
   * Animēti un plūstoši pārvieto 3D kameru uz konkrētās zāles moduļu grupu
   * @param {number} roomIdx Zāles indekss
   * @param {number} duration Ilgums milisekundēs (~850ms)
   * @param {boolean} showBadge Vai rādīt HUD birku
   */
  function animateCameraToRoom(roomIdx, duration = 850, showBadge = true) {
    if (!isReady || !camera || !controls) {
      if (!isReady) init();
      if (!camera || !controls) return;
    }

    const focus = calculateRoomFocus(roomIdx);
    if (!focus) return;

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const endPos = focus.position;
    const endTarget = focus.target;

    const travelDist = startPos.distanceTo(endPos);
    const targetDist = startTarget.distanceTo(endTarget);

    if (travelDist < 0.08 && targetDist < 0.08) {
      return;
    }

    const arcHeight = travelDist > 2.5 ? Math.min(travelDist * 0.12, 3.5) : 0;

    camTransition = {
      startPos,
      endPos,
      startTarget,
      endTarget,
      startTime: performance.now(),
      duration: Math.max(450, duration),
      arcHeight
    };

    if (showBadge) {
      const sub = focus.hasModules 
        ? `${focus.count} ${focus.count === 1 ? 'modulis' : 'moduļi'}`
        : 'Tukša telpa';
      showCamFocusBadge(`Zāle: ${focus.roomName}`, sub);
    }
  }

  function stepCameraTransition(now) {
    if (!camTransition) return;

    const elapsed = now - camTransition.startTime;
    const progress = Math.min(1.0, elapsed / camTransition.duration);

    // Gluda paātrinājuma un bremzēšanas līkne (easeInOutCubic)
    const t = progress < 0.5 
      ? 4 * progress * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    controls.target.lerpVectors(camTransition.startTarget, camTransition.endTarget, t);
    camera.position.lerpVectors(camTransition.startPos, camTransition.endPos, t);

    if (camTransition.arcHeight > 0) {
      const arc = Math.sin(progress * Math.PI) * camTransition.arcHeight;
      camera.position.y += arc;
    }

    controls.update();

    if (progress >= 1.0) {
      camTransition = null;
    }
  }

  function animate(time) {
    animId = requestAnimationFrame(animate);

    if (camTransition) {
      stepCameraTransition(time || performance.now());
    } else if (controls) {
      controls.update();
    }

    if (renderer && scene && camera && isVisible) {
      renderer.render(scene, camera);
    }
  }

  /**
   * Kameras skatupunktu preseti ar plūstošu pāreju
   * @param {'entrance'|'isometric'|'eye_level'|'room_focus'} type
   */
  function setViewpoint(type) {
    if (!camera || !controls) return;

    if (type === 'room_focus') {
      animateCameraToRoom(S.activeRoomIndex || 0, 800, true);
      return;
    }

    let endPos, endTarget;
    if (type === 'entrance') {
      endPos = new THREE.Vector3(0, 1.7, 14);
      endTarget = new THREE.Vector3(0, 1.6, 0);
    } else if (type === 'isometric') {
      endPos = new THREE.Vector3(14, 16, 14);
      endTarget = new THREE.Vector3(0, 0, 0);
    } else if (type === 'eye_level') {
      endPos = new THREE.Vector3(0, 1.6, 5);
      endTarget = new THREE.Vector3(0, 1.6, 0);
    }

    if (endPos && endTarget) {
      const startPos = camera.position.clone();
      const startTarget = controls.target.clone();
      camTransition = {
        startPos,
        endPos,
        startTarget,
        endTarget,
        startTime: performance.now(),
        duration: 750,
        arcHeight: Math.min(startPos.distanceTo(endPos) * 0.1, 2.0)
      };
    }
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
    animateCameraToRoom(S.activeRoomIndex || 0, 750, true);
  }

  function hide() {
    if (container) container.style.display = 'none';
    isVisible = false;
    cancelCamTransition();
    const ctrl = document.getElementById('threeViewControls');
    if (ctrl) ctrl.style.display = 'none';
    hideArt3dCard();
    hideModule3dCard();
    const badge = document.getElementById('threeCamFocusBadge');
    if (badge) badge.classList.remove('visible');
  }

  EW.ThreeView = {
    init,
    show,
    hide,
    setViewpoint,
    syncFromState,
    updateSelectionVisual,
    calculateRoomFocus,
    animateCameraToRoom,
    hideModuleCard: hideModule3dCard,
    get isReady() { return isReady; },
    get isVisible() { return isVisible; }
  };
})();
