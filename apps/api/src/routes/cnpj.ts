import type { FastifyInstance } from "fastify";
import { validateCNPJ } from "../lib/brasilapi.js";
import { cnpjResponseSchema, errorSchema } from "../lib/api-docs.js";

export default async function cnpjRoutes(app: FastifyInstance) {
  app.get<{ Params: { cnpj: string } }>("/:cnpj", {
    schema: {
      tags: ["CNPJ"],
      summary: "Consulta e valida um CNPJ",
      params: {
        type: "object",
        properties: {
          cnpj: { type: "string" },
        },
        required: ["cnpj"],
      },
      response: {
        200: cnpjResponseSchema,
        400: errorSchema,
      },
    },
  }, async (request, reply) => {
    const { cnpj } = request.params;
    const result = await validateCNPJ(cnpj);

    if (!result.valid) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.data);
  });
}
