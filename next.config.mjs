/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async redirects() {
    return [
      // Tiny Drops became Gift Sets & Bundles
      { source: '/:locale(en|ar)/drops', destination: '/:locale/bundles', permanent: true },
    ];
  },
};
export default nextConfig;
