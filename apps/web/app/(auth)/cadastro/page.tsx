import type { Metadata } from "next";
import BuyerRegisterForm from "./buyer-register-form";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Cadastre seu acesso, confirme o email e entre na GiroB2B com seguranca.",
};

export default function CadastroPage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <BuyerRegisterForm />
      </div>
    </div>
  );
}
