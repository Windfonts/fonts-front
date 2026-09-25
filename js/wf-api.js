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

  /* —— Uploads / Usage stubs（P0 类型+入口，UI 未改接） —— */
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
      return listUploads().then(function (rows) {
        const u = rows.filter(function (x) { return x.id === id; })[0];
        if (!u) throw apiError('not_found', '上传不存在', 404);
        return u;
      });
    }
    return request('/api/uploads/' + encodeURIComponent(id));
  }

  function initUpload(body) {
    if (isMock()) {
      return Promise.reject(apiError('processing', 'mock 未实现上传 init；请继续用现有 upload.html', 501));
    }
    return request('/api/uploads/init', { method: 'POST', body: body || {} });
  }

  function completeUpload(id) {
    if (isMock()) {
      return Promise.reject(apiError('processing', 'mock 未实现上传 complete', 501));
    }
    return request('/api/uploads/' + encodeURIComponent(id) + '/complete', { method: 'POST', body: {} });
  }

  function deleteUpload(id) {
    if (isMock()) {
      return ensureApp().then(function () {
        WFApp.removeUpload(id);
        return { ok: true };
      });
    }
    return request('/api/uploads/' + encodeURIComponent(id), { method: 'DELETE' }).then(function () { return { ok: true }; });
  }

  function getUsage(params) {
    params = params || {};
    if (isMock()) {
      return ensureApp().then(function () {
        const range = Number(params.range) || 30;
        const scale = range / 30;
        const st = WFApp.statusTotals();
        const byFont = WFApp.usageByFont();
        let requests = 0;
        let bytes = 0;
        const groups = [];
        WFApp.projects().forEach(function (p) {
          const r = Math.round((p.usage.requests30d || 0) * scale);
          const b = Math.round((p.usage.bytes30d || 0) * scale);
          requests += r; bytes += b;
          groups.push({ key: p.id, label: p.name, requests: r, bytes: b, hitRate: (p.usage.perf && p.usage.perf.hitRate) || 0 });
        });
        const blocked = WFApp.blockedHosts().reduce(function (a, b) { return a + (b.requests30d || 0); }, 0);
        const s = WFApp.state();
        return {
          range: range,
          totals: {
            requests: requests,
            bytes: bytes,
            quotaGB: (s.plan && s.plan.quota && s.plan.quota.trafficGB) || 200,
            blocked: Math.round(blocked * scale)
          },
          status: { '200': Math.round((st['200'] || 0) * scale), '304': Math.round((st['304'] || 0) * scale), '403': Math.round((st['403'] || 0) * scale) },
          series: { from: '', to: '', requests: WFApp.series ? WFApp.series(Math.min(range, 30)) : [] },
          groups: groups,
          byFont: byFont,
          perf: WFApp.projects().map(function (p) {
            const pf = p.usage.perf || {};
            return { projectId: p.id, fcpMs: pf.fcpMs || 0, fontLoadMs: pf.fontLoadMs || 0, hitRate: pf.hitRate || 0 };
          })
        };
      });
    }
    const q = [];
    Object.keys(params).forEach(function (k) {
      if (params[k] != null && params[k] !== '') q.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    });
    return request('/api/usage' + (q.length ? '?' + q.join('&') : ''));
  }

  function listBlocked() {
    if (isMock()) {
      return ensureApp().then(function () {
        return WFApp.blockedHosts().map(function (b) {
          return Object.assign({}, b, { projectId: b.project && b.project.id });
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
    completeUpload: completeUpload,
    deleteUpload: deleteUpload,
    getUsage: getUsage,
    listBlocked: listBlocked,
    publish: publish,
    publishProject: publishProject
  };
})();
