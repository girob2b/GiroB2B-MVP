import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// ─── Tipos públicos dos inboxes ──────────────────────────────────────────────

/**
 * Uma linha do inbox do VENDEDOR — "Propostas enviadas".
 *
 * Cada row = um contato/oferta que este supplier enviou a uma demand.
 * Retorna dados da demanda (título/categoria/slug) e da empresa do comprador
 * (trade_name anonimizado → company_name do buyers, que só aparece neste contexto
 * privado pois o supplier já contatou). A oferta (price/deadline/message) é exibida
 * como "o que você enviou".
 */
export interface SentOffer {
  /** ID do registro em demand_contacts */
  contact_id: string;
  /** Data em que o contato foi feito */
  clicked_at: string;
  /** Demand relacionada */
  demand: {
    id: string;
    slug: string;
    title: string;
    category_id: string | null;
    delivery_city: string | null;
    delivery_state: string | null;
  };
  /** Empresa do comprador — visível porque o supplier já contatou */
  buyer_company: string | null;
  /** Oferta enviada (todos opcionais — o vendedor pode ter contactado sem oferta) */
  offer: {
    price_cents: number | null;
    deadline: string | null;
    message: string | null;
  };
}

/**
 * Uma linha do inbox do COMPRADOR — "Ofertas recebidas" (nível de demand).
 *
 * Cada row = uma demanda que recebeu ao menos uma oferta.
 * Dentro de `offers` estão os detalhes de cada oferta recebida.
 */
export interface ReceivedOfferGroup {
  /** Dados da demanda que recebeu as ofertas */
  demand: {
    id: string;
    slug: string;
    title: string;
    status: string;
    category_id: string | null;
  };
  /** Ofertas recebidas nesta demanda, ordenadas da mais recente */
  offers: ReceivedOffer[];
}

/**
 * Uma oferta individual dentro de ReceivedOfferGroup.
 * Visível apenas no dashboard privado do comprador.
 */
export interface ReceivedOffer {
  contact_id: string;
  clicked_at: string;
  /** Identificação do vendedor — visível ao comprador no dashboard privado */
  supplier: {
    id: string;
    trade_name: string | null;
    company_name: string | null;
    slug: string | null;
    city: string | null;
    state: string | null;
  };
  offer: {
    price_cents: number | null;
    deadline: string | null;
    message: string | null;
  };
}

// ─── listSentOffers ───────────────────────────────────────────────────────────

/**
 * Retorna as propostas enviadas pelo vendedor (inbox "Propostas enviadas").
 *
 * Segurança: chamado APENAS por Route Handler autenticado que verificou
 * auth.uid() == supplierUserId antes de invocar este service.
 * Usa adminClient para evitar conflito de RLS aninhado — a policy
 * demand_contacts_supplier_read já garante o escopo; aqui a guarda
 * de segurança é feita no Route Handler.
 *
 * Joins feitos em uma query única (sem N+1):
 *   demand_contacts → demands (title, slug, etc.)
 *   demand_contacts → demands → buyers (company info do comprador)
 *
 * Nota: buyers JOIN via demands.buyer_user_id = buyers.user_id.
 * PII do comprador (company_name) é exposta APENAS no dashboard privado
 * do próprio vendedor que já contatou — não vaza em superfície pública.
 */
export async function listSentOffers(supplierUserId: string): Promise<SentOffer[]> {
  const admin = createAdminClient();

  // Query com join embutido via select aninhado do supabase-js.
  // demand_contacts → demands (embedded select) → buyers (nested select).
  // Ordenado por clicked_at DESC (mais recente primeiro).
  const { data, error } = await admin
    .from("demand_contacts")
    .select(
      `id,
       clicked_at,
       offer_price_cents,
       offer_deadline,
       offer_message,
       demands!inner (
         id,
         slug,
         title,
         category_id,
         delivery_city,
         delivery_state,
         buyer_user_id
       )`
    )
    .eq("supplier_user_id", supplierUserId)
    .order("clicked_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  // supabase-js retorna joins como array mesmo em relações !inner (1:1 na prática).
  // Usamos unknown como intermediário para cast seguro de tipo.
  type DemandJoin = {
    id: string;
    slug: string;
    title: string;
    category_id: string | null;
    delivery_city: string | null;
    delivery_state: string | null;
    buyer_user_id: string | null;
  };
  type RawContactRow = {
    id: string;
    clicked_at: string;
    offer_price_cents: number | null;
    offer_deadline: string | null;
    offer_message: string | null;
    demands: DemandJoin | DemandJoin[];
  };

  const rows = (data ?? []) as unknown as RawContactRow[];

  if (rows.length === 0) return [];

  // Normaliza o join demands (pode vir como array ou objeto do supabase-js).
  const normalizeDemand = (d: DemandJoin | DemandJoin[]): DemandJoin =>
    Array.isArray(d) ? d[0] : d;

  // Coleta buyer_user_ids únicos para buscar company_name dos compradores.
  // Apenas uma query adicional (não N+1: 1 query pra todos os buyers de uma vez).
  const buyerUserIds = [
    ...new Set(
      rows
        .map((r) => normalizeDemand(r.demands).buyer_user_id)
        .filter((id): id is string => id !== null)
    ),
  ];

  const buyerCompanyMap = new Map<string, string | null>();

  if (buyerUserIds.length > 0) {
    const { data: buyersData } = await admin
      .from("buyers")
      .select("user_id, company_name")
      .in("user_id", buyerUserIds);

    for (const b of (buyersData ?? []) as Array<{
      user_id: string;
      company_name: string | null;
    }>) {
      buyerCompanyMap.set(b.user_id, b.company_name ?? null);
    }
  }

  return rows.map((row): SentOffer => {
    const demand = normalizeDemand(row.demands);
    return {
      contact_id: row.id,
      clicked_at: row.clicked_at,
      demand: {
        id: demand.id,
        slug: demand.slug,
        title: demand.title,
        category_id: demand.category_id,
        delivery_city: demand.delivery_city,
        delivery_state: demand.delivery_state,
      },
      buyer_company: demand.buyer_user_id
        ? (buyerCompanyMap.get(demand.buyer_user_id) ?? null)
        : null,
      offer: {
        price_cents: row.offer_price_cents,
        deadline: row.offer_deadline,
        message: row.offer_message,
      },
    };
  });
}

// ─── listReceivedOffers ───────────────────────────────────────────────────────

/**
 * Retorna as ofertas recebidas pelo comprador, agrupadas por demanda.
 *
 * Segurança: chamado APENAS por Route Handler autenticado que verificou
 * auth.uid() == buyerUserId antes de invocar este service.
 * A PII do vendedor (trade_name, company_name) é exposta APENAS no
 * dashboard privado do comprador — não vaza em superfície pública.
 *
 * Estratégia anti-N+1:
 *   1. Uma query para buscar as demands do buyer (com contatos).
 *   2. Uma query para buscar os contatos dessas demands com join nos suppliers.
 *   Agrupa em memória — adequado para o volume esperado no MVP
 *   (comprador com poucas dezenas de demandas, cada uma com poucas ofertas).
 */
export async function listReceivedOffers(
  buyerUserId: string
): Promise<ReceivedOfferGroup[]> {
  const admin = createAdminClient();

  // 1. Busca demands do comprador que têm ao menos um contato.
  const { data: demandsData, error: demandsError } = await admin
    .from("demands")
    .select("id, slug, title, status, category_id, contact_count")
    .eq("buyer_user_id", buyerUserId)
    .gt("contact_count", 0)
    .order("created_at", { ascending: false })
    .limit(100);

  if (demandsError) throw new Error(demandsError.message);

  const demands = (demandsData ?? []) as Array<{
    id: string;
    slug: string;
    title: string;
    status: string;
    category_id: string | null;
    contact_count: number;
  }>;

  if (demands.length === 0) return [];

  const demandIds = demands.map((d) => d.id);

  // 2. Busca todos os contatos dessas demands com dados do supplier.
  // Join demand_contacts → suppliers via supplier_id.
  const { data: contactsData, error: contactsError } = await admin
    .from("demand_contacts")
    .select(
      `id,
       demand_id,
       clicked_at,
       offer_price_cents,
       offer_deadline,
       offer_message,
       suppliers!inner (
         id,
         trade_name,
         company_name,
         slug,
         city,
         state
       )`
    )
    .in("demand_id", demandIds)
    .order("clicked_at", { ascending: false });

  if (contactsError) throw new Error(contactsError.message);

  type SupplierJoin = {
    id: string;
    trade_name: string | null;
    company_name: string | null;
    slug: string | null;
    city: string | null;
    state: string | null;
  };

  type ContactRow = {
    id: string;
    demand_id: string;
    clicked_at: string;
    offer_price_cents: number | null;
    offer_deadline: string | null;
    offer_message: string | null;
    suppliers: SupplierJoin | SupplierJoin[];
  };

  // supabase-js retorna joins como array; cast via unknown é necessário.
  const contacts = (contactsData ?? []) as unknown as ContactRow[];

  // Agrupa os contatos por demand_id em memória.
  const contactsByDemand = new Map<string, ContactRow[]>();
  for (const contact of contacts) {
    const existing = contactsByDemand.get(contact.demand_id) ?? [];
    existing.push(contact);
    contactsByDemand.set(contact.demand_id, existing);
  }

  // Monta o resultado final agrupado por demanda.
  return demands.map((demand): ReceivedOfferGroup => {
    const demandContacts = contactsByDemand.get(demand.id) ?? [];
    return {
      demand: {
        id: demand.id,
        slug: demand.slug,
        title: demand.title,
        status: demand.status,
        category_id: demand.category_id,
      },
      offers: demandContacts.map((c): ReceivedOffer => {
        // Normaliza: supabase-js pode retornar o join como array ou objeto.
        const supplier = Array.isArray(c.suppliers) ? c.suppliers[0] : c.suppliers;
        return {
          contact_id: c.id,
          clicked_at: c.clicked_at,
          supplier: {
            id: supplier.id,
            trade_name: supplier.trade_name,
            company_name: supplier.company_name,
            slug: supplier.slug,
            city: supplier.city,
            state: supplier.state,
          },
          offer: {
            price_cents: c.offer_price_cents,
            deadline: c.offer_deadline,
            message: c.offer_message,
          },
        };
      }),
    };
  });
}
