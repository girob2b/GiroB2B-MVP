"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildWhatsappLink, registerContact } from "@/lib/services/demands";
import { APP_URL } from "@/lib/email";
import { OfferSchema } from "@/lib/schemas/leads";
import type { OfferInput } from "@/lib/schemas/leads";

export type ContactDemandResult =
  | { ok: true; whatsappLink: string }
  | {
      ok: false;
      reason:
        | "unauthenticated"
        | "no_supplier"
        | "no_subscription"
        | "demand_not_found"
        | "invalid_offer"
        | "internal";
      message: string;
    };

export async function contactDemandAction(
  demandId: string,
  offer?: OfferInput
): Promise<ContactDemandResult> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, reason: "unauthenticated", message: "Faça login para contatar." };
  }

  const admin = createAdminClient();

  // Resolve supplier_id do user logado
  const { data: supplier } = await admin
    .from("suppliers")
    .select("id, subscription_status, subscription_expires_at")
    .eq("user_id", authData.user.id)
    .maybeSingle<{
      id: string;
      subscription_status: "inactive" | "trialing" | "active" | "expired";
      subscription_expires_at: string | null;
    }>();

  if (!supplier) {
    return {
      ok: false,
      reason: "no_supplier",
      message: "Apenas vendedores podem contatar. Cadastre-se como vendedor.",
    };
  }

  const isActive =
    (supplier.subscription_status === "active" || supplier.subscription_status === "trialing") &&
    (!supplier.subscription_expires_at || new Date(supplier.subscription_expires_at) > new Date());

  if (!isActive) {
    return {
      ok: false,
      reason: "no_subscription",
      message: "Assinatura inativa. Ative seu plano para contatar compradores.",
    };
  }

  // Valida a oferta (se fornecida) antes de qualquer I/O adicional.
  let parsedOffer: OfferInput | undefined;
  if (offer !== undefined) {
    const parsed = OfferSchema.safeParse(offer);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Dados da oferta inválidos.";
      return { ok: false, reason: "invalid_offer", message: firstError };
    }
    parsedOffer = parsed.data;
  }

  // Carrega a demand inteira (com whatsapp) — somente porque já validamos assinatura.
  const { data: demand } = await admin
    .from("demands")
    .select("id, slug, title, whatsapp_number, status, expires_at")
    .eq("id", demandId)
    .maybeSingle<{
      id: string;
      slug: string;
      title: string;
      whatsapp_number: string;
      status: string;
      expires_at: string;
    }>();

  if (!demand || demand.status !== "open" || new Date(demand.expires_at) <= new Date()) {
    return { ok: false, reason: "demand_not_found", message: "Necessidade indisponível." };
  }

  // Auditoria: registra o click + bumpa contact_count (inclui campos de oferta se presentes).
  try {
    const reqHeaders = await headers();
    const ip =
      reqHeaders.get("x-real-ip") ??
      reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    const ua = reqHeaders.get("user-agent");
    await registerContact(demand.id, supplier.id, authData.user.id, {
      ip,
      user_agent: ua,
      offer: parsedOffer,
    });
  } catch (e) {
    return {
      ok: false,
      reason: "internal",
      message: e instanceof Error ? e.message : "Falha ao registrar o contato.",
    };
  }

  const whatsappLink = buildWhatsappLink({
    whatsappNumber: demand.whatsapp_number,
    demandTitle: demand.title,
    demandSlug: demand.slug,
    appUrl: APP_URL,
    offer: parsedOffer,
  });

  return { ok: true, whatsappLink };
}
