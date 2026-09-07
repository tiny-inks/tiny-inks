'use client';
import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useCart } from './CartContext';

export default function AddToCart({ product, dict }) {
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product.available) {
    return (
      <button type="button" disabled className="ui-btn ui-btn-lg ui-btn-quiet">
        {dict.product.soldout}
      </button>
    );
  }

  return (
    <>
      <div className="ui-qty shrink-0" aria-label={dict.product.qty}>
        <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label={dict.cartUi.decrease} disabled={qty <= 1}>
          <Minus className="h-4 w-4" strokeWidth={1.8} />
        </button>
        <span>{qty}</span>
        <button type="button" onClick={() => setQty(qty + 1)} aria-label={dict.cartUi.increase}>
          <Plus className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>
      <button
        type="button"
        className={`ui-btn ui-btn-lg min-w-[180px] flex-1 ${added ? 'border-sage bg-sage text-ink' : 'ui-btn-primary'}`}
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
