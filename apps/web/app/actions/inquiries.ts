"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface CreateGenericInquiryState {
  error?: string;
  success?: boolean;
}

export async function createGenericInquiry(
  _prev: CreateGenericInquiryState,
  formData: FormData
): Promise<CreateGenericInquiryState> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const productName  = (formData.get("product_name") as string | null)?.trim() ?? "";
  const quantity     = (formData.get("quantity") as string | null)?.trim() ?? "";
  const targetPrice  = (formData.get("target_price") as string | null)?.trim() || null;
  const contactType  = (formData.get("contact_type") as string | null)?.trim() || null;
  const notes        = (formData.get("notes") as string | null)?.trim() ?? "";

  if (!productName) return { error: "Informe o nome do produto ou material." };
  if (!quantity)    return { error: "Informe a quantidade que você precisa." };

  // Build description with enough chars to satisfy the ≥ 20 constraint
  const parts = [`Produto: ${productName}`, `Quantidade: ${quantity}`];
  if (targetPrice)  parts.push(`Preço-alvo: ${targetPrice}`);
  if (contactType)  parts.push(`Tipo de contato: ${contactType}`);
  if (notes)        parts.push(notes);

  const description = parts.join(" | ");
  if (description.length < 20) {
    // Pad if somehow still too short
    return { error: "Forneça mais detalhes sobre o produto ou material (mínimo 20 caracteres)." };
  }

  // Ensure buyer profile exists (lazy creation)
  const { data: buyerData, error: buyerError } = await supabase
    .from("buyers")
    .select("id, name")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (buyerError) return { error: "Erro ao verificar perfil de comprador." };
  if (!buyerData) return { error: "Perfil de comprador não encontrado. Complete seu cadastro primeiro." };

  const { error } = await supabase.from("inquiries").insert({
    buyer_id:              buyerData.id,
    supplier_id:           null,
    inquiry_type:          "generic",
    description,
    quantity_estimate:     quantity,
    target_price:          targetPrice,
    contact_type:          contactType,
    buyer_name:            buyerData.name ?? authData.user.email ?? "Comprador",
    buyer_email:           authData.user.email ?? "",
    buyer_consent_to_share: true,
    status:                "new",
  });

  if (error) {
    console.error("[createGenericInquiry]", error);
    return { error: "Não foi possível criar a cotação. Tente novamente." };
  }

  return { success: true };
}
