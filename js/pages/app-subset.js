/* 控制台 · 子集化工作台：按文字 / 常用字 / Unicode，实时预览 + 体积估算 */
(function () {
  if (!WFApp.gate()) return;
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('root');
  const FORMAT_FACTOR = { woff2: 1, woff: 1.35, ttf: 2.2 };
  const UNI_PRESETS = [
    ['CJK 统一汉字', 'U+4E00-9FFF'], ['常用标点', 'U+3000-303F, U+FF00-FFEF'], ['基本拉丁', 'U+0020-007E'], ['数字与货币', 'U+0030-0039, U+00A5, U+20AC, U+FFE5']
  ];

  let font = null;
  let project = null;
  /** @type {any[]} */
  let projectList = [];
  let queue = [];
  let st = { mode: 'text', text: '', preset: '3500', ranges: 'U+4E00-9FFF', weights: [], formats: ['woff2'] };

  function pickable() {
    const cat = WFProto.getCatalogList();
    const ups = ((WFApp.state() && WFApp.state().uploads) || []).map(function (u) { return WFApp.fontMeta(u.id); }).filter(Boolean);
    return cat.concat(ups);
  }
  function fontOptions(list) {
    return list.map(function (f) { return '<option value="' + esc(f.name) + '">'; }).join('');
  }
  function findPick(name) {
    return pickable().filter(function (f) { return f.name === name; })[0] || null;
  }

  function loadExisting() {
    const ex = project && font && project.fonts.filter(function (f) { return f.fontId === font.id; })[0];
    if (ex) {
      st.weights = ex.weights.slice();
      st.mode = ex.subset.mode || 'text';
      st.text = ex.subset.text || '';
      st.preset = ex.subset.preset || '3500';
      st.ranges = ex.subset.ranges || st.ranges;
    } else {
      st.weights = [WFSpecimen.firstWeight(font)];
    }
  }

  function subset() {
    if (st.mode === 'text') return { mode: 'text', text: st.text };
    if (st.mode === 'common') return { mode: 'common', preset: st.preset };
    return { mode: 'unicode', ranges: st.ranges };
  }

  function render() {
    const list = pickable();
    const projects = projectList;
    const ws = WFSpecimen.sortedWeights(font);
    const sample = st.mode === 'text' && st.text.trim() ? st.text : WFProto.getSample();

    root.innerHTML =
      '<div class="app-head"><div><h1>子集化</h1><p class="sub">只打包页面会出现的字，再把结果加入项目。体积为 woff2 单字重估算。</p></div></div>' +
      '<div class="subset"><div>' +
        '<div class="grid" style="grid-template-columns:1fr 1fr;margin-bottom:var(--s-6)">' +
          '<div class="field"><label for="fontPick">字体</label><input class="input" id="fontPick" list="fontList" value="' + esc(font.name) + '" /><datalist id="fontList">' + fontOptions(list) + '</datalist>' +
            (queue.length > 1 ? '<div class="chips" style="margin-top:var(--s-2)">' + queue.map(function (q) {
              return '<button type="button" class="chip' + (q.id === font.id ? ' is-on' : '') + '" data-queue="' + esc(q.id) + '">' + esc(q.name) + '</button>';
            }).join('') + '</div>' : '') + '</div>' +
          '<div class="field"><label for="projPick">加入项目</label><select class="select" id="projPick">' + projects.map(function (p) {
            return '<option value="' + esc(p.id) + '"' + (project && p.id === project.id ? ' selected' : '') + '>' + esc(p.name) + '</option>';
          }).join('') + '<option value="__new">＋ 新建项目…</option></select></div>' +
        '</div>' +
        '<div class="field" style="margin-bottom:var(--s-6)"><label>字重</label><div class="weight-checks">' + ws.map(function (w) {
          const c = WFProto.weightToCss(w);
          return '<label class="check"><input type="checkbox" data-weight="' + c + '"' + (st.weights.indexOf(c) !== -1 ? ' checked' : '') + ' /> ' + esc(w) + ' <span class="num muted">' + c + '</span></label>';
        }).join('') + '</div></div>' +
        '<div class="subset-modes seg" role="tablist">' +
          '<button type="button" data-mode="text"' + (st.mode === 'text' ? ' class="is-on"' : '') + '>按文字</button>' +
          '<button type="button" data-mode="common"' + (st.mode === 'common' ? ' class="is-on"' : '') + '>常用字</button>' +
          '<button type="button" data-mode="unicode"' + (st.mode === 'unicode' ? ' class="is-on"' : '') + '>按编码范围</button>' +
        '</div>' +
        modeHtml() +
        '<div class="subset-preview"><h3>预览 · ' + esc(font.name) + '</h3>' +
          '<div class="line" id="previewLine" style="font-family:' + esc(WFProto.cssFamilyStack(font.family)) + ';font-weight:' + (st.weights[0] || 400) + '">' + esc(sample) + '</div></div>' +
      '</div>' +
      '<aside class="subset-side">' + sideHtml() + '</aside></div>';

    wire();
  }

  function modeHtml() {
    if (st.mode === 'text') {
      return '<div class="field" style="margin-bottom:var(--s-4)"><label for="pageUrl">从页面抽取</label><div class="inline-form"><input class="input" id="pageUrl" type="url" placeholder="https://example.com/page" aria-label="页面地址" /><button type="button" class="btn" id="pullPage">抽取文字</button></div><span class="hint">读得到页面就抽出正文；读不到就改贴文字。</span></div>' +
        '<div><textarea class="textarea" id="subText" placeholder="粘贴页面上会出现的文字：标题、品牌名、导航、固定文案……">' + esc(st.text) + '</textarea>' +
        '<p class="t-13 muted" style="margin-top:var(--s-2)">去重后 <strong class="num" id="charCount">' + WFApp.uniqueChars(st.text) + '</strong> 个字符 · 自动加上数字和常用标点</p>' +
        '<div class="presets-row">' + WFSpecimen.PRESETS.map(function (p) { return '<button type="button" class="chip" data-fill="' + esc(p.text) + '">+ ' + p.label + '</button>'; }).join('') + '</div></div>';
    }
    if (st.mode === 'common') {
      return '<div class="stack-2" style="display:grid;gap:var(--s-2)">' +
        '<label class="check"><input type="radio" name="preset" value="3500"' + (st.preset === '3500' ? ' checked' : '') + ' /> 常用 3500 字（覆盖大部分正文）</label>' +
        '<label class="check"><input type="radio" name="preset" value="7000"' + (st.preset === '7000' ? ' checked' : '') + ' /> 常用 7000 字（适合正文不固定的站点）</label>' +
        '<p class="t-13 muted" style="margin-top:var(--s-3)">正文可变的站点用常用字集；标题与品牌名单独走「按文字」拿到最小体积。</p></div>';
    }
    return '<div><input class="input" id="subRanges" value="' + esc(st.ranges) + '" placeholder="U+4E00-9FFF, U+3000-303F" />' +
      '<p class="t-13 muted" style="margin-top:var(--s-2)">逗号分隔，支持单点与区间 · 约 <strong class="num" id="rangeCount">' + WFProto.formatCount(WFApp.parseRanges(st.ranges)) + '</strong> 个字</p>' +
      '<div class="presets-row">' + UNI_PRESETS.map(function (p) { return '<button type="button" class="chip" data-range="' + esc(p[1]) + '">+ ' + p[0] + '</button>'; }).join('') + '</div></div>';
  }

  function sideHtml() {
    const known = font.glyphCount || font.charCount || 0;
    const full = WFEmbed.estimateBytes(known || 8000);
    const glyphs = WFApp.subsetGlyphs(font, subset());
    const one = WFEmbed.estimateBytes(glyphs);
    const nW = Math.max(1, st.weights.length);
    const factor = st.formats.reduce(function (a, f) { return a + (FORMAT_FACTOR[f] || 1); }, 0);
    const total = Math.round(one * nW * factor);
    const saved = full > 0 ? Math.max(0, Math.round((1 - one / full) * 100)) : 0;
    return '<div class="result"><div class="v">' + WFEmbed.fmtBytes(one).replace(' ', '<small> ') + '</small></div>' +
        '<div class="was">完整 ' + WFEmbed.fmtBytes(full) + ' → 省 ' + saved + '%</div></div>' +
      '<dl class="kv">' +
        '<div><dt>' + WFChrome.icon('text') + '字形</dt><dd class="num">' + WFProto.formatCount(glyphs) + ' / ' + (known > 1 ? WFProto.formatCount(known) : '—') + '</dd></div>' +
        '<div><dt>' + WFChrome.icon('font') + '字重</dt><dd class="num">' + (st.weights.join(' · ') || '—') + '</dd></div>' +
        '<div><dt>' + WFChrome.icon('scissors') + '子集</dt><dd>' + esc(WFApp.subsetLabel(subset())) + '</dd></div>' +
        '<div><dt>' + WFChrome.icon('box') + '全部产物</dt><dd class="num">' + WFEmbed.fmtBytes(total) + '</dd></div>' +
      '</dl>' +
      '<div class="field"><label>格式</label><div class="weight-checks">' + ['woff2', 'woff', 'ttf'].map(function (f) {
        return '<label class="check"><input type="checkbox" data-format="' + f + '"' + (st.formats.indexOf(f) !== -1 ? ' checked' : '') + (f === 'woff2' ? ' disabled' : '') + ' /> ' + f + '</label>';
      }).join('') + '</div></div>' +
      suggestHtml() +
      '<button type="button" class="btn btn-ink btn-lg" id="btnAdd"' + (st.weights.length ? '' : ' disabled') + '>' + WFChrome.icon('plus') + '加入「' + esc(project ? project.name : '项目') + '」</button>' +
      '<p class="t-12 muted">加入后生成新版本，嵌入代码不变。</p>';
  }

  function suggestHtml() {
    const textBytes = WFApp.subsetBytes(font, { mode: 'text', text: st.text }, 1);
    const c3500 = WFApp.subsetBytes(font, { mode: 'common', preset: '3500' }, 1);
    const c7000 = WFApp.subsetBytes(font, { mode: 'common', preset: '7000' }, 1);
    const chars = WFApp.uniqueChars(st.text);
    const advice = !st.text.trim() ? '先贴文字或抽一个页面，再和常用字集体积比。'
      : (chars < 800 ? '这段文字不到 800 字，按文字比常用字集小。' : '文字很多，常用 3500 或 7000 更合适。');
    function row(label, bytes, mode, on) {
      return '<div><span>' + label + '</span><span class="num">' + WFEmbed.fmtBytes(bytes) + '</span>' +
        (on ? '<span class="muted">当前</span>' : '<button type="button" class="btn-text" data-suggest="' + mode + '">改用</button>') + '</div>';
    }
    const onText = st.mode === 'text';
    const on3500 = st.mode === 'common' && st.preset === '3500';
    const on7000 = st.mode === 'common' && st.preset === '7000';
    return '<div class="field"><label>子集对比</label><div class="suggest">' +
      row('按文字' + (chars ? ' ' + chars : ''), textBytes, 'text', onText) +
      row('常用 3500', c3500, '3500', on3500) +
      row('常用 7000', c7000, '7000', on7000) +
      '</div><p class="t-12 muted">' + advice + '</p></div>';
  }

  function wire() {
    document.getElementById('fontPick').addEventListener('change', function (e) {
      const f = findPick(e.target.value);
      if (f) { font = f; loadExisting(); render(); }
    });
    root.querySelectorAll('[data-queue]').forEach(function (b) {
      b.addEventListener('click', function () { font = WFProto.getFont(b.getAttribute('data-queue')); loadExisting(); render(); });
    });
    document.getElementById('projPick').addEventListener('change', function (e) {
      if (e.target.value === '__new') {
        WFChrome.promptInput({ title: '新建项目', label: '项目名称', placeholder: '如 品牌官网', ok: '新建' }).then(function (name) {
          if (!name) { loadExisting(); render(); return; }
          WFApi.createProject(name).then(function (p) {
            project = p;
            projectList = [p].concat(projectList.filter(function (x) { return x.id !== p.id; }));
            loadExisting();
            render();
          }).catch(function (err) {
            WFChrome.toast((err && err.message) || '新建失败');
            loadExisting();
            render();
          });
        });
        return;
      }
      project = projectList.filter(function (p) { return p.id === e.target.value; })[0] || null;
      if (project) {
        WFApi.getProject(project.id).then(function (p) {
          project = p;
          loadExisting();
          render();
        }).catch(function () {
          loadExisting();
          render();
        });
        return;
      }
      loadExisting(); render();
    });
    root.querySelectorAll('[data-weight]').forEach(function (c) {
      c.addEventListener('change', function () {
        const w = c.getAttribute('data-weight');
        st.weights = c.checked ? st.weights.concat([w]) : st.weights.filter(function (x) { return x !== w; });
        st.weights.sort(function (a, b) { return a - b; });
        WFProto.ensureFontCss(font.family, w);
        refreshSide();
        document.getElementById('previewLine').style.fontWeight = st.weights[0] || 400;
      });
    });
    root.querySelectorAll('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () { st.mode = b.getAttribute('data-mode'); render(); });
    });
    const pull = document.getElementById('pullPage');
    if (pull) pull.addEventListener('click', function () {
      const url = (document.getElementById('pageUrl').value || '').trim();
      if (!url) { WFChrome.toast('先填写页面地址'); return; }
      pull.disabled = true;
      fetch(url).then(function (r) {
        if (!r.ok) throw new Error('status');
        return r.text();
      }).then(function (html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        doc.querySelectorAll('script,style,noscript').forEach(function (n) { n.remove(); });
        const text = ((doc.body && doc.body.innerText) || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 8000);
        if (!text) throw new Error('empty');
        st.text = text;
        st.mode = 'text';
        WFChrome.toast('抽到 ' + WFApp.uniqueChars(text) + ' 个字符');
        render();
      }).catch(function () {
        pull.disabled = false;
        WFChrome.toast('这个地址读不到正文，把文字贴到下面');
      });
    });
    const ta = document.getElementById('subText');
    if (ta) ta.addEventListener('input', function () {
      st.text = ta.value;
      document.getElementById('charCount').textContent = WFApp.uniqueChars(st.text);
      document.getElementById('previewLine').textContent = st.text.trim() || WFProto.getSample();
      refreshSide();
    });
    root.querySelectorAll('[data-fill]').forEach(function (b) {
      b.addEventListener('click', function () {
        st.text = (st.text ? st.text + '\n' : '') + b.getAttribute('data-fill');
        render();
      });
    });
    root.querySelectorAll('input[name=preset]').forEach(function (r) {
      r.addEventListener('change', function () { st.preset = r.value; refreshSide(); });
    });
    const ri = document.getElementById('subRanges');
    if (ri) ri.addEventListener('input', function () {
      st.ranges = ri.value;
      document.getElementById('rangeCount').textContent = WFProto.formatCount(WFApp.parseRanges(st.ranges));
      refreshSide();
    });
    root.querySelectorAll('[data-range]').forEach(function (b) {
      b.addEventListener('click', function () {
        st.ranges = (st.ranges.trim() ? st.ranges.trim().replace(/,$/, '') + ', ' : '') + b.getAttribute('data-range');
        render();
      });
    });
    wireSide();
  }

  function refreshSide() {
    root.querySelector('.subset-side').innerHTML = sideHtml();
    wireSide();
  }
  function wireSide() {
    root.querySelectorAll('[data-suggest]').forEach(function (b) {
      b.addEventListener('click', function () {
        const m = b.getAttribute('data-suggest');
        if (m === 'text') st.mode = 'text';
        else { st.mode = 'common'; st.preset = m; }
        render();
      });
    });
    root.querySelectorAll('[data-format]').forEach(function (c) {
      c.addEventListener('change', function () {
        const f = c.getAttribute('data-format');
        st.formats = c.checked ? st.formats.concat([f]) : st.formats.filter(function (x) { return x !== f; });
        refreshSide();
      });
    });
    const add = document.getElementById('btnAdd');
    if (add) add.addEventListener('click', function () {
      if (!project) { WFChrome.toast('先选择项目'); return; }
      if (st.mode === 'text' && !st.text.trim()) { WFChrome.toast('先粘贴要打包的文字'); return; }
      add.disabled = true;
      WFApi.addFontToProject(project.id, font.id, st.weights.slice(), subset()).then(function (p) {
        project = p;
        const ver = (p.versions || []).filter(function (v) { return v.current; })[0] || (p.versions || [])[0];
        WFChrome.toast('已加入 ' + p.name + (ver ? '，生成 v' + ver.v : ''));
        queue = queue.filter(function (q) { return q.id !== font.id; });
        if (queue.length) { font = queue[0]; loadExisting(); render(); }
        else location.href = 'project.html?id=' + encodeURIComponent(project.id) + '&tab=fonts';
      }).catch(function (err) {
        add.disabled = false;
        WFChrome.toast((err && err.message) || '加入失败');
      });
    });
  }

  Promise.all([WFProto.loadCatalog(), WFApp.load(), WFApi.listProjects()]).then(function (r) {
    const list = r[0];
    projectList = r[2] || [];
    const qid = WFProto.getQuery('project');
    project = (qid && projectList.filter(function (p) { return p.id === qid; })[0]) || projectList[0] || null;
    if (WFProto.getQuery('from') === 'bag') {
      queue = WFProto.getPicks().map(function (p) { return WFProto.getFont(p.id); }).filter(Boolean);
    }
    font = WFApp.fontMeta(WFProto.getQuery('upload')) || WFProto.getFont(WFProto.getQuery('font')) || queue[0] || list.filter(function (f) { return (f.glyphCount || f.charCount || 0) > 1; })[0] || list[0];
    if (!font) { root.innerHTML = '<p class="empty">字体目录为空。</p>'; return; }
    const ready = project
      ? WFApi.getProject(project.id).then(function (p) { project = p; }).catch(function () { /* keep list row */ })
      : Promise.resolve();
    ready.then(function () {
      loadExisting();
      WFSpecimen.sortedWeights(font).forEach(function (w) { WFProto.ensureFontCss(font.family, w); });
      render();
    });
  });
})();
