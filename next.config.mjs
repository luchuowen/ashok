/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  webpack(config, { isServer }) {
    if (!isServer) {
      // firebase-admin is server-only. A "use client" file that imports a
      // pure helper (e.g. effectivePrice) from lib/inventory.ts still makes
      // webpack try to bundle the Admin SDK for the browser, which fails on
      // node built-ins (fs, net). Resolve it to an empty module client-side;
      // the server bundle is untouched. Any client code that actually calls
      // a Firestore function would fail at runtime rather than build time —
      // that's a bug in that component, not something the browser can do.
      config.resolve.alias = { ...config.resolve.alias, "firebase-admin": false };
    }
    return config;
  },
};

export default nextConfig;
