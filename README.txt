Weino admin (static HTML + JS)

All JavaScript for this mini-admin is only here:

  admin/js/i18n.js                    — EN/AR strings + language toggle
  admin/js/platformFeesInvoiceExport.js — fetch PDF/CSV + real error messages
  admin/js/app.js                   — wiring, API URL, forms

HTML/CSS: admin/index.html , admin/css/admin.css

For Vercel: copy the whole admin/ folder (or at least admin/js/ + index + css) into your Vercel project — no separate "for-vercel" copy in this repo.
