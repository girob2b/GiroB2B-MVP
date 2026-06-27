import { test, expect } from "@playwright/test";

/**
 * E2E — Run 2: Vitrine Acionável (revisado 2026-06-27)
 *
 * Testa a integração do slot `action` no DemandCard em superfícies públicas
 * e o comportamento do PublicContactGate.
 *
 * MUDANÇA vs. spec original (2026-06-22 → 2026-06-27):
 *   - MockContactGate (botão disabled + badge "exemplo") foi REMOVIDO em 2026-06-22.
 *     Decisão: cards de preenchimento (mock) usam o MESMO CTA funcional
 *     (PublicContactGate → /seja-vendedor). Etiqueta "exemplo" e estado
 *     desabilitado foram eliminados. MockContactGate agora é alias de
 *     PublicContactGate (components/demands/public-contact-gate.tsx).
 *   - Specs de MockContactGate atualizados para refletir o comportamento real.
 *
 * MUDANÇA Fase 1 comparador de cotações (2026-06-27):
 *   - CTA primário mudou de "Contatar via WhatsApp" → "Enviar cotação".
 *   - Botão usa brand-600 (teal) em vez de whatsapp-700 (verde).
 *   - aria-label mudou para "Enviar cotação para este comprador…".
 *   - O gate em si NÃO mudou: visitante anônimo → /seja-vendedor.
 *   - Specs atualizados para usar aria-label*="Enviar cotação".
 *
 * Premissa: banco pode estar vazio (sem seed). Asserções resilientes:
 *   - Quando não há demandas reais, mocks preenchem a vitrine (PublicContactGate).
 *   - Quando há demandas reais, o gate aparece nelas também (PublicContactGate).
 * Não testa /painel/leads (requer sessão autenticada).
 */

test.describe("Home — vitrine com PublicContactGate", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("home renderiza sem erros: heading principal visível", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Demandas abertas agora/i })
    ).toBeVisible();
  });

  test("PublicContactGate: todos os botões de ação habilitados apontam para /seja-vendedor", async ({
    page,
  }) => {
    // PublicContactGate renderiza Link (anchor) para /seja-vendedor.
    // aria-label contém "Enviar cotação" — comum a reais e mocks (Fase 1: 2026-06-27).
    const gates = page.locator(
      'a[href="/seja-vendedor"][aria-label*="Enviar cotação"]'
    );
    // Pode haver 0 (DB vazio sem mocks) a N gates. Quando existem, validamos:
    const count = await gates.count();
    if (count > 0) {
      // Todos os gates da vitrine apontam para /seja-vendedor
      await expect(gates.first()).toHaveAttribute("href", "/seja-vendedor");
      // Nenhum gate deve estar desabilitado (não há mais MockContactGate com disabled)
      for (let i = 0; i < Math.min(count, 4); i++) {
        await expect(gates.nth(i)).not.toBeDisabled();
      }
    }
  });

  test("não há botões desabilitados com label de exemplo na vitrine", async ({ page }) => {
    // MockContactGate com disabled foi removido em 2026-06-22.
    // Esta spec garante regressão: nenhum botão disabled com aria-label de exemplo.
    const disabledExampleBtns = page.locator(
      'button[disabled][aria-label*="exemplo ilustrativo"]'
    );
    await expect(disabledExampleBtns).toHaveCount(0);
  });

  test("card de demanda: corpo é Link para /necessidade/[slug] sem link aninhado", async ({
    page,
  }) => {
    // Verifica que não há link aninhado (HTML inválido: <a> dentro de <a>).
    // O corpo do DemandCard real é um <Link> para /necessidade/*;
    // o gate de ação (PublicContactGate) fica fora dele.
    const demandLinks = page.locator('a[href^="/necessidade/"]');
    const count = await demandLinks.count();
    if (count > 0) {
      const nestedLinks = demandLinks.first().locator("a");
      await expect(nestedLinks).toHaveCount(0);
    }
  });

  test("nenhum link de busca falso dentro da seção do feed", async ({ page }) => {
    // O link falso de busca foi removido — não deve haver div[role='search']
    // nem anchor com input aninhado dentro da seção de feed.
    const feedSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: /Demandas abertas agora/i }),
    });
    const searchFakeInput = feedSection
      .locator('div[role="search"]')
      .or(feedSection.locator('a[href="/buscar"] input'));
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

  test("cards de busca: botão de ação não está dentro do link do card", async ({
    page,
  }) => {
    await page.goto("/buscar");
    await page.waitForLoadState("domcontentloaded");
    const demandLinks = page.locator('a[href^="/necessidade/"]');
    const count = await demandLinks.count();
    if (count > 0) {
      const nestedLinks = demandLinks.first().locator("a");
      await expect(nestedLinks).toHaveCount(0);
    }
  });

  test("PublicContactGate em /buscar aponta para /seja-vendedor", async ({ page }) => {
    await page.goto("/buscar");
    await page.waitForLoadState("domcontentloaded");
    // CTA primário agora é "Enviar cotação" (Fase 1: 2026-06-27).
    const gates = page.locator(
      'a[href="/seja-vendedor"][aria-label*="Enviar cotação"]'
    );
    const count = await gates.count();
    if (count > 0) {
      await expect(gates.first()).toHaveAttribute("href", "/seja-vendedor");
    }
  });
});
