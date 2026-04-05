import type { Metadata } from "next";
import RedefinirSenhaForm from "./redefinir-senha-form";

export const metadata: Metadata = {
  title: "Redefinir senha",
  description: "Defina sua nova senha para acessar a GiroB2B novamente.",
};

export default function RedefinirSenhaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_45%),linear-gradient(180deg,_#ffffff_0%,_#f8fffc_100%)]">
      <RedefinirSenhaForm />
    </div>
  );
}
