/* 控制台 · 单个项目：字体 / 域名 / 嵌入 / 版本 / 用量 */
(function () {
  if (!WFApp.gate()) return;
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('root');
  const TABS = [['fonts', '字体'], ['domains', '域名'], ['embed', '嵌入'], ['versions', '版本'], ['usage', '用量']];
  let p = null;
  let tab = WFProto.getQuery('tab') || 'fonts';

  function setTab(t) {
    tab = t;
    history.replaceState(null, '', 'project.html?id=' + encodeURIComponent(p.id) + '&tab=' + t);
    render();
  }

  function head() {
    const cur = WFApp.currentVersion(p);
    return '<div class="app-head"><div><p class="crumb"><a href="projects.html">项目</a><span>/</span><span>' + esc(p.name) + '</span></p>' +
      '<h1>' + esc(p.name) + '</h1><p class="sub mono">' + esc(p.slug) + ' · v' + cur.v + ' · ' + p.fonts.length + ' 字体 · ' + WFEmbed.fmtBytes(WFApp.projectBytes(p)) + '</p></div>' +
      '<div class="app-actions"><a class="btn" href="../fonts.html">去字体库</a><a class="btn btn-ink" href="subset.html?project=' + esc(p.id) + '">添加字体</a></div></div>' +
      '<div class="tabs" role="tablist">' + TABS.map(function (t) {
        return '<button type="button" role="tab" data-tab="' + t[0] + '"' + (t[0] === tab ? ' class="is-on"' : '') + '>' + t[1] + '</button>';
      }).join('') + '</div>';
  }

  function fontsPanel() {
    if (!p.fonts.length) return '<div class="panel"><p class="empty">项目里还没有字体。<a href="subset.html?project=' + esc(p.id) + '">去字体库添加</a></p></div>';
    return '<div class="panel"><div class="panel-head"><p>每款字体的字重与子集独立设置；改动会生成新版本。</p></div>' +
      '<table class="table"><thead><tr><th>字体</th><th>字重</th><th>子集</th><th class="num">估算体积</th><th></th></tr></thead><tbody>' +
      p.fonts.map(function (f) {
        const meta = WFProto.getFont(f.fontId) || { name: f.fontId, family: '' };
        return '<tr><td>' + WFChrome.faceHtml(meta, 18) + '<a href="../font-detail.html?id=' + esc(f.fontId) + '">' + esc(meta.name) + '</a><br><span class="mono t-12 muted">' + esc(meta.family) + '</span></td>' +
          '<td class="num">' + f.weights.join(' · ') + '</td><td>' + esc(WFApp.subsetLabel(f.subset)) + '</td>' +
          '<td class="num">' + WFEmbed.fmtBytes(WFApp.subsetBytes(meta, f.subset, f.weights.length)) + '</td>' +
          '<td class="actions"><a class="btn-text" href="subset.html?project=' + esc(p.id) + '&font=' + esc(f.fontId) + '">调整</a> <button type="button" class="btn-text" data-remove-font="' + esc(f.fontId) + '">移除</button></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function domainsPanel() {
    return '<div class="panel"><div class="panel-head"><p>字体文件只对白名单内域名返回。<code>localhost</code> 默认允许。</p>' +
      '<form class="inline-form" id="domainForm"><input class="input" id="domainInput" placeholder="example.com 或 *.example.com" required /><button type="submit" class="btn">添加域名</button></form></div>' +
      (p.domains.length ? '<table class="table"><thead><tr><th>域名</th><th>状态</th><th class="num">30 天请求</th><th>添加于</th><th></th></tr></thead><tbody>' +
        p.domains.map(function (d) {
          const u = (p.usage.byDomain || []).filter(function (x) { return x.host === d.host; })[0];
          return '<tr><td class="mono">' + esc(d.host) + '</td>' +
            '<td><span class="status-dot' + (d.verified ? '' : ' is-pending') + '">' + (d.verified ? '已验证 · ' + (d.method === 'file' ? '文件' : 'DNS') : '待验证') + '</span></td>' +
            '<td class="num">' + (u ? WFProto.formatCount(u.requests30d) : '—') + '</td>' +
            '<td class="mono muted">' + WFApp.fmtDate(d.addedAt).slice(0, 10) + '</td>' +
            '<td class="actions">' + (d.verified ? '' : '<button type="button" class="btn-text" data-verify="' + esc(d.host) + '">我已完成验证</button> ') +
            '<button type="button" class="btn-text" data-remove-domain="' + esc(d.host) + '">移除</button></td></tr>';
        }).join('') + '</tbody></table>' : '<p class="empty">还没绑定域名，字体只能在本地开发环境加载。</p>') +
      '<p class="t-13 muted" style="margin-top:var(--s-5)">验证方式：在站点根目录放置 <code>/.well-known/windfonts-verify.txt</code>，内容为项目 ID <code>' + esc(p.id) + '</code>；或添加 DNS TXT 记录 <code>windfonts=' + esc(p.id) + '</code>。全部域名与拦截记录见<a href="domains.html">域名</a>。</p></div>';
  }

  function embedPanel() {
    return '<div class="panel"><div class="embed-opts">' +
        '<div class="field"><label>加载策略</label><select class="select" id="optDisplay"><option value="">项目默认（' + esc(WFApp.state().settings.display) + '）</option><option value="swap">swap</option><option value="block">block</option><option value="fallback">fallback</option><option value="optional">optional</option></select></div>' +
      '<div class="field"><label>提前加载</label><label class="check" style="margin-top:0.4rem"><input type="checkbox" id="optPreload" /> 提前加载字体样式</label></div>' +
      '<div class="field"><label>项目 CDN</label><span class="mono t-13" style="padding-top:0.5rem;display:block;overflow-wrap:anywhere">cn.windfonts.com/p/' + esc(p.slug) + '/</span></div>' +
      '</div>' +
      '<div class="tabs" role="tablist" style="margin-bottom:var(--s-4)">' +
        '<button type="button" role="tab" data-embed-src="project" class="is-on">项目一份 CSS</button>' +
        '<button type="button" role="tab" data-embed-src="fonts">按字体拆开</button></div>' +
      '<div id="embed"></div>' +
      '<p class="t-13 muted" style="margin-top:var(--s-4)">对外域名一律 <code>cn.windfonts.com</code>。项目地址指向当前版本，回滚或发布后无需改代码。' + (p.fonts.length ? '' : '项目里还没有字体，代码为空。') + '</p></div>';
  }

  function versionsPanel() {
    return '<div class="panel"><div class="panel-head"><p>每次改动都记录一版；回滚会以旧版内容生成新版本，不会丢历史。</p></div>' +
      '<ul class="version-list">' + p.versions.map(function (v) {
        return '<li><span class="v' + (v.current ? ' is-current' : '') + '">v' + v.v + '</span><span class="note">' + esc(v.note) + '</span>' +
          '<span class="num muted">' + WFEmbed.fmtBytes(v.bytes) + '</span><span class="at">' + WFApp.fmtDate(v.at) +
          (v.current ? '' : ' · <button type="button" class="btn-text" data-rollback="' + v.v + '">回滚</button>') + '</span></li>';
      }).join('') + '</ul></div>';
  }

  function usagePanel() {
    const u = p.usage;
    const daily = WFApp.series(p.id, 30, u.requests30d);
    return '<div class="panel"><div class="stats" style="margin-bottom:var(--s-8)">' +
      '<div class="stat"><div class="v">' + WFApp.fmtGB(u.bytes30d) + '<small>GB</small></div><div class="l">30 天流量</div></div>' +
      '<div class="stat"><div class="v">' + (u.requests30d / 1000).toFixed(1) + '<small>k</small></div><div class="l">字体请求</div></div>' +
      '<div class="stat"><div class="v">' + u.perf.fontLoadMs + '<small>ms</small></div><div class="l">字体加载中位</div></div>' +
      '<div class="stat"><div class="v">' + Math.round(u.perf.hitRate * 100) + '<small>%</small></div><div class="l">CDN 命中</div></div></div>' +
      WFApp.sparkline(daily) + '<div class="spark-meta"><span>30 天前</span><span>今天</span></div>' +
      '<div class="usage-grid" style="margin-top:var(--s-8)"><div><h3 class="t-13 muted" style="margin-bottom:var(--s-3)">按页面</h3>' +
        (u.topPages.length ? '<table class="table"><tbody>' + u.topPages.map(function (r) {
          return '<tr><td class="mono">' + esc(r.path) + '</td><td class="num">' + WFProto.formatCount(r.requests) + '</td></tr>';
        }).join('') + '</tbody></table>' : '<p class="muted t-13">暂无数据</p>') + '</div>' +
      '<div><h3 class="t-13 muted" style="margin-bottom:var(--s-3)">按域名</h3><table class="table"><tbody>' +
        (u.byDomain || []).map(function (d) {
          return '<tr><td class="mono">' + esc(d.host) + '</td><td class="num">' + WFProto.formatCount(d.requests30d) + '</td><td class="num">' + WFApp.fmtGB(d.bytes30d) + ' GB</td></tr>';
        }).join('') + '</tbody></table>' +
      '<h3 class="t-13 muted" style="margin:var(--s-5) 0 var(--s-3)">按字体</h3><table class="table"><tbody>' +
        (u.byFont || []).map(function (f) {
          const m = WFProto.getFont(f.fontId);
          return '<tr><td><a href="usage.html?font=' + esc(f.fontId) + '">' + esc(m ? m.name : f.fontId) + '</a></td><td class="num">' + WFProto.formatCount(f.requests30d) + '</td><td class="num">' + WFApp.fmtGB(f.bytes30d) + ' GB</td></tr>';
        }).join('') + '</tbody></table></div></div></div>';
  }

  function render() {
    const panels = { fonts: fontsPanel, domains: domainsPanel, embed: embedPanel, versions: versionsPanel, usage: usagePanel };
    root.innerHTML = head() + (panels[tab] || fontsPanel)();
    root.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { setTab(b.getAttribute('data-tab')); }); });

    root.querySelectorAll('[data-remove-font]').forEach(function (b) {
      b.addEventListener('click', function () {
        const id = b.getAttribute('data-remove-font');
        const meta = WFProto.getFont(id);
        WFChrome.confirm({ title: '从项目移除字体', message: '将「' + (meta ? meta.name : id) + '」移出本项目，并生成新版本。已上线的嵌入代码会在发布后不再包含这款字体。', ok: '移除' }).then(function (ok) {
          if (!ok) return;
          WFApp.removeFont(p, id);
          WFChrome.toast('已移除，生成新版本');
          render();
        });
      });
    });
    const df = document.getElementById('domainForm');
    if (df) df.addEventListener('submit', function (e) {
      e.preventDefault();
      const v = document.getElementById('domainInput').value;
      if (!WFApp.validHost(v)) { WFChrome.toast('域名格式不对'); return; }
      if (WFApp.addDomain(p, v)) { WFChrome.toast('已添加，待验证'); render(); } else WFChrome.toast('域名已存在');
    });
    root.querySelectorAll('[data-verify]').forEach(function (b) {
      b.addEventListener('click', function () { WFApp.verifyDomain(p, b.getAttribute('data-verify')); WFChrome.toast('验证通过'); render(); });
    });
    root.querySelectorAll('[data-remove-domain]').forEach(function (b) {
      b.addEventListener('click', function () {
        const host = b.getAttribute('data-remove-domain');
        WFChrome.confirm({ title: '移除域名', message: '移除后，' + host + ' 将无法加载字体。确认已从站点卸下嵌入代码再操作。', ok: '移除' }).then(function (ok) {
          if (!ok) return;
          WFApp.removeDomain(p, host);
          WFChrome.toast('已移除');
          render();
        });
      });
    });
    root.querySelectorAll('[data-rollback]').forEach(function (b) {
      b.addEventListener('click', function () {
        const v = parseInt(b.getAttribute('data-rollback'), 10);
        WFChrome.confirm({ title: '回滚到 v' + v, message: '会以 v' + v + ' 的内容生成一个新版本，当前版本仍保留在历史里。嵌入地址不变，发布后立刻生效。', ok: '回滚' }).then(function (ok) {
          if (!ok) return;
          WFApp.rollback(p, v);
          WFChrome.toast('已回滚');
          render();
        });
      });
    });

    const embedEl = document.getElementById('embed');
    if (embedEl) {
      const items = p.fonts.map(function (f) {
        return { family: (WFProto.getFont(f.fontId) || {}).family || f.fontId, weights: f.weights, version: f.subset && f.subset.mode === 'common' ? 'zh' : '' };
      });
      let src = 'project';
      let m = null;
      function opts() {
        return { display: document.getElementById('optDisplay').value, preload: document.getElementById('optPreload').checked, slug: p.slug };
      }
      function paint() {
        if (src === 'project') {
          embedEl.innerHTML = '<div class="code"><button type="button" class="copy">' + WFChrome.icon('copy') + '复制</button><pre></pre></div>';
          embedEl.querySelector('pre').textContent = WFEmbed.code('project', [], opts());
          embedEl.querySelector('.copy').addEventListener('click', function () { WFChrome.copy(embedEl.querySelector('pre').textContent, '已复制代码'); });
        } else {
          m = WFEmbed.mount(embedEl, items, opts());
        }
      }
      paint();
      root.querySelectorAll('[data-embed-src]').forEach(function (b) {
        b.addEventListener('click', function () {
          src = b.getAttribute('data-embed-src');
          root.querySelectorAll('[data-embed-src]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
          paint();
        });
      });
      document.getElementById('optDisplay').addEventListener('change', function () {
        if (src === 'project') paint(); else if (m) m.setOpts(opts());
      });
      document.getElementById('optPreload').addEventListener('change', function () {
        if (src === 'project') paint(); else if (m) m.setOpts(opts());
      });
    }
  }

  Promise.all([WFProto.loadCatalog(), WFApp.load()]).then(function () {
    p = WFApp.project(WFProto.getQuery('id')) || WFApp.projects()[0];
    if (!p) { root.innerHTML = '<p class="empty">没有项目。<a href="projects.html?new=1">新建一个</a></p>'; return; }
    document.title = p.name + ' · 控制台 · 文风字体';
    render();
  });
})();
