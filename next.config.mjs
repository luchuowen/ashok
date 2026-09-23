/** @type {import('next').NextConfig} */
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

    // @react-pdf/textkit (a dep of @react-pdf/renderer, used by
    // lib/quote-pdf.tsx) statically imports "@react-pdf/hyphenate/en-us"
    // to build its default hyphenation callback. @react-pdf/hyphenate's
    // package.json only declares an "import" condition for that subpath
    // export, no "require"/"node" condition, so webpack's Node-target
    // resolver rejects it with "Package subpath './en-us' is not defined
    // by exports" — this is what breaks quote PDF generation (both the
    // staff download and the "send by email" attachment) in production.
    // Point straight at the real file so webpack resolves it by path
    // instead of through that incomplete exports map.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-pdf/hyphenate/en-us": path.join(
        __dirname,
        "node_modules/@react-pdf/hyphenate/lib/en-us.js",
      ),
    };

    return config;
  },
};

export default nextConfig;
