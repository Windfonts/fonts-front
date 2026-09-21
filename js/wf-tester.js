(function () {
  const esc = function (s) { return WFProto.escapeHtml(s); };
  const PREF_KEY = 'wf-card-pref.v1';
  const TWEAK = ['size', 'leading', 'tracking', 'face', 'zoom', 'bgx', 'bgy', 'scrim'];
  function loadPref() {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function durable(v) {
    v = String(v || '').trim();
    return !v || /^(blob|data):/i.test(v) ? '' : v.slice(0, 240);
  }
  function defaults(weight) {
    return { size: 64, leading: 1.35, tracking: 0.02, weight: String(weight || 400), align: 'left', wrap: true, fit: false, ink: '', paper: '', face: 88, zoom: 1, bgx: 50, bgy: 50, scrim: 62 };
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
    const typeBody = field('sub', 'text', '副文字 / 署名', 0) +
      '<div class="tester-toolbar">' + wt + pills('align', [['left', '左'], ['center', '中'], ['right', '右']], state.align) + '</div>' +
      '<div class="tester-sliders tester-cols-2">' + slider('size', '字号', 12, 240, 1, state.size) +
        slider('leading', '行距', 0.8, 2.4, 0.05, state.leading) + slider('tracking', '字距', -0.12, 0.24, 0.005, state.tracking) + '</div>' + colors;
    const mediaBody = field('avatar', 'email', '邮箱，取 Cravatar', 1) + field('bg', 'url', '图片地址', 1) +
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
      '<div class="tester-foot">' +
      '<button type="button" class="btn btn-ink" data-export>' + WFChrome.icon('download') + '导出图</button>' +
      '<button type="button" class="btn" data-done>完成</button></div></div>'
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
          note(slot === 'avatar' ? '这个邮箱在 Cravatar 没有头像' : '背景图加载失败');
          return;
        }
        if (kind === 'preview') note('预览可以，导出请改上传（来源未开放跨域）');
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
    function apply() {
      if (!hero) return;
      if (state.fit) fitText();
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
      }
      paintVals();
      persistSoon();
    }
    function syncColors() { inkEl.value = state.ink || tokenHex('--ink', '#111111'); paperEl.value = state.paper || tokenHex('--paper', '#ffffff'); }
    function setTab(id) {
      ctl.querySelectorAll('[data-tab]').forEach(function (b) { var on = b.getAttribute('data-tab') === id; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      ctl.querySelectorAll('[data-panel]').forEach(function (pn) { pn.hidden = pn.getAttribute('data-panel') !== id; });
    }
    function syncUi() {
      ctl.querySelectorAll('[data-k]').forEach(function (el) { el.value = String(state[el.getAttribute('data-k')]); });
      ctl.querySelectorAll('[data-w]').forEach(function (el) { el.classList.toggle('is-on', el.getAttribute('data-w') === state.weight); });
      ctl.querySelectorAll('[data-set]').forEach(function (el) {
        el.classList.toggle('is-on', el.getAttribute('data-v') === String(state[el.getAttribute('data-set')]));
      });
      syncColors();
      apply();
    }
    function takeTpl(T) {
      if (!T) return;
      state.size = T.size; state.leading = T.leading; state.tracking = T.tracking;
      state.align = T.align; state.wrap = !!T.wrap; state.fit = !!T.fit;
      state.face = T.face || 88; state.zoom = 1; state.bgx = 50; state.bgy = 50; state.scrim = 62;
      state.ink = T.invert ? tokenHex('--paper', '#ffffff') : '';
      state.paper = T.invert ? tokenHex('--ink', '#111111') : '';
      if (T.hero) hero.textContent = T.hero;
      const subEl = ctl.querySelector('[data-c="sub"]');
      if (T.sub !== undefined && subEl) { subEl.value = T.sub; setContent('sub', T.sub); }
      syncUi();
      WFCard.paintStudio(tpl, stage);
    }
    function overlay(src, keepHero) {
      takeTpl(WFCard.applyTemplate(stage, src.tpl));
      if (keepHero && src.hero != null) hero.textContent = String(src.hero);
      TWEAK.forEach(function (k) { if (src[k] != null) state[k] = Number(src[k]); });
      if (src.align) state.align = src.align;
      if (src.ink != null) state.ink = src.ink;
      if (src.paper != null) state.paper = src.paper;
      if (src.wrap !== undefined) state.wrap = !!src.wrap;
      if (src.fit !== undefined) state.fit = !!src.fit;
      if (src.weight) state.weight = String(src.weight);
      ['sub', 'avatar', 'bg'].forEach(function (k) {
        const el = ctl.querySelector('[data-c="' + k + '"]');
        if (el) { el.value = durable(src[k]); setContent(k, el.value); }
      });
      [['cardName','[data-card-name]'],['cardBrand','[data-card-brand]']].forEach(function (p) { if (src[p[0]] == null) return; var el = stage.querySelector(p[1]); if (el) el.textContent = src[p[0]]; });
      syncUi();
    }
    function persist() {
      if (!font || !font.id) return;
      const rec = {
        tpl: (stage && stage.getAttribute('data-template')) || 'poem',
        align: state.align, wrap: !!state.wrap, fit: !!state.fit,
        ink: state.ink || '', paper: state.paper || '', weight: String(state.weight || ''),
        hero: String((hero && hero.textContent) || '').slice(0, 200)
      };
      TWEAK.forEach(function (k) { rec[k] = state[k]; });
      ctl.querySelectorAll('[data-c]').forEach(function (el) { rec[el.getAttribute('data-c')] = durable(el.value); });
      var ne = stage && stage.querySelector('[data-card-name]'), be = stage && stage.querySelector('[data-card-brand]');
      rec.cardName = durable(ne && ne.textContent); rec.cardBrand = durable(be && be.textContent);
      const all = loadPref();
      all.fonts = all.fonts || {};
      all.fonts[font.id] = rec;
      TWEAK.concat(['tpl', 'align', 'wrap', 'fit', 'ink', 'paper', 'weight', 'sub', 'avatar', 'bg', 'cardName', 'cardBrand']).forEach(function (k) { all[k] = rec[k]; });
      try { localStorage.setItem(PREF_KEY, JSON.stringify(all)); } catch (e) { /* ignore */ }
    }
    function persistSoon() { if (ctl.hidden) return; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 220); }
    function release() {
      const hs = hero.style;
      hs.lineHeight = ''; hs.letterSpacing = ''; hs.textAlign = ''; hs.whiteSpace = '';
      WFCard.unframe(stage);
    }
    function setOpen(on, seed) {
      if (!on) {
        persist();
        WFChrome.holdScroll(wall, function () {
          if (wall) wall.classList.remove('is-editing');
          setShown(false);
          if (bar) bar.hidden = false;
          release();
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
        requestAnimationFrame(function () { WFCard.fit(stage, stage && stage.parentElement); ensureCtlVisible(); });
      }, seed && seed.scrollY);
    }

    function onMd(e) { if (e.target.closest('[data-done]')) closeScrollY = window.scrollY; }
    function onInput(e) {
      const t = e.target;
      const k = t.getAttribute('data-k');
      if (k) {
        state[k] = Number(t.value);
        if (k === 'size') state.fit = false;
        apply();
        return;
      }
      if (t.hasAttribute('data-ink')) { state.ink = t.value; apply(); }
      if (t.hasAttribute('data-paper')) { state.paper = t.value; apply(); }
      const c = t.getAttribute('data-c');
      if (c) {
        clearTimeout(timers[c]);
        if (c === 'sub') { setContent(c, t.value); persistSoon(); }
        else timers[c] = setTimeout(function () { setContent(c, t.value); persistSoon(); }, 450);
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
      const set = b.getAttribute('data-set');
      if (set) {
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
      const pick = b.getAttribute('data-pick');
      if (pick) {
        const f = ctl.querySelector('[data-file="' + pick + '"]');
        if (f) f.click();
        return;
      }
      const tab = b.getAttribute('data-tab');
      if (tab) { setTab(tab); return; }
      const tpl = b.getAttribute('data-tpl');
      if (tpl) {
        takeTpl(WFCard.applyTemplate(stage, tpl));
        return;
      }
      if (b.hasAttribute('data-export')) {
        WFCard.exportStage(stage, { name: font.name, family: font.family, weight: state.weight }).then(function (out) {
          const kb = Math.round((out.bytes || 0) / 1024);
          WFChrome.toast('已导出 ' + out.label + ' · ' + out.w + '×' + out.h + ' · ' + kb + ' KB' +
            (out.skipped ? ' · ' + out.skipped + ' 张图片来源未开放跨域，未画入' : ''));
        }).catch(function () { WFChrome.toast('导出失败，等字体加载后再试'); });
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
    return { open: function (seed) { setOpen(true, seed); }, close: function () { setOpen(false); } };
  }

  window.WFTester = { mount: mount };
})();
