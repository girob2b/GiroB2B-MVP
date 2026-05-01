import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateProductInput, UpdateProductInput } from "@/lib/schemas/products";
import { recalcSupplierCompleteness } from "@/lib/services/supplier";

const PRODUCT_IMAGES_BUCKET = "product-images";
const MAX_COPIES_PER_ORIGINAL = 10;
const MAX_IMPORTS_PER_RESELLER_PER_DAY = 20;

export class ImportProductError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "ImportProductError";
  }
}

export async function createProduct(
  supabase: SupabaseClient,
  supplierId: string,
  input: CreateProductInput
) {
  const base = slugify(input.name);
  const { data: existing } = await supabase
    .from("products")
    .select("slug")
    .eq("supplier_id", supplierId)
    .like("slug", `${base}%`);

  const taken = new Set(((existing as { slug: string }[] | null) ?? []).map(row => row.slug));
  let slug = base;
  let index = 1;
  while (taken.has(slug)) slug = `${base}-${index++}`;

  const { data, error } = await supabase
    .from("products")
    .insert({ supplier_id: supplierId, slug, ...input })
    .select()
    .single();

  if (error) throw new Error("Erro ao criar produto.");

  await recalcSupplierCompleteness(supabase, supplierId);
  return data;
}

export async function updateProduct(
  supabase: SupabaseClient,
  productId: string,
  supplierId: string,
  input: UpdateProductInput
) {
  const { data, error } = await supabase
    .from("products")
    .update(input)
    .eq("id", productId)
    .eq("supplier_id", supplierId)
    .select()
    .single();

  if (error || !data) throw new Error("Produto não encontrado.");

  await recalcSupplierCompleteness(supabase, supplierId);
  return data;
}

export async function deleteProduct(
  supabase: SupabaseClient,
  productId: string,
  supplierId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("products")
    .update({ status: "deleted", deleted_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("supplier_id", supplierId)
    .select("id")
    .single();

  if (error || !data) throw new Error("Produto não encontrado.");

  await recalcSupplierCompleteness(supabase, supplierId);
}

function inferExtension(contentType: string | null, fallbackUrl: string): string {
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpg";
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  const urlExt = fallbackUrl.split(".").pop()?.toLowerCase().split("?")[0];
  if (urlExt && ["jpg", "jpeg", "png", "webp"].includes(urlExt)) {
    return urlExt === "jpeg" ? "jpg" : urlExt;
  }
  return "jpg";
}

async function copyImageToBucket(sourceUrl: string, targetSupplierId: string): Promise<string> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Falha ao baixar imagem original (HTTP ${response.status}).`);
  }

  const contentType = response.headers.get("content-type");
  const ext = inferExtension(contentType, sourceUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  const path = `${targetSupplierId}/${randomUUID()}.${ext}`;
  const admin = createAdminClient();

  const { error } = await admin.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, buffer, {
      contentType: contentType ?? `image/${ext}`,
      upsert: false,
    });

  if (error) throw new Error(`Falha ao salvar imagem importada: ${error.message}`);

  const { data } = admin.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function importProduct(
  supabase: SupabaseClient,
  resellerSupplierId: string,
  originalProductId: string
) {
  const admin = createAdminClient();

  const { data: original } = await admin
    .from("products")
    .select("id, name, images, supplier_id, original_product_id, status")
    .eq("id", originalProductId)
    .maybeSingle();

  const originalRow = original as {
    id: string;
    name: string;
    images: string[] | null;
    supplier_id: string;
    original_product_id: string | null;
    status: string;
  } | null;

  if (!originalRow || originalRow.status === "deleted") {
    throw new ImportProductError("Produto original não encontrado.", 404);
  }
  if (originalRow.supplier_id === resellerSupplierId) {
    throw new ImportProductError("Você não pode importar um produto do seu próprio catálogo.", 400);
  }

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

  const copiedImage = originalRow.images?.[0]
    ? await copyImageToBucket(originalRow.images[0], resellerSupplierId)
    : null;

  const baseSlug = slugify(originalRow.name);
  const newSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;

  const { data: inserted, error } = await admin
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

  if (error || !inserted) {
    throw new ImportProductError(`Erro ao criar cópia: ${error?.message ?? "desconhecido"}`, 500);
  }

  await recalcSupplierCompleteness(supabase, resellerSupplierId);
  return { id: (inserted as { id: string }).id };
}
