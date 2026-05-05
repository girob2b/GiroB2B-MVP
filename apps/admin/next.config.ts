import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
  async headers() {
    // CSP do admin: estrita. Sem unsafe-eval. Mantém unsafe-inline para Next/RSC
    // hidratar inline scripts. Quando virar nonce-based, remover unsafe-inline.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://*.supabase.co",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",            value: "DENY" },
          { key: "X-Content-Type-Options",     value: "nosniff" },
          { key: "Referrer-Policy",            value: "no-referrer" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security",  value: "max-age=31536000; includeSubDomains; preload" },
          { key: "Content-Security-Policy",    value: csp },
          { key: "X-Robots-Tag",               value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
