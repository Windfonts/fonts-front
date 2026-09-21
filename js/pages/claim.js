/* 公开认领页：未登录给入口，已登录提交 WFApp.submitClaim */
(function () {
  const esc = WFProto.escapeHtml;
  const card = document.getElementById('claimCard');
  const slugQ = WFProto.getQuery('slug');

  function findFoundry(q) {
    const key = String(q || '').trim();
    if (!key) return null;
    return (WFProto.getFoundries() || []).filter(function (f) {
      const aliases = f.aliases || [];
      return f.id === key || f.name === key || String(f.en || '') === key ||
        aliases.some(function (a) { return String(a) === key; });
    })[0] || null;
  }

  function loginQuery() {
    const q = new URLSearchParams();
    q.set('next', 'claim');
    if (slugQ) q.set('slug', slugQ);
    return q.toString();
  }

  function renderGate() {
    const fd = findFoundry(slugQ);
    card.innerHTML =
      (fd ? '<div class="claim-who">' + WFChrome.foundryHtml({ ownerInfo: fd, foundryInfo: fd }, { small: true, sub: '认领此页' }) + '</div>' : '') +
      '<p>提交前先登录控制台。</p>' +
      '<p class="home-cta" style="margin-top:var(--s-5)">' +
        '<a class="btn btn-ink" href="login.html?' + loginQuery() + '">登录后继续</a>' +
        '<a class="btn" href="login.html?mode=signup&amp;' + loginQuery() + '">免费注册</a>' +
      '</p>';
  }

  function renderForm() {
    const fd = findFoundry(slugQ);
    const claims = (WFApp.state().claims || []);
    const site = (fd && fd.website) || '';
    card.innerHTML =
      (fd
        ? '<div class="claim-who">' + WFChrome.foundryHtml({ ownerInfo: fd, foundryInfo: fd }, {
            small: true,
            sub: fd.claimed ? '已认领，再次提交会重新审核' : '认领此页'
          }) + '</div>'
        : '<p class="claim-who">提交认领</p>') +
      '<form id="claimForm">' +
        '<div class="field"><label for="claimSlug">厂商</label>' +
          '<input class="input" id="claimSlug" value="' + esc((fd && fd.id) || slugQ || '') + '" placeholder="厂商名或页面地址" required /></div>' +
        '<div class="field"><label for="claimSite">官网</label>' +
          '<input class="input" id="claimSite" type="url" value="' + esc(site) + '" placeholder="https://" /></div>' +
        '<div class="field"><label for="claimEmail">联系邮箱（请用官网域名）</label>' +
          '<input class="input" id="claimEmail" type="email" placeholder="brand@foundry.com" /></div>' +
        '<div class="field"><label for="claimLic">授权原文链接</label>' +
          '<input class="input" id="claimLic" type="url" placeholder="https://…/license" /></div>' +
        '<button type="submit" class="btn btn-ink" style="margin-top:var(--s-2)">提交认领</button>' +
      '</form>' +
      (claims.length
        ? '<table class="table" style="margin-top:var(--s-5)"><thead><tr><th>厂商</th><th>状态</th></tr></thead><tbody>' +
          claims.map(function (c) {
            return '<tr><td>' + esc(c.name) + '<br><span class="mono t-12 muted">' + esc(c.slug) + '</span></td>' +
              '<td class="muted">' + (c.status === 'approved' ? '已通过' : '审核中') + '</td></tr>';
          }).join('') + '</tbody></table>'
        : '');

    document.getElementById('claimForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const slug = document.getElementById('claimSlug').value.trim();
      if (!slug) { WFChrome.toast('填写厂商名'); return; }
      WFApp.submitClaim({
        slug: slug,
        name: (fd && fd.name) || slug,
        website: document.getElementById('claimSite').value,
        email: document.getElementById('claimEmail').value,
        licenseUrl: document.getElementById('claimLic').value
      });
      WFChrome.toast('已提交，审核通常 3 个工作日');
      renderForm();
    });
  }

  Promise.all([WFProto.loadCatalog(), WFApp.load()]).then(function () {
    if (WFChrome.user()) renderForm();
    else renderGate();
  });
})();
