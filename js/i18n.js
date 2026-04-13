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

      login_title: 'Admin sign in',
      login_intro: 'Use your admin username and password. API URL is saved in this browser after a successful login.',
      login_api: 'API base URL',
      login_user: 'Username',
      login_pass: 'Password',
      login_submit: 'Sign in',
      login_ok: 'Signed in.',
      logout: 'Log out',
      logged_out: 'Signed out.',
      session_expired: 'Session expired. Sign in again.',

      nav_dashboard: 'Dashboard',
      nav_users: 'Users',
      nav_bookings: 'Bookings',
      nav_bookingtools: 'Booking tools',
      nav_matches: 'Matches',
      nav_categories: 'Categories',
      nav_locations: 'Locations',
      nav_appconfig: 'App config',
      nav_platformfees: 'Platform fees',
      nav_tickets: 'Tickets',
      nav_notifications: 'Notifications',
      nav_professionals: 'Pro applications',
      nav_accounts: 'Admin accounts',

      loading: 'Loading…',
      access_denied: 'You do not have permission for this section.',
      search: 'Search',
      filter: 'Filter',
      filter_all: 'All',
      filter_pro: 'Professionals',
      filter_cust: 'Customers',
      apply: 'Apply',
      open: 'Open',
      prev: 'Previous',
      next: 'Next',
      save: 'Save',
      send: 'Send',
      invalid_json: 'Invalid JSON.',
      saved_ok: 'Saved.',

      col_name: 'Name',
      col_username: 'Username',
      col_role: 'Role',
      col_country: 'Country',
      col_status: 'Status',

      stat_users: 'Users',
      stat_professionals: 'Professionals',
      stat_nonProfessionals: 'Non-professionals',
      stat_matches: 'Matches (all)',
      stat_bookings: 'Bookings',
      stat_non_booking_matches: 'Other matches',
      stat_categories: 'Categories',
      stat_pendingApplications: 'Pending applications',
      stat_pendingTickets: 'Pending tickets',
      stat_openTickets: 'Open / in progress tickets',

      appconfig_warn: 'Careful: invalid config can break the app. Prefer small, tested changes.',
      loc_countries: 'Countries',
      loc_govs: 'Governorates',
      loc_cities: 'Cities',

      pf_card_title: 'Platform fee invoices (PDF / CSV)',
      pf_card_intro:
        'Exports confirmed platform-fee payments for one calendar month.\n\n' +
        '• Year / Month = billing period to export.\n' +
        '• Country = optional filter (ISO code, e.g. EG). Leave empty for all countries.\n' +
        '• Token defaults to your current session; override if needed.\n' +
        'If export fails, the server message appears in red below.',

      pf_year: 'Year',
      pf_month: 'Month',
      pf_country: 'Country code (optional)',
      pf_country_ph: 'e.g. EG — leave empty for all',
      pf_token: 'Admin Bearer token',
      pf_token_hint: 'Defaults to the signed-in admin JWT. Stored on this device only if you check “Remember”.',
      pf_remember: 'Remember token on this device',
      btn_pdf: 'Download PDF',
      btn_csv: 'Download CSV',
      export_running: 'Working…',
      export_ok: 'Download started.',
      export_error_title: 'Error',

      ticket_reply_ph: 'Reply text',
      ticket_close: 'Close ticket',
      ticket_closed_ok: 'Ticket closed.',

      notif_sent: 'Notification request completed.',

      approve: 'Approve',
      reject: 'Reject',
      review_note_ph: 'Optional review note',

      accounts_hint: 'Create/update admins via API (super_admin only). This screen is list-only.',
    },
    ar: {
      meta_title: 'وينو — لوحة الإدارة',
      brand: 'الإدارة',
      lang_pick: 'اللغة',
      lang_en: 'English',
      lang_ar: 'العربية',

      login_title: 'تسجيل دخول الأدمن',
      login_intro: 'استخدم اسم المستخدم وكلمة المرور. يُحفظ عنوان الـ API في هذا المتصفح بعد نجاح الدخول.',
      login_api: 'رابط الـ API الأساسي',
      login_user: 'اسم المستخدم',
      login_pass: 'كلمة المرور',
      login_submit: 'دخول',
      login_ok: 'تم تسجيل الدخول.',
      logout: 'خروج',
      logged_out: 'تم تسجيل الخروج.',
      session_expired: 'انتهت الجلسة. سجّل دخولك من جديد.',

      nav_dashboard: 'لوحة الأرقام',
      nav_users: 'المستخدمون',
      nav_bookings: 'الحجوزات',
      nav_bookingtools: 'أدوات الحجوزات',
      nav_matches: 'الماتشات',
      nav_categories: 'الفئات',
      nav_locations: 'المواقع',
      nav_appconfig: 'إعدادات التطبيق',
      nav_platformfees: 'رسوم المنصة',
      nav_tickets: 'التذاكر',
      nav_notifications: 'الإشعارات',
      nav_professionals: 'طلبات المحترفين',
      nav_accounts: 'حسابات الأدمن',

      loading: 'جاري التحميل…',
      access_denied: 'لا تملك صلاحية هذا القسم.',
      search: 'بحث',
      filter: 'تصفية',
      filter_all: 'الكل',
      filter_pro: 'محترفون',
      filter_cust: 'عملاء',
      apply: 'تطبيق',
      open: 'فتح',
      prev: 'السابق',
      next: 'التالي',
      save: 'حفظ',
      send: 'إرسال',
      invalid_json: 'JSON غير صالح.',
      saved_ok: 'تم الحفظ.',

      col_name: 'الاسم',
      col_username: 'المستخدم',
      col_role: 'النوع',
      col_country: 'الدولة',
      col_status: 'الحالة',

      stat_users: 'المستخدمون',
      stat_professionals: 'المحترفون',
      stat_nonProfessionals: 'غير محترفين',
      stat_matches: 'الماتشات (الكل)',
      stat_bookings: 'الحجوزات',
      stat_non_booking_matches: 'ماتشات أخرى',
      stat_categories: 'الفئات',
      stat_pendingApplications: 'طلبات قيد المراجعة',
      stat_pendingTickets: 'تذاكر معلقة',
      stat_openTickets: 'تذاكر مفتوحة / قيد المعالجة',

      appconfig_warn: 'تحذير: إعدادات خاطئة قد تعطل التطبيق. يفضّل تغييرات صغيرة ومجرّبة.',
      loc_countries: 'الدول',
      loc_govs: 'المحافظات',
      loc_cities: 'المدن',

      pf_card_title: 'فواتير رسوم المنصة (PDF / CSV)',
      pf_card_intro:
        'تصدير المدفوعات المؤكدة لرسوم المنصة لشهر تقويمي واحد.\n\n' +
        '• السنة / الشهر = الفترة.\n' +
        '• الدولة = تصفية اختيارية (رمز دولتين مثل EG).\n' +
        '• التوكن يُملأ من الجلسة الحالية؛ يمكنك تعديله يدوياً.\n' +
        'لو فشل التصدير تظهر رسالة السيرفر بالأسفل.',

      pf_year: 'السنة',
      pf_month: 'الشهر',
      pf_country: 'رمز الدولة (اختياري)',
      pf_country_ph: 'مثال: EG — فارغ = كل الدول',
      pf_token: 'توكن الأدمن (Bearer)',
      pf_token_hint: 'الافتراضي هو JWT الجلسة الحالية. يُحفظ على الجهاز فقط إذا فعلت «تذكر التوكن».',
      pf_remember: 'تذكر التوكن على هذا الجهاز',
      btn_pdf: 'تحميل PDF',
      btn_csv: 'تحميل CSV',
      export_running: 'جاري التنفيذ…',
      export_ok: 'بدأ التحميل.',
      export_error_title: 'خطأ',

      ticket_reply_ph: 'نص الرد',
      ticket_close: 'إغلاق التذكرة',
      ticket_closed_ok: 'تم إغلاق التذكرة.',

      notif_sent: 'تم تنفيذ طلب الإشعار.',

      approve: 'قبول',
      reject: 'رفض',
      review_note_ph: 'ملاحظة اختيارية',

      accounts_hint: 'إنشاء/تعديل الأدمن عبر الـ API (سوبر أدمن فقط). هذه الشاشة للعرض فقط.',
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
