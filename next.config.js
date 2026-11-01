/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import nextPWA from "next-pwa"; // Or const nextPWA = require("next-pwa"); if ES modules are not fully supported in this context by the version

const withPWA = nextPWA({
  dest: "public",
  // Add other PWA options here if needed, for example:
  // register: true,
  // skipWaiting: true,
});

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  // Turbopack config (required for Next.js 16+)
  turbopack: {},
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fitinfinity.id',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    localPatterns: [
      {
        pathname: '/assets/**',
      },
    ],
  },
  // Compression
  compress: true,
  // Power pack optimizations
  poweredByHeader: false,
  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // Rewrite uploaded asset paths to the API file-server route.
  // Next.js standalone mode does not serve files added to public/ after build.
  // This ensures runtime-uploaded files (payment proofs, profile pics, etc.)
  // are accessible via their original paths.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/assets/class-visit/:path*',
          destination: '/api/files/assets/class-visit/:path*',
        },
        {
          source: '/assets/transaction/:path*',
          destination: '/api/files/assets/transaction/:path*',
        },
        {
          source: '/assets/management/transaction/:path*',
          destination: '/api/files/assets/management/transaction/:path*',
        },
        {
          source: '/assets/profile/:path*',
          destination: '/api/files/assets/profile/:path*',
        },
        {
          source: '/assets/PT/:path*',
          destination: '/api/files/assets/PT/:path*',
        },
        {
          source: '/assets/pt/:path*',
          destination: '/api/files/assets/pt/:path*',
        },
        {
          source: '/assets/exercise/:path*',
          destination: '/api/files/assets/exercise/:path*',
        },
        {
          source: '/uploads/:path*',
          destination: '/api/files/uploads/:path*',
        },
      ],
    };
  },
};

export default withPWA(config);
