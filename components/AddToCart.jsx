'use client';
import { useState } from 'react';
import { useCart } from './CartContext';

export default function AddToCart({ product, dict }) {
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product.available) {
    return (
      <button type="button" disabled className="cursor-not-allowed rounded-full border-[1.5px] border-border px-8 py-3.5 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
        {dict.product.soldout}
      </button>
    );
  }

  return (
    <>
      <div className="inline-flex shrink-0 items-center rounded-full border-[1.5px] border-ink" aria-label={dict.product.qty}>
        <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="-" className="grid h-11 w-11 place-items-center text-lg font-extrabold">−</button>
        <span className="min-w-[2rem] text-center text-sm font-extrabold tabular-nums">{qty}</span>
        <button type="button" onClick={() => setQty(qty + 1)} aria-label="+" className="grid h-11 w-11 place-items-center text-lg font-extrabold">+</button>
      </div>
      <button
        type="button"
        className={`min-w-[180px] flex-1 rounded-full border-[1.5px] py-3.5 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] transition-colors duration-300 ${added ? 'border-sage bg-sage text-ink' : 'border-ink bg-ink text-white hover:bg-coral hover:border-coral'}`}
        onClick={async () => {
          await cart.add(product, qty);
          setAdded(true);
          setTimeout(() => setAdded(false), 1600);
        }}
      >
        {added ? dict.product.added : dict.product.add}
      </button>
    </>
  );
}
