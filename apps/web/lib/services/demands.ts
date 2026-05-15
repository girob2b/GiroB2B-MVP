import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CreateDemandInput,
  DemandItem,
  DemandKind,
  DemandStatus,
  UpdateDemandInput,
} from "@/lib/schemas/demands";
import { LGPD_CONSENT_TEXT_VERSION } from "@/lib/schemas/demands";

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
}

export interface DemandWithContact extends DemandPublic {
  whatsapp_number: string;
}

const DEMAND_PUBLIC_COLUMNS =
  "id, slug, title, description, category_id, subcategory_slug, quantity, unit, budget_max_cents, deadline, delivery_city, delivery_state, photos_urls, kind, items, payment_terms, delivery_terms, required_docs, attachment_url, status, views_count, contact_count, published_at, expires_at, created_at";

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
    description: input.description.trim(),
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
  if (input.description !== undefined) updatePayload.description = input.description.trim();
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
  limit?: number;
  offset?: number;
}

export async function listPublicDemands(filters: DemandFeedFilters = {}) {
  const admin = createAdminClient();
  let q = admin
    .from("demands_public")
    .select(DEMAND_PUBLIC_COLUMNS, { count: "exact" })
    .order("published_at", { ascending: false });

  if (filters.query) q = q.ilike("title", `%${filters.query}%`);
  if (filters.category_id) q = q.eq("category_id", filters.category_id);
  if (filters.state) q = q.eq("delivery_state", filters.state.toUpperCase());
  if (filters.kind) q = q.eq("kind", filters.kind);

  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);
  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as DemandPublic[], total: count ?? 0 };
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
  meta: { ip?: string | null; user_agent?: string | null } = {}
) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("register_demand_contact", {
    p_demand_id: demandId,
    p_supplier_id: supplierId,
    p_supplier_user_id: supplierUserId,
    p_ip: meta.ip ?? null,
    p_user_agent: meta.user_agent ?? null,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function buildWhatsappLink(args: {
  whatsappNumber: string;
  demandTitle: string;
  demandSlug: string;
  appUrl: string;
}): string {
  const sanitized = args.whatsappNumber.replace(/\D/g, "");
  const message = [
    `Olá! Vi sua necessidade no GiroB2B:`,
    ``,
    `*${args.demandTitle}*`,
    `${args.appUrl.replace(/\/$/, "")}/necessidade/${args.demandSlug}`,
    ``,
    `Posso ajudar — quando podemos conversar?`,
  ].join("\n");
  return `https://wa.me/${sanitized}?text=${encodeURIComponent(message)}`;
}
