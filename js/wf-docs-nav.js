/* 说明页左侧目录 + 右侧相关：关于 / 设计指南 / 认领 / 条款。文档是独立页，不走这里。依赖 wf-chrome.js */
(function () {
  const GROUPS = [
    {
      title: '本站',
      items: [
        { id: 'about', label: '关于', path: 'about.html' },
        { id: 'styleguide', label: '设计指南', path: 'styleguide.html' },
        { id: 'claim', label: '认领厂商', path: 'claim.html' },
        { id: 'faq', label: '常见问题', path: 'faq.html' }
      ]
    },
    {
      title: '许可',
      items: [
        { id: 'license', label: '许可说明', path: 'license.html' },
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

  const EXTRA = [
    { id: 'docs', label: '接入文档', path: 'docs.html' },
    { id: 'fonts', label: '字体库', path: 'fonts.html' }
  ];

  function locate(id) {
    let i, j;
    for (i = 0; i < GROUPS.length; i++) {
      for (j = 0; j < GROUPS[i].items.length; j++) {
        if (GROUPS[i].items[j].id === id) return { group: GROUPS[i], item: GROUPS[i].items[j] };
      }
    }
    return { group: GROUPS[0], item: GROUPS[0].items[0] };
  }

  function asideItems(id) {
    const cur = locate(id);
    const seen = {};
    const out = [];
    function push(it) {
      if (!it || it.id === id || seen[it.id]) return;
      seen[it.id] = true;
      out.push(it);
    }
    cur.group.items.forEach(push);
    EXTRA.forEach(push);
    GROUPS.forEach(function (g) {
      if (g === cur.group) return;
      g.items.slice(0, 1).forEach(push);
    });
    return out.slice(0, 6);
  }

  function renderNav(el, hint) {
    const id = hint || '';
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

  function renderAside(el, hint) {
    const id = hint || el.getAttribute('data-docs-aside') || '';
    const links = asideItems(id);
    el.classList.add('docs-aside');
    el.innerHTML =
      '<h2>相关</h2>' +
      links.map(function (it) {
        return '<a href="' + WFChrome.href(it.path) + '">' + it.label + '</a>';
      }).join('') +
      '<p class="hint">侧栏可切换本站说明、许可与法律页。</p>';
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
    renderNav(el, hint);
    window.addEventListener('hashchange', function () { renderNav(el, hint); });
  }

  function setActive(id) {
    document.querySelectorAll('[data-docs-nav]').forEach(function (el) {
      renderNav(el, id);
    });
    document.querySelectorAll('[data-docs-aside]').forEach(function (el) {
      renderAside(el, id || el.getAttribute('data-docs-aside'));
    });
  }

  document.querySelectorAll('[data-docs-nav]').forEach(function (el) {
    mount(el, el.getAttribute('data-docs-nav'));
  });
  document.querySelectorAll('[data-docs-aside]').forEach(function (el) {
    renderAside(el, el.getAttribute('data-docs-aside'));
  });

  window.WFDocsNav = { mount: mount, setActive: setActive };
})();
