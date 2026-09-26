/* 简繁 localeFallback 配对表（构建期 data/locale-fallback-pairs.json） */
(function () {
  var data = null;
  var loading = null;

  function load() {
    if (data) return Promise.resolve(data);
    if (loading) return loading;
    loading = fetch((window.WFProto && WFProto.dataUrl) ? WFProto.dataUrl('locale-fallback-pairs.json?v=20260926syhttc') : 'data/locale-fallback-pairs.json?v=20260926syhttc', { cache: 'force-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(function (j) {
        data = j || { byFamily: {}, pairs: [] };
        return data;
      })
      .catch(function () {
        data = { byFamily: {}, pairs: [] };
        return data;
      });
    return loading;
  }

  function peerOf(family) {
    if (!data || !data.byFamily || !family) return null;
    return data.byFamily[family] || data.byFamily[String(family).toLowerCase()] || null;
  }

  window.WFLocaleFallback = { load: load, peerOf: peerOf };
})();
