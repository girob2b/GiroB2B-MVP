import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatPriceBRL as _formatPriceBRL } from "@/lib/format-price";
import type {
  CreateDemandInput,
  DemandItem,
  DemandKind,
  DemandStatus,
  UpdateDemandInput,
} from "@/lib/schemas/demands";
import { LGPD_CONSENT_TEXT_VERSION } from "@/lib/schemas/demands";
import type { OfferInput } from "@/lib/schemas/leads";

// ─── Tipos de saída ──────────────────────────────────────────────────────────

export interface DemandPublic {
  id: string;
  slug: string;
  title: string;
  description: string;
  category_id: string | null;
  subcategory_slug: string | null;
  quantity: number | null;
  unit: string | null;
  budget_max_cents: number | null;
  deadline: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  photos_urls: string[];
  // Modo estruturado (migration 037 — 2026-05-14)
  kind: DemandKind;
  items: DemandItem[] | null;
  payment_terms: string | null;
  delivery_terms: string | null;
  required_docs: string | null;
  attachment_url: string | null;
  status: DemandStatus;
  views_count: number;
  contact_count: number;
  published_at: string;
  expires_at: string;
  created_at: string;
  // Comprador verificado (migration 039) — CNPJ + razão social preenchidos.
  buyer_is_verified: boolean;
  // Data de cadastro do comprador (migration 047). Null para guests ou buyers sem cadastro.
  // Usado para exibir "membro desde {ano}" no trust badge.
  // Campo disponível APÓS aplicação manual de 047_bloco3_search_and_hub.sql.
  buyer_member_since?: string | null;
}

export interface DemandWithContact extends DemandPublic {
  whatsapp_number: string;
}

// Colunas base — disponíveis desde a migration 039.
// buyer_member_since é adicionado pela migration 047 e não consta aqui para que
// o build e a aplicação não quebrem antes da aplicação manual da migration.
// Após aplicar 047_bloco3_search_and_hub.sql, adicionar buyer_member_since aqui.
const DEMAND_PUBLIC_COLUMNS =
  "id, slug, title, description, category_id, subcategory_slug, quantity, unit, budget_max_cents, deadline, delivery_city, delivery_state, photos_urls, kind, items, payment_terms, delivery_terms, required_docs, attachment_url, status, views_count, contact_count, published_at, expires_at, created_at, buyer_is_verified";

// ─── Slug ─────────────────────────────────────────────────────────────────────

function baseSlug(title: string): string {
  return title
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function randomSuffix(len = 6): string {
  return Math.random().toString(36).slice(2, 2 + len);
}

async function pickUniqueSlug(title: string): Promise<string> {
  const admin = createAdminClient();
  const base = baseSlug(title) || "demanda";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomSuffix(4)}`;
    const { data } = await admin.from("demands").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${randomSuffix(8)}`;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createDemand(buyerUserId: string, input: CreateDemandInput) {
  const admin = createAdminClient();
  const slug = await pickUniqueSlug(input.title);

  const payload: Record<string, unknown> = {
    buyer_user_id: buyerUserId,
    slug,
    title: input.title.trim(),
    description: input.description?.trim() ?? null,
    category_id: input.category_id ?? null,
    subcategory_slug: input.subcategory_slug ?? null,
    quantity: input.quantity ?? null,
    unit: input.unit ?? null,
    budget_max_cents: input.budget_max_cents ?? null,
    deadline: input.deadline ?? null,
    delivery_city: input.delivery_city ?? null,
    delivery_state: input.delivery_state ?? null,
    whatsapp_number: input.whatsapp_number,
    photos_urls: input.photos_urls ?? [],
    kind: input.kind,
    lgpd_consent: true,
    lgpd_consent_at: new Date().toISOString(),
    lgpd_consent_text_version: LGPD_CONSENT_TEXT_VERSION,
  };

  if (input.kind === "structured") {
    payload.items = input.items;
    payload.payment_terms = input.payment_terms ?? null;
    payload.delivery_terms = input.delivery_terms ?? null;
    payload.required_docs = input.required_docs ?? null;
    payload.attachment_url = input.attachment_url ?? null;
  }

  const { data, error } = await admin
    .from("demands")
    .insert(payload)
    .select("id, slug")
    .single<{ id: string; slug: string }>();

  if (error || !data) {
    throw new Error(error?.message ?? "Não foi possível publicar a necessidade.");
  }
  return data;
}

// ─── Guest demand (publicação sem cadastro) ──────────────────────────────────

export async function countGuestDemandsByEmail(email: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("demands")
    .select("id", { count: "exact", head: true })
    .eq("guest_email", email.toLowerCase().trim());
  return count ?? 0;
}

export async function createGuestDemand(
  guest: { name: string; email: string; whatsapp: string },
  input: Omit<CreateDemandInput, "whatsapp_number" | "lgpd_consent"> & { lgpd_consent: true }
) {
  const admin = createAdminClient();
  const slug = await pickUniqueSlug(input.title);
  const email = guest.email.toLowerCase().trim();

  // Limite: 1 publicação por email guest. Pra mais, exige cadastro.
  const existing = await countGuestDemandsByEmail(email);
  if (existing >= 1) {
    throw new Error(
      "Você já publicou uma necessidade como visitante. Crie sua conta gratuita para publicar mais."
    );
  }

  const payload: Record<string, unknown> = {
    buyer_user_id: null,
    guest_name: guest.name.trim(),
    guest_email: email,
    guest_whatsapp: guest.whatsapp,
    slug,
    title: input.title.trim(),
    description: input.description?.trim() ?? null,
    category_id: input.category_id ?? null,
    subcategory_slug: input.subcategory_slug ?? null,
    quantity: input.quantity ?? null,
    unit: input.unit ?? null,
    budget_max_cents: input.budget_max_cents ?? null,
    deadline: input.deadline ?? null,
    delivery_city: input.delivery_city ?? null,
    delivery_state: input.delivery_state ?? null,
    whatsapp_number: guest.whatsapp,
    photos_urls: input.photos_urls ?? [],
    kind: input.kind,
    lgpd_consent: true,
    lgpd_consent_at: new Date().toISOString(),
    lgpd_consent_text_version: LGPD_CONSENT_TEXT_VERSION,
  };

  if (input.kind === "structured") {
    payload.items = input.items;
    payload.payment_terms = input.payment_terms ?? null;
    payload.delivery_terms = input.delivery_terms ?? null;
    payload.required_docs = input.required_docs ?? null;
    payload.attachment_url = input.attachment_url ?? null;
  }

  const { data, error } = await admin
    .from("demands")
    .insert(payload)
    .select("id, slug")
    .single<{ id: string; slug: string }>();

  if (error || !data) {
    throw new Error(error?.message ?? "Não foi possível publicar a necessidade.");
  }
  return data;
}

export async function updateDemand(
  buyerUserId: string,
  demandId: string,
  input: UpdateDemandInput
) {
  const admin = createAdminClient();

  // Guard: só o dono pode editar
  const { data: existing, error: lookupError } = await admin
    .from("demands")
    .select("buyer_user_id, status")
    .eq("id", demandId)
    .maybeSingle<{ buyer_user_id: string; status: DemandStatus }>();

  if (lookupError) throw new Error(lookupError.message);
  if (!existing) throw new Error("Necessidade não encontrada.");
  if (existing.buyer_user_id !== buyerUserId) throw new Error("Acesso negado.");

  const updatePayload: Record<string, unknown> = {};
  if (input.title !== undefined) updatePayload.title = input.title.trim();
  if (input.description !== undefined) updatePayload.description = input.description?.trim() ?? null;
  if (input.category_id !== undefined) updatePayload.category_id = input.category_id;
  if (input.subcategory_slug !== undefined) updatePayload.subcategory_slug = input.subcategory_slug;
  if (input.quantity !== undefined) updatePayload.quantity = input.quantity;
  if (input.unit !== undefined) updatePayload.unit = input.unit;
  if (input.budget_max_cents !== undefined) updatePayload.budget_max_cents = input.budget_max_cents;
  if (input.deadline !== undefined) updatePayload.deadline = input.deadline;
  if (input.delivery_city !== undefined) updatePayload.delivery_city = input.delivery_city;
  if (input.delivery_state !== undefined) updatePayload.delivery_state = input.delivery_state;
  if (input.whatsapp_number !== undefined) updatePayload.whatsapp_number = input.whatsapp_number;
  if (input.photos_urls !== undefined) updatePayload.photos_urls = input.photos_urls;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.items !== undefined) updatePayload.items = input.items;
  if (input.payment_terms !== undefined) updatePayload.payment_terms = input.payment_terms;
  if (input.delivery_terms !== undefined) updatePayload.delivery_terms = input.delivery_terms;
  if (input.required_docs !== undefined) updatePayload.required_docs = input.required_docs;
  if (input.attachment_url !== undefined) updatePayload.attachment_url = input.attachment_url;

  if (Object.keys(updatePayload).length === 0) return { id: demandId };

  const { error: updateError } = await admin.from("demands").update(updatePayload).eq("id", demandId);
  if (updateError) throw new Error(updateError.message);
  return { id: demandId };
}

export async function deleteDemand(buyerUserId: string, demandId: string) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("demands")
    .select("buyer_user_id")
    .eq("id", demandId)
    .maybeSingle<{ buyer_user_id: string }>();
  if (!existing) throw new Error("Necessidade não encontrada.");
  if (existing.buyer_user_id !== buyerUserId) throw new Error("Acesso negado.");
  const { error } = await admin.from("demands").delete().eq("id", demandId);
  if (error) throw new Error(error.message);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listMyDemands(buyerUserId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("demands")
    .select("id, slug, title, description, category_id, status, views_count, contact_count, deadline, delivery_city, delivery_state, published_at, expires_at, created_at, updated_at")
    .eq("buyer_user_id", buyerUserId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface DemandFeedFilters {
  query?: string | null;
  category_id?: string | null;
  state?: string | null;
  kind?: DemandKind | null;
  /** True = só compradores verificados (CNPJ + razão social). */
  only_verified?: boolean;
  /**
   * #11 feed-vendedor-nao-contatadas — quando fornecido, exclui do feed as
   * demands que este supplier já contatou (via demand_contacts).
   * Valor = suppliers.id (UUID) do supplier logado.
   */
  exclude_contacted_by_supplier_id?: string | null;
  /**
   * #3 demandas-novas-desde-ultima-visita — quando fornecido, retorna apenas
   * demands criadas após este timestamp.
   * Valor = suppliers.last_feed_view_at (ISO string).
   */
  only_since?: string | null;
  /**
   * #19 demandas-relacionadas — exclui uma demand específica do resultado.
   * Usado em /necessidade/[slug] para não exibir a própria demand como relacionada.
   */
  exclude_id?: string | null;
  /**
   * #7 busca-facetada-decente — ordenação escolhível.
   * - 'recent'   (default): buyer_is_verified DESC, published_at DESC
   * - 'contacts': contact_count DESC, published_at DESC
   * - 'deadline': deadline ASC NULLS LAST, published_at DESC
   */
  sort?: "recent" | "contacts" | "deadline" | null;
  limit?: number;
  offset?: number;
}

export async function listPublicDemands(filters: DemandFeedFilters = {}) {
  const admin = createAdminClient();

  // #7 busca-facetada-decente — ordenação escolhível.
  // Default: verificados primeiro, depois mais recentes.
  const sort = filters.sort ?? "recent";
  let q = admin
    .from("demands_public")
    .select(DEMAND_PUBLIC_COLUMNS, { count: "exact" });

  if (sort === "contacts") {
    q = q
      .order("contact_count", { ascending: false })
      .order("published_at", { ascending: false });
  } else if (sort === "deadline") {
    q = q
      .order("deadline", { ascending: true, nullsFirst: false })
      .order("published_at", { ascending: false });
  } else {
    // 'recent' (default) — verificados antes, depois publicação mais recente.
    q = q
      .order("buyer_is_verified", { ascending: false })
      .order("published_at", { ascending: false });
  }

  // #7 — query expandida: title OU description (antes: só title).
  if (filters.query) {
    const escaped = filters.query.replace(/%/g, "\\%").replace(/_/g, "\\_");
    q = q.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`);
  }
  if (filters.category_id) q = q.eq("category_id", filters.category_id);
  if (filters.state) q = q.eq("delivery_state", filters.state.toUpperCase());
  if (filters.kind) q = q.eq("kind", filters.kind);
  if (filters.only_verified) q = q.eq("buyer_is_verified", true);

  // #3 — só demands criadas após o último acesso ao feed do supplier.
  if (filters.only_since) {
    q = q.gt("created_at", filters.only_since);
  }

  // #11 — exclui demands já contatadas por este supplier.
  // Busca o conjunto de demand_ids contatados e aplica NOT IN.
  // Limite conservador de 1000 IDs (praticamente impossível de atingir no MVP).
  if (filters.exclude_contacted_by_supplier_id) {
    const { data: contacted } = await admin
      .from("demand_contacts")
      .select("demand_id")
      .eq("supplier_id", filters.exclude_contacted_by_supplier_id)
      .limit(1000);

    const contactedIds = (contacted ?? []).map((r) => r.demand_id as string);
    // Se não há contatadas, o filtro é no-op (evita NOT IN com lista vazia).
    if (contactedIds.length > 0) {
      // supabase-js .not('col', 'in', '(uuid1,uuid2)') — UUIDs sem aspas.
      q = q.not("id", "in", `(${contactedIds.join(",")})`);
    }
  }

  // #19 demandas-relacionadas — exclui a demand atual do resultado.
  if (filters.exclude_id) {
    q = q.neq("id", filters.exclude_id);
  }

  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);
  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as DemandPublic[], total: count ?? 0 };
}

// ─── #3 Contador de demandas novas desde última visita ───────────────────────

export interface NewDemandsCountResult {
  count: number;
  /** ISO timestamp da última visita (null = nunca visitou). */
  since: string | null;
}

/**
 * Conta demands abertas criadas após `lastFeedViewAt` do supplier.
 *
 * Se `lastFeedViewAt` for null (nunca visitou), retorna o total de demands
 * abertas (todas são "novas" pra ele).
 *
 * Opcionalmente filtra pela categoria do supplier (category_ids).
 * Não expõe PII — usa demands_public (sem whatsapp_number).
 */
export async function countNewDemandsForSupplier(
  lastFeedViewAt: string | null,
  options: { category_ids?: string[] } = {}
): Promise<NewDemandsCountResult> {
  const admin = createAdminClient();

  let q = admin
    .from("demands_public")
    .select("id", { count: "exact", head: true });

  if (lastFeedViewAt) {
    q = q.gt("created_at", lastFeedViewAt);
  }

  if (options.category_ids && options.category_ids.length > 0) {
    q = q.in("category_id", options.category_ids);
  }

  const { count, error } = await q;
  if (error) throw new Error(error.message);

  return { count: count ?? 0, since: lastFeedViewAt };
}

export async function getDemandBySlug(slug: string): Promise<DemandPublic | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("demands_public")
    .select(DEMAND_PUBLIC_COLUMNS)
    .eq("slug", slug)
    .maybeSingle<DemandPublic>();
  return data;
}

export async function getDemandWithWhatsappForSubscriber(
  slug: string,
  supplierUserId: string
): Promise<DemandWithContact | null> {
  const admin = createAdminClient();

  const { data: canRow } = await admin
    .from("supplier_can_contact")
    .select("can_contact, supplier_id")
    .eq("supplier_user_id", supplierUserId)
    .maybeSingle<{ can_contact: boolean; supplier_id: string }>();

  if (!canRow?.can_contact) return null;

  const { data } = await admin
    .from("demands")
    .select(`${DEMAND_PUBLIC_COLUMNS}, whatsapp_number`)
    .eq("slug", slug)
    .eq("status", "open")
    .maybeSingle<DemandWithContact>();

  return data;
}

export async function registerContact(
  demandId: string,
  supplierId: string,
  supplierUserId: string,
  meta: {
    ip?: string | null;
    user_agent?: string | null;
    offer?: OfferInput;
  } = {}
) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("register_demand_contact", {
    p_demand_id: demandId,
    p_supplier_id: supplierId,
    p_supplier_user_id: supplierUserId,
    p_ip: meta.ip ?? null,
    p_user_agent: meta.user_agent ?? null,
    p_offer_price_cents: meta.offer?.price ?? null,
    p_offer_deadline: meta.offer?.deadline ?? null,
    p_offer_message: meta.offer?.message ?? null,
    p_offer_payment_methods: meta.offer?.payment_methods ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function bumpViews(demandId: string) {
  // Fire-and-forget. Atomicidade não é crítica para um view counter — perda
  // eventual aceita. Migrar para RPC dedicada se virar gargalo.
  const admin = createAdminClient();
  const { data } = await admin
    .from("demands")
    .select("views_count")
    .eq("id", demandId)
    .maybeSingle<{ views_count: number }>();
  if (!data) return;
  await admin
    .from("demands")
    .update({ views_count: data.views_count + 1 })
    .eq("id", demandId);
}

// ─── #9 Hub de categorias com contagem real de demandas abertas ──────────────

export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  /** Emoji ou slug de ícone definido no banco. Frontend mapeia para lucide. */
  icon: string | null;
  /** Quantidade de demandas abertas e não expiradas nesta categoria. */
  demand_count: number;
}

/**
 * Retorna categorias raiz ativas com a contagem real de demandas abertas.
 *
 * Uma query agregada — sem N+1. Usa embedded count do supabase-js:
 *   categories → demands!category_id(count)
 * com filtro "only demands já expostos em demands_public" (status=open, não expiradas).
 *
 * Resultado ordenado por demand_count DESC (categorias mais ativas primeiro).
 * Cache recomendado: revalidate=3600 na página que consome.
 */
export async function listCategoriesWithDemandCount(): Promise<CategoryWithCount[]> {
  const admin = createAdminClient();

  // Busca categorias ativas raiz com embedded count de demands abertas.
  // O filtro status + expires_at é necessário para contar só as demands
  // que aparecem no feed público (equivalente ao WHERE da view demands_public).
  const { data, error } = await admin
    .from("categories")
    .select(
      `id, name, slug, icon,
       demands!category_id(count)`,
      { count: "exact" }
    )
    .eq("active", true)
    .is("parent_id", null)
    .eq("demands.status", "open")
    .gt("demands.expires_at", new Date().toISOString())
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  type RawCategory = {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    demands: { count: number }[];
  };

  const rows = (data ?? []) as RawCategory[];

  const result: CategoryWithCount[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    icon: row.icon,
    demand_count: row.demands?.[0]?.count ?? 0,
  }));

  // Ordena por demand_count DESC, mantendo alfabético como desempate.
  result.sort((a, b) => b.demand_count - a.demand_count || a.name.localeCompare(b.name, "pt-BR"));

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formata centavos como "R$ 1.250,00" (locale pt-BR).
 * Implementação em lib/format-price.ts (client-safe); reexportada aqui para
 * compatibilidade com importadores server-side existentes.
 */
export const formatPriceBRL = _formatPriceBRL;

/**
 * Formata data ISO YYYY-MM-DD como DD/MM/YYYY.
 * Usa parsing manual para evitar variação de timezone (new Date("YYYY-MM-DD")
 * interpreta como UTC meia-noite — safe aqui porque só precisamos da string).
 */
function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function buildWhatsappLink(args: {
  whatsappNumber: string;
  demandTitle: string;
  demandSlug: string;
  appUrl: string;
  /** Campos opcionais da oferta híbrida (Bloco 4 Headline). */
  offer?: OfferInput;
}): string {
  const sanitized = args.whatsappNumber.replace(/\D/g, "");
  const baseUrl = args.appUrl.replace(/\/$/, "");

  // Monta bloco de oferta somente quando ao menos um campo foi preenchido.
  const hasOffer =
    args.offer?.price !== undefined ||
    args.offer?.deadline !== undefined ||
    (args.offer?.message !== undefined && args.offer.message.trim().length > 0);

  const offerLines: string[] = [];
  if (hasOffer && args.offer) {
    offerLines.push("─────────────────");
    offerLines.push("Minha oferta:");
    if (args.offer.price !== undefined) {
      offerLines.push(`• Preço: ${formatPriceBRL(args.offer.price)}`);
    }
    if (args.offer.deadline !== undefined) {
      offerLines.push(`• Prazo de entrega: ${formatDateBR(args.offer.deadline)}`);
    }
    if (args.offer.message !== undefined && args.offer.message.trim().length > 0) {
      offerLines.push(`• ${args.offer.message.trim()}`);
    }
    offerLines.push("─────────────────");
  }

  const parts = [
    `Olá! Vi sua necessidade no GiroB2B:`,
    ``,
    `*${args.demandTitle}*`,
    `${baseUrl}/necessidade/${args.demandSlug}`,
    ``,
    ...offerLines,
    ...(offerLines.length > 0 ? [``, `Quando podemos conversar?`] : [`Posso ajudar — quando podemos conversar?`]),
  ];

  const message = parts.join("\n");
  return `https://wa.me/${sanitized}?text=${encodeURIComponent(message)}`;
}
