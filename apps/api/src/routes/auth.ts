import type { FastifyInstance } from "fastify";
import {
  authHeaderSchema,
  authLoginBodySchema,
  authPasswordResetBodySchema,
  authRegisterBodySchema,
  authResponseSchema,
  authUpdatePasswordBodySchema,
  authUserSchema,
  bearerAuth,
  errorSchema,
  successSchema,
  validationErrorSchema,
  verifyEmailBodySchema,
} from "../lib/api-docs.js";
import {
  LoginSchema,
  RegisterSchema,
  RequestPasswordResetSchema,
  ResendSignupSchema,
  UpdatePasswordSchema,
  VerifyEmailSchema,
} from "../schemas/auth.schema.js";
import {
  getAuthErrorPayload,
  login,
  register,
  requestPasswordReset,
  resendSignupCode,
  updatePassword,
  verifyEmailCode,
} from "../services/auth.service.js";

export default async function authRoutes(app: FastifyInstance) {
  app.post("/login", {
    schema: {
      tags: ["Auth"],
      summary: "Autentica um usuario com email e senha",
      body: authLoginBodySchema,
      response: {
        200: authResponseSchema,
        400: validationErrorSchema,
        401: errorSchema,
        403: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors });
    }

    try {
      return reply.send(await login(parsed.data));
    } catch (error) {
      const { statusCode, payload } = getAuthErrorPayload(error);
      return (reply as any).status(statusCode).send(payload);
    }
  });

  app.post("/register", {
    schema: {
      tags: ["Auth"],
      summary: "Cria uma conta e dispara a verificacao de email",
      body: authRegisterBodySchema,
      response: {
        201: authResponseSchema,
        400: validationErrorSchema,
        409: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
    const parsed = RegisterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors });
    }

    try {
      const result = await register(parsed.data);
      return reply.status(201).send(result);
    } catch (error) {
      const { statusCode, payload } = getAuthErrorPayload(error);
      return (reply as any).status(statusCode).send(payload);
    }
  });

  app.post("/verify-email", {
    schema: {
      tags: ["Auth"],
      summary: "Valida o codigo de verificacao enviado por email",
      body: verifyEmailBodySchema,
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            user: authUserSchema,
          },
          required: ["success", "user"],
        },
        400: validationErrorSchema,
        422: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
    const parsed = VerifyEmailSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors });
    }

    try {
      return reply.send(await verifyEmailCode(parsed.data));
    } catch (error) {
      const { statusCode, payload } = getAuthErrorPayload(error);
      return (reply as any).status(statusCode).send(payload);
    }
  });

  app.post("/resend-verification", {
    schema: {
      tags: ["Auth"],
      summary: "Reenvia o codigo ou link de verificacao de cadastro",
      body: {
        type: "object",
        properties: authPasswordResetBodySchema.properties,
      },
      response: {
        200: successSchema,
        400: validationErrorSchema,
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
    const parsed = ResendSignupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors });
    }

    try {
      return reply.send(await resendSignupCode(parsed.data));
    } catch (error) {
      const { statusCode, payload } = getAuthErrorPayload(error);
      return (reply as any).status(statusCode).send(payload);
    }
  });

  app.post("/password/reset", {
    schema: {
      tags: ["Auth"],
      summary: "Envia o email de recuperacao de senha",
      body: authPasswordResetBodySchema,
      response: {
        200: successSchema,
        400: validationErrorSchema,
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
    const parsed = RequestPasswordResetSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors });
    }

    try {
      return reply.send(await requestPasswordReset(parsed.data));
    } catch (error) {
      const { statusCode, payload } = getAuthErrorPayload(error);
      return (reply as any).status(statusCode).send(payload);
    }
  });

  app.post("/password/update", {
    preHandler: app.authenticate,
    schema: {
      tags: ["Auth"],
      summary: "Atualiza a senha usando um Bearer token valido",
      security: bearerAuth,
      headers: authHeaderSchema,
      body: authUpdatePasswordBodySchema,
      response: {
        200: successSchema,
        400: validationErrorSchema,
        401: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
    const parsed = UpdatePasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors });
    }

    try {
      return reply.send(await updatePassword(request.userId, parsed.data));
    } catch (error) {
      const { statusCode, payload } = getAuthErrorPayload(error);
      return (reply as any).status(statusCode).send(payload);
    }
  });
}
