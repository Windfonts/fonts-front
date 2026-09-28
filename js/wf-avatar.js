/* Cravatar 头像：邮箱 → MD5 → URL。远程图尽量 fetch 成 blob，导出才能画进 canvas；
   没开放跨域的只作预览，请用户改上传。 */
(function () {
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  const K = [];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;

  function hex(x) {
    let s = '';
    for (let i = 0; i < 4; i++) s += ('0' + ((x >>> (i * 8)) & 255).toString(16)).slice(-2);
    return s;
  }

  function md5(str) {
    const bytes = new TextEncoder().encode(String(str));
    const n = bytes.length;
    const words = new Array((((n + 8) >> 6) + 1) * 16).fill(0);
    for (let i = 0; i < n; i++) words[i >> 2] |= bytes[i] << ((i % 4) * 8);
    words[n >> 2] |= 0x80 << ((n % 4) * 8);
    words[words.length - 2] = (n * 8) >>> 0;
    words[words.length - 1] = Math.floor(n / 536870912);
    let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
    for (let off = 0; off < words.length; off += 16) {
      let a = a0, b = b0, c = c0, d = d0;
      for (let i = 0; i < 64; i++) {
        let f, g;
        if (i < 16) { f = (b & c) | (~b & d); g = i; }
        else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
        else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
        else { f = c ^ (b | ~d); g = (7 * i) % 16; }
        const s = S[(i >> 4) * 4 + (i % 4)];
        const t = (a + f + K[i] + words[off + g]) | 0;
        a = d; d = c; c = b;
        b = (b + ((t << s) | (t >>> (32 - s)))) | 0;
      }
      a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0;
    }
    return hex(a0) + hex(b0) + hex(c0) + hex(d0);
  }

  function cravatar(email, size) {
    const e = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return '';
    return 'https://cravatar.com/avatar/' + md5(e) + '?s=' + (size || 240) + '&d=404';
  }

  function isLocal(src) {
    if (/^(blob:|data:)/.test(src || '')) return true;
    try { return new URL(src, location.href).origin === location.origin; } catch (e) { return false; }
  }

  function fileUrl(file) {
    if (!file || !/^image\//.test(file.type)) return '';
    return URL.createObjectURL(file);
  }

  function revoke(el) {
    if (!el) return;
    const u = el.getAttribute('data-blob');
    if (u) URL.revokeObjectURL(u);
    el.removeAttribute('data-blob');
    el.removeAttribute('data-preview-only');
  }

  /* kind: local | blob | preview。preview = 能显示但不能保证导出。 */
  function adopt(src, done) {
    if (!src) { done('', ''); return; }
    if (isLocal(src)) { done(src, 'local'); return; }
    fetch(src, { mode: 'cors', credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error('bad');
      return r.blob();
    }).then(function (blob) {
      if (blob.type && blob.type.indexOf('image/') !== 0) throw new Error('type');
      done(URL.createObjectURL(blob), 'blob');
    }).catch(function () { done(src, 'preview'); });
  }

  window.WFAvatar = { md5: md5, cravatar: cravatar, isLocal: isLocal, fileUrl: fileUrl, revoke: revoke, adopt: adopt };
})();
