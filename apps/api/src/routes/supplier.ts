import type { FastifyInstance } from "fastify";
import {
  authHeaderSchema,
  bearerAuth,
  errorSchema,
  successSchema,
  supplierResponseSchema,
  supplierUpdateResponseSchema,
  updateProfileBodySchema,
  updateSettingsBodySchema,
  validationErrorSchema,
} from "../lib/api-docs.js";
import { UpdateProfileSchema, UpdateSettingsSchema } from "../schemas/supplier.schema.js";
import {
  getSupplierByUserId,
  updateSupplierProfile,
  updateSupplierSettings,
} from "../services/supplier.service.js";

export default async function supplierRoutes(app: FastifyInstance) {
  // GET /supplier/me
  app.get("/me", {
    preHandler: app.authenticate,
    schema: {
      tags: ["Supplier"],
      summary: "Busca o fornecedor autenticado",
      security: bearerAuth,
      headers: authHeaderSchema,
      response: {
        200: supplierResponseSchema,
        401: errorSchema,
        404: errorSchema,
      },
    },
  }, async (request, reply) => {
    const token    = request.headers.authorization!.slice(7);
    const supplier = await getSupplierByUserId(request.userId, token);
    if (!supplier) return reply.status(404).send({ error: "Fornecedor não encontrado." });
    return reply.send(supplier);
  });

  // PATCH /supplier/me — atualiza perfil público
  app.patch("/me", {
    preHandler: app.authenticate,
    schema: {
      tags: ["Supplier"],
      summary: "Atualiza o perfil publico do fornecedor",
      security: bearerAuth,
      headers: authHeaderSchema,
      body: updateProfileBodySchema,
      response: {
        200: supplierUpdateResponseSchema,
        400: validationErrorSchema,
        401: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
    const token    = request.headers.authorization!.slice(7);
    const supplier = await getSupplierByUserId(request.userId, token);
    if (!supplier) return reply.status(404).send({ error: "Fornecedor não encontrado." });

    const parsed = UpdateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors });
    }

    try {
      const result = await updateSupplierProfile(
        supplier.id,
        supplier.trade_name,
        supplier.city,
        supplier.state,
        parsed.data,
        token
      );
      return reply.send({ success: true, ...result });
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // PATCH /supplier/settings — endereço + dados fiscais
  app.patch("/settings", {
    preHandler: app.authenticate,
    schema: {
      tags: ["Supplier"],
      summary: "Atualiza configuracoes privadas do fornecedor",
      security: bearerAuth,
      headers: authHeaderSchema,
      body: updateSettingsBodySchema,
      response: {
        200: successSchema,
        400: validationErrorSchema,
        401: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
    const token    = request.headers.authorization!.slice(7);
    const supplier = await getSupplierByUserId(request.userId, token);
    if (!supplier) return reply.status(404).send({ error: "Fornecedor não encontrado." });

    const parsed = UpdateSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors });
    }

    try {
      await updateSupplierSettings(supplier.id, parsed.data, token);
      return reply.send({ success: true });
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message });
    }
  });
}
