import { test, expect } from "@playwright/test";

/**
 * Cobertura mínima do fluxo público de descoberta — coração do MVP.
 *
 * Comportamento atual da busca (sessão 2026-04-26):
 *  - Digitar NÃO dispara busca. Só abre o dropdown de autocomplete.
 *  - Enter (ou clique numa sugestão) submete a query e dispara `/api/search`.
 *  - localStorage `girob2b_recent_searches` persiste históricos (max 5, mín 2 chars).
 *
 * Inquiry em si exige sessão — fica para um spec separado quando tivermos
 * seed de conta no Supabase de staging.
 */
test.describe("/explorar — estado público", () => {
  test.beforeEach(async ({ page }) => {
    // Histórico de buscas e proposals limpos pra cada test (evita flakiness).
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("girob2b_recent_searches");
        localStorage.removeItem("girob2b_pending_proposal");
        localStorage.removeItem("girob2b_pending_need");
      } catch { /* ignore */ }
    });
  });

  test("renderiza header, busca e cards de sugestão quando não há query", async ({ page }) => {
    await page.goto("/explorar");
    await expect(page.getByRole("heading", { name: "Explorar", exact: true })).toBeVisible();
    await expect(page.getByPlaceholder(/Buscar produtos/)).toBeVisible();
    // Cards de "Ideias para começar" (recent-needs-suggestions)
    await expect(page.getByText(/Ideias para come[çc]ar|Cota[çc][õo]es recentes/i)).toBeVisible();
  });

  test("focar input abre dropdown de autocomplete com sugestões populares", async ({ page }) => {
    await page.goto("/explorar");
    await page.getByPlaceholder(/Buscar produtos/).focus();
    await expect(page.getByText(/^Populares$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Embalagens pl[áa]sticas/i })).toBeVisible();
  });

  test("digitar SEM Enter NÃO dispara busca (filtra dropdown apenas)", async ({ page }) => {
    await page.goto("/explorar");
    const input = page.getByPlaceholder(/Buscar produtos/);
    await input.fill("Embalagens");
    await expect(page.getByRole("button", { name: /Embalagens pl[áa]sticas/i })).toBeVisible();
    // Página NÃO entrou em estado de resultado/empty — ainda está no idle.
    await expect(page.getByText(/Nenhum fornecedor encontrado/i)).not.toBeVisible();
  });

  test("Enter dispara busca e mostra empty state quando query não retorna nada", async ({ page }) => {
    await page.goto("/explorar");
    const input = page.getByPlaceholder(/Buscar produtos/);
    await input.fill("xyzzy-no-match-12345");
    await input.press("Enter");
    await expect(page.getByText(/Nenhum fornecedor encontrado/i)).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /Adicionar [àa] lista de necessidades/i })
    ).toBeVisible();
  });

  test("clicar em sugestão Popular submete a busca diretamente", async ({ page }) => {
    await page.goto("/explorar");
    await page.getByPlaceholder(/Buscar produtos/).focus();
    await page.getByRole("button", { name: /Embalagens pl[áa]sticas/i }).click();
    await expect(page.getByPlaceholder(/Buscar produtos/)).toHaveValue(/Embalagens pl[áa]sticas/);
    await expect(page.getByText(/\d+ resultados?/i)).toBeVisible({ timeout: 10_000 });
  });

  test("Esc fecha o dropdown de autocomplete", async ({ page }) => {
    await page.goto("/explorar");
    await page.getByPlaceholder(/Buscar produtos/).focus();
    await expect(page.getByText(/^Populares$/i)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText(/^Populares$/i)).not.toBeVisible();
  });

  test("clicar em sugestão Recent reusa a query (histórico pré-populado)", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("girob2b_recent_searches", JSON.stringify(["Parafusos"]));
    });
    await page.goto("/explorar");
    await page.getByPlaceholder(/Buscar produtos/).focus();
    await expect(page.getByText(/^Pesquisas anteriores$/i)).toBeVisible();
    await page.getByRole("button", { name: /^Parafusos$/i }).click();
    await expect(page.getByPlaceholder(/Buscar produtos/)).toHaveValue("Parafusos");
  });
});

test.describe("/produto/[slug] — rota legada (redirect pós-pivot)", () => {
  // O catálogo de produto foi removido no pivot 2026-05-07. A rota agora é
  // redirect 308: → /fornecedor/<slug> se o produto existir, senão → /buscar.
  // Specs seed-resilientes: não dependem de um slug específico do banco.
  const SLUG = "parafuso-m8-inox-25mm-sextavado";

  test("nunca renderiza a página de produto — sempre redireciona pra fora de /produto", async ({ page }) => {
    await page.goto(`/produto/${SLUG}`);
    await expect(page).not.toHaveURL(/\/produto\//);
    await expect(page).toHaveURL(/\/(fornecedor|buscar)/);
    // a CTA pré-pivot não pode mais existir em lugar nenhum
    await expect(page.getByRole("button", { name: /Pedir cota[çc][ãa]o/i })).toHaveCount(0);
  });

  test("slug inexistente cai em /buscar", async ({ page }) => {
    await page.goto(`/produto/slug-que-definitivamente-nao-existe-${Date.now()}`);
    await expect(page).toHaveURL(/\/buscar/);
  });
});

test.describe("/fornecedor/[slug] — página pública (não pode ficar vazia)", () => {
  const SLUG = "vitor-de-souza-barreto-";

  test("mesmo com layout legado/desabilitado, hero e contato sempre aparecem", async ({ page }) => {
    await page.goto(`/fornecedor/${SLUG}`);
    await expect(page.getByRole("heading", { name: /Vitor de Souza Barreto/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Contato$/ })).toBeVisible();
  });

  test("emite JSON-LD com schema Organization (RF-05.08)", async ({ page }) => {
    await page.goto(`/fornecedor/${SLUG}`);
    const ldScripts = page.locator('script[type="application/ld+json"]');
    await expect(ldScripts.first()).toBeAttached();
    const payload = await ldScripts.first().textContent();
    expect(payload).toBeTruthy();
    const json = JSON.parse(payload!);
    const items = Array.isArray(json["@graph"]) ? json["@graph"] : [json];
    const types = items.map((i: { "@type"?: string }) => i["@type"]);
    expect(types).toContain("Organization");
    expect(types).toContain("BreadcrumbList");
  });
});

// [PIVOT 2026-05-07] Suíte do /painel/comparador removida junto com a feature.
