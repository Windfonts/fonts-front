/* 特点页：活样张轮换 + 一行接入代码 + 精选样张 + 厂商条 */
(function () {
  const FEATURED = ['阿里巴巴普惠体', '得意黑', '思源黑体', '站酷', '思源宋体', '霞鹜文楷', 'LXGW', '寒蝉', '钟齐'];

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

  function famOf(font) {
    return String((font && font.family) || '').replace(/^wenfeng-/, '');
  }

  /* 与首页 hero 同一规则：用这款里最重的字重 */
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

  function foundries(list) {
    const map = {};
    list.forEach(function (f) {
      const name = WFChrome.brandName(f);
      if (!name) return;
      if (!map[name]) map[name] = { font: f, n: 0 };
      map[name].n += 1;
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.n - a.n; });
  }

  WFProto.loadCatalog().then(function (list) {
    const featured = pickFeatured(list, 6);
    const live = document.getElementById('live');
    const liveName = document.getElementById('liveName');
    const liveFamily = document.getElementById('liveFamily');
    const code = document.getElementById('ctaCode');
    let idx = 0;
    let faceGen = 0;

    function liveGlyph() {
      return (live.textContent || '').replace(/\s+/g, '');
    }

    function settleFace(font, weight) {
      const gen = ++faceGen;
      const timer = setTimeout(function () {
        if (gen === faceGen) live.classList.add('is-pending');
      }, 80);
      const done = function () {
        if (gen !== faceGen) return;
        clearTimeout(timer);
        clearTimeout(cap);
        live.classList.remove('is-pending');
      };
      const cap = setTimeout(done, 1200);
      const glyph = liveGlyph();
      WFProto.ensureFontCss(font.family, weight, 'preview-shop', glyph);
      WFProto.readyFace(font.family, weight, glyph, 'preview-shop').then(done, done);
    }

    function applyLive() {
      const f = featured[idx % featured.length];
      if (!f) return;
      const w = heavyWeight(f);
      const stack = WFProto.cssFamilyStack(f.family);
      const glyph = liveGlyph();
      WFProto.ensureFontCss(f.family, w, 'preview-shop', glyph);
      live.style.fontFamily = stack;
      live.style.fontWeight = w;
      liveName.textContent = f.name;
      liveName.href = WFProto.detailHref(f);
      if (liveFamily) liveFamily.textContent = famOf(f) + ' · ' + w;
      code.textContent = '<link rel="stylesheet" href="' + WFProto.cssApiUrl(f.family, w, 'full') + '">';
      settleFace(f, w);
    }
    applyLive();
    document.addEventListener('wf:cdn', applyLive);
    document.getElementById('liveNext').addEventListener('click', function () { idx += 1; applyLive(); });
    live.addEventListener('input', function () {
      const f = featured[idx % featured.length];
      if (!f) return;
      WFProto.ensureFontCss(f.family, heavyWeight(f), 'preview-shop', liveGlyph());
    });
    document.getElementById('ctaCopy').addEventListener('click', function () {
      WFChrome.copy(WFProto.CDN_LICENSE_NOTE + '\n' + code.textContent, '已复制 <link>');
    });

    WFSpecimen.renderRows(document.getElementById('homeRows'), featured, { size: 40 });
    document.getElementById('homeFoundries').innerHTML = foundries(list).slice(0, 8).map(function (b) {
      return WFChrome.foundryHtml(b.font, { sub: '在库 ' + b.n + ' 款', cls: 'panel' });
    }).join('');
  });
})();
