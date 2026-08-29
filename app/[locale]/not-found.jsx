import EmptyState from '@/components/EmptyState';
import { getDict } from '@/lib/dictionaries';
import { getCollections } from '@/lib/products';

/* 404 with no dead end: search box + top collections, in both languages. */
export default async function NotFound() {
  const [en, ar] = await Promise.all([getCollections('en'), getCollections('ar')]);
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', textAlign: 'center' }}>
          This page stayed <em>tiny.</em>
        </h1>
        <EmptyState
          dict={getDict('en')}
          locale="en"
          collections={en}
          title="We couldn’t find that page — but the shelves are full."
          cta="Shop all products"
          ctaHref="/en/shop"
        />
        <div dir="rtl" style={{ marginTop: 28 }}>
          <EmptyState
            dict={getDict('ar')}
            locale="ar"
            collections={ar}
            title="لم نعثر على هذه الصفحة — لكن الرفوف مليئة."
            cta="تسوّق كل المنتجات"
            ctaHref="/ar/shop"
          />
        </div>
      </div>
    </section>
  );
}
