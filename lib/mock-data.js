import { IMAGES } from './images';

/* Product photos come from the manifest in lib/images.js (one place to swap
   in real photography). The brand SVG covers remain as fallback only. */
const productImages = (id, en, ar) => {
  const pair = IMAGES.products[id];
  if (pair) {
    return [
      { url: pair[0].url, alt: en, altAr: ar, altEn: en },
      { url: pair[1].url, alt: `${en} — lifestyle`, altAr: `${ar} — تفاصيل`, altEn: `${en} — lifestyle` },
    ];
  }
  return [
    { url: `/mock/p${id}a.svg`, alt: en },
    { url: `/mock/p${id}b.svg`, alt: `${en} — detail` },
  ];
};

const P = (id, handle, en, ar, type, typeAr, color, price, opts = {}) => ({
  id: `mock-${id}`,
  handle,
  variantId: `mock-variant-${id}`,
  title: { en, ar },
  productType: { en: type, ar: typeAr },
  color,
  price,
  currency: 'AED',
  available: opts.available !== false,
  tags: opts.tags || [],
  vendor: opts.vendor || (type === 'Pens & Tools' ? 'Pilot' : type === 'Desk & Notes' ? 'Kokuyo' : 'Tiny Inks'),
  createdAt: opts.createdAt || `2026-07-${String(10 + id).padStart(2, '0')}`,
  description: {
    en: opts.descEn || `The ${en} is made with thick, fountain-pen-friendly paper, a lay-flat binding, and a cover straight from the Tiny Inks palette. Designed in Abu Dhabi, made in a small batch, wrapped by hand.`,
    ar: opts.descAr || `صُنع ${ar} من ورق سميك مناسب لأقلام الحبر، بتجليد ينفتح بسهولة وغلاف من ألوان تايني انكس. صُمم في أبوظبي، وأُنتج بدفعة صغيرة، وغُلّف يدويًا.`,
  },
  images: opts.noImages ? [] : productImages(id, en, ar),
});

export const MOCK_PRODUCTS = [
  P(1, 'everyday-notebook-dusty-blue', 'The Everyday Notebook — Dusty Blue', 'دفتر اليوميات — أزرق هادئ', 'Notebooks', 'دفاتر', 'blue', 65, { tags: ['bestseller'] }),
  P(2, 'everyday-notebook-terracotta', 'The Everyday Notebook — Terracotta', 'دفتر اليوميات — طيني', 'Notebooks', 'دفاتر', 'terracotta', 65, { createdAt: '2026-08-05' }),
  P(3, 'daily-ritual-planner', 'Daily Ritual Planner', 'مخطط الروتين اليومي', 'Planners', 'مخططات', 'cream', 95, { tags: ['bestseller'] }),
  P(4, 'tiny-thoughts-pocket-journal', 'Tiny Thoughts Pocket Journal', 'دفتر الجيب — أفكار صغيرة', 'Journals', 'يوميات', 'blush', 45, { createdAt: '2026-08-09' }),
  P(5, 'weekly-desk-pad', 'Weekly Desk Pad', 'مفكرة المكتب الأسبوعية', 'Desk & Notes', 'مكتب وملاحظات', 'mustard', 55, {}),
  P(6, 'sticky-note-trio', 'Sticky Note Trio', 'ثلاثية الملاحظات اللاصقة', 'Desk & Notes', 'مكتب وملاحظات', 'blush', 35, { available: false }),
  P(7, 'gratitude-journal-sage', 'The Gratitude Journal', 'دفتر الامتنان', 'Journals', 'يوميات', 'sage', 85, { tags: ['bestseller'] }),
  P(8, 'gel-pen-set-sunset', 'Gel Pen Set — Sunset', 'طقم أقلام جل — غروب', 'Pens & Tools', 'أقلام وأدوات', 'terracotta', 40, { tags: ['bestseller'] }),
  P(9, 'gel-pen-set-ocean', 'Gel Pen Set — Ocean', 'طقم أقلام جل — محيط', 'Pens & Tools', 'أقلام وأدوات', 'slate', 40, { createdAt: '2026-08-12' }),
  P(10, 'to-do-notepad-slate', 'To-Do Notepad', 'مفكرة المهام', 'Desk & Notes', 'مكتب وملاحظات', 'slate', 30, {}),
  P(11, 'big-ideas-sketchbook', 'The Big Ideas Sketchbook', 'كراسة الأفكار الكبيرة', 'Notebooks', 'دفاتر', 'blue', 75, { createdAt: '2026-08-14' }),
  P(12, 'first-ink-gift-box', 'The First Ink Gift Box', 'علبة هدايا الحبر الأول', 'Gift Sets', 'أطقم الهدايا', 'ink', 149, {
    tags: ['bundle', 'bestseller'],
    createdAt: '2026-08-10',
    descEn: 'The complete gift: an Everyday Notebook, the Tiny Thoughts journal, a Sunset pen set, and a handwritten card — wrapped in a Tiny Inks gift box. Costs less than buying the pieces separately.',
    descAr: 'هدية متكاملة: دفتر اليوميات، ودفتر الجيب، وطقم أقلام الغروب، وبطاقة بخط اليد — في علبة هدايا تايني انكس. أوفر من شراء القطع متفرقة.',
  }),
  P(13, 'study-set', 'The Study Set', 'طقم الدراسة', 'Gift Sets', 'أطقم الهدايا', 'blue', 120, {
    tags: ['bundle'],
    createdAt: '2026-08-15',
    descEn: 'Everything a student desk needs: a Big Ideas sketchbook, a To-Do notepad, an Ocean pen set, and sticky flags — wrapped and ready for back-to-school.',
    descAr: 'كل ما يحتاجه مكتب الطالب: كراسة الأفكار الكبيرة، ومفكرة المهام، وطقم أقلام المحيط، وملاحظات لاصقة — مغلف وجاهز للعودة إلى المدرسة.',
  }),
  P(15, 'washi-tape-roll-sage', 'Washi Tape Roll — Sage', 'شريط واشي — أخضر هادئ', 'Desk & Notes', 'مكتب وملاحظات', 'sage', 8, { noImages: true, createdAt: '2026-08-18', vendor: 'Mideer' }),
  P(16, 'ballpoint-pen-black', 'Ballpoint Pen — Black 0.7', 'قلم حبر جاف — أسود ٠.٧', 'Pens & Tools', 'أقلام وأدوات', 'ink', 4, { noImages: true, createdAt: '2026-08-19', vendor: 'Pilot' }),
  P(14, 'desk-set', 'The Desk Set', 'طقم المكتب', 'Gift Sets', 'أطقم الهدايا', 'mustard', 135, {
    tags: ['bundle'],
    createdAt: '2026-08-16',
    descEn: 'A complete desk upgrade: the Weekly Desk Pad, a Gratitude Journal, and a Sunset pen set — a favorite for office gifting and new-job congratulations.',
    descAr: 'ترقية كاملة للمكتب: مفكرة الأسبوع، ودفتر الامتنان، وطقم أقلام الغروب — خيار مفضل لهدايا المكاتب والتهنئة بوظيفة جديدة.',
  }),
];

export const COLOR_SWATCHES = {
  blue: '#ADC4CA',
  terracotta: '#E39276',
  cream: '#F3DFC4',
  blush: '#EBB4AF',
  mustard: '#F7CD7B',
  sage: '#79A09F',
  slate: '#6E7786',
  ink: '#26272B',
};

export const COLOR_NAMES = {
  en: { blue: 'Dusty blue', terracotta: 'Terracotta', cream: 'Cream', blush: 'Blush', mustard: 'Mustard', sage: 'Sage', slate: 'Slate', ink: 'Ink' },
  ar: { blue: 'أزرق هادئ', terracotta: 'طيني', cream: 'كريمي', blush: 'وردي', mustard: 'خردلي', sage: 'أخضر هادئ', slate: 'رمادي', ink: 'حبر' },
};

/* Demo categories. In LIVE mode the equivalents come from Shopify collections
   (see getCollections in lib/products.js) — `handle` must match the collection
   handles the owner creates in Shopify so URLs stay stable when flipping modes. */
export const CATEGORIES = [
  { handle: 'notebooks', key: 'Notebooks', en: 'Notebooks', ar: 'دفاتر', match: ['Notebooks'], color: 'var(--blue)' },
  { handle: 'journals', key: 'Journals', en: 'Journals', ar: 'يوميات', match: ['Journals'], color: 'var(--sage)' },
  { handle: 'planners', key: 'Planners', en: 'Planners', ar: 'مخططات', match: ['Planners'], color: 'var(--cream)' },
  { handle: 'pens-tools', key: 'Pens & Tools', en: 'Pens & Tools', ar: 'أقلام وأدوات', match: ['Pens & Tools'], color: 'var(--mustard)' },
  { handle: 'desk-notes', key: 'Desk & Notes', en: 'Desk & Notes', ar: 'مكتب وملاحظات', match: ['Desk & Notes'], color: 'var(--blush)' },
  { handle: 'gift-sets', key: 'Gift Sets', en: 'Gift Sets', ar: 'أطقم الهدايا', match: ['Gift Sets'], color: 'var(--terracotta)' },
];
