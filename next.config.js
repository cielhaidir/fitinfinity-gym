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
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  // async headers() {
  //   return [
  //     {
  //       source: '/(.*)',
  //       headers: [
  //         {
  //           key: 'X-Content-Type-Options',
  //           value: 'nosniff',
  //         },
  //         {
  //           key: 'X-Frame-Options',
  //           value: 'DENY',
  //         },
  //         {
  //           key: 'Referrer-Policy',
  //           value: 'strict-origin-when-cross-origin',
  //         },
  //       ],
  //     },
  //     {
  //       source: '/sw.js',
  //       headers: [
  //         {
  //           key: 'Content-Type',
  //           value: 'application/javascript; charset=utf-8',
  //         },
  //         {
  //           key: 'Cache-Control',
  //           value: 'no-cache, no-store, must-revalidate',
  //         },
  //         {
  //           key: 'Content-Security-Policy',
  //           value: "default-src 'self'; script-src 'self'",
  //         },
  //       ],
  //     },
  //   ];
  // },
  // The async headers part can remain if needed, but ensure it doesn't conflict
  // with next-pwa's own service worker generation and headers.
  // It's often better to let next-pwa handle service worker related headers.
};

export default withPWA(config);
