import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NovaInquiryForm from "./nova-inquiry-form";

export const metadata = { title: "Publicar Necessidade" };

export default async function PublishNeedPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Publicar necessidade</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use este fluxo quando o produto ainda nao existe na plataforma. Esta tela usa o mesmo formulario de
          "Adicionar a lista de necessidades".
        </p>
      </div>
      <NovaInquiryForm />
    </div>
  );
}
