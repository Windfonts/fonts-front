/* 谱系页：字族 × 双模式（谱=纵向家谱 / 墙=分带样张格）。
   规则真源 docs/DESIGN-SYSTEM.md。样张=「永」字一列（一字识一款，名字走 UI 字体）；
   谱系 git 线标：原作=commit、派生=branch（默认款不标，只标特殊关系）、地区版=merge、合作=compare；
   宽族默认收纳：根 + 一级子款平铺，更深的支线与超长平级折进「展开」。 */
(function () {
  const esc = WFProto.escapeHtml;
  const YONG = '永';
  const REL_ICON = { locale: 'merge', collab: 'compare', commissioned: '' };
  const REL_TEXT = { locale: '地区版', collab: '合作' };
  const FLAT_LIMIT = 12;   /* 平级超过此数折进「展开其余」 */
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
    return 'font-family:' + WFProto.cssFamilyStack(font.family) + ';font-weight:' + w;
  }
  function relMark(font) {
    const rel = font.lineage && font.lineage.relation;
    if (!rel || !REL_ICON[rel] || !REL_TEXT[rel]) return '';
    return WFChrome.icon(REL_ICON[rel]);
  }
  function metaOf(font) {
    const parts = [];
    if (font.charCount) parts.push('<b>' + WFProto.formatCount(font.charCount) + '</b> 字');
    if (font.releaseYear) parts.push(font.releaseYear);
    return parts.join(' · ');
  }
  function nodeInner(font) {
    const style = font.ghost ? '' : ' style="' + faceOf(font) + '"';
    return '<span class="lg-yong"' + style + ' aria-hidden="true">' + (font.ghost ? '·' : YONG) + '</span>' +
      '<span class="lg-name">' + relMark(font) + esc(font.name) + '</span>' +
      '<span class="lg-meta">' + (font.ghost ? '未收录原作' : metaOf(font)) + '</span>';
  }
  function nodeRow(font, opts) {
    const cls = 'lg-node' + (font.ghost ? ' is-ghost' : '') + (opts && opts.root ? ' is-root' : '');
    return font.ghost
      ? '<div class="' + cls + '">' + nodeInner(font) + '</div>'
      : '<a class="' + cls + '" href="' + WFChrome.href(WFProto.detailHref(font)) + '">' + nodeInner(font) + '</a>';
  }
  function foldBtn(label, icon) {
    return '<button type="button" class="lg-fold" data-fold>' + WFChrome.icon(icon) + esc(label) + '</button>';
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
        roots.push(f);
      } else if (up) {
        roots.push({ ghost: true, name: up, ghostChildren: [f] });
      } else {
        roots.push(f);
      }
    });
    /* 同族变体根（如「思源黑体 CN」对「思源黑体」）单向收编为主根孩子，防互相吸收清空 */
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

  /* 谱：小族全显；宽族收纳——根 + 一级子款平铺（超 FLAT_LIMIT 折尾），更深支线整支折叠 */
  function renderTree(members, forest) {
    const allowFold = members.length > FLAT_LIMIT + 4;
    function sublist(node, depth) {
      const kids = node.ghost ? node.ghostChildren : (forest.children[node.id] || []);
      if (!kids.length) return '';
      if (allowFold && depth >= 1) {
        return foldBtn('展开 ' + kids.length + ' 款', 'chevron-down') +
          '<ul hidden>' + kids.map(function (k) { return item(k, depth + 1); }).join('') + '</ul>';
      }
      const shown = allowFold ? kids.slice(0, FLAT_LIMIT) : kids;
      const rest = allowFold ? kids.slice(FLAT_LIMIT) : [];
      return '<ul>' + shown.map(function (k) { return item(k, depth + 1); }).join('') +
        (rest.length ? '<li class="lg-last">' + foldBtn('展开其余 ' + rest.length + ' 款', 'chevron-down') +
          '<ul hidden>' + rest.map(function (k) { return item(k, depth + 1); }).join('') + '</ul></li>' : '') + '</ul>';
    }
    function item(node, depth) {
      return '<li class="lg-last">' + nodeRow(node, { root: node._root }) + sublist(node, depth) + '</li>';
    }
    const rows = forest.roots.map(function (r) {
      r._root = !r.ghost;
      return item(r, 0);
    }).join('');
    return '<div class="lg-tree"><ul>' + rows + '</ul></div>';
  }

  /* 墙：按代分带，灰底圆角格。黑格（is-root）每屏只给主根一颗=子嗣最多的根 */
  function renderWall(members, forest) {
    const d = depthMap(members, forest);
    function subtreeSize(node) {
      const kids = node.ghost ? node.ghostChildren : (forest.children[node.id] || []);
      return 1 + kids.reduce(function (s, k) { return s + subtreeSize(k); }, 0);
    }
    const mainRootId = (function () {
      let best = null; let n = -1;
      forest.roots.forEach(function (r) {
        if (r.ghost) return;
        const s = subtreeSize(r);
        if (s > n) { n = s; best = r; }
      });
      return best ? best.id : '';
    })();
    const maxD = Math.max.apply(null, [0].concat(members.map(function (f) { return d[f.id] || 0; })));
    let html = '';
    for (let g = 0; g <= maxD; g++) {
      const band = members.filter(function (f) { return (d[f.id] || 0) === g; })
        .sort(function (a, b) {
          const ra = a.id === mainRootId ? -1 : 0; const rb = b.id === mainRootId ? -1 : 0;
          if (ra !== rb) return ra - rb;
          return (a.releaseYear || 9999) - (b.releaseYear || 9999) || String(a.name).localeCompare(b.name, 'zh');
        });
      if (!band.length) continue;
      const years = band.map(function (f) { return f.releaseYear; }).filter(Boolean);
      const yr = years.length ? (years.length > 1 && years[0] !== years[years.length - 1] ? years[0] + ' – ' + years[years.length - 1] : String(years[0])) : '年份未记';
      html += '<div class="lg-band"><p class="lg-band-cap"><span class="yr">' + esc(yr) + '</span>' +
        '<span class="t">' + WFChrome.icon(g === 0 ? 'commit' : 'branch') + (g === 0 ? '源 头' : '第 ' + '一二三四五六七八九'[Math.min(g - 1, 8)] + ' 代') + '</span><span class="rule"></span></p><div class="lg-wall">' +
        band.map(function (f) {
          return '<a class="lg-cell' + (f.id === mainRootId ? ' is-root' : '') + '" href="' + WFChrome.href(WFProto.detailHref(f)) + '">' +
            '<span class="lg-yong" style="' + faceOf(f) + '" aria-hidden="true">' + YONG + '</span>' +
            '<span class="lg-name">' + esc(f.name) + '</span>' +
            '<span class="lg-meta">' + metaOf(f) + '</span></a>';
        }).join('') + '</div></div>';
    }
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

  function wireFolds() {
    stage.querySelectorAll('.lg-fold').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const ul = btn.nextElementSibling;
        if (!ul) return;
        const open = ul.hasAttribute('hidden');
        if (open) ul.removeAttribute('hidden'); else ul.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        const m = btn.textContent.match(/\d+/);
        btn.innerHTML = WFChrome.icon('chevron-down') + esc(open ? '收起' : '展开' + (m ? ' ' + m[0] + ' 款' : ''));
      });
    });
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
      const short = String(gd.name || g).split(' / ')[0];
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
    /* 首页惯例：大标题用当前样张字体（这里=该族主根的本字） */
    if (mainRoot) heroTitle.setAttribute('style', faceOf(mainRoot));
    famCap.textContent = (gd.name || curGroup) + ' · ' + members.length + ' 款' +
      (forest.roots.length > 1 ? ' · ' + forest.roots.length + ' 条支线' : '');
    stage.innerHTML = mode === 'tree' ? renderTree(members, forest) : renderWall(members, forest);
    wireFolds();
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
