/* wide-lab — collection shell: tabs + iframe; children keep deep URLs */
(function () {
  'use strict';

  var TABS = {
    guide: { src: 'styleguide.html', title: '样式指南 · 宽阅读 · 文风字体', label: '样式指南' },
    yong: { src: 'yong-wall.html', title: '永字墙 · 宽阅读 · 文风字体', label: '永字墙' },
    lineage: { src: 'lineage.html', title: '谱系 · 宽阅读 · 文风字体', label: '谱系' }
  };
  var DEFAULT_TAB = 'guide';
  var PASS_KEYS = ['mode', 'group', 'focus', 'q', 'filter', 'id', 'fam'];

  function qs() {
    try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(); }
  }

  function readTab(params) {
    var t = (params.get('tab') || '').toLowerCase();
    if (TABS[t]) return t;
    var h = (location.hash || '').replace(/^#/, '').toLowerCase();
    if (TABS[h]) return h;
    return DEFAULT_TAB;
  }

  function childSrc(tab, params) {
    var base = TABS[tab].src;
    var out = new URLSearchParams();
    PASS_KEYS.forEach(function (k) {
      var v = params.get(k);
      if (v != null && v !== '') out.set(k, v);
    });
    // Prefer child-specific hash fragments (e.g. styleguide #color) when present
    // and not a tab name.
    var hash = (location.hash || '').replace(/^#/, '');
    var hashPart = '';
    if (hash && !TABS[hash.toLowerCase()]) hashPart = '#' + hash;
    var q = out.toString();
    return base + (q ? '?' + q : '') + hashPart;
  }

  function setUrl(tab, params, replace) {
    var next = new URL(location.href);
    next.searchParams.set('tab', tab);
    PASS_KEYS.forEach(function (k) {
      var v = params.get(k);
      if (v != null && v !== '') next.searchParams.set(k, v);
      else next.searchParams.delete(k);
    });
    // Drop bare tab hashes so ?tab= wins
    if (TABS[(next.hash || '').replace(/^#/, '').toLowerCase()]) next.hash = '';
    var fn = replace ? 'replaceState' : 'pushState';
    history[fn]({ tab: tab }, '', next.pathname + next.search + next.hash);
  }

  function hideChildChrome(frame) {
    try {
      var doc = frame.contentDocument;
      if (!doc) return;
      var style = doc.getElementById('wl-embed-hide');
      if (!style) {
        style = doc.createElement('style');
        style.id = 'wl-embed-hide';
        style.textContent =
          'header[data-topbar], #wfExtraFooter, footer.site-footer, .site-footer { display: none !important; }' +
          'body { padding-top: 0 !important; }';
        (doc.head || doc.documentElement).appendChild(style);
      }
    } catch (e) { /* ignore */ }
  }

  function activate(tab, params, opts) {
    opts = opts || {};
    var meta = TABS[tab] || TABS[DEFAULT_TAB];
    tab = TABS[tab] ? tab : DEFAULT_TAB;

    document.querySelectorAll('.wl-tab').forEach(function (el) {
      var on = el.getAttribute('data-tab') === tab;
      el.classList.toggle('is-on', on);
      el.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    document.title = meta.title;

    var frame = document.getElementById('wlFrame');
    var nextSrc = childSrc(tab, params);
    // Avoid reload if same path+query (allow hash-only updates via replace)
    var cur = frame.getAttribute('data-src') || '';
    if (cur !== nextSrc) {
      frame.setAttribute('data-src', nextSrc);
      frame.src = nextSrc;
    }

    if (!opts.skipUrl) setUrl(tab, params, !!opts.replace);
  }

  function boot() {
    var params = qs();
    var tab = readTab(params);
    var frame = document.getElementById('wlFrame');

    frame.addEventListener('load', function () { hideChildChrome(frame); });

    document.querySelectorAll('.wl-tab').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        ev.preventDefault();
        var t = el.getAttribute('data-tab');
        if (!TABS[t]) return;
        // Keep passthrough keys when switching tabs (harmless if unused)
        activate(t, qs(), { replace: false });
      });
    });

    window.addEventListener('popstate', function () {
      var p = qs();
      activate(readTab(p), p, { skipUrl: true });
    });

    activate(tab, params, { replace: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
