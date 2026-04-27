"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface CatalogState {
  error?: string;
  success?: boolean;
}

async function getSupplierForCurrentUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("suppliers").select("id").eq("user_id", user.id).maybeSingle();
  return data ?? null;
}

export async function addCatalogFile(
  _prev: CatalogState,
  formData: FormData
): Promise<CatalogState> {
  const supabase = await createClient();
  const supplier = await getSupplierForCurrentUser(supabase);
  if (!supplier) return { error: "Perfil de fornecedor não encontrado." };

  const file_url   = (formData.get("file_url")   as string)?.trim();
  const file_name  = (formData.get("file_name")  as string)?.trim();
  const file_size  = Number(formData.get("file_size") ?? 0);
  const file_type  = formData.get("file_type") as string;
  const title      = (formData.get("title") as string)?.trim() || null;

  if (!file_url || !file_name)         return { error: "Arquivo inválido." };
  if (!["pdf", "image"].includes(file_type)) return { error: "Tipo de arquivo não suportado." };

  const { count } = await supabase
    .from("supplier_catalogs")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", supplier.id);
  if ((count ?? 0) >= 5) return { error: "Limite de 5 arquivos atingido. Remova um para adicionar outro." };

  const { error } = await supabase.from("supplier_catalogs").insert({
    supplier_id: supplier.id,
    file_url, file_name, file_size, file_type, title,
  });
  if (error) return { error: "Erro ao salvar no catálogo." };

  revalidatePath("/painel/produtos");
  return { success: true };
}

export async function deleteCatalogFile(id: string): Promise<void> {
  const supabase = await createClient();
  const supplier = await getSupplierForCurrentUser(supabase);
  if (!supplier) return;

  const { data: catalog } = await supabase
    .from("supplier_catalogs")
    .select("file_url")
    .eq("id", id)
    .eq("supplier_id", supplier.id)
    .single();

  if (catalog?.file_url) {
    try {
      const url = new URL(catalog.file_url);
      const segments = url.pathname.split("/supplier-catalogs/");
      if (segments[1]) {
        await supabase.storage.from("supplier-catalogs").remove([decodeURIComponent(segments[1])]);
      }
    } catch { /* ignore storage delete errors — metadata cleanup is enough */ }
  }

  await supabase
    .from("supplier_catalogs")
    .delete()
    .eq("id", id)
    .eq("supplier_id", supplier.id);

  revalidatePath("/painel/produtos");
}

export async function updateCatalogTitle(id: string, title: string): Promise<void> {
  const supabase = await createClient();
  const supplier = await getSupplierForCurrentUser(supabase);
  if (!supplier) return;

  await supabase
    .from("supplier_catalogs")
    .update({ title: title.trim() || null })
    .eq("id", id)
    .eq("supplier_id", supplier.id);

  revalidatePath("/painel/produtos");
}
