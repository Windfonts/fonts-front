/* 首页：原 hero + 数字一行 + 字林 + 当前款一条 + 同分类四款 + 库内结构 + 合作伙伴。全库在 fonts.html。 */
(function () {
  const esc = WFProto.escapeHtml;
  const FEATURED = ['阿里巴巴普惠体', '得意黑', '思源黑体', '站酷', '思源宋体', '霞鹙文楷', 'LXGW', '寒蝉', '钟齐'];
  const RELATED_N = 4;
  const PARTNERS = [
    { name: '文派', slug: 'wenpai', href: 'https://wenpai.org' },
    { name: '薇晓朵', slug: 'weixiaoduo', href: 'https://www.weixiaoduo.com' },
    { name: 'WPTEA', slug: 'wptea', href: 'https://wptea.com' },
    { name: '莫蒂奇', slug: 'modiqi', href: 'https://modiqi.com' },
    { name: '橙黑', slug: 'chenghei', href: 'https://chenghei.com' },
    { name: '跨飞', slug: 'kuafei', href: 'https://www.feibisi.com' },
    { name: 'Cravatar', slug: 'cravatar', href: 'https://cravatar.com' },
    { name: '菲比斯', slug: 'feibisi', href: 'https://feibisi.com' }
  ];

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

  function bits(font) {
    const n = (font.weights || []).length || 1;
    const parts = [WFChrome.licenseTier(font), n + ' 字重'];
    if (font.charCount) parts.push(WFProto.formatCount(font.charCount) + ' 字');
    return parts.join(' · ');
  }

  function catLabel(font) {
    return WFChrome.catLabel(font.category) || font.category || '同分类';
  }

  function heavyWeight(font) {
    const ws = (font && font.weights) || [];
    if (!ws.length) return WFSpecimen.firstWeight(font);
    let best = ws[0];
    let bestN = Number(WFProto.weightToCss(best)) || 400;
    ws.forEach(function (n) {
      const css = Number(WFProto.weightToCss(n)) || 400;
      if (css > bestN) { best = n; bestN = css; }
    });
    return WFProto.weightToCss(best);
  }

  function relatedOf(list, featured, font) {
    if (!font.category) {
      return featured.filter(function (f) { return f.id !== font.id; }).concat(
        list.filter(function (f) { return f.id !== font.id && featured.indexOf(f) === -1; })
      ).slice(0, RELATED_N);
    }
    const same = list.filter(function (f) { return f.id !== font.id && f.category === font.category; });
    const rest = featured.filter(function (f) { return f.id !== font.id && same.indexOf(f) === -1; });
    return same.concat(rest).slice(0, RELATED_N);
  }

  function nowHtml(font, glyph) {
    const w = heavyWeight(font);
    const stack = WFProto.cssFamilyStack(font.family);
    const detail = 'font-detail.html?id=' + encodeURIComponent(font.id);
    WFProto.ensureFontCss(font.family, w);
    return '<div class="home-now-card">' +
      '<p class="home-now-glyph" style="font-family:' + esc(stack) + ';font-weight:' + w + '">' + esc(glyph || '风') + '</p>' +
      '<div><h2><a href="' + detail + '">' + esc(font.name) + '</a></h2>' +
      '<div class="sub">' + WFChrome.foundryHtml(font, { small: true }) + '</div>' +
      '<p class="bits">' + esc(bits(font)) + '</p></div>' +
      '<div class="acts">' +
        '<a class="btn btn-ink" href="' + detail + '">查看这款</a>' +
        '<button type="button" class="btn" id="nowPick">' + WFChrome.icon('plus') + '加入选字袋</button>' +
      '</div></div>';
  }

  function renderStats(list) {
    const band = document.getElementById('statsBand');
    if (!band) return;
    const tierOrder = ['免费商用', '需授权', '个人免费', '待核实'];
    const tiers = {};
    const brandCount = {};
    const brandNameBySlug = {};
    const brandFontBySlug = {};
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
        if (!brandFontBySlug[slug] || (!WFChrome.brandAvatar(brandFontBySlug[slug]) && WFChrome.brandAvatar(f))) {
          brandFontBySlug[slug] = f;
        }
      }
      const cc = Number(f.charCount);
      if (cc > 0) {
        charKnown++;
        for (let i = 0; i < SCALE.length; i++) {
          if (cc >= SCALE[i].min && cc < SCALE[i].max) { SCALE[i].n++; break; }
        }
      }
    });

    function faceHtml(font) {
      if (!font) return '';
      const url = WFChrome.brandAvatar(font);
      const name = WFChrome.brandName(font) || '';
      if (url) {
        return '<img class="stat-face" src="' + esc(url) + '" alt="" width="22" height="22" loading="lazy" />';
      }
      return '<span class="stat-face mark" aria-hidden="true">' + esc(name.charAt(0) || '厂') + '</span>';
    }
    function rows(items, href) {
      const max = Math.max.apply(null, items.map(function (r) { return r.n; })) || 1;
      return items.map(function (r) {
        const w = Math.max(4, Math.round(r.n / max * 100));
        const face = r.font ? faceHtml(r.font) : '';
        const inner = face +
          '<span class="lab">' + esc(r.label) + '</span>' +
          '<span class="track"><i style="width:' + w + '%"></i></span>' +
          '<span class="num">' + r.n + '</span>';
        const cls = 'stat-row' + (face ? ' has-face' : '');
        return href
          ? '<a class="' + cls + '" href="' + href(r) + '">' + inner + '</a>'
          : '<div class="' + cls + '">' + inner + '</div>';
      }).join('');
    }
    function panel(iconName, title, body, note) {
      return '<div class="panel panel-pad stat-panel"><h3>' + WFChrome.icon(iconName) + esc(title) + '</h3>' + body +
        (note ? '<p class="stat-note">' + esc(note) + '</p>' : '') + '</div>';
    }
    const tierItems = tierOrder.filter(function (t) { return tiers[t]; })
      .map(function (t) { return { label: t, n: tiers[t] }; });
    const topBrands = Object.keys(brandCount)
      .map(function (slug) {
        return { key: slug, label: brandNameBySlug[slug], n: brandCount[slug], font: brandFontBySlug[slug] };
      })
      .sort(function (a, b) { return b.n - a.n; }).slice(0, 6);
    const scaleItems = SCALE.map(function (b) { return { label: b.label, n: b.n }; })
      .filter(function (r) { return r.n > 0; });
    const unknown = list.length - charKnown;

    const homeStats = document.getElementById('homeStats');
    if (homeStats) {
      const brands = Object.keys(brandCount).length;
      const free = tiers['免费商用'] || 0;
      homeStats.innerHTML =
        '<a href="fonts.html"><b>' + WFProto.formatCount(list.length) + '</b> 款</a>' +
        '<a href="foundry.html"><b>' + WFProto.formatCount(brands) + '</b> 家</a>' +
        '<a href="fonts.html?license=' + encodeURIComponent('免费商用') + '"><b>' +
          WFProto.formatCount(free) + '</b> 免费商用</a>';
    }

    band.innerHTML =
      '<div class="section-head"><h2>' + WFChrome.icon('chart') + '现在的库</h2>' +
        '<a class="more" href="foundry.html">厂商索引 →</a></div>' +
      '<div class="stats-grid">' +
        panel('certificate', '按授权', rows(tierItems, function (r) { return 'fonts.html?license=' + encodeURIComponent(r.label); }), '分类说明见文档。') +
        panel('user', '字体最多的厂商', rows(topBrands, function (r) { return 'foundry.html?slug=' + encodeURIComponent(r.key); })) +
        panel('font-size', '字符规模', rows(scaleItems),
          '按已有字数的 ' + charKnown + ' 款统计' + (unknown ? '；' + unknown + ' 款还没录入字数。' : '。')) +
      '</div>';
  }

  function renderPartners() {
    const el = document.getElementById('homePartners');
    if (!el) return;
    el.innerHTML =
      '<p class="home-partners-eyebrow">合作伙伴</p>' +
      '<ul class="home-partners-list">' +
      PARTNERS.map(function (p) {
        return '<li><a href="' + esc(p.href) + '" target="_blank" rel="noopener noreferrer">' +
          '<img src="' + WFChrome.href('assets/partners/' + p.slug + '.webp') + '" alt="' + esc(p.name) +
          '" width="426" height="150" loading="lazy" decoding="async" /></a></li>';
      }).join('') +
      '</ul>';
  }

  renderPartners();
  WFProto.loadCatalog().then(function (list) {
    renderStats(list);
    const featured = pickFeatured(list, 9);
    const live = document.getElementById('live');
    const liveName = document.getElementById('liveName');
    const forest = document.getElementById('homeForest');
    const now = document.getElementById('homeNow');
    const related = document.getElementById('homeRelated');
    const relatedCount = document.getElementById('homeRelatedCount');
    const more = document.getElementById('homeMore');
    let idx = 0;
    let current = featured[0];

    function forestGlyph() {
      const el = forest && forest.querySelector('[data-forest-glyph]');
      const t = el ? String(el.textContent || '').replace(/\s+/g, '') : '';
      return t || '风';
    }

    function forestHtml(font, glyph) {
      const g = glyph || '风';
      const ordered = [font].concat(featured.filter(function (x) { return x.id !== font.id; }));
      return ordered.map(function (f) {
        const w = WFSpecimen.firstWeight(f);
        const stack = WFProto.cssFamilyStack(f.family);
        WFProto.ensureFontCss(f.family, w);
        if (f.id === font.id) {
          const hw = heavyWeight(f);
          WFProto.ensureFontCss(f.family, hw);
          return '<div class="home-forest-cell is-on">' +
            '<p class="home-forest-glyph" data-forest-glyph contenteditable="true" spellcheck="false">' + esc(g) + '</p>' +
            '<i>' + esc(f.name) + '</i></div>';
        }
        return '<button type="button" class="home-forest-cell" data-forest="' + esc(f.id) + '" title="' + esc(f.name) +
          '" style="font-family:' + esc(stack) + ';font-weight:' + w + '">' +
          '<span class="home-forest-mark">' + esc(g) + '</span><i>' + esc(f.name) + '</i></button>';
      }).join('');
    }

    function wirePick(f) {
      const pick = document.getElementById('nowPick');
      if (!pick) return;
      function sync() {
        const on = WFProto.hasPick(f.id);
        pick.innerHTML = WFChrome.icon(on ? 'check' : 'plus') + (on ? '已在选字袋' : '加入选字袋');
      }
      pick.addEventListener('click', function () {
        const on = WFProto.hasPick(f.id);
        WFProto.togglePick(f.id, f.name);
        WFChrome.toast(on ? '已从选字袋移除' : '已加入选字袋');
        sync();
      });
      sync();
    }

    function setCurrent(font) {
      if (!font) return;
      current = font;
      const i = featured.findIndex(function (x) { return x.id === font.id; });
      if (i >= 0) idx = i;
      applyLive();
    }

    function applyLive() {
      const f = current;
      if (!f) return;
      const w = heavyWeight(f);
      const stack = WFProto.cssFamilyStack(f.family);
      const glyph = forestGlyph();
      WFProto.ensureFontCss(f.family, w);
      live.style.fontFamily = stack;
      live.style.fontWeight = w;
      liveName.textContent = f.name;
      liveName.href = 'font-detail.html?id=' + encodeURIComponent(f.id);
      if (forest) {
        forest.innerHTML = forestHtml(f, glyph);
        const liveG = forest.querySelector('[data-forest-glyph]');
        if (liveG) {
          liveG.style.fontFamily = stack;
          liveG.style.fontWeight = w;
        }
      }
      if (now) {
        now.innerHTML = nowHtml(f, glyph);
        wirePick(f);
      }
      if (related) {
        const rows = relatedOf(list, featured, f);
        if (relatedCount) relatedCount.textContent = catLabel(f) + ' · 抽出 ' + rows.length + ' 款';
        WFSpecimen.renderRows(related, rows, { size: 40 });
      }
      if (more) more.innerHTML = '<a class="btn btn-lg" href="fonts.html">全部 ' + list.length + ' 款 →</a>';
    }

    applyLive();
    document.getElementById('liveNext').addEventListener('click', function () {
      idx += 1;
      current = featured[idx % featured.length];
      applyLive();
    });
    if (forest) {
      forest.addEventListener('click', function (e) {
        const b = e.target.closest('[data-forest]');
        if (!b) return;
        setCurrent(featured.filter(function (f) { return f.id === b.getAttribute('data-forest'); })[0]);
      });
      forest.addEventListener('input', function (e) {
        if (!e.target.closest('[data-forest-glyph]')) return;
        const g = forestGlyph();
        forest.querySelectorAll('.home-forest-mark').forEach(function (el) { el.textContent = g; });
        const nowG = document.querySelector('.home-now-glyph');
        if (nowG) nowG.textContent = g;
      });
    }
    if (related) {
      related.addEventListener('click', function (e) {
        const row = e.target.closest('.specimen');
        if (!row || e.target.closest('.act, .name, .preview')) return;
        setCurrent(list.filter(function (f) { return f.id === row.getAttribute('data-font-id'); })[0]);
      });
    }
  });
})();
