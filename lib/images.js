/*
 * ONE place for every photo on the site.
 *
 * These are curated Unsplash placeholders (warm stationery photography that
 * matches the brand palette). Before launch the owner replaces the `url`
 * values in THIS file with her real product photos — nothing else needs
 * to change. Keep the `alt` texts honest when swapping.
 *
 * Every entry: { url, alt: { en, ar } }
 */

const u = (id, w = 750) =>
  `https://images.unsplash.com/photo-${id}?auto=format&w=${w}&q=70&fit=crop`;

/* wrap an entry with a small (w=400) variant for thumbnails/polaroids */
const withSm = (id, alt) => ({ url: u(id, 750), sm: u(id, 400), alt });

/* ---- the reusable pool ---- */
export const PHOTOS = {
  penWriting: withSm('1455390582262-044cdead277a', { en: 'Fountain pen writing on lined paper', ar: 'قلم حبر يكتب على ورق مسطّر' }),
  journalHands: withSm('1488190211105-8b0e65b80b4e', { en: 'Hands writing in a journal beside coffee', ar: 'يدان تكتبان في دفتر بجانب القهوة' }),
  notesNotebook: withSm('1517842645767-c639042777db', { en: 'Open notebook with a fountain pen', ar: 'دفتر مفتوح مع قلم حبر' }),
  plannerCoffee: withSm('1506784983877-45594efa4cbe', { en: 'Monthly planner with hand lettering and coffee', ar: 'مخطط شهري بخط اليد مع قهوة' }),
  washiCraft: withSm('1452860606245-08befc0ff44b', { en: 'Washi tape, scissors and craft tools', ar: 'أشرطة واشي ومقص وأدوات حرفية' }),
  bookLatte: withSm('1544716278-ca5e3f4abd8c', { en: 'Open book with a latte on soft linen', ar: 'كتاب مفتوح مع قهوة على قماش ناعم' }),
  pensCase: withSm('1456735190827-d1262f71b8a3', { en: 'A case full of colorful pens and markers', ar: 'حقيبة مليئة بالأقلام الملونة' }),
  paintBrushes: withSm('1513364776144-60967b0f800f', { en: 'Paint brushes with warm colors', ar: 'فُرش رسم بألوان دافئة' }),
  writeIdeas: withSm('1516414447565-b14be0adf13e', { en: '"Write ideas" notebook with a pencil', ar: 'دفتر «اكتب أفكارك» مع قلم رصاص' }),
  stickyWall: withSm('1507925921958-8a62f3d1a50d', { en: 'Sticky notes arranged on a wall', ar: 'ملاحظات لاصقة مرتبة على الحائط' }),
  giftPink: withSm('1513201099705-a9746e1e201f', { en: 'Kraft gift box with a pink ribbon', ar: 'علبة هدية كرافت بشريط وردي' }),
  giftBlush: withSm('1549465220-1a8b9238cd48', { en: 'Gift box with gold ribbon on blush pink', ar: 'علبة هدية بشريط ذهبي على خلفية وردية' }),
  giftHands: withSm('1512909006721-3d6018887383', { en: 'Hands offering a hand-wrapped gift', ar: 'يدان تقدمان هدية مغلفة يدويًا' }),
  booksHand: withSm('1519682337058-a94d519337bc', { en: 'A hand holding a small stack of books', ar: 'يد تحمل مجموعة صغيرة من الكتب' }),
  bookWarm: withSm('1543002588-bfa74002ed7e', { en: 'Open books on a warm sand backdrop', ar: 'كتب مفتوحة على خلفية رملية دافئة' }),
  notepadPen: withSm('1471107340929-a87cd0f5b5f3', { en: 'Spiral notepad with a fountain pen on wood', ar: 'مفكرة حلزونية مع قلم حبر على الخشب' }),
};

/* ---- slot map: which photo goes where ---- */
export const IMAGES = {
  // hero: one strong product flat-lay + a small supporting shot
  heroMain: PHOTOS.journalHands,
  heroSmall: PHOTOS.giftBlush,

  /* promo carousel slides are served from /public/promo (local files) because
     the first slide is the page's LCP image — swap the JPGs there AND the alts
     here when real photos arrive */
  promoSlides: [
    { url: '/promo/slide-1.jpg', alt: { en: 'Kraft gift box with a pink ribbon', ar: 'علبة هدية كرافت بشريط وردي' } },
    { url: '/promo/slide-2.jpg', alt: { en: 'Open notebook with a fountain pen', ar: 'دفتر مفتوح مع قلم حبر' } },
    { url: '/promo/slide-3.jpg', alt: { en: 'Gift box with gold ribbon on blush pink', ar: 'علبة هدية بشريط ذهبي على خلفية وردية' } },
  ],

  // home category tiles (keyed by CATEGORIES key in mock-data.js)
  categories: {
    'Notebooks': PHOTOS.notesNotebook,
    'Journals': PHOTOS.bookLatte,
    'Planners': PHOTOS.plannerCoffee,
    'Pens & Tools': PHOTOS.pensCase,
    'Desk & Notes': PHOTOS.stickyWall,
  },

  // home editorial split section
  editorial: PHOTOS.journalHands,

  // home "From the desk" masonry gallery
  gallery: [
    PHOTOS.penWriting,
    PHOTOS.bookWarm,
    PHOTOS.washiCraft,
    PHOTOS.notepadPen,
    PHOTOS.giftPink,
    PHOTOS.bookLatte,
    PHOTOS.writeIdeas,
    PHOTOS.booksHand,
  ],

  // home Instagram strip (4 polaroids)
  polaroids: [PHOTOS.giftHands, PHOTOS.plannerCoffee, PHOTOS.penWriting, PHOTOS.booksHand],

  // about page
  about: PHOTOS.bookWarm,

  // demo product photos: [main, hover] per product id (see lib/mock-data.js)
  products: {
    1: [PHOTOS.notesNotebook, PHOTOS.penWriting],
    2: [PHOTOS.writeIdeas, PHOTOS.notepadPen],
    3: [PHOTOS.plannerCoffee, PHOTOS.journalHands],
    4: [PHOTOS.bookLatte, PHOTOS.bookWarm],
    5: [PHOTOS.stickyWall, PHOTOS.plannerCoffee],
    6: [PHOTOS.washiCraft, PHOTOS.stickyWall],
    7: [PHOTOS.bookWarm, PHOTOS.booksHand],
    8: [PHOTOS.penWriting, PHOTOS.pensCase],
    9: [PHOTOS.pensCase, PHOTOS.notepadPen],
    10: [PHOTOS.notepadPen, PHOTOS.stickyWall],
    11: [PHOTOS.paintBrushes, PHOTOS.writeIdeas],
    12: [PHOTOS.giftBlush, PHOTOS.giftHands],
    13: [PHOTOS.pensCase, PHOTOS.notesNotebook],
    14: [PHOTOS.notepadPen, PHOTOS.giftPink],
  },
};

export const imgAlt = (photo, locale) =>
  (photo && photo.alt && (photo.alt[locale] || photo.alt.en)) || '';
