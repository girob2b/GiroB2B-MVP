import type { Metadata } from "next";
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
  const { next } = await searchParams;
  // Sanitiza next: aceita só caminhos relativos começando com "/"
  const safeNext = typeof next === "string" && next.startsWith("/") ? next : null;

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <BuyerRegisterForm next={safeNext} />
      </div>
    </div>
  );
}
