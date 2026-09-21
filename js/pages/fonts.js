/* 字体库页：筛选栏（带计数）+ 控制条 + 样张行/网格 + 分页加载 */
(function () {
  const esc = WFProto.escapeHtml;
  const PAGE = 12;
  const listEl = document.getElementById('fontList');
  const railEl = document.getElementById('libRail');
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
  const LICENSES = ['免费商用', '需授权', '个人免费', '待核实'];
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
    tag: WFProto.getQuery('tag'),
    keyword: WFProto.getQuery('keyword'),
    sort: WFProto.getQuery('sort') || 'featured',
    view: 'rows'
  };
  const SORTS = {
    featured: null,
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
  function matches(f, s, skip) {
    if (skip !== 'cat' && s.cat && String(f.category || '') !== s.cat) return false;
    if (skip !== 'weight' && !matchWeight(f, s.weight)) return false;
    if (skip !== 'lang' && s.lang && (f.languages || []).indexOf(s.lang) === -1) return false;
    if (skip !== 'license' && s.license && WFChrome.licenseTier(f) !== s.license) return false;
    if (skip !== 'foundry' && s.foundry && WFChrome.brandSlug(f) !== s.foundry) return false;
    if (skip !== 'lineage' && s.lineage && !(f.lineage && f.lineage.group === s.lineage)) return false;
    if (skip !== 'open' && s.open === '1' && !WFProto.isOpenFont(f)) return false;
    if (skip !== 'kind' && s.kind && WFChrome.brandKind(f) !== s.kind) return false;
    return WFProto.matchFilter(f, s.tag, s.keyword, '');
  }

  function syncUrl() {
    const p = new URLSearchParams();
    ['keyword', 'tag', 'cat', 'weight', 'lang', 'license', 'foundry', 'lineage', 'open', 'kind'].forEach(function (k) { if (state[k]) p.set(k, state[k]); });
    if (state.sort && state.sort !== 'featured') p.set('sort', state.sort);
    const q = p.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
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
      const on = state[key] === it.v;
      return '<button type="button" class="chip' + (on ? ' is-on' : '') + '" data-facet="' + key + '" data-v="' + esc(it.v) + '"' +
        (on ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' +
        esc(labelOf ? labelOf(it.v) : it.v) + ' <span class="n">' + it.n + '</span></button>';
    }).join('');
    return '<div class="facet"><h3>' + title + '</h3><div class="chips">' + rows + '</div></div>';
  }
  function catFacetHtml(items) {
    const rows = items.filter(function (it) { return it.n > 0 || state.cat === it.v; }).map(function (it) {
      const on = state.cat === it.v;
      return '<li' + (on ? ' class="is-on"' : '') + '><button type="button" class="' + (CAT_STYLE[it.v] || '') + '" data-facet="cat" data-v="' + esc(it.v) + '">' +
        '<span>' + esc(catLabel(it.v) || it.v) + '</span><span class="n">' + it.n + '</span></button></li>';
    }).join('');
    return '<div class="facet facet-cat"><h3>分类</h3><ul>' + rows + '</ul></div>';
  }

  function renderRail() {
    const all = WFProto.getCatalogList();
    const cats = uniq(all.map(function (f) { return f.category; }));
    const langs = ['简体中文', '繁体中文', '英语', '日文', '韩文'];
    const html =
      catFacetHtml(facetCounts('cat', cats, function (f, v) { return f.category === v; })) +
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
      (hasAny() ? '<button type="button" class="btn-text reset" id="resetFilters">清除全部筛选</button>' : '');
    railEl.innerHTML = html;
    railEl.querySelectorAll('[data-facet]').forEach(function (b) {
      b.addEventListener('click', function () {
        const k = b.getAttribute('data-facet');
        const v = b.getAttribute('data-v');
        state[k] = state[k] === v ? '' : v;
        refresh();
      });
    });
    const reset = document.getElementById('resetFilters');
    if (reset) reset.addEventListener('click', function () {
      state.cat = state.weight = state.lang = state.license = state.foundry = state.lineage = state.open = state.kind = state.tag = state.keyword = '';
      const s = document.getElementById('navSearch');
      if (s) s.value = '';
      refresh();
    });
  }

  function hasAny() { return !!(state.cat || state.weight || state.lang || state.license || state.foundry || state.lineage || state.open || state.kind || state.tag || state.keyword); }
  function uniq(arr) {
    const seen = {};
    return arr.filter(function (x) { if (!x || seen[x]) return false; seen[x] = true; return true; });
  }

  function renderActive() {
    const chips = [];
    if (state.keyword) chips.push({ k: 'keyword', l: '搜索「' + state.keyword + '」' });
    if (state.tag) chips.push({ k: 'tag', l: '标签 ' + state.tag });
    if (state.cat) chips.push({ k: 'cat', l: catLabel(state.cat) || state.cat });
    if (state.weight) {
      const b = WEIGHT_BUCKETS.filter(function (x) { return x.id === state.weight; })[0];
      chips.push({ k: 'weight', l: b ? b.label : state.weight });
    }
    if (state.lang) chips.push({ k: 'lang', l: state.lang === '英语' ? '英文' : state.lang });
    if (state.license) chips.push({ k: 'license', l: state.license });
    if (state.foundry) {
      const fd = WFProto.getFoundries().filter(function (x) { return x.id === state.foundry; })[0];
      chips.push({ k: 'foundry', l: ((fd && fd.kind === 'brand') ? '品牌方 ' : '厂商 ') + (fd ? fd.name : state.foundry) });
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
    countEl.innerHTML = '共 <strong>' + filtered.length + '</strong> 款，已显示 <strong>' + shown + '</strong> 款';
    moreBtn.hidden = shown >= filtered.length;
  }

  function appendPage() {
    if (shown >= filtered.length) { updateCount(); return; }
    const next = filtered.slice(shown, shown + PAGE);
    WFSpecimen.appendRows(listEl, next);
    shown += next.length;
    updateCount();
  }

  function refresh(next) {
    if (next) Object.keys(next).forEach(function (k) { if (next[k] != null) state[k] = next[k]; });
    filtered = WFProto.getCatalogList().filter(function (f) { return matches(f, state); });
    if (SORTS[state.sort]) filtered.sort(SORTS[state.sort]);
    shown = 0;
    listEl.innerHTML = '';
    syncUrl();
    renderRail();
    renderActive();
    if (!filtered.length) {
      listEl.innerHTML = '<li class="empty">没有匹配的字体。<a href="fonts.html">清除筛选</a></li>';
      updateCount();
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
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && shown > 0 && shown < filtered.length) appendPage();
    }, { rootMargin: '400px 0px' }).observe(sentinel);
  }

  window.WFFontsList = {
    refresh: refresh,
    getFilter: function () { return { tag: state.tag, keyword: state.keyword, license: state.license, cat: state.cat, weight: state.weight, lang: state.lang, foundry: state.foundry, lineage: state.lineage, open: state.open, kind: state.kind }; }
  };

  WFProto.loadCatalog().then(function () {
    refresh();
    document.addEventListener('DOMContentLoaded', function () {
      const s = document.getElementById('navSearch');
      if (s && state.keyword) s.value = state.keyword;
    });
    const s = document.getElementById('navSearch');
    if (s && state.keyword) s.value = state.keyword;
  });
})();
