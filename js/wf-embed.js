/* 文风字体 v4 · 嵌入代码生成 + 体积估算。依赖 wf-proto.js */
(function () {
  const esc = WFProto.escapeHtml;
  function apiOrigin() { return WFProto.cdnOrigin ? WFProto.cdnOrigin() : WFProto.CDN; }
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

  /** items: [{ family, weights: ['400','700'], version }] */
  function urls(items) {
    const out = [];
    items.forEach(function (it) {
      (it.weights || ['400']).forEach(function (w) {
        out.push(WFProto.embedCssUrl(it.family, w, it.version && it.version !== 'full' ? it.version : ''));
      });
    });
    return out;
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
    const list = urls(items);
    const display = opts.display ? '&display=' + opts.display : '';
    if (kind === 'link') {
      return WFProto.CDN_LICENSE_NOTE + '\n<link rel="preconnect" href="' + apiOrigin() + '" crossorigin>\n' +
        (opts.preload ? list.map(function (u) { return '<link rel="preload" as="style" href="' + u + display + '">'; }).join('\n') + '\n' : '') +
        list.map(function (u) { return '<link rel="stylesheet" href="' + u + display + '">'; }).join('\n');
    }
    if (kind === 'import') {
      return list.map(function (u) { return "@import url('" + u + display + "');"; }).join('\n');
    }
    if (kind === 'css') {
      return items.map(function (it) {
        const fam = familyName(it.family, opts);
        return '.your-selector {\n  font-family: "' + fam + '",\n    "PingFang SC", "Microsoft YaHei", sans-serif;\n  font-weight: ' +
          ((it.weights || ['400'])[0]) + ';\n  font-display: ' + (opts.display || 'swap') + ';\n}';
      }).join('\n\n');
    }
    if (kind === 'project') {
      const slug = opts.slug || '';
      const file = opts.file || 'index.css';
      const display = opts.display ? '?display=' + encodeURIComponent(opts.display) : '';
      const url = WFProto.projectCssUrl(slug, file) + display;
      return WFProto.CDN_LICENSE_NOTE + '\n<link rel="preconnect" href="' + apiOrigin() + '" crossorigin>\n' +
        (opts.preload ? '<link rel="preload" as="style" href="' + url + '">\n' : '') +
        '<link rel="stylesheet" href="' + url + '">';
    }
    if (kind === 'npm') {
      return 'npm install @windfonts/loader\n\n' +
        "import { loadFonts } from '@windfonts/loader';\n\n" +
        'loadFonts([\n' +
        items.map(function (it) {
          return "  { family: '" + it.family + "', weights: [" + (it.weights || ['400']).map(function (w) { return w; }).join(', ') + ']' +
            (it.version && it.version !== 'full' ? ", subset: '" + it.version + "'" : '') + ' }';
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
      '<div class="tabs" role="tablist">' + KINDS.map(function (k) {
        return '<button type="button" role="tab" data-kind="' + k.id + '"' + (k.id === kind ? ' class="is-on"' : '') + '>' + k.label + '</button>';
      }).join('') + '</div>' +
      '<div class="code" style="margin-top:var(--s-4)"><button type="button" class="copy">' + WFChrome.icon('copy') + '复制</button><pre></pre></div>';
    const pre = el.querySelector('pre');
    function paint() {
      if (!pre.isConnected) return;
      pre.innerHTML = highlight(kind, code(kind, cur, curOpts));
    }
    document.addEventListener('wf:cdn', paint);
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
