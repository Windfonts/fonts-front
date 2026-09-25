/* 产品族合并：目录一张卡、详情规格切换。依赖 WFProto 目录已加载。
 * 真源 data/font-products.json；规则 docs/FAMILY-VARIANTS.md */
(function () {
  let products = [];
  let byFamily = {};
  let byId = {};
  let loadPromise = null;

  const TIER_RANK = { primary: 0, secondary: 1, advanced: 2 };

  function esc(s) {
    return WFProto.escapeHtml(s);
  }

  function load() {
    if (loadPromise) return loadPromise;
    loadPromise = fetch((window.WFProto && WFProto.dataUrl) ? WFProto.dataUrl('font-products.json') : 'data/font-products.json')
      .then(function (r) { return r.ok ? r.json() : { products: [] }; })
      .then(function (data) {
        products = (data && data.products) || [];
        byFamily = {};
        byId = {};
        products.forEach(function (p) {
          byId[p.id] = p;
          (p.members || []).forEach(function (m) {
            byFamily[m.family] = { product: p, member: m };
          });
        });
        return products;
      })
      .catch(function () {
        products = [];
        return products;
      });
    return loadPromise;
  }

  function productOf(fontOrFamily) {
    const fam = typeof fontOrFamily === 'string' ? fontOrFamily : (fontOrFamily && fontOrFamily.family);
    return (byFamily[fam] && byFamily[fam].product) || null;
  }

  function memberOf(fontOrFamily) {
    const fam = typeof fontOrFamily === 'string' ? fontOrFamily : (fontOrFamily && fontOrFamily.family);
    return (byFamily[fam] && byFamily[fam].member) || null;
  }

  function siblings(fontOrFamily) {
    const p = productOf(fontOrFamily);
    if (!p) return [];
    const cat = {};
    WFProto.getCatalogList().forEach(function (f) { cat[f.family] = f; });
    return (p.members || []).map(function (m) {
      return { meta: m, font: cat[m.family] || null };
    }).filter(function (x) { return x.font; }).sort(function (a, b) {
      const ra = TIER_RANK[a.meta.tier] != null ? TIER_RANK[a.meta.tier] : 9;
      const rb = TIER_RANK[b.meta.tier] != null ? TIER_RANK[b.meta.tier] : 9;
      return ra - rb;
    });
  }

  function displayName(font) {
    const p = productOf(font);
    return (p && p.name) || (font && font.name) || '';
  }

  function chipLabel(member) {
    return ((member && member.chips) || []).join(' · ') || '标准';
  }

  function tierOf(member) {
    return (member && member.tier) || 'secondary';
  }

  /** 列表用：同产品多规格收成一张卡（代表款 = 默认若在筛选结果中，否则首个命中） */
  function collapseForList(fonts) {
    const list = fonts || [];
    const seen = {};
    const out = [];
    const byFam = {};
    list.forEach(function (f) { byFam[f.family] = f; });

    list.forEach(function (f) {
      const hit = byFamily[f.family];
      if (!hit) {
        out.push(f);
        return;
      }
      const pid = hit.product.id;
      if (seen[pid]) return;
      seen[pid] = true;
      const defFam = hit.product.default;
      const pick = (defFam && byFam[defFam]) || f;
      const clone = Object.assign({}, pick);
      clone._product = hit.product;
      clone._productCount = siblings(pick).length;
      clone._listName = hit.product.name;
      out.push(clone);
    });
    return out;
  }

  function listName(font) {
    return font._listName || displayName(font);
  }

  function chipHtml(s, cur) {
    const on = s.font.family === cur;
    const href = WFChrome.href(WFProto.detailHref(s.font));
    const label = chipLabel(s.meta);
    return '<a class="chip' + (on ? ' is-on' : '') + '" href="' + href + '"' +
      (on ? ' aria-current="page"' : '') + ' data-tier="' + esc(tierOf(s.meta)) + '">' + esc(label) + '</a>';
  }

  function variantBarHtml(font) {
    const sibs = siblings(font);
    if (sibs.length < 2) return '';
    const cur = font.family;
    const main = sibs.filter(function (s) { return tierOf(s.meta) !== 'advanced'; });
    const more = sibs.filter(function (s) { return tierOf(s.meta) === 'advanced'; });
    let html = '<div class="product-variants" role="group" aria-label="规格">' +
      main.map(function (s) { return chipHtml(s, cur); }).join('');
    if (more.length) {
      const open = more.some(function (s) { return s.font.family === cur; });
      html += '<details class="product-variants-more"' + (open ? ' open' : '') + '>' +
        '<summary>更多规格 · ' + more.length + '</summary>' +
        '<div class="product-variants-more-list">' +
        more.map(function (s) { return chipHtml(s, cur); }).join('') +
        '</div></details>';
    }
    html += '</div>';
    return html;
  }

  function footHtml(font) {
    const n = font._productCount || siblings(font).length;
    if (n < 2) return '';
    return '<span class="product-count">' + n + ' 规格</span>';
  }

  /** 文档 / 列表默认嵌入用产品 default；详情页仍用当前 font.family */
  function embedFamily(font) {
    return (font && font.family) || '';
  }

  function recommendedFamily(fontOrProduct) {
    const p = fontOrProduct && fontOrProduct.members
      ? fontOrProduct
      : productOf(fontOrProduct);
    return (p && p.default) || embedFamily(fontOrProduct);
  }

  window.WFProducts = {
    load: load,
    productOf: productOf,
    memberOf: memberOf,
    siblings: siblings,
    displayName: displayName,
    listName: listName,
    chipLabel: chipLabel,
    collapseForList: collapseForList,
    variantBarHtml: variantBarHtml,
    footHtml: footHtml,
    embedFamily: embedFamily,
    recommendedFamily: recommendedFamily
  };
})();
