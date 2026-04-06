import type { FastifyInstance } from "fastify";
import {
  authHeaderSchema,
  bearerAuth,
  errorSchema,
  onboardingBodySchema,
  onboardingResponseSchema,
  validationErrorSchema,
} from "../lib/api-docs.js";
import { CompleteOnboardingSchema } from "../schemas/onboarding.schema.js";
import { completeOnboarding } from "../services/onboarding.service.js";

export default async function onboardingRoutes(app: FastifyInstance) {
  app.post(
    "/complete",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["Onboarding"],
        summary: "Conclui o onboarding do usuario autenticado",
        security: bearerAuth,
        headers: authHeaderSchema,
        body: onboardingBodySchema,
        response: {
          200: onboardingResponseSchema,
          400: validationErrorSchema,
          401: errorSchema,
          422: onboardingResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const parsed = CompleteOnboardingSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors });
      }

      const result = await completeOnboarding(request.userId, request.userEmail, parsed.data);

      if ("errors" in result || "message" in result) {
        return reply.status(422).send(result);
      }

      return reply.send(result);
    }
  );
}
