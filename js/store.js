/**
 * Easy walls 2.0 — Datu glabātuve un darba zonu serializācija
 */
window.EW = window.EW || {};

(function() {
  const S = EW.State;
  const C = EW.Config;
  const U = EW.Utils;

  // Glabātuves draiveris (window.storage / localStorage / in-memory fallback)
  const mem = new Map();
  let kind = 'memory';
  if (window.storage) {
    kind = 'cloud';
  } else {
    try {
      localStorage.setItem('__t', '1');
      localStorage.removeItem('__t');
      kind = 'local';
    } catch {}
  }

  const Store = {
    kind,
    async get(k) {
      try {
        if (kind === 'cloud') {
          const r = await window.storage.get(k, false);
          return r ? JSON.parse(r.value) : null;
        }
        if (kind === 'local') {
          const v = localStorage.getItem(k);
          return v ? JSON.parse(v) : null;
        }
      } catch {
        return mem.has(k) ? mem.get(k) : null;
      }
      return mem.has(k) ? mem.get(k) : null;
    },

    async set(k, v) {
      const s = JSON.stringify(v);
      if (kind === 'cloud') await window.storage.set(k, s, false);
      else if (kind === 'local') localStorage.setItem(k, s);
      else mem.set(k, v);
      return true;
    },

    async del(k) {
      try {
        if (kind === 'cloud') await window.storage.delete(k, false);
        else if (kind === 'local') localStorage.removeItem(k);
      } catch {}
      mem.delete(k);
    }
  };

  function imgToDataUrl(img, maxDim, quality) {
    const s = Math.min(1, maxDim / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    const cc = c.getContext('2d');
    cc.fillStyle = '#fff';
    cc.fillRect(0, 0, c.width, c.height);
    cc.imageSmoothingQuality = 'high';
    cc.drawImage(img, 0, 0, c.width, c.height);
    return { url: c.toDataURL('image/jpeg', quality), w: c.width, h: c.height, scale: s };
  }

  function buildRecord(name, id) {
    let img = imgToDataUrl(S.img, 2400, 0.86);
    if (img.url.length > 3.6e6) img = imgToDataUrl(S.img, 1700, 0.8);
    if (img.url.length > 3.6e6) img = imgToDataUrl(S.img, 1200, 0.75);
    const thumb = imgToDataUrl(S.img, 300, 0.7).url;

    return {
      schema: C.SCHEMA,
      id: id || ('wz_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      name,
      updated: Date.now(),
      plan: {
        fileName: S.planName,
        page: S.page,
        image: img.url,
        widthPx: img.w,
        heightPx: img.h,
        R: S.R * img.scale,
        mppPt: S.mppPt,
        denom: S.denom,
        detected: S.detected
      },
      grids: S.grids.map(g => ({ ...g })),
      view: { ...S.view },
      thumb,
      modules: S.modules.map(m => ({ ...m })) // 2. slāņa moduļi saglabājas šeit!
    };
  }

  async function saveRecord(rec) {
    await Store.set('ew:wz:' + rec.id, rec);
    const i = S.index.findIndex(r => r.id === rec.id);
    const stub = {
      id: rec.id,
      name: rec.name,
      updated: rec.updated,
      thumb: rec.thumb,
      denom: rec.plan.denom,
      grids: rec.grids.length,
      modules: (rec.modules || []).length
    };
    if (i >= 0) S.index[i] = stub;
    else S.index.unshift(stub);
    await Store.set(C.GRID_INDEX_KEY, S.index);
  }

  function applyRecord(rec, onLoaded) {
    const im = new Image();
    im.onload = () => {
      S.img = im;
      S.pdf = null;
      S.vp = null;
      S.chain = null;
      S.planName = rec.name;
      S.page = rec.plan.page || 1;
      S.pages = 1;
      S.R = rec.plan.R;
      S.mppPt = rec.plan.mppPt;
      S.denom = rec.plan.denom;
      S.detected = rec.plan.detected;
      S.grids = rec.grids.map(g => ({ ...g }));
      S.setGridSeq(Math.max(0, ...S.grids.map(g => g.id || 0)));
      S.active = 0;
      S.recordId = rec.id;
      if (rec.view) S.view = { ...rec.view };
      S.modules = (rec.modules || []).map(m => ({ ...m }));
      S.selectedModuleId = null;

      if (EW.Modules && EW.Modules.Geometry) {
        const maxId = S.modules.reduce((max, m) => {
          const n = parseInt((m.id || '').replace('m_', ''), 10);
          return Number.isFinite(n) ? Math.max(max, n) : max;
        }, 0);
        EW.Modules.Geometry.setSeq(maxId);
      }
      if (EW.Modules && EW.Modules.Classifier) {
        EW.Modules.Classifier.updateClassification(S.modules);
      }

      if (typeof onLoaded === 'function') onLoaded(rec);
    };
    im.src = rec.plan.image;
  }

  async function loadIndex() {
    S.index = (await Store.get(C.GRID_INDEX_KEY)) || [];
    return S.index;
  }

  async function deleteRecord(id) {
    await Store.del('ew:wz:' + id);
    S.index = S.index.filter(x => x.id !== id);
    await Store.set(C.GRID_INDEX_KEY, S.index);
  }

  EW.Store = {
    driver: Store,
    imgToDataUrl,
    buildRecord,
    saveRecord,
    applyRecord,
    loadIndex,
    deleteRecord
  };
})();
