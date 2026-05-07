import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DemandForm from "./_components/demand-form";

export const metadata: Metadata = { title: "Publicar necessidade" };
export const dynamic = "force-dynamic";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
}

interface BuyerRow {
  user_id: string;
  phone: string | null;
  city: string | null;
  state: string | null;
}

export default async function PostarNecessidadePage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const userId = authData.user.id;
  const admin = createAdminClient();

  const [{ data: categoriesData }, { data: buyerData }, { data: profileData }] = await Promise.all([
    admin
      .from("categories")
      .select("id, name, slug")
      .eq("active", true)
      .is("parent_id", null)
      .order("sort_order", { ascending: true }),
    admin
      .from("buyers")
      .select("user_id, phone, city, state")
      .eq("user_id", userId)
      .maybeSingle<BuyerRow>(),
    admin
      .from("user_profiles")
      .select("phone, city, state")
      .eq("id", userId)
      .maybeSingle<{ phone: string | null; city: string | null; state: string | null }>(),
  ]);

  const categories = (categoriesData ?? []) as CategoryRow[];

  const defaults = {
    whatsapp: buyerData?.phone ?? profileData?.phone ?? "",
    city: buyerData?.city ?? profileData?.city ?? "",
    state: buyerData?.state ?? profileData?.state ?? "",
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Publicar necessidade</h1>
        <p className="text-sm text-slate-500">
          Conte o que você precisa comprar — fornecedores qualificados entram em contato pelo WhatsApp.
        </p>
      </header>
      <DemandForm categories={categories} defaults={defaults} />
    </div>
  );
}
