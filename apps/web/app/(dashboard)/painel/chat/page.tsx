import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatInterface } from "./_components/chat-interface";
import type { ConversationSummary } from "@/app/actions/chat";

export const metadata = { title: "Chat — GiroB2B" };

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

interface ChatPageProps {
  readonly searchParams: Promise<{
    negociar?: string;
    produto?: string;
    fornecedor?: string;
    quantidade?: string;
    preco?: string;
    prazo?: string;
    conv?: string;
  }>;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const userId = authData.user.id;

  const [buyerRes, supplierRes] = await Promise.all([
    supabase.from("buyers").select("id").eq("user_id", userId).maybeSingle(),
    supabase.from("suppliers").select("id").eq("user_id", userId).maybeSingle(),
  ]);

  const buyerId    = buyerRes.data?.id    ?? null;
  const supplierId = supplierRes.data?.id ?? null;
  const role       = supplierRes.data ? (buyerRes.data ? "both" : "supplier") : "buyer";

  // Carrega conversas iniciais do servidor
  let initialConversations: ConversationSummary[] = [];

  if (buyerId || supplierId) {
    const { data: convData } = await supabase
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

    if (convData) {
      initialConversations = (convData as unknown as ConvRow[]).map(conv => {
        const isBuyer = conv.buyer_id === buyerId;
        const otherName = isBuyer
          ? (conv.suppliers?.trade_name ?? "Fornecedor")
          : (conv.buyers?.name ?? conv.buyers?.company_name ?? "Comprador");

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
          other_party_city:  isBuyer ? conv.suppliers?.city  ?? null : conv.buyers?.city  ?? null,
          other_party_state: isBuyer ? conv.suppliers?.state ?? null : conv.buyers?.state ?? null,
        } satisfies ConversationSummary;
      });
    }
  }

  const negotiationContext =
    params.negociar === "true"
      ? {
          produto:    params.produto,
          fornecedor: params.fornecedor,
          quantidade: params.quantidade,
          preco:      params.preco,
          prazo:      params.prazo,
        }
      : null;

  return (
    <ChatInterface
      role={role}
      userId={userId}
      buyerId={buyerId}
      supplierId={supplierId}
      initialConversations={initialConversations}
      initialConvId={params.conv ?? null}
      negotiationContext={negotiationContext}
    />
  );
}
