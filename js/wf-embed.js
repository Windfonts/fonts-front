/* 文风字体 v4 · 嵌入代码生成 + 体积估算。依赖 wf-proto.js */
(function () {
  const esc = WFProto.escapeHtml;
  function apiOrigin() { return WFProto.cdnOrigin(); }
  const BYTES_PER_GLYPH = 290; /* woff2 中文字形均值（估算） */
  const OVERHEAD = 2048;

  /* 公开预制四档（与 /api/css?subset= 对齐）；更细的自选字走控制台项目 */
  const VERSIONS = [
    { id: 'zh-common', label: '常用', hint: '常用字 · 品牌短文案首选', glyphs: function (f) { return Math.min(f.glyphCount || 3500, 3500); } },
    { id: 'zh', label: '中文', hint: '中文正文向子集', glyphs: function (f) { return Math.min(f.glyphCount || 7000, 7000); } },
    { id: 'en', label: '西文', hint: '拉丁字母与常用标点', glyphs: function () { return 230; } },
    { id: 'full', label: '完整', hint: '尽量全量字形', glyphs: function (f) { return f.glyphCount || f.charCount || 8000; } }
  ];
  const DEFAULT_VERSION = 'zh-common';

  function estimateBytes(glyphs) { return Math.max(OVERHEAD, Math.round(glyphs * BYTES_PER_GLYPH + OVERHEAD)); }
  function fmtBytes(b) {
    if (b >= 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
    if (b >= 1024) return Math.round(b / 1024) + ' KB';
    return b + ' B';
  }
  function versionSize(font, versionId) {
    const v = VERSIONS.filter(function (x) { return x.id === versionId; })[0] || VERSIONS[0];
    return estimateBytes(v.glyphs(font));
  }

  function fileUrl(it, weight, structure, origin) {
    const version = it.version && it.version !== 'full' ? it.version : 'full';
    const host = origin || WFProto.cdnOrigin();
    if (structure === 'static') {
      /* 静态路径无法做缺口裁切；有 fallback 时仍只出主款，避免误导双链 */
      return WFProto.cssUrl(it.family, weight, version === 'zh-common' ? 'zh' : version, host);
    }
    return WFProto.cssApiUrl(it.family, weight, version, host, {
      fallback: it.fallbackFamily || '',
      fallbackWeight: it.fallbackWeight || '',
      localeFallback: it.localeFallback || ''
    });
  }

  /** items: [{ family, weights: ['400','700'], version }] */
  function urls(items, structure, origin) {
    const out = [];
    items.forEach(function (it) {
      (it.weights || ['400']).forEach(function (w) {
        out.push(fileUrl(it, w, structure, origin));
      });
    });
    return out;
  }

  function withQuery(url, key, value) {
    if (!value) return url;
    return url + (url.indexOf('?') === -1 ? '?' : '&') + encodeURIComponent(key) + '=' + encodeURIComponent(value);
  }

  function weightToken(family, weight) {
    return WFProto.weightName(family, weight);
  }

  /** 公开嵌入锁定 wenfeng-。opts.alias 只给付费 / 授权项目改名前缀。 */
  function familyName(family, opts) {
    opts = opts || {};
    if (opts.alias) return String(opts.alias);
    const raw = String(family || '').split('|')[0].trim();
    if (raw.indexOf('wenfeng-') === 0) return raw;
    if (raw.indexOf('windfonts-') === 0) return 'wenfeng-' + raw.slice(10);
    return raw ? 'wenfeng-' + raw.replace(/^wenfeng-/, '') : '';
  }

  function familyNames(family, opts) {
    return String(family || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean)
      .map(function (tok) { return familyName(tok, opts); }).filter(Boolean);
  }

  /**
   * 补全用字重对齐：按 CSS font-weight 数字精确匹配另一款的字重名。
   * 对不齐则 ok=false（拒用该补全），并带上最近一档供提示。
   */
  function alignWeight(primaryFont, otherFont, weightToken) {
    const want = parseInt(WFProto.weightToCss(weightToken || '400'), 10) || 400;
    const names = (otherFont && otherFont.weights && otherFont.weights.length)
      ? otherFont.weights
      : ['Regular'];
    let best = null;
    let bestDist = Infinity;
    for (let i = 0; i < names.length; i++) {
      const n = names[i];
      const css = parseInt(WFProto.weightToCss(n), 10) || 400;
      const d = Math.abs(css - want);
      if (d < bestDist) {
        bestDist = d;
        best = { name: n, css: css };
      }
    }
    if (!best) {
      return { ok: false, reason: '补全款无可用字重', want: want };
    }
    if (bestDist === 0) {
      return { ok: true, exact: true, weightName: best.name, css: best.css, want: want };
    }
    return {
      ok: false,
      exact: false,
      reason: '补全款无 ' + want + ' 字重（最近 ' + best.css + ' · ' + best.name + '）',
      nearest: best,
      want: want
    };
  }

  function cssStack(family, opts) {
    const names = familyNames(family, opts);
    const lines = [];
    names.forEach(function (wen) {
      lines.push('"' + wen + '"');
      lines.push('"' + wen.replace(/^wenfeng-/, 'windfonts-') + '"');
    });
    lines.push('"PingFang SC"', '"Microsoft YaHei"', 'sans-serif');
    return lines.map(function (line, i) {
      return (i === 0 ? '' : '    ') + line + (i < lines.length - 1 ? ',' : '');
    }).join('\n');
  }

  function code(kind, items, opts) {
    opts = opts || {};
    const structure = opts.structure === 'static' ? 'static' : 'dynamic';
    const list = urls(items, structure, opts.origin);
    const display = opts.display || '';
    if (kind === 'link') {
      return WFProto.CDN_LICENSE_NOTE + '\n<link rel="preconnect" href="' + apiOrigin() + '" crossorigin>\n' +
        (opts.preload ? list.map(function (u) { return '<link rel="preload" as="style" href="' + u + '">'; }).join('\n') + '\n' : '') +
        list.map(function (u) { return '<link rel="stylesheet" href="' + u + '">'; }).join('\n');
    }
    if (kind === 'import') {
      return list.map(function (u) { return "@import url('" + u + "');"; }).join('\n');
    }
    if (kind === 'css') {
      function stackFor(it) {
        const fam = it.fallbackFamily
          ? String(it.family) + '|' + String(it.fallbackFamily)
          : it.family;
        return cssStack(fam, opts);
      }
      if (items.length > 1 && !items.some(function (it) { return it.fallbackFamily; })) {
        const merged = items.map(function (it) { return it.family; }).filter(Boolean).join('|');
        const w0 = ((items[0] && items[0].weights) || ['400'])[0];
        return '.your-selector {\n  font-family: ' + cssStack(merged, opts) + ';\n  font-weight: ' +
          w0 + ';\n  font-display: ' + (display || 'swap') + ';\n}';
      }
      return items.map(function (it) {
        return '.your-selector {\n  font-family: ' + stackFor(it) + ';\n  font-weight: ' +
          ((it.weights || ['400'])[0]) + ';\n  font-display: ' + (display || 'swap') + ';\n}';
      }).join('\n\n');
    }
    if (kind === 'project') {
      const slug = opts.slug || '';
      const file = opts.file || 'index.css';
      const url = withQuery(WFProto.projectCssUrl(slug, file, opts.origin), 'display', display);
      const host = opts.origin || apiOrigin();
      return WFProto.CDN_LICENSE_NOTE + '\n<link rel="preconnect" href="' + host + '" crossorigin>\n' +
        (opts.preload ? '<link rel="preload" as="style" href="' + url + '">\n' : '') +
        '<link rel="stylesheet" href="' + url + '">';
    }
    if (kind === 'npm') {
      const rows = [];
      items.forEach(function (it) {
        const ver = it.version && it.version !== 'full' ? it.version : '';
        const fams = it.fallbackFamily
          ? [it.family, it.fallbackFamily]
          : [it.family];
        fams.forEach(function (raw, idx) {
          const wen = familyName(raw, opts);
          const wTok = idx === 1 && it.fallbackWeight ? it.fallbackWeight : ((it.weights || ['400'])[0]);
          const weights = "'" + weightToken(wen, wTok) + "'";
          rows.push("  { family: '" + wen + "', weights: [" + weights + ']' +
            (ver ? ", version: '" + ver + "'" : '') + ' }');
        });
      });
      return 'npm install @windfonts/loader\n\n' +
        "import { loadFonts } from '@windfonts/loader';\n\n" +
        'loadFonts([\n' + rows.join(',\n') +
        '\n], { display: \'' + (opts.display || 'swap') + '\' });';
    }
    return '';
  }

  function highlight(kind, src) {
    const e = esc(src);
    const held = [];
    function hold(html) {
      held.push(html);
      return '\0' + (held.length - 1) + '\0';
    }
    function restore(s) {
      return s.replace(/\0(\d+)\0/g, function (_, i) { return held[Number(i)]; });
    }
    function strings(s) {
      return s.replace(/(&quot;[\s\S]*?&quot;|'[^']*')/g, function (m) {
        return hold('<span class="k-s">' + m + '</span>');
      });
    }
    if (kind === 'link' || kind === 'project') {
      return restore(strings(e
        .replace(/(&lt;!--[\s\S]*?--&gt;)/g, function (m) { return hold('<span class="k-c">' + m + '</span>'); })
        .replace(/(&lt;\/?)([a-zA-Z][\w:-]*)/g, function (_, a, b) { return a + hold('<span class="k">' + b + '</span>'); })
        .replace(/\s([a-zA-Z_:][\w:.-]*)=/g, function (_, a) { return ' ' + hold('<span class="k-a">' + a + '</span>') + '='; })));
    }
    if (kind === 'import') {
      return restore(strings(e.replace(/(@import)/g, function (m) { return hold('<span class="k">' + m + '</span>'); })));
    }
    if (kind === 'css') {
      return restore(strings(e.replace(/(font-family|font-weight|font-display)/g, function (m) {
        return hold('<span class="k">' + m + '</span>');
      })));
    }
    if (kind === 'npm') {
      return restore(strings(e.replace(/\b(npm|install|import|from|loadFonts)\b/g, function (m) {
        return hold('<span class="k">' + m + '</span>');
      })));
    }
    return e;
  }

  const KINDS = [
    { id: 'link', label: 'link' },
    { id: 'import', label: '@import' },
    { id: 'css', label: 'css' },
    { id: 'npm', label: 'npm' }
  ];

  /** 渲染 tabs + code 块，返回 { setItems, setOpts } */
  function mount(el, items, opts) {
    opts = opts || {};
    let kind = opts.kind || 'link';
    let cur = items;
    let curOpts = opts;
    el.innerHTML =
      '<div class="use-bar">' +
        (opts.cdn ? WFProto.cdnSwitchHtml() : '') +
        '<div class="seg" role="group" aria-label="地址结构">' +
          '<button type="button" data-struct="dynamic"' + (curOpts.structure === 'static' ? '' : ' class="is-on"') + '>动态</button>' +
          '<button type="button" data-struct="static"' + (curOpts.structure === 'static' ? ' class="is-on"' : '') + '>静态</button>' +
        '</div>' +
        '<div class="tabs" role="tablist">' + KINDS.map(function (k) {
          return '<button type="button" role="tab" data-kind="' + k.id + '"' + (k.id === kind ? ' class="is-on"' : '') + '>' + k.label + '</button>';
        }).join('') + '</div>' +
      '</div>' +
      '<div class="code" style="margin-top:var(--s-4)"><button type="button" class="copy">' + WFChrome.icon('copy') + '复制</button><pre></pre></div>';
    const pre = el.querySelector('pre');
    function paint() {
      if (!pre.isConnected) return;
      pre.innerHTML = highlight(kind, code(kind, cur, curOpts));
    }
    document.addEventListener('wf:cdn', paint);
    el.querySelectorAll('[data-struct]').forEach(function (b) {
      b.addEventListener('click', function () {
        curOpts.structure = b.getAttribute('data-struct');
        el.querySelectorAll('[data-struct]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        paint();
        if (typeof curOpts.onChange === 'function') curOpts.onChange({ structure: curOpts.structure });
      });
    });
    el.querySelectorAll('[data-kind]').forEach(function (b) {
      b.addEventListener('click', function () {
        kind = b.getAttribute('data-kind');
        el.querySelectorAll('[data-kind]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        paint();
      });
    });
    el.querySelector('.copy').addEventListener('click', function () { WFChrome.copy(pre.textContent, '已复制代码'); });
    paint();
    return {
      setItems: function (items2) { cur = items2; paint(); },
      setOpts: function (o) { curOpts = Object.assign({}, curOpts, o); paint(); },
      getCode: function () { return code(kind, cur, curOpts); }
    };
  }

  window.WFEmbed = {
    API: WFProto.CDN,
    VERSIONS: VERSIONS,
    DEFAULT_VERSION: DEFAULT_VERSION,
    KINDS: KINDS,
    estimateBytes: estimateBytes,
    fmtBytes: fmtBytes,
    versionSize: versionSize,
    urls: urls,
    code: code,
    mount: mount,
    familyName: familyName,
    familyNames: familyNames,
    alignWeight: alignWeight
  };
})();
