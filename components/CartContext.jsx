'use client';
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { productImage } from '@/lib/product-images';
import {
  isLive, shopifyFetch, normalizeCart,
  CART_CREATE, CART_QUERY, CART_LINES_ADD, CART_LINES_UPDATE, CART_LINES_REMOVE,
} from '@/lib/shopify';

const CartCtx = createContext(null);
const LS_ID = 'ti_cart_id';
const LS_DEMO = 'ti_demo_cart';

export function CartProvider({ children }) {
  const live = isLive();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [cartId, setCartId] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  // guards the save effect: without it, the initial [] state is written to
  // localStorage before the load effect's setItems lands (and StrictMode's
  // double-mount then reloads the clobbered empty value)
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (live) {
      const id = localStorage.getItem(LS_ID);
      if (id) {
        shopifyFetch(CART_QUERY, { id })
          .then((d) => {
            const c = normalizeCart(d.cart);
            if (c.id) { setCartId(c.id); setCheckoutUrl(c.checkoutUrl); setItems(c.items); }
            else localStorage.removeItem(LS_ID);
          })
          .catch(() => localStorage.removeItem(LS_ID));
      }
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem(LS_DEMO) || '[]');
        if (Array.isArray(saved)) setItems(saved);
      } catch {}
      setHydrated(true);
    }
  }, [live]);

  useEffect(() => {
    if (!live && hydrated) localStorage.setItem(LS_DEMO, JSON.stringify(items));
  }, [items, live, hydrated]);

  const applyCart = useCallback((cart) => {
    const c = normalizeCart(cart);
    setCartId(c.id);
    setCheckoutUrl(c.checkoutUrl);
    setItems(c.items);
    if (c.id) localStorage.setItem(LS_ID, c.id);
  }, []);

  const add = useCallback(async (product, qty = 1) => {
    if (!live) {
      setItems((prev) => {
        const i = prev.findIndex((x) => x.variantId === product.variantId);
        if (i >= 0) {
          const next = [...prev];
          next[i] = { ...next[i], qty: next[i].qty + qty };
          return next;
        }
        return [...prev, {
          variantId: product.variantId,
          lineId: product.variantId,
          title: product.title,
          handle: product.handle,
          price: product.price,
          image: productImage(product)?.url || null,
          qty,
        }];
      });
      setOpen(true);
      return;
    }
    setBusy(true);
    try {
      const lines = [{ merchandiseId: product.variantId, quantity: qty }];
      if (!cartId) {
        const d = await shopifyFetch(CART_CREATE, { lines });
        applyCart(d.cartCreate.cart);
      } else {
        const d = await shopifyFetch(CART_LINES_ADD, { cartId, lines });
        applyCart(d.cartLinesAdd.cart);
      }
      setOpen(true);
    } catch (e) {
      console.error(e);
      alert('Could not add to cart — check your Shopify connection.');
    } finally {
      setBusy(false);
    }
  }, [live, cartId, applyCart]);

  const setQty = useCallback(async (item, qty) => {
    if (qty < 1) return remove(item);
    if (!live) {
      setItems((prev) => prev.map((x) => (x.lineId === item.lineId ? { ...x, qty } : x)));
      return;
    }
    const d = await shopifyFetch(CART_LINES_UPDATE, {
      cartId, lines: [{ id: item.lineId, quantity: qty }],
    });
    applyCart(d.cartLinesUpdate.cart);
  }, [live, cartId, applyCart]);

  const remove = useCallback(async (item) => {
    if (!live) {
      setItems((prev) => prev.filter((x) => x.lineId !== item.lineId));
      return;
    }
    const d = await shopifyFetch(CART_LINES_REMOVE, { cartId, lineIds: [item.lineId] });
    applyCart(d.cartLinesRemove.cart);
  }, [live, cartId, applyCart]);

  const checkout = useCallback(() => {
    if (live && checkoutUrl) window.location.href = checkoutUrl;
  }, [live, checkoutUrl]);

  const count = useMemo(() => items.reduce((s, x) => s + x.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((s, x) => s + x.qty * x.price, 0), [items]);

  const value = { items, count, subtotal, open, setOpen, add, setQty, remove, checkout, live, busy };
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);
