/* 控制台 · 设置：账号、套餐、默认、API、认领、审计、原型数据 */
(function () {
  if (!WFApp.gate()) return;
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('root');
  const claimQ = WFProto.getQuery('claim');

  function render() {
    const s = WFApp.state();
    const u = WFChrome.user() || {};
    const audit = (s.audit || []).slice(0, 10);
    if (WFApp.desk() === 'page') {
      root.innerHTML =
        '<div class="app-head"><div><h1>设置</h1><p class="sub">账号</p></div></div>' +
        '<section class="app-section"><h2>账号</h2><div class="grid cols-2">' +
          '<div class="field"><label for="accName">显示名</label><input class="input" id="accName" value="' + esc(u.name || '') + '" /></div>' +
          '<div class="field"><label for="accEmail">邮箱</label><input class="input" id="accEmail" value="' + esc(u.email || '') + '" disabled /></div></div>' +
          '<p style="margin-top:var(--s-4)"><button type="button" class="btn" id="saveAcc">' + WFChrome.icon('check') + '保存</button></p></section>' +
        '<p class="t-13 muted">页资料在「我的页」。用字项目、域名和用量在「用字」。</p>';
      document.getElementById('saveAcc').addEventListener('click', function () {
        WFChrome.login({ name: document.getElementById('accName').value || u.name, email: u.email });
        location.reload();
      });
      return;
    }
    root.innerHTML =
      '<div class="app-head"><div><h1>设置</h1><p class="sub">账号 · 新项目默认 · API · 审计' + (WFChrome.showPricing() ? ' · 套餐' : '') + '</p></div></div>' +
      '<section class="app-section"><h2>账号</h2><div class="grid cols-2">' +
        '<div class="field"><label for="accName">显示名</label><input class="input" id="accName" value="' + esc(u.name || '') + '" /></div>' +
        '<div class="field"><label for="accEmail">邮箱</label><input class="input" id="accEmail" value="' + esc(u.email || '') + '" disabled /></div></div>' +
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
      '<section class="app-section"><h2>新项目默认</h2><div class="grid cols-2">' +
        '<div class="field"><label for="setDisplay">字体加载策略</label><select class="select" id="setDisplay">' + ['swap', 'block', 'fallback', 'optional'].map(function (d) {
          return '<option' + (s.settings.display === d ? ' selected' : '') + '>' + d + '</option>';
        }).join('') + '</select><span class="hint">项目里选「跟随账号」时用这个。</span></div>' +
        '<div class="field"><label for="setSubset">字符包</label><select class="select" id="setSubset">' +
          [['full', '完整'], ['zh', '中文'], ['zh-common', '常用字'], ['en', '西文']].map(function (d) {
            return '<option value="' + d[0] + '"' + (s.settings.subset === d[0] ? ' selected' : '') + '>' + d[1] + '</option>';
          }).join('') + '</select><span class="hint">新项目按字体拆开时的 subset。</span></div>' +
        '<div class="field"><label for="setCdn">节点</label><select class="select" id="setCdn">' +
          [['cn', '中国'], ['hk', '香港'], ['en', '国际']].map(function (d) {
            return '<option value="' + d[0] + '"' + (s.settings.cdn === d[0] ? ' selected' : '') + '>' + d[1] + '</option>';
          }).join('') + '</select></div>' +
        '<div class="field"><label>提前加载</label><label class="check"><input type="checkbox" id="setPreload"' + (s.settings.preload ? ' checked' : '') + ' /> 新项目默认提前加载样式</label></div>' +
      '</div></section>' +
      '<section class="app-section"><h2>API 密钥</h2>' +
        '<div class="code"><button type="button" class="copy" id="copyKey">复制</button><pre id="apiKey">' + esc(s.settings.apiKey.slice(0, 12)) + '••••••••••••</pre></div>' +
        '<p class="t-13 muted" style="margin-top:var(--s-3)">创建于 ' + WFApp.fmtDate(s.settings.apiKeyCreatedAt) + ' · 用于项目 CDN 发布与鉴权 API。形态与 vault 一致（含校验和）。 <button type="button" class="btn-text" id="rotateKey">' + WFChrome.icon('refresh') + '重新生成</button></p>' +
        '<div class="code" style="margin-top:var(--s-4)"><pre>curl -X POST https://app.windfonts.com/api/projects/publish \\\n  -H "Authorization: Bearer $WINDFONTS_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d @project.json</pre></div></section>' +
      '<section class="app-section"><h2>认领</h2><p class="t-14" style="max-width:40em;color:var(--ink-2)">作者、字库、品牌方、开源项目和素材平台到<a href="' + WFChrome.href('claim.html') + '">认领页</a>提交。通过后在侧栏「我的页」改本页资料，不能改许可档位。</p></section>' +
      '<section class="app-section"><h2>审计日志<a class="more" href="team.html">' + WFChrome.icon('group') + '团队</a></h2>' +
        (audit.length ? '<ul class="version-list is-audit">' + audit.map(function (a) {
          return '<li><span class="v">' + esc(a.action === '提交厂商认领' ? '提交认领' : a.action) + '</span><span class="note">' + esc(a.detail) + '</span>' +
            '<span class="num muted">' + esc(a.actor) + '</span><span class="at">' + WFApp.fmtDate(a.at) + '</span></li>';
        }).join('') + '</ul>' : '<p class="empty">还没有操作记录。</p>') + '</section>' +
      (WFChrome.showPricing() ? '<section class="app-section"><h2>本地数据</h2><p class="t-13 muted">控制台数据保存在本机浏览器。 <button type="button" class="btn-text" id="resetData">' + WFChrome.icon('refresh') + '恢复示例数据</button></p></section>' : '');

    document.getElementById('saveAcc').addEventListener('click', function () {
      WFChrome.login({ name: document.getElementById('accName').value || u.name, email: u.email });
      location.reload();
    });
    document.getElementById('setDisplay').addEventListener('change', function (e) {
      s.settings.display = e.target.value; WFApp.log('更新设置', '加载策略 = ' + e.target.value); WFApp.save(); WFChrome.toast('已更新默认加载策略');
    });
    document.getElementById('setSubset').addEventListener('change', function (e) {
      s.settings.subset = e.target.value; WFApp.save(); WFChrome.toast('已更新新项目的字符包');
    });
    document.getElementById('setCdn').addEventListener('change', function (e) {
      s.settings.cdn = e.target.value; WFApp.save(); WFChrome.toast('已更新新项目的节点');
    });
    document.getElementById('setPreload').addEventListener('change', function (e) {
      s.settings.preload = e.target.checked; WFApp.save();
    });
    document.getElementById('copyKey').addEventListener('click', function () { WFChrome.copy(s.settings.apiKey, '已复制 API 密钥'); });
    document.getElementById('rotateKey').addEventListener('click', function () {
      WFChrome.confirm({ title: '重新生成密钥', message: '旧密钥会立刻失效。已发布项目的覆盖权跟密钥绑定，换钥后需用新钥才能再发同 slug。', ok: '重新生成' }).then(function (ok) {
        if (!ok) return;
        WFApp.mintApiKeyAsync('live').then(function (k) {
          s.settings.apiKey = k;
          s.settings.apiKeyCreatedAt = new Date().toISOString();
          WFApp.log('轮换 API 密钥', '');
          WFApp.save();
          WFChrome.toast('已生成新密钥，旧密钥立即失效');
          render();
        });
      });
    });
    const reset = document.getElementById('resetData');
    if (reset) reset.addEventListener('click', function () {
      WFChrome.confirm({ title: '恢复示例数据', message: '本机控制台的项目、域名、团队与认领记录都会被示例数据覆盖。', ok: '恢复' }).then(function (ok) {
        if (!ok) return;
        WFApp.reset().then(function () { WFChrome.toast('已恢复示例数据'); render(); });
      });
    });
  }

  Promise.all([WFProto.loadCatalog(), WFApp.load()]).then(render);
})();
