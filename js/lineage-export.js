/* 谱系图画布导出：PNG / SVG（依赖 window.htmlToImage）
   捕获 #flowStage（卡片 + 边），不含工具栏；导出前解析 SVG 上的 var() 填色。 */
(function (global) {
  'use strict';

  var SVG_PAINT_ATTRS = ['fill', 'stroke', 'stop-color', 'flood-color', 'color'];

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
    return '谱系-' + sanitizeFilename(groupName) + '-' + sanitizeFilename(modeSlug(mode)) + '.' + ext;
  }

  function surfaceBg() {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
      if (v) return v;
    } catch (e) {}
    return '#f5f5f5';
  }

  /** 把 var(--token) / var(--token, fallback) 抽成计算色（含 defs/marker） */
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

  /** 把 SVG 呈现属性里的 var(...) 换成计算色，返回 restore 函数 */
  function resolveSvgCssVars(root) {
    var backups = [];
    if (!root || !root.querySelectorAll) return function () {};
    var nodes = root.querySelectorAll('svg, svg *');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!el.getAttribute) continue;
      for (var a = 0; a < SVG_PAINT_ATTRS.length; a++) {
        var attr = SVG_PAINT_ATTRS[a];
        var raw = el.getAttribute(attr);
        if (!raw || raw.indexOf('var(') === -1) continue;
        var next = resolveVarString(raw);
        if (!next || next === raw || next.indexOf('var(') !== -1) {
          /* 再试 getComputedStyle（可见元素） */
          try {
            var cs = getComputedStyle(el).getPropertyValue(attr);
            if (cs && cs.indexOf('var(') === -1 && cs !== 'none') next = cs.trim();
          } catch (e) {}
        }
        if (!next || next === raw) continue;
        backups.push({ el: el, attr: attr, value: raw });
        el.setAttribute(attr, next);
      }
    }
    return function restore() {
      for (var j = 0; j < backups.length; j++) {
        var b = backups[j];
        b.el.setAttribute(b.attr, b.value);
      }
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
    /* SVG 内嵌字体常达数十 MB；跳过字体，文件可分享。PNG 仍尝试嵌入同域字面。 */
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
    var restore = resolveSvgCssVars(stage);
    var opts = captureOptions(stage, format);
    var run = format === 'svg'
      ? api.toSvg(stage, opts)
      : api.toPng(stage, opts);
    return Promise.resolve(run).then(function (dataUrl) {
      restore();
      var ext = format === 'svg' ? 'svg' : 'png';
      downloadDataUrl(dataUrl, buildFilename(ctx.groupName, ctx.mode, ext));
      return dataUrl;
    }, function (err) {
      restore();
      throw err;
    });
  }

  global.WFLineageExport = {
    canExport: canExport,
    download: download,
    buildFilename: buildFilename,
    modeSlug: modeSlug
  };
})(typeof window !== 'undefined' ? window : this);
