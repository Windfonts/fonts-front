/* 选字袋：样张行 + 标题/正文配对 + 并排对比 + 合并嵌入代码 */
(function () {
  const list = document.getElementById('bagList');
  const compareEl = document.getElementById('bagCompare');
  const pairEl = document.getElementById('bagPair');
  const countEl = document.getElementById('bagCount');
  const embedWrap = document.getElementById('bagEmbed');
  const bytesEl = document.getElementById('bagBytesExtra');
  const optVersion = document.getElementById('optVersion');
  const optWeights = document.getElementById('optWeights');
  const optDisplay = document.getElementById('optDisplay');
  const optPreload = document.getElementById('optPreload');
  const optMergeFamily = document.getElementById('optMergeFamily');
  const views = document.getElementById('bagViews');
  const PAIR_KEY = 'wf-bag-pair.v1';
  let embed = null;
  let view = 'rows';
  let lastFonts = [];
  let pairTitle = '';
  let pairBody = '';

  WFSpecimen.controlBar(document.getElementById('controlbar'), {});

  function studioHref(id) {
    return WFChrome.href(WFProto.detailHref(WFProto.getFont(id) || { id: id }, { from: 'bag' }));
  }

  function bindStudioLinks(root) {
    if (!root) return;
    root.querySelectorAll('a[href*="font-detail.html"]').forEach(function (a) {
      const m = String(a.getAttribute('href') || '').match(/[?&]id=([^&]+)/);
      if (m) a.setAttribute('href', studioHref(decodeURIComponent(m[1])));
    });
  }

  function items() {
    const raw = WFProto.getPicks().map(function (p) {
      const f = WFProto.getFont(p.id) || p;
      const ws = optWeights.value === 'all'
        ? WFSpecimen.sortedWeights(f).map(function (w) { return WFProto.weightToCss(w); })
        : [WFSpecimen.firstWeight(f)];
      return { family: f.family, weights: ws, version: optVersion.value, font: f };
    }).filter(function (it) { return it.family; });
    if (optMergeFamily && optMergeFamily.checked && raw.length > 1) {
      /* 一份 /api/css?family=a|b&weight=…；字重取第一款（或常规档） */
      const fams = raw.map(function (it) { return it.family; }).filter(Boolean);
      const ws = raw[0].weights && raw[0].weights.length ? raw[0].weights : ['400'];
      return [{
        family: fams.join('|'),
        weights: ws,
        version: optVersion.value,
        font: raw[0].font
      }];
    }
    return raw;
  }

  function paintEmbed() {
    const its = items();
    if (!its.length) { embedWrap.hidden = true; return; }
    embedWrap.hidden = false;
    const opts = { cdn: true, display: optDisplay.value, preload: optPreload.checked };
    if (!embed) embed = WFEmbed.mount(document.getElementById('embed'), its, opts);
    else { embed.setItems(its); embed.setOpts(opts); }
    let total = 0;
    its.forEach(function (it) { total += WFEmbed.versionSize(it.font, it.version) * it.weights.length; });
    if (bytesEl) {
      const bits = [];
      if (optMergeFamily && optMergeFamily.checked && WFProto.getPicks().length > 1) bits.push('已合并 family=…|…');
      bits.push('按所选子集');
      bytesEl.textContent = bits.length ? ' · ' + bits.join(' · ') : '';
    }
  }

  function paintCompare(fonts) {
    const esc = WFProto.escapeHtml;
    const sample = WFProto.getSample();
    const size = WFProto.getSize();
    compareEl.innerHTML =
      '<div class="compare-cols">' + fonts.map(function (f) {
        const w = WFSpecimen.firstWeight(f);
        const stack = WFProto.cssFamilyStack(f.family);
        WFProto.ensureFontCss(f.family, w, 'zh');
        return '<article class="compare-col">' +
          '<a class="name" href="' + studioHref(f.id) + '">' + esc(f.name) + '</a>' +
          '<p class="meta">' + WFChrome.faceHtml(f, 16) + esc(WFChrome.brandName(f) || '未署名') + ' · ' + (f.weights || []).length + ' 字重 · ' +
            '<span class="lic-chip" data-tier="' + esc(WFChrome.licenseTier(f)) + '">' + esc(WFChrome.licenseTier(f)) + '</span>' +
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
          '<td><span class="lic-chip" data-tier="' + esc(WFChrome.licenseTier(f)) + '">' + esc(WFChrome.licenseTier(f)) + '</span>' + (ev.spdx ? ' · ' + esc(ev.spdx) : '') + '</td>' +
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
    WFProto.ensureFontCss(title.family, tw, 'zh');
    WFProto.ensureFontCss(body.family, bw, 'zh');
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
    to.href = WFChrome.href(u ? 'app/subset.html?from=bag' : 'login.html?next=bag');
    to.hidden = !picks.length;
    document.getElementById('btnClear').hidden = !picks.length;
    if (picks.length < 2) view = 'rows';
    views.hidden = picks.length < 2;
    views.querySelectorAll('[data-view]').forEach(function (x) { x.classList.toggle('is-on', x.getAttribute('data-view') === view); });
    if (!picks.length) {
      view = 'rows';
      views.querySelectorAll('[data-view]').forEach(function (x) { x.classList.toggle('is-on', x.getAttribute('data-view') === 'rows'); });
      showPane('rows');
      list.innerHTML = '<li class="page-state-item" role="status"><div class="page-state">' +
        '<p class="page-state-kicker">选字袋</p>' +
        '<p>选字袋是空的</p>' +
        '<div class="page-state-act"><a class="btn" href="' + WFChrome.href('fonts.html') + '">去字体库挑几款</a></div>' +
        '</div></li>';
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
      WFSpecimen.renderRows(list, fonts, window.WFProducts ? {
        foot: function (f) { return WFProducts.footHtml(f); }
      } : null);
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

  function localToCsv(header, rows) {
    const q = function (v) {
      const s = String(v == null ? '' : v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return '\ufeff' + [header].concat(rows).map(function (r) { return r.map(q).join(','); }).join('\n');
  }
  function localDownload(name, text, type) {
    const blob = new Blob([text], { type: type || 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  function exportBagCsv() {
    const picks = WFProto.getPicks();
    if (!picks.length) { WFChrome.toast('选字袋是空的'); return; }
    const header = ['名称', 'family', 'id', '厂商', '分类', '字重', '许可'];
    const rows = picks.map(function (p) {
      const f = WFProto.getFont(p.id) || p;
      const brand = (window.WFChrome && WFChrome.brandName)
        ? (WFChrome.brandName(f) || '')
        : ((f.foundryInfo && f.foundryInfo.name) || f.foundry || '');
      const lic = (window.WFChrome && WFChrome.licenseTier)
        ? WFChrome.licenseTier(f)
        : (f.license || '');
      const weights = Array.isArray(f.weights) ? f.weights.join(' / ') : '';
      return [
        f.name || p.name || '',
        f.family || p.family || '',
        f.id || p.id || '',
        brand,
        f.category || p.category || '',
        weights,
        lic
      ];
    });
    const csv = (window.WFApp && WFApp.toCsv) ? WFApp.toCsv(header, rows) : localToCsv(header, rows);
    const name = '文风字体-选字袋.csv';
    if (window.WFApp && WFApp.download) WFApp.download(name, csv);
    else localDownload(name, csv);
    WFChrome.toast('已导出 CSV · ' + picks.length + ' 款');
  }

  const btnExport = document.getElementById('btnExport');
  if (btnExport) {
    btnExport.addEventListener('click', function () {
      const picks = WFProto.getPicks().map(function (p) {
        const f = WFProto.getFont(p.id) || p;
        return {
          id: p.id,
          name: p.name || f.name || '',
          family: p.family || f.family || '',
          foundry: (window.WFChrome && WFChrome.brandName) ? (WFChrome.brandName(f) || '') : '',
          category: f.category || '',
          weights: f.weights || [],
          license: (window.WFChrome && WFChrome.licenseTier) ? WFChrome.licenseTier(f) : ''
        };
      });
      if (!picks.length) { WFChrome.toast('选字袋是空的'); return; }
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), picks: picks }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '文风字体-选字袋.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      WFChrome.toast('已导出 JSON · ' + picks.length + ' 款');
    });
  }
  const btnExportCsv = document.getElementById('btnExportCsv');
  if (btnExportCsv) btnExportCsv.addEventListener('click', exportBagCsv);
  [optVersion, optWeights, optDisplay].forEach(function (s) { s.addEventListener('change', paintEmbed); });
  if (optMergeFamily) optMergeFamily.addEventListener('change', paintEmbed);
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

  WFProto.loadCatalog().then(function () {
    render();
    if (window.WFApp && WFApp.load) {
      WFApp.load().then(function () {
        if (WFProto.syncPicksWithVault) {
          return WFProto.syncPicksWithVault().then(function () { render(); });
        }
      }).catch(function () { /* ignore */ });
    }
  });
})();
