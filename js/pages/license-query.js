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

  /** Evidence that means cert-gated / read original — NEVER paint allow (black). */
  const CERT_OR_ORIGINAL_RE = /见原文|视原文|视证书|见证书|另授|账号可|凭证书|上传证书|有证|证书后/;

  const META_LABEL = {
    ofl_ok: '已核 OFL',
    apache_ok: '已核 Apache/MIT',
    free_commercial: '厂商免费商用',
    cite_closed: '引用未开放',
    public_cite_closed: '公共引用未开',
    account_cite_open: '账号引用已开',
    cert_pending: '审核中',
    restricted: '受限',
    normal: '正常',
    open: '开放',
    flop: '禁 CDN',
    flop_inherited: '禁 CDN · 继承',
    cdnHardBlock: '禁 CDN',
    brand_terms: '品牌协议',
    ipa: 'IPA',
    flop_no_webfont: '协议禁网页字体',
    catalog_ok: '目录可挂',
    hard_deny: '硬拒'
  };

  const CERT_STATUS_LABEL = {
    pending: '审核中',
    approved: '已批准',
    rejected: '已驳回',
    expired: '已过期',
    none: '无'
  };

  const USE_TO_BOOL = {
    preview: 'previewOk',
    design: 'designOk',
    cdn_web: 'webfontCdnOk',
    app_embed: 'appEmbedOk'
  };

  function metaLabel(key) {
    if (key == null || key === '' || key === '—') return '—';
    return META_LABEL[key] || String(key);
  }

  /** Feng badge states: allow / maybe / deny — never paint allow when unverified or cert-gated. */
  function resolveBoolState(key, val, verified) {
    const ev = (result && result.evidence && result.evidence[key]) || '';
    const certOrOriginal = CERT_OR_ORIGINAL_RE.test(ev);
    if (val === false) return { state: 'deny', label: '不可以', cls: 'is-deny' };
    // Cert-gated evidence → maybe even when val===true && verified (Shmgt appEmbedOk bug).
    if (val == null || !verified || certOrOriginal) return { state: 'maybe', label: '视原文', cls: 'is-maybe' };
    if (val === true) return { state: 'allow', label: '可以', cls: 'is-allow' };
    return { state: 'maybe', label: '视原文', cls: 'is-maybe' };
  }

  /** Shared allow semantics for badge + 「按用途」 table. */
  function resolveUseState(useId, row, verified) {
    // Approved account-scoped cite is a real allow for this account (public CDN bool stays false).
    if (row && row.account_scoped && row.allowed) {
      return { state: 'allow', label: '账号可', cls: 'is-allow', rowCls: 'is-ok' };
    }
    const boolKey = USE_TO_BOOL[useId];
    if (boolKey && result && result.bools) {
      const st = resolveBoolState(boolKey, result.bools[boolKey], verified);
      const rowCls = st.state === 'allow' ? 'is-ok' : (st.state === 'deny' ? 'is-no' : 'is-uncertain');
      return { state: st.state, label: st.label, cls: st.cls, rowCls: rowCls };
    }
    if (row && row.uncertain) {
      return { state: 'maybe', label: '视原文', cls: 'is-maybe', rowCls: 'is-uncertain' };
    }
    if (row && row.allowed) {
      return { state: 'allow', label: '可以', cls: 'is-allow', rowCls: 'is-ok' };
    }
    return { state: 'deny', label: '不可以', cls: 'is-deny', rowCls: 'is-no' };
  }

  function boolBadgeInner(st) {
    // Feng: 可以/不可以 → Motuicons (check/close); 视原文 stays short text
    if (st.state === 'allow') return WFChrome.icon('check');
    if (st.state === 'deny') return WFChrome.icon('close');
    return esc(st.label);
  }

  function boolCell(key, val, verified) {
    const meta = BOOL_META.filter(function (b) { return b.key === key; })[0];
    const st = resolveBoolState(key, val, verified);
    const isCircle = key === 'previewOk';
    const shape = isCircle ? ' is-circle' : ' is-pill';
    const ev = (result && result.evidence && result.evidence[key]) || '';
    return '<div class="lq-bool is-' + st.state + '">' +
      '<div class="lq-bool-k">' + esc(meta.label) + '</div>' +
      '<span class="lq-badge ' + st.cls + shape + '" role="img" aria-label="' + esc(st.label) + '">' +
        boolBadgeInner(st) +
      '</span>' +
      (ev ? '<div class="lq-bool-e">' + esc(ev) + '</div>' : '') +
      '</div>';
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
        const flopLab = flop.reason_label || META_LABEL.flop_no_webfont || '协议禁网页字体';
        extra = '<span class="lq-flop-badge" title="' + esc(flopLab) + '">FLOP · ' + esc(flopLab) + '</span>';
      }
    } else if (cta === 'cert_pending') {
      cls = 'btn is-pending-cta';
      disabled = true;
      label = '审核中';
    } else if (cta === 'upload_cert') {
      cls = 'btn';
    } else if (cta === 'read_license') {
      cls = 'btn';
    }
    return '<div class="lq-cta-row">' +
      '<button type="button" class="' + cls + '" id="lqCta"' + (disabled ? ' disabled' : '') + ' data-cta="' + esc(cta) + '">' +
        (cta === 'blocked' ? WFChrome.icon('close') : cta === 'cert_pending' ? WFChrome.icon('time') : cta === 'upload_cert' ? WFChrome.icon('upload') : cta === 'connect' ? WFChrome.icon('rocket') : WFChrome.icon('book')) +
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
      // Keep ONE primary「上传证书」— hide duplicate when #lqCta already is upload_cert.
      const skipDup = r.cta === 'upload_cert';
      return '<div class="lq-cert"><p class="hint">当前账号尚无证书。无证时外链提示「引用未开放」。</p>' +
        (skipDup ? '' : '<button type="button" class="btn" id="lqUploadCert">' + WFChrome.icon('upload') + '上传证书（mock）</button>') +
        '</div>';
    }
    const st = c.status;
    const stLab = CERT_STATUS_LABEL[st] || st;
    let stCls = 'lq-cert-st is-' + st;
    return '<div class="lq-cert"><div class="' + stCls + '">证书状态 · <b>' + esc(stLab) + '</b> · <span class="mono muted">' + esc(c.cert_id) + '</span></div>' +
      '<p class="hint">解锁范围：账号×本款网页引用 · 已批准仅开本账号 cite，永不灌公共 fonts-packages / 不改公共 CDN。</p>' +
      '<div class="lq-cert-actions">' +
        (st === 'pending' ? '<button type="button" class="btn-text" id="lqViewCert">' + WFChrome.icon('book') + '查看证书</button>' +
          '<button type="button" class="btn" id="lqApprove">' + WFChrome.icon('check') + 'mock 批准</button>' +
          '<button type="button" class="btn-text" id="lqReject">驳回</button>' +
          '<button type="button" class="btn-text" id="lqExpire">标过期</button>' : '') +
        (st === 'approved' ? '<span class="hint">本账号引用已开 · 公共货架仍未开放</span>' +
          '<button type="button" class="btn-text" id="lqViewCert">' + WFChrome.icon('book') + '查看证书</button>' +
          '<button type="button" class="btn-text" id="lqExpire">标过期</button>' : '') +
        (st === 'rejected' || st === 'expired' ? '<button type="button" class="btn" id="lqUploadCert">' + WFChrome.icon('upload') + '重新上传</button>' : '') +
      '</div></div>';
  }

  function paint() {
    const demoBan = (document.documentElement.getAttribute('data-wf-demo') === '1' || /^(192\.168\.|10\.|127\.|localhost)/i.test(String(location.hostname || '')))
      ? '<div class="wf-mock-banner" role="status">演示预览 · mock 样例数据 · 免登（LAN/本机）· 非生产</div>'
      : '';
    const head = inApp
      ? demoBan + '<div class="app-head"><div><h1>授权查询</h1><p class="sub">Foundry 四布尔 · mock · 默认不连 live</p></div>' +
        '<div class="app-actions"><a class="btn" href="../licenses.html">' + WFChrome.icon('list') + '类型对照</a>' +
        '<a class="btn" href="standard-bar.html">' + WFChrome.icon('stack') + '标准棒</a></div></div>'
      : demoBan;

    const seedOpts = seeds.map(function (s) {
      return '<option value="' + esc(s.normalizedName) + '"' + (s.normalizedName === fontKey ? ' selected' : '') + '>' +
        esc(s.name) + ' · ' + esc(s.normalizedName) +
        (s.cdnHardBlock ? ' · FLOP' : '') +
        (s.cite_policy === 'cite_closed' ? ' · 引用未开' : '') +
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
            '<div class="lq-tags">' + (function () {
              const seen = {};
              const pills = [];
              function addPill(raw, extraCls) {
                const lab = metaLabel(raw);
                if (!lab || lab === '—') return;
                const dedupeKey = lab;
                if (seen[dedupeKey]) return;
                seen[dedupeKey] = true;
                pills.push('<span class="lq-tag' + (extraCls || '') + '">' + esc(lab) + '</span>');
              }
              const citeExpressing = result.cite_policy === 'cite_closed' || result.service_status === 'restricted';
              const licRaw = result.license_label;
              const licLab = metaLabel(licRaw);
              // Skip bare license_label「引用未开放」when cite_policy already paints 公共引用未开 / 引用未开放
              if (!(citeExpressing && (licRaw === 'cite_closed' || licLab === '引用未开放'))) {
                addPill(licRaw);
              }
              pills.push('<span class="lq-tag' + (verified ? ' is-verified' : ' is-unverified') + '">' + (verified ? '已核实' : '待核实') + '</span>');
              if (result.cdnHardBlock) {
                // FLOP hard-block: never paint misleading「正常」「开放」
                addPill('catalog_ok');
                addPill('cdnHardBlock', ' is-flop');
                addPill('hard_deny', ' is-flop');
              } else if (citeExpressing) {
                // 公共层 vs 账号层分开展示；approved → 公共引用未开 + 账号引用已开 only
                const certSt = result.cert && result.cert.status;
                addPill('restricted');
                if (certSt === 'approved') {
                  addPill('public_cite_closed', ' is-cite-block');
                  addPill('account_cite_open', ' is-verified');
                } else if (certSt === 'pending') {
                  addPill('public_cite_closed', ' is-cite-block');
                  addPill('cert_pending', ' is-cite-block');
                } else {
                  addPill('cite_closed', ' is-cite-block');
                }
              } else {
                addPill(result.service_status);
                addPill(result.cite_policy);
              }
              return pills.join('');
            })() + '</div>' +
          '</div>' +
          '<p class="lq-headline">' + esc(result.headline) + '</p>' +
          '<div class="lq-bools">' + BOOL_META.map(function (b) { return boolCell(b.key, result.bools[b.key], verified); }).join('') + '</div>' +
          '<div class="lq-uses"><h3 class="lq-h3">按用途</h3><ul class="lq-use-list">' +
            Object.keys(result.for_uses || {}).map(function (u) {
              const row = result.for_uses[u];
              const st = resolveUseState(u, row, verified);
              return '<li><span class="mono">' + esc(u) + '</span>' +
                '<span class="' + st.rowCls + '">' + esc(st.label) + '</span>' +
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
            '<span class="hint">必测：Ckbf（OFL）· Jlyhmht（引用未开）· SmartFontUI（FLOP）</span></div>' +
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
    const ex = document.getElementById('lqExpire');
    if (ex) ex.addEventListener('click', function () {
      if (!result || !result.cert) return;
      WFApi.reviewCert(result.cert.cert_id, { status: 'expired' }).then(function () {
        WFChrome.toast('已标过期');
        run();
      }).catch(function (err) { WFChrome.toast((err && err.message) || '失败'); });
    });
    function doUploadCert() {
      WFApi.createCert({ fontId: fontKey, note: 'mock upload' }).then(function () {
        WFChrome.toast('已提交证书 · 审核中');
        run();
      }).catch(function (err) { WFChrome.toast((err && err.message) || '上传失败'); });
    }
    const up = document.getElementById('lqUploadCert');
    if (up) up.addEventListener('click', doUploadCert);
    const vc = document.getElementById('lqViewCert');
    if (vc) vc.addEventListener('click', function () {
      if (!result || !result.cert) return;
      WFChrome.toast('证书 ' + (CERT_STATUS_LABEL[result.cert.status] || '') + ' · ' + (result.cert.cert_id || ''));
    });
    const ctaBtn = document.getElementById('lqCta');
    if (ctaBtn) ctaBtn.addEventListener('click', function () {
      const c = ctaBtn.getAttribute('data-cta');
      if (c === 'blocked' || c === 'cert_pending') return;
      if (c === 'upload_cert') {
        const dup = document.getElementById('lqUploadCert');
        if (dup) dup.click();
        else doUploadCert();
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
