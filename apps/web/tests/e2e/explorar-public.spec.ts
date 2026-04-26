import { test, expect } from "@playwright/test";

/**
 * Cobertura mínima do fluxo público de descoberta — coração do MVP.
 *
 * O coração do MVP é "buyer encontra fornecedor → envia inquiry". Os primeiros
 * passos (descoberta) precisam funcionar mesmo sem login. Inquiry em si exige
 * sessão — fica para um spec separado quando tivermos seed de conta.
 */
test.describe("/explorar — estado público", () => {
  test("renderiza header, busca e cards de sugestão quando não há query", async ({ page }) => {
    await page.goto("/explorar");
    await expect(page.getByRole("heading", { name: "Explorar", exact: true })).toBeVisible();
    await expect(page.getByPlaceholder(/Buscar produtos/)).toBeVisible();
    // Cards de "Ideias para começar" (recent-needs-suggestions)
    await expect(page.getByText(/Ideias para come[çc]ar|Cota[çc][õo]es recentes/i)).toBeVisible();
  });

  test("clicar em sugestão preenche a busca e dispara filtro", async ({ page }) => {
    await page.goto("/explorar");
    const card = page.getByRole("button", { name: /Embalagens de papel[ãa]o kraft/i }).first();
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByPlaceholder(/Buscar produtos/)).toHaveValue(/Embalagens de papel[ãa]o kraft/);
  });

  test("query sem resultado mostra empty state com CTA pra Necessidades", async ({ page }) => {
    await page.goto("/explorar");
    await page.getByPlaceholder(/Buscar produtos/).fill("xyzzy-no-match-12345");
    // Aguarda debounce + fetch
    await expect(page.getByText(/Nenhum fornecedor encontrado/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /Adicionar [àa] lista de necessidades/i })).toBeVisible();
  });
});

test.describe("/produto/[slug] — página pública", () => {
  // Slug do banco de teste — se quebrar, atualizar manualmente
  const SLUG = "parafuso-m8-inox-25mm-sextavado";

  test("renderiza nome do produto e CTAs", async ({ page }) => {
    await page.goto(`/produto/${SLUG}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /Pedir cota[çc][ãa]o/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ver fornecedor/i })).toBeVisible();
  });

  test("breadcrumb tem link de volta para /explorar", async ({ page }) => {
    await page.goto(`/produto/${SLUG}`);
    await expect(page.getByRole("link", { name: /^Explorar$/ })).toBeVisible();
  });
});

test.describe("/fornecedor/[slug] — página pública (não pode ficar vazia)", () => {
  const SLUG = "vitor-de-souza-barreto-";

  test("mesmo com layout legado/desabilitado, hero e contato sempre aparecem", async ({ page }) => {
    await page.goto(`/fornecedor/${SLUG}`);
    // Hero — nome do fornecedor
    await expect(page.getByRole("heading", { name: /Vitor de Souza Barreto/i })).toBeVisible();
    // Contato — bloco "Contato" sempre presente
    await expect(page.getByRole("heading", { name: /^Contato$/ })).toBeVisible();
  });
});

test.describe("/painel/comparador — feature gated, deve redirecionar", () => {
  test("acesso direto cai em /painel (auth não requerido neste teste — sem sessão vai pro login)", async ({ page }) => {
    const response = await page.goto("/painel/comparador");
    // Sem sessão, vira /login. Com sessão (futuramente), iria pra /painel.
    // Em ambos os casos, NÃO deve renderizar o mockup do comparador.
    await expect(page).not.toHaveURL(/\/painel\/comparador$/);
    expect(response?.status()).toBeLessThan(500);
  });
});
