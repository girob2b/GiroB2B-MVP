import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — testes E2E mínimos do MVP.
 *
 * Cobertura obrigatória (MVP_SCOPE.md §8): signup/login + criação de inquiry.
 * Por ora, focamos no que pode rodar sem confirmação por email real:
 *   - Validação client-side do form de cadastro
 *   - Página pública /explorar (estado vazio + filtros)
 *   - Página pública /produto/[slug] e /fornecedor/[slug]
 *
 * Para testes que exigem sessão autenticada, popular `tests/.auth/` via
 * `globalSetup` quando tivermos conta de teste seedada no Supabase.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 13"] } },
  ],

  // Não inicia servidor próprio — assume que `npm run dev` já está rodando.
  // Para CI, montar pipeline que sobe o servidor antes (ex: `npm run build && npm run start`).
});
