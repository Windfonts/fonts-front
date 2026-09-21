/* 字体详情：144px 可编辑标题样张 / 字重逐行 / 使用 / 字符表 / 授权 / 侧栏版权页 / 相关字体 */
(function () {
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('detailRoot');

  function licenseLists(font) {
    const tier = WFChrome.licenseTier(font);
    const ev = WFChrome.licenseEvidence(font);
    const name = String(font.licenseName || ev.label || font.license || '');
    const ok = [], no = [];
    if (/GPL/i.test(ev.spdx || name)) {
      ok.push('可按 GPL 使用、修改与再分发');
      no.push('再分发须遵守 GPL，不能当 MIT 用', '嵌入专有软件前先读原文');
    } else if (/OFL|Open Font|Apache|MIT|IPA/i.test(name + ' ' + (ev.spdx || ''))) {
      ok.push('网页、App、印刷、商业项目均可使用', '可嵌入网页并再分发（保留许可声明）', '可修改后以其他名称发布');
      no.push('不得单独售卖字体文件', '不得去除版权与许可声明');
    } else if (tier === '免费商用') {
      ok.push('可免费用于商业项目与网页嵌入', '可用于品牌、电商、海报、界面');
      no.push('不得修改字体文件后再分发', '不得单独售卖字体文件');
      if (!ev.verified) no.push('条款尚未核对原文，上线前请打开出处');
      if (ev.sourceKind === 'platform') no.push('目前只有素材站声明，不是厂商官网');
    } else if (tier === '个人免费') {
      ok.push('个人非商业用途免费');
      no.push('商业用途需另行授权', '不得衍生与再分发');
    } else if (tier === '需授权') {
      ok.push('取得厂商授权后可按合同范围使用');
      no.push('未授权不得用于任何公开项目', '不得再分发字体文件');
    } else {
      no.push('许可信息待核实，上线嵌入前请先联系厂商');
    }
    (ev.restrictions || []).forEach(function (t) { if (no.indexOf(t) === -1) no.push(t); });
    return { ok: ok, no: no, notes: font.licenseNotes || '' };
  }

  function licenseLead(tier) {
    if (tier === '免费商用') return '可免费用于网页、App、印刷与商业项目。';
    if (tier === '个人免费') return '个人非商业用途免费，商用需另行授权。';
    if (tier === '需授权') return '取得厂商授权后才可公开使用。';
    return '许可尚未核对，上线前请先联系权利人。';
  }

  function render(font) {
    const list = WFProto.getCatalogList();
    document.title = font.name + ' · 文风字体';
    const weights = WFSpecimen.sortedWeights(font);
    const stack = WFProto.cssFamilyStack(font.family);
    const w0 = WFSpecimen.firstWeight(font);
    weights.forEach(function (w) { WFProto.ensureFontCss(font.family, w); });
    const brand = WFChrome.brandName(font);
    const brandCount = list.filter(function (f) { return WFChrome.brandSlug(f) === WFChrome.brandSlug(font); }).length;
    const maker = WFChrome.makerInfo(font);
    const L = font.lineage || {};
    const avatar = WFChrome.brandAvatar(font);
    /* 厂商简介：字典 description 优先（多段取首段做侧栏摘要，全文在厂商页） */
    const brandInfoEntry = WFChrome.brandInfo(font) || {};
    const brandDesc = (brandInfoEntry.description ||
      ((font.brand && font.brand.description && !/出品的字体$/.test(font.brand.description)) ? font.brand.description : '')
    ).split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean)[0] || '';
    const lic = licenseLists(font);
    const user = WFChrome.user();
    const sample = WFSpecimen.PRESETS.filter(function (p) { return p.id === 'poem'; })[0].text;

    // [标签, 值, 值是否为 HTML, 仅开发模式]。字体本身的属性两边都给；只有接入机制（版本、字形数）归开发。
    const kv = [
      maker ? ['制作方', '<a href="foundry.html?slug=' + encodeURIComponent(maker.id) + '">' + esc(maker.name) + '</a>', true] : null,
      ['字重', String(weights.length)],
      ['字符数', font.charCount ? WFProto.formatCount(font.charCount) : ''],
      ['分类', font.category], ['语言', (font.languages || []).join(' · ')],
      ['发布', font.releaseYear ? String(font.releaseYear) : ''],
      ['浏览', font.viewCount ? WFProto.formatCount(font.viewCount) : ''],
      ['版本', font.version, false, true],
      ['字形数', font.glyphCount ? WFProto.formatCount(font.glyphCount) : '', false, true]
    ].filter(function (r) { return r && r[1]; });

    const wallText = sample || font.name;
    root.innerHTML =
      '<section class="glyph-wall" id="glyphWall"><div class="container glyph-wall-inner">' +
        '<p class="crumb crumb-dark"><a href="fonts.html">字体库</a><span>/</span>' +
          (font.category ? '<a href="fonts.html?cat=' + encodeURIComponent(font.category) + '">' + esc(font.category) + '</a><span>/</span>' : '') +
          '<span>' + esc(font.name) + '</span></p>' +
        '<div class="studio-body"><div class="tester-templates" id="wallTpl" hidden></div><div class="tester-controls" id="wallCtl" hidden></div><div class="card-view" id="cardView"><div class="wall-stage" id="heroStage" style="--card-face:' + esc(stack) + '">' +
          '<img class="card-bg" data-paint="img" data-slot="bg" alt="" /><div class="card-scrim" data-paint="fill"></div>' +
          '<div class="card-safe" data-guide hidden></div>' +
          '<div class="card-body"><span class="card-quote" aria-hidden="true">「</span><div class="wall" id="hero" contenteditable="true" spellcheck="false" data-placeholder="输入文字" style="font-family:' +
            esc(stack) + ';font-weight:' + w0 + '">' + esc(wallText) + '</div></div>' +
          '<footer class="card-meta"><img class="card-avatar" data-paint="img" data-slot="avatar" alt="" /><span class="card-rule"></span>' +
            '<div class="card-lines"><span class="card-sub" data-slot="sub" contenteditable="true" spellcheck="false" data-placeholder="副文字 / 署名"></span>' +
            '<span class="card-credit"><span class="card-name" data-card-name contenteditable="true" spellcheck="false" data-placeholder="字体名"></span>' +
            '<span class="card-brand" data-card-brand contenteditable="true" spellcheck="false" data-placeholder="品牌"></span><span class="card-mark">文风</span></span></div></footer>' +
        '</div></div></div>' +
        '<div class="wall-tools" id="wallTools">' +
          '<input class="range" type="range" id="heroSize" min="24" max="240" value="64" aria-label="字号" />' +
          '<span class="val" id="heroSizeVal">64px</span>' +
          '<div class="weights" role="group" aria-label="字重">' + weights.map(function (w) {
            const c = WFProto.weightToCss(w);
            return '<button type="button" data-w="' + c + '"' + (c === w0 ? ' class="is-on"' : '') + '>' + esc(w) + ' ' + c + '</button>';
          }).join('') + '</div>' +
          '<div class="presets">' + WFSpecimen.PRESETS.map(function (p) {
            return '<button type="button" data-preset="' + p.id + '"' + (p.id === 'poem' ? ' class="is-on"' : '') + '>' + p.label + '</button>';
          }).join('') + '<button type="button" data-preset="__wall">字形墙</button></div>' +
          '<span class="spacer"></span>' +
          '<button type="button" class="btn-text for-design" id="btnEdit">' + WFChrome.icon('edit') + '编辑样张</button>' +
        '</div>' +
      '</div></section>' +
      '<div class="container">' +
      '<div class="detail-title">' +
        '<div class="detail-title-main">' +
          '<h1>' + esc(font.name) + (font.en ? ' <small>' + esc(font.en) + '</small>' : '') + '</h1>' +
          '<p class="dotlist">' +
            '<a class="foundry-inline" href="foundry.html?slug=' + encodeURIComponent(WFChrome.brandSlug(font)) + '">' +
              (avatar ? '<img src="' + esc(avatar) + '" alt="" />' : '') + esc(brand || '未署名') +
              (WFChrome.brandVerified(font) ? WFChrome.VERIFIED_SVG : '') + '</a>' +
            '<span>' + weights.length + ' 字重</span>' +
            '<span>' + esc(WFChrome.licenseTier(font)) + '</span>' +
            (font.charCount ? '<span>' + WFProto.formatCount(font.charCount) + ' 字</span>' : '') +
            (font.version ? '<span class="for-dev">v' + esc(String(font.version).replace(/^v/i, '')) + '</span>' : '') +
          '</p>' +
        '</div>' +
        '<div class="detail-actions">' +
          '<button type="button" class="btn ink-design" id="btnPick" data-join="' + esc(font.id) + '" data-name="' + esc(font.name) + '">' + WFChrome.icon('plus') + '加入选字袋</button>' +
          (user
            ? '<a class="btn btn-ink for-dev" href="app/subset.html?font=' + encodeURIComponent(font.id) + '">' + WFChrome.icon('scissors') + '添加到项目</a>'
            : '<button type="button" class="btn btn-ink for-dev" id="btnUse">' + WFChrome.icon('code') + '获取代码</button>') +
        '</div>' +
      '</div>' +
      '<div class="detail-body">' +
        '<div class="detail-main">' +
          '<section class="panel for-dev" id="preview"><div class="panel-head"><h2>字体预览</h2>' +
            '<div class="os-switch seg seg-ink" role="tablist" aria-label="系统回退">' +
              [['', '网页'], ['mac', 'macOS'], ['win', 'Windows'], ['android', 'Android']].map(function (os, i) {
                return '<button type="button" data-os="' + os[0] + '"' + (i === 0 ? ' class="is-on"' : '') + '>' + os[1] + '</button>';
              }).join('') +
            '</div>' +
            '<input class="input" id="sheetText" value="' + esc(sample) + '" aria-label="预览文字" style="max-width:20rem" /></div>' +
            '<div class="panel-pad">' +
              '<p class="os-meta" id="osMeta">回退：PingFang SC · Microsoft YaHei。本机没有网页字体时，各系统会落到下面的栈。</p>' +
              '<div class="big-preview" id="bigPreview" style="font-family:' + esc(stack) + ';font-weight:' + w0 + '">' + esc(sample) + '</div>' +
              '<div class="feat-panel" id="features"></div></div></section>' +
          '<section class="panel" id="weights"><div class="panel-head"><h2>字重 · ' + weights.length + '</h2></div>' +
            '<div class="panel-pad weights-sheet" id="sheet">' + WFSpecimen.weightsSheetHtml(font, sample) + '</div></section>' +
          '<section class="panel for-dev" id="use"><div class="panel-head"><h2>使用</h2>' +
            '<div class="use-versions" id="versions">' + WFEmbed.VERSIONS.map(function (v, i) {
              return '<button type="button" class="chip' + (i === 0 ? ' is-on' : '') + '" data-version="' + v.id + '" title="' + esc(v.hint) + '">' +
                v.label + ' <span class="n">≈ ' + WFEmbed.fmtBytes(WFEmbed.versionSize(font, v.id)) + '</span></button>';
            }).join('') + '</div></div>' +
            '<div class="panel-pad"><div id="embed"></div>' +
            '<p class="use-note">体积为 woff2 单字重估算。需要只打包页面实际出现的字，用控制台的 <a href="' + (user ? 'app/subset.html?font=' + encodeURIComponent(font.id) : 'login.html') + '">子集化工作台</a>；' +
              '<code>font-family</code> 以 API 返回的 <code>' + esc(WFEmbed.familyName(font.family)) + '</code> 为准。</p></div>' +
          '</section>' +
          '<section class="panel" id="glyphs"><div class="panel-head"><h2>字符表</h2><div class="glyph-tools" id="glyphTools"></div></div>' +
            '<div class="panel-pad"><div class="glyph-summary" id="glyphSummary" aria-live="polite"></div><div class="glyph-blocks" id="glyphBlocks"></div></div></section>' +
          '<section class="panel" id="license"><div class="panel-head"><h2>授权</h2>' +
            '<div class="license-head"><span class="tier">' + esc(WFChrome.licenseTier(font)) + '</span>' +
              (font.licenseName ? '<span class="name">' + esc(font.licenseName) + '</span>' : '') + '</div></div>' +
            '<div class="panel-pad">' +
            '<p class="license-lead">' + esc(licenseLead(WFChrome.licenseTier(font))) + '</p>' +
            '<div class="license-grid">' +
              '<div><h3>可以</h3><ul class="ok">' + lic.ok.slice(0, 3).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' +
              '<div><h3>不可以</h3><ul class="no">' + lic.no.slice(0, 3).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' +
            '</div>' +
            '<details class="side-fold license-fold"><summary>' + WFChrome.icon('chevron-down') + '出处与依据</summary>' +
              WFChrome.licenseCiteHtml(font) +
              WFChrome.lineageHtml(font) +
              (lic.notes ? '<p class="license-notes">' + esc(lic.notes) + '</p>' : '') +
              (lic.ok.length > 3 || lic.no.length > 3
                ? '<div class="license-grid">' +
                    (lic.ok.length > 3 ? '<div><h3>还可以</h3><ul class="ok">' + lic.ok.slice(3).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' : '') +
                    (lic.no.length > 3 ? '<div><h3>还不可以</h3><ul class="no">' + lic.no.slice(3).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' : '') +
                  '</div>'
                : '') +
              '<p class="license-foot">' + (font.copyright ? esc(font.copyright) + '<br>' : '') +
                (font.purchaseUrl ? '<a href="' + esc(font.purchaseUrl) + '" target="_blank" rel="noopener noreferrer">购买授权</a>' : '') +
                ' <a href="docs.html#license">许可类型说明</a></p></details></div>' +
          '</section>' +
        '</div>' +
        '<aside class="detail-side" aria-label="字体资料">' +
          '<div class="panel panel-pad side-brand">' +
            WFChrome.foundryHtml(font, { sub: '在库 ' + brandCount + ' 款' }) +
            (brandDesc ? '<p class="brand-desc">' + esc(brandDesc) + '</p>' : '') +
            (font.description
              ? '<details class="side-fold"><summary>' + WFChrome.icon('chevron-down') + '简介</summary>' +
                '<p class="desc" id="desc">' + esc(font.description) + '</p></details>'
              : '') +
            (WFChrome.brandVerified(font)
              ? '<p class="claim"><span class="badge-verified">' + WFChrome.VERIFIED_SVG + '</span> 已认领</p>'
              : '<p class="claim is-quiet">未认领 · <a href="login.html?next=app&back=settings.html">认领</a></p>') +
          '</div>' +
          '<div class="panel panel-pad"><h3>资料</h3><dl class="kv">' + kv.map(function (r) {
            const html = !!r[2];
            return '<div' + (r[3] ? ' class="for-dev"' : '') + '><dt>' + esc(r[0]) + '</dt><dd' + (!html && /^[\d,.\s]+$/.test(r[1]) ? ' class="num"' : '') + '>' +
              (html ? r[1] : esc(r[1])) + '</dd></div>';
          }).join('') + '</dl></div>' +
          '<div class="panel panel-pad"><h3>标签</h3><div class="chips">' + (font.tags || []).map(function (t) {
            return '<a class="chip" href="fonts.html?tag=' + encodeURIComponent(t) + '">' + esc(t) + '</a>';
          }).concat((font.useCases || []).map(function (t) {
            return '<a class="chip" href="fonts.html?keyword=' + encodeURIComponent(t) + '">' + esc(t) + '</a>';
          })).join('') + '</div></div>' +
        '</aside>' +
      '</div>' +
      '<section class="detail-related"><div class="section-head"><h2>' + (L.groupName ? '同系字体' : '相关字体') + '</h2>' +
        (L.group ? '<a class="more" href="fonts.html?lineage=' + encodeURIComponent(L.group) + '">' + esc(L.groupName || '同系') + ' →</a>' : '') +
        (brand ? '<a class="more" href="foundry.html?slug=' + encodeURIComponent(WFChrome.brandSlug(font)) + '">' + esc(brand) + ' 全部 →</a>' : '') +
      '</div><ul class="specimens is-grid" id="related"></ul></section>' +
      '</div>';

    wire(font, weights, w0);
  }

  function wire(font, weights, w0) {
    const hero = document.getElementById('hero');
    let weight = w0;
    let version = 'full';
    const sheetText = document.getElementById('sheetText');
    const big = document.getElementById('bigPreview');
    function applyPreview(text, isWall) {
      if (hero.textContent !== text) hero.textContent = text;
      hero.classList.toggle('is-wall', !!isWall);
      if (isWall) return;
      sheetText.value = text;
      big.textContent = text;
      document.querySelectorAll('[data-weight-line]').forEach(function (n) { n.textContent = text; });
    }
    const OS_META = {
      '': '回退：PingFang SC · Microsoft YaHei。网页默认栈，兼顾 macOS 与 Windows。',
      mac: '回退：PingFang SC · Hiragino Sans GB · 黑体-简。接近 Safari / 系统界面。',
      win: '回退：微软雅黑 · 黑体 · Segoe UI。接近 Chromium / Edge 在 Windows 上的表现。',
      android: '回退：Noto Sans CJK SC · Roboto。接近 Android Chrome / WebView。'
    };
    function applyOs(os) {
      const next = WFProto.cssFamilyStack(font.family, os || undefined);
      big.style.fontFamily = next;
      document.querySelectorAll('[data-weight-line]').forEach(function (n) { n.style.fontFamily = next; });
      document.getElementById('osMeta').textContent = OS_META[os] || OS_META[''];
    }
    document.querySelectorAll('[data-os]').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('[data-os]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        applyOs(b.getAttribute('data-os'));
      });
    });
    sheetText.addEventListener('input', function () {
      const v = sheetText.value || font.name;
      big.textContent = v;
      document.querySelectorAll('[data-weight-line]').forEach(function (n) { n.textContent = v; });
    });

    const embed = WFEmbed.mount(document.getElementById('embed'), [{ family: font.family, weights: [weight], version: version }]);
    document.querySelectorAll('[data-version]').forEach(function (b) {
      b.addEventListener('click', function () {
        version = b.getAttribute('data-version');
        document.querySelectorAll('[data-version]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        embed.setItems([{ family: font.family, weights: [weight], version: version }]);
      });
    });

    const pick = document.getElementById('btnPick');
    function syncPick() {
      const on = WFProto.hasPick(font.id);
      pick.innerHTML = WFChrome.icon(on ? 'check' : 'plus') + (on ? '已在选字袋' : '加入选字袋');
    }
    pick.addEventListener('click', function () {
      const on = WFProto.hasPick(font.id);
      WFProto.togglePick(font.id, font.name);
      WFChrome.toast(on ? '已从选字袋移除' : '已加入选字袋');
      syncPick();
    });
    syncPick();

    const size = document.getElementById('heroSize');
    const sizeVal = document.getElementById('heroSizeVal');
    const tools = document.getElementById('wallTools');
    const WALL = '天地玄黄 宇宙洪荒 日月盈昃 Aa 0123';
    let tester;
    size.addEventListener('input', function () {
      hero.style.fontSize = size.value + 'px';
      sizeVal.textContent = size.value + 'px';
      if (tester) tester.sync({ size: Number(size.value) });
    });
    tools.querySelectorAll('[data-w]').forEach(function (b) {
      b.addEventListener('click', function () {
        weight = b.getAttribute('data-w');
        tools.querySelectorAll('[data-w]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        hero.style.fontWeight = weight;
        big.style.fontWeight = weight;
        embed.setItems([{ family: font.family, weights: [weight], version: version }]);
        if (tester) tester.sync({ weight: weight });
      });
    });
    tools.querySelectorAll('[data-preset]').forEach(function (b) {
      b.addEventListener('click', function () {
        const id = b.getAttribute('data-preset');
        const p = WFSpecimen.PRESETS.filter(function (x) { return x.id === id; })[0];
        applyPreview(p ? p.text : WALL, id === '__wall');
        tools.querySelectorAll('[data-preset]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        if (tester) tester.sync({});
      });
    });
    function syncTools() {
      sizeVal.textContent = size.value + 'px';
      tools.querySelectorAll('[data-w]').forEach(function (x) { x.classList.toggle('is-on', x.getAttribute('data-w') === weight); });
    }
    hero.addEventListener('input', function () {
      if (hero.classList.contains('is-wall')) return;
      const t = hero.textContent || font.name;
      sheetText.value = t;
      big.textContent = t;
      document.querySelectorAll('[data-weight-line]').forEach(function (n) { n.textContent = t; });
    });
    function applyWallState(s) {
      if (s.size) { size.value = String(Math.round(s.size)); hero.style.fontSize = size.value + 'px'; }
      if (s.weight) weight = String(s.weight);
      syncTools();
    }
    tester = WFTester.mount({ tpl: document.getElementById('wallTpl'), ctl: document.getElementById('wallCtl'),
      hero: hero,
      stage: document.getElementById('heroStage'),
      view: document.getElementById('cardView'),
      wall: document.getElementById('glyphWall'),
      bar: tools,
      font: font,
      weights: weights,
      weight: weight,
      onWeight: function (w) {
        weight = w;
        big.style.fontWeight = w;
        embed.setItems([{ family: font.family, weights: [w], version: version }]);
      },
      onClose: applyWallState,
      onRestore: applyWallState
    });
    var editScrollY;
    document.getElementById('btnEdit').addEventListener('mousedown', function () { editScrollY = window.scrollY; }, true);
    document.getElementById('btnEdit').addEventListener('click', function () {
      tester.open({ size: Number(size.value), weight: weight, scrollY: editScrollY });
    });
    WFFeatures.mount(document.getElementById('features'), {
      targets: function () { return [big].concat(Array.prototype.slice.call(document.querySelectorAll('[data-weight-line]'))); }
    });
    function goUse() {
      WFChrome.setView('dev');
      const use = document.getElementById('use');
      if (use) use.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const btnUse = document.getElementById('btnUse');
    if (btnUse) btnUse.addEventListener('click', goUse);
    function syncLicenseFold() {
      const fold = document.querySelector('#license .license-fold');
      if (fold) fold.open = WFChrome.view() === 'dev';
    }
    syncLicenseFold();
    document.addEventListener('wf:view', syncLicenseFold);
    if (/^#(use|glyphs|preview)$/.test(location.hash)) WFChrome.setView('dev');

    WFSpecimen.mountGlyphTable(
      document.getElementById('glyphBlocks'),
      document.getElementById('glyphSummary'),
      document.getElementById('glyphTools'),
      font
    );

    WFSpecimen.renderRows(document.getElementById('related'), WFProto.relatedFonts(font, 4), { size: 40 });
  }

  WFProto.loadCatalog().then(function (list) {
    const id = WFProto.getQuery('id');
    const font = WFProto.getFont(id) || list[0];
    if (!font) { root.innerHTML = '<p class="empty">未找到该字体。<a href="fonts.html">回到字体库</a></p>'; return; }
    if (!id) history.replaceState(null, '', 'font-detail.html?id=' + encodeURIComponent(font.id));
    render(font);
  });
})();
