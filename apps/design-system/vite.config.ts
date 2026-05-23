import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Mini-site do Design System — local-only, sem deploy.
// Roda com `pnpm --filter @girob2b/design-system dev` em http://localhost:5174.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: Number(process.env.VITE_PORT) || 5174,
    strictPort: true,
  },
});
