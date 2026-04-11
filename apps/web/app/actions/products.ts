"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { apiClient } from "@/lib/api-client";

export type ProductState = {
  error?: string;
  success?: boolean;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message || fallback : fallback;
}

function parseProductFormData(formData: FormData) {
  const name = (formData.get("name") as string)?.trim() ?? "";
  const description = (formData.get("description") as string) || null;
  const category_id = (formData.get("category_id") as string) || null;
  const unit = (formData.get("unit") as string) || null;
  const min_order_raw = formData.get("min_order") as string | null;
  const price_min_raw = formData.get("price_min") as string | null;
  const price_max_raw = formData.get("price_max") as string | null;
  const tags_raw = formData.get("tags") as string | null;
  const images = formData.getAll("images").filter(Boolean) as string[];
  const status = (formData.get("status") as string) || "active";

  return {
    name,
    description,
    category_id,
    unit,
    min_order: min_order_raw ? parseInt(min_order_raw) : null,
    price_min_cents: price_min_raw ? Math.round(parseFloat(price_min_raw) * 100) : null,
    price_max_cents: price_max_raw ? Math.round(parseFloat(price_max_raw) * 100) : null,
    tags: tags_raw ? tags_raw.split(",").map((t) => t.trim()).filter(Boolean) : null,
    images: images.length > 0 ? images : null,
    status,
  };
}

export async function createProduct(
  _prevState: ProductState,
  formData: FormData
): Promise<ProductState> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "Sessão expirada. Faça login novamente." };

  const fields = parseProductFormData(formData);
  if (!fields.name) return { error: "Nome do produto é obrigatório." };

  try {
    const client = apiClient(session.access_token);
    await client.post("/products", fields);
  } catch (error) {
    return { error: errorMessage(error, "Erro ao criar produto.") };
  }

  revalidatePath("/painel/produtos");
  revalidatePath("/painel");

  return { success: true };
}

export async function updateProduct(
  productId: string,
  _prevState: ProductState,
  formData: FormData
): Promise<ProductState> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "Sessão expirada. Faça login novamente." };

  const fields = parseProductFormData(formData);
  if (!fields.name) return { error: "Nome do produto é obrigatório." };

  try {
    const client = apiClient(session.access_token);
    await client.patch(`/products/${productId}`, fields);
  } catch (error) {
    return { error: errorMessage(error, "Erro ao atualizar produto.") };
  }

  revalidatePath("/painel/produtos");
  revalidatePath(`/painel/produtos/${productId}`);

  return { success: true };
}

// ─── bulkCreateProducts ───────────────────────────────────────────────────────

export interface BulkProductRow {
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  unidade?: string | null;
  pedido_minimo?: number | null;
  preco_min?: number | null;  // em reais
  preco_max?: number | null;  // em reais
  tags?: string | null;
  status?: string | null;
}

export interface BulkResult {
  index: number;
  nome: string;
  ok: boolean;
  error?: string;
}

export async function bulkCreateProducts(
  rows: BulkProductRow[]
): Promise<{ results: BulkResult[]; created: number; failed: number }> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { results: [], created: 0, failed: rows.length };

  const client = apiClient(session.access_token);
  const results: BulkResult[] = [];
  let created = 0;
  let failed = 0;

  // Buscar mapa de categorias (nome → id) uma única vez
  const { data: categoriesData } = await supabase
    .from("categories")
    .select("id, name")
    .eq("active", true);

  const categoryMap = new Map<string, string>(
    (categoriesData ?? []).map((c: { id: string; name: string }) => [c.name.toLowerCase(), c.id])
  );

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.nome?.trim()) {
      results.push({ index: i, nome: row.nome ?? `Linha ${i + 2}`, ok: false, error: "Nome é obrigatório." });
      failed++;
      continue;
    }

    const categoryId = row.categoria
      ? (categoryMap.get(row.categoria.trim().toLowerCase()) ?? null)
      : null;

    const payload = {
      name: row.nome.trim(),
      description: row.descricao?.trim() || null,
      category_id: categoryId,
      unit: row.unidade?.trim() || null,
      min_order: row.pedido_minimo ?? null,
      price_min_cents: row.preco_min != null ? Math.round(row.preco_min * 100) : null,
      price_max_cents: row.preco_max != null ? Math.round(row.preco_max * 100) : null,
      tags: row.tags ? row.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
      status: ["active", "paused"].includes(row.status ?? "") ? row.status : "active",
    };

    try {
      await client.post("/products", payload);
      results.push({ index: i, nome: row.nome, ok: true });
      created++;
    } catch (err) {
      results.push({ index: i, nome: row.nome, ok: false, error: errorMessage(err, "Erro ao criar produto.") });
      failed++;
    }
  }

  revalidatePath("/painel/produtos");
  revalidatePath("/painel");

  return { results, created, failed };
}

export async function deleteProduct(productId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  try {
    const client = apiClient(session.access_token);
    await client.delete(`/products/${productId}`);
  } catch (error) {
    console.error("Erro ao deletar produto:", error);
  }

  revalidatePath("/painel/produtos");
  revalidatePath("/painel");
}
