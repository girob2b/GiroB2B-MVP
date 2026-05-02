import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NovaCotacaoForm from "./nova-cotacao-form";

export const metadata = { title: "Criar Nova Cotacao" };

export default async function NewQuotePage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Criar nova cotacao</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preencha os dados da cotacao para abrir a demanda na plataforma.
        </p>
      </div>
      <NovaCotacaoForm />
    </div>
  );
}
