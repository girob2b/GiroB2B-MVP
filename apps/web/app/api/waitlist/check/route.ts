import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/waitlist/check
 *
 * Valida se o email do vendedor foi aprovado pelo admin via waitlist.
 * Se sim, gera approval_token (UUID, expira 15min) que destrava o
 * /cadastro/vendedor pra criar conta.
 *
 * Decisão de produto 2026-05-24: substitui o magic-link-via-email (que
 * dependeria do Resend, que está fake) por validação síncrona — user
 * digita o email aprovado e segue na hora.
 *
 * Anti-enumeration: respostas pra 'pending' e 'not_found' diferem (Vitor
 * pediu mensagens distintas), aceitando o trade-off em prol de UX.
 *
 * Rate limit: nenhum por enquanto (single-tenant MVP). V2 adicionar limite
 * por IP / email pra evitar enumeração via brute force.
 */

const PayloadSchema = z.object({
  email: z.string().email("Email inválido").max(200),
});

type CheckResult =
  | { status: "approved"; token: string; email: string }
  | { status: "pending"; email: string }
  | { status: "not_found" }
  | { status: "error"; message: string };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<CheckResult>(
      { status: "error", message: "JSON inválido." },
      { status: 400 },
    );
  }

  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<CheckResult>(
      { status: "error", message: parsed.error.issues[0]?.message ?? "Payload inválido." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const admin = createAdminClient();

  // Buscar a row mais recente pra esse email com role=supplier
  // (anti-enumeration leve: se buyer existir com mesmo email, ignora)
  const { data: row, error } = await admin
    .from("waitlist")
    .select("id, approved_at, approval_token, approval_token_expires_at, approval_token_used_at")
    .eq("email", email)
    .eq("role", "supplier")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      approved_at: string | null;
      approval_token: string | null;
      approval_token_expires_at: string | null;
      approval_token_used_at: string | null;
    }>();

  if (error) {
    console.error("[/api/waitlist/check] select error:", error.message);
    return NextResponse.json<CheckResult>(
      { status: "error", message: "Erro ao consultar a lista de espera. Tente novamente." },
      { status: 500 },
    );
  }

  if (!row) {
    return NextResponse.json<CheckResult>({ status: "not_found" });
  }

  // Não aprovado ainda
  if (!row.approved_at) {
    return NextResponse.json<CheckResult>({ status: "pending", email });
  }

  // Aprovado — gera novo token (mesmo que tenha um expirado/usado anterior).
  // 15min de validade pra completar o signup.
  const newToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error: updateError } = await admin
    .from("waitlist")
    .update({
      approval_token: newToken,
      approval_token_expires_at: expiresAt,
      approval_token_used_at: null, // reseta uso (admin pode re-aprovar depois)
    })
    .eq("id", row.id);

  if (updateError) {
    console.error("[/api/waitlist/check] update token error:", updateError.message);
    return NextResponse.json<CheckResult>(
      { status: "error", message: "Erro ao gerar token. Tente novamente." },
      { status: 500 },
    );
  }

  return NextResponse.json<CheckResult>({
    status: "approved",
    token: newToken,
    email,
  });
}
