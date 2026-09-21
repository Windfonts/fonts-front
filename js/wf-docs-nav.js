/* 说明页左侧目录：关于 / 认领 / 条款。文档是独立页，不走这里。依赖 wf-chrome.js */
(function () {
  const GROUPS = [
    {
      title: '本站',
      items: [
        { id: 'about', label: '关于', path: 'about.html' },
        { id: 'claim', label: '认领厂商', path: 'claim.html' }
      ]
    },
    {
      title: '许可',
      items: [
        { id: 'license', label: '许可说明', path: 'docs.html#license' },
        { id: 'upload-terms', label: '上传条款', path: 'upload-terms.html' }
      ]
    },
    {
      title: '法律',
      items: [
        { id: 'disclaimer', label: '免责', path: 'disclaimer.html' },
        { id: 'privacy', label: '隐私', path: 'privacy.html' },
        { id: 'terms', label: '服务条款', path: 'terms.html' },
        { id: 'trademark', label: '商标', path: 'trademark.html' }
      ]
    }
  ];

  function fromHash() {
    const h = (location.hash || '').replace('#', '');
    if (h.indexOf('license') === 0) return 'license';
    return '';
  }

  function locate(id) {
    let i, j;
    for (i = 0; i < GROUPS.length; i++) {
      for (j = 0; j < GROUPS[i].items.length; j++) {
        if (GROUPS[i].items[j].id === id) return { group: GROUPS[i], item: GROUPS[i].items[j] };
      }
    }
    return { group: GROUPS[0], item: GROUPS[0].items[0] };
  }

  function render(el, hint) {
    const id = fromHash() || hint || '';
    const cur = locate(id);
    el.classList.add('docs-nav');
    el.classList.remove('is-open');
    el.innerHTML =
      '<button type="button" class="docs-nav-switch" aria-expanded="false" aria-controls="docsNavPanel">' +
        '<span class="docs-nav-switch-now">' + cur.item.label + '</span>' +
        '<span class="docs-nav-switch-meta"><span>' + cur.group.title + '</span><span class="docs-nav-caret" aria-hidden="true"></span></span>' +
      '</button>' +
      '<button type="button" class="docs-nav-dim" hidden aria-label="关闭目录"></button>' +
      '<div class="docs-nav-panel" id="docsNavPanel">' +
        GROUPS.map(function (g) {
          return '<section class="docs-nav-group"><div class="docs-nav-title">' + g.title + '</div>' +
            g.items.map(function (it) {
              return '<a href="' + WFChrome.href(it.path) + '"' + (it.id === id ? ' class="is-on" aria-current="page"' : '') + '>' + it.label + '</a>';
            }).join('') +
            '</section>';
        }).join('') +
      '</div>';
    bind(el);
  }

  function bind(el) {
    const sw = el.querySelector('.docs-nav-switch');
    const dim = el.querySelector('.docs-nav-dim');
    function open(on) {
      el.classList.toggle('is-open', on);
      if (sw) sw.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (dim) dim.hidden = !on;
    }
    if (sw) sw.addEventListener('click', function () { open(!el.classList.contains('is-open')); });
    if (dim) dim.addEventListener('click', function () { open(false); });
  }

  function mount(el, hint) {
    if (!el) return;
    render(el, hint);
    window.addEventListener('hashchange', function () { render(el, hint); });
  }

  function setActive(id) {
    document.querySelectorAll('[data-docs-nav]').forEach(function (el) {
      render(el, id);
    });
  }

  document.querySelectorAll('[data-docs-nav]').forEach(function (el) {
    mount(el, el.getAttribute('data-docs-nav'));
  });

  window.WFDocsNav = { mount: mount, setActive: setActive };
})();
