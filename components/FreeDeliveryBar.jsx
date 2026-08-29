'use client';
import { formatPrice } from '@/lib/products';
import { FREE_DELIVERY_THRESHOLD } from '@/lib/site';

/* Prominent progress toward free Abu Dhabi delivery — baskets are many small
   items, so this is the nudge that grows the order. */
export default function FreeDeliveryBar({ subtotal, dict, locale }) {
  const t = dict.cartUi;
  const pct = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100));
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const unlocked = remaining <= 0;
  return (
    <div className={`fdbar ${unlocked ? 'ok' : ''}`} role="status">
      <div className="fdbar-text">
        {unlocked
          ? t.freeUnlocked
          : t.freeAway.replace('{amount}', formatPrice(remaining, 'AED', locale))}
      </div>
      <div className="fdbar-track" aria-hidden="true">
        <div className="fdbar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
