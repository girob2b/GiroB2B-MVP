import "server-only";

/**
 * Email templates branded girob2b — HTML inline, PT-BR, UTF-8.
 *
 * Uso:
 *  1. Supabase Auth emails (confirmação de cadastro, reset de senha):
 *     Os templates abaixo devem ser colados no Supabase Dashboard →
 *     Authentication → Email Templates. Eles usam as variáveis do Supabase
 *     ({{ .ConfirmationURL }}, {{ .SiteURL }}, etc.).
 *     Exportados como strings para facilitar cópia/revisão e documentação.
 *
 *  2. E-mails transacionais custom (aprovação de waitlist, notificações):
 *     Gerados via funções que retornam HTML, enviados pelo Resend SDK em
 *     lib/email.ts#sendEmail().
 */

// ─── Constantes de design ─────────────────────────────────────────────────────

const BRAND_COLOR = "#059669";      // --brand-primary-600
const BRAND_DARK  = "#065f46";      // --brand-primary-800
const BG_LIGHT    = "#f0fdf4";      // --brand-primary-50
const FONT_STACK  = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const APP_NAME    = "GiroB2B";
const APP_URL_FALLBACK = process.env.NEXT_PUBLIC_APP_URL ?? "https://girob2b.com.br";

// ─── Layout compartilhado ─────────────────────────────────────────────────────

function emailLayout(body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:${FONT_STACK};color:#1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:560px;background:#ffffff;border-radius:12px;
                      box-shadow:0 1px 3px rgba(0,0,0,.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:${BRAND_COLOR};padding:24px 32px;">
              <a href="${APP_URL_FALLBACK}" style="text-decoration:none;">
                <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                  ${APP_NAME}
                </span>
                <span style="font-size:13px;color:rgba(255,255,255,0.75);margin-left:8px;">
                  Marketplace B2B
                </span>
              </a>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                Este e-mail foi enviado pelo ${APP_NAME} — Marketplace B2B Brasileiro.<br />
                Se você não criou uma conta, pode ignorar este e-mail com segurança.<br />
                <a href="${APP_URL_FALLBACK}/privacidade"
                   style="color:#94a3b8;text-decoration:underline;">Política de Privacidade</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL_FALLBACK}/termos"
                   style="color:#94a3b8;text-decoration:underline;">Termos de Uso</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Botão CTA reutilizável ───────────────────────────────────────────────────

function ctaButton(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"
           style="margin:24px 0;">
      <tr>
        <td>
          <a href="${href}"
             style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;
                    font-size:15px;font-weight:600;text-decoration:none;
                    padding:14px 28px;border-radius:8px;line-height:1;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

function infoBox(text: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="margin:20px 0;">
      <tr>
        <td style="background:${BG_LIGHT};border:1px solid #a7f3d0;
                   border-radius:8px;padding:14px 16px;">
          <p style="margin:0;font-size:13px;color:${BRAND_DARK};line-height:1.6;">
            ${text}
          </p>
        </td>
      </tr>
    </table>`;
}

// ─── 1. Template: Confirmação de Cadastro (Supabase Auth) ─────────────────────
//
// ATENÇÃO: este template usa variáveis do Supabase ({{ .ConfirmationURL }}).
// Cole no Supabase Dashboard → Authentication → Email Templates → "Confirm signup".
//
// NÃO envie via Resend SDK diretamente — o Supabase injeta as variáveis
// ANTES de despachar pelo SMTP. Se enviar via SDK, {{ .ConfirmationURL }}
// vai aparecer literal no e-mail.

export const SUPABASE_CONFIRM_SIGNUP_TEMPLATE: string = emailLayout(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
    Confirme seu e-mail
  </h1>
  <p style="margin:0 0 4px;font-size:15px;color:#64748b;line-height:1.6;">
    Olá! Você criou uma conta no <strong>${APP_NAME}</strong>.
  </p>
  <p style="margin:0;font-size:15px;color:#64748b;line-height:1.6;">
    Clique no botão abaixo para confirmar seu e-mail e ativar sua conta.
    O link é válido por <strong>24 horas</strong>.
  </p>

  ${ctaButton("{{ .ConfirmationURL }}", "Confirmar meu e-mail")}

  ${infoBox("Se o botão não funcionar, copie e cole este link no navegador:<br />" +
    '<span style="word-break:break-all;font-size:12px;color:#475569;">' +
    "{{ .ConfirmationURL }}" +
    "</span>")}

  <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
    Não criou uma conta? Ignore este e-mail — nenhuma ação é necessária.
  </p>
`);

// ─── 2. Template: Redefinição de Senha (Supabase Auth) ───────────────────────
//
// Cole no Supabase Dashboard → Authentication → Email Templates → "Reset password".
// Variável: {{ .ConfirmationURL }} — gerada pelo Supabase pra cada solicitação.

export const SUPABASE_RESET_PASSWORD_TEMPLATE: string = emailLayout(`
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
    Redefinir sua senha
  </h1>
  <p style="margin:0 0 4px;font-size:15px;color:#64748b;line-height:1.6;">
    Recebemos uma solicitação para redefinir a senha da sua conta no <strong>${APP_NAME}</strong>.
  </p>
  <p style="margin:0;font-size:15px;color:#64748b;line-height:1.6;">
    Clique no botão abaixo para criar uma nova senha.
    O link expira em <strong>1 hora</strong>.
  </p>

  ${ctaButton("{{ .ConfirmationURL }}", "Redefinir minha senha")}

  ${infoBox("Se o botão não funcionar, copie e cole este link no navegador:<br />" +
    '<span style="word-break:break-all;font-size:12px;color:#475569;">' +
    "{{ .ConfirmationURL }}" +
    "</span>")}

  <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
    Não solicitou a redefinição? Ignore este e-mail. Sua senha permanece a mesma.
  </p>
`);

// ─── 3. Template: Aprovação de Waitlist (Resend SDK direto) ──────────────────
//
// Este template é enviado via sendEmail() do lib/email.ts — NÃO usa variáveis
// Supabase. O link de cadastro é construído em runtime na Server Action.

export function buildWaitlistApprovalHtml(params: {
  recipientEmail: string;
  signupUrl: string;      // /cadastro/vendedor?supplier_token=<uuid>
  expiresInMinutes: number;
}): string {
  const { signupUrl, expiresInMinutes } = params;
  const absoluteUrl = signupUrl.startsWith("http")
    ? signupUrl
    : `${APP_URL_FALLBACK}${signupUrl}`;

  return emailLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
      Sua solicitação foi aprovada!
    </h1>
    <p style="margin:0 0 4px;font-size:15px;color:#64748b;line-height:1.6;">
      Ótima notícia! Sua solicitação de acesso ao <strong>${APP_NAME}</strong>
      como <strong>vendedor</strong> foi aprovada.
    </p>
    <p style="margin:0;font-size:15px;color:#64748b;line-height:1.6;">
      Clique no botão abaixo para completar seu cadastro e começar a acessar
      demandas qualificadas de compradores B2B.
    </p>

    ${ctaButton(absoluteUrl, "Completar meu cadastro")}

    ${infoBox(
      `<strong>Atenção:</strong> este link é de uso único e expira em
       <strong>${expiresInMinutes} minutos</strong>.<br />
       Após expirar, você pode solicitar um novo acesso em
       <a href="${APP_URL_FALLBACK}/seja-vendedor"
          style="color:${BRAND_DARK};text-decoration:underline;">${APP_URL_FALLBACK}/seja-vendedor</a>.`
    )}

    <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
      Não reconhece esta aprovação? Entre em contato:
      <a href="mailto:comercial@girob2b.com.br"
         style="color:#94a3b8;text-decoration:underline;">comercial@girob2b.com.br</a>
    </p>
  `);
}
