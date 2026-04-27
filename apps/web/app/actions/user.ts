"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateCNPJ } from "@/lib/brasilapi";
import { supplierSlug } from "@/lib/slug";

// ─── Update buyer profile ──────────────────────────────────────────────────
export type UpdateBuyerProfileState = { error?: string; success?: boolean };

export async function updateBuyerProfile(
  _prev: UpdateBuyerProfileState,
  formData: FormData
): Promise<UpdateBuyerProfileState> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const name                = (formData.get("name")                as string | null)?.trim() || null;
  const phone               = (formData.get("phone")               as string | null)?.trim() || null;
  const company_name        = (formData.get("company_name")        as string | null)?.trim() || null;
  const cnpj                = ((formData.get("cnpj")               as string | null) ?? "").replace(/\D/g, "") || null;
  const inscricao_municipal = (formData.get("inscricao_municipal") as string | null)?.trim() || null;
  const inscricao_estadual  = (formData.get("inscricao_estadual")  as string | null)?.trim() || null;
  const address             = (formData.get("address")             as string | null)?.trim() || null;
  const cep                 = ((formData.get("cep")                as string | null) ?? "").replace(/\D/g, "") || null;
  const city                = (formData.get("city")                as string | null)?.trim() || null;
  const state               = (formData.get("state")               as string | null)?.trim() || null;
  const purchase_frequency  = (formData.get("purchase_frequency")  as string | null)?.trim() || null;

  if (!name) return { error: "Informe seu nome." };
  if (cnpj && cnpj.length !== 14) return { error: "CNPJ deve ter 14 dígitos." };
  if (cep && cep.length !== 8)   return { error: "CEP deve ter 8 dígitos." };

  // Recupera CNPJ atual no banco pra evitar revalidação desnecessária a cada save.
  const { data: existing } = await supabase
    .from("buyers")
    .select("id, cnpj")
    .eq("user_id", authData.user.id)
    .maybeSingle<{ id: string; cnpj: string | null }>();

  const fields = {
    name,
    phone,
    company_name,
    cnpj,
    inscricao_municipal,
    inscricao_estadual,
    address,
    cep,
    city,
    state,
    purchase_frequency,
  };

  const { error } = existing
    ? await supabase.from("buyers").update(fields).eq("user_id", authData.user.id)
    : await supabase.from("buyers").insert({
        user_id:         authData.user.id,
        email:           authData.user.email ?? "",
        lgpd_consent:    true,
        lgpd_consent_at: new Date().toISOString(),
        ...fields,
      });

  if (error) {
    console.error("[updateBuyerProfile]", error);
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  // ── Selo "Empresa Verificada" (RF-01.14 / RN-01.06) ────────────────────────
  // Só vira TRUE se o CNPJ estiver ATIVO na BrasilAPI. Update em separado pra que
  // a falta da migration 030 (colunas is_company_verified/cnpj_verified_at) não
  // quebre o save dos outros campos. CNPJ inválido/inativo → não bloqueia (RN-01.06),
  // só não concede o selo.
  if (cnpj) {
    const cnpjChanged = !existing || existing.cnpj !== cnpj;
    if (cnpjChanged) {
      const validation = await validateCNPJ(cnpj);
      if (validation.valid) {
        const verifyRes = await supabase
          .from("buyers")
          .update({
            is_company_verified: true,
            cnpj_verified_at: new Date().toISOString(),
          })
          .eq("user_id", authData.user.id);

        if (verifyRes.error && verifyRes.error.code !== "42703" /* undefined_column */) {
          console.error("[updateBuyerProfile] failed to set verified flag:", verifyRes.error);
        }
      }
    }
  }

  revalidatePath("/painel/perfil");
  return { success: true };
}


// ─── Atualizar hábito de compra (form leve, só purchase_frequency) ────────
export type UpdateBuyerHabitsState = { error?: string; success?: boolean };

export async function updateBuyerHabits(
  _prev: UpdateBuyerHabitsState,
  formData: FormData
): Promise<UpdateBuyerHabitsState> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const purchase_frequency = (formData.get("purchase_frequency") as string | null)?.trim() || null;

  const { error } = await supabase
    .from("buyers")
    .update({ purchase_frequency })
    .eq("user_id", authData.user.id);

  if (error) {
    console.error("[updateBuyerHabits]", error);
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/painel/perfil");
  return { success: true };
}


// ─── Primeira escolha de modo de uso (sem cooldown, sem aprovação admin) ──
// Usado quando o user pulou o onboarding e ainda precisa fazer a 1ª escolha
// consciente. Detectado via user_metadata.initial_segment_chosen === false.
// Após a confirmação, marca a flag = true e o user passa a usar requestRoleChange
// pra trocas subsequentes (com aprovação admin + cooldown).
export type ChooseInitialModeState = { error?: string; success?: boolean };

export async function chooseInitialMode(
  _prev: ChooseInitialModeState,
  formData: FormData
): Promise<ChooseInitialModeState> {
  const target = formData.get("target_mode") as string;
  if (!["buyer", "supplier", "both"].includes(target)) {
    return { error: "Modo inválido." };
  }
  const targetMode = target as "buyer" | "supplier" | "both";

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  const user = authData.user;

  // Carrega o estado atual.
  const [buyerRes, supplierRes] = await Promise.all([
    supabase.from("buyers").select("id, name, phone, company_name, cnpj, address, cep, city, state, inscricao_municipal, inscricao_estadual")
      .eq("user_id", user.id).maybeSingle(),
    supabase.from("suppliers").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  const hasBuyer = !!buyerRes.data;
  const hasSupplier = !!supplierRes.data;
  const wantsBuyer    = targetMode === "buyer"    || targetMode === "both";
  const wantsSupplier = targetMode === "supplier" || targetMode === "both";

  // Garante buyer row (a plataforma é B2B; todo user precisa).
  if (wantsBuyer && !hasBuyer) {
    const { error } = await supabase.from("buyers").insert({
      user_id:         user.id,
      name:            (user.user_metadata?.full_name as string | undefined) || user.email?.split("@")[0] || "Comprador",
      email:           user.email ?? "",
      lgpd_consent:    true,
      lgpd_consent_at: new Date().toISOString(),
    });
    if (error) {
      console.error("[chooseInitialMode] insert buyer failed:", error);
      return { error: "Não foi possível ativar o modo comprador. Tente novamente." };
    }
  }

  // Cria supplier row se necessário — exige dados B2B no buyer (gate).
  if (wantsSupplier && !hasSupplier) {
    const b = buyerRes.data;
    const missing: string[] = [];
    if (!b?.cnpj)         missing.push("CNPJ");
    if (!b?.company_name) missing.push("razão social");
    if (!b?.phone)        missing.push("telefone");
    if (!b?.address)      missing.push("endereço");
    if (!b?.city)         missing.push("cidade");
    if (!b?.state)        missing.push("estado");
    if (missing.length > 0) {
      return {
        error: `Preencha os dados da empresa antes de ativar o modo vendedor. Faltam: ${missing.join(", ")}.`,
      };
    }

    // RN-01.01: só CNPJs ATIVOS na Receita podem virar fornecedor.
    const validation = await validateCNPJ(b!.cnpj!);
    if (!validation.valid) {
      return {
        error: validation.error
          ? `CNPJ inválido: ${validation.error}`
          : "CNPJ inválido. Confira em Dados da Empresa antes de ativar o modo vendedor.",
      };
    }

    // Slug único — colisão (mesmo nome + cidade) recebe sufixo curto baseado no CNPJ.
    const baseSlug = supplierSlug(b!.company_name!, b!.city!);
    const slugCheck = await supabase
      .from("suppliers")
      .select("id")
      .eq("slug", baseSlug)
      .maybeSingle();
    const finalSlug = slugCheck.data
      ? `${baseSlug}-${b!.cnpj!.slice(-4)}`
      : baseSlug;

    const { error } = await supabase.from("suppliers").insert({
      user_id:             user.id,
      cnpj:                b!.cnpj!,
      company_name:        b!.company_name!,
      trade_name:          b!.company_name!, // user pode editar depois em /painel/perfil-publico
      slug:                finalSlug,
      phone:               b!.phone!,
      address:             b!.address,
      cep:                 b!.cep,
      city:                b!.city!,
      state:               b!.state!,
      inscricao_municipal: b!.inscricao_municipal,
      inscricao_estadual:  b!.inscricao_estadual,
      cnpj_status:         "ativa",
      is_verified:         true,
    });
    if (error) {
      console.error("[chooseInitialMode] insert supplier failed:", error);
      // Mensagem mais útil pra erros comuns: CNPJ duplicado vs RLS/constraint.
      if (error.code === "23505") {
        return { error: "Este CNPJ já está cadastrado como fornecedor em outra conta." };
      }
      return { error: `Não foi possível ativar o modo vendedor: ${error.message}` };
    }
  }

  // Marca a primeira escolha como feita. Daqui em diante, qualquer troca
  // passa pelo fluxo requestRoleChange (cooldown + admin).
  const { error: metaErr } = await supabase.auth.updateUser({
    data: { initial_segment_chosen: true },
  });
  if (metaErr) {
    console.error("[chooseInitialMode] updateUser failed:", metaErr);
    return { error: "Modo ativado, mas ocorreu erro ao salvar a escolha. Recarregue a página." };
  }

  // Refresh do JWT pra que o middleware veja a flag atualizada.
  await supabase.auth.refreshSession();

  revalidatePath("/painel/perfil");
  revalidatePath("/painel");
  return { success: true };
}


// ─── Pedido de troca de tipo de conta (precisa liberação admin) ───────────
export type RequestRoleChangeState = {
  error?: string;
  success?: boolean;
  pendingMessage?: string;
};

const ROLE_CHANGE_COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000;

export async function requestRoleChange(
  _prev: RequestRoleChangeState,
  formData: FormData
): Promise<RequestRoleChangeState> {
  const target = formData.get("target_mode") as string;
  if (!["buyer", "supplier", "both"].includes(target)) {
    return { error: "Modo inválido." };
  }
  const targetMode = target as "buyer" | "supplier" | "both";

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  const user = authData.user;

  const [supplierRes, buyerRes, profileRes, pendingRes] = await Promise.all([
    supabase.from("suppliers")
      .select("id, cnpj, company_name, phone, address, city, state")
      .eq("user_id", user.id).maybeSingle(),
    supabase.from("buyers")
      .select("id, cnpj, company_name, phone, address, cep, city, state")
      .eq("user_id", user.id).maybeSingle(),
    supabase.from("user_profiles")
      .select("last_role_change_at")
      .eq("id", user.id).maybeSingle<{ last_role_change_at: string | null }>(),
    supabase.from("role_change_requests")
      .select("id")
      .eq("user_id", user.id).eq("status", "pending")
      .maybeSingle<{ id: string }>(),
  ]);

  const hasSupplier = !!supplierRes.data;
  const hasBuyer    = !!buyerRes.data;
  const currentMode: "buyer" | "supplier" | "both" =
    hasSupplier && hasBuyer ? "both" : hasSupplier ? "supplier" : "buyer";

  if (targetMode === currentMode) {
    return { error: "Você já está nesse modo de uso." };
  }

  if (pendingRes.data) {
    return { error: "Você já tem uma solicitação de troca pendente. Aguarde a liberação." };
  }

  // Cooldown 2 dias desde a última mudança PROCESSADA
  const lastChange = profileRes.data?.last_role_change_at;
  if (lastChange) {
    const elapsed = Date.now() - new Date(lastChange).getTime();
    if (elapsed < ROLE_CHANGE_COOLDOWN_MS) {
      const remainingHours = Math.ceil((ROLE_CHANGE_COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
      const days = Math.floor(remainingHours / 24);
      const hours = remainingHours % 24;
      const wait = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
      return { error: `Você só pode pedir troca de modo a cada 2 dias. Aguarde ${wait}.` };
    }
  }

  // Gate B2B: cadastro completo é obrigatório.
  // Verifica nos dados que o user JÁ tem (buyer e/ou supplier).
  const missing: string[] = [];
  if (hasBuyer && buyerRes.data) {
    const b = buyerRes.data;
    if (!b.cnpj)         missing.push("CNPJ");
    if (!b.company_name) missing.push("razão social");
    if (!b.phone)        missing.push("telefone");
    if (!b.address)      missing.push("endereço");
    if (!b.cep)          missing.push("CEP");
    if (!b.city)         missing.push("cidade");
    if (!b.state)        missing.push("estado");
  }
  if (hasSupplier && supplierRes.data) {
    const s = supplierRes.data;
    if (!s.cnpj)         missing.push("CNPJ (empresa)");
    if (!s.company_name) missing.push("razão social (empresa)");
    if (!s.phone)        missing.push("telefone (empresa)");
    if (!s.address)      missing.push("endereço (empresa)");
    if (!s.city)         missing.push("cidade (empresa)");
    if (!s.state)        missing.push("estado (empresa)");
  }
  if (missing.length > 0) {
    return {
      error: `Complete seu perfil antes de solicitar a troca. Faltam: ${[...new Set(missing)].join(", ")}.`,
    };
  }

  // Cria pedido pendente
  const { error: insertErr } = await supabase
    .from("role_change_requests")
    .insert({
      user_id:      user.id,
      current_mode: currentMode,
      target_mode:  targetMode,
      status:       "pending",
    });

  if (insertErr) {
    console.error("[requestRoleChange] insert error:", insertErr);
    return { error: "Não foi possível criar a solicitação. Tente novamente." };
  }

  return {
    success: true,
    pendingMessage: "Sua alteração foi para a liberação de administrador.",
  };
}
