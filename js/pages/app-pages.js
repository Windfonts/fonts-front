/* 控制台 · 我的页。只改认领通过的页资料，不改许可。 */
(function () {
  if (!WFApp.gate()) return;
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('root');

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
    root.innerHTML =
      '<div class="app-head"><div><h1>我的页</h1><p class="sub">只改本页介绍、官网和外链。许可档位和「已核对」不在这里。</p></div></div>' +
      '<section class="app-section"><h2>已通过</h2><ul class="proj-list">' + list.map(function (c) {
        return '<li><a class="name" href="pages.html?desk=page&slug=' + encodeURIComponent(c.slug) + '">' + esc(c.name) + '<small>' + esc(c.slug) + '</small></a><span>' + esc(c.kindLabel || c.kind || '页') + '</span></li>';
      }).join('') + '</ul></section>' +
      (cur
        ? '<section class="app-section"><h2>' + esc(cur.name) + '</h2><p class="t-13 muted">公开厂商页要等发布后才变。这里先记在这个账号里。</p>' +
          '<div class="field" style="margin-top:var(--s-4)"><label for="pgIntro">介绍</label><textarea class="textarea" id="pgIntro">' + esc(page.intro || '') + '</textarea></div>' +
          '<div class="grid cols-2" style="margin-top:var(--s-4)">' +
            '<div class="field"><label for="pgSite">官网</label><input class="input" id="pgSite" value="' + esc(page.site || cur.website || '') + '" /></div>' +
            '<div class="field"><label for="pgLinks">外链</label><input class="input" id="pgLinks" value="' + esc(page.links || '') + '" placeholder="每行一个，或用空格分开" /></div>' +
            (showRepo ? '<div class="field"><label for="pgRepo">仓库</label><input class="input" id="pgRepo" value="' + esc(page.repo || '') + '" placeholder="https://…" /></div>' : '') +
          '</div><p style="margin-top:var(--s-4)"><button type="button" class="btn btn-ink" id="pgSave">' + WFChrome.icon('check') + '保存</button></p></section>'
        : '');
    const save = document.getElementById('pgSave');
    if (save) save.addEventListener('click', function () {
      WFApp.updateClaimPage(cur.id, {
        intro: document.getElementById('pgIntro').value,
        site: document.getElementById('pgSite').value,
        links: document.getElementById('pgLinks').value,
        repo: showRepo ? document.getElementById('pgRepo').value : ''
      });
      WFChrome.toast('已记在这个账号里');
    });
  }

  WFApp.load().then(render);
})();
