import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — testes E2E do MVP pós-pivot (2026-06-27).
 *
 * Cobertura atual (seed-independente):
 *   - Validação client-side do form de cadastro (/cadastro)
 *   - Login form render (/login?email=... para bypassar redirect)
 *   - Página pública de descoberta /buscar (estrutural + redirect de /explorar)
 *   - Redirects legados: /produto/[slug] → /fornecedor | /buscar
 *   - Fornecedor not-found seed-independente
 *   - Home: vitrine pública com PublicContactGate
 *   - SEO: sitemap.xml + robots.txt
 *
 * Specs que exigem sessão autenticada (seed de conta):
 *   - /painel/* — aguardando globalSetup com conta de teste seedada
 *
 * webServer: sobe o Next.js em modo dev antes de rodar os specs.
 *   - Local: reuseExistingServer=true (aproveita o `pnpm dev` já rodando na 3000)
 *   - CI: reuseExistingServer=false (fresh start — env vars injetadas pelo job)
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
    // Porta 3001 reservada para e2e (3000 pode estar ocupada por outros serviços locais).
    // Em CI, E2E_BASE_URL não é definida → usa 3001 (consistente com webServer abaixo).
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // mobile-safari requer webkit (não instalado no CI — omitido por padrão).
    // Para rodar localmente: `pnpm --filter @girob2b/web exec playwright install webkit`
    // { name: "mobile-safari", use: { ...devices["iPhone 13"] } },
  ],

  /**
   * webServer — sobe o app antes de rodar qualquer spec.
   *
   * Usa `next dev` (sem build prévio): mais rápido para o conjunto atual de
   * specs seed-independentes. O Next lê .env.local automaticamente em dev;
   * no CI, as vars vêm dos env: do step (ver .github/workflows/ci.yml job e2e).
   *
   * timeout: 120s — suficiente para a compilação inicial do Next 16 em cold start.
   */
  webServer: {
    // Porta 3001 reservada para e2e — evita conflito com outros serviços locais na 3000.
    // Em CI não há conflito, mas manter 3001 para consistência local↔CI.
    command: "pnpm dev -p 3001",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
