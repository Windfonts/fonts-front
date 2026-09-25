/* 谱系页：字族 × 双模式（乙支线=根卡+代际支线 / 丙墙=分带样张格+旁谱）。
   规则真源 docs/DESIGN-SYSTEM.md。样张=「永」；名字走 UI 字体；
   宽族默认收纳。对照稿见 lineage-redesign-options.html。 */
(function () {
  const esc = WFProto.escapeHtml;
  const YONG = '永';
  const REL_ICON = { locale: 'merge', collab: 'compare' };
  const REL_TEXT = { locale: '地区版', collab: '合作' };
  const FLAT_LIMIT = 12;
  const stage = document.getElementById('stage');
  const famNav = document.getElementById('famNav');
  const famCap = document.getElementById('famCap');
  const heroTitle = document.getElementById('heroTitle');
  const btnBranch = document.getElementById('modeBranch');
  const btnWall = document.getElementById('modeWall');

  let mode = 'branch';
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
  function foldBtn(label) {
    return '<button type="button" class="lg-fold" data-fold>' + WFChrome.icon('chevron-down') + esc(label) + '</button>';
  }
  function genLabel(g) {
    if (g === 0) return '源 头';
    return '第 ' + '一二三四五六七八九'[Math.min(g - 1, 8)] + ' 代';
  }

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
    function byYear(a, b) {
      return (a.releaseYear || 9999) - (b.releaseYear || 9999) || String(a.name).localeCompare(b.name, 'zh');
    }
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

  function subtreeSize(node, forest) {
    const kids = node.ghost ? node.ghostChildren : (forest.children[node.id] || []);
    return 1 + kids.reduce(function (s, k) { return s + subtreeSize(k, forest); }, 0);
  }

  function mainRootId(forest) {
    let best = null; let n = -1;
    forest.roots.forEach(function (r) {
      if (r.ghost) return;
      const s = subtreeSize(r, forest);
      if (s > n) { n = s; best = r; }
    });
    return best ? best.id : '';
  }

  /* —— 乙 · 根卡支线 —— */
  function renderBranch(members, forest) {
    const d = depthMap(members, forest);
    const deep = members.length <= FLAT_LIMIT + 4;
    let html = '';

    forest.roots.forEach(function (r) {
      if (r.ghost) {
        html += '<div class="lg-b-root is-ghost">' + nodeRow(r, { root: true }) + '</div>';
        (r.ghostChildren || []).forEach(function (k) {
          html += renderBranchKids(k, forest, deep);
        });
        return;
      }
      html += '<div class="lg-b-root">' + nodeRow(r, { root: true }) + '</div>';
      html += renderBranchKids(r, forest, deep);
    });

    const maxD = Math.max.apply(null, [0].concat(members.map(function (f) { return d[f.id] || 0; })));
    if (members.length > 20 && maxD >= 1) {
      const band = members.filter(function (f) { return (d[f.id] || 0) === 1; });
      if (band.length) {
        html += '<p class="lg-b-gen">' + esc(genLabel(1)) + ' · 平铺扫一眼</p>';
        html += '<ul class="lg-b-flat">' + band.slice(0, 16).map(function (f) {
          return '<li><a class="lg-chip" href="' + WFChrome.href(WFProto.detailHref(f)) + '">' +
            '<span class="lg-yong" style="' + faceOf(f) + '" aria-hidden="true">' + YONG + '</span>' +
            '<span class="lg-name">' + esc(f.name) + '</span></a></li>';
        }).join('') +
          (band.length > 16
            ? '<li><span class="lg-meta">另 ' + (band.length - 16) + ' 款见支线</span></li>'
            : '') +
          '</ul>';
      }
    }

    return html || '<p class="empty">暂无成员。</p>';
  }

  function renderBranchKids(parent, forest, deep) {
    const kids = forest.children[parent.id] || [];
    if (!kids.length) return '';
    let html = '<p class="lg-b-gen">' + esc(genLabel(1)) + '</p><div class="lg-b-branch"><ul>';
    kids.forEach(function (k, i) {
      const isLast = i === kids.length - 1;
      html += '<li' + (isLast ? ' class="lg-last"' : '') + '>' + nodeRow(k);
      const grand = forest.children[k.id] || [];
      if (grand.length) {
        if (!deep) {
          html += foldBtn('展开 ' + grand.length + ' 款') +
            '<ul hidden>' + grand.map(function (g, j) {
              return '<li' + (j === grand.length - 1 ? ' class="lg-last"' : '') + '>' + nodeRow(g) + '</li>';
            }).join('') + '</ul>';
        } else {
          html += '<ul>' + grand.map(function (g, j) {
            return '<li' + (j === grand.length - 1 ? ' class="lg-last"' : '') + '>' + nodeRow(g) + '</li>';
          }).join('') + '</ul>';
        }
      }
      html += '</li>';
    });
    html += '</ul></div>';
    return html;
  }

  /* —— 丙 · 墙 + 旁谱 —— */
  function renderWall(members, forest) {
    const d = depthMap(members, forest);
    const mid = mainRootId(forest);
    const rail = renderSlimRail(forest);
    const maxD = Math.max.apply(null, [0].concat(members.map(function (f) { return d[f.id] || 0; })));
    let wall = '';
    for (let g = 0; g <= maxD; g++) {
      const band = members.filter(function (f) { return (d[f.id] || 0) === g; })
        .sort(function (a, b) {
          const ra = a.id === mid ? -1 : 0; const rb = b.id === mid ? -1 : 0;
          if (ra !== rb) return ra - rb;
          return (a.releaseYear || 9999) - (b.releaseYear || 9999) || String(a.name).localeCompare(b.name, 'zh');
        });
      if (!band.length) continue;
      const years = band.map(function (f) { return f.releaseYear; }).filter(Boolean).sort();
      const yr = years.length
        ? (years[0] !== years[years.length - 1] ? years[0] + ' – ' + years[years.length - 1] : String(years[0]))
        : '年份未记';
      wall += '<div class="lg-band"><p class="lg-band-cap"><span class="yr">' + esc(yr) + '</span>' +
        '<span class="t">' + WFChrome.icon(g === 0 ? 'commit' : 'branch') + esc(genLabel(g)) + '</span>' +
        '<span class="rule"></span></p><div class="lg-wall">' +
        band.map(function (f) {
          return '<a class="lg-cell' + (f.id === mid ? ' is-root' : '') + '" href="' + WFChrome.href(WFProto.detailHref(f)) + '">' +
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
    if (ghosts.length) {
      wall += '<p class="count-line" style="margin-top:var(--s-4)">另有未收录原作：' + ghosts.map(esc).join('、') + '</p>';
    }

    return '<div class="lg-c"><aside class="lg-c-rail">' + rail + '</aside><div class="lg-c-main">' + wall + '</div></div>';
  }

  function renderSlimRail(forest) {
    function walk(node, isLast) {
      const kids = node.ghost ? node.ghostChildren : (forest.children[node.id] || []);
      const cls = 'lg-slim' + (node.ghost ? ' is-ghost' : '') + (node._root ? ' is-root' : '');
      const label = node.ghost
        ? '<span class="' + cls + '">' + esc(node.name) + '</span>'
        : '<a class="' + cls + '" href="' + WFChrome.href(WFProto.detailHref(node)) + '">' + esc(node.name) + '</a>';
      let html = '<li' + (isLast ? ' class="lg-last"' : '') + '>' + label;
      if (kids.length) {
        const shown = kids.length > 10 ? kids.slice(0, 10) : kids;
        html += '<ul>' + shown.map(function (k, i) {
          return walk(k, i === shown.length - 1 && kids.length <= 10);
        }).join('') +
          (kids.length > 10
            ? '<li class="lg-last"><span class="lg-slim is-ghost">…另 ' + (kids.length - 10) + ' 款</span></li>'
            : '') +
          '</ul>';
      }
      html += '</li>';
      return html;
    }
    const rows = forest.roots.map(function (r, i) {
      r._root = !r.ghost;
      return walk(r, i === forest.roots.length - 1);
    }).join('');
    return '<p class="lg-cap">旁谱</p><ul>' + rows + '</ul>';
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
    btnBranch.classList.toggle('is-on', m === 'branch');
    btnWall.classList.toggle('is-on', m === 'wall');
    btnBranch.setAttribute('aria-selected', m === 'branch' ? 'true' : 'false');
    btnWall.setAttribute('aria-selected', m === 'wall' ? 'true' : 'false');
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
    if (!curGroup && keys.length) {
      curGroup = qs('group') && counts[qs('group')] ? qs('group') : keys[0];
    }
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
    if (!curGroup || !groups[curGroup]) {
      stage.innerHTML = '<p class="empty">暂无谱系数据。</p>';
      return;
    }
    const members = all.filter(function (f) { return f.lineage && f.lineage.group === curGroup; });
    const forest = buildForest(members, all);
    const gd = groups[curGroup] || {};
    const mainRoot = forest.roots.filter(function (r) { return !r.ghost; })[0];
    if (mainRoot) heroTitle.setAttribute('style', faceOf(mainRoot));
    famCap.textContent = (gd.name || curGroup) + ' · ' + members.length + ' 款' +
      (forest.roots.length > 1 ? ' · ' + forest.roots.length + ' 条支线' : '');
    stage.innerHTML = mode === 'branch' ? renderBranch(members, forest) : renderWall(members, forest);
    wireFolds();
    document.title = (gd.name ? String(gd.name).split(' / ')[0] : '谱系') + ' · 谱系 · 文风字体';
  }

  btnBranch.addEventListener('click', function () { setMode('branch'); });
  btnWall.addEventListener('click', function () { setMode('wall'); });

  WFProto.loadCatalog().then(function () {
    try {
      const saved = localStorage.getItem('wf-lineage-mode');
      /* 旧键 tree → branch；未知值回落 branch */
      if (saved === 'wall') mode = 'wall';
      else mode = 'branch';
    } catch (e) {}
    const qm = qs('mode');
    if (qm === 'wall') mode = 'wall';
    else if (qm === 'branch' || qm === 'tree') mode = 'branch';
    btnBranch.classList.toggle('is-on', mode === 'branch');
    btnWall.classList.toggle('is-on', mode === 'wall');
    btnBranch.setAttribute('aria-selected', mode === 'branch' ? 'true' : 'false');
    btnWall.setAttribute('aria-selected', mode === 'wall' ? 'true' : 'false');
    renderFamNav();
    render();
  });
})();
