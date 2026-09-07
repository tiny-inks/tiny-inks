import Link from 'next/link';
import { Search } from 'lucide-react';

/* No dead ends: every empty state offers a search box and the top collections. */
export default function EmptyState({ dict, locale, collections = [], title, cta, ctaHref, action = null }) {
  const top = collections.slice(0, 4);
  return (
    <div className="rounded-3xl bg-secondary px-5 py-16 text-center">
      <span aria-hidden="true" className="text-3xl text-coral">✦</span>
      <h3 className="mt-3 font-display text-xl">{title}</h3>

      {cta && ctaHref ? (
        <Link href={ctaHref} className="ui-btn ui-btn-primary mt-6">
          {cta}
        </Link>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}

      <form action={`/${locale}/shop`} method="get" role="search" className="mx-auto mt-6 flex max-w-[420px] items-center">
        <input
          type="search"
          name="q"
          placeholder={dict.search.placeholder}
          aria-label={dict.emptyState.search}
          className="h-12 min-w-0 flex-1 rounded-s-full border-[1.5px] border-e-0 border-border bg-card px-4 text-sm outline-none focus:border-coral"
        />
        <button type="submit" aria-label={dict.search.label} className="grid h-12 w-14 shrink-0 place-items-center rounded-e-full border-[1.5px] border-ink bg-ink text-white">
          <Search className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </button>
      </form>

      {top.length > 0 && (
        <div className="mt-6 grid justify-items-center gap-2.5">
          <span className="text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">{dict.emptyState.browse}</span>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href={`/${locale}/shop`} className="rounded-full border-[1.5px] border-border bg-card px-4 py-2 text-sm font-bold transition-colors hover:border-ink">{dict.emptyState.all}</Link>
            {top.map((c) => (
              <Link key={c.handle} href={`/${locale}/shop/${c.handle}`} className="rounded-full border-[1.5px] border-border bg-card px-4 py-2 text-sm font-bold transition-colors hover:border-ink">{c.title}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
