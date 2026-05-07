import "server-only";
import { Resend } from "resend";

// Lazy — evita falha de build quando RESEND_API_KEY não está injetada em build time.
function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

// Trocar para "GiroB2B <notificacoes@girob2b.com.br>" após verificar o domínio no Resend.
export const RESEND_FROM = process.env.RESEND_FROM ?? "GiroB2B <onboarding@resend.dev>";
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://girob2b.com.br").replace(/\/$/, "");

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

// [PIVOT 2026-05-07] Templates de inquiry direta (novaCotacaoHtml/sendNovaCotacaoEmail)
// foram removidos junto com o modelo clássico. Os novos templates de notificação
// (vendedor sobre nova necessidade, comprador sobre primeiro contato) entram nas
// fases 4-5. A infraestrutura abaixo fica pronta para reuso.

export async function sendEmail(p: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const { data, error } = await getResend().emails.send({
    from: RESEND_FROM,
    to: p.to,
    subject: p.subject,
    html: p.html,
  });
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Resend error desconhecido" };
  }
  return { ok: true, id: data.id };
}
