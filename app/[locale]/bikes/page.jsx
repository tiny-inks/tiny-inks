import Breadcrumbs from '@/components/Breadcrumbs';
import BikesClient from '@/components/bikes/BikesClient';
import { getDict } from '@/lib/dictionaries';
import { getProducts } from '@/lib/products';
import { getBusiness } from '@/lib/site';

/* Dedicated landing for the "Whimsy Wheels" kids-bike line. It reuses the real
   Shopify catalogue (price / image / stock / variant) — no pricing or checkout
   logic here — and presents it with a bespoke, animated experience. */

const BIKE_TYPE = 'Whimsy Wheels';
/* "Classic 12\" Kids Bike - Blue" · "Pro Aluminum 16\" Kids Bike - Red" */
const TITLE_RE = /^(classic|pro(?:\s+aluminum)?)\s+(\d+)"?\s+kids?\s+bike\s*[-–]\s*(.+)$/i;

function parseBike(p) {
  const m = (p.title || '').trim().match(TITLE_RE);
  if (!m) return null;
  const model = /pro/i.test(m[1]) ? 'pro' : 'classic';
  const size = Number(m[2]);
  const color = m[3].trim().replace(/\s+/g, ' ');
  const image = p.images?.[0]?.url || null;
  return {
    handle: p.handle,
    name: p.title,
    model,
    size,
    color,
    price: p.price,
    currency: p.currency || 'AED',
    available: p.available,
    image,
    /* minimal, serialisable product for the shared cart (add() reads these) */
    product: { variantId: p.variantId, title: p.title, handle: p.handle, price: p.price, currency: p.currency, available: p.available, images: p.images || [] },
  };
}

export async function generateMetadata({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  return {
    title: locale === 'ar' ? 'دراجات الأطفال · ويمزي ويلز' : 'Kids Bikes · Whimsy Wheels',
    description: locale === 'ar'
      ? 'دراجات أطفال آمنة وممتعة بمقاسات ١٢″–٢٠″ وألوان مبهجة — تركيب خلال دقيقتين وتوصيل داخل الإمارات.'
      : 'Safe, joyful kids’ bikes in 12″–20″ and happy colours — 2-minute assembly and UAE delivery.',
  };
}

export default async function BikesPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const products = await getProducts(locale);

  /* Match by product type OR by the bike title pattern — some items were tagged
     "Whimsy Wheels" by staff and at least one was left untyped, so the title
     regex is the reliable net that catches every bike. */
  const bikes = products
    .filter((p) => p.productType === BIKE_TYPE || TITLE_RE.test((p.title || '').trim()))
    .map(parseBike)
    .filter(Boolean)
    .sort((a, b) => (a.model === b.model ? a.size - b.size || a.color.localeCompare(b.color) : a.model === 'classic' ? -1 : 1));

  const business = getBusiness();

  return (
    <>
      <div className="mx-auto max-w-[1440px] px-5 pt-6 sm:px-8">
        <Breadcrumbs dict={dict} locale={locale} items={[{ href: `/${locale}/shop`, label: dict.nav.shop }, { label: locale === 'ar' ? 'الدراجات' : 'Bikes' }]} />
      </div>
      <BikesClient bikes={bikes} locale={locale} whatsappHref={business.whatsappHref} />
    </>
  );
}
