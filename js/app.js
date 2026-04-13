/**
 * Admin shell: language switch, navigation, platform fee export.
 */
(function () {
  'use strict';

  var API_BASE = 'https://us-central1-matchyto.cloudfunctions.net/api/v1';
  var TOKEN_KEY = 'weino_admin_bearer_token';

  function $(id) {
    return document.getElementById(id);
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
    $('pf-year').value = String(now.getFullYear());
  }

  function loadTokenFromStorage() {
    try {
      var t = localStorage.getItem(TOKEN_KEY);
      if (t && $('pf-token')) $('pf-token').value = t;
      if (t && $('pf-remember')) $('pf-remember').checked = true;
    } catch (_) {}
  }

  function saveTokenIfRemembered() {
    try {
      if ($('pf-remember') && $('pf-remember').checked) {
        localStorage.setItem(TOKEN_KEY, ($('pf-token') && $('pf-token').value) || '');
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch (_) {}
  }

  function getToken() {
    return (($('pf-token') && $('pf-token').value) || '').trim();
  }

  function getCountryParam() {
    var c = (($('pf-country') && $('pf-country').value) || '').trim().toUpperCase();
    return c.length === 2 ? c : '';
  }

  function buildExportUrl(kind) {
    var y = parseInt($('pf-year') && $('pf-year').value, 10);
    var m = parseInt($('pf-month') && $('pf-month').value, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
      return { error: AdminI18n.getLang() === 'ar' ? 'سنة أو شهر غير صالح' : 'Invalid year or month' };
    }
    var path = kind === 'csv' ? 'platform-fees.csv' : 'platform-fees.pdf';
    var q = 'year=' + encodeURIComponent(String(y)) + '&month=' + encodeURIComponent(String(m));
    var co = getCountryParam();
    if (co) q += '&country=' + encodeURIComponent(co);
    return { url: API_BASE + '/admin/invoices/' + path + '?' + q };
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
      showError(AdminI18n.getLang() === 'ar' ? 'أدخل توكن الأدمن أولاً.' : 'Enter the admin Bearer token first.');
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
    showOk(AdminI18n.t('export_running'));

    var r = await platformFeesDownloadBlob({
      url: built.url,
      token: tok,
      filenameFallback: fallback,
      onError: function () {},
      onStart: function () {},
    });

    setBusy(false);
    if (r.ok) {
      showOk(AdminI18n.t('export_ok'));
    } else {
      var status = $('export-status');
      if (status) {
        status.textContent = '';
        status.classList.remove('visible');
      }
      showError((AdminI18n.t('export_error_title') || 'Error') + ': ' + (r.message || ''));
    }
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

  function showView(name) {
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.toggle('active', v.id === 'view-' + name);
    });
    document.querySelectorAll('.nav-item').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === name);
    });
  }

  function init() {
    monthSelectFill();
    loadTokenFromStorage();

    var initial = AdminI18n.getLang();
    AdminI18n.setLang(initial);
    setLangButtons(initial);

    $('btn-lang-en').addEventListener('click', function () {
      AdminI18n.setLang('en');
      setLangButtons('en');
    });
    $('btn-lang-ar').addEventListener('click', function () {
      AdminI18n.setLang('ar');
      setLangButtons('ar');
    });

    document.querySelectorAll('.nav-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showView(btn.getAttribute('data-view') || 'home');
      });
    });

    $('btn-pdf').addEventListener('click', function () {
      runExport('pdf');
    });
    $('btn-csv').addEventListener('click', function () {
      runExport('csv');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
