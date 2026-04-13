/**
 * Admin UI strings — English / العربية
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'weino_admin_lang';

  var STRINGS = {
    en: {
      meta_title: 'Weino — Admin',
      brand: 'Admin',
      lang_pick: 'Language',
      lang_en: 'English',
      lang_ar: 'العربية',
      nav_home: 'Home',
      nav_export: 'Fee invoices export',
      nav_settings: 'More tools (soon)',

      home_welcome_title: 'Welcome',
      home_welcome_p:
        'Use the sidebar to open tools. Switch language anytime with the buttons above.',

      pf_card_title: 'Platform fee invoices (PDF / CSV)',
      pf_card_intro:
        'Exports confirmed platform-fee payments for one calendar month.\n\n' +
        '• Year / Month = billing period to export.\n' +
        '• Country = optional filter (ISO code, e.g. EG). Leave empty for all countries.\n' +
        '• Token = admin Bearer JWT from your login API (same token other admin calls use).\n' +
        'If export fails, the real server message appears in red below.',

      pf_year: 'Year',
      pf_month: 'Month',
      pf_country: 'Country code (optional)',
      pf_country_ph: 'e.g. EG — leave empty for all',
      pf_token: 'Admin Bearer token',
      pf_token_hint: 'Paste the JWT from POST /admin/auth/login. Stored only in this browser if you check “Remember”.',
      pf_remember: 'Remember token on this device',
      btn_pdf: 'Download PDF',
      btn_csv: 'Download CSV',
      export_running: 'Working…',
      export_ok: 'Download started.',
      export_error_title: 'Error',

      settings_placeholder_title: 'Coming soon',
      settings_placeholder_p: 'More admin screens can be linked here.',

      footer_note:
        'All admin JavaScript lives in admin/js/ (one place). For Vercel: use the same files from admin/js/ in your deploy. Local preview: npx serve from the admin folder.',
    },
    ar: {
      meta_title: 'وينو — لوحة الإدارة',
      brand: 'الإدارة',
      lang_pick: 'اللغة',
      lang_en: 'English',
      lang_ar: 'العربية',
      nav_home: 'الرئيسية',
      nav_export: 'تصدير فواتير الرسوم',
      nav_settings: 'أدوات إضافية (قريباً)',

      home_welcome_title: 'أهلاً',
      home_welcome_p:
        'استخدم القائمة الجانبية للوصول للأدوات. يمكنك تغيير اللغة في أي وقت من الأزرار أعلاه.',

      pf_card_title: 'فواتير رسوم المنصة (PDF / CSV)',
      pf_card_intro:
        'تصدير المدفوعات المؤكدة لرسوم المنصة لشهر تقويمي واحد.\n\n' +
        '• السنة / الشهر = الفترة المراد تصديرها.\n' +
        '• الدولة = تصفية اختيارية (رمز دولتين مثل EG). اتركه فارغاً لكل الدول.\n' +
        '• التوكن = رمز الدخول (JWT) لحساب الأدمن نفسه المستخدم في باقي طلبات الـ API.\n' +
        'لو التصدير فشل، تظهر رسالة السيرفر الحقيقية بالأسفل باللون الأحمر.',

      pf_year: 'السنة',
      pf_month: 'الشهر',
      pf_country: 'رمز الدولة (اختياري)',
      pf_country_ph: 'مثال: EG — فارغ = كل الدول',
      pf_token: 'توكن الأدمن (Bearer)',
      pf_token_hint:
        'الصق الـ JWT الناتج عن تسجيل الدخول (مثل POST /admin/auth/login). يُحفظ في هذا المتصفح فقط إذا فعلت «تذكر التوكن».',
      pf_remember: 'تذكر التوكن على هذا الجهاز',
      btn_pdf: 'تحميل PDF',
      btn_csv: 'تحميل CSV',
      export_running: 'جاري التنفيذ…',
      export_ok: 'بدأ التحميل.',
      export_error_title: 'خطأ',

      settings_placeholder_title: 'قريباً',
      settings_placeholder_p: 'يمكن ربط باقي شاشات الإدارة هنا لاحقاً.',

      footer_note:
        'كل سكربتات الأدمن في admin/js/ (مكان واحد). على Vercel: استخدم نفس الملفات من admin/js/ في النشر. معاينة محلية: npx serve من مجلد admin.',
    },
  };

  function normalizeLang(code) {
    if (!code || typeof code !== 'string') return 'en';
    var c = code.toLowerCase().trim().slice(0, 2);
    return c === 'ar' ? 'ar' : 'en';
  }

  function getLang() {
    try {
      return normalizeLang(localStorage.getItem(STORAGE_KEY) || 'en');
    } catch (_) {
      return 'en';
    }
  }

  function setLang(lang) {
    var L = normalizeLang(lang);
    try {
      localStorage.setItem(STORAGE_KEY, L);
    } catch (_) {}
    applyDocumentLang(L);
    applyDomStrings(L);
    return L;
  }

  function t(key, lang) {
    var L = lang || getLang();
    var pack = STRINGS[L] || STRINGS.en;
    return pack[key] != null ? pack[key] : STRINGS.en[key] != null ? STRINGS.en[key] : key;
  }

  function applyDocumentLang(L) {
    var html = document.documentElement;
    html.lang = L === 'ar' ? 'ar' : 'en';
    html.dir = L === 'ar' ? 'rtl' : 'ltr';
    var title = document.querySelector('title');
    if (title) title.textContent = t('meta_title', L);
  }

  function applyDomStrings(lang) {
    var L = lang || getLang();
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (!key) return;
      var mode = el.getAttribute('data-i18n-mode');
      if (mode === 'html') {
        el.innerHTML = t(key, L).replace(/\n/g, '<br>');
      } else {
        el.textContent = t(key, L);
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (key && 'placeholder' in el) el.placeholder = t(key, L);
    });
  }

  global.AdminI18n = {
    STRINGS: STRINGS,
    getLang: getLang,
    setLang: setLang,
    t: t,
    applyDocumentLang: applyDocumentLang,
    applyDomStrings: applyDomStrings,
    STORAGE_KEY: STORAGE_KEY,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
