import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Reveal from '@/components/Reveal';

/* Home-page banner that flies to the Whimsy Wheels bike landing.
   Text lives as real HTML on top of the artwork (crisp, translatable,
   animatable) — the image itself carries no baked-in copy. */
export default function BikeBanner({ locale }) {
  const t = locale === 'ar'
    ? { eyebrow: 'جديد · ويمزي ويلز', title: 'دراجات أطفال تُبهج أول رحلة', sub: 'مقاسات ١٢″–٢٠″ · ألوان مبهجة · تركيب بدقيقتين', cta: 'اكتشف الدراجات' }
    : { eyebrow: 'New · Whimsy Wheels', title: 'Kids’ bikes that make the first ride joyful', sub: '12″–20″ · happy colours · 2-minute assembly', cta: 'Explore the bikes' };

  return (
    <section className="mx-auto max-w-[1240px] px-4 py-10 sm:px-8 sm:py-14">
      <Reveal>
        <Link href={`/${locale}/bikes`} className="bk-banner" aria-label={t.title}>
          <picture className="bk-banner-img">
            <source media="(max-width: 720px)" srcSet="/bikes/banner-mobile.png" />
            <img src="/bikes/banner-desktop.png" alt="" aria-hidden="true" loading="lazy" decoding="async" />
          </picture>
          <div className="bk-banner-copy">
            <span className="eyebrow-new text-coral">{t.eyebrow}</span>
            <h2 className="bk-banner-title display-lg">{t.title}</h2>
            <p className="bk-banner-sub">{t.sub}</p>
            <span className="ui-btn ui-btn-primary bk-banner-btn">{t.cta}<ArrowRight className="h-4 w-4 rtl:rotate-180" /></span>
          </div>
        </Link>
      </Reveal>
    </section>
  );
}
