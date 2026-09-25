/* 永字墙 · 全库独立样张网格
   - 复用 WFProto.ensureFontCss / readyFace（fonts-packages 拆包，非新 CDN）
   - 永面：仅 primary wenfeng-* family，禁止 cssFamilyStack 进 style="..."
   - 懒加载：IntersectionObserver；ready 后重申 fontFamily/fontWeight + is-face-ready
   - ?debugFace=1 → console.warn 失败 */
(function () {
  const YONG = '永';
  const PREFIX_MIN = 5;
  const esc = WFProto.escapeHtml;
  const gridEl = document.getElementById('ywGrid');
  const chipsEl = document.getElementById('ywChips');
  const qEl = document.getElementById('ywQ');
  const countEl = document.getElementById('ywCount');

  let catalog = [];
  let filterKey = ''; /* '' | group:<id> | prefix:<cjk> */
  let query = '';
  let io = null;
  const faceInflight = {};

  function qs(name) {
    try { return new URLSearchParams(location.search).get(name) || ''; }
    catch (e) { return ''; }
  }

  function debugFaceOn() {
    try { return /(?:^|[?&])debugFace=1(?:&|$)/.test(location.search); }
    catch (e) { return false; }
  }

  function weightOf(font) {
    const ws = (font.weights && font.weights.length) ? font.weights : ['Regular'];
    const reg = ws.filter(function (w) { return /regular|normal/i.test(String(w)); })[0];
    return WFProto.weightToCss(reg || ws[0]);
  }

  /** Inline style: single-quoted primary family only (HTML-attr safe). */
  function faceStyleOf(font) {
    if (!font || !font.family || font.ghost) return '';
    const w = weightOf(font);
    WFProto.ensureFontCss(font.family, w);
    const fam = String(font.family).replace(/['"]/g, '');
    return "font-family:'" + fam + "';font-weight:" + w;
  }

  function canFace(font) {
    return !!(font && font.family && !font.ghost);
  }

  function faceKey(font) {
    if (!canFace(font)) return '';
    return font.family + '|' + weightOf(font);
  }

  function shortName(font) {
    return font.name || font.en || font.family || font.id || '';
  }

  function licShort(font) {
    const ln = String(font.licenseName || font.license || '');
    if (/OFL|Open Font License/i.test(ln)) return 'OFL';
    if (/IPA/i.test(ln)) return 'IPA';
    if (/Apache/i.test(ln)) return 'Apache';
    if (/\bMIT\b/i.test(ln)) return 'MIT';
    if (/CC0|CC BY/i.test(ln)) return 'CC';
    if (/GPL/i.test(ln)) return 'GPL';
    if (/仓耳/i.test(ln)) return '仓耳';
    const tier = WFProto.licenseTier ? WFProto.licenseTier(font) : '';
    if (tier && tier !== '待核实') return tier.length > 6 ? tier.slice(0, 6) : tier;
    return ln ? ln.slice(0, 8) : '';
  }

  function cjkBrandPrefix(name) {
    const m = String(name || '').match(/^[\u4e00-\u9fff]{2,8}/);
    return m ? m[0] : '';
  }

  /** Detect CJK name-prefix piles from catalog (e.g. 狮尾系) — not hardcoded. */
  function detectPrefixChips(list) {
    const candidates = {};
    list.forEach(function (f) {
      const cjk = cjkBrandPrefix(f.name);
      for (let len = Math.min(4, cjk.length); len >= 2; len--) {
        const p = cjk.slice(0, len);
        (candidates[p] = candidates[p] || []).push(f);
      }
    });
    const used = {};
    const out = [];
    Object.keys(candidates).sort(function (a, b) {
      return b.length - a.length || candidates[b].length - candidates[a].length || a.localeCompare(b, 'zh');
    }).forEach(function (p) {
      const members = candidates[p].filter(function (f) { return !used[f.id]; });
      const uniq = [];
      const seen = {};
      members.forEach(function (f) {
        if (seen[f.id]) return;
        seen[f.id] = true;
        uniq.push(f);
      });
      if (uniq.length >= PREFIX_MIN) {
        uniq.forEach(function (f) { used[f.id] = true; });
        out.push({ kind: 'prefix', key: p, title: p + '系', count: uniq.length });
      }
    });
    out.sort(function (a, b) { return b.count - a.count || a.title.localeCompare(b.title, 'zh'); });
    return out;
  }

  function lineageGroupChips(list) {
    const ld = WFProto.getLineageData() || { groups: {} };
    const groups = ld.groups || {};
    const counts = {};
    list.forEach(function (f) {
      const g = f.lineage && f.lineage.group;
      if (!g) return;
      counts[g] = (counts[g] || 0) + 1;
    });
    return Object.keys(counts).map(function (k) {
      const meta = groups[k] || {};
      const title = meta.name || k;
      return { kind: 'group', key: k, title: title, count: counts[k] };
    }).sort(function (a, b) {
      return b.count - a.count || a.title.localeCompare(b.title, 'zh');
    });
  }

  function buildChips(list) {
    return [{ kind: 'all', key: '', title: '全部', count: list.length }]
      .concat(lineageGroupChips(list))
      .concat(detectPrefixChips(list));
  }

  function matchesFilter(font) {
    if (!filterKey) return true;
    if (filterKey.indexOf('group:') === 0) {
      return !!(font.lineage && font.lineage.group === filterKey.slice(6));
    }
    if (filterKey.indexOf('prefix:') === 0) {
      const p = filterKey.slice(7);
      return String(font.name || '').indexOf(p) === 0;
    }
    return true;
  }

  function matchesQuery(font) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const hay = [
      font.name, font.en, font.family, font.normalized, font.foundry, font.designer
    ].map(function (s) { return String(s || '').toLowerCase(); }).join(' ');
    return hay.indexOf(q) !== -1;
  }

  function filteredList() {
    return catalog.filter(function (f) {
      return canFace(f) && matchesFilter(f) && matchesQuery(f);
    }).sort(function (a, b) {
      return shortName(a).localeCompare(shortName(b), 'zh');
    });
  }

  function detailHref(font) {
    try {
      return WFChrome.href(WFProto.detailHref(font));
    } catch (e) {
      return 'font-detail.html?id=' + encodeURIComponent(font.id);
    }
  }

  function markReady(el, fam, w) {
    el.style.fontFamily = "'" + fam + "'";
    el.style.fontWeight = String(w);
    el.classList.add('is-face-ready');
  }

  function loadFaceForCard(card) {
    const yong = card.querySelector('.yw-yong[data-face]');
    if (!yong || yong.classList.contains('is-face-ready')) return;
    const key = yong.getAttribute('data-face');
    if (!key || faceInflight[key] === 'done') {
      if (faceInflight[key] === 'done') {
        const parts = key.split('|');
        const fam = String(parts[0] || '').replace(/['"]/g, '');
        const w = parts[1] || '400';
        markReady(yong, fam, w);
      }
      return;
    }
    if (faceInflight[key]) return;
    faceInflight[key] = true;
    const parts = key.split('|');
    const fam = String(parts[0] || '').replace(/['"]/g, '');
    const w = parts[1] || '400';
    const dbg = debugFaceOn();
    WFProto.readyFace(fam, w, YONG).then(function () {
      faceInflight[key] = 'done';
      document.querySelectorAll('.yw-yong[data-face]').forEach(function (el) {
        if (el.getAttribute('data-face') !== key) return;
        markReady(el, fam, w);
      });
      if (dbg && document.fonts && document.fonts.check) {
        const ok = document.fonts.check(w + ' 32px "' + fam + '"', YONG);
        if (!ok) console.warn('[debugFace] loaded but check failed', key);
      }
    }, function (err) {
      faceInflight[key] = false;
      if (dbg) console.warn('[debugFace] face load failed', key, err || '');
    });
  }

  function setupObserver() {
    if (io) { io.disconnect(); io = null; }
    if (!('IntersectionObserver' in window)) {
      gridEl.querySelectorAll('.yw-card').forEach(loadFaceForCard);
      return;
    }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        loadFaceForCard(en.target);
        io.unobserve(en.target);
      });
    }, { rootMargin: '240px 0px', threshold: 0.01 });
    gridEl.querySelectorAll('.yw-card').forEach(function (card) { io.observe(card); });
  }

  function renderChips() {
    const chips = buildChips(catalog.filter(canFace));
    let html = '';
    chips.forEach(function (c) {
      const fk = c.kind === 'all' ? '' : (c.kind + ':' + c.key);
      const on = filterKey === fk;
      html += '<button type="button" class="chip' + (on ? ' is-on' : '') + '" data-filter="' + esc(fk) + '">' +
        esc(c.title) + '<span class="yw-chip-n">' + c.count + '</span></button>';
    });
    chipsEl.innerHTML = html;
    chipsEl.querySelectorAll('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterKey = btn.getAttribute('data-filter') || '';
        syncUrl();
        render();
      });
    });
  }

  function cardHtml(font) {
    const face = faceStyleOf(font);
    const key = faceKey(font);
    const name = shortName(font);
    const lic = licShort(font);
    const groupLabel = (font.lineage && font.lineage.groupName) || '';
    const yong = key
      ? '<span class="yw-yong" data-face="' + esc(key) + '"' +
        (face ? ' style="' + face + '"' : '') + ' aria-hidden="true">' + YONG + '</span>'
      : '<span class="yw-yong" aria-hidden="true">' + YONG + '</span>';
    return '<a class="yw-card" href="' + esc(detailHref(font)) + '" data-id="' + esc(font.id) + '">' +
      yong +
      '<span class="yw-name">' + esc(name) + '</span>' +
      '<span class="yw-meta"><span>' + esc(lic) + '</span><span>' + esc(groupLabel) + '</span></span>' +
      '</a>';
  }

  function render() {
    const list = filteredList();
    countEl.textContent = list.length + ' / ' + catalog.filter(canFace).length + ' 款';
    if (!list.length) {
      gridEl.innerHTML = '<p class="yw-empty">此筛选下暂无字体。</p>';
      if (io) { io.disconnect(); io = null; }
      return;
    }
    /* Batch DOM write; faces load lazily via IO — avoid stampede of ~471 readyFace. */
    gridEl.innerHTML = list.map(cardHtml).join('');
    setupObserver();
  }

  function syncUrl() {
    try {
      const u = new URL(location.href);
      if (query.trim()) u.searchParams.set('q', query.trim());
      else u.searchParams.delete('q');
      if (filterKey) u.searchParams.set('filter', filterKey);
      else u.searchParams.delete('filter');
      /* keep debugFace if present */
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) { /* ignore */ }
  }

  function bindSearch() {
    let t = null;
    qEl.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        query = qEl.value || '';
        syncUrl();
        render();
      }, 120);
    });
  }

  function initFromUrl() {
    query = qs('q');
    filterKey = qs('filter') || qs('group');
    if (filterKey && filterKey.indexOf(':') === -1) filterKey = 'group:' + filterKey;
    if (qEl && query) qEl.value = query;
  }

  initFromUrl();
  bindSearch();

  WFProto.loadCatalog().then(function () {
    catalog = WFProto.getCatalogList().filter(function (f) { return f && f.id; });
    renderChips();
    render();
  }, function () {
    gridEl.innerHTML = '<p class="yw-empty">读不到字体目录。</p>';
    countEl.textContent = '';
  });
})();
