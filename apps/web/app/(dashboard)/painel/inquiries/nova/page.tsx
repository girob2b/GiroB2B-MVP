import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NovaInquiryForm from "./nova-inquiry-form";

export const metadata = { title: "Nova Cotação" };

export default async function NovaInquiryPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nova cotação</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Publique sua necessidade de compra. Fornecedores cadastrados poderão ver e entrar em contato com você.
        </p>
      </div>
      <NovaInquiryForm />
    </div>
  );
}
