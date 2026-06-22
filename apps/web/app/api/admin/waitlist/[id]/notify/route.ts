import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { sendWaitlistApprovalEmail } from "@/app/actions/waitlist-notify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/waitlist/[id]/notify
 *
 * Route Handler protegido por ADMIN_API_SECRET.
 * Chamado server-side pela Server Action notifyWaitlistEntry em apps/admin.
 *
 * Autenticação: header Authorization: Bearer <ADMIN_API_SECRET>
 * O segredo NUNCA chega ao client — a Server Action do admin lida com isso server-side.
 *
 * Resposta: { ok: boolean; message: string }
 */

function getAdminSecret(): string {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) throw new Error("ADMIN_API_SECRET não definido");
  return secret;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  // Auth: Bearer token
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  let expectedSecret: string;
  try {
    expectedSecret = getAdminSecret();
  } catch {
    console.error("[notify-route] ADMIN_API_SECRET não configurado");
    return NextResponse.json(
      { ok: false, message: "Configuração de servidor incompleta." },
      { status: 500 },
    );
  }

  // Timing-safe compare — evita timing attack por diferença de tempo em comparação direta.
  const tokenOk = (() => {
    if (!token) return false;
    try {
      const a = createHash("sha256").update(token).digest();
      const b = createHash("sha256").update(expectedSecret).digest();
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  })();

  if (!tokenOk) {
    return NextResponse.json(
      { ok: false, message: "Não autorizado." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "ID ausente." },
      { status: 400 },
    );
  }

  const result = await sendWaitlistApprovalEmail(id);

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
