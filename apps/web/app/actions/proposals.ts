"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProposalStatus =
  | "draft" | "sent" | "accepted" | "refused"
  | "revised" | "cancelled" | "shipped" | "completed";

export interface ProposalData {
  id: string;
  buyer_id: string;
  supplier_id: string;
  conversation_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit: string | null;
  target_price_cents: number | null;
  max_budget_cents: number | null;
  delivery_deadline: string | null;
  payment_terms: string | null;
  notes: string | null;
  status: ProposalStatus;
  refusal_reason: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProposalInput {
  conversation_id: string;
  supplier_id: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  unit?: string | null;
  target_price_cents?: number | null;
  max_budget_cents?: number | null;
  delivery_deadline?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
  parent_id?: string | null;
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

// ─── createProposal ───────────────────────────────────────────────────────────

export async function createProposal(
  input: CreateProposalInput,
): Promise<{ id: string } | { error: string }> {
  const { supabase, userId } = await getUser();
  if (!userId) return { error: "Não autenticado." };

  const { data: buyer } = await supabase
    .from("buyers").select("id").eq("user_id", userId).single();
  if (!buyer) return { error: "Apenas compradores podem enviar propostas." };

  const { data: supplier } = await supabase
    .from("suppliers").select("id, user_id").eq("id", input.supplier_id).single();
  if (!supplier) return { error: "Fornecedor não encontrado." };

  const { data: proposal, error } = await supabase
    .from("proposals")
    .insert({
      buyer_id:           buyer.id,
      supplier_id:        input.supplier_id,
      conversation_id:    input.conversation_id,
      product_id:         input.product_id ?? null,
      product_name:       input.product_name,
      quantity:           input.quantity,
      unit:               input.unit ?? null,
      target_price_cents: input.target_price_cents ?? null,
      max_budget_cents:   input.max_budget_cents ?? null,
      delivery_deadline:  input.delivery_deadline ?? null,
      payment_terms:      input.payment_terms ?? null,
      notes:              input.notes ?? null,
      status:             "sent",
      parent_id:          input.parent_id ?? null,
    })
    .select("id")
    .single();

  if (error || !proposal) return { error: "Erro ao criar proposta." };

  const preview = `${input.quantity}${input.unit ? ` ${input.unit}` : ""} de ${input.product_name}`;

  await supabase.from("chat_messages").insert({
    conversation_id: input.conversation_id,
    sender_id: userId,
    content: `Proposta enviada: ${preview}`,
    message_type: "proposal_ref",
    metadata: {
      proposal_id: proposal.id,
      action: "sent",
      product_name: input.product_name,
      quantity: input.quantity,
      unit: input.unit ?? null,
      target_price_cents: input.target_price_cents ?? null,
      max_budget_cents: input.max_budget_cents ?? null,
      delivery_deadline: input.delivery_deadline ?? null,
      payment_terms: input.payment_terms ?? null,
      notes: input.notes ?? null,
    },
  });

  await supabase.rpc("create_proposal_pipeline_cards", {
    p_proposal_id: proposal.id,
    p_buyer_user_id: userId,
    p_supplier_user_id: supplier.user_id,
    p_product_name: input.product_name,
  });

  revalidatePath("/painel/pipeline");
  revalidatePath("/painel/chat");
  return { id: proposal.id };
}

// ─── acceptProposal ───────────────────────────────────────────────────────────

export async function acceptProposal(
  proposalId: string,
): Promise<void | { error: string }> {
  const { supabase, userId } = await getUser();
  if (!userId) return { error: "Não autenticado." };

  const { data: supplier } = await supabase
    .from("suppliers").select("id").eq("user_id", userId).single();
  if (!supplier) return { error: "Apenas fornecedores podem aceitar propostas." };

  const { data: p } = await supabase
    .from("proposals")
    .select("id, buyer_id, conversation_id, product_name, status")
    .eq("id", proposalId)
    .eq("supplier_id", supplier.id)
    .single();
  if (!p) return { error: "Proposta não encontrada." };
  if (p.status !== "sent") return { error: "Esta proposta não pode ser aceita." };

  const { data: buyer } = await supabase
    .from("buyers").select("user_id").eq("id", p.buyer_id).single();

  await supabase.from("proposals").update({ status: "accepted" }).eq("id", proposalId);

  await supabase.from("chat_messages").insert({
    conversation_id: p.conversation_id,
    sender_id: userId,
    content: `Proposta aceita: ${p.product_name}`,
    message_type: "proposal_ref",
    metadata: { proposal_id: proposalId, action: "accepted", product_name: p.product_name },
  });

  if (buyer) {
    await supabase.rpc("move_proposal_pipeline_cards", {
      p_proposal_id: proposalId,
      p_buyer_user_id: buyer.user_id,
      p_supplier_user_id: userId,
      p_status: "accepted",
    });
  }

  revalidatePath("/painel/pipeline");
  revalidatePath("/painel/chat");
}

// ─── refuseProposal ───────────────────────────────────────────────────────────

export async function refuseProposal(
  proposalId: string,
  reason: string,
): Promise<void | { error: string }> {
  const { supabase, userId } = await getUser();
  if (!userId) return { error: "Não autenticado." };

  const { data: supplier } = await supabase
    .from("suppliers").select("id").eq("user_id", userId).single();
  if (!supplier) return { error: "Apenas fornecedores podem recusar propostas." };

  const { data: p } = await supabase
    .from("proposals")
    .select("id, buyer_id, conversation_id, product_name, status")
    .eq("id", proposalId)
    .eq("supplier_id", supplier.id)
    .single();
  if (!p) return { error: "Proposta não encontrada." };
  if (p.status !== "sent") return { error: "Esta proposta não pode ser recusada." };

  const { data: buyer } = await supabase
    .from("buyers").select("user_id").eq("id", p.buyer_id).single();

  await supabase.from("proposals").update({
    status: "refused",
    refusal_reason: reason.trim(),
  }).eq("id", proposalId);

  await supabase.from("chat_messages").insert({
    conversation_id: p.conversation_id,
    sender_id: userId,
    content: `Proposta recusada: ${p.product_name}`,
    message_type: "proposal_ref",
    metadata: {
      proposal_id: proposalId,
      action: "refused",
      product_name: p.product_name,
      refusal_reason: reason.trim(),
    },
  });

  if (buyer) {
    await supabase.rpc("move_proposal_pipeline_cards", {
      p_proposal_id: proposalId,
      p_buyer_user_id: buyer.user_id,
      p_supplier_user_id: userId,
      p_status: "refused",
    });
  }

  revalidatePath("/painel/pipeline");
  revalidatePath("/painel/chat");
}

// ─── markShipped ──────────────────────────────────────────────────────────────

export async function markShipped(
  proposalId: string,
): Promise<void | { error: string }> {
  const { supabase, userId } = await getUser();
  if (!userId) return { error: "Não autenticado." };

  const { data: supplier } = await supabase
    .from("suppliers").select("id").eq("user_id", userId).single();
  if (!supplier) return { error: "Apenas fornecedores podem marcar como enviado." };

  const { data: p } = await supabase
    .from("proposals")
    .select("id, buyer_id, conversation_id, product_name, status")
    .eq("id", proposalId)
    .eq("supplier_id", supplier.id)
    .single();
  if (!p || p.status !== "accepted") return { error: "Proposta inválida." };

  const { data: buyer } = await supabase
    .from("buyers").select("user_id").eq("id", p.buyer_id).single();

  await supabase.from("proposals").update({ status: "shipped" }).eq("id", proposalId);

  await supabase.from("chat_messages").insert({
    conversation_id: p.conversation_id,
    sender_id: userId,
    content: `Pedido enviado: ${p.product_name}`,
    message_type: "proposal_ref",
    metadata: { proposal_id: proposalId, action: "shipped", product_name: p.product_name },
  });

  if (buyer) {
    await supabase.rpc("move_proposal_pipeline_cards", {
      p_proposal_id: proposalId,
      p_buyer_user_id: buyer.user_id,
      p_supplier_user_id: userId,
      p_status: "shipped",
    });
  }

  revalidatePath("/painel/pipeline");
  revalidatePath("/painel/chat");
}

// ─── confirmReceived ──────────────────────────────────────────────────────────

export async function confirmReceived(
  proposalId: string,
): Promise<void | { error: string }> {
  const { supabase, userId } = await getUser();
  if (!userId) return { error: "Não autenticado." };

  const { data: buyer } = await supabase
    .from("buyers").select("id").eq("user_id", userId).single();
  if (!buyer) return { error: "Apenas compradores podem confirmar recebimento." };

  const { data: p } = await supabase
    .from("proposals")
    .select("id, supplier_id, conversation_id, product_name, status")
    .eq("id", proposalId)
    .eq("buyer_id", buyer.id)
    .single();
  if (!p || p.status !== "shipped") return { error: "Proposta inválida." };

  const { data: supplierProfile } = await supabase
    .from("suppliers").select("user_id").eq("id", p.supplier_id).single();

  await supabase.from("proposals").update({ status: "completed" }).eq("id", proposalId);

  await supabase.from("chat_messages").insert({
    conversation_id: p.conversation_id,
    sender_id: userId,
    content: `Recebimento confirmado: ${p.product_name}`,
    message_type: "proposal_ref",
    metadata: { proposal_id: proposalId, action: "completed", product_name: p.product_name },
  });

  if (supplierProfile) {
    await supabase.rpc("move_proposal_pipeline_cards", {
      p_proposal_id: proposalId,
      p_buyer_user_id: userId,
      p_supplier_user_id: supplierProfile.user_id,
      p_status: "completed",
    });
  }

  revalidatePath("/painel/pipeline");
  revalidatePath("/painel/chat");
}

// ─── getProposalsByIds ────────────────────────────────────────────────────────

export async function getProposalsByIds(
  ids: string[],
): Promise<Record<string, ProposalData>> {
  if (!ids.length) return {};
  const { supabase, userId } = await getUser();
  if (!userId) return {};

  const { data } = await supabase
    .from("proposals")
    .select("*")
    .in("id", ids);

  if (!data) return {};
  const map: Record<string, ProposalData> = {};
  for (const row of data) map[row.id] = row as ProposalData;
  return map;
}
