/* 字体库页：筛选栏（带计数）+ 控制条 + 样张行/网格 + 分页加载 */
(function () {
  const esc = WFProto.escapeHtml;
  const PAGE = 12;
  const listEl = document.getElementById('fontList');
  const railEl = document.getElementById('libRail');
  const railFold = document.getElementById('libRailFold');
  const railQuery = window.matchMedia('(min-width: 769px)');
  function syncRailFold() {
    if (!railFold) return;
    if (railQuery.matches) railFold.open = true;
  }
  syncRailFold();
  if (railQuery.addEventListener) railQuery.addEventListener('change', syncRailFold);
  const countEl = document.getElementById('countLine');
  const activeEl = document.getElementById('activeFilters');
  const moreBtn = document.getElementById('loadMore');
  const sentinel = document.getElementById('listSentinel');

  const WEIGHT_BUCKETS = [
    { id: 'light', label: '细体', test: function (n) { return n <= 300; } },
    { id: 'regular', label: '常规', test: function (n) { return n >= 350 && n <= 400; } },
    { id: 'medium', label: '中等', test: function (n) { return n === 500; } },
    { id: 'bold', label: '粗体', test: function (n) { return n >= 600 && n <= 700; } },
    { id: 'heavy', label: '特粗', test: function (n) { return n >= 800; } },
    { id: 'multi', label: '三字重以上', test: null }
  ];
  const LICENSES = ['开源商用', '免费商用', '需授权', '个人免费', '待核实'];
  /* 风格：目录 tags 里的字形气质（与「分类」无衬线/手写体等正交；对齐线上侧栏） */
  const STYLE_TAGS = ['黑体', '宋体', '楷体', '隶书', '硬笔手写', '毛笔书法', '卡通创意', '像素', '拼音', '其他'];
  /* 品牌侧栏：默认只露前 N 家（按款数），其余折叠；展开后区内滚动，避免侧栏被拉穿 */
  const BRAND_FACET_PREVIEW = 6;
  let brandRailOpen = false;
  /* 分类名用对应风格的系统字体呈现（汉仪式的分类入口） */
  const CAT_STYLE = { '无衬线字体': 'cat-sans', '衬线': 'cat-serif', '宋体': 'cat-serif', '手写体': 'cat-hand', '书法': 'cat-callig', '隶书': 'cat-li', 'Mono': 'cat-mono', '圆体': 'cat-round', '其他': 'cat-deco' };
  function catLabel(v) { return WFChrome.catLabel(v); }

  const state = {
    cat: WFProto.getQuery('cat'),
    weight: WFProto.getQuery('weight'),
    lang: WFProto.getQuery('lang'),
    license: WFProto.getQuery('license'),
    foundry: WFProto.getQuery('foundry'),
    lineage: WFProto.getQuery('lineage'),
    open: WFProto.getQuery('open') === '1' ? '1' : '',
    kind: WFProto.getQuery('kind'),
    style: WFProto.getQuery('style'),
    tag: WFProto.getQuery('tag'),
    keyword: WFProto.getQuery('keyword'),
    sort: WFProto.getQuery('sort') || 'featured',
    view: 'rows'
  };
  const SORTS = {
    featured: function (a, b) {
      const ac = (WFProto.hasCjkFace && WFProto.hasCjkFace(a)) ? 0 : 1;
      const bc = (WFProto.hasCjkFace && WFProto.hasCjkFace(b)) ? 0 : 1;
      if (ac !== bc) return ac - bc;
      return String(a.name).localeCompare(String(b.name), 'zh-Hans-CN');
    },
    popular: function (a, b) { return (b.viewCount || 0) - (a.viewCount || 0) || SORTS.name(a, b); },
    name: function (a, b) { return String(a.name).localeCompare(String(b.name), 'zh-Hans-CN'); },
    weights: function (a, b) { return (b.weights || []).length - (a.weights || []).length || SORTS.name(a, b); },
    newest: function (a, b) { return (parseInt(b.releaseYear, 10) || 0) - (parseInt(a.releaseYear, 10) || 0) || SORTS.name(a, b); }
  };
  let filtered = [];
  let shown = 0;

  function weightNums(f) {
    return (f.weights || []).map(function (w) { return parseInt(WFProto.weightToCss(w), 10); });
  }
  function matchWeight(f, id) {
    if (!id) return true;
    const b = WEIGHT_BUCKETS.filter(function (x) { return x.id === id; })[0];
    if (!b) return true;
    const nums = weightNums(f);
    if (b.id === 'multi') return nums.length >= 3;
    return nums.some(b.test);
  }
  function hasStyle(f, style) {
    if (!style) return true;
    return (f.tags || []).indexOf(style) !== -1;
  }
  function matches(f, s, skip) {
    /* 日文是语言筛，跟简体中文一样：languages 含该词即中。不另开分区。?region=ja 不开层。 */
    if (skip !== 'cat' && s.cat && String(f.category || '') !== s.cat) return false;
    if (skip !== 'weight' && !matchWeight(f, s.weight)) return false;
    if (skip !== 'lang' && s.lang && (f.languages || []).indexOf(s.lang) === -1) return false;
    if (skip !== 'license' && s.license && WFChrome.licenseTier(f) !== s.license) return false;
    if (skip !== 'foundry' && s.foundry && WFChrome.brandSlug(f) !== s.foundry) {
      const cols = f.collaboratorInfos || [];
      if (!cols.some(function (c) { return c && c.id === s.foundry; })) return false;
    }
    if (skip !== 'lineage' && s.lineage && !(f.lineage && f.lineage.group === s.lineage)) return false;
    if (skip !== 'open' && s.open === '1' && !WFProto.isOpenFont(f)) return false;
    if (skip !== 'kind' && s.kind && WFChrome.brandKind(f) !== s.kind) return false;
    if (skip !== 'style' && s.style && !hasStyle(f, s.style)) return false;
    return WFProto.matchFilter(f, s.tag, s.keyword, '');
  }

  function syncUrl() {
    const p = new URLSearchParams();
    ['keyword', 'tag', 'cat', 'weight', 'lang', 'license', 'foundry', 'lineage', 'open', 'kind', 'style'].forEach(function (k) { if (state[k]) p.set(k, state[k]); });
    if (state.sort && state.sort !== 'featured') p.set('sort', state.sort);
    const q = p.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
  }

  function brandFacetValues() {
    const all = WFProto.getCatalogList();
    const names = {};
    const ids = [];
    const seen = {};
    function add(id, name) {
      if (!id || seen[id]) return;
      seen[id] = true;
      ids.push(id);
      names[id] = name || id;
    }
    all.forEach(function (f) {
      add(WFChrome.brandSlug(f), WFChrome.brandName(f));
      (f.collaboratorInfos || []).forEach(function (c) {
        if (c) add(c.id, c.name || c.short || c.id);
      });
    });
    return { ids: ids, names: names };
  }

  function chipBtn(key, v, label, n, on) {
    return '<button type="button" class="chip' + (on ? ' is-on' : '') + '" data-facet="' + key + '" data-v="' + esc(v) + '"' +
      (on ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' +
      esc(label) + ' <span class="n">' + n + '</span></button>';
  }

  function brandFacetHtml(items, names) {
    /* 按「当前其它筛选项下」的款数排序，避免全库热门在加了风格后仍占前排却显示 1 */
    const visible = items.filter(function (it) { return it.n > 0 || state.foundry === it.v; }).slice().sort(function (a, b) {
      if (a.v === state.foundry && b.v !== state.foundry) return -1;
      if (b.v === state.foundry && a.v !== state.foundry) return 1;
      return b.n - a.n || String(names[a.v] || a.v).localeCompare(String(names[b.v] || b.v), 'zh-Hans-CN');
    });
    if (!visible.length) return '';
    const head = visible.slice(0, BRAND_FACET_PREVIEW);
    const more = visible.slice(BRAND_FACET_PREVIEW);
    /* 已选不在前 N：钉进可见区，并从 more 去掉 */
    if (state.foundry) {
      const inHead = head.some(function (it) { return it.v === state.foundry; });
      if (!inHead) {
        const sel = visible.filter(function (it) { return it.v === state.foundry; })[0];
        if (sel) {
          head.push(sel);
          for (let i = more.length - 1; i >= 0; i--) {
            if (more[i].v === state.foundry) more.splice(i, 1);
          }
        }
      }
    }
    const headHtml = head.map(function (it) {
      return chipBtn('foundry', it.v, names[it.v] || it.v, it.n, state.foundry === it.v);
    }).join('');
    const moreHtml = more.map(function (it) {
      return chipBtn('foundry', it.v, names[it.v] || it.v, it.n, state.foundry === it.v);
    }).join('');
    const open = brandRailOpen && more.length > 0;
    const toggle = more.length
      ? '<button type="button" class="btn-text facet-more" id="brandFacetMore" aria-expanded="' + (open ? 'true' : 'false') + '">' +
          (open ? '收起' : ('更多 ' + more.length + ' 家')) + '</button>'
      : '';
    return '<div class="facet facet-brand' + (open ? ' is-open' : '') + '">' +
      '<h3>厂商</h3>' +
      '<div class="chips">' + headHtml + '</div>' +
      (more.length
        ? '<div class="chips facet-brand-more"' + (open ? '' : ' hidden') + '>' + moreHtml + '</div>'
        : '') +
      '<div class="facet-brand-foot">' + toggle +
        '<a class="more" href="' + WFChrome.href('foundry.html') + '">' + WFChrome.icon('building') + '厂商索引</a>' +
      '</div></div>';
  }

  function facetCounts(key, values, getter) {
    const all = WFProto.getCatalogList();
    const base = all.filter(function (f) { return matches(f, state, key); });
    return values.map(function (v) {
      const n = base.filter(function (f) { return getter(f, v); }).length;
      return { v: v, n: n };
    });
  }

  function facetHtml(title, key, items, labelOf) {
    const rows = items.filter(function (it) { return it.n > 0 || state[key] === it.v; }).map(function (it) {
      return chipBtn(key, it.v, labelOf ? labelOf(it.v) : it.v, it.n, state[key] === it.v);
    }).join('');
    if (!rows) return '';
    return '<div class="facet"><h3>' + title + '</h3><div class="chips">' + rows + '</div></div>';
  }
  function catFacetHtml(items) {
    const rows = items.filter(function (it) { return it.n > 0 || state.cat === it.v; }).map(function (it) {
      const on = state.cat === it.v;
      return '<li' + (on ? ' class="is-on"' : '') + '><button type="button" class="' + (CAT_STYLE[it.v] || '') + '" data-facet="cat" data-v="' + esc(it.v) + '">' +
        '<span>' + esc(catLabel(it.v) || it.v) + '</span><span class="n">' + it.n + '</span></button></li>';
    }).join('');
    if (!rows) return '';
    return '<div class="facet facet-cat"><h3>分类</h3><ul>' + rows + '</ul></div>';
  }

  function renderRail() {
    const all = WFProto.getCatalogList();
    const cats = uniq(all.map(function (f) { return f.category; }));
    const langs = ['简体中文', '繁体中文', '英语', '日文', '韩文'];
    const brands = brandFacetValues();
    const html =
      catFacetHtml(facetCounts('cat', cats, function (f, v) { return f.category === v; })) +
      facetHtml('风格', 'style', facetCounts('style', STYLE_TAGS, hasStyle)) +
      brandFacetHtml(facetCounts('foundry', brands.ids, function (f, v) {
        if (WFChrome.brandSlug(f) === v) return true;
        return (f.collaboratorInfos || []).some(function (c) { return c && c.id === v; });
      }), brands.names) +
      facetHtml('字重', 'weight', facetCounts('weight', WEIGHT_BUCKETS.map(function (b) { return b.id; }), matchWeight),
        function (id) { return WEIGHT_BUCKETS.filter(function (b) { return b.id === id; })[0].label; }) +
      facetHtml('语言', 'lang', facetCounts('lang', langs, function (f, v) { return (f.languages || []).indexOf(v) !== -1; }),
        function (v) { return v === '英语' ? '英文' : v; }) +
      facetHtml('许可', 'license', facetCounts('license', LICENSES, function (f, v) { return WFChrome.licenseTier(f) === v; })) +
      '<div class="for-dev">' +
      facetHtml('出处', 'kind', facetCounts('kind', ['brand', 'foundry', 'author', 'project', 'platform'], function (f, v) { return WFChrome.brandKind(f) === v; }),
        function (id) { return ({ brand: '品牌方', foundry: '字库', author: '作者', project: '项目', platform: '素材平台' })[id] || id; }) +
      facetHtml('开源', 'open', facetCounts('open', ['1'], function (f, v) { return v === '1' && WFProto.isOpenFont(f); }),
        function () { return '开源协议'; }) +
      '</div>' +
      (hasAny() ? '<button type="button" class="btn-text reset" id="resetFilters">' + WFChrome.icon('close') + '清除全部筛选</button>' : '');
    railEl.innerHTML = html;
    railEl.querySelectorAll('[data-facet]').forEach(function (b) {
      b.addEventListener('click', function () {
        const k = b.getAttribute('data-facet');
        const v = b.getAttribute('data-v');
        state[k] = state[k] === v ? '' : v;
        refresh();
      });
    });
    const brandMore = document.getElementById('brandFacetMore');
    if (brandMore) {
      brandMore.addEventListener('click', function () {
        brandRailOpen = !brandRailOpen;
        renderRail();
      });
    }
    const reset = document.getElementById('resetFilters');
    if (reset) reset.addEventListener('click', function () {
      state.cat = state.weight = state.lang = state.license = state.foundry = state.lineage = state.open = state.kind = state.style = state.tag = state.keyword = '';
      const s = document.getElementById('navSearch');
      if (s) s.value = '';
      refresh();
    });
  }

  function hasAny() { return !!(state.cat || state.weight || state.lang || state.license || state.foundry || state.lineage || state.open || state.kind || state.style || state.tag || state.keyword); }
  function uniq(arr) {
    const seen = {};
    return arr.filter(function (x) { if (!x || seen[x]) return false; seen[x] = true; return true; });
  }

  function renderActive() {
    const chips = [];
    if (state.keyword) chips.push({ k: 'keyword', l: '搜索「' + state.keyword + '」' });
    if (state.tag) chips.push({ k: 'tag', l: '标签 ' + state.tag });
    if (state.cat) chips.push({ k: 'cat', l: catLabel(state.cat) || state.cat });
    if (state.style) chips.push({ k: 'style', l: '风格 ' + state.style });
    if (state.weight) {
      const b = WEIGHT_BUCKETS.filter(function (x) { return x.id === state.weight; })[0];
      chips.push({ k: 'weight', l: b ? b.label : state.weight });
    }
    if (state.lang) chips.push({ k: 'lang', l: state.lang === '英语' ? '英文' : state.lang });
    if (state.license) chips.push({ k: 'license', l: state.license });
    if (state.foundry) {
      const fd = WFProto.getFoundries().filter(function (x) { return x.id === state.foundry; })[0];
      chips.push({ k: 'foundry', l: '厂商 ' + (fd ? fd.name : state.foundry) });
    }
    if (state.lineage) {
      const n = (WFProto.getCatalogList().filter(function (f) { return f.lineage && f.lineage.group === state.lineage; })[0] || {}).lineage;
      chips.push({ k: 'lineage', l: '同系 ' + ((n && n.groupName) || state.lineage) });
    }
    if (state.kind) chips.push({ k: 'kind', l: ({ brand: '品牌方', foundry: '字库', author: '作者', project: '项目', platform: '素材平台' })[state.kind] || state.kind });
    if (state.open) chips.push({ k: 'open', l: '开源协议' });
    activeEl.innerHTML = chips.map(function (c) {
      return '<button type="button" class="chip is-on" data-clear="' + c.k + '">' + esc(c.l) + ' ×</button>';
    }).join('');
    activeEl.querySelectorAll('[data-clear]').forEach(function (b) {
      b.addEventListener('click', function () {
        state[b.getAttribute('data-clear')] = '';
        if (b.getAttribute('data-clear') === 'keyword') {
          const s = document.getElementById('navSearch');
          if (s) s.value = '';
        }
        refresh();
      });
    });
  }

  function updateCount() {
    if (!filtered.length) {
      countEl.innerHTML = hasAny()
        ? '没有匹配结果 · <button type="button" class="btn-text" id="countClear">清除筛选</button>'
        : '字库暂时为空';
      moreBtn.hidden = true;
      const clr = document.getElementById('countClear');
      if (clr) clr.addEventListener('click', function () {
        state.cat = state.weight = state.lang = state.license = state.foundry = state.lineage = state.open = state.kind = state.style = state.tag = state.keyword = '';
        const s = document.getElementById('navSearch');
        if (s) s.value = '';
        refresh();
      });
      return;
    }
    const hint = shown < filtered.length
      ? ' <span class="count-hint">· 下滑加载更多</span>'
      : (shown > PAGE ? ' <span class="count-hint">· 已全部加载</span>' : '');
    countEl.innerHTML = '库内 <strong>' + filtered.length + '</strong> 款 · 已加载 <strong>' + shown + '</strong> / ' + filtered.length + hint;
    moreBtn.hidden = shown >= filtered.length;
  }

  function appendPage() {
    if (shown >= filtered.length) { updateCount(); return; }
    const next = filtered.slice(shown, shown + PAGE);
    const rowOpts = window.WFProducts ? {
      foot: function (f) { return WFProducts.footHtml(f); }
    } : null;
    WFSpecimen.appendRows(listEl, next, rowOpts);
    shown += next.length;
    updateCount();
  }

  function refresh(next) {
    if (next) Object.keys(next).forEach(function (k) { if (next[k] != null && k !== 'region') state[k] = next[k]; });
    state.region = '';
    let raw = WFProto.getCatalogList().filter(function (f) { return matches(f, state); });
    if (window.WFProducts) raw = WFProducts.collapseForList(raw);
    filtered = raw;
    if (SORTS[state.sort]) filtered.sort(SORTS[state.sort]);
    shown = 0;
    listEl.innerHTML = '';
    syncUrl();
    renderRail();
    renderActive();
    if (!filtered.length) {
      listEl.innerHTML = hasAny()
        ? '<li class="empty empty-filter"><p>没有符合当前筛选的字体。</p><p class="empty-sub">试试放宽风格 / 分类，或 <button type="button" class="btn-text" id="emptyClear">清除全部筛选</button></p></li>'
        : '<li class="empty"><p>字库暂时为空。</p></li>';
      updateCount();
      const emptyClr = document.getElementById('emptyClear');
      if (emptyClr) emptyClr.addEventListener('click', function () {
        state.cat = state.weight = state.lang = state.license = state.foundry = state.lineage = state.open = state.kind = state.style = state.tag = state.keyword = '';
        const s = document.getElementById('navSearch');
        if (s) s.value = '';
        refresh();
      });
      return;
    }
    appendPage();
  }

  WFSpecimen.controlBar(document.getElementById('controlbar'), {
    view: true,
    onView: function (v) {
      state.view = v;
      listEl.classList.toggle('is-grid', v === 'grid');
      if (v === 'rows') WFProto.setSize(WFProto.getSize());
    }
  });

  moreBtn.addEventListener('click', appendPage);
  const sortSel = document.getElementById('sortSel');
  if (sortSel) {
    if (SORTS.hasOwnProperty(state.sort)) sortSel.value = state.sort;
    sortSel.addEventListener('change', function () { refresh({ sort: sortSel.value }); });
  }
  if ('IntersectionObserver' in window && sentinel) {
    const io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      if (shown <= 0 || shown >= filtered.length) return;
      appendPage();
      /* 首屏不满一页时继续补页，直到哨兵离开视口或加载完毕 */
      if (shown < filtered.length && entries[0].isIntersecting) {
        requestAnimationFrame(function () {
          if (sentinel.getBoundingClientRect().top < (window.innerHeight + 600)) appendPage();
        });
      }
    }, { rootMargin: '600px 0px' });
    io.observe(sentinel);
  }

  window.WFFontsList = {
    refresh: refresh,
    getFilter: function () { return { tag: state.tag, keyword: state.keyword, license: state.license, cat: state.cat, weight: state.weight, lang: state.lang, foundry: state.foundry, lineage: state.lineage, open: state.open, kind: state.kind, style: state.style }; }
  };

  WFProto.loadCatalog().then(function () {
    const ready = window.WFProducts ? WFProducts.load() : Promise.resolve();
    ready.then(function () {
      refresh();
      document.addEventListener('DOMContentLoaded', function () {
        const s = document.getElementById('navSearch');
        if (s && state.keyword) s.value = state.keyword;
      });
      const s = document.getElementById('navSearch');
      if (s && state.keyword) s.value = state.keyword;
    });
  }).catch(function () {
    if (countEl) countEl.textContent = '目录没读到';
    if (listEl) {
      listEl.innerHTML = '<li class="empty empty-filter"><p>字体目录载入失败。</p><p class="empty-sub"><button type="button" class="btn" onclick="location.reload()">再试一次</button></p></li>';
    }
  });
})();
