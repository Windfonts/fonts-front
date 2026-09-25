/* 谱系页（现网 lineage.html）
   - 四模式：激活 (plex) / 图 (flow) / 支线 (branch) / 墙 (wall)；URL ?mode=；tree→branch
   - 激活/图：画布邻域 + L→R；宽扇叶走主题支节点
   - 支线/墙：renderBranch / renderWall
   - 大族默认激活，小族默认图；若 localStorage 为 branch/wall 则尊重 */
(function () {
  const esc = WFProto.escapeHtml;
  const DEFAULT_GROUP = 'lxgw-wenkai';
  /* 顶栏只放大族；其余组数据保留，URL ?group= 仍可进 */
  const MAJOR_GROUPS = {
    lineage: ['source-han-sans', 'source-han-serif', 'lxgw-wenkai'],
    brand: ['alibaba-sans', 'zcool', 'qiantu', 'maoken', 'pangmen']
  };
  const MAJOR_GROUP_SET = {};
  MAJOR_GROUPS.lineage.concat(MAJOR_GROUPS.brand).forEach(function (g) { MAJOR_GROUP_SET[g] = true; });

  const CARD_W = 184;
  const CARD_H = 72;
  const CARD_H_CLUSTER = 84;
  const CARD_H_COMPACT = 62;
  const COL_GAP = 108;
  const ROW_GAP = 18;
  const PAD_X = 56;
  const PAD_Y = 48;
  const YONG = '永';
  const FLOW_CHILD_CAP = 6;
  const FAN_CLUSTER_MIN = 8;
  const CLUSTER_EXPAND_COL = 7; /* ~6–8 cards/col → landscape when flat */
  const PREFIX_MIN_MEMBERS = 3;
  const OWNER_MIN_MEMBERS = 5;
  const AUTO_CLUSTER_THRESHOLD = 12;
  const AUTO_PLEX_FAN = 12;
  const AUTO_PLEX_MEMBERS = 20;
  const PLEX_PARENT_DEPTH = 2;
  const PLEX_SIBLING_SIDE = 2; /* each side */
  const PLEX_CHILD_CAP = 8;
  const NESTED_BRAND_LEAF_CAP = 8; /* fonts under a nested brand hub */
  const PLEX_GATE_FAN = 8;
  const PLEX_V_GAP = 64;
  const PLEX_H_GAP = 36;
  const PLEX_NEST_H_GAP = 64; /* column gap between nested brand subtrees */
  const PLEX_NEST_V_GAP = 80; /* hub → leaf vertical; room for curved stubs */
  const MODES = ['plex', 'flow', 'branch', 'wall'];

  const REL_LABEL = {
    fork: '衍生',
    locale: '地区版',
    collab: '合作',
    commissioned: '委托',
    original: ''
  };

  const famNav = document.getElementById('famNav');
  const modeNav = document.getElementById('modeNav');
  const famCap = document.getElementById('famCap');
  const footNote = document.getElementById('footNote');
  const heroTitle = document.getElementById('heroTitle');
  const flowWrap = document.getElementById('flowWrap');
  const flowTools = document.getElementById('flowTools');
  const flowToolsSep = document.getElementById('flowToolsSep');
  const viewport = document.getElementById('viewport');
  const stage = document.getElementById('flowStage'); /* canvas transform root */
  const htmlStage = document.getElementById('stage'); /* branch/wall HTML */
  const edgesSvg = document.getElementById('edges');
  const nodesEl = document.getElementById('nodes');
  const emptyEl = document.getElementById('empty');
  const zoomLabel = document.getElementById('zoomLabel');
  const modeHint = document.getElementById('modeHint');
  const plexPick = document.getElementById('plexPick');
  const clusterNav = { hidden: true, innerHTML: '', querySelectorAll: function () { return []; } };
  const wallEl = { hidden: true, innerHTML: '', querySelectorAll: function () { return []; } };

  let curGroup = '';
  let curMode = ''; /* plex | flow | cluster | wall — '' until decided */
  let modeLocked = false; /* URL ?mode= locks until user picks */
  let clusterFilter = ''; /* prefix / owner key / '' */
  let expandedClusters = {}; /* clusterId → true */
  let expandedMores = {}; /* moreId → true */
  let expandedBrandHubs = {}; /* nested brandHubId → true/false; unset = expanded */
  let layout = null;
  let forestCache = null;
  let detectedClusters = []; /* [{id,kind,key,title,count,memberIds,parentName}] */
  let wallMembers = [];
  let focusId = '';
  let faceMergeAlias = {}; /* variant font id → collapsed card id */

  /* 激活模式：进入某主题支后只画该支上级+成员；点主题支进入，点卡激活时清除 */
  let plexBranch = null; /* { key, parentId, memberIds: [] } | null */
  let view = { x: 40, y: 40, scale: 1 };
  let lastCanvasView = null; /* restore when returning to canvas */
  let dragging = false;
  let dragStart = null;
  const viewShell = document.getElementById('viewShell');
  const FOOT_PLAIN = '激活看邻域，图看关系，支线看代际，墙看样张；字体名用它自己的字型排印。';

  /* —— 乙支线 / 丙墙（现网 HTML） —— */
  const REL_ICON = { locale: 'merge', collab: 'compare' };
  const REL_TEXT = { locale: '地区版', collab: '合作' };
  const FLAT_LIMIT = 12;

  function htmlWeightOf(font) {
    const ws = (font.weights && font.weights.length) ? font.weights : ['Regular'];
    const reg = ws.filter(function (w) { return /regular|normal/i.test(String(w)); })[0];
    return WFProto.weightToCss(reg || ws[0]);
  }
  /** Inline style for HTML attrs: single-quoted family only.
   *  cssFamilyStack uses "PingFang SC" etc.; those " break style="..." and leave a trailing
   *  comma so the whole font-family decl is invalid → 永 inherits site UI (all look identical). */
  function htmlFaceOf(font) {
    if (!font || !font.family || font.ghost) return '';
    const w = htmlWeightOf(font);
    WFProto.ensureFontCss(font.family, w);
    const fam = String(font.family).replace(/['"]/g, '');
    return "font-family:'" + fam + "';font-weight:" + w;
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
    let yongHtml;
    if (font.ghost) {
      yongHtml = '<span class="lg-yong" aria-hidden="true">·</span>';
    } else if (!font.family) {
      yongHtml = '<span class="lg-yong" aria-hidden="true"></span>';
    } else {
      const w = htmlWeightOf(font);
      const face = htmlFaceOf(font);
      yongHtml = '<span class="lg-yong" data-face="' + esc(font.family) + '|' + w + '"' +
        (face ? ' style="' + face + '"' : '') + ' aria-hidden="true">' + YONG + '</span>';
    }
    return yongHtml +
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

  function buildHtmlForest(members, all) {
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
          const chipFace = htmlFaceOf(f);
          const chipW = f.family ? htmlWeightOf(f) : '';
          const chipYong = (f.family && chipFace)
            ? '<span class="lg-yong" data-face="' + esc(f.family) + '|' + chipW + '" style="' + chipFace + '" aria-hidden="true">' + YONG + '</span>'
            : '<span class="lg-yong" aria-hidden="true"></span>';
          return '<li><a class="lg-chip" href="' + WFChrome.href(WFProto.detailHref(f)) + '">' +
            chipYong +
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
  function renderWallHtml(members, forest) {
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
          const cellFace = htmlFaceOf(f);
          const cellW = f.family ? htmlWeightOf(f) : '';
          const cellYong = (f.family && cellFace)
            ? '<span class="lg-yong" data-face="' + esc(f.family) + '|' + cellW + '" style="' + cellFace + '" aria-hidden="true">' + YONG + '</span>'
            : '<span class="lg-yong" aria-hidden="true"></span>';
          return '<a class="lg-cell' + (f.id === mid ? ' is-root' : '') + '" href="' + WFChrome.href(WFProto.detailHref(f)) + '">' +
            cellYong +
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
    htmlStage.querySelectorAll('.lg-fold').forEach(function (btn) {
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


  function qs(name) {
    return new URLSearchParams(location.search).get(name) || '';
  }

  function setUrlParam(key, val) {
    const url = new URL(location.href);
    if (val == null || val === '') url.searchParams.delete(key);
    else url.searchParams.set(key, val);
    history.replaceState(null, '', url);
  }


  function branchKeyOf(gate) {
    if (!gate) return '';
    if (gate.clusterKey) return String(gate.clusterKind || 'prefix') + ':' + gate.clusterKey;
    if (gate.id) return 'gate:' + gate.id;
    return '';
  }

  function setPlexBranch(gate) {
    if (!gate || !gate.members || !gate.members.length) {
      plexBranch = null;
      setUrlParam('branch', '');
      return;
    }
    plexBranch = {
      key: branchKeyOf(gate),
      parentId: gate.parentId || '',
      memberIds: gate.members.map(function (m) { return m.id; }),
      title: gate.gateTitle || gate.name || ''
    };
    setUrlParam('branch', plexBranch.key);
  }

  function clearPlexBranch() {
    plexBranch = null;
    setUrlParam('branch', '');
  }

  function memberIdSet(ids) {
    const s = {};
    (ids || []).forEach(function (id) { s[id] = true; });
    return s;
  }

  function placeChildRows(place, edges, focus, nodes, focusX, focusY, cx, opts) {
    opts = opts || {};
    const compact = opts.compact !== false;
    const cols = Math.max(3, Math.min(7, nodes.length <= 4 ? nodes.length : (nodes.length <= 12 ? 4 : 6)));
    const rows = Math.ceil(nodes.length / cols) || 1;
    const rowH = CARD_H_COMPACT + PLEX_V_GAP * 0.55;
    nodes.forEach(function (n, i) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const rowNodes = Math.min(cols, nodes.length - row * cols);
      const rowW = rowNodes * CARD_W + Math.max(0, rowNodes - 1) * PLEX_H_GAP;
      const rowLeft = cx - rowW / 2;
      const x = rowLeft + col * (CARD_W + PLEX_H_GAP);
      const y = focusY + CARD_H + PLEX_V_GAP + row * rowH;
      place(n, x, y, CARD_H_COMPACT, { role: 'child', compact: compact });
      edges.push({
        from: focus.id,
        to: n.id,
        label: relLabel(n, focus)
      });
    });
    return rows;
  }

  function weightOf(font) {
    const ws = (font.weights && font.weights.length) ? font.weights : ['Regular'];
    const reg = ws.filter(function (w) { return /regular|normal/i.test(String(w)); })[0];
    return WFProto.weightToCss(reg || ws[0]);
  }

  function faceOf(font) {
    if (!font || font.ghost || font.outgroup || font.isCluster || font.isMore || font.isSeries || font.isPlexGate || !font.family) return '';
    const w = weightOf(font);
    WFProto.ensureFontCss(font.family, w);
    const fam = String(font.family).replace(/['"]/g, '');
    /* Specimen glyph: primary wenfeng family only (HTML-attr safe). Fallbacks mask load bugs. */
    return "font-family:'" + fam + "';font-weight:" + w;
  }

  function canSpecimenFace(font) {
    return !!(font && font.family && !font.ghost && !font.outgroup &&
      !font.isCluster && !font.isMore && !font.isSeries && !font.isPlexGate);
  }

  function faceSpecKey(font) {
    if (!canSpecimenFace(font)) return '';
    return font.family + '|' + weightOf(font);
  }

  function debugFaceOn() {
    try { return /(?:^|[?&])debugFace=1(?:&|$)/.test(location.search); } catch (e) { return false; }
  }

  /** Batch-load 永 for visible real fonts; dedupe by family|weight; mark spans ready. */
  function readyVisibleFaces(fonts) {
    const seen = {};
    const dbg = debugFaceOn();
    (fonts || []).forEach(function (font) {
      const key = faceSpecKey(font);
      if (!key || seen[key]) return;
      seen[key] = true;
      const fam = String(font.family).replace(/['"]/g, '');
      const w = weightOf(font);
      WFProto.readyFace(fam, w, YONG).then(function () {
        /* Re-assert face on elements: survives re-render with same data-face; also fixes any
           leftover broken style="...\"PingFang...\"..." from older HTML. */
        document.querySelectorAll('.lfl-yong[data-face], .lg-yong[data-face], .lfl-wall-yong[data-face]').forEach(function (el) {
          if (el.getAttribute('data-face') !== key) return;
          el.style.fontFamily = "'" + fam + "'";
          el.style.fontWeight = w;
          el.classList.add('is-face-ready');
        });
        if (heroTitle && heroTitle.getAttribute('data-face') === key) {
          heroTitle.style.fontFamily = "'" + fam + "'";
          heroTitle.style.fontWeight = w;
          heroTitle.classList.add('is-face-ready');
        }
        if (dbg && document.fonts && document.fonts.check) {
          const ok = document.fonts.check(w + ' 32px "' + fam + '"', YONG);
          if (!ok) console.warn('[debugFace] loaded but check failed', key);
        }
      }, function (err) {
        if (dbg) console.warn('[debugFace] face load failed', key, err || '');
      });
    });
  }

  function licShort(font) {
    if (!font || font.ghost || font.isCluster || font.isMore || font.isSeries) return '';
    const ln = String(font.licenseName || font.license || '');
    if (/OFL|Open Font License/i.test(ln)) return 'OFL';
    if (/IPA/i.test(ln)) return 'IPA';
    if (/Apache/i.test(ln)) return 'Apache';
    if (/\bMIT\b/i.test(ln)) return 'MIT';
    if (/CC0|CC BY/i.test(ln)) return 'CC';
    if (/GPL/i.test(ln)) return 'GPL';
    if (/仓耳/i.test(ln)) return '仓耳';
    const tier = WFProto.licenseTier ? WFProto.licenseTier(font) : '';
    if (tier && tier !== '待核实') return tier.length > 6 ? tier.slice(0, 6) : tier;
    return ln ? ln.slice(0, 8) : '';
  }

  function whoOf(font) {
    if (!font || font.ghost || font.isCluster || font.isMore || font.isSeries) return '';
    const info = font.ownerInfo || font.foundryInfo || font.makerInfo || font.brand;
    if (info) return info.short || info.name || info.en || '';
    return font.foundry || '';
  }

  function ownerKeyOf(font) {
    if (!font || font.ghost) return '';
    const lin = font.lineage || {};
    if (lin.ownerId) return 'o:' + lin.ownerId;
    if (lin.makerId) return 'm:' + lin.makerId;
    if (font.ownerInfo && font.ownerInfo.id) return 'o:' + font.ownerInfo.id;
    if (font.makerInfo && font.makerInfo.id) return 'm:' + font.makerInfo.id;
    return '';
  }

  function ownerLabelOf(font) {
    const info = font.ownerInfo || font.makerInfo || font.foundryInfo;
    if (info) return info.short || info.name || info.en || info.id || '';
    return font.foundry || font.designerShort || '';
  }

  function relLabel(node, parent) {
    if (!node || node.ghost || node.outgroup || node.isCluster || node.isMore) return '';
    if (node.edgeLabel) return node.edgeLabel;
    if (node.isSeries) {
      if (node.isBrandFamily && parent && parent.isBrandFamily) return node.edgeLabel || '合作';
      return '';
    }
    const rec = node.lineage || {};
    const r = rec.relation || '';
    if (Object.prototype.hasOwnProperty.call(REL_LABEL, r)) return REL_LABEL[r];
    if (parent && (parent.ghost || parent.outgroup)) return '衍生';
    return r ? String(r) : '衍生';
  }

  /* —— forest —— */
  /* 同字面合并：字重 / Screen·Plus·Full / 地区切分 → 一张卡 */
  const FACE_TRIM_RE = /(?:\s+|[-·‧])(?:W0[1-9]|Screen\s+Full|Screen|Plus|Full|Light|Bold|Regular|Medium|TC|SC|GB|CL|MN|CN|TW|HK|JP|KR|Code|Slab)$/i;

  function faceBaseName(name) {
    let n = String(name || '').trim();
    let guard = 0;
    while (guard++ < 8) {
      const next = n.replace(FACE_TRIM_RE, '');
      if (next === n) break;
      n = next.trim();
    }
    return n || String(name || '').trim();
  }

  function faceSuffixTokens(name, base) {
    let rest = String(name || '');
    if (base && rest.indexOf(base) === 0) rest = rest.slice(base.length);
    return rest.split(/[\s·‧_-]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function collapseFaceVariants(members) {
    faceMergeAlias = {};
    const buckets = {};
    (members || []).forEach(function (f) {
      if (!f || !f.id) return;
      const base = faceBaseName(f.name);
      (buckets[base] = buckets[base] || []).push(f);
    });
    const out = [];
    Object.keys(buckets).forEach(function (base) {
      const list = buckets[base];
      if (list.length === 1) {
        out.push(list[0]);
        return;
      }
      list.sort(function (a, b) {
        function score(f) {
          const r = (f.lineage && f.lineage.relation) || '';
          let s = 0;
          if (f.name === base) s += 200;
          if (r === 'original') s += 100;
          if (r === 'fork') s += 40;
          if (r === 'locale') s -= 20;
          s += Math.max(0, 80 - String(f.name).length);
          return s;
        }
        return score(b) - score(a) || String(a.name).localeCompare(b.name, 'zh');
      });
      const main = Object.assign({}, list[0]);
      const tokens = [];
      list.forEach(function (f) {
        faceSuffixTokens(f.name, base).forEach(function (tok) {
          const up = tok.toUpperCase();
          if (tokens.indexOf(up) === -1) tokens.push(up);
        });
        if (f.id !== main.id) faceMergeAlias[f.id] = main.id;
      });
      if (main.name !== base) main.name = base;
      main.mergeNote = tokens.length ? ('含 ' + tokens.join('·')) : ('同族 ' + list.length + ' 款');
      main.mergedCount = list.length;
      main.mergedIds = list.map(function (f) { return f.id; });
      out.push(main);
    });
    out.sort(function (a, b) {
      return (a.releaseYear || 9999) - (b.releaseYear || 9999) ||
        String(a.name).localeCompare(b.name, 'zh');
    });
    return out;
  }

  function resolveFocusId(id, forest) {
    if (!id) return '';
    if (forest && forest.byId[id]) return id;
    const mapped = faceMergeAlias[id];
    if (mapped && forest && forest.byId[mapped]) return mapped;
    return forest && forest.byId[id] ? id : (mapped || id);
  }

  function buildForest(members, all, opts) {
    opts = opts || {};
    /* 品牌/平台芯片：成员作品牌目录，忽略跨组 upstream，避免幽灵思源顶卡 */
    const catalogMode = !!opts.catalogMode;
    const byId = {};
    members.forEach(function (f) { byId[f.id] = f; });
    const children = {};
    const parentOf = {};
    let roots = [];

    function ensureGhost(name, extras) {
      const gid = 'ghost:' + name;
      let g = byId[gid];
      if (!g) {
        g = { ghost: true, id: gid, name: name, ghostChildren: [] };
        if (extras) Object.keys(extras).forEach(function (k) { g[k] = extras[k]; });
        byId[gid] = g;
        roots.push(g);
      }
      return g;
    }

    members.forEach(function (f) {
      const rec = f.lineage || {};
      const up = rec.relation === 'original' ? '' : (rec.upstreamName || '');
      if (!up) {
        roots.push(f);
        return;
      }
      const parent = WFChrome.findFontByName(all, up);
      if (parent && byId[parent.id]) {
        (children[parent.id] = children[parent.id] || []).push(f);
        parentOf[f.id] = parent.id;
      } else if (catalogMode) {
        /* 上游不在本芯片成员集：目录视图下作平级根，交给品牌枢纽 */
        roots.push(f);
      } else if (parent && !byId[parent.id]) {
        const oid = 'out:' + parent.id;
        let og = byId[oid];
        if (!og) {
          og = {
            outgroup: true,
            id: oid,
            name: parent.name,
            en: parent.en,
            family: parent.family,
            charCount: parent.charCount,
            releaseYear: parent.releaseYear,
            weights: parent.weights,
            lineage: parent.lineage,
            licenseName: parent.licenseName,
            license: parent.license,
            ownerInfo: parent.ownerInfo,
            foundryInfo: parent.foundryInfo,
            makerInfo: parent.makerInfo,
            brand: parent.brand,
            foundry: parent.foundry,
            outGroupKey: (parent.lineage && parent.lineage.group) || '',
            ghostChildren: []
          };
          byId[oid] = og;
          roots.push(og);
        }
        og.ghostChildren.push(f);
        parentOf[f.id] = oid;
      } else {
        const g = ensureGhost(up);
        g.ghostChildren.push(f);
        parentOf[f.id] = g.id;
      }
    });

    const mains = roots.filter(function (r) { return !r.ghost && !r.outgroup; })
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
      roots = roots.filter(function (r) { return r.id !== pair[1].id; });
      (children[pair[0].id] = children[pair[0].id] || []).push(pair[1]);
      parentOf[pair[1].id] = pair[0].id;
    });
    roots = roots.filter(function (r) { return r.ghost || r.outgroup || kept.indexOf(r) !== -1; });

    function byYear(a, b) {
      return (a.releaseYear || 9999) - (b.releaseYear || 9999) || String(a.name).localeCompare(b.name, 'zh');
    }
    Object.keys(children).forEach(function (k) { children[k].sort(byYear); });
    roots.forEach(function (r) {
      if ((r.ghost || r.outgroup) && r.ghostChildren) r.ghostChildren.sort(byYear);
    });
    roots.sort(byYear);
    return { roots: roots, children: children, parentOf: parentOf, byId: byId };
  }

  function kidsOf(node, forest) {
    if (node.ghost || node.outgroup) return node.ghostChildren || [];
    return forest.children[node.id] || [];
  }



  /* 品牌方母公司枢纽：有 parentId 的厂商 → 顶节点为母公司，子品牌作中间系节点 */
  function brandOwnerFd(font) {
    if (!font || !WFProto.getFoundryById) return null;
    const id = (font.ownerInfo && font.ownerInfo.id) ||
      (font.lineage && font.lineage.ownerId) || '';
    return id ? WFProto.getFoundryById(id) : null;
  }

  function brandTopFd(fd) {
    if (!fd || !WFProto.getFoundryParent) return fd;
    let cur = fd;
    let guard = 0;
    while (cur && cur.parentId && guard++ < 8) {
      const p = WFProto.getFoundryParent(cur);
      if (!p) break;
      cur = p;
    }
    return cur;
  }

  function makeBrandFamilyNode(fd, fonts) {
    let year = 9999;
    (fonts || []).forEach(function (m) {
      if (m.releaseYear && m.releaseYear < year) year = m.releaseYear;
    });
    return {
      isSeries: true,
      isBrandFamily: true,
      id: 'brand:' + fd.id,
      name: fd.name || fd.id,
      seriesTitle: fd.name || fd.id,
      seriesSub: '品牌 · 旗下 ' + ((fonts || []).length) + ' 款',
      seriesCount: (fonts || []).length,
      members: (fonts || []).slice(),
      brandId: fd.id,
      foundryInfo: fd,
      ownerInfo: fd,
      releaseYear: year === 9999 ? 0 : year
    };
  }

  function injectBrandFamilyNodes(forest) {
    if (!forest || !WFProto.getFoundryParent || !WFProto.getFoundryById) return forest;
    const getKids = WFProto.getFoundryChildren || function () { return []; };

    function isBrandOrPlatform(fd) {
      return !!(fd && (fd.kind === 'brand' || fd.kind === 'platform'));
    }

    /* 专属芯片（group id === ownerId）下 author 也造顶卡：庞门/胡晓波 */
    function shouldFlatHub(fd) {
      if (!fd) return false;
      if (isBrandOrPlatform(fd)) return true;
      if (fd.kind === 'author' && curGroup === fd.id) return true;
      /* 站酷视图：胡晓波合作方也出枢纽卡 */
      if (fd.kind === 'author' && curGroup === 'zcool' && fd.id === 'huxiaobo') return true;
      return false;
    }

    /* topId → { topFd, childBuckets: { id: { fd, fonts } }, direct: [], flatMulti?: true } */
    const buckets = {};
    forest.roots.forEach(function (r) {
      if (!r || r.ghost || r.outgroup || r.isSeries || r.isCluster ||
          r.isMore || r.isBrandFamily || r.isPlexGate) return;
      const fd = brandOwnerFd(r);
      if (!fd) return;
      const parent = WFProto.getFoundryParent(fd);
      if (parent) {
        /* 子公司路径优先：挂到母公司枢纽，不另走平台多款规则 */
        const top = brandTopFd(fd);
        const b = buckets[top.id] || (buckets[top.id] = { topFd: top, childBuckets: {}, direct: [] });
        const cb = b.childBuckets[fd.id] || (b.childBuckets[fd.id] = { fd: fd, fonts: [] });
        cb.fonts.push(r);
        return;
      }
      if (getKids(fd.id).length) {
        /* 字典已有子公司（阿里巴巴）：母公司直属字进 direct，既有路径胜出 */
        const b = buckets[fd.id] || (buckets[fd.id] = { topFd: fd, childBuckets: {}, direct: [] });
        b.direct.push(r);
        return;
      }
      /* 无 parentId、无子公司：brand/platform（或专属 author 芯片）且本林 ≥2 根时造品牌枢纽 */
      if (shouldFlatHub(fd)) {
        const b = buckets[fd.id] || (buckets[fd.id] = {
          topFd: fd, childBuckets: {}, direct: [], flatMulti: true
        });
        b.direct.push(r);
      }
    });

    function byYear(a, b) {
      return (a.releaseYear || 9999) - (b.releaseYear || 9999) ||
        String(a.name).localeCompare(b.name, 'zh');
    }

    Object.keys(buckets).forEach(function (topId) {
      const b = buckets[topId];
      const childIds = Object.keys(b.childBuckets);
      /* 无子公司字体、也无挂在母公司名下的字 → 跳过 */
      if (!childIds.length && !b.direct.length) return;
      /* 仅母公司直属、字典里也无子公司：默认不造枢纽；例外=平台/品牌多款扁平原主 */
      if (!childIds.length && !getKids(topId).length) {
        if (!(b.flatMulti && shouldFlatHub(b.topFd) && b.direct.length >= 2)) return;
      }

      const moved = {};
      const allFonts = b.direct.slice();
      childIds.forEach(function (cid) {
        b.childBuckets[cid].fonts.forEach(function (f) {
          allFonts.push(f);
          moved[f.id] = true;
        });
      });
      b.direct.forEach(function (f) { moved[f.id] = true; });

      forest.roots = forest.roots.filter(function (r) { return !moved[r.id]; });

      const hubFonts = [];
      const hubKids = [];

      childIds.sort(function (a, bId) {
        return String(b.childBuckets[a].fd.name || a)
          .localeCompare(String(b.childBuckets[bId].fd.name || bId), 'zh');
      }).forEach(function (cid) {
        const cb = b.childBuckets[cid];
        const fonts = cb.fonts.slice().sort(byYear);
        fonts.forEach(function (f) { hubFonts.push(f); });
        const childNode = makeBrandFamilyNode(cb.fd, fonts);
        forest.byId[childNode.id] = childNode;
        forest.parentOf[childNode.id] = 'brand:' + topId;
        forest.children[childNode.id] = fonts;
        fonts.forEach(function (f) { forest.parentOf[f.id] = childNode.id; });
        hubKids.push(childNode);
      });

      b.direct.slice().sort(byYear).forEach(function (f) {
        hubFonts.push(f);
        forest.parentOf[f.id] = 'brand:' + topId;
        hubKids.push(f);
      });

      const hub = makeBrandFamilyNode(b.topFd, hubFonts);
      /* hub.members 含全部叶子；children 为子品牌节点 + 直属字 */
      forest.byId[hub.id] = hub;
      forest.children[hub.id] = hubKids;
      forest.parentOf[hub.id] = '';
      forest.roots.push(hub);
    });

    forest.roots.sort(byYear);
    return forest;
  }

  /* 站酷 ↔ 胡晓波：品牌枢纽互挂，边标「合作」 */
  function injectZcoolHuxiaoboLink(forest) {
    if (!forest) return forest;
    const zHub = forest.byId['brand:zcool'];
    const hHub = forest.byId['brand:huxiaobo'];

    function nestUnder(parent, child, label) {
      if (!parent || !child || parent.id === child.id) return;
      forest.roots = forest.roots.filter(function (r) { return r.id !== child.id; });
      forest.parentOf[child.id] = parent.id;
      const kids = forest.children[parent.id] || (forest.children[parent.id] = []);
      if (kids.indexOf(child) === -1) kids.push(child);
      child.edgeLabel = label || '合作';
    }

    if (curGroup === 'zcool' && zHub && hHub) {
      nestUnder(zHub, hHub, '合作');
      const nFonts = hHub.seriesCount || (hHub.members && hHub.members.length) || 0;
      if (!hHub.seriesSub || /旗下|点开看/.test(hHub.seriesSub)) {
        hHub.seriesSub = '合作 · 旗下 ' + nFonts + ' 款';
      }
      return forest;
    }

    if (curGroup === 'huxiaobo' && hHub && !zHub) {
      const zcFd = WFProto.getFoundryById ? WFProto.getFoundryById('zcool') : null;
      const zc = makeBrandFamilyNode(zcFd || { id: 'zcool', name: '站酷' }, []);
      zc.seriesSub = '站酷出品 · 合作相关';
      zc.seriesCount = zc.seriesCount || 0;
      zc.isRelatedHub = true;
      forest.byId[zc.id] = zc;
      forest.parentOf[zc.id] = '';
      forest.children[zc.id] = [];
      nestUnder(zc, hHub, '合作');
      if (forest.roots.indexOf(zc) === -1) forest.roots.push(zc);
      forest.roots.sort(function (a, b) {
        return (a.releaseYear || 9999) - (b.releaseYear || 9999) ||
          String(a.name).localeCompare(b.name, 'zh');
      });
    }
    return forest;
  }

  /* 把宽扇叶收成真实中间节点：父 →「狮尾系字体」→ 成员 */
  function injectSeriesNodes(forest) {
    const parentIds = Object.keys(forest.children);
    parentIds.forEach(function (pid) {
      const parent = forest.byId[pid];
      if (!parent || parent.isCluster || parent.isMore) return;
      /* 品牌枢纽可继续收「阿里妈妈系」；普通主题支不再套娃 */
      if (parent.isSeries && !parent.isBrandFamily) return;
      const sibs = (forest.children[pid] || []).filter(function (c) {
        return c && !c.isSeries && !c.isCluster && !c.isMore && !c.isPlexGate && !c.ghost && !c.isBrandFamily;
      });
      const packed = clusterSiblings(parent, sibs, Math.max(PREFIX_MIN_MEMBERS, 3));
      /* 品牌枢纽下勿再套同名「站酷系」：直属字保持挂在枢纽下 */
      if (parent.isBrandFamily && packed.clusters.length) {
        const brandName = String(parent.seriesTitle || parent.name || '');
        const brandId = parent.brandId ||
          (parent.foundryInfo && parent.foundryInfo.id) || '';
        packed.clusters = packed.clusters.filter(function (c) {
          if (c.kind === 'prefix') {
            return !(brandName && (brandName.indexOf(c.key) === 0 || c.key.indexOf(brandName) === 0));
          }
          if (c.kind === 'owner' && brandId) {
            return String(c.key).indexOf(brandId) === -1;
          }
          return true;
        });
        const usedKeep = {};
        packed.clusters.forEach(function (c) {
          c.members.forEach(function (m) { usedKeep[m.id] = true; });
        });
        packed.leftover = sibs.filter(function (s) { return !usedKeep[s.id]; });
      }
      if (!packed.clusters.length) return;

      const used = {};
      const newKids = [];
      packed.clusters.forEach(function (c) {
        const sid = 'series:' + parent.id + ':' + c.kind + ':' + c.key;
        if (forest.byId[sid] && forest.byId[sid].isSeries) {
          newKids.push(forest.byId[sid]);
          c.members.forEach(function (m) { used[m.id] = true; });
          return;
        }
        const title = c.title || (c.key + '系');
        const label = /字体$/.test(title) ? title : (title + '字体');
        let year = 9999;
        c.members.forEach(function (m) {
          if (m.releaseYear && m.releaseYear < year) year = m.releaseYear;
        });
        const series = {
          isSeries: true,
          id: sid,
          name: label,
          seriesTitle: title,
          seriesSub: '同出一脉 · 点开看上下游',
          seriesCount: c.members.length,
          members: c.members.slice(),
          clusterKey: c.key,
          clusterKind: c.kind,
          releaseYear: year === 9999 ? 0 : year
        };
        forest.byId[sid] = series;
        forest.parentOf[sid] = parent.id;
        forest.children[sid] = c.members.slice().sort(function (a, b) {
          return (a.releaseYear || 9999) - (b.releaseYear || 9999) ||
            String(a.name).localeCompare(b.name, 'zh');
        });
        c.members.forEach(function (m) {
          forest.parentOf[m.id] = sid;
          used[m.id] = true;
        });
        newKids.push(series);
      });
      packed.leftover.forEach(function (s) {
        if (!used[s.id]) newKids.push(s);
      });
      (forest.children[pid] || []).forEach(function (c) {
        if (c && c.isSeries && newKids.indexOf(c) === -1) newKids.push(c);
      });
      newKids.sort(function (a, b) {
        const ac = a.isSeries ? (a.seriesCount || 0) : 0;
        const bc = b.isSeries ? (b.seriesCount || 0) : 0;
        if (bc !== ac) return bc - ac;
        return (a.releaseYear || 9999) - (b.releaseYear || 9999) ||
          String(a.name).localeCompare(b.name, 'zh');
      });
      forest.children[pid] = newKids;
    });
    return forest;
  }


  /* —— prefix / owner clustering —— */
  function cjkBrandPrefix(name) {
    const m = String(name || '').match(/^[\u4e00-\u9fff]{2,8}/);
    return m ? m[0] : '';
  }

  function detectPrefixGroups(siblings) {
    const names = siblings.map(function (s) { return s.name; });
    const candidates = {};
    siblings.forEach(function (s) {
      const cjk = cjkBrandPrefix(s.name);
      for (let len = Math.min(4, cjk.length); len >= 2; len--) {
        const p = cjk.slice(0, len);
        (candidates[p] = candidates[p] || []).push(s);
      }
    });
    const used = {};
    const groups = [];
    Object.keys(candidates).sort(function (a, b) {
      return b.length - a.length || candidates[b].length - candidates[a].length || a.localeCompare(b, 'zh');
    }).forEach(function (p) {
      const members = candidates[p].filter(function (s) { return !used[s.id]; });
      /* unique by id */
      const uniq = [];
      const seen = {};
      members.forEach(function (s) {
        if (seen[s.id]) return;
        seen[s.id] = true;
        uniq.push(s);
      });
      if (uniq.length >= PREFIX_MIN_MEMBERS) {
        uniq.forEach(function (s) { used[s.id] = true; });
        groups.push({ kind: 'prefix', key: p, title: p + '系', members: uniq });
      }
    });
    return { groups: groups, used: used };
  }

  function detectOwnerGroups(siblings, used) {
    const byOwner = {};
    siblings.forEach(function (s) {
      if (used[s.id]) return;
      const k = ownerKeyOf(s);
      if (!k) return;
      (byOwner[k] = byOwner[k] || []).push(s);
    });
    const groups = [];
    Object.keys(byOwner).forEach(function (k) {
      const members = byOwner[k];
      if (members.length >= OWNER_MIN_MEMBERS) {
        members.forEach(function (s) { used[s.id] = true; });
        const label = ownerLabelOf(members[0]) || k.slice(2);
        groups.push({ kind: 'owner', key: k, title: label + '系', members: members });
      }
    });
    return groups;
  }

  function clusterSiblings(parent, siblings, minFan) {
    if (minFan == null) minFan = FAN_CLUSTER_MIN;
    if (!siblings || siblings.length < minFan) {
      return { clusters: [], leftover: (siblings || []).slice() };
    }
    const pref = detectPrefixGroups(siblings);
    const ownerGroups = detectOwnerGroups(siblings, pref.used);
    const leftover = siblings.filter(function (s) { return !pref.used[s.id]; });
    const clusters = pref.groups.concat(ownerGroups).map(function (g) {
      return {
        id: 'cluster:' + parent.id + ':' + g.kind + ':' + g.key,
        kind: g.kind,
        key: g.key,
        title: g.title,
        members: g.members,
        parentId: parent.id,
        parentName: parent.name,
        filterKey: g.kind === 'prefix' ? g.key : g.key
      };
    });
    clusters.sort(function (a, b) { return b.members.length - a.members.length; });
    return { clusters: clusters, leftover: leftover };
  }

  function collectDetectedClusters(forest) {
    const out = [];
    const seenKey = {};
    function walk(node) {
      const kids = kidsOf(node, forest);
      const packed = clusterSiblings(node, kids);
      packed.clusters.forEach(function (c) {
        const fk = c.kind + ':' + c.key;
        if (!seenKey[fk]) {
          seenKey[fk] = true;
          out.push({
            id: c.id,
            kind: c.kind,
            key: c.key,
            title: c.title,
            count: c.members.length,
            memberIds: c.members.map(function (m) { return m.id; }),
            parentName: c.parentName,
            filterKey: c.key
          });
        } else {
          /* merge counts if same filter key appears under multiple parents */
          const existing = out.filter(function (x) { return x.kind === c.kind && x.key === c.key; })[0];
          if (existing) {
            c.members.forEach(function (m) {
              if (existing.memberIds.indexOf(m.id) === -1) existing.memberIds.push(m.id);
            });
            existing.count = existing.memberIds.length;
          }
        }
      });
      kids.forEach(walk);
    }
    forest.roots.forEach(walk);
    out.sort(function (a, b) { return b.count - a.count; });
    return out;
  }

  function maxSiblingFan(forest) {
    let max = 0;
    function walk(node) {
      const n = kidsOf(node, forest).length;
      if (n > max) max = n;
      kidsOf(node, forest).forEach(walk);
    }
    forest.roots.forEach(walk);
    return max;
  }

  function countForestNodes(forest) {
    return Object.keys(forest.byId).length;
  }

  function countGroupMembers(groupKey) {
    return membersForGroup(groupKey, WFProto.getCatalogList()).length;
  }

  function pickNearSiblings(list, focus, cap) {
    if (!list || !list.length || cap <= 0) return [];
    const fy = focus.releaseYear || 0;
    const scored = list.map(function (s) {
      const dy = Math.abs((s.releaseYear || 0) - fy);
      const name = String(s.name || '');
      const fn = String(focus.name || '');
      let shared = 0;
      const lim = Math.min(name.length, fn.length, 6);
      for (let i = 0; i < lim; i++) {
        if (name[i] === fn[i]) shared++;
        else break;
      }
      return { s: s, score: shared * 10 - dy };
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, cap).map(function (x) { return x.s; });
  }

  function pickDefaultFocus(forest, preferId) {
    if (preferId && forest.byId[preferId]) {
      const n = forest.byId[preferId];
      if (n) return n;
    }
    /* 品牌方母公司枢纽优先（如 阿里巴巴） */
    for (let i = 0; i < forest.roots.length; i++) {
      const r = forest.roots[i];
      if (r && r.isBrandFamily) return r;
    }
    /* prefer a listed (non-ghost) node with the most children; else first root */
    let best = null;
    let bestN = -1;
    Object.keys(forest.byId).forEach(function (id) {
      const n = forest.byId[id];
      if (!n || n.ghost || n.outgroup || n.isCluster || n.isMore || n.isSeries || n.isPlexGate) return;
      const k = kidsOf(n, forest).length;
      if (k > bestN) { best = n; bestN = k; }
    });
    if (best && bestN > 0) return best;
    for (let i = 0; i < forest.roots.length; i++) {
      const r = forest.roots[i];
      if (!r.isCluster && !r.isMore && !r.isSeries) return r;
    }
    return forest.roots[0] || null;
  }


  function tryRestoreBranchFromUrl(forest) {
    const b = qs('branch');
    if (!b || plexBranch) return;
    const parts = b.split(':');
    if (parts.length < 2) return;
    const kind = parts[0];
    const key = parts.slice(1).join(':');
    /* 在当前焦点父级下重找同名簇 */
    const focus = pickDefaultFocus(forest, focusId);
    const parent = focus ? (forest.byId[forest.parentOf[focus.id]] || focus) : null;
    const scanParents = [];
    if (focus) scanParents.push(focus);
    if (parent && parent !== focus) scanParents.push(parent);
    forest.roots.forEach(function (r) { scanParents.push(r); });
    for (let i = 0; i < scanParents.length; i++) {
      const p = scanParents[i];
      if (!p) continue;
      const packed = clusterSiblings(p, kidsOf(p, forest));
      for (let j = 0; j < packed.clusters.length; j++) {
        const c = packed.clusters[j];
        if (c.kind === kind && c.key === key) {
          plexBranch = {
            key: b,
            parentId: p.id,
            memberIds: c.members.map(function (m) { return m.id; }),
            title: c.title
          };
          if (!focusId) focusId = p.id;
          return;
        }
      }
    }
  }


  function isBrandHubExpanded(id) {
    /* unset → default expanded when nested under a focused parent brand */
    return expandedBrandHubs[id] !== false;
  }

  function collectNestedBrandLeaves(hub, forest) {
    const leaves = [];
    kidsOf(hub, forest).forEach(function (k) {
      if (!k || k.isBrandFamily) return;
      if (k.isSeries || k.isCluster) {
        kidsOf(k, forest).forEach(function (f) {
          if (f && !f.isSeries && !f.isCluster && !f.isMore && !f.isPlexGate && !f.isBrandFamily)
            leaves.push(f);
        });
      } else if (!k.isMore && !k.isPlexGate) {
        leaves.push(k);
      }
    });
    return leaves;
  }

  function layoutPlex(forest, focusId) {
    const positions = {};
    const edges = [];
    const synthetic = {};
    let focus = pickDefaultFocus(forest, focusId);
    if (!focus) {
      return { positions: {}, edges: [], width: 640, height: 360, byId: forest.byId,
        parentOf: forest.parentOf, children: forest.children, synthetic: {}, focusId: '' };
    }

    const cx = 420;
    const cy = 300;

    function place(node, x, y, h, extra) {
      const hh = h || (node.isCluster || node.isPlexGate || node.isSeries ? CARD_H_CLUSTER : CARD_H);
      const pos = { x: x, y: y, w: CARD_W, h: hh, node: node };
      if (extra) Object.keys(extra).forEach(function (k) { pos[k] = extra[k]; });
      positions[node.id] = pos;
      return pos;
    }

    /* —— focus center (slightly below visual center) —— */
    const focusY = cy - CARD_H / 2 + 28;
    const focusX = cx - CARD_W / 2;
    place(focus, focusX, focusY, CARD_H, { activated: true, role: 'focus' });

    /* —— parents above —— */
    const parents = [];
    let walk = forest.parentOf[focus.id];
    let depth = 0;
    while (walk && depth < PLEX_PARENT_DEPTH) {
      const p = forest.byId[walk];
      if (!p) break;
      parents.unshift(p);
      walk = forest.parentOf[p.id];
      depth++;
    }
    let py = focusY - PLEX_V_GAP - CARD_H;
    for (let i = parents.length - 1; i >= 0; i--) {
      const p = parents[i];
      place(p, focusX, py, CARD_H, { role: 'parent', plexDepth: -(parents.length - i) });
      const toId = (i === parents.length - 1) ? focus.id : parents[i + 1].id;
      const childNode = forest.byId[toId] || focus;
      edges.push({
        from: p.id,
        to: toId,
        label: relLabel(childNode, p)
      });
      py -= PLEX_V_GAP + CARD_H;
    }

    /* —— children below：系节点已在 forest 里，直接画 kids —— */
    const kids = kidsOf(focus, forest).slice();
    const childFonts = kids.filter(function (k) { return !k.isSeries && !k.isCluster && !k.isMore && !k.isPlexGate; });
    const childSeries = kids.filter(function (k) { return k.isSeries; });
    const childOther = kids.filter(function (k) {
      return !k.isSeries && (k.isCluster || k.isMore || k.isPlexGate);
    });

    if (focus.isSeries && !focus.isBrandFamily) {
      /* 普通主题支（狮尾系等）：只展开字体成员 */
      const nodes = kids.filter(function (k) {
        return !k.isSeries && !k.isCluster && !k.isMore;
      });
      placeChildRows(place, edges, focus, nodes, focusX, focusY, cx, { compact: true });
    } else if (focus.isBrandFamily || childSeries.length || childOther.length) {
      /* 品牌枢纽：子品牌 / 直属字各占一列；嵌套叶子居中落在该列下，避免共用底行交叉 */
      const ordered = childSeries.concat(childOther).concat(childFonts);
      let show = ordered;
      if (show.length > PLEX_CHILD_CAP) {
        const seriesFirst = childSeries.concat(childOther);
        const room = Math.max(0, PLEX_CHILD_CAP - seriesFirst.length);
        show = seriesFirst.concat(childFonts.slice(0, room));
      }
      const nestH = PLEX_NEST_H_GAP;
      const nestV = PLEX_NEST_V_GAP;
      const leafGap = PLEX_H_GAP;
      const cols = show.map(function (n) {
        const h = (n.isSeries || n.isCluster || n.isPlexGate) ? CARD_H_CLUSTER : CARD_H_COMPACT;
        let leaves = [];
        if (n.isBrandFamily && isBrandHubExpanded(n.id)) {
          leaves = collectNestedBrandLeaves(n, forest);
          if (leaves.length > NESTED_BRAND_LEAF_CAP) {
            leaves = leaves.slice(0, NESTED_BRAND_LEAF_CAP);
          }
        }
        const leafW = leaves.length
          ? leaves.length * CARD_W + Math.max(0, leaves.length - 1) * leafGap
          : 0;
        return { n: n, h: h, leaves: leaves, colW: Math.max(CARD_W, leafW) };
      });
      const hasNestedLeaves = cols.some(function (c) { return c.leaves.length > 0; });
      const childY = focusY + CARD_H + (hasNestedLeaves ? nestV : PLEX_V_GAP);
      const totalW = cols.reduce(function (s, c) { return s + c.colW; }, 0) +
        Math.max(0, cols.length - 1) * nestH;
      let x0 = cx - totalW / 2;
      cols.forEach(function (col) {
        const n = col.n;
        const hubX = x0 + (col.colW - CARD_W) / 2;
        place(n, hubX, childY, col.h, {
          role: 'child',
          compact: !(n.isSeries || n.isCluster || n.isPlexGate)
        });
        edges.push({
          from: focus.id,
          to: n.id,
          label: n.edgeLabel || (n.isBrandFamily ? '品牌' : (n.isSeries ? '主题支' : (n.isCluster || n.isPlexGate ? '衍生' : relLabel(n, focus))))
        });
        if (col.leaves.length) {
          const hubPos = positions[n.id];
          const grandY = hubPos.y + hubPos.h + nestV;
          const leafTotalW = col.leaves.length * CARD_W + Math.max(0, col.leaves.length - 1) * leafGap;
          let gx = x0 + (col.colW - leafTotalW) / 2;
          col.leaves.forEach(function (f) {
            if (positions[f.id]) {
              gx += CARD_W + leafGap;
              return;
            }
            place(f, gx, grandY, CARD_H_COMPACT, { role: 'brand-leaf', compact: true });
            edges.push({
              from: n.id,
              to: f.id,
              label: relLabel(f, n)
            });
            gx += CARD_W + leafGap;
          });
        }
        x0 += col.colW + nestH;
      });
    } else {
      placeChildRows(place, edges, focus, childFonts, focusX, focusY, cx, { compact: true });
    }

    /* —— siblings：同级系节点与近旁字体 —— */
    const parentId = forest.parentOf[focus.id];
    if (parentId && forest.byId[parentId]) {
      const parent = forest.byId[parentId];
      const allSibs = kidsOf(parent, forest).filter(function (s) { return s.id !== focus.id; });
      const seriesSibs = allSibs.filter(function (s) { return s.isSeries; });
      const fontSibs = allSibs.filter(function (s) { return !s.isSeries && !s.isCluster && !s.isMore; });

      let left = [];
      let right = [];
      let sideSeries = [];

      if (focus.isSeries) {
        sideSeries = seriesSibs.slice(0, 4);
      } else if (fontSibs.length >= PLEX_GATE_FAN || seriesSibs.length) {
        const near = pickNearSiblings(fontSibs, focus, PLEX_SIBLING_SIDE * 2);
        left = near.slice(0, PLEX_SIBLING_SIDE);
        right = near.slice(PLEX_SIBLING_SIDE);
        sideSeries = seriesSibs.slice(0, 4);
      } else {
        const near = fontSibs.slice(0, PLEX_SIBLING_SIDE * 2);
        left = near.slice(0, Math.ceil(near.length / 2));
        right = near.slice(Math.ceil(near.length / 2));
      }

      left.forEach(function (s, i) {
        const x = focusX - (i + 1) * (CARD_W + PLEX_H_GAP);
        place(s, x, focusY, CARD_H_COMPACT, { role: 'sibling', compact: true });
        edges.push({ from: focus.id, to: s.id, label: '旁', soft: true });
      });
      right.forEach(function (s, i) {
        const x = focusX + CARD_W + (i + 1) * PLEX_H_GAP + i * CARD_W;
        place(s, x, focusY, CARD_H_COMPACT, { role: 'sibling', compact: true });
        edges.push({ from: focus.id, to: s.id, label: '旁', soft: true });
      });
      sideSeries.forEach(function (s, gi) {
        if (positions[s.id]) return;
        const gx = focusX + CARD_W + PLEX_H_GAP + right.length * (CARD_W + PLEX_H_GAP) + gi * (CARD_W + PLEX_H_GAP);
        const gy = focusY - PLEX_V_GAP - 8;
        place(s, Math.max(gx, focusX + CARD_W + PLEX_H_GAP), gy, CARD_H_CLUSTER, { role: 'series-jump' });
        edges.push({ from: parent.id, to: s.id, label: '主题支', soft: true });
      });
    } else if (!parentId && kids.length === 0 && forest.roots.length > 1) {
      const others = forest.roots.filter(function (r) {
        return r.id !== focus.id && !r.isSeries;
      }).slice(0, 4);
      others.forEach(function (s, i) {
        const leftSide = i % 2 === 0;
        const idx = Math.floor(i / 2);
        const x = leftSide
          ? focusX - (idx + 1) * (CARD_W + PLEX_H_GAP)
          : focusX + CARD_W + (idx + 1) * PLEX_H_GAP + idx * CARD_W;
        place(s, x, focusY, CARD_H_COMPACT, { role: 'jump', compact: true });
        edges.push({ from: focus.id, to: s.id, label: '跳', soft: true });
      });
    }

    Object.keys(synthetic).forEach(function (id) {
      if (!forest.byId[id]) forest.byId[id] = synthetic[id];
    });

    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    Object.keys(positions).forEach(function (id) {
      const p = positions[id];
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.w);
      maxY = Math.max(maxY, p.y + p.h);
    });
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 640; maxY = 360; }

    /* normalize so stage has PAD padding */
    const ox = PAD_X - minX;
    const oy = PAD_Y - minY;
    Object.keys(positions).forEach(function (id) {
      positions[id].x += ox;
      positions[id].y += oy;
    });
    const width = Math.max(maxX - minX + PAD_X * 2, 640);
    const height = Math.max(maxY - minY + PAD_Y * 2, 420);

    return {
      positions: positions,
      edges: edges,
      width: width,
      height: height,
      byId: forest.byId,
      parentOf: forest.parentOf,
      children: forest.children,
      synthetic: synthetic,
      focusId: focus.id
    };
  }

  function memberMatchesFilter(font) {
    if (!clusterFilter) return true;
    if (clusterFilter === '__other__') {
      /* not in any detected prefix/owner cluster */
      return !detectedClusters.some(function (c) {
        return c.memberIds.indexOf(font.id) !== -1;
      });
    }
    return detectedClusters.some(function (c) {
      return (c.key === clusterFilter || c.filterKey === clusterFilter) &&
        c.memberIds.indexOf(font.id) !== -1;
    });
  }

  /* —— layout helpers —— */
  function layoutForest(forest, opts) {
    opts = opts || {};
    const mode = opts.mode || 'flow';
    const useClusters = mode === 'cluster';
    const positions = {};
    const edges = [];
    const synthetic = {};
    let cursorY = PAD_Y;
    let maxX = PAD_X + CARD_W;
    let maxBottom = PAD_Y;

    function placeNode(node, depth, y, h, extra) {
      const x = PAD_X + depth * (CARD_W + COL_GAP);
      const hh = h || CARD_H;
      const pos = { x: x, y: y, w: CARD_W, h: hh, depth: depth, node: node };
      if (extra) Object.keys(extra).forEach(function (k) { pos[k] = extra[k]; });
      positions[node.id] = pos;
      maxX = Math.max(maxX, x + CARD_W);
      maxBottom = Math.max(maxBottom, y + hh);
      return hh;
    }

    function filterKids(kids) {
      if (!clusterFilter) return kids;
      return kids.filter(function (k) {
        if (memberMatchesFilter(k)) return true;
        /* keep if any descendant matches */
        const stack = kidsOf(k, forest).slice();
        const seen = {};
        while (stack.length) {
          const n = stack.pop();
          if (seen[n.id]) continue;
          seen[n.id] = true;
          if (memberMatchesFilter(n)) return true;
          kidsOf(n, forest).forEach(function (c) { stack.push(c); });
        }
        /* also keep if this kid is ancestor of a matching cluster member via being parent */
        return false;
      });
    }

    function buildVisualKids(parent, kids) {
      kids = filterKids(kids);
      if (!kids.length) return [];

      if (useClusters && kids.length >= FAN_CLUSTER_MIN) {
        const packed = clusterSiblings(parent, kids);
        const rows = [];
        packed.clusters.forEach(function (c) {
          /* auto-open when filter matches this cluster */
          const filterHit = !!(clusterFilter && clusterFilter !== '__other__' &&
            (c.key === clusterFilter || c.filterKey === clusterFilter));
          if (filterHit && !expandedClusters[c.id]) expandedClusters[c.id] = true;
          const open = !!expandedClusters[c.id];
          const clusterNode = {
            isCluster: true,
            id: c.id,
            name: c.title,
            clusterTitle: c.title,
            clusterCount: c.members.length,
            clusterSub: '主题支 · 同改自 · ' + (c.parentName || parent.name),
            clusterKey: c.key,
            clusterKind: c.kind,
            members: c.members,
            parentId: parent.id
          };
          synthetic[c.id] = clusterNode;
          rows.push({ type: 'cluster', node: clusterNode, members: c.members, open: open, h: CARD_H_CLUSTER });
        });
        packed.leftover.forEach(function (k) {
          rows.push({ type: 'font', node: k, h: CARD_H_COMPACT });
        });
        return rows;
      }

      if (mode === 'flow' && kids.length > FLOW_CHILD_CAP) {
        const moreId = 'more:' + parent.id;
        const open = !!expandedMores[moreId];
        if (open) {
          return kids.map(function (k) { return { type: 'font', node: k, h: CARD_H_COMPACT }; });
        }
        const shown = kids.slice(0, FLOW_CHILD_CAP);
        const rest = kids.slice(FLOW_CHILD_CAP);
        const rows = shown.map(function (k) { return { type: 'font', node: k, h: CARD_H_COMPACT }; });
        const moreNode = {
          isMore: true,
          id: moreId,
          name: '还有 ' + rest.length + ' 款',
          moreCount: rest.length,
          moreParentId: parent.id,
          moreRest: rest
        };
        synthetic[moreId] = moreNode;
        rows.push({ type: 'more', node: moreNode, h: CARD_H_COMPACT });
        return rows;
      }

      return kids.map(function (k) {
        return { type: 'font', node: k, h: CARD_H_COMPACT };
      });
    }

    function layoutNode(node, depth) {
      const kids = kidsOf(node, forest);
      const rows = buildVisualKids(node, kids);
      const selfH = CARD_H;

      if (!rows.length) {
        const y = cursorY;
        placeNode(node, depth, y, selfH);
        cursorY = y + selfH + ROW_GAP;
        return { y: y, h: selfH };
      }

      const blockTop = cursorY;
      let childCursor = cursorY;

      rows.forEach(function (row) {
        if (row.type === 'cluster') {
          const cy = childCursor;
          placeNode(row.node, depth + 1, cy, CARD_H_CLUSTER);
          edges.push({ from: node.id, to: row.node.id, label: '衍生' });
          let used = CARD_H_CLUSTER;
          if (row.open) {
            const visible = row.members.filter(function (m) {
              return !(clusterFilter && !memberMatchesFilter(m));
            });
            const idSet = {};
            visible.forEach(function (m) { idSet[m.id] = true; });
            const rankMemo = {};
            function memberRank(id) {
              if (rankMemo[id] != null) return rankMemo[id];
              rankMemo[id] = 0; /* cycle guard */
              const pid = forest.parentOf[id];
              if (pid && idSet[pid]) rankMemo[id] = memberRank(pid) + 1;
              else rankMemo[id] = 0;
              return rankMemo[id];
            }
            const byRank = {};
            visible.forEach(function (m) {
              const r = memberRank(m.id);
              (byRank[r] = byRank[r] || []).push(m);
            });
            const rankKeys = Object.keys(byRank).map(Number).sort(function (a, b) { return a - b; });
            let colOffset = 0;
            let maxMemberH = 0;
            rankKeys.forEach(function (rank) {
              const list = byRank[rank];
              const nCols = Math.max(1, Math.ceil(list.length / CLUSTER_EXPAND_COL));
              const perCol = Math.ceil(list.length / nCols);
              for (let ci = 0; ci < nCols; ci++) {
                const slice = list.slice(ci * perCol, (ci + 1) * perCol);
                const mx = PAD_X + (depth + 2 + colOffset) * (CARD_W + COL_GAP);
                let my = cy;
                slice.forEach(function (m) {
                  const mh = CARD_H_COMPACT;
                  const absDepth = depth + 2 + colOffset;
                  positions[m.id] = {
                    x: mx, y: my, w: CARD_W, h: mh, depth: absDepth, node: m, compact: true
                  };
                  maxX = Math.max(maxX, mx + CARD_W);
                  maxBottom = Math.max(maxBottom, my + mh);
                  const pid = forest.parentOf[m.id];
                  if (pid && idSet[pid]) {
                    edges.push({
                      from: pid,
                      to: m.id,
                      label: relLabel(m, forest.byId[pid])
                    });
                  } else {
                    edges.push({ from: row.node.id, to: m.id, label: '' });
                  }
                  my += mh + ROW_GAP;
                });
                if (slice.length) {
                  maxMemberH = Math.max(maxMemberH, my - cy - ROW_GAP);
                }
                colOffset++;
              }
            });
            used = Math.max(CARD_H_CLUSTER, maxMemberH);
            /* center cluster card on the mini-graph block */
            const clusterY = cy + (used - CARD_H_CLUSTER) / 2;
            const cpos = positions[row.node.id];
            if (cpos) {
              cpos.y = clusterY;
              maxBottom = Math.max(maxBottom, clusterY + CARD_H_CLUSTER);
            }
          }
          childCursor = cy + used + ROW_GAP;
          cursorY = childCursor;
        } else if (row.type === 'more') {
          const cy = childCursor;
          placeNode(row.node, depth + 1, cy, CARD_H_COMPACT);
          edges.push({ from: node.id, to: row.node.id, label: '' });
          childCursor = cy + CARD_H_COMPACT + ROW_GAP;
          cursorY = childCursor;
        } else {
          cursorY = childCursor;
          const sub = layoutNode(row.node, depth + 1);
          edges.push({
            from: node.id,
            to: row.node.id,
            label: relLabel(row.node, node)
          });
          childCursor = cursorY;
        }
      });

      const blockBottom = childCursor - ROW_GAP;
      const blockH = Math.max(selfH, blockBottom - blockTop);
      const selfY = blockTop + (blockH - selfH) / 2;
      placeNode(node, depth, selfY, selfH);
      cursorY = Math.max(cursorY, blockTop + blockH + ROW_GAP);
      return { y: selfY, h: blockH };
    }

    forest.roots.forEach(function (r) {
      /* skip roots that have no matching descendants when filtering */
      if (clusterFilter) {
        const kids = kidsOf(r, forest);
        const keep = memberMatchesFilter(r) || filterKids(kids).length > 0 ||
          (r.ghost || r.outgroup);
        if (!keep && !(r.ghost || r.outgroup)) {
          /* still keep if any deep match via ghost children path */
          const allDesc = [];
          const stack = kids.slice();
          while (stack.length) {
            const n = stack.pop();
            allDesc.push(n);
            kidsOf(n, forest).forEach(function (c) { stack.push(c); });
          }
          if (!allDesc.some(memberMatchesFilter)) return;
        }
      }
      layoutNode(r, 0);
    });

    Object.keys(synthetic).forEach(function (id) {
      if (!forest.byId[id]) forest.byId[id] = synthetic[id];
    });

    const width = Math.max(maxX + PAD_X, 640);
    const height = Math.max(maxBottom + PAD_Y, 360);

    return {
      positions: positions,
      edges: edges,
      width: width,
      height: height,
      byId: forest.byId,
      parentOf: forest.parentOf,
      children: forest.children,
      synthetic: synthetic
    };
  }

  function edgePath(a, b, soft) {
    /* cubic Bezier: vertical-ish → C with cy1/cy2; horizontal-ish → side control points */
    const acx = a.x + a.w / 2;
    const acy = a.y + a.h / 2;
    const bcx = b.x + b.w / 2;
    const bcy = b.y + b.h / 2;
    const dx = bcx - acx;
    const dy = bcy - acy;
    let x1, y1, x2, y2, d;
    if (Math.abs(dy) >= Math.abs(dx) * 0.85) {
      if (dy >= 0) { x1 = acx; y1 = a.y + a.h; x2 = bcx; y2 = b.y; }
      else { x1 = acx; y1 = a.y; x2 = bcx; y2 = b.y + b.h; }
      const cy1 = y1 + (y2 - y1) * 0.4;
      const cy2 = y2 - (y2 - y1) * 0.4;
      d = 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + cy1 + ' ' + x2 + ',' + cy2 + ' ' + x2 + ',' + y2;
    } else {
      if (dx >= 0) { x1 = a.x + a.w; y1 = acy; x2 = b.x; y2 = bcy; }
      else { x1 = a.x; y1 = acy; x2 = b.x + b.w; y2 = bcy; }
      const cdx = Math.max(36, Math.abs(x2 - x1) * 0.45);
      const s = dx >= 0 ? 1 : -1;
      d = 'M' + x1 + ',' + y1 + ' C' + (x1 + s * cdx) + ',' + y1 + ' ' + (x2 - s * cdx) + ',' + y2 + ' ' + x2 + ',' + y2;
    }
    return {
      d: d,
      mx: (x1 + x2) / 2,
      my: (y1 + y2) / 2 - (soft ? 10 : 8),
      soft: !!soft
    };
  }

  function applyView() {
    stage.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.scale + ')';
    zoomLabel.textContent = Math.round(view.scale * 100) + '%';
  }

  function setScale(next, cx, cy) {
    if (!isCanvasMode(curMode)) return;
    const prev = view.scale;
    const s = Math.min(2.5, Math.max(0.35, next));
    if (cx == null) {
      const r = viewport.getBoundingClientRect();
      cx = r.width / 2;
      cy = r.height / 2;
    }
    view.x = cx - (cx - view.x) * (s / prev);
    view.y = cy - (cy - view.y) * (s / prev);
    view.scale = s;
    applyView();
  }

  function fitView(opts) {
    if (!layout || curMode === 'wall' || curMode === 'branch') return;
    opts = opts || {};
    const keepScale = !!opts.keepScale;
    const soft = !!opts.soft;
    const r = viewport.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const pad = 48;

    if (curMode === 'plex' && layout.focusId && layout.positions[layout.focusId]) {
      const p = layout.positions[layout.focusId];
      const s = keepScale ? view.scale : Math.min(1.2, Math.max(0.55, Math.min(
        (r.width - pad * 2) / Math.max(layout.width, 1),
        (r.height - pad * 2) / Math.max(layout.height, 1)
      )));
      if (!keepScale) view.scale = s;
      /* soft+keepScale: keep pan; only update scale label path via applyView */
      if (!(soft && keepScale)) {
        const focusCx = (p.x + p.w / 2) * view.scale;
        const focusCy = (p.y + p.h / 2) * view.scale;
        view.x = r.width / 2 - focusCx;
        view.y = r.height * 0.48 - focusCy;
      }
      applyView();
      return;
    }

    const sx = (r.width - pad * 2) / layout.width;
    const sy = (r.height - pad * 2) / layout.height;
    const s = Math.min(1.15, Math.max(0.4, Math.min(sx, sy)));
    if (!keepScale) view.scale = s;
    if (!(soft && keepScale)) {
      view.x = (r.width - layout.width * view.scale) / 2;
      view.y = Math.max(24, (r.height - layout.height * view.scale) / 2);
    }
    applyView();
  }

  function restoreCanvasView(saved) {
    if (!saved) return false;
    view.x = saved.x;
    view.y = saved.y;
    view.scale = saved.scale;
    applyView();
    return true;
  }

  function rememberCanvasView() {
    if (!isCanvasMode(curMode)) return;
    lastCanvasView = { x: view.x, y: view.y, scale: view.scale };
  }

  function preserveWindowScroll(fn) {
    const y = window.scrollY;
    const stageTop = htmlStage ? htmlStage.scrollTop : 0;
    fn();
    requestAnimationFrame(function () {
      window.scrollTo(0, y);
      if (htmlStage) htmlStage.scrollTop = stageTop;
    });
  }

  function neighborIds(id) {
    const set = {};
    if (!layout || !id) return set;
    set[id] = true;
    layout.edges.forEach(function (e) {
      if (e.from === id || e.to === id) {
        set[e.from] = true;
        set[e.to] = true;
      }
    });
    /* nested brand font leaves under focused brand: same weight as direct kids */
    const focusNode = layout.byId && layout.byId[id];
    if (focusNode && focusNode.isBrandFamily) {
      Object.keys(set).forEach(function (hid) {
        if (hid === id) return;
        const hn = layout.byId && layout.byId[hid];
        if (!hn || !hn.isBrandFamily) return;
        layout.edges.forEach(function (e) {
          if (e.from === hid || e.to === hid) {
            set[e.from] = true;
            set[e.to] = true;
          }
        });
      });
    }
    /* if focus is cluster, include members */
    const n = layout.positions[id] && layout.positions[id].node;
    if (n && n.isCluster && n.members) {
      n.members.forEach(function (m) { set[m.id] = true; });
    }
    return set;
  }

  function updateHighlight() {
    const hot = focusId ? neighborIds(focusId) : null;
    nodesEl.querySelectorAll('.lfl-card').forEach(function (el) {
      const id = el.getAttribute('data-id');
      el.classList.toggle('is-hot', !!(hot && hot[id]));
      el.classList.toggle('is-dim', !!(hot && !hot[id]));
    });
    edgesSvg.querySelectorAll('[data-edge]').forEach(function (el) {
      const fr = el.getAttribute('data-from');
      const to = el.getAttribute('data-to');
      const touchFocus = (fr === focusId || to === focusId);
      const brandLeafEdge = !!(
        (layout.positions[fr] && layout.positions[fr].role === 'brand-leaf') ||
        (layout.positions[to] && layout.positions[to].role === 'brand-leaf')
      );
      const on = !!(hot && hot[fr] && hot[to] && (touchFocus || brandLeafEdge));
      el.classList.toggle('is-hot', on);
      el.classList.toggle('is-dim', !!(hot && !on));
    });
    wallEl.querySelectorAll('.lfl-wall-card').forEach(function (el) {
      const id = el.getAttribute('data-id');
      el.classList.toggle('is-hot', !!(focusId && focusId === id));
    });
  }

  function cardHtml(pos) {
    const n = pos.node;
    const id = n.id;
    if (n.isSeries) {
      const nestedToggle = !!(n.isBrandFamily && focusId && layout && layout.parentOf &&
        layout.parentOf[id] === focusId && layout.byId[focusId] && layout.byId[focusId].isBrandFamily);
      const brandOpen = nestedToggle ? isBrandHubExpanded(id) : true;
      return '<article class="lfl-card is-series' + (n.isBrandFamily ? ' is-brand-family' : '') +
        (n.isBrandFamily && brandOpen ? ' is-open' : '') +
        (pos.activated ? ' is-activated' : '') +
        '" data-id="' + esc(id) + '" data-series="1"' +
        (n.isBrandFamily ? ' data-brand="1"' : '') +
        (nestedToggle ? ' aria-expanded="' + (brandOpen ? 'true' : 'false') + '"' : '') +
        ' style="left:' +
        pos.x + 'px;top:' + pos.y + 'px;width:' + pos.w + 'px" tabindex="0" role="button">' +
        '<div class="lfl-series-title"><span>' + esc(n.name) + '</span>' +
        '<span class="lfl-series-count">' + (n.seriesCount || (n.members && n.members.length) || 0) + '</span></div>' +
        '<span class="lfl-series-sub">' + esc(n.seriesSub || (n.isBrandFamily ? ('品牌 · 旗下 ' + (n.seriesCount || (n.members && n.members.length) || 0) + ' 款') : '同出一脉 · 点开看上下游')) + '</span>' +
        '</article>';
    }
    if (n.isPlexGate) {
      return '<article class="lfl-card is-plex-gate" data-id="' + esc(id) + '" data-plex-gate="1" style="left:' +
        pos.x + 'px;top:' + pos.y + 'px;width:' + pos.w + 'px" tabindex="0" role="button">' +
        '<div class="lfl-plex-gate-title"><span>' + esc(n.gateTitle || n.name) + '</span>' +
        '<span class="lfl-plex-gate-count">' + (n.gateCount || (n.members && n.members.length) || 0) + '</span></div>' +
        '<span class="lfl-plex-gate-sub">' + esc(n.gateSub || '同出一脉 · 点开看本支上下游') + '</span>' +
        '<span class="lfl-plex-gate-act">▸ 展开本支</span>' +
        '</article>';
    }
    if (n.isCluster) {
      const open = !!expandedClusters[id];
      return '<article class="lfl-card is-cluster' + (open ? ' is-open' : '') +
        '" data-id="' + esc(id) + '" data-cluster="1" style="left:' + pos.x + 'px;top:' + pos.y +
        'px;width:' + pos.w + 'px" tabindex="0" role="button" aria-expanded="' + (open ? 'true' : 'false') + '">' +
        '<div class="lfl-cluster-title"><span>' + esc(n.clusterTitle || n.name) + '</span>' +
        '<span class="lfl-cluster-count">' + (n.clusterCount || 0) + '</span></div>' +
        '<span class="lfl-cluster-sub">' + esc(n.clusterSub || '') + '</span>' +
        '<span class="lfl-cluster-act">' + (open ? '▾ 收起主题支' : '▸ 展开主题支') + '</span>' +
        '</article>';
    }
    if (n.isMore) {
      return '<article class="lfl-card is-more" data-id="' + esc(id) + '" data-more="1" style="left:' +
        pos.x + 'px;top:' + pos.y + 'px;width:' + pos.w + 'px" tabindex="0" role="button">' +
        '<span class="lfl-more-label">' + esc(n.name) + '</span>' +
        '<span class="lfl-cluster-act">展开其余</span>' +
        '</article>';
    }

    const ghost = !!n.ghost;
    const out = !!n.outgroup;
    const listed = !ghost && !out;
    const compact = !!pos.compact || curMode !== 'wall';
    const filteredOut = listed && clusterFilter && !memberMatchesFilter(n);
    const activated = !!pos.activated || (curMode === 'plex' && focusId && focusId === id);
    const cls = 'lfl-card' +
      (ghost ? ' is-ghost' : '') +
      (out ? ' is-outgroup' : '') +
      (compact && listed ? ' is-compact' : '') +
      (filteredOut ? ' is-dim' : '') +
      (activated ? ' is-activated' : '');
    const en = n.en || '';
    const lic = licShort(n);
    const who = whoOf(n);
    const face = faceOf(n);
    const yong = (listed && canSpecimenFace(n) && face)
      ? '<span class="lfl-yong" data-face="' + esc(n.family) + '|' + weightOf(n) + '" style="' + face + '" aria-hidden="true">' + YONG + '</span>'
      : '';
    const nameInner = listed
      ? '<a class="lfl-name" href="font-detail.html?id=' + encodeURIComponent(n.id) + '" data-nav>' + esc(n.name) + '</a>'
      : '<span class="lfl-name">' + esc(n.name) + '</span>';
    const badge = ghost ? '<span class="lfl-badge">未收录上游</span>' :
      (out ? '<span class="lfl-badge">出族上游</span>' : '');

    return '<article class="' + cls + '" data-id="' + esc(id) + '" style="left:' + pos.x + 'px;top:' + pos.y +
      'px;width:' + pos.w + 'px" tabindex="0" role="button" aria-pressed="false">' +
      '<div class="lfl-card-top">' +
        '<div class="lfl-card-names">' + nameInner +
          (en && en !== n.name && !compact ? '<span class="lfl-en">' + esc(en) + '</span>' : '') +
          badge +
        '</div>' + yong +
      '</div>' +
      '<div class="lfl-card-meta">' +
        '<span class="lfl-lic">' + esc(lic) + '</span>' +
        '<span class="lfl-who">' + esc(n.mergeNote || who) + '</span>' +
      '</div>' +
      '</article>';
  }

  function renderGraph() {
    wallEl.hidden = true;
    if (plexPick) plexPick.hidden = true;
    stage.style.display = '';
    if (!layout) {
      nodesEl.innerHTML = '';
      edgesSvg.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    stage.style.width = layout.width + 'px';
    stage.style.height = layout.height + 'px';
    edgesSvg.setAttribute('width', layout.width);
    edgesSvg.setAttribute('height', layout.height);
    edgesSvg.style.width = layout.width + 'px';
    edgesSvg.style.height = layout.height + 'px';

    let svg = '';
    svg += '<defs><marker id="lfl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0,1.2 L9,5 L0,8.8 z" class="lfl-arrow-head" fill="var(--gray-2)"/></marker></defs>';

    layout.edges.forEach(function (e, i) {
      const a = layout.positions[e.from];
      const b = layout.positions[e.to];
      if (!a || !b) return;
      const p = edgePath(a, b, e.soft);
      const eid = 'e' + i;
      const softCls = e.soft ? ' class="is-soft"' : '';
      const marker = e.soft ? '' : ' marker-end="url(#lfl-arrow)"';
      svg += '<path data-edge="' + eid + '" data-from="' + esc(e.from) + '" data-to="' + esc(e.to) +
        '"' + softCls + ' d="' + p.d + '"' + marker + '/>';
      if (e.label) {
        svg += '<text data-edge="' + eid + '" data-from="' + esc(e.from) + '" data-to="' + esc(e.to) +
          '" class="lfl-elabel' + (e.soft ? ' is-soft' : '') + '" x="' + p.mx + '" y="' + p.my +
          '" text-anchor="middle">' + esc(e.label) + '</text>';
      }
    });
    edgesSvg.innerHTML = svg;

    let html = '';
    Object.keys(layout.positions).forEach(function (id) {
      html += cardHtml(layout.positions[id]);
    });
    nodesEl.innerHTML = html;
    nodesEl.style.width = layout.width + 'px';
    nodesEl.style.height = layout.height + 'px';

    const faceFonts = [];
    Object.keys(layout.positions).forEach(function (id) {
      const n = layout.positions[id] && layout.positions[id].node;
      if (canSpecimenFace(n)) faceFonts.push(n);
    });
    readyVisibleFaces(faceFonts);

    nodesEl.querySelectorAll('.lfl-card').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        if (ev.target.closest('[data-nav]')) return;
        const id = el.getAttribute('data-id');
        const node = layout.positions[id] && layout.positions[id].node;
        if (node && node.isBrandFamily) {
          const focusNode = layout && layout.byId && layout.byId[focusId];
          const parentId = layout && layout.parentOf && layout.parentOf[id];
          if (focusNode && focusNode.isBrandFamily && parentId === focusId && id !== focusId) {
            expandedBrandHubs[id] = !isBrandHubExpanded(id);
            render({ keepScale: true });
            return;
          }
          activateFocus(id);
          return;
        }
        if (node && node.isSeries) {
          activateFocus(id);
          return;
        }
        if (node && node.isPlexGate) {
          if (node.parentId) activateFocus(node.parentId);
          return;
        }
        if (node && node.isCluster) {
          expandedClusters[id] = !expandedClusters[id];
          render();
          return;
        }
        if (node && node.isMore) {
          expandedMores[id] = true;
          render();
          return;
        }
        if (curMode === 'plex') {
          activateFocus(id);
          return;
        }
        focusId = (focusId === id) ? '' : id;
        setUrlParam('focus', focusId);
        updateHighlight();
        el.setAttribute('aria-pressed', focusId === id ? 'true' : 'false');
      });
      el.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          el.click();
        }
      });
    });
    updateHighlight();
  }

  function hidePlexPick() {
    if (!plexPick) return;
    plexPick.hidden = true;
    plexPick.innerHTML = '';
  }

  function enterPlexBranch(gate) {
    if (!gate || !gate.members || !gate.members.length) return;
    hidePlexPick();
    const parentId = gate.parentId || '';
    setPlexBranch(gate);
    if (parentId) focusId = parentId;
    setUrlParam('focus', focusId);
    if (curMode !== 'plex') {
      setMode('plex', true);
      return;
    }
    render({ keepScale: view.scale !== 1, recenter: true });
  }

  function activateFocus(id) {
    if (!id) return;
    const keepScale = view.scale !== 1;
    /* 点具体字体：离开主题支坍缩，回到以该字为中心的邻域 */
    if (plexBranch && plexBranch.memberIds && plexBranch.memberIds.indexOf(id) === -1) {
      clearPlexBranch();
    } else if (plexBranch && plexBranch.parentId === id) {
      /* 回到支线父级，保持支线展开 */
    } else if (plexBranch && plexBranch.memberIds && plexBranch.memberIds.indexOf(id) !== -1) {
      /* 仍在支线内激活某一成员：收起支线网格，改邻域居中 */
      clearPlexBranch();
    }
    focusId = id;
    setUrlParam('focus', id);
    if (curMode !== 'plex') {
      setMode('plex', true);
      return;
    }
    render({ keepScale: keepScale, recenter: true });
  }


  function foundryForGroupId(g) {
    if (!g || !WFProto.getFoundryById) return null;
    return WFProto.getFoundryById(g) || null;
  }

  /* brand|platform 芯片：按 ownerId 聚合（猫啃 forks 仍属思源组） */
  function isOwnerAggregatedGroup(g) {
    const fd = foundryForGroupId(g);
    return !!(fd && (fd.kind === 'brand' || fd.kind === 'platform'));
  }

  function isCatalogGroup(g) {
    const fd = foundryForGroupId(g);
    if (!fd) return false;
    if (fd.kind === 'brand' || fd.kind === 'platform') return true;
    /* 专属作者芯片：group id 即 ownerId */
    return fd.kind === 'author' && g === fd.id;
  }

  function membersForGroup(g, all) {
    const seen = {};
    const out = [];
    function add(f) {
      if (!f || !f.id || seen[f.id]) return;
      seen[f.id] = true;
      out.push(f);
    }
    (all || []).forEach(function (f) {
      if (f.lineage && f.lineage.group === g) add(f);
    });
    if (isOwnerAggregatedGroup(g)) {
      (all || []).forEach(function (f) {
        const oid = (f.lineage && f.lineage.ownerId) ||
          (f.ownerInfo && f.ownerInfo.id) || '';
        if (oid === g) add(f);
      });
    }
    /* 合作回流：胡晓波字标 relatedGroup/collaboratorIds → 站酷芯片也列出 */
    (all || []).forEach(function (f) {
      const lin = f.lineage || {};
      if (lin.relatedGroup === g) add(f);
      const ids = lin.collaboratorIds || [];
      if (ids.indexOf(g) !== -1) add(f);
      const infos = lin.collaboratorInfos || [];
      for (let i = 0; i < infos.length; i++) {
        if (infos[i] && infos[i].id === g) { add(f); break; }
      }
      if (g === 'zcool' && lin.ownerId === 'huxiaobo' && /站酷/.test(String(f.name || ''))) add(f);
    });
    return out;
  }

  function wallListForRender() {
    const all = WFProto.getCatalogList();
    let members = collapseFaceVariants(membersForGroup(curGroup, all));
    if (clusterFilter) {
      members = members.filter(memberMatchesFilter);
    }
    members.sort(function (a, b) {
      return String(a.name).localeCompare(b.name, 'zh');
    });
    return members;
  }

  function renderWall() {
    stage.style.display = 'none';
    wallEl.hidden = false;
    if (plexPick) plexPick.hidden = true;
    emptyEl.hidden = true;
    const members = wallListForRender();
    wallMembers = members;
    if (!members.length) {
      wallEl.innerHTML = '<p class="lfl-wall-empty">此筛选下暂无字体。</p>';
      return;
    }
    let html = '<div class="lfl-wall-grid">';
    members.forEach(function (n) {
      const face = faceOf(n);
      const lic = licShort(n);
      const who = whoOf(n);
      const yong = (canSpecimenFace(n) && face)
        ? '<span class="lfl-wall-yong" data-face="' + esc(n.family) + '|' + weightOf(n) + '" style="' + face + '" aria-hidden="true">' + YONG + '</span>'
        : '<span class="lfl-wall-yong" aria-hidden="true"></span>';
      html += '<button type="button" class="lfl-wall-card" data-id="' + esc(n.id) + '">' +
        yong +
        '<a class="lfl-wall-name" href="font-detail.html?id=' + encodeURIComponent(n.id) + '" data-nav>' +
        esc(n.name) + '</a>' +
        '<div class="lfl-wall-meta"><span>' + esc(lic) + '</span><span>' + esc(who) + '</span></div>' +
        '</button>';
    });
    html += '</div>';
    wallEl.innerHTML = html;
    readyVisibleFaces(members);
    wallEl.querySelectorAll('.lfl-wall-card').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        if (ev.target.closest('[data-nav]')) return;
        const id = el.getAttribute('data-id');
        focusId = (focusId === id) ? '' : id;
        updateHighlight();
      });
    });
    updateHighlight();
  }

  function edgeCountForGroup(groupKey, all) {
    const members = membersForGroup(groupKey, all);
    let edges = 0;
    members.forEach(function (f) {
      const rec = f.lineage || {};
      if (rec.relation !== 'original' && rec.upstreamName) edges++;
    });
    return edges;
  }

  function pickDefaultGroup(counts, ld, all) {
    const q = qs('group');
    if (q && counts[q]) return q;
    if (counts[DEFAULT_GROUP]) return DEFAULT_GROUP;
    const keys = Object.keys(ld.groups || {}).filter(function (g) { return counts[g]; });
    keys.sort(function (a, b) {
      const ea = edgeCountForGroup(a, all);
      const eb = edgeCountForGroup(b, all);
      if (eb !== ea) return eb - ea;
      return counts[b] - counts[a];
    });
    return keys[0] || '';
  }

  function suggestMode(forest, memberCount) {
    const fan = maxSiblingFan(forest);
    const n = memberCount != null ? memberCount : countForestNodes(forest);
    if (fan >= AUTO_PLEX_FAN || n >= AUTO_PLEX_MEMBERS) return 'plex';
    return 'flow';
  }

  function normalizeMode(m) {
    if (m === 'tree') return 'branch';
    if (MODES.indexOf(m) !== -1) return m;
    return '';
  }

  function isCanvasMode(m) {
    return m === 'plex' || m === 'flow';
  }

  function syncModeChrome(mode) {
    document.body.classList.toggle('is-wall', mode === 'wall');
    document.body.classList.toggle('is-branch', mode === 'branch');
    document.body.classList.toggle('is-plex', mode === 'plex');
    document.body.classList.toggle('is-flow', mode === 'flow');
    document.body.classList.toggle('is-canvas', isCanvasMode(mode));
    if (modeNav) {
      modeNav.querySelectorAll('.lg-mode').forEach(function (btn) {
        const on = btn.getAttribute('data-mode') === mode;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }
    /* Swap inside stable shell without display:none (keeps canvas metrics) */
    if (flowWrap) {
      flowWrap.classList.toggle('is-off', !isCanvasMode(mode));
      flowWrap.removeAttribute('hidden');
    }
    if (htmlStage) {
      htmlStage.classList.toggle('is-off', isCanvasMode(mode));
      htmlStage.removeAttribute('hidden');
    }
    /* Reserve zoom-tool width so mode chips do not jump */
    if (flowTools) {
      flowTools.classList.toggle('is-reserved', !isCanvasMode(mode));
      flowTools.removeAttribute('hidden');
      flowTools.setAttribute('aria-hidden', isCanvasMode(mode) ? 'false' : 'true');
    }
    if (flowToolsSep) {
      flowToolsSep.classList.toggle('is-reserved', !isCanvasMode(mode));
      flowToolsSep.removeAttribute('hidden');
    }
    if (modeHint) {
      modeHint.textContent = mode === 'plex'
        ? '激活：点卡片看上下级'
        : (mode === 'flow'
          ? '图：滚轮缩放拖拽'
          : (mode === 'branch'
            ? '支线：浏览代际'
            : '墙：浏览样张'));
    }
  }

  function persistMode(mode) {
    try { localStorage.setItem('wf-lineage-mode', mode); } catch (e) {}
  }

  function setMode(mode, fromUser) {
    mode = normalizeMode(mode) || 'flow';
    const prev = curMode;
    rememberCanvasView();
    if (mode !== 'plex') clearPlexBranch();
    preserveWindowScroll(function () {
      curMode = mode;
      if (fromUser) modeLocked = true;
      setUrlParam('mode', mode);
      persistMode(mode);
      syncModeChrome(mode);
      hidePlexPick();
      const canvasToCanvas = isCanvasMode(prev) && isCanvasMode(mode);
      const backToCanvas = prev && !isCanvasMode(prev) && isCanvasMode(mode);
      if (canvasToCanvas) {
        /* keep zoom; still soft-fit pan to new layout */
        render({ keepScale: true });
      } else if (backToCanvas && lastCanvasView) {
        render({ restoreView: lastCanvasView });
      } else {
        render();
      }
    });
  }

  function setClusterFilter(key) {
    clusterFilter = key || '';
    setUrlParam('cluster', clusterFilter);
    /* when filtering a big prefix pile, wall is often clearer — stay in current mode */
    renderClusterNav();
    render();
  }

  function setGroup(g) {
    curGroup = g;
    clearPlexBranch();
    focusId = '';
    expandedClusters = {};
    expandedMores = {};
    expandedBrandHubs = {};
    clusterFilter = '';
    setUrlParam('group', g);
    setUrlParam('cluster', '');
    setUrlParam('focus', '');
    hidePlexPick();
    /* re-suggest unless URL/user locked; keep remembered branch/wall */
    if (!modeLocked) {
      let saved = '';
      try { saved = localStorage.getItem('wf-lineage-mode') || ''; } catch (e) {}
      saved = normalizeMode(saved);
      curMode = (saved === 'branch' || saved === 'wall') ? saved : '';
    }
    renderFamNav();
    render();
  }

  function renderFamNav() {
    const all = WFProto.getCatalogList();
    const ld = WFProto.getLineageData();
    const counts = {};
    Object.keys(ld.groups || {}).forEach(function (g) {
      const n = collapseFaceVariants(membersForGroup(g, all)).length;
      if (n) counts[g] = n;
    });
    if (!curGroup || !counts[curGroup]) {
      curGroup = pickDefaultGroup(counts, ld, all);
    }
    function chipHtml(g) {
      if (!counts[g]) return '';
      const gd = ld.groups[g] || {};
      const short = String(gd.name || g).split(' / ')[0];
      return '<button type="button" class="chip' + (g === curGroup ? ' is-on' : '') + '" data-group="' + esc(g) + '">' +
        esc(short) + '<span class="n">' + counts[g] + '</span></button>';
    }
    function clusterHtml(label, keys) {
      const chips = keys.map(chipHtml).join('');
      if (!chips) return '';
      return '<div class="lfl-fam-cluster">' +
        '<span class="lfl-fam-label">' + esc(label) + '</span>' + chips + '</div>';
    }
    famNav.innerHTML =
      clusterHtml('师承', MAJOR_GROUPS.lineage) +
      clusterHtml('品牌', MAJOR_GROUPS.brand);
    famNav.querySelectorAll('.chip').forEach(function (btn) {
      btn.addEventListener('click', function () { setGroup(btn.getAttribute('data-group')); });
    });
  }

  function renderClusterNav() {
    if (!detectedClusters.length) {
      clusterNav.hidden = true;
      clusterNav.innerHTML = '';
      return;
    }
    clusterNav.hidden = false;
    let html = '<span class="lfl-clusters-label">主题支</span>';
    html += '<button type="button" class="chip' + (!clusterFilter ? ' is-on' : '') + '" data-cluster="">全部</button>';
    detectedClusters.forEach(function (c) {
      const label = c.kind === 'prefix' ? c.key : c.title.replace(/系$/, '');
      html += '<button type="button" class="chip' + (clusterFilter === c.key ? ' is-on' : '') +
        '" data-cluster="' + esc(c.key) + '">' + esc(label) +
        '<span class="n">' + c.count + '</span></button>';
    });
    const clusteredIds = {};
    detectedClusters.forEach(function (c) {
      c.memberIds.forEach(function (id) { clusteredIds[id] = true; });
    });
    const all = WFProto.getCatalogList();
    const members = membersForGroup(curGroup, all);
    const otherN = members.filter(function (f) { return !clusteredIds[f.id]; }).length;
    if (otherN > 0 && detectedClusters.length) {
      html += '<button type="button" class="chip' + (clusterFilter === '__other__' ? ' is-on' : '') +
        '" data-cluster="__other__">其他<span class="n">' + otherN + '</span></button>';
    }
    clusterNav.innerHTML = html;
    clusterNav.querySelectorAll('.chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setClusterFilter(btn.getAttribute('data-cluster') || '');
      });
    });
  }

  function render(opts) {
    opts = opts || {};
    const all = WFProto.getCatalogList();
    const ld = WFProto.getLineageData();
    const groups = ld.groups || {};
    if (!curGroup || !groups[curGroup]) {
      layout = null;
      famCap.textContent = '';
      if (htmlStage) htmlStage.innerHTML = '<p class="empty">暂无谱系数据。</p>';
      if (isCanvasMode(curMode)) renderGraph();
      if (footNote) footNote.textContent = '暂无谱系数据。';
      return;
    }

    const members = collapseFaceVariants(membersForGroup(curGroup, all));
    const forest = injectZcoolHuxiaoboLink(injectSeriesNodes(injectBrandFamilyNodes(
      buildForest(members, all, { catalogMode: isCatalogGroup(curGroup) })
    )));
    forestCache = forest;
    detectedClusters = collectDetectedClusters(forest);

    if (!curMode) {
      const qMode = normalizeMode(qs('mode'));
      if (qMode) {
        curMode = qMode;
        modeLocked = true;
      } else {
        let saved = '';
        try { saved = localStorage.getItem('wf-lineage-mode') || ''; } catch (e) {}
        saved = normalizeMode(saved);
        if (saved === 'branch' || saved === 'wall') {
          curMode = saved;
          modeLocked = false;
        } else {
          curMode = suggestMode(forest, members.length);
          modeLocked = false;
        }
      }
      setUrlParam('mode', curMode);
      persistMode(curMode);
      syncModeChrome(curMode);
    } else {
      syncModeChrome(curMode);
    }

    const gd = groups[curGroup] || {};
    const fan = maxSiblingFan(forest);
    const modeLabel = curMode === 'wall' ? '墙'
      : (curMode === 'plex' ? '激活·邻域'
        : (curMode === 'branch' ? '支线' : '图'));
    const renderOpts = opts;

    const mainRoot = forest.roots.filter(function (r) { return !r.ghost && !r.outgroup && !r.isSeries; })[0];
    if (heroTitle && mainRoot) {
      const face = faceOf(mainRoot);
      if (face) {
        heroTitle.setAttribute('style', face);
        heroTitle.setAttribute('data-face', mainRoot.family + '|' + weightOf(mainRoot));
        heroTitle.classList.remove('is-face-ready');
      } else {
        heroTitle.removeAttribute('style');
        heroTitle.removeAttribute('data-face');
        heroTitle.classList.remove('is-face-ready');
      }
    }

    if (curMode === 'branch' || curMode === 'wall') {
      layout = null;
      const htmlForest = buildHtmlForest(members, all);
      famCap.textContent = (gd.name || curGroup) + ' · ' + modeLabel + ' · ' + members.length + ' 款' +
        (htmlForest.roots.length > 1 ? ' · ' + htmlForest.roots.length + ' 条支线' : '');
      if (htmlStage) {
        htmlStage.innerHTML = curMode === 'branch'
          ? renderBranch(members, htmlForest)
          : renderWallHtml(members, htmlForest);
        wireFolds();
        const htmlFaces = members.slice();
        if (mainRoot) htmlFaces.push(mainRoot);
        readyVisibleFaces(htmlFaces);
      }
    } else if (curMode === 'plex') {
      if (!focusId || !forest.byId[focusId]) {
        const qf = resolveFocusId(qs('focus'), forest);
        focusId = (qf && forest.byId[qf]) ? qf : (pickDefaultFocus(forest, qf) || {}).id || '';
        if (focusId) setUrlParam('focus', focusId);
      }
      tryRestoreBranchFromUrl(forest);
      layout = layoutPlex(forest, focusId);
      if (layout.focusId) focusId = layout.focusId;
      const visibleN = Object.keys(layout.positions).length;
      famCap.textContent = (gd.name || curGroup) + ' · ' + modeLabel + ' · 激活「' +
        ((layout.byId[focusId] && layout.byId[focusId].name) || focusId) + '」· 邻域 ' + visibleN +
        ' 卡' + (fan >= AUTO_PLEX_FAN ? ' · 主题支扇叶 ' + fan : '');
      renderGraph();
      if (renderOpts.restoreView && restoreCanvasView(renderOpts.restoreView)) {
        /* restored */
      } else {
        fitView({ keepScale: !!renderOpts.keepScale, soft: !!renderOpts.soft });
      }
    } else {
      layout = layoutForest(forest, { mode: 'flow' });
      const edgeN = layout.edges.filter(function (e) {
        const t = layout.positions[e.to] && layout.positions[e.to].node;
        return t && !t.isMore;
      }).length;
      const ghostN = Object.keys(layout.byId).filter(function (id) {
        return layout.byId[id].ghost;
      }).length;
      famCap.textContent = (gd.name || curGroup) + ' · ' + modeLabel + ' · ' + members.length + ' 款在谱 · ' +
        edgeN + ' 条边' +
        (ghostN ? ' · ' + ghostN + ' 个未收录上游' : '');
      renderGraph();
      if (renderOpts.restoreView && restoreCanvasView(renderOpts.restoreView)) {
        /* restored */
      } else {
        fitView({ keepScale: !!renderOpts.keepScale, soft: !!renderOpts.soft });
      }
    }

    if (mainRoot && isCanvasMode(curMode)) {
      readyVisibleFaces([mainRoot]);
    }

    if (footNote) {
      footNote.textContent = FOOT_PLAIN;
    }

    document.title = (gd.name ? String(gd.name).split(' / ')[0] + ' · ' : '') + '谱系 · 文风字体';
  }

  /* —— pan / zoom —— */
  viewport.addEventListener('wheel', function (ev) {
    if (!isCanvasMode(curMode)) return;
    ev.preventDefault();
    const r = viewport.getBoundingClientRect();
    const cx = ev.clientX - r.left;
    const cy = ev.clientY - r.top;
    const factor = ev.deltaY > 0 ? 0.9 : 1.11;
    setScale(view.scale * factor, cx, cy);
  }, { passive: false });

  viewport.addEventListener('pointerdown', function (ev) {
    if (!isCanvasMode(curMode)) return;
    if (ev.target.closest('.lfl-card') || ev.target.closest('a')) return;
    dragging = true;
    viewport.classList.add('is-panning');
    dragStart = { x: ev.clientX, y: ev.clientY, vx: view.x, vy: view.y };
    try { viewport.setPointerCapture(ev.pointerId); } catch (e) {}
  });
  viewport.addEventListener('pointermove', function (ev) {
    if (!dragging || !dragStart) return;
    view.x = dragStart.vx + (ev.clientX - dragStart.x);
    view.y = dragStart.vy + (ev.clientY - dragStart.y);
    applyView();
  });
  function endPan(ev) {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('is-panning');
    dragStart = null;
    try { if (ev) viewport.releasePointerCapture(ev.pointerId); } catch (e) {}
  }
  viewport.addEventListener('pointerup', endPan);
  viewport.addEventListener('pointercancel', endPan);

  document.getElementById('btnZoomIn').addEventListener('click', function () { setScale(view.scale * 1.15); });
  document.getElementById('btnZoomOut').addEventListener('click', function () { setScale(view.scale / 1.15); });
  document.getElementById('btnReset').addEventListener('click', function () {
    focusId = '';
    updateHighlight();
    fitView();
  });

  viewport.addEventListener('dblclick', function (ev) {
    if (!isCanvasMode(curMode)) return;
    if (ev.target.closest('.lfl-card')) return;
    fitView();
  });

  modeNav.querySelectorAll('.lg-mode').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setMode(btn.getAttribute('data-mode'), true);
    });
  });

  /* bootstrap URL cluster filter + focus */
  clusterFilter = qs('cluster') || '';
  focusId = qs('focus') || '';

  document.addEventListener('click', function (ev) {
    if (!plexPick || plexPick.hidden) return;
    if (plexPick.contains(ev.target)) return;
    if (ev.target.closest && ev.target.closest('[data-plex-gate]')) return;
    hidePlexPick();
  });

  WFProto.loadCatalog().then(function () {
    renderFamNav();
    render();
  });
})();
