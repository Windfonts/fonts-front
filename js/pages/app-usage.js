/* 控制台 · 用量：总览（按项目 / 按字体 / 按域名 / 状态码 / 性能）+ 单字体钻取（?font=） */
(function () {
  if (!WFApp.gate()) return;
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('root');
  const fmt = WFProto.formatCount;
  let range = parseInt(WFProto.getQuery('range') || '30', 10);
  if ([7, 30, 90].indexOf(range) === -1) range = 30;
  const fontId = WFProto.getQuery('font');

  function scale() { return range / 30; }
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
    const ws = Object.keys(weights).sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });
    if (!ws.length) return '<p class="muted t-13">暂无数据</p>';
    return '<div class="weight-bars">' + ws.map(function (w) {
      const n = Math.round(weights[w] * scale());
      const pct = total ? Math.round(weights[w] / total * 100) : 0;
      return '<div><span class="mono">' + esc(w) + ' · ' + esc(WFProto.weightName('', w)) + '</span><span class="bar"><i style="width:' + pct + '%"></i></span><span class="num">' + fmt(n) + ' · ' + pct + '%</span></div>';
    }).join('') + '</div>';
  }

  /* —— 总览 —— */
  function renderAll() {
    const s = WFApp.state();
    const ps = WFApp.projects();
    const k = scale();
    const req = Math.round(ps.reduce(function (a, p) { return a + p.usage.requests30d; }, 0) * k);
    const bytes = ps.reduce(function (a, p) { return a + p.usage.bytes30d; }, 0) * k;
    const quotaGB = s.plan.quota.trafficGB;
    const pct = Math.min(100, Math.round(bytes / 1e9 / quotaGB * 100));
    const daily = WFApp.series('all-' + range, range, req);
    const byFont = WFApp.usageByFont();
    const domains = WFApp.allDomains().filter(function (d) { return d.verified; }).sort(function (a, b) { return b.requests30d - a.requests30d; });
    const st = WFApp.statusTotals();
    const stSum = st['200'] + st['304'] + st['403'] || 1;
    const blocked = Math.round(st['403'] * k);

    root.innerHTML =
      '<div class="app-head"><div><h1>用量</h1><p class="sub">' + s.plan.name + '版 · 月流量配额 ' + quotaGB + ' GB · 超出按 ¥0.8 / GB · 数据延迟约 5 分钟</p></div>' +
        '<div class="app-actions">' + rangeTabs() + '<button type="button" class="btn" id="exportCsv">' + WFChrome.icon('download') + '导出 CSV</button></div></div>' +
      '<div class="stats">' +
        '<div class="stat"><div class="v">' + WFApp.fmtGB(bytes) + '<small>GB · ' + pct + '%</small></div><div class="l">字体流量 / 配额</div></div>' +
        '<div class="stat"><div class="v">' + (req / 1000).toFixed(1) + '<small>k</small></div><div class="l">字体请求</div></div>' +
        '<div class="stat"><div class="v">' + fmt(blocked) + '</div><div class="l">未授权访问</div></div>' +
        '<div class="stat"><div class="v">' + (req ? WFEmbed.fmtBytes(bytes / req).replace(' ', '<small>') + '</small>' : '—') + '</div><div class="l">平均每次请求</div></div>' +
      '</div>' +
      '<section class="app-section"><h2>每日请求<span class="more mono">' + range + ' 天</span></h2>' + WFApp.sparkline(daily) +
        '<div class="spark-meta"><span>' + range + ' 天前</span><span>今天</span></div>' +
        '<div class="status-row"><span><b>' + Math.round(st['200'] / stSum * 100) + '%</b>成功下发</span><span><b>' + Math.round(st['304'] / stSum * 100) + '%</b>缓存命中</span><span><b>' + Math.round(st['403'] / stSum * 100) + '%</b>被拒</span></div></section>' +
      '<section class="app-section"><h2>按字体<span class="more mono">' + byFont.length + ' 款</span></h2>' +
        '<table class="table"><thead><tr><th>字体</th><th>厂商</th><th>项目</th><th>字重</th><th class="num">请求</th><th class="num">流量</th><th class="num">占比</th></tr></thead><tbody>' +
        byFont.map(function (r) {
          const m = WFProto.getFont(r.fontId);
          const ws = Object.keys(r.weights).sort();
          return '<tr><td><a href="usage.html?font=' + esc(r.fontId) + '&range=' + range + '">' + esc(m ? m.name : r.fontId) + '</a></td>' +
            '<td>' + esc(m ? WFChrome.brandShort(m) : '—') + '</td>' +
            '<td>' + r.projects.map(function (x) { return '<a href="project.html?id=' + esc(x.p.id) + '&tab=usage">' + esc(x.p.name) + '</a>'; }).join(' · ') + '</td>' +
            '<td class="mono">' + ws.join(' · ') + '</td>' +
            '<td class="num">' + fmt(Math.round(r.requests30d * k)) + '</td><td class="num">' + WFApp.fmtGB(r.bytes30d * k) + ' GB</td>' +
            '<td class="num">' + (req ? Math.round(r.requests30d * k / req * 100) : 0) + '%</td></tr>';
        }).join('') + '</tbody></table></section>' +
      '<div class="usage-grid">' +
        '<section class="app-section"><h2>按项目</h2><table class="table"><thead><tr><th>项目</th><th class="num">请求</th><th class="num">流量</th><th class="num">命中</th></tr></thead><tbody>' +
          ps.map(function (p) {
            return '<tr><td><a href="project.html?id=' + esc(p.id) + '&tab=usage">' + esc(p.name) + '</a></td><td class="num">' + fmt(Math.round(p.usage.requests30d * k)) + '</td>' +
              '<td class="num">' + WFApp.fmtGB(p.usage.bytes30d * k) + ' GB</td><td class="num">' + Math.round(p.usage.perf.hitRate * 100) + '%</td></tr>';
          }).join('') + '</tbody></table></section>' +
        '<section class="app-section"><h2>按域名<a class="more" href="domains.html">管理 →</a></h2><table class="table"><thead><tr><th>域名</th><th class="num">请求</th><th class="num">流量</th></tr></thead><tbody>' +
          domains.map(function (d) {
            return '<tr><td class="mono">' + esc(d.host) + '<br><span class="t-12 muted">' + esc(d.project.name) + '</span></td><td class="num">' + fmt(Math.round(d.requests30d * k)) + '</td><td class="num">' + WFApp.fmtGB(d.bytes30d * k) + ' GB</td></tr>';
          }).join('') + '</tbody></table></section>' +
      '</div>' +
      '<section class="app-section"><h2>性能</h2><table class="table"><thead><tr><th>项目</th><th class="num">首屏时间（中位）</th><th class="num">字体加载中位</th><th class="num">CDN 命中</th><th>加载策略</th></tr></thead><tbody>' +
        ps.map(function (p) {
          return '<tr><td>' + esc(p.name) + '</td><td class="num">' + p.usage.perf.fcpMs + ' ms</td><td class="num">' + p.usage.perf.fontLoadMs + ' ms</td><td class="num">' + Math.round(p.usage.perf.hitRate * 100) + '%</td><td class="mono">' + esc(s.settings.display) + '</td></tr>';
        }).join('') + '</tbody></table>' +
        '<p class="t-13 muted" style="margin-top:var(--s-4)">由嵌入代码自动统计，仅含已绑定域名。</p></section>';

    bindRange();
    document.getElementById('exportCsv').addEventListener('click', function () {
      WFApp.download('windfonts-usage-' + range + 'd.csv', WFApp.toCsv(
        ['字体', 'fontId', '项目', '字重', '请求', '流量(bytes)'],
        byFont.map(function (r) {
          const m = WFProto.getFont(r.fontId);
          return [m ? m.name : r.fontId, r.fontId, r.projects.map(function (x) { return x.p.name; }).join(' / '), Object.keys(r.weights).join(' '), Math.round(r.requests30d * k), Math.round(r.bytes30d * k)];
        })
      ));
    });
  }

  /* —— 单字体钻取 —— */
  function renderFont() {
    const m = WFProto.getFont(fontId);
    const u = WFApp.fontUsage(fontId);
    const k = scale();
    if (!m || !u) {
      root.innerHTML = '<a class="back" href="usage.html">← 返回用量</a><p class="empty">这款字体近 ' + range + ' 天没有用量记录。</p>';
      return;
    }
    const req = Math.round(u.requests30d * k);
    const bytes = u.bytes30d * k;
    const daily = WFApp.series('font-' + fontId + '-' + range, range, req);
    const domains = [];
    u.projects.forEach(function (x) {
      (x.p.usage.byDomain || []).forEach(function (d) {
        const share = x.p.usage.requests30d ? x.requests30d / x.p.usage.requests30d : 0;
        domains.push({ host: d.host, project: x.p, requests30d: Math.round(d.requests30d * share), bytes30d: d.bytes30d * share });
      });
    });
    domains.sort(function (a, b) { return b.requests30d - a.requests30d; });

    root.innerHTML =
      '<a class="back" href="usage.html?range=' + range + '">← 返回用量</a>' +
      '<div class="app-head"><div><h1>' + esc(m.name) + '</h1><p class="sub">' + WFChrome.faceHtml(m, 18) + esc(WFChrome.brandName(m)) + ' · <span class="mono">' + esc(m.family) + '</span> · ' + u.projects.length + ' 个项目在用</p></div>' +
        '<div class="app-actions">' + rangeTabs() + '<a class="btn" href="../font-detail.html?id=' + esc(fontId) + '">' + WFChrome.icon('external') + '字体页</a></div></div>' +
      '<div class="stats">' +
        '<div class="stat"><div class="v">' + (req / 1000).toFixed(1) + '<small>k</small></div><div class="l">请求</div></div>' +
        '<div class="stat"><div class="v">' + WFApp.fmtGB(bytes) + '<small>GB</small></div><div class="l">流量</div></div>' +
        '<div class="stat"><div class="v">' + Object.keys(u.weights).length + '</div><div class="l">在用字重</div></div>' +
        '<div class="stat"><div class="v">' + (req ? WFEmbed.fmtBytes(bytes / req).replace(' ', '<small>') + '</small>' : '—') + '</div><div class="l">平均每次请求</div></div>' +
      '</div>' +
      '<section class="app-section"><h2>每日请求<span class="more mono">' + range + ' 天</span></h2>' + WFApp.sparkline(daily) +
        '<div class="spark-meta"><span>' + range + ' 天前</span><span>今天</span></div></section>' +
      '<div class="usage-grid">' +
        '<section class="app-section"><h2>按字重</h2>' + weightBars(u.weights, u.requests30d) +
          '<p class="t-13 muted" style="margin-top:var(--s-4)">很少被请求的字重可以从项目里移掉，减少版本体积。</p></section>' +
        '<section class="app-section"><h2>按项目</h2><table class="table"><thead><tr><th>项目</th><th>字重 · 子集</th><th class="num">请求</th><th class="num">流量</th></tr></thead><tbody>' +
          u.projects.map(function (x) {
            const pf = x.p.fonts.filter(function (f) { return f.fontId === fontId; })[0];
            return '<tr><td><a href="project.html?id=' + esc(x.p.id) + '&tab=fonts">' + esc(x.p.name) + '</a></td>' +
              '<td>' + (pf ? '<span class="mono">' + pf.weights.join(' · ') + '</span> · ' + esc(WFApp.subsetLabel(pf.subset)) : '—') + '</td>' +
              '<td class="num">' + fmt(Math.round(x.requests30d * k)) + '</td><td class="num">' + WFApp.fmtGB(x.bytes30d * k) + ' GB</td></tr>';
          }).join('') + '</tbody></table></section>' +
      '</div>' +
      '<section class="app-section"><h2>按域名</h2><table class="table"><thead><tr><th>域名</th><th>项目</th><th class="num">请求</th><th class="num">流量</th></tr></thead><tbody>' +
        domains.map(function (d) {
          return '<tr><td class="mono">' + esc(d.host) + '</td><td>' + esc(d.project.name) + '</td><td class="num">' + fmt(Math.round(d.requests30d * k)) + '</td><td class="num">' + WFApp.fmtGB(d.bytes30d * k) + ' GB</td></tr>';
        }).join('') + '</tbody></table>' +
        '<p class="t-13 muted" style="margin-top:var(--s-4)">按该字体在项目里的请求比例估算。</p></section>';
    document.title = m.name + ' · 用量 · 控制台 · 文风字体';
    bindRange();
  }

  function render() { if (fontId) renderFont(); else renderAll(); }
  Promise.all([WFProto.loadCatalog(), WFApp.load()]).then(render);
})();
