/**
 * /produto/[slug] — rota legado pré-pivot.
 *
 * Decisão de implementação (2026-06-21, bloco1/corrigir-residuo-pivot-produto):
 * A rota é resíduo do modelo anterior (catálogo de produto + inquiry/cotação).
 * No modelo atual (reverse marketplace) o produto não é mais a entidade central —
 * a DEMANDA do comprador é. Manter a página com "Pedir cotação" seria contradição
 * com o modelo atual (cotação/inquiry foram removidos no pivot de 2026-05-07).
 *
 * Escolha: redirect permanente (308) para o perfil do fornecedor dono do produto.
 * Se o produto não existir ou não tiver fornecedor, redireciona pra /buscar.
 * Mantém juice SEO via 308 e não mostra tela crua ou CTA fantasma.
 *
 * DECISAO PARA O VITOR CONFIRMAR:
 * - Se quiser suprimir esta rota completamente (sem redirect), editar o next.config
 *   com uma rewrite/redirect estático e pode deletar estes arquivos.
 * - Se no futuro catálogo de produto voltar como modelo, esta rota pode ser
 *   rehabilitada — nesse caso remover o redirect e reconstruir a página.
 */
import { permanentRedirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface ProductRow {
  supplier_id: string;
}

interface SupplierRow {
  slug: string;
}

async function resolveSupplierSlug(productSlug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("supplier_id")
    .eq("slug", productSlug)
    .eq("status", "active")
    .maybeSingle<ProductRow>();

  if (!product?.supplier_id) return null;

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("slug")
    .eq("id", product.supplier_id)
    .eq("suspended", false)
    .maybeSingle<SupplierRow>();

  return supplier?.slug ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Redirect não serve conteúdo — metadata mínima para crawlers que chegarem
  // antes do redirect ser processado.
  const { slug } = await params;
  return {
    title: "Produto — GiroB2B",
    robots: { index: false, follow: true },
    alternates: { canonical: `/produto/${slug}` },
  };
}

export default async function ProdutoPublicoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supplierSlug = await resolveSupplierSlug(slug);

  if (supplierSlug) {
    permanentRedirect(`/fornecedor/${supplierSlug}`);
  } else {
    permanentRedirect("/buscar");
  }
}
