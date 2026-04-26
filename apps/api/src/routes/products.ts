import type { FastifyInstance } from "fastify";
import {
  authHeaderSchema,
  bearerAuth,
  errorSchema,
  productBodySchema,
  productResponseSchema,
  updateProductBodySchema,
  validationErrorSchema,
} from "../lib/api-docs.js";
import { CreateProductSchema, UpdateProductSchema } from "../schemas/products.schema.js";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  importProduct,
  ImportProductError,
} from "../services/products.service.js";
import { getSupplierIdForUser } from "../services/supplier.service.js";
import { z } from "zod";

const ImportProductBodySchema = z.object({
  original_product_id: z.string().uuid(),
});

export default async function productRoutes(app: FastifyInstance) {
  // GET /products — lista produtos do fornecedor autenticado
  app.get("/", {
    preHandler: app.authenticate,
    schema: {
      tags: ["Products"],
      summary: "Lista os produtos do fornecedor autenticado",
      security: bearerAuth,
      headers: authHeaderSchema,
      response: {
        200: { type: "array", items: productResponseSchema },
        401: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
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
  app.post("/", {
    preHandler: app.authenticate,
    schema: {
      tags: ["Products"],
      summary: "Cria um produto",
      security: bearerAuth,
      headers: authHeaderSchema,
      body: productBodySchema,
      response: {
        201: productResponseSchema,
        400: validationErrorSchema,
        401: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
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
  app.patch<{ Params: { id: string } }>("/:id", {
    preHandler: app.authenticate,
    schema: {
      tags: ["Products"],
      summary: "Atualiza um produto",
      security: bearerAuth,
      headers: authHeaderSchema,
      params: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
        },
        required: ["id"],
      },
      body: updateProductBodySchema,
      response: {
        200: productResponseSchema,
        400: validationErrorSchema,
        401: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
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
  app.delete<{ Params: { id: string } }>("/:id", {
    preHandler: app.authenticate,
    schema: {
      tags: ["Products"],
      summary: "Remove um produto logicamente",
      security: bearerAuth,
      headers: authHeaderSchema,
      params: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
        },
        required: ["id"],
      },
      response: {
        204: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        401: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
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

  // POST /products/import — importa produto de outro fornecedor (revenda)
  app.post("/import", {
    preHandler: app.authenticate,
    schema: {
      tags: ["Products"],
      summary: "Importa imagem + nome de outro produto pro catálogo do revendedor",
      security: bearerAuth,
      headers: authHeaderSchema,
      body: {
        type: "object",
        properties: {
          original_product_id: { type: "string", format: "uuid" },
        },
        required: ["original_product_id"],
      },
      response: {
        201: {
          type: "object",
          properties: { id: { type: "string", format: "uuid" } },
          required: ["id"],
        },
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        409: errorSchema,
        429: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
    const token      = request.headers.authorization!.slice(7);
    const supplierId = await getSupplierIdForUser(request.userId, token);
    if (!supplierId) return reply.status(404).send({ error: "Fornecedor não encontrado." });

    const parsed = ImportProductBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "ID do produto original inválido." });
    }

    try {
      const result = await importProduct(supplierId, parsed.data.original_product_id, token);
      return reply.status(201).send(result);
    } catch (err) {
      if (err instanceof ImportProductError) {
        return reply.status(err.statusCode as 400 | 401 | 403 | 404 | 409 | 429 | 500).send({ error: err.message });
      }
      return reply.status(500).send({ error: (err as Error).message });
    }
  });
}
