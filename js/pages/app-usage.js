/* 控制台 · 用量：总览（按项目 / 按字体 / 按域名 / 状态码 / 性能）+ 单字体钻取（?font=）；数据经 WFApi */
(function () {
  if (!WFApp.gate()) return;
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('root');
  const fmt = WFProto.formatCount;
  let range = parseInt(WFProto.getQuery('range') || '30', 10);
  if ([7, 30, 90].indexOf(range) === -1) range = 30;
  const fontId = WFProto.getQuery('font');

  function rangeTabs() {
    return '<div class="app-actions tabs" role="tablist">' + [7, 30, 90].map(function (d) {
      return '<button type="button" role="tab" data-range="' + d + '"' + (d === range ? ' class="is-on"' : '') + '>' + d + ' 天</button>';
    }).join('') + '</div>';
  }
  function bindRange() {
    root.querySelectorAll('[data-range]').forEach(function (b) {
      b.addEventListener('click', function () { range = parseInt(b.getAttribute('data-range'), 10); render(); });
    });
  }
  function weightBars(weights, total) {
    const ws = Object.keys(weights || {}).sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });
    if (!ws.length) return '<p class="muted t-13">暂无数据</p>';
    return '<div class="weight-bars">' + ws.map(function (w) {
      const n = weights[w] || 0;
      const pct = total ? Math.round(n / total * 100) : 0;
      return '<div><span class="mono">' + esc(w) + ' · ' + esc(WFProto.weightName('', w)) + '</span><span class="bar"><i style="width:' + pct + '%"></i></span><span class="num">' + fmt(n) + ' · ' + pct + '%</span></div>';
    }).join('') + '</div>';
  }

  function lowWeights(ps) {
    const out = [];
    ps.forEach(function (p) {
      (p.usage.byFont || []).forEach(function (f) {
        const ws = f.weights || {};
        const keys = Object.keys(ws);
        const total = keys.reduce(function (a, w) { return a + (ws[w] || 0); }, 0);
        if (keys.length < 2 || !total) return;
        const row = (p.fonts || []).filter(function (x) { return x.fontId === f.fontId; })[0];
        if (!row || (row.weights || []).length < 2) return;
        keys.forEach(function (w) {
          if ((row.weights || []).map(String).indexOf(String(w)) === -1) return;
          const share = ws[w] / total;
          if (share < 0.15) out.push({ p: p, fontId: f.fontId, weight: w, pct: Math.round(share * 100) });
        });
      });
    });
    return out;
  }
  function insightHtml(ps, pct, blockedRows) {
    const lows = lowWeights(ps).slice(0, 4);
    const blocked = (blockedRows || []).map(function (b) {
      const host = String(b.host || '').replace(/:\d+$/, '').toLowerCase();
      if (!host || host === 'localhost' || host === '127.0.0.1' || !WFApp.validHost(host)) return null;
      const project = b.project || WFApp.project(b.projectId);
      if (!project) return null;
      return { host: host, project: project, requests30d: b.requests30d };
    }).filter(Boolean).slice(0, 3);
    if (pct < 80 && !lows.length && !blocked.length) return '';
    const bits = [];
    if (pct >= 80) bits.push('<p>本月流量已用 ' + pct + '%，超出后按 ¥0.8 / GB 计。</p>');
    lows.forEach(function (d) {
      const meta = WFApp.fontMeta(d.fontId);
      bits.push('<div class="row"><span>' + esc(d.p.name) + ' · ' + esc(meta ? meta.name : d.fontId) + ' 的 ' + esc(d.weight) + ' 只占请求 ' + d.pct + '%</span>' +
        '<button type="button" class="btn-text" data-drop-weight="' + esc(d.p.id) + '|' + esc(d.fontId) + '|' + esc(d.weight) + '">' + WFChrome.icon('scissors') + '去掉这个字重</button></div>');
    });
    blocked.forEach(function (b) {
      bits.push('<div class="row"><span>' + esc(b.host) + ' 被拒 ' + WFProto.formatCount(b.requests30d) + ' 次 · ' + esc(b.project.name) + '</span>' +
        '<button type="button" class="btn-text" data-allow="' + esc(b.project.id) + '|' + esc(b.host) + '">' + WFChrome.icon('plus') + '加入白名单</button></div>');
    });
    return '<section class="app-section"><h2>可以处理的</h2><div class="insight">' + bits.join('') + '</div></section>';
  }
  function bindInsights() {
    root.querySelectorAll('[data-drop-weight]').forEach(function (b) {
      b.addEventListener('click', function () {
        const parts = b.getAttribute('data-drop-weight').split('|');
        const p = WFApp.project(parts[0]);
        const meta = WFApp.fontMeta(parts[1]);
        WFChrome.confirm({
          title: '去掉字重',
          message: '从「' + (p ? p.name : '') + '」的「' + (meta ? meta.name : parts[1]) + '」去掉 ' + parts[2] + '，并生成新版本。',
          ok: '去掉'
        }).then(function (ok) {
          if (!ok || !p) return;
          if (WFApp.removeWeight(p, parts[1], parts[2])) { WFChrome.toast('已去掉，生成新版本'); render(); }
          else WFChrome.toast('这款字至少要留一个字重');
        });
      });
    });
    root.querySelectorAll('[data-allow]').forEach(function (b) {
      b.addEventListener('click', function () {
        const v = b.getAttribute('data-allow');
        const i = v.indexOf('|');
        const projectId = v.slice(0, i);
        const host = v.slice(i + 1);
        WFApi.addDomain(projectId, host, 'dns').then(function () {
          WFChrome.toast('已加入白名单，待验证');
          render();
        }).catch(function (err) {
          WFChrome.toast((err && err.code === 'conflict') ? '已在白名单' : ((err && err.message) || '添加失败'));
        });
      });
    });
  }

  /* —— 总览 —— */
  function paintAll(u, blockedRows) {
    const s = WFApp.state();
    const ps = WFApp.projects();
    const req = (u.totals && u.totals.requests) || 0;
    const bytes = (u.totals && u.totals.bytes) || 0;
    const quotaGB = (u.totals && u.totals.quotaGB) || (s.plan && s.plan.quota && s.plan.quota.trafficGB) || 200;
    const pct = Math.min(100, Math.round(bytes / 1e9 / quotaGB * 100));
    const daily = (u.series && u.series.requests) || [];
    const byFont = u.byFont || [];
    const domains = u.byDomain || [];
    const st = u.status || { '200': 0, '304': 0, '403': 0 };
    const stSum = (st['200'] || 0) + (st['304'] || 0) + (st['403'] || 0) || 1;
    const blocked = (u.totals && u.totals.blocked) || 0;
    const groups = u.groups || [];
    const perf = u.perf || [];
    const planName = (s.plan && s.plan.name) || '专业';

    root.innerHTML =
      '<div class="app-head"><div><h1>用量</h1><p class="sub">' + planName + '版 · 月流量配额 ' + quotaGB + ' GB · 超出按 ¥0.8 / GB · 数据延迟约 5 分钟' +
        (WFApi.isMock() ? ' · mock' : '') + '</p></div>' +
        '<div class="app-actions">' + rangeTabs() + '<button type="button" class="btn" id="exportCsv">' + WFChrome.icon('download') + '导出 CSV</button></div></div>' +
      '<div class="stats">' +
        '<div class="stat"><div class="v">' + WFApp.fmtGB(bytes) + '<small>GB · ' + pct + '%</small></div><div class="l">字体流量 / 配额</div></div>' +
        '<div class="stat"><div class="v">' + (req / 1000).toFixed(1) + '<small>k</small></div><div class="l">字体请求</div></div>' +
        '<div class="stat"><div class="v">' + fmt(blocked) + '</div><div class="l">未授权访问</div></div>' +
        '<div class="stat"><div class="v">' + (req ? WFEmbed.fmtBytes(bytes / req).replace(' ', '<small>') + '</small>' : '—') + '</div><div class="l">平均每次请求</div></div>' +
      '</div>' +
      insightHtml(ps, pct, blockedRows) +
      '<section class="app-section"><h2>每日请求<span class="more mono">' + range + ' 天</span></h2>' + WFApp.sparkline(daily) +
        '<div class="spark-meta"><span>' + esc((u.series && u.series.from) || (range + ' 天前')) + '</span><span>' + esc((u.series && u.series.to) || '今天') + '</span></div>' +
        '<div class="status-row"><span><b>' + Math.round((st['200'] || 0) / stSum * 100) + '%</b>成功下发</span><span><b>' + Math.round((st['304'] || 0) / stSum * 100) + '%</b>缓存命中</span><span><b>' + Math.round((st['403'] || 0) / stSum * 100) + '%</b>被拒</span></div></section>' +
      '<section class="app-section"><h2>按字体<span class="more mono">' + byFont.length + ' 款</span></h2>' +
        '<table class="table"><thead><tr><th>字体</th><th>厂商</th><th>项目</th><th>字重</th><th class="num">请求</th><th class="num">流量</th><th class="num">占比</th></tr></thead><tbody>' +
        byFont.map(function (r) {
          const m = WFApp.fontMeta(r.fontId);
          const ws = Object.keys(r.weights || {}).sort();
          return '<tr><td><a href="usage.html?font=' + esc(r.fontId) + '&range=' + range + '">' + esc(m ? m.name : r.fontId) + '</a></td>' +
            '<td>' + esc(m ? WFChrome.brandShort(m) : '—') + '</td>' +
            '<td>' + (r.projects || []).map(function (x) {
              return '<a href="project.html?id=' + esc(x.projectId) + '&tab=usage">' + esc(x.name || x.projectId) + '</a>';
            }).join(' · ') + '</td>' +
            '<td class="mono">' + ws.join(' · ') + '</td>' +
            '<td class="num">' + fmt(r.requests30d) + '</td><td class="num">' + WFApp.fmtGB(r.bytes30d) + ' GB</td>' +
            '<td class="num">' + (req ? Math.round(r.requests30d / req * 100) : 0) + '%</td></tr>';
        }).join('') + '</tbody></table></section>' +
      '<div class="usage-grid">' +
        '<section class="app-section"><h2>按项目</h2><table class="table"><thead><tr><th>项目</th><th class="num">请求</th><th class="num">流量</th><th class="num">命中</th></tr></thead><tbody>' +
          groups.map(function (g) {
            return '<tr><td><a href="project.html?id=' + esc(g.key) + '&tab=usage">' + esc(g.label) + '</a></td><td class="num">' + fmt(g.requests) + '</td>' +
              '<td class="num">' + WFApp.fmtGB(g.bytes) + ' GB</td><td class="num">' + Math.round((g.hitRate || 0) * 100) + '%</td></tr>';
          }).join('') + '</tbody></table></section>' +
        '<section class="app-section"><h2>按域名<a class="more" href="domains.html">' + WFChrome.icon('globe') + '管理</a></h2><table class="table"><thead><tr><th>域名</th><th class="num">请求</th><th class="num">流量</th></tr></thead><tbody>' +
          domains.map(function (d) {
            return '<tr><td class="mono">' + esc(d.key || d.label) + '<br><span class="t-12 muted">' + esc(d.projectName || '') + '</span></td><td class="num">' + fmt(d.requests) + '</td><td class="num">' + WFApp.fmtGB(d.bytes) + ' GB</td></tr>';
          }).join('') + '</tbody></table></section>' +
      '</div>' +
      '<section class="app-section"><h2>性能</h2><table class="table"><thead><tr><th>项目</th><th class="num">首屏时间（中位）</th><th class="num">字体加载中位</th><th class="num">CDN 命中</th><th>加载策略</th></tr></thead><tbody>' +
        perf.map(function (p) {
          return '<tr><td>' + esc(p.name || p.projectId) + '</td><td class="num">' + (p.fcpMs || 0) + ' ms</td><td class="num">' + (p.fontLoadMs || 0) + ' ms</td><td class="num">' + Math.round((p.hitRate || 0) * 100) + '%</td><td class="mono">' + esc((s.settings && s.settings.display) || 'swap') + '</td></tr>';
        }).join('') + '</tbody></table>' +
        '<p class="t-13 muted" style="margin-top:var(--s-4)">由嵌入代码自动统计，仅含已绑定域名。</p></section>';

    bindRange();
    bindInsights();
    document.getElementById('exportCsv').addEventListener('click', function () {
      WFApp.download('windfonts-usage-' + range + 'd.csv', WFApp.toCsv(
        ['字体', 'fontId', '项目', '字重', '请求', '流量(bytes)'],
        byFont.map(function (r) {
          const m = WFApp.fontMeta(r.fontId);
          return [
            m ? m.name : r.fontId,
            r.fontId,
            (r.projects || []).map(function (x) { return x.name || x.projectId; }).join(' / '),
            Object.keys(r.weights || {}).join(' '),
            r.requests30d,
            r.bytes30d
          ];
        })
      ));
    });
  }

  /* —— 单字体钻取 —— */
  function paintFont(u) {
    const m = WFApp.fontMeta(fontId);
    const row = (u.byFont || []).filter(function (x) { return x.fontId === fontId; })[0];
    if (!m || !row) {
      root.innerHTML = '<a class="back" href="usage.html">← 返回用量</a><p class="empty">这款字体近 ' + range + ' 天没有用量记录。</p>';
      return;
    }
    const req = row.requests30d || 0;
    const bytes = row.bytes30d || 0;
    const daily = (u.series && u.series.requests) || [];
    const domains = [];
    (row.projects || []).forEach(function (x) {
      const p = WFApp.project(x.projectId);
      if (!p) return;
      (p.usage.byDomain || []).forEach(function (d) {
        const share = p.usage.requests30d ? x.requests30d / (p.usage.requests30d * (range / 30)) : 0;
        domains.push({
          host: d.host,
          project: p,
          requests30d: Math.round(d.requests30d * (range / 30) * (p.usage.requests30d ? x.requests30d / (Math.round(p.usage.requests30d * range / 30) || 1) : 0)),
          bytes30d: d.bytes30d * (range / 30) * (p.usage.requests30d ? x.requests30d / (Math.round(p.usage.requests30d * range / 30) || 1) : 0)
        });
      });
    });
    domains.sort(function (a, b) { return b.requests30d - a.requests30d; });

    root.innerHTML =
      '<a class="back" href="usage.html?range=' + range + '">← 返回用量</a>' +
      '<div class="app-head"><div><h1>' + esc(m.name) + '</h1><p class="sub">' + WFChrome.faceHtml(m, 18) + esc(WFChrome.brandName(m)) + ' · <span class="mono">' + esc(m.family) + '</span> · ' + (row.projects || []).length + ' 个项目在用</p></div>' +
        '<div class="app-actions">' + rangeTabs() + '<a class="btn" href="../font-detail.html?id=' + esc(fontId) + '">' + WFChrome.icon('external') + '字体页</a></div></div>' +
      '<div class="stats">' +
        '<div class="stat"><div class="v">' + (req / 1000).toFixed(1) + '<small>k</small></div><div class="l">请求</div></div>' +
        '<div class="stat"><div class="v">' + WFApp.fmtGB(bytes) + '<small>GB</small></div><div class="l">流量</div></div>' +
        '<div class="stat"><div class="v">' + Object.keys(row.weights || {}).length + '</div><div class="l">在用字重</div></div>' +
        '<div class="stat"><div class="v">' + (req ? WFEmbed.fmtBytes(bytes / req).replace(' ', '<small>') + '</small>' : '—') + '</div><div class="l">平均每次请求</div></div>' +
      '</div>' +
      '<section class="app-section"><h2>每日请求<span class="more mono">' + range + ' 天</span></h2>' + WFApp.sparkline(daily) +
        '<div class="spark-meta"><span>' + esc((u.series && u.series.from) || (range + ' 天前')) + '</span><span>' + esc((u.series && u.series.to) || '今天') + '</span></div></section>' +
      '<div class="usage-grid">' +
        '<section class="app-section"><h2>按字重</h2>' + weightBars(row.weights, req) +
          weightActions(row) + '</section>' +
        '<section class="app-section"><h2>按项目</h2><table class="table"><thead><tr><th>项目</th><th>字重 · 子集</th><th class="num">请求</th><th class="num">流量</th></tr></thead><tbody>' +
          (row.projects || []).map(function (x) {
            const p = WFApp.project(x.projectId);
            const pf = p && (p.fonts || []).filter(function (f) { return f.fontId === fontId; })[0];
            return '<tr><td><a href="project.html?id=' + esc(x.projectId) + '&tab=fonts">' + esc(x.name || x.projectId) + '</a></td>' +
              '<td>' + (pf ? '<span class="mono">' + pf.weights.join(' · ') + '</span> · ' + esc(WFApp.subsetLabel(pf.subset)) : '—') + '</td>' +
              '<td class="num">' + fmt(x.requests30d) + '</td><td class="num">' + WFApp.fmtGB(x.bytes30d) + ' GB</td></tr>';
          }).join('') + '</tbody></table></section>' +
      '</div>' +
      '<section class="app-section"><h2>按域名</h2><table class="table"><thead><tr><th>域名</th><th>项目</th><th class="num">请求</th><th class="num">流量</th></tr></thead><tbody>' +
        domains.map(function (d) {
          return '<tr><td class="mono">' + esc(d.host) + '</td><td>' + esc(d.project.name) + '</td><td class="num">' + fmt(Math.round(d.requests30d)) + '</td><td class="num">' + WFApp.fmtGB(d.bytes30d) + ' GB</td></tr>';
        }).join('') + '</tbody></table>' +
        '<p class="t-13 muted" style="margin-top:var(--s-4)">按该字体在项目里的请求比例估算。</p></section>';
    document.title = m.name + ' · 用量 · 控制台 · 文风字体';
    bindRange();
    bindInsights();
  }
  function weightActions(u) {
    const ws = u.weights || {};
    const keys = Object.keys(ws);
    const total = keys.reduce(function (a, w) { return a + (ws[w] || 0); }, 0);
    if (keys.length < 2 || !total) return '<p class="t-13 muted" style="margin-top:var(--s-4)">这款字只挂了一个字重。</p>';
    const lows = keys.filter(function (w) { return ws[w] / total < 0.15; });
    if (!lows.length) return '<p class="t-13 muted" style="margin-top:var(--s-4)">各字重都有明显请求。</p>';
    return '<div class="insight" style="margin-top:var(--s-4)">' + lows.map(function (w) {
      return (u.projects || []).map(function (x) {
        const p = WFApp.project(x.projectId);
        const pf = p && (p.fonts || []).filter(function (f) { return f.fontId === fontId; })[0];
        if (!pf || (pf.weights || []).length < 2 || (pf.weights || []).map(String).indexOf(String(w)) === -1) return '';
        return '<div class="row"><span>' + esc(x.name || x.projectId) + ' · ' + esc(w) + ' 占 ' + Math.round(ws[w] / total * 100) + '%</span>' +
          '<button type="button" class="btn-text" data-drop-weight="' + esc(x.projectId) + '|' + esc(fontId) + '|' + esc(w) + '">' + WFChrome.icon('scissors') + '去掉这个字重</button></div>';
      }).join('');
    }).join('') + '</div>';
  }

  function render() {
    root.innerHTML = '<p class="loading">正在加载…</p>';
    const params = { range: range, groupBy: 'project' };
    if (fontId) params.fontId = fontId;
    Promise.all([
      WFApi.getUsage(params),
      WFApi.listBlocked().catch(function () { return []; })
    ]).then(function (pair) {
      if (fontId) paintFont(pair[0]);
      else paintAll(pair[0], pair[1]);
    }).catch(function (err) {
      root.innerHTML = '<p class="empty">用量加载失败：' + esc((err && err.message) || '未知错误') + '</p>';
    });
  }
  Promise.all([WFProto.loadCatalog(), WFApp.load()]).then(render);
})();
