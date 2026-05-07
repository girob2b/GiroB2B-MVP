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

interface SearchParams {
  title?: string;
  description?: string;
  category_id?: string;
  delivery_state?: string;
  delivery_city?: string;
}

export default async function PostarNecessidadePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const userId = authData.user.id;
  const admin = createAdminClient();
  const params = await searchParams;

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

  // Validação dos query params: só aceita category_id que exista na lista carregada,
  // só aceita delivery_state que esteja no padrão UF de 2 letras maiúsculas.
  const allowedCategoryIds = new Set(categories.map((c) => c.id));
  const prefilledCategoryId =
    typeof params.category_id === "string" && allowedCategoryIds.has(params.category_id)
      ? params.category_id
      : "";
  const prefilledState =
    typeof params.delivery_state === "string" && /^[A-Z]{2}$/.test(params.delivery_state)
      ? params.delivery_state
      : "";

  const defaults = {
    title: typeof params.title === "string" ? params.title.slice(0, 120) : "",
    description: typeof params.description === "string" ? params.description.slice(0, 5000) : "",
    category_id: prefilledCategoryId,
    whatsapp: buyerData?.phone ?? profileData?.phone ?? "",
    city: typeof params.delivery_city === "string"
      ? params.delivery_city
      : buyerData?.city ?? profileData?.city ?? "",
    state: prefilledState || (buyerData?.state ?? profileData?.state ?? ""),
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
