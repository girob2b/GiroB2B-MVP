import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type NeedStatus = "pending" | "in_progress" | "fulfilled" | "rejected";

function normalizeNeedStatus(value: unknown): NeedStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "pending" || normalized === "pendente") return "pending";
  if (normalized === "in_progress" || normalized === "em_andamento" || normalized === "em andamento") {
    return "in_progress";
  }
  if (normalized === "fulfilled" || normalized === "registered" || normalized === "cadastrado") {
    return "fulfilled";
  }
  if (normalized === "rejected" || normalized === "rejeitado") return "rejected";
  return null;
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { error: "unauthenticated" as const, supabase, user: null };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { error: "forbidden" as const, supabase, user: null };
  }
  return { error: null, supabase, user };
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await requireAdmin();
  if (auth.error) {
    const code = auth.error === "unauthenticated" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status: code });
  }

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  const status = normalizeNeedStatus(body.status);
  if (status) {
    updates.status = status;
    if (status === "fulfilled" || status === "rejected") {
      updates.resolved_at = new Date().toISOString();
      updates.resolved_by_admin_id = auth.user!.id;
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

  const { data, error } = await auth.supabase
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
