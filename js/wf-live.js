/* 现网 app.windfonts.com 单款读取。详情页按需请求；失败保持本地。 */
(function () {
  var ORIGIN = 'https://app.windfonts.com';
  var META = 'https://cn.windfonts.com/fonts-packages/metadata/font-analysis.json';
  var TTL = 6 * 60 * 60 * 1000;
  var KEY = 'wf-live-counts';
  var KEY_A = 'wf-live-analysis';

  function readMap(key) {
    try { return JSON.parse(sessionStorage.getItem(key) || '{}') || {}; } catch (e) { return {}; }
  }
  function writeMap(key, map) {
    try { sessionStorage.setItem(key, JSON.stringify(map)); } catch (e) { /* ignore */ }
  }
  function apply(font, row) {
    if (!font || !row || row.failed) return;
    font.viewCount = row.views;
    font.downloadCount = row.downloads;
    font.apiCount = row.api;
    font.apiCallCount = row.api;
    font._liveStats = true;
  }
  function familyOf(font) {
    return String((font && (font.family || font.fontFamily)) || '').trim();
  }
  function normalizedOf(font) {
    return String((font && (font.normalized || font.normalizedName)) || '').trim();
  }
  function liveOff() {
    try { return sessionStorage.getItem('wf-live-off') === '1'; } catch (e) { return false; }
  }
  function markLiveOff() {
    try { sessionStorage.setItem('wf-live-off', '1'); } catch (e) { /* ignore */ }
  }

  function counts(font) {
    var family = familyOf(font);
    if (!family) return Promise.resolve(null);
    if (liveOff()) return Promise.resolve(null);
    var map = readMap(KEY);
    var hit = map[family];
    var fresh = hit && Date.now() - hit.at < (hit.failed ? 10 * 60 * 1000 : TTL);
    if (fresh) {
      if (hit.failed) return Promise.resolve(null);
      apply(font, hit);
      return Promise.resolve(hit);
    }
    function remember(row) {
      map[family] = row;
      writeMap(KEY, map);
      return row.failed ? null : row;
    }
    return fetch(ORIGIN + '/api/fonts/' + encodeURIComponent(family), { method: 'GET' })
      .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, status: r.status, body: body }; }); })
      .then(function (pack) {
        var data = pack.body && pack.body.code === 200 ? pack.body.data : null;
        if (!data) return remember({ failed: true, at: Date.now(), status: pack.status });
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
        markLiveOff();
        return remember({ failed: true, at: Date.now() });
      });
  }

  /** 从整包 analysis JSON 里抽出单款（与 vault SyncService 同结构） */
  function pickFromBundle(bundle, normalized) {
    if (!bundle || !Array.isArray(bundle.fonts) || !normalized) return null;
    var fontData = null;
    for (var i = 0; i < bundle.fonts.length; i++) {
      if (bundle.fonts[i] && bundle.fonts[i].name === normalized) {
        fontData = bundle.fonts[i];
        break;
      }
    }
    if (!fontData) return null;
    if (Array.isArray(fontData.children) && fontData.children.length) {
      return fontData.children[0];
    }
    return fontData;
  }

  function analysisFromMeta(normalized) {
    return fetch(META, { method: 'GET' })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(function (bundle) {
        var row = pickFromBundle(bundle, normalized);
        if (!row) return { missing: true, source: 'meta' };
        return { data: row, source: 'meta' };
      });
  }

  /**
   * 按需对照现网字符分析。优先 vault API（normalizedName）；
   * 404 / 429 / 网络失败时回退同源 OSS metadata（与 vault 同源文件）。
   */
  function analysis(font) {
    var normalized = normalizedOf(font);
    if (!normalized) {
      return Promise.resolve({ missing: true, reason: 'no-normalized' });
    }
    var map = readMap(KEY_A);
    var hit = map[normalized];
    var fresh = hit && Date.now() - hit.at < (hit.failed || hit.missing ? 30 * 60 * 1000 : TTL);
    if (fresh) return Promise.resolve(hit);

    function remember(row) {
      row.at = Date.now();
      map[normalized] = row;
      writeMap(KEY_A, map);
      return row;
    }

    function viaMeta(reason) {
      return analysisFromMeta(normalized)
        .then(function (row) {
          row.fallbackReason = reason;
          return remember(row);
        })
        .catch(function () {
          return remember({ failed: true, reason: reason || 'meta-fail' });
        });
    }

    if (liveOff()) return viaMeta('live-off');

    return fetch(ORIGIN + '/api/fonts/' + encodeURIComponent(normalized) + '/analysis', { method: 'GET' })
      .then(function (r) {
        return r.json().then(function (body) {
          return { ok: r.ok, status: r.status, body: body };
        });
      })
      .then(function (pack) {
        if (pack.body && pack.body.code === 200 && pack.body.data) {
          return remember({ data: pack.body.data, source: 'api' });
        }
        if (pack.status === 404 || (pack.body && pack.body.code === 404)) {
          return remember({ missing: true, source: 'api' });
        }
        /* 429 / 其它 → 同源 metadata */
        return viaMeta(pack.status === 429 ? 'rate_limited' : 'api-' + pack.status);
      })
      .catch(function () {
        return viaMeta('network');
      });
  }

  window.WFLive = { origin: ORIGIN, counts: counts, analysis: analysis };
})();
