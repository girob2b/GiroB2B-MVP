import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfigForm from "./_components/config-form";

export const metadata = { title: "Configurações — GiroB2B" };

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const meta = user.user_metadata ?? {};
  let role = (meta.segment as string) || (meta.role as string) || "buyer";

  // Se não for "both" no metadata, vamos verificar se ele existe em ambas as tabelas
  // para garantir que o perfil reflita a realidade do banco de dados
  if (role !== "both") {
    const [supplierCheck, buyerCheck] = await Promise.all([
      supabase.from("suppliers").select("id").eq("user_id", user.id).maybeSingle(),
      supabase.from("buyers").select("id").eq("user_id", user.id).maybeSingle(),
    ]);
    
    if (supplierCheck.data && buyerCheck.data) {
      role = "both";
    } else if (supplierCheck.data) {
      role = "supplier";
    } else if (buyerCheck.data) {
      role = "buyer";
    }
  }

  let supplier: any = null;
  if (role === "supplier" || role === "both") {
    const { data, error } = await supabase
      .from("suppliers")
      .select(
        "id, cnpj, company_name, trade_name, phone, whatsapp, address, cep, city, state, " +
        "inscricao_municipal, inscricao_estadual, situacao_fiscal, " +
        "plan, profile_completeness, is_verified"
      )
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (!error && data) {
      supplier = data;
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie o perfil, endereço e dados fiscais da sua empresa.
        </p>
      </div>

      {supplier ? (
        <ConfigForm supplier={supplier} userRole={role} />
      ) : (
        <div className="rounded-2xl border border-border bg-white shadow-sm p-8 text-center space-y-2">
          <p className="font-medium text-slate-700">Nenhum perfil de fornecedor vinculado.</p>
          <p className="text-sm text-slate-400">
            Esta seção é destinada a vendedores. Se você acredita que isso é um erro, entre em contato com o suporte.
          </p>
        </div>
      )}
    </div>
  );
}
