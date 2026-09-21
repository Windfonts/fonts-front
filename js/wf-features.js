/* OpenType 特性 + 变体轴（开发模式「字体预览」区）。
   开关直接作用在目标元素上，并输出可复制的 font-feature-settings / font-variation-settings。 */
(function () {
  const esc = function (s) { return WFProto.escapeHtml(s); };
  const SS = 'ss01,ss02,ss03,ss04,ss05,ss06,ss07,ss08'.split(',').map(function (t) { return [t, t]; });
  const FEATS = [
    { g: '默认开', items: [['kern', '字距'], ['liga', '连字'], ['calt', '上下文']] },
    { g: '形态', items: [['smcp', '小型大写'], ['c2sc', '大写小型'], ['case', '大小写形'], ['swsh', '花饰'], ['salt', '替代'], ['dlig', '可选连字']] },
    { g: '数字', items: [['lnum', '对齐数字'], ['onum', '老式数字'], ['tnum', '等宽数字'], ['pnum', '比例数字'], ['zero', '斜杠零'], ['frac', '分数']] },
    { g: '位置', items: [['sups', '上标'], ['subs', '下标']] },
    { g: '风格集', items: SS }
  ];
  const FEAT_DEFAULT = { kern: 1, liga: 1, calt: 1 };
  const AXES = [
    { tag: 'wght', name: '字重轴', min: 100, max: 900, step: 1, def: 400 },
    { tag: 'wdth', name: '宽度', min: 75, max: 125, step: 1, def: 100 },
    { tag: 'slnt', name: '倾斜', min: -12, max: 0, step: 0.5, def: 0 },
    { tag: 'opsz', name: '视觉字号', min: 8, max: 144, step: 1, def: 64 }
  ];

  function fold(title, hint, body) {
    return '<details class="tester-fold"><summary>' + WFChrome.icon('chevron-down') +
      esc(title) + '<span class="hint">' + esc(hint) + '</span></summary><div class="tester-fold-body">' + body + '</div></details>';
  }
  function featHtml(state) {
    return FEATS.map(function (g) {
      return '<div class="tester-block"><h3>' + esc(g.g) + '</h3><div class="tester-feats">' + g.items.map(function (it) {
        return '<button type="button" data-feat="' + it[0] + '"' + (state.feats[it[0]] ? ' class="is-on"' : '') + '>' + esc(it[1]) + '</button>';
      }).join('') + '</div></div>';
    }).join('');
  }
  function axisHtml(state) {
    return '<div class="tester-block"><div class="tester-axes">' + AXES.map(function (a) {
      return '<label class="tester-row"><span class="check"><input type="checkbox" data-axis-on="' + a.tag + '"' +
        (state.axisOn[a.tag] ? ' checked' : '') + ' />' + esc(a.name) + '</span>' +
        '<input class="range" type="range" data-axis="' + a.tag + '" min="' + a.min + '" max="' + a.max +
        '" step="' + a.step + '" value="' + state.axes[a.tag] + '" />' +
        '<span class="val" data-axis-val="' + a.tag + '"></span></label>';
    }).join('') + '</div><p class="hint">仅可变字体生效。静态字重用上面的字重按钮。</p></div>';
  }

  function featCss(state) {
    // 只输出与浏览器默认不同的：默认开的被关掉、默认关的被打开
    return Object.keys(state.feats).filter(function (t) {
      return !!state.feats[t] !== !!FEAT_DEFAULT[t];
    }).map(function (t) { return '"' + t + '" ' + (state.feats[t] ? 1 : 0); }).join(', ');
  }
  function axisCss(state) {
    return AXES.filter(function (a) { return state.axisOn[a.tag]; })
      .map(function (a) { return '"' + a.tag + '" ' + state.axes[a.tag]; }).join(', ');
  }
  function cssText(state) {
    const lines = [];
    const f = featCss(state), a = axisCss(state);
    if (f) lines.push('  font-feature-settings: ' + f + ';');
    if (a) lines.push('  font-variation-settings: ' + a + ';');
    if (state.axisOn.opsz) lines.push('  font-optical-sizing: none;');
    if (!lines.length) return '/* 默认特性，无需额外声明 */';
    return '.your-text {\n' + lines.join('\n') + '\n}';
  }

  function mount(host, opts) {
    opts = opts || {};
    const targets = function () { return typeof opts.targets === 'function' ? opts.targets() : (opts.targets || []); };
    const state = { feats: Object.assign({}, FEAT_DEFAULT), axes: {}, axisOn: {} };
    AXES.forEach(function (a) { state.axes[a.tag] = a.def; state.axisOn[a.tag] = 0; });

    host.innerHTML =
      fold('OpenType 特性', '连字 · 数字 · 风格集', featHtml(state)) +
      fold('变体轴', '字重 · 宽度 · 倾斜 · 视觉字号', axisHtml(state)) +
      '<div class="code feat-css" hidden><pre data-css></pre>' +
        '<button type="button" class="copy" data-copy>' + WFChrome.icon('copy') + '复制</button></div>';
    const codeEl = host.querySelector('.feat-css');
    const preEl = host.querySelector('[data-css]');

    function apply() {
      const f = Object.keys(state.feats).map(function (t) { return '"' + t + '" ' + (state.feats[t] ? 1 : 0); }).join(', ');
      const a = axisCss(state);
      targets().forEach(function (el) {
        if (!el) return;
        el.style.fontFeatureSettings = f;
        el.style.fontVariationSettings = a || '';
        el.style.fontOpticalSizing = state.axisOn.opsz ? 'none' : '';
      });
      AXES.forEach(function (x) {
        const n = host.querySelector('[data-axis-val="' + x.tag + '"]');
        if (n) n.textContent = String(state.axes[x.tag]);
      });
      const css = cssText(state);
      preEl.textContent = css;
      codeEl.hidden = css.charAt(0) === '/';
    }

    host.addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (!b) return;
      const feat = b.getAttribute('data-feat');
      if (feat) {
        state.feats[feat] = state.feats[feat] ? 0 : 1;
        b.classList.toggle('is-on', !!state.feats[feat]);
        apply();
        return;
      }
      if (b.hasAttribute('data-copy')) {
        WFChrome.copy(preEl.textContent, '已复制 CSS');
      }
    });
    host.addEventListener('input', function (e) {
      const ax = e.target.getAttribute('data-axis');
      if (!ax) return;
      state.axes[ax] = Number(e.target.value);
      state.axisOn[ax] = 1;
      const cb = host.querySelector('[data-axis-on="' + ax + '"]');
      if (cb) cb.checked = true;
      apply();
    });
    host.addEventListener('change', function (e) {
      const on = e.target.getAttribute('data-axis-on');
      if (on) { state.axisOn[on] = e.target.checked ? 1 : 0; apply(); }
    });
    host.addEventListener('toggle', function (e) {
      const d = e.target;
      if (!d.classList || !d.classList.contains('tester-fold') || !d.open) return;
      host.querySelectorAll('.tester-fold').forEach(function (x) { if (x !== d) x.removeAttribute('open'); });
    }, true);

    apply();
    return { apply: apply };
  }

  window.WFFeatures = { mount: mount, FEATS: FEATS, AXES: AXES };
})();
