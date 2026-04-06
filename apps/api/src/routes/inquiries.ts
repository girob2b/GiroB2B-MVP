import type { FastifyInstance } from "fastify";
import {
  authHeaderSchema,
  bearerAuth,
  createInquiryBodySchema,
  createInquiryResponseSchema,
  errorSchema,
  inquiryResponseSchema,
  validationErrorSchema,
} from "../lib/api-docs.js";
import { CreateInquirySchema } from "../schemas/inquiries.schema.js";
import {
  createDirectedInquiry,
  getInquiryErrorPayload,
  listBuyerInquiries,
  listSupplierInquiries,
} from "../services/inquiries.service.js";

export default async function inquiryRoutes(app: FastifyInstance) {
  app.get("/mine", {
    preHandler: app.authenticate,
    schema: {
      tags: ["Inquiries"],
      summary: "Lista as cotacoes enviadas pelo comprador autenticado",
      security: bearerAuth,
      headers: authHeaderSchema,
      response: {
        200: { type: "array", items: inquiryResponseSchema },
        401: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
    const token = request.headers.authorization!.slice(7);

    try {
      const inquiries = await listBuyerInquiries(request.userId, token);
      return reply.send(inquiries);
    } catch (error) {
      const { statusCode, payload } = getInquiryErrorPayload(error);
      return (reply as any).status(statusCode).send(payload);
    }
  });

  app.get("/received", {
    preHandler: app.authenticate,
    schema: {
      tags: ["Inquiries"],
      summary: "Lista as cotacoes recebidas pelo fornecedor autenticado",
      security: bearerAuth,
      headers: authHeaderSchema,
      response: {
        200: { type: "array", items: inquiryResponseSchema },
        401: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
    const token = request.headers.authorization!.slice(7);

    try {
      const inquiries = await listSupplierInquiries(request.userId, token);
      return reply.send(inquiries);
    } catch (error) {
      const { statusCode, payload } = getInquiryErrorPayload(error);
      return (reply as any).status(statusCode).send(payload);
    }
  });

  app.post("/", {
    preHandler: app.authenticate,
    schema: {
      tags: ["Inquiries"],
      summary: "Cria uma cotacao direcionada para um fornecedor",
      security: bearerAuth,
      headers: authHeaderSchema,
      body: createInquiryBodySchema,
      response: {
        200: createInquiryResponseSchema,
        201: createInquiryResponseSchema,
        400: validationErrorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        422: validationErrorSchema,
        429: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
    const parsed = CreateInquirySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors });
    }

    try {
      const result = await createDirectedInquiry(
        request.userId,
        request.userEmail,
        parsed.data
      );

      return reply.status(result.deduplicated ? 200 : 201).send(result);
    } catch (error) {
      const { statusCode, payload } = getInquiryErrorPayload(error);
      return (reply as any).status(statusCode).send(payload);
    }
  });
}
