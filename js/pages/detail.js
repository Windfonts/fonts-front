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
      no.push('再分发须遵守 GPL', '嵌入专有软件前先读原文');
    } else if (/OFL|Open Font|Apache|MIT|IPA/i.test(name + ' ' + (ev.spdx || ''))) {
      ok.push('网页、App、印刷、商业项目均可使用', '可嵌入网页并再分发（保留许可声明）', '可修改后以其他名称发布');
      no.push('不得单独售卖字体文件', '不得去除版权与许可声明');
    } else if (tier === '免费商用') {
      ok.push('可免费用于商业项目与网页嵌入', '可用于品牌、电商、海报、界面');
      no.push('不得修改字体文件后再分发', '不得单独售卖字体文件');
      if (!ev.verified) no.push('条款还没核对原文，先看出处');
      if (ev.sourceKind === 'platform') no.push('目前只有素材站声明，不是厂商官网');
    } else if (tier === '个人免费') {
      ok.push('个人非商业用途免费');
      no.push('商业用途需另行授权', '不得衍生与再分发');
    } else if (tier === '需授权') {
      ok.push('取得厂商授权后可按合同范围使用');
      no.push('未授权不得用于任何公开项目', '不得再分发字体文件');
    } else {
      no.push('许可还没核实，用之前先联系厂商');
    }
    (ev.restrictions || []).forEach(function (t) { if (no.indexOf(t) === -1) no.push(t); });
    return { ok: ok, no: no, notes: font.licenseNotes || '' };
  }

  function licenseLead(tier) {
    if (tier === '免费商用') return '可免费用于网页、App、印刷与商业项目。';
    if (tier === '个人免费') return '个人非商业用途免费，商用需另行授权。';
    if (tier === '需授权') return '取得厂商授权后才可公开使用。';
    return '许可还没核对，用之前先联系权利人。';
  }

  function faceOf(f) {
    const w = WFSpecimen.firstWeight(f);
    WFProto.ensureFontCss(f.family, w);
    return 'font-family:' + esc(WFProto.cssFamilyStack(f.family)) + ';font-weight:' + w;
  }
  function lineageBodyHtml(font, list) {
    const L = (font && font.lineage) || {};
    const tree = WFChrome.lineageTreeHtml(font, list, faceOf) || '';
    const kinN = WFChrome.lineageKin(list, font).length;
    const kin = L.group && kinN > 1
      ? '<a class="btn" href="' + WFChrome.href('fonts.html?lineage=' + encodeURIComponent(L.group)) + '">' + WFChrome.icon('compare') + '查看全部同源字</a>'
      : '';
  return tree +
    '<div class="lin-acts">' +
      '<a class="btn ink-design" href="' + WFChrome.href('app/upload.html?upstream=' + encodeURIComponent(font.id)) + '">' + WFChrome.icon('upload') + '上传你的字体</a>' +
        kin +
      '</div>';
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
    const avatar = WFChrome.brandAvatar(font);
    /* 厂商简介：字典 description 优先（多段取首段做侧栏摘要，全文在厂商页） */
    const brandInfoEntry = WFChrome.brandInfo(font) || {};
    const brandDesc = (brandInfoEntry.description ||
      ((font.brand && font.brand.description && !/出品的字体$/.test(font.brand.description)) ? font.brand.description : '')
    ).split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean)[0] || '';
    const lic = licenseLists(font);
    const user = WFChrome.user();
    const sample = WFSpecimen.PRESETS.filter(function (p) { return p.id === 'poem'; })[0].text;

    // 字体本身的属性两边都给；只有接入机制（版本、字形数）归开发。
    const kv = [
      maker ? { icon: 'palette', dt: '制作方', dd: '<a href="foundry.html?slug=' + encodeURIComponent(maker.id) + '">' + esc(maker.name) + '</a>', html: true } : null,
      { icon: 'classify', dt: '分类', dd: WFChrome.catLabel(font.category) || font.category },
      { icon: 'translate', dt: '语言', dd: (font.languages || []).map(function (l) { return l === '英语' ? '英文' : l; }).join(' · ') },
      { icon: 'calendar', dt: '发布', dd: font.releaseYear ? String(font.releaseYear) : '' },
      { icon: 'eye', dt: '浏览', dd: font.viewCount ? WFProto.formatCount(font.viewCount) : '' },
      { icon: 'version', dt: '版本', dd: font.version, dev: true },
      { icon: 'text', dt: '字形数', dd: font.glyphCount ? WFProto.formatCount(font.glyphCount) : '', dev: true }
    ].filter(function (r) { return r && r.dd; });

    const lineageBody = lineageBodyHtml(font, list);
    const wallText = sample || font.name;
    const crumb = '<p class="crumb"><a href="fonts.html">字体库</a><span>/</span>' +
      (font.category ? '<a href="fonts.html?cat=' + encodeURIComponent(font.category) + '">' + esc(WFChrome.catLabel(font.category) || font.category) + '</a><span>/</span>' : '') +
      '<span>' + esc(font.name) + '</span></p>';
    root.innerHTML =
      '<div class="container detail-crumb">' + crumb + '</div>' +
      '<section class="glyph-wall" id="glyphWall"><div class="container glyph-wall-inner">' +
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
          (weights.length > 1
            ? '<div class="weights" role="group" aria-label="字重">' + weights.map(function (w) {
                const c = WFProto.weightToCss(w);
                return '<button type="button" data-w="' + c + '"' + (c === w0 ? ' class="is-on"' : '') + '>' +
                  esc(w) + '<span class="for-dev"> ' + c + '</span></button>';
              }).join('') + '</div>'
            : '') +
          '<span class="spacer"></span>' +
          '<button type="button" class="btn-text" id="btnWallReset" hidden>' + WFChrome.icon('text') + '灰墙</button>' +
          '<button type="button" class="btn-text" id="btnShare" hidden>' + WFChrome.icon('link') + '复制链接</button>' +
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
          '</p>' +
        '</div>' +
        '<div class="detail-actions">' +
          '<button type="button" class="btn ink-design" id="btnPick" data-join="' + esc(font.id) + '" data-name="' + esc(font.name) + '">' + WFChrome.icon('plus') + '加入选字袋</button>' +
          '<button type="button" class="btn ink-dev" id="btnUse">' + WFChrome.icon('code') + '获取代码</button>' +
        '</div>' +
      '</div>' +
      '<div class="detail-body">' +
        '<div class="detail-main">' +
          '<section class="panel for-dev" id="use"><div class="panel-head"><h2>' + WFChrome.icon('code') + '使用</h2>' +
            '<div class="use-versions" id="versions">' + WFEmbed.VERSIONS.map(function (v, i) {
              return '<button type="button" class="chip' + (i === 0 ? ' is-on' : '') + '" data-version="' + v.id + '" title="' + esc(v.hint) + '">' +
                v.label + ' <span class="n">≈ ' + WFEmbed.fmtBytes(WFEmbed.versionSize(font, v.id)) + '</span></button>';
            }).join('') + '</div></div>' +
            '<div class="panel-pad"><div id="embed"></div>' +
            '<p class="use-note">体积按单字重估算。只要页面里出现的字，用 <a href="' + (user ? 'app/subset.html?font=' + encodeURIComponent(font.id) : 'login.html') + '">子集化工作台</a>。' +
              '<code>font-family</code> 用 <code>' + esc(WFEmbed.familyName(font.family)) + '</code>。</p></div>' +
          '</section>' +
          (weights.length > 1
            ? '<section class="panel" id="weights"><div class="panel-head"><h2>' + WFChrome.icon('font') + '字重</h2></div>' +
              '<div class="panel-pad weights-sheet" id="sheet">' + WFSpecimen.weightsSheetHtml(font, sample, w0) + '</div></section>'
            : '') +
          '<section class="panel" id="glyphs"><div class="panel-head"><h2>' + WFChrome.icon('hashtag') + '字符表</h2><div class="glyph-tools" id="glyphTools"></div></div>' +
            '<div class="panel-pad"><div class="glyph-summary" id="glyphSummary" aria-live="polite"></div><div class="glyph-blocks" id="glyphBlocks"></div></div></section>' +
          '<section class="panel" id="license"><div class="panel-head"><h2>' + WFChrome.icon('certificate') + '授权</h2>' +
            '<div class="license-head"><span class="tier">' + esc(WFChrome.licenseTier(font)) + '</span>' +
              (font.licenseName ? '<span class="name">' + esc(font.licenseName) + '</span>' : '') + '</div></div>' +
            '<div class="panel-pad">' +
            '<p class="license-lead">' + esc(licenseLead(WFChrome.licenseTier(font))) + '</p>' +
            '<details class="side-fold license-fold"><summary>' + WFChrome.icon('chevron-down') + '出处与依据</summary>' +
              WFChrome.licenseCiteHtml(font) +
              '<div class="license-grid">' +
                '<div><h3>可以</h3><ul class="ok">' + lic.ok.slice(0, 3).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' +
                '<div><h3>不可以</h3><ul class="no">' + lic.no.slice(0, 3).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' +
              '</div>' +
              (lic.notes ? '<p class="license-notes">' + esc(lic.notes) + '</p>' : '') +
              '<p class="license-foot">' + (font.copyright ? esc(font.copyright) + '<br>' : '') +
                (font.purchaseUrl ? '<a href="' + esc(font.purchaseUrl) + '" target="_blank" rel="noopener noreferrer">购买授权</a>' : '') +
                ' <a href="docs.html#license">许可类型说明</a></p></details></div>' +
          '</section>' +
          '<section class="panel" id="lineage"><div class="panel-head"><h2>' + WFChrome.icon('branch') + '谱系</h2></div>' +
            '<div class="panel-pad">' + lineageBody + '</div></section>' +
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
              : '<p class="claim is-quiet">' + WFChrome.icon('verified') + '未认领 · <a href="' + (WFChrome.brandSlug(font) ? 'claim.html?slug=' + encodeURIComponent(WFChrome.brandSlug(font)) : 'claim.html') + '">认领</a></p>') +
            '<div class="side-meta"><h3>' + WFChrome.icon('info') + '资料</h3><dl class="kv">' + kv.map(function (r) {
              return '<div' + (r.dev ? ' class="for-dev"' : '') + '><dt>' + WFChrome.icon(r.icon) + esc(r.dt) + '</dt><dd' + (!r.html && /^[\d,.\s]+$/.test(r.dd) ? ' class="num"' : '') + '>' +
                (r.html ? r.dd : esc(r.dd)) + '</dd></div>';
            }).join('') + '</dl></div>' +
          '</div>' +
          '<div class="panel panel-pad"><h3>' + WFChrome.icon('star') + '标签</h3><div class="chips">' + (font.tags || []).map(function (t) {
            return '<a class="chip" href="fonts.html?tag=' + encodeURIComponent(t) + '">' + esc(t) + '</a>';
          }).concat((font.useCases || []).map(function (t) {
            return '<a class="chip" href="fonts.html?keyword=' + encodeURIComponent(t) + '">' + esc(t) + '</a>';
          })).join('') + '</div></div>' +
        '</aside>' +
      '</div>' +
      '</div>';

    wire(font, weights, w0);
  }

  function wire(font, weights, w0) {
    const hero = document.getElementById('hero');
    let weight = w0;
    let version = 'full';
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
    let tester;
    let glyphTable;
    size.addEventListener('input', function () {
      hero.style.fontSize = size.value + 'px';
      sizeVal.textContent = size.value + 'px';
      if (tester) tester.sync({ size: Number(size.value) });
    });
    function syncWeightUi() {
      document.querySelectorAll('#wallTools [data-w], #sheet [data-w]').forEach(function (x) {
        x.classList.toggle('is-on', x.getAttribute('data-w') === String(weight));
      });
    }
    function setWeight(w) {
      weight = String(w);
      hero.style.fontWeight = weight;
      embed.setItems([{ family: font.family, weights: [weight], version: version }]);
      if (tester) tester.sync({ weight: weight });
      if (glyphTable) glyphTable.setWeight(weight);
      syncWeightUi();
    }
    document.querySelectorAll('#wallTools [data-w], #sheet [data-w]').forEach(function (b) {
      b.addEventListener('click', function () { setWeight(b.getAttribute('data-w')); });
    });
    function syncTools() {
      sizeVal.textContent = size.value + 'px';
      syncWeightUi();
    }
    hero.addEventListener('input', function () {
      if (hero.classList.contains('is-wall')) return;
      const t = hero.textContent || font.name;
      document.querySelectorAll('[data-weight-line]').forEach(function (n) { n.textContent = t; });
    });
    function applyWallState(s) {
      if (s.size) { size.value = String(Math.round(s.size)); hero.style.fontSize = size.value + 'px'; }
      if (s.weight) {
        weight = String(s.weight);
        if (glyphTable) glyphTable.setWeight(weight);
      }
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
        embed.setItems([{ family: font.family, weights: [w], version: version }]);
        if (glyphTable) glyphTable.setWeight(w);
        syncWeightUi();
      },
      onClose: applyWallState,
      onRestore: applyWallState,
      onCard: function (on) {
        const share = document.getElementById('btnShare');
        const reset = document.getElementById('btnWallReset');
        if (share) share.hidden = !on;
        if (reset) reset.hidden = !on;
      }
    });
    const btnShare = document.getElementById('btnShare');
    if (btnShare) btnShare.addEventListener('click', function () { tester.share(); });
    const btnReset = document.getElementById('btnWallReset');
    if (btnReset) btnReset.addEventListener('click', function () { tester.clearCard(); });
    var editScrollY;
    document.getElementById('btnEdit').addEventListener('mousedown', function () { editScrollY = window.scrollY; }, true);
    document.getElementById('btnEdit').addEventListener('click', function () {
      tester.open({ size: Number(size.value), weight: weight, scrollY: editScrollY });
    });
    function goUse() {
      WFChrome.setView('dev');
      const use = document.getElementById('use');
      if (use) use.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const btnUse = document.getElementById('btnUse');
    if (btnUse) btnUse.addEventListener('click', goUse);
    if (/^#(use|glyphs|lineage)$/.test(location.hash)) WFChrome.setView('dev');

    glyphTable = WFSpecimen.mountGlyphTable(
      document.getElementById('glyphBlocks'),
      document.getElementById('glyphSummary'),
      document.getElementById('glyphTools'),
      font,
      weight
    );

  }

  WFProto.loadCatalog().then(function (list) {
    const id = WFProto.getQuery('id');
    const font = WFProto.getFont(id) || list[0];
    if (!font) { root.innerHTML = '<p class="empty">未找到该字体。<a href="fonts.html">回到字体库</a></p>'; return; }
    if (!id) history.replaceState(null, '', 'font-detail.html?id=' + encodeURIComponent(font.id));
    render(font);
  });
})();
