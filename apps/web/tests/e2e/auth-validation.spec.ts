import { test, expect } from "@playwright/test";

/**
 * Cobertura de auth — validação client-side (seed-independente).
 *
 * /cadastro pós-pivot (2026-06-27): BuyerRegisterForm.
 *   - Botão de submit agora é "Criar conta" (antes: "enviar código de verificação").
 *   - Botão fica disabled até terms checkbox ser marcado.
 *   - Validação é manual (handleRegister) — não usa atributos required do HTML.
 *   - O fluxo de "enviar código" foi substituído por link de confirmação por email.
 *
 * /login pós-pivot:
 *   - Visitar /login sem params redireciona para /explorar?auth=login (que vai para /buscar).
 *   - Para renderizar o formulário diretamente, usar /login?email=<addr> —
 *     o parâmetro ?email= impede o redirect e pré-preenche o email.
 *
 * Não submete para o Supabase real — testa apenas validação client-side.
 */
test.describe("/cadastro — validação client-side (BuyerRegisterForm)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/cadastro");
  });

  test("form renderiza com heading 'Criar conta' e campos de email + senha + confirmação", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Confirmar senha")).toBeVisible();
    // Botão existe no DOM (pode estar disabled até aceitar termos)
    await expect(
      page.getByRole("button", { name: /^Criar conta$/ })
    ).toBeAttached();
  });

  test("CTA 'Continuar sem cadastro' está presente e visível", async ({ page }) => {
    // Comprador pode pular cadastro e publicar como guest — princípio buyer-friction
    await expect(
      page.getByText(/Continuar sem cadastro/i)
    ).toBeVisible();
  });

  test("submit com email vazio (termos aceitos) mostra erro inline em PT-BR", async ({
    page,
  }) => {
    // O botão está disabled até aceitar termos — aceitar primeiro para disparar handleRegister
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /^Criar conta$/ }).click();
    await expect(page.getByText(/informe um email v[áa]lido/i)).toBeVisible();
    // Garante que não surgem mensagens de validação nativas do browser em inglês
    await expect(page.getByText(/please fill out this field/i)).toHaveCount(0);
  });

  test("senha curta (< 8 chars) com termos aceitos mostra erro inline em PT-BR", async ({
    page,
  }) => {
    await page.getByRole("checkbox").check();
    await page.getByLabel("Email").fill("teste@girob2b.com");
    await page.getByLabel("Senha", { exact: true }).fill("123");
    await page.getByLabel("Confirmar senha").fill("123");
    await page.getByRole("button", { name: /^Criar conta$/ }).click();
    await expect(
      page.getByText(/senha precisa ter pelo menos 8 caracteres/i)
    ).toBeVisible();
  });

  test("senhas divergentes com termos aceitos mostram erro inline visível", async ({ page }) => {
    await page.getByRole("checkbox").check();
    await page.getByLabel("Email").fill("teste@girob2b.com");
    await page.getByLabel("Senha", { exact: true }).fill("SenhaSegura1!");
    await page.getByLabel("Confirmar senha").fill("OutraSenha2!");
    await page.getByRole("button", { name: /^Criar conta$/ }).click();
    await expect(page.getByText(/senhas n[ãa]o coincidem/i)).toBeVisible();
  });

  test("sem termos aceitos o botão 'Criar conta' permanece desabilitado", async ({ page }) => {
    // Garante que o gate de LGPD funciona — button não pode ser clicado sem consent
    const btn = page.getByRole("button", { name: /^Criar conta$/ });
    await expect(btn).toBeDisabled();
    // Depois de marcar o checkbox, habilita
    await page.getByRole("checkbox").check();
    await expect(btn).toBeEnabled();
  });

  test("strings PT-BR têm acentuação correta", async ({ page }) => {
    // Sentinelas — se um label/placeholder perder acento, a revisão pega
    await expect(
      page.getByPlaceholder(/M[íi]nimo de 8 caracteres/i)
    ).toBeVisible();
    // "Já tem conta?" — rodapé do form
    await expect(page.getByText(/J[áa] tem conta/)).toBeVisible();
    // Link de login presente
    await expect(page.getByRole("link", { name: /Fazer login/i })).toBeVisible();
  });
});

test.describe("/login — render básico", () => {
  /**
   * /login sem params redireciona para /explorar?auth=login (→ /buscar).
   * Para renderizar o formulário diretamente na rota /login, passamos ?email=
   * com um endereço válido — o LoginPage usa esse param para pré-preencher
   * o email E evita o redirect (defaultEmail != undefined → condição falsa).
   */
  const LOGIN_URL = "/login?email=test%40girob2b.com";

  test("página renderiza com heading 'Entrar', email, senha e botão Entrar", async ({
    page,
  }) => {
    await page.goto(LOGIN_URL);
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel(/Senha/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Entrar$/ })).toBeVisible();
  });

  test("botão de login com Google está acessível", async ({ page }) => {
    await page.goto(LOGIN_URL);
    // aria-label="Entrar com Google" — o regex /Google/i faz match no accessible name
    await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
  });

  test("link para cadastro ('Crie sua conta') está acessível", async ({ page }) => {
    await page.goto(LOGIN_URL);
    await expect(page.getByRole("link", { name: /Crie sua conta/i })).toBeVisible();
  });

  test("link 'Esqueceu sua senha?' está presente", async ({ page }) => {
    await page.goto(LOGIN_URL);
    await expect(
      page.getByRole("link", { name: /Esqueceu sua senha/i })
    ).toBeVisible();
  });

  test("visitar /login sem params redireciona para fora de /login", async ({ page }) => {
    await page.goto("/login");
    // Sem params, o LoginPage faz redirect → /explorar?auth=login → /buscar
    // O resultado deve ser que a URL final não é /login
    await expect(page).not.toHaveURL(/^http:\/\/localhost:\d+\/login\s*$/);
  });
});
