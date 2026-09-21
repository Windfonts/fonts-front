/* 控制台 · 团队：成员、角色、邀请 */
(function () {
  if (!WFApp.gate()) return;
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('root');

  function render() {
    const s = WFApp.state();
    const team = s.team || [];
    const active = team.filter(function (m) { return m.status === 'active'; }).length;
    const pending = team.filter(function (m) { return m.status === 'pending'; }).length;
    root.innerHTML =
      '<div class="app-head"><div><h1>团队</h1><p class="sub">专业版最多 5 名成员。所有者可改角色、移除。企业版支持单点登录和更细权限。</p></div></div>' +
      '<div class="stats">' +
        '<div class="stat"><div class="v">' + active + '</div><div class="l">已加入成员</div></div>' +
        '<div class="stat"><div class="v">' + pending + '</div><div class="l">待接受邀请</div></div>' +
        '<div class="stat"><div class="v">5</div><div class="l">席位上限</div></div>' +
        '<div class="stat"><div class="v">' + s.projects.length + '</div><div class="l">共享项目</div></div></div>' +
      '<section class="app-section"><h2>邀请</h2>' +
        '<form class="inline-form" id="inviteForm">' +
          '<input class="input" type="email" id="inviteEmail" placeholder="成员邮箱" required aria-label="邮箱" />' +
          '<select class="select" id="inviteRole" aria-label="角色">' + WFApp.ROLES.filter(function (r) { return r.id !== 'owner'; }).map(function (r) {
            return '<option value="' + r.id + '">' + r.label + '</option>';
          }).join('') + '</select>' +
          '<button type="submit" class="btn btn-ink">' + WFChrome.icon('mail') + '发送邀请</button></form>' +
        '<p class="t-13 muted" style="margin-top:var(--s-3)">编辑可改项目字体与域名；只读仅看用量与嵌入代码。邀请 7 天内有效。</p></section>' +
      '<section class="app-section"><h2>成员<span class="more mono">' + team.length + '</span></h2>' +
        '<table class="table"><thead><tr><th>成员</th><th>角色</th><th>状态</th><th>加入</th><th></th></tr></thead><tbody>' +
        team.map(function (m) {
          return '<tr><td>' + esc(m.name) + ' <span class="muted">' + esc(m.email) + '</span></td>' +
            '<td>' + (m.role === 'owner' ? esc(WFApp.roleLabel(m.role)) : '<select class="select" data-role="' + esc(m.id) + '" aria-label="角色">' +
              WFApp.ROLES.filter(function (r) { return r.id !== 'owner'; }).map(function (r) {
                return '<option value="' + r.id + '"' + (r.id === m.role ? ' selected' : '') + '>' + r.label + '</option>';
              }).join('') + '</select>') + '</td>' +
            '<td><span class="status-dot' + (m.status === 'active' ? '' : ' is-pending') + '">' + (m.status === 'active' ? '已加入' : '待接受') + '</span></td>' +
            '<td class="mono muted">' + WFApp.fmtDate(m.invitedAt).slice(0, 10) + '</td>' +
            '<td class="actions">' + (m.role === 'owner' ? '' : '<button type="button" class="btn-text" data-remove="' + esc(m.id) + '">' + WFChrome.icon('trash') + '移除</button>') + '</td></tr>';
        }).join('') + '</tbody></table></section>';

    document.getElementById('inviteForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const email = document.getElementById('inviteEmail').value;
      const role = document.getElementById('inviteRole').value;
      if (WFApp.inviteMember(email, role)) { WFChrome.toast('邀请已发送'); render(); }
      else WFChrome.toast('该邮箱已在团队中');
    });
    root.querySelectorAll('[data-role]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        WFApp.setMemberRole(sel.getAttribute('data-role'), sel.value);
        WFChrome.toast('已更新角色');
      });
    });
    root.querySelectorAll('[data-remove]').forEach(function (b) {
      b.addEventListener('click', function () {
        const id = b.getAttribute('data-remove');
        const m = team.filter(function (x) { return x.id === id; })[0];
        WFChrome.confirm({ title: '移除成员', message: '将 ' + (m ? m.email : id) + ' 移出团队。对方将立刻失去项目访问。', ok: '移除' }).then(function (ok) {
          if (!ok) return;
          WFApp.removeMember(id);
          WFChrome.toast('已移除');
          render();
        });
      });
    });
  }

  Promise.all([WFProto.loadCatalog(), WFApp.load()]).then(render);
})();
