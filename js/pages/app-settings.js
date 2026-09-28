  function fillPlan(snap) {
    if (!snap) return;
    const note = document.getElementById('planNote');
    const q = snap.plan && snap.plan.quota ? snap.plan.quota : {};
    const u = snap.usage || {};
    if (note) note.textContent = snap.note || (snap.enforced ? '已强制配额' : '只读展示，未强制');
    const set = function (id, v) { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('planName', (snap.plan && snap.plan.name) ? (snap.plan.name + (snap.billingReady ? '' : ' · 未计费')) : '—');
    set('planProjects', String(u.projects != null ? u.projects : '—') + ' / ' + (q.projects != null ? q.projects : '—'));
    set('planDomains', String(u.domains != null ? u.domains : '—') + ' / ' + (q.domains == null ? '不限' : q.domains));
    set('planTraffic', (u.trafficGB30d != null ? u.trafficGB30d : '—') + ' / ' + (q.trafficGB != null ? q.trafficGB : '—') + ' GB');
  }
/* 控制台 · 设置：账号、套餐、默认、API、认领、审计、原型数据 */
(function () {
  if (!WFApp.gate()) return;
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('root');
  const claimQ = WFProto.getQuery('claim');

  let remoteAudit = null;
  function render() {
    const s = WFApp.state();
    const u = WFChrome.user() || {};
    const audit = (remoteAudit || s.audit || []).slice(0, 10);
    const persona = WFApp.consolePersona ? WFApp.consolePersona() : 'customer';
    const personaSub = persona === 'admin'
      ? '管理员 · 完整工具'
      : (persona === 'foundry' ? '厂商台 · 页与字体' : '嵌字客户');
    const vaultBlock = (WFApp.can && WFApp.can('vaultAdmin'))
      ? '<section class="app-section"><h2>运营</h2><p class="t-14" style="max-width:40em;color:var(--ink-2)">字典、认领审核、同步在 <a href="https://vault.windfonts.com/admin" target="_blank" rel="noopener">vault 运营后台</a>，不并进本控制台侧栏。</p></section>'
      : '';
    const claimBlock = '<section class="app-section"><h2>认领</h2><p class="t-14" style="max-width:40em;color:var(--ink-2)">' +
      (WFApp.can && WFApp.can('pages')
        ? '已有通过认领。到<a href="pages.html">我的页</a>改介绍、官网和外链；不能改许可档位。'
        : '作者、字库、品牌方、开源项目和素材平台到<a href="' + WFChrome.href('claim.html') + '">认领页</a>提交。通过后侧栏出现「我的页」。') +
      '</p></section>';
    const projectDefaults = persona === 'foundry'
      ? ''
      : '<section class="app-section"><h2>新项目默认</h2><div class="grid cols-2">' +
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
      '</div></section>';
    root.innerHTML =
      '<div class="app-head"><div><h1>设置</h1><p class="sub">' + esc(personaSub) + ' · 账号 · API · 审计' + (WFChrome.showPricing() ? ' · 套餐' : '') + '</p></div></div>' +
      '<section class="app-section"><h2>账号</h2><div class="grid cols-2">' +
        '<div class="field"><label for="accName">显示名</label><input class="input" id="accName" value="' + esc(u.name || '') + '" /></div>' +
        '<div class="field"><label for="accEmail">邮箱</label><input class="input" id="accEmail" value="' + esc(u.email || '') + '" disabled /></div></div>' +
        '<p style="margin-top:var(--s-4)"><button type="button" class="btn" id="saveAcc">' + WFChrome.icon('check') + '保存</button></p></section>' +
      vaultBlock +
      claimBlock +
      '<section class="app-section" data-plan-live><h2>配额<a class="more" href="notifications.html">' + WFChrome.icon('mail') + '通知</a></h2>' +
        '<p class="t-13 muted" id="planNote" style="margin-bottom:var(--s-3)">加载中…</p>' +
        '<dl class="kv" style="max-width:36rem" id="planKv">' +
          '<div><dt>' + WFChrome.icon('certificate') + '当前档</dt><dd id="planName">—</dd></div>' +
          '<div><dt>' + WFChrome.icon('folder') + '项目</dt><dd class="num" id="planProjects">—</dd></div>' +
          '<div><dt>' + WFChrome.icon('globe') + '域名</dt><dd class="num" id="planDomains">—</dd></div>' +
          '<div><dt>' + WFChrome.icon('cloud') + '近 30 天流量</dt><dd class="num" id="planTraffic">—</dd></div></dl>' +
        '<p class="t-13 muted" style="margin-top:var(--s-4)">支付 hooks 未通，此处只读；免费档上限见 <a href="../pricing.html">定价页</a> / CONSOLE.md。</p></section>' +
      (WFChrome.showPricing()
        ? '<section class="app-section" data-pricing><h2>套餐（本机示意）</h2>' +
          '<p class="t-13 muted">开发开关下的本地示意价，不代表 vault 强制。</p></section>'
        : '') +
      projectDefaults +
            '<section class="app-section"><h2>API 连接</h2>' +
        '<p class="t-13 muted" style="margin-bottom:var(--s-3)">会话走 vault NextAuth。登录后自动签发/恢复控制台 API 密钥；项目/域名走该钥。</p>' +
        '<div class="grid cols-2">' +
          '<div class="field"><label for="apiMode">WFApi 模式</label><select class="select" id="apiMode">' +
            '<option value="mock"' + (WFApi.mode() === 'mock' ? ' selected' : '') + '>mock（本机）</option>' +
            '<option value="live"' + (WFApi.mode() === 'live' ? ' selected' : '') + '>live（vault）</option></select></div>' +
          '<div class="field"><label for="vaultKey">Vault API 密钥（可选覆盖）</label><input class="input" id="vaultKey" type="password" autocomplete="off" placeholder="一般无需粘贴；SSO 会自动绑定" /></div></div>' +
        '<p style="margin-top:var(--s-4)"><button type="button" class="btn" id="saveApiMode">' + WFChrome.icon('check') + '保存模式</button> ' +
          '<button type="button" class="btn" id="syncKey">' + WFChrome.icon('cloud') + '从会话同步密钥</button> ' +
          '<button type="button" class="btn" id="verifyKey">' + WFChrome.icon('check') + '校验并采用</button> ' +
          '<span class="t-13 muted" id="apiConnStatus"></span></p></section>' +
      '<section class="app-section"><h2>API 密钥</h2>' +
        (s.settings.apiKeySource === 'vault-sso'
          ? '<p class="t-13 muted" style="margin-bottom:var(--s-3)">已与 vault 会话绑定（管理员 / 薇晓朵 OAuth）。</p>'
          : '<p class="t-13" style="margin-bottom:var(--s-3);color:var(--ink-2)">密钥未绑定会话。请点「从会话同步密钥」。' +
            '<br><span class="muted">顾客 windfonts.com 统一账号仍待 WP ↔ vault hooks（见运维 SOP §11）；当前控制台须 vault 登录。</span></p>') +
        '<div class="code"><button type="button" class="copy" id="copyKey">复制</button><pre id="apiKey">' + esc(s.settings.apiKey.slice(0, 12)) + '••••••••••••</pre></div>' +
        '<p class="t-13 muted" style="margin-top:var(--s-3)">创建于 ' + WFApp.fmtDate(s.settings.apiKeyCreatedAt) +
          (s.settings.apiKeySource === 'vault-sso' ? ' · 已绑定会话' : ' · 本机/未绑定') +
          '。 <button type="button" class="btn-text" id="rotateKey">' + WFChrome.icon('refresh') + '轮换密钥</button></p>' +
        '<div class="code" style="margin-top:var(--s-4)"><pre>curl -X POST ' + ((window.WFProto && WFProto.CSS_API) || 'https://vault.windfonts.com') + '/api/projects/publish \\\n  -H "Authorization: Bearer $WINDFONTS_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d @project.json</pre></div></section>' +
(persona === 'admin'
  ? '<section class="app-section"><h2>样张默认文案</h2>' +
        '<p class="t-13 muted" style="margin-bottom:var(--s-3)">列表预览与控制条默认字句；改后写入本机 <code>wf-proto-specimen-cfg.v1</code>，前台即时生效。</p>' +
        '<div class="grid cols-2">' +
          '<div class="field"><label for="spListDefault">列表默认短句</label><input class="input" id="spListDefault" maxlength="120" value="' + esc((window.WFProto && WFProto.getSpecimenConfig && WFProto.getSpecimenConfig().listDefault) || '') + '" /></div>' +
          '<div class="field"><label for="spSize">默认字号</label><input class="input" id="spSize" type="number" min="16" max="160" value="' + esc(String((window.WFProto && WFProto.getSpecimenConfig && WFProto.getSpecimenConfig().size) || 40)) + '" /></div>' +
          '<div class="field" style="grid-column:1/-1"><label for="spWall">字形墙默认</label><input class="input" id="spWall" maxlength="200" value="' + esc((window.WFProto && WFProto.getSpecimenConfig && WFProto.getSpecimenConfig().wallText) || '') + '" /></div>' +
        '</div>' +
        '<p style="margin-top:var(--s-4)"><button type="button" class="btn" id="saveSpecimen">' + WFChrome.icon('check') + '保存样张默认</button> ' +
          '<button type="button" class="btn-text" id="resetSpecimen">' + WFChrome.icon('refresh') + '恢复出厂</button></p></section>'
  : '') +
      '<section class="app-section"><h2>审计日志' + (WFApp.can && WFApp.can('team') ? '<a class="more" href="team.html">' + WFChrome.icon('group') + '团队</a>' : '') + '</h2>' +
        (audit.length ? '<ul class="version-list is-audit">' + audit.map(function (a) {
          return '<li><span class="v">' + esc(a.action === '提交厂商认领' ? '提交认领' : a.action) + '</span><span class="note">' + esc(a.detail) + '</span>' +
            '<span class="num muted">' + esc(a.actor) + '</span><span class="at">' + WFApp.fmtDate(a.at) + '</span></li>';
        }).join('') + '</ul>' : '<p class="empty">还没有操作记录。</p>') + '</section>' +
      (WFChrome.showPricing() ? '<section class="app-section"><h2>本地数据</h2><p class="t-13 muted">控制台数据保存在本机浏览器。 <button type="button" class="btn-text" id="resetData">' + WFChrome.icon('refresh') + '恢复示例数据</button></p></section>' : '');

    document.getElementById('saveAcc').addEventListener('click', function () {
      WFChrome.login({
        name: document.getElementById('accName').value || u.name,
        email: u.email,
        role: u.role,
        source: u.source,
        id: u.id
      });
      location.reload();
    });
    const saveSp = document.getElementById('saveSpecimen');
    if (saveSp) saveSp.addEventListener('click', function () {
      if (!window.WFProto || !WFProto.setSpecimenConfig) return;
      const cur = WFProto.getSpecimenConfig();
      WFProto.setSpecimenConfig({
        listDefault: document.getElementById('spListDefault').value,
        size: document.getElementById('spSize').value,
        wallText: document.getElementById('spWall').value,
        detailPreset: cur.detailPreset,
        presets: cur.presets
      });
      WFChrome.toast('样张默认已保存');
    });
    const resetSp = document.getElementById('resetSpecimen');
    if (resetSp) resetSp.addEventListener('click', function () {
      if (!window.WFProto || !WFProto.resetSpecimenConfig) return;
      WFProto.resetSpecimenConfig();
      WFChrome.toast('已恢复出厂样张默认');
      render();
    });
    const saveMode = document.getElementById('saveApiMode');
    if (saveMode) saveMode.addEventListener('click', function () {
      const m = document.getElementById('apiMode').value;
      WFApi.setMode(m);
      const st = document.getElementById('apiConnStatus');
      if (st) st.textContent = '已设为 ' + m + (WFApi.useLocalProjects() ? '（项目仍本机）' : '');
      WFChrome.toast('API 模式：' + m);
    });
    const syncBtn = document.getElementById('syncKey');
    if (syncBtn) syncBtn.addEventListener('click', function () {
      const st = document.getElementById('apiConnStatus');
      if (st) st.textContent = '同步中…';
      syncBtn.disabled = true;
      WFApp.ensureVaultApiKey().then(function (k) {
        if (st) st.textContent = k ? ('已同步 · ' + String(k).slice(0, 12) + '…') : '无会话密钥';
        WFChrome.toast(k ? '已从会话同步密钥' : '未拿到密钥');
        render();
      }).catch(function (err) {
        if (st) st.textContent = (err && err.message) || '同步失败';
        WFChrome.toast((err && err.message) || '同步失败');
      }).then(function () { syncBtn.disabled = false; });
    });
    const verifyBtn = document.getElementById('verifyKey');
    if (verifyBtn) verifyBtn.addEventListener('click', function () {
      const key = (document.getElementById('vaultKey').value || '').trim();
      const st = document.getElementById('apiConnStatus');
      if (!key) { WFChrome.toast('请先粘贴密钥'); return; }
      if (st) st.textContent = '校验中…';
      verifyBtn.disabled = true;
      WFAuth.verifyApiKey(key).then(function (data) {
        s.settings.apiKey = key;
        s.settings.apiKeyCreatedAt = new Date().toISOString();
        s.settings.apiKeySource = 'manual';
        WFApp.log('采用 vault API 密钥', (data && data.prefix) || key.slice(0, 12));
        WFApp.save();
        if (st) st.textContent = '密钥有效' + (data && data.plan ? ' · ' + data.plan : '');
        WFChrome.toast('已采用 vault 密钥');
        render();
      }).catch(function (err) {
        if (st) st.textContent = (err && err.message) || '校验失败';
        WFChrome.toast((err && err.message) || '校验失败');
      }).then(function () { verifyBtn.disabled = false; });
    });
    document.getElementById('setDisplay') && document.getElementById('setDisplay').addEventListener('change', function (e) {
      s.settings.display = e.target.value; WFApp.log('更新设置', '加载策略 = ' + e.target.value); WFApp.save(); WFChrome.toast('已更新默认加载策略');
    });
    document.getElementById('setSubset') && document.getElementById('setSubset').addEventListener('change', function (e) {
      s.settings.subset = e.target.value; WFApp.save(); WFChrome.toast('已更新新项目的字符包');
    });
    document.getElementById('setCdn') && document.getElementById('setCdn').addEventListener('change', function (e) {
      s.settings.cdn = e.target.value; WFApp.save(); WFChrome.toast('已更新新项目的节点');
    });
    document.getElementById('setPreload') && document.getElementById('setPreload').addEventListener('change', function (e) {
      s.settings.preload = e.target.checked; WFApp.save();
    });
    document.getElementById('copyKey').addEventListener('click', function () { WFChrome.copy(s.settings.apiKey, '已复制 API 密钥'); });
    document.getElementById('rotateKey').addEventListener('click', function () {
      WFChrome.confirm({
        title: '轮换密钥',
        message: '将吊销当前会话密钥并签发新钥。旧钥绑定的项目数据仍在，但需用新钥访问；若只是丢了本机缓存，请先点「从会话同步密钥」。',
        ok: '轮换'
      }).then(function (ok) {
        if (!ok) return;
        const goLocal = function () {
          return WFApp.mintApiKeyAsync('live').then(function (k) {
            s.settings.apiKey = k;
            s.settings.apiKeyCreatedAt = new Date().toISOString();
            s.settings.apiKeySource = 'local';
            WFApp.log('轮换 API 密钥', 'local');
            WFApp.save();
            WFChrome.toast('已生成本机新密钥');
            render();
          });
        };
        if (WFAuth.ensureConsoleKey && WFAuth.requiresVaultSession && WFAuth.requiresVaultSession()) {
          WFAuth.ensureConsoleKey({ rotate: true }).then(function (data) {
            if (!data || !data.apiKey) return goLocal();
            s.settings.apiKey = data.apiKey;
            s.settings.apiKeyCreatedAt = new Date().toISOString();
            s.settings.apiKeySource = 'vault-sso';
            WFApp.log('轮换 API 密钥', 'vault-sso');
            WFApp.save();
            WFChrome.toast('已轮换会话密钥');
            render();
          }).catch(function () { return goLocal(); });
        } else {
          goLocal();
        }
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

  Promise.all([
    WFProto.loadCatalog(),
    WFApp.load(),
    WFApp.ensureClaimsSynced ? WFApp.ensureClaimsSynced() : Promise.resolve()
  ]).then(function () {
    const pull = (window.WFApi && WFApi.listAudit && !WFApi.isMock())
      ? WFApi.listAudit(40).then(function (rows) {
          if (Array.isArray(rows)) {
            remoteAudit = rows;
            try {
              const st = WFApp.state();
              if (st) { st.audit = rows.slice(); WFApp.save(); }
            } catch (e) { /* ignore */ }
          }
        }).catch(function () { /* ignore */ })
      : Promise.resolve();
    return pull.then(function () {
      render();
      if (window.WFApi && WFApi.getPlan) {
        WFApi.getPlan().then(fillPlan).catch(function () {});
      }
    });
  });
})();
