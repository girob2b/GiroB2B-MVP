"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateDemandSchema, DEMAND_STATUSES, type DemandStatus } from "@/lib/schemas/demands";
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

  const raw = {
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
    photos_urls: [] as string[],
    lgpd_consent: consentRaw === "on" || consentRaw === "true",
  };

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
