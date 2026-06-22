import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUYER_PUBLIC_PROFILE_CONSENT_TEXT_VERSION } from "@/lib/schemas/buyers";
import { listPublicDemands, type DemandPublic } from "@/lib/services/demands";

// ─── Tipos de saída ──────────────────────────────────────────────────────────

/**
 * Shape público de uma empresa COMPRADORA opted-in.
 * Espelha a view buyers_public (migration 050) — SÓ campos não-PII.
 * NUNCA inclui email/phone/cnpj/address/cep/whatsapp.
 */
export interface PublicBuyerCompany {
  slug: string;
  company_name: string;
  /** Category slugs de interesse declarados no onboarding (buyers.segments). */
  sector_slugs: string[];
  city: string | null;
  state: string | null;
  /** Placeholder: buyers ainda não tem logo_url. Sempre null no MVP. */
  logo_url: string | null;
  /** Selo "Empresa Verificada" — quase sempre false (BrasilAPI off). */
  is_company_verified: boolean;
  /** created_at do buyer — usado para badge "membro desde {ano}". */
  member_since: string;
  /** Demandas abertas e não expiradas deste comprador. */
  open_demands_count: number;
}

/** Perfil público + demandas abertas (o "catálogo" da empresa compradora). */
export interface PublicBuyerCompanyDetail {
  company: PublicBuyerCompany;
  /** Demandas abertas da empresa, via demands_public (sem PII). */
  demands: DemandPublic[];
}

// Colunas da view buyers_public. Mantém paridade 1:1 com o SELECT da migration.
const BUYERS_PUBLIC_COLUMNS =
  "slug, company_name, sector_slugs, city, state, logo_url, is_company_verified, member_since, open_demands_count";

function normalizeRow(row: Record<string, unknown>): PublicBuyerCompany {
  return {
    slug: String(row.slug),
    company_name: String(row.company_name),
    sector_slugs: Array.isArray(row.sector_slugs)
      ? (row.sector_slugs as unknown[]).filter((s): s is string => typeof s === "string")
      : [],
    city: (row.city as string | null) ?? null,
    state: (row.state as string | null) ?? null,
    logo_url: (row.logo_url as string | null) ?? null,
    is_company_verified: Boolean(row.is_company_verified),
    member_since: String(row.member_since),
    open_demands_count: Number(row.open_demands_count ?? 0),
  };
}

// ─── Queries públicas (vitrine + perfil) ──────────────────────────────────────

/**
 * Lista empresas compradoras públicas para a vitrine da home.
 *
 * Lê SÓ a view buyers_public (apenas opted-in + identidade real, sem PII).
 * Ordena por: empresas com demandas abertas primeiro, depois mais recentes.
 *
 * BrasilAPI off → a vitrine fica VAZIA até compradores preencherem CNPJ +
 * razão social E ligarem o opt-in. Comportamento esperado; a home deve
 * degradar (não renderizar a seção) quando o array vier vazio.
 */
export async function listPublicBuyerCompanies(
  limit = 12
): Promise<PublicBuyerCompany[]> {
  const admin = createAdminClient();
  const safeLimit = Math.min(Math.max(limit, 1), 48);

  const { data, error } = await admin
    .from("buyers_public")
    .select(BUYERS_PUBLIC_COLUMNS)
    .order("open_demands_count", { ascending: false })
    .order("member_since", { ascending: false })
    .limit(safeLimit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>));
}

/**
 * Perfil público de uma empresa compradora + suas demandas abertas.
 *
 * Retorna null quando o slug não existe OU não é elegível (não opted-in / sem
 * identidade real) — a view buyers_public já filtra isso, então um slug não
 * elegível simplesmente não aparece. A página /empresa/[slug] deve dar notFound.
 *
 * As demandas vêm de demands_public (sem whatsapp_number), filtradas pelo buyer
 * via delivery — como demands_public não expõe buyer_user_id, fazemos o link
 * indireto: buscamos as demandas abertas do buyer pelo user_id (admin) e
 * reusamos o shape de demands_public para o frontend.
 */
export async function getPublicBuyerCompany(
  slug: string
): Promise<PublicBuyerCompanyDetail | null> {
  const admin = createAdminClient();

  const { data: companyRow, error } = await admin
    .from("buyers_public")
    .select(BUYERS_PUBLIC_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!companyRow) return null;

  const company = normalizeRow(companyRow as Record<string, unknown>);

  // Resolve o user_id do buyer (server-only, admin) para listar as demandas.
  // user_id NÃO é PII de contato — é só a chave de junção interna.
  const { data: buyerRow } = await admin
    .from("buyers")
    .select("user_id")
    .eq("slug", slug)
    .maybeSingle<{ user_id: string | null }>();

  let demands: DemandPublic[] = [];
  if (buyerRow?.user_id) {
    demands = await listOpenDemandsForBuyer(buyerRow.user_id);
  }

  return { company, demands };
}

/**
 * Demandas abertas de um buyer, no shape público (sem PII).
 * Lê demands (admin) restrito a status=open + não expiradas, projetando
 * exatamente as colunas de demands_public. Não retorna whatsapp_number.
 */
async function listOpenDemandsForBuyer(
  buyerUserId: string
): Promise<DemandPublic[]> {
  const admin = createAdminClient();
  // Mesma projeção pública de demands.ts (sem whatsapp_number).
  const PUBLIC_COLS =
    "id, slug, title, description, category_id, subcategory_slug, quantity, unit, budget_max_cents, deadline, delivery_city, delivery_state, photos_urls, kind, items, payment_terms, delivery_terms, required_docs, attachment_url, status, views_count, contact_count, published_at, expires_at, created_at";

  const { data, error } = await admin
    .from("demands")
    .select(PUBLIC_COLS)
    .eq("buyer_user_id", buyerUserId)
    .eq("status", "open")
    .gt("expires_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  // buyer_is_verified é TRUE por construção (o buyer é elegível na view); não
  // vem desta query, então preenchemos coerente com o estado público.
  return (data ?? []).map((row) => ({
    ...(row as Omit<DemandPublic, "buyer_is_verified">),
    buyer_is_verified: true,
  })) as DemandPublic[];
}

// listPublicDemands é reexportado por conveniência caso a home queira mesclar
// vitrine de empresas com feed de demandas numa única seção.
export { listPublicDemands };

// ─── Mutation: opt-in ──────────────────────────────────────────────────────────

export type SetOptInResult =
  | { ok: true; slug: string | null; optIn: boolean }
  | { ok: false; error: string };

/**
 * Liga/desliga o opt-in de perfil público via RPC SECURITY DEFINER.
 * A RPC valida auth.uid() = dono e exige cnpj+company_name quando opt_in=TRUE,
 * gravando consent_at + consent_text_version (versionado).
 *
 * Recebe um client com a sessão do usuário (createClient() do server) — NÃO o
 * admin — para que auth.uid() dentro da RPC resolva o usuário correto.
 */
export async function setBuyerPublicProfileOptIn(
  supabase: SupabaseClient,
  optIn: boolean
): Promise<SetOptInResult> {
  const { data, error } = await supabase.rpc("set_buyer_public_profile_opt_in", {
    p_opt_in: optIn,
    p_consent_text_version: optIn ? BUYER_PUBLIC_PROFILE_CONSENT_TEXT_VERSION : null,
  });

  if (error) {
    // Mensagens amigáveis para os RAISE EXCEPTION conhecidos da RPC.
    const msg = error.message || "";
    if (msg.includes("cnpj and company_name required")) {
      return {
        ok: false,
        error:
          "Para aparecer como empresa pública, preencha o CNPJ e a razão social da sua empresa.",
      };
    }
    if (msg.includes("buyer profile not found")) {
      return { ok: false, error: "Perfil de comprador não encontrado." };
    }
    if (msg.includes("auth required")) {
      return { ok: false, error: "Sessão expirada. Faça login novamente." };
    }
    return { ok: false, error: "Não foi possível atualizar a visibilidade pública." };
  }

  const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : null;
  return {
    ok: true,
    slug: (row?.slug as string | null) ?? null,
    optIn: Boolean(row?.opt_in),
  };
}
