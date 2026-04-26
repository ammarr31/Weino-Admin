(function () {
  const API_BASE = 'https://api-t77pneepsa-uc.a.run.app/v1/admin';
  const TOKEN_KEY = 'admin_token';
  const ADMIN_KEY = 'admin_info';

  function __(key, fallback) {
    if (typeof globalThis.AdminI18n !== 'undefined' && globalThis.AdminI18n.t) {
      return globalThis.AdminI18n.t(key, fallback);
    }
    return fallback != null ? fallback : key;
  }
  // Admin UI language: i18n.js auto-boots on DOMContentLoaded (sidebar + login card toggles).

  // --- Auth helpers ---
  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setAuth(token, admin) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
  }
  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
  }
  function getAdmin() {
    try { return JSON.parse(localStorage.getItem(ADMIN_KEY)); } catch { return null; }
  }

  /** Keep in sync with functions/src/config/adminRoles.js */
  const ASSIGNABLE_ROLES = [
    'admin', 'bookings_manager', 'locations_manager', 'tickets_support', 'content_editor',
    'users_moderator', 'finance_manager', 'notifications_manager', 'support_lead', 'verifier',
  ];
  const ROLE_LABELS = {
    super_admin: 'Super Admin',
    admin: 'Admin (full)',
    bookings_manager: 'Bookings & fees',
    locations_manager: 'Locations',
    tickets_support: 'Tickets',
    content_editor: 'Categories & media',
    users_moderator: 'Users',
    finance_manager: 'Platform fees',
    notifications_manager: 'Notifications',
    support_lead: 'Tickets + users',
    verifier: 'Applications',
  };

  function roleLabel(r) {
    return __('role.' + r, ROLE_LABELS[r] || String(r).replace(/_/g, ' '));
  }

  // ✅ Cache for countries loaded from backend
  let cachedCountriesMap = null;
  function derivePermissionsFromRoles(roles) {
    if (!roles || !roles.length) return derivePermissionsFromRole('admin');
    const s = new Set();
    for (const r of roles) derivePermissionsFromRole(r).forEach((p) => s.add(p));
    return [...s];
  }
  function derivePermissionsFromRole(role) {
    const ALL = ['dashboard', 'categories', 'locations', 'app_config', 'professionals', 'platform_fees', 'bookings_admin', 'tickets', 'users', 'notifications', 'accounts'];
    const WO = ALL.filter((x) => x !== 'accounts');
    switch (role) {
      case 'super_admin': return [...ALL];
      case 'admin': return [...WO];
      case 'bookings_manager': return ['dashboard', 'matches', 'bookings_admin', 'platform_fees', 'professionals'];
      case 'locations_manager': return ['dashboard', 'locations'];
      case 'tickets_support': return ['dashboard', 'tickets'];
      case 'content_editor': return ['dashboard', 'categories'];
      case 'users_moderator': return ['dashboard', 'users'];
      case 'finance_manager': return ['dashboard', 'platform_fees'];
      case 'notifications_manager': return ['dashboard', 'notifications'];
      case 'support_lead': return ['dashboard', 'tickets', 'users'];
      case 'verifier': return ['dashboard', 'professionals'];
      default: return ['dashboard'];
    }
  }
  function viewToPermission(view) {
    const map = {
      dashboard: 'dashboard',
      categories: 'categories',
      locations: 'locations',
      settings: 'app_config',
      applications: 'professionals',
      'platform-fees': 'platform_fees',
      'bookings-simple': 'bookings_admin',
      'booking-lifecycle': 'bookings_admin',
      archive: 'bookings_admin',
      analytics: 'bookings_admin',
      tickets: 'tickets',
      users: 'users',
      notifications: 'notifications',
      accounts: 'accounts',
    };
    return map[view];
  }
  const VIEW_ORDER = ['dashboard', 'categories', 'locations', 'settings', 'applications', 'platform-fees', 'bookings-simple', 'booking-lifecycle', 'archive', 'analytics', 'tickets', 'users', 'notifications', 'accounts'];

  /** Breadcrumb i18n keys (matches sidebar groups). */
  const VIEW_BREADCRUMB = {
    dashboard: { sectionKey: 'bc.section.overview', pageKey: 'bc.page.dashboard' },
    categories: { sectionKey: 'bc.section.content', pageKey: 'bc.page.categories' },
    locations: { sectionKey: 'bc.section.content', pageKey: 'bc.page.locations' },
    settings: { sectionKey: 'bc.section.content', pageKey: 'bc.page.settings' },
    applications: { sectionKey: 'bc.section.professionals', pageKey: 'bc.page.applications' },
    'platform-fees': { sectionKey: 'bc.section.professionals', pageKey: 'bc.page.platformFees' },
    'bookings-simple': { sectionKey: 'bc.section.bookings', pageKey: 'bc.page.bookingsSimple' },
    'booking-lifecycle': { sectionKey: 'bc.section.bookings', pageKey: 'bc.page.lifecycle' },
    archive: { sectionKey: 'bc.section.bookings', pageKey: 'bc.page.archive' },
    analytics: { sectionKey: 'bc.section.bookings', pageKey: 'bc.page.analytics' },
    tickets: { sectionKey: 'bc.section.tickets', pageKey: 'bc.page.tickets' },
    users: { sectionKey: 'bc.section.usersComms', pageKey: 'bc.page.users' },
    notifications: { sectionKey: 'bc.section.usersComms', pageKey: 'bc.page.notifications' },
    accounts: { sectionKey: 'bc.section.system', pageKey: 'bc.page.accounts' },
  };

  const ADMIN_COUNTRY_SCOPE_KEY = 'admin_country_scope';
  window.__adminCurrentView = 'dashboard';
  let adminTimeFiltersInitialized = false;

  function getAdminCountryScope() {
    return (localStorage.getItem(ADMIN_COUNTRY_SCOPE_KEY) || '').trim().toUpperCase();
  }

  function appendCountryScopeParams(params) {
    const c = getAdminCountryScope();
    if (c) params.set('country', c);
  }

  function syncFeesFilterFromScope() {
    const code = getAdminCountryScope();
    const el = document.getElementById('fees-filter-country');
    if (!el) return;
    if (!code) {
      el.value = 'all';
      return;
    }
    const ok = [...el.options].some((o) => o.value === code);
    el.value = ok ? code : 'all';
  }

  function reloadCurrentViewForCountryScope() {
    const n = window.__adminCurrentView;
    if (n === 'bookings-simple') loadBookingsSimple(1);
    if (n === 'applications') {
      applicationsPage = 1;
      loadApplications();
    }
    if (n === 'users') {
      usersPage = 1;
      loadUsers();
    }
    if (n === 'platform-fees' && typeof window.loadPlatformFees === 'function') window.loadPlatformFees();
    if (n === 'archive') loadArchive(1);
    if (n === 'analytics') loadAnalytics();
  }

  async function refreshAdminCountryScopeBar() {
    const bar = document.getElementById('admin-scope-bar');
    const sel = document.getElementById('admin-scope-country');
    if (!bar || !sel) return;
    try {
      const res = await api('/countries');
      const countries = (res.data || []).filter((c) => c.is_active !== false);
      if (countries.length < 2) {
        hide(bar);
        return;
      }
      show(bar);
      const current = getAdminCountryScope();
      const parts = [`<option value="">${escapeHtml(__('scope.allCountries'))}</option>`];
      countries.forEach((c) => {
        const code = String(c.code || '').toUpperCase();
        const label = c.name_en || c.name || code;
        parts.push(
          `<option value="${escapeHtml(code)}"${code === current ? ' selected' : ''}>${escapeHtml(label)}</option>`,
        );
      });
      sel.innerHTML = parts.join('');
    } catch {
      hide(bar);
    }
  }

  function setArchiveRangeToCurrentUtcMonth() {
    const cy = new Date().getUTCFullYear();
    const cm = new Date().getUTCMonth() + 1;
    const pad = (n) => String(n).padStart(2, '0');
    const s = `${cy}-${pad(cm)}`;
    ['archive-from-year', 'archive-to-year'].forEach((id) => {
      const e = document.getElementById(id);
      if (e && [...e.options].some((o) => o.value === String(cy))) e.value = String(cy);
    });
    ['archive-from-month', 'archive-to-month'].forEach((id) => {
      const e = document.getElementById(id);
      if (e) e.value = String(cm);
    });
  }

  function archiveRangeFromSelects() {
    const fy = parseInt(document.getElementById('archive-from-year')?.value, 10);
    const fm = parseInt(document.getElementById('archive-from-month')?.value, 10);
    const ty = parseInt(document.getElementById('archive-to-year')?.value, 10);
    const tm = parseInt(document.getElementById('archive-to-month')?.value, 10);
    if (!fy || !fm || !ty || !tm) return { from: '', to: '' };
    const pad = (n) => String(n).padStart(2, '0');
    const from = `${fy}-${pad(fm)}-01`;
    const lastD = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
    const to = `${ty}-${pad(tm)}-${pad(lastD)}`;
    return { from, to };
  }

  function relocalizeArchiveMonthSelects() {
    ['archive-from-month', 'archive-to-month'].forEach((id) => {
      const s = document.getElementById(id);
      if (!s) return;
      const cur = s.value;
      [...s.querySelectorAll('option')].forEach((o) => {
        const m = parseInt(o.value, 10);
        if (m >= 1 && m <= 12) o.textContent = __(`month.${m}`);
      });
      if (cur) s.value = cur;
    });
  }

  function initAdminTimeFilterSelects() {
    if (adminTimeFiltersInitialized) return;
    adminTimeFiltersInitialized = true;
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    ['archive-from-month', 'archive-to-month'].forEach((id) => {
      const s = document.getElementById(id);
      if (!s || s.options.length) return;
      for (let m = 1; m <= 12; m++) {
        const o = document.createElement('option');
        o.value = String(m);
        o.textContent = __(`month.${m}`, monthNames[m - 1]);
        s.appendChild(o);
      }
    });
    const cy = new Date().getUTCFullYear();
    ['archive-from-year', 'archive-to-year', 'analytics-year'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el || el.options.length) return;
      for (let yr = cy + 1; yr >= cy - 8; yr--) {
        const o = document.createElement('option');
        o.value = String(yr);
        o.textContent = String(yr);
        el.appendChild(o);
      }
      el.value = String(cy);
    });
    setArchiveRangeToCurrentUtcMonth();
    const am = document.getElementById('analytics-month');
    if (am) am.value = String(new Date().getUTCMonth() + 1);
  }

  function setAnalyticsYearMonthEnabled(enabled) {
    document.getElementById('analytics-year')?.toggleAttribute('disabled', !enabled);
    document.getElementById('analytics-month')?.toggleAttribute('disabled', !enabled);
  }

  
  function getAdminPermissions() {
    const admin = getAdmin();
    if (!admin) return [];
    if (Array.isArray(admin.permissions) && admin.permissions.length) return admin.permissions;
    if (Array.isArray(admin.roles) && admin.roles.length) return derivePermissionsFromRoles(admin.roles);
    return derivePermissionsFromRole(admin.role);
  }
  function ensureAdminPermissionsPersisted() {
    const admin = getAdmin();
    if (!admin) return null;
    const token = getToken();
    if (!Array.isArray(admin.permissions) || !admin.permissions.length) {
      const perms = Array.isArray(admin.roles) && admin.roles.length
        ? derivePermissionsFromRoles(admin.roles)
        : derivePermissionsFromRole(admin.role);
      const next = { ...admin, permissions: perms };
      if (token) localStorage.setItem(ADMIN_KEY, JSON.stringify(next));
      return next;
    }
    return admin;
  }
  function canAccessView(name) {
    const p = viewToPermission(name);
    if (!p) return true;
    return getAdminPermissions().includes(p);
  }
  function dispatchViewByRole(admin) {
    const perms = admin?.permissions?.length
      ? admin.permissions
      : (Array.isArray(admin?.roles) && admin.roles.length
        ? derivePermissionsFromRoles(admin.roles)
        : derivePermissionsFromRole(admin?.role));
    for (const v of VIEW_ORDER) {
      const p = viewToPermission(v);
      if (!p) return v;
      if (perms.includes(p)) return v;
    }
    return 'dashboard';
  }
  function hideEmptyNavSections() {
    const nav = document.querySelector('.sidebar nav');
    if (!nav) return;
    const children = [...nav.children];
    let i = 0;
    while (i < children.length) {
      const el = children[i];
      if (!el.classList.contains('nav-section-label')) {
        i += 1;
        continue;
      }
      i += 1;
      let visible = false;
      while (i < children.length && !children[i].classList.contains('nav-section-label')) {
        const node = children[i];
        if (node.matches && node.matches('a[data-view]') && node.style.display !== 'none') visible = true;
        i += 1;
      }
      el.style.display = visible ? '' : 'none';
    }
  }
  function applyNavPermissions(perms) {
    document.querySelectorAll('.sidebar nav a[data-permission]').forEach((a) => {
      const need = a.dataset.permission;
      const ok = perms.includes(need);
      a.style.display = ok ? '' : 'none';
      a.classList.toggle('nav-hidden', !ok);
    });
    hideEmptyNavSections();
  }
  function getSelectedAccRoles() {
    const box = document.getElementById('acc-roles-checkboxes');
    if (!box) return [];
    return [...box.querySelectorAll('input[type="checkbox"]:checked')].map((cb) => cb.value);
  }
  /** @param {'create'|'edit'} mode @param {{ role?: string, roles?: string[] }} [account] */
  function fillAccRoleCheckboxes(mode, account) {
    const container = document.getElementById('acc-roles-checkboxes');
    if (!container) return;
    container.innerHTML = '';
    if (mode === 'edit' && account && account.role === 'super_admin') {
      container.innerHTML = `<p style="margin:0;font-size:0.85rem;color:var(--text-mid)">${escapeHtml(__('acc.superAdminFixed'))}</p>`;
      return;
    }
    const selected = new Set(
      mode === 'edit' && account && Array.isArray(account.roles) && account.roles.length
        ? account.roles.filter((r) => ASSIGNABLE_ROLES.includes(r))
        : mode === 'edit' && account && account.role && ASSIGNABLE_ROLES.includes(account.role)
          ? [account.role]
          : ['admin'],
    );
    ASSIGNABLE_ROLES.forEach((r) => {
      const id = `acc-role-cb-${r}`;
      const lab = document.createElement('label');
      lab.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;font-weight:500;text-transform:none;letter-spacing:0;font-size:0.8125rem';
      lab.innerHTML = `<input type="checkbox" id="${id}" value="${r}" ${selected.has(r) ? 'checked' : ''} style="width:auto;margin:0;accent-color:var(--purple)"> <span>${escapeHtml(roleLabel(r))}</span>`;
      container.appendChild(lab);
    });
  }
  let sidebarNavBound = false;
  function bindSidebarNavOnce() {
    if (sidebarNavBound) return;
    sidebarNavBound = true;
    document.querySelector('.sidebar nav')?.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-view]');
      if (!a) return;
      e.preventDefault();
      const view = a.dataset.view;
      if (!view) return;
      if (!canAccessView(view)) {
        toast(__('toast.navNoAccess'), 'error');
        return;
      }
      showView(view);
    });
  }

  function findToggleBadge(entity, id) {
    const prefix = `${entity}-`;
    const full = prefix + id;
    let found = null;
    document.querySelectorAll('[data-toggle-active]').forEach((el) => {
      const v = el.getAttribute('data-toggle-active');
      if (v === full) found = el;
    });
    return found;
  }

  /** Quick toggle Active status – one click, no modal. Entity: 'governorate' | 'city' | 'category' | 'country' */
  async function toggleActive(entity, id, currentValue, onSuccess) {
    const newVal = !currentValue;
    const plural = { governorate: 'governorates', city: 'cities', category: 'categories', country: 'countries' }[entity] || entity + 's';
    const path = `/${plural}/${id}`;
    const badge = findToggleBadge(entity, id);
    const wasActive = currentValue;
    if (badge) {
      badge.classList.add('badge-loading');
      badge.textContent = newVal ? __('state.active') : __('state.inactive');
      badge.className = 'badge badge-toggle badge-loading ' + (newVal ? 'badge-green' : 'badge-gray');
    }
    try {
      await api(path, { method: 'PUT', body: JSON.stringify({ is_active: newVal }) });
      toast(newVal ? __('state.active') : __('state.inactive'), 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      toast(err.message || 'Failed to update', 'error');
      if (badge) {
        badge.textContent = wasActive ? __('state.active') : __('state.inactive');
        badge.className = 'badge badge-toggle ' + (wasActive ? 'badge-green' : 'badge-gray');
      }
    }
    if (badge) badge.classList.remove('badge-loading');
  }

  // --- Toast ---
  function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = typeof message === 'string' ? message : (message?.message || 'Unknown error');
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
  window.toast = toast;

  function parseApiError(data, status) {
    if (!data) return `Request failed (${status || 'unknown'})`;
    if (typeof data.error === 'object' && data.error?.message) return data.error.message;
    if (typeof data.error === 'string') return data.error;
    if (data.message) return data.message;
    if (data.errors && Array.isArray(data.errors)) return data.errors.map(e => e.message || e).join('; ');
    if (data.errors && typeof data.errors === 'object') return Object.values(data.errors).flat().join('; ');
    return `Request failed (${status})`;
  }

  async function api(path, options = {}) {
    const token = getToken();
    const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
    const method = (options.method || 'GET').toUpperCase();
    const hasBody = options.body && options.body !== '{}';
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (hasBody) headers['Content-Type'] = 'application/json';

    let res, text, data;
    try {
      res = await fetch(url, { ...options, headers });
      text = await res.text();
    } catch (err) {
      throw new Error(err.message || 'Network error. Check your connection and try again.');
    }

    try { data = text ? JSON.parse(text) : null; }
    catch { throw new Error(text || `Server returned invalid response (${res.status})`); }

    if (!res.ok) {
      if (res.status === 401) { clearAuth(); showLogin(); throw new Error('Session expired. Please sign in again.'); }
      if (res.status === 403) throw new Error('You do not have permission for this action.');
      throw new Error(parseApiError(data, res.status));
    }
    return data;
  }

  function adminDisplayNameFromUser(u) {
    if (!u) return '';
    if (u.is_professional && (u.professional_name || '').trim()) return String(u.professional_name).trim();
    const fn = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
    if (fn) return fn;
    return (u.username || '').trim();
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  /** ISO 3166-1 alpha-2 → Unicode regional indicators (flag emoji). */
  function regionalIndicatorFlagFromAlpha2(code) {
    const up = String(code || '').replace(/[^A-Za-z]/g, '').toUpperCase();
    if (up.length !== 2) return '';
    const base = 0x1f1e6;
    const o = (ch) => ch.charCodeAt(0) - 65;
    const a = o(up[0]);
    const b = o(up[1]);
    if (a < 0 || a > 25 || b < 0 || b > 25) return '';
    return String.fromCodePoint(base + a, base + b);
  }

  function countryFlagForDisplay(c) {
    return regionalIndicatorFlagFromAlpha2(String(c.code || c.key || '')) || '';
  }

  /** Booking overlap_slots use day_of_week + HH:mm strings (not Unix ms). */
  function formatBookingSlotLabel(b) {
    const slot = b.overlap_slots && b.overlap_slots[0];
    if (!slot) return '—';
    const dayRaw = (slot.day_of_week || '').toString().trim();
    const day = dayRaw
      ? dayRaw.charAt(0).toUpperCase() + dayRaw.slice(1).toLowerCase()
      : '';
    const st = slot.start_time || '';
    const et = slot.end_time || '';
    if (!day && !st && !et) return '—';
    const timePart = st && et ? `${st}–${et}` : st || et || '';
    return [day, timePart].filter(Boolean).join(' ').trim() || '—';
  }

  function show(el) { el?.classList?.remove('hidden'); }
  function hide(el) { el?.classList?.add('hidden'); }

  function formatDate(ts) {
    if (!ts) return '-';
    const d = new Date(typeof ts === 'number' ? ts : ts._seconds ? ts._seconds * 1000 : ts);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatDateShort(ts) {
    if (!ts) return '-';
    const d = new Date(typeof ts === 'number' ? ts : ts._seconds ? ts._seconds * 1000 : ts);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
  }

  function animateCounter(el, target, duration) {
    const start = performance.now();
    const from = 0;
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(from + (target - from) * eased).toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // --- Platform Fees (defined early for showView) ---
  let feesData = null;
  window.loadPlatformFees = async function() {
    // ✅ Ensure countries are loaded first
    if (!cachedCountriesMap) {
      try {
        const res = await api('/countries');
        const countries = res.data || [];
        cachedCountriesMap = new Map();
        countries.forEach(c => {
          if (c.code) {
            cachedCountriesMap.set(c.code, c.name_en || c.name || c.code);
          }
        });
      } catch (err) {
        console.error('Failed to load countries:', err);
        cachedCountriesMap = new Map();
      }
    }
    const el = document.getElementById('fees-tbody');
    const summaryEl = document.getElementById('fees-summary');
    if (!el || !summaryEl) {
      console.error('Platform fees elements not found');
      return;
    }

    const feesFilterPreserve = {
      country: document.getElementById('fees-filter-country')?.value ?? 'all',
      gov: document.getElementById('fees-filter-governorate')?.value ?? 'all',
      city: document.getElementById('fees-filter-city')?.value ?? 'all',
      status: document.getElementById('fees-filter-status')?.value ?? 'all',
      search: document.getElementById('fees-search')?.value ?? '',
    };

    summaryEl.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-mid);grid-column:1/-1">${escapeHtml(__('common.loading'))}</div>`;
    el.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px">${escapeHtml(__('common.loading'))}</td></tr>`;

    try {
      const yEl = document.getElementById('fees-invoices-year');
      const mEl = document.getElementById('fees-invoices-month');
      let feesPath = '/platform-fees';
      if (yEl && mEl && yEl.value && yEl.value !== 'all' && mEl.value) {
        feesPath = `/platform-fees?year=${encodeURIComponent(yEl.value)}&month=${encodeURIComponent(mEl.value)}`;
      }
      const res = await api(feesPath);

      feesData = res.data;
      const { summary, professionals } = feesData;

      const currency = 'EGP'; // Default currency
      const bp = summary.billing_period;
      const periodBanner = bp
        ? `<div class="fees-summary-card" style="grid-column:1/-1;padding:12px 14px">
            <span style="color:var(--text-mid);font-size:0.9rem;line-height:1.45">${escapeHtml(
              __('fees.periodTableHint')
                .replace('{y}', String(bp.year))
                .replace('{m}', String(bp.month).padStart(2, '0')),
            )}</span>
          </div>`
        : '';
      const confirmedSub = bp ? __('fees.sumConfirmedSubPeriod') : __('fees.sumConfirmedSub');
      summaryEl.innerHTML = `
        ${periodBanner}
        <div class="fees-summary-card highlight">
          <div class="label">${escapeHtml(__('fees.sumDue'))}</div>
          <div class="value">${currency} ${summary.total_due_all_time.toFixed(2)}</div>
          <div class="subtitle">${escapeHtml(__('fees.sumProCount').replace('{n}', String(summary.professionals_count)))}</div>
        </div>
        <div class="fees-summary-card">
          <div class="label">${escapeHtml(__('fees.sumRate'))}</div>
          <div class="value">${summary.fee_rate_percentage != null && summary.fee_rate_percentage > 0 ? `${summary.fee_rate_percentage}%` : escapeHtml(__('fees.sumRateNotSet'))}</div>
          <div class="subtitle">${escapeHtml(summary.fees_enabled ? __('fees.sumRateSub') : __('fees.sumRateSubOff'))}</div>
        </div>
        <div class="fees-summary-card">
          <div class="label">${escapeHtml(__('fees.sumConfirmed'))}</div>
          <div class="value">${currency} ${summary.total_confirmed_all_time.toFixed(2)}</div>
          <div class="subtitle">${escapeHtml(confirmedSub)}</div>
        </div>
        <div class="fees-summary-card">
          <div class="label">${escapeHtml(__('fees.sumSuspended'))}</div>
          <div class="value">${summary.suspended_count}</div>
          <div class="subtitle">${escapeHtml(__('fees.sumSuspendedSub'))}</div>
        </div>
      `;
      
      renderFeesProfessionals(professionals);

      // Invoices export controls (month/year) — filled once, can be used immediately.
      initPlatformFeesInvoiceExportControls();
      
      // Populate governorate and city filters
      await populateLocationFilters(professionals);

      const setSelIfHas = (id, val) => {
        const sel = document.getElementById(id);
        if (!sel || val == null) return;
        if ([...sel.options].some((o) => o.value === val)) sel.value = val;
      };
      setSelIfHas('fees-filter-country', feesFilterPreserve.country);
      syncFeesFilterFromScope();
      setSelIfHas('fees-filter-governorate', feesFilterPreserve.gov);
      setSelIfHas('fees-filter-city', feesFilterPreserve.city);
      setSelIfHas('fees-filter-status', feesFilterPreserve.status);
      const searchElRestore = document.getElementById('fees-search');
      if (searchElRestore) searchElRestore.value = feesFilterPreserve.search;

      // Setup event listeners for all filters
      const searchEl = document.getElementById('fees-search');
      const filterStatusEl = document.getElementById('fees-filter-status');
      const filterCountryEl = document.getElementById('fees-filter-country');
      const filterGovEl = document.getElementById('fees-filter-governorate');
      const filterCityEl = document.getElementById('fees-filter-city');
      
      if (searchEl) {
        searchEl.removeEventListener('input', filterFees);
        searchEl.addEventListener('input', filterFees);
      }
      if (filterStatusEl) {
        filterStatusEl.removeEventListener('change', filterFees);
        filterStatusEl.addEventListener('change', filterFees);
      }
      if (filterCountryEl) {
        filterCountryEl.removeEventListener('change', filterFees);
        filterCountryEl.addEventListener('change', filterFees);
      }
      if (filterGovEl) {
        filterGovEl.removeEventListener('change', filterFees);
        filterGovEl.addEventListener('change', filterFees);
      }
      if (filterCityEl) {
        filterCityEl.removeEventListener('change', filterFees);
        filterCityEl.addEventListener('change', filterFees);
      }

      filterFees();
    } catch (err) {
      console.error('Error loading platform fees:', err);
      summaryEl.innerHTML = `<div style="padding:40px;text-align:center;color:var(--red);grid-column:1/-1">${escapeHtml(err.message)}</div>`;
      el.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--red)">${escapeHtml(__('fees.failedLoad'))}</td></tr>`;
      toast(err.message, 'error');
    }
  };

  function relocalizeFeesInvoiceMonthSelect() {
    const m = document.getElementById('fees-invoices-month');
    if (!m) return;
    const cur = m.value;
    for (let i = 1; i <= 12; i += 1) {
      const opt = m.querySelector(`option[value="${i}"]`);
      if (opt) opt.textContent = __(`month.${i}`);
    }
    if (cur && [...m.options].some((o) => o.value === cur)) m.value = cur;
  }

  function initPlatformFeesInvoiceExportControls() {
    const y = document.getElementById('fees-invoices-year');
    const m = document.getElementById('fees-invoices-month');
    const btnPdf = document.getElementById('fees-invoices-export-pdf');
    const btnCsv = document.getElementById('fees-invoices-export-csv');
    if (!y || !m || (!btnPdf && !btnCsv)) return;

    if (!y.dataset.inited) {
      const now = new Date();
      const cy = now.getUTCFullYear();
      const cm = now.getUTCMonth() + 1;
      const yearOpts = [`<option value="all">${escapeHtml(__('fees.periodAllTime'))}</option>`];
      for (let yy = cy; yy >= cy - 10; yy -= 1) {
        yearOpts.push(`<option value="${yy}">${yy}</option>`);
      }
      y.innerHTML = yearOpts.join('');
      y.value = 'all';

      m.innerHTML = '';
      for (let mm = 1; mm <= 12; mm += 1) {
        m.innerHTML += `<option value="${mm}">${escapeHtml(__('month.' + mm))}</option>`;
      }
      m.value = String(cm);
      m.disabled = true;

      const onPeriodChange = debounce(() => {
        if (typeof window.loadPlatformFees === 'function') window.loadPlatformFees();
      }, 400);
      y.addEventListener('change', () => {
        m.disabled = y.value === 'all';
        onPeriodChange();
      });
      m.addEventListener('change', onPeriodChange);

      y.dataset.inited = '1';
    } else {
      relocalizeFeesInvoiceMonthSelect();
      const allOpt = y.querySelector('option[value="all"]');
      if (allOpt) allOpt.textContent = __('fees.periodAllTime');
    }
    relocalizeFeesInvoiceMonthSelect();
    if (y.value === 'all') m.disabled = true;
    else m.disabled = false;

    async function exportInvoices(kind) {
      if (y.value === 'all') {
        toast(__('fees.exportNeedPeriod'), 'error');
        return;
      }
      const ext = kind === 'pdf' ? 'pdf' : 'csv';
      const path = kind === 'pdf' ? '/invoices/platform-fees.pdf' : '/invoices/platform-fees.csv';
      try {
        const params = new URLSearchParams();
        params.set('year', y.value);
        params.set('month', m.value);
        appendCountryScopeParams(params);
        const url = `${API_BASE}${path}?${params.toString()}`;
        const token = getToken();
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Export failed (${res.status})`);
        const blob = await res.blob();
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = `platform-fees-invoices-${y.value}-${String(m.value).padStart(2, '0')}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
      } catch (e) {
        toast(e.message || `Failed to export ${ext.toUpperCase()}`, 'error');
      }
    }

    if (btnPdf) btnPdf.onclick = () => exportInvoices('pdf');
    if (btnCsv) btnCsv.onclick = () => exportInvoices('csv');
  }
  
  function renderFeesProfessionals(professionals) {
    const el = document.getElementById('fees-tbody');
    if (!el) return;
    
    if (!professionals || professionals.length === 0) {
      el.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-mid)">${escapeHtml(__('fees.emptyTable'))}</td></tr>`;
      return;
    }
    
    el.innerHTML = professionals.map(p => {
      const displayName = p.professional_name || p.username || '—';
      const amountDue = p.amount_due || 0;
      const amountClass = amountDue > 100 ? 'amount-due high' : 'amount-due';
      const hasBranches = Array.isArray(p.branches_fees) && p.branches_fees.length > 0;
      
      const cityName = p.professional_city_name || p.professional_city || '';
      const govName = p.professional_governorate_name || p.professional_governorate || '';
      const location = [cityName, govName].filter(Boolean).join(', ') || '—';
      
      const pctLabel = (p.fee_percentage_effective != null && Number(p.fee_percentage_effective) > 0)
        ? `${Number(p.fee_percentage_effective)}%`
        : '—';
      const pctSub = p.fee_source_effective ? ` · ${escapeHtml(String(p.fee_source_effective))}` : '';

      const branchesRow = hasBranches ? `
        <tr class="fees-branches-row hidden" data-branches-row="${escapeHtml(p.uid)}">
          <td colspan="8" style="padding:0 0 14px 0">
            <div style="margin:6px 10px 0 10px;padding:12px 12px;border-radius:12px;border:1px solid rgba(139,92,246,0.18);background:rgba(139,92,246,0.04)">
              <div style="font-weight:800;margin-bottom:10px;font-size:0.9rem;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
                <span>Branches</span>
                <span style="font-weight:600;color:var(--text-mid)">Current fee: ${escapeHtml(pctLabel)}${pctSub}</span>
              </div>
              <div style="overflow:auto">
                <table style="width:100%;border-collapse:collapse;font-size:0.9rem">
                  <thead>
                    <tr style="text-align:left;color:var(--text-mid);font-size:0.8rem">
                      <th style="padding:6px 8px">Branch</th>
                      <th style="padding:6px 8px">Fee %</th>
                      <th style="padding:6px 8px">Recorded bookings</th>
                      <th style="padding:6px 8px">Recorded total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${p.branches_fees.map((b) => {
                      const bl = [b.professional_city_name || b.professional_city || '', b.professional_governorate_name || b.professional_governorate || '']
                        .filter(Boolean)
                        .join(', ');
                      const bName = b.name || b.id || '—';
                      const bPct = (b.fee_percentage != null && Number(b.fee_percentage) > 0) ? `${Number(b.fee_percentage)}%` : '—';
                      const bPctSub = b.fee_source ? ` · ${escapeHtml(String(b.fee_source))}` : '';
                      return `
                        <tr>
                          <td style="padding:6px 8px">
                            <div style="font-weight:700">${escapeHtml(String(bName))}</div>
                            ${bl ? `<div style="font-size:0.8rem;color:var(--text-mid);margin-top:2px">📍 ${escapeHtml(bl)}</div>` : ''}
                          </td>
                          <td style="padding:6px 8px;white-space:nowrap">${escapeHtml(bPct)}${bPctSub}</td>
                          <td style="padding:6px 8px">${escapeHtml(String(b.recorded_bookings ?? 0))}</td>
                          <td style="padding:6px 8px">${escapeHtml(String((Number(b.recorded_total) || 0).toFixed(2)))}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      ` : '';

      return `
        <tr class="${p.is_suspended ? 'suspended' : ''}">
          <td class="professional-cell">
            <div>${escapeHtml(displayName)}</div>
            <div class="username">@${escapeHtml(p.username || '—')}</div>
            <div style="font-size:0.75rem;color:var(--text-light);margin-top:2px">📍 ${escapeHtml(location)}</div>
            <div style="font-size:0.75rem;color:var(--text-light);margin-top:2px">💸 ${escapeHtml(pctLabel)}${pctSub}</div>
            ${p.uid ? `<div style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap">
              <code style="font-size:0.65rem;background:var(--gray-50);padding:2px 6px;border-radius:4px;color:var(--gray-500);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(p.uid)}">${escapeHtml(p.uid)}</code>
              <button type="button" class="btn-copy-fee-uid" data-uid="${escapeHtml(p.uid)}" title="${escapeHtml(__('fees.copyUidTitle'))}" style="background:none;border:none;cursor:pointer;color:var(--purple);font-size:12px;padding:2px">&#10697;</button>
            </div>` : ''}
          </td>
          <td class="contact-cell">
            ${escapeHtml(p.email || '—')}<br>
            <span style="font-size:0.8rem;color:var(--text-light)">${escapeHtml(p.country || '—')}</span>
          </td>
          <td class="amount-cell">${p.recorded_bookings}</td>
          <td class="amount-cell">${p.recorded_total.toFixed(2)}</td>
          <td class="amount-cell">${p.confirmed_total.toFixed(2)}</td>
          <td class="amount-cell ${amountClass}">${amountDue.toFixed(2)}</td>
          <td>
            <span class="status-badge ${p.is_suspended ? 'suspended' : 'active'}">
              ${escapeHtml(p.is_suspended ? __('fees.statusSuspended') : __('fees.statusActive'))}
            </span>
          </td>
          <td class="actions-cell">
            ${hasBranches ? `<button class="btn-small btn-secondary" data-toggle-branches="${escapeHtml(p.uid)}">${escapeHtml(__('common.details') || 'Details')}</button>` : ''}
            ${p.is_suspended ? `
              <button class="btn-small btn-release" data-release="${p.uid}">${escapeHtml(__('fees.btnRelease'))}</button>
            ` : ''}
          </td>
        </tr>
        ${branchesRow}
      `;
    }).join('');
    
    el.querySelectorAll('[data-release]').forEach(btn => {
      btn.addEventListener('click', () => releaseSuspension(btn.dataset.release));
    });
    el.querySelectorAll('[data-toggle-branches]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const uid = btn.getAttribute('data-toggle-branches');
        if (!uid) return;
        const row = el.querySelector(`[data-branches-row="${CSS.escape(uid)}"]`);
        if (!row) return;
        row.classList.toggle('hidden');
      });
    });
    el.querySelectorAll('.btn-copy-fee-uid').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const uid = b.getAttribute('data-uid');
        if (!uid) return;
        navigator.clipboard.writeText(uid).then(() => {
          b.textContent = '✓';
          setTimeout(() => { b.innerHTML = '&#10697;'; }, 1200);
          toast(__('toast.uidCopied'), 'success');
        });
      });
    });
  }
  
  async function populateLocationFilters(professionals) {
    const countryMap = new Map();
    const govMap = new Map();
    const cityMap = new Map();

    // ✅ Load countries from backend if not cached
    if (!cachedCountriesMap) {
      try {
        const res = await api('/countries');
        const countries = res.data || [];
        cachedCountriesMap = new Map();
        countries.forEach(c => {
          if (c.code) {
            cachedCountriesMap.set(c.code, c.name_en || c.name || c.code);
          }
        });
      } catch (err) {
        console.error('âŒ Failed to load countries:', err);
        cachedCountriesMap = new Map(); // Empty map to avoid retry
      }
    }
    
    professionals.forEach(p => {
      if (p.country) {
        const countryName = cachedCountriesMap.get(p.country) || p.country;
        countryMap.set(p.country, countryName);
      }
      if (p.professional_governorate && p.professional_governorate_name) {
        govMap.set(p.professional_governorate, p.professional_governorate_name);
      }
      if (p.professional_city && p.professional_city_name) {
        cityMap.set(p.professional_city, p.professional_city_name);
      }
    });

    const countrySelect = document.getElementById('fees-filter-country');
    const govSelect = document.getElementById('fees-filter-governorate');
    const citySelect = document.getElementById('fees-filter-city');
    
    if (countrySelect) {
      const countryOptions = Array.from(countryMap.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([key, name]) => `<option value="${escapeHtml(key)}">${escapeHtml(name)}</option>`)
        .join('');
      countrySelect.innerHTML = `<option value="all">${escapeHtml(__('fees.allCountries'))}</option>` + countryOptions;
      syncFeesFilterFromScope();
    }

    if (govSelect) {
      const govOptions = Array.from(govMap.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([key, name]) => `<option value="${escapeHtml(key)}">${escapeHtml(name)}</option>`)
        .join('');
      govSelect.innerHTML = `<option value="all">${escapeHtml(__('fees.allGovernorates'))}</option>` + govOptions;
    }

    if (citySelect) {
      const cityOptions = Array.from(cityMap.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([key, name]) => `<option value="${escapeHtml(key)}">${escapeHtml(name)}</option>`)
        .join('');
      citySelect.innerHTML = `<option value="all">${escapeHtml(__('fees.allCities'))}</option>` + cityOptions;
    }
  }

  window.clearFeesFilters = function() {
    document.getElementById('fees-search').value = '';
    document.getElementById('fees-filter-status').value = 'all';
    localStorage.removeItem(ADMIN_COUNTRY_SCOPE_KEY);
    const scopeSel = document.getElementById('admin-scope-country');
    if (scopeSel) scopeSel.value = '';
    document.getElementById('fees-filter-country').value = 'all';
    document.getElementById('fees-filter-governorate').value = 'all';
    document.getElementById('fees-filter-city').value = 'all';
    filterFees();
  };
  
  function filterFees() {
    if (!feesData) return;
    const search = document.getElementById('fees-search')?.value.toLowerCase() || '';
    const filterStatus = document.getElementById('fees-filter-status')?.value || 'all';
    const filterCountry = document.getElementById('fees-filter-country')?.value || 'all';
    const filterGov = document.getElementById('fees-filter-governorate')?.value || 'all';
    const filterCity = document.getElementById('fees-filter-city')?.value || 'all';
    
    let filtered = feesData.professionals;
    
    // Search filter
    if (search) {
      filtered = filtered.filter(p => 
        (p.username || '').toLowerCase().includes(search) ||
        (p.professional_name || '').toLowerCase().includes(search) ||
        (p.email || '').toLowerCase().includes(search)
      );
    }
    
    // Status filter
    if (filterStatus === 'due') {
      filtered = filtered.filter(p => p.amount_due > 0);
    } else if (filterStatus === 'suspended') {
      filtered = filtered.filter(p => p.is_suspended);
    } else if (filterStatus === 'active') {
      filtered = filtered.filter(p => !p.is_suspended && p.amount_due === 0);
    }
    
    // Country filter
    if (filterCountry !== 'all') {
      filtered = filtered.filter(p => p.country === filterCountry);
    }
    
    // Governorate filter
    if (filterGov !== 'all') {
      filtered = filtered.filter(p => p.professional_governorate === filterGov);
    }
    
    // City filter
    if (filterCity !== 'all') {
      filtered = filtered.filter(p => p.professional_city === filterCity);
    }
    
    renderFeesProfessionals(filtered);
  }
  
  async function releaseSuspension(uid) {
    if (!confirm(__('fees.releaseConfirm'))) return;
    try {
      await api('/platform-fees/release-suspension', { 
        method: 'POST', 
        body: JSON.stringify({ professional_id: uid }) 
      });
      toast(__('fees.releasedToast'), 'success');
      window.loadPlatformFees();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  // --- Navigation ---
  function setActiveNav(name) {
    document.querySelectorAll('.sidebar nav a').forEach(a => {
      a.classList.toggle('active', a.dataset.view === name);
    });
  }

  function showView(name, depth = 0) {
    if (!canAccessView(name)) {
      if (depth > 5) return;
      toast(__('toast.noSectionAccess'), 'error');
      const admin = ensureAdminPermissionsPersisted() || getAdmin();
      const fb = dispatchViewByRole(admin);
      if (fb !== name) return showView(fb, depth + 1);
      return;
    }
    window.__adminCurrentView = name;
    document.querySelectorAll('.panel').forEach(p => hide(p));
    const panel = document.getElementById(`${name}-view`);
    if (panel) show(panel);
    setActiveNav(name);
    initAdminTimeFilterSelects();

    if (name === 'dashboard') loadDashboard();
    if (name === 'categories') loadCategories();
    if (name === 'locations') loadLocations();
    if (name === 'settings') loadAppSettings();
    if (name === 'bookings-simple') loadBookingsSimple();
    if (name === 'applications') loadApplications();
    if (name === 'users') loadUsers();
    if (name === 'notifications') initNotifications();
    if (name === 'accounts') loadAccounts();
    if (name === 'tickets') loadTickets();
    if (name === 'platform-fees') {
      if (typeof window.loadPlatformFees === 'function') {
        window.loadPlatformFees();
      } else {
        console.error('loadPlatformFees not defined yet');
      }
    }
    if (name === 'booking-lifecycle') loadBookingLifecycle();
    if (name === 'archive') loadArchive(1);
    if (name === 'analytics') loadAnalytics();

    updateAdminBreadcrumb(name);
  }

  function updateAdminBreadcrumb(viewName) {
    const textEl = document.getElementById('admin-breadcrumb-text');
    const bar = document.getElementById('admin-breadcrumb');
    if (!textEl || !bar) return;
    const b = VIEW_BREADCRUMB[viewName];
    if (!b) {
      textEl.innerHTML = '';
      return;
    }
    textEl.innerHTML = `<span class="crumb-section">${escapeHtml(__(b.sectionKey))}</span><span class="crumb-sep" aria-hidden="true">/</span><span class="crumb-current">${escapeHtml(__(b.pageKey))}</span>`;
  }

  // --- Login ---
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errEl = document.getElementById('login-error');
    const btn = e.target.querySelector('button[type="submit"]');
    errEl.textContent = '';
    hide(errEl);
    btn.textContent = __('login.signingIn');
    btn.disabled = true;

    try {
      const res = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      if (res.success && res.data) {
        const rolesList = Array.isArray(res.data.roles) && res.data.roles.length
          ? res.data.roles
          : (res.data.role ? [res.data.role] : ['admin']);
        setAuth(res.data.token, {
          id: res.data.adminId,
          username: res.data.username,
          role: res.data.role,
          roles: rolesList,
          permissions: res.data.permissions && res.data.permissions.length
            ? res.data.permissions
            : derivePermissionsFromRoles(rolesList),
        });
        showMain();
        initAdminTimeFilterSelects();
        refreshAdminCountryScopeBar();
      } else {
        throw new Error('Invalid response');
      }
    } catch (err) {
      const msg = err.message || 'Login failed';
      errEl.textContent = msg;
      show(errEl);
      toast(msg, 'error');
    } finally {
      btn.textContent = __('login.submit');
      btn.disabled = false;
    }
  });

  // --- Logout ---
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearAuth();
    showLogin();
  });

  function showLogin() {
    hide(document.getElementById('main-view'));
    show(document.getElementById('login-view'));
    document.getElementById('password').value = '';
  }

  function showMain() {
    hide(document.getElementById('login-view'));
    show(document.getElementById('main-view'));

    const admin = ensureAdminPermissionsPersisted() || getAdmin();
    const adminInfo = document.getElementById('admin-info');
    const adminAvatar = document.getElementById('admin-avatar');
    if (admin) {
      const rlist = Array.isArray(admin.roles) && admin.roles.length ? admin.roles : [admin.role].filter(Boolean);
      const roleLine = rlist.map((r) => roleLabel(r)).join(' · ');
      adminInfo.textContent = `${admin.username} · ${roleLine}`;
      if (adminAvatar) adminAvatar.textContent = admin.username[0].toUpperCase();
    }

    bindSidebarNavOnce();
    try {
      if (localStorage.getItem('weino_admin_sidebar_collapsed') === '1') {
        document.getElementById('main-view')?.classList.add('desktop-sidebar-collapsed');
        const cbtn = document.getElementById('sidebar-desktop-collapse');
        if (cbtn) cbtn.setAttribute('aria-expanded', 'false');
      } else {
        document.getElementById('main-view')?.classList.remove('desktop-sidebar-collapsed');
        const cbtn = document.getElementById('sidebar-desktop-collapse');
        if (cbtn) cbtn.setAttribute('aria-expanded', 'true');
      }
    } catch (_) {}
    const perms = admin
      ? (admin.permissions
        || (Array.isArray(admin.roles) && admin.roles.length
          ? derivePermissionsFromRoles(admin.roles)
          : derivePermissionsFromRole(admin.role)))
      : [];
    applyNavPermissions(perms);

    const defaultView = dispatchViewByRole(admin);
    showView(defaultView);
  }

  // --- Dashboard ---
  window.loadDashboard = async function () {
    const el = document.getElementById('dashboard-stats');
    el.innerHTML = `<div class="loading">${escapeHtml(__('dash.loading'))}</div>`;

    try {
      const statsRes = await api('/stats');
      const d = statsRes.data || {};
      const catCount = d.categories ?? 0;
      const appCount = d.pendingApplications ?? 0;
      const userTotal = d.users ?? 0;
      const matchTotal = d.matches ?? 0;
      const bookingsCount = d.bookings != null ? d.bookings : matchTotal;
      const otherMatchesCount =
        d.non_booking_matches != null ? d.non_booking_matches : Math.max(0, matchTotal - bookingsCount);

      const profCount = d.professionals ?? 0;
      const nonProfCount = d.nonProfessionals ?? 0;
      const openTickets = d.openTickets ?? 0;
      const pendingTickets = d.pendingTickets ?? 0;

      const svg = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${path}"/></svg>`;
      el.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon-wrap stat-icon-wrap--indigo">${svg('M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z')}</div>
          <div class="value">${userTotal}</div>
          <div class="label">${escapeHtml(__('dash.stat.users'))}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap stat-icon-wrap--indigo">${svg('M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z')}</div>
          <div class="value">${profCount}</div>
          <div class="label">${escapeHtml(__('dash.stat.professionals'))}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap stat-icon-wrap--zinc">${svg('M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z')}</div>
          <div class="value">${nonProfCount}</div>
          <div class="label">${escapeHtml(__('dash.stat.nonProf'))}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap stat-icon-wrap--green">${svg('M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z')}</div>
          <div class="value">${appCount}</div>
          <div class="label">${escapeHtml(__('dash.stat.pendingApps'))}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap stat-icon-wrap--blue">${svg('M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z')}</div>
          <div class="value">${catCount}</div>
          <div class="label">${escapeHtml(__('dash.stat.categories'))}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap stat-icon-wrap--pink">${svg('M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z')}</div>
          <div class="value">${pendingTickets}</div>
          <div class="label">${escapeHtml(__('dash.stat.pendingTickets'))}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap stat-icon-wrap--indigo">${svg('M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z')}</div>
          <div class="value">${openTickets}</div>
          <div class="label">${escapeHtml(__('dash.stat.openTickets'))}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap stat-icon-wrap--blue">${svg('M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z')}</div>
          <div class="value">${bookingsCount}</div>
          <div class="label">${escapeHtml(__('dash.stat.bookings'))}</div>
          <div class="stat-card-hint">${escapeHtml(__('dash.stat.bookingsHint'))}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap stat-icon-wrap--indigo">${svg('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z')}</div>
          <div class="value">${otherMatchesCount}</div>
          <div class="label">${escapeHtml(__('dash.stat.otherMatches'))}</div>
          <div class="stat-card-hint">${escapeHtml(__('dash.stat.otherMatchesHint'))}</div>
        </div>
      `;

      // Animate stat counters
      el.querySelectorAll('.stat-card .value').forEach(v => {
        const target = parseInt(v.textContent.replace(/,/g, ''), 10);
        if (!isNaN(target) && target > 0) animateCounter(v, target, 1200);
      });

      // Quick Actions
      const qa = document.getElementById('dashboard-quick-actions');
      if (qa) {
        const perms = getAdminPermissions();
        const cards = [];
        const qaSvg = (path) => `<span class="qa-icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="${path}"/></svg></span>`;
        if (perms.includes('professionals')) {
          cards.push(`
          <button type="button" class="quick-action-card" onclick="showViewGlobal('applications')">
            ${qaSvg('M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z')}
            <div class="qa-label">${escapeHtml(__('dash.qa.apps'))}</div>
            <div class="qa-desc">${escapeHtml(__('dash.qa.appsDesc').replace('{n}', String(appCount)))}</div>
          </button>`);
        }
        if (perms.includes('notifications')) {
          cards.push(`
          <button type="button" class="quick-action-card" onclick="showViewGlobal('notifications')">
            ${qaSvg('M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z')}
            <div class="qa-label">${escapeHtml(__('dash.qa.notify'))}</div>
            <div class="qa-desc">${escapeHtml(__('dash.qa.notifyDesc'))}</div>
          </button>`);
        }
        if (perms.includes('users')) {
          cards.push(`
          <button type="button" class="quick-action-card" onclick="showViewGlobal('users')">
            ${qaSvg('M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z')}
            <div class="qa-label">${escapeHtml(__('dash.qa.users'))}</div>
            <div class="qa-desc">${escapeHtml(__('dash.qa.usersDesc'))}</div>
          </button>`);
        }
        if (perms.includes('tickets')) {
          cards.push(`
          <button type="button" class="quick-action-card" onclick="showViewGlobal('tickets')">
            ${qaSvg('M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z')}
            <div class="qa-label">${escapeHtml(__('dash.qa.tickets'))}</div>
            <div class="qa-desc">${escapeHtml(__('dash.qa.ticketsDesc').replace('{pending}', String(pendingTickets)).replace('{open}', String(openTickets)))}</div>
          </button>`);
        }
        qa.innerHTML = cards.length
          ? cards.join('')
          : `<div class="empty" style="grid-column:1/-1">${escapeHtml(__('dash.qaEmpty'))}</div>`;
      }
    } catch (err) {
      el.innerHTML = `<div class="empty error-msg">${escapeHtml(err.message)} <button class="btn-retry" onclick="loadDashboard()">${escapeHtml(__('common.retry'))}</button></div>`;
      toast(err.message, 'error');
    }
  };

  window.showViewGlobal = function (name) { showView(name); };

  // --- Categories ---
  let categoriesPage = 1;

  async function loadCategories() {
    const el = document.getElementById('categories-list');
    const pagEl = document.getElementById('categories-pagination');
    if (!el) return;
    const search = (document.getElementById('cat-search')?.value || '').trim();
    _categoryModalParentsCache = null;
    el.innerHTML = `<div class="loading">${escapeHtml(__('common.loading'))}</div>`;

    try {
      const q = new URLSearchParams({ page: categoriesPage, limit: 20, active: 'false' });
      if (search) q.set('search', search);
      const res = await api(`/categories?${q}`);
      const list = res.data || [];
      const pag = res.pagination || {};

      if (!list.length) {
        el.innerHTML = `<div class="empty">${search ? escapeHtml(__('cat.emptySearch')) : escapeHtml(__('cat.empty'))}</div>`;
        if (pagEl) {
          const n = pag.total ?? 0;
          pagEl.innerHTML = search
            ? `<span style="color:var(--gray-400);font-size:0.875rem">${escapeHtml(__('cat.resultsLine').replace('{n}', String(n)))}</span>`
            : '';
        }
      } else {
        el.innerHTML = `
          <div class="table-wrap">
            <table>
              <thead><tr><th>${escapeHtml(__('cat.table.order'))}</th><th>${escapeHtml(__('cat.table.photo'))}</th><th>${escapeHtml(__('cat.table.parent'))}</th><th>${escapeHtml(__('cat.table.name'))}</th><th>${escapeHtml(__('cat.table.en'))}</th><th>${escapeHtml(__('cat.table.ar'))}</th><th>${escapeHtml(__('cat.table.de'))}</th><th>${escapeHtml(__('cat.table.active'))}</th><th></th></tr></thead>
              <tbody>
                ${list.map(c => {
                  const parentName = c.parent_id ? (list.find(p => p.id === c.parent_id)?.name || c.parent_id) : '—';
                  return `
                  <tr>
                    <td><strong>${c.order ?? 999}</strong></td>
                    <td>${c.photo_url ? `<img src="${escapeHtml(c.photo_url)}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover">` : '—'}</td>
                    <td style="color:var(--gray-500);font-size:0.82rem">${escapeHtml(parentName)}</td>
                    <td><strong>${escapeHtml(c.name || '—')}</strong></td>
                    <td style="color:var(--gray-500);font-size:0.82rem">${escapeHtml(c.name_en || '—')}</td>
                    <td style="color:var(--gray-500);font-size:0.82rem;direction:rtl">${escapeHtml(c.name_ar || '—')}</td>
                    <td style="color:var(--gray-500);font-size:0.82rem">${escapeHtml(c.name_de || '—')}</td>
                    <td><span class="badge badge-toggle ${c.is_active !== false ? 'badge-green' : 'badge-gray'}" data-toggle-active="category-${c.id}" title="${escapeHtml(__('loc.toggleTitle'))}">${c.is_active !== false ? escapeHtml(__('state.active')) : escapeHtml(__('state.inactive'))}</span></td>
                    <td style="display:flex;gap:6px;align-items:center">
                      <button type="button" class="btn btn-secondary" data-edit="${c.id}">${escapeHtml(__('cat.btn.edit'))}</button>
                      <button type="button" class="btn btn-danger" data-delete="${c.id}">${escapeHtml(__('cat.btn.delete'))}</button>
                    </td>
                  </tr>
                `;}).join('')}
              </tbody>
            </table>
          </div>
        `;
        el.querySelectorAll('[data-toggle-active^="category-"]').forEach(badge => {
          const id = badge.dataset.toggleActive.replace('category-', '');
          const cat = list.find(x => x.id === id);
          if (cat) badge.addEventListener('click', () => toggleActive('category', id, cat.is_active !== false, loadCategories));
        });
        el.querySelectorAll('button[data-edit]').forEach((btn) => {
          const id = btn.getAttribute('data-edit');
          btn.addEventListener('click', () => {
            const cat = list.find((x) => x.id === id);
            if (!cat) {
              toast(__('cat.notFound'), 'error');
              return;
            }
            openCategoryModal(cat).catch((e) => toast(e.message, 'error'));
          });
        });
        el.querySelectorAll('button[data-delete]').forEach((btn) => {
          const id = btn.getAttribute('data-delete');
          btn.addEventListener('click', () => deleteCategory(id));
        });
      }

      if (pagEl && list.length) {
        if (search) {
          const rn = pag.total ?? list.length;
          pagEl.innerHTML = `<span style="color:var(--gray-400);font-size:0.875rem">${escapeHtml(__('cat.resultsLine').replace('{n}', String(rn)))}</span>`;
        } else {
          pagEl.innerHTML = `
          <button type="button" ${categoriesPage <= 1 ? 'disabled' : ''} data-page="prev">${escapeHtml(__('cat.pagination.prev'))}</button>
          <span>${escapeHtml(__('cat.pagination.page'))} ${categoriesPage}</span>
          <button type="button" ${!pag.hasMore ? 'disabled' : ''} data-page="next">${escapeHtml(__('cat.pagination.next'))}</button>
        `;
          pagEl.querySelectorAll('[data-page]').forEach((btn) =>
            btn.addEventListener('click', () => {
              if (btn.dataset.page === 'prev' && categoriesPage > 1) categoriesPage--;
              if (btn.dataset.page === 'next' && pag.hasMore) categoriesPage++;
              loadCategories();
            }),
          );
        }
      }
    } catch (err) {
      el.innerHTML = `<div class="empty error-msg">${escapeHtml(err.message)} <button class="btn-retry">${escapeHtml(__('common.retry'))}</button></div>`;
      el.querySelector('.btn-retry')?.addEventListener('click', loadCategories);
      toast(err.message, 'error');
    }
  }

  document.getElementById('cat-search')?.addEventListener('input', debounce(() => { categoriesPage = 1; loadCategories(); }, 350));

  // --- Locations (Governorates & Cities) ---
  const LOCATIONS_COUNTRIES_KEY = 'admin_locations_countries';
  let cachedCountries = [];
  let selectedLocationsCountry = 'EG';
  let selectedGovernorateId = null;
  let locationsFilterInitialized = false;

  async function loadCountriesForLocations() {
    try {
      const response = await api('/countries');
      if (response.success && response.data) {
        cachedCountries = response.data.filter(c => c.is_active !== false);
        return cachedCountries;
      }
      return [];
    } catch (err) {
      console.error('Failed to load countries:', err);
      return [];
    }
  }


  let locationsCountryHandlersBound = false;
  function bindLocationsCountryHandlers() {
    if (locationsCountryHandlersBound) return;
    locationsCountryHandlersBound = true;
    document.getElementById('loc-country-select')?.addEventListener('change', async (e) => {
      selectedLocationsCountry = (e.target.value || 'EG').toUpperCase();
      selectedGovernorateId = null;
      
      // Update badge
      const selectedCountry = cachedCountries.find(c => (c.code || c.key) === selectedLocationsCountry);
      const badge = document.getElementById('loc-country-badge');
      if (badge) badge.textContent = `${__('loc.govBadge')} ${selectedCountry?.name || selectedLocationsCountry}`;
      
      // Reload only governorates and cities, NOT countries
      await loadGovernorates();
      await loadCities();
      
      // Update governorate filter
      const govFilter = document.getElementById('loc-gov-filter');
      if (govFilter) {
        govFilter.innerHTML = `<option value="">${escapeHtml(__('loc.filterGovAll'))}</option>` +
          (window._governoratesList || []).map(g => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.name || g.key)}</option>`).join('');
        govFilter.value = '';
      }
    });
  }

  // --- App Settings (country lists, chip UI) ---
  function renderCountryChips(containerId, codes) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    (codes || []).forEach((code) => {
      const codeUpper = String(code).trim().toUpperCase();
      if (codeUpper.length !== 2) return;
      const chip = document.createElement('span');
      chip.className = 'settings-chip';
      chip.dataset.code = codeUpper;
      chip.innerHTML = `${escapeHtml(codeUpper)} <button type="button" class="chip-remove" aria-label="${escapeHtml(__('common.removeAria'))}">×</button>`;
      chip.querySelector('.chip-remove').addEventListener('click', () => chip.remove());
      el.appendChild(chip);
    });
  }

  function getCodesFromChips(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return [];
    return [...el.querySelectorAll('.settings-chip')]
      .map((c) => (c.dataset.code || c.textContent || '').trim().toUpperCase())
      .filter((c) => c.length === 2);
  }

  window.loadAppSettings = async function () {
    const statusEl = document.getElementById('settings-status');
    if (statusEl) statusEl.textContent = __('common.loading');
    try {
      const res = await api('/config/app');
      const d = res.data || res;
      const arr = (v) => (Array.isArray(v) ? v : []);
      
      // Load platform fees enabled toggle
      const platformFeesEnabled = d.platform_fees_enabled === true;
      const toggleEl = document.getElementById('platform-fees-enabled');
      if (toggleEl) toggleEl.checked = platformFeesEnabled;

      const walletPortalEl = document.getElementById('professional-fee-wallet-portal-enabled');
      if (walletPortalEl) {
        const w =
          d.professional_fee_wallet_portal_enabled === undefined
            ? true
            : d.professional_fee_wallet_portal_enabled === true;
        walletPortalEl.checked = w;
      }

      const enforceSuspEl = document.getElementById('enforce-platform-fee-suspension');
      if (enforceSuspEl) enforceSuspEl.checked = d.enforce_platform_fee_suspension !== false;
      const autoSusJobEl = document.getElementById('platform-fee-auto-suspend-job');
      if (autoSusJobEl) autoSusJobEl.checked = d.platform_fee_auto_suspend_enabled !== false;
      const monthlyBillSusEl = document.getElementById('platform-fee-monthly-billing-suspend');
      if (monthlyBillSusEl) monthlyBillSusEl.checked = d.platform_fee_monthly_billing_suspend_enabled !== false;
      
      // Load global fee settings
      const globalFeePercentage = d.platform_fee_global_default_percentage;
      const transferPhone = d.professional_subscription_transfer_phone || '';
      const transferNote = d.professional_subscription_transfer_note || '';
      const feePercentageEl = document.getElementById('global-fee-percentage');
      const transferPhoneEl = document.getElementById('transfer-phone');
      const transferNoteEl = document.getElementById('transfer-note');
      
      if (feePercentageEl) feePercentageEl.value = globalFeePercentage || '';
      if (transferPhoneEl) transferPhoneEl.value = transferPhone;
      if (transferNoteEl) transferNoteEl.value = transferNote;
      
      // ✅ NEW: Load booking policies
      const noShowThresholdEl = document.getElementById('no-show-threshold');
      const noShowRateThresholdEl = document.getElementById('no-show-rate-threshold');
      const cancellationThresholdEl = document.getElementById('cancellation-threshold');
      const cancellationWindowEl = document.getElementById('cancellation-window-hours');
      const noShowRateMinBookingsEl = document.getElementById('no-show-rate-min-bookings');
      const noShowRestrictionDaysEl = document.getElementById('no-show-restriction-days');
      const cancellationRestrictionHoursEl = document.getElementById('cancellation-restriction-hours');
      
      if (noShowThresholdEl) noShowThresholdEl.value = d.no_show_threshold || 3;
      if (noShowRateThresholdEl) noShowRateThresholdEl.value = d.no_show_rate_threshold || 40;
      if (noShowRateMinBookingsEl) noShowRateMinBookingsEl.value = d.no_show_rate_min_bookings ?? 5;
      if (noShowRestrictionDaysEl) noShowRestrictionDaysEl.value = d.no_show_restriction_days ?? 14;
      if (cancellationThresholdEl) cancellationThresholdEl.value = d.cancellation_threshold || 5;
      if (cancellationWindowEl) cancellationWindowEl.value = d.cancellation_window_hours || 1;
      if (cancellationRestrictionHoursEl) cancellationRestrictionHoursEl.value = d.cancellation_restriction_hours ?? 24;

      // App version & auto-sync (Firestore config/app)
      const minV = document.getElementById('settings-min-app-version');
      const latV = document.getElementById('settings-latest-app-version');
      const hiV = document.getElementById('settings-highest-seen-version');
      const rel = document.getElementById('settings-release-notes');
      const autoSyncCb = document.getElementById('settings-auto-sync-min');
      const autoHint = document.getElementById('settings-auto-sync-hint');
      if (minV) minV.value = d.minimum_version || '';
      if (latV) latV.value = (d.latest_version_override || '').trim();
      if (hiV) hiV.value = d.highest_seen_client_version || '—';
      if (rel) rel.value = d.release_notes || '';
      if (autoSyncCb) autoSyncCb.checked = d.auto_sync_min_from_clients === true;
      if (autoHint) {
        const src = d.auto_sync_min_source;
        const eff = d.auto_sync_min_effective === true;
        if (src === 'environment_on') {
          autoHint.textContent = __('sett.autoHintEnvOn');
        } else if (src === 'environment_off') {
          autoHint.textContent = __('sett.autoHintEnvOff');
        } else {
          autoHint.textContent = eff ? __('sett.autoHintPanelOn') : __('sett.autoHintPanelOff');
        }
      }
      
      // Load country lists
      renderCountryChips('settings-professional-chips', arr(d.professional_allowed_countries));
      renderCountryChips('settings-locations-chips', arr(d.countries_with_locations));
      renderCountryChips('settings-german-chips', arr(d.german_speaking_countries));
      
      // Professional news ticker
      const newsEl = document.getElementById('settings-pro-news');
      if (newsEl) {
        const items = Array.isArray(d.professional_news_ticker) ? d.professional_news_ticker : [];
        newsEl.value = items.map((x) => String(x || '').trim()).filter(Boolean).join('\n');
      }
      ['settings-professional-input', 'settings-locations-input', 'settings-german-input'].forEach((id) => {
        const input = document.getElementById(id);
        if (input) input.value = '';
      });
      if (statusEl) statusEl.textContent = '';
    } catch (err) {
      toast(err.message || __('sett.loadFail'), 'error');
      if (statusEl) statusEl.textContent = `${__('sett.loadFail')} ${err.message || ''}`.trim();
    }
  };

  ['professional', 'locations', 'german'].forEach((target) => {
    const inputId = `settings-${target}-input`;
    const chipsId = `settings-${target}-chips`;
    const input = document.getElementById(inputId);
    const addBtn = document.querySelector(`.settings-add-btn[data-target="${target}"]`);
    const addCode = () => {
      const raw = (input?.value || '').trim().toUpperCase().slice(0, 2);
      if (raw.length !== 2) return;
      const container = document.getElementById(chipsId);
      if (!container) return;
      if (container.querySelector(`.settings-chip[data-code="${raw}"]`)) {
        input.value = '';
        return;
      }
      const chip = document.createElement('span');
      chip.className = 'settings-chip';
      chip.dataset.code = raw;
      chip.innerHTML = `${escapeHtml(raw)} <button type="button" class="chip-remove" aria-label="${escapeHtml(__('common.removeAria'))}">×</button>`;
      chip.querySelector('.chip-remove').addEventListener('click', () => chip.remove());
      container.appendChild(chip);
      input.value = '';
    };
    addBtn?.addEventListener('click', addCode);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addCode(); } });
    input?.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2); });
  });

  document.getElementById('settings-save')?.addEventListener('click', async () => {
    const professional_allowed_countries = getCodesFromChips('settings-professional-chips');
    const countries_with_locations = getCodesFromChips('settings-locations-chips');
    const german_speaking_countries = getCodesFromChips('settings-german-chips');
    const statusEl = document.getElementById('settings-status');
    if (statusEl) statusEl.textContent = __('sett.saving');
    try {
      await api('/config/app', {
        method: 'PUT',
        body: JSON.stringify({
          professional_allowed_countries,
          countries_with_locations,
          german_speaking_countries,
          professional_news_ticker: (() => {
            const raw = (document.getElementById('settings-pro-news')?.value || '');
            return raw
              .split('\n')
              .map((x) => x.trim())
              .filter(Boolean)
              .slice(0, 30);
          })(),
        })
      });
      toast(__('sett.toastConfigSaved'), 'success');
      if (statusEl) statusEl.textContent = __('sett.savedOk');
    } catch (err) {
      toast(err.message || 'Failed to save', 'error');
      if (statusEl) statusEl.textContent = 'Error: ' + (err.message || '');
    }
  });

  document.getElementById('save-pro-news')?.addEventListener('click', async () => {
    const statusEl = document.getElementById('settings-status');
    if (statusEl) statusEl.textContent = __('sett.saving');
    try {
      const raw = (document.getElementById('settings-pro-news')?.value || '');
      const professional_news_ticker = raw
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 30);
      await api('/config/app', { method: 'PUT', body: JSON.stringify({ professional_news_ticker }) });
      toast(__('sett.toastNewsSaved'), 'success');
      if (statusEl) statusEl.textContent = __('sett.savedOk');
    } catch (err) {
      toast(err.message || 'Failed to save', 'error');
      if (statusEl) statusEl.textContent = 'Error: ' + (err.message || '');
    }
  });

  document.getElementById('settings-refresh')?.addEventListener('click', () => loadAppSettings());

  document.getElementById('save-app-version-settings')?.addEventListener('click', async () => {
    const statusEl = document.getElementById('settings-status');
    const minEl = document.getElementById('settings-min-app-version');
    const latEl = document.getElementById('settings-latest-app-version');
    const relEl = document.getElementById('settings-release-notes');
    const syncEl = document.getElementById('settings-auto-sync-min');
    const minRaw = (minEl?.value || '').trim();
    const latRaw = (latEl?.value || '').trim();
    if (!minRaw) {
      toast('Minimum version is required', 'error');
      return;
    }
    if (statusEl) statusEl.textContent = 'Saving version settings…';
    try {
      await api('/config/app', {
        method: 'PUT',
        body: JSON.stringify({
          minimum_version: minRaw,
          latest_version: latRaw ? latRaw : null,
          release_notes: relEl?.value || '',
          auto_sync_min_from_clients: syncEl?.checked === true,
        }),
      });
      toast(__('sett.toastVersionSaved'), 'success');
      if (statusEl) statusEl.textContent = __('sett.savedOk');
      await loadAppSettings();
    } catch (err) {
      toast(err.message || 'Failed to save', 'error');
      if (statusEl) statusEl.textContent = 'Error: ' + (err.message || '');
    }
  });

  // Platform fees enabled toggle handler
  setTimeout(() => {
    const toggleEl = document.getElementById('platform-fees-enabled');
    if (toggleEl) {
      toggleEl.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        try {
          await api('/config/app', {
            method: 'PUT',
            body: JSON.stringify({ platform_fees_enabled: enabled })
          });
          toast(enabled ? 'Platform fees enabled' : 'Platform fees disabled', 'success');
        } catch (err) {
          e.target.checked = !enabled;
          toast(err.message || 'Failed to update', 'error');
        }
      });
    }

    function bindFeeSuspensionToggle(elementId, payloadKey) {
      const el = document.getElementById(elementId);
      if (!el) return;
      el.addEventListener('change', async (e) => {
        const v = e.target.checked;
        try {
          await api('/config/app', {
            method: 'PUT',
            body: JSON.stringify({ [payloadKey]: v }),
          });
          toast('Suspension setting saved', 'success');
        } catch (err) {
          e.target.checked = !v;
          toast(err.message || 'Failed to update', 'error');
        }
      });
    }
    bindFeeSuspensionToggle('enforce-platform-fee-suspension', 'enforce_platform_fee_suspension');
    bindFeeSuspensionToggle('platform-fee-auto-suspend-job', 'platform_fee_auto_suspend_enabled');
    bindFeeSuspensionToggle('platform-fee-monthly-billing-suspend', 'platform_fee_monthly_billing_suspend_enabled');
    bindFeeSuspensionToggle('professional-fee-wallet-portal-enabled', 'professional_fee_wallet_portal_enabled');
  }, 500);
  
  // Global fee type toggle
  setTimeout(() => {
    const feeTypeEl = document.getElementById('global-fee-type');
    if (feeTypeEl) {
      feeTypeEl.addEventListener('change', (e) => {
        const isPercentage = e.target.value === 'percentage';
        const amountRow = document.getElementById('global-fee-amount-field');
        const percentageRow = document.getElementById('global-fee-percentage-field');
        if (isPercentage) {
          if (amountRow) amountRow.classList.add('hidden');
          if (percentageRow) percentageRow.classList.remove('hidden');
        } else {
          if (amountRow) amountRow.classList.remove('hidden');
          if (percentageRow) percentageRow.classList.add('hidden');
        }
      });
    }

    // Save global fee settings
    const saveBtn = document.getElementById('save-global-fee');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        try {
          const pct = document.getElementById('global-fee-percentage')?.value;
          const payload = {
            professional_subscription_transfer_phone: document.getElementById('transfer-phone')?.value || '',
            professional_subscription_transfer_note: document.getElementById('transfer-note')?.value || '',
            platform_fee_global_default_percentage: pct ? parseFloat(pct) : null,
            platform_fee_by_country: {}
          };
          
          await api('/config/app', { method: 'PUT', body: JSON.stringify(payload) });
          toast('Platform fee settings saved successfully', 'success');
          loadAppSettings();
        } catch (err) {
          console.error('Error saving global fee:', err);
          toast(err.message, 'error');
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = '💾 Save Global Settings';
        }
      });
    }

    // ✅ NEW: Save booking policies
    const savePoliciesBtn = document.getElementById('save-booking-policies');
    if (savePoliciesBtn) {
      savePoliciesBtn.addEventListener('click', async () => {
        savePoliciesBtn.disabled = true;
        savePoliciesBtn.textContent = 'Saving...';
        
        try {
          const payload = {
            no_show_threshold: parseInt(document.getElementById('no-show-threshold')?.value, 10) || 3,
            no_show_rate_threshold: parseInt(document.getElementById('no-show-rate-threshold')?.value, 10) || 40,
            no_show_rate_min_bookings: parseInt(document.getElementById('no-show-rate-min-bookings')?.value, 10) || 5,
            no_show_restriction_days: parseInt(document.getElementById('no-show-restriction-days')?.value, 10) || 14,
            cancellation_threshold: parseInt(document.getElementById('cancellation-threshold')?.value, 10) || 5,
            cancellation_window_hours: parseFloat(document.getElementById('cancellation-window-hours')?.value) || 1,
            cancellation_restriction_hours: parseInt(document.getElementById('cancellation-restriction-hours')?.value, 10) || 24
          };
          
          await api('/config/app', { method: 'PUT', body: JSON.stringify(payload) });
          toast('Booking policies saved successfully', 'success');
          loadAppSettings();
        } catch (err) {
          console.error('Error saving booking policies:', err);
          toast(err.message, 'error');
        } finally {
          savePoliciesBtn.disabled = false;
          savePoliciesBtn.textContent = '💾 Save Booking Policies';
        }
      });
    }
  }, 500);

  // --- Countries Management ---
  let countriesHandlersBound = false;
  
  async function loadCountries() {
    const el = document.getElementById('countries-list');
    if (!el) return;
    el.innerHTML = `<div class="loading">${escapeHtml(__('common.loading'))}</div>`;
    try {
      const res = await api('/countries');
      const list = res.data || [];
      if (!list.length) {
        el.innerHTML = '<div class="empty">No countries yet. Add one to get started.</div>';
      } else {
        el.innerHTML = `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Order</th><th>Code</th><th>Flag</th><th>Name</th><th>EN</th><th>AR</th><th>Fee %</th><th>Active</th><th></th></tr></thead>
              <tbody>
                ${list.map(c => `
                  <tr>
                    <td>${c.order || 999}</td>
                    <td><strong>${escapeHtml(c.code || c.key)}</strong></td>
                    <td>${escapeHtml(countryFlagForDisplay(c) || (c.flag || ''))}</td>
                    <td>${escapeHtml(c.name || c.key)}</td>
                    <td>${escapeHtml(c.name_en || '—')}</td>
                    <td>${escapeHtml(c.name_ar || '—')}</td>
                    <td>${c.platform_fee_percentage != null ? c.platform_fee_percentage + '%' : '—'}</td>
                    <td><span class="badge badge-toggle ${c.is_active !== false ? 'badge-green' : 'badge-gray'}" data-toggle-active="country-${c.id}" title="Click to toggle Active / Inactive">${c.is_active !== false ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <button class="btn-icon" onclick="editCountry('${c.id}')">✏️</button>
                      <button class="btn-icon" onclick="deleteCountryConfirm('${c.id}', '${escapeHtml(c.name || c.code)}')">🗑️</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        el.querySelectorAll('[data-toggle-active^="country-"]').forEach(badge => {
          const id = badge.dataset.toggleActive.replace('country-', '');
          const c = list.find(x => x.id === id);
          if (c) badge.addEventListener('click', () => toggleActive('country', id, c.is_active !== false, loadCountries));
        });
      }
      // Active countries for filter dropdown (match app behaviour); fallback if none active
      const activeOnly = list.filter(c => c.is_active !== false);
      cachedCountries = activeOnly.length ? activeOnly : list;
      
      // Update country select dropdown in Locations section
      const sel = document.getElementById('loc-country-select');
      if (sel) {
        const currentVal = (sel.value || selectedLocationsCountry || '').toUpperCase();
        const dropdownList = (activeOnly.length ? activeOnly : list)
          .slice()
          .sort((a, b) => (a.order || 999) - (b.order || 999));
        sel.innerHTML = dropdownList
          .map(c => `<option value="${escapeHtml((c.code || c.key || '').toUpperCase())}">${escapeHtml(countryFlagForDisplay(c) || (c.flag || ''))} ${escapeHtml(c.name || c.code)} (${escapeHtml(c.code || c.key)})</option>`)
          .join('');
        const codes = dropdownList.map(c => (c.code || c.key || '').toUpperCase());
        if (currentVal && codes.includes(currentVal)) {
          sel.value = currentVal;
          selectedLocationsCountry = currentVal;
        } else if (dropdownList.length > 0) {
          const first = (dropdownList[0].code || dropdownList[0].key || 'EG').toUpperCase();
          sel.value = first;
          selectedLocationsCountry = first;
        }
        
        const selectedCountry = list.find(c => (c.code || c.key || '').toUpperCase() === selectedLocationsCountry);
        const locBadge = document.getElementById('loc-country-badge');
        if (locBadge) locBadge.textContent = `${__('loc.govBadge')} ${selectedCountry?.name || selectedLocationsCountry}`;
      }
      refreshAdminCountryScopeBar();
    } catch (err) {
      el.innerHTML = `<div class="error">Error loading countries: ${escapeHtml(err.message)}</div>`;
    }
  }
  
  function bindCountryHandlers() {
    if (countriesHandlersBound) return;
    countriesHandlersBound = true;
    
    document.getElementById('country-add')?.addEventListener('click', () => openCountryModal());
    document.getElementById('country-cancel')?.addEventListener('click', () => {
      hide(document.getElementById('modal-overlay'));
      hide(document.getElementById('country-modal'));
    });
    document.getElementById('country-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('country-id').value;
      const data = {
        code: document.getElementById('country-code').value.trim().toUpperCase(),
        name: document.getElementById('country-name').value.trim(),
        name_en: document.getElementById('country-name-en').value.trim() || null,
        name_ar: document.getElementById('country-name-ar').value.trim() || null,
        name_de: document.getElementById('country-name-de').value.trim() || null,
        flag: document.getElementById('country-flag').value.trim() || null,
        platform_fee_percentage: document.getElementById('country-fee').value ? parseFloat(document.getElementById('country-fee').value) : null,
        order: document.getElementById('country-order').value ? parseInt(document.getElementById('country-order').value) : 999,
        is_active: document.getElementById('country-active').checked,
      };
      try {
        if (id) {
          await api(`/countries/${id}`, { method: 'PUT', body: JSON.stringify(data) });
          toast('Country updated', 'success');
        } else {
          await api('/countries', { method: 'POST', body: JSON.stringify(data) });
          toast('Country created', 'success');
        }
        hide(document.getElementById('modal-overlay'));
        hide(document.getElementById('country-modal'));
        await loadCountries();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }
  
  function openCountryModal(countryId = null) {
    bindCountryHandlers();
    const modal = document.getElementById('country-modal');
    const title = document.getElementById('country-modal-title');
    const form = document.getElementById('country-form');
    form.reset();
    document.getElementById('country-id').value = '';
    document.getElementById('country-active').checked = true;
    
    if (countryId) {
      title.textContent = 'Edit Country';
      api(`/countries/${countryId}`).then(res => {
        const c = res.data;
        document.getElementById('country-id').value = c.id;
        document.getElementById('country-code').value = c.code || c.key || '';
        document.getElementById('country-name').value = c.name || '';
        document.getElementById('country-name-en').value = c.name_en || '';
        document.getElementById('country-name-ar').value = c.name_ar || '';
        document.getElementById('country-name-de').value = c.name_de || '';
        document.getElementById('country-flag').value = c.flag || '';
        document.getElementById('country-fee').value = c.platform_fee_percentage != null ? c.platform_fee_percentage : '';
        document.getElementById('country-order').value = c.order || 999;
        document.getElementById('country-active').checked = c.is_active !== false;
      });
    } else {
      title.textContent = 'Add Country';
    }
    show(document.getElementById('modal-overlay'));
    show(modal);
  }
  
  window.editCountry = (id) => openCountryModal(id);
  
  window.deleteCountryConfirm = (id, name) => {
    if (!confirm(`Delete country "${name}"? This will NOT delete associated governorates/cities.`)) return;
    api(`/countries/${id}`, { method: 'DELETE' })
      .then(() => {
        toast('Country deleted', 'success');
        loadCountries();
      })
      .catch(err => toast(err.message, 'error'));
  };

  async function loadLocations() {
    bindCountryHandlers();
    await loadCountries(); // This will update cachedCountries and the dropdown
    bindLocationsCountryHandlers();
    
    // Make sure selected country is valid
    const sel = document.getElementById('loc-country-select');
    if (sel && sel.value) {
      selectedLocationsCountry = sel.value;
    }
    
    await loadGovernorates();
    await loadCities();
    
    const govFilter = document.getElementById('loc-gov-filter');
    if (govFilter && !locationsFilterInitialized) {
      locationsFilterInitialized = true;
      govFilter.addEventListener('change', () => {
        selectedGovernorateId = govFilter.value || null;
        document.getElementById('city-add').disabled = !selectedGovernorateId;
        loadCities();
      });
    }
    if (govFilter) {
      govFilter.innerHTML = `<option value="">${escapeHtml(__('loc.filterGovAll'))}</option>` +
        (window._governoratesList || []).map(g => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.name || g.key)}</option>`).join('');
      govFilter.value = selectedGovernorateId || '';
    }
    const cityAddBtn = document.getElementById('city-add');
    if (cityAddBtn) cityAddBtn.disabled = !selectedGovernorateId;
  }

  document.getElementById('gov-add')?.addEventListener('click', () => openGovernorateModal());
  document.getElementById('city-add')?.addEventListener('click', () => openCityModal());

  async function loadGovernorates() {
    const el = document.getElementById('governorates-list');
    if (!el) return;
    el.innerHTML = `<div class="loading">${escapeHtml(__('common.loading'))}</div>`;
    try {
      const res = await api(`/governorates?active=false&country=${selectedLocationsCountry || 'EG'}`);
      const list = res.data || [];
      window._governoratesList = list;
      if (!list.length) {
        el.innerHTML = `<div class="empty">${escapeHtml(__('loc.govEmpty'))}</div>`;
      } else {
        el.innerHTML = `
          <div class="table-wrap">
            <table>
              <thead><tr><th>${escapeHtml(__('cat.table.order'))}</th><th>${escapeHtml(__('loc.table.key'))}</th><th>${escapeHtml(__('loc.table.name'))}</th><th>${escapeHtml(__('cat.table.en'))}</th><th>${escapeHtml(__('cat.table.ar'))}</th><th>${escapeHtml(__('cat.table.active'))}</th><th></th></tr></thead>
              <tbody>
                ${list.map(g => `
                  <tr>
                    <td><strong>${g.order ?? 999}</strong></td>
                    <td><code style="font-size:0.75rem">${escapeHtml(g.key || '—')}</code></td>
                    <td><strong>${escapeHtml(g.name || '—')}</strong></td>
                    <td style="color:var(--gray-500);font-size:0.82rem">${escapeHtml(g.name_en || '—')}</td>
                    <td style="color:var(--gray-500);font-size:0.82rem;direction:rtl">${escapeHtml(g.name_ar || '—')}</td>
                    <td><span class="badge badge-toggle ${g.is_active !== false ? 'badge-green' : 'badge-gray'}" data-toggle-active="governorate-${g.id}" title="${escapeHtml(__('loc.toggleTitle'))}">${g.is_active !== false ? escapeHtml(__('state.active')) : escapeHtml(__('state.inactive'))}</span></td>
                    <td style="display:flex;gap:6px">
                      <button class="btn btn-secondary" data-edit='${JSON.stringify(g).replace(/'/g, "&#39;")}'>${escapeHtml(__('cat.btn.edit'))}</button>
                      <button class="btn btn-danger" data-delete="${g.id}" data-name="${escapeHtml(g.name || '')}">${escapeHtml(__('cat.btn.delete'))}</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        el.querySelectorAll('[data-toggle-active^="governorate-"]').forEach(badge => {
          const id = badge.dataset.toggleActive.replace('governorate-', '');
          const g = list.find(x => x.id === id);
          if (g) badge.addEventListener('click', () => toggleActive('governorate', id, g.is_active !== false, () => { loadGovernorates(); loadCities(); }));
        });
        el.querySelectorAll('[data-edit]').forEach(b => {
          b.addEventListener('click', () => openGovernorateModal(JSON.parse(b.dataset.edit)));
        });
        el.querySelectorAll('[data-delete]').forEach(b => {
          b.addEventListener('click', () => deleteGovernorate(b.dataset.delete, b.dataset.name));
        });
      }
    } catch (err) {
      el.innerHTML = `<div class="empty error-msg">${escapeHtml(err.message)} <button class="btn-retry" onclick="loadGovernorates()">${escapeHtml(__('common.retry'))}</button></div>`;
      toast(err.message, 'error');
    }
  }

  async function loadCities() {
    const el = document.getElementById('cities-list');
    if (!el) return;
    el.innerHTML = `<div class="loading">${escapeHtml(__('common.loading'))}</div>`;
    try {
      const q = new URLSearchParams({ active: 'false' });
      if (selectedGovernorateId) {
        q.set('governorate_id', selectedGovernorateId);
      } else if (selectedLocationsCountry) {
        q.set('country', selectedLocationsCountry);
      }
      const res = await api(`/cities?${q}`);
      const list = res.data || [];
      const govMap = {};

      (window._governoratesList || []).forEach(g => { govMap[g.id] = g; });
      if (!list.length) {
        el.innerHTML = `<div class="empty">${escapeHtml(selectedGovernorateId ? __('loc.cityEmptyGov') : __('loc.cityEmptyHint'))}</div>`;
      } else {
        el.innerHTML = `
          <div class="table-wrap cities-table-wrap">
            <table class="cities-table">
              <thead><tr><th>${escapeHtml(__('cat.table.order'))}</th><th>${escapeHtml(__('loc.table.key'))}</th><th>${escapeHtml(__('loc.table.name'))}</th><th>${escapeHtml(__('loc.table.governorate'))}</th><th>${escapeHtml(__('loc.table.price'))}</th><th>${escapeHtml(__('cat.table.en'))}</th><th>${escapeHtml(__('cat.table.ar'))}</th><th>${escapeHtml(__('cat.table.active'))}</th><th></th></tr></thead>
              <tbody>
                ${list.map(c => `
                  <tr>
                    <td><strong>${c.order ?? 999}</strong></td>
                    <td><code style="font-size:0.75rem">${escapeHtml(c.key || '—')}</code></td>
                    <td><strong>${escapeHtml(c.name || '—')}</strong></td>
                    <td style="font-size:0.82rem">${escapeHtml((govMap[c.governorate_id] || {}).name || '—')}</td>
                    <td style="font-size:0.82rem">${c.subscription_price != null ? (c.subscription_price + ' EGP') : '—'}</td>
                    <td style="color:var(--gray-500);font-size:0.82rem">${escapeHtml(c.name_en || '—')}</td>
                    <td style="color:var(--gray-500);font-size:0.82rem;direction:rtl">${escapeHtml(c.name_ar || '—')}</td>
                    <td><span class="badge badge-toggle ${c.is_active !== false ? 'badge-green' : 'badge-gray'}" data-toggle-active="city-${c.id}" title="${escapeHtml(__('loc.toggleTitle'))}">${c.is_active !== false ? escapeHtml(__('state.active')) : escapeHtml(__('state.inactive'))}</span></td>
                    <td style="display:flex;gap:6px">
                      <button class="btn btn-secondary" data-edit='${JSON.stringify(c).replace(/'/g, "&#39;")}'>${escapeHtml(__('cat.btn.edit'))}</button>
                      <button class="btn btn-danger" data-delete="${c.id}" data-name="${escapeHtml(c.name || '')}">${escapeHtml(__('cat.btn.delete'))}</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        el.querySelectorAll('[data-toggle-active^="city-"]').forEach(badge => {
          const id = badge.dataset.toggleActive.replace('city-', '');
          const c = list.find(x => x.id === id);
          if (c) badge.addEventListener('click', () => toggleActive('city', id, c.is_active !== false, loadCities));
        });
        el.querySelectorAll('[data-edit]').forEach(b => {
          b.addEventListener('click', () => openCityModal(JSON.parse(b.dataset.edit)));
        });
        el.querySelectorAll('[data-delete]').forEach(b => {
          b.addEventListener('click', () => deleteCity(b.dataset.delete, b.dataset.name));
        });
      }
    } catch (err) {
      el.innerHTML = `<div class="empty error-msg">${escapeHtml(err.message)} <button class="btn-retry" onclick="loadCities()">${escapeHtml(__('common.retry'))}</button></div>`;
      toast(err.message, 'error');
    }
  }

  function openGovernorateModal(gov = null) {
    document.getElementById('gov-id').value = gov?.id || '';
    document.getElementById('gov-country').value = gov?.country || selectedLocationsCountry || 'EG';
    document.getElementById('gov-name').value = gov?.name || '';
    document.getElementById('gov-key').value = gov?.key || '';
    document.getElementById('gov-order').value = gov?.order !== undefined ? String(gov.order) : '';
    document.getElementById('gov-platform-fee-percentage').value = gov?.platform_fee_percentage != null ? String(gov.platform_fee_percentage) : '';
    document.getElementById('gov-name-en').value = gov?.name_en || '';
    document.getElementById('gov-name-ar').value = gov?.name_ar || '';
    document.getElementById('gov-active').checked = gov?.is_active !== false;
    const moreOpts = document.getElementById('gov-more-options');
    if (moreOpts) moreOpts.open = !!(gov && (gov.key || gov.order !== undefined || gov.platform_fee_percentage != null || gov.name_en || gov.name_ar));
    show(document.getElementById('modal-overlay'));
    show(document.getElementById('governorate-modal'));
  }

  function openCityModal(city = null) {
    const govSelect = document.getElementById('city-governorate');
    govSelect.innerHTML = (window._governoratesList || []).map(g =>
      `<option value="${g.id}">${escapeHtml(g.name || g.key)}</option>`
    ).join('');
    document.getElementById('city-id').value = city?.id || '';
    document.getElementById('city-governorate').value = city?.governorate_id || selectedGovernorateId || (govSelect.options[0]?.value || '');
    document.getElementById('city-name').value = city?.name || '';
    document.getElementById('city-key').value = city?.key || '';
    document.getElementById('city-order').value = city?.order !== undefined ? String(city.order) : '';
    document.getElementById('city-platform-fee-percentage').value = city?.platform_fee_percentage != null ? String(city.platform_fee_percentage) : '';
    document.getElementById('city-name-en').value = city?.name_en || '';
    document.getElementById('city-name-ar').value = city?.name_ar || '';
    document.getElementById('city-active').checked = city?.is_active !== false;
    const moreOpts = document.getElementById('city-more-options');
    if (moreOpts) moreOpts.open = !!(city && (city.key || city.order !== undefined || city.platform_fee_percentage != null || city.name_en || city.name_ar));
    show(document.getElementById('modal-overlay'));
    show(document.getElementById('city-modal'));
  }

  document.getElementById('governorate-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('gov-id').value;
    const countryVal = (document.getElementById('gov-country').value || selectedLocationsCountry || 'EG').trim().toUpperCase();
    const platformFeePct = document.getElementById('gov-platform-fee-percentage').value.trim();
    const payload = {
      name: document.getElementById('gov-name').value.trim(),
      key: document.getElementById('gov-key').value.trim() || undefined,
      name_en: document.getElementById('gov-name-en').value.trim() || undefined,
      name_ar: document.getElementById('gov-name-ar').value.trim() || undefined,
      order: parseInt(document.getElementById('gov-order').value, 10) || undefined,
      is_active: document.getElementById('gov-active').checked,
      country: countryVal || 'EG',
      platform_fee_percentage: platformFeePct ? parseFloat(platformFeePct) : null,
    };
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      if (id) await api(`/governorates/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/governorates', { method: 'POST', body: JSON.stringify(payload) });
      hide(document.getElementById('modal-overlay'));
      hide(document.getElementById('governorate-modal'));
      loadGovernorates();
      loadCities();
      toast('Governorate saved', 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; }
  });

  document.getElementById('city-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('city-id').value;
    const platformFeePct = document.getElementById('city-platform-fee-percentage').value.trim();
    const payload = {
      governorate_id: document.getElementById('city-governorate').value,
      name: document.getElementById('city-name').value.trim(),
      key: document.getElementById('city-key').value.trim() || undefined,
      name_en: document.getElementById('city-name-en').value.trim() || undefined,
      name_ar: document.getElementById('city-name-ar').value.trim() || undefined,
      order: parseInt(document.getElementById('city-order').value, 10) || undefined,
      platform_fee_percentage: platformFeePct ? parseFloat(platformFeePct) : null,
      is_active: document.getElementById('city-active').checked,
    };
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      if (id) await api(`/cities/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/cities', { method: 'POST', body: JSON.stringify(payload) });
      hide(document.getElementById('modal-overlay'));
      hide(document.getElementById('city-modal'));
      loadCities();
      toast('City saved', 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; }
  });

  document.getElementById('gov-cancel')?.addEventListener('click', () => {
    hide(document.getElementById('modal-overlay'));
    hide(document.getElementById('governorate-modal'));
  });

  document.getElementById('city-cancel')?.addEventListener('click', () => {
    hide(document.getElementById('modal-overlay'));
    hide(document.getElementById('city-modal'));
  });

  async function deleteGovernorate(id, name) {
    if (!confirm(`Delete governorate "${name}"? This will also delete all its cities.`)) return;
    try {
      await api(`/governorates/${id}`, { method: 'DELETE' });
      loadGovernorates();
      loadCities();
      if (selectedGovernorateId === id) selectedGovernorateId = null;
      toast('Governorate deleted', 'success');
    } catch (err) { toast(err.message, 'error'); }
  }

  async function deleteCity(id, name) {
    if (!confirm(`Delete city "${name}"?`)) return;
    try {
      await api(`/cities/${id}`, { method: 'DELETE' });
      loadCities();
      toast('City deleted', 'success');
    } catch (err) { toast(err.message, 'error'); }
  }

  let _catPhotoUrl = ''; // Stores uploaded photo URL until save
  let _categoryModalParentsCache = null;

  async function ensureCategoryParentsCache() {
    if (_categoryModalParentsCache) return _categoryModalParentsCache;
    const res = await api('/categories?page=1&limit=500&active=false');
    _categoryModalParentsCache = res.data || [];
    return _categoryModalParentsCache;
  }

  function updateCategoryPhotoVisibility() {
    const parentId = document.getElementById('cat-parent-id')?.value;
    const wrap = document.getElementById('cat-photo-label-wrap');
    if (wrap) wrap.style.display = parentId ? 'none' : '';
  }

  async function openCategoryModal(cat = null) {
    document.getElementById('cat-id').value = cat?.id || '';
    document.getElementById('cat-name').value = cat?.name || '';
    _catPhotoUrl = cat?.photo_url || '';
    document.getElementById('cat-photo-file').value = '';
    const preview = document.getElementById('cat-photo-preview');
    const previewImg = document.getElementById('cat-photo-preview-img');
    const status = document.getElementById('cat-photo-status');
    if (_catPhotoUrl) {
      preview.style.display = 'flex';
      previewImg.src = _catPhotoUrl;
      status.textContent = __('mCat.currentImg');
    } else {
      preview.style.display = 'none';
    }
    document.getElementById('cat-order').value = cat?.order !== undefined ? String(cat.order) : '';
    document.getElementById('cat-name-en').value = cat?.name_en || '';
    document.getElementById('cat-name-ar').value = cat?.name_ar || '';
    document.getElementById('cat-name-de').value = cat?.name_de || '';
    try {
      const flat = await ensureCategoryParentsCache();
      const sel = document.getElementById('cat-parent-id');
      if (sel) {
        const roots = flat.filter((p) => !p.parent_id && (!cat?.id || p.id !== cat.id));
        sel.innerHTML =
          `<option value="">${escapeHtml(__('mCat.parentTop'))}</option>` +
          roots
            .map(
              (p) =>
                `<option value="${escapeHtml(p.id)}" ${cat?.parent_id === p.id ? 'selected' : ''}>${escapeHtml(p.name || p.id)}</option>`
            )
            .join('');
        if (cat?.parent_id && !roots.some((p) => p.id === cat.parent_id)) {
          sel.insertAdjacentHTML(
            'beforeend',
            `<option value="${escapeHtml(cat.parent_id)}" selected>${escapeHtml(cat.parent_id)} (missing)</option>`
          );
        }
      }
    } catch (err) {
      toast(err.message || 'Failed to load parent categories', 'error');
    }
    updateCategoryPhotoVisibility();
    show(document.getElementById('modal-overlay'));
    show(document.getElementById('category-modal'));
  }

  document.getElementById('cat-parent-id')?.addEventListener('change', () => {
    updateCategoryPhotoVisibility();
    if (document.getElementById('cat-parent-id')?.value) {
      _catPhotoUrl = '';
      const preview = document.getElementById('cat-photo-preview');
      if (preview) preview.style.display = 'none';
    }
  });

  document.getElementById('cat-add')?.addEventListener('click', () => openCategoryModal().catch((e) => toast(e.message, 'error')));

  document.getElementById('cat-photo-file')?.addEventListener('change', async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    const preview = document.getElementById('cat-photo-preview');
    const previewImg = document.getElementById('cat-photo-preview-img');
    const status = document.getElementById('cat-photo-status');
    if (!file) {
      preview.style.display = 'none';
      _catPhotoUrl = '';
      return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('Please select a JPEG, PNG or WebP image', 'error');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Image must be under 5MB', 'error');
      input.value = '';
      return;
    }
    status.textContent = 'Uploading…';
    preview.style.display = 'flex';
    previewImg.src = URL.createObjectURL(file);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const b = reader.result.indexOf(',');
          resolve(reader.result.substring(b + 1));
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await api('/storage/upload-category-image', {
        method: 'POST',
        body: JSON.stringify({
          file: base64,
          mimeType: file.type,
          categoryId: document.getElementById('cat-id').value || 'new'
        })
      });
      if (res.success && res.data?.url) {
        _catPhotoUrl = res.data.url;
        status.textContent = '✓ Uploaded';
        toast('Image uploaded', 'success');
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      toast(err.message || 'Upload failed', 'error');
      status.textContent = 'Upload failed';
      _catPhotoUrl = '';
    }
  });

  document.getElementById('cat-photo-clear')?.addEventListener('click', () => {
    _catPhotoUrl = '';
    document.getElementById('cat-photo-file').value = '';
    document.getElementById('cat-photo-preview').style.display = 'none';
  });

  document.getElementById('category-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('cat-id').value;
    const name = document.getElementById('cat-name').value.trim();
    const icon = '';
    const photo_url = _catPhotoUrl || '';
    const name_en = document.getElementById('cat-name-en').value.trim();
    const name_ar = document.getElementById('cat-name-ar').value.trim();
    const name_de = document.getElementById('cat-name-de').value.trim();
    const orderVal = document.getElementById('cat-order').value.trim();
    const order = orderVal !== '' ? parseInt(orderVal, 10) : undefined;
    const payload = {
      name, icon: icon || undefined,
      name_en: name_en || name,
      name_ar: name_ar || name,
      name_de: name_de || name,
    };
    payload.photo_url = photo_url || '';
    if (order !== undefined && !isNaN(order)) payload.order = order;
    const parentSel = document.getElementById('cat-parent-id')?.value?.trim();
    payload.parent_id = parentSel || null;
    if (parentSel) payload.photo_url = '';
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      if (id) await api(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/categories', { method: 'POST', body: JSON.stringify(payload) });
      hide(document.getElementById('modal-overlay'));
      hide(document.getElementById('category-modal'));
      loadCategories();
      toast('Category saved successfully', 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; }
  });

  document.getElementById('cat-cancel')?.addEventListener('click', () => {
    hide(document.getElementById('modal-overlay'));
    hide(document.getElementById('category-modal'));
  });

  async function deleteCategory(id) {
    if (!confirm('Delete this category? This cannot be undone.')) return;
    try {
      _categoryModalParentsCache = null;
      await api(`/categories/${id}`, { method: 'DELETE' });
      loadCategories();
      toast('Category deleted', 'success');
    } catch (err) { toast(err.message, 'error'); }
  }

  // --- Applications ---
  let applicationsPage = 1;

  async function loadApplications() {
    const el = document.getElementById('applications-list');
    const search = (document.getElementById('app-search')?.value || '').trim();
    el.innerHTML = `<div class="loading">${escapeHtml(__('common.loading'))}</div>`;
    try {
      const q = new URLSearchParams({ page: applicationsPage, limit: 20 });
      if (search) q.set('search', search);
      appendCountryScopeParams(q);
      const res = await api(`/professionals/applications/pending?${q}`);
      const list = res.data || [];
      const pag = res.pagination || {};

      if (!list.length) {
        el.innerHTML = `<div class="empty">${escapeHtml(search ? __('apps.emptySearch') : __('apps.empty'))}</div>`;
      } else {
        el.innerHTML = list.map(a => {
          const isAreaChange = a.type === 'area_change';
          const isAccountDeletion = a.type === 'account_deletion';
          const isProfessionalLeave = a.type === 'professional_leave';
          const areaDisplay = a.professional_area_display || [a.professional_governorate, a.professional_city].filter(Boolean).join(', ') || '—';
          const oldAreaDisplay = a.old_area_display || [a.old_governorate, a.old_city].filter(Boolean).join(', ') || '—';
          const field = (labelKey, value, isLink) =>
            isLink && value
              ? `<div class="app-field"><span class="app-field-label">${escapeHtml(__(labelKey))}:</span> <a href="${escapeHtml(value)}" target="_blank" rel="noopener">${escapeHtml(value)}</a></div>`
              : `<div class="app-field"><span class="app-field-label">${escapeHtml(__(labelKey))}:</span> ${escapeHtml(value || '—')}</div>`;
          const parts = [];
          if (isAccountDeletion) {
            parts.push(`<div style="padding:12px 14px;background:rgba(239,68,68,0.1);border-radius:10px;border:1px solid rgba(239,68,68,0.3);font-size:0.9rem;margin-bottom:14px">
              <div class="app-field"><span class="app-field-label">${escapeHtml(__('apps.lblProfessional'))}:</span> ${escapeHtml(a.professional_name || a.user?.username || '—')}</div>
              <div class="app-field" style="margin-top:6px"><span class="app-field-label">${escapeHtml(__('apps.lblCategory'))}:</span> ${escapeHtml(a.professional_category || '—')}</div>
            </div>`);
          } else if (isProfessionalLeave) {
            const snapAcct = (a.leave_snapshot_account_phone && String(a.leave_snapshot_account_phone).trim()) || '—';
            const snapPlat = (a.platform_contact_phone && String(a.platform_contact_phone).trim()) || '—';
            parts.push(`<div style="padding:12px 14px;background:rgba(245,158,11,0.1);border-radius:10px;border:1px solid rgba(245,158,11,0.35);font-size:0.9rem;margin-bottom:14px">
              <div style="margin-bottom:10px;color:var(--text-2);line-height:1.45">${escapeHtml(__('apps.lblLeaveIntro'))}</div>
              <div class="app-field"><span class="app-field-label">${escapeHtml(__('apps.lblProfessional'))}:</span> ${escapeHtml(a.professional_name || a.user?.username || '—')}</div>
              <div class="app-field" style="margin-top:6px"><span class="app-field-label">${escapeHtml(__('apps.lblCategory'))}:</span> ${escapeHtml(a.professional_category || '—')}</div>
              ${a.professional_subcategory ? `<div class="app-field" style="margin-top:6px"><span class="app-field-label">${escapeHtml(__('apps.lblSubcategory'))}:</span> ${escapeHtml(a.professional_subcategory)}</div>` : ''}
              <div class="app-field" style="margin-top:8px"><span class="app-field-label">${escapeHtml(__('apps.lblSnapAccount'))}:</span> ${escapeHtml(snapAcct)}</div>
              <div class="app-field" style="margin-top:6px"><span class="app-field-label">${escapeHtml(__('apps.lblSnapPlatform'))}:</span> ${escapeHtml(snapPlat)}</div>
            </div>`);
          } else if (isAreaChange) {
            parts.push(`<div style="padding:12px 14px;background:var(--purple-pale);border-radius:10px;border:1px solid rgba(139,92,246,0.25);font-size:0.9rem;margin-bottom:14px">
              <div class="app-field"><span class="app-field-label">${escapeHtml(__('apps.lblCurrentArea'))}:</span> ${escapeHtml(oldAreaDisplay)}</div>
              <div class="app-field" style="margin-top:6px"><span class="app-field-label">${escapeHtml(__('apps.lblRequestedArea'))}:</span> ${escapeHtml(areaDisplay)}</div>
            </div>`);
          } else {
            parts.push(field('apps.lblDisplayName', a.professional_name));
            parts.push(field('apps.lblCategory', a.professional_category));
            if (a.professional_subcategory) parts.push(field('apps.lblSubcategory', a.professional_subcategory));
            parts.push(field('apps.lblArea', areaDisplay));
            parts.push(field('apps.lblLocation', a.professional_location));
            if (a.professional_location_link) parts.push(field('apps.lblLocationLink', a.professional_location_link, true));
            if (a.professional_booking_note) parts.push(field('apps.lblBookingNote', a.professional_booking_note));
          }
          if (a.id_photo_url || a.commercial_register_url) {
            parts.push(`<div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">
              ${a.id_photo_url ? `<a href="${escapeHtml(a.id_photo_url)}" target="_blank" rel="noopener" class="btn btn-secondary" style="font-size:0.8rem;padding:6px 14px">${escapeHtml(__('apps.viewId'))}</a>` : ''}
              ${a.commercial_register_url ? `<a href="${escapeHtml(a.commercial_register_url)}" target="_blank" rel="noopener" class="btn btn-secondary" style="font-size:0.8rem;padding:6px 14px">${escapeHtml(__('apps.viewCommercial'))}</a>` : ''}
            </div>`);
          }
          const bodyHtml = parts.join('');
          const badgeHtml = isAccountDeletion
            ? `<span class="badge" style="background:rgba(239,68,68,0.2);color:#ef4444">${escapeHtml(__('apps.badgeDelete'))}</span>`
            : isProfessionalLeave
              ? `<span class="badge" style="background:rgba(245,158,11,0.2);color:#b45309">${escapeHtml(__('apps.badgeLeave'))}</span>`
            : isAreaChange
              ? `<span class="badge badge-blue">${escapeHtml(__('apps.badgeArea'))}</span>`
              : `<span class="badge badge-purple">${escapeHtml(__('apps.badgeNew'))}</span>`;
          const approveLabel = isAccountDeletion ? __('apps.approveDelete') : isProfessionalLeave ? __('apps.approveLeave') : isAreaChange ? __('apps.approveArea') : __('apps.approve');
          return `
          <div class="card app-card">
            <div class="card-row" style="align-items:flex-start;gap:16px">
              ${a.user?.profile_picture ? `<img src="${escapeHtml(a.user.profile_picture)}" alt="" style="width:64px;height:64px;border-radius:12px;object-fit:cover;flex-shrink:0">` : ''}
              <div class="card-info" style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
                  <strong style="font-size:1.05rem">${escapeHtml(a.professional_name || a.user?.username || '—')}</strong>
                  ${badgeHtml}
                </div>
                <div style="color:var(--text-mid);font-size:0.9rem;margin-bottom:14px">@${escapeHtml(a.user?.username || a.user?.email || '—')} · ${formatDateShort(a.created_at)}</div>
                <div style="font-size:0.82rem;color:var(--text-2);margin-bottom:14px;line-height:1.5">
                  <strong>${escapeHtml(__('apps.mobile'))}</strong> ${escapeHtml((a.user?.phone_number && String(a.user.phone_number).trim()) || '—')}
                  ${(a.user?.platform_contact_phone && String(a.user.platform_contact_phone).trim()) ? ` · <strong>${escapeHtml(__('apps.platformContact'))}</strong> ${escapeHtml(String(a.user.platform_contact_phone).trim())}` : ''}
                </div>
                <div style="font-size:0.9rem;line-height:1.6" class="app-fields">${bodyHtml}</div>
              </div>
            </div>
            <div class="card-actions" style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">
              <button class="btn btn-approve" data-id="${a.id}" data-action="approve">${escapeHtml(approveLabel)}</button>
              <button class="btn btn-reject" data-id="${a.id}" data-action="reject">${escapeHtml(__('apps.reject'))}</button>
            </div>
          </div>
        `;
        }).join('');
        el.querySelectorAll('[data-action]').forEach(b => {
          b.addEventListener('click', () => {
            if (b.dataset.action === 'approve') reviewApplication(b.dataset.id, 'approve');
            else openReviewModal(b.dataset.id, 'application');
          });
        });
      }

      const pagEl = document.getElementById('applications-pagination');
      if (search) {
        const rtxt = list.length === 1 ? __('apps.resultsOne') : __('apps.resultsMany').replace('{n}', String(list.length));
        pagEl.innerHTML = `<span style="color:var(--gray-400);font-size:0.875rem">${escapeHtml(rtxt)}</span>`;
      } else {
        pagEl.innerHTML = `
          <button ${applicationsPage <= 1 ? 'disabled' : ''} data-page="prev">${escapeHtml(__('common.prev'))}</button>
          <span>${escapeHtml(__('common.page').replace('{n}', String(applicationsPage)))}</span>
          <button ${!pag.hasMore ? 'disabled' : ''} data-page="next">${escapeHtml(__('common.next'))}</button>
        `;
        pagEl.querySelectorAll('[data-page]').forEach(btn =>
          btn.addEventListener('click', () => {
            if (btn.dataset.page === 'prev' && applicationsPage > 1) applicationsPage--;
            if (btn.dataset.page === 'next' && pag.hasMore) applicationsPage++;
            loadApplications();
          })
        );
      }
    } catch (err) {
      el.innerHTML = `<div class="empty error-msg">${escapeHtml(err.message)} <button class="btn-retry">${escapeHtml(__('common.retry'))}</button></div>`;
      el.querySelector('.btn-retry')?.addEventListener('click', loadApplications);
      toast(err.message, 'error');
    }
  }

  document.getElementById('app-search')?.addEventListener('input', debounce(() => { applicationsPage = 1; loadApplications(); }, 350));

  async function reviewApplication(id, action, reviewNote) {
    try {
      const body = { action };
      if (reviewNote) body.review_note = reviewNote;
      await api(`/professionals/${id}/applications/review`, { method: 'POST', body: JSON.stringify(body) });
      hide(document.getElementById('modal-overlay'));
      hide(document.getElementById('review-modal'));
      loadApplications();
      toast(action === 'approve' ? __('apps.toastApproved') : __('apps.toastRejected'), 'success');
    } catch (err) { toast(err.message, 'error'); }
  }

  // --- Users ---
  let usersPage = 1;

  async function loadUsers() {
    const search = document.getElementById('user-search')?.value?.trim() || '';
    const isProfessional = document.getElementById('user-filter')?.value || '';
    const el = document.getElementById('users-list');
    el.innerHTML = `<div class="loading">${escapeHtml(__('common.loading'))}</div>`;

    try {
      const q = new URLSearchParams({ page: usersPage, limit: 20 });
      if (search) q.set('search', search);
      if (isProfessional) q.set('is_professional', isProfessional);
      appendCountryScopeParams(q);
      const res = await api(`/users?${q}`);
      const list = res.data || [];
      const pag = res.pagination || {};

      if (!list.length) {
        el.innerHTML = `<div class="empty">${escapeHtml(__('usr.empty'))}</div>`;
      } else {
        el.innerHTML = `
          <table>
            <thead><tr><th>${escapeHtml(__('usr.thDisplay'))}</th><th>${escapeHtml(__('usr.thUsername'))}</th><th>${escapeHtml(__('usr.thEmail'))}</th><th>${escapeHtml(__('usr.thPhone'))}</th><th>${escapeHtml(__('usr.thUid'))}</th><th>${escapeHtml(__('usr.thType'))}</th><th>${escapeHtml(__('usr.thFlags'))}</th><th>${escapeHtml(__('usr.thVerified'))}</th><th>${escapeHtml(__('usr.thJoined'))}</th><th></th></tr></thead>
            <tbody>
              ${list.map(u => `
                <tr>
                  <td><strong>${escapeHtml((u.display_name || '').trim() || '—')}</strong></td>
                  <td><span class="booking-detail-muted">${escapeHtml(u.username || '—')}</span></td>
                  <td style="color:var(--gray-500);font-size:0.8rem">${escapeHtml(u.email || '—')}</td>
                  <td style="font-size:0.78rem;max-width:140px">
                    <div>${escapeHtml((u.phone_number && String(u.phone_number).trim()) || '—')}</div>
                    ${u.is_professional ? `<div style="color:var(--gray-500);font-size:0.72rem;margin-top:2px" title="${escapeHtml(__('usr.pltContactTitle'))}">${escapeHtml(__('usr.pltShort'))} ${escapeHtml((u.platform_contact_phone && String(u.platform_contact_phone).trim()) || '—')}</div>` : ''}
                  </td>
                  <td>
                    <div style="display:flex;align-items:center;gap:6px">
                      <code style="font-size:0.72rem;background:var(--gray-100);padding:2px 6px;border-radius:4px;color:var(--gray-600);max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block" title="${escapeHtml(u.uid || '')}">${escapeHtml(u.uid || '—')}</code>
                      <button type="button" class="btn-copy-uid" data-uid="${escapeHtml(u.uid || '')}" title="${escapeHtml(__('fees.copyUidTitle'))}" style="background:none;border:none;cursor:pointer;color:var(--purple);font-size:13px;padding:2px 4px;border-radius:4px;flex-shrink:0">&#10697;</button>
                    </div>
                  </td>
                  <td><span class="badge ${u.is_professional ? 'badge-purple' : 'badge-gray'}">${escapeHtml(u.is_professional ? __('usr.typePro') : __('usr.typeUser'))}</span></td>
                  <td style="font-size:0.75rem;white-space:nowrap">
                    ${u.booking_restricted ? `<span class="badge badge-amber" title="${escapeHtml(__('usr.flagBook'))}">🔒 ${escapeHtml(__('usr.flagBook'))}</span> ` : ''}
                    ${u.is_banned ? `<span class="badge badge-red" title="${escapeHtml(__('usr.flagBan'))}">⛔ ${escapeHtml(__('usr.flagBan'))}</span> ` : ''}
                    ${u.platform_fee_suspended ? `<span class="badge badge-gray" title="${escapeHtml(__('usr.flagFee'))}">💳 ${escapeHtml(__('usr.flagFee'))}</span>` : ''}
                    ${!u.booking_restricted && !u.is_banned && !u.platform_fee_suspended ? '—' : ''}
                  </td>
                  <td>${u.is_verified ? `<span style="color:var(--purple);font-size:1.1rem" title="${escapeHtml(__('usr.thVerified'))}">✓</span>` : '—'}</td>
                  <td style="color:var(--gray-500);font-size:0.8rem">${formatDateShort(u.created_at)}</td>
                  <td><button type="button" class="btn btn-secondary" data-uid="${u.uid}">${escapeHtml(__('usr.edit'))}</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
        el.querySelectorAll('tbody button.btn-secondary[data-uid]').forEach(b =>
          b.addEventListener('click', () => viewUser(b.dataset.uid))
        );
        el.querySelectorAll('.btn-copy-uid').forEach(b =>
          b.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(b.dataset.uid).then(() => {
              b.textContent = '✓';
              setTimeout(() => { b.innerHTML = '&#10697;'; }, 1500);
              toast(__('toast.userIdCopied'), 'success');
            });
          })
        );
      }

      const pagEl = document.getElementById('users-pagination');
      if (search) {
        // No pagination when searching — results are global
        const utxt = list.length === 1 ? __('usr.resultsOne') : __('usr.resultsMany').replace('{n}', String(list.length));
        pagEl.innerHTML = `<span style="color:var(--gray-400);font-size:0.875rem">${escapeHtml(utxt)}</span>`;
      } else {
        const page = usersPage;
        const hasMore = !!pag.hasMore;
        const start = Math.max(1, page - 2);
        const end = hasMore ? page + 2 : page;
        const pages = [];
        for (let i = start; i <= end; i++) pages.push(i);
        const pageBtns = pages.map(p =>
          `<button class="pagination-page ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`
        ).join('');
        pagEl.innerHTML = `
          <button ${page <= 1 ? 'disabled' : ''} data-page="prev">${escapeHtml(__('common.prev'))}</button>
          ${pageBtns}
          ${hasMore ? '<span class="pagination-ellipsis">…</span>' : ''}
          <button ${!hasMore ? 'disabled' : ''} data-page="next">${escapeHtml(__('common.next'))}</button>
        `;
        pagEl.querySelectorAll('[data-page]').forEach(btn => {
          btn.addEventListener('click', () => {
            if (btn.dataset.page === 'prev' && page > 1) usersPage--;
            else if (btn.dataset.page === 'next' && hasMore) usersPage++;
            else if (btn.dataset.page && !isNaN(btn.dataset.page)) usersPage = parseInt(btn.dataset.page, 10);
            loadUsers();
          });
        });
      }
    } catch (err) {
      el.innerHTML = `<div class="empty error-msg">${escapeHtml(err.message)}</div>`;
    }
  }

  document.getElementById('user-search')?.addEventListener('input', debounce(() => { usersPage = 1; loadUsers(); }, 400));
  document.getElementById('user-filter')?.addEventListener('change', () => { usersPage = 1; loadUsers(); });

  async function viewUser(uid) {
    try {
      const res = await api(`/users/${uid}`);
      openUserModal(res.data);
    } catch (err) { toast(err.message, 'error'); }
  }

  function formatBookingRepSummary(user) {
    const br = user.booking_reputation || {};
    const lines = [];
    lines.push(`No-shows: ${br.no_shows ?? 0} · Rate: ${br.no_show_rate ?? 0}%`);
    lines.push(`Cancellations: ${br.cancellations ?? 0} · Bookings counted: ${br.total_bookings_created ?? 0} · Attended: ${br.appointments_attended ?? 0}`);
    const restrictedLabel = user.booking_restricted_active
      ? 'Yes (active)'
      : br.is_restricted
        ? 'Flag set (expired or pending)'
        : 'No';
    lines.push(`Booking restricted: ${restrictedLabel}`);
    if (br.restriction_reason) lines.push(`Reason: ${escapeHtml(String(br.restriction_reason))}`);
    if (br.restricted_until) lines.push(`Restricted until: ${formatDateShort(br.restricted_until)}`);
    return lines.join('<br>');
  }

  async function adminUserQuickAction(uid, payload, successMsg) {
    await api(`/users/${uid}`, { method: 'PUT', body: JSON.stringify(payload) });
    toast(successMsg, 'success');
    const res = await api(`/users/${uid}`);
    openUserModal(res.data);
    loadUsers();
  }

  function openUserModal(user) {
    document.getElementById('user-id').value = user.uid;
    document.getElementById('user-display-name').textContent = `${user.username || '—'} · ${user.email || '—'}`;
    const persEl = document.getElementById('user-phone-personal');
    const platSpan = document.getElementById('user-phone-platform');
    const platWrap = document.getElementById('user-phone-platform-wrap');
    if (persEl) persEl.textContent = (user.phone_number && String(user.phone_number).trim()) || '—';
    if (user.is_professional && platWrap && platSpan) {
      show(platWrap);
      platSpan.textContent = (user.platform_contact_phone && String(user.platform_contact_phone).trim()) || '—';
    } else if (platWrap) {
      hide(platWrap);
    }
    const verifiedEl = document.getElementById('user-verified');
    if (verifiedEl) verifiedEl.checked = !!user.is_verified;
    document.getElementById('user-banned').checked = !!user.is_banned;
    const premEl = document.getElementById('user-premium');
    if (premEl) premEl.checked = !!user.is_premium;

    const sumEl = document.getElementById('user-booking-summary');
    if (sumEl) sumEl.innerHTML = formatBookingRepSummary(user);

    const feeSusBtn = document.getElementById('user-release-fee-suspension');
    if (feeSusBtn) {
      if (user.is_suspended_for_fees) show(feeSusBtn);
      else hide(feeSusBtn);
    }
    
    // Platform fee percentage for professionals
    const feeWrap = document.getElementById('user-platform-fee-wrap');
    const feeInput = document.getElementById('user-platform-fee-percentage');
    const branchWrap = document.getElementById('user-branch-fees-wrap');
    const branchList = document.getElementById('user-branch-fees-list');
    if (feeWrap && feeInput) {
      if (user.is_professional) {
        show(feeWrap);
        feeInput.value = user.platform_fee_custom_percentage != null ? String(user.platform_fee_custom_percentage) : '';
      } else {
        hide(feeWrap);
        feeInput.value = '';
      }
    }
    if (branchWrap && branchList) {
      if (user.is_professional && Array.isArray(user.branches) && user.branches.length > 0) {
        show(branchWrap);
        branchList.innerHTML = user.branches
          .slice()
          .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
          .map((b, idx) => {
            const loc = [b.professional_city || '', b.professional_governorate || ''].filter(Boolean).join(', ');
            return `
              <label style="display:block;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg)">
                <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
                  <strong>${escapeHtml(b.name || `Branch ${idx + 1}`)}</strong>
                  ${idx === 0 ? '<span class="badge badge-purple">Main default</span>' : ''}
                </div>
                ${loc ? `<div style="font-size:0.76rem;color:var(--text-mid);margin-bottom:6px">📍 ${escapeHtml(loc)}</div>` : ''}
                <input type="number" class="user-branch-fee-input" data-branch-id="${escapeHtml(String(b.id))}" min="0" max="100" step="0.1" placeholder="${idx === 0 ? 'e.g. 5' : 'empty = use location/default'}" value="${b.platform_fee_percentage != null ? escapeHtml(String(b.platform_fee_percentage)) : ''}">
              </label>
            `;
          }).join('');
      } else {
        hide(branchWrap);
        branchList.innerHTML = '';
      }
    }
    
    show(document.getElementById('modal-overlay'));
    show(document.getElementById('user-modal'));
  }

  document.getElementById('user-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const uid = document.getElementById('user-id').value;
    const is_verified = document.getElementById('user-verified')?.checked ?? false;
    const is_banned = document.getElementById('user-banned').checked;
    const is_premium = document.getElementById('user-premium')?.checked ?? false;
    const payload = { is_verified, is_banned, is_premium };
    
    // Platform fee percentage for professionals
    const feeWrap = document.getElementById('user-platform-fee-wrap');
    const feeEl = document.getElementById('user-platform-fee-percentage');
    if (feeWrap && !feeWrap.classList.contains('hidden') && feeEl) {
      const feeVal = feeEl.value.trim();
      payload.platform_fee_custom_percentage = feeVal ? parseFloat(feeVal) : null;
    }
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await api(`/users/${uid}`, { method: 'PUT', body: JSON.stringify(payload) });
      const branchInputs = [...document.querySelectorAll('.user-branch-fee-input')];
      if (branchInputs.length > 0) {
        await Promise.all(branchInputs.map((input) => {
          const branchId = input.getAttribute('data-branch-id');
          if (!branchId) return Promise.resolve();
          const raw = input.value.trim();
          return api(`/users/${uid}/branches/${encodeURIComponent(branchId)}`, {
            method: 'PUT',
            body: JSON.stringify({
              platform_fee_percentage: raw === '' ? null : parseFloat(raw),
            }),
          });
        }));
      }
      hide(document.getElementById('modal-overlay'));
      hide(document.getElementById('user-modal'));
      loadUsers();
      toast('User updated successfully', 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; }
  });

  document.getElementById('user-delete')?.addEventListener('click', async () => {
    const uid = document.getElementById('user-id').value;
    const name = document.getElementById('user-display-name').textContent;
    if (!confirm(`Permanently delete user "${name}"?\n\nThis will delete their account, profile photo, all matches, and all associated data. This CANNOT be undone.`)) return;
    const btn = document.getElementById('user-delete');
    btn.disabled = true;
    try {
      await api(`/users/${uid}`, { method: 'DELETE' });
      hide(document.getElementById('modal-overlay'));
      hide(document.getElementById('user-modal'));
      loadUsers();
      toast('User permanently deleted', 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; }
  });

  document.getElementById('user-cancel')?.addEventListener('click', () => {
    hide(document.getElementById('modal-overlay'));
    hide(document.getElementById('user-modal'));
  });

  document.getElementById('user-clear-booking-restriction')?.addEventListener('click', async () => {
    const uid = document.getElementById('user-id')?.value;
    if (!uid) return;
    try {
      await adminUserQuickAction(uid, { clear_booking_restriction: true }, 'Booking restriction cleared');
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('user-reset-booking-reputation')?.addEventListener('click', async () => {
    const uid = document.getElementById('user-id')?.value;
    if (!uid) return;
    if (!confirm('Reset ALL booking reputation counters for this user?\n\nThis zeros no-shows, cancellations, totals, and lifts restriction flags. Cannot be undone.')) return;
    try {
      await adminUserQuickAction(uid, { reset_booking_reputation: true }, 'Booking reputation reset');
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('user-release-fee-suspension')?.addEventListener('click', async () => {
    const uid = document.getElementById('user-id')?.value;
    if (!uid) return;
    try {
      await adminUserQuickAction(uid, { release_platform_fee_suspension: true }, 'Platform fee suspension released');
    } catch (err) { toast(err.message, 'error'); }
  });

  // --- Review Modal (reject) ---
  function openReviewModal(id, type) {
    document.getElementById('review-id').value = id;
    document.getElementById('review-type').value = type;
    document.getElementById('review-note').value = '';
    document.getElementById('review-modal-title').textContent =
      type === 'application' ? 'Reject Application' : 'Reject Verification';
    show(document.getElementById('modal-overlay'));
    show(document.getElementById('review-modal'));
  }

  document.getElementById('review-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('review-id').value;
    const note = document.getElementById('review-note').value.trim();
    reviewApplication(id, 'reject', note || undefined);
  });

  document.getElementById('review-cancel')?.addEventListener('click', () => {
    hide(document.getElementById('modal-overlay'));
    hide(document.getElementById('review-modal'));
  });

  // --- Tickets ---
  let ticketsPage = 1;

  window.loadTickets = async function () {
    const el = document.getElementById('tickets-list');
    const statusFilter = document.getElementById('ticket-filter-status')?.value || '';
    el.innerHTML = `<div class="loading">${escapeHtml(__('tk.loading'))}</div>`;

    try {
      const q = new URLSearchParams({ page: ticketsPage, limit: 20 });
      if (statusFilter) q.set('status', statusFilter);
      const res = await api(`/tickets?${q}`);
      const list = res.data || [];
      const pag = res.pagination || {};

      if (!list.length) {
        el.innerHTML = `<div class="empty">${escapeHtml(__('tk.empty'))}</div>`;
      } else {
        const statusBadge = { pending: 'badge-pink', open: 'badge-amber', in_progress: 'badge-blue', closed: 'badge-gray' };
        el.innerHTML = `
          <table>
            <thead><tr><th>${escapeHtml(__('tk.thSubject'))}</th><th>${escapeHtml(__('tk.thStatus'))}</th><th>${escapeHtml(__('tk.thUser'))}</th><th>${escapeHtml(__('tk.thCreated'))}</th><th>${escapeHtml(__('tk.thUpdated'))}</th><th></th></tr></thead>
            <tbody>
              ${list.map(t => `
                <tr>
                  <td><strong>${escapeHtml(t.subject || '—')}</strong></td>
                  <td><span class="badge ${statusBadge[t.status] || 'badge-gray'}">${escapeHtml(t.status || '—')}</span></td>
                  <td style="font-size:0.82rem;max-width:220px">
                    <strong>${escapeHtml((t.user_display_name || '').trim() || (t.user_username ? '@' + t.user_username : '—'))}</strong>
                    ${t.user_display_name && t.user_username ? `<div class="booking-detail-muted" style="font-size:0.78rem">@${escapeHtml(t.user_username)}</div>` : ''}
                    ${t.user_email ? `<div style="color:var(--gray-500);font-size:0.72rem;margin-top:2px">${escapeHtml(t.user_email)}</div>` : ''}
                    ${t.user_id ? `<div style="display:flex;align-items:center;gap:6px;margin-top:4px">
                      <code style="font-size:0.68rem;background:var(--gray-100);padding:2px 6px;border-radius:4px;color:var(--gray-600);max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block" title="${escapeHtml(t.user_id)}">${escapeHtml(t.user_id)}</code>
                      <button type="button" class="btn-copy-uid" data-uid="${escapeHtml(t.user_id)}" title="${escapeHtml(__('fees.copyUidTitle'))}" style="background:none;border:none;cursor:pointer;color:var(--purple);font-size:13px;padding:2px 4px;border-radius:4px;flex-shrink:0">&#10697;</button>
                    </div>` : ''}
                  </td>
                  <td style="font-size:0.82rem;color:var(--gray-500)">${formatDate(t.created_at)}</td>
                  <td style="font-size:0.82rem;color:var(--gray-500)">${formatDate(t.updated_at)}</td>
                  <td><button class="btn btn-secondary" data-ticket-id="${escapeHtml(t.id)}">${escapeHtml(__('tk.viewReply'))}</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
        el.querySelectorAll('[data-ticket-id]').forEach(b =>
          b.addEventListener('click', () => viewTicket(b.dataset.ticketId))
        );
        el.querySelectorAll('.btn-copy-uid').forEach(b =>
          b.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(b.dataset.uid).then(() => {
              b.textContent = '✓';
              setTimeout(() => { b.innerHTML = '&#10697;'; }, 1500);
              toast(__('toast.userIdCopied'), 'success');
            });
          })
        );
      }

      const pagEl = document.getElementById('tickets-pagination');
      pagEl.innerHTML = `
        <button ${ticketsPage <= 1 ? 'disabled' : ''} data-page="prev">${escapeHtml(__('common.prev'))}</button>
        <span>${escapeHtml(__('common.page').replace('{n}', String(ticketsPage)))}</span>
        <button ${!pag.hasMore ? 'disabled' : ''} data-page="next">${escapeHtml(__('common.next'))}</button>
      `;
      pagEl.querySelectorAll('[data-page]').forEach(btn =>
        btn.addEventListener('click', () => {
          if (btn.dataset.page === 'prev' && ticketsPage > 1) ticketsPage--;
          if (btn.dataset.page === 'next' && pag.hasMore) ticketsPage++;
          loadTickets();
        })
      );
    } catch (err) {
      el.innerHTML = `<div class="empty error-msg">${escapeHtml(err.message)} <button class="btn-retry" onclick="loadTickets()">${escapeHtml(__('common.retry'))}</button></div>`;
      toast(err.message, 'error');
    }
  };

  document.getElementById('ticket-filter-status')?.addEventListener('change', () => {
    ticketsPage = 1;
    loadTickets();
  });

  let currentTicketId = null;
  let ticketPollInterval = null;

  function startTicketPolling() {
    ticketPollInterval = setInterval(() => {
      if (currentTicketId) {
        refreshTicketMessages();
      }
    }, 5000);
  }

  function stopTicketPolling() {
    if (ticketPollInterval) {
      clearInterval(ticketPollInterval);
      ticketPollInterval = null;
    }
  }

  async function refreshTicketMessages() {
    if (!currentTicketId) return;
    try {
      const res = await api(`/tickets/${currentTicketId}`);
      const { ticket, messages } = res.data || {};
      if (!ticket) return;
      const messagesEl = document.getElementById('ticket-modal-messages');
      const replyWrap = document.getElementById('ticket-modal-reply');
      const closedWrap = document.getElementById('ticket-modal-closed');
      if (!messagesEl) return;
      const sorted = (messages || []).sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
      const userMsgBg = 'rgba(255,255,255,0.06)';
      const userMsgBorder = '1px solid rgba(255,255,255,0.1)';
      messagesEl.innerHTML = sorted.map(m => `
        <div style="margin-bottom:10px;padding:10px;border-radius:8px;background:${m.is_admin ? 'var(--purple-pale)' : userMsgBg};border:${m.is_admin ? '1px solid rgba(139,92,246,0.2)' : userMsgBorder}">
          <div style="font-size:0.75rem;font-weight:600;color:var(--t2);margin-bottom:4px">
            ${m.is_admin ? 'Tickets Team' : 'User'} · ${formatDate(m.created_at)}
          </div>
          <div style="font-size:0.9rem;white-space:pre-wrap;color:var(--t1)">${escapeHtml(m.text || '')}</div>
        </div>
      `).join('') || '<div style="color:var(--gray-400)">No messages yet</div>';
      messagesEl.scrollTop = messagesEl.scrollHeight;
      if (ticket.status === 'closed') {
        show(closedWrap);
        hide(replyWrap);
        stopTicketPolling();
      } else {
        const acceptBtn = document.getElementById('ticket-accept-btn');
        const pendingNote = document.getElementById('ticket-modal-pending-note');
        if (ticket.status === 'pending') {
          show(acceptBtn);
          show(pendingNote);
        } else {
          hide(acceptBtn);
          hide(pendingNote);
        }
      }
    } catch (_) { /* silent */ }
  }

  async function viewTicket(id) {
    currentTicketId = id;
    const titleEl = document.getElementById('ticket-modal-title');
    const metaEl = document.getElementById('ticket-modal-meta');
    const messagesEl = document.getElementById('ticket-modal-messages');
    const replyWrap = document.getElementById('ticket-modal-reply');
    const closedWrap = document.getElementById('ticket-modal-closed');
    const replyText = document.getElementById('ticket-reply-text');

    titleEl.textContent = 'Loading...';
    metaEl.textContent = '';
    messagesEl.innerHTML = '<div class="loading">Loading...</div>';
    replyText.value = '';
    hide(replyWrap);
    hide(closedWrap);

    show(document.getElementById('modal-overlay'));
    show(document.getElementById('ticket-modal'));

    try {
      const res = await api(`/tickets/${id}`);
      const { ticket, messages, user: ticketUser } = res.data || {};
      if (!ticket) throw new Error('Ticket not found');

      titleEl.textContent = ticket.subject || 'Ticket';
      const badgeMap = { pending: 'badge-pink', open: 'badge-amber', in_progress: 'badge-blue', closed: 'badge-gray' };
      const dn = adminDisplayNameFromUser(ticketUser);
      const un = (ticketUser && ticketUser.username) ? String(ticketUser.username).trim() : '';
      const em = (ticketUser && ticketUser.email) ? String(ticketUser.email).trim() : '';
      let userLine = '';
      if (dn || un) {
        userLine = (dn ? `<strong>${escapeHtml(dn)}</strong>` : '') + (un ? `${dn ? ' ' : ''}<span class="booking-detail-muted">@${escapeHtml(un)}</span>` : '');
        if (em) userLine += ` · <span style="color:var(--gray-500);font-size:0.8rem">${escapeHtml(em)}</span>`;
      } else if (ticket.user_id) {
        userLine = `<code style="font-size:0.78rem" title="${escapeHtml(ticket.user_id)}">${escapeHtml(ticket.user_id)}</code>`;
      } else {
        userLine = '—';
      }
      if ((dn || un) && ticket.user_id) {
        userLine += ` · <small style="color:var(--gray-500)">UID</small> <code style="font-size:0.72rem">${escapeHtml(ticket.user_id)}</code>`;
      }
      metaEl.innerHTML = `
        <span class="badge ${badgeMap[ticket.status] || 'badge-gray'}">${escapeHtml(ticket.status || '—')}</span>
        · User: ${userLine}
        · Created ${formatDate(ticket.created_at)}
      `;

      const sorted = (messages || []).sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
      const userMsgBg = 'rgba(255,255,255,0.06)';
      const userMsgBorder = '1px solid rgba(255,255,255,0.1)';
      messagesEl.innerHTML = sorted.map(m => `
        <div style="margin-bottom:10px;padding:10px;border-radius:8px;background:${m.is_admin ? 'var(--purple-pale)' : userMsgBg};border:${m.is_admin ? '1px solid rgba(139,92,246,0.2)' : userMsgBorder}">
          <div style="font-size:0.75rem;font-weight:600;color:var(--t2);margin-bottom:4px">
            ${m.is_admin ? 'Tickets Team' : 'User'} · ${formatDate(m.created_at)}
          </div>
          <div style="font-size:0.9rem;white-space:pre-wrap;color:var(--t1)">${escapeHtml(m.text || '')}</div>
        </div>
      `).join('') || '<div style="color:var(--gray-400)">No messages yet</div>';

      messagesEl.scrollTop = messagesEl.scrollHeight;

      if (ticket.status === 'closed') {
        show(closedWrap);
        stopTicketPolling();
      } else {
        show(replyWrap);
        const acceptBtn = document.getElementById('ticket-accept-btn');
        const pendingNote = document.getElementById('ticket-modal-pending-note');
        if (ticket.status === 'pending') {
          show(acceptBtn);
          show(pendingNote);
        } else {
          hide(acceptBtn);
          hide(pendingNote);
        }
        startTicketPolling();
      }
    } catch (err) {
      messagesEl.innerHTML = `<div class="empty error-msg">${escapeHtml(err.message)}</div>`;
      toast(err.message, 'error');
      stopTicketPolling();
    }
  }

  document.getElementById('ticket-modal-close')?.addEventListener('click', () => {
    stopTicketPolling();
    hide(document.getElementById('modal-overlay'));
    hide(document.getElementById('ticket-modal'));
    if (typeof loadTickets === 'function') loadTickets();
    if (typeof loadDashboard === 'function') loadDashboard();
  });

  document.getElementById('ticket-send-reply')?.addEventListener('click', async () => {
    if (!currentTicketId) return;
    const text = document.getElementById('ticket-reply-text')?.value?.trim();
    if (!text) { toast('Please enter a reply', 'error'); return; }
    try {
      await api(`/tickets/${currentTicketId}/messages`, { method: 'POST', body: JSON.stringify({ text }) });
      document.getElementById('ticket-reply-text').value = '';
      refreshTicketMessages();
      toast('Reply sent', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('ticket-accept-btn')?.addEventListener('click', async () => {
    if (!currentTicketId) return;
    try {
      await api(`/tickets/${currentTicketId}/status`, { method: 'PUT', body: JSON.stringify({ status: 'open' }) });
      refreshTicketMessages();
      loadTickets();
      if (typeof loadDashboard === 'function') loadDashboard();
      toast('Ticket accepted. User can now send messages.', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('ticket-mark-in-progress')?.addEventListener('click', async () => {
    if (!currentTicketId) return;
    try {
      await api(`/tickets/${currentTicketId}/status`, { method: 'PUT', body: JSON.stringify({ status: 'in_progress' }) });
      refreshTicketMessages();
      loadTickets();
      toast('Ticket marked in progress', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('ticket-close-btn')?.addEventListener('click', async () => {
    if (!currentTicketId) return;
    if (!confirm('Close this ticket? The user will not be able to send more messages.')) return;
    try {
      await api(`/tickets/${currentTicketId}/close`, { method: 'POST' });
      stopTicketPolling();
      loadTickets();
      hide(document.getElementById('modal-overlay'));
      hide(document.getElementById('ticket-modal'));
      if (typeof loadDashboard === 'function') loadDashboard();
      toast('Ticket closed', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });

  // --- Push Notifications ---
  const notifHistory = [];

  function initNotifications() {
    renderNotifHistory();
  }

  document.getElementById('notif-target')?.addEventListener('change', function () {
    const wrap = document.getElementById('notif-uid-wrap');
    if (this.value === 'user') { wrap.style.display = ''; }
    else { wrap.style.display = 'none'; }
  });

  document.getElementById('notif-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const target = document.getElementById('notif-target').value;
    const uid = document.getElementById('notif-uid')?.value?.trim();
    const clientPlatform = document.getElementById('notif-platform')?.value || 'all';
    const title = document.getElementById('notif-title').value.trim();
    const body = document.getElementById('notif-body').value.trim();
    const btn = document.getElementById('notif-send-btn');

    if (!title || !body) { toast('Title and message are required', 'error'); return; }
    if (target === 'user' && !uid) { toast('Please enter a User UID', 'error'); return; }

    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
      const payload = { title, body, target, client_platform: clientPlatform };
      if (target === 'user' && uid) payload.uid = uid;

      await api('/notifications/send', { method: 'POST', body: JSON.stringify(payload) });

      // Track in local history
      notifHistory.unshift({
        title,
        body,
        target,
        uid: uid || null,
        client_platform: clientPlatform,
        sentAt: Date.now(),
      });
      renderNotifHistory();

      document.getElementById('notif-form').reset();
      document.getElementById('notif-uid-wrap').style.display = 'none';
      toast('Notification sent successfully!', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Notification';
    }
  });

  function renderNotifHistory() {
    const el = document.getElementById('notif-history');
    if (!el) return;
    if (!notifHistory.length) {
      el.innerHTML = '<div class="empty">No notifications sent this session</div>';
      return;
    }
    el.innerHTML = `
      <div class="activity-list">
        ${notifHistory.map(n => `
          <div class="activity-item">
            <div class="activity-dot green"></div>
            <div class="activity-text">
              <strong>${escapeHtml(n.title)}</strong> — ${escapeHtml(n.body)}
              <div style="font-size:0.8rem;color:var(--gray-400);margin-top:3px">
                Target: ${escapeHtml(n.target)}${n.uid ? ` · UID: ${escapeHtml(n.uid)}` : ''}${n.client_platform && n.client_platform !== 'all' ? ` · Platform: ${escapeHtml(n.client_platform)}` : ''}
              </div>
            </div>
            <div class="activity-time">${formatDate(n.sentAt)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // --- Admin Accounts ---
  async function loadAccounts() {
    const el = document.getElementById('accounts-list');
    el.innerHTML = `<div class="loading">${escapeHtml(__('common.loading'))}</div>`;
    try {
      const res = await api('/accounts');
      const list = res.data || [];
      if (!list.length) { el.innerHTML = '<div class="empty">No admin accounts</div>'; return; }

      const admin = getAdmin();
      el.innerHTML = `
        <table>
          <thead><tr><th>Username</th><th>Roles</th><th>Status</th><th>Last Login</th><th></th></tr></thead>
          <tbody>
            ${list.map(a => `
              <tr>
                <td><strong>${escapeHtml(a.username)}</strong></td>
                <td><div style="display:flex;flex-wrap:wrap;gap:4px">${(Array.isArray(a.roles) && a.roles.length ? a.roles : [a.role]).map((r) => `<span class="badge badge-purple">${escapeHtml(roleLabel(r))}</span>`).join('')}</div></td>
                <td><span class="badge ${a.is_active ? 'badge-green' : 'badge-gray'}">${a.is_active ? 'Active' : 'Inactive'}</span></td>
                <td style="color:var(--gray-500);font-size:0.8rem">${formatDateShort(a.last_login_at)}</td>
                <td>
                  ${a.id === admin?.id ? `
                    <button class="btn btn-secondary" data-edit="${a.id}">Edit</button>
                  ` : a.role === 'super_admin' ? '<span style="color:var(--gray-400);font-size:0.8rem">—</span>' : `
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                      <button class="btn btn-secondary" data-edit="${a.id}">Edit</button>
                      <button class="btn btn-secondary" data-deactivate="${a.id}">Deactivate</button>
                      <button class="btn btn-danger" data-delete-permanent="${a.id}">Delete</button>
                    </div>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      el.querySelectorAll('[data-edit]').forEach(b =>
        b.addEventListener('click', () => editAccount(list.find(a => a.id === b.dataset.edit)))
      );
      el.querySelectorAll('[data-deactivate]').forEach(b =>
        b.addEventListener('click', () => deactivateAccount(b.dataset.deactivate))
      );
      el.querySelectorAll('[data-delete-permanent]').forEach(b =>
        b.addEventListener('click', () => deleteAccountPermanent(b.dataset.deletePermanent))
      );
    } catch (err) {
      el.innerHTML = `<div class="empty error-msg">${escapeHtml(err.message)} <button class="btn-retry">Retry</button></div>`;
      el.querySelector('.btn-retry')?.addEventListener('click', loadAccounts);
      toast(err.message, 'error');
    }
  }

  document.getElementById('account-add')?.addEventListener('click', () => {
    document.getElementById('account-modal-title').textContent = 'Add Admin';
    document.getElementById('acc-id').value = '';
    document.getElementById('account-form').reset();
    document.getElementById('acc-username').readOnly = false;
    document.getElementById('acc-password').required = true;
    document.getElementById('acc-password').placeholder = 'Minimum 8 characters';
    document.getElementById('acc-submit').textContent = 'Create Admin';
    hide(document.getElementById('acc-active-wrap'));
    fillAccRoleCheckboxes('create');
    show(document.getElementById('acc-role-wrap'));
    show(document.getElementById('modal-overlay'));
    show(document.getElementById('account-modal'));
  });

  document.getElementById('account-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('acc-id').value;
    const username = document.getElementById('acc-username').value.trim();
    const password = document.getElementById('acc-password').value;
    const btn = document.getElementById('acc-submit');
    btn.disabled = true;
    try {
      if (id) {
        const payload = {
          is_active: document.getElementById('acc-active').checked,
        };
        const sel = getSelectedAccRoles();
        if (document.getElementById('acc-roles-checkboxes')?.querySelector('input[type="checkbox"]')) {
          if (!sel.length) {
            toast('Select at least one role', 'error');
            btn.disabled = false;
            return;
          }
          payload.roles = sel;
        }
        if (password.length >= 8) payload.password = password;
        await api(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast('Account updated', 'success');
      } else {
        const roles = getSelectedAccRoles();
        if (!roles.length) {
          toast('Select at least one role', 'error');
          btn.disabled = false;
          return;
        }
        await api('/accounts', {
          method: 'POST',
          body: JSON.stringify({ username, password, roles }),
        });
        toast('Admin account created', 'success');
      }
      hide(document.getElementById('modal-overlay'));
      hide(document.getElementById('account-modal'));
      loadAccounts();
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; }
  });

  document.getElementById('acc-cancel')?.addEventListener('click', () => {
    hide(document.getElementById('modal-overlay'));
    hide(document.getElementById('account-modal'));
  });

  function editAccount(a) {
    document.getElementById('account-modal-title').textContent = 'Edit Admin';
    document.getElementById('acc-id').value = a.id;
    document.getElementById('acc-username').value = a.username;
    document.getElementById('acc-username').readOnly = true;
    document.getElementById('acc-password').value = '';
    document.getElementById('acc-password').required = false;
    document.getElementById('acc-password').placeholder = 'Leave blank to keep current password';
    fillAccRoleCheckboxes('edit', a);
    document.getElementById('acc-active').checked = a.is_active !== false;
    document.getElementById('acc-submit').textContent = 'Save Changes';
    show(document.getElementById('acc-role-wrap'));
    show(document.getElementById('acc-active-wrap'));
    show(document.getElementById('modal-overlay'));
    show(document.getElementById('account-modal'));
  }

  async function deactivateAccount(id) {
    if (!confirm('Deactivate this admin account? They will no longer be able to sign in.')) return;
    try {
      await api(`/accounts/${id}`, { method: 'DELETE' });
      loadAccounts();
      toast('Admin account deactivated', 'success');
    } catch (err) { toast(err.message, 'error'); }
  }

  async function deleteAccountPermanent(id) {
    if (!confirm('Permanently delete this admin account? This cannot be undone.')) return;
    try {
      await api(`/accounts/${id}?permanent=true`, { method: 'DELETE' });
      loadAccounts();
      toast('Admin account permanently deleted', 'success');
    } catch (err) { toast(err.message, 'error'); }
  }

  // --- Modal overlay close on backdrop click ---
  document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') {
      stopTicketPolling();
      document.querySelectorAll('.modal').forEach(m => hide(m));
      hide(document.getElementById('modal-overlay'));
    }
  });

  let bookingsSimplePage = 1;

  function getBookingsListPageSize() {
    const sel = document.getElementById('booking-simple-page-size');
    const v = parseInt(String(sel?.value || '25'), 10);
    if ([10, 25, 50, 100].includes(v)) return v;
    return 25;
  }

  function buildBookingsPaginationHtml(pag, page, rowsLength) {
    const limit = pag.limit || getBookingsListPageSize();
    const totalPages = pag.totalPages;
    const totalFiltered = typeof pag.totalFiltered === 'number' ? pag.totalFiltered : null;
    const scanTruncated = pag.scanTruncated === true;
    const hasMore = pag.hasMore === true;
    const start = rowsLength === 0 ? 0 : (page - 1) * limit + 1;
    const end = (page - 1) * limit + rowsLength;

    let summary = '';
    if (rowsLength === 0 && page === 1) {
      summary = escapeHtml(__('bk.emptyFilter'));
    } else if (rowsLength === 0) {
      summary = escapeHtml(__('bk.pagEmptyPage'));
    } else if (scanTruncated && totalFiltered != null) {
      summary = __('bk.pagScanHtml')
        .replace('{start}', String(start))
        .replace('{end}', String(end))
        .replace('{total}', totalFiltered.toLocaleString());
    } else if (totalFiltered != null && totalPages != null) {
      const tpl = totalFiltered === 1 ? __('bk.pagOfOneHtml') : __('bk.pagOfManyHtml');
      summary = tpl
        .replace('{start}', String(start))
        .replace('{end}', String(end))
        .replace('{total}', totalFiltered.toLocaleString());
    } else {
      summary = __('bk.pagRangeHtml').replace('{start}', String(start)).replace('{end}', String(end));
    }

    const canFirst = page > 1;
    const canPrev = page > 1;
    const canNext = hasMore;
    const canLast = totalPages != null && page < totalPages;

    let pageButtons = '';
    if (totalPages != null && totalPages > 1 && totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pageButtons += `<button type="button" class="btn ${i === page ? 'btn-primary' : 'btn-secondary'} btn-tiny" onclick="loadBookingsSimple(${i})">${i}</button>`;
      }
    } else if (totalPages != null && totalPages > 7) {
      const span = 5;
      let lo = Math.max(1, page - 2);
      let hi = Math.min(totalPages, lo + span - 1);
      lo = Math.max(1, hi - span + 1);
      if (lo > 1) {
        pageButtons += `<button type="button" class="btn btn-secondary btn-tiny" onclick="loadBookingsSimple(1)">1</button>`;
        if (lo > 2) pageButtons += '<span class="pagination-ellipsis">…</span>';
      }
      for (let i = lo; i <= hi; i++) {
        pageButtons += `<button type="button" class="btn ${i === page ? 'btn-primary' : 'btn-secondary'} btn-tiny" onclick="loadBookingsSimple(${i})">${i}</button>`;
      }
      if (hi < totalPages) {
        if (hi < totalPages - 1) pageButtons += '<span class="pagination-ellipsis">…</span>';
        pageButtons += `<button type="button" class="btn btn-secondary btn-tiny" onclick="loadBookingsSimple(${totalPages})">${totalPages}</button>`;
      }
    } else if (totalPages == null && (scanTruncated || hasMore || page > 1)) {
      pageButtons = `<span class="pagination-meta">${__('bk.pagPageMeta').replace('{n}', String(page))}</span>`;
    }

    const lastBtnAttrs =
      totalPages != null
        ? `${!canLast ? 'disabled ' : ''}onclick="loadBookingsSimple(${totalPages})"`
        : 'disabled';

    return `
      <div class="bookings-pagination">
        <div class="bookings-pagination-summary">${summary}</div>
        <div class="bookings-pagination-controls">
          <button type="button" class="btn btn-secondary btn-small" ${!canFirst ? 'disabled' : ''} onclick="loadBookingsSimple(1)">${escapeHtml(__('common.first'))}</button>
          <button type="button" class="btn btn-secondary btn-small" ${!canPrev ? 'disabled' : ''} onclick="loadBookingsSimple(${page - 1})">${escapeHtml(__('common.prev'))}</button>
          <div class="bookings-pagination-pages">${pageButtons}</div>
          <button type="button" class="btn btn-secondary btn-small" ${!canNext ? 'disabled' : ''} onclick="loadBookingsSimple(${page + 1})">${escapeHtml(__('common.next'))}</button>
          <button type="button" class="btn btn-secondary btn-small" ${lastBtnAttrs}>${escapeHtml(__('common.last'))}</button>
        </div>
      </div>`;
  }

  function matchStatusBadgeClass(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'accepted') return 'badge-green';
    if (s === 'pending') return 'badge-amber';
    if (s === 'cancelled') return 'badge-red';
    return 'badge-gray';
  }

  function bookingQueueBadgeClass(bs) {
    const s = String(bs || '').toLowerCase();
    if (s === 'completed') return 'badge-green';
    if (s === 'current') return 'badge-blue';
    if (s === 'absent') return 'badge-red';
    return 'badge-purple';
  }

  window.showBookingDetailById = async function (id) {
    const rows = window._bookingsSimpleLastRows || [];
    let b = rows.find((x) => String(x.id) === String(id));
    if (!b) {
      try {
        const res = await api(`/bookings/${encodeURIComponent(String(id))}`);
        b = res.data;
      } catch (err) {
        toast(err.message || 'Booking not found', 'error');
        return;
      }
    }
    showBookingDetailModal(b);
  };

  function showBookingDetailModal(b) {
    function personBlock(displayName, username, uid) {
      const dn = (displayName || '').trim();
      const un = (username || '').trim();
      let main;
      if (dn || un) {
        const left = dn ? escapeHtml(dn) : '';
        const at = un ? `<span class="booking-detail-muted">@${escapeHtml(un)}</span>` : '';
        main = left && at ? `${left} ${at}` : left || at;
      } else if (uid) {
        main = `<code class="booking-detail-mono">${escapeHtml(String(uid))}</code>`;
      } else {
        main = '—';
      }
      const uidSmall = (dn || un) && uid
        ? `<br><small class="booking-detail-muted">UID: <code class="booking-detail-mono">${escapeHtml(String(uid))}</code></small>`
        : '';
      return main + uidSmall;
    }

    const cur = (b.booking_currency && String(b.booking_currency).trim()) || 'EGP';
    const amt = b.booking_amount != null && b.booking_amount !== '' ? `${Number(b.booking_amount).toFixed(2)} ${cur}` : '—';
    const branchName = (b.branch_display_name && String(b.branch_display_name).trim()) || '';
    const branchId = b.branch_id ? String(b.branch_id) : '';
    const branch =
      branchName
        ? `${escapeHtml(branchName)}${branchId ? `<br><small class="booking-detail-muted">ID: <code class="booking-detail-mono">${escapeHtml(branchId)}</code></small>` : ''}`
        : branchId
          ? `<code class="booking-detail-mono">${escapeHtml(branchId)}</code>`
          : '—';
    const creatorBlock = personBlock(b.creator_display_name, b.creator_username, b.creator_id);
    const participantsBlock =
      Array.isArray(b.participants_enriched) && b.participants_enriched.length
        ? b.participants_enriched
            .map(
              (p) =>
                `<div style="margin-bottom:8px">${personBlock(p.display_name, p.username, p.user_id)}</div>`,
            )
            .join('')
        : Array.isArray(b.participants)
          ? b.participants.map((p) => `<code class="booking-detail-mono">${escapeHtml(String(p))}</code>`).join(', ')
          : '—';
    const cancelledBlock = personBlock(b.cancelled_by_display_name, b.cancelled_by_username, b.cancelled_by);
    const cancelReason = (b.cancelled_reason && String(b.cancelled_reason).trim())
      ? escapeHtml(String(b.cancelled_reason).slice(0, 4000))
      : '—';
    let svc = '—';
    try {
      if (b.selected_services != null) svc = escapeHtml(JSON.stringify(b.selected_services, null, 2));
    } catch { svc = '—'; }

    const body = document.getElementById('booking-detail-modal-body');
    if (!body) return;
    body.innerHTML = `
      <div class="booking-detail-toolbar">
        <button type="button" class="btn btn-secondary" id="booking-detail-copy-id">Copy record ID</button>
      </div>
      <dl class="booking-detail-dl">
        <dt>Record ID</dt><dd><code class="booking-detail-mono">${escapeHtml(String(b.id))}</code><br><small class="booking-detail-muted">Firestore document id — for support &amp; engineering</small></dd>
        <dt>Professional</dt><dd>${escapeHtml(b.professional_name || '')} <span class="booking-detail-muted">@${escapeHtml(b.professional_username || '')}</span></dd>
        <dt>Professional mobile</dt><dd>${escapeHtml((b.professional_phone && String(b.professional_phone).trim()) || '—')}</dd>
        <dt>Platform contact (pro)</dt><dd>${escapeHtml((b.professional_platform_contact_phone && String(b.professional_platform_contact_phone).trim()) || '—')}</dd>
        <dt>Customer</dt><dd>${escapeHtml(b.customer_name || '')} <span class="booking-detail-muted">@${escapeHtml(b.customer_username || '')}</span></dd>
        <dt>Customer mobile</dt><dd>${escapeHtml((b.customer_phone && String(b.customer_phone).trim()) || '—')}</dd>
        <dt>Creator</dt><dd>${creatorBlock}</dd>
        <dt>Participants</dt><dd>${participantsBlock}</dd>
        <dt>Slot</dt><dd>${escapeHtml(formatBookingSlotLabel(b))}</dd>
        <dt>Branch</dt><dd>${branch}</dd>
        <dt>Match status</dt><dd><span class="badge ${matchStatusBadgeClass(b.status)}">${escapeHtml(b.status || '—')}</span></dd>
        <dt>Queue status</dt><dd><span class="badge ${bookingQueueBadgeClass(b.booking_status)}">${escapeHtml(b.booking_status || '—')}</span></dd>
        <dt>Amount</dt><dd>${escapeHtml(amt)}</dd>
        <dt>Created</dt><dd>${escapeHtml(formatDate(b.created_at))}</dd>
        <dt>Updated</dt><dd>${escapeHtml(formatDate(b.updated_at))}</dd>
        <dt>Completed at</dt><dd>${escapeHtml(formatDate(b.completed_at))}</dd>
        <dt>Cancelled by</dt><dd>${cancelledBlock}</dd>
        <dt>Cancelled at</dt><dd>${escapeHtml(formatDate(b.cancelled_at))}</dd>
        <dt>Cancellation reason</dt><dd class="booking-detail-multiline">${cancelReason}</dd>
        <dt>Services (JSON)</dt><dd><pre class="booking-detail-pre">${svc}</pre></dd>
      </dl>
      <div class="booking-admin-panel" style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
        <h4 style="font-size:0.92rem;margin:0 0 12px;color:var(--text-2)">Admin: change state</h4>
        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end">
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-mid);margin-bottom:4px">Match status</label>
            <select id="booking-admin-match-status" style="padding:8px 10px;border-radius:8px;border:1px solid var(--border);min-width:11rem">
              ${['pending', 'accepted', 'cancelled'].map((v) => `<option value="${v}"${String(b.status || '').toLowerCase() === v ? ' selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-mid);margin-bottom:4px">Queue status</label>
            <select id="booking-admin-queue-status" style="padding:8px 10px;border-radius:8px;border:1px solid var(--border);min-width:11rem">
              ${['waiting', 'current', 'completed', 'absent'].map((v) => `<option value="${v}"${String(b.booking_status || 'waiting').toLowerCase() === v ? ' selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
          <div style="flex:1;min-width:12rem">
            <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-mid);margin-bottom:4px">Cancellation note (optional)</label>
            <input type="text" id="booking-admin-cancel-reason" placeholder="Reason shown if cancelling" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border)" maxlength="500">
          </div>
          <button type="button" class="btn btn-primary" id="booking-admin-apply">Apply</button>
        </div>
        <p style="font-size:0.72rem;color:var(--gray-500);margin:10px 0 0;line-height:1.4">Use for support fixes only. Wrong combinations can confuse clients or billing.</p>
      </div>`;

    const titleEl = document.getElementById('booking-detail-modal-title');
    if (titleEl) titleEl.textContent = 'Booking details';
    document.querySelectorAll('#modal-overlay .modal').forEach((m) => hide(m));
    show(document.getElementById('modal-overlay'));
    show(document.getElementById('booking-detail-modal'));

    const copyBtn = document.getElementById('booking-detail-copy-id');
    if (copyBtn) {
      copyBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(String(b.id));
          toast('Record ID copied', 'success');
        } catch {
          toast('Could not copy', 'error');
        }
      };
    }

    const applyBtn = document.getElementById('booking-admin-apply');
    const reasonInput = document.getElementById('booking-admin-cancel-reason');
    if (reasonInput) {
      reasonInput.value = (b.cancelled_reason && String(b.cancelled_reason).trim().slice(0, 500)) || '';
    }
    if (applyBtn && reasonInput) {
      const bid = String(b.id);
      applyBtn.onclick = async () => {
        const status = document.getElementById('booking-admin-match-status')?.value;
        const booking_status = document.getElementById('booking-admin-queue-status')?.value;
        const cancelled_reason = reasonInput.value.trim();
        const payload = { status, booking_status };
        if (cancelled_reason) payload.cancelled_reason = cancelled_reason;
        applyBtn.disabled = true;
        try {
          const res = await api(`/bookings/${encodeURIComponent(bid)}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
          toast('Booking updated', 'success');
          const row = res.data;
          if (row && window._bookingsSimpleLastRows && Array.isArray(window._bookingsSimpleLastRows)) {
            const ix = window._bookingsSimpleLastRows.findIndex((x) => String(x.id) === bid);
            if (ix >= 0) window._bookingsSimpleLastRows[ix] = row;
          }
          showBookingDetailModal(row);
          if (typeof window.loadBookingsSimple === 'function') window.loadBookingsSimple(bookingsSimplePage || 1);
        } catch (err) {
          toast(err.message || 'Update failed', 'error');
        } finally {
          applyBtn.disabled = false;
        }
      };
    }
  }

  window.loadBookingsSimple = async function (page = 1) {
    bookingsSimplePage = page;
    const listEl = document.getElementById('bookings-simple-list');
    const pagEl = document.getElementById('bookings-simple-pagination');
    if (!listEl) return;
    listEl.innerHTML = `<p style="padding:24px;text-align:center;color:var(--text-mid)">${escapeHtml(__('common.loading'))}</p>`;
    if (pagEl) pagEl.innerHTML = '';
    try {
      const search = document.getElementById('booking-simple-search')?.value?.trim() || '';
      const status = document.getElementById('booking-simple-filter-status')?.value || '';
      const limit = getBookingsListPageSize();
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      appendCountryScopeParams(params);
      const res = await api(`/bookings?${params}`);
      const pag = res.pagination || {};
      if (pag.pageOutOfRange && typeof pag.totalPages === 'number' && pag.totalPages >= 1) {
        bookingsSimplePage = pag.totalPages;
        await window.loadBookingsSimple(pag.totalPages);
        return;
      }
      const rows = res.data || [];
      window._bookingsSimpleLastRows = rows;
      const rowOffset = (page - 1) * limit;
      if (rows.length === 0) {
        listEl.innerHTML = `<p style="padding:40px;text-align:center;color:var(--text-mid)">${escapeHtml(__('bk.emptyFilter'))}</p>`;
      } else {
        listEl.innerHTML = `
        <table class="fees-table bookings-table">
          <thead><tr>
            <th class="col-booking-num">${escapeHtml(__('bk.thNum'))}</th><th>${escapeHtml(__('bk.thPro'))}</th><th>${escapeHtml(__('bk.thCustomer'))}</th><th>${escapeHtml(__('bk.thSlot'))}</th><th>${escapeHtml(__('bk.thBranch'))}</th>
            <th>${escapeHtml(__('bk.thMatch'))}</th><th>${escapeHtml(__('bk.thQueue'))}</th><th>${escapeHtml(__('bk.thAmount'))}</th><th>${escapeHtml(__('bk.thCreated'))}</th><th></th>
          </tr></thead>
          <tbody>
            ${rows.map((b, idx) => {
    const cur = (b.booking_currency && String(b.booking_currency).trim()) || 'EGP';
    const price = b.booking_amount != null && b.booking_amount !== ''
      ? `${Number(b.booking_amount).toFixed(0)} ${cur}`
      : '—';
    const rawId = String(b.id);
    const rowNum = rowOffset + idx + 1;
    const branchLabel = (b.branch_display_name && String(b.branch_display_name).trim())
      ? escapeHtml(String(b.branch_display_name).trim())
      : (b.branch_id
        ? `<small class="booking-detail-muted" title="${escapeHtml(String(b.branch_id))}">${escapeHtml(__('bk.unnamedBranch'))}</small>`
        : '—');
    return `
              <tr>
                <td class="col-booking-num"><span class="booking-row-num">${rowNum.toLocaleString()}</span></td>
                <td>${escapeHtml(b.professional_name)}<br><small class="booking-detail-muted">@${escapeHtml(b.professional_username)}</small></td>
                <td>${escapeHtml(b.customer_name)}<br><small class="booking-detail-muted">@${escapeHtml(b.customer_username)}</small></td>
                <td><small>${escapeHtml(formatBookingSlotLabel(b))}</small></td>
                <td><small>${branchLabel}</small></td>
                <td><span class="badge ${matchStatusBadgeClass(b.status)}">${escapeHtml(b.status || '—')}</span></td>
                <td><span class="badge ${bookingQueueBadgeClass(b.booking_status)}">${escapeHtml(b.booking_status || '—')}</span></td>
                <td>${escapeHtml(price)}</td>
                <td><small>${escapeHtml(formatDateShort(b.created_at))}</small></td>
                <td><button type="button" class="btn btn-secondary btn-tiny btn-booking-detail" data-booking-detail-id="${escapeHtml(rawId)}">${escapeHtml(__('bk.details'))}</button></td>
              </tr>`;
  }).join('')}
          </tbody>
        </table>`;
      }
      if (pagEl) {
        pagEl.innerHTML = buildBookingsPaginationHtml(pag, page, rows.length);
      }
    } catch (err) {
      listEl.innerHTML = `<p style="padding:24px;color:var(--danger, #c00)">${escapeHtml(err.message)}</p>`;
      toast(err.message, 'error');
    }
  };

  function csvEscapeCell(v) {
    const s = v == null ? '' : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function bookingTsCsv(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'number' && !Number.isNaN(v)) return new Date(v).toISOString();
    if (typeof v === 'object' && v._seconds != null) {
      return new Date(v._seconds * 1000).toISOString();
    }
    return String(v);
  }

  window.exportBookingsSimpleCSV = async function () {
    try {
      const search = document.getElementById('booking-simple-search')?.value?.trim() || '';
      const status = document.getElementById('booking-simple-filter-status')?.value || '';
      const perPage = 100;
      const maxPages = 40;
      const rows = [];
      let exportCapped = false;
      for (let p = 1; p <= maxPages; p += 1) {
        const params = new URLSearchParams({ page: String(p), limit: String(perPage) });
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        appendCountryScopeParams(params);
        const res = await api(`/bookings?${params}`);
        const chunk = res.data || [];
        rows.push(...chunk);
        const pag = res.pagination || {};
        if (chunk.length === 0) break;
        const exhausted = chunk.length < perPage || !pag.hasMore;
        if (p === maxPages && !exhausted) exportCapped = true;
        if (exhausted) break;
      }
      if (!rows.length) {
        toast('No bookings to export', 'error');
        return;
      }
      const headers = [
        'id',
        'branch_id',
        'branch_display_name',
        'professional_name',
        'professional_username',
        'customer_name',
        'customer_username',
        'slot_label',
        'match_status',
        'booking_status',
        'booking_amount',
        'booking_currency',
        'creator_id',
        'cancelled_by',
        'cancelled_at_iso',
        'cancelled_reason',
        'completed_at_iso',
        'created_at_iso',
        'updated_at_iso',
        'selected_services_json',
      ];
      const lines = [headers.join(',')];
      for (const b of rows) {
        const cur = (b.booking_currency && String(b.booking_currency).trim()) || 'EGP';
        let svcJson = '';
        try {
          if (b.selected_services != null) svcJson = JSON.stringify(b.selected_services);
        } catch { /* ignore */ }
        const reason = b.cancelled_reason != null ? String(b.cancelled_reason).slice(0, 2000) : '';
        lines.push([
          csvEscapeCell(b.id),
          csvEscapeCell(b.branch_id),
          csvEscapeCell(b.branch_display_name),
          csvEscapeCell(b.professional_name),
          csvEscapeCell(b.professional_username),
          csvEscapeCell(b.customer_name),
          csvEscapeCell(b.customer_username),
          csvEscapeCell(formatBookingSlotLabel(b)),
          csvEscapeCell(b.status),
          csvEscapeCell(b.booking_status),
          csvEscapeCell(b.booking_amount != null && b.booking_amount !== '' ? Number(b.booking_amount).toFixed(2) : ''),
          csvEscapeCell(cur),
          csvEscapeCell(b.creator_id),
          csvEscapeCell(b.cancelled_by),
          csvEscapeCell(bookingTsCsv(b.cancelled_at)),
          csvEscapeCell(reason),
          csvEscapeCell(bookingTsCsv(b.completed_at)),
          csvEscapeCell(bookingTsCsv(b.created_at)),
          csvEscapeCell(bookingTsCsv(b.updated_at)),
          csvEscapeCell(svcJson),
        ].join(','));
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookings_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      if (exportCapped) {
        toast(`Exported ${rows.length} rows (reached export page cap — narrow filters if you need the full set).`, 'info');
      } else {
        toast(`Exported ${rows.length} row(s)`, 'success');
      }
    } catch (err) {
      toast(err.message || 'Export failed', 'error');
    }
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Booking Lifecycle Management
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  window.loadBookingLifecycle = async function() {
    try {
      const statsRes = await api('/bookings/lifecycle/stats');
      const expiredRes = await api('/bookings/expired');
      const stats = statsRes.data || {};
      
      // Render stats
      const statsHtml = `
        <div class="lifecycle-stat-card success">
          <div class="label">Total Active</div>
          <div class="value">${stats.total_active ?? 0}</div>
          <div class="subtitle">Active bookings</div>
        </div>
        <div class="lifecycle-stat-card warning">
          <div class="label">Stuck (Accepted)</div>
          <div class="value">${stats.stuck_accepted ?? 0}</div>
          <div class="subtitle">Not started 48h+</div>
        </div>
        <div class="lifecycle-stat-card warning">
          <div class="label">Stuck (Current)</div>
          <div class="value">${stats.stuck_current ?? 0}</div>
          <div class="subtitle">Not completed 24h+</div>
        </div>
        <div class="lifecycle-stat-card danger">
          <div class="label">Needs Review</div>
          <div class="value">${stats.expired_needs_review ?? 0}</div>
          <div class="subtitle">Expired bookings</div>
        </div>
        <div class="lifecycle-stat-card">
          <div class="label">Completed Today</div>
          <div class="value">${stats.completed_today ?? 0}</div>
          <div class="subtitle">Today's completions</div>
        </div>
        <div class="lifecycle-stat-card">
          <div class="label">Archived Total</div>
          <div class="value">${stats.archived_total ?? 0}</div>
          <div class="subtitle">Historical data</div>
        </div>
      `;
      document.getElementById('lifecycle-stats').innerHTML = statsHtml;
      
      // Render expired bookings
      const tbody = document.getElementById('expired-bookings-tbody');
      const expiredList = (expiredRes.data && Array.isArray(expiredRes.data.bookings)) ? expiredRes.data.bookings : [];
      window._lifecycleExpiredLastRows = expiredList;
      if (expiredList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-mid)">No expired bookings need review</td></tr>';
      } else {
        tbody.innerHTML = expiredList.map(b => {
          const appointmentTime = formatBookingSlotLabel(b);
          const idJson = JSON.stringify(b.id);
          return `
            <tr>
              <td><code title="${escapeHtml(b.id)}">${escapeHtml(b.id.substring(0, 8))}…</code></td>
              <td>${escapeHtml(b.professional_name)}<br><small style="color:var(--text-mid)">@${escapeHtml(b.professional_username)}</small></td>
              <td>${escapeHtml(b.customer_name)}<br><small style="color:var(--text-mid)">@${escapeHtml(b.customer_username)}</small></td>
              <td>${appointmentTime}</td>
              <td><span class="badge badge-red">${b.booking_status}</span></td>
              <td><small>${escapeHtml(b.expired_reason || 'N/A')}</small></td>
              <td style="white-space:nowrap">
                <button type="button" class="btn-small" onclick="window.showExpiredBookingDetail(${idJson})">Details</button>
                <button class="btn-small btn-confirm" onclick="reviewExpiredBooking(${idJson})">Mark reviewed</button>
              </td>
            </tr>
          `;
        }).join('');
      }
    } catch (err) {
      const statsEl = document.getElementById('lifecycle-stats');
      const tbody = document.getElementById('expired-bookings-tbody');
      const msg = escapeHtml(err.message || 'Failed to load lifecycle');
      if (statsEl) {
        statsEl.innerHTML = `<div style="grid-column:1/-1;padding:24px;text-align:center;color:var(--red, #c00);border:1px solid var(--border);border-radius:12px;background:var(--surface)">${msg}</div>`;
      }
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--red, #c00)">${msg}</td></tr>`;
      }
      toast(err.message, 'error');
    }
  };

  window.showExpiredBookingDetail = function (bookingId) {
    const rows = window._lifecycleExpiredLastRows || [];
    const b = rows.find((x) => String(x.id) === String(bookingId));
    if (b) {
      showBookingDetailModal(b);
      const t = document.getElementById('booking-detail-modal-title');
      if (t) t.textContent = 'Booking (expired — review queue)';
      return;
    }
    if (typeof window.showBookingDetailById === 'function') window.showBookingDetailById(bookingId);
  };

  window.reviewExpiredBooking = async function(bookingId) {
    const notes = prompt('Add review notes (optional):');
    if (notes === null) return; // Cancelled
    
    try {
      await api(`/bookings/${encodeURIComponent(String(bookingId))}/review`, {
        method: 'POST',
        body: JSON.stringify({ notes })
      });
      toast('Booking marked as reviewed', 'success');
      loadBookingLifecycle();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Archive Viewer
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  window.loadArchive = async function(page = 1) {
    try {
      const status = document.getElementById('archive-filter-status')?.value || 'all';
      const search = document.getElementById('archive-search')?.value || '';
      const { from, to } = archiveRangeFromSelects();
      const params = new URLSearchParams({
        page,
        limit: 20,
        status,
        search,
        from,
        to,
      });
      appendCountryScopeParams(params);
      
      const response = await api(`/bookings/archive?${params}`);
      const { bookings, total, has_more } = response.data;
      window._archiveLastRows = bookings || [];

      const tbody = document.getElementById('archive-tbody');
      if (bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-mid)">No archived bookings found</td></tr>';
      } else {
        tbody.innerHTML = bookings.map(b => {
          const bookingDate = formatBookingSlotLabel(b);
          const archivedDate = b.archived_at ? new Date(b.archived_at).toLocaleDateString() : '—';
          const statusClass = b.booking_status === 'completed' ? 'badge-green' : 
                             b.booking_status === 'cancelled' ? 'badge-red' : 'badge-gray';
          const idJson = JSON.stringify(b.id);
          return `
            <tr>
              <td><code title="${escapeHtml(b.id)}">${escapeHtml(b.id.substring(0, 8))}…</code></td>
              <td>${escapeHtml(b.professional_name)}<br><small style="color:var(--text-mid)">@${escapeHtml(b.professional_username)}</small></td>
              <td>${escapeHtml(b.customer_name)}<br><small style="color:var(--text-mid)">@${escapeHtml(b.customer_username)}</small></td>
              <td>${bookingDate}</td>
              <td>${b.booking_amount || 0} EGP</td>
              <td><span class="badge ${statusClass}">${b.booking_status}</span></td>
              <td><small>${archivedDate}</small></td>
              <td>
                <button type="button" class="btn-small" onclick="window.viewArchivedBooking(${idJson})">Details</button>
              </td>
            </tr>
          `;
        }).join('');
      }
      
      // Pagination
      const pagination = document.getElementById('archive-pagination');
      pagination.innerHTML = `
        <button ${page === 1 ? 'disabled' : ''} onclick="loadArchive(${page - 1})">Previous</button>
        <span>Page ${page}</span>
        <button ${!has_more ? 'disabled' : ''} onclick="loadArchive(${page + 1})">Next</button>
      `;
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  window.viewArchivedBooking = function (bookingId) {
    const rows = window._archiveLastRows || [];
    const b = rows.find((x) => String(x.id) === String(bookingId));
    if (b) {
      showBookingDetailModal(b);
      const t = document.getElementById('booking-detail-modal-title');
      if (t) t.textContent = 'Archived booking';
      return;
    }
    toast('Reload the archive list and open Details from the current page.', 'info');
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Analytics Dashboard
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  window.loadAnalytics = async function() {
    try {
      const params = new URLSearchParams();
      appendCountryScopeParams(params);
      if (document.getElementById('analytics-all-time')?.checked) {
        params.set('period', 'all');
      } else {
        const y = document.getElementById('analytics-year')?.value;
        if (y) params.set('year', y);
        const mo = document.getElementById('analytics-month')?.value;
        if (mo && mo !== 'all') params.set('month', mo);
      }
      const response = await api(`/bookings/analytics?${params}`);
      const data = response.data;
      cachedAnalyticsData = data; // Cache for export
      
      // Render analytics cards
      const aic = (path) =>
        `<div class="icon-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${path}"/></svg></div>`;
      const analyticsHtml = `
        <div class="analytics-card">
          ${aic('M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z')}
          <div class="label">Total bookings</div>
          <div class="value">${data.total_bookings}</div>
        </div>
        <div class="analytics-card">
          ${aic('M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z')}
          <div class="label">Completed</div>
          <div class="value">${data.completed_bookings}</div>
          <div class="change positive">${data.completion_rate}% completion</div>
        </div>
        <div class="analytics-card">
          ${aic('M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z')}
          <div class="label">Cancelled</div>
          <div class="value">${data.cancelled_bookings}</div>
        </div>
        <div class="analytics-card">
          ${aic('M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z')}
          <div class="label">Expired</div>
          <div class="value">${data.expired_bookings}</div>
        </div>
        <div class="analytics-card">
          ${aic('M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z')}
          <div class="label">Booking revenue</div>
          <div class="value">${(Number(data.total_revenue) || 0).toFixed(2)} EGP</div>
          <div class="change" style="margin-top:6px;font-size:0.72rem;color:var(--text-mid);font-weight:500">From completed bookings in period</div>
        </div>
        <div class="analytics-card">
          ${aic('M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z')}
          <div class="label">Fees (from bookings)</div>
          <div class="value">${(Number(data.total_platform_fees) || 0).toFixed(2)} EGP</div>
          <div class="change" style="margin-top:6px;font-size:0.72rem;color:var(--text-mid);font-weight:500">Not the same as “amount due” on Platform fees</div>
        </div>
      `;
      document.getElementById('analytics-grid').innerHTML = analyticsHtml;
      
      // Render top professionals
      const tbody = document.getElementById('top-professionals-tbody');
      if (data.top_professionals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-mid)">No data available</td></tr>';
      } else {
        tbody.innerHTML = data.top_professionals.map((pro, index) => `
          <tr>
            <td><strong>${index + 1}</strong></td>
            <td>${escapeHtml(pro.professional_name || 'Unknown')}<br><small style="color:var(--text-mid)">@${escapeHtml(pro.professional_username || 'unknown')}</small></td>
            <td>${pro.total_bookings}</td>
            <td>${pro.completed}</td>
            <td>${pro.revenue.toFixed(2)} EGP</td>
            <td>${pro.platform_fees.toFixed(2)} EGP</td>
          </tr>
        `).join('');
      }
      
      // Render revenue chart
      renderRevenueChart(data);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  let revenueChart = null;
  function renderRevenueChart(data) {
    const canvas = document.getElementById('revenue-chart');
    if (!canvas) return;
    
    // Destroy existing chart
    if (revenueChart) {
      revenueChart.destroy();
    }
    
    const labels = [];
    const revenueData = [];
    const feesData = [];
    const series = Array.isArray(data.revenue_series) ? data.revenue_series : [];

    if (series.length) {
      series.forEach((pt) => {
        labels.push(pt.label);
        revenueData.push(Number(pt.revenue) || 0);
        feesData.push(Number(pt.fees) || 0);
      });
    } else {
      const tr = Number(data.total_revenue) || 0;
      const tf = Number(data.total_platform_fees) || 0;
      const rk = data.period;
      const n =
        rk === 'rolling_week'
          ? 7
          : rk === 'calendar_year' || rk === 'all' || rk === 'rolling_year'
            ? 12
            : rk === 'calendar_month'
              ? 31
              : 30;
      for (let i = 0; i < n; i++) {
        labels.push(
          rk === 'calendar_year' || rk === 'all' || rk === 'rolling_year' ? `M${i + 1}` : `D${i + 1}`,
        );
        revenueData.push(n ? tr / n : 0);
        feesData.push(n ? tf / n : 0);
      }
    }
    
    const ctx = canvas.getContext('2d');
    revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Booking revenue',
            data: revenueData,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
          },
          {
            label: 'Fees (from bookings)',
            data: feesData,
            borderColor: '#22C55E',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toFixed(0) + ' EGP';
              }
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Export Functions
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  window.exportArchiveToCSV = async function() {
    try {
      const status = document.getElementById('archive-filter-status')?.value || 'all';
      const search = document.getElementById('archive-search')?.value || '';
      const { from, to } = archiveRangeFromSelects();
      const params = new URLSearchParams({
        page: 1,
        limit: 1000, // Get more for export
        status,
        search,
        from,
        to,
      });
      appendCountryScopeParams(params);
      
      const response = await api(`/bookings/archive?${params}`);
      const { bookings } = response.data;
      
      if (bookings.length === 0) {
        toast('No data to export', 'error');
        return;
      }
      
      // Create CSV
      let csv = 'ID,Professional,Customer,Date,Amount,Status,Archived Date\n';
      bookings.forEach(b => {
        const slot = b.overlap_slots && b.overlap_slots[0];
        const bookingDate = slot ? new Date(slot.start_time).toLocaleDateString() : 'N/A';
        const archivedDate = new Date(b.archived_at).toLocaleDateString();
        csv += `"${b.id}","${b.professional_name}","${b.customer_name}","${bookingDate}","${b.booking_amount || 0}","${b.booking_status}","${archivedDate}"\n`;
      });
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archive_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast('CSV exported successfully', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  let cachedAnalyticsData = null;
  window.exportAnalyticsToCSV = function() {
    if (!cachedAnalyticsData) {
      toast('Please load analytics first', 'error');
      return;
    }
    
    try {
      // Create CSV
      let csv = 'Rank,Professional,Username,Total Bookings,Completed,Booking revenue,Fees from bookings\n';
      cachedAnalyticsData.top_professionals.forEach((pro, index) => {
        csv += `${index + 1},"${pro.professional_name || 'Unknown'}","${pro.professional_username || 'unknown'}",${pro.total_bookings},${pro.completed},${pro.revenue.toFixed(2)},${pro.platform_fees.toFixed(2)}\n`;
      });
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const y = cachedAnalyticsData.year;
      const m = cachedAnalyticsData.month;
      const tag =
        cachedAnalyticsData.period === 'all'
          ? 'all_time'
          : y != null && m != null
            ? `${y}_${m}`
            : y != null
              ? `${y}`
              : String(cachedAnalyticsData.period || 'report');
      a.download = `analytics_${tag}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast('CSV exported successfully', 'success');
    } catch (err) {
      toast('Failed to export: ' + err.message, 'error');
    }
  };

  // Add event listeners for filters
  document.getElementById('archive-filter-status')?.addEventListener('change', () => loadArchive(1));
  document.getElementById('archive-search')?.addEventListener('input', debounce(() => loadArchive(1), 500));
  ['archive-from-month', 'archive-from-year', 'archive-to-month', 'archive-to-year'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => loadArchive(1));
  });
  document.getElementById('analytics-all-time')?.addEventListener('change', () => {
    setAnalyticsYearMonthEnabled(!document.getElementById('analytics-all-time').checked);
    loadAnalytics();
  });
  document.getElementById('analytics-year')?.addEventListener('change', loadAnalytics);
  document.getElementById('analytics-month')?.addEventListener('change', loadAnalytics);
  document.getElementById('admin-scope-country')?.addEventListener('change', (e) => {
    const v = (e.target.value || '').trim().toUpperCase();
    if (!v) localStorage.removeItem(ADMIN_COUNTRY_SCOPE_KEY);
    else localStorage.setItem(ADMIN_COUNTRY_SCOPE_KEY, v);
    syncFeesFilterFromScope();
    reloadCurrentViewForCountryScope();
  });
  document.getElementById('fees-filter-country')?.addEventListener('change', (e) => {
    const v = (e.target.value || '').trim();
    const scopeBar = document.getElementById('admin-scope-bar');
    const scopeSel = document.getElementById('admin-scope-country');
    if (!scopeSel || !scopeBar || scopeBar.classList.contains('hidden')) return;
    if (v === 'all') {
      localStorage.removeItem(ADMIN_COUNTRY_SCOPE_KEY);
      if (scopeSel) scopeSel.value = '';
    } else {
      localStorage.setItem(ADMIN_COUNTRY_SCOPE_KEY, v.toUpperCase());
      if ([...scopeSel.options].some((o) => o.value === v)) scopeSel.value = v;
    }
  });
  document.getElementById('booking-simple-refresh')?.addEventListener('click', () => loadBookingsSimple(bookingsSimplePage));
  document.getElementById('booking-simple-refresh-top')?.addEventListener('click', () => loadBookingsSimple(bookingsSimplePage));
  document.getElementById('booking-detail-modal-close')?.addEventListener('click', () => {
    hide(document.getElementById('booking-detail-modal'));
    hide(document.getElementById('modal-overlay'));
  });

  document.getElementById('platform-fees-reset-open')?.addEventListener('click', () => {
    const inp = document.getElementById('platform-fees-reset-confirm-input');
    if (inp) inp.value = '';
    document.querySelectorAll('#modal-overlay .modal').forEach((m) => hide(m));
    show(document.getElementById('modal-overlay'));
    show(document.getElementById('platform-fees-reset-modal'));
  });
  document.getElementById('platform-fees-reset-cancel')?.addEventListener('click', () => {
    hide(document.getElementById('platform-fees-reset-modal'));
    hide(document.getElementById('modal-overlay'));
  });
  document.getElementById('platform-fees-reset-submit')?.addEventListener('click', async () => {
    const inp = document.getElementById('platform-fees-reset-confirm-input');
    const phrase = (inp?.value || '').trim();
    if (phrase !== 'RESET_ALL_RECORDED_FEES') {
      toast('Type the confirmation phrase exactly.', 'error');
      return;
    }
    try {
      const res = await api('/platform-fees/reset-recorded', {
        method: 'POST',
        body: JSON.stringify({ confirm_phrase: phrase }),
      });
      hide(document.getElementById('platform-fees-reset-modal'));
      hide(document.getElementById('modal-overlay'));
      const d = res.data || {};
      let msg = res.message || 'Recorded fees cleared.';
      if (d.partial) msg += ' Run again once if you have a very large bookings collection.';
      toast(msg, 'success');
      if (typeof window.loadPlatformFees === 'function') await window.loadPlatformFees();
    } catch (e) {
      toast(e.message || 'Reset failed', 'error');
    }
  });

  document.getElementById('booking-simple-filter-status')?.addEventListener('change', () => loadBookingsSimple(1));
  document.getElementById('booking-simple-page-size')?.addEventListener('change', () => {
    bookingsSimplePage = 1;
    loadBookingsSimple(1);
  });
  document.getElementById('booking-simple-search')?.addEventListener('input', debounce(() => loadBookingsSimple(1), 400));
  document.getElementById('booking-simple-export-csv')?.addEventListener('click', () => exportBookingsSimpleCSV());

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Roles Guide Modal
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const rolesModal = document.getElementById('roles-guide-modal');
  const showRolesBtn = document.getElementById('show-roles-guide-btn');
  const closeRolesBtn = document.getElementById('close-roles-modal-btn');
  const closeRolesX = document.getElementById('close-roles-modal');
  
  function showRolesModal() {
    if (rolesModal) {
      show(rolesModal);
      document.body.style.overflow = 'hidden';
    }
  }

  function hideRolesModal() {
    if (rolesModal) {
      hide(rolesModal);
      document.body.style.overflow = '';
    }
  }
  
  if (showRolesBtn) {
    showRolesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showRolesModal();
    });
  }
  
  if (closeRolesBtn) {
    closeRolesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      hideRolesModal();
    });
  }
  
  if (closeRolesX) {
    closeRolesX.addEventListener('click', (e) => {
      e.preventDefault();
      hideRolesModal();
    });
  }
  
  // Close modal when clicking overlay (the modal itself, not modal-content)
  if (rolesModal) {
    rolesModal.addEventListener('click', (e) => {
      if (e.target === rolesModal) {
        hideRolesModal();
      }
    });
  }
  
  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && rolesModal && !rolesModal.classList.contains('hidden')) {
      hideRolesModal();
    }
  });

  // --- Desktop: collapse sidebar (full-width tables) ---
  (function initDesktopSidebarCollapse() {
    const mv = document.getElementById('main-view');
    const collapseBtn = document.getElementById('sidebar-desktop-collapse');
    const openBtn = document.getElementById('sidebar-floating-open');
    if (!mv || !collapseBtn || !openBtn) return;
    const LS_KEY = 'weino_admin_sidebar_collapsed';
    function setCollapsed(collapsed) {
      mv.classList.toggle('desktop-sidebar-collapsed', collapsed);
      collapseBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      try {
        localStorage.setItem(LS_KEY, collapsed ? '1' : '0');
      } catch (_) {}
      if (typeof globalThis.AdminI18n !== 'undefined' && globalThis.AdminI18n.applyDom) {
        globalThis.AdminI18n.applyDom();
      }
    }
    collapseBtn.addEventListener('click', () => {
      setCollapsed(!mv.classList.contains('desktop-sidebar-collapsed'));
    });
    openBtn.addEventListener('click', () => setCollapsed(false));
  })();

  // --- Mobile sidebar toggle ---
  (function initMobileSidebar() {
    const hamburger = document.getElementById('hamburger-btn');
    const overlay   = document.getElementById('sidebar-overlay');
    const sidebar   = document.querySelector('.sidebar');
    if (!hamburger || !overlay || !sidebar) return;

    function openSidebar() {
      sidebar.classList.add('sidebar-open');
      overlay.classList.add('active');
      hamburger.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
      sidebar.classList.remove('sidebar-open');
      overlay.classList.remove('active');
      hamburger.classList.remove('is-open');
      document.body.style.overflow = '';
    }
    function toggleSidebar() {
      sidebar.classList.contains('sidebar-open') ? closeSidebar() : openSidebar();
    }

    hamburger.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', closeSidebar);

    // Close sidebar automatically when a nav link is tapped on mobile
    sidebar.addEventListener('click', (e) => {
      if (e.target.closest('a[data-view]') && window.innerWidth <= 768) {
        closeSidebar();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSidebar();
    });
  })();

  // Bookings table: open detail modal (no inline onclick — works with strict CSP / reliable globals)
  (function bindBookingsSimpleDetailClicks() {
    const root = document.getElementById('bookings-simple-list');
    if (!root || root.dataset.bookingDetailBound === '1') return;
    root.dataset.bookingDetailBound = '1';
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-booking-detail-id]');
      if (!btn) return;
      e.preventDefault();
      const id = btn.getAttribute('data-booking-detail-id');
      if (!id) return;
      if (typeof window.showBookingDetailById === 'function') {
        void window.showBookingDetailById(id);
      }
    });
  })();

  document.addEventListener('admin-lang-change', () => {
    try {
      const adm = getAdmin();
      if (adm) {
        const adminInfo = document.getElementById('admin-info');
        if (adminInfo) {
          const rlist = Array.isArray(adm.roles) && adm.roles.length ? adm.roles : [adm.role].filter(Boolean);
          const roleLine = rlist.map((r) => roleLabel(r)).join(' · ');
          adminInfo.textContent = `${adm.username} · ${roleLine}`;
        }
      }
      const scopeSel = document.getElementById('admin-scope-country');
      if (scopeSel && scopeSel.options.length && scopeSel.options[0].value === '') {
        scopeSel.options[0].textContent = __('scope.allCountries');
      }
      if (typeof updateAdminBreadcrumb === 'function' && window.__adminCurrentView) {
        updateAdminBreadcrumb(window.__adminCurrentView);
      }
      if (typeof globalThis.AdminI18n !== 'undefined' && globalThis.AdminI18n.applyDom) {
        globalThis.AdminI18n.applyDom();
      }
      if (typeof relocalizeArchiveMonthSelects === 'function') relocalizeArchiveMonthSelects();
      const cur = window.__adminCurrentView;
      if (cur === 'categories' && typeof loadCategories === 'function') loadCategories();
      if (cur === 'dashboard' && typeof window.loadDashboard === 'function') window.loadDashboard();
      if (cur === 'locations') {
        const badge = document.getElementById('loc-country-badge');
        const selectedCountry = (cachedCountries || []).find((c) => (c.code || c.key) === selectedLocationsCountry);
        if (badge) badge.textContent = `${__('loc.govBadge')} ${selectedCountry?.name || selectedLocationsCountry}`;
        const govFilter = document.getElementById('loc-gov-filter');
        if (govFilter && govFilter.options[0]) govFilter.options[0].textContent = __('loc.filterGovAll');
        void loadGovernorates();
        void loadCities();
      }
      if (cur === 'platform-fees' && typeof window.loadPlatformFees === 'function') {
        window.loadPlatformFees();
      }
      if (cur === 'settings' && typeof window.loadAppSettings === 'function') {
        void window.loadAppSettings();
      }
      if (cur === 'applications' && typeof loadApplications === 'function') void loadApplications();
      if (cur === 'users' && typeof loadUsers === 'function') void loadUsers();
      if (cur === 'tickets' && typeof loadTickets === 'function') void loadTickets();
      if (cur === 'bookings-simple' && typeof window.loadBookingsSimple === 'function') {
        void window.loadBookingsSimple(bookingsSimplePage || 1);
      }
    } catch (e) {
      console.warn(e);
    }
  });

  // --- Init ---
  if (getToken()) { showMain(); } else { showLogin(); }
})();