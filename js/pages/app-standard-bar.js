/* 控制台 · T3 标准棒只读卡 + FLOP 预检（mock，不做真实 CSS 403） */
(function () {
  if (!WFApp.gate()) return;
  const esc = WFProto.escapeHtml;
  const root = document.getElementById('root');
  let font = WFProto.getQuery('font') || 'Ibmps';
  const choices = ['Ibmps', 'Ckbf', 'SmartFontUI', 'Xwszh', 'Jlyhmht'];

  function paint(bar, flop) {
    const flopBad = !!(flop && flop.cdn_forbidden);
    // One「立即接入」only: on result card when bar exists; else on flop card when FLOP-only.
    const connectOnBar = !!bar;
    const connectOnFlop = flopBad && !bar;
    root.innerHTML =
      '<div class="app-head"><div><h1>标准棒</h1><p class="sub">cn-font-split 结果只读卡 · FLOP 预检 · mock</p></div>' +
        '<div class="app-actions"><a class="btn" href="license-query.html?font=' + encodeURIComponent(font) + '">' + WFChrome.icon('shield') + '授权查询</a></div></div>' +
      '<section class="app-section"><div class="field"><label for="sbFont">字体</label>' +
        '<select class="select" id="sbFont">' + choices.map(function (c) {
          return '<option' + (c === font ? ' selected' : '') + '>' + c + '</option>';
        }).join('') + '</select></div></section>' +
      (flopBad
        ? '<section class="app-section lq-flop-card"><div class="lq-flop-badge">FLOP · 禁 webfont</div>' +
          '<p class="lq-headline">' + esc(flop.reason_label || '协议禁止网页字体分发') + '</p>' +
          '<p class="hint">边缘将拒绝网页字体分发 · 接入已禁用 · 本页不实现真实 CSS 拦截。</p>' +
          (connectOnFlop
            ? '<p><button type="button" class="btn is-blocked" disabled>' + WFChrome.icon('close') + '立即接入</button>' +
              '<span class="hint" style="margin-left:var(--s-3)">FLOP 硬拒，无法接入</span></p>'
            : '') +
          '</section>'
        : '') +
      (bar
        ? '<section class="app-section"><h2>结果卡 · ' + esc(bar.font) + '</h2>' +
          '<dl class="kv" style="max-width:40rem">' +
            '<div><dt>ticket</dt><dd class="mono">' + esc(bar.ticket_id || '—') + '</dd></div>' +
            '<div><dt>matrix</dt><dd>' + esc((bar.matrix || []).join(' · ')) + '</dd></div>' +
            '<div><dt>split_status</dt><dd><span class="lq-tag">' + esc(bar.split_status) + '</span></dd></div>' +
            '<div><dt>oss_prefix</dt><dd class="mono">' + esc(bar.oss_prefix || '—') + '</dd></div>' +
            '<div><dt>css_family</dt><dd class="mono">' + esc(bar.css_family || '—') + '</dd></div>' +
            '<div><dt>tip</dt><dd class="mono">' + esc(bar.tip || '—') + '</dd></div>' +
            '<div><dt>oss_metadata_version</dt><dd class="mono">' + esc(bar.oss_metadata_version || '—') + '</dd></div>' +
          '</dl>' +
          ((bar.notes || []).length ? '<ul class="lq-warn" style="margin-top:var(--s-4)">' + bar.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '') +
          (connectOnBar
            ? '<p style="margin-top:var(--s-5)"><button type="button" class="btn' + (flopBad ? ' is-blocked' : ' btn-ink') + '" id="sbConnect"' + (flopBad ? ' disabled' : '') + '>' +
                (flopBad ? WFChrome.icon('close') : WFChrome.icon('rocket')) + '立即接入</button>' +
                (flopBad ? '<span class="hint" style="margin-left:var(--s-3)">FLOP 硬拒，无法接入</span>' : '') +
              '</p>'
            : '') +
          '</section>'
        : '<section class="app-section"><p class="empty">无标准棒记录（mock 仅 Ibmps / Ckbf / SmartFontUI）。</p></section>');

    document.getElementById('sbFont').addEventListener('change', function (e) {
      font = e.target.value;
      load();
    });
    const btn = document.getElementById('sbConnect');
    if (btn && !flopBad) btn.addEventListener('click', function () { WFChrome.toast('演示接入（mock）'); });
  }

  function load() {
    Promise.all([
      WFApi.getStandardBar(font).catch(function () { return null; }),
      WFApi.flopPrecheck(font)
    ]).then(function (pair) { paint(pair[0], pair[1]); });
  }

  WFApp.load().then(load);
})();
