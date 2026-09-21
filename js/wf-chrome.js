/* 文风字体 v4 · 站点外壳：顶栏 / 页脚 / 提示条 / 登录态。依赖 wf-proto.js */
(function () {
  const USER_KEY = 'wf-app-user';

  function rootUrl() {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      const src = scripts[i].src || '';
      if (src.indexOf('wf-chrome.js') !== -1) return new URL('../', src).href;
    }
    return './';
  }
  const ROOT = rootUrl();
  function href(path) { return ROOT + path; }
  function esc(s) { return WFProto.escapeHtml(s); }

  function user() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) { return null; }
  }
  function login(profile) {
    localStorage.setItem(USER_KEY, JSON.stringify(profile || { name: '文派设计', email: 'design@wenpai.org' }));
  }
  function logout() { localStorage.removeItem(USER_KEY); }

  /* —— 主题：亮 / 暗，记在 localStorage，首屏在 <head> 之前由 applyTheme 同步 —— */
  const THEME_KEY = 'wf-theme';
  function theme() { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; }
  /* ?theme=dark|light 可直接指定并记住（分享 / 截图用） */
  (function () { const q = WFProto.getQuery('theme'); if (q === 'dark' || q === 'light') localStorage.setItem(THEME_KEY, q); })();
  function applyTheme(t) {
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }
  function toggleTheme() {
    const next = theme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      const label = b.getAttribute('data-label') || '';
      b.innerHTML = themeIcon() + (label ? label : '');
      b.setAttribute('aria-label', next === 'dark' ? '切换到浅色' : '切换到深色');
    });
  }
  applyTheme(theme());

  const VIEW_KEY = 'wf-view';
  function view() { return localStorage.getItem(VIEW_KEY) === 'dev' ? 'dev' : 'design'; }
  function applyView(v) { document.documentElement.setAttribute('data-view', v === 'dev' ? 'dev' : 'design'); }
  (function () {
    const q = WFProto.getQuery('view');
    if (q === 'dev' || q === 'design') localStorage.setItem(VIEW_KEY, q);
    applyView(view());
  })();
  function setView(v) {
    const next = v === 'dev' ? 'dev' : 'design';
    localStorage.setItem(VIEW_KEY, next);
    applyView(next);
    document.querySelectorAll('[data-view-switch] [data-mode]').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-mode') === next);
    });
    document.dispatchEvent(new CustomEvent('wf:view', { detail: next }));
  }
  function viewSwitchHtml() {
    const cur = view();
    return '<div class="seg view-switch" data-view-switch role="group" aria-label="视图">' +
      '<button type="button" data-mode="design"' + (cur === 'design' ? ' class="is-on"' : '') + '>设计</button>' +
      '<button type="button" data-mode="dev"' + (cur === 'dev' ? ' class="is-on"' : '') + '>开发</button></div>';
  }
  function bindViewSwitch(root) {
    (root || document).querySelectorAll('[data-view-switch] [data-mode]').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.getAttribute('data-mode')); });
    });
  }

  /* —— 图标：MingCute 线性（Apache-2.0），经墨图爱可 icons.motucloud.com 选取，打包在 assets/icons.svg —— */
  function icon(name, cls) {
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" aria-hidden="true" focusable="false"><use href="' + href('assets/icons.svg') + '#i-' + name + '"/></svg>';
  }
  function themeIcon() { return icon(theme() === 'dark' ? 'sun' : 'moon'); }

  const NAV = [
    { id: 'fonts', label: '字体库', path: 'fonts.html' },
    { id: 'features', label: '特点', path: 'features.html' },
    { id: 'foundries', label: '厂商', path: 'foundry.html' },
    { id: 'pricing', label: '定价', path: 'pricing.html' },
    { id: 'docs', label: '文档', path: 'docs.html' }
  ];

  /* 定价：本地开发默认可见；正式站须 ?pricing=1 / ?dev=1 或 localStorage 显式打开 */
  function showPricing() {
    try {
      const q = new URLSearchParams(location.search);
      if (q.get('dev') === '1') localStorage.setItem('wf-dev', '1');
      if (q.get('pricing') === '1') localStorage.setItem('wf-show-pricing', '1');
      if (q.get('dev') === '0') localStorage.removeItem('wf-dev');
      if (q.get('pricing') === '0') localStorage.removeItem('wf-show-pricing');
      if (localStorage.getItem('wf-show-pricing') === '1' || localStorage.getItem('wf-dev') === '1') return true;
    } catch (e) { /* ignore */ }
    const h = location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '0.0.0.0';
  }
  function navItems() {
    return NAV.filter(function (n) { return n.id !== 'pricing' || showPricing(); });
  }
  function applyPricingVisibility() {
    const on = showPricing();
    document.querySelectorAll('[data-pricing]').forEach(function (el) { el.hidden = !on; });
    if (document.body.classList.contains('page-pricing') && !on) {
      location.replace(href('index.html'));
    }
  }

  function renderTopbar(el) {
    const active = el.getAttribute('data-active') || '';
    const u = user();
    const nav = navItems();
    el.classList.add('topbar');
    if (el.hasAttribute('data-dark')) el.classList.add('is-dark');
    el.innerHTML =
      '<div class="container topbar-inner">' +
        '<a class="wordmark" href="' + href('index.html') + '">' +
          '<img src="' + href('assets/icon.webp') + '" alt="" width="22" height="22" />' +
          '<span>文风字体</span></a>' +
        '<nav class="topnav" aria-label="主导航">' +
          nav.map(function (n) {
            return '<a href="' + href(n.path) + '"' + (n.id === active ? ' class="is-active"' : '') + '>' + n.label + '</a>';
          }).join('') +
        '</nav>' +
        '<div class="topbar-end">' +
          '<form class="topsearch" action="' + href('fonts.html') + '" method="get" role="search">' +
            icon('search') +
            '<input type="search" name="keyword" id="navSearch" placeholder="搜索字体、厂商" aria-label="搜索字体" autocomplete="off" />' +
            '<button type="button" class="clear" id="navSearchClear" hidden aria-label="清除搜索">' + icon('close') + '</button>' +
          '</form>' +
          '<a href="' + href('shopping-bag.html') + '">' + icon('bag') + '<span>选字袋</span><span class="count" data-pick-count data-count="0">0</span></a>' +
          (u
            ? '<a href="' + href('app/index.html') + '">' + icon('dashboard') + '<span>控制台</span></a>'
            : '<a href="' + href('login.html') + '">' + icon('user') + '<span>登录</span></a>') +
          viewSwitchHtml() +
          '<button type="button" class="icon-btn" data-theme-toggle aria-label="' + (theme() === 'dark' ? '切换到浅色' : '切换到深色') + '">' + themeIcon() + '</button>' +
          '<button type="button" class="icon-btn menu-btn" id="navMenuBtn" aria-label="菜单" aria-expanded="false" aria-controls="navMenu">' + icon('menu') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="topmenu" id="navMenu" hidden>' +
        '<form class="topsearch" action="' + href('fonts.html') + '" method="get" role="search">' + icon('search') +
          '<input type="search" name="keyword" placeholder="搜索字体、厂商" aria-label="搜索字体" autocomplete="off" /></form>' +
        nav.map(function (n) {
          return '<a href="' + href(n.path) + '"' + (n.id === active ? ' class="is-active"' : '') + '>' + n.label + '</a>';
        }).join('') +
        viewSwitchHtml() +
      '</div>';
    const pickN = (WFProto.getPicks() || []).length;
    el.querySelectorAll('[data-pick-count]').forEach(function (c) {
      c.textContent = String(pickN);
      c.setAttribute('data-count', String(pickN));
    });
    el.querySelector('[data-theme-toggle]').addEventListener('click', toggleTheme);
    bindViewSwitch(el);
    const menuBtn = el.querySelector('#navMenuBtn');
    const menu = el.querySelector('#navMenu');
    menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
  }

  function setMenu(open) {
    const menu = document.getElementById('navMenu');
    const menuBtn = document.getElementById('navMenuBtn');
    if (!menu || !menuBtn) return;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.innerHTML = icon(open ? 'close' : 'menu');
  }

  /* 键盘：`/` 聚焦顶栏搜索，Esc 收起菜单 */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      const menu = document.getElementById('navMenu');
      if (menu && !menu.hidden) { setMenu(false); e.preventDefault(); }
      return;
    }
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const s = document.getElementById('navSearch');
    if (s) { e.preventDefault(); s.focus(); s.select(); }
  });

  function ensureFooter() {
    let foot = document.getElementById('wfExtraFooter');
    if (!foot) return;
    if (!foot.children.length) WFProto.renderExtraFooter(foot);
    foot.classList.remove('is-dark');
  }

  let toastEl = null;
  let toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }

  function copy(text, msg) {
    return WFProto.copyText(text).then(function () { toast(msg || '已复制'); });
  }

  /* —— 确认弹层：破坏性操作二次确认。返回 Promise<boolean> —— */
  function confirm(opts) {
    opts = typeof opts === 'string' ? { message: opts } : (opts || {});
    return new Promise(function (resolve) {
      const prev = document.getElementById('wfDialog');
      if (prev) prev.remove();
      const danger = opts.danger !== false && /移除|清空|删除|回滚|恢复|轮换/.test((opts.ok || '') + (opts.title || ''));
      const wrap = document.createElement('div');
      wrap.id = 'wfDialog';
      wrap.className = 'dialog-back';
      wrap.innerHTML =
        '<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="wfDialogTitle" aria-describedby="wfDialogMsg">' +
          '<h3 id="wfDialogTitle">' + esc(opts.title || '确认') + '</h3>' +
          '<p id="wfDialogMsg">' + esc(opts.message || '确定继续？') + '</p>' +
          '<div class="dialog-acts">' +
            '<button type="button" class="btn" data-no>' + esc(opts.cancel || '取消') + '</button>' +
            '<button type="button" class="btn btn-ink" data-yes>' + esc(opts.ok || '确定') + '</button>' +
          '</div></div>';
      document.body.appendChild(wrap);
      const no = wrap.querySelector('[data-no]');
      const yes = wrap.querySelector('[data-yes]');
      const buttons = [no, yes];
      const prior = document.activeElement;
      document.body.style.overflow = 'hidden';
      const done = function (ok) {
        wrap.remove();
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onKey);
        if (prior && prior.focus) prior.focus();
        resolve(ok);
      };
      const onKey = function (e) {
        if (e.key === 'Escape') { e.preventDefault(); done(false); return; }
        if (e.key !== 'Tab') return;
        e.preventDefault();
        const i = buttons.indexOf(document.activeElement);
        const next = e.shiftKey ? (i <= 0 ? buttons.length - 1 : i - 1) : (i === buttons.length - 1 || i < 0 ? 0 : i + 1);
        buttons[next].focus();
      };
      no.addEventListener('click', function () { done(false); });
      yes.addEventListener('click', function () { done(true); });
      wrap.addEventListener('click', function (e) { if (e.target === wrap) done(false); });
      document.addEventListener('keydown', onKey);
      (danger ? no : yes).focus();
    });
  }

  const VERIFIED_SVG = '<span class="badge-verified" title="厂商已认领">' + icon('verified') + '</span>';
  const SOURCE_KIND_LABEL = {
    standard: '标准开源文本',
    rights_holder: '权利人官网',
    github_license: '源仓库许可',
    platform: '素材站声明',
    author_note: '作者文字声明',
    unlabeled: '尚未核对原文'
  };
  const KIND_LABEL = { author: '作者', project: '项目', foundry: '字库', brand: '品牌方', platform: '素材平台' };

  /* 主归属是品牌方 ownerInfo；制作方不同时走 makerInfo */
  function brandInfo(font) { return (font && (font.ownerInfo || font.foundryInfo)) || null; }
  function makerInfo(font) {
    const m = font && font.makerInfo;
    const o = brandInfo(font);
    if (!m || !m.id || (o && m.id === o.id)) return null;
    return m;
  }
  function brandName(font) { const b = brandInfo(font); return b ? b.name : ''; }
  function brandEn(font) { const b = brandInfo(font); return (b && b.en) || ''; }
  function brandShort(font) { const b = brandInfo(font); return (b && (b.short || b.name)) || ''; }
  function brandSite(font) { const b = brandInfo(font); return (b && b.website) || (font && font.brand && font.brand.website) || ''; }
  function junkAvatar(url) {
    return /identicon|cravatar\.(com|cn)\/avatar/i.test(url || '');
  }
  /* 本地清单优先：按正在展示的厂商 id 取图，不看哪条目录碰巧写了 brand.avatarUrl */
  function resolveAvatar(url) {
    const u = String(url || '').trim();
    if (!u || junkAvatar(u)) return '';
    if (/^(https?:|data:|blob:)/i.test(u)) return u;
    return href(u.replace(/^\.\//, ''));
  }
  function brandAvatar(font, info) {
    const who = info || brandInfo(font);
    const id = (who && who.id) || (font && font.brand && font.brand.slug) || '';
    const fromMap = (WFProto.getAvatarUrl && WFProto.getAvatarUrl(id)) || '';
    if (fromMap) return resolveAvatar(fromMap);
    if (id) return '';
    const brand = font && font.brand;
    const raw = (brand && (brand.logoUrl || brand.avatarUrl)) || (font && font.foundryAvatar) || '';
    return resolveAvatar(raw);
  }
  /** 同一厂商的多条目录记录（别名、合作署名）归到一个 id */
  function brandSlug(font) { const b = brandInfo(font); return b ? b.id : ''; }
  /** 厂商已认领（foundries.claimed），与许可核对无关 */
  function brandVerified(font) { const b = brandInfo(font); return !!(b && b.claimed); }
  function brandKind(font) { const b = brandInfo(font); return (b && b.kind) || ''; }

  /* 台湾系字体：不对简体千字文做收录盘点（HANDOFF §4 名单 + 名称特征） */
  const TW_GLYPH_FOUNDRY = ['ichiten', 'moe-tw', 'writes', 'newvalue', 'dynalab'];
  const TW_GLYPH_NAME = /(?:\bTW\b|繁体中文|繁體中文|PMingLiU|俐方体|MOESong|王[漢汉]宗|Cubic\s*11|教育部標準|辰宇|清松手写)/;
  function skipGlyphCov(font) {
    if (!font) return false;
    const ids = [font.ownerInfo, font.foundryInfo, font.makerInfo].filter(Boolean).map(function (b) { return b.id; });
    if (ids.some(function (id) { return TW_GLYPH_FOUNDRY.indexOf(id) !== -1; })) return true;
    if (/CMEX/i.test(font.designer || '')) return true;
    const blob = (font.name || '') + ' ' + (font.en || '');
    return TW_GLYPH_NAME.test(blob);
  }
  function kindLabel(fontOrFoundry) {
    const fd = fontOrFoundry && fontOrFoundry.kind ? fontOrFoundry : brandInfo(fontOrFoundry);
    if (!fd || !fd.kind) return '';
    if (fd.kind === 'author' && fd.openSource) return '开源作者';
    if (fd.kind === 'project' && fd.openSource) return '开源项目';
    if (fd.kind === 'brand') return '品牌方';
    return KIND_LABEL[fd.kind] || '';
  }

  function licenseEvidence(font) {
    return (font && font.licenseEvidence) || { sourceKind: 'unlabeled', verified: false, sourceUrl: '', quote: '', restrictions: [] };
  }
  function sourceKindLabel(kind) { return SOURCE_KIND_LABEL[kind] || SOURCE_KIND_LABEL.unlabeled; }
  function licenseHost(url) {
    try { return new URL(url).host; } catch (e) { return String(url || '').replace(/^https?:\/\//, '').split('/')[0]; }
  }
  function licenseCiteHtml(font) {
    const ev = licenseEvidence(font);
    const site = brandSite(font);
    const links = [];
    if (ev.sourceUrl) {
      links.push('<a href="' + esc(ev.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' + icon('external') +
        (ev.sourceKind === 'standard' ? '打开许可原文' : '打开出处') +
        (ev.sourceUrl ? ' · ' + esc(licenseHost(ev.sourceUrl)) : '') + '</a>');
    }
    if (site && (!ev.sourceUrl || licenseHost(site) !== licenseHost(ev.sourceUrl))) {
      const who = brandKind(font) === 'brand' ? '品牌方官网' : '厂商官网';
      links.push('<a href="' + esc(site) + '" target="_blank" rel="noopener noreferrer">' + icon('link') + who + ' · ' + esc(licenseHost(site)) + '</a>');
    }
    return '<div class="license-cite">' +
      '<p class="cite-meta">' + icon('certificate') +
        '<span>' + esc(sourceKindLabel(ev.sourceKind)) + '</span>' +
        (ev.spdx ? '<span class="mono">' + esc(ev.spdx) + '</span>' : '') +
        (ev.verifiedAt ? '<span>' + esc(ev.verifiedAt) + ' 核对</span>' : '') +
        '<span>' + (ev.verified ? '已核对原文' : '尚未核对原文') + '</span></p>' +
      (ev.quote ? '<blockquote>' + esc(ev.quote) + '</blockquote>' : '') +
      (ev.sourceKind === 'platform' ? '<p class="cite-warn">这是素材站声明，不是厂商官网。商用前请到权利人页面核对。</p>' : '') +
      (ev.sourceKind === 'unlabeled' || ev.sourceKind === 'author_note'
        ? '<p class="cite-warn">目前没有可核验的原文链接。用之前请向权利人确认。</p>' : '') +
      '<p class="cite-links">' + (links.length ? links.join('') : '') +
        ' <span>条款以权利人为准。</span></p></div>';
  }

  const REL_LABEL = { original: '原作', locale: '地区版', fork: '派生', commissioned: '委托定制', collab: '合作' };
  const FOLLOW_COPY = {
    inherit: '沿用上游许可，改完要换名并保留声明。',
    own: '以品牌方许可为准。',
    unknown: '同源关系已知，许可还没核对。'
  };

  function lineageHtml(font) {
    const L = font && font.lineage;
    const maker = makerInfo(font);
    const has = L && (L.relation || L.group || L.upstreamName);
    if (!has && !maker) return '';
    const bits = [];
    if (L && L.relation) bits.push(REL_LABEL[L.relation] || L.relation);
    if (L && L.upstreamName) bits.push('上游 ' + L.upstreamName);
    if (L && L.groupName) bits.push('同系 ' + L.groupName);
    if (maker) bits.push(maker.name + ' 制作');
    const follow = (L && FOLLOW_COPY[L.licenseFollows]) || '';
    return '<div class="license-cite lineage">' +
      (bits.length ? '<p class="cite-meta">' + icon('history') + '<span>' + esc(bits.join(' · ')) + '</span></p>' : '') +
      (follow ? '<p class="cite-warn">' + esc(follow) + '</p>' : '') +
      (L && L.group
        ? '<p class="cite-links"><a href="' + href('fonts.html?lineage=' + encodeURIComponent(L.group)) + '">' + icon('link') + '查看同系字体</a></p>'
        : '') +
    '</div>';
  }

  const UPSTREAM_FONT = {
    'IPA 明朝': 'IPAexMincho',
    '思源黑体': '思源黑体',
    '思源宋体': '思源宋体',
    '龙藏体': '龙藏体'
  };
  function findFontByName(list, name) {
    if (!name || !list) return null;
    const hit = list.filter(function (f) { return f.name === name; })[0];
    if (hit) return hit;
    const alias = UPSTREAM_FONT[name];
    if (alias) {
      const mapped = list.filter(function (f) { return f.name === alias; })[0];
      if (mapped) return mapped;
    }
    return list.filter(function (f) {
      return f.name.indexOf(name) === 0 || name.indexOf(f.name) === 0;
    })[0] || null;
  }
  function lineageKin(list, font) {
    const g = font && font.lineage && font.lineage.group;
    if (!g || !list) return [];
    return list.filter(function (f) { return f.lineage && f.lineage.group === g; });
  }
  function isLineagePack(f, rootName) {
    return !!(rootName && f.name !== rootName && f.name.indexOf(rootName) === 0);
  }
  function lineageRow(f, on, faceOf) {
    const face = faceOf ? faceOf(f) : '';
    return '<a class="lin-row' + (on ? ' is-on' : '') + '" href="' + href('font-detail.html?id=' + encodeURIComponent(f.id)) + '">' +
      '<span class="lin-name"' + (face ? ' style="' + face + '"' : '') + '>' + esc(f.name) + '</span>' +
      '<span class="lin-rel">' + esc(REL_LABEL[(f.lineage || {}).relation] || '同系') + (on ? ' · 当前' : '') + '</span></a>';
  }
  function lineageGhostRow(name) {
    return '<span class="lin-row is-miss">' +
      '<span class="lin-name">' + esc(name) + '</span>' +
      '<span class="lin-rel">原作 · 库里没有</span></span>';
  }
  function lineageTreeHtml(font, list, faceOf) {
    const all = lineageKin(list, font);
    const L = (font && font.lineage) || {};
    const up = L.upstreamName || '';
    const root = findFontByName(list, up) ||
      all.filter(function (f) { return (f.lineage || {}).relation === 'original'; })[0] ||
      null;
    const peers = all.filter(function (f) {
      if (f.id === font.id) return false;
      if (root && f.id === root.id) return false;
      if (isLineagePack(f, (root && root.name) || up)) return false;
      return true;
    });
    if (!root && !up && all.length < 2) return '';
    const n = all.length || 1;
    const lead = '<p class="lin-lead">' + esc(L.groupName || up || '同系') + ' · ' + n + ' 款' +
      (!root && up ? ' · 原作不在库里' : '') + '</p>';
    if (root || up) {
      const kids = peers.slice();
      if (!root || font.id !== root.id) kids.unshift(font);
      const head = root
        ? lineageRow(root, root.id === font.id, faceOf)
        : lineageGhostRow(up);
      return lead + '<div class="lin-tree">' + head +
        '<div class="lin-kids">' + kids.map(function (k) { return lineageRow(k, k.id === font.id, faceOf); }).join('') + '</div></div>';
    }
    return lead + '<div class="lin-tree lin-flat">' + all.map(function (f) {
      return lineageRow(f, f.id === font.id, faceOf);
    }).join('') + '</div>';
  }

  function foundryHtml(font, opts) {
    opts = opts || {};
    const info = opts.info || brandInfo(font);
    const name = (info && info.name) || brandName(font) || '未署名';
    const avatar = brandAvatar(font, info);
    const size = opts.small ? 24 : 40;
    const mark = avatar
      ? '<img src="' + esc(avatar) + '" alt="" width="' + size + '" height="' + size + '" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{className:\'mark\',textContent:' + JSON.stringify(name.charAt(0)) + '}))" />'
      : '<span class="mark">' + esc(name.charAt(0)) + '</span>';
    const slug = (info && info.id) || brandSlug(font);
    const link = href('foundry.html?slug=' + encodeURIComponent(slug));
    const en = (info && info.en) || brandEn(font);
    const kind = kindLabel(info || font);
    const sub = [kind, opts.sub].filter(Boolean).join(' · ');
    const verified = !!(info && info.claimed);
    return '<a class="foundry' + (opts.small ? ' foundry-sm' : '') + (opts.cls ? ' ' + opts.cls : '') + '" href="' + link + '">' + mark +
      '<span><span class="name">' + esc(name) + (verified ? VERIFIED_SVG : '') +
      (en && !opts.small && en !== name ? '<span class="en">' + esc(en) + '</span>' : '') + '</span>' +
      (sub ? '<span class="sub">' + esc(sub) + '</span>' : '') + '</span></a>';
  }

  const CAT_LABEL = { '无衬线字体': '黑体', 'Mono': '等宽' };
  function catLabel(raw) { return CAT_LABEL[raw] || raw || ''; }

  function faceHtml(font, size, info) {
    const url = brandAvatar(font, info);
    if (!url) return '';
    const s = size || 16;
    const who = info || brandInfo(font);
    const letter = ((who && (who.short || who.name)) || '?').charAt(0);
    return '<img class="meta-face" src="' + esc(url) + '" alt="" width="' + s + '" height="' + s + '" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{className:\'meta-face mark\',textContent:' + JSON.stringify(letter) + '}))" />';
  }

  function licenseTier(font) {
    if (WFProto.licenseTier) return WFProto.licenseTier(font);
    const t = String((font && font.license) || '').trim();
    if (t === '免费商用') return '免费商用';
    if (t === '联系授权' || t === '付费授权') return '需授权';
    if (t === '个人免费') return '个人免费';
    return '待核实';
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyPricingVisibility();
    document.querySelectorAll('[data-topbar]').forEach(renderTopbar);
    ensureFooter();
    const s = document.getElementById('navSearch');
    if (s) WFProto.bindNavSearch(s, document.getElementById('navSearchClear'));
  });

  function holdScroll(node, fn, lockY) {
    fn();
    if (lockY == null) return;
    function fix() { window.scrollTo(0, lockY); }
    fix(); requestAnimationFrame(fix); requestAnimationFrame(function () { requestAnimationFrame(fix); });
  }

  window.WFChrome = {
    ROOT: ROOT,
    href: href,
    user: user,
    login: login,
    logout: logout,
    toast: toast,
    copy: copy,
    confirm: confirm,
    icon: icon,
    theme: theme,
    toggleTheme: toggleTheme,
    view: view,
    setView: setView,
    brandInfo: brandInfo,
    makerInfo: makerInfo,
    brandName: brandName,
    brandEn: brandEn,
    brandShort: brandShort,
    brandSite: brandSite,
    brandAvatar: brandAvatar,
    faceHtml: faceHtml,
    catLabel: catLabel,
    brandSlug: brandSlug,
    brandVerified: brandVerified,
    brandKind: brandKind,
    skipGlyphCov: skipGlyphCov,
    kindLabel: kindLabel,
    foundryHtml: foundryHtml,
    licenseTier: licenseTier,
    licenseEvidence: licenseEvidence,
    sourceKindLabel: sourceKindLabel,
    licenseCiteHtml: licenseCiteHtml,
    lineageHtml: lineageHtml,
    lineageKin: lineageKin,
    lineageTreeHtml: lineageTreeHtml,
    findFontByName: findFontByName,
    showPricing: showPricing,
    VERIFIED_SVG: VERIFIED_SVG,
    holdScroll: holdScroll
  };
})();
