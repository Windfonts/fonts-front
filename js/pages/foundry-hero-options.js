/* 厂商顶部整页方案对照。 */
(function () {
  const blocks = document.querySelectorAll('.hc-block');
  const links = document.querySelectorAll('.hc-switch .seg-glyph a');

  function show(id) {
    let found = false;
    blocks.forEach(function (el) {
      const on = el.id === id;
      el.classList.toggle('is-on', on);
      if (on) found = true;
    });
    if (!found) {
      show('a');
      return;
    }
    links.forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('href') === '#' + id);
    });
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
  }

  function fromHash() {
    const id = (location.hash || '#a').replace(/^#/, '') || 'a';
    show(document.getElementById(id) ? id : 'a');
  }

  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      const id = (a.getAttribute('href') || '').replace(/^#/, '');
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      show(id);
    });
  });

  window.addEventListener('hashchange', fromHash);
  fromHash();

  function stubFont(info) {
    return { ownerInfo: info, foundryInfo: info, makerInfo: info };
  }

  function groups(list) {
    const map = {};
    function ensure(info) {
      if (!info || !info.id) return null;
      if (!map[info.id]) {
        map[info.id] = {
          slug: info.id, name: info.name, info: info, font: stubFont(info),
          fonts: [], made: [], kind: info.kind || ''
        };
      }
      return map[info.id];
    }
    list.forEach(function (f) {
      const owner = f.ownerInfo || f.foundryInfo;
      const maker = f.makerInfo;
      const og = ensure(owner);
      if (og && og.fonts.indexOf(f) === -1) {
        og.fonts.push(f);
        if (og.fonts.length === 1) og.font = f;
      }
      if (maker && maker.id && owner && maker.id !== owner.id) {
        const mg = ensure(maker);
        if (mg && mg.fonts.indexOf(f) === -1 && mg.made.indexOf(f) === -1) mg.made.push(f);
      }
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function setText(sel, n) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.textContent = String(n);
    });
  }

  function kindButtons(buckets, extra) {
    const primary = [
      ['', '全部', null],
      ['foundry', '字库', buckets.foundry],
      ['brand', '品牌方', buckets.brand],
      ['author', '作者', buckets.author],
      ['project', '开源项目', buckets.project],
      ['platform', '素材平台', buckets.platform]
    ];
    let html = primary.map(function (row, i) {
      const n = row[2] == null ? '' : '<span class="n">' + row[2] + '</span>';
      return '<button type="button"' + (i === 0 ? ' class="is-on"' : '') + ' disabled>' +
        row[1] + n + '</button>';
    }).join('');
    if (extra) {
      html += '<span class="foundry-kinds-gap" aria-hidden="true"></span>' +
        '<button type="button" disabled>仅受托<span class="n">' + buckets.commissioned + '</span></button>' +
        '<button type="button" disabled>未核对<span class="n">' + buckets.unlisted + '</span></button>';
    }
    return html;
  }

  WFProto.loadCatalog().then(function (list) {
    const gs = groups(list).sort(function (a, b) {
      return b.fonts.length - a.fonts.length || a.name.localeCompare(b.name, 'zh');
    });
    const buckets = {
      foundry: 0, brand: 0, author: 0, project: 0, platform: 0,
      commissioned: 0, unlisted: 0
    };
    let listed = 0;
    gs.forEach(function (g) {
      if ((g.info && g.info.unlisted) || !g.kind) {
        buckets.unlisted++;
        return;
      }
      if (!g.fonts.length && g.made.length) {
        buckets.commissioned++;
        return;
      }
      listed++;
      if (buckets[g.kind] != null) buckets[g.kind]++;
    });

    setText('[data-listed-n]', listed);
    setText('[data-n-foundry]', buckets.foundry);
    setText('[data-n-brand]', buckets.brand);
    setText('[data-n-author]', buckets.author);
    setText('[data-n-project]', buckets.project);
    setText('[data-n-platform]', buckets.platform);
    setText('[data-n-extra]', buckets.commissioned + buckets.unlisted);

    document.querySelectorAll('[data-kind-btns]').forEach(function (el) {
      el.innerHTML = kindButtons(buckets, true);
    });

    function cards(kind, n) {
      return gs.filter(function (g) { return g.kind === kind && g.fonts.length; })
        .slice(0, n)
        .map(function (g) {
          return WFChrome.foundryHtml(g.font, { sub: '归属 ' + g.fonts.length + ' 款' });
        }).join('');
    }

    document.querySelectorAll('[data-peek-cards]').forEach(function (el) {
      el.innerHTML = cards('foundry', 3);
    });
    document.querySelectorAll('[data-peek-cards-b]').forEach(function (el) {
      el.innerHTML = cards('brand', 3);
    });
  });
})();
