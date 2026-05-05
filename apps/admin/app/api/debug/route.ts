import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Endpoint de diagnóstico temporário — remover assim que validar.
export async function GET() {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const supabaseUrlAlt = process.env.SUPABASE_URL ?? null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  // JWT do Supabase: header.payload.signature — payload base64 contém o ref do projeto.
  let serviceKeyProjectRef: string | null = null;
  try {
    const payload = JSON.parse(
      Buffer.from(serviceKey.split(".")[1] ?? "", "base64").toString("utf8")
    );
    serviceKeyProjectRef = payload.ref ?? null;
  } catch {
    serviceKeyProjectRef = "decode-failed";
  }

  let waitlistCount: number | null = null;
  let waitlistError: string | null = null;
  let firstRowEmail: string | null = null;

  try {
    const supabase = createAdminClient();
    const { count, error: countError } = await supabase
      .from("waitlist")
      .select("id", { count: "exact", head: true });
    if (countError) waitlistError = countError.message;
    waitlistCount = count ?? null;

    const { data } = await supabase
      .from("waitlist")
      .select("email")
      .limit(1);
    firstRowEmail = data?.[0]?.email ?? null;
  } catch (e) {
    waitlistError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      SUPABASE_URL_fallback: supabaseUrlAlt,
      SERVICE_KEY_length: serviceKey.length,
      SERVICE_KEY_project_ref: serviceKeyProjectRef,
    },
    waitlist: {
      count: waitlistCount,
      error: waitlistError,
      firstRowEmail,
    },
  });
}
