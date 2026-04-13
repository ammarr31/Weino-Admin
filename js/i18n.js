/**
 * Admin UI i18n — English / Arabic toggle, RTL, static DOM [data-i18n] + window.AdminI18n.t() for app.js.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'admin_ui_lang';

  var STR = {
    en: {
      'app.title': 'Weino Admin',

      'login.titleWeino': 'Weino',
      'login.titleAdmin': 'Admin',
      'login.subtitle': 'Sign in to manage the platform',
      'login.user': 'Username',
      'login.pass': 'Password',
      'login.userPh': 'Enter your username',
      'login.passPh': 'Enter your password',
      'login.submit': 'Sign In',

      'brand.title': 'Weino',
      'brand.subtitle': 'Admin Panel',
      'mobile.title': 'Weino Admin',
      'mobile.menu': 'Open menu',

      'lang.label': 'Language',
      'lang.toolbarAria': 'Choose interface language',
      'lang.en': 'EN',
      'lang.ar': 'عربي',

      'btn.logout': 'Sign Out',

      'nav.section.overview': 'Overview',
      'nav.section.content': 'Content',
      'nav.section.professionals': 'Professionals',
      'nav.section.bookings': 'Bookings',
      'nav.section.tickets': 'Tickets',
      'nav.section.users': 'Users',
      'nav.section.system': 'System',
      'nav.dashboard': 'Dashboard',
      'nav.categories': 'Categories',
      'nav.locations': 'Locations',
      'nav.settings': 'App Settings',
      'nav.applications': 'Applications',
      'nav.platformFees': 'Platform Fees',
      'nav.bookingsAll': 'All bookings',
      'nav.lifecycle': 'Lifecycle',
      'nav.archive': 'Archive',
      'nav.analytics': 'Booking analytics',
      'nav.tickets': 'Tickets',
      'nav.users': 'Users',
      'nav.notifications': 'Push Notifications',
      'nav.accounts': 'Admin Accounts',

      'scope.regionAria': 'Country scope',
      'scope.label': 'Country scope',
      'scope.hint': 'Users, applications, bookings, archive, booking analytics, platform fees',
      'scope.selectTitle': 'Filter lists by professional country (when multiple countries are active)',
      'scope.allCountries': 'All countries',
      'breadcrumb.aria': 'Breadcrumb',

      'bc.section.overview': 'Overview',
      'bc.section.content': 'Content',
      'bc.section.professionals': 'Professionals',
      'bc.section.bookings': 'Bookings',
      'bc.section.tickets': 'Tickets',
      'bc.section.usersComms': 'Users & comms',
      'bc.section.system': 'System',
      'bc.page.dashboard': 'Dashboard',
      'bc.page.categories': 'Categories',
      'bc.page.locations': 'Locations',
      'bc.page.settings': 'App Settings',
      'bc.page.applications': 'Applications',
      'bc.page.platformFees': 'Platform fees',
      'bc.page.bookingsSimple': 'All bookings',
      'bc.page.lifecycle': 'Lifecycle',
      'bc.page.archive': 'Archive',
      'bc.page.analytics': 'Booking analytics',
      'bc.page.tickets': 'Tickets',
      'bc.page.users': 'Users',
      'bc.page.notifications': 'Push notifications',
      'bc.page.accounts': 'Admin accounts',

      'role.super_admin': 'Super Admin',
      'role.admin': 'Admin (full)',
      'role.bookings_manager': 'Bookings & fees',
      'role.locations_manager': 'Locations',
      'role.tickets_support': 'Tickets',
      'role.content_editor': 'Categories & media',
      'role.users_moderator': 'Users',
      'role.finance_manager': 'Platform fees',
      'role.notifications_manager': 'Notifications',
      'role.support_lead': 'Tickets + users',
      'role.verifier': 'Applications',

      'dash.title': 'Dashboard',
      'dash.subtitle': 'Overview of the platform',
      'dash.refresh': 'Refresh',
      'dash.quickActions': 'Quick Actions',

      'cat.title': 'Categories',
      'cat.subtitle': 'Professional types shown in the app (Discover and profiles).',
      'cat.searchPh': 'Search categories...',
      'cat.add': '+ Add Category',
      'cat.table.order': 'Order',
      'cat.table.photo': 'Photo / Icon',
      'cat.table.parent': 'Parent',
      'cat.table.name': 'Name (default)',
      'cat.table.en': 'EN',
      'cat.table.ar': 'AR',
      'cat.table.de': 'DE',
      'cat.table.active': 'Active',
      'cat.btn.edit': 'Edit',
      'cat.btn.delete': 'Delete',
      'cat.empty': 'No categories yet',
      'cat.emptySearch': 'No categories match your search',
      'cat.pagination.prev': 'Previous',
      'cat.pagination.next': 'Next',
      'cat.pagination.page': 'Page',
      'cat.results': 'result(s) found',
      'cat.resultsLine': '{n} result(s) found',

      'sett.title': 'App Settings',
      'sett.subtitle': 'Control which countries get Discover, professionals, and area picker. Changes apply in the app without code deploy.',
      'sett.refresh': 'Refresh',
      'sett.saveAll': 'Save all',
      'sett.tocJump': 'Jump to',
      'sett.tocAria': 'Jump to settings section',

      'loc.title': 'Locations Management',
      'loc.subtitle': 'Manage countries, governorates and cities. Used for professional area selection and platform fees.',
      'loc.countries': 'Countries',
      'loc.addCountry': '+ Add Country',
      'loc.filterCountry': 'Filter by Country:',
      'loc.govBadge': 'Showing governorates and cities for',
      'loc.sectionGov': 'Governorates & cities',
      'loc.govAdd': '+ Add Governorate',
      'loc.cityAdd': '+ Add City',
      'loc.filterGovAll': 'All governorates',
      'loc.colGovernorates': 'Governorates',
      'loc.colCities': 'Cities',
      'loc.govEmpty': 'No governorates yet. Add one to get started.',
      'loc.cityEmptyGov': 'No cities in this governorate.',
      'loc.cityEmptyHint': 'Select a governorate or add cities.',
      'loc.table.key': 'Key',
      'loc.table.name': 'Name',
      'loc.table.governorate': 'Governorate',
      'loc.table.price': 'Price',
      'loc.toggleTitle': 'Click to toggle',

      'toast.noSectionAccess': 'You do not have access to this section.',
      'toast.navNoAccess': 'You do not have access to this section.',

      'common.loading': 'Loading...',
      'common.retry': 'Retry',

      'login.signingIn': 'Signing in...',

      'state.active': 'Active',
      'state.inactive': 'Inactive',

      'cat.notFound': 'Category not found',

      'acc.superAdminFixed': 'Super Admin — role cannot be changed here.',

      'dash.loading': 'Loading dashboard...',
      'dash.stat.users': 'Total users',
      'dash.stat.professionals': 'Professionals',
      'dash.stat.nonProf': 'Non-professionals',
      'dash.stat.pendingApps': 'Pending applications',
      'dash.stat.categories': 'Categories',
      'dash.stat.pendingTickets': 'Pending tickets',
      'dash.stat.openTickets': 'Open tickets',
      'dash.stat.bookings': 'Bookings',
      'dash.stat.bookingsHint': 'Appointments & queue (type = booking)',
      'dash.stat.otherMatches': 'Other matches',
      'dash.stat.otherMatchesHint': 'Social & non-booking match rows',
      'dash.qa.apps': 'Review applications',
      'dash.qa.appsDesc': '{n} pending',
      'dash.qa.notify': 'Send notification',
      'dash.qa.notifyDesc': 'Broadcast to users',
      'dash.qa.users': 'Manage users',
      'dash.qa.usersDesc': 'Ban, edit, reputation',
      'dash.qa.tickets': 'Tickets',
      'dash.qa.ticketsDesc': '{pending} pending · {open} open',
      'dash.qaEmpty': 'No quick actions for your role.',

      'fees.allCountries': 'All Countries',
      'fees.allGovernorates': 'All Governorates',
      'fees.allCities': 'All Cities',
    },
    ar: {
      'app.title': 'وينو — الإدارة',

      'login.titleWeino': 'Weino',
      'login.titleAdmin': 'الإدارة',
      'login.subtitle': 'سجّل الدخول لإدارة المنصة',
      'login.user': 'اسم المستخدم',
      'login.pass': 'كلمة المرور',
      'login.userPh': 'أدخل اسم المستخدم',
      'login.passPh': 'أدخل كلمة المرور',
      'login.submit': 'دخول',

      'brand.title': 'Weino',
      'brand.subtitle': 'لوحة الإدارة',
      'mobile.title': 'Weino Admin',
      'mobile.menu': 'فتح القائمة',

      'lang.label': 'اللغة',
      'lang.toolbarAria': 'اختر لغة الواجهة',
      'lang.en': 'EN',
      'lang.ar': 'عربي',

      'btn.logout': 'تسجيل الخروج',

      'nav.section.overview': 'نظرة عامة',
      'nav.section.content': 'المحتوى',
      'nav.section.professionals': 'المحترفون',
      'nav.section.bookings': 'الحجوزات',
      'nav.section.tickets': 'التذاكر',
      'nav.section.users': 'المستخدمون',
      'nav.section.system': 'النظام',
      'nav.dashboard': 'لوحة التحكم',
      'nav.categories': 'التصنيفات',
      'nav.locations': 'المواقع',
      'nav.settings': 'إعدادات التطبيق',
      'nav.applications': 'الطلبات',
      'nav.platformFees': 'رسوم المنصة',
      'nav.bookingsAll': 'كل الحجوزات',
      'nav.lifecycle': 'دورة الحياة',
      'nav.archive': 'الأرشيف',
      'nav.analytics': 'تحليلات الحجوزات',
      'nav.tickets': 'التذاكر',
      'nav.users': 'المستخدمون',
      'nav.notifications': 'إشعارات الدفع',
      'nav.accounts': 'حسابات المشرفين',

      'scope.regionAria': 'نطاق الدولة',
      'scope.label': 'نطاق الدولة',
      'scope.hint': 'المستخدمون، الطلبات، الحجوزات، الأرشيف، تحليلات الحجوزات، رسوم المنصة',
      'scope.selectTitle': 'تصفية القوائم حسب دولة المحترف (عند تفعيل أكثر من دولة)',
      'scope.allCountries': 'كل الدول',
      'breadcrumb.aria': 'مسار التنقل',

      'bc.section.overview': 'نظرة عامة',
      'bc.section.content': 'المحتوى',
      'bc.section.professionals': 'المحترفون',
      'bc.section.bookings': 'الحجوزات',
      'bc.section.tickets': 'التذاكر',
      'bc.section.usersComms': 'المستخدمون والتواصل',
      'bc.section.system': 'النظام',
      'bc.page.dashboard': 'لوحة التحكم',
      'bc.page.categories': 'التصنيفات',
      'bc.page.locations': 'المواقع',
      'bc.page.settings': 'إعدادات التطبيق',
      'bc.page.applications': 'الطلبات',
      'bc.page.platformFees': 'رسوم المنصة',
      'bc.page.bookingsSimple': 'كل الحجوزات',
      'bc.page.lifecycle': 'دورة الحياة',
      'bc.page.archive': 'الأرشيف',
      'bc.page.analytics': 'تحليلات الحجوزات',
      'bc.page.tickets': 'التذاكر',
      'bc.page.users': 'المستخدمون',
      'bc.page.notifications': 'إشعارات الدفع',
      'bc.page.accounts': 'حسابات المشرفين',

      'role.super_admin': 'مشرف أعلى',
      'role.admin': 'مشرف (كامل)',
      'role.bookings_manager': 'الحجوزات والرسوم',
      'role.locations_manager': 'المواقع',
      'role.tickets_support': 'التذاكر',
      'role.content_editor': 'التصنيفات والوسائط',
      'role.users_moderator': 'المستخدمون',
      'role.finance_manager': 'رسوم المنصة',
      'role.notifications_manager': 'الإشعارات',
      'role.support_lead': 'التذاكر والمستخدمون',
      'role.verifier': 'الطلبات',

      'dash.title': 'لوحة التحكم',
      'dash.subtitle': 'نظرة عامة على المنصة',
      'dash.refresh': 'تحديث',
      'dash.quickActions': 'إجراءات سريعة',

      'cat.title': 'التصنيفات',
      'cat.subtitle': 'أنواع المحترفين الظاهرة في التطبيق (الاستكشاف والملفات).',
      'cat.searchPh': 'ابحث في التصنيفات...',
      'cat.add': '+ إضافة تصنيف',
      'cat.table.order': 'الترتيب',
      'cat.table.photo': 'صورة / أيقونة',
      'cat.table.parent': 'الأب',
      'cat.table.name': 'الاسم (الافتراضي)',
      'cat.table.en': 'EN',
      'cat.table.ar': 'AR',
      'cat.table.de': 'DE',
      'cat.table.active': 'نشط',
      'cat.btn.edit': 'تعديل',
      'cat.btn.delete': 'حذف',
      'cat.empty': 'لا توجد تصنيفات بعد',
      'cat.emptySearch': 'لا توجد تصنيفات مطابقة للبحث',
      'cat.pagination.prev': 'السابق',
      'cat.pagination.next': 'التالي',
      'cat.pagination.page': 'صفحة',
      'cat.results': 'نتيجة/نتائج',
      'cat.resultsLine': 'تم العثور على {n} نتيجة',

      'sett.title': 'إعدادات التطبيق',
      'sett.subtitle': 'تحكم في الدول التي تظهر فيها الاستكشاف والمحترفون واختيار المنطقة. التغييرات تُطبَّق في التطبيق دون نشر كود.',
      'sett.refresh': 'تحديث',
      'sett.saveAll': 'حفظ الكل',
      'sett.tocJump': 'انتقل إلى',
      'sett.tocAria': 'الانتقال إلى أقسام الإعدادات',

      'loc.title': 'إدارة المواقع',
      'loc.subtitle': 'إدارة الدول والمحافظات والمدن. تُستخدم لمنطقة المحترف ورسوم المنصة.',
      'loc.countries': 'الدول',
      'loc.addCountry': '+ إضافة دولة',
      'loc.filterCountry': 'تصفية حسب الدولة:',
      'loc.govBadge': 'عرض المحافظات والمدن لـ',
      'loc.sectionGov': 'المحافظات والمدن',
      'loc.govAdd': '+ إضافة محافظة',
      'loc.cityAdd': '+ إضافة مدينة',
      'loc.filterGovAll': 'كل المحافظات',
      'loc.colGovernorates': 'المحافظات',
      'loc.colCities': 'المدن',
      'loc.govEmpty': 'لا توجد محافظات بعد. أضف محافظة للبدء.',
      'loc.cityEmptyGov': 'لا توجد مدن في هذه المحافظة.',
      'loc.cityEmptyHint': 'اختر محافظة أو أضف مدناً.',
      'loc.table.key': 'المفتاح',
      'loc.table.name': 'الاسم',
      'loc.table.governorate': 'المحافظة',
      'loc.table.price': 'السعر',
      'loc.toggleTitle': 'انقر للتبديل',

      'toast.noSectionAccess': 'ليس لديك صلاحية لهذا القسم.',
      'toast.navNoAccess': 'ليس لديك صلاحية لهذا القسم.',

      'common.loading': 'جاري التحميل...',
      'common.retry': 'إعادة المحاولة',

      'login.signingIn': 'جاري تسجيل الدخول...',

      'state.active': 'نشط',
      'state.inactive': 'غير نشط',

      'cat.notFound': 'التصنيف غير موجود',

      'acc.superAdminFixed': 'مشرف أعلى — لا يمكن تغيير الدور من هنا.',

      'dash.loading': 'جاري تحميل لوحة التحكم...',
      'dash.stat.users': 'إجمالي المستخدمين',
      'dash.stat.professionals': 'المحترفون',
      'dash.stat.nonProf': 'غير المحترفين',
      'dash.stat.pendingApps': 'طلبات قيد المراجعة',
      'dash.stat.categories': 'التصنيفات',
      'dash.stat.pendingTickets': 'تذاكر قيد الانتظار',
      'dash.stat.openTickets': 'تذاكر مفتوحة',
      'dash.stat.bookings': 'الحجوزات',
      'dash.stat.bookingsHint': 'المواعيد والطابور (نوع = حجز)',
      'dash.stat.otherMatches': 'تطابقات أخرى',
      'dash.stat.otherMatchesHint': 'صفوف تطابق اجتماعية وغير الحجز',
      'dash.qa.apps': 'مراجعة الطلبات',
      'dash.qa.appsDesc': '{n} قيد الانتظار',
      'dash.qa.notify': 'إرسال إشعار',
      'dash.qa.notifyDesc': 'بث للمستخدمين',
      'dash.qa.users': 'إدارة المستخدمين',
      'dash.qa.usersDesc': 'حظر، تعديل، سمعة',
      'dash.qa.tickets': 'التذاكر',
      'dash.qa.ticketsDesc': '{pending} قيد الانتظار · {open} مفتوحة',
      'dash.qaEmpty': 'لا توجد إجراءات سريعة لدورك.',

      'fees.allCountries': 'كل الدول',
      'fees.allGovernorates': 'كل المحافظات',
      'fees.allCities': 'كل المدن',
    },
  };

  function getLang() {
    var s = localStorage.getItem(STORAGE_KEY);
    return s === 'ar' ? 'ar' : 'en';
  }

  function setLang(lang) {
    lang = String(lang || '').trim().toLowerCase();
    if (lang !== 'en' && lang !== 'ar') return;
    localStorage.setItem(STORAGE_KEY, lang);
    applyDocumentLang();
    applyDom();
    syncLangToggleUi();
    try {
      global.dispatchEvent(new CustomEvent('admin-lang-change', { detail: { lang: lang } }));
    } catch (e) {
      /* ignore */
    }
  }

  function applyDocumentLang() {
    var L = getLang();
    document.documentElement.lang = L === 'ar' ? 'ar' : 'en';
    document.documentElement.dir = L === 'ar' ? 'rtl' : 'ltr';
    document.title = t('app.title');
  }

  function t(key, fallback) {
    var L = getLang();
    var v = STR[L] && STR[L][key];
    if (v != null && v !== '') return v;
    v = STR.en[key];
    if (v != null && v !== '') return v;
    return fallback != null ? fallback : key;
  }

  function applyDom() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (!key) return;
      var phKey = el.getAttribute('data-i18n-placeholder');
      var tag = (el.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (phKey) el.placeholder = t(phKey);
        else if (el.hasAttribute('placeholder')) el.placeholder = t(key);
      } else if (tag === 'BUTTON' || tag === 'A' || tag === 'SPAN' || tag === 'P' || tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'LABEL' || tag === 'DIV' || tag === 'SMALL') {
        el.textContent = t(key);
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var pk = el.getAttribute('data-i18n-placeholder');
      if (!pk) return;
      el.placeholder = t(pk);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var ak = el.getAttribute('data-i18n-aria');
      if (ak) el.setAttribute('aria-label', t(ak));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var tk = el.getAttribute('data-i18n-title');
      if (tk) el.setAttribute('title', t(tk));
    });
  }

  function syncLangToggleUi() {
    var L = getLang();
    document.querySelectorAll('[data-set-lang="en"]').forEach(function (el) {
      el.classList.toggle('is-active', L === 'en');
    });
    document.querySelectorAll('[data-set-lang="ar"]').forEach(function (el) {
      el.classList.toggle('is-active', L === 'ar');
    });
  }

  var langToggleBound = false;
  function initLangToggle() {
    if (langToggleBound) return;
    langToggleBound = true;
    document.body.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-set-lang]') : null;
      if (!btn) return;
      var lang = btn.getAttribute('data-set-lang');
      setLang(lang);
    });
  }

  function init() {
    applyDocumentLang();
    initLangToggle();
    applyDom();
    syncLangToggleUi();
  }

  global.AdminI18n = {
    getLang: getLang,
    setLang: setLang,
    t: t,
    applyDom: applyDom,
    init: init,
    STR: STR,
  };

  function bootAdminI18nOnce() {
    if (global.__adminI18nBooted) return;
    global.__adminI18nBooted = true;
    init();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAdminI18nOnce);
  } else {
    bootAdminI18nOnce();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
