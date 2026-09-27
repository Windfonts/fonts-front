/* 授权查询 · 公开页 / 控制台共用（Foundry 四布尔终稿 mock） */
(function () {
  const inApp = !!(document.body && document.body.classList.contains('app'));
  if (inApp && window.WFApp && !WFApp.gate()) return;

  const esc = WFProto.escapeHtml;
  const root = document.getElementById(inApp ? 'root' : 'lqRoot');
  if (!root) return;

  const USES = [
    { id: 'preview', label: '仅站内预览' },
    { id: 'design', label: '设计稿 / 印刷画面' },
    { id: 'cdn_web', label: '网页 CDN / CSS 热链' },
    { id: 'app_embed', label: 'App / 游戏内置' },
    { id: 'modify', label: '改字 / 衍生' },
    { id: 'redistribute', label: '再分发字体文件' }
  ];
  const BOOL_META = [
    { key: 'previewOk', label: '预览' },
    { key: 'designOk', label: '设计稿' },
    { key: 'webfontCdnOk', label: '网页 CDN' },
    { key: 'appEmbedOk', label: 'App 内置' }
  ];

  let seeds = [];
  let fontKey = WFProto.getQuery('font') || 'Ckbf';
  let selected = { preview: true, design: true, cdn_web: true, app_embed: true, modify: false, redistribute: false };
  let result = null;
  let flop = null;

  function boolCell(key, val, verified) {
    let cls = 'lq-bool';
    let text = '—';
    if (val === true) {
      if (verified) { cls += ' is-ok'; text = '可以'; }
      else { cls += ' is-uncertain'; text = '推断·待核实'; }
    } else if (val === false) {
      cls += ' is-no'; text = '不可以';
    } else {
      cls += ' is-uncertain'; text = '见原文';
    }
    const ev = (result && result.evidence && result.evidence[key]) || '';
    return '<div class="' + cls + '"><div class="lq-bool-k">' + esc(BOOL_META.filter(function (b) { return b.key === key; })[0].label) + '</div>' +
      '<div class="lq-bool-v">' + text + '</div>' +
      (ev ? '<div class="lq-bool-e">' + esc(ev) + '</div>' : '') + '</div>';
  }

  function ctaHtml(r) {
    if (!r) return '';
    const cta = r.cta;
    let disabled = cta === 'blocked';
    let cls = 'btn btn-ink';
    let label = r.cta_label || cta;
    let extra = '';
    if (cta === 'blocked') {
      cls = 'btn is-blocked';
      disabled = true;
      if (flop && flop.cdn_forbidden) {
        extra = '<span class="lq-flop-badge" title="' + esc(flop.reason_label || '') + '">FLOP · ' + esc(flop.reason_code || 'flop_no_webfont') + '</span>';
      }
    } else if (cta === 'upload_cert') {
      cls = 'btn';
    } else if (cta === 'read_license') {
      cls = 'btn';
    }
    return '<div class="lq-cta-row">' +
      '<button type="button" class="' + cls + '" id="lqCta"' + (disabled ? ' disabled' : '') + ' data-cta="' + esc(cta) + '">' +
        (cta === 'blocked' ? WFChrome.icon('close') : cta === 'upload_cert' ? WFChrome.icon('upload') : cta === 'connect' ? WFChrome.icon('rocket') : WFChrome.icon('book')) +
        esc(label) + '</button>' + extra +
      (r.license_url ? '<a class="btn-text" href="' + esc(r.license_url) + '" target="_blank" rel="noopener noreferrer">' + WFChrome.icon('external') + '许可原文</a>' : '') +
      '</div>';
  }

  function certHtml(r) {
    const c = r && r.cert;
    if (!(r && (r.cite_policy === 'cite_closed' || r.service_status === 'restricted'))) {
      if (r && r.cdnHardBlock) {
        return '<div class="lq-cert"><p class="hint">FLOP 硬拒：不提供证书开通公共 CDN 的出口。</p></div>';
      }
      return '';
    }
    if (!c) {
      return '<div class="lq-cert"><p class="hint">当前账号尚无证书。无证时外链为 cite-closed。</p>' +
        '<button type="button" class="btn" id="lqUploadCert">' + WFChrome.icon('upload') + '上传证书（mock）</button></div>';
    }
    const st = c.status;
    let stCls = 'lq-cert-st is-' + st;
    return '<div class="lq-cert"><div class="' + stCls + '">证书状态 · <b>' + esc(st) + '</b> · ' + esc(c.cert_id) + '</div>' +
      '<p class="hint">unlocks: ' + esc((c.unlocks || []).join(', ') || '—') + ' · approved 仅开账号 cite，永不灌公共 fonts-packages。</p>' +
      '<div class="lq-cert-actions">' +
        (st === 'pending' ? '<button type="button" class="btn" id="lqApprove">' + WFChrome.icon('check') + 'mock 批准</button>' +
          '<button type="button" class="btn-text" id="lqReject">驳回</button>' : '') +
        (st === 'approved' ? '<span class="hint">本账号引用已开</span>' : '') +
        (st === 'rejected' || st === 'expired' ? '<button type="button" class="btn" id="lqUploadCert">' + WFChrome.icon('upload') + '重新上传</button>' : '') +
      '</div></div>';
  }

  function paint() {
    const head = inApp
      ? '<div class="app-head"><div><h1>授权查询</h1><p class="sub">Foundry 四布尔 · mock · 默认不连 live</p></div>' +
        '<div class="app-actions"><a class="btn" href="../licenses.html">' + WFChrome.icon('list') + '类型对照</a>' +
        '<a class="btn" href="standard-bar.html">' + WFChrome.icon('stack') + '标准棒</a></div></div>'
      : '';

    const seedOpts = seeds.map(function (s) {
      return '<option value="' + esc(s.normalizedName) + '"' + (s.normalizedName === fontKey ? ' selected' : '') + '>' +
        esc(s.name) + ' · ' + esc(s.normalizedName) +
        (s.cdnHardBlock ? ' · FLOP' : '') +
        (s.cite_policy === 'cite_closed' ? ' · cite-closed' : '') +
        (!s.license_verified ? ' · 待核实' : '') +
        '</option>';
    }).join('');

    const useChecks = USES.map(function (u) {
      return '<label class="check"><input type="checkbox" data-use="' + u.id + '"' + (selected[u.id] ? ' checked' : '') + ' /> ' + esc(u.label) + '</label>';
    }).join('');

    let body = '';
    if (result) {
      const verified = !!result.license_verified;
      body =
        '<section class="app-section lq-result">' +
          '<div class="lq-meta">' +
            '<div><strong>' + esc(result.name) + '</strong> <span class="mono muted">' + esc(result.normalizedName) + '</span></div>' +
            '<div class="lq-tags">' +
              '<span class="lq-tag">' + esc(result.license_label || '—') + '</span>' +
              '<span class="lq-tag' + (verified ? ' is-verified' : ' is-unverified') + '">' + (verified ? '已核实' : '待核实') + '</span>' +
              '<span class="lq-tag">' + esc(result.service_status) + '</span>' +
              '<span class="lq-tag">' + esc(result.cite_policy) + '</span>' +
              (result.cdnHardBlock ? '<span class="lq-tag is-flop">cdnHardBlock</span>' : '') +
            '</div>' +
          '</div>' +
          '<p class="lq-headline">' + esc(result.headline) + '</p>' +
          '<div class="lq-bools">' + BOOL_META.map(function (b) { return boolCell(b.key, result.bools[b.key], verified); }).join('') + '</div>' +
          '<div class="lq-uses"><h3 class="lq-h3">按用途</h3><ul class="lq-use-list">' +
            Object.keys(result.for_uses || {}).map(function (u) {
              const row = result.for_uses[u];
              return '<li><span class="mono">' + esc(u) + '</span>' +
                '<span class="' + (row.allowed ? (row.uncertain ? 'is-uncertain' : 'is-ok') : 'is-no') + '">' + (row.allowed ? (row.account_scoped ? '账号可' : '允许') : '不允许') + '</span>' +
                '<span class="muted">' + esc(row.reason || '') + '</span></li>';
            }).join('') + '</ul></div>' +
          ((result.warnings || []).length ? '<ul class="lq-warn">' + result.warnings.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '') +
          ctaHtml(result) +
          certHtml(result) +
        '</section>';
    }

    root.innerHTML = head +
      '<section class="app-section">' +
        '<div class="grid cols-2">' +
          '<div class="field"><label for="lqFont">字体（mock 种子）</label>' +
            '<select class="select" id="lqFont">' + seedOpts + '</select>' +
            '<span class="hint">必测：Ckbf（OFL）· Jlyhmht（cite-closed）· SmartFontUI（FLOP）</span></div>' +
          '<div class="field"><label>用途</label><div class="lq-use-checks">' + useChecks + '</div></div>' +
        '</div>' +
        '<p style="margin-top:var(--s-4)"><button type="button" class="btn btn-ink" id="lqRun">' + WFChrome.icon('search') + '查询</button>' +
          '<span class="hint" style="margin-left:var(--s-3)">API mode · ' + esc(WFApi.mode()) + '</span></p>' +
      '</section>' + body;

    document.getElementById('lqFont').addEventListener('change', function (e) {
      fontKey = e.target.value;
      run();
    });
    root.querySelectorAll('[data-use]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        selected[inp.getAttribute('data-use')] = !!inp.checked;
      });
    });
    document.getElementById('lqRun').addEventListener('click', run);
    const up = document.getElementById('lqUploadCert');
    if (up) up.addEventListener('click', function () {
      WFApi.createCert({ fontId: fontKey, note: 'mock upload' }).then(function () {
        WFChrome.toast('已提交证书 · pending');
        run();
      }).catch(function (err) { WFChrome.toast((err && err.message) || '上传失败'); });
    });
    const ap = document.getElementById('lqApprove');
    if (ap) ap.addEventListener('click', function () {
      if (!result || !result.cert) return;
      WFApi.reviewCert(result.cert.cert_id, { status: 'approved' }).then(function () {
        WFChrome.toast('已批准（仅账号 cite）');
        run();
      }).catch(function (err) { WFChrome.toast((err && err.message) || '失败'); });
    });
    const rj = document.getElementById('lqReject');
    if (rj) rj.addEventListener('click', function () {
      if (!result || !result.cert) return;
      WFApi.reviewCert(result.cert.cert_id, { status: 'rejected' }).then(function () {
        WFChrome.toast('已驳回');
        run();
      }).catch(function (err) { WFChrome.toast((err && err.message) || '失败'); });
    });
    const ctaBtn = document.getElementById('lqCta');
    if (ctaBtn) ctaBtn.addEventListener('click', function () {
      const c = ctaBtn.getAttribute('data-cta');
      if (c === 'blocked') return;
      if (c === 'upload_cert') {
        document.getElementById('lqUploadCert') && document.getElementById('lqUploadCert').click();
        return;
      }
      if (c === 'read_license' && result && result.license_url) {
        window.open(result.license_url, '_blank', 'noopener');
        return;
      }
      if (c === 'connect') {
        WFChrome.toast(result && result.cert && result.cert.status === 'approved'
          ? '账号引用已开（非公共 CDN）'
          : '演示：可跳转接入文档 / 项目嵌入');
      }
    });
  }

  function run() {
    const uses = USES.map(function (u) { return u.id; }).filter(function (id) { return selected[id]; });
    Promise.all([
      WFApi.queryLicense({ fontId: fontKey, uses: uses }),
      WFApi.flopPrecheck(fontKey).catch(function () { return null; })
    ]).then(function (pair) {
      result = pair[0];
      flop = pair[1];
      paint();
    }).catch(function (err) {
      result = null;
      paint();
      WFChrome.toast((err && err.message) || '查询失败');
    });
  }

  function boot() {
    const ready = inApp
      ? Promise.all([WFApp.load(), WFApi.listLicenseSeeds ? WFApi.listLicenseSeeds() : WFApi.listLicenses().then(function (d) { return d.seeds; })])
      : (WFApi.listLicenseSeeds ? WFApi.listLicenseSeeds() : WFApi.listLicenses().then(function (d) { return d.seeds; }));
    Promise.resolve(ready).then(function (r) {
      seeds = inApp ? r[1] : r;
      if (!seeds.some(function (s) { return s.normalizedName === fontKey; }) && seeds[0]) fontKey = seeds[0].normalizedName;
      paint();
      run();
    }).catch(function (err) {
      root.innerHTML = '<p class="empty">加载失败：' + esc((err && err.message) || String(err)) + '</p>';
    });
  }

  boot();
})();
