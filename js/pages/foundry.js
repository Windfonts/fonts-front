/* 厂商：索引（无 slug）/ 单厂商页（?slug=） */
(function () {
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('foundryRoot');

  function stubFont(info) {
    return { ownerInfo: info, foundryInfo: info, makerInfo: info };
  }

  function groups(list) {
    const map = {};
    function ensure(info) {
      if (!info || !info.id) return null;
      if (!map[info.id]) {
        map[info.id] = {
          slug: info.id, name: info.name, info: info, font: stubFont(info),
          fonts: [], made: [], claimed: !!info.claimed, kind: info.kind || ''
        };
      }
      return map[info.id];
    }
    list.forEach(function (f) {
      const owner = f.ownerInfo || f.foundryInfo;
      const maker = f.makerInfo;
      const og = ensure(owner);
      if (og && og.fonts.indexOf(f) === -1) {
        og.fonts.push(f);
        if (og.fonts.length === 1) og.font = f;
      }
      if (maker && maker.id && owner && maker.id !== owner.id) {
        const mg = ensure(maker);
        if (mg && mg.fonts.indexOf(f) === -1 && mg.made.indexOf(f) === -1) mg.made.push(f);
      }
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function renderIndex(list) {
    const gs = groups(list).sort(function (a, b) { return b.fonts.length - a.fonts.length || a.name.localeCompare(b.name, 'zh'); });
    const authors = gs.filter(function (g) { return g.kind === 'author' || g.kind === 'project'; }).length;
    const brands = gs.filter(function (g) { return g.kind === 'brand'; }).length;
    const platforms = gs.filter(function (g) { return g.kind === 'platform'; }).length;
    root.innerHTML =
      '<div class="page-head"><h1>厂商</h1><p class="lead">在库 ' + gs.length + ' 家：品牌方 ' + brands +
        ' 家，开源作者 / 项目 ' + authors + ' 家，素材平台 ' + platforms +
        ' 家。归属看品牌方；字库代做的列在「受托制作」。许可是否核对见每款字体的授权区。</p></div>' +
      '<div class="foundry-index">' + gs.map(function (g) {
        const n = g.fonts.length;
        const m = g.made.length;
        return WFChrome.foundryHtml(g.font, { sub: '在库 ' + n + ' 款' + (m ? ' · 受托 ' + m + ' 款' : '') });
      }).join('') + '</div>' +
      '<section class="section"><div class="section-head"><h2>入驻与认领</h2></div>' +
        '<p class="t-14" style="max-width:40em;color:var(--ink-2)">准备品牌法定名称、官网、授权原文，从任一厂商页点「认领此厂商」提交。通过后可维护标志、介绍与官网。认领不等于我们替你背书条款。</p></section>';
  }

  function renderOne(list, g) {
    document.title = g.name + ' · 厂商 · 文风字体';
    const f = g.fonts[0] || g.font;
    const info = g.info || WFChrome.brandInfo(f) || {};
    const sample = g.fonts[0] || g.made[0] || f;
    const desc = (sample.brand && sample.brand.description && !/出品的字体$/.test(sample.brand.description)) ? sample.brand.description : '';
    const site = info.website || WFChrome.brandSite(f);
    const licenses = {};
    g.fonts.forEach(function (x) { const t = WFChrome.licenseTier(x); licenses[t] = (licenses[t] || 0) + 1; });
    const years = g.fonts.concat(g.made).map(function (x) { return x.releaseYear; }).filter(Boolean);
    const host = site ? site.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
    const who = g.kind === 'brand' ? '品牌方' : '厂商';
    // [标签, 值, 仅开发模式]
    const kv = [
      ['类型', WFChrome.kindLabel(info) || ''],
      ['归属字体', String(g.fonts.length)],
      ['最早发布', years.length ? String(Math.min.apply(null, years)) : ''],
      ['官网', site ? '<a href="' + esc(site) + '" target="_blank" rel="noopener noreferrer">' + esc(host) + '</a>' : '未收录官网'],
      ['英文名', info.en && info.en !== g.name ? info.en : '', true],
      ['简称', info.short && info.short !== g.name ? info.short : '', true],
      ['受托制作', g.made.length ? String(g.made.length) : '', true],
      ['授权', Object.keys(licenses).map(function (k) { return k + ' ' + licenses[k]; }).join(' · '), true],
      ['名称状态', info.provisional ? '中文名拟定，待确认' : (info.unlisted ? '未入字典，按目录原文显示' : ''), true]
    ].filter(function (r) { return r[1]; });

    const heroSub = (g.claimed ? '已认领' : '未认领') + ' · 归属 ' + g.fonts.length + ' 款' + (g.made.length ? ' · 受托 ' + g.made.length + ' 款' : '');
    root.innerHTML =
      '<div class="detail-top"><p class="crumb"><a href="foundry.html">厂商</a><span>/</span><span>' + esc(g.name) + '</span></p></div>' +
      '<div class="foundry-hero">' +
        '<div>' + WFChrome.foundryHtml(g.font, { sub: heroSub }) +
          (desc ? '<p class="desc">' + esc(desc) + '</p>' : '') +
        '</div>' +
        '<div><dl class="kv">' + kv.map(function (r) { return '<div' + (r[2] ? ' class="for-dev"' : '') + '><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>' +
          '<p class="claim" style="margin-top:var(--s-5)">' + (g.claimed
            ? who + '已认领此页。许可仍以每款字体授权区的原文为准。'
            : '这是你的品牌？<a href="login.html?next=claim&slug=' + encodeURIComponent(g.slug) + '">认领此页</a>。通过后可改标志与介绍，不代替授权核对。') + '</p>' +
        '</div>' +
      '</div>' +
      (g.fonts.length
        ? '<div class="count-line">归属字体 <strong>' + g.fonts.length + '</strong> 款 · <a class="more" href="fonts.html?foundry=' + encodeURIComponent(g.slug) + '">在字体库筛选</a></div>' +
          '<ul class="specimens" id="rows"></ul>'
        : '') +
      (g.made.length
        ? '<div class="count-line">受托制作 <strong>' + g.made.length + '</strong> 款 · 版权归品牌方，不计入本页归属</div>' +
          '<ul class="specimens" id="made"></ul>'
        : '');
    if (g.fonts.length) WFSpecimen.renderRows(document.getElementById('rows'), g.fonts, { size: 56 });
    if (g.made.length) WFSpecimen.renderRows(document.getElementById('made'), g.made, { size: 56 });
  }

  WFProto.loadCatalog().then(function (list) {
    const slug = WFProto.getQuery('slug');
    if (!slug) { renderIndex(list); return; }
    const g = groups(list).filter(function (x) { return x.slug === slug || x.name === slug; })[0];
    if (!g) { root.innerHTML = '<p class="empty">未找到该厂商。<a href="foundry.html">查看全部厂商</a></p>'; return; }
    renderOne(list, g);
  });
})();
