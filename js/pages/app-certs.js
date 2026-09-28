/* 我的证书：当前登录身份下跨字体 grant 列表（lab localStorage） */
(function () {
  if (window.WFApp && WFApp.gate && !WFApp.gate()) return;
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('certsRoot');
  if (!root) return;

  function currentUser() {
    try { return (WFChrome.user && WFChrome.user()) || null; } catch (e) { return null; }
  }

  function isLoggedIn() {
    const u = currentUser();
    return !!(u && (u.email || u.name || u.id));
  }

  function subjectLabel() {
    const u = currentUser();
    if (u && (u.email || u.name)) return '已登录 · ' + (u.email || u.name);
    return '未登录';
  }

  function fmtTime(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      const pad = function (n) { return n < 10 ? '0' + n : String(n); };
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
        ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch (e) { return String(iso); }
  }

  function statusPill(st) {
    const n = WFProto.certStatusNorm(st);
    const label = WFProto.certStatusLabel(st);
    let cls = 'cert-pill';
    if (n === 'pending') cls += ' is-mid';
    else if (n === 'approved') cls += ' is-ok';
    else if (n === 'rejected') cls += ' is-bad';
    return '<span class="' + cls + '">' + esc(label) + '</span>';
  }

  function labDemoLogin() {
    WFChrome.login({
      name: 'Lab 演示',
      email: 'lab-demo@local.test',
      role: 'user',
      source: 'demo',
      id: 'lab-demo'
    });
    if (WFChrome.toast) WFChrome.toast('已用 lab 演示账号登录');
    render();
  }

  function certHref(g) {
    const key = g.fontKey || g.normalized || '';
    return WFChrome.href('app/cert-upload.html?cert=' + encodeURIComponent(key));
  }

  function detailHref(g) {
    const font = WFProto.getFontBySlug(g.normalized || g.fontKey) || {
      normalized: g.normalized || g.fontKey,
      name: g.name,
      family: g.family
    };
    return WFChrome.href(WFProto.detailHref(font));
  }

  function render() {
    const logged = isLoggedIn();
    const grants = logged ? (WFProto.listCertGrants() || []) : [];

    let body = '';
    if (!logged) {
      body =
        '<section class="app-section cert-panel">' +
          '<p class="cert-badge is-mid">须登录</p>' +
          '<p class="t-14">登录后可查看本账号跨字体的证书申请（待审 / 通过 / 驳回）。</p>' +
          '<p class="cert-actions">' +
            '<a class="btn btn-ink" href="' + WFChrome.href('login.html?next=certs') + '">去登录</a> ' +
            '<button type="button" class="btn" id="certsLabLogin">lab 演示登录</button>' +
          '</p>' +
        '</section>';
    } else if (!grants.length) {
      body =
        '<section class="app-section cert-panel">' +
          '<p class="t-14">还没有证书记录。从 cite-closed 字体详情上传，或点右上角「上传证书」。通过后可进项目以 source=cert 发布。</p>' +
          '<p class="t-13 muted">示例：' +
            '<a href="' + WFChrome.href('app/cert-upload.html?cert=shmgt') + '">上海摩登体</a> · ' +
            '<a href="' + WFChrome.href('app/cert-upload.html?cert=jlyhmht') + '">吉利银河美好体</a></p>' +
        '</section>';
    } else {
      const rows = grants.map(function (g) {
        const name = g.name || g.normalized || g.fontKey || '—';
        const n = WFProto.certStatusNorm(g.status);
        const cta = n === 'rejected' ? '重新上传' : (n === 'pending' ? '查看 / 模拟审核' : '查看证书');
        return (
          '<tr>' +
            '<td><a href="' + detailHref(g) + '">' + esc(name) + '</a>' +
              '<div class="mono t-12 muted">' + esc(g.fontKey || '') + '</div></td>' +
            '<td>' + statusPill(g.status) +
              (g.reason && n === 'rejected'
                ? '<div class="t-12 muted" style="margin-top:0.25em">' + esc(g.reason) + '</div>'
                : '') +
            '</td>' +
            '<td class="mono t-13">' + esc(fmtTime(g.at)) + '</td>' +
            '<td class="t-13">' + esc(g.fileName || '—') + '</td>' +
            '<td><a class="btn btn-sm" href="' + certHref(g) + '">' + esc(cta) + '</a></td>' +
          '</tr>'
        );
      }).join('');
      body =
        '<section class="app-section" style="padding:0;overflow:auto">' +
          '<table class="certs-table">' +
            '<thead><tr>' +
              '<th>字体</th><th>状态</th><th>提交</th><th>文件</th><th></th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</section>' +
        '<p class="t-12 muted" style="margin-top:var(--s-4)">lab mock · localStorage <code>wf-cert-grants-v1</code> · 按身份键隔离 · 不灌 CDN</p>';
    }

    root.innerHTML =
      '<div class="app-head"><div>' +
        '<h1>证书</h1>' +
        '<p class="sub">cite-closed 开引用：上传 → 审核（通知）→ 项目 source=cert 发布 · ' + esc(subjectLabel()) + '</p>' +
      '</div>' +
      '<div class="app-actions">' +
        '<a class="btn btn-ink" href="' + WFChrome.href('app/cert-upload.html') + '">' + WFChrome.icon('upload') + '上传证书</a> ' +
        '<a class="btn" href="' + WFChrome.href('app/notifications.html') + '">' + WFChrome.icon('mail') + '通知</a>' +
      '</div></div>' + body;

    const btn = document.getElementById('certsLabLogin');
    if (btn) btn.addEventListener('click', labDemoLogin);
  }

  WFProto.loadCatalog().then(render);
})();
