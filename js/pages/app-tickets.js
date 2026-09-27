/* 控制台 · T2 工单薄板（Foundry 列：gate/ingest/cdn/…） */
(function () {
  if (!WFApp.gate()) return;
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('root');

  function paint(rows) {
    root.innerHTML =
      '<div class="app-head"><div><h1>工单</h1><p class="sub">跨席状态 · mock JSON · 对齐 Foundry 列</p></div>' +
        '<div class="app-actions"><a class="btn" href="license-query.html">' + WFChrome.icon('shield') + '授权查询</a></div></div>' +
      '<section class="app-section"><div class="table-wrap"><table class="table"><thead><tr>' +
        '<th>ID</th><th>标题</th><th>轨</th><th>gate</th><th>ingest</th><th>cdn</th><th>analysis</th><th>ops</th><th>席</th><th>更新</th>' +
      '</tr></thead><tbody>' +
      (rows || []).map(function (t) {
        return '<tr>' +
          '<td class="mono">' + esc(t.id) + '</td>' +
          '<td>' + esc(t.title) +
            (t.refs && t.refs.font ? '<div class="mono muted">' + esc(t.refs.font) + '</div>' : '') +
          '</td>' +
          '<td>' + esc(t.track || '—') + '</td>' +
          '<td><span class="lq-tag">' + esc(t.gateStatus || '—') + '</span></td>' +
          '<td><span class="lq-tag">' + esc(t.ingestStatus || '—') + '</span></td>' +
          '<td><span class="lq-tag' + (String(t.cdnStatus || '').indexOf('blocked') === 0 ? ' is-flop' : '') + '">' + esc(t.cdnStatus || '—') + '</span></td>' +
          '<td>' + esc(t.analysisStatus || '—') + '</td>' +
          '<td>' + esc(t.opsProbe || '—') + '</td>' +
          '<td>' + esc(t.ownerSeat || '—') + '</td>' +
          '<td class="muted t-13">' + esc((t.updated || '').replace('T', ' ').slice(0, 16)) + '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>' +
      '<p class="hint" style="margin-top:var(--s-4)">真源仍在 research/tickets；本页只读 mock。态迁移校验未做。</p></section>';
  }

  WFApp.load().then(function () {
    return WFApi.listTickets();
  }).then(paint).catch(function (err) {
    root.innerHTML = '<p class="empty">加载失败：' + esc((err && err.message) || String(err)) + '</p>';
  });
})();
