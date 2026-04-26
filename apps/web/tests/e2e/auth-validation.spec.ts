import { test, expect } from "@playwright/test";

/**
 * Cobertura mínima de cadastro (MVP_SCOPE.md §8).
 *
 * Não submete pra Supabase real — testa apenas a validação client-side
 * do form de cadastro de buyer (sem consumir rate-limit do auth).
 * Quando tivermos um email descartável + automação de inbox, expandir pra
 * testar o happy path completo até "Concluir cadastro".
 */
test.describe("/cadastro — validação client-side", () => {
  test.beforeEach(async ({ page }) => {
    // Limpa cookie consent pra estado inicial previsível
    await page.goto("/cadastro");
    await page.evaluate(() => localStorage.removeItem("girob2b.cookie-consent"));
    await page.reload();
  });

  test("form renderiza com campos email + senha + confirmação", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Confirmar senha")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /enviar c[óo]digo de verifica[çc][ãa]o/i })
    ).toBeVisible();
  });

  test("submit vazio mostra erro inline (sem mensagem em inglês do browser)", async ({ page }) => {
    await page.getByRole("button", { name: /enviar c[óo]digo de verifica[çc][ãa]o/i }).click();
    // Erro aparece inline — `.alert-error`
    await expect(page.getByText(/informe um email v[áa]lido/i)).toBeVisible();
    // Garante que NÃO surge tooltip do browser em inglês
    await expect(page.getByText(/please lengthen this text/i)).toHaveCount(0);
    await expect(page.getByText(/please fill out this field/i)).toHaveCount(0);
  });

  test("senha curta (<8) mostra erro inline em PT-BR", async ({ page }) => {
    await page.getByLabel("Email").fill("teste@girob2b.com");
    await page.getByLabel("Senha", { exact: true }).fill("123");
    await page.getByLabel("Confirmar senha").fill("123");
    await page.getByRole("button", { name: /enviar c[óo]digo de verifica[çc][ãa]o/i }).click();
    await expect(page.getByText(/senha precisa ter pelo menos 8 caracteres/i)).toBeVisible();
  });

  test("senhas divergentes mostram erro inline visível", async ({ page }) => {
    await page.getByLabel("Email").fill("teste@girob2b.com");
    await page.getByLabel("Senha", { exact: true }).fill("SenhaSegura1");
    await page.getByLabel("Confirmar senha").fill("OutraSenha2");
    await page.getByRole("button", { name: /enviar c[óo]digo de verifica[çc][ãa]o/i }).click();
    await expect(page.getByText(/senhas n[ãa]o coincidem/i)).toBeVisible();
  });

  test("strings PT-BR têm acentuação correta", async ({ page }) => {
    // Sentinelas — se o usuário-feito ficar sem acento, pega na revisão
    await expect(page.getByText("Mínimo de 8 caracteres", { exact: false })).toBeVisible();
    await expect(page.getByText(/c[óo]digo de confirma[çc][ãa]o/)).toBeVisible();
    await expect(page.getByText(/J[áa] tem conta/)).toBeVisible();
  });
});

test.describe("/login — render básico", () => {
  test("página renderiza com email, senha e botão Entrar", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel(/Senha/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Entrar$/ })).toBeVisible();
    // Provedores OAuth disponíveis
    await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
  });

  test("link para cadastro está acessível", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /Crie sua conta/i })).toBeVisible();
  });
});
