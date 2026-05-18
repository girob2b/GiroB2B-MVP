import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BuyerRegisterForm from "./buyer-register-form";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Cadastre seu acesso, confirme o email e entre na GiroB2B com seguranca.",
};

interface SearchParams {
  next?: string;
  role?: string;
}

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { next, role } = await searchParams;

  // Defesa em camadas (decisão de produto 2026-05-14):
  // Vendedor anônimo não cria conta direto — vai pra /seja-vendedor (waitlist).
  // Mesmo se o link com ?role=supplier vazar em algum lugar, redirecionamos.
  if (role === "supplier" || role === "vendedor" || role === "seller") {
    redirect("/seja-vendedor");
  }

  // Sanitiza next: aceita só caminhos relativos começando com "/"
  const safeNext = typeof next === "string" && next.startsWith("/") ? next : null;

  // O CTA "Continuar sem cadastro" e a leitura dos params guest (email/title/UF)
  // ficam no próprio <BuyerRegisterForm> — assim a mesma UX aparece também no modal.
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <BuyerRegisterForm next={safeNext} />
      </div>
    </div>
  );
}
