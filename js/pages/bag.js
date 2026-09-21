/* 选字袋：样张行 + 并排对比 + 合并嵌入代码 */
(function () {
  const list = document.getElementById('bagList');
  const compareEl = document.getElementById('bagCompare');
  const countEl = document.getElementById('bagCount');
  const embedWrap = document.getElementById('bagEmbed');
  const bytesEl = document.getElementById('bagBytes');
  const optVersion = document.getElementById('optVersion');
  const optWeights = document.getElementById('optWeights');
  const optDisplay = document.getElementById('optDisplay');
  const optPreload = document.getElementById('optPreload');
  const views = document.getElementById('bagViews');
  let embed = null;
  let view = 'rows';

  WFSpecimen.controlBar(document.getElementById('controlbar'), {});

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
          '<a class="name" href="font-detail.html?id=' + encodeURIComponent(f.id) + '">' + esc(f.name) + '</a>' +
          '<p class="meta">' + esc(WFChrome.brandName(f) || '未署名') + ' · ' + (f.weights || []).length + ' 字重 · ' +
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
        return '<tr><td><a href="font-detail.html?id=' + encodeURIComponent(f.id) + '">' + esc(f.name) + '</a></td>' +
          '<td>' + esc(WFChrome.brandName(f) || '—') + '</td>' +
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
      list.hidden = false;
      compareEl.hidden = true;
      list.innerHTML = '<li class="empty">选字袋是空的。<a href="fonts.html">去字体库挑几款</a></li>';
      paintEmbed();
      return;
    }
    const fonts = picks.map(function (p) { return WFProto.getFont(p.id) || p; });
    if (view === 'compare') {
      list.hidden = true;
      compareEl.hidden = false;
      paintCompare(fonts);
    } else {
      list.hidden = false;
      compareEl.hidden = true;
      WFSpecimen.renderRows(list, fonts);
      list.querySelectorAll('.act[data-join]').forEach(function (b) {
        b.innerHTML = WFChrome.icon('close') + '移除';
        b.classList.remove('is-picked');
      });
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

  WFProto.loadCatalog().then(render);
})();
