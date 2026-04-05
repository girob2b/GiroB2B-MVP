import { createClient } from "../lib/supabase.js";
import { calcCompleteness } from "../lib/completeness.js";
import { slugify } from "../lib/slug.js";
import type { CreateProductInput, UpdateProductInput } from "../schemas/products.schema.js";

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
