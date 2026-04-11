"use client";

import {
  useState, useRef, useEffect, useCallback,
  type KeyboardEvent,
} from "react";
import {
  Search, ChevronLeft, Phone, Video, MoreVertical,
  Paperclip, Smile, Send, CheckCheck, Check,
  ShoppingCart, X, MessageSquare, Loader2, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  getConversationMessages,
  sendMessage as sendMessageAction,
  markConversationRead,
} from "@/app/actions/chat";
import type { ConversationSummary, ChatMessage } from "@/app/actions/chat";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface NegotiationContext {
  produto?: string;
  fornecedor?: string;
  quantidade?: string;
  preco?: string;
  prazo?: string;
}

export interface ChatInterfaceProps {
  role: string;
  userId: string;
  buyerId?: string | null;
  supplierId?: string | null;
  initialConversations: ConversationSummary[];
  initialConvId?: string | null;
  negotiationContext?: NegotiationContext | null;
}

// ─── Supabase browser client (module-level singleton) ─────────────────────────
const supabase = createClient();

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7)  return d.toLocaleDateString("pt-BR", { weekday: "short" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function groupMessagesByDate(messages: ChatMessage[]) {
  const groups: Array<{ date: string; messages: ChatMessage[] }> = [];
  let currentDate = "";

  for (const msg of messages) {
    const d = new Date(msg.created_at);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    const label =
      diff === 0 ? "Hoje" :
      diff === 1 ? "Ontem" :
      d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

    if (label !== currentDate) {
      currentDate = label;
      groups.push({ date: label, messages: [] });
    }
    groups[groups.length - 1].messages.push(msg);
  }
  return groups;
}

// ─── Avatar colors per initials ───────────────────────────────────────────────

const AVATAR_PALETTES = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
  "bg-amber-100 text-amber-700",
];

function avatarClass(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

// ─── Sub-components ────────────────────────────────────────────────────────────


function MsgStatus({ isRead }: { isRead: boolean }) {
  return isRead
    ? <CheckCheck className="w-3 h-3 text-(--brand-green-200)" />
    : <Check      className="w-3 h-3 text-white/50" />;
}

function ContextBadge({ type, productName }: { type: string; productName?: string | null }) {
  const labels: Record<string, string> = {
    inquiry:        "Cotação",
    direct_purchase: "Compra direta",
    direct:          "Contato direto",
  };
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-(--brand-green-100) text-(--brand-green-700)">
      {labels[type] ?? type}
      {productName && ` · ${productName}`}
    </span>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ role }: { role: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
      <div className="w-20 h-20 rounded-full bg-(--brand-green-50) flex items-center justify-center">
        <MessageSquare className="w-10 h-10 text-(--brand-green-300)" />
      </div>
      <div className="space-y-2">
        <p className="font-semibold text-slate-700">
          {role === "supplier" ? "Nenhuma conversa ainda" : "Inicie uma conversa"}
        </p>
        <p className="text-sm text-slate-400 max-w-xs">
          {role === "supplier"
            ? "Quando compradores entrarem em contato, as conversas aparecerão aqui."
            : "Explore produtos e clique em \"Negociar direto\" ou \"Solicitar cotação\" para iniciar."}
        </p>
      </div>
      {role !== "supplier" && (
        <Link
          href="/painel/explorar"
          className="inline-flex items-center gap-2 rounded-xl bg-(--brand-green-600) hover:bg-(--brand-green-700) text-white text-sm font-semibold px-5 py-2.5 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Explorar produtos
        </Link>
      )}
    </div>
  );
}

// ─── Empty conversation panel ─────────────────────────────────────────────────

function SelectConversationPanel() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
        <MessageSquare className="w-8 h-8 text-slate-300" />
      </div>
      <p className="text-sm text-slate-400">Selecione uma conversa para começar</p>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ChatInterface({
  role, userId,
  initialConversations,
  initialConvId,
  negotiationContext,
}: ChatInterfaceProps) {
  const [conversations,  setConversations]  = useState<ConversationSummary[]>(initialConversations);
  const [activeId,       setActiveId]       = useState<string | null>(
    initialConvId ?? initialConversations[0]?.id ?? null,
  );
  const [mobileView,     setMobileView]     = useState<"list" | "chat">("list");
  const [messages,       setMessages]       = useState<ChatMessage[]>([]);
  const [msgsLoading,    setMsgsLoading]    = useState(false);
  const [inputValue,     setInputValue]     = useState("");
  const [sending,        setSending]        = useState(false);
  const [sendError,      setSendError]      = useState<string | null>(null);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [showNegCtx,     setShowNegCtx]     = useState(!!negotiationContext);

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLTextAreaElement>(null);
  const channelRef      = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const autoSentRef     = useRef(false);

  const activeConv = conversations.find(c => c.id === activeId) ?? null;

  // ── Aplicar primeira mensagem enviada automaticamente ─────────────────────
  function applyFirstMessage(
    result: Awaited<ReturnType<typeof sendMessageAction>>,
    convId: string,
    preview: string,
  ) {
    if ("error" in result) return;
    setMessages(prev => prev.some(m => m.id === result.id) ? prev : [...prev, result]);
    setConversations(prev => prev.map(c =>
      c.id === convId ? { ...c, last_message_preview: preview, last_message_at: result.created_at } : c,
    ));
  }

  // ── Pre-fill input from negotiation context ──────────────────────────────
  useEffect(() => {
    if (!negotiationContext?.produto) return;
    const parts = [
      `Produto: ${negotiationContext.produto}`,
      negotiationContext.quantidade && `Qtd: ${negotiationContext.quantidade}`,
      negotiationContext.preco      && `Preço alvo: R$ ${negotiationContext.preco}`,
      negotiationContext.prazo      && `Prazo: ${negotiationContext.prazo}`,
    ].filter(Boolean).join(" | ");
    setInputValue(`Olá! Tenho interesse em negociar. ${parts}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-send negotiation message when conversation opens empty ───────────
  // Fires once when: context exists + conv is active + messages loaded + inbox empty
  useEffect(() => {
    if (!negotiationContext?.produto)  return;
    if (!activeId)                      return;
    if (msgsLoading)                    return;
    if (autoSentRef.current)            return;
    if (messages.length > 0) {
      // Conversa já tem mensagens — não enviar de novo
      autoSentRef.current = true;
      setInputValue("");
      return;
    }

    autoSentRef.current = true;

    const parts = [
      `Produto: ${negotiationContext.produto}`,
      negotiationContext.quantidade && `Qtd: ${negotiationContext.quantidade}`,
      negotiationContext.preco      && `Preço alvo: R$ ${negotiationContext.preco}`,
      negotiationContext.prazo      && `Prazo: ${negotiationContext.prazo}`,
    ].filter(Boolean).join(" | ");
    const text = `Olá! Tenho interesse em negociar. ${parts}`;

    setInputValue("");

    function applyAutoSent(result: Awaited<ReturnType<typeof sendMessageAction>>) {
      if ("error" in result) return;
      setMessages(prev => prev.some(m => m.id === result.id) ? prev : [...prev, result]);
      setConversations(prev => prev.map(c =>
        c.id === activeId
          ? { ...c, last_message_preview: text, last_message_at: result.created_at }
          : c,
      ));
    }

    sendMessageAction(activeId, text).then(applyAutoSent);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, msgsLoading, messages.length]);

  // ── Load messages when conversation changes ──────────────────────────────
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }

    setMsgsLoading(true);
    setMessages([]);

    getConversationMessages(activeId).then(msgs => {
      setMessages(msgs);
      setMsgsLoading(false);
    });

    // Mark as read
    if (activeConv) {
      markConversationRead(activeId, activeConv.is_buyer).then(() => {
        setConversations(prev => prev.map(c =>
          c.id === activeId ? { ...c, unread: 0 } : c,
        ));
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // ── Supabase Realtime subscription on active conversation ────────────────
  useEffect(() => {
    // Cleanup previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!activeId) return;

    const channel = supabase
      .channel(`chat:${activeId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "chat_messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        payload => {
          const incoming = payload.new as Omit<ChatMessage, "is_mine">;
          const newMsg: ChatMessage = { ...incoming, is_mine: incoming.sender_id === userId };

          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Update conversation preview
          setConversations(prev => prev.map(c =>
            c.id === activeId
              ? {
                  ...c,
                  last_message_preview: incoming.content.slice(0, 120),
                  last_message_at: incoming.created_at,
                  unread: incoming.sender_id === userId ? c.unread : 0, // já leu se está na conversa
                }
              : c,
          ));
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [activeId, userId]);

  // ── Also subscribe to conversation list updates (new conversations, unread) ─
  useEffect(() => {
    const channel = supabase
      .channel("conv-list-updates")
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "conversations",
        },
        payload => {
          const updated = payload.new as ConversationSummary & {
            buyer_unread: number;
            supplier_unread: number;
            buyer_id: string;
          };
          setConversations(prev => prev.map(c => {
            if (c.id !== updated.id) return c;
            const unread = c.is_buyer ? (updated as unknown as { buyer_unread: number }).buyer_unread : (updated as unknown as { supplier_unread: number }).supplier_unread;
            return {
              ...c,
              last_message_at:      (updated as unknown as { last_message_at: string }).last_message_at,
              last_message_preview: (updated as unknown as { last_message_preview: string }).last_message_preview,
              unread: c.id === activeId ? 0 : unread,
            };
          }));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeId]);

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || !activeId || sending) return;

    setSending(true);
    setSendError(null);
    setInputValue("");

    const result = await sendMessageAction(activeId, text);

    if ("error" in result) {
      setSendError(result.error);
      setInputValue(text); // restore
    } else {
      // Realtime will add the message; but add it immediately for snappiness
      setMessages(prev => {
        if (prev.some(m => m.id === result.id)) return prev;
        return [...prev, result];
      });
      setConversations(prev => prev.map(c =>
        c.id === activeId
          ? { ...c, last_message_preview: text, last_message_at: result.created_at }
          : c,
      ));
    }

    setSending(false);
    inputRef.current?.focus();
  }, [inputValue, activeId, sending]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function selectConversation(id: string) {
    setActiveId(id);
    setMobileView("chat");
    setSendError(null);
  }

  const filteredConvs = searchQuery.trim()
    ? conversations.filter(c =>
        c.other_party_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.last_message_preview ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : conversations;

  const totalUnread = conversations.reduce((acc, c) => acc + c.unread, 0);
  const messageGroups = groupMessagesByDate(messages);

  const headerLabel =
    role === "supplier" ? "Chat de Vendas" :
    role === "buyer"    ? "Chat de Compras" :
    "Chat";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    // Cancela o padding do shell e ocupa toda a viewport disponível
    <div className="-mx-4 -my-4 md:-mx-8 md:-my-8 flex h-[calc(100dvh-64px)] md:h-dvh overflow-hidden bg-white">

      {/* ═══════════════════════════════════════════════════════════
          LEFT — lista de conversas
      ═══════════════════════════════════════════════════════════ */}
      <div
        className={cn(
          "w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 bg-white shrink-0",
          mobileView === "chat" ? "hidden md:flex" : "flex",
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center gap-3 px-4 bg-(--brand-green-700) text-white shrink-0">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm select-none">
            {role === "supplier" ? "V" : "C"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">{headerLabel}</p>
            {totalUnread > 0 && (
              <p className="text-xs text-white/70">
                {totalUnread} não lida{totalUnread > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Mais opções"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-slate-100 shrink-0 bg-(--brand-green-50)">
          <div className="flex items-center gap-2 bg-white rounded-full px-3 py-1.5 shadow-sm border border-slate-100">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Pesquisar conversa"
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none min-w-0"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConvs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full px-6 gap-4 text-center">
              <MessageSquare className="w-10 h-10 text-slate-200" />
              <p className="text-sm text-slate-400">
                {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
              </p>
              {!searchQuery && role !== "supplier" && (
                <Link
                  href="/painel/explorar"
                  className="text-xs text-(--brand-green-600) underline underline-offset-2"
                >
                  Explorar produtos →
                </Link>
              )}
            </div>
          )}
          {filteredConvs.map(conv => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-b border-slate-50 hover:bg-slate-50",
                activeId === conv.id && "bg-slate-100 hover:bg-slate-100",
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 relative",
                  avatarClass(conv.other_party_name),
                )}
              >
                {conv.other_party_initials}
                {conv.online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {conv.other_party_name}
                  </p>
                  <span
                    className={cn(
                      "text-xs shrink-0",
                      conv.unread > 0 ? "text-(--brand-green-600) font-semibold" : "text-slate-400",
                    )}
                  >
                    {conv.last_message_at ? formatTime(conv.last_message_at) : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-slate-500 truncate">
                    {conv.last_message_preview ?? (
                      <span className="italic text-slate-400">Iniciar conversa</span>
                    )}
                  </p>
                  {conv.unread > 0 && (
                    <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-(--brand-green-600) text-white text-[10px] font-bold shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </div>
                {conv.context_type !== "direct" && (
                  <div className="mt-1">
                    <ContextBadge type={conv.context_type} productName={conv.product_name} />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          RIGHT — área de chat
      ═══════════════════════════════════════════════════════════ */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0",
          mobileView === "list" ? "hidden md:flex" : "flex",
        )}
      >
        {/* Nenhuma conversa selecionada */}
        {!activeConv && (
          <SelectConversationPanel />
        )}

        {/* Nenhuma conversa existe */}
        {!activeConv && conversations.length === 0 && (
          <EmptyState role={role} />
        )}

        {activeConv && (
          <>
            {/* Chat header */}
            <div className="h-16 flex items-center gap-3 px-3 md:px-4 bg-(--brand-green-700) text-white shrink-0">
              {/* Back (mobile) */}
              <button
                onClick={() => setMobileView("list")}
                className="md:hidden p-1.5 rounded-full hover:bg-white/10 transition-colors -ml-1 shrink-0"
                aria-label="Voltar"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Avatar */}
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 relative",
                  avatarClass(activeConv.other_party_name),
                )}
              >
                {activeConv.other_party_initials}
                {activeConv.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-(--brand-green-700) rounded-full" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">
                  {activeConv.other_party_name}
                </p>
                <p className="text-xs text-white/70 leading-tight truncate">
                  {activeConv.other_party_city && activeConv.other_party_state
                    ? `${activeConv.other_party_city}, ${activeConv.other_party_state}`
                    : activeConv.other_party_state ?? ""}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Vídeo">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Voz">
                  <Phone className="w-5 h-5" />
                </button>
                {activeConv.inquiry_id && (
                  <Link
                    href={`/painel/inquiries/${activeConv.inquiry_id}`}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    aria-label="Ver cotação"
                    title="Ver cotação vinculada"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </Link>
                )}
                <button className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Mais opções">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Context badge (inquiry / direct_purchase) */}
            {activeConv.context_type !== "direct" && (
              <div className="flex items-center gap-2 px-4 py-2 bg-(--brand-green-50) border-b border-(--brand-green-100) shrink-0">
                <ShoppingCart className="w-3.5 h-3.5 text-(--brand-green-600) shrink-0" />
                <p className="text-xs text-(--brand-green-700) flex-1 truncate">
                  <span className="font-semibold">
                    {activeConv.context_type === "inquiry" ? "Cotação vinculada" : "Compra direta"}
                  </span>
                  {activeConv.product_name && ` · ${activeConv.product_name}`}
                </p>
                {activeConv.inquiry_id && (
                  <Link
                    href={`/painel/inquiries/${activeConv.inquiry_id}`}
                    className="text-xs text-(--brand-green-600) hover:underline shrink-0"
                  >
                    Ver cotação
                  </Link>
                )}
              </div>
            )}

            {/* Negotiation context banner (from query params) */}
            {showNegCtx && negotiationContext && (
              <div className="flex items-start gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2.5 shrink-0">
                <ShoppingCart className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-800">Contexto de negociação</p>
                  <p className="text-xs text-amber-700 mt-0.5 truncate">
                    {[
                      negotiationContext.produto   && `Produto: ${negotiationContext.produto}`,
                      negotiationContext.quantidade && `Qtd: ${negotiationContext.quantidade}`,
                      negotiationContext.preco      && `Preço alvo: R$ ${negotiationContext.preco}`,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button
                  onClick={() => setShowNegCtx(false)}
                  className="text-amber-600 hover:text-amber-800 transition-colors shrink-0"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Messages area */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4"
              style={{
                backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
                backgroundSize:  "20px 20px",
                backgroundColor: "#f1f5f9",
              }}
            >
              {msgsLoading && (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
              )}

              {!msgsLoading && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <p className="text-sm text-slate-400">
                    Nenhuma mensagem ainda. Diga olá!
                  </p>
                </div>
              )}

              {!msgsLoading && messageGroups.map(group => (
                <div key={group.date} className="space-y-1 mb-1">
                  {/* Date separator */}
                  <div className="flex items-center justify-center py-3">
                    <span className="bg-white/90 text-slate-500 text-xs px-3 py-1 rounded-full shadow-sm border border-slate-100 select-none">
                      {group.date}
                    </span>
                  </div>

                  {/* Messages */}
                  {group.messages.map(msg => (
                    <div
                      key={msg.id}
                      className={cn("flex", msg.is_mine ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[78%] md:max-w-[60%] rounded-2xl px-3.5 py-2 shadow-sm",
                          msg.is_mine
                            ? "bg-(--brand-green-600) text-white rounded-tr-sm"
                            : "bg-white text-slate-800 rounded-tl-sm border border-slate-100/80",
                        )}
                      >
                        <p className="text-sm leading-relaxed wrap-break-word">{msg.content}</p>
                        <div
                          className={cn(
                            "flex items-center justify-end gap-1 mt-1",
                            msg.is_mine ? "text-white/60" : "text-slate-400",
                          )}
                        >
                          <span className="text-[10px]">
                            {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                          {msg.is_mine && <MsgStatus isRead={!!msg.read_at} />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="flex items-end gap-2 px-3 md:px-4 py-3 bg-(--brand-green-50) border-t border-slate-200 shrink-0">
              <button className="p-2.5 text-slate-500 hover:text-(--brand-green-700) transition-colors shrink-0" aria-label="Emoji">
                <Smile className="w-5 h-5" />
              </button>
              <button className="p-2.5 text-slate-500 hover:text-(--brand-green-700) transition-colors shrink-0" aria-label="Anexo">
                <Paperclip className="w-5 h-5" />
              </button>

              <div className="flex-1 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-slate-200 min-w-0">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escreva uma mensagem..."
                  rows={1}
                  className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none resize-none min-w-0 max-h-32 leading-6"
                  disabled={sending}
                />
                {sendError && (
                  <p className="text-xs text-red-500 mt-1">{sendError}</p>
                )}
              </div>

              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || sending}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all",
                  inputValue.trim() && !sending
                    ? "bg-(--brand-green-600) hover:bg-(--brand-green-700) text-white shadow-md"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed",
                )}
                aria-label="Enviar mensagem"
              >
                {sending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
