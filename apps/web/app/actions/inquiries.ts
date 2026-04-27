"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

  // Ensure buyer profile exists + cadastro fiscal completo (gate B2B)
  const { data: buyerData, error: buyerError } = await supabase
    .from("buyers")
    .select("id, name, cnpj, company_name, phone, address, cep, city, state")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (buyerError) return { error: "Erro ao verificar perfil de comprador." };
  if (!buyerData) return { error: "Perfil de comprador não encontrado. Complete seu cadastro primeiro." };

  const missing: string[] = [];
  if (!buyerData.cnpj)         missing.push("CNPJ");
  if (!buyerData.company_name) missing.push("razão social");
  if (!buyerData.phone)        missing.push("telefone");
  if (!buyerData.address)      missing.push("endereço");
  if (!buyerData.cep)          missing.push("CEP");
  if (!buyerData.city)         missing.push("cidade");
  if (!buyerData.state)        missing.push("estado");
  if (missing.length > 0) {
    return {
      error: `Complete seu cadastro antes de enviar cotações. Faltam: ${missing.join(", ")}. Acesse "Meu perfil" pra preencher.`,
    };
  }

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

/**
 * Cria (ou recupera) uma conversa entre o supplier autenticado e o buyer
 * dono de uma inquiry — e redireciona pro chat com a conversa selecionada.
 *
 * Usado pelo botão "Iniciar negociação" no detalhe da cotação genérica.
 *
 * Em caso de erro, redireciona pra própria página da inquiry com `?error=<code>`
 * para feedback visível ao usuário (não cai silenciosamente na central).
 */
export async function startSupplierConversation(formData: FormData) {
  const inquiryId = (formData.get("inquiry_id") as string | null)?.trim();
  if (!inquiryId) redirect("/painel/inquiries?error=missing_inquiry");

  const errBack = (code: string) => redirect(`/painel/inquiries/${inquiryId}?error=${code}`);

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("user_id", authData.user.id)
    .maybeSingle<{ id: string }>();

  if (!supplier) errBack("no_supplier_profile");

  const { data: inquiry } = await supabase
    .from("inquiries")
    .select("id, buyer_id, supplier_id, product_id, products(name)")
    .eq("id", inquiryId)
    .maybeSingle<{
      id: string;
      buyer_id: string | null;
      supplier_id: string | null;
      product_id: string | null;
      products: { name: string | null } | null;
    }>();

  if (!inquiry) errBack("inquiry_not_found");
  // Nota: bang seguro porque errBack acima faz redirect (não retorna)
  if (!inquiry!.buyer_id) errBack("buyer_orphan");

  if (inquiry!.supplier_id !== null && inquiry!.supplier_id !== supplier!.id) {
    errBack("not_authorized");
  }

  // Conversa existente?
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("inquiry_id", inquiry!.id)
    .eq("supplier_id", supplier!.id)
    .maybeSingle<{ id: string }>();

  if (existing) {
    redirect(`/painel/chat?conv=${existing.id}`);
  }

  const { data: created, error: insertErr } = await supabase
    .from("conversations")
    .insert({
      buyer_id: inquiry!.buyer_id,
      supplier_id: supplier!.id,
      inquiry_id: inquiry!.id,
      context_type: "inquiry",
      product_id: inquiry!.product_id,
      product_name: inquiry!.products?.name ?? null,
      status: "active",
    })
    .select("id")
    .single<{ id: string }>();

  if (!created) {
    console.error("[startSupplierConversation] insert failed:", insertErr);
    const { data: retry } = await supabase
      .from("conversations")
      .select("id")
      .eq("inquiry_id", inquiry!.id)
      .eq("supplier_id", supplier!.id)
      .maybeSingle<{ id: string }>();
    if (retry) redirect(`/painel/chat?conv=${retry.id}`);
    errBack("conversation_insert_failed");
  }

  revalidatePath("/painel/chat");
  redirect(`/painel/chat?conv=${created!.id}`);
}
