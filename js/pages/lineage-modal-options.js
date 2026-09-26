/* 谱系模态外壳对照。本地打开变体，不改 WFChrome.openLineageModal 默认。 */
(function () {
  const EMBED =
    'lineage.html?group=source-han-sans&view=derive&mode=plex&embed=1&focus=82dd541b-10c1-47ff-a148-764de20e53fa';
  const LAB_ID = 'wfLineageModalLab';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function closeIcon() {
    if (window.WFChrome && typeof WFChrome.icon === 'function') {
      return WFChrome.icon('close');
    }
    return '×';
  }

  function resolveSrc() {
    if (window.WFChrome && typeof WFChrome.href === 'function') {
      return WFChrome.href(EMBED);
    }
    return EMBED;
  }

  function openLabVariant(key) {
    const prev = document.getElementById(LAB_ID);
    if (prev) prev.remove();

    const src = resolveSrc();
    const isC = key === 'c';
    const wrap = document.createElement('div');
    wrap.id = LAB_ID;
    wrap.className = 'dialog-back dialog-back-lineage is-opt-' + key;
    wrap.setAttribute('data-lab-variant', key);

    const head = isC
      ? ''
      : '<div class="dialog-lineage-head">' +
          '<h3 id="wfLineageModalLabTitle">谱系图</h3>' +
          '<button type="button" class="icon-btn dialog-lineage-close" data-close aria-label="关闭">' +
            closeIcon() +
          '</button>' +
        '</div>';

    const floatClose = isC
      ? '<button type="button" class="icon-btn dialog-lineage-close-float" data-close aria-label="关闭">' +
          closeIcon() +
        '</button>'
      : '';

    wrap.innerHTML =
      '<div class="dialog dialog-lineage is-opt-' + key + '" role="dialog" aria-modal="true"' +
        (isC ? '' : ' aria-labelledby="wfLineageModalLabTitle"') +
        ' aria-label="谱系图">' +
        head +
        floatClose +
        '<iframe class="dialog-lineage-frame" title="谱系图" src="' + esc(src) + '"></iframe>' +
      '</div>';

    document.body.appendChild(wrap);
    const dialog = wrap.querySelector('.dialog-lineage');
    const closeBtn = wrap.querySelector('[data-close]');
    const frame = wrap.querySelector('iframe');
    const prior = document.activeElement;
    document.body.style.overflow = 'hidden';

    let closed = false;
    const done = function () {
      if (closed) return;
      closed = true;
      wrap.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('message', onMsg);
      if (prior && prior.focus) prior.focus();
    };
    const onKey = function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        done();
        return;
      }
      if (e.key !== 'Tab' || !closeBtn) return;
      const nodes = [closeBtn, frame];
      const i = nodes.indexOf(document.activeElement);
      e.preventDefault();
      const next = e.shiftKey
        ? i <= 0
          ? nodes.length - 1
          : i - 1
        : i === nodes.length - 1 || i < 0
          ? 0
          : i + 1;
      nodes[next].focus();
    };
    const onMsg = function (e) {
      if (!e || !e.data || e.data.type !== 'wf-lineage-embed-close') return;
      if (frame && e.source && e.source !== frame.contentWindow) return;
      done();
    };

    if (closeBtn) closeBtn.addEventListener('click', done);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) done();
    });
    document.addEventListener('keydown', onKey);
    window.addEventListener('message', onMsg);
    if (closeBtn) closeBtn.focus();
    else if (dialog) dialog.focus();
  }

  document.querySelectorAll('[data-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openLabVariant(btn.getAttribute('data-open'));
    });
  });
})();
