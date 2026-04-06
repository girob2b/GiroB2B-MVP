import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone", // necessário para o runner Docker (node server.js)
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
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-Content-Type-Options",     value: "nosniff" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
