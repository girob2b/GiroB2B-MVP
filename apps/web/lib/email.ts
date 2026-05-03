import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "GiroB2B <notificacoes@girob2b.com.br>";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://girob2b.com.br").replace(/\/$/, "");

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

// ─── Templates ───────────────────────────────────────────────────────────────

function novaCotacaoHtml(p: {
  supplierName: string;
  buyerName: string;
  buyerCompany: string | null;
  buyerCity: string | null;
  buyerState: string | null;
  description: string;
  quantityEstimate: string | null;
  desiredDeadline: string | null;
  inquiryUrl: string;
}) {
  const location =
    p.buyerCity && p.buyerState
      ? `${p.buyerCity}, ${p.buyerState}`
      : p.buyerCity ?? p.buyerState ?? null;

  const descPreview =
    p.description.length > 300
      ? p.description.slice(0, 300).trimEnd() + "…"
      : p.description;

  const rows: { label: string; value: string }[] = [];
  if (p.buyerCompany) rows.push({ label: "Empresa", value: p.buyerCompany });
  if (location)       rows.push({ label: "Localização", value: location });
  if (p.quantityEstimate) rows.push({ label: "Quantidade estimada", value: p.quantityEstimate });
  if (p.desiredDeadline)  rows.push({ label: "Prazo desejado", value: p.desiredDeadline });

  const detailsHtml = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:6px 0;color:#6B7280;font-size:13px;width:140px;vertical-align:top">${r.label}</td>
        <td style="padding:6px 0;color:#111827;font-size:13px;vertical-align:top;font-weight:500">${r.value}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

        <!-- Header -->
        <tr>
          <td style="background:#0A5C5C;border-radius:12px 12px 0 0;padding:28px 32px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">Giro<span style="color:#5ECFBF">B2B</span></span>
                </td>
                <td align="right">
                  <span style="background:rgba(255,255,255,0.15);color:#ffffff;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;letter-spacing:0.5px">NOVA COTAÇÃO</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px">

            <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;line-height:1.3">
              Você recebeu uma cotação! 🎉
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#6B7280;line-height:1.5">
              Olá, <strong style="color:#111827">${p.supplierName}</strong>. Um comprador está interessado nos seus produtos e enviou uma solicitação de cotação agora mesmo.
            </p>

            <!-- Buyer card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px;margin-bottom:24px">
              <tr>
                <td style="padding:20px 24px">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9CA3AF;letter-spacing:1px;text-transform:uppercase">Comprador</p>
                  <p style="margin:0 0 14px;font-size:17px;font-weight:700;color:#111827">${p.buyerName}</p>
                  ${detailsHtml ? `<table width="100%" cellpadding="0" cellspacing="0">${detailsHtml}</table>` : ""}
                </td>
              </tr>
            </table>

            <!-- Description -->
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#9CA3AF;letter-spacing:1px;text-transform:uppercase">O que ele precisa</p>
            <p style="margin:0 0 28px;font-size:14px;color:#374151;line-height:1.7;background:#FFFBEB;border-left:3px solid #F59E0B;padding:14px 16px;border-radius:0 8px 8px 0">
              ${descPreview}
            </p>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${p.inquiryUrl}"
                     style="display:inline-block;background:#0A5C5C;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:8px;letter-spacing:0.2px">
                    Ver cotação completa →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:13px;color:#9CA3AF;text-align:center;line-height:1.6">
              Responda rápido — compradores tendem a fechar com o primeiro fornecedor que responde.<br>
              <a href="${p.inquiryUrl}" style="color:#0A5C5C;text-decoration:none">${p.inquiryUrl}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;border-radius:0 0 12px 12px;border-top:1px solid #E5E7EB;padding:20px 32px">
            <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;text-align:center">
              Você recebeu este e-mail porque é um fornecedor cadastrado no <strong>GiroB2B</strong>.<br>
              Para gerenciar suas notificações, acesse seu painel em
              <a href="${APP_URL}/painel" style="color:#0A5C5C;text-decoration:none">${APP_URL}/painel</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Send functions ───────────────────────────────────────────────────────────

export async function sendNovaCotacaoEmail(p: {
  to: string;
  supplierName: string;
  buyerName: string;
  buyerCompany: string | null;
  buyerCity: string | null;
  buyerState: string | null;
  description: string;
  quantityEstimate: string | null;
  desiredDeadline: string | null;
  inquiryId: string;
}): Promise<SendResult> {
  const inquiryUrl = `${APP_URL}/painel/inquiries/${p.inquiryId}`;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: p.to,
    subject: `Nova cotação recebida — ${p.supplierName}`,
    html: novaCotacaoHtml({ ...p, inquiryUrl }),
  });

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Resend error desconhecido" };
  }

  return { ok: true, id: data.id };
}
