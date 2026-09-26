/* 字符表工具条结构 v2：切 hash + 轻交互演示。不改现页。 */
(function () {
  var VALID = { wu: 1, ji: 1, geng: 1, xin: 1 };

  function mark() {
    var id = (location.hash || '#wu').replace('#', '') || 'wu';
    if (!VALID[id]) id = 'wu';
    document.querySelectorAll('.do-block').forEach(function (el) {
      el.classList.toggle('is-on', el.id === id);
    });
    document.querySelectorAll('.do-switch .seg-glyph a').forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('href') === '#' + id);
    });
  }

  function wireSeg(root) {
    if (!root) return;
    root.querySelectorAll('[role="group"]').forEach(function (group) {
      group.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('button') : null;
        if (!btn || !group.contains(btn)) return;
        group.querySelectorAll('button').forEach(function (b) {
          b.classList.toggle('is-on', b === btn);
        });
        refreshChipSum(btn.closest('.dgwt2-chip') || btn.closest('.dgwt2-filter-pop'));
        refreshSecBar(btn.closest('.panel') || btn.closest('section'));
      });
    });
  }

  function refreshChipSum(host) {
    if (!host) return;
    var sum = host.querySelector('.dgwt2-chip-sum');
    if (!sum) return;
    var parts = [];
    host.querySelectorAll('.dgwt2-pop-row').forEach(function (row) {
      var on = row.querySelector('button.is-on');
      if (on) parts.push(on.textContent.trim());
    });
    if (parts.length) sum.textContent = parts.join(' · ');
  }

  function refreshSecBar(panel) {
    if (!panel) return;
    var bar = panel.querySelector('.dgwt2-sec-bar');
    if (!bar) return;
    var sc = panel.querySelector('.dgwt2-pop-row[aria-label="写法"] button.is-on');
    var f = panel.querySelector('.dgwt2-pop-row[aria-label="筛选"] button.is-on');
    if (sc) {
      var scSlot = bar.querySelector('span:first-child');
      if (scSlot) scSlot.innerHTML = '写法 <b>' + sc.textContent.trim() + '</b>';
    }
    if (f) {
      var fSlot = bar.querySelector('span:last-child');
      if (fSlot) fSlot.innerHTML = '显示 <b>' + f.textContent.trim() + '</b>';
    }
  }

  function wireFilterPop() {
    document.querySelectorAll('.dgwt2-filter-pop').forEach(function (pop) {
      var btn = pop.querySelector('.dgwt2-icon-btn');
      var panel = pop.querySelector('.dgwt2-pop');
      if (!btn || !panel) return;
      btn.addEventListener('click', function () {
        var open = !pop.classList.contains('is-open');
        pop.classList.toggle('is-open', open);
        btn.classList.toggle('is-on', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (panel.hasAttribute('hidden')) {
          if (open) panel.removeAttribute('hidden');
        } else if (!open) {
          panel.setAttribute('hidden', '');
        } else {
          panel.removeAttribute('hidden');
        }
      });
    });
  }

  if (window.WFChrome && WFChrome.mountTopbar) WFChrome.mountTopbar();
  if (!location.hash || !VALID[location.hash.replace('#', '')]) {
    history.replaceState(null, '', '#wu');
  }
  mark();
  window.addEventListener('hashchange', mark);
  document.querySelectorAll('.dgwt2-stage').forEach(wireSeg);
  wireFilterPop();
})();
