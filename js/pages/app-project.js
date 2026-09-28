/* 控制台 · 单个项目：字体 / 域名 / 嵌入 / 版本 / 用量 */
(function () {
  if (!WFApp.gate()) return;
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('root');
  const TABS = [['fonts', '字体'], ['domains', '域名'], ['embed', '嵌入'], ['versions', '版本'], ['usage', '用量']];
  let p = null;
  let tab = WFProto.getQuery('tab') || '';
  function defaultTab(proj) {
    if (!proj) return 'fonts';
    if (!(proj.fonts || []).length) return 'fonts';
    const verified = (proj.domains || []).some(function (d) { return d.verified; });
    if (!(proj.domains || []).length || !verified) return 'domains';
    return 'embed';
  }

  function setTab(t) {
    tab = t;
    history.replaceState(null, '', 'project.html?id=' + encodeURIComponent(p.id) + '&tab=' + t);
    render();
  }

  function projectNext() {
    if (!p.fonts.length) {
      return { tab: 'fonts', text: '添加字体', detail: '项目里还没有字体，无法发布。', href: 'subset.html?project=' + encodeURIComponent(p.id) };
    }
    const verified = (p.domains || []).some(function (d) { return d.verified; });
    if (!(p.domains || []).length) {
      return { tab: 'domains', text: '添加域名', detail: '绑定站点域名后再发布，否则线上嵌入会被拒（403）。', href: null };
    }
    if (!verified) {
      return { tab: 'domains', text: '验证域名', detail: '完成 DNS 或文件验证后，字体才会对正式站返回。', href: null };
    }
    return { tab: 'embed', text: '发布到 CDN', detail: '对外地址：地区节点 /p/' + p.slug + '/index.css', href: null };
  }
  function head() {
    const cur = WFApp.currentVersion(p);
    const next = projectNext();
    const banner = (tab !== next.tab || !p.fonts.length || !(p.domains || []).some(function (d) { return d.verified; }))
      ? '<div class="project-next" role="status"><div><strong>下一步：' + esc(next.text) + '</strong><p>' + esc(next.detail) + '</p></div>' +
          (next.href
            ? '<a class="btn btn-ink" href="' + next.href + '">' + WFChrome.icon('plus') + esc(next.text) + '</a>'
            : '<button type="button" class="btn btn-ink" data-goto-tab="' + next.tab + '">' + WFChrome.icon('arrow-right') + esc(next.text) + '</button>') +
        '</div>'
      : '';
    return '<div class="app-head"><div><p class="crumb"><a href="projects.html">项目</a><span>/</span><span>' + esc(p.name) + '</span></p>' +
      '<h1>' + esc(p.name) + '</h1><p class="sub mono">' + esc(p.slug) + ' · v' + cur.v + ' · ' + p.fonts.length + ' 字体 · ' + WFEmbed.fmtBytes(WFApp.projectBytes(p)) + '</p></div>' +
      '<div class="app-actions"><a class="btn" href="../fonts.html">' + WFChrome.icon('font-size') + '字体库</a><a class="btn btn-ink" href="subset.html?project=' + esc(p.id) + '">' + WFChrome.icon('plus') + '添加字体</a></div></div>' +
      banner +
      '<div class="tabs" role="tablist">' + TABS.map(function (t) {
        return '<button type="button" role="tab" data-tab="' + t[0] + '"' + (t[0] === tab ? ' class="is-on"' : '') + '>' + t[1] + '</button>';
      }).join('') + '</div>';
  }

  function fontCiteNote(meta, row) {
    if (!meta || !WFProto.citeAllowed) return '';
    const cite = WFProto.citeAllowed(meta);
    if (cite && cite.ok) {
      if (cite.reason === 'cert-grant' || cite.reason === 'cert-grant-lab') {
        return '<span class="cite-pill is-ok">证书开引用</span>';
      }
      return '';
    }
    const src = (row && row.source) || 'catalog';
    if (src === 'cert' || src === 'upload') return '<span class="cite-pill is-warn">项目内嵌 · ' + esc(src) + '</span>';
    return '<span class="cite-pill is-danger">cite-closed · 须证书或勿发公共 CDN</span>';
  }
  function fontsPanel() {
    if (!p.fonts.length) {
      return '<div class="panel app-empty-hero"><h2>添加第一款字体</h2>' +
        '<p class="t-14" style="color:var(--ink-2)">从字体库挑选公开可嵌的字，或上传自有授权字 / 证书开引用后再加入。</p>' +
        '<p style="margin-top:var(--s-5)"><a class="btn btn-ink" href="subset.html?project=' + esc(p.id) + '">' + WFChrome.icon('plus') + '去添加</a> ' +
        '<a class="btn" href="certs.html">' + WFChrome.icon('certificate') + '我的证书</a></p></div>';
    }
    return '<div class="panel"><div class="panel-head"><p>每款字体的字重与子集独立设置；改动会生成新版本。cite-closed 须证书通过后再发公共路径。</p></div>' +
      '<table class="table"><thead><tr><th>字体</th><th>字重</th><th>子集</th><th class="num">估算体积</th><th></th></tr></thead><tbody>' +
      p.fonts.map(function (f) {
        const meta = WFApp.fontMeta(f.fontId) || { name: f.fontId, family: '' };
        return '<tr><td>' + WFChrome.faceHtml(meta, 18) + '<a href="../font-detail.html?id=' + esc(f.fontId) + '">' + esc(meta.name) + '</a> ' + fontCiteNote(meta, f) +
          '<br><span class="mono t-12 muted">' + esc(meta.family) + '</span></td>' +
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
      '<p class="t-13 muted" style="margin-top:var(--s-5)">验证方式任选：DNS TXT <code>_windfonts.example.com</code> 的值为 <code>windfonts=' + esc(p.id) + '</code>；或在站点根目录放置 <code>/.well-known/windfonts-verify.txt</code>，内容为项目 ID <code>' + esc(p.id) + '</code>。拦截与用量见项目「用量」或<a href="usage.html">用量总表</a>。</p></div>';
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
        '<div class="field"><label for="optAlias">字体名前缀</label><input class="input" id="optAlias" value="' + esc(d.alias) + '" placeholder="留空为 wenfeng-" autocomplete="off"' + (WFApp.can && WFApp.can('fontPrefix') ? '' : ' disabled') + ' /><span class="hint">' + (WFApp.can && WFApp.can('fontPrefix') ? '留空保持 wenfeng-。只改这个项目的嵌入名。' : ((WFApp.canLabel && WFApp.canLabel('fontPrefix')) || '专业档可改这个项目的字体名前缀。')) + '</span></div>' +
      '</div>' +
      '<div class="tabs" role="tablist">' +
        '<button type="button" role="tab" data-embed-src="project" class="is-on">项目一份 CSS</button>' +
        '<button type="button" role="tab" data-embed-src="fonts">按字体拆开</button></div>' +
      '<div class="app-actions" style="margin:var(--s-4) 0">' +
        '<button type="button" class="btn btn-ink" id="btnPublish"' + (p.fonts.length ? '' : ' disabled') + '>' + WFChrome.icon('cloud') + '发布到 CDN</button>' +
        '<button type="button" class="btn" id="btnExportManifest"' + (p.fonts.length ? '' : ' disabled') + '>' + WFChrome.icon('download') + '导出清单</button></div>' +
      '<div id="embed"></div>' +
      embedGateHtml() +
      '<p class="t-13 muted" style="margin-top:var(--s-4)">发布后对外地址是地区节点 <code>/p/{slug}/index.css</code>。cite-closed 须 <code>source=cert</code> 烘焙，不会灌公共 fonts-packages。' + (p.fonts.length ? '' : ' 项目里还没有字体，无法发布。') + '</p></div>';
  }
  function embedGateHtml() {
    const issues = [];
    if (!p.fonts.length) issues.push('还没有字体。');
    const verified = (p.domains || []).some(function (d) { return d.verified; });
    if (!(p.domains || []).length) issues.push('还没有绑定域名；本地 localhost 默认可测，正式站会被拒。');
    else if (!verified) issues.push('域名尚未验证；发布后正式站请求可能 403。');
    (p.fonts || []).forEach(function (f) {
      const meta = WFApp.fontMeta(f.fontId);
      if (!meta || !WFProto.citeAllowed) return;
      const cite = WFProto.citeAllowed(meta);
      if (cite && !cite.ok && f.source !== 'cert' && f.source !== 'upload') {
        issues.push((meta.name || f.fontId) + ' 为 cite-closed，须证书通过并以 source=cert 加入，或不要依赖公共 CDN。');
      }
    });
    if (!issues.length) return '';
    return '<div class="embed-gate" role="alert"><strong>发布前请确认</strong><ul>' +
      issues.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
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
    const u = p.usage || {};
    const req = u.requests30d || 0;
    const bytes = u.bytes30d || 0;
    const perf = u.perf || {};
    const spark = (req > 0)
      ? ('<p class="t-13 muted" style="margin-bottom:var(--s-3)">曲线见<a href="usage.html">用量总表</a>（vault 聚合）。此处不造假日序。</p>')
      : '<p class="empty">尚无投递。发布并嵌入后，请求与 403 会出现在用量里。</p>';
    return '<div class="panel"><div class="stats" style="margin-bottom:var(--s-8)">' +
      '<div class="stat"><div class="v">' + (bytes ? WFApp.fmtGB(bytes) + '<small>GB</small>' : '—') + '</div><div class="l">30 天流量</div></div>' +
      '<div class="stat"><div class="v">' + (req ? WFProto.formatCount(req) : '—') + '</div><div class="l">字体请求</div></div>' +
      '<div class="stat"><div class="v">' + (perf.fontLoadMs ? (perf.fontLoadMs + '<small>ms</small>') : '—') + '</div><div class="l">字体加载中位</div></div>' +
      '<div class="stat"><div class="v">' + (perf.hitRate != null ? (Math.round(perf.hitRate * 100) + '<small>%</small>') : '—') + '</div><div class="l">CDN 命中</div></div></div>' +
      spark +
      '<div class="usage-grid" style="margin-top:var(--s-8)"><div><h3 class="t-13 muted" style="margin-bottom:var(--s-3)">按页面</h3>' +
        ((u.topPages || []).length ? '<table class="table"><tbody>' + u.topPages.map(function (r) {
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
    root.querySelectorAll('[data-goto-tab]').forEach(function (b) {
      b.addEventListener('click', function () { setTab(b.getAttribute('data-goto-tab')); });
    });

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
      WFApi.addDomain(p.id, v).then(function () {
        return WFApi.getProject(p.id);
      }).then(function (fresh) {
        p = fresh;
        WFChrome.toast('已添加，待验证');
        render();
      }).catch(function (err) {
        WFChrome.toast((err && err.code === 'conflict') ? '域名已存在' : ((err && err.message) || '添加失败'));
      });
    });
    root.querySelectorAll('[data-verify]').forEach(function (b) {
      b.addEventListener('click', function () {
        const host = b.getAttribute('data-verify');
        b.disabled = true;
        WFChrome.toast('正在校验…');
        WFApi.verifyDomain(p.id, host).then(function (data) {
          return WFApi.getProject(p.id).then(function (fresh) {
            p = fresh;
            if (data && data.status === 'failed') WFChrome.toast(data.detail || '验证失败');
            else WFChrome.toast('验证通过');
            render();
          });
        }).catch(function (err) {
          WFChrome.toast((err && err.message) || '验证失败');
          b.disabled = false;
        });
      });
    });
    root.querySelectorAll('[data-remove-domain]').forEach(function (b) {
      b.addEventListener('click', function () {
        const host = b.getAttribute('data-remove-domain');
        WFChrome.confirm({ title: '移除域名', message: '移除后，' + host + ' 将无法加载字体。确认已从站点卸下嵌入代码再操作。', ok: '移除' }).then(function (ok) {
          if (!ok) return;
          WFApi.removeDomain(p.id, host).then(function () {
            return WFApi.getProject(p.id);
          }).then(function (fresh) {
            p = fresh;
            WFChrome.toast('已移除');
            render();
          }).catch(function (err) { WFChrome.toast((err && err.message) || '移除失败'); });
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
        WFApi.addDomain(p.id, host, 'dns').then(function () {
          return WFApi.getProject(p.id);
        }).then(function (fresh) {
          p = fresh;
          WFChrome.toast('已加入白名单，待验证');
          render();
        }).catch(function (err) {
          WFChrome.toast((err && err.code === 'conflict') ? '已在白名单' : ((err && err.message) || '添加失败'));
        });
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
          const hadFonts = !!(target && target.fonts);
          const go = (window.WFApi && WFApi.rollbackProject && !WFApi.isMock && !WFApi.isMock())
            ? WFApi.rollbackProject(p.id, v)
            : Promise.resolve().then(function () {
                WFApp.rollback(p, v);
                return p;
              });
          go.then(function (fresh) {
            if (fresh && fresh.id) {
              p = fresh;
              if (window.WFApp && WFApp.replaceProject) WFApp.replaceProject(fresh);
              else if (window.WFApp && WFApp.save) {
                try {
                  const list = WFApp.projects();
                  const i = list.findIndex(function (x) { return x.id === fresh.id; });
                  if (i >= 0) {
                    const st = WFApp.state();
                    st.projects[i] = fresh;
                    WFApp.save();
                  }
                } catch (e) { /* ignore */ }
              }
            }
            WFChrome.toast(hadFonts ? '已回滚，字体清单已恢复' : '已记下回滚；这一版没有字体清单，项目里的字体未改');
            render();
          }).catch(function (err) {
            WFChrome.toast((err && err.message) || '回滚失败');
          });
        });
      });
    });

    const embedEl = document.getElementById('embed');
    if (embedEl) {
      const items = p.fonts.map(function (f) {
        const meta = WFApp.fontMeta(f.fontId) || {};
        const cite = WFProto.citeAllowed ? WFProto.citeAllowed(meta) : { ok: true };
        const certGrant = f.source === 'cert' || (cite && (cite.reason === 'cert-grant' || cite.reason === 'cert-grant-lab'));
        return {
          family: meta.family || f.fontId,
          weights: f.weights,
          version: p.delivery.subset || 'full',
          certGrant: !!certGrant,
          citeMode: certGrant ? 'cert' : ''
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
      const btnPub = document.getElementById('btnPublish');
      if (btnPub) {
        btnPub.addEventListener('click', function () {
          btnPub.disabled = true;
          WFApi.publishProject(p).then(function (body) {
            const v = (body && body.data && body.data.version) || '';
            WFChrome.toast('已发布 · v' + v + ' · ' + WFProto.projectCssUrl(p.slug, 'index.css', WFProto.cdnOriginById(p.delivery.cdn)).replace(/^https:\/\//, ''));
          }).catch(function (err) {
            const code = err && (err.code || err.status);
            let msg = (err && err.message) || '发布失败';
            if (code === 401 || code === 403 || code === 'unauthorized') {
              msg = '无权限发布：请确认已登录并「从会话同步密钥」。也可先导出清单。';
            } else if (code === 422 || code === 'validation_error') {
              msg = msg + '（检查 cite-closed 是否 source=cert、域名与清单）';
            }
            WFChrome.toast(msg);
          }).then(function () { btnPub.disabled = !p.fonts.length; });
        });
      }
      const btnEx = document.getElementById('btnExportManifest');
      if (btnEx) {
        btnEx.addEventListener('click', function () {
          const m = WFApp.projectManifest(p);
          WFApp.download(m.slug + '.project.json', JSON.stringify(m, null, 2), 'application/json');
          WFChrome.toast('已下载清单');
        });
      }
    }
  }

  Promise.all([WFProto.loadCatalog(), WFApp.load()]).then(function () {
    const id = WFProto.getQuery('id');
    const loadP = id ? WFApi.getProject(id) : WFApi.listProjects().then(function (ps) { return ps[0] || null; });
    return loadP.then(function (proj) {
      p = proj;
      if (!p) { root.innerHTML = '<p class="empty">没有项目。<a href="projects.html?new=1">新建一个</a></p>'; return; }
      if (!tab) tab = defaultTab(p);
      document.title = p.name + ' · 控制台 · 文风字体';
      render();
    }).catch(function (err) {
      root.innerHTML = '<p class="empty">' + WFProto.escapeHtml((err && err.message) || '加载失败') + ' · <a href="projects.html">返回项目列表</a></p>';
    });
  });
})();
