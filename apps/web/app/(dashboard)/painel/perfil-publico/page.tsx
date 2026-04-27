import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import PublicProfileContentForm, {
  type PublicProfileSupplier,
  type CategoryRow,
} from "./_components/public-profile-content-form";
import PublicProfileLayoutForm from "./_components/public-profile-layout-form";

export const metadata = { title: "Perfil público — GiroB2B" };

interface SupplierRow extends PublicProfileSupplier {
  slug: string;
  public_profile_layout: unknown | null;
}

function isMissingColumnError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "PGRST204"
  );
}

export default async function PerfilPublicoPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const supplierSelectBase =
    "id, slug, description, logo_url, phone, whatsapp, address, website, instagram, linkedin, founded_year, employee_count, operating_hours, categories, photos, profile_completeness";
  const supplierSelectWithLayout = `${supplierSelectBase}, public_profile_layout`;

  let res = await supabase
    .from("suppliers")
    .select(supplierSelectWithLayout)
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (res.error && isMissingColumnError(res.error)) {
    res = await supabase
      .from("suppliers")
      .select(supplierSelectBase)
      .eq("user_id", authData.user.id)
      .maybeSingle();
  }

  const supplier = res.data as SupplierRow | null;
  if (!supplier) redirect("/painel/perfil");

  const categoriesRes = await supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .order("sort_order");

  const allCategories = (categoriesRes.data as CategoryRow[]) ?? [];
  const rootCategories = allCategories.filter((c) => !c.parent_id);
  const subCategories = allCategories.filter((c) => !!c.parent_id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Perfil público</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tudo que aparece pra compradores no seu perfil público — identidade visual, sobre a empresa, redes, categorias e a ordem dos blocos.
          </p>
        </div>
        <Button
          type="button"
          render={<Link href={`/fornecedor/${supplier.slug}`} target="_blank" />}
          className="btn-secondary rounded-xl h-9 px-4 shrink-0"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Ver perfil público
        </Button>
      </div>

      <PublicProfileContentForm
        supplier={supplier}
        rootCategories={rootCategories}
        subCategories={subCategories}
      />

      <PublicProfileLayoutForm
        supplierSlug={supplier.slug}
        initialLayout={supplier.public_profile_layout ?? null}
      />
    </div>
  );
}
