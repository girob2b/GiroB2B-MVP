import type { Metadata } from "next";
import RecuperarSenhaForm from "./recuperar-senha-form";
import { GiroLogo } from "@/components/ui/giro-logo";

export const metadata: Metadata = { title: "Recuperar Senha" };

export default function RecuperarSenhaPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="flex items-center justify-center px-5 py-12 bg-[radial-gradient(circle_at_top,rgba(10,92,92,0.10),transparent_45%),linear-gradient(180deg,#ffffff_0%,var(--brand-surface)_100%)]">
        <RecuperarSenhaForm />
      </div>

      <div className="hidden md:flex items-center justify-center bg-[linear-gradient(155deg,var(--brand-green-600)_0%,var(--brand-green-700)_48%,var(--brand-green-800)_100%)] text-white px-12">
        <div className="max-w-md space-y-6">
          <GiroLogo variant="light" iconOnly size={64} />
          <p className="text-sm font-semibold tracking-widest uppercase opacity-80">
            Suporte de acesso
          </p>
          <h2 className="text-4xl font-bold leading-tight">
            Recupere sua senha com segurança
          </h2>
          <p className="text-lg text-white/90 leading-relaxed">
            Enviaremos um link único para redefinir a senha. Depois disso você volta ao login com a nova credencial.
          </p>
          <ul className="space-y-3 text-base text-white/90">
            {[
              "Link de recuperação enviado por email",
              "Fluxo de redefinição final dentro da própria plataforma",
              "Orientações claras se o link expirar ou já tiver sido usado",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-white/80" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
