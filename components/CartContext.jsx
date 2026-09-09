'use client';
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { productImage } from '@/lib/product-images';
import {
  isLive, shopifyFetch, normalizeCart,
  CART_CREATE, CART_QUERY, CART_LINES_ADD, CART_LINES_UPDATE, CART_LINES_REMOVE,
  CART_ATTRIBUTES_UPDATE, CART_NOTE_UPDATE, CART_BUYER_IDENTITY_UPDATE,
} from '@/lib/shopify';

const CartCtx = createContext(null);
const LS_ID = 'ti_cart_id';
const LS_DEMO = 'ti_demo_cart';
const LS_DELIVERY = 'ti_delivery';
const EMPTY_DELIVERY = { name: '', phone: '', email: '', address: '', city: '', lat: '', lon: '' };
const PHONE_RE = /^[+\d][\d\s()-]{6,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  /* delivery details (name/phone/email/address) — kept on the device, sent to
     Shopify as cart attributes + note + buyer identity right before checkout */
  const [delivery, setDeliveryState] = useState(EMPTY_DELIVERY);
  const [deliveryError, setDeliveryError] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_DELIVERY) || 'null');
      if (saved && typeof saved === 'object') setDeliveryState({ ...EMPTY_DELIVERY, ...saved });
    } catch {}
  }, []);
  const setDelivery = useCallback((d) => {
    setDeliveryState(d);
    setDeliveryError(false);
    try { localStorage.setItem(LS_DELIVERY, JSON.stringify(d)); } catch {}
  }, []);
  const deliveryValid = Boolean(
    delivery.name.trim() && PHONE_RE.test(delivery.phone.trim()) && delivery.address.trim()
      && (!delivery.email.trim() || EMAIL_RE.test(delivery.email.trim()))
  );

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

  /* Several lines at once, each with line-item attributes (the print service).
     Demo: stored locally with the attributes; live: cartLinesAdd with attributes. */
  const addLines = useCallback(async (lines, { open = true } = {}) => {
    const clean = (attrs = []) => attrs.filter((a) => a && a.key && a.value != null).map((a) => ({ key: String(a.key).slice(0, 100), value: String(a.value).slice(0, 1000) }));
    if (!live) {
      setItems((prev) => [
        ...prev,
        ...lines.map((l, i) => ({
          variantId: l.variantId, lineId: `${l.variantId}-${Date.now()}-${i}`, title: l.title, handle: l.handle || 'print',
          price: Number(l.price) || 0, image: l.images?.[0]?.url || null, qty: l.qty, attributes: clean(l.attributes),
        })),
      ]);
      if (open) setOpen(true);
      return true;
    }
    setBusy(true);
    try {
      const shopLines = lines.map((l) => ({ merchandiseId: l.variantId, quantity: l.qty, attributes: clean(l.attributes) }));
      if (!cartId) {
        const d = await shopifyFetch(CART_CREATE, { lines: shopLines });
        applyCart(d.cartCreate.cart);
      } else {
        const d = await shopifyFetch(CART_LINES_ADD, { cartId, lines: shopLines });
        applyCart(d.cartLinesAdd.cart);
      }
      if (open) setOpen(true);
      return true;
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

  /* Hand-off to Shopify checkout. Returns false (and flags the form) when the
     delivery details are incomplete; otherwise attaches them to the cart and
     redirects. Attaching is best-effort — a failed mutation never blocks paying. */
  /* wipe the basket after a successful on-site checkout */
  const clearCart = useCallback(() => {
    setItems([]);
    setCartId(null);
    setCheckoutUrl(null);
    try { localStorage.removeItem(LS_ID); localStorage.setItem(LS_DEMO, '[]'); } catch {}
  }, []);

  const checkout = useCallback(async () => {
    if (!live || !checkoutUrl) return false;
    if (!deliveryValid) { setDeliveryError(true); return false; }
    setBusy(true);
    const name = delivery.name.trim(), phone = delivery.phone.trim(), email = delivery.email.trim(), address = delivery.address.trim();
    try {
      const attributes = [
        { key: 'Delivery name', value: name },
        { key: 'Phone', value: phone },
        { key: 'Delivery address', value: address },
        ...(email ? [{ key: 'Email', value: email }] : []),
        ...(delivery.lat ? [{ key: 'Map location', value: `https://maps.google.com/?q=${delivery.lat},${delivery.lon}` }] : []),
      ];
      await shopifyFetch(CART_ATTRIBUTES_UPDATE, { cartId, attributes });
      await shopifyFetch(CART_NOTE_UPDATE, { cartId, note: `Delivery: ${name} · ${phone}${email ? ` · ${email}` : ''}\n${address}` });
      if (email || phone) {
        const buyerIdentity = { countryCode: 'AE', ...(email ? { email } : {}), ...(/^\+\d{8,15}$/.test(phone.replace(/[\s()-]/g, '')) ? { phone: phone.replace(/[\s()-]/g, '') } : {}) };
        await shopifyFetch(CART_BUYER_IDENTITY_UPDATE, { cartId, buyerIdentity }).catch(() => {});
      }
    } catch (e) {
      console.error('Could not attach delivery details:', e);
    }
    window.location.href = checkoutUrl;
    return true;
  }, [live, checkoutUrl, cartId, delivery, deliveryValid]);

  const count = useMemo(() => items.reduce((s, x) => s + x.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((s, x) => s + x.qty * x.price, 0), [items]);

  const value = { items, count, subtotal, open, setOpen, add, addLines, setQty, remove, checkout, clearCart, live, busy, delivery, setDelivery, deliveryValid, deliveryError };
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);
