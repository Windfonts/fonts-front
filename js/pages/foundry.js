/* 厂商：索引（无 slug）/ 单厂商页（?slug=） */
(function () {
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('foundryRoot');

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
          fonts: [], made: [], claimed: !!info.claimed, kind: info.kind || ''
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

  function findFontByName(list, name) {
    return WFChrome.findFontByName(list, name);
  }

  function collectOrigins(fonts) {
    const map = {};
    fonts.forEach(function (f) {
      const L = f.lineage || {};
      if (L.relation !== 'fork' && L.relation !== 'locale') return;
      if (!L.upstreamName && !L.upstreamOwnerInfo) return;
      const oid = (L.upstreamOwnerInfo && L.upstreamOwnerInfo.id) || '';
      const key = oid + '\0' + (L.upstreamName || '') + '\0' + (L.group || '');
      if (!map[key]) {
        map[key] = {
          owner: L.upstreamOwnerInfo,
          upstreamName: L.upstreamName,
          group: L.group,
          groupName: L.groupName,
          n: 0
        };
      }
      map[key].n++;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function collectForkEcosystem(list, slug) {
    const map = {};
    list.forEach(function (f) {
      const L = f.lineage || {};
      if (L.relation !== 'fork') return;
      const up = L.upstreamOwnerInfo;
      if (!up || up.id !== slug || !L.group) return;
      if (!map[L.group]) {
        map[L.group] = {
          group: L.group,
          groupName: L.groupName,
          upstreamName: L.upstreamName,
          n: 0
        };
      }
      map[L.group].n++;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function upstreamChip(list, row) {
    const up = row.owner;
    const font = findFontByName(list, row.upstreamName);
    const avatar = up
      ? WFChrome.brandAvatar(font || stubFont(up), up)
      : '';
    const mark = up
      ? (avatar
        ? '<img src="' + esc(avatar) + '" alt="" width="24" height="24" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{className:\'mark\',textContent:' + JSON.stringify((up.short || up.name || '?').charAt(0)) + '}))" />'
        : '<span class="mark">' + esc((up.short || up.name || '?').charAt(0)) + '</span>')
      : '';
    const who = up
      ? '<a class="foundry-upstream-who" href="' + WFChrome.href('foundry.html?slug=' + encodeURIComponent(up.id)) + '">' +
          mark + '<span>' + esc(up.short || up.name) + '</span></a>'
      : '';
    const what = row.upstreamName
      ? (font
        ? '<a href="' + WFChrome.href(WFProto.detailHref(font)) + '">' + esc(row.upstreamName) + '</a>'
        : esc(row.upstreamName))
      : (row.groupName ? esc(row.groupName) : '');
    const kin = row.group
      ? ' · <a class="more" href="' + WFChrome.href('fonts.html?lineage=' + encodeURIComponent(row.group)) + '">' + WFChrome.icon('compare') + '同支 ' + row.n + ' 款</a>'
      : (row.n > 1 ? ' · 本站 ' + row.n + ' 款' : '');
    const sep = who && what ? '<span class="foundry-upstream-sep"> · </span>' : '';
    return '<span class="foundry-upstream-item">' + who + sep + what + kin + '</span>';
  }

  function originsStrip(list, g) {
    const rows = collectOrigins(g.fonts);
    if (!rows.length) return '';
    if (g.kind !== 'author' && g.kind !== 'project' && g.kind !== 'platform') return '';
    return '<div class="foundry-origins">' +
      '<span class="foundry-origins-label">' + WFChrome.icon('commit') + '改自</span>' +
      rows.map(function (row) { return upstreamChip(list, row); }).join('') +
    '</div>';
  }

  function ecosystemStrip(list, slug) {
    const rows = collectForkEcosystem(list, slug);
    if (!rows.length) return '';
    const total = rows.reduce(function (n, r) { return n + r.n; }, 0);
    return '<div class="foundry-origins foundry-eco">' +
      '<span class="foundry-origins-label">' + WFChrome.icon('branch') + '站内派生</span>' +
      '<span class="foundry-upstream-item">从开源线改出来的，共 <strong>' + total + '</strong> 款 · ' +
      rows.map(function (row) {
        return '<a href="' + WFChrome.href('fonts.html?lineage=' + encodeURIComponent(row.group)) + '">' +
          esc(row.groupName || row.upstreamName || row.group) + ' ' + row.n + '</a>';
      }).join(' · ') +
      '</span></div>';
  }

  function renderIndex(list) {
    const gs = groups(list).sort(function (a, b) { return b.fonts.length - a.fonts.length || a.name.localeCompare(b.name, 'zh'); });
    const authors = gs.filter(function (g) { return g.kind === 'author' || g.kind === 'project'; }).length;
    const brands = gs.filter(function (g) { return g.kind === 'brand'; }).length;
    const platforms = gs.filter(function (g) { return g.kind === 'platform'; }).length;
    document.body.classList.add('is-index');
    root.innerHTML =
      '<section><div class="container">' +
        '<div class="page-head"><h1>厂商</h1><p class="lead">在库 ' + gs.length + ' 家：品牌方 ' + brands +
          ' 家，开源作者 / 项目 ' + authors + ' 家，素材平台 ' + platforms +
          ' 家。版权归品牌方；字库代做的列在「受托制作」。</p></div>' +
        '<div class="foundry-index">' + gs.map(function (g) {
          const n = g.fonts.length;
          const m = g.made.length;
          return WFChrome.foundryHtml(g.font, { sub: '在库 ' + n + ' 款' + (m ? ' · 受托 ' + m + ' 款' : '') });
        }).join('') + '</div>' +
      '</div></section>' +
      '<section><div class="container"><div class="section-head"><h2>' + WFChrome.icon('idcard') + '入驻与认领</h2></div>' +
        '<p class="t-14" style="max-width:40em;color:var(--ink-2)">准备品牌名称、官网和授权原文，到<a href="claim.html">认领厂商</a>提交，或从任一厂商页点「认领此页」。通过后可改标志、介绍与官网。许可仍以每款字体的出处为准。</p></div></section>';
  }

  const OWNED_SECTIONS = [
    { id: 'original', title: '源字', note: '原作' },
    { id: 'locale', title: '地区版', note: '同一原作的地区或屏显版' },
    { id: 'fork', title: '派生', note: '从上游改出来的' },
    { id: 'collab', title: '合作', note: '' },
    { id: 'commissioned', title: '委托定制', note: '版权归出资的品牌方' },
    { id: 'other', title: '归属字体', note: '' }
  ];

  function splitOwned(fonts) {
    const buckets = {};
    OWNED_SECTIONS.forEach(function (s) { buckets[s.id] = []; });
    fonts.forEach(function (f) {
      const rel = (f.lineage || {}).relation;
      (buckets[rel] || buckets.other).push(f);
    });
    OWNED_SECTIONS.forEach(function (s) {
      buckets[s.id].sort(function (a, b) { return a.name.localeCompare(b.name, 'zh'); });
    });
    const filled = OWNED_SECTIONS.filter(function (s) { return buckets[s.id].length; });
    if (filled.length === 1 && filled[0].id === 'other') {
      return [{ id: 'other', title: '归属字体', note: '', fonts: buckets.other }];
    }
    return filled.map(function (s) {
      return { id: s.id, title: s.title, note: s.note, fonts: buckets[s.id] };
    });
  }

  function ownedHtml(g) {
    const sections = splitOwned(g.fonts);
    if (!sections.length) return '';
    const filter = '<a class="more" href="fonts.html?foundry=' + encodeURIComponent(g.slug) + '">' + WFChrome.icon('filter') + '在字体库筛选</a>';
    if (sections.length === 1) {
      const s = sections[0];
      return '<div class="count-line">' + s.title + ' <strong>' + s.fonts.length + '</strong> 款' +
        (s.note ? ' · ' + s.note : '') + ' · ' + filter + '</div>' +
        '<ul class="specimens" id="rows-' + s.id + '"></ul>';
    }
    return '<div class="count-line">在库 <strong>' + g.fonts.length + '</strong> 款 · ' + filter + '</div>' +
      sections.map(function (s) {
        return '<div class="count-line count-line-sub">' + s.title + ' <strong>' + s.fonts.length + '</strong> 款' +
          (s.note ? ' · ' + s.note : '') + '</div>' +
          '<ul class="specimens" id="rows-' + s.id + '"></ul>';
      }).join('');
  }

  function renderOne(list, g) {
    document.body.classList.remove('is-index');
    document.title = g.name + ' · 厂商 · 文风字体';
    const f = g.fonts[0] || g.font;
    const info = g.info || WFChrome.brandInfo(f) || {};
    const sample = g.fonts[0] || g.made[0] || f;
    const desc = info.description ||
      ((sample.brand && sample.brand.description && !/出品的字体$/.test(sample.brand.description)) ? sample.brand.description : '');
    const site = info.website || WFChrome.brandSite(f);
    const licenses = {};
    g.fonts.forEach(function (x) { const t = WFChrome.licenseTier(x); licenses[t] = (licenses[t] || 0) + 1; });
    const years = g.fonts.concat(g.made).map(function (x) { return x.releaseYear; }).filter(Boolean);
    const host = site ? site.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
    const who = g.kind === 'brand' ? '品牌方' : '厂商';
    const kv = [
      { icon: 'building', dt: '类型', dd: WFChrome.kindLabel(info) || '' },
      { icon: 'font', dt: '归属字体', dd: String(g.fonts.length) },
      { icon: 'calendar', dt: '最早发布', dd: years.length ? String(Math.min.apply(null, years)) : '' },
      { icon: 'globe', dt: '官网', dd: site ? '<a href="' + esc(site) + '" target="_blank" rel="noopener noreferrer">' + esc(host) + '</a>' : '未收录官网', html: !!site },
      { icon: 'translate', dt: '英文名', dd: info.en && info.en !== g.name ? info.en : '', dev: true },
      { icon: 'quote', dt: '简称', dd: info.short && info.short !== g.name ? info.short : '', dev: true },
      { icon: 'palette', dt: '受托制作', dd: g.made.length ? String(g.made.length) : '', dev: true },
      { icon: 'certificate', dt: '授权', dd: Object.keys(licenses).map(function (k) { return k + ' ' + licenses[k]; }).join(' · '), dev: true },
      { icon: 'question', dt: '名称状态', dd: info.provisional ? '中文名拟定，待确认' : (info.unlisted ? '未入字典，按目录原文显示' : ''), dev: true }
    ].filter(function (r) { return r.dd; });

    const heroSub = (g.claimed ? '已认领' : '未认领') + ' · 归属 ' + g.fonts.length + ' 款' + (g.made.length ? ' · 受托 ' + g.made.length + ' 款' : '');
    const origins = originsStrip(list, g) || ecosystemStrip(list, g.slug);
    root.innerHTML =
      '<div class="container">' +
      '<div class="detail-top"><p class="crumb"><a href="foundry.html">厂商</a><span>/</span><span>' + esc(g.name) + '</span></p></div>' +
      '<div class="foundry-hero">' +
        '<div class="foundry-hero-main">' +
          WFChrome.foundryHtml(g.font, { sub: heroSub, fav: WFChrome.favHtml('author', g.slug, g.name) }) +
          (desc ? '<p class="desc">' + esc(desc) + '</p>' : '') +
          WFSponsor.html(info) +
          origins +
        '</div>' +
        '<div><dl class="kv">' + kv.map(function (r) {
          return '<div' + (r.dev ? ' class="for-dev"' : '') + '><dt>' + WFChrome.icon(r.icon) + esc(r.dt) + '</dt><dd>' +
            (r.html ? r.dd : esc(r.dd)) + '</dd></div>';
        }).join('') + '</dl>' +
          '<p class="claim" style="margin-top:var(--s-5)">' + WFChrome.icon('idcard') + '<span>' + (g.claimed
            ? who + '已认领此页。许可仍以每款字体的出处为准。'
            : '这是你的品牌？<a href="claim.html?slug=' + encodeURIComponent(g.slug) + '">认领此页</a>。通过后可改标志与介绍。') + '</span></p>' +
        '</div>' +
      '</div>' +
      ownedHtml(g) +
      (g.made.length
        ? '<div class="count-line">受托制作 <strong>' + g.made.length + '</strong> 款 · 版权归品牌方，不计入本页归属</div>' +
          '<ul class="specimens" id="made"></ul>'
        : '') +
      '</div>';
    splitOwned(g.fonts).forEach(function (s) {
      const el = document.getElementById('rows-' + s.id);
      if (el) WFSpecimen.renderRows(el, s.fonts, { size: 56 });
    });
    if (g.made.length) WFSpecimen.renderRows(document.getElementById('made'), g.made, { size: 56 });
    WFSponsor.bind(root);
  }

  WFProto.loadCatalog().then(function (list) {
    const slug = WFProto.getQuery('slug');
    if (!slug) { renderIndex(list); return; }
    const g = groups(list).filter(function (x) { return x.slug === slug || x.name === slug; })[0];
    if (!g) { root.innerHTML = '<p class="empty container">未找到该厂商。<a href="foundry.html">' + WFChrome.icon('building') + '查看全部厂商</a></p>'; return; }
    renderOne(list, g);
  });
})();
