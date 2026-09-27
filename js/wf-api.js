/* 文风字体 · 控制台 API 客户端（mock | live）。依赖 wf-proto；mock 委托 WFApp 状态。
 * Catalog contract (lab + future vault): list=thin (fonts-list fields), detail=fat (per-slug).
 * mode() default is mock — do NOT default live; no vault cutover in perf lab tips.
 * See docs/CATALOG-THIN-FAT.md. */
(function () {
  const MODE_KEY = 'wf-api-mode';

  /** @typedef {{ id: string, name: string, slug: string, createdAt?: string, updatedAt?: string, fonts?: any[], domains?: Domain[], versions?: any[], delivery?: object, usage?: object }} Project */
  /** @typedef {{ host: string, verified: boolean, method?: string, addedAt?: string, verifiedAt?: string|null, lastSeenAt?: string|null, projectId?: string, requests30d?: number, bytes30d?: number }} Domain */
  /** @typedef {{ ok: boolean, data?: any, error?: { code: string, message: string } }} Envelope */

  function mode() {
    /* Default mock. Live only via explicit localStorage / WFProto.API_MODE — never auto. */
    try {
      const m = localStorage.getItem(MODE_KEY);
      if (m === 'live' || m === 'mock') return m;
    } catch (e) { /* ignore */ }
    if (window.WFProto && (WFProto.API_MODE === 'live' || WFProto.API_MODE === 'mock')) return WFProto.API_MODE;
    return 'mock';
  }

  function base() {
    return (window.WFProto && WFProto.CSS_API) || 'https://app.windfonts.com';
  }

  function isMock() { return mode() !== 'live'; }

  function apiError(code, message, status) {
    const err = new Error(message || code || '请求失败');
    err.code = code || 'internal';
    err.status = status || 0;
    return err;
  }

  function bearerHeaders(extra) {
    const h = Object.assign({ 'Content-Type': 'application/json', Accept: 'application/json' }, extra || {});
    try {
      const s = window.WFApp && WFApp.state && WFApp.state();
      const key = s && s.settings && s.settings.apiKey;
      if (key) h.Authorization = 'Bearer ' + key;
    } catch (e) { /* ignore */ }
    return h;
  }

  /** 新 REST：统一 { ok, data?, error? }。publish 勿走此函数。 */
  function request(path, opts) {
    opts = opts || {};
    const method = (opts.method || 'GET').toUpperCase();
    const url = base() + path;
    const init = { method: method, headers: bearerHeaders(opts.headers) };
    if (opts.body != null && method !== 'GET' && method !== 'HEAD') {
      init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
    }
    return fetch(url, init).then(function (res) {
      return res.text().then(function (text) {
        let body = null;
        try { body = text ? JSON.parse(text) : null; } catch (e) { body = null; }
        if (!res.ok || (body && body.ok === false)) {
          const code = (body && body.error && body.error.code) || (res.status === 401 ? 'unauthorized' : res.status === 403 ? 'forbidden' : res.status === 404 ? 'not_found' : res.status === 409 ? 'conflict' : res.status === 422 ? 'validation_error' : 'internal');
          const message = (body && body.error && body.error.message) || (body && body.message) || ('HTTP ' + res.status);
          throw apiError(code, message, res.status);
        }
        if (body && typeof body.ok === 'boolean') return body.data;
        return body;
      });
    });
  }

  function ensureApp() {
    if (!window.WFApp) return Promise.reject(apiError('internal', 'WFApp 未加载'));
    return WFApp.load();
  }

  function encodeHost(host) {
    return encodeURIComponent(String(host || '').trim().toLowerCase());
  }

  /* —— Projects —— */
  function listProjects(q) {
    if (isMock()) {
      return ensureApp().then(function () {
        let ps = WFApp.projects();
        const needle = String(q || '').trim().toLowerCase();
        if (needle) {
          ps = ps.filter(function (p) {
            return (p.name || '').toLowerCase().indexOf(needle) >= 0 || (p.slug || '').toLowerCase().indexOf(needle) >= 0 || (p.id || '').toLowerCase().indexOf(needle) >= 0;
          });
        }
        return ps;
      });
    }
    const qs = q ? ('?q=' + encodeURIComponent(q)) : '';
    return request('/api/projects' + qs);
  }

  function getProject(id) {
    if (isMock()) {
      return ensureApp().then(function () {
        const p = WFApp.project(id);
        if (!p) throw apiError('not_found', '项目不存在', 404);
        return p;
      });
    }
    return request('/api/projects/' + encodeURIComponent(id));
  }

  function createProject(name) {
    name = String(name || '').trim();
    if (!name) return Promise.reject(apiError('validation_error', '项目名称不能为空', 422));
    if (isMock()) {
      return ensureApp().then(function () { return WFApp.createProject(name); });
    }
    return request('/api/projects', { method: 'POST', body: { name: name } });
  }

  function patchProject(id, body) {
    if (isMock()) {
      return ensureApp().then(function () {
        const p = WFApp.project(id);
        if (!p) throw apiError('not_found', '项目不存在', 404);
        if (body && body.name != null) p.name = String(body.name);
        if (body && body.slug != null) p.slug = String(body.slug).toLowerCase().replace(/[^\p{L}\p{N}-]+/gu, '-');
        if (body && body.delivery && typeof body.delivery === 'object') {
          p.delivery = Object.assign({}, p.delivery || {}, body.delivery);
        }
        WFApp.save();
        return p;
      });
    }
    return request('/api/projects/' + encodeURIComponent(id), { method: 'PATCH', body: body || {} });
  }

  function deleteProject(id) {
    if (isMock()) {
      return ensureApp().then(function () {
        if (!WFApp.project(id)) throw apiError('not_found', '项目不存在', 404);
        WFApp.removeProject(id);
        return { ok: true };
      });
    }
    return request('/api/projects/' + encodeURIComponent(id), { method: 'DELETE' }).then(function () { return { ok: true }; });
  }

  /* —— Project fonts / versions —— */
  function liveFontsNotReady() {
    return Promise.reject(apiError('not_implemented', 'vault 尚未提供项目字体 REST', 501));
  }

  function addFont(projectId, fontId, weights, subset) {
    projectId = String(projectId || '');
    fontId = String(fontId || '');
    weights = Array.isArray(weights) ? weights.slice() : [];
    if (!projectId || !fontId) return Promise.reject(apiError('validation_error', '项目或字体无效', 422));
    if (!weights.length) return Promise.reject(apiError('validation_error', '至少选择一个字重', 422));
    if (isMock()) {
      return ensureApp().then(function () {
        const p = WFApp.project(projectId);
        if (!p) throw apiError('not_found', '项目不存在', 404);
        WFApp.addFont(p, fontId, weights, subset || { mode: 'full' });
        return p;
      });
    }
    return liveFontsNotReady();
  }

  function removeFont(projectId, fontId) {
    projectId = String(projectId || '');
    fontId = String(fontId || '');
    if (!projectId || !fontId) return Promise.reject(apiError('validation_error', '项目或字体无效', 422));
    if (isMock()) {
      return ensureApp().then(function () {
        const p = WFApp.project(projectId);
        if (!p) throw apiError('not_found', '项目不存在', 404);
        if (!(p.fonts || []).some(function (f) { return f.fontId === fontId; })) {
          throw apiError('not_found', '项目中无此字体', 404);
        }
        WFApp.removeFont(p, fontId);
        return { ok: true };
      });
    }
    return liveFontsNotReady();
  }

  function removeWeight(projectId, fontId, weight) {
    projectId = String(projectId || '');
    fontId = String(fontId || '');
    weight = weight == null ? '' : String(weight);
    if (!projectId || !fontId || !weight) return Promise.reject(apiError('validation_error', '项目、字体或字重无效', 422));
    if (isMock()) {
      return ensureApp().then(function () {
        const p = WFApp.project(projectId);
        if (!p) throw apiError('not_found', '项目不存在', 404);
        if (!WFApp.removeWeight(p, fontId, weight)) {
          throw apiError('validation_error', '这款字至少要留一个字重', 422);
        }
        return { ok: true };
      });
    }
    return liveFontsNotReady();
  }

  function rollbackVersion(projectId, v) {
    projectId = String(projectId || '');
    v = parseInt(v, 10);
    if (!projectId || !v) return Promise.reject(apiError('validation_error', '项目或版本无效', 422));
    if (isMock()) {
      return ensureApp().then(function () {
        const p = WFApp.project(projectId);
        if (!p) throw apiError('not_found', '项目不存在', 404);
        const target = (p.versions || []).filter(function (x) { return x.v === v; })[0];
        if (!target) throw apiError('not_found', '版本不存在', 404);
        const restored = WFApp.rollback(p, v);
        return { ok: true, restored: !!restored, version: WFApp.currentVersion(p) };
      });
    }
    return Promise.reject(apiError('not_implemented', 'vault 尚未提供版本回滚 REST', 501));
  }

  /* —— Domains —— */
  function listDomains() {
    if (isMock()) {
      return ensureApp().then(function () {
        return WFApp.allDomains().map(function (d) {
          return Object.assign({}, d, {
            projectId: d.project && d.project.id,
            projectName: d.project && d.project.name
          });
        });
      });
    }
    return request('/api/domains');
  }

  function listProjectDomains(projectId) {
    if (isMock()) {
      return ensureApp().then(function () {
        const p = WFApp.project(projectId);
        if (!p) throw apiError('not_found', '项目不存在', 404);
        return (p.domains || []).slice();
      });
    }
    return request('/api/projects/' + encodeURIComponent(projectId) + '/domains');
  }

  function addDomain(projectId, host, method) {
    host = String(host || '').trim().toLowerCase();
    method = method || 'dns';
    if (isMock()) {
      return ensureApp().then(function () {
        const p = WFApp.project(projectId);
        if (!p) throw apiError('not_found', '项目不存在', 404);
        if (!WFApp.validHost(host)) throw apiError('validation_error', '域名格式不对', 422);
        if (!WFApp.addDomain(p, host, method)) throw apiError('conflict', '该项目下已有此域名', 409);
        return p.domains.filter(function (d) { return d.host === host; })[0];
      });
    }
    return request('/api/projects/' + encodeURIComponent(projectId) + '/domains', {
      method: 'POST',
      body: { host: host, method: method }
    });
  }

  function removeDomain(projectId, host) {
    host = String(host || '').trim().toLowerCase();
    if (isMock()) {
      return ensureApp().then(function () {
        const p = WFApp.project(projectId);
        if (!p) throw apiError('not_found', '项目不存在', 404);
        WFApp.removeDomain(p, host);
        return { ok: true };
      });
    }
    return request('/api/projects/' + encodeURIComponent(projectId) + '/domains/' + encodeHost(host), { method: 'DELETE' }).then(function () { return { ok: true }; });
  }

  /** POST …/verify → pending；生产探测 DNS/文件。mock 仅标记 pending。 */
  function verifyStart(projectId, host) {
    host = String(host || '').trim().toLowerCase();
    if (isMock()) {
      return ensureApp().then(function () {
        const p = WFApp.project(projectId);
        if (!p) throw apiError('not_found', '项目不存在', 404);
        const d = (p.domains || []).filter(function (x) { return x.host === host; })[0];
        if (!d) throw apiError('not_found', '域名不存在', 404);
        d._verifyPending = true;
        WFApp.save();
        return { status: 'pending', method: d.method || 'dns', checkAfterSec: 0, verified: !!d.verified };
      });
    }
    return request('/api/projects/' + encodeURIComponent(projectId) + '/domains/' + encodeHost(host) + '/verify', { method: 'POST' });
  }

  /** GET …/verify 轮询。mock：首次 poll 即置 verified（对齐原型「我已完成验证」）。 */
  function verifyPoll(projectId, host) {
    host = String(host || '').trim().toLowerCase();
    if (isMock()) {
      return ensureApp().then(function () {
        const p = WFApp.project(projectId);
        if (!p) throw apiError('not_found', '项目不存在', 404);
        const d = (p.domains || []).filter(function (x) { return x.host === host; })[0];
        if (!d) throw apiError('not_found', '域名不存在', 404);
        if (!d.verified) {
          WFApp.verifyDomain(p, host);
          delete d._verifyPending;
        }
        return {
          status: 'verified',
          verified: true,
          method: d.method || 'dns',
          checkedAt: new Date().toISOString(),
          detail: ''
        };
      });
    }
    return request('/api/projects/' + encodeURIComponent(projectId) + '/domains/' + encodeHost(host) + '/verify');
  }

  /** 点「我已完成验证」：start + poll（mock 立刻通过；live 按 checkAfterSec 轮询最多 ~2 分钟）。 */
  function verifyDomain(projectId, host) {
    return verifyStart(projectId, host).then(function (start) {
      const waitSec = (start && typeof start.checkAfterSec === 'number') ? start.checkAfterSec : 0;
      function once() {
        return verifyPoll(projectId, host).then(function (data) {
          if (data && data.status === 'pending') {
            return delay(Math.max(1000, (data.checkAfterSec || 5) * 1000)).then(once);
          }
          return data;
        });
      }
      if (waitSec > 0) return delay(waitSec * 1000).then(once);
      return once();
    });
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /* —— Uploads（init → binary → complete；mock 只存元数据，不进 vault） —— */
  const mockUploadTimers = {};

  function ymd(d) {
    const p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function findUpload(id) {
    const s = WFApp.state();
    return ((s && s.uploads) || []).filter(function (x) { return x.id === id; })[0] || null;
  }

  function listUploads() {
    if (isMock()) {
      return ensureApp().then(function () {
        const s = WFApp.state();
        return (s && s.uploads) ? s.uploads.slice() : [];
      });
    }
    return request('/api/uploads');
  }

  function getUpload(id) {
    if (isMock()) {
      return ensureApp().then(function () {
        const u = findUpload(id);
        if (!u) throw apiError('not_found', '上传不存在', 404);
        return Object.assign({}, u);
      });
    }
    return request('/api/uploads/' + encodeURIComponent(id));
  }

  function initUpload(body) {
    body = body || {};
    if (isMock()) {
      return ensureApp().then(function () {
        const s = WFApp.state();
        const name = String(body.name || '').trim();
        const family = String(body.family || '').trim().toLowerCase();
        const license = body.license || 'own';
        const files = Array.isArray(body.files) ? body.files : [];
        if (!name) throw apiError('validation_error', '字体名称不能为空', 422);
        if (!/^[a-z0-9-]+$/.test(family)) throw apiError('validation_error', '嵌入用名称格式不对', 422);
        if (!files.length) throw apiError('validation_error', '请选择字体文件', 422);
        if ((license === 'own' || license === 'bought') && !body.proof) {
          throw apiError('validation_error', '请附上授权证明', 422);
        }
        const cap = (s.plan && s.plan.quota && s.plan.quota.fonts) || 0;
        if (cap && (s.uploads || []).length >= cap) throw apiError('quota_exceeded', '已到字体配额', 422);
        const id = 'up-' + Date.now().toString(36);
        const weights = [];
        files.forEach(function (f) {
          const w = f.weight || 'Regular';
          if (weights.indexOf(w) === -1) weights.push(w);
        });
        const size = files.reduce(function (a, f) { return a + (Number(f.size) || 0); }, 0);
        const formats = [];
        files.forEach(function (f) {
          const ext = String(f.filename || '').split('.').pop().toLowerCase();
          if (ext && formats.indexOf(ext) === -1) formats.push(ext);
        });
        const glyphCount = Number(body.glyphCount) || Math.round(size / 320) || 0;
        const row = {
          id: id,
          name: name,
          family: family,
          weights: weights,
          glyphCount: glyphCount,
          format: formats.join('+') || 'ttf',
          size: size,
          license: license,
          licenseUrl: String(body.licenseUrl || '').trim(),
          proofName: (body.proof && body.proof.filename) || '',
          proofType: (body.proof && body.proof.contentType) || '',
          proofSize: (body.proof && body.proof.size) || 0,
          uploadedAt: new Date().toISOString(),
          status: 'pending_upload',
          review: { state: 'auto_pass', note: '', reviewedAt: null },
          projectId: body.projectId || '',
          _mockFiles: files.map(function (f) {
            return { filename: f.filename, size: f.size || 0, contentType: f.contentType || '', weight: f.weight || 'Regular', received: false };
          }),
          _mockProofReceived: false
        };
        s.uploads.unshift(row);
        WFApp.save();
        return {
          id: id,
          status: 'pending_upload',
          uploadUrls: files.map(function (f) {
            return {
              weight: f.weight || 'Regular',
              url: 'mock://upload/' + id + '/' + encodeURIComponent(f.weight || 'Regular'),
              headers: {}
            };
          }),
          proofUrl: body.proof ? ('mock://upload/' + id + '/proof') : null
        };
      });
    }
    return request('/api/uploads/init', { method: 'POST', body: body });
  }

  /** mock：只记元数据已收；live：PUT 直传。不声称二进制进了 vault。 */
  function putUploadBinary(url, blob, headers) {
    url = String(url || '');
    if (isMock() || url.indexOf('mock://') === 0) {
      return ensureApp().then(function () {
        const m = url.match(/^mock:\/\/upload\/([^/]+)\/(.+)$/);
        if (!m) throw apiError('validation_error', '无效的上传地址', 422);
        const u = findUpload(decodeURIComponent(m[1]));
        if (!u) throw apiError('not_found', '上传不存在', 404);
        const part = decodeURIComponent(m[2]);
        if (part === 'proof') {
          u._mockProofReceived = true;
        } else if (u._mockFiles) {
          u._mockFiles.forEach(function (f) {
            if (f.weight === part || encodeURIComponent(f.weight) === part) f.received = true;
          });
        }
        WFApp.save();
        return { ok: true, bytes: blob && blob.size != null ? blob.size : 0 };
      });
    }
    const h = Object.assign({}, headers || {});
    return fetch(url, { method: 'PUT', headers: h, body: blob }).then(function (res) {
      if (!res.ok) throw apiError('internal', '上传二进制失败 HTTP ' + res.status, res.status);
      return { ok: true };
    });
  }

  function scheduleMockReady(id) {
    if (mockUploadTimers[id]) clearTimeout(mockUploadTimers[id]);
    mockUploadTimers[id] = setTimeout(function () {
      try {
        if (!window.WFApp) return;
        const u = findUpload(id);
        if (!u || u.status !== 'processing') return;
        u.status = 'ready';
        u.review = u.review || { state: 'auto_pass', note: '', reviewedAt: null };
        u.review.reviewedAt = new Date().toISOString();
        delete u._mockFiles;
        delete u._mockProofReceived;
        WFApp.save();
      } catch (e) { /* ignore */ }
      delete mockUploadTimers[id];
    }, 900);
  }

  function completeUpload(id) {
    if (isMock()) {
      return ensureApp().then(function () {
        const u = findUpload(id);
        if (!u) throw apiError('not_found', '上传不存在', 404);
        if (u.status !== 'pending_upload' && u.status !== 'processing') {
          if (u.status === 'ready') return { id: id, status: 'ready' };
          throw apiError('validation_error', '当前状态无法 complete', 422);
        }
        u.status = 'processing';
        WFApp.save();
        scheduleMockReady(id);
        return { id: id, status: 'processing' };
      });
    }
    return request('/api/uploads/' + encodeURIComponent(id) + '/complete', { method: 'POST', body: {} });
  }

  /** 轮询至 ready / rejected；mock 约 1s。 */
  function waitUploadReady(id, maxMs) {
    maxMs = maxMs || 8000;
    const start = Date.now();
    function once() {
      return getUpload(id).then(function (u) {
        if (u.status === 'ready' || u.status === 'rejected') return u;
        if (Date.now() - start > maxMs) return u;
        return delay(350).then(once);
      });
    }
    return once();
  }

  /**
   * 便捷：init →（mock）记文件名/体积 → complete → 等到 ready。
   * opts: { name, family, license, licenseUrl, files:[{file,weight,glyphs}], proof:File|null, projectId, glyphCount }
   */
  function runUpload(opts) {
    opts = opts || {};
    const files = (opts.files || []).map(function (f) {
      const file = f.file || f;
      return {
        filename: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream',
        weight: f.weight || 'Regular',
        _blob: file
      };
    });
    const proof = opts.proof || null;
    const body = {
      name: opts.name,
      family: opts.family,
      license: opts.license,
      licenseUrl: opts.licenseUrl || '',
      files: files.map(function (f) {
        return { filename: f.filename, size: f.size, contentType: f.contentType, weight: f.weight };
      }),
      proof: proof ? { filename: proof.name, size: proof.size, contentType: proof.type || 'application/octet-stream' } : null,
      projectId: opts.projectId || '',
      glyphCount: opts.glyphCount || 0
    };
    return initUpload(body).then(function (init) {
      const puts = (init.uploadUrls || []).map(function (slot, i) {
        return putUploadBinary(slot.url, files[i] && files[i]._blob);
      });
      if (init.proofUrl && proof) puts.push(putUploadBinary(init.proofUrl, proof));
      return Promise.all(puts).then(function () {
        return completeUpload(init.id);
      }).then(function () {
        return waitUploadReady(init.id);
      });
    });
  }

  function deleteUpload(id) {
    if (isMock()) {
      return ensureApp().then(function () {
        if (!findUpload(id)) throw apiError('not_found', '上传不存在', 404);
        WFApp.removeUpload(id);
        return { ok: true };
      });
    }
    return request('/api/uploads/' + encodeURIComponent(id), { method: 'DELETE' }).then(function () { return { ok: true }; });
  }

  /* —— Usage —— */
  function buildUsageMock(params) {
    params = params || {};
    const range = Number(params.range) || 30;
    const scale = range / 30;
    const st = WFApp.statusTotals();
    const projectId = params.projectId || '';
    const fontId = params.fontId || '';
    const groupBy = params.groupBy || 'project';
    let projects = WFApp.projects();
    if (projectId) projects = projects.filter(function (p) { return p.id === projectId; });

    let requests = 0;
    let bytes = 0;
    const projectGroups = [];
    projects.forEach(function (p) {
      const r = Math.round((p.usage.requests30d || 0) * scale);
      const b = Math.round((p.usage.bytes30d || 0) * scale);
      requests += r; bytes += b;
      projectGroups.push({
        key: p.id,
        label: p.name,
        requests: r,
        bytes: b,
        hitRate: (p.usage.perf && p.usage.perf.hitRate) || 0
      });
    });

    let byFont = WFApp.usageByFont().map(function (r) {
      const weights = {};
      Object.keys(r.weights || {}).forEach(function (w) {
        weights[w] = Math.round((r.weights[w] || 0) * scale);
      });
      return {
        fontId: r.fontId,
        requests30d: Math.round(r.requests30d * scale),
        bytes30d: Math.round(r.bytes30d * scale),
        weights: weights,
        projects: (r.projects || []).map(function (x) {
          return {
            projectId: x.p && x.p.id,
            name: x.p && x.p.name,
            requests30d: Math.round(x.requests30d * scale),
            bytes30d: Math.round(x.bytes30d * scale),
            weights: x.weights || {}
          };
        })
      };
    });
    if (fontId) byFont = byFont.filter(function (r) { return r.fontId === fontId; });
    if (projectId) {
      byFont = byFont.map(function (r) {
        const hits = (r.projects || []).filter(function (x) { return x.projectId === projectId; });
        if (!hits.length) return null;
        return Object.assign({}, r, {
          requests30d: hits.reduce(function (a, x) { return a + x.requests30d; }, 0),
          bytes30d: hits.reduce(function (a, x) { return a + x.bytes30d; }, 0),
          projects: hits
        });
      }).filter(Boolean);
    }
    if (fontId && byFont.length) {
      requests = byFont.reduce(function (a, r) { return a + r.requests30d; }, 0);
      bytes = byFont.reduce(function (a, r) { return a + r.bytes30d; }, 0);
    }

    const domainGroups = [];
    WFApp.allDomains().filter(function (d) { return d.verified; }).forEach(function (d) {
      if (projectId && d.project && d.project.id !== projectId) return;
      domainGroups.push({
        key: d.host,
        label: d.host,
        projectId: d.project && d.project.id,
        projectName: d.project && d.project.name,
        requests: Math.round((d.requests30d || 0) * scale),
        bytes: Math.round((d.bytes30d || 0) * scale)
      });
    });
    domainGroups.sort(function (a, b) { return b.requests - a.requests; });

    let groups = projectGroups;
    if (groupBy === 'domain') groups = domainGroups;
    else if (groupBy === 'font') {
      groups = byFont.map(function (r) {
        const meta = WFApp.fontMeta(r.fontId);
        return {
          key: r.fontId,
          label: meta ? meta.name : r.fontId,
          requests: r.requests30d,
          bytes: r.bytes30d,
          weights: r.weights,
          projects: r.projects
        };
      });
    } else if (groupBy === 'status') {
      groups = [
        { key: '200', label: '成功下发', requests: Math.round((st['200'] || 0) * scale) },
        { key: '304', label: '缓存命中', requests: Math.round((st['304'] || 0) * scale) },
        { key: '403', label: '被拒', requests: Math.round((st['403'] || 0) * scale) }
      ];
    }

    const blocked = WFApp.blockedHosts().reduce(function (a, b) {
      if (projectId && b.project && b.project.id !== projectId) return a;
      return a + (b.requests30d || 0);
    }, 0);
    const s = WFApp.state();
    const seedKey = 'usage-' + range + '-' + (projectId || 'all') + '-' + (fontId || 'all');
    const seriesReqs = WFApp.series(seedKey, range, requests || 1);
    const to = new Date();
    const from = new Date(to.getTime() - (range - 1) * 86400000);

    return {
      range: range,
      totals: {
        requests: requests,
        bytes: bytes,
        quotaGB: (s.plan && s.plan.quota && s.plan.quota.trafficGB) || 200,
        blocked: Math.round(blocked * scale)
      },
      status: {
        '200': Math.round((st['200'] || 0) * scale),
        '304': Math.round((st['304'] || 0) * scale),
        '403': Math.round((st['403'] || 0) * scale)
      },
      series: { from: ymd(from), to: ymd(to), requests: seriesReqs },
      groups: groups,
      byFont: byFont,
      byDomain: domainGroups,
      perf: projects.map(function (p) {
        const pf = p.usage.perf || {};
        return { projectId: p.id, name: p.name, fcpMs: pf.fcpMs || 0, fontLoadMs: pf.fontLoadMs || 0, hitRate: pf.hitRate || 0 };
      })
    };
  }

  function qsFromParams(params) {
    const q = [];
    Object.keys(params || {}).forEach(function (k) {
      if (params[k] != null && params[k] !== '') q.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    });
    return q.length ? ('?' + q.join('&')) : '';
  }

  function getUsage(params) {
    params = params || {};
    if (isMock()) {
      return ensureApp().then(function () { return buildUsageMock(params); });
    }
    return request('/api/usage' + qsFromParams(params));
  }

  function getUsageSeries(params) {
    params = params || {};
    if (isMock()) {
      return getUsage(params).then(function (u) { return u.series; });
    }
    return request('/api/usage/series' + qsFromParams(params));
  }

  function listBlocked() {
    if (isMock()) {
      return ensureApp().then(function () {
        return WFApp.blockedHosts().map(function (b) {
          return Object.assign({}, b, {
            projectId: b.project && b.project.id,
            projectName: b.project && b.project.name
          });
        });
      });
    }
    return request('/api/usage/blocked');
  }

  /* —— Team —— */
  function applyTeamLocal(members) {
    return ensureApp().then(function () {
      const s = WFApp.state();
      if (s) {
        s.team = Array.isArray(members) ? members.slice() : [];
        if (typeof WFApp.save === 'function') WFApp.save();
      }
      return (s && s.team) || [];
    });
  }

  /** 现网预计算包 CSS 体积（Content-Length 清单） */
  function estimateFont(fontId, subset) {
    const id = encodeURIComponent(String(fontId || '').trim());
    const qs = subset ? ('?subset=' + encodeURIComponent(subset)) : '';
    return request('/api/fonts/' + id + '/estimate' + qs).then(function (data) {
      return data || null;
    }).catch(function () { return null; });
  }

    function listTeam() {
    if (isMock()) {
      return ensureApp().then(function () {
        const s = WFApp.state();
        return ((s && s.team) || []).slice();
      });
    }
    return request('/api/team').then(function (data) {
      const members = (data && data.members) || [];
      return applyTeamLocal(members).then(function () { return members.slice(); });
    });
  }

  function inviteMember(email, role) {
    email = String(email || '').trim().toLowerCase();
    role = role || 'editor';
    if (!email) return Promise.reject(apiError('validation_error', '邮箱不能为空', 422));
    if (isMock()) {
      return ensureApp().then(function () {
        const result = WFApp.inviteMember(email, role);
        if (result === 'full') throw apiError('quota_exceeded', '席位已满，专业版最多 5 人', 422);
        if (!result) throw apiError('conflict', '该邮箱已在团队中', 409);
        const s = WFApp.state();
        return (s.team || []).filter(function (m) { return m.email === email; })[0];
      });
    }
    return request('/api/team', { method: 'POST', body: { email: email, role: role } }).then(function (member) {
      return listTeam().then(function () { return member; });
    });
  }

  function setMemberRole(id, role) {
    id = String(id || '');
    role = String(role || '');
    if (!id || !role) return Promise.reject(apiError('validation_error', '成员或角色无效', 422));
    if (isMock()) {
      return ensureApp().then(function () {
        const s = WFApp.state();
        const m = ((s && s.team) || []).filter(function (x) { return x.id === id; })[0];
        if (!m) throw apiError('not_found', '成员不存在', 404);
        if (m.role === 'owner') throw apiError('forbidden', '不能变更所有者角色', 403);
        if (role === 'owner') throw apiError('validation_error', '不能直接设为所有者', 422);
        WFApp.setMemberRole(id, role);
        return ((WFApp.state().team) || []).filter(function (x) { return x.id === id; })[0];
      });
    }
    return request('/api/team/' + encodeURIComponent(id), { method: 'PATCH', body: { role: role } }).then(function (member) {
      return listTeam().then(function () { return member; });
    });
  }

  function removeMember(id) {
    id = String(id || '');
    if (!id) return Promise.reject(apiError('validation_error', '成员无效', 422));
    if (isMock()) {
      return ensureApp().then(function () {
        const s = WFApp.state();
        const m = ((s && s.team) || []).filter(function (x) { return x.id === id; })[0];
        if (!m) throw apiError('not_found', '成员不存在', 404);
        if (!WFApp.removeMember(id)) throw apiError('forbidden', '无法移除该成员', 403);
        return { ok: true };
      });
    }
    return request('/api/team/' + encodeURIComponent(id), { method: 'DELETE' }).then(function () {
      return listTeam().then(function () { return { ok: true }; });
    });
  }

  /* —— Settings / Account —— */
  function liveSettingsNotReady() {
    return Promise.reject(apiError('not_implemented', 'vault 尚未提供设置 REST', 501));
  }

  function getSettings() {
    if (isMock()) {
      return ensureApp().then(function () {
        const s = WFApp.state();
        return Object.assign({}, (s && s.settings) || {});
      });
    }
    return liveSettingsNotReady();
  }

  function patchSettings(body) {
    body = body || {};
    if (isMock()) {
      return ensureApp().then(function () {
        const s = WFApp.state();
        if (!s || !s.settings) throw apiError('internal', '设置不可用');
        const changed = [];
        if (body.display != null) { s.settings.display = String(body.display); changed.push('加载策略'); }
        if (body.subset != null) { s.settings.subset = String(body.subset); changed.push('字符包'); }
        if (body.cdn != null) { s.settings.cdn = String(body.cdn); changed.push('节点'); }
        if (body.preload != null) { s.settings.preload = !!body.preload; changed.push('提前加载'); }
        if (changed.length) {
          WFApp.log('更新设置', changed.join(' · '));
          WFApp.save();
        }
        return Object.assign({}, s.settings);
      });
    }
    return liveSettingsNotReady();
  }

  function rotateApiKey() {
    if (isMock()) {
      return ensureApp().then(function () {
        if (!WFApp.mintApiKeyAsync) throw apiError('internal', '无法生成密钥');
        return WFApp.mintApiKeyAsync('live').then(function (k) {
          const s = WFApp.state();
          s.settings.apiKey = k;
          s.settings.apiKeyCreatedAt = new Date().toISOString();
          WFApp.log('轮换 API 密钥', '');
          WFApp.save();
          return { apiKey: k, apiKeyCreatedAt: s.settings.apiKeyCreatedAt };
        });
      });
    }
    return liveSettingsNotReady();
  }

  function updateAccount(body) {
    body = body || {};
    if (isMock()) {
      return Promise.resolve().then(function () {
        if (!window.WFChrome || !WFChrome.login) throw apiError('internal', 'WFChrome 未加载');
        const u = WFChrome.user() || {};
        const name = body.name != null ? String(body.name).trim() : (u.name || '');
        if (!name) throw apiError('validation_error', '显示名不能为空', 422);
        WFChrome.login({ name: name, email: u.email || body.email });
        return WFChrome.user();
      });
    }
    return Promise.reject(apiError('not_implemented', 'vault 尚未提供账号 REST', 501));
  }

  function listAudit(limit) {
    limit = Number(limit) || 10;
    if (isMock()) {
      return ensureApp().then(function () {
        const s = WFApp.state();
        return ((s && s.audit) || []).slice(0, limit);
      });
    }
    return Promise.reject(apiError('not_implemented', 'vault 尚未提供审计 REST', 501));
  }

  /**
   * EXISTING publish：旧信封 { status, data, message }，短期豁免 { ok, error }。
   * body 应为 projectManifest(p)。
   */
  function publish(manifest) {
    if (!manifest || !manifest.slug) return Promise.reject(apiError('validation_error', '项目 slug 为空', 422));
    if (!manifest.fonts || !manifest.fonts.length) return Promise.reject(apiError('validation_error', '项目里还没有字体', 422));
    const headers = bearerHeaders();
    return fetch(base() + '/api/projects/publish', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(manifest)
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok || (body && body.status === 'fail')) {
          const err = new Error((body && body.message) || ('HTTP ' + res.status));
          err.status = res.status;
          err.body = body;
          err.code = res.status === 401 ? 'unauthorized' : res.status === 403 ? 'forbidden' : 'internal';
          throw err;
        }
        return body;
      });
    });
  }

  function publishProject(p) {
    if (isMock() && window.WFApp && WFApp.projectManifest) {
      /* mock 仍走真实 publish 请求（与现网一致）；无网时由调用方 catch */
      return (WFApp.ensureVaultApiKey ? WFApp.ensureVaultApiKey() : Promise.resolve()).then(function () {
        return publish(WFApp.projectManifest(p));
      });
    }
    if (window.WFApp && WFApp.publishProject) return WFApp.publishProject(p);
    return Promise.reject(apiError('internal', '无法发布'));
  }


  /* —— GAP-FILL T1/T3 mock（Foundry 四布尔终稿；live → 501） —— */
  const CERT_KEY = 'wf-mock-certs';
  const GAP_VER = '20260927gap5c';

  function loadCerts() {
    try { return JSON.parse(localStorage.getItem(CERT_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveCerts(list) {
    try { localStorage.setItem(CERT_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }
  function currentUserId() {
    const u = (window.WFChrome && WFChrome.user && WFChrome.user()) || {};
    return String(u.email || u.name || 'demo@local');
  }

  /** Mock seed fonts covering OFL / cite-closed / FLOP / unverified */
  const LICENSE_SEEDS = {
    Ckbf: {
      fontId: '9254fc10-768b-4828-bc27-5ce76e9d974e',
      normalizedName: 'Ckbf',
      name: '偏歪的黑趣体',
      license_label: 'ofl_ok',
      license_spdx: 'OFL-1.1',
      license_verified: true,
      license_url: 'https://feicode.com/Windfonts/font-licenses/src/branch/main/licenses/Ckbf/LICENSE',
      service_status: 'normal',
      cite_policy: 'open',
      cdnHardBlock: false,
      bools: { previewOk: true, designOk: true, webfontCdnOk: true, appEmbedOk: true },
      evidence: {
        previewOk: 'OFL 允许站内预览',
        designOk: 'OFL 允许设计稿/印刷画面',
        webfontCdnOk: '已核 OFL · 可公共 CDN',
        appEmbedOk: 'OFL 允许程序嵌入（须保留声明）'
      },
      modify: true,
      redistribute: true,
      modify_reason: 'OFL 允许改字再分发，须换名并保留声明',
      redistribute_reason: 'OFL 允许再分发（不得单独售卖字体文件）'
    },
    Jlyhmht: {
      fontId: 'mock-jlyhmht',
      normalizedName: 'Jlyhmht',
      name: '吉利银河美好体',
      license_label: 'cite_closed',
      license_spdx: null,
      license_verified: true,
      license_url: 'https://wenfeng.org/license',
      service_status: 'restricted',
      cite_policy: 'cite_closed',
      cdnHardBlock: false,
      bools: { previewOk: true, designOk: true, webfontCdnOk: false, appEmbedOk: false },
      evidence: {
        previewOk: '站内预览开放',
        designOk: '厂商允许设计/画面商用（非网页字体）',
        webfontCdnOk: '禁网页嵌入 · 对外引用未开放',
        appEmbedOk: '原文未授 App 内置'
      },
      modify: false,
      redistribute: false,
      modify_reason: '品牌协议限制改字',
      redistribute_reason: '禁止再分发字体文件'
    },
    Shmgt: {
      fontId: 'mock-shmgt',
      normalizedName: 'Shmgt',
      name: '上海摩登体',
      license_label: 'cite_closed',
      license_spdx: null,
      license_verified: true,
      license_url: 'https://wenfeng.org/license',
      service_status: 'restricted',
      cite_policy: 'cite_closed',
      cdnHardBlock: false,
      bools: { previewOk: true, designOk: true, webfontCdnOk: false, appEmbedOk: true },
      evidence: {
        previewOk: '站内预览开放',
        designOk: '摩登类常授设计画面',
        webfontCdnOk: '禁网页嵌入 · 对外引用未开放',
        appEmbedOk: '另授 App 内置（视证书）'
      },
      modify: false,
      redistribute: false,
      modify_reason: '品牌协议限制改字',
      redistribute_reason: '禁止再分发字体文件'
    },
    SmartFontUI: {
      fontId: 'mock-smartfontui',
      normalizedName: 'SmartFontUI',
      name: '03スマートフォントUI / SmartFontUI',
      license_label: 'flop',
      license_spdx: null,
      license_verified: true,
      license_url: 'https://flopdesign.com/',
      service_status: 'normal',
      cite_policy: 'open',
      cdnHardBlock: true,
      bools: { previewOk: true, designOk: null, webfontCdnOk: false, appEmbedOk: false },
      evidence: {
        previewOk: '目录对照可预览',
        designOk: '画面商用见 FLOP 原文，不画绿灯',
        webfontCdnOk: 'FLOP 附加：禁网页字体 / 上传服务器',
        appEmbedOk: 'FLOP 附加：禁 App·游戏内置'
      },
      modify: false,
      redistribute: false,
      modify_reason: 'FLOP / IPA 附加限制',
      redistribute_reason: '禁止再分发网页字体',
      flop: {
        cdn_forbidden: true,
        cdnHardBlock: true,
        cdnStatus: 'blocked_flop',
        reason_code: 'flop_no_webfont',
        reason_label: '协议禁止网页字体分发',
        css_would: '403',
        cta: 'blocked'
      }
    },
    Xwszh: {
      fontId: 'cb020f3b-1767-4859-8afa-ced71d7896e4',
      normalizedName: 'Xwszh',
      name: '霞鹜尚智黑',
      license_label: 'flop_inherited',
      license_spdx: 'OFL-1.1',
      license_verified: false,
      license_url: '',
      service_status: 'normal',
      cite_policy: 'open',
      cdnHardBlock: true,
      bools: { previewOk: true, designOk: null, webfontCdnOk: false, appEmbedOk: false },
      evidence: {
        previewOk: '站内可预览',
        designOk: '继承上游 SmartFontUI · 见原文',
        webfontCdnOk: '继承上游 FLOP 硬拒',
        appEmbedOk: '继承上游禁 App 内置'
      },
      modify: true,
      redistribute: true,
      modify_reason: '下游 OFL 派生（改名义务）',
      redistribute_reason: 'OFL 再分发义务；公共 CDN 仍硬拒',
      flop: {
        cdn_forbidden: true,
        cdnHardBlock: true,
        cdnStatus: 'blocked_flop',
        reason_code: 'flop_no_webfont',
        reason_label: '协议禁止网页字体分发（继承 SmartFontUI）',
        css_would: '403',
        cta: 'blocked',
        upstream: 'SmartFontUI'
      }
    },
    Albbpht: {
      fontId: '7fdcfd07-864d-49a1-8727-b51d78316e0b',
      normalizedName: 'Albbpht',
      name: '阿里巴巴普惠体',
      license_label: 'brand_terms',
      license_spdx: null,
      license_verified: false,
      license_url: 'https://feicode.com/Windfonts/font-licenses/src/branch/main/licenses/Albbpht/LICENSE',
      service_status: 'normal',
      cite_policy: 'open',
      cdnHardBlock: false,
      bools: { previewOk: true, designOk: null, webfontCdnOk: null, appEmbedOk: null },
      evidence: {
        previewOk: '可预览对照',
        designOk: '待核实 · 不得绿灯',
        webfontCdnOk: '待核实 · 不得绿灯',
        appEmbedOk: '待核实 · 不得绿灯'
      },
      modify: false,
      redistribute: false,
      modify_reason: '待核实',
      redistribute_reason: '待核实'
    }
  };

  const FLOP_LIST_V1 = [
    { font: 'SmartFontUI', name: '03スマートフォントUI', reason_code: 'flop_no_webfont' },
    { font: 'YasashisaGothic', name: 'やさしさゴシック Bold V2', reason_code: 'flop_no_webfont' },
    { font: 'SoukouMincho', name: '装甲明朝', reason_code: 'flop_no_webfont' },
    { font: 'TetsubinGothic', name: 'Tetsubin Gothic', reason_code: 'flop_no_webfont' },
    { font: 'ReallyScaryMinchotai', name: 'Really Scary Minchotai', reason_code: 'flop_no_webfont' },
    { font: 'Xwszh', name: '霞鹜尚智黑', reason_code: 'flop_no_webfont', note: 'inherits SmartFontUI' }
  ];

  const LICENSE_TYPES = [
    { id: 'ofl_ok', label: '宽松 · OFL', summary: '多数商业项目可用；改字再分发须换名并保留声明。', previewOk: true, designOk: true, webfontCdnOk: true, appEmbedOk: true },
    { id: 'apache_ok', label: '宽松 · Apache/MIT', summary: '可 CDN；标签与 OFL 隔离展示。', previewOk: true, designOk: true, webfontCdnOk: true, appEmbedOk: true },
    { id: 'free_commercial', label: '厂商免费商用', summary: '已核厂商声明；禁网页嵌入则走引用未开放。', previewOk: true, designOk: true, webfontCdnOk: true, appEmbedOk: null },
    { id: 'cite_closed', label: '受限 · 引用未开放', summary: '站内可预览；对外网页引用须证书（账号×字体），不开公共 CDN。', previewOk: true, designOk: null, webfontCdnOk: false, appEmbedOk: null },
    { id: 'flop', label: 'FLOP · 禁网页字体', summary: '协议禁止网页字体与 App 内置；无证书开公共 CDN。', previewOk: true, designOk: null, webfontCdnOk: false, appEmbedOk: false },
    { id: 'ipa', label: 'IPA Font License', summary: '默认停公共 CDN（Art.3）；有 FLOP 附加则硬拒。', previewOk: true, designOk: true, webfontCdnOk: false, appEmbedOk: false },
    { id: 'brand_terms', label: '品牌协议 / 待核实', summary: '须读原文；未核不得绿灯。', previewOk: true, designOk: null, webfontCdnOk: null, appEmbedOk: null }
  ];

  /** Seeker T2 SoT · js/mock/tickets.json（001 FLOP ≠ 002 cite；003 ops GREEN） */
  const MOCK_TICKETS = [
    {
      id: "WF-GAPFILL-BOOT",
      title: "文风三轨缺口补齐启动（授权查询 / 工单态 / 制作硬闸）",
      track: "T1|T2|T3",
      state: "ingesting",
      owners: {
        bot: "seat-open-2026-09-27",
        foundry: "T1-a+T3-a-done",
        seeker: "T2-sample-tickets-done",
        pro: "gap5-P1-polish-done",
        depot: "standby-T3-c",
        ops: "standby-probe"
      },
      refs: {
        font: "",
        tip: "gap4",
        oss_metadata_version: "",
        pr: "",
        docs: [
          "/workspace/windfonts-research/GAP-FILL-3TRACK-2026-09-27.md",
          "/workspace/windfonts-research/CONTRACTS-FOR-PRO-2026-09-27.md",
          "/workspace/windfonts-research/FOUNDRY-ACCEPT-3TRACK-2026-09-27.md",
          "/workspace/windfonts-research/T1-a-PURPOSE-FOUR-BOOLS-2026-09-27.md",
          "/workspace/windfonts-research/T3-a-FLOP-NO-WEBFONT-LIST-v1-2026-09-27.md"
        ],
        lab_tip: "46d52e9",
        hotReload: "?v=20260927gap5c",
        sample_tickets: ["WF-20260927-001", "WF-20260927-002", "WF-20260927-003"]
      },
      blockers: [
        "vault font-certs live API still Feng/Bot — mock only",
        "P0-3 FLOP hard gate vault+Depot — Bot CDN gate (held)",
        "P0-4 cn-font-split shelf trial — Bot CDN gate (held)"
      ],
      updated: "2026-09-27T18:49:00+08:00",
      gateStatus: "pass_hang",
      ingestStatus: "ingesting",
      cdnStatus: "n/a",
      analysisStatus: "n/a",
      hotReload: "?v=20260927gap5c",
      opsProbe: "n/a",
      ownerSeat: "Pro"
    },
    {
      id: "WF-20260927-001",
      title: "SmartFontUI · FLOP 禁网页字体（示例·看板挂板）",
      track: "T3|T1",
      state: "blocked",
      huntId: "",
      gateId: "T3-a-FLOP-NO-WEBFONT-LIST-v1",
      gateStatus: "pass_hang",
      ingestStatus: "cataloged",
      cdnStatus: "blocked_flop",
      analysisStatus: "n/a",
      hotReload: "",
      opsProbe: "n/a",
      ownerSeat: "Foundry",
      font: {
        display: "03スマートフォントUI / SmartFontUI",
        normalized: "SmartFontUI",
        slug: "smartfontui"
      },
      license: {
        cdnHardBlock: true,
        cdn_forbidden: true,
        reason_code: "flop_no_webfont",
        reason_label: "协议禁止网页字体分发",
        cite_policy: "open",
        service_status: "normal",
        license_verified: true,
        previewOk: true,
        designOk: null,
        webfontCdnOk: false,
        appEmbedOk: false,
        cta: "blocked",
        vendor: "flopdesign"
      },
      refs: {
        font: "SmartFontUI",
        tip: "",
        oss_metadata_version: "",
        pr: "",
        docs: [
          "/workspace/windfonts-research/T3-a-FLOP-NO-WEBFONT-LIST-v1-2026-09-27.md",
          "/workspace/windfonts-research/T1-a-PURPOSE-FOUR-BOOLS-2026-09-27.md",
          "/workspace/windfonts-research/CONTRACTS-FOR-PRO-2026-09-27.md"
        ],
        inherits_to: ["Xwszh"]
      },
      blockers: [
        "cdnHardBlock — Depot 拒传 fonts-packages/SmartFontUI",
        "/api/css → 403 reason_code=flop_no_webfont",
        "详情 CTA=blocked；证书也不能开公共 CDN"
      ],
      notes: "样例：FLOP 桶。吉利/摩登勿并入。Xwszh 继承本硬闸。",
      updated: "2026-09-27T18:48:00+08:00"
    },
    {
      id: "WF-20260927-002",
      title: "吉利银河美好体 · 引用未开放（示例·看板挂板）",
      track: "T1|T2",
      state: "restricted",
      huntId: "",
      gateId: "GATE-CJK-github-r6-reopen-geely-modern",
      gateStatus: "pass_hang",
      ingestStatus: "cataloged",
      cdnStatus: "blocked_cite",
      analysisStatus: "n/a",
      hotReload: "",
      opsProbe: "n/a",
      ownerSeat: "Pro",
      font: {
        display: "吉利银河美好体",
        normalized: "Jlyhmht",
        slug: "jlyhmht"
      },
      license: {
        cdnHardBlock: false,
        cdn_forbidden: false,
        reason_code: "cite_closed",
        reason_label: "对外引用未开放，请上传授权证书",
        cite_policy: "cite_closed",
        service_status: "restricted",
        license_verified: true,
        previewOk: true,
        designOk: null,
        webfontCdnOk: false,
        appEmbedOk: null,
        cta: "upload_cert",
        sibling_example: "Shmgt / 上海摩登体（同轨）"
      },
      cert: {
        path: "account×font only",
        status: "none",
        unlocks: "approved → 该账号×该款 cite；永不解锁公共 fonts-packages CDN"
      },
      refs: {
        font: "Jlyhmht",
        tip: "",
        oss_metadata_version: "",
        pr: "",
        docs: [
          "/workspace/windfonts-research/T1-a-PURPOSE-FOUR-BOOLS-2026-09-27.md",
          "/workspace/windfonts-research/CONTRACTS-FOR-PRO-2026-09-27.md",
          "/workspace/windfonts-research/FOUNDRY-ACCEPT-3TRACK-2026-09-27.md"
        ]
      },
      blockers: [
        "站级 CDN 永不因证书打开（Bot 红线）",
        "Pro T1-d：证书 mock 状态机 pending→approved",
        "看板须与 FLOP 分行：cta=upload_cert 非 blocked"
      ],
      notes: "样例：引用未开放桶。不进 FLOP。摩登同 schema 换 normalized=Shmgt。",
      updated: "2026-09-27T18:48:00+08:00"
    },
    {
      id: "WF-20260927-003",
      title: "Ckbf · OFL 试点棒 · 探活绿（示例·看板挂板）",
      track: "T3|T2",
      state: "live",
      huntId: "",
      gateId: "sample-ofl-ckbf",
      gateStatus: "pass_hang",
      ingestStatus: "vaulted",
      cdnStatus: "uploaded",
      analysisStatus: "merged",
      hotReload: "?v=20260927ckbf-demo",
      opsProbe: "GREEN",
      ownerSeat: "Bot",
      font: {
        display: "Ckbf（OFL 三态种子）",
        normalized: "Ckbf",
        slug: "ckbf"
      },
      license: {
        cdnHardBlock: false,
        cdn_forbidden: false,
        reason_code: null,
        reason_label: null,
        cite_policy: "open",
        service_status: "normal",
        license_verified: true,
        previewOk: true,
        designOk: true,
        webfontCdnOk: true,
        appEmbedOk: true,
        cta: "embed",
        license_spdx: "OFL-1.1"
      },
      split: {
        matrix: ["full", "zh-common", "zh", "en"],
        oss_prefix: "fonts-packages/Ckbf/",
        css_family: "wenfeng-ckbf",
        split_status: "done",
        notes: ["样例数据：示意 Ops GREEN 回写；非现网承诺"]
      },
      refs: {
        font: "Ckbf",
        tip: "sample-ofl-green",
        oss_metadata_version: "SAMPLE",
        pr: "",
        docs: [
          "/workspace/windfonts-research/CONTRACTS-FOR-PRO-2026-09-27.md",
          "/workspace/windfonts-research/GAP-FILL-3TRACK-2026-09-27.md",
          "/workspace/windfonts-research/FOUNDRY-ACCEPT-3TRACK-2026-09-27.md"
        ]
      },
      blockers: [],
      notes: "样例：完整通路终点。真实 Ckbf 上 CDN 仍要 Bot 分闸；本文件只给 Pro 挂板过滤/着色。",
      updated: "2026-09-27T18:48:00+08:00"
    }
  ];

  const STANDARD_BARS = {
    Ibmps: {
      font: 'Ibmps',
      ticket_id: 'WF-20260927-010',
      matrix: ['full', 'zh-common', 'zh', 'en'],
      oss_prefix: 'fonts-packages/Ibmps/',
      css_family: 'wenfeng-ibmps',
      tip: 'v=20260926a',
      oss_metadata_version: '20260926a',
      split_status: 'done',
      notes: ['试点标准棒只读卡']
    },
    Ckbf: {
      font: 'Ckbf',
      ticket_id: 'WF-20260927-003',
      matrix: ['full', 'zh-common', 'zh', 'en'],
      oss_prefix: 'fonts-packages/Ckbf/',
      css_family: 'wenfeng-ckbf',
      tip: 'v=20260927ckbf-demo',
      oss_metadata_version: 'SAMPLE',
      split_status: 'done',
      notes: ['样例 Ops GREEN 挂板；非现网承诺']
    },
    SmartFontUI: {
      font: 'SmartFontUI',
      ticket_id: 'WF-20260927-001',
      matrix: ['full', 'zh-common', 'zh', 'en'],
      oss_prefix: 'fonts-packages/SmartFontUI/',
      css_family: 'wenfeng-smartfontui',
      tip: '',
      oss_metadata_version: '',
      split_status: 'failed',
      notes: ['FLOP 硬拒 · 拒传 fonts-packages']
    }
  };

  function resolveSeed(q) {
    const key = String(q || '').trim();
    if (!key) return null;
    if (LICENSE_SEEDS[key]) return LICENSE_SEEDS[key];
    const lower = key.toLowerCase();
    let k;
    for (k in LICENSE_SEEDS) {
      if (!Object.prototype.hasOwnProperty.call(LICENSE_SEEDS, k)) continue;
      const s = LICENSE_SEEDS[k];
      if (String(s.fontId) === key) return s;
      if (String(s.normalizedName).toLowerCase() === lower) return s;
      if (String(s.name).indexOf(key) !== -1) return s;
    }
    return null;
  }

  function findCert(fontId) {
    const uid = currentUserId();
    return loadCerts().filter(function (c) {
      return c.user_id === uid && (c.font_id === fontId || c.normalizedName === fontId);
    }).sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); })[0] || null;
  }

  function ctaLabel(cta, cert) {
    if (cta === 'cert_pending') return '审核中';
    if (cta === 'connect' && cert && cert.status === 'approved') return '账号引用已开';
    if (cta === 'connect') return '立即接入';
    if (cta === 'upload_cert') return '上传证书';
    if (cta === 'read_license') return '阅读原文';
    if (cta === 'blocked') return '不可接入';
    return cta;
  }

  function evaluateUse(use, bools, seed, cert) {
    const b = bools || {};
    if (use === 'preview') {
      return { allowed: !!b.previewOk, reason: (seed.evidence && seed.evidence.previewOk) || (b.previewOk ? '允许站内预览' : '不可预览') };
    }
    if (use === 'design') {
      if (b.designOk === true) return { allowed: true, reason: (seed.evidence && seed.evidence.designOk) || '允许设计稿/印刷' };
      if (b.designOk === false) return { allowed: false, reason: (seed.evidence && seed.evidence.designOk) || '禁止画面商用' };
      return { allowed: false, reason: '待核实 · 见原文', uncertain: true };
    }
    if (use === 'cdn_web') {
      if (seed.cdnHardBlock) return { allowed: false, reason: '协议禁止网页字体分发（FLOP 硬拒）' };
      if (b.webfontCdnOk === true) return { allowed: true, reason: (seed.evidence && seed.evidence.webfontCdnOk) || '允许公共 CDN' };
      if (seed.cite_policy === 'cite_closed' && cert && cert.status === 'approved') {
        return { allowed: true, reason: '本账号已开引用（非公共 CDN / 不灌 fonts-packages）', account_scoped: true };
      }
      if (seed.cite_policy === 'cite_closed' && cert && cert.status === 'pending') {
        return { allowed: false, reason: '证书审核中 · 待审核通过后开通账号引用', uncertain: true };
      }
      if (seed.cite_policy === 'cite_closed') return { allowed: false, reason: '对外引用未开放，请上传证书' };
      if (b.webfontCdnOk === false) return { allowed: false, reason: (seed.evidence && seed.evidence.webfontCdnOk) || '禁止公共网页字体' };
      return { allowed: false, reason: '待核实 · 不得绿灯', uncertain: true };
    }
    if (use === 'app_embed') {
      var appEv = (seed.evidence && seed.evidence.appEmbedOk) || '';
      var appCertGated = /视证书|见证书|另授|账号可|凭证书|上传证书|有证|证书后|见原文|视原文/.test(appEv);
      if (b.appEmbedOk === false) return { allowed: false, reason: appEv || '禁止 App/游戏内置' };
      if (b.appEmbedOk === true && appCertGated) return { allowed: false, reason: appEv || '视证书 · 不得无证绿灯', uncertain: true };
      if (b.appEmbedOk === true) return { allowed: true, reason: appEv || '允许 App 内置' };
      return { allowed: false, reason: '待核实 · 不得绿灯', uncertain: true };
    }
    if (use === 'modify') {
      return { allowed: !!seed.modify, reason: seed.modify_reason || (seed.modify ? '允许改字（须遵守声明）' : '限制改字') };
    }
    if (use === 'redistribute') {
      return { allowed: !!seed.redistribute, reason: seed.redistribute_reason || (seed.redistribute ? '允许再分发' : '禁止再分发字体文件') };
    }
    return { allowed: false, reason: '未知用途' };
  }

  function buildLicenseResult(seed, uses) {
    uses = Array.isArray(uses) && uses.length ? uses.slice() : ['preview', 'design', 'cdn_web', 'app_embed'];
    const cert = findCert(seed.normalizedName) || findCert(seed.fontId);
    const bools = {
      previewOk: seed.bools.previewOk,
      designOk: seed.bools.designOk,
      webfontCdnOk: seed.bools.webfontCdnOk,
      appEmbedOk: seed.bools.appEmbedOk
    };
    const warnings = [];
    let cta = 'read_license';
    let headline = '';

    if (seed.cdnHardBlock) {
      bools.webfontCdnOk = false;
      bools.appEmbedOk = false;
      cta = 'blocked';
      headline = '协议禁止网页字体与 App 内置分发；本站不提供接入。';
      warnings.push('FLOP 硬拒：上传证书也不能打开公共 CDN。');
    } else if (seed.cite_policy === 'cite_closed' || seed.service_status === 'restricted') {
      bools.webfontCdnOk = false;
      if (cert && cert.status === 'approved') {
        cta = 'connect';
        headline = '本账号引用已开；公共货架仍「引用未开放」（账号 cite ≠ 公共 CDN）。';
        warnings.push('证书仅解锁账号×本款 cite，永不灌公共 fonts-packages / 不改 webfontCdnOk。');
      } else if (cert && cert.status === 'pending') {
        cta = 'cert_pending';
        headline = '站内可预览；证书审核中，对外网页引用暂未开通。';
        warnings.push('审核中时外链 CSS/API 仍提示「公共引用未开」；批准后仅开本账号 cite。');
      } else {
        cta = 'upload_cert';
        headline = '站内可预览；对外网页引用需上传授权证书（按账号开通，不是全站 CDN）。';
        warnings.push('无证时外链提示「引用未开放」。');
      }
    } else if (!seed.license_verified) {
      cta = 'read_license';
      headline = '许可尚未人工核对；不能当作可商用/可嵌入。';
      warnings.push('license_verified=false · 四布尔不得画成已核绿灯。');
    } else if (bools.webfontCdnOk === true) {
      cta = 'connect';
      headline = seed.license_label === 'ofl_ok' ? '可网页嵌入；可立即接入。' : '厂商允许网页使用；接入前请仍读原文。';
    } else {
      cta = 'read_license';
      headline = '请阅读许可原文后再决定用途。';
    }

    const for_uses = {};
    uses.forEach(function (u) { for_uses[u] = evaluateUse(u, bools, seed, cert); });

    return {
      fontId: seed.fontId,
      normalizedName: seed.normalizedName,
      name: seed.name,
      license_label: seed.license_label,
      license_spdx: seed.license_spdx,
      license_verified: !!seed.license_verified,
      license_url: seed.license_url,
      service_status: seed.service_status,
      cite_policy: seed.cite_policy,
      cdnHardBlock: !!seed.cdnHardBlock,
      bools: bools,
      evidence: seed.evidence || {},
      for_uses: for_uses,
      headline: headline,
      cta: cta,
      cta_label: ctaLabel(cta, cert),
      warnings: warnings,
      cert: cert,
      _gap: GAP_VER
    };
  }

  function listLicenseSeeds() {
    return Object.keys(LICENSE_SEEDS).map(function (k) {
      const s = LICENSE_SEEDS[k];
      return {
        fontId: s.fontId,
        normalizedName: s.normalizedName,
        name: s.name,
        license_label: s.license_label,
        license_verified: !!s.license_verified,
        service_status: s.service_status,
        cite_policy: s.cite_policy,
        cdnHardBlock: !!s.cdnHardBlock
      };
    });
  }

  function queryLicenseGet(params) {
    params = params || {};
    if (!isMock()) return Promise.reject(apiError('not_implemented', 'vault 尚未提供 license/query', 501));
    const q = params.fontId || params.normalizedName || params.q;
    const seed = resolveSeed(q);
    if (!seed) return Promise.reject(apiError('not_found', '未找到该字体许可档案（mock 仅含种子样例）', 404));
    return Promise.resolve(buildLicenseResult(seed, params.uses));
  }

  function queryLicense(body) {
    body = body || {};
    if (!isMock()) return Promise.reject(apiError('not_implemented', 'vault 尚未提供 license/query', 501));
    const seed = resolveSeed(body.fontId || body.normalizedName);
    if (!seed) return Promise.reject(apiError('not_found', '未找到该字体许可档案（mock 仅含种子样例）', 404));
    return Promise.resolve(buildLicenseResult(seed, body.uses));
  }

  function listLicenses() {
    if (!isMock()) return Promise.reject(apiError('not_implemented', 'vault 尚未提供 /api/licenses', 501));
    return Promise.resolve({ types: LICENSE_TYPES, seeds: listLicenseSeeds(), updated: '2026-09-27T17:55:00+08:00' });
  }

  function listCerts(fontId) {
    if (!isMock()) return Promise.reject(apiError('not_implemented', 'vault 尚未提供 /api/certs', 501));
    const uid = currentUserId();
    let rows = loadCerts().filter(function (c) { return c.user_id === uid; });
    if (fontId) {
      rows = rows.filter(function (c) { return c.font_id === fontId || c.normalizedName === fontId; });
    }
    return Promise.resolve(rows);
  }

  function createCert(body) {
    body = body || {};
    if (!isMock()) return Promise.reject(apiError('not_implemented', 'vault 尚未提供 POST /api/certs', 501));
    const seed = resolveSeed(body.fontId || body.normalizedName);
    if (!seed) return Promise.reject(apiError('not_found', '未知字体', 404));
    if (seed.cdnHardBlock) {
      return Promise.reject(apiError('forbidden', 'FLOP 硬拒款：证书不能打开公共 CDN，也不提供 cite 出口', 403));
    }
    if (seed.cite_policy !== 'cite_closed' && seed.service_status !== 'restricted') {
      return Promise.reject(apiError('validation_error', '该字体无需证书解锁', 422));
    }
    const cert = {
      cert_id: 'cert_' + Date.now().toString(36),
      user_id: currentUserId(),
      font_id: seed.normalizedName,
      normalizedName: seed.normalizedName,
      status: 'pending',
      unlocks: ['cdn_web'],
      unlocks_note: 'approved 仅开账号 cite，永不灌公共 fonts-packages',
      expires_at: null,
      created_at: new Date().toISOString(),
      note: String(body.note || '').slice(0, 200)
    };
    const list = loadCerts();
    list.unshift(cert);
    saveCerts(list);
    return Promise.resolve(cert);
  }

  /** mock 跳过 admin：演示用一键批准 */
  function reviewCert(id, body) {
    body = body || {};
    if (!isMock()) return Promise.reject(apiError('not_implemented', 'vault 尚未提供 certs review', 501));
    const list = loadCerts();
    const i = list.findIndex(function (c) { return c.cert_id === id; });
    if (i < 0) return Promise.reject(apiError('not_found', '证书不存在', 404));
    const st = body.status || 'approved';
    if (['pending', 'approved', 'rejected', 'expired'].indexOf(st) === -1) {
      return Promise.reject(apiError('validation_error', '非法 status', 422));
    }
    list[i].status = st;
    list[i].reviewed_at = new Date().toISOString();
    saveCerts(list);
    return Promise.resolve(list[i]);
  }

  function flopPrecheck(font) {
    if (!isMock()) return Promise.reject(apiError('not_implemented', 'vault 尚未提供 FLOP 预检', 501));
    const seed = resolveSeed(font);
    const hit = FLOP_LIST_V1.filter(function (r) {
      return r.font === font || (seed && r.font === seed.normalizedName);
    })[0];
    if (seed && seed.cdnHardBlock) {
      return Promise.resolve({
        font: seed.normalizedName,
        cdn_forbidden: true,
        cdnHardBlock: true,
        cdnStatus: 'blocked_flop',
        reason_code: 'flop_no_webfont',
        reason_label: (seed.flop && seed.flop.reason_label) || '协议禁止网页字体分发',
        css_would: '403',
        cta: 'blocked',
        upstream: seed.flop && seed.flop.upstream
      });
    }
    if (hit) {
      return Promise.resolve({
        font: hit.font,
        cdn_forbidden: true,
        cdnHardBlock: true,
        cdnStatus: 'blocked_flop',
        reason_code: hit.reason_code || 'flop_no_webfont',
        reason_label: '协议禁止网页字体分发',
        css_would: '403',
        cta: 'blocked',
        note: hit.note || null
      });
    }
    return Promise.resolve({
      font: font || '',
      cdn_forbidden: false,
      cdnHardBlock: false,
      cdnStatus: 'n/a',
      reason_code: null,
      reason_label: null,
      css_would: null,
      cta: null
    });
  }

  function listFlop() {
    if (!isMock()) return Promise.reject(apiError('not_implemented', 'vault 尚未提供 FLOP 名单', 501));
    return Promise.resolve({ version: 'v1-2026-09-27', items: FLOP_LIST_V1.slice() });
  }

  function getStandardBar(font) {
    if (!isMock()) return Promise.reject(apiError('not_implemented', 'vault 尚未提供标准棒结果', 501));
    const key = String(font || '').trim();
    const row = STANDARD_BARS[key];
    if (!row) return Promise.reject(apiError('not_found', '无该字体标准棒记录（mock）', 404));
    return Promise.resolve(Object.assign({}, row));
  }

  function listTickets(q) {
    q = q || {};
    if (!isMock()) return Promise.reject(apiError('not_implemented', 'vault 尚未提供 /api/tickets', 501));
    let rows = MOCK_TICKETS.slice();
    if (q.track) rows = rows.filter(function (t) { return t.track === q.track; });
    if (q.state) rows = rows.filter(function (t) { return t.state === q.state; });
    if (q.cdnStatus) rows = rows.filter(function (t) { return t.cdnStatus === q.cdnStatus; });
    return Promise.resolve(rows);
  }

  function getTicket(id) {
    if (!isMock()) return Promise.reject(apiError('not_implemented', 'vault 尚未提供 /api/tickets/:id', 501));
    const row = MOCK_TICKETS.filter(function (t) { return t.id === id; })[0];
    if (!row) return Promise.reject(apiError('not_found', '工单不存在', 404));
    return Promise.resolve(Object.assign({}, row));
  }

  window.WFApi = {
    MODE_KEY: MODE_KEY,
    mode: mode,
    setMode: function (m) {
      if (m !== 'live' && m !== 'mock') throw apiError('validation_error', 'mode 须为 mock|live');
      try { localStorage.setItem(MODE_KEY, m); } catch (e) { /* ignore */ }
      return mode();
    },
    base: base,
    isMock: isMock,
    request: request,
    listProjects: listProjects,
    getProject: getProject,
    createProject: createProject,
    patchProject: patchProject,
    deleteProject: deleteProject,
    addFont: addFont,
    removeFont: removeFont,
    removeWeight: removeWeight,
    rollbackVersion: rollbackVersion,
    listDomains: listDomains,
    listProjectDomains: listProjectDomains,
    addDomain: addDomain,
    removeDomain: removeDomain,
    verifyStart: verifyStart,
    verifyPoll: verifyPoll,
    verifyDomain: verifyDomain,
    listUploads: listUploads,
    getUpload: getUpload,
    initUpload: initUpload,
    putUploadBinary: putUploadBinary,
    completeUpload: completeUpload,
    waitUploadReady: waitUploadReady,
    runUpload: runUpload,
    deleteUpload: deleteUpload,
    getUsage: getUsage,
    getUsageSeries: getUsageSeries,
    listBlocked: listBlocked,
    estimateFont: estimateFont,
    listTeam: listTeam,
    inviteMember: inviteMember,
    setMemberRole: setMemberRole,
    removeMember: removeMember,
    getSettings: getSettings,
    patchSettings: patchSettings,
    rotateApiKey: rotateApiKey,
    updateAccount: updateAccount,
    listAudit: listAudit,
    publish: publish,
    publishProject: publishProject,
    /* GAP-FILL T1/T3 */
    listLicenseSeeds: listLicenseSeeds,
    queryLicense: queryLicense,
    queryLicenseGet: queryLicenseGet,
    listLicenses: listLicenses,
    listCerts: listCerts,
    createCert: createCert,
    reviewCert: reviewCert,
    flopPrecheck: flopPrecheck,
    listFlop: listFlop,
    getStandardBar: getStandardBar,
    listTickets: listTickets,
    getTicket: getTicket
  };
})();
