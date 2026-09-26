/* 戊文案 tabs 适用点审计：切 hash + 组内互斥点击。不改现页。 */
(function () {
  function markNav() {
    const id = (location.hash || '#glyph-tools').replace('#', '') || 'glyph-tools';
    document.querySelectorAll('.do-switch .seg-glyph a').forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('href') === '#' + id);
    });
  }

  function bindGroups(root) {
    (root || document).querySelectorAll('[role="group"], [role="toolbar"]').forEach(function (group) {
      if (group.getAttribute('data-dta-bound')) return;
      group.setAttribute('data-dta-bound', '1');
      group.addEventListener('click', function (ev) {
        const t = ev.target.closest('button, a');
        if (!t || !group.contains(t)) return;
        if (t.tagName === 'A' && t.getAttribute('href') === '#grades') {
          ev.preventDefault();
        }
        const scope = t.closest('.lab-ttab, [role="group"]') || group;
        scope.querySelectorAll('button, a').forEach(function (x) {
          x.classList.toggle('is-on', x === t);
          if (x === t) x.setAttribute('aria-current', x.tagName === 'A' ? 'page' : 'true');
          else x.removeAttribute('aria-current');
        });
      });
    });
  }

  if (window.WFChrome && WFChrome.mountTopbar) WFChrome.mountTopbar();
  if (!location.hash) history.replaceState(null, '', '#glyph-tools');
  markNav();
  bindGroups();
  window.addEventListener('hashchange', markNav);
})();
