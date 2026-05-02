"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createGenericInquiryQuote,
  InquiryValidationError,
} from "@/lib/services/inquiries";

export interface PublishNeedState {
  error?: string;
  success?: boolean;
}

export interface CreateQuoteState {
  error?: string;
  success?: boolean;
}

export async function createPublishedNeed(
  _prev: PublishNeedState,
  formData: FormData
): Promise<PublishNeedState> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const productName = (formData.get("product_name") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;

  if (productName.length < 2) {
    return { error: "Informe o nome do produto (minimo 2 caracteres)." };
  }

  const { error } = await supabase.from("search_needs").insert({
    user_id: authData.user.id,
    query: productName,
    description,
    filters: {},
    status: "pending",
  });

  if (error) {
    console.error("[createPublishedNeed]", error);
    return { error: "Nao foi possivel publicar a necessidade. Tente novamente." };
  }

  return { success: true };
}

// Backward-compatible alias while remaining imports are updated.
export const createGenericInquiry = createPublishedNeed;

export async function createNewQuote(
  _prev: CreateQuoteState,
  formData: FormData
): Promise<CreateQuoteState> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const productName = (formData.get("product_name") as string | null)?.trim() ?? "";
  const quantity = (formData.get("quantity") as string | null)?.trim() || null;
  const targetPrice = (formData.get("target_price") as string | null)?.trim() || null;
  const category = (formData.get("category") as string | null)?.trim() || null;
  const state = (formData.get("state") as string | null)?.trim() || null;
  const city = (formData.get("city") as string | null)?.trim() || null;
  const contactTypeRaw = (formData.get("contact_type") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const contactType =
    contactTypeRaw === "fabricante" || contactTypeRaw === "importador" || contactTypeRaw === "atacado"
      ? contactTypeRaw
      : null;

  try {
    await createGenericInquiryQuote(authData.user.id, authData.user.email ?? "", {
      product_name: productName,
      quantity,
      target_price: targetPrice,
      category,
      state,
      city,
      contact_type: contactType,
      notes,
    });

    revalidatePath("/painel/inquiries");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    if (error instanceof InquiryValidationError) return { error: error.message };
    return { error: "Nao foi possivel criar a cotacao. Tente novamente." };
  }
}

/**
 * Cria (ou recupera) uma conversa entre o supplier autenticado e o buyer
 * dono de uma inquiry e redireciona para o chat com a conversa selecionada.
 *
 * Em caso de erro, redireciona para a propria pagina da inquiry com
 * `?error=<code>` para feedback visivel ao usuario.
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
  if (!inquiry!.buyer_id) errBack("buyer_orphan");

  if (inquiry!.supplier_id !== null && inquiry!.supplier_id !== supplier!.id) {
    errBack("not_authorized");
  }

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
