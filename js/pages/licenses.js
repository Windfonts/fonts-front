/* 许可类型对照 · GET /api/licenses mock */
(function () {
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('licRoot');
  if (!root) return;

  function cell(v) {
    if (v === true) return '<span class="lq-bool is-ok">可以</span>';
    if (v === false) return '<span class="lq-bool is-no">不可以</span>';
    return '<span class="lq-bool is-uncertain">视原文</span>';
  }

  WFApi.listLicenses().then(function (data) {
    const types = data.types || [];
    const seeds = data.seeds || [];
    root.innerHTML =
      '<section id="types"><h2>类型 × 四布尔默认</h2>' +
        '<div class="table-wrap"><table class="table lq-type-table"><thead><tr>' +
          '<th>类型</th><th>说明</th><th>预览</th><th>设计稿</th><th>网页 CDN</th><th>App 内置</th>' +
        '</tr></thead><tbody>' +
        types.map(function (t) {
          return '<tr><td><b>' + esc(t.label) + '</b><div class="mono muted">' + esc(t.id) + '</div></td>' +
            '<td>' + esc(t.summary) + '</td>' +
            '<td>' + cell(t.previewOk) + '</td><td>' + cell(t.designOk) + '</td>' +
            '<td>' + cell(t.webfontCdnOk) + '</td><td>' + cell(t.appEmbedOk) + '</td></tr>';
        }).join('') +
        '</tbody></table></div>' +
        '<p class="hint">旧草案 commercial_use / cdn_embed / modification / redistribution 已废止。</p></section>' +
      '<section id="seeds"><h2>Mock 种子样例</h2><ul class="lq-seed-list">' +
        seeds.map(function (s) {
          return '<li><a href="license-query.html?font=' + encodeURIComponent(s.normalizedName) + '"><strong>' + esc(s.name) + '</strong></a>' +
            ' <span class="mono muted">' + esc(s.normalizedName) + '</span>' +
            ' · ' + esc(s.license_label) +
            (s.cdnHardBlock ? ' · <span class="lq-tag is-flop">FLOP</span>' : '') +
            (s.cite_policy === 'cite_closed' ? ' · cite-closed' : '') +
            (!s.license_verified ? ' · 待核实' : '') +
            '</li>';
        }).join('') + '</ul></section>' +
      '<section><h2>使用注意</h2><ul>' +
        '<li>每款字以字体页出处为准；没有原文链接的不要当成已经核实。</li>' +
        '<li>cite-closed（如吉利 / 摩登）：证书只开账号引用，不开公共 CDN。</li>' +
        '<li>FLOP（如 SmartFontUI）：协议禁 webfont，cta=blocked，证书不能开公共 CDN。</li>' +
        '<li>更完整说明见 <a href="license.html">许可说明</a>。</li></ul></section>';
  }).catch(function (err) {
    root.innerHTML = '<p class="empty">加载失败：' + esc((err && err.message) || String(err)) + '</p>';
  });
})();
