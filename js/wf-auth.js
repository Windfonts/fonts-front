/* 文风字体 · vault NextAuth 会话（同域 /api/auth → fonts-vault）。依赖 wf-chrome。 */
(function () {
  const AUTH_USER_SOURCE = 'vault-nextauth';

  function authOrigin() {
    const host = String(location.hostname || '').toLowerCase();
    if (host === 'app.windfonts.com' || host === 'staging-app.windfonts.com') return '';
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.local')) {
      return ''; /* 本机无 /api/auth 代理时 signIn 会失败，由调用方降级 */
    }
    /* 其它主机（含 vault.）也走当前源，避免跨站丢 cookie */
    return '';
  }

  function url(path) {
    return authOrigin() + path;
  }


  function isProdAppHost() {
    const host = String(location.hostname || '').toLowerCase();
    return host === 'app.windfonts.com' || host === 'staging-app.windfonts.com';
  }

  /** 生产 / 预发：本地壳不够，必须有 vault NextAuth 会话。 */
  function requiresVaultSession() {
    return isProdAppHost();
  }

  function clearOrphanLocalUser() {
    if (!window.WFChrome || !WFChrome.user) return;
    const u = WFChrome.user();
    if (!u) return;
    if (u.source === AUTH_USER_SOURCE) return;
    try { WFChrome.logout(); } catch (e) { /* ignore */ }
  }
  function isLocalHost() {
    const host = String(location.hostname || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.local');
  }

  function fetchJson(path, init) {
    init = init || {};
    const headers = Object.assign({}, init.headers || {});
    return fetch(url(path), Object.assign({ credentials: 'include' }, init, { headers: headers })).then(function (res) {
      return res.text().then(function (text) {
        let body = null;
        try { body = text ? JSON.parse(text) : null; } catch (e) { body = null; }
        return { res: res, body: body, text: text };
      });
    });
  }

  function profileFromSession(session) {
    if (!session || !session.user) return null;
    const u = session.user;
    const role = String(u.role || 'user').toLowerCase();
    return {
      name: String(u.name || '').trim() || String(u.email || '').split('@')[0] || '用户',
      email: String(u.email || '').trim(),
      role: role === 'admin' || role === 'owner' || role === 'editor' ? role : 'user',
      source: AUTH_USER_SOURCE,
      id: u.id ? String(u.id) : undefined
    };
  }

  function applySession(session) {
    const profile = profileFromSession(session);
    if (profile && window.WFChrome && WFChrome.login) {
      WFChrome.login(profile);
    }
    return profile;
  }

  function getSession() {
    return fetchJson('/api/auth/session').then(function (x) {
      if (!x.res.ok) return null;
      if (!x.body || !x.body.user) return null;
      return x.body;
    }).catch(function () { return null; });
  }

  function syncFromVault() {
    return getSession().then(function (session) {
      if (!session) return null;
      return applySession(session);
    });
  }

  function getCsrf() {
    return fetchJson('/api/auth/csrf').then(function (x) {
      if (!x.body || !x.body.csrfToken) throw new Error('无法获取登录令牌');
      return x.body.csrfToken;
    });
  }

  /** @returns {Promise<Record<string, { id: string, name?: string }>>} */
  function listProviders() {
    return fetchJson('/api/auth/providers').then(function (x) {
      if (!x.res.ok || !x.body || typeof x.body !== 'object') return {};
      return x.body;
    }).catch(function () { return {}; });
  }

  /**
   * OAuth 跳转（如 weixiaoduo）。未配置时 /api/auth/providers 无该键。
   * @param {string} providerId
   * @param {string} [callbackUrl]
   */
  function signInOAuth(providerId, callbackUrl) {
    providerId = String(providerId || '').trim();
    if (!providerId) return Promise.reject(new Error('未指定登录方式'));
    const dest = callbackUrl || (location.origin + '/app/index.html');
    return getCsrf().then(function (csrfToken) {
      const body = new URLSearchParams();
      body.set('csrfToken', csrfToken);
      body.set('callbackUrl', dest);
      body.set('json', 'true');
      return fetch(url('/api/auth/signin/' + encodeURIComponent(providerId)), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Auth-Return-Redirect': '1'
        },
        body: body.toString()
      }).then(function (res) {
        return res.json().then(function (data) {
          const redirect = String((data && data.url) || '');
          if (!redirect) throw new Error('无法开始站点登录');
          location.href = redirect;
          return { ok: true, redirect: redirect };
        });
      });
    });
  }

  /**
   * NextAuth Credentials 登录（vault 现为管理员账号；顾客走 signInOAuth）。
   * @returns {Promise<{ ok: boolean, error?: string, profile?: object }>}
   */
  function signIn(username, password) {
    username = String(username || '').trim();
    password = String(password || '');
    if (!username || !password) {
      return Promise.resolve({ ok: false, error: '请输入账号和密码' });
    }
    return getCsrf().then(function (csrfToken) {
      const body = new URLSearchParams();
      body.set('csrfToken', csrfToken);
      body.set('username', username);
      body.set('password', password);
      body.set('callbackUrl', location.origin + (location.pathname.indexOf('/app/') >= 0 ? '/app/index.html' : '/app/index.html'));
      body.set('json', 'true');
      return fetch(url('/api/auth/callback/credentials'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Auth-Return-Redirect': '1'
        },
        body: body.toString()
      }).then(function (res) {
        return res.json().then(function (data) {
          const redirect = String((data && data.url) || '');
          if (/[?&]error=/i.test(redirect)) {
            return { ok: false, error: '账号或密码错误' };
          }
          return syncFromVault().then(function (profile) {
            if (!profile) return { ok: false, error: '登录成功但未拿到会话，请刷新重试' };
            return { ok: true, profile: profile };
          });
        });
      });
    }).catch(function (err) {
      const msg = (err && err.message) || '登录失败';
      if (isLocalHost()) {
        return { ok: false, error: msg + '（本机预览无 vault 会话代理，请到 https://app.windfonts.com/login.html 登录）' };
      }
      return { ok: false, error: msg };
    });
  }

  function signOut() {
    return getCsrf().then(function (csrfToken) {
      const body = new URLSearchParams();
      body.set('csrfToken', csrfToken);
      body.set('callbackUrl', location.origin + '/');
      body.set('json', 'true');
      return fetch(url('/api/auth/signout'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Auth-Return-Redirect': '1'
        },
        body: body.toString()
      }).catch(function () { /* ignore */ });
    }).catch(function () { /* ignore */ });
  }

  /** 用 vault 校验 API 密钥（Bearer）。 */
  function verifyApiKey(key) {
    key = String(key || '').trim();
    if (!key) return Promise.reject(new Error('请填写 API 密钥'));
    const base = (window.WFProto && WFProto.CSS_API) || 'https://vault.windfonts.com';
    return fetch(base + '/api/key/status', {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: 'Bearer ' + key }
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) {
          const msg = (body && body.message) || ('HTTP ' + res.status);
          const err = new Error(msg);
          err.status = res.status;
          err.body = body;
          throw err;
        }
        return body && body.data ? body.data : body;
      });
    });
  }

  /**
   * 会话 → 控制台 API Key（同域 /api/console/ensure-key）。
   * @param {{ apiKey?: string, rotate?: boolean }} [opts]
   * @returns {Promise<{ apiKey: string, created?: boolean, reused?: boolean, restored?: boolean, rotated?: boolean, email?: string }|null>}
   */
  function ensureConsoleKey(opts) {
    opts = opts || {};
    if (isLocalHost() && !isProdAppHost()) {
      /* 本机无会话代理时跳过 */
      return Promise.resolve(null);
    }
    const body = {};
    if (opts.apiKey) body.apiKey = String(opts.apiKey);
    if (opts.rotate) body.rotate = true;
    return fetchJson('/api/console/ensure-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(function (x) {
      if (!x.res.ok || !x.body || x.body.ok === false) {
        const msg =
          (x.body && x.body.error && x.body.error.message) ||
          (x.body && x.body.message) ||
          ('HTTP ' + (x.res && x.res.status));
        const err = new Error(msg);
        err.status = x.res && x.res.status;
        err.body = x.body;
        throw err;
      }
      return (x.body && x.body.data) || null;
    });
  }

  window.WFAuth = {
    getSession: getSession,
    syncFromVault: syncFromVault,
    listProviders: listProviders,
    signIn: signIn,
    signInOAuth: signInOAuth,
    signOut: signOut,
    verifyApiKey: verifyApiKey,
    ensureConsoleKey: ensureConsoleKey,
    isLocalHost: isLocalHost,
    isProdAppHost: isProdAppHost,
    requiresVaultSession: requiresVaultSession,
    clearOrphanLocalUser: clearOrphanLocalUser,
    AUTH_USER_SOURCE: AUTH_USER_SOURCE
  };
})();
