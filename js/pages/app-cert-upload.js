/* 证书开引用页：?cert={slug|norm|family} → 收 PDF/图，本机记权（lab mock） */
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

  function subjectLabel() {
    const u = WFChrome.user && WFChrome.user();
    if (u && (u.email || u.name)) {
      return '已登录 · ' + (u.email || u.name);
    }
    return '未登录 · 本浏览器匿名身份';
  }

  function fmtSize(n) {
    n = Number(n) || 0;
    if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
    if (n >= 1024) return Math.round(n / 1024) + ' KB';
    return n + ' B';
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
        '<p class="t-13 muted" style="margin-top:var(--s-4)">也可以打开字体详情后再点右侧「上传证书 →」。</p>' +
      '</section>';
  }

  function render(font, opts) {
    opts = opts || {};
    const grant = WFProto.getCertGrant(font);
    const opened = WFProto.hasCertGrant(font);
    const name = font.name || font.en || font.normalized || '这款字体';
    const slug = WFProto.fontSlug(font) || String(font.normalized || '').toLowerCase();
    const mode = opts.mode || (opened ? 'success' : 'form');

    let body = '';
    if (mode === 'success' || (opened && mode !== 'form')) {
      const g = grant || {};
      body =
        '<section class="app-section cert-panel cert-success" role="status">' +
          '<p class="cert-badge">已开引用 · lab 演示</p>' +
          '<h2 class="cert-font-name">' + esc(name) + '</h2>' +
          '<p class="t-14">本浏览器已按「' + esc(subjectLabel()) + '」×「' + esc(slug) + '」记下证书权。' +
            '详情页「使用」区会显示本账号已开引用。<strong>不等于</strong>全站 fonts-packages CDN 开放。</p>' +
          '<dl class="kv cert-kv">' +
            '<div><dt>文件</dt><dd>' + esc(g.fileName || '—') + '</dd></div>' +
            '<div><dt>大小</dt><dd class="num">' + esc(g.fileSize ? fmtSize(g.fileSize) : '—') + '</dd></div>' +
            '<div><dt>记权时间</dt><dd class="mono t-13">' + esc(g.at || '—') + '</dd></div>' +
            '<div><dt>身份键</dt><dd class="mono t-13">' + esc(g.subject || WFProto.certSubjectKey()) + '</dd></div>' +
          '</dl>' +
          '<p class="cert-actions">' +
            '<a class="btn btn-ink" href="' + detailLink(font) + '">回字体详情</a> ' +
            '<button type="button" class="btn" id="certReupload">重新上传</button> ' +
            '<button type="button" class="btn-text" id="certClear">清除本机记权</button>' +
          '</p>' +
          '<p class="t-12 muted" style="margin-top:var(--s-4)">正式环境：vault 按 userId×fontId 存证 + 人工/规则审核网页嵌入授权；顾客 SSO 就绪后才签发账号级 CSS。</p>' +
        '</section>';
    } else {
      body =
        '<form id="certForm" class="upload-layout cert-layout">' +
          '<div class="stack">' +
            '<section class="app-section cert-panel" style="margin:0">' +
              '<p class="cert-badge is-mid">需证书 · 仅账号开引用</p>' +
              '<h2 class="cert-font-name">' + esc(name) + '</h2>' +
              '<p class="t-14">上传与本款匹配的<strong>字体授权证书</strong>（证明你有网页嵌入 / webfont 使用权）。' +
                '通过后<strong>只给当前账号</strong>（本机未登录则用浏览器匿名身份）开引用；' +
                '<strong>不会</strong>把字体灌进全站 CDN，其它访客仍看不到公开热链。</p>' +
              '<ul class="cert-bullets t-13">' +
                '<li>站内样张 / 编辑器预览本来就能用（本地 woff2），与证书无关。</li>' +
                '<li>接受 PDF 或图片（png / jpg / webp），单文件 ≤ 12 MB。</li>' +
                '<li>当前为 lab 演示：文件不上传服务器，只在本浏览器记一条权。</li>' +
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
            '<button type="submit" class="btn btn-ink btn-lg" id="certSubmit" disabled>提交并开引用</button>' +
            '<a class="btn" href="' + detailLink(font) + '">回字体详情</a>' +
            '<p class="t-12 muted">lab mock · 无后端审核。正式链路见 docs/CITE-CERT-GATE-2026-09-26.md</p>' +
          '</aside>' +
        '</form>';
    }

    root.innerHTML =
      '<div class="app-head"><div>' +
        '<p class="crumb"><a href="' + WFChrome.href('fonts.html') + '">字体库</a><span>/</span>' +
          '<a href="' + detailLink(font) + '">' + esc(name) + '</a><span>/</span><span>上传证书</span></p>' +
        '<h1>上传授权证书</h1>' +
        '<p class="sub">为货架对照字开<strong>账号级引用</strong>，不是自有字体上传，也不是全站 CDN。</p>' +
      '</div></div>' + body;

    if (mode === 'success' || (opened && mode !== 'form')) {
      const re = document.getElementById('certReupload');
      const clr = document.getElementById('certClear');
      if (re) re.addEventListener('click', function () { render(font, { mode: 'form' }); });
      if (clr) clr.addEventListener('click', function () {
        WFProto.clearCertGrant(font);
        if (WFChrome.toast) WFChrome.toast('已清除本机记权');
        render(font, { mode: 'form' });
      });
      return;
    }

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
      btn.disabled = !(pick && agree.checked);
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
      if (!pick || !agree.checked) {
        showErr('请选择证书文件并勾选确认。');
        return;
      }
      try {
        WFProto.setCertGrant(font, {
          status: 'approved-lab',
          fileName: pick.name,
          fileSize: pick.size,
          mime: pick.type || '',
          at: new Date().toISOString()
        });
        if (WFChrome.toast) WFChrome.toast('已记权：本账号开引用（lab）');
        render(font, { mode: 'success' });
      } catch (err2) {
        showErr(err2 && err2.message ? err2.message : '记权失败');
      }
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
    render(font);
  });
})();
