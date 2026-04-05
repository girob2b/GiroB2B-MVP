import type { FastifyInstance } from "fastify";
import { validateCNPJ } from "../lib/brasilapi.js";

export default async function cnpjRoutes(app: FastifyInstance) {
  app.get<{ Params: { cnpj: string } }>("/:cnpj", async (request, reply) => {
    const { cnpj } = request.params;
    const result = await validateCNPJ(cnpj);

    if (!result.valid) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.data);
  });
}
