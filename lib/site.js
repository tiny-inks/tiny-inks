export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tinyinks.ae').replace(/\/$/, '');

/* Free Abu Dhabi delivery threshold (AED) — keep in sync with the marquee/policy copy */
export const FREE_DELIVERY_THRESHOLD = 150;

/* Business contact details — all from env so the owner edits Vercel, not code.
   Only Instagram, TikTok and WhatsApp are shown as social icons. */
export function getBusiness() {
  const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '971500000000').replace(/\D/g, '');
  return {
    whatsapp,
    whatsappHref: `https://wa.me/${whatsapp}`,
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@tinyinks.ae',
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || '',
    tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL || '',
    /* street address of the Abu Dhabi shop (set NEXT_PUBLIC_SHOP_ADDRESS) */
    address: process.env.NEXT_PUBLIC_SHOP_ADDRESS || '',
    mapsHref: process.env.NEXT_PUBLIC_SHOP_MAPS_URL
      || `https://maps.google.com/?q=${encodeURIComponent(process.env.NEXT_PUBLIC_SHOP_ADDRESS || 'Tiny Inks stationery, Abu Dhabi')}`,
  };
}
