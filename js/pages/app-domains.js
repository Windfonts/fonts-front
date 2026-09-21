/* 控制台 · 域名：全部项目的白名单域名、验证、30 天用量、白名单外拦截（403） */
(function () {
  if (!WFApp.gate()) return;
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('root');

  function statusHtml(d) {
    if (d.verified) return '<span class="status-dot">已验证 · ' + (d.method === 'file' ? '文件' : 'DNS') + '</span>';
    return '<span class="status-dot is-pending">待验证</span>';
  }

  function render() {
    const ps = WFApp.projects();
    const ds = WFApp.allDomains().sort(function (a, b) { return b.requests30d - a.requests30d; });
    const verified = ds.filter(function (d) { return d.verified; });
    const pending = ds.filter(function (d) { return !d.verified; });
    const blocked = WFApp.blockedHosts();
    const req = ds.reduce(function (a, d) { return a + d.requests30d; }, 0);
    const blockedReq = blocked.reduce(function (a, b) { return a + b.requests30d; }, 0);
    const first = ps[0];

    root.innerHTML =
      '<div class="app-head"><div><h1>域名</h1><p class="sub">字体文件只对白名单内域名返回；其余来源一律 403，并记录在下方拦截列表。</p></div>' +
        '<div class="app-actions"><button type="button" class="btn" id="exportCsv">' + WFChrome.icon('download') + '导出 CSV</button></div></div>' +
      '<div class="stats">' +
        '<div class="stat"><div class="v">' + verified.length + '<small>/ ' + ds.length + '</small></div><div class="l">已验证域名</div></div>' +
        '<div class="stat"><div class="v">' + pending.length + '</div><div class="l">待验证</div></div>' +
        '<div class="stat"><div class="v">' + (req / 1000).toFixed(1) + '<small>k</small></div><div class="l">30 天白名单请求</div></div>' +
        '<div class="stat"><div class="v">' + WFProto.formatCount(blockedReq) + '</div><div class="l">30 天拦截（403）</div></div>' +
      '</div>' +
      '<section class="app-section"><h2>添加域名</h2>' +
        '<form class="inline-form" id="domainForm">' +
          '<input class="input" id="domainInput" placeholder="example.com 或 *.example.com" required aria-label="域名" />' +
          '<select class="select" id="domainProject" aria-label="所属项目">' + ps.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>'; }).join('') + '</select>' +
          '<select class="select" id="domainMethod" aria-label="验证方式"><option value="dns">DNS TXT 验证</option><option value="file">文件验证</option></select>' +
          '<button type="submit" class="btn btn-ink">' + WFChrome.icon('plus') + '添加</button></form>' +
        '<p class="t-13 muted" style="margin-top:var(--s-3)">通配符 <code>*.example.com</code> 覆盖所有子域，不含根域名；<code>localhost</code> 与 <code>127.0.0.1</code> 默认放行，便于本地开发。</p></section>' +
      '<section class="app-section"><h2>白名单<span class="more mono">' + ds.length + ' 个</span></h2>' +
        (ds.length ? '<table class="table"><thead><tr><th>域名</th><th>项目</th><th>状态</th><th class="num">30 天请求</th><th class="num">30 天流量</th><th>最近访问</th><th></th></tr></thead><tbody>' +
          ds.map(function (d) {
            return '<tr><td class="mono">' + esc(d.host) + '</td>' +
              '<td><a href="project.html?id=' + esc(d.project.id) + '&tab=domains">' + esc(d.project.name) + '</a></td>' +
              '<td>' + statusHtml(d) + '</td>' +
              '<td class="num">' + (d.verified ? WFProto.formatCount(d.requests30d) : '—') + '</td>' +
              '<td class="num">' + (d.verified ? WFApp.fmtGB(d.bytes30d) + ' GB' : '—') + '</td>' +
              '<td class="mono muted">' + (d.lastSeenAt ? WFApp.fmtDate(d.lastSeenAt) : '—') + '</td>' +
              '<td class="actions">' + (d.verified ? '' : '<button type="button" class="btn-text" data-verify="' + esc(d.project.id) + '|' + esc(d.host) + '">' + WFChrome.icon('check') + '我已完成验证</button> ') +
                '<button type="button" class="btn-text" data-remove="' + esc(d.project.id) + '|' + esc(d.host) + '">' + WFChrome.icon('trash') + '移除</button></td></tr>';
          }).join('') + '</tbody></table>' : '<p class="empty">还没有域名。添加后字体才能在线上加载。</p>') + '</section>' +
      '<section class="app-section"><h2>白名单外的拉取<span class="more mono">近 30 天</span></h2>' +
        (blocked.length ? '<table class="table"><thead><tr><th>来源</th><th>请求的项目</th><th class="num">被拦截请求</th><th>最近一次</th><th></th></tr></thead><tbody>' +
          blocked.map(function (b) {
            return '<tr><td class="mono">' + esc(b.host) + '</td><td>' + esc(b.project.name) + '</td><td class="num">' + WFProto.formatCount(b.requests30d) + '</td>' +
              '<td class="mono muted">' + WFApp.fmtDate(b.lastAt) + '</td>' +
              '<td class="actions">' + (WFApp.validHost(b.host.replace(/:\d+$/, '')) ? '<button type="button" class="btn-text" data-allow="' + esc(b.project.id) + '|' + esc(b.host.replace(/:\d+$/, '')) + '">' + WFChrome.icon('plus') + '加入白名单</button>' : '<span class="muted t-12">本地端口，无需加入</span>') + '</td></tr>';
          }).join('') + '</tbody></table>' : '<p class="empty">近 30 天没有白名单外的拉取。</p>') +
        '<p class="t-13 muted" style="margin-top:var(--s-4)">拦截依据请求的 <code>Referer</code> / <code>Origin</code>。如果是你自己的新域名，直接加入白名单；如果是盗用，保持拦截即可，不计入你的流量。</p></section>' +
      '<section class="app-section"><h2>验证方法</h2><div class="usage-grid">' +
        '<div><h3 class="t-13 muted" style="margin-bottom:var(--s-3)">方式一 · DNS TXT（推荐，覆盖通配符）</h3>' +
          '<div class="code"><pre>_windfonts.example.com  TXT  "windfonts=' + esc(first ? first.id : 'p-xxxx') + '"</pre></div>' +
          '<p class="t-13 muted" style="margin-top:var(--s-3)">记录生效后点「我已完成验证」，我们会在 10 分钟内完成校验。</p></div>' +
        '<div><h3 class="t-13 muted" style="margin-bottom:var(--s-3)">方式二 · 文件（适合无法改 DNS 的站点）</h3>' +
          '<div class="code"><pre>https://example.com/.well-known/windfonts-verify.txt\n' + esc(first ? first.id : 'p-xxxx') + '</pre></div>' +
          '<p class="t-13 muted" style="margin-top:var(--s-3)">文件内容为项目 ID，纯文本，不含空格与换行以外的字符。</p></div>' +
      '</div></section>';

    document.getElementById('domainForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const host = document.getElementById('domainInput').value;
      const p = WFApp.project(document.getElementById('domainProject').value);
      const method = document.getElementById('domainMethod').value;
      if (!WFApp.validHost(host)) { WFChrome.toast('域名格式不对'); return; }
      if (!p) return;
      if (WFApp.addDomain(p, host, method)) { WFChrome.toast('已添加，待验证'); render(); } else WFChrome.toast('该项目下已有此域名');
    });
    function pair(v) { const i = v.indexOf('|'); return { p: WFApp.project(v.slice(0, i)), host: v.slice(i + 1) }; }
    root.querySelectorAll('[data-verify]').forEach(function (b) {
      b.addEventListener('click', function () { const x = pair(b.getAttribute('data-verify')); WFApp.verifyDomain(x.p, x.host); WFChrome.toast('验证通过'); render(); });
    });
    root.querySelectorAll('[data-remove]').forEach(function (b) {
      b.addEventListener('click', function () {
        const x = pair(b.getAttribute('data-remove'));
        WFChrome.confirm({ title: '移除域名', message: '将 ' + x.host + ' 从「' + (x.p ? x.p.name : '') + '」白名单移除。该域名上的字体请求会被 403。', ok: '移除' }).then(function (ok) {
          if (!ok) return;
          WFApp.removeDomain(x.p, x.host);
          WFChrome.toast('已移除');
          render();
        });
      });
    });
    root.querySelectorAll('[data-allow]').forEach(function (b) {
      b.addEventListener('click', function () {
        const x = pair(b.getAttribute('data-allow'));
        if (WFApp.addDomain(x.p, x.host, 'dns')) { WFChrome.toast('已加入白名单，待验证'); render(); } else WFChrome.toast('已在白名单');
      });
    });
    document.getElementById('exportCsv').addEventListener('click', function () {
      WFApp.download('windfonts-domains.csv', WFApp.toCsv(
        ['域名', '项目', '状态', '验证方式', '30天请求', '30天流量(bytes)', '添加于', '最近访问'],
        ds.map(function (d) { return [d.host, d.project.name, d.verified ? '已验证' : '待验证', d.method || '', d.requests30d, d.bytes30d, d.addedAt, d.lastSeenAt || '']; })
      ));
    });
  }

  Promise.all([WFProto.loadCatalog(), WFApp.load()]).then(render);
})();
