"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CreateDemandSchema,
  DEMAND_KINDS,
  DEMAND_STATUSES,
  DemandItemSchema,
  type DemandItem,
  type DemandKind,
  type DemandStatus,
} from "@/lib/schemas/demands";
import { createDemand, deleteDemand, updateDemand } from "@/lib/services/demands";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type DemandActionState = {
  errors?: Record<string, string[]>;
  message?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function asNullableString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function asBudgetCents(value: FormDataEntryValue | null): number | null {
  // Espera valor em reais (ex: "1500.00"), grava em centavos.
  const reais = asOptionalNumber(value);
  if (reais === null) return null;
  return Math.round(reais * 100);
}

function parseKind(value: FormDataEntryValue | null): DemandKind {
  if (typeof value === "string" && (DEMAND_KINDS as readonly string[]).includes(value)) {
    return value as DemandKind;
  }
  return "simple";
}

// items_json: o form serializa o array de itens em um hidden input.
// Mais robusto que parsing de items[0][description] do FormData.
function parseItemsJson(value: FormDataEntryValue | null): DemandItem[] | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  try {
    const raw = JSON.parse(value) as unknown;
    if (!Array.isArray(raw)) return null;
    // Sanitiza cada item via Zod — Zod do form valida de novo, mas evita
    // injetar lixo no schema discriminado.
    const parsed = raw
      .map((row) => DemandItemSchema.safeParse(row))
      .filter((r): r is { success: true; data: DemandItem } => r.success)
      .map((r) => r.data);
    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

// Aceita só URLs do Supabase Storage (bucket public/product-images) — bloqueia
// injection de URLs externas que poderiam ser usadas pra tracking/phishing.
const ALLOWED_PHOTO_HOST_RE = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/product-images\//i;

function parsePhotosJson(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string" || value.trim().length === 0) return [];
  try {
    const raw = JSON.parse(value) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((u): u is string => typeof u === "string")
      .filter((u) => ALLOWED_PHOTO_HOST_RE.test(u))
      .slice(0, 3);
  } catch {
    return [];
  }
}

// ─── createDemandAction ───────────────────────────────────────────────────────

export async function createDemandAction(
  _prev: DemandActionState | undefined,
  formData: FormData
): Promise<DemandActionState> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { message: "Sessão expirada. Faça login novamente." };

  const titleRaw = formData.get("title");
  const descRaw = formData.get("description");
  const whatsRaw = formData.get("whatsapp_number");
  const consentRaw = formData.get("lgpd_consent");
  const kind = parseKind(formData.get("kind"));

  const base = {
    title: typeof titleRaw === "string" ? titleRaw.trim() : "",
    description: typeof descRaw === "string" ? descRaw.trim() : "",
    category_id: asNullableString(formData.get("category_id")),
    subcategory_slug: asNullableString(formData.get("subcategory_slug")),
    quantity: asOptionalNumber(formData.get("quantity")),
    unit: asNullableString(formData.get("unit")),
    budget_max_cents: asBudgetCents(formData.get("budget_max_reais")),
    deadline: asNullableString(formData.get("deadline")),
    delivery_city: asNullableString(formData.get("delivery_city")),
    delivery_state: asNullableString(formData.get("delivery_state")),
    whatsapp_number: typeof whatsRaw === "string" ? whatsRaw.trim() : "",
    photos_urls: parsePhotosJson(formData.get("photos_urls_json")),
    lgpd_consent: consentRaw === "on" || consentRaw === "true",
  };

  const raw =
    kind === "structured"
      ? {
          ...base,
          kind: "structured" as const,
          items: parseItemsJson(formData.get("items_json")),
          payment_terms: asNullableString(formData.get("payment_terms")),
          delivery_terms: asNullableString(formData.get("delivery_terms")),
          required_docs: asNullableString(formData.get("required_docs")),
          attachment_url: asNullableString(formData.get("attachment_url")),
        }
      : { ...base, kind: "simple" as const };

  const parsed = CreateDemandSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  let slug: string;
  try {
    const result = await createDemand(authData.user.id, parsed.data);
    slug = result.slug;
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Erro ao publicar a necessidade." };
  }

  revalidatePath("/painel/necessidades");
  revalidatePath(`/necessidade/${slug}`);
  redirect("/painel/necessidades?published=1");
}

// ─── updateDemandStatusAction ─────────────────────────────────────────────────

const STATUS_LIST = DEMAND_STATUSES as readonly string[];

export async function updateDemandStatusAction(
  demandId: string,
  status: DemandStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!STATUS_LIST.includes(status)) return { ok: false, error: "Status inválido." };
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, error: "Sessão expirada." };

  try {
    await updateDemand(authData.user.id, demandId, { status });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao atualizar." };
  }
  revalidatePath("/painel/necessidades");
  return { ok: true };
}

// ─── deleteDemandAction ───────────────────────────────────────────────────────

export async function deleteDemandAction(
  demandId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, error: "Sessão expirada." };
  try {
    await deleteDemand(authData.user.id, demandId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao excluir." };
  }
  revalidatePath("/painel/necessidades");
  return { ok: true };
}
