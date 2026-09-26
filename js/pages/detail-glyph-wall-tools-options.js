/* 字符表工具条密度对照：切 hash。不改现页。 */
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
  if (window.WFChrome && WFChrome.mountTopbar) WFChrome.mountTopbar();
  if (!location.hash) history.replaceState(null, '', '#a');
  mark();
  window.addEventListener('hashchange', mark);

  /* 乙：菜单内点选时更新 summary 摘要（静态演示） */
  document.querySelectorAll('.dgwt-b .gtoggle-menu').forEach(function (menu) {
    menu.addEventListener('click', function (e) {
      const btn = e.target.closest ? e.target.closest('button') : null;
      if (!btn || !menu.contains(btn)) return;
      const group = btn.closest('.seg-glyph');
      if (!group) return;
      group.querySelectorAll('button').forEach(function (b) {
        b.classList.toggle('is-on', b === btn);
      });
      const sc = menu.querySelector('[aria-label="写法"] button.is-on');
      const f = menu.querySelector('[aria-label="筛选"] button.is-on');
      const sum = menu.querySelector('summary');
      if (sum && sc && f) {
        sum.childNodes[0].nodeValue = sc.textContent + ' · ' + f.textContent;
      }
    });
  });
})();
