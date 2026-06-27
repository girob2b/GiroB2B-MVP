import { test, expect } from "@playwright/test";

/**
 * E2E — Comparador de Cotações (Fase 2a, feat/comparador-cotacoes, 2026-06-27).
 *
 * Todos os specs são seed-independentes: não dependem de dados específicos no
 * banco nem de sessão autenticada.
 *
 * Comportamento de redirect observado (banco de prod, anon session Supabase):
 *   - Usuário anônimo em /painel/* pode ter uma anon session no Supabase.
 *   - A SSR do painel redireciona para fora de /painel/* quando não há perfil
 *     de buyer/supplier (ex: /buscar) — nunca exibe conteúdo privado.
 *   - Por isso os specs abaixo testam "sai do painel" (not.toHaveURL) em vez
 *     de testar a URL de destino específica (/login vs /buscar).
 *
 * Cobertura:
 *   - A rota /painel/necessidades/ofertas/comparar/[demandId] redireciona
 *     para fora do painel quando não há sessão com perfil.
 *   - A rota /painel/necessidades/ofertas redireciona quando não autenticado.
 *   - A rota /painel/perfil redireciona quando não autenticado.
 *   - O endpoint /api/buyer/comparator/[demandId] retorna 401 sem sessão válida.
 *
 * Specs autenticados (conteúdo real do comparador e do formulário de prefs)
 * aguardam globalSetup com conta de teste seedada.
 */

// ── Comparador — rota protegida ───────────────────────────────────────────────

test.describe("Comparador de cotações — rota protegida", () => {
  test("GET /painel/necessidades/ofertas/comparar/[id] não permanece no painel sem perfil", async ({
    page,
  }) => {
    // UUID fictício — sem sessão autenticada com perfil, redireciona para fora
    await page.goto(
      "/painel/necessidades/ofertas/comparar/00000000-0000-0000-0000-000000000000"
    );
    // O app redireciona para fora do painel (para /login, /buscar ou similar)
    await expect(page).not.toHaveURL(
      /\/painel\/necessidades\/ofertas\/comparar/,
      { timeout: 10_000 }
    );
  });

  test("GET /painel/necessidades/ofertas não renderiza inbox sem perfil", async ({
    page,
  }) => {
    await page.goto("/painel/necessidades/ofertas");
    // O heading de conteúdo privado não deve aparecer — a página redireciona
    await expect(
      page.getByRole("heading", { name: /Ofertas recebidas/i })
    ).not.toBeVisible({ timeout: 10_000 });
    // E a URL não permanece na rota original
    await expect(page).not.toHaveURL(/\/painel\/necessidades\/ofertas$/, {
      timeout: 10_000,
    });
  });

  test("GET /painel/perfil não permanece no painel sem perfil", async ({
    page,
  }) => {
    await page.goto("/painel/perfil");
    // Sem perfil de buyer/supplier, o SSR redireciona para fora
    await expect(page).not.toHaveURL(/\/painel\/perfil/, {
      timeout: 10_000,
    });
  });
});

// ── /api/buyer/comparator — endpoint protegido ────────────────────────────────

test.describe("GET /api/buyer/comparator/[demandId] — sem auth com perfil", () => {
  /**
   * O Route Handler valida auth antes de chamar o service.
   * Sem sessão com usuário autenticado (anon Supabase retorna null user
   * na verificação de `getUser()`), deve retornar 401.
   *
   * Nota: em contexto Playwright (sem cookies), `getUser()` retorna null.
   */
  test("retorna 401 sem sessão válida", async ({ request }) => {
    const res = await request.get(
      "/api/buyer/comparator/00000000-0000-0000-0000-000000000000"
    );
    expect(res.status()).toBe(401);
    const body = (await res.json()) as { ok: boolean; reason?: string };
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("unauthenticated");
  });
});

// ── Home e /buscar — não afetados pelo comparador ────────────────────────────

test.describe("Superfícies públicas — não afetadas pela feature de comparador", () => {
  test("home ainda renderiza o feed de demandas", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Demandas abertas agora/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("/buscar ainda renderiza estrutura de descoberta", async ({ page }) => {
    await page.goto("/buscar");
    await expect(
      page.getByRole("heading", { name: /Demandas publicadas/i })
    ).toBeVisible({ timeout: 10_000 });
  });
});
