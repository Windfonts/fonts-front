/* 现网 app.windfonts.com 单款读取。只在详情页按字体请求一次，6 小时内复用。失败保持本地数字。 */
(function () {
  var ORIGIN = 'https://app.windfonts.com';
  var TTL = 6 * 60 * 60 * 1000;
  var KEY = 'wf-live-counts';

  function readMap() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function writeMap(map) {
    try { sessionStorage.setItem(KEY, JSON.stringify(map)); } catch (e) { /* ignore */ }
  }
  function apply(font, row) {
    if (!font || !row || row.failed) return;
    font.viewCount = row.views;
    font.downloadCount = row.downloads;
    font.apiCount = row.api;
    font._liveStats = true;
  }
  function familyOf(font) {
    return String((font && (font.family || font.fontFamily)) || '').trim();
  }
  function counts(font) {
    var family = familyOf(font);
    if (!family) return Promise.resolve(null);
    try {
      if (sessionStorage.getItem('wf-live-off') === '1') return Promise.resolve(null);
    } catch (e) { /* ignore */ }
    var map = readMap();
    var hit = map[family];
    var fresh = hit && Date.now() - hit.at < (hit.failed ? 10 * 60 * 1000 : TTL);
    if (fresh) {
      if (hit.failed) return Promise.resolve(null);
      apply(font, hit);
      return Promise.resolve(hit);
    }
    function remember(row) {
      map[family] = row;
      writeMap(map);
      return row.failed ? null : row;
    }
    return fetch(ORIGIN + '/api/fonts/' + encodeURIComponent(family), { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (body) {
        var data = body && body.code === 200 ? body.data : null;
        if (!data) return remember({ failed: true, at: Date.now() });
        var row = {
          views: Number(data.viewCount) || 0,
          downloads: Number(data.downloadCount) || 0,
          api: Number(data.apiCallCount) || 0,
          at: Date.now()
        };
        apply(font, row);
        return remember(row);
      })
      .catch(function () {
        try { sessionStorage.setItem('wf-live-off', '1'); } catch (e) { /* ignore */ }
        return remember({ failed: true, at: Date.now() });
      });
  }

  window.WFLive = { origin: ORIGIN, counts: counts };
})();
