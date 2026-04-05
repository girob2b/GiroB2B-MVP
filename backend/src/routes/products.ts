import type { FastifyInstance } from "fastify";
import { CreateProductSchema, UpdateProductSchema } from "../schemas/products.schema.js";
import { createProduct, updateProduct, deleteProduct } from "../services/products.service.js";
import { getSupplierIdForUser } from "../services/supplier.service.js";

export default async function productRoutes(app: FastifyInstance) {
  // GET /products — lista produtos do fornecedor autenticado
  app.get("/", { preHandler: app.authenticate }, async (request, reply) => {
    const token      = request.headers.authorization!.slice(7);
    const supplierId = await getSupplierIdForUser(request.userId, token);
    if (!supplierId) return reply.status(404).send({ error: "Fornecedor não encontrado." });

    const { createClient } = await import("../lib/supabase.js");
    const supabase = createClient(token);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("supplier_id", supplierId)
      .neq("status", "deleted")
      .order("created_at", { ascending: false });

    if (error) return reply.status(500).send({ error: "Erro ao buscar produtos." });
    return reply.send(data);
  });

  // POST /products
  app.post("/", { preHandler: app.authenticate }, async (request, reply) => {
    const token      = request.headers.authorization!.slice(7);
    const supplierId = await getSupplierIdForUser(request.userId, token);
    if (!supplierId) return reply.status(404).send({ error: "Fornecedor não encontrado." });

    const parsed = CreateProductSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors });
    }

    try {
      const product = await createProduct(supplierId, parsed.data, token);
      return reply.status(201).send(product);
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // PATCH /products/:id
  app.patch<{ Params: { id: string } }>("/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const token      = request.headers.authorization!.slice(7);
    const supplierId = await getSupplierIdForUser(request.userId, token);
    if (!supplierId) return reply.status(404).send({ error: "Fornecedor não encontrado." });

    const parsed = UpdateProductSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors });
    }

    try {
      const product = await updateProduct(request.params.id, supplierId, parsed.data, token);
      return reply.send(product);
    } catch (err) {
      const msg = (err as Error).message;
      return reply.status(msg === "Produto não encontrado." ? 404 : 500).send({ error: msg });
    }
  });

  // DELETE /products/:id
  app.delete<{ Params: { id: string } }>("/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const token      = request.headers.authorization!.slice(7);
    const supplierId = await getSupplierIdForUser(request.userId, token);
    if (!supplierId) return reply.status(404).send({ error: "Fornecedor não encontrado." });

    try {
      await deleteProduct(request.params.id, supplierId, token);
      return reply.status(204).send();
    } catch (err) {
      const msg = (err as Error).message;
      return reply.status(msg === "Produto não encontrado." ? 404 : 500).send({ error: msg });
    }
  });
}
