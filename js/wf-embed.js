/* 文风字体 v4 · 嵌入代码生成 + 体积估算。依赖 wf-proto.js */
(function () {
  const esc = WFProto.escapeHtml;
  function apiOrigin() { return WFProto.cdnOrigin(); }
  const BYTES_PER_GLYPH = 290; /* woff2 中文字形均值（估算） */
  const OVERHEAD = 2048;

  /* CDN 现有两种预制版本：index.css（完整）与 zh_index.css（中文子集）；更细的子集在控制台按项目生成 */
  const VERSIONS = [
    { id: 'full', label: '完整', hint: '全部字形 · index.css', glyphs: function (f) { return f.glyphCount || f.charCount || 8000; } },
    { id: 'zh', label: '中文', hint: '中文字符子集 · zh_index.css', glyphs: function (f) { return Math.min(f.glyphCount || 7000, 7000); } }
  ];

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

  function fileUrl(it, weight, structure) {
    const version = it.version && it.version !== 'full' ? it.version : 'full';
    const origin = WFProto.cdnOrigin();
    if (structure === 'static') {
      return WFProto.cssUrl(it.family, weight, version === 'zh-common' ? 'zh' : version, origin);
    }
    return WFProto.cssApiUrl(it.family, weight, version, origin);
  }

  /** items: [{ family, weights: ['400','700'], version }] */
  function urls(items, structure) {
    const out = [];
    items.forEach(function (it) {
      (it.weights || ['400']).forEach(function (w) {
        out.push(fileUrl(it, w, structure));
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
    const raw = String(family || '');
    if (raw.indexOf('wenfeng-') === 0) return raw;
    if (raw.indexOf('windfonts-') === 0) return 'wenfeng-' + raw.slice(10);
    return raw ? 'wenfeng-' + raw.replace(/^wenfeng-/, '') : '';
  }

  function code(kind, items, opts) {
    opts = opts || {};
    const structure = opts.structure === 'static' ? 'static' : 'dynamic';
    const list = urls(items, structure);
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
      return items.map(function (it) {
        const wen = familyName(it.family, opts);
        const wind = wen.replace(/^wenfeng-/, 'windfonts-');
        return '.your-selector {\n  font-family: "' + wen + '",\n    "' + wind + '",\n    "PingFang SC", "Microsoft YaHei", sans-serif;\n  font-weight: ' +
          ((it.weights || ['400'])[0]) + ';\n  font-display: ' + (display || 'swap') + ';\n}';
      }).join('\n\n');
    }
    if (kind === 'project') {
      const slug = opts.slug || '';
      const file = opts.file || 'index.css';
      const url = withQuery(WFProto.projectCssUrl(slug, file), 'display', display);
      return WFProto.CDN_LICENSE_NOTE + '\n<link rel="preconnect" href="' + apiOrigin() + '" crossorigin>\n' +
        (opts.preload ? '<link rel="preload" as="style" href="' + url + '">\n' : '') +
        '<link rel="stylesheet" href="' + url + '">';
    }
    if (kind === 'npm') {
      return 'npm install @windfonts/loader\n\n' +
        "import { loadFonts } from '@windfonts/loader';\n\n" +
        'loadFonts([\n' +
        items.map(function (it) {
          const weights = (it.weights || ['400']).map(function (w) { return "'" + weightToken(it.family, w) + "'"; }).join(', ');
          return "  { family: '" + familyName(it.family, opts) + "', weights: [" + weights + ']' +
            (it.version && it.version !== 'full' ? ", version: '" + it.version + "'" : '') + ' }';
        }).join(',\n') +
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
    KINDS: KINDS,
    estimateBytes: estimateBytes,
    fmtBytes: fmtBytes,
    versionSize: versionSize,
    urls: urls,
    code: code,
    mount: mount,
    familyName: familyName
  };
})();
