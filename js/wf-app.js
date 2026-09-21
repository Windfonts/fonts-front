/* 文风字体 v4 · 控制台数据层（localStorage）+ 壳。依赖 wf-proto / wf-chrome / wf-embed */
(function () {
  const KEY = 'wf-app-state-v2'; /* v2：用量含 byDomain / byFont / status / blockedHosts */
  const esc = WFProto.escapeHtml;
  let state = null;

  function mockUrl() { return WFChrome.href('data/mock-app.json'); }

  function defaultTeam() {
    const u = (window.WFChrome && WFChrome.user()) || {};
    return [
      { id: 'me', name: u.name || '文派设计', email: u.email || 'design@wenpai.org', role: 'owner', status: 'active', invitedAt: '2026-06-12T10:00:00+08:00' },
      { id: 'm-fe', name: '前端组', email: 'fe@wenpai.org', role: 'editor', status: 'active', invitedAt: '2026-07-01T09:00:00+08:00' }
    ];
  }
  function renameLegacy(s) {
    const raw = JSON.stringify(s);
    if (raw.indexOf('赛博字库') === -1 && raw.indexOf('CYBERFONTS') === -1) return false;
    function walk(o) {
      if (!o || typeof o !== 'object') return;
      Object.keys(o).forEach(function (k) {
        if (typeof o[k] === 'string') {
          o[k] = o[k].replace(/赛博字库/g, '墨图云集').replace(/CYBERFONTS/g, 'MOTUCLOUD');
        } else walk(o[k]);
      });
    }
    walk(s);
    return true;
  }
  function ensureShape(s) {
    if (!s.settings) s.settings = { display: 'swap' };
    if (!s.team) s.team = defaultTeam();
    if (!s.audit) s.audit = [];
    if (!s.claims) s.claims = [];
    if (renameLegacy(s)) {
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
    }
    return s;
  }
  function log(action, detail) {
    if (!state) return;
    const u = (window.WFChrome && WFChrome.user()) || {};
    state.audit.unshift({ at: new Date().toISOString(), actor: u.email || u.name || '本机', action: action, detail: detail || '' });
    state.audit = state.audit.slice(0, 80);
  }

  function load() {
    if (state) return Promise.resolve(state);
    try {
      const cached = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (cached && cached.projects) { state = ensureShape(cached); return Promise.resolve(state); }
    } catch (e) { /* ignore */ }
    return fetch(mockUrl()).then(function (r) { return r.json(); }).then(function (json) {
      state = ensureShape(json);
      save();
      return state;
    });
  }
  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
    document.dispatchEvent(new CustomEvent('wf:app', { detail: state }));
  }
  function reset() { localStorage.removeItem(KEY); state = null; return load(); }

  function projects() { return state.projects.slice(); }
  function project(id) { return state.projects.filter(function (p) { return p.id === id; })[0] || null; }
  function currentVersion(p) { return (p.versions || []).filter(function (v) { return v.current; })[0] || p.versions[0]; }
  function pushVersion(p, note, bytes) {
    const max = p.versions.reduce(function (m, v) { return Math.max(m, v.v); }, 0);
    p.versions.forEach(function (v) { v.current = false; });
    p.versions.unshift({ v: max + 1, at: new Date().toISOString(), note: note, bytes: bytes || projectBytes(p), current: true });
    log('发布版本', p.name + ' · ' + note);
    save();
  }
  function rollback(p, v) {
    const target = p.versions.filter(function (x) { return x.v === v; })[0];
    if (!target) return;
    const max = p.versions.reduce(function (m, x) { return Math.max(m, x.v); }, 0);
    p.versions.forEach(function (x) { x.current = false; });
    p.versions.unshift({ v: max + 1, at: new Date().toISOString(), note: '回滚到 v' + v + '：' + target.note, bytes: target.bytes, current: true });
    log('回滚版本', p.name + ' · v' + v);
    save();
  }

  function createProject(name) {
    const id = 'p-' + Date.now().toString(36);
    const p = { id: id, name: name, slug: name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-'), createdAt: new Date().toISOString(),
      fonts: [], domains: [], versions: [{ v: 1, at: new Date().toISOString(), note: '初始版本', bytes: 0, current: true }],
      usage: { requests30d: 0, bytes30d: 0, topPages: [], byDomain: [], byFont: [], status: { '200': 0, '304': 0, '403': 0 }, blockedHosts: [], perf: { fcpMs: 0, fontLoadMs: 0, hitRate: 0 } } };
    state.projects.unshift(p);
    log('新建项目', name);
    save();
    return p;
  }
  function removeProject(id) {
    const p = project(id);
    state.projects = state.projects.filter(function (x) { return x.id !== id; });
    log('删除项目', p ? p.name : id);
    save();
  }

  const HOST_RE = /^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
  function validHost(host) { return HOST_RE.test(String(host || '').trim()); }
  function addDomain(p, host, method) {
    host = String(host || '').trim().toLowerCase();
    if (!validHost(host) || p.domains.some(function (d) { return d.host === host; })) return false;
    p.domains.push({ host: host, verified: false, method: method || 'dns', addedAt: new Date().toISOString(), verifiedAt: null, lastSeenAt: null });
    p.usage.blockedHosts = (p.usage.blockedHosts || []).filter(function (b) { return b.host !== host; });
    log('添加域名', host + ' · ' + p.name);
    save();
    return true;
  }
  function removeDomain(p, host) { p.domains = p.domains.filter(function (d) { return d.host !== host; }); log('移除域名', host + ' · ' + p.name); save(); }
  function verifyDomain(p, host) {
    p.domains.forEach(function (d) { if (d.host === host) { d.verified = true; d.verifiedAt = new Date().toISOString(); } });
    log('验证域名', host + ' · ' + p.name);
    save();
  }
  /** 全部项目的域名拉平，附带 30 天用量 */
  function allDomains() {
    const out = [];
    state.projects.forEach(function (p) {
      p.domains.forEach(function (d) {
        const u = ((p.usage.byDomain || []).filter(function (x) { return x.host === d.host; })[0]) || { requests30d: 0, bytes30d: 0 };
        out.push(Object.assign({}, d, { project: p, requests30d: u.requests30d, bytes30d: u.bytes30d }));
      });
    });
    return out;
  }
  /** 白名单外拉取字体的来源（403），按项目归集 */
  function blockedHosts() {
    const out = [];
    state.projects.forEach(function (p) {
      (p.usage.blockedHosts || []).forEach(function (b) { out.push(Object.assign({}, b, { project: p })); });
    });
    return out.sort(function (a, b) { return b.requests30d - a.requests30d; });
  }
  /** 字体维度用量：跨项目聚合 → [{ fontId, requests30d, bytes30d, weights: {w: n}, projects: [{ p, requests30d, bytes30d, weights }] }] */
  function usageByFont() {
    const agg = {};
    state.projects.forEach(function (p) {
      (p.usage.byFont || []).forEach(function (f) {
        const a = agg[f.fontId] = agg[f.fontId] || { fontId: f.fontId, requests30d: 0, bytes30d: 0, weights: {}, projects: [] };
        a.requests30d += f.requests30d; a.bytes30d += f.bytes30d;
        Object.keys(f.weights || {}).forEach(function (w) { a.weights[w] = (a.weights[w] || 0) + f.weights[w]; });
        a.projects.push({ p: p, requests30d: f.requests30d, bytes30d: f.bytes30d, weights: f.weights || {} });
      });
    });
    return Object.keys(agg).map(function (k) { return agg[k]; }).sort(function (a, b) { return b.requests30d - a.requests30d; });
  }
  function fontUsage(fontId) { return usageByFont().filter(function (x) { return x.fontId === fontId; })[0] || null; }
  function statusTotals() {
    const t = { '200': 0, '304': 0, '403': 0 };
    state.projects.forEach(function (p) { const s = p.usage.status || {}; Object.keys(t).forEach(function (k) { t[k] += s[k] || 0; }); });
    return t;
  }

  /* —— 导出 CSV（客户端生成） —— */
  function toCsv(header, rows) {
    const q = function (v) { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return '\ufeff' + [header].concat(rows).map(function (r) { return r.map(q).join(','); }).join('\n');
  }
  function download(name, text, type) {
    const blob = new Blob([text], { type: type || 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  function addFont(p, fontId, weights, subset) {
    const exists = p.fonts.filter(function (f) { return f.fontId === fontId; })[0];
    if (exists) { exists.weights = weights; exists.subset = subset; }
    else p.fonts.push({ fontId: fontId, weights: weights, subset: subset });
    const meta = WFProto.getFont(fontId);
    pushVersion(p, (exists ? '更新 ' : '新增 ') + (meta ? meta.name : fontId) + ' · ' + subsetLabel(subset));
  }
  function removeFont(p, fontId) {
    const meta = WFProto.getFont(fontId);
    p.fonts = p.fonts.filter(function (f) { return f.fontId !== fontId; });
    pushVersion(p, '移除 ' + (meta ? meta.name : fontId));
  }

  /* —— 子集估算 —— */
  const COMMON = { '3500': 3500, '7000': 7000 };
  function uniqueChars(text) {
    const seen = {};
    let n = 0;
    Array.from(String(text || '')).forEach(function (c) {
      if (/\s/.test(c) || seen[c]) return;
      seen[c] = true; n += 1;
    });
    return n;
  }
  function parseRanges(str) {
    let total = 0;
    String(str || '').split(/[,，;\s]+/).forEach(function (tok) {
      const m = tok.match(/^U\+?([0-9a-f]{2,6})(?:[-–]U?\+?([0-9a-f]{2,6}))?$/i);
      if (!m) return;
      const a = parseInt(m[1], 16), b = m[2] ? parseInt(m[2], 16) : a;
      if (b >= a) total += b - a + 1;
    });
    return total;
  }
  function subsetGlyphs(font, subset) {
    const full = (font && (font.glyphCount || font.charCount)) || 8000;
    if (!subset || subset.mode === 'full') return full;
    if (subset.mode === 'text') return Math.min(full, uniqueChars(subset.text) + 60);
    if (subset.mode === 'common') return Math.min(full, COMMON[subset.preset] || 3500);
    if (subset.mode === 'unicode') return Math.min(full, parseRanges(subset.ranges));
    return full;
  }
  function subsetBytes(font, subset, weightsCount) {
    return WFEmbed.estimateBytes(subsetGlyphs(font, subset)) * (weightsCount || 1);
  }
  function subsetLabel(subset) {
    if (!subset || subset.mode === 'full') return '完整字集';
    if (subset.mode === 'text') return '按文字 ' + uniqueChars(subset.text) + ' 字';
    if (subset.mode === 'common') return '常用 ' + subset.preset + ' 字';
    if (subset.mode === 'unicode') return '按编码范围';
    return '';
  }
  function projectBytes(p) {
    return p.fonts.reduce(function (sum, f) {
      return sum + subsetBytes(WFProto.getFont(f.fontId), f.subset, (f.weights || []).length || 1);
    }, 0);
  }

  /* —— 用量序列（确定性伪随机） —— */
  function series(seed, days, total) {
    let x = 0;
    for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0;
    const raw = [];
    for (let i = 0; i < days; i++) {
      x = (x * 1103515245 + 12345) >>> 0;
      const wk = ((i % 7) === 5 || (i % 7) === 6) ? 0.55 : 1;
      raw.push((0.6 + (x % 1000) / 1000 * 0.8) * wk);
    }
    const sum = raw.reduce(function (a, b) { return a + b; }, 0);
    return raw.map(function (v) { return Math.round(v / sum * total); });
  }
  function sparkline(values, w, h) {
    w = w || 640; h = h || 120;
    const max = Math.max.apply(null, values) || 1;
    const step = w / Math.max(1, values.length - 1);
    const pts = values.map(function (v, i) { return (i * step).toFixed(1) + ',' + (h - v / max * (h - 8) - 2).toFixed(1); });
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<polyline fill="none" stroke="currentColor" stroke-width="1.5" points="' + pts.join(' ') + '"/>' +
      '<line x1="0" y1="' + (h - 0.5) + '" x2="' + w + '" y2="' + (h - 0.5) + '" stroke="var(--rule)" /></svg>';
  }

  /* —— 格式 —— */
  function fmtDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    const p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function fmtGB(bytes) { return (bytes / 1e9).toFixed(bytes >= 1e10 ? 0 : 1); }

  /* —— 壳 —— */
  const NAV = [
    { id: 'overview', label: '概览', path: 'app/index.html', icon: 'dashboard' },
    { id: 'projects', label: '项目', path: 'app/projects.html', icon: 'folder' },
    { id: 'domains', label: '域名', path: 'app/domains.html', icon: 'globe' },
    { id: 'fonts', label: '我的字体', path: 'app/fonts.html', icon: 'font' },
    { id: 'subset', label: '子集化', path: 'app/subset.html', icon: 'scissors' },
    { id: 'usage', label: '用量', path: 'app/usage.html', icon: 'chart' },
    { id: 'team', label: '团队', path: 'app/team.html', icon: 'user' },
    { id: 'settings', label: '设置', path: 'app/settings.html', icon: 'settings' }
  ];
  function renderRail(el) {
    const active = el.getAttribute('data-active') || '';
    const u = WFChrome.user() || {};
    el.innerHTML =
      '<a class="wordmark" href="' + WFChrome.href('index.html') + '"><img src="' + WFChrome.href('assets/icon.webp') + '" alt="" width="22" height="22" /><span>文风字体</span></a>' +
      '<nav class="rail-nav" aria-label="控制台导航">' + NAV.map(function (n) {
        return '<a href="' + WFChrome.href(n.path) + '"' + (n.id === active ? ' class="is-active"' : '') + '>' + WFChrome.icon(n.icon) + n.label + '</a>';
      }).join('') + '</nav>' +
      '<div class="rail-foot"><div class="who"><strong>' + esc(u.name || '未登录') + '</strong><span>' + esc(u.email || '') + '</span></div>' +
        '<a href="' + WFChrome.href('fonts.html') + '">' + WFChrome.icon('font-size') + '字体库</a><a href="' + WFChrome.href('docs.html') + '">' + WFChrome.icon('book') + '文档</a>' +
        '<button type="button" class="btn-text" data-theme-toggle data-label="主题" aria-label="切换主题">' + WFChrome.icon(WFChrome.theme() === 'dark' ? 'sun' : 'moon') + '主题</button>' +
        '<button type="button" class="btn-text" id="railLogout">' + WFChrome.icon('exit') + '退出</button></div>';
    el.querySelector('[data-theme-toggle]').addEventListener('click', WFChrome.toggleTheme);
    const out = el.querySelector('#railLogout');
    if (out) out.addEventListener('click', function () { WFChrome.logout(); location.href = WFChrome.href('index.html'); });
    const on = el.querySelector('.rail-nav a.is-active');
    if (on && on.scrollIntoView) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  function gate() {
    if (!WFChrome.user() && WFProto.getQuery('demo')) WFChrome.login();
    if (!WFChrome.user()) {
      const back = location.pathname.split('/').slice(-1)[0];
      location.replace(WFChrome.href('login.html?next=app&back=' + encodeURIComponent(back)));
      return false;
    }
    return true;
  }

  const ROLES = [
    { id: 'owner', label: '所有者' },
    { id: 'admin', label: '管理员' },
    { id: 'editor', label: '编辑' },
    { id: 'viewer', label: '只读' }
  ];
  function roleLabel(id) { const r = ROLES.filter(function (x) { return x.id === id; })[0]; return r ? r.label : id; }
  function inviteMember(email, role) {
    email = String(email || '').trim().toLowerCase();
    if (!email || !state) return false;
    if (state.team.some(function (m) { return m.email === email; })) return false;
    state.team.push({ id: 'm-' + Date.now().toString(36), name: email.split('@')[0], email: email, role: role || 'editor', status: 'pending', invitedAt: new Date().toISOString() });
    log('邀请成员', email + ' · ' + roleLabel(role || 'editor'));
    save();
    return true;
  }
  function setMemberRole(id, role) {
    state.team.forEach(function (m) { if (m.id === id && m.role !== 'owner') m.role = role; });
    log('变更角色', id + ' · ' + roleLabel(role));
    save();
  }
  function removeMember(id) {
    const m = state.team.filter(function (x) { return x.id === id; })[0];
    if (!m || m.role === 'owner') return false;
    state.team = state.team.filter(function (x) { return x.id !== id; });
    log('移除成员', m.email);
    save();
    return true;
  }
  function resolveFoundryClaim(payload) {
    const q = String((payload && payload.slug) || '').trim();
    const list = (WFProto.getFoundries && WFProto.getFoundries()) || [];
    const hit = list.filter(function (f) {
      const aliases = f.aliases || [];
      return f.id === q || f.name === q || String(f.en || '') === q ||
        aliases.some(function (a) { return String(a) === q; });
    })[0];
    return {
      slug: hit ? hit.id : q,
      name: hit ? hit.name : (payload.name || q)
    };
  }
  function submitClaim(payload) {
    const resolved = resolveFoundryClaim(payload);
    const c = {
      id: 'cl-' + Date.now().toString(36),
      slug: resolved.slug, name: resolved.name,
      website: payload.website || '', email: payload.email || '',
      licenseUrl: payload.licenseUrl || '',
      status: 'pending', submittedAt: new Date().toISOString()
    };
    state.claims.unshift(c);
    log('提交认领', c.name);
    save();
    return c;
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-rail]').forEach(renderRail);
  });

  window.WFApp = {
    load: load, save: save, reset: reset, gate: gate, log: log,
    state: function () { return state; },
    ROLES: ROLES, roleLabel: roleLabel,
    inviteMember: inviteMember, setMemberRole: setMemberRole, removeMember: removeMember,
    submitClaim: submitClaim,
    projects: projects, project: project, createProject: createProject, removeProject: removeProject,
    currentVersion: currentVersion, pushVersion: pushVersion, rollback: rollback,
    validHost: validHost, addDomain: addDomain, removeDomain: removeDomain, verifyDomain: verifyDomain,
    allDomains: allDomains, blockedHosts: blockedHosts, usageByFont: usageByFont, fontUsage: fontUsage, statusTotals: statusTotals,
    toCsv: toCsv, download: download,
    addFont: addFont, removeFont: removeFont,
    uniqueChars: uniqueChars, parseRanges: parseRanges, subsetGlyphs: subsetGlyphs, subsetBytes: subsetBytes,
    subsetLabel: subsetLabel, projectBytes: projectBytes,
    series: series, sparkline: sparkline, fmtDate: fmtDate, fmtGB: fmtGB,
    NAV: NAV
  };
})();
