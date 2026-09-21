/* 首页：首屏活样张轮换 + 右栏「当前字体」品牌卡。筛选与列表由 fonts.js 提供。 */
(function () {
  const esc = WFProto.escapeHtml;
  /* 首屏轮换：现代黑体打头，再宋、楷、手写 */
  const FEATURED = ['阿里巴巴普惠体', '得意黑', '思源黑体', '站酷', '思源宋体', '霞鹙文楷', 'LXGW', '寒蝉', '钟齐'];

  function pickFeatured(list, n) {
    const out = [];
    FEATURED.forEach(function (key) {
      const f = list.filter(function (x) { return x.name.indexOf(key) !== -1 && out.indexOf(x) === -1; })[0];
      if (f) out.push(f);
    });
    list.filter(function (f) { return WFChrome.licenseTier(f) === '免费商用' && (f.weights || []).length >= 2; })
      .forEach(function (f) { if (out.length < n && out.indexOf(f) === -1) out.push(f); });
    return out.slice(0, n);
  }

  function sideHtml(font, list) {
    const brand = WFChrome.brandName(font);
    const brandCount = list.filter(function (f) { return WFChrome.brandName(f) === brand; }).length;
    const weights = WFSpecimen.sortedWeights(font);
    const w0 = WFSpecimen.firstWeight(font);
    // [标签, 值, 仅开发模式]
    const kv = [
      ['字重', String(weights.length)],
      ['字符数', font.charCount ? WFProto.formatCount(font.charCount) : ''],
      ['发布', font.releaseYear ? String(font.releaseYear) : ''],
      ['版本', font.version, true]
    ].filter(function (r) { return r[1]; });
    const detail = 'font-detail.html?id=' + encodeURIComponent(font.id);
    return '<div class="panel panel-pad">' +
      WFChrome.foundryHtml(font, { sub: '在库 ' + brandCount + ' 款' }) +
      (font.description ? '<p class="desc">' + esc(font.description) + '</p>' : '') +
      '<dl class="kv">' + kv.map(function (r) { return '<div' + (r[2] ? ' class="for-dev"' : '') + '><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '<div class="code for-dev"><pre>' + esc('<link rel="stylesheet"\n  href="' + WFProto.cssUrl(font.family, w0) + '">') + '</pre>' +
        '<button type="button" class="copy" id="sideCopy">' + WFChrome.icon('copy') + '复制</button></div>' +
      '<div class="actions"><a class="btn btn-ink for-dev" href="' + detail + '#use">' + WFChrome.icon('code') + '获取代码</a>' +
        '<button type="button" class="btn ink-design" id="sidePick" data-join="' + esc(font.id) + '">' + WFChrome.icon('plus') + '加入选字袋</button>' +
        '<a class="btn for-design" href="' + detail + '">' + WFChrome.icon('arrow-right') + '查看字体</a></div>' +
      '</div>';
  }

  /* —— 库内一览：全部数字从目录即时计算 —— */
  function renderStats(list) {
    const band = document.getElementById('statsBand');
    if (!band) return;
    const tierOrder = ['免费商用', '需授权', '个人免费', '待核实'];
    const tiers = {};
    const brandCount = {};
    const brandNameBySlug = {};
    let verified = 0;
    const SCALE = [
      { label: '3 千字内', min: 0, max: 3000, n: 0 },
      { label: '3 千–7 千', min: 3000, max: 7000, n: 0 },
      { label: '7 千–1 万', min: 7000, max: 10000, n: 0 },
      { label: '1 万–2 万', min: 10000, max: 20000, n: 0 },
      { label: '2 万以上', min: 20000, max: Infinity, n: 0 }
    ];
    let charKnown = 0;
    list.forEach(function (f) {
      const t = WFChrome.licenseTier(f);
      tiers[t] = (tiers[t] || 0) + 1;
      const slug = WFChrome.brandSlug(f);
      if (slug) {
        brandCount[slug] = (brandCount[slug] || 0) + 1;
        if (!brandNameBySlug[slug]) brandNameBySlug[slug] = WFChrome.brandName(f) || slug;
      }
      if (f.licenseEvidence && f.licenseEvidence.verified) verified++;
      const cc = Number(f.charCount);
      if (cc > 0) {
        charKnown++;
        for (let i = 0; i < SCALE.length; i++) {
          if (cc >= SCALE[i].min && cc < SCALE[i].max) { SCALE[i].n++; break; }
        }
      }
    });

    function rows(items, href) {
      const max = Math.max.apply(null, items.map(function (r) { return r.n; })) || 1;
      return items.map(function (r) {
        const w = Math.max(3, Math.round(r.n / max * 100));
        const inner = '<span class="lab">' + esc(r.label) + '</span>' +
          '<span class="track"><i style="width:' + w + '%"></i></span>' +
          '<span class="num">' + r.n + '</span>';
        return href
          ? '<a class="stat-row" href="' + href(r) + '">' + inner + '</a>'
          : '<div class="stat-row">' + inner + '</div>';
      }).join('');
    }
    function panel(title, body, note) {
      return '<div class="panel panel-pad stat-panel"><h3>' + esc(title) + '</h3>' + body +
        (note ? '<p class="stat-note">' + esc(note) + '</p>' : '') + '</div>';
    }
    function cell(n, label, href) {
      const b = '<b>' + WFProto.formatCount(n) + '</b><span>' + esc(label) + '</span>';
      return href ? '<a class="stat-cell" href="' + href + '">' + b + '</a>' : '<div class="stat-cell">' + b + '</div>';
    }

    const tierItems = tierOrder.filter(function (t) { return tiers[t]; })
      .map(function (t) { return { label: t, n: tiers[t] }; });
    const topBrands = Object.keys(brandCount)
      .map(function (slug) { return { key: slug, label: brandNameBySlug[slug], n: brandCount[slug] }; })
      .sort(function (a, b) { return b.n - a.n; }).slice(0, 6);
    const scaleItems = SCALE.map(function (b) { return { label: b.label, n: b.n }; })
      .concat([{ label: '未录入', n: list.length - charKnown }]);

    band.innerHTML =
      '<div class="section-head"><h2>库内一览</h2></div>' +
      '<div class="stats-strip">' +
        cell(list.length, '在库字体', 'fonts.html') +
        cell(Object.keys(brandCount).length, '厂商与作者', 'foundry.html') +
        cell(tiers['免费商用'] || 0, '免费商用', 'fonts.html?license=' + encodeURIComponent('免费商用')) +
        cell(verified, '许可已核对', 'docs.html#license') +
      '</div>' +
      '<div class="stats-grid">' +
        panel('按授权', rows(tierItems, function (r) { return 'fonts.html?license=' + encodeURIComponent(r.label); }), '口径见许可类型说明。') +
        panel('字体最多的厂商', rows(topBrands, function (r) { return 'foundry.html?slug=' + encodeURIComponent(r.key); })) +
        panel('字符规模', rows(scaleItems), '按已录入字符数的 ' + charKnown + ' 款统计；未录入不参与分档。') +
      '</div>';
  }

  WFProto.loadCatalog().then(function (list) {
    renderStats(list);
    const featured = pickFeatured(list, 9);
    const live = document.getElementById('live');
    const liveName = document.getElementById('liveName');
    const side = document.getElementById('libSide');
    let idx = 0;

    function applyLive() {
      const f = featured[idx % featured.length];
      if (!f) return;
      const w = WFSpecimen.firstWeight(f);
      WFProto.ensureFontCss(f.family, w);
      live.style.fontFamily = WFProto.cssFamilyStack(f.family);
      live.style.fontWeight = w;
      liveName.textContent = f.name;
      liveName.href = 'font-detail.html?id=' + encodeURIComponent(f.id);
      side.innerHTML = sideHtml(f, list);
      wireSide(f);
    }

    function wireSide(f) {
      const w = WFSpecimen.firstWeight(f);
      const sideCopy = document.getElementById('sideCopy');
      if (sideCopy) sideCopy.addEventListener('click', function () {
        WFChrome.copy('<link rel="stylesheet" href="' + WFProto.cssUrl(f.family, w) + '">', '已复制 <link>');
      });
      const pick = document.getElementById('sidePick');
      function sync() { const on = WFProto.hasPick(f.id); pick.innerHTML = WFChrome.icon(on ? 'check' : 'plus') + (on ? '已在选字袋' : '加入选字袋'); }
      pick.addEventListener('click', function () {
        const on = WFProto.hasPick(f.id);
        WFProto.togglePick(f.id, f.name);
        WFChrome.toast(on ? '已从选字袋移除' : '已加入选字袋');
        sync();
      });
      sync();
    }

    applyLive();
    document.getElementById('liveNext').addEventListener('click', function () { idx += 1; applyLive(); });
  });
})();
