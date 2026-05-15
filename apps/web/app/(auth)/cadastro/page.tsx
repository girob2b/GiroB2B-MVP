import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Zap } from "lucide-react";
import BuyerRegisterForm from "./buyer-register-form";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Cadastre seu acesso, confirme o email e entre na GiroB2B com seguranca.",
};

interface SearchParams {
  next?: string;
  role?: string;
  email?: string;
  title?: string;
  category_id?: string;
  delivery_state?: string;
}

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { next, role, email, title, category_id, delivery_state } = await searchParams;

  // Defesa em camadas (decisão de produto 2026-05-14):
  // Vendedor anônimo não cria conta direto — vai pra /seja-vendedor (waitlist).
  // Mesmo se o link com ?role=supplier vazar em algum lugar, redirecionamos.
  if (role === "supplier" || role === "vendedor" || role === "seller") {
    redirect("/seja-vendedor");
  }

  // Sanitiza next: aceita só caminhos relativos começando com "/"
  const safeNext = typeof next === "string" && next.startsWith("/") ? next : null;

  // Preserva os params que fazem sentido pro fluxo guest (publicar sem cadastro).
  const guestQs = new URLSearchParams();
  if (typeof email === "string" && email.includes("@")) guestQs.set("email", email);
  if (typeof title === "string" && title) guestQs.set("title", title);
  if (typeof category_id === "string" && category_id) guestQs.set("category_id", category_id);
  if (typeof delivery_state === "string" && /^[A-Z]{2}$/.test(delivery_state)) {
    guestQs.set("delivery_state", delivery_state);
  }
  const postarHref = `/postar${guestQs.toString() ? `?${guestQs.toString()}` : ""}`;

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-5">
        {/* CTA chamativo: a maior parte dos compradores não precisa de conta pra
            publicar a primeira necessidade. Vem em destaque acima do form. */}
        <Link
          href={postarHref}
          className="group flex items-center justify-between gap-3 rounded-2xl border-2 border-[color:var(--brand-green-600)] bg-[color:var(--brand-green-50)] px-4 py-3.5 shadow-sm transition hover:bg-[color:var(--brand-green-100)] hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-green-600)] text-white">
              <Zap className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-[color:var(--brand-green-800)]">
                Continuar sem cadastro
              </p>
              <p className="text-xs text-[color:var(--brand-green-700)]">
                Publique sua necessidade agora — leva 1 minuto.
              </p>
            </div>
          </div>
          <span aria-hidden className="text-lg font-bold text-[color:var(--brand-green-700)] transition group-hover:translate-x-0.5">
            →
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs uppercase tracking-wider text-slate-400">ou crie conta</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <BuyerRegisterForm next={safeNext} />
      </div>
    </div>
  );
}
