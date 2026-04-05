import type { Metadata } from "next";
import BuyerRegisterForm from "./buyer-register-form";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Cadastre seu acesso, confirme o email e entre na GiroB2B com seguranca.",
};

export default function CadastroPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="flex items-center justify-center px-5 py-12 bg-[radial-gradient(circle_at_top,_rgba(18,199,104,0.12),_transparent_45%),linear-gradient(180deg,_#ffffff_0%,_var(--brand-green-50)_100%)]">
        <BuyerRegisterForm />
      </div>

      <div className="hidden md:flex items-center justify-center bg-[linear-gradient(180deg,var(--brand-green-700)_0%,var(--brand-green-800)_100%)] text-white px-12 sticky top-0 h-screen">
        <div className="max-w-md space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-3xl font-bold">
            G
          </div>
          <p className="text-sm font-semibold tracking-widest uppercase opacity-80">
            Primeiros passos
          </p>
          <h2 className="text-4xl font-bold leading-tight">
            Comece pelo acesso e avance por etapas
          </h2>
          <p className="text-lg text-white/90 leading-relaxed">
            Nesta primeira fase vamos cuidar da entrada do usuario: cadastro, verificacao por email e login.
          </p>
          <ul className="space-y-4 text-base text-white/90">
            {[
              "Email e senha com validacao simples",
              "Codigo de confirmacao para concluir o cadastro",
              "Retorno ao login depois da verificacao",
              "Base pronta para seguir para onboarding e UX das proximas telas",
            ].map((text) => (
              <li key={text} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-white/80" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
