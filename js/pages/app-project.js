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
      '<div class="app-actions"><a class="btn" href="../fonts.html">' + WFChrome.icon('font-size') + '去字体库</a><a class="btn btn-ink" href="subset.html?project=' + esc(p.id) + '">' + WFChrome.icon('plus') + '添加字体</a></div></div>' +
      '<div class="tabs" role="tablist">' + TABS.map(function (t) {
        return '<button type="button" role="tab" data-tab="' + t[0] + '"' + (t[0] === tab ? ' class="is-on"' : '') + '>' + t[1] + '</button>';
      }).join('') + '</div>';
  }

  function fontsPanel() {
    if (!p.fonts.length) return '<div class="panel"><p class="empty">项目里还没有字体。<a href="subset.html?project=' + esc(p.id) + '">去字体库添加</a></p></div>';
    return '<div class="panel"><div class="panel-head"><p>每款字体的字重与子集独立设置；改动会生成新版本。</p></div>' +
      '<table class="table"><thead><tr><th>字体</th><th>字重</th><th>子集</th><th class="num">估算体积</th><th></th></tr></thead><tbody>' +
      p.fonts.map(function (f) {
        const meta = WFApp.fontMeta(f.fontId) || { name: f.fontId, family: '' };
        return '<tr><td>' + WFChrome.faceHtml(meta, 18) + '<a href="../font-detail.html?id=' + esc(f.fontId) + '">' + esc(meta.name) + '</a><br><span class="mono t-12 muted">' + esc(meta.family) + '</span></td>' +
          '<td class="mono">' + f.weights.join(' · ') + '</td><td>' + esc(WFApp.subsetLabel(f.subset)) + '</td>' +
          '<td class="num">' + WFEmbed.fmtBytes(WFApp.subsetBytes(meta, f.subset, f.weights.length)) + '</td>' +
          '<td class="actions"><a class="btn-text" href="subset.html?project=' + esc(p.id) + '&font=' + esc(f.fontId) + '">' + WFChrome.icon('scissors') + '调整</a> <button type="button" class="btn-text" data-remove-font="' + esc(f.fontId) + '">' + WFChrome.icon('trash') + '移除</button></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function domainsPanel() {
    return '<div class="panel"><div class="panel-head"><p>字体文件只对白名单内域名返回。<code>localhost</code> 默认允许。</p>' +
      '<form class="inline-form" id="domainForm"><input class="input" id="domainInput" placeholder="example.com 或 *.example.com" aria-label="域名" required /><button type="submit" class="btn">' + WFChrome.icon('plus') + '添加域名</button></form></div>' +
      (p.domains.length ? '<table class="table"><thead><tr><th>域名</th><th>状态</th><th class="num">30 天请求</th><th>添加于</th><th></th></tr></thead><tbody>' +
        p.domains.map(function (d) {
          const u = (p.usage.byDomain || []).filter(function (x) { return x.host === d.host; })[0];
          return '<tr><td class="mono">' + esc(d.host) + '</td>' +
            '<td><span class="status-dot' + (d.verified ? '' : ' is-pending') + '">' + (d.verified ? '已验证 · ' + (d.method === 'file' ? '文件' : 'DNS') : '待验证') + '</span></td>' +
            '<td class="num">' + (u ? WFProto.formatCount(u.requests30d) : '—') + '</td>' +
            '<td class="mono muted">' + WFApp.fmtDate(d.addedAt).slice(0, 10) + '</td>' +
            '<td class="actions">' + (d.verified ? '' : '<button type="button" class="btn-text" data-verify="' + esc(d.host) + '">' + WFChrome.icon('check') + '我已完成验证</button> ') +
            '<button type="button" class="btn-text" data-remove-domain="' + esc(d.host) + '">' + WFChrome.icon('trash') + '移除</button></td></tr>';
        }).join('') + '</tbody></table>' : '<p class="empty">还没绑定域名，字体只能在本地开发环境加载。</p>') +
      '<p class="t-13 muted" style="margin-top:var(--s-5)">验证方式任选：DNS TXT <code>_windfonts.example.com</code> 的值为 <code>windfonts=' + esc(p.id) + '</code>；或在站点根目录放置 <code>/.well-known/windfonts-verify.txt</code>，内容为项目 ID <code>' + esc(p.id) + '</code>。全部域名与拦截记录见<a href="domains.html">域名</a>。</p></div>';
  }

  function embedPanel() {
    const d = p.delivery;
    const accountDisplay = WFApp.state().settings.display;
    function sel(id, label, options, current) {
      return '<div class="field"><label for="' + id + '">' + label + '</label><select class="select" id="' + id + '">' +
        options.map(function (o) {
          return '<option value="' + esc(o.value) + '"' + (o.value === current ? ' selected' : '') + '>' + esc(o.label) + '</option>';
        }).join('') + '</select></div>';
    }
    return '<div class="panel"><div class="embed-opts">' +
        sel('optDisplay', '加载策略', [
          { value: '', label: '跟随账号（' + accountDisplay + '）' },
          { value: 'swap', label: 'swap' }, { value: 'block', label: 'block' },
          { value: 'fallback', label: 'fallback' }, { value: 'optional', label: 'optional' }
        ], d.display) +
      '<div class="field"><label>提前加载</label><label class="check"><input type="checkbox" id="optPreload"' + (d.preload ? ' checked' : '') + ' /> 提前加载字体样式</label></div>' +
      '<div class="field field-cdn"><label>项目 CDN</label><span class="mono t-13" id="projectCdn"></span></div>' +
      '</div>' +
      '<div class="embed-opts embed-more">' +
        sel('optSubset', '字符包', [
          { value: 'full', label: '完整' }, { value: 'zh', label: '中文' },
          { value: 'zh-common', label: '常用字' }, { value: 'en', label: '西文' }
        ], d.subset) +
        sel('optCdn', '节点', [
          { value: 'cn', label: '中国' }, { value: 'hk', label: '香港' }, { value: 'en', label: '国际' }
        ], d.cdn) +
        sel('optStruct', '地址', [
          { value: 'dynamic', label: '动态' }, { value: 'static', label: '静态' }
        ], d.structure) +
        '<div class="field"><label for="optAlias">字体名前缀</label><input class="input" id="optAlias" value="' + esc(d.alias) + '" placeholder="留空为 wenfeng-" autocomplete="off" /></div>' +
      '</div>' +
      '<div class="tabs" role="tablist">' +
        '<button type="button" role="tab" data-embed-src="project" class="is-on">项目一份 CSS</button>' +
        '<button type="button" role="tab" data-embed-src="fonts">按字体拆开</button></div>' +
      '<div id="embed"></div>' +
      '<p class="t-13 muted" style="margin-top:var(--s-4)">项目地址指向当前版本。节点上还没有 <code>/p/…/index.css</code> 时，这条链接会打开失败。' + (p.fonts.length ? '' : '项目里还没有字体，代码为空。') + '</p></div>';
  }

  function versionsPanel() {
    return '<div class="panel"><div class="panel-head"><p>每次改动都记录一版；回滚会以旧版内容生成新版本，不会丢历史。</p></div>' +
      '<ul class="version-list">' + p.versions.map(function (v) {
        return '<li><span class="v' + (v.current ? ' is-current' : '') + '">v' + v.v + '</span><span class="note">' + esc(v.note) + '</span>' +
          '<span class="num muted">' + WFEmbed.fmtBytes(v.bytes) + '</span><span class="at">' + WFApp.fmtDate(v.at) +
          (v.current ? '' : ' · <button type="button" class="btn-text" data-rollback="' + v.v + '">' + WFChrome.icon('history') + '回滚</button>') + '</span></li>';
      }).join('') + '</ul></div>';
  }

  function projectUsageActs() {
    const lows = [];
    (p.usage.byFont || []).forEach(function (f) {
      const ws = f.weights || {};
      const keys = Object.keys(ws);
      const total = keys.reduce(function (a, w) { return a + (ws[w] || 0); }, 0);
      const row = (p.fonts || []).filter(function (x) { return x.fontId === f.fontId; })[0];
      if (!row || keys.length < 2 || !total || (row.weights || []).length < 2) return;
      keys.forEach(function (w) {
        if ((row.weights || []).map(String).indexOf(String(w)) === -1) return;
        if (ws[w] / total < 0.15) lows.push({ fontId: f.fontId, weight: w, pct: Math.round(ws[w] / total * 100) });
      });
    });
    const blocked = (p.usage.blockedHosts || []).map(function (b) {
      const host = String(b.host || '').replace(/:\d+$/, '').toLowerCase();
      if (!host || host === 'localhost' || host === '127.0.0.1' || !WFApp.validHost(host)) return null;
      return { host: host, requests30d: b.requests30d };
    }).filter(Boolean);
    if (!lows.length && !blocked.length) return '';
    return '<div class="insight" style="margin-top:var(--s-6)">' +
      lows.map(function (d) {
        const meta = WFApp.fontMeta(d.fontId);
        return '<div class="row"><span>' + esc(meta ? meta.name : d.fontId) + ' · ' + esc(d.weight) + ' 占 ' + d.pct + '%</span>' +
          '<button type="button" class="btn-text" data-drop-weight="' + esc(d.fontId) + '|' + esc(d.weight) + '">' + WFChrome.icon('scissors') + '去掉这个字重</button></div>';
      }).join('') +
      blocked.map(function (b) {
        return '<div class="row"><span>' + esc(b.host) + ' 被拒 ' + WFProto.formatCount(b.requests30d) + ' 次</span>' +
          '<button type="button" class="btn-text" data-allow-host="' + esc(b.host) + '">' + WFChrome.icon('plus') + '加入白名单</button></div>';
      }).join('') + '</div>';
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
      projectUsageActs() +
      '<h3 class="t-13 muted" style="margin:var(--s-5) 0 var(--s-3)">按字体</h3><table class="table"><tbody>' +
        (u.byFont || []).map(function (f) {
          const m = WFApp.fontMeta(f.fontId);
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
        const meta = WFApp.fontMeta(id);
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
    root.querySelectorAll('[data-drop-weight]').forEach(function (b) {
      b.addEventListener('click', function () {
        const parts = b.getAttribute('data-drop-weight').split('|');
        const meta = WFApp.fontMeta(parts[0]);
        WFChrome.confirm({ title: '去掉字重', message: '从「' + (meta ? meta.name : parts[0]) + '」去掉 ' + parts[1] + '，并生成新版本。', ok: '去掉' }).then(function (ok) {
          if (!ok) return;
          if (WFApp.removeWeight(p, parts[0], parts[1])) { WFChrome.toast('已去掉，生成新版本'); render(); }
          else WFChrome.toast('这款字至少要留一个字重');
        });
      });
    });
    root.querySelectorAll('[data-allow-host]').forEach(function (b) {
      b.addEventListener('click', function () {
        const host = b.getAttribute('data-allow-host');
        if (WFApp.addDomain(p, host, 'dns')) { WFChrome.toast('已加入白名单，待验证'); render(); }
        else WFChrome.toast('已在白名单');
      });
    });
    root.querySelectorAll('[data-rollback]').forEach(function (b) {
      b.addEventListener('click', function () {
        const v = parseInt(b.getAttribute('data-rollback'), 10);
        const target = (p.versions || []).filter(function (x) { return x.v === v; })[0];
        const msg = target && target.fonts
          ? '会按 v' + v + ' 记下的字体清单生成新版本。当前版本留在历史里，嵌入地址不变。'
          : 'v' + v + ' 没有记下当时的字体清单。回滚只会多一条记录，项目里的字体不会变。';
        WFChrome.confirm({ title: '回滚到 v' + v, message: msg, ok: '回滚' }).then(function (ok) {
          if (!ok) return;
          const restored = WFApp.rollback(p, v);
          WFChrome.toast(restored ? '已回滚，字体清单已恢复' : '已记下回滚；这一版没有字体清单，项目里的字体未改');
          render();
        });
      });
    });

    const embedEl = document.getElementById('embed');
    if (embedEl) {
      const items = p.fonts.map(function (f) {
        return {
          family: (WFApp.fontMeta(f.fontId) || {}).family || f.fontId,
          weights: f.weights,
          version: p.delivery.subset || 'full'
        };
      });
      let src = 'project';
      let m = null;
      function readForm() {
        const aliasEl = document.getElementById('optAlias');
        const alias = aliasEl ? aliasEl.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') : p.delivery.alias;
        if (aliasEl && aliasEl.value.trim() && alias !== aliasEl.value.trim().toLowerCase()) {
          aliasEl.value = alias;
        }
        p.delivery.display = document.getElementById('optDisplay').value;
        p.delivery.preload = document.getElementById('optPreload').checked;
        p.delivery.subset = document.getElementById('optSubset').value;
        p.delivery.cdn = document.getElementById('optCdn').value;
        p.delivery.structure = document.getElementById('optStruct').value;
        p.delivery.alias = alias;
        items.forEach(function (it) { it.version = p.delivery.subset || 'full'; });
      }
      function opts() {
        const d = p.delivery;
        return {
          display: d.display || WFApp.state().settings.display,
          preload: d.preload,
          slug: p.slug,
          origin: WFProto.cdnOriginById(d.cdn),
          structure: d.structure,
          alias: d.alias,
          onChange: function (o) {
            if (o && o.structure) {
              p.delivery.structure = o.structure;
              const struct = document.getElementById('optStruct');
              if (struct) struct.value = o.structure;
              WFApp.save();
            }
          }
        };
      }
      function cdnLabel() {
        const lab = document.getElementById('projectCdn');
        if (lab) lab.innerHTML = esc(WFProto.projectCssUrl(p.slug, 'index.css', WFProto.cdnOriginById(p.delivery.cdn)).replace(/^https:\/\//, '')).replace(/\//g, '/<wbr>');
      }
      function onCdn() {
        if (!embedEl.isConnected) { document.removeEventListener('wf:cdn', onCdn); return; }
        cdnLabel();
        if (src === 'project') paint();
      }
      document.addEventListener('wf:cdn', onCdn);
      function paint() {
        cdnLabel();
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
      function persist() {
        readForm();
        WFApp.save();
        if (src === 'project') paint();
        else if (m) m.setOpts(opts());
        else paint();
      }
      ['optDisplay', 'optSubset', 'optCdn', 'optStruct'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', persist);
      });
      document.getElementById('optPreload').addEventListener('change', persist);
      document.getElementById('optAlias').addEventListener('change', persist);
    }
  }

  Promise.all([WFProto.loadCatalog(), WFApp.load()]).then(function () {
    p = WFApp.project(WFProto.getQuery('id')) || WFApp.projects()[0];
    if (!p) { root.innerHTML = '<p class="empty">没有项目。<a href="projects.html?new=1">新建一个</a></p>'; return; }
    document.title = p.name + ' · 控制台 · 文风字体';
    render();
  });
})();
