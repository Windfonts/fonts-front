/* 特点页：活样张轮换 + 一行接入代码 + 精选样张 + 厂商条 */
(function () {
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
    const code = document.getElementById('ctaCode');
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
      code.textContent = '<link rel="stylesheet" href="' + WFProto.embedCssUrl(f.family, w) + '">';
    }
    applyLive();
    document.addEventListener('wf:cdn', applyLive);
    document.getElementById('liveNext').addEventListener('click', function () { idx += 1; applyLive(); });
    document.getElementById('ctaCopy').addEventListener('click', function () {
      WFChrome.copy(code.textContent, '已复制 <link>');
    });

    WFSpecimen.renderRows(document.getElementById('homeRows'), featured, { size: 40 });
    document.getElementById('homeFoundries').innerHTML = foundries(list).slice(0, 8).map(function (b) {
      return WFChrome.foundryHtml(b.font, { sub: '在库 ' + b.n + ' 款', cls: 'panel' });
    }).join('');
  });
})();
