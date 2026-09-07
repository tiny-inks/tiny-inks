import Link from 'next/link';
import { collectionTileImage } from './CollectionGrid';

/* Circle nav to real collections — wraps to new lines instead of scrolling,
   so every category is visible at once with no scroll container/arrows. */
export default function CategoryCircles({ collections, locale }) {
  return (
    <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-8 sm:gap-x-9">
      {collections.slice(0, 9).map((c) => {
        const img = collectionTileImage(c);
        return (
          <Link key={c.handle} href={`/${locale}/shop/${c.handle}`} className="group flex w-[104px] shrink-0 flex-col items-center gap-3 sm:w-[136px]">
            <span className="overflow-hidden rounded-full border-[3px] border-secondary p-1 transition-colors group-hover:border-coral">
              {img ? (
                <img src={img.url} alt={c.title} loading="lazy" className="h-[86px] w-[86px] rounded-full object-cover transition-transform duration-700 group-hover:scale-110 sm:h-[118px] sm:w-[118px]" />
              ) : (
                <span className="grid h-[86px] w-[86px] place-items-center rounded-full bg-secondary text-2xl sm:h-[118px] sm:w-[118px]">✦</span>
              )}
            </span>
            <span className="text-center text-[0.78rem] font-extrabold uppercase tracking-[0.08em]">{c.title}</span>
          </Link>
        );
      })}
    </div>
  );
}
