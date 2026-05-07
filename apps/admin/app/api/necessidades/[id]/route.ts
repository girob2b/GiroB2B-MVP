import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DemandStatus = "open" | "negotiating" | "fulfilled" | "cancelled" | "expired";

const VALID_STATUSES: DemandStatus[] = ["open", "negotiating", "fulfilled", "cancelled", "expired"];

function normalizeStatus(value: unknown): DemandStatus | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase() as DemandStatus;
  return VALID_STATUSES.includes(v) ? v : null;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const status = normalizeStatus(body.status);

  if (!status) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("demands")
    .update({ status })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ demand: data });
}
