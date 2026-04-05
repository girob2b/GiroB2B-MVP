import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { createClient } from "../lib/supabase.js";

export const suggestionSchema = z.object({
  query: z.string().min(2, "O termo de busca deve ter pelo menos 2 caracteres"),
  category_slug: z.string().optional(),
});

export type SuggestionInput = z.infer<typeof suggestionSchema>;

export default async function suggestionRoutes(app: FastifyInstance) {
  app.post("/", {
    preHandler: [app.authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = suggestionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(422).send({
          error: "Dados inválidos.",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { query, category_slug } = parsed.data;
      const userId = request.userId;
      const token = request.headers.authorization!.slice(7);

      const supabase = createClient(token);
      const { error } = await supabase
        .from("search_suggestions")
        .insert({
          user_id: userId,
          query,
          category_slug: category_slug || null,
          status: "pending",
        });

      if (error) {
        app.log.error(error, "Erro ao salvar sugestão de busca");
        return reply.status(500).send({ error: error.message || "Erro ao salvar sugestão" });
      }

      return reply.status(201).send({ success: true });
    }
  });
}
