import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { ImportProductBodySchema } from "@/lib/schemas/products";
import { ImportProductError, importProduct } from "@/lib/services/products";
import { getSupplierIdForUser } from "@/lib/services/supplier";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = ImportProductBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ID do produto original inválido." }, { status: 400 });
  }

  const supplierId = await getSupplierIdForUser(auth.supabase, auth.user.id);
  if (!supplierId) {
    return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 404 });
  }

  try {
    const result = await importProduct(auth.supabase, supplierId, parsed.data.original_product_id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ImportProductError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao importar produto." },
      { status: 500 }
    );
  }
}
