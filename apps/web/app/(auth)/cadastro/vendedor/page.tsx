import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import SupplierSignupForm from "./_components/supplier-signup-form";

export const metadata: Metadata = {
  title: "Criar conta de vendedor — GiroB2B",
  description: "Você foi aprovado pelo time GiroB2B. Conclua seu cadastro de vendedor.",
};

export const dynamic = "force-dynamic";

interface SearchParams {
  supplier_token?: string;
}

export default async function CadastroVendedorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { supplier_token } = await searchParams;

  if (!supplier_token) return <InvalidToken reason="missing" />;

  // Valida formato UUID antes de bater no DB (defesa rápida contra payloads grandes).
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(supplier_token)) return <InvalidToken reason="malformed" />;

  const admin = createAdminClient();

  // Lookup token + valida: existe, não-usado, não-expirado, status=approved
  const { data: row } = await admin
    .from("waitlist")
    .select(
      "id, email, cnpj, category, status, approval_token_expires_at, approval_token_used_at",
    )
    .eq("approval_token", supplier_token)
    .eq("role", "supplier")
    .maybeSingle<{
      id: string;
      email: string;
      cnpj: string;
      category: string;
      status: string;
      approval_token_expires_at: string;
      approval_token_used_at: string | null;
    }>();

  if (!row) return <InvalidToken reason="not_found" />;
  if (row.status !== "approved") return <InvalidToken reason="not_approved" />;
  if (row.approval_token_used_at) return <InvalidToken reason="used" />;
  if (new Date(row.approval_token_expires_at) < new Date()) {
    return <InvalidToken reason="expired" />;
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <div className="rounded-2xl border-2 border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)] p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0 text-[color:var(--brand-green-700)] mt-0.5" />
            <div>
              <p className="text-sm font-bold text-slate-900">
                Acesso liberado ✨
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Seu email <strong>{row.email}</strong> foi aprovado pelo time GiroB2B. Conclua o
                cadastro abaixo pra começar a usar a plataforma como vendedor.
              </p>
            </div>
          </div>
        </div>

        <SupplierSignupForm
          waitlistId={row.id}
          approvalToken={supplier_token}
          email={row.email}
          cnpj={row.cnpj}
          category={row.category}
        />
      </div>
    </div>
  );
}

function InvalidToken({ reason }: { reason: "missing" | "malformed" | "not_found" | "not_approved" | "used" | "expired" }) {
  const COPY: Record<typeof reason, { title: string; body: string }> = {
    missing:      { title: "Link inválido", body: "Faltou o token de aprovação na URL. Volte pra lista de espera e gere um novo." },
    malformed:    { title: "Link inválido", body: "O token na URL está malformado. Gere um novo na lista de espera." },
    not_found:    { title: "Link inválido",       body: "Não encontramos esse token. Pode ter sido revogado. Gere um novo na lista de espera." },
    not_approved: { title: "Acesso ainda não liberado", body: "Você está na lista, mas o time GiroB2B ainda não aprovou seu cadastro. Te avisamos por email." },
    used:         { title: "Link já usado",       body: "Esse token já foi usado pra criar uma conta. Se você esqueceu a senha, use 'Recuperar senha' no login." },
    expired:      { title: "Link expirado",       body: "O token vale 15 minutos pra segurança. Volte pra lista de espera e gere um novo." },
  };
  const { title, body } = COPY[reason];

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">{title}</p>
              <p className="text-xs text-amber-800 mt-1.5 leading-relaxed">{body}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href="/seja-vendedor"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-green-600)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--brand-green-700)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar pra lista de espera
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Fazer login (já tenho conta)
          </Link>
        </div>
      </div>
    </div>
  );
}
