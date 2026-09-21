/* 选字袋：样张行 + 标题/正文配对 + 并排对比 + 合并嵌入代码 */
(function () {
  const list = document.getElementById('bagList');
  const compareEl = document.getElementById('bagCompare');
  const pairEl = document.getElementById('bagPair');
  const countEl = document.getElementById('bagCount');
  const embedWrap = document.getElementById('bagEmbed');
  const bytesEl = document.getElementById('bagBytes');
  const optVersion = document.getElementById('optVersion');
  const optWeights = document.getElementById('optWeights');
  const optDisplay = document.getElementById('optDisplay');
  const optPreload = document.getElementById('optPreload');
  const views = document.getElementById('bagViews');
  const PAIR_KEY = 'wf-bag-pair.v1';
  let embed = null;
  let view = 'rows';
  let lastFonts = [];
  let pairTitle = '';
  let pairBody = '';

  WFSpecimen.controlBar(document.getElementById('controlbar'), {});

  function studioHref(id) {
    return WFChrome.href('font-detail.html?id=' + encodeURIComponent(id) + '&from=bag');
  }

  function bindStudioLinks(root) {
    if (!root) return;
    root.querySelectorAll('a[href*="font-detail.html"]').forEach(function (a) {
      const m = String(a.getAttribute('href') || '').match(/[?&]id=([^&]+)/);
      if (m) a.setAttribute('href', studioHref(decodeURIComponent(m[1])));
    });
  }

  function items() {
    return WFProto.getPicks().map(function (p) {
      const f = WFProto.getFont(p.id) || p;
      const ws = optWeights.value === 'all'
        ? WFSpecimen.sortedWeights(f).map(function (w) { return WFProto.weightToCss(w); })
        : [WFSpecimen.firstWeight(f)];
      return { family: f.family, weights: ws, version: optVersion.value, font: f };
    }).filter(function (it) { return it.family; });
  }

  function paintEmbed() {
    const its = items();
    if (!its.length) { embedWrap.hidden = true; return; }
    embedWrap.hidden = false;
    const opts = { display: optDisplay.value, preload: optPreload.checked };
    if (!embed) embed = WFEmbed.mount(document.getElementById('embed'), its, opts);
    else { embed.setItems(its); embed.setOpts(opts); }
    let total = 0;
    its.forEach(function (it) { total += WFEmbed.versionSize(it.font, it.version) * it.weights.length; });
    bytesEl.textContent = '≈ ' + WFEmbed.fmtBytes(total);
  }

  function paintCompare(fonts) {
    const esc = WFProto.escapeHtml;
    const sample = WFProto.getSample();
    const size = WFProto.getSize();
    compareEl.innerHTML =
      '<div class="compare-cols">' + fonts.map(function (f) {
        const w = WFSpecimen.firstWeight(f);
        const stack = WFProto.cssFamilyStack(f.family);
        WFProto.ensureFontCss(f.family, w);
        return '<article class="compare-col">' +
          '<a class="name" href="' + studioHref(f.id) + '">' + esc(f.name) + '</a>' +
          '<p class="meta">' + WFChrome.faceHtml(f, 16) + esc(WFChrome.brandName(f) || '未署名') + ' · ' + (f.weights || []).length + ' 字重 · ' +
            esc(WFChrome.licenseTier(f)) +
            ' · ' + esc(WFChrome.sourceKindLabel(WFChrome.licenseEvidence(f).sourceKind)) + '</p>' +
          '<p class="preview" data-specimen style="font-family:' + esc(stack) + ';font-weight:' + w + ';font-size:' + size + 'px">' + esc(sample) + '</p>' +
          '<button type="button" class="act" data-join="' + esc(f.id) + '" data-name="' + esc(f.name) + '">' + WFChrome.icon('close') + '移除</button></article>';
      }).join('') + '</div>' +
      '<div class="compare-table-wrap"><table class="table"><thead><tr><th>字体</th><th>品牌方</th><th>制作</th><th>字重</th>' +
        '<th>字符</th><th>授权</th><th>出处</th><th>常用 3500</th></tr></thead><tbody>' +
      fonts.map(function (f) {
        const ev = WFChrome.licenseEvidence(f);
        const maker = WFChrome.makerInfo(f);
        return '<tr><td><a href="' + studioHref(f.id) + '">' + esc(f.name) + '</a></td>' +
          '<td>' + WFChrome.faceHtml(f, 16) + esc(WFChrome.brandName(f) || '—') + '</td>' +
          '<td>' + esc(maker ? maker.name : '—') + '</td>' +
          '<td class="num">' + (f.weights || []).length + '</td>' +
          '<td class="num">' + (f.charCount ? WFProto.formatCount(f.charCount) : '—') + '</td>' +
          '<td>' + esc(WFChrome.licenseTier(f)) + (ev.spdx ? ' · ' + esc(ev.spdx) : '') + '</td>' +
          '<td>' + esc(WFChrome.sourceKindLabel(ev.sourceKind)) + '</td>' +
          '<td class="num">' + WFEmbed.fmtBytes(WFEmbed.versionSize(f, 'zh')) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    compareEl.querySelectorAll('[data-join]').forEach(function (b) {
      b.addEventListener('click', function () {
        WFProto.togglePick(b.getAttribute('data-join'), b.getAttribute('data-name'));
        WFChrome.toast('已从选字袋移除');
      });
    });
  }

  function fontById(fonts, id) {
    return fonts.filter(function (f) { return f.id === id; })[0] || fonts[0];
  }

  function loadPair(fonts) {
    let rec = {};
    try { rec = JSON.parse(localStorage.getItem(PAIR_KEY) || '{}') || {}; } catch (e) { rec = {}; }
    const ids = fonts.map(function (f) { return f.id; });
    pairTitle = ids.indexOf(rec.title) >= 0 ? rec.title : ids[0];
    pairBody = ids.indexOf(rec.body) >= 0 && rec.body !== pairTitle ? rec.body : (ids[1] || ids[0]);
  }

  function savePair() {
    try { localStorage.setItem(PAIR_KEY, JSON.stringify({ title: pairTitle, body: pairBody })); } catch (e) { /* ignore */ }
  }

  function pairOpts(fonts, cur) {
    const esc = WFProto.escapeHtml;
    return fonts.map(function (f) {
      return '<option value="' + esc(f.id) + '"' + (f.id === cur ? ' selected' : '') + '>' + esc(f.name) + '</option>';
    }).join('');
  }

  function paintPair(fonts) {
    if (!pairEl) return;
    loadPair(fonts);
    const esc = WFProto.escapeHtml;
    const sampleEl = document.getElementById('specimenText');
    const sample = (sampleEl && sampleEl.value) || WFProto.getSample();
    const title = fontById(fonts, pairTitle);
    const body = fontById(fonts, pairBody);
    const tw = WFSpecimen.firstWeight(title);
    const bw = WFSpecimen.firstWeight(body);
    WFProto.ensureFontCss(title.family, tw);
    WFProto.ensureFontCss(body.family, bw);
    pairEl.innerHTML =
      '<article class="pair-stage">' +
        '<div class="pair-picks">' +
          '<div class="pair-pick"><span class="k">标题</span><select class="select" id="pairTitleSel" aria-label="标题字体">' + pairOpts(fonts, title.id) + '</select></div>' +
          '<button type="button" class="btn-text" id="pairSwap">' + WFChrome.icon('refresh') + '对调</button>' +
          '<div class="pair-pick"><span class="k">正文</span><select class="select" id="pairBodySel" aria-label="正文字体">' + pairOpts(fonts, body.id) + '</select></div>' +
        '</div>' +
        '<p class="pair-title" style="font-family:' + esc(WFProto.cssFamilyStack(title.family)) + ';font-weight:' + tw + '">' + esc(sample) + '</p>' +
        '<p class="pair-body" style="font-family:' + esc(WFProto.cssFamilyStack(body.family)) + ';font-weight:' + bw + '">' + esc(sample) + '</p>' +
        '<div class="pair-acts">' +
          '<a href="' + studioHref(title.id) + '">' + WFChrome.icon('edit') + '编辑标题样张</a>' +
          '<a href="' + studioHref(body.id) + '">' + WFChrome.icon('edit') + '编辑正文样张</a>' +
        '</div>' +
      '</article>';
    document.getElementById('pairTitleSel').addEventListener('change', function () {
      pairTitle = this.value;
      if (pairTitle === pairBody) {
        const other = fonts.filter(function (f) { return f.id !== pairTitle; })[0];
        if (other) pairBody = other.id;
      }
      savePair();
      paintPair(fonts);
    });
    document.getElementById('pairBodySel').addEventListener('change', function () {
      pairBody = this.value;
      savePair();
      paintPair(fonts);
    });
    document.getElementById('pairSwap').addEventListener('click', function () {
      const a = pairTitle;
      pairTitle = pairBody;
      pairBody = a;
      savePair();
      paintPair(fonts);
    });
  }

  function showPane(name) {
    list.hidden = name !== 'rows';
    if (compareEl) compareEl.hidden = name !== 'compare';
    if (pairEl) pairEl.hidden = name !== 'pair';
  }

  function render() {
    const picks = WFProto.getPicks();
    countEl.textContent = String(picks.length);
    const u = WFChrome.user();
    const to = document.getElementById('btnToProject');
    to.href = u ? 'app/subset.html?from=bag' : 'login.html?next=bag';
    to.hidden = !picks.length;
    document.getElementById('btnClear').hidden = !picks.length;
    if (picks.length < 2) view = 'rows';
    views.hidden = picks.length < 2;
    views.querySelectorAll('[data-view]').forEach(function (x) { x.classList.toggle('is-on', x.getAttribute('data-view') === view); });
    if (!picks.length) {
      view = 'rows';
      views.querySelectorAll('[data-view]').forEach(function (x) { x.classList.toggle('is-on', x.getAttribute('data-view') === 'rows'); });
      showPane('rows');
      list.innerHTML = '<li class="empty">选字袋是空的。<a href="fonts.html">去字体库挑几款</a></li>';
      lastFonts = [];
      paintEmbed();
      return;
    }
    const fonts = picks.map(function (p) { return WFProto.getFont(p.id) || p; });
    lastFonts = fonts;
    showPane(view);
    if (view === 'compare') paintCompare(fonts);
    else if (view === 'pair') paintPair(fonts);
    else {
      WFSpecimen.renderRows(list, fonts);
      list.querySelectorAll('.act[data-join]').forEach(function (b) {
        b.innerHTML = WFChrome.icon('close') + '移除';
        b.classList.remove('is-picked');
      });
      bindStudioLinks(list);
    }
    paintEmbed();
  }

  views.querySelectorAll('[data-view]').forEach(function (b) {
    b.addEventListener('click', function () {
      view = b.getAttribute('data-view');
      views.querySelectorAll('[data-view]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      render();
    });
  });
  document.getElementById('btnClear').addEventListener('click', function () {
    WFChrome.confirm({ title: '清空选字袋', message: '会移除袋里全部字体。嵌入代码区会一起清空，不影响已加入项目的字体。', ok: '清空' }).then(function (ok) {
      if (!ok) return;
      WFProto.clearPicks();
      WFChrome.toast('已清空选字袋');
    });
  });
  [optVersion, optWeights, optDisplay].forEach(function (s) { s.addEventListener('change', paintEmbed); });
  optPreload.addEventListener('change', paintEmbed);
  document.addEventListener('wf:picks', render);

  const bar = document.getElementById('controlbar');
  const sampleEl = document.getElementById('specimenText');
  if (sampleEl) {
    sampleEl.addEventListener('input', function () {
      if (view === 'pair' && lastFonts.length >= 2) paintPair(lastFonts);
    });
  }
  if (bar) {
    bar.addEventListener('click', function (e) {
      if (e.target.closest('[data-preset]') && view === 'pair' && lastFonts.length >= 2) {
        setTimeout(function () { paintPair(lastFonts); }, 0);
      }
    });
  }

  WFProto.loadCatalog().then(render);
})();
