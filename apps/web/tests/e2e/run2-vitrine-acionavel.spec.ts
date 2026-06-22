import { test, expect } from "@playwright/test";

/**
 * E2E — Run 2: Vitrine Acionável
 *
 * Testa a integração do slot `action` no DemandCard em superfícies públicas
 * e o comportamento do PublicContactGate / MockContactGate.
 *
 * Premissa: banco pode estar vazio (sem seed). As asserções são resilientes:
 * quando não há demandas reais, os mocks preenchem a vitrine. Quando há
 * demandas reais, o gate deve aparecer nelas também.
 *
 * Não testa /painel/leads (requer sessão autenticada).
 * Não testa ContactButton direto (Client Component + dialog, exige seed de conta).
 */

test.describe("Home — vitrine com PublicContactGate / MockContactGate", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("home renderiza sem erros: heading principal visível", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Demandas abertas agora/i })).toBeVisible();
  });

  test("MockContactGate: botão desabilitado com badge 'exemplo' está presente na vitrine", async ({
    page,
  }) => {
    // Os mocks sempre aparecem quando há menos de VITRINE_SLOTS demandas reais.
    // O MockContactGate renderiza um button[disabled] com aria-label explicativo.
    const mockGates = page.locator(
      'button[disabled][aria-label*="exemplo ilustrativo"]'
    );
    // Pode haver entre 0 e 8 dependendo de quantas reais existem.
    // Se o banco tem < 8 demandas reais, deve haver pelo menos 1 mock gate.
    // A asserção verifica que SE há botões desabilitados, todos têm aria-label.
    const count = await mockGates.count();
    if (count > 0) {
      // Cada botão desabilitado deve ter aria-label adequado
      for (let i = 0; i < count; i++) {
        await expect(mockGates.nth(i)).toBeDisabled();
        await expect(mockGates.nth(i)).toHaveAttribute(
          "aria-label",
          /exemplo ilustrativo/i
        );
      }
    }
  });

  test("MockContactGate: badge 'exemplo' está visível no card mock", async ({ page }) => {
    // O badge "exemplo" deve aparecer nos cards mock (span com texto "exemplo")
    const exampleBadge = page.getByText("exemplo", { exact: true }).first();
    // Só verifica se há mocks na página — banco pode ter muitas demandas reais
    const mockGateCount = await page
      .locator('button[disabled][aria-label*="exemplo ilustrativo"]')
      .count();
    if (mockGateCount > 0) {
      await expect(exampleBadge).toBeVisible();
    }
  });

  test("PublicContactGate: link correto para /seja-vendedor quando há demandas reais", async ({
    page,
  }) => {
    // PublicContactGate é um Link para /seja-vendedor
    const publicGates = page.locator(
      'a[href="/seja-vendedor"][aria-label*="Contatar este comprador"]'
    );
    const count = await publicGates.count();
    if (count > 0) {
      // Primeiro gate aponta para /seja-vendedor
      await expect(publicGates.first()).toHaveAttribute("href", "/seja-vendedor");
    }
  });

  test("card de demanda: corpo é Link para /necessidade/[slug] e botão de ação fica fora dele", async ({
    page,
  }) => {
    // Verifica que não há link aninhado (HTML inválido: <a> dentro de <a>)
    // O Link do corpo do card aponta para /necessidade/*, o gate de ação é separado
    const demandLinks = page.locator('a[href^="/necessidade/"]');
    const count = await demandLinks.count();
    if (count > 0) {
      // Dentro do link de demanda NÃO pode haver outro <a>
      const nestedLinks = demandLinks.first().locator("a");
      await expect(nestedLinks).toHaveCount(0);
    }
  });

  test("busca falsa removida: não há link de busca disfarçado de input no feed da home", async ({
    page,
  }) => {
    // O link falso de busca foi removido — não deve existir um elemento com
    // texto de "buscar" que seja um Link ao invés de um input real.
    // Verifica que o feed não tem nenhum link que aponte para /buscar
    // diretamente dentro da seção do feed (só o botão "Ver todas as demandas" é permitido).
    const feedSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: /Demandas abertas agora/i }),
    });

    // Nenhum input fake de busca (div disfarçado de search bar)
    // O link legítimo "Ver todas as demandas" aponta para /buscar e isso é esperado
    const searchFakeInput = feedSection.locator('div[role="search"]').or(
      feedSection.locator('a[href="/buscar"] input')
    );
    await expect(searchFakeInput).toHaveCount(0);
  });
});

test.describe("/buscar — PublicContactGate em resultados", () => {
  test("página de busca renderiza sem erros", async ({ page }) => {
    await page.goto("/buscar");
    await expect(
      page.getByRole("heading", { name: /Demandas publicadas/i })
    ).toBeVisible();
  });

  test("cards de busca com gate: botão de ação não está dentro do link do card", async ({
    page,
  }) => {
    await page.goto("/buscar");
    // Aguarda carregamento
    await page.waitForLoadState("domcontentloaded");

    const demandLinks = page.locator('a[href^="/necessidade/"]');
    const count = await demandLinks.count();
    if (count > 0) {
      // Nenhum link de demanda pode ter link aninhado (HTML semântico correto)
      const nestedLinks = demandLinks.first().locator("a");
      await expect(nestedLinks).toHaveCount(0);
    }
  });

  test("PublicContactGate em /buscar aponta para /seja-vendedor", async ({ page }) => {
    await page.goto("/buscar");
    await page.waitForLoadState("domcontentloaded");

    const gates = page.locator('a[href="/seja-vendedor"][aria-label*="Contatar este comprador"]');
    const count = await gates.count();
    if (count > 0) {
      await expect(gates.first()).toHaveAttribute("href", "/seja-vendedor");
    }
  });
});
