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
    /* street address of the Abu Dhabi shop (set NEXT_PUBLIC_SHOP_ADDRESS to
       override) — default is the real address from the shop's own Google
       Maps listing ("Tiny inks Stationary", 100 Al Dhaid Street, Rabdan). */
    address: process.env.NEXT_PUBLIC_SHOP_ADDRESS || '100 Al Dhaid Street, Rabdan, Abu Dhabi',
    mapsHref: process.env.NEXT_PUBLIC_SHOP_MAPS_URL
      || `https://maps.google.com/?q=${encodeURIComponent(process.env.NEXT_PUBLIC_SHOP_ADDRESS || 'Tiny inks Stationary, 100 Al Dhaid Street, Rabdan, Abu Dhabi')}`,
    /* embeddable iframe src for the contact-page map. Defaults to the real
       Google Maps listing for the Abu Dhabi shop (generated from Google's own
       "Share > Embed a map" for that listing) — set NEXT_PUBLIC_SHOP_MAP_EMBED_URL
       to replace it if the shop ever moves. */
    mapEmbedSrc: process.env.NEXT_PUBLIC_SHOP_MAP_EMBED_URL
      || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d227.0781908402177!2d54.50605092160228!3d24.407344272545867!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5e419c3bf73d51%3A0xcf5b0a2c41772fa0!2sTiny%20inks%20Stationary!5e0!3m2!1sen!2sae!4v1788724782314!5m2!1sen!2sae',
  };
}
