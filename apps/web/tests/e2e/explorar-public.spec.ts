import { test, expect } from "@playwright/test";

/**
 * Cobertura do fluxo público de descoberta — pós-pivot (2026-06-27).
 *
 * HISTÓRICO DE STALENESS (2026-06-21 → 2026-06-27):
 *   - A rota /explorar foi substituída por /buscar após o pivot 2026-05-07.
 *     /explorar hoje faz redirect 307 para /buscar.
 *   - O antigo UI de /explorar (autocomplete "Populares", dropdown de sugestões,
 *     placeholder "Buscar produtos") foi completamente removido.
 *   - A rota /fornecedor/[slug] existe mas é seed-dependent — substituída por
 *     teste de not-found seed-independente.
 *   - Specs reescritos em 2026-06-27 para refletir a UI atual.
 *
 * Seed-independente: nenhum spec depende de um slug ou email específico no banco.
 * Specs autenticados (/painel/*) aguardam globalSetup com conta seedada.
 */

// ─── /buscar — descoberta pública de demandas ───────────────────────────────

test.describe("/buscar — estrutura e acessibilidade", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/buscar");
  });

  test("renderiza heading 'Demandas publicadas' e formulário de busca", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Demandas publicadas/i })
    ).toBeVisible();
    // Input de busca principal
    await expect(
      page.getByPlaceholder(/Buscar por título/i)
    ).toBeVisible();
    // Botão de submit do formulário de filtro (dentro do <main>)
    // Há um segundo botão "Buscar" no header-search — usamos o de dentro do main
    await expect(
      page.getByRole("main").getByRole("button", { name: /^Buscar$/ })
    ).toBeVisible();
  });

  test("controles de filtro: categoria, UF e tipo de demanda estão acessíveis", async ({
    page,
  }) => {
    await expect(page.getByRole("combobox", { name: /Categoria/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /Estado/i })).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: /Tipo de demanda/i })
    ).toBeVisible();
  });

  test("contador de demandas está presente (aria-live='polite')", async ({ page }) => {
    // Contador "N demandas encontradas" — aparece sempre (0 ou mais).
    // Há outro aria-live='polite' no sistema de notificações (Sonner) —
    // usamos o <p> específico do contador de resultados.
    const counter = page.locator('p[aria-live="polite"]');
    await expect(counter).toBeVisible({ timeout: 10_000 });
    // Texto começa com um número
    await expect(counter).toHaveText(/^\d+ demanda/i, { timeout: 10_000 });
  });

  test("busca por termo inexistente exibe 'Nada encontrado'", async ({ page }) => {
    await page.goto(`/buscar?q=xyzzy-nao-existe-girob2b-${Date.now()}`);
    await expect(page.getByText(/Nada encontrado/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText(/Tente outra categoria/i)
    ).toBeVisible();
  });

  test("busca por query preserva o valor no input", async ({ page }) => {
    const term = "embalagens";
    await page.goto(`/buscar?q=${term}`);
    const input = page.getByPlaceholder(/Buscar por título/i);
    await expect(input).toHaveValue(term, { timeout: 5_000 });
  });
});

// ─── /explorar — redirect legado ────────────────────────────────────────────

test.describe("/explorar — rota legada (redirect pós-pivot)", () => {
  // /explorar foi pivot 2026-05-07: hoje redireciona para /buscar.
  // Specs seed-resilientes: não testam conteúdo, só o comportamento de redirect.

  test("redireciona para /buscar e exibe heading 'Demandas publicadas'", async ({ page }) => {
    await page.goto("/explorar");
    await expect(page).toHaveURL(/\/buscar/);
    await expect(
      page.getByRole("heading", { name: /Demandas publicadas/i })
    ).toBeVisible();
  });

  test("nunca renderiza o heading 'Explorar' da UI pré-pivot", async ({ page }) => {
    await page.goto("/explorar");
    // UI antiga tinha heading exato "Explorar" — não deve mais aparecer
    await expect(
      page.getByRole("heading", { name: "Explorar", exact: true })
    ).not.toBeVisible();
  });
});

// ─── /produto/[slug] — redirect legado ──────────────────────────────────────

test.describe("/produto/[slug] — rota legada (redirect pós-pivot)", () => {
  // O catálogo de produto foi removido no pivot 2026-05-07. A rota agora é
  // redirect 308: → /fornecedor/<slug> se o produto existir, senão → /buscar.
  // Specs seed-resilientes: não dependem de um slug específico do banco.
  const SLUG = "parafuso-m8-inox-25mm-sextavado";

  test("nunca renderiza a página de produto — sempre redireciona para fora de /produto", async ({
    page,
  }) => {
    await page.goto(`/produto/${SLUG}`);
    await expect(page).not.toHaveURL(/\/produto\//);
    await expect(page).toHaveURL(/\/(fornecedor|buscar)/);
    // CTA pré-pivot não pode mais existir
    await expect(
      page.getByRole("button", { name: /Pedir cota[çc][ãa]o/i })
    ).toHaveCount(0);
  });

  test("slug inexistente cai em /buscar", async ({ page }) => {
    await page.goto(`/produto/slug-que-definitivamente-nao-existe-${Date.now()}`);
    await expect(page).toHaveURL(/\/buscar/);
  });
});

// ─── /fornecedor/[slug] — página pública ────────────────────────────────────

test.describe("/fornecedor/[slug] — rota pública", () => {
  // Slug real depende de seed — testamos apenas o comportamento de not-found,
  // que é seed-independente (qualquer slug inexistente aciona o not-found.tsx).

  test("slug inexistente renderiza not-found com 'Vendedor não encontrado'", async ({
    page,
  }) => {
    await page.goto(
      `/fornecedor/slug-que-definitivamente-nao-existe-${Date.now()}`
    );
    // not-found.tsx de /fornecedor/[slug] exibe este heading
    await expect(
      page.getByRole("heading", { name: /Vendedor não encontrado/i })
    ).toBeVisible({ timeout: 10_000 });
    // Link de retorno para /buscar
    await expect(
      page.getByRole("link", { name: /Ver demandas/i })
    ).toBeVisible();
  });
});
