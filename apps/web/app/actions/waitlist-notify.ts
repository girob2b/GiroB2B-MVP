"use server";

/**
 * Server Action: sendWaitlistApprovalEmail
 *
 * Envia e-mail de aprovação de waitlist via Resend SDK com template branded.
 *
 * Fluxo:
 *   1. Admin aprova o vendedor no painel (approveWaitlistEntry em apps/admin).
 *   2. Admin chama esta action (via botão "Notificar vendedor" no painel admin,
 *      ainda a implementar no frontend do admin) passando o waitlistId.
 *   3. A action busca email + gera approval_token + envia e-mail com link de cadastro.
 *
 * Idempotência:
 *   - Gera novo token a cada chamada (reseta o anterior). Isso é intencional:
 *     o admin pode reenviar caso o link anterior tenha expirado.
 *   - Não envia se approved_at for null (não aprovado). Falha explícita.
 *
 * Segurança:
 *   - Usa createAdminClient (service_role). Importado com "server-only" — não vaza.
 *   - Nunca expõe o token ao frontend.
 */

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { buildWaitlistApprovalHtml } from "@/lib/email-templates";
import { APP_URL } from "@/lib/email";

const APPROVAL_TOKEN_TTL_MINUTES = 15;

const InputSchema = z.object({
  waitlistId: z.string().uuid("ID de waitlist inválido"),
});

export type WaitlistNotifyState = {
  ok: boolean;
  message: string;
};

export async function sendWaitlistApprovalEmail(
  waitlistId: string,
): Promise<WaitlistNotifyState> {
  const parsed = InputSchema.safeParse({ waitlistId });
  if (!parsed.success) {
    return { ok: false, message: "ID de waitlist inválido." };
  }

  const admin = createAdminClient();

  // Busca a row — confirma que existe e está aprovada.
  const { data: row, error: fetchError } = await admin
    .from("waitlist")
    .select("id, email, approved_at, role, approval_token_used_at")
    .eq("id", parsed.data.waitlistId)
    .maybeSingle<{
      id: string;
      email: string;
      approved_at: string | null;
      role: string;
      approval_token_used_at: string | null;
    }>();

  if (fetchError) {
    console.error("[waitlist-notify] fetch error:", fetchError.message);
    return { ok: false, message: "Erro ao buscar dados da waitlist. Tente novamente." };
  }
  if (!row) {
    return { ok: false, message: "Entrada de waitlist não encontrada." };
  }
  if (!row.approved_at) {
    return { ok: false, message: "Este vendedor ainda não foi aprovado. Aprove primeiro." };
  }
  if (row.role !== "supplier") {
    return { ok: false, message: "Esta entrada não é de um vendedor." };
  }
  if (row.approval_token_used_at) {
    // Já criou conta — não faz sentido reenviar. Mas admin pode forçar se quiser.
    console.warn("[waitlist-notify] token já usado para:", row.email);
  }

  // Gera novo token (reseta anterior se já existia/expirado).
  const newToken = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + APPROVAL_TOKEN_TTL_MINUTES * 60 * 1000,
  ).toISOString();

  const { error: updateError } = await admin
    .from("waitlist")
    .update({
      approval_token: newToken,
      approval_token_expires_at: expiresAt,
      approval_token_used_at: null, // reseta uso
    })
    .eq("id", row.id);

  if (updateError) {
    console.error("[waitlist-notify] update token error:", updateError.message);
    return { ok: false, message: "Não foi possível gerar o link. Tente novamente." };
  }

  // Monta URL de cadastro com o token.
  const signupUrl = `${APP_URL}/cadastro/vendedor?supplier_token=${newToken}`;

  // Renderiza template HTML.
  const html = buildWaitlistApprovalHtml({
    recipientEmail: row.email,
    signupUrl,
    expiresInMinutes: APPROVAL_TOKEN_TTL_MINUTES,
  });

  // Envia via Resend.
  const result = await sendEmail({
    to: row.email,
    subject: `[${process.env.APP_NAME ?? "GiroB2B"}] Sua solicitação foi aprovada — complete seu cadastro`,
    html,
  });

  if (!result.ok) {
    console.error("[waitlist-notify] Resend error:", result.error);
    return {
      ok: false,
      message: `E-mail não pôde ser enviado: ${result.error}. O token foi gerado — você pode copiar o link manualmente.`,
    };
  }

  console.info("[waitlist-notify] e-mail de aprovação enviado para:", row.email, "id Resend:", result.id);
  return {
    ok: true,
    message: `E-mail de aprovação enviado para ${row.email}. O link expira em ${APPROVAL_TOKEN_TTL_MINUTES} minutos.`,
  };
}
