import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getUserFromToken } from "../lib/supabase.js";

// Augment Fastify's request type to carry the authenticated user
declare module "fastify" {
  interface FastifyRequest {
    userId: string;
    userEmail: string;
    userMeta: Record<string, unknown>;
  }
}

export default fp(async function authPlugin(app: FastifyInstance) {
  /**
   * Decorator that validates the Bearer token from the Authorization header.
   * Attach to any route that requires authentication:
   *   { preHandler: app.authenticate }
   */
  app.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return reply.status(401).send({ error: "Token de autenticação ausente." });
      }

      const token = authHeader.slice(7);
      const user  = await getUserFromToken(token);

      if (!user) {
        return reply.status(401).send({ error: "Token inválido ou expirado." });
      }

      request.userId    = user.id;
      request.userEmail = user.email ?? "";
      request.userMeta  = (user.user_metadata ?? {}) as Record<string, unknown>;
    }
  );
});

// Augment FastifyInstance to expose the decorator type
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
