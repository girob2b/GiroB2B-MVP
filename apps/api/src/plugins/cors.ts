import fp from "fastify-plugin";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

export default fp(async function corsPlugin(app: FastifyInstance) {
  const origin = process.env.ALLOWED_ORIGIN ?? "http://localhost:3000";

  await app.register(cors, {
    origin,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
});
