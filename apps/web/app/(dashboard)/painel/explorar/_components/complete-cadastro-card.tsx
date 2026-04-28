import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

/**
 * Nudge persistente exibido no topo da Explorar enquanto o user não completou
 * os dados B2B (CNPJ, razão social, endereço, etc.).
 *
 * Princípio "facilitar comprador" (memory: project_buyer_friction_principle):
 * em vez de barrar o usuário com onboarding multi-step, deixamos ele entrar
 * direto e cobramos os dados em momento estratégico — aqui, na primeira tela
 * que ele vê. Cadastro completo libera envio de cotação + selo "Empresa
 * Verificada".
 */
export function CompleteCadastroCard() {
  return (
    <section
      aria-label="Complete seu cadastro"
      className="relative overflow-hidden rounded-2xl border border-[color:var(--brand-green-200)] bg-gradient-to-r from-[color:var(--brand-green-50)] to-white p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--brand-green-700)] text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-900">
              Complete seu cadastro para usar todas as funcionalidades
            </p>
            <p className="text-sm text-slate-600">
              Você já pode explorar a plataforma. Para enviar cotações, conversar com
              fornecedores e conquistar o selo{" "}
              <span className="inline-flex items-center gap-1 align-middle font-medium text-[color:var(--brand-green-700)]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Empresa Verificada
              </span>
              , preencha os dados da sua empresa.
            </p>
          </div>
        </div>

        <Link
          href="/painel/perfil"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-green-700)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--brand-green-800)]"
        >
          Completar meu cadastro
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
