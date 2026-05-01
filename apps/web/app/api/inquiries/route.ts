import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { CreateInquirySchema } from "@/lib/schemas/inquiries";
import { createDirectedInquiry, getInquiryErrorPayload } from "@/lib/services/inquiries";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = CreateInquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const result = await createDirectedInquiry(
      auth.user.id,
      auth.user.email ?? "",
      parsed.data
    );

    return NextResponse.json(result, { status: result.deduplicated ? 200 : 201 });
  } catch (error) {
    const { statusCode, payload } = getInquiryErrorPayload(error);
    return NextResponse.json(payload, { status: statusCode });
  }
}
