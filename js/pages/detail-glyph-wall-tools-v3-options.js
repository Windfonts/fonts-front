/* 字符表工具条 v3：切 hash + 轻交互。不改现页。 */
(function () {
  var VALID = { ren: 1, gui: 1, zi: 1, chou: 1 };

  function mark() {
    var id = (location.hash || '#ren').replace('#', '') || 'ren';
    if (!VALID[id]) id = 'ren';
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
          if (b.hasAttribute('aria-pressed')) {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          }
        });
        // update shell summaries
        var details = btn.closest('details');
        if (details) {
          var sum = details.querySelector('summary');
          if (sum) sum.childNodes[0].nodeValue = btn.textContent.trim();
          details.open = false;
        }
        refreshDrawerSum(btn.closest('.dgwt3-head-drawer') || btn.closest('.panel'));
      });
    });
  }

  function refreshDrawerSum(host) {
    if (!host) return;
    var sum = host.querySelector('.dgwt3-drawer-sum');
    if (!sum) return;
    var parts = [];
    host.querySelectorAll('.dgwt3-drawer-row').forEach(function (row) {
      var on = row.querySelector('button.is-on');
      if (on) parts.push(on.textContent.trim());
    });
    if (parts.length) sum.textContent = parts.join(' · ');
  }

  function wireDrawer() {
    document.querySelectorAll('[data-drawer-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var head = btn.closest('.dgwt3-head-drawer');
        if (!head) return;
        var open = !head.classList.contains('is-open');
        // ensure panel exists when opening a closed stage
        if (open && !head.querySelector('.dgwt3-drawer-panel')) {
          var panel = document.createElement('div');
          panel.className = 'dgwt3-drawer-panel';
          panel.setAttribute('role', 'region');
          panel.setAttribute('aria-label', '字表设置');
          panel.innerHTML =
            '<div class="dgwt3-drawer-col"><p class="dgwt3-drawer-label">字表</p>' +
            '<div class="dgwt3-drawer-row" role="group" aria-label="字表">' +
            '<button type="button" class="is-on">千字文</button><button type="button">常用字</button></div></div>' +
            '<div class="dgwt3-drawer-col"><p class="dgwt3-drawer-label">写法</p>' +
            '<div class="dgwt3-drawer-row" role="group" aria-label="写法">' +
            '<button type="button" class="is-on">简</button><button type="button">繁</button></div></div>' +
            '<div class="dgwt3-drawer-col"><p class="dgwt3-drawer-label">筛选</p>' +
            '<div class="dgwt3-drawer-row" role="group" aria-label="筛选">' +
            '<button type="button" class="is-on">全部</button><button type="button">已收录</button><button type="button">缺字</button></div></div>';
          head.appendChild(panel);
          wireSeg(panel);
        }
        head.classList.toggle('is-open', open);
        btn.classList.toggle('is-on', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  function wireScriptToggle() {
    document.querySelectorAll('[data-script-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var isHans = btn.textContent.trim() === '简';
        btn.textContent = isHans ? '繁' : '简';
        btn.setAttribute('aria-label', isHans ? '繁体，点按切简' : '简体，点按切繁');
      });
    });
  }

  if (window.WFChrome && WFChrome.mountTopbar) WFChrome.mountTopbar();
  if (!location.hash || !VALID[location.hash.replace('#', '')]) {
    history.replaceState(null, '', '#ren');
  }
  mark();
  window.addEventListener('hashchange', mark);
  document.querySelectorAll('.dgwt3-stage').forEach(wireSeg);
  wireDrawer();
  wireScriptToggle();
})();
