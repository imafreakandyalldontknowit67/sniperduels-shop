const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'tr.rbxcdn.com' },
      { protocol: 'https', hostname: 'thumbnails.roblox.com' },
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
    ],
    // Default is 60s — too short for Cloudflare to bother caching, so every
    // /_next/image hit was DYNAMIC and round-tripped to origin. Image URLs
    // already include `w` and `q` params (and `url` for the source), so any
    // variant change produces a new cache key. Safe to cache 1y at the edge.
    minimumCacheTTL: 31536000,
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.sniperduels.shop' }],
        destination: 'https://sniperduels.shop/:path*',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us-assets.i.posthog.com https://ph.sniperduels.shop https://secure.pandabase.io https://checkout.pandabase.io; style-src 'self' 'unsafe-inline'; img-src 'self' https://tr.rbxcdn.com https://thumbnails.roblox.com https://cdn.discordapp.com https://us.i.posthog.com https://ph.sniperduels.shop https://img.logokit.com https://nowpayments.io data:; font-src 'self' data:; connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com https://ph.sniperduels.shop https://api.pandabase.io https://secure.pandabase.io https://checkout.pandabase.io; frame-src https://checkout.pandabase.io https://secure.pandabase.io; frame-ancestors 'none'" },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ]
  },
}

module.exports = withBundleAnalyzer(nextConfig)
