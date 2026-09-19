/* Shared specimen + pick bag + catalog (fonts.json) — v3.3 */
(function () {
  const KEY = 'wf-proto-picks';
  const SAMPLE_KEY = 'wf-proto-sample';
  const SIZE_KEY = 'wf-proto-size';
  const PAGE_SIZE = 10;

  const EXTRA_LINKS = [
    { label: '文风字体', path: 'https://windfonts.com' },
    { label: 'Cravatar', path: 'https://cravatar.com' },
    { label: 'adminCDN', path: 'https://admincdn.com' },
    { label: '赛博字库', path: 'https://cyberfonts.com' },
    { label: '文派开源', path: 'https://wenpai.org' },
    { label: '字体下载', path: 'https://wenfeng.org' }
  ];
  const SAFE_CODE =
    'Copyright © 2025 Windfonts 文风字体, All Rights Reserved. 文派（广州）科技有限公司；版权所有 · 粤ICP备2023091240号-3';

  const WEIGHT_MAP = {
    thin: '100', extralight: '200', 'extra-light': '200', light: '300',
    demilight: '350', 'demi-light': '350', book: '350', text: '400',
    regular: '400', normal: '400', medium: '500',
    demibold: '600', 'demi-bold': '600', semibold: '600', 'semi-bold': '600',
    bold: '700', extrabold: '800', 'extra-bold': '800', heavy: '800',
    black: '900', ultrablack: '950'
  };

  let catalog = [];
  let catalogPromise = null;
  const injectedCss = new Set();

  function catalogUrl() {
    try {
      const scripts = document.getElementsByTagName('script');
      for (let i = scripts.length - 1; i >= 0; i--) {
        const src = scripts[i].src || '';
        if (src.indexOf('wf-proto.js') !== -1) {
          return new URL('../data/fonts.json', src).href;
        }
      }
    } catch (e) { /* ignore */ }
    const base = location.pathname.replace(/\/[^/]*$/, '/');
    if (base.indexOf('/admin') !== -1) return '../data/fonts.json';
    return 'data/fonts.json';
  }

  function normalizeFont(raw) {
    const weights = Array.isArray(raw.weights) && raw.weights.length ? raw.weights.slice() : ['Regular'];
    const tags = Array.isArray(raw.tags) ? raw.tags.slice() : [];
    const designerShort = raw.designerShort ||
      String(raw.designer || '').split(/[;；,，]/)[0].trim() || '—';
    return Object.assign({}, raw, {
      weights: weights,
      tags: tags,
      designerShort: designerShort,
      styles: weights.length,
      detail: 'font-detail.html?id=' + encodeURIComponent(raw.id)
    });
  }

  function loadCatalog() {
    if (catalog.length) return Promise.resolve(catalog);
    if (catalogPromise) return catalogPromise;
    catalogPromise = fetch(catalogUrl())
      .then(function (r) {
        if (!r.ok) throw new Error('fonts.json ' + r.status);
        return r.json();
      })
      .then(function (arr) {
        catalog = (Array.isArray(arr) ? arr : []).map(normalizeFont);
        return catalog;
      })
      .catch(function (err) {
        console.warn('[WFProto] catalog load failed', err);
        catalog = [];
        return catalog;
      });
    return catalogPromise;
  }

  function loadPicks() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function savePicks(arr) {
    localStorage.setItem(KEY, JSON.stringify(arr));
    updateBadges(arr.length);
    document.dispatchEvent(new CustomEvent('wf:picks', { detail: arr }));
  }
  function updateBadges(n) {
    document.querySelectorAll('[data-pick-count]').forEach(function (el) {
      el.textContent = String(n);
      el.setAttribute('data-count', String(n));
    });
  }

  function getById(id) {
    if (!id) return null;
    for (let i = 0; i < catalog.length; i++) {
      if (catalog[i].id === id) return catalog[i];
    }
    return null;
  }

  function enrich(pick) {
    const meta = getById(pick.id) || {};
    return Object.assign({}, meta, pick, {
      name: pick.name || meta.name || pick.id,
      family: pick.family || meta.family || '',
      weights: pick.weights || meta.weights || ['Regular'],
      designer: pick.designer || meta.designerShort || meta.designer || '',
      designerShort: pick.designerShort || meta.designerShort || pick.designer || meta.designer || '—',
      styles: pick.styles || meta.styles || (pick.weights || meta.weights || []).length || 1,
      tags: pick.tags || meta.tags || [],
      category: pick.category || meta.category || '',
      detail: pick.detail || meta.detail || ('font-detail.html?id=' + encodeURIComponent(pick.id))
    });
  }

  function getQuery(name) {
    try {
      return new URLSearchParams(location.search).get(name) || '';
    } catch (e) { return ''; }
  }

  function setJoinLabel(btn, picked) {
    if (!btn) return;
    if (btn.hasAttribute('data-op-detail')) {
      btn.textContent = picked ? '移除字体' : '添加字体';
      btn.classList.toggle('is-picked', picked);
      return;
    }
    btn.textContent = picked ? '移除选择' : '加入选择';
    btn.classList.toggle('is-picked', picked);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function weightToCss(w) {
    if (w == null || w === '') return '400';
    const s = String(w).trim();
    if (/^\d{2,4}$/.test(s)) return s;
    const key = s.toLowerCase().replace(/\s+/g, '');
    return WEIGHT_MAP[key] || '400';
  }

  function cssFamilyStack(family) {
    const f = family || '';
    const alt = f.indexOf('wenfeng-') === 0 ? f.replace(/^wenfeng-/, 'windfonts-') : '';
    const parts = [];
    if (alt) parts.push("'" + alt + "'");
    if (f) parts.push("'" + f + "'");
    parts.push('"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif');
    return parts.join(', ');
  }

  function ensureFontCss(family, weight) {
    if (!family) return;
    const w = weightToCss(weight || '400');
    const key = family + '|' + w;
    if (injectedCss.has(key)) return;
    injectedCss.add(key);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = WFProto.cssUrl(family, w);
    link.setAttribute('data-wf-family', family);
    link.onerror = function () { /* 429 or blocked — family fallback still set */ };
    document.head.appendChild(link);
  }

  /** 许可档位归并（对齐许可字典口径：免费商用单列，联系/付费并「需授权」，空=待核实） */
  function licenseTier(font) {
    const t = String((font && font.license) || '').trim();
    if (t === '免费商用') return '免费商用';
    if (t === '联系授权' || t === '付费授权') return '需授权';
    if (t === '个人免费') return '个人免费';
    return '待核实';
  }

  function matchFilter(font, tag, keyword, license) {
    const tagQ = (tag || '').trim();
    const kw = (keyword || '').trim().toLowerCase();
    const licQ = (license || '').trim();
    let ok = true;
    if (ok && licQ && licenseTier(font) !== licQ) ok = false;
    if (tagQ) {
      const t = tagQ.toLowerCase();
      const tags = (font.tags || []).map(function (x) { return String(x).toLowerCase(); });
      const cat = String(font.category || '').toLowerCase();
      const name = String(font.name || '').toLowerCase();
      const en = String(font.en || '').toLowerCase();
      ok = tags.indexOf(t) !== -1 ||
        tags.some(function (x) { return x.indexOf(t) !== -1; }) ||
        cat.indexOf(t) !== -1 ||
        name.indexOf(t) !== -1 ||
        en.indexOf(t) !== -1;
    }
    if (ok && kw) {
      const hay = [
        font.name, font.en, font.family, font.normalized,
        font.designer, font.designerShort, font.category,
        (font.tags || []).join(' '), font.description, font.license
      ].join(' ').toLowerCase();
      ok = hay.indexOf(kw) !== -1;
    }
    return ok;
  }

  function filterCatalog(opts) {
    const tag = (opts && opts.tag != null) ? opts.tag : getQuery('tag');
    const keyword = (opts && opts.keyword != null) ? opts.keyword : getQuery('keyword');
    const license = (opts && opts.license != null) ? opts.license : getQuery('license');
    return catalog.filter(function (f) { return matchFilter(f, tag, keyword, license); });
  }

  function inferLanguage(font) {
    const blob = ((font.name || '') + ' ' + (font.en || '') + ' ' + (font.description || '')).toLowerCase();
    if (/繁体|traditional|tc\b|hong.?kong|taiwan/.test(blob)) return '繁体中文';
    if (/日文|japanese|hiragana|katakana/.test(blob)) return '日文';
    if (/韩文|korean|hangul/.test(blob)) return '韩文';
    if (/english|latin|英文/.test(blob) && !/中文|cjk|汉字/.test(blob)) return '英文';
    return '简体中文';
  }

  function renderExtraFooter(target, variant) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    const dark = variant === 'dark' || el.classList.contains('home-footer') ||
      document.body.classList.contains('page-home');
    el.classList.add('site-extra-footer');
    if (dark) el.classList.add('is-dark');
    el.innerHTML =
      '<nav class="extra-links" aria-label="相关链接">' +
      EXTRA_LINKS.map(function (l) {
        return '<a href="' + escapeHtml(l.path) + '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(l.label) + '</a>';
      }).join('<span class="extra-sep" aria-hidden="true">·</span>') +
      '</nav>' +
      '<p class="extra-copy">' + escapeHtml(SAFE_CODE) + '</p>';
  }

  function injectFooterIfMissing() {
    const selectors = [
      'body.page-fonts', 'body.page-detail', 'body.page-bag',
      'body.page-embed', 'body.page-docs', 'body.page-home'
    ];
    let need = false;
    for (let i = 0; i < selectors.length; i++) {
      if (document.querySelector(selectors[i])) { need = true; break; }
    }
    if (!need) return;
    let foot = document.getElementById('wfExtraFooter') ||
      document.querySelector('.site-extra-footer') ||
      document.querySelector('.home-footer');
    if (!foot) {
      foot = document.createElement('footer');
      foot.id = 'wfExtraFooter';
      foot.className = 'site-extra-footer';
      document.body.appendChild(foot);
    }
    const variant = document.body.classList.contains('page-home') ? 'dark' : 'lite';
    renderExtraFooter(foot, variant);
  }

  window.WFProto = {
    PAGE_SIZE: PAGE_SIZE,
    EXTRA_LINKS: EXTRA_LINKS,
    SAFE_CODE: SAFE_CODE,
    escapeHtml: escapeHtml,
    loadCatalog: loadCatalog,
    getCatalogList: function () { return catalog.slice(); },
    getFont: function (id) { return getById(id); },
    getCatalog: function (id) {
      const f = getById(id);
      return f ? enrich({ id: id }) : null;
    },
    filterCatalog: filterCatalog,
    matchFilter: matchFilter,
    weightToCss: weightToCss,
    cssFamilyStack: cssFamilyStack,
    ensureFontCss: ensureFontCss,
    inferLanguage: inferLanguage,
    renderExtraFooter: renderExtraFooter,
    getSample: function () {
      return localStorage.getItem(SAMPLE_KEY) || '文风字体';
    },
    setSample: function (v) {
      localStorage.setItem(SAMPLE_KEY, v);
      document.querySelectorAll('[data-specimen]').forEach(function (n) {
        n.textContent = v || '文';
      });
    },
    getSize: function () {
      const s = parseInt(localStorage.getItem(SIZE_KEY) || '44', 10);
      return Number.isFinite(s) ? s : 44;
    },
    setSize: function (px) {
      localStorage.setItem(SIZE_KEY, String(px));
      document.querySelectorAll('[data-specimen]').forEach(function (n) {
        n.style.fontSize = px + 'px';
      });
      document.querySelectorAll('[data-size-val]').forEach(function (n) {
        n.textContent = px + 'px';
      });
    },
    getPicks: function () { return loadPicks().map(enrich); },
    picks: function () { return loadPicks().map(enrich); },
    hasPick: function (id) { return !!loadPicks().find(function (x) { return x.id === id; }); },
    addPick: function (id, name, extra) {
      const arr = loadPicks();
      if (!arr.find(function (x) { return x.id === id; })) {
        const meta = getById(id) || {};
        arr.push(Object.assign({
          id: id,
          name: name || meta.name || id,
          family: meta.family,
          designer: meta.designerShort || meta.designer,
          weights: meta.weights
        }, extra || {}));
        savePicks(arr);
      } else {
        updateBadges(arr.length);
      }
      WFProto.syncJoinButtons();
      return arr.length;
    },
    removePick: function (id) {
      const arr = loadPicks().filter(function (x) { return x.id !== id; });
      savePicks(arr);
      WFProto.syncJoinButtons();
      return arr.length;
    },
    clearPicks: function () {
      savePicks([]);
      WFProto.syncJoinButtons();
      return 0;
    },
    togglePick: function (id, name) {
      if (WFProto.hasPick(id)) return WFProto.removePick(id);
      return WFProto.addPick(id, name);
    },
    count: function () { return loadPicks().length; },
    syncJoinButtons: function () {
      document.querySelectorAll('[data-join]').forEach(function (btn) {
        const id = btn.getAttribute('data-join');
        setJoinLabel(btn, WFProto.hasPick(id));
      });
    },
    getQuery: getQuery,
    /** Legacy DOM filter — prefer ClientScrollList for fonts.html */
    applyListFilters: function (opts) {
      const tag = (opts && opts.tag != null) ? opts.tag : getQuery('tag');
      const keyword = ((opts && opts.keyword != null) ? opts.keyword : getQuery('keyword')).trim().toLowerCase();
      const rows = document.querySelectorAll('.font-row[data-font-id]');
      let shown = 0;
      rows.forEach(function (row) {
        const id = row.getAttribute('data-font-id');
        const meta = getById(id) || {};
        const fake = {
          id: id,
          name: row.getAttribute('data-name') || meta.name,
          tags: (row.getAttribute('data-tags') || (meta.tags || []).join(',')).split(/[,，]/),
          category: meta.category,
          en: meta.en,
          family: meta.family,
          designer: meta.designer,
          description: meta.description,
          license: meta.license
        };
        const ok = matchFilter(fake, tag, keyword);
        row.hidden = !ok;
        if (ok) shown += 1;
      });
      const countEl = document.getElementById('fontCount');
      if (countEl) countEl.textContent = String(shown);
      document.querySelectorAll('.vtag').forEach(function (a) {
        try {
          const u = new URL(a.href, location.href);
          const t = u.searchParams.get('tag') || '';
          a.classList.toggle('active', !!tag && t === tag);
        } catch (e) { /* ignore */ }
      });
      return shown;
    },
    bindNavSearch: function (input, clearBtn) {
      if (!input) return;
      const tag = getQuery('tag');
      const kw = getQuery('keyword');
      if (kw) input.value = kw;
      const go = function () {
        const v = (input.value || '').trim();
        const params = new URLSearchParams();
        if (v) params.set('keyword', v);
        if (tag) params.set('tag', tag);
        const cur = (window.WFFontsList && window.WFFontsList.getFilter) ? window.WFFontsList.getFilter() : {};
        if (cur.license) params.set('license', cur.license);
        const q = params.toString();
        if (document.body.classList.contains('page-fonts') && window.WFFontsList) {
          const url = location.pathname + (q ? '?' + q : '');
          history.replaceState(null, '', url);
          window.WFFontsList.refresh({ keyword: v, tag: tag });
        } else if (document.body.classList.contains('page-fonts')) {
          const url = location.pathname + (q ? '?' + q : '');
          history.replaceState(null, '', url);
          WFProto.applyListFilters({ keyword: v, tag: tag });
        } else {
          location.href = 'fonts.html' + (q ? '?' + q : '');
        }
      };
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); go(); }
      });
      // 列表页：输入即搜（220ms 防抖），回车仍保留
      if (document.body.classList.contains('page-fonts')) {
        let debounce = null;
        input.addEventListener('input', function () {
          clearTimeout(debounce);
          debounce = setTimeout(go, 220);
        });
      }
      if (clearBtn) {
        const syncClear = function () {
          clearBtn.hidden = !(input.value || '').trim();
        };
        syncClear();
        input.addEventListener('input', syncClear);
        clearBtn.addEventListener('click', function () {
          input.value = '';
          syncClear();
          if (document.body.classList.contains('page-fonts') && window.WFFontsList) {
            const params = new URLSearchParams();
            if (tag) params.set('tag', tag);
            const q = params.toString();
            history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
            window.WFFontsList.refresh({ keyword: '', tag: tag });
          } else if (document.body.classList.contains('page-fonts')) {
            const params = new URLSearchParams();
            if (tag) params.set('tag', tag);
            const q = params.toString();
            history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
            WFProto.applyListFilters({ keyword: '', tag: tag });
          } else {
            location.href = 'fonts.html' + (tag ? '?tag=' + encodeURIComponent(tag) : '');
          }
        });
      }
    },
    cssUrl: function (family, weight) {
      return 'https://app.windfonts.com/api/css?family=' + encodeURIComponent(family) +
        '&weight=' + encodeURIComponent(weightToCss(weight || '400'));
    },
    copyText: function (text) {
      function legacyCopy() {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        return ok ? Promise.resolve() : Promise.reject(new Error('copy denied'));
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).catch(legacyCopy);
      }
      return legacyCopy();
    },
    /** ClientScrollViewList — infinite / load-more from fonts.json */
    mountFontsList: function (opts) {
      const listEl = document.getElementById((opts && opts.listId) || 'fontList');
      const countTotalEl = document.getElementById((opts && opts.countTotalId) || 'fontCountTotal');
      const countShownEl = document.getElementById((opts && opts.countShownId) || 'fontCountShown');
      const countLegacy = document.getElementById('fontCount');
      const loadMoreBtn = document.getElementById((opts && opts.loadMoreId) || 'loadMore');
      const sentinel = document.getElementById((opts && opts.sentinelId) || 'listSentinel');
      const pageSize = (opts && opts.pageSize) || PAGE_SIZE;
      let filtered = [];
      let shown = 0;
      let tag = getQuery('tag');
      let keyword = getQuery('keyword');
      let license = getQuery('license');

      function syncUrl() {
        const params = new URLSearchParams();
        if (keyword) params.set('keyword', keyword);
        if (tag) params.set('tag', tag);
        if (license) params.set('license', license);
        const q = params.toString();
        history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
      }

      function renderLicenseChips() {
        const box = document.getElementById('licenseChips');
        if (!box) return;
        const order = ['免费商用', '需授权', '个人免费', '待核实'];
        const counts = {};
        catalog.forEach(function (f) {
          const t = licenseTier(f);
          counts[t] = (counts[t] || 0) + 1;
        });
        const chips = [{ key: '', label: '全部', n: catalog.length }]
          .concat(order.filter(function (t) { return counts[t]; })
            .map(function (t) { return { key: t, label: t, n: counts[t] }; }));
        box.innerHTML = chips.map(function (c) {
          return '<button type="button" class="lic-chip' + (license === c.key ? ' is-active' : '') +
            '" data-lic="' + escapeHtml(c.key) + '">' + escapeHtml(c.label) +
            ' <span class="lic-n">' + c.n + '</span></button>';
        }).join('');
        box.querySelectorAll('[data-lic]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            license = btn.getAttribute('data-lic') || '';
            syncUrl();
            refresh();
          });
        });
      }

      function updateCount() {
        const total = filtered.length;
        const label = document.getElementById('fontsCountLabel');
        if (label) {
          label.innerHTML = '共找到 <strong id="fontCountTotal">' + total +
            '</strong> 个字体，已显示 <strong id="fontCountShown">' + shown + '</strong> 个';
        } else {
          if (countTotalEl) countTotalEl.textContent = String(total);
          if (countShownEl) countShownEl.textContent = String(shown);
        }
        const legacy = document.getElementById('fontCount');
        if (legacy) legacy.textContent = String(total);
        if (loadMoreBtn) {
          loadMoreBtn.hidden = shown >= total;
          loadMoreBtn.disabled = shown >= total;
        }
      }

      function highlightTags() {
        document.querySelectorAll('.vtag').forEach(function (a) {
          try {
            const u = new URL(a.href, location.href);
            const t = u.searchParams.get('tag') || '';
            a.classList.toggle('active', !!tag && t === tag);
          } catch (e) { /* ignore */ }
        });
      }

      function rowHtml(font) {
        const sample = WFProto.getSample();
        const size = WFProto.getSize();
        const author = font.designerShort || '—';
        const styles = font.styles || (font.weights && font.weights.length) || 1;
        const stack = cssFamilyStack(font.family);
        return (
          '<li class="font-row" data-font-id="' + escapeHtml(font.id) + '" data-name="' +
            escapeHtml(font.name) + '" data-tags="' + escapeHtml((font.tags || []).join(',')) +
            '" data-family="' + escapeHtml(font.family || '') + '">' +
            '<div class="font-row-head">' +
              '<span class="name">' + escapeHtml(font.name) + '</span>' +
              '<span class="author">作者 ' + escapeHtml(author) + '</span>' +
              '<span class="divider" aria-hidden="true"></span>' +
              '<span class="styles-count">可选样式 ' + styles + '</span>' +
              '<button type="button" class="btn-pill join-btn" data-join="' + escapeHtml(font.id) +
                '" data-name="' + escapeHtml(font.name) + '">加入选择</button>' +
            '</div>' +
            '<a class="font-row-preview" href="font-detail.html?id=' + encodeURIComponent(font.id) +
              '" data-specimen style="font-family:' + escapeHtml(stack) + ';font-size:' + size + 'px">' +
              escapeHtml(sample) +
            '</a>' +
          '</li>'
        );
      }

      function wireRow(li) {
        const family = li.getAttribute('data-family');
        ensureFontCss(family, '400');
        const btn = li.querySelector('[data-join]');
        if (btn && !btn._wfBound) {
          btn._wfBound = true;
          btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            WFProto.togglePick(btn.getAttribute('data-join'), btn.getAttribute('data-name'));
          });
        }
      }

      function appendPage() {
        if (shown >= filtered.length) { updateCount(); return; }
        const next = filtered.slice(shown, shown + pageSize);
        const html = next.map(rowHtml).join('');
        const wrap = document.createElement('div');
        wrap.innerHTML = html;
        const nodes = Array.prototype.slice.call(wrap.children);
        nodes.forEach(function (li) {
          listEl.appendChild(li);
          wireRow(li);
        });
        shown += next.length;
        WFProto.syncJoinButtons();
        updateCount();
      }

      function resetAndRender() {
        filtered = filterCatalog({ tag: tag, keyword: keyword, license: license });
        shown = 0;
        listEl.innerHTML = '';
        highlightTags();
        if (!filtered.length) {
          listEl.innerHTML = '<li class="font-list-empty">没有匹配的字体，试试其他标签或关键词</li>';
          updateCount();
          return;
        }
        appendPage();
      }

      function refresh(next) {
        if (next) {
          if (next.tag != null) tag = next.tag;
          if (next.keyword != null) keyword = next.keyword;
          if (next.license != null) license = next.license;
        } else {
          tag = getQuery('tag');
          keyword = getQuery('keyword');
          license = getQuery('license');
        }
        resetAndRender();
        renderLicenseChips();
      }

      if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function () { appendPage(); });
      }
      if (sentinel && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && shown < filtered.length && shown > 0) appendPage();
          });
        }, { rootMargin: '240px 0px' });
        io.observe(sentinel);
      }

      window.WFFontsList = {
        refresh: refresh,
        loadMore: appendPage,
        getFiltered: function () { return filtered.slice(); },
        getFilter: function () { return { tag: tag, keyword: keyword, license: license }; }
      };

      return loadCatalog().then(function () {
        refresh();
        return window.WFFontsList;
      });
    }
  };

  updateBadges(loadPicks().length);

  document.addEventListener('DOMContentLoaded', function () {
    updateBadges(loadPicks().length);
    injectFooterIfMissing();

    const sample = document.getElementById('specimenText');
    const size = document.getElementById('specimenSize');
    if (sample) {
      sample.value = WFProto.getSample();
      WFProto.setSample(sample.value);
      sample.addEventListener('input', function () { WFProto.setSample(sample.value); });
    }
    if (size) {
      size.value = String(WFProto.getSize());
      WFProto.setSize(size.value);
      size.addEventListener('input', function () { WFProto.setSize(size.value); });
    } else if (document.querySelector('[data-specimen]')) {
      WFProto.setSize(WFProto.getSize());
    }

    document.querySelectorAll('[data-join]').forEach(function (btn) {
      if (btn._wfBound) return;
      btn._wfBound = true;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-join');
        const name = btn.getAttribute('data-name') || id;
        WFProto.togglePick(id, name);
      });
    });
    WFProto.syncJoinButtons();

    const navSearch = document.getElementById('navSearch');
    const navSearchClear = document.getElementById('navSearchClear');
    if (navSearch) WFProto.bindNavSearch(navSearch, navSearchClear);

    const tagBar = document.querySelector('.tag-bar');
    const floatBar = document.querySelector('.float-bar');
    if (tagBar && floatBar) {
      const io = new IntersectionObserver(
        function (entries) {
          const entry = entries[0];
          if (entry.isIntersecting) floatBar.classList.remove('is-visible');
          else floatBar.classList.add('is-visible');
        },
        { rootMargin: '-56px 0px 0px 0px', threshold: 0 }
      );
      io.observe(tagBar);
    }

    document.querySelectorAll('[data-bag-link]').forEach(function (el) {
      if (el.tagName === 'A') return;
      el.addEventListener('click', function () { location.href = 'shopping-bag.html'; });
    });

    // Warm catalog for detail/bag/embed/admin
    loadCatalog();
  });
})();
