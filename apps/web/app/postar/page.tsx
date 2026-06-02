import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import GuestDemandForm from "./_components/guest-demand-form";

export const metadata: Metadata = {
  title: "Publicar necessidade — GiroB2B",
  description: "Publique o que sua empresa precisa comprar. Vendedores qualificados te contatam pelo WhatsApp.",
};

export const dynamic = "force-dynamic";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
}

interface SearchParams {
  title?: string;
  category_id?: string;
  delivery_state?: string;
  /** Email pré-preenchido (vem da waitlist da landing — fluxo Comprador). */
  email?: string;
}

export default async function PostarPublicoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Se já estiver logado, manda pro form completo (com mais campos).
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (authData.user) {
    const params = await searchParams;
    const qs = new URLSearchParams();
    if (params.title) qs.set("title", params.title);
    if (params.category_id) qs.set("category_id", params.category_id);
    if (params.delivery_state) qs.set("delivery_state", params.delivery_state);
    redirect(`/painel/postar${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  const params = await searchParams;
  const admin = createAdminClient();
  const { data: categoriesData } = await admin
    .from("categories")
    .select("id, name, slug")
    .eq("active", true)
    .is("parent_id", null)
    .order("sort_order", { ascending: true });

  const categories = (categoriesData ?? []) as CategoryRow[];
  const allowedCategoryIds = new Set(categories.map((c) => c.id));

  const defaults = {
    title: typeof params.title === "string" ? params.title.slice(0, 120) : "",
    category_id:
      typeof params.category_id === "string" && allowedCategoryIds.has(params.category_id)
        ? params.category_id
        : "",
    delivery_state:
      typeof params.delivery_state === "string" && /^[A-Z]{2}$/.test(params.delivery_state)
        ? params.delivery_state
        : "",
    guest_email:
      typeof params.email === "string" && params.email.includes("@") && params.email.length <= 200
        ? params.email.trim().toLowerCase()
        : "",
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Publicar necessidade</h1>
        <p className="text-sm text-slate-500">
          Publique grátis, sem criar conta. Vendedores te contatam direto pelo WhatsApp.
        </p>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <strong>Sem cadastro = 1 publicação.</strong>{" "}
          <Link href="?auth=register" scroll={false} className="font-semibold text-amber-900 underline">
            Crie conta grátis
          </Link>{" "}
          pra publicar mais, gerenciar suas necessidades e ganhar o selo Verificado (compradores
          verificados têm prioridade no feed dos vendedores).
        </div>
      </header>
      <GuestDemandForm categories={categories} defaults={defaults} />
    </div>
  );
}
