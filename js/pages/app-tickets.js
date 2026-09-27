/* 控制台 · T2 工单薄板（Foundry 列：gate/ingest/cdn/analysis/hotReload/ops/ownerSeat） */
(function () {
  if (!WFApp.gate()) return;
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('root');

  const GATE_LAB = {
    pass_hang: '挂板通过',
    note_only: '仅备注',
    fail: '未过',
    pending: '待审'
  };
  const INGEST_LAB = {
    cataloged: '已编目',
    vaulted: '已入库',
    ingesting: '入仓中',
    pending: '待入仓'
  };
  const CDN_LAB = {
    blocked_flop: '禁 CDN · FLOP',
    blocked_cite: '引用未开',
    uploaded: '已上传',
    pending: '待传',
    'n/a': '—'
  };
  const ANALYSIS_LAB = {
    pending: '待分析',
    merged: '已合并',
    'n/a': '—'
  };
  const OPS_LAB = {
    GREEN: '绿',
    RED: '红',
    'n/a': '—'
  };

  function lab(map, raw) {
    if (raw == null || raw === '') return '—';
    const s = String(raw);
    return map[s] || s;
  }

  function cdnCls(status) {
    const s = String(status || '');
    if (s === 'blocked_flop' || s.indexOf('blocked_flop') === 0) return ' is-flop';
    if (s === 'blocked_cite' || s.indexOf('blocked_cite') === 0) return ' is-cite-block';
    if (s === 'uploaded') return ' is-verified';
    return '';
  }

  function boolChip(v, yesLab, noLab) {
    if (v === true) return '<span class="lq-tag is-verified">' + esc(yesLab || '是') + '</span>';
    if (v === false) return '<span class="lq-tag">' + esc(noLab || '否') + '</span>';
    return '<span class="lq-tag is-cite-block">视原文</span>';
  }

  function licenseMini(t) {
    const L = t.license;
    if (!L) return '—';
    return '<div class="lq-ticket-bools">' +
      boolChip(L.previewOk, '预览', '禁预览') +
      boolChip(L.designOk, '设计', '禁设计') +
      boolChip(L.webfontCdnOk, 'CDN', '禁 CDN') +
      boolChip(L.appEmbedOk, 'App', '禁 App') +
      '</div>';
  }

  function paint(rows) {
    const demoBan = (document.documentElement.getAttribute('data-wf-demo') === '1' || /^(192\.168\.|10\.|127\.|localhost)/i.test(String(location.hostname || '')))
      ? '<div class="wf-mock-banner" role="status">演示预览 · Seeker SoT 样例工单 · 免登（LAN/本机）· 非生产</div>'
      : '';
    root.innerHTML =
      demoBan +
      '<div class="app-head"><div><h1>工单</h1><p class="sub">跨席状态 · Seeker SoT mock · 对齐 Foundry 列</p></div>' +
        '<div class="app-actions"><a class="btn" href="license-query.html">' + WFChrome.icon('shield') + '授权查询</a></div></div>' +
      '<section class="app-section"><div class="table-wrap"><table class="table"><thead><tr>' +
        '<th>编号</th><th>标题</th><th>轨</th>' +
        '<th>闸门</th><th>入仓</th><th>CDN</th>' +
        '<th>分析</th><th>热更</th><th>探活</th><th>主席</th>' +
        '<th>四布尔</th><th>更新</th>' +
      '</tr></thead><tbody>' +
      (rows || []).map(function (t) {
        return '<tr>' +
          '<td class="mono">' + esc(t.id) + '</td>' +
          '<td>' + esc(t.title) +
            (t.refs && t.refs.font ? '<div class="mono muted">' + esc(t.refs.font) + '</div>' : '') +
          '</td>' +
          '<td>' + esc(t.track || '—') + '</td>' +
          '<td><span class="lq-tag">' + esc(lab(GATE_LAB, t.gateStatus)) + '</span></td>' +
          '<td><span class="lq-tag">' + esc(lab(INGEST_LAB, t.ingestStatus)) + '</span></td>' +
          '<td><span class="lq-tag' + cdnCls(t.cdnStatus) + '">' + esc(lab(CDN_LAB, t.cdnStatus)) + '</span></td>' +
          '<td><span class="lq-tag">' + esc(lab(ANALYSIS_LAB, t.analysisStatus)) + '</span></td>' +
          '<td class="mono t-13">' + esc(t.hotReload || '—') + '</td>' +
          '<td><span class="lq-tag' + (String(t.opsProbe) === 'GREEN' ? ' is-verified' : '') + '">' +
            esc(lab(OPS_LAB, t.opsProbe)) + '</span></td>' +
          '<td>' + esc(t.ownerSeat || '—') + '</td>' +
          '<td>' + licenseMini(t) + '</td>' +
          '<td class="muted t-13">' + esc((t.updated || '').replace('T', ' ').slice(0, 16)) + '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>' +
      '<p class="hint" style="margin-top:var(--s-4)">真源：js/mock/tickets.json（Seeker 挂板）。001 FLOP ≠ 002 cite；血红仅 blocked_flop。态迁移校验未做。</p></section>';
  }

  WFApp.load().then(function () {
    return WFApi.listTickets();
  }).then(paint).catch(function (err) {
    root.innerHTML = '<p class="empty">加载失败：' + esc((err && err.message) || String(err)) + '</p>';
  });
})();
