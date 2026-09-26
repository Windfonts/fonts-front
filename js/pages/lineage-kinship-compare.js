/* 谱系亲属布局对照 · 甲分栏 / 乙单脊 / 丙时间轴 / 丁双栏
   共用真数据与 focus；现网 lineage.html 不改。 */
(function () {
  const esc = WFProto.escapeHtml;
  const YONG = '永';
  const MIX_LABEL = { locale: '地区版', collab: '合作', commissioned: '委托' };
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
  const MODE_DESC = {
    jia: '甲 · 分栏 — 直系上 + 旁系下 + 可点摘要链（还原 v4）',
    yi: '乙 · 单脊 — 文字中心链，脊上本字星+永，下代/旁系默认收起（v5 calm）',
    bing: '丙 · 时间轴 — 左角色列 + 竖线；旁系作安静芯片，不作第二棵树',
    ding: '丁 · 双栏 — 左粘直系脊，右旁系列表常显安静；无顶链'
  };

  const stage = document.getElementById('stage');
  const famNav = document.getElementById('famNav');
  const famCap = document.getElementById('famCap');
  const summaryEl = document.getElementById('summary');
  const footNote = document.getElementById('footNote');
  const modeNav = document.getElementById('modeNav');
  const modeDesc = document.getElementById('modeDesc');

  let curGroup = '';
  let focusId = '';
  let curMode = 'jia';

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
      if (!up) { roots.push(f); return; }
      const parent = WFChrome.findFontByName(all, up);
      if (parent && byId[parent.id]) {
        (children[parent.id] = children[parent.id] || []).push(f);
        parentOf[f.id] = parent.id;
      } else if (parent && !byId[parent.id]) {
        const oid = 'out:' + parent.id;
        let og = byId[oid];
        if (!og) {
          og = {
            outgroup: true, id: oid, name: parent.name, family: parent.family,
            charCount: parent.charCount, releaseYear: parent.releaseYear,
            weights: parent.weights, lineage: parent.lineage,
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

  function roleMap(focus, forest) {
    const roles = {};
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
      if (!(roles[id] && roles[id].kin)) {
        const p = forest.parentOf[id];
        let near = false;
        if (p) {
          Object.keys(parentIds).forEach(function (lid) {
            if (parentIds[lid] === p && lid !== id) near = true;
          });
          if (p === forest.parentOf[focus.id]) near = true;
        }
        roles[id] = { kin: near ? '近旁' : '远旁', mixLabel: '' };
      }
      const ml = mixLabel(n);
      if (ml) roles[id].mixLabel = ml;
    });

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

  function pickDefaultFocus(members, forest) {
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

  function evidenceTitle(node) {
    if (node.ghost) return '未收录原作';
    if (node.outgroup) return '上游' + (node.outGroupKey ? ' · 属其他字族' : '');
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

  function collectLists(info, forest) {
    const roles = info.roles;
    const focus = forest.byId[focusId];
    const spine = [];
    info.ancestors.slice().reverse().forEach(function (id) {
      const n = forest.byId[id];
      if (n) spine.push(n);
    });
    if (focus) spine.push(focus);
    const zi = [], sun = [], near = [], far = [];
    Object.keys(roles).forEach(function (id) {
      const n = forest.byId[id];
      if (!n || n.ghost || n.outgroup) return;
      if (roles[id].kin === '子') zi.push(n);
      if (roles[id].kin === '孙') sun.push(n);
      if (roles[id].kin === '近旁') near.push(n);
      if (roles[id].kin === '远旁') far.push(n);
    });
    const byName = function (a, b) { return String(a.name).localeCompare(b.name, 'zh'); };
    zi.sort(byName); sun.sort(byName); near.sort(byName); far.sort(byName);
    return { spine: spine, zi: zi, sun: sun, near: near, far: far, focus: focus };
  }

  /* —— shared node renderers —— */
  function nodeJia(node, kin, roles) {
    const r = roles[node.id] || { kin: kin, mixLabel: '' };
    const quiet = kin === '近旁' || kin === '远旁';
    const isSelf = kin === '本';
    const onLine = !quiet && !node.ghost;
    const cls = 'lkc-node' +
      (node.ghost ? ' is-ghost' : '') +
      (node.outgroup ? ' is-outgroup' : '') +
      (isSelf ? ' is-self' : '') +
      (kin === '远旁' ? ' is-far' : '') +
      (quiet ? ' is-quiet' : '');
    const style = (node.ghost || node.outgroup || quiet) ? '' : ' style="' + faceOf(node) + '"';
    const yong = (onLine && !node.outgroup)
      ? '<span class="lkc-yong"' + style + ' aria-hidden="true">' + YONG + '</span>' : '';
    const icName = KIN_ICON[kin] || '';
    const mark = quiet
      ? '<span class="lkc-mark is-quiet" title="' + esc(kin) + '"></span>'
      : (isSelf
        ? '<span class="lkc-mark is-self" title="本">' + WFChrome.icon('star-fill') + '</span>'
        : '<span class="lkc-mark" title="' + esc(kin) + '">' + (icName ? WFChrome.icon(icName) : '') + '</span>');
    const meta = metaOf(node);
    const ml = r.mixLabel || mixLabel(node);
    const metaHtml = meta ? '<span class="lkc-meta">' + esc(meta) + '</span>' : '';
    const relHtml = ml ? '<span class="lkc-rel">' + esc(ml) + '</span>' : '';
    if (node.ghost || node.outgroup) {
      return '<div class="' + cls + '" title="' + esc(evidenceTitle(node)) + '">' + mark +
        (node.outgroup ? '<span class="lkc-out">出族</span>' : '') +
        '<span class="lkc-name">' + esc(node.name) + '</span>' + metaHtml + '</div>';
    }
    return '<button type="button" class="' + cls + '" data-focus="' + esc(node.id) + '" title="' + esc(evidenceTitle(node)) + '">' +
      mark + yong + '<span class="lkc-name">' + esc(node.name) + '</span>' + relHtml + metaHtml + '</button>';
  }

  function nodeYi(node, kin) {
    const quiet = kin === '近旁' || kin === '远旁';
    const isSelf = kin === '本';
    const cls = 'lkc-node' +
      (node.ghost ? ' is-ghost' : '') +
      (node.outgroup ? ' is-outgroup' : '') +
      (isSelf ? ' is-self' : '') +
      (kin === '远旁' ? ' is-far' : '') +
      (quiet ? ' is-quiet' : '');
    const style = (node.ghost || node.outgroup || quiet) ? '' : ' style="' + faceOf(node) + '"';
    const yong = isSelf ? '<span class="lkc-yong"' + style + ' aria-hidden="true">' + YONG + '</span>' : '';
    const mark = isSelf
      ? '<span class="lkc-mark is-self" title="本">' + WFChrome.icon('star-fill') + '</span>'
      : (quiet
        ? '<span class="lkc-mark is-quiet" title="' + esc(kin) + '"></span>'
        : '<span class="lkc-mark is-line" aria-hidden="true"></span>');
    const role = (!isSelf && kin) ? '<span class="lkc-role">' + esc(kin) + '</span>' : '';
    if (node.ghost || node.outgroup) {
      return '<div class="' + cls + '" title="' + esc(evidenceTitle(node)) + '">' + mark +
        (node.outgroup ? '<span class="lkc-out">出族</span>' : '') +
        role + '<span class="lkc-name">' + esc(node.name) + '</span></div>';
    }
    return '<button type="button" class="' + cls + '" data-focus="' + esc(node.id) + '" title="' + esc(evidenceTitle(node)) + '">' +
      mark + yong + role + '<span class="lkc-name">' + esc(node.name) + '</span></button>';
  }

  function nodeDingSpine(node, kin) {
    const isSelf = kin === '本';
    const cls = 'lkc-node' + (isSelf ? ' is-self' : '') +
      (node.ghost ? ' is-ghost' : '') + (node.outgroup ? ' is-outgroup' : '');
    const style = (node.ghost || node.outgroup) ? '' : ' style="' + faceOf(node) + '"';
    const yong = (!node.ghost && !node.outgroup)
      ? '<span class="lkc-yong"' + style + ' aria-hidden="true">' + YONG + '</span>' : '';
    const role = '<span class="lkc-role">' + esc(isSelf ? '本' : kin) + '</span>';
    if (node.ghost || node.outgroup) {
      return '<div class="' + cls + '">' + role + '<span class="lkc-name">' + esc(node.name) + '</span></div>';
    }
    return '<button type="button" class="' + cls + '" data-focus="' + esc(node.id) + '">' +
      role + yong + '<span class="lkc-name">' + esc(node.name) + '</span></button>';
  }

  function nodeDingSide(node, kin) {
    const cls = 'lkc-node is-quiet' + (kin === '远旁' ? ' is-far' : '');
    return '<button type="button" class="' + cls + '" data-focus="' + esc(node.id) + '">' +
      '<span class="lkc-role">' + esc(kin) + '</span>' +
      '<span class="lkc-name">' + esc(node.name) + '</span></button>';
  }

  /* —— summaries —— */
  function summaryJia(focus, info, forest) {
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
    let html = '<div class="lkc-chain-box"><ul class="lkc-chain">';
    chain.forEach(function (n, i) {
      if (i) html += '<li class="lkc-chain-sep" aria-hidden="true">' + WFChrome.icon('chevron-right') + '</li>';
      const r = roles[n.id] || {};
      const kin = r.kin || (n.ghost || n.outgroup ? '上祖' : '');
      const ic = KIN_ICON[kin] || 'stack';
      const isOn = n.id === focus.id;
      if (n.ghost || n.outgroup) {
        html += '<li><span class="lkc-chain-item is-ghost">' + WFChrome.icon(ic) + '<span>' + esc(n.name) + '</span></span></li>';
      } else {
        html += '<li><button type="button" class="lkc-chain-item' + (isOn ? ' is-on' : '') +
          '" data-focus="' + esc(n.id) + '">' + WFChrome.icon(ic) + '<span>' + esc(n.name) + '</span></button></li>';
      }
    });
    html += '</ul><p class="lkc-sub">' + esc(bits.join(' · ')) + '</p></div>';
    return html;
  }

  function summaryYi(focus, info, forest) {
    const roles = info.roles;
    const bits = [];
    const near = Object.keys(roles).filter(function (id) { return roles[id].kin === '近旁'; }).length;
    const far = Object.keys(roles).filter(function (id) { return roles[id].kin === '远旁'; }).length;
    if (near) bits.push('近旁 ' + near);
    if (far) bits.push('远旁 ' + far);
    if (info.ancestors.length === 0) bits.push('本组内无父');
    const names = [];
    info.ancestors.slice().reverse().forEach(function (id) {
      const n = forest.byId[id];
      if (n) names.push(n.name);
    });
    names.push(focus.name);
    const zi = [];
    Object.keys(roles).forEach(function (id) {
      if (roles[id].kin === '子' && forest.byId[id] && !forest.byId[id].ghost) zi.push(forest.byId[id]);
    });
    if (zi.length === 1) names.push(zi[0].name);
    else if (zi.length > 1) names.push(zi.length + ' 子');
    let html = '<p class="lkc-focus-line"><span class="lkc-focus-k">中心</span> <strong>' + esc(focus.name) + '</strong></p>';
    html += '<p class="lkc-quiet-chain">' + esc(names.join(' · ')) + '</p>';
    if (bits.length) html += '<p class="lkc-sub">' + esc(bits.join(' · ')) + '</p>';
    return html;
  }

  /* —— mode trees —— */
  function treeJia(forest, info) {
    const roles = info.roles;
    const L = collectLists(info, forest);
    let html = '<section class="lkc-sec"><h2 class="lkc-sec-h">直系</h2><ul class="lkc-list">';
    L.spine.forEach(function (n) {
      const kin = (roles[n.id] && roles[n.id].kin) || (n.ghost || n.outgroup ? '上祖' : '');
      html += '<li>' + nodeJia(n, kin, roles) + '</li>';
    });
    html += '</ul>';
    if (L.zi.length) {
      html += '<p class="lkc-subh">子 · ' + L.zi.length + '</p><ul class="lkc-list lkc-kids">';
      L.zi.forEach(function (n) { html += '<li>' + nodeJia(n, '子', roles) + '</li>'; });
      html += '</ul>';
    }
    if (L.sun.length) {
      html += '<p class="lkc-subh">孙 · ' + L.sun.length + '</p><ul class="lkc-list lkc-kids">';
      L.sun.forEach(function (n) { html += '<li>' + nodeJia(n, '孙', roles) + '</li>'; });
      html += '</ul>';
    }
    html += '</section>';
    if (L.near.length || L.far.length) {
      html += '<section class="lkc-sec"><h2 class="lkc-sec-h">旁系</h2>';
      if (L.near.length) {
        html += '<p class="lkc-subh">近旁 · 同父兄弟</p><ul class="lkc-list">';
        L.near.forEach(function (n) { html += '<li>' + nodeJia(n, '近旁', roles) + '</li>'; });
        html += '</ul>';
      }
      if (L.far.length) {
        html += '<p class="lkc-subh">远旁</p>';
        const shown = L.far.slice(0, FAR_FOLD);
        const rest = L.far.slice(FAR_FOLD);
        html += '<ul class="lkc-list">';
        shown.forEach(function (n) { html += '<li>' + nodeJia(n, '远旁', roles) + '</li>'; });
        html += '</ul>';
        if (rest.length) {
          html += '<button type="button" class="lkc-fold" data-fold>展开远旁其余 ' + rest.length + ' 款</button>';
          html += '<ul class="lkc-list" hidden>';
          rest.forEach(function (n) { html += '<li>' + nodeJia(n, '远旁', roles) + '</li>'; });
          html += '</ul>';
        }
      }
      html += '</section>';
    }
    return html;
  }

  function treeYi(forest, info) {
    const roles = info.roles;
    const L = collectLists(info, forest);
    let html = '<section class="lkc-sec"><ul class="lkc-list">';
    L.spine.forEach(function (n) {
      const kin = (roles[n.id] && roles[n.id].kin) || (n.ghost || n.outgroup ? '上祖' : '');
      html += '<li>' + nodeYi(n, kin) + '</li>';
    });
    html += '</ul>';
    if (L.zi.length || L.sun.length) {
      html += '<details class="lkc-details"' + (L.zi.length + L.sun.length <= 4 ? ' open' : '') + '>';
      html += '<summary>下代 · ' + (L.zi.length ? L.zi.length + ' 子' : '') +
        (L.zi.length && L.sun.length ? ' · ' : '') +
        (L.sun.length ? L.sun.length + ' 孙' : '') + '</summary><ul class="lkc-list lkc-kids">';
      L.zi.forEach(function (n) { html += '<li>' + nodeYi(n, '子') + '</li>'; });
      L.sun.forEach(function (n) { html += '<li>' + nodeYi(n, '孙') + '</li>'; });
      html += '</ul></details>';
    }
    html += '</section>';
    if (L.near.length || L.far.length) {
      html += '<details class="lkc-details">';
      html += '<summary>旁系 · ' +
        (L.near.length ? '近 ' + L.near.length : '') +
        (L.near.length && L.far.length ? ' · ' : '') +
        (L.far.length ? '远 ' + L.far.length : '') + '</summary>';
      if (L.near.length) {
        html += '<ul class="lkc-list">';
        L.near.forEach(function (n) { html += '<li>' + nodeYi(n, '近旁') + '</li>'; });
        html += '</ul>';
      }
      if (L.far.length) {
        html += '<ul class="lkc-list">';
        L.far.forEach(function (n) { html += '<li>' + nodeYi(n, '远旁') + '</li>'; });
        html += '</ul>';
      }
      html += '</details>';
    }
    return html;
  }

  function treeBing(forest, info) {
    const roles = info.roles;
    const L = collectLists(info, forest);
    const roleLabel = function (kin) {
      if (kin === '上祖' || kin === '祖父') return kin === '祖父' ? '祖父' : '上祖';
      if (kin === '父') return '父';
      if (kin === '本') return '本';
      if (kin === '子' || kin === '孙') return kin;
      return kin || '';
    };
    let html = '<ul class="lkc-tl">';
    L.spine.forEach(function (n) {
      const kin = (roles[n.id] && roles[n.id].kin) || (n.ghost || n.outgroup ? '上祖' : '');
      const isSelf = kin === '本';
      const style = (isSelf && !n.ghost && !n.outgroup) ? ' style="' + faceOf(n) + '"' : '';
      const yong = isSelf ? '<span class="lkc-yong"' + style + ' aria-hidden="true">' + YONG + '</span>' : '';
      const body = (n.ghost || n.outgroup)
        ? '<div class="lkc-node is-ghost"><span class="lkc-name">' +
          (n.outgroup ? '<span class="lkc-out">出族</span> ' : '') + esc(n.name) + '</span></div>'
        : '<button type="button" class="lkc-node' + (isSelf ? ' is-self' : '') +
          '" data-focus="' + esc(n.id) + '">' + yong +
          '<span class="lkc-name">' + esc(n.name) + '</span></button>';
      html += '<li class="lkc-tl-row' + (isSelf ? ' is-self' : '') + '">' +
        '<div class="lkc-tl-role">' + esc(roleLabel(kin)) + '</div>' +
        '<div class="lkc-tl-rail"><span class="lkc-tl-dot"></span></div>' +
        '<div class="lkc-tl-body">' + body + '</div></li>';
    });
    /* 子挂在时间轴末 */
    L.zi.forEach(function (n) {
      html += '<li class="lkc-tl-row">' +
        '<div class="lkc-tl-role">子</div>' +
        '<div class="lkc-tl-rail"><span class="lkc-tl-dot"></span></div>' +
        '<div class="lkc-tl-body"><button type="button" class="lkc-node" data-focus="' + esc(n.id) + '">' +
        '<span class="lkc-name">' + esc(n.name) + '</span></button></div></li>';
    });
    html += '</ul>';
    if (L.near.length || L.far.length) {
      html += '<div class="lkc-tl-side"><p class="lkc-subh">旁系</p><ul class="lkc-chips">';
      L.near.forEach(function (n) {
        html += '<li><button type="button" class="lkc-chip" data-focus="' + esc(n.id) + '">' + esc(n.name) + '</button></li>';
      });
      L.far.forEach(function (n) {
        html += '<li><button type="button" class="lkc-chip is-far" data-focus="' + esc(n.id) + '">' + esc(n.name) + '</button></li>';
      });
      html += '</ul></div>';
    }
    return html;
  }

  function treeDing(forest, info) {
    const roles = info.roles;
    const L = collectLists(info, forest);
    let html = '<div class="lkc-dual"><div class="lkc-dual-spine"><h2 class="lkc-sec-h">直系</h2><ul class="lkc-list">';
    L.spine.forEach(function (n) {
      const kin = (roles[n.id] && roles[n.id].kin) || (n.ghost || n.outgroup ? '上祖' : '');
      html += '<li>' + nodeDingSpine(n, kin) + '</li>';
    });
    L.zi.forEach(function (n) { html += '<li>' + nodeDingSpine(n, '子') + '</li>'; });
    L.sun.forEach(function (n) { html += '<li>' + nodeDingSpine(n, '孙') + '</li>'; });
    html += '</ul></div><div class="lkc-dual-side"><h2 class="lkc-sec-h">旁系</h2>';
    if (!L.near.length && !L.far.length) {
      html += '<p class="lkc-subh">本组内无旁系</p>';
    } else {
      if (L.near.length) {
        html += '<p class="lkc-subh">近旁</p><ul class="lkc-list">';
        L.near.forEach(function (n) { html += '<li>' + nodeDingSide(n, '近旁') + '</li>'; });
        html += '</ul>';
      }
      if (L.far.length) {
        html += '<p class="lkc-subh">远旁</p><ul class="lkc-list">';
        L.far.forEach(function (n) { html += '<li>' + nodeDingSide(n, '远旁') + '</li>'; });
        html += '</ul>';
      }
    }
    html += '</div></div>';
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

  function setMode(m) {
    if (!MODE_DESC[m]) m = 'jia';
    curMode = m;
    const url = new URL(location.href);
    url.searchParams.set('mode', m);
    history.replaceState(null, '', url);
    modeNav.querySelectorAll('[data-mode]').forEach(function (btn) {
      btn.classList.toggle('is-on', btn.getAttribute('data-mode') === m);
    });
    modeDesc.textContent = MODE_DESC[m];
    stage.setAttribute('data-mode', m);
    render();
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

    if (curMode === 'jia') {
      summaryEl.innerHTML = summaryJia(focus, info, forest);
      stage.innerHTML = treeJia(forest, info);
    } else if (curMode === 'yi') {
      summaryEl.innerHTML = summaryYi(focus, info, forest);
      stage.innerHTML = treeYi(forest, info);
    } else if (curMode === 'bing') {
      summaryEl.innerHTML = '';
      stage.innerHTML = treeBing(forest, info);
    } else {
      summaryEl.innerHTML = '';
      stage.innerHTML = treeDing(forest, info);
    }

    function bindFocus(root) {
      root.querySelectorAll('[data-focus]').forEach(function (btn) {
        btn.addEventListener('click', function () { setFocus(btn.getAttribute('data-focus')); });
      });
    }
    bindFocus(summaryEl);
    bindFocus(stage);
    wireFolds();

    footNote.textContent =
      '四套共用同一中心与字族。甲＝还原 v4；乙＝v5 calm；丙＝时间轴；丁＝双栏。' +
      ' 全库 ' + all.length + ' 款里 ' + withLineage + ' 款已入谱，另有 ' + noLineage + ' 款尚未建谱。';

    document.title = (focus ? focus.name + ' · ' : '') + '亲属对照 · 文风字体';
  }

  modeNav.querySelectorAll('[data-mode]').forEach(function (btn) {
    btn.addEventListener('click', function () { setMode(btn.getAttribute('data-mode')); });
  });

  WFProto.loadCatalog().then(function () {
    const qm = qs('mode');
    curMode = MODE_DESC[qm] ? qm : 'jia';
    modeNav.querySelectorAll('[data-mode]').forEach(function (btn) {
      btn.classList.toggle('is-on', btn.getAttribute('data-mode') === curMode);
    });
    modeDesc.textContent = MODE_DESC[curMode];
    stage.setAttribute('data-mode', curMode);
    renderFamNav();
    render();
  });
})();
