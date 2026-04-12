import { createAdminClient, createClient } from "../lib/supabase.js";
import { calcCompleteness } from "../lib/completeness.js";
import { slugify } from "../lib/slug.js";
import { copyImageToBucket } from "../lib/storage.js";
import type { CreateProductInput, UpdateProductInput } from "../schemas/products.schema.js";

const MAX_COPIES_PER_ORIGINAL = 10;
const MAX_IMPORTS_PER_RESELLER_PER_DAY = 20;

export class ImportProductError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "ImportProductError";
  }
}

export async function createProduct(
  supplierId: string,
  input: CreateProductInput,
  token: string
) {
  const supabase = createClient(token);

  const base = slugify(input.name);
  const { data: existing } = await supabase
    .from("products")
    .select("slug")
    .eq("supplier_id", supplierId)
    .like("slug", `${base}%`);

  const taken = new Set(((existing as { slug: string }[] | null) ?? []).map(r => r.slug));
  let slug = base;
  let i = 1;
  while (taken.has(slug)) slug = `${base}-${i++}`;

  const { data, error } = await supabase
    .from("products")
    .insert({ supplier_id: supplierId, slug, ...input })
    .select()
    .single();

  if (error) throw new Error("Erro ao criar produto.");

  await recalcCompleteness(supplierId, token);
  return data;
}

export async function updateProduct(
  productId: string,
  supplierId: string,
  input: UpdateProductInput,
  token: string
) {
  const supabase = createClient(token);

  // Ownership check
  const { data: existing } = await supabase
    .from("products")
    .select("supplier_id")
    .eq("id", productId)
    .single();

  if ((existing as { supplier_id: string } | null)?.supplier_id !== supplierId) {
    throw new Error("Produto não encontrado.");
  }

  const { data, error } = await supabase
    .from("products")
    .update(input)
    .eq("id", productId)
    .select()
    .single();

  if (error) throw new Error("Erro ao atualizar produto.");
  return data;
}

export async function deleteProduct(productId: string, supplierId: string, token: string) {
  const supabase = createClient(token);

  const { data: existing } = await supabase
    .from("products")
    .select("supplier_id")
    .eq("id", productId)
    .single();

  if ((existing as { supplier_id: string } | null)?.supplier_id !== supplierId) {
    throw new Error("Produto não encontrado.");
  }

  await supabase
    .from("products")
    .update({ status: "deleted", deleted_at: new Date().toISOString() })
    .eq("id", productId);

  await recalcCompleteness(supplierId, token);
}

export async function importProduct(
  resellerSupplierId: string,
  originalProductId: string,
  token: string
) {
  const admin = createAdminClient();

  // 1. Busca o produto original + supplier dele
  const { data: original } = await admin
    .from("products")
    .select("id, name, images, supplier_id, original_product_id, status")
    .eq("id", originalProductId)
    .maybeSingle();

  if (!original) {
    throw new ImportProductError("Produto original não encontrado.", 404);
  }

  type OriginalRow = {
    id: string;
    name: string;
    images: string[] | null;
    supplier_id: string;
    original_product_id: string | null;
    status: string;
  };
  const originalRow = original as OriginalRow;

  if (originalRow.status === "deleted") {
    throw new ImportProductError("Produto original indisponível.", 404);
  }

  // 2. Não pode clonar produto próprio
  if (originalRow.supplier_id === resellerSupplierId) {
    throw new ImportProductError("Você não pode importar um produto do seu próprio catálogo.", 400);
  }

  // 3. Resolve a raiz da cadeia (cadeia rasa: 1 nível)
  const rootProductId = originalRow.original_product_id ?? originalRow.id;
  const rootSupplierId = originalRow.original_product_id
    ? await (async () => {
        const { data: root } = await admin
          .from("products")
          .select("supplier_id")
          .eq("id", originalRow.original_product_id!)
          .maybeSingle();
        return (root as { supplier_id: string } | null)?.supplier_id ?? originalRow.supplier_id;
      })()
    : originalRow.supplier_id;

  // 4. Valida opt-in do supplier raiz
  const { data: rootSupplier } = await admin
    .from("suppliers")
    .select("id, allow_relisting, suspended")
    .eq("id", rootSupplierId)
    .maybeSingle();

  const rootSupplierRow = rootSupplier as { id: string; allow_relisting: boolean; suspended: boolean } | null;
  if (!rootSupplierRow || rootSupplierRow.suspended) {
    throw new ImportProductError("Fornecedor original indisponível.", 404);
  }
  if (!rootSupplierRow.allow_relisting) {
    throw new ImportProductError("Este fornecedor não permite relistagem dos produtos.", 403);
  }

  // 5. Rate limit por produto raiz (máx 10 cópias ativas)
  const { count: copiesCount } = await admin
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("original_product_id", rootProductId)
    .neq("status", "deleted");

  if ((copiesCount ?? 0) >= MAX_COPIES_PER_ORIGINAL) {
    throw new ImportProductError(
      `Este produto já atingiu o limite de ${MAX_COPIES_PER_ORIGINAL} revendedores.`,
      429
    );
  }

  // 6. Rate limit por revendedor (máx 20 imports/24h)
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentImports } = await admin
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("supplier_id", resellerSupplierId)
    .eq("is_resold", true)
    .gt("created_at", dayAgo);

  if ((recentImports ?? 0) >= MAX_IMPORTS_PER_RESELLER_PER_DAY) {
    throw new ImportProductError(
      `Limite de ${MAX_IMPORTS_PER_RESELLER_PER_DAY} importações por dia atingido. Tente novamente amanhã.`,
      429
    );
  }

  // 7. Verifica se o revendedor já clonou este produto (evita duplicata)
  const { data: existingCopy } = await admin
    .from("products")
    .select("id")
    .eq("supplier_id", resellerSupplierId)
    .eq("original_product_id", rootProductId)
    .neq("status", "deleted")
    .maybeSingle();

  if (existingCopy) {
    throw new ImportProductError("Você já tem uma cópia deste produto no seu catálogo.", 409);
  }

  // 8. Copia a primeira imagem pro bucket do revendedor
  const firstImage = originalRow.images?.[0];
  const copiedImage = firstImage ? await copyImageToBucket(firstImage, resellerSupplierId) : null;

  // 9. Gera slug único global com sufixo aleatório (evita colisão com outras cópias)
  const baseSlug = slugify(originalRow.name);
  const shortId = Math.random().toString(36).slice(2, 8);
  const newSlug = `${baseSlug}-${shortId}`;

  // 10. Cria o produto em draft
  const { data: inserted, error: insertError } = await admin
    .from("products")
    .insert({
      supplier_id: resellerSupplierId,
      name: originalRow.name,
      slug: newSlug,
      images: copiedImage ? [copiedImage] : null,
      status: "draft",
      is_resold: true,
      original_product_id: rootProductId,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new ImportProductError(
      `Erro ao criar cópia: ${insertError?.message ?? "desconhecido"}`,
      500
    );
  }

  // Recalc completeness (draft não conta mas mantemos consistência)
  await recalcCompleteness(resellerSupplierId, token);

  return { id: (inserted as { id: string }).id };
}

async function recalcCompleteness(supplierId: string, token: string) {
  const supabase = createClient(token);

  const [sRes, countRes] = await Promise.all([
    supabase.from("suppliers").select("trade_name,description,logo_url,phone,city,state,categories,photos,website,instagram").eq("id", supplierId).single(),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("supplier_id", supplierId).eq("status", "active"),
  ]);

  const s = sRes.data as { trade_name: string | null; description: string | null; logo_url: string | null; phone: string | null; city: string | null; state: string | null; categories: string[] | null; photos: string[] | null; website: string | null; instagram: string | null } | null;
  if (!s) return;

  const completeness = calcCompleteness(s, countRes.count ?? 0);
  await supabase.from("suppliers").update({ profile_completeness: completeness }).eq("id", supplierId);
}
