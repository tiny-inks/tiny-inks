/* Staff app strings (EN + AR). Separate from the storefront dictionary so the
   PWA bundle stays small. */
const en = {
  app: 'Tiny Inks · Print desk',
  login: { title: 'Staff sign-in', password: 'Shared password', submit: 'Sign in', wrong: 'Wrong password — try again.', rate: 'Too many attempts. Wait 15 minutes.', demo: 'STAFF_PASSWORD is not set — the demo password "tinyinks" is in use. Set STAFF_PASSWORD in Vercel before real use.', offline: 'Could not reach the server.' },
  logout: 'Log out',
  refresh: 'Refresh',
  lang: 'العربية',
  demoBadge: 'Demo orders — connect SHOPIFY_ADMIN_TOKEN for real ones',
  storageWarn: 'Uploads are stored in the temporary folder (no BLOB_READ_WRITE_TOKEN) and vanish on redeploy.',
  totals: { title: 'Today', orders: 'Orders', pages: 'Pages', revenue: 'Revenue' },
  filters: { status: 'Status', period: 'When', fulfil: 'Fulfilment', all: 'All', today: 'Today', week: 'This week', collect: 'Collect', delivery: 'Delivery', search: 'Order no. or phone' },
  sections: { today: 'Today', older: 'Older' },
  status: { new: 'New', printing: 'Printing', ready: 'Ready', done: 'Done' },
  next: { new: 'Start printing', printing: 'Mark ready', ready: 'Mark collected', readyDelivery: 'Mark delivered', done: 'Completed' },
  back: 'Back to',
  card: { call: 'Call', whatsapp: 'WhatsApp', openFile: 'Open file', notify: 'Notify customer', pages: 'pages', paid: 'Paid', unpaid: 'Unpaid', pending: 'Pending', collect: 'Collect from shop', delivery: 'Delivery', note: 'Note', copies: 'copies', noFile: 'No file attached', demoFile: 'Sample file (demo order)', linkErr: 'Could not create a file link.' },
  notifyMsg: 'Tiny Inks: your print order {order} is ready — total {total}. / تايني انكس: طلب الطباعة {order} جاهز — الإجمالي {total}.',
  notifyMsgDelivery: 'Tiny Inks: your print order {order} is on its way — total {total}. / تايني انكس: طلب الطباعة {order} في الطريق — الإجمالي {total}.',
  empty: { title: 'No print orders here', lede: 'New jobs from /print show up automatically. Pull down or tap Refresh.' },
  error: 'Could not load orders.',
  statusErr: 'Status change failed — reverted.',
  install: 'Add to home screen for full-screen use',
};

const ar = {
  app: 'تايني انكس · مكتب الطباعة',
  login: { title: 'دخول الموظفين', password: 'كلمة المرور المشتركة', submit: 'دخول', wrong: 'كلمة المرور غير صحيحة — حاول مجددًا.', rate: 'محاولات كثيرة. انتظر ١٥ دقيقة.', demo: 'STAFF_PASSWORD غير مضبوطة — كلمة المرور التجريبية "tinyinks" مستخدمة. اضبطها في Vercel قبل الاستخدام الفعلي.', offline: 'تعذر الوصول إلى الخادم.' },
  logout: 'تسجيل الخروج',
  refresh: 'تحديث',
  lang: 'English',
  demoBadge: 'طلبات تجريبية — اربط SHOPIFY_ADMIN_TOKEN للطلبات الحقيقية',
  storageWarn: 'الملفات محفوظة في المجلد المؤقت (لا يوجد BLOB_READ_WRITE_TOKEN) وتختفي عند إعادة النشر.',
  totals: { title: 'اليوم', orders: 'الطلبات', pages: 'الصفحات', revenue: 'الإيراد' },
  filters: { status: 'الحالة', period: 'الوقت', fulfil: 'الاستلام', all: 'الكل', today: 'اليوم', week: 'هذا الأسبوع', collect: 'استلام', delivery: 'توصيل', search: 'رقم الطلب أو الهاتف' },
  sections: { today: 'اليوم', older: 'أقدم' },
  status: { new: 'جديد', printing: 'قيد الطباعة', ready: 'جاهز', done: 'مكتمل' },
  next: { new: 'ابدأ الطباعة', printing: 'جاهز للاستلام', ready: 'تم الاستلام', readyDelivery: 'تم التوصيل', done: 'مكتمل' },
  back: 'رجوع إلى',
  card: { call: 'اتصال', whatsapp: 'واتساب', openFile: 'افتح الملف', notify: 'أبلغ العميل', pages: 'صفحة', paid: 'مدفوع', unpaid: 'غير مدفوع', pending: 'قيد الانتظار', collect: 'استلام من المتجر', delivery: 'توصيل', note: 'ملاحظة', copies: 'نسخ', noFile: 'لا يوجد ملف', demoFile: 'ملف تجريبي', linkErr: 'تعذر إنشاء رابط الملف.' },
  notifyMsg: 'Tiny Inks: your print order {order} is ready — total {total}. / تايني انكس: طلب الطباعة {order} جاهز — الإجمالي {total}.',
  notifyMsgDelivery: 'Tiny Inks: your print order {order} is on its way — total {total}. / تايني انكس: طلب الطباعة {order} في الطريق — الإجمالي {total}.',
  empty: { title: 'لا توجد طلبات طباعة هنا', lede: 'الطلبات الجديدة من صفحة الطباعة تظهر تلقائيًا. اضغط تحديث.' },
  error: 'تعذر تحميل الطلبات.',
  statusErr: 'فشل تغيير الحالة — تم التراجع.',
  install: 'أضف إلى الشاشة الرئيسية لعرض ملء الشاشة',
};

export const STAFF_DICT = { en, ar };
