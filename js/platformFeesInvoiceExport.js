/**
 * admin/js/platformFeesInvoiceExport.js — جزء من لوحة الأدمن (نفس المجلد: i18n.js + app.js).
 *
 * تنزيل فواتير رسوم المنصة (PDF/CSV) مع عرض سبب الفشل من JSON (لا تستخدم window.open على رابط الـ API).
 * أشكال الخطأ المدعومة: { error, details }, { success:false, error:{ message } }.
 *
 * Vercel: انسخ admin/js/ كاملًا لمشروعك أو استورد هذه الدالة من نفس المسار — لا يوجد مجلد منفصل.
 */
(function (global) {
  'use strict';

  /** Supports: { error, details }, { success:false, error:{ message } }, { message } */
  function extractApiErrorMessage(j) {
    if (!j || typeof j !== 'object') return null;
    if (typeof j.details === 'string' && j.details.trim()) return j.details.trim();
    if (typeof j.error === 'string' && j.error.trim()) return j.error.trim();
    if (j.error && typeof j.error === 'object' && typeof j.error.message === 'string') {
      return String(j.error.message).trim();
    }
    if (typeof j.message === 'string' && j.message.trim()) return j.message.trim();
    return null;
  }

  /**
   * @param {object} opts
   * @param {string} opts.url - كامل الرابط (مثال: `${API}/admin/invoices/platform-fees.pdf?year=2026&month=3`)
   * @param {string} opts.token - Bearer token للأدمن
   * @param {string} [opts.filenameFallback] - اسم الملف لو الـ server ما بعتش Content-Disposition
   * @param {(msg: string) => void} [opts.onError] - عرض الخطأ (مثال: (m) => { el.textContent = m; el.style.display='block'; })
   * @param {(msg: string) => void} [opts.onStart] - اختياري: إخفاء خطأ سابق / سبينر
   * @returns {Promise<{ ok: boolean, message?: string }>}
   */
  async function platformFeesDownloadBlob(opts) {
    var url = opts.url;
    var token = opts.token;
    var filenameFallback = opts.filenameFallback || 'download.bin';
    var onError = opts.onError;
    var onStart = opts.onStart;

    if (typeof onStart === 'function') onStart();

    var res;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: '*/*',
        },
      });
    } catch (e) {
      var netMsg = (e && e.message) ? String(e.message) : 'Network error';
      if (typeof onError === 'function') onError(netMsg);
      return { ok: false, message: netMsg };
    }

    var ct = (res.headers.get('content-type') || '').toLowerCase();

    if (res.ok) {
      var blob = await res.blob();
      var dispo = res.headers.get('content-disposition') || '';
      var fname = filenameFallback;
      var m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(dispo);
      if (m) {
        fname = decodeURIComponent((m[1] || m[2] || '').trim()) || fname;
      }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
      }, 4000);
      return { ok: true };
    }

    var msg = 'HTTP ' + res.status;
    try {
      if (ct.indexOf('application/json') !== -1 || ct.indexOf('text/json') !== -1 || ct.indexOf('+json') !== -1) {
        var j = await res.json();
        var extracted = extractApiErrorMessage(j);
        if (extracted) msg = extracted;
        else if (j) msg = JSON.stringify(j).slice(0, 2500);
      } else {
        var t = await res.text();
        if (t) {
          var s = String(t).trim();
          if (s.charAt(0) === '{' || s.charAt(0) === '[') {
            try {
              var o = JSON.parse(s);
              var ex = extractApiErrorMessage(o);
              if (ex) msg = ex;
              else msg = s.slice(0, 2500);
            } catch (_) {
              msg = s.slice(0, 2500);
            }
          } else if (s.charAt(0) === '<') {
            msg = 'HTTP ' + res.status + ' (HTML body — often gateway or login page; open Network tab or use admin export page with fetch).';
          } else {
            msg = s.slice(0, 2500);
          }
        }
      }
    } catch (_) {
      /* keep msg */
    }

    if (typeof onError === 'function') onError(msg);
    return { ok: false, message: msg };
  }

  global.platformFeesDownloadBlob = platformFeesDownloadBlob;
})(typeof globalThis !== 'undefined' ? globalThis : window);
