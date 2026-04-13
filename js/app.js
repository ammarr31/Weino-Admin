/**
 * Admin SPA: sign-in, permission-based nav, hash routes, API-backed views.
 */
(function () {
  'use strict';

  var AC = function () {
    return window.AdminCore;
  };
  var I18n = function () {
    return window.AdminI18n;
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toast(msg, isErr) {
    var el = $('toast');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('toast-error', !!isErr);
    el.classList.remove('hidden');
    clearTimeout(el._tid);
    el._tid = setTimeout(function () {
      el.classList.add('hidden');
    }, 4200);
  }

  function t(key) {
    return I18n().t(key);
  }

  function parseHash() {
    var raw = (location.hash || '#dashboard').replace(/^#/, '').trim() || 'dashboard';
    var parts = raw.split('/').filter(Boolean);
    if (!parts.length) parts = ['dashboard'];
    return { route: parts[0], id: parts[1] || null, sub: parts[2] || null, parts: parts };
  }

  function navActiveKey(p) {
    var r = p.route;
    if (r === 'user') return 'users';
    if (r === 'booking') return 'bookings';
    if (r === 'match') return 'matches';
    if (r === 'ticket') return 'tickets';
    return r;
  }

  function syncNav() {
    var k = navActiveKey(parseHash());
    document.querySelectorAll('.nav-route').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-route') === k);
    });
  }

  function requirePerm(perm) {
    if (!AC().can(perm)) {
      return (
        '<div class="card"><p class="msg-inline-error">' +
        escapeHtml(t('access_denied')) +
        '</p></div>'
      );
    }
    return null;
  }

  function showScreens(isApp) {
    var login = $('screen-login');
    var app = $('screen-app');
    var hs = $('header-session');
    if (login) login.classList.toggle('hidden', !!isApp);
    if (app) app.classList.toggle('hidden', !isApp);
    if (hs) hs.classList.toggle('hidden', !isApp);
  }

  function logout() {
    AC().clearSession();
    showScreens(false);
    location.hash = '#dashboard';
    toast(t('logged_out'), false);
  }

  function monthSelectFill() {
    var sel = $('pf-month');
    if (!sel || sel.options.length) return;
    for (var m = 1; m <= 12; m += 1) {
      var opt = document.createElement('option');
      opt.value = String(m);
      opt.textContent = String(m);
      sel.appendChild(opt);
    }
    var now = new Date();
    sel.value = String(now.getMonth() + 1);
    var y = $('pf-year');
    if (y) y.value = String(now.getFullYear());
  }

  function wirePlatformFeeExport() {
    var tokEl = $('pf-token');
    var sess = AC().loadSession();
    if (tokEl && sess && sess.token) tokEl.value = sess.token;
    var rem = $('pf-remember');
    if (rem) rem.checked = true;

    function getToken() {
      return ((tokEl && tokEl.value) || '').trim() || (sess && sess.token) || '';
    }

    function saveTokenIfRemembered() {
      try {
        if (rem && rem.checked && tokEl) {
          localStorage.setItem(AC().TOKEN_KEY, tokEl.value || '');
        } else {
          localStorage.removeItem(AC().TOKEN_KEY);
        }
      } catch (_) {}
    }

    function getCountryParam() {
      var c = (($('pf-country') && $('pf-country').value) || '').trim().toUpperCase();
      return c.length === 2 ? c : '';
    }

    function buildExportUrl(kind) {
      var y = parseInt($('pf-year') && $('pf-year').value, 10);
      var m = parseInt($('pf-month') && $('pf-month').value, 10);
      if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
        return { error: I18n().getLang() === 'ar' ? 'سنة أو شهر غير صالح' : 'Invalid year or month' };
      }
      var path = kind === 'csv' ? 'platform-fees.csv' : 'platform-fees.pdf';
      var q = 'year=' + encodeURIComponent(String(y)) + '&month=' + encodeURIComponent(String(m));
      var co = getCountryParam();
      if (co) q += '&country=' + encodeURIComponent(co);
      var base = (AC().loadSession() && AC().loadSession().apiBase) || AC().DEFAULT_API;
      return { url: base + '/admin/invoices/' + path + '?' + q };
    }

    function showError(msg) {
      var el = $('export-error');
      var ok = $('export-status');
      if (ok) {
        ok.textContent = '';
        ok.classList.remove('visible');
      }
      if (el) {
        el.textContent = msg || '';
        el.classList.add('visible');
      }
    }

    function hideError() {
      var el = $('export-error');
      if (el) el.classList.remove('visible');
    }

    function showOk(msg) {
      var el = $('export-status');
      if (el) {
        el.textContent = msg || '';
        el.classList.add('visible');
      }
    }

    function setBusy(busy) {
      var b1 = $('btn-pdf');
      var b2 = $('btn-csv');
      if (b1) b1.disabled = !!busy;
      if (b2) b2.disabled = !!busy;
    }

    async function runExport(kind) {
      hideError();
      var tok = getToken();
      if (!tok) {
        showError(I18n().getLang() === 'ar' ? 'أدخل توكن الأدمن أولاً.' : 'Enter the admin Bearer token first.');
        return;
      }
      saveTokenIfRemembered();
      var built = buildExportUrl(kind);
      if (built.error) {
        showError(built.error);
        return;
      }
      var fallback = kind === 'csv' ? 'platform-fees-export.csv' : 'platform-fees-export.pdf';
      setBusy(true);
      showOk(I18n().t('export_running'));
      var r = await window.platformFeesDownloadBlob({
        url: built.url,
        token: tok,
        filenameFallback: fallback,
        onError: function () {},
        onStart: function () {},
      });
      setBusy(false);
      if (r.ok) {
        showOk(I18n().t('export_ok'));
      } else {
        var status = $('export-status');
        if (status) {
          status.textContent = '';
          status.classList.remove('visible');
        }
        showError((I18n().t('export_error_title') || 'Error') + ': ' + (r.message || ''));
      }
    }

    var bpdf = $('btn-pdf');
    var bcsv = $('btn-csv');
    if (bpdf && !bpdf._wired) {
      bpdf._wired = true;
      bpdf.addEventListener('click', function () {
        runExport('pdf');
      });
    }
    if (bcsv && !bcsv._wired) {
      bcsv._wired = true;
      bcsv.addEventListener('click', function () {
        runExport('csv');
      });
    }
  }

  async function renderDashboard(container) {
    var deny = requirePerm('dashboard');
    if (deny) {
      container.innerHTML = deny;
      return;
    }
    container.innerHTML = '<p class="muted">' + escapeHtml(t('loading')) + '</p>';
    var r = await AC().adminFetch('GET', '/admin/stats');
    if (!r.ok) {
      container.innerHTML =
        '<div class="card"><p class="msg-inline-error">' + escapeHtml(r.error || '') + '</p></div>';
      return;
    }
    var d = (r.json && r.json.data) || {};
    var cards = [
      ['users', d.users],
      ['professionals', d.professionals],
      ['nonProfessionals', d.nonProfessionals],
      ['matches', d.matches],
      ['bookings', d.bookings],
      ['non_booking_matches', d.non_booking_matches],
      ['categories', d.categories],
      ['pendingApplications', d.pendingApplications],
      ['pendingTickets', d.pendingTickets],
      ['openTickets', d.openTickets],
    ];
    var html =
      '<div class="stat-grid">' +
      cards
        .map(function (x) {
          return (
            '<div class="stat-card"><div class="stat-label">' +
            escapeHtml(t('stat_' + x[0]) || x[0]) +
            '</div><div class="stat-value">' +
            escapeHtml(String(x[1] != null ? x[1] : '—')) +
            '</div></div>'
          );
        })
        .join('') +
      '</div>';
    container.innerHTML = html;
  }

  async function renderUsers(container, state) {
    var deny = requirePerm('users');
    if (deny) {
      container.innerHTML = deny;
      return;
    }
    state = state || { page: 1, search: '', filter: '' };
    var q =
      '?page=' +
      encodeURIComponent(String(state.page)) +
      '&limit=25&search=' +
      encodeURIComponent(state.search || '');
    if (state.filter === 'pro') q += '&is_professional=true';
    if (state.filter === 'cust') q += '&is_professional=false';
    container.innerHTML = '<p class="muted">' + escapeHtml(t('loading')) + '</p>';
    var r = await AC().adminFetch('GET', '/admin/users' + q);
    if (!r.ok) {
      container.innerHTML =
        '<div class="card"><p class="msg-inline-error">' + escapeHtml(r.error || '') + '</p></div>';
      return;
    }
    var rows = (r.json && r.json.data) || [];
    var pag = (r.json && r.json.pagination) || {};
    var searchVal = state.search || '';
    var filterVal = state.filter || '';
    var html = '';
    html += '<div class="card toolbar">';
    html +=
      '<label class="inline">' +
      escapeHtml(t('search')) +
      ' <input type="text" id="u-search" value="' +
      escapeHtml(searchVal) +
      '" /></label> ';
    html +=
      '<label class="inline">' +
      escapeHtml(t('filter')) +
      ' <select id="u-filter"><option value="">' +
      escapeHtml(t('filter_all')) +
      '</option><option value="pro"' +
      (filterVal === 'pro' ? ' selected' : '') +
      '>' +
      escapeHtml(t('filter_pro')) +
      '</option><option value="cust"' +
      (filterVal === 'cust' ? ' selected' : '') +
      '>' +
      escapeHtml(t('filter_cust')) +
      '</option></select></label> ';
    html += '<button type="button" class="primary sm" id="u-go">' + escapeHtml(t('apply')) + '</button>';
    html += '</div>';
    html += '<div class="card table-wrap"><table class="data-table"><thead><tr>';
    html +=
      '<th>' +
      escapeHtml(t('col_name')) +
      '</th><th>' +
      escapeHtml(t('col_username')) +
      '</th><th>' +
      escapeHtml(t('col_role')) +
      '</th><th>' +
      escapeHtml(t('col_country')) +
      '</th><th></th></tr></thead><tbody>';
    rows.forEach(function (u) {
      html += '<tr>';
      html += '<td>' + escapeHtml(u.display_name || '—') + '</td>';
      html += '<td>' + escapeHtml(u.username || '—') + '</td>';
      html += '<td>' + (u.is_professional ? t('filter_pro') : t('filter_cust')) + '</td>';
      html += '<td>' + escapeHtml(u.country || '—') + '</td>';
      html +=
        '<td><a href="#user/' +
        encodeURIComponent(u.uid) +
        '" class="link">' +
        escapeHtml(t('open')) +
        '</a></td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    html += '<div class="pager">';
    if (state.page > 1) {
      html +=
        '<button type="button" class="secondary sm" data-upage="' +
        (state.page - 1) +
        '">' +
        escapeHtml(t('prev')) +
        '</button> ';
    }
    if (pag.hasMore) {
      html +=
        '<button type="button" class="secondary sm" data-upage="' +
        (state.page + 1) +
        '">' +
        escapeHtml(t('next')) +
        '</button>';
    }
    html += '</div>';
    container.innerHTML = html;
    $('u-go').addEventListener('click', function () {
      renderUsers(container, {
        page: 1,
        search: ($('u-search') && $('u-search').value) || '',
        filter: ($('u-filter') && $('u-filter').value) || '',
      });
    });
    container.querySelectorAll('[data-upage]').forEach(function (b) {
      b.addEventListener('click', function () {
        renderUsers(container, {
          page: parseInt(b.getAttribute('data-upage'), 10),
          search: searchVal,
          filter: filterVal,
        });
      });
    });
  }

  async function renderUser(container, uid) {
    var deny = requirePerm('users');
    if (deny) {
      container.innerHTML = deny;
      return;
    }
    container.innerHTML = '<p class="muted">' + escapeHtml(t('loading')) + '</p>';
    var r = await AC().adminFetch('GET', '/admin/users/' + encodeURIComponent(uid));
    if (!r.ok) {
      container.innerHTML =
        '<div class="card"><p class="msg-inline-error">' + escapeHtml(r.error || '') + '</p></div>';
      return;
    }
    var u = (r.json && r.json.data) || {};
    var html = '<div class="card"><a href="#users" class="link back-link">← ' + escapeHtml(t('nav_users')) + '</a>';
    html += '<h2>' + escapeHtml(u.professional_name || u.username || uid) + '</h2>';
    html += '<dl class="kv">';
    ['uid', 'username', 'email', 'phone_number', 'country', 'is_professional', 'professional_name', 'is_banned', 'is_verified', 'is_premium', 'is_suspended_for_fees', 'booking_restricted_active'].forEach(function (k) {
      if (u[k] === undefined) return;
      html += '<dt>' + escapeHtml(k) + '</dt><dd>' + escapeHtml(typeof u[k] === 'object' ? JSON.stringify(u[k]) : String(u[k])) + '</dd>';
    });
    html += '</dl></div>';
    container.innerHTML = html;
  }

  async function renderBookings(container, state) {
    var deny = requirePerm('bookings_admin');
    if (deny) {
      container.innerHTML = deny;
      return;
    }
    state = state || { page: 1, search: '', status: '' };
    var q =
      '?page=' +
      encodeURIComponent(String(state.page)) +
      '&limit=20&search=' +
      encodeURIComponent(state.search || '') +
      '&status=' +
      encodeURIComponent(state.status || '');
    container.innerHTML = '<p class="muted">' + escapeHtml(t('loading')) + '</p>';
    var r = await AC().adminFetch('GET', '/admin/bookings' + q);
    if (!r.ok) {
      container.innerHTML =
        '<div class="card"><p class="msg-inline-error">' + escapeHtml(r.error || '') + '</p></div>';
      return;
    }
    var rows = (r.json && r.json.data) || [];
    var pag = (r.json && r.json.pagination) || {};
    var html = '<div class="card toolbar">';
    html +=
      '<label class="inline">' +
      escapeHtml(t('search')) +
      ' <input type="text" id="b-search" value="' +
      escapeHtml(state.search || '') +
      '" /></label> ';
    html +=
      '<label class="inline">' +
      escapeHtml(t('col_status')) +
      ' <input type="text" id="b-status" placeholder="status" value="' +
      escapeHtml(state.status || '') +
      '" /></label> ';
    html += '<button type="button" class="primary sm" id="b-go">' + escapeHtml(t('apply')) + '</button>';
    html += '</div><div class="card table-wrap"><table class="data-table"><thead><tr>';
    html +=
      '<th>ID</th><th>' +
      escapeHtml(t('col_status')) +
      '</th><th>Pro</th><th>Customer</th><th></th></tr></thead><tbody>';
    rows.forEach(function (b) {
      var id = b.id || b.match_id || '';
      html += '<tr>';
      html += '<td class="mono">' + escapeHtml(String(id).slice(0, 12)) + '…</td>';
      html += '<td>' + escapeHtml(String(b.status || b.booking_status || '')) + '</td>';
      html += '<td>' + escapeHtml(b.professional_username || b.professional_name || '—') + '</td>';
      html += '<td>' + escapeHtml(b.customer_username || b.customer_name || '—') + '</td>';
      html +=
        '<td><a class="link" href="#booking/' + encodeURIComponent(id) + '">' + escapeHtml(t('open')) + '</a></td>';
      html += '</tr>';
    });
    html += '</tbody></table></div><div class="pager">';
    if (state.page > 1) {
      html +=
        '<button type="button" class="secondary sm" data-bpage="' +
        (state.page - 1) +
        '">' +
        escapeHtml(t('prev')) +
        '</button> ';
    }
    if (pag.hasMore) {
      html +=
        '<button type="button" class="secondary sm" data-bpage="' +
        (state.page + 1) +
        '">' +
        escapeHtml(t('next')) +
        '</button>';
    }
    html += '</div>';
    container.innerHTML = html;
    $('b-go').addEventListener('click', function () {
      renderBookings(container, {
        page: 1,
        search: ($('b-search') && $('b-search').value) || '',
        status: ($('b-status') && $('b-status').value) || '',
      });
    });
    container.querySelectorAll('[data-bpage]').forEach(function (b) {
      b.addEventListener('click', function () {
        renderBookings(container, {
          page: parseInt(b.getAttribute('data-bpage'), 10),
          search: state.search,
          status: state.status,
        });
      });
    });
  }

  async function renderBookingDetail(container, id) {
    var deny = requirePerm('bookings_admin');
    if (deny) {
      container.innerHTML = deny;
      return;
    }
    container.innerHTML = '<p class="muted">' + escapeHtml(t('loading')) + '</p>';
    var r = await AC().adminFetch('GET', '/admin/bookings/' + encodeURIComponent(id));
    if (!r.ok) {
      container.innerHTML =
        '<div class="card"><p class="msg-inline-error">' + escapeHtml(r.error || '') + '</p></div>';
      return;
    }
    var b = (r.json && r.json.data) || {};
    var html = '<div class="card"><a href="#bookings" class="link">← ' + escapeHtml(t('nav_bookings')) + '</a>';
    html += '<h2>Booking</h2><pre class="json-pre">' + escapeHtml(JSON.stringify(b, null, 2)) + '</pre></div>';
    container.innerHTML = html;
  }

  async function renderMatches(container, state) {
    var deny = requirePerm('matches');
    if (deny) {
      container.innerHTML = deny;
      return;
    }
    state = state || { page: 1, type: '', search: '' };
    var q =
      '?page=' +
      String(state.page) +
      '&limit=20&type=' +
      encodeURIComponent(state.type || '') +
      '&search=' +
      encodeURIComponent(state.search || '');
    container.innerHTML = '<p class="muted">' + escapeHtml(t('loading')) + '</p>';
    var r = await AC().adminFetch('GET', '/admin/matches' + q);
    if (!r.ok) {
      container.innerHTML =
        '<div class="card"><p class="msg-inline-error">' + escapeHtml(r.error || '') + '</p></div>';
      return;
    }
    var rows = (r.json && r.json.data) || [];
    var pag = (r.json && r.json.pagination) || {};
    var html = '<div class="card toolbar">';
    html +=
      '<label class="inline">type <input type="text" id="m-type" value="' +
      escapeHtml(state.type || '') +
      '" /></label> ';
    html +=
      '<label class="inline">' +
      escapeHtml(t('search')) +
      ' <input type="text" id="m-search" value="' +
      escapeHtml(state.search || '') +
      '" /></label> ';
    html += '<button type="button" class="primary sm" id="m-go">' + escapeHtml(t('apply')) + '</button>';
    html += '</div><div class="card table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>type</th><th>status</th><th>users</th><th></th></tr></thead><tbody>';
    rows.forEach(function (m) {
      html += '<tr><td class="mono">' + escapeHtml(String(m.id).slice(0, 10)) + '…</td>';
      html += '<td>' + escapeHtml(String(m.type || '')) + '</td>';
      html += '<td>' + escapeHtml(String(m.status || '')) + '</td>';
      html += '<td>' + escapeHtml((m.participantUsernames || []).join(', ')) + '</td>';
      html +=
        '<td><a class="link" href="#match/' + encodeURIComponent(m.id) + '">' + escapeHtml(t('open')) + '</a></td></tr>';
    });
    html += '</tbody></table></div><div class="pager">';
    if (state.page > 1) {
      html +=
        '<button type="button" class="secondary sm" data-mpage="' +
        (state.page - 1) +
        '">' +
        escapeHtml(t('prev')) +
        '</button> ';
    }
    if (pag.hasMore) {
      html +=
        '<button type="button" class="secondary sm" data-mpage="' +
        (state.page + 1) +
        '">' +
        escapeHtml(t('next')) +
        '</button>';
    }
    html += '</div>';
    container.innerHTML = html;
    $('m-go').addEventListener('click', function () {
      renderMatches(container, {
        page: 1,
        type: ($('m-type') && $('m-type').value) || '',
        search: ($('m-search') && $('m-search').value) || '',
      });
    });
    container.querySelectorAll('[data-mpage]').forEach(function (b) {
      b.addEventListener('click', function () {
        renderMatches(container, {
          page: parseInt(b.getAttribute('data-mpage'), 10),
          type: state.type,
          search: state.search,
        });
      });
    });
  }

  async function renderMatchDetail(container, id) {
    var deny = requirePerm('matches');
    if (deny) {
      container.innerHTML = deny;
      return;
    }
    container.innerHTML = '<p class="muted">' + escapeHtml(t('loading')) + '</p>';
    var r = await AC().adminFetch('GET', '/admin/matches/' + encodeURIComponent(id));
    if (!r.ok) {
      container.innerHTML =
        '<div class="card"><p class="msg-inline-error">' + escapeHtml(r.error || '') + '</p></div>';
      return;
    }
    var d = (r.json && r.json.data) || {};
    var html = '<div class="card"><a href="#matches" class="link">← ' + escapeHtml(t('nav_matches')) + '</a>';
    html += '<h2>Match</h2><pre class="json-pre">' + escapeHtml(JSON.stringify(d, null, 2)) + '</pre></div>';
    container.innerHTML = html;
  }

  async function renderCategories(container) {
    var deny = requirePerm('categories');
    if (deny) {
      container.innerHTML = deny;
      return;
    }
    container.innerHTML = '<p class="muted">' + escapeHtml(t('loading')) + '</p>';
    var r = await AC().adminFetch('GET', '/admin/categories?limit=100&page=1');
    if (!r.ok) {
      container.innerHTML =
        '<div class="card"><p class="msg-inline-error">' + escapeHtml(r.error || '') + '</p></div>';
      return;
    }
    var rows = (r.json && r.json.data) || [];
    var html = '<div class="card table-wrap"><table class="data-table"><thead><tr><th>key</th><th>name</th><th>parent</th></tr></thead><tbody>';
    rows.forEach(function (c) {
      html += '<tr><td class="mono">' + escapeHtml(c.key || '') + '</td>';
      html += '<td>' + escapeHtml(c.name || c.name_en || '') + '</td>';
      html += '<td>' + escapeHtml(c.parent_id || '—') + '</td></tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  async function renderLocations(container, tab) {
    var deny = requirePerm('locations');
    if (deny) {
      container.innerHTML = deny;
      return;
    }
    tab = tab || 'countries';
    var path =
      tab === 'governorates'
        ? '/admin/governorates'
        : tab === 'cities'
          ? '/admin/cities'
          : '/admin/countries';
    container.innerHTML = '<p class="muted">' + escapeHtml(t('loading')) + '</p>';
    var r = await AC().adminFetch('GET', path);
    if (!r.ok) {
      container.innerHTML =
        '<div class="card"><p class="msg-inline-error">' + escapeHtml(r.error || '') + '</p></div>';
      return;
    }
    var rows = (r.json && r.json.data) || [];
    var tabs =
      '<div class="tabs">' +
      '<a class="tab' +
      (tab === 'countries' ? ' active' : '') +
      '" href="#locations/countries">' +
      escapeHtml(t('loc_countries')) +
      '</a>' +
      '<a class="tab' +
      (tab === 'governorates' ? ' active' : '') +
      '" href="#locations/governorates">' +
      escapeHtml(t('loc_govs')) +
      '</a>' +
      '<a class="tab' +
      (tab === 'cities' ? ' active' : '') +
      '" href="#locations/cities">' +
      escapeHtml(t('loc_cities')) +
      '</a></div>';
    var html = '<div class="card">' + tabs + '<pre class="json-pre">' + escapeHtml(JSON.stringify(rows.slice(0, 80), null, 2)) + '</pre>';
    if (rows.length > 80) html += '<p class="muted">… ' + String(rows.length) + ' total (showing 80)</p>';
    html += '</div>';
    container.innerHTML = html;
  }

  async function renderAppConfig(container) {
    var deny = requirePerm('app_config');
    if (deny) {
      container.innerHTML = deny;
      return;
    }
    container.innerHTML = '<p class="muted">' + escapeHtml(t('loading')) + '</p>';
    var r = await AC().adminFetch('GET', '/admin/config/app');
    if (!r.ok) {
      container.innerHTML =
        '<div class="card"><p class="msg-inline-error">' + escapeHtml(r.error || '') + '</p></div>';
      return;
    }
    var cfg = (r.json && r.json.data) || {};
    var html = '<div class="card"><h2>' + escapeHtml(t('nav_appconfig')) + '</h2>';
    html +=
      '<p class="muted">' +
      escapeHtml(t('appconfig_warn')) +
      '</p><textarea id="cfg-json" class="code-area">' +
      escapeHtml(JSON.stringify(cfg, null, 2)) +
      '</textarea>';
    html += '<div class="actions"><button type="button" class="primary" id="cfg-save">' + escapeHtml(t('save')) + '</button></div>';
    html += '<p id="cfg-msg" class="msg-inline-error"></p></div>';
    container.innerHTML = html;
    $('cfg-save').addEventListener('click', async function () {
      var msg = $('cfg-msg');
      if (msg) {
        msg.textContent = '';
      }
      var parsed;
      try {
        parsed = JSON.parse(($('cfg-json') && $('cfg-json').value) || '{}');
      } catch (e) {
        if (msg) msg.textContent = t('invalid_json');
        return;
      }
      var pr = await AC().adminFetch('PUT', '/admin/config/app', { body: parsed });
      if (!pr.ok) {
        if (msg) msg.textContent = pr.error || 'Error';
        toast(pr.error || 'Error', true);
        return;
      }
      toast(t('saved_ok'), false);
    });
  }

  async function renderPlatformFees(container) {
    var deny = requirePerm('platform_fees');
    if (deny) {
      container.innerHTML = deny;
      return;
    }
    container.innerHTML = '<p class="muted">' + escapeHtml(t('loading')) + '</p>';
    var r = await AC().adminFetch('GET', '/admin/platform-fees');
    var summaryHtml = '';
    if (r.ok && r.json && r.json.data && r.json.data.summary) {
      var s = r.json.data.summary;
      summaryHtml =
        '<div class="stat-grid">' +
        ['fee_rate_percentage', 'fees_enabled', 'total_due_all_time', 'total_confirmed_all_time', 'professionals_count', 'suspended_count']
          .map(function (k) {
            return (
              '<div class="stat-card"><div class="stat-label">' +
              escapeHtml(k) +
              '</div><div class="stat-value">' +
              escapeHtml(String(s[k])) +
              '</div></div>'
            );
          })
          .join('') +
        '</div>';
    } else if (!r.ok) {
      summaryHtml =
        '<div class="card"><p class="msg-inline-error">' + escapeHtml(r.error || '') + '</p></div>';
    }
    var pros = r.ok && r.json && r.json.data && r.json.data.professionals ? r.json.data.professionals : [];
    var slice = pros.slice(0, 40);
    var table =
      '<div class="card table-wrap"><h3>Top balances (40)</h3><table class="data-table"><thead><tr><th>user</th><th>due</th><th>suspended</th></tr></thead><tbody>';
    slice.forEach(function (p) {
      table +=
        '<tr><td>' +
        escapeHtml(p.username || p.uid) +
        '</td><td>' +
        escapeHtml(String(p.amount_due)) +
        '</td><td>' +
        escapeHtml(String(!!p.is_suspended)) +
        '</td></tr>';
    });
    table += '</tbody></table></div>';
    var exportCard =
      '<div class="card" id="pf-export-card"><h2 data-i18n="pf_card_title">' +
      escapeHtml(I18n().t('pf_card_title')) +
      '</h2><p class="intro" data-i18n="pf_card_intro">' +
      I18n()
        .t('pf_card_intro')
        .replace(/\n/g, '<br>') +
      '</p>';
    exportCard +=
      '<div class="form-row"><label data-i18n="pf_year">' +
      escapeHtml(I18n().t('pf_year')) +
      '</label><input id="pf-year" type="number" min="2000" max="2100" /></div>';
    exportCard +=
      '<div class="form-row"><label data-i18n="pf_month">' +
      escapeHtml(I18n().t('pf_month')) +
      '</label><select id="pf-month"></select></div>';
    exportCard +=
      '<div class="form-row"><label data-i18n="pf_country">' +
      escapeHtml(I18n().t('pf_country')) +
      '</label><input id="pf-country" type="text" maxlength="2" autocomplete="off" /></div>';
    exportCard +=
      '<div class="form-row"><label data-i18n="pf_token">' +
      escapeHtml(I18n().t('pf_token')) +
      '</label><input id="pf-token" type="password" autocomplete="off" /><p class="hint" data-i18n="pf_token_hint">' +
      escapeHtml(I18n().t('pf_token_hint')) +
      '</p></div>';
    exportCard +=
      '<div class="form-row"><label class="checkbox"><input id="pf-remember" type="checkbox" checked /><span data-i18n="pf_remember">' +
      escapeHtml(I18n().t('pf_remember')) +
      '</span></label></div>';
    exportCard +=
      '<div class="actions"><button type="button" class="primary" id="btn-pdf" data-i18n="btn_pdf">' +
      escapeHtml(I18n().t('btn_pdf')) +
      '</button> <button type="button" class="secondary" id="btn-csv" data-i18n="btn_csv">' +
      escapeHtml(I18n().t('btn_csv')) +
      '</button></div>';
    exportCard += '<p id="export-status" class="msg-ok"></p><div id="export-error" class="msg-error" role="alert"></div></div>';
    container.innerHTML = summaryHtml + table + exportCard;
    monthSelectFill();
    wirePlatformFeeExport();
  }

  async function renderTickets(container, state) {
    var deny = requirePerm('tickets');
    if (deny) {
      container.innerHTML = deny;
      return;
    }
    state = state || { page: 1, status: '' };
    var q = '?page=' + String(state.page) + '&limit=20&status=' + encodeURIComponent(state.status || '');
    container.innerHTML = '<p class="muted">' + escapeHtml(t('loading')) + '</p>';
    var r = await AC().adminFetch('GET', '/admin/tickets' + q);
    if (!r.ok) {
      container.innerHTML =
        '<div class="card"><p class="msg-inline-error">' + escapeHtml(r.error || '') + '</p></div>';
      return;
    }
    var rows = (r.json && r.json.data) || [];
    var pag = (r.json && r.json.pagination) || {};
    var html = '<div class="card toolbar"><label class="inline">status <input type="text" id="t-st" value="' + escapeHtml(state.status || '') + '"/></label> ';
    html += '<button type="button" class="primary sm" id="t-go">' + escapeHtml(t('apply')) + '</button></div>';
    html += '<div class="card table-wrap"><table class="data-table"><thead><tr><th>id</th><th>subject</th><th>status</th><th></th></tr></thead><tbody>';
    rows.forEach(function (x) {
      var id = x.id || x.ticket_id || '';
      html += '<tr><td class="mono">' + escapeHtml(String(id).slice(0, 12)) + '</td>';
      html += '<td>' + escapeHtml(x.subject || x.title || '—') + '</td>';
      html += '<td>' + escapeHtml(x.status || '') + '</td>';
      html +=
        '<td><a class="link" href="#ticket/' + encodeURIComponent(id) + '">' + escapeHtml(t('open')) + '</a></td></tr>';
    });
    html += '</tbody></table></div><div class="pager">';
    if (state.page > 1) {
      html +=
        '<button type="button" class="secondary sm" data-tpage="' +
        (state.page - 1) +
        '">' +
        escapeHtml(t('prev')) +
        '</button> ';
    }
    if (pag.hasMore) {
      html +=
        '<button type="button" class="secondary sm" data-tpage="' +
        (state.page + 1) +
        '">' +
        escapeHtml(t('next')) +
        '</button>';
    }
    html += '</div>';
    container.innerHTML = html;
    $('t-go').addEventListener('click', function () {
      renderTickets(container, { page: 1, status: ($('t-st') && $('t-st').value) || '' });
    });
    container.querySelectorAll('[data-tpage]').forEach(function (b) {
      b.addEventListener('click', function () {
        renderTickets(container, {
          page: parseInt(b.getAttribute('data-tpage'), 10),
          status: state.status,
        });
      });
    });
  }

  async function renderTicketDetail(container, id) {
    var deny = requirePerm('tickets');
    if (deny) {
      container.innerHTML = deny;
      return;
    }
    container.innerHTML = '<p class="muted">' + escapeHtml(t('loading')) + '</p>';
    var r = await AC().adminFetch('GET', '/admin/tickets/' + encodeURIComponent(id));
    if (!r.ok) {
      container.innerHTML =
        '<div class="card"><p class="msg-inline-error">' + escapeHtml(r.error || '') + '</p></div>';
      return;
    }
    var pack = (r.json && r.json.data) || {};
    var msgs = pack.messages || pack.thread || [];
    var html = '<div class="card"><a href="#tickets" class="link">← ' + escapeHtml(t('nav_tickets')) + '</a>';
    html += '<h2>' + escapeHtml(pack.subject || pack.title || 'Ticket') + '</h2>';
    html += '<div class="thread">';
    (Array.isArray(msgs) ? msgs : []).forEach(function (m) {
      html += '<div class="bubble"><pre>' + escapeHtml(JSON.stringify(m, null, 2)) + '</pre></div>';
    });
    html += '</div>';
    html +=
      '<div class="form-row"><textarea id="tk-reply" rows="3" class="code-area" placeholder="' +
      escapeHtml(t('ticket_reply_ph')) +
      '"></textarea></div>';
    html += '<div class="actions"><button type="button" class="primary" id="tk-send">' + escapeHtml(t('send')) + '</button> ';
    html += '<button type="button" class="secondary" id="tk-close">' + escapeHtml(t('ticket_close')) + '</button></div>';
    html += '<p id="tk-msg" class="msg-inline-error"></p></div>';
    container.innerHTML = html;
    $('tk-send').addEventListener('click', async function () {
      var text = ($('tk-reply') && $('tk-reply').value) || '';
      var pr = await AC().adminFetch('POST', '/admin/tickets/' + encodeURIComponent(id) + '/messages', {
        body: { text: text },
      });
      if (!pr.ok) {
        if ($('tk-msg')) $('tk-msg').textContent = pr.error || '';
        return;
      }
      toast(t('saved_ok'), false);
      renderTicketDetail(container, id);
    });
    $('tk-close').addEventListener('click', async function () {
      var pr = await AC().adminFetch('POST', '/admin/tickets/' + encodeURIComponent(id) + '/close', { body: {} });
      if (!pr.ok) {
        if ($('tk-msg')) $('tk-msg').textContent = pr.error || '';
        return;
      }
      toast(t('ticket_closed_ok'), false);
      location.hash = '#tickets';
    });
  }

  function renderNotifications(container) {
    var deny = requirePerm('notifications');
    if (deny) {
      container.innerHTML = deny;
      return;
    }
    var html = '<div class="card"><h2>' + escapeHtml(t('nav_notifications')) + '</h2>';
    html +=
      '<div class="form-row"><label>title</label><input type="text" id="n-title" /></div>' +
      '<div class="form-row"><label>body</label><textarea id="n-body" rows="4" class="code-area"></textarea></div>' +
      '<div class="form-row"><label>target</label><select id="n-target"><option value="all">all</option><option value="user">user</option></select></div>' +
      '<div class="form-row"><label>uid (if user)</label><input type="text" id="n-uid" class="mono" /></div>' +
      '<div class="actions"><button type="button" class="primary" id="n-send">' +
      escapeHtml(t('send')) +
      '</button></div><p id="n-msg" class="msg-inline-error"></p></div>';
    container.innerHTML = html;
    $('n-send').addEventListener('click', async function () {
      var body = {
        title: ($('n-title') && $('n-title').value) || '',
        body: ($('n-body') && $('n-body').value) || '',
        target: ($('n-target') && $('n-target').value) || 'all',
        uid: ($('n-uid') && $('n-uid').value) || undefined,
      };
      var pr = await AC().adminFetch('POST', '/admin/notifications/send', { body: body });
      if (!pr.ok) {
        if ($('n-msg')) $('n-msg').textContent = pr.error || '';
        toast(pr.error || '', true);
        return;
      }
      if ($('n-msg')) $('n-msg').textContent = '';
      toast(t('notif_sent'), false);
    });
  }

  async function renderProfessionals(container, state) {
    var deny = requirePerm('professionals');
    if (deny) {
      container.innerHTML = deny;
      return;
    }
    state = state || { page: 1, search: '' };
    var q =
      '?page=' +
      String(state.page) +
      '&limit=15&search=' +
      encodeURIComponent(state.search || '');
    container.innerHTML = '<p class="muted">' + escapeHtml(t('loading')) + '</p>';
    var r = await AC().adminFetch('GET', '/admin/professionals/applications/pending' + q);
    if (!r.ok) {
      container.innerHTML =
        '<div class="card"><p class="msg-inline-error">' + escapeHtml(r.error || '') + '</p></div>';
      return;
    }
    var rows = (r.json && r.json.data) || [];
    var pag = (r.json && r.json.pagination) || {};
    var html = '<div class="card toolbar"><label class="inline">' + escapeHtml(t('search')) + ' <input type="text" id="p-search" value="' + escapeHtml(state.search || '') + '"/></label> ';
    html += '<button type="button" class="primary sm" id="p-go">' + escapeHtml(t('apply')) + '</button></div>';
    html += '<div class="card table-wrap"><table class="data-table"><thead><tr><th>name</th><th>type</th><th>user</th><th>actions</th></tr></thead><tbody>';
    rows.forEach(function (a) {
      html += '<tr><td>' + escapeHtml(a.professional_name || '—') + '</td>';
      html += '<td>' + escapeHtml(a.type || 'initial') + '</td>';
      html += '<td>' + escapeHtml((a.user && a.user.username) || a.user_id || '') + '</td>';
      html +=
        '<td><button type="button" class="primary sm" data-app="' +
        escapeHtml(a.id) +
        '" data-act="approve">' +
        escapeHtml(t('approve')) +
        '</button> ';
      html +=
        '<button type="button" class="secondary sm" data-app="' +
        escapeHtml(a.id) +
        '" data-act="reject">' +
        escapeHtml(t('reject')) +
        '</button></td></tr>';
    });
    html += '</tbody></table></div><div class="pager">';
    if (state.page > 1) {
      html +=
        '<button type="button" class="secondary sm" data-ppage="' +
        (state.page - 1) +
        '">' +
        escapeHtml(t('prev')) +
        '</button> ';
    }
    if (pag.hasMore) {
      html +=
        '<button type="button" class="secondary sm" data-ppage="' +
        (state.page + 1) +
        '">' +
        escapeHtml(t('next')) +
        '</button>';
    }
    html += '</div>';
    container.innerHTML = html;
    $('p-go').addEventListener('click', function () {
      renderProfessionals(container, { page: 1, search: ($('p-search') && $('p-search').value) || '' });
    });
    container.querySelectorAll('[data-ppage]').forEach(function (b) {
      b.addEventListener('click', function () {
        renderProfessionals(container, {
          page: parseInt(b.getAttribute('data-ppage'), 10),
          search: state.search,
        });
      });
    });
    container.querySelectorAll('[data-app]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var aid = b.getAttribute('data-app');
        var act = b.getAttribute('data-act');
        var note = window.prompt(t('review_note_ph') || 'note', '') || '';
        var pr = await AC().adminFetch('POST', '/admin/professionals/' + encodeURIComponent(aid) + '/applications/review', {
          body: { action: act, review_note: note },
        });
        if (!pr.ok) {
          toast(pr.error || '', true);
          return;
        }
        toast(t('saved_ok'), false);
        renderProfessionals(container, state);
      });
    });
  }

  async function renderAccounts(container) {
    var deny = requirePerm('accounts');
    if (deny) {
      container.innerHTML = deny;
      return;
    }
    container.innerHTML = '<p class="muted">' + escapeHtml(t('loading')) + '</p>';
    var r = await AC().adminFetch('GET', '/admin/accounts');
    if (!r.ok) {
      container.innerHTML =
        '<div class="card"><p class="msg-inline-error">' + escapeHtml(r.error || '') + '</p></div>';
      return;
    }
    var rows = (r.json && r.json.data) || [];
    var html = '<div class="card table-wrap"><table class="data-table"><thead><tr><th>username</th><th>role</th><th>active</th></tr></thead><tbody>';
    rows.forEach(function (a) {
      html += '<tr><td>' + escapeHtml(a.username) + '</td><td>' + escapeHtml(a.role || '') + '</td><td>' + escapeHtml(String(!!a.is_active)) + '</td></tr>';
    });
    html += '</tbody></table><p class="muted">' + escapeHtml(t('accounts_hint')) + '</p></div>';
    container.innerHTML = html;
  }

  async function renderBookingTools(container) {
    var deny = requirePerm('bookings_admin');
    if (deny) {
      container.innerHTML = deny;
      return;
    }
    container.innerHTML = '<p class="muted">' + escapeHtml(t('loading')) + '</p>';
    var a = await AC().adminFetch('GET', '/admin/bookings/lifecycle/stats');
    var b = await AC().adminFetch('GET', '/admin/bookings/expired');
    var html = '<div class="card"><h2>' + escapeHtml(t('nav_bookingtools')) + '</h2>';
    html += '<h3>lifecycle/stats</h3><pre class="json-pre">' + escapeHtml(JSON.stringify(a.ok ? a.json : { error: a.error }, null, 2)) + '</pre>';
    html += '<h3>expired</h3><pre class="json-pre">' + escapeHtml(JSON.stringify(b.ok ? b.json : { error: b.error }, null, 2)) + '</pre>';
    html += '</div>';
    container.innerHTML = html;
  }

  function route() {
    var main = $('admin-main');
    if (!main) return;
    var p = parseHash();
    syncNav();
    var routeName = p.route;
    if (routeName === 'dashboard') return renderDashboard(main);
    if (routeName === 'users') return renderUsers(main, { page: 1, search: '', filter: '' });
    if (routeName === 'user' && p.id) return renderUser(main, p.id);
    if (routeName === 'bookings') return renderBookings(main, { page: 1, search: '', status: '' });
    if (routeName === 'booking' && p.id) return renderBookingDetail(main, p.id);
    if (routeName === 'matches') return renderMatches(main, { page: 1, type: '', search: '' });
    if (routeName === 'match' && p.id) return renderMatchDetail(main, p.id);
    if (routeName === 'categories') return renderCategories(main);
    if (routeName === 'locations') return renderLocations(main, p.id || 'countries');
    if (routeName === 'appconfig') return renderAppConfig(main);
    if (routeName === 'platformfees') return renderPlatformFees(main);
    if (routeName === 'tickets') return renderTickets(main, { page: 1, status: '' });
    if (routeName === 'ticket' && p.id) return renderTicketDetail(main, p.id);
    if (routeName === 'notifications') return renderNotifications(main);
    if (routeName === 'professionals') return renderProfessionals(main, { page: 1, search: '' });
    if (routeName === 'accounts') return renderAccounts(main);
    if (routeName === 'bookingtools') return renderBookingTools(main);
    location.hash = '#dashboard';
  }

  function refreshNavVisibility() {
    document.querySelectorAll('.nav-route').forEach(function (btn) {
      var perm = btn.getAttribute('data-perm');
      if (!perm) return;
      btn.style.display = AC().can(perm) ? '' : 'none';
    });
  }

  function updateSessionBar() {
    var s = AC().loadSession();
    var el = $('session-info');
    if (el && s) {
      el.textContent = (s.username || '') + ' · ' + (s.role || '');
    }
  }

  async function tryResumeSession() {
    var s = AC().loadSession();
    if (!s) {
      showScreens(false);
      return;
    }
    var r = await AC().adminFetch('GET', '/admin/stats');
    if (!r.ok) {
      AC().clearSession();
      showScreens(false);
      if (r.status === 401 || r.status === 403) toast(t('session_expired'), true);
      return;
    }
    showScreens(true);
    refreshNavVisibility();
    updateSessionBar();
    route();
  }

  function bindNav() {
    document.querySelectorAll('.nav-route').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var hash = btn.getAttribute('data-hash');
        if (hash) location.hash = hash;
      });
    });
  }

  function bindLogin() {
    var form = $('login-form');
    if (!form) return;
    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var err = $('login-error');
      if (err) {
        err.textContent = '';
        err.classList.remove('visible');
      }
      var apiBase = (($('login-api') && $('login-api').value) || '').trim() || AC().DEFAULT_API;
      var username = ($('login-user') && $('login-user').value) || '';
      var password = ($('login-pass') && $('login-pass').value) || '';
      var lr = await AC().adminFetch('POST', '/admin/auth/login', {
        skipAuth: true,
        apiBase: apiBase,
        body: { username: username, password: password },
      });
      if (!lr.ok || !lr.json || !lr.json.data || !lr.json.data.token) {
        if (err) {
          err.textContent = lr.error || (I18n().getLang() === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed');
          err.classList.add('visible');
        }
        return;
      }
      var d = lr.json.data;
      AC().saveSession({
        apiBase: apiBase,
        token: d.token,
        username: d.username,
        role: d.role,
        roles: d.roles,
        permissions: d.permissions,
      });
      showScreens(true);
      refreshNavVisibility();
      updateSessionBar();
      if (!location.hash || location.hash === '#') location.hash = '#dashboard';
      route();
      toast(t('login_ok'), false);
    });
  }

  function init() {
    var apiIn = $('login-api');
    if (apiIn) {
      try {
        apiIn.value = localStorage.getItem('weino_admin_api_base') || AC().DEFAULT_API;
      } catch (_) {
        apiIn.value = AC().DEFAULT_API;
      }
    }
    bindLogin();
    bindNav();
    var out = $('btn-logout');
    if (out) {
      out.addEventListener('click', function () {
        logout();
      });
    }
    var initial = I18n().getLang();
    I18n().setLang(initial);
    setLangButtons(initial);
    $('btn-lang-en').addEventListener('click', function () {
      I18n().setLang('en');
      setLangButtons('en');
      route();
    });
    $('btn-lang-ar').addEventListener('click', function () {
      I18n().setLang('ar');
      setLangButtons('ar');
      route();
    });
    window.addEventListener('hashchange', function () {
      route();
    });
    tryResumeSession();
  }

  function setLangButtons(lang) {
    var en = $('btn-lang-en');
    var ar = $('btn-lang-ar');
    if (en) {
      en.classList.toggle('active', lang === 'en');
      en.setAttribute('aria-pressed', lang === 'en' ? 'true' : 'false');
    }
    if (ar) {
      ar.classList.toggle('active', lang === 'ar');
      ar.setAttribute('aria-pressed', lang === 'ar' ? 'true' : 'false');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
