/* 谱系图画布导出：PNG / SVG（依赖 window.htmlToImage）
   捕获 #flowStage（卡片 + 边），不含工具栏。
   导出前把 #edges 下 SVG 的计算样式写成呈现属性（stroke/fill 等），
   否则 html-to-image 常把无 stroke 属性的 path 填成实心或丢线。 */
(function (global) {
  'use strict';

  /** 导出时需从 getComputedStyle 写入的 SVG 呈现属性 */
  var PRESENTATION_ATTRS = [
    'fill',
    'stroke',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-dasharray',
    'stroke-opacity',
    'fill-opacity',
    'opacity',
    'font-size',
    'font-family',
    'font-weight',
    'color'
  ];

  var FONT_ATTRS = { 'font-size': 1, 'font-family': 1, 'font-weight': 1 };

  function canExport(mode) {
    return mode === 'plex' || mode === 'flow';
  }

  function modeSlug(mode) {
    if (mode === 'plex') return '聚焦';
    if (mode === 'flow') return '图谱';
    if (mode === 'wall') return '字墙';
    if (mode === 'branch') return '分支';
    return mode || '图谱';
  }

  function sanitizeFilename(s) {
    return String(s || '')
      .replace(/[\/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, '')
      .replace(/\.+/g, '.')
      .slice(0, 48) || '谱系';
  }

  function buildFilename(groupName, mode, ext) {
    return '文风字体谱系-' + sanitizeFilename(groupName) + '-' + sanitizeFilename(modeSlug(mode)) + '.' + ext;
  }

  function surfaceBg() {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
      if (v) return v;
    } catch (e) {}
    return '#f5f5f5';
  }

  /** 把 var(--token) / var(--token, fallback) 抽成计算色 */
  function resolveVarString(raw) {
    if (!raw || raw.indexOf('var(') === -1) return raw;
    var rootStyle;
    try { rootStyle = getComputedStyle(document.documentElement); } catch (e) { return raw; }
    return raw.replace(/var\(\s*(--[^,\s)]+)\s*(?:,\s*([^)]+))?\)/g, function (_, name, fallback) {
      var v = '';
      try { v = rootStyle.getPropertyValue(name.trim()).trim(); } catch (e) {}
      if (v) return v;
      return fallback ? fallback.trim() : _;
    });
  }

  function isNonePaint(v) {
    if (!v) return true;
    var s = String(v).trim().toLowerCase();
    return s === 'none' || s === 'transparent' || s === 'rgba(0, 0, 0, 0)' || s === 'rgba(0,0,0,0)';
  }

  /** stroke-width 等计算值常带 px，SVG 属性用无单位更稳 */
  function stripPx(v) {
    if (!v) return v;
    var m = String(v).trim().match(/^(-?[\d.]+)px$/i);
    return m ? m[1] : v;
  }

  function tagName(el) {
    return (el.tagName || '').toLowerCase();
  }

  function isShapePath(el) {
    var t = tagName(el);
    return t === 'path' || t === 'polyline' || t === 'line' || t === 'polygon';
  }

  function isTextish(el) {
    var t = tagName(el);
    return t === 'text' || t === 'tspan';
  }

  function rootCssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (v) return v;
    } catch (e) {}
    return fallback || '';
  }

  /**
   * 把 stage 内 #edges（含 defs/marker）的计算样式写成呈现属性。
   * 每条边 path 必须有 fill="none" + 具体 stroke，否则导出线会废。
   * 返回 restore：恢复导出前属性。
   */
  function inlineSvgPresentation(root) {
    var backups = [];
    if (!root || !root.querySelectorAll) return function () {};

    function remember(el, attr) {
      var key = attr;
      /* WeakSet only on elements; track attr via data flag on backup list */
      for (var i = 0; i < backups.length; i++) {
        if (backups[i].el === el && backups[i].attr === attr) return false;
      }
      return true;
    }

    function backupAndSet(el, attr, next) {
      if (next == null || next === '') return;
      next = String(next);
      if (!remember(el, attr)) {
        /* already backed up — still update to latest resolved value */
        el.setAttribute(attr, next);
        return;
      }
      var had = el.hasAttribute(attr);
      var prev = had ? el.getAttribute(attr) : null;
      if (prev === next) return;
      backups.push({ el: el, attr: attr, value: prev, had: had });
      el.setAttribute(attr, next);
    }

    function readComputed(el, prop, cs) {
      var v = '';
      try {
        v = (cs || getComputedStyle(el)).getPropertyValue(prop);
        if (v) v = v.trim();
      } catch (e) {}
      if (v && v.indexOf('var(') !== -1) v = resolveVarString(v);
      return v || '';
    }

    function processEl(el) {
      if (!el || !el.getAttribute) return;
      var cs = null;
      try { cs = getComputedStyle(el); } catch (e) {}

      var shape = isShapePath(el);
      var textish = isTextish(el);
      var isArrowHead = !!(el.classList && el.classList.contains('lfl-arrow-head'));

      for (var a = 0; a < PRESENTATION_ATTRS.length; a++) {
        var attr = PRESENTATION_ATTRS[a];
        if (FONT_ATTRS[attr] && !textish) continue;
        /* 箭头头只要 fill；描边会画出边框 */
        if (isArrowHead && attr.indexOf('stroke') === 0) continue;

        var v = readComputed(el, attr, cs);

        /* defs/marker 内元素 getComputedStyle 常不准：回退属性上的 var() */
        if ((!v || v.indexOf('var(') !== -1) && el.hasAttribute(attr)) {
          var rawAttr = el.getAttribute(attr);
          var resolved = resolveVarString(rawAttr);
          if (resolved && resolved.indexOf('var(') === -1) v = resolved;
        }

        if (attr === 'fill') {
          if (shape && !isArrowHead && isNonePaint(v)) {
            backupAndSet(el, 'fill', 'none');
            continue;
          }
          if (isNonePaint(v) && !isArrowHead) {
            backupAndSet(el, 'fill', 'none');
            continue;
          }
        }

        if (attr === 'stroke' && isNonePaint(v)) {
          /* 无描边就别写，避免干扰纯填充图形（箭头头） */
          continue;
        }

        if (attr === 'stroke-dasharray' && (!v || v === 'none')) continue;
        if (attr === 'opacity' && (v === '' || v === '1')) continue;
        if ((attr === 'stroke-opacity' || attr === 'fill-opacity') && (v === '' || v === '1')) continue;

        if (!v || v.indexOf('var(') !== -1) continue;

        if (attr === 'stroke-width' || attr === 'font-size') v = stripPx(v);
        if (attr === 'stroke-dasharray') {
          v = String(v).replace(/px/gi, '').replace(/\s*,\s*/g, ' ').trim();
        }

        backupAndSet(el, attr, v);
      }

      /* 边 path：强制 fill=none（CSS 有，属性没有时 html-to-image 会填黑） */
      if (shape && !isArrowHead) {
        backupAndSet(el, 'fill', 'none');
        if (!el.getAttribute('stroke') || el.getAttribute('stroke').indexOf('var(') !== -1) {
          var stroke = readComputed(el, 'stroke', cs);
          if (!stroke || stroke.indexOf('var(') !== -1 || isNonePaint(stroke)) {
            stroke = rootCssVar('--gray-2', '#8c8c8c');
          }
          backupAndSet(el, 'stroke', stroke);
        }
        if (!el.getAttribute('stroke-width')) {
          var sw = stripPx(readComputed(el, 'stroke-width', cs)) || '1.6';
          backupAndSet(el, 'stroke-width', sw);
        }
      }

      /* marker 箭头头：defs 里样式常算不出，必须把 fill 写死 */
      if (isArrowHead) {
        var fill = el.getAttribute('fill');
        if (fill && fill.indexOf('var(') !== -1) fill = resolveVarString(fill);
        if (!fill || fill.indexOf('var(') !== -1 || isNonePaint(fill)) {
          fill = readComputed(el, 'fill', cs);
        }
        if (!fill || fill.indexOf('var(') !== -1 || isNonePaint(fill)) {
          fill = rootCssVar('--gray-2', '#8c8c8c');
        }
        backupAndSet(el, 'fill', fill);
        /* 再写 style，部分序列化器更认 inline style */
        var prevStyle = el.getAttribute('style');
        var styleNext = 'fill: ' + fill + ';';
        if (prevStyle && /(?:^|;)\s*fill\s*:/i.test(prevStyle)) {
          styleNext = prevStyle.replace(/(?:^|;)\s*fill\s*:[^;]*/i, function (m) {
            return m.charAt(0) === ';' ? '; fill: ' + fill : 'fill: ' + fill;
          });
          if (styleNext === prevStyle) styleNext = prevStyle + '; fill: ' + fill + ';';
        } else if (prevStyle) {
          styleNext = prevStyle.replace(/;?\s*$/, '') + '; fill: ' + fill + ';';
        }
        if (prevStyle !== styleNext) {
          if (remember(el, 'style')) {
            backups.push({
              el: el,
              attr: 'style',
              value: prevStyle,
              had: prevStyle != null
            });
          }
          el.setAttribute('style', styleNext);
        }
      }
    }

    var svgRoots = [];
    var edges = null;
    try { edges = root.querySelector('#edges, svg.lfl-edges'); } catch (e) {}
    if (edges) {
      svgRoots.push(edges);
    } else {
      var all = root.querySelectorAll('svg');
      for (var i = 0; i < all.length; i++) svgRoots.push(all[i]);
    }

    for (var s = 0; s < svgRoots.length; s++) {
      var svg = svgRoots[s];
      var nodes = svg.querySelectorAll('*');
      for (var n = 0; n < nodes.length; n++) processEl(nodes[n]);
    }

    return function restore() {
      for (var j = backups.length - 1; j >= 0; j--) {
        var b = backups[j];
        if (b.had) b.el.setAttribute(b.attr, b.value);
        else b.el.removeAttribute(b.attr);
      }
    };
  }

  /** @deprecated 保留别名，实际走 inlineSvgPresentation */
  function resolveSvgCssVars(root) {
    return inlineSvgPresentation(root);
  }

  /**
   * 从边 path 的 d（二次/三次 Bezier）取终点与切向，供导出箭头三角定位。
   * 现网 edgePath 产出：M x,y C c1x,c1y c2x,c2y x2,y2
   */
  function parsePathTip(d) {
    if (!d) return null;
    var nums = String(d).match(/-?[\d.]+/g);
    if (!nums || nums.length < 8) return null;
    var x1 = +nums[0];
    var y1 = +nums[1];
    var c2x = +nums[4];
    var c2y = +nums[5];
    var x2 = +nums[6];
    var y2 = +nums[7];
    var dx = x2 - c2x;
    var dy = y2 - c2y;
    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
      dx = x2 - (+nums[2]);
      dy = y2 - (+nums[3]);
    }
    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
      dx = x2 - x1;
      dy = y2 - y1;
    }
    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
      dx = 1;
      dy = 0;
    }
    return { x: x2, y: y2, dx: dx, dy: dy };
  }

  /**
   * html-to-image 把画布放进外层 SVG 的 foreignObject；嵌套 <svg> 里
   * marker-end="url(#lfl-arrow)" 在导出文件中常解析不到 defs。
   * 捕获前把箭头换成自包含三角 path，捕获后还原 marker-end。
   * soft 边本无 marker，跳过。
   */
  function replaceMarkersWithTriangles(root) {
    var backups = [];
    var added = [];
    if (!root || !root.querySelector) return function () {};

    var svg = null;
    try { svg = root.querySelector('#edges, svg.lfl-edges'); } catch (e) {}
    if (!svg) return function () {};

    var fill = rootCssVar('--gray-2', '#8c8c8c');
    var paths = svg.querySelectorAll('path[marker-end]');
    var NS = 'http://www.w3.org/2000/svg';
    /* markerWidth 7 / viewBox 10 → 0.7；与线上 marker 几何一致 */
    var scale = 0.7;

    for (var i = 0; i < paths.length; i++) {
      var path = paths[i];
      if (path.classList && path.classList.contains('is-soft')) continue;
      var me = path.getAttribute('marker-end');
      if (!me) continue;
      var tip = parsePathTip(path.getAttribute('d'));
      if (!tip) continue;

      backups.push({ el: path, attr: 'marker-end', value: me, had: true });
      path.removeAttribute('marker-end');

      var deg = Math.atan2(tip.dy, tip.dx) * (180 / Math.PI);
      var tri = document.createElementNS(NS, 'path');
      tri.setAttribute('class', 'lfl-export-arrowhead lfl-arrow-head');
      tri.setAttribute('d', 'M0,1.2 L9,5 L0,8.8 z');
      tri.setAttribute(
        'transform',
        'translate(' + tip.x + ',' + tip.y + ') rotate(' + deg + ') scale(' + scale + ') translate(-9,-5)'
      );
      tri.setAttribute('fill', fill);
      tri.setAttribute('stroke', 'none');
      tri.setAttribute('style', 'fill: ' + fill + ';');

      if (path.nextSibling) svg.insertBefore(tri, path.nextSibling);
      else svg.appendChild(tri);
      added.push(tri);
    }

    return function restore() {
      for (var a = 0; a < added.length; a++) {
        if (added[a].parentNode) added[a].parentNode.removeChild(added[a]);
      }
      for (var j = backups.length - 1; j >= 0; j--) {
        var b = backups[j];
        if (b.had) b.el.setAttribute(b.attr, b.value);
        else b.el.removeAttribute(b.attr);
      }
    };
  }

  /**
   * 捕获期临时样式：标题强制单行 + 稳定 CJK 系统栈，避免 SVG skipFonts
   * 回落宽字重排导致「体」掉行叠字。不改动烘焙角标逻辑。
   */
  function injectCaptureStyles() {
    var style = document.createElement('style');
    style.setAttribute('data-lfl-export-capture', '1');
    style.textContent = [
      '.lfl-plex-gate-title,',
      '.lfl-cluster-title,',
      '.lfl-series-title {',
      '  flex-wrap: nowrap !important;',
      '  min-width: 0 !important;',
      '}',
      '.lfl-plex-gate-title > span:first-child,',
      '.lfl-cluster-title > span:first-child,',
      '.lfl-series-title > span:first-child {',
      '  min-width: 0 !important;',
      '  white-space: nowrap !important;',
      '  overflow: hidden !important;',
      '  text-overflow: ellipsis !important;',
      '}',
      '.lfl-plex-gate-count,',
      '.lfl-cluster-count,',
      '.lfl-series-count {',
      '  flex-shrink: 0 !important;',
      '}',
      '.lfl-card,',
      '.lfl-card .lfl-name,',
      '.lfl-card .lfl-meta,',
      '.lfl-plex-gate-title,',
      '.lfl-cluster-title,',
      '.lfl-series-title,',
      '.lfl-plex-gate-sub,',
      '.lfl-cluster-sub,',
      '.lfl-series-sub,',
      '.lfl-plex-gate-count,',
      '.lfl-cluster-count,',
      '.lfl-series-count,',
      '.lfl-plex-gate-act,',
      '.lfl-cluster-act,',
      '.lfl-more-label {',
      '  font-family: "PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif !important;',
      '  line-height: 1.25 !important;',
      '}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(style);
    return function restore() {
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }

  function downloadDataUrl(dataUrl, filename) {
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function captureOptions(stage, format) {
    var w = parseFloat(stage.style.width) || stage.scrollWidth || stage.offsetWidth;
    var h = parseFloat(stage.style.height) || stage.scrollHeight || stage.offsetHeight;
    var opts = {
      pixelRatio: 2,
      backgroundColor: surfaceBg(),
      cacheBust: true,
      width: w,
      height: h,
      style: {
        transform: 'none',
        transformOrigin: '0 0',
        left: '0',
        top: '0'
      }
    };
    /* SVG 内嵌字体常达数十 MB；跳过字体，文件可分享。PNG 仍尝试嵌入同域字面。
       卡片标题等 live 字体会因 skipFonts 回落系统字——PNG 才是字形忠实分享格式。 */
    if (format === 'svg') opts.skipFonts = true;
    return opts;
  }

  function getApi() {
    var api = global.htmlToImage;
    if (!api || typeof api.toPng !== 'function' || typeof api.toSvg !== 'function') {
      throw new Error('html-to-image 未加载');
    }
    return api;
  }

  function absoluteAssetUrl(rel) {
    try {
      return new URL(rel, document.baseURI || global.location.href).href;
    } catch (e) {
      return rel;
    }
  }

  /**
   * file:// 打开导出 SVG 时，相对 href 会落到 Downloads 下。
   * 捕获前把 stage 内 a[href] / a[data-nav] 解析为绝对 URL，捕获后还原。
   */
  function absolutizeStageHrefs(stage) {
    if (!stage || !stage.querySelectorAll) return function () {};
    var base = document.baseURI || global.location.href;
    var backups = [];
    var anchors = stage.querySelectorAll('a[href], a[data-nav]');
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      var href = a.getAttribute('href');
      if (!href) continue;
      var trimmed = String(href).trim();
      if (!trimmed) continue;
      /* 已是绝对 / 片段 / 特殊协议则跳过 */
      if (/^(https?:|mailto:|data:|#)/i.test(trimmed)) continue;
      var abs;
      try {
        abs = new URL(trimmed, base).href;
      } catch (e) {
        continue;
      }
      if (abs === trimmed) continue;
      backups.push({ el: a, href: href });
      a.setAttribute('href', abs);
    }
    return function restore() {
      for (var j = 0; j < backups.length; j++) {
        var b = backups[j];
        if (b.href == null) b.el.removeAttribute('href');
        else b.el.setAttribute('href', b.href);
      }
    };
  }

  function loadImageElement(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('watermark image load failed')); };
      img.src = url;
    });
  }

  function waitImageReady(img) {
    if (!img) return Promise.resolve();
    if (typeof img.decode === 'function') {
      return img.decode().then(function () { return img; }, function () { return img; });
    }
    if (img.complete && img.naturalWidth) return Promise.resolve(img);
    return new Promise(function (resolve) {
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(img); };
    });
  }

  function watermarkFontStack() {
    var face = '"wenfeng-hckht", "Chill K Sans", "PingFang SC", "Hiragino Sans GB", sans-serif';
    try {
      if (global.WFProto && typeof WFProto.cssFamilyStack === 'function') {
        face = WFProto.cssFamilyStack('wenfeng-hckht');
      }
      if (global.WFProto && typeof WFProto.ensureFontCss === 'function') {
        WFProto.ensureFontCss('wenfeng-hckht', 'Medium');
      }
    } catch (e) {}
    return face;
  }

  function ensureWatermarkFontReady(face) {
    var ready = Promise.resolve();
    try {
      if (document.fonts && document.fonts.load) {
        ready = document.fonts
          .load('500 13px wenfeng-hckht')
          .catch(function () {
            return document.fonts.load('500 13px "PingFang SC"').catch(function () {});
          })
          .then(function () {
            if (document.fonts.ready) return document.fonts.ready.catch(function () {});
          });
      }
    } catch (e) {}
    return ready.then(function () { return face || watermarkFontStack(); });
  }

  /**
   * 在页面里用已加载的面烘焙角标（图标 + 「文风字体」）成 PNG data URL。
   * 捕获阶段只挂 <img>，SVG skipFonts 不再影响品牌字。
   * logo-bar.webp 是英文 Windfonts + 黑底，不适合透明角标，故不采用。
   */
  function bakeWatermarkDataUrl() {
    var logoUrl = absoluteAssetUrl('assets/icon.webp');
    var iconSize = 18;
    var gap = 6;
    var fontSize = 13;
    var label = '文风字体';
    var dpr = Math.max(2, Math.min(3, Number(global.devicePixelRatio) || 2));
    var ink = rootCssVar('--ink-2', rootCssVar('--ink', '#222222'));
    var face = watermarkFontStack();

    return Promise.all([loadImageElement(logoUrl), ensureWatermarkFontReady(face)])
      .then(function (pair) {
        var logoImg = pair[0];
        face = pair[1] || face;
        var measure = document.createElement('canvas').getContext('2d');
        measure.font = '500 ' + fontSize + 'px ' + face;
        var textW = Math.ceil(measure.measureText(label).width) || 52;
        var w = iconSize + gap + textW;
        var h = Math.max(iconSize, Math.ceil(fontSize * 1.25));
        var canvas = document.createElement('canvas');
        canvas.width = Math.ceil(w * dpr);
        canvas.height = Math.ceil(h * dpr);
        var ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(logoImg, 0, (h - iconSize) / 2, iconSize, iconSize);
        ctx.font = '500 ' + fontSize + 'px ' + face;
        ctx.fillStyle = ink;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(label, iconSize + gap, h / 2);
        return canvas.toDataURL('image/png');
      })
      .catch(function () {
        /* 烘焙失败：仅图标（仍转 data URL，避免 foreignObject 丢相对路径） */
        return loadImageElement(logoUrl).then(function (logoImg) {
          var canvas = document.createElement('canvas');
          var s = iconSize * dpr;
          canvas.width = s;
          canvas.height = s;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(logoImg, 0, 0, s, s);
          return canvas.toDataURL('image/png');
        });
      });
  }

  /**
   * 临时角标：仅挂一张已烘焙的 bitmap（无 live 文本节点）。
   * html-to-image 捕获后由 restore 移除。
   */
  function appendExportWatermark(stage, dataUrl) {
    if (!stage || !stage.appendChild || !dataUrl) return function () {};

    var mark = document.createElement('div');
    var logo = document.createElement('img');

    mark.className = 'lfl-export-watermark';
    mark.setAttribute('aria-hidden', 'true');
    mark.style.position = 'absolute';
    mark.style.right = '14px';
    mark.style.bottom = '14px';
    mark.style.zIndex = '9999';
    mark.style.display = 'block';
    mark.style.padding = '0';
    mark.style.margin = '0';
    mark.style.border = 'none';
    mark.style.borderRadius = '0';
    mark.style.background = 'transparent';
    mark.style.backgroundColor = 'transparent';
    mark.style.boxShadow = 'none';
    mark.style.lineHeight = '0';
    mark.style.pointerEvents = 'none';
    mark.style.boxSizing = 'border-box';

    logo.src = dataUrl;
    logo.alt = '';
    logo.style.display = 'block';
    logo.style.height = '18px';
    logo.style.width = 'auto';
    logo.style.maxHeight = '18px';
    logo.style.background = 'transparent';
    logo.style.backgroundColor = 'transparent';
    logo.style.border = 'none';
    logo.style.boxShadow = 'none';

    mark.appendChild(logo);
    stage.appendChild(mark);

    return function restore() {
      if (mark.parentNode === stage) mark.remove();
    };
  }

  /**
   * @param {'png'|'svg'} format
   * @param {{ groupName?: string, mode?: string, stage?: HTMLElement }} ctx
   */
  function download(format, ctx) {
    ctx = ctx || {};
    var stage = ctx.stage || document.getElementById('flowStage');
    if (!stage) return Promise.reject(new Error('找不到谱系画布'));
    if (!canExport(ctx.mode)) {
      return Promise.reject(new Error('字墙模式不支持下载图谱'));
    }
    var api = getApi();
    var restoreSvg = inlineSvgPresentation(stage);
    var restoreMarkers = replaceMarkersWithTriangles(stage);
    var restoreCaptureCss = injectCaptureStyles();
    var restoreHrefs = absolutizeStageHrefs(stage);
    var restoreWatermark = function () {};
    function restoreAll() {
      try { restoreWatermark(); } catch (e) {}
      try { restoreHrefs(); } catch (e) {}
      try { restoreMarkers(); } catch (e) {}
      try { restoreCaptureCss(); } catch (e) {}
      try { restoreSvg(); } catch (e) {}
    }
    try {
      var opts = captureOptions(stage, format);
      return bakeWatermarkDataUrl()
        .then(function (wmDataUrl) {
          restoreWatermark = appendExportWatermark(stage, wmDataUrl);
          var img = stage.querySelector('.lfl-export-watermark img');
          return waitImageReady(img);
        })
        .then(function () {
          return format === 'svg' ? api.toSvg(stage, opts) : api.toPng(stage, opts);
        })
        .then(function (dataUrl) {
          restoreAll();
          var ext = format === 'svg' ? 'svg' : 'png';
          downloadDataUrl(dataUrl, buildFilename(ctx.groupName, ctx.mode, ext));
          return dataUrl;
        }, function (err) {
          restoreAll();
          throw err;
        });
    } catch (err) {
      restoreAll();
      return Promise.reject(err);
    }
  }

  global.WFLineageExport = {
    canExport: canExport,
    download: download,
    buildFilename: buildFilename,
    modeSlug: modeSlug,
    /* 测试/调试用 */
    inlineSvgPresentation: inlineSvgPresentation,
    resolveSvgCssVars: resolveSvgCssVars,
    replaceMarkersWithTriangles: replaceMarkersWithTriangles,
    parsePathTip: parsePathTip,
    injectCaptureStyles: injectCaptureStyles,
    absolutizeStageHrefs: absolutizeStageHrefs
  };
})(typeof window !== 'undefined' ? window : this);
