/* 赞助作者。只给字典里标了 tips 的开源作者。没图或图没回来就出占位。依赖 WFChrome。 */
(function () {
  const esc = WFProto.escapeHtml;
  const HOST = 'https://cravatar.com/';
  const META = {
    alipay: { id: 'alipay', label: '支付宝', short: '支付宝' },
    wechat: { id: 'wechat', label: '微信支付', short: '微信' }
  };

  function seedFrom(s) {
    let h = 2166136261;
    String(s || '').split('').forEach(function (c) {
      h ^= c.charCodeAt(0);
      h = Math.imul(h, 16777619);
    });
    return h >>> 0;
  }

  function finder(x, y, ox, oy) {
    const dx = x - ox, dy = y - oy;
    if (dx < 0 || dx > 6 || dy < 0 || dy > 6) return null;
    if (dx === 0 || dx === 6 || dy === 0 || dy === 6) return 1;
    if (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) return 1;
    return 0;
  }

  function qrSvg(seed) {
    const n = 25;
    const cells = [];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const a = finder(x, y, 0, 0);
        const b = finder(x, y, n - 7, 0);
        const c = finder(x, y, 0, n - 7);
        let on = a != null ? a : (b != null ? b : (c != null ? c : 0));
        if (a == null && b == null && c == null) {
          if (x === 6 || y === 6) on = (x + y) % 2 === 0;
          else {
            const h = (seed * 1664525 + x * 101 + y * 37 + x * y * 13) >>> 0;
            on = (h % 100) < 47;
          }
        }
        if (on) cells.push('<rect x="' + x + '" y="' + y + '" width="1" height="1"/>');
      }
    }
    return '<svg class="sp-qr" viewBox="-1.5 -1.5 28 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect x="-1.5" y="-1.5" width="28" height="28" fill="#fff"/>' +
      '<g fill="#111">' + cells.join('') + '</g></svg>';
  }

  function hashOf(info) {
    const raw = (info && info.tips && info.tips.hash) || (info && info.cravatar) || '';
    return /^[a-f0-9]{32}$/i.test(raw) ? raw.toLowerCase() : '';
  }

  function paySrc(info, id) {
    const v = info && info.tips ? info.tips[id] : '';
    if (typeof v === 'string' && /^https?:\/\//i.test(v)) return v;
    const hash = hashOf(info);
    if (v && hash) return 'https://cravatar.cn/qrcode/' + hash + '/' + id + '.png?d=404';
    return '';
  }

  function of(info) {
    const t = info && info.tips;
    if (!t || typeof t !== 'object') return null;
    if (info.kind !== 'author' || !info.openSource) return null;
    const channels = [];
    ['alipay', 'wechat'].forEach(function (id) {
      if (!t[id]) return;
      channels.push(Object.assign({}, META[id], {
        src: paySrc(info, id),
        seed: seedFrom((info.id || '') + id)
      }));
    });
    if (!channels.length) return null;
    return { channels: channels, profile: t.profile || HOST, slug: info.id || '' };
  }

  function claimHref(slug) {
    return slug ? 'claim.html?slug=' + encodeURIComponent(slug) : 'claim.html';
  }

  function hostHtml(profile) {
    return '<p class="sp-host">收款码由 Cravatar 托管，' +
      '<a href="' + esc(profile) + '" target="_blank" rel="noopener noreferrer">前往查看↗</a></p>';
  }

  function emptyHtml(slug) {
    return '<div class="sp-empty"><p class="sp-host">请<a href="' + HOST + '" target="_blank" rel="noopener noreferrer">前往上传</a>，或<a href="' +
      claimHref(slug) + '">认领主页</a>后修改。</p></div>';
  }

  function liveOf(tip, demo) {
    if (demo) return tip.channels;
    return tip.channels.filter(function (c) { return c.src; });
  }

  function qrHtml(ch, demo) {
    if (ch.src) {
      return '<img class="sp-qr" src="' + esc(ch.src) + '" alt="" width="128" height="128" />';
    }
    return demo ? qrSvg(ch.seed) : '';
  }

  function tipHtml(tip, demo) {
    const live = liveOf(tip, demo);
    if (!live.length) return '<div class="sp-tip" data-tip>' + emptyHtml(tip.slug) + '</div>';
    const first = live[0];
    const tabs = live.length < 2 ? '' :
      '<div class="seg view-switch" role="tablist">' + live.map(function (c, i) {
        return '<button type="button" role="tab" data-ch="' + c.id + '"' +
          (c.src ? ' data-src="' + esc(c.src) + '"' : '') +
          ' data-seed="' + c.seed + '"' +
          (i === 0 ? ' class="is-on" aria-selected="true"' : ' aria-selected="false"') +
          '>' + esc(c.short) + '</button>';
      }).join('') + '</div>';
    const cap = live.length < 2 ? '<b>' + esc(first.label) + '</b>' : '';
    return '<div class="sp-tip" data-tip>' + tabs +
      '<div class="sp-code">' + qrHtml(first, demo) + cap + '</div>' +
      hostHtml(tip.profile) + '</div>';
  }

  function html(info, opts) {
    const tip = of(info);
    if (!tip) return '';
    opts = opts || {};
    const demo = !!opts.demo;
    return '<div class="sp-box' + (opts.open ? ' is-open' : '') + '"' +
      (demo ? ' data-demo="1"' : '') +
      (tip.slug ? ' data-slug="' + esc(tip.slug) + '"' : '') + '>' +
      '<button type="button" class="btn" data-toggle aria-expanded="' + (opts.open ? 'true' : 'false') + '">' +
        WFChrome.icon('gift') + '赞助作者</button>' +
      tipHtml(tip, demo) + '</div>';
  }

  function watchQr(box) {
    const tip = box.querySelector('[data-tip]');
    if (!tip || box.getAttribute('data-demo')) return;
    tip.querySelectorAll('img.sp-qr').forEach(function (img) {
      if (img.getAttribute('data-watch')) return;
      img.setAttribute('data-watch', '1');
      function fail() {
        const on = tip.querySelector('[data-ch].is-on');
        if (on) on.removeAttribute('data-src');
        const next = Array.prototype.filter.call(tip.querySelectorAll('[data-ch]'), function (tab) {
          return tab.getAttribute('data-src');
        })[0];
        if (next) {
          next.click();
          return;
        }
        tip.innerHTML = emptyHtml(box.getAttribute('data-slug') || '');
      }
      img.addEventListener('error', fail);
      if (img.complete && !img.naturalWidth) fail();
    });
  }

  function bind(root) {
    if (!root) return;
    root.querySelectorAll('.sp-box').forEach(function (box) {
      if (box.getAttribute('data-wired')) return;
      box.setAttribute('data-wired', '1');
      const demo = box.getAttribute('data-demo') === '1';
      const btn = box.querySelector('[data-toggle]');
      if (btn) {
        btn.addEventListener('click', function () {
          const on = !box.classList.contains('is-open');
          box.classList.toggle('is-open', on);
          btn.setAttribute('aria-expanded', on ? 'true' : 'false');
        });
      }
      const tip = box.querySelector('[data-tip]');
      if (!tip) return;
      tip.addEventListener('click', function (e) {
        const tab = e.target.closest('[data-ch]');
        if (!tab || !tip.contains(tab)) return;
        tip.querySelectorAll('[data-ch]').forEach(function (x) {
          x.classList.toggle('is-on', x === tab);
          x.setAttribute('aria-selected', x === tab ? 'true' : 'false');
        });
        const code = tip.querySelector('.sp-code');
        if (!code) return;
        code.innerHTML = qrHtml({
          src: tab.getAttribute('data-src') || '',
          seed: Number(tab.getAttribute('data-seed')) || 0
        }, demo);
        watchQr(box);
      });
      watchQr(box);
    });
  }

  window.WFSponsor = { of: of, html: html, bind: bind };
})();
