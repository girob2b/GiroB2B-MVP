import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest config — unit tests pra lógica pura do apps/web.
 *
 * Isolamento:
 *   - include: "lib/**\/*.test.ts" — só pega arquivos dentro de lib/, nunca tests/e2e/.
 *   - tests/e2e/** continua sendo domínio exclusivo do Playwright (playwright.config.ts).
 *   - pnpm --filter @girob2b/web test:unit → vitest run (via este arquivo).
 *   - pnpm --filter @girob2b/web test:e2e → playwright test (não usa este arquivo).
 *
 * Environment: node — os unit tests cobrem lógica pura sem DOM.
 *
 * TZ=UTC: garante que cálculos de datas (deadline dos scores) sejam determinísticos
 *   independente do timezone da máquina. new Date("YYYY-MM-DD") em Node.js = UTC
 *   midnight; com TZ=UTC, setHours(0,0,0,0) também resulta em UTC midnight.
 *
 * Alias "@/": espelha o paths.@/* do tsconfig.json → resolve para a raiz de apps/web.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    env: {
      TZ: "UTC",
    },
  },
});
