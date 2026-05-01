import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // `standalone` só faz sentido pro runner Docker (apps/web/Dockerfile).
  // Vercel ignora a flag e usa seu próprio runtime — manter ativo lá só
  // adiciona ~20s de build sem benefício e pode gerar warnings. Ativar
  // explicitamente via `BUILD_TARGET=docker npm run build`.
  output: process.env.BUILD_TARGET === "docker" ? "standalone" : undefined,
  turbopack: {
    root: path.resolve(__dirname, "../../"), // raiz do monorepo
  },
  images: {
    remotePatterns: [
      // Supabase Storage
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  // Headers de segurança
  async headers() {
    // CSP permissiva no MVP — libera 'unsafe-inline' pra Next/RSC hidratar e
    // pro JSON-LD funcionar. Quando virar nonce-based, trocar 'unsafe-inline'
    // por nonce gerado em middleware. HSTS 1 ano + preload pra aplicação prod.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://accounts.google.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com",
      "frame-src https://accounts.google.com https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-Content-Type-Options",     value: "nosniff" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security",  value: "max-age=31536000; includeSubDomains; preload" },
          { key: "Content-Security-Policy",    value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
