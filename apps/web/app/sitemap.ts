import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

/**
 * Sitemap dinâmico (RF-05.06).
 *
 * Gera URLs indexáveis a partir de Supabase:
 *  - Páginas estáticas (institucional + Explorar pública)
 *  - /fornecedor/[slug] — fornecedores ativos não-suspensos
 *  - /produto/[slug] — produtos ativos
 *
 * Regra anti-thin-content (RN-03.05/03.06): só listar fornecedor/produto que
 * tenham conteúdo mínimo. Combinações categoria×UF com <3 suppliers não geram
 * URL — quando essa view existir, plugar aqui.
 */
export const revalidate = 3600; // Regenera de hora em hora

const STATIC_ROUTES = [
  { path: "", priority: 1.0, changeFrequency: "daily" as const },
  { path: "/explorar", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/termos", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/privacidade", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/faq", priority: 0.5, changeFrequency: "monthly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://girob2b.com.br").replace(/\/$/, "");
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  // Carrega suppliers + products + categorias do Supabase. Se falhar (timeout,
  // rede), retorna só o estático — sitemap parcial é melhor que quebrado.
  let dynamicEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();

    const [suppliersRes, productsRes, categoriesRes] = await Promise.all([
      supabase
        .from("suppliers")
        .select("slug, updated_at")
        .eq("suspended", false)
        .not("slug", "is", null),
      supabase
        .from("products")
        .select("slug, updated_at")
        .eq("status", "active")
        .not("slug", "is", null),
      supabase
        .from("categories")
        .select("slug")
        .eq("active", true)
        .not("slug", "is", null),
    ]);

    const supplierEntries = (suppliersRes.data ?? []).map(
      (row: { slug: string; updated_at: string | null }) => ({
        url: `${baseUrl}/fornecedor/${row.slug}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })
    );

    const productEntries = (productsRes.data ?? []).map(
      (row: { slug: string; updated_at: string | null }) => ({
        url: `${baseUrl}/produto/${row.slug}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })
    );

    // /explorar/[categoria] — RSC ISR programático (RF-05.02).
    // Listamos todas as categorias ativas; a própria page filtra com 404
    // quando count < 3 (anti thin content). O custo de 1-2 URLs vazias no
    // sitemap é menor do que rodar N counts no build.
    const categoryEntries = (categoriesRes.data ?? []).map(
      (row: { slug: string }) => ({
        url: `${baseUrl}/explorar/${row.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.85,
      })
    );

    dynamicEntries = [...supplierEntries, ...productEntries, ...categoryEntries];
  } catch (err) {
    console.error("[sitemap] failed to load dynamic entries:", err);
  }

  return [...staticEntries, ...dynamicEntries];
}
