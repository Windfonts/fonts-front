/* 谱系亲属角色实验室 v4（还原）
   - 本字 star-fill；直系图标 + 旁系静点
   - 直系 section（脊 + 子/孙）+ 旁系 section（近/远 + 远旁折叠）
   - 顶栏可点摘要链；悬停显 meta/rel（本始终显）
   - 永在直系；setFocus → render()；wireFolds 远旁
   现网 lineage.html 不改。 */
(function () {
  const esc = WFProto.escapeHtml;
  const YONG = '永';
  const MIX_LABEL = { locale: '地区版', collab: '合作', commissioned: '委托' };
  /* 角色 → 站内 Remix 线标（assets/icons.svg）；文案留给 title / aria-label */
  const KIN_ICON = {
    '本': 'star-fill',
    '父': 'commit',
    '祖父': 'history',
    '上祖': 'stack',
    '子': 'branch',
    '孙': 'version',
    '近旁': 'compare',
    '远旁': 'group'
  };
  const DEFAULT_GROUP = 'lxgw-wenkai';
  const FAR_FOLD = 8;
  const stage = document.getElementById('stage');
  const famNav = document.getElementById('famNav');
  const famCap = document.getElementById('famCap');
  const summaryEl = document.getElementById('summary');
  const footNote = document.getElementById('footNote');

  let curGroup = '';
  let focusId = '';

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
  function metaOf(font) {
    const parts = [];
    if (font.charCount) parts.push(WFProto.formatCount(font.charCount) + ' 字');
    if (font.releaseYear) parts.push(String(font.releaseYear));
    return parts.join(' · ');
  }
  function mixLabel(font) {
    if (!font || font.ghost || font.outgroup) return '';
    const rel = font.lineage && font.lineage.relation;
    return MIX_LABEL[rel] || '';
  }

  function buildForest(members, all) {
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
      } else if (parent && !byId[parent.id]) {
        /* 出族：组外有收录的父 → 出族节点 */
        const oid = 'out:' + parent.id;
        let og = byId[oid];
        if (!og) {
          og = {
            outgroup: true,
            id: oid,
            name: parent.name,
            family: parent.family,
            charCount: parent.charCount,
            releaseYear: parent.releaseYear,
            weights: parent.weights,
            lineage: parent.lineage,
            outGroupKey: (parent.lineage && parent.lineage.group) || '',
            ghostChildren: []
          };
          byId[oid] = og;
          roots.push(og);
        }
        og.ghostChildren.push(f);
        parentOf[f.id] = oid;
      } else {
        /* 未收录原作 */
        const g = ensureGhost(up);
        g.ghostChildren.push(f);
        parentOf[f.id] = g.id;
      }
    });

    /* 同族变体根收编 */
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

  function roleMap(focus, forest) {
    const roles = {}; /* id → { kin, mixLabel } */
    if (!focus || focus.ghost || focus.outgroup) return { roles: roles, line: {}, ancestors: [] };

    const ancestors = [];
    let cur = focus.id;
    const seen = {};
    while (forest.parentOf[cur] && !seen[cur]) {
      seen[cur] = true;
      const pid = forest.parentOf[cur];
      ancestors.push(pid);
      cur = pid;
    }

    /* 父 / 祖父 / 上祖 */
    ancestors.forEach(function (id, i) {
      roles[id] = roles[id] || { kin: '', mixLabel: '' };
      if (i === 0) roles[id].kin = '父';
      else if (i === 1) roles[id].kin = '祖父';
      else roles[id].kin = '上祖';
    });

    roles[focus.id] = { kin: '本', mixLabel: '' };

    function markDesc(node, depth) {
      kidsOf(node, forest).forEach(function (k) {
        if (k.ghost || k.outgroup) return;
        roles[k.id] = roles[k.id] || { kin: '', mixLabel: '' };
        if (roles[k.id].kin !== '本') roles[k.id].kin = depth === 1 ? '子' : '孙';
        markDesc(k, depth + 1);
      });
    }
    markDesc(focus, 1);

    /* 近旁：与本字或直系祖先同父的兄弟（不含自己与直系） */
    const lineSet = {};
    lineSet[focus.id] = true;
    ancestors.forEach(function (id) { lineSet[id] = true; });

    const parentIds = {};
    parentIds[focus.id] = forest.parentOf[focus.id];
    ancestors.forEach(function (id) { parentIds[id] = forest.parentOf[id]; });

    Object.keys(forest.byId).forEach(function (id) {
      const n = forest.byId[id];
      if (n.ghost || n.outgroup) {
        if (!roles[id]) {
          roles[id] = {
            kin: ancestors.indexOf(id) === 0 ? '父' : (ancestors.indexOf(id) === 1 ? '祖父' : (ancestors.indexOf(id) > 1 ? '上祖' : '上祖')),
            mixLabel: ''
          };
        }
        return;
      }
      if (roles[id] && roles[id].kin) {
        /* already set */
      } else {
        const p = forest.parentOf[id];
        let near = false;
        if (p) {
          Object.keys(parentIds).forEach(function (lid) {
            if (parentIds[lid] === p && lid !== id) near = true;
          });
          /* also siblings of focus */
          if (p === forest.parentOf[focus.id]) near = true;
        }
        roles[id] = { kin: near ? '近旁' : '远旁', mixLabel: '' };
      }
      const ml = mixLabel(n);
      if (ml) roles[id].mixLabel = ml;
      if (!n.lineage || !n.lineage.upstreamName) {
        const rel = n.lineage && n.lineage.relation;
        if (rel === 'commissioned' || rel === 'collab') {
          roles[id].mixLabel = (roles[id].mixLabel || MIX_LABEL[rel] || '') + (roles[id].orphanMix ? '' : '');
          roles[id].noUpstream = true;
        }
      }
    });

    /* 直系下游也进 line */
    const line = {};
    Object.keys(lineSet).forEach(function (id) { line[id] = true; });
    function markLineDown(node) {
      kidsOf(node, forest).forEach(function (k) {
        if (k.ghost || k.outgroup) return;
        const r = roles[k.id];
        if (r && (r.kin === '子' || r.kin === '孙')) {
          line[k.id] = true;
          markLineDown(k);
        }
      });
    }
    markLineDown(focus);

    return { roles: roles, line: line, ancestors: ancestors };
  }

  function markClass(kin) {
    if (kin === '本') return 'is-self';
    if (kin === '父') return 'is-fu';
    if (kin === '祖父') return 'is-gfu';
    if (kin === '上祖') return 'is-zu';
    if (kin === '子') return 'is-zi';
    if (kin === '孙') return 'is-sun';
    if (kin === '近旁') return 'is-near';
    if (kin === '远旁') return 'is-far';
    return '';
  }

  function pickDefaultFocus(members, forest) {
    /* 优先：有父且有子；其次有父或有子；分数＝子数*2 + (有父?3:0) + (有孙?1:0) */
    let best = null;
    let score = -1;
    members.forEach(function (f) {
      const hasParent = !!forest.parentOf[f.id];
      const kids = forest.children[f.id] || [];
      const hasChild = kids.length > 0;
      let grand = 0;
      kids.forEach(function (k) { grand += (forest.children[k.id] || []).length; });
      let s = 0;
      if (hasParent && hasChild) s += 20;
      if (hasParent) s += 3;
      if (hasChild) s += kids.length * 2;
      if (grand) s += 1;
      if (s > score) { score = s; best = f; }
    });
    return best || members[0];
  }


  function renderSummary(focus, info, forest) {
    if (!focus) { summaryEl.innerHTML = ''; return; }
    const roles = info.roles;
    const bits = [];
    const near = Object.keys(roles).filter(function (id) { return roles[id].kin === '近旁'; }).length;
    const far = Object.keys(roles).filter(function (id) { return roles[id].kin === '远旁'; }).length;
    if (near) bits.push('近旁 ' + near);
    if (far) bits.push('远旁 ' + far);
    bits.push('点链上任一款可换中心');

    const chain = [];
    info.ancestors.slice().reverse().forEach(function (id) {
      const n = forest.byId[id];
      if (n) chain.push(n);
    });
    chain.push(focus);

    let html = '<ul class="lk-chain">';
    chain.forEach(function (n, i) {
      if (i) html += '<li class="lk-chain-sep" aria-hidden="true">' + WFChrome.icon('chevron-right') + '</li>';
      const r = roles[n.id] || {};
      const kin = r.kin || (n.ghost || n.outgroup ? '上祖' : '');
      const ic = KIN_ICON[kin] || 'stack';
      const isOn = n.id === focus.id;
      const ghostish = !!(n.ghost || n.outgroup);
      if (ghostish) {
        html += '<li><span class="lk-chain-item is-ghost" title="' + esc(evidenceTitle(n, forest)) + '">' +
          WFChrome.icon(ic) + '<span>' + esc(n.name) + '</span></span></li>';
      } else {
        html += '<li><button type="button" class="lk-chain-item' + (isOn ? ' is-on' : '') +
          '" data-focus="' + esc(n.id) + '" title="' + esc(evidenceTitle(n, forest)) + '">' +
          WFChrome.icon(ic) + '<span>' + esc(n.name) + '</span></button></li>';
      }
    });
    html += '</ul>';
    if (bits.length) html += '<p class="lk-sub">' + esc(bits.join(' · ')) + '</p>';
    summaryEl.innerHTML = html;
    summaryEl.querySelectorAll('[data-focus]').forEach(function (btn) {
      btn.addEventListener('click', function () { setFocus(btn.getAttribute('data-focus')); });
    });
  }

  function evidenceTitle(node, forest) {
    if (node.ghost) return '未收录原作';
    if (node.outgroup) {
      const g = node.outGroupKey ? (' · 属其他字族') : '';
      return '出族上游' + g;
    }
    const rec = node.lineage || {};
    const up = rec.upstreamName || '';
    const ml = mixLabel(node);
    const parts = [];
    if (up) parts.push('改自「' + up + '」');
    if (ml) parts.push(ml);
    if (!up && (rec.relation === 'commissioned' || rec.relation === 'collab')) {
      parts.push((MIX_LABEL[rec.relation] || rec.relation) + ' · 谱中未记上游');
    }
    if (rec.relation === 'original') parts.push('原作');
    return parts.join(' · ') || '';
  }

  function renderTree(forest, info) {
    const roles = info.roles;
    const focus = forest.byId[focusId];

    function nodeBtn(node, kinForce) {
      const r = roles[node.id] || { kin: kinForce || '远旁', mixLabel: '' };
      const kin = kinForce || r.kin;
      const quiet = kin === '近旁' || kin === '远旁';
      const isSelf = kin === '本';
      const onLine = !quiet && !node.ghost; /* 直系（含本）可画永；ghost/out 无永 */
      const cls = 'lk-node' +
        (node.ghost ? ' is-ghost' : '') +
        (node.outgroup ? ' is-outgroup' : '') +
        (isSelf ? ' is-self' : '') +
        (kin === '远旁' ? ' is-far' : '') +
        (quiet ? ' is-quiet' : '');
      const title = evidenceTitle(node, forest);
      const style = (node.ghost || node.outgroup || quiet) ? '' : ' style="' + faceOf(node) + '"';
      const yong = (onLine && !node.outgroup)
        ? '<span class="lk-yong"' + style + ' aria-hidden="true">' + YONG + '</span>'
        : '';
      const icName = KIN_ICON[kin] || '';
      const mark = quiet
        ? '<span class="lk-mark is-quiet" title="' + esc(kin) + '"></span>'
        : (isSelf
          ? '<span class="lk-mark is-self" title="本" aria-label="本">' + WFChrome.icon('star-fill', 'lk-kin-ic') + '</span>'
          : '<span class="lk-mark" title="' + esc(kin) + '" aria-label="' + esc(kin) + '">' +
            (icName ? WFChrome.icon(icName, 'lk-kin-ic') : '') + '</span>');

      const meta = metaOf(node);
      const ml = r.mixLabel || mixLabel(node);
      const metaHtml = meta ? '<span class="lk-meta">' + esc(meta) + '</span>' : '';
      const relHtml = ml ? '<span class="lk-rel">' + esc(ml) + '</span>' : '';

      if (node.ghost || node.outgroup) {
        return '<div class="' + cls + '" title="' + esc(title) + '">' + mark +
          (node.outgroup ? '<span class="lk-out">出族</span>' : '') +
          '<span class="lk-name">' + esc(node.name) + '</span>' + metaHtml + '</div>';
      }
      return '<button type="button" class="' + cls + '" data-focus="' + esc(node.id) + '" title="' + esc(title) + '">' +
        mark + yong +
        '<span class="lk-name">' + esc(node.name) + '</span>' +
        relHtml + metaHtml + '</button>';
    }

    const spine = [];
    info.ancestors.slice().reverse().forEach(function (id) {
      const n = forest.byId[id];
      if (n) spine.push(n);
    });
    if (focus) spine.push(focus);

    const zi = [];
    const sun = [];
    Object.keys(roles).forEach(function (id) {
      const n = forest.byId[id];
      if (!n || n.ghost || n.outgroup) return;
      if (roles[id].kin === '子') zi.push(n);
      if (roles[id].kin === '孙') sun.push(n);
    });
    zi.sort(function (a, b) { return String(a.name).localeCompare(b.name, 'zh'); });
    sun.sort(function (a, b) { return String(a.name).localeCompare(b.name, 'zh'); });

    let html = '<section class="lk-sec"><h2 class="lk-sec-h">直系</h2><ul class="lk-spine">';
    spine.forEach(function (n) {
      const kin = (roles[n.id] && roles[n.id].kin) || (n.ghost || n.outgroup ? '上祖' : '');
      html += '<li>' + nodeBtn(n, kin) + '</li>';
    });
    html += '</ul>';

    if (zi.length) {
      html += '<p class="lk-subh">子 · ' + zi.length + '</p><ul class="lk-spine lk-spine-kids">';
      zi.forEach(function (n) { html += '<li>' + nodeBtn(n, '子') + '</li>'; });
      html += '</ul>';
    }
    if (sun.length) {
      html += '<p class="lk-subh">孙 · ' + sun.length + '</p><ul class="lk-spine lk-spine-kids">';
      sun.forEach(function (n) { html += '<li>' + nodeBtn(n, '孙') + '</li>'; });
      html += '</ul>';
    }
    html += '</section>';

    const near = [];
    const far = [];
    Object.keys(roles).forEach(function (id) {
      const n = forest.byId[id];
      if (!n || n.ghost || n.outgroup) return;
      if (roles[id].kin === '近旁') near.push(n);
      if (roles[id].kin === '远旁') far.push(n);
    });
    near.sort(function (a, b) { return String(a.name).localeCompare(b.name, 'zh'); });
    far.sort(function (a, b) { return String(a.name).localeCompare(b.name, 'zh'); });

    if (near.length || far.length) {
      html += '<section class="lk-sec"><h2 class="lk-sec-h">旁系</h2>';
      if (near.length) {
        html += '<p class="lk-subh">近旁 · 同父兄弟</p><ul class="lk-flat">';
        near.forEach(function (n) { html += '<li>' + nodeBtn(n, '近旁') + '</li>'; });
        html += '</ul>';
      }
      if (far.length) {
        html += '<p class="lk-subh">远旁</p>';
        const shown = far.slice(0, FAR_FOLD);
        const rest = far.slice(FAR_FOLD);
        html += '<ul class="lk-flat">';
        shown.forEach(function (n) { html += '<li>' + nodeBtn(n, '远旁') + '</li>'; });
        html += '</ul>';
        if (rest.length) {
          html += '<button type="button" class="lk-fold" data-fold>展开远旁其余 ' + rest.length + ' 款</button>';
          html += '<ul class="lk-flat" hidden>';
          rest.forEach(function (n) { html += '<li>' + nodeBtn(n, '远旁') + '</li>'; });
          html += '</ul>';
        }
      }
      html += '</section>';
    }

    return html;
  }

  function wireFolds() {
    stage.querySelectorAll('[data-fold]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const ul = btn.nextElementSibling;
        if (!ul) return;
        const open = ul.hasAttribute('hidden');
        if (open) ul.removeAttribute('hidden'); else ul.setAttribute('hidden', '');
        const m = btn.textContent.match(/\d+/);
        btn.textContent = open ? '收起' : ('展开远旁其余 ' + (m ? m[0] : '') + ' 款');
      });
    });
  }

  function setGroup(g) {
    curGroup = g;
    focusId = '';
    const url = new URL(location.href);
    url.searchParams.set('group', g);
    url.searchParams.delete('focus');
    history.replaceState(null, '', url);
    renderFamNav();
    render();
  }

  function setFocus(id) {
    focusId = id;
    const url = new URL(location.href);
    url.searchParams.set('focus', id);
    history.replaceState(null, '', url);
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
    if (!curGroup || !counts[curGroup]) {
      const q = qs('group');
      curGroup = (q && counts[q]) ? q : (counts[DEFAULT_GROUP] ? DEFAULT_GROUP : keys[0]);
    }
    famNav.innerHTML = keys.map(function (g) {
      const gd = ld.groups[g] || {};
      const short = String(gd.name || g).split(' / ')[0];
      return '<button type="button" class="chip' + (g === curGroup ? ' is-on' : '') + '" data-group="' + esc(g) + '">' +
        esc(short) + '<span class="n">' + counts[g] + '</span></button>';
    }).join('');
    famNav.querySelectorAll('.chip').forEach(function (btn) {
      btn.addEventListener('click', function () { setGroup(btn.getAttribute('data-group')); });
    });
  }

  function render() {
    const all = WFProto.getCatalogList();
    const ld = WFProto.getLineageData();
    const groups = ld.groups || {};
    const withLineage = all.filter(function (f) { return f.lineage && f.lineage.group; }).length;
    const noLineage = all.length - withLineage;

    if (!curGroup || !groups[curGroup]) {
      stage.innerHTML = '<p class="empty">暂无谱系数据。</p>';
      summaryEl.innerHTML = '';
      return;
    }
    const members = all.filter(function (f) { return f.lineage && f.lineage.group === curGroup; });
    const forest = buildForest(members, all);
    const qf = qs('focus');
    if (!focusId && qf && forest.byId[qf] && !forest.byId[qf].ghost && !forest.byId[qf].outgroup) {
      focusId = qf;
    }
    if (!focusId || !forest.byId[focusId] || forest.byId[focusId].ghost || forest.byId[focusId].outgroup) {
      const pick = pickDefaultFocus(members, forest);
      focusId = pick ? pick.id : '';
    }
    const focus = forest.byId[focusId];
    const info = roleMap(focus, forest);
    const gd = groups[curGroup] || {};

    famCap.textContent = (gd.name || curGroup) + ' · ' + members.length + ' 款在谱';
    renderSummary(focus, info, forest);
    stage.innerHTML = renderTree(forest, info);
    stage.querySelectorAll('[data-focus]').forEach(function (btn) {
      btn.addEventListener('click', function () { setFocus(btn.getAttribute('data-focus')); });
    });
    wireFolds();

    footNote.textContent =
      '直系与旁系分开。悬停：浅灰底，显字数与地区版等短注；本字行始终显示。旁系只用圆点。' +
      ' 全库 ' + all.length + ' 款里 ' + withLineage + ' 款已入谱，另有 ' + noLineage + ' 款尚未建谱（本页不列）。' +
      ' 详情页短链对接仍待做。';

    document.title = (focus ? focus.name + ' · ' : '') + '亲属角色 · 文风字体';
  }

  WFProto.loadCatalog().then(function () {
    renderFamNav();
    render();
  });
})();
