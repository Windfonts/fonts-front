/* 控制台 · 站内通知（证书 / 认领审核） */
(function () {
  if (!WFApp.gate()) return;
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('root');

  function linkFor(href) {
    const raw = String(href || '').replace(/^\//, '');
    if (!raw) return '';
    if (raw.indexOf('http') === 0) return raw;
    const path = raw.indexOf('app/') === 0 || raw.indexOf('.html') < 0 ? raw : ('app/' + raw.replace(/^app\//, ''));
    return WFChrome.href(path);
  }

  function paint(data) {
    const items = (data && data.items) || [];
    const unread = (data && data.unread) || 0;
    root.innerHTML =
      '<div class="app-head"><div><h1>通知</h1><p class="sub">证书开引用与厂商认领的审核结果。邮件通道未接。</p></div>' +
        (unread ? '<button type="button" class="btn" id="markAll">' + WFChrome.icon('check') + '全部标已读</button>' : '') +
      '</div>' +
      '<section class="app-section">' +
        (items.length
          ? '<ul class="version-list is-audit">' + items.map(function (n) {
              const href = linkFor(n.href);
              return '<li class="' + (n.read ? '' : 'is-unread') + '"><span class="v">' + esc(n.title) + '</span>' +
                '<span class="note">' + esc(n.body || '') + '</span>' +
                '<span class="at">' + WFApp.fmtDate(n.at) + '</span>' +
                (href ? '<a class="more" href="' + href + '">查看</a>' : '') + '</li>';
            }).join('') + '</ul>'
          : '<p class="empty">暂无通知。</p>') +
      '</section>';
    const btn = document.getElementById('markAll');
    if (btn) btn.addEventListener('click', function () {
      WFApi.markNotificationsRead('all').then(load);
    });
  }

  function load() {
    return WFApi.listNotifications(50).then(paint).catch(function () {
      paint({ items: [], unread: 0 });
    });
  }

  Promise.all([WFApp.load()]).then(load);
})();
