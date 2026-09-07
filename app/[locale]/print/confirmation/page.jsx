import Breadcrumbs from '@/components/Breadcrumbs';
import PrintConfirmation from '@/components/print/PrintConfirmation';
import { getDict } from '@/lib/dictionaries';
import { getBusiness } from '@/lib/site';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.print.confirm.title, robots: { index: false } };
}

export default function PrintConfirmationPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  return (
    <>
      <div className="mx-auto max-w-[1240px] px-5 pt-6 sm:px-8">
        <Breadcrumbs dict={dict} locale={locale} items={[{ href: `/${locale}/print`, label: dict.print.title }, { label: dict.print.confirm.title }]} />
      </div>
      <PrintConfirmation dict={dict} locale={locale} business={getBusiness()} />
    </>
  );
}
