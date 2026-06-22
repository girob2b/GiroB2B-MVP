import type { MetadataRoute } from "next";

/**
 * Robots policy.
 * Indexáveis no modelo pós-pivot (2026-05-07): feed de demandas (/buscar),
 * detalhe da demanda (/necessidade/[slug]), categorias (/categoria/[slug])
 * e perfil do fornecedor (/fornecedor/[slug]).
 * /explorar e /produto/ são rotas legadas que hoje redirecionam — mantidas no
 * allow porque o redirect é inofensivo (e a suíte SEO ainda checa /produto/).
 * Bloqueia áreas autenticadas, callbacks de auth e endpoints internos.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://girob2b.com.br";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/buscar",
          "/necessidade/",
          "/categoria/",
          "/fornecedor/",
          "/explorar",
          "/produto/",
          "/termos",
          "/privacidade",
          "/faq",
        ],
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
