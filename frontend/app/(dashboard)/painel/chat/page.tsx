import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MessageSquare, Image as ImageIcon, Link2, ShoppingCart, Store } from "lucide-react";

export const metadata = { title: "Chat — GiroB2B" };

const FEATURES_COMMON = [
  {
    icon: MessageSquare,
    title: "Mensagens em tempo real",
    desc: "Conversa fluida e responsiva diretamente na plataforma, sem precisar de WhatsApp.",
  },
  {
    icon: ImageIcon,
    title: "Envio de fotos",
    desc: "Compartilhe fotos de amostras, embalagens ou protótipos diretamente no chat.",
  },
  {
    icon: Link2,
    title: "Mencionar cotações",
    desc: "Referencie comparações e cotações dentro da conversa para negociar com contexto.",
  },
];

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  const role = profile?.role ?? "buyer";
  const isBoth = role === "both";

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)] px-3 py-1 text-xs font-semibold text-[color:var(--brand-green-700)]">
          Em desenvolvimento
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {role === "supplier" ? "Chat de Vendas" : "Chat"}
        </h1>
        <p className="text-base text-slate-500 leading-relaxed max-w-xl">
          {role === "supplier"
            ? "Converse com compradores interessados nos seus produtos. Negocie, tire dúvidas e feche negócios diretamente pela plataforma."
            : role === "buyer"
            ? "Converse com fornecedores sobre produtos, cotações e condições. Mencione comparações para barganhar melhores preços."
            : "Gerencie suas conversas como comprador e como vendedor em um só lugar, com abas separadas para cada papel."}
        </p>
      </div>

      {/* Tabs (apenas para "both") */}
      {isBoth && (
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="flex border-b border-border">
            <button className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-[color:var(--brand-green-700)] border-b-2 border-[color:var(--brand-green-600)] bg-[color:var(--brand-green-50)]">
              <ShoppingCart className="w-4 h-4" />
              Comprador
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
              <Store className="w-4 h-4" />
              Vendedor
            </button>
          </div>
          <div className="p-6 flex flex-col items-center justify-center gap-3 text-slate-400 min-h-40">
            <MessageSquare className="w-10 h-10 text-slate-200" />
            <p className="text-sm">Nenhuma conversa ainda</p>
          </div>
        </div>
      )}

      {/* Preview de conversa (não-both) */}
      {!isBoth && (
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold text-sm">
              E
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Empresa Exemplo</p>
              <p className="text-xs text-slate-400">São Paulo, SP</p>
            </div>
            <div className="ml-auto w-2 h-2 rounded-full bg-[color:var(--brand-green-500)]" title="Online" />
          </div>

          <div className="p-5 space-y-3 min-h-40 bg-slate-50">
            {/* Mensagem recebida */}
            <div className="flex gap-2 max-w-xs">
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-500 shrink-0 mt-1">E</div>
              <div className="rounded-2xl rounded-tl-sm bg-white border border-border px-3.5 py-2.5 text-sm text-slate-700 shadow-sm">
                Olá! Tenho interesse nos seus produtos de embalagem. Qual o prazo para 5.000 unidades?
              </div>
            </div>
            {/* Mensagem enviada */}
            <div className="flex gap-2 max-w-xs ml-auto flex-row-reverse">
              <div className="rounded-2xl rounded-tr-sm bg-[color:var(--brand-green-600)] px-3.5 py-2.5 text-sm text-white shadow-sm">
                Olá! Para esse volume, o prazo é de 7 dias úteis. Posso enviar uma proposta?
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-border px-4 py-3">
            <button className="text-slate-400 hover:text-slate-600 transition-colors p-1" aria-label="Enviar foto">
              <ImageIcon className="w-5 h-5" />
            </button>
            <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400">
              Escreva uma mensagem...
            </div>
            <div className="w-9 h-9 rounded-xl bg-[color:var(--brand-green-600)] flex items-center justify-center">
              <svg className="w-4 h-4 text-white fill-white" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </div>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {FEATURES_COMMON.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl border border-border bg-white p-5 space-y-3 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-[color:var(--brand-green-50)] flex items-center justify-center">
              <Icon className="w-5 h-5 text-[color:var(--brand-green-600)]" />
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-800">{title}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
