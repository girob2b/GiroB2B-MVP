import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabase } from "../plugins/db.js";
import { logger } from "../lib/logger.js";

/**
 * Rotas de consulta/contato/remoção de empresas descobertas.
 * Ver docs/WEB_SCRAPING.md §6.
 */
export default async function companiesRoutes(app: FastifyInstance) {
  // GET /companies/:key — :key pode ser id (uuid) ou cnpj (14 dígitos)
  app.get<{ Params: { key: string } }>("/companies/:key", async (req, reply) => {
    const { key } = req.params;
    const isUuid = /^[0-9a-f-]{36}$/i.test(key);
    const column = isUuid ? "id" : "cnpj";

    const { data, error } = await supabase
      .from("discovered_companies")
      .select("*")
      .eq(column, key)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, key }, "Erro ao buscar discovered_company");
      return reply.code(500).send({ error: error.message });
    }

    if (!data) return reply.code(404).send({ error: "company_not_found" });

    // Atualiza last_accessed_at de forma best-effort (não bloqueia response)
    void supabase
      .from("discovered_companies")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", data.id);

    return data;
  });

  // POST /companies/:id/contact — registra intenção
  const contactSchema = z.object({
    user_id: z.string().uuid().optional(),
    channel: z.enum(["email", "whatsapp", "phone", "invite", "site"]),
    message: z.string().max(2000).optional(),
    contact_target: z.string().optional(),
  });

  app.post<{ Params: { id: string } }>("/companies/:id/contact", async (req, reply) => {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }

    const { data, error } = await supabase
      .from("contact_requests")
      .insert({
        company_id: req.params.id,
        ...parsed.data,
      })
      .select()
      .single();

    if (error) {
      logger.error({ err: error }, "Erro ao registrar contact_request");
      return reply.code(500).send({ error: error.message });
    }

    // TODO(Sprint 3): disparar email/wa.me/etc conforme channel
    return reply.code(201).send(data);
  });

  // DELETE /companies/:cnpj — LGPD
  app.delete<{ Params: { cnpj: string } }>("/companies/:cnpj", async (req, reply) => {
    const { cnpj } = req.params;

    const { data, error } = await supabase
      .from("discovered_companies")
      .delete()
      .eq("cnpj", cnpj)
      .select("domain")
      .maybeSingle();

    if (error) return reply.code(500).send({ error: error.message });
    if (!data) return reply.code(404).send({ error: "company_not_found" });

    await supabase
      .from("domain_blocklist")
      .upsert({ domain: data.domain, reason: "LGPD — empresa pediu remoção" });

    logger.info({ cnpj, domain: data.domain }, "Empresa removida (LGPD)");
    return { ok: true, domain: data.domain };
  });
}
