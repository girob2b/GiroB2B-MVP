import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type NeedStatus = "pending" | "in_progress" | "fulfilled" | "rejected";

function normalizeNeedStatus(value: unknown): NeedStatus | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "pending" || v === "pendente") return "pending";
  if (v === "in_progress" || v === "em_andamento" || v === "em andamento") return "in_progress";
  if (v === "fulfilled" || v === "registered" || v === "cadastrado") return "fulfilled";
  if (v === "rejected" || v === "rejeitado") return "rejected";
  return null;
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
  const updates: Record<string, unknown> = {};

  const status = normalizeNeedStatus(body.status);
  if (status) {
    updates.status = status;
    if (status === "fulfilled" || status === "rejected") {
      updates.resolved_at = new Date().toISOString();
    } else {
      updates.resolved_at = null;
      updates.resolved_by_admin_id = null;
    }
  }
  if (typeof body.admin_notes === "string" || body.admin_notes === null) {
    updates.admin_notes = body.admin_notes;
  }
  if (typeof body.resolved_by_supplier_id === "string" || body.resolved_by_supplier_id === null) {
    updates.resolved_by_supplier_id = body.resolved_by_supplier_id;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no_valid_fields" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("search_needs")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ need: data });
}
