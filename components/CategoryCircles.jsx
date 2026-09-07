import Link from 'next/link';
import { collectionTileImage } from './CollectionGrid';

/* Lovable-style horizontally-scrolling circle nav to real collections. */
export default function CategoryCircles({ collections, locale }) {
  return (
    <div className="mt-8 flex snap-x gap-5 overflow-x-auto pb-2 sm:justify-center sm:gap-9">
      {collections.slice(0, 9).map((c) => {
        const img = collectionTileImage(c);
        return (
          <Link key={c.handle} href={`/${locale}/shop/${c.handle}`} className="group flex w-[104px] shrink-0 snap-start flex-col items-center gap-3 sm:w-[136px]">
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
