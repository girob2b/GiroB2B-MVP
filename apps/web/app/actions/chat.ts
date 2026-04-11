"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ─── Public types (usados pelo ChatInterface) ─────────────────────────────────

export interface ConversationSummary {
  id: string;
  context_type: string;
  product_name: string | null;
  status: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread: number;
  is_buyer: boolean;
  inquiry_id: string | null;
  buyer_id: string;
  supplier_id: string;
  other_party_name: string;
  other_party_initials: string;
  other_party_city: string | null;
  other_party_state: string | null;
  online?: boolean;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  is_mine: boolean;
}

type ConvRow = {
  id: string;
  context_type: string;
  product_name: string | null;
  status: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  buyer_unread: number;
  supplier_unread: number;
  created_at: string;
  inquiry_id: string | null;
  buyer_id: string;
  supplier_id: string;
  buyers: { id: string; name: string | null; company_name: string | null; city: string | null; state: string | null } | null;
  suppliers: { id: string; trade_name: string; city: string | null; state: string | null } | null;
};

// ─── getMyConversations ───────────────────────────────────────────────────────

export async function getMyConversations(): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: buyer }, { data: supplier }] = await Promise.all([
    supabase.from("buyers").select("id").eq("user_id", user.id).maybeSingle(),
    supabase.from("suppliers").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  if (!buyer && !supplier) return [];

  const { data, error } = await supabase
    .from("conversations")
    .select(`
      id, context_type, product_name, status,
      last_message_at, last_message_preview,
      buyer_unread, supplier_unread, created_at,
      inquiry_id, buyer_id, supplier_id,
      buyers(id, name, company_name, city, state),
      suppliers(id, trade_name, city, state)
    `)
    .eq("status", "active")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error || !data) return [];

  return (data as unknown as ConvRow[]).map(conv => {
    const isBuyer = conv.buyer_id === buyer?.id;
    const otherName = isBuyer
      ? (conv.suppliers?.trade_name ?? "Fornecedor")
      : (conv.buyers?.name ?? conv.buyers?.company_name ?? "Comprador");
    const otherCity  = isBuyer ? conv.suppliers?.city  : conv.buyers?.city;
    const otherState = isBuyer ? conv.suppliers?.state : conv.buyers?.state;

    return {
      id: conv.id,
      context_type: conv.context_type,
      product_name: conv.product_name,
      status: conv.status,
      last_message_at: conv.last_message_at,
      last_message_preview: conv.last_message_preview,
      unread: isBuyer ? conv.buyer_unread : conv.supplier_unread,
      is_buyer: isBuyer,
      inquiry_id: conv.inquiry_id,
      buyer_id: conv.buyer_id,
      supplier_id: conv.supplier_id,
      other_party_name: otherName,
      other_party_initials: otherName.slice(0, 2).toUpperCase(),
      other_party_city: otherCity ?? null,
      other_party_state: otherState ?? null,
    };
  });
}

// ─── getConversationMessages ──────────────────────────────────────────────────

export async function getConversationMessages(
  conversationId: string,
): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, conversation_id, sender_id, content, message_type, metadata, read_at, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map(msg => ({
    ...(msg as ChatMessage),
    is_mine: msg.sender_id === user.id,
  }));
}

// ─── sendMessage ──────────────────────────────────────────────────────────────

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<ChatMessage | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 5000) return { error: "Mensagem inválida." };

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: trimmed,
      message_type: "text",
    })
    .select("id, conversation_id, sender_id, content, message_type, metadata, read_at, created_at")
    .single();

  if (error || !data) return { error: "Erro ao enviar mensagem." };

  return { ...(data as ChatMessage), is_mine: true };
}

// ─── createOrGetConversation ──────────────────────────────────────────────────
// Cria ou recupera uma conversa (idempotente pelos índices únicos).

export async function createOrGetConversation(params: {
  supplierId: string;
  inquiryId?: string | null;
  productId?: string | null;
  productName?: string | null;
  contextType?: "inquiry" | "direct_purchase" | "direct";
  firstMessage?: string | null;
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // ── Resolver buyer_id ──────────────────────────────────────────────────────

  let { data: buyer } = await supabase
    .from("buyers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();

  if (!buyer) {
    // Cria um buyer mínimo baseado no perfil do usuário
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, city, state")
      .eq("id", user.id)
      .single();

    if (!profile?.full_name) {
      return { error: "Complete seu perfil (nome, cidade e estado) antes de iniciar uma conversa." };
    }

    const { data: created, error: createErr } = await supabase
      .from("buyers")
      .insert({
        user_id: user.id,
        name: profile.full_name,
        email: user.email ?? "",
        city: profile.city ?? null,
        state: profile.state ?? null,
        lgpd_consent: true,
        lgpd_consent_at: new Date().toISOString(),
      })
      .select("id")
      .single<{ id: string }>();

    if (createErr || !created) {
      return { error: "Não foi possível criar perfil de comprador." };
    }

    buyer = created;
  }

  const buyerId = buyer.id;
  const contextType = params.contextType ?? (params.inquiryId ? "inquiry" : "direct");

  // ── Verificar se conversa já existe ───────────────────────────────────────

  let existing: { id: string } | null = null;

  if (params.inquiryId) {
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("inquiry_id", params.inquiryId)
      .maybeSingle<{ id: string }>();
    existing = data;
  } else {
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("buyer_id", buyerId)
      .eq("supplier_id", params.supplierId)
      .is("inquiry_id", null)
      .maybeSingle<{ id: string }>();
    existing = data;
  }

  if (existing) {
    // Opcional: enviar primeira mensagem se foi fornecida e ainda não há msgs
    if (params.firstMessage) {
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", existing.id);

      if (count === 0) {
        await sendMessage(existing.id, params.firstMessage);
      }
    }
    return { id: existing.id };
  }

  // ── Criar nova conversa ──────────────────────────────────────────────────

  const { data: newConv, error: convErr } = await supabase
    .from("conversations")
    .insert({
      buyer_id: buyerId,
      supplier_id: params.supplierId,
      inquiry_id: params.inquiryId ?? null,
      context_type: contextType,
      product_id: params.productId ?? null,
      product_name: params.productName ?? null,
      status: "active",
    })
    .select("id")
    .single<{ id: string }>();

  if (convErr || !newConv) {
    // Pode ser conflito de upsert — tentar ler a existente
    const selector = params.inquiryId
      ? supabase.from("conversations").select("id").eq("inquiry_id", params.inquiryId).maybeSingle<{ id: string }>()
      : supabase.from("conversations").select("id").eq("buyer_id", buyerId).eq("supplier_id", params.supplierId).is("inquiry_id", null).maybeSingle<{ id: string }>();

    const { data: retry } = await selector;
    if (retry) {
      if (params.firstMessage) await sendMessage(retry.id, params.firstMessage);
      return { id: retry.id };
    }

    return { error: "Não foi possível criar a conversa." };
  }

  // Enviar primeira mensagem se foi fornecida
  if (params.firstMessage) {
    await sendMessage(newConv.id, params.firstMessage);
  }

  revalidatePath("/painel/chat");
  return { id: newConv.id };
}

// ─── markConversationRead ─────────────────────────────────────────────────────

export async function markConversationRead(
  conversationId: string,
  isBuyer: boolean,
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("conversations")
    .update(isBuyer ? { buyer_unread: 0 } : { supplier_unread: 0 })
    .eq("id", conversationId);
}
