import { test, expect } from "@playwright/test";

/**
 * SEO técnico — sitemap.xml + robots.txt (RF-05.06).
 * Pré-condição pra Googlebot indexar Explorar pública / produto / fornecedor.
 */
test.describe("/sitemap.xml", () => {
  test("retorna XML válido com URLs públicas", async ({ request, baseURL }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBeTruthy();
    expect(res.headers()["content-type"]).toMatch(/xml/);

    const xml = await res.text();
    expect(xml).toContain("<urlset");
    expect(xml).toContain("</urlset>");

    // Páginas estáticas obrigatórias
    const expected = [`${baseURL ?? ""}/explorar`, `${baseURL ?? ""}/termos`, `${baseURL ?? ""}/privacidade`, `${baseURL ?? ""}/faq`];
    // baseURL pode ter trailing slash; garante busca por path mínimo se não casa direto
    for (const url of expected) {
      const path = new URL(url, "http://x").pathname;
      expect(xml).toMatch(new RegExp(path.replace(/[/]/g, "\\/")));
    }
  });

  test("não inclui rotas privadas", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    const xml = await res.text();
    expect(xml).not.toContain("/painel");
    expect(xml).not.toContain("/admin");
    expect(xml).not.toContain("/login");
    expect(xml).not.toContain("/cadastro");
    expect(xml).not.toContain("/auth/");
  });
});

test.describe("/robots.txt", () => {
  test("permite páginas públicas e bloqueia áreas autenticadas", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.ok()).toBeTruthy();
    const txt = await res.text();

    expect(txt).toMatch(/User-agent:\s*\*/i);
    expect(txt).toMatch(/Allow:\s*\/explorar/i);
    expect(txt).toMatch(/Allow:\s*\/produto\//i);
    expect(txt).toMatch(/Allow:\s*\/fornecedor\//i);

    expect(txt).toMatch(/Disallow:\s*\/painel/i);
    expect(txt).toMatch(/Disallow:\s*\/admin/i);
    expect(txt).toMatch(/Disallow:\s*\/login/i);
    expect(txt).toMatch(/Disallow:\s*\/cadastro/i);
    expect(txt).toMatch(/Disallow:\s*\/api/i);

    // Aponta para o sitemap
    expect(txt).toMatch(/Sitemap:\s*https?:\/\/.+\/sitemap\.xml/i);
  });
});
