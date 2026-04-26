"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

export type PipelineCardData = {
  title: string;
  description?: string | null;
  contact_name?: string | null;
  product_name?: string | null;
  due_date?: string | null;
};

// ── Cards ──────────────────────────────────────────────────────────────────────

export async function addCard(
  columnId: string,
  title: string,
  extra?: Omit<PipelineCardData, "title">
): Promise<{ id: string } | { error: string }> {
  const { supabase, userId } = await getUserId();
  if (!userId) return { error: "Não autenticado." };

  const { count } = await supabase
    .from("pipeline_cards")
    .select("id", { count: "exact", head: true })
    .eq("column_id", columnId)
    .eq("user_id", userId);

  const { data, error } = await supabase
    .from("pipeline_cards")
    .insert({
      column_id: columnId,
      user_id: userId,
      title: title.trim(),
      position: count ?? 0,
      ...extra,
    })
    .select("id")
    .single();

  if (error) return { error: "Erro ao criar card." };
  revalidatePath("/painel/pipeline");
  return data;
}

export async function updateCard(
  cardId: string,
  data: PipelineCardData
): Promise<void> {
  const { supabase, userId } = await getUserId();
  if (!userId) return;

  await supabase
    .from("pipeline_cards")
    .update({
      title:        data.title?.trim() ?? undefined,
      description:  data.description,
      contact_name: data.contact_name,
      product_name: data.product_name,
      due_date:     data.due_date || null,
    })
    .eq("id", cardId)
    .eq("user_id", userId);

  revalidatePath("/painel/pipeline");
}

export async function moveCard(
  cardId: string,
  targetColumnId: string
): Promise<void> {
  const { supabase, userId } = await getUserId();
  if (!userId) return;

  const { count } = await supabase
    .from("pipeline_cards")
    .select("id", { count: "exact", head: true })
    .eq("column_id", targetColumnId)
    .eq("user_id", userId);

  await supabase
    .from("pipeline_cards")
    .update({ column_id: targetColumnId, position: count ?? 0 })
    .eq("id", cardId)
    .eq("user_id", userId);

  revalidatePath("/painel/pipeline");
}

export async function deleteCard(cardId: string): Promise<void> {
  const { supabase, userId } = await getUserId();
  if (!userId) return;

  await supabase
    .from("pipeline_cards")
    .delete()
    .eq("id", cardId)
    .eq("user_id", userId);

  revalidatePath("/painel/pipeline");
}

// ── Columns ───────────────────────────────────────────────────────────────────

export async function addColumn(
  title: string,
  color: string = "slate"
): Promise<{ id: string } | { error: string }> {
  const { supabase, userId } = await getUserId();
  if (!userId) return { error: "Não autenticado." };

  const { count } = await supabase
    .from("pipeline_columns")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { data, error } = await supabase
    .from("pipeline_columns")
    .insert({ user_id: userId, title: title.trim(), position: count ?? 0, color })
    .select("id")
    .single();

  if (error) return { error: "Erro ao criar coluna." };
  revalidatePath("/painel/pipeline");
  return data;
}

export async function renameColumn(columnId: string, title: string): Promise<void> {
  const { supabase, userId } = await getUserId();
  if (!userId) return;

  await supabase
    .from("pipeline_columns")
    .update({ title: title.trim() })
    .eq("id", columnId)
    .eq("user_id", userId);

  revalidatePath("/painel/pipeline");
}

export async function deleteColumn(columnId: string): Promise<{ error?: string }> {
  const { supabase, userId } = await getUserId();
  if (!userId) return { error: "Não autenticado." };

  const { count } = await supabase
    .from("pipeline_cards")
    .select("id", { count: "exact", head: true })
    .eq("column_id", columnId)
    .eq("user_id", userId);

  if ((count ?? 0) > 0)
    return { error: "Remova todos os cards antes de excluir a coluna." };

  await supabase
    .from("pipeline_columns")
    .delete()
    .eq("id", columnId)
    .eq("user_id", userId);

  revalidatePath("/painel/pipeline");
  return {};
}
