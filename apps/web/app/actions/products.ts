"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { apiClient } from "@/lib/api-client";

export type ProductState = {
  error?: string;
  success?: boolean;
};

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
  } catch (error: any) {
    return { error: error.message || "Erro ao criar produto." };
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
  } catch (error: any) {
    return { error: error.message || "Erro ao atualizar produto." };
  }

  revalidatePath("/painel/produtos");
  revalidatePath(`/painel/produtos/${productId}`);

  return { success: true };
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
