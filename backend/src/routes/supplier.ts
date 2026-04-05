import type { FastifyInstance } from "fastify";
import { UpdateProfileSchema, UpdateSettingsSchema } from "../schemas/supplier.schema.js";
import {
  getSupplierByUserId,
  updateSupplierProfile,
  updateSupplierSettings,
} from "../services/supplier.service.js";

export default async function supplierRoutes(app: FastifyInstance) {
  // GET /supplier/me
  app.get("/me", { preHandler: app.authenticate }, async (request, reply) => {
    const token    = request.headers.authorization!.slice(7);
    const supplier = await getSupplierByUserId(request.userId, token);
    if (!supplier) return reply.status(404).send({ error: "Fornecedor não encontrado." });
    return reply.send(supplier);
  });

  // PATCH /supplier/me — atualiza perfil público
  app.patch("/me", { preHandler: app.authenticate }, async (request, reply) => {
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
  app.patch("/settings", { preHandler: app.authenticate }, async (request, reply) => {
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
