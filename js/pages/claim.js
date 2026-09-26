/* 公开认领页：未登录给入口，已登录提交 WFApi.submitClaim（live→vault；mock→本地）。权限矩阵见 docs/CLAIM-SCOPES.md。 */
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

  function profileFor(fd) {
    return WFChrome.claimProfile(fd || {});
  }

  function claimList() {
    const s = WFApp.state();
    return (s && s.claims) || [];
  }

  function mergeRemoteClaims(remote) {
    const s = WFApp.state();
    if (!s) return;
    const byId = {};
    (s.claims || []).forEach(function (c) { if (c && c.id) byId[c.id] = c; });
    (remote || []).forEach(function (c) {
      if (!c || !c.id) return;
      byId[c.id] = Object.assign({}, byId[c.id] || {}, c);
    });
    s.claims = Object.keys(byId).map(function (k) { return byId[k]; })
      .sort(function (a, b) {
        return String(b.submittedAt || '').localeCompare(String(a.submittedAt || ''));
      });
    WFApp.save();
  }

  function formFields(fd, p) {
    const site = (fd && fd.website) || '';
    let extra = '';
    if (p.form && p.form.proof) {
      extra +=
        '<div class="field"><label for="claimProof">仓库或组织证明链接</label>' +
          '<input class="input" id="claimProof" type="url" placeholder="https://github.com/… 或组织页" required /></div>';
    } else if (p.form && p.form.platformNote) {
      extra +=
        '<div class="field"><label for="claimNote">平台关于页（可选）</label>' +
          '<input class="input" id="claimNote" type="url" placeholder="https://…" /></div>';
    } else {
      extra +=
        '<div class="field"><label for="claimLic">授权原文链接</label>' +
          '<input class="input" id="claimLic" type="url" placeholder="https://…/license" /></div>';
    }
    return (
      '<div class="field"><label for="claimSlug">厂商</label>' +
        '<input class="input" id="claimSlug" value="' + esc((fd && fd.id) || slugQ || '') + '" placeholder="厂商名或页面地址" required /></div>' +
      '<div class="field"><label for="claimSite">官网</label>' +
        '<input class="input" id="claimSite" type="url" value="' + esc(site) + '" placeholder="https://" /></div>' +
      '<div class="field"><label for="claimEmail">联系邮箱（请用官网域名）</label>' +
        '<input class="input" id="claimEmail" type="email" placeholder="brand@foundry.com" /></div>' +
      extra
    );
  }

  function statusLabel(st) {
    if (st === 'approved') return '已通过';
    if (st === 'rejected') return '未通过';
    return '审核中';
  }

  function renderGate(fd) {
    const p = profileFor(fd);
    card.innerHTML =
      (fd ? '<div class="claim-who">' + WFChrome.foundryHtml({ ownerInfo: fd, foundryInfo: fd }, { small: true, sub: '认领此页' }) + '</div>' : '') +
      (fd && !p.canClaim
        ? '<p>此条目尚未入厂商字典，请先到<a href="foundry.html">厂商索引</a>确认或联系本站归并后再提交。</p>'
        : '<p>提交前先登录控制台。</p>' +
          '<p class="home-cta" style="margin-top:var(--s-5)">' +
            '<a class="btn btn-ink" href="login.html?' + loginQuery() + '">' + WFChrome.icon('user') + '登录后继续</a>' +
            '<a class="btn" href="login.html?mode=signup&amp;' + loginQuery() + '">' + WFChrome.icon('user-add') + '免费注册</a>' +
          '</p>');
  }

  function renderForm(fd) {
    const p = profileFor(fd);
    const claims = claimList();

    if (fd && !p.canClaim) {
      card.innerHTML =
        '<div class="claim-who">' + WFChrome.foundryHtml({ ownerInfo: fd, foundryInfo: fd }, { small: true, sub: '待归并' }) + '</div>' +
        '<p>此条目尚未入厂商字典，请先归并后再认领。</p>' +
        '<p class="home-cta" style="margin-top:var(--s-5)"><a class="btn" href="foundry.html">回厂商索引</a></p>';
      return;
    }

    card.innerHTML =
      (fd
        ? '<div class="claim-who">' + WFChrome.foundryHtml({ ownerInfo: fd, foundryInfo: fd }, {
            small: true,
            sub: fd.claimed ? '已认领，再次提交会重新审核' : '认领此页'
          }) + '</div>'
        : '<p class="claim-who">提交认领</p>') +
      '<form id="claimForm">' +
        formFields(fd, p) +
        '<button type="submit" class="btn btn-ink" style="margin-top:var(--s-2)">' + WFChrome.icon('idcard') + '提交认领</button>' +
      '</form>' +
      (claims.length
        ? '<table class="table" style="margin-top:var(--s-5)"><thead><tr><th>厂商</th><th>状态</th></tr></thead><tbody>' +
          claims.map(function (c) {
            return '<tr><td>' + esc(c.name) + '<br><span class="mono t-12 muted">' + esc(c.slug) + '</span></td>' +
              '<td class="muted">' + statusLabel(c.status) + '</td></tr>';
          }).join('') + '</tbody></table>'
        : '');

    document.getElementById('claimForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const slug = document.getElementById('claimSlug').value.trim();
      if (!slug) { WFChrome.toast('填写厂商名'); return; }
      const hit = findFoundry(slug) || fd;
      const profile = profileFor(hit);
      if (hit && !profile.canClaim) {
        WFChrome.toast('此条目不可认领，请先归并字典');
        return;
      }
      if (profile.form && profile.form.proof) {
        const proof = (document.getElementById('claimProof') || {}).value || '';
        if (!String(proof).trim()) { WFChrome.toast('请填写仓库或组织证明链接'); return; }
      }
      const payload = {
        slug: slug,
        name: (hit && hit.name) || slug,
        kind: (hit && hit.kind) || '',
        kindLabel: profile.title,
        website: document.getElementById('claimSite').value,
        email: document.getElementById('claimEmail').value,
        licenseUrl: (document.getElementById('claimLic') || {}).value || '',
        proofUrl: (document.getElementById('claimProof') || {}).value || '',
        platformNoteUrl: (document.getElementById('claimNote') || {}).value || ''
      };
      const btn = e.target.querySelector('[type="submit"]');
      if (btn) btn.disabled = true;
      const ensure = (WFApp.ensureVaultApiKey ? WFApp.ensureVaultApiKey() : Promise.resolve());
      ensure.then(function () {
        return WFApi.submitClaim(payload);
      }).then(function (c) {
        if (c && c.id) {
          const s = WFApp.state();
          s.claims = [c].concat((s.claims || []).filter(function (x) { return x.id !== c.id; }));
          WFApp.save();
        } else {
          WFApp.submitClaim(payload);
        }
        WFChrome.toast('已提交，审核通常 3 个工作日');
        return WFApi.listClaims().then(function (remote) {
          mergeRemoteClaims(remote);
          renderForm(hit || fd);
        }).catch(function () {
          renderForm(hit || fd);
        });
      }).catch(function (err) {
        if (err && err.code === 'conflict') WFChrome.toast('该厂商已有审核中的认领');
        else WFChrome.toast((err && err.message) || '提交失败');
      }).then(function () {
        if (btn) btn.disabled = false;
      });
    });
  }

  Promise.all([WFProto.loadCatalog(), WFApp.load()]).then(function () {
    const fd = findFoundry(slugQ);
    if (!WFChrome.user()) {
      renderGate(fd);
      return;
    }
    const boot = (WFApp.ensureVaultApiKey ? WFApp.ensureVaultApiKey() : Promise.resolve())
      .then(function () { return WFApi.listClaims(); })
      .then(function (remote) { mergeRemoteClaims(remote); })
      .catch(function () { /* 未登录 Key / 离线：用本地 */ });
    boot.then(function () { renderForm(fd); });
  });
})();
