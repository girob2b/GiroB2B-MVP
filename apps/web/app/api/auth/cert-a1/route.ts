import "server-only";
import { NextRequest, NextResponse } from "next/server";
import forge from "node-forge";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── CNPJ extraction ─────────────────────────────────────────────────────────
// ICP-Brasil PJ certificate format: CN=COMPANY_NAME:14DIGITCNPJ
// Reference: DOC-ICP-04 (Política de Certificados da ICP-Brasil)

function normalizeCnpj(raw: string): string {
  return raw.replace(/\D/g, "");
}

function extractCnpjFromSubject(cert: forge.pki.Certificate): string | null {
  // Pattern 1: CN ends with :<14 digits> (most common ICP-Brasil PJ format)
  const cnAttr = cert.subject.getField("CN");
  if (cnAttr) {
    const cn = cnAttr.value as string;
    const match = cn.match(/:(\d{14})$/);
    if (match) return match[1];
    // Fallback: any 14-digit sequence in CN
    const loose = cn.match(/(\d{14})/);
    if (loose) return loose[1];
  }

  // Pattern 2: serialNumber field contains CNPJ
  const snAttr = cert.subject.getField("serialName");
  if (snAttr) {
    const sn = snAttr.value as string;
    const digits = normalizeCnpj(sn);
    if (digits.length === 14) return digits;
  }

  // Pattern 3: any Subject attribute matching formatted CNPJ
  for (const attr of cert.subject.attributes) {
    const val = (attr.value as string) ?? "";
    const match = val.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/);
    if (match) return normalizeCnpj(match[1]);
  }

  return null;
}

function validateCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

  function calcDigit(digits: string, weights: number[]) {
    const sum = digits.split("").reduce((acc, d, i) => acc + parseInt(d) * weights[i], 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  }

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calcDigit(cnpj.slice(0, 12), w1);
  const d2 = calcDigit(cnpj.slice(0, 13), w2);
  return parseInt(cnpj[12]) === d1 && parseInt(cnpj[13]) === d2;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const pfxFile  = formData.get("pfx")      as File   | null;
    const password = formData.get("password") as string | null;

    if (!pfxFile || password === null) {
      return NextResponse.json(
        { error: "Arquivo .pfx e senha são obrigatórios." },
        { status: 400 },
      );
    }

    // Parse PKCS#12 — never stored, processed in memory only.
    const arrayBuffer = await pfxFile.arrayBuffer();
    const binaryStr   = Buffer.from(arrayBuffer).toString("binary");

    let p12: forge.pkcs12.Pkcs12Pfx;
    try {
      const asn1 = forge.asn1.fromDer(binaryStr);
      p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
    } catch {
      return NextResponse.json(
        { error: "Senha incorreta ou arquivo inválido." },
        { status: 400 },
      );
    }

    // Extract certificate
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const bags     = certBags[forge.pki.oids.certBag] ?? [];
    if (!bags.length || !bags[0].cert) {
      return NextResponse.json(
        { error: "Nenhum certificado encontrado no arquivo." },
        { status: 400 },
      );
    }

    const cert = bags[0].cert;
    const now  = new Date();

    if (cert.validity.notAfter < now) {
      return NextResponse.json({ error: "Certificado expirado." }, { status: 400 });
    }
    if (cert.validity.notBefore > now) {
      return NextResponse.json({ error: "Certificado ainda não é válido." }, { status: 400 });
    }

    const cnpj = extractCnpjFromSubject(cert);
    if (!cnpj) {
      return NextResponse.json(
        { error: "Não foi possível extrair o CNPJ do certificado. Verifique se é um e-CNPJ A1." },
        { status: 422 },
      );
    }
    if (!validateCnpj(cnpj)) {
      return NextResponse.json(
        { error: "CNPJ extraído do certificado é inválido." },
        { status: 422 },
      );
    }

    const cnAttr      = cert.subject.getField("CN");
    const certSubject = cnAttr ? (cnAttr.value as string) : null;
    const companyName = certSubject?.split(":")[0]?.trim() ?? null;

    // Synthetic email — never exposed to user, only used as Supabase identity key.
    const syntheticEmail = `cnpj_${cnpj}@cert.girob2b.com.br`;
    const admin          = createAdminClient();

    // Lookup or create user via cert_a1_identities
    const { data: identity } = await admin
      .from("cert_a1_identities")
      .select("user_id")
      .eq("cnpj", cnpj)
      .maybeSingle<{ user_id: string }>();

    let userId: string;

    if (identity) {
      userId = identity.user_id;
      // Update last usage
      await admin
        .from("cert_a1_identities")
        .update({ last_used_at: new Date().toISOString() })
        .eq("cnpj", cnpj);
    } else {
      // Create Supabase user and minimal profile
      const { data: newUserData, error: createErr } = await admin.auth.admin.generateLink({
        type:    "magiclink",
        email:   syntheticEmail,
        options: { data: { cnpj, company_name: companyName, auth_method: "cert_a1" } },
      });

      if (createErr || !newUserData?.user) {
        console.error("[cert-a1] generateLink failed:", createErr);
        return NextResponse.json({ error: "Erro ao criar conta." }, { status: 500 });
      }

      userId = newUserData.user.id;

      // Confirm email and set metadata (generateLink may create unconfirmed user)
      await admin.auth.admin.updateUserById(userId, {
        email_confirm:  true,
        user_metadata: {
          cnpj,
          company_name:          companyName,
          auth_method:           "cert_a1",
          onboarding_complete:   true,
          initial_segment_chosen: false,
        },
      });

      // Minimal buyer row
      await admin.from("buyers").upsert(
        {
          user_id:         userId,
          name:            companyName ?? `CNPJ ${cnpj}`,
          email:           syntheticEmail,
          lgpd_consent:    true,
          lgpd_consent_at: new Date().toISOString(),
        },
        { onConflict: "user_id", ignoreDuplicates: true },
      );

      // Register cert identity
      await admin.from("cert_a1_identities").insert({
        user_id:      userId,
        cnpj,
        company_name: companyName,
        cert_subject: certSubject,
      });
    }

    // Set credibility level 3 (cert_a1) — GREATEST, never downgrades
    await admin.rpc("upsert_user_credibility", {
      p_user_id:   userId,
      p_provider:  "cert_a1",
      p_new_level: 3,
    });

    // Generate one-time magic-link token — consumed immediately by client verifyOtp
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type:  "magiclink",
      email: syntheticEmail,
    });

    if (linkErr || !linkData?.properties) {
      console.error("[cert-a1] token generation failed:", linkErr);
      return NextResponse.json({ error: "Erro ao gerar sessão." }, { status: 500 });
    }

    return NextResponse.json({
      token_hash:   linkData.properties.hashed_token,
      company_name: companyName,
      cnpj,
    });
  } catch (err) {
    console.error("[cert-a1] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
