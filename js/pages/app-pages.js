/* 控制台 · 我的页。只改认领通过的页资料，不改许可。 */
(function () {
  if (!WFApp.gate()) return;
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('root');

  function readForm(showRepo) {
    return {
      intro: (document.getElementById('pgIntro') || {}).value || '',
      site: (document.getElementById('pgSite') || {}).value || '',
      links: (document.getElementById('pgLinks') || {}).value || '',
      repo: showRepo ? ((document.getElementById('pgRepo') || {}).value || '') : ''
    };
  }

  function render() {
    const list = WFApp.approvedClaims();
    const slug = WFProto.getQuery('slug');
    const cur = list.filter(function (c) { return c.slug === slug || c.id === slug; })[0] || null;
    if (!list.length) {
      root.innerHTML = '<div class="app-head"><div><h1>我的页</h1></div></div><p class="empty">还没有通过的页。<a href="' + WFChrome.href('claim.html') + '">去认领页提交</a>。</p>';
      return;
    }
    const page = (cur && cur.page) || {};
    const showRepo = cur && (cur.kind === 'project' || cur.kind === 'author');
    const pubAt = page.publishedAt || '';
    root.innerHTML =
      '<div class="app-head"><div><h1>我的页</h1><p class="sub">只改本页介绍、官网和外链。许可档位和「已核对」不在这里。</p></div></div>' +
      '<section class="app-section"><h2>已通过</h2><ul class="proj-list">' + list.map(function (c) {
        return '<li><a class="name" href="pages.html?slug=' + encodeURIComponent(c.slug) + '">' + esc(c.name) + '<small>' + esc(c.slug) + '</small></a><span>' + esc(c.kindLabel || c.kind || '页') + '</span></li>';
      }).join('') + '</ul></section>' +
      (cur
        ? '<section class="app-section"><h2>' + esc(cur.name) + '</h2>' +
          '<p class="t-13 muted">保存记在账号；「发布到公开页」后匿名厂商页才会变。不改许可档位。</p>' +
          (pubAt ? '<p class="t-12 muted">上次发布：' + esc(pubAt) + '</p>' : '') +
          '<div class="field" style="margin-top:var(--s-4)"><label for="pgIntro">介绍</label><textarea class="textarea" id="pgIntro">' + esc(page.intro || '') + '</textarea></div>' +
          '<div class="grid cols-2" style="margin-top:var(--s-4)">' +
            '<div class="field"><label for="pgSite">官网</label><input class="input" id="pgSite" value="' + esc(page.site || cur.website || '') + '" /></div>' +
            '<div class="field"><label for="pgLinks">外链</label><input class="input" id="pgLinks" value="' + esc(page.links || '') + '" placeholder="每行一个，或用空格分开" /></div>' +
            (showRepo ? '<div class="field"><label for="pgRepo">仓库</label><input class="input" id="pgRepo" value="' + esc(page.repo || '') + '" placeholder="https://…" /></div>' : '') +
          '</div><p style="margin-top:var(--s-4)">' +
            '<button type="button" class="btn btn-ink" id="pgSave">' + WFChrome.icon('check') + '保存草稿</button> ' +
            '<button type="button" class="btn" id="pgPublish">' + WFChrome.icon('upload') + '发布到公开页</button>' +
          '</p></section>'
        : '');
    const save = document.getElementById('pgSave');
    const pub = document.getElementById('pgPublish');
    if (save) save.addEventListener('click', function () {
      const data = readForm(showRepo);
      WFApp.updateClaimPage(cur.id, data);
      const go = (window.WFApi && WFApi.updateClaimPageRemote && !WFApi.isMock())
        ? WFApi.updateClaimPageRemote(cur.id, data)
        : Promise.resolve();
      save.disabled = true;
      go.then(function () {
        WFChrome.toast('草稿已保存');
      }).catch(function (err) {
        WFChrome.toast((err && err.message) || '已记在本机；同步 vault 失败');
      }).then(function () { save.disabled = false; });
    });
    if (pub) pub.addEventListener('click', function () {
      const data = readForm(showRepo);
      WFApp.updateClaimPage(cur.id, data);
      if (!window.WFApi || typeof WFApi.publishFoundryPage !== 'function' || WFApi.isMock()) {
        WFChrome.toast('需要 live API Key 才能发布到公开页');
        return;
      }
      pub.disabled = true;
      const ensure = (window.WFApp && WFApp.ensureVaultApiKey)
        ? WFApp.ensureVaultApiKey()
        : Promise.resolve();
      ensure.then(function () {
        return WFApi.publishFoundryPage(cur.id, data);
      }).then(function (res) {
        const at = (res && res.publishedAt) || (res && res.page && res.page.publishedAt) || new Date().toISOString();
        WFApp.updateClaimPage(cur.id, Object.assign({}, data, { publishedAt: at }));
        WFChrome.toast('已发布到公开厂商页');
        render();
      }).catch(function (err) {
        WFChrome.toast((err && err.message) || '发布失败');
      }).then(function () { pub.disabled = false; });
    });
  }

  function boot() {
    const pull = (window.WFApp && WFApp.ensureClaimsSynced)
      ? WFApp.ensureClaimsSynced()
      : ((window.WFApi && WFApi.listClaims && !WFApi.isMock())
        ? WFApi.listClaims().then(function (rows) {
            if (!Array.isArray(rows) || !window.WFApp || !WFApp.mergeClaimsFromVault) return;
            WFApp.mergeClaimsFromVault(rows);
          }).catch(function () { /* ignore */ })
        : Promise.resolve());
    Promise.all([WFApp.load(), pull]).then(function () {
      if (WFApp.can && !WFApp.can('pages')) {
        root.innerHTML =
          '<div class="app-head"><div><h1>我的页</h1></div></div>' +
          '<p class="empty">' + esc((WFApp.canLabel && WFApp.canLabel('pages')) || '认领通过后才能改「我的页」。') +
          ' <a href="' + WFChrome.href('claim.html') + '">去认领页提交</a>。</p>';
        return;
      }
      render();
    });
  }
  boot();
})();
