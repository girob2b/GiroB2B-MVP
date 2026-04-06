import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PerfilForm from "./perfil-form";

export const metadata = { title: "Meu Perfil" };

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

interface SupplierRow {
  id: string;
  trade_name: string;
  company_name: string;
  cnpj: string;
  description: string | null;
  logo_url: string | null;
  phone: string;
  whatsapp: string | null;
  address: string | null;
  city: string;
  state: string;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  founded_year: number | null;
  employee_count: string | null;
  operating_hours: string | null;
  categories: string[] | null;
  photos: string[] | null;
  profile_completeness: number;
  plan: string;
  slug: string;
  public_profile_layout: unknown | null;
}

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  const userId = authData.user!.id;

  const supplierSelectBase =
    "id, trade_name, company_name, cnpj, description, logo_url, phone, whatsapp, address, city, state, website, instagram, linkedin, founded_year, employee_count, operating_hours, categories, photos, profile_completeness, plan, slug";
  const supplierSelectWithLayout = `${supplierSelectBase}, public_profile_layout`;

  let supplierRes = await supabase
    .from("suppliers")
    .select(supplierSelectWithLayout)
    .eq("user_id", userId)
    .maybeSingle();

  if (supplierRes.error && (supplierRes.error as any).code === "PGRST204") {
    supplierRes = await supabase
      .from("suppliers")
      .select(supplierSelectBase)
      .eq("user_id", userId)
      .maybeSingle();
  }

  const categoriesRes = await supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .order("sort_order");

  const supplier = supplierRes.data as SupplierRow | null;
  if (!supplier) redirect("/painel");

  const allCategories = (categoriesRes.data as CategoryRow[]) ?? [];
  const rootCategories = allCategories.filter((c) => !c.parent_id);
  const subCategories = allCategories.filter((c) => !!c.parent_id);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Complete seu perfil para aparecer melhor nas buscas e receber mais cotações.
        </p>
      </div>
      <PerfilForm
        supplier={supplier}
        rootCategories={rootCategories}
        subCategories={subCategories}
      />
    </div>
  );
}
