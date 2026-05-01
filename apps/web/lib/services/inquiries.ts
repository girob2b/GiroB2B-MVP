import "server-only";

import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncDerivedUserRoleWithAdmin } from "@/lib/services/user-role";
import type { CreateInquiryInput } from "@/lib/schemas/inquiries";

const INQUIRY_DAILY_LIMIT = 10;
const INQUIRY_DEDUP_HOURS = 48;

type SupplierPlan = "free" | "starter" | "pro" | "premium";

type UserProfileRow = {
  full_name: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  role: string;
};

type BuyerRow = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  cnpj: string | null;
  city: string | null;
  state: string | null;
  lgpd_consent: boolean;
  lgpd_consent_at: string | null;
  blocked_until: string | null;
};

type SupplierLookup = {
  id: string;
  user_id: string;
  trade_name: string;
  plan: SupplierPlan;
  suspended: boolean;
};

type ProductLookup = {
  id: string;
  supplier_id: string;
  status: string;
};

type InquiryListRow = {
  id: string;
  inquiry_type: "directed" | "generic";
  supplier_id: string | null;
  product_id: string | null;
  buyer_id: string | null;
  description: string;
  quantity_estimate: string | null;
  desired_deadline: string | null;
  status: "new" | "viewed" | "responded" | "archived" | "reported";
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_company: string | null;
  buyer_city: string | null;
  buyer_state: string | null;
  contact_unlocked: boolean;
  created_at: string;
};

type CreateInquiryRpcResult = {
  success: boolean;
  deduplicated?: boolean;
  error_code?: string;
  inquiry?: InquiryListRow;
};

export class InquiryValidationError extends Error {
  constructor(
    message: string,
    public statusCode = 422,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "InquiryValidationError";
  }
}

function getSaoPauloDayStart() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return new Date(`${formatter.format(new Date())}T00:00:00-03:00`);
}

function buildDedupKey(buyerId: string, supplierId: string, productId: string | null) {
  return crypto
    .createHash("sha256")
    .update(`${buyerId}:${supplierId}:${productId ?? "no-product"}`)
    .digest("hex");
}

function normalizeCNPJ(cnpj: string | null | undefined) {
  if (!cnpj) return null;
  const cleaned = cnpj.replace(/\D/g, "");
  return cleaned || null;
}

async function getUserProfile(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .select("full_name, phone, city, state, role")
    .eq("id", userId)
    .single<UserProfileRow>();

  if (error || !data) {
    throw new InquiryValidationError("Nao foi possivel carregar o perfil base do usuario.", 500);
  }

  return data;
}

async function ensureSupplier(supplierId: string, productId?: string | null) {
  const admin = createAdminClient();
  const { data: supplier, error } = await admin
    .from("suppliers")
    .select("id, user_id, trade_name, plan, suspended")
    .eq("id", supplierId)
    .single<SupplierLookup>();

  if (error || !supplier) throw new InquiryValidationError("Fornecedor nao encontrado.", 404);
  if (supplier.suspended) throw new InquiryValidationError("Fornecedor indisponivel para contato.", 422);

  if (productId) {
    const { data: product, error: productError } = await admin
      .from("products")
      .select("id, supplier_id, status")
      .eq("id", productId)
      .single<ProductLookup>();

    if (productError || !product || product.supplier_id !== supplierId || product.status === "deleted") {
      throw new InquiryValidationError("Produto invalido para este fornecedor.", 422);
    }
  }

  return supplier;
}

async function getOrCreateBuyer(userId: string, userEmail: string, input: CreateInquiryInput) {
  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("buyers")
    .select("id, user_id, name, email, phone, company_name, cnpj, city, state, lgpd_consent, lgpd_consent_at, blocked_until")
    .eq("user_id", userId)
    .maybeSingle<BuyerRow>();

  if (existingError) {
    throw new InquiryValidationError("Nao foi possivel validar o perfil de comprador.", 500);
  }
  if (existing?.blocked_until && new Date(existing.blocked_until) > new Date()) {
    throw new InquiryValidationError("Seu perfil de comprador esta temporariamente bloqueado.", 403);
  }

  const normalizedCNPJ = normalizeCNPJ(input.cnpj);
  if (normalizedCNPJ && normalizedCNPJ.length !== 14) {
    throw new InquiryValidationError("CNPJ invalido.", 422, {
      cnpj: ["Informe um CNPJ valido com 14 digitos."],
    });
  }

  if (existing) {
    const updatePayload: Record<string, string | null | boolean> = {};
    if (!existing.company_name && input.company_name) {
      updatePayload.company_name = input.company_name;
      updatePayload.company = input.company_name;
    }
    if (!existing.cnpj && normalizedCNPJ) updatePayload.cnpj = normalizedCNPJ;
    if (!existing.lgpd_consent) {
      updatePayload.lgpd_consent = true;
      updatePayload.lgpd_consent_at = new Date().toISOString();
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await admin.from("buyers").update(updatePayload).eq("id", existing.id);
      if (error) throw new InquiryValidationError("Nao foi possivel atualizar o perfil de comprador.", 500);
    }

    await syncDerivedUserRoleWithAdmin(admin, userId);
    return {
      ...existing,
      company_name: existing.company_name ?? input.company_name ?? null,
      cnpj: existing.cnpj ?? normalizedCNPJ,
      lgpd_consent: true,
      lgpd_consent_at: existing.lgpd_consent_at ?? new Date().toISOString(),
    };
  }

  const profile = await getUserProfile(userId);
  if (!profile.full_name || !profile.phone || !profile.city || !profile.state) {
    throw new InquiryValidationError(
      "Complete os dados basicos da conta antes de enviar uma cotacao.",
      422,
      {
        profile: [
          "Nome completo, telefone, cidade e estado sao obrigatorios para ativar o perfil de comprador.",
        ],
      }
    );
  }

  const { data: created, error } = await admin
    .from("buyers")
    .insert({
      user_id: userId,
      name: profile.full_name,
      email: userEmail,
      phone: profile.phone,
      company: input.company_name ?? null,
      company_name: input.company_name ?? null,
      cnpj: normalizedCNPJ,
      city: profile.city,
      state: profile.state,
      lgpd_consent: true,
      lgpd_consent_at: new Date().toISOString(),
    })
    .select("id, user_id, name, email, phone, company_name, cnpj, city, state, lgpd_consent, lgpd_consent_at, blocked_until")
    .single<BuyerRow>();

  if (error || !created) {
    throw new InquiryValidationError("Nao foi possivel ativar o perfil de comprador.", 500);
  }

  await syncDerivedUserRoleWithAdmin(admin, userId);
  return created;
}

async function enqueueInquiryNotification(supplier: SupplierLookup, inquiryId: string) {
  const admin = createAdminClient();
  const supplierUser = await admin.auth.admin.getUserById(supplier.user_id);
  const supplierEmail = supplierUser.data.user?.email;
  if (!supplierEmail) return;

  await admin.from("email_notifications").insert({
    type: "new_inquiry",
    recipient: supplierEmail,
    subject: `Nova cotacao recebida para ${supplier.trade_name}`,
    status: "sent",
  });

  try {
    await admin.from("notifications").insert({
      recipient_id: supplier.user_id,
      event_type: "new_inquiry",
      channel: "email",
      status: "sent",
      sent_at: new Date().toISOString(),
      metadata: { inquiry_id: inquiryId },
    });
  } catch {
    // Notifications are best-effort while environments converge.
  }
}

export async function createDirectedInquiry(
  userId: string,
  userEmail: string,
  input: CreateInquiryInput
) {
  const admin = createAdminClient();
  const supplier = await ensureSupplier(input.supplier_id, input.product_id ?? null);
  const buyer = await getOrCreateBuyer(userId, userEmail, input);

  const { data, error } = await admin.rpc("create_directed_inquiry_tx", {
    p_buyer_id: buyer.id,
    p_supplier_id: supplier.id,
    p_product_id: input.product_id ?? null,
    p_buyer_name: buyer.name,
    p_buyer_email: buyer.email,
    p_buyer_phone: buyer.phone,
    p_buyer_company: buyer.company_name ?? null,
    p_buyer_city: buyer.city,
    p_buyer_state: buyer.state,
    p_description: input.description,
    p_quantity_estimate: input.quantity_estimate ?? null,
    p_desired_deadline: input.desired_deadline ?? null,
    p_dedup_key: buildDedupKey(buyer.id, supplier.id, input.product_id ?? null),
    p_start_of_day: getSaoPauloDayStart().toISOString(),
    p_dedup_since: new Date(Date.now() - INQUIRY_DEDUP_HOURS * 60 * 60 * 1000).toISOString(),
    p_daily_limit: INQUIRY_DAILY_LIMIT,
  });

  if (error || !data) throw new InquiryValidationError("Nao foi possivel criar a cotacao.", 500);

  const result = data as CreateInquiryRpcResult;
  if (!result.success) {
    if (result.error_code === "daily_limit_exceeded") {
      throw new InquiryValidationError("Limite diario de cotacoes atingido. Tente novamente amanha.", 429);
    }
    throw new InquiryValidationError("Nao foi possivel criar a cotacao.", 500);
  }
  if (!result.inquiry) throw new InquiryValidationError("Nao foi possivel criar a cotacao.", 500);

  if (!result.deduplicated) {
    await enqueueInquiryNotification(supplier, result.inquiry.id).catch(() => {});
  }

  return {
    success: true as const,
    deduplicated: Boolean(result.deduplicated),
    supplier_name: supplier.trade_name,
    inquiry: result.inquiry,
  };
}

export function getInquiryErrorPayload(error: unknown) {
  if (error instanceof InquiryValidationError) {
    return {
      statusCode: error.statusCode,
      payload: error.details ? { error: error.message, errors: error.details } : { error: error.message },
    };
  }

  return {
    statusCode: 500,
    payload: { error: error instanceof Error ? error.message : "Erro interno ao processar a cotacao." },
  };
}
