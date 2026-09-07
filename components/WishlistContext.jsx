'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const WishCtx = createContext(null);
const LS_WISH = 'ti_wishlist';

export function WishlistProvider({ children }) {
  const [handles, setHandles] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_WISH) || '[]');
      if (Array.isArray(saved)) setHandles(saved);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(LS_WISH, JSON.stringify(handles));
  }, [handles, hydrated]);

  const toggle = useCallback((handle) => {
    setHandles((prev) =>
      prev.includes(handle) ? prev.filter((h) => h !== handle) : [...prev, handle]
    );
  }, []);

  const has = useCallback((handle) => handles.includes(handle), [handles]);

  return <WishCtx.Provider value={{ handles, toggle, has, count: handles.length }}>{children}</WishCtx.Provider>;
}

export const useWishlist = () => useContext(WishCtx);
