/**
 * Session + authenticated JSON API for the admin SPA.
 */
(function (global) {
  'use strict';

  var SESSION_KEY = 'weino_admin_session_v2';
  var TOKEN_KEY = 'weino_admin_bearer_token';
  var API_BASE_STORE = 'weino_admin_api_base';
  var DEFAULT_API = 'https://us-central1-matchyto.cloudfunctions.net/api/v1';

  function normalizeBase(url) {
    if (!url || typeof url !== 'string') return DEFAULT_API;
    var u = url.trim().replace(/\/+$/, '');
    return u || DEFAULT_API;
  }

  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || typeof o.token !== 'string' || !o.token.trim()) return null;
      o.apiBase = normalizeBase(o.apiBase || localStorage.getItem(API_BASE_STORE) || DEFAULT_API);
      o.token = o.token.trim();
      if (!Array.isArray(o.permissions)) o.permissions = [];
      if (!Array.isArray(o.roles)) o.roles = [];
      return o;
    } catch (_) {
      return null;
    }
  }

  function saveSession(data) {
    var payload = {
      apiBase: normalizeBase(data.apiBase),
      token: String(data.token || '').trim(),
      username: data.username || '',
      role: data.role || '',
      roles: Array.isArray(data.roles) ? data.roles : [],
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    localStorage.setItem(API_BASE_STORE, payload.apiBase);
    try {
      localStorage.setItem(TOKEN_KEY, payload.token);
    } catch (_) {}
    return payload;
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }

  function extractErr(json) {
    if (typeof global.extractApiErrorMessage === 'function') {
      var m = global.extractApiErrorMessage(json);
      if (m) return m;
    }
    if (json && json.error && typeof json.error.message === 'string') return json.error.message.trim();
    if (json && typeof json.message === 'string') return json.message.trim();
    return null;
  }

  /**
   * @param {string} method
   * @param {string} path - e.g. /admin/stats
   * @param {{ body?: object, skipAuth?: boolean, apiBase?: string }} [opts]
   */
  async function adminFetch(method, path, opts) {
    opts = opts || {};
    var skipAuth = !!opts.skipAuth;
    var sess = skipAuth ? null : loadSession();
    if (!skipAuth && (!sess || !sess.token)) {
      return { ok: false, status: 401, json: null, error: 'Not signed in' };
    }
    var base = skipAuth ? normalizeBase(opts.apiBase || DEFAULT_API) : sess.apiBase;
    var p = path.charAt(0) === '/' ? path : '/' + path;
    var url = base + p;
    var headers = { Accept: 'application/json' };
    if (!skipAuth) headers.Authorization = 'Bearer ' + sess.token;
    var init = { method: method, headers: headers };
    if (opts.body != null && method !== 'GET' && method !== 'HEAD') {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    var res;
    try {
      res = await fetch(url, init);
    } catch (e) {
      return { ok: false, status: 0, json: null, error: (e && e.message) ? String(e.message) : 'Network error' };
    }
    var ct = (res.headers.get('content-type') || '').toLowerCase();
    var json = null;
    if (ct.indexOf('json') !== -1) {
      try {
        json = await res.json();
      } catch (_) {
        json = null;
      }
    } else if (!res.ok) {
      try {
        var t = await res.text();
        json = t ? { message: t.slice(0, 800) } : null;
      } catch (_) {
        json = null;
      }
    }
    if (!res.ok) {
      var err = json ? extractErr(json) : null;
      return { ok: false, status: res.status, json: json, error: err || 'HTTP ' + res.status };
    }
    return { ok: true, status: res.status, json: json };
  }

  function can(permission) {
    var s = loadSession();
    if (!s || !s.permissions) return false;
    return s.permissions.indexOf(permission) !== -1;
  }

  global.AdminCore = {
    SESSION_KEY: SESSION_KEY,
    TOKEN_KEY: TOKEN_KEY,
    DEFAULT_API: DEFAULT_API,
    normalizeBase: normalizeBase,
    loadSession: loadSession,
    saveSession: saveSession,
    clearSession: clearSession,
    adminFetch: adminFetch,
    extractErr: extractErr,
    can: can,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
