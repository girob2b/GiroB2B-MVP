import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./_components/profile-form";

export const metadata = { title: "Meu Perfil" };

interface BuyerRow {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  company_name: string | null;
  cnpj: string | null;
  inscricao_municipal: string | null;
  inscricao_estadual: string | null;
  address: string | null;
  cep: string | null;
  purchase_frequency: string | null;
  is_company_verified: boolean;
}

interface SupplierRow {
  id: string;
  trade_name: string;
  company_name: string;
  cnpj: string;
  phone: string;
  whatsapp: string | null;
  address: string | null;
  cep: string | null;
  city: string;
  state: string;
  inscricao_municipal: string | null;
  inscricao_estadual: string | null;
  situacao_fiscal: string | null;
  profile_completeness: number;
  plan: string;
  is_verified: boolean;
  allow_relisting: boolean;
}

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  const userId = authData.user!.id;

  const supplierRes = await supabase
    .from("suppliers")
    .select(
      "id, trade_name, company_name, cnpj, phone, whatsapp, address, cep, city, state, inscricao_municipal, inscricao_estadual, situacao_fiscal, profile_completeness, plan, is_verified, allow_relisting"
    )
    .eq("user_id", userId)
    .maybeSingle();

  const supplier = supplierRes.data as SupplierRow | null;

  const buyerRes = await supabase
    .from("buyers")
    .select("id, name, email, phone, city, state, company_name, cnpj, inscricao_municipal, inscricao_estadual, address, cep, purchase_frequency")
    .eq("user_id", userId)
    .maybeSingle<Omit<BuyerRow, "is_company_verified">>();
  const buyerBase = buyerRes.data;

  // Carrega `is_company_verified` em query separada — se a migration 030 ainda não foi
  // aplicada, a coluna não existe e o select falha. Isolar evita quebrar a página inteira
  // (o selo simplesmente não renderiza até a migration rodar).
  let isCompanyVerified = false;
  if (buyerBase) {
    const verifyRes = await supabase
      .from("buyers")
      .select("is_company_verified")
      .eq("user_id", userId)
      .maybeSingle<{ is_company_verified: boolean }>();
    isCompanyVerified = verifyRes.data?.is_company_verified ?? false;
  }
  const buyer: BuyerRow | null = buyerBase
    ? { ...buyerBase, is_company_verified: isCompanyVerified }
    : null;

  // Estado do opt-in de perfil público (migration 050). Em query isolada e
  // tolerante: se as colunas ainda não existem (migration não aplicada), o
  // toggle simplesmente não renderiza — não quebra a página.
  let publicProfileOptIn = false;
  let publicProfileSlug: string | null = null;
  let publicProfileAvailable = false;
  if (buyer) {
    const optInRes = await supabase
      .from("buyers")
      .select("public_profile_opt_in, slug")
      .eq("user_id", userId)
      .maybeSingle<{ public_profile_opt_in: boolean | null; slug: string | null }>();
    if (!optInRes.error && optInRes.data) {
      publicProfileAvailable = true;
      publicProfileOptIn = optInRes.data.public_profile_opt_in ?? false;
      publicProfileSlug = optInRes.data.slug ?? null;
    }
  }

  // Preferências de ranqueamento do comparador (migration 052). Query isolada e
  // tolerante: se as colunas não existem (migration pendente), o formulário não
  // renderiza — não quebra a página. Só carrega para compradores.
  let rankingWeights: { price: number; deadline: number; distance: number } | null = null;
  let rankingPaymentPreference: string[] | null = null;
  let rankingPrefsAvailable = false;
  if (buyer) {
    const rankingRes = await supabase
      .from("buyers")
      .select("ranking_weights, payment_preference")
      .eq("user_id", userId)
      .maybeSingle<{
        ranking_weights: { price: number; deadline: number; distance: number } | null;
        payment_preference: string[] | null;
      }>();
    if (!rankingRes.error) {
      rankingPrefsAvailable = true;
      rankingWeights = rankingRes.data?.ranking_weights ?? null;
      rankingPaymentPreference = rankingRes.data?.payment_preference ?? null;
    }
  }

  const profileRes = await supabase
    .from("user_profiles")
    .select("last_role_change_at")
    .eq("id", userId)
    .maybeSingle<{ last_role_change_at: string | null }>();
  const lastRoleChangeAt = profileRes.data?.last_role_change_at ?? null;

  const pendingRequestRes = await supabase
    .from("role_change_requests")
    .select("id, current_mode, target_mode, requested_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      current_mode: "buyer" | "supplier";
      target_mode: "buyer" | "supplier";
      requested_at: string;
    }>();
  const pendingRoleRequest = pendingRequestRes.data ?? null;

  // user_metadata.initial_segment_chosen é setado explicitamente como `false`
  // pelo skipOnboarding. Pra qualquer outro caso (inclusive users pré-feature
  // sem a flag), tratamos como `true` — modo normal de troca via aprovação admin.
  const initialSegmentChosen = authData.user!.user_metadata?.initial_segment_chosen !== false;

  // Sem supplier nem buyer → redireciona direto pro explorar (evita double
  // redirect via /onboarding que quebra o RSC fetch do Next.js).
  if (!supplier && !buyer) {
    redirect("/painel/explorar");
  }

  // Pra supplier sem buyer, deriva um shape de buyer pra preencher o card "Dados da empresa".
  // O save em updateBuyerProfile cria a row em buyers se não existir.
  const effectiveBuyer = buyer ?? {
    id: supplier!.id,
    name: supplier!.trade_name ?? null,
    email: authData.user!.email ?? "",
    phone: supplier!.phone ?? null,
    city: supplier!.city ?? null,
    state: supplier!.state ?? null,
    company_name: supplier!.company_name ?? null,
    cnpj: supplier!.cnpj ?? null,
    inscricao_municipal: supplier!.inscricao_municipal ?? null,
    inscricao_estadual: supplier!.inscricao_estadual ?? null,
    address: supplier!.address ?? null,
    cep: supplier!.cep ?? null,
    purchase_frequency: null,
    is_company_verified: supplier!.is_verified ?? false,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Mantenha seus dados atualizados pra fornecedores te encontrarem com facilidade.
        </p>
      </div>
      <Suspense fallback={null}>
        <ProfileForm
          buyer={effectiveBuyer}
          supplier={supplier}
          hasRealBuyer={!!buyer}
          lastRoleChangeAt={lastRoleChangeAt}
          pendingRoleRequest={pendingRoleRequest}
          initialSegmentChosen={initialSegmentChosen}
          publicProfile={
            publicProfileAvailable
              ? { optIn: publicProfileOptIn, slug: publicProfileSlug }
              : null
          }
          rankingPrefs={
            rankingPrefsAvailable
              ? { weights: rankingWeights, paymentPreference: rankingPaymentPreference }
              : null
          }
        />
      </Suspense>
    </div>
  );
}
