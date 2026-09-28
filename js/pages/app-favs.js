/* 控制台 · 我的收藏 */
(function () {
  if (!WFApp.gate()) return;
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('root');

  function fontFavs() {
    const data = WFProto.loadFavs ? WFProto.loadFavs() : { fonts: [] };
    return (data && data.fonts) || [];
  }

  function paint() {
    const items = fontFavs();
    const rows = items.map(function (it) {
      const id = it.id || it;
      const f = WFProto.getFont(id) || { id: id, name: it.name || id, foundry: '' };
      return '<li class="card-row"><a href="' + WFChrome.href('font-detail.html?id=' + encodeURIComponent(f.id || id)) + '">' +
        '<strong>' + esc(f.name || id) + '</strong>' +
        '<span class="muted">' + esc(f.foundry || f.brand || '') + '</span></a>' +
        '<button type="button" class="btn-text" data-unfav="' + esc(f.id || id) + '" data-name="' + esc(f.name || id) + '">' +
        WFChrome.icon('close') + '取消</button></li>';
    }).join('');
    root.innerHTML =
      '<div class="app-head"><div><h1>收藏</h1><p class="sub">与账号同步的收藏；可在字体库 / 详情继续添加。</p></div></div>' +
      '<section class="app-section">' +
        (rows ? '<ul class="list">' + rows + '</ul>' : '<p class="empty">还没有收藏。在字体库点星标即可。</p>') +
      '</section>';
    root.querySelectorAll('[data-unfav]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-unfav');
        const name = btn.getAttribute('data-name') || id;
        if (WFProto.toggleFavFont) WFProto.toggleFavFont(id, name);
        paint();
      });
    });
  }

  Promise.all([
    WFProto.loadCatalog(),
    WFApp.load()
  ]).then(function () {
    if (WFProto.syncFavsWithVault) return WFProto.syncFavsWithVault().catch(function () {});
  }).then(paint);
  document.addEventListener('wf:favs', paint);
})();
