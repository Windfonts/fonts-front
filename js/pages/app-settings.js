/* 控制台 · 设置：账号、套餐、默认、API、认领、审计、原型数据 */
(function () {
  if (!WFApp.gate()) return;
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('root');
  const claimQ = WFProto.getQuery('claim');

  function render() {
    const s = WFApp.state();
    const u = WFChrome.user() || {};
    const claims = s.claims || [];
    const audit = (s.audit || []).slice(0, 10);
    root.innerHTML =
      '<div class="app-head"><div><h1>设置</h1><p class="sub">账号 · API · 认领厂商 · 审计' + (WFChrome.showPricing() ? ' · 套餐' : '') + '</p></div></div>' +
      '<section class="app-section"><h2>账号</h2><div class="grid cols-2">' +
        '<div class="field"><label>显示名</label><input class="input" id="accName" value="' + esc(u.name || '') + '" /></div>' +
        '<div class="field"><label>邮箱</label><input class="input" value="' + esc(u.email || '') + '" disabled /></div></div>' +
        '<p style="margin-top:var(--s-4)"><button type="button" class="btn" id="saveAcc">' + WFChrome.icon('check') + '保存</button></p></section>' +
      (WFChrome.showPricing()
        ? '<section class="app-section" data-pricing><h2>套餐<a class="more" href="../pricing.html">' + WFChrome.icon('rows') + '对比</a></h2>' +
          '<dl class="kv" style="max-width:36rem">' +
            '<div><dt>' + WFChrome.icon('certificate') + '当前</dt><dd>' + esc(s.plan.name) + '版 · ¥99 / 月</dd></div>' +
            '<div><dt>' + WFChrome.icon('folder') + '项目</dt><dd class="num">' + s.projects.length + ' / ' + s.plan.quota.projects + '</dd></div>' +
            '<div><dt>' + WFChrome.icon('cloud') + '月流量</dt><dd class="num">' + s.plan.quota.trafficGB + ' GB</dd></div>' +
            '<div><dt>' + WFChrome.icon('group') + '团队</dt><dd><a href="team.html">' + (s.team || []).length + ' 人</a></dd></div></dl>' +
          '<p class="t-13 muted" style="margin-top:var(--s-4)">发票与付款方式在商务后台管理；企业版请<a href="mailto:hi@windfonts.com">联系销售</a>。</p></section>'
        : '') +
      '<section class="app-section"><h2>项目默认</h2><div class="grid cols-2">' +
        '<div class="field"><label>字体加载策略</label><select class="select" id="setDisplay">' + ['swap', 'block', 'fallback', 'optional'].map(function (d) {
          return '<option' + (s.settings.display === d ? ' selected' : '') + '>' + d + '</option>';
        }).join('') + '</select><span class="hint">新项目和没单独改过的嵌入代码会用这个。</span></div></div></section>' +
      '<section class="app-section"><h2>API 密钥</h2>' +
        '<div class="code"><button type="button" class="copy" id="copyKey">复制</button><pre id="apiKey">' + esc(s.settings.apiKey.slice(0, 12)) + '••••••••••••</pre></div>' +
        '<p class="t-13 muted" style="margin-top:var(--s-3)">创建于 ' + WFApp.fmtDate(s.settings.apiKeyCreatedAt) + ' · 用于动态子集化 API 与 CI 发布。 <button type="button" class="btn-text" id="rotateKey">' + WFChrome.icon('refresh') + '重新生成</button></p>' +
        '<div class="code" style="margin-top:var(--s-4)"><pre>curl -X POST https://cn.windfonts.com/v1/subset \\\n  -H "Authorization: Bearer $WINDFONTS_KEY" \\\n  -d family=wenfeng-albbpht -d weight=400 \\\n  --data-urlencode text="让中文字体在网页上，一行代码可用。"</pre></div></section>' +
      '<section class="app-section" id="claim"><h2>认领厂商</h2>' +
        '<p class="t-14" style="max-width:40em;color:var(--ink-2)">代表字体厂商或独立设计师可认领品牌页，维护标志、介绍与官网。通过后名称旁显示认证徽记。</p>' +
        '<div class="grid cols-2" style="margin-top:var(--s-5)">' +
          '<div class="field"><label>厂商</label><input class="input" id="claimSlug" value="' + esc(claimQ || '') + '" placeholder="厂商名或页面地址" /></div>' +
          '<div class="field"><label>官网</label><input class="input" id="claimSite" placeholder="https://" /></div>' +
          '<div class="field"><label>联系邮箱（请用官网域名）</label><input class="input" id="claimEmail" type="email" placeholder="brand@foundry.com" /></div>' +
          '<div class="field"><label>授权原文链接</label><input class="input" id="claimLic" placeholder="https://…/license" /></div></div>' +
        '<p style="margin-top:var(--s-4)"><button type="button" class="btn" id="claimBtn">' + WFChrome.icon('idcard') + '提交认领</button></p>' +
        (claims.length ? '<table class="table" style="margin-top:var(--s-5)"><thead><tr><th>厂商</th><th>状态</th><th>提交于</th></tr></thead><tbody>' +
          claims.map(function (c) {
            return '<tr><td>' + esc(c.name) + '<br><span class="mono t-12 muted">' + esc(c.slug) + '</span></td>' +
              '<td><span class="status-dot' + (c.status === 'approved' ? '' : ' is-pending') + '">' + (c.status === 'approved' ? '已通过' : '审核中') + '</span></td>' +
              '<td class="mono muted">' + WFApp.fmtDate(c.submittedAt).slice(0, 10) + '</td></tr>';
          }).join('') + '</tbody></table>' : '') + '</section>' +
      '<section class="app-section"><h2>审计日志<a class="more" href="team.html">' + WFChrome.icon('group') + '团队</a></h2>' +
        (audit.length ? '<ul class="version-list">' + audit.map(function (a) {
          return '<li><span class="v">' + esc(a.action === '提交厂商认领' ? '提交认领' : a.action) + '</span><span class="note">' + esc(a.detail) + '</span>' +
            '<span class="num muted">' + esc(a.actor) + '</span><span class="at">' + WFApp.fmtDate(a.at) + '</span></li>';
        }).join('') + '</ul>' : '<p class="empty">还没有操作记录。</p>') + '</section>' +
      '<section class="app-section"><h2>本地数据</h2><p class="t-13 muted">控制台数据保存在本机浏览器。 <button type="button" class="btn-text" id="resetData">' + WFChrome.icon('refresh') + '恢复示例数据</button></p></section>';

    document.getElementById('saveAcc').addEventListener('click', function () {
      WFChrome.login({ name: document.getElementById('accName').value || u.name, email: u.email });
      location.reload();
    });
    document.getElementById('setDisplay').addEventListener('change', function (e) {
      s.settings.display = e.target.value; WFApp.log('更新设置', '加载策略 = ' + e.target.value); WFApp.save(); WFChrome.toast('已更新默认加载策略');
    });
    document.getElementById('copyKey').addEventListener('click', function () { WFChrome.copy(s.settings.apiKey, '已复制 API 密钥'); });
    document.getElementById('rotateKey').addEventListener('click', function () {
      WFChrome.confirm({ title: '重新生成密钥', message: '旧密钥会立刻失效。已部署的 CI 与动态子集化请求需要换成新密钥。', ok: '重新生成' }).then(function (ok) {
        if (!ok) return;
        s.settings.apiKey = 'wf_live_' + Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 10);
        s.settings.apiKeyCreatedAt = new Date().toISOString();
        WFApp.log('轮换 API 密钥', '');
        WFApp.save();
        WFChrome.toast('已生成新密钥，旧密钥立即失效');
        render();
      });
    });
    document.getElementById('claimBtn').addEventListener('click', function () {
      const slug = document.getElementById('claimSlug').value.trim();
      if (!slug) { WFChrome.toast('填写厂商名'); return; }
      WFApp.submitClaim({
        slug: slug, name: slug,
        website: document.getElementById('claimSite').value,
        email: document.getElementById('claimEmail').value,
        licenseUrl: document.getElementById('claimLic').value
      });
      WFChrome.toast('已提交，审核通常 3 个工作日');
      render();
    });
    document.getElementById('resetData').addEventListener('click', function () {
      WFChrome.confirm({ title: '恢复示例数据', message: '本机控制台的项目、域名、团队与认领记录都会被示例数据覆盖。', ok: '恢复' }).then(function (ok) {
        if (!ok) return;
        WFApp.reset().then(function () { WFChrome.toast('已恢复示例数据'); render(); });
      });
    });
    if (claimQ) document.getElementById('claim').scrollIntoView();
  }

  Promise.all([WFProto.loadCatalog(), WFApp.load()]).then(render);
})();
