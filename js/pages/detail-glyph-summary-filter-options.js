/* 字符表摘要 / 筛选冗余对照：切 hash + 舞台内胶囊互斥。不改现页。 */
(function () {
  function mark() {
    const id = (location.hash || '#a').replace('#', '') || 'a';
    document.querySelectorAll('.do-block').forEach(function (el) {
      el.classList.toggle('is-on', el.id === id);
    });
    document.querySelectorAll('.do-switch .seg-glyph a').forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('href') === '#' + id);
    });
  }

  function bindFilters() {
    document.querySelectorAll('.dgsf-stage .glyph-filter, .dgsf-stage .glyph-filter-soft').forEach(function (group) {
      group.addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-f]');
        if (!btn || !group.contains(btn)) return;
        e.preventDefault();
        group.querySelectorAll('button[data-f]').forEach(function (b) {
          b.classList.toggle('is-on', b === btn);
        });
      });
    });
  }

  if (window.WFChrome && WFChrome.mountTopbar) WFChrome.mountTopbar();
  if (!location.hash) history.replaceState(null, '', '#a');
  mark();
  bindFilters();
  window.addEventListener('hashchange', mark);
})();
