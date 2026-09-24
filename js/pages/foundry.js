/* 厂商：索引（无 slug）/ 单厂商页（?slug=） */
(function () {
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('foundryRoot');

  const INDEX_SECTIONS = [
    { id: 'foundry', title: '字库', kinds: { foundry: 1 } },
    { id: 'brand', title: '品牌方', kinds: { brand: 1 } },
    { id: 'author', title: '作者', kinds: { author: 1 } },
    { id: 'oss-author', title: '开源作者', kinds: { author: 1 } },
    { id: 'project', title: '开源项目', kinds: { project: 1 } },
    { id: 'platform', title: '素材平台', kinds: { platform: 1 } },
    { id: 'commissioned', title: '仅受托制作', kinds: null },
    { id: 'unlisted', title: '未核对', kinds: null }
  ];

  const OWNED_SECTIONS = [
    { id: 'original', title: '源字', note: '本页主款；含自外源改出的首发' },
    { id: 'locale', title: '地区版', note: '同一原作的简繁或屏显 / Lite / 等宽等规格' },
    { id: 'fork', title: '派生', note: '从本页源字再改、已换名' },
    { id: 'collab', title: '联合作者', note: '与本页共同署名；点头像进对方主页' },
    { id: 'commissioned', title: '委托定制', note: '版权归本页品牌方' },
    { id: 'other', title: '归属', note: '' }
  ];

  function stubFont(info) {
    return { ownerInfo: info, foundryInfo: info, makerInfo: info };
  }

  function partnerFace(info) {
    return WFChrome.partnerFaceHtml(info);
  }

  /** 本页作为主归属时的联合作者；本页作为联合作者时的主归属 */
  function collectPartners(g) {
    const map = {};
    function add(info, n) {
      if (!info || !info.id || info.id === g.slug) return;
      if (!map[info.id]) map[info.id] = { info: info, n: 0 };
      map[info.id].n += n || 1;
    }
    (g.fonts || []).forEach(function (f) {
      (f.collaboratorInfos || []).forEach(function (c) { add(c, 1); });
    });
    (g.collab || []).forEach(function (f) {
      add(f.ownerInfo || f.foundryInfo, 1);
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.n - a.n || a.info.name.localeCompare(b.info.name, 'zh'); });
  }

  function partnersStrip(g) {
    const rows = collectPartners(g);
    if (!rows.length) return '';
    const hasOwnCols = (g.fonts || []).some(function (f) {
      return (f.collaboratorInfos || []).some(function (c) { return c && c.id && c.id !== g.slug; });
    });
    const label = hasOwnCols ? '联合作者' : '联合署名于';
    return '<div class="foundry-partners">' +
      '<p class="partners-label">' + WFChrome.icon('user') + esc(label) + '</p>' +
      '<div class="partners-list">' +
        rows.map(function (row) { return partnerFace(row.info); }).join('') +
      '</div></div>';
  }

  function groups(list) {
    const map = {};
    function ensure(info) {
      if (!info || !info.id) return null;
      if (!map[info.id]) {
        map[info.id] = {
          slug: info.id, name: info.name, info: info, font: stubFont(info),
          fonts: [], made: [], collab: [], claimed: !!info.claimed, kind: info.kind || ''
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
      (f.collaboratorInfos || []).forEach(function (c) {
        if (!c || !c.id) return;
        if (owner && c.id === owner.id) return;
        if (maker && c.id === maker.id) return;
        const cg = ensure(c);
        if (!cg) return;
        if (cg.fonts.indexOf(f) !== -1 || cg.made.indexOf(f) !== -1 || cg.collab.indexOf(f) !== -1) return;
        cg.collab.push(f);
        if (!cg.fonts.length && !cg.made.length && cg.collab.length === 1) cg.font = f;
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function indexBucket(g) {
    if ((g.info && g.info.unlisted) || !g.kind) return 'unlisted';
    /* 开源项目一律归项目段，不因无归属、只受托而拆到「仅受托」 */
    if (g.kind === 'project') return 'project';
    if (!g.fonts.length && !(g.collab || []).length && g.made.length) return 'commissioned';
    if (g.kind === 'author' && g.info && g.info.openSource) return 'oss-author';
    return g.kind;
  }

  function cardSub(g) {
    const n = g.fonts.length;
    const m = g.made.length;
    const c = (g.collab || []).length;
    if (!n && !c && m) return '受托 ' + m + ' 款 · 无归属';
    if (!n && c && !m) return '联合作者 ' + c + ' 款';
    const bits = [];
    if (n) bits.push('归属 ' + n + ' 款');
    if (c) bits.push('合作 ' + c + ' 款');
    if (m) bits.push('受托 ' + m + ' 款');
    return bits.join(' · ') || '归属 0 款';
  }

  function sortGroups(a, b) {
    const ac = (a.collab || []).length;
    const bc = (b.collab || []).length;
    return b.fonts.length - a.fonts.length ||
      bc - ac ||
      b.made.length - a.made.length ||
      a.name.localeCompare(b.name, 'zh');
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
      const owner = f.ownerInfo || f.foundryInfo;
      const upOwner = L.upstreamOwnerInfo;
      /* 只亮外源根：上游机构 ≠ 本页权利人，避免把 GB/Lite 再刷一遍 */
      if (owner && upOwner && owner.id === upOwner.id) return;
      if (!upOwner && L.upstreamName && owner) {
        /* 无上游机构时，上游名若落在本页字体上则也跳过 */
        const selfHit = fonts.some(function (x) { return x.name === L.upstreamName; });
        if (selfHit) return;
      }
      const oid = (upOwner && upOwner.id) || '';
      const key = oid + '\0' + (L.upstreamName || '') + '\0' + (L.group || '');
      if (!map[key]) {
        map[key] = {
          owner: upOwner,
          upstreamName: L.upstreamName,
          group: L.group,
          groupName: L.groupName,
          n: 0
        };
      }
      map[key].n++;
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.n - a.n || String(a.upstreamName).localeCompare(String(b.upstreamName), 'zh'); });
  }

  function collectForkEcosystem(list, slug) {
    const map = {};
    const loose = [];
    list.forEach(function (f) {
      const L = f.lineage || {};
      if (L.relation !== 'fork') return;
      const up = L.upstreamOwnerInfo;
      if (!up || up.id !== slug) return;
      if (!L.group) {
        loose.push(f);
        return;
      }
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
    loose.sort(function (a, b) { return a.name.localeCompare(b.name, 'zh'); });
    return {
      groups: Object.keys(map).map(function (k) { return map[k]; }),
      loose: loose
    };
  }

  /**
   * 外源关系口径（厂商顶栏 / 列表脚注共用）：
   *
   * 数据层只有 fork（及 locale）。「二创」不是旁类、也不是分叉的上位：
   * 社区口语里的二创 = OFL 派生 = relation:fork。顶栏按上游族系分列，
   * 方便扫读，不暗示法律类型不同。
   *
   * - remix → 开发视图「思源派生」（Source Han / Adobe）
   * - derive → 开发视图「开源派生」（IPA / Fontworks / Droid…）
   * - 同系：locale / 规格；同主再设计：页内「派生」段
   * 勿写「改自」（HANDOFF 已否）。可手工 originVerb: remix|derive 覆盖。
   * 注：「开源」是族系口令（非思源的开源上游），不是说思源不开源。
   */
  function originVerb(rowOrLineage) {
    const L = rowOrLineage && rowOrLineage.upstreamName != null ? rowOrLineage : (rowOrLineage || {});
    if (L.originVerb === 'remix' || L.originVerb === 'derive') return L.originVerb;
    const g = String(L.group || '');
    const oid = (L.owner && L.owner.id) || L.upstreamOwnerId ||
      (L.upstreamOwnerInfo && L.upstreamOwnerInfo.id) || '';
    const up = String(L.upstreamName || '');
    if (g.indexOf('source-han') === 0 || oid === 'adobe' || /思源/.test(up)) return 'remix';
    return 'derive';
  }

  function originVerbLabel(verb) {
    return verb === 'remix' ? '思源派生' : '开源派生';
  }

  function originVerbIcon(verb) {
    return verb === 'remix' ? 'branch' : 'commit';
  }

  function upstreamChip(list, row, opts) {
    opts = opts || {};
    const up = row.owner;
    const font = findFontByName(list, row.upstreamName);
    const what = row.upstreamName
      ? (font
        ? '<a href="' + WFChrome.href(WFProto.detailHref(font)) + '">' + esc(row.upstreamName) + '</a>'
        : esc(row.upstreamName))
      : (row.groupName ? esc(row.groupName) : '');
    if (!what) return '';
    if (opts.compact) {
      return '<span class="foundry-upstream-font">' + what +
        (row.n > 1 ? '<span class="n">' + row.n + '</span>' : '') +
      '</span>';
    }
    const avatar = up
      ? WFChrome.brandAvatar(font || stubFont(up), up)
      : '';
    const mark = up
      ? (avatar
        ? '<img src="' + esc(avatar) + '" alt="" width="16" height="16" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{className:\'mark\',textContent:' + JSON.stringify((up.short || up.name || '?').charAt(0)) + '}))" />'
        : '<span class="mark">' + esc((up.short || up.name || '?').charAt(0)) + '</span>')
      : '';
    const who = up
      ? '<a class="foundry-upstream-who" href="' + WFChrome.href('foundry.html?slug=' + encodeURIComponent(up.id)) + '">' +
          mark + '<span>' + esc(up.short || up.name) + '</span></a>'
      : '';
    const kin = row.group
      ? '<a class="more" href="' + WFChrome.href('fonts.html?lineage=' + encodeURIComponent(row.group)) + '">' +
          WFChrome.icon('compare') + '同系</a>'
      : '';
    const parts = [what, who, kin].filter(Boolean);
    return '<span class="foundry-upstream-item">' + parts.join('<span class="foundry-upstream-sep"> · </span>') + '</span>';
  }

  /** 按上游机构分簇；有 group 时再标同系类型 */
  function clusterOrigins(rows) {
    const map = {};
    rows.forEach(function (row) {
      const id = (row.owner && row.owner.id) || '_none';
      if (!map[id]) {
        map[id] = { id: id, owner: row.owner, rows: [], series: {} };
      }
      map[id].rows.push(row);
      if (row.group) {
        if (!map[id].series[row.group]) {
          map[id].series[row.group] = { id: row.group, name: row.groupName || row.group, n: 0 };
        }
        map[id].series[row.group].n += row.n || 1;
      }
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) {
        const an = a.rows.reduce(function (n, r) { return n + (r.n || 1); }, 0);
        const bn = b.rows.reduce(function (n, r) { return n + (r.n || 1); }, 0);
        if (bn !== an) return bn - an;
        const as = (a.owner && (a.owner.short || a.owner.name)) || '';
        const bs = (b.owner && (b.owner.short || b.owner.name)) || '';
        return as.localeCompare(bs, 'zh');
      });
  }

  function seriesLabel(name, groupId) {
    if (groupId === 'ipa-gothic') return '黑体系';
    if (groupId === 'ipa-mincho') return '明朝系';
    if (groupId === 'lxgw-wenkai') return '文楷系';
    if (groupId === 'source-han-sans') return '思源黑体';
    if (groupId === 'source-han-serif') return '思源宋体';
    const s = String(name || '');
    const cut = s.split(/\s*\/\s*/)[0];
    return cut || s;
  }

  function originClusterHtml(list, cluster) {
    const fonts = cluster.rows.map(function (row) {
      return upstreamChip(list, row, { compact: true });
    }).filter(Boolean);
    const series = Object.keys(cluster.series).map(function (gid) { return cluster.series[gid]; })
      .sort(function (a, b) { return b.n - a.n || a.name.localeCompare(b.name, 'zh'); });
    const seriesBits = series.map(function (s) {
      return '<a class="foundry-origins-series-link" href="' + WFChrome.href('fonts.html?lineage=' + encodeURIComponent(s.id)) + '">' +
        esc(seriesLabel(s.name, s.id)) + '</a>';
    });
    const parts = seriesBits.concat(fonts).filter(Boolean);
    if (!parts.length) return '';
    return '<span class="foundry-upstream-item">' + parts.join('<span class="foundry-upstream-sep"> · </span>') + '</span>';
  }

  function originsStrip(list, g) {
    const rows = collectOrigins(g.fonts);
    if (!rows.length) return '';
    if (g.kind !== 'author' && g.kind !== 'project' && g.kind !== 'platform') return '';
    const byVerb = { derive: [], remix: [] };
    rows.forEach(function (row) {
      byVerb[originVerb(row)].push(row);
    });
    const order = ['derive', 'remix'];
    const rowsHtml = order.filter(function (v) { return byVerb[v].length; }).map(function (verb) {
      return '<div class="foundry-origins-row">' +
        '<span class="foundry-origins-label">' + WFChrome.icon(originVerbIcon(verb)) + esc(originVerbLabel(verb)) + '</span>' +
        clusterOrigins(byVerb[verb]).map(function (c) { return originClusterHtml(list, c); }).join('') +
      '</div>';
    });
    if (!rowsHtml.length) return '';
    return '<div class="foundry-origins for-dev">' + rowsHtml.join('') + '</div>';
  }

  function ecosystemStrip(list, slug) {
    const eco = collectForkEcosystem(list, slug);
    const rows = eco.groups;
    const loose = eco.loose;
    if (!rows.length && !loose.length) return '';
    const total = rows.reduce(function (n, r) { return n + r.n; }, 0) + loose.length;
    const links = rows.map(function (row) {
      return '<a href="' + WFChrome.href('fonts.html?lineage=' + encodeURIComponent(row.group)) + '">' +
        esc(row.groupName || row.upstreamName || row.group) + ' ' + row.n + '</a>';
    }).concat(loose.map(function (f) {
      return '<a href="' + WFChrome.href(WFProto.detailHref(f)) + '">' + esc(f.name) + '</a>';
    }));
    return '<div class="foundry-origins foundry-eco">' +
      '<span class="foundry-origins-label">' + WFChrome.icon('branch') + '同系派生</span>' +
      '<span class="foundry-upstream-item">站内另有 <strong>' + total + '</strong> 款从本页开源谱系衍生，版权归创作者 · ' +
      links.join(' · ') +
      '</span></div>';
  }

  function matchQuery(g, q) {
    if (!q) return true;
    const blob = [
      g.name,
      g.info && g.info.en,
      g.info && g.info.short,
      g.slug,
      ((g.info && g.info.aliases) || []).join(' ')
    ].join(' ').toLowerCase();
    return blob.indexOf(q) !== -1;
  }

  function renderIndex(list) {
    const gs = groups(list).sort(sortGroups);
    const buckets = {};
    INDEX_SECTIONS.forEach(function (s) { buckets[s.id] = []; });
    gs.forEach(function (g) {
      const id = indexBucket(g);
      (buckets[id] || buckets.unlisted).push(g);
    });

    const listed = INDEX_SECTIONS.filter(function (s) {
      return s.id !== 'unlisted' && s.id !== 'commissioned';
    }).reduce(function (n, s) { return n + buckets[s.id].length; }, 0);

    document.body.classList.add('is-index');

    function sectionHtml(sec, items) {
      if (!items.length) return '';
      const note = sec.id === 'commissioned'
        ? '<p class="foundry-sec-note">本站没有归属字体，只列代做款；版权在品牌方。</p>'
        : (sec.id === 'unlisted'
          ? '<p class="foundry-sec-note">目录原文尚未对上厂商字典，显示名可能不准；不计入上方家数。</p>'
          : (sec.id === 'author'
            ? '<p class="foundry-sec-note">个人或工作室署名；开源许可发布的见下方「开源作者」。</p>'
            : (sec.id === 'oss-author'
              ? '<p class="foundry-sec-note">以开源许可发布字形的个人或工作室；与「开源项目」分开列出。</p>'
              : (sec.id === 'project'
                ? '<p class="foundry-sec-note">协作仓、机构发布线或计划名；不是个人作者页。</p>'
                : ''))));
      return '<section class="foundry-sec" data-sec="' + sec.id + '">' +
        '<div class="section-head"><h2>' + esc(sec.title) + ' <span class="n">' + items.length + '</span></h2></div>' +
        note +
        '<div class="foundry-index">' + items.map(function (g) {
          return WFChrome.foundryHtml(g.font, { sub: cardSub(g) });
        }).join('') + '</div></section>';
    }

    const primaryKinds = INDEX_SECTIONS.filter(function (s) {
      return s.id !== 'commissioned' && s.id !== 'unlisted';
    });
    const extraKinds = INDEX_SECTIONS.filter(function (s) {
      return (s.id === 'commissioned' || s.id === 'unlisted') && buckets[s.id].length;
    });

    root.innerHTML =
      '<section class="foundry-index-hero">' +
        '<div class="container">' +
          '<h1>厂商</h1>' +
          '<p class="lead"><b>' + listed + '</b> 家在目录。字库、品牌方、作者、开源作者与开源项目分列；版权归品牌方。</p>' +
        '</div>' +
      '</section>' +
      '<div class="foundry-stick-bar">' +
        '<div class="container foundry-stick-inner">' +
          '<label class="foundry-search"><span class="sr-only">搜索厂商</span>' +
            '<svg class="icon" aria-hidden="true"><use href="assets/icons.svg?v=20260922ri#i-search"/></svg>' +
            '<input type="search" id="foundryQ" placeholder="搜索名称、英文或简称" autocomplete="off" /></label>' +
          '<div class="foundry-kinds" id="foundryKindChips" role="tablist" aria-label="按类型筛选">' +
            '<button type="button" class="is-on" data-kind="" role="tab" aria-selected="true">全部</button>' +
            primaryKinds.map(function (s) {
              return '<button type="button" data-kind="' + s.id + '" role="tab" aria-selected="false">' +
                esc(s.title) + '<span class="n">' + buckets[s.id].length + '</span></button>';
            }).join('') +
            (extraKinds.length
              ? '<span class="foundry-kinds-gap" aria-hidden="true"></span>' +
                extraKinds.map(function (s) {
                  return '<button type="button" data-kind="' + s.id + '" role="tab" aria-selected="false">' +
                    esc(s.title) + '<span class="n">' + buckets[s.id].length + '</span></button>';
                }).join('')
              : '') +
          '</div>' +
          '<a class="foundry-stick-jump" href="#foundryClose">入驻与认领</a>' +
        '</div>' +
      '</div>' +
      '<section class="foundry-index-body">' +
        '<div class="container">' +
          '<div id="foundrySections">' +
            INDEX_SECTIONS.map(function (s) { return sectionHtml(s, buckets[s.id]); }).join('') +
          '</div>' +
          '<p class="foundry-empty-filter" id="foundryEmpty" hidden>没有匹配的厂商。</p>' +
        '</div>' +
      '</section>' +
      '<section class="foundry-close" id="foundryClose" aria-label="入驻与认领">' +
        '<div class="container foundry-close-inner">' +
          '<p class="foundry-close-glyph" aria-hidden="true">合作</p>' +
          '<div class="foundry-close-body">' +
            '<div class="foundry-close-top">' +
              '<p class="kicker">入驻与认领</p>' +
              '<h2>合作入驻，认领你的厂商页。</h2>' +
              '<p class="lead">准备法定名称、官网域名邮箱与授权原文。通过后可改本页标志与介绍；实际许可仍以每款字体出处为准。</p>' +
            '</div>' +
            '<div class="foundry-close-foot">' +
              '<p class="foundry-close-stat"><b>' + listed + '</b>家在目录</p>' +
              '<div class="foundry-close-acts">' +
                '<a class="btn btn-ink btn-lg" href="claim.html">' + WFChrome.icon('idcard') + '去认领</a>' +
                '<a class="btn btn-lg" href="license.html">' + WFChrome.icon('info') + '权益说明</a>' +
                '<a class="btn btn-lg" href="https://wenfeng.org" target="_blank" rel="noopener noreferrer">' +
                  WFChrome.icon('external') + '开源创作</a>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>';

    const qEl = document.getElementById('foundryQ');
    const chipsEl = document.getElementById('foundryKindChips');
    const emptyEl = document.getElementById('foundryEmpty');
    let kind = '';
    let q = '';

    function applyFilter() {
      let visible = 0;
      root.querySelectorAll('.foundry-sec').forEach(function (sec) {
        const sid = sec.getAttribute('data-sec');
        const showSec = !kind || kind === sid;
        let secVisible = 0;
        sec.querySelectorAll('.foundry-index > .foundry').forEach(function (card, i) {
          const g = buckets[sid][i];
          const ok = showSec && g && matchQuery(g, q);
          card.hidden = !ok;
          if (ok) { secVisible++; visible++; }
        });
        sec.hidden = !showSec || secVisible === 0;
      });
      if (emptyEl) emptyEl.hidden = visible > 0;
    }

    if (chipsEl) {
      chipsEl.addEventListener('click', function (e) {
        const b = e.target.closest('[data-kind]');
        if (!b) return;
        kind = b.getAttribute('data-kind') || '';
        chipsEl.querySelectorAll('[data-kind]').forEach(function (c) {
          const on = c === b;
          c.classList.toggle('is-on', on);
          c.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        applyFilter();
      });
    }
    if (qEl) {
      qEl.addEventListener('input', function () {
        q = String(qEl.value || '').trim().toLowerCase();
        applyFilter();
      });
    }
  }

  /** 厂商页分段：外源 fork 算本页「源字」；同主再 fork 才进「派生」 */
  function sectionIdFor(font) {
    const L = font.lineage || {};
    const rel = L.relation || '';
    if (rel === 'fork') {
      const owner = font.ownerInfo || font.foundryInfo;
      const up = L.upstreamOwnerInfo;
      if (up && owner && up.id !== owner.id) return 'original';
      if (!up && L.upstreamName) {
        /* 上游是站外名字、不在本页目录里 → 仍作源字 */
        return 'original';
      }
    }
    return rel || 'other';
  }

  function findByName(fonts, name) {
    if (!name) return null;
    return fonts.filter(function (f) { return f.name === name; })[0] || null;
  }

  /** 仅 locale 挂到主款下；同主再 fork（Bright / 臻楷）必须单独成行 */
  function packParent(font, fonts) {
    const L = font.lineage || {};
    if (L.relation !== 'locale' || !L.upstreamName) return null;
    let cur = findByName(fonts, L.upstreamName);
    let guard = 0;
    while (cur && guard++ < 8) {
      const cL = cur.lineage || {};
      if (cL.relation !== 'locale') return cur;
      if (!cL.upstreamName) return cur;
      const next = findByName(fonts, cL.upstreamName);
      if (!next || next.id === cur.id) return cur;
      cur = next;
    }
    return null;
  }

  function splitOwned(fonts, collabFonts) {
    const packsOf = {};
    const tops = [];
    fonts.forEach(function (f) {
      const parent = packParent(f, fonts);
      if (parent) (packsOf[parent.id] = packsOf[parent.id] || []).push(f);
      else tops.push(f);
    });
    Object.keys(packsOf).forEach(function (id) {
      packsOf[id].sort(function (a, b) { return a.name.localeCompare(b.name, 'zh'); });
    });
    const buckets = {};
    OWNED_SECTIONS.forEach(function (s) { buckets[s.id] = []; });
    tops.forEach(function (f) {
      const sid = sectionIdFor(f);
      (buckets[sid] || buckets.other).push(f);
    });
    (collabFonts || []).forEach(function (f) {
      if (buckets.collab.indexOf(f) === -1) buckets.collab.push(f);
    });
    OWNED_SECTIONS.forEach(function (s) {
      buckets[s.id].sort(function (a, b) { return a.name.localeCompare(b.name, 'zh'); });
    });
    const filled = OWNED_SECTIONS.filter(function (s) { return buckets[s.id].length; });
    const sections = (filled.length === 1 && filled[0].id === 'other')
      ? [{ id: 'other', title: '归属', note: '', fonts: buckets.other }]
      : filled.map(function (s) {
        return { id: s.id, title: s.title, note: s.note, fonts: buckets[s.id] };
      });
    return { sections: sections, packsOf: packsOf };
  }

  function upstreamFoot(list, font, packs) {
    const bits = [];
    if (packs && packs.length) {
      bits.push('含 ' + packs.length + ' 款 ' + packs.map(function (p) {
        return '<a href="' + WFChrome.href(WFProto.detailHref(p)) + '">' + esc(p.name) + '</a>';
      }).join(' · '));
    }
    const L = font.lineage || {};
    if (L.upstreamName && L.relation && L.relation !== 'original') {
      const hit = findFontByName(list, L.upstreamName);
      const label = hit
        ? '<a href="' + WFChrome.href(WFProto.detailHref(hit)) + '">' + esc(L.upstreamName) + '</a>'
        : esc(L.upstreamName);
      if (L.relation === 'locale') bits.push({ html: '同系 ' + label });
      else bits.push({ dev: true, html: '派生至 ' + label });
    }
    return bits;
  }

  function footHtml(parts) {
    let html = '';
    let shown = 0;
    let any = 0;
    parts.forEach(function (p) {
      const bit = typeof p === 'string' ? { html: p } : p;
      if (!bit || !bit.html) return;
      if (bit.dev) html += '<span class="for-dev">' + (any ? ' · ' : '') + bit.html + '</span>';
      else {
        if (shown) html += ' · ';
        else if (any) html += '<span class="for-dev"> · </span>';
        html += bit.html;
        shown++;
      }
      any++;
    });
    return html;
  }

  function ownedHtml(g) {
    const collab = g.collab || [];
    if (!g.fonts.length && !collab.length) {
      if (!g.made.length) return '<p class="foundry-empty">本站暂无此厂商字体。</p>';
      return '<p class="foundry-empty">本页暂无归属字体。下列「受托制作」为代做款，版权在品牌方。</p>';
    }
    const split = splitOwned(g.fonts, collab);
    const sections = split.sections;
    const packsOf = split.packsOf;
    const filter = '<a class="more" href="fonts.html?foundry=' + encodeURIComponent(g.slug) + '">' + WFChrome.icon('filter') + '在字体库筛选</a>';
    if (sections.length === 1) {
      const s = sections[0];
      return '<div class="count-line">' + s.title + ' <strong>' + s.fonts.length + '</strong> 款' +
        (s.note ? ' · ' + s.note : '') + ' · ' + filter + '</div>' +
        '<ul class="specimens" id="rows-' + s.id + '"></ul>';
    }
    const headBits = [];
    if (g.fonts.length) headBits.push('归属 <strong>' + g.fonts.length + '</strong> 款');
    if (collab.length) headBits.push('联合作者 <strong>' + collab.length + '</strong> 款');
    return '<div class="count-line">' + (headBits.join(' · ') || '在库字体') + ' · ' + filter + '</div>' +
      sections.map(function (s) {
        return '<div class="count-line count-line-sub">' + s.title + ' <strong>' + s.fonts.length + '</strong> 款' +
          (s.note ? ' · ' + s.note : '') + '</div>' +
          '<ul class="specimens" id="rows-' + s.id + '"></ul>';
      }).join('');
  }

  function heroSubHtml(g) {
    const bits = [g.claimed ? '已认领' : '未认领'];
    const c = (g.collab || []).length;
    if (g.fonts.length) bits.push('归属 ' + g.fonts.length + ' 款');
    if (c) bits.push('联合作者 ' + c + ' 款');
    if (g.made.length) bits.push('受托 ' + g.made.length + ' 款');
    if (!g.fonts.length && !c && !g.made.length) bits.push('暂无在库字体');
    return bits.join(' · ');
  }

  /* 授权记录：厂商级 trackRecord，仅收录可查证事件（每条带出处），无记录零渲染 */
  function recordSectionHtml(info) {
    var tr = info && info.trackRecord;
    if (!tr || !Array.isArray(tr.incidents) || !tr.incidents.length) return '';
    var rows = tr.incidents.map(function (e) {
      var host = '';
      try { host = new URL(e.sourceUrl).hostname.replace(/^www\./, ''); } catch (err) {}
      return '<li><span class="rec-date">' + esc(e.date || '') + '</span>' +
        '<span class="rec-type">' + esc(e.type || '') + '</span>' +
        '<span class="rec-sum">' + esc(e.summary || '') + '</span>' +
        (e.sourceUrl ? '<a class="rec-src" href="' + esc(e.sourceUrl) + '" target="_blank" rel="nofollow noopener noreferrer">' + esc(host) + ' ↗</a>' : '') +
        '</li>';
    }).join('');
    return '<section class="foundry-sec" id="record"><div class="section-head"><h2>授权记录 <span class="n">' + tr.incidents.length + '</span></h2></div>' +
      '<ul class="record-list">' + rows + '</ul>' +
      '<p class="rec-note">仅收录可查证事件，每条附出处。' + esc(tr.lastChecked || '') + ' 核对。</p></section>';
  }

  function renderOne(list, g) {
    document.body.classList.remove('is-index');
    document.title = g.name + ' · 厂商 · 文风字体';
    const collab = g.collab || [];
    const f = g.fonts[0] || collab[0] || g.font;
    const info = g.info || WFChrome.brandInfo(f) || {};
    const sample = g.fonts[0] || collab[0] || g.made[0] || f;
    const desc = info.description ||
      ((sample.brand && sample.brand.description && !/出品的字体$/.test(sample.brand.description)) ? sample.brand.description : '');
    const site = info.website || WFChrome.brandSite(f);
    const licenses = {};
    g.fonts.concat(collab).forEach(function (x) { const t = WFChrome.licenseTier(x); licenses[t] = (licenses[t] || 0) + 1; });
    const years = g.fonts.concat(collab).concat(g.made).map(function (x) { return x.releaseYear; }).filter(Boolean);
    const host = site ? site.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
    const who = g.kind === 'brand' ? '品牌方' : (g.kind === 'author' ? '作者' : (g.kind === 'project' ? '项目' : '厂商'));
    const partners = collectPartners(g);
    const hasOwnCols = (g.fonts || []).some(function (f) {
      return (f.collaboratorInfos || []).some(function (c) { return c && c.id && c.id !== g.slug; });
    });
    const partnerKv = partners.length
      ? {
          icon: 'user',
          dt: hasOwnCols ? '联合作者' : '联合署名',
          dd: partners.map(function (row) { return partnerFace(row.info); }).join(''),
          html: true
        }
      : null;
    const kv = [
      { icon: 'building', dt: '类型', dd: WFChrome.kindLabel(info) || (info.unlisted ? '未核对' : '') },
      { icon: 'font', dt: '归属', dd: g.fonts.length ? String(g.fonts.length) : '' },
      partnerKv,
      { icon: 'palette', dt: '受托', dd: g.made.length ? String(g.made.length) : '' },
      { icon: 'calendar', dt: '首发', dd: years.length ? String(Math.min.apply(null, years)) : '' },
      { icon: 'globe', dt: '官网', dd: site ? '<a href="' + esc(site) + '" target="_blank" rel="noopener noreferrer">' + esc(host) + '</a>' : '未收录官网', html: !!site },
      { icon: 'translate', dt: '英文名', dd: info.en && info.en !== g.name ? info.en : '', dev: true },
      { icon: 'quote', dt: '简称', dd: info.short && info.short !== g.name ? info.short : '', dev: true },
      { icon: 'certificate', dt: '授权', dd: Object.keys(licenses).map(function (k) { return k + ' ' + licenses[k]; }).join(' · '), dev: true },
      { icon: 'question', dt: '名称状态', dd: info.provisional ? '中文名拟定，待确认' : (info.unlisted ? '未入字典，按目录原文显示' : ''), dev: true }
    ].filter(function (r) { return r && r.dd; });

    const origins = [originsStrip(list, g), ecosystemStrip(list, g.slug)].filter(Boolean).join('');
    const claimHtml = '<p class="claim">' + WFChrome.icon('idcard') + '<span>' + (g.claimed
      ? who + '已认领此页。许可仍以每款字体的出处为准。'
      : '这是你的品牌？<a href="claim.html?slug=' + encodeURIComponent(g.slug) + '">认领此页</a>。通过后可改标志与介绍。') + '</span></p>';

    root.innerHTML =
      '<div class="container">' +
      '<div class="detail-top"><p class="crumb"><a href="foundry.html">厂商</a><span>/</span><span>' + esc(g.name) + '</span></p></div>' +
      '<header class="foundry-hero">' +
        '<div class="foundry-hero-main">' +
          '<div class="foundry-hero-id">' +
            WFChrome.foundryHtml(g.font, { info: info, sub: heroSubHtml(g), fav: WFChrome.favHtml('author', g.slug, g.name) }) +
          '</div>' +
          (desc ? '<p class="desc">' + esc(desc) + '</p>' : '') +
          partnersStrip(g) +
          WFSponsor.html(info) +
          origins +
        '</div>' +
        '<aside class="foundry-hero-side">' +
          '<dl class="kv">' + kv.map(function (r) {
            return '<div' + (r.dev ? ' class="for-dev"' : '') + '><dt>' + WFChrome.icon(r.icon) + esc(r.dt) + '</dt><dd>' +
              (r.html ? r.dd : esc(r.dd)) + '</dd></div>';
          }).join('') + '</dl>' +
          claimHtml +
        '</aside>' +
      '</header>' +
      ownedHtml(g) +
      recordSectionHtml(g.info) +
      (g.made.length
        ? '<div class="count-line">受托制作 <strong>' + g.made.length + '</strong> 款 · 版权归品牌方，不计入本页归属</div>' +
          '<ul class="specimens" id="made"></ul>'
        : '') +
      '</div>';
    const owned = splitOwned(g.fonts, g.collab || []);
    owned.sections.forEach(function (s) {
      const el = document.getElementById('rows-' + s.id);
      if (!el) return;
      const rows = window.WFProducts ? WFProducts.collapseForList(s.fonts) : s.fonts;
      WFSpecimen.renderRows(el, rows, {
        size: 56,
        foot: function (font) {
          const bits = [];
          if (s.id === 'collab') {
            const owner = font.ownerInfo || font.foundryInfo;
            if (owner) {
              bits.push('主归属 <a href="' + WFChrome.href('foundry.html?slug=' + encodeURIComponent(owner.id)) + '">' +
                esc(owner.name) + '</a>');
            }
          } else {
            const cols = font.collaboratorInfos || [];
            if (cols.length) {
              bits.push('联合作者 ' + cols.map(function (c) {
                return '<a href="' + WFChrome.href('foundry.html?slug=' + encodeURIComponent(c.id)) + '">' + esc(c.name) + '</a>';
              }).join(' · '));
            }
          }
          const up = upstreamFoot(list, font, owned.packsOf[font.id]);
          if (up && up.length) bits.push.apply(bits, up);
          const pc = window.WFProducts ? WFProducts.footHtml(font) : '';
          if (pc) bits.push(pc);
          return footHtml(bits);
        }
      });
    });
    if (g.made.length) {
      const made = window.WFProducts ? WFProducts.collapseForList(g.made) : g.made;
      WFSpecimen.renderRows(document.getElementById('made'), made, { size: 56 });
    }
    WFSponsor.bind(root);
  }

  WFProto.loadCatalog().then(function (list) {
    const go = function () {
      const slug = WFProto.getQuery('slug');
      if (!slug) { renderIndex(list); return; }
      const g = groups(list).filter(function (x) { return x.slug === slug || x.name === slug; })[0];
      if (!g) { root.innerHTML = '<p class="empty container">未找到该厂商。<a href="foundry.html">' + WFChrome.icon('building') + '查看全部厂商</a></p>'; return; }
      renderOne(list, g);
    };
    if (window.WFProducts) WFProducts.load().then(go);
    else go();
  });
})();
