import type { MetadataRoute } from "next";

/**
 * Robots policy.
 * Permite páginas públicas indexáveis (Explorar pública, /produto/[slug], /fornecedor/[slug]).
 * Bloqueia áreas autenticadas, callbacks de auth e endpoints internos.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://girob2b.com.br";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/explorar", "/produto/", "/fornecedor/", "/termos", "/privacidade", "/faq"],
        disallow: [
          "/painel/",
          "/admin/",
          "/onboarding",
          "/login",
          "/cadastro",
          "/recuperar-senha",
          "/redefinir-senha",
          "/auth/",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
