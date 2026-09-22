(function () {
  const esc = function (s) { return WFProto.escapeHtml(s); };
  const PREF_KEY = 'wf-card-pref.v1';
  const TWEAK = ['size', 'leading', 'tracking', 'face', 'zoom', 'bgx', 'bgy', 'scrim'];
  const LAYERS = [
    ['sub', '副文'], ['avatar', '头像'], ['name', '字体名'], ['brand', '品牌'], ['mark', '文风']
  ];
  function loadPref() {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function durable(v) {
    v = String(v || '').trim();
    return !v || /^(blob|data):/i.test(v) ? '' : v.slice(0, 240);
  }
  function defaults(weight) {
    return { size: 64, leading: 1.35, tracking: 0.02, weight: String(weight || 400), align: 'left', wrap: true, fit: false, ink: '', paper: '', face: 88, zoom: 1, bgx: 50, bgy: 50, scrim: 62, hide: {} };
  }
  function tokenHex(name, fallback) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const hash = raw.match(/^#([0-9a-fA-F]{6})/);
    if (hash) return '#' + hash[1].toLowerCase();
    const rgb = raw.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!rgb) return fallback;
    return '#' + [rgb[1], rgb[2], rgb[3]].map(function (n) { return ('0' + Number(n).toString(16)).slice(-2); }).join('');
  }
  function field(id, type, ph, pick) {
    const up = pick ? '<button type="button" class="btn-icon" data-pick="' + id + '" aria-label="上传">' + WFChrome.icon('upload') +
      '</button><input type="file" accept="image/*" hidden data-file="' + id + '" />' : '';
    return '<div class="tester-field" data-field="' + id + '"><input class="input" type="' + type + '" data-c="' + id +
      '" placeholder="' + esc(ph) + '" aria-label="' + esc(ph) + '" autocomplete="off" spellcheck="false" />' + up + '</div>';
  }
  function slider(id, label, min, max, step, val) {
    return '<label class="tester-row"><span class="k">' + esc(label) + '</span>' +
      '<input class="range" type="range" data-k="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" />' +
      '<span class="val" data-val="' + id + '"></span></label>';
  }
  function pills(key, items, cur) {
    return '<div class="tester-pills" role="group">' + items.map(function (it) {
      return '<button type="button" data-set="' + key + '" data-v="' + esc(it[0]) + '"' + (String(it[0]) === String(cur) ? ' class="is-on"' : '') + '>' + esc(it[1]) + '</button>';
    }).join('') + '</div>';
  }
  function html(opts, state) {
    const weights = opts.weights || [];
    const wt = '<div class="weights" role="group" aria-label="字重">' + weights.map(function (w) {
      const c = WFProto.weightToCss(w);
      return '<button type="button" data-w="' + c + '"' + (c === state.weight ? ' class="is-on"' : '') + ' title="' + esc(w) + ' · ' + c + '">' + esc(w) + '</button>';
    }).join('') + '</div>';
    const reset = '<button type="button" class="btn-text" data-reset>' + WFChrome.icon('refresh') + '重置</button>';
    const colors = '<div class="tester-colors"><label class="tester-color"><input type="color" data-ink aria-label="字色" /></label>' +
      '<label class="tester-color"><input type="color" data-paper aria-label="底色" /></label>' +
      '<button type="button" data-invert>反相</button></div>';
    const layers = '<div class="tester-layers"><span class="k">显示</span><div class="tester-pills" role="group" aria-label="显示">' +
      LAYERS.map(function (it) {
        return '<button type="button" data-layer="' + it[0] + '" class="is-on" aria-pressed="true">' + esc(it[1]) + '</button>';
      }).join('') + '</div></div>';
    const typeBody = field('sub', 'text', '副文字 / 署名', 0) + layers +
      '<div class="tester-toolbar">' + wt + pills('align', [['left', '左'], ['center', '中'], ['right', '右']], state.align) + '</div>' +
      '<div class="tester-sliders tester-cols-2">' + slider('size', '字号', 12, 240, 1, state.size) +
        slider('leading', '行距', 0.8, 2.4, 0.05, state.leading) + slider('tracking', '字距', -0.12, 0.24, 0.005, state.tracking) + '</div>' + colors;
    const mediaBody = field('avatar', 'email', '填邮箱自动取头像', 1) + field('bg', 'url', '图片地址', 1) +
      '<div class="wall-bgs" role="listbox" aria-label="默认背景">' + (WFCard.WALL_BGS || []).map(function (src, i) {
        return '<button type="button" class="wall-bg" data-wall-bg="' + esc(src) + '" aria-label="背景 ' + (i + 1) + '" style="background-image:url(\'' + esc(src) + '\')"></button>';
      }).join('') + '</div>' +
      '<div class="tester-sliders tester-cols-2">' + slider('face', '头像', 32, 240, 1, state.face) + slider('zoom', '取景', 1, 2.5, 0.05, state.zoom) +
        slider('bgx', '横', 0, 100, 1, state.bgx) + slider('bgy', '纵', 0, 100, 1, state.bgy) +
        slider('scrim', '压色', 0, 90, 1, state.scrim) + '</div>';
    return {
      tpl: '<div class="tester-sec"><div class="tester-sec-head"><h4>模板</h4></div>' + WFCard.templatesHtml() + '</div>',
      ctl: '<div class="tester-headbar">' +
      ('<div class="tester-tabs" role="tablist"><button type="button" role="tab" data-tab="type" class="is-on" aria-selected="true">字</button><button type="button" role="tab" data-tab="media" aria-selected="false">图</button></div>') + reset + '</div>' +
      '<div class="tester-scroll">' +
      '<div class="tester-panel" data-panel="type" role="tabpanel">' + typeBody + '</div>' +
      '<div class="tester-panel" data-panel="media" role="tabpanel" hidden>' + mediaBody + '</div></div>' +
      '<div class="tester-end"><p class="tester-note" data-note hidden></p>' +
      '<div class="tester-out">' + pills('frame', [['narrow', '窄幅'], ['og', '分享图'], ['x', 'X'], ['banner', '横幅'], ['square', '方图']], 'narrow') +
        '<span data-out></span></div>' +
      '<div class="tester-foot">' +
      '<button type="button" class="btn" data-share>' + WFChrome.icon('link') + '复制链接</button>' +
      '<button type="button" class="btn" data-copy>' + WFChrome.icon('copy') + '复制图</button>' +
      '<button type="button" class="btn btn-ink" data-export>' + WFChrome.icon('download') + '导出图</button></div>' +
      '<button type="button" class="btn" data-done>' + WFChrome.icon('check') + '完成</button></div>'
    };
  }
  function fmt(k, v) {
    if (k === 'leading') return Number(v).toFixed(2);
    if (k === 'tracking') return Number(v).toFixed(3).replace(/0+$/, '').replace(/\.$/, '') + 'em';
    if (k === 'zoom') return Math.round(v * 100) + '%';
    if (k === 'bgx' || k === 'bgy' || k === 'scrim') return Math.round(v) + '%';
    return Math.round(v) + 'px';
  }
  function mount(opts) {
    opts = opts || {};
    const tpl = opts.tpl, ctl = opts.ctl, hero = opts.hero, stage = opts.stage, wall = opts.wall, bar = opts.bar, font = opts.font;
    let state = defaults(opts.weight);
    const parts = html(opts, state);
    tpl.innerHTML = parts.tpl;
    ctl.innerHTML = parts.ctl;
    function setShown(on) { tpl.hidden = !on; ctl.hidden = !on; }
    function ensureCtlVisible() {
      if (!ctl || ctl.hidden || window.innerWidth > 960) return;
      var foot = ctl.querySelector('.tester-foot'); if (!foot) return;
      var r = foot.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 8) window.scrollBy({ top: r.bottom - window.innerHeight + 16 });
    }
    const inkEl = ctl.querySelector('[data-ink]');
    const paperEl = ctl.querySelector('[data-paper]');
    const noteEl = ctl.querySelector('[data-note]');
    const timers = {};
    let saveTimer, closeScrollY;
    function note(msg) { noteEl.textContent = msg || ''; noteEl.hidden = !msg; }
    function wallTone(src) {
      const m = String(src || '').replace(/[?#].*$/, '').match(/\/wall\/0([1-6])\.jpg$/);
      return m ? (Number(m[1]) <= 3 ? 'dark' : 'light') : '';
    }
    function applyTone(tone) {
      if (tone !== 'dark' && tone !== 'light') return;
      const dark = tone === 'dark';
      state.ink = dark ? tokenHex('--paper', '#ffffff') : tokenHex('--ink', '#111111');
      state.paper = dark ? tokenHex('--ink', '#111111') : tokenHex('--paper', '#ffffff');
      syncColors();
      apply();
    }
    function inkFromBg(src) {
      src = String(src || '').trim();
      if (!src) return;
      const known = wallTone(src);
      if (known) { applyTone(known); return; }
      const im = new Image();
      im.onload = function () {
        try {
          const c = document.createElement('canvas');
          c.width = 8; c.height = 8;
          const x = c.getContext('2d');
          x.drawImage(im, 0, 0, 8, 8);
          const d = x.getImageData(0, 0, 8, 8).data;
          var sum = 0, n = 0, i;
          for (i = 0; i < d.length; i += 4) {
            sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
            n += 1;
          }
          applyTone((sum / n) < 140 ? 'dark' : 'light');
        } catch (e) { /* 跨域画布读不了就不动字色 */ }
      };
      im.src = src;
    }
    function setContent(slot, raw) {
      const v = String(raw || '').trim();
      note('');
      if (slot === 'sub') { WFCard.setSlot(stage, 'sub', v); return; }
      let src = v;
      if (slot === 'avatar') {
        src = WFAvatar.cravatar(v);
        if (v && !src) { note('邮箱格式不对'); WFCard.setSlot(stage, 'avatar', ''); return; }
      } else if (v && !/^https?:\/\//i.test(v) && !WFAvatar.isLocal(v)) {
        note('背景图要填完整地址，或点上传');
        WFCard.setSlot(stage, 'bg', '');
        return;
      }
      WFCard.setSlot(stage, slot, src, function (ok, kind) {
        if (!v) return;
        if (!ok) {
          note(slot === 'avatar' ? '这个邮箱没有头像' : '背景图加载失败');
          return;
        }
        if (kind === 'preview') note('在线图片只能预览，导出请改用上传');
        else warnPaint();
      });
    }
    function setFile(slot, file) {
      const url = WFAvatar.fileUrl(file);
      if (!url) { note('请选一张图片'); return; }
      const input = ctl.querySelector('[data-c="' + slot + '"]');
      if (input) input.value = '';
      note('');
      WFCard.setSlot(stage, slot, url, function (ok) {
        if (!ok) note('这张图读不出来');
        else if (slot === 'bg') inkFromBg(url);
      });
      persistSoon();
    }
    function paintVals() {
      TWEAK.forEach(function (k) {
        const n = ctl.querySelector('[data-val="' + k + '"]');
        if (n) n.textContent = fmt(k, state[k]);
      });
    }
    function fitText() {
      if (!state.fit || !hero || !stage) return;
      hero.style.whiteSpace = 'nowrap';
      hero.style.fontSize = '200px';
      const need = Math.max(1, hero.scrollWidth);
      const box = hero.parentElement || stage;
      const bs = getComputedStyle(box);
      const have = Math.max(1, (box.clientWidth || stage.clientWidth || 800) - (parseFloat(bs.paddingLeft) || 0) - (parseFloat(bs.paddingRight) || 0) - 8);
      state.size = Math.max(12, Math.min(240, Math.floor(200 * have / need)));
      const sl = ctl.querySelector('[data-k="size"]');
      if (sl) sl.value = String(state.size);
    }
    /* 不换行的模板（方印）遇上留下的长句：缩到画心里面，短句再回到原来的字号 */
    function fitLine() {
      if (!hero || state.wrap || state.fit) return;
      const cap = state.lineCap || state.size;
      const box = hero.parentElement || stage;
      if (!box || !box.clientWidth) return;
      const prevSize = hero.style.fontSize;
      const prevWs = hero.style.whiteSpace;
      const prevLs = hero.style.letterSpacing;
      hero.style.whiteSpace = 'nowrap';
      hero.style.fontSize = cap + 'px';
      hero.style.letterSpacing = (state.tracking || 0) + 'em';
      const bs = getComputedStyle(box);
      const have = Math.max(1, box.clientWidth - (parseFloat(bs.paddingLeft) || 0) - (parseFloat(bs.paddingRight) || 0) - 8);
      const need = Math.max(1, hero.scrollWidth);
      hero.style.fontSize = prevSize;
      hero.style.whiteSpace = prevWs;
      hero.style.letterSpacing = prevLs;
      const next = need <= have + 1 ? cap : Math.max(12, Math.min(240, Math.floor(cap * have / need)));
      if (next === state.size) return;
      state.size = next;
      const sl = ctl.querySelector('[data-k="size"]');
      if (sl) sl.value = String(next);
    }
    function slotHas(key) {
      return ((stage && stage.getAttribute('data-slots')) || '').split(/\s+/).indexOf(key) !== -1;
    }
    function layerLive(key) {
      if (key === 'sub' || key === 'avatar') return slotHas(key);
      if (key === 'name' || key === 'brand' || key === 'mark') {
        if (!stage || stage.getAttribute('data-credit') === '0') return false;
        if (stage.getAttribute('data-layout') === 'fill' && !stage.hasAttribute('data-has-avatar')) return false;
        return true;
      }
      return true;
    }
    function hideList() {
      return LAYERS.map(function (it) { return it[0]; }).filter(function (k) { return state.hide && state.hide[k]; });
    }
    function applyLayers() {
      if (!stage) return;
      const list = hideList();
      if (list.length) stage.setAttribute('data-hide', list.join(' '));
      else stage.removeAttribute('data-hide');
      ctl.querySelectorAll('[data-layer]').forEach(function (el) {
        const key = el.getAttribute('data-layer');
        const live = layerLive(key);
        el.hidden = !live;
        const on = live && !(state.hide && state.hide[key]);
        el.classList.toggle('is-on', on);
        el.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      const layerRow = ctl.querySelector('.tester-layers');
      if (layerRow) layerRow.hidden = !LAYERS.some(function (it) { return layerLive(it[0]); });
      const subField = ctl.querySelector('[data-field="sub"]');
      if (subField) subField.hidden = !slotHas('sub');
      const avField = ctl.querySelector('[data-field="avatar"]');
      if (avField) avField.hidden = !slotHas('avatar');
      ['face'].forEach(function (id) {
        const row = ctl.querySelector('[data-k="' + id + '"]');
        const host = row && row.closest('.tester-row');
        if (host) host.hidden = !slotHas('avatar');
      });
      const empty = ctl.querySelector('[data-media-empty]');
      if (empty) empty.hidden = true;
    }
    function apply() {
      if (!hero) return;
      if (state.fit) fitText();
      else fitLine();
      const hs = hero.style;
      hs.fontSize = state.size + 'px';
      hs.lineHeight = String(state.leading);
      hs.letterSpacing = state.tracking + 'em';
      hs.fontWeight = state.weight;
      hs.textAlign = state.align;
      hs.whiteSpace = state.wrap && !state.fit ? 'pre-wrap' : 'nowrap';
      hs.fontSynthesis = 'none';
      hs.color = '';
      if (stage) {
        stage.style.background = state.paper || '';
        stage.style.color = state.ink || '';
        stage.style.setProperty('--card-weight', state.weight);
        if (state.paper) stage.style.setProperty('--card-paper', state.paper); else stage.style.removeProperty('--card-paper');
        stage.style.setProperty('--avatar-size', state.face + 'px');
        stage.style.setProperty('--bg-zoom', String(state.zoom));
        stage.style.setProperty('--bg-x', state.bgx + '%');
        stage.style.setProperty('--bg-y', state.bgy + '%');
        stage.style.setProperty('--scrim', state.scrim + '%');
        applyLayers();
      }
      paintVals();
      persistSoon();
    }
    function syncColors() { inkEl.value = state.ink || tokenHex('--ink', '#111111'); paperEl.value = state.paper || tokenHex('--paper', '#ffffff'); }
    function setTab(id) {
      ctl.querySelectorAll('[data-tab]').forEach(function (b) { var on = b.getAttribute('data-tab') === id; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      ctl.querySelectorAll('[data-panel]').forEach(function (pn) { pn.hidden = pn.getAttribute('data-panel') !== id; });
    }
    function syncBgPick() {
      var inp = ctl.querySelector('[data-c="bg"]');
      var cur = inp ? String(inp.value || '').trim() : '';
      ctl.querySelectorAll('[data-wall-bg]').forEach(function (el) {
        el.classList.toggle('is-on', el.getAttribute('data-wall-bg') === cur);
      });
    }
    function syncUi() {
      ctl.querySelectorAll('[data-k]').forEach(function (el) { el.value = String(state[el.getAttribute('data-k')]); });
      syncBgPick();
      ctl.querySelectorAll('[data-w]').forEach(function (el) { el.classList.toggle('is-on', el.getAttribute('data-w') === state.weight); });
      ctl.querySelectorAll('[data-set]').forEach(function (el) {
        const key = el.getAttribute('data-set');
        if (key === 'frame') return;
        el.classList.toggle('is-on', el.getAttribute('data-v') === String(state[key]));
      });
      syncColors();
      apply();
      syncFrames();
    }
    function warnPaint() {
      if (stage && stage.querySelector('img[data-preview-only][src]')) {
        note('在线图片只能预览，导出请改用上传');
      } else if (/跨域/.test(noteEl.textContent || '')) note('');
    }
    function syncFrames() {
      const lock = stage && stage.getAttribute('data-template') === 'seal';
      const kind = (stage && stage.getAttribute('data-card')) || '';
      ctl.querySelectorAll('[data-set="frame"]').forEach(function (el) {
        const v = el.getAttribute('data-v');
        el.hidden = !!(lock && v !== 'square');
        el.classList.toggle('is-on', v === kind);
      });
      const outEl = ctl.querySelector('[data-out]');
      const out = stage && WFCard.outputSize(stage);
      if (outEl && out) outEl.textContent = out.w + '×' + out.h + ' · ' + out.label;
    }
    function setFrame(kind) {
      if (!kind || (stage && stage.getAttribute('data-template') === 'seal' && kind !== 'square')) return;
      WFCard.applyFrame(stage, kind);
      syncFrames();
      persistSoon();
    }
    function takeTpl(T, keepText) {
      if (!T) return;
      state.size = T.size; state.leading = T.leading; state.tracking = T.tracking;
      state.align = T.align; state.wrap = !!T.wrap; state.fit = !!T.fit;
      state.face = T.face || 88; state.zoom = 1; state.bgx = 50; state.bgy = 50; state.scrim = 62;
      state.lineCap = T.size;
      state.ink = T.invert ? '#f2f2f2' : '';
      state.paper = T.invert ? '#111111' : '';
      if (!keepText) {
        if (T.hero) hero.textContent = T.hero;
        const subEl = ctl.querySelector('[data-c="sub"]');
        if (T.sub !== undefined && subEl) { subEl.value = T.sub; setContent('sub', T.sub); }
      }
      syncUi();
      WFCard.paintStudio(tpl, stage);
    }
    function overlay(src, keepHero) {
      const keepText = !!(keepHero && src.hero != null);
      takeTpl(WFCard.applyTemplate(stage, src.tpl), keepText);
      if (src.hero != null) hero.textContent = String(src.hero);
      TWEAK.forEach(function (k) { if (src[k] != null) state[k] = Number(src[k]); });
      if (src.size != null) state.lineCap = Number(src.size);
      if (src.align) state.align = src.align;
      if (src.ink != null) state.ink = src.ink;
      if (src.paper != null) state.paper = src.paper;
      const cur = WFCard.currentTemplate(stage);
      if (cur && cur.invert && state.ink === tokenHex('--paper', '#ffffff') && state.paper === tokenHex('--ink', '#111111')) {
        state.ink = '#f2f2f2';
        state.paper = '#111111';
      }
      if (src.wrap !== undefined) state.wrap = !!src.wrap;
      if (src.fit !== undefined) state.fit = !!src.fit;
      if (src.weight) state.weight = String(src.weight);
      if (src.frame) {
        const native = (WFCard.currentTemplate(stage) || {}).frame;
        const wide = native === 'og' || native === 'banner' || native === 'x';
        if (!(wide && src.frame === 'narrow')) WFCard.applyFrame(stage, src.frame);
      }
      ['sub', 'avatar', 'bg'].forEach(function (k) {
        if (src[k] == null) return;
        const el = ctl.querySelector('[data-c="' + k + '"]');
        if (el) { el.value = durable(src[k]); setContent(k, el.value); }
      });
      if (src.sub == null && keepText) {
        const T = WFCard.currentTemplate(stage);
        const subEl = ctl.querySelector('[data-c="sub"]');
        if (T && T.sub !== undefined && subEl) { subEl.value = T.sub; setContent('sub', T.sub); }
      }
      [['cardName','[data-card-name]'],['cardBrand','[data-card-brand]']].forEach(function (p) { if (src[p[0]] == null) return; var el = stage.querySelector(p[1]); if (el) el.textContent = src[p[0]]; });
      state.hide = {};
      String(src.hide || '').split(/\s+/).forEach(function (k) { if (k) state.hide[k] = 1; });
      syncUi();
      warnPaint();
    }
    function persist() {
      if (!font || !font.id) return;
      const rec = {
        tpl: (stage && stage.getAttribute('data-template')) || 'poem',
        frame: (stage && stage.getAttribute('data-card')) || '',
        align: state.align, wrap: !!state.wrap, fit: !!state.fit,
        ink: state.ink || '', paper: state.paper || '', weight: String(state.weight || ''),
        hero: String((hero && hero.textContent) || '').slice(0, 200)
      };
      TWEAK.forEach(function (k) { rec[k] = state[k]; });
      ctl.querySelectorAll('[data-c]').forEach(function (el) { rec[el.getAttribute('data-c')] = durable(el.value); });
      var ne = stage && stage.querySelector('[data-card-name]'), be = stage && stage.querySelector('[data-card-brand]');
      rec.cardName = durable(ne && ne.textContent); rec.cardBrand = durable(be && be.textContent);
      rec.hide = hideList().join(' ');
      delete rec.dismissed;
      const all = loadPref();
      all.fonts = all.fonts || {};
      all.fonts[font.id] = rec;
      TWEAK.concat(['tpl', 'frame', 'align', 'wrap', 'fit', 'ink', 'paper', 'weight', 'sub', 'avatar', 'bg', 'cardName', 'cardBrand', 'hide']).forEach(function (k) { all[k] = rec[k]; });
      try { localStorage.setItem(PREF_KEY, JSON.stringify(all)); } catch (e) { /* ignore */ }
      pushShare();
    }
    function persistSoon() { if (ctl.hidden && !WFCard.currentKind(stage)) return; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 220); }
    function setOpen(on, seed) {
      if (!on) {
        persist();
        WFChrome.holdScroll(wall, function () {
          if (wall) wall.classList.remove('is-editing');
          setShown(false);
          if (bar) bar.hidden = false;
          applyWallMode();
        }, closeScrollY);
        if (opts.onClose) opts.onClose({ size: state.size, weight: state.weight }); closeScrollY = null;
        return;
      }
      WFChrome.holdScroll(wall, function () {
        if (wall) wall.classList.add('is-editing');
        setShown(true);
        if (bar) bar.hidden = true;
        const all = loadPref();
        const mine = all.fonts && all.fonts[font.id];
        if (mine && mine.tpl) overlay(mine, true);
        else if (all.tpl) overlay(all, false);
        else {
          if (seed && seed.size) state.size = seed.size;
          if (seed && seed.weight) state.weight = String(seed.weight);
          takeTpl(WFCard.applyTemplate(stage, 'poem'));
        }
        if (!mine || (mine.cardName == null && mine.cardBrand == null)) WFCard.fillMeta(stage, { name: font.name, brand: WFChrome.brandName(font) });
        requestAnimationFrame(function () { WFCard.fit(stage, stage && stage.parentElement); ensureCtlVisible(); markCard(); });
      }, seed && seed.scrollY);
    }

    function onMd(e) { if (e.target.closest('[data-done]')) closeScrollY = window.scrollY; }
    function onInput(e) {
      const t = e.target;
      const k = t.getAttribute('data-k');
      if (k) {
        state[k] = Number(t.value);
        if (k === 'size') { state.fit = false; state.lineCap = state[k]; }
        apply();
        return;
      }
      if (t.hasAttribute('data-ink')) { state.ink = t.value; apply(); }
      if (t.hasAttribute('data-paper')) { state.paper = t.value; apply(); }
      const c = t.getAttribute('data-c');
      if (c) {
        clearTimeout(timers[c]);
        if (c === 'sub') { setContent(c, t.value); persistSoon(); }
        else timers[c] = setTimeout(function () {
          setContent(c, t.value);
          if (c === 'bg') inkFromBg(t.value);
          persistSoon();
        }, 450);
      }
      const fileSlot = t.getAttribute('data-file');
      if (fileSlot && t.files && t.files[0]) { setFile(fileSlot, t.files[0]); t.value = ''; }
    }
    function onClick(e) {
      const b = e.target.closest('button');
      if (!b || (!tpl.contains(b) && !ctl.contains(b))) return;
      const w = b.getAttribute('data-w');
      if (w) {
        state.weight = w;
        ctl.querySelectorAll('[data-w]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        if (opts.onWeight) opts.onWeight(w);
        apply();
        return;
      }
      const layer = b.getAttribute('data-layer');
      if (layer) {
        if (!state.hide) state.hide = {};
        if (state.hide[layer]) delete state.hide[layer];
        else state.hide[layer] = 1;
        applyLayers();
        persistSoon();
        return;
      }
      const set = b.getAttribute('data-set');
      if (set) {
        if (set === 'frame') { setFrame(b.getAttribute('data-v')); return; }
        state[set] = b.getAttribute('data-v');
        ctl.querySelectorAll('[data-set="' + set + '"]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        apply();
        return;
      }
      if (b.hasAttribute('data-invert')) {
        const a = state.ink || inkEl.value;
        state.ink = state.paper || paperEl.value;
        state.paper = a;
        syncColors();
        apply();
        return;
      }
      if (b.hasAttribute('data-reset')) {
        state = defaults(state.weight);
        WFCard.fillMeta(stage, { name: font.name, brand: WFChrome.brandName(font) });
        takeTpl(WFCard.applyTemplate(stage, stage.getAttribute('data-template') || 'poem'));
        return;
      }
      const wallBg = b.getAttribute('data-wall-bg');
      if (wallBg) {
        var bgInp = ctl.querySelector('[data-c="bg"]');
        if (bgInp) bgInp.value = wallBg;
        setContent('bg', wallBg);
        inkFromBg(wallBg);
        persistSoon();
        syncBgPick();
        return;
      }
      const pick = b.getAttribute('data-pick');
      if (pick) {
        const f = ctl.querySelector('[data-file="' + pick + '"]');
        if (f) f.click();
        return;
      }
      const tab = b.getAttribute('data-tab');
      if (tab) { setTab(tab); return; }
      const tplId = b.getAttribute('data-tpl');
      if (tplId) {
        takeTpl(WFCard.applyTemplate(stage, tplId), true);
        return;
      }
      if (b.hasAttribute('data-share')) { copyShare(); return; }
      if (b.hasAttribute('data-export') || b.hasAttribute('data-copy')) {
        const copy = b.hasAttribute('data-copy');
        const btns = ctl.querySelectorAll('[data-copy],[data-export]');
        btns.forEach(function (x) { x.disabled = true; });
        WFCard.exportStage(stage, { name: font.name, family: font.family, weight: state.weight, copy: copy }).then(function (out) {
          const kb = Math.round((out.bytes || 0) / 1024);
          const dim = out.label + ' · ' + out.w + '×' + out.h + ' · ' + kb + ' KB';
          const skip = out.skipped ? ' · ' + out.skipped + ' 张在线图片未能导出' : '';
          const head = copy ? (out.copied ? '已复制 ' : '这页不能复制，已下载 ') : '已导出 ';
          WFChrome.toast(head + dim + skip);
        }).catch(function () { WFChrome.toast((copy ? '复制' : '导出') + '失败，等字体加载后再试'); })
          .then(function () { btns.forEach(function (x) { x.disabled = false; }); });
        return;
      }
      if (b.hasAttribute('data-done')) setOpen(false);
    }
    [tpl, ctl].forEach(function (el) { el.addEventListener('mousedown', onMd, true); el.addEventListener('input', onInput); el.addEventListener('click', onClick); });

    syncColors();
    paintVals();
    WFCard.watch(stage);
    if (stage) stage.addEventListener('input', function (e) {
      var t = e.target; if (!t.matches || !t.matches('[data-card-name],[data-card-brand],[data-slot="sub"]')) return;
      if (t.matches('[data-slot="sub"]')) { var inp = ctl.querySelector('[data-c="sub"]'); if (inp) inp.value = t.textContent || ''; setContent('sub', t.textContent || ''); }
      persistSoon();
    });
    if (hero) hero.addEventListener('input', persistSoon);
    function isDesign() { return WFChrome.view() !== 'dev'; }
    function hideWallCard() {
      if (!hero) return;
      const hs = hero.style;
      hs.lineHeight = ''; hs.letterSpacing = ''; hs.textAlign = ''; hs.whiteSpace = '';
      WFCard.unframe(stage);
      markCard();
    }
    function shareRec() {
      const subEl = ctl.querySelector('[data-c="sub"]');
      return {
        tpl: (stage && stage.getAttribute('data-template')) || '',
        frame: (stage && stage.getAttribute('data-card')) || '',
        hero: String((hero && hero.textContent) || ''),
        sub: String((subEl && subEl.value) || '')
      };
    }
    function pushShare() {
      if (!font || !font.id || !isDesign() || !WFCard.currentKind(stage)) return;
      const path = WFCard.sharePath(font.id, shareRec());
      const now = (location.pathname.split('/').pop() || '') + location.search;
      if (now !== path) history.replaceState(null, '', path);
    }
    function copyShare() {
      if (!font || !font.id) return;
      persist();
      const rec = shareRec();
      if (!rec.tpl && !WFCard.currentKind(stage)) {
        WFChrome.toast('先做一张样张再复制链接');
        return;
      }
      if (!rec.tpl) rec.tpl = 'poem';
      WFChrome.copy(WFCard.shareUrl(font.id, rec, { view: 'design' }), '已复制样张链接');
    }
    function markCard() {
      if (opts.onCard) opts.onCard(!!WFCard.currentKind(stage));
    }
    function showBrowseCard(src) {
      if (!src) return;
      overlay(src, true);
      if (src.forceFrame) WFCard.applyFrame(stage, src.forceFrame);
      if (!src.cardName && !src.cardBrand) WFCard.fillMeta(stage, { name: font.name, brand: WFChrome.brandName(font) });
      markCard();
      requestAnimationFrame(function () { WFCard.fit(stage, stage && stage.parentElement); markCard(); });
      if (opts.onRestore) opts.onRestore({ size: state.size, weight: state.weight });
    }
    function savedCard() {
      const all = loadPref();
      return (all.fonts && font && all.fonts[font.id]) || null;
    }
    /* 分享链接只带模板和两句文案。和本机刚存的是同一张时，用完整记录，否则背景和字号会被短链接清掉。 */
    function sameShare(share, mine) {
      if (!share || !mine || !mine.tpl) return false;
      if (share.tpl && share.tpl !== mine.tpl) return false;
      if (share.frame && share.frame !== mine.frame) return false;
      if (share.hero && share.hero !== String(mine.hero || '').trim().slice(0, 80)) return false;
      if (share.sub && share.sub !== String(mine.sub || '').trim().slice(0, 80)) return false;
      return true;
    }
    function cardSeed() {
      const share = WFCard.readShare();
      const mine = savedCard();
      if (share && share.from === 'bag' && mine && mine.tpl) return mine;
      if (share && (share.tpl || share.hero || share.sub || share.frame)) {
        if (sameShare(share, mine)) return mine;
        const rec = { tpl: share.tpl || (mine && mine.tpl) || 'poem' };
        if (share.frame) rec.forceFrame = share.frame;
        if (share.hero) rec.hero = share.hero;
        if (share.sub) rec.sub = share.sub;
        return rec;
      }
      if (mine && mine.dismissed) return null;
      if (mine && mine.tpl) return mine;
      return null;
    }
    function applyWallMode() {
      if (wall && wall.classList.contains('is-editing')) {
        if (!isDesign()) setOpen(false);
        return;
      }
      if (!isDesign()) { hideWallCard(); return; }
      const seed = cardSeed();
      if (seed) showBrowseCard(seed);
      else hideWallCard();
      markCard();
    }
    function markDismissed() {
      if (!font || !font.id) return;
      const all = loadPref();
      all.fonts = all.fonts || {};
      const rec = all.fonts[font.id] || {};
      rec.dismissed = true;
      all.fonts[font.id] = rec;
      try { localStorage.setItem(PREF_KEY, JSON.stringify(all)); } catch (e) { /* ignore */ }
    }
    function clearCard() {
      hideWallCard();
      markDismissed();
      if (font && font.id) history.replaceState(null, '', 'font-detail.html?id=' + encodeURIComponent(font.id));
    }
    function sync(partial) {
      if (partial.size != null) { state.size = Number(partial.size); state.fit = false; }
      if (partial.weight != null) state.weight = String(partial.weight);
      if (WFCard.currentKind(stage)) apply();
    }
    document.addEventListener('wf:view', applyWallMode);
    applyWallMode();
    var inbound = WFCard.readShare();
    if (inbound && inbound.from === 'bag') {
      if (!isDesign()) WFChrome.setView('design');
      setOpen(true, {});
    }
    return {
      open: function (seed) { setOpen(true, seed); },
      close: function () { setOpen(false); },
      sync: sync,
      share: copyShare,
      clearCard: clearCard
    };
  }

  window.WFTester = { mount: mount };
})();
