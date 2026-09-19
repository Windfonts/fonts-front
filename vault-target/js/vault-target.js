/* vault target-state — catalog, specimen, 我的选字, honest tiers */
(function () {
  const PICKS_KEY = 'vault-target-picks';
  const SAMPLE_KEY = 'vault-target-sample';
  const SIZE_KEY = 'vault-target-size';
  const DEFAULT_SAMPLE = '文风字体 · 字先行';
  const DEFAULT_SIZE = 48;
  const CSS_API = 'https://app.windfonts.com/api/css';

  const WEIGHT_MAP = {
    thin: '100', extralight: '200', 'extra-light': '200', light: '300',
    demilight: '350', 'demi-light': '350', book: '350', text: '400',
    regular: '400', normal: '400', medium: '500',
    demibold: '600', 'demi-bold': '600', semibold: '600', 'semi-bold': '600',
    bold: '700', extrabold: '800', 'extra-bold': '800', heavy: '800',
    black: '900', ultrablack: '950'
  };

  /* Honest tier from license / description — no fake 免费商用 green badge */
  const OFL_HINT = /OFL|SIL Open Font|Open Font License|Apache-2\.0|Apache 2/i;
  const AUTH_HINT = /联系授权|付费授权|个人免费|需授权/;

  /** Embedded fallback when ../data/fonts.json missing (~8 samples) */
  const EMBEDDED = [
    {
      id: 'ebfe2481-5377-457b-ae49-719f4faeb2db',
      name: 'IBM Plex Sans SC 简体中文',
      en: 'IBM Plex Sans SC',
      family: 'wenfeng-ibmps',
      designer: 'Mike Abbink',
      designerShort: 'Mike Abbink',
      category: '无衬线字体',
      tags: ['黑体'],
      weights: ['Thin', 'Extralight', 'Light', 'Text', 'Regular', 'Bold'],
      license: '免费商用',
      license_tier: 'ofl',
      license_spdx: 'OFL-1.1',
      description: 'IBM Plex Sans SC · SIL Open Font License 1.1'
    },
    {
      id: '0bf7c810-4938-4389-9c95-8a850a223c54',
      name: '霞鹜新晰黑',
      en: 'LXGW Neo XiHei',
      family: 'wenfeng-xwxxh',
      designer: 'LXGW',
      designerShort: 'LXGW',
      category: '无衬线字体',
      tags: ['黑体'],
      weights: ['Regular'],
      license: '免费商用',
      license_tier: 'ofl',
      license_spdx: 'IPA-1.0',
      description: '霞鹜新晰黑 · IPA Font License'
    },
    {
      id: 'dabfdb8a-7eb3-4102-8087-6b404eac7def',
      name: '思源黑体 常规体',
      en: 'Noto Sans CJK Regular',
      family: 'wenfeng-syhtcjk',
      designer: 'Adobe / Google',
      designerShort: 'Adobe / Google',
      category: '无衬线字体',
      tags: ['黑体'],
      weights: ['Thin', 'Light', 'DemiLight', 'Regular', 'Medium', 'Bold', 'Black'],
      license: '免费商用',
      license_tier: 'ofl',
      license_spdx: 'OFL-1.1',
      description: '思源黑体 · SIL Open Font License 1.1'
    },
    {
      id: '088b2c69-f1e1-4af8-9451-006c1db7ad1c',
      name: '思源宋体 CN',
      en: 'Source Han Serif CN',
      family: 'wenfeng-systcn',
      designer: 'Adobe / Google',
      designerShort: 'Adobe / Google',
      category: '衬线',
      tags: ['宋体'],
      weights: ['Extralight', 'Light', 'Regular', 'Medium', 'Semibold', 'Bold', 'Heavy'],
      license: '免费商用',
      license_tier: 'ofl',
      license_spdx: 'OFL-1.1',
      description: '思源宋体 · SIL Open Font License 1.1'
    },
    {
      id: 'ba104495-2b24-4daa-abdc-e4c2a4345d19',
      name: '得意黑',
      en: 'Smiley Sans Oblique',
      family: 'wenfeng-dyh',
      designer: 'oooooohmygosh',
      designerShort: 'oooooohmygosh',
      category: '无衬线字体',
      tags: ['黑体', '卡通创意'],
      weights: ['Oblique'],
      license: '免费商用',
      license_tier: 'ofl',
      license_spdx: 'OFL-1.1',
      description: '得意黑 · SIL Open Font License 1.1'
    },
    {
      id: '97451ae3-699b-4f3c-ad9a-e4aefbe11fbd',
      name: '随峰体',
      en: 'The Peak Font',
      family: 'wenfeng-sft',
      designer: '阿坤',
      designerShort: '阿坤',
      category: '手写体',
      tags: ['硬笔手写'],
      weights: ['Regular'],
      license: '免费商用',
      license_tier: 'ofl',
      license_spdx: 'OFL-1.1',
      description: '随峰体 · SIL Open Font License'
    },
    {
      id: '7fdcfd07-864d-49a1-8727-b51d78316e0b',
      name: '阿里巴巴普惠体',
      en: 'Alibaba PuHuiTi',
      family: 'wenfeng-albbpht',
      designer: 'Alibaba Design',
      designerShort: 'Alibaba Design',
      category: '无衬线字体',
      tags: ['黑体'],
      weights: ['Light', 'Regular', 'Medium', 'Heavy'],
      license: '免费商用',
      license_tier: 'unv',
      license_spdx: null,
      description: '品牌条款声明免费商用 · 未人工核验为标准开源 SPDX'
    },
    {
      id: '69800d23-d875-431e-9755-3d40a8a688a1',
      name: '荆南波波黑',
      en: 'Kingnam Bobo',
      family: 'wenfeng-jnbbh',
      designer: '上海亦传',
      designerShort: '上海亦传',
      category: '无衬线字体',
      tags: ['黑体'],
      weights: ['Regular'],
      license: '联系授权',
      license_tier: 'auth',
      license_spdx: null,
      description: '商用需联系版权方获取授权'
    }
  ];

  const TIER_META = {
    ofl: { cls: 'tier-ofl', label: 'OFL已核', note: '已核对为标准开源许可（OFL / IPA / Apache 等），可放心嵌入。' },
    auth: { cls: 'tier-auth', label: '需授权', note: '商用或再分发需联系版权方；本站仅提供预览与 CSS 加载。' },
    unv: { cls: 'tier-unv', label: '未验证', note: '来源声明免费商用，但尚未人工核验 SPDX；嵌入前请自行核对原文。' }
  };

  let catalog = [];
  let catalogPromise = null;
  const injectedCss = new Set();

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

  function inferTier(raw) {
    if (raw.license_tier && TIER_META[raw.license_tier]) return raw.license_tier;
    const lic = String(raw.license || '');
    const desc = String(raw.description || '');
    if (AUTH_HINT.test(lic)) return 'auth';
    if (OFL_HINT.test(desc) || OFL_HINT.test(lic) || /OFL/i.test(String(raw.license_spdx || ''))) return 'ofl';
    if (/免费商用/.test(lic)) return 'unv';
    if (!lic) return 'unv';
    return 'unv';
  }

  function normalizeFont(raw) {
    const weights = Array.isArray(raw.weights) && raw.weights.length ? raw.weights.slice() : ['Regular'];
    const tags = Array.isArray(raw.tags) ? raw.tags.slice() : [];
    const designerShort = raw.designerShort ||
      String(raw.designer || '').split(/[;；,，]/)[0].trim() || '—';
    const tier = inferTier(raw);
    return Object.assign({}, raw, {
      weights: weights,
      tags: tags,
      designerShort: designerShort,
      styles: weights.length,
      license_tier: tier,
      license_spdx: raw.license_spdx || null
    });
  }

  function catalogCandidates() {
    const out = [];
    try {
      /* page at …/vault-target/*.html → sibling prototypes/data */
      out.push(new URL('../data/fonts.json', location.href).href);
      out.push(new URL('../../data/fonts.json', location.href).href);
    } catch (e) { /* ignore */ }
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      const src = scripts[i].src || '';
      if (src.indexOf('vault-target.js') !== -1) {
        out.push(new URL('../../data/fonts.json', src).href);
        out.push(new URL('../data/fonts.json', src).href);
        break;
      }
    }
    out.push('../data/fonts.json');
    return out;
  }

  function loadCatalog() {
    if (catalog.length) return Promise.resolve(catalog);
    if (catalogPromise) return catalogPromise;
    const urls = catalogCandidates();
    catalogPromise = (function tryNext(i) {
      if (i >= urls.length) {
        catalog = EMBEDDED.map(normalizeFont);
        return Promise.resolve(catalog);
      }
      return fetch(urls[i])
        .then(function (r) {
          if (!r.ok) throw new Error(String(r.status));
          return r.json();
        })
        .then(function (arr) {
          const list = (Array.isArray(arr) ? arr : []).map(normalizeFont);
          if (!list.length) throw new Error('empty');
          catalog = list;
          return catalog;
        })
        .catch(function () { return tryNext(i + 1); });
    })(0);
    return catalogPromise;
  }

  function getFont(id) {
    for (let i = 0; i < catalog.length; i++) {
      if (catalog[i].id === id) return catalog[i];
    }
    return null;
  }

  function getQuery(name) {
    try { return new URLSearchParams(location.search).get(name) || ''; }
    catch (e) { return ''; }
  }

  function cssUrl(family, weight) {
    return CSS_API + '?family=' + encodeURIComponent(family) +
      '&weight=' + encodeURIComponent(weightToCss(weight || '400'));
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
    link.href = cssUrl(family, w);
    link.setAttribute('data-vt-family', family);
    link.onerror = function () { /* CORS/429 — system fallback still shows glyphs */ };
    document.head.appendChild(link);
  }

  function getSample() {
    try { return localStorage.getItem(SAMPLE_KEY) || DEFAULT_SAMPLE; }
    catch (e) { return DEFAULT_SAMPLE; }
  }
  function setSample(v) {
    try { localStorage.setItem(SAMPLE_KEY, v); } catch (e) { /* ignore */ }
    document.dispatchEvent(new CustomEvent('vt:sample', { detail: v }));
  }
  function getSize() {
    try {
      const n = parseInt(localStorage.getItem(SIZE_KEY) || String(DEFAULT_SIZE), 10);
      return isNaN(n) ? DEFAULT_SIZE : Math.min(108, Math.max(12, n));
    } catch (e) { return DEFAULT_SIZE; }
  }
  function setSize(px) {
    const n = Math.min(108, Math.max(12, parseInt(px, 10) || DEFAULT_SIZE));
    try { localStorage.setItem(SIZE_KEY, String(n)); } catch (e) { /* ignore */ }
    document.dispatchEvent(new CustomEvent('vt:size', { detail: n }));
    return n;
  }

  function loadPicks() {
    try { return JSON.parse(localStorage.getItem(PICKS_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function savePicks(arr) {
    try { localStorage.setItem(PICKS_KEY, JSON.stringify(arr)); } catch (e) { /* ignore */ }
    updateBadges(arr.length);
    document.dispatchEvent(new CustomEvent('vt:picks', { detail: arr }));
  }
  function updateBadges(n) {
    document.querySelectorAll('[data-pick-count]').forEach(function (el) {
      el.textContent = String(n);
      el.setAttribute('data-count', String(n));
    });
  }
  function getPicks() {
    return loadPicks().map(function (p) {
      const meta = getFont(p.id) || {};
      return Object.assign({}, meta, p, {
        name: p.name || meta.name || p.id,
        family: p.family || meta.family || '',
        designerShort: p.designerShort || meta.designerShort || meta.designer || '—',
        weights: p.weights || meta.weights || ['Regular'],
        styles: (p.weights || meta.weights || ['Regular']).length,
        license_tier: p.license_tier || meta.license_tier || inferTier(meta)
      });
    });
  }
  function isPicked(id) {
    return loadPicks().some(function (p) { return p.id === id; });
  }
  function togglePick(id, name) {
    const arr = loadPicks();
    const i = arr.findIndex(function (p) { return p.id === id; });
    if (i >= 0) {
      arr.splice(i, 1);
      savePicks(arr);
      toast('已移出选字');
      syncJoinButtons();
      return false;
    }
    const font = getFont(id) || {};
    arr.push({
      id: id,
      name: name || font.name || id,
      family: font.family || '',
      designerShort: font.designerShort || '',
      weights: font.weights || ['Regular'],
      license_tier: font.license_tier || 'unv'
    });
    savePicks(arr);
    toast('已加入我的选字');
    syncJoinButtons();
    return true;
  }
  function removePick(id) {
    savePicks(loadPicks().filter(function (p) { return p.id !== id; }));
    syncJoinButtons();
  }
  function clearPicks() {
    savePicks([]);
    syncJoinButtons();
  }
  function syncJoinButtons() {
    document.querySelectorAll('[data-join]').forEach(function (btn) {
      const id = btn.getAttribute('data-join');
      const picked = isPicked(id);
      btn.classList.toggle('is-picked', picked);
      if (btn.hasAttribute('data-op-detail')) {
        btn.textContent = picked ? '移出选字' : '加入选字';
      } else {
        btn.textContent = picked ? '移出选字' : '加入选字';
      }
    });
  }

  function tierHtml(tier, opts) {
    const t = TIER_META[tier] || TIER_META.unv;
    const compact = opts && opts.compact;
    if (compact) {
      return '<span class="tier ' + t.cls + '" title="' + escapeHtml(t.note) + '">' +
        '<span class="tier-dot" aria-hidden="true"></span>' + escapeHtml(t.label) + '</span>';
    }
    return '<div class="tier-block">' +
      '<span class="tier ' + t.cls + '"><span class="tier-dot" aria-hidden="true"></span>' +
      escapeHtml(t.label) + '</span>' +
      '<p class="tier-note">' + escapeHtml(t.note) + '</p></div>';
  }

  function matchFilter(font, tag, search) {
    const tagQ = (tag || '').trim();
    const kw = (search || '').trim().toLowerCase();
    let ok = true;
    if (tagQ) {
      const t = tagQ.toLowerCase();
      const tags = (font.tags || []).map(function (x) { return String(x).toLowerCase(); });
      const cat = String(font.category || '').toLowerCase();
      ok = tags.indexOf(t) !== -1 ||
        tags.some(function (x) { return x.indexOf(t) !== -1; }) ||
        cat.indexOf(t) !== -1;
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
    const tag = (opts && opts.tag) || '';
    const search = (opts && opts.search) || '';
    return catalog.filter(function (f) { return matchFilter(f, tag, search); });
  }

  function toast(msg) {
    let el = document.getElementById('vtToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'vtToast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 1600);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () {
        toast('已复制');
      }).catch(function () {
        fallbackCopy(text);
      });
    }
    fallbackCopy(text);
    return Promise.resolve();
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('已复制'); }
    catch (e) { toast('复制失败'); }
    document.body.removeChild(ta);
  }

  function wireNavSearch() {
    const input = document.getElementById('navSearch');
    if (!input) return;
    const q = getQuery('search') || getQuery('q') || getQuery('keyword');
    if (q && !input.value) input.value = q;
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const v = input.value.trim();
      const onFonts = /fonts\.html$/i.test(location.pathname) || location.pathname.indexOf('/fonts') !== -1;
      if (onFonts && typeof window.VTFontsApply === 'function') {
        window.VTFontsApply({ search: v });
        return;
      }
      location.href = 'fonts.html' + (v ? '?search=' + encodeURIComponent(v) : '');
    });
  }

  function wireSpecimenBar() {
    const text = document.getElementById('specimenText');
    const size = document.getElementById('specimenSize');
    const sizeVal = document.querySelector('[data-size-val]');
    if (text) {
      text.value = getSample();
      text.addEventListener('input', function () {
        setSample(text.value);
        document.querySelectorAll('[data-specimen]').forEach(function (n) {
          n.textContent = text.value || '文';
        });
      });
    }
    if (size) {
      size.value = String(getSize());
      if (sizeVal) sizeVal.textContent = size.value + 'px';
      size.addEventListener('input', function () {
        const px = setSize(size.value);
        if (sizeVal) sizeVal.textContent = px + 'px';
        document.querySelectorAll('[data-specimen]').forEach(function (el) {
          el.style.fontSize = px + 'px';
        });
      });
    }
    document.addEventListener('vt:sample', function (ev) {
      document.querySelectorAll('[data-specimen]').forEach(function (n) {
        n.textContent = ev.detail || '文';
      });
      if (text && document.activeElement !== text) text.value = ev.detail;
    });
    document.addEventListener('vt:size', function (ev) {
      document.querySelectorAll('[data-specimen]').forEach(function (n) {
        n.style.fontSize = ev.detail + 'px';
      });
      if (size && document.activeElement !== size) size.value = String(ev.detail);
      if (sizeVal) sizeVal.textContent = ev.detail + 'px';
    });
  }

  function rowHtml(font) {
    const sample = getSample();
    const size = getSize();
    const stack = cssFamilyStack(font.family);
    const author = font.designerShort || '—';
    const styles = font.styles || (font.weights && font.weights.length) || 1;
    return (
      '<li class="font-row" data-font-id="' + escapeHtml(font.id) +
        '" data-family="' + escapeHtml(font.family || '') + '">' +
        '<div class="font-row-head">' +
          '<span class="name">' + escapeHtml(font.name) + '</span>' +
          '<span class="author">作者 ' + escapeHtml(author) + '</span>' +
          '<span class="divider" aria-hidden="true"></span>' +
          '<span class="styles-count">' + styles + ' 样式</span>' +
          tierHtml(font.license_tier, { compact: true }) +
          '<button type="button" class="btn btn-pill join-btn" data-join="' +
            escapeHtml(font.id) + '" data-name="' + escapeHtml(font.name) +
            '">加入选字</button>' +
        '</div>' +
        '<a class="font-row-preview" href="font-detail.html?id=' + encodeURIComponent(font.id) +
          '" data-specimen style="font-family:' + escapeHtml(stack) + ';font-size:' + size + 'px">' +
          escapeHtml(sample) +
        '</a>' +
      '</li>'
    );
  }

  function mountFontsList(opts) {
    const listEl = document.getElementById((opts && opts.listId) || 'fontList');
    const loadMoreBtn = document.getElementById('loadMore');
    const pageSize = (opts && opts.pageSize) || 12;
    let filtered = [];
    let shown = 0;
    let tag = getQuery('tag') || getQuery('category') || '';
    let search = getQuery('search') || getQuery('q') || getQuery('keyword') || '';

    function updateCount() {
      const label = document.getElementById('fontsCountLabel');
      if (label) {
        if (!filtered.length && (search || tag)) {
          label.innerHTML = '未找到匹配字体' +
            (search ? '（search=<strong>' + escapeHtml(search) + '</strong>）' : '') +
            ' · <a href="fonts.html">清除筛选</a>';
        } else {
          label.innerHTML = '共 <strong>' + filtered.length +
            '</strong> 个字体，已显示 <strong>' + shown + '</strong> 个';
        }
      }
      if (loadMoreBtn) {
        loadMoreBtn.hidden = shown >= filtered.length;
        loadMoreBtn.disabled = shown >= filtered.length;
      }
      document.querySelectorAll('.chip[data-tag]').forEach(function (a) {
        const t = a.getAttribute('data-tag') || '';
        a.classList.toggle('active', !!tag && t === tag);
      });
      const nav = document.getElementById('navSearch');
      if (nav && search && !nav.value) nav.value = search;
    }

    function wireRow(li) {
      ensureFontCss(li.getAttribute('data-family'), '400');
      const btn = li.querySelector('[data-join]');
      if (btn && !btn._vt) {
        btn._vt = true;
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          togglePick(btn.getAttribute('data-join'), btn.getAttribute('data-name'));
        });
      }
    }

    function appendPage() {
      if (!listEl) return;
      if (shown >= filtered.length) { updateCount(); return; }
      const next = filtered.slice(shown, shown + pageSize);
      const wrap = document.createElement('div');
      wrap.innerHTML = next.map(rowHtml).join('');
      Array.prototype.slice.call(wrap.children).forEach(function (li) {
        listEl.appendChild(li);
        wireRow(li);
      });
      shown += next.length;
      syncJoinButtons();
      updateCount();
    }

    function resetAndRender() {
      filtered = filterCatalog({ tag: tag, search: search });
      shown = 0;
      if (listEl) {
        if (!filtered.length) {
          listEl.innerHTML = '<li class="font-list-empty">没有匹配的字体。试改搜索词，或<a href="fonts.html">查看全部</a>。</li>';
        } else {
          listEl.innerHTML = '';
          appendPage();
          return;
        }
      }
      updateCount();
    }

    function apply(opts2) {
      if (opts2 && opts2.search !== undefined) search = opts2.search;
      if (opts2 && opts2.tag !== undefined) tag = opts2.tag;
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (tag) params.set('tag', tag);
      const q = params.toString();
      history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
      resetAndRender();
    }
    window.VTFontsApply = apply;

    document.querySelectorAll('.chip[data-tag]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        const t = a.getAttribute('data-tag') || '';
        apply({ tag: tag === t ? '' : t, search: search });
      });
    });
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', appendPage);
    }

    loadCatalog().then(resetAndRender);
  }

  function mountFeatured(limit) {
    const el = document.getElementById('featuredList');
    if (!el) return;
    loadCatalog().then(function () {
      const prefer = [
        'wenfeng-ibmps', 'wenfeng-syhtcjk', 'wenfeng-systcn',
        'wenfeng-dyh', 'wenfeng-xwxxh', 'wenfeng-sft'
      ];
      const byF = {};
      catalog.forEach(function (f) { byF[f.family] = f; });
      let picks = prefer.map(function (f) { return byF[f]; }).filter(Boolean);
      if (picks.length < (limit || 5)) {
        catalog.forEach(function (f) {
          if (picks.length >= (limit || 6)) return;
          if (!picks.some(function (p) { return p.id === f.id; })) picks.push(f);
        });
      }
      picks = picks.slice(0, limit || 6);
      const sample = getSample();
      el.innerHTML = picks.map(function (font) {
        ensureFontCss(font.family, '400');
        const stack = cssFamilyStack(font.family);
        return (
          '<li><a class="featured-card" href="font-detail.html?id=' + encodeURIComponent(font.id) + '">' +
            '<div class="meta">' +
              '<span class="name">' + escapeHtml(font.name) + '</span>' +
              '<span class="author">' + escapeHtml(font.designerShort || '—') + '</span>' +
              tierHtml(font.license_tier, { compact: true }) +
            '</div>' +
            '<span class="glyph" data-specimen style="font-family:' + escapeHtml(stack) + '">' +
              escapeHtml(sample) +
            '</span>' +
          '</a></li>'
        );
      }).join('');
    });
  }

  /* boot */
  document.addEventListener('DOMContentLoaded', function () {
    updateBadges(loadPicks().length);
    wireNavSearch();
    wireSpecimenBar();
    syncJoinButtons();
  });

  window.VaultTarget = {
    loadCatalog: loadCatalog,
    getCatalog: function () { return catalog; },
    getFont: getFont,
    getQuery: getQuery,
    escapeHtml: escapeHtml,
    weightToCss: weightToCss,
    cssUrl: cssUrl,
    cssFamilyStack: cssFamilyStack,
    ensureFontCss: ensureFontCss,
    getSample: getSample,
    setSample: setSample,
    getSize: getSize,
    setSize: setSize,
    getPicks: getPicks,
    isPicked: isPicked,
    togglePick: togglePick,
    removePick: removePick,
    clearPicks: clearPicks,
    syncJoinButtons: syncJoinButtons,
    tierHtml: tierHtml,
    TIER_META: TIER_META,
    filterCatalog: filterCatalog,
    mountFontsList: mountFontsList,
    mountFeatured: mountFeatured,
    copyText: copyText,
    toast: toast,
    EMBEDDED: EMBEDDED
  };
})();
