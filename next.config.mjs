/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false, // drop the X-Powered-By: Next.js banner
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  /* Conservative, framework-agnostic security headers only. Deliberately NO
     Content-Security-Policy and NO Permissions-Policy here: those can silently
     break Stripe (its iframes and the `payment` permission Apple/Google Pay
     need) and the checkout "Locate me" geolocation, so they are deferred. */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Tiny Drops became Gift Sets & Bundles
      { source: '/:locale(en|ar)/drops', destination: '/:locale/bundles', permanent: true },
    ];
  },
};
export default nextConfig;
