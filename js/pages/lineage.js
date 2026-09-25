/* 谱系页：字族 × 双模式（谱=纵向家谱 / 墙=分带样张墙）。
   规则真源 docs/DESIGN-SYSTEM.md：节点样张用自身字体（以字证字）；
   谱系 git 线标：原作/改自=commit、派生=branch、地区版/合作=merge、同支=compare（委托定制不加）。 */
(function () {
  const esc = WFProto.escapeHtml;
  const REL_ICON = { original: 'commit', fork: 'branch', locale: 'merge', collab: 'compare' };
  const REL_TEXT = { original: '原作', fork: '派生', locale: '地区版', collab: '合作' };
  const stage = document.getElementById('stage');
  const famNav = document.getElementById('famNav');
  const famCap = document.getElementById('famCap');
  const heroTitle = document.getElementById('heroTitle');
  const btnTree = document.getElementById('modeTree');
  const btnWall = document.getElementById('modeWall');

  let mode = 'tree';
  let curGroup = '';

  function qs(name) {
    return new URLSearchParams(location.search).get(name) || '';
  }
  function weightOf(font) {
    const ws = (font.weights && font.weights.length) ? font.weights : ['Regular'];
    const reg = ws.filter(function (w) { return /regular|normal/i.test(String(w)); })[0];
    return WFProto.weightToCss(reg || ws[0]);
  }
  function faceOf(font) {
    const w = weightOf(font);
    WFProto.ensureFontCss(font.family, w);
    return 'font-family:' + esc(WFProto.cssFamilyStack(font.family)) + ';font-weight:' + w;
  }
  /* setAttribute 不解码 HTML 实体，esc 过的引号会变成字面 &#39; 弄坏 CSS——直拼（栈内无尖括号，安全） */
  function faceAttr(font) {
    const w = weightOf(font);
    WFProto.ensureFontCss(font.family, w);
    return 'font-family:' + WFProto.cssFamilyStack(font.family) + ';font-weight:' + w;
  }
  function relMark(font) {
    const rel = font.lineage && font.lineage.relation;
    if (!rel || !REL_ICON[rel]) return '';
    return WFChrome.icon(REL_ICON[rel]) + '<b>' + REL_TEXT[rel] + '</b>';
  }
  function metaOf(font) {
    const parts = [];
    if (font.charCount) parts.push('<b>' + WFProto.formatCount(font.charCount) + '</b> 字');
    if (font.releaseYear) parts.push('<span>' + font.releaseYear + '</span>');
    const tier = WFProto.licenseTier(font);
    if (tier === '开源商用') parts.push('<span>开源</span>');
    return parts.join('');
  }

  /* 家族森林：组内成员按 upstreamName 建边；上游不在库（或在组外）即为根，未收录上游出幽灵节点 */
  function buildForest(members, all) {
    const byId = {};
    members.forEach(function (f) { byId[f.id] = f; });
    const children = {};
    let roots = [];
    members.forEach(function (f) {
      const rec = f.lineage || {};
      const up = rec.relation === 'original' ? '' : (rec.upstreamName || '');
      const parent = up ? WFChrome.findFontByName(all, up) : null;
      if (parent && byId[parent.id]) {
        (children[parent.id] = children[parent.id] || []).push(f);
      } else if (parent && !byId[parent.id]) {
        /* 上游在库但不在本组：按组切分惯例，此款即本组的引进起点 */
        roots.push(f);
      } else if (up) {
        roots.push({ ghost: true, name: up, ghostChildren: [f] });
      } else {
        roots.push(f);
      }
    });
    /* 同族变体根（如「思源黑体 CN」对「思源黑体」）收编为主根孩子，不另立支线。
       单向吸收：按名字长度升序遍历，只许长名挂在已确认的短名主根下，防互相吸收清空 */
    const mains = roots.filter(function (r) { return !r.ghost; })
      .sort(function (a, b) { return String(a.name).length - String(b.name).length; });
    const kept = [];
    const variants = [];
    mains.forEach(function (r) {
      const host = kept.filter(function (m) {
        return String(r.name).length > String(m.name).length && String(r.name).indexOf(m.name) === 0;
      })[0];
      if (host) variants.push([host, r]);
      else kept.push(r);
    });
    variants.forEach(function (pair) {
      (children[pair[0].id] = children[pair[0].id] || []).push(pair[1]);
    });
    roots = roots.filter(function (r) { return r.ghost; }).concat(kept);
    function byYear(a, b) { return (a.releaseYear || 9999) - (b.releaseYear || 9999) || String(a.name).localeCompare(b.name, 'zh'); }
    Object.keys(children).forEach(function (k) { children[k].sort(byYear); });
    roots.sort(byYear);
    return { roots: roots, children: children };
  }
  function depthMap(members, forest) {
    const d = {};
    function walk(node, depth) {
      const kids = node.ghost ? node.ghostChildren : (forest.children[node.id] || []);
      (kids || []).forEach(function (k) { d[k.id] = depth + 1; walk(k, depth + 1); });
    }
    forest.roots.forEach(function (r) { if (!r.ghost) d[r.id] = 0; walk(r, r.ghost ? -1 : 0); });
    return d;
  }

  function nodeRow(font, opts) {
    const ghost = font.ghost;
    const cls = 'lg-node' + (ghost ? ' is-ghost' : '') + (opts && opts.root ? ' is-root' : '');
    const style = ghost ? '' : ' style="' + faceOf(font) + '"';
    const meta = ghost ? '未收录原作' : (relMark(font) + metaOf(font));
    const inner = '<span class="lg-spec"' + style + '>' + esc(font.name) + '</span>' +
      '<span class="lg-meta">' + meta + '</span>';
    return ghost ? '<div class="' + cls + '">' + inner + '</div>'
      : '<a class="' + cls + '" href="' + WFChrome.href(WFProto.detailHref(font)) + '">' + inner + '</a>';
  }

  function renderTree(members, forest) {
    /* 纯函数递归：返回节点子树字符串，杜绝副作用拼接错位 */
    function walk(node, isLast) {
      const kids = node.ghost ? node.ghostChildren : (forest.children[node.id] || []);
      let row = '<li' + (isLast ? ' class="lg-last"' : '') + '>' + nodeRow(node, { root: node._root });
      if (kids.length) {
        row += '<ul>' + kids.map(function (k, i) { return walk(k, i === kids.length - 1); }).join('') + '</ul>';
      }
      return row + '</li>';
    }
    const rows = forest.roots.map(function (r, i) {
      r._root = !r.ghost;
      return walk(r, i === forest.roots.length - 1);
    }).join('');
    return '<div class="lg-tree"><ul>' + rows + '</ul></div>';
  }

  function renderWall(members, forest) {
    const d = depthMap(members, forest);
    const maxD = Math.max.apply(null, [0].concat(members.map(function (f) { return d[f.id] || 0; })));
    let html = '';
    for (let g = 0; g <= maxD; g++) {
      const band = members.filter(function (f) { return (d[f.id] || 0) === g; })
        .sort(function (a, b) { return (a.releaseYear || 9999) - (b.releaseYear || 9999) || String(a.name).localeCompare(b.name, 'zh'); });
      if (!band.length) continue;
      const years = band.map(function (f) { return f.releaseYear; }).filter(Boolean);
      const yr = years.length ? (years.length > 1 && years[0] !== years[years.length - 1] ? years[0] + ' – ' + years[years.length - 1] : String(years[0])) : '年份未记';
      html += '<div class="lg-band"><p class="lg-band-cap"><span class="yr">' + esc(yr) + '</span>' +
        '<span class="t">' + WFChrome.icon(g === 0 ? 'commit' : 'branch') + (g === 0 ? '源 头' : '第 ' + '一二三四五六七八九'[Math.min(g - 1, 8)] + ' 代') + '</span></p><div class="lg-wall">' +
        band.map(function (f) {
          return '<a class="lg-item' + (g === 0 ? ' is-root' : '') + '" href="' + WFChrome.href(WFProto.detailHref(f)) + '">' +
            '<span class="lg-spec" style="' + faceOf(f) + '">' + esc(f.name) + '</span>' +
            '<span class="lg-meta">' + metaOf(f) + '</span></a>';
        }).join('') + '</div></div>';
    }
    /* 未收录上游注脚（墙模式不占位，收进说明行） */
    const ghosts = [];
    const all = WFProto.getCatalogList();
    members.forEach(function (f) {
      const rec = f.lineage || {};
      const up = rec.upstreamName || '';
      if (up && rec.relation !== 'original' && !WFChrome.findFontByName(members, up) && !WFChrome.findFontByName(all, up)) {
        if (ghosts.indexOf(up) === -1) ghosts.push(up);
      }
    });
    if (ghosts.length) html += '<p class="count-line" style="margin-top:var(--s-4)">另有未收录原作：' + ghosts.map(esc).join('、') + '</p>';
    return html;
  }

  function setMode(m) {
    mode = m;
    try { localStorage.setItem('wf-lineage-mode', m); } catch (e) {}
    btnTree.classList.toggle('is-on', m === 'tree');
    btnWall.classList.toggle('is-on', m === 'wall');
    btnTree.setAttribute('aria-selected', m === 'tree');
    btnWall.setAttribute('aria-selected', m === 'wall');
    render();
  }
  function setGroup(g) {
    curGroup = g;
    const url = new URL(location.href);
    url.searchParams.set('group', g);
    history.replaceState(null, '', url);
    renderFamNav();
    render();
  }

  function renderFamNav() {
    const all = WFProto.getCatalogList();
    const ld = WFProto.getLineageData();
    const counts = {};
    all.forEach(function (f) {
      const g = (f.lineage && f.lineage.group) || '';
      if (g) counts[g] = (counts[g] || 0) + 1;
    });
    const keys = Object.keys(ld.groups || {}).filter(function (g) { return counts[g]; })
      .sort(function (a, b) { return counts[b] - counts[a]; });
    if (!curGroup && keys.length) curGroup = qs('group') && counts[qs('group')] ? qs('group') : keys[0];
    famNav.innerHTML = keys.map(function (g) {
      const gd = ld.groups[g] || {};
      const nm = gd.name || g;
      const short = String(nm).split(' / ')[0];
      return '<button type="button" class="chip' + (g === curGroup ? ' is-on' : '') + '" data-group="' + esc(g) + '">' +
        esc(short) + '<span class="n">' + counts[g] + '</span></button>';
    }).join('');
    famNav.querySelectorAll('.chip').forEach(function (a) {
      a.addEventListener('click', function () { setGroup(a.getAttribute('data-group')); });
    });
  }

  function render() {
    const all = WFProto.getCatalogList();
    const ld = WFProto.getLineageData();
    const groups = ld.groups || {};
    if (!curGroup || !groups[curGroup]) { stage.innerHTML = '<p class="empty">暂无谱系数据。</p>'; return; }
    const members = all.filter(function (f) { return f.lineage && f.lineage.group === curGroup; });
    const forest = buildForest(members, all);
    const gd = groups[curGroup] || {};
    const mainRoot = forest.roots.filter(function (r) { return !r.ghost; })[0];
    /* 首页惯例：大标题用当前样张字体渲染（这里=该族主根的本字） */
    if (mainRoot) {
      heroTitle.setAttribute('style', faceAttr(mainRoot));
      heroTitle.textContent = '字有师承。';
    }
    famCap.textContent = (gd.name || curGroup) + ' · ' + members.length + ' 款' +
      (forest.roots.length > 1 ? ' · ' + forest.roots.length + ' 条支线' : '');
    stage.innerHTML = mode === 'tree' ? renderTree(members, forest) : renderWall(members, forest);
    document.title = (gd.name ? String(gd.name).split(' / ')[0] : '谱系') + ' · 谱系 · 文风字体';
  }

  btnTree.addEventListener('click', function () { setMode('tree'); });
  btnWall.addEventListener('click', function () { setMode('wall'); });

  WFProto.loadCatalog().then(function () {
    try { mode = localStorage.getItem('wf-lineage-mode') === 'wall' ? 'wall' : 'tree'; } catch (e) {}
    const qm = qs('mode');
    if (qm === 'wall' || qm === 'tree') mode = qm;
    btnTree.classList.toggle('is-on', mode === 'tree');
    btnWall.classList.toggle('is-on', mode === 'wall');
    renderFamNav();
    render();
  });
})();
