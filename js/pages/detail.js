/* 字体详情：144px 可编辑标题样张 / 字重逐行 / 使用 / 字符表 / 授权 / 侧栏版权页 / 相关字体 */
(function () {
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('detailRoot');

  const FONT_DESC_BRIEF_MAX = 120;
  const BRAND_DESC_BRIEF_MAX = 72;

  function firstSentence(text) {
    const t = String(text || '').trim();
    if (!t) return '';
    const m = t.match(/^[^。！？!?\n]+[。！？!?]?/);
    return (m ? m[0] : t.split(/\n+/)[0] || t).trim();
  }

  function briefText(text, max) {
    max = max || FONT_DESC_BRIEF_MAX;
    const t = String(text || '').trim();
    if (!t || t.length <= max) return t;
    const cut = t.slice(0, max);
    const last = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('，'), cut.lastIndexOf(' '));
    const head = (last > max * 0.45 ? cut.slice(0, last + (cut[last] === '。' ? 1 : 0)) : cut.replace(/\s+\S*$/, '')).trim();
    return head + '…';
  }

  function isInternalCatalogDesc(text) {
    const t = String(text || '').trim();
    if (!t) return true;
    if (/CDN\s*OPEN|OFL\.txt|旁证|\bRFN\b|v0\.\d|shelf\s20|ingest|lineage-stub|头误写|fonts-packages/i.test(t)) return true;
    if (/上游.{0,48}[\+＋]/.test(t)) return true;
    if (/头旁证|以 README|上游旁证/.test(t)) return true;
    if (/^[^。]{0,96}(SIL Open Font License|OFL 1\.1)[^。]{0,64}上游/i.test(t)) return true;
    return false;
  }

  function defaultFontBlurb(font) {
    font = font || {};
    const name = String(font.name || '').trim() || '本款字体';
    const who = String(WFChrome.brandName(font) || font.designer || font.foundry || '').trim();
    const cat = WFChrome.catLabel(font.category) || font.category || '';
    let s = name;
    if (who) s += '，由 ' + who + ' 发布';
    if (cat) s += '（' + cat + '）';
    s += '。';
    if (/OFL|开源/i.test(String(font.licenseName || font.license || ''))) s += '开源许可。';
    return briefText(s, FONT_DESC_BRIEF_MAX);
  }

  function defaultBrandBlurb(entry, font) {
    const name = (entry && entry.name) || WFChrome.brandName(font) || '厂商';
    const kind = (entry && entry.kind) === 'author' ? '开源作者' : '品牌方';
    return briefText(name + '，' + kind + '。详情见厂商页。', BRAND_DESC_BRIEF_MAX);
  }

  function fontDescBrief(font) {
    if (!font) return '';
    const b = font.descriptionBrief || font.descBrief;
    if (b && String(b).trim() && !isInternalCatalogDesc(b)) return String(b).trim();
    const raw = font.description;
    if (!isInternalCatalogDesc(raw)) return briefText(raw, FONT_DESC_BRIEF_MAX);
    return defaultFontBlurb(font);
  }

  function brandDescBrief(entry, raw, font) {
    const b = entry && (entry.descriptionBrief || entry.descBrief);
    if (b && String(b).trim() && !isInternalCatalogDesc(b)) return String(b).trim();
    if (!isInternalCatalogDesc(raw)) return briefText(firstSentence(raw), BRAND_DESC_BRIEF_MAX);
    return defaultBrandBlurb(entry, font);
  }

  function licenseLists(font) {
    const tier = proofTier(font);
    const ev = WFChrome.licenseEvidence(font);
    const name = String(font.licenseName || ev.label || font.license || '');
    const ok = [], no = [];
    if (/GPL/i.test(ev.spdx || name)) {
      ok.push('可按 GPL 使用、修改与再分发');
      no.push('再分发须遵守 GPL', '嵌入专有软件前先读原文');
    } else if (/OFL|Open Font|Apache|MIT|IPA/i.test(name + ' ' + (ev.spdx || ''))) {
      ok.push('网页、App、印刷、商业项目均可使用', '可嵌入网页并再分发（保留许可声明）', '可修改后以其他名称发布');
      no.push('不得单独售卖字体文件', '不得去除版权与许可声明');
    } else if (/梅字体许可|M\+ 位图许可/.test(name)) {
      ok.push('可免费用于商业项目与网页嵌入', '可修改、复制与再分发');
      no.push('无保证');
    } else if (/没有限制/.test(name)) {
      ok.push('可免费用于商业项目与网页嵌入', '可修改与再分发');
      no.push('无保证');
    } else if (/0BSD/i.test(name)) {
      ok.push('可免费用于商业项目与网页嵌入', '可修改与再分发');
      no.push('无保证');
    } else if (tier === '开源' || tier === '开源商用') {
      ok.push('可免费用于商业项目与网页嵌入', '可嵌入网页并再分发（保留许可声明）', '可修改后再分发');
      no.push('不得单独售卖字体文件');
    } else if (tier === '免费商用') {
      ok.push('可免费用于商业项目与网页嵌入', '可用于品牌、电商、海报、界面');
      no.push('不得修改字体文件后再分发', '不得单独售卖字体文件');
      if (!ev.verified) no.push('条款还没核对原文，先看出处');
      if (ev.sourceKind === 'platform') no.push('目前只有素材站声明，不是厂商官网');
    } else if (tier === '个人免费') {
      ok.push('个人非商业用途免费');
      no.push('商业用途需另行授权', '不得衍生与再分发');
    } else if (tier === '需授权') {
      ok.push('取得厂商授权后可按合同范围使用');
      no.push('未授权不得用于任何公开项目', '不得再分发字体文件');
    } else {
      no.push('许可还没核实，用之前先联系厂商');
    }
    (ev.restrictions || []).forEach(function (t) { if (no.indexOf(t) === -1) no.push(t); });
    return { ok: ok, no: no, notes: licenseNotes(font.licenseNotes, ok) };
  }

  function licenseNotes(notes, ok) {
    const text = notes || '';
    if (!text) return '';
    if (/不可修改|不得修改|不能修改/.test(text) && /可修改/.test(ok.join(' '))) return '';
    return text;
  }

  function licenseLead(tier) {
    if (tier === '开源' || tier === '开源商用') return '开源许可，可免费使用、修改与再分发。';
    if (tier === '免费商用') return '可免费用于网页、App、印刷与商业项目。';
    if (tier === '个人免费') return '个人非商业用途免费，商用需另行授权。';
    if (tier === '需授权') return '取得厂商授权后才可公开使用。';
    return '许可还没核对，用之前先联系权利人。';
  }

  /* 出处与依据 · 三节出处链。句子全部由档位/核对态/国标字段按固定句式生成，无手写语句。 */
  var OPEN_LICENSE = /^(SIL Open Font License|OFL|GNU |GPL|Apache|CC0|CC |MIT|0BSD|Ubuntu Font|IPA |Dual license|M\+ )/i;
  var OPEN_AGREEMENTS = { '仓耳字库免费开源字体授权声明': true };
  var TIER_LABEL = { 开源: '开源商用' };
  function tierLabel(tier) { return TIER_LABEL[tier] || tier; }
  function proofTier(font) {
    var n = String(font.licenseName || '');
    if (OPEN_LICENSE.test(n) || OPEN_AGREEMENTS[n]) return '开源';
    var tier = WFChrome.licenseTier(font);
    return tier === '开源商用' ? '开源' : tier;
  }
  function tierSentence(tier) {
    if (tier === '开源' || tier === '开源商用') return '字体以开源许可发布，可免费使用、修改与再分发。';
    if (tier === '免费商用') return '字体向所有个人和组织开放，免费商用。';
    if (tier === '个人免费') return '字体仅个人免费商用。';
    if (tier === '需授权') return '字体需取得权利人授权后方可商用。';
    return '字体授权档位待核实。';
  }
  function ownHost(h) { return /(^|\.)(wenfeng\.org|windfonts\.com)$/i.test(h); }
  function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
  function proofLink(url) {
    const host = hostOf(url);
    if (!host) return '';
    const rel = ownHost(host) ? 'noopener noreferrer' : 'nofollow noopener noreferrer';
    return '<a class="lp-act" href="' + esc(url) + '" target="_blank" rel="' + rel + '">' + esc(host) + ' ↗</a>';
  }
  function proofRow(who, what, when, link, quote) {
    return '<div class="lp5-node"><div class="head"><span class="who">' + esc(who) + '</span>' +
      '<span class="what">' + what + '</span>' +
      (when ? '<span class="when">' + esc(when) + '</span>' : '') +
      (link || '') + '</div>' +
      (quote ? '<div class="sub">「' + esc(quote) + '」</div>' : '') + '</div>';
  }
  /* 厂商信誉行：出处与依据首行先给结论。默认优秀（含知名大厂与开源作者），仅有据事件触发降级。 */
  function vendorTrustHtml(font) {
    const info = font.ownerInfo || font.foundryInfo || {};
    if (!info || !info.id) return '';
    const tr = info.trackRecord;
    let n = 0, vendorWide = false;
    if (tr && Array.isArray(tr.incidents)) {
      tr.incidents.forEach(function (e) {
        if (e.type === '政策保持') return;
        if (e.font && e.font !== font.family) return;
        n += 1;
        if (!e.font) vendorWide = true;
      });
    }
    const grade = n > 0 ? '一般' : '优秀';
    const cls = n > 0 ? 'is-mid' : 'is-good';
    const fname = String(font.name || '');
    const whyLine = n > 0
      ? (vendorWide ? '所属厂商' : '此字体') + '有 ' + n + ' 项授权调整记录'
      : fname + (/[A-Za-z0-9]$/.test(fname) ? ' ' : '') + '自发布以来未发现争议及授权变更记录';
    const claimAct = '<a class="lp-act" href="claim.html?slug=' + encodeURIComponent(info.id) + '">认领主页 →</a>';
    let what = '<span class="trust-grade ' + cls + '">' + esc(grade) + '</span>' +
      '<span class="trust-why">' + esc(whyLine) + '</span>';
    if (info.claimed) what += '<span class="trust-claim">' + WFChrome.icon('check') + '已认领</span>';
    if (tr && tr.siteOk === false) {
      what += '<span class="trust-site">官网失效 · ' + esc(tr.siteCheckedAt || '') + '确认</span>';
    }
    return '<div class="trust-block">' +
      '<div class="lp5-node lp5-meta trust-row"><span class="icon">' + WFChrome.icon('shield') + '</span>' +
      '<div class="head"><span class="who">厂商信誉</span>' +
      '<span class="what">' + what + '</span>' +
      claimAct + '</div></div>' +
      (n > 0 ? '<p class="trust-note">记录仅描述所列字体在所列时间的情况，不代表该厂商全部产品。信息以权利人最新公示为准，如有出入可通过厂商认领页提出更正。</p>' : '') +
      '</div>';
  }

  /* 核对态（服务状态句内从句）：逐款原文 > 标准开源文本 > 出处 > 待核对 */
  function proofVerifyKind(font) {
    if (font.licenseVerified) return '原文';
    const ev = font.licenseEvidence || {};
    if (ev.verified) return ev.sourceKind === 'standard' ? '标准' : '出处';
    return '';
  }

  /* 服务状态三档：正常 / 受限 / 不可用（货架能否托管）。核对态只作句内从句。 */
  function serviceVerifyClause(font) {
    const kind = proofVerifyKind(font);
    if (kind === '原文') return '已核对协议原文';
    if (kind === '标准') return '已核对开源标准许可文本';
    if (kind === '出处') return '已核对许可出处';
    return '协议原文待核对';
  }

  function serviceStatusCopy(font) {
    const ss = (WFProto.serviceStatus && WFProto.serviceStatus(font)) || { status: '受限', reason: 'unverified_tier' };
    const status = ss.status || '受限';
    const reason = ss.reason || '';
    const verify = serviceVerifyClause(font);
    const hostOk = '文风云<sup>&reg;</sup> 提供免费在线字体托管和预览 API 调用服务。';
    /* 受限：统一用「仅预览可用 + 核对态」与授权文件引导。 */
    const hostCert = '文风云<sup>&reg;</sup> 提供字体预览和商业托管，如需使用请先上传授权文件。';
    let why = '';
    let cls = 'is-good';
    if (status === '正常') {
      cls = 'is-good';
      /* 核对态只作从句；pending_proof 仍属正常货架，不推上传证书。 */
      why = '可稳定服务，' + verify + '。' + hostOk;
    } else if (status === '受限') {
      cls = 'is-mid';
      if (reason === 'personal') {
        why = '仅预览可用，仅限个人非商用。' + hostCert;
      } else if (reason === 'no_redistrib') {
        why = '仅预览可用，授权限制再分发。' + hostCert;
      } else {
        why = '仅预览可用，授权档位待核实。' + hostCert;
      }
    } else {
      cls = 'is-bad';
      if (reason === 'retired') {
        why = '已从产品货架下架，目录仅作存档。不再提供托管与预览 API。';
      } else if (reason === 'need_auth') {
        why = '需取得权利人授权后才能用。有授权证书可上传后使用。';
      } else {
        why = '授权不适用或已撤销，本站不提供托管。';
      }
    }
    return { status: status, reason: reason, cls: cls, why: why };
  }

  /* 右侧动作：正常→API 文档；受限 / 需授权→证书开引用页；下架与禁用不推文件。 */
  function serviceStatusAct(font, copy) {
    const status = copy.status;
    const reason = copy.reason || '';
    if (status === '正常') {
      return '<a class="lp-act" href="' + WFChrome.href('docs.html') + '">立即接入 →</a>';
    }
    if (status === '受限' || (status === '不可用' && reason === 'need_auth')) {
      const slug = (WFProto.fontSlug && WFProto.fontSlug(font)) ||
        String((font && (font.normalized || font.family)) || '').replace(/^wenfeng-/i, '');
      const href = WFChrome.href('app/cert-upload.html?cert=' + encodeURIComponent(slug || (font && font.id) || ''));
      const label = (WFProto.certCtaLabel && WFProto.certCtaLabel(font)) || '上传证书';
      return '<a class="lp-act" href="' + href + '">' + esc(label) + ' →</a>';
    }
    return '';
  }

  function proofMetaLine(font) {
    const copy = serviceStatusCopy(font);
    const what = '<span class="svc-grade ' + copy.cls + '">' + esc(copy.status) + '</span>' +
      '<span class="svc-why">' + copy.why + '</span>';
    /* 右侧与厂商信誉同款：仅 lp-act，不渲染 when / verifiedAt 日期。 */
    const act = serviceStatusAct(font, copy);
    return '<div class="lp5-node lp5-meta svc-row"><span class="icon">' + WFChrome.icon('cloud') + '</span>' +
      '<div class="head"><span class="who">服务状态</span>' +
      '<span class="what">' + what + '</span>' +
      act + '</div></div>';
  }


  /* 商业主体：紧挨服务状态下，同款 who+档位+正文 + 右侧合作联系。≠ 版权归属。
     关系档：官方（默认/买断，内部 platform）/ 签约（凡有时限，可附授权至）/ 合作（枚举保留）。≠ 服务状态配色。
     默认文派 + 官方档：档位「官方」+「文派…提供字体平台及技术支持。」；签约/合作保留档位+公司名。 */
  function proofCommercialLine(font) {
    const product = window.WFProducts ? WFProducts.productOf(font) : null;
    const ent = (WFProto.commercialEntity && WFProto.commercialEntity(font, product))
      || { name: '文派（广州）科技有限公司', status: 'platform', label: '官方', expiresAt: '' };
    const name = ent.name || '文派（广州）科技有限公司';
    const status = ent.status || 'platform';
    const label = ent.label || '官方';
    let what;
    if (status === 'platform' && name === '文派（广州）科技有限公司') {
      what = '<span class="entity-grade is-' + esc(status) + '">官方</span>' +
        '<span class="entity-name">文派（广州）科技有限公司 提供字体平台及技术支持。</span>';
    } else {
      what = '<span class="entity-grade is-' + esc(status) + '">' + esc(label) + '</span>' +
        '<span class="entity-name">' + esc(name) + '</span>';
    }
    /* 签约档：有 expiresAt 时附「授权至 YYYY-MM-DD」。合作档本波不挂期限文案。 */
    if (ent.expiresAt && status === 'signed') {
      what += '<span class="entity-exp">授权至 ' + esc(ent.expiresAt) + '</span>';
    }
    /* 右侧 CTA：合作联系 → about.html（公司 + 写信入口，实页）。 */
    const act = '<a class="lp-act" href="' + WFChrome.href('about.html') + '">合作联系 →</a>';
    return '<div class="lp5-node lp5-meta entity-row"><span class="icon">' + WFChrome.icon('idcard') + '</span>' +
      '<div class="head"><span class="who">商业主体</span>' +
      '<span class="what">' + what + '</span>' + act + '</div></div>';
  }

  /* 版权归属：与服务状态同款行；排在商业主体之后、出处链之前。≠ 商业主体。 */
  function proofOwnerLine(font) {
    const owner = font.ownerInfo || font.foundryInfo;
    if (!owner || !owner.id) return '';
    const maker = WFChrome.makerInfo(font);
    const kind = WFChrome.kindLabel(owner) || '权利人';
    let what = '版权归 <b>' + esc(owner.name) + '</b>（' + esc(kind) + '）。';
    if (maker && maker.id && maker.id !== owner.id) {
      what += ' 制作：' + esc(maker.name) + '。';
    }
    return '<div class="lp5-node lp5-meta"><span class="icon">' + WFChrome.icon('building') + '</span>' +
      '<div class="head"><span class="who">版权归属</span>' +
      '<span class="what">' + what + '</span>' +
      (proofLink(owner.website || '') || '') + '</div></div>';
  }

  function proofChainHtml(font) {
    const claim = font.standardClaim || null;
    const kind = proofVerifyKind(font);
    const date = kind === '原文' ? (font.licenseVerifiedAt || '') : '';
    const slug = String(font.family || '').replace(/^wenfeng-/, '');
    const purchase = (proofTier(font) === '需授权' && font.purchaseUrl) ? proofLink(font.purchaseUrl) : '';
    let html = '<div class="lp5-meta-block">' + proofMetaLine(font) + proofCommercialLine(font) + '</div>';
    html += proofOwnerLine(font);
    html += '<div class="lp5-chain">';
    html += proofRow('授权协议', esc(tierSentence(proofTier(font))), date,
      (proofLink(font.licenseUrl) + purchase) || '', font.licenseQuote);
    html += claim
      ? proofRow('国标声明', '厂商声明符合 <b>' + esc(claim.standard) + '</b>。', '', proofLink(claim.url))
      : proofRow('国标声明', '厂商声明未知。', '', '');
    html += proofRow('文风存档', kind === '原文' ? '收录入库并已做原文核对。'
        : kind === '标准' ? '收录入库，按开源标准许可文本核对。'
        : kind === '出处' ? '收录入库，许可出处已核对。'
        : '请自行阅读查看原始授权。', date,
      '<a class="lp-act" href="https://wenfeng.org/font/' + esc(slug) + '" rel="noopener noreferrer">wenfeng.org ↗</a>');
    return html + '</div>';
  }

  /* 厂商有授权变更记录（trackRecord）时出一枚中性徽章链到厂商页，无记录零显示 */
  function trackBadgeHtml(font) {
    const info = font.ownerInfo || font.foundryInfo;
    const tr = info && info.trackRecord;
    if (!tr || !Array.isArray(tr.incidents) || !tr.incidents.length) return '';
    return '<a class="lp-badge lp-badge-warn" href="foundry.html?slug=' + encodeURIComponent(info.id) + '#record">厂商有授权变更记录 →</a>';
  }

  /* 条款徽章也按档位出固定三条，与句子同一张配置表。
   * 开源档追加 RFN 徽章：版权行声明 with Reserved Font Name → 修改版须换名；
   * 已核对且无声明 → 可沿用原名；未核对原文（rfn 缺省）→ 不显示。 */
  function tierPoints(tier, rfn) {
    if (tier === '开源' || tier === '开源商用') {
      const pts = [['ok', '个人与企业免费使用'], ['ok', '可修改与再分发'], ['no', '不得单独售卖字体文件']];
      if (rfn === true) pts.push(['no', '修改版须避开保留字体名']);
      if (rfn === false) pts.push(['ok', '修改版可沿用原名']);
      return pts;
    }
    if (tier === '免费商用') return [['ok', '个人与企业商用免费'], ['no', '修改字体文件'], ['no', '再分发字体文件']];
    if (tier === '个人免费') return [['ok', '个人非商业使用免费'], ['no', '商业使用'], ['no', '再分发字体文件']];
    if (tier === '需授权') return [['ok', '取得授权后按合同使用'], ['no', '未授权公开使用'], ['no', '再分发字体文件']];
    return [];
  }

  function lineageWeight(f) {
    const ws = ((f && f.weights) || []).map(function (n) { return Number(WFProto.weightToCss(n)) || 400; });
    if (!ws.length) return 400;
    return ws.reduce(function (best, n) { return Math.abs(n - 400) < Math.abs(best - 400) ? n : best; }, ws[0]);
  }

  function faceOf(f) {
    const w = lineageWeight(f);
    WFProto.ensureFontCss(f.family, w, 'zh');
    return 'font-family:' + esc(WFProto.cssFamilyStack(f.family)) + ';font-weight:' + w;
  }
  function lineageBodyHtml(font, list) {
    const L = (font && font.lineage) || {};
    const tree = WFChrome.lineageTreeHtml(font, list, faceOf) || '';
    const kinN = WFChrome.lineageKin(list, font).length;
    const open = WFProto.isOpenFont(font);
    const hasStory = !!(tree || L.upstreamName || L.upstreamOwnerInfo ||
      L.relation === 'fork' || L.relation === 'locale' || L.relation === 'original' ||
      (L.group && kinN > 1));
    /* 有上下游/同系，或开源可改时才出谱系块；上传入口只给开源 */
    if (!hasStory && !open) return '';
    const kin = L.group && kinN > 1
      ? '<a class="btn" href="' + WFChrome.href('fonts.html?lineage=' + encodeURIComponent(L.group)) + '">' + WFChrome.icon('compare') + '查看全部同源字</a>'
      : '';
    /* 组织视图 URL 用厂商根 id；派生视图用 fork 字族 group */
    const brandRoots = { alibaba: 1, zcool: 1, qiantu: 1, maoken: 1, pangmen: 1 };
    const deriveGroups = { 'source-han-sans': 1, 'source-han-serif': 1, 'lxgw-wenkai': 1 };
    const legacyBrandGroup = { 'alibaba-sans': 'alibaba' };
    function orgRootFromOwner(oid) {
      if (!oid) return '';
      if (brandRoots[oid]) return oid;
      const fd = WFProto.getFoundryById ? WFProto.getFoundryById(oid) : null;
      if (!fd) return '';
      let cur = fd;
      let guard = 0;
      while (cur && cur.parentId && guard++ < 8) {
        const p = WFProto.getFoundryParent ? WFProto.getFoundryParent(cur) : null;
        if (!p) break;
        cur = p;
      }
      const top = (cur && cur.id) || oid;
      if (brandRoots[top]) return top;
      /* 与 lineage 页一致：有厂商节点即可走组织图；空组织由 canShowOrgLineage 再挡 */
      return top;
    }
    let graphGroup = L.group || '';
    let graphView = 'derive';
    if (graphGroup && legacyBrandGroup[graphGroup]) {
      graphView = 'org';
      graphGroup = legacyBrandGroup[graphGroup];
    } else if (graphGroup && brandRoots[graphGroup]) {
      graphView = 'org';
    } else if (graphGroup && deriveGroups[graphGroup]) {
      graphView = 'derive';
    } else {
      const oid = L.ownerId || (font.ownerInfo && font.ownerInfo.id) || '';
      const orgRoot = orgRootFromOwner(oid);
      if (orgRoot && brandRoots[orgRoot]) {
        graphView = 'org';
        graphGroup = orgRoot;
      } else if (orgRoot && !deriveGroups[graphGroup]) {
        /* 深链单厂商（如胡晓波）：组织视图 */
        graphView = 'org';
        graphGroup = orgRoot;
      }
    }
    /* 组织图入口：归属厂商（含子公司）不足两款则不链到空组织图；能回落到派生组则改 derive */
    if (graphView === 'org' && graphGroup) {
      const orgOk = !WFProto.canShowOrgLineage || WFProto.canShowOrgLineage(graphGroup);
      if (!orgOk) {
        if (L.group && deriveGroups[L.group]) {
          graphView = 'derive';
          graphGroup = L.group;
        } else {
          graphView = 'derive';
          graphGroup = '';
        }
      }
    }
    /* 有组且跳过去有用才给入口；孤儿绝不出仅 focus 的空谱系链接 */
    const split = WFChrome.lineageSplit(font, list);
    const hasRealTree = !!(split.up || (split.downs && split.downs.length) || (split.all && split.all.length > 1));
    let graphHref = '';
    if (graphGroup) {
      const useful = graphView === 'org' || kinN >= 2 || hasRealTree;
      if (useful) {
        graphHref = 'lineage.html?group=' + encodeURIComponent(graphGroup) + '&view=' + graphView +
          '&mode=plex&focus=' + encodeURIComponent(font.id);
      }
    }
    const graph = graphHref
      ? '<a class="btn-text" href="' + WFChrome.href(graphHref) + '" data-lineage-modal>' + WFChrome.icon('branch') + '在谱系图中查看</a>'
      : '';
    const upload = open
      ? '<a class="btn ink-design" href="' + WFChrome.href('app/upload.html?upstream=' + encodeURIComponent(font.id)) + '">' + WFChrome.icon('upload') + '上传你的字体</a>'
      : '';
    const acts = upload || kin || graph
      ? '<div class="lin-acts">' + kin + upload + graph + '</div>'
      : '';
    return tree + acts;
  }

  function render(font) {
    const list = WFProto.getCatalogList();
    const product = window.WFProducts ? WFProducts.productOf(font) : null;
    const member = window.WFProducts ? WFProducts.memberOf(font) : null;
    const titleName = product ? product.name : font.name;
    const titleEn = product ? (product.en || '') : (font.en || '');
    const variantLabel = member ? WFProducts.chipLabel(member) : '';
    document.title = titleName + (variantLabel ? ' · ' + variantLabel : '') + ' · 文风字体';
    const weights = WFSpecimen.sortedWeights(font);
    const stack = WFProto.cssFamilyStack(font.family);
    const w0 = WFSpecimen.firstWeight(font);
    /* 样张行用常用字分包。字符表另拉当前字重的完整分包。 */
    WFProto.ensureFontCss(font.family, w0, 'zh');
    const restWeights = weights.filter(function (w) { return String(w) !== String(w0); });
    if (restWeights.length) {
      const kickWeights = function () {
        restWeights.forEach(function (w) { WFProto.ensureFontCss(font.family, w, 'zh'); });
      };
      if (window.requestIdleCallback) requestIdleCallback(kickWeights, { timeout: 1500 });
      else setTimeout(kickWeights, 600);
    }
    const productSibs = window.WFProducts ? WFProducts.siblings(font) : [];
    /* 单字重文件拆成多档产品（如仓耳 W01–W05）：规格条放样张旁字重位，标题下不再重复 */
    const gradesAsWeights = productSibs.length >= 2 && weights.length <= 1;
    const brand = WFChrome.brandName(font);
    const brandCount = list.filter(function (f) { return WFChrome.brandSlug(f) === WFChrome.brandSlug(font); }).length;
    const maker = WFChrome.makerInfo(font);
    const avatar = WFChrome.brandAvatar(font);
    /* 厂商简介：字典 description 优先（多段取首段做侧栏摘要，全文在厂商页） */
    const brandInfoEntry = WFChrome.brandInfo(font) || {};
    const brandDescRaw = brandInfoEntry.description ||
      ((font.brand && font.brand.description && !/出品的字体$/.test(font.brand.description)) ? font.brand.description : '');
    const brandBriefLine = brandDescBrief(brandInfoEntry, brandDescRaw, font);
    const foundryMoreHref = WFProto.foundryHref(WFChrome.brandSlug(font));
    const user = WFChrome.user();
    const sample = WFSpecimen.PRESETS.filter(function (p) { return p.id === 'poem'; })[0].text;

    // 字体本身的属性两边都给；版本与发布年份仅开发模式。浏览量改放「统计信息」。
    const kv = [
      maker ? { icon: 'palette', dt: '制作方', dd: '<a href="foundry.html?slug=' + encodeURIComponent(maker.id) + '">' + esc(maker.name) + '</a>', html: true } : null,
      { icon: 'classify', dt: '分类', dd: WFChrome.catLabel(font.category) || font.category },
      { icon: 'translate', dt: '语言', dd: (font.languages || []).map(function (l) { return l === '英语' ? '英文' : l; }).join(' · ') },
      { icon: 'calendar', dt: '发布', dd: font.releaseYear ? String(font.releaseYear) : '', dev: true },
      { icon: 'version', dt: '版本', dd: font.version, dev: true },
      { icon: 'text', dt: '字形数', dd: font.glyphCount ? WFProto.formatCount(font.glyphCount) : '' }
    ].filter(function (r) { return r && r.dd; });
    const stats = WFProto.getFontStats(font);
    function statNum(n) {
      return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    const lineageBody = lineageBodyHtml(font, list);
    const lineageSection = lineageBody
      ? '<section class="panel" id="lineage"><div class="panel-head"><h2>' + WFChrome.icon('branch') + '谱系</h2></div>' +
          '<div class="panel-pad">' + lineageBody + '</div></section>'
      : '';
    const wallText = sample || titleName;
    const crumb = '<p class="crumb"><a href="fonts.html">字体库</a><span>/</span>' +
      (font.category ? '<a href="fonts.html?cat=' + encodeURIComponent(font.category) + '">' + esc(WFChrome.catLabel(font.category) || font.category) + '</a><span>/</span>' : '') +
      '<span>' + esc(titleName) + (variantLabel ? ' · ' + esc(variantLabel) : '') + '</span></p>';
    root.innerHTML =
      '<div class="container detail-crumb">' + crumb + '</div>' +
      '<section class="glyph-wall" id="glyphWall"><div class="container glyph-pair"><div class="glyph-wall-inner">' +
        '<div class="studio-body"><div class="tester-templates" id="wallTpl" hidden></div><div class="tester-controls" id="wallCtl" hidden></div><div class="card-view" id="cardView"><div class="wall-stage" id="heroStage" style="--card-face:' + esc(stack) + '">' +
          '<img class="card-bg" data-paint="img" data-slot="bg" alt="" /><div class="card-scrim" data-paint="fill"></div>' +
          '<div class="card-safe" data-guide hidden></div>' +
          '<div class="card-body"><span class="card-quote" aria-hidden="true">「</span><div class="wall" id="hero" contenteditable="true" spellcheck="false" data-placeholder="输入文字" style="font-family:' +
            esc(stack) + ';font-weight:' + w0 + '">' + esc(wallText) + '</div></div>' +
          '<footer class="card-meta"><img class="card-avatar" data-paint="img" data-slot="avatar" alt="" /><span class="card-rule"></span>' +
            '<div class="card-lines"><span class="card-sub" data-slot="sub" contenteditable="true" spellcheck="false" data-placeholder="副文字 / 署名"></span>' +
            '<span class="card-credit"><span class="card-name" data-card-name contenteditable="true" spellcheck="false" data-placeholder="字体名"></span>' +
            '<span class="card-brand" data-card-brand contenteditable="true" spellcheck="false" data-placeholder="品牌"></span><span class="card-mark">文风</span></span></div></footer>' +
        '</div></div></div>' +
        '<div class="wall-tools" id="wallTools">' +
          '<input class="range" type="range" id="heroSize" min="24" max="240" value="64" aria-label="字号" />' +
          '<span class="val" id="heroSizeVal">64px</span>' +
          (gradesAsWeights
            ? '<div class="weights product-grades" role="group" aria-label="规格">' + productSibs.map(function (s) {
                const on = s.font.family === font.family;
                const href = WFChrome.href(WFProto.detailHref(s.font));
                const label = WFProducts.chipLabel(s.meta);
                return '<a href="' + href + '"' + (on ? ' class="is-on" aria-current="page"' : '') + '>' + esc(label) + '</a>';
              }).join('') + '</div>'
            : weights.length > 1
            ? '<div class="weights" role="group" aria-label="字重">' + weights.map(function (w) {
                const c = WFProto.weightToCss(w);
                return '<button type="button" data-w="' + c + '" data-wn="' + esc(w) + '"' + (c === w0 ? ' class="is-on"' : '') + '>' +
                  esc(w) + '<span class="for-dev"> ' + c + '</span></button>';
              }).join('') + '</div>'
            : '') +
          '<span class="spacer"></span>' +
          '<button type="button" class="btn-text" id="btnWallReset" hidden>' + WFChrome.icon('refresh') + '恢复预览</button>' +
          '<button type="button" class="btn-text" id="btnShare" hidden>' + WFChrome.icon('link') + '复制链接</button>' +
          '<button type="button" class="btn-text for-design" id="btnEdit">' + WFChrome.icon('edit') + '编辑样张</button>' +
        '</div>' +
      '</div>' +
      '<div class="detail-title">' +
        '<div class="detail-title-main">' +
          '<h1><span>' + esc(titleName) + '</span>' + WFChrome.favHtml('font', font.id, titleName) +
            (titleEn && titleEn !== titleName ? '<small>' + esc(titleEn) + '</small>' : '') + '</h1>' +
          (gradesAsWeights ? '' : (window.WFProducts ? WFProducts.variantBarHtml(font) : '')) +
          '<p class="dotlist">' +
            '<a class="foundry-inline" href="foundry.html?slug=' + encodeURIComponent(WFChrome.brandSlug(font)) + '">' +
              (avatar ? '<img src="' + esc(avatar) + '" alt="" />' : '') + esc(brand || '未署名') +
              (WFChrome.brandVerified(font) ? WFChrome.VERIFIED_SVG : '') + '</a>' +
            (function () {
              const cols = font.collaboratorInfos || [];
              if (!cols.length) return '';
              return '<span class="dot-collab">' +
                cols.map(function (c) { return WFChrome.partnerFaceHtml(c); }).join('') +
              '</span>';
            })() +
            (variantLabel ? '<span>' + esc(variantLabel) + '</span>' : '') +
            '<span>' + (gradesAsWeights ? (productSibs.length + ' 规格') : (weights.length + ' 字重')) + '</span>' +
            '<span class="lic-chip" data-tier="' + esc(proofTier(font)) + '">' + esc(tierLabel(proofTier(font))) + '</span>' +
            (font.charCount ? '<span>' + WFProto.formatCount(font.charCount) + ' 字</span>' : '') +
          '</p>' +
        '</div>' +
        '<div class="detail-actions">' +
          '<button type="button" class="btn ink-design" id="btnPick" data-join="' + esc(font.id) + '" data-name="' + esc(font.name) + '">' + WFChrome.icon('plus') + '加入选字袋</button>' +
          '<button type="button" class="btn for-design" id="btnUse">' + WFChrome.icon('code') + '获取代码</button>' +
          '<button type="button" class="btn ink-dev for-dev" id="btnPreview">' + WFChrome.icon('eye') + '设计预览</button>' +
        '</div>' +
      '</div></div></section>' +
      '<div class="container">' +
      '<div class="detail-body">' +
        '<div class="detail-main">' +
          '<section class="panel for-dev" id="use"><div class="panel-head"><h2>' + WFChrome.icon('code') + '使用</h2>' +
            '<div class="use-versions" id="versions">' + WFEmbed.VERSIONS.map(function (v) {
              const on = v.id === (WFEmbed.DEFAULT_VERSION || 'zh-common');
              return '<button type="button" class="chip' + (on ? ' is-on' : '') + '" data-version="' + v.id + '" title="' + esc(v.hint) + '">' +
                v.label + ' <span class="n">≈ ' + WFEmbed.fmtBytes(WFEmbed.versionSize(font, v.id)) + '</span></button>';
            }).join('') + '</div></div>' +
            '<div class="panel-pad"><div class="use-cdn">' + WFProto.cdnSwitchHtml() + '</div>' +
            '<div id="fallbackOptions" class="use-fallback-source">' +
            (function () {
              const list = WFProto.getCatalogList();
              const sug = WFChrome.suggestLineageFallback
                ? WFChrome.suggestLineageFallback(font, list)
                : null;
              if (!sug || !sug.font || !sug.font.family) return '';
              const fb = sug.font;
              const deltaHint = (typeof sug.delta === 'number' && sug.delta > 0)
                ? ('约多 ' + WFProto.formatCount(sug.delta) + ' 字 · 同字重 · 仅缺口')
                : '同字重 · 仅缺口';
              return '<label class="use-fallback" id="fallbackLabel">' +
                '<input type="checkbox" id="optFallback" value="' + esc(fb.family) + '"' +
                ' data-fb-name="' + esc(fb.name) + '" data-fb-id="' + esc(fb.id) + '"' +
                ' data-up-name="' + esc(fb.name) + '" data-up-id="' + esc(fb.id) + '"' +
                ' data-fb-role="' + esc(sug.role || '') + '" data-fb-delta="' + esc(String(sug.delta || '')) + '"> ' +
                '用「' + esc(fb.name) + '」补缺字 ' +
                '<span class="hint" id="fallbackHint">' + esc(deltaHint) + '</span></label>';
            })() +
            (function () {
              const pair = (window.WFLocaleFallback && WFLocaleFallback.peerOf)
                ? WFLocaleFallback.peerOf(font.family)
                : null;
              if (!pair || !pair.peer) return '';
              const peerFont = WFProto.getFontBySlug
                ? WFProto.getFontBySlug(String(pair.peer).replace(/^wenfeng-/, ''))
                : null;
              const peerName = (peerFont && peerFont.name) || pair.peer;
              return '<label class="use-fallback" id="localeFallbackLabel">' +
                '<input type="checkbox" id="optLocaleFallback" data-peer="' + esc(pair.peer) + '" data-role="' + esc(pair.role || '') + '"> ' +
                '简繁混排时，带上「' + esc(peerName) + '」补缺字 ' +
                '<span class="hint">只补缺字，不做简繁转换</span></label>';
            })() +
            '</div>' +
            '<div id="embed"></div>' +
            '<p class="use-note use-note-lead">「常用」偏标题与短句，「中文」偏正文。页面用字少时，可到 <a href="' + (user ? 'app/subset.html?font=' + encodeURIComponent(font.id) : 'login.html') + '">子集化工作台</a> 按实际用字缩小包体。</p>' +
            '<details class="use-note-fold"><summary>' + WFChrome.icon('chevron-down') + '参数与补全</summary>' +
              '<p class="use-note use-note-body">勾选补缺或简繁后，上方链接与示例会自动更新；两种都开时，先走谱系补缺。CSS 的 <code>font-family</code> 要写主款与补全款的完整栈。细则见 <a href="docs.html">文档</a>。</p>' +
            '</details></div>' +
          '</section>' +
          (weights.length > 1
            ? '<section class="panel" id="weights"><div class="panel-head"><h2>' + WFChrome.icon('font') + '字重</h2></div>' +
              '<div class="panel-pad weights-sheet" id="sheet">' + WFSpecimen.weightsSheetHtml(font, sample, w0) + '</div></section>'
            : '') +
          '<section class="panel" id="glyphs"><div class="panel-head"><div class="glyph-title"><h2>' + WFChrome.icon('hashtag') + '字符表</h2><div id="glyphQuery"></div></div><div class="glyph-tools" id="glyphTools"></div></div>' +
            '<div class="panel-pad"><div class="glyph-summary" id="glyphSummary" aria-live="polite"></div>' +
            '<div class="glyph-diff for-dev" id="glyphDiff" hidden></div>' +
            '<div class="glyph-live for-dev" id="glyphLive" hidden></div>' +
            '<div class="glyph-blocks" id="glyphBlocks"></div></div></section>' +
          '<section class="panel" id="license"><div class="panel-head"><h2>' + WFChrome.icon('certificate') + '授权</h2>' +
            '<div class="license-head"><span class="lic-chip tier' + (proofTier(font) === '开源' ? ' is-open' : '') + '" data-tier="' + esc(proofTier(font)) + '">' + esc(tierLabel(proofTier(font))) + '</span>' +
              (font.licenseName ? '<span class="name">' + esc(font.licenseName) + '</span>' : '') + '</div></div>' +
            '<div class="panel-pad">' +
            '<p class="license-lead">' + esc(licenseLead(proofTier(font))) + '</p>' +
            '<details class="side-fold license-fold"' +
              (document.documentElement.getAttribute('data-view') === 'dev' ? ' open' : '') +
              '><summary>' + WFChrome.icon('chevron-down') + '出处与依据</summary>' +
              vendorTrustHtml(font) +
              proofChainHtml(font) +
              '<div class="lp5-points">' +
                tierPoints(proofTier(font), font.rfn).map(function (p) {
                  return '<span class="lp-badge">' + (p[0] === 'ok' ? '✓ ' : '× ') + esc(p[1]) + '</span>';
                }).join('') +
                trackBadgeHtml(font) +
              '</div>' +
              '<p class="license-foot">声明为厂商原文摘录，条款以权利人为准。 <a href="license.html">许可类型说明</a></p></details></div>' +
          '</section>' +
          lineageSection +
        '</div>' +
        '<aside class="detail-side" aria-label="字体资料">' +
          '<div class="panel panel-pad side-brand">' +
            '<div class="who-row">' +
              WFChrome.foundryHtml(font, { sub: '在库 ' + brandCount + ' 款' }) +
              WFChrome.favHtml('author', WFChrome.brandSlug(font), brand) +
            '</div>' +
            (function () {
              const cols = font.collaboratorInfos || [];
              if (!cols.length) return '';
              return '<div class="collab-block">' +
                '<h3 class="collab-head">' + WFChrome.icon('user') + '联合作者</h3>' +
                '<div class="partners-list">' +
                  cols.map(function (c) { return WFChrome.partnerFaceHtml(c); }).join('') +
                '</div></div>';
            })() +
            (fontDescBrief(font)
              ? '<div class="font-desc-block"><h3 class="font-desc-head">' + WFChrome.icon('info') + '简介</h3>' +
                '<p class="desc font-desc" id="desc">' + esc(fontDescBrief(font)) + '</p></div>'
              : '') +
            (brandBriefLine
              ? '<details class="side-fold brand-desc-fold"><summary>' + WFChrome.icon('chevron-down') + '厂商 / 品牌</summary>' +
                '<p class="desc brand-desc">' + esc(brandBriefLine) + '</p>' +
                '<p class="brand-desc-more"><a href="' + foundryMoreHref + '">查看更多</a></p></details>'
              : '') +
            (window.WFSponsor ? WFSponsor.html(WFChrome.brandInfo(font)) : '') +
            '<div class="side-meta"><h3>' + WFChrome.icon('info') + '资料</h3><dl class="kv">' + kv.map(function (r) {
              return '<div' + (r.dev ? ' class="for-dev"' : '') + '><dt>' + WFChrome.icon(r.icon) + esc(r.dt) + '</dt><dd' + (!r.html && /^[\d,.\s]+$/.test(r.dd) ? ' class="num"' : '') + '>' +
                (r.html ? r.dd : esc(r.dd)) + '</dd></div>';
            }).join('') + '</dl></div>' +
          '</div>' +
          '<div class="panel panel-pad side-stats" data-font-stats="' + esc(font.id) + '">' +
            '<h3>' + WFChrome.icon('chart') + '统计信息</h3>' +
            '<dl class="kv">' +
              '<div><dt>' + WFChrome.icon('eye') + '浏览</dt><dd class="num" data-stat="views">' + statNum(stats.views) + '</dd></div>' +
              '<div><dt>' + WFChrome.icon('download') + '下载</dt><dd class="num" data-stat="downloads">' + statNum(stats.downloads) + '</dd></div>' +
              '<div class="for-dev"><dt>' + WFChrome.icon('code') + 'API 调用</dt><dd class="num" data-stat="api">' + statNum(stats.api) + '</dd></div>' +
            '</dl>' +
            '<p class="side-stats-note for-dev">下载含样张导出；API 为 CDN CSS 拉取次数（开发 / 厂商可见）。</p>' +
          '</div>' +
          '<div class="panel panel-pad"><h3>' + WFChrome.icon('star') + '标签</h3><div class="chips">' + (font.tags || []).map(function (t) {
            return '<a class="chip" href="fonts.html?tag=' + encodeURIComponent(t) + '">' + esc(t) + '</a>';
          }).concat((font.useCases || []).map(function (t) {
            return '<a class="chip" href="fonts.html?keyword=' + encodeURIComponent(t) + '">' + esc(t) + '</a>';
          })).join('') + '</div></div>' +
        '</aside>' +
      '</div>' +
      '</div>';

    wire(font, weights, w0);
  }

  function wire(font, weights, w0) {
    if (window.WFSponsor) WFSponsor.bind(root);
    const hero = document.getElementById('hero');
    let weight = w0;
    let version = WFEmbed.DEFAULT_VERSION || 'zh-common';
    const fallbackEl = document.getElementById('optFallback');
    const fallbackHint = document.getElementById('fallbackHint');
    const localeEl = document.getElementById('optLocaleFallback');
    const fbDelta = fallbackEl
      ? Number(fallbackEl.getAttribute('data-fb-delta') || '')
      : NaN;
    const upFont = (function () {
      if (!fallbackEl) return null;
      const id = fallbackEl.getAttribute('data-fb-id') || fallbackEl.getAttribute('data-up-id');
      const name = fallbackEl.getAttribute('data-fb-name') || fallbackEl.getAttribute('data-up-name');
      if (id && WFProto.getFont(id)) return WFProto.getFont(id);
      return name ? WFChrome.findFontByName(WFProto.getCatalogList(), name) : null;
    })();
    function fallbackHintOkText() {
      if (typeof fbDelta === 'number' && isFinite(fbDelta) && fbDelta > 0) {
        return '约多 ' + WFProto.formatCount(fbDelta) + ' 字 · 同字重 · 仅缺口';
      }
      return '同字重 · 仅缺口';
    }

    function fallbackAlign() {
      if (!upFont) return null;
      return WFEmbed.alignWeight(font, upFont, weight);
    }

    function syncFallbackUi() {
      if (!fallbackEl || !upFont) return;
      const align = fallbackAlign();
      if (!align) return;
      if (!align.ok) {
        fallbackEl.checked = false;
        fallbackEl.disabled = true;
        if (fallbackHint) {
          fallbackHint.textContent = align.reason || '字重无法对齐';
          fallbackHint.classList.add('is-warn');
        }
      } else {
        fallbackEl.disabled = false;
        if (fallbackHint) {
          fallbackHint.textContent = fallbackHintOkText();
          fallbackHint.classList.remove('is-warn');
        }
      }
    }

    function embedItems() {
      const certGrant = !!(cite && cite.ok && (cite.reason === 'cert-grant' || cite.reason === 'cert-grant-lab'));
      const primary = { family: font.family, weights: [weight], version: version, certGrant: certGrant };
      if (certGrant) return [primary];
      if (fallbackEl && fallbackEl.checked && upFont && !fallbackEl.disabled) {
        const align = fallbackAlign();
        if (align && align.ok) {
          return [{
            family: font.family,
            weights: [weight],
            version: version,
            fallbackFamily: upFont.family,
            fallbackWeight: String(align.weightName).toLowerCase().replace(/[\s-]+/g, '')
          }];
        }
      }
      if (localeEl && localeEl.checked) {
        const peer = localeEl.getAttribute('data-peer') || '';
        return [{
          family: font.family,
          weights: [weight],
          version: version,
          localeFallback: 'auto',
          localePeer: peer
        }];
      }
      return [primary];
    }
    let cite = (WFProto.citeAllowed && WFProto.citeAllowed(font)) || { ok: true, reason: 'ok' };
    function refreshCiteState() {
      cite = (WFProto.citeAllowed && WFProto.citeAllowed(font)) || { ok: true, reason: 'ok' };
    }
    /* cert-grant vault sync */
    const citeReady = (WFProto.syncVaultFontCerts
      ? WFProto.syncVaultFontCerts().catch(function () { return 0; })
      : Promise.resolve(0)).then(function () { refreshCiteState(); });
    const embedRoot = document.getElementById('embed');
    let embed = null;
    function certUploadHref() {
      const slug = (WFProto.fontSlug && WFProto.fontSlug(font)) ||
        String((font && (font.normalized || font.family)) || '').replace(/^wenfeng-/i, '');
      return WFChrome.href('app/cert-upload.html?cert=' + encodeURIComponent(slug || (font && font.id) || ''));
    }
    const fallbackSource = document.getElementById('fallbackOptions');
    function restoreFallbackOptions() {
      if (!fallbackSource) return;
      [document.getElementById('fallbackLabel'), document.getElementById('localeFallbackLabel')]
        .filter(Boolean)
        .forEach(function (label) {
          if (label.parentNode !== fallbackSource) fallbackSource.appendChild(label);
        });
    }
    function placeFallbackOptions() {
      if (!embedRoot) return;
      const host = embedRoot.querySelector('[data-budget]');
      if (!host) return;
      let slot = host.querySelector('[data-budget-options]');
      if (!slot) {
        slot = document.createElement('div');
        slot.className = 'use-fallback-options';
        slot.setAttribute('data-budget-options', '');
        host.appendChild(slot);
      }
      [document.getElementById('fallbackLabel'), document.getElementById('localeFallbackLabel')]
        .filter(Boolean)
        .forEach(function (label) { slot.appendChild(label); });
    }
    function mountOrRefuseEmbed() {
      restoreFallbackOptions();
      if (!embedRoot) return;
      const grant = (WFProto.getCertGrant && WFProto.getCertGrant(font)) || null;
      const gStatus = grant && WFProto.certStatusNorm ? WFProto.certStatusNorm(grant.status) : '';
      const cta = (WFProto.certCtaLabel && WFProto.certCtaLabel(font)) || '上传证书';

      if (!cite.ok) {
        let title = '引用未开放';
        let body = '本款仅供货架对照与站内样张预览。默认不开对外 CSS / CDN 热链。' +
          '若你已持有覆盖网页嵌入的授权证书，可<a href="' + certUploadHref() + '">上传证书</a>，' +
          '审核通过后仅对本账号开引用（不等于全站 CDN）。';
        let boxCls = 'use-cite-closed';
        if (gStatus === 'pending') {
          title = '证书审核中';
          body = '你已提交授权证书，正在等待审核。通过前引用仍关闭；站内样张预览可用。' +
            '可到<a href="' + certUploadHref() + '">证书页</a>查看进度，或用 lab「模拟审核」演示通过/驳回。';
          boxCls = 'use-cite-pending';
        } else if (gStatus === 'rejected') {
          title = '证书未通过';
          body = '上次审核未通过' +
            (grant && grant.reason ? '：' + esc(grant.reason) : '。') +
            ' 请<a href="' + certUploadHref() + '">重新上传</a>覆盖网页嵌入用途的授权证明。' +
            '通过后仅对本账号开引用（不等于全站 CDN）。';
          boxCls = 'use-cite-rejected';
        }
        embedRoot.innerHTML =
          '<div class="' + boxCls + '" role="status">' +
            '<p class="use-cite-title">' + title + '</p>' +
            '<p class="use-cite-body">' + body + '</p>' +
            '<p class="use-cite-meta muted t-13">citeAllowed=false · reason=' + esc(cite.reason || 'no_embed') +
            (gStatus ? ' · grant=' + esc(gStatus) : '') +
            ' · <a href="' + certUploadHref() + '">' + esc(cta) + '</a></p>' +
          '</div>';
        embed = null;
        return;
      }
      const labGrant = cite.reason === 'cert-grant-lab' || cite.reason === 'cert-grant';
      embed = WFEmbed.mount(embedRoot, embedItems(), {
        resolveFont: function (fam) {
          const slug = String(fam || '').replace(/^wenfeng-/, '');
          return WFProto.getFontBySlug(slug) || null;
        }
      });
      placeFallbackOptions();
      if (labGrant) {
        const vaultish = cite.reason === 'cert-grant';
        embedRoot.insertAdjacentHTML('afterbegin',
          '<div class="use-cite-opened" role="status">' +
            '<p class="use-cite-title">本账号已开引用</p>' +
            '<p class="use-cite-body">证书审核已通过' + (vaultish ? '' : '（lab）') +
            '。权记在' + (vaultish ? ' vault（按 API Key × 字体）' : '本浏览器 localStorage（按登录账号 × 本款字体）') +
            '。嵌入地址为账号级 <code>/api/font-certs/css</code>（须 API Key）；' +
            '<strong>不会</strong>打开全局 fonts-packages CDN。站点生产嵌字请加入项目后发布 <code>/p/</code>。</p>' +
            '<p class="use-cite-meta muted t-13">citeAllowed=true · reason=' + esc(cite.reason) +
            ' · <a href="' + certUploadHref() + '">查看证书</a></p></div>');
      }
    }
    citeReady.then(function () { mountOrRefuseEmbed(); });
    function refreshEmbed() {
      syncFallbackUi();
      if (!cite.ok) { mountOrRefuseEmbed(); return; }
      if (embed) embed.setItems(embedItems());
    }
    document.querySelectorAll('[data-version]').forEach(function (b) {
      b.addEventListener('click', function () {
        version = b.getAttribute('data-version');
        document.querySelectorAll('[data-version]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        refreshEmbed();
      });
    });
    if (fallbackEl) {
      syncFallbackUi();
      fallbackEl.addEventListener('change', function () {
        if (fallbackEl.checked) {
          const align = fallbackAlign();
          if (!align || !align.ok) {
            fallbackEl.checked = false;
            WFChrome.toast(align && align.reason ? align.reason : '字重无法对齐，未开启补全');
          } else if (localeEl) {
            localeEl.checked = false;
          }
        }
        refreshEmbed();
      });
    }
    if (localeEl) {
      localeEl.addEventListener('change', function () {
        if (localeEl.checked && fallbackEl) fallbackEl.checked = false;
        refreshEmbed();
      });
    }

    const pick = document.getElementById('btnPick');
    function syncPick() {
      const on = WFProto.hasPick(font.id);
      pick.innerHTML = WFChrome.icon(on ? 'check' : 'plus') + (on ? '已在选字袋' : '加入选字袋');
    }
    pick.addEventListener('click', function () {
      const on = WFProto.hasPick(font.id);
      WFProto.togglePick(font.id, font.name);
      WFChrome.toast(on ? '已从选字袋移除' : '已加入选字袋');
      syncPick();
    });
    syncPick();

    const size = document.getElementById('heroSize');
    const sizeVal = document.getElementById('heroSizeVal');
    const tools = document.getElementById('wallTools');
    let tester;
    let glyphTable;
    size.addEventListener('input', function () {
      hero.style.fontSize = size.value + 'px';
      sizeVal.textContent = size.value + 'px';
      if (tester) tester.sync({ size: Number(size.value) });
    });
    function syncWeightUi() {
      document.querySelectorAll('#wallTools [data-w], #sheet [data-w]').forEach(function (x) {
        const wn = x.getAttribute('data-wn');
        const on = wn
          ? String(WFProto.weightToCss(wn)) === String(weight)
          : x.getAttribute('data-w') === String(weight);
        x.classList.toggle('is-on', on);
      });
    }
    function setWeight(w) {
      const token = w;
      weight = String(WFProto.weightToCss(token));
      WFProto.ensureFontCss(font.family, token, 'zh');
      hero.style.fontWeight = weight;
      refreshEmbed();
      if (tester) tester.sync({ weight: weight });
      if (glyphTable) glyphTable.setWeight(token);
      syncWeightUi();
      paintGlyphDiff();
    }
    document.querySelectorAll('#wallTools [data-w], #sheet [data-w]').forEach(function (b) {
      b.addEventListener('click', function () {
        setWeight(b.getAttribute('data-wn') || b.getAttribute('data-w'));
      });
    });
    function syncTools() {
      sizeVal.textContent = size.value + 'px';
      syncWeightUi();
    }
    hero.addEventListener('input', function () {
      if (hero.classList.contains('is-wall')) return;
      const t = hero.textContent || font.name;
      document.querySelectorAll('[data-weight-line]').forEach(function (n) { n.textContent = t; });
    });
    function applyWallState(s) {
      if (s.size) { size.value = String(Math.round(s.size)); hero.style.fontSize = size.value + 'px'; }
      if (s.weight) {
        weight = String(s.weight);
        if (glyphTable) glyphTable.setWeight(weight);
      }
      syncTools();
    }
    tester = (window.WFTester && typeof WFTester.mount === 'function') ? WFTester.mount({ tpl: document.getElementById('wallTpl'), ctl: document.getElementById('wallCtl'),
      hero: hero,
      stage: document.getElementById('heroStage'),
      view: document.getElementById('cardView'),
      wall: document.getElementById('glyphWall'),
      bar: tools,
      font: font,
      weights: weights,
      weight: weight,
      onWeight: function (w) {
        weight = w;
        refreshEmbed();
        if (glyphTable) glyphTable.setWeight(w);
        syncWeightUi();
        paintGlyphDiff();
      },
      onClose: applyWallState,
      onRestore: applyWallState,
      onCard: function (on) {
        const share = document.getElementById('btnShare');
        const reset = document.getElementById('btnWallReset');
        if (share) share.hidden = !on;
        if (reset) reset.hidden = !on;
      }
    }) : null;
    const btnShare = document.getElementById('btnShare');
    if (btnShare && tester) btnShare.addEventListener('click', function () { tester.share(); });
    const btnReset = document.getElementById('btnWallReset');
    if (btnReset && tester) btnReset.addEventListener('click', function () { tester.clearCard(); });
    const btnEdit = document.getElementById('btnEdit');
    if (btnEdit && tester) {
      var editScrollY;
      btnEdit.addEventListener('mousedown', function () { editScrollY = window.scrollY; }, true);
      btnEdit.addEventListener('click', function () {
        tester.open({ size: Number(size.value), weight: weight, scrollY: editScrollY });
      });
    }
    function goUse() {
      const wasDesign = document.documentElement.getAttribute('data-view') !== 'dev';
      WFChrome.setView('dev');
      if (wasDesign) WFChrome.toast('已切换到开发视图，嵌入代码在下方');
      syncLicenseFold();
      const use = document.getElementById('use');
      if (use) use.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const btnUse = document.getElementById('btnUse');
    if (btnUse) btnUse.addEventListener('click', goUse);
    const btnPreview = document.getElementById('btnPreview');
    if (btnPreview) btnPreview.addEventListener('click', function () {
      WFChrome.setView('design');
      syncLicenseFold();
      const wall = document.getElementById('glyphWall');
      if (wall) wall.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    function syncLicenseFold() {
      const fold = document.querySelector('.license-fold');
      if (!fold) return;
      fold.open = document.documentElement.getAttribute('data-view') === 'dev';
    }
    if (/^#(use|glyphs|lineage)$/.test(location.hash)) WFChrome.setView('dev');
    syncLicenseFold();
    document.querySelectorAll('[data-view-switch] [data-mode]').forEach(function (b) {
      b.addEventListener('click', syncLicenseFold);
    });

    glyphTable = WFSpecimen.mountGlyphTable(
      document.getElementById('glyphBlocks'),
      document.getElementById('glyphSummary'),
      document.getElementById('glyphTools'),
      font,
      weight
    );

    function paintGlyphDiff() {
      const el = document.getElementById('glyphDiff');
      if (!el || !upFont || WFChrome.skipGlyphCov(font)) {
        if (el) el.hidden = true;
        return;
      }
      el.hidden = false;
      el.innerHTML = '<p class="glyph-diff-line is-quiet">正在对比上游「' + esc(upFont.name) + '」覆盖差…</p>';
      const align = fallbackAlign();
      const otherW = (align && align.ok) ? align.weightName : weight;
      WFSpecimen.coverageDiff(font.family, upFont.family, otherW).then(function (diff) {
        if (!diff) {
          el.innerHTML = '<p class="glyph-diff-line is-quiet">暂时无法对比上游覆盖（分包 CSS 未取到）。</p>';
          return;
        }
        const samples = (diff.fillSamples || []).map(function (ch) {
          return '<span class="glyph-diff-ch">' + esc(ch) + '</span>';
        }).join('');
        el.innerHTML =
          '<p class="glyph-diff-line"><b>覆盖差 · 上游「' + esc(upFont.name) + '」</b>' +
            ' · 千字文（简+繁）探测：主款缺、上游有 <b>' + diff.onlyOther + '</b> 字' +
            ' · 两边都有 ' + diff.both +
            ' · 两边都缺 ' + diff.neither +
            (diff.onlyPrimary ? ' · 仅主款有 ' + diff.onlyPrimary : '') +
          '</p>' +
          (diff.onlyOther
            ? '<p class="glyph-diff-samples" title="可被上游补全的样例">' + samples +
              (diff.onlyOther > diff.fillSamples.length ? '<span class="is-quiet">…</span>' : '') + '</p>'
            : '<p class="glyph-diff-line is-quiet">在这组常用字上，上游相对主款没有额外可补字。</p>');
      });
    }
    paintGlyphDiff();

    (function bindLiveAnalysis() {
      const tools = document.getElementById('glyphTools');
      const panel = document.getElementById('glyphLive');
      if (!tools || !panel || !window.WFLive || !WFLive.analysis) return;
      if (tools.querySelector('[data-live-analysis]')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      /* 己：仅开发视图；一击后立刻展开横条，无 fold */
      btn.className = 'gtoggle for-dev';
      btn.setAttribute('data-live-analysis', '');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = '对照表';
      btn.title = '展开 / 收起现网字符对照（vault analysis；无文件则 404；限流回退 OSS）';
      tools.appendChild(btn);
      let liveLoaded = false;
      btn.addEventListener('click', function () {
        if (!panel.hidden) {
          panel.hidden = true;
          btn.setAttribute('aria-expanded', 'false');
          btn.setAttribute('aria-pressed', 'false');
          return;
        }
        panel.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        btn.setAttribute('aria-pressed', 'true');
        if (liveLoaded) return;
        panel.innerHTML = '<p class="glyph-live-note is-quiet">正在对照现网字符分析…</p>';
        btn.disabled = true;
        const upPromise =
          upFont && window.WFLive && !WFChrome.skipGlyphCov(upFont)
            ? WFLive.analysis(upFont)
            : Promise.resolve(null);
        Promise.all([WFLive.analysis(font), upPromise]).then(function (pack) {
          const row = pack[0];
          const upRow = pack[1];
          btn.disabled = false;
          if (!row || row.failed) {
            panel.innerHTML = '<p class="glyph-live-note is-quiet">暂时无法对照现网（网络或限流）。查字仍以本页本地数据为准。</p>';
            liveLoaded = true;
            return;
          }
          if (row.missing) {
            panel.innerHTML =
              '<p class="glyph-live-note is-quiet">现网尚无此款 analysis 文件（normalized=<code>' +
              esc(font.normalized || '') +
              '</code>）。公开站查字继续用本地字符表。</p>';
            liveLoaded = true;
            return;
          }
          const d = row.data || {};
          const liveChars = Number(d.char_count) || 0;
          const liveGlyphs = Number(d.glyph_count) || 0;
          const localChars = Number(font.charCount) || 0;
          const localGlyphs = Number(font.glyphCount) || 0;
          const ranges = d.unicode_ranges && typeof d.unicode_ranges === 'object' ? d.unicode_ranges : null;
          const cjk = ranges ? Number(ranges['CJK Unified Ideographs']) || 0 : 0;
          let upCjk = 0;
          if (upRow && upRow.data && upRow.data.unicode_ranges) {
            upCjk = Number(upRow.data.unicode_ranges['CJK Unified Ideographs']) || 0;
          }
          const src =
            row.source === 'api'
              ? 'vault <code>/api/fonts/…/analysis</code>'
              : 'OSS <code>font-analysis.json</code>' +
                (row.fallbackReason ? '（回退：' + esc(String(row.fallbackReason)) + '）' : '');
          const charDelta = liveChars && localChars ? liveChars - localChars : null;
          const glyphDelta = liveGlyphs && localGlyphs ? liveGlyphs - localGlyphs : null;
          function covPct(need) {
            if (!cjk) return '—';
            return '≈' + Math.round((Math.min(cjk, need) / need) * 100) + '%';
          }
          const face = esc(String(d.name || d.subfamily_name || '—'));
          const covCommon = covPct(3500);
          function cell(k, v) {
            return (
              '<div class="glyph-live-cell"><span class="k">' +
              k +
              '</span><b class="v">' +
              v +
              '</b></div>'
            );
          }
          function fmtDelta(n) {
            /* formatCount maps ≤0 → —; 缺/多需要显示 0 */
            if (n == null || !Number.isFinite(Number(n))) return '—';
            return String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          }
          const miss = charDelta == null ? '—' : fmtDelta(Math.max(0, -charDelta));
          const extra = glyphDelta == null ? '—' : fmtDelta(Math.max(0, glyphDelta));
          let upNote = '';
          if (upFont && upCjk) {
            const delta = upCjk - cjk;
            upNote =
              ' · 相对上游「' +
              esc(upFont.name) +
              '」CJK ' +
              (delta > 0 ? '+' : '') +
              fmtDelta(delta);
          } else if (upFont && upRow && (upRow.missing || upRow.failed)) {
            upNote = ' · 上游 analysis 暂无';
          }
          liveLoaded = true;
          btn.setAttribute('aria-pressed', 'true');
          btn.setAttribute('aria-expanded', 'true');
          function paintPanel(c3500) {
            let exactCell = cell('常用估', covCommon);
            let missHtml = '';
            let noteExtra = '覆盖与缺/多按 analysis 的 CJK / 目录差估算；';
            if (c3500 && c3500.total) {
              exactCell = cell('3500', c3500.hit + '/' + c3500.total);
              noteExtra =
                '常用字 按 CSS unicode-range 逐码点 ' +
                c3500.pct +
                '%（缺 ' +
                (c3500.total - c3500.hit) +
                '）；CJK 估算仅供对照；';
              if (c3500.missSamples && c3500.missSamples.length) {
                missHtml =
                  '<p class="glyph-diff-samples" title="常用字缺字样例">' +
                  c3500.missSamples
                    .map(function (ch) {
                      return '<span class="glyph-diff-ch">' + esc(ch) + '</span>';
                    })
                    .join('') +
                  (c3500.total - c3500.hit > c3500.missSamples.length
                    ? '<span class="is-quiet">…</span>'
                    : '') +
                  '</p>';
              }
            }
            panel.innerHTML =
              '<div class="glyph-live-strip" role="status">' +
              exactCell +
              cell('扩展估', covPct(7000)) +
              cell('缺', miss) +
              cell('多', extra) +
              '</div>' +
              missHtml +
              '<p class="glyph-live-note is-quiet">来源 ' +
              src +
              (face !== '—' ? ' · 字重样例 <code>' + face + '</code>' : '') +
              upNote +
              '。' +
              noteExtra +
              '字符表可切「常用字」通览；千字文上游差见上方。</p>';
          }
          const covP =
            window.WFSpecimen && WFSpecimen.coverCommon3500
              ? WFSpecimen.coverCommon3500(font.family, weight)
              : Promise.resolve(null);
          covP.then(paintPanel).catch(function () {
            paintPanel(null);
          });
        });
      });
    })();

    WFProto.bumpFontStat(font.id, 'views', 1, { once: true });
    WFProto.paintFontStats(root);
    if (window.WFLive) {
      WFLive.counts(font).then(function (row) {
        if (row) WFProto.paintFontStats(root);
      });
    }
    if (!root._wfStatsBound) {
      root._wfStatsBound = true;
      document.addEventListener('wf:stats', function (e) {
        if (e.detail && e.detail.id === font.id) WFProto.paintFontStats(root);
      });
    }

  }

  function slugFromPath() {
    const m = String(location.pathname || '').match(/\/fonts\/([A-Za-z0-9_-]+)\/?$/i);
    return m ? decodeURIComponent(m[1]) : '';
  }

  WFProto.loadCatalog().then(function (list) {
    const go = function () {
      const id = WFProto.getQuery('id');
      const slug = WFProto.getQuery('slug') || slugFromPath();
      const font = (id && WFProto.getFont(id)) || (slug && WFProto.getFontBySlug(slug)) || (!id && !slug ? list[0] : null);
      if (!font) { root.innerHTML = '<p class="empty">未找到该字体。<a href="fonts.html">回到字体库</a></p>'; return; }
      const q = new URLSearchParams(location.search);
      const extras = {};
      ['from', 'view', 'tpl', 'frame', 't', 's'].forEach(function (k) {
        if (q.get(k)) extras[k] = q.get(k);
      });
      /* 空对象也是 truthy，会误走 font-detail.html?slug=；无额外参数时保留 /fonts/{slug} */
      const extraArg = Object.keys(extras).length ? extras : null;
      const want = WFProto.detailHref(font, extraArg) + (location.hash || '');
      const cur = location.pathname + location.search + location.hash;
      if (cur !== want) history.replaceState(null, '', want);
      render(font);
    };
    const boot = function () {
      if (window.WFProducts) WFProducts.load().then(go);
      else go();
    };
    if (window.WFLocaleFallback) WFLocaleFallback.load().then(boot).catch(boot);
    else boot();
  }).catch(function () {
    root.innerHTML = '<p class="empty">字体目录加载失败。<a href="fonts.html">回到字体库</a></p>';
  });
})();
