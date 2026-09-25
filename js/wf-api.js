/* 文风字体 · 控制台 API 客户端（mock | live）。依赖 wf-proto；mock 委托 WFApp 状态。 */
(function () {
  const MODE_KEY = 'wf-api-mode';

  /** @typedef {{ id: string, name: string, slug: string, createdAt?: string, updatedAt?: string, fonts?: any[], domains?: Domain[], versions?: any[], delivery?: object, usage?: object }} Project */
  /** @typedef {{ host: string, verified: boolean, method?: string, addedAt?: string, verifiedAt?: string|null, lastSeenAt?: string|null, projectId?: string, requests30d?: number, bytes30d?: number }} Domain */
  /** @typedef {{ ok: boolean, data?: any, error?: { code: string, message: string } }} Envelope */

  function mode() {
    try {
      const m = localStorage.getItem(MODE_KEY);
      if (m === 'live' || m === 'mock') return m;
    } catch (e) { /* ignore */ }
    if (window.WFProto && (WFProto.API_MODE === 'live' || WFProto.API_MODE === 'mock')) return WFProto.API_MODE;
    /* 生产 / 预发默认 live（发布与密钥打 vault）；本机仍 mock */
    try {
      const host = String(location.hostname || '').toLowerCase();
      if (host === 'app.windfonts.com' || host === 'staging-app.windfonts.com') return 'live';
    } catch (e) { /* ignore */ }
    return 'mock';
  }

  function base() {
    return (window.WFProto && WFProto.CSS_API) || 'https://vault.windfonts.com';
  }

  function isMock() { return mode() !== 'live'; }

  /**
   * vault 现有：publish、key/status、fonts…；尚无 /api/projects CRUD。
   * live 模式下项目/域名/用量仍走本机，避免 404 打爆控制台。
   */
  function vaultHasProjectCrud() { return true; }

  function useLocalProjects() { return isMock() || !vaultHasProjectCrud(); }

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
    if (useLocalProjects()) {
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
    if (useLocalProjects()) {
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
    if (useLocalProjects()) {
      return ensureApp().then(function () { return WFApp.createProject(name); });
    }
    return request('/api/projects', { method: 'POST', body: { name: name } });
  }

  function patchProject(id, body) {
    if (useLocalProjects()) {
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
    if (useLocalProjects()) {
      return ensureApp().then(function () {
        if (!WFApp.project(id)) throw apiError('not_found', '项目不存在', 404);
        WFApp.removeProject(id);
        return { ok: true };
      });
    }
    return request('/api/projects/' + encodeURIComponent(id), { method: 'DELETE' }).then(function () { return { ok: true }; });
  }

  /* —— Domains —— */
  function listDomains() {
    if (useLocalProjects()) {
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
    if (useLocalProjects()) {
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
    if (useLocalProjects()) {
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
    if (useLocalProjects()) {
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
    if (useLocalProjects()) {
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
    if (useLocalProjects()) {
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
    if (useLocalProjects()) {
      return ensureApp().then(function () {
        const s = WFApp.state();
        return (s && s.uploads) ? s.uploads.slice() : [];
      });
    }
    return request('/api/uploads');
  }

  function getUpload(id) {
    if (useLocalProjects()) {
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
    if (useLocalProjects()) {
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
    if (useLocalProjects()) {
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
    if (useLocalProjects()) {
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
    if (useLocalProjects()) {
      return ensureApp().then(function () { return buildUsageMock(params); });
    }
    return request('/api/usage' + qsFromParams(params));
  }

  function getUsageSeries(params) {
    params = params || {};
    if (useLocalProjects()) {
      return getUsage(params).then(function (u) { return u.series; });
    }
    return request('/api/usage/series' + qsFromParams(params));
  }

  function listBlocked() {
    if (useLocalProjects()) {
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
    useLocalProjects: useLocalProjects,
    vaultHasProjectCrud: vaultHasProjectCrud,
    request: request,
    listProjects: listProjects,
    getProject: getProject,
    createProject: createProject,
    patchProject: patchProject,
    deleteProject: deleteProject,
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
    publish: publish,
    publishProject: publishProject
  };
})();
