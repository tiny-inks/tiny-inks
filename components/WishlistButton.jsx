'use client';
import { useWishlist } from './WishlistContext';

/* Standalone wishlist toggle for the PDP buy box. */
export default function WishlistButton({ handle, dict }) {
  const wishlist = useWishlist();
  const saved = wishlist?.has(handle);
  return (
    <button
      type="button"
      onClick={() => wishlist?.toggle(handle)}
      aria-label={saved ? dict.product.wishlistRemove : dict.product.wishlistAdd}
      aria-pressed={!!saved}
      className={`grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors duration-300 ${saved ? 'border-coral bg-coral text-white' : 'border-ink text-ink hover:border-coral hover:text-coral'}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21C7 16.5 3 13.2 3 9.3 3 6.9 4.9 5 7.3 5c1.7 0 3.3.9 4.7 2.8C13.4 5.9 15 5 16.7 5 19.1 5 21 6.9 21 9.3c0 3.9-4 7.2-9 11.7z" />
      </svg>
    </button>
  );
}
