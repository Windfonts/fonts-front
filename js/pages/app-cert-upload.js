/* 证书开引用页：?cert= → pending/approved/rejected；登录后可提交；lab 模拟审核 */
(function () {
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('certRoot');
  if (!root) return;

  const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.gif';
  const ACCEPT_MIME = /^(application\/pdf|image\/(png|jpe?g|webp|gif))$/i;
  const MAX_BYTES = 12 * 1024 * 1024;

  function certToken() {
    return String(WFProto.getQuery('cert') || '').trim();
  }

  function detailLink(font) {
    return WFChrome.href(WFProto.detailHref(font));
  }

  function certsListHref() {
    return WFChrome.href('app/certs.html');
  }

  function loginHref(font) {
    const slug = WFProto.fontSlug(font) || String(font.normalized || '').toLowerCase();
    return WFChrome.href(
      'login.html?next=cert&cert=' + encodeURIComponent(slug || '')
    );
  }

  function currentUser() {
    try {
      return (WFChrome.user && WFChrome.user()) || null;
    } catch (e) {
      return null;
    }
  }

  function isLoggedIn() {
    const u = currentUser();
    return !!(u && (u.email || u.name || u.id));
  }

  function subjectLabel() {
    const u = currentUser();
    if (u && (u.email || u.name)) {
      return '已登录 · ' + (u.email || u.name);
    }
    return '未登录 · 可浏览，提交须登录';
  }

  function fmtSize(n) {
    n = Number(n) || 0;
    if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
    if (n >= 1024) return Math.round(n / 1024) + ' KB';
    return n + ' B';
  }

  function fmtTime(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      const pad = function (n) { return n < 10 ? '0' + n : String(n); };
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
        ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' CST';
    } catch (e) {
      return String(iso);
    }
  }

  function statusBadge(st) {
    const n = WFProto.certStatusNorm(st);
    const label = WFProto.certStatusLabel(st);
    let cls = 'cert-badge';
    if (n === 'pending') cls += ' is-mid';
    else if (n === 'approved') cls += ' is-ok';
    else if (n === 'rejected') cls += ' is-bad';
    else cls += ' is-mid';
    return '<p class="' + cls + '">' + esc(label) + (n ? ' · lab' : '') + '</p>';
  }

  function labDemoLogin(font) {
    WFChrome.login({
      name: 'Lab 演示',
      email: 'lab-demo@local.test',
      role: 'user',
      source: 'demo',
      id: 'lab-demo'
    });
    if (WFChrome.toast) WFChrome.toast('已用 lab 演示账号登录');
    render(font);
  }

  function renderLoginGate(font) {
    const name = font.name || font.en || font.normalized || '这款字体';
    return (
      '<section class="app-section cert-panel cert-login-gate" role="status">' +
        '<p class="cert-badge is-mid">提交须登录</p>' +
        '<h2 class="cert-font-name">' + esc(name) + '</h2>' +
        '<p class="t-14">你可以浏览本页说明，但<strong>提交证书</strong>需要控制台登录身份（按账号 × 字体记权）。' +
          '本机预览无 vault 会话时，可用下方「lab 演示登录」。</p>' +
        '<p class="cert-actions">' +
          '<a class="btn btn-ink" href="' + loginHref(font) + '">去登录</a> ' +
          '<button type="button" class="btn" id="certLabLogin">lab 演示登录</button> ' +
          '<a class="btn-text" href="' + detailLink(font) + '">回字体详情</a>' +
        '</p>' +
        '<p class="t-12 muted" style="margin-top:var(--s-4)">正式环境：SSO / NextAuth；匿名仅可看、不可交。</p>' +
      '</section>'
    );
  }

  function renderMissing() {
    root.innerHTML =
      '<div class="app-head"><div>' +
        '<p class="crumb"><a href="' + WFChrome.href('fonts.html') + '">字体库</a><span>/</span><span>上传证书</span></p>' +
        '<h1>上传授权证书</h1>' +
        '<p class="sub">请从字体详情的「服务状态 · 受限」点「上传证书 →」进来，地址里要带 <code>?cert=字体短码</code>。</p>' +
      '</div></div>' +
      '<section class="app-section cert-panel">' +
        '<p class="t-14">示例：' +
          '<a href="?cert=shmgt">上海摩登体</a> · ' +
          '<a href="?cert=jlyhmht">吉利银河美好体</a></p>' +
        '<p class="t-13 muted" style="margin-top:var(--s-4)">' +
          '<a href="' + certsListHref() + '">我的证书</a> · 也可以打开字体详情后再点右侧 CTA。</p>' +
      '</section>';
  }

  function grantKv(grant, slug) {
    const g = grant || {};
    return (
      '<dl class="kv cert-kv">' +
        '<div><dt>状态</dt><dd>' + esc(WFProto.certStatusLabel(g.status)) + '</dd></div>' +
        '<div><dt>文件</dt><dd>' + esc(g.fileName || '—') + '</dd></div>' +
        '<div><dt>大小</dt><dd class="num">' + esc(g.fileSize ? fmtSize(g.fileSize) : '—') + '</dd></div>' +
        '<div><dt>提交时间</dt><dd class="mono t-13">' + esc(fmtTime(g.at)) + '</dd></div>' +
        (g.reviewedAt
          ? '<div><dt>审核时间</dt><dd class="mono t-13">' + esc(fmtTime(g.reviewedAt)) + '</dd></div>'
          : '') +
        (g.reason
          ? '<div><dt>驳回原因</dt><dd>' + esc(g.reason) + '</dd></div>'
          : '') +
        '<div><dt>身份键</dt><dd class="mono t-13">' + esc(g.subject || WFProto.certSubjectKey()) + '</dd></div>' +
        '<div><dt>短码</dt><dd class="mono">' + esc(slug) + '</dd></div>' +
      '</dl>'
    );
  }

  function labReviewBar(font, grant) {
    const n = WFProto.certStatusNorm(grant && grant.status);
    if (n !== 'pending' && n !== 'approved' && n !== 'rejected') return '';
    return (
      '<div class="cert-lab-admin" data-lab-admin>' +
        '<p class="t-13 muted" style="margin:0 0 var(--s-2)">lab 管理（演示用，非正式后台）</p>' +
        '<p class="cert-actions" style="margin:0">' +
          (n !== 'approved'
            ? '<button type="button" class="btn btn-ink" id="certApprove">模拟审核通过</button> '
            : '') +
          (n !== 'rejected'
            ? '<button type="button" class="btn" id="certReject">模拟驳回</button> '
            : '') +
          (n === 'pending' ? '' : '') +
        '</p>' +
      '</div>'
    );
  }

  function bindLabReview(font) {
    const ap = document.getElementById('certApprove');
    const rj = document.getElementById('certReject');
    if (ap) {
      ap.addEventListener('click', function () {
        try {
          WFProto.reviewCertGrant(font, 'approved');
          if (WFChrome.toast) WFChrome.toast('已模拟通过：本账号开引用');
          render(font);
        } catch (e) {
          if (WFChrome.toast) WFChrome.toast((e && e.message) || '操作失败');
        }
      });
    }
    if (rj) {
      rj.addEventListener('click', function () {
        try {
          WFProto.reviewCertGrant(font, 'rejected',
            '证书未写明网页嵌入 / webfont；请换一份覆盖嵌入用途的授权后再交（lab 模拟）');
          if (WFChrome.toast) WFChrome.toast('已模拟驳回');
          render(font);
        } catch (e) {
          if (WFChrome.toast) WFChrome.toast((e && e.message) || '操作失败');
        }
      });
    }
  }

  function renderStatusPanel(font, grant, modeHint) {
    const name = font.name || font.en || font.normalized || '这款字体';
    const slug = WFProto.fontSlug(font) || String(font.normalized || '').toLowerCase();
    const n = WFProto.certStatusNorm(grant && grant.status);
    let title = '';
    let body = '';
    let panelCls = 'app-section cert-panel';

    if (n === 'approved') {
      panelCls += ' cert-success';
      title = '已开引用';
      body = '审核已通过。详情页「使用」区按本账号开引用片段。' +
        '<strong>不等于</strong>全站 fonts-packages CDN。';
    } else if (n === 'pending') {
      panelCls += ' cert-pending';
      title = '待审核';
      body = '证书已提交，正在等待审核。引用仍关闭；站内样张预览不受影响。' +
        '可用下方 lab 按钮模拟通过 / 驳回。';
    } else if (n === 'rejected') {
      panelCls += ' cert-rejected';
      title = '已驳回';
      body = '本次未通过。原因见下。可重新上传后再交。';
    } else {
      title = '证书记录';
      body = '';
    }

    return (
      '<section class="' + panelCls + '" role="status">' +
        statusBadge(grant && grant.status) +
        '<h2 class="cert-font-name">' + esc(name) + '</h2>' +
        '<p class="t-14">' + body + '</p>' +
        (n === 'rejected' && grant && grant.reason
          ? '<p class="cert-reject-reason t-14"><strong>原因：</strong>' + esc(grant.reason) + '</p>'
          : '') +
        grantKv(grant, slug) +
        '<p class="cert-actions">' +
          '<a class="btn btn-ink" href="' + detailLink(font) + '">回字体详情</a> ' +
          (n === 'rejected' || modeHint === 'reupload'
            ? '<button type="button" class="btn" id="certReupload">重新上传</button> '
            : n === 'approved'
              ? '<button type="button" class="btn" id="certReupload">重新上传</button> '
              : '') +
          '<a class="btn" href="' + certsListHref() + '">我的证书</a> ' +
          '<button type="button" class="btn-text" id="certClear">清除本机记权</button>' +
        '</p>' +
        labReviewBar(font, grant) +
        '<p class="t-12 muted" style="margin-top:var(--s-4)">正式：vault 按 userId×fontId 存证 + 人工/规则审网页嵌入；顾客 SSO 后签发账号级 CSS。</p>' +
      '</section>'
    );
  }

  function renderForm(font, opts) {
    opts = opts || {};
    const name = font.name || font.en || font.normalized || '这款字体';
    const slug = WFProto.fontSlug(font) || String(font.normalized || '').toLowerCase();
    const logged = isLoggedIn();
    const rejectNote = opts.afterReject
      ? '<p class="cert-reject-reason t-14" style="margin:0 0 var(--s-4)"><strong>上次驳回：</strong>' +
        esc(opts.afterReject) + '</p>'
      : '';

    if (!logged) {
      return renderLoginGate(font);
    }

    return (
      '<form id="certForm" class="upload-layout cert-layout">' +
        '<div class="stack">' +
          '<section class="app-section cert-panel" style="margin:0">' +
            '<p class="cert-badge is-mid">需证书 · 仅账号开引用</p>' +
            '<h2 class="cert-font-name">' + esc(name) + '</h2>' +
            rejectNote +
            '<p class="t-14">上传与本款匹配的<strong>字体授权证书</strong>（证明你有网页嵌入 / webfont 使用权）。' +
              '提交后进入<strong>待审核</strong>；通过后<strong>只给当前账号</strong>开引用；' +
              '<strong>不会</strong>把字体灌进全站 CDN。</p>' +
            '<ul class="cert-bullets t-13">' +
              '<li>站内样张 / 编辑器预览本来就能用（本地 woff2），与证书无关。</li>' +
              '<li>接受 PDF 或图片（png / jpg / webp），单文件 ≤ 12 MB。</li>' +
              '<li>当前：有 vault 会话则上传存证；否则本机 lab mock。通过后仅本账号开引用。</li>' +
            '</ul>' +
          '</section>' +
          '<label class="drop" id="certDrop">' +
            '<input type="file" id="certFile" accept="' + ACCEPT + '" />' +
            '<strong>拖入授权证书</strong>' +
            '<span>或点击选择 PDF / 图片</span>' +
            '<span class="t-13" id="certFileHint">未选择文件</span>' +
          '</label>' +
          '<label class="check">' +
            '<input type="checkbox" id="certAgree" required />' +
            '<span>我确认该文件为本人持有的授权证明，且覆盖网页字体嵌入用途；知悉开引用仅限本账号、不等于全站 CDN。</span>' +
          '</label>' +
          '<p class="t-13 muted" id="certErr" hidden></p>' +
        '</div>' +
        '<aside class="subset-side">' +
          '<dl class="kv">' +
            '<div><dt>字体</dt><dd>' + esc(name) + '</dd></div>' +
            '<div><dt>短码</dt><dd class="mono">' + esc(slug) + '</dd></div>' +
            '<div><dt>family</dt><dd class="mono t-13">' + esc(font.family || '—') + '</dd></div>' +
            '<div><dt>身份</dt><dd class="t-13">' + esc(subjectLabel()) + '</dd></div>' +
            '<div><dt>标签</dt><dd class="mono t-13">' + esc((font.tags || []).join(', ') || '—') + '</dd></div>' +
          '</dl>' +
          '<button type="submit" class="btn btn-ink btn-lg" id="certSubmit" disabled>提交审核</button>' +
          '<a class="btn" href="' + detailLink(font) + '">回字体详情</a>' +
          '<a class="btn-text" href="' + certsListHref() + '">我的证书</a>' +
          '<p class="t-12 muted">lab mock · 提交后待审。见 docs/CITE-CERT-GATE-2026-09-26.md</p>' +
        '</aside>' +
      '</form>'
    );
  }

  function render(font, opts) {
    opts = opts || {};
    const grant = WFProto.getCertGrant(font);
    const n = grant ? WFProto.certStatusNorm(grant.status) : '';
    const name = font.name || font.en || font.normalized || '这款字体';
    let mode = opts.mode;
    if (!mode) {
      if (!grant || opts.forceForm) mode = 'form';
      else if (n === 'approved' || n === 'pending' || n === 'rejected') mode = 'status';
      else mode = 'form';
    }
    /* rejected 默认看状态；点重新上传进 form */
    if (mode === 'form' && n === 'rejected' && !opts.forceForm && !opts.afterReject) {
      mode = 'status';
    }

    let body = '';
    if (mode === 'status' && grant) {
      body = renderStatusPanel(font, grant, opts.modeHint);
    } else {
      body = renderForm(font, {
        afterReject: (grant && n === 'rejected' && grant.reason) || opts.afterReject || ''
      });
    }

    root.innerHTML =
      '<div class="app-head"><div>' +
        '<p class="crumb"><a href="' + WFChrome.href('fonts.html') + '">字体库</a><span>/</span>' +
          '<a href="' + detailLink(font) + '">' + esc(name) + '</a><span>/</span><span>上传证书</span></p>' +
        '<h1>上传授权证书</h1>' +
        '<p class="sub">为货架对照字开<strong>账号级引用</strong> · ' + esc(subjectLabel()) +
          ' · <a href="' + certsListHref() + '">我的证书</a></p>' +
      '</div></div>' + body;

    const labLogin = document.getElementById('certLabLogin');
    if (labLogin) {
      labLogin.addEventListener('click', function () { labDemoLogin(font); });
    }

    if (mode === 'status' && grant) {
      const re = document.getElementById('certReupload');
      const clr = document.getElementById('certClear');
      if (re) {
        re.addEventListener('click', function () {
          render(font, {
            mode: 'form',
            forceForm: true,
            afterReject: n === 'rejected' ? (grant.reason || '') : ''
          });
        });
      }
      if (clr) {
        clr.addEventListener('click', function () {
          WFProto.clearCertGrant(font);
          if (WFChrome.toast) WFChrome.toast('已清除本机记权');
          render(font, { mode: 'form', forceForm: true });
        });
      }
      bindLabReview(font);
      return;
    }

    /* form path — may be login gate only */
    if (!document.getElementById('certForm')) return;

    const form = document.getElementById('certForm');
    const fileEl = document.getElementById('certFile');
    const drop = document.getElementById('certDrop');
    const hint = document.getElementById('certFileHint');
    const agree = document.getElementById('certAgree');
    const btn = document.getElementById('certSubmit');
    const err = document.getElementById('certErr');
    let pick = null;

    function showErr(msg) {
      if (!err) return;
      if (!msg) { err.hidden = true; err.textContent = ''; return; }
      err.hidden = false;
      err.textContent = msg;
    }

    function syncBtn() {
      if (!btn) return;
      btn.disabled = !(pick && agree && agree.checked && isLoggedIn());
    }

    function takeFile(f) {
      showErr('');
      if (!f) { pick = null; hint.textContent = '未选择文件'; syncBtn(); return; }
      if (f.size > MAX_BYTES) {
        pick = null;
        hint.textContent = '未选择文件';
        showErr('文件太大，请压缩到 12 MB 以内。');
        syncBtn();
        return;
      }
      const mimeOk = !f.type || ACCEPT_MIME.test(f.type);
      const nameOk = /\.(pdf|png|jpe?g|webp|gif)$/i.test(f.name || '');
      if (!mimeOk && !nameOk) {
        pick = null;
        hint.textContent = '未选择文件';
        showErr('请上传 PDF 或图片（png / jpg / webp）。');
        syncBtn();
        return;
      }
      pick = f;
      hint.textContent = f.name + ' · ' + fmtSize(f.size);
      syncBtn();
    }

    fileEl.addEventListener('change', function () {
      takeFile(fileEl.files && fileEl.files[0]);
    });
    agree.addEventListener('change', syncBtn);

    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) {
        e.preventDefault();
        drop.classList.add('is-over');
      });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) {
        e.preventDefault();
        drop.classList.remove('is-over');
        if (ev === 'drop' && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          takeFile(e.dataTransfer.files[0]);
        }
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      showErr('');
      if (!isLoggedIn()) {
        showErr('请先登录后再提交。');
        render(font, { mode: 'form', forceForm: true });
        return;
      }
      if (!pick || !agree.checked) {
        showErr('请选择证书文件并勾选确认。');
        return;
      }
      btn.disabled = true;
      const slug = WFProto.fontSlug(font) || String(font.normalized || '').toLowerCase();
      const useVault = window.WFApi && typeof WFApi.submitFontCert === 'function' &&
        !(typeof WFApi.isMock === 'function' && WFApi.isMock());

      function finishLocal(extra) {
        extra = extra || {};
        WFProto.setCertGrant(font, {
          status: extra.status || 'pending',
          fileName: pick.name,
          fileSize: pick.size,
          mime: pick.type || '',
          reason: extra.reason || '',
          reviewedAt: extra.reviewedAt || '',
          at: new Date().toISOString(),
          labMock: extra.labMock != null ? extra.labMock : !extra.vaultId,
          vaultId: extra.vaultId || ''
        });
        if (WFChrome.toast) {
          WFChrome.toast(extra.vaultId ? '已提交 · 待审核' : '已提交 · 待审核（lab）');
        }
        render(font, { mode: 'status' });
      }

      if (!useVault) {
        try {
          finishLocal({ labMock: true });
        } catch (err2) {
          showErr(err2 && err2.message ? err2.message : '提交失败');
          syncBtn();
        }
        return;
      }

      WFApi.submitFontCert({
        fontKey: slug,
        family: font.family || '',
        normalized: font.normalized || slug,
        name: font.name || slug,
        fileName: pick.name,
        fileSize: pick.size,
        mime: pick.type || ''
      }).then(function (cert) {
        return WFApi.putFontCertFile(cert.id, pick, {
          fileName: pick.name,
          contentType: pick.type || 'application/octet-stream'
        }).then(function () { return cert; });
      }).then(function (cert) {
        finishLocal({
          status: cert.status || 'pending',
          vaultId: cert.id,
          labMock: false,
          reason: cert.reason || '',
          reviewedAt: cert.reviewedAt || ''
        });
      }).catch(function (err2) {
        showErr(err2 && err2.message ? err2.message : '提交失败');
        /* 无会话时回退本机 pending，便于 lab */
        if (err2 && (err2.status === 401 || err2.code === 'unauthorized')) {
          try { finishLocal({ labMock: true }); } catch (e3) { /* ignore */ }
        } else {
          syncBtn();
        }
      });
    });
  }

  WFProto.loadCatalog().then(function () {
    const token = certToken();
    if (!token) {
      renderMissing();
      return;
    }
    const font = WFProto.getFontBySlug(token);
    if (!font) {
      root.innerHTML =
        '<div class="app-head"><div><h1>找不到这款字体</h1>' +
          '<p class="sub">短码 <code>' + esc(token) + '</code> 不在当前目录。请从详情页重新进入。</p></div></div>' +
        '<section class="app-section"><p><a class="btn" href="' + WFChrome.href('fonts.html') + '">回字体库</a></p></section>';
      return;
    }
    const ready = (WFProto.syncVaultFontCerts && WFProto.syncVaultFontCerts()) || Promise.resolve(0);
    ready.then(function () { render(font); }, function () { render(font); });
  });
})();
